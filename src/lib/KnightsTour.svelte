<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;
	const SIZE = 8;
	let board = $state(Array(SIZE * SIZE).fill(false));
	let pos = $state(-1);
	let firstPos = $state(-1);
	let moves = $state(0);
	let moveHistory = $state<number[]>([]);
	let gameOver = $state(false);

	// Diagnostic/Solution Mode
	let solutionPath = $state<number[]>([]);
	let mistakePos = $state(-1);
	let isSolutionMode = $state(false);
	let currentStep = $state(0);

	// The next correct move to highlight in green
	let nextCorrectPos = $derived(
		isSolutionMode && currentStep < solutionPath.length
			? solutionPath[currentStep]
			: -1
	);

	function getNeighbors(p: number, currentBoard: boolean[]) {
		const r = Math.floor(p / SIZE);
		const c = p % SIZE;
		const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
		return jumps.map(([dr, dc]) => {
			const nr = r + dr, nc = c + dc;
			if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
				const np = nr * SIZE + nc;
				return currentBoard[np] ? -1 : np;
			}
			return -1;
		}).filter(x => x !== -1);
	}

	function solveTour(start: number, initialBoard: boolean[]): number[] {
		const visitedAlready = initialBoard.filter(v => v).length;
		const stepsNeeded = SIZE * SIZE - visitedAlready - 1;

		// Try multiple times with random tie-breaking for robustness
		for (let attempt = 0; attempt < 200; attempt++) {
			const tempBoard = [...initialBoard];
			const path: number[] = [start];
			tempBoard[start] = true;
			let curr = start;

			for (let step = 0; step < stepsNeeded; step++) {
				const neighbors = getNeighbors(curr, tempBoard);
				if (neighbors.length === 0) break;

				// Warnsdorff's Rule with random tie-breaking
				neighbors.sort((a, b) => {
					const diff = getNeighbors(a, tempBoard).length - getNeighbors(b, tempBoard).length;
					return diff !== 0 ? diff : (Math.random() - 0.5);
				});

				curr = neighbors[0];
				tempBoard[curr] = true;
				path.push(curr);
			}

			if (path.length === stepsNeeded + 1) return path;
		}

		// Fallback: return best deterministic attempt
		const tempBoard = [...initialBoard];
		const path: number[] = [start];
		tempBoard[start] = true;
		let curr = start;
		for (let step = 0; step < stepsNeeded; step++) {
			const neighbors = getNeighbors(curr, tempBoard);
			if (neighbors.length === 0) break;
			neighbors.sort((a, b) => getNeighbors(a, tempBoard).length - getNeighbors(b, tempBoard).length);
			curr = neighbors[0];
			tempBoard[curr] = true;
			path.push(curr);
		}
		return path;
	}

	function startDiagnosticMode() {
		if (moveHistory.length === 0) return;

		let divergenceIdx = -1;
		let correctSuffix: number[] = [];

		// Walk backward to find the last position from which a full tour is possible
		for (let i = moveHistory.length - 1; i >= 0; i--) {
			const boardBefore = Array(SIZE * SIZE).fill(false);
			for (let j = 0; j < i; j++) boardBefore[moveHistory[j]] = true;

			const path = solveTour(moveHistory[i], boardBefore);
			if (path.length + i === SIZE * SIZE) {
				divergenceIdx = i;
				correctSuffix = path;
				break;
			}
		}

		if (divergenceIdx === -1) {
			// Couldn't find a winnable state; show best from move 0
			solutionPath = solveTour(moveHistory[0], Array(SIZE * SIZE).fill(false));
			mistakePos = -1;
			divergenceIdx = 0;
		} else {
			// The mistake is the move AFTER the last winnable position
			mistakePos = (divergenceIdx + 1 < moveHistory.length) ? moveHistory[divergenceIdx + 1] : -1;
			solutionPath = correctSuffix;
		}

		// Rebuild board to the divergence state (don't call reset, which would wipe moveHistory)
		board = Array(SIZE * SIZE).fill(false);
		pos = -1;
		moves = 0;
		gameOver = false;

		for (let i = 0; i <= divergenceIdx; i++) {
			board[moveHistory[i]] = true;
			pos = moveHistory[i];
			moves++;
		}

		// solutionPath[0] = current pos. currentStep=1 means next correct move is solutionPath[1].
		currentStep = 1;
		isSolutionMode = true;
	}

	function stepForward() {
		if (currentStep >= solutionPath.length) return;
		mistakePos = -1;
		const nextPos = solutionPath[currentStep];
		clickCell(nextPos, true);
		currentStep++;
	}

	function stepBackward() {
		if (currentStep <= 1) return;
		currentStep--;

		// Undo last move
		board[solutionPath[currentStep]] = false;
		pos = solutionPath[currentStep - 1];
		moves--;
		gameOver = false;
	}

	function exitSolutionMode() {
		isSolutionMode = false;
		mistakePos = -1;
		reset();
	}

	function getValidMoves(p: number) {
		if (p === -1) return Array.from({length: SIZE*SIZE}, (_, i) => i);
		const r = Math.floor(p / SIZE);
		const c = p % SIZE;
		const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
		return jumps.map(([dr, dc]) => {
			const nr = r + dr, nc = c + dc;
			if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
				const np = nr * SIZE + nc;
				return board[np] ? -1 : np;
			}
			return -1;
		}).filter(x => x !== -1);
	}

	function clickCell(i: number, force = false) {
		if (gameOver && !force) return;
		if (pos === -1 || getValidMoves(pos).includes(i)) {
			if (pos === -1) firstPos = i;
			board[i] = true;
			pos = i;
			moves++;
			if (!force) moveHistory.push(i);
			if (getValidMoves(pos).length === 0) gameOver = true;
		}
	}

	function reset(full = true) {
		if (full) isSolutionMode = false;
		board = Array(SIZE * SIZE).fill(false);
		pos = -1;
		if (full) {
			firstPos = -1;
			moveHistory = [];
			mistakePos = -1;
		}
		moves = 0;
		gameOver = false;
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!isSolutionMode) return;
		if (e.key === 'ArrowRight') { e.preventDefault(); stepForward(); }
		if (e.key === 'ArrowLeft') { e.preventDefault(); stepBackward(); }
		if (e.key === 'Escape') { e.preventDefault(); exitSolutionMode(); }
	}

	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="knightstour" title="Knight's Tour">
		<p><strong>Goal:</strong> Visit every single square on the chessboard exactly once.</p>
		<p>You move like a Knight in chess: two squares in one direction, and one square perpendicular (an "L" shape). Plan ahead so you don't get trapped!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">PROGRESS</span>
				<span class="value">{moves} <span class="total">/ {SIZE*SIZE}</span></span>
			</div>
			{#if gameOver}
				<div class="stat" transition:fade>
					<span class="label">STATUS</span>
					<span class="value status-text" class:perfect={moves === SIZE * SIZE} class:close={moves >= 60 && moves < 64}>
						{#if moves === SIZE * SIZE}
							PERFECT TOUR!
						{:else if moves >= 60}
							CLOSE!
						{:else}
							BETTER LUCK NEXT TIME
						{/if}
					</span>
				</div>
			{/if}
		</div>

		<div class="grid">
			{#each Array(SIZE * SIZE) as _, i}
				{@const isValid = getValidMoves(pos).includes(i)}
				{@const isCurrent = pos === i}
				{@const isVisited = board[i]}
				<button 
					class="cell" 
					class:visited={isVisited}
					class:current={isCurrent}
					class:valid={isValid && !gameOver && !isSolutionMode}
					class:mistake={mistakePos === i}
					class:correct-next={nextCorrectPos === i}
					onclick={() => clickCell(i)}
					disabled={gameOver || isSolutionMode || (!isValid && pos !== -1)}
				>
					{#if isCurrent}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="knight-icon">
							<path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456"/><path d="m15 5 1.425-1.425"/><path d="m17 8 1.53-1.53"/><path d="M9.713 12.185 7 18"/>
						</svg>
					{/if}
				</button>
			{/each}
		</div>
		{#if gameOver && moves === SIZE * SIZE}
			<div class="completion-overlay" transition:fade></div>
		{/if}
	</div>
	<div class="bottom-bar">
		{#if isSolutionMode}
			<div class="playback-controls" transition:fade>
				<div class="playback-toolbar">
					<button class="tool-btn" onclick={stepBackward} disabled={currentStep === 1} title="Backward">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
					</button>
					
					<div class="divider"></div>
					<div class="step-counter">STEP {currentStep}/{solutionPath.length}</div>
					<div class="divider"></div>

					<button class="tool-btn" onclick={stepForward} disabled={currentStep >= solutionPath.length} title="Forward">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M13 6v12l8.5-6L13 6zM4 6v12l8.5-6L4 6z"/></svg>
					</button>

					<div class="divider"></div>
					
					<button class="tool-btn exit" onclick={exitSolutionMode} title="Exit Solution">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
					</button>
				</div>
			</div>
		{:else if gameOver}
			<GameOverMenu onPlayAgain={() => reset()} onMenu={onBack} onShowOptimal={startDiagnosticMode} delay={0} />
		{/if}
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; }
	.stat .value { font-size: 4.5vmin; font-weight: 900; color: var(--color-illusion); line-height: 1.1; }
	.stat .total { font-size: 2.2vmin; color: rgba(255,255,255,0.2); font-weight: 600; margin-left: 0.5vmin; }
	.bottom-bar { height: 12vmin; display: flex; justify-content: center; align-items: center; width: 100%; padding-bottom: 2vmin; }
	
	.grid { 
		display: grid; grid-template-columns: repeat(8, 7.5vmin); gap: 0.8vmin; 
		background: rgba(255,255,255,0.015); padding: 1.5vmin; 
		border-radius: 2vmin; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px);
	}

	.cell { 
		width: 7.5vmin; height: 7.5vmin; background: rgba(255,255,255,0.03); 
		border: 1px solid rgba(255,255,255,0.05); border-radius: 1.2vmin; cursor: default; 
		transition: all 0.3s; position: relative; display: flex; align-items: center; justify-content: center; 
	}
	.cell.visited { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.1); }
	.cell.valid { background: rgba(248, 165, 194, 0.1); cursor: pointer; border: 2px solid var(--color-illusion); }
	.cell.valid:hover { background: rgba(248, 165, 194, 0.25); transform: scale(1.05); }
	.cell.current { background: var(--color-illusion); box-shadow: 0 0 20px rgba(248, 165, 194, 0.4); border: none; }
	.cell.mistake { background: rgba(255, 110, 97, 0.25) !important; box-shadow: 0 0 20px rgba(255, 110, 97, 0.4); border: 2px solid var(--color-bittersweet) !important; z-index: 5; }
	.cell.correct-next { background: rgba(76, 175, 80, 0.15) !important; border: 2px solid #4CAF50 !important; box-shadow: 0 0 20px rgba(76, 175, 80, 0.4); z-index: 5; }
	.knight-icon { width: 5vmin; height: 5vmin; color: #000; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
	
	.status-text { 
		font-size: 3vmin !important; 
		color: var(--color-bittersweet) !important; 
		white-space: nowrap; 
		letter-spacing: -0.02vmin;
		text-align: center;
	}
	.status-text.perfect { color: var(--color-illusion) !important; text-shadow: 0 0 15px rgba(248, 165, 194, 0.4); }
	.status-text.close { color: var(--color-apple) !important; }

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

	/* Playback Controls (Matching Sliding Tiles) */
	.playback-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1vmin;
		background: rgba(15, 23, 42, 0.85);
		padding: 1.2vmin 2.5vmin;
		border-radius: 2.2vmin;
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		box-shadow: 0 10px 40px rgba(0,0,0,0.5);
		max-width: 90vw;
	}

	.playback-toolbar {
		display: flex;
		align-items: center;
		gap: 1.5vmin;
	}

	.tool-btn {
		background: transparent;
		border: none;
		color: rgba(255,255,255,0.6);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1vmin;
		border-radius: 1vmin;
		transition: all 0.2s;
	}

	.tool-btn:hover:not(:disabled) {
		background: rgba(255,255,255,0.1);
		color: white;
	}

	.tool-btn:disabled {
		opacity: 0.2;
		cursor: default;
	}

	.tool-btn.main {
		background: var(--color-bittersweet);
		color: white;
		padding: 1.2vmin;
		border-radius: 50%;
		box-shadow: 0 4px 12px rgba(255, 110, 97, 0.3);
	}

	.tool-btn.main:hover {
		transform: scale(1.1);
		background: var(--color-illusion);
	}

	.tool-btn.exit {
		color: rgba(255, 255, 255, 0.4);
	}

	.tool-btn.exit:hover {
		color: var(--color-bittersweet);
	}

	.divider {
		width: 1px;
		height: 3vmin;
		background: rgba(255,255,255,0.1);
		margin: 0 1vmin;
	}

	.speed-control {
		display: none;
	}

	.step-counter {
		font-size: 1.4vmin;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.1vmin;
		min-width: 10vmin;
		text-align: center;
	}
</style>
