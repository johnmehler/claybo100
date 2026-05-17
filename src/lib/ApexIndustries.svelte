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

	// Player inputs (5 per turn)
	let price = $state(15.00);
	let quality = $state(5);
	let marketing = $state(1000);
	let productionQuantity = $state(100);
	let employeePay = $state(100);

	// Input options
	const priceOptions = [8, 10, 12, 15, 18, 20, 25, 30];
	const qualityOptions = [1, 3, 5, 7, 9];
	const marketingOptions = [0, 500, 1000, 2000, 3000, 5000, 8000];
	const productionOptions = [50, 100, 150, 200, 300, 500];
	const payOptions = [80, 100, 120, 150, 180, 200];

	// Hidden state variables
	let cash = $state(INITIAL_CASH);
	let reputation = $state(BASE_REPUTATION);
	let productionEfficiency = $state(1.0);
	let inventory = $state(0);
	let marketDemand = $state(500);
	let marketShare = $state(0.2);
	let playerTeam = $state("");

	// AI Competitors (4 competitors with names)
	type AICompetitor = {
		name: string;
		price: number;
		quality: number;
		marketing: number;
		production: number;
		employeePay: number;
		cash: number;
		reputation: number;
		productionEfficiency: number;
		inventory: number;
	};

	const allTeams = ["Abner", "Baxter", "Cuthbert", "Dexter", "Edgar"];
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
			marketing: 1000,
			production: 100,
			employeePay: 100,
			cash: INITIAL_CASH,
			reputation: BASE_REPUTATION,
			productionEfficiency: 1.0,
			inventory: 0
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

	function calculateDemandScore(): number {
		const Q = quality;
		const M = marketing;
		const P = price;
		const R = reputation;

		return (Math.pow(Q, 0.7) * Math.pow(M, 0.5) / Math.pow(P, 1.2)) * R;
	}

	function calculateCompetitorDemandScore(): number {
		// Calculate average demand score across all AI competitors
		const totalScore = aiCompetitors.reduce((sum, ai) => {
			const Q = ai.quality;
			const M = ai.marketing;
			const P = ai.price;
			const R = ai.reputation;
			return sum + (Math.pow(Q, 0.7) * Math.pow(M, 0.5) / Math.pow(P, 1.2)) * R;
		}, 0);
		return totalScore / aiCompetitors.length;
	}

	function calculateUnitCost(): number {
		const B = BASE_COST;
		const E = employeePay / 100;

		return B + 0.4 * quality - 0.2 * E;
	}

	function updateReputation(): void {
		const Q = quality;
		const M = marketing / 1000;
		const currentReputation = reputation;

		reputation = Math.max(0, Math.min(10, 0.9 * currentReputation + 0.05 * Q + 0.03 * M));
	}

	function updateProductionEfficiency(): void {
		const E = employeePay / 100;

		productionEfficiency = 1.0 + 0.05 * E;
	}

	function simulateCompetitors(): void {
		// AI strategy: use base values +/- one option in each direction
		aiCompetitors.forEach(ai => {
			// Get current index in options arrays
			const priceIndex = priceOptions.indexOf(ai.price);
			const qualityIndex = qualityOptions.indexOf(ai.quality);
			const marketingIndex = marketingOptions.indexOf(ai.marketing);
			const productionIndex = productionOptions.indexOf(ai.production);
			const payIndex = payOptions.indexOf(ai.employeePay);

			// Move to adjacent option (+/- 1) or stay at current
			const priceMove = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
			const qualityMove = Math.floor(Math.random() * 3) - 1;
			const marketingMove = Math.floor(Math.random() * 3) - 1;
			const productionMove = Math.floor(Math.random() * 3) - 1;
			const payMove = Math.floor(Math.random() * 3) - 1;

			// Apply moves within bounds
			const newPriceIndex = Math.max(0, Math.min(priceOptions.length - 1, priceIndex + priceMove));
			const newQualityIndex = Math.max(0, Math.min(qualityOptions.length - 1, qualityIndex + qualityMove));
			const newMarketingIndex = Math.max(0, Math.min(marketingOptions.length - 1, marketingIndex + marketingMove));
			const newProductionIndex = Math.max(0, Math.min(productionOptions.length - 1, productionIndex + productionMove));
			const newPayIndex = Math.max(0, Math.min(payOptions.length - 1, payIndex + payMove));

			ai.price = priceOptions[newPriceIndex];
			ai.quality = qualityOptions[newQualityIndex];
			ai.marketing = marketingOptions[newMarketingIndex];
			ai.production = productionOptions[newProductionIndex];
			ai.employeePay = payOptions[newPayIndex];
		});
	}

	function executeAITurn(ai: AICompetitor, aiMarketShare: number): void {
		// Calculate AI demand score
		// Calculate unit cost for AI
		const aiUnitCost = BASE_COST + 0.4 * ai.quality - 0.2 * (ai.employeePay / 100);

		// Production
		const aiActualProduction = Math.min(ai.production, Math.floor(ai.production * ai.productionEfficiency));
		ai.inventory += aiActualProduction;

		// Sales (AI gets their share of market demand)
		const aiActualDemand = Math.floor(marketDemand * aiMarketShare);
		const aiAvailableUnits = Math.min(ai.inventory, aiActualDemand);
		ai.inventory -= aiAvailableUnits;

		// Revenue and costs
		const aiRevenue = aiAvailableUnits * ai.price;
		const aiProductionCost = aiActualProduction * aiUnitCost;
		const aiMarketingCost = ai.marketing;
		const aiLaborCost = (ai.employeePay / 10) * (ai.production / 10);
		const aiCosts = aiProductionCost + aiMarketingCost + aiLaborCost;
		const aiProfit = aiRevenue - aiCosts;
		ai.cash += aiProfit;

		// Update AI reputation
		ai.reputation = Math.max(0, Math.min(10, 0.9 * ai.reputation + 0.05 * ai.quality + 0.03 * (ai.marketing / 1000)));

		// Update AI production efficiency
		ai.productionEfficiency = 1.0 + 0.05 * (ai.employeePay / 100);
	}

	function executeTurn(): void {
		quality = Math.max(1, Math.min(9, Math.round(Number(quality) || 1)));

		// Calculate demand
		const playerDemandScore = calculateDemandScore();
		const aiDemandScores = aiCompetitors.map(ai =>
			(Math.pow(ai.quality, 0.7) * Math.pow(ai.marketing, 0.5) / Math.pow(ai.price, 1.2)) * ai.reputation
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

		// Production and inventory
		const actualProduction = Math.min(productionQuantity, Math.floor(productionQuantity * productionEfficiency));
		inventory += actualProduction;

		// Sales
		const availableUnits = Math.min(inventory, actualDemand);
		unitsSold = availableUnits;
		inventory -= availableUnits;

		// Revenue and costs
		revenue = unitsSold * price;
		unitCost = calculateUnitCost();
		const productionCost = actualProduction * unitCost;
		const marketingCost = marketing;
		const laborCost = (employeePay / 10) * (productionQuantity / 10);

		costs = productionCost + marketingCost + laborCost;
		profit = revenue - costs;
		cash += profit;

		// Update hidden state
		updateReputation();
		updateProductionEfficiency();
		simulateCompetitors();

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

	function nextTurn(): void {
		currentTurn++;
		showResults = false;
	}

	function resetGame(): void {
		currentTurn = 1;
		cash = INITIAL_CASH;
		reputation = BASE_REPUTATION;
		productionEfficiency = 1.0;
		inventory = 0;
		marketDemand = 500;

		price = 15.00;
		quality = 5;
		marketing = 1000;
		productionQuantity = 100;
		employeePay = 100;

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
					<select id="price" bind:value={price}>
						{#each priceOptions as option}
							<option value={option}>${option}</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="quality">Quality (1-9)</label>
					<input type="number" id="quality" bind:value={quality} min="1" max="9" />
				</div>
				<div class="input-group">
					<label for="marketing">Marketing</label>
					<select id="marketing" bind:value={marketing}>
						{#each marketingOptions as option}
							<option value={option}>${option}</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="production">Production</label>
					<select id="production" bind:value={productionQuantity}>
						{#each productionOptions as option}
							<option value={option}>{option} units</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="pay">Employee Pay</label>
					<select id="pay" bind:value={employeePay}>
						{#each payOptions as option}
							<option value={option}>${option}</option>
						{/each}
					</select>
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
			{#if marketShare > 0.5}
				<span class="arrow up">↑</span>
				<span>Gaining market share</span>
			{:else}
				<span class="arrow down">↓</span>
				<span>Losing market share</span>
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
							<h3>Quality Comparison (All Teams)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [1, 3, 5, 7, 9] as y}
										<line x1="40" y1={200 - (y / 9) * 160} x2="380" y2={200 - (y / 9) * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - (y / 9) * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">{y}</text>
									{/each}
									{#each history[0].teams as team, teamIndex}
										{@const teamPoints = history.map((entry, i) => `${40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)},${200 - (entry.teams[teamIndex].quality / 9) * 160}`).join(' ')}
										<polyline
											fill="none"
											stroke={teamColors[teamIndex % teamColors.length]}
											stroke-width="2"
											points={teamPoints}
										/>
										{#if history.length === 1}
											<circle cx={40 + 170} cy={200 - (history[0].teams[teamIndex].quality / 9) * 160} r="4" fill={teamColors[teamIndex % teamColors.length]} />
										{/if}
									{/each}
									<!-- X-axis labels -->
									{#each history as entry, i}
										<text x={40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)} y="195" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">Q{entry.turn}</text>
									{/each}
								</svg>
								<div class="chart-legend">
									{#each history[0].teams as team, teamIndex}
										<span class="legend-item">
											<span class="legend-color" style={`background: ${teamColors[teamIndex % teamColors.length]}`}></span>
											{team.name}
										</span>
									{/each}
								</div>
							</div>
						</div>
					{:else if activeChart === "price"}
						<div class="chart-card">
							<h3>Price Comparison (All Teams)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [8, 12, 16, 20, 24, 28, 32] as y}
										<line x1="40" y1={200 - ((y - 8) / 24) * 160} x2="380" y2={200 - ((y - 8) / 24) * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - ((y - 8) / 24) * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">${y}</text>
									{/each}
									{#each history[0].teams as team, teamIndex}
										{@const teamPoints = history.map((entry, i) => `${40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)},${200 - ((entry.teams[teamIndex].price - 8) / 24) * 160}`).join(' ')}
										<polyline
											fill="none"
											stroke={teamColors[teamIndex % teamColors.length]}
											stroke-width="2"
											points={teamPoints}
										/>
										{#if history.length === 1}
											<circle cx={40 + 170} cy={200 - ((history[0].teams[teamIndex].price - 8) / 24) * 160} r="4" fill={teamColors[teamIndex % teamColors.length]} />
										{/if}
									{/each}
									<!-- X-axis labels -->
									{#each history as entry, i}
										<text x={40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)} y="195" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">Q{entry.turn}</text>
									{/each}
								</svg>
								<div class="chart-legend">
									{#each history[0].teams as team, teamIndex}
										<span class="legend-item">
											<span class="legend-color" style={`background: ${teamColors[teamIndex % teamColors.length]}`}></span>
											{team.name}
										</span>
									{/each}
								</div>
							</div>
						</div>
					{:else if activeChart === "market"}
						<div class="chart-card">
							<h3>Market Share (All Teams)</h3>
							<div class="chart">
								<svg viewBox="0 0 400 200" class="line-chart">
									<!-- Grid lines -->
									{#each [0, 0.2, 0.4, 0.6, 0.8, 1.0] as y}
										<line x1="40" y1={200 - y * 160} x2="380" y2={200 - y * 160} stroke="rgba(255,255,255,0.1)" stroke-width="1" />
										<text x="30" y={200 - y * 160 + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">{(y * 100).toFixed(0)}%</text>
									{/each}
									{#each history[0].teams as team, teamIndex}
										{@const teamPoints = history.map((entry, i) => `${40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)},${200 - entry.teams[teamIndex].marketShare * 160}`).join(' ')}
										<polyline
											fill="none"
											stroke={teamColors[teamIndex % teamColors.length]}
											stroke-width="2"
											points={teamPoints}
										/>
										{#if history.length === 1}
											<circle cx={40 + 170} cy={200 - history[0].teams[teamIndex].marketShare * 160} r="4" fill={teamColors[teamIndex % teamColors.length]} />
										{/if}
									{/each}
									<!-- X-axis labels -->
									{#each history as entry, i}
										<text x={40 + (history.length > 1 ? (i / (history.length - 1)) * 340 : 170)} y="195" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">Q{entry.turn}</text>
									{/each}
								</svg>
								<div class="chart-legend">
									{#each history[0].teams as team, teamIndex}
										<span class="legend-item">
											<span class="legend-color" style={`background: ${teamColors[teamIndex % teamColors.length]}`}></span>
											{team.name}
										</span>
									{/each}
								</div>
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
		height: auto;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: white;
		font-family: "Outfit", "Inter", sans-serif;
		background: #09090b;
		padding: 2rem;
		position: relative;
		overflow: visible;
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

	.chart-legend {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 2px;
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
