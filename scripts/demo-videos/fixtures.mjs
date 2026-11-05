// Curated demo data for the marketing recordings. Profit %, EV, edge and Kelly are
// derived from the odds so every number on screen is internally consistent.

// Game times are evening tip-offs (US Eastern, which the recorder's browser uses) a few
// days from today, so the clips never show games in the past or at odd hours
const [YEAR, MONTH, DAY] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()).split('-').map(Number);
const at = (daysFromToday, time) => {
	const [hour, minute] = time.split(':').map(Number);
	const utc = new Date(Date.UTC(YEAR, MONTH - 1, DAY + daysFromToday, hour, minute));
	// Shift by New York's UTC offset on that date (handles daylight saving)
	const offset = new Date(utc.toLocaleString('en-US', { timeZone: 'America/New_York' })) - new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' }));
	return new Date(utc.getTime() - offset).toISOString();
};

const toDecimal = (american) => (american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1);
const round = (n, places = 2) => Number(n.toFixed(places));

export const SPORTSBOOKS = {
	draftkings: { icon: 'draftkings.avif', display_name: 'DraftKings' },
	fanduel: { icon: 'fanduel.avif', display_name: 'FanDuel' },
	betmgm: { icon: 'betmgm.avif', display_name: 'BetMGM' },
	caesars: { icon: 'caesars.avif', display_name: 'Caesars' },
	fliff: { icon: 'fliff.png', display_name: 'Fliff' },
	novig: { icon: 'novig.webp', display_name: 'Novig' },
	prophetx: { icon: 'prophetx.png', display_name: 'ProphetX' },
	kalshi: { icon: 'kalshi.png', display_name: 'Kalshi' },
	polymarket: { icon: 'polymarket.png', display_name: 'Polymarket' },
	espnbet: { icon: 'espnbet.png', display_name: 'ESPN BET' },
};

let arbId = 1000;
function arb(league, matchup, market, [day, time], [team1, odds1, book1], [team2, odds2, book2], foundSecondsAgo = 40) {
	const profit = (1 / (1 / toDecimal(odds1) + 1 / toDecimal(odds2)) - 1) * 100;
	return {
		id: arbId++,
		league,
		matchup,
		market,
		game_time: at(day, time),
		profit_percentage: round(profit),
		bet1: { team: team1, odds: odds1, sportsbook: book1, stake: 0, link: '#' },
		bet2: { team: team2, odds: odds2, sportsbook: book2, stake: 0, link: '#' },
		found_at: new Date(Date.now() - foundSecondsAgo * 1000).toISOString(),
		expires_in_minutes: 15,
	};
}

export const ARBS = [
	arb('NBA', 'Boston Celtics vs New York Knicks', 'MONEY', [1, '19:30'], ['Knicks', 152, 'kalshi'], ['Celtics', -142, 'fanduel']),
	arb('NHL', 'Edmonton Oilers vs Dallas Stars', 'MONEY', [1, '20:00'], ['Stars', 128, 'novig'], ['Oilers', -118, 'draftkings']),
	arb('NFL', 'Kansas City Chiefs vs Buffalo Bills', 'SPREAD', [3, '20:20'], ['Bills +2.5', 108, 'betmgm'], ['Chiefs -2.5', -102, 'prophetx']),
	arb('NBA', 'Phoenix Suns vs Golden State Warriors', 'TOTAL', [1, '22:00'], ['Over 228.5', 104, 'fliff'], ['Under 228.5', -101, 'caesars']),
	arb('NCAAB', 'Duke vs North Carolina', 'MONEY', [2, '19:00'], ['North Carolina', 185, 'polymarket'], ['Duke', -178, 'draftkings']),
	arb('NBA', 'Milwaukee Bucks vs Miami Heat', 'MONEY', [1, '19:30'], ['Heat', 136, 'kalshi'], ['Bucks', -132, 'betmgm']),
	arb('NHL', 'New York Rangers vs Florida Panthers', 'TOTAL', [2, '19:00'], ['Under 5.5', 110, 'novig'], ['Over 5.5', -108, 'fanduel']),
	arb('NFL', 'Detroit Lions vs Green Bay Packers', 'MONEY', [4, '13:00'], ['Packers', 142, 'prophetx'], ['Lions', -140, 'caesars']),
];

// The arb that "appears" mid-clip; highest profit so it lands at the top of the table
export const NEW_ARB = arb(
	'NBA', 'Denver Nuggets vs LA Lakers', 'MONEY', [1, '22:00'],
	['Lakers', 165, 'draftkings'], ['Nuggets', -140, 'novig'],
	2,
);

