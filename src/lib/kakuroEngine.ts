import rawPuzzleBank from './kakuroPuzzles.json';

export type KakuroDifficulty = 'easy' | 'med' | 'hard';

export interface KakuroClue {
	a?: number; // across clue (right)
	d?: number; // down clue (below)
}

export interface KakuroRun {
	dir: 'across' | 'down';
	r: number;
	c: number;
	cells: [number, number][];
	sum: number;
}

export interface KakuroPuzzle {
	size: number;
	clues: (KakuroClue | null)[][]; // non-null = black/clue cell, null = playable white cell
	sol: number[][]; // 0 for black cells, 1-9 for white cells
	runs: KakuroRun[];
}

const STARTER_CLUES: (KakuroClue | null)[][] = [
	[{}, { d: 16 }, { d: 17 }, {}, {}],
	[{ a: 17 }, null, null, { d: 7 }, {}],
	[{ a: 14 }, null, null, null, { d: 6 }],
	[{}, { a: 8 }, null, null, null],
	[{}, {}, { a: 7 }, null, null]
];

const STARTER_SOL: number[][] = [
	[0, 0, 0, 0, 0],
	[0, 9, 8, 0, 0],
	[0, 7, 6, 1, 0],
	[0, 0, 3, 4, 1],
	[0, 0, 0, 2, 5]
];

/**
 * Extracts all horizontal and vertical runs from a binary grid (0 = black, 1 = white).
 * Returns null if any run has length 1 or > 9, or if any white cell lacks both runs.
 */
export function extractRuns(grid: number[][]): Omit<KakuroRun, 'sum'>[] | null {
	const H = grid.length;
	const W = grid[0].length;
	const runs: Omit<KakuroRun, 'sum'>[] = [];
	const hasAcross = Array.from({ length: H }, () => Array(W).fill(false));
	const hasDown = Array.from({ length: H }, () => Array(W).fill(false));

	for (let r = 0; r < H; r++) {
		for (let c = 0; c < W; c++) {
			if (grid[r][c] !== 0) continue;

			if (c + 1 < W && grid[r][c + 1] === 1) {
				const cells: [number, number][] = [];
				let cc = c + 1;
				while (cc < W && grid[r][cc] === 1) {
					cells.push([r, cc]);
					hasAcross[r][cc] = true;
					cc++;
				}
				if (cells.length < 2 || cells.length > 9) return null;
				runs.push({ dir: 'across', r, c, cells });
			}

			if (r + 1 < H && grid[r + 1][c] === 1) {
				const cells: [number, number][] = [];
				let rr = r + 1;
				while (rr < H && grid[rr][c] === 1) {
					cells.push([rr, c]);
					hasDown[rr][c] = true;
					rr++;
				}
				if (cells.length < 2 || cells.length > 9) return null;
				runs.push({ dir: 'down', r, c, cells });
			}
		}
	}

	for (let r = 0; r < H; r++) {
		for (let c = 0; c < W; c++) {
			if (grid[r][c] === 1 && (!hasAcross[r][c] || !hasDown[r][c])) {
				return null;
			}
		}
	}

	return runs;
}

function buildPuzzleFromGridAndSol(
	cluesTemplate: (KakuroClue | null)[][],
	sol: number[][]
): KakuroPuzzle {
	const size = sol.length;
	const grid = cluesTemplate.map((row) => row.map((cell) => (cell === null ? 1 : 0)));
	const rawRuns = extractRuns(grid) ?? [];
	const clues: (KakuroClue | null)[][] = grid.map((row) =>
		row.map((v) => (v === 0 ? {} : null))
	);
	const runs: KakuroRun[] = rawRuns.map((run) => {
		const sum = run.cells.reduce((acc, [r, c]) => acc + sol[r][c], 0);
		const clueCell = clues[run.r][run.c]!;
		if (run.dir === 'across') clueCell.a = sum;
		else clueCell.d = sum;
		return { ...run, sum };
	});

	return { size, clues, sol, runs };
}

export const STARTER_PUZZLE: KakuroPuzzle = buildPuzzleFromGridAndSol(
	STARTER_CLUES,
	STARTER_SOL
);

type RawPuzzleEntry = {
	size: number;
	clues: (KakuroClue | null)[][];
	sol: number[][];
};

