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
			{ qty: 30, cost: 0.36 },
			{ qty: 75, cost: 0.75 },
			{ qty: 150, cost: 1.2 },
		],
	};

	const DEFAULT_UNIT_COSTS: Record<SupplyKey, number> = {
		cups: 0.034,
		lemons: 0.1,
		sugar: 0.09,
		ice: 0.012,
	};

	// Weather types
	type Weather = "sunny" | "cloudy" | "rainy" | "hot" | "cold";

	type SpriteName =
		| "lemon"
		| "cup"
		| "sugar"
		| "ice"
		| "sunny"
		| "hot"
		| "cloudy"
		| "rainy"
		| "cold"
		| "cart"
		| "clock"
		| "skip"
		| "trophy"
		| "sparkle"
		| "thumbsup"
		| "chart"
		| "ban"
		| "coin"
		| "warn";

	interface WeatherInfo {
		type: Weather;
		temperature: number;
		icon: SpriteName;
		description: string;
	}

	const weatherTypes: WeatherInfo[] = [
		{ type: "sunny", temperature: 76, icon: "sunny", description: "Sunny" },
		{
			type: "cloudy",
			temperature: 67,
			icon: "cloudy",
			description: "Cloudy",
		},
		{ type: "hot", temperature: 94, icon: "hot", description: "Heatwave" },
		{ type: "rainy", temperature: 60, icon: "rainy", description: "Rainy" },
		{ type: "cold", temperature: 48, icon: "cold", description: "Chilly" },
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
	}

	interface SimCustomer {
		id: number;
		spawnAt: number; // 0..0.85 progress
		duration: number; // progress span to cross screen
		direction: 1 | -1;
		shirtColor: string;
		skinColor: string;
		outcome:
			| "bought"
			| "too_expensive"
			| "bad_taste"
			| "sold_out"
			| "not_thirsty";
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

	const SHIRT_COLORS = [
		"#f59e0b",
		"#10b981",
		"#3b82f6",
		"#ec4899",
		"#8b5cf6",
		"#ef4444",
		"#14b8a6",
	];
	const SKIN_COLORS = ["#fcd34d", "#fdba74", "#d97706", "#b45309", "#fed7aa"];

	// Derived Values
	const maxCupsPossible = $derived(
		Math.min(
			cups,
			lemonsPerCup > 0 ? Math.floor(lemons / lemonsPerCup) : Infinity,
			sugarPerCup > 0 ? Math.floor(sugar / sugarPerCup) : Infinity,
			icePerCup > 0 ? Math.floor(ice / icePerCup) : Infinity,
		),
	);

	const unitCostPerCup = $derived(
		avgCupCost +
			lemonsPerCup * avgLemonCost +
			sugarPerCup * avgSugarCost +
			icePerCup * avgIceCost,
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
		let tone: "good" | "warn" | "sweet" | "cool" | "bad" = "good";

		if (lemonsPerCup > sugarPerCup + 0.5) {
			label = "Very Sour";
			tone = "warn";
		} else if (sugarPerCup > lemonsPerCup + 0.5) {
			label = "Too Sweet";
			tone = "sweet";
		} else if (lemonsPerCup < 1 && sugarPerCup < 1) {
			label = "Watery";
			tone = "cool";
		} else if (Math.abs(icePerCup - idealIceForWeather) >= 2) {
			label =
				icePerCup < idealIceForWeather
					? "Needs More Ice"
					: "Too Much Ice";
			tone = "cool";
		} else if (score >= 90) {
			label = "Signature Blend!";
			tone = "good";
		} else if (score >= 70) {
			label = "Pretty Good";
			tone = "warn";
		} else {
			label = "Off-Balance";
			tone = "bad";
		}

		return { score, label, tone };
	});

	const selectedTotalCost = $derived(
		getPackCost("cups", selectedCups) +
			getPackCost("lemons", selectedLemons) +
			getPackCost("sugar", selectedSugar) +
			getPackCost("ice", selectedIce),
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

	function showToast(
		msg: string,
		type: "error" | "info" | "success" = "info",
	) {
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

		if (rand < 0.35)
			baseWeather = weatherTypes[0]; // 35% sunny
		else if (rand < 0.6)
			baseWeather = weatherTypes[1]; // 25% cloudy
		else if (rand < 0.75)
			baseWeather = weatherTypes[2]; // 15% hot
		else if (rand < 0.9)
			baseWeather = weatherTypes[3]; // 15% rainy
		else baseWeather = weatherTypes[4]; // 10% cold

		const tempVariation = Math.floor(Math.random() * 13) - 6;
		const finalTemp = Math.max(
			42,
			Math.min(104, baseWeather.temperature + tempVariation),
		);

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
		addedCost: number,
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
			avgCupCost = updateWeightedAvg(
				cups,
				avgCupCost,
				selectedCups,
				cost,
			);
			cups += selectedCups;
		}
		if (selectedLemons > 0) {
			const cost = getPackCost("lemons", selectedLemons);
			avgLemonCost = updateWeightedAvg(
				lemons,
				avgLemonCost,
				selectedLemons,
				cost,
			);
			lemons += selectedLemons;
		}
		if (selectedSugar > 0) {
			const cost = getPackCost("sugar", selectedSugar);
			avgSugarCost = updateWeightedAvg(
				sugar,
				avgSugarCost,
				selectedSugar,
				cost,
			);
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

		const randomFactor = 0.88 + Math.random() * 0.24;
		return Math.max(8, Math.round(base * randomFactor));
	}

	function spawnPopup(
		text: string,
		kind: FloatingPopup["kind"],
		x: number,
		y: number,
		subtext?: string,
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
			const rejectProb = Math.min(
				0.95,
				Math.pow(priceRatio - 1.0, 1.35) * 1.15,
			);
			if (Math.random() < rejectProb) {
				return {
					wantsToBuy: false,
					reason: "too_expensive",
					reaction: "Too pricey!",
				};
			}
		}

		// Taste check
		const tastePassProb = 0.2 + (tasteScore / 100) * 0.8;
		if (Math.random() > tastePassProb) {
			let msg = "Sour!";
			if (sugarPerCup > lemonsPerCup + 0.5) msg = "Too sweet!";
			else if (icePerCup < idealIceForWeather - 1) msg = "Needs ice!";
			else if (icePerCup > idealIceForWeather + 1) msg = "Too icy!";
			else if (lemonsPerCup < 1 && sugarPerCup < 1) msg = "Watery!";
			return { wantsToBuy: false, reason: "bad_taste", reaction: msg };
		}

		const happyReactions = ["Yum!", "Fresh!", "Love it!", "Crisp!"];
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
			cust.reaction = "Sold out!";
			missedSoldOut++;
			if (!soldOutDuringDay) {
				soldOutDuringDay = true;
				spawnPopup("SOLD OUT!", "negative", 50, 30);
			} else {
				spawnPopup("Sold out", "warning", 50, 44);
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

		spawnPopup(
			`+$${pricePerCup.toFixed(2)}`,
			"money",
			50,
			32,
			decision.reaction,
		);
	}

	function startDay() {
		if (phase !== "prep" || showBuyMenu) return;

		if (maxCupsPossible <= 0) {
			showToast(
				"You need enough cups, lemons, sugar & ice for at least 1 cup!",
				"error",
			);
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
			const spawnAt =
				(i / Math.max(1, visitors)) * 0.78 + Math.random() * 0.04;
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

			cust.x =
				cust.direction === 1 ? -8 + localT * 116 : 108 - localT * 116;

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

		const tasteScore = calculateTasteScore();

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

	function getBusinessRank(netProfit: number): {
		title: string;
		badge: SpriteName;
	} {
		if (netProfit >= 45)
			return { title: "Lemonade Tycoon", badge: "trophy" };
		if (netProfit >= 25)
			return { title: "Savvy Entrepreneur", badge: "sparkle" };
		if (netProfit >= 10)
			return { title: "Neighborhood Favorite", badge: "lemon" };
		if (netProfit >= 0)
			return { title: "Breaking Even", badge: "thumbsup" };
		return { title: "Needs Practice", badge: "chart" };
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

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape" && showBuyMenu) {
			clearSelection();
			showBuyMenu = false;
		}
	}}
/>

{#snippet sprite(name: SpriteName, size = 18)}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		class="sprite-icon"
		aria-hidden="true"
	>
		{#if name === "lemon"}
			<path
				d="M12 4.5C15.5 4.5 19.5 7.5 19.5 12.5C19.5 17 15.5 19.5 12 19.5C8.5 19.5 4.5 17 4.5 12.5C4.5 7.5 8.5 4.5 12 4.5Z"
				fill="#fde047"
				stroke="#ca8a04"
				stroke-width="1.6"
			/>
			<path
				d="M9 9.5C10.2 8 12.5 7.5 14.5 8.2"
				stroke="#fef9c3"
				stroke-width="1.6"
				stroke-linecap="round"
			/>
			<path
				d="M13 4.5C14 2.5 16.5 2 18 3.2C17 4.8 15 5.2 13 4.5Z"
				fill="#22c55e"
				stroke="#15803d"
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
		{:else if name === "cup"}
			<path
				d="M6.5 8H17.5L16 20.5H8L6.5 8Z"
				fill="#fde047"
				stroke="#ca8a04"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
			<path
				d="M6 8H18"
				stroke="#e4e4e7"
				stroke-width="2.2"
				stroke-linecap="round"
			/>
			<path
				d="M13 8L15 3.5H17.5"
				stroke="#ef4444"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<rect
				x="9"
				y="10.5"
				width="2.5"
				height="2.5"
				rx="0.5"
				fill="#e0f2fe"
				opacity="0.9"
			/>
		{:else if name === "sugar"}
			<rect
				x="4"
				y="9"
				width="9"
				height="9"
				rx="1.8"
				fill="#ffffff"
				stroke="#a1a1aa"
				stroke-width="1.5"
			/>
			<rect
				x="11"
				y="5"
				width="9"
				height="9"
				rx="1.8"
				fill="#f4f4f5"
				stroke="#a1a1aa"
				stroke-width="1.5"
			/>
			<circle cx="15.5" cy="9.5" r="1" fill="#f472b6" />
			<circle cx="8.5" cy="13.5" r="1" fill="#f472b6" />
		{:else if name === "ice"}
			<rect
				x="4.5"
				y="4.5"
				width="15"
				height="15"
				rx="3"
				fill="#bae6fd"
				stroke="#0284c7"
				stroke-width="1.6"
			/>
			<path
				d="M8 8.5L12 8.5M8 8.5L8 12.5"
				stroke="#ffffff"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
			<path
				d="M15 15.5L12.5 15.5"
				stroke="#38bdf8"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		{:else if name === "sunny"}
			<circle
				cx="12"
				cy="12"
				r="5"
				fill="#facc15"
				stroke="#ca8a04"
				stroke-width="1.5"
			/>
			<path
				d="M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7.1 7.1M16.9 16.9L18.7 18.7M18.7 5.3L16.9 7.1M7.1 16.9L5.3 18.7"
				stroke="#facc15"
				stroke-width="2"
				stroke-linecap="round"
			/>
		{:else if name === "hot"}
			<circle
				cx="12"
				cy="12"
				r="5.5"
				fill="#f97316"
				stroke="#c2410c"
				stroke-width="1.5"
			/>
			<path
				d="M12 2L13.5 5.5H10.5L12 2ZM12 22L13.5 18.5H10.5L12 22ZM2 12L5.5 10.5V13.5L2 12ZM22 12L18.5 10.5V13.5L22 12Z"
				fill="#fb923c"
			/>
			<circle cx="12" cy="12" r="2.5" fill="#fde047" />
		{:else if name === "cloudy"}
			<path
				d="M7.5 18H17.5C19.7 18 21.5 16.2 21.5 14C21.5 11.9 19.9 10.2 17.8 10C17.2 7.2 14.7 5 11.7 5C8.3 5 5.5 7.8 5.5 11.2C5.5 11.4 5.5 11.6 5.5 11.8C3.8 12.3 2.5 13.9 2.5 15.8C2.5 17 3.5 18 4.8 18H7.5Z"
				fill="#cbd5e1"
				stroke="#64748b"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else if name === "rainy"}
			<path
				d="M7 14.5H17.5C19.4 14.5 21 12.9 21 11C21 9.2 19.6 7.7 17.8 7.5C17.2 5.2 15.1 3.5 12.5 3.5C9.5 3.5 7 5.9 7 9C5.1 9.3 3.5 10.9 3.5 12.8C3.5 13.8 4.3 14.5 5.5 14.5H7Z"
				fill="#94a3b8"
				stroke="#475569"
				stroke-width="1.5"
			/>
			<path
				d="M8 17.5L7 20.5M12.5 17.5L11.5 20.5M17 17.5L16 20.5"
				stroke="#38bdf8"
				stroke-width="2"
				stroke-linecap="round"
			/>
		{:else if name === "cold"}
			<path
				d="M12 2.5V21.5M3.8 7.2L20.2 16.8M20.2 7.2L3.8 16.8"
				stroke="#7dd3fc"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
			<path
				d="M10 4.5L12 6.5L14 4.5M10 19.5L12 17.5L14 19.5"
				stroke="#bae6fd"
				stroke-width="1.4"
				stroke-linecap="round"
			/>
		{:else if name === "cart"}
			<path
				d="M3 4H5.5L7.5 15.5H18.5L20.5 7.5H6.5"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<circle cx="9" cy="19" r="1.5" fill="currentColor" />
			<circle cx="17" cy="19" r="1.5" fill="currentColor" />
		{:else if name === "clock"}
			<circle
				cx="12"
				cy="12"
				r="8.5"
				stroke="currentColor"
				stroke-width="1.8"
			/>
			<path
				d="M12 7.5V12L15 14"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else if name === "skip"}
			<path d="M5 6L13 12L5 18V6Z" fill="currentColor" />
			<path d="M13 6L19 12L13 18V6Z" fill="currentColor" />
			<rect x="19" y="6" width="2" height="12" fill="currentColor" />
		{:else if name === "trophy"}
			<path
				d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z"
				fill="#fbbf24"
				stroke="#b45309"
				stroke-width="1.5"
			/>
			<path
				d="M7 6H4.5C4.5 9 5.5 10.5 7 10.5M17 6H19.5C19.5 9 18.5 10.5 17 10.5"
				stroke="#d97706"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
			<path
				d="M12 15V19M8.5 19H15.5"
				stroke="#b45309"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		{:else if name === "sparkle"}
			<path
				d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
				fill="#fde047"
				stroke="#ca8a04"
				stroke-width="1.4"
				stroke-linejoin="round"
			/>
		{:else if name === "thumbsup"}
			<path
				d="M7 11V20H4V11H7ZM7 11L11 4C12 4 13 5 13 6.5V9.5H18.5C19.6 9.5 20.5 10.4 20.3 11.5L19.1 18.5C18.9 19.4 18.1 20 17.2 20H7"
				fill="#34d399"
				stroke="#047857"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else if name === "chart"}
			<path
				d="M4 19H20M6 9L10.5 13.5L14 10L19 15"
				stroke="#f87171"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M15.5 15H19V11.5"
				stroke="#f87171"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else if name === "ban"}
			<circle
				cx="12"
				cy="12"
				r="8.5"
				stroke="currentColor"
				stroke-width="1.8"
			/>
			<path
				d="M6.5 6.5L17.5 17.5"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		{:else if name === "coin"}
			<circle
				cx="12"
				cy="12"
				r="8.5"
				fill="#fbbf24"
				stroke="#b45309"
				stroke-width="1.5"
			/>
			<path
				d="M12 7.5V16.5M14.2 9.5C14.2 8.7 13.2 8.2 12 8.2C10.8 8.2 9.8 8.8 9.8 9.6C9.8 11.5 14.2 11.2 14.2 13.3C14.2 14.2 13.2 14.8 12 14.8C10.8 14.8 9.8 14.2 9.8 13.4"
				stroke="#78350f"
				stroke-width="1.4"
				stroke-linecap="round"
			/>
		{:else if name === "warn"}
			<path
				d="M12 3.5L21 19.5H3L12 3.5Z"
				fill="#fbbf24"
				stroke="#b45309"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
			<path
				d="M12 9.5V13.5M12 16.5H12.01"
				stroke="#18181b"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		{/if}
	</svg>
{/snippet}

