# Session 11 — Pet Gallery + Progression System
**Model:** Sonnet | **Focus:** Gallery view, unlocks, milestones, achievements

## Deliverables

- Gallery screen:
  - Grid of creature cards (2-column, scrollable): mini Canvas render + name + growth stage icon + mood icon
  - Tap → options: "Play with [name]" (→ Care), "Dress Up" (→ Wardrobe), "Redesign" (→ Creator), "Say Goodbye" (→ delete)
  - **Delete confirmation** — warm: "[Name] is going on a big adventure! Wave goodbye?" with waving animation
  - Empty state: "Your petstore is empty!" with bouncing arrow
  - Sort: newest first, name A-Z, growth stage
  - "New Creature" button always visible
- `progress.js` — Unlock/milestone system:
  - **Starter set:** 4 heads, 4 torsos, 3 legs, 3 tails, 2 wings, 3 extras, 8 accessories, 2 themes
  - **~15 milestones** with ~40 unlockable items (defined in data/unlocks.json)
  - Unlock notification with sparkle animation and item preview
  - Achievement/sticker book screen
  - "Creature of the day" prompt on title screen
- Settings panel: volume slider, mute toggle, reset progress (PIN-protected)

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
