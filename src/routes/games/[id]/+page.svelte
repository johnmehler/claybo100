<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { getGameById } from "$lib/games";
	import { gameGuides } from "$lib/guides";
	import { gameSEO, gameHowTo, type HowToStep } from "$lib/seo";
	import Sidebar from "$lib/Sidebar.svelte";
	import { fade } from "svelte/transition";

	// Component imports
	import VectorRacing from "$lib/VectorRacing.svelte";
	import SlidingTiles from "$lib/SlidingTiles.svelte";
	import Pegboard from "$lib/Pegboard.svelte";
	import Hanoi from "$lib/Hanoi.svelte";
	import ShotSim from "$lib/ShotSim.svelte";
	import Nim from "$lib/Nim.svelte";
	import KnightsTour from "$lib/KnightsTour.svelte";
	import Hex from "$lib/Hex.svelte";
	import Krypto from "$lib/Krypto.svelte";
	import SetGame from "$lib/SetGame.svelte";
	import DotsAndBoxes from "$lib/DotsAndBoxes.svelte";
	import TracksOfGalileo from "$lib/TracksOfGalileo.svelte";
	import LunarLander from "$lib/LunarLander.svelte";
	import IceSlider from "$lib/IceSlider.svelte";
	import EpidemicSim from "$lib/EpidemicSim.svelte";
	import LaserMaze from "$lib/LaserMaze.svelte";
	import BlockDude from "$lib/BlockDude.svelte";
	import LemonadeStand from "$lib/LemonadeStand.svelte";
	import ApexIndustries from "$lib/ApexIndustries.svelte";

	const id = $derived($page.params.id);
	const game = $derived(getGameById(id));

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

	const gameComponents: Record<string, any> = {
		"sliding-tiles": SlidingTiles,
		pegboard: Pegboard,
		hanoi: Hanoi,
		shotsim: ShotSim,
		nim: Nim,
		"knights-tour": KnightsTour,
		hex: Hex,
		krypto: Krypto,
		set: SetGame,
		dotsandboxes: DotsAndBoxes,
		vectorracing: VectorRacing,
		tracksofgalileo: TracksOfGalileo,
		lunarlander: LunarLander,
		iceslider: IceSlider,
		epidemicsim: EpidemicSim,
		lasermaze: LaserMaze,
		blockdude: BlockDude,
		lemonadestand: LemonadeStand,
		"apexindustries": ApexIndustries,
	};

	const GameComponent = $derived(gameComponents[id]);
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
					"@type": "VideoGame",
					name: game.label,
					url: canonical,
					description: seo.description,
					genre: seo.genre,
					applicationCategory: "Game",
					operatingSystem: "Any (web browser)",
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
		{#if howToSchema}
			{@html `<script type="application/ld+json">${howToSchema}<\/script>`}
		{/if}
	{/if}
</svelte:head>

<main class="main-container in-game">
	<Sidebar {activeGameActions} />

	<div class="view-content">
		{#if GameComponent}
			<div
				id="game-viewport"
				class="game-mat"
				in:fade={{ duration: 300 }}
			>
				<div class="game-frame-adaptive">
					<svelte:component
						this={GameComponent}
						{registerActions}
						{onBack}
					/>
				</div>
			</div>
			{#if seo?.about}
				<p class="game-about">{seo.about}</p>
			{/if}
			{#if guide}
				<article class="game-guide" aria-label="{game?.label} Guide">
					{@html guide}
				</article>
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
		width: 100vw;
		min-height: 100vh;
		background: #09090b;
		display: flex;
	}

	.main-container.in-game {
		flex-direction: row;
	}

	.view-content {
		flex: 1;
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
		background: radial-gradient(
			circle at 50% 50%,
			rgba(255, 110, 97, 0.03) 0%,
			transparent 70%
		);
		overflow: hidden;
	}

	.game-frame-adaptive {
		width: 98vmin;
		height: 98vmin;
		background: rgba(255, 255, 255, 0.015);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 2vmin;
		backdrop-filter: blur(30px);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
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
		color: white;
	}

	.error-view a {
		color: var(--color-bittersweet);
		margin-top: 1rem;
	}

	.game-about {
		max-width: 720px;
		margin: 4vmin auto 0;
		padding: 0 3vmin;
		color: rgba(255, 255, 255, 0.85);
		font-size: 15px;
		line-height: 1.6;
		font-weight: 500;
	}

	.game-guide {
		max-width: 720px;
		margin: 0 auto;
		padding: 2vmin 3vmin 4vmin;
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
		line-height: 1.7;
	}

	.game-guide :global(h2) {
		font-size: 1.4rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
		letter-spacing: -0.02em;
	}

	.game-guide :global(h3) {
		font-size: 1.05rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.game-guide :global(p) {
		margin-bottom: 1rem;
	}

	.updated-line {
		max-width: 720px;
		margin: 0 auto 3vmin;
		padding: 0 3vmin;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.35);
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
			height: 100dvh;
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
			width: 100vw;
			height: 100%;
			max-width: 100vw;
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

		.game-about,
		.game-guide,
		.updated-line {
			display: none;
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
