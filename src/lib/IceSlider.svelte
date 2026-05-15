<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	const GRID_SIZE = 10;
	let moves = $state(0);
	let isGameOver = $state(false);
	let playerPos = $state({ x: 1, y: 1 });
	let goalPos = $state({ x: 8, y: 8 });

	// 0 = ice, 1 = wall/obstacle
	let grid = $state<number[][]>([]);

	function isSolvable(start: {x: number, y: number}, goal: {x: number, y: number}, levelGrid: number[][]) {
		const queue: {x: number, y: number}[] = [start];
		const visited = new Set<string>();
		visited.add(`${start.x},${start.y}`);

		while (queue.length > 0) {
			const curr = queue.shift()!;
			if (curr.x === goal.x && curr.y === goal.y) return true;

			const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
			for (const [dx, dy] of dirs) {
				let nx = curr.x;
				let ny = curr.y;
				
				// Simulate slide
				while (true) {
					const tx = nx + dx;
					const ty = ny + dy;
					if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && levelGrid[ty][tx] === 0) {
						nx = tx;
						ny = ty;
						if (nx === goal.x && ny === goal.y) return true;
					} else {
						break;
					}
				}

				const key = `${nx},${ny}`;
				if (!visited.has(key)) {
					visited.add(key);
					queue.push({ x: nx, y: ny });
				}
			}
		}
		return false;
	}

	function initLevel(randomize = false) {
		let newGrid: number[][];
		let success = false;
		let attempts = 0;

		const start = { x: 1, y: 1 };
		const goal = { x: 8, y: 8 };

		while (!success && attempts < 100) {
			attempts++;
			newGrid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
			
			if (randomize) {
				const obstacleCount = 15 + Math.floor(Math.random() * 10);
				for (let i = 0; i < obstacleCount; i++) {
					const ox = Math.floor(Math.random() * GRID_SIZE);
					const oy = Math.floor(Math.random() * GRID_SIZE);
					if ((ox !== start.x || oy !== start.y) && (ox !== goal.x || oy !== goal.y)) {
						newGrid[oy][ox] = 1;
					}
				}
			} else {
				// Default level
				const obstacles = [
					[3, 1], [1, 3], [5, 2], [2, 5], [7, 4], [4, 7], 
					[6, 8], [8, 6], [3, 5], [5, 3], [7, 7], [2, 2]
				];
				obstacles.forEach(([ox, oy]) => {
					if (ox < GRID_SIZE && oy < GRID_SIZE) newGrid[oy][ox] = 1;
				});
			}

			// Start and goal must be clear
			newGrid[start.y][start.x] = 0;
			newGrid[goal.y][goal.x] = 0;

			if (isSolvable(start, goal, newGrid)) {
				grid = newGrid;
				playerPos = { ...start };
				goalPos = { ...goal };
				success = true;
			}
		}

		if (!success) {
			// Fallback to empty level if somehow we fail
			grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
			playerPos = { ...start };
		}
	}

	function resetGame() {
		moves = 0;
		isGameOver = false;
		initLevel(false);
	}

	function nextLevel() {
		moves = 0;
		isGameOver = false;
		initLevel(true);
	}

	let isMoving = $state(false);

	function move(dx: number, dy: number) {
		if (isGameOver || isMoving) return;

		let newX = playerPos.x;
		let newY = playerPos.y;
		let moved = false;

		while (true) {
			const nextX = newX + dx;
			const nextY = newY + dy;

			if (
				nextX >= 0 && nextX < GRID_SIZE &&
				nextY >= 0 && nextY < GRID_SIZE &&
				grid[nextY][nextX] === 0
			) {
				newX = nextX;
				newY = nextY;
				moved = true;
				
				if (newX === goalPos.x && newY === goalPos.y) {
					break;
				}
			} else {
				break;
			}
		}

		if (moved) {
			const dist = Math.abs(newX - playerPos.x) + Math.abs(newY - playerPos.y);
			isMoving = true;
			playerPos = { x: newX, y: newY };
			moves++;
			
			// Lock input for the duration of the slide animation
			// 0.25s is the CSS transition time
			setTimeout(() => {
				isMoving = false;
				if (newX === goalPos.x && newY === goalPos.y) {
					isGameOver = true;
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
		<p>Blocks slide until they hit a wall or an obstacle. Use the arrow keys or WASD to move.</p>
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
				<span class="label">MOVES</span>
				<span class="value">{moves}</span>
			</div>
		</div>
		
		{#snippet rightControls()}
			<button class="nav-extra-btn" onclick={nextLevel} title="New Random Puzzle">NEW [N]</button>
		{/snippet}
	</InGameMenu>

	<div class="board-wrapper">
		<div class="grid-container">
			<div class="grid" style="grid-template-columns: repeat({GRID_SIZE}, 1fr); grid-template-rows: repeat({GRID_SIZE}, 1fr);">
				{#each grid as row, y}
					{#each row as cell, x}
						<div class="cell" class:wall={cell === 1} class:goal={x === goalPos.x && y === goalPos.y}>
							{#if x === goalPos.x && y === goalPos.y}
								<div class="goal-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
								</div>
							{/if}
						</div>
					{/each}
				{/each}

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
			
			{#if isGameOver}
				<div class="win-overlay" in:fade>
					<div class="win-content">
						<h2>PUZZLE SOLVED!</h2>
						<p>Completed in {moves} moves</p>
						<div class="win-actions">
							<button class="win-btn next" onclick={nextLevel}>NEW PUZZLE [N]</button>
							<button class="win-btn restart" onclick={resetGame}>RESTART [R]</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		{#if isGameOver}
			<GameOverMenu onPlayAgain={nextLevel} onMenu={onBack} />
		{/if}
	</div>
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
		position: relative;
	}

	.stats-center {
		display: flex;
		gap: 4vmin;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 1.2vmin;
		color: rgba(255,255,255,0.3);
		font-weight: 800;
		letter-spacing: 0.1vmin;
	}

	.stat .value {
		font-size: 3vmin;
		font-weight: 900;
		color: #a5d8f8;
		text-shadow: 0 0 10px rgba(165, 216, 248, 0.4);
	}

	.nav-extra-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
		padding: 0.8vmin 1.5vmin;
		border-radius: 0.8vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.4vmin;
		transition: all 0.2s;
	}

	.nav-extra-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-color: var(--color-golden);
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2vmin;
	}

	.grid-container {
		width: 80vmin;
		height: 80vmin;
		background: rgba(255, 255, 255, 0.02);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 2vmin;
		position: relative;
		overflow: hidden;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.cell {
		border: 1px solid rgba(255, 255, 255, 0.03);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.cell.wall {
		background: linear-gradient(135deg, #4b6abe 0%, #2a3d70 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 0 15px rgba(0,0,0,0.4);
		border-radius: 0.5vmin;
		margin: 0.2vmin;
	}

	.cell.goal {
		background: rgba(255, 203, 92, 0.1);
	}

	.goal-icon {
		width: 60%;
		height: 60%;
		color: var(--color-golden);
		filter: drop-shadow(0 0 8px var(--color-golden));
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

	.win-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(15px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 20;
		text-align: center;
	}

	.win-content {
		animation: slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes slideUp {
		from { transform: translateY(30px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.win-overlay h2 {
		font-size: 6vmin;
		color: var(--color-golden);
		margin: 0;
		letter-spacing: 0.5vmin;
		text-shadow: 0 0 20px rgba(255, 203, 92, 0.3);
	}

	.win-overlay p {
		font-size: 2.5vmin;
		color: white;
		opacity: 0.8;
		margin-bottom: 4vmin;
	}

	.win-actions {
		display: flex;
		gap: 2vmin;
		justify-content: center;
	}

	.win-btn {
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-size: 1.8vmin;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.win-btn.next {
		background: var(--color-golden);
		color: black;
	}

	.win-btn.restart {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.win-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 20px rgba(0,0,0,0.3);
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
