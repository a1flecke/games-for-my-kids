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
- `IMPLEMENTATION.md` — 14-session build plan with model recommendations, code audit, and bug list

Current state: basic game loop, player movement, renderer, and dialogue prototypes exist but have known bugs (documented in IMPLEMENTATION.md). Core systems like combat, inventory, save slots, and levels 2-5 are not yet built.

**Target platform:** iPad Safari with Bluetooth keyboard. Must maintain 60fps on iPad.

## Accessibility Requirements (catacombs-and-creeds)

These are non-negotiable for the target audience:
- **Font:** OpenDyslexic via CDN with Comic Sans MS fallback (Comic Sans is pre-installed on iPads), minimum 16pt, 1.5-2x line height
- **Colors:** Cream background (#F5F0E8), dark text (#2C2416), WCAG AA contrast (4.5:1)
- **Text:** Maximum 15 words per dialogue box, no time pressure, typewriter effect skippable
- **ADHD:** Auto-save every 2 minutes, always-visible objectives, 9-18 min per level
- **Touch targets:** 44x44px minimum
- **No flashing/strobing effects**
