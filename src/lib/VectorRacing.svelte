<script lang="ts">
	import { fade } from "svelte/transition";
	import Instructions from "./Instructions.svelte";
	import GameOverMenu from "./GameOverMenu.svelte";
	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
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
	let trail = $state<{ x: number; y: number }[]>([]);
	let gameStarted = $state(false);
	let gameWon = $state(false);
	let crashed = $state(false);
	let trackType = $state<"standard" | "random">("standard");
	let optimalMoves = $state<number | null>(null);
	let optimalPath = $state<{ x: number; y: number }[]>([]);
	let showOptimalPath = $state(false);


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
				const dist = Math.sqrt(dx * 0.75 * (dx * 0.75) + dy * dy);

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
		updateOptimalMoves();
	}

	function generateRandomTrack() {
		const t = Array(COLS * ROWS).fill(0);
		const startCellsList: number[] = [];
		const finishCellsList: number[] = [];

		// Generate a wavy path from left to right
		const numPoints = 6;
		const points: { x: number; y: number }[] = [];

		// Start point (left side)
		points.push({
			x: 4,
			y: Math.floor(ROWS * (0.2 + Math.random() * 0.6)),
		});

		// Middle waypoints
		for (let i = 1; i < numPoints - 1; i++) {
			points.push({
				x: Math.floor((COLS * i) / (numPoints - 1)),
				y: Math.floor(ROWS * (0.15 + Math.random() * 0.7)),
			});
		}

		// End point (right side)
		points.push({
			x: COLS - 4,
			y: Math.floor(ROWS * (0.2 + Math.random() * 0.6)),
		});

		// Draw track by filling cells near the segments
		const trackWidth = 3.5 + Math.random() * 1.5;

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				let minDistSq = Infinity;
				for (let i = 0; i < points.length - 1; i++) {
					const p1 = points[i];
					const p2 = points[i + 1];

					// Distance from point (x,y) to line segment p1-p2
					const dx = p2.x - p1.x;
					const dy = p2.y - p1.y;
					const l2 = dx * dx + dy * dy;
					let t_param = ((x - p1.x) * dx + (y - p1.y) * dy) / l2;
					t_param = Math.max(0, Math.min(1, t_param));

					const px = p1.x + t_param * dx;
					const py = p1.y + t_param * dy;

					const distSq = (x - px) * (x - px) + (y - py) * (y - py);
					if (distSq < minDistSq) minDistSq = distSq;
				}

				if (minDistSq < trackWidth * trackWidth) {
					t[y * COLS + x] = 1;
				}
			}
		}

		// Place start/finish lines
		// Start line at points[0].x
		const startX = points[0].x;
		for (let y = 0; y < ROWS; y++) {
			if (t[y * COLS + startX] === 1) {
				t[y * COLS + startX] = 2;
				startCellsList.push(y * COLS + startX);
			}
		}

		// Finish line at points[last].x
		const finishX = points[points.length - 1].x;
		for (let y = 0; y < ROWS; y++) {
			if (t[y * COLS + finishX] === 1) {
				t[y * COLS + finishX] = 3;
				finishCellsList.push(y * COLS + finishX);
			}
		}

		track = t;
		startCells = startCellsList;
		finishCells = finishCellsList;
		optimalPath = [];
		updateOptimalMoves();
	}

	function solveOptimalMoves(): { x: number; y: number }[] | null {
		if (startCells.length === 0 || finishCells.length === 0) return null;

		const V_OFFSET = 10;
		const V_RANGE = 21;
		const visited = new Uint8Array(COLS * ROWS * V_RANGE * V_RANGE);

		const queue: {
			x: number;
			y: number;
			vx: number;
			vy: number;
			m: number;
			parent: number | null;
		}[] = [];

		for (const sc of startCells) {
			const sx = sc % COLS;
			const sy = Math.floor(sc / COLS);
			queue.push({ x: sx, y: sy, vx: 0, vy: 0, m: 0, parent: null });
			const idx =
				((sy * COLS + sx) * V_RANGE + V_OFFSET) * V_RANGE + V_OFFSET;
			visited[idx] = 1;
		}

		let head = 0;
		while (head < queue.length) {
			const currentIdx = head;
			const { x, y, vx, vy, m } = queue[head++];

			if (m >= 100) continue;

			for (const ax of accChoices) {
				for (const ay of accChoices) {
					const nvx = vx + ax;
					const nvy = vy + ay;

					if (nvx === 0 && nvy === 0 && m > 0) continue;
					if (Math.abs(nvx) > 10 || Math.abs(nvy) > 10) continue;

					const nx = x + nvx;
					const ny = y + nvy;

					const path = checkPath(x, y, nx, ny);
					if (path.clear) {
						if (path.won) {
							// Reconstruct path
							let pIdx: number | null = currentIdx;
							const pathNodes: { x: number; y: number }[] = [
								{ x: path.cx, y: path.cy },
							];
							while (pIdx !== null) {
								pathNodes.unshift({
									x: queue[pIdx].x,
									y: queue[pIdx].y,
								});
								pIdx = queue[pIdx].parent;
							}
							return pathNodes;
						}

						const idx =
							((path.cy * COLS + path.cx) * V_RANGE +
								(nvx + V_OFFSET)) *
								V_RANGE +
								(nvy + V_OFFSET);

						if (!visited[idx]) {
							visited[idx] = 1;
							queue.push({
								x: path.cx,
								y: path.cy,
								vx: nvx,
								vy: nvy,
								m: m + 1,
								parent: currentIdx,
							});
						}
					}
				}
			}
		}

		return null;
	}

	function updateOptimalMoves() {
		setTimeout(() => {
			const path = solveOptimalMoves();
			optimalPath = path || [];
			optimalMoves = path ? path.length - 1 : null;
		}, 0);
	}

	function reset() {
		if (trackType === "random") {
			generateRandomTrack();
		} else {
			generateTrack();
		}

		gameStarted = false;
		gameWon = false;
		crashed = false;
		showOptimalPath = false;
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
		let ix = x0;
		let iy = y0;

		const dx = x1 - x0;
		const dy = y1 - y0;

		const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
		const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

		const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
		const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);

		let tMaxX =
			dx === 0
				? Infinity
				: (stepX > 0 ? ix + 1 - (x0 + 0.5) : x0 + 0.5 - ix) * tDeltaX;
		let tMaxY =
			dy === 0
				? Infinity
				: (stepY > 0 ? iy + 1 - (y0 + 0.5) : y0 + 0.5 - iy) * tDeltaY;

		while (true) {
			if (
				ix < 0 ||
				ix >= COLS ||
				iy < 0 ||
				iy >= ROWS ||
				track[iy * COLS + ix] === 0
			) {
				return { clear: false, cx: ix, cy: iy, won: false };
			}

			if (track[iy * COLS + ix] === 3) {
				return { clear: true, cx: ix, cy: iy, won: true };
			}

			if (ix === x1 && iy === y1) break;

			if (tMaxX < tMaxY) {
				tMaxX += tDeltaX;
				ix += stepX;
			} else if (tMaxX > tMaxY) {
				tMaxY += tDeltaY;
				iy += stepY;
			} else {
				// Perfect diagonal - move both
				tMaxX += tDeltaX;
				tMaxY += tDeltaY;
				ix += stepX;
				iy += stepY;
			}

			// Safety to prevent infinite loop
			if (tMaxX > 1.1 && tMaxY > 1.1) break;
		}

		return { clear: true, cx: x1, cy: y1, won: false };
	}

	function getTargets(): {
		x: number;
		y: number;
		ax: number;
		ay: number;
		clear: boolean;
	}[] {
		if (!gameStarted || crashed || gameWon) return [];
		const targets: {
			x: number;
			y: number;
			ax: number;
			ay: number;
			clear: boolean;
		}[] = [];
		for (const ax of accChoices) {
			for (const ay of accChoices) {
				const nx = posX + velX + ax;
				const ny = posY + velY + ay;
				const path = checkPath(posX, posY, nx, ny);
				targets.push({ x: nx, y: ny, ax, ay, clear: path.clear });
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

		if (!gameWon && getTargets().every((t) => !t.clear)) {
			crashed = true;
		}

		requestAnimationFrame(draw);
	}

	function drawOptimalPath(ctx: CanvasRenderingContext2D, cs: number) {
		if (optimalPath.length < 2) return;

		ctx.save();
		ctx.strokeStyle = "rgba(251, 191, 36, 0.7)"; // amber-400
		ctx.lineWidth = cs * 0.25;
		ctx.setLineDash([cs * 0.4, cs * 0.2]);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		ctx.beginPath();
		ctx.moveTo(
			optimalPath[0].x * cs + cs / 2,
			optimalPath[0].y * cs + cs / 2,
		);
		for (let i = 1; i < optimalPath.length; i++) {
			ctx.lineTo(
				optimalPath[i].x * cs + cs / 2,
				optimalPath[i].y * cs + cs / 2,
			);
		}
		ctx.stroke();

		// Draw path points
		ctx.setLineDash([]);
		for (const p of optimalPath) {
			ctx.fillStyle = "#fbbf24";
			ctx.beginPath();
			ctx.arc(p.x * cs + cs / 2, p.y * cs + cs / 2, cs * 0.15, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		const cs = w / COLS;
		cellSize = cs;

		ctx.clearRect(0, 0, w, h);

		// Blueprint background
		ctx.fillStyle = "#0f172a"; // slate-900
		ctx.fillRect(0, 0, w, h);

		// Graph paper grid
		ctx.lineWidth = 1;
		for (let x = 0; x <= COLS; x++) {
			ctx.strokeStyle =
				x % 5 === 0
					? "rgba(56, 189, 248, 0.4)"
					: "rgba(56, 189, 248, 0.15)";
			ctx.beginPath();
			ctx.moveTo(x * cs, 0);
			ctx.lineTo(x * cs, h);
			ctx.stroke();
		}
		for (let y = 0; y <= ROWS; y++) {
			ctx.strokeStyle =
				y % 5 === 0
					? "rgba(56, 189, 248, 0.4)"
					: "rgba(56, 189, 248, 0.15)";
			ctx.beginPath();
			ctx.moveTo(0, y * cs);
			ctx.lineTo(w, y * cs);
			ctx.stroke();
		}

		// Draw track shading
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = track[y * COLS + x];
				if (cell === 0) continue;

				if (cell === 1) {
					ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
				} else if (cell === 2) {
					ctx.fillStyle = "rgba(75, 190, 75, 0.3)";
				} else if (cell === 3) {
					ctx.fillStyle = "rgba(255, 200, 60, 0.3)";
				}
				ctx.fillRect(x * cs, y * cs, cs, cs);
			}
		}

		// Draw Start/Finish lines heavily
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const cell = track[y * COLS + x];
				if (cell === 2) {
					// Start
					ctx.fillStyle = "rgba(75, 190, 75, 0.8)";
					ctx.fillRect(x * cs + cs - 4, y * cs, 4, cs); // thicker line on right edge
				}
				if (cell === 3) {
					// Finish
					ctx.fillStyle = "rgba(255, 200, 60, 0.8)";
					ctx.fillRect(x * cs, y * cs, 4, cs); // thicker line on left edge

					// Draw checkered pattern
					ctx.fillStyle = "rgba(0,0,0,0.6)";
					for (let i = 0; i < 4; i++) {
						ctx.fillRect(
							x * cs,
							y * cs + (i * cs) / 4,
							cs / 2,
							cs / 4,
						);
					}
				}
			}
		}

		// Draw start/finish labels
		if (startCells.length > 0) {
			const sx = (startCells[0] % COLS) * cs;
			const y0 = Math.floor(startCells[0] / COLS) * cs;
			const y1 =
				(Math.floor(startCells[startCells.length - 1] / COLS) + 1) * cs;
			const midY = (y0 + y1) / 2;

			ctx.save();
			// Position START in the wall column (25) to the left of the start cells (26)
			ctx.translate(sx - cs * 0.5, midY);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "rgba(75, 190, 75, 0.8)";
			ctx.font = `bold ${cs * 1.2}px Outfit`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("START", 0, 0);
			ctx.restore();
		}
		if (finishCells.length > 0) {
			const fx = (finishCells[0] % COLS) * cs;
			const y0 = Math.floor(finishCells[0] / COLS) * cs;
			const y1 =
				(Math.floor(finishCells[finishCells.length - 1] / COLS) + 1) *
				cs;
			const midY = (y0 + y1) / 2;

			ctx.save();
			// Position FINISH in the wall column (24) to the right of the finish cells (23)
			ctx.translate(fx + cs * 1.5, midY);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "rgba(255, 200, 60, 0.8)";
			ctx.font = `bold ${cs * 1.2}px Outfit`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("FINISH", 0, 0);
			ctx.restore();
		}


		// Draw trail
		if (trail.length > 1) {
			ctx.strokeStyle = "#f8fafc";
			ctx.lineWidth = cs * 0.3;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(trail[0].x * cs + cs / 2, trail[0].y * cs + cs / 2);
			for (let i = 1; i < trail.length; i++) {
				ctx.lineTo(trail[i].x * cs + cs / 2, trail[i].y * cs + cs / 2);
			}
			ctx.stroke();

			for (let i = 0; i < trail.length; i++) {
				ctx.fillStyle = "#f8fafc";
				ctx.beginPath();
				ctx.arc(
					trail[i].x * cs + cs / 2,
					trail[i].y * cs + cs / 2,
					cs * 0.25,
					0,
					Math.PI * 2,
				);
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
				ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
				ctx.lineWidth = cs * 0.15;
				ctx.setLineDash([cs * 0.2, cs * 0.15]);
				ctx.beginPath();
				ctx.moveTo(cx2, cy2);
				ctx.lineTo(ghostX, ghostY);
				ctx.stroke();
				ctx.setLineDash([]);

				ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
				ctx.beginPath();
				ctx.arc(ghostX, ghostY, cs * 0.4, 0, Math.PI * 2);
				ctx.fill();
			}

			// Draw target positions
			const targets = getTargets();
			for (const t of targets) {
				const tx = t.x * cs + cs / 2;
				const ty = t.y * cs + cs / 2;

				if (t.clear) {
					ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
					ctx.strokeStyle = "#38bdf8";
				} else {
					ctx.fillStyle = "rgba(239, 68, 68, 0.4)"; // red-500
					ctx.strokeStyle = "#ef4444";
				}

				ctx.beginPath();
				ctx.arc(tx, ty, cs * 0.45, 0, Math.PI * 2);
				ctx.fill();

				ctx.lineWidth = cs * 0.15;
				ctx.stroke();
			}
		}

		// Draw current position
		if (gameStarted) {
			const curPx = posX * cs + cs / 2;
			const curPy = posY * cs + cs / 2;

			if (crashed) {
				ctx.fillStyle = "#ef4444";
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#991b1b";
				ctx.lineWidth = cs * 0.15;
				ctx.beginPath();
				ctx.moveTo(curPx - cs * 0.3, curPy - cs * 0.3);
				ctx.lineTo(curPx + cs * 0.3, curPy + cs * 0.3);
				ctx.moveTo(curPx + cs * 0.3, curPy - cs * 0.3);
				ctx.lineTo(curPx - cs * 0.3, curPy + cs * 0.3);
				ctx.stroke();
			} else if (gameWon) {
				ctx.fillStyle = "#fbbf24";
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
				ctx.shadowBlur = cs;
				ctx.fill();
				ctx.shadowBlur = 0;
			} else {
				ctx.fillStyle = "#38bdf8";
				ctx.beginPath();
				ctx.arc(curPx, curPy, cs * 0.4, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
				ctx.shadowBlur = cs;
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}

		// Draw optimal path last so it's always on top
		if (showOptimalPath) {
			drawOptimalPath(ctx, cs);
		}

		// Pre-start: highlight start cells
		if (!gameStarted && !crashed && !gameWon) {
			for (const sc of startCells) {
				const sx = (sc % COLS) * cs;
				const sy = Math.floor(sc / COLS) * cs;
				ctx.strokeStyle = "rgba(75, 190, 75, 0.8)";
				ctx.lineWidth = cs * 0.15;
				ctx.strokeRect(
					sx + cs * 0.1,
					sy + cs * 0.1,
					cs * 0.8,
					cs * 0.8,
				);
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

		if (clickX < 0 || clickX >= COLS || clickY < 0 || clickY >= ROWS)
			return;

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
		canvas.style.width = dim + "px";
		canvas.style.height = dim + "px";
		requestAnimationFrame(draw);
	}

	$effect(() => {
		if (trackType === "random") {
			generateRandomTrack();
		} else {
			generateTrack();
		}
		requestAnimationFrame(() => {
			resizeCanvas();
		});

		const handleResize = () => resizeCanvas();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	});

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions.open(),
		});
	});

	// Reactivity: redraw on state changes
	$effect(() => {
		// Touch these reactive values to trigger redraws
		posX;
		posY;
		velX;
		velY;
		trail;
		gameStarted;
		crashed;
		gameWon;
		showOptimalPath;
		optimalPath;
		requestAnimationFrame(draw);
	});

	let speed = $derived(Math.sqrt(velX * velX + velY * velY).toFixed(1));
