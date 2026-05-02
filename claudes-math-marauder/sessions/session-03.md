# Session 3 — Comic Renderer + Monster Schema + Animation
**Model:** Opus | **Focus:** Visual identity — comic-effects library, parametric monsters, animation system

This session builds the look. By the end, a debug screen renders one of every comic primitive plus three sample monsters with idle animations. No combat yet.

## Pre-flight

1. Read `plan.md` (rendering section).
2. Read spec sections 4 (Visual Renderer & Comic Style) — full text.
3. Read `keyboard-command-4/js/renderer.js` for the canvas-rendering precedent (procedural monster rendering, single-RAF integration).
4. Read `lizzies-petstore/js/creature-cache.js` for the offscreen-cache + LRU pattern.
5. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/fx/comicfx.js`
- `claudes-math-marauder/js/fx/shapes.js`
- `claudes-math-marauder/js/fx/monsterRenderer.js`
- `claudes-math-marauder/js/fx/wizardRenderer.js`
- `claudes-math-marauder/js/fx/animation.js`
- `claudes-math-marauder/js/fx/particles.js`
- `claudes-math-marauder/js/fx/cache.js` — offscreen-canvas LRU manager

## Files to modify

- `claudes-math-marauder/js/game.js` — add a hidden "Render Demo" screen (toggled by a debug button on the title screen for now) so we can visually check primitives without combat

## Deliverables

### 1. `fx/cache.js` — Offscreen canvas cache + LRU

API:
```js
class FxCache {
  constructor(maxCanvases = 30) { this.max = maxCanvases; this._map = new Map(); this._lru = []; }
  get(key) { /* return canvas or null; update LRU position */ }
  build(key, w, h, drawFn) { /* create canvas, call drawFn(ctx, w, h), store; evict LRU if over capacity */ }
  invalidate(key) { /* remove and free */ }
  size() { return this._map.size; }
}
```

LRU update **only** in `build()` and `get()`. Never touch LRU inside the draw loop. (CLAUDE.md hot-path rule.)

### 2. `fx/comicfx.js` — Effect primitives

Required functions (all called as plain functions, ctx-injected):

```js
inkOutline(ctx, pathFn, weight = 4, color = '#1a1a1a', wobbleSeed = 0)
halftoneFill(ctx, x, y, w, h, color, density = 0.04, seed = 0)
speedLines(ctx, ox, oy, dirRad, n = 8, len = 80, color = '#1a1a1a')
burstText(ctx, x, y, text, size = 48, color = '#f0d840', strokeColor = '#1a1a1a')
panelFlash(ctx, w, h, color, alpha)         // single-frame screen tint
inkBurst(ctx, x, y, radius, color, n = 20, seed = 0)
panelBorder(ctx, x, y, w, h, weight = 6, color = '#1a1a1a')
screenShake(now, intensity, untilMs)         // returns {dx, dy} for the caller to translate by
```

**Implementation notes:**
- `halftoneFill`: build a small offscreen pattern canvas (e.g. 64×64) with seeded-PRNG dot positions, then `ctx.createPattern(...)` it. Cache by `(color, density)` in `FxCache` keyed `halftone:${color}:${density}`.
- `wobbleStroke` (helper used by `inkOutline`): perturb each path point by `(rng() - 0.5) * jitterAmount`. Use `seededRandom(wobbleSeed)` so re-renders of the same outlined shape look identical (Petstore rule).
- `burstText`: draw text twice — fat stroke first, then fill. Apply small per-call rotation `(rng() * 0.1 - 0.05)` for jitter.
- `screenShake`: helper, not a draw method. Caller translates `ctx` by the returned `(dx, dy)` before drawing the world layer, restoring after.
- `panelFlash`: caller passes `alpha` (already evaluated by an animation curve outside this function).
- All effects use the seeded PRNG; never `Math.random()`.

### 3. `fx/shapes.js` — Primitive shape generators

Required exported functions, each returning a `pathFn(ctx)` that can be passed to `inkOutline`:

- `blob({ rx, ry, wobble, seed })` — irregular oval
- `egg({ rx, ry, scale, tilt, seed })` — egg/skull shape
- `comicEyesPair({ size, expr, seed })` — two big white eyes with black pupils; expr ∈ `{angry, surprised, happy, neutral, dead}`
- `fangGrin({ width, height, seed })` — comic mouth with two fangs
- `stubArm({ length, width, side, seed })`
- `bonyArm({ length, width, side, seed })`
- `tail({ length, segments, seed })`
- `hornsPair({ size, kind, seed })` — kind ∈ `{ram, demon, antler}`
- `wingsPair({ size, kind, seed })` — kind ∈ `{bat, feather, mech}`

Each shape generator builds its path with `ctx.beginPath(); ...; ctx.closePath()` and returns the `pathFn`. The caller passes that to `inkOutline`. Inside the path, fill is applied separately (caller's choice — solid color, halftone pattern, gradient).

### 4. `fx/monsterRenderer.js`

```js
class MonsterRenderer {
  constructor(fxCache) { this._cache = fxCache; }

  // Build cached part canvases for a given monster + palette.
  // Returns a "compiled" object with one canvas per part.
  buildCreature(monster) { /* read monster.shape, render each part to its own offscreen canvas, return { parts: { body, head, eyes, ... }, bbox } */ }

  // Composite parts onto ctx with anim transforms.
  // animState comes from the AnimationManager — has phase, hitFlash, attackProgress, etc.
  drawCreature(ctx, x, y, compiled, animState) {
    // 1. Apply screen-shake offset if animState.shake is active
    // 2. Translate to monster anchor
    // 3. For each part in z-order, ctx.save() / translate / rotate / scale based on animState / drawImage / restore
    // 4. Hit flash: if animState.flashAlpha > 0, after compositing draw a white-tinted overlay at globalAlpha = flashAlpha
  }

