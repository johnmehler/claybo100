<script lang="ts">
	import { getGamesByCategory } from './games';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/stores';

	let { 
		activeGameActions = { restart: null, newShuffle: null, help: null }
	} = $props();

	let isSidebarCollapsed = $state(false);
	const gameCategories = getGamesByCategory();
	let openCategories = $state(Object.fromEntries(gameCategories.map(c => [c.name, true])));

	const currentPath = $derived($page.url.pathname);
</script>

<button 
	class="sidebar-toggle-floating" 
	class:is-collapsed={isSidebarCollapsed}
	onclick={() => isSidebarCollapsed = !isSidebarCollapsed}
	aria-label="Toggle Sidebar"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" role="img" aria-label="Menu Toggle Icon">
		{#if isSidebarCollapsed}
			<path d="M4 6h16M4 12h16M4 18h16" />
		{:else}
			<path d="M18 6L6 18M6 6l12 12" />
		{/if}
	</svg>
</button>

<aside class="sidebar" class:collapsed={isSidebarCollapsed} in:fly={{ x: -100, duration: 600 }}>
	<div class="sidebar-header">
		<a href="/" class="logo-wrapper">
			<h1 class="sidebar-title">ONLINEMATH<span class="highlight">.GAMES</span></h1>
		</a>
	</div>

	<nav class="sidebar-nav">
		{#if activeGameActions.help || activeGameActions.restart || activeGameActions.newShuffle}
			<div class="nav-section controls-section" in:fade>
				<p class="controls-label">GAME CONTROLS</p>
				<div class="nav-list">
					{#if activeGameActions.help}
						<button class="nav-button control-btn help" onclick={activeGameActions.help}>
							<div class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Help Icon"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div>
							<span class="nav-label-text">How to Play</span>
						</button>
					{/if}
					{#if activeGameActions.restart}
						<button class="nav-button control-btn restart" onclick={activeGameActions.restart}>
							<div class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Restart Icon"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>
							<span class="nav-label-text">Restart Game</span>
						</button>
					{/if}
					{#if activeGameActions.newShuffle}
						<button class="nav-button control-btn shuffle" onclick={activeGameActions.newShuffle}>
							<div class="nav-icon">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Shuffle Icon">
									<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
								</svg>
							</div>
							<span class="nav-label-text">New Shuffle</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<div class="nav-section">
			{#each gameCategories as category}
				<div class="sidebar-category">
					<button class="dropdown-toggle" onclick={() => openCategories[category.name] = !openCategories[category.name]}>
						<span class="sidebar-category-label">{category.name}</span>
						<svg class="chevron" class:open={openCategories[category.name]} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" role="img" aria-label="Toggle {category.name} List"><polyline points="6 9 12 15 18 9"></polyline></svg>
					</button>
					
					{#if openCategories[category.name]}
						<div class="nav-list category-list" transition:fade={{ duration: 200 }}>
							{#each category.games as game}
								<a 
									href="/games/{game.id}"
									class="nav-button" 
									class:active={currentPath === `/games/${game.id}`}
								>
									<div class="nav-icon">{@html game.icon}</div>
									<span class="nav-label-text">{game.label}</span>
									{#if currentPath === `/games/${game.id}`}
										<div class="active-indicator"></div>
									{/if}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</nav>

	<div class="sidebar-footer">
		<a href="/" class="menu-back-btn">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-label="Exit Icon"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
			<span>EXIT TO MENU</span>
		</a>
	</div>
</aside>

<style>
	/* Sidebar Styles */
	.sidebar {
		width: 32vmin;
		height: 100vh;
		background: rgba(255, 255, 255, 0.02);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		padding: 3vmin 2vmin;
		backdrop-filter: blur(20px);
		z-index: 100;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		position: sticky;
		top: 0;
		flex-shrink: 0;
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
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.logo-wrapper:hover {
		opacity: 0.8;
	}

	.sidebar-title {
		font-size: 2.2vmin;
		font-weight: 900;
		letter-spacing: -0.05vmin;
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
		margin-bottom: 1vmin;
	}

	.sidebar-category-label {
		font-size: 1.8vmin;
		color: rgba(255, 255, 255, 0.85);
		font-weight: 800;
		letter-spacing: 0.1vmin;
		text-transform: uppercase;
		margin: 0;
	}

	.controls-label {
		font-size: 1.8vmin;
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
		margin-bottom: 0.5vmin;
		border-radius: 1vmin;
		transition: background 0.2s;
	}

	.dropdown-toggle:hover {
		background: rgba(255,255,255,0.05);
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
		text-decoration: none;
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

	.control-btn.help { color: var(--color-illusion); }
	.control-btn.restart { color: var(--color-indigo); }
	.control-btn.shuffle { color: var(--color-bittersweet); }
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
		font-size: 1.5vmin;
		font-weight: 600;
		letter-spacing: 0.03vmin;
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
		text-decoration: none;
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

	.highlight {
		color: var(--color-bittersweet);
	}
</style>