export const PUZZLE_BANK: Record<KakuroDifficulty, KakuroPuzzle[]> = {
	easy: (rawPuzzleBank as Record<KakuroDifficulty, RawPuzzleEntry[]>).easy.map((p) =>
		buildPuzzleFromGridAndSol(p.clues, p.sol)
	),
	med: (rawPuzzleBank as Record<KakuroDifficulty, RawPuzzleEntry[]>).med.map((p) =>
		buildPuzzleFromGridAndSol(p.clues, p.sol)
	),
	hard: (rawPuzzleBank as Record<KakuroDifficulty, RawPuzzleEntry[]>).hard.map((p) =>
		buildPuzzleFromGridAndSol(p.clues, p.sol)
	)
};

// Structured Kakuro templates (0 = black, 1 = white) with run lengths 2-4 for fast unique generation
const TEMPLATES: Record<KakuroDifficulty, number[][][]> = {
	easy: [
		[
			[0, 0, 0, 0, 0],
			[0, 1, 1, 0, 0],
			[0, 1, 1, 1, 0],
			[0, 0, 1, 1, 1],
			[0, 0, 0, 1, 1]
		],
		[
			[0, 0, 0, 0, 0],
			[0, 1, 1, 1, 0],
			[0, 1, 1, 1, 1],
			[0, 1, 1, 1, 1],
			[0, 0, 1, 1, 0]
		]
	],
	med: [
		[
			[0, 0, 0, 0, 0, 0],
			[0, 1, 1, 0, 1, 1],
			[0, 1, 1, 1, 1, 1],
			[0, 0, 1, 1, 0, 0],
			[0, 1, 1, 1, 1, 1],
			[0, 1, 1, 0, 1, 1]
		],
		[
			[0, 0, 0, 0, 0, 0],
			[0, 1, 1, 1, 0, 0],
			[0, 1, 1, 1, 1, 0],
			[0, 0, 1, 1, 1, 1],
			[0, 0, 1, 1, 1, 1],
			[0, 0, 0, 1, 1, 0]
		]
	],
	hard: [
		[
			[0, 0, 0, 0, 0, 0, 0],
			[0, 1, 1, 0, 0, 1, 1],
			[0, 1, 1, 1, 0, 1, 1],
			[0, 0, 1, 1, 1, 1, 0],
			[0, 0, 1, 1, 1, 1, 0],
			[0, 1, 1, 0, 1, 1, 1],
			[0, 1, 1, 0, 0, 1, 1]
		],
		[
			[0, 0, 0, 0, 0, 0, 0],
			[0, 1, 1, 1, 0, 1, 1],
			[0, 1, 1, 1, 1, 1, 1],
			[0, 1, 1, 0, 1, 1, 0],
			[0, 0, 1, 1, 0, 1, 1],
			[0, 1, 1, 1, 1, 1, 1],
			[0, 1, 1, 0, 1, 1, 1]
		]
	]
};

function countSolutions(
	size: number,
	grid: number[][],
	runs: Omit<KakuroRun, 'sum'>[],
	sums: number[],
	limit = 2
): number {
	const cellRuns: number[][][] = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => [])
	);
	const whites: [number, number][] = [];
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (grid[r][c] === 1) whites.push([r, c]);
		}
	}
	runs.forEach((run, idx) => {
		for (const [r, c] of run.cells) cellRuns[r][c].push(idx);
	});

	const runUsed = new Int32Array(runs.length);
	const runRemSum = Int32Array.from(sums);
	const runRemLen = Int32Array.from(runs, (r) => r.cells.length);
	const board = Array.from({ length: size }, () => new Int32Array(size));
	let solutions = 0;

	function minMaxPossible(mask: number, k: number): [number, number] | null {
		let min = 0;
		let cnt = 0;
		for (let d = 1; d <= 9 && cnt < k; d++) {
			if (!(mask & (1 << d))) {
				min += d;
				cnt++;
			}
		}
		if (cnt < k) return null;
		let max = 0;
		cnt = 0;
		for (let d = 9; d >= 1 && cnt < k; d--) {
			if (!(mask & (1 << d))) {
				max += d;
				cnt++;
			}
		}
		return [min, max];
	}

	function solve(): void {
		if (solutions >= limit) return;
		let bestCell = -1;
		let bestCands: number[] | null = null;

		for (let i = 0; i < whites.length; i++) {
			const [r, c] = whites[i];
			if (board[r][c] !== 0) continue;
			const [r1, r2] = cellRuns[r][c];
			const used = runUsed[r1] | runUsed[r2];
			const cands: number[] = [];

			for (let d = 1; d <= 9; d++) {
				if (used & (1 << d)) continue;
				const rem1 = runRemSum[r1] - d;
				const len1 = runRemLen[r1] - 1;
				if (rem1 < 0 || (len1 === 0 && rem1 !== 0)) continue;
				if (len1 > 0) {
					const mm1 = minMaxPossible(runUsed[r1] | (1 << d), len1);
					if (!mm1 || rem1 < mm1[0] || rem1 > mm1[1]) continue;
				}
				const rem2 = runRemSum[r2] - d;
				const len2 = runRemLen[r2] - 1;
				if (rem2 < 0 || (len2 === 0 && rem2 !== 0)) continue;
				if (len2 > 0) {
					const mm2 = minMaxPossible(runUsed[r2] | (1 << d), len2);
					if (!mm2 || rem2 < mm2[0] || rem2 > mm2[1]) continue;
				}
				cands.push(d);
			}

			if (cands.length === 0) return;
			if (!bestCands || cands.length < bestCands.length) {
				bestCands = cands;
				bestCell = i;
				if (cands.length === 1) break;
			}
		}

		if (bestCell === -1) {
			solutions++;
			return;
		}

		const [r, c] = whites[bestCell];
		const [r1, r2] = cellRuns[r][c];
		for (const d of bestCands!) {
			board[r][c] = d;
			runUsed[r1] |= 1 << d;
			runRemSum[r1] -= d;
			runRemLen[r1]--;
			runUsed[r2] |= 1 << d;
			runRemSum[r2] -= d;
			runRemLen[r2]--;
			solve();
			runUsed[r1] &= ~(1 << d);
			runRemSum[r1] += d;
			runRemLen[r1]++;
			runUsed[r2] &= ~(1 << d);
			runRemSum[r2] += d;
			runRemLen[r2]++;
			board[r][c] = 0;
			if (solutions >= limit) return;
		}
	}

	solve();
	return solutions;
}

