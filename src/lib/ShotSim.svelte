<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import { onDestroy } from "svelte";
	import Instructions from "./Instructions.svelte";
	import InGameMenu from "./InGameMenu.svelte";

	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	let angle = $state(45); // degrees, 45 is a good starting point
	let power = $state(15); // initial velocity in m/s
	let isShooting = $state(false);
	let score = $state(0);
	let attempts = $state(0);
	let feedback = $state<string | null>(null);

	let ballX = $state(0);
	let ballY = $state(0);
	let trajectory = $state<
		{ x: number; y: number; x_m: number; y_m: number }[]
	>([]);
	let peakHeight = $state(0);
	let totalDistance = $state(0);
	let totalTime = $state(0);
	let hasScored = $state(false);
	let showTelemetry = $state(true);
	let windEnabled = $state(true);
	let blockersEnabled = $state(true);

	type Blocker = { x: number; y: number; w: number; h: number };
	type Level = {
		name: string;
		cannonX: number;
		hoopX: number;
		hoopY: number;
		windX: number;
		windY: number;
		blockers: Blocker[];
	};

	const LEVELS: Level[] = [
		{
			name: "LOW WALL",
			cannonX: 28,
			hoopX: 3,
			hoopY: 4.5,
			windX: -1.2,
			windY: 0,
			blockers: [{ x: 15.0, y: 0, w: 1.0, h: 6.2 }],
		},
		{
			name: "THREAD THE GAP",
			cannonX: 27,
			hoopX: 4,
			hoopY: 4.0,
			windX: 1.6,
			windY: 0,
			blockers: [
				{ x: 14.5, y: 0, w: 1.0, h: 5.5 },
				{ x: 14.5, y: 9.2, w: 1.0, h: 5.8 },
			],
		},
		{
			name: "LOW CEILING",
			cannonX: 27.5,
			hoopX: 3.5,
			hoopY: 3.5,
			windX: -1.8,
			windY: -0.6,
			blockers: [{ x: 11.5, y: 6.8, w: 7.0, h: 1.2 }],
		},
		{
			name: "TWIN TOWERS",
			cannonX: 28,
			hoopX: 3,
			hoopY: 5.5,
			windX: 2.2,
			windY: 0.5,
			blockers: [
				{ x: 18.5, y: 0, w: 1.0, h: 7.0 },
				{ x: 9.0, y: 10.2, w: 2.2, h: 4.8 },
			],
		},
		{
			name: "UP & OVER",
			cannonX: 28.5,
			hoopX: 2.5,
			hoopY: 6.0,
			windX: 2.6,
			windY: -0.5,
			blockers: [
				{ x: 19.0, y: 0, w: 1.1, h: 6.5 },
				{ x: 10.5, y: 0, w: 1.1, h: 8.2 },
			],
		},
		{
			name: "CROSSWIND",
			cannonX: 26.5,
			hoopX: 3.5,
			hoopY: 4.5,
			windX: -2.5,
			windY: 0.8,
			blockers: [
				{ x: 15.0, y: 0, w: 1.0, h: 5.8 },
				{ x: 15.0, y: 8.6, w: 1.0, h: 6.4 },
				{ x: 9.0, y: 8.8, w: 1.0, h: 6.2 },
			],
		},
	];

	let levelIndex = $state(0);
	const level = $derived(LEVELS[levelIndex]);

	let animationId: number | null = null;
	let endShotTimer: ReturnType<typeof setTimeout> | null = null;
	const GRAVITY = 9.8; // m/s^2

	const WORLD_WIDTH = 30; // meters
	const WORLD_HEIGHT = 15; // meters
	const CANNON_Y_M = 1; // meters from bottom
	const CANNON_PIVOT_Y_M = CANNON_Y_M + 0.75; // barrel pivot height in meters
	const BARREL_LEN_M = 2.4; // barrel length from pivot to muzzle in meters
	const BARREL_DIA_M = 0.85; // barrel outer diameter in meters
	const BALL_R = 0.35; // meters

	const BB_HEIGHT = 2.5;
	const BB_THICKNESS = 0.3;

	const CANNON_X_M = $derived(level.cannonX);
	const HOOP_X_M = $derived(level.hoopX);
	const HOOP_Y_M = $derived(level.hoopY);
	const RIM_BACK = $derived(HOOP_X_M + BB_THICKNESS + 0.1);
	const RIM_FRONT = $derived(HOOP_X_M + 1.8);

	const hoopY = $derived(WORLD_HEIGHT - HOOP_Y_M);
	const bbTopY = $derived(WORLD_HEIGHT - (HOOP_Y_M + BB_HEIGHT));
	const bbBottomY = $derived(WORLD_HEIGHT - (HOOP_Y_M - 0.25));
	const poleX = $derived(HOOP_X_M - 1.0);
	const netTopY = $derived(hoopY + 0.08);
	const netBotY = $derived(hoopY + 1.15);
	const netL1 = $derived(RIM_BACK + 0.08);
	const netR1 = $derived(RIM_FRONT - 0.08);
	const netL2 = $derived(RIM_BACK + 0.3);
	const netR2 = $derived(RIM_FRONT - 0.3);

	const windMag = $derived(Math.hypot(level.windX, level.windY));
	const windAngleDeg = $derived(
		(Math.atan2(-level.windY, level.windX) * 180) / Math.PI,
	);

	const toX = (m: number) => (m / WORLD_WIDTH) * 100;
	const toY = (m: number) => (m / WORLD_HEIGHT) * 100;

	function selectLevel(idx: number) {
		if (isShooting) return;
		if (endShotTimer) {
			clearTimeout(endShotTimer);
			endShotTimer = null;
		}
		levelIndex = (idx + LEVELS.length) % LEVELS.length;
		trajectory = [];
		feedback = null;
		peakHeight = 0;
		totalDistance = 0;
		totalTime = 0;
	}

	function shoot() {
		if (isShooting) return;
		if (endShotTimer) {
			clearTimeout(endShotTimer);
			endShotTimer = null;
		}
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

		let curX_m = CANNON_X_M - BARREL_LEN_M * Math.cos(rad);
		let curY_m = CANNON_PIVOT_Y_M + BARREL_LEN_M * Math.sin(rad);
		const startX_m = curX_m;

		const activeWindX = windEnabled ? level.windX : 0;
		const activeWindY = windEnabled ? level.windY : 0;
		const activeBlockers = blockersEnabled ? level.blockers : [];

		ballX = toX(curX_m);
		ballY = toY(curY_m);
		trajectory = [{ x: ballX, y: ballY, x_m: curX_m, y_m: curY_m }];

		function animate() {
			const substeps = 5;
			const sdt = dt / substeps;

			for (let step = 0; step < substeps; step++) {
				t += sdt;
				totalTime = t;

				let prevX = curX_m;

				curX_m += vx * sdt;
				vx += activeWindX * sdt;
				vy += (activeWindY - GRAVITY) * sdt;
				curY_m += vy * sdt;

				if (curY_m > peakHeight) peakHeight = curY_m;
				totalDistance = Math.abs(curX_m - startX_m);

				// Blocker Collisions (circle vs AABB)
				for (const b of activeBlockers) {
					const closestX = Math.max(b.x, Math.min(curX_m, b.x + b.w));
					const closestY = Math.max(b.y, Math.min(curY_m, b.y + b.h));
					const dx = curX_m - closestX;
					const dy = curY_m - closestY;
					const distSq = dx * dx + dy * dy;

					if (distSq < BALL_R * BALL_R) {
						const dist = Math.sqrt(distSq);
						let nx = 0;
						let ny = 1;
						if (dist > 0.0001) {
							nx = dx / dist;
							ny = dy / dist;
						} else {
							const leftPen = curX_m - b.x;
							const rightPen = b.x + b.w - curX_m;
							const botPen = curY_m - b.y;
							const topPen = b.y + b.h - curY_m;
							const minPen = Math.min(
								leftPen,
								rightPen,
								botPen,
								topPen,
							);
							if (minPen === leftPen) {
								nx = -1;
								ny = 0;
							} else if (minPen === rightPen) {
								nx = 1;
								ny = 0;
							} else if (minPen === botPen) {
								nx = 0;
								ny = -1;
							} else {
								nx = 0;
								ny = 1;
							}
						}
						curX_m = closestX + nx * BALL_R;
						curY_m = closestY + ny * BALL_R;
						const dot = vx * nx + vy * ny;
						if (dot < 0) {
							vx = (vx - 2 * dot * nx) * 0.65;
							vy = (vy - 2 * dot * ny) * 0.65;
						}
					}
				}

				// Backboard Collision
				if (
					curX_m - BALL_R <= HOOP_X_M + BB_THICKNESS &&
					prevX - BALL_R > HOOP_X_M + BB_THICKNESS
				) {
					if (curY_m >= HOOP_Y_M && curY_m <= HOOP_Y_M + BB_HEIGHT) {
						curX_m = HOOP_X_M + BB_THICKNESS + BALL_R;
						vx = -vx * 0.6;
					}
				}

				// Rim Collisions
				let distFront = Math.hypot(
					curX_m - RIM_FRONT,
					curY_m - HOOP_Y_M,
				);
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
				if (
					!hasScored &&
					curY_m < HOOP_Y_M &&
					curY_m > HOOP_Y_M - 0.5 &&
					vy < 0
				) {
					let safeMargin = BALL_R * 0.6;
					if (
						curX_m > RIM_BACK + safeMargin &&
						curX_m < RIM_FRONT - safeMargin
					) {
						hasScored = true;
						score++;
						feedback = "HIT";
					}
				}

				if (curY_m < 0 || curX_m < -2 || curX_m > WORLD_WIDTH + 2) {
					if (!hasScored) feedback = "MISS";
					ballX = toX(curX_m);
					ballY = toY(curY_m);
					endShot(hasScored);
					return;
				}
			}

			ballX = toX(curX_m);
			ballY = toY(curY_m);
			if (!hasScored && curY_m > 0) {
				trajectory = [
					...trajectory,
					{ x: ballX, y: ballY, x_m: curX_m, y_m: curY_m },
				];
			}

			animationId = requestAnimationFrame(animate);
		}
		animate();
	}

	function endShot(scored: boolean) {
		isShooting = false;
		if (animationId) cancelAnimationFrame(animationId);
		endShotTimer = setTimeout(() => {
			if (!isShooting) {
				ballX = 0;
				ballY = 0;
				feedback = null;
				if (scored) {
					selectLevel(levelIndex + 1);
				}
			}
		}, 1800);
	}

	function restart() {
		score = 0;
		attempts = 0;
		levelIndex = 0;
		feedback = null;
		isShooting = false;
		trajectory = [];
		if (animationId) cancelAnimationFrame(animationId);
		if (endShotTimer) {
			clearTimeout(endShotTimer);
			endShotTimer = null;
		}
	}

	$effect(() => {
		registerActions({
			help: () => instructions.open(),
			restart,
		});
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
		if (endShotTimer) clearTimeout(endShotTimer);
	});
