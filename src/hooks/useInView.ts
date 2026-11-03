import { useEffect, useState, useRef } from 'react';

interface UseInViewOptions {
	threshold?: number;
	rootMargin?: string;
}

export function useInView(options?: UseInViewOptions) {
	const [isInView, setIsInView] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		// Check if element is already in view immediately
		const checkInitialIntersection = () => {
			const rect = element.getBoundingClientRect();
			const windowHeight = window.innerHeight || document.documentElement.clientHeight;
			const threshold = options?.threshold ?? 0.1;

			// Calculate if element meets threshold visibility
			const elementHeight = rect.height;
			const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
			const visibleRatio = elementHeight > 0 ? visibleHeight / elementHeight : 0;

			if (visibleRatio >= threshold && rect.bottom > 0 && rect.top < windowHeight) {
				setIsInView(true);
				return true;
			}
			return false;
		};

		// Check immediately on mount
		if (checkInitialIntersection()) return;

		// Reveal once: stop observing after the first intersection so it never replays
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsInView(true);
					observer.disconnect();
				}
			},
			{
				threshold: options?.threshold ?? 0.1,
				rootMargin: options?.rootMargin ?? '0px',
			}
		);

		observer.observe(element);

		return () => observer.disconnect();
	}, [options?.threshold, options?.rootMargin]);

	return { ref, isInView };
}
