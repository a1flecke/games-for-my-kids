# Catacombs & Creeds: Implementation Plan

## Pre-Implementation Notes

### Existing Code Audit

The following files exist and contain working (but incomplete/buggy) code:

| File | Status | Notes |
|------|--------|-------|
| `index.html` | Broken | Script paths wrong (`renderer.js` instead of `js/render.js`), only loads 2 of 7 JS files |
| `js/game.js` | Partial | Has Map, Player, InputHandler, Game classes. `class Map` shadows JS built-in `Map`. No game states. |
| `js/render.js` | Partial | Floor/wall rendering, camera with lerp (plan says no smoothing). Only 2 tile types. |
| `js/dialogue.js` | Duplicate | `DialogueManager` class. 'A' key conflicts with WASD movement. Not integrated into game. |
| `js/dialogueSystem.js` | Duplicate | `DialogueSystem` class. Overlaps dialogue.js entirely. Not integrated into game. |
| `js/textRenderer.js` | Partial | Dyslexia-friendly text box rendering. Works but not connected to game loop. |
| `js/gameDialogueData.js` | Content | Dialogue data for Level 1 characters. Quiz actions return objects instead of modifying game state. |
| `js/sampleDialogue.js` | Content | Test dialogue sequences. Actions just `console.log`. |
| `assets/portraits/` | Placeholder | 4 tiny PNGs (~800 bytes each): peter, paul, lydia, timothy |

### Bugs to Fix

1. **`class Map` shadows built-in `Map`** (`game.js:8`) - Rename to `TileMap` or `GameMap`
2. **'A' key toggles auto-advance during gameplay** (`dialogue.js:308`) - Conflicts with WASD left-movement
3. **Script paths broken in index.html** (lines 98-99) - Files are in `js/` not root
4. **Camera uses lerp smoothing** (`render.js:63-65`) - Plan specifies instant follow for clarity
5. **Auto-save too frequent** (`game.js:313`) - Plan says every 2 minutes
6. **Text truncation silently drops content** (`textRenderer.js:133-139`) - Should split into multiple dialogue boxes, not cut off educational content with "..."
7. **Quiz choice actions return objects but nothing receives them** (`gameDialogueData.js:82-108`) - Need to integrate with game state

### Plan Issues / Corrections

These are inconsistencies or problems in `plan.md` itself:

