<script lang="ts">
	import { page } from '$app/stores';
	import { getGameById } from '$lib/games';
	import Sidebar from '$lib/Sidebar.svelte';
	import { fade } from 'svelte/transition';

	// Component imports
	import VectorRacing from '$lib/VectorRacing.svelte';
	import SlidingTiles from '$lib/SlidingTiles.svelte';
	import Pegboard from '$lib/Pegboard.svelte';
	import Hanoi from '$lib/Hanoi.svelte';
	import ShotSim from '$lib/ShotSim.svelte';
	import Nim from '$lib/Nim.svelte';
	import KnightsTour from '$lib/KnightsTour.svelte';
	import Hex from '$lib/Hex.svelte';
	import Krypto from '$lib/Krypto.svelte';
	import SetGame from '$lib/SetGame.svelte';
	import DotsAndBoxes from '$lib/DotsAndBoxes.svelte';
	import TracksOfGalileo from '$lib/TracksOfGalileo.svelte';
	import LunarLander from '$lib/LunarLander.svelte';
	import IceSlider from '$lib/IceSlider.svelte';
	import EpidemicSim from '$lib/EpidemicSim.svelte';

	const id = $derived($page.params.id);
	const game = $derived(getGameById(id));

	let activeGameActions = $state({
		restart: null as (() => void) | null,
		newShuffle: null as (() => void) | null,
		help: null as (() => void) | null,
	});

	function registerActions(actions: { restart?: (() => void) | null, newShuffle?: (() => void) | null, help?: (() => void) | null }) {
		activeGameActions.restart = actions.restart || null;
		activeGameActions.newShuffle = actions.newShuffle || null;
		activeGameActions.help = actions.help || null;
	}

	const gameComponents: Record<string, any> = {
		'sliding-tiles': SlidingTiles,
		'pegboard': Pegboard,
		'hanoi': Hanoi,
		'shotsim': ShotSim,
		'nim': Nim,
		'knights-tour': KnightsTour,
		'hex': Hex,
		'krypto': Krypto,
		'set': SetGame,
		'dotsandboxes': DotsAndBoxes,
		'vectorracing': VectorRacing,
		'tracksofgalileo': TracksOfGalileo,
		'lunarlander': LunarLander,
		'iceslider': IceSlider,
		'epidemicsim': EpidemicSim
	};

	const GameComponent = $derived(gameComponents[id]);
</script>

<svelte:head>
	{#if game}
		<title>{game.label} - {game.keywords.slice(0, 3).join(', ')} | Brainy Sparks Math Museum</title>
		<meta name="description" content="{game.description} Play {game.label} online. Explore our {game.keywords.join(', ')} collection for kids." />
		<meta name="keywords" content={game.keywords.join(', ')} />
	{:else}
		<title>Game Not Found | Brainy Sparks Math Museum</title>
	{/if}
</svelte:head>

<main class="main-container in-game">
	<Sidebar {activeGameActions} />

	<div class="view-content">
		{#if GameComponent}
			<div id="game-viewport" class="game-mat" in:fade={{ duration: 300 }}>
				<div class="game-frame-adaptive">
					<h1 class="seo-h1" style="position: absolute; top: -100px; opacity: 0;">{game?.label} - {game?.keywords.join(' - ')}</h1>
					<svelte:component this={GameComponent} {registerActions} />
				</div>
			</div>
		{:else}
			<div class="error-view">
				<h1>Game not found</h1>
				<a href="/">Return to Menu</a>
			</div>
		{/if}
	</div>
</main>

<style>
	.main-container {
		width: 100vw;
		height: 100vh;
		background: #09090b;
		display: flex;
		overflow: hidden;
	}

	.main-container.in-game {
		flex-direction: row;
	}

	.view-content {
		flex: 1;
		height: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.game-mat {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		background: radial-gradient(circle at 50% 50%, rgba(255, 110, 97, 0.03) 0%, transparent 70%);
	}

	.game-frame-adaptive {
		width: 98vmin;
		height: 98vmin;
		background: rgba(255, 255, 255, 0.015);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 2vmin;
		backdrop-filter: blur(30px);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		max-width: 98%;
		max-height: 98%;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.error-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: white;
	}

	.error-view a {
		color: var(--color-bittersweet);
		margin-top: 1rem;
	}
</style>
