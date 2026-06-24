import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo } from 'react';
import { homeFaqs } from '../data/faqs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useParticles } from '../contexts/ParticlesContext';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FeatureSection from '../components/FeatureSection';

import Particles from "@tsparticles/react";
import BugReportModal from '../components/BugReportModal';
// import type { Container } from "@tsparticles/engine";

function Home() {
	const { currentUser, userTier } = useAuth();
	const { init } = useParticles();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isBugReportOpen, setIsBugReportOpen] = useState(false);
	const [isLearnOpen, setIsLearnOpen] = useState(false);

	// const particlesLoaded = useCallback(async (container?: Container) => {
    //     console.log('🌟 Particles loaded/reloaded at:', new Date().toISOString(), container);
    // }, []);

	const particlesOptions = useMemo(() => ({
		background: {
			color: {
				value: "transparent",
			},
		},
		fpsLimit: 60,
		fullScreen: {
			enable: false,
		},
		responsive: [],
		particles: {
			number: {
				value: 150,
				density: {
					enable: false
				}
			},
			color: {
				value: "#ffffff",
			},
			shape: {
				type: "circle",
			},
			opacity: {
				value: { min: 0.1, max: 0.8 },
				animation: {
					enable: true,
					speed: 0.5,
					sync: false,
				},
			},
			size: {
				value: { min: 0.5, max: 2.5 },
			},
			move: {
				enable: true,
				speed: 0.1,
				direction: "none" as const,
				random: false,
				straight: false,
				outModes: {
					default: "bounce" as const,
				},
			},
		},
		detectRetina: true,
	}), []);

	useEffect(() => {
		console.log('✅ Home component rendered, init:', init);
	}, [init]);

	return (
		<>
		<Helmet>
			<title>TrueShotOdds | Real-Time Arbitrage & +EV Bet Finder</title>
			<meta name="description" content="Find arbitrage opportunities and positive EV bets across DraftKings, FanDuel, BetMGM and 40+ sportsbooks. Live odds tracking with automated alerts." />
			<link rel="canonical" href="https://trueshotodds.com/" />
			<meta property="og:url" content="https://trueshotodds.com/" />
			<meta property="og:title" content="TrueShotOdds | Real-Time Arbitrage & +EV Bet Finder" />
			<meta property="og:description" content="Find arbitrage opportunities and positive EV bets across DraftKings, FanDuel, BetMGM and 40+ sportsbooks." />
			<script type="application/ld+json">{JSON.stringify({
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				"name": "TrueShotOdds",
				"url": "https://trueshotodds.com",
				"applicationCategory": "FinanceApplication",
				"operatingSystem": "Web",
				"description": "Real-time sports betting arbitrage and +EV bet finder across 40+ sportsbooks including DraftKings, FanDuel, and BetMGM.",
				"offers": [
					{ "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
					{ "@type": "Offer", "name": "Premium", "price": "0", "priceCurrency": "USD", "url": "https://trueshotodds.com/pricing" }
				]
			})}</script>
		</Helmet>
		<div className="min-h-screen text-white relative bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">


			{/* Starry Background - Full Page */}
			{init && (
				<Particles
					key="stable-particles"
					id="page-particles"
					className="fixed inset-0 z-0 pointer-events-none"
					options={particlesOptions}
				/>
			)}

			{/* Nav Links - scrolls with page */}
			<nav className="hidden md:flex absolute top-6.5 left-63 z-40 items-center gap-6">
				<button
					onClick={() => navigate('/pricing')}
					className="text-md font-bold text-gray-100 hover:text-white transition-colors cursor-pointer"
				>
					Pricing
				</button>
				<div className="relative">
					<button
						onClick={() => setIsLearnOpen(o => !o)}
						onBlur={() => setTimeout(() => setIsLearnOpen(false), 150)}
						className="text-md font-bold text-gray-100 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
					>
						Learn
						<svg className={`w-4 h-4 transition-transform duration-200 ${isLearnOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					{isLearnOpen && (
						<div className="absolute top-full left-0 mt-3 w-52 bg-gray-900 border border-white/10 rounded-xl py-2 shadow-xl z-50">
							<button onClick={() => { navigate('/lines'); setIsLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-sm font-medium">
								Betting Lines
							</button>
							<button onClick={() => { navigate('/arbitrage-betting'); setIsLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-sm font-medium">
								Arbitrage Betting
							</button>
							<button onClick={() => { navigate('/ev-betting'); setIsLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-sm font-medium">
								+EV Betting
							</button>
							<button onClick={() => { navigate('/faq'); setIsLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-sm font-medium">
								FAQ
							</button>
						</div>
					)}
				</div>
				<button
					onClick={() => setIsBugReportOpen(true)}
					className="text-md font-bold text-gray-100 hover:text-white transition-colors cursor-pointer"
				>
					Report a Bug
				</button>
			</nav>

			{/* Navigation Bar */}
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Main Content */}
			<div className="container mx-auto px-4 py-20">

				{/* Hero Banner */}
				<div className="max-w-6xl mx-auto lg:mb-16 mt-20">
					<div className="rounded-2xl">
						<div className="grid grid-cols-1 lg:flex gap-2">
							{/* Left Side - Text Content */}
							<div className="order-second lg:order-first p-12 flex flex-col justify-center">
								<h2 className="heading-hero uppercase text-center lg:text-left text-3xl lg:text-6xl text-gray-100 mb-4">
									Live Odds Straight To Your Feed
								</h2>
								<p className="text-xl text-gray-100 text-center lg:text-left mb-6">
									TrueShotOdds focuses on getting real-time bets delivered directly to your dashboard. Don't miss out as we expand our reach on sportsbooks.
								</p>
							</div>

							{/* Right Side - Image Placeholder */}
							<div className="order-first ml-12 lg:ml-0 lg:order-second flex items-center justify-center">
								<div className="text-center">
									<img
										src="/hero_banner.png"
										className="w-full scale-125 mx-auto text-white"
										alt="Hero Banner"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* CTA Buttons */}
				<div className="grid grid-cols-1 md:flex gap-4 justify-center mb-28">
					{currentUser && userTier === 'premium' ? (
						<button
							onClick={() => navigate('/dashboard')}
							className="backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
						>
							Go to Dashboard
						</button>
					) : currentUser && userTier === 'free' ? (
						<button
							onClick={() => navigate('/pricing')}
							className="backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
						>
							Upgrade Now
						</button>
					) : (
						<button
							onClick={() => setIsAuthModalOpen(true)}
							className="backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-14 rounded-lg transition-colors cursor-pointer"
						>
							Get Started
						</button>
					)}
					<button
						onClick={() => navigate('/pricing')}
						className="backdrop-blur-lg bg-gray-700 hover:bg-gray-600/100 text-white text-xl font-semibold py-3 px-14 rounded-lg transition-colors cursor-pointer"
					>
						View Plans
					</button>
				</div>
			</div>

			{/* Feature Showcase - Full width, outside container */}
			<div className="relative z-10 w-full bg-gray-900 py-16 px-4 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<h2 className="heading-hero uppercase text-3xl lg:text-5xl text-gray-100 text-center mb-50">
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
						imageSrc="/dashboard_screenshots/charts-plus-laptop.png"
						imageAlt="Real-time odds charts"
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
						imageSrc="/dashboard_screenshots/arbs-with-visuals.png"
						imageAlt="Arbitrage dashboard"
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
						imageSrc="/dashboard_screenshots/evbets.PNG"
						imageAlt="EV bets table"
						imagePosition="right"
						learnMorePath="/ev-betting"
					/>
				</div>
			</div>

			{/* FAQ Section */}
			<div className="container mx-auto px-4 py-20 max-w-3xl">
				<h2 className="heading-hero uppercase text-3xl lg:text-5xl text-gray-100 text-center mb-12">
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
						className="text-indigo-400 hover:text-indigo-300 text-lg font-semibold transition-colors cursor-pointer"
					>
						View all questions →
					</button>
				</div>
			</div>

			{/* Final CTA Section */}
			<div className="relative z-10 px-4 py-20 bg-gray-900 w-full">
				<div className="max-w-4xl mx-auto text-center">
					<div className="p-12 md:p-16">
						<h2 className="heading-hero uppercase text-4xl md:text-5xl text-gray-100 mb-12">
							Find your True Shot today and get started
						</h2>

						{currentUser ? (
							<button
								onClick={() => navigate('/dashboard')}
								className="backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								Go to Dashboard
							</button>
						) : (
							<button
								onClick={() => setIsAuthModalOpen(true)}
								className="backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
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
			<BugReportModal
				isOpen={isBugReportOpen}
				onClose={() => setIsBugReportOpen(false)}
			/>

			{/* Footer */}
			<Footer />
		</div>
		</>
	);
}

export default Home;
