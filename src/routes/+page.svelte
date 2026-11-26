<script lang="ts">
	import {
		games,
		getGamesByCategory,
		allHubs,
		getPlayAnchorText,
	} from "$lib/games";
	import { fade } from "svelte/transition";

	const gameCategories = getGamesByCategory();

	const siteUrl = "https://onlinemath.games";
	const pageTitle = "Online Math Games - Free Online Math and Puzzle Games";
	const pageDescription =
		"onlinemath.games: a free collection of interactive logic puzzles, strategy games, and physics simulations designed to challenge your mind and spark curiosity.";

	const homeSchema = JSON.stringify({
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: "onlinemath.games",
				url: `${siteUrl}/`,
				description: pageDescription,
				inLanguage: "en",
			},
			{
				"@type": "CollectionPage",
				name: pageTitle,
				url: `${siteUrl}/`,
				description: pageDescription,
				mainEntity: {
					"@type": "ItemList",
					numberOfItems: games.length,
					itemListElement: games.map((g, index) => ({
						"@type": "ListItem",
						position: index + 1,
						name: g.label,
						url: `${siteUrl}/games/${g.id}`,
					})),
				},
			},
		],
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta
		name="keywords"
		content="free math games, online logic puzzles, interactive physics simulations, browser strategy games, classroom math games unblocked, math museum games, onlinemath.games"
	/>
	<link rel="canonical" href={`${siteUrl}/`} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={`${siteUrl}/`} />
	<meta property="og:site_name" content="onlinemath.games" />
	<meta property="og:image" content={`${siteUrl}/favicon-512.png`} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={`${siteUrl}/favicon-512.png`} />
	{@html `<script type="application/ld+json">${homeSchema}<\/script>`}
</svelte:head>

