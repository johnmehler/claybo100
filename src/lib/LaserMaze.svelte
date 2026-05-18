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
	type CellType = "empty" | "blocker" | "mirror" | "source" | "target" | "splitter" | "filter" | "prism";
	type Color = "red" | "green" | "blue" | "white";

	interface Cell {
		type: CellType;
		rotation?: number; // 0, 90, 180, 270
		direction?: Direction; // For source
		color?: Color; // For source, filter, prism
		requirement?: Color; // For target, gate
		fixed?: boolean;
	}

	const GRID_SIZE = 10;

	interface LaserSegment {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		color: Color;
	}

	let grid: (Cell | null)[][] = $state(
		Array(GRID_SIZE)
			.fill(null)
			.map(() =>
				Array(GRID_SIZE)
					.fill(null)
					.map(() => ({ type: "empty" })),
			),
	);

	let laserSegments: LaserSegment[] = $state([]);
	let hitTargets: Set<string> = $state(new Set());
	let isWon = $state(false);
	let currentLevel: number | "procedural" = $state(0);
	let inventory = $state({ mirror0: 0, mirror90: 0, splitter0: 0, splitter90: 0 });
	let selectedReflector = $state<{ type: CellType; rotation: number } | null>(null);

	const levels = [
		{
			// Level 1: Introduction to Splitting
			source: { x: 0, y: 5, dir: "right" as Direction, color: "white" as Color },
			targets: [{ x: 9, y: 1 }, { x: 9, y: 9 }],
			blockers: [
				{ x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
				{ x: 9, y: 5 }
			],
			inventory: { mirror0: 2, mirror90: 2, splitter0: 1, splitter90: 1 },
		},
		{
			// Level 2: Color Shifting (Prism)
			source: { x: 0, y: 0, dir: "right" as Direction, color: "red" as Color },
			targets: [{ x: 9, y: 9, requirement: "blue" as Color }],
			blockers: [
				{ x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 },
				{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }
			],
			prism: { x: 5, y: 0, color: "blue" as Color },
			inventory: { mirror0: 3, mirror90: 3, splitter0: 0, splitter90: 0 },
		},
		{
			// Level 3: Dual Color Requirement
			source: { x: 5, y: 0, dir: "down" as Direction, color: "white" as Color },
			targets: [
				{ x: 1, y: 8, requirement: "red" as Color }, 
				{ x: 8, y: 8, requirement: "green" as Color }
			],
			blockers: [
				{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 5 }
			],
			prisms: [
				{ x: 2, y: 2, color: "red" as Color },
				{ x: 7, y: 2, color: "green" as Color }
			],
			inventory: { mirror0: 2, mirror90: 2, splitter0: 1, splitter90: 0 },
		},
		{
			// Level 4: The Branching Maze
			source: { x: 0, y: 2, dir: "right" as Direction, color: "white" as Color },
			targets: [
				{ x: 9, y: 0 }, { x: 9, y: 4 }, { x: 9, y: 8 }
			],
			blockers: [
				{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 4 },
				{ x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 9 }
			],
			inventory: { mirror0: 4, mirror90: 4, splitter0: 2, splitter90: 2 },
		},
		{
			// Level 5: The Spectrum Challenge
			source: { x: 5, y: 5, dir: "up" as Direction, color: "white" as Color },
			targets: [
				{ x: 0, y: 0, requirement: "red" as Color },
				{ x: 9, y: 0, requirement: "green" as Color },
				{ x: 0, y: 9, requirement: "blue" as Color },
				{ x: 9, y: 9, requirement: "red" as Color }
			],
			prisms: [
				{ x: 2, y: 5, color: "red" as Color },
				{ x: 7, y: 5, color: "green" as Color },
				{ x: 5, y: 2, color: "blue" as Color },
				{ x: 5, y: 7, color: "red" as Color }
			],
			blockers: [
				{ x: 1, y: 1 }, { x: 8, y: 1 }, { x: 1, y: 8 }, { x: 8, y: 8 }
			],
			inventory: { mirror0: 5, mirror90: 5, splitter0: 3, splitter90: 3 },
		}
	];

	function loadLevel(idx: number | "procedural") {
		isWon = false;
		selectedReflector = null;
		hitTargets = new Set();
		
		if (idx === "procedural") {
			generateProceduralLevel();
			return;
		}

		const level = levels[idx];
		inventory = { 
			mirror0: level.inventory.mirror0 || 0, 
			mirror90: level.inventory.mirror90 || 0,
			splitter0: level.inventory.splitter0 || 0,
			splitter90: level.inventory.splitter90 || 0
		};
		
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
			color: level.source.color,
			fixed: true,
		};

		level.targets.forEach((t) => {
			grid[t.y][t.x] = { 
				type: "target", 
				requirement: t.requirement || "white",
				fixed: true 
			};
		});

		level.blockers.forEach((b) => {
			grid[b.y][b.x] = { type: "blocker", fixed: true };
		});

		if ((level as any).prism) {
			const p = (level as any).prism;
			grid[p.y][p.x] = { type: "prism", color: p.color, fixed: true };
		}
		if ((level as any).prisms) {
			(level as any).prisms.forEach((p: any) => {
				grid[p.y][p.x] = { type: "prism", color: p.color, fixed: true };
			});
		}

		calculateLaser();
	}

	function generateProceduralLevel() {
		const MIN_COMPONENTS = 3;
		let attempts = 0;
		
		while (attempts < 100) {
			attempts++;
			grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({ type: "empty" })));
			
			const side = Math.floor(Math.random() * 4);
			let sx = 0, sy = 0, sdir: Direction = "right";
			if (side === 0) { sx = 0; sy = Math.floor(Math.random() * GRID_SIZE); sdir = "right"; }
			else if (side === 1) { sx = GRID_SIZE - 1; sy = Math.floor(Math.random() * GRID_SIZE); sdir = "left"; }
			else if (side === 2) { sx = Math.floor(Math.random() * GRID_SIZE); sy = 0; sdir = "down"; }
			else { sx = Math.floor(Math.random() * GRID_SIZE); sy = GRID_SIZE - 1; sdir = "up"; }

			grid[sy][sx] = { type: "source", direction: sdir, color: "white", fixed: true };

			const queue: { x: number; y: number; dir: Direction; isInitial: boolean }[] = [{ x: sx, y: sy, dir: sdir, isInitial: true }];
			const usedInventory = { mirror0: 0, mirror90: 0, splitter0: 0, splitter90: 0 };
			const targets: { x: number; y: number }[] = [];
			const pathCells = new Set<string>();
			pathCells.add(`${sx},${sy}`);

			let componentsCount = 0;
			const MAX_COMPONENTS = 6 + Math.floor(Math.random() * 3);

			while (queue.length > 0) {
				let { x, y, dir, isInitial } = queue.shift()!;
				let steps = 0;
				let cx = x, cy = y;

				while (true) {
					let nx = cx, ny = cy;
					if (dir === "right") nx++;
					else if (dir === "left") nx--;
					else if (dir === "up") ny--;
					else if (dir === "down") ny++;

					if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || grid[ny][nx].type !== "empty") {
						if (!isInitial || componentsCount > 0) targets.push({ x: cx, y: cy });
						break;
					}

					cx = nx; cy = ny;
					pathCells.add(`${cx},${cy}`);
					steps++;

					const canPlace = steps >= 2 && componentsCount < MAX_COMPONENTS;
					const mustPlace = isInitial && steps === 4 && componentsCount === 0;

					if (mustPlace || (canPlace && Math.random() > 0.6)) {
						const isSplitter = Math.random() > 0.65;
						const rot = Math.random() > 0.5 ? 0 : 90;
						
						if (isSplitter) {
							grid[cy][cx] = { type: "splitter", rotation: rot, fixed: false };
							(usedInventory as any)[`splitter${rot}`]++;
							let branchDir: Direction | null = null;
							if (rot === 0) {
								if (dir === "right") branchDir = "up";
								else if (dir === "left") branchDir = "down";
								else if (dir === "up") branchDir = "right";
								else if (dir === "down") branchDir = "left";
							} else {
								if (dir === "right") branchDir = "down";
								else if (dir === "left") branchDir = "up";
								else if (dir === "up") branchDir = "left";
								else if (dir === "down") branchDir = "right";
							}
							if (branchDir) queue.push({ x: cx, y: cy, dir: branchDir, isInitial: false });
						} else {
							grid[cy][cx] = { type: "mirror", rotation: rot, fixed: false };
							(usedInventory as any)[`mirror${rot}`]++;
							if (rot === 0) {
								if (dir === "right") dir = "up";
								else if (dir === "left") dir = "down";
								else if (dir === "up") dir = "right";
								else if (dir === "down") dir = "left";
							} else {
								if (dir === "right") dir = "down";
								else if (dir === "left") dir = "up";
								else if (dir === "up") dir = "left";
								else if (dir === "down") dir = "right";
							}
							isInitial = false;
						}
						componentsCount++;
						steps = 0;
					}

					if (steps > 6) {
						if (!isInitial || componentsCount > 0) targets.push({ x: cx, y: cy });
						break;
					}
				}
			}

			if (componentsCount >= MIN_COMPONENTS && targets.length > 0) {
				targets.forEach(t => {
					if (grid[t.y][t.x].type === "empty") {
						grid[t.y][t.x] = { type: "target", requirement: "white", fixed: true };
					}
				});

				inventory = { ...usedInventory };
				for (let y = 0; y < GRID_SIZE; y++) {
					for (let x = 0; x < GRID_SIZE; x++) {
						if (grid[y][x].type === "mirror" || grid[y][x].type === "splitter") {
							grid[y][x] = { type: "empty" };
						}
					}
				}

				for (let i = 0; i < 15; i++) {
					const bx = Math.floor(Math.random() * GRID_SIZE), by = Math.floor(Math.random() * GRID_SIZE);
					if (grid[by][bx].type === "empty" && !pathCells.has(`${bx},${by}`)) {
						grid[by][bx] = { type: "blocker", fixed: true };
					}
				}
				break;
			}
		}
		calculateLaser();
	}

	function calculateLaser() {
		let sourceX = -1, sourceY = -1, sourceDir: Direction = "right", sourceColor: Color = "white";
		for (let y = 0; y < GRID_SIZE; y++) {
			for (let x = 0; x < GRID_SIZE; x++) {
				if (grid[y][x]?.type === "source") {
					sourceX = x; sourceY = y;
					sourceDir = grid[y][x]?.direction || "right";
					sourceColor = grid[y][x]?.color || "white";
					break;
				}
			}
		}

		if (sourceX === -1) return;

		const queue: { x: number; y: number; dir: Direction; color: Color }[] = [{ x: sourceX, y: sourceY, dir: sourceDir, color: sourceColor }];
		const segments: LaserSegment[] = [];
		const visited = new Set<string>();
		const activeTargets = new Set<string>();

		while (queue.length > 0) {
			let { x, y, dir, color } = queue.shift()!;
			let cx = x, cy = y;

			while (true) {
				const key = `${cx},${cy},${dir},${color}`;
				if (visited.has(key)) break;
				visited.add(key);

				let nx = cx;
				let ny = cy;

				if (dir === "right") nx++;
				else if (dir === "left") nx--;
				else if (dir === "up") ny--;
				else if (dir === "down") ny++;

				if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;

				segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color });
				cx = nx;
				cy = ny;

				const cell = grid[cy][cx];
				if (!cell) continue;

				if (cell.type === "blocker") break;
				if (cell.type === "target") {
					if (cell.requirement === "white" || cell.requirement === color) activeTargets.add(`${cx},${cy}`);
					break;
				}
				if (cell.type === "filter" && color !== cell.color && cell.color !== "white") break;
				if (cell.type === "prism") color = cell.color || color;
				if (cell.type === "mirror") {
					const rot = cell.rotation || 0;
					if (rot === 0 || rot === 180) {
						if (dir === "right") dir = "up"; else if (dir === "left") dir = "down";
						else if (dir === "up") dir = "right"; else if (dir === "down") dir = "left";
					} else {
						if (dir === "right") dir = "down"; else if (dir === "left") dir = "up";
						else if (dir === "up") dir = "left"; else if (dir === "down") dir = "right";
					}
				}
				if (cell.type === "splitter") {
					const rot = cell.rotation || 0;
					if (rot === 0 || rot === 180) {
						let nDir: Direction | null = null;
						if (dir === "right") nDir = "up"; else if (dir === "left") nDir = "down";
						else if (dir === "up") nDir = "right"; else if (dir === "down") nDir = "left";
						if (nDir) queue.push({ x: cx, y: cy, dir: nDir, color });
					} else {
						let nDir: Direction | null = null;
						if (dir === "right") nDir = "down"; else if (dir === "left") nDir = "up";
						else if (dir === "up") nDir = "left"; else if (dir === "down") nDir = "right";
						if (nDir) queue.push({ x: cx, y: cy, dir: nDir, color });
					}
				}
			}
		}

		laserSegments = segments;
		hitTargets = activeTargets;
		let total = 0;
		for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (grid[y][x]?.type === "target") total++;
		isWon = total > 0 && hitTargets.size === total;
	}

	function handleCellClick(x: number, y: number) {
		const cell = grid[y][x];
		if (cell?.type === "empty" && selectedReflector !== null) {
			const { type, rotation } = selectedReflector;
			const key = `${type}${rotation}` as any;
			if ((inventory as any)[key] > 0) {
				grid[y][x] = { type: type, rotation: rotation, fixed: false };
				(inventory as any)[key]--;
				calculateLaser();
			}
		} else if ((cell?.type === "mirror" || cell?.type === "splitter") && !cell.fixed) {
			const key = `${cell.type}${cell.rotation}` as any;
			(inventory as any)[key]++;
			grid[y][x] = { type: "empty" };
			calculateLaser();
		}
	}

	function selectItem(type: CellType, rotation: number) {
		if (selectedReflector?.type === type && selectedReflector?.rotation === rotation) selectedReflector = null;
		else selectedReflector = { type, rotation };
	}

	onMount(() => {
		loadLevel(0);
		registerActions({
			newShuffle: () => {
				if (currentLevel === "procedural") {
					loadLevel("procedural");
				} else {
					const nextIdx = (currentLevel as number) + 1;
					if (nextIdx >= levels.length) {
						currentLevel = "procedural";
						loadLevel("procedural");
					} else {
						currentLevel = nextIdx;
						loadLevel(currentLevel);
					}
				}
			},
		});
	});

	function nextLevel() {
		if (currentLevel === "procedural") loadLevel("procedural");
		else {
			const nextIdx = (currentLevel as number) + 1;
			if (nextIdx >= levels.length) {
				currentLevel = "procedural";
				loadLevel("procedural");
			} else {
				currentLevel = nextIdx;
				loadLevel(currentLevel);
			}
		}
	}
