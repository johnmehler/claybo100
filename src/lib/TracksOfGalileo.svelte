<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Instructions from './Instructions.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	// Layout constants
	const START_X = 80;
	const START_Y = 150;
	const END_X = 920;
	const END_Y = 530;
	const NUM_NODES = 11;
	const MAX_HEIGHT_DIFF = 150; // max vertical change between adjacent nodes (~60° max slope)

	// Game states
	let points = $state(
		Array.from({ length: NUM_NODES }, (_, i) => ({
			x: START_X + (END_X - START_X) * i / (NUM_NODES - 1),
			y: i === 0 ? START_Y : (i === NUM_NODES - 1 ? END_Y : START_Y + (END_Y - START_Y) * i / (NUM_NODES - 1))
		}))
	);
	const g = 980; // pixels per second squared

	let isSimulating = $state(false);
	let hasRun = $state(false);
	let simTime = $state(0);
	let lastRunTime = $state<number | null>(null);
	let previousTime = $state<number | null>(null);
	let ballPos = $state({ x: START_X, y: START_Y });
	let carAngle = $state(0); // degrees, track slope angle

	let showOptimal = $state(false);
	let optimalPoints = $state<{x: number, y: number}[]>([]);

	let draggingIndex = $state(-1);

	// Cycloid math
	function findCycloidTheta(xf: number, yf: number) {
		let ratio = yf / xf;
		let low = 0.0001;
		let high = 2 * Math.PI - 0.0001;
		let mid = 0;
		for (let i = 0; i < 50; i++) {
			mid = (low + high) / 2;
			let val = (1 - Math.cos(mid)) / (mid - Math.sin(mid));
			if (val > ratio) low = mid;
			else high = mid;
		}
		return mid;
	}

	function calculateOptimal() {
		// Build node x-positions matching the player's nodes
		const nodeXs = Array.from({ length: NUM_NODES }, (_, i) =>
			START_X + (END_X - START_X) * i / (NUM_NODES - 1)
		);

		// Seed with unconstrained cycloid y-values, then clamp to constraints
		const dx = END_X - START_X;
		const dy = END_Y - START_Y;
		const theta_f = findCycloidTheta(dx, dy);
		const R = dx / (theta_f - Math.sin(theta_f));

		let nodeYs = nodeXs.map((x, i) => {
			if (i === 0) return START_Y;
			if (i === NUM_NODES - 1) return END_Y;
			// Sample cycloid at this x
			let bestT = 0;
			for (let s = 0; s <= 1000; s++) {
				let t = (s / 1000) * theta_f;
				let cx = START_X + R * (t - Math.sin(t));
				if (cx >= x) { bestT = t; break; }
			}
			return Math.min(570, Math.max(START_Y, START_Y + R * (1 - Math.cos(bestT))));
		});

		// Enforce MAX_HEIGHT_DIFF constraints on initial seed (forward + backward pass)
		for (let i = 1; i < NUM_NODES; i++) {
			nodeYs[i] = Math.max(nodeYs[i], nodeYs[i-1] - MAX_HEIGHT_DIFF);
			nodeYs[i] = Math.min(nodeYs[i], nodeYs[i-1] + MAX_HEIGHT_DIFF);
		}
		for (let i = NUM_NODES - 2; i >= 0; i--) {
			nodeYs[i] = Math.max(nodeYs[i], nodeYs[i+1] - MAX_HEIGHT_DIFF);
			nodeYs[i] = Math.min(nodeYs[i], nodeYs[i+1] + MAX_HEIGHT_DIFF);
		}

		// Iterative coordinate descent: sweep each free node's Y to minimize time
		const STEPS = 40; // Y discretization per node
		const PASSES = 20;
		for (let pass = 0; pass < PASSES; pass++) {
			for (let i = 1; i < NUM_NODES - 1; i++) {
				let lo = Math.max(START_Y, nodeYs[i-1] - MAX_HEIGHT_DIFF, nodeYs[i+1] - MAX_HEIGHT_DIFF);
				let hi = Math.min(570, nodeYs[i-1] + MAX_HEIGHT_DIFF, nodeYs[i+1] + MAX_HEIGHT_DIFF);
				if (lo > hi) continue;

				let bestY = nodeYs[i];
				let bestTime = Infinity;
				for (let s = 0; s <= STEPS; s++) {
					let tryY = lo + (hi - lo) * s / STEPS;
					nodeYs[i] = tryY;
					let ctrlPts = nodeXs.map((x, j) => ({ x, y: nodeYs[j] }));
					let smooth = getSmoothPoints(ctrlPts);
					let time = calculateTime(smooth);
					if (time < bestTime) {
						bestTime = time;
						bestY = tryY;
					}
				}
				nodeYs[i] = bestY;
			}
		}

		// Generate the final smooth optimal path
		let ctrlPts = nodeXs.map((x, i) => ({ x, y: nodeYs[i] }));
		optimalPoints = getSmoothPoints(ctrlPts);
	}

	function calculateTime(pts: {x: number, y: number}[]) {
		let t = 0;
		for (let i = 0; i < pts.length - 1; i++) {
			let p1 = pts[i];
			let p2 = pts[i+1];
			let dist = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
			let drop1 = Math.max(0, p1.y - START_Y);
			let drop2 = Math.max(0, p2.y - START_Y);
			let v1 = Math.sqrt(2 * g * drop1);
			let v2 = Math.sqrt(2 * g * drop2);
			if (v1 + v2 === 0) return Infinity;
			t += 2 * dist / (v1 + v2);
		}
		return t;
	}

	function getCatmullRomPoint(p0: any, p1: any, p2: any, p3: any, t: number) {
		const t2 = t * t;
		const t3 = t2 * t;
		return {
			x: 0.5 * (
				(2 * p1.x) +
				(-p0.x + p2.x) * t +
				(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
				(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
			),
			y: 0.5 * (
				(2 * p1.y) +
				(-p0.y + p2.y) * t +
				(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
				(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
			)
		};
	}

	function getSmoothPoints(ctrlPts: {x: number, y: number}[]) {
		if (ctrlPts.length < 2) return ctrlPts;
		const pts = [];
		const n = ctrlPts.length;
		
		// Add virtual points for boundaries
		const pStart = { x: ctrlPts[0].x - (ctrlPts[1].x - ctrlPts[0].x), y: ctrlPts[0].y };
		const pEnd = { x: ctrlPts[n-1].x + (ctrlPts[n-1].x - ctrlPts[n-2].x), y: ctrlPts[n-1].y };
		
		const fullPts = [pStart, ...ctrlPts, pEnd];
		
		for (let i = 1; i < fullPts.length - 2; i++) {
			for (let t = 0; t <= 1; t += 0.1) {
				if (i > 1 && t === 0) continue; // Skip duplicate points
				pts.push(getCatmullRomPoint(fullPts[i-1], fullPts[i], fullPts[i+1], fullPts[i+2], t));
			}
		}
		return pts;
	}

	let smoothPoints = $derived(getSmoothPoints(points));
	let optimalTime = $derived(optimalPoints.length > 0 ? calculateTime(optimalPoints) : 0);
	let currentTime = $derived(calculateTime(smoothPoints));

	// Keep car angle aligned with track when not simulating
	$effect(() => {
		if (!isSimulating && smoothPoints.length >= 2) {
			let dx = smoothPoints[1].x - smoothPoints[0].x;
			let dy = smoothPoints[1].y - smoothPoints[0].y;
			carAngle = Math.atan2(dy, dx) * 180 / Math.PI;
		}
	});

	function handlePointerDown(e: PointerEvent, i: number) {
		if (i === 0 || i === points.length - 1 || isSimulating) return;
		draggingIndex = i;
		(e.target as Element).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (draggingIndex === -1) return;
		let svg = e.currentTarget as SVGSVGElement;
		let pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		let svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
		
		let newY = Math.max(START_Y, Math.min(570, svgP.y));

		// Clamp based on neighbor heights
		const prev = points[draggingIndex - 1];
		const next = points[draggingIndex + 1];
		if (prev) newY = Math.max(newY, prev.y - MAX_HEIGHT_DIFF);
		if (prev) newY = Math.min(newY, prev.y + MAX_HEIGHT_DIFF);
		if (next) newY = Math.max(newY, next.y - MAX_HEIGHT_DIFF);
		if (next) newY = Math.min(newY, next.y + MAX_HEIGHT_DIFF);

		// Re-clamp to canvas bounds
		newY = Math.max(START_Y, Math.min(570, newY));

		points[draggingIndex].y = newY;
		points = [...points]; // Trigger reactivity
		if (hasRun) {
			previousTime = lastRunTime;
			hasRun = false;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (draggingIndex !== -1) {
			(e.target as Element).releasePointerCapture(e.pointerId);
			draggingIndex = -1;
		}
	}

	let animationFrame: number;
	let startTime = 0;

	function runSimulation() {
		if (isSimulating) return;
		isSimulating = true;
		hasRun = false;
		simTime = 0;
		ballPos = { x: smoothPoints[0].x, y: smoothPoints[0].y };
		// Set initial angle from first segment
		if (smoothPoints.length >= 2) {
			let dx0 = smoothPoints[1].x - smoothPoints[0].x;
			let dy0 = smoothPoints[1].y - smoothPoints[0].y;
			carAngle = Math.atan2(dy0, dx0) * 180 / Math.PI;
		}
		
		let segments = [];
		for (let i = 0; i < smoothPoints.length - 1; i++) {
			segments.push({ p1: smoothPoints[i], p2: smoothPoints[i+1] });
		}

		startTime = performance.now();
		
		function animate(now: number) {
			let t = (now - startTime) / 1000;
			simTime = t;
			
			let t_accum = 0;
			let currentPos = ballPos;
			let completed = false;
			
			for (let seg of segments) {
				let dx = seg.p2.x - seg.p1.x;
				let dy = seg.p2.y - seg.p1.y;
				let dist = Math.sqrt(dx*dx + dy*dy);
				let drop1 = Math.max(0, seg.p1.y - START_Y);
				let drop2 = Math.max(0, seg.p2.y - START_Y);
				let v1 = Math.sqrt(2 * g * drop1);
				let v2 = Math.sqrt(2 * g * drop2);
				
				if (v1 + v2 === 0) {
					// stuck
					completed = true;
					currentPos = { x: seg.p1.x, y: seg.p1.y };
					break;
				}
				
				let t_seg = 2 * dist / (v1 + v2);
				
				if (t <= t_accum + t_seg) {
					let dt = t - t_accum;
					let a = (v2 - v1) / t_seg;
					let s = v1 * dt + 0.5 * a * dt * dt;
					let fraction = s / dist;
					currentPos = {
						x: seg.p1.x + fraction * dx,
						y: seg.p1.y + fraction * dy
					};
					carAngle = Math.atan2(dy, dx) * 180 / Math.PI;
					completed = false;
					break;
				}
				t_accum += t_seg;
				currentPos = { x: seg.p2.x, y: seg.p2.y };
				completed = true;
			}
			
			ballPos = currentPos;
			
			if (!completed) {
				animationFrame = requestAnimationFrame(animate);
			} else {
				isSimulating = false;
				hasRun = true;
				simTime = t_accum;
				lastRunTime = t_accum;
			}
		}
		animationFrame = requestAnimationFrame(animate);
	}

	function stopSimulation() {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		isSimulating = false;
		ballPos = { x: points[0].x, y: points[0].y };
		simTime = 0;
	}

	function reset() {
		stopSimulation();
		points = points.map((p, i) => ({
			...p,
			y: i === 0 ? START_Y : (i === points.length - 1 ? END_Y : START_Y + (END_Y - START_Y) * i / (points.length - 1))
		}));
		showOptimal = false;
		hasRun = false;
	}

	onMount(() => {
		calculateOptimal();
		return () => {
			if (animationFrame) cancelAnimationFrame(animationFrame);
		};
	});

	$effect(() => {
		registerActions({
			restart: reset,
			help: () => instructions?.open()
		});
	});
</script>

<div class="game-container" in:fade>
	<Instructions bind:this={instructions} gameId="tracksofgalileo" title="Tracks of Galileo">
		<p><strong>Goal:</strong> Find the curve of fastest descent (Brachistochrone).</p>
		<p>Drag the control points vertically to adjust the track. When ready, click Simulate to time how long the ball takes to roll to the end!</p>
	</Instructions>

	<div class="header-stats">
		<div class="stat-box">
			<span class="label">CURRENT</span>
			<span class="value">{isSimulating ? simTime.toFixed(3) + 's' : (hasRun ? (lastRunTime === null || lastRunTime === Infinity ? '∞' : lastRunTime.toFixed(3) + 's') : '---')}</span>
		</div>
		<div class="stat-box previous">
			<span class="label">PREVIOUS</span>
			<span class="value">{previousTime !== null ? (previousTime === Infinity ? '∞' : previousTime.toFixed(3) + 's') : '---'}</span>
		</div>
		{#if showOptimal}
			<div class="stat-box optimal">
				<span class="label">OPTIMAL (CONSTRAINED)</span>
				<span class="value">{optimalTime.toFixed(3)}s</span>
			</div>
		{/if}
	</div>

	<div class="board-wrapper">
		<div class="canvas-container">
			<svg viewBox="0 0 1000 600" onpointermove={handlePointerMove} onpointerup={handlePointerUp} onpointerleave={handlePointerUp}>
				{#each Array(11) as _, i}
					<line x1={0} y1={i * 60} x2={1000} y2={i * 60} class="grid-line" />
					<line x1={i * 100} y1={0} x2={i * 100} y2={600} class="grid-line" />
				{/each}

				<!-- Control Points & Support Bars (Bottom Layer) -->
				{#each points as pt, i}
					<g transform="translate({pt.x},{pt.y})">
						{#if i > 0 && i < points.length - 1}
							<!-- Vertical support bar -->
							<line x1={0} y1={0} x2={0} y2={-40} class="support-bar" />
							
							<line x1={0} y1={0} x2={0} y2={550 - pt.y} class="guide-line" />
							<text y="28" class="height-label" text-anchor="middle">H: {Math.round(END_Y - pt.y)}</text>
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<circle 
								cx={0} 
								cy={0} 
								r={12} 
								class="control-point {draggingIndex === i ? 'dragging' : ''}" 
								onpointerdown={(e) => handlePointerDown(e, i)} 
							/>
						{/if}
					</g>
				{/each}

				<!-- Start/End Supports -->
				<line x1={START_X} y1={START_Y} x2={START_X} y2={START_Y - 40} class="support-bar" />
				<line x1={END_X} y1={END_Y} x2={END_X} y2={END_Y - 40} class="support-bar" />

				<circle cx={START_X} cy={START_Y} r={8} class="marker start" />
				<circle cx={END_X} cy={END_Y} r={8} class="marker end" />
				<text x={START_X} y={START_Y + 25} class="height-label" text-anchor="middle">H: {END_Y - START_Y}</text>
				<text x={END_X} y={END_Y + 25} class="height-label" text-anchor="middle">H: 0</text>
				<text x={START_X} y={START_Y + 42} class="label-text" text-anchor="middle">START</text>
				<text x={END_X} y={END_Y + 40} class="label-text" text-anchor="middle">END</text>

				<!-- Curves (Middle Layer) -->
				{#if showOptimal && optimalPoints.length > 0}
					<polyline 
						points={optimalPoints.map(p => `${p.x},${p.y - 40}`).join(' ')} 
						class="optimal-path" 
					/>
				{/if}

				<polyline 
					points={smoothPoints.map(p => `${p.x},${p.y - 40}`).join(' ')} 
					class="user-path" 
				/>

				<!-- Racecar (Top Layer) -->
				<g transform="translate({ballPos.x}, {ballPos.y - 40}) rotate({carAngle})">
					<g class="racecar">
						<!-- Wheels sit on the track (y=0 is the track surface) -->
						<circle cx="-14" cy="-5" r="5" class="car-wheel" />
						<circle cx="14" cy="-5" r="5" class="car-wheel" />
						<!-- Undercarriage -->
						<rect x="-20" y="-12" width="40" height="5" rx="2" class="car-body" />
						<!-- Body -->
						<path d="M-20,-12 L-18,-20 L8,-20 L20,-12 Z" class="car-body" />
						<!-- Cabin -->
						<rect x="-12" y="-26" width="16" height="7" rx="2" class="car-cabin" />
						<!-- Rear spoiler -->
						<line x1="-20" y1="-20" x2="-24" y2="-26" class="car-spoiler" />
						<line x1="-24" y1="-26" x2="-16" y2="-26" class="car-spoiler" />
					</g>
				</g>
			</svg>
		</div>
	</div>

	<div class="bottom-bar">
		<div class="controls-row">
			<button class="action-btn restart" onclick={runSimulation} disabled={isSimulating}>
				{isSimulating ? 'SIMULATING...' : 'SIMULATE'}
			</button>
			<button class="action-btn menu" onclick={stopSimulation} disabled={!isSimulating && ballPos.x === points[0].x}>
				RESET
			</button>
			<button class="action-btn menu" onclick={() => showOptimal = !showOptimal}>
				{showOptimal ? 'HIDE OPTIMAL' : 'SHOW OPTIMAL'}
			</button>
		</div>
		<button class="action-btn menu exit-btn" onclick={onBack}>MAIN MENU</button>
	</div>
</div>

<style>
	.game-container { display: flex; flex-direction: column; width: 100%; height: 100%; color: var(--game-text-primary); align-items: center; }
	.header-stats { display: flex; justify-content: center; gap: 8vmin; padding: 2vmin; width: 100%; }
	
	.stat-box { display: flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.05); padding: 1.5vmin 3vmin; border-radius: 1.5vmin; border: 1px solid rgba(255,255,255,0.1); min-width: 25vmin; }
	.stat-box .label { font-size: 1.2vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.2vmin; margin-bottom: 0.5vmin; }
	.stat-box .value { font-size: 3vmin; font-weight: 900; font-variant-numeric: tabular-nums; }
	.stat-box.optimal .value { color: var(--app-text); }
	.stat-box.previous .value { color: var(--game-text-muted); }

	.board-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; padding: 0 4vmin; box-sizing: border-box; }
	
	.canvas-container { 
		width: 100%; max-width: 100vmin; aspect-ratio: 10 / 6; 
		background: rgba(0, 0, 0, 0.3); border-radius: 2vmin; 
		border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
		overflow: hidden; 
	}

	svg { width: 100%; height: 100%; display: block; touch-action: none; }

	.grid-line { stroke: rgba(255, 255, 255, 0.05); stroke-width: 1; }

	.user-path { fill: none; stroke: white; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 12px rgba(255,255,255,0.6)); transition: stroke 0.3s; }
	.optimal-path { fill: none; stroke: var(--app-text); stroke-width: 3; stroke-dasharray: 8 8; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5)); }
	.guide-line { stroke: rgba(255, 255, 255, 0.1); stroke-width: 2; stroke-dasharray: 4 4; }

	.control-point { fill: #111; stroke: white; stroke-width: 3; cursor: grab; transition: stroke 0.2s, r 0.2s; }
	.control-point:hover { stroke: var(--color-bittersweet); r: 15; }
	.control-point.dragging { cursor: grabbing; stroke: var(--color-bittersweet); r: 18; fill: var(--color-bittersweet); filter: drop-shadow(0 0 10px var(--color-bittersweet)); }

	.marker { fill: transparent; stroke-width: 4; }
	.marker.start { stroke: var(--color-apple); }
	.marker.end { stroke: var(--color-bittersweet); }

	.label-text { fill: var(--game-text-muted); font-size: 16px; font-weight: 800; letter-spacing: 1px; }
	.ball { fill: var(--color-bittersweet); filter: drop-shadow(0 0 15px var(--color-bittersweet)); }

	.bottom-bar { 
		height: 12vmin; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1.5vmin; width: 100%; 
		background: linear-gradient(to top, rgba(0,0,0,0.2), transparent); padding-bottom: 2vmin;
	}
	
	.controls-row { display: flex; gap: 2vmin; }

	.action-btn { padding: 1.2vmin 3vmin; border-radius: 1.2vmin; font-size: 1.6vmin; font-weight: 900; cursor: pointer; transition: all 0.3s; letter-spacing: 0.1vmin; border: none; }
	.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	
	.action-btn.restart { background: var(--color-bittersweet); color: black; box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.3); }
	.action-btn.restart:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 15px 25px -5px rgba(255, 110, 97, 0.4); }
	
	.action-btn.menu { background: rgba(255,255,255,0.05); color: var(--game-text-primary); border: 1px solid rgba(255,255,255,0.1); }
	.action-btn.menu:not(:disabled):hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

	.exit-btn { font-size: 1.4vmin; padding: 1vmin 3vmin; opacity: 0.8; }

	.support-bar {
		stroke: rgba(255, 255, 255, 0.4);
		stroke-width: 2;
	}

	.racecar {
		color: var(--color-bittersweet);
		filter: drop-shadow(0 0 10px rgba(255, 110, 97, 0.5));
	}

	.car-body {
		fill: currentColor;
	}

	.car-cabin {
		fill: rgba(255, 255, 255, 0.2);
		stroke: white;
		stroke-width: 1;
	}

	.car-wheel {
		fill: #111;
		stroke: white;
		stroke-width: 2;
	}

	.car-spoiler {
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.height-label {
		fill: var(--color-bittersweet);
		font-size: 12px;
		font-weight: bold;
		pointer-events: none;
		text-shadow: 0 0 5px rgba(0,0,0,0.5);
	}
</style>
