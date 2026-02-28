# Session 14 — Polish, Accessibility, iPad QA
**Model:** Opus | **Focus:** A11y audit, touch polish, performance optimization, final testing

## Deliverables

- **Accessibility pass:**
  - All interactive elements: 44x44px min (60px for Creator palette)
  - WCAG AA contrast on all text (4.5:1 on cream). Secondary text >= #595143.
  - OpenDyslexic + Comic Sans fallback, 16pt min, 1.5x line height
  - `document.fonts.ready` guard before Canvas text rendering
  - Canvas font fallback: `ctx.font = '16px OpenDyslexic, "Comic Sans MS", cursive'`
  - aria-labels on all buttons, dynamic labels update with textContent
  - `aria-live` regions for mode changes, unlocks, need warnings
  - No flashing/strobing
  - Focus management: all overlays have trap + Escape + focus-return
  - Escape guard: check `.contains('open')` before acting
- **iPad optimization:**
  - Pointer Events with `touch-action: none`
  - Canvas at devicePixelRatio for Retina
  - 60fps profiling: verify CreatureCache prevents per-frame bezier
  - Memory audit: <= 30 offscreen canvases
  - Orientation: landscape preferred, portrait graceful
- **Polish:**
  - Smooth screen transitions (CSS opacity fade, 300ms)
  - Loading states for heavy operations
  - Error boundaries: corrupted save → defaults with friendly message
  - Edge cases: 0 pets, 20 pets, long names, rapid tapping, needs decay clock manipulation
  - UUID generation with v4 fallback
- **Final QA checklist:**
  - [ ] Create creature with every body part type
  - [ ] All coverings render correctly
  - [ ] All accessories attach correctly to different head/body types
  - [ ] Tutorial guides first creature correctly
  - [ ] All care mini-games work
  - [ ] Growth stages trigger at correct thresholds
  - [ ] Wardrobe quick-dress works from Care mode
  - [ ] Room decoration places/removes items
  - [ ] Park renders 6 creatures at 60fps
  - [ ] Park social interactions trigger correctly
  - [ ] Gallery shows all creatures, delete works with confirmation
  - [ ] Unlock milestones trigger and notify
  - [ ] Photo mode + creature cards export as PNG
  - [ ] Save/load preserves all creature data
  - [ ] All sounds play correctly (no harsh tones)
  - [ ] Volume/mute works
  - [ ] All validation scripts pass
  - [ ] No WCAG violations

## Session end
- Run `/petstore-checklist`, run all validation, run petstore-web-review agent, final commit + push, update MEMORY.md with final status
