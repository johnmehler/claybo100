<script lang="ts">
	import { onMount } from "svelte";
	import { fade, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const TOTAL_TURNS = 12;
	const INITIAL_CASH = 50000.00;
	const BASE_COST = 5.00;
	const BASE_REPUTATION = 1.0;

	// Player inputs (6 per turn)
	let price = $state(15.00);
	let quality = $state(5);
	let marketing = $state(1000);
	let productionQuantity = $state(100);
	let factoryInvestment = $state(0);
	let employeePay = $state(100);

	// Input options
	const priceOptions = [8, 10, 12, 15, 18, 20, 25, 30];
	const qualityOptions = [1, 3, 5, 7, 9];
	const marketingOptions = [0, 500, 1000, 2000, 3000, 5000, 8000];
	const productionOptions = [50, 100, 150, 200, 300, 500];
	const investmentOptions = [0, 2000, 5000, 10000, 20000];
	const payOptions = [80, 100, 120, 150, 180, 200];

	// Hidden state variables
	let cash = $state(INITIAL_CASH);
	let reputation = $state(BASE_REPUTATION);
	let productionEfficiency = $state(1.0);
	let inventory = $state(0);
	let marketDemand = $state(100);
	let competitorPrice = $state(15.00);
	let competitorQuality = $state(5);
	let competitorMarketing = $state(1000);
	let marketShare = $state(0.1);

	// Turn tracking
	let currentTurn = $state(1);
	let showResults = $state(false);
	let gameOver = $state(false);

	// Competitor display ranges
	const allowedPriceRange = { min: 8, max: 30 };
	const allowedQualityRange = { min: 1, max: 9 };
	const allowedMarketingRange = { min: 0, max: 8000 };

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
		profit: number
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
		const Q = competitorQuality;
		const M = competitorMarketing;
		const P = competitorPrice;
		const R = 1.0; // Competitors have neutral reputation

		return (Math.pow(Q, 0.7) * Math.pow(M, 0.5) / Math.pow(P, 1.2)) * R;
	}

	function calculateUnitCost(): number {
		const B = BASE_COST;
		const F = factoryInvestment / 1000;
		const E = employeePay / 100;

		return B + 0.4 * quality - 0.3 * F - 0.2 * E;
	}

	function updateReputation(): void {
		const Q = quality;
		const M = marketing / 1000;
		const currentReputation = reputation;

		reputation = 0.9 * currentReputation + 0.05 * Q + 0.03 * M;
	}

	function updateProductionEfficiency(): void {
		const F = factoryInvestment / 10000;
		const E = employeePay / 100;

		productionEfficiency = 1.0 + 0.1 * F + 0.05 * E;
	}

	function simulateCompetitors(): void {
		// Simple AI: competitors randomly adjust their strategies
		competitorPrice = competitorPrice * (0.9 + Math.random() * 0.2);
		competitorMarketing = competitorMarketing * (0.8 + Math.random() * 0.4);
		competitorQuality = Math.max(1, Math.min(9, competitorQuality + (Math.random() - 0.5) * 2));
	}

	function executeTurn(): void {
		// Calculate demand
		const playerDemandScore = calculateDemandScore();
		const competitorDemandScore = calculateCompetitorDemandScore();
		const totalDemandScore = playerDemandScore + competitorDemandScore;

		demandScore = playerDemandScore;

		// Market share
		marketShare = totalDemandScore > 0 ? playerDemandScore / totalDemandScore : 0;
		const actualDemand = Math.floor(marketDemand * marketShare);

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
		const investmentCost = factoryInvestment;
		const laborCost = (employeePay / 10) * (productionQuantity / 10);

		costs = productionCost + marketingCost + investmentCost + laborCost;
		profit = revenue - costs;
		cash += profit;

		// Update hidden state
		updateReputation();
		updateProductionEfficiency();
		simulateCompetitors();

		// Generate feedback
		generateFeedback();

		// Record history
		history.push({
			turn: currentTurn,
			cash,
			marketShare,
			reputation,
			profit
		});

		showResults = true;

		if (currentTurn >= TOTAL_TURNS) {
			gameOver = true;
		}
	}

	function generateFeedback(): void {
		const messages: string[] = [];

		if (marketShare < 0.3) messages.push("Struggling to compete in the market");
		else if (marketShare > 0.6) messages.push("Dominating market share!");

		if (price > competitorPrice * 1.2) messages.push("Customers think you're overpriced");
		else if (price < competitorPrice * 0.8) messages.push("Aggressive pricing strategy");

		if (quality < competitorQuality - 2) messages.push("Quality concerns hurting reputation");
		else if (quality > competitorQuality + 2) messages.push("Premium quality building brand loyalty");

		if (marketing < competitorMarketing * 0.5) messages.push("Marketing budget too low");
		else if (marketing > competitorMarketing * 2) messages.push("Heavy marketing spend");

		if (productionEfficiency < 1.1) messages.push("Factory needs investment");
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
		marketDemand = 100;
		competitorPrice = 15.00;
		competitorQuality = 5;
		competitorMarketing = 1000;

		price = 15.00;
		quality = 5;
		marketing = 1000;
		productionQuantity = 100;
		factoryInvestment = 0;
		employeePay = 100;

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
		<h1>🏭 Apex Industries</h1>
	</div>

	{#if !showResults && !gameOver}
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
						<select id="quality" bind:value={quality}>
							{#each qualityOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
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
						<label for="investment">Factory Investment</label>
						<select id="investment" bind:value={factoryInvestment}>
							{#each investmentOptions as option}
								<option value={option}>${option}</option>
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
				<h3>Competitors</h3>
				<table class="competitor-table">
					<tbody>
						{#if currentTurn === 1}
							<tr>
								<td>Price Range</td>
								<td>${allowedPriceRange.min}-${allowedPriceRange.max}</td>
							</tr>
							<tr>
								<td>Quality Range</td>
								<td>{allowedQualityRange.min}-{allowedQualityRange.max}</td>
							</tr>
							<tr>
								<td>Marketing Range</td>
								<td>${allowedMarketingRange.min}-${allowedMarketingRange.max}</td>
							</tr>
						{:else}
							<tr>
								<td>Price</td>
								<td>${competitorPrice.toFixed(2)}</td>
							</tr>
							<tr>
								<td>Quality</td>
								<td>{competitorQuality}</td>
							</tr>
							<tr>
								<td>Marketing</td>
								<td>${competitorMarketing}</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			<button class="btn execute-btn" onclick={executeTurn}>Execute Quarter</button>
		</div>
	{:else if showResults && !gameOver}
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
	{:else if gameOver}
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

	.game-viewport {
		background: #18181b;
		padding: 2rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		min-width: 500px;
		max-width: 600px;
		width: 100%;
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

	.input-group select {
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

	.input-group select:hover {
		background: #3f3f46;
		border-color: #52525b;
	}

	.input-group select:focus {
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
		max-height: 200px;
		overflow-y: auto;
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
			overflow-x: hidden;
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
