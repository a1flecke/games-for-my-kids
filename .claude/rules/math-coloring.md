---
paths:
  - "math-coloring-2/**"
---

# Math Coloring 2 — Architecture Notes

2nd grade math coloring game. Single file: `math-coloring-2/index.html` (all JS/CSS/HTML inline).

**Key data structures (all in the `<script>` block):**
- `themes` — object with 7 keys (`puppies`, `kitties`, `unicorns`, `frogs`, `elephants`, `turtles`, `butterflies`). Each is an array of section objects: `{ x, y, r, answer, type:'circle' }` or `{ x, y, points:[[x,y],...], answer, type:'polygon'|'triangle' }`. The `x,y` field doubles as the number label position for polygons, so set it near the centroid.
- `lessons` — array of 25 lesson objects (indices 0–24). Each: `{ title, description, problems: { [answerInt]: [string,...] } }`.
- `colors` — maps answer integer → CSS hex. Every answer value used in any theme needs an entry; missing values fall back to `'#FFB6C1'`.

**Critical rules when editing themes:**
- **Section overlap**: Every section must visually overlap its nearest neighbor by ≥15px. For circles: `overlap = (r1 + r2) - dist(centers)`. For polygons: at least one vertex must land inside the adjacent circle (`vertex_dist < r`). Use `/verify-math-geometry` skill to check.
- **Hit-test order**: Sections are tested in reverse array order (last = topmost). Small sections (eyes, nose) must be listed AFTER the large body/head circles they visually sit on top of.
- **Rendering**: Two-pass draw — all fills before all strokes. Never revert to single-pass (causes visible outline gaps where circles overlap).
- **Answer values**: All answer keys in a theme must exist in the `colors` map. Currently missing nothing; if you add a new answer value, add it to `colors` first.

**Grade-level rules for lessons:**
- Lessons 1–21 mix in `×` and `÷` notation (grandfathered). For new lessons (22+): **no `÷` or `×` symbols** — these are Grade 3 standards. Use addition/subtraction phrasing only (`'Half of 8 = ?'` not `'8 ÷ 2'`).
- Fractions-of-quantities (`1/4 of 32`) are Grade 4+, not appropriate for a 2nd grade game.
- Telling-time problems: "minute hand at 6 = 30 minutes past" — answer must be 30, not 6.
