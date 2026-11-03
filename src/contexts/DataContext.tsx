import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { wsService, type ConnectionStatus, type FilterOptions } from '../services/websocket';
import type { ArbitrageBet } from '../types/arbs';
import type { GameTerminalData, LineUpdate } from '../types/terminal';
import type { EVBet } from '../types/ev';
import { applyTerminalFilters } from '../utils/terminalFilters';
import { api } from '../services/api';
import { appendLineUpdates, mergeGameHistory } from '../utils/terminalMerge';
import { TerminalSync } from '../utils/terminalSync';

const PINNED_ARBS_STORAGE_KEY = 'pinnedArbs';
const PINNED_EV_BETS_STORAGE_KEY = 'pinnedEvBets';

interface DataContextType {
	// Arbitrage data
	arbData: ArbitrageBet[];
	arbLoading: boolean;
	arbError: string;

	// Terminal/Charts data
	chartsData: GameTerminalData[];
	chartsLoading: boolean;
	chartsError: string;
	selectedGame: GameTerminalData | null;
	setSelectedGame: (game: GameTerminalData | null) => void;
	getGameHistory: (eventId: string, league: string) => Promise<void>;
	loadedHistoryGames: Set<string>;

	// EV data
	evData: EVBet[];
	evLoading: boolean;
	evError: string;

	// Filters for charts
	leagueFilter: string;
	setLeagueFilter: (league: string) => void;
	gameTimeFilter: string;
	setGameTimeFilter: (gameTime: string) => void;
	sportsbookFilter: string[];
	setSportsbookFilter: (sportsbooks: string[]) => void;

	// Arb-specific filters
	arbLeagueFilter: string[];
	setArbLeagueFilter: (leagues: string[]) => void;
	arbMinProfitFilter: number | null;
	setArbMinProfitFilter: (minProfit: number | null) => void;
	arbMaxProfitFilter: number | null;
	setArbMaxProfitFilter: (maxProfit: number | null) => void;
	arbMarketTypeFilter: string[];
	setArbMarketTypeFilter: (marketTypes: string[]) => void;
	arbSportsbookFilter: string[];
	setArbSportsbookFilter: (sportsbooks: string[]) => void;

	// EV-specific filters
	evLeagueFilter: string[];
	setEvLeagueFilter: (leagues: string[]) => void;
	evMinEvFilter: number | null;
	setEvMinEvFilter: (minEv: number | null) => void;
	evConfidenceFilter: string[];
	setEvConfidenceFilter: (confidence: string[]) => void;
	evSportsbookFilter: string[];
	setEvSportsbookFilter: (sportsbooks: string[]) => void;

	// WebSocket connection status
	connectionStatus: ConnectionStatus;

	// Pinned arbs
	pinArb: (arb: ArbitrageBet) => void;
	unpinArb: (arbId: string) => void;
	isPinned: (arbId: string) => boolean;
	isArbStale: (arbId: string) => boolean;

