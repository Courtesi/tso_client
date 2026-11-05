interface PinButtonProps {
	id: string;
	isPinned: boolean;
	isStale?: boolean;
	onToggle: () => void;
}

function PinButton({ isPinned, isStale, onToggle }: PinButtonProps) {
	// Determine visual state
	const getButtonStyle = () => {
		if (isPinned && isStale) {
			return 'text-rose-600 hover:text-red-800';
		}
		if (isPinned) {
			return 'text-indigo-400 shadow-lg hover:text-indigo-400';
		}
		return 'text-gray-400 opacity-40 hover:opacity-100 hover:text-gray-300';
	};

	const getAriaLabel = () => {
		if (isPinned && isStale) {
			return 'Unpin stale item';
		}
		if (isPinned) {
			return 'Unpin item';
		}
		return 'Pin item';
	};

	// Star icon SVG - filled when pinned, outline when unpinned
	const PinIcon = (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill={isPinned ? 'currentColor' : 'none'}
			stroke="currentColor"
			strokeWidth="2"
			className="w-5 h-5"
		>
			<path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z" strokeLinejoin="round" />
		</svg>
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			onToggle();
		}
	};

	return (
		<button
			onClick={(e) => {
				e.stopPropagation();
				onToggle();
			}}
			onKeyDown={handleKeyDown}
			className={`cursor-pointer transition-all duration-200 ${getButtonStyle()}`}
			aria-label={getAriaLabel()}
			title={isStale ? 'This item may no longer be available. Click to unpin.' : isPinned ? 'Click to unpin' : 'Click to pin'}
		>
			{PinIcon}
		</button>
	);
}

export default PinButton;
