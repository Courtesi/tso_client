import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useSettings, type OddsFormat } from '../contexts/SettingsContext';
import { sportsbookIconPath, useSportsbooks } from '../hooks/useSportsbooks';
import { formatOdds, toDecimalOdds } from '../utils/oddsUtils';
import type { GameTerminalData } from '../types/terminal';

const MAX_GAMES = 4;
const MAX_BOOKS = 4;
const SAMPLE_TICK_MS = 2200;

interface TableRow {
	key: string;
	label: string;
	odds: Record<string, number>; // sportsbook key -> odds
}

interface TableGame {
	id: string;
	matchup: string;
	startTime: string;
	rows: TableRow[];
}

interface BookColumn {
	key: string;
	name: string;
	icon: string | null;
}

// ==================== SAMPLE DATA (signed-out visitors) ====================

const SAMPLE_BOOKS: BookColumn[] = [
	{ key: 'draftkings', name: 'DraftKings', icon: '/sportsbook_icons/draftkings.avif' },
	{ key: 'fanduel', name: 'FanDuel', icon: '/sportsbook_icons/fanduel.avif' },
	{ key: 'betmgm', name: 'BetMGM', icon: '/sportsbook_icons/betmgm.avif' },
	{ key: 'caesars', name: 'Caesars', icon: '/sportsbook_icons/caesars.avif' },
];

// A realistic tip-off time: `daysOut` days from today at the given local hour/minute
function sampleStart(daysOut: number, hour: number, minute: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysOut);
	date.setHours(hour, minute, 0, 0);
	return date.toISOString();
}

function sampleGame(id: string, away: string, home: string, startTime: string, awayOdds: number[], homeOdds: number[]): TableGame {
	const toRecord = (values: number[]) =>
		Object.fromEntries(SAMPLE_BOOKS.map((book, i) => [book.key, values[i]]));
	return {
		id,
		matchup: `${away} @ ${home}`,
		startTime,
		rows: [
			{ key: `${id}:away`, label: away, odds: toRecord(awayOdds) },
			{ key: `${id}:home`, label: home, odds: toRecord(homeOdds) },
		],
	};
}

function createSampleGames(): TableGame[] {
	return [
		sampleGame('s1', 'Celtics', 'Knicks', sampleStart(1, 19, 30), [-145, -150, -140, -148], [125, 130, 120, 128]),
		sampleGame('s2', 'Nuggets', 'Lakers', sampleStart(1, 22, 0), [-110, -105, -115, -110], [-110, -115, -105, -108]),
		sampleGame('s3', 'Bucks', 'Heat', sampleStart(2, 19, 30), [135, 130, 140, 138], [-160, -155, -165, -158]),
		sampleGame('s4', 'Suns', 'Warriors', sampleStart(2, 22, 0), [105, 110, 100, 108], [-125, -130, -120, -128]),
	];
}

// Move American odds by one 5-cent step, skipping the dead zone between -100 and +100
function stepAmerican(odds: number, delta: 5 | -5): number {
	const next = odds + delta;
	if (next === -100) return 100;
	if (next === 95) return -105;
	return next;
}

// Random walk that drifts back toward the opening line so sample odds stay believable
function tickSample(games: TableGame[], baseline: TableGame[]): TableGame[] {
	const gameIdx = Math.floor(Math.random() * games.length);
	const rowIdx = Math.floor(Math.random() * 2);
	const book = SAMPLE_BOOKS[Math.floor(Math.random() * SAMPLE_BOOKS.length)].key;

	const current = games[gameIdx].rows[rowIdx].odds[book];
	const base = baseline[gameIdx].rows[rowIdx].odds[book];
	const drift = toDecimalOdds(current) - toDecimalOdds(base);
	const delta: 5 | -5 = drift > 0.06 ? -5 : drift < -0.06 ? 5 : Math.random() < 0.5 ? 5 : -5;

	return games.map((game, gi) => gi !== gameIdx ? game : {
		...game,
		rows: game.rows.map((row, ri) => ri !== rowIdx ? row : {
			...row,
			odds: { ...row.odds, [book]: stepAmerican(current, delta) },
		}),
	});
}

