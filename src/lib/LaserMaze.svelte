<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	interface Props {
		registerActions: (actions: {
			restart: () => void;
			newShuffle: () => void;
		}) => void;
	}

	let { registerActions }: Props = $props();

	type Direction = "up" | "down" | "left" | "right";
	type CellType = "empty" | "blocker" | "mirror" | "source" | "target";

	interface Cell {
		type: CellType;
		rotation?: number; // 0 (/) or 90 (\)
		direction?: Direction; // For source
		fixed?: boolean;
	}

	const GRID_SIZE = 10;

	let grid: (Cell | null)[][] = $state(
		Array(GRID_SIZE)
			.fill(null)
			.map(() =>
				Array(GRID_SIZE)
					.fill(null)
					.map(() => ({ type: "empty" })),
			),
	);

	let laserPath: { x: number; y: number }[] = $state([]);
	let isWon = $state(false);
	let currentLevel = $state(0);
	let inventory = $state({ mirror0: 0, mirror90: 0 });
	let selectedReflector = $state<number | null>(null);

	const levels = [
		{
			source: { x: 0, y: 5, dir: "right" as Direction },
			target: { x: 9, y: 5 },
			blockers: [
				{ x: 5, y: 4 },
				{ x: 5, y: 5 },
				{ x: 5, y: 6 },
			],
			mirrors: [
				{ x: 3, y: 5, rotation: 0, fixed: true },
				{ x: 3, y: 2, rotation: 90, fixed: true },
				{ x: 7, y: 2, rotation: 180, fixed: true },
				{ x: 7, y: 5, rotation: 270, fixed: true },
			],
			inventory: { mirror0: 2, mirror90: 2 },
		},
		{
			source: { x: 2, y: 0, dir: "down" as Direction },
			target: { x: 8, y: 9 },
			blockers: [
				{ x: 2, y: 5 },
				{ x: 8, y: 4 },
				{ x: 5, y: 5 },
			],
			mirrors: [],
			inventory: { mirror0: 4, mirror90: 4 },
		},
		{
			source: { x: 0, y: 0, dir: "right" as Direction },
			target: { x: 5, y: 5 },
			blockers: [
				{ x: 3, y: 0 },
				{ x: 0, y: 3 },
				{ x: 7, y: 7 },
			],
			mirrors: [],
			inventory: { mirror0: 5, mirror90: 5 },
		},
	];

	function loadLevel(idx: number) {
		const level = levels[idx];
		isWon = false;
		selectedReflector = null;
		inventory = { ...level.inventory };
		
		grid = Array(GRID_SIZE)
			.fill(null)
			.map(() =>
				Array(GRID_SIZE)
					.fill(null)
					.map(() => ({ type: "empty" })),
			);

		grid[level.source.y][level.source.x] = {
			type: "source",
			direction: level.source.dir,
			fixed: true,
		};
		grid[level.target.y][level.target.x] = { type: "target", fixed: true };

		level.blockers.forEach((b) => {
			grid[b.y][b.x] = { type: "blocker", fixed: true };
		});

		level.mirrors.forEach((m) => {
			grid[m.y][m.x] = {
				type: "mirror",
				rotation: m.rotation,
				fixed: m.fixed,
			};
		});

		calculateLaser();
	}

	function calculateLaser() {
		const sourceCell = levels[currentLevel].source;
		let cx = sourceCell.x;
		let cy = sourceCell.y;
		let dir = sourceCell.dir;

		const path = [{ x: cx, y: cy }];
		const visited = new Set();

		isWon = false;

		while (true) {
			const key = `${cx},${cy},${dir}`;
			if (visited.has(key)) break; // Infinite loop protection
			visited.add(key);

			let nx = cx;
			let ny = cy;

			if (dir === "right") nx++;
			else if (dir === "left") nx--;
			else if (dir === "up") ny--;
			else if (dir === "down") ny++;

			if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
				// Out of bounds, but still show the last point if it's within one step
				// path.push({ x: nx, y: ny });
				break;
			}

			cx = nx;
			cy = ny;
			path.push({ x: cx, y: cy });

			const cell = grid[cy][cx];
			if (cell?.type === "blocker") break;
			if (cell?.type === "target") {
				isWon = true;
				break;
			}
			if (cell?.type === "mirror") {
				const rot = cell.rotation || 0;
				// Mirror logic:
				// 0 degrees: / (reflects right->up, down->left, up->right, left->down)
				// 90 degrees: \ (reflects right->down, up->left, down->right, left->up)
				// Simplified: diagonal mirrors.
				// Let's use 45 and 135 for / and \.

				if (rot === 0 || rot === 180) {
					// /
					if (dir === "right") dir = "up";
					else if (dir === "left") dir = "down";
					else if (dir === "up") dir = "right";
					else if (dir === "down") dir = "left";
				} else {
					// \
					if (dir === "right") dir = "down";
					else if (dir === "left") dir = "up";
					else if (dir === "up") dir = "left";
					else if (dir === "down") dir = "right";
				}
			}
		}
		laserPath = path;
	}

	function handleCellClick(x: number, y: number) {
		const cell = grid[y][x];
		
		if (cell?.type === "empty" && selectedReflector !== null) {
			// Place reflector
			const key = `mirror${selectedReflector}` as keyof typeof inventory;
			if (inventory[key] > 0) {
				grid[y][x] = {
					type: "mirror",
					rotation: selectedReflector,
					fixed: false,
				};
				inventory[key]--;
				calculateLaser();
			}
		} else if (cell?.type === "mirror" && !cell.fixed) {
			// Remove reflector
			const key = `mirror${cell.rotation}` as keyof typeof inventory;
			inventory[key]++;
			grid[y][x] = { type: "empty" };
			calculateLaser();
		}
	}

	function selectReflector(rotation: number) {
		if (selectedReflector === rotation) {
			selectedReflector = null;
		} else {
			selectedReflector = rotation;
		}
	}

	onMount(() => {
		loadLevel(0);
		registerActions({
			restart: () => loadLevel(currentLevel),
			newShuffle: () => {
				currentLevel = (currentLevel + 1) % levels.length;
				loadLevel(currentLevel);
			},
		});
	});

	function nextLevel() {
		currentLevel = (currentLevel + 1) % levels.length;
		loadLevel(currentLevel);
	}
