export const games = [
	{
		id: 'sliding-tiles',
		label: 'Sliding Tiles',
		description: 'Classical 15-puzzle with a modern twist.',
		cardClass: 'sliding',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Sliding Tiles Icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`
	},
	{
		id: 'pegboard',
		label: 'Peg Solitaire',
		description: 'English peg solitaire. Leave only one.',
		cardClass: 'pegboard-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Peg Solitaire Icon"><circle cx="12" cy="5" r="2"></circle><circle cx="8" cy="12" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="4" cy="19" r="2"></circle><circle cx="12" cy="19" r="2"></circle><circle cx="20" cy="19" r="2"></circle></svg>`
	},
	{
		id: 'hanoi',
		label: 'Hanoi',
		description: 'Classic tower puzzle. 3 to 8 discs.',
		cardClass: 'hanoi-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Tower of Hanoi Icon"><line x1="2" y1="20" x2="22" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line><rect x="8" y="16" width="8" height="4" rx="1"></rect><rect x="9" y="12" width="6" height="4" rx="1"></rect><rect x="10" y="8" width="4" height="4" rx="1"></rect></svg>`
	},
	{
		id: 'knights-tour',
		label: "Knight's Tour",
		description: 'Visit every square on the board exactly once.',
		cardClass: 'knights-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Knight's Tour Icon"><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456"/><path d="m15 5 1.425-1.425"/><path d="m17 8 1.53-1.53"/><path d="M9.713 12.185 7 18"/></svg>`
	},
	{
		id: 'set',
		label: 'Set',
		description: 'Find combinations of matching or unique attributes.',
		cardClass: 'set-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Set Game Icon"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`
	},
	{
		id: 'dotsandboxes',
		label: 'Dots & Boxes',
		description: 'Connect dots to capture squares against AI.',
		cardClass: 'dots-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Dots and Boxes Icon"><circle cx="6" cy="6" r="1"></circle><circle cx="18" cy="6" r="1"></circle><circle cx="6" cy="18" r="1"></circle><circle cx="18" cy="18" r="1"></circle><rect x="6" y="6" width="12" height="12" stroke-dasharray="2 2"></rect></svg>`
	},
	{
		id: 'iceslider',
		label: 'Ice Slider',
		description: 'Slide blocks on frictionless ice to reach the goal.',
		cardClass: 'ice-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Ice Slider Icon"><path d="M2 12h20"/><rect x="7" y="4" width="10" height="8" rx="1"/><path d="M7 12l-2 8h14l-2-8"/></svg>`
	},
	{
		id: 'nim',
		label: 'Nim',
		description: 'Mathematical strategy game of removing objects.',
		cardClass: 'nim-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Nim Icon"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/></svg>`
	},
	{
		id: 'hex',
		label: 'Hex',
		description: 'Connect your sides on a hexagonal grid.',
		cardClass: 'hex-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Hex Icon"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/></svg>`
	},
	{
		id: 'krypto',
		label: 'Krypto',
		description: 'Use math operators to reach the target number.',
		cardClass: 'krypto-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Krypto Icon"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
	},
	{
		id: 'shotsim',
		label: 'ShotSim',
		description: 'Cannon physics simulator. Hit the hoop.',
		cardClass: 'shotsim-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="ShotSim Icon"><path d="M3 21 Q 12 3, 21 12"></path><circle cx="21" cy="12" r="2"></circle><circle cx="3" cy="21" r="1.5"></circle></svg>`
	},
	{
		id: 'vectorracing',
		label: 'Vector Racing',
		description: 'Momentum racing. Adjust velocity ±1 each turn.',
		cardClass: 'vector-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Vector Racing Icon"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
	},
	{
		id: 'tracksofgalileo',
		label: 'Tracks of Galileo',
		description: 'Find the curve of fastest descent.',
		cardClass: 'galileo-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Tracks of Galileo Icon"><path d="M3 3v18h18"/><path d="M3 3c3 8 8 13 18 13"/><circle cx="12" cy="11.5" r="1.5"/></svg>`
	},
	{
		id: 'lunarlander',
		label: 'Lunar Lander',
		description: 'Land the module safely on the moon.',
		cardClass: 'lunar-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Lunar Lander Icon"><path d="M2 20h20"/><path d="M7 20l1-5h8l1 5"/><path d="M12 4v11"/><path d="M9 15h6"/><circle cx="12" cy="7" r="3"/></svg>`
	},
	{
		id: 'epidemicsim',
		label: 'Pandemic',
		description: 'Visualize the spread of viruses through a population.',
		cardClass: 'epidemic-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Pandemic Icon"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`
	},
	{
		id: 'lasermaze',
		label: 'Laser Maze',
		description: 'Arrange mirrors and blocks to reflect the laser into the target.',
		cardClass: 'laser-card',
		updated: '2026-05-16',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Laser Maze Icon"><path d="M3 21h18"/><path d="M4 4l8 8"/><path d="M12 12l8-8"/><path d="M7 4h4v4"/><path d="M17 20h3v-3"/></svg>`
	},
	{
		id: 'blockdude',
		label: 'Block Dude',
		description: 'Classic calculator puzzle. Stack blocks to reach the exit.',
		cardClass: 'blockdude-card',
		updated: '2026-05-16',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Block Dude Icon"><rect x="3" y="14" width="6" height="6" rx="1"/><rect x="15" y="14" width="6" height="6" rx="1"/><rect x="9" y="8" width="6" height="6" rx="1"/><path d="M12 8V2"/><path d="M9 2h6"/></svg>`
	},
	{
		id: 'lemonadestand',
		label: 'Lemonade Stand',
		description: 'Run your own lemonade business. Manage inventory, set prices, and deal with weather.',
		cardClass: 'lemonade-card',
		updated: '2026-05-16',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Lemonade Stand Icon"><path d="M3 10h18"/><path d="M5 10l2 10h10l2-10"/><path d="M9 6h6"/><path d="M12 6V3"/></svg>`
	},
	{
		id: 'apexindustries',
		label: 'Apex Industries',
		description: 'Manage your factory, buy machines, hire workers, and maximize profits.',
		cardClass: 'apex-card',
		updated: '2026-05-16',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Apex Industries Icon"><path d="M3 20h18"/><rect x="5" y="10" width="4" height="10"/><rect x="10" y="6" width="4" height="14"/><rect x="15" y="12" width="4" height="8"/></svg>`
	},
	{
		id: 'arithmetic',
		label: 'Arithmetic',
		description: 'Timed speed drills for +, −, ×, ÷, and mixed mental math.',
		cardClass: 'arithmetic-card',
		updated: '2026-11-25',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Arithmetic Icon"><line x1="7" y1="4" x2="7" y2="10"/><line x1="4" y1="7" x2="10" y2="7"/><line x1="14" y1="7" x2="20" y2="7"/><line x1="5" y1="15" x2="9" y2="19"/><line x1="9" y1="15" x2="5" y2="19"/><line x1="14" y1="17" x2="20" y2="17"/><circle cx="17" cy="14" r="0.8" fill="currentColor"/><circle cx="17" cy="20" r="0.8" fill="currentColor"/></svg>`
	},
	{
		id: 'calculus',
		label: 'Calculus',
		description: 'Derivatives, integrals, and limits in fast-paced drills.',
		cardClass: 'calculus-card',
		updated: '2026-11-25',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Calculus Icon"><path d="M16 4c-2 0-3 1.5-3 4v8c0 2.5-1 4-3 4"/><path d="M9 12h6"/></svg>`
	},
	{
		id: 'trig',
		label: 'Trigonometry',
		description: 'Unit circle values, radians, and trig identities.',
		cardClass: 'trig-card',
		updated: '2026-11-25',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Trigonometry Icon"><circle cx="12" cy="12" r="9"/><path d="M12 12l6.5-4.5"/><path d="M12 12h9"/></svg>`
	},
	{
		id: 'kakuro',
		label: 'Kakuro',
		description: 'Cross-sum number puzzle. Fill every run to match its clue.',
		cardClass: 'kakuro-card',
		updated: '2026-11-25',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Kakuro Icon"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="3" x2="12" y2="12"/></svg>`
	}
];

