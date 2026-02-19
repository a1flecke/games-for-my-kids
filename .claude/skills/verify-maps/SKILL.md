---
name: verify-maps
description: Run a BFS flood-fill reachability check on all catacombs-and-creeds level JSON files to confirm every NPC, item, chest, and enemy is reachable from the player start position.
argument-hint: "[level number or 'all']"
---

Run a BFS reachability analysis on the catacombs-and-creeds level maps.

## Tile walkability rules (from js/tilemap.js isSolid())

**Walkable** (player can traverse): 0=FLOOR, 2=DOOR, 4=ALTAR, 7=STAIRS, 8=HIDING, 11=LATIN_TILE, 13=MARBLE
**Solid** (blocks movement): 1=WALL, 3=CHEST, 5=TORCH, 6=WATER, 9=BOOKSHELF, 10=HIDDEN_WALL, 12=BARRIER, 14=PILLAR

Critical gotchas that have caused false positives before:
- CHEST (3) is SOLID — chests block movement
- HIDING (8) is WALKABLE — hiding spots are traversable
- LATIN_TILE (11) is WALKABLE — decorative floor tiles
- MARBLE (13) is WALKABLE — marble floor tiles
- PILLAR (14) is SOLID — pillars block movement

## Instructions

1. Determine which levels to check based on $ARGUMENTS (default: all 5 levels).

2. For each level file at `catacombs-and-creeds/data/levels/levelN.json`:
   a. Read the JSON file
   b. Find the player start position (look for `"playerStart"` or entity with `"type": "player"`)
   c. Build a 2D walkability grid from `"tiles"` array using the solid set above
   d. Run BFS from the player start tile, treating solid tiles as walls and DOORS as walkable
   e. Collect all entities (NPCs, items, enemies, chests, altars, stairs) with their tile coordinates
   f. Check which entities are NOT in the BFS-reachable set

3. Report results:
   - For each level: "Level N: ✓ All X entities reachable" or list unreachable entities with their coordinates
   - If any entities are unreachable, suggest what wall or blocker might be trapping them

4. Use the Task tool with a Bash or general-purpose subagent to write and run the BFS script in Node.js for accuracy.

## Example Node.js BFS template

```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('level1.json'));
const SOLID = new Set([1,3,5,6,9,10,12,14]);
const tiles = data.tiles; // 2D array [row][col]
const height = tiles.length, width = tiles[0].length;

const start = data.playerStart; // {x, y} in tile coords
const visited = new Set();
const queue = [[start.x, start.y]];
visited.add(`${start.x},${start.y}`);

while (queue.length) {
  const [x, y] = queue.shift();
  for (const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const nx=x+dx, ny=y+dy;
    const key=`${nx},${ny}`;
    if (nx>=0&&ny>=0&&nx<width&&ny<height&&!visited.has(key)&&!SOLID.has(tiles[ny][nx])) {
      visited.add(key); queue.push([nx,ny]);
    }
  }
}

// Check entities
for (const entity of [...(data.npcs||[]), ...(data.items||[]), ...(data.enemies||[])]) {
  const key = `${entity.x},${entity.y}`;
  if (!visited.has(key)) console.log(`UNREACHABLE: ${entity.id || entity.type} at (${entity.x},${entity.y})`);
}
```
