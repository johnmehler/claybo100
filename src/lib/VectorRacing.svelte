<script lang="ts">
	import { fade } from 'svelte/transition';
	import Instructions from './Instructions.svelte';
	import GameOverMenu from './GameOverMenu.svelte';
	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	// Grid configuration
	const COLS = 50;
	const ROWS = 50;

	// Track cells: 0 = off-track, 1 = track, 2 = start, 3 = finish
	let track = $state<number[]>(Array(COLS * ROWS).fill(0));
	let startCells = $state<number[]>([]);
	let finishCells = $state<number[]>([]);

	// Player state
	let posX = $state(0);
	let posY = $state(0);
	let velX = $state(0);
	let velY = $state(0);
	let turn = $state(0);
	let trail = $state<{x: number, y: number}[]>([]);
	let gameStarted = $state(false);
	let gameWon = $state(false);
	let crashed = $state(false);

	// Canvas
	let canvas: HTMLCanvasElement;
	let cellSize = $state(0);

	// Possible acceleration choices: -1, 0, +1 for each axis
	const accChoices = [-1, 0, 1];

	function generateTrack() {
		const t = Array(COLS * ROWS).fill(0);
		const startCellsList: number[] = [];
		const finishCellsList: number[] = [];
		
		const cx = COLS / 2;
		const cy = ROWS / 2;
		const r_inner = 9;
		const r_outer = 17;

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const dx = x - cx + 0.5;
				const dy = y - cy + 0.5;
				// Multiply dx by 0.75 to make the track stretch horizontally (oblong)
				const dist = Math.sqrt((dx * 0.75) * (dx * 0.75) + dy * dy);
				
				if (dist >= r_inner && dist <= r_outer) {
					if (y >= cy) {
						if (x >= cx - 1 && x <= cx) {
							t[y * COLS + x] = 0; // Wall (Gap)
						} else if (x === cx + 1) {
							t[y * COLS + x] = 2; // Start
							startCellsList.push(y * COLS + x);
						} else if (x === cx - 2) {
							t[y * COLS + x] = 3; // Finish
							finishCellsList.push(y * COLS + x);
						} else {
							t[y * COLS + x] = 1; // Track
						}
					} else {
						t[y * COLS + x] = 1; // Track
					}
				}
			}
		}
		
		track = t;
		startCells = startCellsList;
		finishCells = finishCellsList;
	}

	function reset() {
		generateTrack();
		gameStarted = false;
		gameWon = false;
		crashed = false;
		velX = 0;
		velY = 0;
		turn = 0;
		trail = [];
		posX = 0;
		posY = 0;
		requestAnimationFrame(draw);
	}

	function clickStart(cellIdx: number) {
		if (gameStarted || crashed || gameWon) return;
		posX = cellIdx % COLS;
		posY = Math.floor(cellIdx / COLS);
		velX = 0;
		velY = 0;
		turn = 0;
		trail = [{ x: posX, y: posY }];
		gameStarted = true;
		requestAnimationFrame(draw);
	}

	function checkPath(x0: number, y0: number, x1: number, y1: number) {
		const dx = Math.abs(x1 - x0);
		const dy = Math.abs(y1 - y0);
		const sx = x0 < x1 ? 1 : -1;
		const sy = y0 < y1 ? 1 : -1;
		let err = dx - dy;

		let curX = x0;
		let curY = y0;

		while (true) {
			if (curX < 0 || curX >= COLS || curY < 0 || curY >= ROWS || track[curY * COLS + curX] === 0) {
				return { clear: false, cx: curX, cy: curY, won: false };
			}
			
			if (track[curY * COLS + curX] === 3) {
				return { clear: true, cx: curX, cy: curY, won: true };
			}

			if (curX === x1 && curY === y1) break;
			
			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				curX += sx;
			}
			if (e2 < dx) {
				err += dx;
				curY += sy;
			}
		}
		return { clear: true, cx: x1, cy: y1, won: false };
	}

	function getTargets(): {x: number, y: number, ax: number, ay: number}[] {
		if (!gameStarted || crashed || gameWon) return [];
		const targets: {x: number, y: number, ax: number, ay: number}[] = [];
		for (const ax of accChoices) {
			for (const ay of accChoices) {
				const nx = posX + velX + ax;
				const ny = posY + velY + ay;
				const path = checkPath(posX, posY, nx, ny);
				if (path.clear) {
					targets.push({ x: nx, y: ny, ax, ay });
				}
			}
		}
		return targets;
	}

	function move(ax: number, ay: number) {
		if (!gameStarted || crashed || gameWon) return;
		velX += ax;
		velY += ay;
		const nx = posX + velX;
		const ny = posY + velY;
		
		const path = checkPath(posX, posY, nx, ny);
		
		if (!path.clear) {
			crashed = true;
			posX = path.cx;
			posY = path.cy;
			trail.push({ x: posX, y: posY });
			trail = trail;
			requestAnimationFrame(draw);
			return;
		}
		
		posX = path.cx;
		posY = path.cy;
		trail.push({ x: posX, y: posY });
		trail = trail;
		turn++;
		
		if (path.won) {
			gameWon = true;
		}
		
		if (!gameWon && getTargets().length === 0) {
			crashed = true;
		}
		
		requestAnimationFrame(draw);
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		const w = canvas.width;
		const h = canvas.height;
		const cs = w / COLS;
		cellSize = cs;
		
		ctx.clearRect(0, 0, w, h);
		
		// Blueprint background
		ctx.fillStyle = '#0f172a'; // slate-900
		ctx.fillRect(0, 0, w, h);
		
		// Graph paper grid
		ctx.lineWidth = 1;
		for (let x = 0; x <= COLS; x++) {
			ctx.strokeStyle = x % 5 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.15)';
			ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, h); ctx.stroke();
		}
		for (let y = 0; y <= ROWS; y++) {
			ctx.strokeStyle = y % 5 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.15)';
			ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(w, y * cs); ctx.stroke();
		}
		
		// Draw track shading
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = track[y * COLS + x];
				if (cell === 0) continue;
				
				if (cell === 1) {
					ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
				} else if (cell === 2) {
					ctx.fillStyle = 'rgba(75, 190, 75, 0.3)';
				} else if (cell === 3) {
					ctx.fillStyle = 'rgba(255, 200, 60, 0.3)';
				}
				ctx.fillRect(x * cs, y * cs, cs, cs);
			}
		}

		// Draw Start/Finish lines heavily
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = track[y * COLS + x];
				if (cell === 2) { // Start
					ctx.fillStyle = 'rgba(75, 190, 75, 0.8)';
					ctx.fillRect(x * cs + cs - 4, y * cs, 4, cs); // thicker line on right edge
				}
				if (cell === 3) { // Finish
					ctx.fillStyle = 'rgba(255, 200, 60, 0.8)';
					ctx.fillRect(x * cs, y * cs, 4, cs); // thicker line on left edge
					
					// Draw checkered pattern
					ctx.fillStyle = 'rgba(0,0,0,0.6)';
					for(let i=0; i<4; i++){
						ctx.fillRect(x * cs, y * cs + (i*cs/4), cs/2, cs/4);
					}
				}
			}
		}

		// Draw start/finish labels
		if (startCells.length > 0) {
			const sx = (startCells[0] % COLS) * cs;
			const sy = (Math.floor(startCells[0] / COLS)) * cs - cs * 0.5;
			ctx.fillStyle = 'rgba(75, 190, 75, 0.9)';
			ctx.font = `bold ${cs * 2.0}px Outfit`;
			ctx.textAlign = 'center';
			ctx.fillText('START', sx + cs * 0.5, sy);
		}
		if (finishCells.length > 0) {
			const fx = (finishCells[0] % COLS) * cs;
			const fy = (Math.floor(finishCells[0] / COLS)) * cs - cs * 0.5;
			ctx.fillStyle = 'rgba(255, 200, 60, 0.9)';
			ctx.font = `bold ${cs * 2.0}px Outfit`;
			ctx.textAlign = 'center';
			ctx.fillText('FINISH', fx + cs * 0.5, fy);
		}
		
		// Draw trail
		if (trail.length > 1) {
			ctx.strokeStyle = '#f8fafc';
			ctx.lineWidth = cs * 0.3;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(trail[0].x * cs + cs / 2, trail[0].y * cs + cs / 2);
			for (let i = 1; i < trail.length; i++) {
				ctx.lineTo(trail[i].x * cs + cs / 2, trail[i].y * cs + cs / 2);
			}
			ctx.stroke();
			
			for (let i = 0; i < trail.length; i++) {
				ctx.fillStyle = '#f8fafc';
				ctx.beginPath();
				ctx.arc(trail[i].x * cs + cs / 2, trail[i].y * cs + cs / 2, cs * 0.25, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		
		// Draw velocity vector from current pos
		if (gameStarted && !crashed && !gameWon) {
			const cx2 = posX * cs + cs / 2;
			const cy2 = posY * cs + cs / 2;
			const ghostX = (posX + velX) * cs + cs / 2;
			const ghostY = (posY + velY) * cs + cs / 2;
			
			if (velX !== 0 || velY !== 0) {
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
				ctx.lineWidth = cs * 0.15;
				ctx.setLineDash([cs * 0.2, cs * 0.15]);
				ctx.beginPath();
				ctx.moveTo(cx2, cy2);
				ctx.lineTo(ghostX, ghostY);
				ctx.stroke();
				ctx.setLineDash([]);
				
				ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
				ctx.beginPath();
				ctx.arc(ghostX, ghostY, cs * 0.4, 0, Math.PI * 2);
				ctx.fill();
			}
			
			// Draw valid target positions
			const targets = getTargets();
			for (const t of targets) {
				const tx = t.x * cs + cs / 2;
				const ty = t.y * cs + cs / 2;
				
				ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
				ctx.beginPath();
				ctx.arc(tx, ty, cs * 0.45, 0, Math.PI * 2);
				ctx.fill();
				
				ctx.strokeStyle = '#38bdf8';
				ctx.lineWidth = cs * 0.15;
				ctx.beginPath();
				ctx.arc(tx, ty, cs * 0.45, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
		
		// Draw current position
		if (gameStarted) {
			const curPx = posX * cs + cs / 2;
			const curPy = posY * cs + cs / 2;
			
			if (crashed) {
				ctx.fillStyle = '#ef4444';
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#991b1b';
				ctx.lineWidth = cs * 0.15;
				ctx.beginPath();
				ctx.moveTo(curPx - cs * 0.3, curPy - cs * 0.3);
				ctx.lineTo(curPx + cs * 0.3, curPy + cs * 0.3);
				ctx.moveTo(curPx + cs * 0.3, curPy - cs * 0.3);
				ctx.lineTo(curPx - cs * 0.3, curPy + cs * 0.3);
				ctx.stroke();
			} else if (gameWon) {
				ctx.fillStyle = '#fbbf24';
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
				ctx.shadowBlur = cs;
				ctx.fill();
				ctx.shadowBlur = 0;
			} else {
				ctx.fillStyle = '#38bdf8';
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.4, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
				ctx.shadowBlur = cs;
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}
		
		// Pre-start: highlight start cells
		if (!gameStarted && !crashed && !gameWon) {
			for (const sc of startCells) {
				const sx = (sc % COLS) * cs;
				const sy = Math.floor(sc / COLS) * cs;
				ctx.strokeStyle = 'rgba(75, 190, 75, 0.8)';
				ctx.lineWidth = cs * 0.15;
				ctx.strokeRect(sx + cs * 0.1, sy + cs * 0.1, cs * 0.8, cs * 0.8);
			}
		}
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const mx = (e.clientX - rect.left) * scaleX;
		const my = (e.clientY - rect.top) * scaleY;
		const cs = canvas.width / COLS;
		const clickX = Math.floor(mx / cs);
		const clickY = Math.floor(my / cs);
		
		if (clickX < 0 || clickX >= COLS || clickY < 0 || clickY >= ROWS) return;
		
		const cellIdx = clickY * COLS + clickX;
		
		// If game not started, check if click on start cell
		if (!gameStarted && !crashed && !gameWon) {
			if (startCells.includes(cellIdx)) {
				clickStart(cellIdx);
			}
			return;
		}
		
		// If game started, check if click on a valid target
		if (gameStarted && !crashed && !gameWon) {
			const targets = getTargets();
			for (const t of targets) {
				if (t.x === clickX && t.y === clickY) {
					move(t.ax, t.ay);
					return;
				}
			}
		}
	}

	function resizeCanvas() {
		if (!canvas) return;
		const parent = canvas.parentElement;
		if (!parent) return;
		const dim = Math.min(parent.clientWidth, parent.clientHeight);
		canvas.width = dim * 2; // 2x for retina
		canvas.height = dim * 2;
		canvas.style.width = dim + 'px';
		canvas.style.height = dim + 'px';
		requestAnimationFrame(draw);
	}

	$effect(() => {
		generateTrack();
		requestAnimationFrame(() => {
			resizeCanvas();
		});
		
		const handleResize = () => resizeCanvas();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open()
		});
	});

	// Reactivity: redraw on state changes
	$effect(() => {
		// Touch these reactive values to trigger redraws
		posX; posY; velX; velY; trail; gameStarted; crashed; gameWon;
		requestAnimationFrame(draw);
	});

	let speed = $derived(Math.sqrt(velX * velX + velY * velY).toFixed(1));
</script>

<div class="game-container">
	<Instructions bind:this={instructions} gameId="vectorracing" title="Vector Racing">
		<p><strong>Goal:</strong> Race from START to FINISH in as few turns as possible.</p>
		<p>Each turn, you adjust your velocity by ±1 in both X and Y directions. Your car moves by its current velocity plus your chosen acceleration.</p>
		<p>Click a green START cell to begin, then click one of the highlighted target positions each turn. Plan your speed carefully — if you cross off the track, you crash!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">TURN</span>
				<span class="value">{turn}</span>
			</div>
			<div class="stat">
				<span class="label">SPEED</span>
				<span class="value speed-val">{speed}</span>
			</div>
			<div class="stat">
				<span class="label">VELOCITY</span>
				<span class="value vel-val">({velX}, {velY})</span>
			</div>
		</div>

		<div class="canvas-wrapper">
			<canvas 
				bind:this={canvas}
				onclick={handleCanvasClick}
			></canvas>
			
			{#if !gameStarted && !crashed && !gameWon}
				<div class="hint-overlay" in:fade>
					<span class="hint-text">CLICK A GREEN START CELL</span>
				</div>
			{/if}
			
			{#if crashed}
				<div class="overlay" in:fade>
					<h2>CRASHED!</h2>
					<p class="overlay-sub">You went off track on turn {turn}</p>
				</div>
			{/if}
			
			{#if gameWon}
				<div class="overlay win" in:fade>
					<h2>FINISH!</h2>
					<p class="overlay-sub">Completed in {turn} turns</p>
				</div>
			{/if}
		</div>
	</div>
	<div class="bottom-bar">
		{#if crashed || gameWon}
			<GameOverMenu onPlayAgain={reset} onMenu={onBack} delay={0} />
		{/if}
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: white; align-items: center; }
	.board-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; width: 100%; padding: 1vmin 4vmin; box-sizing: border-box; overflow: hidden; }
	
	.game-stats { display: flex; justify-content: center; gap: 5vmin; margin-bottom: 1.5vmin; width: 100%; }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat .label { font-size: 1.2vmin; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 0.2vmin; text-transform: uppercase; }
	.stat .value { font-size: 4vmin; font-weight: 900; color: #38bdf8; }
	.stat .value.speed-val { color: #f8fafc; }
	.stat .value.vel-val { font-size: 2.5vmin; color: #94a3b8; font-family: 'Outfit', monospace; }
	
	.canvas-wrapper { 
		position: relative; 
		width: 78vmin; 
		height: 78vmin; 
		max-width: 100%; 
		max-height: 100%;
		border-radius: 2vmin; 
		overflow: hidden;
		border: 1px solid rgba(56, 189, 248, 0.3);
		background: #0f172a;
		box-shadow: 0 0 20vmin rgba(56, 189, 248, 0.05);
	}
	
	canvas { 
		display: block; 
		cursor: crosshair; 
	}
	
	.hint-overlay {
		position: absolute;
		bottom: 3vmin;
		left: 50%;
		transform: translateX(-50%);
		pointer-events: none;
	}
	
	.hint-text {
		background: rgba(75, 190, 75, 0.15);
		border: 1px solid rgba(75, 190, 75, 0.3);
		color: rgba(75, 190, 75, 0.9);
		padding: 1vmin 2.5vmin;
		border-radius: 1vmin;
		font-size: 1.8vmin;
		font-weight: 800;
		letter-spacing: 0.15vmin;
		animation: pulse-hint 2s ease-in-out infinite;
	}
	
	@keyframes pulse-hint {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 1; }
	}
	
	.overlay { 
		position: absolute; inset: 0; 
		background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); 
		display: flex; flex-direction: column; justify-content: center; align-items: center; 
		z-index: 10; border-radius: 2vmin; 
	}
	.overlay h2 { 
		color: #ef4444; font-size: 7vmin; margin: 0; font-weight: 900; letter-spacing: -0.1vmin; 
	}
	.overlay.win h2 { color: #fbbf24; }
	.overlay-sub { 
		color: rgba(255,255,255,0.5); font-size: 2.5vmin; margin-top: 1vmin; font-weight: 600; 
	}
	
	.bottom-bar { height: 10vmin; display: flex; justify-content: center; align-items: center; width: 100%; }
</style>
