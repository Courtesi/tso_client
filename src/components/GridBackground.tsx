/**
 * Faint 56px line grid that fades out from the top of the page.
 * Purely decorative; sits behind content and ignores pointer events.
 */
export default function GridBackground({ className = '' }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-[56rem] bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:56px_56px] bg-[position:center_top] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_100%)] ${className}`}
		/>
	);
}
