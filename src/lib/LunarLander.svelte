<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import Instructions from './Instructions.svelte';

	let { registerActions } = $props<{ registerActions: any }>();
	let instructions: any;

	// Physics constants
	const GRAVITY = 1.62; // Moon gravity m/s²
	const THRUST_POWER = 5.0;
	const ROTATION_SPEED = 3; // degrees per frame
	const MAX_LANDING_VY = 3.0;
	const MAX_LANDING_VX = 1.5;
	const MAX_LANDING_ANGLE = 15;
	const INITIAL_FUEL = 120;
	const TOTAL_ROUNDS = 5;
	const FUEL_BURN_RATE = 0.3;

	// Game state
	let gameState = $state<'playing' | 'landed' | 'crashed' | 'idle'>('idle');
	let x = $state(50); // % horizontal position
	let y = $state(8); // % vertical from top
	let vx = $state(8); // horizontal velocity
	let vy = $state(0); // vertical velocity
	let angle = $state(0); // spacecraft angle in degrees
	let fuel = $state(INITIAL_FUEL);
	let thrusting = $state(false);
	let rotatingLeft = $state(false);
	let rotatingRight = $state(false);
	let score = $state(0);
	let currentRound = $state(1);
	let sessionComplete = $state(false);
	let sessionSummary = $state<string | null>(null);
	let showResultsPage = $state(false);
	let landingMessage = $state('');
	let altitude = $state(0);
	let speed = $state(0);

	// Terrain
	let terrain = $state<{x: number, y: number}[]>([]);
	let pads = $state<{x: number, y: number, width: number, multiplier: number}[]>([]);
	let stars = $state<{x: number, y: number, size: number, opacity: number}[]>([]);
	let debris = $state<{x: number, y: number, vx: number, vy: number, angle: number, va: number, type: string}[]>([]);
	let optimalPaths = $state<{x: number, y: number}[][]>([]);
	let playerTrail = $state<{x: number, y: number}[]>([]);
	let showOptimal = $state(false);

	let animationId: number | null = null;
	let lastTime = 0;
	let keysDown = new Set<string>();

	function generateTerrain() {
		const points: {x: number, y: number}[] = [];
		const numPoints = 120;
		const baseY = 88;
		const noiseFreqA = 0.2 + Math.random() * 0.35;
		const noiseFreqB = 0.45 + Math.random() * 0.5;
		const noiseAmpA = 1.5 + Math.random() * 3.5;
		const noiseAmpB = 0.8 + Math.random() * 2.8;
		const noisePhaseA = Math.random() * Math.PI * 2;
		const noisePhaseB = Math.random() * Math.PI * 2;

		// 1. Generate base subtle terrain
		for (let i = 0; i <= numPoints; i++) {
			const px = (i / numPoints) * 100;
			const noise =
				Math.sin(i * noiseFreqA + noisePhaseA) * noiseAmpA +
				Math.sin(i * noiseFreqB + noisePhaseB) * noiseAmpB;
			points.push({ x: px, y: baseY + noise });
		}

		// 2. Define specific pad configs
		const sides = Math.random() > 0.5 ? { p3: 'left', p5: 'right' } : { p3: 'right', p5: 'left' };
		const padConfigs = [
			{ 
				multiplier: 1, 
				width: 15, 
				center: 45 + Math.random() * 10, 
				height: 82 + Math.random() * 10,
				style: Math.random() > 0.5 ? 'hill' : 'valley'
			},
			{ 
				multiplier: 3, 
				width: 8, 
				center: sides.p3 === 'left' ? 12 + Math.random() * 12 : 76 + Math.random() * 12, 
				height: 80 + Math.random() * 12,
				style: Math.random() > 0.5 ? 'hill' : 'valley'
			},
			{ 
				multiplier: 5, 
				width: 4, 
				center: sides.p5 === 'left' ? 10 + Math.random() * 10 : 80 + Math.random() * 10, 
				height: 80 + Math.random() * 12,
				style: 'hill' // 5x always has a hill/mountain feel
			}
		];

		const newPads: typeof pads = [];
		
		for (const cfg of padConfigs) {
			const halfW = cfg.width / 2;
			const buffer = 6; // Width of the slope
			const featureWidth = halfW + buffer;
			const depth = cfg.style === 'hill' ? 12 : -10;

			// Sculpt the feature
			for (let p of points) {
				const dist = Math.abs(p.x - cfg.center);
				if (dist <= halfW) {
					// Flat part
					p.y = cfg.height;
				} else if (dist <= featureWidth) {
					// Slope part
					const t = (dist - halfW) / buffer; // 0 to 1
					const slope = (1 - Math.cos(t * Math.PI)) / 2; // Smooth step
					p.y = cfg.height + (slope * depth);
				}
			}

			newPads.push({ 
				x: cfg.center - halfW, 
				y: cfg.height, 
				width: cfg.width, 
				multiplier: cfg.multiplier 
			});
		}

		terrain = points;
		pads = newPads;

		// Stars
		const newStars: typeof stars = [];
		for (let i = 0; i < 80; i++) {
			newStars.push({
				x: Math.random() * 100,
				y: Math.random() * 60,
				size: Math.random() * 0.3 + 0.1,
				opacity: Math.random() * 0.6 + 0.2
			});
		}
		stars = newStars;
		debris = [];
	}

	function getTerrainYAtX(px: number): number {
		if (terrain.length < 2) return 80;
		for (let i = 0; i < terrain.length - 1; i++) {
			if (px >= terrain[i].x && px <= terrain[i + 1].x) {
				const t = (px - terrain[i].x) / (terrain[i + 1].x - terrain[i].x);
				return terrain[i].y + t * (terrain[i + 1].y - terrain[i].y);
			}
		}
		return 80;
	}

	function getLandingPadAt(px: number, py: number): typeof pads[0] | null {
		for (const pad of pads) {
			if (px >= pad.x && px <= pad.x + pad.width && Math.abs(py - pad.y) < 2) {
				return pad;
			}
		}
		return null;
	}

	function startGame() {
		x = 50;
		y = 15;
		vx = (Math.random() - 0.5) * 4;
		vy = 2;
		angle = 0;
		fuel = INITIAL_FUEL;
		thrusting = false;
		gameState = 'playing';
		landingMessage = '';
		sessionSummary = null;
		showResultsPage = false;
		debris = [];
		optimalPaths = [];
		playerTrail = [];
		showOptimal = false;
		lastTime = performance.now();
		animate(lastTime);
	}

	function startSession() {
		if (animationId) cancelAnimationFrame(animationId);
		score = 0;
		currentRound = 1;
		sessionComplete = false;
		sessionSummary = null;
		showResultsPage = false;
		generateTerrain();
		startGame();
	}

	function restart() {
		nextRound();
	}

	function nextRound() {
		if (gameState === 'playing' || sessionComplete || currentRound >= TOTAL_ROUNDS) return;
		if (animationId) cancelAnimationFrame(animationId);
		thrusting = false;
		rotatingLeft = false;
		rotatingRight = false;
		showResultsPage = false;
		currentRound += 1;
		generateTerrain();
		startGame();
	}

	function openFinalScore() {
		if (!sessionComplete) return;
		if (animationId) cancelAnimationFrame(animationId);
		showResultsPage = true;
	}

	function exitToMainMenu() {
		if (animationId) cancelAnimationFrame(animationId);
		void goto('/');
	}

	function animate(now: number) {
		const dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;

		if (gameState === 'crashed') {
			for (const part of debris) {
				part.vx *= 0.99;
				part.vy += GRAVITY * dt;
				part.x += part.vx * dt;
				part.y += part.vy * dt;
				part.angle += part.va * dt;
				
				const groundY = getTerrainYAtX(part.x);
				if (part.y > groundY) {
					part.y = groundY;
					part.vy *= -0.3;
					part.vx *= 0.5;
					part.va *= 0.5;
				}
			}
			animationId = requestAnimationFrame(animate);
			return;
		}

		if (gameState !== 'playing') return;



		// Rotation
		if (rotatingLeft) angle -= ROTATION_SPEED;
		if (rotatingRight) angle += ROTATION_SPEED;
		angle = Math.max(-90, Math.min(90, angle));

		// Thrust
		const isThrusting = thrusting && fuel > 0;
		if (isThrusting) {
			const rad = (angle * Math.PI) / 180;
			vx += Math.sin(rad) * THRUST_POWER * dt;
			vy -= Math.cos(rad) * THRUST_POWER * dt;
			fuel = Math.max(0, fuel - FUEL_BURN_RATE);
		}

		// Gravity
		vy += GRAVITY * dt;

		// Update position
		x += vx * dt;
		y += vy * dt;

		// Wrap horizontally
		if (x < -2) x = 102;
		if (x > 102) x = -2;

		// Altitude & speed
		const terrainY = getTerrainYAtX(x);
		altitude = Math.max(0, terrainY - y - 3);
		speed = Math.sqrt(vx * vx + vy * vy);

		// Record player trail (distance-throttled so we don't spam points)
		const last = playerTrail[playerTrail.length - 1];
		if (!last || Math.hypot(last.x - x, last.y - y) > 0.3) {
			playerTrail = [...playerTrail, { x, y }];
		}

		// Collision detection
		if (y + 3 >= terrainY) {
			y = terrainY - 3;
			const pad = getLandingPadAt(x, terrainY);
			const absAngle = Math.abs(angle);

			if (pad && vy <= MAX_LANDING_VY && Math.abs(vx) <= MAX_LANDING_VX && absAngle <= MAX_LANDING_ANGLE) {
				gameState = 'landed';
				const fuelBonus = Math.round(fuel);
				const baseScore = 50 * pad.multiplier;
				const landScore = baseScore + fuelBonus;
				score += landScore;
				if (vy < 0.5 && Math.abs(vx) < 0.3) {
					landingMessage = `PERFECT LANDING! x${pad.multiplier} +${landScore}`;
				} else {
					landingMessage = `SAFE LANDING x${pad.multiplier} +${landScore}`;
				}
			} else {
				gameState = 'crashed';
				landingMessage = getCrashReason(pad, absAngle);
				
				// Initialize debris
				const numDebris = 8;
				for (let i = 0; i < numDebris; i++) {
					debris.push({
						x: x,
						y: y,
						vx: (Math.random() - 0.5) * 20,
						vy: (Math.random() - 1.0) * 15,
						angle: angle,
						va: (Math.random() - 0.5) * 500,
						type: i % 3 === 0 ? 'body' : i % 3 === 1 ? 'leg' : 'nozzle'
					});
				}
			}
			
			// Calculate optimal paths for all pads
			calculateAllOptimalPaths();

			if (currentRound >= TOTAL_ROUNDS) {
				sessionComplete = true;
				sessionSummary = `5-ROUND TOTAL: ${score}`;
			} else {
				sessionComplete = false;
				sessionSummary = `ROUND ${currentRound}/${TOTAL_ROUNDS} COMPLETE`;
			}

			vx = 0; vy = 0;
			if (gameState === 'landed') {
				if (animationId) cancelAnimationFrame(animationId);
				return;
			}
			animationId = requestAnimationFrame(animate);
			return;
		}

		animationId = requestAnimationFrame(animate);
	}

	function getCrashReason(pad: typeof pads[0] | null, absAngle: number): string {
		if (!pad) return 'CRASHED — Missed the landing pad!';
		if (vy > MAX_LANDING_VY) return `CRASHED — Too fast! (${vy.toFixed(1)} m/s vertical)`;
		if (Math.abs(vx) > MAX_LANDING_VX) return `CRASHED — Too much drift! (${Math.abs(vx).toFixed(1)} m/s horizontal)`;
		if (absAngle > MAX_LANDING_ANGLE) return `CRASHED — Bad angle! (${absAngle.toFixed(0)}°)`;
		return 'CRASHED!';
	}

	function calculateAllOptimalPaths() {
		// Generate one optimal descent curve per landing pad.
		// Uses a simple proportional-navigation approach:
		//   At each timestep, steer the velocity vector toward the target
		//   while decelerating to arrive at near-zero speed.
		const paths: {x: number, y: number}[][] = [];
		const startX = 50, startY = 15;

		for (const pad of pads) {
			const targetX = pad.x + pad.width / 2;
			const targetY = pad.y - 2;
			const path: {x: number, y: number}[] = [];

			// Number of steps to subdivide the descent
			const N = 60;
			for (let i = 0; i <= N; i++) {
				const t = i / N; // 0 to 1
				// Ease-in-out cubic for a smooth, natural-looking curve
				const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
				// Interpolate X with easing
				const px = startX + (targetX - startX) * ease;
				// Y descends linearly but with slight gravity-like acceleration
				const py = startY + (targetY - startY) * (t * t * (3 - 2 * t));
				path.push({ x: px, y: py });
			}
			paths.push(path);
		}
		optimalPaths = paths;
	}

	function handleKeyDown(e: KeyboardEvent) {
		const key = e.key.toLowerCase();

		if (gameState !== 'playing') return;
		
		keysDown.add(e.key);
		if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') thrusting = true;
		if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotatingLeft = true;
		if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotatingRight = true;
		e.preventDefault();
	}

	function handleKeyUp(e: KeyboardEvent) {
		keysDown.delete(e.key);
		if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') thrusting = false;
		if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotatingLeft = false;
		if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotatingRight = false;
	}

	// Touch controls
	function startThrust() { if (gameState === 'playing') thrusting = true; }
	function stopThrust() { thrusting = false; }
	function startRotateLeft() { if (gameState === 'playing') rotatingLeft = true; }
	function stopRotateLeft() { rotatingLeft = false; }
	function startRotateRight() { if (gameState === 'playing') rotatingRight = true; }
	function stopRotateRight() { rotatingRight = false; }

	$effect(() => {
		registerActions({
			restart: restart,
			help: () => instructions.open()
		});
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		startSession();
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		if (animationId) cancelAnimationFrame(animationId);
		keysDown.clear();
		thrusting = false;
		rotatingLeft = false;
		rotatingRight = false;
	});

	// Build terrain SVG path
	let terrainPath = $derived.by(() => {
		if (terrain.length < 2) return '';
		return 'M ' + terrain.map(p => `${p.x} ${p.y}`).join(' L ') + ' L 100 100 L 0 100 Z';
	});

	let fuelPercent = $derived(Math.max(0, Math.min(100, (fuel / INITIAL_FUEL) * 100)));

	// Flame particles
	let flameFlicker = $state(0);
	$effect(() => {
		if (gameState === 'playing') {
			const interval = setInterval(() => flameFlicker = Math.random(), 80);
			return () => clearInterval(interval);
		}
	});
