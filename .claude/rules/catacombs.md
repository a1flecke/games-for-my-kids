---
paths:
  - "catacombs-and-creeds/**"
---

# Catacombs & Creeds — Architecture Notes

Educational dungeon crawler — the most complex game. Key docs:
- `plan.md` — full design spec (1700 lines): levels, mechanics, accessibility requirements, content

All 5 levels built with full content. Core systems complete: combat, inventory (580×560 panel), 3-slot save system, dialogue with pixel-art portraits, question bank (66 questions), NPC/enemy/item placement verified reachable across all maps.

**Key source files:**
- `js/game.js` — main engine/state machine
- `js/tilemap.js` — map, tile types; interact() takes optional playerTile param
- `js/render.js` — Canvas rendering
- `js/dialogue.js` — dialogue system using portraits.js
- `js/portraits.js` — pixel-art portraits for 7 characters
- `js/save.js` — 3-slot save; autoSave() skips if currentSlot === null
- `js/questions.js` — 66-question bank, Fisher-Yates shuffle, session-wide deduplication
- `content/level1_dialogue.js` — guide NPC is "Priscilla" (not Peter)
- `data/levels/level{1-5}.json` — level maps and entity placement

**Tile type walkability** (critical for map editing — do not confuse):
- Walkable: FLOOR=0, DOOR=2, ALTAR=4, STAIRS=7, HIDING=8, LATIN_TILE=11, MARBLE=13
- Solid: WALL=1, CHEST=3, TORCH=5, WATER=6, BOOKSHELF=9, HIDDEN_WALL=10, BARRIER=12, PILLAR=14

Use `/verify-maps` skill to BFS-check all level maps for reachability after editing.

**Target platform:** iPad Safari with Bluetooth keyboard. Must maintain 60fps on iPad.

## Accessibility

- **Text:** Maximum 15 words per dialogue box, no time pressure, typewriter effect skippable
- **ADHD:** Auto-save every 2 minutes, always-visible objectives, 9–18 min per level
