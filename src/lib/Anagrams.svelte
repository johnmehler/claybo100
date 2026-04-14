<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import rawWordList from '$lib/wordlist.txt?raw';

	let { onBack } = $props();

	// Words in the file are uppercase, one per line — build a Set for O(1) lookups
	const DICTIONARY = new Set<string>(
		rawWordList.split(/\r?\n/).map(w => w.trim()).filter(Boolean)
	);

	const DISTRIBUTION =
		"AAAAAAAAA" + "BB" + "CC" + "DDDD" + "EEEEEEEEEEEE" + "FF" + "GGG" + "HH" + "IIIIIIIII" +
		"J" + "K" + "LLLL" + "MM" + "NNNNNN" + "OOOOOOOO" + "PP" + "Q" + "RRRRRR" + "SSSS" +
		"TTTTTT" + "UUUU" + "VV" + "WW" + "X" + "YY" + "Z";

	const GAME_DURATION = 60;

	let letters       = $state<string[]>([]);
	let currentInput  = $state("");
	let foundWords    = $state<string[]>([]);
	let missedWords   = $state<string[]>([]);
	let score         = $state(0);
	let timeLeft      = $state(GAME_DURATION);
	let isPlaying     = $state(false);
	let gameOver      = $state(false);
	let inputRef      = $state<HTMLInputElement | null>(null);
	let errorMsg      = $state<string | null>(null);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function generateLetters(): string[] {
		const pool = DISTRIBUTION.split('');
		let result: string[] = [];
		let attempts = 0;
		// Keep redrawing until the letter set yields at least 10 valid words
		do {
			result = [];
			for (let i = 0; i < 7; i++) {
				const idx = Math.floor(Math.random() * pool.length);
				result.push(pool[idx]);
			}
			attempts++;
		} while (countPossible(result) < 10 && attempts < 100);
		return result;
	}

	/** Count how many dictionary words of length >= 3 can be formed from letterSet */
	function countPossible(letterSet: string[]): number {
		let count = 0;
		for (const word of DICTIONARY) {
			if (word.length >= 3 && canFormWord(word, letterSet)) {
				if (++count >= 10) return count; // short-circuit once threshold met
			}
		}
		return count;
	}

	/** All valid words that can be formed from the current letter set */
	function computeAllPossible(letterSet: string[]): string[] {
		const possible: string[] = [];
		for (const word of DICTIONARY) {
			if (word.length >= 3 && canFormWord(word, letterSet)) {
				possible.push(word);
			}
		}
		return possible;
	}

	function canFormWord(word: string, letterSet: string[]): boolean {
		const temp = [...letterSet];
		for (const ch of word) {
			const i = temp.indexOf(ch);
			if (i === -1) return false;
			temp.splice(i, 1);
		}
		return true;
	}

	function startGame() {
		letters      = generateLetters();
		foundWords   = [];
		missedWords  = [];
		score        = 0;
		timeLeft     = GAME_DURATION;
		isPlaying    = true;
		gameOver     = false;
		currentInput = "";
		errorMsg     = null;

		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (timeLeft > 0) { timeLeft -= 1; }
			else { endGame(); }
		}, 1000);

		setTimeout(() => inputRef?.focus(), 50);
	}

	function endGame() {
		isPlaying = false;
		gameOver  = true;
		if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

		// Compute all valid words, minus ones the player already found
		const all = computeAllPossible(letters);
		missedWords = all
			.filter(w => !foundWords.includes(w))
			.sort((a, b) => b.length - a.length || a.localeCompare(b));
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!isPlaying) return;

		const word = currentInput.trim().toUpperCase();
		currentInput = "";

		if (word.length < 3) {
			triggerError("3 LETTERS MIN");
			return;
		}
		if (foundWords.includes(word)) {
			triggerError("ALREADY FOUND");
			return;
		}
		if (!canFormWord(word, letters)) {
			triggerError("INVALID LETTERS");
			return;
		}
		if (!DICTIONARY.has(word)) {
			triggerError("NOT A WORD");
			return;
		}

		foundWords = [word, ...foundWords];
		score += calculateScore(word);
	}

	function triggerError(msg: string) {
		errorMsg = msg;
		setTimeout(() => { if (errorMsg === msg) errorMsg = null; }, 1000);
	}

	function calculateScore(word: string): number {
		const pts: Record<number, number> = { 3: 100, 4: 200, 5: 400, 6: 800, 7: 1500 };
		return pts[word.length] ?? 2000;
	}

	onDestroy(() => { if (timerInterval) clearInterval(timerInterval); });
</script>

