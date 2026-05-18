<script lang="ts">
	import Footer from '$lib/Footer.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
	const THEME_STORAGE_KEY = 'mathmuseum-theme';

	onMount(() => {
		const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		const theme = savedTheme === 'light' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
	});

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
		--app-bg: #09090b;
		--app-text: #ffffff;
		--app-muted-text: rgba(255, 255, 255, 0.55);
		--game-text-primary: #ffffff;
		--game-text-muted: rgba(255, 255, 255, 0.55);
		--game-text-soft: rgba(255, 255, 255, 0.38);
		--game-text-on-accent: #ffffff;
		--panel-bg: rgba(255, 255, 255, 0.03);
		--panel-border: rgba(255, 255, 255, 0.08);
		--game-frame-bg: rgba(255, 255, 255, 0.015);
		--game-frame-border: rgba(255, 255, 255, 0.08);
		--game-frame-inner-border: rgba(255, 255, 255, 0.05);
		--game-mat-glow: rgba(255, 110, 97, 0.03);
	}

	:global(html[data-theme='light']) {
		--app-bg: #f7f1e6;
		--app-text: #2f251c;
		--app-muted-text: rgba(47, 37, 28, 0.62);
		--game-text-primary: #2f251c;
		--game-text-muted: rgba(47, 37, 28, 0.66);
		--game-text-soft: rgba(47, 37, 28, 0.52);
		--game-text-on-accent: #1f1912;
		--panel-bg: rgba(255, 250, 241, 0.82);
		--panel-border: rgba(106, 84, 58, 0.2);
		--game-frame-bg: rgba(255, 249, 238, 0.92);
		--game-frame-border: rgba(106, 84, 58, 0.2);
		--game-frame-inner-border: rgba(106, 84, 58, 0.11);
		--game-mat-glow: rgba(255, 140, 100, 0.1);
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		background: var(--app-bg);
		font-family: 'Outfit', sans-serif;
		color: var(--app-text);
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>

{@render children()}
<Footer />
