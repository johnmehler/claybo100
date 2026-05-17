<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants (Classic MECC values scaled 10x)
	const TOTAL_DAYS = 7;
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
	type Weather = "sunny" | "cloudy" | "rainy" | "hot" | "cold";

	interface WeatherInfo {
		type: Weather;
		temperature: number;
		icon: string;
		description: string;
	}

	const weatherTypes: WeatherInfo[] = [
		{ type: "sunny", temperature: 75, icon: "☀️", description: "Sunny" },
		{ type: "cloudy", temperature: 68, icon: "☁️", description: "Cloudy" },
		{ type: "hot", temperature: 95, icon: "🔥", description: "Hot" },
		{ type: "rainy", temperature: 60, icon: "🌧️", description: "Rainy" },
		{ type: "cold", temperature: 45, icon: "❄️", description: "Cold" }
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
	let visitors = $state(0);
	let customers = $state(0);
	let revenue = $state(0);
	let costs = $state(0);
	let profit = $state(0);
	
	let dailyHistory = $state<Array<{day: number, weather: Weather, visitors: number, customers: number, revenue: number, costs: number, profit: number}>>([]);
	
	let showResults = $state(false);
	let gameOver = $state(false);
	let showBuyMenu = $state(true);
	
	let selectedCups = $state(0);
	let selectedLemons = $state(0);
	let selectedSugar = $state(0);
	let selectedIce = $state(0);
	
	// Recipe ratios (per cup)
	let lemonsPerCup = $state(1);
	let sugarPerCup = $state(1);
	let icePerCup = $state(2);
	
	// Dynamic recipe optima (change daily)
	let idealSugar = $state(1);
	let idealIce = $state(2);
	
	// Cups to make (player commits before knowing demand)
	let cupsToCommit = $state(10);
	
	// Micro-event message for the day
	let dayMessage = $state("");

	function generateWeather(): WeatherInfo {
		const rand = Math.random();
		let baseWeather: WeatherInfo;
		
		if (rand < 0.35) baseWeather = weatherTypes[0]; // 35% sunny
		else if (rand < 0.60) baseWeather = weatherTypes[1]; // 25% cloudy
		else if (rand < 0.75) baseWeather = weatherTypes[2]; // 15% hot
		else if (rand < 0.90) baseWeather = weatherTypes[3]; // 15% rainy
		else baseWeather = weatherTypes[4]; // 10% cold
		
		// Add temperature variation (+/- 10 degrees)
		const tempVariation = Math.floor(Math.random() * 21) - 10;
		
		return {
			...baseWeather,
			temperature: baseWeather.temperature + tempVariation
		};
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

	function selectCups(quantity: number) {
		selectedCups = selectedCups === quantity ? 0 : quantity;
	}

	function selectLemons(quantity: number) {
		selectedLemons = selectedLemons === quantity ? 0 : quantity;
	}

	function selectSugar(quantity: number) {
		selectedSugar = selectedSugar === quantity ? 0 : quantity;
	}

	function selectIce(quantity: number) {
		selectedIce = selectedIce === quantity ? 0 : quantity;
	}

	function buySelected() {
		buySupplies(selectedCups, selectedLemons, selectedSugar, selectedIce);
		selectedCups = 0;
		selectedLemons = 0;
		selectedSugar = 0;
		selectedIce = 0;
	}

	function clearSelection() {
		selectedCups = 0;
		selectedLemons = 0;
		selectedSugar = 0;
		selectedIce = 0;
	}

	function getTotalSelectedCost(): number {
		return getBulkCost(selectedCups, CUP_COST, CUP_BULK_PRICES) +
		       getBulkCost(selectedLemons, LEMON_COST, LEMON_BULK_PRICES) +
		       getBulkCost(selectedSugar, SUGAR_COST, SUGAR_BULK_PRICES) +
		       getBulkCost(selectedIce, ICE_COST, ICE_BULK_PRICES);
	}

	function formatMoney(value: number): string {
		return value.toFixed(2);
	}

	function canMakeLemonade(count: number): boolean {
		// Recipe: 1 cup, lemonsPerCup lemons, sugarPerCup sugar, icePerCup ice per cup
		return cups >= count && lemons >= count * lemonsPerCup && sugar >= count * sugarPerCup && ice >= count * icePerCup;
	}

	function makeLemonade(): boolean {
		if (!canMakeLemonade(cupsToMake)) {
			alert("Not enough supplies to make that much lemonade!");
			return false;
		}
		
		cups -= cupsToMake;
		lemons -= cupsToMake * lemonsPerCup;
		sugar -= cupsToMake * sugarPerCup;
		ice -= cupsToMake * icePerCup;
		return true;
	}

	function calculateTasteScore(): number {
		// Calculate taste score based on recipe proportions vs dynamic optima
		const idealLemons = 1;
		
		// Deviation penalties
		const lemonDeviation = Math.abs(lemonsPerCup - idealLemons);
		const sugarDeviation = Math.abs(sugarPerCup - idealSugar);
		const iceDeviation = Math.abs(icePerCup - idealIce);
		
		// Base score starts at 100
		let score = 100;
		
		// Too many lemons = sour penalty
		if (lemonsPerCup > idealLemons) {
			score -= lemonDeviation * 20;
		}
		// Too few lemons = bland
		else if (lemonsPerCup < idealLemons) {
			score -= lemonDeviation * 15;
		}
		
		// Too much sugar = cloying penalty
		if (sugarPerCup > idealSugar) {
			score -= sugarDeviation * 25;
		}
		// Too little sugar = bad
		else if (sugarPerCup < idealSugar) {
			score -= sugarDeviation * 20;
		}
		
		// Ice penalty depends on temperature (still matters even with dynamic idealIce)
		if (currentWeather.temperature > 80) {
			// Hot weather: more ice is better
			if (icePerCup < idealIce) {
				score -= iceDeviation * 10;
			}
		} else if (currentWeather.temperature < 60) {
			// Cold weather: too much ice hurts
			if (icePerCup > idealIce) {
				score -= iceDeviation * 15;
			}
		}
		
		// Clamp score between 0 and 100
		return Math.max(0, Math.min(100, score));
	}

	function getTasteLabel(score: number): string {
		if (score >= 80) return "Excellent";
		if (score >= 50) return "Decent";
		return "Awful";
	}

	function generateDayMessage(): string {
		const messages: string[] = [];
		const tasteScore = calculateTasteScore();
		const sellRate = cupsToMake > 0 ? customers / cupsToMake : 0;
		const idealLemons = 1;
		
		// Recipe feedback
		if (sugarPerCup > idealSugar * 1.5) {
			messages.push("Customers found it too sweet!");
		} else if (sugarPerCup < idealSugar * 0.5) {
			messages.push("Not sweet enough for most people.");
		} else if (sugarPerCup >= idealSugar * 0.9 && sugarPerCup <= idealSugar * 1.1) {
			messages.push("Perfect sweetness balance!");
		}
		
		if (lemonsPerCup > idealLemons * 1.5) {
			messages.push("Too sour for many customers.");
		} else if (lemonsPerCup < idealLemons * 0.5) {
			messages.push("Bland flavor disappointed customers.");
		}
		
		// Ice feedback based on temperature
		if (currentWeather.temperature > 80 && icePerCup < idealIce) {
			messages.push("People wanted colder drinks on this hot day.");
		} else if (currentWeather.temperature < 60 && icePerCup > idealIce * 1.5) {
			messages.push("Too much ice for this chilly weather.");
		}
		
		// Price feedback
		if (pricePerCup > 1.50) {
			messages.push("Price was too high for most customers.");
		} else if (pricePerCup < 0.50) {
			messages.push("Great value - customers loved the low price!");
		}
		
		// Sales performance
		if (sellRate > 0.8) {
			messages.push("Sold almost everything you made!");
		} else if (sellRate < 0.3) {
			messages.push("Lots of unsold lemonade.");
		}
		
		// Weather-specific events
		if (currentWeather.type === "rainy") {
			messages.push("Rain kept many people away.");
		} else if (currentWeather.type === "hot" && visitors > 50) {
			messages.push("Heat wave brought huge crowds!");
		}
		
		// Return random message or empty string
		return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : "";
	}

	function calculateVisitorCount(): number {
		// Calculate total visitors based on weather and temperature
		let baseVisitors = 30;
		
		// Temperature effect
		if (currentWeather.temperature >= 75 && currentWeather.temperature <= 85) {
			baseVisitors *= 1.4;
		} else if (currentWeather.temperature > 85) {
			baseVisitors *= 1.8;
		} else if (currentWeather.temperature < 50) {
			baseVisitors *= 0.3;
		} else if (currentWeather.temperature < 65) {
			baseVisitors *= 0.6;
		}
		
		// Weather condition effect
		switch (currentWeather.type) {
			case "sunny":
				baseVisitors *= 1.3;
				break;
			case "cloudy":
				baseVisitors *= 1.0;
				break;
			case "hot":
				baseVisitors *= 1.6;
				break;
			case "rainy":
				baseVisitors *= 0.4;
				break;
			case "cold":
				baseVisitors *= 0.3;
				break;
		}
		
		// Jackpot variance: heat-wave explosions (15% chance on hot days)
		if (currentWeather.type === "hot" && Math.random() < 0.15) {
			baseVisitors *= 2;
		}
		
		// Random variation (±20%)
		const randomFactor = 0.8 + Math.random() * 0.4;
		
		return Math.floor(baseVisitors * randomFactor);
	}

	function calculateDemand(visitorCount: number): number {
		const tasteScore = calculateTasteScore();
		
		let customers = 0;
		
		// Each visitor makes a purchase decision
		for (let i = 0; i < visitorCount; i++) {
			// Base willingness to buy based on taste score
			let willingness = tasteScore / 100;
			
			// Price sensitivity depends on temperature
			// Hot weather = higher price tolerance
			// Cold weather = more price sensitive
			let targetPrice = 1.00;
			if (currentWeather.temperature > 80) {
				targetPrice = 1.20;
			} else if (currentWeather.temperature < 60) {
				targetPrice = 0.80;
			}
			
			// Exponential price decay for brutal cliffs
			// k controls steepness - higher = more brutal
			const k = 3.0;
			const priceFactor = Math.exp(-k * (pricePerCup - targetPrice) / targetPrice);
			willingness *= priceFactor;
			
			// Random individual variation
			willingness *= (0.8 + Math.random() * 0.4);
			
			// Decision
			if (Math.random() < willingness) {
				customers++;
			}
		}
		
		return customers;
	}

	function startDay() {
		if (showBuyMenu) {
			return;
		}

		// Calculate max cups possible based on supplies and recipe ratios
		const maxCups = Math.min(
			cups,
			Math.floor(lemons / lemonsPerCup),
			Math.floor(sugar / sugarPerCup),
			icePerCup > 0 ? Math.floor(ice / icePerCup) : Infinity
		);
		
		if (maxCups <= 0) {
			alert("Not enough supplies to make lemonade!");
			return;
		}
		
		// Player commits to cupsToCommit, cap by available supplies
		cupsToMake = Math.min(cupsToCommit, maxCups);
		
		if (!makeLemonade()) {
			return;
		}
		
		// Now calculate demand (player doesn't know this yet!)
		visitors = calculateVisitorCount();
		customers = calculateDemand(visitors);
		
		// Cap customers by cups made
		customers = Math.min(customers, cupsToMake);
		
		// Generate contextual message for the day
		dayMessage = generateDayMessage();
		
		revenue = customers * pricePerCup;
		
		// No daily operating costs - costs are only when buying supplies
		costs = 0;
		
		profit = revenue;
		money += revenue;
		
		dailyHistory.push({
			day: currentDay,
			weather: currentWeather.type,
			visitors,
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
		// All ice melts at the end of the day
		ice = 0;
		// Generate weather for the coming day
		currentWeather = generateWeather();
		
		// Update dynamic recipe optima based on new weather
		// idealIce: lerp(1, 4, heat) where heat is normalized temperature
		const normalizedHeat = Math.max(0, Math.min(1, (currentWeather.temperature - 40) / 60));
		idealIce = Math.round(1 + normalizedHeat * 3);
		
		// idealSugar: random daily drift around 1
		idealSugar = Math.max(0.5, Math.min(2, 1 + (Math.random() - 0.5) * 0.5));
		
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
		cupsToCommit = 10;
		lemonsPerCup = 1;
		sugarPerCup = 1;
		icePerCup = 2;
		idealSugar = 1;
		idealIce = 2;
		dayMessage = "";
		dailyHistory = [];
		showResults = false;
		gameOver = false;
		showBuyMenu = true;
	}

	onMount(() => {
		// Generate weather for day 1 at game start
		currentWeather = generateWeather();
		
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

			<div class="weather-panel">
				<div class="weather-display">
					<span class="weather-icon">{currentWeather.icon}</span>
					<span class="weather-text">{currentWeather.description} — {currentWeather.temperature}°F</span>
				</div>
			</div>

			<div class="price-panel">
				<div class="price-control">
					<span class="label">Price per Cup</span>
					<div class="price-buttons">
						<button onclick={() => pricePerCup = Math.max(0.10, pricePerCup - 0.10)}>-</button>
						<span>${pricePerCup.toFixed(2)}</span>
						<button onclick={() => pricePerCup = Math.min(5.00, pricePerCup + 0.10)}>+</button>
					</div>
				</div>
			</div>

			<div class="cups-panel">
				<div class="cups-control">
					<span class="label">Cups to Make</span>
					<div class="cups-buttons">
						<button onclick={() => cupsToCommit = Math.max(1, cupsToCommit - 5)}>-5</button>
						<span>{cupsToCommit}</span>
						<button onclick={() => cupsToCommit = cupsToCommit + 5}>+5</button>
					</div>
				</div>
			</div>

			<div class="recipe-panel">
				<h3>Recipe per Cup</h3>
				<div class="recipe-controls">
					<div class="recipe-item">
						<span class="label">🍋 Lemons</span>
						<div class="recipe-control">
							<button onclick={() => lemonsPerCup = Math.max(0.5, lemonsPerCup - 0.5)}>-</button>
							<span>{lemonsPerCup}</span>
							<button onclick={() => lemonsPerCup = Math.min(3, lemonsPerCup + 0.5)}>+</button>
						</div>
					</div>
					<div class="recipe-item">
						<span class="label">🍬 Sugar</span>
						<div class="recipe-control">
							<button onclick={() => sugarPerCup = Math.max(0.5, sugarPerCup - 0.5)}>-</button>
							<span>{sugarPerCup}</span>
							<button onclick={() => sugarPerCup = Math.min(3, sugarPerCup + 0.5)}>+</button>
						</div>
					</div>
					<div class="recipe-item">
						<span class="label">🧊 Ice</span>
						<div class="recipe-control">
							<button onclick={() => icePerCup = Math.max(0, icePerCup - 1)}>-</button>
							<span>{icePerCup}</span>
							<button onclick={() => icePerCup = Math.min(5, icePerCup + 1)}>+</button>
						</div>
					</div>
				</div>
				<div class="taste-preview">
					<span>Recipe Quality: {getTasteLabel(calculateTasteScore())}</span>
				</div>
			</div>

			<div class="action-buttons">
				<button class="btn secondary-btn" onclick={() => showBuyMenu = true}>Buy Supplies</button>
				<button class="btn start-btn" onclick={startDay} disabled={!canMakeLemonade(1)}>Start Day</button>
			</div>
		</div>
	{:else if showResults && !gameOver}
		<div class="results-panel">
			<h2>Day {currentDay} Results</h2>
			<div class="weather-display">
				<span class="weather-icon">{currentWeather.icon}</span>
				<span>{currentWeather.description} — {currentWeather.temperature}°F</span>
			</div>
			{#if dayMessage}
				<div class="day-message">
					<span>{dayMessage}</span>
				</div>
			{/if}
			<div class="results-stats">
				<div class="result">
					<span class="label">Customers</span>
					<span class="value">{customers} / {visitors}</span>
				</div>
				<div class="result">
					<span class="label">Revenue</span>
					<span class="value positive">${revenue.toFixed(2)}</span>
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
								<button class:selected={selectedCups === 25} onclick={() => selectCups(25)}>25</button>
								<button class:selected={selectedCups === 50} onclick={() => selectCups(50)}>50</button>
								<button class:selected={selectedCups === 100} onclick={() => selectCups(100)}>100</button>
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
								<button class:selected={selectedLemons === 10} onclick={() => selectLemons(10)}>10</button>
								<button class:selected={selectedLemons === 30} onclick={() => selectLemons(30)}>30</button>
								<button class:selected={selectedLemons === 75} onclick={() => selectLemons(75)}>75</button>
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
								<button class:selected={selectedSugar === 8} onclick={() => selectSugar(8)}>8</button>
								<button class:selected={selectedSugar === 20} onclick={() => selectSugar(20)}>20</button>
								<button class:selected={selectedSugar === 48} onclick={() => selectSugar(48)}>48</button>
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
								<button class:selected={selectedIce === 100} onclick={() => selectIce(100)}>100</button>
								<button class:selected={selectedIce === 250} onclick={() => selectIce(250)}>250</button>
								<button class:selected={selectedIce === 500} onclick={() => selectIce(500)}>500</button>
							</td>
							<td>
								<span>${formatMoney(getBulkCost(100, ICE_COST, ICE_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(250, ICE_COST, ICE_BULK_PRICES))}</span>
								<span>${formatMoney(getBulkCost(500, ICE_COST, ICE_BULK_PRICES))}</span>
							</td>
						</tr>
					</tbody>
				</table>
				
				<div class="buy-preview">
					<span>Total: ${formatMoney(getTotalSelectedCost())}</span>
				</div>
				
				<div class="buy-actions">
					<button class="btn buy-btn" onclick={buySelected} disabled={getTotalSelectedCost() === 0}>Buy</button>
					<button class="btn close-btn" onclick={() => { clearSelection(); showBuyMenu = false; }}>Done</button>
				</div>
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

	.weather-panel {
		margin-bottom: 2rem;
	}

	.weather-display {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.weather-icon {
		font-size: 2rem;
	}

	.weather-text {
		font-weight: 600;
	}

	.day-message {
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		padding: 0.75rem;
		border-radius: 8px;
		text-align: center;
		margin-bottom: 1rem;
		font-weight: 600;
		font-size: 0.9rem;
		color: #fbbf24;
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

	.cups-panel {
		margin-bottom: 2rem;
	}

	.cups-control {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
	}

	.cups-control .label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 600;
	}

	.cups-buttons {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.cups-buttons button {
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

	.cups-buttons button:hover {
		background: #3f3f46;
	}

	.cups-buttons span {
		font-size: 1.25rem;
		font-weight: 700;
		min-width: 50px;
		text-align: center;
	}

	.recipe-panel {
		margin-bottom: 2rem;
	}

	.recipe-panel h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.recipe-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recipe-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.recipe-item .label {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 600;
	}

	.recipe-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.recipe-control button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.recipe-control button:hover {
		background: #3f3f46;
	}

	.recipe-control span {
		font-size: 0.95rem;
		font-weight: 700;
		min-width: 30px;
		text-align: center;
	}

	.taste-preview {
		background: rgba(255, 255, 255, 0.05);
		padding: 0.75rem;
		border-radius: 8px;
		text-align: center;
		margin-top: 0.75rem;
		font-weight: 700;
		font-size: 0.9rem;
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
		background: #fbbf24;
		color: black;
	}

	.start-btn:hover:not(:disabled) {
		background: #f59e0b;
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

	.buy-table td:nth-child(2) button.selected {
		background: #fbbf24;
		color: black;
		border-color: #fbbf24;
	}

	.buy-table td:nth-child(2) button.selected:hover {
		background: #f59e0b;
		border-color: #f59e0b;
	}

	.buy-preview {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		margin-bottom: 1rem;
		font-weight: 700;
		font-size: 1.1rem;
	}

	.buy-actions {
		display: flex;
		gap: 1rem;
	}

	.buy-btn {
		background: #10b981;
		color: white;
	}

	.buy-btn:hover:not(:disabled) {
		background: #059669;
	}

	.close-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
	}

	.close-btn:hover {
		background: #3f3f46;
	}
</style>
