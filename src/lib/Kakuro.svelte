<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import {
		STARTER_PUZZLE,
		generateKakuroPuzzle,
		type KakuroDifficulty,
		type KakuroPuzzle
	} from './kakuroEngine';

	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	let difficulty = $state<KakuroDifficulty>('easy');
	let puzzle = $state<KakuroPuzzle>(STARTER_PUZZLE);
	let board = $state<number[][]>([]);
	let notes = $state<number[][][]>([]); // bitmask-like array of candidate digits 1..9
	let selected = $state<[number, number] | null>(null);
	let notesMode = $state(false);
	let elapsedSeconds = $state(0);
	let isWon = $state(false);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function initBoardFromPuzzle(p: KakuroPuzzle) {
		puzzle = p;
		board = Array.from({ length: p.size }, () => Array(p.size).fill(0));
		notes = Array.from({ length: p.size }, () =>
			Array.from({ length: p.size }, () => [])
		);
		selected = findFirstPlayable(p);
		isWon = false;
		elapsedSeconds = 0;
		startTimer();
	}

	function findFirstPlayable(p: KakuroPuzzle): [number, number] | null {
		for (let r = 0; r < p.size; r++) {
			for (let c = 0; c < p.size; c++) {
				if (p.clues[r][c] === null) return [r, c];
			}
		}
		return null;
	}

	function startTimer() {
		stopTimer();
		timerInterval = setInterval(() => {
			if (!isWon) elapsedSeconds++;
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function resetCurrent() {
		initBoardFromPuzzle(puzzle);
	}

	function startNewPuzzle(diff: KakuroDifficulty = difficulty) {
		difficulty = diff;
		initBoardFromPuzzle(generateKakuroPuzzle(diff));
	}

	function formatTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	// Compute active runs & conflicts
	let highlightedCells = $derived.by(() => {
		const set = new Set<string>();
		if (!selected) return set;
		const [sr, sc] = selected;
		for (const run of puzzle.runs) {
			if (run.cells.some(([r, c]) => r === sr && c === sc)) {
				for (const [r, c] of run.cells) set.add(`${r},${c}`);
			}
		}
		return set;
	});

	let errorCells = $derived.by(() => {
		const errs = new Set<string>();
		for (const run of puzzle.runs) {
			const seen = new Map<number, [number, number][]>();
			let sum = 0;
			let filledCount = 0;

			for (const [r, c] of run.cells) {
				const v = board[r]?.[c] ?? 0;
				if (v > 0) {
					filledCount++;
					sum += v;
					const list = seen.get(v) ?? [];
					list.push([r, c]);
					seen.set(v, list);
				}
			}

			// Duplicate digit in run
			for (const coords of seen.values()) {
				if (coords.length > 1) {
					for (const [r, c] of coords) errs.add(`${r},${c}`);
				}
			}

			// Sum mismatch when full or exceeded
			if (
				(filledCount === run.cells.length && sum !== run.sum) ||
				sum > run.sum
			) {
				for (const [r, c] of run.cells) {
					if ((board[r]?.[c] ?? 0) > 0) errs.add(`${r},${c}`);
				}
			}
		}
		return errs;
	});

	function checkWin() {
		for (let r = 0; r < puzzle.size; r++) {
			for (let c = 0; c < puzzle.size; c++) {
				if (puzzle.clues[r][c] === null && board[r][c] === 0) return;
			}
		}
		if (errorCells.size === 0) {
			isWon = true;
			stopTimer();
		}
	}

	function setDigit(d: number) {
		if (!selected || isWon) return;
		const [r, c] = selected;
		if (puzzle.clues[r][c] !== null) return;

		if (notesMode && d > 0) {
			const current = notes[r][c];
			const next = current.includes(d)
				? current.filter((x) => x !== d)
				: [...current, d].sort((a, b) => a - b);
			notes[r][c] = next;
		} else {
			board[r][c] = d;
			if (d > 0) notes[r][c] = [];
			checkWin();
		}
	}

	function giveHint() {
		if (isWon) return;
		const candidates: [number, number][] = [];
		for (let r = 0; r < puzzle.size; r++) {
			for (let c = 0; c < puzzle.size; c++) {
				if (puzzle.clues[r][c] === null && board[r][c] !== puzzle.sol[r][c]) {
					candidates.push([r, c]);
				}
			}
		}
		if (candidates.length === 0) return;
		const target =
			selected &&
			puzzle.clues[selected[0]][selected[1]] === null &&
			board[selected[0]][selected[1]] !== puzzle.sol[selected[0]][selected[1]]
				? selected
				: candidates[Math.floor(Math.random() * candidates.length)];
		const [r, c] = target;
		board[r][c] = puzzle.sol[r][c];
		notes[r][c] = [];
		selected = [r, c];
		checkWin();
	}

	function moveSelection(dr: number, dc: number) {
		if (!selected) {
			selected = findFirstPlayable(puzzle);
			return;
		}
		let [r, c] = selected;
		for (let step = 0; step < puzzle.size; step++) {
			r = (r + dr + puzzle.size) % puzzle.size;
			c = (c + dc + puzzle.size) % puzzle.size;
			if (puzzle.clues[r][c] === null) {
				selected = [r, c];
				return;
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key >= '1' && e.key <= '9') {
			e.preventDefault();
			setDigit(Number(e.key));
		} else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
			e.preventDefault();
			setDigit(0);
		} else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
			e.preventDefault();
			moveSelection(-1, 0);
		} else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
			e.preventDefault();
			moveSelection(1, 0);
		} else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
			e.preventDefault();
			moveSelection(0, -1);
		} else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
			e.preventDefault();
			moveSelection(0, 1);
		} else if (e.key.toLowerCase() === 'n') {
			notesMode = !notesMode;
		}
	}

	onMount(() => {
		initBoardFromPuzzle(STARTER_PUZZLE);
		return () => stopTimer();
	});

	$effect(() => {
		registerActions({
			help: () => instructions.open(),
			restart: resetCurrent,
			newShuffle: () => startNewPuzzle(difficulty)
		});
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="kakuro" title="How to Play Kakuro">
		<p>
			<strong>Kakuro</strong> (Cross Sums) is a logic puzzle combining crosswords and
			Sudoku.
		</p>
		<ul style="font-size: 0.9em; opacity: 0.85; margin: 1vmin 0; padding-left: 3vmin;">
			<li>
				Fill every white cell with a digit from <strong>1 to 9</strong>.
			</li>
			<li>
				Numbers in the <strong>top-right</strong> of a clue cell give the sum of the
				horizontal run to its right.
			</li>
			<li>
				Numbers in the <strong>bottom-left</strong> of a clue cell give the sum of the
				vertical run below it.
			</li>
			<li>
				<strong>No repeats:</strong> A digit cannot appear more than once within the same
				continuous run.
			</li>
		</ul>
		<p>
			Use <strong>Arrow keys / WASD</strong> and <strong>1–9</strong> (or tap cells and
			the keypad). Press <strong>N</strong> to toggle candidate notes.
		</p>
	</Instructions>

	<InGameMenu
		{onBack}
		onHelp={() => instructions.open()}
		onRestart={resetCurrent}
		restartText="CLEAR BOARD"
	>
		{#snippet rightControls()}
			<div class="diff-group" role="group" aria-label="Difficulty">
				{#each [['easy', 'EASY'], ['med', 'MED'], ['hard', 'HARD']] as [key, label]}
					<button
						class="nav-extra-btn {difficulty === key ? 'active' : ''}"
						onclick={() => startNewPuzzle(key as KakuroDifficulty)}
					>
						{label}
					</button>
				{/each}
			</div>
			<button class="nav-extra-btn" onclick={() => startNewPuzzle(difficulty)}>
				NEW PUZZLE
			</button>
		{/snippet}
	</InGameMenu>

	<div class="status-bar" in:fade>
		<div class="stat-pill">
			<span class="stat-label">GRID</span>
			<span class="stat-val">{puzzle.size}×{puzzle.size}</span>
		</div>
		<div class="stat-pill">
			<span class="stat-label">TIME</span>
			<span class="stat-val">{formatTime(elapsedSeconds)}</span>
		</div>
		<div class="stat-pill">
			<span class="stat-label">MODE</span>
			<span class="stat-val">{notesMode ? 'NOTES' : 'DIGIT'}</span>
		</div>
	</div>

	<div class="board-stage">
		<div
			class="kakuro-grid"
			style="--grid-size: {puzzle.size};"
			role="grid"
			aria-label="Kakuro board"
		>
			{#each puzzle.clues as row, r}
				{#each row as clue, c}
					{#if clue !== null}
						<div class="cell clue-cell" aria-hidden="true">
							{#if clue.a !== undefined || clue.d !== undefined}
								<svg class="slash-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
									<line
										x1="0"
										y1="0"
										x2="100"
										y2="100"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
							{/if}
							{#if clue.a !== undefined}
								<span class="clue-across">{clue.a}</span>
							{/if}
							{#if clue.d !== undefined}
								<span class="clue-down">{clue.d}</span>
							{/if}
						</div>
					{:else}
						{@const isSelected = selected?.[0] === r && selected?.[1] === c}
						{@const isHighlighted = highlightedCells.has(`${r},${c}`)}
						{@const isError = errorCells.has(`${r},${c}`)}
						{@const val = board[r]?.[c] ?? 0}
						{@const cellNotes = notes[r]?.[c] ?? []}
						<button
							type="button"
							class="cell play-cell"
							class:selected={isSelected}
							class:highlighted={isHighlighted && !isSelected}
							class:error={isError}
							onclick={() => (selected = [r, c])}
							aria-label="Row {r + 1} Column {c + 1}{val ? `, value ${val}` : ''}"
						>
							{#if val > 0}
								<span class="cell-digit">{val}</span>
							{:else if cellNotes.length > 0}
								<div class="notes-grid">
									{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as d}
										<span class="note-num">
											{cellNotes.includes(d) ? d : ''}
										</span>
									{/each}
								</div>
							{/if}
						</button>
					{/if}
				{/each}
			{/each}

			{#if isWon}
				<div class="win-overlay" in:scale={{ duration: 250 }}>
					<div class="win-card">
						<h2>PUZZLE SOLVED!</h2>
						<p>Completed in <strong>{formatTime(elapsedSeconds)}</strong></p>
						<div class="win-actions">
							<button class="action-btn" onclick={() => startNewPuzzle(difficulty)}>
								NEXT PUZZLE
							</button>
							<button class="action-btn secondary" onclick={resetCurrent}>
								REPLAY
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="controls-dock">
			<div class="keypad">
				{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as d}
					<button class="key-btn" onclick={() => setDigit(d)}>
						{d}
					</button>
				{/each}
			</div>
			<div class="tool-row">
				<button
					class="tool-btn {notesMode ? 'active' : ''}"
					onclick={() => (notesMode = !notesMode)}
				>
					NOTES (N)
				</button>
				<button class="tool-btn" onclick={() => setDigit(0)}>ERASE</button>
				<button class="tool-btn" onclick={giveHint}>HINT</button>
			</div>
		</div>
	</div>
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
	}

	.diff-group {
		display: inline-flex;
		gap: 0.4vmin;
	}

	.nav-extra-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		color: var(--game-text-muted);
		padding: 0.9vmin 1.4vmin;
		border-radius: 1vmin;
		font-weight: 800;
		font-size: clamp(0.7rem, 1.5vmin, 0.9rem);
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-extra-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--app-text);
		color: var(--game-text-primary);
	}

	.nav-extra-btn.active {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.status-bar {
		display: flex;
		justify-content: center;
		gap: 4vmin;
		padding: 1.2vmin 2vmin;
		background: var(--panel-bg);
		border-top: 1px solid var(--panel-border);
		border-bottom: 1px solid var(--panel-border);
		margin-bottom: 2vmin;
	}

	.stat-pill {
		display: flex;
		align-items: baseline;
		gap: 1vmin;
	}

	.stat-label {
		font-size: clamp(0.65rem, 1.1vmin, 0.8rem);
		font-weight: 800;
		color: var(--game-text-soft);
	}

	.stat-val {
		font-size: clamp(0.9rem, 1.8vmin, 1.2rem);
		font-weight: 900;
		color: var(--game-text-primary);
	}

	.board-stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2.5vmin;
		padding: 0 2vmin 2vmin;
		min-height: 0;
	}

	.kakuro-grid {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--grid-size), 1fr);
		grid-template-rows: repeat(var(--grid-size), 1fr);
		width: min(52vmin, 440px);
		aspect-ratio: 1;
		border: 2px solid color-mix(in srgb, var(--app-text) 35%, transparent);
		border-radius: 1vmin;
		overflow: hidden;
		background: var(--panel-bg);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
	}

	.cell {
		position: relative;
		border: 1px solid color-mix(in srgb, var(--app-text) 16%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		font-family: inherit;
	}

	.clue-cell {
		background: color-mix(in srgb, var(--app-text) 14%, var(--app-bg));
		color: color-mix(in srgb, var(--app-text) 30%, transparent);
		user-select: none;
	}

	.slash-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.clue-across {
		position: absolute;
		top: 10%;
		right: 12%;
		font-size: clamp(0.6rem, 1.45vmin, 0.9rem);
		font-weight: 800;
		color: var(--game-text-primary);
		line-height: 1;
	}

	.clue-down {
		position: absolute;
		bottom: 10%;
		left: 12%;
		font-size: clamp(0.6rem, 1.45vmin, 0.9rem);
		font-weight: 800;
		color: var(--game-text-primary);
		line-height: 1;
	}

	.play-cell {
		background: transparent;
		color: var(--game-text-primary);
		cursor: pointer;
		transition: background 0.15s;
	}

	.play-cell:hover {
		background: color-mix(in srgb, var(--app-text) 7%, transparent);
	}

	.play-cell.highlighted {
		background: color-mix(in srgb, var(--color-golden) 12%, transparent);
	}

	.play-cell.selected {
		background: color-mix(in srgb, var(--color-bittersweet) 22%, transparent);
		box-shadow: inset 0 0 0 2px var(--color-bittersweet);
	}

	.play-cell.error .cell-digit {
		color: var(--color-bittersweet);
	}

	.play-cell.error {
		background: color-mix(in srgb, var(--color-bittersweet) 14%, transparent);
	}

	.cell-digit {
		font-size: clamp(1.1rem, 2.8vmin, 1.8rem);
		font-weight: 800;
		line-height: 1;
	}

	.notes-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		width: 85%;
		height: 85%;
		align-items: center;
		justify-items: center;
	}

	.note-num {
		font-size: clamp(0.45rem, 0.95vmin, 0.65rem);
		font-weight: 700;
		color: var(--game-text-muted);
		line-height: 1;
	}

	.controls-dock {
		display: flex;
		flex-direction: column;
		gap: 1vmin;
		width: min(52vmin, 440px);
	}

	.keypad {
		display: grid;
		grid-template-columns: repeat(9, 1fr);
		gap: 0.6vmin;
	}

	.key-btn {
		aspect-ratio: 1;
		background: var(--panel-bg);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		border-radius: 0.8vmin;
		color: var(--game-text-primary);
		font-size: clamp(0.9rem, 2vmin, 1.25rem);
		font-weight: 800;
		cursor: pointer;
		transition: all 0.15s;
	}

	.key-btn:hover {
		background: color-mix(in srgb, var(--app-text) 10%, transparent);
		border-color: var(--app-text);
		transform: translateY(-1px);
	}

	.tool-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8vmin;
	}

	.tool-btn {
		padding: 1vmin;
		background: var(--panel-bg);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		border-radius: 0.8vmin;
		color: var(--game-text-muted);
		font-size: clamp(0.7rem, 1.3vmin, 0.88rem);
		font-weight: 800;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tool-btn:hover {
		border-color: var(--app-text);
		color: var(--game-text-primary);
	}

	.tool-btn.active {
		background: var(--color-golden);
		border-color: var(--color-golden);
		color: #1f1912;
	}

	.win-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(5px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
	}

	.win-card {
		text-align: center;
		padding: 3vmin;
		color: #fff;
	}

	.win-card h2 {
		font-size: clamp(1.4rem, 3.4vmin, 2rem);
		color: var(--color-apple);
		margin: 0 0 1vmin;
	}

	.win-actions {
		display: flex;
		gap: 1.5vmin;
		justify-content: center;
		margin-top: 2vmin;
	}

	.action-btn {
		background: var(--color-apple);
		color: #0b1409;
		border: 1px solid color-mix(in srgb, var(--app-text) 25%, transparent);
		padding: 1.2vmin 2.4vmin;
		border-radius: 1vmin;
		font-weight: 900;
		font-size: clamp(0.8rem, 1.5vmin, 1rem);
		cursor: pointer;
	}

	.action-btn.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>
