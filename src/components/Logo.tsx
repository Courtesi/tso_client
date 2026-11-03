interface LogoProps {
	size?: 'md' | 'sm';
}

const SIZES = {
	md: { mark: 'h-7 w-7', text: 'text-xl' },
	sm: { mark: 'h-6 w-6', text: 'text-lg' },
};

/**
 * Brand lockup: the logo mark plus the wordmark as live text, so it renders in the
 * site font for every visitor instead of depending on fonts installed locally.
 */
export default function Logo({ size = 'md' }: LogoProps) {
	const { mark, text } = SIZES[size];
	return (
		<span className="flex items-center gap-2">
			<img src="/logo-mark.svg" alt="" className={mark} />
			<span className={`${text} font-extrabold tracking-[-0.035em]`}>
				<span className="text-brand-ink">TrueShot</span>
				<span className="text-brand">Odds</span>
			</span>
		</span>
	);
}
