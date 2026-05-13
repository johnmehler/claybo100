<script lang="ts">
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;
	const SIZE = 11;
	let board = $state(Array(SIZE * SIZE).fill(0));
	let currentTurn = $state(1); // 1 = Red, 2 = Blue
	let winner = $state(0);

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
		const visited = new Set<number>();
		const queue = [];
		for (let i = 0; i < SIZE; i++) {
			const idx = p === 1 ? i : i * SIZE;
			if (board[idx] === p) { queue.push(idx); visited.add(idx); }
		}
		let head = 0;
		while(head < queue.length) {
			const curr = queue[head++];
			const r = Math.floor(curr / SIZE), c = curr % SIZE;
			if (p === 1 && r === SIZE - 1) return true;
			if (p === 2 && c === SIZE - 1) return true;
			for (const n of getNeighbors(r, c)) {
				if (board[n] === p && !visited.has(n)) { visited.add(n); queue.push(n); }
			}
		}
		return false;
	}

	function clickHex(r: number, c: number) {
		const idx = r * SIZE + c;
		if (board[idx] !== 0 || winner !== 0) return;
		board[idx] = currentTurn;
		if (checkWin(currentTurn)) winner = currentTurn;
		else currentTurn = currentTurn === 1 ? 2 : 1;
	}

	function reset() {
		board = Array(SIZE * SIZE).fill(0);
		winner = 0;
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
							onclick={() => clickHex(r, c)}
						></button>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.status-msg { font-size: 4vmin; font-weight: 900; letter-spacing: 1px; }

	.hex-grid { 
		display: flex; flex-direction: column; align-items: flex-start; padding: 3vmin; 
		background: rgba(255,255,255,0.015); border-radius: 4vmin; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px);
	}
	.hex-row { display: flex; margin-bottom: -1.4vmin; }
	.hex { 
		width: 5.5vmin; height: 6.3vmin; margin-right: 0.2vmin;
		background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		cursor: pointer; transition: all 0.3s;
	}
	.hex:hover { background: rgba(255,255,255,0.15); transform: scale(1.1); z-index: 5; }
	.hex.red { background: var(--color-bittersweet); box-shadow: inset 0 0 2vmin rgba(0,0,0,0.4); }
	.hex.blue { background: var(--color-apple); box-shadow: inset 0 0 2vmin rgba(0,0,0,0.4); }
</style>
