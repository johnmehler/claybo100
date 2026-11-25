export type TileType =
	| 'ice'
	| 'wall'
	| 'sticky'
	| 'pit'
	| 'bumper_slash'
	| 'bumper_backslash'
	| 'portal';

export interface Pos {
	x: number;
	y: number;
}

export interface Waypoint {
	x: number;
	y: number;
	kind: 'slide' | 'bounce' | 'warp' | 'stop';
}

export interface SlideResult {
	waypoints: Waypoint[];
	endPos: Pos;
	outcome: 'stop' | 'goal' | 'pit' | 'loop' | 'blocked';
}

export interface OptimalSolution {
	path: Pos[];
	dirs: Pos[];
	segments: Waypoint[][];
}

export type Difficulty = 'chill' | 'classic' | 'master';

export interface ParsedLevel {
	id: string;
	name: string;
	subtitle: string;
	size: number;
	grid: TileType[][];
	start: Pos;
	goal: Pos;
	portalPairs: Map<string, Pos>;
	portalColors: Map<string, number>;
	optimal: OptimalSolution;
}

interface RawLevelDef {
	id: string;
	name: string;
	subtitle: string;
	rows: string[];
}

const RAW_LEVELS: RawLevelDef[] = [
	{
		id: 'lvl-1',
		name: 'First Glide',
		subtitle: 'Slide until you hit a glacier wall',
		rows: [
			'.......',
			'.S...#.',
			'.......',
			'......#',
			'....#..',
			'.....G.',
			'.......'
		]
	},
	{
		id: 'lvl-2',
		name: 'Cornerstone',
		subtitle: 'Use walls to line up your final approach',
		rows: [
			'##......',
			'.S....#.',
			'........',
			'..#....#',
			'##......',
			'..#..#..',
			'......G.',
			'##.....#'
		]
	},
	{
		id: 'lvl-3',
		name: 'Pinball Ridge',
		subtitle: 'Plan backwards from the star',
		rows: [
			'...#..#.#',
			'.S......#',
			'...#.....',
			'.........',
			'.....##..',
			'###....#.',
			'........#',
			'.....#.G.',
			'#..#.....'
		]
	},
	{
		id: 'lvl-4',
		name: 'Snow Drift',
		subtitle: 'Snow pads stop you right on top of them',
		rows: [
			'...#..*..',
			'.S...#...',
			'.........',
			'..*......',
			'......*..',
			'##...#..#',
			'...*#....',
			'.....#.G.',
			'...#....#'
		]
	},
	{
		id: 'lvl-5',
		name: 'Thin Margin',
		subtitle: 'Avoid the dark meltwater pits',
		rows: [
			'.......##*',
			'.S#.......',
			'.~.~......',
			'..*.~..*#.',
			'.#........',
			'.........#',
			'...#......',
			'#.....*...',
			'..#..#..G#',
			'.~..#.....'
		]
	},
	{
		id: 'lvl-6',
		name: 'Frozen Lagoon',
		subtitle: 'Thread the needle between hazards',
		rows: [
			'##........',
			'.S...#....',
			'.#........',
			'.*....~...',
			'~.#....#..',
			'.....#...*',
			'.....#.#..',
			'#.*~#..#..',
			'........G#',
			'....#*~~..'
		]
	},
	{
		id: 'lvl-7',
		name: 'Prism Ricochet',
		subtitle: 'Angled crystal bumpers deflect you 90°',
		rows: [
			'...#....//.',
			'#S......##.',
			'..#...#....',
			'........*..',
			'../*....#~.',
			'#..........',
			'.......#...',
			'...#....#.#',
			'....#......',
			'\\\\~....*..G',
			'.#.........'
		]
	},
	{
		id: 'lvl-8',
		name: 'Mirror Hall',
		subtitle: 'Chain angled bounces in a single slide',
		rows: [
			'...*.......',
			'.S..*..#...',
			'#.\\\\...#~..',
			'...#..#.\\\\/',
			'....#..#...',
			'#...\\\\..##.',
			'.#..~....##',
			'..*#.....\\\\',
			'#..........',
			'..~......G.',
			'...........'
		]
	},
	{
		id: 'lvl-9',
		name: 'Glacier Optics',
		subtitle: 'Combine snow pads and crystal deflectors',
		rows: [
			'............',
			'.S..........',
			'\\\\..~.*#.*..',
			'./...#...*..',
			'./....##..~.',
			'#..........#',
			'.#...~.#....',
			'..~#...##.#.',
			'##.........#',
			'......#....#',
			'../.#.....G.',
			'....#*......'
		]
	},
	{
		id: 'lvl-10',
		name: 'Frost Warp',
		subtitle: 'Portals preserve your sliding momentum',
		rows: [
			'............',
			'.S.....1##..',
			'.##......#..',
			'..#..#......',
			'.##.*..1...~',
			'..........*.',
			'...*...###..',
			'.......~*...',
			'............',
			'...~.~.#....',
			'.#....#...G.',
			'.....#......'
		]
	},
	{
		id: 'lvl-11',
		name: 'Twin Vortex',
		subtitle: 'Two portal pairs, one optimal path',
		rows: [
			'...........*#',
			'.S#/.........',
			'#.........#..',
			'..#...#...2..',
			'.....\\\\......',
			'#....#.......',
			'..#.........*',
			'...~#...~....',
			'........\\\\.1#',
			'...~....#....',
			'.#...#.\\\\~#.#',
			'..2..1..##.G.',
			'..*.~.#.....*'
		]
	},
	{
		id: 'lvl-12',
		name: 'Absolute Zero',
		subtitle: 'Master every icy mechanic',
		rows: [
			'..#...#.......',
			'.S....#*.*....',
			'..##.#......~.',
			'#.......#.....',
			'.1#..........~',
			'..\\\\...*......',
			'....#~.~..#...',
			'....2....#....',
			'...#...*......',
			'../.#.....1/~#',
			'#.........#...',
			'#........#..2#',
			'.\\\\.##/*...#.G',
			'......#.......'
		]
	}
];