let evId = 1;
function ev(league, matchup, market, [day, time], team, odds, sportsbook, trueProbability, confidence) {
	const decimal = toDecimal(odds);
	const evPct = (trueProbability * decimal - 1) * 100;
	const edge = (trueProbability - 1 / decimal) * 100;
	const kelly = (trueProbability * decimal - 1) / (decimal - 1);
	const trueAmerican = trueProbability >= 0.5
		? Math.round(-100 * trueProbability / (1 - trueProbability))
		: Math.round(100 * (1 - trueProbability) / trueProbability);
	const liquidity = confidence === 'HIGH' ? 182000 : confidence === 'MEDIUM' ? 46000 : 9000;
	return {
		id: `ev-${evId++}`,
		league,
		matchup,
		market,
		game_time: at(day, time),
		bet: { team, odds, sportsbook, probability: round(1 / decimal, 4), link: '#' },
		true_odds: {
			probability: trueProbability,
			american_odds: trueAmerican,
			liquidity,
			volume: liquidity * 3,
			confidence_score: confidence === 'HIGH' ? 0.9 : confidence === 'MEDIUM' ? 0.65 : 0.35,
			sources: confidence === 'HIGH' ? 3 : confidence === 'MEDIUM' ? 2 : 1,
		},
		expected_value: round(evPct),
		edge: round(edge, 1),
		kelly_fraction: round(kelly, 4),
		confidence,
		found_at: new Date(Date.now() - 90 * 1000).toISOString(),
	};
}

export const EV_BETS = [
	ev('NBA', 'Orlando Magic vs Indiana Pacers', 'Moneyline', [1, '19:00'], 'Pacers', 145, 'fanduel', 0.432, 'MEDIUM'),
	ev('NFL', 'Philadelphia Eagles vs Dallas Cowboys', 'Spread +3.5', [4, '16:25'], 'Cowboys +3.5', -105, 'draftkings', 0.545, 'HIGH'),
	ev('NHL', 'Toronto Maple Leafs vs Boston Bruins', 'Moneyline', [1, '19:00'], 'Bruins', 120, 'betmgm', 0.482, 'HIGH'),
	ev('NBA', 'Los Angeles Clippers vs Sacramento Kings', 'Total 231.5', [1, '22:30'], 'OVER', -102, 'caesars', 0.527, 'HIGH'),
	ev('NCAAB', 'Kansas vs Kentucky', 'Moneyline', [2, '21:00'], 'Kentucky', 160, 'fliff', 0.41, 'LOW'),
	ev('NBA', 'Cleveland Cavaliers vs Atlanta Hawks', 'Spread -4.5', [1, '19:30'], 'Cavaliers -4.5', -108, 'espnbet', 0.536, 'MEDIUM'),
	ev('NFL', 'San Francisco 49ers vs Seattle Seahawks', 'Moneyline', [4, '20:20'], 'Seahawks', 175, 'fanduel', 0.388, 'HIGH'),
	ev('NHL', 'Vegas Golden Knights vs Colorado Avalanche', 'Total 6.5', [2, '22:00'], 'UNDER', 115, 'draftkings', 0.478, 'LOW'),
	ev('NBA', 'Minnesota Timberwolves vs Memphis Grizzlies', 'Moneyline', [1, '20:00'], 'Grizzlies', 210, 'betmgm', 0.34, 'MEDIUM'),
	ev('NCAAB', 'Gonzaga vs Baylor', 'Spread -1.5', [2, '20:00'], 'Gonzaga -1.5', -110, 'caesars', 0.541, 'HIGH'),
	ev('NFL', 'Baltimore Ravens vs Pittsburgh Steelers', 'Moneyline', [4, '13:00'], 'Steelers', 132, 'novig', 0.447, 'LOW'),
	ev('NBA', 'Chicago Bulls vs Toronto Raptors', 'Moneyline', [1, '20:00'], 'Raptors', 105, 'prophetx', 0.503, 'HIGH'),
];

// Mirrors the backend's server-side filtering so filter interactions behave like production
export function filterArbs(arbs, filters = {}) {
	const { min_profit, max_profit, league, market_type, sportsbooks } = filters;
	const leagues = [].concat(league ?? []);
	const markets = [].concat(market_type ?? []);
	return arbs.filter((a) =>
		(min_profit == null || a.profit_percentage >= min_profit) &&
		(max_profit == null || a.profit_percentage <= max_profit) &&
		(leagues.length === 0 || leagues.includes(a.league)) &&
		(markets.length === 0 || markets.includes(a.market)) &&
		(!sportsbooks?.length || (sportsbooks.includes(a.bet1.sportsbook) && sportsbooks.includes(a.bet2.sportsbook)))
	);
}

export function filterEv(bets, filters = {}) {
	const { min_ev, league, confidence, sportsbooks } = filters;
	const leagues = [].concat(league ?? []);
	return bets.filter((b) =>
		(min_ev == null || b.expected_value >= min_ev) &&
		(leagues.length === 0 || leagues.includes(b.league)) &&
		(!confidence?.length || confidence.includes(b.confidence)) &&
		(!sportsbooks?.length || sportsbooks.includes(b.bet.sportsbook))
	);
}

// ==================== ODDS CHARTS (TERMINAL) ====================

