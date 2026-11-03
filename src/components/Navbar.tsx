import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MobileMenu from './MobileMenu';
import DashboardMobileMenu from './DashboardMobileMenu';
import UserMenu from './UserMenu';
import BugReportModal from './BugReportModal';
import Logo from './Logo';

interface NavbarProps {
	onAuthModalOpen?: () => void;
}

const LEARN_LINKS = [
	{ label: 'Betting Lines', path: '/lines' },
	{ label: 'Arbitrage Betting', path: '/arbitrage-betting' },
	{ label: '+EV Betting', path: '/ev-betting' },
	{ label: 'FAQ', path: '/faq' },
];

const navLinkClass = 'rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white active:bg-white/10 cursor-pointer';

function LearnMenu() {
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close on outside press or Escape (instead of a blur timeout)
	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (e: PointerEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsOpen(false);
		};
		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div ref={containerRef} className="relative">
			<button
				onClick={() => setIsOpen(o => !o)}
				className={`${navLinkClass} flex items-center gap-1 ${isOpen ? 'bg-white/[0.06] text-white' : ''}`}
				aria-expanded={isOpen}
				aria-haspopup="menu"
			>
				Learn
				<svg className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{isOpen && (
				<div
					role="menu"
					className="animate-menu-in absolute left-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-gray-900/95 p-1.5 shadow-2xl shadow-black/40"
				>
					{LEARN_LINKS.map(link => (
						<button
							key={link.path}
							role="menuitem"
							onClick={() => { navigate(link.path); setIsOpen(false); }}
							className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
						>
							{link.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function Navbar({ onAuthModalOpen }: NavbarProps) {
	const { currentUser, userTier } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [isBugReportOpen, setIsBugReportOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	// Check which page we're on
	const isDashboard = location.pathname === '/dashboard';
	const isTerminal = location.pathname === '/charts';
	const isPricing = location.pathname === '/pricing';
	const isSettings = location.pathname === '/settings';
	const isEvBets = location.pathname === '/ev-bets';
	const isUserPage = isDashboard || isTerminal || isSettings || isEvBets;

	// Public pages: the glass material only appears once content scrolls underneath it
	useEffect(() => {
		if (isUserPage) return;
		const handleScroll = () => setIsScrolled(window.scrollY > 8);
		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, [isUserPage]);

	return (
		<header className="fixed top-0 left-0 right-0 z-30 h-17">
			{/* Material layer. Kept as a sibling so backdrop-filter doesn't become the
			    containing block for the fixed-position menus and modals rendered below. */}
			{isUserPage ? (
				<div className="absolute inset-0 border-b border-gray-700 bg-slate-900 md:bg-gray-950" />
			) : (
				<div
					aria-hidden="true"
					className={`absolute inset-0 border-b bg-gray-950/65 backdrop-blur-xl backdrop-saturate-150 transition-[opacity,border-color] duration-300 motion-reduce:transition-none ${
						isScrolled ? 'border-white/[0.08] opacity-100' : 'border-transparent opacity-0'
					}`}
				/>
			)}

			<div className="relative flex h-full items-center justify-between gap-6 px-6">
				<div className="flex items-center gap-8">
					<button
						onClick={() => navigate('/')}
						className="rounded-lg transition-transform duration-100 active:scale-[0.97] cursor-pointer"
						aria-label="TrueShotOdds home"
					>
						<Logo />
					</button>

					{!isUserPage && (
						<nav className="hidden items-center gap-1 md:flex" aria-label="Main">
							<button
								onClick={() => navigate('/pricing')}
								className={`${navLinkClass} ${isPricing ? 'text-white' : ''}`}
								aria-current={isPricing ? 'page' : undefined}
							>
								Pricing
							</button>
							<LearnMenu />
							<button onClick={() => setIsBugReportOpen(true)} className={navLinkClass}>
								Report a Bug
							</button>
						</nav>
					)}
				</div>

				{/* Mobile Menu (Mobile Only) */}
				<div className="md:hidden">
					{isUserPage ? <DashboardMobileMenu /> : <MobileMenu />}
				</div>

				{/* Desktop actions (Desktop Only) */}
				<div className="hidden items-center gap-3 md:flex">
					{isUserPage && (
						<button
							onClick={() => setIsBugReportOpen(true)}
							className="bg-gray-800/80 hover:bg-gray-700 p-2 rounded-full transition-colors shadow-lg cursor-pointer group"
							aria-label="Report a bug"
							title="Report a bug"
						>
							<svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</button>
					)}

					{currentUser && userTier === 'free' && !isPricing && (
						<button
							onClick={() => navigate('/pricing')}
							className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-950 shadow-lg transition-[background-color,transform] duration-100 hover:bg-gray-200 active:scale-[0.97] cursor-pointer"
						>
							Upgrade
						</button>
					)}
					{isUserPage ? (
						<UserMenu />
					) : currentUser ? (
						<button
							onClick={() => navigate('/dashboard')}
							className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-1.5 text-sm font-semibold text-gray-50 transition-[background-color,transform] duration-100 hover:bg-white/[0.14] active:scale-[0.97] cursor-pointer"
						>
							Open Dashboard
						</button>
					) : (
						<button
							onClick={onAuthModalOpen}
							className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-1.5 text-sm font-semibold text-gray-50 transition-[background-color,transform] duration-100 hover:bg-white/[0.14] active:scale-[0.97] cursor-pointer"
						>
							Log In
						</button>
					)}
				</div>
			</div>

			{/* Bug Report Modal */}
			<BugReportModal
				isOpen={isBugReportOpen}
				onClose={() => setIsBugReportOpen(false)}
			/>
		</header>
	);
}

export default Navbar;