export function parseLevel(raw: RawLevelDef): ParsedLevel {
	const size = raw.rows.length;
	const grid: TileType[][] = Array.from({ length: size }, () =>
		Array<TileType>(size).fill('ice')
	);
	let start: Pos = { x: 1, y: 1 };
	let goal: Pos = { x: size - 2, y: size - 2 };
	const portalGroups = new Map<string, Pos[]>();

	for (let y = 0; y < size; y++) {
		const row = raw.rows[y];
		for (let x = 0; x < size; x++) {
			const ch = row[x] ?? '.';
			switch (ch) {
				case '#':
					grid[y][x] = 'wall';
					break;
				case '*':
					grid[y][x] = 'sticky';
					break;
				case '~':
					grid[y][x] = 'pit';
					break;
				case '/':
					grid[y][x] = 'bumper_slash';
					break;
				case '\\':
					grid[y][x] = 'bumper_backslash';
					break;
				case 'S':
					start = { x, y };
					break;
				case 'G':
					goal = { x, y };
					break;
				case '1':
				case '2':
				case '3': {
					grid[y][x] = 'portal';
					const list = portalGroups.get(ch) ?? [];
					list.push({ x, y });
					portalGroups.set(ch, list);
					break;
				}
				default:
					grid[y][x] = 'ice';
			}
		}
	}

	const portalPairs = new Map<string, Pos>();
	const portalColors = new Map<string, number>();
	let colorIdx = 0;
	for (const [, positions] of portalGroups) {
		if (positions.length === 2) {
			const [a, b] = positions;
			const keyA = `${a.x},${a.y}`;
			const keyB = `${b.x},${b.y}`;
			portalPairs.set(keyA, b);
			portalPairs.set(keyB, a);
			portalColors.set(keyA, colorIdx);
			portalColors.set(keyB, colorIdx);
			colorIdx++;
		}
	}

	const optimal = solveFrom(start, goal, grid, portalPairs) ?? {
		path: [],
		dirs: [],
		segments: []
	};

	return {
		id: raw.id,
		name: raw.name,
		subtitle: raw.subtitle,
		size,
		grid,
		start,
		goal,
		portalPairs,
		portalColors,
		optimal
	};
}

