<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Instructions from './Instructions.svelte';

	let { onBack } = $props();
	let instructions: any;

	const GRID_SIZE = 6;
	const CELL_PCT = 100 / GRID_SIZE;

	type Car = {
		id: number;
		x: number;
		y: number;
		visualX: number;
		visualY: number;
		len: number;
		dir: 'h' | 'v';
		isTarget?: boolean;
		color: string;
	};

	const levels: Partial<Car>[][] = [
		// Level 1 (Card 1)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 3, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 2, dir: 'h', color: '#777' },
			{ id: 3, x: 3, y: 1, len: 3, dir: 'v', color: '#444' },
			{ id: 4, x: 0, y: 4, len: 2, dir: 'v', color: '#666' },
			{ id: 5, x: 4, y: 4, len: 2, dir: 'h', color: '#555' },
			{ id: 6, x: 2, y: 5, len: 2, dir: 'h', color: '#777' }
		],
		// Level 2 (Card 2)
		[
			{ id: 0, x: 0, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 2, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 2, dir: 'h', color: '#777' },
			{ id: 3, x: 4, y: 0, len: 2, dir: 'v', color: '#444' },
			{ id: 4, x: 5, y: 0, len: 3, dir: 'v', color: '#666' },
			{ id: 5, x: 0, y: 3, len: 2, dir: 'h', color: '#888' },
			{ id: 6, x: 2, y: 3, len: 3, dir: 'v', color: '#555' },
			{ id: 7, x: 4, y: 4, len: 2, dir: 'h', color: '#777' }
		],
		// Level 3 (Card 3)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 1, len: 3, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 3, dir: 'h', color: '#777' },
			{ id: 3, x: 4, y: 0, len: 3, dir: 'v', color: '#444' },
			{ id: 4, x: 5, y: 1, len: 3, dir: 'v', color: '#666' },
			{ id: 5, x: 2, y: 3, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 3, y: 3, len: 2, dir: 'v', color: '#555' },
			{ id: 7, x: 1, y: 5, len: 3, dir: 'h', color: '#777' }
		],
		// Level 4 (Card 4)
		[
			{ id: 0, x: 0, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 3, dir: 'h', color: '#555' },
			{ id: 2, x: 3, y: 0, len: 3, dir: 'v', color: '#777' },
			{ id: 3, x: 0, y: 3, len: 2, dir: 'h', color: '#444' },
			{ id: 4, x: 2, y: 3, len: 2, dir: 'v', color: '#666' },
			{ id: 5, x: 4, y: 3, len: 2, dir: 'v', color: '#888' }
		],
		// Level 5 (Card 5)
		[
			{ id: 0, x: 0, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 2, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 2, dir: 'h', color: '#777' },
			{ id: 3, x: 3, y: 0, len: 2, dir: 'v', color: '#444' },
			{ id: 4, x: 4, y: 0, len: 2, dir: 'v', color: '#666' },
			{ id: 5, x: 5, y: 0, len: 3, dir: 'v', color: '#888' },
			{ id: 6, x: 0, y: 3, len: 2, dir: 'h', color: '#555' },
			{ id: 7, x: 2, y: 3, len: 2, dir: 'v', color: '#777' },
			{ id: 8, x: 3, y: 4, len: 2, dir: 'h', color: '#444' }
		],
		// Level 6 (Card 6)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 2, dir: 'v', color: '#555' },
			{ id: 2, x: 2, y: 0, len: 3, dir: 'v', color: '#777' },
			{ id: 3, x: 3, y: 0, len: 2, dir: 'v', color: '#444' },
			{ id: 4, x: 4, y: 1, len: 2, dir: 'h', color: '#666' },
			{ id: 5, x: 4, y: 2, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 0, y: 4, len: 2, dir: 'h', color: '#555' },
			{ id: 7, x: 3, y: 4, len: 2, dir: 'h', color: '#777' },
			{ id: 8, x: 5, y: 4, len: 2, dir: 'v', color: '#444' }
		],
		// Level 7 (Card 7)
		[
			{ id: 0, x: 0, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 2, y: 0, len: 3, dir: 'v', color: '#555' },
			{ id: 2, x: 3, y: 0, len: 2, dir: 'h', color: '#777' },
			{ id: 3, x: 5, y: 0, len: 2, dir: 'v', color: '#444' },
			{ id: 4, x: 3, y: 1, len: 2, dir: 'v', color: '#666' },
			{ id: 5, x: 4, y: 2, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 0, y: 3, len: 3, dir: 'h', color: '#555' },
			{ id: 7, x: 0, y: 4, len: 2, dir: 'v', color: '#777' },
			{ id: 8, x: 1, y: 4, len: 2, dir: 'v', color: '#444' },
			{ id: 9, x: 2, y: 4, len: 2, dir: 'v', color: '#666' },
			{ id: 10, x: 3, y: 4, len: 2, dir: 'v', color: '#888' },
			{ id: 11, x: 4, y: 5, len: 2, dir: 'h', color: '#555' }
		],
		// Level 8 (Card 8)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 2, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 2, dir: 'v', color: '#777' },
			{ id: 3, x: 2, y: 0, len: 2, dir: 'h', color: '#444' },
			{ id: 4, x: 4, y: 0, len: 2, dir: 'h', color: '#666' },
			{ id: 5, x: 3, y: 1, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 5, y: 1, len: 3, dir: 'v', color: '#555' },
			{ id: 7, x: 0, y: 3, len: 3, dir: 'v', color: '#777' },
			{ id: 8, x: 1, y: 4, len: 2, dir: 'v', color: '#444' },
			{ id: 9, x: 2, y: 4, len: 2, dir: 'h', color: '#666' },
			{ id: 10, x: 4, y: 4, len: 2, dir: 'h', color: '#888' }
		],
		// Level 9 (Card 9)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 3, dir: 'v', color: '#555' },
			{ id: 2, x: 1, y: 0, len: 2, dir: 'h', color: '#777' },
			{ id: 3, x: 4, y: 0, len: 2, dir: 'h', color: '#444' },
			{ id: 4, x: 3, y: 1, len: 2, dir: 'v', color: '#666' },
			{ id: 5, x: 5, y: 1, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 1, y: 3, len: 2, dir: 'h', color: '#555' },
			{ id: 7, x: 3, y: 3, len: 2, dir: 'v', color: '#777' },
			{ id: 8, x: 4, y: 3, len: 2, dir: 'h', color: '#444' },
			{ id: 9, x: 0, y: 4, len: 2, dir: 'v', color: '#666' },
			{ id: 10, x: 4, y: 4, len: 2, dir: 'v', color: '#888' },
			{ id: 11, x: 1, y: 5, len: 2, dir: 'h', color: '#555' }
		],
		// Level 10 (Card 10)
		[
			{ id: 0, x: 1, y: 2, len: 2, dir: 'h', isTarget: true, color: 'var(--color-bittersweet)' },
			{ id: 1, x: 0, y: 0, len: 2, dir: 'h', color: '#555' },
			{ id: 2, x: 2, y: 0, len: 2, dir: 'v', color: '#777' },
			{ id: 3, x: 3, y: 0, len: 2, dir: 'h', color: '#444' },
			{ id: 4, x: 5, y: 0, len: 3, dir: 'v', color: '#666' },
			{ id: 5, x: 0, y: 1, len: 2, dir: 'v', color: '#888' },
			{ id: 6, x: 3, y: 1, len: 2, dir: 'v', color: '#555' },
			{ id: 7, x: 0, y: 3, len: 3, dir: 'h', color: '#777' },
			{ id: 8, x: 3, y: 3, len: 2, dir: 'v', color: '#444' },
			{ id: 9, x: 4, y: 3, len: 2, dir: 'v', color: '#666' },
			{ id: 10, x: 0, y: 4, len: 2, dir: 'v', color: '#888' },
			{ id: 11, x: 1, y: 4, len: 2, dir: 'h', color: '#555' },
			{ id: 12, x: 1, y: 5, len: 2, dir: 'h', color: '#777' }
		]
	];

	let currentLevel = $state(0);
	let cars = $state<Car[]>([]);
	let won = $state(false);
	let moves = $state(0);
	let completedLevels = $state<boolean[]>(Array(10).fill(false));

	onMount(() => {
		const saved = localStorage.getItem('rushhour_completed');
		if (saved) {
			try {
				completedLevels = JSON.parse(saved);
			} catch (e) {}
		}
	});

	let boardElement: HTMLDivElement;

	let dragState = $state<{
		id: number,
		startClientPos: number,
		startCarPos: number,
		minPos: number,
		maxPos: number,
		dir: 'h' | 'v',
		cellSizePx: number
	} | null>(null);

	function loadLevel(i: number) {
		currentLevel = i;
		let raw = JSON.parse(JSON.stringify(levels[i]));
		cars = raw.map(c => ({...c, visualX: c.x, visualY: c.y}));
		won = false;
		moves = 0;
	}

	function getBounds(car: Car) {
		let minPos = 0;
		let maxPos = GRID_SIZE - car.len;
		
		for (const other of cars) {
			if (other.id === car.id) continue;
			
			if (car.dir === 'h') {
				let otherYMin = other.y;
				let otherYMax = other.dir === 'v' ? other.y + other.len - 1 : other.y;
				let otherXMin = other.x;
				let otherXMax = other.dir === 'h' ? other.x + other.len - 1 : other.x;

				if (car.y >= otherYMin && car.y <= otherYMax) {
					if (otherXMax < car.x) minPos = Math.max(minPos, otherXMax + 1);
					if (otherXMin > car.x) maxPos = Math.min(maxPos, otherXMin - car.len);
				}
			} else {
				let otherYMin = other.y;
				let otherYMax = other.dir === 'v' ? other.y + other.len - 1 : other.y;
				let otherXMin = other.x;
				let otherXMax = other.dir === 'h' ? other.x + other.len - 1 : other.x;

				if (car.x >= otherXMin && car.x <= otherXMax) {
					if (otherYMax < car.y) minPos = Math.max(minPos, otherYMax + 1);
					if (otherYMin > car.y) maxPos = Math.min(maxPos, otherYMin - car.len);
				}
			}
		}
		
		if (car.isTarget) {
			let blockedOnRight = false;
			for (const other of cars) {
				if (other.id === car.id) continue;
				let otherYMin = other.y;
				let otherYMax = other.dir === 'v' ? other.y + other.len - 1 : other.y;
				let otherXMin = other.x;
				if (car.y >= otherYMin && car.y <= otherYMax && otherXMin > car.x) {
					blockedOnRight = true;
				}
			}
			if (!blockedOnRight) maxPos = GRID_SIZE - 1; // Allows x=5 so car occupies 5,6 (exits grid)
		}
		
		return { minPos, maxPos };
	}

	function onPointerDown(e: PointerEvent, car: Car) {
		if (won) return;
		const bounds = getBounds(car);
		const rect = boardElement.getBoundingClientRect();
		const cellSizePx = rect.width / GRID_SIZE;
		
		dragState = {
			id: car.id,
			startClientPos: car.dir === 'h' ? e.clientX : e.clientY,
			startCarPos: car.dir === 'h' ? car.x : car.y,
			minPos: bounds.minPos,
			maxPos: bounds.maxPos,
			dir: car.dir,
			cellSizePx
		};
		
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragState) return;
		
		const clientPos = dragState.dir === 'h' ? e.clientX : e.clientY;
		const deltaPx = clientPos - dragState.startClientPos;
		const deltaGrid = deltaPx / dragState.cellSizePx;
		
		let newPos = dragState.startCarPos + deltaGrid;
		newPos = Math.max(dragState.minPos, Math.min(dragState.maxPos, newPos));
		
		let car = cars.find(c => c.id === dragState?.id);
		if (car) {
			if (dragState.dir === 'h') car.visualX = newPos;
			else car.visualY = newPos;
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!dragState) return;
		let car = cars.find(c => c.id === dragState?.id);
		if (!car) return;
		
		let oldX = car.x;
		let oldY = car.y;

		if (dragState.dir === 'h') {
			car.x = Math.round(car.visualX);
			car.visualX = car.x;
		} else {
			car.y = Math.round(car.visualY);
			car.visualY = car.y;
		}
		
		if (oldX !== car.x || oldY !== car.y) {
			moves++;
		}
		
		if (car.isTarget && car.x === GRID_SIZE - 1) {
			won = true;
			if (!completedLevels[currentLevel]) {
				completedLevels[currentLevel] = true;
				localStorage.setItem('rushhour_completed', JSON.stringify(completedLevels));
			}
		}
		
		dragState = null;
	}

	loadLevel(0);
