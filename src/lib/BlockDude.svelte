<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const ROWS = 10;
	const COLS = 16;
	const PROGRESS_KEY = "blockdude-level-progress";
	const HOLD_MOVE_DELAY_MS = 140;
	const HOLD_REPEAT_MS = 110;

	type CellType = "empty" | "wall" | "block" | "exit";

	interface Level {
		name: string;
		grid: string[]; // ASCII representation for easy level design
	}

	const levels: Level[] = [
		{
			name: "Level 1",
			grid: [
				"####################",
				"#..................#",
				"#..................#",
				"#..................#",
				"#...#.......#......#",
				"#E..#...#.B.#.B.>..#",
				"####################"
			]
		},
		{
			name: "Level 2",
			grid: [
				".#....##........##....",
				".#................#...",
				"##.................#..",
				"#E..................#.",
				"##...................#",
				".#...........#..B....#",
				".#...........#B.BB<..#",
				".#####...#############",
				".....#..B#............",
				".....#####............"
			]
		},
		{
			name: "Level 3",
			grid: [
				".#.................",
				".#...#############.",
				"#.#.#.............#",
				"#..#..............#",
				"#................B#",
				"#...............BB#",
				"#.###....<...#B.##.",
				"#.#.#....#..#####..",
				"#.#.#BB.##..#......",
				"#E#.######.##......",
				"###.##...###......."
			]
		},
		{
			name: "Level 4",
			grid: [
				"..................#.....",
				".................#.#....",
				".......#........#...#...",
				"......#.#......#.....#..",
				"...###...#....#.......#.",
				"..#.......#..#.........#",
				".#.........##..........#",
				".#....................B#",
				".#...................BB#",
				".#...............<...###",
				"##....#..........#...#..",
				"#E....#.B........#####..",
				"#####.#.B...B..###......",
				"....#.#.B.#.#B.#........",
				"....#.##########........",
				"....###................."
			]
		},
		{
			name: "Level 5",
			grid: [
				".....###....#########.",
				".####...####.........#",
				"#....................#",
				"#....................#",
				"#....................#",
				"#.....#..............#",
				"#.....#..............#",
				"#.....#BBBB..........#",
				"#E...#######<........#",
				"##.###.....##.#.....B#",
				".#.#........#.##...BB#",
				".#.#........#.##..BBB#",
				".###........#.########",
				"............###......."
			]
		},
		{
			name: "Level 6",
			grid: [
				".###.............####",
				".#..#############...#",
				"##..................#",
				"#E..................#",
				"##..................#",
				".#................BB#",
				".#BB........#..B..###",
				".#BBB.......#<BBB.#..",
				".#BBBB......#####.#..",
				".#####....###...###..",
				".....#...B#..........",
				".....##.###..........",
				"......###............"
			]
		},
		{
			name: "Level 7",
			grid: [
				"..#...#####...##...###..",
				".#.#.#.....#.#..#.#...#.",
				".#..##......##...##....#",
				".#...#.......#....#....#",
				".#....................B#",
				".#....................B#",
				"##...................BB#",
				"#E...B...............###",
				"##...#.B.....#....##.#..",
				".#...#.B....##.B.<####..",
				".##..#.BBB..##.BBB#.....",
				"..#..######.#######.....",
				"..##.#....###...........",
				"...###.................."
			]
		},
		{
			name: "Level 8",
			grid: [
				".###..B.B..####...#######..",
				"#...#.BBB.#....#.#.......#.",
				"#....#B.B#.....##.........#",
				"#B....###....#.#.....###..#",
				"#BB.........##......##.#..#",
				"####.......##..........#E.#",
				"...##............##....##.#",
				"..#....B.#......#..#......#",
				"..#....B#.#....#...#......#",
				".#...###...#....#..#.....B#",
				".#......#.#......##.....BB#",
				"#........#...........######",
				"#............B............#",
				"#....B......###..........B#",
				"#...###.................BB#",
				"#........B......B...<..BBB#",
				"###########################"
			]
		},
		{
			name: "Level 9",
			grid: [
				"........###.........",
				".......#...#........",
				"......#.....#..#####",
				".....#.......##....#",
				"....#.....B........#",
				"...#......BB......B#",
				"..#.......###....BB#",
				".#............<.####",
				"#.............B....#",
				"#E...........###...#",
				"##....##...#......B#",
				".#....##B..##...####",
				".#....#######..##...",
				".###..#.....#.##....",
				"...#.##.....###.....",
				"...###.............."
			]
		},
		{
			name: "Level 10",
			grid: [
				"...#####################...",
				".##...........#.........#..",
				"####B.......BB#B........##.",
				"#..##..#...#####...###.##.#",
				"#...#..##........###.###..#",
				"#...##..##BBBB............#",
				"#E.......#######..........#",
				"##........#...###........##",
				".#.....B...#.#..##........#",
				".#.....#....#....##.......#",
				".####..##.............#####",
				"...#####......<...........#",
				"...#..........#...........#",
				"...#.........##....########",
				"...#........##...........#.",
				"...#..........B.........B#.",
				"...#B....###########...BB#.",
				"...#BB..##.........##.BBB#.",
				"...######...........######."
			]
		},
		{
			name: "Level 11",
			grid: [
				"#############################",
				"#..#...#....................#",
				"#.....B#BB............#####.#",
				"#B...###.B##.....B..##..E.#.#",
				"#BB....###...<..B.......#.#.#",
				"###..BB#.....#.B..........#.#",
				"#...####......#..###...###..#",
				"#B............#.#......#..B.#",
				"#BB.......###.#.#B....#..####",
				"####.B...###..#.##B..#.B.#..#",
				"#...........B.###..B#...#...#",
				"#...B.....BB.#...####.......#",
				"#....#########........#####.#",
				"#..............B...B##....#.#",
				"####...........B...#....BB#.#",
				"#B##...#....#..........####.#",
				"##B###.#....#...BBB.B.......#",
				"#B#B#B##....#........BBB....#",
				"#############################"
			]
		}
	];

	// State
	let currentLevelIndex = $state(0);
	let rows = $state(10);
	let cols = $state(16);
	let grid = $state(Array(10).fill(0).map(() => Array(16).fill('empty') as CellType[]));
	let playerPos = $state({ x: 0, y: 0 });
	let playerFacing = $state(1); // 1 for right, -1 for left
	let isCarrying = $state(false);
	let isWon = $state(false);
	let activeMoveDir: -1 | 1 | null = null;
	let holdMoveTimeout: ReturnType<typeof setTimeout> | null = null;
	let holdMoveInterval: ReturnType<typeof setInterval> | null = null;

	function saveProgress() {
		try {
			localStorage.setItem(PROGRESS_KEY, String(currentLevelIndex));
		} catch {
			// Ignore storage failures in private mode or restricted contexts.
		}
	}

	function getSavedProgress(): number {
		try {
			const raw = localStorage.getItem(PROGRESS_KEY);
			if (raw === null) return 0;
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed)) return 0;
			return Math.min(Math.max(parsed, 0), levels.length - 1);
		} catch {
			return 0;
		}
	}

	function clearDirectionalTimers() {
		if (holdMoveTimeout) {
			clearTimeout(holdMoveTimeout);
			holdMoveTimeout = null;
		}
		if (holdMoveInterval) {
			clearInterval(holdMoveInterval);
			holdMoveInterval = null;
		}
	}

	function loadLevel(idx: number) {
		const level = levels[idx];
		currentLevelIndex = idx;
		isWon = false;
		isCarrying = false;

		rows = level.grid.length;
		cols = level.grid[0].length;

		grid = Array(rows).fill(0).map((_, y) => {
			return Array(cols).fill(0).map((_, x) => {
				const char = level.grid[y][x];
				if (char === '<' || char === '>') {
					playerPos = { x, y };
					playerFacing = char === '>' ? 1 : -1;
					return 'empty';
				}
				if (char === '#') return 'wall';
				if (char === 'B') return 'block';
				if (char === 'E') return 'exit';
				return 'empty';
			});
		});

		applyGravity();
		saveProgress();
	}

	function applyGravity() {
		// Player gravity
		while (
			playerPos.y < rows - 1 &&
			(grid[playerPos.y + 1][playerPos.x] === 'empty' ||
				grid[playerPos.y + 1][playerPos.x] === 'exit')
		) {
			playerPos.y++;
		}

		if (grid[playerPos.y][playerPos.x] === 'exit') {
			isWon = true;
		}

		// Block gravity
		let moved = true;
		while (moved) {
			moved = false;
			for (let y = rows - 2; y >= 0; y--) {
				for (let x = 0; x < cols; x++) {
					if (grid[y][x] === 'block' && grid[y + 1][x] === 'empty') {
						if (playerPos.x === x && playerPos.y === y + 1) continue; // Don't crush player
						grid[y + 1][x] = 'block';
						grid[y][x] = 'empty';
						moved = true;
					}
				}
			}
		}
	}

	function move(dx: number) {
		if (isWon) return;
		const nextFacing = dx > 0 ? 1 : -1;
		if (playerFacing !== nextFacing) {
			playerFacing = nextFacing;
			return;
		}
		
		const nx = playerPos.x + dx;
		if (nx < 0 || nx >= cols) return;

		// Check if we can just walk
		if (
			grid[playerPos.y][nx] === "empty" ||
			grid[playerPos.y][nx] === "exit"
		) {
			// If carrying, check if the block clears
			if (isCarrying) {
				if (playerPos.y > 0 && grid[playerPos.y - 1][nx] === "empty") {
					playerPos.x = nx;
				}
			} else {
				playerPos.x = nx;
			}
		}
		// Check if we can climb
		else if (
			playerPos.y > 0 &&
			(grid[playerPos.y][nx] === "wall" ||
				grid[playerPos.y][nx] === "block")
		) {
			if (
				grid[playerPos.y - 1][nx] === "empty" ||
				grid[playerPos.y - 1][nx] === "exit"
			) {
				// Can't climb if block overhead
				if (isCarrying) {
					if (
						playerPos.y > 1 &&
						grid[playerPos.y - 2][nx] === "empty" &&
						grid[playerPos.y - 1][playerPos.x] === "empty"
					) {
						playerPos.x = nx;
						playerPos.y--;
					}
				} else {
					playerPos.x = nx;
					playerPos.y--;
				}
			}
		}

		if (grid[playerPos.y][playerPos.x] === "exit") {
			isWon = true;
		}

		applyGravity();
	}

	function action() {
		if (isWon) return;
		const tx = playerPos.x + playerFacing;
		if (tx < 0 || tx >= cols) return;

		if (isCarrying) {
			// Try to drop
			// Can drop in front if empty
			if (grid[playerPos.y][tx] === "empty") {
				grid[playerPos.y][tx] = "block";
				isCarrying = false;
			}
			// Or drop on top of something in front
			else if (
				playerPos.y > 0 &&
				grid[playerPos.y - 1][tx] === "empty" &&
				(grid[playerPos.y][tx] === "wall" ||
					grid[playerPos.y][tx] === "block")
			) {
				grid[playerPos.y - 1][tx] = "block";
				isCarrying = false;
			}
		} else {
			// Try to pick up
			// Must be a block in front with empty space above it and above player
			if (grid[playerPos.y][tx] === "block") {
				if (
					playerPos.y > 0 &&
					grid[playerPos.y - 1][tx] === "empty" &&
					grid[playerPos.y - 1][playerPos.x] === "empty"
				) {
					grid[playerPos.y][tx] = "empty";
					isCarrying = true;
				}
			}
			// Or a block one level higher? No, Block Dude requires it to be at feet level or same level.
			// Actually classic BD: if there's a block at your feet level in front, and empty space above it and above you.
		}
		applyGravity();
	}

	function startDirectionalHold(dx: -1 | 1) {
		if (activeMoveDir === dx) return;
		activeMoveDir = dx;
		clearDirectionalTimers();
		move(dx);
		holdMoveTimeout = setTimeout(() => {
			if (activeMoveDir !== dx) return;
			move(dx);
			holdMoveInterval = setInterval(() => {
				if (activeMoveDir !== dx) return;
				move(dx);
			}, HOLD_REPEAT_MS);
		}, HOLD_MOVE_DELAY_MS);
	}

	function stopDirectionalHold(dx?: -1 | 1) {
		if (dx !== undefined && activeMoveDir !== dx) return;
		activeMoveDir = null;
		clearDirectionalTimers();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			if (!e.repeat) startDirectionalHold(-1);
		}
		if (e.key === "ArrowRight") {
			e.preventDefault();
			if (!e.repeat) startDirectionalHold(1);
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!e.repeat) action();
		}
		if (e.key === "r" && !e.repeat) resetLevel();
		if (e.key === "n" && !e.repeat && isWon) nextLevel();
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.key === "ArrowLeft") stopDirectionalHold(-1);
		if (e.key === "ArrowRight") stopDirectionalHold(1);
	}

	function resetLevel() {
		loadLevel(currentLevelIndex);
	}

	function nextLevel() {
		if (currentLevelIndex < levels.length - 1) {
			loadLevel(currentLevelIndex + 1);
		} else {
			loadLevel(0);
		}
	}

	onMount(() => {
		loadLevel(getSavedProgress());
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		registerActions({
			restart: resetLevel,
			newShuffle: nextLevel,
		});
		return () => {
			stopDirectionalHold();
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	});
</script>

<div class="blockdude-container">
	<div class="header">
		<div class="level-badge">LEVEL {currentLevelIndex + 1}</div>
		<h1>Block Dude</h1>
		<p>{levels[currentLevelIndex].name}</p>
	</div>

	<div class="game-viewport">
		<div class="grid" style="--rows: {rows}; --cols: {cols}">
			{#each grid as row, y}
				{#each row as cell, x}
					<div class="cell {cell}">
						{#if x === playerPos.x && y === playerPos.y}
							<div
								class="player"
								class:facing-left={playerFacing === -1}
							>
								<div class="head">
									<div class="face-eye"></div>
								</div>
								<div class="body"></div>
								{#if isCarrying}
									<div class="held-block" in:scale></div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/each}
		</div>
	</div>

	<div class="controls">
		<div class="dpad">
			<button
				class="btn"
				onpointerdown={(e) => {
					e.preventDefault();
					startDirectionalHold(-1);
				}}
				onpointerup={() => stopDirectionalHold(-1)}
				onpointercancel={() => stopDirectionalHold(-1)}
				onpointerleave={() => stopDirectionalHold(-1)}
			>←</button
			>
			<button class="btn" onclick={action}>↓</button>
			<button
				class="btn"
				onpointerdown={(e) => {
					e.preventDefault();
					startDirectionalHold(1);
				}}
				onpointerup={() => stopDirectionalHold(1)}
				onpointercancel={() => stopDirectionalHold(1)}
				onpointerleave={() => stopDirectionalHold(1)}
			>→</button
			>
		</div>
		<p class="hint">Use Left/Right to move, Down to pick up/drop blocks.</p>
	</div>

	{#if isWon}
		<div class="win-overlay" in:fade>
			<div class="win-card" in:scale>
				<h2>Level Clear!</h2>
				<button class="next-btn" onclick={nextLevel}>Next Level</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.blockdude-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
		font-family: "Outfit", "Inter", sans-serif;
		background: #09090b;
		padding: 2rem;
		position: relative;
		overflow: hidden;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.level-badge {
		background: #3b82f6;
		color: white;
		font-weight: 900;
		font-size: 0.7rem;
		padding: 0.2rem 0.8rem;
		border-radius: 4px;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-size: 3rem;
		font-weight: 900;
		margin: 0;
		letter-spacing: -2px;
	}

	.game-viewport {
		background: #18181b;
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
	}

	.grid {
		display: grid;
		grid-template-rows: repeat(var(--rows), 1fr);
		grid-template-columns: repeat(var(--cols), 1fr);
		width: min(90vw, calc(var(--cols) * 40px));
		max-width: 800px;
		aspect-ratio: var(--cols) / var(--rows);
		gap: 2px;
	}

	.cell {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell.wall {
		background: #3f3f46;
		border-radius: 2px;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
	}

	.cell.block {
		background: #f59e0b;
		border-radius: 4px;
		border: 2px solid #b45309;
		box-shadow: 0 4px 0 #78350f;
	}

	.cell.exit {
		background: #10b981;
		border-radius: 4px 4px 0 0;
		box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell.exit::before {
		content: "";
		width: 56%;
		height: 72%;
		background: #064e3b;
		border-radius: 2px 2px 0 0;
		border: 1px solid rgba(255, 255, 255, 0.25);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.cell.exit::after {
		content: "";
		position: absolute;
		width: 10%;
		height: 10%;
		right: 30%;
		top: 54%;
		background: #fef08a;
		border-radius: 999px;
	}

	.player {
		position: absolute;
		width: 80%;
		height: 80%;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: transform 0.1s;
		z-index: 10;
	}

	.player.facing-left {
		transform: scaleX(-1);
	}

	.player .head {
		position: relative;
		width: 60%;
		height: 40%;
		background: #60a5fa;
		border-radius: 4px;
	}

	.player .face-eye {
		position: absolute;
		right: 22%;
		top: 38%;
		width: 18%;
		height: 18%;
		background: #0f172a;
		border-radius: 999px;
	}

	.player .body {
		width: 80%;
		height: 60%;
		background: #2563eb;
		border-radius: 4px 4px 2px 2px;
	}

	.held-block {
		position: absolute;
		top: -100%;
		width: 100%;
		height: 100%;
		background: #f59e0b;
		border: 2px solid #b45309;
		border-radius: 4px;
	}

	.controls {
		margin-top: 2rem;
		text-align: center;
	}

	.dpad {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 1rem 2rem;
		border-radius: 12px;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:hover {
		background: #3f3f46;
	}
	.btn.action {
		background: #3b82f6;
		border-color: #60a5fa;
		min-width: 120px;
	}
	.btn.action:hover {
		background: #2563eb;
	}

	.hint {
		font-size: 0.8rem;
		color: #52525b;
	}

	.win-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(10px);
	}

	.win-card {
		background: #18181b;
		padding: 3rem;
		border-radius: 2rem;
		text-align: center;
		border: 1px solid #27272a;
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
	}

	.win-card h2 {
		font-size: 2rem;
		margin-bottom: 2rem;
	}

	.next-btn {
		background: white;
		color: black;
		padding: 1rem 3rem;
		border-radius: 99px;
		font-weight: 900;
		border: none;
		cursor: pointer;
	}

	@media (max-width: 1024px) {
		.blockdude-container {
			padding: 0.75rem;
			height: 100%;
			min-height: 100%;
			justify-content: flex-start;
			overflow-y: auto;
		}

		.header {
			margin-bottom: 0.75rem;
		}

		h1 {
			font-size: 1.6rem;
			letter-spacing: -1px;
		}

		.game-viewport {
			width: 100%;
			max-width: 100%;
			padding: 0.6rem;
			box-sizing: border-box;
		}

		.grid {
			width: 100%;
			max-width: 100%;
		}

		.controls {
			margin-top: 0.85rem;
			width: 100%;
		}

		.dpad {
			gap: 0.6rem;
			margin-bottom: 0.65rem;
		}

		.btn {
			padding: 0.65rem 1rem;
			font-size: 1rem;
			min-width: 3rem;
		}

		.hint {
			font-size: 0.72rem;
			padding-bottom: 0.4rem;
		}
	}
</style>
