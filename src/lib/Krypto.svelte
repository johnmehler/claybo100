<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack } = $props();
	let instructions: any;
	
	type Block = { id: number, val: number, expr: string, used: boolean };
	let blocks = $state<Block[]>([]);
	let target = $state(0);
	let difficulty = $state<'easy'|'medium'|'hard'>('easy');
	
	let selectedBlockId = $state<number | null>(null);
	let selectedOp = $state<string | null>(null);
	let nextId = 0;

	let puzzleSolvable = $state(false);
	let gameLost = $state(false);
	let wonByDeclaration = $state(false);

	function generate() {
		// Fun, authentic Krypto generation via a weighted deck!
		let deck = [];
		let maxNum = difficulty === 'easy' ? 10 : (difficulty === 'medium' ? 15 : 25);
		
		for (let i = 1; i <= maxNum; i++) {
			let count = 1;
			if (i <= 6) count = 3;      // Lots of small numbers
			else if (i <= 10) count = 2; // Medium amount of mid numbers
			for (let j = 0; j < count; j++) deck.push(i);
		}
		deck.sort(() => Math.random() - 0.5);

		let nums = deck.slice(0, 5);
		let t = deck[5];
		if (difficulty === 'hard') t += deck[6]; // Hard targets get bumped higher

		// Mathematical DP engine: Calculate ALL possible operational outcomes for the 5 cards
		let dp: Set<number>[] = Array(32).fill(0).map(() => new Set());
		for (let i = 0; i < 5; i++) dp[1 << i].add(nums[i]);
		
		for (let mask = 1; mask < 32; mask++) {
			for (let submask = (mask - 1) & mask; submask > 0; submask = (submask - 1) & mask) {
				let mask1 = submask;
				let mask2 = mask ^ submask;
				if (mask1 > mask2) continue; // Commutativity optimization
				
				for (let v1 of dp[mask1]) {
					for (let v2 of dp[mask2]) {
						dp[mask].add(v1 + v2);
						dp[mask].add(v1 - v2);
						dp[mask].add(v2 - v1);
						dp[mask].add(v1 * v2);
						if (v2 !== 0 && v1 % v2 === 0) dp[mask].add(v1 / v2);
						if (v1 !== 0 && v2 % v1 === 0) dp[mask].add(v2 / v1);
					}
				}
			}
		}

		blocks = nums.map(val => ({ id: nextId++, val, expr: String(val), used: false }));
		target = t;
		puzzleSolvable = dp[31].has(t);
		
		selectedBlockId = null;
		selectedOp = null;
		wonByDeclaration = false;
		gameLost = false;
	}

	function declareUnsolvable() {
		if (!puzzleSolvable) {
			wonByDeclaration = true;
		} else {
			gameLost = true;
		}
	}

	function clickBlock(id: number) {
		let b = blocks.find(x => x.id === id);
		if (!b || b.used) return;
		
		if (selectedBlockId === null) {
			selectedBlockId = id;
		} else if (selectedOp !== null && selectedBlockId !== id) {
			let b1 = blocks.find(x => x.id === selectedBlockId)!;
			let b2 = b;
			let val = 0;
			if (selectedOp === '+') val = b1.val + b2.val;
			if (selectedOp === '-') val = b1.val - b2.val;
			if (selectedOp === '×') val = b1.val * b2.val;
			if (selectedOp === '÷') {
				if (b2.val === 0 || b1.val % b2.val !== 0) {
					selectedBlockId = null; selectedOp = null; return;
				}
				val = b1.val / b2.val;
			}
			b1.used = true;
			b2.used = true;
			blocks = [...blocks, { id: nextId++, val, expr: `(${b1.expr} ${selectedOp} ${b2.expr})`, used: false }];
			selectedBlockId = null;
			selectedOp = null;
		} else {
			selectedBlockId = id;
		}
	}

	function undo() {
		// Regenerate identical puzzle (Restart)
		generate();
	}
	
	let wonByLogic = $derived(blocks.filter(b => !b.used).length === 1 && blocks.filter(b => !b.used)[0].val === target);
	let won = $derived(wonByLogic || wonByDeclaration);

	function handleKeydown(e: KeyboardEvent) {
		let key = e.key;

		if (won || gameLost) {
			if (key === 'Enter' || key === ' ') generate();
			return;
		}

		if (key === 'i' || key === 'I') {
			declareUnsolvable();
			return;
		}

		if (key === 'Backspace' || key === 'Escape' || key === 'u' || key === 'U') {
			undo();
			return;
		}

		if (key === '+' || key === '-' || key === '*' || key === 'x' || key === 'X' || key === '/') {
			let mappedOp = key;
			if (key === '*' || key.toLowerCase() === 'x') mappedOp = '×';
			if (key === '/') mappedOp = '÷';
			
			if (selectedBlockId !== null) {
				selectedOp = mappedOp;
			}
			return;
		}

		let activeBlocks = blocks.filter(b => !b.used);
		let blockIndex = parseInt(key) - 1;
		if (!isNaN(blockIndex) && blockIndex >= 0 && blockIndex < activeBlocks.length) {
			clickBlock(activeBlocks[blockIndex].id);
		}
	}

	generate();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container">
	<Instructions bind:this={instructions} gameId="krypto" title="Krypto">
		<p><strong>Goal:</strong> Use all five cards exactly once to equal the Target number.</p>
		<p>Select cards and mathematical operators to combine them into new numbers. <strong>Pro Tip:</strong> Use the keyboard (1-5 for cards, + - * / for math) to play at lightning speed!</p>
		<p>If you genuinely believe a target is mathematically impossible to reach, hit the <strong>IMPOSSIBLE?</strong> button. If you're right, you win! If a valid equation exists, you lose.</p>
	</Instructions>

	<div class="nav-row">
		<div class="nav-group">
			<button class="back-btn" onclick={onBack}>BACK</button>
			<button class="help-btn" onclick={() => instructions.open()}>HOW TO PLAY</button>
		</div>
		<div class="diff-select">
			<button class="diff-btn" class:active={difficulty === 'easy'} onclick={() => { difficulty='easy'; generate(); }}>EASY</button>
			<button class="diff-btn" class:active={difficulty === 'medium'} onclick={() => { difficulty='medium'; generate(); }}>MEDIUM</button>
			<button class="diff-btn" class:active={difficulty === 'hard'} onclick={() => { difficulty='hard'; generate(); }}>HARD</button>
		</div>
		<button class="unsolvable-btn" onclick={declareUnsolvable}>IMPOSSIBLE? (I)</button>
		<button class="restart-btn" onclick={undo}>RESTART (⌫)</button>
	</div>

	<div class="target-area">
		<div class="target-label">TARGET</div>
		<div class="target-val">{target}</div>
	</div>

	<div class="workspace">
		<div class="blocks">
			{#each blocks.filter(b => !b.used) as b, i (b.id)}
				<button class="block {selectedBlockId === b.id ? 'selected' : ''}" onclick={() => clickBlock(b.id)} in:fade>
					<div class="shortcut">{i + 1}</div>
					<div class="val">{b.val}</div>
					<div class="expr">{b.expr}</div>
				</button>
			{/each}
		</div>
		
		<div class="operators">
			{#each ['+', '-', '×', '÷'] as op}
				<button 
					class="op {selectedOp === op ? 'selected' : ''}" 
					disabled={selectedBlockId === null}
					onclick={() => selectedOp = op}
				>
					{op}
				</button>
			{/each}
		</div>
	</div>

	{#if gameLost}
		<div class="win-overlay" in:fade>
			<h2 style="color: var(--color-bittersweet)">INCORRECT!</h2>
			<div class="final-expr">A valid mathematical solution exists for this target.</div>
			<button class="next-btn" style="background: var(--color-bittersweet)" onclick={generate}>NEW PUZZLE</button>
		</div>
	{/if}

	{#if won}
		<div class="win-overlay" in:fade>
			<h2>KRYPTO SOLVED!</h2>
			{#if wonByLogic}
				<div class="final-expr">{blocks.filter(b => !b.used)[0].expr} = {target}</div>
			{:else}
				<div class="final-expr">You correctly identified an impossible puzzle!</div>
			{/if}
			<button class="next-btn" onclick={generate}>NEXT PUZZLE</button>
		</div>
	{/if}
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; position: relative; }
	.nav-row { width: 100%; padding: 3vmin; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
	.nav-group { display: flex; gap: 1vmin; }
	.back-btn, .restart-btn, .help-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.8vmin; transition: all 0.2s;}
	.back-btn:hover, .restart-btn:hover, .help-btn:hover { color: white; border-color: var(--color-bittersweet); }
	
	.unsolvable-btn { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: var(--color-bittersweet); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.8vmin; transition: all 0.2s; }
	.unsolvable-btn:hover { background: var(--color-bittersweet); color: black; border-color: var(--color-bittersweet); }

	.diff-select { display: flex; gap: 1vmin; }
	.diff-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 2vmin; border-radius: 1vmin; cursor: pointer; font-weight: 800; font-size: 1.4vmin; transition: all 0.2s; }
	.diff-btn:hover { color: white; border-color: rgba(255,255,255,0.3); }
	.diff-btn.active { color: black; background: var(--color-illusion); border-color: var(--color-illusion); }

	.target-area { display: flex; flex-direction: column; align-items: center; margin-top: 5vmin; }
	.target-label { font-size: 2vmin; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 0.5vmin; }
	.target-val { font-size: 10vmin; font-weight: 900; color: var(--color-bittersweet); line-height: 1; text-shadow: 0 0 2vmin rgba(255, 107, 107, 0.3); }

	.workspace { display: flex; flex-direction: column; gap: 5vmin; align-items: center; margin-top: 10vmin; }
	.blocks { display: flex; gap: 2vmin; flex-wrap: wrap; justify-content: center; width: 80vmin; min-height: 20vmin;}
	.block { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 12vmin; min-height: 16vmin; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 2vmin; cursor: pointer; transition: all 0.2s; padding: 1vmin; box-sizing: border-box; position: relative; }
	.block:hover { background: rgba(255,255,255,0.1); }
	.shortcut { font-size: 1.5vmin; color: rgba(255,255,255,0.3); position: absolute; top: 1vmin; left: 1vmin; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5vmin; padding: 0.2vmin 0.6vmin; pointer-events: none;}
	.block.selected { border-color: var(--color-golden); box-shadow: 0 0 2vmin rgba(255,230,109,0.3); background: rgba(255,230,109,0.1); }
	.val { font-size: 4vmin; font-weight: 800; color: white; }
	.expr { font-size: 1.2vmin; color: rgba(255,255,255,0.4); overflow-wrap: anywhere; text-align: center; margin-top: 1vmin;}

	.operators { display: flex; gap: 2vmin; }
	.op { width: 8vmin; height: 8vmin; font-size: 4vmin; font-weight: 800; border-radius: 50%; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
	.op:disabled { opacity: 0.3; cursor: not-allowed; }
	.op:not(:disabled):hover { background: rgba(255,255,255,0.2); }
	.op.selected { background: var(--color-golden); border-color: var(--color-golden); color: black; }

	.win-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(10px); border-radius: 4vmin; }
	.win-overlay h2 { font-size: 6vmin; color: var(--color-golden); margin-bottom: 2vmin; font-weight: 900; }
	.final-expr { font-size: 3vmin; color: white; margin-bottom: 5vmin; font-family: monospace; text-align: center; }
	.next-btn { background: var(--color-golden); color: black; border: none; padding: 2vmin 4vmin; border-radius: 1vmin; font-size: 2.5vmin; font-weight: 900; cursor: pointer; transition: all 0.2s; }
	.next-btn:hover { filter: brightness(1.2); }
</style>