</script>

<div class="rushhour-container">
	<Instructions bind:this={instructions} gameId="rushhour" title="Rush Hour">
		<p><strong>Goal:</strong> Maneuver the red car out the exit on the right.</p>
		<p>Click and drag cars to slide them forward or backward along their tracks. Cars cannot move sideways or jump over each other.</p>
	</Instructions>

	<div class="nav-row">
		<div class="nav-group">
			<button class="back-btn" onclick={onBack}>BACK TO MENU</button>
			<button class="help-btn" onclick={() => instructions.open()}>HOW TO PLAY</button>
		</div>
		<div class="level-select">
			{#each levels as _, i}
				<button class="lvl-btn" class:active={currentLevel === i} class:completed={completedLevels[i]} onclick={() => loadLevel(i)}>
					{i + 1}
					{#if completedLevels[i]}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
					{/if}
				</button>
			{/each}
		</div>
		<button class="restart-btn" onclick={() => loadLevel(currentLevel)}>RESTART</button>
	</div>

	<div class="game-header">
		<h1 class="title">RUSH HOUR</h1>
		<div class="scoreboard">
			<div class="score-item">
				<span class="label">MOVES</span>
				<span class="value">{moves}</span>
			</div>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board" bind:this={boardElement}>
			<!-- Grid lines for visual clarity -->
			<div class="grid-lines">
				{#each Array(GRID_SIZE) as _, i}
					{#each Array(GRID_SIZE) as _, j}
						<div class="cell" style="left: {j * CELL_PCT}%; top: {i * CELL_PCT}%; width: {CELL_PCT}%; height: {CELL_PCT}%;"></div>
					{/each}
				{/each}
			</div>

			<!-- The Exit -->
			<div class="exit" style="top: {2 * CELL_PCT}%; height: {CELL_PCT}%;"></div>

			<!-- Cars -->
			{#each cars as car (car.id)}
				<div 
					class="car {car.dir} {car.isTarget ? 'target' : ''}"
					style="
						left: {car.visualX * CELL_PCT}%; 
						top: {car.visualY * CELL_PCT}%; 
						width: {car.dir === 'h' ? car.len * CELL_PCT : CELL_PCT}%; 
						height: {car.dir === 'v' ? car.len * CELL_PCT : CELL_PCT}%;
					"
					onpointerdown={(e) => onPointerDown(e, car)}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
				>
					<div class="car-body" style="background: {car.color}"></div>
				</div>
			{/each}
		</div>

		{#if won}
			<div class="win-overlay" in:fade>
				<h2>SOLVED!</h2>
				<p>{moves} MOVES</p>
				{#if currentLevel < levels.length - 1}
					<button class="next-btn" onclick={() => loadLevel(currentLevel + 1)}>NEXT LEVEL</button>
				{:else}
					<button class="next-btn" onclick={() => loadLevel(0)}>PLAY AGAIN</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.rushhour-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
	}

	.nav-row {
		padding: 3vmin;
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 10;
	}

	.level-select {
		display: flex;
		gap: 1vmin;
		flex-wrap: wrap;
		justify-content: center;
		max-width: 50%;
	}

	.lvl-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.4);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 800;
		font-size: 1.4vmin;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5vmin;
	}

	.lvl-btn:hover { color: white; border-color: rgba(255,255,255,0.3); }
	.lvl-btn.active { color: white; border-color: var(--color-illusion); background: rgba(255,255,255,0.1); }
	.lvl-btn.completed { color: var(--color-apple); border-color: rgba(78, 205, 196, 0.4); }
	.lvl-btn.completed.active { border-color: var(--color-apple); }

	.check-icon {
		width: 1.2vmin;
		height: 1.2vmin;
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

	.back-btn:hover, .restart-btn:hover, .help-btn:hover { color: white; border-color: var(--color-illusion); }

	.game-header {
		text-align: center;
		padding: 0 4vmin;
	}

	.title {
		font-size: 6vmin;
		margin: 0;
		font-weight: 900;
		letter-spacing: -2px;
		color: var(--color-illusion);
	}

	.scoreboard {
		display: flex;
		justify-content: center;
		gap: 6vmin;
		margin-top: 1vmin;
	}

	.score-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.label { font-size: 1.2vmin; color: rgba(255,255,255,0.3); font-weight: 800; }
	.value { font-size: 3vmin; font-weight: 800; }

	.board-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 1;
		padding: 4vmin;
	}

	.board {
		position: relative;
		width: 60vmin;
		height: 60vmin;
		background: rgba(255,255,255,0.02);
		border-radius: 2vmin;
		border: 2px solid rgba(255,255,255,0.1);
	}

	.grid-lines {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.cell {
		position: absolute;
		border-right: 1px dashed rgba(255,255,255,0.05);
		border-bottom: 1px dashed rgba(255,255,255,0.05);
		box-sizing: border-box;
	}

	.exit {
		position: absolute;
		right: -2vmin;
		width: 2vmin;
		background: rgba(255,255,255,0.1);
		border-top: 2px solid rgba(255,255,255,0.2);
		border-bottom: 2px solid rgba(255,255,255,0.2);
		border-radius: 0 1vmin 1vmin 0;
		z-index: 0;
	}

	.car {
		position: absolute;
		padding: 0.5vmin;
		box-sizing: border-box;
		cursor: grab;
		touch-action: none; /* Prevents scroll on mobile when dragging */
		z-index: 10;
	}

	.car:active {
		cursor: grabbing;
		z-index: 20; /* Bring to front while dragging */
	}

	.car-body {
		width: 100%;
		height: 100%;
		border-radius: 1vmin;
		box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2);
		transition: filter 0.2s;
	}

	.car:hover .car-body {
		filter: brightness(1.2);
	}

	.target .car-body {
		border: 2px solid rgba(255,255,255,0.4);
	}

	.win-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.85);
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border-radius: 2vmin;
		z-index: 100;
	}

	.win-overlay h2 {
		font-size: 8vmin;
		color: var(--color-apple);
		margin: 0 0 1vmin 0;
		font-weight: 900;
	}

	.win-overlay p {
		font-size: 3vmin;
		color: rgba(255,255,255,0.7);
		margin: 0 0 4vmin 0;
		font-weight: 800;
	}

	.next-btn {
		background: var(--color-apple);
		color: #000;
		border: none;
		padding: 2vmin 6vmin;
		border-radius: 1vmin;
		font-size: 2.5vmin;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.2s;
	}

	.next-btn:hover {
		filter: brightness(1.2);
	}
</style>
