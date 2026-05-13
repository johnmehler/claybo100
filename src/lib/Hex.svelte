<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	let { onBack } = $props();
	let instructions: any;
	const SIZE = 11;
	let board = $state(Array(SIZE * SIZE).fill(0));
	let currentTurn = $state(1); // 1 = Red, 2 = Blue
	let winner = $state(0);

	function clickHex(r: number, c: number) {
		if (winner !== 0) return;
		let idx = r * SIZE + c;
		if (board[idx] === 0) {
			board[idx] = currentTurn;
			checkWin();
			if (winner === 0) currentTurn = currentTurn === 1 ? 2 : 1;
		}
	}

	function checkWin() {
		let visited = new Set();
		function dfs(r: number, c: number, player: number): boolean {
			let idx = r * SIZE + c;
			if (visited.has(idx)) return false;
			visited.add(idx);
			
			if (player === 1 && c === SIZE - 1) return true; // Red reaches Right
			if (player === 2 && r === SIZE - 1) return true; // Blue reaches Bottom

			const offsets = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
			for (let [dr, dc] of offsets) {
				let nr = r + dr, nc = c + dc;
				if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
					if (board[nr * SIZE + nc] === player) {
						if (dfs(nr, nc, player)) return true;
					}
				}
			}
			return false;
		}

		for (let i = 0; i < SIZE; i++) {
			if (currentTurn === 1 && board[i * SIZE] === 1) {
				visited.clear();
				if (dfs(i, 0, 1)) winner = 1;
			}
			if (currentTurn === 2 && board[i] === 2) {
				visited.clear();
				if (dfs(0, i, 2)) winner = 2;
			}
		}
	}
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="hex" title="Hex">
		<p><strong>Goal:</strong> Form a connected path of your color bridging your two opposing sides of the board.</p>
		<p>Take turns placing a single piece on any empty hex. The first player to complete their unbroken chain wins!</p>
	</Instructions>

	<InGameMenu 
		{onBack} 
		onHelp={() => instructions.open()} 
		onRestart={() => { board = Array(SIZE * SIZE).fill(0); winner = 0; currentTurn = 1; }}
	>
		<div class="turn">
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
	</InGameMenu>

	<div class="board-wrapper">
		<div class="hex-grid">
			{#each Array(SIZE) as _, r}
				<!-- Math Museum "No Translates" constraint: use margin-left instead of transform: translateX -->
				<div class="hex-row" style="margin-left: {r * 2.1}vmin">
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
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; }
	.turn { font-size: 3vmin; font-weight: 900; letter-spacing: 2px; }
	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; }
	
	.hex-grid { display: flex; flex-direction: column; align-items: flex-start; padding: 4vmin; background: rgba(255,255,255,0.02); border-radius: 2vmin; border: 1px solid rgba(255,255,255,0.05); }
	.hex-row { display: flex; margin-bottom: -1.2vmin; }
	.hex { 
		width: 4vmin; height: 4.6vmin; margin-right: 0.2vmin;
		background: rgba(255,255,255,0.1); border: none;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		cursor: pointer; transition: all 0.2s;
	}
	.hex:hover { background: rgba(255,255,255,0.2); }
	.hex.red { background: var(--color-bittersweet); box-shadow: inset 0 0 1vmin rgba(0,0,0,0.5); }
	.hex.blue { background: var(--color-apple); box-shadow: inset 0 0 1vmin rgba(0,0,0,0.5); }
</style>
