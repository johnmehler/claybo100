<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	const SIZE = 4;
	let tiles = $state<number[]>([]);
	let initialTiles = $state<number[]>([]);
	let isWon = $state(false);
	let moves = $state(0);
	let targetMoves = $state(80);

	// Solver and playback state
	let solutionPath = $state<number[]>([]);
	let shufflePath = $state<number[]>([]);
	let isPlayingSolution = $state(false);
	let isCalculating = $state(false);
	let movesPerSecond = $state(5);
	let playbackInterval: any;

	function getManhattanDistance(board: number[]) {
		let distance = 0;
		// Manhattan Distance
		for (let i = 0; i < board.length; i++) {
			const val = board[i];
			if (val === 0) continue;
			const targetIdx = val - 1;
			const targetRow = Math.floor(targetIdx / SIZE);
			const targetCol = targetIdx % SIZE;
			const currentRow = Math.floor(i / SIZE);
			const currentCol = i % SIZE;
			distance += Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
		}

		// Linear Conflict (Rows)
		for (let r = 0; r < SIZE; r++) {
			for (let c1 = 0; c1 < SIZE; c1++) {
				for (let c2 = c1 + 1; c2 < SIZE; c2++) {
					const val1 = board[r * SIZE + c1];
					const val2 = board[r * SIZE + c2];
					if (val1 === 0 || val2 === 0) continue;
					
					const t1 = val1 - 1;
					const t2 = val2 - 1;
					const tr1 = Math.floor(t1 / SIZE);
					const tr2 = Math.floor(t2 / SIZE);
					
					if (tr1 === r && tr2 === r) {
						const tc1 = t1 % SIZE;
						const tc2 = t2 % SIZE;
						if (tc1 > tc2) distance += 2;
					}
				}
			}
		}

		// Linear Conflict (Columns)
		for (let c = 0; c < SIZE; c++) {
			for (let r1 = 0; r1 < SIZE; r1++) {
				for (let r2 = r1 + 1; r2 < SIZE; r2++) {
					const val1 = board[r1 * SIZE + c];
					const val2 = board[r2 * SIZE + c];
					if (val1 === 0 || val2 === 0) continue;
					
					const t1 = val1 - 1;
					const t2 = val2 - 1;
					const tc1 = t1 % SIZE;
					const tc2 = t2 % SIZE;
					
					if (tc1 === c && tc2 === c) {
						const tr1 = Math.floor(t1 / SIZE);
						const tr2 = Math.floor(t2 / SIZE);
						if (tr1 > tr2) distance += 2;
					}
				}
			}
		}

		return distance;
	}

	function solvePuzzle() {
		const startBoard = [...initialTiles];
		const path: number[] = [];
		const limit = 80; // Absolute max for 15-puzzle
		const MAX_NODES = 200000;
		const MAX_TIME_MS = 1500;
		
		let nodesExplored = 0;
		let startTime = Date.now();
		let threshold = getManhattanDistance(startBoard);
		
		function idaSearch(board: number[], g: number, threshold: number, lastEmpty: number): number | "found" | "timeout" {
			nodesExplored++;
			if (nodesExplored > MAX_NODES || (nodesExplored % 1000 === 0 && Date.now() - startTime > MAX_TIME_MS)) {
				return "timeout";
			}

			const h = getManhattanDistance(board);
			const f = g + h;
			if (f > threshold) return f;
			if (h === 0) return "found";
			
			let min = Infinity;
			const emptyIdx = board.indexOf(0);
			const neighbors = getNeighbors(emptyIdx);
			
			for (const nextEmpty of neighbors) {
				if (nextEmpty === lastEmpty) continue;
				
				// Move
				const nextBoard = [...board];
				[nextBoard[emptyIdx], nextBoard[nextEmpty]] = [nextBoard[nextEmpty], nextBoard[emptyIdx]];
				
				path.push(nextEmpty);
				const result = idaSearch(nextBoard, g + 1, threshold, emptyIdx);
				if (result === "found") return "found";
				if (result === "timeout") return "timeout";
				if (result < min) min = result;
				path.pop();
			}
			return min;
		}

		while (threshold <= limit) {
			const result = idaSearch(startBoard, 0, threshold, -1);
			if (result === "found") return path;
			if (result === "timeout" || result === Infinity) break;
			threshold = result;
		}
		
		// Fallback: If optimal fails or times out, use the reverse of the shuffle path
		// It's not optimal, but it's guaranteed to work.
		return [...shufflePath].reverse();
	}

	function startPlayback() {
		if (isPlayingSolution || isCalculating) return;
		
		isCalculating = true;
		
		// Allow UI to update before starting heavy calculation
		setTimeout(() => {
			// If we already won, reset to initial state to show how it was solved
			tiles = [...initialTiles];
			moves = 0;
			isWon = false;
			
			const path = solvePuzzle();
			isCalculating = false;
			
			if (!path || path.length === 0) {
				alert("Could not determine a solution path.");
				return;
			}
			
			solutionPath = path;
			isPlayingSolution = true;
			let step = 0;
			
			function nextStep() {
				if (step >= solutionPath.length || !isPlayingSolution) {
					stopPlayback();
					return;
				}
				
				const targetIndex = solutionPath[step];
				move(targetIndex, true);
				step++;
				
				playbackInterval = setTimeout(nextStep, 1000 / movesPerSecond);
			}
			
			nextStep();
		}, 50);
	}

	function stopPlayback() {
		isPlayingSolution = false;
		if (playbackInterval) clearTimeout(playbackInterval);
	}

	function initGame(newShuffle = true) {
		stopPlayback();
		if (newShuffle || initialTiles.length === 0) {
			let newTiles = Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i + 1);
			newTiles.push(0);
			let emptyIndex = SIZE * SIZE - 1;
			let lastMove = -1;
			const sPath: number[] = [];
			for (let i = 0; i < 100; i++) {
				const neighbors = getNeighbors(emptyIndex);
				const validNeighbors = neighbors.filter(n => n !== lastMove);
				const movePool = validNeighbors.length > 0 ? validNeighbors : neighbors;
				const randomNeighbor = movePool[Math.floor(Math.random() * movePool.length)];
				[newTiles[emptyIndex], newTiles[randomNeighbor]] = [newTiles[randomNeighbor], newTiles[emptyIndex]];
				
				// Record the move of the EMPTY tile (which tile was swapped into the empty space)
				sPath.push(emptyIndex);
				
				lastMove = emptyIndex;
				emptyIndex = randomNeighbor;
			}
			initialTiles = [...newTiles];
			tiles = newTiles;
			shufflePath = sPath;
		} else {
			tiles = [...initialTiles];
		}
		isWon = false;
		moves = 0;
	}

	initGame();

	$effect(() => {
		registerActions({
			restart: () => initGame(false),
			newShuffle: () => initGame(true),
			help: () => instructions.open()
		});

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			const key = e.key.toLowerCase();
			if (key === 'r') {
				initGame(false);
			} else if (key === 'n') {
				initGame(true);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	function getNeighbors(index: number) {
		const neighbors = [];
		const row = Math.floor(index / SIZE);
		const col = index % SIZE;
		if (row > 0) neighbors.push(index - SIZE);
		if (row < SIZE - 1) neighbors.push(index + SIZE);
		if (col > 0) neighbors.push(index - 1);
		if (col < SIZE - 1) neighbors.push(index + 1);
		return neighbors;
	}

	function move(index: number, force = false) {
		if ((isWon || isPlayingSolution) && !force) return;
		const emptyIndex = tiles.indexOf(0);
		const neighbors = getNeighbors(index);
		if (neighbors.includes(emptyIndex)) {
			const newTiles = [...tiles];
			[newTiles[emptyIndex], newTiles[index]] = [newTiles[index], newTiles[emptyIndex]];
			tiles = newTiles;
			moves++;
			checkWin();
		}
	}

	function checkWin() {
		for (let i = 0; i < tiles.length - 1; i++) {
			if (tiles[i] !== i + 1) return;
		}
		isWon = true;
	}
</script>

<div id="sliding-tiles-game" class="game-inner">
	<Instructions bind:this={instructions} gameId="sliding_tiles" title="Sliding Tiles">
		<p><strong>Goal:</strong> Order the numbered tiles from 1 to 15.</p>
		<p>Click a tile adjacent to the empty space to slide it into the empty space. Arrange them in numerical order with the empty space at the bottom right.</p>
		<p><strong>Shortcuts:</strong> Press <strong>R</strong> to restart the current puzzle, or <strong>N</strong> for a new shuffle.</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">MOVES</span>
				<span class="value">{moves}</span>
			</div>
			<div class="stat">
				<span class="label">TARGET</span>
				<span class="value">{targetMoves}</span>
			</div>
		</div>
		<div id="sliding-board-container" class="board-container">
			<div id="sliding-grid" class="grid">
				{#each tiles as tile, index (tile)}
					<div
						id="tile-{tile}"
						animate:flip={{ duration: 300, easing: quintOut }}
						class="tile {tile === 0 ? 'empty' : ''}"
						role="button"
						tabindex={tile === 0 ? -1 : 0}
						onclick={() => move(index)}
						onkeydown={(e) => e.key === 'Enter' && move(index)}
					>
						{tile !== 0 ? tile : ''}
					</div>
				{/each}
			</div>
			{#if isWon}
				<div class="completion-overlay" transition:fade></div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		{#if isCalculating}
			<div class="calculating-indicator" transition:fade>
				<span class="pulse">CALCULATING OPTIMAL PATH...</span>
			</div>
		{:else if isPlayingSolution}
			<div class="playback-controls" transition:fade>
				<div class="speed-control">
					<span class="speed-label">SPEED: {movesPerSecond} M/S</span>
					<input type="range" min="1" max="20" bind:value={movesPerSecond} class="speed-slider" />
				</div>
				<button class="stop-btn" onclick={stopPlayback}>STOP</button>
			</div>
		{:else if isWon}
			<GameOverMenu onPlayAgain={initGame} onMenu={onBack} onShowOptimal={startPlayback} delay={800} />
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
	}

	.score {
		font-size: 3vmin;
		font-weight: 900;
		letter-spacing: 2px;
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 1vmin 2vmin;
		box-sizing: border-box;
		overflow: hidden;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		gap: 8vmin;
		margin-bottom: 2vmin;
		width: 100%;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 1.4vmin;
		color: rgba(255,255,255,0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
		text-transform: uppercase;
	}

	.stat .value {
		font-size: 5vmin;
		font-weight: 900;
		color: var(--color-illusion);
	}

	.bottom-bar {
		height: 10vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.board-container {
		width: 75vmin;
		height: 75vmin;
		padding: 1.5vmin;
		background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 3vmin;
		box-shadow: inset 0 2px 20px rgba(0,0,0,0.5);
		position: relative;
		overflow: hidden;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(4, 1fr);
		gap: 1vmin;
		width: 100%;
		height: 100%;
	}

	.tile {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 5vmin;
		font-weight: 800;
		border-radius: 1vmin;
		background: var(--color-bittersweet);
		color: white;
		cursor: pointer;
		user-select: none;
		transition: background 0.2s, filter 0.2s;
	}
	.tile:hover:not(.empty) {
		background: var(--color-illusion);
		filter: brightness(1.1);
	}
	.tile:active:not(.empty) {
		filter: brightness(0.9);
	}

	.empty {
		background: transparent;
		cursor: default;
	}

	.completion-overlay {
		position: absolute;
		top: 0;
		left: -150%;
		width: 150%;
		height: 100%;
		background: linear-gradient(
			to right,
			rgba(255, 255, 255, 0) 0%,
			rgba(200, 200, 200, 0.2) 30%,
			rgba(255, 255, 255, 0.5) 50%,
			rgba(200, 200, 200, 0.2) 70%,
			rgba(255, 255, 255, 0) 100%
		);
		transform: skewX(-25deg);
		animation: swoosh 0.8s ease-in-out forwards;
		pointer-events: none;
		z-index: 20;
	}

	@keyframes swoosh {
		0% { left: -150%; }
		100% { left: 150%; }
	}

	.playback-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5vmin;
		background: rgba(0, 0, 0, 0.4);
		padding: 2vmin 4vmin;
		border-radius: 2vmin;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.speed-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5vmin;
		width: 30vmin;
	}

	.speed-label {
		font-size: 1.2vmin;
		font-weight: 800;
		color: var(--color-illusion);
		letter-spacing: 0.1vmin;
	}

	.speed-slider {
		width: 100%;
		accent-color: var(--color-bittersweet);
		cursor: pointer;
	}

	.stop-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 1vmin 3vmin;
		border-radius: 0.8vmin;
		font-size: 1.6vmin;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.2s;
	}

	.stop-btn:hover {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
	}

	.calculating-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-illusion);
		font-weight: 900;
		font-size: 2vmin;
		letter-spacing: 0.3vmin;
	}

	.pulse {
		animation: pulse 1.5s infinite ease-in-out;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; transform: scale(0.98); }
		50% { opacity: 1; transform: scale(1); }
	}
</style>
