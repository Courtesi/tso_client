import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';

function ArbitrageBetting() {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

	return (
		<>
		<Helmet>
			<title>What Is Arbitrage Betting? | TrueShotOdds</title>
			<meta name="description" content="Arbitrage betting lets you place bets on all outcomes of a game across different sportsbooks to guarantee a profit regardless of the result. Learn how it works." />
			<link rel="canonical" href="https://trueshotodds.com/arbitrage-betting" />
			<meta property="og:url" content="https://trueshotodds.com/arbitrage-betting" />
			<meta property="og:title" content="What Is Arbitrage Betting? | TrueShotOdds" />
			<meta property="og:description" content="Arbitrage betting lets you place bets on all outcomes across different sportsbooks to guarantee a profit. Learn how TrueShotOdds finds arbs automatically." />
		</Helmet>
		<div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Hero */}
			<div className="container mx-auto px-4 pt-36 pb-20 max-w-4xl">
				<h1 className="heading-hero uppercase text-4xl lg:text-6xl text-gray-100 text-center mb-6">
					What Is Arbitrage Betting?
				</h1>
				<p className="text-xl text-gray-300 text-center max-w-2xl mx-auto">
					Arbitrage betting — or "arbing" — is a strategy where you place bets on every possible outcome of a game across different sportsbooks, locking in a guaranteed profit no matter who wins.
				</p>
			</div>

			{/* How it works */}
			<div className="w-full bg-gray-900 py-20 px-4">
				<div className="max-w-4xl mx-auto">
					<h2 className="heading-hero uppercase text-3xl lg:text-4xl text-gray-100 mb-10">
						How It Works
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<div className="text-3xl font-bold text-indigo-400 mb-3">01</div>
							<h3 className="text-lg font-bold text-gray-100 mb-2">Sportsbooks Disagree</h3>
							<p className="text-gray-300">Different sportsbooks set their own odds. When they disagree enough, the combined implied probabilities drop below 100% — creating an arb opportunity.</p>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<div className="text-3xl font-bold text-indigo-400 mb-3">02</div>
							<h3 className="text-lg font-bold text-gray-100 mb-2">Bet All Outcomes</h3>
							<p className="text-gray-300">You place one bet on each outcome across the different sportsbooks, sizing your stakes so you profit regardless of the result.</p>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<div className="text-3xl font-bold text-indigo-400 mb-3">03</div>
							<h3 className="text-lg font-bold text-gray-100 mb-2">Guaranteed Profit</h3>
							<p className="text-gray-300">No matter which team wins, your winnings from one sportsbook exceed your total stake across both — a risk-free return.</p>
						</div>
					</div>

					<h2 className="heading-hero uppercase text-3xl lg:text-4xl text-gray-100 mb-6">
						A Simple Example
					</h2>
					<div className="bg-gray-800/50 rounded-xl p-8 border border-white/10 mb-16">
						<p className="text-gray-300 text-lg mb-4">Say two sportsbooks offer opposite sides of an NBA game:</p>
						<ul className="space-y-3 text-gray-300 text-lg mb-6">
							<li className="flex items-start gap-3">
								<span className="text-indigo-400 font-bold mt-0.5">→</span>
								<span><strong className="text-white">DraftKings:</strong> Lakers +110 (bet $100, win $110)</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="text-indigo-400 font-bold mt-0.5">→</span>
								<span><strong className="text-white">FanDuel:</strong> Celtics +115 (bet $100, win $115)</span>
							</li>
						</ul>
						<p className="text-gray-300 text-lg">By betting both sides with calculated stakes, you collect more on the winning side than you lose on the other — locking in a small but guaranteed profit on every game.</p>
					</div>

					<h2 className="heading-hero uppercase text-3xl lg:text-4xl text-gray-100 mb-6">
						How TrueShotOdds Finds Arbs For You
					</h2>
					<p className="text-gray-300 text-xl mb-8">
						Arb opportunities vanish in minutes as sportsbooks adjust their lines. TrueShotOdds monitors 10+ sportsbooks in real time and surfaces every opportunity the moment it appears — so you never have to do the math manually or watch odds feeds yourself.
					</p>
					<ul className="space-y-4 mb-12">
						{[
							'Live odds scanning across 10+ sportsbooks',
							'Automatic stake calculations so you know exactly how much to bet',
							'Alerts on NBA, NFL, MLB and more',
							'Free tier available — no credit card required',
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
								onClick={() => navigate('/dashboard')}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								Go to Dashboard
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
							onClick={() => navigate('/ev-betting')}
							className="bg-gray-700 hover:bg-gray-600 text-white text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
						>
							Learn About +EV Betting →
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

export default ArbitrageBetting;