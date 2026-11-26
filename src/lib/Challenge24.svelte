<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';

	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	type Difficulty = 'levels' | 'easy' | 'med' | 'hard';

	const LEVEL_PUZZLES: number[][] = [
		[1, 2, 3, 4], // Level 1: (1 + 2 + 3) × 4 = 24
		[4, 4, 4, 4], // Level 2: 4 × 4 + 4 + 4 = 24
		[2, 3, 4, 6], // Level 3: 4 × 6 × (3 − 2) = 24
		[2, 5, 5, 10], // Level 4: (5 − 2 ÷ 10) × 5 = 24
		[1, 4, 5, 6], // Level 5: 4 ÷ (1 − 5 ÷ 6) = 24
		[1, 3, 4, 6], // Level 6: 6 ÷ (1 − 3 ÷ 4) = 24
		[4, 4, 7, 7], // Level 7: 7 × (4 − 4 ÷ 7) = 24
		[3, 3, 7, 7], // Level 8: 7 × (3 + 3 ÷ 7) = 24
		[1, 5, 5, 5], // Level 9: 5 × (5 − 1 ÷ 5) = 24
		[23, 23, 23, 23] // Level 10: (23 × 23 + 23) ÷ 23 = 24
	];

	interface Frac {
		n: number;
		d: number;
	}

	interface CardBlock {
		id: number;
		val: Frac;
		expr: string;
		used: boolean;
	}

	function gcd(a: number, b: number): number {
		let x = Math.abs(a);
		let y = Math.abs(b);
		while (y !== 0) {
			const t = x % y;
			x = y;
			y = t;
		}
		return x || 1;
	}

	function makeFrac(n: number, d = 1): Frac {
		if (d < 0) {
			n = -n;
			d = -d;
		}
		const g = gcd(n, d);
		return { n: n / g, d: d / g };
	}

	function applyOp(a: Frac, b: Frac, op: string): Frac | null {
		if (op === '+') return makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
		if (op === '-') return makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
		if (op === '*') return makeFrac(a.n * b.n, a.d * b.d);
		if (op === '/') {
			if (b.n === 0) return null;
			return makeFrac(a.n * b.d, a.d * b.n);
		}
		return null;
	}

	function formatFrac(f: Frac): string {
		return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
	}

	function isTwentyFour(f: Frac): boolean {
		return f.d === 1 && f.n === 24;
	}

	/**
	 * Finds a valid expression reaching 24 from the given numbers, or null if unsolvable.
	 * When integerOnly is true, rejects intermediate fractions (used for Easy mode).
	 */
	function solve24(
		items: { val: Frac; expr: string }[],
		integerOnly: boolean
	): string | null {
		if (items.length === 1) {
			return isTwentyFour(items[0].val) ? items[0].expr : null;
		}

		for (let i = 0; i < items.length; i++) {
			for (let j = i + 1; j < items.length; j++) {
				const a = items[i];
				const b = items[j];
				const rest = items.filter((_, idx) => idx !== i && idx !== j);

				const ops: { val: Frac; expr: string }[] = [];
				const add = applyOp(a.val, b.val, '+')!;
				ops.push({ val: add, expr: `(${a.expr} + ${b.expr})` });

				const mul = applyOp(a.val, b.val, '*')!;
				ops.push({ val: mul, expr: `(${a.expr} × ${b.expr})` });

				const sub1 = applyOp(a.val, b.val, '-')!;
				ops.push({ val: sub1, expr: `(${a.expr} − ${b.expr})` });

				const sub2 = applyOp(b.val, a.val, '-')!;
				ops.push({ val: sub2, expr: `(${b.expr} − ${a.expr})` });

				const div1 = applyOp(a.val, b.val, '/');
				if (div1 && (!integerOnly || div1.d === 1)) {
					ops.push({ val: div1, expr: `(${a.expr} ÷ ${b.expr})` });
				}

				const div2 = applyOp(b.val, a.val, '/');
				if (div2 && (!integerOnly || div2.d === 1)) {
					ops.push({ val: div2, expr: `(${b.expr} ÷ ${a.expr})` });
				}

				for (const next of ops) {
					const found = solve24([...rest, next], integerOnly);
					if (found) return found;
				}
			}
		}

		return null;
	}

	let difficulty = $state<Difficulty>('levels');
	let currentLevel = $state(0);
	let initialNums = $state<number[]>([]);
	let blocks = $state<CardBlock[]>([]);
	let historyStack = $state<CardBlock[][]>([]);
	let selectedBlockId = $state<number | null>(null);
	let selectedOp = $state<string | null>(null);
	let solutionHint = $state<string | null>(null);
	let showSolution = $state(false);
	let solved = $state(false);
	let streak = $state(0);
	let elapsedSeconds = $state(0);
	let nextId = 1;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function startTimer() {
		stopTimer();
		timerInterval = setInterval(() => {
			if (!solved) elapsedSeconds++;
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function formatTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function loadLevel(idx: number) {
		difficulty = 'levels';
		currentLevel = Math.max(0, Math.min(idx, LEVEL_PUZZLES.length - 1));
		const nums = LEVEL_PUZZLES[currentLevel];
		const items = nums.map((n) => ({ val: makeFrac(n), expr: String(n) }));
		const found = solve24(items, false) ?? '';
		initialNums = [...nums];
		solutionHint = found ? found.slice(1, -1) : null;
		resetHand();
		elapsedSeconds = 0;
		startTimer();
	}

	function dealNewHand(diff: Difficulty = difficulty) {
		difficulty = diff;

		if (diff === 'levels') {
			loadLevel(currentLevel);
			return;
		}

		const maxVal = diff === 'hard' ? 13 : 9;
		const integerOnly = diff === 'easy';

		let nums: number[] = [3, 8, 3, 8];
		let sol: string | null = null;

		for (let attempt = 0; attempt < 400; attempt++) {
			const cand = Array.from(
				{ length: 4 },
				() => 1 + Math.floor(Math.random() * maxVal)
			);
			const items = cand.map((n) => ({ val: makeFrac(n), expr: String(n) }));
			const found = solve24(items, integerOnly);
			if (found) {
				// For med/hard, prefer hands that aren't trivial pure-addition if easy failed
				nums = cand;
				sol = found;
				break;
			}
		}

		if (!sol) {
			nums = [1, 2, 3, 4];
			sol = '((1 + 2 + 3) × 4)';
		}

		initialNums = nums;
		solutionHint = sol.slice(1, -1); // strip outer parens
		resetHand();
		elapsedSeconds = 0;
		startTimer();
	}

	function resetHand() {
		nextId = 1;
		blocks = initialNums.map((n) => ({
			id: nextId++,
			val: makeFrac(n),
			expr: String(n),
			used: false
		}));
		historyStack = [];
		selectedBlockId = null;
		selectedOp = null;
		showSolution = false;
		solved = false;
	}

	function undo() {
		if (historyStack.length === 0 || solved) return;
		blocks = historyStack[historyStack.length - 1];
		historyStack = historyStack.slice(0, -1);
		selectedBlockId = null;
		selectedOp = null;
	}

	function selectBlock(id: number) {
		if (solved) return;
		const block = blocks.find((b) => b.id === id);
		if (!block || block.used) return;

		if (selectedBlockId === null) {
			selectedBlockId = id;
			return;
		}

		if (selectedBlockId === id) {
			selectedBlockId = null;
			selectedOp = null;
			return;
		}

		if (!selectedOp) {
			selectedBlockId = id;
			return;
		}

		const first = blocks.find((b) => b.id === selectedBlockId);
		if (!first || first.used) return;

		const res = applyOp(first.val, block.val, selectedOp);
		if (!res) {
			// Division by zero
			selectedBlockId = null;
			selectedOp = null;
			return;
		}

		const opSymbol =
			selectedOp === '*' ? '×' : selectedOp === '/' ? '÷' : selectedOp === '-' ? '−' : '+';
		const snapshot = blocks.map((b) => ({ ...b, val: { ...b.val } }));
		historyStack = [...historyStack, snapshot];

		const newBlock: CardBlock = {
			id: nextId++,
			val: res,
			expr: `(${first.expr} ${opSymbol} ${block.expr})`,
			used: false
		};

		blocks = [
			...blocks.map((b) =>
				b.id === first.id || b.id === block.id ? { ...b, used: true } : b
			),
			newBlock
		];

		const active = blocks.filter((b) => !b.used);
		if (active.length === 1 && isTwentyFour(active[0].val)) {
			solved = true;
			streak++;
			stopTimer();
			selectedBlockId = null;
		} else {
			selectedBlockId = newBlock.id;
		}
		selectedOp = null;
	}

	function selectOp(op: string) {
		if (solved || selectedBlockId === null) return;
		selectedOp = selectedOp === op ? null : op;
	}

	function nextChallenge() {
		if (difficulty === 'levels') {
			if (currentLevel + 1 < LEVEL_PUZZLES.length) {
				loadLevel(currentLevel + 1);
			} else {
				dealNewHand('hard');
			}
		} else {
			dealNewHand(difficulty);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (solved && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			nextChallenge();
			return;
		}
		const active = blocks.filter((b) => !b.used);
		if (e.key >= '1' && e.key <= '4') {
			const idx = Number(e.key) - 1;
			if (active[idx]) selectBlock(active[idx].id);
		} else if (e.key === '+') {
			selectOp('+');
		} else if (e.key === '-') {
			selectOp('-');
		} else if (e.key === '*' || e.key.toLowerCase() === 'x') {
			selectOp('*');
		} else if (e.key === '/') {
			e.preventDefault();
			selectOp('/');
		} else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') {
			e.preventDefault();
			undo();
		} else if (e.key.toLowerCase() === 'r') {
			resetHand();
		}
	}

	onMount(() => {
		loadLevel(0);
		return () => stopTimer();
	});

	$effect(() => {
		registerActions({
			help: () => instructions.open(),
			restart: resetHand,
			newShuffle: nextChallenge
		});
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="challenge24" title="How to Play Challenge 24">
		<p>
			Combine all <strong>4 numbers</strong> using <strong>+</strong>, <strong>−</strong>,
			<strong>×</strong>, and <strong>÷</strong> to make <strong>24</strong>.
		</p>
		<ul style="font-size: 0.9em; opacity: 0.85; margin: 1vmin 0; padding-left: 3vmin;">
			<li>Each of the four starting numbers must be used <strong>exactly once</strong>.</li>
			<li>Select a number, choose an operator, then select a second number to combine them.</li>
			<li>
				<strong>Easy</strong> uses 1–9 with whole-number steps; <strong>Med</strong> uses
				1–9 (fractions allowed); <strong>Hard</strong> uses 1–13.
			</li>
		</ul>
		<p>
			Keyboard: <strong>1–4</strong> to pick cards, <strong>+ − * /</strong> for operators,
			<strong>Z / Backspace</strong> to undo.
		</p>
	</Instructions>

	<InGameMenu
		{onBack}
		onHelp={() => instructions.open()}
		onRestart={resetHand}
		restartText="RESET"
	>
		{#snippet rightControls()}
			<div class="diff-group" role="group" aria-label="Difficulty">
				{#each [['levels', 'LEVELS'], ['easy', 'EASY'], ['med', 'MED'], ['hard', 'HARD']] as [key, label]}
					<button
						class="nav-extra-btn {difficulty === key ? 'active' : ''}"
						onclick={() => {
							streak = 0;
							if (key === 'levels') loadLevel(0);
							else dealNewHand(key as Difficulty);
						}}
					>
						{label}
					</button>
				{/each}
			</div>
			{#if difficulty !== 'levels'}
				<button class="nav-extra-btn" onclick={() => dealNewHand(difficulty)}>
					NEW HAND
				</button>
			{/if}
		{/snippet}
	</InGameMenu>

	<div class="status-bar" in:fade>
		{#if difficulty === 'levels'}
			<div class="stat-pill">
				<span class="stat-label">LEVEL</span>
				<span class="stat-val">{currentLevel + 1} / {LEVEL_PUZZLES.length}</span>
			</div>
		{/if}
		<div class="stat-pill">
			<span class="stat-label">TARGET</span>
			<span class="stat-val target">24</span>
		</div>
		<div class="stat-pill">
			<span class="stat-label">STREAK</span>
			<span class="stat-val">{streak}</span>
		</div>
		<div class="stat-pill">
			<span class="stat-label">TIME</span>
			<span class="stat-val">{formatTime(elapsedSeconds)}</span>
		</div>
	</div>

	{#if difficulty === 'levels'}
		<div class="level-strip" role="navigation" aria-label="Levels">
			{#each LEVEL_PUZZLES as _, idx}
				<button
					type="button"
					class="lvl-btn {currentLevel === idx ? 'active' : ''}"
					onclick={() => loadLevel(idx)}
				>
					{idx + 1}
				</button>
			{/each}
		</div>
	{/if}

	<div class="stage">
		<div class="cards-grid">
			{#each blocks.filter((b) => !b.used) as block (block.id)}
				<button
					type="button"
					class="num-card"
					class:selected={selectedBlockId === block.id}
					class:won={solved && isTwentyFour(block.val)}
					onclick={() => selectBlock(block.id)}
					in:scale={{ duration: 180 }}
				>
					<span class="card-val">{formatFrac(block.val)}</span>
					{#if block.expr !== formatFrac(block.val)}
						<span class="card-expr">{block.expr}</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="op-row" role="group" aria-label="Operators">
			{#each [['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷']] as [op, sym]}
				<button
					type="button"
					class="op-btn"
					class:active={selectedOp === op}
					disabled={selectedBlockId === null || solved}
					onclick={() => selectOp(op)}
				>
					{sym}
				</button>
			{/each}
		</div>

		<div class="utility-row">
			<button
				type="button"
				class="util-btn"
				disabled={historyStack.length === 0 || solved}
				onclick={undo}
			>
				UNDO
			</button>
			<button
				type="button"
				class="util-btn"
				onclick={() => (showSolution = !showSolution)}
			>
				{showSolution ? 'HIDE HINT' : 'HINT'}
			</button>
		</div>

		{#if showSolution && solutionHint}
			<div class="hint-banner" in:fade>
				Solution: <strong>{solutionHint} = 24</strong>
			</div>
		{/if}

		{#if solved}
			<div class="win-banner" in:scale={{ duration: 220 }}>
				<span>24! SOLVED IN {formatTime(elapsedSeconds)}</span>
				<button
					type="button"
					class="next-btn"
					onclick={nextChallenge}
				>
					{difficulty === 'levels' && currentLevel + 1 < LEVEL_PUZZLES.length
						? `LEVEL ${currentLevel + 2} →`
						: difficulty === 'levels'
							? 'RANDOM HARD →'
							: 'NEXT HAND →'}
				</button>
			</div>
		{/if}
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
		gap: 5vmin;
		padding: 1.4vmin 2vmin;
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
		font-size: clamp(1rem, 2vmin, 1.35rem);
		font-weight: 900;
	}

	.stat-val.target {
		color: var(--color-golden);
	}

	.level-strip {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.6vmin;
		padding: 0 2vmin;
		margin-bottom: 1vmin;
	}

	.lvl-btn {
		min-width: 2.2rem;
		padding: 0.5vmin 0.9vmin;
		border-radius: 0.8vmin;
		background: var(--panel-bg);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		color: var(--game-text-muted);
		font-weight: 800;
		font-size: clamp(0.7rem, 1.3vmin, 0.85rem);
		cursor: pointer;
		transition: all 0.15s;
	}

	.lvl-btn:hover {
		border-color: var(--app-text);
		color: var(--game-text-primary);
	}

	.lvl-btn.active {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3vmin;
		padding: 0 2vmin 3vmin;
	}

	.cards-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2vmin;
		max-width: 620px;
	}

	.num-card {
		min-width: clamp(82px, 14vmin, 130px);
		min-height: clamp(92px, 16vmin, 145px);
		padding: 1.5vmin;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.8vmin;
		background: var(--panel-bg);
		border: 2px solid color-mix(in srgb, var(--app-text) 24%, transparent);
		border-radius: 1.6vmin;
		color: var(--game-text-primary);
		cursor: pointer;
		transition: all 0.18s;
	}

	.num-card:hover {
		border-color: var(--app-text);
		transform: translateY(-2px);
	}

	.num-card.selected {
		border-color: var(--color-bittersweet);
		background: color-mix(in srgb, var(--color-bittersweet) 18%, transparent);
		box-shadow: 0 0 20px rgba(255, 110, 97, 0.25);
	}

	.num-card.won {
		border-color: var(--color-apple);
		background: color-mix(in srgb, var(--color-apple) 22%, transparent);
	}

	.card-val {
		font-size: clamp(1.8rem, 4.5vmin, 3rem);
		font-weight: 900;
		line-height: 1;
	}

	.card-expr {
		font-size: clamp(0.65rem, 1.15vmin, 0.85rem);
		color: var(--game-text-muted);
		font-weight: 700;
	}

	.op-row {
		display: flex;
		gap: 1.5vmin;
	}

	.op-btn {
		width: clamp(54px, 8.5vmin, 72px);
		height: clamp(54px, 8.5vmin, 72px);
		border-radius: 1.2vmin;
		background: var(--panel-bg);
		border: 1.5px solid color-mix(in srgb, var(--app-text) 24%, transparent);
		color: var(--game-text-primary);
		font-size: clamp(1.4rem, 3vmin, 2rem);
		font-weight: 900;
		cursor: pointer;
		transition: all 0.15s;
	}

	.op-btn:hover:not(:disabled) {
		border-color: var(--color-golden);
		color: var(--color-golden);
	}

	.op-btn.active {
		background: var(--color-golden);
		border-color: var(--color-golden);
		color: #1f1912;
	}

	.op-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.utility-row {
		display: flex;
		gap: 1.5vmin;
	}

	.util-btn {
		padding: 1vmin 2.2vmin;
		border-radius: 1vmin;
		background: var(--panel-bg);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		color: var(--game-text-muted);
		font-size: clamp(0.75rem, 1.3vmin, 0.9rem);
		font-weight: 800;
		cursor: pointer;
		transition: all 0.15s;
	}

	.util-btn:hover:not(:disabled) {
		border-color: var(--app-text);
		color: var(--game-text-primary);
	}

	.util-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.hint-banner {
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		background: color-mix(in srgb, var(--color-golden) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-golden) 45%, transparent);
		font-size: clamp(0.85rem, 1.5vmin, 1rem);
	}

	.win-banner {
		display: flex;
		align-items: center;
		gap: 2vmin;
		padding: 1.4vmin 2.4vmin;
		border-radius: 1.2vmin;
		background: color-mix(in srgb, var(--color-apple) 20%, transparent);
		border: 1.5px solid var(--color-apple);
		font-weight: 900;
		font-size: clamp(0.9rem, 1.7vmin, 1.1rem);
	}

	.next-btn {
		padding: 0.9vmin 1.8vmin;
		border-radius: 0.8vmin;
		background: var(--color-apple);
		border: 1px solid color-mix(in srgb, var(--app-text) 25%, transparent);
		color: #0b1409;
		font-weight: 900;
		cursor: pointer;
	}
</style>
