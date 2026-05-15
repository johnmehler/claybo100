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
		label: 'Epidemic Sim', 
		description: 'Visualize the spread of viruses through a population.',
		cardClass: 'epidemic-card',
		updated: '2026-05-15',
		icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Epidemic Sim Icon"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>` 
	}
];

export const gameCategories = [
	{
		name: 'Puzzles',
		delay: 200,
		gameIds: ['sliding-tiles', 'pegboard', 'hanoi', 'knights-tour', 'set', 'iceslider', 'krypto']
	},
	{
		name: 'Abstract Games',
		delay: 400,
		gameIds: ['dotsandboxes', 'nim', 'hex', 'vectorracing']
	},
	{
		name: 'Physics & Sims',
		delay: 600,
		gameIds: ['shotsim', 'tracksofgalileo', 'lunarlander', 'epidemicsim']
	}
];

export function getGameById(id: string) {
	return games.find(g => g.id === id);
}

export function getGamesByCategory() {
	return gameCategories.map(cat => ({
		...cat,
		games: cat.gameIds.map(id => getGameById(id)).filter(Boolean)
	}));
}
