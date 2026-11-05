import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { homeFaqs } from '../data/faqs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FeatureSection from '../components/FeatureSection';
import SportsbookStrip from '../components/SportsbookStrip';
import FeatureVideo from '../components/FeatureVideo';
import GridBackground from '../components/GridBackground';

const primaryButtonClass = 'rounded-xl bg-white px-7 py-3 text-base font-semibold text-gray-950 shadow-lg shadow-black/20 transition-[background-color,transform] duration-100 hover:bg-gray-200 active:scale-[0.97] cursor-pointer';
const secondaryButtonClass = 'rounded-xl border border-white/15 bg-white/[0.06] px-7 py-3 text-base font-semibold text-white transition-[background-color,transform] duration-100 hover:bg-white/[0.12] active:scale-[0.97] cursor-pointer';

function Home() {
	const { currentUser, userTier } = useAuth();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);


	return (
		<>
		<Helmet>
			<title>TrueShotOdds | Real-Time Arbitrage & +EV Bet Finder</title>
			<meta name="description" content="Find arbitrage opportunities and positive EV bets across DraftKings, FanDuel, BetMGM and 10+ sportsbooks. Live odds tracking with automated alerts." />
			<link rel="canonical" href="https://trueshotodds.com/" />
			<meta property="og:url" content="https://trueshotodds.com/" />
			<meta property="og:title" content="TrueShotOdds | Real-Time Arbitrage & +EV Bet Finder" />
			<meta property="og:description" content="Find arbitrage opportunities and positive EV bets across DraftKings, FanDuel, BetMGM and 10+ sportsbooks." />
			<script type="application/ld+json">{JSON.stringify({
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				"name": "TrueShotOdds",
				"url": "https://trueshotodds.com",
				"applicationCategory": "FinanceApplication",
				"operatingSystem": "Web",
				"description": "Real-time sports betting arbitrage and +EV bet finder across 10+ sportsbooks including DraftKings, FanDuel, and BetMGM.",
				"offers": [
					{ "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
					{ "@type": "Offer", "name": "Premium", "price": "0", "priceCurrency": "USD", "url": "https://trueshotodds.com/pricing" }
				]
			})}</script>
		</Helmet>
		<div className="min-h-screen text-white relative bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">

			{/* Navigation Bar */}
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Hero */}
			<section className="relative overflow-hidden">
				<GridBackground />

				<div className="relative z-10 container mx-auto px-4 pt-32 pb-16 lg:pt-40 lg:pb-20">
					<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
						<div className="text-center lg:text-left">
							<h1 className="heading-hero text-4xl sm:text-5xl lg:text-6xl text-gray-50">
								Spot the edge before the line moves
							</h1>
							<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-300 lg:mx-0 lg:text-xl">
								TrueShotOdds watches 10+ sportsbooks and exchanges in real time, flags arbitrage and +EV bets the moment they appear, and works out the stakes for you.
							</p>

							<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
								{currentUser && userTier === 'premium' ? (
									<button onClick={() => navigate('/dashboard')} className={primaryButtonClass}>
										Go to Dashboard
									</button>
								) : currentUser && userTier === 'free' ? (
									<button onClick={() => navigate('/pricing')} className={primaryButtonClass}>
										Upgrade Now
									</button>
								) : (
									<button onClick={() => setIsAuthModalOpen(true)} className={primaryButtonClass}>
										Get Started Free
									</button>
								)}
								<button onClick={() => navigate('/pricing')} className={secondaryButtonClass}>
									View Plans
								</button>
							</div>

							{userTier !== 'premium' && (
								<p className="mt-4 text-sm text-gray-400">
									The free plan includes NBA, NFL and MLB.
								</p>
							)}
						</div>

						<div className="px-4 sm:px-8 lg:px-0">
							<img
								src="/hero_banner.png"
								className="mx-auto w-full lg:scale-110"
								alt="TrueShotOdds arbitrage bets over a chart of weekly returns"
							/>
						</div>
					</div>
				</div>

				<div className="relative z-10 container mx-auto px-4 pb-20 lg:pb-24">
					<SportsbookStrip />
				</div>
			</section>

			{/* Feature Showcase - Full width, outside container */}
			<div className="relative z-10 w-full bg-gray-900 py-24 px-4 lg:py-32 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<h2 className="heading-hero text-3xl lg:text-5xl text-gray-100 text-center mb-16 lg:mb-24">
						What We Offer
					</h2>

					<FeatureSection
						title="Track Odds in Real Time"
						description="Watch how betting lines move across sportsbooks with live-updating charts. Spot trends and find the right moment to place your bets."
						features={[
							'Real-time line movement tracking',
							'Multi-sportsbook comparison',
							'Historical odds data',
						]}
						media={<FeatureVideo src="/dashboard_videos/lines" label="Odds updating live across sportsbooks, then a game's line movement chart" />}
						imagePosition="right"
						learnMorePath="/lines"
					/>

					<FeatureSection
						title="Automatic Arbitrage Bets"
						description="Our dashboard automatically detects mispriced odds across sportsbooks and calculates guaranteed profit opportunities for you."
						features={[
							'Automatic arbitrage detection',
							'Profit and stake calculations',
							'Growing supported sportsbooks',
						]}
						media={<FeatureVideo src="/dashboard_videos/arbs" label="Arbitrage dashboard detecting a new bet, pinning it, and calculating stakes" />}
						imagePosition="left"
						learnMorePath="/arbitrage-betting"
					/>

					<FeatureSection
						title="Bet with a Mathematical Edge"
						description="Expected value bets highlight wagers where the odds are in your favor. Filter by sport, market, and EV percentage to find the best opportunities."
						features={[
							'Expected value calculations',
							'Advanced filtering options',
							'Sortable by EV percentage',
						]}
						media={<FeatureVideo src="/dashboard_videos/ev" label="EV bets table filtered to high-confidence bets above 4% expected value" />}
						imagePosition="right"
						learnMorePath="/ev-betting"
					/>
				</div>
			</div>

			{/* FAQ Section */}
			<div className="relative z-10 container mx-auto px-4 py-24 max-w-3xl">
				<h2 className="heading-hero text-3xl lg:text-5xl text-gray-100 text-center mb-12">
					Common Questions
				</h2>
				<div className="space-y-3 mb-10">
					{homeFaqs.map((faq, i) => (
						<details key={i} className="bg-gray-800/50 rounded-xl border border-white/10 group">
							<summary className="px-6 py-5 text-lg font-semibold text-gray-100 cursor-pointer list-none flex justify-between items-center gap-4">
								{faq.question}
								<svg className="w-5 h-5 text-indigo-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
								</svg>
							</summary>
							<p className="px-6 pb-5 text-gray-300 text-lg leading-relaxed">{faq.answer}</p>
						</details>
					))}
				</div>
				<div className="text-center">
					<button
						onClick={() => navigate('/faq')}
						className="text-indigo-400 hover:text-indigo-300 active:text-indigo-200 text-lg font-semibold transition-colors cursor-pointer"
					>
						View all questions →
					</button>
				</div>
			</div>

			{/* Final CTA Section */}
			<div className="relative z-10 px-4 py-24 lg:py-32 bg-gray-900 w-full">
				<div className="max-w-4xl mx-auto text-center">
					<div>
						<h2 className="heading-hero text-4xl md:text-5xl text-gray-100 mb-10">
							Find your True Shot today and get started
						</h2>

						{currentUser ? (
							<button
								onClick={() => navigate('/dashboard')}
								className={primaryButtonClass}
							>
								Go to Dashboard
							</button>
						) : (
							<button
								onClick={() => setIsAuthModalOpen(true)}
								className={primaryButtonClass}
							>
								Get Started for Free
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Auth Modal */}
			<AuthModal
				isOpen={isAuthModalOpen}
				onClose={() => setIsAuthModalOpen(false)}
			/>

			{/* Footer */}
			<Footer />
		</div>
		</>
	);
}

export default Home;
