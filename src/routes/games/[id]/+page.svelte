<script lang="ts">
	import { browser } from "$app/environment";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { getGameById, getCategoryByGameId, getPlayAnchorText } from "$lib/games";
	import { gameGuides } from "$lib/guides";
	import { gameSEO, gameHowTo, type HowToStep } from "$lib/seo";
	import Sidebar from "$lib/Sidebar.svelte";
	import { fade } from "svelte/transition";
	import type { Component } from "svelte";

	const id = $derived($page.params.id ?? "");
	const game = $derived(getGameById(id));
	const category = $derived(getCategoryByGameId(id));
	const relatedGames = $derived(
		category ? category.games.filter((g) => g.id !== id) : [],
	);
	const featuredGameIds = [
		"blockdude",
		"hanoi",
		"lemonadestand",
		"krypto",
		"lunarlander",
		"lasermaze",
	];
	const popularGames = $derived(
		featuredGameIds
			.filter((fid) => fid !== id && !relatedGames.some((r) => r.id === fid))
			.map((fid) => getGameById(fid))
			.filter((g): g is NonNullable<ReturnType<typeof getGameById>> => Boolean(g)),
	);

	let activeGameActions = $state({
		restart: null as (() => void) | null,
		newShuffle: null as (() => void) | null,
		help: null as (() => void) | null,
	});

	function registerActions(actions: {
		restart?: (() => void) | null;
		newShuffle?: (() => void) | null;
		help?: (() => void) | null;
	}) {
		activeGameActions.restart = actions.restart || null;
		activeGameActions.newShuffle = actions.newShuffle || null;
		activeGameActions.help = actions.help || null;
	}

	function onBack() {
		goto("/");
	}

	const gameLoaders: Record<string, () => Promise<{ default: Component<any> }>> = {
		"sliding-tiles": () => import("$lib/SlidingTiles.svelte"),
		pegboard: () => import("$lib/Pegboard.svelte"),
		hanoi: () => import("$lib/Hanoi.svelte"),
		shotsim: () => import("$lib/ShotSim.svelte"),
		nim: () => import("$lib/Nim.svelte"),
		"knights-tour": () => import("$lib/KnightsTour.svelte"),
		hex: () => import("$lib/Hex.svelte"),
		krypto: () => import("$lib/Krypto.svelte"),
		set: () => import("$lib/SetGame.svelte"),
		dotsandboxes: () => import("$lib/DotsAndBoxes.svelte"),
		vectorracing: () => import("$lib/VectorRacing.svelte"),
		tracksofgalileo: () => import("$lib/TracksOfGalileo.svelte"),
		lunarlander: () => import("$lib/LunarLander.svelte"),
		iceslider: () => import("$lib/IceSlider.svelte"),
		epidemicsim: () => import("$lib/EpidemicSim.svelte"),
		lasermaze: () => import("$lib/LaserMaze.svelte"),
		blockdude: () => import("$lib/BlockDude.svelte"),
		lemonadestand: () => import("$lib/LemonadeStand.svelte"),
		apexindustries: () => import("$lib/ApexIndustries.svelte"),
		arithmetic: () => import("$lib/MathDrill.svelte"),
		calculus: () => import("$lib/CalculusGame.svelte"),
		trig: () => import("$lib/TrigGame.svelte"),
		kakuro: () => import("$lib/Kakuro.svelte"),
		"addition-subtraction": () => import("$lib/MathDrill.svelte"),
		"multiplication-drills": () => import("$lib/MathDrill.svelte"),
		"division-drills": () => import("$lib/MathDrill.svelte"),
		"mixed-math-drills": () => import("$lib/MathDrill.svelte"),
	};

	const hasGame = $derived(Boolean(gameLoaders[id]));
	let LoadedGameComponent = $state<Component<any> | null>(null);

	$effect(() => {
		const loader = gameLoaders[id];
		if (!browser || !loader) {
			LoadedGameComponent = null;
			return;
		}
		let cancelled = false;
		LoadedGameComponent = null;
		loader().then((mod) => {
			if (!cancelled) {
				LoadedGameComponent = mod.default;
			}
		});
		return () => {
			cancelled = true;
		};
	});
	const guide = $derived(gameGuides[id] || "");
	const seo = $derived(gameSEO[id]);
	const canonical = $derived(`https://onlinemath.games/games/${id}`);
	const ogImage = $derived(`https://onlinemath.games/og/${id}.png`);
	const pageTitle = $derived(
		seo?.title ??
			(game
				? `${game.label} | onlinemath.games`
				: "Game Not Found | onlinemath.games"),
	);
	const pageDescription = $derived(
		seo?.description ??
			(game
				? `${game.description} Play ${game.label} online for free at onlinemath.games.`
				: ""),
	);
	const schema = $derived(
		game && seo
			? JSON.stringify({
					"@context": "https://schema.org",
					"@type": ["VideoGame", "WebApplication"],
					name: game.label,
					url: canonical,
					description: seo.description,
					genre: seo.genre,
					applicationCategory: "Game",
					operatingSystem: "Any (web browser)",
					browserRequirements: "Requires JavaScript. Requires HTML5.",
					gamePlatform: ["Web browser", "Mobile", "Desktop"],
					inLanguage: "en",
					isAccessibleForFree: true,
					keywords: seo.keywords.join(", "),
					publisher: {
						"@type": "Organization",
						name: "onlinemath.games",
						url: "https://onlinemath.games",
					},
					image: ogImage,
					offers: {
						"@type": "Offer",
						price: "0",
						priceCurrency: "USD",
					},
					...(game.updated ? { dateModified: game.updated } : {}),
				})
			: "",
	);
	const breadcrumbSchema = $derived(
		game
			? JSON.stringify({
					"@context": "https://schema.org",
					"@type": "BreadcrumbList",
					itemListElement: [
						{
							"@type": "ListItem",
							position: 1,
							name: "Online Math Games",
							item: "https://onlinemath.games/",
						},
						...(category
							? [
									{
										"@type": "ListItem",
										position: 2,
										name: category.name,
										item: `https://onlinemath.games/${category.slug}`,
									},
									{
										"@type": "ListItem",
										position: 3,
										name: game.label,
										item: canonical,
									},
								]
							: [
									{
										"@type": "ListItem",
										position: 2,
										name: game.label,
										item: canonical,
									},
								]),
					],
				})
			: "",
	);
	const howTo = $derived(gameHowTo[id]);
	const howToSchema = $derived(
		game && howTo
			? JSON.stringify({
					"@context": "https://schema.org",
					"@type": "HowTo",
					name: howTo.name,
					description: howTo.description,
					inLanguage: "en",
					totalTime: "PT5M",
					image: ogImage,
					step: howTo.steps.map((s: HowToStep, i: number) => ({
						"@type": "HowToStep",
						position: i + 1,
						name: s.name,
						text: s.text,
						url: `${canonical}#step-${i + 1}`,
					})),
				})
			: "",
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if game}
		<meta name="description" content={pageDescription} />
		{#if seo?.keywords?.length}
			<meta name="keywords" content={seo.keywords.join(", ")} />
		{/if}
		<link rel="canonical" href={canonical} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={pageTitle} />
		<meta property="og:description" content={pageDescription} />
		<meta property="og:url" content={canonical} />
		<meta property="og:site_name" content="onlinemath.games" />
		<meta property="og:image" content={ogImage} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={ogImage} />
		<meta name="twitter:title" content={pageTitle} />
		<meta name="twitter:description" content={pageDescription} />
		<meta name="twitter:image:alt" content={pageTitle} />
		{#if schema}
			{@html `<script type="application/ld+json">${schema}<\/script>`}
		{/if}
		{#if breadcrumbSchema}
			{@html `<script type="application/ld+json">${breadcrumbSchema}<\/script>`}
		{/if}
		{#if howToSchema}
			{@html `<script type="application/ld+json">${howToSchema}<\/script>`}
		{/if}
	{/if}
</svelte:head>

<main class="main-container in-game">
	<Sidebar {activeGameActions} />

	<div class="view-content">
		{#if hasGame}
			<div
				id="game-viewport"
				class="game-mat"
				in:fade={{ duration: 300 }}
			>
				<div class="game-frame-adaptive">
					{#if browser && LoadedGameComponent}
						<LoadedGameComponent {registerActions} {onBack} gameId={id} />
					{/if}
				</div>
			</div>
			<header class="game-info-header">
				<nav class="breadcrumbs" aria-label="Breadcrumb">
					<a href="/">All Games</a>
					{#if category}
						<span aria-hidden="true">/</span>
						<a href="/{category.slug}">{category.name}</a>
					{/if}
					<span aria-hidden="true">/</span>
					<span aria-current="page">{game?.label}</span>
				</nav>
				<h1 class="game-title">{seo?.h1 ?? game?.label}</h1>
			</header>
			{#if seo?.about}
				<p class="game-about">{seo.about}</p>
			{/if}
			{#if guide}
				<article class="game-guide" aria-label="{game?.label} Guide">
					{@html guide}
				</article>
			{/if}
			{#if relatedGames.length > 0 && category}
				<section class="related-games" aria-label="More {category.name}">
					<h2>More {category.name}</h2>
					<div class="related-grid">
						{#each relatedGames as rel}
							<a href="/games/{rel.id}" class="related-card">
								<span class="related-name">{getPlayAnchorText(rel)}</span>
								<span class="related-desc">{rel.description}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}
			{#if popularGames.length > 0}
				<section class="related-games" aria-label="More Math Games">
					<h2>More Math Games</h2>
					<div class="related-grid">
						{#each popularGames as pop}
							<a href="/games/{pop.id}" class="related-card">
								<span class="related-name">{getPlayAnchorText(pop)}</span>
								<span class="related-desc">{pop.description}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}
			{#if game?.updated}
				<p class="updated-line">
					Last updated <time datetime={game.updated}
						>{new Date(game.updated).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}</time
					>
				</p>
			{/if}
		{:else}
			<div class="error-view">
				<h1>Game not found</h1>
				<a href="/">Return to Menu</a>
			</div>
		{/if}
	</div>
</main>

<style>
	.main-container {
		width: 100%;
		min-height: 100vh;
		background: var(--app-bg);
		display: flex;
	}

	.main-container.in-game {
		flex-direction: row;
	}

	.view-content {
		flex: 1;
		min-width: 0;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.game-mat {
		flex: 1;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		background: transparent;
		overflow: hidden;
	}

	.game-frame-adaptive {
		width: 98vmin;
		height: 98vmin;
		background: var(--game-frame-bg);
		border: 1px solid var(--game-frame-border);
		border-radius: 2vmin;
		backdrop-filter: blur(30px);
		box-shadow: inset 0 0 0 1px var(--game-frame-inner-border);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow-x: auto;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		max-width: 98%;
		max-height: 98%;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.error-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--app-text);
	}

	.error-view a {
		color: var(--color-bittersweet);
		margin-top: 1rem;
	}

	.game-info-header {
		max-width: 720px;
		width: 100%;
		margin: 4vmin auto 0;
		padding: 0 3vmin;
		box-sizing: border-box;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 12px;
		color: color-mix(in srgb, var(--app-text) 52%, transparent);
		margin-bottom: 0.5rem;
	}

	.breadcrumbs a {
		color: var(--color-bittersweet);
		text-decoration: none;
		font-weight: 600;
	}

	.breadcrumbs a:hover {
		text-decoration: underline;
	}

	.game-title {
		font-size: 1.9rem;
		font-weight: 800;
		color: var(--app-text);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}

	.game-about {
		max-width: 720px;
		margin: 1rem auto 0;
		padding: 0 3vmin;
		color: color-mix(in srgb, var(--app-text) 86%, transparent);
		font-size: 15px;
		line-height: 1.6;
		font-weight: 500;
	}

	.game-guide {
		max-width: 720px;
		margin: 0 auto;
		padding: 2vmin 3vmin 4vmin;
		color: color-mix(in srgb, var(--app-text) 74%, transparent);
		font-size: 14px;
		line-height: 1.7;
	}

	.game-guide :global(h2) {
		font-size: 1.4rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--app-text) 90%, transparent);
		margin-bottom: 1rem;
		letter-spacing: -0.02em;
	}

	.game-guide :global(h3) {
		font-size: 1.05rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--app-text) 82%, transparent);
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.game-guide :global(p) {
		margin-bottom: 1rem;
	}

	.related-games {
		max-width: 720px;
		width: 100%;
		margin: 0 auto 3vmin;
		padding: 0 3vmin;
		box-sizing: border-box;
	}

	.related-games h2 {
		font-size: 1.15rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--app-text) 88%, transparent);
		margin: 0 0 0.85rem;
		letter-spacing: -0.01em;
	}

	.related-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.related-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 0.9rem;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 10px;
		text-decoration: none;
		color: var(--app-text);
		transition: border-color 0.2s ease, transform 0.2s ease;
	}

	.related-card:hover {
		border-color: var(--color-illusion);
		transform: translateY(-1px);
	}

	.related-name {
		font-size: 14px;
		font-weight: 700;
	}

	.related-desc {
		font-size: 12px;
		color: var(--app-muted-text);
		line-height: 1.35;
	}

	.updated-line {
		max-width: 720px;
		margin: 0 auto 3vmin;
		padding: 0 3vmin;
		font-size: 12px;
		color: color-mix(in srgb, var(--app-text) 38%, transparent);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	@media (max-width: 1024px) {
		.main-container {
			--mobile-top-clearance: 4.5rem;
		}

		.main-container,
		.main-container.in-game,
		.view-content {
			min-height: 100dvh;
		}

		.game-mat {
			min-height: calc(100dvh - var(--mobile-top-clearance));
			height: calc(100dvh - var(--mobile-top-clearance));
			margin-top: var(--mobile-top-clearance);
			padding-top: 0;
			box-sizing: border-box;
			align-items: stretch;
			justify-content: stretch;
			overflow: hidden;
		}

		.game-frame-adaptive {
			width: 100%;
			height: 100%;
			max-width: 100%;
			max-height: 100%;
			border-radius: 0;
			border: none;
			box-shadow: none;
			overflow-x: auto;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}

		.game-frame-adaptive :global(*) {
			max-height: 100%;
		}
	}

	@media (min-width: 1025px) {
		.game-mat {
			padding-top: 5.5vmin;
			box-sizing: border-box;
			min-height: 100vh;
			height: 100vh;
		}

		.game-frame-adaptive {
			width: min(92vmin, 900px);
			height: min(92vmin, 900px);
		}
	}
</style>
