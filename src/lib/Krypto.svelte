<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;
	
	type Block = { id: number, val: number, expr: string, used: boolean };
	let blocks = $state<Block[]>([]);
	let target = $state(0);
	let difficulty = $state<'easy'|'medium'|'hard'|'ultra'>('easy');
	
	let selectedBlockId = $state<number | null>(null);
	let selectedOp = $state<string | null>(null);
	let nextId = 0;

	let puzzleSolvable = $state(false);
	let status = $state<string | null>(null);
	let wonByDeclaration = $state(false);

	function generate() {
		let nums: number[] = [];
		let t = 0;

		function getNum(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

		if (difficulty === 'easy') {
			for (let i = 0; i < 5; i++) nums.push(getNum(1, 10));
			t = getNum(1, 20);
		} else if (difficulty === 'medium') {
			const bigCount = getNum(3, 5);
			for (let i = 0; i < bigCount; i++) nums.push(getNum(10, 25));
			for (let i = 0; i < 5 - bigCount; i++) nums.push(getNum(1, 9));
			t = getNum(10, 40);
		} else if (difficulty === 'hard') {
			const bigCount = getNum(3, 5);
			for (let i = 0; i < bigCount; i++) nums.push(getNum(20, 50));
			for (let i = 0; i < 5 - bigCount; i++) nums.push(getNum(1, 19));
			t = getNum(20, 100);
		} else if (difficulty === 'ultra') {
			for (let i = 0; i < 5; i++) nums.push(getNum(20, 29));
			t = getNum(20, 29);
		}

		nums.sort(() => Math.random() - 0.5);

		let dp: Set<number>[] = Array(32).fill(0).map(() => new Set());
		for (let i = 0; i < 5; i++) dp[1 << i].add(nums[i]);
		
		for (let mask = 1; mask < 32; mask++) {
			for (let submask = (mask - 1) & mask; submask > 0; submask = (submask - 1) & mask) {
				let mask1 = submask;
				let mask2 = mask ^ submask;
				if (mask1 > mask2) continue;
				
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
		status = null;
	}

	function declareUnsolvable() {
		if (status) return;
		if (!puzzleSolvable) {
			wonByDeclaration = true;
			status = 'CORRECT! IT WAS IMPOSSIBLE';
		} else {
			status = 'NOPE! A SOLUTION EXISTS';
		}
		setTimeout(generate, 2000);
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

	function undo() { generate(); }
	
	let wonByLogic = $derived(blocks.filter(b => !b.used).length === 1 && blocks.filter(b => !b.used)[0].val === target);
	
	$effect(() => {
		if (wonByLogic && !status) {
			status = 'KRYPTO SOLVED!';
			setTimeout(generate, 1500);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		let key = e.key;
		if (status) return;
		if (key === 'i' || key === 'I') { declareUnsolvable(); return; }
		if (key === 'Backspace' || key === 'Escape' || key === 'u' || key === 'U') { undo(); return; }
		if (key === '+' || key === '-' || key === '*' || key === 'x' || key === 'X' || key === '/') {
			let mappedOp = key;
			if (key === '*' || key.toLowerCase() === 'x') mappedOp = '×';
			if (key === '/') mappedOp = '÷';
			if (selectedBlockId !== null) selectedOp = mappedOp;
			return;
		}
		let activeBlocks = blocks.filter(b => !b.used);
		let blockIndex = parseInt(key) - 1;
		if (!isNaN(blockIndex) && blockIndex >= 0 && blockIndex < activeBlocks.length) {
			clickBlock(activeBlocks[blockIndex].id);
		}
	}

	$effect(() => {
		registerActions({
			restart: undo,
			help: () => instructions.open()
		});
	});

	generate();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container">
	<Instructions bind:this={instructions} gameId="krypto" title="Krypto">
		<p><strong>Goal:</strong> Use all five cards exactly once to equal the Target number.</p>
		<p>Select cards and mathematical operators to combine them into new numbers. <strong>Pro Tip:</strong> Use the keyboard (1-5 for cards, + - * / for math) to play at lightning speed!</p>
		<p>If you genuinely believe a target is mathematically impossible to reach, hit the <strong>IMPOSSIBLE?</strong> button. If you're right, you win! If a valid equation exists, you lose.</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">TARGET</span>
				<div class="target-val">{target}</div>
			</div>
			{#if status}
				<div class="status-indicator" in:fade>
					{status}
				</div>
			{/if}
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

		</div>

	<div class="bottom-bar">
		<div class="game-controls">
			<div class="diff-select">
				<button class="diff-btn" class:active={difficulty === 'easy'} onclick={() => { difficulty='easy'; generate(); }}>EASY</button>
				<button class="diff-btn" class:active={difficulty === 'medium'} onclick={() => { difficulty='medium'; generate(); }}>MEDIUM</button>
				<button class="diff-btn" class:active={difficulty === 'hard'} onclick={() => { difficulty='hard'; generate(); }}>HARD</button>
					<button class="diff-btn" class:active={difficulty === 'ultra'} class:ultra={difficulty === 'ultra'} onclick={() => { difficulty='ultra'; generate(); }}>ULTRA</button>
			</div>
			<button class="unsolvable-btn" onclick={declareUnsolvable} disabled={!!status}>IMPOSSIBLE?</button>
		</div>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; position: relative; }
	
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

	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.5vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.target-val { font-size: 8vmin; font-weight: 900; color: var(--color-bittersweet); line-height: 1; text-shadow: 0 0 3vmin rgba(255, 110, 97, 0.4); }

	.workspace { display: flex; flex-direction: column; gap: 3vmin; align-items: center; margin-top: 1vmin; }
	.blocks { display: flex; gap: 2vmin; flex-wrap: wrap; justify-content: center; width: 90vmin; min-height: 20vmin; }

	.block { 
		display: flex; flex-direction: column; align-items: center; justify-content: center; 
		width: 14vmin; height: 17vmin; background: rgba(255,255,255,0.02); 
		border: 1px solid rgba(255,255,255,0.08); border-radius: 2.5vmin; cursor: pointer; 
		transition: all 0.3s; padding: 1.5vmin; box-sizing: border-box; position: relative; 
	}
	.block:hover { background: rgba(255,255,255,0.08); transform: translateY(-0.5vmin); border-color: rgba(255,255,255,0.2); }
	.shortcut { font-size: 1.2vmin; color: rgba(255,255,255,0.2); position: absolute; top: 1vmin; left: 1vmin; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5vmin; padding: 0.1vmin 0.6vmin; pointer-events: none; }
	.block.selected { border-color: var(--color-golden); box-shadow: 0 0 2vmin rgba(255,230,109,0.2); background: rgba(255,230,109,0.05); }
	.block .val { font-size: 4.5vmin; font-weight: 900; color: white; }
	.block .expr { font-size: 1.1vmin; color: rgba(255,255,255,0.4); overflow-wrap: anywhere; text-align: center; margin-top: 1vmin;}

	.operators { display: flex; gap: 2.5vmin; }
	.op { width: 8vmin; height: 8vmin; font-size: 4vmin; font-weight: 900; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
	.op:disabled { opacity: 0.15; cursor: not-allowed; }
	.op:not(:disabled):hover { background: rgba(255,255,255,0.15); transform: scale(1.1); }
	.op.selected { background: var(--color-golden); border-color: var(--color-golden); color: black; box-shadow: 0 0 20px rgba(255,230,109,0.3); }

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); }
	.game-controls { display: flex; align-items: center; gap: 4vmin; }
	.diff-select { display: flex; gap: 1vmin; }
	.diff-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); padding: 1vmin 3vmin; border-radius: 1vmin; cursor: pointer; font-weight: 900; font-size: 1.5vmin; transition: all 0.3s; }
	.diff-btn:hover { color: white; border-color: rgba(255,255,255,0.3); }
	.diff-btn.active { color: black; background: var(--color-illusion); border-color: var(--color-illusion); box-shadow: 0 0 15px rgba(248, 165, 194, 0.3); }
	.diff-btn.active.ultra { background: var(--color-indigo); border-color: var(--color-indigo); color: white; box-shadow: 0 0 15px rgba(108, 92, 231, 0.4); }

	.unsolvable-btn { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: var(--color-bittersweet); padding: 1vmin 3vmin; border-radius: 1vmin; cursor: pointer; font-weight: 900; font-size: 1.6vmin; transition: all 0.3s; letter-spacing: 0.1vmin; }
	.unsolvable-btn:hover { background: var(--color-bittersweet); color: black; border-color: var(--color-bittersweet); box-shadow: 0 0 20px rgba(255, 110, 97, 0.3); }

	.unsolvable-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }

	.status-indicator { 
		position: absolute; top: 12vmin; font-size: 3vmin; font-weight: 900; 
		color: var(--color-golden); letter-spacing: 0.5vmin; text-transform: uppercase;
		text-shadow: 0 0 2vmin rgba(255, 230, 109, 0.4);
	}
</style>
