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

	let opponentMode = $state<'ai' | 'human'>('ai');
	let isThinking = $state(false);

	function getNeighbors(r: number, c: number) {
		const res = [];
		const dirs = [[-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0]];
		for (const [dr, dc] of dirs) {
			const nr = r + dr, nc = c + dc;
			if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) res.push(nr * SIZE + nc);
		}
		return res;
	}

	function getShortestPathLength(p: number, currentBoard: number[]) {
		const dist = new Array(SIZE * SIZE).fill(1000);
		const queue: number[] = [];

		for (let i = 0; i < SIZE; i++) {
			const idx = p === 1 ? i : i * SIZE;
			if (currentBoard[idx] === 0 || currentBoard[idx] === p) {
				dist[idx] = currentBoard[idx] === p ? 0 : 1;
				queue.push(idx);
			}
		}

		let head = 0;
		while (head < queue.length) {
			const curr = queue[head++];
			const r = Math.floor(curr / SIZE), c = curr % SIZE;
			
			for (const n of getNeighbors(r, c)) {
				if (currentBoard[n] === 0 || currentBoard[n] === p) {
					const weight = currentBoard[n] === p ? 0 : 1;
					if (dist[curr] + weight < dist[n]) {
						dist[n] = dist[curr] + weight;
						queue.push(n);
					}
				}
			}
		}

		let minDist = 1000;
		for (let i = 0; i < SIZE; i++) {
			const idx = p === 1 ? (SIZE - 1) * SIZE + i : i * SIZE + (SIZE - 1);
			minDist = Math.min(minDist, dist[idx]);
		}
		return minDist;
	}

	async function makeAIMove() {
		if (winner !== 0 || currentTurn !== 2 || opponentMode !== 'ai') return;

		isThinking = true;
		await new Promise(r => setTimeout(r, 600));

		const emptyCells = board.map((v, i) => v === 0 ? i : -1).filter(v => v !== -1);
		if (emptyCells.length === 0) { isThinking = false; return; }

		let bestScore = -Infinity;
		let bestMove = emptyCells[0];

		// Baseline distances
		const baseRed = getShortestPathLength(1, board);
		const baseBlue = getShortestPathLength(2, board);

		for (const move of emptyCells) {
			// Try Blue move
			board[move] = 2;
			const blueDist = getShortestPathLength(2, board);
			board[move] = 0;

			// Try Red move
			board[move] = 1;
			const redDist = getShortestPathLength(1, board);
			board[move] = 0;

			// Score: How much does this improve our position OR block theirs?
			const score = (baseBlue - blueDist) * 1.2 + (baseRed - redDist);
			
			// Add a tiny bit of noise to break ties randomly
			const finalScore = score + Math.random() * 0.1;

			if (finalScore > bestScore) {
				bestScore = finalScore;
				bestMove = move;
			}
		}

		isThinking = false;
		clickHex(Math.floor(bestMove / SIZE), bestMove % SIZE, false);
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

	function clickHex(r: number, c: number, isHuman: boolean = true) {
		const idx = r * SIZE + c;
		if (board[idx] !== 0 || winner !== 0 || isThinking) return;
		if (isHuman && opponentMode === 'ai' && currentTurn === 2) return;
		
		board[idx] = currentTurn;
		const path = checkWin(currentTurn);
		if (path) {
			winner = currentTurn;
			winningPath = path;
		} else {
			currentTurn = currentTurn === 1 ? 2 : 1;
			if (currentTurn === 2 && opponentMode === 'ai') {
				makeAIMove();
			}
		}
	}

	function reset() {
		board = Array(SIZE * SIZE).fill(0);
		winner = 0;
		winningPath = [];
		currentTurn = 1;
		isThinking = false;
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key.toLowerCase() === 'r') reset();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container">
	<Instructions bind:this={instructions} gameId="hex" title="Hex">
		<p><strong>Goal:</strong> Form a connected path of your color bridging your two opposing sides of the board.</p>
		<p>Take turns placing a single piece on any empty hex. The first player to complete their unbroken chain wins!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">MODE</span>
				<div class="mode-select">
					<button class="mode-btn" class:active={opponentMode === 'ai'} onclick={() => { opponentMode = 'ai'; reset(); }}>AI</button>
					<button class="mode-btn" class:active={opponentMode === 'human'} onclick={() => { opponentMode = 'human'; reset(); }}>HUMAN</button>
				</div>
			</div>
			<div class="stat">
				<span class="label">STATUS</span>
				<div class="status-msg">
					{#if winner === 0}
						<span style="color: {currentTurn === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
							{currentTurn === 1 ? 'RED' : 'BLUE'} {isThinking ? 'THINKING...' : 'TURN'}
						</span>
					{:else}
						<span style="color: {winner === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
							{winner === 1 ? 'RED' : 'BLUE'} WINS!
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="hex-grid" class:thinking={isThinking}>
			{#each Array(SIZE) as _, r}
				<div class="hex-row" style="margin-left: {r * 2.6}vmin">
					{#each Array(SIZE) as _, c}
						{@const p = board[r * SIZE + c]}
						<div class="hex-wrapper">
							<button 
								class="hex" 
								class:red={p === 1}
								class:blue={p === 2}
								class:winner={winningPath.includes(r * SIZE + c)}
								onclick={() => clickHex(r, c)}
								disabled={isThinking && opponentMode === 'ai'}
							></button>
							{#if r === 0}
								<svg class="hex-edge top-edge" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,25 50,0 100,25" /></svg>
							{/if}
							{#if r === SIZE - 1}
								<svg class="hex-edge bottom-edge" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,75 50,100 100,75" /></svg>
							{/if}
							{#if c === 0}
								<svg class="hex-edge left-edge" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,25 0,75 50,100" /></svg>
							{/if}
							{#if c === SIZE - 1}
								<svg class="hex-edge right-edge" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="50,0 100,25 100,75" /></svg>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div class="bottom-bar">
		{#if winner !== 0}
			<button class="action-btn restart" onclick={reset} in:fade>
				NEW GAME
			</button>
		{/if}
		<button class="action-btn menu" onclick={onBack}>
			MAIN MENU
		</button>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: var(--game-text-primary); align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; gap: 6vmin; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.status-msg { font-size: 3.5vmin; font-weight: 900; letter-spacing: 1px; min-width: 30vmin; text-align: center; }

	.mode-select { display: flex; gap: 0.5vmin; background: rgba(255,255,255,0.05); padding: 0.5vmin; border-radius: 1.2vmin; border: 1px solid rgba(255,255,255,0.1); }
	.mode-btn { background: transparent; border: none; color: var(--game-text-muted); padding: 0.8vmin 2vmin; border-radius: 0.8vmin; font-size: 1.4vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; }
	.mode-btn.active { background: var(--color-apple); color: black; box-shadow: 0 4px 10px rgba(78, 205, 196, 0.2); }

	.hex-grid { 
		display: flex; flex-direction: column; align-items: flex-start; padding: 3vmin; 
		background: rgba(255,255,255,0.01); border-radius: 0; backdrop-filter: blur(10px);
		position: relative;
		transition: opacity 0.5s ease;
		border: none;
	}

	.hex-grid.thinking { opacity: 0.7; pointer-events: none; }

	.hex-wrapper {
		width: 5.2vmin; height: 6vmin; margin-right: 0.1vmin;
		position: relative;
		filter: drop-shadow(0 0 1px rgba(255,255,255,0.15));
	}

	.hex-edge {
		position: absolute;
		inset: 0; width: 100%; height: 100%;
		pointer-events: none;
		z-index: 20;
		overflow: visible;
	}

	.hex-edge polyline {
		fill: none;
		stroke-width: 4px;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.hex-edge.top-edge polyline, .hex-edge.bottom-edge polyline { stroke: var(--color-bittersweet); }
	.hex-edge.left-edge polyline, .hex-edge.right-edge polyline { stroke: var(--color-apple); }

	.hex-row { display: flex; margin-bottom: -1.4vmin; transition: transform 0.3s ease; }
	
	.hex { 
		width: 100%; height: 100%; display: block; padding: 0;
		background: #111114; /* Opaque background prevents shadow bleed-through */
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
	}
	.hex:disabled { cursor: not-allowed; }

	.hex-wrapper:hover .hex:not(.red):not(.blue):not(:disabled) { 
		background: #202025; 
		transform: scale(1.05) translateY(-2px); 
	}
	.hex-wrapper:hover {
		z-index: 10;
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
		background: rgba(0,0,0,0.1);
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
		background: rgba(255,255,255,0.05); color: var(--game-text-primary); border: 1px solid rgba(255,255,255,0.1);
	}
	.action-btn.menu:hover { background: rgba(255,255,255,0.1); transform: translateY(-3px); }
</style>