1. **Enemy count mismatch** (Section 5.1 vs 7.3): Level 1 lists "3 enemy types + 1 boss" but only defines 2 regular enemies + 1 boss (Doubtful Villager, Roman Scout, Roman Centurion). Section 7.3 claims 15 enemy types total across 5 levels but only 12-13 are defined.
2. **Apostle Coins count wrong** (Section 7.4): Says "Apostle Coins (12 total, 3 per level 1)" but the game has 5 levels and coins only appear in Level 1. The number 12 seems to reference the 12 apostles but only 3 coins are collectible.
3. **Movement description contradicts itself** (Section 4.2): Says "Tile-based with pixel-perfect movement" but describes continuous pixel movement with speed in pixels-per-frame, not tile-snapping.
4. **Player sprite size inconsistency** (Section 6.1 vs code): Plan says "24x32" but existing code uses 24x24 square.
5. **Player speed mismatch** (Section 4.2 vs code): Plan says "2 pixels per frame" but code uses 3.
6. **OpenDyslexic font not bundled**: Plan references it as primary font but no font files exist in `assets/fonts/`. Need to either bundle it, use a CDN, or rely on Comic Sans MS fallback.
7. **15-word limit too restrictive for some educational content**: Several existing dialogue entries exceed 15 words. The system should split long text across multiple boxes automatically rather than truncating.
8. **No penalty for wrong quiz answers undermines learning**: Plan says incorrect = "no benefit, can retry" which encourages random guessing. Should add light feedback (e.g., brief explanation of why it's wrong) before retry.

### Architecture Decisions

1. **Consolidate dialogue systems**: Delete `dialogue.js`, `dialogueSystem.js`, and `textRenderer.js`. Write one clean `DialogueSystem` that handles state, rendering, typewriter, choices, TTS, and portrait management.
2. **Rename `Map` to `TileMap`**: Avoid shadowing the JS built-in.
3. **Keep consolidated file structure**: The plan calls for 18+ JS files but vanilla JS with script tags makes load-order management painful. Instead, use ~10 well-organized files with clear responsibilities.
4. **Game state machine**: Central to all other work. Must be implemented first.
5. **JSON data files for levels**: Maps, enemies, items, and questions should live in JSON files under `data/`, loaded at runtime. Dialogue content stays in JS for now (easier to include callbacks/branching logic).

### Target File Structure (Revised from Plan)

```
catacombs-and-creeds/
├── index.html              # Entry point, loads all scripts in order
├── css/
│   └── style.css           # Extracted styles from inline HTML
├── js/
│   ├── config.js           # All game constants and configuration
│   ├── utils.js            # Utility functions (AABB, math helpers)
│   ├── input.js            # Keyboard + touch input handler
│   ├── tilemap.js          # TileMap class (renamed from Map)
│   ├── camera.js           # Camera system (instant follow, clamped)
│   ├── player.js           # Player entity (movement, stats, collision)
│   ├── npc.js              # NPC entities (position, interaction trigger)
│   ├── enemy.js            # Enemy entities + basic AI
│   ├── dialogue.js         # NEW unified dialogue system
│   ├── combat.js           # Turn-based combat engine + UI
│   ├── inventory.js        # Inventory management + UI
│   ├── questions.js        # Question bank + quiz UI
│   ├── save.js             # Save/load with 3 slots
│   ├── audio.js            # Web Audio API manager
│   ├── hud.js              # HUD rendering (health, objectives, minimap)
│   ├── screens.js          # Title, pause, game over, victory screens
│   ├── renderer.js         # Main rendering engine
│   └── game.js             # Game loop, state machine, orchestration
├── data/
│   ├── levels/
│   │   ├── level1.json     # Map + NPC positions + enemy positions + triggers
│   │   ├── level2.json
│   │   ├── level3.json
│   │   ├── level4.json
│   │   └── level5.json
│   ├── enemies.json        # Enemy type definitions (stats, sprites)
│   ├── items.json          # Item definitions
│   └── questions.json      # Full question bank (all 30 questions)
├── content/
│   ├── level1_dialogue.js  # Level 1 dialogue trees
│   ├── level2_dialogue.js  # Level 2 dialogue trees
│   ├── level3_dialogue.js  # Level 3 dialogue trees
│   ├── level4_dialogue.js  # Level 4 dialogue trees
│   └── level5_dialogue.js  # Level 5 dialogue trees
├── assets/
│   ├── portraits/          # 64x64 character portraits (placeholder PNGs exist)
│   └── fonts/              # OpenDyslexic if bundled, otherwise use CSS fallback
└── service-worker.js       # For offline play (final session)
```

---

## Completed Sessions

### Session 1: Project Foundation & Game State Machine ✅

Fixed all broken infrastructure. Established game state machine. Game loads correctly, renders the existing map, player moves, and the state machine framework exists.

- Created `css/style.css`, `js/config.js`, `js/utils.js`
- Rewrote `index.html` with correct script paths
- Renamed `Map` to `TileMap`, implemented state machine in `game.js`
- Fixed camera (instant follow), fixed player speed (2)

### Session 2: Input System, Player Refactor & Title Screen ✅

Decoupled input from player, extracted Player with RPG stats, added title screen and pause menu.

- Created `js/input.js` (isDown/wasPressed, no player coupling)
- Created `js/player.js` (HP, attack, defense, XP, level, gainXP, levelUp, etc.)
- Created `js/screens.js` (title screen, pause overlay, menu navigation)
- Refactored `game.js` (starts in TITLE state, startNewGame(), state-based input routing)

---

## Remaining Sessions

Each session plan is in its own file under `sessions/`:

| Session | File | Model | Description |
|---------|------|-------|-------------|
| 3 | [session-03.md](sessions/session-03.md) | Opus | Tile Map System & Level Data |
| 4 | [session-04.md](sessions/session-04.md) | Opus | Dialogue System (New) |
| 5 | [session-05.md](sessions/session-05.md) | Opus | Combat System |
| 6 | [session-06.md](sessions/session-06.md) | Sonnet | Inventory & Items |
| 7 | [session-07.md](sessions/session-07.md) | Sonnet | Save System & HUD |
| 8 | [session-08.md](sessions/session-08.md) | Opus | Level 1 Complete & Tutorial |
| 9 | [session-09.md](sessions/session-09.md) | Opus | Level 2 - Persecutions & Stealth |
| 10 | [session-10.md](sessions/session-10.md) | Sonnet | Level 3 - Creeds & Puzzles |
| 11 | [session-11.md](sessions/session-11.md) | Sonnet | Level 4 - Church Fathers & Abilities |
| 12 | [session-12.md](sessions/session-12.md) | Opus | Level 5 - Constantine & Final Challenge |
| 13 | [session-13.md](sessions/session-13.md) | Sonnet | Audio System |
| 14 | [session-14.md](sessions/session-14.md) | Sonnet | Polish, Accessibility & Deployment |

---

## Session Dependency Graph

```
Session 1: Foundation (Opus) ──────┐
                                   ▼
Session 2: Input/Player (Sonnet) ──┐
                                   ▼
Session 3: Maps/Levels (Opus) ─────┐
                                   ▼
         ┌─────────────────────────┼──────────────────────────┐
         ▼                         ▼                          ▼
Session 4: Dialogue (Opus)   Session 5: Combat (Opus)   Session 6: Inventory (Sonnet)
         │                         │                          │
         └─────────────────────────┼──────────────────────────┘
                                   ▼
                         Session 7: Save/HUD (Sonnet)
                                   ▼
                         Session 8: Level 1 Complete (Opus)
                                   ▼
         ┌─────────────────────────┼──────────────────────────┐
         ▼                         ▼                          ▼
Session 9: Level 2 (Opus)   Session 10: Level 3 (Sonnet) Session 11: Level 4 (Sonnet)
(Stealth)                   (Puzzles)                     (Abilities)
         └─────────────────────────┼──────────────────────────┘
                                   ▼
                         Session 12: Level 5 (Opus)
                                   ▼
                         Session 13: Audio (Sonnet)
                                   ▼
                         Session 14: Polish & Deploy (Sonnet)
```

**Notes:**
- Sessions 1-3 are strictly sequential (each builds on the last)
- Sessions 4, 5, 6 can theoretically be done in any order after Session 3, but the listed order is recommended since dialogue is the most fundamental interaction
- Sessions 9, 10, 11 can be done in any order after Session 8, since each level is independent (but the order matters for the player experience and each introduces mechanics used in Level 5)
- Session 12 requires all level mechanics from Sessions 9-11 (final boss uses them all)
- Session 13 (audio) can technically be done anytime after Session 1, but doing it late avoids rework as systems are added
- Session 14 must be last

---

## Model Recommendation Summary

| Session | Model | Rationale |
|---------|-------|-----------|
| 1. Foundation & State Machine | **Opus** | Critical architecture, multiple broken files to refactor, sets foundation for everything |
| 2. Input/Player/Title Screen | **Sonnet** | Well-defined extraction and creation tasks with clear specs |
| 3. Maps & Level Data | **Opus** | JSON format design, level loader architecture, interactive tile system |
| 4. Dialogue System (New) | **Opus** | New system from scratch replacing 3 files, complex state/rendering/branching |
| 5. Combat System | **Opus** | Many interacting parts: turns, formulas, AI, questions, UI, transitions |
| 6. Inventory & Items | **Sonnet** | Well-defined grid system with clear item categories and effects |
| 7. Save System & HUD | **Sonnet** | Standard localStorage patterns, straightforward canvas HUD |
| 8. Level 1 Complete | **Opus** | Full integration of all systems, tutorial design, content + balancing |
| 9. Level 2 (Stealth) | **Opus** | New stealth mechanic with vision cones, patrol AI, detection logic |
| 10. Level 3 (Puzzles) | **Sonnet** | Well-defined ordering puzzle, builds on existing combat for boss |
| 11. Level 4 (Abilities) | **Sonnet** | Clear ability triggers, environmental gating follows established patterns |
| 12. Level 5 (Final) | **Opus** | Multi-phase boss using ALL mechanics, 3-act structure, victory sequence |
| 13. Audio System | **Sonnet** | Web Audio API synthesis follows documented patterns, repetitive work |
| 14. Polish & Deploy | **Sonnet** | Systematic fixes, testing, and standard service worker setup |

**Opus sessions: 7** (Sessions 1, 3, 4, 5, 8, 9, 12)
**Sonnet sessions: 7** (Sessions 2, 6, 7, 10, 11, 13, 14)

---

## Estimated Scope Per Session

| Session | New Files | Modified Files | Complexity | Model |
|---------|-----------|----------------|------------|-------|
| 1. Foundation | 3 | 3 | Medium | Opus |
| 2. Input/Player/Title | 3 | 2 | Medium | Sonnet |
| 3. Maps/Levels | 4 | 3 | Medium-High | Opus |
| 4. Dialogue | 2 | 3 (+3 deleted) | High | Opus |
| 5. Combat | 4 | 3 | High | Opus |
| 6. Inventory | 2 | 6 | Medium-High | Sonnet |
| 7. Save/HUD | 2 | 4 | Medium | Sonnet |
| 8. Level 1 Complete | 0 | 7 | High | Opus |
| 9. Level 2 (Stealth) | 2 | 7 | High | Opus |
| 10. Level 3 (Puzzles) | 3 | 6 | High | Sonnet |
| 11. Level 4 (Abilities) | 3 | 6 | High | Sonnet |
| 12. Level 5 (Final) | 2 | 6 | Very High | Opus |
| 13. Audio | 1 | 8 | Medium-High | Sonnet |
| 14. Polish/Deploy | 1 | Multiple | Medium | Sonnet |

**Total: 14 sessions**
