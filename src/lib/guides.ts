export const gameGuides: Record<string, string> = {
	'sliding-tiles': `<h2>The Sliding Tiles Puzzle: History, Rules &amp; Strategy</h2>
<p>The sliding tiles puzzle, also known as the 15-puzzle, was invented by Noyes Palmer Chapman in 1874 and became one of the world's first viral crazes. Sam Loyd famously offered a cash prize for solving an "impossible" configuration, which mathematicians later proved was indeed unsolvable — launching the field of permutation group theory.</p>
<h3>How to Play</h3>
<p>You are given a 4×4 grid with 15 numbered tiles and one empty space. Slide tiles into the empty space to arrange them in numerical order from left to right, top to bottom. Only tiles adjacent to the empty space can move.</p>
<h3>Winning Strategy</h3>
<p>Start by solving the top row, then the second row, working your way down. For each row, place the leftmost tiles first. When solving the last two columns, use the "rotation" technique: position tiles in an L-shape, then rotate them into place simultaneously. The optimal solution for a random board averages about 80 moves, but experts using the IDA* algorithm can find paths as short as 50 moves. Practice pattern recognition — experienced solvers don't think tile-by-tile, they see groups of tiles moving together.</p>`,

	'pegboard': `<h2>Peg Solitaire: History, Rules &amp; Strategy</h2>
<p>Peg solitaire dates back to the court of Louis XIV in 17th-century France. An engraving from 1697 depicts a noblewoman playing the game. The English board variant, with its cross-shaped layout of 33 holes, became the standard form studied by mathematicians including Leibniz, who analyzed it as a combinatorial puzzle.</p>
<h3>How to Play</h3>
<p>The board starts with pegs filling every hole except the center. A peg jumps over an adjacent peg (horizontally or vertically) into an empty hole, removing the jumped peg. The goal is to leave exactly one peg remaining, ideally in the center hole.</p>
<h3>Winning Strategy</h3>
<p>Think in terms of "packages" — groups of moves that clear a section of the board cleanly. Start by clearing the edges and working inward. A key principle is maintaining symmetry as long as possible. The board has a parity constraint: certain positions are mathematically unreachable. Experts use "pagoda functions" to prove whether a given board state can lead to a solution. With practice, the 33-hole board can be solved in 18 moves (where each move is one jump).</p>`,

	'hanoi': `<h2>Tower of Hanoi: History, Rules &amp; Strategy</h2>
<p>The Tower of Hanoi was invented by French mathematician Édouard Lucas in 1883. He marketed it with a legend about monks moving 64 golden discs between diamond needles — a task that would take 2⁶⁴−1 moves, or roughly 585 billion years. The puzzle is fundamental in computer science as a textbook example of recursion and has applications in backup rotation schemes and neurological testing.</p>
<h3>How to Play</h3>
<p>Move a stack of discs from the leftmost peg to the rightmost peg. Only one disc may be moved at a time, and a larger disc may never be placed on top of a smaller disc.</p>
<h3>Winning Strategy</h3>
<p>The recursive solution is elegant: to move N discs, first move the top N−1 discs to the middle peg, move the largest disc to the target, then move the N−1 discs from the middle to the target. The minimum number of moves is always 2ⁿ−1. For a non-recursive approach, alternate between moving the smallest disc and making the only other legal move available. The smallest disc always cycles in one direction through the three pegs.</p>`,

	'knights-tour': `<h2>The Knight's Tour: History, Rules &amp; Strategy</h2>
<p>The Knight's Tour problem dates back over a thousand years, with solutions found in Arabic manuscripts from the 9th century. Leonhard Euler published a famous analysis in 1759. The problem asks whether a chess knight can visit every square on the board exactly once — a question that connects chess, graph theory, and Hamiltonian path problems in combinatorics.</p>
<h3>How to Play</h3>
<p>Click any square to place your knight. Then move in the standard chess L-shape: two squares in one direction plus one square perpendicular. Visit all 64 squares without revisiting any square.</p>
<h3>Winning Strategy</h3>
<p>The most effective heuristic is Warnsdorff's Rule (1823): always move to the square with the fewest onward moves. This greedy algorithm works remarkably well — it finds a complete tour from almost any starting square on standard boards. When ties arise, prefer corners and edges early in the game, saving central squares (which have more connections) for later. Avoid creating "dead zones" — isolated unvisited regions that become impossible to reach.</p>`,

	'set': `<h2>The Set Card Game: History, Rules &amp; Strategy</h2>
<p>Set was invented by population geneticist Marsha Falco in 1974 while studying epilepsy in German Shepherds. She was representing gene combinations with symbols on cards and noticed the pattern-matching game hidden in her data. Published in 1991, Set became a beloved mathematical game. It connects to finite geometry — the cards represent points in a four-dimensional space over the field with three elements.</p>
<h3>How to Play</h3>
<p>Each card has four attributes (shape, color, count, fill), each with three possible values. Find three cards where, for every attribute, the three cards are either all the same or all different. Twelve cards are dealt; if no set exists, three more are added.</p>
<h3>Winning Strategy</h3>
<p>Scan systematically: fix two cards and determine what the third card must be. Focus on one attribute at a time to reduce cognitive load. Expert players develop "chunking" — recognizing common set patterns instantly rather than checking each attribute individually. The maximum number of cards with no valid set is 20, so sets almost always exist in a 12-card deal.</p>`,

	'dotsandboxes': `<h2>Dots and Boxes: History, Rules &amp; Strategy</h2>
<p>Dots and Boxes was first published by Édouard Lucas (also the creator of the Tower of Hanoi) in 1889. Despite its simple rules, the game has surprisingly deep strategy studied by combinatorial game theorists. Elwyn Berlekamp's 2000 book "The Dots and Boxes Game" revealed that optimal play requires sophisticated chain-counting techniques.</p>
<h3>How to Play</h3>
<p>Players take turns drawing a line between two adjacent dots. When a player completes the fourth side of a box, they claim it and take another turn. The player with the most boxes at the end wins.</p>
<h3>Winning Strategy</h3>
<p>The key insight is "chain control." In the endgame, boxes form chains — sequences of incomplete boxes. The player who controls chain parity wins. Avoid completing the third side of a box (giving your opponent a free capture). In the midgame, sacrifice small chains (1-2 boxes) to maintain control of larger chains. Count the number of chains: if there are an odd number of long chains, the first player to be forced into a chain loses.</p>`,

	'iceslider': `<h2>Ice Slider Puzzle: History, Rules &amp; Strategy</h2>
<p>Ice slider puzzles originated in the Sokoban puzzle tradition from Japan (1981) and gained mainstream popularity through the Pokémon game series, where icy floor puzzles became a beloved dungeon mechanic. The core concept — objects sliding until hitting a wall — creates elegant puzzles from simple physics, making it a favorite in puzzle game design and AI pathfinding research.</p>
<h3>How to Play</h3>
<p>You control a block on a frictionless ice surface. When you slide in a direction, the block moves continuously until it hits a wall or obstacle. Navigate from the start position to the goal using the minimum number of moves.</p>
<h3>Winning Strategy</h3>
<p>Think backwards from the goal: which direction must the last slide come from? Then determine what wall or obstacle stops you at that position. Build a chain of reasoning from the goal back to the start. Walls and obstacles are your friends — they're the only way to stop. Look for "pivot points" where an obstacle lets you change direction. Many puzzles require counter-intuitive moves, like sliding away from the goal to reach a critical wall.</p>`,

	'nim': `<h2>Nim: History, Rules &amp; Strategy</h2>
<p>Nim is one of the oldest known strategy games, with origins traced to ancient China. The complete mathematical theory was published by Charles Bouton at Harvard in 1901, making it one of the first games solved by mathematical analysis. Nim is foundational to combinatorial game theory — the Sprague-Grundy theorem shows that every impartial game is equivalent to a Nim position.</p>
<h3>How to Play</h3>
<p>Objects are arranged in rows. Players take turns removing any number of objects from a single row. The player who takes the last object wins (normal play convention).</p>
<h3>Winning Strategy</h3>
<p>The winning strategy uses binary arithmetic. Calculate the XOR (nim-sum) of all row sizes. If the nim-sum is zero, the position is losing for the player to move; otherwise, it's winning. To play optimally, make a move that leaves a nim-sum of zero. For example, with rows of 3, 4, 5: the XOR is 3⊕4⊕5 = 2. Remove 2 from the row of 4 (leaving 2), giving 3⊕2⊕5 = 0. Your opponent is now in a losing position no matter what they do.</p>`,

	'hex': `<h2>Hex: History, Rules &amp; Strategy</h2>
<p>Hex was independently invented by Danish mathematician Piet Hein in 1942 and by John Nash (of "A Beautiful Mind" fame) in 1948 at Princeton. Nash proved that the first player always has a winning strategy, using an elegant "strategy-stealing" argument — but the proof is non-constructive, meaning it doesn't tell you what the strategy actually is. This makes Hex endlessly fascinating: we know perfect play exists, but on large boards, nobody knows what it looks like.</p>
<h3>How to Play</h3>
<p>Two players alternate placing stones on a rhombus-shaped hexagonal grid. One player connects the top edge to the bottom; the other connects left to right. The first player to complete a connected path between their two edges wins. Draws are impossible.</p>
<h3>Winning Strategy</h3>
<p>Control the center — central hexagons have the most connections and the highest strategic value. Build "bridges" (pairs of stones two apart that cannot both be blocked) to create resilient connections. Think in terms of "virtual connections" — groups of cells that are effectively connected even if not yet linked by stones. When attacking, create "ladders" that force your opponent toward the edge. On an 11×11 board, the first-player advantage is significant, and many tournaments use a swap rule to balance it.</p>`,

	'krypto': `<h2>Krypto: History, Rules &amp; Strategy</h2>
<p>Krypto was created by Daniel Yovich in 1963 and has been a staple of math classrooms and competitions ever since. The National Council of Teachers of Mathematics endorses it for developing number sense and mental arithmetic fluency. Krypto tournaments are held at math competitions nationwide, where students race to find solutions in seconds.</p>
<h3>How to Play</h3>
<p>Five number cards are dealt, plus one target number. Using all five numbers exactly once and any combination of addition, subtraction, multiplication, and division, create an expression that equals the target. Order of operations applies.</p>
<h3>Winning Strategy</h3>
<p>Start by looking for multiplicative relationships — if the target is large, check whether two of your numbers multiply to something near it. Work with pairs: combine two numbers into a useful intermediate result, then see how the remaining numbers can bridge to the target. Division is powerful for "fixing" results that are too large. When stuck, try factoring the target number and see if those factors appear among your cards. Expert players develop an instinct for which operations to try first based on the relative sizes of the numbers.</p>`,

	'shotsim': `<h2>ShotSim - Projectile Physics: History, Rules &amp; Strategy</h2>
<p>Projectile motion was first accurately described by Galileo Galilei in 1638, who demonstrated that the path of a projectile forms a parabola. This insight revolutionized both physics and military science. The mathematics of ballistic trajectories — involving trigonometry, quadratic equations, and Newton's laws — remains fundamental to physics education and is used in everything from sports science to space exploration.</p>
<h3>How to Play</h3>
<p>Adjust the cannon's angle and power to launch a projectile at a target hoop. Gravity pulls the projectile downward while its initial velocity carries it forward, creating the characteristic parabolic arc. Hit the target to score.</p>
<h3>Winning Strategy</h3>
<p>The range of a projectile is maximized at 45°. For targets below the cannon, use angles less than 45° for a flatter trajectory. For each target distance, there are typically two valid angles — a high arc and a low arc. Start with 45° as your baseline and adjust. Higher power with lower angle gives a flatter, faster shot. Lower power with higher angle gives a slower, arcing shot. Learn to read the dotted trajectory preview and adjust incrementally rather than making large changes.</p>`,

	'vectorracing': `<h2>Vector Racing: History, Rules &amp; Strategy</h2>
<p>Vector racing (also called Racetrack or Paper Racing) originated as a pencil-and-paper game in the 1960s and was popularized by Martin Gardner in his Scientific American column. The game brilliantly illustrates concepts from physics — velocity, acceleration, and momentum — in an accessible grid-based format. It's used in computer science courses to teach pathfinding algorithms and state-space search.</p>
<h3>How to Play</h3>
<p>Your car moves on a grid track. Each turn, you can adjust your horizontal and vertical velocity by at most ±1. Your new position is your current position plus your velocity. Stay on the track — hitting a wall means a crash. Complete the circuit in as few moves as possible.</p>
<h3>Winning Strategy</h3>
<p>The key is planning ahead. Accelerate on straights and begin decelerating before turns — just like real racing. Your velocity carries forward, so you must start braking several turns before a sharp corner. Hug the inside of curves for shorter paths. The optimal number of moves can be found using breadth-first search, but human players should focus on maintaining smooth velocity changes and avoiding the need for emergency corrections that waste moves.</p>`,

	'tracksofgalileo': `<h2>Tracks of Galileo: History, Rules &amp; Strategy</h2>
<p>This puzzle is inspired by the famous brachistochrone problem, posed by Johann Bernoulli in 1696 as a challenge to the world's mathematicians. Newton, Leibniz, and Jakob Bernoulli all submitted solutions. The answer — a cycloid curve — was a landmark discovery connecting calculus, physics, and differential geometry. Galileo himself had studied the problem earlier, incorrectly guessing the fastest curve was a circular arc.</p>
<h3>How to Play</h3>
<p>Design a track (curve) for a ball to roll from a start point to an end point. Gravity accelerates the ball downhill. The goal is to find the shape that minimizes travel time — the curve of fastest descent.</p>
<h3>Winning Strategy</h3>
<p>A straight line is not the fastest path! Dipping the track steeply at the beginning builds speed early, even though the total distance is longer. The optimal curve (cycloid) drops steeply then levels out. When designing your track, prioritize early acceleration — get the ball moving fast in the first third of the track. Avoid flat sections at the start where the ball has no speed. A track that dips below the endpoint and curves back up can actually be faster than a direct path.</p>`,

	'lunarlander': `<h2>Lunar Lander: History, Rules &amp; Strategy</h2>
<p>Lunar Lander originated as a text-based simulation called "Rocket" written in 1969, the same year as the Apollo 11 moon landing. Atari released an iconic arcade version in 1979 that became a cultural landmark. The game teaches orbital mechanics and thrust-to-weight ratios — the same physics that real NASA engineers use to plan descent trajectories for spacecraft landing on the Moon and Mars.</p>
<h3>How to Play</h3>
<p>Control a lunar module descending toward the moon's surface. Use thrust to counteract gravity and guide your lander to a flat landing pad. You must touch down with low vertical and horizontal velocity, and the module must be nearly upright. Fuel is limited.</p>
<h3>Winning Strategy</h3>
<p>Eliminate horizontal velocity first — use short lateral bursts early in the descent while you have altitude to spare. Then focus on controlling your descent rate. The optimal strategy is a "suicide burn" — fall freely to conserve fuel, then apply maximum thrust at the last possible moment. In practice, maintain a descent rate of about 1-2 m/s in the final approach. Watch your fuel gauge closely. Landing on higher-multiplier pads (narrower platforms) is riskier but more rewarding.</p>`,

	'epidemicsim': `<h2>Epidemic Simulator: History, Rules &amp; Strategy</h2>
<p>Epidemic modeling dates to Daniel Bernoulli's 1766 analysis of smallpox inoculation. The modern SIR model (Susceptible-Infected-Recovered) was developed by Kermack and McKendrick in 1927 and remains the foundation of epidemiological forecasting. The COVID-19 pandemic brought these models into public consciousness, as "flatten the curve" became a global rallying cry based directly on SIR mathematics.</p>
<h3>How to Play</h3>
<p>Manage the spread of a virus through a population using policy controls: mobility restrictions, testing and isolation programs, and quarantine fines. Balance public health outcomes against your limited budget. The simulation runs day by day as you adjust your response strategy.</p>
<h3>Winning Strategy</h3>
<p>Early intervention is exponentially more effective than late intervention — reducing transmission by 10% on day 1 prevents far more infections than the same reduction on day 30. The reproduction number R₀ is key: keep it below 1.0 and the epidemic shrinks. Combine moderate mobility restrictions with aggressive testing for the most cost-effective approach. Pure lockdowns burn through your budget too quickly. Watch the infection curve — ease restrictions only after the peak has clearly passed and daily new cases are declining steadily.</p>`
};