</script>

<div class="shotsim-container">
	<Instructions bind:this={instructions} gameId="shotsim" title="ShotSim">
		<p>
			<strong>Goal:</strong> Land the projectile perfectly in the target hoop
			across all levels.
		</p>
		<p>
			Adjust the cannon's angle and velocity to clear or fly under
			blockers and compensate for the wind vector. You can toggle wind,
			blockers, and telemetry at the top!
		</p>
	</Instructions>

	<div class="board-wrapper">
		<div class="game-stats">
			<div class="stat level-stat">
				<span class="label">LEVEL {levelIndex + 1}/{LEVELS.length}</span
				>
				<div class="level-nav">
					<button
						class="level-btn"
						onclick={() => selectLevel(levelIndex - 1)}
						disabled={isShooting}
						aria-label="Previous level">‹</button
					>
					<span class="level-name">{level.name}</span>
					<button
						class="level-btn"
						onclick={() => selectLevel(levelIndex + 1)}
						disabled={isShooting}
						aria-label="Next level">›</button
					>
				</div>
			</div>
			<div class="stat">
				<span class="label">SCORE</span>
				<span class="value">{score}</span>
			</div>
			<div class="stat">
				<span class="label">ATTEMPTS</span>
				<span class="value">{attempts}</span>
			</div>
			<div class="stat toggles">
				<label class="telemetry-toggle">
					<input type="checkbox" bind:checked={windEnabled} />
					<span>WIND</span>
				</label>
				<label class="telemetry-toggle">
					<input type="checkbox" bind:checked={blockersEnabled} />
					<span>BLOCKS</span>
				</label>
				<label class="telemetry-toggle">
					<input type="checkbox" bind:checked={showTelemetry} />
					<span>TELEMETRY</span>
				</label>
			</div>
		</div>

		<div class="court-container">
			<div class="court">
				{#if windEnabled && windMag > 0}
					{@const streakDur = Math.max(1.8, 4.4 - windMag * 0.7)}
					<div class="wind-field" aria-hidden="true">
						<div
							class="wind-stream-layer"
							style="transform: rotate({windAngleDeg}deg)"
						>
							{#each [12, 24, 36, 48, 60, 72, 84] as topPct, i}
								<div
									class="wind-streak"
									style="top: {topPct}%; --dur: {streakDur +
										(i % 3) * 0.45}s; --delay: -{(i * 0.65).toFixed(
										2,
									)}s; --len: {10 + (i % 3) * 5}%;"
								></div>
							{/each}
						</div>
					</div>
					<div class="wind-hud" aria-label="Wind vector">
						<svg
							class="wind-arrow"
							viewBox="0 0 36 24"
							style="transform: rotate({windAngleDeg}deg)"
						>
							<line
								x1="4"
								y1="12"
								x2="28"
								y2="12"
								stroke="currentColor"
								stroke-width="2.6"
								stroke-linecap="round"
							/>
							<polyline
								points="21,6 29,12 21,18"
								fill="none"
								stroke="currentColor"
								stroke-width="2.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<div class="wind-info">
							<span class="wind-title">WIND</span>
							<span class="wind-val">
								{windMag.toFixed(1)} m/s²
								{#if level.windY !== 0}
									({level.windX > 0
										? "+"
										: ""}{level.windX.toFixed(1)},
									{level.windY > 0
										? "+"
										: ""}{level.windY.toFixed(1)})
								{/if}
							</span>
						</div>
					</div>
				{/if}

				{#if blockersEnabled}
					{#each level.blockers as b}
						<div
							class="blocker"
							style="left: {toX(b.x)}%; bottom: {toY(
								b.y,
							)}%; width: {toX(b.w)}%; height: {toY(b.h)}%;"
						></div>
					{/each}
				{/if}
				<svg
					class="trajectory-svg"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
				>
					{#if trajectory.length > 1}
						<path
							d="M {trajectory
								.map((p) => `${p.x} ${100 - p.y}`)
								.join(' L ')}"
							fill="none"
							stroke="var(--app-text)"
							stroke-width="0.3"
							stroke-dasharray="1 1"
							opacity="0.6"
						/>
					{/if}
				</svg>

				{#if showTelemetry && trajectory.length > 1}
					<div
						class="telemetry-label initial-label"
						style="left: {toX(CANNON_X_M)}%; bottom: {toY(
							CANNON_Y_M + 7.0,
						)}%;"
					>
						<span>v₀ = {power.toFixed(1)} m/s</span>
						<span>θ₀ = {angle}°</span>
					</div>

					{#if peakHeight > 0}
						<div
							class="telemetry-label peak-label"
							style="left: {toX(
								trajectory.reduce(
									(max, p) => (p.y_m > max.y_m ? p : max),
									trajectory[0],
								).x_m,
							)}%; bottom: {toY(peakHeight + 2.5)}%;"
						>
							yₘₐₓ = {peakHeight.toFixed(2)} m
						</div>
					{/if}

					{#if totalDistance > 2}
						<div
							class="telemetry-label dist-label"
							style="left: {toX(
								trajectory[trajectory.length - 1].x_m,
							)}%; bottom: {toY(
								trajectory[trajectory.length - 1].y_m + 3.5,
							)}%;"
						>
							<span>Δx = {totalDistance.toFixed(2)} m</span>
							<span>t = {totalTime.toFixed(2)} s</span>
						</div>
					{/if}
				{/if}

				<div
					class="distance-label"
					style="left: {toX(HOOP_X_M)}%; width: {toX(
						CANNON_X_M - HOOP_X_M,
					)}%"
				>
					<div class="dist-line"></div>
					<span>{(CANNON_X_M - HOOP_X_M).toFixed(1)}m</span>
				</div>

				<svg
					class="hoop-svg"
					viewBox="0 0 {WORLD_WIDTH} {WORLD_HEIGHT}"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<!-- Stanchion / Support Pole -->
					<line
						x1={poleX}
						y1={WORLD_HEIGHT}
						x2={poleX}
						y2={bbTopY + 1.0}
						class="hoop-pole"
					/>
					<line
						x1={poleX}
						y1={bbTopY + 1.15}
						x2={HOOP_X_M}
						y2={bbTopY + 1.15}
						class="hoop-pole"
					/>
					<line
						x1={poleX}
						y1={bbTopY + 2.0}
						x2={HOOP_X_M}
						y2={bbTopY + 1.15}
						class="hoop-brace"
					/>
					<rect
						x={poleX - 0.45}
						y={WORLD_HEIGHT - 0.18}
						width="0.9"
						height="0.18"
						rx="0.04"
						class="hoop-pole-base"
					/>

					<!-- Net -->
					<g class="hoop-net">
						<polygon
							points="{netL1},{netTopY} {netR1},{netTopY} {netR2},{netBotY} {netL2},{netBotY}"
							class="hoop-net-fill"
						/>
						<line
							x1={netL1}
							y1={netTopY}
							x2={netL2 + 0.25}
							y2={netBotY}
						/>
						<line
							x1={netL1 + 0.31}
							y1={netTopY}
							x2={netR2 - 0.22}
							y2={netBotY}
						/>
						<line
							x1={netL1 + 0.62}
							y1={netTopY}
							x2={netR2}
							y2={netBotY}
						/>
						<line
							x1={netR1}
							y1={netTopY}
							x2={netR2 - 0.25}
							y2={netBotY}
						/>
						<line
							x1={netR1 - 0.31}
							y1={netTopY}
							x2={netL2 + 0.22}
							y2={netBotY}
						/>
						<line
							x1={netR1 - 0.62}
							y1={netTopY}
							x2={netL2}
							y2={netBotY}
						/>
						<line x1={netL1} y1={netTopY} x2={netL2} y2={netBotY} />
						<line x1={netR1} y1={netTopY} x2={netR2} y2={netBotY} />
						<line
							x1={(netL1 + netL2) / 2}
							y1={(netTopY + netBotY) / 2}
							x2={(netR1 + netR2) / 2}
							y2={(netTopY + netBotY) / 2}
						/>
						<line x1={netL2} y1={netBotY} x2={netR2} y2={netBotY} />
					</g>

					<!-- Backboard -->
					<rect
						x={HOOP_X_M}
						y={bbTopY}
						width={BB_THICKNESS}
						height={bbBottomY - bbTopY}
						rx="0.06"
						class="hoop-backboard"
					/>
					<rect
						x={HOOP_X_M + BB_THICKNESS - 0.07}
						y={hoopY - 0.95}
						width="0.07"
						height="0.95"
						rx="0.02"
						class="hoop-target-stripe"
					/>

					<!-- Rim & Bracket -->
					<line
						x1={HOOP_X_M + BB_THICKNESS}
						y1={hoopY}
						x2={RIM_BACK}
						y2={hoopY}
						class="hoop-bracket"
					/>
					<line
						x1={RIM_BACK}
						y1={hoopY}
						x2={RIM_FRONT}
						y2={hoopY}
						class="hoop-rim"
					/>
					<circle
						cx={RIM_BACK}
						cy={hoopY}
						r="0.09"
						class="hoop-rim-cap"
					/>
					<circle
						cx={RIM_FRONT}
						cy={hoopY}
						r="0.09"
						class="hoop-rim-cap"
					/>
				</svg>

				<div
					class="cannon-base"
					style="left: {toX(CANNON_X_M - 1.0)}%; bottom: {toY(
						CANNON_Y_M,
					)}%; width: {toX(2.0)}%; height: {toY(0.85)}%;"
				></div>
				<div
					class="cannon-barrel"
					style="right: {100 - toX(CANNON_X_M)}%; bottom: {toY(
						CANNON_PIVOT_Y_M - BARREL_DIA_M / 2,
					)}%; width: {toX(BARREL_LEN_M)}%; height: {toY(
						BARREL_DIA_M,
					)}%; transform: rotate({angle}deg)"
				>
					<div class="barrel-stats">
						<span>{angle}°</span>
						<span>{power}m/s</span>
					</div>
				</div>
				<div
					class="cannon-hub"
					style="left: {toX(CANNON_X_M)}%; bottom: {toY(
						CANNON_PIVOT_Y_M,
					)}%; width: {toX(0.9)}%; height: {toY(0.9)}%;"
				></div>

				{#if isShooting}
					<div
						class="ball"
						style="left: {ballX}%; bottom: {ballY}%; width: {toX(
							BALL_R * 2,
						)}%; height: {toY(BALL_R * 2)}%;"
					></div>
				{/if}

				{#if feedback}
					<div class="feedback" in:fade>{feedback}</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="bottom-bar">
		<div class="controls">
			<div class="control-group">
				<label for="angle">ANGLE: {angle}°</label>
				<div class="input-row">
					<button
						class="step-btn"
						onclick={() => (angle = Math.max(0, angle - 1))}
						disabled={isShooting}>-</button
					>
					<input
						type="range"
						id="angle"
						min="0"
						max="90"
						bind:value={angle}
						disabled={isShooting}
					/>
					<button
						class="step-btn"
						onclick={() => (angle = Math.min(90, angle + 1))}
						disabled={isShooting}>+</button
					>
				</div>
			</div>

			<div class="control-group">
				<label for="power">VELOCITY: {power}m/s</label>
				<div class="input-row">
					<button
						class="step-btn"
						onclick={() => (power = Math.max(5, power - 0.5))}
						disabled={isShooting}>-</button
					>
					<input
						type="range"
						id="power"
						min="5"
						max="25"
						step="0.5"
						bind:value={power}
						disabled={isShooting}
					/>
					<button
						class="step-btn"
						onclick={() => (power = Math.min(25, power + 0.5))}
						disabled={isShooting}>+</button
					>
				</div>
			</div>

			<button class="shoot-btn" onclick={shoot} disabled={isShooting}
				>SHOOT</button
			>
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
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 1vmin 4vmin;
		box-sizing: border-box;
		overflow: hidden;
		min-height: 0;
	}

	.game-stats {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: clamp(1rem, 4vmin, 3.5rem);
		margin-bottom: 2vmin;
		width: 100%;
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25vmin;
	}

	.stat .label {
		font-size: 1.15vmin;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--game-text-muted);
	}

	.stat .value {
		font-size: 2.4vmin;
		font-weight: 900;
		color: var(--game-text-primary);
	}

	.level-nav {
		display: flex;
		align-items: center;
		gap: 0.8vmin;
	}

	.level-name {
		font-size: 1.6vmin;
		font-weight: 800;
		color: var(--app-text);
		letter-spacing: 0.06em;
		min-width: 12vmin;
		text-align: center;
	}

	.level-btn {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
		color: var(--game-text-primary);
		width: 3vmin;
		height: 3vmin;
		border-radius: 0.6vmin;
		cursor: pointer;
		font-weight: 900;
		font-size: 1.8vmin;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.level-btn:hover:not(:disabled) {
		border-color: var(--app-text);
		background: color-mix(
			in srgb,
			var(--panel-bg) 80%,
			var(--app-text) 20%
		);
	}

	.level-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.toggles {
		flex-direction: row;
		gap: 2vmin;
	}

	.court-container {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-height: 0;
		overflow: hidden;
		container-type: size;
	}

	.court {
		position: relative;
		background: var(--panel-bg);
		border-radius: 2vmin;
		border: 1px solid var(--panel-border);
		overflow: hidden;
		width: min(100cqw, 200cqh);
		height: min(100cqh, 50cqw);
	}

	.bottom-bar {
		flex-shrink: 0;
		padding: 1vmin 3vmin 2vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
	}

	.controls {
		display: flex;
		gap: clamp(0.9rem, 3vmin, 2.2rem);
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 100%;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5vmin;
		flex: 1;
		min-width: 0;
		max-width: 28vmin;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 1.5vmin;
	}

	.step-btn {
		background: var(--panel-bg);
		border: 1px solid var(--panel-border);
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
		background: color-mix(
			in srgb,
			var(--panel-bg) 85%,
			var(--app-text) 15%
		);
		color: var(--app-text);
	}

	input[type="range"] {
		flex: 1;
		appearance: none;
		-webkit-appearance: none;
		height: 0.6vmin;
		background: var(--panel-border);
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
		flex-shrink: 0;
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: none;
		padding: 0 clamp(1.5rem, 4vmin, 3.2rem);
		height: clamp(2.6rem, 6.5vmin, 4.2rem);
		font-size: clamp(0.95rem, 2.2vmin, 1.35rem);
		font-weight: 900;
		border-radius: 1.4vmin;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 10px 20px -5px rgba(255, 110, 97, 0.4);
		letter-spacing: 0.12em;
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

	.initial-label {
		color: var(--app-text);
		align-items: center;
		margin-left: -10vmin;
	}
	.peak-label {
		color: var(--color-apple);
		align-items: center;
		margin-left: -10vmin;
	}
	.dist-label {
		color: var(--app-text);
		align-items: center;
		margin-left: -10vmin;
	}

	.distance-label {
		position: absolute;
		bottom: 2vmin;
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
		border-top: 1px dashed var(--panel-border);
		margin-bottom: 0.5vmin;
	}

	.cannon-base {
		position: absolute;
		background: var(--app-text);
		border-radius: 1vmin 1vmin 0.2vmin 0.2vmin;
		z-index: 2;
	}
	.cannon-hub {
		position: absolute;
		transform: translate(-50%, 50%);
		background: var(--app-text);
		border: 2px solid var(--panel-bg);
		border-radius: 50%;
		z-index: 4;
		pointer-events: none;
	}
	.cannon-barrel {
		position: absolute;
		box-sizing: border-box;
		background: color-mix(in srgb, var(--app-text) 78%, black 22%);
		border-radius: 0.25vmin 1.2vmin 1.2vmin 0.25vmin;
		transform-origin: right center;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding-left: 0.9vmin;
		z-index: 3;
	}
	.barrel-stats {
		display: flex;
		flex-direction: column;
		font-size: 1.15vmin;
		line-height: 1.1;
		font-weight: 800;
		color: var(--app-text);
	}

	.hoop-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}
	.hoop-pole,
	.hoop-brace {
		stroke: var(--game-text-soft);
		stroke-linecap: round;
	}
	.hoop-pole {
		stroke-width: 0.22;
	}
	.hoop-brace {
		stroke-width: 0.12;
		opacity: 0.7;
	}
	.hoop-pole-base {
		fill: var(--game-text-soft);
	}
	.hoop-backboard {
		fill: color-mix(in srgb, var(--app-text) 10%, var(--panel-bg));
		stroke: var(--game-text-muted);
		stroke-width: 0.06;
	}
	.hoop-target-stripe {
		fill: var(--color-bittersweet);
		opacity: 0.9;
	}
	.hoop-bracket {
		stroke: var(--game-text-muted);
		stroke-width: 0.14;
	}
	.hoop-rim {
		stroke: var(--color-bittersweet);
		stroke-width: 0.16;
		stroke-linecap: round;
	}
	.hoop-rim-cap {
		fill: var(--color-bittersweet);
	}
	.hoop-net-fill {
		fill: color-mix(in srgb, var(--app-text) 4%, transparent);
		stroke: none;
	}
	.hoop-net line {
		stroke: var(--app-text);
		stroke-opacity: 0.35;
		stroke-width: 0.045;
		stroke-linecap: round;
	}

	.ball {
		position: absolute;
		transform: translate(-50%, 50%);
		background: var(--color-bittersweet);
		border-radius: 50%;
		z-index: 10;
		box-shadow: 0 0 10px rgba(255, 110, 97, 0.35);
	}

	.wind-field {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 1;
	}

	.wind-stream-layer {
		position: absolute;
		inset: -35%;
		transform-origin: center;
	}

	.wind-streak {
		position: absolute;
		left: 0;
		width: var(--len, 14%);
		height: 2px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			color-mix(in srgb, var(--color-golden) 55%, var(--app-text) 45%) 55%,
			transparent 100%
		);
		opacity: 0;
		animation: wind-drift var(--dur, 3s) linear var(--delay, 0s) infinite;
	}

	@keyframes wind-drift {
		0% {
			transform: translateX(-20%);
			opacity: 0;
		}
		15% {
			opacity: 0.38;
		}
		85% {
			opacity: 0.38;
		}
		100% {
			transform: translateX(750%);
			opacity: 0;
		}
	}

	.wind-hud {
		position: absolute;
		top: 1.8vmin;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 1.1vmin;
		padding: 0.7vmin 1.5vmin;
		background: color-mix(
			in srgb,
			var(--panel-bg) 88%,
			var(--app-text) 12%
		);
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		z-index: 6;
		pointer-events: none;
		color: var(--color-golden);
	}

	.wind-arrow {
		width: 3.4vmin;
		height: 2.3vmin;
		flex-shrink: 0;
	}

	.wind-info {
		display: flex;
		align-items: baseline;
		gap: 0.7vmin;
	}

	.wind-title {
		font-size: 1.15vmin;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--game-text-muted);
	}

	.wind-val {
		font-size: 1.45vmin;
		font-weight: 800;
		color: var(--app-text);
		white-space: nowrap;
	}

	.blocker {
		position: absolute;
		background: repeating-linear-gradient(
			-45deg,
			color-mix(in srgb, var(--color-golden) 24%, var(--panel-bg)),
			color-mix(in srgb, var(--color-golden) 24%, var(--panel-bg)) 0.7vmin,
			color-mix(in srgb, var(--app-text) 10%, var(--panel-bg)) 0.7vmin,
			color-mix(in srgb, var(--app-text) 10%, var(--panel-bg)) 1.4vmin
		);
		border: 1.5px solid
			color-mix(in srgb, var(--color-golden) 70%, var(--panel-border));
		border-radius: 0.5vmin;
		z-index: 3;
		box-sizing: border-box;
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
		color: var(--app-text);
	}

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
