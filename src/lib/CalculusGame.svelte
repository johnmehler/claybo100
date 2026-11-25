<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';

	type CalcMode = 'derivatives' | 'integrals' | 'limits' | 'mixed';
	type Difficulty = 'easy' | 'medium' | 'hard';
	type Format = 'sprint' | 'fifteen';

	type Question = {
		prompt: string;
		sublabel: string;
		answer: string;
		choices: string[];
	};

	type MissedItem = {
		question: string;
		yourAnswer: string;
		correctAnswer: string;
	};

	let {
		onBack,
		registerActions,
		gameId = 'calculus'
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
	let mode = $state<CalcMode>('mixed');
	let difficulty = $state<Difficulty>('medium');
	let format = $state<Format>('sprint');
	let phase = $state<'playing' | 'done'>('playing');

	let currentQuestion = $state<Question>({
		prompt: 'd/dx (x²)',
		sublabel: 'Derivative',
		answer: '2x',
		choices: ['2x', 'x', '2', 'x²']
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

	function makeChoices(correct: string, distractors: string[]): string[] {
		const unique = [correct];
		for (const d of distractors) {
			if (d !== correct && !unique.includes(d)) unique.push(d);
			if (unique.length === 4) break;
		}
		while (unique.length < 4) {
			const fallback = `${randInt(1, 9)}x`;
			if (!unique.includes(fallback)) unique.push(fallback);
		}
		return shuffle(unique);
	}

	function sup(n: number): string {
		const map: Record<string, string> = {
			'0': '⁰',
			'1': '¹',
			'2': '²',
			'3': '³',
			'4': '⁴',
			'5': '⁵',
			'6': '⁶',
			'7': '⁷',
			'8': '⁸',
			'9': '⁹',
			'-': '⁻'
		};
		return String(n)
			.split('')
			.map((ch) => map[ch] ?? ch)
			.join('');
	}

	function term(coeff: number, power: number): string {
		if (coeff === 0) return '0';
		if (power === 0) return `${coeff}`;
		const c = coeff === 1 ? '' : coeff === -1 ? '−' : `${coeff}`;
		if (power === 1) return `${c}x`;
		return `${c}x${sup(power)}`;
	}

	function genDerivative(diff: Difficulty): Question {
		if (diff === 'easy') {
			const a = randInt(1, 6);
			const n = randInt(1, 4);
			if (n === 1) {
				const c = randInt(1, 9);
				return {
					prompt: `d/dx (${a}x + ${c})`,
					sublabel: 'Derivative',
					answer: `${a}`,
					choices: makeChoices(`${a}`, [`${a}x`, `${a + c}`, `0`])
				};
			}
			const ans = term(a * n, n - 1);
			return {
				prompt: `d/dx (${term(a, n)})`,
				sublabel: 'Derivative',
				answer: ans,
				choices: makeChoices(ans, [
					term(a, n - 1),
					term(a * n, n),
					term(a * (n - 1), Math.max(0, n - 2))
				])
			};
		}

		if (diff === 'medium') {
			const kind = randInt(0, 2);
			if (kind === 0) {
				const a = randInt(2, 5);
				const n = randInt(2, 4);
				const b = randInt(1, 7);
				const ans = `${term(a * n, n - 1)} + ${b}`;
				return {
					prompt: `d/dx (${term(a, n)} + ${b}x)`,
					sublabel: 'Derivative',
					answer: ans,
					choices: makeChoices(ans, [
						`${term(a * n, n)} + ${b}`,
						`${term(a, n - 1)} + ${b}`,
						`${term(a * n, n - 1)} + ${b}x`
					])
				};
			}
			const trigPool: [string, string, string[]][] = [
				['d/dx (sin x)', 'cos x', ['−cos x', 'sin x', '−sin x']],
				['d/dx (cos x)', '−sin x', ['sin x', '−cos x', 'cos x']],
				['d/dx (eˣ)', 'eˣ', ['xeˣ⁻¹', 'ln x', 'eˣ⁺¹']],
				['d/dx (ln x)', '1/x', ['ln x', 'eˣ', '−1/x²']],
				['d/dx (tan x)', 'sec²x', ['sec x', '−sec²x', 'cot x']]
			];
			const [prompt, answer, dist] = trigPool[randInt(0, trigPool.length - 1)];
			return {
				prompt,
				sublabel: 'Derivative',
				answer,
				choices: makeChoices(answer, dist)
			};
		}

		// hard: chain rule / higher powers
		const k = randInt(2, 5);
		const hardPool: [string, string, string[]][] = [
			[`d/dx (sin(${k}x))`, `${k}cos(${k}x)`, [`cos(${k}x)`, `−${k}cos(${k}x)`, `${k}sin(${k}x)`]],
			[`d/dx (cos(${k}x))`, `−${k}sin(${k}x)`, [`${k}sin(${k}x)`, `−sin(${k}x)`, `−${k}cos(${k}x)`]],
			[`d/dx (e^(${k}x))`, `${k}e^(${k}x)`, [`e^(${k}x)`, `${k}xe^(${k}x)`, `e^(${k - 1}x)`]],
			[`d/dx (ln(${k}x))`, `1/x`, [`${k}/x`, `1/(${k}x)`, `ln(${k})`]],
			[`d/dx (√x)`, `1/(2√x)`, [`2√x`, `1/√x`, `−1/(2√x)`]]
		];
		const [prompt, answer, dist] = hardPool[randInt(0, hardPool.length - 1)];
		return {
			prompt,
			sublabel: 'Chain & Special Rules',
			answer,
			choices: makeChoices(answer, dist)
		};
	}

	function genIntegral(diff: Difficulty): Question {
		if (diff === 'easy') {
			const n = randInt(1, 3);
			const mult = randInt(1, 4);
			const coeff = mult * (n + 1);
			const upper = randInt(1, 3);
			const val = mult * Math.pow(upper, n + 1);
			return {
				prompt: `∫₀${sup(upper)} ${term(coeff, n)} dx`,
				sublabel: 'Definite Integral',
				answer: `${val}`,
				choices: makeChoices(`${val}`, [
					`${val + upper}`,
					`${coeff * Math.pow(upper, n)}`,
					`${Math.max(1, val - mult)}`
				])
			};
		}

		if (diff === 'medium') {
			const kind = randInt(0, 1);
			if (kind === 0) {
				const n = randInt(1, 4);
				const mult = randInt(1, 4);
				const coeff = mult * (n + 1);
				const ans = `${term(mult, n + 1)} + C`;
				return {
					prompt: `∫ ${term(coeff, n)} dx`,
					sublabel: 'Indefinite Integral',
					answer: ans,
					choices: makeChoices(ans, [
						`${term(coeff * n, Math.max(0, n - 1))} + C`,
						`${term(coeff, n + 1)} + C`,
						`${term(mult, n)} + C`
					])
				};
			}
			const trigPool: [string, string, string[]][] = [
				['∫ cos x dx', 'sin x + C', ['−sin x + C', 'cos x + C', 'sec²x + C']],
				['∫ sin x dx', '−cos x + C', ['cos x + C', '−sin x + C', 'tan x + C']],
				['∫ eˣ dx', 'eˣ + C', ['xeˣ + C', 'ln x + C', 'eˣ⁺¹ + C']],
				['∫ (1/x) dx', 'ln|x| + C', ['−1/x² + C', 'eˣ + C', 'x + C']]
			];
			const [prompt, answer, dist] = trigPool[randInt(0, trigPool.length - 1)];
			return {
				prompt,
				sublabel: 'Indefinite Integral',
				answer,
				choices: makeChoices(answer, dist)
			};
		}

		// hard: definite integrals with trig/exp/bounds
		const hardPool: [string, string, string[]][] = [
			['∫₀^π sin x dx', '2', ['0', '1', '−2']],
			['∫₀^(π/2) cos x dx', '1', ['0', '−1', 'π/2']],
			['∫₁^e (1/x) dx', '1', ['e', '0', 'e − 1']],
			['∫₀¹ eˣ dx', 'e − 1', ['e', '1', 'e + 1']],
			['∫₋₁¹ x³ dx', '0', ['2', '1/2', '−1/2']]
		];
		const [prompt, answer, dist] = hardPool[randInt(0, hardPool.length - 1)];
		return {
			prompt,
			sublabel: 'Definite Integral',
			answer,
			choices: makeChoices(answer, dist)
		};
	}

	function genLimit(diff: Difficulty): Question {
		if (diff === 'easy') {
			const a = randInt(1, 5);
			const b = randInt(1, 6);
			const c = randInt(1, 5);
			const ans = a * c * c + b * c;
			return {
				prompt: `lim(x→${c}) (${term(a, 2)} + ${b}x)`,
				sublabel: 'Direct Limit',
				answer: `${ans}`,
				choices: makeChoices(`${ans}`, [`${ans + c}`, `${a * c + b}`, `${Math.max(1, ans - b)}`])
			};
		}

		if (diff === 'medium') {
			const a = randInt(2, 6);
			const b = randInt(1, 5);
			const kind = randInt(0, 1);
			if (kind === 0) {
				// (x^2 - a^2)/(x - a) as x -> a => 2a
				const ans = 2 * a;
				return {
					prompt: `lim(x→${a}) (x² − ${a * a}) / (x − ${a})`,
					sublabel: 'Removable Discontinuity',
					answer: `${ans}`,
					choices: makeChoices(`${ans}`, [`${a}`, `${a * a}`, `0`])
				};
			}
			// (ax^2 + b) / (x^2 - 1) as x -> inf => a
			return {
				prompt: `lim(x→∞) (${a}x² + ${b}) / (x² − 1)`,
				sublabel: 'Limit at Infinity',
				answer: `${a}`,
				choices: makeChoices(`${a}`, [`${b}`, `0`, `∞`])
			};
		}

		const k = randInt(2, 6);
		const hardPool: [string, string, string[]][] = [
			['lim(x→0) sin(x) / x', '1', ['0', '∞', '−1']],
			[`lim(x→0) sin(${k}x) / x`, `${k}`, ['1', `1/${k}`, '0']],
			['lim(x→0) (1 − cos x) / x', '0', ['1', '1/2', '∞']],
			['lim(x→0) (eˣ − 1) / x', '1', ['0', 'e', '∞']],
			['lim(x→∞) (1 + 1/x)ˣ', 'e', ['1', '0', '∞']]
		];
		const [prompt, answer, dist] = hardPool[randInt(0, hardPool.length - 1)];
		return {
			prompt,
			sublabel: 'Classic Limit',
			answer,
			choices: makeChoices(answer, dist)
		};
	}

	function generateQuestion(m: CalcMode, d: Difficulty, prevPrompt?: string): Question {
		for (let i = 0; i < 8; i++) {
			const picked: Exclude<CalcMode, 'mixed'> =
				m === 'mixed'
					? (['derivatives', 'integrals', 'limits'] as const)[randInt(0, 2)]
					: m;
			const q =
				picked === 'derivatives'
					? genDerivative(d)
					: picked === 'integrals'
						? genIntegral(d)
						: genLimit(d);
			if (q.prompt !== prevPrompt) return q;
		}
		return genDerivative(d);
	}

	function bestStorageKey(m: CalcMode, f: Format, d: Difficulty) {
		return `calc_best_${m}_${f}_${d}`;
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

<Instructions bind:this={instructions} {gameId} title="Calculus Drills — How to Play">
	<p>Practice derivatives, integrals, and limits at speed.</p>
	<ul>
		<li><strong>Pick a topic:</strong> Derivatives, Integrals, Limits, or Mixed.</li>
		<li><strong>Answer quickly:</strong> Click an option or press keys <strong>1–4</strong>.</li>
		<li><strong>Formats:</strong> Race a <strong>60s Sprint</strong> or complete <strong>15 Questions</strong> as fast as you can.</li>
	</ul>
</Instructions>

<div class="calc-shell" in:fade={{ duration: 250 }}>
	<div class="calc-header">
		<div class="title-block">
			<span class="op-badge">∫ dx</span>
			<div>
				<h2 class="calc-title">Calculus Drills</h2>
				<p class="calc-sub">Derivatives, integrals, and limits</p>
			</div>
		</div>

		<div class="mode-controls">
			<div class="pill-group" role="group" aria-label="Topic">
				{#each [['derivatives', 'Derivatives'], ['integrals', 'Integrals'], ['limits', 'Limits'], ['mixed', 'Mixed']] as [m, label]}
					<button
						type="button"
						class="pill-btn"
						class:active={mode === m}
						onclick={() => {
							mode = m as CalcMode;
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
			<span class="topic-tag">{currentQuestion.sublabel}</span>
			<div class="prompt-text">{currentQuestion.prompt}</div>

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
	.calc-shell {
		width: 100%;
		max-width: 780px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: var(--game-text-primary);
	}

	.calc-header {
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
		font-size: 1.05rem;
	}

	.calc-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.calc-sub {
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
		padding: 1.6rem 1.4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
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

	.prompt-text {
		font-size: clamp(1.5rem, 3.6vmin, 2.3rem);
		font-weight: 900;
		text-align: center;
		letter-spacing: -0.02em;
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
