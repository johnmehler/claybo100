<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';

	type TrigMode = 'unit-circle' | 'radians' | 'identities' | 'mixed';
	type Difficulty = 'easy' | 'medium' | 'hard';
	type Format = 'sprint' | 'fifteen';

	type Question = {
		prompt: string;
		sublabel: string;
		answer: string;
		choices: string[];
		angleDeg?: number;
	};

	type MissedItem = {
		question: string;
		yourAnswer: string;
		correctAnswer: string;
	};

	let {
		onBack,
		registerActions,
		gameId = 'trig'
	} = $props<{
		onBack?: () => void;
		registerActions?: (actions: {
			restart?: (() => void) | null;
			newShuffle?: (() => void) | null;
			help?: (() => void) | null;
		}) => void;
		gameId?: string;
	}>();

	let instructions = $state<{ open: () => void } | null>(null);
	let mode = $state<TrigMode>('mixed');
	let difficulty = $state<Difficulty>('medium');
	let format = $state<Format>('sprint');
	let showCircle = $state(true);
	let phase = $state<'playing' | 'done'>('playing');

	let currentQuestion = $state<Question>({
		prompt: 'sin(π/6)',
		sublabel: 'Unit Circle',
		answer: '1/2',
		choices: ['1/2', '√3/2', '√2/2', '0'],
		angleDeg: 30
	});
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

	const TOTAL_QUESTIONS = 15;
	const SPRINT_SECONDS = 60;

	interface UnitEntry {
		deg: number;
		rad: string;
		sin: string;
		cos: string;
		tan: string;
	}

	const UNIT_CIRCLE: UnitEntry[] = [
		{ deg: 0, rad: '0', sin: '0', cos: '1', tan: '0' },
		{ deg: 30, rad: 'π/6', sin: '1/2', cos: '√3/2', tan: '√3/3' },
		{ deg: 45, rad: 'π/4', sin: '√2/2', cos: '√2/2', tan: '1' },
		{ deg: 60, rad: 'π/3', sin: '√3/2', cos: '1/2', tan: '√3' },
		{ deg: 90, rad: 'π/2', sin: '1', cos: '0', tan: 'undef' },
		{ deg: 120, rad: '2π/3', sin: '√3/2', cos: '−1/2', tan: '−√3' },
		{ deg: 135, rad: '3π/4', sin: '√2/2', cos: '−√2/2', tan: '−1' },
		{ deg: 150, rad: '5π/6', sin: '1/2', cos: '−√3/2', tan: '−√3/3' },
		{ deg: 180, rad: 'π', sin: '0', cos: '−1', tan: '0' },
		{ deg: 210, rad: '7π/6', sin: '−1/2', cos: '−√3/2', tan: '√3/3' },
		{ deg: 225, rad: '5π/4', sin: '−√2/2', cos: '−√2/2', tan: '1' },
		{ deg: 240, rad: '4π/3', sin: '−√3/2', cos: '−1/2', tan: '√3' },
		{ deg: 270, rad: '3π/2', sin: '−1', cos: '0', tan: 'undef' },
		{ deg: 300, rad: '5π/3', sin: '−√3/2', cos: '1/2', tan: '−√3' },
		{ deg: 315, rad: '7π/4', sin: '−√2/2', cos: '√2/2', tan: '−1' },
		{ deg: 330, rad: '11π/6', sin: '−1/2', cos: '√3/2', tan: '−√3/3' }
	];

	const VALUE_POOL = ['0', '1', '−1', '1/2', '−1/2', '√2/2', '−√2/2', '√3/2', '−√3/2', '√3', '−√3', '√3/3', '−√3/3', 'undef'];

	function randInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function shuffle<T>(arr: T[]): T[] {
		const copy = [...arr];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	function makeChoices(correct: string, pool: string[]): string[] {
		const picked = [correct];
		for (const item of shuffle(pool)) {
			if (!picked.includes(item)) picked.push(item);
			if (picked.length === 4) break;
		}
		return shuffle(picked);
	}

	function genUnitCircle(diff: Difficulty): Question {
		const entries = diff === 'easy' ? UNIT_CIRCLE.slice(0, 5) : UNIT_CIRCLE;
		const entry = entries[randInt(0, entries.length - 1)];
		const fns: ('sin' | 'cos' | 'tan')[] = diff === 'easy' ? ['sin', 'cos'] : ['sin', 'cos', 'tan'];
		const fn = fns[randInt(0, fns.length - 1)];
		const angleLabel = diff === 'easy' ? `${entry.deg}°` : entry.rad;
		const answer = entry[fn];
		return {
			prompt: `${fn}(${angleLabel})`,
			sublabel: 'Unit Circle',
			answer,
			choices: makeChoices(answer, VALUE_POOL),
			angleDeg: entry.deg
		};
	}

	function genRadians(diff: Difficulty): Question {
		const entries = diff === 'easy' ? UNIT_CIRCLE.slice(0, 5) : UNIT_CIRCLE;
		const entry = entries[randInt(0, entries.length - 1)];
		const toRad = randInt(0, 1) === 0;
		if (toRad) {
			return {
				prompt: `${entry.deg}° in radians`,
				sublabel: 'Angle Conversion',
				answer: entry.rad,
				choices: makeChoices(
					entry.rad,
					entries.map((e) => e.rad)
				),
				angleDeg: entry.deg
			};
		}
		return {
			prompt: `${entry.rad} rad in degrees`,
			sublabel: 'Angle Conversion',
			answer: `${entry.deg}°`,
			choices: makeChoices(
				`${entry.deg}°`,
				entries.map((e) => `${e.deg}°`)
			),
			angleDeg: entry.deg
		};
	}

	function genIdentities(diff: Difficulty): Question {
		const easyPool: [string, string, string[]][] = [
			['sin²θ + cos²θ', '1', ['0', '2', 'tan²θ']],
			['sin(θ) / cos(θ)', 'tan θ', ['cot θ', 'sec θ', '1']],
			['1 / sin(θ)', 'csc θ', ['sec θ', 'cot θ', 'cos θ']],
			['1 / cos(θ)', 'sec θ', ['csc θ', 'cot θ', 'tan θ']]
		];
		const hardPool: [string, string, string[]][] = [
			...easyPool,
			['1 + tan²θ', 'sec²θ', ['csc²θ', '1', 'cot²θ']],
			['sin(2θ)', '2 sin θ cos θ', ['sin²θ − cos²θ', '2 sin θ', 'cos²θ − sin²θ']],
			['cos(−θ)', 'cos θ', ['−cos θ', 'sin θ', '−sin θ']],
			['sin(−θ)', '−sin θ', ['sin θ', 'cos θ', '−cos θ']],
			['arcsin(1/2)', 'π/6', ['π/3', 'π/4', 'π/2']],
			['arccos(0)', 'π/2', ['0', 'π', 'π/4']],
			['arctan(1)', 'π/4', ['π/6', 'π/3', '0']]
		];
		const pool = diff === 'easy' ? easyPool : hardPool;
		const [prompt, answer, dist] = pool[randInt(0, pool.length - 1)];
		return {
			prompt,
			sublabel: 'Identities & Inverse',
			answer,
			choices: makeChoices(answer, dist)
		};
	}

	function generateQuestion(m: TrigMode, d: Difficulty, prevPrompt?: string): Question {
		for (let i = 0; i < 8; i++) {
			const picked: Exclude<TrigMode, 'mixed'> =
				m === 'mixed'
					? (['unit-circle', 'radians', 'identities'] as const)[randInt(0, 2)]
					: m;
			const q =
				picked === 'unit-circle'
					? genUnitCircle(d)
					: picked === 'radians'
						? genRadians(d)
						: genIdentities(d);
			if (q.prompt !== prevPrompt) return q;
		}
		return genUnitCircle(d);
	}

	function bestStorageKey(m: TrigMode, f: Format, d: Difficulty) {
		return `trig_best_${m}_${f}_${d}`;
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
		bestRecord = val;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(bestStorageKey(mode, format, difficulty), String(val));
		}
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

	function startDrill() {
		clearTimers();
		solved = 0;
		attempts = 0;
		streak = 0;
		bestStreak = 0;
		missed = [];
		feedback = 'none';
		isNewBest = false;
		phase = 'playing';
		timeLeft = SPRINT_SECONDS;
		elapsedMs = 0;
		loadBestRecord();
		currentQuestion = generateQuestion(mode, difficulty);
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
			if (solved >= TOTAL_QUESTIONS && (bestRecord === null || finalSec < bestRecord)) {
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

	function selectChoice(choice: string) {
		if (phase !== 'playing') return;
		attempts += 1;
		if (choice === currentQuestion.answer) {
			solved += 1;
			streak += 1;
			if (streak > bestStreak) bestStreak = streak;
			triggerFeedback('correct');
			if (format === 'fifteen' && solved >= TOTAL_QUESTIONS) {
				finishDrill();
				return;
			}
			currentQuestion = generateQuestion(mode, difficulty, currentQuestion.prompt);
		} else {
			streak = 0;
			triggerFeedback('wrong');
			missed = [
				...missed,
				{
					question: currentQuestion.prompt,
					yourAnswer: choice,
					correctAnswer: currentQuestion.answer
				}
			];
			currentQuestion = generateQuestion(mode, difficulty, currentQuestion.prompt);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (phase !== 'playing') return;
		const idx = ['1', '2', '3', '4'].indexOf(e.key);
		if (idx !== -1 && currentQuestion.choices[idx]) {
			e.preventDefault();
			selectChoice(currentQuestion.choices[idx]);
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
	const pointPos = $derived.by(() => {
		const deg = currentQuestion.angleDeg;
		if (deg === undefined) return null;
		const rad = (deg * Math.PI) / 180;
		return {
			x: 60 + 44 * Math.cos(rad),
			y: 60 - 44 * Math.sin(rad)
		};
	});

	$effect(() => {
		const _id = gameId;
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

<svelte:window onkeydown={handleKeydown} />

<Instructions bind:this={instructions} {gameId} title="Trigonometry — How to Play">
	<p>Master the unit circle, radian conversions, and trig identities.</p>
	<ul>
		<li><strong>Pick a topic:</strong> Unit Circle, Radians, Identities, or Mixed.</li>
		<li><strong>Visual guide:</strong> Toggle the live Unit Circle diagram on or off for extra challenge.</li>
		<li><strong>Answer quickly:</strong> Click an option or press keys <strong>1–4</strong>.</li>
	</ul>
</Instructions>

<div class="trig-shell" in:fade={{ duration: 250 }}>
	<div class="trig-header">
		<div class="title-block">
			<span class="op-badge">sin θ</span>
			<div>
				<h2 class="trig-title">Trigonometry</h2>
				<p class="trig-sub">Unit circle, radians, and trig identities</p>
			</div>
		</div>

		<div class="mode-controls">
			<div class="pill-group" role="group" aria-label="Topic">
				{#each [['unit-circle', 'Unit Circle'], ['radians', 'Radians'], ['identities', 'Identities'], ['mixed', 'Mixed']] as [m, label]}
					<button
						type="button"
						class="pill-btn"
						class:active={mode === m}
						onclick={() => {
							mode = m as TrigMode;
							startDrill();
						}}
					>
						{label}
					</button>
				{/each}
			</div>

			<div class="pill-group" role="group" aria-label="Format">
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
					class:active={format === 'fifteen'}
					onclick={() => {
						format = 'fifteen';
						startDrill();
					}}
				>
					15 Questions
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
			<span class="hud-value">{format === 'fifteen' ? `${solved} / ${TOTAL_QUESTIONS}` : solved}</span>
		</div>
		<div class="hud-card">
			<span class="hud-label">STREAK</span>
			<span class="hud-value accent">{streak}</span>
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
		<div class="stage-card" class:flash-correct={feedback === 'correct'} class:flash-wrong={feedback === 'wrong'}>
			<div class="stage-top">
				<span class="topic-tag">{currentQuestion.sublabel}</span>
				<button type="button" class="toggle-circle-btn" onclick={() => (showCircle = !showCircle)}>
					{showCircle ? 'Hide Circle' : 'Show Circle'}
				</button>
			</div>

			<div class="prompt-row">
				{#if showCircle && pointPos}
					<svg viewBox="0 0 120 120" class="unit-svg" aria-label="Unit circle diagram">
						<line x1="8" y1="60" x2="112" y2="60" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
						<line x1="60" y1="8" x2="60" y2="112" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
						<circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
						<line x1="60" y1="60" x2={pointPos.x} y2={pointPos.y} stroke="#ff6e61" stroke-width="2" />
						<circle cx={pointPos.x} cy={pointPos.y} r="4.5" fill="#ff6e61" />
					</svg>
				{/if}
				<div class="prompt-text">{currentQuestion.prompt}</div>
			</div>

			<div class="choices-grid">
				{#each currentQuestion.choices as choice, i}
					<button type="button" class="choice-btn" onclick={() => selectChoice(choice)}>
						<span class="choice-key">{i + 1}</span>
						<span class="choice-val">{choice}</span>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<div class="results-card" in:fade={{ duration: 200 }}>
			<div class="results-header">
				<h3>{format === 'sprint' ? "Time's Up!" : 'Set Complete!'}</h3>
				{#if isNewBest}
					<span class="best-badge">NEW PERSONAL BEST</span>
				{/if}
			</div>

			<div class="results-grid">
				<div class="res-stat">
					<span class="res-label">Solved</span>
					<span class="res-val">{solved}</span>
				</div>
				<div class="res-stat">
					<span class="res-label">Accuracy</span>
					<span class="res-val">{accuracy}%</span>
				</div>
				<div class="res-stat">
					<span class="res-label">Best Streak</span>
					<span class="res-val">{bestStreak}</span>
				</div>
				<div class="res-stat">
					<span class="res-label">Time</span>
					<span class="res-val">{formatTime(elapsedMs)}</span>
				</div>
			</div>

			{#if missed.length > 0}
				<div class="missed-box">
					<h4>Review Missed ({missed.length})</h4>
					<div class="missed-list">
						{#each missed.slice(0, 8) as item}
							<div class="missed-item">
								<span>{item.question}</span>
								<span class="missed-wrong">You: {item.yourAnswer}</span>
								<span class="missed-right">Ans: {item.correctAnswer}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="results-actions">
				<button type="button" class="play-again-btn" onclick={startDrill}>Play Again</button>
				{#if onBack}
					<button type="button" class="back-menu-btn" onclick={onBack}>All Games</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.trig-shell {
		width: 100%;
		max-width: 780px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: var(--game-text-primary);
	}

	.trig-header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 16px;
		padding: 0.9rem 1.1rem;
	}

	.title-block {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.op-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 3rem;
		height: 3rem;
		padding: 0 0.65rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-bittersweet) 16%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-bittersweet) 40%, transparent);
		color: var(--color-bittersweet);
		font-weight: 900;
		font-size: 0.95rem;
	}

	.trig-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.trig-sub {
		margin: 0.1rem 0 0;
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
		background: color-mix(in srgb, var(--panel-bg) 60%, black 15%);
		border: 1px solid var(--panel-border);
		border-radius: 10px;
		padding: 0.2rem;
		gap: 0.2rem;
	}

	.pill-btn {
		border: none;
		background: transparent;
		color: var(--game-text-muted);
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.38rem 0.65rem;
		border-radius: 7px;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.pill-btn:hover {
		color: var(--game-text-primary);
	}

	.pill-btn.active {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.hud-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.hud-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		padding: 0.65rem 0.85rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hud-label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--game-text-soft);
	}

	.hud-value {
		font-size: 1.35rem;
		font-weight: 900;
		margin-top: 0.15rem;
	}

	.hud-value.accent {
		color: var(--color-illusion);
	}

	.hud-value.urgent {
		color: var(--color-bittersweet);
	}

	.stage-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 20px;
		padding: 1.4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.15rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.stage-card.flash-correct {
		border-color: #69af4b;
		box-shadow: 0 0 24px rgba(105, 175, 75, 0.2);
	}

	.stage-card.flash-wrong {
		border-color: #ff6e61;
		box-shadow: 0 0 24px rgba(255, 110, 97, 0.2);
	}

	.stage-top {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.topic-tag {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-illusion);
		background: color-mix(in srgb, var(--color-illusion) 12%, transparent);
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
	}

	.toggle-circle-btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--panel-border);
		color: var(--game-text-muted);
		font-size: 0.76rem;
		font-weight: 700;
		padding: 0.28rem 0.65rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.toggle-circle-btn:hover {
		color: var(--game-text-primary);
		border-color: var(--color-bittersweet);
	}

	.prompt-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.unit-svg {
		width: 108px;
		height: 108px;
		flex-shrink: 0;
	}

	.prompt-text {
		font-size: clamp(1.6rem, 3.8vmin, 2.5rem);
		font-weight: 900;
		text-align: center;
	}

	.choices-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
		max-width: 560px;
	}

	.choice-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--panel-border);
		background: color-mix(in srgb, var(--panel-bg) 85%, white 5%);
		color: var(--game-text-primary);
		font-size: 1.05rem;
		font-weight: 800;
		cursor: pointer;
		text-align: left;
		transition: transform 0.12s ease, border-color 0.15s ease, background 0.15s ease;
	}

	.choice-btn:hover {
		border-color: var(--color-bittersweet);
		background: color-mix(in srgb, var(--color-bittersweet) 14%, transparent);
		transform: translateY(-1px);
	}

	.choice-key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border-radius: 6px;
		font-size: 0.78rem;
		background: rgba(255, 255, 255, 0.08);
		color: var(--game-text-soft);
		flex-shrink: 0;
	}

	.results-card {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 20px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.results-header h3 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 900;
	}

	.best-badge {
		font-size: 0.72rem;
		font-weight: 900;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: rgba(105, 175, 75, 0.2);
		color: #8ee06d;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.res-stat {
		background: rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.res-label {
		font-size: 0.74rem;
		color: var(--game-text-soft);
		font-weight: 700;
	}

	.res-val {
		font-size: 1.3rem;
		font-weight: 900;
		margin-top: 0.15rem;
	}

	.missed-box h4 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: var(--game-text-muted);
	}

	.missed-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.missed-item {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr;
		gap: 0.5rem;
		font-size: 0.84rem;
		padding: 0.45rem 0.7rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
	}

	.missed-wrong {
		color: #ff6e61;
	}

	.missed-right {
		color: #69af4b;
		font-weight: 700;
	}

	.results-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.play-again-btn,
	.back-menu-btn {
		padding: 0.75rem 1.4rem;
		border-radius: 10px;
		font-weight: 800;
		font-size: 0.92rem;
		cursor: pointer;
	}

	.play-again-btn {
		border: none;
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.back-menu-btn {
		border: 1px solid var(--panel-border);
		background: transparent;
		color: var(--game-text-primary);
	}

	@media (max-width: 640px) {
		.hud-strip,
		.results-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.choices-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
