<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';

	let { onBack } = $props();

	let angle = $state(45); // degrees
	let power = $state(15); // initial velocity in m/s
	let isShooting = $state(false);
	let score = $state(0);
	let attempts = $state(0);
	let feedback = $state<string | null>(null);

	let ballX = $state(0);
	let ballY = $state(0);
	let trajectory = $state<{x: number, y: number}[]>([]);

	let animationId: number | null = null;
	const GRAVITY = 9.8; // m/s^2
	
	// World scale constants (in meters)
	const WORLD_WIDTH = 20; 
	const WORLD_HEIGHT = 12;
	const CANNON_X_M = 18;
	const CANNON_Y_M = 1;
	const HOOP_X_M = 3;
	const HOOP_Y_M = 3.05;

	// Map meters to percentages
	const toX = (m: number) => (m / WORLD_WIDTH) * 100;
	const toY = (m: number) => (m / WORLD_HEIGHT) * 100;

	function shoot() {
		if (isShooting) return;
		isShooting = true;
		attempts++;
		feedback = null;

		const rad = (angle * Math.PI) / 180;
		const v0 = power;
		let vx = -v0 * Math.cos(rad);
		let vy = v0 * Math.sin(rad);
		
		let t = 0;
		const dt = 0.02;

		const barrelLen_m = 2.6; // 12vmin in world meters
		let curX_m = CANNON_X_M - barrelLen_m * Math.cos(rad);
		let curY_m = (CANNON_Y_M + 0.55) + barrelLen_m * Math.sin(rad);

		ballX = toX(curX_m);
		ballY = toY(curY_m);
		trajectory = [{x: ballX, y: ballY}];

		function animate() {
			t += dt;
			
			// Physics
			curX_m += vx * dt;
			vy -= GRAVITY * dt;
			curY_m += vy * dt;

			ballX = toX(curX_m);
			ballY = toY(curY_m);
			trajectory = [...trajectory, { x: ballX, y: ballY }];

			// Backboard bounce
			if (curX_m <= HOOP_X_M && curX_m >= HOOP_X_M - 0.3 && curY_m >= HOOP_Y_M && curY_m <= HOOP_Y_M + 1.2 && vx < 0) {
				vx = -vx * 0.4;
				feedback = "BOUNCE!";
			}

			// Rim check
			const dx = Math.abs(curX_m - (HOOP_X_M + 0.4));
			const dy = Math.abs(curY_m - HOOP_Y_M);

			if (dx < 0.5 && dy < 0.4 && vy < 0) {
				score++;
				feedback = feedback === "BOUNCE!" ? "BANK SHOT!" : "SWISH!";
				endShot();
				return;
			}

			// Out of bounds
			if (curY_m < 0 || curX_m < 0 || curX_m > WORLD_WIDTH) {
				if (!feedback) feedback = curX_m < HOOP_X_M ? "TOO FAR!" : "SHORT!";
				endShot();
				return;
			}

			animationId = requestAnimationFrame(animate);
		}

		animate();
	}

	function endShot() {
		isShooting = false;
		if (animationId) cancelAnimationFrame(animationId);
		setTimeout(() => {
			if (!isShooting) {
				ballX = 0;
				ballY = 0;
				trajectory = [];
				feedback = null;
			}
		}, 2000);
	}

	function restart() {
		score = 0;
		attempts = 0;
		feedback = null;
		isShooting = false;
		trajectory = [];
		if (animationId) cancelAnimationFrame(animationId);
	}

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
	});

</script>

