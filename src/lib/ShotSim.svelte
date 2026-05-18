<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	let angle = $state(45); // degrees, 45 is a good starting point
	let power = $state(15); // initial velocity in m/s
	let isShooting = $state(false);
	let score = $state(0);
	let attempts = $state(0);
	let feedback = $state<string | null>(null);

	let ballX = $state(0);
	let ballY = $state(0);
	let trajectory = $state<{x: number, y: number, x_m: number, y_m: number}[]>([]);
	let peakHeight = $state(0);
	let totalDistance = $state(0);
	let totalTime = $state(0);
	let hasScored = $state(false);
	let showTelemetry = $state(true);

	let animationId: number | null = null;
	const GRAVITY = 9.8; // m/s^2

	const WORLD_WIDTH = 30; // meters
	const WORLD_HEIGHT = 15; // meters
	const CANNON_X_M = 28; // meters from left
	const CANNON_Y_M = 1; // meters from bottom
	const HOOP_X_M = 3; // meters from left
	const HOOP_Y_M = 4.5; // meters from bottom
	const BALL_R = 0.35; // meters
	
	const RIM_BACK = HOOP_X_M + 0.2;
	const RIM_FRONT = HOOP_X_M + 1.8;
	const BB_HEIGHT = 2.5;
	const BB_THICKNESS = 0.3;

	const toX = (m: number) => (m / WORLD_WIDTH) * 100;
	const toY = (m: number) => (m / WORLD_HEIGHT) * 100;

	function shoot() {
		if (isShooting) return;
		isShooting = true;
		attempts++;
		feedback = null;
		peakHeight = 0;
		totalDistance = 0;
		totalTime = 0;
		hasScored = false;

		const rad = (angle * Math.PI) / 180;
		const v0 = power;
		let vx = -v0 * Math.cos(rad);
		let vy = v0 * Math.sin(rad);
		
		let t = 0;
		const dt = 0.02;

		const barrelLen_m = 2.6;
		let curX_m = CANNON_X_M - barrelLen_m * Math.cos(rad);
		let curY_m = (CANNON_Y_M + 0.55) + barrelLen_m * Math.sin(rad);
		const startX_m = curX_m;

		ballX = toX(curX_m);
		ballY = toY(curY_m);
		trajectory = [{x: ballX, y: ballY, x_m: curX_m, y_m: curY_m}];

		function animate() {
			const substeps = 5;
			const sdt = dt / substeps;

			for (let step = 0; step < substeps; step++) {
				t += sdt;
				totalTime = t;
				
				let prevX = curX_m;
				let prevY = curY_m;

				curX_m += vx * sdt;
				vy -= GRAVITY * sdt;
				curY_m += vy * sdt;

				if (curY_m > peakHeight) peakHeight = curY_m;
				totalDistance = Math.abs(curX_m - startX_m);

				// Backboard Collision
				if (curX_m - BALL_R <= HOOP_X_M + BB_THICKNESS && prevX - BALL_R > HOOP_X_M + BB_THICKNESS) {
					if (curY_m >= HOOP_Y_M && curY_m <= HOOP_Y_M + BB_HEIGHT) {
						curX_m = HOOP_X_M + BB_THICKNESS + BALL_R;
						vx = -vx * 0.6;
					}
				}

				// Rim Collisions
				let distFront = Math.hypot(curX_m - RIM_FRONT, curY_m - HOOP_Y_M);
				if (distFront < BALL_R) {
					let nx = (curX_m - RIM_FRONT) / distFront;
					let ny = (curY_m - HOOP_Y_M) / distFront;
					let dot = vx * nx + vy * ny;
					if (dot < 0) {
						vx = vx - 2 * dot * nx * 0.7;
						vy = vy - 2 * dot * ny * 0.7;
					}
					curX_m = RIM_FRONT + nx * BALL_R;
					curY_m = HOOP_Y_M + ny * BALL_R;
				}

				let distBack = Math.hypot(curX_m - RIM_BACK, curY_m - HOOP_Y_M);
				if (distBack < BALL_R) {
					let nx = (curX_m - RIM_BACK) / distBack;
					let ny = (curY_m - HOOP_Y_M) / distBack;
					let dot = vx * nx + vy * ny;
					if (dot < 0) {
						vx = vx - 2 * dot * nx * 0.7;
						vy = vy - 2 * dot * ny * 0.7;
					}
					curX_m = RIM_BACK + nx * BALL_R;
					curY_m = HOOP_Y_M + ny * BALL_R;
				}

				// Score Detection
				if (!hasScored && curY_m < HOOP_Y_M && curY_m > HOOP_Y_M - 0.5 && vy < 0) {
					let safeMargin = BALL_R * 0.6; 
					if (curX_m > RIM_BACK + safeMargin && curX_m < RIM_FRONT - safeMargin) {
						hasScored = true;
						score++;
						feedback = "HIT";
					}
				}

				if (curY_m < 0 || curX_m < -2 || curX_m > WORLD_WIDTH + 2) {
					if (!hasScored) feedback = "MISS";
					ballX = toX(curX_m);
					ballY = toY(curY_m);
					endShot();
					return;
				}
			}

			ballX = toX(curX_m);
			ballY = toY(curY_m);
			if (!hasScored && curY_m > 0) {
				trajectory = [...trajectory, { x: ballX, y: ballY, x_m: curX_m, y_m: curY_m }];
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

	$effect(() => {
		registerActions({
			help: () => instructions.open()
		});
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
	});
</script>

<div class="shotsim-container">
	<Instructions bind:this={instructions} gameId="shotsim" title="ShotSim">
		<p><strong>Goal:</strong> Land the projectile perfectly in the target hoop.</p>
		<p>Adjust the cannon's angle and firing power using the sliders. Watch how gravity and velocity affect the parabolic trajectory!</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat">
				<span class="label">SCORE</span>
				<span class="value">{score}</span>
			</div>
			<div class="stat">
				<span class="label">ATTEMPTS</span>
				<span class="value">{attempts}</span>
			</div>
			<div class="stat">
				<label class="telemetry-toggle">
					<input type="checkbox" bind:checked={showTelemetry} />
					<span>TELEMETRY</span>
				</label>
			</div>
		</div>

		<div class="court">
			<svg class="trajectory-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
				{#if trajectory.length > 1}
					<path 
						d="M {trajectory.map(p => `${p.x} ${100 - p.y}`).join(' L ')}" 
						fill="none" 
						stroke="var(--app-text)" 
						stroke-width="0.3"
						stroke-dasharray="1 1"
						opacity="0.6"
					/>
				{/if}
			</svg>

			{#if showTelemetry && trajectory.length > 1}
				<div class="telemetry-label initial-label" style="left: {toX(CANNON_X_M)}%; bottom: {toY(CANNON_Y_M + 7.0)}%;">
					<span>v₀ = {power.toFixed(1)} m/s</span>
					<span>θ₀ = {angle}°</span>
				</div>

				{#if peakHeight > 0}
					<div class="telemetry-label peak-label" style="left: {toX(trajectory.reduce((max, p) => p.y_m > max.y_m ? p : max, trajectory[0]).x_m)}%; bottom: {toY(peakHeight + 2.5)}%;">
						yₘₐₓ = {peakHeight.toFixed(2)} m
					</div>
				{/if}

				{#if totalDistance > 2}
					<div class="telemetry-label dist-label" style="left: {toX(trajectory[trajectory.length-1].x_m)}%; bottom: {toY(trajectory[trajectory.length-1].y_m + 3.5)}%;">
						<span>Δx = {totalDistance.toFixed(2)} m</span>
						<span>t = {totalTime.toFixed(2)} s</span>
					</div>
				{/if}
			{/if}

			<div class="distance-label" style="left: {toX(HOOP_X_M)}%; width: {toX(CANNON_X_M - HOOP_X_M)}%">
				<div class="dist-line"></div>
				<span>{ (CANNON_X_M - HOOP_X_M).toFixed(1) }m</span>
			</div>

			<div class="backboard" style="left: {toX(HOOP_X_M)}%; bottom: {toY(HOOP_Y_M)}%; width: {toX(BB_THICKNESS)}%; height: {toY(BB_HEIGHT)}%;"></div>
			<div class="rim" style="left: {toX(RIM_BACK)}%; bottom: {toY(HOOP_Y_M)}%; width: {toX(RIM_FRONT - RIM_BACK)}%; height: 0.8vmin;"></div>
			<div class="net" style="left: {toX(RIM_BACK + 0.1)}%; bottom: {toY(HOOP_Y_M - 1.0)}%; width: {toX(RIM_FRONT - RIM_BACK - 0.2)}%; height: {toY(1.0)}%;"></div>

			<div class="cannon-container" style="left: calc({toX(CANNON_X_M)}% - 5vmin); bottom: {toY(CANNON_Y_M)}%">
				<div class="cannon-base"></div>
				<div class="cannon-barrel" style="transform: rotate({angle}deg)">
					<div class="barrel-stats">
						<span>{angle}°</span>
						<span>{power}m/s</span>
					</div>
				</div>
			</div>

			{#if isShooting}
				<div class="ball" style="left: {ballX}%; bottom: {ballY}%; margin-left: -1.5vmin; margin-bottom: -1.5vmin;"></div>
			{/if}

			{#if feedback}
				<div class="feedback" in:fade>{feedback}</div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		<div class="controls">
			<div class="control-group">
				<label for="angle">ANGLE: {angle}°</label>
				<div class="input-row">
					<button class="step-btn" onclick={() => angle = Math.max(0, angle - 1)} disabled={isShooting}>-</button>
					<input type="range" id="angle" min="0" max="90" bind:value={angle} disabled={isShooting} />
					<button class="step-btn" onclick={() => angle = Math.min(90, angle + 1)} disabled={isShooting}>+</button>
				</div>
			</div>

			<div class="control-group">
				<label for="power">VELOCITY: {power}m/s</label>
				<div class="input-row">
					<button class="step-btn" onclick={() => power = Math.max(5, power - 0.5)} disabled={isShooting}>-</button>
					<input type="range" id="power" min="5" max="25" step="0.5" bind:value={power} disabled={isShooting} />
					<button class="step-btn" onclick={() => power = Math.min(25, power + 0.5)} disabled={isShooting}>+</button>
				</div>
			</div>

			<button class="shoot-btn" onclick={shoot} disabled={isShooting}>SHOOT</button>
		</div>
	</div>
</div>

<style>
	.shotsim-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
		position: relative;
		overflow: hidden;
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 1vmin 4vmin;
		box-sizing: border-box;
		overflow: hidden;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8vmin;
		margin-bottom: 2vmin;
		width: 100%;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.label { font-size: 1.2vmin; color: var(--game-text-soft); font-weight: 800; letter-spacing: 0.1vmin; text-transform: uppercase; }
	.value { font-size: 4vmin; font-weight: 900; color: var(--color-bittersweet); }

	.court {
		flex: 1;
		position: relative;
		background: rgba(255,255,255,0.015);
		border-radius: 3vmin;
		border: 1px solid rgba(255,255,255,0.08);
		overflow: hidden;
	}

	.bottom-bar {
		height: 12vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.controls {
		display: flex;
		gap: 6vmin;
		align-items: center;
		justify-content: center;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5vmin;
		width: 30vmin;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 1.5vmin;
	}

	.step-btn {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: var(--game-text-primary);
		width: 4.5vmin;
		height: 4.5vmin;
		border-radius: 1vmin;
		cursor: pointer;
		font-weight: 900;
		font-size: 2.5vmin;
		transition: all 0.2s;
	}

	.step-btn:hover:not(:disabled) {
		background: rgba(255,255,255,0.15);
		color: var(--app-text);
	}

	input[type="range"] {
		flex: 1;
		appearance: none;
		-webkit-appearance: none;
		height: 0.6vmin;
		background: rgba(255,255,255,0.1);
		border-radius: 1vmin;
		outline: none;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 2.5vmin;
		height: 2.5vmin;
		background: var(--color-bittersweet);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(255, 110, 97, 0.4);
	}

	.shoot-btn {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: 0 6vmin;
		height: 8vmin;
		font-size: 2.5vmin;
		font-weight: 900;
		border-radius: 1.5vmin;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4);
		letter-spacing: 0.2vmin;
	}

	.shoot-btn:hover:not(:disabled) {
		background: var(--app-text);
		transform: translateY(-2px);
	}

	.telemetry-toggle {
		display: flex;
		align-items: center;
		gap: 1vmin;
		cursor: pointer;
		color: var(--game-text-muted);
		font-size: 1.2vmin;
		font-weight: 800;
	}

	.telemetry-toggle input {
		width: 2vmin;
		height: 2vmin;
		accent-color: var(--app-text);
	}

	.telemetry-label {
		position: absolute;
		display: flex;
		flex-direction: column;
		font-weight: 600;
		font-size: 1.8vmin;
		line-height: 1.2;
		white-space: nowrap;
		z-index: 5;
		pointer-events: none;
		width: 20vmin;
	}

	.initial-label { color: var(--app-text); align-items: center; margin-left: -10vmin; }
	.peak-label { color: var(--color-apple); align-items: center; margin-left: -10vmin; }
	.dist-label { color: var(--app-text); align-items: center; margin-left: -10vmin; }

	.distance-label {
		position: absolute;
		bottom: 2vmin;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--game-text-soft);
		font-size: 1.4vmin;
		font-weight: 800;
	}

	.dist-line {
		width: 100%;
		height: 1px;
		border-top: 1px dashed rgba(255,255,255,0.2);
		margin-bottom: 0.5vmin;
	}

	.cannon-container { position: absolute; width: 10vmin; height: 10vmin; }
	.cannon-base { position: absolute; bottom: 0; left: 10%; width: 80%; height: 4vmin; background: #333; border-radius: 1vmin 1vmin 0 0; }
	.cannon-barrel { position: absolute; bottom: 2.5vmin; right: 50%; width: 12vmin; height: 5vmin; background: #444; border-radius: 1vmin; transform-origin: right center; display: flex; align-items: center; justify-content: flex-start; padding-left: 2vmin; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
	.barrel-stats { display: flex; flex-direction: column; font-size: 1.2vmin; font-weight: 800; color: var(--app-text); }

	.backboard { position: absolute; background: rgba(255,255,255,0.8); border-radius: 0.2vmin; }
	.rim { position: absolute; background: var(--color-bittersweet); border-radius: 0.2vmin; z-index: 2; }
	.net { position: absolute; background: rgba(255,255,255,0.1); border-radius: 0 0 1vmin 1vmin; border: 1px dashed rgba(255,255,255,0.2); z-index: 1; }
	.ball { position: absolute; width: 3vmin; height: 3vmin; background: #ff8c00; border-radius: 50%; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.4); }
	.trajectory-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
	.feedback { position: absolute; top: 20%; left: 0; right: 0; text-align: center; font-size: 6vmin; font-weight: 900; color: var(--app-text); text-shadow: 0 4px 20px rgba(0,0,0,0.8); }

	@media (max-width: 1024px) {
		.board-wrapper {
			padding: 0.5rem;
			height: 100%;
			min-height: 0;
		}

		.game-stats {
			gap: clamp(0.75rem, 2.5vw, 1rem);
			margin-bottom: 0.5rem;
		}

		.label {
			font-size: clamp(0.55rem, 2.2vw, 0.65rem);
			letter-spacing: 0.08em;
		}

		.value {
			font-size: clamp(1.1rem, 4vw, 1.3rem);
		}

		.bottom-bar {
			height: auto;
			padding: 0.5rem 0.6rem 0.75rem;
		}

		.controls {
			width: 100%;
			gap: clamp(0.5rem, 2vw, 0.65rem);
			align-items: stretch;
			flex-direction: column;
		}

		.control-group {
			width: 100%;
			gap: 0.2rem;
		}

		.control-group label {
			font-size: clamp(0.6rem, 2.3vw, 0.72rem);
			font-weight: 700;
		}

		.input-row {
			gap: clamp(0.35rem, 1.5vw, 0.45rem);
		}

		.step-btn {
			width: clamp(1.8rem, 5.5vw, 2rem);
			height: clamp(1.8rem, 5.5vw, 2rem);
			font-size: clamp(0.9rem, 3.5vw, 1rem);
			border-radius: 0.5rem;
			flex-shrink: 0;
		}

		input[type="range"] {
			height: clamp(0.22rem, 0.8vw, 0.28rem);
		}

		input[type="range"]::-webkit-slider-thumb {
			width: clamp(0.85rem, 3vw, 1rem);
			height: clamp(0.85rem, 3vw, 1rem);
		}

		.shoot-btn {
			width: 100%;
			height: clamp(2.1rem, 6.5vw, 2.4rem);
			padding: 0;
			font-size: clamp(0.75rem, 2.8vw, 0.86rem);
			letter-spacing: 0.08em;
			border-radius: 0.7rem;
		}

		.telemetry-toggle {
			font-size: clamp(0.5rem, 2vw, 0.6rem);
			gap: clamp(0.3rem, 1.2vw, 0.4rem);
		}

		.telemetry-toggle input {
			width: clamp(0.65rem, 2.5vw, 0.8rem);
			height: clamp(0.65rem, 2.5vw, 0.8rem);
		}

		.ball {
			width: clamp(2rem, 6vw, 3vmin);
			height: clamp(2rem, 6vw, 3vmin);
		}

		.feedback {
			font-size: clamp(3rem, 10vw, 5vmin);
		}
	}

	@media (max-width: 480px) {
		.board-wrapper {
			padding: 0.4rem;
		}

		.game-stats {
			gap: 0.6rem;
			margin-bottom: 0.4rem;
		}

		.label {
			font-size: 0.5rem;
		}

		.value {
			font-size: 1rem;
		}

		.bottom-bar {
			padding: 0.4rem 0.5rem 0.6rem;
		}

		.controls {
			gap: 0.45rem;
		}

		.step-btn {
			width: 1.6rem;
			height: 1.6rem;
			font-size: 0.8rem;
		}

		.shoot-btn {
			height: 2rem;
			font-size: 0.7rem;
		}
	}
</style>