<main id="main-view" class="main-container centered">
	<div id="menu-screen" class="menu-screen" in:fade={{ duration: 400 }}>
		<header id="app-header" class="header" in:fade={{ duration: 800 }}>
			<h1 id="app-title">
				ONLINEMATH<span class="highlight">.GAMES</span>
			</h1>
			<p id="app-subtitle" class="app-subtitle">EXPLORE THE COLLECTION</p>
			<nav class="hub-nav" aria-label="Game Categories">
				{#each allHubs as hub}
					<a href="/{hub.slug}" class="hub-link">{hub.name}</a>
				{/each}
			</nav>
		</header>

		<div id="game-list" class="game-catalog">
			{#each gameCategories as category}
				<div
					class="category"
					in:fade={{ duration: 800, delay: category.delay }}
				>
					<h2 class="category-title">
						<a href="/{category.slug}" class="category-link"
							>{category.name}</a
						>
					</h2>
					<div class="game-grid">
						{#each category.games as game}
							<a
								href="/games/{game.id}"
								class="game-card {game.cardClass}"
							>
								<div class="card-icon">{@html game.icon}</div>
								<div class="card-content">
									<h3>{game.label}</h3>
									<p>{game.description}</p>
									<span class="card-cta"
										>{getPlayAnchorText(game)} &rarr;</span
									>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</main>

<style>
	.main-container {
		height: calc(100vh - var(--byline-height, 26px));
		overflow: hidden;
		background: var(--app-bg);
		display: flex;
	}

	.main-container.centered {
		align-items: stretch;
		justify-content: center;
	}

	/* Menu Screen Styles */
	.menu-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		height: 100%;
		padding: clamp(0.75rem, 1.5vmin, 1.25rem) clamp(0.9rem, 1.8vw, 1.75rem);
		overflow: hidden;
	}

	.header {
		text-align: center;
		margin-bottom: clamp(0.65rem, 1.4vmin, 1rem);
		flex-shrink: 0;
	}

	h1 {
		font-size: clamp(1.85rem, 3.8vmin, 3.1rem);
		font-weight: 900;
		letter-spacing: -0.08em;
		margin: 0;
		color: var(--app-text);
		text-transform: uppercase;
		line-height: 1;
	}

	.highlight {
		color: var(--color-bittersweet);
	}

	p.app-subtitle {
		font-size: clamp(0.64rem, 1.1vmin, 0.85rem);
		font-weight: 700;
		color: var(--app-muted-text);
		letter-spacing: 0.24em;
		margin-top: 0.25rem;
	}

	.hub-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}

	.hub-link {
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--app-muted-text);
		text-decoration: none;
		padding: 0.26rem 0.65rem;
		border-radius: 999px;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		transition:
			color 0.2s ease,
			border-color 0.2s ease;
	}

	.hub-link:hover {
		color: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
	}

	.category-link {
		color: inherit;
		text-decoration: none;
	}

	.category-link:hover {
		text-decoration: underline;
	}

	.card-cta {
		display: inline-block;
		margin-top: 0.15rem;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-bittersweet);
	}

	.game-catalog {
		width: 100%;
		flex: 1;
		min-height: 0;
		height: 100%;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: clamp(0.65rem, 1.1vw, 1.1rem);
		align-items: stretch;
	}

	.category {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		padding: clamp(0.7rem, 1.2vmin, 1rem);
		backdrop-filter: blur(8px);
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.category-title {
		font-size: clamp(0.85rem, 1.4vmin, 1.05rem);
		color: var(--color-illusion);
		margin: 0 0 0.75rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-bottom: 1px solid var(--panel-border);
		padding-bottom: 0.4rem;
		flex-shrink: 0;
	}

	.game-grid {
		display: flex;
		flex-direction: column;
		gap: clamp(0.6rem, 1.1vh, 0.95rem);
		width: 100%;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.25rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
	}

	.game-grid::-webkit-scrollbar {
		width: 5px;
	}

	.game-grid::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.18);
		border-radius: 999px;
	}

	.game-card {
		background: color-mix(in srgb, var(--panel-bg) 95%, transparent);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		padding: clamp(0.8rem, 1.3vmin, 1.15rem) clamp(0.85rem, 1.4vmin, 1.2rem);
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 1.2vmin, 1.05rem);
		cursor: pointer;
		transition:
			background 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(6px);
		color: var(--app-text);
		text-decoration: none;
		flex: none;
		height: clamp(96px, 13.5vh, 136px);
	}

	.game-card:hover {
		background: color-mix(in srgb, var(--panel-bg) 82%, var(--app-text) 8%);
		border-color: var(--color-illusion);
		transform: translateY(-1px);
	}

	.card-icon {
		background: color-mix(in srgb, var(--panel-bg) 86%, var(--app-text) 6%);
		width: clamp(2.75rem, 4.2vmin, 3.5rem);
		height: clamp(2.75rem, 4.2vmin, 3.5rem);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		transition: transform 0.4s ease;
	}

	.card-icon :global(svg) {
		width: 54%;
		height: 54%;
	}

	.card-content {
		min-width: 0;
	}

	.card-content h3 {
		margin: 0 0 0.22rem;
		font-size: clamp(0.98rem, 1.65vmin, 1.22rem);
		font-weight: 800;
		line-height: 1.18;
	}

	.card-content p {
		margin: 0;
		font-size: clamp(0.78rem, 1.18vmin, 0.92rem);
		color: var(--app-muted-text);
		line-height: 1.38;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-cta {
		display: inline-block;
		margin-top: 0.3rem;
		font-size: clamp(0.74rem, 1.08vmin, 0.85rem);
		font-weight: 700;
		color: var(--color-bittersweet);
	}

	@media (max-width: 1200px) {
		.main-container {
			height: auto;
			min-height: 100vh;
			overflow: visible;
		}

		.menu-screen {
			height: auto;
			min-height: 100vh;
			overflow-y: auto;
		}

		.game-catalog {
			flex: none;
			height: auto;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			max-width: min(980px, 96vw);
		}

		.category {
			height: auto;
		}

		.game-grid {
			display: grid;
			flex: none;
			overflow-y: visible;
			padding-right: 0;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		}

		.game-card {
			height: auto;
			min-height: 82px;
		}
	}

	@media (max-width: 700px) {
		.main-container.centered {
			align-items: flex-start;
		}

		.menu-screen {
			padding: 1.1rem 0.8rem 1.4rem;
		}

		.header {
			margin-bottom: 1rem;
		}

		.game-catalog {
			gap: 0.9rem;
		}

		.category {
			padding: 0.7rem;
		}

		.game-grid {
			grid-template-columns: 1fr;
			gap: 0.6rem;
		}

		.game-card {
			min-height: 74px;
			padding: 0.7rem;
		}

		.card-icon {
			width: 2.35rem;
			height: 2.35rem;
		}

		.card-content p {
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}
	}
</style>
</style>
