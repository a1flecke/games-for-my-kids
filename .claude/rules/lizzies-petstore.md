---
paths:
  - "lizzies-petstore/**"
---

# Lizzie's Petstore — Architecture Rules

## Rendering: Offscreen Canvas Caching

Each body part is drawn procedurally to its own **offscreen canvas** once. The game loop composites cached part canvases via `drawImage()`. Re-cache only when a part's color/covering/scale changes.

- `CreatureCache` manages per-part offscreen canvases
- On creature change, re-render only the affected part via `invalidatePart(slot)`
- `drawCreature(ctx, x, y, animState)` composites all parts with animation transforms
- Max **30 offscreen canvases** active — warn + LRU evict if exceeded
- Covering textures pre-rendered as separate canvases via `globalCompositeOperation = 'source-atop'`
- **LRU tracking** updated only on `buildCache()` / `invalidatePart()` — never in `drawCreature()` (hot path)

### `ctx.save()` / `ctx.restore()` Must Bracket Every Transform

```js
// CORRECT
ctx.save();
ctx.translate(pivotX, pivotY);
ctx.rotate(angle);
ctx.drawImage(cachedPart, -pivotX, -pivotY);
ctx.restore();

// WRONG — transform leaks to next part
ctx.translate(pivotX, pivotY);
ctx.rotate(angle);
ctx.drawImage(cachedPart, -pivotX, -pivotY);
```

---

## Single RAF Chain — game.js Owns the Loop

Only `game.js` may call `requestAnimationFrame`. No manager may start its own animation loop.

Any class that renders to canvas must expose **passive methods** called by the game loop:
- `update(dt)` — advance internal state
- `draw(ctx, w, h)` — render to canvas

```js
// WRONG — manager owns its own RAF chain
class CareManager {
    start() { this._raf = requestAnimationFrame(() => this._tick()); }
}

// CORRECT — game loop drives the manager
if (this.state === 'CARE') {
    this._careManager.update(dt);
    this._careManager.draw(ctx, w, h);
}
```

---

## Z-Order Render Constant

Parts are always drawn in this fixed order (back to front):

```js
const RENDER_ORDER = ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories'];
```

---

## Timer Lifecycle Pattern

Every manager that uses `setTimeout` or `setInterval` **must** follow this exact pattern:

```js
class SomeManager {
    constructor() {
        this._mainTimer = null;   // declare ALL timer IDs as null
        this._shakeTimer = null;
        this.onComplete = null;
    }
    cancel() {
        clearTimeout(this._mainTimer);  this._mainTimer = null;
        clearTimeout(this._shakeTimer); this._shakeTimer = null;
        this._close();
        this.onComplete = null;
    }
    complete() {
        const cb = this.onComplete;  // save BEFORE cancel() nulls it
        this.cancel();
        if (cb) cb();
    }
    skip()     { this.complete(); }
    start(...) { this.cancel(); /* ... then init */ }
}
```

---

## Pointer Events (Not Touch Events)

Use `pointerdown`, `pointermove`, `pointerup` for all input. Unified mouse+touch, no 300ms delay.

- CSS `touch-action: none` on canvas to prevent Safari scroll/zoom
- `setPointerCapture()` for drag tracking
- **60px minimum hitboxes** for body parts in creator
- **50px snap radius** for attachment points

### Touch Coordinate Conversion (with DPR)

```js
const rect = canvas.getBoundingClientRect();
const x = (e.clientX - rect.left) * (canvas.width / rect.width);
const y = (e.clientY - rect.top) * (canvas.height / rect.height);
```

---

## Canvas + DPR Setup

```js
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);
```

---

## Attachment Point Coordinate System

Attachment points use **normalized 0-1 coordinates** relative to part bounds:
- `{x: 0.5, y: 0.0}` = top center of part
- `{x: 0.5, y: 1.0}` = bottom center of part

This allows parts at different scales to connect correctly.

---

## Animation: Pivot-Based (Not Skeletal)

Each part has a **pivot point** and simple animation curves (sine-wave rotation, bounce, scale). No parent-child transform chain.

- Delta-time based, 60fps target
- Cap delta at 50ms for RAF throttling on iPad Safari
- Parts drawn in z-order with `ctx.save() / translate / rotate / drawImage / restore`

---

## Needs Decay Rules

- Decay ONLY during active play session (1 point per 2 minutes per need)
- Floor at **20** — creature never desperate
- No real-time decay when app closed
- On reopen: creature greets happily regardless of absence
- Max decay capped at 24 hours

---

## SaveManager Contract

