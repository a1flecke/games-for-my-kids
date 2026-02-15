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

### Session 10: Level 3 - Creeds & Puzzles ✅

Complete Level 3 (The Grand Library) with new puzzle mechanic and multi-phase boss. Players collect 5 Creed Fragments from bishops, assemble the Nicene Creed at the Council Lectern puzzle, then debate Arius in a multi-phase boss fight.

- Created `data/levels/level3.json` (22x18 Grand Library with bookshelf-lined halls, council chamber, debate hall; 7 NPCs: Athanasius guide + 5 Bishops + Council Lectern; 5 enemies: 2 confused scholars, 2 Arian followers, boss Arius; puzzle-locked door; 2 chests; 4 floor items)
- Created `content/level3_dialogue.js` (~35 dialogue nodes: Athanasius intro, 5 bishop quests with branching choices each granting a Creed Fragment flag, puzzle intro/not-ready/complete, Arius boss pre-fight/victory, level victory)
- Created `js/puzzle.js` (PuzzleSystem class: 5 Creed Fragments with correct ordering, shuffle mechanics, source/target area navigation, pick-up/place/swap, hint system after 2 wrong attempts, result overlay, educational teaching text for each fragment)
- Updated `data/enemies.json` (+3 enemy types: confused_scholar HP:40, arian_follower HP:60, arius boss HP:120 with bossPhases for multi-phase combat)
- Updated `data/items.json` (+3 items: creed_fragment quest item, athanasius_letter collectible, trinity_shield equipment +8 defense)
- Updated `data/questions.json` (+7 Level 3 questions: Nicene Creed, Council of Nicaea, Trinity, Athanasius, Arius teaching, creed purpose, homoousios)
- Updated `js/config.js` (added GameState.PUZZLE)
- Updated `js/tilemap.js` (added TileType.BOOKSHELF = 9, solid)
- Updated `js/render.js` (+drawBookshelf method: wooden shelf with 3 rows of colored books, integrated into drawTile switch)
- Updated `js/combat.js` (+multi-phase boss system: CombatState.PHASE_TRANSITION, bossPhases config from enemy definitions, _checkPhaseTransition at HP thresholds, _isQuestionRequiredPhase for question-gated damage, phase transition overlay rendering)
- Updated `js/game.js` (+puzzle state management, council lectern interaction with fragment count check, countCreedFragments helper, Level 2→3 transition, Level 3 stairs/victory handling, level-aware boss dialogue maps, creed fragment reward tracking in checkDialogueRewards)
- Updated `js/hud.js` (+_getLevel3Objective with full progression flow, _countCreedFragments helper, Level 3 progress display showing Fragments: X/5)
- Updated `index.html` (added puzzle.js and level3_dialogue.js script tags)

### Session 11: Level 4 - Church Fathers & Abilities ✅

Complete Level 4 (The Monastery) with new ability system. Three Church Fathers teach abilities (Wisdom, Translation, Courage) that interact with environment tiles. Players learn from Augustine, Jerome, and Ambrose, then use all 3 abilities to enter the Forbidden Library and defeat the Corrupt Prefect boss.

