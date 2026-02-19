# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Collection of educational browser games for 3rd-6th grade students (ages 8-12), some designed with dyslexia and ADHD accommodations. All games are self-contained in their own directories and deployed to GitHub Pages.

## Tech Stack

- **Vanilla JavaScript (ES6+)**, HTML5, CSS3 — no frameworks, no bundlers, no npm
- **HTML5 Canvas** for game rendering (catacombs-and-creeds)
- **Web Audio API** for sound (planned)
- **LocalStorage** for save data
- Games run directly in-browser with no build step

## Environment

Use `mise` to manage `node` and `yarn` versions. Activate mise shell before running node/yarn:
```bash
eval "$(mise activate bash)"
```

## Development Workflow

There is no build, lint, or test step. Edit files directly and commit.

**Regenerate the main index page locally:**
```bash
node .github/scripts/update-index.js
```

**Deployment:** Pushing to `main` triggers `.github/workflows/update-index.yml` which regenerates `index.html` and deploys to GitHub Pages. The workflow auto-commits index changes with `[skip ci]`.

## Adding a New Game

1. Create a directory with the game name (e.g., `my-game/`)
2. Add an `index.html` inside it — the `<title>` tag is extracted for the index page
3. To customize the card on the index page, add an entry to `manualGameConfig` in `.github/scripts/update-index.js` with icon, title, and description
4. Push to `main` — the workflow handles the rest

## Architecture

Each game is independent — no shared libraries or components between games. Games range from single-file (`index.html` with inline JS/CSS) to multi-file modular JS (e.g., `catacombs-and-creeds/` with separate renderer, dialogue, game logic).

### catacombs-and-creeds (active development)

Educational dungeon crawler — the most complex game. Key docs:
- `plan.md` — full design spec (1700 lines): levels, mechanics, accessibility requirements, content

Current state (Feb 2026): All 5 levels built with full content. Core systems complete: combat, inventory (580×560 panel), 3-slot save system, dialogue with pixel-art portraits, question bank (66 questions), NPC/enemy/item placement verified reachable across all maps.

**Key source files:**
- `js/game.js` — main engine/state machine
- `js/tilemap.js` — map, tile types; interact() takes optional playerTile param
- `js/render.js` — Canvas rendering
- `js/dialogue.js` — dialogue system using portraits.js
- `js/portraits.js` — pixel-art portraits for 7 characters
- `js/save.js` — 3-slot save; autoSave() skips if currentSlot === null
- `js/questions.js` — 66-question bank, Fisher-Yates shuffle, session-wide deduplication
- `content/level1_dialogue.js` — guide NPC is "Priscilla" (not Peter)
- `data/levels/level{1-5}.json` — level maps and entity placement

**Tile type walkability** (critical for map editing — do not confuse):
- Walkable: FLOOR=0, DOOR=2, ALTAR=4, STAIRS=7, HIDING=8, LATIN_TILE=11, MARBLE=13
- Solid: WALL=1, CHEST=3, TORCH=5, WATER=6, BOOKSHELF=9, HIDDEN_WALL=10, BARRIER=12, PILLAR=14

Use `/verify-maps` skill to BFS-check all level maps for reachability after editing.

**Target platform:** iPad Safari with Bluetooth keyboard. Must maintain 60fps on iPad.

## Accessibility Requirements (catacombs-and-creeds)

These are non-negotiable for the target audience:
- **Font:** OpenDyslexic via CDN with Comic Sans MS fallback (Comic Sans is pre-installed on iPads), minimum 16pt, 1.5-2x line height
- **Colors:** Cream background (#F5F0E8), dark text (#2C2416), WCAG AA contrast (4.5:1)
- **Text:** Maximum 15 words per dialogue box, no time pressure, typewriter effect skippable
- **ADHD:** Auto-save every 2 minutes, always-visible objectives, 9-18 min per level
- **Touch targets:** 44x44px minimum
- **No flashing/strobing effects**
