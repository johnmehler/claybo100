<script lang="ts">
	import { fade } from "svelte/transition";
	import Instructions from "./Instructions.svelte";
	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	function gcd(a: number, b: number): number {
		a = Math.abs(a);
		b = Math.abs(b);
		while (b) {
			a %= b;
			[a, b] = [b, a];
		}
		return a;
	}

	class Fraction {
		n: number;
		d: number;
		constructor(n: number, d: number = 1) {
			if (d === 0) throw new Error("Division by zero");
			if (d < 0) {
				n = -n;
				d = -d;
			}
			const common = gcd(n, d);
			this.n = n / common;
			this.d = d / common;
		}
		add(o: Fraction) {
			return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
		}
		sub(o: Fraction) {
			return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
		}
		mul(o: Fraction) {
			return new Fraction(this.n * o.n, this.d * o.d);
		}
		div(o: Fraction) {
			return new Fraction(this.n * o.d, this.d * o.n);
		}
		toValue() {
			return this.n / this.d;
		}
		toString() {
			return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
		}
		equals(o: Fraction) {
			return this.n === o.n && this.d === o.d;
		}
		key() {
			return `${this.n}/${this.d}`;
		}
	}

	type Block = { id: number; val: Fraction; expr: string; used: boolean };
	let initialNums = $state<number[]>([]);
	let blocks = $state<Block[]>([]);
	let target = $state(0);
	let difficulty = $state<"easy" | "medium" | "hard">("easy");

	let selectedBlockId = $state<number | null>(null);
	let selectedOp = $state<string | null>(null);
	let nextId = 0;

	let puzzleSolvable = $state(false);
	let status = $state<string | null>(null);
	let flashRed = $state(false);
	let winningExpr = $state<string | null>(null);
	let loserPopup = $state(false);

	function triggerLoser() {
		loserPopup = true;
		setTimeout(() => (loserPopup = false), 1500);
	}

	const KRYPTO_DECK = [
		// 1-6: 3 of each
		1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
		// 7-10: 4 of each
		7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10,
		// 11-17: 2 of each
		11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17,
		// 18-25: 1 of each
		18, 19, 20, 21, 22, 23, 24, 25
	];

	function shuffle<T>(arr: T[]): T[] {
		let shuffled = [...arr];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	function getCardColorClass(val: Fraction): string {
		const num = val.toValue();
		if (val.d !== 1) return 'card-combined';
		if (num >= 1 && num <= 10) return 'card-black';
		if (num >= 11 && num <= 17) return 'card-red';
		if (num >= 18 && num <= 25) return 'card-blue';
		return 'card-combined';
	}

	function generate() {
		nextId = 0;
		let nums: number[] = [];
		let t = 0;

		while (true) {
			let drawn: number[] = [];
			if (difficulty === "easy") {
				// Primary Krypto uses only cards <= 10.
				// Since we deal without replacement, we filter the deck first.
				const easyDeck = KRYPTO_DECK.filter((card) => card <= 10);
				drawn = shuffle(easyDeck).slice(0, 6);
			} else {
				// Medium and Hard use the full deck
				drawn = shuffle(KRYPTO_DECK).slice(0, 6);
			}

			const tempNums = drawn.slice(0, 5);
			const tempTarget = drawn[5];

			if (difficulty === "easy") {
				nums = tempNums;
				t = tempTarget;
				break;
			} else if (difficulty === "medium") {
				nums = tempNums;
				t = tempTarget;
				break;
			} else if (difficulty === "hard") {
				// Hard requires playing cards with at least two >= 10, and at least one >= 18
				const count10 = tempNums.filter((n) => n >= 10).length;
				const count18 = tempNums.filter((n) => n >= 18).length;
				if (count10 >= 2 && count18 >= 1) {
					nums = tempNums;
					t = tempTarget;
					break;
				}
			}
		}

		initialNums = [...nums];

		// Use Set of strings for fractions to check solvability
		let dp: Set<string>[] = Array(32)
			.fill(0)
			.map(() => new Set());
		for (let i = 0; i < 5; i++) dp[1 << i].add(new Fraction(nums[i]).key());

		for (let mask = 1; mask < 32; mask++) {
			for (
				let submask = (mask - 1) & mask;
				submask > 0;
				submask = (submask - 1) & mask
			) {
				let mask1 = submask;
				let mask2 = mask ^ submask;
				if (mask1 > mask2) continue;

				for (let k1 of dp[mask1]) {
					const parts1 = k1.split("/").map(Number);
					const f1 = new Fraction(parts1[0], parts1[1]);
					for (let k2 of dp[mask2]) {
						const parts2 = k2.split("/").map(Number);
						const f2 = new Fraction(parts2[0], parts2[1]);

						dp[mask].add(f1.add(f2).key());
						dp[mask].add(f1.sub(f2).key());
						dp[mask].add(f2.sub(f1).key());
						// New Rule: No multiplying by 0
						if (f1.n !== 0 && f2.n !== 0)
							dp[mask].add(f1.mul(f2).key());
						// Division by 0 is already disallowed
						if (f2.n !== 0) dp[mask].add(f1.div(f2).key());
						if (f1.n !== 0) dp[mask].add(f2.div(f1).key());
					}
				}
			}
		}

		blocks = nums.map((val) => ({
			id: nextId++,
			val: new Fraction(val),
			expr: String(val),
			used: false,
		}));
		target = t;
		puzzleSolvable = dp[31].has(new Fraction(t).key());

		selectedBlockId = null;
		selectedOp = null;
		status = null;
		flashRed = false;
		winningExpr = null;
		loserPopup = false;
	}

	function declareUnsolvable() {
		if (status) return;
		if (!puzzleSolvable) {
			status = "CORRECT! IT WAS IMPOSSIBLE";
		} else {
			flashRed = true;
			setTimeout(() => (flashRed = false), 500);
		}
	}

	function clickBlock(id: number) {
		if (status) return;
		let b = blocks.find((x) => x.id === id);
		if (!b || b.used) return;

		if (selectedBlockId === id) {
			selectedBlockId = null;
			selectedOp = null;
		} else if (selectedBlockId === null) {
			selectedBlockId = id;
		} else if (selectedOp !== null && selectedBlockId !== id) {
			let b1 = blocks.find((x) => x.id === selectedBlockId)!;
			let b2 = b;
			let val: Fraction;
			try {
				if (selectedOp === "+") val = b1.val.add(b2.val);
				else if (selectedOp === "-") val = b1.val.sub(b2.val);
				else if (selectedOp === "x") {
					if (b1.val.n === 0 || b2.val.n === 0) {
						triggerLoser();
						selectedBlockId = null;
						selectedOp = null;
						return;
					}
					val = b1.val.mul(b2.val);
				} else if (selectedOp === "÷") {
					if (b2.val.n === 0) {
						triggerLoser();
						selectedBlockId = null;
						selectedOp = null;
						return;
					}
					val = b1.val.div(b2.val);
				} else return;
			} catch (e) {
				selectedBlockId = null;
				selectedOp = null;
				return;
			}

			b1.used = true;
			b2.used = true;
			blocks = [
				...blocks,
				{
					id: nextId++,
					val,
					expr: `(${b1.expr} ${selectedOp} ${b2.expr})`,
					used: false,
				},
			];
			selectedBlockId = null;
			selectedOp = null;
		} else {
			selectedBlockId = id;
		}
	}

	function undo() {
		// Just reset the current puzzle by filtering for the first 5 original blocks
		const originalBlocks = blocks.filter((b) => b.id < 5);
		blocks = originalBlocks.map((b) => ({ ...b, used: false }));
		nextId = 5;
		selectedBlockId = null;
		selectedOp = null;
		status = null;
		winningExpr = null;
		loserPopup = false;
	}

	let wonExpr = $derived.by(() => {
		const active = blocks.filter((b) => !b.used);
		if (active.length === 1 && active[0].val.equals(new Fraction(target))) {
			return active[0].expr;
		}
		return null;
	});

	$effect(() => {
		if (wonExpr && !status) {
			status = "SUCCESS";
			winningExpr = wonExpr;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		let key = e.key.toLowerCase();
		
		if (key === "n") {
			generate();
			return;
		}

		if (status) {
			if (key === "enter" || key === " ") generate();
			return;
		}

		if (key === "i") {
			declareUnsolvable();
			return;
		}

		if (
			key === "backspace" ||
			key === "escape" ||
			key === "u" ||
			key === "r"
		) {
			undo();
			return;
		}
		if (
			key === "+" ||
			key === "-" ||
			key === "*" ||
			key === "x" ||
			key === "X" ||
			key === "/"
		) {
			let mappedOp = key;
			if (key === "*" || key.toLowerCase() === "x") mappedOp = "x";
			if (key === "/") mappedOp = "÷";
			if (selectedBlockId !== null) {
				if (selectedOp === mappedOp) selectedOp = null;
				else selectedOp = mappedOp;
			}
			return;
		}
		let activeBlocks = blocks.filter((b) => !b.used);
		let blockIndex = parseInt(key) - 1;
		if (
			!isNaN(blockIndex) &&
			blockIndex >= 0 &&
			blockIndex < activeBlocks.length
		) {
			clickBlock(activeBlocks[blockIndex].id);
		}
	}

	$effect(() => {
		registerActions({
			help: () => instructions.open(),
		});
	});

	generate();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container" class:flash-red={flashRed}>
	<Instructions bind:this={instructions} gameId="krypto" title="Krypto">
		<p><strong>Goal:</strong> Use all five cards exactly once to equal the Target number.</p>
		<p>Select cards and mathematical operators to combine them into new numbers. <strong>Pro Tip:</strong> Use the keyboard (<strong>1-5</strong> for cards, <strong>+ - * /</strong> for math) to play at lightning speed!</p>
		<p><strong>Shortcuts:</strong> [<strong>N</strong>]ew Puzzle, [<strong>R</strong>]eset, [<strong>I</strong>]mpossible?</p>
		<p>If you genuinely believe a target is mathematically impossible to reach, hit the <strong>IMPOSSIBLE?</strong> button. If you're right, you win! If a valid equation exists, the screen will flash red.</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">TARGET CARD</span>
				<div class="target-card">
					<div class="val {getCardColorClass(new Fraction(target))}">{target}</div>
				</div>
			</div>
		</div>

		<div class="workspace" class:dimmed={!!status}>
			<div class="blocks">
				{#each blocks.filter((b) => !b.used) as b, i (b.id)}
					<button
						class="block {selectedBlockId === b.id
							? 'selected'
							: ''}"
						onclick={() => clickBlock(b.id)}
						in:fade
					>
						<div class="shortcut">{i + 1}</div>
						<div class="val {getCardColorClass(b.val)}">{b.val.toString()}</div>
						<div class="expr">{b.expr}</div>
					</button>
				{/each}
			</div>

			<div class="operators">
				{#each [
					{ symbol: "+", display: "+" },
					{ symbol: "-", display: "−" },
					{ symbol: "x", display: "×" },
					{ symbol: "÷", display: "÷" }
				] as op}
					<button
						class="op {selectedOp === op.symbol ? 'selected' : ''}"
						disabled={selectedBlockId === null || !!status}
						onclick={() =>
							(selectedOp = selectedOp === op.symbol ? null : op.symbol)}
					>
						{op.display}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="bottom-bar">
		<div class="game-controls">
			<div class="diff-select">
				<button
					class="diff-btn"
					class:active={difficulty === "easy"}
					onclick={() => {
						difficulty = "easy";
						generate();
					}}>EASY</button
				>
				<button
					class="diff-btn"
					class:active={difficulty === "medium"}
					onclick={() => {
						difficulty = "medium";
						generate();
					}}>MEDIUM</button
				>
				<button
					class="diff-btn"
					class:active={difficulty === "hard"}
					onclick={() => {
						difficulty = "hard";
						generate();
					}}>HARD</button
				>
			</div>
			<button
				class="unsolvable-btn"
				onclick={declareUnsolvable}
				disabled={!!status}>IMPOSSIBLE?</button
			>
			<button class="undo-btn" onclick={undo} disabled={!!status}
				>RESET</button
			>
		</div>
	</div>

	{#if status}
		<div class="status-overlay" in:fade>
			<div class="status-card" class:is-impossible={!winningExpr}>
				<div class="victory-icon">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</div>
				<div class="status-text">{status}</div>
				{#if winningExpr}
					<div class="winning-formula">
						<span class="formula">{winningExpr}</span>
						<span class="equals">=</span>
						<span class="result">{target}</span>
					</div>
				{:else}
					<div class="impossible-info">
						<div class="nums-row">
							{#each initialNums as n}
								<span class="num">{n}</span>
							{/each}
						</div>
						<div class="target-row">
							<span class="label">TARGET:</span>
							<span class="val">{target}</span>
						</div>
					</div>
				{/if}
				<button class="new-puzzle-btn" onclick={generate}
					>NEXT CHALLENGE</button
				>
			</div>
		</div>
	{/if}

	{#if loserPopup}
		<div class="loser-overlay" in:fade out:fade>
			<div class="loser-card">
				<div class="error-icon">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</div>
				<div class="loser-text">INVALID MOVE</div>
				<div class="loser-sub">Watch out for zeros!</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
		align-items: center;
		position: relative;
		transition: background-color 0.3s;
		--krypto-card-bg: rgba(255, 255, 255, 0.02);
		--krypto-card-border: rgba(255, 255, 255, 0.08);
		--krypto-card-hover-bg: rgba(255, 255, 255, 0.08);
		--krypto-card-hover-border: #4da3ff;
		--krypto-card-selected-bg: rgba(0, 0, 0, 0.45);
		--krypto-op-bg: rgba(255, 255, 255, 0.04);
		--krypto-op-border: rgba(255, 255, 255, 0.1);
		--krypto-op-hover-bg: rgba(255, 255, 255, 0.15);
		--krypto-op-hover-border: #4da3ff;
		--krypto-op-selected-bg: rgba(0, 0, 0, 0.55);
		--krypto-card-value-text: #ffffff;
		--krypto-card-expr-text: rgba(255, 255, 255, 0.4);
		--krypto-shortcut-text: rgba(255, 255, 255, 0.28);
		--krypto-shortcut-border: rgba(255, 255, 255, 0.14);
		--krypto-shortcut-bg: rgba(255, 255, 255, 0.02);
		--krypto-text-btn-bg: rgba(255, 255, 255, 0.05);
		--krypto-text-btn-border: rgba(255, 255, 255, 0.18);
		--krypto-text-btn-text: rgba(255, 255, 255, 0.62);
		--krypto-text-btn-hover-bg: rgba(255, 255, 255, 0.18);
		--krypto-text-btn-hover-border: rgba(255, 255, 255, 0.35);
		--krypto-text-btn-hover-text: #ffffff;
	}

	:global(html[data-theme='light']) .game-container {
		--krypto-card-bg: rgba(255, 248, 237, 0.92);
		--krypto-card-border: rgba(120, 94, 62, 0.45);
		--krypto-card-hover-bg: rgba(255, 241, 221, 0.96);
		--krypto-card-hover-border: #1976d2;
		--krypto-card-selected-bg: rgba(215, 200, 180, 0.95);
		--krypto-op-bg: rgba(120, 94, 62, 0.06);
		--krypto-op-border: rgba(120, 94, 62, 0.25);
		--krypto-op-hover-bg: rgba(120, 94, 62, 0.12);
		--krypto-op-hover-border: #1976d2;
		--krypto-op-selected-bg: rgba(120, 94, 62, 0.3);
		--krypto-card-value-text: #2f251c;
		--krypto-card-expr-text: rgba(47, 37, 28, 0.72);
		--krypto-shortcut-text: rgba(47, 37, 28, 0.72);
		--krypto-shortcut-border: rgba(120, 94, 62, 0.38);
		--krypto-shortcut-bg: rgba(255, 246, 231, 0.92);
		--krypto-text-btn-bg: rgba(255, 246, 231, 0.9);
		--krypto-text-btn-border: rgba(120, 94, 62, 0.38);
		--krypto-text-btn-text: #2f251c;
		--krypto-text-btn-hover-bg: rgba(255, 241, 221, 0.98);
		--krypto-text-btn-hover-border: rgba(120, 94, 62, 0.58);
		--krypto-text-btn-hover-text: #2f251c;
	}

	.game-container.flash-red {
		background-color: rgba(255, 0, 0, 0.2) !important;
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 1vmin 4vmin;
		box-sizing: border-box;
		overflow: hidden;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		margin-bottom: 2vmin;
		width: 100%;
		position: relative;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.stat .label {
		font-size: 1.4vmin;
		color: var(--game-text-soft);
		font-weight: 800;
		letter-spacing: 0.5vmin;
		text-transform: uppercase;
		margin-bottom: 0.5vmin;
	}
	.target-val {
		font-size: 8vmin;
		font-weight: 900;
		color: var(--color-bittersweet);
		line-height: 1;
		text-shadow: 0 0 3vmin rgba(255, 110, 97, 0.4);
	}

	.status-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(8px);
	}

	.status-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.5vmin;
		padding: 5vmin 6vmin;
		background: rgba(20, 20, 24, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 3vmin;
		box-shadow: 0 2vmin 6vmin rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(20px);
		animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		width: min(90vmin, 560px);
		max-width: 90vw;
		box-sizing: border-box;
	}

	:global(html[data-theme='light']) .status-card {
		background: rgba(255, 248, 237, 0.95);
		border: 1px solid rgba(120, 94, 62, 0.25);
		box-shadow: 0 2vmin 6vmin rgba(120, 94, 62, 0.15);
	}

	.status-card.is-impossible {
		padding: 4vmin 6vmin;
		gap: 3vmin;
	}

	.status-card.is-impossible .status-text {
		font-size: 3vmin;
		letter-spacing: 0.4vmin;
	}

	.status-card.is-impossible .victory-icon {
		width: 7vmin;
		height: 7vmin;
	}
	.status-card.is-impossible .victory-icon svg {
		width: 3.5vmin;
		height: 3.5vmin;
	}

	.impossible-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5vmin;
		background: rgba(255, 255, 255, 0.03);
		padding: 2vmin 3vmin;
		border-radius: 2vmin;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.nums-row {
		display: flex;
		gap: 1.5vmin;
	}
	.nums-row .num {
		font-size: 2.2vmin;
		font-weight: 800;
		color: var(--game-text-muted);
	}

	.target-row {
		display: flex;
		align-items: center;
		gap: 1vmin;
		font-size: 1.8vmin;
		font-weight: 800;
	}
	.target-row .label {
		color: var(--game-text-soft);
	}
	.target-row .val {
		color: var(--color-bittersweet);
	}

	@keyframes pop-in {
		0% {
			transform: scale(0.8);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.status-text {
		font-size: 5vmin;
		font-weight: 900;
		color: #4ade80;
		text-transform: uppercase;
		letter-spacing: 0.8vmin;
		text-shadow: 0 0 3vmin rgba(74, 222, 128, 0.4);
		margin: 0;
	}

	.status-card.is-impossible .status-text {
		color: var(--app-text);
		text-shadow: 0 0 3vmin rgba(255, 255, 255, 0.4);
	}
	:global(html[data-theme='light']) .status-card.is-impossible .status-text {
		text-shadow: 0 0 3vmin rgba(47, 37, 28, 0.2);
	}

	.winning-formula {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5vmin;
		font-size: clamp(14px, 2.5vmin, 22px);
		color: var(--game-text-primary);
		font-family: "Outfit", sans-serif;
		background: var(--panel-bg);
		padding: 2vmin 3vmin;
		border-radius: 2vmin;
		border: 1px solid var(--panel-border);
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}

	.formula {
		opacity: 0.8;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.equals {
		color: var(--app-text);
		font-weight: 900;
	}
	.result {
		color: var(--color-bittersweet);
		font-weight: 900;
	}

	.new-puzzle-btn {
		background: var(--app-text);
		color: var(--app-bg);
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-weight: 900;
		font-size: 2vmin;
		cursor: pointer;
		transition: all 0.3s;
	}
	.new-puzzle-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 0 2vmin var(--app-text);
	}

	.workspace {
		display: flex;
		flex-direction: column;
		gap: 3vmin;
		align-items: center;
		margin-top: 1vmin;
		flex: 1;
		justify-content: center;
		min-height: 0;
		transition:
			opacity 0.3s,
			filter 0.3s;
	}
	.workspace.dimmed {
		opacity: 0.2;
		filter: blur(5px);
		pointer-events: none;
	}

	.blocks {
		display: flex;
		gap: 2vmin;
		flex-wrap: wrap;
		justify-content: center;
		width: 100%;
		max-width: 90vmin;
	}

	.block {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: clamp(3.5rem, 14vmin, 16vmin);
		height: clamp(4.5rem, 17vmin, 20vmin);
		max-height: 25vh;
		background: var(--krypto-card-bg);
		border: 1px solid var(--krypto-card-border);
		border-radius: 2.5vmin;
		cursor: pointer;
		transition: all 0.3s;
		padding: 1.5vmin;
		box-sizing: border-box;
		position: relative;
	}
	.block:hover {
		background: var(--krypto-card-hover-bg);
		border-color: var(--krypto-card-hover-border);
	}
	.shortcut {
		font-size: 1.2vmin;
		color: var(--krypto-shortcut-text);
		position: absolute;
		top: 1vmin;
		left: 1vmin;
		font-weight: 800;
		border: 1px solid var(--krypto-shortcut-border);
		background: var(--krypto-shortcut-bg);
		border-radius: 0.5vmin;
		padding: 0.1vmin 0.6vmin;
		pointer-events: none;
	}
	.block.selected {
		border-color: var(--app-text);
		box-shadow: inset 0 0 1.5vmin rgba(0, 0, 0, 0.2);
		background: var(--krypto-card-selected-bg);
	}
	.block .val {
		font-size: 4.5vmin;
		font-weight: 900;
		color: var(--krypto-card-value-text);
	}
	.block .expr {
		font-size: 1.1vmin;
		color: var(--krypto-card-expr-text);
		overflow-wrap: anywhere;
		text-align: center;
		margin-top: 1vmin;
	}

	.operators {
		display: flex;
		gap: 2.5vmin;
		flex-wrap: wrap;
		justify-content: center;
	}
	.op {
		width: clamp(3rem, 8vmin, 10vmin);
		height: clamp(3rem, 8vmin, 10vmin);
		font-size: clamp(1.5rem, 4vmin, 5vmin);
		font-weight: 900;
		padding: 0;
		border-radius: 50%;
		background: var(--krypto-op-bg);
		border: 1px solid var(--krypto-op-border);
		color: var(--krypto-card-value-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
	}
	.op:disabled {
		opacity: 0.15;
		cursor: not-allowed;
	}
	.op:not(:disabled):hover {
		background: var(--krypto-op-hover-bg);
		border-color: var(--krypto-op-hover-border);
	}
	.op.selected {
		border-color: var(--app-text);
		box-shadow: inset 0 0 1.5vmin rgba(0, 0, 0, 0.2);
		background: var(--krypto-op-selected-bg);
		color: var(--krypto-card-value-text);
	}

	@media (max-width: 768px) {
		.operators {
			gap: 3.5vmin;
		}

		.op {
			width: clamp(3.5rem, 13vmin, 16vmin);
			height: clamp(3.5rem, 13vmin, 16vmin);
			font-size: clamp(2rem, 6vmin, 8vmin);
			padding: 0;
		}
	}

	@media (max-height: 700px) {
		.workspace { gap: 1.5vmin; margin-top: 0; }
		.game-stats { margin-bottom: 1vmin; }
		.block, .target-card { height: clamp(4rem, 14vmin, 16vmin); }
		.operators { gap: 2vmin; }
	}

	.bottom-bar {
		height: 10vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	.game-controls {
		display: flex;
		align-items: center;
		gap: 4vmin;
	}
	.diff-select {
		display: flex;
		gap: 1vmin;
	}
	.diff-btn {
		background: var(--krypto-text-btn-bg);
		border: 1px solid var(--krypto-text-btn-border);
		color: var(--krypto-text-btn-text);
		padding: 1vmin 3vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 900;
		font-size: 1.5vmin;
		transition: all 0.3s;
	}
	.diff-btn:hover {
		background: var(--krypto-text-btn-hover-bg);
		color: var(--krypto-text-btn-hover-text);
		border-color: var(--krypto-text-btn-hover-border);
	}
	.diff-btn.active {
		color: var(--app-bg);
		background: var(--app-text);
		border-color: var(--app-text);
		box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
	}

	.unsolvable-btn,
	.undo-btn {
		background: rgba(255, 107, 107, 0.1);
		border: 1px solid rgba(255, 107, 107, 0.3);
		color: var(--color-bittersweet);
		padding: 1vmin 3vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 900;
		font-size: 1.6vmin;
		transition: all 0.3s;
		letter-spacing: 0.1vmin;
	}
	.unsolvable-btn:hover:not(:disabled),
	.undo-btn:hover:not(:disabled) {
		background: var(--color-bittersweet);
		color: black;
		border-color: var(--color-bittersweet);
		box-shadow: 0 0 20px rgba(255, 110, 97, 0.3);
	}
	.unsolvable-btn:disabled,
	.undo-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.undo-btn {
		background: var(--krypto-text-btn-bg);
		border-color: var(--krypto-text-btn-border);
		color: var(--krypto-text-btn-text);
	}
	.undo-btn:hover:not(:disabled) {
		background: var(--krypto-text-btn-hover-bg);
		color: var(--krypto-text-btn-hover-text);
		border-color: var(--krypto-text-btn-hover-border);
	}

	.victory-icon {
		width: 10vmin;
		height: 10vmin;
		background: var(--panel-bg);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--app-text);
		margin-bottom: -1vmin;
		box-shadow: 0 0 3vmin rgba(255, 255, 255, 0.2);
	}
	.victory-icon svg {
		width: 5vmin;
		height: 5vmin;
	}

	.loser-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		background: rgba(255, 0, 0, 0.1);
		backdrop-filter: blur(4px);
	}

	.loser-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2vmin;
		background: #1a0a0a;
		padding: 5vmin 8vmin;
		border-radius: 3vmin;
		border: 2px solid #ff4d4d;
		box-shadow: 0 0 5vmin rgba(255, 0, 0, 0.3);
		animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	.error-icon {
		width: 8vmin;
		height: 8vmin;
		background: rgba(255, 77, 77, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ff4d4d;
	}
	.error-icon svg {
		width: 4vmin;
		height: 4vmin;
	}

	.loser-text {
		font-size: 4vmin;
		font-weight: 900;
		color: #ff4d4d;
		letter-spacing: 0.4vmin;
	}

	.loser-sub {
		font-size: 1.8vmin;
		color: var(--game-text-muted);
		font-weight: 600;
	}

	@keyframes shake {
		10%,
		90% {
			transform: translate(-50%, -50%) translate3d(-1px, 0, 0);
		}
		20%,
		80% {
			transform: translate(-50%, -50%) translate3d(2px, 0, 0);
		}
		30%,
		50%,
		70% {
			transform: translate(-50%, -50%) translate3d(-4px, 0, 0);
		}
		40%,
		60% {
			transform: translate(-50%, -50%) translate3d(4px, 0, 0);
		}
	}

	.target-card {
		display: flex;
		align-items: center;
		justify-content: center;
		width: clamp(3.5rem, 14vmin, 16vmin);
		height: clamp(4.5rem, 17vmin, 20vmin);
		max-height: 25vh;
		border-radius: 2.5vmin;
		box-sizing: border-box;
		position: relative;
		border: 1px solid var(--krypto-card-border);
		background: var(--krypto-card-bg);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
		transition: all 0.3s;
	}
	.target-card:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 15px rgba(255, 255, 255, 0.1);
	}
	.target-card .val {
		font-size: 5.5vmin;
		font-weight: 900;
	}

	.val.card-black {
		color: #ffffff !important;
	}
	:global(html[data-theme='light']) .val.card-black {
		color: #1a1a1a !important;
	}

	.val.card-red {
		color: #ff6b6b !important;
		text-shadow: 0 0 8px rgba(255, 107, 107, 0.25);
	}
	:global(html[data-theme='light']) .val.card-red {
		color: #d32f2f !important;
	}

	.val.card-blue {
		color: #4da3ff !important;
		text-shadow: 0 0 8px rgba(77, 163, 255, 0.25);
	}
	:global(html[data-theme='light']) .val.card-blue {
		color: #1976d2 !important;
	}

	.val.card-combined {
		color: #eaeaea !important;
	}
	:global(html[data-theme='light']) .val.card-combined {
		color: #5c5346 !important;
	}
</style>