<div class="lemonade-container">
	{#if toastMessage}
		<div
			class="toast toast-{toastType}"
			role="status"
			aria-live="polite"
			in:fly={{ y: -16, duration: 220 }}
			out:fade={{ duration: 180 }}
		>
			{toastMessage}
		</div>
	{/if}

	<div class="header">
		<div class="header-top">
			<span class="day-badge">DAY {currentDay}/{TOTAL_DAYS}</span>
		</div>
		<h1>{@render sprite("lemon", 28)} Lemonade Stand</h1>
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
						<linearGradient
							id="skySunny"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="0%" stop-color="#1e3a8a" />
							<stop
								offset="100%"
								stop-color="#38bdf8"
								stop-opacity="0.45"
							/>
						</linearGradient>
						<linearGradient id="skyHot" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#7c2d12" />
							<stop
								offset="100%"
								stop-color="#f59e0b"
								stop-opacity="0.45"
							/>
						</linearGradient>
						<linearGradient
							id="skyCloudy"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="0%" stop-color="#1e293b" />
							<stop
								offset="100%"
								stop-color="#475569"
								stop-opacity="0.6"
							/>
						</linearGradient>
						<linearGradient
							id="skyRainy"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="0%" stop-color="#0f172a" />
							<stop offset="100%" stop-color="#1e293b" />
						</linearGradient>
						<linearGradient
							id="skyCold"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
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
							transform="translate({phase === 'running'
								? 60 + dayProgress * 300
								: 355}, {phase === 'running'
								? 42 - Math.sin(dayProgress * Math.PI) * 22
								: 28})"
						>
							<circle
								r={currentWeather.type === "hot" ? 20 : 16}
								fill={currentWeather.type === "hot"
									? "#fb923c"
									: "#fde047"}
								opacity="0.3"
								class="sun-glow"
							/>
							<circle
								r={currentWeather.type === "hot" ? 13 : 11}
								fill={currentWeather.type === "hot"
									? "#f97316"
									: "#facc15"}
							/>
						</g>
					{/if}

					{#if currentWeather.type === "cloudy" || currentWeather.type === "rainy"}
						<g
							class="cloud cloud-1"
							opacity={currentWeather.type === "rainy"
								? 0.55
								: 0.8}
						>
							<circle cx="80" cy="28" r="14" fill="#94a3b8" />
							<circle cx="96" cy="24" r="17" fill="#cbd5e1" />
							<circle cx="114" cy="29" r="13" fill="#94a3b8" />
						</g>
						<g
							class="cloud cloud-2"
							opacity={currentWeather.type === "rainy"
								? 0.55
								: 0.75}
						>
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
					<line
						x1="0"
						y1="112"
						x2="420"
						y2="112"
						stroke="#3f3f46"
						stroke-width="2"
					/>

					<!-- Lemonade Stand -->
					<g
						class="stand-booth {standPulse ? 'stand-pop' : ''}"
						transform="translate(168, 44)"
					>
						<!-- Posts -->
						<rect
							x="6"
							y="22"
							width="5"
							height="48"
							fill="#92400e"
						/>
						<rect
							x="73"
							y="22"
							width="5"
							height="48"
							fill="#92400e"
						/>
						<!-- Counter Base -->
						<rect
							x="2"
							y="46"
							width="80"
							height="24"
							rx="2"
							fill="#b45309"
						/>
						<rect
							x="0"
							y="43"
							width="84"
							height="5"
							rx="2"
							fill="#d97706"
						/>
						<!-- Sign on front -->
						<rect
							x="14"
							y="51"
							width="56"
							height="14"
							rx="2"
							fill="#fef3c7"
						/>
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
							<rect
								x="0"
								y="2"
								width="13"
								height="14"
								rx="2"
								fill="rgba(255,255,255,0.25)"
								stroke="#e4e4e7"
								stroke-width="1"
							/>
							<rect
								x="1.5"
								y={15 -
									Math.max(
										2,
										Math.min(
											11,
											(maxCupsPossible / 25) * 11,
										),
									)}
								width="10"
								height={Math.max(
									2,
									Math.min(11, (maxCupsPossible / 25) * 11),
								)}
								rx="1"
								fill={pitcherColor}
							/>
							{#if icePerCup > 0}
								<rect
									x="3"
									y="8"
									width="3"
									height="3"
									fill="#e0f2fe"
									opacity="0.85"
								/>
								<rect
									x="7"
									y="10"
									width="3"
									height="3"
									fill="#e0f2fe"
									opacity="0.85"
								/>
							{/if}
						</g>

						<!-- Cup stack -->
						<g transform="translate(52, 33)">
							<polygon
								points="2,10 10,10 11,2 1,2"
								fill="#f4f4f5"
							/>
							<polygon points="3,6 9,6 10,0 2,0" fill="#e4e4e7" />
						</g>

						<!-- Striped Awning -->
						<path d="M-4,22 L88,22 L82,8 L2,8 Z" fill="#fbbf24" />
						<path
							d="M12,22 L24,22 L22,8 L14,8 Z"
							fill="#ffffff"
							opacity="0.85"
						/>
						<path
							d="M36,22 L48,22 L46,8 L38,8 Z"
							fill="#ffffff"
							opacity="0.85"
						/>
						<path
							d="M60,22 L72,22 L70,8 L62,8 Z"
							fill="#ffffff"
							opacity="0.85"
						/>
						<rect
							x="-4"
							y="20"
							width="92"
							height="4"
							rx="2"
							fill="#f59e0b"
						/>
					</g>

					<!-- Animated Customers -->
					{#if phase === "running"}
						{#each simCustomers as cust (cust.id)}
							{#if dayProgress >= cust.spawnAt && dayProgress <= cust.spawnAt + cust.duration}
								{@const px = (cust.x / 100) * 420}
								{@const bob =
									Math.abs(
										Math.sin(
											dayProgress * 45 + cust.bobPhase,
										),
									) * 2.5}
								<g
									transform="translate({px}, {114 +
										cust.yOffset -
										bob})"
								>
									<!-- Shadow -->
									<ellipse
										cx="0"
										cy={8 + bob}
										rx="6"
										ry="2"
										fill="rgba(0,0,0,0.4)"
									/>
									<!-- Body -->
									<rect
										x="-5"
										y="-12"
										width="10"
										height="14"
										rx="4"
										fill={cust.shirtColor}
									/>
									<!-- Head -->
									<circle
										cx="0"
										cy="-17"
										r="5"
										fill={cust.skinColor}
									/>
									<!-- Cup in hand if bought -->
									{#if cust.outcome === "bought"}
										<rect
											x={cust.direction * 5}
											y="-9"
											width="4"
											height="5"
											rx="1"
											fill="#fde047"
										/>
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
						{@render sprite(currentWeather.icon, 14)}
						{currentWeather.description} · {currentWeather.temperature}°F
					</span>
					{#if phase === "running"}
						<span class="clock-pill"
							>{@render sprite("clock", 13)} {dayClockLabel}</span
						>
					{/if}
				</div>

				{#if soldOutDuringDay && phase === "running"}
					<div
						class="sold-out-banner"
						role="status"
						aria-live="polite"
						in:scale={{ duration: 200 }}
					>
						SOLD OUT!
					</div>
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
						<span title="Cups" aria-label="Cups: {cups}"
							>{@render sprite("cup", 16)} {cups}</span
						>
						<span title="Lemons" aria-label="Lemons: {lemons}"
							>{@render sprite("lemon", 16)} {lemons}</span
						>
						<span title="Sugar" aria-label="Sugar: {sugar}"
							>{@render sprite("sugar", 16)} {sugar}</span
						>
						<span
							title="Ice (melts nightly)"
							aria-label="Ice: {ice}"
							>{@render sprite("ice", 16)} {ice}</span
						>
					</div>
				</div>
			</div>

			{#if phase === "prep"}
				<!-- Prep Controls -->
				<div class="controls-grid" in:fade={{ duration: 150 }}>
					<div class="control-card">
						<div class="card-head">
							<span class="label">Price per Cup</span>
							<span
								class="margin-tag"
								class:negative={marginPerCup < 0}
								class:positive={marginPerCup > 0}
							>
								Cost ${unitCostPerCup.toFixed(2)} · Margin {marginPerCup >=
								0
									? "+"
									: ""}${marginPerCup.toFixed(2)}
							</span>
						</div>
						<div class="price-buttons">
							<button
								type="button"
								aria-label="Decrease price per cup"
								onclick={() =>
									(pricePerCup = Math.max(
										0.25,
										+(pricePerCup - 0.1).toFixed(2),
									))}>-</button
							>
							<span aria-live="polite"
								>${pricePerCup.toFixed(2)}</span
							>
							<button
								type="button"
								aria-label="Increase price per cup"
								onclick={() =>
									(pricePerCup = Math.min(
										5.0,
										+(pricePerCup + 0.1).toFixed(2),
									))}>+</button
							>
						</div>
					</div>

					<div class="control-card">
						<div class="card-head">
							<span class="label">Recipe per Cup</span>
							<span class="taste-badge taste-{tasteInfo.tone}">
								{tasteInfo.label}
							</span>
						</div>
						<div class="recipe-controls">
							<div class="recipe-item">
								<span class="label-with-icon"
									>{@render sprite("lemon", 17)} Lemons</span
								>
								<div class="recipe-control">
									<button
										type="button"
										aria-label="Decrease lemons per cup"
										onclick={() =>
											(lemonsPerCup = Math.max(
												0.5,
												+(lemonsPerCup - 0.5).toFixed(
													1,
												),
											))}>-</button
									>
									<span>{lemonsPerCup}</span>
									<button
										type="button"
										aria-label="Increase lemons per cup"
										onclick={() =>
											(lemonsPerCup = Math.min(
												3,
												+(lemonsPerCup + 0.5).toFixed(
													1,
												),
											))}>+</button
									>
								</div>
							</div>
							<div class="recipe-item">
								<span class="label-with-icon"
									>{@render sprite("sugar", 17)} Sugar</span
								>
								<div class="recipe-control">
									<button
										type="button"
										aria-label="Decrease sugar per cup"
										onclick={() =>
											(sugarPerCup = Math.max(
												0.5,
												+(sugarPerCup - 0.5).toFixed(1),
											))}>-</button
									>
									<span>{sugarPerCup}</span>
									<button
										type="button"
										aria-label="Increase sugar per cup"
										onclick={() =>
											(sugarPerCup = Math.min(
												3,
												+(sugarPerCup + 0.5).toFixed(1),
											))}>+</button
									>
								</div>
							</div>
							<div class="recipe-item">
								<span class="label-with-icon"
									>{@render sprite("ice", 17)} Ice
									<small>(rec: {idealIceForWeather})</small
									></span
								>
								<div class="recipe-control">
									<button
										type="button"
										aria-label="Decrease ice cubes per cup"
										onclick={() =>
											(icePerCup = Math.max(
												0,
												icePerCup - 1,
											))}>-</button
									>
									<span>{icePerCup}</span>
									<button
										type="button"
										aria-label="Increase ice cubes per cup"
										onclick={() =>
											(icePerCup = Math.min(
												5,
												icePerCup + 1,
											))}>+</button
									>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="action-buttons">
					<button
						type="button"
						class="btn secondary-btn btn-with-icon"
						class:pulse-hint={maxCupsPossible === 0}
						onclick={() => (showBuyMenu = true)}
					>
						{@render sprite("cart", 17)} Buy Supplies
					</button>
					<button
						type="button"
						class="btn start-btn btn-with-icon"
						onclick={startDay}
						disabled={maxCupsPossible <= 0}
					>
						{@render sprite("sunny", 17)} Open Stand
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
							<span class="m-val positive"
								>${revenue.toFixed(2)}</span
							>
						</div>
						<div class="metric">
							<span class="m-label">Turned Away</span>
							<span class="m-val"
								>{missedTooExpensive +
									missedBadTaste +
									missedSoldOut}</span
							>
						</div>
					</div>
					<div class="progress-track">
						<div
							class="progress-fill"
							style="width: {dayProgress * 100}%"
						></div>
					</div>
					<div class="sim-controls">
						<button
							type="button"
							class="speed-btn"
							onclick={() => (simSpeed = simSpeed === 1 ? 2 : 1)}
						>
							{simSpeed}x Speed
						</button>
						<button
							type="button"
							class="skip-btn btn-with-icon"
							onclick={skipDayAnimation}
						>
							Skip {@render sprite("skip", 15)}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else if phase === "results"}
		<div class="results-panel" in:scale={{ duration: 220, start: 0.96 }}>
			<h2>Day {currentDay} Summary</h2>
			<div class="weather-display">
				<span class="weather-icon"
					>{@render sprite(currentWeather.icon, 24)}</span
				>
				<span
					>{currentWeather.description} — {currentWeather.temperature}°F</span
				>
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
					<span class="value negative"
						>-${iceWasteCost.toFixed(2)}</span
					>
				</div>
			</div>

			<div class="net-profit-banner">
				<span>Net Day Profit</span>
				<strong
					class:positive={profit >= 0}
					class:negative={profit < 0}
				>
					{profit >= 0 ? "+" : "-"}${Math.abs(profit).toFixed(2)}
				</strong>
			</div>

			{#if missedTooExpensive > 0 || missedBadTaste > 0 || missedSoldOut > 0}
				<div class="feedback-chips">
					{#if missedSoldOut > 0}
						<span class="chip warn"
							>{@render sprite("ban", 13)}
							{missedSoldOut} missed (sold out)</span
						>
					{/if}
					{#if missedTooExpensive > 0}
						<span class="chip warn"
							>{@render sprite("coin", 13)}
							{missedTooExpensive} thought price was high</span
						>
					{/if}
					{#if missedBadTaste > 0}
						<span class="chip warn"
							>{@render sprite("warn", 13)}
							{missedBadTaste} disliked recipe/ice</span
						>
					{/if}
				</div>
			{/if}

			<div class="forecast-box">
				<span>Tomorrow's Forecast:</span>
				<strong class="label-with-icon"
					>{@render sprite(tomorrowWeather.icon, 17)}
					{tomorrowWeather.description} (~{tomorrowWeather.temperature}°F)</strong
				>
			</div>

			<button type="button" class="btn next-btn" onclick={nextDay}>
				Start Day {currentDay + 1} →
			</button>
		</div>
	{:else if phase === "gameover"}
		{@const totalProfit = +(money - INITIAL_MONEY).toFixed(2)}
		{@const rank = getBusinessRank(totalProfit)}
		<div class="game-over-panel" in:scale={{ duration: 240, start: 0.96 }}>
			<div class="rank-badge">{@render sprite(rank.badge, 42)}</div>
			<h2>{rank.title}</h2>
			<p class="subtitle">7-Day Lemonade Stand Complete</p>

			<div class="final-stats">
				<div class="final-stat">
					<span class="label">Final Cash</span>
					<span
						class="value"
						class:positive={money >= INITIAL_MONEY}
						class:negative={money < INITIAL_MONEY}
						>${money.toFixed(2)}</span
					>
				</div>
				<div class="final-stat">
					<span class="label">Net Profit</span>
					<span
						class="value"
						class:positive={totalProfit >= 0}
						class:negative={totalProfit < 0}
						>{totalProfit >= 0 ? "+" : "-"}${Math.abs(
							totalProfit,
						).toFixed(2)}</span
					>
				</div>
			</div>

			<div class="history">
				<h3>Daily Ledger</h3>
				<div class="history-list">
					{#each dailyHistory as entry}
						<div class="history-entry">
							<span class="label-with-icon"
								>Day {entry.day}
								{@render sprite(entry.weather.icon, 15)}</span
							>
							<span>{entry.customers} sold</span>
							<span class="muted"
								>Rev ${entry.revenue.toFixed(2)}</span
							>
							<span
								class:positive={entry.profit >= 0}
								class:negative={entry.profit < 0}
							>
								{entry.profit >= 0 ? "+" : "-"}${Math.abs(
									entry.profit,
								).toFixed(2)}
							</span>
						</div>
					{/each}
				</div>
			</div>
			<button type="button" class="btn restart-btn" onclick={resetGame}
				>Play Again</button
			>
		</div>
	{/if}

	{#if showBuyMenu}
		<div
			class="buy-menu-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="buy-modal-title"
			in:fade={{ duration: 150 }}
			out:fade={{ duration: 150 }}
		>
			<div class="buy-menu" in:scale={{ duration: 180, start: 0.95 }}>
				<div class="buy-header">
					<h2 id="buy-modal-title" class="label-with-icon">
						{@render sprite("cart", 20)} Wholesale Supplies
					</h2>
					<span class="cash-pill">Cash: ${money.toFixed(2)}</span>
				</div>
				<p class="buy-tip">
					Larger packs have lower unit costs. Unused ice melts each
					night!
				</p>

				<div class="buy-rows">
					{#each [{ key: "cups" as SupplyKey, icon: "cup" as SpriteName, label: "Cups", current: cups, selected: selectedCups }, { key: "lemons" as SupplyKey, icon: "lemon" as SpriteName, label: "Lemons", current: lemons, selected: selectedLemons }, { key: "sugar" as SupplyKey, icon: "sugar" as SpriteName, label: "Sugar", current: sugar, selected: selectedSugar }, { key: "ice" as SupplyKey, icon: "ice" as SpriteName, label: "Ice", current: ice, selected: selectedIce }] as row}
						<div class="buy-row">
							<div class="row-info">
								<span class="row-name label-with-icon"
									>{@render sprite(row.icon, 16)}
									{row.label}</span
								>
								<span class="row-stock"
									>Have: {row.current}</span
								>
							</div>
							<div class="pack-options">
								{#each SUPPLY_PACKS[row.key] as pack}
									<button
										type="button"
										class="pack-btn"
										class:selected={row.selected ===
											pack.qty}
										onclick={() =>
											toggleSelect(row.key, pack.qty)}
									>
										<span class="pack-qty">+{pack.qty}</span
										>
										<span class="pack-cost"
											>${pack.cost.toFixed(2)}</span
										>
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
						disabled={selectedTotalCost === 0 ||
							selectedTotalCost > money + 0.0001}
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
		--ls-bg: var(--app-bg, #09090b);
		--ls-card-bg: #18181b;
		--ls-card-border: rgba(255, 255, 255, 0.12);
		--ls-card-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		--ls-sub-bg: rgba(255, 255, 255, 0.05);
		--ls-sub-border: rgba(255, 255, 255, 0.08);
		--ls-text: #ffffff;
		--ls-text-muted: #d4d4d8;
		--ls-text-soft: #a1a1aa;
		--ls-btn-bg: #27272a;
		--ls-btn-hover: #3f3f46;
		--ls-btn-border: #3f3f46;
		--ls-btn-text: #ffffff;
		--ls-positive: #34d399;
		--ls-negative: #f87171;
		--ls-warn: #fde047;
		--ls-sweet: #f472b6;
		--ls-cool: #7dd3fc;
		--ls-chip-bg: rgba(251, 191, 36, 0.16);
		--ls-chip-text: #fde047;
		--ls-forecast-bg: rgba(56, 189, 248, 0.12);
		--ls-forecast-border: rgba(56, 189, 248, 0.28);
		--ls-cash-pill-bg: rgba(16, 185, 129, 0.18);
		--ls-cash-pill-text: #34d399;
		--ls-overlay-bg: rgba(0, 0, 0, 0.78);

		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--ls-text);
		font-family: "Outfit", "Inter", sans-serif;
		background: var(--ls-bg);
		padding: 1.25rem;
		position: relative;
		overflow-y: auto;
		box-sizing: border-box;
	}

	:global(html[data-theme="light"]) .lemonade-container {
		--ls-bg: var(--app-bg, #f7f1e6);
		--ls-card-bg: #fffdf8;
		--ls-card-border: rgba(106, 84, 58, 0.22);
		--ls-card-shadow: 0 12px 32px rgba(47, 37, 28, 0.1);
		--ls-sub-bg: #f5efe4;
		--ls-sub-border: rgba(106, 84, 58, 0.16);
		--ls-text: #2f251c;
		--ls-text-muted: #544435;
		--ls-text-soft: #6b5847;
		--ls-btn-bg: #efe6d6;
		--ls-btn-hover: #e4d7c1;
		--ls-btn-border: rgba(106, 84, 58, 0.3);
		--ls-btn-text: #2f251c;
		--ls-positive: #047857;
		--ls-negative: #b91c1c;
		--ls-warn: #92400e;
		--ls-sweet: #9d174d;
		--ls-cool: #0369a1;
		--ls-chip-bg: #fef3c7;
		--ls-chip-text: #78350f;
		--ls-forecast-bg: #e0f2fe;
		--ls-forecast-border: rgba(3, 105, 161, 0.25);
		--ls-cash-pill-bg: #d1fae5;
		--ls-cash-pill-text: #065f46;
		--ls-overlay-bg: rgba(47, 37, 28, 0.55);
	}

	.lemonade-container button:focus-visible {
		outline: 2px solid #f59e0b;
		outline-offset: 2px;
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
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		pointer-events: none;
	}
	.toast-error {
		background: #dc2626;
		color: #ffffff;
	}
	.toast-success {
		background: #059669;
		color: #ffffff;
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
		color: #18181b;
		font-weight: 900;
		font-size: 0.72rem;
		padding: 0.2rem 0.7rem;
		border-radius: 4px;
		letter-spacing: 0.04em;
	}

	h1 {
		font-size: 2rem;
		font-weight: 900;
		margin: 0;
		letter-spacing: -1.5px;
		color: var(--ls-text);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
	}

	.sprite-icon {
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}

	.label-with-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.label-with-icon-center {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
	}

	.btn-with-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
	}

	.weather-pill,
	.clock-pill,
	.supplies span,
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.game-viewport,
	.results-panel,
	.game-over-panel {
		background: var(--ls-card-bg);
		padding: 1.5rem;
		border-radius: 1rem;
		border: 1px solid var(--ls-card-border);
		box-shadow: var(--ls-card-shadow);
		width: 100%;
		max-width: 820px;
		box-sizing: border-box;
		color: var(--ls-text);
	}

	/* Animated Scene */
	.scene-wrapper {
		position: relative;
		width: 100%;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid var(--ls-card-border);
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
		0%,
		100% {
			opacity: 0.25;
			transform: scale(1);
		}
		50% {
			opacity: 0.45;
			transform: scale(1.15);
		}
	}

	@keyframes driftCloud {
		0% {
			transform: translateX(-18px);
		}
		50% {
			transform: translateX(18px);
		}
		100% {
			transform: translateX(-18px);
		}
	}

	@keyframes fallRain {
		0% {
			transform: translateY(-10px);
			opacity: 0;
		}
		20% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(105px);
			opacity: 0.1;
		}
	}

	@keyframes fallSnow {
		0% {
			transform: translate(0, -10px);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translate(12px, 100px);
			opacity: 0;
		}
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
		background: rgba(9, 9, 11, 0.8);
		color: #ffffff;
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.18);
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
		background: #dc2626;
		color: #ffffff;
		font-weight: 900;
		font-size: 0.85rem;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		border: 2px solid #ffffff;
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
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
		animation: floatUpFade 1.15s ease-out forwards;
		white-space: nowrap;
	}
	.popup-money {
		color: #34d399;
	}
	.popup-warning {
		color: #fde047;
		font-size: 0.78rem;
	}
	.popup-negative {
		color: #f87171;
		font-size: 0.78rem;
	}
	.popup-sub {
		font-size: 0.7rem;
		color: #fef08a;
	}

	@keyframes floatUpFade {
		0% {
			opacity: 0;
			transform: translate(-50%, 0) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translate(-50%, -10px) scale(1.05);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -36px) scale(0.95);
		}
	}

	/* Stats Panel */
	.stats-panel {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: var(--ls-sub-bg);
		border-radius: 0.75rem;
		border: 1px solid var(--ls-sub-border);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat .label {
		font-size: 0.68rem;
		color: var(--ls-text-soft);
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
		color: var(--ls-positive);
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
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
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
		color: var(--ls-text-muted);
	}

	.margin-tag,
	.taste-badge {
		font-size: 0.75rem;
		font-weight: 700;
	}
	.taste-good {
		color: var(--ls-positive);
	}
	.taste-warn {
		color: var(--ls-warn);
	}
	.taste-sweet {
		color: var(--ls-sweet);
	}
	.taste-cool {
		color: var(--ls-cool);
	}
	.taste-bad {
		color: var(--ls-negative);
	}

	.price-buttons {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
	}

	.price-buttons button,
	.recipe-control button {
		background: var(--ls-btn-bg);
		border: 1px solid var(--ls-btn-border);
		color: var(--ls-btn-text);
		border-radius: 8px;
		font-weight: 800;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.1s;
	}

	.price-buttons button {
		padding: 0.4rem 1rem;
		font-size: 1rem;
	}

	.price-buttons button:hover,
	.recipe-control button:hover {
		background: var(--ls-btn-hover);
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
		color: var(--ls-text-soft);
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
		transition:
			transform 0.15s,
			background 0.15s;
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
		color: #18181b;
	}
	.start-btn:hover:not(:disabled) {
		background: #f59e0b;
	}

	.secondary-btn {
		background: var(--ls-btn-bg);
		border: 1px solid var(--ls-btn-border);
		color: var(--ls-btn-text);
	}
	.secondary-btn:hover {
		background: var(--ls-btn-hover);
	}

	.pulse-hint {
		border-color: #f59e0b;
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
		animation: gentlePulse 1.8s ease-in-out infinite;
	}

	@keyframes gentlePulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
		}
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
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
		padding: 0.5rem;
		border-radius: 8px;
	}
	.m-label {
		display: block;
		font-size: 0.68rem;
		text-transform: uppercase;
		color: var(--ls-text-soft);
		font-weight: 700;
	}
	.m-val {
		font-size: 1.05rem;
		font-weight: 900;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		background: var(--ls-btn-bg);
		border-radius: 999px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #f59e0b, #10b981);
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
		border: 1px solid var(--ls-btn-border);
		background: var(--ls-btn-bg);
		color: var(--ls-btn-text);
	}
	.speed-btn:hover,
	.skip-btn:hover {
		background: var(--ls-btn-hover);
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
		color: var(--ls-text-soft);
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
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
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
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.result .label {
		font-size: 0.7rem;
		color: var(--ls-text-soft);
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
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
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
		background: var(--ls-chip-bg);
		color: var(--ls-chip-text);
		font-weight: 700;
	}

	.forecast-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.9rem;
		background: var(--ls-forecast-bg);
		border: 1px solid var(--ls-forecast-border);
		border-radius: 8px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.positive {
		color: var(--ls-positive);
	}
	.negative {
		color: var(--ls-negative);
	}
	.muted {
		color: var(--ls-text-soft);
	}

	.next-btn,
	.restart-btn {
		background: #059669;
		color: #ffffff;
		width: 100%;
	}
	.next-btn:hover,
	.restart-btn:hover {
		background: #047857;
	}

	.final-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.final-stat {
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
		padding: 0.75rem 0.5rem;
		border-radius: 8px;
	}

	.final-stat .label {
		font-size: 0.7rem;
		color: var(--ls-text-soft);
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
		color: var(--ls-text-muted);
	}

	.history-list {
		max-height: 170px;
		overflow-y: auto;
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
		border-radius: 8px;
		padding: 0.4rem;
	}

	.history-entry {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr 1.1fr 0.9fr;
		gap: 0.4rem;
		padding: 0.45rem 0.5rem;
		border-bottom: 1px solid var(--ls-sub-border);
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
		background: var(--ls-overlay-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(8px);
		padding: 1rem;
	}

	.buy-menu {
		background: var(--ls-card-bg);
		color: var(--ls-text);
		padding: 1.5rem;
		border-radius: 1rem;
		border: 1px solid var(--ls-card-border);
		box-shadow: var(--ls-card-shadow);
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
		background: var(--ls-cash-pill-bg);
		color: var(--ls-cash-pill-text);
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		font-weight: 800;
		font-size: 0.85rem;
	}

	.buy-tip {
		color: var(--ls-text-muted);
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
		background: var(--ls-sub-bg);
		padding: 0.65rem 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--ls-sub-border);
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
		color: var(--ls-text-soft);
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
		background: var(--ls-btn-bg);
		border: 1px solid var(--ls-btn-border);
		color: var(--ls-btn-text);
		cursor: pointer;
		transition: all 0.15s;
	}

	.pack-btn:hover {
		background: var(--ls-btn-hover);
	}

	.pack-btn.selected {
		background: #fbbf24;
		border-color: #d97706;
		color: #18181b;
	}

	.pack-qty {
		font-weight: 900;
		font-size: 0.82rem;
	}
	.pack-cost {
		font-size: 0.72rem;
		font-weight: 700;
		opacity: 0.9;
	}

	.buy-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--ls-sub-bg);
		border: 1px solid var(--ls-sub-border);
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
		background: #059669;
		color: #ffffff;
	}
	.buy-btn:hover:not(:disabled) {
		background: #047857;
	}

	.close-btn {
		background: var(--ls-btn-bg);
		border: 1px solid var(--ls-btn-border);
		color: var(--ls-btn-text);
	}
	.close-btn:hover {
		background: var(--ls-btn-hover);
	}

	@media (prefers-reduced-motion: reduce) {
		.sun-glow,
		.cloud-1,
		.cloud-2,
		.raindrop,
		.snowflake,
		.pulse-hint {
			animation: none;
		}
		.stand-booth,
		.progress-fill,
		.btn {
			transition: none;
		}
	}

	@media (min-width: 680px) {
		.lemonade-container {
			padding: 1.5rem 2rem;
		}
		h1 {
			font-size: 2.25rem;
		}
		.stand-svg {
			max-height: 280px;
		}
		.stats-panel {
			padding: 0.9rem 1.25rem;
		}
		.stat .value {
			font-size: 1.25rem;
		}
		.supplies {
			gap: 0.9rem;
			font-size: 1rem;
		}
		.controls-grid {
			display: grid;
			grid-template-columns: 1fr 1.25fr;
			gap: 1rem;
		}
		.control-card {
			padding: 1rem 1.1rem;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
		}
		.price-buttons {
			margin: auto 0;
			padding: 0.5rem 0;
		}
		.price-buttons span {
			font-size: 1.6rem;
		}
		.btn {
			padding: 1rem 1.25rem;
			font-size: 1.05rem;
		}
		.buy-menu {
			max-width: 560px;
			padding: 1.75rem;
		}
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
			border-top: 1px solid var(--ls-sub-border);
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