	// Pinned EV bets
	pinEv: (ev: EVBet) => void;
	unpinEv: (evId: string) => void;
	isEvPinned: (evId: string) => boolean;
	isEvStale: (evId: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Load pinned arbs from localStorage
function loadPinnedArbs(): Map<string, ArbitrageBet> {
	try {
		const stored = localStorage.getItem(PINNED_ARBS_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Record<string, ArbitrageBet>;
			return new Map(Object.entries(parsed));
		}
	} catch (e) {
		console.error('Failed to load pinned arbs from localStorage:', e);
	}
	return new Map();
}

// Save pinned arbs to localStorage
function savePinnedArbs(pinnedArbs: Map<string, ArbitrageBet>): void {
	try {
		const obj = Object.fromEntries(pinnedArbs);
		localStorage.setItem(PINNED_ARBS_STORAGE_KEY, JSON.stringify(obj));
	} catch (e) {
		console.error('Failed to save pinned arbs to localStorage:', e);
	}
}

// Generate a unique fingerprint for an arb based on its content
// Matches backend logic: event + market + sorted sportsbooks
function getArbFingerprint(arb: ArbitrageBet): string {
	const sportsbooks = [arb.bet1.sportsbook, arb.bet2.sportsbook].sort();
	return `${arb.matchup}|${arb.market}|${sportsbooks[0]}|${sportsbooks[1]}`;
}

// Load pinned EV bets from localStorage
function loadPinnedEvBets(): Map<string, EVBet> {
	try {
		const stored = localStorage.getItem(PINNED_EV_BETS_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Record<string, EVBet>;
			return new Map(Object.entries(parsed));
		}
	} catch (e) {
		console.error('Failed to load pinned EV bets from localStorage:', e);
	}
	return new Map();
}

// Save pinned EV bets to localStorage
function savePinnedEvBets(pinnedEvBets: Map<string, EVBet>): void {
	try {
		const obj = Object.fromEntries(pinnedEvBets);
		localStorage.setItem(PINNED_EV_BETS_STORAGE_KEY, JSON.stringify(obj));
	} catch (e) {
		console.error('Failed to save pinned EV bets to localStorage:', e);
	}
}

// Generate a unique fingerprint for an EV bet based on its content
// EV bets have a single sportsbook (unlike arbs with two)
function getEvFingerprint(ev: EVBet): string {
	return `${ev.matchup}|${ev.market}|${ev.bet.sportsbook}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
	const { currentUser } = useAuth();

	// Arbitrage state
	const [arbData, setArbData] = useState<ArbitrageBet[]>([]);
	const [arbLoading, setArbLoading] = useState(false);
	const [arbError, setArbError] = useState('');

	// Charts state — raw data from server (tier-filtered only), filtered view derived via useMemo
	const [rawChartsData, setRawChartsData] = useState<GameTerminalData[]>([]);
	const [chartsLoading, setChartsLoading] = useState(false);
	const [chartsError, setChartsError] = useState('');
	const [selectedGame, setSelectedGame] = useState<GameTerminalData | null>(null);

	// Per-league cache: skip API call if data was fetched recently
	const leagueCache = useRef<Map<string, { data: GameTerminalData[]; fetchedAt: number }>>(new Map());
	const rawChartsDataRef = useRef<GameTerminalData[]>(rawChartsData);
	useEffect(() => { rawChartsDataRef.current = rawChartsData; }, [rawChartsData]);

	// Track which games have had their full history loaded (per event_id)
	const [loadedHistoryGames, setLoadedHistoryGames] = useState<Set<string>>(new Set());
	const loadedHistoryRef = useRef(loadedHistoryGames);
	useEffect(() => { loadedHistoryRef.current = loadedHistoryGames; }, [loadedHistoryGames]);

	// EV state
	const [evData, setEvData] = useState<EVBet[]>([]);
	const [evLoading, setEvLoading] = useState(false);
	const [evError, setEvError] = useState('');

	// Filters for charts
	const [leagueFilter, setLeagueFilter] = useState<string>('NBA');
	const [gameTimeFilter, setGameTimeFilter] = useState<string>('upcoming');
	const [sportsbookFilter, setSportsbookFilter] = useState<string[]>([]);

	// Arb-specific filters
	const [arbLeagueFilter, setArbLeagueFilter] = useState<string[]>([]);
	const [arbMinProfitFilter, setArbMinProfitFilter] = useState<number | null>(0);
	const [arbMaxProfitFilter, setArbMaxProfitFilter] = useState<number | null>(null);
	const [arbMarketTypeFilter, setArbMarketTypeFilter] = useState<string[]>([]);
	const [arbSportsbookFilter, setArbSportsbookFilter] = useState<string[]>([]);

	// EV-specific filters
	const [evLeagueFilter, setEvLeagueFilter] = useState<string[]>([]);
	const [evMinEvFilter, setEvMinEvFilter] = useState<number | null>(0);
	const [evConfidenceFilter, setEvConfidenceFilter] = useState<string[]>([]);
	const [evSportsbookFilter, setEvSportsbookFilter] = useState<string[]>([]);

	// WebSocket connection status
	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

	// Refs to skip redundant filter updates on initial subscribe
	const arbsJustSubscribed = useRef(false);
	const evJustSubscribed = useRef(false);

	// Pinned arbs state (stores full arb objects for stale display)
	const [pinnedArbs, setPinnedArbs] = useState<Map<string, ArbitrageBet>>(() => loadPinnedArbs());

	// Ref to track current pinnedArbs for use in callbacks (avoids stale closure)
	const pinnedArbsRef = useRef<Map<string, ArbitrageBet>>(pinnedArbs);

	// Keep the ref in sync with state
	useEffect(() => {
		pinnedArbsRef.current = pinnedArbs;
	}, [pinnedArbs]);

	// Track last seen timestamps for pinned arbs
	const [arbLastSeen, setArbLastSeen] = useState<Map<string, Date>>(new Map());

	// Ref to track current arbLastSeen for use in callbacks (avoids stale closure)
	const arbLastSeenRef = useRef<Map<string, Date>>(arbLastSeen);

	// Keep the ref in sync with state
	useEffect(() => {
		arbLastSeenRef.current = arbLastSeen;
	}, [arbLastSeen]);

	// Track which pinned arbs are stale (not in latest server data)
	const [staleArbIds, setStaleArbIds] = useState<Set<string>>(new Set());

	// Pinned EV bets state (stores full EV bet objects for stale display)
	const [pinnedEvBets, setPinnedEvBets] = useState<Map<string, EVBet>>(() => loadPinnedEvBets());

	// Ref to track current pinnedEvBets for use in callbacks (avoids stale closure)
	const pinnedEvBetsRef = useRef<Map<string, EVBet>>(pinnedEvBets);

	// Keep the ref in sync with state
	useEffect(() => {
		pinnedEvBetsRef.current = pinnedEvBets;
	}, [pinnedEvBets]);

	// Track last seen timestamps for pinned EV bets
	const [evLastSeen, setEvLastSeen] = useState<Map<string, Date>>(new Map());

	// Ref to track current evLastSeen for use in callbacks (avoids stale closure)
	const evLastSeenRef = useRef<Map<string, Date>>(evLastSeen);

	// Keep the ref in sync with state
	useEffect(() => {
		evLastSeenRef.current = evLastSeen;
	}, [evLastSeen]);

	// Track which pinned EV bets are stale (not in latest server data)
	const [staleEvIds, setStaleEvIds] = useState<Set<string>>(new Set());

	// Pinned arbs functions
	const pinArb = useCallback((arb: ArbitrageBet) => {
		setPinnedArbs(prev => {
			const next = new Map(prev);
			next.set(arb.id.toString(), arb);
			savePinnedArbs(next);
			return next;
		});
	}, []);

	const unpinArb = useCallback((arbId: string) => {
		setPinnedArbs(prev => {
			const next = new Map(prev);
			next.delete(arbId);
			savePinnedArbs(next);
			return next;
		});
	}, []);

	const isPinned = useCallback((arbId: string): boolean => {
		return pinnedArbs.has(arbId);
	}, [pinnedArbs]);

	// Pinned EV bets functions
	const pinEv = useCallback((ev: EVBet) => {
		setPinnedEvBets(prev => {
			const next = new Map(prev);
			next.set(ev.id.toString(), ev);
			savePinnedEvBets(next);
			return next;
		});
	}, []);

	const unpinEv = useCallback((evId: string) => {
		setPinnedEvBets(prev => {
			const next = new Map(prev);
			next.delete(evId);
			savePinnedEvBets(next);
			return next;
		});
	}, []);

	const isEvPinned = useCallback((evId: string): boolean => {
		return pinnedEvBets.has(evId);
	}, [pinnedEvBets]);

	// Derive filtered chartsData from raw server data + user-preference filters
	// League filtering is handled server-side via the league query param
	const chartsData = useMemo(
		() => applyTerminalFilters(rawChartsData, gameTimeFilter, sportsbookFilter),
		[rawChartsData, gameTimeFilter, sportsbookFilter]
	);

	// Update selectedGame when chartsData changes (filter change or new server data)
	const prevChartsDataRef = useRef(chartsData);
	useEffect(() => {
		if (chartsData === prevChartsDataRef.current) return;
		prevChartsDataRef.current = chartsData;

		setSelectedGame(prev => {
			if (!prev) {
				return chartsData.length > 0 ? chartsData[0] : null;
			}
			const updated = chartsData.find(g => g.event_id === prev.event_id);
			return updated || chartsData[0] || null;
		});
	}, [chartsData]);

	// WebSocket connection management
	// Depend on UID, not the User object reference — Firebase's onAuthStateChanged
	// fires multiple times on page load (cached user, then server-verified user),
	// producing a new User reference each time. Using the full object as a dependency
	// causes a needless disconnect → reconnect cycle.
	useEffect(() => {
		if (!currentUser) return;

		// Connect to WebSocket once
		const connectWebSocket = async () => {
			try {
				const token = await currentUser.getIdToken();
				await wsService.connect(token);
			} catch (error) {
				console.error('Failed to connect WebSocket:', error);
			}
		};

		connectWebSocket();

		// Subscribe to connection status updates
		const unsubscribe = wsService.onStatusChange(setConnectionStatus);

		// Cleanup on unmount or user change
		return () => {
			unsubscribe();
			wsService.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.uid]);

	// Subscribe to arbitrage stream (persistent — stays active for the entire session)
	useEffect(() => {
		if (!currentUser) return;

		console.log('Subscribing to arbs stream');
		if (arbData.length === 0) setArbLoading(true);
		setArbError('');

		const filters: FilterOptions = {
			sportsbooks: arbSportsbookFilter.length > 0 ? arbSportsbookFilter : null,
			min_profit: arbMinProfitFilter,
			max_profit: arbMaxProfitFilter,
			league: arbLeagueFilter.length > 0 ? arbLeagueFilter : null,
			market_type: arbMarketTypeFilter.length > 0 ? arbMarketTypeFilter : null
		};

		arbsJustSubscribed.current = true;
		wsService.subscribe('arbs', filters, (data) => {
			const incomingArbs = data.data as ArbitrageBet[];
			const currentTime = new Date();

			// Update last seen timestamps for all incoming arbs (use ref to avoid stale closure)
			const newLastSeen = new Map(arbLastSeenRef.current);
			incomingArbs.forEach(arb => {
				newLastSeen.set(arb.id.toString(), currentTime);
			});

			// Get current pinned arbs (use ref to avoid stale closure)
			const currentPinnedArbs = pinnedArbsRef.current;

			// Create fingerprint-based lookups
			const incomingByFingerprint = new Map<string, ArbitrageBet>();
			incomingArbs.forEach(arb => {
				incomingByFingerprint.set(getArbFingerprint(arb), arb);
			});

			const pinnedByFingerprint = new Map<string, ArbitrageBet>();
			Array.from(currentPinnedArbs.values()).forEach(arb => {
				pinnedByFingerprint.set(getArbFingerprint(arb), arb);
			});

			// Categorize by fingerprint (mutually exclusive)
			const freshPinnedArbs: ArbitrageBet[] = [];
			const stalePinnedArbs: ArbitrageBet[] = [];
			const unpinnedArbs: ArbitrageBet[] = [];
			let pinnedArbsUpdated = false;

			// Check each pinned arb - is it in incoming?
			pinnedByFingerprint.forEach((pinnedArb, fingerprint) => {
				const incomingArb = incomingByFingerprint.get(fingerprint);
				if (incomingArb) {
					// Arb exists in both - use fresh data, mark as pinned
					freshPinnedArbs.push(incomingArb);
					// Update the stored pinned arb with fresh data (including new ID if changed)
					if (pinnedArb.id !== incomingArb.id) {
						currentPinnedArbs.delete(pinnedArb.id.toString());
					}
					currentPinnedArbs.set(incomingArb.id.toString(), incomingArb);
					pinnedArbsUpdated = true;
				} else {
					// Arb only in pinned - it's stale
					stalePinnedArbs.push(pinnedArb);
				}
			});

			// Check incoming arbs that aren't pinned
			incomingByFingerprint.forEach((arb, fingerprint) => {
				if (!pinnedByFingerprint.has(fingerprint)) {
					unpinnedArbs.push(arb);
				}
			});

			// Save updated pinned arbs if we refreshed any with new data
			if (pinnedArbsUpdated) {
				savePinnedArbs(currentPinnedArbs);
				setPinnedArbs(new Map(currentPinnedArbs));
			}

			// Auto-unpin stale arbs older than 30 minutes
			const staleThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
			const autoUnpinIds: string[] = [];

			stalePinnedArbs.forEach(arb => {
				const lastSeen = newLastSeen.get(arb.id.toString());
				if (lastSeen && (currentTime.getTime() - lastSeen.getTime()) > staleThreshold) {
					autoUnpinIds.push(arb.id.toString());
				}
			});

			// Remove auto-unpinned IDs
			if (autoUnpinIds.length > 0) {
				autoUnpinIds.forEach(id => unpinArb(id));
			}

			// Track which pinned arbs are stale
			const remainingStalePinned = stalePinnedArbs.filter(arb => !autoUnpinIds.includes(arb.id.toString()));
			setStaleArbIds(new Set(remainingStalePinned.map(arb => arb.id.toString())));

			// Merge and sort: fresh pinned → stale pinned → unpinned
			const sortedData = [
				...freshPinnedArbs.sort((a, b) => b.profit_percentage - a.profit_percentage),
				...remainingStalePinned,
				...unpinnedArbs.sort((a, b) => b.profit_percentage - a.profit_percentage)
			];

			setArbData(sortedData);
			setArbLastSeen(newLastSeen);
			setArbError('');
			setArbLoading(false);
		});

		return () => {
			wsService.unsubscribe('arbs');
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.uid]);

	// Acknowledged subscriptions (including reconnects) reload snapshots/history.
    useEffect(() => {
        if (!currentUser) return;
        const cache = leagueCache.current;
        setChartsError('');
        setChartsLoading(true);
        setLoadedHistoryGames(new Set());
        loadedHistoryRef.current = new Set();
        const cached = cache.get(leagueFilter);
        setRawChartsData(cached?.data ?? []);
        const sync = new TerminalSync({
            getOdds: async () => (await api.getTerminalOdds(leagueFilter)).data,
            getHistory: async eventId => (await api.getGameHistory(eventId, leagueFilter)).data,
            loadedHistory: () => loadedHistoryRef.current,
            replace: games => {
                setRawChartsData(games);
                cache.set(leagueFilter, { data: games, fetchedAt: Date.now() });
                setChartsLoading(false);
                setChartsError('');
            },
            update: updates => setRawChartsData(prev => appendLineUpdates(prev, updates)),
            error: message => { setChartsLoading(false); setChartsError(message); },
        });
        const unsubscribeReady = wsService.onSubscribed('terminal', () => { void sync.refresh(); });
        wsService.subscribe('terminal', { league: leagueFilter }, payload => sync.receive(payload.data as LineUpdate[]));
        return () => {
            sync.stop();
            unsubscribeReady();
            cache.set(leagueFilter, { data: rawChartsDataRef.current, fetchedAt: Date.now() });
            wsService.unsubscribe('terminal');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.uid, leagueFilter]);

	// Update arb filters dynamically (separate from terminal filters)
	// Debounced to prevent overwhelming WebSocket when slider is dragged rapidly
	useEffect(() => {
		if (arbsJustSubscribed.current) {
			arbsJustSubscribed.current = false;
			return;
		}

		console.log('[ArbFilter] Scheduling update - min:', arbMinProfitFilter, 'max:', arbMaxProfitFilter);

		const timeoutId = setTimeout(() => {
			const filters: FilterOptions = {
				sportsbooks: arbSportsbookFilter.length > 0 ? arbSportsbookFilter : null,
				min_profit: arbMinProfitFilter,
				max_profit: arbMaxProfitFilter,
				league: arbLeagueFilter.length > 0 ? arbLeagueFilter : null,
				market_type: arbMarketTypeFilter.length > 0 ? arbMarketTypeFilter : null
			};

			console.log('[ArbFilter] Sending filters:', JSON.stringify(filters));
			wsService.updateFilters('arbs', filters);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [arbLeagueFilter, arbMinProfitFilter, arbMaxProfitFilter, arbMarketTypeFilter, arbSportsbookFilter]);

	// Subscribe to EV stream (persistent — stays active for the entire session)
	useEffect(() => {
		if (!currentUser) return;

		console.log('Subscribing to EV stream');
		if (evData.length === 0) setEvLoading(true);
		setEvError('');

		const filters: FilterOptions = {
			sportsbooks: evSportsbookFilter.length > 0 ? evSportsbookFilter : null,
			min_ev: evMinEvFilter,
			league: evLeagueFilter.length > 0 ? evLeagueFilter : null,
			confidence: evConfidenceFilter.length > 0 ? evConfidenceFilter : null
		};

		evJustSubscribed.current = true;
		wsService.subscribe('ev', filters, (data) => {
			const incomingEvBets = data.data as EVBet[];
			const currentTime = new Date();

			// Update last seen timestamps for all incoming EV bets (use ref to avoid stale closure)
			const newLastSeen = new Map(evLastSeenRef.current);
			incomingEvBets.forEach(ev => {
				newLastSeen.set(ev.id.toString(), currentTime);
			});

			// Get current pinned EV bets (use ref to avoid stale closure)
			const currentPinnedEvBets = pinnedEvBetsRef.current;

			// Create fingerprint-based lookups
			const incomingByFingerprint = new Map<string, EVBet>();
			incomingEvBets.forEach(ev => {
				incomingByFingerprint.set(getEvFingerprint(ev), ev);
			});

			const pinnedByFingerprint = new Map<string, EVBet>();
			Array.from(currentPinnedEvBets.values()).forEach(ev => {
				pinnedByFingerprint.set(getEvFingerprint(ev), ev);
			});

			// Categorize by fingerprint (mutually exclusive)
			const freshPinnedEvBets: EVBet[] = [];
			const stalePinnedEvBets: EVBet[] = [];
			const unpinnedEvBets: EVBet[] = [];
			let pinnedEvBetsUpdated = false;

			// Check each pinned EV bet - is it in incoming?
			pinnedByFingerprint.forEach((pinnedEv, fingerprint) => {
				const incomingEv = incomingByFingerprint.get(fingerprint);
				if (incomingEv) {
					// EV bet exists in both - use fresh data, mark as pinned
					freshPinnedEvBets.push(incomingEv);
					// Update the stored pinned EV bet with fresh data (including new ID if changed)
					if (pinnedEv.id !== incomingEv.id) {
						currentPinnedEvBets.delete(pinnedEv.id.toString());
					}
					currentPinnedEvBets.set(incomingEv.id.toString(), incomingEv);
					pinnedEvBetsUpdated = true;
				} else {
					// EV bet only in pinned - it's stale
					stalePinnedEvBets.push(pinnedEv);
				}
			});

			// Check incoming EV bets that aren't pinned
			incomingByFingerprint.forEach((ev, fingerprint) => {
				if (!pinnedByFingerprint.has(fingerprint)) {
					unpinnedEvBets.push(ev);
				}
			});

			// Save updated pinned EV bets if we refreshed any with new data
			if (pinnedEvBetsUpdated) {
				savePinnedEvBets(currentPinnedEvBets);
				setPinnedEvBets(new Map(currentPinnedEvBets));
			}

			// Auto-unpin stale EV bets older than 30 minutes
			const staleThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
			const autoUnpinIds: string[] = [];

			stalePinnedEvBets.forEach(ev => {
				const lastSeen = newLastSeen.get(ev.id.toString());
				if (lastSeen && (currentTime.getTime() - lastSeen.getTime()) > staleThreshold) {
					autoUnpinIds.push(ev.id.toString());
				}
			});

			// Remove auto-unpinned IDs
			if (autoUnpinIds.length > 0) {
				autoUnpinIds.forEach(id => unpinEv(id));
			}

			// Track which pinned EV bets are stale
			const remainingStaleEv = stalePinnedEvBets.filter(ev => !autoUnpinIds.includes(ev.id.toString()));
			setStaleEvIds(new Set(remainingStaleEv.map(ev => ev.id.toString())));

			// Merge and sort: fresh pinned → stale pinned → unpinned
			const sortedData = [
				...freshPinnedEvBets.sort((a, b) => b.expected_value - a.expected_value),
				...remainingStaleEv,
				...unpinnedEvBets.sort((a, b) => b.expected_value - a.expected_value)
			];

			setEvData(sortedData);
			setEvLastSeen(newLastSeen);
			setEvError('');
			setEvLoading(false);
		});

		return () => {
			wsService.unsubscribe('ev');
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser?.uid]);

	// Update EV filters dynamically
	// Debounced to prevent overwhelming WebSocket when slider is dragged rapidly
	useEffect(() => {
		if (evJustSubscribed.current) {
			evJustSubscribed.current = false;
			return;
		}

		const timeoutId = setTimeout(() => {
			const filters: FilterOptions = {
				sportsbooks: evSportsbookFilter.length > 0 ? evSportsbookFilter : null,
				min_ev: evMinEvFilter,
				league: evLeagueFilter.length > 0 ? evLeagueFilter : null,
				confidence: evConfidenceFilter.length > 0 ? evConfidenceFilter : null
			};

			console.log('[EVFilter] Sending filters:', JSON.stringify(filters));
			wsService.updateFilters('ev', filters);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [evLeagueFilter, evMinEvFilter, evConfidenceFilter, evSportsbookFilter]);

	// Helper function to check if a pinned arb is stale (not in latest incoming data)
	const isArbStale = useCallback((arbId: string): boolean => {
		return staleArbIds.has(arbId);
	}, [staleArbIds]);

	// Helper function to check if a pinned EV bet is stale (not in latest incoming data)
	const isEvStale = useCallback((evId: string): boolean => {
		return staleEvIds.has(evId);
	}, [staleEvIds]);

	// Fetch full history for a single game and merge into state (called on chart expand)
	const getGameHistory = useCallback(async (eventId: string, league: string): Promise<void> => {
		if (loadedHistoryGames.has(eventId)) return;
		try {
			const response = await api.getGameHistory(eventId, league);
			setRawChartsData(prev => mergeGameHistory(prev, response.data));
			setLoadedHistoryGames(prev => new Set([...prev, eventId]));
			// Update cache with hydrated data so it survives league switches
			const cache = leagueCache.current;
			const cached = cache.get(league);
			if (cached) {
				cache.set(league, { data: rawChartsDataRef.current, fetchedAt: cached.fetchedAt });
			}
		} catch (err) {
			console.error(`Failed to load history for ${eventId}:`, err);
		}
	}, [loadedHistoryGames]);

	const value = {
		arbData,
		arbLoading,
		arbError,
		chartsData,
		chartsLoading,
		chartsError,
		selectedGame,
		setSelectedGame,
		getGameHistory,
		loadedHistoryGames,
		evData,
		evLoading,
		evError,
		leagueFilter,
		setLeagueFilter,
		gameTimeFilter,
		setGameTimeFilter,
		sportsbookFilter,
		setSportsbookFilter,
		arbLeagueFilter,
		setArbLeagueFilter,
		arbMinProfitFilter,
		setArbMinProfitFilter,
		arbMaxProfitFilter,
		setArbMaxProfitFilter,
		arbMarketTypeFilter,
		setArbMarketTypeFilter,
		arbSportsbookFilter,
		setArbSportsbookFilter,
		evLeagueFilter,
		setEvLeagueFilter,
		evMinEvFilter,
		setEvMinEvFilter,
		evConfidenceFilter,
		setEvConfidenceFilter,
		evSportsbookFilter,
		setEvSportsbookFilter,
		connectionStatus,
		pinArb,
		unpinArb,
		isPinned,
		isArbStale,
		pinEv,
		unpinEv,
		isEvPinned,
		isEvStale,
	};

	return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// Exporting custom hook alongside component is standard React context pattern
export function useData() {
	const context = useContext(DataContext);
	if (context === undefined) {
		throw new Error('useData must be used within a DataProvider');
	}
	return context;
}
