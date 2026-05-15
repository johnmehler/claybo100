// Per-game SEO metadata. Targets long-tail search intents.
// Keep titles under ~60 chars and descriptions under ~155 chars where practical.

export type GameSEO = {
	title: string;            // <title> tag
	description: string;      // <meta name="description">
	keywords: string[];       // long-tail terms (used for og + schema)
	genre: string;            // schema.org Game/VideoGame genre
	about: string;            // 1-2 sentence intro paragraph rendered on page
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
	}
};
