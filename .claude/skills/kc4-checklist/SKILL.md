---
name: kc4-checklist
description: Pre-implementation checklist for keyboard-command-4 sessions. Prints the coding rules most likely to cause bugs. Run this before writing any session code.
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
| `localStorage.getItem / .setItem` | `SaveManager.load()` / `SaveManager.save()` with key `keyboard-command-4-save` |
| `window.x = window.x \|\| new X()` | `window.x = new X()` in `game.init()` — always fresh |
| `new AudioContext()` in constructor | Create lazily on first `_getCtx()` call; `ctx.resume().then(() => schedule())` |

---

## Canvas Performance Rules

This is a Canvas-rendered game targeting 60fps on iPad Safari. Every frame counts.

### Offscreen Caching
- **Room backgrounds** are static — render once to an offscreen canvas on room load. Each frame just `drawImage()` the cached background.
- **Monster sprites** — pre-render each type + state to offscreen canvases on level load. Never draw from primitives each frame.
- **HUD text** — cache static elements. Only re-render score/health text when values change (dirty flag pattern).

### No DOM During Gameplay
- All gameplay rendering is on Canvas — no `createElement`, `innerHTML`, `classList`, or `textContent` during the game loop.
- HUD overlay elements (health bar, score) are DOM but updated only on value change, not every frame.

### Particle Pool
- Pre-allocate a pool of 50 particle objects. Reuse rather than create/destroy.
- Each particle: `{x, y, vx, vy, life, color, size, active}`.

### RAF Delta Time
- Always use `requestAnimationFrame` with delta time for movement/animation.
- If delta > 20ms (below 50fps), reduce particle count and skip non-essential animations.
- Never use `setInterval` for the game loop.

---

## Timer Lifecycle Pattern

Every manager that uses `setTimeout` or `setInterval` **must** follow this exact pattern. Missing any part is a bug.

```js
class SomeManager {
    constructor() {
        this._mainTimer = null;   // declare ALL timer IDs as null
        this._shakeTimer = null;  // even short cosmetic timers
        this.onComplete = null;
    }

    cancel() {
        clearTimeout(this._mainTimer);  this._mainTimer = null;
        clearTimeout(this._shakeTimer); this._shakeTimer = null;
        this.onComplete = null;
    }

    complete() {
        const cb = this.onComplete;  // save BEFORE cancel() nulls it
        this.cancel();
        if (cb) cb();
    }

    start(data, onComplete) {
        this.cancel(); // defensive reset on re-entry
        this.onComplete = onComplete;
        // ... initialize fresh state ...
    }
}
```

**Key rules:**
- Every `setTimeout(...)` → store return value in `this._somethingTimer`
- Short cosmetic timers (screen shake, hit flash) still need IDs — they fire on detached DOM
- `cancel()` is the single source of truth for cleanup
- `start()` always calls `cancel()` first

---

## Input System Rules

### Modifier Key Routing
The input system must distinguish between shortcut attempts and game controls:
- If `e.metaKey || e.altKey || e.ctrlKey` → route as shortcut attempt (compare against shortcut database)
- If bare number key (1-0) with NO modifiers → route as weapon select
- `Tab` / `Shift+Tab` → target cycling (NOT browser tab navigation — must `preventDefault()`)
- `Escape` → pause menu
- `Space` → advance dialogue
- `H` → shortcut journal

### preventDefault() Scope
- `preventDefault()` on ALL key events during gameplay state — prevents browser/OS shortcuts
- In menu states (TITLE, LEVEL_SELECT, RESULTS), only prevent game-bound keys
- Some system shortcuts cannot be intercepted (Cmd+H, Cmd+Space on iPadOS) — these use "Knowledge Monster" variant

### 700ms Fire Lock
After a correct shortcut fires the weapon:
1. Set `this._inputLocked = true`
2. `this._lockTimer = setTimeout(() => { this._inputLocked = false; }, 700)`
3. During lock, ignore all shortcut input (but allow Tab for target cycling)
4. Store `_lockTimer` and clear in `cancel()`

