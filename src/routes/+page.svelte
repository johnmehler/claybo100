<script lang="ts">
	import SlidingTiles from '$lib/SlidingTiles.svelte';
	import Pegboard from '$lib/Pegboard.svelte';
	import Hanoi from '$lib/Hanoi.svelte';
	import ShotSim from '$lib/ShotSim.svelte';
	import RushHour from '$lib/RushHour.svelte';
	import Nim from '$lib/Nim.svelte';
	import KnightsTour from '$lib/KnightsTour.svelte';
	import Hex from '$lib/Hex.svelte';
	import Krypto from '$lib/Krypto.svelte';
	import SetGame from '$lib/SetGame.svelte';
	import DotsAndBoxes from '$lib/DotsAndBoxes.svelte';
	import { fade, fly } from 'svelte/transition';

	type View = 'menu' | 'sliding-tiles' | 'pegboard' | 'hanoi' | 'shotsim' | 'rushhour' | 'nim' | 'knights-tour' | 'hex' | 'krypto' | 'set' | 'dotsandboxes';
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

			<div id="game-list" class="game-catalog">
				<div class="category" in:fade={{ duration: 800, delay: 200 }}>
					<h2 class="category-title">Logic & Puzzles</h2>
					<div class="game-grid">
						<button id="select-sliding-tiles-btn" class="game-card sliding" onclick={() => setView('sliding-tiles')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></div>
							<div class="card-content"><h2>Sliding Tiles</h2><p>Classical 15-puzzle with a modern twist.</p></div>
						</button>
						<button id="select-pegboard-btn" class="game-card pegboard-card" onclick={() => setView('pegboard')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"></circle><circle cx="8" cy="12" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="4" cy="19" r="2"></circle><circle cx="12" cy="19" r="2"></circle><circle cx="20" cy="19" r="2"></circle></svg></div>
							<div class="card-content"><h2>Peg Solitaire</h2><p>English peg solitaire. Leave only one.</p></div>
						</button>
						<button id="select-hanoi-btn" class="game-card hanoi-card" onclick={() => setView('hanoi')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="20" x2="22" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line><rect x="8" y="16" width="8" height="4" rx="1"></rect><rect x="9" y="12" width="6" height="4" rx="1"></rect><rect x="10" y="8" width="4" height="4" rx="1"></rect></svg></div>
							<div class="card-content"><h2>Hanoi</h2><p>Classic tower puzzle. 3 to 8 discs.</p></div>
						</button>
						<button id="select-rushhour-btn" class="game-card rushhour-card" onclick={() => setView('rushhour')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="10" height="4" rx="1"></rect><rect x="15" y="5" width="4" height="10" rx="1"></rect><rect x="5" y="11" width="4" height="8" rx="1"></rect><rect x="11" y="15" width="8" height="4" rx="1"></rect></svg></div>
							<div class="card-content"><h2>Rush Hour</h2><p>Sliding block logic puzzle.</p></div>
						</button>
						<button class="game-card knights-card" onclick={() => setView('knights-tour')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5,2A1.5,1.5 0 0,1 19,3.5V10A1.5,1.5 0 0,1 17.5,11.5H16.5L13.82,14.18C13.56,14.44 13.25,14.62 12.89,14.71L9.12,15.54C9.56,16.34 10.35,17 11.5,17H17V19H7V17L8.68,14.18L6.4,11.39C5.54,10.32 5,8.96 5,7.5A5.5,5.5 0 0,1 10.5,2H17.5M10.5,4A3.5,3.5 0 0,0 7,7.5C7,8.65 7.42,9.66 8.08,10.45L10.33,13.26L13.3,12.6C13.43,12.57 13.55,12.5 13.63,12.42L15.5,10.54V4H10.5M17.5,4V10H19V4H17.5M13,6A1,1 0 0,1 14,7A1,1 0 0,1 13,8A1,1 0 0,1 12,7A1,1 0 0,1 13,6Z"/></svg></div>
							<div class="card-content"><h2>Knight's Tour</h2><p>Visit every square on the board exactly once.</p></div>
						</button>
						<button class="game-card set-card" onclick={() => setView('set')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></div>
							<div class="card-content"><h2>Set</h2><p>Find combinations of matching or unique attributes.</p></div>
						</button>
						<button class="game-card dots-card" onclick={() => setView('dotsandboxes')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="1"></circle><circle cx="18" cy="6" r="1"></circle><circle cx="6" cy="18" r="1"></circle><circle cx="18" cy="18" r="1"></circle><rect x="6" y="6" width="12" height="12" stroke-dasharray="2 2"></rect></svg></div>
							<div class="card-content"><h2>Dots & Boxes</h2><p>Connect dots to capture squares against AI.</p></div>
						</button>
					</div>
				</div>

				<div class="category" in:fade={{ duration: 800, delay: 400 }}>
					<h2 class="category-title">Math & Strategy</h2>
					<div class="game-grid">
						<button class="game-card nim-card" onclick={() => setView('nim')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/></svg></div>
							<div class="card-content"><h2>Nim</h2><p>Mathematical strategy game of removing objects.</p></div>
						</button>
						<button class="game-card hex-card" onclick={() => setView('hex')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/></svg></div>
							<div class="card-content"><h2>Hex</h2><p>Connect your sides on a hexagonal grid.</p></div>
						</button>
						<button class="game-card krypto-card" onclick={() => setView('krypto')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
							<div class="card-content"><h2>Krypto</h2><p>Use math operators to reach the target number.</p></div>
						</button>
					</div>
				</div>

				<div class="category" in:fade={{ duration: 800, delay: 600 }}>
					<h2 class="category-title">Physics & Simulation</h2>
					<div class="game-grid">
						<button id="select-shotsim-btn" class="game-card shotsim-card" onclick={() => setView('shotsim')}>
							<div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21 Q 12 3, 21 12"></path><circle cx="21" cy="12" r="2"></circle><circle cx="3" cy="21" r="1.5"></circle></svg></div>
							<div class="card-content"><h2>ShotSim</h2><p>Cannon physics simulator. Hit the hoop.</p></div>
						</button>
					</div>
				</div>
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
			{:else if currentView === 'rushhour'}
				<RushHour onBack={() => setView('menu')} />
			{:else if currentView === 'nim'}
				<Nim onBack={() => setView('menu')} />
			{:else if currentView === 'knights-tour'}
				<KnightsTour onBack={() => setView('menu')} />
			{:else if currentView === 'hex'}
				<Hex onBack={() => setView('menu')} />
			{:else if currentView === 'krypto'}
				<Krypto onBack={() => setView('menu')} />
			{:else if currentView === 'set'}
				<SetGame onBack={() => setView('menu')} />
			{:else if currentView === 'dotsandboxes'}
				<DotsAndBoxes onBack={() => setView('menu')} />
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
		overflow-y: auto;
	}

	.header {
		text-align: center;
		margin-bottom: 4vmin;
	}

	h1 {
		font-size: 7vmin;
		font-weight: 900;
		letter-spacing: -0.3vmin;
		margin: 0;
		color: white;
	}

	.highlight {
		color: var(--color-bittersweet);
	}

	p.app-subtitle {
		font-size: 1.8vmin;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.6vmin;
		margin-top: 0.5vmin;
	}

	.game-catalog {
		width: 100%;
		max-width: 140vmin;
		display: flex;
		flex-direction: column;
		gap: 3vmin;
	}

	.category-title {
		font-size: 2vmin;
		color: var(--color-illusion);
		margin: 0 0 1.5vmin 1vmin;
		font-weight: 800;
		letter-spacing: 0.2vmin;
		text-transform: uppercase;
		border-bottom: 1px solid rgba(255,255,255,0.05);
		padding-bottom: 0.5vmin;
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(28vmin, 1fr));
		gap: 1.5vmin;
		width: 100%;
	}

	.game-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 2vmin;
		padding: 2vmin;
		display: flex;
		align-items: center;
		gap: 2vmin;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(10px);
		color: white;
	}

	.game-card:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-illusion);
		transform: translateY(-2px);
		box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5);
	}

	.card-icon {
		background: rgba(255, 255, 255, 0.05);
		width: 7vmin;
		height: 7vmin;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 1.5vmin;
		transition: transform 0.4s ease;
	}

	.card-icon svg {
		width: 50%;
		height: 50%;
	}

	.card-content h2 {
		margin: 0 0 0.2vmin 0;
		font-size: 2.2vmin;
		font-weight: 800;
	}

	.card-content p {
		margin: 0;
		font-size: 1.4vmin;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.3;
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
		width: 95vmin;
		height: 95vmin;
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
