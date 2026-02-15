# Catacombs & Creeds - Bug Fix & Polish Plan

Comprehensive audit of bugs, boundary issues, and UX problems found during a full code review of all 20 JS files (~8,500 lines).

---

## Critical Bugs

### 1. Movement speed is frame-rate dependent
**Files:** `game.js:551-603`, `player.js:34-62`
**Problem:** `player.speed` is a constant `2` pixels per frame, not scaled by `deltaTime`. On a 120Hz iPad Pro the player moves twice as fast as on a 60Hz device. Enemy patrol speed (`game.js:1062`) has the same issue.
**Fix:** Multiply `player.speed` and `enemy.patrolSpeed` by `deltaTime / 16.67` (normalize to 60fps baseline). Update `updatePlayerMovement()`, `updateSimplePatrol()`, and `updateWaypointPatrol()`.

### 2. Enemy patrol wall-collision reversal is broken
**File:** `game.js:1082-1085`
**Problem:** When an enemy hits a wall tile, direction is flipped *before* the position correction. The correction `enemy.x -= enemy.patrolSpeed * enemy.patrolDirection` uses the already-flipped direction, pushing the enemy *further into* the wall instead of away from it.
**Fix:** Reverse the line to `enemy.x += enemy.patrolSpeed * enemy.patrolDirection` (add, not subtract, since direction was just flipped). Or correct position before flipping direction.

### 3. Victory screen hardcoded to "Level 1 Complete!"
**File:** `screens.js:439, 444`
**Problem:** `renderVictory()` always shows "Level 1 Complete!" and "The Catacombs" regardless of which level was just completed. The `stats.levelName` field exists but is never used.
**Fix:** Replace hardcoded strings with `stats.levelName`. Also fix "Apostle Coins" label to be dynamic based on the level's collectible type.

### 4. HUD notification fade-out never renders
**File:** `hud.js:367-370`
**Problem:** The fade-out alpha is set inside an `if` block but `ctx.globalAlpha` is immediately reset to `1.0` unconditionally right after, so notifications disappear abruptly instead of fading.
**Fix:** Move the `ctx.globalAlpha = 1.0` reset inside an `else` branch, or restructure to apply alpha before rendering and reset after.

### 5. Save validation rejects valid coordinate `playerX === 0`
**File:** `save.js:150`
**Problem:** `!saveData.playerX` evaluates to `true` when `playerX` is `0`, which is a valid coordinate. A save at the left edge of the map would be rejected as "corrupted."
**Fix:** Change to `saveData.playerX === undefined || saveData.currentLevel === undefined`.

### 6. Playtime is never tracked (always shows 0)
**File:** `save.js:99, 487-491`
**Problem:** `_getPlaytime()` calls `getSlotPreview()` which formats playtime as a string, but `saveToSlot()` stores the formatted string result as the new playtime. This creates a circular chain that always resolves to `0m` because the initial value is `0` and the formatted output of 0 is `"0m"` which isn't a number.
**Fix:** Track cumulative playtime properly: store `playtimeMs` (number) in save data. On each save, add `performance.now() - sessionStartTime` to the previously-stored value. Pass session start time from Game into the save system.

### 7. Boss collision push-back can clip player into walls
**File:** `game.js:1256-1258`
**Problem:** When the player collides with a boss, they're pushed back by `tileSize` pixels in the opposite direction without any walkability check. This can embed the player inside a wall.
**Fix:** After calculating the push-back position, check `map.isAreaWalkable()` before applying. If the new position is invalid, try smaller push amounts or find the nearest walkable tile.

---

## Moderate Bugs

### 8. `enterVictoryState()` is dead code - VICTORY state unreachable
**File:** `game.js:1860-1900`
**Problem:** `enterVictoryState()` builds victory stats and transitions to `VICTORY` state, but is never called. Level completions go through `transitionToLevel()` or `enterGameComplete()` instead. The `VICTORY` state and `updateVictory()` are orphaned dead code.
**Fix:** Either remove the dead code, or wire it up so completing a level shows the victory stats screen before transitioning. The victory screen is already rendered by `screens.renderVictory()`.

