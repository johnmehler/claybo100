<script lang="ts">
	import { getGamesByCategory } from '$lib/games';
	import { fade } from 'svelte/transition';

	const gameCategories = getGamesByCategory();
</script>

<svelte:head>
	<title>The Math Museum | Interactive Logic & Math Games</title>
	<meta name="description" content="Explore The Math Museum: a free collection of interactive logic puzzles, strategy games, and physics simulations designed to challenge your mind and spark curiosity." />
</svelte:head>

<main id="main-view" class="main-container centered">
	<div id="menu-screen" class="menu-screen" in:fade={{ duration: 400 }}>
		<header id="app-header" class="header" in:fade={{ duration: 800 }}>
			<h1 id="app-title">THE <span class="highlight">MATH MUSEUM</span></h1>
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
		background: #09090b;
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
		justify-content: center;
		width: 100%;
		min-height: 100vh;
		padding: 4vmin;
		overflow-y: auto;
	}

	.header {
		text-align: center;
		margin-bottom: 4vmin;
	}

	h1 {
		font-size: 8vmin;
		font-weight: 900;
		letter-spacing: -0.4vmin;
		margin: 0;
		color: white;
		text-transform: uppercase;
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
		text-decoration: none;
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

	.card-icon :global(svg) {
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
</style>
