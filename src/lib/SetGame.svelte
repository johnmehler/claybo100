<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	let { onBack } = $props();
	let instructions: any;

	type Card = { id: number, c: number, s: number, n: number, f: number };
	let deck = $state<Card[]>([]);
	let board = $state<Card[]>([]);
	let selected = $state<number[]>([]);
	let score = $state(0);

	const colors = ['#ef4444', '#22c55e', '#3b82f6'];

	function init() {
		let temp = [];
		let id = 0;
		for(let c=0; c<3; c++)
		for(let s=0; s<3; s++)
		for(let n=0; n<3; n++)
		for(let f=0; f<3; f++)
			temp.push({ id: id++, c, s, n, f });
		
		// Fisher-Yates shuffle for true randomness
		for (let i = temp.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[temp[i], temp[j]] = [temp[j], temp[i]];
		}

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

	function addCard() {
		if (deck.length > 0) {
			board = [...board, deck.pop()!];
		}
	}

	init();
</script>

<svg width="0" height="0" style="position: absolute;">
	<defs>
		<pattern id="stripes-0" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="#ef4444" /></pattern>
		<pattern id="stripes-1" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="#22c55e" /></pattern>
		<pattern id="stripes-2" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="2" height="4" fill="#3b82f6" /></pattern>
	</defs>
</svg>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="set" title="Set">
		<p><strong>Goal:</strong> Find a "Set" of three cards.</p>
		<p>For each of the four attributes (Color, Shape, Number, Shading), the three cards must either be <strong>all the same</strong> or <strong>all entirely different</strong>.</p>
		<p>Scan the board carefully. There is almost always a valid Set hidden in plain sight!</p>
	</Instructions>

	<InGameMenu 
		{onBack} 
		onHelp={() => instructions.open()} 
		onRestart={init}
		restartText="NEW GAME"
	>
		<div class="score">SETS: <span style="color: var(--color-illusion)">{score}</span></div>
	</InGameMenu>

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
								<!-- Squiggle -->
								<path d="M2,7 C2,2 9,1 12,6 C15,11 22,10 22,5 C22,0 15,1 12,6 C9,11 2,12 2,7 Z" 
									fill={card.f === 0 ? 'currentColor' : (card.f === 2 ? `url(#stripes-${card.c})` : 'none')} 
									stroke="currentColor" stroke-width="2" />
							{/if}
						</svg>
					{/each}
				</button>
			{/each}

			{#if deck.length > 0}
				<button class="add-cards-btn" onclick={addCard} in:fade>
					<div class="plus">+</div>
					<div class="label">ADD 1</div>
				</button>
			{/if}
		</div>
	</div>

	<div class="bottom-bar"></div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.score { font-size: 3vmin; font-weight: 900; letter-spacing: 1px; }

	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; padding: 4vmin; box-sizing: border-box;}
	.bottom-bar { height: 12vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	
	.board { 
		display: grid; 
		grid-template-rows: repeat(3, 24vmin); 
		grid-auto-flow: column;
		gap: 2vmin; 
		justify-content: center; 
		width: max-content; 
	}
	
	.card { 
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1vmin;
		width: 16vmin; height: 24vmin; background: rgba(255,255,255,0.05); 
		border: 2px solid rgba(255,255,255,0.1); border-radius: 1.5vmin; cursor: pointer; transition: all 0.2s; 
	}
	.card:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
	.card.selected { border-color: var(--color-illusion); box-shadow: 0 0 2vmin rgba(247, 215, 148, 0.3); background: rgba(247, 215, 148, 0.1); }
	.shape { width: 14vmin; height: 7vmin; flex-shrink: 0; }

	.add-cards-btn {
		width: 16vmin;
		height: 24vmin;
		background: rgba(255, 255, 255, 0.03);
		border: 2px dashed rgba(255, 255, 255, 0.1);
		border-radius: 1.5vmin;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.2);
		transition: all 0.3s;
		gap: 1vmin;
	}

	.add-cards-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-illusion);
		color: var(--color-illusion);
		transform: translateY(-2px);
	}

	.add-cards-btn .plus { font-size: 4vmin; font-weight: 200; }
	.add-cards-btn .label { font-size: 1.5vmin; font-weight: 900; letter-spacing: 1px; }
</style>