### 9. `saveKey` property is undefined
**File:** `game.js:2012`
**Problem:** `this.saveKey` is used in legacy `saveGame()`/`loadGame()` methods but is never initialized. If these methods are ever called, `localStorage.setItem(undefined, ...)` would create a key named `"undefined"`.
**Fix:** Either remove the legacy save/load methods (since the slot system replaced them) or initialize `this.saveKey = 'catacombsCreeds_legacy'` in the constructor.

### 10. `GAME_OVER` state defined but never entered
**File:** `config.js:17`, `game.js` (no handler)
**Problem:** `GameState.GAME_OVER` exists in the enum but no code ever transitions to it. Combat defeat respawns the player directly. There's no `render` or `update` case for it in the main loop.
**Fix:** Remove `GAME_OVER` from the enum since it's unused, or implement a proper game-over screen if desired.

### 11. Hidden walls and broken barriers not persisted in save data
**Files:** `tilemap.js:276-295`, `game.js:1944-2010`
**Problem:** `revealHiddenWall()` and `breakBarrier()` modify `this.tiles[][]` directly (changing tile type to FLOOR), but `tileState` only tracks door/chest/altar state. When the game is saved and reloaded, the tile grid is rebuilt from the original JSON, so revealed walls and broken barriers revert to their original types.
**Fix:** Track revealed/broken tiles in a separate save data array (e.g., `modifiedTiles: [{x, y, newType}]`), and replay those modifications after loading the level.

### 12. Settings TTS toggle doesn't connect to DialogueSystem
**File:** `screens.js:132`, `dialogue.js:39`
**Problem:** The Settings screen has a TTS toggle that sets `this.settings.tts`, but this is never wired to `dialogue.ttsEnabled`. The only way to toggle TTS is pressing T during a dialogue.
**Fix:** In the `onSettingsChanged` callback, sync `this.dialogue.ttsEnabled = settings.tts`.

---

## Boundary / Edge Case Issues

### 13. No canvas resize handler (iPad rotation breaks layout)
**Files:** `render.js:34-52`, `camera.js`
**Problem:** Canvas dimensions are set once during construction. If the user rotates their iPad or the browser window is resized, the canvas does not adapt. The camera's `canvasWidth`/`canvasHeight` also become stale.
**Fix:** Add a `window.addEventListener('resize', ...)` handler that calls `renderer.setupCanvas()` and `camera.resize()`. Debounce it to avoid excessive recalculation.

### 14. Touch button positions hardcoded (overlap on small screens)
**File:** `input.js:62-69`
**Problem:** Touch button positions use hardcoded pixel values (`cw - 90`, `cw - 30`). On narrow screen widths, the ACT and ESC buttons may overlap or the D-pad may be too close to the edge.
**Fix:** Calculate positions as percentages of canvas dimensions with minimum spacing guarantees. Ensure all touch targets maintain 44x44px minimum (accessibility requirement).

### 15. Inventory cursor can exceed bounds after item removal
**File:** `inventory.js:380-393`
**Problem:** If an item is used/consumed while the inventory is open, `cursorIndex` may point past the end of the items array. Navigation clamps on keypress, but the render loop could read an out-of-bounds index before the next keypress.
**Fix:** Clamp `cursorIndex` in the `update()` method before any operation, or clamp it whenever an item is removed.

### 16. No bounds checking on level tile data
**File:** `tilemap.js:47`
**Problem:** If `levelData.tiles` is shorter than `width * height` (due to a level JSON editing error), `tiles[y][x]` will be `undefined`, which silently becomes falsy and gets treated as `TileType.FLOOR` (0).
**Fix:** Add a length validation check in the constructor: `if (levelData.tiles.length !== this.width * this.height) console.error(...)`. Default undefined tiles to `TileType.WALL` instead of allowing them to be walkable.

---

## UX Issues

### 17. "Continue" button enabled when no saves exist
**File:** `screens.js:13`
**Problem:** The title menu always enables "Continue" even when no save data exists. Selecting it opens an empty slot picker with no guidance.
**Fix:** Check `saveSystem.hasSaveData()` during title screen render and disable the "Continue" option (gray it out) when no saves exist.

### 18. Quick-use keys (1-3) don't work during gameplay
**File:** `game.js:444-543`
**Problem:** The HUD renders quick-use item slots labeled "1", "2", "3", implying those keys use the items. But in `updatePlaying()`, keys 1-3 are not handled. They only work in combat for action selection, creating user confusion.
**Fix:** Add key handlers in `updatePlaying()` for keys 1, 2, 3 that use the corresponding consumable item from the quick-use slots (mirroring what the HUD displays).

