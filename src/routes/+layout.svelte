<script lang="ts">
	import Footer from "$lib/Footer.svelte";
	import { onMount, tick } from "svelte";
	import { afterNavigate } from "$app/navigation";

	let { children } = $props();
	const THEME_STORAGE_KEY = "mathmuseum-theme";
	let theme = $state<"light" | "dark">("dark");

	function applyTheme(nextTheme: "light" | "dark") {
		theme = nextTheme;
		document.documentElement.dataset.theme = nextTheme;
		localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
	}

	afterNavigate(async () => {
		await tick();
		if (
			typeof window !== "undefined" &&
			typeof window.gtag === "function"
		) {
			window.gtag("event", "page_view", {
				page_title: document.title,
				page_location: window.location.href,
				page_path: window.location.pathname + window.location.search,
			});
		}
	});

	onMount(() => {
		const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		applyTheme(savedTheme === "light" ? "light" : "dark");

		// Load Google Fonts asynchronously to avoid render-blocking
		const fontLink = document.createElement("link");
		fontLink.rel = "stylesheet";
		fontLink.href =
			"https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap";
		document.head.appendChild(fontLink);
	});

	$effect(() => {
		function blockArrowScroll(e: KeyboardEvent) {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			if (
				["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
					e.key,
				)
			) {
				e.preventDefault();
			}
		}
		window.addEventListener("keydown", blockArrowScroll, {
			passive: false,
		});
		return () => window.removeEventListener("keydown", blockArrowScroll);
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="shortcut icon" href="/favicon.ico" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		as="style"
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap"
	/>
</svelte:head>

<div class="byline-bar">
	<span
		>By <a
			href="https://www.johnmehler.io"
			target="_blank"
			rel="noopener noreferrer">John Mehler</a
		></span
	>
</div>

<div class="theme-switcher" role="group" aria-label="Color theme">
	<button
		type="button"
		class="theme-btn"
		class:active={theme === "light"}
		onclick={() => applyTheme("light")}
		aria-label="Light mode"
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
		<span>Light</span>
	</button>
	<button
		type="button"
		class="theme-btn"
		class:active={theme === "dark"}
		onclick={() => applyTheme("dark")}
		aria-label="Dark mode"
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
		</svg>
		<span>Dark</span>
	</button>
</div>

{@render children()}
<Footer />

<style>
	:global(:root) {
		--byline-height: 26px;
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

	:global(html[data-theme="light"]) {
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
		font-family: "Outfit", sans-serif;
		color: var(--app-text);
	}

	:global(*) {
		box-sizing: border-box;
	}

	.byline-bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		width: 100%;
		height: calc(var(--byline-height) + env(safe-area-inset-top, 0px));
		padding: env(safe-area-inset-top, 0px) 16px 0;
		box-sizing: border-box;
		flex-shrink: 0;
		background: #0a0c12;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		color: #9ca3af;
		font-family: "Courier New", Courier, monospace;
		font-size: 12px;
		letter-spacing: 0.03em;
		line-height: 1;
	}

	.byline-bar a {
		color: #f3f4f6;
		text-decoration: underline;
		text-decoration-color: rgba(243, 244, 246, 0.45);
		text-underline-offset: 2px;
		transition:
			color 0.15s ease,
			text-decoration-color 0.15s ease;
	}

	.byline-bar a:hover {
		color: #ffffff;
		text-decoration-color: #ffffff;
	}

	.theme-switcher {
		position: fixed;
		top: calc(var(--byline-height) + clamp(0.65rem, 1.5vmin, 1.1rem));
		right: clamp(0.75rem, 1.8vmin, 1.4rem);
		z-index: 900;
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		backdrop-filter: blur(10px);
	}

	.theme-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--app-muted-text);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.theme-btn:hover {
		color: var(--app-text);
	}

	.theme-btn.active {
		background: var(--app-text);
		color: var(--app-bg);
	}

	.theme-btn svg {
		width: 0.9rem;
		height: 0.9rem;
		flex-shrink: 0;
	}

	@media (max-width: 700px) {
		.theme-btn span {
			display: none;
		}

		.theme-btn {
			padding: 0.4rem;
		}
	}
</style>
