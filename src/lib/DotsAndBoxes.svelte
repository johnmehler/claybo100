<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';

	let { onBack } = $props();
	let instructions: any;

	let SIZE = $state(4);
	let VIEWBOX_SIZE = $derived(20 + SIZE * 16);

	// Svelte 5 nested arrays need to be reactive
	let hLines = $state(Array(SIZE + 1).fill(0).map(() => Array(SIZE).fill(false)));
	let vLines = $state(Array(SIZE).fill(0).map(() => Array(SIZE + 1).fill(false)));
	let boxes = $state(Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)));

	let currentTurn = $state(1); // 1 = Player, 2 = AI
	let scores = $state([0, 0, 0]); // Index 1 is P1, 2 is AI
	let gameOver = $state(false);
	let lastAiMove = $state<{type: 'h'|'v', r: number, c: number} | null>(null);

	function reset() {
		hLines = Array(SIZE + 1).fill(0).map(() => Array(SIZE).fill(false));
		vLines = Array(SIZE).fill(0).map(() => Array(SIZE + 1).fill(false));
		boxes = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
		currentTurn = 1;
		scores = [0, 0, 0];
		gameOver = false;
		lastAiMove = null;
	}

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
		if (gameOver || (currentTurn === 2 && getAvailableLines().length > 0)) return; // Don't let player click during AI turn, but allow if forced (shouldn't happen)

		// Extra safety to block player while AI is supposedly running
		if (currentTurn === 2) return;
		
		if (currentTurn === 1) lastAiMove = null;

		applyMove(type, r, c);
	}

	function applyMove(type: 'h'|'v', r: number, c: number) {
		if (type === 'h') {
			let newHLines = [...hLines];
			newHLines[r][c] = true;
			hLines = newHLines;
		} else {
			let newVLines = [...vLines];
			newVLines[r][c] = true;
			vLines = newVLines;
		}

		let boxesCompleted = 0;
		let newBoxes = [...boxes];

		if (type === 'h') {
			if (r > 0 && countBoxLines(r - 1, c) === 4 && boxes[r - 1][c] === 0) {
				newBoxes[r - 1][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
			if (r < SIZE && countBoxLines(r, c) === 4 && boxes[r][c] === 0) {
				newBoxes[r][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
		} else {
			if (c > 0 && countBoxLines(r, c - 1) === 4 && boxes[r][c - 1] === 0) {
				newBoxes[r][c - 1] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
			if (c < SIZE && countBoxLines(r, c) === 4 && boxes[r][c] === 0) {
				newBoxes[r][c] = currentTurn;
				scores[currentTurn]++;
				boxesCompleted++;
			}
		}

		boxes = newBoxes;

		checkGameOver();

		if (boxesCompleted === 0) {
			currentTurn = currentTurn === 1 ? 2 : 1;
		}

		if (currentTurn === 2 && !gameOver) {
			setTimeout(aiTurn, 500);
		}
	}

	function aiTurn() {
		if (gameOver || currentTurn !== 2) return;

		let lines = getAvailableLines();
		if (lines.length === 0) return;

		// 1. Find winning move
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

		// 2. Find safe move
		let safeLines = [];
		for (let line of lines) {
			let isSafe = true;
			if (line.type === 'h') {
				if (line.r > 0 && countBoxLines(line.r - 1, line.c) === 2) isSafe = false;
				if (line.r < SIZE && countBoxLines(line.r, line.c) === 2) isSafe = false;
			} else {
				if (line.c > 0 && countBoxLines(line.r, line.c - 1) === 2) isSafe = false;
				if (line.c < SIZE && countBoxLines(line.r, line.c) === 2) isSafe = false;
			}
			if (isSafe) safeLines.push(line);
		}

		let chosen;
		if (safeLines.length > 0) {
			chosen = safeLines[Math.floor(Math.random() * safeLines.length)];
		} else {
			// 3. Sacrifice move (try to pick one that gives away the fewest boxes, but random is okay for simple AI)
			chosen = lines[Math.floor(Math.random() * lines.length)];
		}

		lastAiMove = { type: chosen.type, r: chosen.r, c: chosen.c };
		applyMove(chosen.type, chosen.r, chosen.c);
	}

</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="dotsandboxes" title="Dots and Boxes">
		<p><strong>Goal:</strong> Capture more boxes than the AI.</p>
		<p>Take turns drawing a single horizontal or vertical line between two adjacent dots. If you draw the 4th line that closes a 1x1 box, you capture it and <strong>must take another turn!</strong></p>
	</Instructions>

	<InGameMenu 
		{onBack} 
		onHelp={() => instructions.open()} 
		onRestart={reset}
	>
		<div class="turn">
			{#if gameOver}
				<span style="color: {scores[1] > scores[2] ? 'var(--color-bittersweet)' : (scores[2] > scores[1] ? 'var(--color-apple)' : 'white')}">
					{scores[1] > scores[2] ? 'YOU WIN!' : (scores[2] > scores[1] ? 'AI WINS!' : 'TIE GAME!')}
				</span>
			{:else}
				<span style="color: {currentTurn === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'}">
					{currentTurn === 1 ? 'YOUR TURN' : 'AI TURN'}
				</span>
			{/if}
		</div>
		{#snippet rightControls()}
			<div class="diff-select">
				<button class="diff-btn" class:active={SIZE === 4} onclick={() => { SIZE=4; reset(); }}>5x5</button>
				<button class="diff-btn" class:active={SIZE === 7} onclick={() => { SIZE=7; reset(); }}>8x8</button>
			</div>
		{/snippet}
	</InGameMenu>

	<div class="scoreboard">
		<div class="score p1">
			<span class="label">YOU</span>
			<span class="val">{scores[1]}</span>
		</div>
		<div class="score p2">
			<span class="label">AI</span>
			<span class="val">{scores[2]}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="svg-container">
			<svg viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}" class="board-svg">
				<!-- Boxes -->
				{#each Array(SIZE) as _, r}
					{#each Array(SIZE) as _, c}
						{#if boxes[r][c] !== 0}
							<rect x={10 + c*16} y={10 + r*16} width={16} height={16} 
								fill={boxes[r][c] === 1 ? 'var(--color-bittersweet)' : 'var(--color-apple)'} opacity="0.3" in:fade />
						{/if}
					{/each}
				{/each}

				<!-- Drawn Lines -->
				{#each Array(SIZE + 1) as _, r}
					{#each Array(SIZE) as _, c}
						{#if hLines[r][c]}
							<rect x={10 + c*16} y={10 + r*16 - 1} width={16} height={2} 
								fill={lastAiMove?.type === 'h' && lastAiMove.r === r && lastAiMove.c === c ? 'var(--color-golden)' : 'white'} 
								rx="1" in:fade={{duration: 100}} />
						{/if}
					{/each}
				{/each}

				{#each Array(SIZE) as _, r}
					{#each Array(SIZE + 1) as _, c}
						{#if vLines[r][c]}
							<rect x={10 + c*16 - 1} y={10 + r*16} width={2} height={16} 
								fill={lastAiMove?.type === 'v' && lastAiMove.r === r && lastAiMove.c === c ? 'var(--color-golden)' : 'white'} 
								rx="1" in:fade={{duration: 100}} />
						{/if}
					{/each}
				{/each}

				<!-- Dots -->
				{#each Array(SIZE + 1) as _, r}
					{#each Array(SIZE + 1) as _, c}
						<circle cx={10 + c*16} cy={10 + r*16} r="2" fill="var(--color-illusion)" />
					{/each}
				{/each}

				<!-- Click Zones -->
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

	<div class="bottom-bar"></div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.turn { font-size: 3vmin; font-weight: 900; letter-spacing: 2px; }

	.diff-select { display: flex; gap: 0.5vmin; margin-right: 1vmin; }
	.diff-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.4vmin; transition: all 0.2s; }
	.diff-btn:hover { color: white; border-color: rgba(255,255,255,0.3); }
	.diff-btn.active { color: black; background: var(--color-illusion); border-color: var(--color-illusion); }

	.scoreboard { display: flex; justify-content: center; gap: 10vmin; margin-top: 2vmin; margin-bottom: 2vmin; }
	.score { display: flex; flex-direction: column; align-items: center; }
	.label { font-size: 1.5vmin; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 0.2vmin; }
	.val { font-size: 6vmin; font-weight: 900; }
	.p1 .val { color: var(--color-bittersweet); }
	.p2 .val { color: var(--color-apple); }

	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; padding: 4vmin; box-sizing: border-box; }
	.bottom-bar { height: 12vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	.svg-container { width: 65vmin; height: 65vmin; background: rgba(255,255,255,0.02); border-radius: 2vmin; border: 1px solid rgba(255,255,255,0.05); }
	.board-svg { width: 100%; height: 100%; }

	.click-zone { cursor: pointer; transition: fill 0.2s; }
	.click-zone:hover { fill: rgba(255,255,255,0.1); }
</style>
