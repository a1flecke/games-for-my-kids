# Project Memory: games-for-my-kids

## Tech Stack
- Vanilla JS/HTML5/CSS3, no build step
- catacombs-and-creeds is the most complex game (multi-file, Canvas-based)
- Use `eval "$(mise activate bash)"` before node/yarn commands

## Catacombs-and-Creeds Architecture
- `js/game.js` — main game engine, state machine
- `js/tilemap.js` — map, tile types, interact() takes optional playerTile param
- `js/render.js` — canvas rendering, drawInteractionPrompt(player, label)
- `js/dialogue.js` — dialogue system, uses portraits.js for character art
- `js/portraits.js` — pixel art portraits (created in Feb 2026)
- `js/save.js` — 3-slot save system; autoSave() skips if currentSlot === null
- `js/questions.js` — question bank, Fisher-Yates shuffle, session-wide tracking
- `js/inventory.js` — inventory UI, panel now 580×560 (fixed layout overlap)
- `content/level1_dialogue.js` — Level 1 dialogue; guide NPC is now "Priscilla" (not Peter)

## Key Design Decisions (Feb 2026 batch fixes)
- Guide NPC renamed from "Peter" to "Priscilla" to avoid confusion with Apostle Peter
- New game flow: slot picker appears BEFORE starting new game (autoSave guard)
- Door close is blocked if player stands on it (playerTile check in tilemap.js)
- Interaction prompt now shows contextual labels: "SPACE: Talk", "SPACE: Open", etc.
- Shadow opacity reduced from 0.3 → 0.12 on all entities (less distracting dots)
- Question bank expanded 33 → 66 questions with Fisher-Yates answer shuffling
- Home button added to all 10 game index.html files

## Tile Type System (catacombs-and-creeds/js/tilemap.js)
Walkable tiles (player can pass through): FLOOR=0, DOOR=2, ALTAR=4, STAIRS=7, HIDING=8, LATIN_TILE=11, MARBLE=13
Solid tiles (block movement): WALL=1, CHEST=3, TORCH=5, WATER=6, BOOKSHELF=9, HIDDEN_WALL=10, BARRIER=12, PILLAR=14
Critical gotchas: CHEST(3)=SOLID, HIDING(8)=WALKABLE, LATIN_TILE(11)=WALKABLE, MARBLE(13)=WALKABLE, PILLAR(14)=SOLID
BFS reachability: use solid set {1,3,5,6,9,10,12,14}; all 5 levels verified reachable (Feb 2026)

## Flag Names (important for save compatibility)
- `met_priscilla_guide` (was `met_peter_guide`) — set when player meets the guide
- `coin_peter`, `coin_james`, `coin_john` — apostle coins collected
- `boss_defeated`, `level1_complete` — progression flags

## Accessibility Rules (non-negotiable)
- Font: OpenDyslexic CDN, Comic Sans fallback, min 16pt
- Colors: cream bg #F5F0E8, dark text #2C2416
- 44×44px minimum touch targets
- Max 15 words per dialogue box
- No flashing effects

## keyboard-command-4: status
- Session 1 complete (foundation: HTML shell, CSS, game.js state machine, save.js).
- 12 sessions remaining (2–13). See `sessions/MODEL-ASSIGNMENTS.md` for model assignments.
- Save key: `keyboard-command-4-save`
- Run `/kc4-checklist` before each session. Run kc4-web-review agent after.
- `kc4-web-review` agent is at `.claude/agents/kc4-web-review/agent.md` but must be invoked via `general-purpose` subagent type (custom agent types not recognized by Task tool).

## keyboard-command-4: key gotchas
- Only `preventDefault()` keys you actually handle in gameplay — never blanket-prevent all keys (breaks accessibility, browser controls).
- Pause overlay Escape: global `_handleKeyDown` needs a PAUSED branch as fallback if focus escapes the overlay.
- "Quit to Menu" from pause: close overlay directly without setting state to GAMEPLAY first (avoids momentary wrong state).
- Locked level cards: don't use `opacity: 0.5` (fails WCAG AA) — use darker background + `var(--text-secondary)` instead.
- Title screen "press any key": filter CapsLock, Fn, Dead, NumLock, ScrollLock in addition to Shift/Control/Alt/Meta.
- `aria-live` goes on a small dedicated `#hud-status` element, not the entire HUD (too verbose).
