<script lang="ts">
	import { games, allHubs, getPlayAnchorText } from './games';
</script>

<footer class="seo-footer">
	<div class="footer-content">
		<h2>More Math Games</h2>
		<p>A free collection of interactive logic puzzles, abstract strategy games, and physics simulations designed for students, educators, and curious minds of all ages.</p>
		<nav aria-label="Game Categories">
			<ul class="hub-list">
				<li><a href="/">All Math Games</a></li>
				{#each allHubs as hub}
					<li><a href="/{hub.slug}">{hub.name}</a></li>
				{/each}
			</ul>
		</nav>
		<nav aria-label="All Games">
			<ul>
				{#each games as game}
					<li><a href="/games/{game.id}">{getPlayAnchorText(game)}</a></li>
				{/each}
			</ul>
		</nav>
	</div>
</footer>

<style>
	.seo-footer {
		width: 100%;
		background: rgba(255, 255, 255, 0.02);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--game-text-muted);
		font-size: 12px;
	}

	.footer-content {
		padding: clamp(1.5rem, 4vw, 2.5rem) 1rem;
		max-width: 900px;
		margin: 0 auto;
		text-align: center;
	}

	.footer-content h2 {
		font-size: clamp(0.95rem, 1.5vw, 1.15rem);
		font-weight: 800;
		color: var(--game-text-primary);
		margin: 0 0 0.5rem;
	}

	.footer-content p {
		margin: 0 auto 1rem;
		max-width: 640px;
		line-height: 1.6;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem 1rem;
	}

	ul.hub-list {
		margin-bottom: 0.85rem;
		font-weight: 700;
	}

	li {
		margin: 0;
	}

	a {
		color: var(--game-text-soft);
		text-decoration: none;
		transition: color 0.2s;
	}

	a:hover {
		color: var(--color-bittersweet);
	}
</style>
