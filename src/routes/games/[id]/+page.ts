import { games } from '$lib/games';

export const prerender = true;

export function entries() {
	return games.map((g) => ({ id: g.id }));
}
