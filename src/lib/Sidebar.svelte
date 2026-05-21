<script lang="ts">
	import { getGamesByCategory } from './games';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const THEME_STORAGE_KEY = 'mathmuseum-theme';

	let { 
		activeGameActions = { restart: null, help: null }
	} = $props();

	let isSidebarCollapsed = $state(true);
	let isMobile = $state(false);
	let theme = $state<'light' | 'dark'>('dark');
	const gameCategories = getGamesByCategory();
	let openCategories = $state(Object.fromEntries(gameCategories.map(c => [c.name, true])));

	const currentPath = $derived($page.url.pathname);

	const handleGameSelect = () => {
		if (isMobile) {
			isSidebarCollapsed = true;
		}
	};

	function applyTheme(nextTheme: 'light' | 'dark') {
		theme = nextTheme;
		document.documentElement.dataset.theme = nextTheme;
		localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
	}

	function toggleTheme() {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	}

	onMount(() => {
		const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		if (savedTheme === 'light' || savedTheme === 'dark') {
			applyTheme(savedTheme);
		} else {
			applyTheme('dark');
		}

		const syncViewportState = () => {
			isMobile = window.innerWidth <= 1024;
		};

		syncViewportState();
		window.addEventListener("resize", syncViewportState);

		return () => {
			window.removeEventListener("resize", syncViewportState);
		};
	});
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