---

## Web Audio API (iOS Safari)

- `AudioContext` must be created **lazily** inside a user-gesture handler — never in a constructor
- `ctx.resume()` returns a Promise — chain scheduling inside `.then()`:
  ```js
  _getCtx() {
      if (!this._ctx) this._ctx = new AudioContext();
      return this._ctx;
  }

  playSound(type) {
      const ctx = this._getCtx();
      ctx.resume().then(() => {
          // schedule oscillator nodes HERE, not before .then()
      });
  }
  ```
- Never schedule oscillator nodes immediately after `ctx.resume()` — they may not play on iOS

---

## Screen Visibility

- **Screens** → `.active` class
- **Overlays** (pause, settings, journal) → `.open` class
- **Any element toggled visible/hidden** → a semantic CSS class — NOT `style.display`

---

## Modal Dialogs (Pause, Settings, Journal)

- `role="dialog"`, `aria-modal="true"`, `aria-label="..."`
- First focusable element = close button
- Focus trap: Tab/Shift-Tab cycles within overlay
- Escape to close (with `.contains('open')` guard)
- On open: focus close button, `setAttribute('aria-hidden', 'false')` on overlay
- On close: `setAttribute('aria-hidden', 'true')`, return focus to trigger element
- `aria-hidden` always explicit `'true'`/`'false'` — never `removeAttribute`

---

## State Machine

```
TITLE → LEVEL_SELECT → GAMEPLAY → ROOM_TRANSITION → GAMEPLAY → ...
                                → BOSS_FIGHT → LEVEL_COMPLETE → LEVEL_SELECT
                                → PAUSE (overlay)
                                → JOURNAL (overlay)
                                → GAME_OVER → respawn or LEVEL_SELECT
```

- State transitions must be clean — cancel all active timers, animations, and input locks
- `showLevelSelect()` must call `cancel()` on every active manager
- Guard timer callbacks with null-checks: `if (!window.someManager) return;`

---

## Monster Depth System

- Depth 0.0 = back of room (small, far away)
- Depth 1.0 = front of room (large, at attack range)
- Render order: back-to-front (lower depth first)
- Scale factor: `0.3 + depth * 0.7` (30% at back, 100% at front)
- Y position: maps depth to Canvas Y coordinate (higher on screen = further away)

---

## Save System

- **One key**: `keyboard-command-4-save` — always through SaveManager
- Never call `localStorage.getItem/setItem` outside SaveManager
- Auto-save after: room clear, boss defeat, settings change
- `SaveManager._defaults()` must include ALL keys that game.js reads from save data

---

## Shuffling

Never `array.sort(() => Math.random() - 0.5)` — biased. Use Fisher-Yates:
```js
for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
}
```

---

## WCAG Non-Negotiables

- **Never** `user-scalable=no` in viewport meta
- Touch targets >= 44x44px on all interactive elements (menu buttons, level cards)
- Font: OpenDyslexic via CDN `<link>`, Comic Sans MS fallback — never `@import` in CSS
- Min font size: 16px, scalable (16/18/22px)
- Background: cream `#F5F0E8`, text: `#2C2416`, secondary: `#595143`
- WCAG AA contrast 4.5:1 minimum — never use `#666`, `#888`, `#999` on cream
- No flashing/strobing effects — death animations use fades
- Screen shake: 100ms maximum, subtle

---

## CSS ID Specificity

ID selectors (`#foo`) always beat class selectors (`.bar`). Never put `display:` in a base ID rule when a class like `.screen` controls visibility:

```css
/* BAD — #screen-title display:flex overrides .screen { display:none } */
#screen-title { display: flex; }

/* GOOD — only active screens get display:flex */
#screen-title.active { display: flex; }
```
