<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let SIZE = $state(4);
	let mode = $state<'vs_ai' | 'hotseat'>('vs_ai');
	let currentTurn = $state(1); // 1 = Red (P1), 2 = Blue (P2/AI)
	let scores = $state({ 1: 0, 2: 0 });
	let hLines = $state<boolean[][]>([]);
	let vLines = $state<boolean[][]>([]);
	let boxes = $state<number[][]>([]);
	let gameOver = $state(false);
	let lastAiMove = $state<{type: 'h'|'v', r: number, c: number} | null>(null);
	let VIEWBOX_SIZE = $derived(20 + SIZE * 16);

	function reset() {
		hLines = Array(SIZE + 1).fill(0).map(() => Array(SIZE).fill(false));
		vLines = Array(SIZE).fill(0).map(() => Array(SIZE + 1).fill(false));
		boxes = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
		scores = { 1: 0, 2: 0 };
		currentTurn = 1;
		gameOver = false;
		lastAiMove = null;
	}

	$effect(() => {
		registerActions({
			help: () => instructions.open()
		});
	});

	function countBoxLines(r: number, c: number) {
		let count = 0;
		if (hLines[r][c]) count++;
		if (hLines[r + 1][c]) count++;
		if (vLines[r][c]) count++;
		if (vLines[r][c + 1]) count++;
		return count;
	}

	function getAvailableLines() {
		let lines: {type: 'h'|'v', r: number, c: number}[] = [];
		for (let r = 0; r <= SIZE; r++) {
			for (let c = 0; c < SIZE; c++) {
				if (!hLines[r][c]) lines.push({ type: 'h', r, c });
			}
		}
		for (let r = 0; r < SIZE; r++) {
			for (let c = 0; c <= SIZE; c++) {
				if (!vLines[r][c]) lines.push({ type: 'v', r, c });
			}
		}
		return lines;
	}

	function checkGameOver() {
		if (scores[1] + scores[2] === SIZE * SIZE) {
			gameOver = true;
		}
	}

	function drawLine(type: 'h'|'v', r: number, c: number) {
		if (gameOver) return;
		if (mode === 'vs_ai' && currentTurn === 2) return;
		lastAiMove = null;
		applyMove(type, r, c);
	}

	function applyMove(type: 'h'|'v', r: number, c: number) {
		if (type === 'h') {
			hLines[r][c] = true;
		} else {
			vLines[r][c] = true;
		}

		let boxesCompleted = 0;
		if (type === 'h') {
			if (r > 0 && countBoxLines(r - 1, c) === 4 && boxes[r - 1][c] === 0) {
				boxes[r - 1][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
			if (r < SIZE && countBoxLines(r, c) === 4 && boxes[r][c] === 0) {
				boxes[r][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
		} else {
			if (c > 0 && countBoxLines(r, c - 1) === 4 && boxes[r][c - 1] === 0) {
				boxes[r][c - 1] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
			if (c < SIZE && countBoxLines(r, c) === 4 && boxes[r][c] === 0) {
				boxes[r][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
		}

		checkGameOver();

		if (boxesCompleted === 0) {
			currentTurn = currentTurn === 1 ? 2 : 1;
		}

		if (mode === 'vs_ai' && currentTurn === 2 && !gameOver) {
			setTimeout(aiTurn, 500);
		}
	}

	function aiTurn() {
		if (gameOver || currentTurn !== 2) return;
		let lines = getAvailableLines();
		if (lines.length === 0) return;

		for (let line of lines) {
			let completesBox = false;
			if (line.type === 'h') {
				if (line.r > 0 && countBoxLines(line.r - 1, line.c) === 3) completesBox = true;
				if (line.r < SIZE && countBoxLines(line.r, line.c) === 3) completesBox = true;
			} else {
				if (line.c > 0 && countBoxLines(line.r, line.c - 1) === 3) completesBox = true;
				if (line.c < SIZE && countBoxLines(line.r, line.c) === 3) completesBox = true;
			}
			if (completesBox) {
				lastAiMove = { type: line.type, r: line.r, c: line.c };
				applyMove(line.type, line.r, line.c);
				return;
			}
		}

		let safeLines = lines.filter(line => {
			if (line.type === 'h') {
				let s1 = line.r > 0 ? countBoxLines(line.r - 1, line.c) < 2 : true;
				let s2 = line.r < SIZE ? countBoxLines(line.r, line.c) < 2 : true;
				return s1 && s2;
			} else {
				let s1 = line.c > 0 ? countBoxLines(line.r, line.c - 1) < 2 : true;
				let s2 = line.c < SIZE ? countBoxLines(line.r, line.c) < 2 : true;
				return s1 && s2;
			}
		});

		if (safeLines.length > 0) {
			let chosen = safeLines[Math.floor(Math.random() * safeLines.length)];
			lastAiMove = { type: chosen.type, r: chosen.r, c: chosen.c };
			applyMove(chosen.type, chosen.r, chosen.c);
			return;
		}

		// Improve AI: When forced to give away a box, find the move that minimizes the length of the chain given away.
		let minBoxes = Infinity;
		let bestLines: {type: 'h'|'v', r: number, c: number}[] = [];

		for (let line of lines) {
			let boxesLost = evaluateLine(line);
			if (boxesLost < minBoxes) {
				minBoxes = boxesLost;
				bestLines = [line];
			} else if (boxesLost === minBoxes) {
				bestLines.push(line);
			}
		}

		let chosen = bestLines.length > 0 ? bestLines[Math.floor(Math.random() * bestLines.length)] : lines[0];
		lastAiMove = { type: chosen.type, r: chosen.r, c: chosen.c };
		applyMove(chosen.type, chosen.r, chosen.c);
	}

	function evaluateLine(line: {type: 'h'|'v', r: number, c: number}) {
		let hl = hLines.map(r => [...r]);
		let vl = vLines.map(r => [...r]);
		let b = boxes.map(r => [...r]);
		
		if (line.type === 'h') hl[line.r][line.c] = true;
		else vl[line.r][line.c] = true;

		let boxesTaken = 0;
		let found = true;
		while (found) {
			found = false;
			for (let r = 0; r <= SIZE; r++) {
				for (let c = 0; c < SIZE; c++) {
					if (!hl[r][c]) {
						hl[r][c] = true;
						let completed = false;
						if (r > 0) {
							let count = (hl[r-1][c]?1:0) + (hl[r][c]?1:0) + (vl[r-1][c]?1:0) + (vl[r-1][c+1]?1:0);
							if (count === 4 && b[r-1][c] === 0) { b[r-1][c] = 1; completed = true; boxesTaken++; }
						}
						if (r < SIZE) {
							let count = (hl[r][c]?1:0) + (hl[r+1][c]?1:0) + (vl[r][c]?1:0) + (vl[r][c+1]?1:0);
							if (count === 4 && b[r][c] === 0) { b[r][c] = 1; completed = true; boxesTaken++; }
						}
						if (completed) found = true;
						else hl[r][c] = false;
					}
				}
			}
			for (let r = 0; r < SIZE; r++) {
				for (let c = 0; c <= SIZE; c++) {
					if (!vl[r][c]) {
						vl[r][c] = true;
						let completed = false;
						if (c > 0) {
							let count = (hl[r][c-1]?1:0) + (hl[r+1][c-1]?1:0) + (vl[r][c-1]?1:0) + (vl[r][c]?1:0);
							if (count === 4 && b[r][c-1] === 0) { b[r][c-1] = 1; completed = true; boxesTaken++; }
						}
						if (c < SIZE) {
							let count = (hl[r][c]?1:0) + (hl[r+1][c]?1:0) + (vl[r][c]?1:0) + (vl[r][c+1]?1:0);
							if (count === 4 && b[r][c] === 0) { b[r][c] = 1; completed = true; boxesTaken++; }
						}
						if (completed) found = true;
						else vl[r][c] = false;
					}
				}
			}
		}
		return boxesTaken;
	}

	reset();
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="dotsandboxes" title="Dots and Boxes">
		<p><strong>Goal:</strong> Capture more boxes than the AI.</p>
		<p>Take turns drawing a single horizontal or vertical line between two adjacent dots. If you draw the 4th line that closes a 1x1 box, you capture it and <strong>must take another turn!</strong></p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat scoreboard-stat">
				<div class="score p1">
					<span class="label">P1 (RED)</span>
					<span class="val">{scores[1]}</span>
				</div>
				<div class="score p2">
					<span class="label">{mode === 'vs_ai' ? 'AI (BLUE)' : 'P2 (BLUE)'}</span>
					<span class="val">{scores[2]}</span>
				</div>
			</div>
			<div class="stat turn-stat">
				<span class="label">STATUS</span>
				<div class="status-msg">
					{#if gameOver}
						<div class="game-over-container" in:fade>
							<span style="color: {scores[1] > scores[2] ? 'var(--color-bittersweet)' : (scores[2] > scores[1] ? 'var(--color-apple)' : 'white')}">
								{scores[1] > scores[2] ? 'YOU WIN!' : (scores[2] > scores[1] ? 'AI WINS!' : 'TIE GAME!')}
							</span>
							<button class="play-again-btn" onclick={reset}>
								PLAY AGAIN
							</button>
						</div>
					{:else}
						<span style="color: {currentTurn === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
							{currentTurn === 1 ? (mode === 'vs_ai' ? 'YOUR TURN' : 'P1 TURN') : (mode === 'vs_ai' ? 'AI TURN' : 'P2 TURN')}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="svg-container">
			<svg viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}" class="board-svg">
				{#each Array(SIZE) as _, r}
					{#each Array(SIZE) as _, c}
						{#if boxes[r][c] !== 0}
							<rect x={10 + c*16} y={10 + r*16} width={16} height={16} 
								fill={boxes[r][c] === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'} opacity="0.3" in:fade />
						{/if}
					{/each}
				{/each}

				{#each Array(SIZE + 1) as _, r}
					{#each Array(SIZE) as _, c}
						{#if hLines[r][c]}
							<rect x={10 + c*16} y={10 + r*16 - 1} width={16} height={2} 
								fill={lastAiMove?.type === 'h' && lastAiMove.r === r && lastAiMove.c === c ? 'var(--app-text)' : 'white'} 
								rx="1" in:fade={{duration: 100}} />
						{/if}
					{/each}
				{/each}

				{#each Array(SIZE) as _, r}
					{#each Array(SIZE + 1) as _, c}
						{#if vLines[r][c]}
							<rect x={10 + c*16 - 1} y={10 + r*16} width={2} height={16} 
								fill={lastAiMove?.type === 'v' && lastAiMove.r === r && lastAiMove.c === c ? 'var(--app-text)' : 'white'} 
								rx="1" in:fade={{duration: 100}} />
						{/if}
					{/each}
				{/each}

				{#each Array(SIZE + 1) as _, r}
					{#each Array(SIZE + 1) as _, c}
						<circle cx={10 + c*16} cy={10 + r*16} r="2.2" fill="var(--app-text)" />
					{/each}
				{/each}

				{#each Array(SIZE + 1) as _, r}
					{#each Array(SIZE) as _, c}
						{#if !hLines[r][c]}
							<rect x={10 + c*16 + 2} y={10 + r*16 - 4} width={12} height={8} fill="transparent" class="click-zone"
								onclick={() => drawLine('h', r, c)} />
						{/if}
					{/each}
				{/each}

				{#each Array(SIZE) as _, r}
					{#each Array(SIZE + 1) as _, c}
						{#if !vLines[r][c]}
							<rect x={10 + c*16 - 4} y={10 + r*16 + 2} width={8} height={12} fill="transparent" class="click-zone"
								onclick={() => drawLine('v', r, c)} />
						{/if}
					{/each}
				{/each}
			</svg>
		</div>
	</div>

	<div class="bottom-bar">
		<div class="controls">
			<div class="control-group">
				<span class="label">MODE</span>
				<div class="diff-select">
					<button class="diff-btn" class:active={mode === 'vs_ai'} onclick={() => { mode='vs_ai'; reset(); }}>VS AI</button>
					<button class="diff-btn" class:active={mode === 'hotseat'} onclick={() => { mode='hotseat'; reset(); }}>HOTSEAT</button>
				</div>
			</div>
			<div class="control-group">
				<span class="label">GRID SIZE</span>
				<div class="diff-select">
					<button class="diff-btn" class:active={SIZE === 4} onclick={() => { SIZE=4; reset(); }}>5x5</button>
					<button class="diff-btn" class:active={SIZE === 7} onclick={() => { SIZE=7; reset(); }}>8x8</button>
				</div>
			</div>
		</div>
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

	.game-stats { display: flex; justify-content: center; align-items: center; gap: 6vmin; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.scoreboard-stat { flex-direction: row; gap: 6vmin; }
	.score { display: flex; flex-direction: column; align-items: center; }
	.score .val { font-size: 6vmin; font-weight: 900; }
	.p1 .val { color: var(--color-bittersweet); }
	.p2 .val { color: var(--color-apple); }
	.status-msg { font-size: 5vmin; font-weight: 900; letter-spacing: 1px; }
	.game-over-container { display: flex; flex-direction: column; align-items: center; gap: 1vmin; }
	.play-again-btn { 
		background: var(--color-bittersweet); 
		color: black; 
		border: none; 
		padding: 1vmin 3vmin; 
		border-radius: 1vmin; 
		font-size: 1.8vmin; 
		font-weight: 900; 
		cursor: pointer; 
		transition: all 0.3s;
		box-shadow: 0 4px 15px rgba(255, 110, 97, 0.3);
	}
	.play-again-btn:hover { 
		transform: scale(1.05); 
		box-shadow: 0 6px 20px rgba(255, 110, 97, 0.5); 
	}
	.play-again-btn:active { transform: scale(0.95); }

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	.controls { display: flex; align-items: center; gap: 4vmin; }
	.control-group { display: flex; flex-direction: column; align-items: center; gap: 0.5vmin; }
	.diff-select { display: flex; gap: 1vmin; }
	.diff-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--game-text-muted); padding: 1vmin 3vmin; border-radius: 1vmin; cursor: pointer; font-weight: 900; font-size: 1.6vmin; transition: all 0.3s; }
	.diff-btn:hover { color: var(--game-text-primary); border-color: rgba(255,255,255,0.3); }
	.diff-btn.active { color: var(--app-bg); background: var(--app-text); border-color: var(--app-text); box-shadow: 0 0 15px rgba(255, 255, 255, 0.3); }

	.svg-container {
		width: min(55vmin, calc(100vw - 12vmin), calc(100% - 4vmin));
		height: min(55vmin, calc(100vw - 12vmin), calc(100% - 4vmin));
		background: rgba(255,255,255,0.015);
		border-radius: 3vmin;
		border: 1px solid rgba(255,255,255,0.08);
		backdrop-filter: blur(10px);
		padding: 2vmin;
		box-sizing: border-box;
		max-width: 100%;
		max-height: 100%;
	}
	.board-svg { width: 100%; height: 100%; }
	.click-zone { cursor: pointer; transition: fill 0.2s; }
	.click-zone:hover { fill: rgba(255,255,255,0.1); }
</style>
