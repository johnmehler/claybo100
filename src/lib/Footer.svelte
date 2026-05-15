<script lang="ts">
	import { games } from './games';
</script>

<footer class="seo-footer" aria-hidden="true">
	<div class="footer-content">
		<h2>Brainy Sparks Math Museum</h2>
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
		position: absolute;
		top: 100%;
		left: 0;
		width: 100%;
		height: 1px;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
		background: #000;
		color: #333;
		font-size: 10px;
	}

	.footer-content {
		padding: 20px;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	li {
		margin-bottom: 5px;
	}

	a {
		color: #333;
		text-decoration: none;
	}
</style>
