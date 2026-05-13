<script lang="ts">
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
	import { fade, fly } from 'svelte/transition';

	type View = 'menu' | 'sliding-tiles' | 'pegboard' | 'hanoi' | 'shotsim' | 'nim' | 'knights-tour' | 'hex' | 'krypto' | 'set' | 'dotsandboxes' | 'vectorracing';
	let currentView = $state<View>('menu');
	let isSidebarCollapsed = $state(false);

	let activeGameActions = $state({
		restart: null as (() => void) | null,
		help: null as (() => void) | null,
	});

	function setView(view: View) {
		currentView = view;
		activeGameActions.restart = null;
		activeGameActions.help = null;
	}

	function registerActions(actions: { restart?: (() => void) | null, help?: (() => void) | null }) {
		activeGameActions.restart = actions.restart || null;
		activeGameActions.help = actions.help || null;
	}

	let isGamesOpen = $state(true);

	const gameCategories = [
		{
			name: 'Logic & Puzzles',
			delay: 200,
			games: [
				{ 
					id: 'sliding-tiles', 
					label: 'Sliding Tiles', 
					description: 'Classical 15-puzzle with a modern twist.',
					cardClass: 'sliding',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>` 
				},
				{ 
					id: 'pegboard', 
					label: 'Peg Solitaire', 
					description: 'English peg solitaire. Leave only one.',
					cardClass: 'pegboard-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"></circle><circle cx="8" cy="12" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="4" cy="19" r="2"></circle><circle cx="12" cy="19" r="2"></circle><circle cx="20" cy="19" r="2"></circle></svg>` 
				},
				{ 
					id: 'hanoi', 
					label: 'Hanoi', 
					description: 'Classic tower puzzle. 3 to 8 discs.',
					cardClass: 'hanoi-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="20" x2="22" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line><rect x="8" y="16" width="8" height="4" rx="1"></rect><rect x="9" y="12" width="6" height="4" rx="1"></rect><rect x="10" y="8" width="4" height="4" rx="1"></rect></svg>` 
				},
				{ 
					id: 'knights-tour', 
					label: "Knight's Tour", 
					description: 'Visit every square on the board exactly once.',
					cardClass: 'knights-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456"/><path d="m15 5 1.425-1.425"/><path d="m17 8 1.53-1.53"/><path d="M9.713 12.185 7 18"/></svg>` 
				},
				{ 
					id: 'set', 
					label: 'Set', 
					description: 'Find combinations of matching or unique attributes.',
					cardClass: 'set-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>` 
				},
				{ 
					id: 'dotsandboxes', 
					label: 'Dots & Boxes', 
					description: 'Connect dots to capture squares against AI.',
					cardClass: 'dots-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="1"></circle><circle cx="18" cy="6" r="1"></circle><circle cx="6" cy="18" r="1"></circle><circle cx="18" cy="18" r="1"></circle><rect x="6" y="6" width="12" height="12" stroke-dasharray="2 2"></rect></svg>` 
				}
			]
		},
		{
			name: 'Math & Strategy',
			delay: 400,
			games: [
				{ 
					id: 'nim', 
					label: 'Nim', 
					description: 'Mathematical strategy game of removing objects.',
					cardClass: 'nim-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/></svg>` 
				},
				{ 
					id: 'hex', 
					label: 'Hex', 
					description: 'Connect your sides on a hexagonal grid.',
					cardClass: 'hex-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/></svg>` 
				},
				{ 
					id: 'krypto', 
					label: 'Krypto', 
					description: 'Use math operators to reach the target number.',
					cardClass: 'krypto-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>` 
				}
			]
		},
		{
			name: 'Physics & Simulation',
			delay: 600,
			games: [
				{ 
					id: 'shotsim', 
					label: 'ShotSim', 
					description: 'Cannon physics simulator. Hit the hoop.',
					cardClass: 'shotsim-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21 Q 12 3, 21 12"></path><circle cx="21" cy="12" r="2"></circle><circle cx="3" cy="21" r="1.5"></circle></svg>` 
				},
				{ 
					id: 'vectorracing', 
					label: 'Vector Racing', 
					description: 'Momentum racing. Adjust velocity ±1 each turn.',
					cardClass: 'vector-card',
					icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>` 
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Math Museum | Game Station</title>
</svelte:head>

<main id="main-view" class="main-container" class:in-game={currentView !== 'menu'}>
	{#if currentView !== 'menu'}
		<button 
			class="sidebar-toggle-floating" 
			class:is-collapsed={isSidebarCollapsed}
			onclick={() => isSidebarCollapsed = !isSidebarCollapsed}
			aria-label="Toggle Sidebar"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				{#if isSidebarCollapsed}
					<path d="M4 6h16M4 12h16M4 18h16" />
				{:else}
					<path d="M18 6L6 18M6 6l12 12" />
				{/if}
			</svg>
		</button>

		<aside class="sidebar" class:collapsed={isSidebarCollapsed} in:fly={{ x: -100, duration: 600 }}>
			<div class="sidebar-header">
				<div class="logo-wrapper" onclick={() => setView('menu')} role="button" tabindex="0">
					<h1 class="sidebar-title">MATH <span class="highlight">MUSEUM</span></h1>
				</div>
			</div>

			<nav class="sidebar-nav">
				{#if activeGameActions.help || activeGameActions.restart}
					<div class="nav-section controls-section" in:fade>
						<p class="section-label">GAME CONTROLS</p>
						<div class="nav-list">
							{#if activeGameActions.help}
								<button class="nav-button control-btn help" onclick={activeGameActions.help}>
									<div class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div>
									<span class="nav-label-text">How to Play</span>
								</button>
							{/if}
							{#if activeGameActions.restart}
								<button class="nav-button control-btn restart" onclick={activeGameActions.restart}>
									<div class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>
									<span class="nav-label-text">Restart Game</span>
								</button>
							{/if}
						</div>
					</div>
				{/if}

				<div class="nav-section">
					<button class="dropdown-toggle" onclick={() => isGamesOpen = !isGamesOpen}>
						<span class="section-label">GAMES</span>
						<svg class="chevron" class:open={isGamesOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
					</button>
					
					{#if isGamesOpen}
						<div class="nav-list" transition:fade={{ duration: 200 }}>
							{#each gameCategories as category}
								<div class="sidebar-category">
									<p class="sidebar-category-label">{category.name}</p>
									{#each category.games as game}
										<button 
											class="nav-button" 
											class:active={currentView === game.id}
											onclick={() => setView(game.id as View)}
										>
											<div class="nav-icon">{@html game.icon}</div>
											<span class="nav-label-text">{game.label}</span>
											{#if currentView === game.id}
												<div class="active-indicator"></div>
											{/if}
										</button>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</nav>

			<div class="sidebar-footer">
				<button class="menu-back-btn" onclick={() => setView('menu')}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
					<span>EXIT TO MENU</span>
				</button>
			</div>
		</aside>
	{/if}

	<div class="view-content" class:centered={currentView === 'menu'}>
		{#if currentView === 'menu'}
			<div id="menu-screen" class="menu-screen" in:fade={{ duration: 400 }}>
				<header id="app-header" class="header" in:fade={{ duration: 800 }}>
					<h1 id="app-title">MATH <span class="highlight">MUSEUM</span></h1>
					<p id="app-subtitle" class="app-subtitle">SELECT YOUR EXPERIENCE</p>
				</header>

				<div id="game-list" class="game-catalog">
					{#each gameCategories as category}
						<div class="category" in:fade={{ duration: 800, delay: category.delay }}>
							<h2 class="category-title">{category.name}</h2>
							<div class="game-grid">
								{#each category.games as game}
									<button class="game-card {game.cardClass}" onclick={() => setView(game.id as View)}>
										<div class="card-icon">{@html game.icon}</div>
										<div class="card-content">
											<h2>{game.label}</h2>
											<p>{game.description}</p>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div id="game-viewport" class="game-mat" in:fade={{ duration: 300 }}>
				<div class="game-frame-adaptive">
					{#if currentView === 'sliding-tiles'}
						<SlidingTiles onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'pegboard'}
						<Pegboard onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'hanoi'}
						<Hanoi onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'shotsim'}
						<ShotSim onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'nim'}
						<Nim onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'knights-tour'}
						<KnightsTour onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'hex'}
						<Hex onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'krypto'}
						<Krypto onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'set'}
						<SetGame onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'dotsandboxes'}
						<DotsAndBoxes onBack={() => setView('menu')} {registerActions} />
					{:else if currentView === 'vectorracing'}
						<VectorRacing onBack={() => setView('menu')} {registerActions} />
					{/if}
				</div>
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

	.view-content.centered {
		align-items: center;
		justify-content: center;
	}

	/* Sidebar Styles */
	.sidebar {
		width: 32vmin;
		height: 100%;
		background: rgba(255, 255, 255, 0.02);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		padding: 3vmin 2vmin;
		backdrop-filter: blur(20px);
		z-index: 100;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
	}

	.sidebar.collapsed {
		width: 0;
		padding-left: 0;
		padding-right: 0;
		opacity: 0;
		pointer-events: none;
		transform: translateX(-100%);
		border-right: none;
	}

	.sidebar-toggle-floating {
		position: fixed;
		top: 3vmin;
		left: 26vmin;
		width: 4.5vmin;
		height: 4.5vmin;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1.2vmin;
		color: rgba(255, 255, 255, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 1000;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		backdrop-filter: blur(10px);
	}

	.sidebar-toggle-floating:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		transform: scale(1.1);
	}

	.sidebar-toggle-floating.is-collapsed {
		left: 2.5vmin;
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: black;
		box-shadow: 0 0 20px rgba(255, 110, 97, 0.4);
	}

	.sidebar-toggle-floating svg {
		width: 2.2vmin;
		height: 2.2vmin;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5vmin;
		margin-bottom: 5vmin;
	}

	.logo-wrapper {
		cursor: pointer;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.logo-wrapper:hover {
		opacity: 0.8;
	}

	.sidebar-title {
		font-size: 3vmin;
		font-weight: 900;
		letter-spacing: -0.1vmin;
		margin: 0;
	}

	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding-right: 1vmin;
	}

	.nav-section {
		margin-bottom: 4vmin;
	}

	.sidebar-category {
		margin-bottom: 2vmin;
	}

	.sidebar-category-label {
		font-size: 1.1vmin;
		color: rgba(255, 255, 255, 0.2);
		font-weight: 800;
		letter-spacing: 0.1vmin;
		text-transform: uppercase;
		margin: 1.5vmin 0 1vmin 1.5vmin;
	}

	.section-label {
		font-size: 1.2vmin;
		color: rgba(255, 255, 255, 0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
		text-transform: uppercase;
		margin: 0;
	}

	.dropdown-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 1vmin 1.5vmin;
		background: transparent;
		border: none;
		cursor: pointer;
		margin-bottom: 1vmin;
		border-radius: 1vmin;
		transition: background 0.2s;
	}

	.dropdown-toggle:hover {
		background: rgba(255,255,255,0.03);
	}

	.chevron {
		width: 1.5vmin;
		height: 1.5vmin;
		color: rgba(255,255,255,0.2);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.chevron.open {
		transform: rotate(180deg);
		color: var(--color-bittersweet);
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 0.8vmin;
		overflow: hidden;
	}

	.nav-button {
		display: flex;
		align-items: center;
		gap: 1.5vmin;
		padding: 1.5vmin;
		border-radius: 1.2vmin;
		border: 1px solid transparent;
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		position: relative;
	}

	.nav-button:hover {
		background: rgba(255, 255, 255, 0.03);
		color: white;
		transform: translateX(0.5vmin);
	}

	.nav-button.active {
		background: rgba(255, 255, 255, 0.06);
		color: white;
		border-color: rgba(255, 255, 255, 0.05);
		box-shadow: 0 4px 20px -5px rgba(255, 110, 97, 0.15);
	}

	/* Control Buttons specifically */
	.control-btn.help { color: var(--color-illusion); }
	.control-btn.restart { color: var(--color-indigo); }
	.control-btn:hover { background: rgba(255, 255, 255, 0.05); }

	.nav-icon {
		width: 3.5vmin;
		height: 3.5vmin;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.6;
		transition: all 0.3s ease;
	}

	.active .nav-icon, .control-btn .nav-icon {
		opacity: 1;
		transform: scale(1.1);
	}

	.active .nav-icon {
		color: var(--color-bittersweet);
		filter: drop-shadow(0 0 5px rgba(255, 110, 97, 0.4));
	}

	.nav-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.nav-label-text {
		font-size: 1.8vmin;
		font-weight: 600;
		letter-spacing: 0.05vmin;
	}

	.active-indicator {
		position: absolute;
		left: -1vmin;
		width: 0.6vmin;
		height: 3vmin;
		background: var(--color-bittersweet);
		border-radius: 0 1vmin 1vmin 0;
		box-shadow: 0 0 15px var(--color-bittersweet);
	}

	.sidebar-footer {
		margin-top: auto;
		padding-top: 2vmin;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.menu-back-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5vmin;
		padding: 1.8vmin;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1.2vmin;
		color: rgba(255, 255, 255, 0.4);
		font-weight: 800;
		font-size: 1.5vmin;
		cursor: pointer;
		transition: all 0.3s;
		letter-spacing: 0.1vmin;
	}

	.menu-back-btn:hover {
		background: rgba(255, 110, 97, 0.05);
		border-color: var(--color-bittersweet);
		color: white;
		transform: translateY(-1px);
	}

	.menu-back-btn svg {
		width: 2.2vmin;
		height: 2.2vmin;
	}

	/* Menu Screen Styles */
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

	/* Game Viewport Styles */
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
		box-shadow: 
			inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		max-width: 98%;
		max-height: 98%;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
