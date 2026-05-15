<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	import { fade } from 'svelte/transition';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let isGameOver = $state(false);
	let moves = $state(0);

	function resetGame() {
		moves = 0;
		isGameOver = false;
		// Game logic will go here
	}

	$effect(() => {
		registerActions({
			restart: resetGame,
			help: () => instructions.open()
		});
	});
</script>

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="ice_slider" title="Ice Slider Puzzle">
		<p><strong>Goal:</strong> Slide the block to the goal.</p>
		<p>Blocks slide until they hit a wall or an obstacle. Use the arrow keys or swipe to move.</p>
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
	</InGameMenu>

	<div class="board-wrapper">
		<div class="placeholder-content">
			<div class="ice-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M2 12h20"/><rect x="7" y="4" width="10" height="8" rx="1"/><path d="M7 12l-2 8h14l-2-8"/>
				</svg>
			</div>
			<h2>Ice Slider Puzzle</h2>
			<p>Coming Soon...</p>
		</div>
	</div>

	<div class="bottom-bar">
		{#if isGameOver}
			<GameOverMenu onPlayAgain={resetGame} onMenu={onBack} />
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
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2vmin;
	}

	.placeholder-content {
		text-align: center;
		opacity: 0.5;
	}

	.ice-icon {
		width: 15vmin;
		height: 15vmin;
		margin: 0 auto 2vmin;
		color: #a5d8f8;
	}

	.ice-icon svg {
		width: 100%;
		height: 100%;
	}

	h2 {
		font-size: 4vmin;
		margin: 0;
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