// Deterministic pseudo-random numbers so every recording shows the same line history
function seeded(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Four books keep the odds table within the card width; their chart colors are distinct
export const TERMINAL_BOOKS = ['BetMGM', 'DraftKings', 'FanDuel', 'ProphetX'];
const HISTORY_HOURS = 10;

const slug = (team) => team.toLowerCase().replace(/[^a-z0-9]/g, '');

// Favorite's consensus line moves through `path` (oldest → newest); each book follows
// with its own lag and a point or two of disagreement. Underdog mirrors at |fav| - 20.
function terminalGame(away, home, favorite, time, path, seed) {
	const random = seeded(seed);
	const now = Math.floor(Date.now() / 1000);
	const start = now - HISTORY_HOURS * 3600;
	// One observation per book every 15 minutes, like the live feed
	const slots = HISTORY_HOURS * 4;
	const step = (HISTORY_HOURS * 3600) / slots;
	const consensus = (k) => {
		const pos = (k / (slots - 1)) * (path.length - 1);
		const i = Math.min(Math.floor(pos), path.length - 2);
		return path[i] + (path[i + 1] - path[i]) * (pos - i);
	};

	const favoriteHistory = {};
	for (const book of TERMINAL_BOOKS) {
		const offset = Math.round((random() - 0.5) * 6);
		// Each book reacts to the market a little late, by its own amount
		const delay = Math.floor(random() * 3);
		const points = [];
		for (let k = 0; k < slots; k++) {
			const odds = Math.round(consensus(Math.max(0, k - delay))) - offset;
			points.push({ odds, sportsbook: book, timestamp: start + Math.round(k * step + random() * step * 0.8) });
		}
		favoriteHistory[book] = points;
	}
	const historyFor = (isFavorite) => Object.fromEntries(Object.entries(favoriteHistory).map(([book, points]) => [
		book,
		points.map((p) => ({ ...p, odds: isFavorite ? p.odds : Math.abs(p.odds) - 20 })),
	]));

	const outcome = (team, isFavorite) => {
		const history_by_sportsbook = historyFor(isFavorite);
		const history = Object.values(history_by_sportsbook).flat().sort((a, b) => a.timestamp - b.timestamp);
		const latest = history.at(-1);
		return {
			outcome_id: `${slug(team)}_moneyline`,
			outcome_name: team,
			history,
			history_by_sportsbook,
			latest_by_sportsbook: Object.fromEntries(Object.entries(history_by_sportsbook).map(([b, h]) => [b, h.at(-1).odds])),
			current_best_odds: latest.odds,
			current_best_sportsbook: latest.sportsbook,
		};
	};

	return {
		event_id: `nba-${slug(away)}-${slug(home)}`,
		sport: 'basketball',
		league: 'NBA',
		home_team: home,
		away_team: away,
		matchup: `${away} @ ${home}`,
		start_time: at(1, time),
		game_status: 'upcoming',
		markets: [{
			market_type: 'MONEY',
			market_display: 'Moneyline',
			// Home first, matching how the app orders the chart tabs
			outcomes: [outcome(home, favorite === home), outcome(away, favorite === away)],
		}],
	};
}

export const TERMINAL_GAMES = [
	terminalGame('Denver Nuggets', 'Los Angeles Lakers', 'Denver Nuggets', '22:30', [-126, -128, -134, -138, -138, -144, -148, -150, -152], 11),
	terminalGame('Boston Celtics', 'New York Knicks', 'Boston Celtics', '19:30', [-118, -120, -120, -124, -122, -126, -128, -130], 23),
	terminalGame('Golden State Warriors', 'Phoenix Suns', 'Phoenix Suns', '22:00', [-142, -140, -138, -135, -132, -134, -130, -128], 37),
	terminalGame('Miami Heat', 'Milwaukee Bucks', 'Milwaukee Bucks', '20:00', [-165, -168, -172, -170, -175, -178, -180], 41),
	terminalGame('Dallas Mavericks', 'Oklahoma City Thunder', 'Oklahoma City Thunder', '20:00', [-210, -215, -212, -220, -225, -228], 53),
];

// Snapshot for /terminal/odds: latest odds per book, no history arrays
export function terminalSnapshot(games) {
	return games.map((game) => ({
		...game,
		markets: game.markets.map((market) => ({
			...market,
			outcomes: market.outcomes.map(({ history_by_sportsbook: _byBook, ...outcome }) => ({ ...outcome, history: [] })),
		})),
	}));
}

// Records a new price in the game history and returns the matching WS line update
export function moveLine(games, eventId, team, sportsbook, odds) {
	const outcome = games.find((g) => g.event_id === eventId).markets[0].outcomes.find((o) => o.outcome_name === team);
	const point = { odds, sportsbook, timestamp: Math.floor(Date.now() / 1000) };
	outcome.history.push(point);
	outcome.history_by_sportsbook[sportsbook].push(point);
	outcome.latest_by_sportsbook[sportsbook] = odds;
	outcome.current_best_odds = odds;
	outcome.current_best_sportsbook = sportsbook;
	return { event_id: eventId, market_type: 'MONEY', outcome_name: team, point };
}
