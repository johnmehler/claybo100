// Automated per-game screenshot capture.
//
// Usage:
//   1. Start the dev (or preview) server in another terminal:  npm run dev
//   2. In a new terminal:                                       npm run screenshots
//
// Outputs to /static/og/<id>.png (1200x630, OG/Twitter friendly).
//
// Override the base URL with BASE_URL env var, e.g. BASE_URL=http://localhost:4173

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OG_DIR = resolve(ROOT, 'static/og');

// How long to let each game animate/initialize before capturing.
const SETTLE_MS = 1500;

// Some games pass a different `gameId` to <Instructions> than their URL slug.
// Seed seen_<variant> alongside seen_<urlId> so the How-to-Play modal is suppressed.
const INSTRUCTION_KEY_VARIANTS = {
	'sliding-tiles': ['sliding_tiles'],
	'knights-tour': ['knightstour'],
	'iceslider': ['ice_slider'],
	'epidemicsim': ['epidemic_sim']
};

// Per-game pre-screenshot setup (e.g. dismiss start overlays). Receives the Playwright `page`.
const PRE_SHOT = {
	hanoi: async (page) => {
		// Hanoi shows its own start overlay; click START GAME to enter the 4-disc board.
		const btn = page.getByRole('button', { name: /start game/i });
		if (await btn.count()) await btn.first().click();
		await page.waitForTimeout(400);
	}
};

async function getGameIds(baseUrl) {
	const res = await fetch(`${baseUrl}/sitemap.xml`);
	if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`);
	const xml = await res.text();
	const ids = [];
	const re = /\/games\/([^<\s]+)</g;
	let m;
	while ((m = re.exec(xml))) ids.push(m[1]);
	return [...new Set(ids)];
}

async function ensureDirs() {
	await mkdir(OG_DIR, { recursive: true });
}

async function captureGame(browser, id) {
	const url = `${BASE_URL}/games/${id}`;
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1024 },
		deviceScaleFactor: 2,
		reducedMotion: 'reduce'
	});
	// Suppress the "How to Play" overlay (Instructions.svelte checks seen_<gameId>).
	const keysToSeed = [id, ...(INSTRUCTION_KEY_VARIANTS[id] || [])];
	await context.addInitScript((keys) => {
		try { for (const k of keys) localStorage.setItem(`seen_${k}`, 'true'); } catch {}
	}, keysToSeed);
	const page = await context.newPage();
	page.on('pageerror', (err) => console.warn(`  [${id}] page error:`, err.message));

	const preShot = PRE_SHOT[id];

	try {
		await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
		await page.waitForSelector('.game-frame-adaptive', { timeout: 10000 });
		await page.waitForTimeout(SETTLE_MS);
		if (preShot) await preShot(page);

		// OG/Twitter (1200x630) screenshot
		await page.setViewportSize({ width: 1200, height: 630 });
		await page.waitForTimeout(300);
		const ogPath = resolve(OG_DIR, `${id}.png`);
		await page.screenshot({ path: ogPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });

		console.log(`  ✓ ${id}`);
	} catch (err) {
		console.error(`  ✗ ${id}:`, err.message);
	} finally {
		await context.close();
	}
}

async function main() {
	console.log(`Base URL: ${BASE_URL}`);
	const ids = await getGameIds(BASE_URL);
	if (!ids.length) throw new Error('No game IDs found in sitemap');
	console.log(`Found ${ids.length} games:`, ids.join(', '));

	await ensureDirs();
	const browser = await chromium.launch();
	try {
		for (const id of ids) {
			await captureGame(browser, id);
		}
	} finally {
		await browser.close();
	}
	console.log(`\nDone. OG images in static/og/`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
