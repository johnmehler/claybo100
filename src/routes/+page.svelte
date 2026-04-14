<script lang="ts">
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';

	const SIZE = 4;
	let tiles = $state<number[]>([]);
	let isWon = $state(false);

	function initGame() {
		let newTiles = Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i + 1);
		newTiles.push(0); // 0 represents the empty tile

		let emptyIndex = SIZE * SIZE - 1;
		let lastMove = -1;

		// Perform 300 random valid moves from an initially solved board.
		// Doing it this way ensures the puzzle generated is always solvable.
		for (let i = 0; i < 300; i++) {
			const neighbors = getNeighbors(emptyIndex);
			// Try not to immediately backtrack for a better shuffle
			const validNeighbors = neighbors.filter(n => n !== lastMove);
			const movePool = validNeighbors.length > 0 ? validNeighbors : neighbors;
			
			const randomNeighbor = movePool[Math.floor(Math.random() * movePool.length)];
			
			[newTiles[emptyIndex], newTiles[randomNeighbor]] = [newTiles[randomNeighbor], newTiles[emptyIndex]];
			lastMove = emptyIndex;
			emptyIndex = randomNeighbor;
		}

		tiles = newTiles;
		isWon = false;
	}

	// Initialize on component mount/setup
	initGame();

	function getNeighbors(index: number) {
		const neighbors = [];
		const row = Math.floor(index / SIZE);
		const col = index % SIZE;

		if (row > 0) neighbors.push(index - SIZE); // up
		if (row < SIZE - 1) neighbors.push(index + SIZE); // down
		if (col > 0) neighbors.push(index - 1); // left
		if (col < SIZE - 1) neighbors.push(index + 1); // right
		return neighbors;
	}

	function move(index: number) {
		if (isWon) return;
		const emptyIndex = tiles.indexOf(0);
		const neighbors = getNeighbors(index);

		if (neighbors.includes(emptyIndex)) {
			// Create a new array reference to trigger reactivity
			const newTiles = [...tiles];
			[newTiles[emptyIndex], newTiles[index]] = [newTiles[index], newTiles[emptyIndex]];
			tiles = newTiles;
			
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

<svelte:head>
	<title>Sliding Tile Puzzle</title>
	<meta name="description" content="A beautiful sliding tile puzzle game">
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
</svelte:head>

<div id="game-screen" class="screen">
	{#if isWon}
		<div id="win-message" class="win-message">PUZZLE SOLVED!</div>
	{/if}

	<div id="game-board-container" class="game-container">
		<div id="tile-grid" class="grid">
			{#each tiles as tile, index (tile)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					id="tile-{tile === 0 ? 'empty' : tile}"
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
	</div>

	<button id="reset-game-btn" class="reset" onclick={initGame}>
		RESTART GAME
	</button>
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: #09090b; /* Deep rich dark background */
		font-family: 'Outfit', sans-serif;
		color: white;
	}

	.screen {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle at top right, #1a1528, #09090b 70%);
	}

	.game-container {
		width: 70vmin;
		height: 70vmin;
		padding: 1.5vmin;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 2.5vmin;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		position: relative;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(4, 1fr);
		gap: 1.5vmin;
		width: 100%;
		height: 100%;
	}

	.tile {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 6vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
		box-shadow: 0 8px 20px rgba(255, 75, 43, 0.3), inset 0 2px 2px rgba(255, 255, 255, 0.3);
		cursor: pointer;
		user-select: none;
		transition: filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s;
		text-shadow: 0 2px 6px rgba(0,0,0,0.4);
		position: relative;
		overflow: hidden;
	}

	/* Micro-interaction: subtle shimmer line on tiles */
	.tile::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 50%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
		transform: skewX(-20deg);
		transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.tile:hover:not(.empty) {
		filter: brightness(1.15) saturate(1.1);
	}

	.tile:hover:not(.empty)::after {
		left: 150%;
	}

	.tile:active:not(.empty) {
		transform: scale(0.95);
	}

	.empty {
		background: transparent;
		box-shadow: inset 0 4px 10px rgba(0,0,0,0.4);
		cursor: default;
		border: 1px dashed rgba(255, 255, 255, 0.1);
	}

	.empty::after {
		display: none;
	}

	.win-message {
		position: absolute;
		top: 6vmin;
		font-size: 5vmin;
		font-weight: 800;
		color: #4ade80;
		text-shadow: 0 0 30px rgba(74, 222, 128, 0.6);
		animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		letter-spacing: 0.3vmin;
	}

	@keyframes popIn {
		0% { transform: translateY(-30px) scale(0.8); opacity: 0; filter: blur(10px); }
		100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
	}

	button.reset {
		margin-top: 6vmin;
		padding: 1.5vmin 5vmin;
		font-size: 2vmin;
		border-radius: 5vmin;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
		color: white;
		cursor: pointer;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		font-family: inherit;
		font-weight: 800;
		letter-spacing: 0.2vmin;
	}

	button.reset:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: translateY(-3px);
		box-shadow: 0 10px 20px -5px rgba(0,0,0,0.5);
		border-color: rgba(255, 255, 255, 0.4);
	}

	button.reset:active {
		transform: translateY(1px);
	}
</style>
