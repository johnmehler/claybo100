<script lang="ts">
	import Instructions from './Instructions.svelte';
	import InGameMenu from './InGameMenu.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { onBack, registerActions } = $props<{ onBack: () => void, registerActions: any }>();
	let instructions: any;

	const POPULATION_SIZE = 400;
	const RADIUS = 5;
	const WIDTH = 800;
	const HEIGHT = 600;

	type State = 'S' | 'I' | 'R' | 'D';
	interface Person {
		x: number;
		y: number;
		baseVx: number; // Storing base velocity for dynamic scaling
		baseVy: number;
		state: State;
		infectionDay: number;
	}

	let people = $state<Person[]>([]);
	let days = $state(0);
	let isGameOver = $state(false);
	let isPaused = $state(true);
	
	// Adjustable Parameters
	let transmissionChance = $state(0.15); // "Transmission Rate"
	let mobilityFactor = $state(0.5);      // "Movement Speed"
	let recoveryDuration = $state(200);   // "Infection Duration" (frames)
	let fatalityRate = $state(0.02);      // "Mortality Rate"
	let initialImmunity = $state(0.1);     // "Vaccination Rate"

	let stats = $derived.by(() => {
		let s = 0, i = 0, r = 0, d = 0;
		for (const p of people) {
			if (p.state === 'S') s++;
			else if (p.state === 'I') i++;
			else if (p.state === 'R') r++;
			else if (p.state === 'D') d++;
		}
		return { s, i, r, d };
	});

	let history = $state<{s: number, i: number, r: number, d: number}[]>([]);

	function initSim() {
		const newPeople: Person[] = [];
		for (let i = 0; i < POPULATION_SIZE; i++) {
			const isImmune = Math.random() < initialImmunity;
			const isInfected = !isImmune && i === 0;
			
			newPeople.push({
				x: Math.random() * WIDTH,
				y: Math.random() * HEIGHT,
				baseVx: (Math.random() - 0.5) * 4,
				baseVy: (Math.random() - 0.5) * 4,
				state: isImmune ? 'R' : (isInfected ? 'I' : 'S'),
				infectionDay: isInfected ? 0 : -1
			});
		}
		people = newPeople;
		days = 0;
		history = [];
		isGameOver = false;
		isPaused = true;
	}

	function step() {
		if (isPaused || isGameOver) return;

		days++;
		const nextPeople = [...people];
		
		for (let i = 0; i < nextPeople.length; i++) {
			const p = nextPeople[i];
			if (p.state === 'D') continue;

			// Movement scaled by mobilityFactor in real-time
			p.x += p.baseVx * mobilityFactor;
			p.y += p.baseVy * mobilityFactor;

			if (p.x < 0 || p.x > WIDTH) p.baseVx *= -1;
			if (p.y < 0 || p.y > HEIGHT) p.baseVy *= -1;

			if (p.state === 'I') {
				p.infectionDay++;
				// Recovery duration check
				if (p.infectionDay > recoveryDuration) {
					p.state = Math.random() < fatalityRate ? 'D' : 'R';
				}

				for (let j = 0; j < nextPeople.length; j++) {
					if (i === j) continue;
					const other = nextPeople[j];
					if (other.state === 'S') {
						const dist = Math.sqrt((p.x - other.x)**2 + (p.y - other.y)**2);
						if (dist < RADIUS * 3) {
							if (Math.random() < transmissionChance) {
								other.state = 'I';
								other.infectionDay = 0;
							}
						}
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
		interval = setInterval(step, 1000/60);
		return () => clearInterval(interval);
	});

	$effect(() => {
		registerActions({
			restart: initSim,
			help: () => instructions.open()
		});
	});
</script>

<div class="game-inner">
	<Instructions bind:this={instructions} gameId="epidemic_sim" title="Epidemic Spread Simulator">
		<p><strong>Science of Spread:</strong> This simulation uses an agent-based SIR model (Susceptible, Infected, Recovered).</p>
		<ul style="font-size: 0.9em; opacity: 0.8; margin: 1vmin 0; padding-left: 3vmin;">
			<li><span style="color: #6fb1fc;">Blue (S):</span> Susceptible population.</li>
			<li><span style="color: #ff6e61;">Red (I):</span> Currently infected and spreading.</li>
			<li><span style="color: #69af4b;">Green (R):</span> Recovered and immune.</li>
			<li><span style="color: #444;">Grey (D):</span> Deceased.</li>
		</ul>
		<p>Adjust parameters like <strong>Mobility</strong> and <strong>Infection Duration</strong> to see how outbreaks evolve.</p>
	</Instructions>

	<InGameMenu 
		onBack={onBack} 
		onHelp={() => instructions.open()} 
		onRestart={initSim}
	>
		{#snippet rightControls()}
			<button class="nav-extra-btn" onclick={() => isPaused = !isPaused}>
				{isPaused ? 'START' : 'STOP'}
			</button>
		{/snippet}
	</InGameMenu>

	<div class="main-layout">
		<div class="sim-wrapper">
			<div class="sim-container">
				<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="sim-canvas">
					{#each people as p}
						<circle 
							cx={p.x} cy={p.y} r={RADIUS} 
							class="person {p.state.toLowerCase()}"
						/>
					{/each}
				</svg>
				
				{#if isGameOver}
					<div class="overlay" in:fade>
						<div class="overlay-content">
							<h2>OUTBREAK ENDED</h2>
							<p>Simulation Duration: {Math.floor(days/60)} Days | Final Deceased: {stats.d}</p>
							<button class="action-btn" onclick={initSim}>RESET SIMULATION</button>
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
				<label>Contagiousness (Chance/Contact): {(transmissionChance * 100).toFixed(0)}%</label>
				<input type="range" min="0.01" max="0.5" step="0.01" bind:value={transmissionChance} />
			</div>
			<div class="control-group">
				<label>Population Mobility: {(mobilityFactor * 100).toFixed(0)}%</label>
				<input type="range" min="0" max="1.5" step="0.05" bind:value={mobilityFactor} />
			</div>
			<div class="control-group">
				<label>Infection Duration: {Math.floor(recoveryDuration / 60)} Days</label>
				<input type="range" min="30" max="600" step="10" bind:value={recoveryDuration} />
			</div>
			<div class="control-group">
				<label>Fatality Rate: {(fatalityRate * 100).toFixed(1)}%</label>
				<input type="range" min="0" max="0.2" step="0.005" bind:value={fatalityRate} />
			</div>
			<div class="control-group">
				<label>Initial Vaccination: {(initialImmunity * 100).toFixed(0)}%</label>
				<input type="range" min="0" max="0.95" step="0.05" bind:value={initialImmunity} />
			</div>

			<div class="history-chart">
				<svg viewBox="0 0 100 50" preserveAspectRatio="none">
					{#each history as h, i}
						{@const x = (i / history.length) * 100}
						{@const iH = (h.i / POPULATION_SIZE) * 50}
						{@const dH = (h.d / POPULATION_SIZE) * 50}
						<rect {x} y={50 - dH} width="1" height={dH} fill="#444" />
						<rect {x} y={50 - iH - dH} width="1" height={iH} fill="#ff6e61" />
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
		color: white;
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
		box-shadow: 0 10px 30px rgba(0,0,0,0.5);
	}

	.sim-container {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.2);
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
		color: rgba(255,255,255,0.3);
		font-weight: 800;
	}

	.stat .value {
		font-size: 2.5vmin;
		font-weight: 900;
	}

	.s-val { color: #6fb1fc; }
	.i-val { color: #ff6e61; }
	.r-val { color: #69af4b; }
	.d-val { color: #888; }

	.nav-extra-btn {
		background: rgba(255,255,255,0.1);
		border: 1px solid rgba(255,255,255,0.2);
		color: white;
		padding: 0.8vmin 2vmin;
		border-radius: 0.8vmin;
		font-weight: 800;
		font-size: 1.4vmin;
		cursor: pointer;
	}

	.sim-canvas {
		width: 100%;
		height: 100%;
	}

	.person {
		transition: fill 0.3s;
	}

	.person.s { fill: #6fb1fc; }
	.person.i { 
		fill: #ff6e61; 
		filter: drop-shadow(0 0 5px rgba(255, 110, 97, 0.5));
	}
	.person.r { fill: #69af4b; }
	.person.d { fill: #444; opacity: 0.5; }

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
		color: rgba(255,255,255,0.5);
	}

	.control-group input[type="range"] {
		width: 100%;
		accent-color: var(--color-bittersweet);
	}

	.history-chart {
		margin-top: auto;
		background: rgba(0,0,0,0.3);
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
		color: rgba(255,255,255,0.3);
		font-weight: 800;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.7);
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
