<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const TOTAL_DAYS = 30;
	const INITIAL_MONEY = 10000.00;
	const INITIAL_WORKERS = 5;
	const INITIAL_MACHINES = 2;

	// Production costs
	const WORKER_SALARY = 100.00;
	const MACHINE_MAINTENANCE = 50.00;
	const RAW_MATERIAL_COST = 2.00;
	const BASE_PRODUCT_PRICE = 15.00;

	// Machine types
	interface MachineType {
		id: string;
		name: string;
		cost: number;
		production: number;
		efficiency: number;
	}

	const machineTypes: MachineType[] = [
		{ id: 'basic', name: 'Basic Machine', cost: 5000, production: 10, efficiency: 1.0 },
		{ id: 'advanced', name: 'Advanced Machine', cost: 15000, production: 25, efficiency: 1.5 },
		{ id: 'premium', name: 'Premium Machine', cost: 40000, production: 50, efficiency: 2.0 }
	];

	// State
	let currentDay = $state(1);
	let money = $state(INITIAL_MONEY);
	let workers = $state(INITIAL_WORKERS);
	let machines = $state<Array<{ type: MachineType, condition: number }>>(
		Array(INITIAL_MACHINES).fill(null).map(() => ({ type: machineTypes[0], condition: 100 }))
	);
	let rawMaterials = $state(0);
	let inventory = $state(0);
	let productPrice = $state(BASE_PRODUCT_PRICE);

	let dailyRevenue = $state(0);
	let dailyCosts = $state(0);
	let dailyProfit = $state(0);
	let unitsProduced = $state(0);
	let unitsSold = $state(0);

	let dailyHistory = $state<Array<{
		day: number,
		revenue: number,
		costs: number,
		profit: number,
		produced: number,
		sold: number,
		money: number
	}>>([]);

	let showResults = $state(false);
	let gameOver = $state(false);
	let showBuyMenu = $state(false);

	let selectedMachineType = $state<MachineType | null>(null);
	let rawMaterialsToBuy = $state(100);

	function calculateDailyCosts(): number {
		const laborCost = workers * WORKER_SALARY;
		const maintenanceCost = machines.reduce((sum, m) => sum + MACHINE_MAINTENANCE, 0);
		return laborCost + maintenanceCost;
	}

	function calculateProductionCapacity(): number {
		const machineCapacity = machines.reduce((sum, m) => {
			return sum + (m.type.production * m.type.efficiency * (m.condition / 100));
		}, 0);
		const workerCapacity = workers * 5;
		return Math.min(machineCapacity, workerCapacity);
	}

	function produceGoods() {
		const capacity = calculateProductionCapacity();
		const maxFromMaterials = Math.floor(rawMaterials);
		const toProduce = Math.min(capacity, maxFromMaterials);
		
		unitsProduced = toProduce;
		rawMaterials -= toProduce;
		inventory += toProduce;

		// Machines degrade slightly
		machines = machines.map(m => ({
			...m,
			condition: Math.max(0, m.condition - Math.random() * 2)
		}));
	}

	function calculateDemand(): number {
		// Demand fluctuates based on price and random factors
		const baseDemand = 50;
		const priceFactor = Math.max(0.1, 1 - (productPrice - BASE_PRODUCT_PRICE) / BASE_PRODUCT_PRICE);
		const randomFactor = 0.7 + Math.random() * 0.6;
		return Math.floor(baseDemand * priceFactor * randomFactor);
	}

	function sellGoods() {
		const demand = calculateDemand();
		const toSell = Math.min(inventory, demand);
		
		unitsSold = toSell;
		inventory -= toSell;
		dailyRevenue = toSell * productPrice;
	}

	function startDay() {
		dailyCosts = calculateDailyCosts();
		produceGoods();
		sellGoods();
		
		dailyProfit = dailyRevenue - dailyCosts;
		money += dailyProfit;

		dailyHistory.push({
			day: currentDay,
			revenue: dailyRevenue,
			costs: dailyCosts,
			profit: dailyProfit,
			produced: unitsProduced,
			sold: unitsSold,
			money
		});

		showResults = true;

		if (currentDay >= TOTAL_DAYS) {
			gameOver = true;
		}
	}

	function nextDay() {
		currentDay++;
		showResults = false;
	}

	function buyMachine(type: MachineType) {
		if (money >= type.cost) {
			money -= type.cost;
			machines = [...machines, { type, condition: 100 }];
		}
	}

	function buyRawMaterials() {
		const cost = rawMaterialsToBuy * RAW_MATERIAL_COST;
		if (money >= cost) {
			money -= cost;
			rawMaterials += rawMaterialsToBuy;
		}
	}

	function hireWorker() {
		if (money >= WORKER_SALARY * 5) {
			money -= WORKER_SALARY * 5;
			workers++;
		}
	}

	function fireWorker() {
		if (workers > 1) {
			workers--;
		}
	}

	function repairMachine(index: number) {
		const cost = 500;
		if (money >= cost && machines[index].condition < 100) {
			money -= cost;
			machines = machines.map((m, i) => 
				i === index ? { ...m, condition: 100 } : m
			);
		}
	}

	function resetGame() {
		currentDay = 1;
		money = INITIAL_MONEY;
		workers = INITIAL_WORKERS;
		machines = Array(INITIAL_MACHINES).fill(null).map(() => ({ type: machineTypes[0], condition: 100 }));
		rawMaterials = 0;
		inventory = 0;
		productPrice = BASE_PRODUCT_PRICE;
		dailyRevenue = 0;
		dailyCosts = 0;
		dailyProfit = 0;
		unitsProduced = 0;
		unitsSold = 0;
		dailyHistory = [];
		showResults = false;
		gameOver = false;
		showBuyMenu = false;
	}

	function formatMoney(value: number): string {
		return value.toFixed(2);
	}

	onMount(() => {
		registerActions({
			restart: resetGame,
			newShuffle: resetGame,
		});
	});
