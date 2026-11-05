import { useEffect, useRef } from 'react';

interface FeatureVideoProps {
	// Base path without extension, e.g. "/dashboard_videos/arbs" (expects .webm, .mp4 and -poster.jpg)
	src: string;
	label: string;
}

/**
 * Silent looping product clip. Plays only while on screen; with reduced motion
 * it stays on the poster frame until the viewer presses play.
 */
export default function FeatureVideo({ src, label }: FeatureVideoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	useEffect(() => {
		const video = videoRef.current;
		if (!video || reduceMotion) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					// Autoplay can still be refused (e.g. data saver); the poster stays up
					video.play().catch(() => {});
				} else {
					video.pause();
				}
			},
			{ threshold: 0.25 }
		);

		observer.observe(video);
		return () => observer.disconnect();
	}, [reduceMotion]);

	return (
		<div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-950/80 shadow-[0_24px_80px_-20px_rgb(79_70_229/0.45)] ring-1 ring-black/40">
			<video
				ref={videoRef}
				muted
				loop
				playsInline
				preload="metadata"
				poster={`${src}-poster.jpg`}
				controls={reduceMotion}
				aria-label={label}
				className="block w-full h-auto aspect-[1100/688]"
			>
				<source src={`${src}.webm`} type="video/webm" />
				<source src={`${src}.mp4`} type="video/mp4" />
			</video>
		</div>
	);
}
