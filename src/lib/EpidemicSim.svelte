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
	const RADIUS = 5;
	const WIDTH = 800;
	const HEIGHT = 600;
	const VAX_COST_PER_UNIT = 1000;
	const INITIAL_BUDGET = 100000;

	type State = "S" | "I" | "R" | "D";
	interface Person {
		x: number;
		y: number;
		baseVx: number;
		baseVy: number;
		state: State;
		infectionDay: number;
	}

	let people = $state<Person[]>([]);
	let days = $state(0);
	let isGameOver = $state(false);
	let isPaused = $state(true);

	// Simulation Parameters (Controllable)
	let mobilityFactor = $state(0.8);
	let testingIsolation = $state(0); // T: 0 to 1
	let sanitaryProtocols = $state(0); // P: 0 to 1

	// Biological Parameters (Difficulty-locked)
	let difficulty = $state<"EASY" | "MED" | "HARD">("MED");
	let transmissionBase = $derived(
		difficulty === "EASY" ? 0.75 : difficulty === "MED" ? 0.90 : 1.0,
	);
	let immuneRate = $derived(
		difficulty === "EASY" ? 0.25 : difficulty === "MED" ? 0.15 : 0.05,
	);
	let durationBase = $derived(
		difficulty === "EASY" ? 180 : difficulty === "MED" ? 250 : 350,
	);
	let fatalityRate = $derived(
		difficulty === "EASY" ? 0.01 : difficulty === "MED" ? 0.02 : 0.05,
	);

	// Derived System Stats
	let transmissionChance = $derived(
		transmissionBase * (1 - 0.5 * sanitaryProtocols),
	);
	let recoveryDuration = $derived(
		durationBase * (1 - 0.5 * testingIsolation),
	);

	let stats = $derived.by(() => {
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
		return { s, i, r, d };
	});

	// Economic Variables
	let budget = $state(INITIAL_BUDGET);
	// Mobility is free at 1.0 (100%), costs increase quadratically as mobility drops
	let costMobility = $derived(
		Math.floor(8000 * Math.pow(1 - mobilityFactor, 2)),
	);
	let costHealthDrain = $derived.by(() => {
		if (stats.i <= 20) return 0;
		// Quadratic scaling: 1.5 * (I - 20)^2
		return Math.floor(1.5 * Math.pow(stats.i - 20, 2));
	});
	let costTesting = $derived(Math.floor(3000 * testingIsolation));
	let costSanitary = $derived(Math.floor(1000 * sanitaryProtocols));

	let totalDailyDrain = $derived(
		costMobility + costHealthDrain + costTesting + costSanitary,
	);

	let history = $state<{ s: number; i: number; r: number; d: number }[]>([]);
	let activeEncounters = new Set<string>(); // Tracks "i-j" pairs currently touching

	function initSim() {
		const newPeople: Person[] = [];
		budget = INITIAL_BUDGET;

		for (let i = 0; i < POPULATION_SIZE; i++) {
			let isImmune = Math.random() < immuneRate;
			let isInfected = i === 0; // Force the first person to be the patient zero

			if (isInfected) isImmune = false; // Patient zero cannot be immune

			newPeople.push({
				x: Math.random() * WIDTH,
				y: Math.random() * HEIGHT,
				baseVx: (Math.random() - 0.5) * 4,
				baseVy: (Math.random() - 0.5) * 4,
				state: isImmune ? "R" : isInfected ? "I" : "S",
				infectionDay: isInfected ? 0 : -1,
			});
		}
		people = newPeople;
		days = 0;
		history = [];
		activeEncounters.clear();
		isGameOver = false;
		isPaused = true;
	}

	function step() {
		if (isPaused || isGameOver) return;

		days++;

		// Total Daily Budget Deduct (every 60 frames = 1 day)
		if (days % 60 === 0) {
			budget -= totalDailyDrain;
		}

		if (budget <= 0) {
			budget = 0;
			isGameOver = true;
		}

		const nextPeople = [...people];
		for (let i = 0; i < nextPeople.length; i++) {
			const p = nextPeople[i];
			if (p.state === "D") continue;

			// Physics speed: Even at 20% mobility, dots move at ~50% base speed
			const physSpeed = 0.4 + 0.6 * mobilityFactor;
			p.x += p.baseVx * physSpeed;
			p.y += p.baseVy * physSpeed;

			if (p.x < 0 || p.x > WIDTH) p.baseVx *= -1;
			if (p.y < 0 || p.y > HEIGHT) p.baseVy *= -1;

			if (p.state === "I") {
				p.infectionDay++;
				if (p.infectionDay > recoveryDuration) {
					p.state = Math.random() < fatalityRate ? "D" : "R";
				}

				for (let j = 0; j < nextPeople.length; j++) {
					if (i === j) continue;
					const other = nextPeople[j];
					const encounterKey = i < j ? `${i}-${j}` : `${j}-${i}`;
					const dist = Math.sqrt(
						(p.x - other.x) ** 2 + (p.y - other.y) ** 2,
					);
					const isTouching = dist < RADIUS * 2.5;

					if (isTouching) {
						if (!activeEncounters.has(encounterKey)) {
							// NEW ENCOUNTER - Roll the dice exactly once
							activeEncounters.add(encounterKey);
							if (other.state === "S" && p.state === "I") {
								if (Math.random() < transmissionChance) {
									other.state = "I";
									other.infectionDay = 0;
								}
							} else if (other.state === "I" && p.state === "S") {
								// Also check reverse if we are iterating people
								if (Math.random() < transmissionChance) {
									p.state = "I";
									p.infectionDay = 0;
								}
							}
						}
					} else {
						activeEncounters.delete(encounterKey);
					}
				}
			}
		}

		people = nextPeople;
		if (days % 10 === 0) history.push({ ...stats });
		if (stats.i === 0) isGameOver = true;
	}

	let interval: any;
	onMount(() => {
		initSim();
		interval = setInterval(step, 1000 / 60);
		return () => clearInterval(interval);
	});

	$effect(() => {
		registerActions({
			restart: initSim,
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
			<button
				class="nav-extra-btn"
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
				>${budget.toLocaleString()}</span
			>
		</div>
		<div class="stat-sub">
			<span class="label">TOTAL DAILY DRAIN</span>
			<span class="value cost-val"
				>-${totalDailyDrain.toLocaleString()}/day</span
			>
			<div class="drain-breakdown">
				<span>Mob: {costMobility}</span>
				<span>Hlth: {costHealthDrain}</span>
				<span>Test: {costTesting}</span>
				<span>Protocols: {costSanitary}</span>
			</div>
		</div>
	</div>

	<div class="main-layout">
		<div class="sim-wrapper">
			<div class="sim-container">
				<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="sim-canvas">
					{#each people as p}
						<circle
							cx={p.x}
							cy={p.y}
							r={RADIUS}
							class="person {p.state.toLowerCase()}"
						/>
					{/each}
				</svg>

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
				<label>Outbreak Difficulty</label>
				<div class="difficulty-group">
					<button
						class="diff-btn {difficulty === 'EASY' ? 'active' : ''}"
						onclick={() => {
							difficulty = "EASY";
							if (days === 0) initSim();
						}}
					>
						EASY
					</button>
					<button
						class="diff-btn {difficulty === 'MED' ? 'active' : ''}"
						onclick={() => {
							difficulty = "MED";
							if (days === 0) initSim();
						}}
					>
						MED
					</button>
					<button
						class="diff-btn {difficulty === 'HARD' ? 'active' : ''}"
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
				<label
					>Population Mobility: {(mobilityFactor * 100).toFixed(
						0,
					)}%</label
				>
				<input
					type="range"
					min="0.2"
					max="1"
					step="0.01"
					bind:value={mobilityFactor}
				/>
			</div>

			<div class="control-group controllable">
				<label
					>Quarantine & Testing: {testingIsolation === 0
						? "OFF"
						: testingIsolation === 0.5
							? "STANDARD"
							: "INTENSIVE"}</label
				>
				<input
					type="range"
					min="0"
					max="1"
					step="0.5"
					bind:value={testingIsolation}
				/>
				<div class="hint">
					Reduces Duration | ${testingIsolation * 3000}/day
				</div>
			</div>

			<div class="control-group controllable">
				<label
					>Sanitary Protocols: {sanitaryProtocols === 0
						? "OFF"
						: sanitaryProtocols === 0.5
							? "STANDARD"
							: "INTENSIVE"}</label
				>
				<input
					type="range"
					min="0"
					max="1"
					step="0.5"
					bind:value={sanitaryProtocols}
				/>
				<div class="hint">
					Reduces Transmission | ${sanitaryProtocols * 1000}/day
				</div>
			</div>

			<div class="history-chart">
				<svg viewBox="0 0 100 50" preserveAspectRatio="none">
					{#each history as h, i}
						{@const x = (i / history.length) * 100}
						{@const iH = (h.i / POPULATION_SIZE) * 50}
						{@const dH = (h.d / POPULATION_SIZE) * 50}
						<rect
							{x}
							y={50 - dH}
							width="1"
							height={dH}
							fill="#444"
						/>
						<rect
							{x}
							y={50 - iH - dH}
							width="1"
							height={iH}
							fill="#ff6e61"
						/>
					{/each}
				</svg>
				<div class="chart-label">EPIDEMIC CURVE</div>
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
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--game-text-primary);
		padding: 0.8vmin 2vmin;
		border-radius: 0.8vmin;
		font-weight: 800;
		font-size: 1.4vmin;
		cursor: pointer;
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

	.sim-canvas {
		width: 100%;
		height: 100%;
	}

	.person {
		transition: fill 0.3s;
	}

	.person.s {
		fill: #6fb1fc;
	}
	.person.i {
		fill: #ff6e61;
		filter: drop-shadow(0 0 5px rgba(255, 110, 97, 0.5));
		animation: infect-spark 0.5s ease-out;
	}

	@keyframes infect-spark {
		0% {
			r: 10;
			fill: white;
			opacity: 1;
		}
		100% {
			r: 5;
			fill: #ff6e61;
			opacity: 1;
		}
	}
	.person.r {
		fill: #69af4b;
	}
	.person.d {
		fill: #444;
		opacity: 0.5;
	}

	.controls-panel {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 2vmin;
		padding: 2vmin;
		display: flex;
		flex-direction: column;
		gap: 2.5vmin;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.8vmin;
	}

	.control-group label {
		font-size: 1.2vmin;
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
		gap: 1vmin;
		margin-top: 0.5vmin;
	}

	.diff-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--game-text-muted);
		padding: 1vmin 0.5vmin;
		border-radius: 0.8vmin;
		font-size: 1vmin;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
	}

	.diff-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--game-text-primary);
	}

	.diff-btn.active {
		background: var(--color-bittersweet);
		border-color: var(--color-bittersweet);
		color: white;
		box-shadow: 0 0 15px rgba(255, 110, 97, 0.3);
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
		font-size: 1.1vmin;
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
		font-size: 1vmin;
		color: var(--color-bittersweet);
		opacity: 0.6;
		font-style: italic;
		margin-top: 0.5vmin;
	}

	.toggle-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
	}

	.toggle-label input[type="checkbox"] {
		width: 2vmin;
		height: 2vmin;
		cursor: pointer;
		accent-color: var(--color-bittersweet);
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
		font-size: 1vmin;
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
	}

	.overlay-content h2 {
		font-size: 4vmin;
		color: var(--color-bittersweet);
		margin-bottom: 1vmin;
	}

	.action-btn {
		margin-top: 2vmin;
		background: var(--color-bittersweet);
		color: white;
		border: none;
		padding: 1.5vmin 4vmin;
		border-radius: 1vmin;
		font-weight: 900;
		cursor: pointer;
	}
</style>