export function simulateSlide(
	startX: number,
	startY: number,
	dx: number,
	dy: number,
	grid: TileType[][],
	goal: Pos,
	portalPairs: Map<string, Pos>
): SlideResult {
	const size = grid.length;
	let x = startX;
	let y = startY;
	let curDx = dx;
	let curDy = dy;

	const waypoints: Waypoint[] = [{ x, y, kind: 'slide' }];
	const seen = new Set<string>();
	seen.add(`${x},${y},${curDx},${curDy}`);

	let steps = 0;
	const maxSteps = size * size * 4;

	while (steps < maxSteps) {
		steps++;
		const nx = x + curDx;
		const ny = y + curDy;

		// Out of bounds or hit a wall: stop at (x, y)
		if (nx < 0 || nx >= size || ny < 0 || ny >= size || grid[ny][nx] === 'wall') {
			if (x === startX && y === startY && waypoints.length === 1) {
				return { waypoints, endPos: { x, y }, outcome: 'blocked' };
			}
			waypoints[waypoints.length - 1] = { x, y, kind: 'stop' };
			return { waypoints, endPos: { x, y }, outcome: 'stop' };
		}

		x = nx;
		y = ny;

		// Goal reached
		if (x === goal.x && y === goal.y) {
			waypoints.push({ x, y, kind: 'stop' });
			return { waypoints, endPos: { x, y }, outcome: 'goal' };
		}

		const tile = grid[y][x];

		if (tile === 'pit') {
			waypoints.push({ x, y, kind: 'stop' });
			return { waypoints, endPos: { x, y }, outcome: 'pit' };
		}

		if (tile === 'sticky') {
			waypoints.push({ x, y, kind: 'stop' });
			return { waypoints, endPos: { x, y }, outcome: 'stop' };
		}

		if (tile === 'bumper_slash') {
			// '/' reflects (dx, dy) -> (-dy, -dx)
			waypoints.push({ x, y, kind: 'bounce' });
			const nextDx = -curDy;
			const nextDy = -curDx;
			curDx = nextDx;
			curDy = nextDy;
		} else if (tile === 'bumper_backslash') {
			// '\' reflects (dx, dy) -> (dy, dx)
			waypoints.push({ x, y, kind: 'bounce' });
			const nextDx = curDy;
			const nextDy = curDx;
			curDx = nextDx;
			curDy = nextDy;
		} else if (tile === 'portal') {
			const pair = portalPairs.get(`${x},${y}`);
			if (pair) {
				waypoints.push({ x, y, kind: 'warp' });
				x = pair.x;
				y = pair.y;
				waypoints.push({ x, y, kind: 'slide' });
			}
		}

		const stateKey = `${x},${y},${curDx},${curDy}`;
		if (seen.has(stateKey)) {
			return { waypoints, endPos: { x, y }, outcome: 'loop' };
		}
		seen.add(stateKey);
	}

	return { waypoints, endPos: { x, y }, outcome: 'loop' };
}

export function solveFrom(
	start: Pos,
	goal: Pos,
	grid: TileType[][],
	portalPairs: Map<string, Pos>
): OptimalSolution | null {
	if (start.x === goal.x && start.y === goal.y) {
		return { path: [start], dirs: [], segments: [] };
	}

	interface QueueNode {
		pos: Pos;
		path: Pos[];
		dirs: Pos[];
		segments: Waypoint[][];
	}

	const queue: QueueNode[] = [
		{ pos: start, path: [start], dirs: [], segments: [] }
	];
	const visited = new Set<string>();
	visited.add(`${start.x},${start.y}`);

	const dirs: Pos[] = [
		{ x: 0, y: -1 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: -1, y: 0 }
	];

	while (queue.length > 0) {
		const curr = queue.shift()!;

		for (const d of dirs) {
			const res = simulateSlide(
				curr.pos.x,
				curr.pos.y,
				d.x,
				d.y,
				grid,
				goal,
				portalPairs
			);

			if (res.outcome === 'blocked' || res.outcome === 'pit' || res.outcome === 'loop') {
				continue;
			}

			const nextPath = [...curr.path, res.endPos];
			const nextDirs = [...curr.dirs, d];
			const nextSegments = [...curr.segments, res.waypoints];

			if (res.outcome === 'goal') {
				return {
					path: nextPath,
					dirs: nextDirs,
					segments: nextSegments
				};
			}

			const key = `${res.endPos.x},${res.endPos.y}`;
			if (!visited.has(key)) {
				visited.add(key);
				queue.push({
					pos: res.endPos,
					path: nextPath,
					dirs: nextDirs,
					segments: nextSegments
				});
			}
		}
	}

	return null;
}

