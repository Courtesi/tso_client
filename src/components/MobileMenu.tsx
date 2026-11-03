import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BugReportModal from './BugReportModal';
import MobileMenuPanel from './MobileMenuPanel';

function MobileMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const [isBugReportOpen, setIsBugReportOpen] = useState(false);
	const closeMenu = useCallback(() => setIsOpen(false), []);
	const { currentUser } = useAuth();
	const navigate = useNavigate();


	const handleNavigate = (path: string) => {
		navigate(path);
		setIsOpen(false);
	};

	const handleBugReport = () => {
		setIsOpen(false);
		setIsBugReportOpen(true);
	};


	return (
		<div className="md:hidden">
			{/* Hamburger Button */}
			<button
				onClick={() => setIsOpen(true)}
				className="p-3 rounded-lg transition-[background-color,transform] duration-100 shadow-sm bg-indigo-600/30 hover:bg-indigo-600/45 active:scale-95 cursor-pointer"
				aria-label="Open menu"
				aria-expanded={isOpen}
			>
				<svg
					className="w-6 h-6 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>

			{/* Menu Panel */}
			<MobileMenuPanel isOpen={isOpen} onClose={closeMenu} widthClass="w-64">
				{/* Navigation Links */}
				<nav className="flex-1 p-4">
					<button
						onClick={() => handleNavigate('/')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						Home
					</button>

					<button
						onClick={() => handleNavigate('/pricing')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						Pricing
					</button>
					<button
						onClick={() => handleNavigate('/lines')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						Betting Lines
					</button>
					<button
						onClick={() => handleNavigate('/arbitrage-betting')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						Arbitrage Betting
					</button>
					<button
						onClick={() => handleNavigate('/ev-betting')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						+EV Betting
					</button>
					<button
						onClick={() => handleNavigate('/faq')}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
					>
						FAQ
					</button>

					{currentUser && (
						<button
							onClick={() => handleNavigate('/dashboard')}
							className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer"
						>
							Open Dashboard
						</button>
					)}

					{/* Bug Report Button */}
					<button
						onClick={handleBugReport}
						className="w-full text-left px-4 py-3 text-white hover:bg-white/[0.06] rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Report a Bug
					</button>
				</nav>
			</MobileMenuPanel>

			{/* Bug Report Modal */}
			<BugReportModal
				isOpen={isBugReportOpen}
				onClose={() => setIsBugReportOpen(false)}
			/>
		</div>
	);
}

export default MobileMenu;