- Created `js/abilities.js` (AbilitySystem class: 3 abilities toggled with keys 4/5/6, quest flag gating, HUD icons with active glow, serialization)
- Created `data/levels/level4.json` (24x20 monastery map with 5 areas: Jerome's Scriptorium, Augustine's Study, Courtyard, Ambrose's Chapel, Forbidden Library; hidden wall, Latin tiles, barrier; 6 NPCs, 5 enemies, 4 floor items, 4 chests)
- Created `content/level4_dialogue.js` (~22 dialogue nodes: 3 Church Father quests with quizzes, Latin inscription decoding, Library Guardian ability check, boss pre-fight/victory, level victory)
- Updated `js/tilemap.js` (added TileType.HIDDEN_WALL=10, LATIN_TILE=11, BARRIER=12; solidity, interaction handlers, revealHiddenWall/breakBarrier methods)
- Updated `js/render.js` (+drawHiddenWall with gold shimmer, drawLatinTile with blue glow, drawBarrier with red glow when respective abilities active)
- Updated `js/combat.js` (+courageBonus: +2 damage when Courage ability is active during combat)
- Updated `js/game.js` (+ability system initialization, key 4/5/6 handling, Library Guardian special NPC, _handleHiddenWall/_handleLatinTile/_handleBarrier environmental puzzles, Level 3→4 transition, Level 4 stairs/victory, ability save/load, courage bonus in combat)
- Updated `js/hud.js` (+Level 4 objective tracking with scroll collection, _getLevel4Objective progression flow, _countFatherScrolls helper)
- Updated `js/input.js` (added keys '5' and '6' to gameKeys)
- Updated `data/enemies.json` (+3 enemy types: book_burner HP:50, imperial_censor HP:70, corrupt_prefect boss HP:140 with multi-phase)
- Updated `data/items.json` (+5 items: father_scroll quest, augustine_ring collectible, jerome_pen collectible, ambrose_staff equipment +3 ATK +2 WIS)
- Updated `data/questions.json` (+8 Level 4 questions on church fathers topics)
- Updated `index.html` (added abilities.js and level4_dialogue.js script tags)

### Session 12: Level 5 - Constantine & Final Challenge ✅

Complete Level 5 (Constantine's Palace) with 3-act narrative structure, new tile types, and multi-phase final boss integrating all game mechanics. Players witness Constantine's vision, learn about the Edict of Milan, then defeat The General in a 4-phase boss fight.

- Created `data/levels/level5.json` (28x22 map with 3 acts: underground catacombs, marble palace, arena; 6 NPCs: Constantine, Narrator, Christian Scholar, Imperial Herald, Palace Guard, Arena Attendant; 5 enemies: 2 imperial soldiers, 2 old regime guards with patrols, The General boss; 5 floor items, 2 chests)
- Created `content/level5_dialogue.js` (~25 dialogue nodes: vision narrative, Chi-Rho teaching with quiz, Constantine intro, Edict of Milan herald, palace guard, arena attendant, boss pre-fight/victory, victory epilogue with game_complete flag)
- Updated `js/tilemap.js` (added TileType.MARBLE=13 bright palace floor, TileType.PILLAR=14 decorative column, PILLAR solid)
- Updated `js/render.js` (+drawMarble with veining pattern and gold inlay, +drawPillar with gold/marble column capital/shaft/base)
- Updated `js/combat.js` (+_isDefendRequiredPhase, +_isFinalStandPhase, defend heals 10 HP in defend_required phase, phase-specific hint messages, dynamic phase number display, 2x attack boost on correct answers in final_stand phase)
- Updated `js/game.js` (+handleLevel5Stairs, +enterGameComplete, +updateGameComplete with scrolling credits, Level 4→5 transition, Level 5 boss dialogue maps, GAME_COMPLETE state handling)
- Updated `js/hud.js` (+_getLevel5Objective with full progression flow, +_countLevel5Progress tracking 4 milestones, Level 5 progress display)
- Updated `js/screens.js` (+renderGameComplete: scrolling credits with 5 eras of church history, player stats, golden border)
- Updated `js/config.js` (added GameState.GAME_COMPLETE)
- Updated `data/enemies.json` (+3 enemy types: imperial_soldier HP:65, old_regime_guard HP:80 stealth, the_general boss HP:200 with 4 phases using defend_required/question_required/final_stand behaviors)
- Updated `data/items.json` (+3 items: chi_rho_shield +10 def equipment, imperial_seal quest, commemorative_coin collectible)
- Updated `data/questions.json` (+4 Level 5 questions: Chi-Rho, Edict of Milan, Constantine's vision, Constantine's importance)
- Updated `index.html` (added level5_dialogue.js script tag)

### Session 13: Audio System ✅

Complete audio system with Web Audio API synthesized chiptune music and sound effects. No external audio files — everything generated programmatically. Safari-compatible with user interaction gate.

- Created `js/audio.js` (AudioManager class: Web Audio API context with Safari interaction gate, 3 synthesized music tracks — title/exploration/combat with chiptune melodies and bass lines, 14 synthesized SFX — footstep/door_open/item_pickup/menu_navigate/menu_select/dialogue/attack/damage/heal/save/level_up/victory/defeat/chest, master/music/SFX gain node hierarchy, volume controls 0-100, mute toggle, music crossfade, settings serialization)
- Refactored `js/game.js` (+AudioManager initialization, audio listener attachment, settings wiring, state-based music via _updateMusicForState, SFX triggers for item pickup/door unlock/chest open/altar save, M key mute toggle, audio reference wiring to combat/dialogue/save subsystems)
- Refactored `js/combat.js` (+audio SFX triggers: attack hit, damage taken, defend, heal from question/item, victory jingle, level up, defeat)
- Refactored `js/dialogue.js` (+audio SFX triggers: dialogue advance pop, choice selection)
- Refactored `js/save.js` (+audio reference, save chime SFX on successful save)
- Refactored `js/screens.js` (+onSettingsChanged callback for live volume adjustment)
- Refactored `js/hud.js` (+renderMuteIndicator showing mute status and M key hint in bottom-right)
- Updated `js/input.js` (added 'm' and 'M' to gameKeys for mute toggle)
- Updated `index.html` (added audio.js script tag, updated controls hint with M key)

### Session 14: Polish, Accessibility & Deployment ✅

Final polish pass. Touch controls for iPad. Service worker for offline play. Colorblind mode. Loading progress. Performance optimization.

- Refactored `js/config.js` (un-froze COLORS and ACCESSIBILITY sub-objects for runtime modification, added _DEFAULT_COLORS and _COLORBLIND_COLORS palettes for colorblind mode toggle)
- Rewrote `js/input.js` (added full touch control support: canvas attachment, touch event handlers, virtual D-pad with angle-based direction detection supporting diagonals, action/escape/inventory touch buttons, tap-to-interact for world objects, separate touchKeysDown state to avoid keyboard interference, visual feedback tracking)
- Refactored `js/hud.js` (+renderTouchControls: semi-transparent D-pad with directional arrows and active highlighting, circular action buttons with press feedback, only shown on touch devices)
- Refactored `js/game.js` (+input.attachCanvas for touch controls, service worker registration, colorblind mode application on settings change and load, loading progress bar updates during asset loading, improved canvas-based loading screen with animated shimmer bar)
- Refactored `js/screens.js` (enabled colorblind mode setting — removed stub/disabled state, wired toggle to settings changed callback)
- Refactored `js/combat.js` (object pooling for floating damage numbers — reuse from pool instead of creating/discarding objects to minimize GC pressure, canvas reference for touch support)
- Created `service-worker.js` (cache-first with background network update strategy, caches all 30+ game assets for full offline play, old cache cleanup on activate, skipWaiting/clients.claim for immediate control)
- Updated `css/style.css` (touch-action: none on canvas, user-select/touch-callout prevention, overscroll-behavior: none, hide keyboard controls on touch devices via @media pointer:coarse, loading progress bar styles with animated pulse)
- Updated `index.html` (OpenDyslexic CDN font link, loading progress bar HTML, updated page title to "Catacombs & Creeds")

---

## Implementation Complete

All 14 sessions have been implemented. The game is production-ready with:
- 5 fully playable levels spanning 300 years of early church history
- Turn-based combat with educational questions
- Complete inventory, save/load, and dialogue systems
- Synthesized chiptune audio (music + SFX)
- Touch controls for iPad Safari
- Service worker for offline play
- Colorblind mode and dyslexia-friendly accessibility features
- Auto-save, 3 manual save slots, and checkpoint system

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