{#if isMobile && !isSidebarCollapsed}
	<button
		type="button"
		class="sidebar-backdrop"
		onclick={() => (isSidebarCollapsed = true)}
		aria-label="Close sidebar"
	></button>
{/if}

<aside class="sidebar" class:collapsed={isSidebarCollapsed} in:fly={{ x: -100, duration: 600 }}>
	<div class="sidebar-header">
		<a href="/" class="logo-wrapper">
			<h1 class="sidebar-title">ONLINEMATH<span class="highlight">.GAMES</span></h1>
		</a>
	</div>

	<nav class="sidebar-nav">
		{#if activeGameActions.help || activeGameActions.restart}
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
									onclick={handleGameSelect}
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
		<div class="theme-buttons">
			<button class="theme-btn" class:active={theme === 'light'} onclick={() => applyTheme('light')} aria-label="Light mode">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
				</svg>
				<span>Light</span>
			</button>
			<button class="theme-btn" class:active={theme === 'dark'} onclick={() => applyTheme('dark')} aria-label="Dark mode">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12.79A9 9 0 1 1 11.21 3c0 0 0 0 0 0a7 7 0 0 0 9.79 9.79z" />
				</svg>
				<span>Dark</span>
			</button>
		</div>

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
		background: var(--panel-bg);
		border-right: 1px solid var(--panel-border);
		display: flex;
		flex-direction: column;
		padding: 3vmin 2vmin;
		backdrop-filter: blur(20px);
		z-index: 1000;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		position: fixed;
		top: 0;
		left: 0;
		flex-shrink: 0;
	}

	.sidebar.collapsed {
		transform: translateX(-100%);
		opacity: 0;
		pointer-events: none;
	}

	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(9, 9, 11, 0.58);
		border: none;
		padding: 0;
		margin: 0;
		z-index: 990;
	}

	.sidebar-toggle-floating {
		position: fixed;
		top: 3vmin;
		left: calc(32vmin - 6vmin - 2vmin);
		width: 6vmin;
		height: 6vmin;
		background: color-mix(in srgb, var(--panel-bg) 85%, transparent);
		border: 1px solid var(--panel-border);
		border-radius: 1.5vmin;
		color: var(--app-muted-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 1100;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		backdrop-filter: blur(10px);
	}

	.sidebar-toggle-floating:hover {
		background: color-mix(in srgb, var(--panel-bg) 70%, var(--color-bittersweet) 12%);
		color: var(--app-text);
		transform: scale(1.1);
	}

	.sidebar-toggle-floating.is-collapsed {
		left: 2vmin;
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: #111;
	}

	.sidebar-toggle-floating svg {
		width: 3vmin;
		height: 3vmin;
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
		font-size: 2.0vmin;
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
		color: color-mix(in srgb, var(--app-text) 88%, transparent);
		font-weight: 800;
		letter-spacing: 0.1vmin;
		text-transform: uppercase;
		margin: 0;
	}

	.controls-label {
		font-size: 1.8vmin;
		color: var(--app-muted-text);
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
		background: color-mix(in srgb, var(--panel-bg) 88%, var(--app-text) 5%);
	}

	.chevron {
		width: 1.5vmin;
		height: 1.5vmin;
		color: var(--app-muted-text);
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
		color: var(--app-muted-text);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		position: relative;
		text-decoration: none;
	}

	.nav-button:hover {
		background: color-mix(in srgb, var(--panel-bg) 86%, var(--app-text) 6%);
		color: var(--app-text);
		transform: translateX(0.5vmin);
	}

	.nav-button.active {
		background: color-mix(in srgb, var(--panel-bg) 80%, var(--color-bittersweet) 12%);
		color: var(--app-text);
		border-color: var(--panel-border);
	}

	.control-btn.help { color: var(--app-text); }
	.control-btn.restart { color: var(--color-indigo); }
	.control-btn:hover { background: rgba(255, 255, 255, 0.05); }
	.control-btn:hover { background: color-mix(in srgb, var(--panel-bg) 82%, var(--app-text) 8%); }

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
	}

	.sidebar-footer {
		margin-top: auto;
		padding-top: 2vmin;
		border-top: 1px solid var(--panel-border);
		display: flex;
		flex-direction: column;
		gap: 1vmin;
	}

	.theme-buttons {
		display: flex;
		gap: 0.8vmin;
	}

	.theme-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6vmin;
		padding: 1.2vmin 1vmin;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 1.2vmin;
		color: var(--app-muted-text);
		font-weight: 700;
		font-size: 1.2vmin;
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.theme-btn:hover {
		background: color-mix(in srgb, var(--panel-bg) 85%, var(--app-text) 8%);
		color: var(--app-text);
	}

	.theme-btn.active {
		background: var(--app-text);
		border-color: var(--app-text);
		color: var(--app-bg);
		box-shadow: 0 0.2vmin 0.5vmin rgba(0, 0, 0, 0.2);
	}

	.theme-btn svg {
		width: 1.6vmin;
		height: 1.6vmin;
	}

	.menu-back-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5vmin;
		padding: 1.8vmin;
		background: color-mix(in srgb, var(--panel-bg) 92%, transparent);
		border: 1px solid var(--panel-border);
		border-radius: 1.2vmin;
		color: var(--app-muted-text);
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
		color: var(--app-text);
		transform: translateY(-1px);
	}

	.menu-back-btn svg {
		width: 2.2vmin;
		height: 2.2vmin;
	}

	.highlight {
		color: var(--color-bittersweet);
	}

	@media (max-width: 1024px) {
		.sidebar {
			width: min(82vw, 360px);
			padding: 1.25rem 1rem;
		}

		.sidebar-toggle-floating {
			top: 1rem;
			left: calc(min(82vw, 360px) - 2.8rem - 1rem);
			width: 2.8rem;
			height: 2.8rem;
			border-radius: 0.8rem;
		}

		.sidebar-toggle-floating.is-collapsed {
			left: 1rem;
		}

		.sidebar-toggle-floating svg {
			width: 1.4rem;
			height: 1.4rem;
		}

		.sidebar-header {
			margin-bottom: 1rem;
		}

		.sidebar-title {
			font-size: 1rem;
		}

		.sidebar-nav {
			padding-right: 0.5rem;
		}

		.controls-label,
		.sidebar-category-label {
			font-size: 0.78rem;
			letter-spacing: 0.08em;
		}

		.dropdown-toggle {
			padding: 0.7rem 0.75rem;
		}

		.nav-list {
			gap: 0.45rem;
		}

		.nav-button {
			padding: 0.75rem;
			gap: 0.65rem;
		}

		.nav-icon {
			width: 1.25rem;
			height: 1.25rem;
		}

		.nav-label-text {
			font-size: 0.98rem;
			font-weight: 700;
		}

		.menu-back-btn {
			padding: 0.9rem;
			font-size: 0.82rem;
			gap: 0.6rem;
		}

		.theme-buttons {
			gap: 0.5rem;
		}

		.theme-btn {
			padding: 0.75rem 0.6rem;
			font-size: 0.75rem;
			gap: 0.4rem;
		}

		.theme-btn svg {
			width: 1rem;
			height: 1rem;
		}

		.menu-back-btn svg {
			width: 1rem;
			height: 1rem;
		}
	}
</style>
