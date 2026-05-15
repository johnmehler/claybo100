<script lang="ts">
	import { page } from '$app/stores';
	import { getGameById } from '$lib/games';
	import { gameGuides } from '$lib/guides';
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
	const guide = $derived(gameGuides[id] || '');
</script>

<svelte:head>
	{#if game}
		<title>{game.label} | onlinemath.games</title>
		<meta name="description" content="{game.description} Play {game.label} online for free at onlinemath.games." />
	{:else}
		<title>Game Not Found | onlinemath.games</title>
	{/if}
</svelte:head>

<main class="main-container in-game">
	<Sidebar {activeGameActions} />

	<div class="view-content">
		{#if GameComponent}
			<div id="game-viewport" class="game-mat" in:fade={{ duration: 300 }}>
				<div class="game-frame-adaptive">
					<svelte:component this={GameComponent} {registerActions} />
				</div>
			</div>
			{#if guide}
				<article class="game-guide" aria-label="{game?.label} Guide">
					{@html guide}
				</article>
			{/if}
			{#if game?.updated}
				<p class="updated-line">
					Last updated <time datetime={game.updated}>{new Date(game.updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
				</p>
			{/if}
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
		min-height: 100vh;
		background: #09090b;
		display: flex;
	}

	.main-container.in-game {
		flex-direction: row;
	}

	.view-content {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.game-mat {
		flex: 1;
		min-height: 100vh;
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

	.game-guide {
		max-width: 720px;
		margin: 0 auto;
		padding: 4vmin 3vmin;
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
		line-height: 1.7;
	}

	.game-guide :global(h2) {
		font-size: 1.4rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
		letter-spacing: -0.02em;
	}

	.game-guide :global(h3) {
		font-size: 1.05rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.game-guide :global(p) {
		margin-bottom: 1rem;
	}

	.updated-line {
		max-width: 720px;
		margin: 0 auto 3vmin;
		padding: 0 3vmin;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.35);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
</style>
