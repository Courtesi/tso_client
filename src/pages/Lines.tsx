import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';

function Lines() {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

	return (
		<>
		<Helmet>
			<title>What Are Betting Lines? | TrueShotOdds</title>
			<meta name="description" content="Betting lines are the odds sportsbooks set on a game. Learn how lines move, why they change, and how tracking line movement gives you an edge." />
			<link rel="canonical" href="https://trueshotodds.com/lines" />
			<meta property="og:url" content="https://trueshotodds.com/lines" />
			<meta property="og:title" content="What Are Betting Lines? | TrueShotOdds" />
			<meta property="og:description" content="Learn how betting lines work, why they move, and how TrueShotOdds tracks line movement across 10+ sportsbooks in real time." />
		</Helmet>
		<div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Hero */}
			<div className="container mx-auto px-4 pt-36 pb-20 max-w-4xl">
				<h1 className="heading-hero text-4xl lg:text-6xl text-gray-100 text-center mb-6">
					What Are Betting Lines?
				</h1>
				<p className="text-xl text-gray-300 text-center max-w-2xl mx-auto">
					A betting line is the odds a sportsbook sets on a game or event. Lines are not fixed — they shift constantly in response to betting volume, sharp money, and new information. Tracking that movement is one of the most powerful edges in sports betting.
				</p>
			</div>

			{/* Content */}
			<div className="w-full bg-gray-900 py-20 px-4">
				<div className="max-w-4xl mx-auto">

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						How Lines Are Set
					</h2>
					<p className="text-gray-300 text-xl mb-12">
						Sportsbooks open a line based on their own models and the market. Early lines attract sharp bettors — professionals who bet large amounts on mispriced odds. When sharps hit one side, the book adjusts the line to balance their exposure. By the time the game starts, the line reflects a combination of the book's model and the collective wisdom of the market.
					</p>

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-8">
						Why Lines Move
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-bold text-indigo-400 mb-2">Sharp Action</h3>
							<p className="text-gray-300">Professional bettors placing large wagers on one side force books to move the line to limit their risk.</p>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-bold text-indigo-400 mb-2">Public Betting</h3>
							<p className="text-gray-300">Heavy recreational money on a popular team can push the line, sometimes creating value on the other side.</p>
						</div>
						<div className="bg-gray-800/50 rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-bold text-indigo-400 mb-2">News & Injuries</h3>
							<p className="text-gray-300">A late injury report or weather update can cause lines to move sharply in seconds as books reprice the event.</p>
						</div>
					</div>

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						Reading Line Movement
					</h2>
					<div className="bg-gray-800/50 rounded-xl p-8 border border-white/10 mb-16">
						<p className="text-gray-300 text-lg mb-4">Line movement tells a story. Two key signals to watch:</p>
						<ul className="space-y-4 text-gray-300 text-lg">
							<li className="flex items-start gap-3">
								<span className="text-indigo-400 font-bold mt-0.5">→</span>
								<span><strong className="text-white">Reverse line movement:</strong> the public is betting heavily on Team A, but the line moves toward Team A — meaning sharp money is on Team B. Often a strong fade signal.</span>
							</li>
							<li className="flex items-start gap-3">
								<span className="text-indigo-400 font-bold mt-0.5">→</span>
								<span><strong className="text-white">Steam moves:</strong> a sudden, fast line move across multiple books simultaneously — a signal that sharp groups have acted. The window to get the old price closes in seconds.</span>
							</li>
						</ul>
					</div>

					<h2 className="heading-hero text-3xl lg:text-4xl text-gray-100 mb-6">
						How TrueShotOdds Tracks Lines
					</h2>
					<p className="text-gray-300 text-xl mb-8">
						TrueShotOdds pulls live odds from 10+ sportsbooks and plots every price change on a real-time chart. You can see exactly when and where a line moved, compare books side by side, and spot the steam moves before the market settles.
					</p>
					<ul className="space-y-4 mb-12">
						{[
							'Live line charts updating every few seconds',
							'Compare line movement across 10+ sportsbooks simultaneously',
							'Historical odds data to see how far lines have moved',
							'Filter by league, game, and market type',
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
								onClick={() => navigate('/charts')}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								View Live Charts
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

export default Lines;