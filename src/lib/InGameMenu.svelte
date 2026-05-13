<script lang="ts">
	import type { Snippet } from 'svelte';

	let { 
		onBack, 
		onHelp, 
		onRestart, 
		restartText = 'RESTART',
		children,
		rightControls 
	}: { 
		onBack: () => void, 
		onHelp: () => void, 
		onRestart?: () => void, 
		restartText?: string,
		children?: Snippet,
		rightControls?: Snippet
	} = $props();
</script>

<div class="nav-row">
	<div class="nav-group">
		<button class="back-btn" onclick={onBack}>BACK</button>
		<button class="help-btn" onclick={onHelp}>HOW TO PLAY</button>
	</div>
	
	<div class="center-content">
		{@render children?.()}
	</div>

	<div class="nav-group right-group">
		{@render rightControls?.()}
		{#if onRestart}
			<button class="restart-btn" onclick={onRestart}>{restartText}</button>
		{/if}
	</div>
</div>

<style>
	.nav-row {
		width: 100%;
		padding: 3vmin;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
		z-index: 10;
		flex-shrink: 0;
	}

	.nav-group {
		display: flex;
		gap: 1vmin;
		align-items: center;
		flex: 1;
	}

	.right-group {
		justify-content: flex-end;
	}

	.center-content {
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 1;
	}

	.back-btn, .restart-btn, .help-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.4);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.8vmin;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.back-btn:hover, .help-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-illusion);
		color: white;
	}
	
	.restart-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-indigo);
		color: white;
	}
</style>
