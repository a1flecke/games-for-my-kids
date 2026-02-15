# Fix Unreachable Entities & Interaction Bugs in Catacombs & Creeds

## Context

Two open issues report unreachable entities:
- **Issue #20**: Two roman guards in Level 1 are completely trapped inside water-enclosed rooms with no entrance
- **Issue #21**: The roman centurion (boss) in Level 1 is hard/impossible to reach, blocking level completion

A full reachability analysis (BFS flood fill from player start on all 5 levels) plus metadata audit uncovered these issues:

### Level 1 — 3 bugs found
1. **guard_3 at (9,14) and guard_4 at (20,14)** are in isolated water rooms (x=8-11 and x=17-20, y=13-15). These rooms are completely surrounded by water tiles with zero entrances.
2. **Catacomb key metadata mismatch**: tileMetadata entry `{x:20, y:17, contents:"catacomb_key"}` points to a FLOOR tile. The actual chest is at **(21, 17)**. The key is unobtainable, so the locked door at (14,16) can never be opened.
3. **Centurion at (14,13)** is technically reachable only through the x=24 corridor, but the path is non-obvious. Fixing the catacomb_key (#2) enables a second path through the locked door at (14,16).

### Level 2 — 2 patrol route bugs
4. **patrol_2** waypoint `(3, 15)` is a TORCH tile (solid) — enemy patrol walks into a wall
5. **prefect_boss** waypoint `(18, 18)` is a WALL tile — boss patrol walks into a wall

### Levels 3-5 — No issues found

---

## Plan

### Fix 1: Open water rooms in Level 1 (Issues #20 & #21)
**File:** `catacombs-and-creeds/data/levels/level1.json`

Add doorways from the x=14 corridor into both water rooms at y=14:

| Position | Old Tile | New Tile | Purpose |
|----------|----------|----------|---------|
| (12, 14) | 6 (WATER) | 0 (FLOOR) | Pathway to left water room |
| (13, 14) | 1 (WALL) | 2 (DOOR) | Door to left water room |
| (15, 14) | 1 (WALL) | 2 (DOOR) | Door to right water room |
| (16, 14) | 6 (WATER) | 0 (FLOOR) | Pathway to right water room |

Add tileMetadata entries for the new doors:
```json
{ "x": 13, "y": 14, "locked": false }
{ "x": 15, "y": 14, "locked": false }
```

This connects both water rooms to the x=14 corridor, making guard_3, guard_4, and the centurion all reachable.

### Fix 2: Catacomb key metadata (Level 1)
**File:** `catacombs-and-creeds/data/levels/level1.json`

Change the catacomb_key metadata coordinates from `(20, 17)` to `(21, 17)` to match the actual chest tile.

Before: `{ "x": 20, "y": 17, "contents": "catacomb_key" }`
After: `{ "x": 21, "y": 17, "contents": "catacomb_key" }`

This makes the catacomb_key obtainable, which allows the player to unlock the door at (14,16) for a second path to the centurion.

### Fix 3: Patrol route — patrol_2 in Level 2
**File:** `catacombs-and-creeds/data/levels/level2.json`

Change waypoint from `{x:3, y:15}` to `{x:2, y:15}` (nearby floor tile).

### Fix 4: Patrol route — prefect_boss in Level 2
**File:** `catacombs-and-creeds/data/levels/level2.json`

Change waypoint from `{x:18, y:18}` to `{x:17, y:18}` (last floor tile before wall).

---

## Files Modified
- `catacombs-and-creeds/data/levels/level1.json` — tile data, tileMetadata
- `catacombs-and-creeds/data/levels/level2.json` — enemy patrol routes

## Verification
1. Re-run the BFS reachability analysis to confirm zero unreachable entities across all levels
2. Manually verify the tile changes in level1.json by checking row 14 tile array values
3. Verify the catacomb_key metadata now points to the chest tile at (21,17)
4. Verify Level 2 patrol waypoints are all on walkable tiles
