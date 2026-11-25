<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';

	type DrillMode = 'addsub' | 'mul' | 'div' | 'mixed';
	type Difficulty = 'easy' | 'medium' | 'hard';
	type Format = 'sprint' | 'twenty';

	type Problem = {
		a: number;
		b: number;
		op: '+' | '−' | '×' | '÷';
		answer: number;
	};

	type MissedItem = {
		question: string;
		yourAnswer: string;
		correctAnswer: number;
	};

	let {
		onBack,
		registerActions,
		gameId = 'mixed-math-drills'
	} = $props<{
		onBack?: () => void;
		registerActions?: (actions: {
			restart?: (() => void) | null;
			newShuffle?: (() => void) | null;
			help?: (() => void) | null;
		}) => void;
		gameId?: string;
	}>();

	const modeMap: Record<string, DrillMode> = {
		arithmetic: 'mixed',
		'addition-subtraction': 'addsub',
		'multiplication-drills': 'mul',
		'division-drills': 'div',
		'mixed-math-drills': 'mixed'
	};

	const modeMeta: Record<DrillMode, { title: string; subtitle: string; badge: string }> = {
		addsub: {
			title: 'Arithmetic: + / −',
			subtitle: 'Classic elementary sums and differences',
			badge: '+ / −'
		},
		mul: {
			title: 'Arithmetic: Multiplication',
			subtitle: 'Times tables speed practice',
			badge: '×'
		},
		div: {
			title: 'Arithmetic: Division',
			subtitle: 'Clean whole-number division facts',
			badge: '÷'
		},
		mixed: {
			title: 'Arithmetic',
			subtitle: 'All four operations (+, −, ×, ÷)',
			badge: '+ − × ÷'
		}
	};

	let selectedMode = $state<DrillMode>('mixed');
	const mode = $derived<DrillMode>(selectedMode);
	const meta = $derived(modeMeta[mode]);

	let instructions = $state<{ open: () => void } | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);

	let difficulty = $state<Difficulty>('medium');
	let format = $state<Format>('sprint');
	let phase = $state<'idle' | 'playing' | 'done'>('playing');

	let currentProblem = $state<Problem>({ a: 2, b: 3, op: '+', answer: 5 });
	let answerInput = $state('');
	let solved = $state(0);
	let attempts = $state(0);
	let streak = $state(0);
	let bestStreak = $state(0);
	let missed = $state<MissedItem[]>([]);

	let timeLeft = $state(60);
	let elapsedMs = $state(0);
	let startTimestamp = 0;
	let timerHandle: ReturnType<typeof setInterval> | null = null;

	let feedback = $state<'none' | 'correct' | 'wrong'>('none');
	let feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
	let isNewBest = $state(false);
	let bestRecord = $state<number | null>(null);

	const TOTAL_TWENTY = 20;
	const SPRINT_SECONDS = 60;

	function randInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function bestStorageKey(m: DrillMode, f: Format, d: Difficulty) {
		return `mathdrill_best_${m}_${f}_${d}`;
	}

	function loadBestRecord() {
		if (typeof localStorage === 'undefined') {
			bestRecord = null;
			return;
		}
		const raw = localStorage.getItem(bestStorageKey(mode, format, difficulty));
		if (!raw) {
			bestRecord = null;
			return;
		}
		const parsed = Number(raw);
		bestRecord = Number.isFinite(parsed) ? parsed : null;
	}

	function saveBestRecord(val: number) {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(bestStorageKey(mode, format, difficulty), String(val));
		bestRecord = val;
	}

	function generateProblem(m: DrillMode, d: Difficulty, prev?: Problem): Problem {
		let op: Problem['op'] = '+';
		if (m === 'addsub') {
			op = Math.random() < 0.5 ? '+' : '−';
		} else if (m === 'mul') {
			op = '×';
		} else if (m === 'div') {
			op = '÷';
		} else {
			const ops: Problem['op'][] = ['+', '−', '×', '÷'];
			op = ops[randInt(0, 3)];
		}

		let a = 0;
		let b = 0;
		let answer = 0;

		for (let tries = 0; tries < 8; tries++) {
			if (op === '+') {
				const max = d === 'easy' ? 10 : d === 'medium' ? 20 : 99;
				const min = d === 'easy' ? 0 : d === 'medium' ? 2 : 10;
				a = randInt(min, max);
				b = randInt(min, max);
				answer = a + b;
			} else if (op === '−') {
				const max = d === 'easy' ? 12 : d === 'medium' ? 25 : 99;
				const min = d === 'easy' ? 0 : d === 'medium' ? 2 : 10;
				const x = randInt(min, max);
				const y = randInt(min, max);
				a = Math.max(x, y);
				b = Math.min(x, y);
				answer = a - b;
			} else if (op === '×') {
				const max = d === 'easy' ? 5 : d === 'medium' ? 10 : 12;
				const min = d === 'easy' ? 1 : 2;
				a = randInt(min, max);
				b = randInt(min, max);
				answer = a * b;
			} else {
				const maxFactor = d === 'easy' ? 5 : d === 'medium' ? 10 : 12;
				const minFactor = d === 'easy' ? 1 : 2;
				b = randInt(minFactor, maxFactor);
				answer = randInt(minFactor, maxFactor);
				a = b * answer;
			}

			if (!prev || a !== prev.a || b !== prev.b || op !== prev.op) {
				break;
			}
		}

		return { a, b, op, answer };
	}

	function clearTimers() {
		if (timerHandle) {
			clearInterval(timerHandle);
			timerHandle = null;
		}
		if (feedbackTimeout) {
			clearTimeout(feedbackTimeout);
			feedbackTimeout = null;
		}
	}

	function focusInput() {
		setTimeout(() => {
			inputEl?.focus();
		}, 10);
	}

	function startDrill() {
		clearTimers();
		loadBestRecord();
		solved = 0;
		attempts = 0;
		streak = 0;
		bestStreak = 0;
		missed = [];
		answerInput = '';
		feedback = 'none';
		isNewBest = false;
		timeLeft = SPRINT_SECONDS;
		elapsedMs = 0;
		phase = 'playing';
		currentProblem = generateProblem(mode, difficulty);
		startTimestamp = performance.now();

		timerHandle = setInterval(() => {
			if (phase !== 'playing') return;
			const now = performance.now();
			elapsedMs = now - startTimestamp;
			if (format === 'sprint') {
				const remaining = Math.max(0, SPRINT_SECONDS - Math.floor(elapsedMs / 1000));
				timeLeft = remaining;
				if (remaining <= 0) {
					finishDrill();
				}
			}
		}, 100);

		focusInput();
	}

	function finishDrill() {
		clearTimers();
		elapsedMs = performance.now() - startTimestamp;
		phase = 'done';

		if (format === 'sprint') {
			if (solved > 0 && (bestRecord === null || solved > bestRecord)) {
				saveBestRecord(solved);
				isNewBest = true;
			}
		} else {
			const finalSec = Math.round(elapsedMs / 100) / 10;
			if (solved >= TOTAL_TWENTY && (bestRecord === null || finalSec < bestRecord)) {
				saveBestRecord(finalSec);
				isNewBest = true;
			}
		}
	}

	function triggerFeedback(kind: 'correct' | 'wrong') {
		feedback = kind;
		if (feedbackTimeout) clearTimeout(feedbackTimeout);
		feedbackTimeout = setTimeout(() => {
			feedback = 'none';
		}, 260);
	}

	function advanceProblem() {
		answerInput = '';
		currentProblem = generateProblem(mode, difficulty, currentProblem);
		focusInput();
	}

	function handleCorrect() {
		solved += 1;
		attempts += 1;
		streak += 1;
		if (streak > bestStreak) bestStreak = streak;
		triggerFeedback('correct');

		if (format === 'twenty' && solved >= TOTAL_TWENTY) {
			finishDrill();
			return;
		}
		advanceProblem();
	}

	function submitAnswer() {
		if (phase !== 'playing') return;
		const trimmed = answerInput.trim();
		if (trimmed === '') return;

		const parsed = Number(trimmed);
		if (parsed === currentProblem.answer) {
			handleCorrect();
		} else {
			attempts += 1;
			streak = 0;
			triggerFeedback('wrong');
			missed = [
				...missed,
				{
					question: `${currentProblem.a} ${currentProblem.op} ${currentProblem.b}`,
					yourAnswer: trimmed,
					correctAnswer: currentProblem.answer
				}
			];
			answerInput = '';
			focusInput();
		}
	}

	function skipProblem() {
		if (phase !== 'playing') return;
		attempts += 1;
		streak = 0;
		missed = [
			...missed,
			{
				question: `${currentProblem.a} ${currentProblem.op} ${currentProblem.b}`,
				yourAnswer: 'Skipped',
				correctAnswer: currentProblem.answer
			}
		];
		advanceProblem();
	}

	function handleInput(value: string) {
		if (phase !== 'playing') return;
		const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
		answerInput = digitsOnly;
		if (digitsOnly !== '' && Number(digitsOnly) === currentProblem.answer) {
			handleCorrect();
		}
	}

	function pressKey(digit: string) {
		if (phase !== 'playing') return;
		handleInput(answerInput + digit);
		focusInput();
	}

	function backspace() {
		if (phase !== 'playing') return;
		answerInput = answerInput.slice(0, -1);
		focusInput();
	}

	function clearInput() {
		if (phase !== 'playing') return;
		answerInput = '';
		focusInput();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (phase !== 'playing') return;
		if (e.key === 'Enter') {
			e.preventDefault();
			submitAnswer();
		} else if (e.key === 'Escape') {
			clearInput();
		}
	}

	function formatTime(ms: number) {
		const totalSec = ms / 1000;
		const mins = Math.floor(totalSec / 60);
		const secs = (totalSec % 60).toFixed(1).padStart(4, '0');
		return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
	}

	function formatCountdown(sec: number) {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const accuracy = $derived(attempts > 0 ? Math.round((solved / attempts) * 100) : 100);
	const ratePerMin = $derived(
		elapsedMs > 500 ? Math.round((solved / (elapsedMs / 60000)) * 10) / 10 : 0
	);

	$effect(() => {
		// Re-initialize when gameId changes
		selectedMode = modeMap[gameId] ?? 'mixed';
		startDrill();
	});

	$effect(() => {
		registerActions?.({
			restart: startDrill,
			newShuffle: startDrill,
			help: () => instructions?.open()
		});
		return () => {
			registerActions?.({ restart: null, newShuffle: null, help: null });
		};
	});

	onDestroy(() => {
		clearTimers();
	});
</script>

<Instructions bind:this={instructions} {gameId} title="{meta.title} — How to Play">
	<p>{meta.subtitle}.</p>
	<ul>
		<li><strong>Type your answer</strong> with your keyboard or tap the number pad.</li>
		<li><strong>Instant advance:</strong> As soon as your digits match the right answer, it automatically scores and moves to the next problem!</li>
		<li>Press <strong>Enter</strong> to check a number if you're unsure, or tap <strong>Skip</strong> to move on.</li>
		<li>Choose <strong>60s Sprint</strong> to solve as many as you can in one minute, or <strong>20 Questions</strong> to race the clock.</li>
	</ul>
</Instructions>

<div class="drill-shell" in:fade={{ duration: 250 }}>
	<div class="drill-header">
		<div class="title-block">
			<span class="op-badge">{meta.badge}</span>
			<div>
				<h2 class="drill-title">{meta.title}</h2>
				<p class="drill-sub">{meta.subtitle}</p>
			</div>
		</div>

		<div class="mode-controls">
			<div class="pill-group" role="group" aria-label="Operation">
				{#each [['mixed', 'Mixed'], ['addsub', '+ / −'], ['mul', '×'], ['div', '÷']] as [m, label]}
					<button
						type="button"
						class="pill-btn"
						class:active={selectedMode === m}
						onclick={() => {
							selectedMode = m as DrillMode;
							startDrill();
						}}
					>
						{label}
					</button>
				{/each}
			</div>

			<div class="pill-group" role="group" aria-label="Drill Format">
				<button
					type="button"
					class="pill-btn"
					class:active={format === 'sprint'}
					onclick={() => {
						format = 'sprint';
						startDrill();
					}}
				>
					60s Sprint
				</button>
				<button
					type="button"
					class="pill-btn"
					class:active={format === 'twenty'}
					onclick={() => {
						format = 'twenty';
						startDrill();
					}}
				>
					20 Questions
				</button>
			</div>

			<div class="pill-group" role="group" aria-label="Difficulty">
				{#each ['easy', 'medium', 'hard'] as diff}
					<button
						type="button"
						class="pill-btn"
						class:active={difficulty === diff}
						onclick={() => {
							difficulty = diff as Difficulty;
							startDrill();
						}}
					>
						{diff[0].toUpperCase() + diff.slice(1)}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="hud-strip">
		<div class="hud-card">
			<span class="hud-label">{format === 'sprint' ? 'TIME LEFT' : 'TIME'}</span>
			<span class="hud-value" class:urgent={format === 'sprint' && timeLeft <= 10 && phase === 'playing'}>
				{format === 'sprint' ? formatCountdown(timeLeft) : formatTime(elapsedMs)}
			</span>
		</div>
		<div class="hud-card">
			<span class="hud-label">SOLVED</span>
			<span class="hud-value">
				{format === 'twenty' ? `${solved} / ${TOTAL_TWENTY}` : solved}
			</span>
		</div>
		<div class="hud-card">
			<span class="hud-label">STREAK</span>
			<span class="hud-value">{streak}</span>
		</div>
		<div class="hud-card">
			<span class="hud-label">BEST</span>
			<span class="hud-value">
				{#if bestRecord !== null}
					{format === 'sprint' ? `${bestRecord}` : `${bestRecord}s`}
				{:else}
					—
				{/if}
			</span>
		</div>
	</div>

	{#if phase === 'playing'}
		<div
			class="flashcard"
			class:flash-correct={feedback === 'correct'}
			class:flash-wrong={feedback === 'wrong'}
		>
			<div class="problem-row" aria-live="polite">
				<span class="operand">{currentProblem.a}</span>
				<span class="operator">{currentProblem.op}</span>
				<span class="operand">{currentProblem.b}</span>
				<span class="equals">=</span>
				<input
					bind:this={inputEl}
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					autocomplete="off"
					class="answer-input"
					value={answerInput}
					oninput={(e) => handleInput((e.currentTarget as HTMLInputElement).value)}
					onkeydown={handleKeydown}
					placeholder="?"
					aria-label="Your answer"
				/>
			</div>

			<div class="keypad" aria-label="Number pad">
				{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d}
					<button type="button" class="key-btn" onclick={() => pressKey(d)}>{d}</button>
				{/each}
				<button type="button" class="key-btn key-muted" onclick={clearInput}>CLR</button>
				<button type="button" class="key-btn" onclick={() => pressKey('0')}>0</button>
				<button type="button" class="key-btn key-muted" onclick={backspace} aria-label="Backspace">⌫</button>
			</div>

			<div class="action-row">
				<button type="button" class="secondary-btn" onclick={skipProblem}>Skip</button>
				<button type="button" class="primary-btn" onclick={submitAnswer}>Check (Enter)</button>
			</div>
		</div>
	{:else if phase === 'done'}
		<div class="report-card" in:fade={{ duration: 200 }}>
			{#if isNewBest}
				<div class="best-banner">NEW PERSONAL BEST!</div>
			{/if}
			<h3 class="report-heading">Drill Complete</h3>
			<div class="report-stats">
				<div class="stat-box">
					<span class="stat-num">{solved}</span>
					<span class="stat-lbl">Solved</span>
				</div>
				<div class="stat-box">
					<span class="stat-num">{accuracy}%</span>
					<span class="stat-lbl">Accuracy</span>
				</div>
				<div class="stat-box">
					<span class="stat-num">{ratePerMin}</span>
					<span class="stat-lbl">Per Min</span>
				</div>
				<div class="stat-box">
					<span class="stat-num">{bestStreak}</span>
					<span class="stat-lbl">Best Streak</span>
				</div>
			</div>

			{#if missed.length > 0}
				<div class="missed-section">
					<h4>Review ({missed.length})</h4>
					<div class="missed-list">
						{#each missed.slice(0, 8) as item}
							<div class="missed-row">
								<span class="missed-q">{item.question} = <strong>{item.correctAnswer}</strong></span>
								<span class="missed-you">You: {item.yourAnswer}</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<p class="perfect-note">100% accuracy — clean sweep!</p>
			{/if}

			<div class="report-actions">
				<button type="button" class="primary-btn" onclick={startDrill}>Play Again</button>
				{#if onBack}
					<button type="button" class="secondary-btn" onclick={onBack}>All Games</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.drill-shell {
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 0.5rem 0;
		color: var(--game-text-primary);
	}

	.drill-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.title-block {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.op-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 48px;
		height: 48px;
		padding: 0 0.65rem;
		border-radius: 12px;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		font-weight: 800;
		font-size: 1.15rem;
		color: var(--color-golden);
	}

	.drill-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 800;
		line-height: 1.2;
	}

	.drill-sub {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		color: var(--game-text-muted);
	}

	.mode-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pill-group {
		display: inline-flex;
		padding: 3px;
		border-radius: 10px;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
	}

	.pill-btn {
		background: transparent;
		border: none;
		color: var(--game-text-muted);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.4rem 0.7rem;
		border-radius: 7px;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.pill-btn.active {
		background: var(--color-indigo);
		color: #ffffff;
	}

	.hud-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.65rem;
	}

	.hud-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		padding: 0.65rem 0.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.hud-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--game-text-soft);
	}

	.hud-value {
		font-size: 1.35rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.hud-value.urgent {
		color: var(--color-bittersweet);
	}

	.flashcard {
		background: var(--panel-bg);
		border: 2px solid var(--panel-border);
		border-radius: 18px;
		padding: 1.75rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.35rem;
		transition: border-color 0.2s ease, transform 0.15s ease, background 0.2s ease;
	}

	.flashcard.flash-correct {
		border-color: var(--color-apple);
	}

	.flashcard.flash-wrong {
		border-color: var(--color-bittersweet);
	}

	.problem-row {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.65rem;
		font-size: clamp(2.1rem, 6vw, 3.2rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.operator {
		color: var(--color-golden);
	}

	.equals {
		color: var(--game-text-muted);
	}

	.answer-input {
		width: 4ch;
		min-width: 92px;
		text-align: center;
		font-family: inherit;
		font-size: inherit;
		font-weight: 800;
		color: var(--game-text-primary);
		background: var(--game-frame-bg);
		border: 2px solid var(--panel-border);
		border-radius: 12px;
		padding: 0.2rem 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.answer-input:focus {
		border-color: var(--color-indigo);
	}

	.keypad {
		display: grid;
		grid-template-columns: repeat(3, 68px);
		gap: 0.5rem;
	}

	.key-btn {
		height: 48px;
		border-radius: 10px;
		border: 1px solid var(--panel-border);
		background: var(--game-frame-bg);
		color: var(--game-text-primary);
		font-family: inherit;
		font-size: 1.15rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.08s ease, border-color 0.15s ease;
	}

	.key-btn:hover {
		border-color: var(--color-indigo);
	}

	.key-btn:active {
		transform: scale(0.96);
	}

	.key-muted {
		font-size: 0.85rem;
		color: var(--game-text-muted);
	}

	.action-row {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		max-width: 280px;
	}

	.primary-btn,
	.secondary-btn {
		flex: 1;
		padding: 0.65rem 1rem;
		border-radius: 10px;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.primary-btn {
		background: var(--color-apple);
		color: #ffffff;
	}

	.secondary-btn {
		background: transparent;
		border-color: var(--panel-border);
		color: var(--game-text-primary);
	}

	.report-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 18px;
		padding: 1.75rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		text-align: center;
	}

	.best-banner {
		background: var(--color-golden);
		color: #1f1912;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
	}

	.report-heading {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
	}

	.report-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
		width: 100%;
	}

	.stat-box {
		background: var(--game-frame-bg);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		padding: 0.75rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.stat-num {
		font-size: 1.4rem;
		font-weight: 800;
	}

	.stat-lbl {
		font-size: 0.72rem;
		color: var(--game-text-muted);
	}

	.missed-section {
		width: 100%;
		text-align: left;
	}

	.missed-section h4 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		color: var(--game-text-muted);
	}

	.missed-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 0.45rem;
	}

	.missed-row {
		display: flex;
		justify-content: space-between;
		padding: 0.45rem 0.65rem;
		border-radius: 8px;
		background: var(--game-frame-bg);
		border: 1px solid var(--panel-border);
		font-size: 0.85rem;
	}

	.missed-you {
		color: var(--color-bittersweet);
		font-size: 0.8rem;
	}

	.perfect-note {
		margin: 0;
		color: var(--color-apple);
		font-weight: 700;
	}

	.report-actions {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		max-width: 300px;
	}

	@media (max-width: 520px) {
		.hud-strip,
		.report-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
