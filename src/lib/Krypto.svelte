<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
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
			if (d < 0) { n = -n; d = -d; }
			const common = gcd(n, d);
			this.n = n / common;
			this.d = d / common;
		}
		add(o: Fraction) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
		sub(o: Fraction) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
		mul(o: Fraction) { return new Fraction(this.n * o.n, this.d * o.d); }
		div(o: Fraction) { return new Fraction(this.n * o.d, this.d * o.n); }
		toValue() { return this.n / this.d; }
		toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
		equals(o: Fraction) { return this.n === o.n && this.d === o.d; }
		key() { return `${this.n}/${this.d}`; }
	}

	type Block = { id: number, val: Fraction, expr: string, used: boolean };
	let blocks = $state<Block[]>([]);
	let target = $state(0);
	let difficulty = $state<'easy'|'medium'|'hard'>('easy');
	
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
		setTimeout(() => loserPopup = false, 1500);
	}

	function generate() {
		let nums: number[] = [];
		let t = 0;

		function getNum(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

		if (difficulty === 'easy') {
			for (let i = 0; i < 5; i++) nums.push(getNum(1, 10));
			t = getNum(1, 20);
		} else if (difficulty === 'medium') {
			while (true) {
				nums = [];
				for (let i = 0; i < 5; i++) nums.push(getNum(1, 19));
				if (nums.filter(n => n >= 10).length >= 2) break;
			}
			t = getNum(1, 29);
		} else if (difficulty === 'hard') {
			while (true) {
				nums = [];
				for (let i = 0; i < 5; i++) nums.push(getNum(1, 29));
				if (nums.filter(n => n >= 20).length >= 3) break;
			}
			t = getNum(1, 29);
		}

		nums.sort(() => Math.random() - 0.5);

		// Use Set of strings for fractions to check solvability
		let dp: Set<string>[] = Array(32).fill(0).map(() => new Set());
		for (let i = 0; i < 5; i++) dp[1 << i].add(new Fraction(nums[i]).key());
		
		for (let mask = 1; mask < 32; mask++) {
			for (let submask = (mask - 1) & mask; submask > 0; submask = (submask - 1) & mask) {
				let mask1 = submask;
				let mask2 = mask ^ submask;
				if (mask1 > mask2) continue;
				
				for (let k1 of dp[mask1]) {
					const parts1 = k1.split('/').map(Number);
					const f1 = new Fraction(parts1[0], parts1[1]);
					for (let k2 of dp[mask2]) {
						const parts2 = k2.split('/').map(Number);
						const f2 = new Fraction(parts2[0], parts2[1]);
						
						dp[mask].add(f1.add(f2).key());
						dp[mask].add(f1.sub(f2).key());
						dp[mask].add(f2.sub(f1).key());
						// New Rule: No multiplying by 0
						if (f1.n !== 0 && f2.n !== 0) dp[mask].add(f1.mul(f2).key());
						// Division by 0 is already disallowed
						if (f2.n !== 0) dp[mask].add(f1.div(f2).key());
						if (f1.n !== 0) dp[mask].add(f2.div(f1).key());
					}
				}
			}
		}

		blocks = nums.map(val => ({ id: nextId++, val: new Fraction(val), expr: String(val), used: false }));
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
			status = 'CORRECT! IT WAS IMPOSSIBLE';
		} else {
			flashRed = true;
			setTimeout(() => flashRed = false, 500);
		}
	}

	function clickBlock(id: number) {
		if (status) return;
		let b = blocks.find(x => x.id === id);
		if (!b || b.used) return;
		
		if (selectedBlockId === id) {
			selectedBlockId = null;
			selectedOp = null;
		} else if (selectedBlockId === null) {
			selectedBlockId = id;
		} else if (selectedOp !== null && selectedBlockId !== id) {
			let b1 = blocks.find(x => x.id === selectedBlockId)!;
			let b2 = b;
			let val: Fraction;
			try {
				if (selectedOp === '+') val = b1.val.add(b2.val);
				else if (selectedOp === '-') val = b1.val.sub(b2.val);
				else if (selectedOp === '×') {
					if (b1.val.n === 0 || b2.val.n === 0) {
						triggerLoser();
						selectedBlockId = null; selectedOp = null; return;
					}
					val = b1.val.mul(b2.val);
				}
				else if (selectedOp === '÷') {
					if (b2.val.n === 0) {
						triggerLoser();
						selectedBlockId = null; selectedOp = null; return;
					}
					val = b1.val.div(b2.val);
				} else return;
			} catch(e) {
				selectedBlockId = null; selectedOp = null; return;
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
		// Just reset the current puzzle
		let originalNums = blocks.filter(b => b.expr.indexOf(' ') === -1 && b.id < 5).map(b => b.val.n);
		blocks = originalNums.map((val, i) => ({ id: i, val: new Fraction(val), expr: String(val), used: false }));
		nextId = 5;
		selectedBlockId = null;
		selectedOp = null;
		status = null;
		winningExpr = null;
		loserPopup = false;
	}
	
	let wonExpr = $derived.by(() => {
		const active = blocks.filter(b => !b.used);
		if (active.length === 1 && active[0].val.equals(new Fraction(target))) {
			return active[0].expr;
		}
		return null;
	});

	
	$effect(() => {
		if (wonExpr && !status) {
			status = 'KRYPTO SOLVED!';
			winningExpr = wonExpr;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		let key = e.key;
		if (status) {
			if (key === 'Enter' || key === ' ') generate();
			return;
		}
		if (key === 'i' || key === 'I') { declareUnsolvable(); return; }
		if (key === 'Backspace' || key === 'Escape' || key === 'u' || key === 'U') { undo(); return; }
		if (key === '+' || key === '-' || key === '*' || key === 'x' || key === 'X' || key === '/') {
			let mappedOp = key;
			if (key === '*' || key.toLowerCase() === 'x') mappedOp = '×';
			if (key === '/') mappedOp = '÷';
			if (selectedBlockId !== null) {
				if (selectedOp === mappedOp) selectedOp = null;
				else selectedOp = mappedOp;
			}
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
			restart: generate,
			help: () => instructions.open()
		});
	});

	generate();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game-container" class:flash-red={flashRed}>
	<Instructions bind:this={instructions} gameId="krypto" title="Krypto">
		<p><strong>Goal:</strong> Use all five cards exactly once to equal the Target number.</p>
		<p>Select cards and mathematical operators to combine them into new numbers. <strong>Pro Tip:</strong> Use the keyboard (1-5 for cards, + - * / for math) to play at lightning speed!</p>
		<p>If you genuinely believe a target is mathematically impossible to reach, hit the <strong>IMPOSSIBLE?</strong> button. If you're right, you win! If a valid equation exists, the screen will flash red.</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">TARGET</span>
				<div class="target-val">{target}</div>
			</div>
		</div>

		<div class="workspace" class:dimmed={!!status}>
			<div class="blocks">
				{#each blocks.filter(b => !b.used) as b, i (b.id)}
					<button class="block {selectedBlockId === b.id ? 'selected' : ''}" onclick={() => clickBlock(b.id)} in:fade>
						<div class="shortcut">{i + 1}</div>
						<div class="val">{b.val.toString()}</div>
						<div class="expr">{b.expr}</div>
					</button>
				{/each}
			</div>
			
			<div class="operators">
				{#each ['+', '-', '×', '÷'] as op}
					<button 
						class="op {selectedOp === op ? 'selected' : ''}" 
						disabled={selectedBlockId === null || !!status}
						onclick={() => selectedOp = selectedOp === op ? null : op}
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
			</div>
			<button class="unsolvable-btn" onclick={declareUnsolvable} disabled={!!status}>IMPOSSIBLE?</button>
			<button class="undo-btn" onclick={undo} disabled={!!status}>RESET</button>
		</div>
	</div>

	{#if status}
		<div class="status-overlay" in:fade>
			<div class="status-card">
				<div class="victory-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
				{/if}
				<button class="new-puzzle-btn" onclick={generate}>NEXT CHALLENGE</button>
			</div>
		</div>
	{/if}

	{#if loserPopup}
		<div class="loser-overlay" in:fade out:fade>
			<div class="loser-card">
				<div class="error-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; position: relative; transition: background-color 0.3s; }
	.game-container.flash-red { background-color: rgba(255, 0, 0, 0.2) !important; }
	
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

	.game-stats { display: flex; justify-content: center; margin-bottom: 2vmin; width: 100%; position: relative; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.4vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.5vmin; text-transform: uppercase; margin-bottom: 0.5vmin; }
	.target-val { font-size: 8vmin; font-weight: 900; color: var(--color-bittersweet); line-height: 1; text-shadow: 0 0 3vmin rgba(255, 110, 97, 0.4); }


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
		gap: 4vmin;
		background: rgba(20, 20, 25, 0.95);
		padding: 6vmin 10vmin;
		border-radius: 4vmin;
		border: 2px solid var(--color-golden);
		box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255, 230, 109, 0.15);
		animation: pop-in 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.27);
	}

	@keyframes pop-in {
		0% { transform: scale(0.8); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}

	.status-text {
		font-size: 5vmin;
		font-weight: 900;
		color: var(--color-golden);
		text-transform: uppercase;
		letter-spacing: 0.8vmin;
		text-shadow: 0 0 3vmin rgba(255, 230, 109, 0.4);
		margin: 0;
	}

	.winning-formula {
		display: flex;
		align-items: center;
		gap: 2vmin;
		font-size: 3vmin;
		color: white;
		font-family: 'Outfit', sans-serif;
		background: rgba(255, 255, 255, 0.05);
		padding: 2vmin 4vmin;
		border-radius: 2vmin;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.formula { opacity: 0.8; font-weight: 500; }
	.equals { color: var(--color-golden); font-weight: 900; }
	.result { color: var(--color-bittersweet); font-weight: 900; }

	.new-puzzle-btn {
		background: var(--color-golden);
		color: black;
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-weight: 900;
		font-size: 2vmin;
		cursor: pointer;
		transition: all 0.3s;
	}
	.new-puzzle-btn:hover { transform: scale(1.05); box-shadow: 0 0 2vmin var(--color-golden); }

	.workspace { display: flex; flex-direction: column; gap: 3vmin; align-items: center; margin-top: 1vmin; transition: opacity 0.3s, filter 0.3s; }
	.workspace.dimmed { opacity: 0.2; filter: blur(5px); pointer-events: none; }
	
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

	.unsolvable-btn, .undo-btn { 
		background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: var(--color-bittersweet); padding: 1vmin 3vmin; border-radius: 1vmin; cursor: pointer; font-weight: 900; font-size: 1.6vmin; transition: all 0.3s; letter-spacing: 0.1vmin; 
	}
	.unsolvable-btn:hover:not(:disabled), .undo-btn:hover:not(:disabled) { background: var(--color-bittersweet); color: black; border-color: var(--color-bittersweet); box-shadow: 0 0 20px rgba(255, 110, 97, 0.3); }
	.unsolvable-btn:disabled, .undo-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }

	.undo-btn {
		background: rgba(255,255,255,0.05);
		border-color: rgba(255,255,255,0.2);
		color: rgba(255,255,255,0.6);
	}
	.undo-btn:hover:not(:disabled) {
		background: rgba(255,255,255,0.2);
		color: white;
		border-color: white;
	}

	.victory-icon {
		width: 10vmin;
		height: 10vmin;
		background: rgba(255, 230, 109, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-golden);
		margin-bottom: -1vmin;
		box-shadow: 0 0 3vmin rgba(255, 230, 109, 0.2);
	}
	.victory-icon svg { width: 5vmin; height: 5vmin; }

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
		box-shadow: 0 0 5vmin rgba(255,0,0,0.3);
		animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
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
	.error-icon svg { width: 4vmin; height: 4vmin; }

	.loser-text {
		font-size: 4vmin;
		font-weight: 900;
		color: #ff4d4d;
		letter-spacing: 0.4vmin;
	}

	.loser-sub {
		font-size: 1.8vmin;
		color: rgba(255,255,255,0.4);
		font-weight: 600;
	}

	@keyframes shake {
		10%, 90% { transform: translate(-50%, -50%) translate3d(-1px, 0, 0); }
		20%, 80% { transform: translate(-50%, -50%) translate3d(2px, 0, 0); }
		30%, 50%, 70% { transform: translate(-50%, -50%) translate3d(-4px, 0, 0); }
		40%, 60% { transform: translate(-50%, -50%) translate3d(4px, 0, 0); }
	}
</style>