</script>

<div class="game-container">
	<Instructions
		bind:this={instructions}
		gameId="vectorracing"
		title="Vector Racing"
	>
		<p>
			<strong>Goal:</strong> Race from START to FINISH in as few turns as possible.
		</p>
		<p>
			Each turn, you adjust your velocity by ±1 in both X and Y
			directions. Your car moves by its current velocity plus your chosen
			acceleration.
		</p>
		<p>
			Click a green START cell to begin, then click one of the highlighted
			target positions each turn. Plan your speed carefully — if you cross
			off the track, you crash!
		</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">STATUS</span>
				<span
					class="value status-val"
					class:won={gameWon}
					class:crashed
				>
					{gameWon ? "FINISH" : crashed ? "CRASHED" : "RACING"}
				</span>
			</div>
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
			<div class="stat">
				<span class="label">TARGET</span>
				<span class="value target-val">{optimalMoves ?? "--"}</span>
			</div>
		</div>

		<div class="canvas-wrapper">
			<canvas bind:this={canvas} onclick={handleCanvasClick}></canvas>

			{#if crashed || gameWon}
				<div class="completion-overlay" transition:fade></div>
			{/if}
		</div>
	</div>
	<div class="bottom-bar">
		<div class="controls-group">
			<button
				class="action-btn"
				onclick={() => {
					trackType = trackType === "random" ? "standard" : "random";
					reset();
				}}
			>
				{trackType === "random" ? "STANDARD TRACK" : "RANDOM TRACK"}
			</button>
			{#if crashed || gameWon}
				<button
					class="action-btn toggle-path-btn"
					class:active={showOptimalPath}
					onclick={() => (showOptimalPath = !showOptimalPath)}
				>
					{showOptimalPath ? "HIDE OPTIMAL" : "SHOW OPTIMAL"}
				</button>
			{/if}
		</div>
		{#if crashed || gameWon}
			<GameOverMenu onPlayAgain={reset} onMenu={onBack} delay={0} />
		{/if}
	</div>
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
		align-items: center;
	}
	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		position: relative;
		width: 100%;
		padding: 1vmin 4vmin;
		box-sizing: border-box;
		overflow: hidden;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		gap: 5vmin;
		margin-bottom: 1.5vmin;
		width: 100%;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.stat .label {
		font-size: 1.2vmin;
		color: rgba(255, 255, 255, 0.3);
		font-weight: 800;
		letter-spacing: 0.2vmin;
		text-transform: uppercase;
	}
	.stat .value {
		font-size: 4vmin;
		font-weight: 900;
		color: #38bdf8;
	}
	.stat .value.status-val {
		font-size: 2.5vmin;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
	}
	.stat .value.status-val.won {
		color: #fbbf24;
		text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
	}
	.stat .value.status-val.crashed {
		color: #ef4444;
		text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
	}
	.stat .value.target-val {
		color: #fbbf24;
	}

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
		z-index: 5;
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
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	.completion-overlay {
		position: absolute;
		top: 0;
		left: -150%;
		width: 150%;
		height: 100%;
		background: linear-gradient(
			to right,
			rgba(255, 255, 255, 0) 0%,
			rgba(200, 200, 200, 0.1) 30%,
			rgba(255, 255, 255, 0.3) 50%,
			rgba(200, 200, 200, 0.1) 70%,
			rgba(255, 255, 255, 0) 100%
		);
		transform: skewX(-25deg);
		animation: swoosh 0.8s ease-in-out forwards;
		pointer-events: none;
		z-index: 20;
	}

	@keyframes swoosh {
		0% {
			left: -150%;
		}
		100% {
			left: 150%;
		}
	}

	.bottom-bar {
		height: 10vmin;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		gap: 1vmin;
	}

	.controls-group {
		display: flex;
		gap: 2vmin;
	}

	.action-btn {
		background: rgba(56, 189, 248, 0.1);
		border: 1px solid rgba(56, 189, 248, 0.3);
		color: #38bdf8;
		padding: 1vmin 3vmin;
		border-radius: 1vmin;
		font-size: 1.6vmin;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.1vmin;
	}

	.action-btn:hover {
		background: rgba(56, 189, 248, 0.2);
		border-color: #38bdf8;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
	}

	.action-btn:active {
		transform: translateY(0);
	}

	.action-btn.toggle-path-btn.active {
		background: rgba(251, 191, 36, 0.15);
		border-color: #fbbf24;
		color: #fbbf24;
	}

	.action-btn.toggle-path-btn.active:hover {
		background: rgba(251, 191, 36, 0.25);
		box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
	}
</style>
