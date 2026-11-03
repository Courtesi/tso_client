import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../hooks/useInView';

interface FeatureSectionProps {
	title: string;
	description: string;
	features: string[];
	imageSrc?: string;
	imageAlt?: string;
	// Rendered instead of the image when provided (e.g. a live component)
	media?: ReactNode;
	imagePosition: 'left' | 'right';
	learnMorePath?: string;
}

// Reduced motion keeps the opacity fade but drops the slide
const REVEAL_BASE = 'transition-all duration-700 motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:duration-300';

function revealText(isInView: boolean): string {
	return `${REVEAL_BASE} ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;
}

export default function FeatureSection({
	title,
	description,
	features,
	imageSrc,
	imageAlt,
	media,
	imagePosition,
	learnMorePath,
}: FeatureSectionProps) {
	const navigate = useNavigate();
	const { ref, isInView } = useInView({ threshold: 0.15 });

	const imageOnLeft = imagePosition === 'left';

	return (
		<div ref={ref} className="mb-28 lg:mb-40 last:mb-0">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
				{/* Text content */}
				<div className={imageOnLeft ? 'order-2' : 'order-2 lg:order-1'}>

					{/* Title */}
					<h3 className={`heading-hero text-3xl lg:text-5xl text-gray-100 mb-5 delay-100 ${revealText(isInView)}`}>
						{title}
					</h3>

					{/* Description */}
					<p className={`text-lg lg:text-xl text-gray-300 leading-relaxed mb-8 delay-200 ${revealText(isInView)}`}>
						{description}
					</p>

					{/* Feature bullets */}
					<ul className={`space-y-3 delay-300 ${revealText(isInView)}`}>
						{features.map((feature, i) => (
							<li key={i} className="flex items-center gap-3 text-gray-300 text-base lg:text-lg">
								<svg
									className="w-5 h-5 text-indigo-400 flex-shrink-0"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								{feature}
							</li>
						))}
					</ul>
					{learnMorePath && (
						<button
							onClick={() => navigate(learnMorePath)}
							className={`[transition:opacity_700ms_ease_300ms,transform_700ms_ease_300ms,color_300ms_ease_0ms]
								hover:[transition:opacity_700ms_ease_0ms,transform_700ms_ease_0ms,color_300ms_ease_0ms]
								mt-8 text-indigo-400 hover:text-indigo-300 active:text-indigo-200 font-semibold text-lg cursor-pointer flex items-center gap-1
								motion-reduce:translate-y-0 ${
								isInView
									? 'opacity-100 translate-y-0'
									: 'opacity-0 translate-y-4'
							}`}
						>
							Learn more
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					)}
				</div>

				{/* Image */}
				<div
					className={`${
						imageOnLeft ? 'order-1' : 'order-1 lg:order-2'
					} ${REVEAL_BASE} delay-[400ms] ${
						isInView
							? 'opacity-100 translate-x-0'
							: imageOnLeft
								? 'opacity-0 -translate-x-12'
								: 'opacity-0 translate-x-12'
					}`}
				>
					{media ?? (
						<img
							src={imageSrc}
							alt={imageAlt}
							className="w-full h-auto"
							loading="lazy"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
