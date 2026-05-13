<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { backOut, cubicInOut } from 'svelte/easing';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	type Card = { id: number, c: number, s: number, n: number, f: number };
	let deck = $state<Card[]>([]);
	let rows = $state<Card[][]>([[], [], []]);
	let selected = $state<number[]>([]);
	let score = $state(0);

	let nextRowIdx = $derived(rows.reduce((minIdx, curr, idx, arr) => curr.length < arr[minIdx].length ? idx : minIdx, 0));

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
		rows = [
			deck.splice(0, 4),
			deck.splice(0, 4),
			deck.splice(0, 4)
		];
		selected = [];
		score = 0;
	}

	$effect(() => {
		registerActions({
			restart: init,
			help: () => instructions.open()
		});
	});

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
		const flatBoard = rows.flat();
		let c1 = flatBoard.find(x => x.id === selected[0])!;
		let c2 = flatBoard.find(x => x.id === selected[1])!;
		let c3 = flatBoard.find(x => x.id === selected[2])!;

		let valid = true;
		for (let prop of ['c', 's', 'n', 'f'] as const) {
			let unique = new Set([c1[prop], c2[prop], c3[prop]]).size;
			if (unique === 2) valid = false;
		}

		if (valid) {
			score++;
			const cardsToRemove = [...selected];
			selected = [];

			// 1. DISAPPEAR INSTANTLY
			const rowCountsBefore = rows.map(r => r.length);
			rows = rows.map(row => row.filter(c => !cardsToRemove.includes(c.id)));

			// 2. SLIDE LEFT happens automatically via animate:flip (1000ms)

			// 3. FADE IN ONE AT A TIME
			const currentTotal = rows.flat().length;
			const neededTotal = Math.max(0, 12 - currentTotal);

			if (deck.length > 0 && neededTotal > 0) {
				const newCards = deck.splice(0, Math.min(neededTotal, deck.length));
				newCards.forEach((card, i) => {
					setTimeout(() => {
						// Add to the row that is currently shortest
						const r = rows.reduce((minIdx, curr, idx, arr) => curr.length < arr[minIdx].length ? idx : minIdx, 0);
						rows[r] = [...rows[r], card];
					}, 1100 + (i * 300));
				});
			}
		} else {
			setTimeout(() => selected = [], 400);
		}
	}

	function addCard() {
		if (deck.length > 0) {
			rows[nextRowIdx] = [...rows[nextRowIdx], deck.pop()!];
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

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">SETS FOUND</span>
				<span class="value">{score}</span>
			</div>
		</div>

		<div class="board">
			{#each rows as row, r}
				<div class="row">
					{#each row as card, i (card.id)}
						<button 
							class="card {selected.includes(card.id) ? 'selected' : ''}" 
							style="grid-column: {i + 1}"
							onclick={() => clickCard(card.id)} 
							in:scale={{ duration: 800, start: 0.7, opacity: 0, easing: backOut }}
							animate:flip={{ duration: 1000, easing: cubicInOut }}
						>
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

					{#if r === nextRowIdx && deck.length > 0}
						<button 
							class="add-cards-btn" 
							style="grid-column: {Math.max(5, row.length + 1)}"
							onclick={addCard} 
							in:fade
						>
							<div class="plus">+</div>
							<div class="label">ADD 1</div>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="bottom-bar"></div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }

	.board-wrapper { 
		flex: 1; 
		display: flex; 
		flex-direction: column;
		justify-content: center; 
		align-items: center; 
		width: 100%; 
		padding: 2vmin 4vmin; 
		box-sizing: border-box;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		margin-bottom: 2vmin;
		width: 100%;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 1.4vmin;
		color: rgba(255,255,255,0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
		text-transform: uppercase;
	}

	.stat .value {
		font-size: 5vmin;
		font-weight: 900;
		color: var(--color-illusion);
	}

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
	
	.board { 
		display: flex;
		flex-direction: column;
		gap: 1.5vmin; 
		justify-content: center; 
		width: max-content; 
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fill, 15vmin);
		gap: 2vmin;
		height: 22vmin;
		justify-content: center;
	}
	
	.card { 
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8vmin;
		width: 15vmin; height: 22vmin; background: rgba(255,255,255,0.02); 
		border: 1px solid rgba(255,255,255,0.08); border-radius: 1.5vmin; cursor: pointer; transition: all 0.3s; 
	}
	.card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); transform: translateY(-0.5vmin); }
	.card.selected { border-color: var(--color-illusion); box-shadow: 0 0 2vmin rgba(248, 165, 194, 0.2); background: rgba(248, 165, 194, 0.05); }
	.shape { width: 11vmin; height: 5.5vmin; flex-shrink: 0; }

	.add-cards-btn {
		width: 15vmin;
		height: 22vmin;
		background: rgba(255, 255, 255, 0.015);
		border: 2px dashed rgba(255, 255, 255, 0.05);
		border-radius: 1.5vmin;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.1);
		transition: all 0.3s;
		gap: 1.5vmin;
	}

	.add-cards-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: var(--color-illusion);
		color: var(--color-illusion);
		transform: translateY(-2px);
	}

	.add-cards-btn .plus { font-size: 5vmin; font-weight: 200; }
	.add-cards-btn .label { font-size: 1.5vmin; font-weight: 900; letter-spacing: 1px; }
</style>
