<script lang="ts">
	import Instructions from "./Instructions.svelte";
	import InGameMenu from "./InGameMenu.svelte";
	import { fade } from "svelte/transition";
	import { onMount } from "svelte";

	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: any;
	}>();
	let instructions: any;

	const POPULATION_SIZE = 400;
	const BASE_SPEED = 1.8;
	const RADIUS = 5;
	const TOUCH_DIST_SQ = (RADIUS * 2.5) ** 2;
	const WIDTH = 800;
	const HEIGHT = 600;
	const HOSPITAL_CAPACITY = 50;
	const INITIAL_BUDGET = 140000;

	type State = "S" | "I" | "R" | "D";
	interface Person {
		x: number;
		y: number;
		baseVx: number;
		baseVy: number;
		state: State;
		infectionDay: number;
	}

	const SPEED_OPTIONS = [
		{ value: 0.25, label: "1x" },
		{ value: 0.5, label: "2x" },
		{ value: 1, label: "4x" },
		{ value: 2, label: "8x" },
	] as const;
	type SimSpeed = (typeof SPEED_OPTIONS)[number]["value"];

	let people: Person[] = [];
	let stats = $state({ s: 0, i: 0, r: 0, d: 0 });
	let days = $state(0);
	let isGameOver = $state(false);
	let isPaused = $state(true);
	let simSpeed = $state<SimSpeed>(1);
	let canvasEl: HTMLCanvasElement | undefined = $state();

	// Simulation Parameters (Controllable)
	let mobilityFactor = $state(0.8);
	let testingIsolation = $state(0); // T: 0 to 1
	let sanitaryProtocols = $state(0); // P: 0 to 1

	// Biological Parameters (Difficulty-locked)
	let difficulty = $state<"EASY" | "MED" | "HARD">("MED");
	let transmissionBase = $derived(
		difficulty === "EASY" ? 0.7 : difficulty === "MED" ? 0.85 : 1.0,
	);
	let immuneRate = $derived(
		difficulty === "EASY" ? 0.25 : difficulty === "MED" ? 0.15 : 0.05,
	);
	let durationBase = $derived(
		difficulty === "EASY" ? 160 : difficulty === "MED" ? 210 : 250,
	);
	let fatalityRate = $derived(
		difficulty === "EASY" ? 0.01 : difficulty === "MED" ? 0.02 : 0.05,
	);

	// Derived System Stats
	let transmissionChance = $derived(
		transmissionBase * (1 - 0.3 * sanitaryProtocols),
	);
	let recoveryDuration = $derived(
		durationBase * (1 - 0.3 * testingIsolation),
	);

	// Economic Variables
	let budget = $state(INITIAL_BUDGET);
	// Mobility is free at 1.0 (100%), costs increase quadratically as mobility drops
	let costMobility = $derived(
		Math.floor(12000 * Math.pow(1 - mobilityFactor, 2)),
	);
	let costHealthDrain = $derived.by(() => {
		if (stats.i <= HOSPITAL_CAPACITY) return 0;
		// Quadratic scaling: 1.5 * (I - 50)^2
		return Math.floor(1.5 * Math.pow(stats.i - HOSPITAL_CAPACITY, 2));
	});
	let costTesting = $derived(Math.floor(1500 * testingIsolation));
	let costSanitary = $derived(Math.floor(500 * sanitaryProtocols));

	let totalDailyDrain = $derived(
		costMobility + costHealthDrain + costTesting + costSanitary,
	);

	let history = $state<{ s: number; i: number; r: number; d: number }[]>([]);
	let activeEncounters = new Set<number>(); // Numeric pair keys: i * POPULATION_SIZE + j

	function syncStats() {
		let s = 0,
			i = 0,
			r = 0,
			d = 0;
		for (const p of people) {
			if (p.state === "S") s++;
			else if (p.state === "I") i++;
			else if (p.state === "R") r++;
			else if (p.state === "D") d++;
		}
		stats = { s, i, r, d };
	}

	function initSim() {
		const newPeople: Person[] = [];
		budget = INITIAL_BUDGET;
		const initialInfected =
			difficulty === "HARD" ? 4 : difficulty === "MED" ? 2 : 1;

		for (let i = 0; i < POPULATION_SIZE; i++) {
			let isImmune = Math.random() < immuneRate;
			const isInfected = i < initialInfected;
			const angle = Math.random() * Math.PI * 2;

			if (isInfected) isImmune = false; // Initial infected cannot be immune

			let x = Math.random() * WIDTH;
			let y = Math.random() * HEIGHT;
			if (isInfected) {
				if (difficulty === "HARD") {
					// Place each of the 4 infected agents in a distinct quadrant
					const col = i % 2;
					const row = Math.floor(i / 2);
					x = (col * 0.5 + Math.random() * 0.5) * WIDTH;
					y = (row * 0.5 + Math.random() * 0.5) * HEIGHT;
				} else if (difficulty === "MED") {
					// Place each of the 2 infected agents in a distinct half
					x = (i * 0.5 + Math.random() * 0.5) * WIDTH;
				}
			}

			newPeople.push({
				x,
				y,
				baseVx: Math.cos(angle) * BASE_SPEED,
				baseVy: Math.sin(angle) * BASE_SPEED,
				state: isImmune ? "R" : isInfected ? "I" : "S",
				infectionDay: isInfected ? 0 : -1,
			});
		}
		people = newPeople;
		syncStats();
		days = 0;
		history = [];
		activeEncounters.clear();
		isGameOver = false;
		isPaused = true;
		drawCanvas();
	}

	function step() {
		if (isPaused || isGameOver) return;

		days++;

		// Linear budget drawdown: deduct 1/60th of daily drain per 60Hz frame
		budget -= totalDailyDrain / 60;
		if (budget <= 0) {
			budget = 0;
			isGameOver = true;
			return;
		}

		const physSpeed = 0.32 + 0.68 * mobilityFactor;
		const len = people.length;

		for (let i = 0; i < len; i++) {
			const p = people[i];
			if (p.state === "D") continue;

			p.x += p.baseVx * physSpeed;
			p.y += p.baseVy * physSpeed;

			if (p.x < RADIUS) {
				p.x = RADIUS;
				p.baseVx = Math.abs(p.baseVx);
			} else if (p.x > WIDTH - RADIUS) {
				p.x = WIDTH - RADIUS;
				p.baseVx = -Math.abs(p.baseVx);
			}
			if (p.y < RADIUS) {
				p.y = RADIUS;
				p.baseVy = Math.abs(p.baseVy);
			} else if (p.y > HEIGHT - RADIUS) {
				p.y = HEIGHT - RADIUS;
				p.baseVy = -Math.abs(p.baseVy);
			}

			if (p.state === "I") {
				p.infectionDay++;
				if (p.infectionDay > recoveryDuration) {
					p.state = Math.random() < fatalityRate ? "D" : "R";
					continue;
				}

				for (let j = 0; j < len; j++) {
					if (i === j) continue;
					const other = people[j];
					if (other.state === "D") continue;

					const dx = p.x - other.x;
					const dy = p.y - other.y;
					const distSq = dx * dx + dy * dy;
					const encounterKey =
						i < j
							? i * POPULATION_SIZE + j
							: j * POPULATION_SIZE + i;

					if (distSq < TOUCH_DIST_SQ) {
						if (!activeEncounters.has(encounterKey)) {
							activeEncounters.add(encounterKey);
							if (
								other.state === "S" &&
								Math.random() < transmissionChance
							) {
								other.state = "I";
								other.infectionDay = 0;
							}
						}
					} else {
						activeEncounters.delete(encounterKey);
					}
				}
			}
		}

		syncStats();
		if (days % 10 === 0) {
			history.push({ ...stats });
			// Downsample if history grows very large to keep SVG curve crisp
			if (history.length > 240) {
				history = history.filter((_, idx) => idx % 2 === 0);
			}
		}
		if (stats.i === 0) isGameOver = true;
	}

	function drawCanvas() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, WIDTH, HEIGHT);

		// Draw deceased first so living agents render on top
		for (const p of people) {
			if (p.state !== "D") continue;
			ctx.globalAlpha = 0.45;
			ctx.fillStyle = "#555";
			ctx.beginPath();
			ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		for (const p of people) {
			if (p.state === "D") continue;

			if (p.state === "S") {
				ctx.fillStyle = "#6fb1fc";
			} else if (p.state === "R") {
				ctx.fillStyle = "#69af4b";
			} else {
				ctx.fillStyle = "#ff6e61";
			}

			// Infection spark ring for newly infected agents
			if (p.state === "I" && p.infectionDay < 24) {
				const t = p.infectionDay / 24;
				ctx.save();
				ctx.strokeStyle = `rgba(255, 255, 255, ${1 - t})`;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(p.x, p.y, RADIUS + t * 8, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();
			}

			ctx.beginPath();
			ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	let rafId: number;
	onMount(() => {
		initSim();
		let lastTime = performance.now();
		let accumulator = 0;
		const STEP_MS = 1000 / 60;

		const loop = (now: number) => {
			const dt = Math.min(now - lastTime, 100);
			lastTime = now;

			if (!isPaused && !isGameOver) {
				accumulator += dt * simSpeed;
				while (accumulator >= STEP_MS) {
					step();
					accumulator -= STEP_MS;
					if (isGameOver) break;
				}
				drawCanvas();
			} else {
				accumulator = 0;
			}

			rafId = requestAnimationFrame(loop);
		};

		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	});

	$effect(() => {
		registerActions({
			help: () => instructions.open(),
		});
	});
</script>

<div class="game-inner">
	<Instructions
		bind:this={instructions}
		gameId="epidemic_sim"
		title="Outbreak Management: Optimization Problem"
	>
		<p>
			<strong>The Challenge:</strong> Contain the outbreak with minimum loss
			of life while keeping the economy solvent.
		</p>
		<ul
			style="font-size: 0.9em; opacity: 0.8; margin: 1vmin 0; padding-left: 3vmin;"
		>
			<li>
				<strong>Immune Rate:</strong> Percentage of the population starting
				with immunity (based on Difficulty).
			</li>
			<li>
				<strong>Lockdowns (Low Mobility):</strong> Reduces spread but
				causes massive <strong>daily economic drain</strong>.
			</li>
			<li>
				<strong>Goal:</strong> Reach zero active infections with at
				least <strong>$1</strong> remaining in the budget.
			</li>
		</ul>
		<p>Can you find the balance between health and the economy?</p>
	</Instructions>

	<InGameMenu {onBack} onHelp={() => instructions.open()} onRestart={initSim}>
		{#snippet rightControls()}
			<div class="speed-group" role="group" aria-label="Simulation speed">
				{#each SPEED_OPTIONS as opt}
					<button
						class="nav-extra-btn speed-btn {simSpeed === opt.value
							? 'active'
							: ''}"
						onclick={() => (simSpeed = opt.value)}
						title="Set simulation speed to {opt.label}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
			<button
				class="nav-extra-btn {isPaused ? 'is-paused' : 'is-running'}"
				onclick={() => (isPaused = !isPaused)}
			>
				{isPaused ? "START" : "STOP"}
			</button>
		{/snippet}
	</InGameMenu>

	<div class="economic-bar" in:fade>
		<div class="stat-main">
			<span class="label">BUDGET</span>
			<span class="value budget-val {budget < 30000 ? 'low' : ''}"
				>${Math.max(0, Math.floor(budget)).toLocaleString()}</span
			>
		</div>
		<div class="stat-sub">
			<span class="label">TOTAL DAILY DRAIN</span>
			<span class="value cost-val"
				>-${totalDailyDrain.toLocaleString()}/day</span
			>
			<div class="drain-breakdown">
				<span>Mob: {costMobility}</span>
				<span class={stats.i > HOSPITAL_CAPACITY ? "over-cap" : ""}
					>Hlth: {costHealthDrain}</span
				>
				<span>Test: {costTesting}</span>
				<span>Protocols: {costSanitary}</span>
			</div>
		</div>
		<div class="stat-sub">
			<span class="label">HOSPITAL LOAD</span>
			<span
				class="value {stats.i > HOSPITAL_CAPACITY
					? 'cost-val'
					: 'ok-val'}">{stats.i} / {HOSPITAL_CAPACITY}</span
			>
			<div class="drain-breakdown">
				<span>Day {Math.floor(days / 60)}</span>
			</div>
		</div>
	</div>

	<div class="main-layout">
		<div class="sim-wrapper">
			<div class="sim-container">
				<canvas
					bind:this={canvasEl}
					width={WIDTH}
					height={HEIGHT}
					class="sim-canvas"
				></canvas>

				{#if isPaused && !isGameOver && days === 0}
					<div class="start-hint" in:fade>
						Choose difficulty &amp; press <strong>START</strong> to begin
					</div>
				{/if}

				{#if isGameOver}
					<div class="overlay" in:fade>
						<div class="overlay-content">
							{#if budget <= 0}
								<h2 class="lost">ECONOMIC COLLAPSE</h2>
								<p>
									The economy failed before the virus was
									contained.
								</p>
							{:else if stats.d > POPULATION_SIZE * 0.1}
								<h2 class="lost">PUBLIC HEALTH CRISIS</h2>
								<p>
									Outbreak ended, but casualties exceeded 10%
									of population.
								</p>
							{:else}
								<h2 class="won">OUTBREAK CONTAINED</h2>
								<p>
									Successful management! The population is
									safe.
								</p>
							{/if}
							<p>
								Simulation Duration: {Math.floor(days / 60)} Days
								| Final Deceased: {stats.d}
							</p>
							<button class="action-btn" onclick={initSim}
								>RESET CHALLENGE</button
							>
						</div>
					</div>
				{/if}
			</div>

			<div class="data-bar-attached" in:fade>
				<div class="stat">
					<span class="label">SUSCEPTIBLE</span>
					<span class="value s-val">{stats.s}</span>
				</div>
				<div class="stat">
					<span class="label">INFECTED</span>
					<span class="value i-val">{stats.i}</span>
				</div>
				<div class="stat">
					<span class="label">RECOVERED</span>
					<span class="value r-val">{stats.r}</span>
				</div>
				<div class="stat">
					<span class="label">DECEASED</span>
					<span class="value d-val">{stats.d}</span>
				</div>
			</div>
		</div>

		<div class="controls-panel">
			<div class="control-group">
				<span class="control-label">Outbreak Difficulty</span>
				<div class="difficulty-group">
					<button
						class="diff-btn {difficulty === 'EASY' ? 'active' : ''}"
						disabled={days > 0}
						onclick={() => {
							difficulty = "EASY";
							if (days === 0) initSim();
						}}
					>
						EASY
					</button>
					<button
						class="diff-btn {difficulty === 'MED' ? 'active' : ''}"
						disabled={days > 0}
						onclick={() => {
							difficulty = "MED";
							if (days === 0) initSim();
						}}
					>
						MED
					</button>
					<button
						class="diff-btn {difficulty === 'HARD' ? 'active' : ''}"
						disabled={days > 0}
						onclick={() => {
							difficulty = "HARD";
							if (days === 0) initSim();
						}}
					>
						HARD
					</button>
				</div>
				<div class="bio-stats">
					<div class="bio-row">
						<span>Immune Rate:</span>
						<span>{Math.round(immuneRate * 100)}%</span>
					</div>
					<div class="bio-row">
						<span>Contagiousness:</span>
						<span>
							{Math.round(transmissionBase * 100)}%
							{#if sanitaryProtocols > 0}
								→ <strong style="color: #69af4b;"
									>{Math.round(
										transmissionChance * 100,
									)}%</strong
								>
							{/if}
						</span>
					</div>
					<div class="bio-row">
						<span>Infection Duration:</span>
						<span>
							{Math.round(durationBase / 60)}d
							{#if testingIsolation > 0}
								→ <strong style="color: #69af4b;"
									>{Math.round(
										recoveryDuration / 60,
									)}d</strong
								>
							{/if}
						</span>
					</div>
					<div class="bio-row">
						<span>Fatality Rate:</span>
						<span>{(fatalityRate * 100).toFixed(1)}%</span>
					</div>
				</div>
			</div>

			<div class="control-group controllable">
				<label for="mobility-slider"
					>Population Mobility: {(mobilityFactor * 100).toFixed(
						0,
					)}%</label
				>
				<input
					id="mobility-slider"
					type="range"
					min="0.2"
					max="1"
					step="0.01"
					bind:value={mobilityFactor}
				/>
			</div>

			<div class="control-group controllable">
				<label for="quarantine-slider"
					>Quarantine & Testing: {testingIsolation === 0
						? "OFF"
						: testingIsolation === 0.5
							? "STANDARD"
							: "INTENSIVE"}</label
				>
				<input
					id="quarantine-slider"
					type="range"
					min="0"
					max="1"
					step="0.5"
					bind:value={testingIsolation}
				/>
				<div class="hint">
					Reduces Duration | ${testingIsolation * 1500}/day
				</div>
			</div>

			<div class="control-group controllable">
				<label for="sanitary-slider"
					>Sanitary Protocols: {sanitaryProtocols === 0
						? "OFF"
						: sanitaryProtocols === 0.5
							? "STANDARD"
							: "INTENSIVE"}</label
				>
				<input
					id="sanitary-slider"
					type="range"
					min="0"
					max="1"
					step="0.5"
					bind:value={sanitaryProtocols}
				/>
				<div class="hint">
					Reduces Transmission | ${sanitaryProtocols * 500}/day
				</div>
			</div>

			<div class="history-chart">
				<svg viewBox="0 0 100 50" preserveAspectRatio="none">
					<line
						x1="0"
						y1={50 - (HOSPITAL_CAPACITY / POPULATION_SIZE) * 50}
						x2="100"
						y2={50 - (HOSPITAL_CAPACITY / POPULATION_SIZE) * 50}
						stroke="rgba(255, 255, 255, 0.25)"
						stroke-width="0.6"
						stroke-dasharray="2,2"
					/>
					{#if history.length > 1}
						{@const maxIdx = history.length - 1}
						{@const dPoints = history
							.map(
								(h, idx) =>
									`${(idx / maxIdx) * 100},${50 - (h.d / POPULATION_SIZE) * 50}`,
							)
							.join(" ")}
						{@const idPoints = history
							.map(
								(h, idx) =>
									`${(idx / maxIdx) * 100},${50 - ((h.i + h.d) / POPULATION_SIZE) * 50}`,
							)
							.join(" ")}
						<polygon
							points="0,50 {idPoints} 100,50"
							fill="rgba(255, 110, 97, 0.45)"
						/>
						<polyline
							points={idPoints}
							fill="none"
							stroke="#ff6e61"
							stroke-width="1.2"
						/>
						<polygon
							points="0,50 {dPoints} 100,50"
							fill="rgba(100, 100, 100, 0.7)"
						/>
					{/if}
				</svg>
				<div class="chart-label">
					PANDEMIC CURVE (DASHED = {HOSPITAL_CAPACITY} CAP)
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--game-text-primary);
	}

	.nav-extra-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		color: var(--game-text-muted);
		padding: 1vmin 2vmin;
		border-radius: 1vmin;
		font-weight: 800;
		font-size: clamp(0.75rem, 1.8vmin, 1rem);
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-extra-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--app-text);
		color: var(--game-text-primary);
	}

	.nav-extra-btn.is-paused {
		background: rgba(105, 175, 75, 0.2);
		border-color: #69af4b;
		color: #a8e08e;
	}

	.nav-extra-btn.is-paused:hover {
		background: #69af4b;
		color: #0b1409;
	}

	.nav-extra-btn.is-running {
		background: rgba(255, 110, 97, 0.2);
		border-color: var(--color-bittersweet);
		color: #ff9a90;
	}

	.nav-extra-btn.is-running:hover {
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.speed-group {
		display: inline-flex;
		gap: 0.4vmin;
	}

	.nav-extra-btn.speed-btn {
		padding: 1vmin 1.2vmin;
		min-width: auto;
		text-align: center;
	}

	.nav-extra-btn.speed-btn.active {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: var(--game-text-on-accent);
	}

	.main-layout {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 25vmin;
		gap: 2vmin;
		padding: 0 2vmin 2vmin 2vmin;
		min-height: 0;
	}

	.sim-wrapper {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 2vmin;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		align-self: center; /* Prevent stretching to match controls height */
		width: 100%;
	}

	.sim-container {
		aspect-ratio: 800 / 600;
		position: relative;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
		width: 100%;
	}

	.data-bar-attached {
		display: flex;
		justify-content: center;
		gap: 5vmin;
		padding: 2vmin;
		background: rgba(255, 255, 255, 0.05);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 10vmin;
	}

	.stat .label {
		font-size: 1vmin;
		color: var(--game-text-soft);
		font-weight: 800;
	}

	.stat .value {
		font-size: 2.5vmin;
		font-weight: 900;
	}

	.s-val {
		color: #6fb1fc;
	}
	.i-val {
		color: #ff6e61;
	}
	.r-val {
		color: #69af4b;
	}
	.d-val {
		color: #888;
	}

	.economic-bar {
		display: flex;
		justify-content: center;
		gap: 8vmin;
		padding: 2vmin;
		background: rgba(255, 255, 255, 0.03);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		margin-bottom: 2vmin;
		align-items: center;
	}

	.stat-main {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.stat-sub {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		padding-left: 3vmin;
	}

	.budget-val {
		font-size: 3vmin;
		font-weight: 900;
		color: #69af4b;
	}

	.budget-val.low {
		color: var(--color-bittersweet);
		animation: pulse 1s infinite;
	}

	.cost-val {
		font-size: 2vmin;
		font-weight: 800;
		color: #ff6e61;
	}

	.drain-breakdown {
		display: flex;
		gap: 1.5vmin;
		font-size: 1.1vmin;
		opacity: 0.5;
		font-weight: 800;
	}

	.lost {
		color: #ff6e61 !important;
	}
	.won {
		color: #69af4b !important;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}

	.ok-val {
		font-size: 2vmin;
		font-weight: 800;
		color: #69af4b;
	}

	.over-cap {
		color: #ff6e61;
		opacity: 1;
	}

	.sim-canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.start-hint {
		position: absolute;
		bottom: 1.5vmin;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 0.8vmin 1.8vmin;
		border-radius: 999px;
		font-size: clamp(0.75rem, 1.4vmin, 0.95rem);
		color: var(--game-text-primary);
		pointer-events: none;
		white-space: nowrap;
	}

	.controls-panel {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--panel-border);
		border-radius: 2vmin;
		padding: 2vmin;
		display: flex;
		flex-direction: column;
		gap: 2vmin;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.8vmin;
	}

	.control-group label,
	.control-group .control-label {
		font-size: clamp(0.75rem, 1.2vmin, 0.9rem);
		font-weight: 800;
		color: var(--game-text-muted);
	}

	.control-group input[type="range"] {
		width: 100%;
		accent-color: var(--color-bittersweet);
	}

	.difficulty-group {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8vmin;
		margin-top: 0.5vmin;
	}

	.diff-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid color-mix(in srgb, var(--app-text) 22%, transparent);
		color: var(--game-text-muted);
		padding: 0.9vmin 0.5vmin;
		border-radius: 0.8vmin;
		font-size: clamp(0.7rem, 1.2vmin, 0.85rem);
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
	}

	.diff-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		border-color: color-mix(in srgb, var(--app-text) 45%, transparent);
		color: var(--game-text-primary);
	}

	.diff-btn.active {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		box-shadow: 0 0 15px rgba(255, 110, 97, 0.3);
	}

	.diff-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.bio-stats {
		margin-top: 1vmin;
		padding: 1vmin;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 1vmin;
		display: flex;
		flex-direction: column;
		gap: 0.5vmin;
	}

	.bio-row {
		display: flex;
		justify-content: space-between;
		font-size: clamp(0.7rem, 1.1vmin, 0.85rem);
		font-weight: 700;
	}

	.bio-row span:first-child {
		color: var(--game-text-soft);
	}

	.bio-row span:last-child {
		color: var(--game-text-primary);
	}

	.controllable {
		background: rgba(255, 255, 255, 0.03);
		padding: 1.5vmin;
		border-radius: 1vmin;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.controllable .hint {
		font-size: clamp(0.65rem, 1vmin, 0.8rem);
		color: var(--color-bittersweet);
		opacity: 0.7;
		font-style: italic;
		margin-top: 0.5vmin;
	}

	.history-chart {
		margin-top: auto;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 1vmin;
		padding: 1vmin;
		height: 12vmin;
		display: flex;
		flex-direction: column;
	}

	.history-chart svg {
		flex: 1;
		width: 100%;
	}

	.chart-label {
		font-size: clamp(0.65rem, 1vmin, 0.8rem);
		text-align: center;
		margin-top: 0.5vmin;
		color: var(--game-text-soft);
		font-weight: 800;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(5px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
	}

	.overlay-content {
		text-align: center;
		padding: 2vmin;
	}

	.overlay-content h2 {
		font-size: 4vmin;
		color: var(--color-bittersweet);
		margin-bottom: 1vmin;
	}

	.action-btn {
		margin-top: 2vmin;
		background: var(--color-bittersweet);
		color: var(--game-text-on-accent);
		border: 1px solid color-mix(in srgb, var(--app-text) 25%, transparent);
		padding: 1.4vmin 3.5vmin;
		border-radius: 1vmin;
		font-size: clamp(0.85rem, 1.6vmin, 1.05rem);
		font-weight: 900;
		cursor: pointer;
		transition:
			transform 0.15s,
			filter 0.15s;
	}

	.action-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.action-btn:active {
		transform: translateY(0);
	}
</style>
