<script lang="ts">
	import SlidingTiles from '$lib/SlidingTiles.svelte';
	import Pegboard from '$lib/Pegboard.svelte';
	import Hanoi from '$lib/Hanoi.svelte';
	import ShotSim from '$lib/ShotSim.svelte';
	import { fade, fly } from 'svelte/transition';

	type View = 'menu' | 'sliding-tiles' | 'pegboard' | 'hanoi' | 'shotsim';
	let currentView = $state<View>('menu');

	function setView(view: View) {
		currentView = view;
	}
</script>

<svelte:head>
	<title>Math Museum | Game Station</title>
</svelte:head>

<main id="main-view" class="main-container">
	{#if currentView === 'menu'}
		<div id="menu-screen" class="menu-screen" in:fade={{ duration: 400 }}>
			<header id="app-header" class="header" in:fade={{ duration: 800 }}>
				<h1 id="app-title">MATH <span class="highlight">MUSEUM</span></h1>
				<p id="app-subtitle" class="app-subtitle">SELECT YOUR EXPERIENCE</p>
			</header>

			<div id="game-list" class="game-grid">
				<button 
					id="select-sliding-tiles-btn"
					class="game-card sliding" 
					onclick={() => setView('sliding-tiles')}
					in:fade={{ duration: 800, delay: 200 }}
				>
					<div class="card-icon">GRID</div>
					<div class="card-content">
						<h2>Sliding Tiles</h2>
						<p>Classical 15-puzzle with a modern twist.</p>
					</div>
					<div class="card-arrow">GO</div>
				</button>

				<button 
					id="select-pegboard-btn"
					class="game-card pegboard-card" 
					onclick={() => setView('pegboard')}
					in:fade={{ duration: 800, delay: 600 }}
				>
					<div class="card-icon">DOTS</div>
					<div class="card-content">
						<h2>Pegboard</h2>
						<p>English peg solitaire. Leave only one.</p>
					</div>
					<div class="card-arrow">GO</div>
				</button>

				<button 
					id="select-hanoi-btn"
					class="game-card hanoi-card" 
					onclick={() => setView('hanoi')}
					in:fade={{ duration: 800, delay: 800 }}
				>
					<div class="card-icon">RODS</div>
					<div class="card-content">
						<h2>Hanoi</h2>
						<p>Classic tower puzzle. 3 to 8 discs.</p>
					</div>
					<div class="card-arrow">GO</div>
				</button>

				<button 
					id="select-shotsim-btn"
					class="game-card shotsim-card" 
					onclick={() => setView('shotsim')}
					in:fade={{ duration: 800, delay: 1000 }}
				>
					<div class="card-icon">ARC</div>
					<div class="card-content">
						<h2>ShotSim</h2>
						<p>Cannon physics simulator. Hit the hoop.</p>
					</div>
					<div class="card-arrow">GO</div>
				</button>
			</div>
		</div>
	{:else}
		<div id="game-viewport" class="game-frame" in:fade={{ duration: 300 }}>
			{#if currentView === 'sliding-tiles'}
				<SlidingTiles onBack={() => setView('menu')} />
			{:else if currentView === 'pegboard'}
				<Pegboard onBack={() => setView('menu')} />
			{:else if currentView === 'hanoi'}
				<Hanoi onBack={() => setView('menu')} />
			{:else if currentView === 'shotsim'}
				<ShotSim onBack={() => setView('menu')} />
			{/if}
		</div>
	{/if}
</main>

<style>
	.main-container {
		width: 100vw;
		height: 100vh;
		background: #09090b;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.menu-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding: 4vmin;
	}

	.header {
		text-align: center;
		margin-bottom: 8vmin;
	}

	h1 {
		font-size: 10vmin;
		font-weight: 800;
		letter-spacing: -0.5vmin;
		margin: 0;
		color: white;
	}

	.highlight {
		color: var(--color-bittersweet);
	}

	p.app-subtitle {
		font-size: 2.2vmin;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.8vmin;
		margin-top: 1vmin;
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(30vmin, 1fr));
		gap: 3vmin;
		width: 100%;
		max-width: 120vmin;
	}

	.game-card {
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid rgba(255, 255, 255, 0.08);
		border-radius: 3vmin;
		padding: 4vmin;
		display: flex;
		align-items: center;
		gap: 3vmin;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(10px);
		color: white;
	}

	.game-card:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-illusion);
		box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
	}

	.card-icon {
		font-size: 6vmin;
		background: rgba(255, 255, 255, 0.05);
		width: 12vmin;
		height: 12vmin;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2.5vmin;
		transition: transform 0.4s ease;
	}

	.card-content h2 {
		margin: 0 0 0.5vmin 0;
		font-size: 3.5vmin;
		font-weight: 800;
	}

	.card-content p {
		margin: 0;
		font-size: 1.8vmin;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.4;
	}

	.card-arrow {
		margin-left: auto;
		font-size: 4vmin;
		opacity: 0;
		transition: opacity 0.3s ease;
		color: var(--color-bittersweet);
	}

	.game-card:hover .card-arrow {
		opacity: 1;
	}

	/* Simple Frame for all games */
	.game-frame {
		width: 90vmin;
		height: 90vmin;
		background: rgba(255, 255, 255, 0.02);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 4vmin;
		backdrop-filter: blur(30px);
		box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}
</style>