export const gameCategories = [
	{
		name: 'Puzzles',
		slug: 'puzzles',
		hubTitle: 'Online Math Puzzles – Free Logic & Brain Games',
		hubDescription: 'Play free online math puzzles including Kakuro, Tower of Hanoi, Sliding Tiles (15-Puzzle), Peg Solitaire, Knight’s Tour, and Ice Slider.',
		hubIntro: 'Sharpen your logical reasoning, recursion, and spatial planning with classic single-player logic puzzles. Every puzzle runs free in your browser with no downloads.',
		delay: 200,
		gameIds: ['sliding-tiles', 'pegboard', 'hanoi', 'knights-tour', 'iceslider', 'kakuro']
	},
	{
		name: 'Abstract Games',
		slug: 'strategy',
		hubTitle: 'Abstract Strategy Games Online – Free Math & Logic Games',
		hubDescription: 'Play free abstract strategy games online including Block Dude, Dots & Boxes, Nim, Hex, and SET.',
		hubIntro: 'Explore combinatorial game theory, spatial planning, and pattern recognition with classic strategy games and calculator favorites.',
		delay: 400,
		gameIds: ['dotsandboxes', 'nim', 'hex', 'set', 'blockdude']
	},
	{
		name: 'Physics',
		slug: 'physics',
		hubTitle: 'Interactive Physics Games Online – Free Simulations & Puzzles',
		hubDescription: 'Play free physics games and simulations online: Lunar Lander, Laser Maze, ShotSim projectile physics, Tracks of Galileo, and Vector Racing.',
		hubIntro: 'Experiment with gravity, optics, parabolic trajectories, momentum, and brachistochrone curves in interactive browser simulations.',
		delay: 600,
		gameIds: ['shotsim', 'tracksofgalileo', 'lunarlander', 'vectorracing', 'lasermaze']
	},
	{
		name: 'Simulations',
		slug: 'business',
		hubTitle: 'Online Simulation Games – Free Business, Economics & Science Sims',
		hubDescription: 'Play free simulation games online including Lemonade Stand, Apex Industries, and Pandemic.',
		hubIntro: 'Practice microeconomics, supply and demand, pricing strategy, profit margin math, and SIR pandemic modeling in interactive browser simulations.',
		delay: 800,
		gameIds: ['lemonadestand', 'apexindustries', 'epidemicsim']
	},
	{
		name: 'Math',
		slug: 'math',
		hubTitle: 'Math Games Online – Arithmetic, Krypto, Calculus & Trigonometry',
		hubDescription: 'Practice math online free: Arithmetic speed drills (+, −, ×, ÷), Krypto, Calculus (derivatives, integrals, limits), and Trigonometry.',
		hubIntro: 'Sharpen your math skills from foundational arithmetic and Krypto to unit-circle trigonometry and calculus drills.',
		delay: 1000,
		gameIds: ['arithmetic', 'krypto', 'calculus', 'trig']
	}
];

