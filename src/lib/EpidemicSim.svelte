<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let isGameOver = $state(false);
	let days = $state(0);
	let stats = $state({
		susceptible: 1000,
		infected: 1,
		recovered: 0,
		dead: 0
	});

	function resetGame() {
		days = 0;
		isGameOver = false;
		stats = {
			susceptible: 1000,
			infected: 1,
			recovered: 0,
			dead: 0
		};
	}

	$effect(() => {
		registerActions({
			restart: resetGame,
			help: () => instructions.open()
		});
	});
</script>

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="epidemic_sim" title="Epidemic Spread Simulator">
		<p><strong>Goal:</strong> Observe how viruses spread through a population.</p>
		<p>Adjust parameters to see the impact of social distancing, mask-wearing, and vaccination.</p>
	</Instructions>

	<InGameMenu 
		onBack={onBack} 
		onHelp={() => instructions.open()} 
		onRestart={resetGame}
	>
		<div class="stats-center">
			<div class="stat">
				<span class="label">DAY</span>
				<span class="value">{days}</span>
			</div>
			<div class="stat">
				<span class="label">INFECTED</span>
				<span class="value">{stats.infected}</span>
			</div>
		</div>
	</InGameMenu>

	<div class="board-wrapper">
		<div class="sim-mat">
			<div class="placeholder-msg">
				<h2>Epidemic Simulation Mat</h2>
				<p>Coming Soon: Dynamic SIR model visualization.</p>
			</div>
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
		color: var(--color-bittersweet);
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2vmin;
	}

	.sim-mat {
		width: 80vmin;
		height: 60vmin;
		background: rgba(255, 255, 255, 0.02);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 2vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		backdrop-filter: blur(10px);
	}

	.placeholder-msg {
		text-align: center;
		opacity: 0.5;
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
