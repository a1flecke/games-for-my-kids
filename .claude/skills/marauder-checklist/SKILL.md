---
name: marauder-checklist
description: Pre-implementation checklist for claudes-math-marauder sessions. Prints the coding rules most likely to cause bugs. Run this before writing any session code.
---

Read the session file, then confirm each rule below before writing code.

## Spec Code Has Bugs — Fix Before Implementing

Session specs often contain code samples that violate CLAUDE.md rules. Before using any code sample from the spec, scan it for these patterns and replace them:

| Spec pattern | Fix |
|---|---|
| `style.display = 'none'` / `'block'` / `'flex'` | Use a CSS class instead (`.active`, `.open`, `.hidden`) |
| `onclick="..."` HTML attribute | Remove attr; bind with `addEventListener` in JS |
| `.onclick = () => ...` | Use `addEventListener` — no stacking risk |
| `.sort(() => Math.random() - 0.5)` | Fisher-Yates using run-seeded `rng` |
| `new AudioContext()` in constructor | Create lazily on first use; `ctx.resume().then(() => schedule())` |
| Independent `requestAnimationFrame` in a manager | Only `game.js` owns the RAF loop — expose `update(dt)` and `draw(ctx, w, h)` |
| `touchstart` / `touchmove` / `touchend` | Use Pointer Events: `pointerdown` / `pointermove` / `pointerup` |
| `Math.random()` in combat modules | Use run-seeded `rng` passed as dependency |
| `escHtml()` on `setAttribute('aria-label', ...)` | Don't escape — `setAttribute` doesn't parse HTML entities |
| `aria-pressed` on non-toggle elements | Only on persistent binary-state toggle buttons |
| `role="listitem"` on `<button>` | Remove — overrides implicit button role |
| `aria-live` + `aria-hidden` on same element | Remove `aria-live`; use `role="status"` only |
| `aria-live` + `aria-label` on same element | Remove `aria-label` — live regions announce `textContent` |
| `SaveManager.load()` per frame | Cache on state entry |

---

## Single RAF Rule

`game.js` owns the RAF loop. All managers get `update(dt)` / `draw(ctx, w, h)` called from it.

---

## Timer Lifecycle Pattern

```js
constructor() {
  this._mainTimer = null;    // declare ALL timer IDs as null
  this.onComplete = null;
}
cancel() {
  clearTimeout(this._mainTimer); this._mainTimer = null;
  this.onComplete = null;
}
complete() {
  const cb = this.onComplete;  // save BEFORE cancel() nulls it
  this.cancel();
  if (cb) cb();
}
start(...) { this.cancel(); /* then init */ }
```

---

## Web Audio — iOS Safari

```js
// Lazy context — never in constructor
_getCtx() { if (!this._ctx) this._ctx = new AudioContext(); return this._ctx; }
// Chain after resume
this._getCtx().resume().then(() => this._scheduleOscillator(...));
```

---

## Web Speech — iOS Safari

```js
speechSynthesis.cancel();
setTimeout(() => speechSynthesis.speak(utterance), 50);
if (!('speechSynthesis' in window)) return;
```

---

## ARIA Checklist

- [ ] Overlays: `role="dialog" aria-modal="true" aria-label="..."` (not `<aside>`)
- [ ] First focusable element in modal: close button (✕)
- [ ] Focus trap: Tab / Shift-Tab cycle within modal; Escape closes
- [ ] `aria-hidden` explicit `"true"` / `"false"` — never `removeAttribute` on overlays
- [ ] `aria-pressed` only on toggle buttons
- [ ] `role="group"` for grids of buttons (not `role="list"`)
- [ ] Dynamic `aria-label` updated alongside `textContent`
- [ ] No `aria-live` on elements that toggle `aria-hidden`

---

## Visibility — No `style.display`

Use `.active` (screens), `.open` (overlays), `.hidden` (internal). Never `style.display = ...`.

---

## Combat Purity

`js/combat/*.js` modules must never import DOM / canvas / audio. Tests run in Node.

---

## Mastery Save Cadence

Write `SaveManager.save()` **once per fight** at VICTORY/DEFEAT_RETRY. Never per-problem.

---

## Stretch-Fact Gate

Stretch facts: only offer when family has `box >= 4 && totalCorrect >= 6`.

---

## Re-entry Guard

Any function reachable from two timer paths needs:
```js
if (this._lessonComplete) return;
this._lessonComplete = true;
```

---

## `SaveManager._defaults()` Completeness

Every key game.js reads must be in `_defaults()`. Add new keys in the same commit.

---

## No `user-scalable=no` in Viewport

WCAG 1.4.4 — users with dyslexia rely on browser zoom.