export const specialHubs = [
	{
		name: 'Classic Calculator & Retro Games',
		slug: 'classic-calculator-games',
		hubTitle: 'Classic Calculator & Retro Math Games Online Free',
		hubDescription: 'Play classic TI-83/TI-84 calculator games and retro math classics online free, including Block Dude, Lemonade Stand, Lunar Lander, and Tower of Hanoi.',
		hubIntro: 'Relive the golden age of graphing-calculator and classroom computer games. Play Block Dude, Lemonade Stand, Lunar Lander, and more directly in your browser—no emulator or downloads required.',
		gameIds: ['blockdude', 'lemonadestand', 'lunarlander', 'hanoi', 'krypto', 'sliding-tiles', 'dotsandboxes']
	}
];

export const allHubs = [
	...gameCategories.map(({ name, slug, hubTitle, hubDescription, hubIntro, gameIds }) => ({
		name,
		slug,
		hubTitle,
		hubDescription,
		hubIntro,
		gameIds
	})),
	...specialHubs
];

export function getHubBySlug(slug: string) {
	const hub = allHubs.find(h => h.slug === slug);
	if (!hub) return null;
	return {
		...hub,
		games: hub.gameIds
			.map(id => getGameById(id))
			.filter((game): game is NonNullable<ReturnType<typeof getGameById>> => Boolean(game))
	};
}

const playAnchorOverrides: Record<string, string> = {
	hanoi: 'Play Tower of Hanoi',
	blockdude: 'Play Block Dude Online',
	lemonadestand: 'Play Lemonade Stand',
	lunarlander: 'Play Lunar Lander',
	krypto: 'Play Krypto Math Game',
	lasermaze: 'Play Laser Maze'
};

export function getPlayAnchorText(game: { id: string; label: string }) {
	return playAnchorOverrides[game.id] ?? `Play ${game.label}`;
}

export function getGameById(id: string) {
	return games.find(g => g.id === id);
}

export function getGamesByCategory() {
	return gameCategories.map(cat => ({
		...cat,
		games: cat.gameIds
			.map(id => getGameById(id))
			.filter((game): game is NonNullable<ReturnType<typeof getGameById>> => Boolean(game))
	}));
}

export function getCategoryByGameId(id: string) {
	const cat = gameCategories.find(c => c.gameIds.includes(id));
	if (!cat) return null;
	return {
		...cat,
		games: cat.gameIds
			.map(gId => getGameById(gId))
			.filter((game): game is NonNullable<ReturnType<typeof getGameById>> => Boolean(game))
	};
}
