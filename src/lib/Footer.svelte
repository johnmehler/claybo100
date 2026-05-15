<script lang="ts">
	import { games } from './games';

	const allKeywords = [
		'brain games for kids online free',
		...games.flatMap(g => g.keywords)
	];
	
	// Remove duplicates and limit for cleanliness if needed, but the user wants "robust"
	const uniqueKeywords = [...new Set(allKeywords)];
</script>

<footer class="seo-footer" aria-hidden="true">
	<div class="footer-content">
		<h2>Math Museum - Brainy Sparks</h2>
		<p>Explore our collection of brain games for kids online free. Logic puzzles, math strategy, and physics simulations.</p>
		<p>Targeting: 
			{uniqueKeywords.join(', ')}.
		</p>
		<nav>
			<ul>
				<li><a href="/">Home - Brain Games for Kids</a></li>
				{#each games as game}
					<li><a href="/games/{game.id}">{game.label} - {game.keywords[0]}</a></li>
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
