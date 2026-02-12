# Session 7: Save System & HUD

**Recommended Model: Sonnet** - Straightforward localStorage work with a well-defined data format. HUD rendering is standard canvas drawing. Settings screen follows established patterns.

## Goal
3-slot save system with auto-save. Heads-up display showing health, current objective, and level progress. Settings for accessibility options.

## Tasks

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

## Files Modified
- `js/game.js` (save integration, auto-save triggers, HUD rendering)
- `js/screens.js` (save slot UI, settings screen)
- `js/renderer.js` (HUD layer rendering)
- `index.html` (new script tags)

## Files Created
- `js/save.js`
- `js/hud.js`

## Validation
- Save at altar -> slot picker -> confirmation
- Load from title screen -> game resumes exactly
- Auto-save notification appears periodically
- HUD displays health, objective, progress
- Settings persist across sessions
- Text size changes apply immediately
- 3 save slots work independently
