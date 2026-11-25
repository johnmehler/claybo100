<script lang="ts">
	import { allHubs, getHubBySlug, getPlayAnchorText } from '$lib/games';

	let { slug }: { slug: string } = $props();

	const hub = $derived(getHubBySlug(slug));
	const otherHubs = $derived(allHubs.filter((h) => h.slug !== slug));
	const siteUrl = 'https://onlinemath.games';
	const canonical = $derived(`${siteUrl}/${slug}`);

	const hubSchema = $derived(
		hub
			? JSON.stringify({
					'@context': 'https://schema.org',
					'@graph': [
						{
							'@type': 'CollectionPage',
							name: hub.hubTitle,
							url: canonical,
							description: hub.hubDescription,
							inLanguage: 'en',
							mainEntity: {
								'@type': 'ItemList',
								numberOfItems: hub.games.length,
								itemListElement: hub.games.map((g, index) => ({
									'@type': 'ListItem',
									position: index + 1,
									name: g.label,
									url: `${siteUrl}/games/${g.id}`
								}))
							}
						},
						{
							'@type': 'BreadcrumbList',
							itemListElement: [
								{
									'@type': 'ListItem',
									position: 1,
									name: 'Online Math Games',
									item: `${siteUrl}/`
								},
								{
									'@type': 'ListItem',
									position: 2,
									name: hub.name,
									item: canonical
								}
							]
						}
					]
				})
			: ''
	);
</script>

<svelte:head>
	{#if hub}
		<title>{hub.hubTitle} | onlinemath.games</title>
		<meta name="description" content={hub.hubDescription} />
		<link rel="canonical" href={canonical} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={`${hub.hubTitle} | onlinemath.games`} />
		<meta property="og:description" content={hub.hubDescription} />
		<meta property="og:url" content={canonical} />
		<meta property="og:site_name" content="onlinemath.games" />
		<meta property="og:image" content={`${siteUrl}/favicon-512.png`} />
		{@html `<script type="application/ld+json">${hubSchema}<\/script>`}
	{/if}
</svelte:head>

{#if hub}
	<main class="hub-container">
		<div class="hub-inner">
			<nav class="breadcrumbs" aria-label="Breadcrumb">
				<a href="/">All Math Games</a>
				<span aria-hidden="true">/</span>
				<span aria-current="page">{hub.name}</span>
			</nav>

			<header class="hub-header">
				<h1>{hub.name}</h1>
				<p class="hub-intro">{hub.hubIntro}</p>
			</header>

			<section class="hub-grid" aria-label={hub.name}>
				{#each hub.games as game}
					<a href="/games/{game.id}" class="hub-card">
						<div class="card-icon">{@html game.icon}</div>
						<div class="card-body">
							<h2>{game.label}</h2>
							<p>{game.description}</p>
							<span class="play-cta">{getPlayAnchorText(game)} &rarr;</span>
						</div>
					</a>
				{/each}
			</section>

			<section class="other-hubs" aria-label="More Math Game Categories">
				<h2>Explore More Categories</h2>
				<div class="hub-pills">
					<a href="/" class="hub-pill">All Math Games</a>
					{#each otherHubs as other}
						<a href="/{other.slug}" class="hub-pill">{other.name}</a>
					{/each}
				</div>
			</section>
		</div>
	</main>
{/if}

<style>
	.hub-container {
		min-height: 85vh;
		width: 100%;
		background: var(--app-bg);
		padding: clamp(1.5rem, 4vmin, 3rem) clamp(1rem, 3vmin, 2.5rem);
	}

	.hub-inner {
		max-width: 1040px;
		margin: 0 auto;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 13px;
		color: var(--app-muted-text);
		margin-bottom: 1rem;
	}

	.breadcrumbs a {
		color: var(--color-bittersweet);
		text-decoration: none;
		font-weight: 600;
	}

	.breadcrumbs a:hover {
		text-decoration: underline;
	}

	.hub-header h1 {
		font-size: clamp(1.9rem, 4vmin, 2.8rem);
		font-weight: 900;
		margin: 0 0 0.6rem;
		color: var(--app-text);
		letter-spacing: -0.03em;
	}

	.hub-intro {
		font-size: 1rem;
		line-height: 1.6;
		color: var(--app-muted-text);
		max-width: 720px;
		margin: 0 0 2rem;
	}

	.hub-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.hub-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		padding: 1rem;
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		text-decoration: none;
		color: var(--app-text);
		transition: border-color 0.2s ease, transform 0.2s ease;
	}

	.hub-card:hover {
		border-color: var(--color-illusion);
		transform: translateY(-2px);
	}

	.card-icon {
		width: 2.75rem;
		height: 2.75rem;
		flex-shrink: 0;
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--panel-bg) 86%, var(--app-text) 6%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-icon :global(svg) {
		width: 52%;
		height: 52%;
	}

	.card-body h2 {
		font-size: 1.1rem;
		font-weight: 800;
		margin: 0 0 0.25rem;
	}

	.card-body p {
		font-size: 0.86rem;
		color: var(--app-muted-text);
		margin: 0 0 0.5rem;
		line-height: 1.4;
	}

	.play-cta {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--color-bittersweet);
	}

	.other-hubs h2 {
		font-size: 1.1rem;
		font-weight: 800;
		margin: 0 0 0.8rem;
		color: var(--app-text);
	}

	.hub-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.hub-pill {
		padding: 0.5rem 0.9rem;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		color: var(--app-text);
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		transition: border-color 0.2s ease;
	}

	.hub-pill:hover {
		border-color: var(--color-bittersweet);
		color: var(--color-bittersweet);
	}
</style>
