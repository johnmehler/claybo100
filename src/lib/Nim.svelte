<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let heaps = $state([3, 5, 7]);
	let selectedHeap = $state<number | null>(null);
	let selectedCount = $state(0);
	let gameMode = $state<'ai' | 'human'>('ai');
	let currentPlayer = $state<1 | 2>(1);
	let isAiTurn = $state(false);
	let winner = $state<string | null>(null);
	let hoveredHeap = $state<number | null>(null);
	let hoveredCount = $state(0);

	onMount(() => {
		reset();
	});

	function reset() {
		heaps = [3, 5, 7];
		selectedHeap = null;
		selectedCount = 0;
		winner = null;

		if (gameMode === 'ai') {
			let humanGoesFirst = Math.random() < 0.5;
			currentPlayer = humanGoesFirst ? 1 : 2;
			isAiTurn = !humanGoesFirst;
			if (isAiTurn) {
				setTimeout(aiTurn, 800);
			}
		} else {
			currentPlayer = 1;
			isAiTurn = false;
		}
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});

	function select(h: number, idx: number) {
		if (isAiTurn || winner) return;
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
		checkWin(gameMode === 'human' ? `PLAYER ${currentPlayer}` : 'PLAYER');
		if (!winner) {
			if (gameMode === 'ai') {
				isAiTurn = true;
				currentPlayer = 2;
				setTimeout(aiTurn, 800);
			} else {
				currentPlayer = currentPlayer === 1 ? 2 : 1;
			}
		}
	}

	function aiTurn() {
		if (winner || !isAiTurn) return;
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
		if (!winner) {
			isAiTurn = false;
			currentPlayer = 1;
		}
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
				<span class="label">MODE</span>
				<div class="mode-select">
					<button class="mode-btn" class:active={gameMode === 'ai'} onclick={() => { gameMode = 'ai'; reset(); }}>AI</button>
					<button class="mode-btn" class:active={gameMode === 'human'} onclick={() => { gameMode = 'human'; reset(); }}>HUMAN</button>
				</div>
			</div>
			<div class="stat">
				<span class="label">STATUS</span>
				<div class="status-msg" style="color: {winner ? 'var(--app-text)' : (!isAiTurn ? 'var(--color-apple)' : 'var(--color-bittersweet)')}">
					{winner ? winner + ' WINS!' : (gameMode === 'ai' ? (isAiTurn ? 'AI THINKING...' : 'YOUR TURN') : `PLAYER ${currentPlayer}'S TURN`)}
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
								disabled={isAiTurn || winner !== null}
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
			<button class="action-btn restart" onclick={reset} in:fade>
				NEW GAME
			</button>
		{:else}
			<button class="action-btn take" disabled={selectedHeap === null || isAiTurn} onclick={take}>
				TAKE {selectedCount > 0 ? selectedCount : ''}
			</button>
		{/if}
		<button class="action-btn menu" onclick={onBack}>
			MAIN MENU
		</button>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: var(--game-text-primary); align-items: center; }

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

	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; gap: 6vmin; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.status-msg { font-size: 3.5vmin; font-weight: 900; letter-spacing: 1px; min-width: 30vmin; text-align: center; }

	.mode-select { display: flex; gap: 0.5vmin; background: rgba(255,255,255,0.05); padding: 0.5vmin; border-radius: 1.2vmin; border: 1px solid rgba(255,255,255,0.1); }
	.mode-btn { background: transparent; border: none; color: var(--game-text-muted); padding: 0.8vmin 2vmin; border-radius: 0.8vmin; font-size: 1.4vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; }
	.mode-btn.active { background: var(--color-apple); color: black; box-shadow: 0 4px 10px rgba(78, 205, 196, 0.2); }

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

	.bottom-bar { 
		height: 12vmin; display: flex; justify-content: center; align-items: center; gap: 3vmin; width: 100%; 
		background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
	}
	
	.action-btn { 
		padding: 1.5vmin 5vmin; border-radius: 1.5vmin; font-size: 2vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; letter-spacing: 0.1vmin; border: none;
	}
	
	.action-btn.restart, .action-btn.take { 
		background: var(--color-apple); color: black; 
		box-shadow: 0 10px 20px -5px rgba(78, 205, 196, 0.3); 
	}
	.action-btn.restart:hover, .action-btn.take:hover:not(:disabled) { 
		transform: translateY(-3px); box-shadow: 0 15px 25px -5px rgba(78, 205, 196, 0.4); 
	}
	
	.action-btn.take:disabled { opacity: 0.2; cursor: not-allowed; filter: grayscale(1); }
	
	.action-btn.menu { 
		background: rgba(255,255,255,0.05); color: var(--game-text-primary); border: 1px solid rgba(255,255,255,0.1);
	}
	.action-btn.menu:hover { background: rgba(255,255,255,0.1); transform: translateY(-3px); }

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

