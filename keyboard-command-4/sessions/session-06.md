# Session 6 — Level System, Transitions & Save (Opus)

## Goal

Build the level loading system, room-to-room transitions, corridor scenes, item pickups, and the LocalStorage save system. By the end, the full gameplay loop works: select level → play rooms → boss fight → results → save progress → return to level select.

## Files to Create

### `js/levels.js`

**LevelManager Class:**
- `loadLevel(id)`: fetch `data/levels/levelN.json`, parse, return level object
- `getCurrentRoom()`: returns current room data
- `advanceRoom()`: move to next room, trigger transition
- `isLevelComplete()`: true when boss defeated
- `getRoomCount()`: total rooms in current level
- `getCurrentRoomIndex()`: 0-based index of current room

**Room Transition System:**
- `startTransition(fromRoom, toRoom)`: trigger transition sequence
  1. Fade out current room (300ms — darken canvas to black)
  2. Show corridor view (500ms — themed hallway, camera "pan" via horizontal offset animation)
  3. During corridor: check for item pickups (health pack, weapon unlock)
  4. If new shortcut category, show Commander Byte dialogue
  5. Fade in next room (300ms)
- Total: ~1.5–2s per transition
- During transition: input disabled, HUD shows room progress updating
- Corridor visual: simple perspective hallway using same theme palette, drawn to canvas

**Item Pickup System:**
- Items defined in level JSON under `items[]`
- `{ after_room: 2, type: "health", amount: 25 }` — appears in corridor after room 2
- `{ after_room: 3, type: "weapon", weaponId: 4 }` — unlock new weapon
- Pickup display: item floats in corridor center, brief "COLLECTED!" text
- Health: immediate +HP with heal sound
- Weapon: "NEW WEAPON UNLOCKED: Plasma Cannon!" overlay, weapon auto-selected

**Boss Transition:**
- After final standard room, dramatic transition to boss chamber
- Longer corridor (800ms), screen tints red, ambient changes
- Boss intro: name title card ("THE FILE CORRUPTOR"), 2s display, then fight begins

### `js/save.js`

**SaveManager Class:**
- `_key`: `'keyboard-command-4-save'`
- `_defaults()`: returns fresh save object with all required fields:
  ```js
  {
    version: 1,
    currentLevel: 1,
    highestLevel: 1,
    totalScore: 0,
    levels: {},
    shortcuts: {},
    weaponsUnlocked: [1],
    selectedWeapon: 1,
    settings: {
      fontSize: 'medium',
      showPhysicalKeys: true,
      volume: 0.7,
      monsterSpeed: 'normal',
      hintMode: 'after3'
    }
  }
  ```
- **Every key that game.js reads must exist in `_defaults()`** (CLAUDE.md rule)
- `load()`: read from localStorage, merge with defaults (handles missing keys from older saves)
- `save(data)`: write to localStorage
- `getProgress()`: returns full save object
- `saveLevelResult(levelId, stats)`: update level-specific stats (keep best scores)
- `saveShortcutStats(shortcutId, correct)`: increment usage count, update accuracy
- `unlockWeapon(weaponId)`: add to unlocked list
- `updateSettings(key, value)`: update single setting, auto-save
- `reset()`: clear save data after "RESET" confirmation

**Auto-save triggers:**
- After each room clear: save current progress
- After boss defeat: save level completion + stats
- On settings change: save immediately
- On weapon unlock: save immediately

### `js/game.js` (modify)

**Level Select Integration:**
- `showLevelSelect()`: render 10 level cards from save data
  - Unlocked levels show: name, star rating, best score
  - Locked levels: silhouette + lock icon
  - Current/highest level highlighted
  - Arrow keys + Enter to select
- Stars: 1 star = completed, 2 stars = >80% accuracy, 3 stars = >90% accuracy + no deaths

**Results Screen:**
- `showResults(levelId, stats)`: display end-of-level stats
  - Monsters defeated / total
  - Accuracy %
  - Best combo
  - New shortcuts learned (count)
  - Time taken
  - Star rating (with star animation)
  - "NEW WEAPON UNLOCKED!" if applicable
  - "Next Level" / "Replay" / "Level Select" buttons
- Save results via SaveManager

**Full Gameplay Flow:**
1. Title → Level Select → select level
2. LevelManager loads level JSON
3. Tutorial check: if level 1 first time, run tutorial
4. Room loop: spawn waves → combat → room clear → transition → next room
5. Boss: enter boss chamber → multi-phase fight → boss death
6. Results: show stats, save, star rating
7. Return to level select (or next level)

## Testing

- Select Level 1 from level select → loads correctly
- Play through room 1 → room clear → corridor transition (fade out, corridor, fade in)
- Health pickup in corridor → HP increases, visual + sound feedback
- Weapon pickup → "NEW WEAPON UNLOCKED" message, weapon auto-selected
- Boss transition: dramatic corridor, boss name card
- Complete boss → results screen shows accurate stats
- Stars calculated correctly (1/2/3 based on accuracy and deaths)
- Save data written to localStorage after each room
- Reload page → progress persisted, level select shows correct stars
- Settings changes persist across page reloads
- "Reset All Progress" works (requires typing "RESET")
- Level 2 unlocks after completing Level 1

## Do NOT

- Do not create level JSON data files — sessions 7–9
- Do not implement the detailed tutorial steps — session 5 already handles TutorialManager
- Do not modify renderer or monster/weapon systems
