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

### Session 3: Tile Map System & Level Data ✅

Replaced hardcoded test map with data-driven level system. Added interactive tiles, NPCs, and Camera extraction.

- Created `js/camera.js` (extracted from renderer, instant follow, worldToScreen/screenToWorld)
- Created `js/tilemap.js` (TileType enum, JSON loading, per-tile state, isSolid/interact, NPC collision)
- Created `js/npc.js` (grid-to-pixel positioning, interaction range, talked-to tracking)
- Created `data/levels/level1.json` (30x22 dungeon with 3 apostle paths, doors, chests, altar, NPCs)
- Refactored `js/render.js` (8 tile types with animations, NPC drawing, interaction prompt)
- Refactored `js/game.js` (async loadLevel, LOADING state, interaction system, save/load tile & NPC state)

### Session 4: Dialogue System (New) ✅

Replaced 5 old dialogue files with one unified DialogueSystem. Fully integrated with game loop.

- Deleted `js/dialogue.js` (old), `js/dialogueSystem.js`, `js/textRenderer.js`, `js/sampleDialogue.js`, `js/gameDialogueData.js`
- Created `js/dialogue.js` (unified DialogueSystem: typewriter, auto-split at 15 words, branching choices, quest flags, TTS, portrait placeholders)
- Created `content/level1_dialogue.js` (18 dialogue sequences: tutorial, 3 apostles with quiz branches, Roman Guard branching, boss prefight, victory)
- Refactored `js/game.js` (DIALOGUE state integration, quest flag save/load)
- Updated `js/input.js` (added T, 1-4 to game keys)

### Session 5: Combat System ✅

Turn-based combat with educational questions. Enemy patrol, collision, victory/defeat flows.

- Created `js/combat.js` (CombatSystem: 8 sub-states, attack/defend/question/item actions, enemy AI, boss patterns, fade transitions, floating damage numbers, full combat UI)
- Created `js/questions.js` (QuestionSystem: loads from JSON, tracks asked questions, filters by level)
- Created `data/enemies.json` (3 enemy types: Doubtful Villager, Roman Scout, Roman Centurion boss)
- Created `data/questions.json` (8 Level 1 educational questions with explanations)
- Refactored `js/render.js` (enemy drawing on overworld with boss crown indicators)
- Refactored `js/game.js` (enemy spawning/patrol/collision, combat state wiring, defeated enemies persistence, checkpoint system)

### Session 6: Inventory & Items ✅

Full inventory system with item management, equipment, combat integration, and save/load.

- Created `data/items.json` (9 item definitions: consumables, equipment, quest items, collectibles)
- Created `js/inventory.js` (InventorySystem: 20-slot grid, equipment slots, consumable usage in/out of combat, sub-menu actions, notification popups, serialization)
- Refactored `js/player.js` (equipmentBonus property, getEffectiveAttack/getEffectiveDefense methods)
- Refactored `js/combat.js` (ITEM_SELECT sub-state, item menu UI, effective stats in damage formulas, item name display on victory)
- Refactored `js/game.js` (floor item spawning, auto-pickup, chest→inventory, catacomb key→unlock doors, combat drops, inventory state, save/load for inventory and picked-up items)
- Refactored `js/render.js` (floor item drawing with bobbing/glow/sparkle animations)
- Updated `data/levels/level1.json` (4 floor items, chest contents mapped to item IDs)
- Updated `data/enemies.json` (Roman Scout drops bread, Centurion drops scripture_scroll)

### Session 7: Save System & HUD ✅

Implemented complete 3-slot save system with auto-save, manual save at altars, and full heads-up display. Settings screen with persistent preferences. All dyslexia-friendly with OpenDyslexic font and accessibility features.

- Created `js/save.js` (SaveSystem class: 3 slots, auto-save every 2min + event triggers, slot picker UI, preview with playtime/progress, error handling, toast notifications)
- Created `js/hud.js` (HUD class: health bar with HP/MaxHP + XP bar, dynamic objective tracking, level progress indicator, quick-use item slots 1-2-3, toast notifications)
- Updated `js/config.js` (added GameState.SETTINGS, GameState.SAVE_SLOTS, GameState.LOAD_SLOTS)
- Refactored `js/screens.js` (+180 lines: full settings screen with text size/TTS/volume controls, settings persistence to localStorage, enabled Continue and Settings on title screen)
- Refactored `js/game.js` (+200 lines: SaveSystem and HUD integration, title Continue→load slot picker, title/pause Settings→settings screen, altar→save slot picker, auto-save triggers, new methods: autoSave/saveToSlot/loadGameFromSlot/restoreSaveData, state handlers for SETTINGS/SAVE_SLOTS/LOAD_SLOTS, HUD rendering, playtime tracking)
- Updated `index.html` (added script tags for save.js and hud.js)

