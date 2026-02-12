# Session 3: Tile Map System & Level Data

**Recommended Model: Opus** - Designing the JSON data format and level loader architecture requires careful planning. The tile system with interactive tiles is complex and foundational to all future levels.

## Goal
Replace the hardcoded test map with a data-driven level system. Create the Level 1 map in JSON. Add interactive tile types (doors, chests, altars). NPCs exist on the map as entities.

## Tasks

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

## Files Modified
- `js/game.js` (level loading, NPC spawning)
- `js/renderer.js` (new tile types, NPC rendering, interaction prompts)
- `index.html` (new script tags)

## Files Created
- `js/tilemap.js`
- `js/npc.js`
- `js/camera.js`
- `data/levels/level1.json`

## Files Deleted
- None (old Map code in game.js gets replaced)

## Validation
- Level 1 loads from JSON
- All tile types render with distinct visuals
- NPCs appear at correct positions
- Player can walk through doors (unlocked), blocked by walls
- "SPACE" prompt appears near NPCs and interactable tiles
- Altars show save prompt