/**
 * Generates a uniquely-solvable Kakuro puzzle for the given difficulty.
 * Falls back to a puzzle from PUZZLE_BANK[difficulty] if the attempt budget is reached.
 */
export function generateKakuroPuzzle(difficulty: KakuroDifficulty): KakuroPuzzle {
	const templates = TEMPLATES[difficulty];

	for (let attempt = 0; attempt < 3000; attempt++) {
		const grid = templates[Math.floor(Math.random() * templates.length)];
		const size = grid.length;
		const rawRuns = extractRuns(grid);
		if (!rawRuns) continue;

		const cellRuns: number[][][] = Array.from({ length: size }, () =>
			Array.from({ length: size }, () => [])
		);
		rawRuns.forEach((run, idx) => {
			for (const [r, c] of run.cells) cellRuns[r][c].push(idx);
		});

		const whites: [number, number][] = [];
		for (let r = 1; r < size; r++) {
			for (let c = 1; c < size; c++) {
				if (grid[r][c] === 1) whites.push([r, c]);
			}
		}

		const sol = Array.from({ length: size }, () => Array(size).fill(0));
		const runUsed = new Int32Array(rawRuns.length);

		const fill = (idx: number): boolean => {
			if (idx === whites.length) return true;
			const [r, c] = whites[idx];
			const [r1, r2] = cellRuns[r][c];
			const used = runUsed[r1] | runUsed[r2];
			const cands: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (!(used & (1 << d))) cands.push(d);
			}
			for (let i = cands.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[cands[i], cands[j]] = [cands[j], cands[i]];
			}
			for (const d of cands) {
				sol[r][c] = d;
				runUsed[r1] |= 1 << d;
				runUsed[r2] |= 1 << d;
				if (fill(idx + 1)) return true;
				runUsed[r1] &= ~(1 << d);
				runUsed[r2] &= ~(1 << d);
				sol[r][c] = 0;
			}
			return false;
		};

		if (!fill(0)) continue;

		const sums = rawRuns.map((run) =>
			run.cells.reduce((acc, [r, c]) => acc + sol[r][c], 0)
		);

		if (countSolutions(size, grid, rawRuns, sums, 2) === 1) {
			const clues: (KakuroClue | null)[][] = grid.map((row) =>
				row.map((v) => (v === 0 ? {} : null))
			);
			const runs: KakuroRun[] = rawRuns.map((run, idx) => {
				const sum = sums[idx];
				const clueCell = clues[run.r][run.c]!;
				if (run.dir === 'across') clueCell.a = sum;
				else clueCell.d = sum;
				return { ...run, sum };
			});
			return { size, clues, sol, runs };
		}
	}

	const bank = PUZZLE_BANK[difficulty];
	if (bank.length > 0) {
		return bank[Math.floor(Math.random() * bank.length)];
	}
	return STARTER_PUZZLE;
}