</script>

<div class="lasermaze-container">
	<div class="game-header">
		<div class="level-badge">Level {currentLevel + 1}</div>
		<h1>Laser Maze</h1>
		<p>Place reflectors on the board to guide the laser to the target receptor.</p>
	</div>

	<div class="game-layout">
		<div class="inventory-bar">
			<h3>Reflectors</h3>
			<div class="inventory-items">
				<button 
					class="inventory-item" 
					class:active={selectedReflector === 0}
					onclick={() => selectReflector(0)}
				>
					<div class="mirror-preview m0"></div>
					<span class="count">{inventory.mirror0}</span>
				</button>
				<button 
					class="inventory-item" 
					class:active={selectedReflector === 90}
					onclick={() => selectReflector(90)}
				>
					<div class="mirror-preview m90"></div>
					<span class="count">{inventory.mirror90}</span>
				</button>
			</div>
			<div class="inventory-hint">
				{selectedReflector !== null ? "Click grid to place" : "Select a reflector"}
			</div>
		</div>

		<div class="grid-container">
			<div class="grid" style="--grid-size: {GRID_SIZE}">
				{#each Array(GRID_SIZE) as _, y}
					{#each Array(GRID_SIZE) as _, x}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="cell"
							class:clickable={(grid[y][x]?.type === "empty" && selectedReflector !== null) || (grid[y][x]?.type === "mirror" && !grid[y][x]?.fixed)}
							onclick={() => handleCellClick(x, y)}
						>
							{#if grid[y][x]?.type === "source"}
								<div class="source-icon {grid[y][x]?.direction}">
									<div class="laser-dot"></div>
								</div>
							{:else if grid[y][x]?.type === "target"}
								<div class="target-icon" class:active={isWon}>
									<div class="target-ring outer"></div>
									<div class="target-ring middle"></div>
									<div class="target-ring inner"></div>
									<div class="target-core"></div>
									<svg class="target-svg" viewBox="0 0 100 100">
										<circle cx="50" cy="50" r="45" class="target-path" />
										<path d="M50 5 L50 15 M95 50 L85 50 M50 95 L50 85 M5 50 L15 50" class="target-markers" />
									</svg>
								</div>
							{:else if grid[y][x]?.type === "blocker"}
								<div class="blocker-icon"></div>
							{:else if grid[y][x]?.type === "mirror"}
								<div
									class="mirror-icon"
									class:placed={!grid[y][x]?.fixed}
									style="transform: rotate({grid[y][x]
										?.rotation}deg)"
								>
									<div class="mirror-surface"></div>
								</div>
							{/if}
						</div>
					{/each}
				{/each}

				<svg class="laser-svg" viewBox="0 0 {GRID_SIZE} {GRID_SIZE}">
					{#if laserPath.length > 1}
						<polyline
							points={laserPath
								.map((p) => `${p.x + 0.5},${p.y + 0.5}`)
								.join(" ")}
							class="laser-line"
							class:won={isWon}
						/>
					{/if}
				</svg>
			</div>
		</div>
	</div>

	{#if isWon}
		<div class="win-overlay" in:fade>
			<div class="win-content" in:scale>
				<h2>Target Hit!</h2>
				<button onclick={nextLevel}>Next Level</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.lasermaze-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
		font-family: "Outfit", "Inter", sans-serif;
		padding: 2rem;
		position: relative;
		overflow: hidden;
	}

	.game-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.game-header h1 {
		font-size: 3.5rem;
		font-weight: 900;
		margin: 0.5rem 0;
		background: linear-gradient(135deg, #ff6e61 0%, #ff4d4d 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		letter-spacing: -0.05rem;
	}

	.level-badge {
		background: rgba(255, 110, 97, 0.2);
		color: #ff6e61;
		padding: 0.4rem 1.2rem;
		border-radius: 99px;
		font-size: 0.9rem;
		font-weight: 800;
		text-transform: uppercase;
		display: inline-block;
		border: 1px solid rgba(255, 110, 97, 0.3);
	}

	.game-layout {
		display: flex;
		gap: 3rem;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 1400px;
	}

	.inventory-bar {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 2rem;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 240px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}

	.inventory-bar h3 {
		margin: 0;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.2rem;
		color: rgba(255, 255, 255, 0.4);
		text-align: center;
	}

	.inventory-items {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.inventory-item {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1.5rem;
		padding: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		color: white;
	}

	.inventory-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: #ff6e61;
		transform: translateY(-2px);
	}

	.inventory-item.active {
		background: rgba(255, 110, 97, 0.15);
		border-color: #ff6e61;
		box-shadow: 0 0 20px rgba(255, 110, 97, 0.3);
	}

	.mirror-preview {
		width: 50px;
		height: 50px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.mirror-preview::before {
		content: "";
		position: absolute;
		width: 3px;
		height: 80%;
		background: #00f2fe;
		box-shadow: 0 0 15px #00f2fe;
		border-radius: 4px;
	}

	.mirror-preview.m0::before { transform: rotate(45deg); }
	.mirror-preview.m90::before { transform: rotate(-45deg); }

	.count {
		font-size: 2rem;
		font-weight: 900;
	}

	.inventory-hint {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.3);
		text-align: center;
		font-style: italic;
	}

	.grid-container {
		position: relative;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 0 50px 100px rgba(0, 0, 0, 0.8);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-size), 1fr);
		grid-template-rows: repeat(var(--grid-size), 1fr);
		gap: 8px;
		width: 75vmin;
		height: 75vmin;
		position: relative;
	}

	.cell {
		background: rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.cell.clickable:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		cursor: pointer;
		transform: scale(1.05);
		z-index: 5;
	}

	.source-icon {
		width: 70%;
		height: 70%;
		background: #000;
		border-radius: 8px;
		position: relative;
		border: 2px solid #ff6e61;
		box-shadow: 0 0 20px rgba(255, 110, 97, 0.5);
	}

	.source-icon.right::after {
		content: "";
		position: absolute;
		right: -10px;
		top: 50%;
		transform: translateY(-50%);
		border-left: 12px solid #ff6e61;
		border-top: 7px solid transparent;
		border-bottom: 7px solid transparent;
	}
	.source-icon.left::after {
		content: "";
		position: absolute;
		left: -10px;
		top: 50%;
		transform: translateY(-50%);
		border-right: 12px solid #ff6e61;
		border-top: 7px solid transparent;
		border-bottom: 7px solid transparent;
	}
	.source-icon.up::after {
		content: "";
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		border-bottom: 12px solid #ff6e61;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
	}
	.source-icon.down::after {
		content: "";
		position: absolute;
		bottom: -10px;
		left: 50%;
		transform: translateX(-50%);
		border-top: 12px solid #ff6e61;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
	}

	.laser-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 8px;
		background: #ff6e61;
		border-radius: 50%;
		box-shadow: 0 0 15px #ff6e61;
	}

	.target-icon {
		width: 90%;
		height: 90%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.target-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.5s;
	}

	.target-ring.outer { width: 95%; height: 95%; border-style: dashed; animation: spin 30s linear infinite; }
	.target-ring.middle { width: 70%; height: 70%; border-width: 2px; animation: spin 15s linear infinite reverse; }
	.target-ring.inner { width: 45%; height: 45%; border-style: dotted; animation: spin 8s linear infinite; }

	.target-core {
		width: 25%;
		height: 25%;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		transition: all 0.4s;
	}

	.target-svg {
		position: absolute;
		width: 100%;
		height: 100%;
		fill: none;
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 1;
		pointer-events: none;
	}

	.target-icon.active .target-ring { border-color: #ff6e61; box-shadow: 0 0 20px rgba(255, 110, 97, 0.3); }
	.target-icon.active .target-core { background: #ff6e61; box-shadow: 0 0 30px #ff6e61; transform: scale(1.2); }
	.target-icon.active .target-svg { stroke: #ff6e61; }

	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

	.blocker-icon {
		width: 85%;
		height: 85%;
		background: #050505;
		border: 1px solid #222;
		border-radius: 10px;
		background-image: 
			linear-gradient(45deg, #111 25%, transparent 25%),
			linear-gradient(-45deg, #111 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #111 75%),
			linear-gradient(-45deg, transparent 75%, #111 75%);
		background-size: 10px 10px;
		box-shadow: inset 0 0 20px black;
	}

	.mirror-icon {
		width: 95%;
		height: 95%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.mirror-icon.placed { filter: drop-shadow(0 0 15px rgba(0, 242, 254, 0.5)); }

	.mirror-surface {
		width: 4px;
		height: 90%;
		background: linear-gradient(to bottom, #00f2fe, #4facfe);
		box-shadow: 0 0 25px rgba(0, 242, 254, 0.9), inset 0 0 5px white;
		border-radius: 4px;
		transform: rotate(45deg);
	}

	.laser-svg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 10;
	}

	.laser-line {
		fill: none;
		stroke: #ff6e61;
		stroke-width: 0.15;
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: drop-shadow(0 0 10px #ff6e61);
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		animation: dash 1s linear forwards;
	}

	.laser-line.won { stroke-width: 0.2; filter: drop-shadow(0 0 15px #ff6e61); }

	@keyframes dash { to { stroke-dashoffset: 0; } }

	.win-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(15px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		border-radius: 3rem;
	}

	.win-content {
		text-align: center;
		background: #000;
		padding: 5rem;
		border-radius: 4rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 50px 150px rgba(0, 0, 0, 1);
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.win-content h2 {
		font-size: 4rem;
		margin: 0;
		background: linear-gradient(135deg, #ff6e61 0%, #ff4d4d 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		font-weight: 900;
		letter-spacing: -0.1rem;
	}

	.win-content button {
		background: linear-gradient(135deg, #ff6e61 0%, #ff4d4d 100%);
		color: white;
		border: none;
		padding: 1.5rem 4rem;
		font-size: 1.6rem;
		font-weight: 800;
		border-radius: 2rem;
		cursor: pointer;
		transition: all 0.3s;
		box-shadow: 0 15px 40px rgba(255, 110, 97, 0.4);
	}

	.win-content button:hover {
		transform: translateY(-5px) scale(1.05);
		box-shadow: 0 25px 50px rgba(255, 110, 97, 0.6);
	}
</style>