export function getCuratedLevels(): ParsedLevel[] {
	return RAW_LEVELS.map(parseLevel);
}

export function generateRandomLevel(difficulty: Difficulty): ParsedLevel {
	const config = {
		chill: { size: 9, walls: 12, sticky: 4, pits: 0, bumpers: 0, portals: 0, minMoves: 5 },
		classic: { size: 12, walls: 22, sticky: 6, pits: 4, bumpers: 2, portals: 0, minMoves: 7 },
		master: { size: 15, walls: 30, sticky: 8, pits: 6, bumpers: 5, portals: 2, minMoves: 9 }
	}[difficulty];

	const { size } = config;
	const corners: [Pos, Pos][] = [
		[{ x: 1, y: 1 }, { x: size - 2, y: size - 2 }],
		[{ x: size - 2, y: 1 }, { x: 1, y: size - 2 }],
		[{ x: 1, y: size - 2 }, { x: size - 2, y: 1 }],
		[{ x: size - 2, y: size - 2 }, { x: 1, y: 1 }]
	];

	for (let attempt = 0; attempt < 150; attempt++) {
		const [start, goal] = corners[Math.floor(Math.random() * corners.length)];
		const grid: TileType[][] = Array.from({ length: size }, () =>
			Array<TileType>(size).fill('ice')
		);
		const portalPairs = new Map<string, Pos>();
		const portalColors = new Map<string, number>();

		const placeRandom = (tile: TileType, count: number) => {
			let placed = 0;
			let tries = 0;
			while (placed < count && tries < count * 10) {
				tries++;
				const x = Math.floor(Math.random() * size);
				const y = Math.floor(Math.random() * size);
				if ((x === start.x && y === start.y) || (x === goal.x && y === goal.y)) continue;
				if (grid[y][x] !== 'ice') continue;
				grid[y][x] = tile;
				placed++;
			}
		};

		placeRandom('wall', config.walls + Math.floor(Math.random() * 5));
		placeRandom('sticky', config.sticky + Math.floor(Math.random() * 3));
		placeRandom('pit', config.pits);

		for (let i = 0; i < config.bumpers; i++) {
			placeRandom(Math.random() < 0.5 ? 'bumper_slash' : 'bumper_backslash', 1);
		}

		for (let p = 0; p < config.portals; p++) {
			const positions: Pos[] = [];
			let tries = 0;
			while (positions.length < 2 && tries < 40) {
				tries++;
				const x = 1 + Math.floor(Math.random() * (size - 2));
				const y = 1 + Math.floor(Math.random() * (size - 2));
				if ((x === start.x && y === start.y) || (x === goal.x && y === goal.y)) continue;
				if (grid[y][x] !== 'ice') continue;
				grid[y][x] = 'portal';
				positions.push({ x, y });
			}
			if (positions.length === 2) {
				const [a, b] = positions;
				const kA = `${a.x},${a.y}`;
				const kB = `${b.x},${b.y}`;
				portalPairs.set(kA, b);
				portalPairs.set(kB, a);
				portalColors.set(kA, p);
				portalColors.set(kB, p);
			} else {
				for (const pos of positions) {
					grid[pos.y][pos.x] = 'ice';
				}
			}
		}

		const optimal = solveFrom(start, goal, grid, portalPairs);
		if (optimal && optimal.dirs.length >= config.minMoves) {
			return {
				id: `random-${difficulty}-${Date.now()}`,
				name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Glacier`,
				subtitle: `Procedural ${size}×${size} puzzle`,
				size,
				grid,
				start,
				goal,
				portalPairs,
				portalColors,
				optimal
			};
		}
	}

	// Guaranteed fallback: return a curated level matching difficulty
	const curated = getCuratedLevels();
	return difficulty === 'chill' ? curated[2] : difficulty === 'classic' ? curated[6] : curated[11];
}
