<script lang="ts">
	import { fade, scale, fly } from "svelte/transition";
	import { flip } from "svelte/animate";
	import { backOut, cubicInOut } from "svelte/easing";
	import Instructions from "./Instructions.svelte";
	import GameOverMenu from "./GameOverMenu.svelte";
	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	type Card = { id: number; c: number; s: number; n: number; f: number };
	let deck = $state<Card[]>([]);
	let board = $state<(Card | null)[]>([]);
	let selected = $state<number[]>([]);
	let score = $state(0);

	let lastChangeTime = $state(Date.now());
	let secondsElapsed = $state(0);

	const colors = ["#dc2626", "#16a34a", "#7c3aed"]; // Red, Green, Purple

	function isSet(c1: Card, c2: Card, c3: Card): boolean {
		for (let prop of ["c", "s", "n", "f"] as const) {
			let unique = new Set([c1[prop], c2[prop], c3[prop]]).size;
			if (unique === 2) return false;
		}
		return true;
	}

	function hasAnySet(currentBoard: (Card | null)[]): boolean {
		const active = currentBoard.filter(Boolean) as Card[];
		const len = active.length;
		for (let i = 0; i < len; i++) {
			for (let j = i + 1; j < len; j++) {
				for (let k = j + 1; k < len; k++) {
					if (isSet(active[i], active[j], active[k])) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function init() {
		let temp = [];
		let id = 0;
		for (let c = 0; c < 3; c++)
			for (let s = 0; s < 3; s++)
				for (let n = 0; n < 3; n++)
					for (let f = 0; f < 3; f++)
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
		lastChangeTime = Date.now();
		secondsElapsed = 0;
	}

	$effect(() => {
		registerActions({
			restart: () => init(),
			newShuffle: () => init(),
			help: () => instructions.open(),
		});

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			const key = e.key.toLowerCase();
			if (key === "r" || key === "n") {
				init();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	});

	$effect(() => {
		const interval = setInterval(() => {
			secondsElapsed = Math.floor((Date.now() - lastChangeTime) / 1000);
		}, 200);
		return () => clearInterval(interval);
	});

	const hasSets = $derived(hasAnySet(board));
	const isGameOver = $derived(deck.length === 0 && !hasSets);
	const timeRemaining = $derived(Math.max(0, 10 - secondsElapsed));
	let isRedFlashing = $state(false);

	function handleDeckClick() {
		if (isGameOver) return;
		if (timeRemaining > 0) return;
		if (hasSets) {
			isRedFlashing = true;
			setTimeout(() => {
				isRedFlashing = false;
			}, 500);
		} else {
			addCards();
		}
	}

	function clickCard(id: number) {
		if (isGameOver) return;
		if (selected.includes(id)) {
			selected = selected.filter((x) => x !== id);
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
		const flatBoard = board.filter(Boolean) as Card[];
		let c1 = flatBoard.find((x) => x.id === selected[0])!;
		let c2 = flatBoard.find((x) => x.id === selected[1])!;
		let c3 = flatBoard.find((x) => x.id === selected[2])!;

		if (isSet(c1, c2, c3)) {
			score++;
			const cardsToRemove = [...selected];
			selected = [];

			// 1. Identify indices of cards to remove
			const removeIndices: number[] = [];
			board.forEach((card, idx) => {
				if (card && cardsToRemove.includes(card.id)) {
					removeIndices.push(idx);
				}
			});

			// 2. DISAPPEAR leaving gaps
			removeIndices.forEach((idx) => {
				board[idx] = null;
			});

			// 3. FILL GAPS
			const activeCardsCount = board.filter(Boolean).length;

			if (activeCardsCount < 12 && deck.length > 0) {
				// We need to replace them to stay at 12
				const newCards = deck.splice(0, Math.min(3, deck.length));
				newCards.forEach((card, i) => {
					setTimeout(
						() => {
							const idx = removeIndices[i];
							if (idx !== undefined) board[idx] = card;
							if (i === newCards.length - 1) {
								lastChangeTime = Date.now();
								secondsElapsed = 0;
							}
						},
						600 + i * 350,
					);
				});
			} else {
				// We were at > 12 cards, now we are back to 12.
				// We want to collapse the board back to 12 cards.
				setTimeout(() => {
					const extraCards: Card[] = [];
					for (let i = 12; i < board.length; i++) {
						if (board[i] !== null) {
							extraCards.push(board[i] as Card);
						}
					}

					const internalGaps: number[] = [];
					for (let i = 0; i < 12; i++) {
						if (board[i] === null) {
							internalGaps.push(i);
						}
					}

					internalGaps.forEach((gapIdx, i) => {
						if (extraCards[i]) {
							board[gapIdx] = extraCards[i];
						}
					});

					board = board.slice(0, 12);
					lastChangeTime = Date.now();
					secondsElapsed = 0;
				}, 1200);
			}
		} else {
			setTimeout(() => (selected = []), 400);
		}
	}

	function addCards() {
		if (deck.length > 0) {
			const toAdd = Math.min(3, deck.length);
			const newCards = deck.splice(0, toAdd);
			board = [...board, ...newCards];
			lastChangeTime = Date.now();
			secondsElapsed = 0;
		}
	}

	init();
</script>

<svg width="0" height="0" style="position: absolute;">
	<defs>
		<pattern
			id="stripes-0"
			patternUnits="userSpaceOnUse"
			width="8"
			height="8"
		>
			<rect width="3" height="8" fill="#dc2626" />
		</pattern>
		<pattern
			id="stripes-1"
			patternUnits="userSpaceOnUse"
			width="8"
			height="8"
		>
			<rect width="3" height="8" fill="#16a34a" />
		</pattern>
		<pattern
			id="stripes-2"
			patternUnits="userSpaceOnUse"
			width="8"
			height="8"
		>
			<rect width="3" height="8" fill="#7c3aed" />
		</pattern>
	</defs>
</svg>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="set" title="Set">
		<p><strong>Goal:</strong> Find a "Set" of three cards.</p>
		<p>
			For each of the four attributes (Color, Shape, Number, Shading), the
			three cards must either be <strong>all the same</strong> or
			<strong>all entirely different</strong>.
		</p>
		<p>
			Scan the board carefully. There is almost always a valid Set hidden
			in plain sight!
		</p>
		<p>
			<strong>Shortcuts:</strong> Press <strong>R</strong> or
			<strong>N</strong> to reshuffle and start a new game.
		</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-header">
			<div class="game-stats">
				<div class="stat">
					<span class="label">SETS FOUND</span>
					<span class="value">{score}</span>
				</div>
				<div class="stat-divider"></div>
				<div class="stat">
					<span class="label">DECK REMAINING</span>
					<span class="value">{deck.length}</span>
				</div>
			</div>

			{#if deck.length > 0}
				<button
					class="deck-btn"
					class:disabled={timeRemaining > 0}
					class:red-flash={isRedFlashing}
					onclick={handleDeckClick}
					disabled={timeRemaining > 0 && !isRedFlashing}
					in:fade
				>
					<div class="deck-pattern">
						<svg viewBox="0 0 150 100" class="deck-svg">
							<line
								x1="10"
								y1="10"
								x2="140"
								y2="90"
								stroke="rgba(255,255,255,0.08)"
								stroke-width="1"
							/>
							<line
								x1="140"
								y1="10"
								x2="10"
								y2="90"
								stroke="rgba(255,255,255,0.08)"
								stroke-width="1"
							/>
							<rect
								x="5"
								y="5"
								width="140"
								height="90"
								rx="10"
								fill="none"
								stroke="rgba(255,255,255,0.15)"
								stroke-width="2"
							/>
							<rect
								x="10"
								y="10"
								width="130"
								height="80"
								rx="8"
								fill="none"
								stroke="rgba(255,255,255,0.25)"
								stroke-width="1"
								stroke-dasharray="4 2"
							/>
							<circle
								cx="75"
								cy="50"
								r="25"
								fill="none"
								stroke="rgba(255,255,255,0.15)"
								stroke-width="1.5"
							/>
							<circle
								cx="75"
								cy="50"
								r="18"
								fill="rgba(15, 23, 42, 0.65)"
								stroke="rgba(255,255,255,0.2)"
								stroke-width="1"
							/>
							<text
								x="75"
								y="50"
								text-anchor="middle"
								dominant-baseline="central"
								font-size="20"
								font-weight="900"
							>+3</text>
						</svg>
					</div>
				</button>
			{/if}
		</div>

		<div class="board">
			{#each board as card, i (card ? card.id : `empty-${i}`)}
				<div
					class="card-slot"
					animate:flip={{ duration: 1000, easing: cubicInOut }}
				>
					{#if card}
						<button
							class="card {selected.includes(card.id)
								? 'selected'
								: ''}"
							onclick={() => clickCard(card.id)}
							in:scale={{
								duration: 600,
								start: 0.7,
								opacity: 0,
								easing: backOut,
							}}
							out:scale={{
								duration: 400,
								start: 0.7,
								opacity: 0,
							}}
						>
							{#each Array(card.n + 1) as _}
								<svg
									class="shape"
									viewBox="0 0 100 50"
									style="color: {colors[card.c]}"
								>
									{#if card.s === 0}
										<!-- Oval -->
										<rect
											x="6"
											y="6"
											width="88"
											height="38"
											rx="19"
											ry="19"
											fill={card.f === 0
												? "currentColor"
												: card.f === 2
													? `url(#stripes-${card.c})`
													: "none"}
											stroke="currentColor"
											stroke-width="6"
										/>
									{:else if card.s === 1}
										<!-- Diamond -->
										<polygon
											points="50,6 94,25 50,44 6,25"
											fill={card.f === 0
												? "currentColor"
												: card.f === 2
													? `url(#stripes-${card.c})`
													: "none"}
											stroke="currentColor"
											stroke-width="6"
											stroke-linejoin="round"
										/>
									{:else}
										<!-- Squiggle -->
										<g
											transform="translate(50, 25) scale(0.85) rotate(90) translate(-25, -50)"
										>
											<path
												d="M38.4,63.4c0,16.1,11,19.9,10.6,28.3c-0.5,9.2-21.1,12.2-33.4,3.8s-15.8-21.2-9.3-38c3.7-7.5,4.9-14,4.8-20c0-16.1-11-19.9-10.6-28.3C1,0.1,21.6-3,33.9,5.5s15.8,21.2,9.3,38C40.4,50.6,38.5,57.4,38.4,63.4z"
												fill={card.f === 0
													? "currentColor"
													: card.f === 2
														? `url(#stripes-${card.c})`
														: "none"}
												stroke="currentColor"
												stroke-width="7"
												stroke-linejoin="round"
											/>
										</g>
									{/if}
								</svg>
							{/each}
						</button>
					{:else}
						<div class="card placeholder"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="bottom-bar">
		{#if isGameOver}
			<GameOverMenu onPlayAgain={init} onMenu={onBack} delay={800} />
		{/if}
	</div>
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
		align-items: center;
		justify-content: center;
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 4vmin;
		box-sizing: border-box;
		background: radial-gradient(
			circle at center,
			#0f5132 0%,
			#052c16 100%
		); /* Forest green card table felt */
		border-radius: 3vmin;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			inset 0 0 10vmin rgba(0, 0, 0, 0.5),
			0 15px 30px rgba(0, 0, 0, 0.3);
		margin: 2vmin 0;
	}

	:global(html[data-theme="light"]) .board-wrapper {
		background: radial-gradient(circle at center, #f1f5f9 0%, #cbd5e1 100%);
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow:
			inset 0 0 8vmin rgba(0, 0, 0, 0.05),
			0 10px 20px rgba(0, 0, 0, 0.05);
	}

	.game-header {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6vmin;
		margin-bottom: 3vmin;
		width: 100%;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6vmin;
		padding: 1.5vmin 4vmin;
		background: rgba(15, 23, 42, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border-radius: 2vmin;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	:global(html[data-theme="light"]) .game-stats {
		background: rgba(255, 255, 255, 0.85);
		border-color: rgba(0, 0, 0, 0.08);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 1.1vmin;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 800;
		letter-spacing: 0.15vmin;
		text-transform: uppercase;
		margin-bottom: 0.2vmin;
	}

	:global(html[data-theme="light"]) .stat .label {
		color: rgba(0, 0, 0, 0.5);
	}

	.stat .value {
		font-size: 3.5vmin;
		font-weight: 900;
		color: #ffffff;
		line-height: 1;
	}

	:global(html[data-theme="light"]) .stat .value {
		color: #0f172a;
	}

	.stat-divider {
		width: 1px;
		height: 4vmin;
		background: rgba(255, 255, 255, 0.12);
	}

	:global(html[data-theme="light"]) .stat-divider {
		background: rgba(0, 0, 0, 0.08);
	}

	.bottom-bar {
		min-height: 8vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 2vmin 0;
	}

	.board {
		display: grid;
		grid-template-rows: repeat(3, 20vmin);
		grid-auto-columns: 13.5vmin;
		grid-auto-flow: column;
		gap: 2vmin;
		justify-content: center;
		width: max-content;
	}
	.card-slot {
		width: 13.5vmin;
		height: 20vmin;
	}

	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.8vmin;
		width: 100%;
		height: 100%;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 1.5vmin;
		cursor: pointer;
		box-shadow:
			0 4px 10px rgba(0, 0, 0, 0.08),
			0 1px 3px rgba(0, 0, 0, 0.05);
		padding: 1.2vmin;
		overflow: hidden;
	}

	.card::before {
		content: "";
		position: absolute;
		top: 0.8vmin;
		left: 0.8vmin;
		right: 0.8vmin;
		bottom: 0.8vmin;
		border: 1px solid rgba(0, 0, 0, 0.05);
		border-radius: 1vmin;
		pointer-events: none;
	}

	.card:not(.placeholder):hover {
		border-color: #3b82f6;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.3),
			0 4px 10px rgba(0, 0, 0, 0.08);
	}

	.card:not(.placeholder):hover::before {
		border-color: rgba(59, 130, 246, 0.15);
	}

	.card.selected {
		border-color: #3b82f6;
		box-shadow:
			0 0 0 3px #3b82f6,
			0 4px 10px rgba(0, 0, 0, 0.08);
		background: #eff6ff;
	}

	.card.selected::before {
		border-color: rgba(59, 130, 246, 0.25);
	}

	.card.placeholder {
		background: rgba(0, 0, 0, 0.15);
		border: 2px dashed rgba(255, 255, 255, 0.15);
		box-shadow: none;
		pointer-events: none;
	}

	.card.placeholder::before {
		display: none;
	}

	:global(html[data-theme="light"]) .card.placeholder {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.shape {
		width: 10vmin;
		height: 5vmin;
		flex-shrink: 0;
		overflow: visible;
	}

	.deck-btn {
		position: relative;
		align-self: center;
		width: 18vmin;
		height: 12vmin;
		background: linear-gradient(
			135deg,
			#4f46e5 0%,
			#312e81 100%
		); /* Indigo premium card back */
		border: 1px solid #4338ca;
		border-radius: 1.5vmin;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		box-shadow:
			0 1px 1px rgba(0, 0, 0, 0.2),
			2px 2px 0 0 #4f46e5,
			2px 2px 1px rgba(0, 0, 0, 0.2),
			4px 4px 0 0 #312e81,
			4px 4px 2px rgba(0, 0, 0, 0.3),
			6px 6px 15px rgba(0, 0, 0, 0.4);
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		gap: 1.2vmin;
	}

	.deck-btn:not(:disabled):hover {
		box-shadow:
			0 1px 1px rgba(0, 0, 0, 0.2),
			2px 2px 0 0 #4f46e5,
			2px 2px 1px rgba(0, 0, 0, 0.2),
			4px 4px 0 0 #312e81,
			4px 4px 2px rgba(0, 0, 0, 0.3),
			8px 8px 25px rgba(0, 0, 0, 0.5);
		filter: brightness(1.1);
	}

	.deck-btn:disabled {
		background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
		border-color: #334155;
		cursor: not-allowed;
		box-shadow:
			0 1px 1px rgba(0, 0, 0, 0.25),
			2px 2px 0 0 #475569,
			2px 2px 1px rgba(0, 0, 0, 0.2),
			4px 4px 0 0 #1e293b,
			4px 4px 2px rgba(0, 0, 0, 0.25),
			6px 6px 15px rgba(0, 0, 0, 0.4);
		transform: none;
		opacity: 0.7;
	}

	.deck-pattern {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 1.5vmin;
		overflow: hidden;
		pointer-events: none;
	}

	.deck-svg {
		width: 100%;
		height: 100%;
		opacity: 0.85;
	}

	.deck-svg text {
		fill: #ffffff;
		font-family: inherit;
		transition: fill 0.25s ease;
	}

	.deck-btn:disabled .deck-svg text {
		fill: rgba(255, 255, 255, 0.4);
	}

	.deck-btn.red-flash {
		background: linear-gradient(
			135deg,
			#dc2626 0%,
			#7f1d1d 100%
		) !important;
		border-color: #ef4444 !important;
		box-shadow: 0 0 25px rgba(220, 38, 38, 0.7) !important;
		animation: shake 0.4s ease-in-out;
		filter: none !important;
		opacity: 1 !important;
		cursor: default !important;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}
</style>
