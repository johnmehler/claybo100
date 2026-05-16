// Per-game SEO metadata. Targets long-tail search intents.
// Keep titles under ~60 chars and descriptions under ~155 chars where practical.

export type HowToStep = { name: string; text: string };

export type GameSEO = {
	title: string;            // <title> tag
	description: string;      // <meta name="description">
	keywords: string[];       // long-tail terms (used for og + schema)
	genre: string;            // schema.org Game/VideoGame genre
	about: string;            // 1-2 sentence intro paragraph rendered on page
	howTo?: {                 // HowTo JSON-LD payload
		name: string;
		description: string;
		steps: HowToStep[];
	};
};

export const gameHowTo: Record<string, { name: string; description: string; steps: HowToStep[] }> = {
	'sliding-tiles': {
		name: 'How to play the Sliding Tiles (15) puzzle',
		description: 'Slide numbered tiles into the empty space to arrange them 1–15 in order on a 4×4 grid.',
		steps: [
			{ name: 'Identify the empty space', text: 'The 4×4 board has 15 numbered tiles and one empty cell. Only a tile directly adjacent to the empty cell can be moved.' },
			{ name: 'Solve the top row', text: 'Slide tiles 1, 2, 3, and 4 into the top row first. Use a corner-rotation setup for the last two tiles of the row.' },
			{ name: 'Solve the left column', text: 'Next, place tiles 5, 9, and 13 down the left column using the same corner-rotation technique for the final pair.' },
			{ name: 'Reduce to a 3×3, then a 2×2', text: 'Repeat the row + column technique on the remaining 3×3 sub-puzzle, then solve the final 2×2 by rotation.' },
			{ name: 'Finish in numerical order', text: 'The bottom-right cell ends as the empty space, with tiles 1–15 reading left-to-right, top-to-bottom.' }
		]
	},
	'pegboard': {
		name: 'How to play English Peg Solitaire',
		description: 'Jump pegs over adjacent pegs to clear the 33-hole cross board, leaving one peg in the center.',
		steps: [
			{ name: 'Start with the center empty', text: 'The cross-shaped board begins with every hole filled except the center hole.' },
			{ name: 'Make a jump', text: 'Move a peg horizontally or vertically over an adjacent peg into an empty hole. Remove the jumped peg.' },
			{ name: 'Work in packages of three', text: 'Identify triplets of pegs that can be cleared in two moves, leaving a single survivor each time.' },
			{ name: 'Avoid isolating pegs', text: 'A peg with no neighbors can never be removed. Keep pegs connected until late in the solve.' },
			{ name: 'Land the final peg in the center', text: 'Plan the endgame backwards so the last legal jump deposits the final peg in the center hole.' }
		]
	},
	'hanoi': {
		name: 'How to solve the Tower of Hanoi',
		description: 'Move a stack of discs from the left peg to the right peg without ever placing a larger disc on a smaller one.',
		steps: [
			{ name: 'Choose the stack size', text: 'Pick between 3 and 8 discs. The optimal solution takes 2ⁿ−1 moves for n discs.' },
			{ name: 'Apply the recursive rule', text: 'To move n discs from A to C: move n−1 discs from A to B, move the largest disc from A to C, then move n−1 discs from B to C.' },
			{ name: 'Or use the iterative shortcut', text: 'On odd-numbered moves, move the smallest disc one peg clockwise. On even moves, make the only other legal move.' },
			{ name: 'Never stack larger on smaller', text: 'Every move must place a disc on either an empty peg or on top of a strictly larger disc.' },
			{ name: 'Finish on the right peg', text: 'The puzzle ends when the entire stack is rebuilt, largest to smallest, on the rightmost peg.' }
		]
	},
	'knights-tour': {
		name: "How to complete the Knight's Tour",
		description: 'Move a chess knight to visit every square of an 8×8 board exactly once.',
		steps: [
			{ name: 'Place the knight', text: 'Click any square to drop the knight at its starting position.' },
			{ name: 'Move in an L-shape', text: 'Each move goes two squares in one direction plus one square perpendicular — the standard chess knight move.' },
			{ name: "Apply Warnsdorff's rule", text: 'At every step, choose the legal move that leads to the square with the fewest onward moves.' },
			{ name: 'Handle corners early', text: 'Corner squares have only two access squares. Schedule them carefully or you will strand the knight.' },
			{ name: 'Visit all 64 squares', text: 'Continue until the knight has landed on every square exactly once without ever revisiting a square.' }
		]
	},
	'set': {
		name: 'How to play the SET card game',
		description: 'Find three cards on the table that form a valid set — every attribute either all-same or all-different.',
		steps: [
			{ name: 'Read the four attributes', text: 'Each card has a shape, color, count, and fill. Each attribute takes one of three values.' },
			{ name: 'Scan twelve cards', text: 'Twelve cards are dealt face up. If no set exists, three more cards are added.' },
			{ name: 'Check the set rule', text: 'For three cards to form a set, every one of the four attributes must be all-same or all-different across the three cards.' },
			{ name: 'Use the third-card trick', text: 'Any two cards determine exactly one third card that completes a set with them. Mentally compute it and scan the table.' },
			{ name: 'Claim the set', text: 'Select the three cards. Replacement cards are dealt and play continues until the deck is exhausted.' }
		]
	},
	'dotsandboxes': {
		name: 'How to play Dots and Boxes',
		description: 'Draw lines between dots to complete boxes and capture more squares than the AI.',
		steps: [
			{ name: 'Take turns drawing lines', text: 'On your turn, draw a single line between two adjacent dots.' },
			{ name: 'Claim completed boxes', text: 'Whenever your line closes the fourth side of a 1×1 box, you claim that box and immediately take another turn.' },
			{ name: 'Avoid drawing the third side', text: 'Drawing the third side of a box hands the opponent a free capture. Save those moves for when forced.' },
			{ name: 'Master the double-cross', text: 'When forced to open a long chain, sacrifice the last two boxes so the opponent has to open the next chain.' },
			{ name: 'Count boxes at the end', text: 'When every line is drawn, whoever holds the most boxes wins.' }
		]
	},
	'iceslider': {
		name: 'How to solve Ice Slider puzzles',
		description: 'Slide a block on frictionless ice until it hits a wall, reaching the goal in minimum moves.',
		steps: [
			{ name: 'Pick a direction', text: 'Choose up, down, left, or right. The block slides continuously in that direction.' },
			{ name: 'Stop only at walls', text: 'The block keeps moving until it hits a wall or obstacle — there is no friction.' },
			{ name: 'Plan backwards from the goal', text: 'Identify which wall could stop the block on the goal square, then work out the bounces needed to reach that wall.' },
			{ name: 'Use placed blocks as stoppers', text: 'Blocks you have already positioned can serve as stopping surfaces for later moves.' },
			{ name: 'Reach the goal', text: 'Land on the goal tile to complete the level. Fewer moves earns a better score.' }
		]
	},
	'nim': {
		name: 'How to play and win at Nim',
		description: 'Remove objects from heaps; take the last object to win. Use XOR to play perfectly.',
		steps: [
			{ name: 'Set up the heaps', text: 'Objects are arranged in several rows (heaps) of varying sizes.' },
			{ name: 'Take any number from one row', text: 'On your turn, remove as many objects as you like — at least one — from a single row.' },
			{ name: 'Compute the nim-sum', text: 'Mentally XOR the sizes of every heap. If the result is zero, the current position is losing under perfect play.' },
			{ name: 'Move to a zero nim-sum', text: 'If the nim-sum is nonzero, there is always a move that makes it zero. Find it and force the opponent into the losing position.' },
			{ name: 'Take the last object', text: 'Under normal play, whoever removes the final object wins the game.' }
		]
	},
	'hex': {
		name: 'How to play Hex',
		description: 'Place stones on a hexagonal board to connect your two sides before your opponent connects theirs.',
		steps: [
			{ name: 'Pick a color and pair of sides', text: 'One player connects top to bottom, the other connects left to right of the rhombus-shaped board.' },
			{ name: 'Place one stone per turn', text: 'On your turn, place a single stone on any empty hexagonal cell.' },
			{ name: 'Build two-bridges', text: 'Two stones placed at a knight-like offset with two empty cells between them are virtually connected — if the opponent takes one cell, you take the other.' },
			{ name: 'Block opponent threats', text: 'Before extending your own chain, check whether the opponent is one move from completing theirs.' },
			{ name: 'Complete a connected path', text: 'The first player to form an unbroken chain of their stones between their two sides wins. Draws are impossible.' }
		]
	},
	'krypto': {
		name: 'How to play Krypto',
		description: 'Combine five number cards with +, −, ×, ÷ to land exactly on a target number.',
		steps: [
			{ name: 'Read the deal', text: 'You are dealt five number cards plus one target number.' },
			{ name: 'Estimate first', text: 'Find two cards whose sum or product is close to the target, then plan a small correction with the remaining three.' },
			{ name: 'Combine with the four operations', text: 'Build an expression using addition, subtraction, multiplication, and division. Order of operations applies.' },
			{ name: 'Use every card exactly once', text: 'All five number cards must appear exactly once in your expression — no extras, no repeats.' },
			{ name: 'Hit the target', text: 'Submit the expression. If it evaluates to the target number, you win the round.' }
		]
	},
	'shotsim': {
		name: 'How to play ShotSim',
		description: 'Adjust a cannon’s angle and power so its projectile lands in the target hoop.',
		steps: [
			{ name: 'Set the angle', text: 'Choose the launch angle of the cannon. For a flat shot, 45° gives the maximum horizontal range.' },
			{ name: 'Set the power', text: 'Choose the initial speed of the projectile. Power scales the entire parabola; angle only rotates it.' },
			{ name: 'Fire the shot', text: 'Launch the projectile. Gravity pulls it downward while initial velocity carries it forward, tracing a parabola.' },
			{ name: 'Adjust based on result', text: 'If you overshoot, reduce power before changing angle. Two angles will hit the same horizontal target — a low arc and a high arc.' },
			{ name: 'Hit the hoop', text: 'Land the projectile inside the target hoop to score.' }
		]
	},
	'vectorracing': {
		name: 'How to play Vector Racing',
		description: 'Race a car around a grid track by changing velocity by at most ±1 each turn.',
		steps: [
			{ name: 'Start at the start line', text: 'Your car begins on the grid start line with zero velocity.' },
			{ name: 'Change velocity by ±1', text: 'Each turn, adjust horizontal and vertical velocity by at most one unit each.' },
			{ name: 'Move by the new velocity', text: 'Your new position is the current position plus the updated velocity vector.' },
			{ name: 'Brake before corners', text: 'Start decelerating well before the apex so your velocity into the turn is small enough to survive the walls.' },
			{ name: 'Avoid the walls', text: 'Hitting a wall crashes the car. Stay on the track and complete the circuit in as few moves as possible.' }
		]
	},
	'tracksofgalileo': {
		name: 'How to solve Tracks of Galileo',
		description: 'Design a curve from start to end so a ball under gravity reaches the bottom as fast as possible.',
		steps: [
			{ name: 'Place the start and end', text: 'The ball must travel from a fixed start point to a fixed end point under gravity.' },
			{ name: 'Sketch a curve', text: 'Design a track connecting the two points. The ball will roll along whatever curve you draw.' },
			{ name: 'Drop steeply at the start', text: 'A curve that drops sharply early builds speed quickly. A straight line is not the fastest path.' },
			{ name: 'Aim for a cycloid', text: 'The provably optimal shape is a cycloid — the curve traced by a point on a rolling wheel. Try a steep drop followed by a long shallow runout.' },
			{ name: 'Race the ball', text: 'Release the ball and compare its travel time against the optimal cycloid descent.' }
		]
	},
	'lunarlander': {
		name: 'How to land in Lunar Lander',
		description: 'Use thrust against gravity to touch the lunar module down softly on a flat landing pad.',
		steps: [
			{ name: 'Manage altitude with thrust', text: 'Fire the main thruster to slow your descent. Every second of thrust costs fuel, so use it sparingly.' },
			{ name: 'Zero out horizontal drift', text: 'Use lateral thrusters to bring horizontal velocity near zero before final descent. Correcting drift low costs more fuel.' },
			{ name: 'Stay nearly upright', text: 'The lander must be close to vertical at touchdown. Rotate carefully to keep the module level.' },
			{ name: 'Plan a late burn', text: 'Burn fuel late — every early second of thrust is wasted because gravity re-accelerates you the moment you stop.' },
			{ name: 'Touch down softly', text: 'Aim for under about 2 m/s vertical velocity at contact, on a flat pad, with fuel to spare.' }
		]
	},
	'epidemicsim': {
		name: 'How to play the Epidemic Simulator',
		description: 'Use mobility, testing, and quarantine policies to manage a virus outbreak in a population.',
		steps: [
			{ name: 'Read the SIR state', text: 'The population is split into Susceptible, Infected, and Recovered compartments. Watch how each curve evolves day by day.' },
			{ name: 'Choose policies', text: 'Adjust mobility restrictions, testing and isolation programs, and quarantine measures. Each costs budget.' },
			{ name: 'Act early', text: 'Interventions during the exponential phase pay off far more than the same interventions later in the outbreak.' },
			{ name: 'Layer broad and narrow measures', text: 'Combine cheap, broad measures (testing, isolation) with more expensive, narrow ones (lockdowns) instead of relying on one lever.' },
			{ name: 'Drive R below 1', text: 'When R₀ × susceptible fraction drops below 1, new cases shrink. Hold policies until the outbreak resolves.' }
		]
	},
	'lasermaze': {
		name: 'How to play Laser Maze',
		description: 'Arrange and rotate mirrors to reflect a laser beam through a grid and hit the target.',
		steps: [
			{ name: 'Locate the laser source', text: 'Identify the starting point and direction of the laser beam on the 8×8 grid.' },
			{ name: 'Rotate mirrors', text: 'Click or tap mirrors to rotate them 90 degrees. Mirrors can reflect the beam at right angles.' },
			{ name: 'Avoid blockers', text: 'Laser beams cannot pass through solid black blocks. You must route the beam around them.' },
			{ name: 'Plan the path', text: 'Trace the path of the beam as it bounces off mirrors. Each mirror reflects the laser 90 degrees depending on its orientation.' },
			{ name: 'Hit the target', text: 'Align the mirrors so the final segment of the laser beam lands on the circular target icon.' }
		]
	},
	'blockdude': {
		name: 'How to play Block Dude',
		description: 'Stack and move blocks to navigate levels and reach the exit door.',
		steps: [
			{ name: 'Move Left and Right', text: 'Use the arrow keys to walk. You will automatically climb over blocks that are one unit high.' },
			{ name: 'Pick up a block', text: 'Stand in front of a block and press Space to lift it onto your head. You can only carry one block at a time.' },
			{ name: 'Drop a block', text: 'Press Space again to drop the block in front of you. You can drop it on the ground or on top of other blocks.' },
			{ name: 'Build staircases', text: 'Use multiple blocks to build steps to reach high ledges that you cannot climb normally.' },
			{ name: 'Reach the exit', text: 'Navigate to the green exit door to complete the level.' }
		]
	}
};