function useSampleGames(enabled: boolean): TableGame[] {
	const baseline = useMemo(createSampleGames, []);
	const [games, setGames] = useState(baseline);

	useEffect(() => {
		if (!enabled) return;
		const id = window.setInterval(() => {
			if (document.hidden) return;
			setGames(prev => tickSample(prev, baseline));
		}, SAMPLE_TICK_MS);
		return () => window.clearInterval(id);
	}, [enabled, baseline]);

	return games;
}

// ==================== LIVE DATA (signed-in users) ====================

function currentOdds(outcome: GameTerminalData['markets'][number]['outcomes'][number]): Record<string, number> {
	if (outcome.latest_by_sportsbook && Object.keys(outcome.latest_by_sportsbook).length > 0) {
		return outcome.latest_by_sportsbook;
	}
	const odds: Record<string, number> = {};
	for (const [book, history] of Object.entries(outcome.history_by_sportsbook ?? {})) {
		const last = history[history.length - 1];
		if (last) odds[book] = last.odds;
	}
	return odds;
}

function toLiveGames(chartsData: GameTerminalData[]): TableGame[] {
	const games: TableGame[] = [];
	for (const game of chartsData) {
		const moneyline = game.markets.find(m => m.market_type === 'MONEY');
		if (!moneyline || moneyline.outcomes.length !== 2) continue;
		games.push({
			id: game.event_id,
			matchup: game.matchup || `${game.away_team} @ ${game.home_team}`,
			startTime: game.start_time,
			rows: moneyline.outcomes.map(outcome => ({
				key: `${game.event_id}:${outcome.outcome_id}`,
				label: outcome.outcome_name.replace(/_/g, ' '),
				odds: currentOdds(outcome),
			})),
		});
		if (games.length === MAX_GAMES) break;
	}
	return games;
}

// The books quoting the most of the visible rows, so the grid has as few gaps as possible
function pickBooks(games: TableGame[]): string[] {
	const coverage = new Map<string, number>();
	for (const game of games) {
		for (const row of game.rows) {
			for (const book of Object.keys(row.odds)) {
				coverage.set(book, (coverage.get(book) ?? 0) + 1);
			}
		}
	}
	return [...coverage.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, MAX_BOOKS)
		.map(([book]) => book);
}

// ==================== RENDERING ====================

function formatStart(iso: string): string {
	const date = new Date(iso);
	if (isNaN(date.getTime())) return '';
	return date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function OddsCell({ odds, isBest, oddsFormat }: { odds: number | undefined; isBest: boolean; oddsFormat: OddsFormat }) {
	const prevRef = useRef(odds);
	const [flash, setFlash] = useState<{ direction: 'up' | 'down'; generation: number } | null>(null);

	useEffect(() => {
		const prev = prevRef.current;
		prevRef.current = odds;
		if (odds === undefined || prev === undefined || odds === prev) return;
		const direction = toDecimalOdds(odds) > toDecimalOdds(prev) ? 'up' : 'down';
		setFlash(f => ({ direction, generation: (f?.generation ?? 0) + 1 }));
	}, [odds]);

	return (
		<td className="relative px-1 py-1.5 text-center">
			{flash && (
				<div
					key={flash.generation}
					className={`absolute inset-0.5 rounded-md ${flash.direction === 'up' ? 'animate-flash-green' : 'animate-flash-red'}`}
				/>
			)}
			<span
				className={`relative inline-block min-w-[3.75rem] rounded-md px-1.5 py-1 font-mono text-[13px] tabular-nums ${
					odds === undefined
						? 'text-gray-600'
						: isBest
							? 'bg-emerald-400/10 font-semibold text-emerald-300 ring-1 ring-emerald-400/25'
							: 'text-gray-200'
				}`}
			>
				{odds === undefined ? '—' : formatOdds(odds, oddsFormat)}
			</span>
		</td>
	);
}

function useSecondsSince(timestamp: number): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);
	return Math.max(0, Math.floor((now - timestamp) / 1000));
}

function UpdatedAgo({ timestamp }: { timestamp: number }) {
	const seconds = useSecondsSince(timestamp);
	return <span>Updated {seconds < 2 ? 'just now' : `${seconds}s ago`}</span>;
}

interface LiveOddsTableProps {
	onSignIn?: () => void;
}

