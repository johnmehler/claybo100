import { games } from '$lib/games';

export const prerender = true;

const SITE = 'https://onlinemath.games';

export function GET() {
	const today = new Date().toISOString().split('T')[0];
	const homeLastmod = games
		.map((g) => g.updated)
		.filter(Boolean)
		.sort()
		.pop() ?? today;

	const urls = [
		{ loc: `${SITE}/`, lastmod: homeLastmod, priority: '1.0', changefreq: 'weekly' },
		...games.map((g) => ({
			loc: `${SITE}/games/${g.id}`,
			lastmod: g.updated ?? today,
			priority: '0.8',
			changefreq: 'monthly'
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `	<url>
		<loc>${u.loc}</loc>
		<lastmod>${u.lastmod}</lastmod>
		<changefreq>${u.changefreq}</changefreq>
		<priority>${u.priority}</priority>
	</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
