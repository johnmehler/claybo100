<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;
	const SIZE = 8;
	let board = $state(Array(SIZE * SIZE).fill(false));
	let pos = $state(-1);
	let moves = $state(0);
	let gameOver = $state(false);

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

	function clickCell(i: number) {
		if (gameOver) return;
		if (pos === -1 || getValidMoves(pos).includes(i)) {
			board[i] = true;
			pos = i;
			moves++;
			if (getValidMoves(pos).length === 0) gameOver = true;
		}
	}

	function reset() {
		board = Array(SIZE * SIZE).fill(false);
		pos = -1;
		moves = 0;
		gameOver = false;
	}

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
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
					class:valid={isValid && !gameOver}
					onclick={() => clickCell(i)}
					disabled={gameOver || (!isValid && pos !== -1)}
				>
					{#if isCurrent}
						<svg viewBox="0 0 24 24" fill="currentColor" class="knight-icon">
							<path d="M17.5,2A1.5,1.5 0 0,1 19,3.5V10A1.5,1.5 0 0,1 17.5,11.5H16.5L13.82,14.18C13.56,14.44 13.25,14.62 12.89,14.71L9.12,15.54C9.56,16.34 10.35,17 11.5,17H17V19H7V17L8.68,14.18L6.4,11.39C5.54,10.32 5,8.96 5,7.5A5.5,5.5 0 0,1 10.5,2H17.5M10.5,4A3.5,3.5 0 0,0 7,7.5C7,8.65 7.42,9.66 8.08,10.45L10.33,13.26L13.3,12.6C13.43,12.57 13.55,12.5 13.63,12.42L15.5,10.54V4H10.5M17.5,4V10H19V4H17.5M13,6A1,1 0 0,1 14,7A1,1 0 0,1 13,8A1,1 0 0,1 12,7A1,1 0 0,1 13,6Z" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
		{#if gameOver}
			<div class="overlay" in:fade>
				<h2>{moves === SIZE * SIZE ? 'PERFECT TOUR!' : 'NO MORE MOVES'}</h2>
			</div>
		{/if}
	</div>
	<div class="bottom-bar">
		{#if gameOver}
			<GameOverMenu onPlayAgain={reset} onMenu={onBack} delay={0} />
		{/if}
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; }
	.stat .value { font-size: 5vmin; font-weight: 900; color: var(--color-illusion); }
	.stat .total { font-size: 2.5vmin; color: rgba(255,255,255,0.2); font-weight: 600; }
	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	
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
	.knight-icon { width: 5vmin; height: 5vmin; color: #000; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
	.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10; border-radius: 2vmin; }
	.overlay h2 { color: var(--color-illusion); font-size: 6vmin; margin-bottom: 3vmin; font-weight: 900; letter-spacing: -0.1vmin; }
</style>
