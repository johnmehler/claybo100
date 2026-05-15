<script lang="ts">
	import { fade } from 'svelte/transition';
	let { 
		onPlayAgain, 
		onMenu, 
		onShowOptimal,
		delay = 800,
		playAgainText = "PLAY AGAIN",
		menuText = "MAIN MENU"
	} = $props<{
		onPlayAgain: () => void;
		onMenu: () => void;
		onShowOptimal?: () => void;
		delay?: number;
		playAgainText?: string;
		menuText?: string;
	}>();
</script>

<div class="end-actions" in:fade={{ delay, duration: 300 }}>
	<button class="action-btn" onclick={onPlayAgain}>{playAgainText}</button>
	{#if onShowOptimal}
		<button class="action-btn secondary" onclick={onShowOptimal}>SHOW OPTIMAL</button>
	{/if}
	<button class="action-btn secondary" onclick={onMenu}>{menuText}</button>
</div>

<style>
	.end-actions {
		display: flex;
		gap: 2vmin;
		justify-content: center;
		position: relative;
		z-index: 50;
	}

	.action-btn {
		background: var(--color-bittersweet);
		color: white;
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-size: 2.2vmin;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		filter: brightness(1.2);
		transform: scale(1.05);
	}

	.action-btn.secondary {
		background: transparent;
		border: 2px solid rgba(255,255,255,0.2);
		color: rgba(255,255,255,0.7);
	}

	.action-btn.secondary:hover {
		background: rgba(255,255,255,0.1);
		border-color: rgba(255,255,255,0.4);
		color: white;
	}
</style>
