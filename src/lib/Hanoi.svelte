<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '1') {
			handleTowerClick(0);
		} else if (e.key === '2') {
			handleTowerClick(1);
		} else if (e.key === '3') {
			handleTowerClick(2);
		} else if (e.key.toLowerCase() === 'r') {
			if (gameState !== 'start') initGame();
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
					selectedTower = index;
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

	function formatTime(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const DISC_COLORS = [
		'#ff6e61', '#ffcb5c', '#69af4b', '#4b6abe', '#f8a5c2', '#a29bfe', '#55efc4', '#fab1a0'
	];

	$effect(() => {
		registerActions({
			help: () => instructions.open()
		});
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="hanoi-container">
	<Instructions bind:this={instructions} gameId="hanoi" title="Tower of Hanoi">
		<p><strong>Goal:</strong> Move the entire stack to another rod.</p>
		<p>Click a rod to select the top disc, then click another rod to place it there. You can only move one disc at a time, and you cannot place a larger disc onto a smaller one.</p>
	</Instructions>

	{#if gameState === 'start'}
		<div class="overlay" in:fade>
			<h1 class="title">TOWER OF HANOI</h1>
			<p class="description">Move all discs from the first rod to the last rod. A larger disc cannot be placed on a smaller one.</p>
			
			<div class="settings">
				<span class="label">NUMBER OF DISCS</span>
				<div class="input-stepper">
					<button onclick={() => numDiscs = Math.max(3, numDiscs - 1)}>-</button>
					<div class="stepper-value">{numDiscs}</div>
					<button onclick={() => numDiscs = Math.min(8, numDiscs + 1)}>+</button>
				</div>
			</div>

			<button class="cta-btn" onclick={initGame}>START GAME</button>
		</div>
	{:else}
		<div class="board-wrapper">
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
									class:selected-disc={selectedTower === i && discSize === tower[tower.length - 1]}
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
				{#if gameState === 'won'}
					<div class="completion-overlay" transition:fade></div>
				{/if}
			</div>
		</div>

		<div class="bottom-bar">
			{#if gameState === 'won'}
				<GameOverMenu onPlayAgain={() => gameState = 'start'} onMenu={onBack} delay={0} playAgainText="NEW GAME" />
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
		color: var(--app-text);
		position: relative;
	}

	.overlay {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4vmin;
	}

	.title { font-size: 8vmin; margin: 0; color: var(--app-text); font-weight: 900; letter-spacing: -2px; }
	.description { color: var(--app-muted-text); margin: 2vmin 0 4vmin; font-size: 2vmin; max-width: 50vmin; }
	.settings { display: flex; flex-direction: column; align-items: center; gap: 2vmin; margin-bottom: 5vmin; }
	
	.input-stepper { display: flex; align-items: center; gap: 2vmin; background: var(--panel-bg); padding: 1vmin; border-radius: 1.5vmin; border: 1px solid var(--panel-border); }
	.input-stepper button { background: color-mix(in srgb, var(--panel-bg) 84%, var(--app-text) 12%); border: none; color: var(--app-text); width: 8vmin; height: 8vmin; border-radius: 1vmin; cursor: pointer; font-weight: 900; font-size: 5vmin; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
	.input-stepper button:hover { background: color-mix(in srgb, var(--panel-bg) 72%, var(--app-text) 24%); color: var(--app-text); transform: scale(1.05); }
	.input-stepper .stepper-value { font-size: 6vmin; font-weight: 900; width: 8vmin; text-align: center; color: var(--color-bittersweet); }

	.cta-btn { background: var(--color-bittersweet); color: #111; border: none; padding: 2vmin 5vmin; font-size: 2.5vmin; font-weight: 800; border-radius: 1.5vmin; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4); }
	.cta-btn:hover { background: var(--app-text); scale: 1.05; }

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 1vmin 4vmin;
		box-sizing: border-box;
		overflow: hidden;
	}

	.stats { display: flex; gap: min(12vmin, 4vw); margin-bottom: 2vmin; width: min(95vmin, 100%); justify-content: center; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.label { font-size: 1.4vmin; color: var(--app-muted-text); font-weight: 800; letter-spacing: 0.2vmin; }
	.value { font-size: 5vmin; font-weight: 900; color: var(--app-text); }

	.stage {
		display: flex;
		align-items: flex-end;
		height: 55vmin;
		width: min(95vmin, 100%);
		max-width: 100%;
		position: relative;
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		border-radius: 3vmin;
		padding: 2vmin;
		overflow: hidden;
	}

	.tower { flex: 1; height: 100%; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; background: transparent; border: none; cursor: pointer; padding: 0 1vmin; transition: background 0.2s; border-radius: 1.5vmin; outline: none; }
	.tower:hover { background: color-mix(in srgb, var(--panel-bg) 84%, var(--app-text) 10%); }
	.rod { position: absolute; bottom: 1.5vmin; width: 1.5vmin; height: 45vmin; background: color-mix(in srgb, var(--app-text) 14%, transparent); border-radius: 1vmin 1vmin 0 0; transition: background 0.3s, box-shadow 0.3s; }
	.rod.selected { background: color-mix(in srgb, var(--app-text) 36%, transparent); box-shadow: 0 0 20px color-mix(in srgb, var(--app-text) 25%, transparent); }
	.base { width: 90%; height: 1.5vmin; background: color-mix(in srgb, var(--app-text) 18%, transparent); border-radius: 1vmin; margin-bottom: 0.5vmin; }
	.discs-container { display: flex; flex-direction: column-reverse; align-items: center; width: 100%; z-index: 5; margin-bottom: 1.5vmin; }
	.disc { height: 6vmin; border-radius: 1.2vmin; display: flex; align-items: center; justify-content: center; margin-bottom: 0.2vmin; box-shadow: 0 4px 8px rgba(0,0,0,0.3); position: relative; transition: all 0.2s; }
	.disc.selected-disc { box-shadow: 0 0 0 0.4vmin var(--app-text), 0 10px 20px rgba(0,0,0,0.6); z-index: 10; filter: brightness(1.2); }
	.disc-label { font-size: 1.2vmin; font-weight: 900; opacity: 0.5; color: black; }

	@media (max-width: 900px) {
		.stats {
			gap: 1.5rem;
		}

		.stage {
			height: min(62vmin, 70dvh);
		}

		.tower {
			padding: 0 0.6vmin;
		}
	}

	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }

	.completion-overlay {
		position: absolute;
		top: 0;
		left: -150%;
		width: 150%;
		height: 100%;
		background: rgba(255, 255, 255, 0.3);
		transform: skewX(-25deg);
		animation: swoosh 0.8s ease-in-out forwards;
		pointer-events: none;
		z-index: 20;
	}

	@keyframes swoosh { 0% { left: -150%; } 100% { left: 150%; } }
</style>
