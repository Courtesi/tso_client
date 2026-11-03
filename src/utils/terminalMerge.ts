import type { GameTerminalData, LineUpdate } from '../types/terminal';

/**
 * Merges a fully-hydrated GameTerminalData (from history REST fetch) into
 * an existing games array, replacing the matching game's markets/outcomes
 * with full history while preserving any WS updates that arrived after the
 * odds-only load.
 */
export function mergeGameHistory(
	existing: GameTerminalData[],
	hydrated: GameTerminalData,
): GameTerminalData[] {
	const idx = existing.findIndex(g => g.event_id === hydrated.event_id);
	if (idx === -1) {
		// Game not in list yet — append it
		return [...existing, hydrated];
	}

	const updated = [...existing];
	const existingGame = existing[idx];

	// Merge history-hydrated markets into the existing game.
	// For each outcome in the hydrated response, also carry over any WS-appended
	// points that arrived after the history window (history_by_sportsbook from
	// the existing game may have more recent entries than the REST response).
	const mergedMarkets = hydrated.markets.map(hydratedMarket => {
		const existingMarket = existingGame.markets.find(
			m => m.market_type === hydratedMarket.market_type
		);

		const mergedOutcomes = hydratedMarket.outcomes.map(hydratedOutcome => {
			const existingOutcome = existingMarket?.outcomes.find(
				o => o.outcome_id === hydratedOutcome.outcome_id
			);

			if (!existingOutcome) return hydratedOutcome;

			// Append any WS points that are newer than the history window

			const mergedHistoryBySportsbook = { ...hydratedOutcome.history_by_sportsbook };
			const additionalHistory: typeof hydratedOutcome.history = [];

			for (const [sb, sbHistory] of Object.entries(
				existingOutcome.history_by_sportsbook ?? {}
			)) {
				const restHistory = mergedHistoryBySportsbook[sb] ?? [];
				const latestHistoryTs = restHistory.length ? Math.max(...restHistory.map(p => p.timestamp)) : -Infinity;
				const newPoints = sbHistory.filter(p => p.timestamp > latestHistoryTs);
				if (newPoints.length > 0) {
					mergedHistoryBySportsbook[sb] = [
						...(mergedHistoryBySportsbook[sb] ?? []),
						...newPoints,
					];
					additionalHistory.push(...newPoints);
				}
			}

			const mergedHistory = [...hydratedOutcome.history, ...additionalHistory].sort(
				(a, b) => a.timestamp - b.timestamp
			);
			const latest = mergedHistory[mergedHistory.length - 1];

			return {
				...hydratedOutcome,
				history: mergedHistory,
				history_by_sportsbook: mergedHistoryBySportsbook,
				current_best_odds: latest?.odds ?? hydratedOutcome.current_best_odds,
				current_best_sportsbook: latest?.sportsbook ?? hydratedOutcome.current_best_sportsbook,
			};
		});

		return { ...hydratedMarket, outcomes: mergedOutcomes };
	});

	updated[idx] = { ...existingGame, markets: mergedMarkets };
	return updated;
}

/**
 * Appends line updates (from lines:{league} WS channel) to existing terminal chart state.
 * Each update directly identifies its target by event_id + market_type + outcome_name.
 * Returns a new array with updated data (immutable).
 */
export function appendLineUpdates(
	existing: GameTerminalData[],
	updates: LineUpdate[]
): GameTerminalData[] {
	const gameByEventId = new Map<string, number>();
	existing.forEach((game, i) => gameByEventId.set(game.event_id, i));

	const updated = [...existing];
	const touchedGames = new Set<number>();
	const clonedMarkets = new Set<string>(); // "gameIdx:marketIdx"

	for (const update of updates) {
		const gameIdx = gameByEventId.get(update.event_id);
		if (gameIdx === undefined) continue;

		// Shallow-clone game + markets array on first touch
		if (!touchedGames.has(gameIdx)) {
			updated[gameIdx] = { ...updated[gameIdx], markets: updated[gameIdx].markets.map(m => ({ ...m })) };
			touchedGames.add(gameIdx);
		}
		const game = updated[gameIdx];

		const marketIdx = game.markets.findIndex(m => m.market_type === update.market_type);
		if (marketIdx === -1) continue;

		// Clone outcomes array once per market
		const marketKey = `${gameIdx}:${marketIdx}`;
		if (!clonedMarkets.has(marketKey)) {
			game.markets[marketIdx] = { ...game.markets[marketIdx], outcomes: game.markets[marketIdx].outcomes.map(o => ({ ...o })) };
			clonedMarkets.add(marketKey);
		}
		const market = game.markets[marketIdx];

		const outcomeIdx = market.outcomes.findIndex(
			o => o.outcome_id.toLowerCase().endsWith(`:${update.outcome_name.toLowerCase()}`) || o.outcome_name.toLowerCase() === update.outcome_name.toLowerCase()
		);
		if (outcomeIdx === -1) continue;

		const outcome = { ...market.outcomes[outcomeIdx] };
		market.outcomes[outcomeIdx] = outcome;

		const previousPoints = outcome.history_by_sportsbook?.[update.point.sportsbook] ?? [];
		const lastPoint = previousPoints[previousPoints.length - 1];
		if (lastPoint && update.point.timestamp <= lastPoint.timestamp) continue;
		outcome.history = [...outcome.history, update.point];

		outcome.history_by_sportsbook = { ...outcome.history_by_sportsbook };
		const sbHistory = outcome.history_by_sportsbook[update.point.sportsbook] || [];
		outcome.history_by_sportsbook[update.point.sportsbook] = [...sbHistory, update.point];

		// Keep latest_by_sportsbook in sync for the odds table (populated by /terminal/odds)
		if (outcome.latest_by_sportsbook) {
			outcome.latest_by_sportsbook = {
				...outcome.latest_by_sportsbook,
				[update.point.sportsbook]: update.point.odds,
			};
		}

		outcome.current_best_odds = update.point.odds;
		outcome.current_best_sportsbook = update.point.sportsbook;
	}

	return updated;
}
