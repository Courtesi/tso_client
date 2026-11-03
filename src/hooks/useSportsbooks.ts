import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SportsbookInfo } from '../types/stripe';

type SportsbookMap = Record<string, SportsbookInfo>;

// Shared across components so the public config is fetched once per page load
let cache: SportsbookMap | null = null;
let inflight: Promise<SportsbookMap> | null = null;

function loadSportsbooks(): Promise<SportsbookMap> {
	if (cache) return Promise.resolve(cache);
	if (!inflight) {
		inflight = api.getSportsbooks()
			.then(response => {
				cache = response.sportsbooks;
				return cache;
			})
			.finally(() => {
				inflight = null;
			});
	}
	return inflight;
}

export function sportsbookIconPath(info: SportsbookInfo): string {
	return `/sportsbook_icons/${info.icon}`;
}

/**
 * Supported sportsbooks from the public config endpoint, keyed by normalized name.
 * Returns null until loaded (or if the request fails).
 */
export function useSportsbooks(): SportsbookMap | null {
	const [sportsbooks, setSportsbooks] = useState<SportsbookMap | null>(cache);

	useEffect(() => {
		if (cache) return;
		let cancelled = false;
		loadSportsbooks()
			.then(result => { if (!cancelled) setSportsbooks(result); })
			.catch(err => console.error('Failed to fetch sportsbooks config:', err));
		return () => { cancelled = true; };
	}, []);

	return sportsbooks;
}
