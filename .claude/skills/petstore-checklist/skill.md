---
name: petstore-checklist
description: Pre-implementation checklist for lizzies-petstore sessions. Prints the coding rules most likely to cause bugs. Run this before writing any session code.
---

Read the session file, then confirm each rule below before writing code.

## Spec Code Has Bugs — Fix Before Implementing

Session specs often contain code samples that violate CLAUDE.md rules. Before using any code sample from the spec, scan it for these patterns and replace them:

| Spec pattern | Fix |
|---|---|
| `style.display = 'none'` / `'block'` / `'flex'` | Use a CSS class instead (`.active`, `.open`, `.hidden`) |
| `onclick="..."` HTML attribute | Remove attr; bind with `addEventListener` in JS |
| `.onclick = () => ...` | Use `addEventListener` — no stacking risk |
| `.sort(() => Math.random() - 0.5)` | Fisher-Yates (see Shuffling section) |
| `color: #636e72` | `color: var(--text-secondary)` |
| `localStorage.getItem / .setItem` | `SaveManager.load()` / `SaveManager.save()` with key `lizzies-petstore-save` |
| `window.x = window.x \|\| new X()` | `window.x = new X()` in `game.init()` — always fresh |
| `new AudioContext()` in constructor | Create lazily on first `_getCtx()` call; `ctx.resume().then(() => schedule())` |
| Independent `requestAnimationFrame` in a manager | Only `game.js` owns the RAF loop — expose `update(dt)` and `draw(ctx, w, h)` |
| `touchstart` / `touchmove` / `touchend` | Use Pointer Events: `pointerdown` / `pointermove` / `pointerup` |

---

## Canvas Performance Rules

### Offscreen Caching (CreatureCache)
- Each body part rendered once to its own offscreen canvas at display size × DPR
- `invalidatePart(slot)` re-renders only the changed part — never re-cache all parts
- Game loop composites via `drawImage()` — a single GPU-accelerated call per part
- Covering textures pre-rendered as separate texture canvases — one-time cost
- Max **30 offscreen canvases** active — LRU evict if exceeded

### No DOM During Gameplay
- All gameplay rendering on Canvas — no `createElement`, `innerHTML`, `classList` during the RAF loop
- DOM overlays (needs meters, buttons) updated only on value change, not every frame

### RAF Delta Time
- Always `requestAnimationFrame` with delta time for movement/animation
- Cap delta at **50ms** for iPad Safari RAF throttling
- Never use `setInterval` for the game loop

---

## Timer Lifecycle Pattern

Every manager with `setTimeout`/`setInterval` must follow this pattern exactly:

```js
class SomeManager {
    constructor() {
        this._mainTimer = null;
        this.onComplete = null;
    }
    cancel() {
        clearTimeout(this._mainTimer); this._mainTimer = null;
        this.onComplete = null;
    }
    complete() {
        const cb = this.onComplete;
        this.cancel();
        if (cb) cb();
    }
    start(...) { this.cancel(); /* init */ }
}
```

---

## Touch Input Rules

- **Pointer Events** only (`pointerdown/move/up`) — never touch events
- CSS `touch-action: none` on canvas
- `setPointerCapture()` for drag tracking
- Coordinate conversion: `(clientX - rect.left) * (canvas.width / rect.width)`
- **60px minimum hitboxes** for body parts in creator
- **50px snap radius** for attachment points

---

## Web Audio API (iOS Safari)

- `AudioContext` created lazily on first user gesture — never in constructor
- `ctx.resume().then(() => schedule())` — oscillators inside `.then()`
- Sine waves only + low-pass filter for creature voices
- `speechSynthesis.cancel()` + 50ms delay before `speak()` if used

---

## Screen Visibility

- **Screens** → `.active` class
- **Overlays** (settings, wardrobe panel) → `.open` class
- **Internal toggles** → `.hidden` class
- Never `style.display` in JS

---

## Modal Dialogs

- `role="dialog"`, `aria-modal="true"`, `aria-label="..."`
- First focusable element = close button
- Focus trap: Tab/Shift-Tab cycles within overlay
- Escape to close (with `.contains('open')` guard)
- On close: return focus to trigger element
- `aria-hidden` always explicit `'true'`/`'false'` — never `removeAttribute`

---

## State Machine

```
TITLE → CREATOR → BIRTH_ANIMATION → CARE (hub) → PARK
                                   ↕ WARDROBE
                                   ↕ ROOM_EDIT
  GALLERY ↔ CARE
  GALLERY → CREATOR (edit existing)
```

- State transitions cancel all active timers/animations
- Confirmation dialog when leaving CREATOR with unsaved changes
- Document for each new state: entry/exit states, game loop behavior, input handling

---

## Single RAF Chain — game.js Owns the Loop

Only `game.js` may call `requestAnimationFrame`. Every other class exposes:
- `update(dt)` — advance state
- `draw(ctx, w, h)` — render to canvas

---

## Z-Order Render Constant

```js
const RENDER_ORDER = ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories'];
```

---

## Animation: Pivot-Based

- Each part has a pivot point + simple curves (sine rotation, bounce, scale)
- `ctx.save()` / `ctx.restore()` must bracket every transform
- Delta-time based, cap at 50ms

---

## Save System

- **One key**: `lizzies-petstore-save` — always through SaveManager
- Schema versioned: `schemaVersion: 1`
- Auto-save debounced 2s
- Backup every 5th save to `lizzies-petstore-save-backup`
- `_defaults()` must include ALL keys read by game.js
- Quota error → user-visible toast

---

## Needs Decay

- Decay ONLY during active play (1pt / 2min / need)
- Floor at **20** — never desperate
- No real-time decay when app closed
- On reopen: creature greets happily regardless of absence
- Max decay capped at 24 hours

---

## Shuffling

Never `.sort(() => Math.random() - 0.5)`. Fisher-Yates:
```js
for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
}
```

---

## WCAG Non-Negotiables

- Never `user-scalable=no` in viewport meta
- Touch targets >= 44px (60px for Creator palette)
- Font: OpenDyslexic via CDN `<link>`, Comic Sans MS fallback
- Min font size: 16px, line height 1.5×
- Background: cream `#F5F0E8`, text: `#2C2416`, secondary: `#595143`
- WCAG AA 4.5:1 — never `#666`, `#888`, `#999` on cream
- No flashing/strobing
- `ctx.font` always includes fallback: `'16px OpenDyslexic, "Comic Sans MS", cursive'`

---

## CSS ID Specificity

Never put `display:` in a base ID rule:
```css
/* BAD */
#screen-title { display: flex; }
/* GOOD */
#screen-title.active { display: flex; }
```

---

## Session Spec Validation

Before implementing:
1. Scan spec code samples against the pattern table above
2. Confirm canvas rendering ownership is stated (game.js calls render, not manager)
3. New state machine states must document transitions
4. Default settings must have a rationale
