# Session 10 — Wardrobe + Room Decoration
**Model:** Opus | **Focus:** Quick dress-up in care mode, room customization

## Deliverables

- **Wardrobe screen** (accessible from Care mode):
  - Slide-up panel with accessory categories (tabs)
  - Tap to equip instantly with "pop" animation, tap equipped to remove
  - Quick color change (12 most popular colors)
  - Preview creature in center while tapping through options
  - "Outfit save" — save 3 favorite outfit combos for quick-swap
- **Room decoration** (ROOM_EDIT state):
  - Drag-to-place room items: bed, food bowl, toy ball, plant, picture frame, rug, lamp, window curtain color
  - Wall color picker (8 pastel options)
  - Floor pattern (wood, carpet, tiles)
  - Max 8 room items placed
  - Room items have creature interaction
  - Room state saved per creature
- `room.js` — Room renderer: background wall + floor, room items in z-order, creature with idle animation, interactable items

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
