import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatarColor } from '../utils/avatarUtils';
import BugReportModal from './BugReportModal';
import DeleteAccountModal from './DeleteAccountModal';

function DashboardMobileMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const [isBugReportOpen, setIsBugReportOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const { currentUser, userTier, signOut } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const handleSignOut = async () => {
		try {
			await signOut();
			setIsOpen(false);
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	const handleNavigate = (path: string) => {
		navigate(path);
		setIsOpen(false);
	};

	const handleBugReport = () => {
		setIsOpen(false);
		setIsBugReportOpen(true);
	};

	const handleDeleteAccount = () => {
		setIsOpen(false);
		setIsDeleteModalOpen(true);
	};

	// Get user initials for avatar
	const getInitials = () => {
		if (currentUser?.displayName) {
			return currentUser.displayName
				.split(' ')
				.map(n => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return currentUser?.email?.[0]?.toUpperCase() || 'U';
	};

	// Get consistent color for this user
	const avatarColor = currentUser ? getUserAvatarColor(currentUser.uid) : { bg: '#6366F1', text: '#FFFFFF' };

	return (
		<div className="md:hidden">
			{/* Hamburger Button */}
			<button
				onClick={() => setIsOpen(true)}
				className="p-3 rounded-lg transition-colors shadow-sm bg-indigo-600/30 cursor-pointer"
				aria-label="Open menu"
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

			{/* Menu Overlay */}
			{isOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50"
						onClick={() => setIsOpen(false)}
					/>

					{/* Menu Panel */}
					<div className="fixed top-0 right-0 bottom-0 w-72 bg-indigo-950 shadow-2xl z-50 transform transition-transform">
						<div className="flex flex-col h-full">
							{/* Header with Close Button */}
							<div className="flex items-center justify-between p-4 border-b border-gray-700">
								<span className="text-xl font-bold text-white">Menu</span>
								<button
									onClick={() => setIsOpen(false)}
									className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
									aria-label="Close menu"
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
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							{/* User Profile Section */}
							<div className="p-4 border-b border-gray-700">
								<div className="flex items-center gap-3 mb-3">
									{/* User Avatar */}
									<div
										className="w-12 h-12 rounded-full flex items-center justify-center font-medium text-lg"
										style={{
											backgroundColor: avatarColor.bg,
											color: avatarColor.text
										}}
									>
										{getInitials()}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-white truncate">
											{currentUser?.displayName || 'User'}
										</p>
										<p className="text-xs text-gray-400 truncate">
											{currentUser?.email}
										</p>
									</div>
								</div>
								{/* Tier Badge */}
								<div>
									<span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
										userTier === 'premium'
											? 'bg-green-600 text-white'
											: 'bg-gray-700 text-gray-300'
									}`}>
										{userTier === 'premium' ? 'Premium Member' : 'Free Tier'}
									</span>
								</div>
							</div>

							{/* Navigation Menu */}
							<nav className="flex-1 p-4">
								{/* Dashboard/Terminal Navigation */}
								<div className="mb-4 border-b border-gray-700 pb-4">
									<button
										onClick={() => handleNavigate('/dashboard')}
										className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2 ${
											location.pathname === '/dashboard'
												? 'border-3 border-gray-300'
												: 'text-white hover:bg-gray-800'
										}`}
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
										Arbitrage Opportunities
									</button>
									<button
										onClick={() => handleNavigate('/charts')}
										className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2 ${
											location.pathname === '/charts'
												? 'border-3 border-gray-300'
												: 'text-white hover:bg-gray-800'
										}`}
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
										</svg>
										Odds Charts
									</button>
									<button
										onClick={() => handleNavigate('/ev-bets')}
										className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2 ${
											location.pathname === '/ev-bets'
												? 'border-3 border-gray-300'
												: 'text-white hover:bg-gray-800'
										}`}
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										+EV Bets
									</button>
								</div>

								{/* Upgrade Button - Only show for free tier users */}
								{userTier === 'free' && (
									<button
										onClick={() => handleNavigate('/pricing')}
										className="w-full text-left px-4 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2"
									>
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
										Upgrade to Premium
									</button>
								)}

								{/* Manage Subscription - Only show for premium users */}
								{userTier === 'premium' && (
									<button
										onClick={() => handleNavigate('/pricing')}
										className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2"
									>
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
											/>
										</svg>
										Manage Subscription
									</button>
								)}

								{/* Settings */}
								<button
									onClick={() => handleNavigate('/settings')}
									className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2 ${
										location.pathname === '/settings'
											? 'border-3 border-gray-300'
											: 'text-white hover:bg-gray-800'
									}`}
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
									Settings
								</button>

								{/* Bug Report Button */}
								<button
									onClick={handleBugReport}
									className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2 font-medium cursor-pointer flex items-center gap-2"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Report a Bug
								</button>
							</nav>

							{/* Danger Zone - Bottom of menu */}
							<div className="p-4 border-t border-gray-700">
								<button
									onClick={handleDeleteAccount}
									className="w-full text-left px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors font-medium cursor-pointer flex items-center gap-2 mb-2"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
									Delete Account
								</button>
								<button
									onClick={handleSignOut}
									className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors font-medium cursor-pointer flex items-center gap-2"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
										/>
									</svg>
									Sign Out
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Bug Report Modal */}
			<BugReportModal
				isOpen={isBugReportOpen}
				onClose={() => setIsBugReportOpen(false)}
			/>

			{/* Delete Account Modal */}
			<DeleteAccountModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
			/>
		</div>
	);
}

export default DashboardMobileMenu;
