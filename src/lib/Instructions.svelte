<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { gameId, title, children } = $props<{ gameId: string, title: string, children: any }>();
	
	let show = $state(false);

	onMount(() => {
		if (!localStorage.getItem(`seen_${gameId}`)) {
			show = true;
		}
	});

	export function open() {
		show = true;
	}

	function close() {
		show = false;
		localStorage.setItem(`seen_${gameId}`, 'true');
	}
</script>

{#if show}
	<div class="overlay" in:fade={{ duration: 200 }}>
		<div class="modal">
			<h2>{title}</h2>
			<div class="content">
				{@render children()}
			</div>
			<button class="play-btn" onclick={close}>PLAY GAME</button>
		</div>
	</div>
{/if}

<style>
	.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; color: var(--game-text-primary); }
	.modal { background: var(--game-frame-bg); border: 2px solid var(--game-frame-border); border-radius: 3vmin; padding: 5vmin; max-width: 70vmin; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4vmin; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
	h2 { color: var(--color-illusion, #a8a5e6); font-size: 4vmin; margin: 0; font-weight: 900; letter-spacing: 0.2vmin; text-transform: uppercase; }
	.content { font-size: 2.2vmin; color: var(--game-text-muted); line-height: 1.6; text-align: left; width: 100%; display: flex; flex-direction: column; gap: 2vmin; }
	.play-btn { background: var(--color-illusion, #a8a5e6); color: black; border: none; padding: 1.5vmin 4vmin; border-radius: 1vmin; font-size: 2.2vmin; font-weight: 900; cursor: pointer; transition: filter 0.2s; }
	.play-btn:hover { filter: brightness(1.2); }
</style>
