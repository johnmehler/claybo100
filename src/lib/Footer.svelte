<script lang="ts">
	import { games } from './games';
</script>

<footer class="seo-footer">
	<div class="footer-content">
		<h2>onlinemath.games</h2>
		<p>A free collection of interactive logic puzzles, abstract strategy games, and physics simulations designed for students, educators, and curious minds of all ages.</p>
		<nav>
			<ul>
				<li><a href="/">Home</a></li>
				{#each games as game}
					<li><a href="/games/{game.id}">{game.label}</a></li>
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
		color: rgba(255, 255, 255, 0.4);
		font-size: 12px;
	}

	.footer-content {
		padding: 4vmin;
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
	}

	.footer-content h2 {
		font-size: 2vmin;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1vmin;
	}

	.footer-content p {
		margin: 0 0 2vmin;
		line-height: 1.6;
	}

	ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.5vmin;
	}

	li {
		margin: 0;
	}

	a {
		color: rgba(255, 255, 255, 0.3);
		text-decoration: none;
		transition: color 0.2s;
	}

	a:hover {
		color: var(--color-bittersweet);
	}
</style>