### Session 8: Level 1 Complete & Tutorial ✅

Fully playable Level 1 from start to finish. Tutorial system teaches all mechanics. Victory condition with stats screen. Boss pre-fight dialogue and post-victory flow.

- Updated `data/levels/level1.json` (added tutorial enemy: doubtful_villager near starting area)
- Updated `content/level1_dialogue.js` (added boss_victory dialogue, tutorial_combat dialogue, expanded victory dialogue with level1_complete flag)
- Refactored `js/hud.js` (fixed objective tracking: correct quest flag names, coin counting from quest flags instead of inventory, added boss_defeated and level1_complete objectives)
- Refactored `js/screens.js` (+60 lines: renderVictory screen with playtime, enemies defeated, coins, items found, player level stats, "To be continued" message)
- Refactored `js/game.js` (+120 lines: tutorial system via quest flags with HUD notifications for movement/interact/save/combat/inventory, checkDialogueRewards for awarding apostle_coin items from coin flags, boss pre-fight dialogue before centurion combat, boss_victory dialogue after centurion defeat, handleStairsInteraction with victory condition checking, enterVictoryState with stats collection, updateVictory state handler, fixed dialogue→combat state transition bug)

### Session 9: Level 2 - Persecutions & Stealth ✅

Complete Level 2 with new stealth mechanic. Guards patrol with vision cones. Hiding spots (alcove tiles). Martyr Token quest system. Level transition from Level 1 to Level 2.

- Created `data/levels/level2.json` (25x20 winding catacomb labyrinth with patrol guards, hiding spots, shrine room, escape tunnel, 6 NPCs, 6 enemies with waypoint patrol routes, 4 floor items)
- Created `content/level2_dialogue.js` (4 martyr stories with branching choices: Polycarp, Ignatius, Perpetua, Felicity; Ichthys teaching; guard encounters; Polycarp guide NPC; boss pre-fight/victory; victory dialogue; ~35 dialogue nodes)
- Updated `data/enemies.json` (+3 enemy types: Roman Patrol with stealth flag, Informant, Roman Prefect boss)
- Updated `data/items.json` (+3 items: Martyr Token quest item, Ichthys Pendant equipment, Church Father Letter collectible)
- Updated `data/questions.json` (+6 Level 2 questions: persecution, martyrdom, fish symbol, Ichthys meaning, catacombs, Polycarp)
- Updated `js/tilemap.js` (added TileType.HIDING = 8 for alcove/hiding spot tiles)
- Refactored `js/render.js` (+120 lines: drawHidingSpot tile, drawVisionCone for semi-transparent triangular guard vision, drawAlertIndicator with "!" and "!!" above guards, vision cones and alert indicators integrated into main render loop)
- Refactored `js/game.js` (+250 lines: waypoint patrol system with updateWaypointPatrol/updateSimplePatrol, vision cone calculation with updateVisionCone/isPointInVisionCone, detection system with updateDetection/triggerStealthCombat, hiding spot awareness via TileType.HIDING check, stealth bypass bonus XP via checkStealthBypass, Ichthys Pendant reduces detection range, level transition system with transitionToLevel/registerLevelDialogues, multi-level boss dialogue and victory conditions via handleLevel1Stairs/handleLevel2Stairs, countMartyrTokens helper, checkDialogueRewards extended for martyr tokens, "HIDDEN" indicator when player in alcove, stealth tutorial hint)
- Refactored `js/hud.js` (multi-level objective tracking with _getLevel1Objective/_getLevel2Objective, multi-level progress display with _countMartyrTokens, dynamic coins/tokens label)
- Updated `index.html` (added level2_dialogue.js script tag)

---

## Remaining Sessions

Each session plan is in its own file under `sessions/`:

| Session | File | Model | Description |
|---------|------|-------|-------------|
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
