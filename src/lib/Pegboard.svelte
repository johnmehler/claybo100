<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';

	let { onBack } = $props();
	let instructions: any;

	type CellState = -1 | 0 | 1; // -1: invalid, 0: empty, 1: peg

	let board = $state<CellState[]>([]);
	let selectedIdx = $state<number | null>(null);
	let possibleMoves = $state<number[]>([]);
	let movesCount = $state(0);
	let gameState = $state<'playing' | 'won' | 'lost'>('playing');
	let pegsRemaining = $derived(board.filter(cell => cell === 1).length);

	const SIZE = 7;

	function initBoard() {
		const newBoard: CellState[] = [];
		for (let r = 0; r < SIZE; r++) {
			for (let c = 0; c < SIZE; c++) {
				const isCorner = 
					(r < 2 && (c < 2 || c > 4)) || 
					(r > 4 && (c < 2 || c > 4));
				
				if (isCorner) {
					newBoard.push(-1);
				} else if (r === 3 && c === 3) {
					newBoard.push(0);
				} else {
					newBoard.push(1);
				}
			}
		}
		board = newBoard;
		movesCount = 0;
		selectedIdx = null;
		possibleMoves = [];
		gameState = 'playing';
	}
	initBoard();

	function getCoord(idx: number) {
		return { r: Math.floor(idx / SIZE), c: idx % SIZE };
	}

	function getIdx(r: number, c: number) {
		if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return -1;
		return r * SIZE + c;
	}

	function findPossibleMoves(idx: number): number[] {
		if (board[idx] !== 1) return [];
		const { r, c } = getCoord(idx);
		const moves: number[] = [];
		const directions = [
			{ dr: -1, dc: 0 }, { dr: 1, dc: 0 },
			{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }
		];

		for (const { dr, dc } of directions) {
			const midR = r + dr;
			const midC = c + dc;
			const endR = r + 2 * dr;
			const endC = c + 2 * dc;

			const midIdx = getIdx(midR, midC);
			const endIdx = getIdx(endR, endC);

			if (endIdx !== -1 && board[endIdx] === 0 && board[midIdx] === 1) {
				moves.push(endIdx);
			}
		}
		return moves;
	}

	function handleCellClick(idx: number) {
		if (gameState !== 'playing') return;

		if (board[idx] === 1) {
			selectedIdx = idx;
			possibleMoves = findPossibleMoves(idx);
		} else if (board[idx] === 0 && selectedIdx !== null && possibleMoves.includes(idx)) {
			makeMove(selectedIdx, idx);
		} else {
			selectedIdx = null;
			possibleMoves = [];
		}
	}

	function makeMove(fromIdx: number, toIdx: number) {
		const { r: fR, c: fC } = getCoord(fromIdx);
		const { r: tR, c: tC } = getCoord(toIdx);
		const midR = (fR + tR) / 2;
		const midC = (fC + tC) / 2;
		const midIdx = getIdx(midR, midC);

		const newBoard = [...board];
		newBoard[fromIdx] = 0;
		newBoard[midIdx] = 0;
		newBoard[toIdx] = 1;
		board = newBoard;

		selectedIdx = null;
		possibleMoves = [];
		movesCount++;

		checkGameState();
	}

	let isPerfectWin = $state(false);

	function checkGameState() {
		if (pegsRemaining === 1) {
			const centerIdx = getIdx(3, 3);
			isPerfectWin = board[centerIdx] === 1;
			gameState = 'won';
			return;
		}

		let hasAnyMove = false;
		for (let i = 0; i < board.length; i++) {
			if (board[i] === 1 && findPossibleMoves(i).length > 0) {
				hasAnyMove = true;
				break;
			}
		}

		if (!hasAnyMove) {
			gameState = 'lost';
		}
	}

	function restart() {
		isPerfectWin = false;
		initBoard();
	}

</script>

