<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { fade, fly, scale } from "svelte/transition";

	let { registerActions = (actions: any) => {}, onBack = () => {} } =
		$props();

	// Game Constants
	const TOTAL_DAYS = 7;
	const INITIAL_MONEY = 20.0;

	type SupplyKey = "cups" | "lemons" | "sugar" | "ice";

	interface PackOption {
		qty: number;
		cost: number;
	}

	const SUPPLY_PACKS: Record<SupplyKey, PackOption[]> = {
		cups: [
			{ qty: 25, cost: 0.85 },
			{ qty: 50, cost: 1.5 },
			{ qty: 100, cost: 2.5 },
		],
		lemons: [
			{ qty: 10, cost: 1.0 },
			{ qty: 30, cost: 2.55 },
			{ qty: 75, cost: 5.25 },
		],
		sugar: [
			{ qty: 8, cost: 0.72 },
			{ qty: 20, cost: 1.6 },
			{ qty: 48, cost: 3.36 },
		],
		ice: [
			{ qty: 100, cost: 0.9 },
			{ qty: 250, cost: 2.0 },
			{ qty: 500, cost: 3.5 },
		],
	};

	const DEFAULT_UNIT_COSTS: Record<SupplyKey, number> = {
		cups: 0.034,
		lemons: 0.1,
		sugar: 0.09,
		ice: 0.009,
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
		{ type: "sunny", temperature: 76, icon: "☀️", description: "Sunny" },
		{ type: "cloudy", temperature: 67, icon: "☁️", description: "Cloudy" },
		{ type: "hot", temperature: 94, icon: "🔥", description: "Heatwave" },
		{ type: "rainy", temperature: 60, icon: "🌧️", description: "Rainy" },
		{ type: "cold", temperature: 48, icon: "❄️", description: "Chilly" },
	];

	type GamePhase = "prep" | "running" | "results" | "gameover";

	interface DayHistoryEntry {
		day: number;
		weather: WeatherInfo;
		visitors: number;
		customers: number;
		missedSoldOut: number;
		revenue: number;
		cogs: number;
		iceWaste: number;
		profit: number;
		tasteScore: number;
		reputationAfter: number;
	}

	interface SimCustomer {
		id: number;
		spawnAt: number; // 0..0.85 progress
		duration: number; // progress span to cross screen
		direction: 1 | -1;
		shirtColor: string;
		skinColor: string;
		outcome: "bought" | "too_expensive" | "bad_taste" | "sold_out" | "not_thirsty";
		reaction: string;
		resolved: boolean;
		x: number; // 0..100
		yOffset: number;
		bobPhase: number;
	}

	interface FloatingPopup {
		id: number;
		text: string;
		subtext?: string;
		kind: "money" | "positive" | "negative" | "warning";
		x: number;
		y: number;
	}

	// Core Game State
	let phase = $state<GamePhase>("prep");
	let currentDay = $state(1);
	let money = $state(INITIAL_MONEY);
	let reputation = $state(50); // 10..100

	// Inventory & Weighted Average Unit Costs
	let cups = $state(0);
	let lemons = $state(0);
	let sugar = $state(0);
	let ice = $state(0);

	let avgCupCost = $state(DEFAULT_UNIT_COSTS.cups);
	let avgLemonCost = $state(DEFAULT_UNIT_COSTS.lemons);
	let avgSugarCost = $state(DEFAULT_UNIT_COSTS.sugar);
	let avgIceCost = $state(DEFAULT_UNIT_COSTS.ice);

	// Pricing & Recipe
	let pricePerCup = $state(1.0);
	let lemonsPerCup = $state(1);
	let sugarPerCup = $state(1);
	let icePerCup = $state(2);

	// Weather
	let currentWeather = $state<WeatherInfo>(weatherTypes[0]);
	let tomorrowWeather = $state<WeatherInfo>(weatherTypes[0]);

	// Day Simulation State
	let dayProgress = $state(0); // 0..1
	let simSpeed = $state<1 | 2>(1);
	let simCustomers = $state<SimCustomer[]>([]);
	let popups = $state<FloatingPopup[]>([]);
	let popupIdCounter = 0;
	let rafId: number | null = null;
	let lastFrameTime = 0;

	// Daily Counters
	let visitors = $state(0);
	let customersServed = $state(0);
	let missedTooExpensive = $state(0);
	let missedBadTaste = $state(0);
	let missedSoldOut = $state(0);
	let revenue = $state(0);
	let cogs = $state(0);
	let meltedIceCount = $state(0);
	let iceWasteCost = $state(0);
	let profit = $state(0);
	let soldOutDuringDay = $state(false);
	let standPulse = $state(false);

	let dailyHistory = $state<DayHistoryEntry[]>([]);

	// Buy Menu State
	let showBuyMenu = $state(false);
	let selectedCups = $state(0);
	let selectedLemons = $state(0);
	let selectedSugar = $state(0);
	let selectedIce = $state(0);

	// Toast Notification
	let toastMessage = $state<string | null>(null);
	let toastType = $state<"error" | "info" | "success">("info");
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	const SHIRT_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];
	const SKIN_COLORS = ["#fcd34d", "#fdba74", "#d97706", "#b45309", "#fed7aa"];

	// Derived Values
	const maxCupsPossible = $derived(
		Math.min(
			cups,
			lemonsPerCup > 0 ? Math.floor(lemons / lemonsPerCup) : Infinity,
			sugarPerCup > 0 ? Math.floor(sugar / sugarPerCup) : Infinity,
			icePerCup > 0 ? Math.floor(ice / icePerCup) : Infinity
		)
	);

	const unitCostPerCup = $derived(
		avgCupCost +
			lemonsPerCup * avgLemonCost +
			sugarPerCup * avgSugarCost +
			icePerCup * avgIceCost
	);

	const marginPerCup = $derived(pricePerCup - unitCostPerCup);

	const idealIceForWeather = $derived.by(() => {
		if (currentWeather.temperature >= 88) return 4;
		if (currentWeather.temperature >= 75) return 3;
		if (currentWeather.temperature >= 62) return 2;
		return 1;
	});

	const tasteInfo = $derived.by(() => {
		const score = calculateTasteScore();
		let label = "Balanced & Crisp";
		let color = "#10b981";

		if (lemonsPerCup > sugarPerCup + 0.5) {
			label = "Very Sour";
			color = "#f59e0b";
		} else if (sugarPerCup > lemonsPerCup + 0.5) {
			label = "Too Sweet";
			color = "#ec4899";
		} else if (lemonsPerCup < 1 && sugarPerCup < 1) {
			label = "Watery";
			color = "#60a5fa";
		} else if (Math.abs(icePerCup - idealIceForWeather) >= 2) {
			label = icePerCup < idealIceForWeather ? "Needs More Ice" : "Too Much Ice";
			color = "#38bdf8";
		} else if (score >= 90) {
			label = "Signature Blend!";
			color = "#10b981";
		} else if (score >= 70) {
			label = "Pretty Good";
			color = "#fbbf24";
		} else {
			label = "Off-Balance";
			color = "#ef4444";
		}

		return { score, label, color };
	});

	const starRating = $derived((1 + (reputation / 100) * 4).toFixed(1));

	const selectedTotalCost = $derived(
		getPackCost("cups", selectedCups) +
			getPackCost("lemons", selectedLemons) +
			getPackCost("sugar", selectedSugar) +
			getPackCost("ice", selectedIce)
	);

	const dayClockLabel = $derived.by(() => {
		// 8:00 AM to 6:00 PM (10 hours = 600 mins)
		const totalMins = Math.floor(dayProgress * 600);
		const hour24 = 8 + Math.floor(totalMins / 60);
		const min = totalMins % 60;
		const ampm = hour24 >= 12 ? "PM" : "AM";
		const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
		return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
	});

	// Liquid color in pitcher based on recipe
	const pitcherColor = $derived.by(() => {
		const lemonRatio = Math.min(1, lemonsPerCup / 2);
		const sugarRatio = Math.min(1, sugarPerCup / 2);
		if (lemonRatio < 0.4 && sugarRatio < 0.4) return "#fef9c3"; // pale watery
		if (lemonRatio > sugarRatio + 0.3) return "#eab308"; // deep sour yellow
		return "#fde047"; // vibrant lemonade yellow
	});

	function showToast(msg: string, type: "error" | "info" | "success" = "info") {
		toastMessage = msg;
		toastType = type;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toastMessage = null;
		}, 2800);
	}

	function generateWeather(): WeatherInfo {
		const rand = Math.random();
		let baseWeather: WeatherInfo;

		if (rand < 0.35) baseWeather = weatherTypes[0]; // 35% sunny
		else if (rand < 0.6) baseWeather = weatherTypes[1]; // 25% cloudy
		else if (rand < 0.75) baseWeather = weatherTypes[2]; // 15% hot
		else if (rand < 0.9) baseWeather = weatherTypes[3]; // 15% rainy
		else baseWeather = weatherTypes[4]; // 10% cold

		const tempVariation = Math.floor(Math.random() * 13) - 6;
		const finalTemp = Math.max(42, Math.min(104, baseWeather.temperature + tempVariation));

		return {
			...baseWeather,
			temperature: finalTemp,
		};
	}

	function getPackCost(key: SupplyKey, qty: number): number {
		if (qty <= 0) return 0;
		const found = SUPPLY_PACKS[key].find((p) => p.qty === qty);
		return found ? found.cost : 0;
	}

	function formatMoney(value: number): string {
		return value.toFixed(2);
	}

	function toggleSelect(key: SupplyKey, qty: number) {
		if (key === "cups") selectedCups = selectedCups === qty ? 0 : qty;
		if (key === "lemons") selectedLemons = selectedLemons === qty ? 0 : qty;
		if (key === "sugar") selectedSugar = selectedSugar === qty ? 0 : qty;
		if (key === "ice") selectedIce = selectedIce === qty ? 0 : qty;
	}

	function clearSelection() {
		selectedCups = 0;
		selectedLemons = 0;
		selectedSugar = 0;
		selectedIce = 0;
	}

	function updateWeightedAvg(
		existingQty: number,
		existingAvg: number,
		addedQty: number,
		addedCost: number
	): number {
		if (addedQty <= 0) return existingAvg;
		const totalQty = existingQty + addedQty;
		if (totalQty <= 0) return existingAvg;
		return (existingQty * existingAvg + addedCost) / totalQty;
	}

	function buySelected() {
		const totalCost = selectedTotalCost;
		if (totalCost <= 0) return;

		if (totalCost > money + 0.0001) {
			showToast("Not enough cash for those supplies!", "error");
			return;
		}

		money = Math.max(0, +(money - totalCost).toFixed(2));

		if (selectedCups > 0) {
			const cost = getPackCost("cups", selectedCups);
			avgCupCost = updateWeightedAvg(cups, avgCupCost, selectedCups, cost);
			cups += selectedCups;
		}
		if (selectedLemons > 0) {
			const cost = getPackCost("lemons", selectedLemons);
			avgLemonCost = updateWeightedAvg(lemons, avgLemonCost, selectedLemons, cost);
			lemons += selectedLemons;
		}
		if (selectedSugar > 0) {
			const cost = getPackCost("sugar", selectedSugar);
			avgSugarCost = updateWeightedAvg(sugar, avgSugarCost, selectedSugar, cost);
			sugar += selectedSugar;
		}
		if (selectedIce > 0) {
			const cost = getPackCost("ice", selectedIce);
			avgIceCost = updateWeightedAvg(ice, avgIceCost, selectedIce, cost);
			ice += selectedIce;
		}

		clearSelection();
		showToast("Supplies restocked!", "success");
	}

	function calculateTasteScore(): number {
		// Ideal: 1 lemon, 1 sugar (or 1.5/1.5 balanced), and weather-matched ice
		const lemonDeviation = Math.abs(lemonsPerCup - 1);
		const sugarDeviation = Math.abs(sugarPerCup - 1);
		const ratioDiff = Math.abs(lemonsPerCup - sugarPerCup);
		const iceDeviation = Math.abs(icePerCup - idealIceForWeather);

		let score = 100;
		score -= lemonDeviation * 14;
		score -= sugarDeviation * 16;
		score -= ratioDiff * 18; // unbalanced sweet/sour hurts more
		score -= iceDeviation * 8;

		return Math.max(5, Math.min(100, Math.round(score)));
	}

	function getFairPrice(): number {
		let base = 1.1;
		if (currentWeather.temperature >= 90) base = 1.6;
		else if (currentWeather.temperature >= 80) base = 1.35;
		else if (currentWeather.temperature < 58) base = 0.75;
		else if (currentWeather.temperature < 68) base = 0.9;

		if (currentWeather.type === "rainy") base *= 0.85;
		// High reputation allows slightly higher prices
		base *= 0.9 + (reputation / 100) * 0.25;
		return base;
	}

	function calculateVisitorCount(): number {
		let base = 28;

		if (currentWeather.temperature >= 85) base *= 1.55;
		else if (currentWeather.temperature >= 75) base *= 1.3;
		else if (currentWeather.temperature < 55) base *= 0.45;
		else if (currentWeather.temperature < 65) base *= 0.7;

		switch (currentWeather.type) {
			case "sunny":
				base *= 1.25;
				break;
			case "hot":
				base *= 1.5;
				break;
			case "cloudy":
				base *= 0.95;
				break;
			case "rainy":
				base *= 0.45;
				break;
			case "cold":
				base *= 0.4;
				break;
		}

		// Reputation multiplier (0.75x at 0 rep to 1.25x at 100 rep)
		base *= 0.75 + (reputation / 100) * 0.5;

		const randomFactor = 0.88 + Math.random() * 0.24;
		return Math.max(8, Math.round(base * randomFactor));
	}

	function spawnPopup(
		text: string,
		kind: FloatingPopup["kind"],
		x: number,
		y: number,
		subtext?: string
	) {
		const id = ++popupIdCounter;
		popups = [...popups, { id, text, subtext, kind, x, y }];
		setTimeout(() => {
			popups = popups.filter((p) => p.id !== id);
		}, 1200);
	}

	function canMakeOneCup(): boolean {
		return (
			cups >= 1 &&
			lemons >= lemonsPerCup &&
			sugar >= sugarPerCup &&
			ice >= icePerCup
		);
	}

	function evaluateCustomerDecision(): {
		wantsToBuy: boolean;
		reason: "bought" | "too_expensive" | "bad_taste" | "not_thirsty";
		reaction: string;
	} {
		const tasteScore = calculateTasteScore();
		const fairPrice = getFairPrice();

		// Base thirst chance by weather
		let thirstChance = 0.78;
		if (currentWeather.type === "rainy" || currentWeather.type === "cold") {
			thirstChance = 0.48;
		} else if (currentWeather.type === "hot") {
			thirstChance = 0.92;
		}

		if (Math.random() > thirstChance) {
			return { wantsToBuy: false, reason: "not_thirsty", reaction: "" };
		}

		// Price elasticity
		const priceRatio = pricePerCup / fairPrice;
		if (priceRatio > 1.0) {
			// Probability of rejecting due to price rises steeply above fairPrice
			const rejectProb = Math.min(0.95, Math.pow(priceRatio - 1.0, 1.35) * 1.15);
			if (Math.random() < rejectProb) {
				return {
					wantsToBuy: false,
					reason: "too_expensive",
					reaction: "💸 Too pricey!",
				};
			}
		}

		// Taste check
		const tastePassProb = 0.2 + (tasteScore / 100) * 0.8;
		if (Math.random() > tastePassProb) {
			let msg = "😖 Sour!";
			if (sugarPerCup > lemonsPerCup + 0.5) msg = "🍬 Too sweet!";
			else if (icePerCup < idealIceForWeather - 1) msg = "🥵 Needs ice!";
			else if (icePerCup > idealIceForWeather + 1) msg = "🥶 Too icy!";
			else if (lemonsPerCup < 1 && sugarPerCup < 1) msg = "💧 Watery!";
			return { wantsToBuy: false, reason: "bad_taste", reaction: msg };
		}

		const happyReactions = ["😋 Yum!", "🍋 Fresh!", "😍 Love it!", "👍 Crisp!"];
		const reaction =
			happyReactions[Math.floor(Math.random() * happyReactions.length)];
		return { wantsToBuy: true, reason: "bought", reaction };
	}

	function resolveCustomer(cust: SimCustomer) {
		if (cust.resolved) return;
		cust.resolved = true;

		const decision = evaluateCustomerDecision();

		if (!decision.wantsToBuy) {
			cust.outcome = decision.reason;
			cust.reaction = decision.reaction;
			if (decision.reason === "too_expensive") {
				missedTooExpensive++;
				spawnPopup(decision.reaction, "warning", 50, 42);
			} else if (decision.reason === "bad_taste") {
				missedBadTaste++;
				spawnPopup(decision.reaction, "negative", 50, 42);
			}
			return;
		}

		// Customer wants to buy — check stock!
		if (!canMakeOneCup()) {
			cust.outcome = "sold_out";
			cust.reaction = "🚫 Sold out!";
			missedSoldOut++;
			if (!soldOutDuringDay) {
				soldOutDuringDay = true;
				spawnPopup("SOLD OUT!", "negative", 50, 30);
			} else {
				spawnPopup("🚫 Sold out", "warning", 50, 44);
			}
			return;
		}

		// Complete sale
		cups -= 1;
		lemons = +(lemons - lemonsPerCup).toFixed(2);
		sugar = +(sugar - sugarPerCup).toFixed(2);
		ice = Math.max(0, ice - icePerCup);

		customersServed++;
		revenue = +(revenue + pricePerCup).toFixed(2);
		money = +(money + pricePerCup).toFixed(2);
		cogs = +(cogs + unitCostPerCup).toFixed(4);

		cust.outcome = "bought";
		cust.reaction = decision.reaction;

		standPulse = true;
		setTimeout(() => (standPulse = false), 180);

		spawnPopup(`+$${pricePerCup.toFixed(2)}`, "money", 50, 32, decision.reaction);
	}

	function startDay() {
		if (phase !== "prep" || showBuyMenu) return;

		if (maxCupsPossible <= 0) {
			showToast("You need enough cups, lemons, sugar & ice for at least 1 cup!", "error");
			return;
		}

		// Reset day counters
		visitors = calculateVisitorCount();
		customersServed = 0;
		missedTooExpensive = 0;
		missedBadTaste = 0;
		missedSoldOut = 0;
		revenue = 0;
		cogs = 0;
		meltedIceCount = 0;
		iceWasteCost = 0;
		profit = 0;
		soldOutDuringDay = false;
		dayProgress = 0;
		popups = [];

		// Generate animated customer stream spread across 0..0.82 of the day
		const list: SimCustomer[] = [];
		for (let i = 0; i < visitors; i++) {
			const spawnAt = (i / Math.max(1, visitors)) * 0.78 + Math.random() * 0.04;
			const direction: 1 | -1 = Math.random() > 0.45 ? 1 : -1;
			list.push({
				id: i,
				spawnAt,
				duration: 0.18 + Math.random() * 0.05,
				direction,
				shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
				skinColor: SKIN_COLORS[i % SKIN_COLORS.length],
				outcome: "not_thirsty",
				reaction: "",
				resolved: false,
				x: direction === 1 ? -8 : 108,
				yOffset: (Math.random() - 0.5) * 6,
				bobPhase: Math.random() * Math.PI * 2,
			});
		}
		simCustomers = list;
		phase = "running";
		lastFrameTime = performance.now();
		rafId = requestAnimationFrame(tickDay);
	}

	function tickDay(now: number) {
		if (phase !== "running") return;

		const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
		lastFrameTime = now;

		// Full day takes ~5.5 seconds at 1x speed
		const progressStep = (dt / 5.5) * simSpeed;
		dayProgress = Math.min(1, dayProgress + progressStep);

		// Update customer positions & resolve at stand center (x ~ 50)
		for (const cust of simCustomers) {
			const localT = (dayProgress - cust.spawnAt) / cust.duration;
			if (localT < 0 || localT > 1) continue;

			cust.x = cust.direction === 1 ? -8 + localT * 116 : 108 - localT * 116;

			// Trigger decision as customer passes the stand
			if (!cust.resolved && localT >= 0.48) {
				resolveCustomer(cust);
			}
		}

		// Force reactivity for positions
		simCustomers = simCustomers;

		if (dayProgress >= 1) {
			finishDay();
			return;
		}

		rafId = requestAnimationFrame(tickDay);
	}

	function skipDayAnimation() {
		if (phase !== "running") return;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		for (const cust of simCustomers) {
			if (!cust.resolved) {
				resolveCustomer(cust);
			}
		}
		dayProgress = 1;
		finishDay();
	}

	function finishDay() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		// Remaining ice melts at the end of the day
		meltedIceCount = ice;
		iceWasteCost = +(meltedIceCount * avgIceCost).toFixed(2);
		ice = 0;

		const roundedCogs = +cogs.toFixed(2);
		cogs = roundedCogs;
		profit = +(revenue - roundedCogs - iceWasteCost).toFixed(2);

		// Update Reputation
		const tasteScore = calculateTasteScore();
		let repDelta = 0;
		if (customersServed > 0) {
			if (tasteScore >= 85) repDelta += 5;
			else if (tasteScore >= 65) repDelta += 2;
			else repDelta -= 4;
		}
		if (missedTooExpensive > customersServed * 0.4) repDelta -= 3;
		if (missedSoldOut > 4) repDelta -= 2;
		reputation = Math.max(10, Math.min(100, reputation + repDelta));

		dailyHistory = [
			...dailyHistory,
			{
				day: currentDay,
				weather: currentWeather,
				visitors,
				customers: customersServed,
				missedSoldOut,
				revenue,
				cogs: roundedCogs,
				iceWaste: iceWasteCost,
				profit,
				tasteScore,
				reputationAfter: reputation,
			},
		];

		if (currentDay >= TOTAL_DAYS) {
			phase = "gameover";
		} else {
			phase = "results";
		}
	}

	function nextDay() {
		currentDay++;
		currentWeather = tomorrowWeather;
		tomorrowWeather = generateWeather();
		phase = "prep";
	}

	function resetGame() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		currentDay = 1;
		money = INITIAL_MONEY;
		reputation = 50;
		cups = 0;
		lemons = 0;
		sugar = 0;
		ice = 0;
		avgCupCost = DEFAULT_UNIT_COSTS.cups;
		avgLemonCost = DEFAULT_UNIT_COSTS.lemons;
		avgSugarCost = DEFAULT_UNIT_COSTS.sugar;
		avgIceCost = DEFAULT_UNIT_COSTS.ice;
		pricePerCup = 1.0;
		lemonsPerCup = 1;
		sugarPerCup = 1;
		icePerCup = 2;
		dailyHistory = [];
		currentWeather = generateWeather();
		tomorrowWeather = generateWeather();
		phase = "prep";
		showBuyMenu = false;
		clearSelection();
	}

	function getBusinessRank(netProfit: number): { title: string; badge: string } {
		if (netProfit >= 45) return { title: "Lemonade Tycoon", badge: "🏆" };
		if (netProfit >= 25) return { title: "Savvy Entrepreneur", badge: "🌟" };
		if (netProfit >= 10) return { title: "Neighborhood Favorite", badge: "🍋" };
		if (netProfit >= 0) return { title: "Breaking Even", badge: "👍" };
		return { title: "Needs Practice", badge: "📉" };
	}

	onMount(() => {
		currentWeather = generateWeather();
		tomorrowWeather = generateWeather();
		registerActions({
			newShuffle: resetGame,
		});
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (toastTimer) clearTimeout(toastTimer);
	});
