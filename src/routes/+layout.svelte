<script lang="ts">
	import Footer from '$lib/Footer.svelte';

	let { children } = $props();

	$effect(() => {
		function blockArrowScroll(e: KeyboardEvent) {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
				e.preventDefault();
			}
		}
		window.addEventListener('keydown', blockArrowScroll, { passive: false });
		return () => window.removeEventListener('keydown', blockArrowScroll);
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="shortcut icon" href="/favicon.ico" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
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
		background: var(--bg-dark);
		font-family: 'Outfit', sans-serif;
		color: white;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>

{@render children()}
<Footer />
