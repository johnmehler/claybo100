<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack } = $props();
	let instructions: any;

	type Card = { id: number, c: number, s: number, n: number, f: number };
	let deck = $state<Card[]>([]);
	let board = $state<Card[]>([]);
	let selected = $state<number[]>([]);
	let score = $state(0);

	const colors = ['var(--color-bittersweet)', 'var(--color-apple)', 'var(--color-golden)'];

	function init() {
		let temp = [];
		let id = 0;
		for(let c=0; c<3; c++)
		for(let s=0; s<3; s++)
		for(let n=0; n<3; n++)
		for(let f=0; f<3; f++)
			temp.push({ id: id++, c, s, n, f });
		temp.sort(() => Math.random() - 0.5);
		deck = temp;
		board = deck.splice(0, 12);
		selected = [];
		score = 0;
	}

	function clickCard(id: number) {
		if (selected.includes(id)) {
			selected = selected.filter(x => x !== id);
		} else {
			if (selected.length < 3) {
				selected.push(id);
				if (selected.length === 3) {
					checkSet();
				}
			}
		}
	}

	function checkSet() {
		let c1 = board.find(x => x.id === selected[0])!;
		let c2 = board.find(x => x.id === selected[1])!;
		let c3 = board.find(x => x.id === selected[2])!;

		let valid = true;
		for (let prop of ['c', 's', 'n', 'f'] as const) {
			let unique = new Set([c1[prop], c2[prop], c3[prop]]).size;
			if (unique === 2) valid = false;
		}

		if (valid) {
			score++;
			setTimeout(() => {
				for (let id of selected) {
					let idx = board.findIndex(x => x.id === id);
					if (deck.length > 0 && board.length <= 12) board[idx] = deck.pop()!;
					else board.splice(idx, 1);
				}
				selected = [];
			}, 400);
		} else {
			setTimeout(() => selected = [], 400);
		}
	}

	function add3() {
		if (deck.length >= 3) board.push(...deck.splice(0, 3));
	}

	init();
</script>

<svg width="0" height="0" style="position: absolute;">
	<defs>
		<pattern id="stripes-0" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="var(--color-bittersweet)" /></pattern>
		<pattern id="stripes-1" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="var(--color-apple)" /></pattern>
		<pattern id="stripes-2" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="var(--color-golden)" /></pattern>
	</defs>
</svg>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="set" title="Set">
		<p><strong>Goal:</strong> Find a "Set" of three cards.</p>
		<p>For each of the four attributes (Color, Shape, Number, Shading), the three cards must either be <strong>all the same</strong> or <strong>all entirely different</strong>.</p>
		<p>Scan the board carefully. There is almost always a valid Set hidden in plain sight!</p>
	</Instructions>

	<div class="nav-row">
		<div class="nav-group">
			<button class="back-btn" onclick={onBack}>BACK</button>
			<button class="help-btn" onclick={() => instructions.open()}>HOW TO PLAY</button>
		</div>
		<div class="score">SETS: <span style="color: var(--color-illusion)">{score}</span></div>
		<button class="restart-btn" onclick={add3} disabled={deck.length === 0}>+3 CARDS</button>
	</div>

	<div class="board-wrapper">
		<div class="board">
			{#each board as card (card.id)}
				<button class="card {selected.includes(card.id) ? 'selected' : ''}" onclick={() => clickCard(card.id)} in:scale>
					{#each Array(card.n + 1) as _}
						<svg class="shape" viewBox="0 0 24 12" style="color: {colors[card.c]}">
							{#if card.s === 0}
								<!-- Oval -->
								<rect x="2" y="1" width="20" height="10" rx="5" 
									fill={card.f === 0 ? 'currentColor' : (card.f === 2 ? `url(#stripes-${card.c})` : 'none')} 
									stroke="currentColor" stroke-width="2" />
							{:else if card.s === 1}
								<!-- Diamond -->
								<polygon points="12,1 22,6 12,11 2,6" 
									fill={card.f === 0 ? 'currentColor' : (card.f === 2 ? `url(#stripes-${card.c})` : 'none')} 
									stroke="currentColor" stroke-width="2" />
							{:else}
								<!-- Squiggle/Pill proxy -->
								<path d="M5,1 C8,1 8,6 12,6 C16,6 16,1 19,1 C21,1 23,3 23,6 C23,9 21,11 19,11 C16,11 16,6 12,6 C8,6 8,11 5,11 C3,11 1,9 1,6 C1,3 3,1 5,1 Z" 
									fill={card.f === 0 ? 'currentColor' : (card.f === 2 ? `url(#stripes-${card.c})` : 'none')} 
									stroke="currentColor" stroke-width="2" />
							{/if}
						</svg>
					{/each}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.nav-row { width: 100%; padding: 3vmin; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
	.nav-group { display: flex; gap: 1vmin; }
	.back-btn, .restart-btn, .help-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.8vmin; transition: all 0.2s;}
	.back-btn:hover, .restart-btn:not(:disabled):hover, .help-btn:hover { color: white; border-color: var(--color-illusion); }
	.restart-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.score { font-size: 3vmin; font-weight: 900; letter-spacing: 1px; }

	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; padding: 2vmin; box-sizing: border-box;}
	.board { display: flex; flex-wrap: wrap; gap: 2vmin; justify-content: center; width: 100%; max-width: 80vmin; }
	.card { 
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1vmin;
		width: 18vmin; height: 12vmin; background: rgba(255,255,255,0.05); 
		border: 2px solid rgba(255,255,255,0.1); border-radius: 1.5vmin; cursor: pointer; transition: all 0.2s; 
	}
	.card:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
	.card.selected { border-color: var(--color-illusion); box-shadow: 0 0 2vmin rgba(247, 215, 148, 0.3); background: rgba(247, 215, 148, 0.1); }
	.shape { width: 12vmin; height: 6vmin; flex-shrink: 0; }
</style>
