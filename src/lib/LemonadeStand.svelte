<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants (Classic MECC values scaled 10x)
	const TOTAL_DAYS = 12;
	const INITIAL_MONEY = 20.00;
	const CUP_COST = 0.20;
	const LEMON_COST = 0.30;
	const SUGAR_COST = 0.40;
	const ICE_COST = 0.10;
	const CUP_BULK_PRICES: Record<number, number> = {
		25: 0.84,
		50: 1.71,
		100: 2.77
	};
	const LEMON_BULK_PRICES: Record<number, number> = {
		10: 0.97,
		30: 2.23,
		75: 4.04
	};
	const SUGAR_BULK_PRICES: Record<number, number> = {
		8: 0.66,
		20: 1.59,
		48: 3.29
	};
	const ICE_BULK_PRICES: Record<number, number> = {
		100: 0.91,
		250: 2.22,
		500: 3.50
	};

	// Weather types
	type Weather = "sunny" | "cloudy" | "rainy" | "hot";

	interface WeatherInfo {
		type: Weather;
		demandMultiplier: number;
		icon: string;
		description: string;
	}

	const weatherTypes: WeatherInfo[] = [
		{ type: "sunny", demandMultiplier: 1.3, icon: "☀️", description: "Sunny - Good for sales!" },
		{ type: "cloudy", demandMultiplier: 1.0, icon: "☁️", description: "Cloudy - Normal demand" },
		{ type: "hot", demandMultiplier: 1.8, icon: "🔥", description: "Hot & Dry - High demand!" },
		{ type: "rainy", demandMultiplier: 0.4, icon: "🌧️", description: "Rainy - Low demand" }
	];

	// State
	let currentDay = $state(1);
	let money = $state(INITIAL_MONEY);
	let cups = $state(0);
	let lemons = $state(0);
	let sugar = $state(0);
	let ice = $state(0);
	
	let pricePerCup = $state(1.00);
	let cupsToMake = $state(10);
	
	let currentWeather = $state(weatherTypes[0]);
	let customers = $state(0);
	let revenue = $state(0);
	let costs = $state(0);
	let profit = $state(0);
	
	let dailyHistory = $state<Array<{day: number, weather: Weather, customers: number, revenue: number, costs: number, profit: number}>>([]);
	
	let showResults = $state(false);
	let gameOver = $state(false);
	let showBuyMenu = $state(true);

	function generateWeather(): WeatherInfo {
		const rand = Math.random();
		if (rand < 0.4) return weatherTypes[0]; // 40% sunny
		if (rand < 0.7) return weatherTypes[1]; // 30% cloudy
		if (rand < 0.85) return weatherTypes[2]; // 15% hot
		return weatherTypes[3]; // 15% rainy
	}

	function getBulkCost(quantity: number, unitCost: number, bulkPrices?: Record<number, number>): number {
		if (quantity <= 0) return 0;
		if (bulkPrices && quantity in bulkPrices) return bulkPrices[quantity];
		return quantity * unitCost;
	}

	function buySupplies(cupsToBuy: number, lemonsToBuy: number, sugarToBuy: number, iceToBuy: number) {
		const totalCost =
			getBulkCost(cupsToBuy, CUP_COST, CUP_BULK_PRICES) +
			getBulkCost(lemonsToBuy, LEMON_COST, LEMON_BULK_PRICES) +
			getBulkCost(sugarToBuy, SUGAR_COST, SUGAR_BULK_PRICES) +
			getBulkCost(iceToBuy, ICE_COST, ICE_BULK_PRICES);
		
		if (totalCost > money) {
			alert("Not enough money!");
			return;
		}
		
		money -= totalCost;
		cups += cupsToBuy;
		lemons += lemonsToBuy;
		sugar += sugarToBuy;
		ice += iceToBuy;
	}

	function formatMoney(value: number): string {
		return value.toFixed(2);
	}

	function canMakeLemonade(count: number): boolean {
		// Recipe: 1 cup, 1 lemon, 1 sugar, 2 ice per cup
		return cups >= count && lemons >= count && sugar >= count && ice >= count * 2;
	}

	function makeLemonade(): boolean {
		if (!canMakeLemonade(cupsToMake)) {
			alert("Not enough supplies to make that much lemonade!");
			return false;
		}
		
		cups -= cupsToMake;
		lemons -= cupsToMake;
		sugar -= cupsToMake;
		ice -= cupsToMake * 2;
		return true;
	}

	function calculateDemand(): number {
		// Base demand depends on weather
		let baseDemand = 20 * currentWeather.demandMultiplier;
		
		// Price affects demand - higher price = lower demand
		const priceFactor = Math.max(0.1, 1 - (pricePerCup - 0.10) * 2);
		
		// Random variation
		const randomFactor = 0.8 + Math.random() * 0.4;
		
		return Math.floor(baseDemand * priceFactor * randomFactor);
	}

	function startDay() {
		if (cupsToMake <= 0) {
			alert("Make at least 1 cup of lemonade!");
			return;
		}

		if (showBuyMenu) {
			return;
		}
		
		if (!makeLemonade()) {
			return;
		}
		
		currentWeather = generateWeather();
		const demand = calculateDemand();
		const availableCups = cupsToMake;
		
		customers = Math.min(demand, availableCups);
		revenue = customers * pricePerCup;
		
		// Costs for the day
		costs = (cupsToMake * CUP_COST) + (cupsToMake * LEMON_COST) + (cupsToMake * SUGAR_COST) + (cupsToMake * 2 * ICE_COST);
		
		profit = revenue - costs;
		money += revenue;
		
		dailyHistory.push({
			day: currentDay,
			weather: currentWeather.type,
			customers,
			revenue,
			costs,
			profit
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

	function resetGame() {
		currentDay = 1;
		money = INITIAL_MONEY;
		cups = 0;
		lemons = 0;
		sugar = 0;
		ice = 0;
		pricePerCup = 1.00;
		cupsToMake = 10;
		dailyHistory = [];
		showResults = false;
		gameOver = false;
		showBuyMenu = true;
	}

	onMount(() => {
		registerActions({
			restart: resetGame,
			newShuffle: resetGame,
		});
	});
</script>

<div class="lemonade-container">
	<div class="header">
		<div class="day-badge">DAY {currentDay}/{TOTAL_DAYS}</div>
		<h1>🍋 Lemonade Stand</h1>
	</div>

	{#if !showResults && !gameOver}
		<div class="game-viewport">
			<div class="stats-panel">
				<div class="stat">
					<span class="label">Money</span>
					<span class="value">${money.toFixed(2)}</span>
				</div>
				<div class="stat">
					<span class="label">Supplies</span>
					<div class="supplies">
						<span>🥤 {cups}</span>
						<span>🍋 {lemons}</span>
						<span>🍬 {sugar}</span>
						<span>🧊 {ice}</span>
					</div>
				</div>
			</div>

			<div class="controls-panel">
				<div class="control-group">
					<span class="label">Price per Cup</span>
					<div class="price-control" role="group" aria-label="Price per cup controls">
						<button onclick={() => pricePerCup = Math.max(0.20, pricePerCup - 0.10)}>-</button>
						<span>${pricePerCup.toFixed(2)}</span>
						<button onclick={() => pricePerCup = Math.min(5.00, pricePerCup + 0.10)}>+</button>
					</div>
				</div>

				<div class="control-group">
					<span class="label">Cups to Make</span>
					<div class="cups-control" role="group" aria-label="Cups to make controls">
						<button onclick={() => cupsToMake = Math.max(1, cupsToMake - 5)}>-5</button>
						<span>{cupsToMake}</span>
						<button onclick={() => cupsToMake = cupsToMake + 5}>+5</button>
					</div>
				</div>

				<div class="recipe-info">
					<p>Recipe per cup: 1 🥤 + 1 🍋 + 1 🍬 + 2 🧊</p>
					{#if !canMakeLemonade(cupsToMake)}
						<p class="warning">⚠️ Not enough supplies!</p>
					{/if}
				</div>

				<div class="action-buttons">
					<button class="btn secondary-btn" onclick={() => showBuyMenu = true}>Buy Supplies</button>
					<button class="btn start-btn" onclick={startDay} disabled={!canMakeLemonade(cupsToMake)}>Start Day</button>
				</div>
			</div>
		</div>
	{:else if showResults && !gameOver}
		<div class="results-panel">
			<h2>Day {currentDay} Results</h2>
			<div class="weather-display">
				<span class="weather-icon">{currentWeather.icon}</span>
				<span>{currentWeather.description}</span>
			</div>
			<div class="results-stats">
				<div class="result">
					<span class="label">Customers</span>
					<span class="value">{customers}</span>
				</div>
				<div class="result">
					<span class="label">Revenue</span>
					<span
						class="value"
						class:positive={revenue >= costs}
						class:negative={revenue < costs}
					>${revenue.toFixed(2)}</span>
				</div>
				<div class="result">
					<span class="label">Costs</span>
					<span class="value negative">${costs.toFixed(2)}</span>
				</div>
				<div class="result">
					<span class="label">Profit</span>
					<span
						class="value"
						class:positive={profit >= 0}
						class:negative={profit < 0}
					>${profit.toFixed(2)}</span>
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
					>${money.toFixed(2)}</span>
				</div>
				<div class="final-stat">
					<span class="label">Total Profit</span>
					<span
						class="value"
						class:positive={money - INITIAL_MONEY >= 0}
						class:negative={money - INITIAL_MONEY < 0}
					>${(money - INITIAL_MONEY).toFixed(2)}</span>
				</div>
			</div>
			<div class="history">
				<h3>Daily History</h3>
				<div class="history-list">
					{#each dailyHistory as entry}
						<div class="history-entry">
							<span>Day {entry.day}</span>
							<span>{entry.weather}</span>
							<span>{entry.customers} customers</span>
							<span class:positive={entry.profit >= 0} class:negative={entry.profit < 0}
								>${entry.profit.toFixed(2)}</span
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
				<h2>Buy Supplies</h2>
				<p>Available: ${money.toFixed(2)}</p>
				
				<table class="buy-table">
					<tbody>
						<tr>
							<td>🥤 Cups</td>
							<td>
								<button onclick={() => buySupplies(25, 0, 0, 0)}>25</button>
								<button onclick={() => buySupplies(50, 0, 0, 0)}>50</button>
								<button onclick={() => buySupplies(100, 0, 0, 0)}>100</button>
							</td>
							<td>
								<span>${formatMoney(getBulkCost(25, CUP_COST, CUP_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(50, CUP_COST, CUP_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(100, CUP_COST, CUP_BULK_PRICES))}</span>
							</td>
						</tr>
						<tr>
							<td>🍋 Lemons</td>
							<td>
								<button onclick={() => buySupplies(0, 10, 0, 0)}>10</button>
								<button onclick={() => buySupplies(0, 30, 0, 0)}>30</button>
								<button onclick={() => buySupplies(0, 75, 0, 0)}>75</button>
							</td>
							<td>
								<span>${formatMoney(getBulkCost(10, LEMON_COST, LEMON_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(30, LEMON_COST, LEMON_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(75, LEMON_COST, LEMON_BULK_PRICES))}</span>
							</td>
						</tr>
						<tr>
							<td>🍬 Sugar</td>
							<td>
								<button onclick={() => buySupplies(0, 0, 8, 0)}>8</button>
								<button onclick={() => buySupplies(0, 0, 20, 0)}>20</button>
								<button onclick={() => buySupplies(0, 0, 48, 0)}>48</button>
							</td>
							<td>
								<span>${formatMoney(getBulkCost(8, SUGAR_COST, SUGAR_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(20, SUGAR_COST, SUGAR_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(48, SUGAR_COST, SUGAR_BULK_PRICES))}</span>
							</td>
						</tr>
						<tr>
							<td>🧊 Ice</td>
							<td>
								<button onclick={() => buySupplies(0, 0, 0, 100)}>100</button>
								<button onclick={() => buySupplies(0, 0, 0, 250)}>250</button>
								<button onclick={() => buySupplies(0, 0, 0, 500)}>500</button>
							</td>
							<td>
								<span>${formatMoney(getBulkCost(100, ICE_COST, ICE_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(250, ICE_COST, ICE_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(500, ICE_COST, ICE_BULK_PRICES))}</span>
							</td>
						</tr>
					</tbody>
				</table>
				
				<button class="btn close-btn" onclick={() => showBuyMenu = false}>Done</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.lemonade-container {
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
		background: #fbbf24;
		color: black;
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
		min-width: 400px;
	}

	.stats-panel {
		display: flex;
		justify-content: space-between;
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
		font-size: 1.5rem;
		font-weight: 900;
	}

	.supplies {
		display: flex;
		gap: 0.5rem;
		font-size: 1.1rem;
	}

	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-group .label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.price-control, .cups-control {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.price-control button,
	.cups-control button {
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

	.price-control button:hover,
	.cups-control button:hover {
		background: #3f3f46;
	}

	.price-control span, .cups-control span {
		font-size: 1.25rem;
		font-weight: 700;
		min-width: 80px;
		text-align: center;
	}

	.recipe-info {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.75rem;
		border-radius: 8px;
		font-size: 0.85rem;
	}

	.recipe-info p {
		margin: 0;
		color: rgba(255, 255, 255, 0.7);
	}

	.recipe-info .warning {
		color: #f87171;
		font-weight: 600;
		margin-top: 0.5rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
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

	.start-btn {
		background: #fbbf24;
		color: black;
	}

	.start-btn:hover:not(:disabled) {
		background: #f59e0b;
		transform: scale(1.02);
	}

	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		text-align: center;
	}

	.results-panel h2, .game-over-panel h2 {
		font-size: 1.75rem;
		font-weight: 900;
		margin: 0 0 1.5rem;
	}

	.weather-display {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.weather-icon {
		font-size: 2rem;
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
		font-size: 1.5rem;
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
		min-width: 400px;
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

	.buy-table {
		width: 100%;
		border-collapse: collapse;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.buy-table td {
		padding: 0.875rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-weight: 600;
		font-size: 0.95rem;
	}

	.buy-table tr:last-child td {
		border-bottom: none;
	}

	.buy-table td:first-child {
		padding-left: 1rem;
	}

	.buy-table td:nth-child(2) {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.buy-table td:nth-child(2) button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
	}

	.buy-table td:nth-child(2) button:hover {
		background: #3f3f46;
	}

	.buy-table td:nth-child(3) {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.buy-table td:nth-child(3) span {
		flex: 1;
		text-align: center;
		font-weight: 600;
		font-size: 0.9rem;
		color: #10b981;
	}

	.close-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		width: 100%;
		margin-top: 1rem;
	}

	.close-btn:hover {
		background: #3f3f46;
	}
</style>
