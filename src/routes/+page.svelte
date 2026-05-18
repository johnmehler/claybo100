<script lang="ts">
	import { getGamesByCategory } from '$lib/games';
	import { fade } from 'svelte/transition';

	const gameCategories = getGamesByCategory();
</script>

<svelte:head>
	<title>Online Math Games - Free Online Math and Puzzle Games</title>
	<meta name="description" content="onlinemath.games: a free collection of interactive logic puzzles, strategy games, and physics simulations designed to challenge your mind and spark curiosity." />
</svelte:head>

<main id="main-view" class="main-container centered">
	<div id="menu-screen" class="menu-screen" in:fade={{ duration: 400 }}>
		<header id="app-header" class="header" in:fade={{ duration: 800 }}>
			<h1 id="app-title">ONLINEMATH<span class="highlight">.GAMES</span></h1>
			<p id="app-subtitle" class="app-subtitle">EXPLORE THE COLLECTION</p>
		</header>

		<div id="game-list" class="game-catalog">
			{#each gameCategories as category}
				<div class="category" in:fade={{ duration: 800, delay: category.delay }}>
					<h2 class="category-title">{category.name}</h2>
					<div class="game-grid">
						{#each category.games as game}
							<a href="/games/{game.id}" class="game-card {game.cardClass}">
								<div class="card-icon">{@html game.icon}</div>
								<div class="card-content">
									<h2>{game.label}</h2>
									<p>{game.description}</p>
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
		width: 100vw;
		min-height: 100vh;
		background: var(--app-bg);
		display: flex;
	}

	.main-container.centered {
		align-items: center;
		justify-content: center;
	}

	/* Menu Screen Styles */
	.menu-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		min-height: 100vh;
		padding: clamp(1.35rem, 2.8vmin, 2.3rem) clamp(1rem, 2.8vmin, 2.6rem);
		overflow-y: auto;
	}

	.header {
		text-align: center;
		margin-bottom: clamp(1rem, 2.5vmin, 1.8rem);
	}

	h1 {
		font-size: clamp(2.15rem, 4.8vmin, 3.8rem);
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
		font-size: clamp(0.68rem, 1.35vmin, 0.95rem);
		font-weight: 700;
		color: var(--app-muted-text);
		letter-spacing: 0.24em;
		margin-top: 0.3rem;
	}

	.game-catalog {
		width: 100%;
		max-width: min(1400px, 96vw);
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1rem, 2.2vmin, 1.8rem);
	}

	.category {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 16px;
		padding: clamp(0.85rem, 1.9vmin, 1.25rem);
		backdrop-filter: blur(8px);
	}

	.category-title {
		font-size: clamp(0.82rem, 1.5vmin, 1rem);
		color: var(--color-illusion);
		margin: 0 0 0.85rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		border-bottom: 1px solid var(--panel-border);
		padding-bottom: 0.4rem;
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: clamp(0.65rem, 1.2vmin, 1rem);
		width: 100%;
	}

	.game-card {
		background: color-mix(in srgb, var(--panel-bg) 95%, transparent);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		padding: 0.8rem 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(6px);
		color: var(--app-text);
		text-decoration: none;
		min-height: 78px;
	}

	.game-card:hover {
		background: color-mix(in srgb, var(--panel-bg) 82%, var(--app-text) 8%);
		border-color: var(--color-illusion);
		transform: translateY(-1px);
	}

	.card-icon {
		background: color-mix(in srgb, var(--panel-bg) 86%, var(--app-text) 6%);
		width: 2.65rem;
		height: 2.65rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.65rem;
		transition: transform 0.4s ease;
	}

	.card-icon :global(svg) {
		width: 50%;
		height: 50%;
	}

	.card-content h2 {
		margin: 0 0 0.2rem;
		font-size: clamp(0.94rem, 1.6vmin, 1.1rem);
		font-weight: 800;
		line-height: 1.2;
	}

	.card-content p {
		margin: 0;
		font-size: clamp(0.74rem, 1.18vmin, 0.86rem);
		color: var(--app-muted-text);
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@media (max-width: 1200px) {
		.game-catalog {
			grid-template-columns: 1fr;
			max-width: min(980px, 96vw);
		}

		.game-grid {
			grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
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
