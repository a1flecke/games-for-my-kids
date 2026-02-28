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

## Shuffling

Never `.sort(() => Math.random() - 0.5)` — biased. Use Fisher-Yates:
```js
for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
}
```
