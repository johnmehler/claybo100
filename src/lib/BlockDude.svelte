<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const ROWS = 10;
	const COLS = 16;

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
	}

	function applyGravity() {
		// Player gravity
		while (playerPos.y < rows - 1 && grid[playerPos.y + 1][playerPos.x] === 'empty') {
			playerPos.y++;
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
		playerFacing = dx > 0 ? 1 : -1;
		
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

	function handleKey(e: KeyboardEvent) {
		if (e.key === "ArrowLeft") move(-1);
		if (e.key === "ArrowRight") move(1);
		if (e.key === "ArrowDown") {
			e.preventDefault();
			action();
		}
		if (e.key === "r") resetLevel();
		if (e.key === "n" && isWon) nextLevel();
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
		loadLevel(0);
		window.addEventListener("keydown", handleKey);
		registerActions({
			restart: resetLevel,
			newShuffle: nextLevel,
		});
		return () => window.removeEventListener("keydown", handleKey);
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
								<div class="head"></div>
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
			<button class="btn" onclick={() => move(-1)}>←</button>
			<button class="btn" onclick={action}>↓</button>
			<button class="btn" onclick={() => move(1)}>→</button>
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
		width: 60%;
		height: 40%;
		background: #60a5fa;
		border-radius: 4px;
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
</style>
