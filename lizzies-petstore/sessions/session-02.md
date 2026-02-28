# Session 2 — Core Engine + Index Registration
**Model:** Opus | **Focus:** State machine, Canvas setup, save system, index registration

## Deliverables

- `game.js` — Full state machine with documented transition table:
  - TITLE: "New Creature" → CREATOR, "My Pets" → GALLERY
  - CREATOR: "Done" → BIRTH → CARE, back → GALLERY (with unsaved-changes confirmation)
  - BIRTH: auto-advance → CARE after animation
  - CARE: Park → PARK, Wardrobe → WARDROBE, Room → ROOM_EDIT, Gallery → GALLERY
  - PARK: "Go Home" → CARE
  - GALLERY: tap pet → CARE, "Edit" → CREATOR, "New" → CREATOR
  - RAF loop active in all Canvas states, paused in overlay states
- `renderer.js` — Canvas setup with DPR, resize handler, background rendering per scene, clear/draw cycle, font loading guard (`document.fonts.ready`)
- `save.js` — SaveManager: `_defaults()` with all keys, load with schema migration, debounced auto-save, backup key, quota error toast, gallery CRUD
- `ui.js` — Pointer event framework (tap, drag, long-press), coordinate conversion, modal system with focus traps (role="dialog", Escape to close, Tab trap)
- Register in `update-index.js`: `manualGameConfig` entry + `creativity` category in `gameCategories`
- Title screen: game logo, "Create a Creature!" and "My Pets" buttons (icons + text)
- Run `node .github/scripts/update-index.js` to regenerate index

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
