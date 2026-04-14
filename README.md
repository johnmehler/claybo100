# Claybo100: Game Station

A premium game collection platform built with Svelte 5, featuring a high-fidelity glassmorphic interface and smooth micro-interactions.

## Features

- **Game Selection Hub:** A central menu to discover and launch different gaming experiences.
- **Sliding Tiles Game:** A classical 15-puzzle with modern physics, shimmer effects, and guaranteed solvability.
- **Anagrams Game:** A high-speed word hunt using Scrabble letter distribution and a 60-second timer.
- **Premium UX:** Seamless transitions (fade/fly), glassmorphism, and responsive design.
- **Style Compliance:** Adheres to a strict "no translates on hover" design policy.

## Tech Stack

- **Framework:** Svelte 5 (Runes)
- **Build Tool:** Vite
- **Styling:** Vanilla CSS
- **Typography:** Outfit (Google Fonts)

## Games

### 1. Sliding Tiles
Arrange the tiles in numerical order (1-15) by sliding them into the empty space.
- **Logic:** Legal-move shuffling ensures every puzzle is solvable.

### 2. Anagrams
Find as many words as possible from 7 randomly drawn letters in one minute.
- **Letter Odds:** Based on standard Scrabble distribution for a realistic challenge.
- **Scoring:** Progressive points based on word length.
- **Validation:** Automatic check to ensure words use the provided letter set.

## Getting Started

### Installation
1. `npm install`
2. `npm run dev`
