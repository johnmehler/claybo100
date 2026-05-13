<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let heaps = $state([3, 5, 7]);
	let selectedHeap = $state<number | null>(null);
	let selectedCount = $state(0);
	let isPlayerTurn = $state(true);
	let winner = $state<string | null>(null);

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
		if (selectedHeap !== null && selectedHeap !== h) return;
		let count = heaps[h] - idx;
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

		<div class="heaps">
			{#each heaps as count, h}
				<div class="heap">
					{#each Array(count) as _, i}
						<button 
							class="dot {selectedHeap === h && count - i <= selectedCount ? 'selected' : ''}"
							disabled={!isPlayerTurn || winner !== null}
							onclick={() => select(h, i)}
							in:fade
						></button>
					{/each}
					{#if count === 0}
						<div class="empty-heap"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="bottom-bar">
		<button class="take-btn" disabled={selectedHeap === null || !isPlayerTurn} onclick={take}>
			TAKE {selectedCount > 0 ? selectedCount : ''}
		</button>
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
	.status-msg { font-size: 5vmin; font-weight: 900; letter-spacing: 1px; }

	.heaps { 
		display: flex; gap: 8vmin; align-items: flex-end; 
		height: 55vmin; padding: 2vmin 6vmin;
		background: rgba(255,255,255,0.015);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4vmin; backdrop-filter: blur(10px);
	}

	.heap { display: flex; flex-direction: column; gap: 1vmin; align-items: center; justify-content: flex-end; width: 8vmin; min-height: 8vmin; }
	.dot { 
		width: 8vmin; height: 8vmin; border-radius: 50%; 
		background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); 
		cursor: pointer; transition: all 0.3s; 
	}
	.dot:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); transform: translateY(-5px); }
	.dot.selected { background: var(--color-apple); border-color: white; box-shadow: 0 0 3vmin rgba(78, 205, 196, 0.4); transform: scale(1.1); }
	.empty-heap { width: 8vmin; height: 1.5vmin; background: rgba(255,255,255,0.05); border-radius: 1vmin; }

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	.take-btn { background: var(--color-apple); color: black; border: none; padding: 1.5vmin 8vmin; border-radius: 1.5vmin; font-size: 2.5vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 20px -5px rgba(78, 205, 196, 0.3); letter-spacing: 0.1vmin; }
	.take-btn:disabled { opacity: 0.2; cursor: not-allowed; filter: grayscale(1); }
</style>
