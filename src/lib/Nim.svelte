<script lang="ts">
	import { fade } from 'svelte/transition';
	let { onBack } = $props();
	let heaps = $state([3, 5, 7]);
	let selectedHeap = $state<number | null>(null);
	let selectedCount = $state(0);
	let isPlayerTurn = $state(true);
	let winner = $state<string | null>(null);

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

	function reset() {
		heaps = [3, 5, 7];
		selectedHeap = null;
		selectedCount = 0;
		isPlayerTurn = true;
		winner = null;
	}
</script>

<div class="game-container">
	<div class="nav-row">
		<button class="back-btn" onclick={onBack}>BACK</button>
		<div class="turn-indicator" style="color: {winner ? 'var(--color-golden)' : (isPlayerTurn ? 'var(--color-apple)' : 'var(--color-bittersweet)')}">
			{winner ? winner + ' WINS!' : (isPlayerTurn ? 'YOUR TURN' : 'AI THINKING...')}
		</div>
		<button class="restart-btn" onclick={reset}>RESTART</button>
	</div>

	<div class="board-wrapper">
		<div class="heaps">
			{#each heaps as count, h}
				<div class="heap">
					{#each Array(count) as _, i}
						{@const idx = i}
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

	<div class="controls">
		<button class="take-btn" disabled={selectedHeap === null || !isPlayerTurn} onclick={take}>
			TAKE {selectedCount > 0 ? selectedCount : ''}
		</button>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; }
	.nav-row { padding: 3vmin; display: flex; justify-content: space-between; align-items: center; }
	.back-btn, .restart-btn { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.8vmin; transition: all 0.2s; }
	.back-btn:hover, .restart-btn:hover { color: white; border-color: var(--color-illusion); }
	.turn-indicator { font-size: 3vmin; font-weight: 900; letter-spacing: 2px; }
	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; }
	.heaps { display: flex; gap: 8vmin; align-items: flex-end; height: 50vmin; }
	.heap { display: flex; flex-direction: column; gap: 2vmin; align-items: center; justify-content: flex-end; width: 8vmin; min-height: 8vmin; }
	.dot { width: 8vmin; height: 8vmin; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); cursor: pointer; transition: all 0.2s; }
	.dot:hover:not(:disabled) { background: rgba(255,255,255,0.3); border-color: white; }
	.dot.selected { background: var(--color-apple); border-color: white; box-shadow: 0 0 2vmin rgba(78, 205, 196, 0.5); }
	.empty-heap { width: 8vmin; height: 1vmin; background: rgba(255,255,255,0.05); border-radius: 1vmin; }
	.controls { display: flex; justify-content: center; padding: 4vmin; }
	.take-btn { background: var(--color-apple); color: black; border: none; padding: 2vmin 6vmin; border-radius: 1vmin; font-size: 3vmin; font-weight: 900; cursor: pointer; transition: all 0.2s; }
	.take-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
	.take-btn:not(:disabled):hover { filter: brightness(1.2); }
</style>
