<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
</svelte:head>

<style>
	:global(:root) {
		--color-bittersweet: #ff6e61;
		--color-golden: #ffcb5c;
		--color-apple: #69af4b;
		--color-indigo: #4b6abe;
		--color-illusion: #f8a5c2;
		--bg-dark: #09090b;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--bg-dark);
		font-family: 'Outfit', sans-serif;
		color: white;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>

{@render children()}
