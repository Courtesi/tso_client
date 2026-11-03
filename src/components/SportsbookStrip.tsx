import { sportsbookIconPath, useSportsbooks } from '../hooks/useSportsbooks';
import type { SportsbookInfo } from '../types/stripe';

// Mirrors the backend's enabled SPORTSBOOKS so the strip renders immediately and
// survives an API outage; replaced by the live config as soon as it loads.
const FALLBACK_SPORTSBOOKS: SportsbookInfo[] = [
	{ icon: 'betmgm.avif', display_name: 'BetMGM' },
	{ icon: 'caesars.avif', display_name: 'Caesars' },
	{ icon: 'draftkings.avif', display_name: 'DraftKings' },
	{ icon: 'espnbet.png', display_name: 'ESPN Bet' },
	{ icon: 'fanduel.avif', display_name: 'FanDuel' },
	{ icon: 'fliff.png', display_name: 'Fliff' },
	{ icon: 'kalshi.png', display_name: 'Kalshi' },
	{ icon: 'novig.webp', display_name: 'Novig' },
	{ icon: 'polymarket.png', display_name: 'Polymarket' },
	{ icon: 'prophetx.png', display_name: 'ProphetX' },
];

function SportsbookList({ books, hidden = false }: { books: SportsbookInfo[]; hidden?: boolean }) {
	return (
		<ul
			className={`flex shrink-0 items-center gap-10 pr-10 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4 motion-reduce:pr-0 ${hidden ? 'motion-reduce:hidden' : ''}`}
			aria-hidden={hidden || undefined}
		>
			{books.map(book => (
				<li
					key={book.display_name}
					className="flex items-center gap-2.5 opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
				>
					<img
						src={sportsbookIconPath(book)}
						alt=""
						className="h-7 w-7 rounded-md object-cover"
						loading="lazy"
					/>
					<span className="whitespace-nowrap text-sm font-medium text-gray-300">
						{book.display_name}
					</span>
				</li>
			))}
		</ul>
	);
}

/**
 * Scrolling strip of every supported sportsbook, sourced from the public config
 * endpoint so it always matches what the backend actually tracks.
 */
export default function SportsbookStrip() {
	const sportsbooks = useSportsbooks();
	const books = (sportsbooks ? Object.values(sportsbooks) : FALLBACK_SPORTSBOOKS)
		.slice()
		.sort((a, b) => a.display_name.localeCompare(b.display_name));

	return (
		<section aria-label="Supported sportsbooks" className="relative z-10 mx-auto max-w-5xl">
			<p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
				Tracking lines across {sportsbooks ? books.length : '10+'} sportsbooks and exchanges
			</p>
			<div className="h-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] motion-reduce:h-auto motion-reduce:[mask-image:none]">
				<div className="animate-marquee flex w-max">
					<SportsbookList books={books} />
					{/* Second copy makes the loop seamless; hidden from screen readers and reduced motion */}
					<SportsbookList books={books} hidden />
				</div>
			</div>
		</section>
	);
}
