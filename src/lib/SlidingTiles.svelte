<script lang="ts">
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';

	let { onBack } = $props();

	const SIZE = 4;
	let tiles = $state<number[]>([]);
	let isWon = $state(false);

	function initGame() {
		let newTiles = Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i + 1);
		newTiles.push(0);
		let emptyIndex = SIZE * SIZE - 1;
		let lastMove = -1;
		for (let i = 0; i < 300; i++) {
			const neighbors = getNeighbors(emptyIndex);
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

	initGame();

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

	function move(index: number) {
		if (isWon) return;
		const emptyIndex = tiles.indexOf(0);
		const neighbors = getNeighbors(index);
		if (neighbors.includes(emptyIndex)) {
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

<div id="sliding-tiles-game" class="game-inner">
	<button id="back-to-menu-sliding" class="back-btn" onclick={onBack}>
		← MENU
	</button>

	{#if isWon}
		<div id="sliding-win-msg" class="win-message">EXCELLENT!</div>
	{/if}

	<div id="sliding-board-container" class="board-container">
		<div id="sliding-grid" class="grid">
			{#each tiles as tile, index (tile)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
	</div>

	<button id="restart-sliding" class="action-btn" onclick={initGame}>
		RESTART
	</button>
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.back-btn {
		position: absolute;
		top: 4vmin;
		left: 4vmin;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
		padding: 1vmin 2.5vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s;
	}
	.back-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--color-indigo);
		color: white;
	}

	.board-container {
		width: 60vmin;
		height: 60vmin;
		padding: 1vmin;
		background: rgba(0,0,0,0.2);
		border-radius: 2vmin;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
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

	.win-message {
		position: absolute;
		top: 8vmin;
		font-size: 4vmin;
		font-weight: 800;
		color: var(--color-apple);
	}

	.action-btn {
		margin-top: 4vmin;
		padding: 1.5vmin 4vmin;
		font-size: 2vmin;
		border-radius: 1vmin;
		border: none;
		background: var(--color-indigo);
		color: white;
		cursor: pointer;
		font-weight: 800;
		transition: filter 0.2s;
	}
	.action-btn:hover {
		filter: brightness(1.2);
	}
</style>
