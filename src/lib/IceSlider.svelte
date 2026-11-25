<script lang="ts">
	import Instructions from "./Instructions.svelte";
	import InGameMenu from "./InGameMenu.svelte";
	import { fade, scale } from "svelte/transition";
	import { onMount } from "svelte";
	import {
		getCuratedLevels,
		generateRandomLevel,
		simulateSlide,
		solveFrom,
		type Difficulty,
		type ParsedLevel,
		type Pos,
		type Waypoint,
	} from "./iceSliderEngine";

	let { onBack, registerActions } = $props<{
		onBack: () => void;
		registerActions: (actions: {
			restart?: (() => void) | null;
			newShuffle?: (() => void) | null;
			help?: (() => void) | null;
		}) => void;
	}>();

	const STORAGE_KEY = "iceslider-progress-v2";

	let instructions: any;
	const curatedLevels = getCuratedLevels();

	// Mode & progression
	let mode = $state<"campaign" | "random">("campaign");
	let difficulty = $state<Difficulty>("classic");
	let currentLevelIdx = $state(0);
	let level = $state<ParsedLevel>(curatedLevels[0]);
	let starsByLevel = $state<Record<string, number>>({});

	// Gameplay state
	let playerPos = $state<Pos>({ ...curatedLevels[0].start });
	let renderPos = $state<Pos>({ ...curatedLevels[0].start });
	let bumpOffset = $state<Pos>({ x: 0, y: 0 });
	let isSplashing = $state(false);
	let moves = $state(0);
	let isGameOver = $state(false);
	let isMoving = $state(false);
	let moveSegments = $state<Waypoint[][]>([]);
	let moveHistory = $state<
		{ pos: Pos; segments: Waypoint[][]; moves: number }[]
	>([]);

	// UI & helpers
	let showOptimal = $state(false);
	let showLevelSelect = $state(false);
	let hintDir = $state<Pos | null>(null);
	let isDeadEnd = $state(false);
	let toastMsg = $state<string | null>(null);
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;
	let hintTimeout: ReturnType<typeof setTimeout> | null = null;
	let animFrameId: number | null = null;
	let bufferedMove: { dx: number; dy: number; time: number } | null = null;

	// Touch tracking
	let touchStartX = 0;
	let touchStartY = 0;

	// Audio
	let soundMuted = $state(false);
	let audioCtx: AudioContext | null = null;

	function getAudio(): AudioContext | null {
		if (soundMuted || typeof window === "undefined") return null;
		if (!audioCtx) {
			const Ctx =
				window.AudioContext ||
				(
					window as unknown as {
						webkitAudioContext: typeof AudioContext;
					}
				).webkitAudioContext;
			if (Ctx) audioCtx = new Ctx();
		}
		if (audioCtx && audioCtx.state === "suspended") {
			audioCtx.resume().catch(() => {});
		}
		return audioCtx;
	}

	function playTone(
		freq: number,
		dur: number,
		type: OscillatorType = "sine",
		gainVal = 0.06,
		slideTo?: number,
	) {
		const ctx = getAudio();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, now);
		if (slideTo)
			osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
		gain.gain.setValueAtTime(gainVal, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + dur);
	}

	function playSound(
		kind: "slide" | "stop" | "bounce" | "warp" | "pit" | "win" | "bump",
	) {
		switch (kind) {
			case "slide":
				playTone(260, 0.12, "sine", 0.04, 420);
				break;
			case "stop":
				playTone(180, 0.07, "triangle", 0.06, 120);
				break;
			case "bounce":
				playTone(540, 0.1, "sine", 0.06, 720);
				break;
			case "warp":
				playTone(380, 0.18, "sine", 0.06, 860);
				break;
			case "pit":
				playTone(240, 0.22, "sawtooth", 0.05, 90);
				break;
			case "bump":
				playTone(130, 0.06, "triangle", 0.05, 100);
				break;
			case "win":
				playTone(523.25, 0.14, "sine", 0.07);
				setTimeout(() => playTone(659.25, 0.14, "sine", 0.07), 90);
				setTimeout(() => playTone(783.99, 0.24, "sine", 0.08), 180);
				break;
		}
	}

	function saveProgress() {
		if (typeof localStorage === "undefined") return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					currentLevelIdx,
					starsByLevel,
					soundMuted,
				}),
			);
		} catch {}
	}

	function loadProgress() {
		if (typeof localStorage === "undefined") return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (
				typeof data.currentLevelIdx === "number" &&
				data.currentLevelIdx >= 0 &&
				data.currentLevelIdx < curatedLevels.length
			) {
				currentLevelIdx = data.currentLevelIdx;
			}
			if (data.starsByLevel && typeof data.starsByLevel === "object") {
				starsByLevel = data.starsByLevel;
			}
			if (typeof data.soundMuted === "boolean") {
				soundMuted = data.soundMuted;
			}
		} catch {}
	}

	function showToast(msg: string, duration = 2200) {
		toastMsg = msg;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMsg = null;
		}, duration);
	}

	function clearAnimation() {
		if (animFrameId !== null) {
			cancelAnimationFrame(animFrameId);
			animFrameId = null;
		}
		isMoving = false;
		bufferedMove = null;
	}

	function loadLevelObj(nextLevel: ParsedLevel) {
		clearAnimation();
		level = nextLevel;
		playerPos = { ...nextLevel.start };
		renderPos = { ...nextLevel.start };
		bumpOffset = { x: 0, y: 0 };
		isSplashing = false;
		moves = 0;
		isGameOver = false;
		moveSegments = [];
		moveHistory = [];
		showOptimal = false;
		hintDir = null;
		isDeadEnd = false;
		toastMsg = null;
	}

	function selectCampaignLevel(idx: number) {
		mode = "campaign";
		currentLevelIdx = Math.max(0, Math.min(curatedLevels.length - 1, idx));
		showLevelSelect = false;
		loadLevelObj(curatedLevels[currentLevelIdx]);
		saveProgress();
	}

	function startRandomMode(diff: Difficulty) {
		mode = "random";
		difficulty = diff;
		showLevelSelect = false;
		loadLevelObj(generateRandomLevel(diff));
	}

	function resetGame() {
		loadLevelObj(level);
	}

	function nextPuzzle() {
		if (mode === "campaign") {
			if (currentLevelIdx < curatedLevels.length - 1) {
				selectCampaignLevel(currentLevelIdx + 1);
			} else {
				startRandomMode(difficulty);
			}
		} else {
			loadLevelObj(generateRandomLevel(difficulty));
		}
	}

	function undoMove() {
		if (isMoving || moveHistory.length === 0 || isGameOver) return;
		const prev = moveHistory[moveHistory.length - 1];
		moveHistory = moveHistory.slice(0, -1);
		playerPos = { ...prev.pos };
		renderPos = { ...prev.pos };
		moveSegments = prev.segments;
		moves = prev.moves;
		hintDir = null;
		checkDeadEnd(prev.pos);
	}

	function checkDeadEnd(pos: Pos) {
		const sol = solveFrom(pos, level.goal, level.grid, level.portalPairs);
		isDeadEnd = sol === null;
	}

	function requestHint() {
		if (isGameOver || isMoving) return;
		const sol = solveFrom(
			playerPos,
			level.goal,
			level.grid,
			level.portalPairs,
		);
		if (!sol || sol.dirs.length === 0) {
			isDeadEnd = true;
			showToast("Dead end! Press Undo [Z] or Restart [R]");
			return;
		}
		isDeadEnd = false;
		hintDir = sol.dirs[0];
		if (hintTimeout) clearTimeout(hintTimeout);
		hintTimeout = setTimeout(() => {
			hintDir = null;
		}, 2400);
	}

	function triggerBump(dx: number, dy: number) {
		playSound("bump");
		bumpOffset = { x: dx * 0.16, y: dy * 0.16 };
		setTimeout(() => {
			bumpOffset = { x: 0, y: 0 };
		}, 110);
	}

	function animateWaypoints(waypoints: Waypoint[], onDone: () => void) {
		// Split into continuous sub-spans (breaking on warp)
		const spans: {
			from: Pos;
			to: Pos;
			kind: Waypoint["kind"];
			dist: number;
		}[] = [];
		for (let i = 0; i < waypoints.length - 1; i++) {
			const a = waypoints[i];
			const b = waypoints[i + 1];
			if (a.kind === "warp") {
				spans.push({ from: a, to: b, kind: "warp", dist: 0.4 });
			} else {
				const dist = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
				spans.push({
					from: a,
					to: b,
					kind: b.kind,
					dist: Math.max(0.5, dist),
				});
			}
		}

		if (spans.length === 0) {
			onDone();
			return;
		}

		let spanIdx = 0;
		let spanStart = performance.now();
		let bouncedFlags = new Set<number>();

		const step = (now: number) => {
			if (!isMoving) return;
			const span = spans[spanIdx];
			const duration =
				span.kind === "warp"
					? 95
					: Math.min(220, Math.max(75, span.dist * 24));
			const t = Math.min(1, (now - spanStart) / duration);
			// Ease out quad for crisp deceleration at stop, linear for mid-bounce
			const eased = span.kind === "stop" ? 1 - (1 - t) * (1 - t) : t;

			if (span.kind === "warp") {
				renderPos =
					t < 0.5
						? { x: span.from.x, y: span.from.y }
						: { x: span.to.x, y: span.to.y };
				if (!bouncedFlags.has(spanIdx)) {
					bouncedFlags.add(spanIdx);
					playSound("warp");
				}
			} else {
				renderPos = {
					x: span.from.x + (span.to.x - span.from.x) * eased,
					y: span.from.y + (span.to.y - span.from.y) * eased,
				};
			}

			if (t >= 1) {
				if (span.kind === "bounce" && !bouncedFlags.has(spanIdx)) {
					bouncedFlags.add(spanIdx);
					playSound("bounce");
				}
				spanIdx++;
				if (spanIdx >= spans.length) {
					renderPos = { x: span.to.x, y: span.to.y };
					animFrameId = null;
					onDone();
					return;
				}
				spanStart = now;
			}
			animFrameId = requestAnimationFrame(step);
		};

		animFrameId = requestAnimationFrame(step);
	}

	function move(dx: number, dy: number) {
		if (isGameOver || isSplashing || showLevelSelect) return;

		if (isMoving) {
			bufferedMove = { dx, dy, time: Date.now() };
			return;
		}

		const res = simulateSlide(
			playerPos.x,
			playerPos.y,
			dx,
			dy,
			level.grid,
			level.goal,
			level.portalPairs,
		);

		if (res.outcome === "blocked") {
			triggerBump(dx, dy);
			return;
		}

		hintDir = null;
		isMoving = true;
		playSound("slide");

		const prevPos = { ...playerPos };
		const prevSegments = moveSegments;
		const prevMoves = moves;

		if (res.outcome === "pit" || res.outcome === "loop") {
			animateWaypoints(res.waypoints, () => {
				isSplashing = true;
				playSound("pit");
				showToast(
					res.outcome === "pit"
						? "Fell into lava!"
						: "Infinite loop! Rewinding...",
				);
				setTimeout(() => {
					isSplashing = false;
					isMoving = false;
					playerPos = prevPos;
					renderPos = { ...prevPos };
				}, 320);
			});
			return;
		}

		moveHistory = [
			...moveHistory,
			{ pos: prevPos, segments: prevSegments, moves: prevMoves },
		];
		moveSegments = [...moveSegments, res.waypoints];
		playerPos = { ...res.endPos };
		moves = prevMoves + 1;

		animateWaypoints(res.waypoints, () => {
			isMoving = false;
			if (res.outcome === "goal") {
				isGameOver = true;
				isDeadEnd = false;
				playSound("win");
				const earned = earnedStars(moves, parMoves);
				if (mode === "campaign") {
					const best = starsByLevel[level.id] ?? 0;
					if (earned > best) {
						starsByLevel = { ...starsByLevel, [level.id]: earned };
						saveProgress();
					}
				}
			} else {
				playSound("stop");
				checkDeadEnd(res.endPos);
				if (bufferedMove) {
					const now = Date.now();
					if (now - bufferedMove.time < 500) {
						const { dx: bDx, dy: bDy } = bufferedMove;
						bufferedMove = null;
						move(bDx, bDy);
					} else {
						bufferedMove = null;
					}
				}
			}
		});
	}

	function handleCellClick(x: number, y: number) {
		if (isGameOver || isMoving) return;
		const dx = x - playerPos.x;
		const dy = y - playerPos.y;
		if (dx === 0 && dy === 0) return;
		if (Math.abs(dx) >= Math.abs(dy)) {
			move(dx > 0 ? 1 : -1, 0);
		} else {
			move(0, dy > 0 ? 1 : -1);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		const key = e.key.toLowerCase();
		if (key === "escape" && showLevelSelect) {
			showLevelSelect = false;
			return;
		}
		if (showLevelSelect) return;

		if (key === "r") {
			resetGame();
			return;
		}
		if (key === "n") {
			nextPuzzle();
			return;
		}
		if (key === "z" || e.key === "Backspace") {
			e.preventDefault();
			undoMove();
			return;
		}
		if (key === "h") {
			requestHint();
			return;
		}
		if (key === "m") {
			soundMuted = !soundMuted;
			saveProgress();
			return;
		}

		if (isGameOver) return;
		switch (e.key) {
			case "ArrowUp":
			case "w":
			case "W":
				move(0, -1);
				break;
			case "ArrowDown":
			case "s":
			case "S":
				move(0, 1);
				break;
			case "ArrowLeft":
			case "a":
			case "A":
				move(-1, 0);
				break;
			case "ArrowRight":
			case "d":
			case "D":
				move(1, 0);
				break;
		}
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (isGameOver) return;
		const deltaX = e.changedTouches[0].clientX - touchStartX;
		const deltaY = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(deltaX) < 28 && Math.abs(deltaY) < 28) return;
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			move(deltaX > 0 ? 1 : -1, 0);
		} else {
			move(0, deltaY > 0 ? 1 : -1);
		}
	}

	function earnedStars(actual: number, par: number): number {
		if (par <= 0) return 3;
		if (actual <= par) return 3;
		if (actual <= par + 2) return 2;
		return 1;
	}

	// Split a segment's waypoints into polyline strings (splitting at portal warps)
	function segmentPolylines(waypoints: Waypoint[]): string[] {
		const lines: string[] = [];
		let current: string[] = [];
		for (const w of waypoints) {
			current.push(`${w.x + 0.5},${w.y + 0.5}`);
			if (w.kind === "warp") {
				if (current.length >= 2) lines.push(current.join(" "));
				current = [];
			}
		}
		if (current.length >= 2) lines.push(current.join(" "));
		return lines;
	}

	const parMoves = $derived(level.optimal.dirs.length);
	const currentStars = $derived(earnedStars(moves, parMoves));
	const totalCampaignStars = $derived(
		curatedLevels.reduce((sum, l) => sum + (starsByLevel[l.id] ?? 0), 0),
	);

	$effect(() => {
		registerActions({
			restart: resetGame,
			newShuffle: nextPuzzle,
			help: () => instructions.open(),
		});
	});

	onMount(() => {
		loadProgress();
		loadLevelObj(curatedLevels[currentLevelIdx]);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			clearAnimation();
		};
	});
