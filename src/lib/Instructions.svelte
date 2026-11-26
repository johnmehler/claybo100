<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { gameId, title, children, onclose } = $props<{
		gameId: string;
		title: string;
		children: any;
		onclose?: () => void;
	}>();
	
	let show = $state(false);

	onMount(() => {
		if (!localStorage.getItem(`seen_${gameId}`)) {
			show = true;
		}
	});

	export function open() {
		show = true;
	}

	export function isOpen() {
		return show;
	}

	function close() {
		show = false;
		localStorage.setItem(`seen_${gameId}`, 'true');
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (show && e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="instructions-title"
		tabindex="-1"
		in:fade={{ duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div class="modal">
			<h2 id="instructions-title">{title}</h2>
			<div class="content">
				{@render children()}
			</div>
			<button class="play-btn" onclick={close}>PLAY GAME</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		padding: clamp(12px, 3vmin, 24px);
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		color: var(--game-text-primary);
		overflow: hidden;
		box-sizing: border-box;
	}

	.modal {
		background: var(--game-frame-bg);
		border: 2px solid var(--game-frame-border);
		border-radius: clamp(14px, 2.2vmin, 22px);
		padding: clamp(18px, 3.5vmin, 32px);
		width: 100%;
		max-width: min(540px, 100%);
		max-height: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(14px, 2.5vmin, 22px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
		box-sizing: border-box;
		overflow: hidden;
	}

	h2 {
		color: var(--app-text);
		font-size: clamp(1.2rem, 3.2vmin, 1.75rem);
		line-height: 1.2;
		margin: 0;
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.content {
		font-size: clamp(0.9rem, 2vmin, 1.05rem);
		color: var(--game-text-muted);
		line-height: 1.55;
		text-align: left;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 1.6vmin, 14px);
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding-right: 4px;
		scrollbar-width: thin;
		box-sizing: border-box;
	}

	.content :global(*) {
		max-height: none;
	}

	.content :global(p) {
		margin: 0;
	}

	.content :global(ul),
	.content :global(ol) {
		margin: 0;
		padding-left: 1.25rem;
	}

	.play-btn {
		background: var(--app-text);
		color: var(--app-bg);
		border: none;
		padding: clamp(10px, 1.4vmin, 14px) clamp(24px, 3.5vmin, 36px);
		min-height: 44px;
		border-radius: clamp(8px, 1vmin, 12px);
		font-size: clamp(0.95rem, 2vmin, 1.05rem);
		font-weight: 900;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: filter 0.2s;
		flex-shrink: 0;
	}

	.play-btn:hover {
		filter: brightness(1.2);
	}
</style>
