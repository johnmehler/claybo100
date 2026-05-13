<script lang="ts">
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';

	let { onBack } = $props();
	let instructions: any;

	const SIZE = 4;
	let tiles = $state<number[]>([]);
	let isWon = $state(false);
	let moves = $state(0);

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
		moves = 0;
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
	</Instructions>

	<InGameMenu 
		{onBack} 
		onHelp={() => instructions.open()} 
		onRestart={initGame}
	>
		<div class="score">MOVES: <span style="color: var(--color-illusion)">{moves}</span></div>
	</InGameMenu>

	<div class="board-wrapper">
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
		{#if isWon}
			<GameOverMenu onPlayAgain={initGame} onMenu={onBack} delay={800} />
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
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 4vmin;
		box-sizing: border-box;
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.board-container {
		width: 60vmin;
		height: 60vmin;
		padding: 1vmin;
		background: rgba(0,0,0,0.2);
		border-radius: 2vmin;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
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
</style>