- **Single key:** `lizzies-petstore-save`
- **Schema versioned:** `schemaVersion: 1` in save data
- **Auto-save:** debounced 2s on creature/room change
- **Backup key:** `lizzies-petstore-save-backup` updated every 5th save
- **Quota error:** show user-visible toast (not silent failure)
- **Max 20 creatures** with friendly "gallery full" message
- All save data through SaveManager — never direct `localStorage` access

---

## State Machine

```
TITLE → CREATOR → BIRTH_ANIMATION → CARE (hub) → PARK
                                   ↕ WARDROBE
                                   ↕ ROOM_EDIT
  GALLERY ↔ CARE
  GALLERY → CREATOR (edit existing)
```

- State transitions must be clean — cancel all timers/animations
- Confirmation dialog when leaving CREATOR with unsaved changes
- Document for each state: which states enter/exit it, what the game loop does, what input is accepted/blocked

---

## Web Audio API (iOS Safari)

- `AudioContext` created lazily on first user gesture — never in constructor
- `ctx.resume().then(() => schedule())` — oscillators inside `.then()`
- All creature voices: **sine waves only** + low-pass filter + detuned chorus layering
- Default all sounds to cute — never deep or sudden

---

## WCAG Non-Negotiables

- Never `user-scalable=no` in viewport meta
- Touch targets >= 44px (60px for Creator palette items)
- Font: OpenDyslexic via CDN `<link>`, Comic Sans MS fallback — never `@import` in CSS
- Min font size: 16px, line height 1.5×
- Background: cream `#F5F0E8`, text: `#2C2416`, secondary: `#595143`
- WCAG AA contrast 4.5:1 minimum — never `#666`, `#888`, `#999` on cream
- No flashing/strobing effects
- `aria-hidden` always explicit `'true'`/`'false'` — never `removeAttribute` on overlays
- Screen visibility: `.active` (screens), `.open` (overlays), `.hidden` (internal elements)
- No `style.display` assignments in JS

---

## Hot-Path Performance (60fps Draw/Update Loop)

The draw and update functions run 60 times per second. Never do expensive or allocating work inside them:

| Pattern | Fix |
|---------|-----|
| `SaveManager.load()` / `getCreature()` per frame | Cache the creature ref on state entry (`this._cachedCreature = ...`). Invalidate on save. |
| `LRU.touch()` / `indexOf + splice` per frame | Only update LRU on `buildCache()` / `invalidatePart()`, never in draw calls. |
| Redraw static backgrounds per frame (grid dots, gradients) | Cache to an offscreen canvas on init/resize. `drawImage()` per frame. |
| `ctx.save()` / `ctx.restore()` per particle (50×/frame) | Batch: set `globalAlpha` directly, reset once at end. No save/restore per element. |
| `document.createElement()` in draw loop | All DOM creation in setup/state-entry code, never in update/draw. |

---

## Seeded PRNG for Cached Textures

Any procedurally generated texture that gets cached to an offscreen canvas **must** use a seeded PRNG, not `Math.random()`. Otherwise LRU eviction + re-cache produces visually different results.

```js
// Mulberry32 seeded PRNG
_seededRandom(seed) {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
    };
}

// Hash string for seed
_hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

// Usage: const rng = this._seededRandom(this._hashString(color + 'fur'));
```

---

## source-atop Compositing Requires Fully Opaque Base

When using `globalCompositeOperation = 'source-atop'`, the base shape **must** be fully opaque (`globalAlpha = 1`). Semi-transparent base pixels cause the texture to render at `base_alpha × texture_alpha` — visually incorrect.

```js
// WRONG — fairy wings at 0.7 alpha, then source-atop covering = covering at 0.7 too
ctx.globalAlpha = 0.7;
drawWingShape(ctx);            // semi-transparent pixels
ctx.globalCompositeOperation = 'source-atop';
drawTexture(ctx);              // texture clipped AND dimmed to 0.7

// CORRECT — draw fully opaque, apply covering, then composite at reduced alpha
drawWingShape(ctx);            // opaque pixels
ctx.globalCompositeOperation = 'source-atop';
drawTexture(ctx);              // texture clipped correctly
// If you need translucency: draw to temp canvas, then drawImage with globalAlpha
```

---

## Periodic Effects: Interval Counters Not Modulus on Float

`timer % 100 < 20` on a float timer is unreliable — it can miss intervals depending on `dt`. Use an explicit next-time counter:

```js
// WRONG — modulus on float
if (this._timer % 100 < 20) spawnSparkle();

// CORRECT — interval counter
if (this._timer >= this._nextSparkleTime) {
    this._nextSparkleTime = this._timer + 100;
    spawnSparkle();
}
```

---

## Shuffling

Never `.sort(() => Math.random() - 0.5)` — biased. Use Fisher-Yates:
```js
for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
}
```