</script>

<div class="lemonade-container">
	{#if toastMessage}
		<div
			class="toast toast-{toastType}"
			in:fly={{ y: -16, duration: 220 }}
			out:fade={{ duration: 180 }}
		>
			{toastMessage}
		</div>
	{/if}

	<div class="header">
		<div class="header-top">
			<span class="day-badge">DAY {currentDay}/{TOTAL_DAYS}</span>
			<span class="rep-badge" title="Stand Reputation">★ {starRating}</span>
		</div>
		<h1>🍋 Lemonade Stand</h1>
	</div>

	{#if phase === "prep" || phase === "running"}
		<div class="game-viewport" in:fade={{ duration: 200 }}>
			<!-- Animated Stand Scene -->
			<div class="scene-wrapper weather-{currentWeather.type}">
				<svg
					viewBox="0 0 420 145"
					class="stand-svg"
					aria-label="Lemonade Stand Scene"
				>
					<defs>
						<linearGradient id="skySunny" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#1e3a8a" />
							<stop offset="100%" stop-color="#38bdf8" stop-opacity="0.45" />
						</linearGradient>
						<linearGradient id="skyHot" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#7c2d12" />
							<stop offset="100%" stop-color="#f59e0b" stop-opacity="0.45" />
						</linearGradient>
						<linearGradient id="skyCloudy" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#1e293b" />
							<stop offset="100%" stop-color="#475569" stop-opacity="0.6" />
						</linearGradient>
						<linearGradient id="skyRainy" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#0f172a" />
							<stop offset="100%" stop-color="#1e293b" />
						</linearGradient>
						<linearGradient id="skyCold" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#0c4a6e" />
							<stop offset="100%" stop-color="#1e293b" />
						</linearGradient>
					</defs>

					<!-- Sky -->
					<rect
						width="420"
						height="112"
						fill={currentWeather.type === "sunny"
							? "url(#skySunny)"
							: currentWeather.type === "hot"
								? "url(#skyHot)"
								: currentWeather.type === "cloudy"
									? "url(#skyCloudy)"
									: currentWeather.type === "rainy"
										? "url(#skyRainy)"
										: "url(#skyCold)"}
					/>

					<!-- Weather FX -->
					{#if currentWeather.type === "sunny" || currentWeather.type === "hot"}
						<g
							class="sun-group"
							transform="translate({phase === 'running' ? 60 + dayProgress * 300 : 355}, {phase === 'running' ? 42 - Math.sin(dayProgress * Math.PI) * 22 : 28})"
						>
							<circle
								r={currentWeather.type === "hot" ? 20 : 16}
								fill={currentWeather.type === "hot" ? "#fb923c" : "#fde047"}
								opacity="0.3"
								class="sun-glow"
							/>
							<circle
								r={currentWeather.type === "hot" ? 13 : 11}
								fill={currentWeather.type === "hot" ? "#f97316" : "#facc15"}
							/>
						</g>
					{/if}

					{#if currentWeather.type === "cloudy" || currentWeather.type === "rainy"}
						<g class="cloud cloud-1" opacity={currentWeather.type === "rainy" ? 0.55 : 0.8}>
							<circle cx="80" cy="28" r="14" fill="#94a3b8" />
							<circle cx="96" cy="24" r="17" fill="#cbd5e1" />
							<circle cx="114" cy="29" r="13" fill="#94a3b8" />
						</g>
						<g class="cloud cloud-2" opacity={currentWeather.type === "rainy" ? 0.55 : 0.75}>
							<circle cx="290" cy="34" r="12" fill="#94a3b8" />
							<circle cx="305" cy="30" r="15" fill="#cbd5e1" />
							<circle cx="320" cy="35" r="11" fill="#94a3b8" />
						</g>
					{/if}

					{#if currentWeather.type === "rainy"}
						{#each [35, 75, 115, 160, 205, 245, 290, 335, 380] as rx, idx}
							<line
								x1={rx}
								y1="10"
								x2={rx - 6}
								y2="24"
								stroke="#7dd3fc"
								stroke-width="1.5"
								stroke-linecap="round"
								class="raindrop"
								style="animation-delay: {(idx * 0.13) % 0.8}s"
							/>
						{/each}
					{/if}

					{#if currentWeather.type === "cold"}
						{#each [45, 95, 145, 195, 250, 305, 360] as sx, idx}
							<circle
								cx={sx}
								cy="15"
								r="2.2"
								fill="#e0f2fe"
								class="snowflake"
								style="animation-delay: {(idx * 0.35) % 2}s"
							/>
						{/each}
					{/if}

					<!-- Ground & Sidewalk -->
					<rect y="112" width="420" height="33" fill="#27272a" />
					<line x1="0" y1="112" x2="420" y2="112" stroke="#3f3f46" stroke-width="2" />

					<!-- Lemonade Stand -->
					<g class="stand-booth {standPulse ? 'stand-pop' : ''}" transform="translate(168, 44)">
						<!-- Posts -->
						<rect x="6" y="22" width="5" height="48" fill="#92400e" />
						<rect x="73" y="22" width="5" height="48" fill="#92400e" />
						<!-- Counter Base -->
						<rect x="2" y="46" width="80" height="24" rx="2" fill="#b45309" />
						<rect x="0" y="43" width="84" height="5" rx="2" fill="#d97706" />
						<!-- Sign on front -->
						<rect x="14" y="51" width="56" height="14" rx="2" fill="#fef3c7" />
						<text
							x="42"
							y="61"
							text-anchor="middle"
							font-size="7.5"
							font-weight="900"
							fill="#78350f"
						>
							${pricePerCup.toFixed(2)} / CUP
						</text>

						<!-- Pitcher on counter -->
						<g transform="translate(20, 27)">
							<rect x="0" y="2" width="13" height="14" rx="2" fill="rgba(255,255,255,0.25)" stroke="#e4e4e7" stroke-width="1" />
							<rect
								x="1.5"
								y={15 - Math.max(2, Math.min(11, (maxCupsPossible / 25) * 11))}
								width="10"
								height={Math.max(2, Math.min(11, (maxCupsPossible / 25) * 11))}
								rx="1"
								fill={pitcherColor}
							/>
							{#if icePerCup > 0}
								<rect x="3" y="8" width="3" height="3" fill="#e0f2fe" opacity="0.85" />
								<rect x="7" y="10" width="3" height="3" fill="#e0f2fe" opacity="0.85" />
							{/if}
						</g>

						<!-- Cup stack -->
						<g transform="translate(52, 33)">
							<polygon points="2,10 10,10 11,2 1,2" fill="#f4f4f5" />
							<polygon points="3,6 9,6 10,0 2,0" fill="#e4e4e7" />
						</g>

						<!-- Striped Awning -->
						<path d="M-4,22 L88,22 L82,8 L2,8 Z" fill="#fbbf24" />
						<path d="M12,22 L24,22 L22,8 L14,8 Z" fill="#ffffff" opacity="0.85" />
						<path d="M36,22 L48,22 L46,8 L38,8 Z" fill="#ffffff" opacity="0.85" />
						<path d="M60,22 L72,22 L70,8 L62,8 Z" fill="#ffffff" opacity="0.85" />
						<rect x="-4" y="20" width="92" height="4" rx="2" fill="#f59e0b" />
					</g>

					<!-- Animated Customers -->
					{#if phase === "running"}
						{#each simCustomers as cust (cust.id)}
							{#if dayProgress >= cust.spawnAt && dayProgress <= cust.spawnAt + cust.duration}
								{@const px = (cust.x / 100) * 420}
								{@const bob = Math.abs(Math.sin(dayProgress * 45 + cust.bobPhase)) * 2.5}
								<g transform="translate({px}, {114 + cust.yOffset - bob})">
									<!-- Shadow -->
									<ellipse cx="0" cy={8 + bob} rx="6" ry="2" fill="rgba(0,0,0,0.4)" />
									<!-- Body -->
									<rect x="-5" y="-12" width="10" height="14" rx="4" fill={cust.shirtColor} />
									<!-- Head -->
									<circle cx="0" cy="-17" r="5" fill={cust.skinColor} />
									<!-- Cup in hand if bought -->
									{#if cust.outcome === "bought"}
										<rect x={cust.direction * 5} y="-9" width="4" height="5" rx="1" fill="#fde047" />
									{/if}
								</g>
							{/if}
						{/each}
					{/if}
				</svg>

				<!-- Floating Reaction / Money Popups -->
				<div class="popups-layer">
					{#each popups as pop (pop.id)}
						<div
							class="floating-popup popup-{pop.kind}"
							style="left: {pop.x}%; top: {pop.y}%;"
						>
							<span class="popup-main">{pop.text}</span>
							{#if pop.subtext}
								<span class="popup-sub">{pop.subtext}</span>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Top Overlay Badges on Scene -->
				<div class="scene-hud">
					<span class="weather-pill">
						{currentWeather.icon} {currentWeather.description} · {currentWeather.temperature}°F
					</span>
					{#if phase === "running"}
						<span class="clock-pill">🕒 {dayClockLabel}</span>
					{/if}
				</div>

				{#if soldOutDuringDay && phase === "running"}
					<div class="sold-out-banner" in:scale={{ duration: 200 }}>SOLD OUT!</div>
				{/if}
			</div>

			<!-- Live Stats Bar -->
			<div class="stats-panel">
				<div class="stat">
					<span class="label">Cash</span>
					<span class="value cash">${money.toFixed(2)}</span>
				</div>
				<div class="stat">
					<span class="label">Can Make</span>
					<span class="value" class:negative={maxCupsPossible === 0}>
						{maxCupsPossible} cups
					</span>
				</div>
				<div class="stat supplies-stat">
					<span class="label">Inventory</span>
					<div class="supplies">
						<span title="Cups">🥤 {cups}</span>
						<span title="Lemons">🍋 {lemons}</span>
						<span title="Sugar">🍬 {sugar}</span>
						<span title="Ice (melts nightly)">🧊 {ice}</span>
					</div>
				</div>
			</div>

			{#if phase === "prep"}
				<!-- Prep Controls -->
				<div class="controls-grid" in:fade={{ duration: 150 }}>
					<div class="control-card">
						<div class="card-head">
							<span class="label">Price per Cup</span>
							<span class="margin-tag" class:negative={marginPerCup < 0} class:positive={marginPerCup > 0}>
								Cost ${unitCostPerCup.toFixed(2)} · Margin {marginPerCup >= 0 ? "+" : ""}${marginPerCup.toFixed(2)}
							</span>
						</div>
						<div class="price-buttons">
							<button
								type="button"
								onclick={() => (pricePerCup = Math.max(0.25, +(pricePerCup - 0.1).toFixed(2)))}
							>-</button>
							<span>${pricePerCup.toFixed(2)}</span>
							<button
								type="button"
								onclick={() => (pricePerCup = Math.min(5.0, +(pricePerCup + 0.1).toFixed(2)))}
							>+</button>
						</div>
					</div>

					<div class="control-card">
						<div class="card-head">
							<span class="label">Recipe per Cup</span>
							<span class="taste-badge" style="color: {tasteInfo.color}">
								{tasteInfo.label}
							</span>
						</div>
						<div class="recipe-controls">
							<div class="recipe-item">
								<span>🍋 Lemons</span>
								<div class="recipe-control">
									<button
										type="button"
										onclick={() => (lemonsPerCup = Math.max(0.5, +(lemonsPerCup - 0.5).toFixed(1)))}
									>-</button>
									<span>{lemonsPerCup}</span>
									<button
										type="button"
										onclick={() => (lemonsPerCup = Math.min(3, +(lemonsPerCup + 0.5).toFixed(1)))}
									>+</button>
								</div>
							</div>
							<div class="recipe-item">
								<span>🍬 Sugar</span>
								<div class="recipe-control">
									<button
										type="button"
										onclick={() => (sugarPerCup = Math.max(0.5, +(sugarPerCup - 0.5).toFixed(1)))}
									>-</button>
									<span>{sugarPerCup}</span>
									<button
										type="button"
										onclick={() => (sugarPerCup = Math.min(3, +(sugarPerCup + 0.5).toFixed(1)))}
									>+</button>
								</div>
							</div>
							<div class="recipe-item">
								<span>🧊 Ice <small>(rec: {idealIceForWeather})</small></span>
								<div class="recipe-control">
									<button
										type="button"
										onclick={() => (icePerCup = Math.max(0, icePerCup - 1))}
									>-</button>
									<span>{icePerCup}</span>
									<button
										type="button"
										onclick={() => (icePerCup = Math.min(5, icePerCup + 1))}
									>+</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="action-buttons">
					<button
						type="button"
						class="btn secondary-btn"
						class:pulse-hint={maxCupsPossible === 0}
						onclick={() => (showBuyMenu = true)}
					>
						🛒 Buy Supplies
					</button>
					<button
						type="button"
						class="btn start-btn"
						onclick={startDay}
						disabled={maxCupsPossible <= 0}
					>
						☀️ Open Stand
					</button>
				</div>
			{:else}
				<!-- Running Day Controls & Live Ticker -->
				<div class="running-bar" in:fade={{ duration: 150 }}>
					<div class="live-metrics">
						<div class="metric">
							<span class="m-label">Sold</span>
							<span class="m-val">{customersServed}</span>
						</div>
						<div class="metric">
							<span class="m-label">Revenue</span>
							<span class="m-val positive">${revenue.toFixed(2)}</span>
						</div>
						<div class="metric">
							<span class="m-label">Turned Away</span>
							<span class="m-val">{missedTooExpensive + missedBadTaste + missedSoldOut}</span>
						</div>
					</div>
					<div class="progress-track">
						<div class="progress-fill" style="width: {dayProgress * 100}%"></div>
					</div>
					<div class="sim-controls">
						<button
							type="button"
							class="speed-btn"
							onclick={() => (simSpeed = simSpeed === 1 ? 2 : 1)}
						>
							{simSpeed}x Speed
						</button>
						<button type="button" class="skip-btn" onclick={skipDayAnimation}>
							Skip ⏭
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else if phase === "results"}
		<div class="results-panel" in:scale={{ duration: 220, start: 0.96 }}>
			<h2>Day {currentDay} Summary</h2>
			<div class="weather-display">
				<span class="weather-icon">{currentWeather.icon}</span>
				<span>{currentWeather.description} — {currentWeather.temperature}°F</span>
			</div>

			<div class="results-stats">
				<div class="result">
					<span class="label">Cups Sold</span>
					<span class="value">{customersServed} / {visitors}</span>
				</div>
				<div class="result">
					<span class="label">Revenue</span>
					<span class="value positive">+${revenue.toFixed(2)}</span>
				</div>
				<div class="result">
					<span class="label">Supplies Used</span>
					<span class="value">-${cogs.toFixed(2)}</span>
				</div>
				<div class="result">
					<span class="label">Melted Ice ({meltedIceCount})</span>
					<span class="value negative">-${iceWasteCost.toFixed(2)}</span>
				</div>
			</div>

			<div class="net-profit-banner">
				<span>Net Day Profit</span>
				<strong class:positive={profit >= 0} class:negative={profit < 0}>
					{profit >= 0 ? "+" : "-"}${Math.abs(profit).toFixed(2)}
				</strong>
			</div>

			{#if missedTooExpensive > 0 || missedBadTaste > 0 || missedSoldOut > 0}
				<div class="feedback-chips">
					{#if missedSoldOut > 0}
						<span class="chip warn">🚫 {missedSoldOut} missed (sold out)</span>
					{/if}
					{#if missedTooExpensive > 0}
						<span class="chip warn">💸 {missedTooExpensive} thought price was high</span>
					{/if}
					{#if missedBadTaste > 0}
						<span class="chip warn">😖 {missedBadTaste} disliked recipe/ice</span>
					{/if}
				</div>
			{/if}

			<div class="forecast-box">
				<span>Tomorrow's Forecast:</span>
				<strong>{tomorrowWeather.icon} {tomorrowWeather.description} (~{tomorrowWeather.temperature}°F)</strong>
			</div>

			<button type="button" class="btn next-btn" onclick={nextDay}>
				Start Day {currentDay + 1} →
			</button>
		</div>
	{:else if phase === "gameover"}
		{@const totalProfit = +(money - INITIAL_MONEY).toFixed(2)}
		{@const rank = getBusinessRank(totalProfit)}
		<div class="game-over-panel" in:scale={{ duration: 240, start: 0.96 }}>
			<div class="rank-badge">{rank.badge}</div>
			<h2>{rank.title}</h2>
			<p class="subtitle">7-Day Lemonade Stand Complete</p>

			<div class="final-stats">
				<div class="final-stat">
					<span class="label">Final Cash</span>
					<span
						class="value"
						class:positive={money >= INITIAL_MONEY}
						class:negative={money < INITIAL_MONEY}
					>${money.toFixed(2)}</span>
				</div>
				<div class="final-stat">
					<span class="label">Net Profit</span>
					<span
						class="value"
						class:positive={totalProfit >= 0}
						class:negative={totalProfit < 0}
					>{totalProfit >= 0 ? "+" : "-"}${Math.abs(totalProfit).toFixed(2)}</span>
				</div>
				<div class="final-stat">
					<span class="label">Reputation</span>
					<span class="value">★ {starRating}</span>
				</div>
			</div>

			<div class="history">
				<h3>Daily Ledger</h3>
				<div class="history-list">
					{#each dailyHistory as entry}
						<div class="history-entry">
							<span>Day {entry.day} {entry.weather.icon}</span>
							<span>{entry.customers} sold</span>
							<span class="muted">Rev ${entry.revenue.toFixed(2)}</span>
							<span class:positive={entry.profit >= 0} class:negative={entry.profit < 0}>
								{entry.profit >= 0 ? "+" : "-"}${Math.abs(entry.profit).toFixed(2)}
							</span>
						</div>
					{/each}
				</div>
			</div>
			<button type="button" class="btn restart-btn" onclick={resetGame}>Play Again</button>
		</div>
	{/if}

	{#if showBuyMenu}
		<div class="buy-menu-overlay" in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}>
			<div class="buy-menu" in:scale={{ duration: 180, start: 0.95 }}>
				<div class="buy-header">
					<h2>🛒 Wholesale Supplies</h2>
					<span class="cash-pill">Cash: ${money.toFixed(2)}</span>
				</div>
				<p class="buy-tip">Larger packs have lower unit costs. Unused ice melts each night!</p>

				<div class="buy-rows">
					{#each [
						{ key: "cups" as SupplyKey, label: "🥤 Cups", current: cups, selected: selectedCups },
						{ key: "lemons" as SupplyKey, label: "🍋 Lemons", current: lemons, selected: selectedLemons },
						{ key: "sugar" as SupplyKey, label: "🍬 Sugar", current: sugar, selected: selectedSugar },
						{ key: "ice" as SupplyKey, label: "🧊 Ice", current: ice, selected: selectedIce },
					] as row}
						<div class="buy-row">
							<div class="row-info">
								<span class="row-name">{row.label}</span>
								<span class="row-stock">Have: {row.current}</span>
							</div>
							<div class="pack-options">
								{#each SUPPLY_PACKS[row.key] as pack}
									<button
										type="button"
										class="pack-btn"
										class:selected={row.selected === pack.qty}
										onclick={() => toggleSelect(row.key, pack.qty)}
									>
										<span class="pack-qty">+{pack.qty}</span>
										<span class="pack-cost">${pack.cost.toFixed(2)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<div class="buy-preview">
					<span>Order Total:</span>
					<strong class:negative={selectedTotalCost > money}>
						${formatMoney(selectedTotalCost)}
					</strong>
				</div>

				<div class="buy-actions">
					<button
						type="button"
						class="btn buy-btn"
						onclick={buySelected}
						disabled={selectedTotalCost === 0 || selectedTotalCost > money + 0.0001}
					>
						Purchase
					</button>
					<button
						type="button"
						class="btn close-btn"
						onclick={() => {
							clearSelection();
							showBuyMenu = false;
						}}
					>
						Done
					</button>
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
		color: var(--game-text-primary, #f4f4f5);
		font-family: "Outfit", "Inter", sans-serif;
		background: #09090b;
		padding: 1.25rem;
		position: relative;
		overflow-y: auto;
		box-sizing: border-box;
	}

	.toast {
		position: fixed;
		top: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		padding: 0.6rem 1.2rem;
		border-radius: 999px;
		font-weight: 700;
		font-size: 0.88rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}
	.toast-error {
		background: #ef4444;
		color: white;
	}
	.toast-success {
		background: #10b981;
		color: #052e16;
	}
	.toast-info {
		background: #fbbf24;
		color: #18181b;
	}

	.header {
		text-align: center;
		margin-bottom: 0.9rem;
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.day-badge {
		background: #fbbf24;
		color: #09090b;
		font-weight: 900;
		font-size: 0.72rem;
		padding: 0.2rem 0.7rem;
		border-radius: 4px;
		letter-spacing: 0.04em;
	}

	.rep-badge {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: #fde047;
		font-weight: 800;
		font-size: 0.72rem;
		padding: 0.18rem 0.6rem;
		border-radius: 4px;
	}

	h1 {
		font-size: 2rem;
		font-weight: 900;
		margin: 0;
		letter-spacing: -1.5px;
	}

	.game-viewport,
	.results-panel,
	.game-over-panel {
		background: #18181b;
		padding: 1.25rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		width: 100%;
		max-width: 520px;
		box-sizing: border-box;
	}

	/* Animated Scene */
	.scene-wrapper {
		position: relative;
		width: 100%;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 1rem;
		background: #0f172a;
	}

	.stand-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.stand-booth {
		transition: transform 0.15s ease;
		transform-origin: 210px 110px;
	}
	.stand-booth.stand-pop {
		transform: translate(168px, 41px) scale(1.03);
	}

	.sun-glow {
		animation: pulseGlow 2.4s ease-in-out infinite;
	}

	.cloud-1 {
		animation: driftCloud 16s linear infinite;
	}
	.cloud-2 {
		animation: driftCloud 22s linear infinite reverse;
	}

	.raindrop {
		animation: fallRain 0.75s linear infinite;
	}

	.snowflake {
		animation: fallSnow 3.2s linear infinite;
	}

	@keyframes pulseGlow {
		0%, 100% { opacity: 0.25; transform: scale(1); }
		50% { opacity: 0.45; transform: scale(1.15); }
	}

	@keyframes driftCloud {
		0% { transform: translateX(-18px); }
		50% { transform: translateX(18px); }
		100% { transform: translateX(-18px); }
	}

	@keyframes fallRain {
		0% { transform: translateY(-10px); opacity: 0; }
		20% { opacity: 0.85; }
		100% { transform: translateY(105px); opacity: 0.1; }
	}

	@keyframes fallSnow {
		0% { transform: translate(0, -10px); opacity: 0; }
		20% { opacity: 0.9; }
		100% { transform: translate(12px, 100px); opacity: 0; }
	}

	.scene-hud {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		right: 0.5rem;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
	}

	.weather-pill,
	.clock-pill {
		background: rgba(9, 9, 11, 0.72);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		padding: 0.22rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.sold-out-banner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) rotate(-6deg);
		background: #ef4444;
		color: white;
		font-weight: 900;
		font-size: 0.85rem;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		border: 2px solid white;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.popups-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.floating-popup {
		position: absolute;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		font-weight: 900;
		font-size: 0.85rem;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
		animation: floatUpFade 1.15s ease-out forwards;
		white-space: nowrap;
	}
	.popup-money { color: #34d399; }
	.popup-warning { color: #fbbf24; font-size: 0.78rem; }
	.popup-negative { color: #f87171; font-size: 0.78rem; }
	.popup-sub { font-size: 0.7rem; color: #fef08a; }

	@keyframes floatUpFade {
		0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
		20% { opacity: 1; transform: translate(-50%, -10px) scale(1.05); }
		100% { opacity: 0; transform: translate(-50%, -36px) scale(0.95); }
	}

	/* Stats Panel */
	.stats-panel {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 0.68rem;
		color: var(--game-text-soft, #a1a1aa);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: 0.15rem;
	}

	.stat .value {
		font-size: 1.1rem;
		font-weight: 900;
	}

	.stat .cash {
		color: #34d399;
	}

	.supplies {
		display: flex;
		gap: 0.55rem;
		font-size: 0.9rem;
		font-weight: 700;
	}

	/* Controls */
	.controls-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.control-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		padding: 0.85rem;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
		gap: 0.5rem;
	}

	.card-head .label {
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--game-text-muted, #a1a1aa);
	}

	.margin-tag,
	.taste-badge {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.price-buttons {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
	}

	.price-buttons button,
	.recipe-control button {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: var(--game-text-primary, #f4f4f5);
		border-radius: 8px;
		font-weight: 800;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}

	.price-buttons button {
		padding: 0.4rem 1rem;
		font-size: 1rem;
	}

	.price-buttons button:hover,
	.recipe-control button:hover {
		background: #3f3f46;
	}

	.price-buttons button:active,
	.recipe-control button:active {
		transform: scale(0.95);
	}

	.price-buttons span {
		font-size: 1.35rem;
		font-weight: 900;
		min-width: 78px;
		text-align: center;
	}

	.recipe-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.recipe-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.recipe-item small {
		color: #a1a1aa;
		font-weight: 500;
		font-size: 0.75rem;
	}

	.recipe-control {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.recipe-control button {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.recipe-control span {
		min-width: 28px;
		text-align: center;
		font-weight: 800;
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		flex: 1;
		padding: 0.85rem 1rem;
		border: none;
		border-radius: 12px;
		font-weight: 800;
		font-size: 0.95rem;
		cursor: pointer;
		transition: transform 0.15s, background 0.15s;
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.start-btn {
		background: #fbbf24;
		color: #09090b;
	}
	.start-btn:hover:not(:disabled) {
		background: #f59e0b;
	}

	.secondary-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: var(--game-text-primary, #f4f4f5);
	}
	.secondary-btn:hover {
		background: #3f3f46;
	}

	.pulse-hint {
		border-color: #fbbf24;
		box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.25);
		animation: gentlePulse 1.8s ease-in-out infinite;
	}

	@keyframes gentlePulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
		50% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
	}

	/* Running Bar */
	.running-bar {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.live-metrics {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		text-align: center;
	}

	.metric {
		background: rgba(255, 255, 255, 0.04);
		padding: 0.5rem;
		border-radius: 8px;
	}
	.m-label {
		display: block;
		font-size: 0.68rem;
		text-transform: uppercase;
		color: #a1a1aa;
		font-weight: 700;
	}
	.m-val {
		font-size: 1.05rem;
		font-weight: 900;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		background: #27272a;
		border-radius: 999px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #fbbf24, #10b981);
		transition: width 0.08s linear;
	}

	.sim-controls {
		display: flex;
		gap: 0.75rem;
	}

	.speed-btn,
	.skip-btn {
		flex: 1;
		padding: 0.65rem;
		border-radius: 10px;
		font-weight: 800;
		font-size: 0.85rem;
		cursor: pointer;
		border: 1px solid #3f3f46;
		background: #27272a;
		color: #f4f4f5;
	}
	.speed-btn:hover,
	.skip-btn:hover {
		background: #3f3f46;
	}

	/* Results & Game Over */
	.results-panel,
	.game-over-panel {
		text-align: center;
	}

	.results-panel h2,
	.game-over-panel h2 {
		font-size: 1.5rem;
		font-weight: 900;
		margin: 0 0 0.75rem;
	}

	.rank-badge {
		font-size: 2.5rem;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: #a1a1aa;
		font-size: 0.85rem;
		margin: -0.4rem 0 1rem;
	}

	.weather-display {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		padding: 0.6rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.weather-icon {
		font-size: 1.5rem;
	}

	.results-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.result {
		background: rgba(255, 255, 255, 0.04);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.result .label {
		font-size: 0.7rem;
		color: var(--game-text-soft, #a1a1aa);
		font-weight: 700;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.2rem;
	}

	.result .value {
		font-size: 1.2rem;
		font-weight: 900;
	}

	.net-profit-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 10px;
		margin-bottom: 0.85rem;
		font-weight: 700;
	}
	.net-profit-banner strong {
		font-size: 1.35rem;
		font-weight: 900;
	}

	.feedback-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		margin-bottom: 0.85rem;
	}

	.chip {
		font-size: 0.75rem;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: rgba(251, 191, 36, 0.14);
		color: #fde047;
		font-weight: 600;
	}

	.forecast-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.9rem;
		background: rgba(56, 189, 248, 0.1);
		border: 1px solid rgba(56, 189, 248, 0.22);
		border-radius: 8px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.positive { color: #10b981; }
	.negative { color: #ef4444; }
	.muted { color: #a1a1aa; }

	.next-btn,
	.restart-btn {
		background: #10b981;
		color: #052e16;
		width: 100%;
	}
	.next-btn:hover,
	.restart-btn:hover {
		background: #059669;
	}

	.final-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.final-stat {
		background: rgba(255, 255, 255, 0.04);
		padding: 0.75rem 0.5rem;
		border-radius: 8px;
	}

	.final-stat .label {
		font-size: 0.7rem;
		color: var(--game-text-soft, #a1a1aa);
		font-weight: 700;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.25rem;
	}

	.final-stat .value {
		font-size: 1.25rem;
		font-weight: 900;
	}

	.history {
		text-align: left;
		margin-bottom: 1rem;
	}

	.history h3 {
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0 0 0.5rem;
		color: #a1a1aa;
	}

	.history-list {
		max-height: 170px;
		overflow-y: auto;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		padding: 0.4rem;
	}

	.history-entry {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr 1.1fr 0.9fr;
		gap: 0.4rem;
		padding: 0.45rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.82rem;
		font-weight: 600;
	}
	.history-entry:last-child {
		border-bottom: none;
	}
	.history-entry span:last-child {
		text-align: right;
	}

	/* Buy Menu */
	.buy-menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(8px);
		padding: 1rem;
	}

	.buy-menu {
		background: #18181b;
		padding: 1.5rem;
		border-radius: 1rem;
		border: 1px solid #27272a;
		box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
		width: 100%;
		max-width: 460px;
		max-height: 90dvh;
		overflow-y: auto;
	}

	.buy-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.35rem;
	}

	.buy-header h2 {
		font-size: 1.3rem;
		font-weight: 900;
		margin: 0;
	}

	.cash-pill {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		font-weight: 800;
		font-size: 0.85rem;
	}

	.buy-tip {
		color: #a1a1aa;
		font-size: 0.8rem;
		margin: 0 0 1rem;
	}

	.buy-rows {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-bottom: 1rem;
	}

	.buy-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		padding: 0.65rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.row-info {
		display: flex;
		flex-direction: column;
		min-width: 82px;
	}
	.row-name {
		font-weight: 800;
		font-size: 0.9rem;
	}
	.row-stock {
		font-size: 0.72rem;
		color: #a1a1aa;
	}

	.pack-options {
		display: flex;
		gap: 0.4rem;
		flex: 1;
	}

	.pack-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.4rem 0.35rem;
		border-radius: 8px;
		background: #27272a;
		border: 1px solid #3f3f46;
		color: #f4f4f5;
		cursor: pointer;
		transition: all 0.15s;
	}

	.pack-btn:hover {
		background: #3f3f46;
	}

	.pack-btn.selected {
		background: #fbbf24;
		border-color: #fbbf24;
		color: #09090b;
	}

	.pack-qty {
		font-weight: 900;
		font-size: 0.82rem;
	}
	.pack-cost {
		font-size: 0.72rem;
		font-weight: 700;
		opacity: 0.85;
	}

	.buy-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-weight: 700;
	}
	.buy-preview strong {
		font-size: 1.15rem;
	}

	.buy-actions {
		display: flex;
		gap: 0.75rem;
	}

	.buy-btn {
		background: #10b981;
		color: #052e16;
	}
	.buy-btn:hover:not(:disabled) {
		background: #059669;
	}

	.close-btn {
		background: #27272a;
		border: 1px solid #3f3f46;
		color: #f4f4f5;
	}
	.close-btn:hover {
		background: #3f3f46;
	}

	@media (max-width: 600px) {
		.lemonade-container {
			padding: 0.5rem;
			justify-content: flex-start;
		}
		h1 {
			font-size: 1.35rem;
		}
		.game-viewport,
		.results-panel,
		.game-over-panel {
			padding: 0.85rem;
		}
		.stats-panel {
			flex-wrap: wrap;
			padding: 0.55rem;
		}
		.supplies-stat {
			width: 100%;
			border-top: 1px solid rgba(255, 255, 255, 0.06);
			padding-top: 0.4rem;
		}
		.buy-row {
			flex-direction: column;
			align-items: stretch;
		}
		.row-info {
			flex-direction: row;
			justify-content: space-between;
		}
	}
</style>
