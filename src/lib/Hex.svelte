<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;
	const SIZE = 11;
	let board = $state(Array(SIZE * SIZE).fill(0));
	let currentTurn = $state(1); // 1 = Red, 2 = Blue
	let winner = $state(0);
	let winningPath = $state<number[]>([]);

	function getNeighbors(r: number, c: number) {
		const res = [];
		const dirs = [[-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0]];
		for (const [dr, dc] of dirs) {
			const nr = r + dr, nc = c + dc;
			if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) res.push(nr * SIZE + nc);
		}
		return res;
	}

	function checkWin(p: number) {
		const visited = new Map<number, number | null>();
		const queue = [];
		for (let i = 0; i < SIZE; i++) {
			const idx = p === 1 ? i : i * SIZE;
			if (board[idx] === p) { 
				queue.push(idx); 
				visited.set(idx, null); 
			}
		}
		let head = 0;
		while(head < queue.length) {
			const curr = queue[head++];
			const r = Math.floor(curr / SIZE), c = curr % SIZE;
			
			if ((p === 1 && r === SIZE - 1) || (p === 2 && c === SIZE - 1)) {
				// Reconstruct path
				const path = [];
				let temp: number | null = curr;
				while (temp !== null) {
					path.push(temp);
					temp = visited.get(temp) ?? null;
				}
				return path;
			}

			for (const n of getNeighbors(r, c)) {
				if (board[n] === p && !visited.has(n)) { 
					visited.set(n, curr); 
					queue.push(n); 
				}
			}
		}
		return null;
	}

	function clickHex(r: number, c: number) {
		const idx = r * SIZE + c;
		if (board[idx] !== 0 || winner !== 0) return;
		board[idx] = currentTurn;
		const path = checkWin(currentTurn);
		if (path) {
			winner = currentTurn;
			winningPath = path;
		} else {
			currentTurn = currentTurn === 1 ? 2 : 1;
		}
	}

	function reset() {
		board = Array(SIZE * SIZE).fill(0);
		winner = 0;
		winningPath = [];
		currentTurn = 1;
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="hex" title="Hex">
		<p><strong>Goal:</strong> Form a connected path of your color bridging your two opposing sides of the board.</p>
		<p>Take turns placing a single piece on any empty hex. The first player to complete their unbroken chain wins!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">STATUS</span>
				<div class="status-msg">
					{#if winner === 0}
						<span style="color: {currentTurn === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
							{currentTurn === 1 ? 'RED' : 'BLUE'} TURN
						</span>
					{:else}
						<span style="color: {winner === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
							{winner === 1 ? 'RED' : 'BLUE'} WINS!
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="hex-grid">
			{#each Array(SIZE) as _, r}
				<div class="hex-row" style="margin-left: {r * 3}vmin">
					{#each Array(SIZE) as _, c}
						{@const p = board[r * SIZE + c]}
						<button 
							class="hex" 
							class:red={p === 1}
							class:blue={p === 2}
							class:winner={winningPath.includes(r * SIZE + c)}
							onclick={() => clickHex(r, c)}
						></button>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	{#if winner !== 0}
		<div class="bottom-bar" transition:fade>
			<button class="action-btn restart" onclick={reset}>
				NEW GAME
			</button>
			<button class="action-btn menu" onclick={onBack}>
				MAIN MENU
			</button>
		</div>
	{/if}
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.status-msg { font-size: 4vmin; font-weight: 900; letter-spacing: 1px; }

	.hex-grid { 
		display: flex; flex-direction: column; align-items: flex-start; padding: 4vmin; 
		background: rgba(255,255,255,0.01); border-radius: 4vmin; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px);
		position: relative;
	}

	/* Board Edge Indicators */
	.hex-grid::before, .hex-grid::after {
		content: ''; position: absolute; border-radius: 2vmin; pointer-events: none;
	}
	/* Red sides (Top/Bottom) */
	.hex-grid::before {
		top: 0; bottom: 0; left: 0; right: 0;
		border-top: 4px solid var(--color-bittersweet);
		border-bottom: 4px solid var(--color-bittersweet);
		opacity: 0.3;
	}
	/* Blue sides (Left/Right) */
	.hex-grid::after {
		top: 0; bottom: 0; left: 0; right: 0;
		border-left: 4px solid var(--color-apple);
		border-right: 4px solid var(--color-apple);
		opacity: 0.3;
		transform: skewX(-30deg); /* Approximate the tilt of the hex grid */
		display: none; /* Skew makes it messy, let's stick to a simpler indicator */
	}

	.hex-row { display: flex; margin-bottom: -1.6vmin; transition: transform 0.3s ease; }
	
	.hex { 
		width: 6vmin; height: 6.9vmin; margin-right: 0.1vmin;
		background: rgba(255,255,255,0.03); 
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		/* Thin outline effect */
		filter: drop-shadow(0 0 1px rgba(255,255,255,0.15));
		border: none;
	}

	.hex:hover:not(.red):not(.blue) { 
		background: rgba(255,255,255,0.12); 
		transform: scale(1.05) translateY(-2px); 
		z-index: 10; 
		filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 1px rgba(255,255,255,0.4));
	}

	.hex.red { 
		background: var(--color-bittersweet); 
		filter: drop-shadow(0 0 10px rgba(255, 110, 97, 0.3));
		transform: scale(0.95);
	}
	
	.hex.blue { 
		background: var(--color-apple); 
		filter: drop-shadow(0 0 10px rgba(78, 205, 196, 0.3));
		transform: scale(0.95);
	}

	.hex.winner {
		transform: scale(1.05);
		z-index: 5;
		filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.4));
		border: 2px solid white; /* This won't work perfectly with clip-path, but inner highlight will */
	}

	.hex.winner::after {
		background: rgba(255, 255, 255, 0.4) !important;
		box-shadow: 0 0 20px white;
	}

	.hex.red::after, .hex.blue::after {
		content: ''; position: absolute; top: 10%; left: 10%; right: 10%; bottom: 10%;
		background: rgba(255,255,255,0.15);
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		transition: all 0.3s ease;
	}

	.bottom-bar { 
		height: 12vmin; display: flex; justify-content: center; align-items: center; gap: 3vmin; width: 100%; 
		background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
	}
	
	.action-btn { 
		padding: 1.5vmin 5vmin; border-radius: 1.5vmin; font-size: 2vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; letter-spacing: 0.1vmin; border: none;
	}
	
	.action-btn.restart { 
		background: var(--color-apple); color: black; 
		box-shadow: 0 10px 20px -5px rgba(78, 205, 196, 0.3); 
	}
	.action-btn.restart:hover { transform: translateY(-3px); box-shadow: 0 15px 25px -5px rgba(78, 205, 196, 0.4); }
	
	.action-btn.menu { 
		background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);
	}
	.action-btn.menu:hover { background: rgba(255,255,255,0.1); transform: translateY(-3px); }
</style>