<div class="shotsim-container">
	<div class="nav-row">
		<button class="back-btn" onclick={onBack}>BACK TO MENU</button>
		<button class="restart-btn" onclick={restart}>RESET</button>
	</div>

	<div class="game-header">
		<h1 class="title">SHOTSIM</h1>
		<div class="scoreboard">
			<div class="score-item">
				<span class="label">SCORE</span>
				<span class="value">{score}</span>
			</div>
			<div class="score-item">
				<span class="label">ATTEMPTS</span>
				<span class="value">{attempts}</span>
			</div>
		</div>
	</div>

	<div class="court">
		<!-- Trajectory SVG -->
		<svg class="trajectory-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
			{#if trajectory.length > 1}
				<path 
					d="M {trajectory.map(p => `${p.x} ${100 - p.y}`).join(' L ')}" 
					fill="none" 
					stroke="var(--color-golden)" 
					stroke-width="0.3"
					stroke-dasharray="1 1"
					opacity="0.6"
				/>
				<text 
					x={toX(CANNON_X_M - 2)} 
					y={100 - toY(CANNON_Y_M + 2.5)} 
					fill="var(--color-golden)" 
					font-size="4" 
					font-weight="bold"
				>
					{angle}°
				</text>
			{/if}
		</svg>

		<!-- Hoop -->
		<div class="hoop" style="left: {toX(HOOP_X_M)}%; bottom: {toY(HOOP_Y_M)}%">
			<div class="backboard"></div>
			<div class="rim"></div>
			<div class="net"></div>
		</div>

		<!-- Cannon -->
		<div class="cannon-container" style="left: {toX(CANNON_X_M)}%; bottom: {toY(CANNON_Y_M)}%">
			<div class="cannon-base"></div>
			<div class="cannon-barrel" style="transform: rotate({-angle}deg)">
				<div class="barrel-stats">
					<span>{angle}°</span>
					<span>{power}m/s</span>
				</div>
			</div>
		</div>

		<!-- Ball -->
		{#if isShooting}
			<div class="ball" style="left: {ballX}%; bottom: {ballY}%; margin-left: -1.5vmin; margin-bottom: -1.5vmin;"></div>
		{/if}

		<!-- Feedback -->
		{#if feedback}
			<div class="feedback" in:fade>{feedback}</div>
		{/if}
	</div>

	<div class="controls">
		<div class="control-group">
			<label for="angle">ANGLE: {angle}°</label>
			<input type="range" id="angle" min="10" max="85" bind:value={angle} disabled={isShooting} />
		</div>
		<div class="control-group">
			<label for="power">VELOCITY: {power} m/s</label>
			<input type="range" id="power" min="5" max="25" step="0.5" bind:value={power} disabled={isShooting} />
		</div>
		<button class="shoot-btn" onclick={shoot} disabled={isShooting}>SHOOT</button>
	</div>
</div>

<style>
	.shotsim-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: white;
		position: relative;
		overflow: hidden;
	}

	.nav-row {
		padding: 3vmin;
		display: flex;
		justify-content: space-between;
		z-index: 10;
	}

	.back-btn, .restart-btn {
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

	.back-btn:hover { color: white; border-color: var(--color-illusion); }

	.game-header {
		text-align: center;
		padding: 0 4vmin;
	}

	.title {
		font-size: 6vmin;
		margin: 0;
		font-weight: 900;
		letter-spacing: -2px;
		color: var(--color-bittersweet);
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

	.court {
		flex: 1;
		position: relative;
		background: rgba(255,255,255,0.02);
		margin: 2vmin 4vmin;
		border-radius: 3vmin;
		border: 1px solid rgba(255,255,255,0.05);
		overflow: hidden;
	}

	/* Cannon */
	.cannon-container {
		position: absolute;
		width: 10vmin;
		height: 10vmin;
	}

	.cannon-base {
		position: absolute;
		bottom: 0;
		left: 10%;
		width: 80%;
		height: 4vmin;
		background: #333;
		border-radius: 1vmin 1vmin 0 0;
	}

	.cannon-barrel {
		position: absolute;
		bottom: 2.5vmin;
		right: 50%; /* Pivot at the center of the base, barrel extends left */
		width: 12vmin;
		height: 5vmin;
		background: #444;
		border-radius: 1vmin;
		transform-origin: right center;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding-left: 2vmin;
		box-shadow: 0 4px 10px rgba(0,0,0,0.5);
	}

	.barrel-stats {
		display: flex;
		flex-direction: column;
		font-size: 1.2vmin;
		font-weight: 800;
		color: var(--color-golden);
	}

	/* Hoop */
	.hoop {
		position: absolute;
		bottom: 60%;
		width: 8vmin;
		height: 10vmin;
		left: calc(20% - 8vmin);
	}

	.backboard {
		position: absolute;
		top: 0;
		left: 0;
		width: 1vmin;
		height: 8vmin;
		background: rgba(255,255,255,0.8);
		border-radius: 0.2vmin;
	}

	.rim {
		position: absolute;
		top: 5vmin;
		left: 1vmin;
		width: 4vmin;
		height: 0.5vmin;
		background: var(--color-bittersweet);
		border-radius: 0.2vmin;
	}

	.net {
		position: absolute;
		top: 5.5vmin;
		left: 1vmin;
		width: 4vmin;
		height: 4vmin;
		background: rgba(255,255,255,0.1);
		border-radius: 0 0 1vmin 1vmin;
	}

	/* Ball */
	.ball {
		position: absolute;
		width: 3vmin;
		height: 3vmin;
		background: #ff8c00;
		border-radius: 50%;
		z-index: 10;
		box-shadow: 0 4px 8px rgba(0,0,0,0.4);
	}

	.trajectory-svg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.feedback {
		position: absolute;
		top: 20%;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 6vmin;
		font-weight: 900;
		color: var(--color-golden);
		text-shadow: 0 4px 20px rgba(0,0,0,0.8);
	}

	.controls {
		padding: 2vmin 4vmin 4vmin;
		display: flex;
		gap: 4vmin;
		align-items: flex-end;
		justify-content: center;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 1vmin;
		width: 20vmin;
	}

	label { font-size: 1.4vmin; font-weight: 800; color: rgba(255,255,255,0.4); }

	input[type="range"] {
		-webkit-appearance: none;
		width: 100%;
		height: 6px;
		background: rgba(255,255,255,0.1);
		border-radius: 3px;
		outline: none;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-bittersweet);
		border-radius: 50%;
		cursor: pointer;
	}

	.shoot-btn {
		background: var(--color-bittersweet);
		color: white;
		border: none;
		padding: 1.5vmin 6vmin;
		font-size: 2.5vmin;
		font-weight: 800;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4);
	}

	.shoot-btn:hover:not(:disabled) {
		background: var(--color-illusion);
		transform: translateY(-2px);
	}

	.shoot-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
