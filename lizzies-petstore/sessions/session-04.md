# Session 4 — Creator Studio: Layout, Palette, and Placement
**Model:** Opus | **Focus:** Creator screen UI, part selection, placement system

## Deliverables

- `creator.js` — Creator studio manager:
  - **Layout:** Bottom tab bar (category icons: head, body, legs, tail, wings, sparkle-star for extras) + horizontally scrollable part strip above tabs + Canvas workspace (top 2/3 of screen)
  - **Part thumbnails:** 72x72px mini Canvas previews in the scrollable strip, rendered once from parts.js
  - **Two placement modes:**
    - **Tap-to-place (primary, recommended for 7yo):** Tap part in palette → it appears at the correct attachment point on creature with a "pop" animation + sparkle. Auto-replaces existing part in same slot.
    - **Drag-to-place (advanced):** Long-press (300ms) a palette part to pick up, drag to canvas, snap to nearest valid attachment point (50px snap radius with glowing circle indicators)
  - **Selection:** Tap a placed part → selection ring appears, style panel opens from bottom
  - **Delete:** Tap selected part → trash icon appears, tap trash to remove (with "poof" particle)
  - **Undo/redo:** Command pattern stack (last 20 operations). Undo/redo buttons in top bar.
  - **Attachment point visualization:** When dragging, valid attachment points glow as pulsing circles on the creature
- `tutorial.js` — Guided first-creature flow:
  1. "Pick a body!" → body tab highlights + bounces, arrow points to a cute torso
  2. User taps → torso appears on canvas with celebration sparkles
  3. "Now pick a head!" → head tab highlights
  4. User taps → head snaps to top attachment with happy sound
  5. "Add some legs!" → legs tab
  6. After 3 parts placed, "Great job! Add anything you want!" → all tabs unlock, free mode
  7. Tutorial state saved in localStorage (never repeats)
- Z-order rendering: `RENDER_ORDER` constant from rules file
- "Name & Finish" button appears after at least torso + head placed

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
