<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	const GRID_SIZE = 15;
	let moves = $state(0);
	let isGameOver = $state(false);
	let playerPos = $state({ x: 1, y: 1 });
	let goalPos = $state({ x: 13, y: 13 });

	// 0 = ice, 1 = wall (stop before), 2 = sticky (stop on)
	let grid = $state<number[][]>([]);

	let optimalPath = $state<{x: number, y: number}[]>([]);
	let moveSegments = $state<{x1: number, y1: number, x2: number, y2: number, id: number}[]>([]);
	let showOptimal = $state(false);
	let segmentId = 0;

	function solveLevel(start: {x: number, y: number}, goal: {x: number, y: number}, levelGrid: number[][]) {
		const queue: {pos: {x: number, y: number}, path: {x: number, y: number}[]}[] = [{ pos: start, path: [start] }];
		const visited = new Set<string>();
		visited.add(`${start.x},${start.y}`);

		while (queue.length > 0) {
			const { pos: curr, path } = queue.shift()!;
			if (curr.x === goal.x && curr.y === goal.y) return path;

			const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
			for (const [dx, dy] of dirs) {
				let nx = curr.x;
				let ny = curr.y;
				
				while (true) {
					const tx = nx + dx;
					const ty = ny + dy;
					if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE || levelGrid[ty][tx] === 1) break;
					nx = tx;
					ny = ty;
					if (levelGrid[ny][nx] === 2 || (nx === goal.x && ny === goal.y)) break;
				}

				const key = `${nx},${ny}`;
				if (!visited.has(key)) {
					visited.add(key);
					queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
				}
			}
		}
		return null;
	}

	function isSolvable(start: {x: number, y: number}, goal: {x: number, y: number}, levelGrid: number[][]) {
		return solveLevel(start, goal, levelGrid) !== null;
	}

	function initLevel(randomize = true) {
		let newGrid: number[][];
		let success = false;
		let attempts = 0;

		const start = { x: 1, y: 1 };
		const goal = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };

		while (!success && attempts < 100) {
			attempts++;
			newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
			
			if (randomize) {
				const wallCount = 25 + Math.floor(Math.random() * 15);
				const stickyCount = 10 + Math.floor(Math.random() * 10);
				
				for (let i = 0; i < wallCount; i++) {
					const ox = Math.floor(Math.random() * GRID_SIZE);
					const oy = Math.floor(Math.random() * GRID_SIZE);
					if ((ox !== start.x || oy !== start.y) && (ox !== goal.x || oy !== goal.y)) {
						newGrid[oy][ox] = 1;
					}
				}
				for (let i = 0; i < stickyCount; i++) {
					const ox = Math.floor(Math.random() * GRID_SIZE);
					const oy = Math.floor(Math.random() * GRID_SIZE);
					if ((ox !== start.x || oy !== start.y) && (ox !== goal.x || oy !== goal.y) && newGrid[oy][ox] === 0) {
						newGrid[oy][ox] = 2;
					}
				}
			} else {
				const walls = [[3, 1], [1, 3], [5, 2], [2, 5], [7, 4], [4, 7], [10, 8], [8, 10], [12, 5], [5, 12], [9, 13], [13, 9], [6, 6]];
				const sticky = [[3, 5], [5, 3], [11, 11], [2, 2], [13, 4], [4, 13]];
				walls.forEach(([ox, oy]) => { if (ox < GRID_SIZE && oy < GRID_SIZE) newGrid[oy][ox] = 1; });
				sticky.forEach(([ox, oy]) => { if (ox < GRID_SIZE && oy < GRID_SIZE) newGrid[oy][ox] = 2; });
			}

			newGrid[start.y][start.x] = 0;
			newGrid[goal.y][goal.x] = 0;

			const solution = solveLevel(start, goal, newGrid);
			if (solution && solution.length - 1 >= 6) {
				grid = newGrid;
				playerPos = { ...start };
				goalPos = { ...goal };
				optimalPath = solution;
				moveSegments = [];
				showOptimal = false;
				success = true;
			}
		}

		if (!success) {
			grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
			playerPos = { ...start };
			optimalPath = [];
			moveSegments = [];
		}
	}

	function resetGame() {
		moves = 0;
		isGameOver = false;
		showOptimal = false;
		playerPos = { x: 1, y: 1 };
		moveSegments = [];
	}

	function nextLevel() {
		moves = 0;
		isGameOver = false;
		showOptimal = false;
		initLevel(true);
	}

	let isMoving = $state(false);
	let bufferedMove = $state<{dx: number, dy: number, time: number} | null>(null);
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	function move(dx: number, dy: number) {
		if (isGameOver) return;
		
		if (isMoving) {
			bufferedMove = { dx, dy, time: Date.now() };
			return;
		}

		let startX = playerPos.x;
		let startY = playerPos.y;
		let newX = startX;
		let newY = startY;
		let moved = false;

		while (true) {
			const nextX = newX + dx;
			const nextY = newY + dy;

			// Out of bounds or hit a wall
			if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE || grid[nextY][nextX] === 1) {
				break;
			}

			// Advance position
			newX = nextX;
			newY = nextY;
			moved = true;

			// Stop if we hit a sticky tile or the goal
			if (grid[newY][newX] === 2 || (newX === goalPos.x && newY === goalPos.y)) {
				break;
			}
		}

		if (moved) {
			isMoving = true;
			const id = segmentId++;
			const segment = { x1: startX, y1: startY, x2: startX, y2: startY, id };
			moveSegments.push(segment);
			
			// Small delay to ensure the initial state is rendered before animating
			requestAnimationFrame(() => {
				const s = moveSegments.find(seg => seg.id === id);
				if (s) {
					s.x2 = newX;
					s.y2 = newY;
				}
			});

			playerPos = { x: newX, y: newY };
			moves++;
			
			setTimeout(() => {
				isMoving = false;
				if (newX === goalPos.x && newY === goalPos.y) {
					isGameOver = true;
				}

				// Check buffer
				if (bufferedMove && !isGameOver) {
					const now = Date.now();
					if (now - bufferedMove.time < 1000) {
						const { dx: bDx, dy: bDy } = bufferedMove;
						bufferedMove = null;
						move(bDx, bDy);
					} else {
						bufferedMove = null;
					}
				}
			}, 250);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		const key = e.key.toLowerCase();
		if (key === 'r') {
			resetGame();
			return;
		}
		if (key === 'n') {
			nextLevel();
			return;
		}

		if (isGameOver) return;
		switch (e.key) {
			case 'ArrowUp':
			case 'w': move(0, -1); break;
			case 'ArrowDown':
			case 's': move(0, 1); break;
			case 'ArrowLeft':
			case 'a': move(-1, 0); break;
			case 'ArrowRight':
			case 'd': move(1, 0); break;
		}
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (isGameOver) return;

		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;

		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;

		const minSwipeDistance = 30;

		if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
			return;
		}

		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			move(deltaX > 0 ? 1 : -1, 0);
		} else {
			move(0, deltaY > 0 ? 1 : -1);
		}
	}

	$effect(() => {
		registerActions({
			restart: resetGame,
			help: () => instructions.open()
		});
	});

	onMount(() => {
		initLevel();
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="ice_slider" title="Ice Slider Puzzle">
		<p><strong>Goal:</strong> Slide the block to the goal.</p>
		<p>Blocks slide until they hit a wall or an obstacle. Use the arrow keys, WASD, or swipe to move.</p>
		<hr style="opacity: 0.1; margin: 1.5vmin 0;" />
		<p><strong>Tile Types:</strong></p>
		<ul style="font-size: 0.9em; opacity: 0.8; padding-left: 2.5vmin;">
			<li><span style="color: #4b6abe; font-weight: 800;">Wall:</span> Stops you in the tile <em>before</em> it.</li>
			<li><span style="color: var(--color-indigo); font-weight: 800;">Sticky Ice:</span> Stops you <em>on top</em> of it.</li>
		</ul>
		<hr style="opacity: 0.1; margin: 1.5vmin 0;" />
		<p style="font-size: 0.9em; opacity: 0.7;"><strong>Shortcuts:</strong> [R] Restart, [N] New Puzzle</p>
	</Instructions>

	<InGameMenu 
		onBack={onBack} 
		onHelp={() => instructions.open()} 
		onRestart={resetGame}
	>
		<div class="stats-center">
			<div class="stat">
				<span class="label">TARGET</span>
				<span class="value">{optimalPath.length > 0 ? optimalPath.length - 1 : '-'}</span>
			</div>
			<div class="stat">
				<span class="label">MOVES</span>
				<span class="value">{moves}</span>
			</div>
			{#if isGameOver}
				<div class="status-badge" in:fade>SOLVED!</div>
			{/if}
		</div>
		
		{#snippet rightControls()}
			<div class="nav-actions">
				{#if isGameOver}
					<button class="nav-extra-btn optimal-toggle" class:active={showOptimal} onclick={() => showOptimal = !showOptimal}>
						{showOptimal ? 'HIDE' : 'SHOW'} OPTIMAL
					</button>
				{/if}
				<button class="nav-extra-btn" onclick={nextLevel} title="New Random Puzzle">NEW [N]</button>
			</div>
		{/snippet}
	</InGameMenu>

	<div class="board-wrapper">
		<div class="grid-container" role="application" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
			<div class="grid" style="grid-template-columns: repeat({GRID_SIZE}, 1fr); grid-template-rows: repeat({GRID_SIZE}, 1fr);">
				{#each grid as row, y}
					{#each row as cell, x}
						<div class="cell" class:wall={cell === 1} class:sticky={cell === 2} class:goal={x === goalPos.x && y === goalPos.y}>
							{#if x === goalPos.x && y === goalPos.y}
								<div class="goal-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
								</div>
							{:else if cell === 2}
								<div class="sticky-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M4 4l16 16M20 4L4 20" opacity="0.3"/>
										<circle cx="12" cy="12" r="3" />
									</svg>
								</div>
							{/if}
						</div>
					{/each}
				{/each}

				<svg class="path-overlay" viewBox="0 0 {GRID_SIZE} {GRID_SIZE}">
					{#each moveSegments as s (s.id)}
						<line 
							x1={s.x1 + 0.5} y1={s.y1 + 0.5} 
							x2={s.x2 + 0.5} y2={s.y2 + 0.5}
							stroke="rgba(255, 255, 255, 0.4)"
							stroke-width="0.1"
							stroke-dasharray="0.1 0.1"
							stroke-linecap="round"
							class="move-line"
						/>
					{/each}

					{#if showOptimal && optimalPath.length > 0}
						<polyline 
							points={optimalPath.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')}
							fill="none"
							stroke="var(--app-text)"
							stroke-width="0.15"
							stroke-dasharray="0.2 0.1"
							stroke-linecap="round"
							stroke-linejoin="round"
							in:fade
						/>
						{#each optimalPath as p}
							<circle cx={p.x + 0.5} cy={p.y + 0.5} r="0.1" fill="var(--app-text)" />
						{/each}
					{/if}
				</svg>

				<div 
					class="player" 
					style="
						left: {(playerPos.x / GRID_SIZE) * 100}%; 
						top: {(playerPos.y / GRID_SIZE) * 100}%;
						width: {100 / GRID_SIZE}%;
						height: {100 / GRID_SIZE}%;
					"
				>
					<div class="player-block"></div>
				</div>
			</div>
		</div>
	</div>

	<div class="bottom-bar">
		{#if isGameOver}
			<div class="end-actions" in:fade={{ delay: 300 }}>
				<button class="action-btn secondary" onclick={resetGame}>RETRY</button>
				<button class="action-btn" onclick={nextLevel}>NEW PUZZLE</button>
				<button class="action-btn secondary" onclick={onBack}>MAIN MENU</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.end-actions {
		display: flex;
		gap: 2vmin;
		justify-content: center;
	}

	.action-btn {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-size: 2vmin;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		filter: brightness(1.2);
		transform: scale(1.05);
	}

	.action-btn.secondary {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
	}

	.action-btn.secondary:hover {
		background: var(--ice-secondary-hover-bg);
		border-color: var(--ice-secondary-hover-border);
		color: var(--ice-secondary-hover-text);
	}
	.game-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--app-text);
		position: relative;
		--ice-board-bg: rgba(255, 255, 255, 0.02);
		--ice-board-border: rgba(255, 255, 255, 0.1);
		--ice-board-shadow: rgba(0, 0, 0, 0.5);
		--ice-cell-border: rgba(255, 255, 255, 0.03);
		--ice-sticky-bg: rgba(75, 106, 190, 0.2);
		--ice-sticky-border: rgba(255, 255, 255, 0.1);
		--ice-secondary-bg: rgba(255, 255, 255, 0.05);
		--ice-secondary-border: rgba(255, 255, 255, 0.1);
		--ice-secondary-text: rgba(255, 255, 255, 0.7);
		--ice-secondary-hover-bg: rgba(255, 255, 255, 0.1);
		--ice-secondary-hover-border: rgba(255, 255, 255, 0.4);
		--ice-secondary-hover-text: #fff;
		--ice-stat-value: #a5d8f8;
		--ice-stat-glow: rgba(165, 216, 248, 0.4);
	}

	:global(html[data-theme='light']) .game-inner {
		--ice-board-bg: rgba(255, 246, 231, 0.9);
		--ice-board-border: rgba(120, 94, 62, 0.24);
		--ice-board-shadow: rgba(120, 94, 62, 0.22);
		--ice-cell-border: rgba(120, 94, 62, 0.08);
		--ice-sticky-bg: rgba(84, 113, 188, 0.18);
		--ice-sticky-border: rgba(120, 94, 62, 0.16);
		--ice-secondary-bg: rgba(255, 248, 237, 0.86);
		--ice-secondary-border: rgba(120, 94, 62, 0.26);
		--ice-secondary-text: rgba(47, 37, 28, 0.78);
		--ice-secondary-hover-bg: rgba(255, 241, 218, 0.95);
		--ice-secondary-hover-border: rgba(120, 94, 62, 0.38);
		--ice-secondary-hover-text: #2f251c;
		--ice-stat-value: #5c88b4;
		--ice-stat-glow: rgba(92, 136, 180, 0.25);
	}

	.game-inner :global(.nav-row) {
		padding: clamp(0.75rem, 2vmin, 1.8rem);
		gap: clamp(0.35rem, 1vmin, 0.75rem);
	}

	.game-inner :global(.back-btn),
	.game-inner :global(.help-btn),
	.game-inner :global(.restart-btn) {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
		padding: clamp(0.4rem, 0.9vmin, 0.75rem) clamp(0.6rem, 1.4vmin, 1.2rem);
		font-size: clamp(0.68rem, 1.15vmin, 0.95rem);
	}

	.game-inner :global(.back-btn:hover),
	.game-inner :global(.help-btn:hover),
	.game-inner :global(.restart-btn:hover) {
		background: var(--ice-secondary-hover-bg);
		border-color: var(--ice-secondary-hover-border);
		color: var(--ice-secondary-hover-text);
	}

	.stats-center {
		display: flex;
		align-items: center;
		gap: clamp(1rem, 2.5vmin, 2.5rem);
		min-width: 0;
	}

	.status-badge {
		background: var(--color-apple);
		color: black;
		font-weight: 900;
		font-size: 1.4vmin;
		padding: 0.5vmin 1.5vmin;
		border-radius: 2vmin;
		letter-spacing: 0.1vmin;
		box-shadow: 0 0 15px rgba(105, 175, 75, 0.4);
	}

	.nav-actions {
		display: flex;
		gap: 1.5vmin;
		align-items: center;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 1.2vmin;
		color: var(--app-muted-text);
		font-weight: 800;
		letter-spacing: 0.1vmin;
	}

	.stat .value {
		font-size: 3vmin;
		font-weight: 900;
		color: var(--ice-stat-value);
		text-shadow: 0 0 10px var(--ice-stat-glow);
	}

	.nav-extra-btn {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
		padding: 0.8vmin 1.5vmin;
		border-radius: 0.8vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.4vmin;
		transition: all 0.2s;
	}

	.nav-extra-btn:hover {
		background: var(--ice-secondary-hover-bg);
		color: var(--ice-secondary-hover-text);
		border-color: var(--app-text);
	}

	.nav-extra-btn.active {
		background: var(--app-text);
		color: black;
		border-color: var(--app-text);
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1vmin 2vmin;
		min-height: 0; /* Allow flex child to shrink */
		overflow: hidden;
		box-sizing: border-box;
	}

	.grid-container {
		width: min(70vmin, calc(100vw - 6vmin), calc(100dvh - 34vmin), calc(100% - 1vmin));
		height: min(70vmin, calc(100vw - 6vmin), calc(100dvh - 34vmin), calc(100% - 1vmin));
		max-width: 100%;
		max-height: calc(100% - 0.5rem);
		box-sizing: border-box;
		background: var(--ice-board-bg);
		border: 2px solid var(--ice-board-border);
		border-radius: 2vmin;
		position: relative;
		overflow: hidden;
		box-shadow: 0 20px 50px var(--ice-board-shadow);
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.path-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.move-line {
		transition: x2 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), y2 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
	}

	.cell {
		border: 1px solid var(--ice-cell-border);
		aspect-ratio: 1 / 1;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.cell.wall {
		background: var(--color-indigo);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 0 15px rgba(0,0,0,0.4);
		border-radius: 0.5vmin;
		margin: 0.2vmin;
	}

	.cell.sticky {
		background: var(--ice-sticky-bg);
		box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
		border: 1px dashed var(--ice-sticky-border);
	}

	.sticky-icon {
		width: 40%;
		height: 40%;
		color: var(--color-indigo);
		opacity: 0.5;
	}

	.cell.goal {
		background: rgba(255, 203, 92, 0.1);
	}

	.goal-icon {
		width: 60%;
		height: 60%;
		color: var(--app-text);
		filter: drop-shadow(0 0 8px var(--app-text));
		animation: pulse 2s infinite ease-in-out;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); opacity: 0.8; }
		50% { transform: scale(1.2); opacity: 1; }
	}

	.player {
		position: absolute;
		transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
		padding: 0.5vmin;
		z-index: 10;
	}

	.player-block {
		width: 100%;
		height: 100%;
		background: #ff6e61;
		border-radius: 0.8vmin;
		box-shadow: 
			0 0 20px rgba(255, 110, 97, 0.6),
			inset 0 0 10px rgba(255, 255, 255, 0.5);
		border: 2px solid white;
	}

	@keyframes slideUp {
		from { transform: translateY(30px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	@media (max-width: 900px) {
		.game-inner :global(.nav-row) {
			padding: 0.55rem 0.65rem;
		}

		.game-inner :global(.nav-group) {
			gap: 0.35rem;
			min-width: 0;
		}

		.game-inner :global(.center-content) {
			flex: 0 1 auto;
			min-width: 0;
		}

		.game-inner :global(.back-btn),
		.game-inner :global(.help-btn),
		.game-inner :global(.restart-btn) {
			font-size: 0.66rem;
			padding: 0.38rem 0.55rem;
		}

		.stats-center {
			flex-wrap: wrap;
			justify-content: center;
		}

		.stats-center {
			gap: 0.8rem;
		}

		.nav-actions {
			gap: 0.5rem;
		}

		.nav-extra-btn {
			font-size: 0.72rem;
			padding: 0.5rem 0.65rem;
		}

		.grid-container {
			width: min(78vmin, calc(100vw - 1.75rem), calc(100dvh - 18.5rem));
			height: min(78vmin, calc(100vw - 1.75rem), calc(100dvh - 18.5rem));
		}
	}
</style>
