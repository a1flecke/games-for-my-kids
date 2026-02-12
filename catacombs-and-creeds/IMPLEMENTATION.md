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

## Session 1: Project Foundation & Game State Machine ✅ COMPLETED

**Recommended Model: Opus** - Critical architectural decisions, state machine design, refactoring multiple broken files. Needs deep understanding of the full plan and existing code to set the right foundation.

### Goal
Fix all broken infrastructure. Establish the game state machine that everything else plugs into. After this session, the game loads correctly, renders the existing map, player moves, and the state machine framework exists for adding new states.

### Tasks

1. **Create `css/style.css`** - Extract all inline styles from index.html
2. **Create `js/config.js`** - Central constants file:
   - Tile size (32), canvas size (800x600), player speed (2 per frame per plan)
   - Colors (dyslexia-friendly palette from plan Section 6.2)
   - Game state enum (LOADING, TITLE, PLAYING, DIALOGUE, COMBAT, INVENTORY, PAUSED, GAME_OVER, VICTORY)
   - Timing constants (auto-save interval: 120000ms, typewriter speed: 30ms)
   - Accessibility defaults (font size, line height, max words per box)
3. **Create `js/utils.js`** - Utility functions:
   - AABB collision helper
   - `worldToGrid()` / `gridToWorld()` conversions
   - `clamp()`, `lerp()`, `randomInt()` helpers
4. **Rewrite `index.html`**:
   - Link to `css/style.css`
   - Correct all script paths and load order
   - Use `defer` attribute on scripts
   - Add meta tags for iPad Safari
5. **Rename `Map` to `TileMap`** in game.js to avoid built-in collision
6. **Implement game state machine** in `game.js`:
   - `this.state` property with transitions
   - `update()` and `render()` dispatch to state-specific methods
   - LOADING -> TITLE -> PLAYING flow
   - PLAYING state runs existing movement/rendering code
   - Stub methods for other states (DIALOGUE, COMBAT, etc.)
7. **Fix camera** in `render.js`: instant follow (remove lerp), clamp to map bounds
8. **Fix player speed**: Change from 3 to 2 per plan spec

### Files Modified
- `index.html` (rewrite)
- `js/game.js` (major refactor)
- `js/render.js` (camera fix)

### Files Created
- `css/style.css`
- `js/config.js`
- `js/utils.js`

### Files Deleted
- None yet

### Validation
- Game loads without console errors
- Player moves with WASD/arrows at correct speed
- Camera follows instantly without smoothing
- FPS counter shows stable 60fps
- State machine logs state transitions to console

---

## Session 2: Input System, Player Refactor & Title Screen

**Recommended Model: Sonnet** - Well-defined tasks with clear specifications. Extracting classes, creating input system and screens from detailed plan requirements.

### Goal
Proper input system that won't conflict with dialogue/combat. Player entity with stats (HP, XP, level). A working title screen so the game doesn't just dump into gameplay.

### Tasks

1. **Create `js/input.js`** - Centralized input manager:
   - Track all key states (down/up/justPressed)
   - `justPressed(key)` for one-shot actions (SPACE to interact, I for inventory)
   - `isDown(key)` for continuous actions (movement)
   - Context-aware: movement keys only work in PLAYING state
   - Prevent default on game keys (arrows, space)
   - Touch input stubs for future iPad support
2. **Create `js/player.js`** - Extract Player class from game.js:
   - Position, size, speed, direction
   - Stats: HP, maxHP, attack, defense, XP, level
   - Leveling: XP thresholds, stat growth
   - Collision detection using utils.js helpers
   - `isNear(entity, range)` for NPC interaction checks
3. **Create `js/screens.js`** - UI screens:
   - Title screen: "Catacombs & Creeds" title, "New Game" / "Continue" / "Settings" options
   - Navigate with arrow keys + Enter
   - Dyslexia-friendly styling (cream background, large text)
   - Simple fade transitions between screens
   - Pause menu stub (Escape key)
4. **Refactor `game.js`**:
   - Remove Player, InputHandler classes (now in own files)
   - Use new InputHandler in game loop
   - Wire up title screen as initial state
   - TITLE -> PLAYING transition on "New Game"
   - Escape key -> PAUSED state (and back)
5. **Remove old InputHandler** from game.js (replaced by input.js)

### Files Modified
- `js/game.js` (refactor, remove extracted classes)
- `index.html` (add new script tags)

### Files Created
- `js/input.js`
- `js/player.js`
- `js/screens.js`

### Validation
- Game starts on title screen
- "New Game" enters gameplay
- Escape pauses/unpauses
- Player stats exist and display in console
- No key conflicts between states

---

## Session 3: Tile Map System & Level Data

**Recommended Model: Opus** - Designing the JSON data format and level loader architecture requires careful planning. The tile system with interactive tiles is complex and foundational to all future levels.

### Goal
Replace the hardcoded test map with a data-driven level system. Create the Level 1 map in JSON. Add interactive tile types (doors, chests, altars). NPCs exist on the map as entities.

### Tasks

1. **Create `js/tilemap.js`** - Extract and expand TileMap:
   - Load from JSON data
   - Tile types: FLOOR(0), WALL(1), DOOR(2), CHEST(3), ALTAR(4), TORCH(5), WATER(6), STAIRS(7)
   - `isSolid(x,y)` - walls and locked doors block movement
   - `isInteractable(x,y)` - doors, chests, altars respond to SPACE
   - `interact(x,y)` - trigger tile interaction (open door, open chest, save at altar)
   - Tile metadata (is door locked? has chest been opened?)