</script>

<div class="lasermaze-container">
	<div class="game-header">
		<div class="header-controls">
			<div class="level-badge">{typeof currentLevel === 'string' ? currentLevel : `Level ${currentLevel + 1}`}</div>
			<button class="random-btn" onclick={() => { currentLevel = 'procedural'; loadLevel('procedural'); }}>
				<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08 c-0.82,2.33-3.04,4-5.65,4c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z"/></svg>
				Random Level
			</button>
		</div>
		<h1>Laser Maze</h1>
		<p>Place reflectors on the board to guide the laser to the target receptor.</p>
	</div>

	<div class="game-layout">
		<div class="inventory-bar">
			<h3>Components</h3>
			<div class="inventory-section">
				<span class="section-label">Mirrors</span>
				<div class="inventory-items">
					<button 
						class="inventory-item" 
						class:active={selectedReflector?.type === "mirror" && selectedReflector?.rotation === 0}
						onclick={() => selectItem("mirror", 0)}
						disabled={inventory.mirror0 === 0}
					>
						<div class="component-preview mirror m0"></div>
						<span class="count">{inventory.mirror0}</span>
					</button>
					<button 
						class="inventory-item" 
						class:active={selectedReflector?.type === "mirror" && selectedReflector?.rotation === 90}
						onclick={() => selectItem("mirror", 90)}
						disabled={inventory.mirror90 === 0}
					>
						<div class="component-preview mirror m90"></div>
						<span class="count">{inventory.mirror90}</span>
					</button>
				</div>
			</div>

			<div class="inventory-section">
				<span class="section-label">Splitters</span>
				<div class="inventory-items">
					<button 
						class="inventory-item" 
						class:active={selectedReflector?.type === "splitter" && selectedReflector?.rotation === 0}
						onclick={() => selectItem("splitter", 0)}
						disabled={inventory.splitter0 === 0}
					>
						<div class="component-preview splitter s0"></div>
						<span class="count">{inventory.splitter0}</span>
					</button>
					<button 
						class="inventory-item" 
						class:active={selectedReflector?.type === "splitter" && selectedReflector?.rotation === 90}
						onclick={() => selectItem("splitter", 90)}
						disabled={inventory.splitter90 === 0}
					>
						<div class="component-preview splitter s90"></div>
						<span class="count">{inventory.splitter90}</span>
					</button>
				</div>
			</div>

			<div class="inventory-hint">
				{selectedReflector !== null ? "Click grid to place" : "Select a component"}
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
							class:clickable={(grid[y][x]?.type === "empty" && selectedReflector !== null) || ((grid[y][x]?.type === "mirror" || grid[y][x]?.type === "splitter") && !grid[y][x]?.fixed)}
							onclick={() => handleCellClick(x, y)}
						>
							{#if grid[y][x]?.type === "source"}
								<div class="source-icon {grid[y][x]?.direction}" style="--source-color: {grid[y][x]?.color}">
									<div class="laser-dot"></div>
								</div>
							{:else if grid[y][x]?.type === "target"}
								<div class="target-icon" class:active={hitTargets.has(`${x},${y}`)}>
									<div class="target-ring outer"></div>
									<div class="target-ring middle"></div>
									<div class="target-ring inner"></div>
									<div class="target-core" style="--req-color: {grid[y][x]?.requirement}"></div>
									<svg class="target-svg" viewBox="0 0 100 100">
										<circle cx="50" cy="50" r="45" class="target-path" />
									</svg>
								</div>
							{:else if grid[y][x]?.type === "blocker"}
								<div class="blocker-icon"></div>
							{:else if grid[y][x]?.type === "mirror"}
								<div
									class="mirror-icon"
									class:placed={!grid[y][x]?.fixed}
									style="transform: rotate({grid[y][x]?.rotation}deg)"
								>
									<div class="mirror-surface"></div>
								</div>
							{:else if grid[y][x]?.type === "splitter"}
								<div
									class="splitter-icon"
									class:placed={!grid[y][x]?.fixed}
									style="transform: rotate({grid[y][x]?.rotation}deg)"
								>
									<div class="splitter-surface"></div>
									<div class="splitter-glass"></div>
								</div>
							{:else if grid[y][x]?.type === "prism"}
								<div class="prism-icon" style="--prism-color: {grid[y][x]?.color}">
									<div class="prism-shape"></div>
								</div>
							{/if}
						</div>
					{/each}
				{/each}

				<svg class="laser-svg" viewBox="0 0 {GRID_SIZE} {GRID_SIZE}">
					{#each laserSegments as seg}
						<line
							x1={seg.x1 + 0.5}
							y1={seg.y1 + 0.5}
							x2={seg.x2 + 0.5}
							y2={seg.y2 + 0.5}
							class="laser-line"
							style="--laser-color: {seg.color === 'white' ? '#ff6e61' : seg.color};"
						/>
					{/each}
				</svg>
			</div>
		</div>
	</div>

	{#if isWon}
		<div class="win-overlay" in:fade>
			<div class="win-content" in:scale>
				<h2>All Targets Hit!</h2>
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
		justify-content: flex-start;
		color: var(--game-text-primary);
		font-family: "Outfit", "Inter", sans-serif;
		padding: clamp(0.75rem, 1.8vmin, 1.5rem);
		position: relative;
		overflow: auto;
	}

	.game-header {
		text-align: center;
		margin-bottom: clamp(0.75rem, 1.8vmin, 1.5rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.45rem, 1.1vmin, 0.9rem);
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: clamp(0.6rem, 1.2vmin, 1rem);
		background: rgba(255, 255, 255, 0.03);
		padding: clamp(0.3rem, 0.8vmin, 0.5rem) clamp(0.3rem, 0.8vmin, 0.5rem)
			clamp(0.3rem, 0.8vmin, 0.5rem) clamp(0.7rem, 1.6vmin, 1rem);
		border-radius: 99px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.level-badge {
		color: #ff6e61;
		font-size: clamp(0.64rem, 1.5vmin, 0.78rem);
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08rem;
	}

	.random-btn {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: clamp(0.42rem, 1vmin, 0.55rem) clamp(0.8rem, 1.9vmin, 1.2rem);
		border-radius: 99px;
		font-size: clamp(0.66rem, 1.5vmin, 0.8rem);
		font-weight: 800;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: clamp(0.3rem, 0.7vmin, 0.5rem);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 15px rgba(255, 110, 97, 0.3);
	}

	.random-btn:hover {
		transform: translateY(-2px) scale(1.02);
		box-shadow: 0 6px 20px rgba(255, 110, 97, 0.4);
	}

	.random-btn:active {
		transform: translateY(0);
	}

	.random-btn svg {
		transition: transform 0.4s;
	}

	.random-btn:hover svg {
		transform: rotate(180deg);
	}

	.game-header h1 {
		font-size: clamp(1.5rem, 4.8vmin, 2.6rem);
		font-weight: 900;
		margin: 0;
		color: var(--game-text-primary);
		letter-spacing: -0.04rem;
	}

	.game-header p {
		margin: 0;
		color: var(--game-text-muted);
		font-size: clamp(0.72rem, 1.8vmin, 0.92rem);
		max-width: 500px;
		line-height: 1.45;
	}

	.game-layout {
		display: flex;
		gap: clamp(0.75rem, 1.8vmin, 1.4rem);
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		max-width: 1400px;
	}

	.inventory-bar {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: clamp(0.9rem, 1.8vmin, 1.4rem);
		padding: clamp(0.7rem, 1.4vmin, 1.1rem);
		display: flex;
		flex-direction: column;
		gap: clamp(0.45rem, 1vmin, 0.8rem);
		width: clamp(170px, 18vw, 240px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}

	.inventory-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1rem;
		color: var(--game-text-soft);
		margin-left: 0.5rem;
	}

	.inventory-bar h3 {
		margin: 0;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.2rem;
		color: #ff6e61;
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.inventory-items {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(0.35rem, 0.9vmin, 0.65rem);
	}

	.inventory-item {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: clamp(0.55rem, 1.2vmin, 0.8rem);
		padding: clamp(0.4rem, 0.9vmin, 0.6rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.2rem, 0.7vmin, 0.4rem);
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		color: var(--game-text-primary);
	}

	.inventory-item:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.inventory-item:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: #ff6e61;
		transform: translateY(-2px);
	}

	.inventory-item.active {
		background: rgba(255, 110, 97, 0.15);
		border-color: #ff6e61;
		box-shadow: 0 0 15px rgba(255, 110, 97, 0.2);
	}

	.component-preview {
		width: clamp(1.45rem, 3.4vmin, 2.2rem);
		height: clamp(1.45rem, 3.4vmin, 2.2rem);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.mirror::before {
		content: "";
		position: absolute;
		width: clamp(1px, 0.35vmin, 3px);
		height: 80%;
		background: #00f2fe;
		box-shadow: 0 0 10px #00f2fe;
		border-radius: 4px;
	}

	.splitter::before {
		content: "";
		position: absolute;
		width: clamp(1px, 0.35vmin, 3px);
		height: 80%;
		background: #00f2fe;
		box-shadow: 0 0 10px #00f2fe;
		border-radius: 4px;
	}
	.splitter::after {
		content: "";
		position: absolute;
		width: clamp(0.8rem, 1.7vmin, 1.1rem);
		height: clamp(0.8rem, 1.7vmin, 1.1rem);
		background: rgba(0, 242, 254, 0.2);
		border: 1px solid rgba(0, 242, 254, 0.4);
		border-radius: 2px;
	}

	.m0::before, .s0::before { transform: rotate(45deg); }
	.m90::before, .s90::before { transform: rotate(-45deg); }

	.count {
		font-size: clamp(0.75rem, 1.7vmin, 1rem);
		font-weight: 900;
	}

	.inventory-hint {
		font-size: 0.75rem;
		color: var(--game-text-soft);
		text-align: center;
		font-style: italic;
		margin-top: 0.5rem;
	}

	.grid-container {
		position: relative;
		padding: clamp(0.5rem, 1.2vmin, 1rem);
		background: rgba(255, 255, 255, 0.01);
		border-radius: clamp(0.9rem, 1.8vmin, 1.4rem);
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-size), 1fr);
		grid-template-rows: repeat(var(--grid-size), 1fr);
		gap: clamp(2px, 0.45vmin, 5px);
		width: min(62vmin, 620px);
		height: min(62vmin, 620px);
		position: relative;
	}

	.cell {
		background: rgba(255, 255, 255, 0.03);
		border-radius: clamp(4px, 0.8vmin, 8px);
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
		border-radius: 6px;
		position: relative;
		border: 2px solid var(--source-color, #ff6e61);
		box-shadow: 0 0 15px var(--source-color, #ff6e61);
	}

	.source-icon.right::after {
		content: "";
		position: absolute;
		right: -8px;
		top: 50%;
		transform: translateY(-50%);
		border-left: 10px solid var(--source-color, #ff6e61);
		border-top: 6px solid transparent;
		border-bottom: 6px solid transparent;
	}
	.source-icon.left::after {
		content: "";
		position: absolute;
		left: -8px;
		top: 50%;
		transform: translateY(-50%);
		border-right: 10px solid var(--source-color, #ff6e61);
		border-top: 6px solid transparent;
		border-bottom: 6px solid transparent;
	}
	.source-icon.up::after {
		content: "";
		position: absolute;
		top: -8px;
		left: 50%;
		transform: translateX(-50%);
		border-bottom: 10px solid var(--source-color, #ff6e61);
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
	}
	.source-icon.down::after {
		content: "";
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%);
		border-top: 10px solid var(--source-color, #ff6e61);
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
	}

	.laser-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 6px;
		height: 6px;
		background: var(--source-color, #ff6e61);
		border-radius: 50%;
		box-shadow: 0 0 10px var(--source-color, #ff6e61);
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
		border: 2px solid var(--req-color, white);
		box-shadow: 0 0 10px var(--req-color, transparent);
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

	.target-icon.active .target-ring { border-color: var(--req-color, #ff6e61); box-shadow: 0 0 15px var(--req-color, #ff6e61); }
	.target-icon.active .target-core { background: var(--req-color, #ff6e61); box-shadow: 0 0 25px var(--req-color, #ff6e61); transform: scale(1.2); }
	.target-icon.active .target-svg { stroke: var(--req-color, #ff6e61); }

	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

	.blocker-icon {
		width: 85%;
		height: 85%;
		background: #050505;
		border: 1px solid #222;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.3);
		box-shadow: inset 0 0 10px black;
	}

	.mirror-icon, .splitter-icon {
		width: 95%;
		height: 95%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.mirror-icon.placed, .splitter-icon.placed { filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.4)); }

	.mirror-surface {
		width: 4px;
		height: 90%;
		background: var(--color-indigo);
		box-shadow: 0 0 20px rgba(0, 242, 254, 0.8), inset 0 0 5px white;
		border-radius: 4px;
		transform: rotate(45deg);
	}

	.splitter-surface {
		width: 2px;
		height: 90%;
		background: #00f2fe;
		box-shadow: 0 0 15px rgba(0, 242, 254, 0.6);
		border-radius: 4px;
		transform: rotate(45deg);
		z-index: 2;
	}

	.splitter-glass {
		position: absolute;
		width: 60%;
		height: 60%;
		background: rgba(0, 242, 254, 0.05);
		border: 1px solid rgba(0, 242, 254, 0.2);
		backdrop-filter: blur(2px);
		border-radius: 4px;
		transform: rotate(45deg);
	}

	.prism-icon {
		width: 80%;
		height: 80%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.prism-shape {
		width: 0;
		height: 0;
		border-left: clamp(8px, 1.4vmin, 14px) solid transparent;
		border-right: clamp(8px, 1.4vmin, 14px) solid transparent;
		border-bottom: clamp(14px, 2.6vmin, 24px) solid var(--prism-color, white);
		filter: drop-shadow(0 0 12px var(--prism-color, white));
		opacity: 0.9;
	}

	@media (max-width: 1024px) {
		.lasermaze-container {
			padding: 0.75rem;
			overflow: auto;
			height: 100%;
		}

		.game-header {
			margin-bottom: 0.75rem;
			gap: 0.5rem;
		}

		.game-header h1 {
			font-size: clamp(1.3rem, 4vw, 1.8rem);
		}

		.game-header p {
			display: none;
		}

		.game-layout {
			flex-direction: column;
			align-items: center;
			width: 100%;
			gap: 0.75rem;
		}

		.inventory-bar {
			width: min(92vw, 280px);
			padding: 0.6rem;
			gap: 0.4rem;
		}

		.inventory-bar h3 {
			font-size: 0.75rem;
		}

		.section-label {
			font-size: 0.6rem;
		}

		.grid-container {
			padding: 0.5rem;
		}

		.grid {
			width: min(85vw, calc(100dvh - 14rem));
			height: min(85vw, calc(100dvh - 14rem));
			gap: clamp(2px, 0.5vw, 4px);
		}

		.component-preview {
			width: clamp(1.2rem, 3.5vw, 1.8rem);
			height: clamp(1.2rem, 3.5vw, 1.8rem);
		}

		.count {
			font-size: clamp(0.65rem, 1.8vw, 0.85rem);
		}
	}

	@media (max-width: 480px) {
		.lasermaze-container {
			padding: 0.5rem;
		}

		.game-header {
			margin-bottom: 0.5rem;
		}

		.game-header h1 {
			font-size: clamp(1.1rem, 5vw, 1.5rem);
		}

		.header-controls {
			padding: 0.25rem 0.5rem;
		}

		.level-badge {
			font-size: 0.6rem;
		}

		.random-btn {
			padding: 0.3rem 0.7rem;
			font-size: 0.6rem;
		}

		.inventory-bar {
			width: 94vw;
			padding: 0.5rem;
		}

		.grid {
			width: min(90vw, calc(100dvh - 13rem));
			height: min(90vw, calc(100dvh - 13rem));
		}
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
		stroke: var(--laser-color, #ff6e61);
		stroke-width: 0.12;
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: drop-shadow(0 0 10px var(--laser-color, #ff6e61));
		opacity: 0.9;
		transition: stroke 0.3s, filter 0.3s;
	}

	.win-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		border-radius: 2rem;
	}

	.win-content {
		text-align: center;
		background: #000;
		padding: 3rem;
		border-radius: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.win-content h2 {
		font-size: 3rem;
		margin: 0;
		color: var(--color-bittersweet);
		font-weight: 900;
	}

	.win-content button {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: 1rem 3rem;
		font-size: 1.4rem;
		font-weight: 800;
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.3s;
	}

	.win-content button:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(255, 110, 97, 0.5);
	}
</style>