</script>

<div class="game-inner">
	<Instructions
		bind:this={instructions}
		gameId="iceslider"
		title="Ice Slider Puzzle"
	>
		<p>
			<strong>Goal:</strong> Slide the coral block to the golden star in as
			few moves as possible.
		</p>
		<p>
			Once you start sliding, you keep gliding across the ice until an
			obstacle stops or redirects you. Move with <strong
				>Arrow keys</strong
			>, <strong>WASD</strong>, <strong>clicking a direction</strong>, or
			<strong>swiping</strong>.
		</p>
		<hr class="inst-sep" />
		<p><strong>Tile Guide:</strong></p>
		<ul class="inst-list">
			<li>
				<span class="badge wall-badge">Glacier Wall</span> Stops you in
				the tile <em>before</em> it.
			</li>
			<li>
				<span class="badge sticky-badge">Snow Pad</span> Friction stops
				you <em>right on top</em> of it.
			</li>
			<li>
				<span class="badge pit-badge">Lava Pit</span> Hazard! Sliding into
				it sizzles and rewinds.
			</li>
			<li>
				<span class="badge bumper-badge">Crystal Bumper</span> 45° prism
				(<code>/</code> or <code>\</code>) that deflects you 90°.
			</li>
			<li>
				<span class="badge portal-badge">Frost Portal</span> Warps you to
				its twin while keeping your momentum.
			</li>
		</ul>
		<hr class="inst-sep" />
		<p class="inst-keys">
			<strong>Shortcuts:</strong> [Z] Undo · [H] Hint · [R] Restart · [N] Next
			· [M] Mute
		</p>
	</Instructions>

	<InGameMenu {onBack} onHelp={() => instructions.open()}>
		<div class="stats-center">
			<button
				class="level-pill"
				onclick={() => (showLevelSelect = !showLevelSelect)}
				title="Select Level or Mode"
			>
				{#if mode === "campaign"}
					<span class="pill-tag"
						>LVL {currentLevelIdx + 1}/{curatedLevels.length}</span
					>
					<span class="pill-name">{level.name}</span>
				{:else}
					<span class="pill-tag">{difficulty.toUpperCase()}</span>
					<span class="pill-name">Endless</span>
				{/if}
				<span class="pill-caret">▾</span>
			</button>

			<div class="stat">
				<span class="label">PAR</span>
				<span class="value">{parMoves || "-"}</span>
			</div>
			<div class="stat">
				<span class="label">MOVES</span>
				<span
					class="value"
					class:over-par={parMoves > 0 && moves > parMoves}
					>{moves}</span
				>
			</div>
		</div>

		{#snippet rightControls()}
			<div class="nav-actions">
				<button
					class="nav-extra-btn"
					onclick={undoMove}
					disabled={moveHistory.length === 0 ||
						isGameOver ||
						isMoving}
					title="Undo last move [Z]"
				>
					UNDO
				</button>
				<button
					class="nav-extra-btn"
					class:hint-active={hintDir !== null}
					onclick={requestHint}
					disabled={isGameOver || isMoving}
					title="Show optimal next move [H]"
				>
					HINT
				</button>
				<button
					class="nav-extra-btn"
					onclick={resetGame}
					title="Restart puzzle [R]"
				>
					RESTART
				</button>
				<button
					class="nav-extra-btn accent-btn"
					onclick={nextPuzzle}
					title="Next / New Puzzle [N]"
				>
					{mode === "campaign" &&
					currentLevelIdx < curatedLevels.length - 1
						? "NEXT"
						: "NEW"}
				</button>
				<button
					class="nav-extra-btn icon-btn"
					onclick={() => {
						soundMuted = !soundMuted;
						saveProgress();
					}}
					title={soundMuted ? "Unmute sounds [M]" : "Mute sounds [M]"}
					aria-label={soundMuted ? "Unmute sounds" : "Mute sounds"}
				>
					{soundMuted ? "🔇" : "🔊"}
				</button>
			</div>
		{/snippet}
	</InGameMenu>

	<div class="sub-banner">
		<span class="level-subtitle">{level.subtitle}</span>
		{#if toastMsg}
			<span class="status-pill warn" in:fade={{ duration: 150 }}
				>{toastMsg}</span
			>
		{:else if isDeadEnd && !isGameOver}
			<span class="status-pill warn" in:fade={{ duration: 150 }}
				>Dead end — Undo [Z] or Restart [R]</span
			>
		{/if}
	</div>

	<div class="board-wrapper">
		<div
			class="grid-container"
			role="application"
			aria-label="Ice Slider Puzzle Board"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
			<div
				class="grid"
				style="grid-template-columns: repeat({level.size}, 1fr); grid-template-rows: repeat({level.size}, 1fr);"
			>
				{#each level.grid as row, y}
					{#each row as cell, x}
						{@const isGoal =
							x === level.goal.x && y === level.goal.y}
						{@const isStart =
							x === level.start.x && y === level.start.y}
						{@const portalColor =
							level.portalColors.get(`${x},${y}`) ?? 0}
						<button
							type="button"
							class="cell"
							class:wall={cell === "wall"}
							class:sticky={cell === "sticky"}
							class:pit={cell === "pit"}
							class:bumper={cell === "bumper_slash" ||
								cell === "bumper_backslash"}
							class:portal={cell === "portal"}
							class:portal-alt={cell === "portal" &&
								portalColor % 2 === 1}
							class:goal={isGoal}
							class:start-mark={isStart && !isGoal}
							onclick={() => handleCellClick(x, y)}
							aria-label="Grid cell {x},{y}"
						>
							{#if isGoal}
								<div class="goal-icon">
									<svg
										viewBox="0 0 24 24"
										fill="currentColor"
										stroke="currentColor"
										stroke-width="1.5"
									>
										<path
											d="M12 2L14.9 8.6L22 9.3L16.6 14L18.2 21L12 17.3L5.8 21L7.4 14L2 9.3L9.1 8.6L12 2Z"
										/>
									</svg>
								</div>
							{:else if cell === "sticky"}
								<div class="sticky-icon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
									>
										<circle
											cx="12"
											cy="12"
											r="6"
											stroke-dasharray="3 2"
										/>
										<circle
											cx="12"
											cy="12"
											r="2.2"
											fill="currentColor"
										/>
									</svg>
								</div>
							{:else if cell === "pit"}
								<div class="pit-icon">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									>
										<path d="M5 9c2-2 4-2 6 0s4 2 6 0" />
										<path d="M6 15c2-2 4-2 6 0s4 2 6 0" />
									</svg>
								</div>
							{:else if cell === "bumper_slash"}
								<svg class="bumper-svg" viewBox="0 0 24 24">
									<line
										x1="4"
										y1="20"
										x2="20"
										y2="4"
										stroke="currentColor"
										stroke-width="4"
										stroke-linecap="round"
									/>
								</svg>
							{:else if cell === "bumper_backslash"}
								<svg class="bumper-svg" viewBox="0 0 24 24">
									<line
										x1="4"
										y1="4"
										x2="20"
										y2="20"
										stroke="currentColor"
										stroke-width="4"
										stroke-linecap="round"
									/>
								</svg>
							{:else if cell === "portal"}
								<div class="portal-ring"></div>
							{/if}
						</button>
					{/each}
				{/each}

				<svg
					class="path-overlay"
					viewBox="0 0 {level.size} {level.size}"
				>
					{#each moveSegments as seg}
						{#each segmentPolylines(seg) as pts}
							<polyline
								points={pts}
								fill="none"
								stroke="var(--ice-trail-stroke)"
								stroke-width="0.14"
								stroke-dasharray="0.18 0.14"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/each}
					{/each}

					{#if showOptimal && level.optimal.segments.length > 0}
						{#each level.optimal.segments as seg}
							{#each segmentPolylines(seg) as pts}
								<polyline
									points={pts}
									fill="none"
									stroke="var(--color-golden)"
									stroke-width="0.18"
									stroke-linecap="round"
									stroke-linejoin="round"
									opacity="0.9"
								/>
							{/each}
						{/each}
						{#each level.optimal.path.slice(1) as p, i}
							<circle
								cx={p.x + 0.5}
								cy={p.y + 0.5}
								r="0.22"
								fill="var(--color-golden)"
							/>
							<text
								x={p.x + 0.5}
								y={p.y + 0.52}
								text-anchor="middle"
								dominant-baseline="central"
								font-size="0.26"
								font-weight="900"
								fill="#1a140c"
							>
								{i + 1}
							</text>
						{/each}
					{/if}
				</svg>

				{#if hintDir && !isGameOver}
					<div
						class="hint-arrow"
						style="
							left: {((playerPos.x + hintDir.x * 0.85) / level.size) * 100}%;
							top: {((playerPos.y + hintDir.y * 0.85) / level.size) * 100}%;
							width: {100 / level.size}%;
							height: {100 / level.size}%;
							transform: rotate({hintDir.x === 1
							? 0
							: hintDir.x === -1
								? 180
								: hintDir.y === 1
									? 90
									: -90}deg);
						"
						in:fade={{ duration: 150 }}
					>
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M5 12h12m-5-5l5 5-5 5"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								fill="none"
							/>
						</svg>
					</div>
				{/if}

				<div
					class="player"
					class:splashing={isSplashing}
					style="
						left: {(renderPos.x / level.size) * 100}%;
						top: {(renderPos.y / level.size) * 100}%;
						width: {100 / level.size}%;
						height: {100 / level.size}%;
						transform: translate({bumpOffset.x * 100}%, {bumpOffset.y * 100}%);
					"
				>
					<div class="player-block">
						<div class="player-shine"></div>
					</div>
				</div>
			</div>

			{#if isGameOver}
				<div class="victory-overlay" in:fade={{ duration: 200 }}>
					<div
						class="victory-card"
						in:scale={{ start: 0.92, duration: 220 }}
					>
						<div
							class="stars-row"
							aria-label="{currentStars} out of 3 stars"
						>
							{#each [1, 2, 3] as s}
								<span
									class="star"
									class:earned={s <= currentStars}>★</span
								>
							{/each}
						</div>
						<h2>
							{currentStars === 3 ? "Optimal!" : "Puzzle Solved!"}
						</h2>
						<p class="victory-stats">
							Solved in <strong>{moves}</strong>
							{moves === 1 ? "move" : "moves"}
							{#if parMoves > 0}
								<span class="par-note">(Par {parMoves})</span>
							{/if}
						</p>
						<div class="victory-actions">
							<button class="action-btn" onclick={nextPuzzle}>
								{mode === "campaign" &&
								currentLevelIdx < curatedLevels.length - 1
									? "NEXT LEVEL"
									: "NEW PUZZLE"}
							</button>
							<button
								class="action-btn secondary"
								onclick={() => {
									showOptimal = !showOptimal;
								}}
							>
								{showOptimal ? "HIDE" : "SHOW"} OPTIMAL
							</button>
							<button
								class="action-btn secondary"
								onclick={resetGame}>RETRY</button
							>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="bottom-bar">
		<div class="dpad" aria-label="Directional Controls">
			<button
				class="dpad-btn"
				onclick={() => move(-1, 0)}
				aria-label="Slide Left">◀</button
			>
			<button
				class="dpad-btn"
				onclick={() => move(0, -1)}
				aria-label="Slide Up">▲</button
			>
			<button
				class="dpad-btn"
				onclick={() => move(0, 1)}
				aria-label="Slide Down">▼</button
			>
			<button
				class="dpad-btn"
				onclick={() => move(1, 0)}
				aria-label="Slide Right">▶</button
			>
		</div>
		{#if isGameOver && showOptimal}
			<button
				class="nav-extra-btn active"
				onclick={() => (showOptimal = false)}
			>
				HIDE OPTIMAL PATH
			</button>
		{/if}
	</div>

	{#if showLevelSelect}
		<div
			class="modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Level and Mode Selector"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) showLevelSelect = false;
			}}
			onkeydown={(e) => {
				if (e.key === "Escape") showLevelSelect = false;
			}}
			in:fade={{ duration: 150 }}
		>
			<div class="level-modal" in:scale={{ start: 0.94, duration: 180 }}>
				<div class="modal-header">
					<div>
						<h3>Select Puzzle</h3>
						<p class="modal-sub">
							Campaign Stars: {totalCampaignStars} / {curatedLevels.length *
								3} ★
						</p>
					</div>
					<button
						class="close-btn"
						onclick={() => (showLevelSelect = false)}
						aria-label="Close">✕</button
					>
				</div>

				<div class="section-label">CAMPAIGN LEVELS</div>
				<div class="levels-grid">
					{#each curatedLevels as lvl, i}
						{@const earned = starsByLevel[lvl.id] ?? 0}
						<button
							class="lvl-card"
							class:active={mode === "campaign" &&
								currentLevelIdx === i}
							onclick={() => selectCampaignLevel(i)}
						>
							<div class="lvl-top">
								<span class="lvl-num">#{i + 1}</span>
								<span class="lvl-stars">
									{#each [1, 2, 3] as s}
										<span class:lit={s <= earned}>★</span>
									{/each}
								</span>
							</div>
							<div class="lvl-title">{lvl.name}</div>
							<div class="lvl-meta">
								{lvl.size}×{lvl.size} · Par {lvl.optimal.dirs
									.length}
							</div>
						</button>
					{/each}
				</div>

				<div class="section-label">ENDLESS PROCEDURAL</div>
				<div class="random-row">
					<button
						class="rand-btn"
						class:active={mode === "random" &&
							difficulty === "chill"}
						onclick={() => startRandomMode("chill")}
					>
						<strong>Chill</strong>
						<span>9×9 · Walls &amp; Snow</span>
					</button>
					<button
						class="rand-btn"
						class:active={mode === "random" &&
							difficulty === "classic"}
						onclick={() => startRandomMode("classic")}
					>
						<strong>Classic</strong>
						<span>12×12 · + Lava &amp; Bumpers</span>
					</button>
					<button
						class="rand-btn"
						class:active={mode === "random" &&
							difficulty === "master"}
						onclick={() => startRandomMode("master")}
					>
						<strong>Master</strong>
						<span>15×15 · All Mechanics</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--app-text);
		position: relative;
		--ice-board-bg: linear-gradient(
			145deg,
			rgba(165, 216, 248, 0.08),
			rgba(75, 106, 190, 0.05)
		);
		--ice-board-border: rgba(165, 216, 248, 0.22);
		--ice-board-shadow: rgba(0, 0, 0, 0.55);
		--ice-cell-border: rgba(165, 216, 248, 0.07);
		--ice-wall-bg: linear-gradient(145deg, #5d7fd6, #3b559e);
		--ice-wall-border: rgba(255, 255, 255, 0.22);
		--ice-sticky-bg: rgba(165, 216, 248, 0.14);
		--ice-sticky-border: rgba(165, 216, 248, 0.35);
		--ice-sticky-color: #a5d8f8;
		--ice-pit-bg: radial-gradient(
			circle at center,
			#fbbf24 0%,
			#ea580c 48%,
			#7c1d13 100%
		);
		--ice-pit-border: rgba(251, 146, 60, 0.7);
		--ice-bumper-color: #5eead4;
		--ice-trail-stroke: rgba(255, 255, 255, 0.42);
		--ice-secondary-bg: rgba(255, 255, 255, 0.06);
		--ice-secondary-border: rgba(255, 255, 255, 0.14);
		--ice-secondary-text: rgba(255, 255, 255, 0.8);
		--ice-secondary-hover-bg: rgba(255, 255, 255, 0.12);
		--ice-secondary-hover-border: rgba(255, 255, 255, 0.4);
		--ice-secondary-hover-text: #ffffff;
		--ice-stat-value: #a5d8f8;
		--ice-modal-bg: #12151e;
	}

	:global(html[data-theme="light"]) .game-inner {
		--ice-board-bg: linear-gradient(
			145deg,
			rgba(225, 241, 252, 0.92),
			rgba(247, 241, 230, 0.95)
		);
		--ice-board-border: rgba(75, 106, 190, 0.28);
		--ice-board-shadow: rgba(65, 82, 110, 0.18);
		--ice-cell-border: rgba(75, 106, 190, 0.11);
		--ice-wall-bg: linear-gradient(145deg, #4b6abe, #344e94);
		--ice-wall-border: rgba(255, 255, 255, 0.35);
		--ice-sticky-bg: rgba(75, 106, 190, 0.14);
		--ice-sticky-border: rgba(75, 106, 190, 0.38);
		--ice-sticky-color: #344e94;
		--ice-pit-bg: radial-gradient(
			circle at center,
			#f59e0b 0%,
			#dc2626 55%,
			#7f1d1d 100%
		);
		--ice-pit-border: rgba(234, 88, 12, 0.65);
		--ice-bumper-color: #0d9488;
		--ice-trail-stroke: rgba(75, 106, 190, 0.45);
		--ice-secondary-bg: rgba(255, 248, 237, 0.88);
		--ice-secondary-border: rgba(120, 94, 62, 0.26);
		--ice-secondary-text: rgba(47, 37, 28, 0.82);
		--ice-secondary-hover-bg: rgba(255, 241, 218, 0.96);
		--ice-secondary-hover-border: rgba(120, 94, 62, 0.42);
		--ice-secondary-hover-text: #2f251c;
		--ice-stat-value: #3b5998;
		--ice-modal-bg: #fbf6ec;
	}

	.game-inner :global(.nav-row) {
		padding: clamp(0.6rem, 1.6vmin, 1.4rem) clamp(0.75rem, 2vmin, 1.8rem);
		gap: clamp(0.35rem, 1vmin, 0.75rem);
	}

	.game-inner :global(.back-btn),
	.game-inner :global(.help-btn),
	.game-inner :global(.restart-btn) {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
		padding: clamp(0.38rem, 0.85vmin, 0.65rem) clamp(0.55rem, 1.2vmin, 1rem);
		font-size: clamp(0.68rem, 1.15vmin, 0.9rem);
	}

	.game-inner :global(.back-btn:hover),
	.game-inner :global(.help-btn:hover),
	.game-inner :global(.restart-btn:hover) {
		background: var(--ice-secondary-hover-bg);
		border-color: var(--ice-secondary-hover-border);
		color: var(--ice-secondary-hover-text);
	}

	.stats-center {
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 2vmin, 1.8rem);
		min-width: 0;
	}

	.level-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--app-text);
		padding: 0.42rem 0.8rem;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 700;
		font-size: clamp(0.72rem, 1.2vmin, 0.92rem);
		transition: all 0.18s;
		white-space: nowrap;
	}

	.level-pill:hover {
		background: var(--ice-secondary-hover-bg);
		border-color: var(--ice-stat-value);
	}

	.pill-tag {
		color: var(--ice-stat-value);
		font-weight: 900;
		font-size: 0.85em;
		letter-spacing: 0.04em;
	}

	.pill-caret {
		opacity: 0.6;
		font-size: 0.8em;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.1;
	}

	.stat .label {
		font-size: clamp(0.58rem, 0.95vmin, 0.72rem);
		color: var(--app-muted-text);
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.stat .value {
		font-size: clamp(1rem, 2.4vmin, 1.55rem);
		font-weight: 900;
		color: var(--ice-stat-value);
	}

	.stat .value.over-par {
		color: var(--color-golden);
	}

	.nav-actions {
		display: flex;
		gap: 0.55rem;
		align-items: center;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.nav-extra-btn {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
		padding: clamp(0.38rem, 0.8vmin, 0.6rem) clamp(0.55rem, 1.1vmin, 0.9rem);
		border-radius: 0.55rem;
		cursor: pointer;
		font-weight: 800;
		font-size: clamp(0.66rem, 1.1vmin, 0.84rem);
		transition: all 0.18s;
	}

	.nav-extra-btn:hover:not(:disabled) {
		background: var(--ice-secondary-hover-bg);
		color: var(--ice-secondary-hover-text);
		border-color: var(--app-text);
	}

	.nav-extra-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.nav-extra-btn.accent-btn {
		background: var(--color-indigo);
		border-color: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	.nav-extra-btn.accent-btn:hover:not(:disabled) {
		filter: brightness(1.15);
		color: #ffffff;
	}

	.nav-extra-btn.hint-active,
	.nav-extra-btn.active {
		background: var(--color-golden);
		color: #1c160c;
		border-color: var(--color-golden);
	}

	.sub-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 1.5rem;
		padding: 0 1rem;
		flex-shrink: 0;
	}

	.level-subtitle {
		font-size: clamp(0.75rem, 1.3vmin, 0.92rem);
		color: var(--app-muted-text);
		font-weight: 600;
	}

	.status-pill {
		font-size: 0.76rem;
		font-weight: 800;
		padding: 0.18rem 0.65rem;
		border-radius: 999px;
	}

	.status-pill.warn {
		background: rgba(255, 110, 97, 0.18);
		border: 1px solid rgba(255, 110, 97, 0.45);
		color: var(--color-bittersweet);
	}

	.board-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0.6rem 1rem;
		min-height: 0;
		overflow: hidden;
	}

	.grid-container {
		width: min(60vmin, calc(100vw - 2.5rem), calc(100dvh - 15rem));
		height: min(60vmin, calc(100vw - 2.5rem), calc(100dvh - 15rem));
		max-width: 100%;
		max-height: 100%;
		background: var(--ice-board-bg);
		border: 2px solid var(--ice-board-border);
		border-radius: 1.1rem;
		position: relative;
		overflow: hidden;
		box-shadow: 0 18px 45px var(--ice-board-shadow);
		touch-action: none;
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.cell {
		appearance: none;
		background: transparent;
		padding: 0;
		margin: 0;
		border: 1px solid var(--ice-cell-border);
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		cursor: pointer;
		color: inherit;
	}

	.cell:hover:not(.wall) {
		background: rgba(165, 216, 248, 0.06);
	}

	.cell.wall {
		background: var(--ice-wall-bg);
		border: 1px solid var(--ice-wall-border);
		box-shadow:
			inset 0 2px 4px rgba(255, 255, 255, 0.25),
			inset 0 -3px 6px rgba(0, 0, 0, 0.35);
		border-radius: 0.28rem;
		margin: 2px;
		cursor: default;
	}

	.cell.sticky {
		background: var(--ice-sticky-bg);
		border: 1px dashed var(--ice-sticky-border);
	}

	.sticky-icon {
		width: 62%;
		height: 62%;
		color: var(--ice-sticky-color);
		display: flex;
	}

	.cell.pit {
		background: var(--ice-pit-bg);
		border: 1px solid var(--ice-pit-border);
		border-radius: 0.35rem;
		margin: 2px;
		box-shadow:
			inset 0 0 10px rgba(251, 146, 60, 0.45),
			0 0 8px rgba(234, 88, 12, 0.25);
	}

	.pit-icon {
		width: 66%;
		height: 66%;
		color: #fef08a;
		opacity: 0.9;
		display: flex;
	}

	.cell.bumper {
		color: var(--ice-bumper-color);
	}

	.bumper-svg {
		width: 78%;
		height: 78%;
		filter: drop-shadow(0 0 6px currentColor);
	}

	.cell.portal {
		color: #c084fc;
	}

	.cell.portal-alt {
		color: #34d399;
	}

	.portal-ring {
		width: 64%;
		height: 64%;
		border-radius: 50%;
		border: 3px solid currentColor;
		box-shadow:
			0 0 10px currentColor,
			inset 0 0 8px currentColor;
		animation: spinPulse 2.4s linear infinite;
	}

	@keyframes spinPulse {
		0%,
		100% {
			transform: scale(0.92);
			opacity: 0.85;
		}
		50% {
			transform: scale(1.06);
			opacity: 1;
		}
	}

	.cell.start-mark::after {
		content: "";
		width: 24%;
		height: 24%;
		border-radius: 50%;
		background: var(--app-muted-text);
		opacity: 0.35;
	}

	.cell.goal {
		background: radial-gradient(
			circle,
			rgba(255, 203, 92, 0.24) 0%,
			transparent 72%
		);
	}

	.goal-icon {
		width: 68%;
		height: 68%;
		color: var(--color-golden);
		filter: drop-shadow(0 0 8px rgba(255, 203, 92, 0.75));
		animation: pulse 2s infinite ease-in-out;
		display: flex;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(0.95);
			opacity: 0.88;
		}
		50% {
			transform: scale(1.12);
			opacity: 1;
		}
	}

	.path-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.hint-arrow {
		position: absolute;
		z-index: 9;
		pointer-events: none;
		color: var(--color-golden);
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 0 8px rgba(255, 203, 92, 0.9));
		animation: hintPulse 0.9s infinite ease-in-out;
	}

	.hint-arrow svg {
		width: 72%;
		height: 72%;
	}

	@keyframes hintPulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	.player {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		pointer-events: none;
		box-sizing: border-box;
		transition: transform 0.1s ease-out;
	}

	.player.splashing {
		animation: splashShake 0.32s ease-in-out;
	}

	@keyframes splashShake {
		0%,
		100% {
			transform: scale(1);
		}
		30% {
			transform: scale(0.75) rotate(-10deg);
			opacity: 0.6;
		}
		60% {
			transform: scale(0.85) rotate(10deg);
			opacity: 0.4;
		}
	}

	.player-block {
		width: 78%;
		height: 78%;
		background: linear-gradient(135deg, #ff857a 0%, #ff5a4c 100%);
		border-radius: 22%;
		box-shadow:
			0 4px 16px rgba(255, 110, 97, 0.55),
			inset 0 -3px 6px rgba(0, 0, 0, 0.22);
		border: 2px solid rgba(255, 255, 255, 0.9);
		position: relative;
		overflow: hidden;
	}

	.player-shine {
		position: absolute;
		top: 12%;
		left: 14%;
		width: 38%;
		height: 24%;
		background: rgba(255, 255, 255, 0.45);
		border-radius: 999px;
		transform: rotate(-20deg);
	}

	.victory-overlay {
		position: absolute;
		inset: 0;
		background: rgba(9, 12, 20, 0.68);
		backdrop-filter: blur(6px);
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.victory-card {
		background: var(--ice-modal-bg);
		border: 1px solid var(--ice-board-border);
		border-radius: 1.1rem;
		padding: 1.4rem 1.8rem;
		text-align: center;
		max-width: 90%;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
	}

	.stars-row {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		font-size: 2rem;
		margin-bottom: 0.35rem;
	}

	.star {
		color: rgba(255, 255, 255, 0.16);
	}

	:global(html[data-theme="light"]) .star {
		color: rgba(47, 37, 28, 0.18);
	}

	.star.earned {
		color: var(--color-golden);
		text-shadow: 0 0 14px rgba(255, 203, 92, 0.6);
	}

	.victory-card h2 {
		margin: 0 0 0.25rem;
		font-size: 1.4rem;
		font-weight: 900;
	}

	.victory-stats {
		margin: 0 0 1rem;
		color: var(--app-muted-text);
		font-size: 0.95rem;
	}

	.par-note {
		opacity: 0.8;
	}

	.victory-actions {
		display: flex;
		gap: 0.55rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.action-btn {
		background: var(--color-bittersweet);
		color: #ffffff;
		border: none;
		padding: 0.65rem 1.2rem;
		border-radius: 0.55rem;
		font-size: 0.85rem;
		font-weight: 900;
		cursor: pointer;
		transition: all 0.18s;
	}

	.action-btn:hover {
		filter: brightness(1.12);
		transform: translateY(-1px);
	}

	.action-btn.secondary {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
	}

	.action-btn.secondary:hover {
		background: var(--ice-secondary-hover-bg);
		color: var(--ice-secondary-hover-text);
	}

	.bottom-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 0.4rem 1rem 0.9rem;
		flex-shrink: 0;
	}

	.dpad {
		display: flex;
		gap: 0.45rem;
	}

	.dpad-btn {
		width: 2.6rem;
		height: 2.3rem;
		border-radius: 0.55rem;
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--ice-secondary-text);
		font-size: 0.95rem;
		font-weight: 800;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.dpad-btn:hover {
		background: var(--ice-secondary-hover-bg);
		color: var(--ice-secondary-hover-text);
		border-color: var(--ice-stat-value);
	}

	.dpad-btn:active {
		transform: scale(0.94);
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(5px);
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.level-modal {
		background: var(--ice-modal-bg);
		border: 1px solid var(--ice-board-border);
		border-radius: 1.1rem;
		padding: 1.25rem 1.4rem;
		width: min(640px, 100%);
		max-height: 85vh;
		overflow-y: auto;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 900;
	}

	.modal-sub {
		margin: 0.15rem 0 0;
		font-size: 0.82rem;
		color: var(--color-golden);
		font-weight: 700;
	}

	.close-btn {
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--app-text);
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 800;
	}

	.section-label {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: var(--app-muted-text);
		margin: 0.75rem 0 0.5rem;
	}

	.levels-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
		gap: 0.55rem;
	}

	.lvl-card {
		text-align: left;
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--app-text);
		padding: 0.65rem 0.75rem;
		border-radius: 0.65rem;
		cursor: pointer;
		transition: all 0.16s;
	}

	.lvl-card:hover {
		border-color: var(--ice-stat-value);
		transform: translateY(-1px);
	}

	.lvl-card.active {
		border-color: var(--color-bittersweet);
		background: rgba(255, 110, 97, 0.12);
	}

	.lvl-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.lvl-num {
		font-weight: 900;
		color: var(--ice-stat-value);
	}

	.lvl-stars {
		color: rgba(150, 150, 150, 0.35);
		font-size: 0.8rem;
	}

	.lvl-stars .lit {
		color: var(--color-golden);
	}

	.lvl-title {
		font-weight: 800;
		font-size: 0.86rem;
		margin-bottom: 0.15rem;
	}

	.lvl-meta {
		font-size: 0.7rem;
		color: var(--app-muted-text);
	}

	.random-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.55rem;
	}

	.rand-btn {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: left;
		background: var(--ice-secondary-bg);
		border: 1px solid var(--ice-secondary-border);
		color: var(--app-text);
		padding: 0.7rem 0.8rem;
		border-radius: 0.65rem;
		cursor: pointer;
		transition: all 0.16s;
	}

	.rand-btn:hover {
		border-color: var(--ice-stat-value);
	}

	.rand-btn.active {
		border-color: var(--color-bittersweet);
		background: rgba(255, 110, 97, 0.12);
	}

	.rand-btn strong {
		font-size: 0.9rem;
	}

	.rand-btn span {
		font-size: 0.72rem;
		color: var(--app-muted-text);
	}

	/* Instructions styling */
	.inst-sep {
		opacity: 0.12;
		margin: 0.85rem 0;
	}

	.inst-list {
		list-style: none;
		padding: 0;
		margin: 0.4rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		font-size: 0.88em;
	}

	.badge {
		display: inline-block;
		padding: 0.12rem 0.45rem;
		border-radius: 0.3rem;
		font-weight: 800;
		font-size: 0.85em;
		margin-right: 0.35rem;
	}

	.wall-badge {
		background: #4b6abe;
		color: #fff;
	}

	.sticky-badge {
		background: rgba(165, 216, 248, 0.22);
		color: #a5d8f8;
		border: 1px dashed rgba(165, 216, 248, 0.5);
	}

	.pit-badge {
		background: #7c1d13;
		color: #fdba74;
	}

	.bumper-badge {
		background: rgba(94, 234, 212, 0.18);
		color: #5eead4;
	}

	.portal-badge {
		background: rgba(192, 132, 252, 0.2);
		color: #c084fc;
	}

	.inst-keys {
		font-size: 0.85em;
		opacity: 0.75;
	}

	@media (max-width: 900px) {
		.stats-center {
			gap: 0.55rem;
			flex-wrap: wrap;
			justify-content: center;
		}

		.pill-name {
			display: none;
		}

		.grid-container {
			width: min(86vmin, calc(100vw - 1.5rem), calc(100dvh - 17.5rem));
			height: min(86vmin, calc(100vw - 1.5rem), calc(100dvh - 17.5rem));
		}

		.random-row {
			grid-template-columns: 1fr;
		}
	}
</style>
