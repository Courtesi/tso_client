import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';

function EVBetting() {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

	return (
		<>
		<Helmet>
			<title>What Is +EV Betting? | TrueShotOdds</title>
			<meta name="description" content="+EV (positive expected value) betting means placing bets where the odds offered are better than the true probability of the outcome. Win long-term by betting smarter." />
			<link rel="canonical" href="https://trueshotodds.com/ev-betting" />
			<meta property="og:url" content="https://trueshotodds.com/ev-betting" />
			<meta property="og:title" content="What Is +EV Betting? | TrueShotOdds" />
			<meta property="og:description" content="+EV betting means placing bets where the odds are better than the true probability. TrueShotOdds finds these opportunities automatically across 10+ sportsbooks." />
		</Helmet>
		<div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Hero */}
			<div className="container mx-auto px-4 pt-36 pb-20 max-w-4xl">
				<h1 className="heading-hero text-4xl lg:text-6xl text-gray-100 text-center mb-6">
					What Is +EV Betting?
				</h1>
				<p className="text-xl text-gray-300 text-center max-w-2xl mx-auto">
					+EV (positive expected value) betting means placing wagers where the odds a sportsbook offers are better than the true probability of the outcome — giving you a mathematical edge over time.
				</p>
			</div>

			{/* Content */}
			<div className="w-full bg-gray-900 py-20 px-4">
				<div className="max-w-4xl mx-auto">
					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						Understanding Expected Value
					</h2>
					<p className="text-gray-300 text-xl mb-8">
						Every bet has an expected value — the average amount you'd win or lose per dollar wagered if you placed the same bet thousands of times. A positive EV means the bet is profitable in the long run. Sportsbooks make money because most of their bets are negative EV for the bettor.
					</p>

					<div className="bg-gray-800/50 rounded-xl p-8 border border-white/10 mb-16">
						<h3 className="text-xl font-bold text-gray-100 mb-4">A Simple Example</h3>
						<p className="text-gray-300 text-lg mb-4">
							A coin flip has a 50% chance of heads. A fair bet would pay even money (+100 in American odds).
						</p>
						<ul className="space-y-3 text-gray-300 text-lg mb-4">
							<li className="flex items-start gap-3">
								<span className="text-red-400 font-bold mt-0.5">−EV:</span>
								<span>A sportsbook offers <strong className="text-white">-110</strong> on heads. You risk $110 to win $100. Long-term, you lose.</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="text-green-400 font-bold mt-0.5">+EV:</span>
								<span>A sportsbook offers <strong className="text-white">+115</strong> on heads. You risk $100 to win $115. Long-term, you profit.</span>
							</li>
						</ul>
						<p className="text-gray-300 text-lg">The key is finding bets where sportsbooks have mispriced the odds relative to the true probability — something TrueShotOdds automates.</p>
					</div>

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						+EV vs. Arbitrage Betting
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-bold text-indigo-400 mb-3">Arbitrage Betting</h3>
							<ul className="space-y-2 text-gray-300">
								<li>✓ Guaranteed profit on every bet</li>
								<li>✓ Zero risk per opportunity</li>
								<li>✗ Requires accounts at multiple sportsbooks</li>
								<li>✗ Opportunities are small and fleeting</li>
							</ul>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-bold text-indigo-400 mb-3">+EV Betting</h3>
							<ul className="space-y-2 text-gray-300">
								<li>✓ More opportunities available</li>
								<li>✓ Larger potential returns</li>
								<li>✓ Only one sportsbook needed per bet</li>
								<li>✗ Variance — not every bet wins</li>
							</ul>
						</div>
					</div>

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						How TrueShotOdds Finds +EV Bets
					</h2>
					<p className="text-gray-300 text-xl mb-8">
						We calculate the "sharp" consensus odds from the most accurate sportsbooks, then flag any line at other books that's significantly better — meaning the sportsbook has mispriced the bet in your favor.
					</p>
					<ul className="space-y-4 mb-12">
						{[
							'EV percentage shown for every opportunity',
							'Filter by sport, league, market type, and minimum EV',
							'Kelly criterion stake sizing built in',
							'Updated every few seconds across 10+ sportsbooks',
						].map((item) => (
							<li key={item} className="flex items-center gap-3 text-gray-300 text-lg">
								<svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
								</svg>
								{item}
							</li>
						))}
					</ul>

					<div className="flex flex-col sm:flex-row gap-4">
						{currentUser ? (
							<button
								onClick={() => navigate('/ev-bets')}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								View +EV Bets
							</button>
						) : (
							<button
								onClick={() => setIsAuthModalOpen(true)}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								Get Started Free
							</button>
						)}
						<button
							onClick={() => navigate('/arbitrage-betting')}
							className="bg-gray-700 hover:bg-gray-600 text-white text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
						>
							Learn About Arb Betting →
						</button>
					</div>
				</div>
			</div>

			<Footer />
		</div>

		<AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
		</>
	);
}

export default EVBetting;