</script>

<div class="lander-container">
	<Instructions bind:this={instructions} gameId="lunarlander" title="Lunar Lander">
		<p><strong>Objective:</strong> Land safely on a landing pad.</p>
		<p><strong>Controls:</strong> Arrow Keys or WAD</p>
	</Instructions>

	<div class="hud">
		<div class="hud-group">
			<div class="hud-item">
				<span class="hud-label">ROUND</span>
				<span class="hud-value">{currentRound}/{TOTAL_ROUNDS}</span>
			</div>
			<div class="hud-item">
				<span class="hud-label">SCORE</span>
				<span class="hud-value score-val">{score}</span>
			</div>
			<div class="hud-item">
				<span class="hud-label">ALTITUDE</span>
				<span class="hud-value">{altitude.toFixed(1)}<small>m</small></span>
			</div>
		</div>
		<div class="hud-group center-hud">
			<div class="hud-item" title="Safe horizontal drift: < {MAX_LANDING_VX} m/s">
				<span class="hud-label">HORIZONTAL</span>
				<span class="hud-value" class:danger={Math.abs(vx) > MAX_LANDING_VX}>{vx.toFixed(1)}<small>m/s</small></span>
				<span class="hud-limit">SAFE: &lt;{MAX_LANDING_VX}</span>
			</div>
			<div class="hud-item" title="Safe vertical speed: < {MAX_LANDING_VY} m/s">
				<span class="hud-label">VERTICAL</span>
				<span class="hud-value" class:danger={vy > MAX_LANDING_VY}>{vy.toFixed(1)}<small>m/s</small></span>
				<span class="hud-limit">SAFE: &lt;{MAX_LANDING_VY}</span>
			</div>
			<div class="hud-item" title="Safe landing angle: < {MAX_LANDING_ANGLE}°">
				<span class="hud-label">ANGLE</span>
				<span class="hud-value" class:danger={Math.abs(angle) > MAX_LANDING_ANGLE}>{angle.toFixed(0)}<small>°</small></span>
				<span class="hud-limit">SAFE: &lt;{MAX_LANDING_ANGLE}°</span>
			</div>
		</div>
		<div class="hud-group">
			<div class="hud-item fuel-item">
				<span class="hud-label">FUEL</span>
				<div class="fuel-bar-bg">
					<div class="fuel-bar" style="width: {fuelPercent}%" class:fuel-low={fuelPercent < 25}></div>
				</div>
				<span class="fuel-pct" class:fuel-low={fuelPercent < 25}>{fuelPercent.toFixed(0)}%</span>
			</div>
		</div>
	</div>

	{#if showResultsPage}
		<div class="results-page" in:fade>
			<div class="results-card">
				<p class="results-kicker">LUNAR LANDER</p>
				<h2 class="results-title">FINAL SCORE</h2>
				<p class="results-score">{score}</p>
				<p class="results-subtitle">5 rounds complete</p>
				<div class="results-actions">
					<button class="action-btn" onclick={startSession}>PLAY 5 MORE</button>
					<button class="action-btn secondary" onclick={exitToMainMenu}>EXIT</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="viewport">
			<svg class="scene" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice">
			<!-- Grid background -->
			<defs>
				<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
					<path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.1"/>
				</pattern>
			</defs>
			<rect width="100" height="100" fill="url(#grid)" />

			<!-- Optimal Trajectory Lines -->
			{#if showOptimal}
				{#if playerTrail.length > 1}
					<path
						d="M {playerTrail.map(p => `${p.x} ${p.y}`).join(' L ')}"
						fill="none"
						stroke="var(--color-bittersweet, #ff6e61)"
						stroke-width="0.35"
						opacity="0.85" />
					<text x="51" y="7" fill="var(--color-bittersweet, #ff6e61)" font-size="1.6" font-weight="800" opacity="0.8">YOUR PATH</text>
				{/if}
				{#each optimalPaths as path, i}
					{#if path.length > 1}
						<path 
							d="M {path.map(p => `${p.x} ${p.y}`).join(' L ')}" 
							fill="none" 
							stroke="var(--color-apple)" 
							stroke-width="0.3"
							stroke-dasharray="1 1"
							opacity="0.7" />
						<circle 
							cx={path[path.length - 1].x} 
							cy={path[path.length - 1].y} 
							r="0.8" fill="none" 
							stroke="var(--color-apple)" 
							stroke-width="0.2" 
							opacity="0.6" />
					{/if}
				{/each}
				<text x="51" y="4" fill="var(--color-apple)" font-size="1.8" font-weight="800" opacity="0.7">OPTIMAL ROUTES</text>
			{/if}

			<!-- Stars -->
			{#each stars as star}
				<circle cx={star.x} cy={star.y} r={star.size} fill="white" opacity={star.opacity} />
			{/each}

			<!-- Terrain -->
			<path d={terrainPath} fill="#1a1a2e" stroke="rgba(255,255,255,0.15)" stroke-width="0.15" />

			<!-- Landing pads -->
			{#each pads as pad}
				<rect x={pad.x} y={pad.y - 0.4} width={pad.width} height="0.5" rx="0.15"
					fill={pad.multiplier >= 5 ? 'var(--color-bittersweet)' : pad.multiplier >= 3 ? 'var(--color-golden)' : 'var(--color-apple)'}
					opacity="0.9" />
				<text x={pad.x + pad.width / 2} y={pad.y + 3} text-anchor="middle"
					fill="rgba(255,255,255,0.5)" font-size="1.8" font-weight="800">x{pad.multiplier}</text>
				<!-- Pad beacon lights -->
				<circle cx={pad.x + 0.3} cy={pad.y - 0.2} r="0.3"
					fill={pad.multiplier >= 5 ? 'var(--color-bittersweet)' : pad.multiplier >= 3 ? 'var(--color-golden)' : 'var(--color-apple)'}
					opacity={0.4 + Math.sin(Date.now() / 500) * 0.3} />
				<circle cx={pad.x + pad.width - 0.3} cy={pad.y - 0.2} r="0.3"
					fill={pad.multiplier >= 5 ? 'var(--color-bittersweet)' : pad.multiplier >= 3 ? 'var(--color-golden)' : 'var(--color-apple)'}
					opacity={0.4 + Math.sin(Date.now() / 500) * 0.3} />
			{/each}

			<!-- Spacecraft group -->
			{#if gameState !== 'crashed'}
				<g transform="translate({x}, {y}) rotate({angle})">
					<!-- Thrust flame -->
					{#if thrusting && fuel > 0}
						<polygon
							points="-0.8,2 0.8,2 0,{3.5 + flameFlicker * 2}"
							fill="var(--color-golden)"
							opacity={0.7 + flameFlicker * 0.3} />
						<polygon
							points="-0.5,2 0.5,2 0,{3 + flameFlicker * 1.5}"
							fill="var(--color-bittersweet)"
							opacity="0.9" />
					{/if}

					<!-- Lander body -->
					<polygon points="-1.5,1 -1,-1.5 1,-1.5 1.5,1" fill="#c0c0d0" stroke="rgba(255,255,255,0.3)" stroke-width="0.1" />
					<!-- Legs -->
					<line x1="-1.5" y1="1" x2="-2" y2="2" stroke="#888" stroke-width="0.15" />
					<line x1="1.5" y1="1" x2="2" y2="2" stroke="#888" stroke-width="0.15" />
					<line x1="-2.2" y1="2" x2="-1.8" y2="2" stroke="#888" stroke-width="0.2" />
					<line x1="1.8" y1="2" x2="2.2" y2="2" stroke="#888" stroke-width="0.2" />
					<!-- Cockpit window -->
					<circle cx="0" cy="-0.5" r="0.5" fill="#4b6abe" opacity="0.8" />
					<!-- Nozzle -->
					<polygon points="-0.6,1 0.6,1 0.8,2 -0.8,2" fill="#666" />
				</g>
			{/if}

			<!-- Debris -->
			{#each debris as d}
				<g transform="translate({d.x}, {d.y}) rotate({d.angle})">
					{#if d.type === 'body'}
						<polygon points="-0.8,-0.5 0.8,-0.5 0.5,0.5 -0.5,0.5" fill="#c0c0d0" opacity="0.8" />
					{:else if d.type === 'leg'}
						<line x1="-1" y1="0" x2="1" y2="0" stroke="#888" stroke-width="0.1" />
					{:else}
						<rect x="-0.3" y="-0.3" width="0.6" height="0.6" fill="#666" />
					{/if}
				</g>
			{/each}

			{#if gameState === 'landed' || gameState === 'crashed'}
				<text x="50" y="40" text-anchor="middle" font-size="5" font-weight="900" 
					fill={gameState === 'landed' ? 'var(--color-apple)' : 'var(--color-bittersweet)'}
					style="filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5))"
					in:fade>
					{landingMessage}
				</text>
				{#if sessionSummary}
					<text x="50" y="47" text-anchor="middle" font-size="2.6" font-weight="800"
						fill={sessionComplete ? 'var(--color-golden)' : 'rgba(255,255,255,0.7)'}
						style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.45))"
						in:fade>
						{sessionSummary}
					</text>
				{/if}
			{/if}
			</svg>
		</div>

		<!-- Touch controls & Actions -->
		<div class="touch-controls">
			{#if gameState === 'playing'}
				<button class="touch-btn rotate-btn"
					aria-label="Rotate left"
					onpointerdown={startRotateLeft} onpointerup={stopRotateLeft} onpointerleave={stopRotateLeft}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
				<button class="touch-btn thrust-btn"
					onpointerdown={startThrust} onpointerup={stopThrust} onpointerleave={stopThrust}
					class:active-thrust={thrusting && fuel > 0}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
					<span class="thrust-label">THRUST</span>
				</button>
				<button class="touch-btn rotate-btn"
					aria-label="Rotate right"
					onpointerdown={startRotateRight} onpointerup={stopRotateRight} onpointerleave={stopRotateRight}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			{:else}
				<div class="end-game-buttons" in:fade>
					<label class="lqr-toggle" class:active={showOptimal}>
						<input type="checkbox" bind:checked={showOptimal} />
						<span>SHOW LQR OPTIMAL</span>
					</label>
					{#if sessionComplete}
						<button class="action-btn" onclick={openFinalScore}>FINAL SCORE</button>
					{:else}
						<button class="action-btn" onclick={nextRound}>NEXT ROUND</button>
					{/if}
					<button class="action-btn secondary" onclick={exitToMainMenu}>EXIT</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.lander-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
		position: relative;
		overflow: hidden;
	}

	/* HUD */
	.hud {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2vmin 3vmin;
		flex-shrink: 0;
		z-index: 10;
	}

	.hud-group {
		display: flex;
		gap: 4vmin;
		align-items: center;
	}

	.center-hud {
		gap: 6vmin;
	}

	.hud-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3vmin;
		cursor: help;
		position: relative;
	}

	.hud-limit {
		font-size: 1vmin;
		color: var(--game-text-soft);
		font-weight: 800;
		letter-spacing: 0.05vmin;
	}

	.hud-item:hover .hud-limit {
		color: var(--color-golden);
	}

	.hud-label {
		font-size: 1.1vmin;
		color: var(--game-text-soft);
		font-weight: 800;
		letter-spacing: 0.15vmin;
		text-transform: uppercase;
	}

	.hud-value {
		font-size: 2.8vmin;
		font-weight: 900;
		color: var(--game-text-primary);
		font-variant-numeric: tabular-nums;
		transition: color 0.2s;
	}

	.hud-value small {
		font-size: 1.6vmin;
		opacity: 0.5;
		margin-left: 0.2vmin;
	}

	.hud-value.danger {
		color: var(--color-bittersweet);
		text-shadow: 0 0 10px rgba(255, 110, 97, 0.5);
	}

	.score-val {
		color: var(--color-golden);
		font-size: 3.5vmin;
	}

	.fuel-item {
		min-width: 14vmin;
	}

	.fuel-bar-bg {
		width: 100%;
		height: 1vmin;
		background: rgba(255,255,255,0.08);
		border-radius: 0.5vmin;
		overflow: hidden;
	}

	.fuel-bar {
		height: 100%;
		background: var(--color-apple);
		border-radius: 0.5vmin;
		transition: width 0.1s linear;
	}

	.fuel-bar.fuel-low {
		background: var(--color-bittersweet);
		animation: pulse-fuel 0.5s ease-in-out infinite alternate;
	}

	.fuel-pct {
		font-size: 1.4vmin;
		font-weight: 800;
		color: var(--color-apple);
	}

	.fuel-pct.fuel-low {
		color: var(--color-bittersweet);
	}

	@keyframes pulse-fuel {
		from { opacity: 0.6; }
		to { opacity: 1; }
	}

	/* Viewport */
	.viewport {
		flex: 1;
		position: relative;
		overflow: hidden;
		border-radius: 2vmin;
		margin: 0 2vmin;
		background: linear-gradient(180deg, #05050f 0%, #0a0a20 40%, #12122e 100%);
		border: 1px solid rgba(255,255,255,0.06);
	}

	.results-page {
		flex: 1;
		display: grid;
		place-items: center;
		margin: 0 2vmin;
		border-radius: 2vmin;
		background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.06), rgba(8, 8, 20, 0.96));
		border: 1px solid rgba(255,255,255,0.08);
	}

	.results-card {
		min-width: min(90vw, 56vmin);
		padding: 5vmin;
		border-radius: 1.6vmin;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5vmin;
	}

	.results-kicker {
		margin: 0;
		font-size: 1.4vmin;
		letter-spacing: 0.25vmin;
		font-weight: 800;
		color: var(--game-text-muted);
	}

	.results-title {
		margin: 0;
		font-size: 4vmin;
		font-weight: 900;
		color: var(--color-golden);
	}

	.results-score {
		margin: 0;
		font-size: 9vmin;
		font-weight: 900;
		line-height: 1;
		color: var(--game-text-primary);
		text-shadow: 0 0 3vmin rgba(255,255,255,0.18);
	}

	.results-subtitle {
		margin: 0;
		font-size: 1.8vmin;
		font-weight: 700;
		color: var(--game-text-muted);
	}

	.results-actions {
		display: flex;
		gap: 2vmin;
		margin-top: 1vmin;
	}

	.scene {
		width: 100%;
		height: 100%;
		display: block;
	}

	.end-game-buttons {
		display: flex;
		gap: 3vmin;
		align-items: center;
	}

	.lqr-toggle {
		display: flex;
		align-items: center;
		gap: 1vmin;
		cursor: pointer;
		padding: 1.2vmin 2.5vmin;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 1vmin;
		color: var(--game-text-muted);
		font-size: 1.4vmin;
		font-weight: 800;
		transition: all 0.2s;
	}

	.lqr-toggle:hover {
		background: rgba(255,255,255,0.08);
		color: var(--game-text-primary);
	}

	.lqr-toggle.active {
		border-color: var(--color-apple);
		color: var(--color-apple);
		background: rgba(105, 175, 75, 0.05);
	}

	.lqr-toggle input {
		display: none;
	}

	.action-btn {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-size: 2vmin;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		filter: brightness(1.2);
		transform: scale(1.05);
	}

	.action-btn.secondary {
		background: transparent;
		border: 2px solid rgba(255,255,255,0.2);
		color: var(--game-text-muted);
	}

	.action-btn.secondary:hover {
		background: rgba(255,255,255,0.1);
		border-color: rgba(255,255,255,0.4);
		color: var(--game-text-primary);
	}

	/* Touch controls */
	.touch-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 3vmin;
		padding: 2vmin;
		flex-shrink: 0;
	}

	.touch-btn {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.1);
		color: var(--game-text-muted);
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.rotate-btn {
		width: 8vmin;
		height: 8vmin;
	}

	.rotate-btn svg {
		width: 3.5vmin;
		height: 3.5vmin;
	}

	.thrust-btn {
		width: 14vmin;
		height: 8vmin;
		flex-direction: column;
		gap: 0.3vmin;
	}

	.thrust-btn svg {
		width: 3vmin;
		height: 3vmin;
	}

	.thrust-label {
		font-size: 1.2vmin;
		font-weight: 800;
		letter-spacing: 0.1vmin;
	}

	.touch-btn:hover {
		background: rgba(255,255,255,0.08);
		color: var(--game-text-primary);
	}

	.touch-btn:active, .active-thrust {
		background: rgba(255, 110, 97, 0.2) !important;
		border-color: var(--color-bittersweet) !important;
		color: var(--color-bittersweet) !important;
		box-shadow: 0 0 15px rgba(255, 110, 97, 0.3);
	}

	@media (max-width: 1024px) {
		.viewport {
			flex: 0 0 auto;
			width: 100%;
			height: auto;
			aspect-ratio: 1 / 1;
			margin: 0;
			border-radius: 0;
		}

		.scene {
			width: 100%;
			height: 100%;
		}
	}
</style>
