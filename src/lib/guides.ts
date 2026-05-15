export const gameGuides: Record<string, string> = {
	'sliding-tiles': `<h2>The Sliding Tiles Puzzle: History, Rules &amp; Strategy</h2>
<p>The sliding tiles puzzle, also known as the 15-puzzle, was invented by Noyes Palmer Chapman in 1874 and became one of the world's first viral crazes. Sam Loyd famously offered a cash prize for solving an "impossible" configuration, which mathematicians later proved was indeed unsolvable — launching the field of permutation group theory.</p>
<h3>How to Play</h3>
<p>You are given a 4×4 grid with 15 numbered tiles and one empty space. Slide tiles into the empty space to arrange them in numerical order from left to right, top to bottom. Only tiles adjacent to the empty space can move.</p>
`,

	'pegboard': `<h2>Peg Solitaire: History, Rules &amp; Strategy</h2>
<p>Peg solitaire dates back to the court of Louis XIV in 17th-century France. An engraving from 1697 depicts a noblewoman playing the game. The English board variant, with its cross-shaped layout of 33 holes, became the standard form studied by mathematicians including Leibniz, who analyzed it as a combinatorial puzzle.</p>
<h3>How to Play</h3>
<p>The board starts with pegs filling every hole except the center. A peg jumps over an adjacent peg (horizontally or vertically) into an empty hole, removing the jumped peg. The goal is to leave exactly one peg remaining, ideally in the center hole.</p>
`,

	'hanoi': `<h2>Tower of Hanoi: History, Rules &amp; Strategy</h2>
<p>The Tower of Hanoi was invented by French mathematician Édouard Lucas in 1883. He marketed it with a legend about monks moving 64 golden discs between diamond needles — a task that would take 2⁶⁴−1 moves, or roughly 585 billion years. The puzzle is fundamental in computer science as a textbook example of recursion and has applications in backup rotation schemes and neurological testing.</p>
<h3>How to Play</h3>
<p>Move a stack of discs from the leftmost peg to the rightmost peg. Only one disc may be moved at a time, and a larger disc may never be placed on top of a smaller disc.</p>
`,

	'knights-tour': `<h2>The Knight's Tour: History, Rules &amp; Strategy</h2>
<p>The Knight's Tour problem dates back over a thousand years, with solutions found in Arabic manuscripts from the 9th century. Leonhard Euler published a famous analysis in 1759. The problem asks whether a chess knight can visit every square on the board exactly once — a question that connects chess, graph theory, and Hamiltonian path problems in combinatorics.</p>
<h3>How to Play</h3>
<p>Click any square to place your knight. Then move in the standard chess L-shape: two squares in one direction plus one square perpendicular. Visit all 64 squares without revisiting any square.</p>
`,

	'set': `<h2>The Set Card Game: History, Rules &amp; Strategy</h2>
<p>Set was invented by population geneticist Marsha Falco in 1974 while studying epilepsy in German Shepherds. She was representing gene combinations with symbols on cards and noticed the pattern-matching game hidden in her data. Published in 1991, Set became a beloved mathematical game. It connects to finite geometry — the cards represent points in a four-dimensional space over the field with three elements.</p>
<h3>How to Play</h3>
<p>Each card has four attributes (shape, color, count, fill), each with three possible values. Find three cards where, for every attribute, the three cards are either all the same or all different. Twelve cards are dealt; if no set exists, three more are added.</p>
`,

	'dotsandboxes': `<h2>Dots and Boxes: History, Rules &amp; Strategy</h2>
<p>Dots and Boxes was first published by Édouard Lucas (also the creator of the Tower of Hanoi) in 1889. Despite its simple rules, the game has surprisingly deep strategy studied by combinatorial game theorists. Elwyn Berlekamp's 2000 book "The Dots and Boxes Game" revealed that optimal play requires sophisticated chain-counting techniques.</p>
<h3>How to Play</h3>
<p>Players take turns drawing a line between two adjacent dots. When a player completes the fourth side of a box, they claim it and take another turn. The player with the most boxes at the end wins.</p>
`,

	'iceslider': `<h2>Ice Slider Puzzle: History, Rules &amp; Strategy</h2>
<p>Ice slider puzzles originated in the Sokoban puzzle tradition from Japan (1981) and gained mainstream popularity through the Pokémon game series, where icy floor puzzles became a beloved dungeon mechanic. The core concept — objects sliding until hitting a wall — creates elegant puzzles from simple physics, making it a favorite in puzzle game design and AI pathfinding research.</p>
<h3>How to Play</h3>
<p>You control a block on a frictionless ice surface. When you slide in a direction, the block moves continuously until it hits a wall or obstacle. Navigate from the start position to the goal using the minimum number of moves.</p>
`,

	'nim': `<h2>Nim: History, Rules &amp; Strategy</h2>
<p>Nim is one of the oldest known strategy games, with origins traced to ancient China. The complete mathematical theory was published by Charles Bouton at Harvard in 1901, making it one of the first games solved by mathematical analysis. Nim is foundational to combinatorial game theory — the Sprague-Grundy theorem shows that every impartial game is equivalent to a Nim position.</p>
<h3>How to Play</h3>
<p>Objects are arranged in rows. Players take turns removing any number of objects from a single row. The player who takes the last object wins (normal play convention).</p>
`,

	'hex': `<h2>Hex: History, Rules &amp; Strategy</h2>
<p>Hex was independently invented by Danish mathematician Piet Hein in 1942 and by John Nash (of "A Beautiful Mind" fame) in 1948 at Princeton. Nash proved that the first player always has a winning strategy, using an elegant "strategy-stealing" argument — but the proof is non-constructive, meaning it doesn't tell you what the strategy actually is. This makes Hex endlessly fascinating: we know perfect play exists, but on large boards, nobody knows what it looks like.</p>
<h3>How to Play</h3>
<p>Two players alternate placing stones on a rhombus-shaped hexagonal grid. One player connects the top edge to the bottom; the other connects left to right. The first player to complete a connected path between their two edges wins. Draws are impossible.</p>
`,

	'krypto': `<h2>Krypto: History, Rules &amp; Strategy</h2>
<p>Krypto was created by Daniel Yovich in 1963 and has been a staple of math classrooms and competitions ever since. The National Council of Teachers of Mathematics endorses it for developing number sense and mental arithmetic fluency. Krypto tournaments are held at math competitions nationwide, where students race to find solutions in seconds.</p>
<h3>How to Play</h3>
<p>Five number cards are dealt, plus one target number. Using all five numbers exactly once and any combination of addition, subtraction, multiplication, and division, create an expression that equals the target. Order of operations applies.</p>
`,

	'shotsim': `<h2>ShotSim - Projectile Physics: History, Rules &amp; Strategy</h2>
<p>Projectile motion was first accurately described by Galileo Galilei in 1638, who demonstrated that the path of a projectile forms a parabola. This insight revolutionized both physics and military science. The mathematics of ballistic trajectories — involving trigonometry, quadratic equations, and Newton's laws — remains fundamental to physics education and is used in everything from sports science to space exploration.</p>
<h3>How to Play</h3>
<p>Adjust the cannon's angle and power to launch a projectile at a target hoop. Gravity pulls the projectile downward while its initial velocity carries it forward, creating the characteristic parabolic arc. Hit the target to score.</p>
`,

	'vectorracing': `<h2>Vector Racing: History, Rules &amp; Strategy</h2>
<p>Vector racing (also called Racetrack or Paper Racing) originated as a pencil-and-paper game in the 1960s and was popularized by Martin Gardner in his Scientific American column. The game brilliantly illustrates concepts from physics — velocity, acceleration, and momentum — in an accessible grid-based format. It's used in computer science courses to teach pathfinding algorithms and state-space search.</p>
<h3>How to Play</h3>
<p>Your car moves on a grid track. Each turn, you can adjust your horizontal and vertical velocity by at most ±1. Your new position is your current position plus your velocity. Stay on the track — hitting a wall means a crash. Complete the circuit in as few moves as possible.</p>
`,

	'tracksofgalileo': `<h2>Tracks of Galileo: History, Rules &amp; Strategy</h2>
<p>This puzzle is inspired by the famous brachistochrone problem, posed by Johann Bernoulli in 1696 as a challenge to the world's mathematicians. Newton, Leibniz, and Jakob Bernoulli all submitted solutions. The answer — a cycloid curve — was a landmark discovery connecting calculus, physics, and differential geometry. Galileo himself had studied the problem earlier, incorrectly guessing the fastest curve was a circular arc.</p>
<h3>How to Play</h3>
<p>Design a track (curve) for a ball to roll from a start point to an end point. Gravity accelerates the ball downhill. The goal is to find the shape that minimizes travel time — the curve of fastest descent.</p>
`,

	'lunarlander': `<h2>Lunar Lander: History, Rules &amp; Strategy</h2>
<p>Lunar Lander originated as a text-based simulation called "Rocket" written in 1969, the same year as the Apollo 11 moon landing. Atari released an iconic arcade version in 1979 that became a cultural landmark. The game teaches orbital mechanics and thrust-to-weight ratios — the same physics that real NASA engineers use to plan descent trajectories for spacecraft landing on the Moon and Mars.</p>
<h3>How to Play</h3>
<p>Control a lunar module descending toward the moon's surface. Use thrust to counteract gravity and guide your lander to a flat landing pad. You must touch down with low vertical and horizontal velocity, and the module must be nearly upright. Fuel is limited.</p>
`,

	'epidemicsim': `<h2>Epidemic Simulator: History, Rules &amp; Strategy</h2>
<p>Epidemic modeling dates to Daniel Bernoulli's 1766 analysis of smallpox inoculation. The modern SIR model (Susceptible-Infected-Recovered) was developed by Kermack and McKendrick in 1927 and remains the foundation of epidemiological forecasting. The COVID-19 pandemic brought these models into public consciousness, as "flatten the curve" became a global rallying cry based directly on SIR mathematics.</p>
<h3>How to Play</h3>
<p>Manage the spread of a virus through a population using policy controls: mobility restrictions, testing and isolation programs, and quarantine fines. Balance public health outcomes against your limited budget. The simulation runs day by day as you adjust your response strategy.</p>
`
};
