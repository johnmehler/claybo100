<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const TOTAL_TURNS = 12;
	const INITIAL_CASH = 50000.00;
	const BASE_COST = 5.00;
	const BASE_REPUTATION = 5.0;
	const UNITS_PER_EMPLOYEE = 10;

	// Player inputs (5 per turn)
	let price = $state(15.00);
	let quality = $state(5);
	let marketing = $state(1000);
	let productionQuantity = $state(100);
	let employeePay = $state(100);
	let qualitySpending = $state(2000);
	let previousQuality = $state(5);
	let previousMarketShare = $state(0.2);
	let inventoryQuality = $state(5);

	let previousPrice = $state(15.00);
	let previousQualitySpending = $state(2000);
	let previousMarketing = $state(1000);
	let previousProductionQuantity = $state(100);
	let previousEmployeePay = $state(100);
	let payHistory = $state([100, 100, 100]);

	// Input options
	const priceOptions = Array.from({ length: 21 }, (_, i) => i + 5);
	const qualitySpendingOptions = Array.from({ length: 161 }, (_, i) => i * 100);
	const marketingOptions = Array.from({ length: 51 }, (_, i) => i * 100);
	const productionOptions = [50, 100, 150, 200, 300, 500];
	const payOptions = Array.from({ length: 16 }, (_, i) => 50 + i * 10);

	// Hidden state variables
	let cash = $state(INITIAL_CASH);
	let reputation = $state(BASE_REPUTATION);
	let productionEfficiency = $state(1.0);
	let inventory = $state(100);
	let marketDemand = $state(500);
	let marketShare = $state(0.2);
	let playerTeam = $state("");

	// AI Competitors (4 competitors with names)
	type AICompetitor = {
		name: string;
		price: number;
		quality: number;
		qualitySpending: number;
		previousQuality: number;
		marketing: number;
		production: number;
		employeePay: number;
		cash: number;
		reputation: number;
		productionEfficiency: number;
		inventory: number;
		inventoryQuality: number;
		payHistory: number[];
	};

	const allTeams = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
	const teamColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#a855f7"];

	let aiCompetitors = $state<AICompetitor[]>([]);

	function initializeTeams(): void {
		// Randomly assign player a team
		const shuffledTeams = [...allTeams].sort(() => Math.random() - 0.5);
		playerTeam = shuffledTeams[0];
		const aiTeamNames = shuffledTeams.slice(1);

		// Initialize AI competitors
		aiCompetitors = aiTeamNames.map(name => ({
			name,
			price: 15.00,
			quality: 5,
			qualitySpending: 2000,
			previousQuality: 5,
			marketing: 1000,
			production: 100,
			employeePay: 100,
			cash: INITIAL_CASH,
			reputation: BASE_REPUTATION,
			productionEfficiency: 1.0,
			inventory: 100,
			inventoryQuality: 5,
			payHistory: [100, 100, 100]
		}));
	}

	// Initialize teams on mount
	onMount(() => {
		initializeTeams();
	});

	// Turn tracking
	let currentTurn = $state(1);
	let showResults = $state(false);
	let gameOver = $state(false);

	// Tab state
	let activeTab = $state("game");
	let activeChart = $state("quality");

	// Results
	let demandScore = $state(0);
	let unitCost = $state(0);
	let unitsSold = $state(0);
	let revenue = $state(0);
	let costs = $state(0);
	let profit = $state(0);
	let feedback = $state("");
	let marketPreference = $state({
		priceWeight: 1,
		qualityWeight: 1,
		marketingWeight: 1,
		premiumShare: 0.5
	});

	let history = $state<Array<{
		turn: number,
		cash: number,
		marketShare: number,
		reputation: number,
		profit: number,
		teams: Array<{
			name: string,
			quality: number,
			price: number,
			marketShare: number
		}>
	}>>([]);

	// Core equations

	function updateMarketPreference(): void {
		const rawPriceWeight = marketPreference.priceWeight * (0.97 + Math.random() * 0.06);
		const rawQualityWeight = marketPreference.qualityWeight * (0.97 + Math.random() * 0.06);
		const rawMarketingWeight = marketPreference.marketingWeight * (0.97 + Math.random() * 0.06);

		const averageWeight = (rawPriceWeight + rawQualityWeight + rawMarketingWeight) / 3;
		const premiumShare = Math.max(
			0.35,
			Math.min(0.65, marketPreference.premiumShare + (Math.random() * 0.08 - 0.04))
		);

		marketPreference = {
			priceWeight: rawPriceWeight / averageWeight,
			qualityWeight: rawQualityWeight / averageWeight,
			marketingWeight: rawMarketingWeight / averageWeight,
			premiumShare
		};
	}

	function calculateDemandScore(
		company: { price: number; quality: number; marketing: number; reputation: number; employeePay: number },
		demandNoise: number
	): number {
		const payQualityAdjustment = ((company.employeePay - 100) / 100) * 0.4;
		const adjustedQuality = Math.max(1, (company.quality + payQualityAdjustment) * marketPreference.qualityWeight);
		const adjustedPrice = Math.max(1, company.price * marketPreference.priceWeight);
		const adjustedMarketing = Math.max(0, company.marketing * marketPreference.marketingWeight);

		const valueSegmentScore =
			(Math.log1p(Math.pow(adjustedQuality * 0.85, 1.25)) * Math.sqrt(adjustedMarketing + 1)) /
			Math.pow(adjustedPrice, 1.5);

		const premiumSegmentScore =
			(Math.log1p(Math.pow(adjustedQuality * 1.15, 1.4)) * Math.sqrt(adjustedMarketing + 1)) /
			Math.pow(adjustedPrice, 1.3);

		const segmentScore =
			(1 - marketPreference.premiumShare) * valueSegmentScore +
			marketPreference.premiumShare * premiumSegmentScore;

		const reputationFactor = Math.sqrt(1 + 0.15 * company.reputation);

		return Math.max(0.001, segmentScore * reputationFactor * demandNoise);
	}

	function calculateUnitCost(): number {
		const B = BASE_COST;
		const E = employeePay / 100;

		return Math.max(2, B + 0.4 * quality - 0.35 * E);
	}

	function calculateEmployeeCount(units: number): number {
		return Math.max(1, Math.ceil(units / UNITS_PER_EMPLOYEE));
	}

	function calculateLaborCost(units: number, payPerEmployee: number): number {
		const employeeCount = calculateEmployeeCount(units);
		return employeeCount * (payPerEmployee / 10);
	}

	function calculateQualityFromSpending(spending: number, prevQuality: number): number {
		const normalizedSpending = spending / 1000;

		const spendingQuality = 1 + 8 * (1 - Math.exp(-normalizedSpending / 2.5));

		const persistenceWeight = 0.4;
		const spendingWeight = 1 - persistenceWeight;

		const blendedQuality = persistenceWeight * prevQuality + spendingWeight * spendingQuality;

		return Math.max(1, Math.min(9, blendedQuality));
	}

	// Customer satisfaction — what they actually experienced (0-10 scale)
	function computeSatisfaction(soldQuality: number, soldPrice: number, fulfillmentRate: number): number {
		// Value-for-money: quality relative to expected at price (baseline 5 at $15)
		const expectedQuality = 3 + (soldPrice - 5) * 0.25; // ~3 at $5, ~8 at $25
		const valueScore = 5 + (soldQuality - expectedQuality) * 1.2;
		// Fulfillment matters — couldn't get product = unhappy
		return Math.max(0, Math.min(10, valueScore * fulfillmentRate));
	}

	// Failures — stockouts, low quality, labor scandals (0-10 scale)
	function computeFailures(stockoutRate: number, soldQuality: number, avgPay: number): number {
		const stockoutFailure = stockoutRate * 5; // up to 5 if completely stocked out
		const qualityScandal = Math.max(0, 4 - soldQuality) * 1.5; // up to 4.5 if quality 1
		const sweatshopScandal = avgPay < 70 ? Math.min(3, (70 - avgPay) / 10) : 0;
		return Math.min(10, stockoutFailure + qualityScandal + sweatshopScandal);
	}

	function updateReputation(satisfaction: number, failures: number): void {
		const M = marketing / 1000; // 0-5 scale
		// Network effect: high reputation amplifies positive momentum, low rep dampens recovery
		const networkBoost = 1 + 0.08 * (reputation - 5);
		// Asymmetric decay: bad reputation is sticky (slower decay), good reputation needs to be earned
		const decayRate = reputation >= 5 ? 0.92 : 0.95;
		const nextReputation =
			decayRate * reputation
			+ 0.05 * satisfaction * networkBoost
			+ 0.02 * M
			- 0.03 * failures;
		reputation = Math.max(0, Math.min(10, nextReputation));
	}

	function updateProductionEfficiency(): void {
		// Efficiency is driven by sustained pay (history) so consistently
		// paying above median keeps efficiency high without needing raises.
		const avgPay = payHistory.reduce((s, p) => s + p, 0) / payHistory.length;
		const E = (employeePay + avgPay) / 200;
		const targetEfficiency = 0.9 + 0.5 * E;

		productionEfficiency = Math.max(
			0.7,
			Math.min(1.6, 0.7 * productionEfficiency + 0.3 * targetEfficiency)
		);
	}

	function simulateCompetitors(): void {
		// AI strategy: use base values +/- one option in each direction
		aiCompetitors.forEach(ai => {
			// Get current index in options arrays
			const priceIndex = priceOptions.indexOf(ai.price);
			const spendingIndex = qualitySpendingOptions.indexOf(ai.qualitySpending);
			const marketingIndex = marketingOptions.indexOf(ai.marketing);
			const productionIndex = productionOptions.indexOf(ai.production);
			const payIndex = payOptions.indexOf(ai.employeePay);

			// Move to adjacent option (+/- 1) or stay at current
			const priceMove = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
			const spendingMove = Math.floor(Math.random() * 3) - 1;
			const marketingMove = Math.floor(Math.random() * 3) - 1;
			const productionMove = Math.floor(Math.random() * 3) - 1;
			const payMove = Math.floor(Math.random() * 3) - 1;

			// Apply moves within bounds
			const newPriceIndex = Math.max(0, Math.min(priceOptions.length - 1, priceIndex + priceMove));
			const newSpendingIndex = Math.max(0, Math.min(qualitySpendingOptions.length - 1, spendingIndex + spendingMove));
			const newMarketingIndex = Math.max(0, Math.min(marketingOptions.length - 1, marketingIndex + marketingMove));
			const newProductionIndex = Math.max(0, Math.min(productionOptions.length - 1, productionIndex + productionMove));
			const newPayIndex = Math.max(0, Math.min(payOptions.length - 1, payIndex + payMove));

			ai.price = priceOptions[newPriceIndex];
			ai.qualitySpending = qualitySpendingOptions[newSpendingIndex];
			ai.marketing = marketingOptions[newMarketingIndex];
			ai.production = productionOptions[newProductionIndex];
			ai.employeePay = payOptions[newPayIndex];
		});
	}

	function executeAITurn(ai: AICompetitor, aiMarketShare: number): void {
		const aiActualQuality = calculateQualityFromSpending(ai.qualitySpending, ai.previousQuality);
		ai.quality = aiActualQuality;
		const aiUnitCost = Math.max(2, BASE_COST + 0.4 * ai.quality - 0.35 * (ai.employeePay / 100));

		// Production — efficiency above 1.0 yields extra units
		let aiActualProduction = Math.floor(ai.production * ai.productionEfficiency);
		if (ai.employeePay < 100 && Math.random() < (100 - ai.employeePay) / 160) {
			aiActualProduction = Math.floor(aiActualProduction * (0.6 + Math.random() * 0.25));
		}

		if (ai.inventory === 0) {
			ai.inventory = aiActualProduction;
			ai.inventoryQuality = ai.quality;
		} else {
			const totalUnits = ai.inventory + aiActualProduction;
			ai.inventoryQuality = (ai.inventory * ai.inventoryQuality + aiActualProduction * ai.quality) / totalUnits;
			ai.inventory = totalUnits;
		}

		// Sales (AI gets their share of market demand)
		const aiActualDemand = Math.floor(marketDemand * aiMarketShare);
		const aiAvailableUnits = Math.min(ai.inventory, aiActualDemand);
		const aiSoldQuality = ai.inventoryQuality;
		ai.inventory -= aiAvailableUnits;

		// Revenue and costs
		const aiRevenue = aiAvailableUnits * ai.price;
		const aiProductionCost = aiActualProduction * aiUnitCost;
		const aiMarketingCost = ai.marketing;
		const aiLaborCost = (ai.employeePay / 10) * (ai.production / 10);
		const aiCosts = aiProductionCost + aiMarketingCost + aiLaborCost;
		const aiProfit = aiRevenue - aiCosts;
		ai.cash += aiProfit;

		// Reputation — driven by satisfaction, marketing, failures
		const aiAveragePayHistory = ai.payHistory.reduce((sum, pay) => sum + pay, 0) / ai.payHistory.length;
		const aiFulfillmentRate = aiActualDemand > 0 ? aiAvailableUnits / aiActualDemand : 1;
		const aiStockoutRate = aiActualDemand > 0 ? Math.max(0, 1 - aiAvailableUnits / aiActualDemand) : 0;
		const aiExpectedQuality = 3 + (ai.price - 5) * 0.25;
		const aiValueScore = 5 + (aiSoldQuality - aiExpectedQuality) * 1.2;
		const aiSatisfaction = Math.max(0, Math.min(10, aiValueScore * aiFulfillmentRate));
		const aiQualityScandal = Math.max(0, 4 - aiSoldQuality) * 1.5;
		const aiSweatshopScandal = aiAveragePayHistory < 70 ? Math.min(3, (70 - aiAveragePayHistory) / 10) : 0;
		const aiFailures = Math.min(10, aiStockoutRate * 5 + aiQualityScandal + aiSweatshopScandal);
		const aiNetworkBoost = 1 + 0.08 * (ai.reputation - 5);
		const aiDecayRate = ai.reputation >= 5 ? 0.92 : 0.95;
		const aiNextReputation =
			aiDecayRate * ai.reputation
			+ 0.05 * aiSatisfaction * aiNetworkBoost
			+ 0.02 * (ai.marketing / 1000)
			- 0.03 * aiFailures;
		ai.reputation = Math.max(0, Math.min(10, aiNextReputation));

		const aiTargetEfficiency = 0.9 + 0.5 * ((ai.employeePay + aiAveragePayHistory) / 200);
		ai.productionEfficiency = Math.max(
			0.7,
			Math.min(1.6, 0.7 * ai.productionEfficiency + 0.3 * aiTargetEfficiency)
		);

		ai.previousQuality = ai.quality;
		ai.payHistory = [ai.employeePay, ...ai.payHistory.slice(0, 2)];
	}

	function executeTurn(): void {
		// Save previous input values
		previousPrice = price;
		previousQualitySpending = qualitySpending;
		previousMarketing = marketing;
		previousProductionQuantity = productionQuantity;
		previousEmployeePay = employeePay;

		const actualQuality = calculateQualityFromSpending(qualitySpending, previousQuality);
		quality = actualQuality;
		updateMarketPreference();

		// Calculate demand
		const playerDemandScore = calculateDemandScore(
			{ price, quality, marketing, reputation, employeePay },
			0.96 + Math.random() * 0.08
		);
		const aiDemandScores = aiCompetitors.map(ai =>
			calculateDemandScore(
				{
					price: ai.price,
					quality: ai.quality,
					marketing: ai.marketing,
					reputation: ai.reputation,
					employeePay: ai.employeePay
				},
				0.96 + Math.random() * 0.08
			)
		);
		const totalAIDemandScore = aiDemandScores.reduce((sum, score) => sum + score, 0);
		const totalDemandScore = playerDemandScore + totalAIDemandScore;

		demandScore = playerDemandScore;

		// Market share (player vs 4 AI competitors)
		marketShare = totalDemandScore > 0 ? playerDemandScore / totalDemandScore : 0;
		const aiMarketShares = aiDemandScores.map(score => (totalDemandScore > 0 ? score / totalDemandScore : 0));
		const actualDemand = Math.floor(marketDemand * marketShare);

		// Execute AI competitors for this quarter
		aiCompetitors.forEach((ai, index) => executeAITurn(ai, aiMarketShares[index]));

		// Production and inventory — efficiency above 1.0 yields extra units beyond planned quantity
		let actualProduction = Math.floor(productionQuantity * productionEfficiency);
		if (employeePay < 100 && Math.random() < (100 - employeePay) / 160) {
			actualProduction = Math.floor(actualProduction * (0.6 + Math.random() * 0.25));
		}

		if (inventory === 0) {
			inventory = actualProduction;
			inventoryQuality = quality;
		} else {
			const totalUnits = inventory + actualProduction;
			inventoryQuality = (inventory * inventoryQuality + actualProduction * quality) / totalUnits;
			inventory = totalUnits;
		}

		// Sales
		const availableUnits = Math.min(inventory, actualDemand);
		unitsSold = availableUnits;
		const soldQuality = inventoryQuality;
		inventory -= availableUnits;

		// Revenue and costs
		revenue = unitsSold * price;
		unitCost = calculateUnitCost();
		const productionCost = actualProduction * unitCost;
		const marketingCost = marketing;
		const laborCost = calculateLaborCost(productionQuantity, employeePay);

		costs = productionCost + marketingCost + laborCost;
		profit = revenue - costs;
		cash += profit;

		// Update hidden state — reputation driven by realized customer experience
		const fulfillmentRate = actualDemand > 0 ? unitsSold / actualDemand : 1;
		const stockoutRate = actualDemand > 0 ? Math.max(0, 1 - unitsSold / actualDemand) : 0;
		const avgPay = payHistory.reduce((s, p) => s + p, 0) / payHistory.length;
		const satisfaction = computeSatisfaction(soldQuality, price, fulfillmentRate);
		const failures = computeFailures(stockoutRate, soldQuality, avgPay);
		updateReputation(satisfaction, failures);
		updateProductionEfficiency();
		simulateCompetitors();

		previousQuality = quality;
		previousMarketShare = marketShare;

		// Update pay history
		payHistory = [employeePay, ...payHistory.slice(0, 2)];

		// Generate feedback
		generateFeedback();

		// Update market demand randomly by -1% to 11%
		const demandChangePercent = (Math.random() * 12 - 1) / 100; // -0.01 to 0.11
		marketDemand = Math.max(100, Math.round(marketDemand * (1 + demandChangePercent)));

		// Record history
		const teamSnapshots = [
			{ name: playerTeam, quality, price, marketShare },
			...aiCompetitors.map((ai, index) => ({
				name: ai.name,
				quality: ai.quality,
				price: ai.price,
				marketShare: aiMarketShares[index]
			}))
		];

		history.push({
			turn: currentTurn,
			cash,
			marketShare,
			reputation,
			profit,
			teams: teamSnapshots
		});

		showResults = true;

		if (currentTurn >= TOTAL_TURNS) {
			gameOver = true;
		}
	}

	function generateFeedback(): void {
		const messages: string[] = [];

		// Calculate average competitor values
		const avgPrice = aiCompetitors.reduce((sum, ai) => sum + ai.price, 0) / aiCompetitors.length;
		const avgQuality = aiCompetitors.reduce((sum, ai) => sum + ai.quality, 0) / aiCompetitors.length;
		const avgMarketing = aiCompetitors.reduce((sum, ai) => sum + ai.marketing, 0) / aiCompetitors.length;

		if (marketShare < 0.3) messages.push("Struggling to compete in the market");
		else if (marketShare > 0.6) messages.push("Dominating market share!");

		if (price > avgPrice * 1.2) messages.push("Customers think you're overpriced");
		else if (price < avgPrice * 0.8) messages.push("Aggressive pricing strategy");

		if (quality < avgQuality - 2) messages.push("Quality concerns hurting reputation");
		else if (quality > avgQuality + 2) messages.push("Premium quality building brand loyalty");

		if (marketing < avgMarketing * 0.5) messages.push("Marketing budget too low");
		else if (marketing > avgMarketing * 2) messages.push("Heavy marketing spend");

		if (productionEfficiency < 1.1) messages.push("Low production efficiency");
		else if (productionEfficiency > 1.3) messages.push("Highly efficient production");

		if (inventory > productionQuantity * 0.5) messages.push("Inventory building up");
		else if (unitsSold < Math.floor(marketDemand * marketShare) * 0.7) messages.push("Stockouts limiting sales");

		if (profit < 0) messages.push("Losses this turn");
		else if (profit > 5000) messages.push("Strong profitability");

		feedback = messages.slice(0, 2).join(". ");
	}

	const plannedEmployeeCount = $derived(calculateEmployeeCount(productionQuantity));
	const projectedLaborCost = $derived(calculateLaborCost(productionQuantity, employeePay));
	const projectedQuality = $derived(calculateQualityFromSpending(qualitySpending, previousQuality));

	const averagePayHistory = $derived(payHistory.reduce((sum, pay) => sum + pay, 0) / payHistory.length);
	const currentEfficiency = $derived(0.9 + 0.5 * ((employeePay + averagePayHistory) / 200));
	const previousEfficiency = $derived(0.9 + 0.5 * ((previousEmployeePay + averagePayHistory) / 200));

	const projectedUnitCost = $derived(BASE_COST + 0.4 * projectedQuality - 0.35 * (employeePay / 100));
	const projectedProductionCost = $derived(productionQuantity * projectedUnitCost);
	const projectedTotalCost = $derived(projectedProductionCost + marketing + projectedLaborCost);
	const projectedBreakeven = $derived(Math.ceil(projectedTotalCost / price));

	function dumpInventory(): void {
		inventory = 0;
		inventoryQuality = 5;
	}

	function nextTurn(): void {
		currentTurn++;
		showResults = false;
	}

	function resetGame(): void {
		currentTurn = 1;
		cash = INITIAL_CASH;
		reputation = BASE_REPUTATION;
		productionEfficiency = 1.0;
		inventory = 100;
		inventoryQuality = 5;
		marketDemand = 500;

		price = 15.00;
		quality = 5;
		qualitySpending = 2000;
		previousQuality = 5;
		previousMarketShare = 0.2;
		marketing = 1000;
		productionQuantity = 100;
		employeePay = 100;

		previousPrice = 15.00;
		previousQualitySpending = 2000;
		previousMarketing = 1000;
		previousProductionQuantity = 100;
		previousEmployeePay = 100;
		payHistory = [100, 100, 100];
		marketPreference = {
			priceWeight: 1,
			qualityWeight: 1,
			marketingWeight: 1,
			premiumShare: 0.5
		};

		// Reinitialize teams
		initializeTeams();

		showResults = false;
		gameOver = false;
		history = [];
	}

	function formatMoney(value: number): string {
		return value.toFixed(2);
	}

	function formatPercent(value: number): string {
		return (value * 100).toFixed(1) + "%";
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
		<div class="turn-badge">Quarter {currentTurn}/{TOTAL_TURNS}</div>
		<h1>🏭 Apex Industries - Team: {playerTeam}</h1>
	</div>

	<!-- Tab Navigation -->
	<div class="tab-nav">
		<button class="tab-btn" class:active={activeTab === "game"} onclick={() => activeTab = "game"}>Inputs</button>
		<button class="tab-btn" class:active={activeTab === "market"} onclick={() => activeTab = "market"}>Projections</button>
		<button class="tab-btn" class:active={activeTab === "results"} onclick={() => activeTab = "results"}>Results</button>
		<button class="tab-btn" class:active={activeTab === "competitor"} onclick={() => activeTab = "competitor"}>Competitors</button>
	</div>

	{#if activeTab === "game" && !showResults && !gameOver}
	<div class="game-viewport">
		<div class="stats-panel">
			<div class="stat">
				<span class="label">Cash</span>
				<span class="value">${formatMoney(cash)}</span>
			</div>
			<div class="stat">
				<span class="label">Market Share</span>
				<span class="value">{formatPercent(marketShare)}</span>
			</div>
			<div class="stat">
				<span class="label">Reputation</span>
				<span class="value">{reputation.toFixed(2)}</span>
			</div>
		</div>

		<div class="inputs-panel">
			<h3>Your Strategy</h3>
			<div class="input-grid">
				<div class="input-group">
					<label for="price">Price</label>
					<input type="number" id="price" bind:value={price} min="5" max="25" step="1" />
					<div class="input-preview">
						<span class="preview-label">Change:</span>
						<span class="preview-value">${previousPrice.toFixed(2)} → ${price.toFixed(2)}</span>
					</div>
				</div>
				<div class="input-group">
					<label for="quality">Quality Spending</label>
					<input type="number" id="quality" bind:value={qualitySpending} min="0" max="16000" step="100" />
					<div class="quality-preview">
						<span class="quality-label">Resulting Quality:</span>
						<span class="quality-value">{previousQuality.toFixed(2)} → {projectedQuality.toFixed(2)}</span>
					</div>
				</div>
				<div class="input-group">
					<label for="marketing">Marketing</label>
					<input type="number" id="marketing" bind:value={marketing} min="0" max="5000" step="100" />
					<div class="input-preview">
						<span class="preview-label">Change:</span>
						<span class="preview-value">${previousMarketing} → ${marketing}</span>
					</div>
				</div>
				<div class="input-group">
					<label for="production">Production</label>
					<select id="production" bind:value={productionQuantity}>
						{#each productionOptions as option}
							<option value={option}>{option} units</option>
						{/each}
					</select>
					<div class="inventory-preview">
						<span class="inventory-label">Current Inventory:</span>
						<span class="inventory-value">{inventory} units @ {inventoryQuality.toFixed(2)}</span>
					</div>
					{#if inventory > 0}
						<button class="dump-btn" onclick={dumpInventory}>Dump Inventory</button>
					{/if}
				</div>
				<div class="input-group">
					<label for="pay">Employee Pay</label>
					<input type="number" id="pay" bind:value={employeePay} min="50" max="200" step="10" />
					<div class="efficiency-preview">
						<span class="efficiency-label">Efficiency (avg pay: ${averagePayHistory.toFixed(0)}):</span>
						<span class="efficiency-value">{previousEfficiency.toFixed(2)} → {currentEfficiency.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="projections-panel">
			<h3>Quarter Projections</h3>
			<div class="projection-grid">
				<div class="projection-item">
					<span class="projection-label">Unit Cost</span>
					<span class="projection-value">${projectedUnitCost.toFixed(2)}</span>
				</div>
				<div class="projection-item">
					<span class="projection-label">Production Cost</span>
					<span class="projection-value">${formatMoney(projectedProductionCost)}</span>
				</div>
				<div class="projection-item">
					<span class="projection-label">Marketing Cost</span>
					<span class="projection-value">${formatMoney(marketing)}</span>
				</div>
				<div class="projection-item">
					<span class="projection-label">Labor Cost</span>
					<span class="projection-value">${formatMoney(projectedLaborCost)}</span>
				</div>
				<div class="projection-item total">
					<span class="projection-label">Total Cost</span>
					<span class="projection-value">${formatMoney(projectedTotalCost)}</span>
				</div>
				<div class="projection-item breakeven">
					<span class="projection-label">Breakeven Sales</span>
					<span class="projection-value">{projectedBreakeven} units</span>
				</div>
			</div>
		</div>

		<div class="competitor-panel">
			<h3>Competitors (Average)</h3>
			<table class="competitor-table">
				<tbody>
					{#if currentTurn === 1}
						<tr>
							<td>Price</td>
							<td>$15.00</td>
						</tr>
						<tr>
							<td>Quality</td>
							<td>5</td>
						</tr>
						<tr>
							<td>Marketing</td>
							<td>$1,000</td>
						</tr>
					{:else}
						<tr>
							<td>Price</td>
							<td>${(aiCompetitors.reduce((sum, ai) => sum + ai.price, 0) / aiCompetitors.length).toFixed(2)}</td>
						</tr>
						<tr>
							<td>Quality</td>
							<td>{(aiCompetitors.reduce((sum, ai) => sum + ai.quality, 0) / aiCompetitors.length).toFixed(1)}</td>
						</tr>
						<tr>
							<td>Marketing</td>
							<td>${(aiCompetitors.reduce((sum, ai) => sum + ai.marketing, 0) / aiCompetitors.length).toFixed(0)}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		<button class="btn execute-btn" onclick={executeTurn}>Execute Quarter</button>
	</div>
{:else if activeTab === "game" && showResults && !gameOver}
	<div class="results-panel">
		<h2>Quarter {currentTurn} Results</h2>
		<div class="feedback-message">{feedback}</div>
		<div class="results-stats">
			<div class="result">
				<span class="label">Market Share</span>
				<span class="value">{formatPercent(marketShare)}</span>
			</div>
			<div class="result">
				<span class="label">Units Sold</span>
				<span class="value">{unitsSold}</span>
			</div>
			<div class="result">
				<span class="label">Inventory</span>
				<span class="value">{inventory} units</span>
			</div>
			<div class="result">
				<span class="label">Revenue</span>
				<span class="value positive">${formatMoney(revenue)}</span>
			</div>
			<div class="result">
				<span class="label">Costs</span>
				<span class="value negative">${formatMoney(costs)}</span>
			</div>
			<div class="result">
				<span class="label">Profit</span>
				<span class="value" class:positive={profit >= 0} class:negative={profit < 0}>
					${formatMoney(profit)}
				</span>
			</div>
			<div class="result">
				<span class="label">Cash</span>
				<span class="value">${formatMoney(cash)}</span>
			</div>
		</div>
		<div class="market-share-arrow">
			{#if marketShare > previousMarketShare}
				<span class="arrow up">↑</span>
				<span>Gaining market share</span>
			{:else if marketShare < previousMarketShare}
				<span class="arrow down">↓</span>
				<span>Losing market share</span>
			{:else}
				<span class="arrow stable">→</span>
				<span>Market share stable</span>
			{/if}
		</div>
		<button class="btn next-btn" onclick={nextTurn}>Next Quarter →</button>
	</div>
{:else if activeTab === "game" && gameOver}
	<div class="game-over-panel">
		<h2>🎉 Game Over!</h2>
		<div class="final-stats">
			<div class="final-stat">
				<span class="label">Final Cash</span>
				<span class="value">${formatMoney(cash)}</span>
			</div>
			<div class="final-stat">
				<span class="label">Total Profit</span>
				<span class="value" class:positive={cash - INITIAL_CASH >= 0} class:negative={cash - INITIAL_CASH < 0}>
					${formatMoney(cash - INITIAL_CASH)}
				</span>
			</div>
			<div class="final-stat">
				<span class="label">Final Market Share</span>
				<span class="value">{formatPercent(marketShare)}</span>
			</div>
			<div class="final-stat">
				<span class="label">Final Reputation</span>
				<span class="value">{reputation.toFixed(2)}</span>
			</div>
		</div>
		<div class="history">
			<h3>Performance History</h3>
			<div class="history-list">
				{#each history as entry}
					<div class="history-entry">
						<span>Quarter {entry.turn}</span>
						<span>{formatPercent(entry.marketShare)}</span>
						<span class:positive={entry.profit >= 0} class:negative={entry.profit < 0}
							>${formatMoney(entry.profit)}</span
						>
					</div>
				{/each}
			</div>
		</div>
		<button class="btn restart-btn" onclick={resetGame}>Play Again</button>
	</div>
{:else if activeTab === "market"}
		<div class="tab-panel">
			<h2>📊 Projections</h2>
			<div class="research-content">
				<div class="research-card">
					<h3>Market Demand</h3>
					<p>Current market demand: <strong>{marketDemand} units</strong></p>
					<p class="research-note">Demand fluctuates based on economic conditions and competitor activity.</p>
				</div>
				<div class="research-card">
					<h3>Price Sensitivity</h3>
					<p>Customers are sensitive to price changes. Higher prices reduce demand significantly.</p>
					<p class="research-note">Optimal pricing balances revenue per unit with sales volume.</p>
				</div>
				<div class="research-card">
					<h3>Quality Impact</h3>
					<p>Quality affects demand with diminishing returns. Quality 5-7 offers best value.</p>
					<p class="research-note">Higher quality builds reputation over time.</p>
				</div>
				<div class="research-card">
					<h3>Marketing Effectiveness</h3>
					<p>Marketing has strong initial impact but saturates quickly.</p>
					<p class="research-note">Consistent marketing maintains brand awareness.</p>
				</div>
			</div>
		</div>

	{:else if activeTab === "results"}
		<div class="tab-panel">
			<h2>📈 Results</h2>
			{#if history.length === 0}
				<p class="no-data">No quarterly data available yet. Complete a quarter to see results.</p>
			{:else}
				<div class="chart-container">
					{#if activeChart === "quality"}
						<div class="chart-card">
							<h3>Quality Comparison (Current Quarter)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [1, 3, 5, 7, 9] as y}
										<line x1="40" y1={200 - (y / 9) * 160} x2="380" y2={200 - (y / 9) * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - (y / 9) * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">{y}</text>
									{/each}
									{#each history[history.length - 1].teams as team, teamIndex}
										{@const barHeight = (team.quality / 9) * 160}
										{@const barX = 60 + teamIndex * 70}
										<rect x={barX} y={200 - barHeight} width="50" height={barHeight} fill={teamColors[teamIndex % teamColors.length]} rx="4" />
										<text x={barX + 25} y={200 - barHeight - 8} text-anchor="middle" fill="white" font-size="11" font-weight="bold">{team.quality.toFixed(1)}</text>
									{/each}
									<!-- X-axis labels -->
									{#each history[history.length - 1].teams as team, teamIndex}
										<text x={60 + teamIndex * 70 + 25} y="195" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="10">{team.name}</text>
									{/each}
								</svg>
							</div>
						</div>
					{:else if activeChart === "price"}
						<div class="chart-card">
							<h3>Price Comparison (Current Quarter)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [5, 10, 15, 20, 25, 30] as y}
										<line x1="40" y1={200 - ((y - 5) / 25) * 160} x2="380" y2={200 - ((y - 5) / 25) * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - ((y - 5) / 25) * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">${y}</text>
									{/each}
									{#each history[history.length - 1].teams as team, teamIndex}
										{@const barHeight = ((team.price - 5) / 25) * 160}
										{@const barX = 60 + teamIndex * 70}
										<rect x={barX} y={200 - barHeight} width="50" height={barHeight} fill={teamColors[teamIndex % teamColors.length]} rx="4" />
										<text x={barX + 25} y={200 - barHeight - 8} text-anchor="middle" fill="white" font-size="11" font-weight="bold">${team.price.toFixed(0)}</text>
									{/each}
									<!-- X-axis labels -->
									{#each history[history.length - 1].teams as team, teamIndex}
										<text x={60 + teamIndex * 70 + 25} y="195" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="10">{team.name}</text>
									{/each}
								</svg>
							</div>
						</div>
					{:else if activeChart === "market"}
						<div class="chart-card">
							<h3>Market Share (Current Quarter)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [0, 0.2, 0.4, 0.6, 0.8, 1.0] as y}
										<line x1="40" y1={200 - y * 160} x2="380" y2={200 - y * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - y * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">{(y * 100).toFixed(0)}%</text>
									{/each}
									{#each history[history.length - 1].teams as team, teamIndex}
										{@const barHeight = team.marketShare * 160}
										{@const barX = 60 + teamIndex * 70}
										<rect x={barX} y={200 - barHeight} width="50" height={barHeight} fill={teamColors[teamIndex % teamColors.length]} rx="4" />
										<text x={barX + 25} y={200 - barHeight - 8} text-anchor="middle" fill="white" font-size="11" font-weight="bold">{(team.marketShare * 100).toFixed(0)}%</text>
									{/each}
									<!-- X-axis labels -->
									{#each history[history.length - 1].teams as team, teamIndex}
										<text x={60 + teamIndex * 70 + 25} y="195" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="10">{team.name}</text>
									{/each}
								</svg>
							</div>
						</div>
					{/if}

					<div class="chart-buttons">
						<button class="chart-btn" class:active={activeChart === "quality"} onclick={() => activeChart = "quality"}>Quality</button>
						<button class="chart-btn" class:active={activeChart === "price"} onclick={() => activeChart = "price"}>Price</button>
						<button class="chart-btn" class:active={activeChart === "market"} onclick={() => activeChart = "market"}>Market Share</button>
					</div>
				</div>

				<div class="results-history">
					{#each history as entry}
						<div class="history-card">
							<div class="history-header">Quarter {entry.turn}</div>
							<div class="history-stats">
								<div class="history-stat">
									<span class="label">Market Share</span>
									<span class="value">{formatPercent(entry.marketShare)}</span>
								</div>
								<div class="history-stat">
									<span class="label">Cash</span>
									<span class="value">${formatMoney(entry.cash)}</span>
								</div>
								<div class="history-stat">
									<span class="label">Profit</span>
									<span class="value" class:positive={entry.profit >= 0} class:negative={entry.profit < 0}>
										${formatMoney(entry.profit)}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	{:else if activeTab === "competitor"}
		<div class="tab-panel">
			<h2>🔍 Competitors</h2>
			<div class="competitor-insights">
				<div class="insight-card">
					<h3>Team: {playerTeam}</h3>
					<p>You are competing against 4 AI teams: {aiCompetitors.map(ai => ai.name).join(", ")}</p>
				</div>
				<div class="insight-card">
					<h3>AI Team Details</h3>
					{#if currentTurn === 1}
						<p>AI teams are initializing their strategies...</p>
					{:else}
						{#each aiCompetitors as ai}
							<div class="ai-team-detail">
								<strong>{ai.name}</strong>
								<table class="insight-table">
									<tbody>
										<tr>
											<td>Price</td>
											<td>${ai.price.toFixed(2)}</td>
											<td class:positive={price < ai.price} class:negative={price > ai.price}>
												{price < ai.price ? "Lower ✓" : price > ai.price ? "Higher ✗" : "Equal"}
											</td>
										</tr>
										<tr>
											<td>Quality</td>
											<td>{ai.quality}</td>
											<td class:positive={quality > ai.quality} class:negative={quality < ai.quality}>
												{quality > ai.quality ? "Higher ✓" : quality < ai.quality ? "Lower ✗" : "Equal"}
											</td>
										</tr>
										<tr>
											<td>Marketing</td>
											<td>${ai.marketing}</td>
											<td class:positive={marketing > ai.marketing} class:negative={marketing < ai.marketing}>
												{marketing > ai.marketing ? "Higher ✓" : marketing < ai.marketing ? "Lower ✗" : "Equal"}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						{/each}
					{/if}
				</div>
				<div class="insight-card">
					<h3>Competitor Behavior</h3>
					<p>AI teams adjust strategies each quarter using base values +/- one option in each direction.</p>
					<p class="insight-note">Monitor their moves and adapt your strategy accordingly.</p>
				</div>
				<div class="insight-card">
					<h3>Market Position</h3>
					<div class="position-indicator">
						<div class="position-bar" style="width: {marketShare * 100}%"></div>
						<span class="position-label">Your Share: {formatPercent(marketShare)}</span>
					</div>
					<p class="insight-note">
						{#if marketShare > 0.6}
							Dominating the market
						{:else if marketShare < 0.2}
							Struggling to gain traction
						{:else}
							Competitive position
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.apex-container {
		width: 100%;
		height: 100%;
		max-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		color: white;
		font-family: "Outfit", "Inter", sans-serif;
		background: #09090b;
		padding: 2rem;
		position: relative;
		overflow-y: auto;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.turn-badge {
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

	.tab-nav {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.tab-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.tab-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.tab-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	@media (max-width: 1024px) {
		.tab-btn {
			font-size: 0.7rem;
			padding: 0.5rem 0.8rem;
		}
	}

	.tab-panel {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 400px;
		max-width: 600px;
		width: 100%;
	}

	.tab-panel h2 {
		font-size: 1.5rem;
		font-weight: 900;
		margin: 0 0 1.5rem;
	}

	.research-content,
	.competitor-insights,
	.results-history {
		display: grid;
		gap: 1rem;
	}

	.research-card,
	.insight-card,
	.history-card {
		background: rgba(255, 255, 255, 0.03);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.research-card h3,
	.insight-card h3,
	.history-header {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem;
	}

	.quality-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.quality-value {
		font-size: 0.9rem;
		font-weight: 800;
		color: #3b82f6;
	}

	.inventory-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.4rem;
		padding: 0.4rem 0.6rem;
		background: rgba(16, 185, 129, 0.1);
		border-radius: 6px;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.inventory-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.inventory-value {
		font-size: 0.9rem;
		font-weight: 800;
		color: #10b981;
	}

	.dump-btn {
		margin-top: 0.5rem;
		padding: 0.4rem 0.8rem;
		font-size: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.dump-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
		color: white;
	}

	.input-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.4rem;
		padding: 0.4rem 0.6rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.preview-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.preview-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
	}

	.efficiency-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.4rem;
		padding: 0.4rem 0.6rem;
		background: rgba(245, 158, 11, 0.1);
		border-radius: 6px;
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.efficiency-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.efficiency-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: #f59e0b;
	}

	.projections-panel {
		margin-bottom: 2rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.projections-panel h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 1rem;
	}

	.projection-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.projection-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 6px;
	}

	.projection-item.total {
		grid-column: span 2;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.projection-item.breakeven {
		grid-column: span 2;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.projection-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.projection-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
	}

	.research-card p,
	.insight-card p {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.5rem;
		line-height: 1.5;
	}

	.research-note,
	.insight-note {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
		margin: 0;
	}

	.history-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.history-stat {
		text-align: center;
	}

	.history-stat .label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.2rem;
	}

	.history-stat .value {
		font-size: 0.9rem;
		font-weight: 900;
	}

	.no-data {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
		padding: 2rem;
	}

	.insight-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.insight-table td {
		padding: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 600;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.insight-table tr:last-child td {
		border-bottom: none;
	}

	.position-indicator {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.position-bar {
		height: 8px;
		background: linear-gradient(90deg, #3b82f6, #10b981);
		border-radius: 4px;
		margin-bottom: 0.5rem;
		transition: width 0.3s ease;
	}

	.position-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
	}

	.ai-team-detail {
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 6px;
	}

	.ai-team-detail:last-child {
		margin-bottom: 0;
	}

	.ai-team-detail strong {
		display: block;
		margin-bottom: 0.3rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.chart-container {
		margin-bottom: 2rem;
	}

	.chart-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.chart-btn {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.chart-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.chart-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	.chart-card {
		background: rgba(255, 255, 255, 0.03);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.chart-card h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 1rem;
	}

	.chart {
		position: relative;
	}

	.line-chart {
		width: 100%;
		height: auto;
	}

	.game-viewport {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 500px;
		max-width: 600px;
		width: 100%;
		overflow: visible;
	}

	.stats-panel {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		background: rgba(255, 255, 255, 0.03);
		padding: 0.75rem 0.5rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.stat .label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: 0.3rem;
	}

	.stat .value {
		font-size: 1.1rem;
		font-weight: 900;
	}

	@media (max-width: 1024px) {
		.stat .value {
			font-size: 0.9rem;
		}
	}

	.inputs-panel {
		margin-bottom: 2rem;
	}

	.inputs-panel h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.input-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-group label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 600;
	}

	.input-group select,
	.input-group input[type="number"] {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: white;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.input-group select:hover,
	.input-group input[type="number"]:hover {
		background: #3f3f46;
		border-color: #52525b;
	}

	.input-group select:focus,
	.input-group input[type="number"]:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.competitor-panel {
		margin-bottom: 2rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
	}

	.competitor-panel h3 {
		font-size: 0.8rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.competitor-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.competitor-table td {
		padding: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 600;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.competitor-table tr:last-child td {
		border-bottom: none;
	}

	.btn {
		width: 100%;
		padding: 1rem;
		border: none;
		border-radius: 12px;
		font-weight: 800;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:not(:disabled):hover {
		transform: scale(1.02);
	}

	.execute-btn {
		background: #3b82f6;
		color: white;
	}

	.execute-btn:hover {
		background: #2563eb;
	}

	.results-panel, .game-over-panel {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 400px;
		max-width: 500px;
		width: 100%;
		text-align: center;
		overflow: visible;
	}

	.results-panel h2, .game-over-panel h2 {
		font-size: 1.75rem;
		font-weight: 900;
		margin: 0 0 1rem;
	}

	.feedback-message {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 600;
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

	.market-share-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
	}

	.arrow.up {
		color: #10b981;
		font-size: 1.5rem;
	}

	.arrow.down {
		color: #ef4444;
		font-size: 1.5rem;
	}

	.next-btn, .restart-btn {
		background: #10b981;
		color: white;
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
		flex-wrap: wrap;
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
		max-height: none;
		overflow: visible;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		padding: 0.5rem;
	}

	.history-entry {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.85rem;
	}

	.history-entry:last-child {
		border-bottom: none;
	}

	@media (max-width: 1024px) {
		.apex-container {
			padding: 0.75rem;
			align-items: stretch;
			justify-content: flex-start;
			overflow: visible;
		}

		.header {
			margin-bottom: 0.75rem;
		}

		h1 {
			font-size: clamp(1.35rem, 5.8vw, 1.7rem);
			letter-spacing: -0.04em;
		}

		.game-viewport,
		.results-panel,
		.game-over-panel {
			min-width: 0;
			max-width: 100%;
			width: 100%;
			padding: 0.85rem;
			border-radius: 0.75rem;
			box-sizing: border-box;
			max-height: none;
			overflow: visible;
		}

		.stats-panel,
		.results-stats,
		.input-grid {
			gap: 0.6rem;
		}

		.competitor-table {
			table-layout: fixed;
			word-break: break-word;
		}

		.competitor-table td {
			padding: 0.4rem;
			font-size: 0.78rem;
		}

		.final-stat .value {
			font-size: 1.4rem;
		}
	}
</style>
