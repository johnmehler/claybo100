<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import Instructions from './Instructions.svelte';

	let { onBack } = $props();
	let instructions: any;

	let numDiscs = $state(4);
	let towers = $state<number[][]>([[], [], []]);
	let selectedTower = $state<number | null>(null);
	let movesCount = $state(0);
	let gameState = $state<'start' | 'playing' | 'won'>('start');
	let startTime = $state<number | null>(null);
	let elapsedTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function initGame() {
		towers = [
			Array.from({ length: numDiscs }, (_, i) => numDiscs - i),
			[],
			[]
		];
		movesCount = 0;
		selectedTower = null;
		gameState = 'playing';
		startTime = Date.now();
		elapsedTime = 0;
		startTimer();
	}

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (startTime) {
				elapsedTime = Math.floor((Date.now() - startTime) / 1000);
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function handleTowerClick(index: number) {
		if (gameState !== 'playing') return;

		if (selectedTower === null) {
			if (towers[index].length > 0) {
				selectedTower = index;
			}
		} else {
			if (selectedTower === index) {
				selectedTower = null;
			} else {
				const fromTower = towers[selectedTower];
				const toTower = towers[index];
				const discToMove = fromTower[fromTower.length - 1];
				const targetTopDisc = toTower[toTower.length - 1];

				if (!targetTopDisc || discToMove < targetTopDisc) {
					// Valid move
					const newTowers = towers.map((t, i) => {
						if (i === selectedTower) return t.slice(0, -1);
						if (i === index) return [...t, discToMove];
						return t;
					});
					towers = newTowers;
					movesCount++;
					selectedTower = null;
					checkWin();
				} else {
					// Invalid move - maybe shake or highlight error?
					selectedTower = index; // Select the new tower instead if it has discs
					if (towers[index].length === 0) selectedTower = null;
				}
			}
		}
	}

	function checkWin() {
		if (towers[2].length === numDiscs) {
			gameState = 'won';
			stopTimer();
		}
	}

	function restart() {
		initGame();
	}

	function formatTime(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const DISC_COLORS = [
		'#ff6e61', // bittersweet
		'#ffcb5c', // golden
		'#69af4b', // apple
		'#4b6abe', // indigo
		'#f8a5c2', // illusion
		'#a29bfe', // purple
		'#55efc4', // mint
		'#fab1a0'  // peach
	];

</script>

<div class="hanoi-container">
	<Instructions bind:this={instructions} gameId="hanoi" title="Tower of Hanoi">
		<p><strong>Goal:</strong> Move the entire stack to another rod.</p>
		<p>Click a rod to select the top disc, then click another rod to place it there. You can only move one disc at a time, and you cannot place a larger disc onto a smaller one.</p>
	</Instructions>

	<div class="nav-row">
		<div class="nav-group">
			<button class="back-btn" onclick={onBack}>BACK TO MENU</button>
			<button class="help-btn" onclick={() => instructions.open()}>HOW TO PLAY</button>
		</div>
		{#if gameState !== 'start'}
			<button class="restart-btn" onclick={restart} in:fade>RESTART</button>
		{/if}
	</div>

	{#if gameState === 'start'}
		<div class="overlay" in:fade>
			<h1 class="title">TOWER OF HANOI</h1>
			<p class="description">Move all discs from the first rod to the last rod. A larger disc cannot be placed on a smaller one.</p>
			
			<div class="settings">
				<span class="label">DISCS: {numDiscs}</span>
				<input type="range" min="3" max="8" bind:value={numDiscs} class="slider" />
			</div>

			<button class="cta-btn" onclick={initGame}>START GAME</button>
		</div>
	{:else}
		<div class="game-area">
			<div class="stats">
				<div class="stat">
					<span class="label">MOVES</span>
					<span class="value">{movesCount}</span>
				</div>
				<div class="stat">
					<span class="label">TIME</span>
					<span class="value">{formatTime(elapsedTime)}</span>
				</div>
				<div class="stat">
					<span class="label">TARGET</span>
					<span class="value">{Math.pow(2, numDiscs) - 1}</span>
				</div>
			</div>

			<div class="stage">
				{#each towers as tower, i}
					<button class="tower" onclick={() => handleTowerClick(i)}>
						<div class="rod" class:selected={selectedTower === i}></div>
						<div class="discs-container">
							{#each tower as discSize (discSize)}
								<div 
									class="disc" 
									style="width: {20 + discSize * (80 / numDiscs)}%; background: {DISC_COLORS[(discSize - 1) % DISC_COLORS.length]}"
									animate:flip={{ duration: 300 }}
								>
									<span class="disc-label">{discSize}</span>
								</div>
							{/each}
						</div>
						<div class="base"></div>
					</button>
				{/each}
			</div>

			{#if gameState === 'won'}
				<div class="game-over-overlay" in:fade={{ duration: 400 }}>
					<h2>VICTORY!</h2>
					<p>Completed in {movesCount} moves and {formatTime(elapsedTime)}</p>
					<div class="actions">
						<button class="cta-btn" onclick={() => gameState = 'start'}>NEW GAME</button>
						<button class="secondary-btn" onclick={onBack}>MENU</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.hanoi-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
		position: relative;
	}

	.nav-row {
		padding: 3vmin;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-group {
		display: flex;
		gap: 1vmin;
	}

	.back-btn, .restart-btn, .help-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.4);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.8vmin;
		transition: all 0.2s;
	}

	.back-btn:hover, .help-btn:hover { color: white; border-color: var(--color-illusion); background: rgba(255,255,255,0.08); }
	.restart-btn:hover { color: white; border-color: var(--color-indigo); background: rgba(255,255,255,0.08); }

	.overlay {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4vmin;
	}

	.title {
		font-size: 8vmin;
		margin: 0;
		color: white;
		font-weight: 900;
		letter-spacing: -2px;
	}

	.description {
		color: rgba(255,255,255,0.5);
		margin: 2vmin 0 4vmin;
		font-size: 2vmin;
		max-width: 50vmin;
	}

	.settings {
		display: flex;
		flex-direction: column;
		gap: 1.5vmin;
		margin-bottom: 5vmin;
		width: 30vmin;
	}

	.slider {
		-webkit-appearance: none;
		width: 100%;
		height: 8px;
		background: rgba(255,255,255,0.1);
		border-radius: 4px;
		outline: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 20px;
		height: 20px;
		background: var(--color-bittersweet);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(255,110,97,0.5);
	}

	.cta-btn {
		background: var(--color-bittersweet);
		color: white;
		border: none;
		padding: 2vmin 5vmin;
		font-size: 2.5vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4);
	}

	.cta-btn:hover {
		background: var(--color-illusion);
		scale: 1.05;
	}

	.game-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-bottom: 5vmin;
	}

	.stats {
		display: flex;
		gap: 8vmin;
		margin-bottom: 6vmin;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.label {
		font-size: 1.4vmin;
		color: rgba(255,255,255,0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
	}

	.value {
		font-size: 4vmin;
		font-weight: 800;
	}

	.stage {
		display: flex;
		align-items: flex-end;
		height: 45vmin;
		width: 85vmin;
		position: relative;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 3vmin;
		padding: 2vmin;
	}

	.tower {
		flex: 1;
		height: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0 1vmin;
		transition: background 0.2s;
		border-radius: 1.5vmin;
		outline: none;
	}

	.tower:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.rod {
		position: absolute;
		bottom: 1.5vmin;
		width: 1.5vmin;
		height: 35vmin;
		background: rgba(255,255,255,0.1);
		border-radius: 1vmin 1vmin 0 0;
		transition: background 0.3s, box-shadow 0.3s;
	}

	.rod.selected {
		background: rgba(255,255,255,0.3);
		box-shadow: 0 0 20px rgba(255,255,255,0.2);
	}

	.base {
		width: 90%;
		height: 1.5vmin;
		background: rgba(255,255,255,0.15);
		border-radius: 1vmin;
		margin-bottom: 0.5vmin;
	}

	.discs-container {
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		width: 100%;
		z-index: 5;
		margin-bottom: 1.5vmin;
	}

	.disc {
		height: 4vmin;
		border-radius: 1vmin;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.2vmin;
		box-shadow: 0 4px 8px rgba(0,0,0,0.3);
		position: relative;
		transition: transform 0.2s;
	}

	.disc-label {
		font-size: 1.2vmin;
		font-weight: 900;
		opacity: 0.5;
		color: black;
	}

	.tower:hover .rod {
		background: rgba(255,255,255,0.25);
	}

	.tower:hover .base {
		background: rgba(255,255,255,0.25);
	}

	.game-over-overlay {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.8);
		backdrop-filter: blur(15px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 20;
		border-radius: 4vmin;
	}

	.game-over-overlay h2 {
		font-size: 8vmin;
		margin: 0;
		font-weight: 900;
		color: var(--color-apple);
	}

	.game-over-overlay p {
		font-size: 3vmin;
		color: rgba(255,255,255,0.6);
		margin: 2vmin 0 5vmin;
	}

	.actions {
		display: flex;
		gap: 3vmin;
	}

	.secondary-btn {
		background: transparent;
		border: 1px solid rgba(255,255,255,0.2);
		color: white;
		padding: 2vmin 5vmin;
		font-size: 2vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.2s;
	}

	.secondary-btn:hover {
		background: rgba(255,255,255,0.1);
		border-color: white;
	}
</style>
