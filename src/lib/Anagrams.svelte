<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';

	let { onBack } = $props();

	const DISTRIBUTION = 
		"AAAAAAAAA" + "BB" + "CC" + "DDDD" + "EEEEEEEEEEEE" + "FF" + "GGG" + "HH" + "IIIIIIIII" + 
		"J" + "K" + "LLLL" + "MM" + "NNNNNN" + "OOOOOOOO" + "PP" + "Q" + "RRRRRR" + "SSSS" + 
		"TTTTTT" + "UUUU" + "VV" + "WW" + "X" + "YY" + "Z";
	
	const GAME_DURATION = 60;

	let letters = $state<string[]>([]);
	let currentInput = $state("");
	let foundWords = $state<string[]>([]);
	let score = $state(0);
	let timeLeft = $state(GAME_DURATION);
	let isPlaying = $state(false);
	let gameOver = $state(false);
	let inputRef = $state<HTMLInputElement | null>(null);
	let lastErrorCode = $state<string | null>(null);
	let timerInterval: any;

	function generateLetters() {
		const pool = DISTRIBUTION.split('');
		const result: string[] = [];
		for (let i = 0; i < 7; i++) {
			const index = Math.floor(Math.random() * pool.length);
			result.push(pool[index]);
		}
		return result;
	}

	function startGame() {
		letters = generateLetters();
		foundWords = [];
		score = 0;
		timeLeft = GAME_DURATION;
		isPlaying = true;
		gameOver = false;
		currentInput = "";
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (timeLeft > 0) timeLeft -= 1;
			else endGame();
		}, 1000);
		setTimeout(() => inputRef?.focus(), 50);
	}

	function endGame() {
		isPlaying = false;
		gameOver = true;
		if (timerInterval) clearInterval(timerInterval);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!isPlaying || currentInput.length < 3) return;
		const word = currentInput.toUpperCase().trim();
		if (foundWords.includes(word)) {
			triggerError("ALREADY FOUND");
			currentInput = "";
			return;
		}
		if (isValidAnagram(word)) {
			foundWords = [word, ...foundWords];
			score += calculateScore(word);
			currentInput = "";
		} else {
			triggerError("INVALID LETTERS");
		}
	}

	function triggerError(msg: string) {
		lastErrorCode = msg;
		setTimeout(() => { if (lastErrorCode === msg) lastErrorCode = null; }, 1000);
	}

	function isValidAnagram(word: string) {
		const tempLetters = [...letters];
		for (const char of word) {
			const index = tempLetters.indexOf(char);
			if (index === -1) return false;
			tempLetters.splice(index, 1);
		}
		return true;
	}

	function calculateScore(word: string) {
		const points = [0, 0, 0, 100, 200, 400, 800, 1500];
		return points[word.length] || 2000;
	}

	onDestroy(() => { if (timerInterval) clearInterval(timerInterval); });
</script>

<div id="anagrams-game-inner" class="game-inner">
	<button id="back-to-menu-anagrams" class="back-btn" onclick={onBack}>
		← MENU
	</button>

	{#if !isPlaying && !gameOver}
		<div id="anagrams-start" class="content-box" in:fade>
			<h1 class="logo">ANAGRAMS</h1>
			<p>Find as many words as you can from 7 letters.</p>
			<button id="btn-start-anagrams" class="cta-btn" onclick={startGame}>START</button>
		</div>
	{:else}
		<div id="anagrams-active" class="play-area" in:fade>
			<header class="game-header">
				<div class="stat">
					<span class="lbl">TIME</span>
					<span class="val" class:low-time={timeLeft <= 10}>{timeLeft}s</span>
				</div>
				<div class="stat">
					<span class="lbl">SCORE</span>
					<span class="val">{score}</span>
				</div>
			</header>

			<div class="tiles-row">
				{#each letters as letter, i}
					<div class="tile" in:scale={{ delay: i * 50 }}>{letter}</div>
				{/each}
			</div>

			{#if isPlaying}
				<form onsubmit={handleSubmit} class="input-wrap">
					<input
						id="anagram-input-field"
						bind:this={inputRef}
						bind:value={currentInput}
						type="text"
						placeholder="TYPE WORD..."
						autocomplete="off"
					/>
					{#if lastErrorCode}
						<div class="err">{lastErrorCode}</div>
					{/if}
				</form>
			{/if}

			<div class="word-tray">
				{#each foundWords as word}
					<span class="tag" in:fly={{ y: 10 }}>{word}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if gameOver}
		<div id="anagrams-game-over" class="content-box over" in:fade>
			<h1>DONE!</h1>
			<div class="big-score">{score}</div>
			<div class="row">
				<button id="btn-again-anagrams" class="cta-btn" onclick={startGame}>AGAIN</button>
				<button id="btn-menu-anagrams" class="back-link" onclick={onBack}>MENU</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		vertical-align: middle;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.back-btn {
		position: absolute;
		top: 4vmin;
		left: 4vmin;
		background: transparent;
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.4);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		transition: all 0.2s;
	}
	.back-btn:hover {
		color: white;
		border-color: var(--color-illusion);
	}

	.content-box {
		text-align: center;
		padding: 4vmin;
	}

	.logo {
		font-size: 8vmin;
		color: var(--color-golden);
		margin: 0;
	}

	p { color: rgba(255,255,255,0.5); font-size: 2.5vmin; }

	.cta-btn {
		background: var(--color-bittersweet);
		border: none;
		color: white;
		padding: 2vmin 6vmin;
		font-size: 3vmin;
		font-weight: 800;
		border-radius: 2vmin;
		cursor: pointer;
		transition: background 0.2s;
	}
	.cta-btn:hover { background: var(--color-illusion); }

	.play-area {
		width: 100%;
		padding: 6vmin;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.game-header { display: flex; gap: 8vmin; margin-bottom: 6vmin; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.lbl { font-size: 1.5vmin; color: rgba(255,255,255,0.3); font-weight: 800; }
	.val { font-size: 5vmin; font-weight: 800; }
	.low-time { color: var(--color-bittersweet); }

	.tiles-row { display: flex; gap: 1.5vmin; margin-bottom: 6vmin; }
	.tile {
		width: 8vmin;
		height: 8vmin;
		background: var(--color-golden);
		color: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 4vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
	}

	.input-wrap { width: 100%; max-width: 50vmin; position: relative; margin-bottom: 4vmin; }
	input {
		width: 100%;
		background: rgba(255,255,255,0.05);
		border: 2px solid rgba(255,255,255,0.1);
		padding: 2vmin;
		border-radius: 1.5vmin;
		color: white;
		font-size: 3vmin;
		text-align: center;
		outline: none;
	}
	input:focus { border-color: var(--color-indigo); }
	.err { position: absolute; bottom: -3vmin; left: 0; right: 0; text-align: center; color: var(--color-bittersweet); font-size: 1.5vmin; font-weight: 800; }

	.word-tray { display: flex; flex-wrap: wrap; gap: 1vmin; justify-content: center; }
	.tag { background: var(--color-indigo); padding: 0.5vmin 2vmin; border-radius: 1vmin; font-size: 1.8vmin; font-weight: 600; }

	.big-score { font-size: 12vmin; color: var(--color-apple); font-weight: 800; }
	.row { display: flex; gap: 2vmin; justify-content: center; margin-top: 4vmin; }
	.back-link { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 2vmin 6vmin; border-radius: 2vmin; cursor: pointer; font-weight: 800; }
</style>
