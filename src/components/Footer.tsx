import { useNavigate } from 'react-router-dom';

function Footer() {
	const navigate = useNavigate();

	return (
		<footer className="bg-indigo-950/50 backdrop-blur-sm border-t border-white/10 py-8">
			<div className="container mx-auto px-4">
				<div className="flex flex-col md:flex-row justify-between items-center gap-6">
					{/* Logo and Copyright */}
					<div className="flex flex-col items-center md:items-start gap-2">
						<div className="flex items-center gap-2">
							<img src="/logo.png" alt="TrueShotOdds Logo" className="w-6" />
							<span className="font-extrabold text-xl text-white">TrueShotOdds</span>
						</div>
					</div>

					{/* Navigation Links */}
					<div className="flex flex-wrap justify-center gap-6 text-sm">
						<button
							onClick={() => navigate('/pricing')}
							className="text-gray-300 hover:text-white transition-colors cursor-pointer"
						>
							Pricing
						</button>
						<button
							onClick={() => navigate('/lines')}
							className="text-gray-300 hover:text-white transition-colors cursor-pointer"
						>
							Betting Lines
						</button>
						<button
							onClick={() => navigate('/arbitrage-betting')}
							className="text-gray-300 hover:text-white transition-colors cursor-pointer"
						>
							Arbitrage Betting
						</button>
						<button
							onClick={() => navigate('/ev-betting')}
							className="text-gray-300 hover:text-white transition-colors cursor-pointer"
						>
							+EV Betting
						</button>
						<button
							onClick={() => navigate('/faq')}
							className="text-gray-300 hover:text-white transition-colors cursor-pointer"
						>
							FAQ
						</button>
						<a
							href="mailto:support@trueshotodds.com"
							className="text-gray-300 hover:text-white transition-colors"
						>
							Contact
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
