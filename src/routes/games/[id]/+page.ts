import { games } from '$lib/games';

export const prerender = true;
export const ssr = false;

export function entries() {
	return games.map((g) => ({ id: g.id }));
}