<div class="pegboard-container">
	<Instructions bind:this={instructions} gameId="pegboard" title="Pegboard">
		<p><strong>Goal:</strong> Leave only one peg remaining on the board.</p>
		<p>Click a peg, then click an empty hole to jump over an adjacent peg. The jumped peg is removed. You can only jump horizontally or vertically.</p>
	</Instructions>

	<div class="nav-row">
		<div class="nav-group">
			<button class="back-btn" onclick={onBack}>BACK TO MENU</button>
			<button class="help-btn" onclick={() => instructions.open()}>HOW TO PLAY</button>
		</div>
		{#if gameState === 'playing' || gameState === 'won' || gameState === 'lost'}
			<button class="restart-btn" onclick={restart} in:fade>RESTART</button>
		{/if}
	</div>

	<div class="game-area">
			<div class="stats">
				<div class="stat">
					<span class="label">PEGS</span>
					<span class="value">{pegsRemaining}</span>
				</div>
				<div class="stat">
					<span class="label">MOVES</span>
					<span class="value">{movesCount}</span>
				</div>
			</div>

			<div class="board">
				{#each board as cell, i}
					{#if cell === -1}
						<div class="cell hidden"></div>
					{:else}
						<button 
							class="cell hole" 
							class:selected={selectedIdx === i}
							class:target={possibleMoves.includes(i)}
							onclick={() => handleCellClick(i)}
						>
							{#if cell === 1}
								<div class="peg" in:scale={{ duration: 200 }} out:scale={{ duration: 200 }}></div>
							{/if}
						</button>
					{/if}
				{/each}
			</div>

			{#if gameState === 'won' || gameState === 'lost'}
				<div class="game-over-overlay" in:fade>
					<h2>{isPerfectWin ? 'PERFECT!' : (gameState === 'won' ? 'VICTORY!' : 'GAME OVER')}</h2>
					<p>{pegsRemaining} peg{pegsRemaining > 1 ? 's' : ''} left</p>
					<div class="actions">
						<button class="cta-btn" onclick={restart}>TRY AGAIN</button>
						<button class="secondary-btn" onclick={onBack}>MENU</button>
					</div>
				</div>
			{/if}
		</div>
		</div>
</div>

<style>
	.pegboard-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
		position: relative;
	}

	.nav-row {
		padding: 3vmin;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-group {
		display: flex;
		gap: 1vmin;
	}

	.back-btn, .help-btn {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.4);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.8vmin;
		transition: all 0.2s;
	}

	.back-btn:hover, .help-btn:hover {
		color: white;
		border-color: var(--color-illusion);
		background: rgba(255,255,255,0.05);
	}

	.restart-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.6);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.8vmin;
		transition: all 0.2s;
	}

	.restart-btn:hover {
		color: white;
		border-color: var(--color-indigo);
		background: rgba(255,255,255,0.1);
	}

	.overlay {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4vmin;
	}

	.title {
		font-size: 8vmin;
		margin: 0;
		color: white;
		font-weight: 900;
		letter-spacing: -2px;
	}

	.description {
		color: rgba(255,255,255,0.5);
		margin: 2vmin 0 4vmin;
		font-size: 2vmin;
		max-width: 40vmin;
	}

	.cta-btn {
		background: var(--color-bittersweet);
		color: white;
		border: none;
		padding: 2vmin 5vmin;
		font-size: 2.5vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: transform 0.2s, background 0.2s;
		box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4);
	}

	.cta-btn:hover {
		background: var(--color-illusion);
		scale: 1.05;
	}

	.game-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-bottom: 5vmin;
	}

	.stats {
		display: flex;
		gap: 8vmin;
		margin-bottom: 4vmin;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.label {
		font-size: 1.4vmin;
		color: rgba(255,255,255,0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
	}

	.value {
		font-size: 5vmin;
		font-weight: 800;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1.5vmin;
		padding: 3vmin;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4vmin;
		backdrop-filter: blur(10px);
	}

	.cell {
		width: 7vmin;
		height: 7vmin;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		cursor: default;
	}

	.cell.hidden {
		visibility: hidden;
	}

	.cell.hole {
		background: rgba(0,0,0,0.3);
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
		cursor: pointer;
		transition: all 0.2s;
	}

	.cell.hole:hover {
		background: rgba(255,255,255,0.05);
	}

	.cell.selected {
		background: rgba(255,255,255,0.15);
		box-shadow: 0 0 15px rgba(255,255,255,0.2);
	}

	.cell.target {
		background: rgba(105, 175, 75, 0.2);
		box-shadow: inset 0 0 10px rgba(105, 175, 75, 0.3);
	}

	.peg {
		width: 5vmin;
		height: 5vmin;
		border-radius: 50%;
		background: var(--color-golden);
		box-shadow: 0 4px 8px rgba(0,0,0,0.4);
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.selected .peg {
		background: white;
		scale: 1.1;
	}

	.game-over-overlay {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.8);
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 20;
		border-radius: 4vmin;
	}

	.game-over-overlay h2 {
		font-size: 8vmin;
		margin: 0;
		font-weight: 900;
	}

	.game-over-overlay p {
		font-size: 3vmin;
		color: rgba(255,255,255,0.6);
		margin: 2vmin 0 5vmin;
	}

	.actions {
		display: flex;
		gap: 3vmin;
	}

	.secondary-btn {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.2);
		color: white;
		padding: 2vmin 5vmin;
		font-size: 2vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.2s;
	}

	.secondary-btn:hover {
		background: rgba(255,255,255,0.1);
		border-color: white;
	}
</style>