2. **Create `js/npc.js`** - NPC entity class:
   - Position (grid coordinates), name, portrait, facing direction
   - `dialogueId` linking to dialogue content
   - Interaction range (1 tile)
   - Rendering (colored rectangle with label, per plan's placeholder strategy)
   - `hasBeenTalkedTo` flag for quest tracking
3. **Create `data/levels/level1.json`** - Level 1 map data:
   - 20x15 tile grid matching plan Section 5.1
   - Starting chamber with Peter
   - Three paths (one per apostle: Peter, James, John)
   - Hidden room with items
   - Midpoint altar (checkpoint)
   - Boss room (Roman Centurion area)
   - NPC positions and dialogue IDs
   - Enemy spawn positions
   - Item/collectible positions
4. **Create level loader** in game.js:
   - `async loadLevel(levelNumber)` fetches JSON
   - Constructs TileMap from data
   - Spawns NPCs at defined positions
   - Places items at defined positions
   - Sets player start position
5. **Update `js/renderer.js`**:
   - Draw new tile types (doors = gold, chests = brown, altars = glowing, torches = animated flicker, water = blue, stairs = gradient)
   - Draw NPCs (colored rectangles with direction indicator)
   - Interaction prompt ("SPACE" hint) when player is near interactable tile/NPC
6. **Create `js/camera.js`** - Extract camera from renderer:
   - Instant follow (per plan)
   - Clamp to map bounds
   - `worldToScreen(x, y)` conversion
   - `screenToWorld(x, y)` conversion

### Files Modified
- `js/game.js` (level loading, NPC spawning)
- `js/renderer.js` (new tile types, NPC rendering, interaction prompts)
- `index.html` (new script tags)

### Files Created
- `js/tilemap.js`
- `js/npc.js`
- `js/camera.js`
- `data/levels/level1.json`

### Files Deleted
- None (old Map code in game.js gets replaced)

### Validation
- Level 1 loads from JSON
- All tile types render with distinct visuals
- NPCs appear at correct positions
- Player can walk through doors (unlocked), blocked by walls
- "SPACE" prompt appears near NPCs and interactable tiles
- Altars show save prompt

---

## Session 4: Dialogue System (New)

**Recommended Model: Opus** - Writing a brand new system from scratch that replaces 3 files. Needs careful architecture for state management, rendering, branching logic, accessibility features, and quest integration. High complexity.

### Goal
Replace both existing dialogue implementations with one clean system. Fully integrated with the game loop. Dyslexia-friendly. Supports linear sequences, branching choices, and quest flag triggers.

### Tasks

1. **Delete old dialogue files**: `dialogue.js`, `dialogueSystem.js`, `textRenderer.js`
2. **Create new `js/dialogue.js`** - Unified dialogue system:
   - **State management**: active/inactive, current sequence, current index
   - **Text rendering**: Dyslexia-friendly box (cream background #F5F0E8, dark text #2C2416, Comic Sans MS)
   - **Typewriter effect**: 30ms per character, skippable with SPACE
   - **Portrait display**: 64x64, left side of box, with placeholder generation for missing images
   - **Speaker name**: Bold, above text
   - **Word wrapping**: Automatic, no hyphenation, preserve word integrity
   - **Auto-splitting**: If text exceeds 15 words, automatically split into multiple sequential boxes at sentence boundaries (NOT truncation with "...")
   - **Choices**: 2-3 options, navigate with UP/DOWN arrows, select with SPACE/Enter, number keys for quick select
   - **Continue indicator**: Blinking down-arrow when text is complete
   - **TTS integration**: Toggle with T key, Web Speech API
   - **Quest flag triggers**: Dialogue nodes can set quest flags (e.g., `"setFlag": "met_peter"`)
   - **Branching**: Choice actions can specify next dialogue ID or inline dialogue sequence
   - **Callbacks**: `onComplete` callback for post-dialogue game logic
   - **No key conflicts**: Does NOT capture 'A' key. Only uses SPACE, Enter, Escape, arrows, number keys, T while active.
3. **Create `content/level1_dialogue.js`** - Level 1 dialogue content:
   - Tutorial introduction (narrator, 3 boxes)
   - Controls tutorial (guide, 3 boxes)
   - Peter's greeting and mission
   - James's teaching
   - John's teaching
   - Each apostle awards an Apostle Coin via quest flag
   - Roman Guard encounter (branching)
   - Boss pre-fight dialogue
   - Victory dialogue
   - Total: ~15 dialogue interactions
4. **Integrate with game loop**:
   - PLAYING -> DIALOGUE state transition when pressing SPACE near NPC
   - DIALOGUE -> PLAYING when dialogue ends
   - Player movement disabled during dialogue
   - Game renders world behind dialogue box (semi-transparent overlay optional)
5. **Load portraits** at game start:
   - Load all 4 existing PNGs (peter, paul, lydia, timothy)
   - Generate placeholders for missing characters (narrator, guide, guard, etc.)

### Files Modified
- `js/game.js` (dialogue integration, state transitions)
- `js/renderer.js` (render dialogue on top of game world)
- `index.html` (update script tags)

### Files Created
- `js/dialogue.js` (new unified system)
- `content/level1_dialogue.js`

### Files Deleted
- `js/dialogue.js` (old - replaced)
- `js/dialogueSystem.js`
- `js/textRenderer.js`
- `js/sampleDialogue.js` (content moved to level1_dialogue.js)
- `js/gameDialogueData.js` (content moved to level1_dialogue.js)

### Validation
- Walk up to NPC, press SPACE -> dialogue box appears
- Typewriter effect plays, SPACE skips to full text
- SPACE advances to next box
- Choices appear and are navigable
- Dialogue ends and returns to gameplay
- Quest flags are set correctly
- 'T' toggles TTS
- No key conflicts with movement
- Text auto-splits at 15 words instead of truncating

---

## Session 5: Combat System

**Recommended Model: Opus** - Complex new system with many interacting parts: turn state machine, damage formulas, enemy AI, question integration, UI layout, transitions, and victory/defeat flows. Needs careful design to avoid bugs.

### Goal
Turn-based combat with educational questions. Entry/exit transitions. Player actions: Attack, Defend, Use Item, Answer Question. Enemy AI. Victory/defeat flows.

### Tasks

1. **Create `js/combat.js`** - Turn-based combat engine:
   - **Combat state**: player turn, enemy turn, animating, victory, defeat
   - **Entry**: Player walks into enemy -> fade to black (300ms) -> combat screen
   - **Exit**: Victory -> XP + items -> fade back to exploration. Defeat -> respawn at checkpoint.
   - **Player actions**:
     - Attack: `(attack - defense/2) + random(-2, +2)`, 10% crit (2x), 5% miss
     - Defend: Reduce incoming damage by 50% for one turn
     - Use Item: Opens mini-inventory of consumables
     - Answer Question: Correct = heal 20 HP or +50% next attack. Incorrect = brief explanation, no penalty, can retry next turn.
   - **Enemy AI** (simple):
     - Always attacks (no complex behavior for MVP)
     - Boss enemies: alternate attack/special patterns
   - **Combat UI**:
     - Enemy sprite: top-center (colored rectangle placeholder with name)
     - Health bars: player (bottom-left) and enemy (top) with numeric HP display
     - Action menu: bottom-right, large buttons (44x44px minimum)
     - Damage numbers: float up animation
     - Turn indicator text
   - **Victory**: "+X XP" display, level-up check, item drops, enemy removed from map
   - **Defeat**: "You were defeated..." with hint text, respawn at last checkpoint with 50% HP
2. **Create `data/enemies.json`** - Enemy definitions:
   - Level 1 enemies per plan:
     - Doubtful Villager (HP:30, ATK:5)
     - Roman Scout (HP:50, ATK:8)
     - Roman Centurion - Boss (HP:80, ATK:12)
   - Include: name, hp, attack, defense, xpReward, itemDrops, portrait, isBoss flag
3. **Create `js/questions.js`** - Question system:
   - Load questions from data
   - Track which questions have been asked (don't repeat in same combat)
   - Multiple choice (3 options) with explanation on answer
   - Filter questions by current level
   - Display: question text + 3 choice buttons, navigate with arrows
4. **Create `data/questions.json`** - Question bank:
   - All 5 Level 1 questions from plan Section 5.1
   - Format: `{ question, choices: [{text, correct, explanation}], level, topic }`
5. **Wire combat into game state machine**:
   - PLAYING -> COMBAT transition on enemy collision
   - COMBAT -> PLAYING on victory
   - COMBAT -> PLAYING (at checkpoint) on defeat
   - Enemy entities on map with patrol behavior (simple: walk back and forth)

### Files Modified
- `js/game.js` (combat state, enemy collision detection)
- `js/renderer.js` (enemy rendering on overworld map)
- `index.html` (new script tags)

### Files Created
- `js/combat.js`
- `js/questions.js`
- `data/enemies.json`
- `data/questions.json`

### Validation
- Walk into enemy -> combat screen appears
- All 4 actions work (Attack, Defend, Item stub, Question)
- Damage formula matches plan spec
- Questions display with 3 choices
- Correct answer heals or boosts
- Wrong answer shows explanation
- Victory awards XP, removes enemy from map
- Defeat respawns at checkpoint with hint
- Boss fight works with higher stats

---

## Session 6: Inventory & Items

**Recommended Model: Sonnet** - Well-defined system with clear specifications from the plan. Grid UI, item categories, and stat effects are straightforward to implement from the detailed requirements.

### Goal
Full inventory system with grid UI. Items can be picked up from the map, used in combat and overworld, equipped for stat boosts. Quest items tracked separately.

### Tasks

1. **Create `js/inventory.js`** - Inventory system:
   - 20-slot grid (4 columns x 5 rows)
   - Item categories: Consumable, QuestItem, Equipment, Collectible
   - Consumables stack to 99
   - Quest items don't count toward capacity
   - Auto-sort by category
   - **Actions**: Use (consumables), Equip/Unequip (equipment), Examine (shows description)
   - **Hotbar**: Keys 1-3 for quick-use slots
   - **UI rendering**:
     - Open with 'I' key or touch button
     - 60x60px minimum per slot
     - Item name + description on hover/select
     - Dyslexia-friendly colors and text
     - Navigate with arrow keys, select with SPACE
   - **Equipment effects**: Modify player stats (defense, wisdom)
2. **Create `data/items.json`** - Item definitions:
   - Consumables: Bread (heal 20 HP), Water (heal 10 HP), Scripture Scroll (full heal), Blessed Wine (HP + temp boost)
   - Quest Items: Apostle Coins (3 for Level 1), Martyr Tokens (4 for Level 2), Creed Fragments (5 for Level 3), Church Father Scrolls (3 for Level 4), Imperial Seal (Level 5)
   - Equipment: Faith Shield (+5 def), Prayer Beads (+3 wisdom)
   - Format: `{ id, name, description, category, stackable, maxStack, effect, sprite }`
3. **Add items to Level 1 map**:
   - Place items in chests and as floor pickups
   - 2 Bread, 1 Prayer Beads, 1 Scripture Scroll (hidden room)
   - 3 Apostle Coins from NPC interactions (quest flag triggers)
4. **Integrate with combat**:
   - "Use Item" action in combat opens consumable sub-menu
   - Using Bread in combat heals 20 HP
   - Equipment stat bonuses apply to combat formulas
5. **Item pickup interaction**:
   - Walk over floor items -> auto-pickup with notification
   - Open chests with SPACE -> receive contents with notification
   - "Obtained [item name]!" popup (2 seconds)

### Files Modified
- `js/game.js` (inventory state, item pickup logic)
- `js/combat.js` (use item action)
- `js/player.js` (equipment stat modifiers)
- `js/renderer.js` (item sprites on map)
- `data/levels/level1.json` (item placement)
- `index.html` (new script tags)

### Files Created
- `js/inventory.js`
- `data/items.json`

### Validation
- Press 'I' opens inventory grid
- Items display with names and descriptions
- Bread heals 20 HP when used
- Equipment changes player stats
- Items picked up from map with notification
- Quest items tracked separately
- Inventory full = warning message
- Combat "Use Item" works

---

## Session 7: Save System & HUD

**Recommended Model: Sonnet** - Straightforward localStorage work with a well-defined data format. HUD rendering is standard canvas drawing. Settings screen follows established patterns.

### Goal
3-slot save system with auto-save. Heads-up display showing health, current objective, and level progress. Settings for accessibility options.

### Tasks

1. **Create `js/save.js`** - Save/Load system:
   - 3 save slots in localStorage
   - **Save data**: player position, stats, inventory, quest flags, enemies defeated, dialogues seen, current level, playtime, timestamp
   - **Auto-save triggers**: Every 2 minutes, after dialogue, after combat victory, on item pickup, at altars, entering new room
   - **Manual save**: At altar tiles, press SPACE -> choose slot
   - **Load**: From title screen "Continue" -> show 3 slots with preview (level name, playtime, progress %)
   - **Visual feedback**: "Game Saved" notification (2 seconds, non-intrusive corner toast)
   - **Error handling**: Quota exceeded warning, corrupted save detection
   - **Save slot UI**: Dyslexia-friendly, large touch targets
2. **Create `js/hud.js`** - Heads-up display:
   - **Health bar**: Top-left, red bar with numeric HP/MaxHP
   - **Current objective**: Top-center, brief text (e.g., "Find Apostle Peter")
   - **Level progress**: Top-right, progress bar or fraction (e.g., "Coins: 1/3")
   - **Quick-use slots**: Bottom-left, shows items bound to 1-2-3
   - **Minimap** (optional): Small corner map showing explored areas
   - **Notifications**: Toast messages for saves, pickups, achievements
   - All text uses dyslexia-friendly font and sizing
3. **Add settings screen** to `js/screens.js`:
   - Text size: Small / Medium / Large
   - TTS: On / Off
   - Music volume: slider (for future audio)
   - SFX volume: slider (for future audio)
   - Colorblind mode: On / Off (for future implementation)
   - Save settings to localStorage
4. **Wire save system into game**:
   - Title screen "Continue" loads save slot picker
   - Altar interaction triggers manual save
   - Auto-save runs on timer and event triggers
   - Game Over respawns from last save

### Files Modified
- `js/game.js` (save integration, auto-save triggers, HUD rendering)
- `js/screens.js` (save slot UI, settings screen)
- `js/renderer.js` (HUD layer rendering)
- `index.html` (new script tags)

### Files Created
- `js/save.js`
- `js/hud.js`

### Validation
- Save at altar -> slot picker -> confirmation
- Load from title screen -> game resumes exactly
- Auto-save notification appears periodically
- HUD displays health, objective, progress
- Settings persist across sessions
- Text size changes apply immediately
- 3 save slots work independently

---

## Session 8: Level 1 Complete & Tutorial

**Recommended Model: Opus** - Integration session requiring all systems to work together. Tutorial design, content writing, playtesting, and balancing require holistic understanding of the game. High complexity.

### Goal
Fully playable Level 1 from start to finish. Tutorial teaches all mechanics. All dialogue, questions, enemies, and collectibles in place. Victory unlocks Level 2.

### Tasks

1. **Design and finalize Level 1 map** (`data/levels/level1.json`):
   - 20x15 tiles per plan
   - Starting chamber: safe zone, Peter NPC, altar save point
   - Three branching paths: Peter path (west), James path (north), John path (east)
   - Each path has 1 apostle NPC + enemies + collectibles
   - Hidden room (breakable wall or hidden passage) with Scripture Scroll
   - Midpoint altar (checkpoint)
   - Boss room: Roman Centurion guards exit door
   - Exit door requires 3 Apostle Coins
2. **Tutorial sequence** (first-time player):
   - Movement tutorial: "Use WASD or Arrow Keys to walk" (auto-triggers on new game)
   - Interaction tutorial: Walk near Peter -> "Press SPACE to talk"
   - First dialogue with Peter (introduces story)
   - Combat tutorial: scripted easy fight with Doubtful Villager (reduced stats)
   - "You can save at glowing altars" prompt near first altar
   - Inventory tutorial: "Press I to see your items" after first item pickup
   - Track tutorial completion in save data (don't repeat)
3. **Complete Level 1 dialogue** (`content/level1_dialogue.js`):
   - All ~15 dialogue interactions
   - Peter: mission briefing, awards Apostle Coin
   - James: teaching about spreading the word, awards Apostle Coin
   - John: teaching about love, awards Apostle Coin
   - Roman Guard encounter (branching: honest/excuse/silence)
   - Boss pre-fight and post-victory dialogue
   - Historical fact NPCs (optional side conversations)
4. **Level 1 enemies fully configured**:
   - Doubtful Villager: appears on Peter and James paths
   - Roman Scout: appears on John path and near boss room
   - Roman Centurion (boss): guards exit, harder stats, dialogue before fight
   - Enemies don't respawn once defeated (tracked in save)
5. **Victory condition**:
   - All 3 Apostle Coins collected
   - Roman Centurion defeated
   - Exit door unlocks
   - Victory dialogue plays
   - "Level 1 Complete!" screen with stats (time, questions answered, items found)
   - Transition to Level 2 (or "To be continued" if Level 2 isn't built yet)
6. **Quest tracking**:
   - Quest flags: `met_peter`, `met_james`, `met_john`, `coin_peter`, `coin_james`, `coin_john`, `boss_defeated`, `level1_complete`
   - HUD objective updates based on flags
   - Door lock checks quest flag state

### Files Modified
- `js/game.js` (tutorial flow, victory condition, level transitions)
- `js/screens.js` (victory screen)
- `js/hud.js` (objective text updates)
- `data/levels/level1.json` (finalize map design)
- `content/level1_dialogue.js` (complete all dialogue)
- `data/enemies.json` (verify Level 1 enemy stats)
- `data/questions.json` (verify Level 1 questions)

### Validation
- New game -> tutorial plays -> player understands all controls
- Can explore all 3 paths
- Collect all 3 Apostle Coins through NPC dialogues
- Fight and defeat all enemies including boss
- Questions appear in combat and work correctly
- Inventory fills with items from chests
- Save at altars and auto-save both work
- Die to boss -> respawn at checkpoint with hint
- Complete level -> victory screen -> (placeholder for Level 2)
- Full playthrough: 9-12 minutes as planned

---

## Session 9: Level 2 - Persecutions & Stealth

**Recommended Model: Opus** - New stealth mechanic with vision cones, patrol AI, and detection logic is architecturally complex. Requires careful design of guard behavior, hiding spots, and integration with existing combat.

### Goal
Level 2 with stealth mechanic. Guards patrol with vision cones. Player can sneak or fight. New collectibles (Martyr Tokens). New NPCs (Polycarp). Level 2 map and all content.

### Tasks

1. **Stealth system** (new mechanic):
   - Guard entities with patrol routes (defined in level JSON: array of waypoints)
   - Vision cone rendering: triangular area in front of guard, rendered semi-transparently
   - Detection: player in vision cone for >0.5 seconds = alert -> forced combat (harder enemies)
   - Hiding spots: special tiles (alcoves, shadow tiles) where player is invisible to guards
   - Stealth bonus: successfully sneaking past guard = bonus item or XP
   - Visual indicator: "!" above guard when detecting, "!!" when alerted
2. **Create `data/levels/level2.json`**:
   - 25x20 tiles per plan
   - Winding catacomb labyrinth
   - 3-4 patrol guards with overlapping routes
   - Secret passages (hidden walls that can be walked through)
   - Shrine room (checkpoint with Polycarp lore)
   - Escape tunnel (final exit)
   - Polycarp NPC location
3. **Create `content/level2_dialogue.js`**:
   - Polycarp: explains persecution, martyrdom, and the underground church
   - Martyr stories: Polycarp, Ignatius, Perpetua, Felicity (each awards a Martyr Token)
   - Fish symbol (Ichthys) teaching dialogue
   - Guard encounters (branching dialogues)
   - ~18 dialogue boxes total
4. **Level 2 enemies**:
   - Roman Patrol (HP:45, ATK:10) - patrolling guards, avoidable
   - Informant (HP:35, ATK:7) - surprise encounters in dead ends
   - Prefect (HP:100, ATK:15) - boss at escape tunnel
5. **Level 2 questions** (6 total per plan):
   - Why Rome persecuted Christians
   - What is a martyr
   - Fish symbol meaning
   - Ichthys meaning
   - Why meet in catacombs
   - Who was Polycarp
6. **Level 2 collectibles**:
   - 4 Martyr Tokens (quest items from NPC dialogues)
   - Ichthys Pendant (equipment: stealth detection range reduced)
   - Church Father Letter (lore collectible)
   - 3 Bread
7. **Victory condition**:
   - All 4 Martyr Tokens collected
   - Prefect boss defeated
   - Escape tunnel accessible
   - Level 2 complete screen

### Files Modified
- `js/game.js` (stealth system update loop, Level 2 loading)
- `js/renderer.js` (vision cone rendering, stealth UI elements)
- `js/npc.js` (patrol behavior, vision cone logic)
- `js/enemy.js` (patrol route following)
- `data/enemies.json` (add Level 2 enemies)
- `data/questions.json` (add Level 2 questions)
- `data/items.json` (add Level 2 items)

### Files Created
- `data/levels/level2.json`
- `content/level2_dialogue.js`

### Validation
- Guards patrol along defined routes
- Vision cones render and detect player
- Hiding spots make player invisible
- Stealth bypass awards bonus
- Detection triggers harder combat
- All 4 Martyr Tokens collectible
- Boss fight works
- Level completes in 10-14 minutes

---

## Session 10: Level 3 - Creeds & Puzzles

**Recommended Model: Sonnet** - The puzzle system (ordering 5 fragments) is well-defined with clear correct answers and hint logic. Multi-phase boss adds complexity but builds on existing combat system. Content-heavy but structurally straightforward.

### Goal
Level 3 with puzzle mechanic. Creed Fragment assembly. Library setting. Athanasius NPC. Debate-style boss fight with Arius.

### Tasks

1. **Puzzle system** (new mechanic):
   - Creed assembly UI: 5 fragments displayed, player arranges in correct order
   - Navigation: arrow keys to select fragment, SPACE to place
   - Correct order: "We believe in one God" -> "The Father Almighty" -> "And in one Lord Jesus Christ" -> "Of one being with the Father" -> "Who came down from heaven"
   - Hints: After 2 wrong attempts, highlight the next correct fragment
   - Educational: each fragment teaches part of the creed when selected
   - Success: door opens, celebration animation
   - Failure: "Try again!" with encouragement, no penalty
2. **Create `data/levels/level3.json`**:
   - 22x18 tiles per plan
   - Grand Library: central hub with bookshelves (decorative tiles)
   - 5 Bishop Chambers: one fragment each, accessed from library
   - Council Chamber: puzzle room where fragments are assembled
   - Athanasius's Study: checkpoint with lore
   - Debate Hall: boss area for Arius fight
3. **Create `content/level3_dialogue.js`**:
   - Athanasius: explains the problem (different teachings), introduces quest
   - 5 Bishops: each gives one Creed Fragment and teaches about it
   - Pre-puzzle dialogue explaining what to do
   - Post-puzzle congratulations
   - Arius pre-boss dialogue (theological debate framing)
   - ~20 dialogue boxes total
4. **Level 3 enemies**:
   - Confused Scholar (HP:40, ATK:6)
   - Arian Follower (HP:60, ATK:11)
   - Arius (HP:120, ATK:14) - multi-stage boss (2 phases)
     - Phase 1: standard combat
     - Phase 2: question-focused (must answer correctly to deal damage)
5. **Level 3 questions** (7 total per plan)
6. **Level 3 collectibles**: 5 Creed Fragments, Athanasius's Letter, Trinity Shield (+8 def), 2 Scripture Scrolls
7. **Multi-stage boss support**: Add phase system to combat.js for boss fights with multiple phases

### Files Modified
- `js/game.js` (puzzle state, Level 3 loading)
- `js/combat.js` (multi-phase boss support)
- `js/renderer.js` (library tiles, puzzle UI rendering)
- `data/enemies.json` (Level 3 enemies)
- `data/questions.json` (Level 3 questions)
- `data/items.json` (Level 3 items)

### Files Created
- `js/puzzle.js` (Creed assembly puzzle system)
- `data/levels/level3.json`
- `content/level3_dialogue.js`

### Validation
- Library environment renders correctly
- 5 bishop chambers accessible
- Creed Fragments collectible
- Puzzle UI works (arrange 5 fragments)
- Hints appear after 2 failures
- Correct assembly opens door
- Arius boss has 2 phases
- Level completes in 12-16 minutes

---

## Session 11: Level 4 - Church Fathers & Abilities

**Recommended Model: Sonnet** - The ability system is well-defined with clear triggers (reveal hidden things, decode text, break barriers). Environmental puzzles are straightforward gating mechanics. Content creation follows established patterns.

### Goal
Level 4 with ability system. Three learnable powers from Church Fathers. Environmental puzzles requiring specific abilities. Monastery setting.

### Tasks

1. **Ability system** (new mechanic):
   - 3 abilities, each learned from a Church Father NPC:
     - **Augustine's Wisdom**: Reveal hidden messages/doors (toggle overlay showing secret passages)
     - **Jerome's Translation**: Decode Latin inscriptions (interact with Latin text tiles to solve puzzles)
     - **Ambrose's Courage**: Break barriers and access special dialogue options
   - Activate with number keys (4, 5, 6) or touch icons
   - Visual indicator when ability is active (glow effect, icon in HUD)
   - Environmental challenges require specific abilities to progress
   - Must collect all 3 to reach final area
2. **Create `data/levels/level4.json`**:
   - 24x20 tiles per plan
   - Monastery Courtyard: central hub connecting all areas
   - Augustine's Study: philosophy puzzles, hidden message walls
   - Jerome's Scriptorium: Latin inscription puzzles
   - Ambrose's Chapel: courage trial (dialogue choices + barrier breaking)
   - Forbidden Library: requires all 3 abilities
   - Secret Archives: hidden lore area (requires Augustine's Wisdom)
3. **Create `content/level4_dialogue.js`**:
   - Augustine: teaches about Confessions, City of God, grants Wisdom ability
   - Jerome: teaches about Vulgate translation, grants Translation ability
   - Ambrose: teaches about confronting Emperor Theodosius, grants Courage ability
   - ~22 dialogue boxes total
4. **Level 4 enemies**: Book Burner (HP:50, ATK:9), Imperial Censor (HP:70, ATK:12), Corrupt Prefect boss (HP:140, ATK:16)
5. **Level 4 questions** (8 total per plan)
6. **Level 4 collectibles**: 3 Church Father Scrolls (unlock abilities), Augustine's Ring, Jerome's Pen, Ambrose's Staff, 4 Bread

### Files Modified
- `js/game.js` (ability system, Level 4 loading)
- `js/player.js` (ability state, ability activation)
- `js/renderer.js` (ability visual effects, monastery tiles)
- `js/hud.js` (ability icons display)
- `js/combat.js` (ability effects in combat)
- `data/enemies.json`, `data/questions.json`, `data/items.json`

### Files Created
- `js/abilities.js` (ability system)
- `data/levels/level4.json`
- `content/level4_dialogue.js`

### Validation
- Each Church Father teaches and grants an ability
- Abilities activate with correct keys
- Environmental puzzles require correct ability
- Hidden doors revealed by Wisdom
- Latin inscriptions decoded by Translation
- Barriers broken by Courage
- All 3 needed for Forbidden Library
- Level completes in 14-18 minutes

---

## Session 12: Level 5 - Constantine & Final Challenge

**Recommended Model: Opus** - Most complex session. Multi-phase boss integrating ALL previous mechanics (combat, stealth, puzzles, abilities). Three-act structure with dramatic palette shift. Victory sequence with credits. Requires holistic understanding of every system.

### Goal
Final level with 3-act structure. Transition from underground to surface. Multi-phase final boss using ALL previously learned mechanics. Victory sequence and epilogue.

### Tasks

1. **Three-act level structure**:
   - **Act 1 (Underground)**: Constantine's vision narrative, Chi-Rho symbol teaching, catacomb exit ascending upward
   - **Act 2 (Surface)**: FIRST TIME ABOVE GROUND - bright palace with different color palette (golds, whites, blues vs. dark browns), meet Constantine in throne room, Edict of Milan ceremony dialogue
   - **Act 3 (Arena)**: Final boss fight with General of old regime
2. **Multi-phase final boss**:
   - Phase 1: Standard combat (test combat skills)
   - Phase 2: Stealth phase (dodge attacks, use hiding spots - reuses Level 2 mechanic)
   - Phase 3: Puzzle phase (arrange Chi-Rho and cross symbols - reuses Level 3 mechanic)
   - Phase 4: Ability phase (use all 3 Church Father abilities - reuses Level 4 mechanic)
   - General stats: HP:200, ATK:18
3. **Create `data/levels/level5.json`**:
   - 28x22 tiles (largest level)
   - Catacomb Exit: ascending tunnel with light increasing
   - Palace Courtyard: open, bright, monumental architecture
   - Throne Room: Edict ceremony
   - Imperial Arena: final boss arena
   - Victory Monument: epilogue location
4. **Create `content/level5_dialogue.js`**:
   - Constantine's vision cutscene (narrative dialogue sequence)
   - Chi-Rho symbol explanation
   - Battle of Milvian Bridge narrative
   - Constantine meeting and Edict of Milan
   - Final boss pre-fight and inter-phase dialogue
   - Victory and epilogue (scrolling historical summary)
   - ~25 dialogue boxes total
5. **Surface palette**: New tile colors for above-ground areas (light stone, marble, gold accents, blue sky background)
6. **Victory sequence**:
   - Boss defeated
   - "Church triumphant" cutscene dialogue
   - Scrolling credits with historical facts
   - "You've completed 300 years of church history!" summary
   - Final stats (total playtime, questions correct, items found)
   - Return to title screen
7. **Level 5 questions** (4 total for boss phases)
8. **Level 5 collectibles**: Chi-Rho Shield (+10 def), Imperial Seal, Commemorative Coins, 5 Bread

### Files Modified
- `js/game.js` (3-act structure, victory sequence, credits)
- `js/combat.js` (4-phase boss logic integrating stealth/puzzle/abilities)
- `js/renderer.js` (surface palette, palace tiles, credits scroll)
- `js/screens.js` (final victory/credits screen)
- `data/enemies.json`, `data/questions.json`, `data/items.json`

### Files Created
- `data/levels/level5.json`
- `content/level5_dialogue.js`

### Validation
- 3-act progression works
- Visual shift from dark catacombs to bright palace is dramatic
- All 4 boss phases use different mechanics correctly
- Victory sequence plays in full
- Credits scroll with facts
- Game loops back to title screen
- Full playthrough: 16-20 minutes

---

## Session 13: Audio System

**Recommended Model: Sonnet** - Web Audio API synthesis follows well-documented patterns. Sound effect generation is repetitive (similar oscillator patterns with variations). Music loops are simple chiptune sequences. Integration points are clearly defined.

### Goal
Chiptune-style synthesized music and sound effects using Web Audio API. No external audio files needed (all generated programmatically). Volume controls and mute.

### Tasks

1. **Create `js/audio.js`** - Audio manager:
   - **Web Audio API** context management
   - **User interaction gate**: Audio context starts on first user click/keypress (Safari requirement)
   - **Synthesized music** (simple chiptune loops):
     - Title theme: hopeful, 8-bit melody
     - Exploration theme: atmospheric, low-key
     - Combat theme: urgent, faster tempo
     - Victory jingle: triumphant, short
     - Game over: somber, short
   - **Sound effects** (synthesized):
     - Footstep (short noise burst)
     - Door open (rising tone)
     - Item pickup (bright arpeggio)
     - Menu navigate (soft click)
     - Menu select (confirmation tone)
     - Dialogue advance (soft pop)
     - Attack hit (impact noise)
     - Damage taken (low thud)
     - Heal (gentle chime)
     - Save chime (warm chord)
     - Level up (ascending arpeggio)
   - **Volume controls**: Master, Music, SFX (0-100 each)
   - **Mute toggle**: Accessible at all times
   - **No essential audio**: Game fully playable without sound
   - **Visual indicators**: Optional flash when sound plays (accessibility)
2. **Integrate audio triggers**:
   - Music changes based on game state (exploration, combat, title)
   - SFX on: footsteps, item pickup, menu navigation, combat hits, dialogue advance, save
   - Smooth music crossfade between tracks
3. **Add audio controls to settings screen**
4. **Save audio preferences** in localStorage

### Files Modified
- `js/game.js` (audio triggers throughout game loop)
- `js/combat.js` (combat music and SFX)
- `js/dialogue.js` (dialogue advance SFX)
- `js/inventory.js` (item pickup SFX)
- `js/save.js` (save chime)
- `js/screens.js` (audio settings UI)
- `js/hud.js` (mute button)
- `index.html` (add audio.js script)

### Files Created
- `js/audio.js`

### Validation
- Music plays on title screen after first interaction
- Music transitions between exploration/combat
- All SFX trigger at correct moments
- Volume sliders work
- Mute button silences everything
- Audio preferences persist
- No audio errors on iPad Safari
- Game works perfectly with audio disabled

---

## Session 14: Polish, Accessibility & Deployment

**Recommended Model: Sonnet** - Bug fixes, accessibility tweaks, and service worker setup are well-defined tasks. Touch control implementation follows standard patterns. Cross-browser testing is systematic verification work.

### Goal
Final polish pass. Full accessibility audit. Service worker for offline play. Performance optimization. Cross-browser verification. The game is production-ready.

### Tasks

1. **Accessibility audit and fixes**:
   - Verify WCAG AA contrast ratios on all text (4.5:1 minimum)
   - Test all 3 text sizes (small/medium/large) throughout entire game
   - Verify 44x44px minimum touch targets on all interactive elements
   - No flashing/strobing effects anywhere
   - Keyboard-only playthrough test (no mouse/touch required)
   - TTS works on all dialogue
   - Colorblind mode implementation (blue/orange palette swap)
2. **Performance optimization**:
   - Profile on iPad Safari - ensure stable 60fps
   - Optimize canvas rendering (only redraw changed tiles if needed)
   - Minimize garbage collection (object pooling for particles/damage numbers)
   - Verify <3 second level load times
   - Verify <100ms save times
3. **Touch controls** (iPad):
   - On-screen D-pad for movement (appears on touch devices)
   - Touch-friendly action buttons in combat
   - Tap-to-interact for NPCs and objects
   - Pinch-to-zoom disabled (prevent accidental zooming)
4. **Service worker** (`service-worker.js`):
   - Cache all game assets on first load
   - Serve from cache when offline
   - Update strategy: check for updates on load, apply on next visit
5. **Bug fix pass**:
   - Playtest all 5 levels start to finish
   - Fix any edge cases (inventory full, all enemies defeated, revisiting completed areas)
   - Verify save/load works across all levels
   - Test level transitions
6. **Final UI polish**:
   - Consistent color palette across all screens
   - Smooth transitions between all states
   - Loading progress bar (if assets take time)
   - Error messages are user-friendly
7. **Cross-browser testing checklist**:
   - iPad Safari (iOS 15+) - PRIMARY
   - Chrome desktop
   - Safari macOS
   - Edge
   - Firefox

### Files Modified
- Multiple files (accessibility fixes, performance tweaks)
- `js/input.js` (touch controls)
- `js/renderer.js` (colorblind palette, performance)
- `js/screens.js` (loading progress)
- `index.html` (service worker registration)

### Files Created
- `service-worker.js`

### Validation
- Full playthrough on iPad Safari: smooth, no bugs, accessible
- Full playthrough keyboard-only: all features accessible
- Text sizes all work correctly
- TTS reads all dialogue
- Offline play works after first load
- All 5 levels completable
- Save/load works across all levels
- Total playtime: 45-90 minutes as designed

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