### 19. Auto-save notification is distracting
**File:** `save.js:114`
**Problem:** Every 2 minutes, auto-save triggers a "Game Saved" toast notification. For the ADHD-target audience, frequent toasts can break focus and flow.
**Fix:** Use a smaller, less intrusive indicator for auto-saves (e.g., a brief icon flash in the corner) vs. the full toast notification. Reserve the full toast for manual saves at altars.

### 20. No confirmation on "Exit to Title"
**File:** `game.js:764-773`
**Problem:** Selecting "Exit to Title" from the pause menu immediately exits to title after a silent auto-save. If the auto-save fails (storage full), progress is lost without warning.
**Fix:** Add a confirmation step: "Exit to title? Progress will be auto-saved." with Yes/No options.

### 21. Debug UI visible to end users
**File:** `index.html:49-53`
**Problem:** The overlay showing FPS, tile coordinates, and level name is always visible. These are developer tools, not useful for 8-12 year old players, and add visual clutter.
**Fix:** Hide the debug UI by default. Add a toggle (e.g., Ctrl+F3 or a hidden settings option) for development. Or move debug info to console-only.

### 22. Tap-anywhere-to-interact is too aggressive on touch
**File:** `input.js:129-131`
**Problem:** Any touch on the game world area (not on controls) fires a SPACE press, triggering an interaction. Players tapping to look around will accidentally interact with nearby NPCs/tiles.
**Fix:** Only fire SPACE on short taps (< 200ms) near an interactable, or require a double-tap for interaction. Alternatively, only fire if `nearInteractable` is true (requires passing game state to input, or removing the auto-interact entirely).

### 23. Stealth bypass XP is exploitable
**File:** `game.js:1324-1348`
**Problem:** Walking near a stealth enemy and then walking away grants +15 XP "stealth bonus" without any actual stealth gameplay. The check only verifies distance, not that the player actually avoided detection.
**Fix:** Add condition: only grant bypass XP if `enemy.alertLevel` never reached >= 0.5 while the player was near, indicating genuine stealth.

### 24. Combat turn message can overlap with action menu
**File:** `combat.js:1222-1243`
**Problem:** The turn message bar renders at `h/2 - 15` which is the exact center of the screen. On small screens, this can overlap with the enemy HP bar above or the action menu below.
**Fix:** Position the turn message dynamically based on canvas height, between the enemy area and the action menu.

### 25. No keyboard shortcut hints for touch users
**Problem:** Touch users see D-pad, ACT, ESC, and INV buttons but have no way to access other features like mute (M), quick-use items (1-2-3), or abilities (4-5-6).
**Fix:** Either add additional touch buttons for common actions, or add a "more controls" overlay accessible from the touch UI.

---

## Implementation Priority

### Phase 1 - Critical Bugs (breaks gameplay) ✓
- [x] #1 Frame-rate dependent movement
- [x] #2 Enemy patrol wall-collision reversal
- [x] #5 Save validation rejects coordinate 0
- [x] #7 Boss push-back clips into walls
- [x] #4 HUD notification fade broken

### Phase 2 - Save/Progress Bugs (data loss or incorrect state) ✓
- [x] #6 Playtime never tracked
- [x] #11 Hidden walls/barriers not persisted
- [x] #9 `saveKey` undefined (remove legacy methods)
- [x] #15 Inventory cursor bounds

### Phase 3 - UI/Display Bugs ✓
- [x] #3 Victory screen hardcoded to Level 1
- [x] #8 Dead victory state code cleanup
- [x] #10 Remove unused GAME_OVER state
- [x] #17 Disable Continue when no saves
- [x] #21 Hide debug UI

### Phase 4 - UX Polish
- [ ] #18 Quick-use keys during gameplay
- [ ] #19 Less intrusive auto-save notification
- [ ] #22 Less aggressive tap-to-interact
- [ ] #23 Stealth bypass XP validation
- [ ] #12 Wire TTS settings to dialogue
- [ ] #20 Exit-to-title confirmation

### Phase 5 - Platform / Responsiveness
- [ ] #13 Canvas resize handler
- [ ] #14 Responsive touch button layout
- [ ] #16 Tile data bounds checking
- [ ] #24 Turn message overlap
- [ ] #25 Additional touch controls
