<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import GameOverMenu from './GameOverMenu.svelte';

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
	<Instructions bind:this={instructions} gameId="pegboard" title="Peg Solitaire">
		<p><strong>Goal:</strong> Leave only one peg remaining on the board.</p>
		<p>Click a peg, then click an empty hole to jump over an adjacent peg. The jumped peg is removed. You can only jump horizontally or vertically.</p>
	</Instructions>

	<InGameMenu 
		{onBack} 
		onHelp={() => instructions.open()} 
		onRestart={gameState === 'playing' || gameState === 'won' || gameState === 'lost' ? restart : undefined}
	/>

	<div class="board-wrapper">
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
				{#if gameState === 'won' || gameState === 'lost'}
					<div class="completion-overlay" transition:fade></div>
				{/if}
			</div>
	</div>

	<div class="bottom-bar">
		{#if gameState === 'won' || gameState === 'lost'}
			<GameOverMenu onPlayAgain={restart} onMenu={onBack} delay={800} />
		{/if}
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

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 2vmin 4vmin;
		box-sizing: border-box;
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 8vmin;
		margin-bottom: 2vmin;
		width: 100%;
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
		grid-template-columns: repeat(7, 6vmin);
		gap: 1vmin;
		padding: 2vmin;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4vmin;
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}

	.cell {
		width: 6vmin;
		height: 6vmin;
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
		width: 4vmin;
		height: 4vmin;
		border-radius: 50%;
		background: var(--color-golden);
		box-shadow: 0 4px 8px rgba(0,0,0,0.4);
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.selected .peg {
		background: white;
		scale: 1.1;
	}

	.completion-overlay {
		position: absolute;
		top: 0;
		left: -150%;
		width: 150%;
		height: 100%;
		background: linear-gradient(
			to right,
			rgba(255, 255, 255, 0) 0%,
			rgba(200, 200, 200, 0.2) 30%,
			rgba(255, 255, 255, 0.5) 50%,
			rgba(200, 200, 200, 0.2) 70%,
			rgba(255, 255, 255, 0) 100%
		);
		transform: skewX(-25deg);
		animation: swoosh 0.8s ease-in-out forwards;
		pointer-events: none;
		z-index: 20;
	}

	@keyframes swoosh {
		0% { left: -150%; }
		100% { left: 150%; }
	}
</style>
