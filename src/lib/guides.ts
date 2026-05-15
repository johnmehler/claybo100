export const gameGuides: Record<string, string> = {
	'sliding-tiles': `<h2>The Sliding Tiles Puzzle: History, Rules &amp; Strategy</h2>
<p>The sliding tiles puzzle, also known as the 15-puzzle, was invented by Noyes Palmer Chapman in 1874 and became one of the world's first viral crazes. Sam Loyd famously offered a cash prize for solving an "impossible" configuration, which mathematicians later proved was indeed unsolvable — launching the field of permutation group theory.</p>
<h3>How to Play</h3>
<p>You are given a 4×4 grid with 15 numbered tiles and one empty space. Slide tiles into the empty space to arrange them in numerical order from left to right, top to bottom. Only tiles adjacent to the empty space can move.</p>
<h3>Strategy Tips</h3>
<p>Solve the top row first, then the left column, then reduce the remaining puzzle to a 3×3, then a 2×2. When placing the last two tiles of a row or column, use the classic "corner rotation" — set them up perpendicular and rotate them into place. Never try to brute-force the bottom rows tile by tile; you'll lock yourself out.</p>
<h3>Variations</h3>
<p>The 8-puzzle is the 3×3 version, common in AI coursework. The 24-puzzle uses a 5×5 grid. Half of all random starting positions are unsolvable — a fact Sam Loyd exploited in his famous 1880 prize challenge.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. It runs entirely in your browser, has no ads, no chat, no logins, and no tracking pixels. It works on Chromebooks and phones, so it's safe for classroom use and short study breaks.</p>
`,

	'pegboard': `<h2>Peg Solitaire: History, Rules &amp; Strategy</h2>
<p>Peg solitaire dates back to the court of Louis XIV in 17th-century France. An engraving from 1697 depicts a noblewoman playing the game. The English board variant, with its cross-shaped layout of 33 holes, became the standard form studied by mathematicians including Leibniz, who analyzed it as a combinatorial puzzle.</p>
<h3>How to Play</h3>
<p>The board starts with pegs filling every hole except the center. A peg jumps over an adjacent peg (horizontally or vertically) into an empty hole, removing the jumped peg. The goal is to leave exactly one peg remaining, ideally in the center hole.</p>
<h3>Strategy Tips</h3>
<p>Think in <em>packages</em> of 3 — a triplet of pegs that can be cleared in two moves with a single survivor. Plan from the endgame backwards: where do you want the last peg to land, and what setup leaves a single peg with one remaining jump? Avoid creating isolated pegs early; once a peg has no neighbors, it can never be removed.</p>
<h3>Variations</h3>
<p>The European board uses 37 holes instead of 33, which (surprisingly) makes the central-finish version unsolvable. The triangular 15-hole board is popular in American diners and is solvable from any starting hole. "Reverse solitaire" requires the last peg to land in a specific target hole.</p>
<h3>Is this game school-safe?</h3>
<p>Yes — no ads, no chat, no account required. It loads instantly in any browser and works on Chromebooks, tablets, and phones, making it a quiet, screen-friendly classroom activity.</p>
`,

	'hanoi': `<h2>Tower of Hanoi: History, Rules &amp; Strategy</h2>
<p>The Tower of Hanoi was invented by French mathematician Édouard Lucas in 1883. He marketed it with a legend about monks moving 64 golden discs between diamond needles — a task that would take 2⁶⁴−1 moves, or roughly 585 billion years. The puzzle is fundamental in computer science as a textbook example of recursion and has applications in backup rotation schemes and neurological testing.</p>
<h3>How to Play</h3>
<p>Move a stack of discs from the leftmost peg to the rightmost peg. Only one disc may be moved at a time, and a larger disc may never be placed on top of a smaller disc.</p>
<h3>Strategy Tips</h3>
<p>The optimal strategy is recursive: to move <em>n</em> discs from A to C, first move <em>n−1</em> discs from A to B, move the largest disc from A to C, then move the <em>n−1</em> stack from B to C. There's also a one-line iterative rule: on odd moves, move the smallest disc one peg clockwise; on even moves, make the only other legal move.</p>
<h3>Variations</h3>
<p>The Frame–Stewart algorithm handles 4+ pegs ("Reve's Puzzle"). "Bicolor Hanoi" alternates disc colors on each peg. "Cyclic Hanoi" allows moves only in one rotational direction. The minimum move count for <em>n</em> discs on 3 pegs is always 2ⁿ−1.</p>
<h3>Is this game school-safe?</h3>
<p>Yes — ad-free, login-free, and runs in any browser. It's commonly used in CS classrooms to introduce recursion, and on this site it works on phones and Chromebooks with no installation.</p>
`,

	'knights-tour': `<h2>The Knight's Tour: History, Rules &amp; Strategy</h2>
<p>The Knight's Tour problem dates back over a thousand years, with solutions found in Arabic manuscripts from the 9th century. Leonhard Euler published a famous analysis in 1759. The problem asks whether a chess knight can visit every square on the board exactly once — a question that connects chess, graph theory, and Hamiltonian path problems in combinatorics.</p>
<h3>How to Play</h3>
<p>Click any square to place your knight. Then move in the standard chess L-shape: two squares in one direction plus one square perpendicular. Visit all 64 squares without revisiting any square.</p>
<h3>Strategy Tips</h3>
<p>Use <strong>Warnsdorff's rule</strong>: at every step, move to the square that has the fewest onward moves available. This heuristic finds a tour from almost any starting square. Corners are the most dangerous — they have only two access squares — so handle them early or schedule them carefully.</p>
<h3>Variations</h3>
<p>A <em>closed</em> tour returns the knight to its starting square (forming a Hamiltonian cycle); an <em>open</em> tour does not. Closed tours exist on the 8×8 board but not on every board size. Magic knight's tours number the squares 1–64 in visit order such that rows and columns sum to a magic constant.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no signups, no chat, no tracking. Loads instantly in any browser and is a great example of graph theory and Hamiltonian paths for classroom use.</p>
`,

	'set': `<h2>The Set Card Game: History, Rules &amp; Strategy</h2>
<p>Set was invented by population geneticist Marsha Falco in 1974 while studying epilepsy in German Shepherds. She was representing gene combinations with symbols on cards and noticed the pattern-matching game hidden in her data. Published in 1991, Set became a beloved mathematical game. It connects to finite geometry — the cards represent points in a four-dimensional space over the field with three elements.</p>
<h3>How to Play</h3>
<p>Each card has four attributes (shape, color, count, fill), each with three possible values. Find three cards where, for every attribute, the three cards are either all the same or all different. Twelve cards are dealt; if no set exists, three more are added.</p>
<h3>Strategy Tips</h3>
<p>Pick any two cards: there is <em>exactly one</em> third card in the entire 81-card deck that completes a set with them. So a useful drill is to mentally compute that third card from any pair, then scan the table for it. Train yourself to scan by one attribute at a time (e.g., all the reds, then all the doubles).</p>
<h3>Variations</h3>
<p>"No-set" hands are possible — the maximum cap set on 12 cards is well-studied in combinatorics; on the full 81-card deck the largest set-free collection has 20 cards (a result extended to higher dimensions in the 2016 cap-set problem breakthrough by Croot, Lev, Pach, Ellenberg, and Gijswijt). Speed Set, Team Set, and Set Memory are common house-rule variants.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. The SET card game online here has no ads, no chat, and no logins. It's a teacher-favorite because it builds pattern recognition and finite-field intuition — and it works on phones, tablets, and Chromebooks.</p>
`,

	'dotsandboxes': `<h2>Dots and Boxes: History, Rules &amp; Strategy</h2>
<p>Dots and Boxes was first published by Édouard Lucas (also the creator of the Tower of Hanoi) in 1889. Despite its simple rules, the game has surprisingly deep strategy studied by combinatorial game theorists. Elwyn Berlekamp's 2000 book "The Dots and Boxes Game" revealed that optimal play requires sophisticated chain-counting techniques.</p>
<h3>How to Play</h3>
<p>Players take turns drawing a line between two adjacent dots. When a player completes the fourth side of a box, they claim it and take another turn. The player with the most boxes at the end wins.</p>
<h3>Strategy Tips</h3>
<p>Avoid drawing the third side of any box — that hands your opponent a free capture and another turn. Master the <strong>double-cross</strong>: when forced to open a long chain, sacrifice the last two boxes of it so your opponent has to open the next chain for you. The <em>chain rule</em> says the player who makes the number of (long chains + dots-per-side) a controlled parity tends to win.</p>
<h3>Variations</h3>
<p>"Swedish" or Nimstring is a related impartial game where boxes don't score but completing one still gives another turn. "Dots and Triangles" uses a triangular grid. Larger 7×7 and 9×9 boards reward chain control over short-term greed.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no signups, no chat — just you vs the AI. Works on phones and Chromebooks, making it a clean alternative to ad-heavy "unblocked games" sites.</p>
`,

	'iceslider': `<h2>Ice Slider Puzzle: History, Rules &amp; Strategy</h2>
<p>Ice slider puzzles originated in the Sokoban puzzle tradition from Japan (1981) and gained mainstream popularity through the Pokémon game series, where icy floor puzzles became a beloved dungeon mechanic. The core concept — objects sliding until hitting a wall — creates elegant puzzles from simple physics, making it a favorite in puzzle game design and AI pathfinding research.</p>
<h3>How to Play</h3>
<p>You control a block on a frictionless ice surface. When you slide in a direction, the block moves continuously until it hits a wall or obstacle. Navigate from the start position to the goal using the minimum number of moves.</p>
<h3>Strategy Tips</h3>
<p>Walls and obstacles are the only things that can stop you, so every solution is a sequence of bounces. Plan backwards from the goal: what wall could stop you on the goal square? What's the previous bounce that gets you there? In dense puzzles, blocks you've already placed often become your most useful stopping surfaces.</p>
<h3>Variations</h3>
<p>Pokémon's HeartGold/SoulSilver ice gym, Adventures of Lolo, and Baba Is You all use slide-until-wall mechanics. Some variants add holes, conveyors, or breakable ice that disappears after a single use.</p>
<h3>Is this game school-safe?</h3>
<p>Yes — ad-free, login-free, mobile friendly, and runs in any browser. Good for short brain breaks or as a logic-and-pathfinding warm-up.</p>
`,

	'nim': `<h2>Nim: History, Rules &amp; Strategy</h2>
<p>Nim is one of the oldest known strategy games, with origins traced to ancient China. The complete mathematical theory was published by Charles Bouton at Harvard in 1901, making it one of the first games solved by mathematical analysis. Nim is foundational to combinatorial game theory — the Sprague-Grundy theorem shows that every impartial game is equivalent to a Nim position.</p>
<h3>How to Play</h3>
<p>Objects are arranged in rows. Players take turns removing any number of objects from a single row. The player who takes the last object wins (normal play convention).</p>
<h3>Strategy Tips</h3>
<p>The optimal strategy uses <strong>XOR (nim-sum)</strong>: compute the bitwise XOR of all row sizes. If the result is zero, you're in a losing position with perfect play. If nonzero, there is always a move that makes the XOR zero — find it and force your opponent into the losing position. This single rule "solves" Nim.</p>
<h3>Variations</h3>
<p>Misère Nim reverses the goal: whoever takes the last object loses. Wythoff's game restricts moves to one row or equal-amount removal from two rows. "Multi-pile" Nim with bounded takes underlies Sprague–Grundy theory for all impartial games.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no chat, no accounts. Nim is a staple of math-club curricula and pairs naturally with a lesson on binary representation.</p>
`,

	'hex': `<h2>Hex: History, Rules &amp; Strategy</h2>
<p>Hex was independently invented by Danish mathematician Piet Hein in 1942 and by John Nash (of "A Beautiful Mind" fame) in 1948 at Princeton. Nash proved that the first player always has a winning strategy, using an elegant "strategy-stealing" argument — but the proof is non-constructive, meaning it doesn't tell you what the strategy actually is. This makes Hex endlessly fascinating: we know perfect play exists, but on large boards, nobody knows what it looks like.</p>
<h3>How to Play</h3>
<p>Two players alternate placing stones on a rhombus-shaped hexagonal grid. One player connects the top edge to the bottom; the other connects left to right. The first player to complete a connected path between their two edges wins. Draws are impossible.</p>
<h3>Strategy Tips</h3>
<p>Learn the <strong>two-bridge</strong>: two of your stones placed at a knight-like offset with two empty cells between them are virtually connected — if your opponent plays one of the empty cells, you take the other. Strong play threads two-bridges across the board. Always check whether your opponent is one move from a connected chain before extending your own.</p>
<h3>Variations</h3>
<p>The swap rule mitigates first-player advantage: player two may either accept the first move or swap colors. Y, Havannah, and TwixT are related connection games. On boards above 9×9, perfect play is unknown despite Nash's existence proof.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no signups, no chat. Excellent classroom material for introducing topology, connectivity, and non-constructive proofs.</p>
`,

	'krypto': `<h2>Krypto: History, Rules &amp; Strategy</h2>
<p>Krypto was created by Daniel Yovich in 1963 and has been a staple of math classrooms and competitions ever since. The National Council of Teachers of Mathematics endorses it for developing number sense and mental arithmetic fluency. Krypto tournaments are held at math competitions nationwide, where students race to find solutions in seconds.</p>
<h3>How to Play</h3>
<p>Five number cards are dealt, plus one target number. Using all five numbers exactly once and any combination of addition, subtraction, multiplication, and division, create an expression that equals the target. Order of operations applies.</p>
<h3>Strategy Tips</h3>
<p>Estimate first — find two numbers whose product or sum is near the target, then use the remaining three to make a small correction. Division is often the hardest operation to set up, so look for it only when two of your numbers share a clear factor. Keep an eye out for "neutral" combinations like <em>a − a</em> = 0 or <em>a / a</em> = 1 — they let you absorb unwanted cards.</p>
<h3>Variations</h3>
<p>"Primary Krypto" uses smaller numbers for younger players. "24 Game" is a 4-card cousin with a fixed target of 24. "Countdown" (UK TV) uses six numbers and any target between 100 and 999.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. The Krypto math game online here has no ads, no logins, no chat — it's a teacher-approved mental-arithmetic drill and works on Chromebooks and phones.</p>
`,

	'shotsim': `<h2>ShotSim - Projectile Physics: History, Rules &amp; Strategy</h2>
<p>Projectile motion was first accurately described by Galileo Galilei in 1638, who demonstrated that the path of a projectile forms a parabola. This insight revolutionized both physics and military science. The mathematics of ballistic trajectories — involving trigonometry, quadratic equations, and Newton's laws — remains fundamental to physics education and is used in everything from sports science to space exploration.</p>
<h3>How to Play</h3>
<p>Adjust the cannon's angle and power to launch a projectile at a target hoop. Gravity pulls the projectile downward while its initial velocity carries it forward, creating the characteristic parabolic arc. Hit the target to score.</p>
<h3>Strategy Tips</h3>
<p>For a flat shot, 45° maximizes range. For targets above the cannon, aim slightly higher; for targets below, aim slightly lower. If you overshoot, reduce power before changing angle — power scales the parabola while angle only rotates it. Two distinct angles will hit the same horizontal target: a "low" and a "high" shot.</p>
<h3>Variations</h3>
<p>Classic Scorched Earth, Worms, and Angry Birds all run on the same projectile-motion math. Real-world artillery and basketball free throws are governed by the same equations, with adjustments for drag and spin.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no chat, no logins. It's a great hands-on companion to a kinematics or trigonometry lesson and runs on any school device.</p>
`,

	'vectorracing': `<h2>Vector Racing: History, Rules &amp; Strategy</h2>
<p>Vector racing (also called Racetrack or Paper Racing) originated as a pencil-and-paper game in the 1960s and was popularized by Martin Gardner in his Scientific American column. The game brilliantly illustrates concepts from physics — velocity, acceleration, and momentum — in an accessible grid-based format. It's used in computer science courses to teach pathfinding algorithms and state-space search.</p>
<h3>How to Play</h3>
<p>Your car moves on a grid track. Each turn, you can adjust your horizontal and vertical velocity by at most ±1. Your new position is your current position plus your velocity. Stay on the track — hitting a wall means a crash. Complete the circuit in as few moves as possible.</p>
<h3>Strategy Tips</h3>
<p>The single most important skill is <em>braking before the corner</em>. Start decelerating well before the apex so your final velocity into the turn is small enough that you can still adjust ±1 and survive the wall. On straights, accelerate aggressively — you can always shed speed later, but only at a rate of 1 unit per turn. Look two moves ahead, not one.</p>
<h3>Variations</h3>
<p>The original pencil-and-paper version is played on graph paper. Some variants allow ±2 acceleration, multi-car racing with collisions, or fuel limits. The game is a fixture of AI courses as a small but rich state-space search problem.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no chat, no signups. Vector Racing teaches velocity, acceleration, and momentum without crashing real cars, and it runs in any browser including on Chromebooks.</p>
`,

	'tracksofgalileo': `<h2>Tracks of Galileo: History, Rules &amp; Strategy</h2>
<p>This puzzle is inspired by the famous brachistochrone problem, posed by Johann Bernoulli in 1696 as a challenge to the world's mathematicians. Newton, Leibniz, and Jakob Bernoulli all submitted solutions. The answer — a cycloid curve — was a landmark discovery connecting calculus, physics, and differential geometry. Galileo himself had studied the problem earlier, incorrectly guessing the fastest curve was a circular arc.</p>
<h3>How to Play</h3>
<p>Design a track (curve) for a ball to roll from a start point to an end point. Gravity accelerates the ball downhill. The goal is to find the shape that minimizes travel time — the curve of fastest descent.</p>
<h3>Strategy Tips</h3>
<p>A straight line is <em>not</em> the fastest path — counterintuitively, a curve that drops steeply at the start and flattens near the end wins, because it builds speed early. The provably optimal shape is a <strong>cycloid</strong>, the curve traced by a point on the rim of a rolling wheel. Try sketching a steep initial drop with a long shallow runout.</p>
<h3>Variations</h3>
<p>The tautochrone problem (also solved by a cycloid) asks for the curve along which a ball reaches the bottom in the same time from any starting height. Snell's law for refracting light follows the same calculus-of-variations principle.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no logins, no chat. It pairs naturally with calculus or physics lessons on optimization and the calculus of variations.</p>
`,

	'lunarlander': `<h2>Lunar Lander: History, Rules &amp; Strategy</h2>
<p>Lunar Lander originated as a text-based simulation called "Rocket" written in 1969, the same year as the Apollo 11 moon landing. Atari released an iconic arcade version in 1979 that became a cultural landmark. The game teaches orbital mechanics and thrust-to-weight ratios — the same physics that real NASA engineers use to plan descent trajectories for spacecraft landing on the Moon and Mars.</p>
<h3>How to Play</h3>
<p>Control a lunar module descending toward the moon's surface. Use thrust to counteract gravity and guide your lander to a flat landing pad. You must touch down with low vertical and horizontal velocity, and the module must be nearly upright. Fuel is limited.</p>
<h3>Strategy Tips</h3>
<p>Burn fuel <em>late</em>, not early — every second of thrust above target altitude is wasted because gravity will accelerate you again the moment you stop thrusting. This is the <strong>suicide burn</strong> strategy used by SpaceX. Keep horizontal velocity near zero before the final descent; correcting sideways drift at low altitude wastes fuel fast. Aim to touch down with under 2 m/s vertical velocity.</p>
<h3>Variations</h3>
<p>Atari's 1979 vector-graphics arcade version is the canonical one. "Lunar Lander 3D", Kerbal Space Program, and SimRocket extend the concept. Real Apollo descent used a guidance computer with just 4 KB of RAM.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no logins, no chat. A classic for teaching Newton's laws, fuel economy, and proportional control — works on phones and Chromebooks.</p>
`,

	'epidemicsim': `<h2>Epidemic Simulator: History, Rules &amp; Strategy</h2>
<p>Epidemic modeling dates to Daniel Bernoulli's 1766 analysis of smallpox inoculation. The modern SIR model (Susceptible-Infected-Recovered) was developed by Kermack and McKendrick in 1927 and remains the foundation of epidemiological forecasting. The COVID-19 pandemic brought these models into public consciousness, as "flatten the curve" became a global rallying cry based directly on SIR mathematics.</p>
<h3>How to Play</h3>
<p>Manage the spread of a virus through a population using policy controls: mobility restrictions, testing and isolation programs, and quarantine fines. Balance public health outcomes against your limited budget. The simulation runs day by day as you adjust your response strategy.</p>
<h3>Strategy Tips</h3>
<p>Act early. The exponential phase of an outbreak is unforgiving — interventions on day 5 are worth far more than the same interventions on day 30. Layer cheap, broad measures (testing, isolation) under expensive narrow ones (lockdowns) instead of relying on any single lever. Watch R₀ × susceptible fraction; once that product drops below 1, cases shrink.</p>
<h3>Variations</h3>
<p>The textbook SIR model has many extensions: SEIR adds an Exposed (incubating) compartment; SIRS allows reinfection; SIRV adds vaccination. Network-based models replace the well-mixed assumption with a contact graph and capture super-spreader dynamics that compartmental models miss.</p>
<h3>Is this game school-safe?</h3>
<p>Yes. No ads, no logins, no chat — it's a sandbox for understanding compartmental models and public-health tradeoffs, suitable for biology, statistics, or social-studies classrooms.</p>
`
};