<div id="anagrams-game-inner" class="game-inner">

	<!-- Back button row -->
	<div class="nav-row">
		<button id="back-to-menu-anagrams" class="back-btn" onclick={onBack}>← MENU</button>
	</div>

	<!-- START SCREEN -->
	{#if !isPlaying && !gameOver}
		<div id="anagrams-start" class="center-fill" in:fade>
			<h1 class="logo">ANAGRAMS</h1>
			<p>Find as many words as you can from 7 letters.</p>
			<p class="hint">Min. 3 letters · 60 seconds</p>
			<button id="btn-start-anagrams" class="cta-btn" onclick={startGame}>START</button>
		</div>
	{/if}

	<!-- PLAY / RESULT SCREEN -->
	{#if isPlaying || gameOver}
		<div id="anagrams-play" class="play-area">

			<!-- Stats row -->
			<div class="section-row stats-row">
				<div class="stat">
					<span class="lbl">TIME</span>
					<span class="val" class:low-time={timeLeft <= 10 && isPlaying}>{timeLeft}s</span>
				</div>
				<div class="stat">
					<span class="lbl">SCORE</span>
					<span class="val">{score}</span>
				</div>
			</div>

			<!-- Letter tiles row -->
			<div class="section-row tiles-row">
				{#each letters as letter, i}
					<div class="tile" in:scale={{ delay: i * 50 }}>{letter}</div>
				{/each}
			</div>

			<!-- Input / action row -->
			<div class="section-row control-row">
				{#if isPlaying}
					<form onsubmit={handleSubmit} class="input-wrap">
						<input
							id="anagram-input-field"
							bind:this={inputRef}
							bind:value={currentInput}
							type="text"
							placeholder="TYPE WORD..."
							autocomplete="off"
							spellcheck="false"
						/>
						{#if errorMsg}
							<div id="anagram-error" class="err" out:fade>{errorMsg}</div>
						{/if}
					</form>
				{:else}
					<div class="action-row" in:fade>
						<button id="btn-again-anagrams" class="cta-btn" onclick={startGame}>PLAY AGAIN</button>
						<button id="btn-menu-anagrams" class="back-link" onclick={onBack}>MENU</button>
					</div>
				{/if}
			</div>

			<!-- Word tray — grows to fill remaining space, scrolls internally -->
			<div id="word-tray" class="word-tray">
				{#each foundWords as word (word)}
					<span class="tag found-tag" in:fly={{ y: 10, duration: 200 }}>{word}</span>
				{/each}
				{#if gameOver}
					{#each missedWords as word (word)}
						<span class="tag missed-tag" in:fly={{ y: 10, duration: 150 }}>{word}</span>
					{/each}
				{/if}
			</div>

		</div>
	{/if}

</div>

<style>
	/* ── Root frame — strict fixed-size flex column ── */
	.game-inner {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		height: 100%;
		overflow: hidden;
		padding: 0;
	}

	/* Back button row — fixed height at top */
	.nav-row {
		flex: 0 0 auto;
		padding: 3vmin 3vmin 0;
	}

	/* Start screen — fills remaining height, centers content */
	.center-fill {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4vmin;
		overflow: hidden;
	}

	/* Play area — fills remaining space after nav-row */
	.play-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		padding: 2vmin 3vmin 3vmin;
		gap: 0;
	}

	/* Generic fixed-size section rows */
	.section-row {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	/* ── Nav ── */
	.back-btn {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.12);
		color: rgba(255,255,255,0.4);
		padding: 0.8vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-family: inherit;
		font-size: 1.8vmin;
		transition: color 0.2s, border-color 0.2s;
	}
	.back-btn:hover { color: white; border-color: var(--color-illusion); }

	/* ── Start screen ── */
	.logo { font-size: 8vmin; color: var(--color-golden); margin: 0 0 2vmin; }
	p { color: rgba(255,255,255,0.5); font-size: 2.5vmin; margin: 0 0 1vmin; }
	.hint { font-size: 1.8vmin; opacity: 0.6; }

	/* ── CTA ── */
	.cta-btn {
		margin-top: 3vmin;
		background: var(--color-bittersweet);
		border: none;
		color: white;
		padding: 1.5vmin 6vmin;
		font-size: 2.5vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.2s;
	}
	.cta-btn:hover { background: var(--color-illusion); }

	/* ── Section row spacings ── */
	.stats-row   { gap: 8vmin; padding: 2vmin 0; }
	.tiles-row   { gap: 1.5vmin; padding: 2vmin 0; }
	.control-row { padding: 2vmin 0 3vmin; }

	/* ── Stats ── */
	.stat { display: flex; flex-direction: column; align-items: center; }
	.lbl  { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; }
	.val  { font-size: 5vmin; font-weight: 800; }
	.low-time { color: var(--color-bittersweet); }

	.tile {
		width: 7vmin;
		height: 7vmin;
		background: var(--color-golden);
		color: #1a1200;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3.5vmin;
		font-weight: 800;
		border-radius: 1vmin;
	}

	/* ── Input ── */
	.input-wrap { width: 100%; max-width: 50vmin; position: relative; }
	input {
		width: 100%;
		background: rgba(255,255,255,0.05);
		border: 2px solid rgba(255,255,255,0.1);
		padding: 1.5vmin 2vmin;
		border-radius: 1.5vmin;
		color: white;
		font-size: 3vmin;
		text-align: center;
		text-transform: uppercase;
		outline: none;
		font-family: inherit;
		font-weight: 800;
		transition: border-color 0.2s;
	}
	input:focus { border-color: var(--color-indigo); }
	.err {
		position: absolute;
		bottom: -2.5vmin;
		left: 0; right: 0;
		text-align: center;
		color: var(--color-bittersweet);
		font-size: 1.5vmin;
		font-weight: 800;
	}

	/* ── Word tray — fills all remaining space, scrolls internally ── */
	.word-tray {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 1vmin;
		justify-content: center;
		align-content: flex-start;
		overflow-y: auto;
		width: 100%;
		padding-bottom: 1vmin;
	}


	/* ── Tags ── */
	.tag {
		padding: 0.4vmin 1.5vmin;
		border-radius: 0.8vmin;
		font-size: 1.6vmin;
		font-weight: 600;
	}
	.found-tag  { background: rgba(105,175,75,0.2);  color: var(--color-apple); }
	.missed-tag { background: rgba(255,110,97,0.15); color: var(--color-bittersweet); }

	.action-row {
		display: flex;
		gap: 2vmin;
		align-items: center;
	}
	.back-link {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.15);
		color: rgba(255,255,255,0.6);
		padding: 1.5vmin 4vmin;
		border-radius: 1.5vmin;
		cursor: pointer;
		font-weight: 800;
		font-family: inherit;
		font-size: 2vmin;
		transition: color 0.2s, border-color 0.2s;
	}
	.back-link:hover { color: white; border-color: rgba(255,255,255,0.4); }
</style>
