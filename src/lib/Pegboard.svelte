<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	type CellState = -1 | 0 | 1; // -1: invalid, 0: empty, 1: peg
	let board = $state<CellState[]>([]);
	let selectedIdx = $state<number | null>(null);
	let possibleMoves = $state<number[]>([]);
	let movesCount = $state(0);
	let gameState = $state<'playing' | 'won' | 'lost'>('playing');
	let pegsRemaining = $derived(board.filter(cell => cell === 1).length);

	type BoardStyle = 'english' | 'european' | 'wiegleb' | 'diamond';
	let currentStyle = $state<BoardStyle>('english');
	let boardSize = $derived(currentStyle === 'wiegleb' || currentStyle === 'diamond' ? 9 : 7);
	let cellSize = $derived(boardSize === 9 ? '4.8vmin' : '6.2vmin');

	function isCellValid(style: BoardStyle, r: number, c: number): boolean {
		if (style === 'english') {
			const isCorner = (r < 2 && (c < 2 || c > 4)) || (r > 4 && (c < 2 || c > 4));
			return !isCorner;
		}
		if (style === 'european') {
			const isCorner = (r < 2 && (c < 2 || c > 4)) || (r > 4 && (c < 2 || c > 4));
			if (isCorner) {
				const isEuroCorner = (r === 1 && c === 1) || (r === 1 && c === 5) || (r === 5 && c === 1) || (r === 5 && c === 5);
				return isEuroCorner;
			}
			return true;
		}
		if (style === 'wiegleb') {
			if (r < 3 || r > 5) {
				return c >= 3 && c <= 5;
			}
			return true;
		}
		if (style === 'diamond') {
			const dist = Math.abs(r - 4) + Math.abs(c - 4);
			return dist <= 4;
		}
		return false;
	}

	function isStartEmpty(style: BoardStyle, r: number, c: number): boolean {
		if (style === 'english' || style === 'european') {
			return r === 3 && c === 3;
		}
		if (style === 'wiegleb' || style === 'diamond') {
			return r === 4 && c === 4;
		}
		return false;
	}

	function selectBoardStyle(style: BoardStyle) {
		currentStyle = style;
		initBoard();
	}

	function initBoard() {
		const newBoard: CellState[] = [];
		for (let r = 0; r < boardSize; r++) {
			for (let c = 0; c < boardSize; c++) {
				if (!isCellValid(currentStyle, r, c)) {
					newBoard.push(-1);
				} else if (isStartEmpty(currentStyle, r, c)) {
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

	function getCoord(idx: number) { return { r: Math.floor(idx / boardSize), c: idx % boardSize }; }
	function getIdx(r: number, c: number) {
		if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) return -1;
		return r * boardSize + c;
	}

	function findPossibleMoves(idx: number): number[] {
		if (board[idx] !== 1) return [];
		const { r, c } = getCoord(idx);
		const moves: number[] = [];
		const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
		for (const { dr, dc } of directions) {
			const midIdx = getIdx(r + dr, c + dc);
			const endIdx = getIdx(r + 2 * dr, c + 2 * dc);
			if (endIdx !== -1 && board[endIdx] === 0 && board[midIdx] === 1) moves.push(endIdx);
		}
		return moves;
	}

	function handleCellClick(idx: number) {
		if (gameState !== 'playing') return;
		if (board[idx] === 1) {
			if (selectedIdx === idx) {
				selectedIdx = null;
				possibleMoves = [];
			} else {
				selectedIdx = idx;
				possibleMoves = findPossibleMoves(idx);
			}
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
		const midIdx = getIdx((fR + tR) / 2, (fC + tC) / 2);
		board[fromIdx] = 0;
		board[midIdx] = 0;
		board[toIdx] = 1;
		board = [...board];
		
		const nextMoves = findPossibleMoves(toIdx);
		if (nextMoves.length > 0) {
			selectedIdx = toIdx;
			possibleMoves = nextMoves;
		} else {
			selectedIdx = null;
			possibleMoves = [];
		}
		
		movesCount++;
		checkGameState();
	}

	function checkGameState() {
		if (pegsRemaining === 1) {
			gameState = 'won';
			return;
		}
		let hasMove = false;
		for (let i = 0; i < board.length; i++) {
			if (board[i] === 1 && findPossibleMoves(i).length > 0) { hasMove = true; break; }
		}
		if (!hasMove) gameState = 'lost';
	}

	$effect(() => {
		registerActions({
			help: () => instructions.open()
		});
	});

	initBoard();
</script>

<div class="pegboard-container">
	<Instructions bind:this={instructions} gameId="pegboard" title="Peg Solitaire">
		<p><strong>Goal:</strong> Leave only one peg remaining on the board.</p>
		<p>Click a peg, then click an empty hole to jump over an adjacent peg. The jumped peg is removed. You can only jump horizontally or vertically.</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="board-selector">
			<button class="selector-btn" class:active={currentStyle === 'english'} onclick={() => selectBoardStyle('english')}>English</button>
			<button class="selector-btn" class:active={currentStyle === 'european'} onclick={() => selectBoardStyle('european')}>European</button>
			<button class="selector-btn" class:active={currentStyle === 'wiegleb'} onclick={() => selectBoardStyle('wiegleb')}>German</button>
			<button class="selector-btn" class:active={currentStyle === 'diamond'} onclick={() => selectBoardStyle('diamond')}>Diamond</button>
		</div>

		<div class="stats">
			<div class="stat">
				<span class="label">PEGS</span>
				<span class="value">{pegsRemaining}</span>
			</div>
			<button class="restart-btn" onclick={initBoard}>RESTART</button>
		</div>

		<div class="board" style="--board-size: {boardSize}; --cell-size: {cellSize};">
			{#each board as cell, i}
				{#if cell === -1}
					<div class="cell hidden"></div>
				{:else}
					<button class="cell hole" class:selected={selectedIdx === i} class:target={possibleMoves.includes(i)} onclick={() => handleCellClick(i)}>
						{#if cell === 1}
							<div class="peg" in:scale={{ duration: 200 }} out:scale={{ duration: 200 }}></div>
						{/if}
					</button>
				{/if}
			{/each}
			{#if gameState !== 'playing'}
				<div class="completion-overlay" transition:fade></div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		{#if gameState !== 'playing'}
			<GameOverMenu onPlayAgain={initBoard} onMenu={onBack} delay={800} />
		{/if}
	</div>
</div>

<style>
	.pegboard-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: var(--game-text-primary); position: relative; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.bottom-bar { min-height: 2vmin; display: flex; justify-content: center; align-items: center; width: 100%; padding-bottom: 1.5vmin; }
	.stats { display: flex; justify-content: center; align-items: center; margin-bottom: 1.5vmin; width: 100%; position: relative; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.label { font-size: 1.4vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.2vmin; }
	.value { font-size: 5vmin; font-weight: 900; color: var(--app-text); }
	.restart-btn {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		padding: 1vmin 2.5vmin;
		border-radius: 1.5vmin;
		font-size: 1.8vmin;
		font-weight: 900;
		cursor: pointer;
		background: var(--panel-bg);
		color: var(--app-text);
		border: 1px solid var(--panel-border);
		transition: all 0.2s;
	}
	.restart-btn:hover {
		background: color-mix(in srgb, var(--panel-bg) 85%, var(--app-text) 15%);
	}

	.board-selector {
		display: flex;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 0.3rem;
		border-radius: 1.5rem;
		margin-bottom: 1.5vmin;
		backdrop-filter: blur(10px);
		max-width: 95vw;
		overflow-x: auto;
	}

	.selector-btn {
		background: transparent;
		border: none;
		color: var(--game-text-soft);
		padding: 0.6rem 1.2rem;
		border-radius: 1.2rem;
		font-size: 1.5vmin;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		white-space: nowrap;
	}

	.selector-btn:hover {
		color: var(--app-text);
		background: rgba(255, 255, 255, 0.03);
	}

	.selector-btn.active {
		color: var(--game-text-on-accent);
		background: var(--color-indigo);
		box-shadow: 0 4px 12px rgba(75, 106, 190, 0.3);
	}

	.board {
		display: grid;
		grid-template-columns: repeat(var(--board-size), var(--cell-size));
		gap: 0.8vmin;
		padding: 1.5vmin;
		background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 4vmin;
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}

	.cell {
		width: var(--cell-size);
		height: var(--cell-size);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		cursor: default;
	}

	.cell.hidden { visibility: hidden; }
	.cell.hole { background: rgba(0,0,0,0.3); border: 1px solid rgba(128, 128, 128, 0.3); box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); cursor: pointer; transition: all 0.2s; }
	.cell.hole:hover { background: rgba(255,255,255,0.05); }
	.cell.selected { background: rgba(255,255,255,0.15); box-shadow: 0 0 15px rgba(255,255,255,0.2); }
	.cell.target { background: rgba(105, 175, 75, 0.2); box-shadow: inset 0 0 10px rgba(105, 175, 75, 0.3); }

	.peg {
		width: 55%;
		height: 55%;
		border-radius: 50%;
		background: #f5deb3;
		box-shadow: 0 4px 8px rgba(0,0,0,0.4);
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.selected .peg { background: #f5deb3; scale: 1.1; }

	.completion-overlay { position: absolute; top: 0; left: -150%; width: 150%; height: 100%; background: rgba(255, 255, 255, 0.3); transform: skewX(-25deg); animation: swoosh 0.8s ease-in-out forwards; pointer-events: none; z-index: 20; }

	@media (max-width: 768px) {
		.selector-btn {
			font-size: 12px;
			padding: 0.4rem 0.8rem;
		}
	}

	@keyframes swoosh { 0% { left: -150%; } 100% { left: 150%; } }
</style>
