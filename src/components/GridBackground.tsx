const PATTERNS = {
	lines: 'bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:56px_56px]',
	dots: 'bg-[radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1.5px)] bg-[size:28px_28px]',
	// SVG tile defined in index.css; CSS gradients can't dash both axes independently
	dashed: 'bg-grid-dashed',
	crosses: 'bg-grid-crosses',
	// 56px major lines over 14px minor lines, like graph paper
	majorMinor: 'bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:56px_56px,56px_56px,14px_14px,14px_14px]',
} as const;

/**
 * Faint line or dot grid that fades out from the top of the page.
 * Purely decorative; sits behind content and ignores pointer events.
 */
export default function GridBackground({
	className = '',
	variant = 'lines',
	height = '64rem',
}: {
	className?: string;
	variant?: keyof typeof PATTERNS;
	height?: string;
}) {
	return (
		<div
			aria-hidden="true"
			style={{height}}
			className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-[64rem] ${PATTERNS[variant]} bg-[position:center_top] [mask-image:radial-gradient(ellipse_70%_75%_at_50%_0%,black_30%,transparent_100%)] ${className}`}
		/>
	);
}