  // Re-cache only the affected part when palette changes (rare for monsters; common for wizard portraits when class swaps).
  invalidatePart(creatureId, slot) { /* this._cache.invalidate(`${creatureId}:${slot}`) */ }
}
```

**Z-order constant:**
```js
const Z_ORDER = ['tail', 'wings', 'limbs', 'body', 'head', 'eyes', 'mouth', 'horns'];
```

Shape mapping table (`monster.shape.body.kind === 'blob'` → call `shapes.blob(...)` with monster's `rx/ry/wobble/seed`). All seeds derived from `hashString(monster.id + ':' + slot)` so re-cache produces identical pixels.

### 5. `fx/wizardRenderer.js`

Same pattern as `monsterRenderer` but with a smaller fixed schema for the wizard portrait. Class palette/staff/hat differ; base body shape is shared. Animations: idle breath, cast (staff thrust forward), hit (face flash + portrait shake), ultimate-charge-full (sparkle aura).

### 6. `fx/animation.js` — Animation manager

Driven by `game.js` per-frame. Tracks per-target animation state.

```js
class AnimationManager {
  constructor() { this._states = new Map(); }
  begin(targetId, anim) { /* { kind: 'attack'|'hit'|'death'|'idle'|'charge', startedAt, duration } */ }
  update(dt, now) { /* advance phases, mark complete states for cleanup */ }
  stateFor(targetId) { /* returns { phase, hitFlash, attackProgress, deathFade, shake, ... } for the renderer */ }
  cancel(targetId) { /* remove all animations on a target */ }
  cancelAll() { /* state-machine transition cleanup */ }
}
```

Idle anim is computed analytically from `now` for each monster — no per-monster timer. (Avoids the "interval counter on float" bug class.)

### 7. `fx/particles.js` — Tiny particle pool

Pool of N=128 particles. API:
```js
class ParticlePool {
  constructor(size = 128) { /* preallocate */ }
  spawn(kind, x, y, vx, vy, ttl, color) { /* claim slot from pool */ }
  update(dt) { /* advance positions, life-- */ }
  draw(ctx) { /* draw all live particles with batched globalAlpha (no save/restore per particle — Petstore perf rule) */ }
}
```

Kinds: `sparkle`, `ember`, `inkdot`. Each has a different draw recipe. No allocations in `update`/`draw`.

### 8. Demo screen (in `game.js`)

Hidden behind `?demo=1` URL param. Renders:
- A 5×3 grid of comic primitives — one tile each: `inkOutline` blob, `halftoneFill` rect, `speedLines`, `burstText("ZAP!")`, `inkBurst`, `panelFlash` (toggled), `panelBorder`, `screenShake` toggle button
- Three sample monsters at bottom: a goblin (blob+egg+comic_pair eyes+fang_grin+stub_arm), a dragon (bigger blob+horns+wings), a lich (bony body+skull head+bony_arm)
- Each monster runs its idle animation continuously
- A "hit me" button on each monster triggers a hit-flash + tiny screen shake

This is a sanity-check page only; remove or keep behind `?demo=1` after this session.

### 9. Performance audit

Add an FPS counter in the corner (DOM, updated 1× per second). Acceptance requires sustained 60fps on iPad Safari with all three demo monsters animating. If a primitive is too slow (e.g. recomputing halftone every frame), profile and fix:
- `halftoneFill` should use a **cached pattern** via `FxCache`, not redraw dots per frame
- Monster parts must be cached offscreen — `drawImage` per frame, never redraw the path

## Tests to run

There are no Layer-1 tests for this session (canvas-heavy code resists Node testing). The acceptance is visual: load the demo screen and confirm:
- Each primitive renders as expected
- Monsters animate smoothly
- 60fps holds (FPS counter ≥ 57)
- Reduced-motion media query strips screen-shake on a `body[data-reduced-motion]` toggle

## Acceptance checklist

- [ ] `fx/comicfx.js` exports all 8 primitives, all use seeded PRNG (no `Math.random()` in cached textures)
- [ ] `fx/shapes.js` provides every shape kind referenced in plan.md (blob, egg, comic_pair, fang_grin, stub_arm, bony_arm, tail, hornsPair, wingsPair)
- [ ] `fx/cache.js` enforces ≤ 30 active canvases with LRU eviction; LRU updated only in `get`/`build`
- [ ] `MonsterRenderer.drawCreature` uses cached part canvases; `ctx.save()`/`ctx.restore()` brackets every transform
- [ ] Animation manager updates analytically off `now` for idle (no per-monster interval timers)
- [ ] Demo screen (`?demo=1`) renders all primitives + 3 monsters at 60fps on iPad Safari
- [ ] `prefers-reduced-motion` media query (and manual override toggle) disables screen-shake & panel-flash
- [ ] No DOM manipulation in the RAF loop (`createElement` / `innerHTML` / `classList` calls only on state entry/transitions)
- [ ] No `Math.random()` calls in any cached-texture path; all seeded
- [ ] No independent `requestAnimationFrame` in any new manager — `game.js` is sole RAF owner
- [ ] All new managers follow the timer lifecycle pattern from the checklist (every timer ID `null` in constructor; `cancel()` clears them all)

## Session end

1. Visual sanity pass on iPad Safari (or Safari with iPad simulator) — confirm 60fps, all primitives render, animations smooth
2. Run `marauder-web-review` agent
3. Commit `Session 3: comic renderer + monster schema + animation`
4. Push to `main`
