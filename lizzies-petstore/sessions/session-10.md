# Session 10 — Wardrobe + Room Decoration (Revised)
**Model:** Opus | **Focus:** Quick dress-up in care mode, room customization

## Review Findings (from original spec)

1. **Wardrobe screen** had no implementation details for creature preview rendering, cache invalidation on accessory change, or save integration
2. **Room editor** had no room item catalog, no drawing functions, no drag handling, and floor pattern wasn't in the data model
3. State machine entry/exit handlers were incomplete — WARDROBE didn't load creature, ROOM_EDIT didn't call startEditing()
4. "Room items have creature interaction" was undefined
5. "Outfit save" feature (3 combos) adds complexity with minimal value for a 7-year-old — cut to keep scope focused
6. "Window curtain color" as a room item is confusing — replaced with clearer items

## Deliverables

### A. Wardrobe Screen (WARDROBE state)

**Entry:** From CARE via wardrobe button. **Exit:** Back to CARE.

**Layout:**
- Top bar: back button + "Wardrobe" title
- Canvas: live creature preview with idle animation (center, ~45% of min dimension)
- Category tab bar: head/neck/body/feet/face icons (same as creator accessory slots)
- Scrollable accessory strip below tabs (reuses `.part-strip` pattern)
- Color picker row: 12 popular colors for quick recolor of equipped accessory

**Behavior:**
- Tap unequipped accessory → equip it (replaces any existing in that slot), pop sound + sparkle burst
- Tap already-equipped accessory → unequip it, soft sound
- Equipped accessories show green checkmark badge (reuses `.part-thumb-equipped`)
- Locked accessories shown dimmed with lock icon (reuses existing pattern from creator)
- Color picker appears when an accessory is equipped in current slot — tap swatch to recolor
- Creature cache invalidated on every equip/unequip/recolor via `invalidatePart('accessories')`
- Changes auto-saved via `saveManager.updateCreature()`

**State machine details:**
- `_enterState('WARDROBE')`: setup canvas, load creature, build cache, start idle animation, populate wardrobe UI
- `_exitState('WARDROBE')`: stop animation (creature re-cached on CARE entry)
- Game loop: `animationEngine.update(dt)` + draw creature on canvas
- Input: DOM buttons only (no canvas pointer interaction needed)

### B. Room Decoration (ROOM_EDIT state)

**Entry:** From CARE via room button. **Exit:** Back to CARE (back or done button).

**Room Item Catalog** (8 items, procedurally drawn on canvas):
1. Bed — rounded rectangle with pillow and blanket
2. Food bowl — half-circle bowl with kibble dots
3. Toy ball — circle with star pattern
4. Plant — pot with leaves
5. Picture frame — rectangle with simple landscape
6. Rug — oval with border pattern
7. Lamp — base + shade trapezoid
8. Bookshelf — rectangle with colored book spines

**Layout:**
- Top bar: back button + "Decorate!" + done button
- Canvas: room background (wall + floor) with placed items + creature
- Bottom strip: item catalog (scrollable, same `.part-strip` style)
- Wall color picker: 8 pastel swatches in a row above item strip
- Floor pattern selector: 3 options (wood/carpet/tiles) as toggle buttons

**Behavior:**
- Tap item in strip → places it at a default position in the room (centered on floor area)
- Drag placed items to reposition (pointer events + setPointerCapture)
- Tap placed item → highlight it, show remove button (X overlay on item)
- Double-tap placed item → remove it
- Max 8 items — strip items dim when limit reached
- Wall color picker: tap swatch → instant wall color change
- Floor pattern: tap option → instant floor change
- All changes saved to creature.room via saveManager.updateCreature()

**Data model additions to creature.room:**
```json
{
  "wallColor": "#FFE4E1",
  "floorPattern": "wood",
  "items": [{ "type": "bed", "x": 0.2, "y": 0.75 }]
}
```

**State machine details:**
- `_enterState('ROOM_EDIT')`: setup canvas, load creature, call roomManager.startEditing(), populate item strip + wall/floor pickers
- `_exitState('ROOM_EDIT')`: save room state, cancel roomManager
- Game loop: `roomManager.update(dt)` + `roomManager.draw(ctx, w, h)`
- Input: canvas pointer events for drag-to-place, DOM for catalog/pickers

### C. File Changes

| File | Changes |
|------|---------|
| `js/game.js` | Wardrobe enter/exit/update/draw, room enter/exit with save, wardrobe UI population |
| `js/room.js` | Full rewrite: room item drawing, drag handling, wall/floor rendering, item catalog |
| `js/renderer.js` | Add `drawRoomBackground()` with floor patterns |
| `js/save.js` | Add `floorPattern` to creature room defaults |
| `index.html` | Wardrobe tabs + color picker HTML, room wall/floor picker HTML |
| `css/style.css` | Wardrobe tabs, color picker row, room picker styles |

### D. What's NOT in this session
- Outfit save/load (3 combos) — cut for simplicity
- Room item creature interaction animations — deferred to polish session
- Room item rotation — unnecessary complexity for target audience
