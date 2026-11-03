import { useEffect, type ReactNode } from 'react';

interface MobileMenuPanelProps {
	isOpen: boolean;
	onClose: () => void;
	widthClass?: string;
	children: ReactNode;
}

/**
 * Right-hand glass sheet for the phone menus. Stays mounted so it can slide in and
 * back out along the same path; reduced-motion users get a cross-fade instead.
 */
export default function MobileMenuPanel({ isOpen, onClose, widthClass = 'w-64', children }: MobileMenuPanelProps) {
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	return (
		<>
			{/* Backdrop */}
			<div
				aria-hidden="true"
				onClick={onClose}
				className={`fixed inset-0 z-50 bg-black/45 transition-opacity duration-300 ${
					isOpen ? 'opacity-100 backdrop-blur-sm' : 'pointer-events-none opacity-0'
				}`}
			/>

			{/* Panel */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Menu"
				inert={!isOpen}
				className={`fixed inset-y-0 right-0 z-50 ${widthClass} border-l border-white/10 bg-gray-950/75 shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150 transition-[transform,opacity,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
					isOpen
						? 'visible translate-x-0 opacity-100'
						: 'invisible translate-x-full motion-reduce:translate-x-0 motion-reduce:opacity-0'
				}`}
			>
				<div className="flex h-full flex-col overflow-y-auto">
					<div className="flex items-center justify-between border-b border-white/10 p-4">
						<span className="text-lg font-semibold tracking-tight text-white">Menu</span>
						<button
							onClick={onClose}
							className="rounded-lg p-2 transition-[background-color,transform] duration-100 hover:bg-white/[0.06] active:scale-95 cursor-pointer"
							aria-label="Close menu"
						>
							<svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					{children}
				</div>
			</div>
		</>
	);
}