export const gameSEO: Record<string, GameSEO> = {
	'sliding-tiles': {
		title: 'Sliding Tiles Puzzle — Play the 15 Puzzle Online Free',
		description: 'Play the classic 15 puzzle online free. Slide numbered tiles into order in your browser. No downloads, no ads, works on mobile and at school.',
		keywords: ['sliding tiles puzzle', '15 puzzle online', 'fifteen puzzle', 'slide puzzle game', 'sliding puzzle unblocked', 'classic tile puzzle'],
		genre: 'Puzzle',
		about: 'The 15 puzzle — a 4x4 grid with one missing tile — has been a benchmark for solvers since 1874. Slide tiles into numerical order using the fewest moves you can manage.'
	},
	'pegboard': {
		title: 'Peg Solitaire Online — Free English Peg Solitaire Solver & Game',
		description: 'Play English peg solitaire online free. Jump pegs to clear the board and leave one peg in the center. Browser-based, mobile friendly, school safe.',
		keywords: ['peg solitaire online', 'peg solitaire solver', 'english peg solitaire', 'marble solitaire', 'peg jumping game', 'solo noble'],
		genre: 'Puzzle',
		about: 'English peg solitaire (also called Solo Noble) is a single-player jumping game played on a 33-hole cross board. Your goal: clear every peg except one, ideally in the center.'
	},
	'hanoi': {
		title: 'Tower of Hanoi Online — Play the Classic Disc Puzzle Free',
		description: 'Play Tower of Hanoi online with 3 to 8 discs. The classic recursion puzzle in your browser — free, no downloads, mobile friendly, school safe.',
		keywords: ['tower of hanoi online', 'hanoi puzzle game', 'tower of hanoi 8 discs', 'disc stacking puzzle', 'recursion puzzle', 'hanoi unblocked'],
		genre: 'Puzzle',
		about: 'The Tower of Hanoi is the textbook example of recursion. Move every disc to the rightmost peg without ever placing a larger disc on a smaller one. Optimal play takes 2ⁿ−1 moves.'
	},
	'knights-tour': {
		title: "Knight's Tour Puzzle — Play the Chess Knight Tour Online Free",
		description: "Play the Knight's Tour online. Move a chess knight to visit every square on an 8x8 board exactly once. Free browser game, mobile friendly, school safe.",
		keywords: ["knight's tour", 'knights tour puzzle', 'chess knight tour', 'hamiltonian knight path', 'knight tour 8x8', 'chess puzzle online'],
		genre: 'Puzzle',
		about: "The Knight's Tour asks whether a chess knight can visit every square of an 8x8 board exactly once — a problem studied by Euler and a classic of graph theory."
	},
	'set': {
		title: 'Set Card Game Online — Play SET Free in Your Browser',
		description: 'Play the SET card game online free. Spot sets of three cards matching the famous shape/color/number/shading rule. No login, no ads, mobile and school friendly.',
		keywords: ['set card game online', 'play set online', 'set game free', 'set card game unblocked', 'pattern matching card game', 'marsha falco set'],
		genre: 'Card',
		about: 'SET is a pattern-recognition card game invented by geneticist Marsha Falco in 1974. Each card has four attributes; a valid set requires each attribute to be all-same or all-different across three cards.'
	},
	'dotsandboxes': {
		title: 'Dots and Boxes Online — Play vs AI Free in Your Browser',
		description: 'Play Dots and Boxes online against an AI opponent. Draw lines, capture squares, win the board. Free, no downloads, mobile friendly, school safe.',
		keywords: ['dots and boxes online', 'dots and boxes vs ai', 'pencil and paper game', 'dots and boxes unblocked', 'square capture game', 'dots and boxes strategy'],
		genre: 'Strategy',
		about: 'Dots and Boxes is a classic pencil-and-paper game first published by Édouard Lucas in 1889. Take turns drawing lines; complete a box and you claim it — plus you go again.'
	},
	'iceslider': {
		title: 'Ice Slider Puzzle — Frictionless Sliding Block Game Online',
		description: 'Play Ice Slider, a sliding block puzzle on frictionless ice. Plan routes, reach the goal in minimum moves. Free browser game, mobile and school friendly.',
		keywords: ['ice slider puzzle', 'frictionless puzzle', 'sliding block ice puzzle', 'pokemon ice puzzle style', 'ice maze game', 'logic slider puzzle'],
		genre: 'Puzzle',
		about: 'Ice Slider is a sliding-block puzzle inspired by frictionless ice mechanics popularized by Pokémon dungeons. Your block slides until it hits something — so plan ahead.'
	},
	'nim': {
		title: 'Nim Game Online — Play the Classic Math Strategy Game Free',
		description: 'Play Nim online against a perfect AI. The classic combinatorial game of removing objects from heaps. Free, no downloads, mobile and school friendly.',
		keywords: ['nim game online', 'play nim', 'nim strategy', 'nim heaps game', 'combinatorial game', 'nim unblocked'],
		genre: 'Strategy',
		about: 'Nim is one of the oldest known strategy games and the foundation of combinatorial game theory. Remove objects from rows; take the last one to win.'
	},
	'hex': {
		title: 'Hex Board Game Online — Play Hex Free in Your Browser',
		description: 'Play Hex online, the connection game invented by Piet Hein and John Nash. Connect your two sides on a hexagonal board. Free, mobile friendly, school safe.',
		keywords: ['hex game online', 'play hex board game', 'piet hein hex', 'john nash hex', 'connection game', 'hex unblocked'],
		genre: 'Strategy',
		about: 'Hex is a connection game invented independently by Piet Hein (1942) and John Nash (1948). Place stones to build an unbroken chain between your two sides of the board.'
	},
	'krypto': {
		title: 'Krypto Math Game Online — Play the Classroom Arithmetic Game Free',
		description: 'Play Krypto online: combine five number cards with +, −, x, ÷ to hit a target. Free math game used in schools and competitions. Mobile and school friendly.',
		keywords: ['krypto math game', 'krypto game online', 'math card game', 'arithmetic puzzle game', 'mental math game', 'classroom math game'],
		genre: 'Educational',
		about: 'Krypto is a mental-arithmetic card game endorsed by the NCTM. Combine five numbers with the four basic operations to land exactly on the target.'
	},
	'shotsim': {
		title: 'ShotSim — Projectile Physics Cannon Game Online Free',
		description: 'ShotSim is a projectile physics game: aim a cannon, set angle and power, hit the hoop. Learn parabolic motion by playing. Free, mobile and school friendly.',
		keywords: ['projectile motion game', 'cannon physics game', 'parabolic trajectory game', 'physics simulator game', 'angle and power game', 'shotsim'],
		genre: 'Simulation',
		about: 'ShotSim turns Galileo\'s discovery — that projectiles follow parabolas — into a target game. Dial in angle and power until your shot drops through the hoop.'
	},
	'vectorracing': {
		title: 'Vector Racing Game — Play Racetrack (Paper Racing) Online Free',
		description: 'Play Vector Racing online, the classic paper-and-pencil physics racing game. Adjust velocity ±1 each turn and stay on the track. Free, mobile and school friendly.',
		keywords: ['vector racing game', 'racetrack paper game', 'paper racing game online', 'vector race', 'momentum racing game', 'graph paper racing'],
		genre: 'Strategy',
		about: 'Vector Racing (also known as Racetrack or Paper Racing) is a 1960s pencil-and-paper game popularized by Martin Gardner. Each turn you change velocity by at most ±1 in either axis — momentum carries you the rest of the way.'
	},
	'tracksofgalileo': {
		title: 'Tracks of Galileo — Brachistochrone Curve Game Online',
		description: 'Tracks of Galileo: design a track and race the ball downhill. Discover the brachistochrone — the curve of fastest descent. Free physics game, mobile friendly.',
		keywords: ['brachistochrone game', 'curve of fastest descent', 'cycloid puzzle', 'galileo brachistochrone', 'physics curve game'],
		genre: 'Simulation',
		about: 'The brachistochrone problem — find the curve of fastest descent — was posed by Johann Bernoulli in 1696 and solved by Newton, Leibniz, and the Bernoullis. The answer is a cycloid. Can you find it by feel?'
	},
	'lunarlander': {
		title: 'Lunar Lander Game Online — Play the Classic Moon Landing Free',
		description: 'Play Lunar Lander online free. Fire thrusters, manage fuel, and touch down softly on the moon. The 1979 arcade classic, in your browser. Mobile and school friendly.',
		keywords: ['lunar lander game', 'play lunar lander online', 'atari lunar lander', 'moon landing game', 'rocket landing simulator', 'lunar lander unblocked'],
		genre: 'Simulation',
		about: 'Lunar Lander is a thrust-vs-gravity classic descended from a 1969 text simulation and Atari\'s 1979 arcade hit. Touch down gently, upright, on the pad — with the fuel you have left.'
	},
	'epidemicsim': {
		title: 'Epidemic Simulator — SIR Model Virus Spread Game Online',
		description: 'Play an epidemic simulator online. Use mobility, testing, and quarantine to manage a virus outbreak in a population. SIR-model based, mobile and school friendly.',
		keywords: ['epidemic simulator', 'sir model game', 'virus spread simulation', 'pandemic simulator', 'disease spread game', 'flatten the curve game'],
		genre: 'Simulation',
		about: 'This epidemic simulator is built on the SIR (Susceptible–Infected–Recovered) model developed by Kermack and McKendrick in 1927 — the same math behind every "flatten the curve" chart you saw in 2020.'
	},
	'lasermaze': {
		title: 'Laser Maze Online — Physics Mirror Puzzle Game Free',
		description: 'Play Laser Maze online free. Rotate mirrors and dodge blocks to guide a laser beam to its target. A classic physics puzzle in your browser.',
		keywords: ['laser maze online', 'laser mirror puzzle', 'physics laser game', 'mirror reflection game', 'light bounce puzzle', 'laser maze unblocked'],
		genre: 'Puzzle',
		about: 'Laser Maze is a logic puzzle based on the physics of reflection. Use 90-degree mirrors to guide a light beam through an obstacle course to a target.'
	},
	'blockdude': {
		title: 'Block Dude Online — Play the Classic TI-84 Calculator Game Free',
		description: 'Play Block Dude online free. The classic graphing calculator puzzle game. Stack blocks to reach the exit. No downloads, mobile friendly, school safe.',
		keywords: ['block dude online', 'play block dude', 'ti-84 block dude', 'calculator games online', 'block dude unblocked', 'stacking block puzzle'],
		genre: 'Puzzle',
		about: 'Block Dude is a legendary puzzle game from the TI-83/84 calculator era. Move blocks, build staircases, and find your way to the exit in this grid-based logic classic.'
	}
};
