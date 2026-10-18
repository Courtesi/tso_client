/**
 * GameChart — chart + team tabs only (no header, no odds table).
 * Used by ExpandableOddsScreen (inside OddsScreen.tsx) so we avoid a
 * circular import with GameLineChart (which imports OddsScreen).
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type LineData, LineSeries, LineType } from 'lightweight-charts';
import type { GameTerminalData, OutcomeLine } from '../types/terminal';

interface GameChartProps {
	game: GameTerminalData;
}

function getTeamType(outcome: OutcomeLine, homeTeam: string, awayTeam: string): 'home' | 'away' | null {
	const parsedTeam = outcome.outcome_id.split('_')[0].toLowerCase();
	const home = homeTeam.toLowerCase().replace(/\s+/g, '');
	const away = awayTeam.toLowerCase().replace(/\s+/g, '');
	if (parsedTeam.includes(home) || home.includes(parsedTeam)) return 'home';
	if (parsedTeam.includes(away) || away.includes(parsedTeam)) return 'away';
	return null;
}

const SPORTSBOOK_COLORS: Record<string, string> = {
	'Fliff': '#ef4444',
	'Novig': '#3b82f6',
	'BetMGM': '#f59e0b',
	'DraftKings': '#10b981',
	'FanDuel': '#3b82f6',
	'Caesars': '#8b5cf6',
	'BetRivers': '#ec4899',
	'PointsBet': '#14b8a6',
	'ProphetX': '#f97316',
	'Bet365': '#84cc16',
	'Unibet': '#06b6d4',
	'Ballybet': '#a855f7',
	'ESPN BET': '#ef4444',
	'Fanatics': '#0ea5e9',
	'Kalshi': '#00d26a',
};

function getSportsbookColor(sportsbook: string): string {
	if (SPORTSBOOK_COLORS[sportsbook]) return SPORTSBOOK_COLORS[sportsbook];
	let hash = 0;
	for (let i = 0; i < sportsbook.length; i++) {
		hash = sportsbook.charCodeAt(i) + ((hash << 5) - hash);
	}
	return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

function GameChart({ game }: GameChartProps) {
	const [displayTime, setDisplayTime] = useState(() => Date.now() / 1000);
	useEffect(() => {
		const timer = window.setInterval(() => setDisplayTime(Date.now() / 1000), 30000);
		return () => window.clearInterval(timer);
	}, []);
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
	const fittedOutcomeRef = useRef<string | null>(null);

	const moneylineMarket = game.markets.find(m => m.market_type === 'MONEY');

	const getTeamTypeForOutcome = useCallback(
		(outcome: OutcomeLine) => getTeamType(outcome, game.home_team, game.away_team),
		[game.home_team, game.away_team]
	);

	const outcomes = useMemo(() => {
		const base = moneylineMarket?.outcomes || [];
		return [...base].sort((a, b) => {
			const aType = getTeamTypeForOutcome(a);
			const bType = getTeamTypeForOutcome(b);
			if (aType === 'home' && bType === 'away') return -1;
			if (aType === 'away' && bType === 'home') return 1;
			return 0;
		});
	}, [moneylineMarket?.outcomes, getTeamTypeForOutcome]);

	const [selectedOutcome, setSelectedOutcome] = useState<OutcomeLine | null>(
		outcomes.length > 0 ? outcomes[0] : null
	);

	useEffect(() => {
		setSelectedOutcome(prev => {
			if (outcomes.length === 0) return null;
			if (prev) {
				const updated = outcomes.find(o => o.outcome_id === prev.outcome_id);
				return updated || outcomes[0];
			}
			return outcomes[0];
		});
	}, [outcomes]);

	// Initialize chart
	useEffect(() => {
		if (!chartContainerRef.current) return;

		const chart = createChart(chartContainerRef.current, {
			width: chartContainerRef.current.clientWidth,
			height: 350,
			layout: {
				background: { color: '#000000' },
				textColor: '#d1d5db',
			},
			grid: {
				vertLines: { color: '#374151' },
				horzLines: { color: '#374151' },
			},
			timeScale: {
				timeVisible: true,
				secondsVisible: false,
			},
		});

		chartRef.current = chart;
		const currentSeriesRefs = seriesRefs.current;

		return () => {
			chart.remove();
			chartRef.current = null;
			currentSeriesRefs.clear();
		};
	}, []);

	// Update series when selected outcome changes
	useEffect(() => {
		if (!chartRef.current || !selectedOutcome || !selectedOutcome.history_by_sportsbook) return;

		seriesRefs.current.forEach(series => {
			if (series && chartRef.current) chartRef.current.removeSeries(series);
		});
		seriesRefs.current.clear();

		const timezoneOffsetSeconds = new Date().getTimezoneOffset() * 60;

		Object.entries(selectedOutcome.history_by_sportsbook).forEach(([sportsbook, history]) => {
			const series = chartRef.current!.addSeries(LineSeries, {
				color: getSportsbookColor(sportsbook),
				lineWidth: 2,
				lineType: LineType.WithSteps,
				title: sportsbook,
			});

			const dataMap = new Map<number, number>();
			history.forEach(point => {
				const t = (point.timestamp - timezoneOffsetSeconds) as number;
				dataMap.set(t, point.odds);
			});

			const data: LineData[] = Array.from(dataMap.entries())
				.sort((a, b) => a[0] - b[0])
				.map(([time, value]) => ({ time: time as LineData['time'], value }));

			if (data.length > 0) {
				// Display-only extension: never add synthetic observations to history.
				const last = data[data.length - 1];
				const end = Math.max(displayTime, Date.now() / 1000) - timezoneOffsetSeconds;
				if (end > Number(last.time)) data.push({ time: end as LineData['time'], value: last.value });
				series.setData(data);
			}
			seriesRefs.current.set(sportsbook, series);
		});

		// Keep the user's zoom while display-only endpoints advance.
		if (fittedOutcomeRef.current !== selectedOutcome.outcome_id) {
			chartRef.current.timeScale().fitContent();
			fittedOutcomeRef.current = selectedOutcome.outcome_id;
		}
	}, [selectedOutcome, displayTime]);

	// Resize handler
	useEffect(() => {
		const handleResize = () => {
			if (chartRef.current && chartContainerRef.current) {
				chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	if (!moneylineMarket || outcomes.length === 0) {
		return (
			<div className="text-gray-400 text-sm py-6 text-center">
				No moneyline data available for this game.
			</div>
		);
	}

	return (
		<div>
			{/* Team Tabs */}
			<div className="flex gap-2 mb-4">
				{outcomes.map(outcome => {
					const teamType = getTeamTypeForOutcome(outcome);
					const label = teamType === 'home'
						? `Home (${game.home_team.replace(/_/g, ' ')})`
						: teamType === 'away'
						? `Away (${game.away_team.replace(/_/g, ' ')})`
						: outcome.outcome_name.replace(/_/g, ' ');

					return (
						<button
							key={outcome.outcome_id}
							onClick={() => setSelectedOutcome(outcome)}
							className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer text-sm ${
								selectedOutcome?.outcome_id === outcome.outcome_id
									? 'border border-gray-200 bg-gray-500 text-white'
									: 'border border-gray-200 text-gray-300 hover:bg-gray-800'
							}`}
						>
							{label}
						</button>
					);
				})}
			</div>

			{/* Chart canvas */}
			<div ref={chartContainerRef} />
			<p className="mt-2 text-xs text-gray-400">Last observed prices; changes between observations may be missed.</p>
		</div>
	);
}

export default GameChart;
