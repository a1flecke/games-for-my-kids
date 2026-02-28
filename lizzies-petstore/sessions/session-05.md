# Session 5 — Creator Studio: Styling Tools
**Model:** Opus | **Focus:** Colors, coverings, patterns, resize, rotate, eye customization

## Deliverables

- Style panel (slides up from bottom when a part is selected):
  - **Color palette:** 6 preset palettes (Rainbow, Pastel, Earth, Ocean, Galaxy, Candy) each with 8 colors = 48 swatches. Tap to apply instantly. Last 8 used colors as quick-access row.
  - **Covering picker:** 4 large icon buttons (fur, scales, feathers, smooth) with tactile feedback
  - **Pattern picker:** 4 icon buttons (solid, spots, stripes, gradient)
  - **Size slider:** Horizontal slider (0.5x to 2.0x), chunky thumb for small fingers
  - **Rotation dial:** Simple left/right arrows for 15-degree increments (not continuous rotation — too fiddly for age 7)
  - **Mirror/flip** button for bilateral symmetry
- **Eye customization panel** (when head is selected):
  - Eye style picker (6 types from parts.js)
  - Eye color picker (subset of main palette — focused on eye colors)
- All changes apply instantly with `CreatureCache.invalidatePart()` re-render
- Color change debounced for save (rapid tapping won't thrash localStorage)

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
