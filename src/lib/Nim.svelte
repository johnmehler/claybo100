<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let heaps = $state([3, 5, 7]);
	let selectedHeap = $state<number | null>(null);
	let selectedCount = $state(0);
	let isPlayerTurn = $state(true);
	let winner = $state<string | null>(null);
	let hoveredHeap = $state<number | null>(null);
	let hoveredCount = $state(0);

	function reset() {
		heaps = [3, 5, 7];
		selectedHeap = null;
		selectedCount = 0;
		isPlayerTurn = true;
		winner = null;
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});

	function select(h: number, idx: number) {
		if (!isPlayerTurn || winner) return;
		let count = idx + 1;
		if (selectedHeap === h && selectedCount === count) {
			selectedHeap = null;
			selectedCount = 0;
			return;
		}
		selectedHeap = h;
		selectedCount = count;
	}

	function take() {
		if (selectedHeap === null) return;
		heaps[selectedHeap] -= selectedCount;
		selectedHeap = null;
		selectedCount = 0;
		checkWin('PLAYER');
		if (!winner) {
			isPlayerTurn = false;
			setTimeout(aiTurn, 800);
		}
	}

	function aiTurn() {
		let xorSum = heaps.reduce((a, b) => a ^ b, 0);
		let moveMade = false;
		if (xorSum !== 0) {
			for (let i = 0; i < heaps.length; i++) {
				let target = heaps[i] ^ xorSum;
				if (target < heaps[i]) {
					heaps[i] = target;
					moveMade = true;
					break;
				}
			}
		}
		if (!moveMade) {
			let valid = heaps.map((v, i) => v > 0 ? i : -1).filter(i => i !== -1);
			if (valid.length > 0) {
				let h = valid[Math.floor(Math.random() * valid.length)];
				heaps[h] -= 1;
			}
		}
		checkWin('AI');
		if (!winner) isPlayerTurn = true;
	}

	function checkWin(who: string) {
		if (heaps.every(h => h === 0)) winner = who;
	}
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="nim" title="Nim">
		<p><strong>Goal:</strong> Force the AI to take the very last object.</p>
		<p>On your turn, you may remove any number of objects from a single row. Think mathematically: use XOR-sums to calculate the winning strategy!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">STATUS</span>
				<div class="status-msg" style="color: {winner ? 'var(--color-golden)' : (isPlayerTurn ? 'var(--color-apple)' : 'var(--color-bittersweet)')}">
					{winner ? winner + ' WINS!' : (isPlayerTurn ? 'YOUR TURN' : 'AI THINKING...')}
				</div>
			</div>
		</div>

		<div class="heaps-container">
			<div class="heaps">
				{#each heaps as count, h}
					<div class="heap">
						{#each Array(count) as _, i}
							<button 
								class="dot"
								class:selected={selectedHeap === h && i < selectedCount}
								class:hover-preview={hoveredHeap === h && i < hoveredCount}
								disabled={!isPlayerTurn || winner !== null}
								onclick={() => select(h, i)}
								onmouseenter={() => { hoveredHeap = h; hoveredCount = i + 1; }}
								onmouseleave={() => { hoveredHeap = null; hoveredCount = 0; }}
								in:fade
							></button>
						{/each}
						{#if count === 0}
							<div class="empty-heap"></div>
						{/if}
					</div>
				{/each}
			</div>
			{#if winner}
				<div class="completion-overlay" transition:fade></div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		{#if winner}
			<GameOverMenu onPlayAgain={reset} onMenu={onBack} delay={400} />
		{:else}
			<button class="take-btn" disabled={selectedHeap === null || !isPlayerTurn} onclick={take}>
				TAKE {selectedCount > 0 ? selectedCount : ''}
			</button>
		{/if}
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }

	.board-wrapper { 
		flex: 1; 
		display: flex; 
		flex-direction: column;
		justify-content: center; 
		align-items: center; 
		width: 100%; 
		padding: 1vmin 4vmin; 
		box-sizing: border-box; 
		overflow: hidden;
	}

	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.status-msg { font-size: 4vmin; font-weight: 900; letter-spacing: 1px; }

	.heaps-container {
		position: relative;
		padding: 3vmin 6vmin;
		background: rgba(255,255,255,0.015);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4vmin; 
		backdrop-filter: blur(10px);
		overflow: hidden;
	}

	.heaps { 
		display: flex; gap: 6vmin; align-items: flex-end; 
		min-height: 45vmin;
	}

	.heap { display: flex; flex-direction: column; gap: 0.8vmin; align-items: center; justify-content: flex-end; width: 6vmin; min-height: 6vmin; }
	.dot { 
		width: 6vmin; height: 6vmin; border-radius: 50%; 
		background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); 
		cursor: pointer; transition: all 0.3s; 
	}
	.dot:hover:not(:disabled) { transform: scale(1.05); }
	.dot.selected { background: var(--color-apple); border-color: white; box-shadow: 0 0 3vmin rgba(78, 205, 196, 0.4); transform: scale(1.1); }
	.dot.hover-preview:not(.selected) { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.4); }
	.empty-heap { width: 6vmin; height: 1.2vmin; background: rgba(255,255,255,0.05); border-radius: 1vmin; }

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	.take-btn { background: var(--color-apple); color: black; border: none; padding: 1.5vmin 8vmin; border-radius: 1.5vmin; font-size: 2.5vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 20px -5px rgba(78, 205, 196, 0.3); letter-spacing: 0.1vmin; }
	.take-btn:disabled { opacity: 0.2; cursor: not-allowed; filter: grayscale(1); }

	.completion-overlay {
		position: absolute;
		top: 0;
		left: -150%;
		width: 150%;
		height: 100%;
		background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(200, 200, 200, 0.2) 30%, rgba(255, 255, 255, 0.5) 50%, rgba(200, 200, 200, 0.2) 70%, rgba(255, 255, 255, 0) 100%);
		transform: skewX(-25deg);
		animation: swoosh 0.8s ease-in-out forwards;
		pointer-events: none;
		z-index: 20;
	}

	@keyframes swoosh { 0% { left: -150%; } 100% { left: 150%; } }
</style>