/**
 * Compact moneyline odds grid for the landing page. Signed-in users see their live
 * terminal stream; everyone else sees clearly-labeled sample data that ticks.
 */
export default function LiveOddsTable({ onSignIn }: LiveOddsTableProps) {
	const { chartsData, leagueFilter } = useData();
	const { settings } = useSettings();
	const oddsFormat = settings?.oddsFormat || 'american';
	const sportsbooks = useSportsbooks();

	const liveGames = useMemo(() => toLiveGames(chartsData), [chartsData]);
	const isLive = liveGames.length > 0;
	const sampleGames = useSampleGames(!isLive);
	const games = isLive ? liveGames : sampleGames;

	const [lastUpdate, setLastUpdate] = useState(() => Date.now());
	useEffect(() => { setLastUpdate(Date.now()); }, [games]);

	const books: BookColumn[] = useMemo(() => {
		if (!isLive) return SAMPLE_BOOKS;
		return pickBooks(liveGames).map(key => {
			const info = sportsbooks?.[key.toLowerCase().replace(/\s+/g, '')];
			return { key, name: info?.display_name ?? key, icon: info ? sportsbookIconPath(info) : null };
		});
	}, [isLive, liveGames, sportsbooks]);

	return (
		<div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-950/80 shadow-[0_24px_80px_-20px_rgb(79_70_229/0.45)] ring-1 ring-black/40">
			{/* Window chrome */}
			<div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-xs">
				<div className="flex min-w-0 items-center gap-2">
					{isLive ? (
						<>
							<span className="animate-live-pulse h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
							<span className="font-semibold text-emerald-300">Live</span>
							<span className="truncate text-gray-400">{leagueFilter} · Moneyline</span>
						</>
					) : (
						<>
							<span className="h-2 w-2 shrink-0 rounded-full bg-amber-400/80" />
							<span className="font-semibold text-amber-200">Sample data</span>
							<span className="truncate text-gray-400">Moneyline</span>
						</>
					)}
				</div>
				<div className="shrink-0 font-mono tabular-nums text-gray-500">
					{isLive ? (
						<UpdatedAgo timestamp={lastUpdate} />
					) : onSignIn ? (
						<button
							onClick={onSignIn}
							className="font-sans font-medium text-indigo-300 transition-colors hover:text-indigo-200 cursor-pointer"
						>
							Sign in for live odds →
						</button>
					) : (
						<span>Illustrative prices</span>
					)}
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b border-white/[0.07]">
							<th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500">
								Team
							</th>
							{books.map(book => (
								<th key={book.key} className="px-1 py-2.5" title={book.name}>
									<div className="flex justify-center">
										{book.icon ? (
											<img src={book.icon} alt={book.name} className="h-6 w-6 rounded-md object-cover" />
										) : (
											<span className="text-[11px] font-medium text-gray-400">{book.name}</span>
										)}
									</div>
								</th>
							))}
						</tr>
					</thead>
					{games.map(game => (
						<tbody key={game.id} className="border-b border-white/[0.05] last:border-b-0">
							<tr>
								<td colSpan={books.length + 1} className="px-4 pt-3 pb-0.5 text-[11px] text-gray-500">
									<span className="font-medium text-gray-400">{game.matchup}</span>
									<span className="mx-1.5">·</span>
									<span className="font-mono tabular-nums">{formatStart(game.startTime)}</span>
								</td>
							</tr>
							{game.rows.map(row => {
								const quoted = books
									.map(book => row.odds[book.key])
									.filter((o): o is number => o !== undefined);
								const best = quoted.length > 1 ? Math.max(...quoted.map(toDecimalOdds)) : null;
								return (
									<tr key={row.key}>
										<td className="max-w-[9rem] truncate px-4 py-1.5 text-sm font-medium text-gray-100" title={row.label}>
											{row.label}
										</td>
										{books.map(book => {
											const odds = row.odds[book.key];
											return (
												<OddsCell
													key={book.key}
													odds={odds}
													isBest={best !== null && odds !== undefined && toDecimalOdds(odds) === best}
													oddsFormat={oddsFormat}
												/>
											);
										})}
									</tr>
								);
							})}
							<tr aria-hidden="true"><td colSpan={books.length + 1} className="h-2" /></tr>
						</tbody>
					))}
				</table>
			</div>
		</div>
	);
}
