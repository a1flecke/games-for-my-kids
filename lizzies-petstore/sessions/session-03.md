# Session 3 — Body Part Drawing Library
**Model:** Opus | **Focus:** Procedural Canvas drawing for all body part types

## Deliverables

- `parts.js` — Procedural drawing library (all drawn with 3-4px thick outlines, rounded shapes):
  - **Heads** (10): cat, dog, bird, bunny, dragon, fox, owl, bear, unicorn, mermaid
  - **Eyes** (6): sparkle (big anime), button, cat-slit, wide-round, sleepy, starry — eyes are 25-30% of head width
  - **Torsos** (8): round, oval, long, stocky, serpentine, fluffy-cloud, heart-shaped, star-shaped
  - **Legs** (6): paws (2/4), bird (2), hooves (4), tentacles (4), webbed-feet, stubby
  - **Tails** (8): fluffy, dragon, fish, peacock, curly-pig, mermaid, phoenix, stub
  - **Wings** (6): bird, butterfly, dragon, fairy, bat, angel
  - **Extras** (10): unicorn horn, antlers, deer-horns, floppy-ears, pointed-ears, round-ears, dorsal-fin, side-fins, tusks, antennae
- Each drawing function: `drawPartName(ctx, color, covering, pattern, scale)` → renders to provided context
- **Covering renderer module:** fur (short random strokes along contour), scales (overlapping small arcs), feathers (layered soft ovals), smooth (clean gradient fill) — applied via `source-atop` compositing on part shapes
- **Pattern renderer module:** solid, spots (random circles), stripes (parallel curves following body contour), gradient (two-tone blend)
- `creature-cache.js` — CreatureCache class:
  - Caches each part to individual offscreen canvas at display size x DPR
  - `invalidatePart(partSlot)` → re-renders only that part's offscreen canvas
  - `drawCreature(ctx, x, y, animState)` → composites all cached parts in RENDER_ORDER with pivot transforms from animState
  - Max 30 offscreen canvases active (warn + LRU evict if exceeded)
- `data/parts.json` — Full catalog: id, name, category, defaultColor, hitBox, attachSlot, pivotPoint, unlockCondition, biome tags

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