</script>

<div class="apex-container">
	<div class="header">
		<div class="day-badge">DAY {currentDay}/{TOTAL_DAYS}</div>
		<h1>🏭 Apex Industries</h1>
	</div>

	{#if !showResults && !gameOver}
		<div class="game-viewport">
			<div class="stats-panel">
				<div class="stat">
					<span class="label">Money</span>
					<span class="value">${formatMoney(money)}</span>
				</div>
				<div class="stat">
					<span class="label">Inventory</span>
					<span class="value">{inventory} units</span>
				</div>
				<div class="stat">
					<span class="label">Raw Materials</span>
					<span class="value">{Math.floor(rawMaterials)}</span>
				</div>
			</div>

			<div class="production-panel">
				<h3>Production Capacity</h3>
				<div class="capacity-display">
					<span>Workers: {workers} 👷</span>
					<span>Machines: {machines.length} ⚙️</span>
					<span>Daily Capacity: {Math.floor(calculateProductionCapacity())} units</span>
				</div>
			</div>

			<div class="machines-panel">
				<h3>Machines</h3>
				<div class="machines-list">
					{#each machines as machine, index}
						<div class="machine-card">
							<span class="machine-name">{machine.type.name}</span>
							<span class="machine-condition">Condition: {Math.floor(machine.condition)}%</span>
							<button class="repair-btn" onclick={() => repairMachine(index)} disabled={machine.condition >= 100 || money < 500}>
								Repair ($500)
							</button>
						</div>
					{/each}
				</div>
			</div>

			<div class="price-panel">
				<div class="price-control">
					<span class="label">Product Price</span>
					<div class="price-buttons">
						<button onclick={() => productPrice = Math.max(5, productPrice - 1)}>-</button>
						<span>${productPrice.toFixed(2)}</span>
						<button onclick={() => productPrice = Math.min(50, productPrice + 1)}>+</button>
					</div>
				</div>
			</div>

			<div class="action-buttons">
				<button class="btn secondary-btn" onclick={() => showBuyMenu = true}>Buy/Manage</button>
				<button class="btn start-btn" onclick={startDay}>Start Day</button>
			</div>
		</div>
	{:else if showResults && !gameOver}
		<div class="results-panel">
			<h2>Day {currentDay} Results</h2>
			<div class="results-stats">
				<div class="result">
					<span class="label">Produced</span>
					<span class="value">{unitsProduced} units</span>
				</div>
				<div class="result">
					<span class="label">Sold</span>
					<span class="value">{unitsSold} units</span>
				</div>
				<div class="result">
					<span class="label">Revenue</span>
					<span class="value positive">${formatMoney(dailyRevenue)}</span>
				</div>
				<div class="result">
					<span class="label">Costs</span>
					<span class="value negative">${formatMoney(dailyCosts)}</span>
				</div>
				<div class="result">
					<span class="label">Profit</span>
					<span class="value" class:positive={dailyProfit >= 0} class:negative={dailyProfit < 0}>
						${formatMoney(dailyProfit)}
					</span>
				</div>
			</div>
			<button class="btn next-btn" onclick={nextDay}>Next Day →</button>
		</div>
	{:else if gameOver}
		<div class="game-over-panel">
			<h2>🎉 Game Over!</h2>
			<div class="final-stats">
				<div class="final-stat">
					<span class="label">Final Money</span>
					<span
						class="value"
						class:positive={money >= INITIAL_MONEY}
						class:negative={money < INITIAL_MONEY}
					>${formatMoney(money)}</span>
				</div>
				<div class="final-stat">
					<span class="label">Total Profit</span>
					<span
						class="value"
						class:positive={money - INITIAL_MONEY >= 0}
						class:negative={money - INITIAL_MONEY < 0}
					>${formatMoney(money - INITIAL_MONEY)}</span>
				</div>
			</div>
			<div class="history">
				<h3>Daily History</h3>
				<div class="history-list">
					{#each dailyHistory as entry}
						<div class="history-entry">
							<span>Day {entry.day}</span>
							<span>{entry.produced} produced</span>
							<span>{entry.sold} sold</span>
							<span class:positive={entry.profit >= 0} class:negative={entry.profit < 0}
								>${formatMoney(entry.profit)}</span
							>
						</div>
					{/each}
				</div>
			</div>
			<button class="btn restart-btn" onclick={resetGame}>Play Again</button>
		</div>
	{/if}

	{#if showBuyMenu}
		<div class="buy-menu-overlay" in:fade>
			<div class="buy-menu" in:scale>
				<h2>Buy & Manage</h2>
				<p>Available: ${formatMoney(money)}</p>
				
				<div class="buy-section">
					<h3>Machines</h3>
					<div class="machine-options">
						{#each machineTypes as type}
							<button 
								class="machine-option"
								onclick={() => buyMachine(type)}
								disabled={money < type.cost}
							>
								<span class="machine-option-name">{type.name}</span>
								<span class="machine-option-cost">${formatMoney(type.cost)}</span>
								<span class="machine-option-stats">{type.production} units/day</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="buy-section">
					<h3>Raw Materials</h3>
					<div class="materials-control">
						<button onclick={() => rawMaterialsToBuy = Math.max(10, rawMaterialsToBuy - 10)}>-</button>
						<span>{rawMaterialsToBuy}</span>
						<button onclick={() => rawMaterialsToBuy = Math.min(1000, rawMaterialsToBuy + 10)}>+</button>
						<button class="buy-btn" onclick={buyRawMaterials} disabled={money < rawMaterialsToBuy * RAW_MATERIAL_COST}>
							Buy (${formatMoney(rawMaterialsToBuy * RAW_MATERIAL_COST)})
						</button>
					</div>
				</div>

				<div class="buy-section">
					<h3>Workers</h3>
					<div class="workers-control">
						<button onclick={hireWorker} disabled={money < WORKER_SALARY * 5}>
							Hire (${formatMoney(WORKER_SALARY * 5)})
						</button>
						<span>{workers} workers</span>
						<button onclick={fireWorker} disabled={workers <= 1}>
							Fire
						</button>
					</div>
				</div>
				
				<div class="buy-actions">
					<button class="btn close-btn" onclick={() => showBuyMenu = false}>Done</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.apex-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
		font-family: "Outfit", "Inter", sans-serif;
		background: #09090b;
		padding: 2rem;
		position: relative;
		overflow: hidden;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.day-badge {
		background: #3b82f6;
		color: white;
		font-weight: 900;
		font-size: 0.7rem;
		padding: 0.2rem 0.8rem;
		border-radius: 4px;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 900;
		margin: 0;
		letter-spacing: -2px;
	}

	.game-viewport {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 500px;
		max-width: 600px;
	}

	.stats-panel {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}

	.stat .value {
		font-size: 1.25rem;
		font-weight: 900;
	}

	.production-panel {
		margin-bottom: 1.5rem;
	}

	.production-panel h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.capacity-display {
		display: flex;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.75rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.machines-panel {
		margin-bottom: 1.5rem;
	}

	.machines-panel h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.machines-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 150px;
		overflow-y: auto;
	}

	.machine-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.machine-name {
		font-weight: 600;
	}

	.machine-condition {
		color: rgba(255, 255, 255, 0.6);
	}

	.repair-btn {
		background: #3b82f6;
		border: none;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 700;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.repair-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.repair-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.price-panel {
		margin-bottom: 2rem;
	}

	.price-control {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
	}

	.price-control .label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 600;
	}

	.price-buttons {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.price-buttons button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.45rem 0.85rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.price-buttons button:hover {
		background: #3f3f46;
	}

	.price-buttons span {
		font-size: 1.25rem;
		font-weight: 700;
		min-width: 80px;
		text-align: center;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
	}

	.btn {
		flex: 1;
		padding: 1rem;
		border: none;
		border-radius: 12px;
		font-weight: 800;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:not(:disabled):hover {
		transform: scale(1.02);
	}

	.start-btn {
		background: #3b82f6;
		color: white;
	}

	.start-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.secondary-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
	}

	.secondary-btn:hover {
		background: #3f3f46;
	}

	.results-panel, .game-over-panel {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 400px;
		max-width: 500px;
		text-align: center;
	}

	.results-panel h2, .game-over-panel h2 {
		font-size: 1.75rem;
		font-weight: 900;
		margin: 0 0 1.5rem;
	}

	.results-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.result {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
	}

	.result .label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.25rem;
	}

	.result .value {
		font-size: 1.25rem;
		font-weight: 900;
	}

	.positive {
		color: #10b981;
	}

	.negative {
		color: #ef4444;
	}

	.next-btn, .restart-btn {
		background: #10b981;
		color: white;
		width: 100%;
	}

	.next-btn:hover, .restart-btn:hover {
		background: #059669;
		transform: scale(1.02);
	}

	.final-stats {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.final-stat {
		text-align: center;
	}

	.final-stat .label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.5rem;
	}

	.final-stat .value {
		font-size: 2rem;
		font-weight: 900;
	}

	.history {
		margin-top: 2rem;
		text-align: left;
	}

	.history h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.history-list {
		max-height: 200px;
		overflow-y: auto;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		padding: 0.5rem;
	}

	.history-entry {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.85rem;
	}

	.history-entry:last-child {
		border-bottom: none;
	}

	.buy-menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(10px);
	}

	.buy-menu {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid #27272a;
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
		min-width: 500px;
		max-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
	}

	.buy-menu h2 {
		font-size: 1.5rem;
		font-weight: 900;
		margin: 0 0 0.5rem;
	}

	.buy-menu > p {
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1.5rem;
	}

	.buy-section {
		margin-bottom: 2rem;
	}

	.buy-section h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.machine-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.machine-option {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid transparent;
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.machine-option:hover:not(:disabled) {
		background: rgba(59, 130, 246, 0.2);
		border-color: #3b82f6;
	}

	.machine-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.machine-option-name {
		font-weight: 700;
	}

	.machine-option-cost {
		color: #10b981;
	}

	.machine-option-stats {
		color: rgba(255, 255, 255, 0.6);
	}

	.materials-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
	}

	.materials-control button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		width: 36px;
		height: 36px;
	}

	.materials-control button:hover {
		background: #3f3f46;
	}

	.materials-control span {
		font-size: 1.1rem;
		font-weight: 700;
		min-width: 50px;
		text-align: center;
	}

	.buy-btn {
		background: #10b981;
		border: none;
		flex: 1;
		max-width: 200px;
	}

	.buy-btn:hover:not(:disabled) {
		background: #059669;
	}

	.buy-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.workers-control {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
	}

	.workers-control button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.workers-control button:hover:not(:disabled) {
		background: #3f3f46;
	}

	.workers-control button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.workers-control span {
		font-size: 1.1rem;
		font-weight: 700;
		min-width: 80px;
		text-align: center;
	}

	.buy-actions {
		display: flex;
		justify-content: center;
	}

	.close-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		width: 200px;
	}

	.close-btn:hover {
		background: #3f3f46;
	}
</style>
