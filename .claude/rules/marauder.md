---
paths:
  - "claudes-math-marauder/**"
---

# Claude's Math Marauder — Architecture Rules

## Single RAF Chain — game.js Owns the Loop

Only `game.js` drives `requestAnimationFrame`. All other managers expose passive `update(dt)` and `draw(ctx, w, h)` methods called from the loop. No manager, renderer, or audio module may start its own `requestAnimationFrame`.

## Timer Lifecycle Pattern

Every manager with `setTimeout`/`setInterval` must follow this pattern exactly:

```js
constructor() {
  this._mainTimer = null;   // declare ALL timer IDs as null
  this._shakeTimer = null;  // even short cosmetic timers
  this.onComplete = null;
}
cancel() {
  clearTimeout(this._mainTimer);  this._mainTimer = null;
  clearTimeout(this._shakeTimer); this._shakeTimer = null;
  this.onComplete = null;         // prevent stale callbacks
}
complete() {
  const cb = this.onComplete;   // save BEFORE cancel() nulls it
  this.cancel();
  if (cb) cb();
}
start(...) { this.cancel(); /* then init */ }
```

## Combat Determinism

Combat is deterministic given `(runSeed, masteryStateAtFightStart, inputSequence)`. **Never call `Math.random()` in combat code** — always use the run-seeded PRNG passed as `rng`. Required for the replay harness (Session 13). Distractors are shuffled via Fisher-Yates with the run-seeded PRNG.

## Mastery Save Cadence

Update mastery in-memory per problem. **Commit to `SaveManager.save()` once per fight at VICTORY or DEFEAT_RETRY** (batch write). Never call `SaveManager.save()` per problem — it's in the hot path.

## Combat Module Purity

Modules under `js/combat/` must **not** import DOM, canvas, or audio modules. They are pure logic so Node tests can `require()` them. Visual effects, audio cues, and DOM updates live in `fight.js`'s callbacks, called by `FightManager`.

## Re-entry Guard on `onFightComplete`

`onFightComplete` (and similar terminal callbacks) is reachable from both the VICTORY path and the DEFEAT_RETRY path. Set a boolean guard immediately on entry:

```js
if (this._lessonComplete) return;
this._lessonComplete = true;
```

Reset in `start()`. Cancel all related timers on entry.

## Visibility Classes — No `style.display`

Never assign `style.display` in JS to show or hide elements. Use:
- `.active` for screens
- `.open` for overlays and panels
- `.hidden` for internal elements

`container.innerHTML = ''` to clear a container is fine — that's not a visibility toggle.

## Web Speech (iOS Safari)

`cancel()` silences an immediately-following `speak()` on iOS. Always delay:
```js
speechSynthesis.cancel();
setTimeout(() => speechSynthesis.speak(utterance), 50);
```
Feature-detect: `if (!('speechSynthesis' in window)) return`.

## Web Audio (iOS Safari)

`AudioContext` must be created lazily inside a user-gesture handler — never in a constructor. Chain scheduling inside `.then()`:
```js
ctx.resume().then(() => scheduleOscillator());
```

## ARIA Rules

- `aria-hidden` always explicit `"true"` / `"false"` — never `removeAttribute('aria-hidden')` on overlays
- `aria-pressed` only on **toggle buttons** with persistent binary state — not on action buttons
- Use `role="group"` (not `role="list"`) for grids of buttons to avoid AT list-count errors
- Dynamic `aria-label`: whenever `textContent` changes on a labelled element, also call `setAttribute('aria-label', ...)`
- No `aria-live` on elements that also toggle `aria-hidden`
- No `aria-live` + `aria-label` on the same element

## Focus Trap Escape Guard

Focus trap keydown handlers must check `el.classList.contains('open')` before acting on Escape:
```js
if (e.key === 'Escape') {
  if (overlay.classList.contains('open')) doClose();
  return;
}
```

## `SaveManager._defaults()` Completeness

Every key that `game.js` reads from progress must exist in `SaveManager._defaults()`. Add new keys in the same commit that reads them.

## Stretch-Fact Eligibility

Stretch facts require the family to be mastered: `box >= 4 && totalCorrect >= 6`. Never offer stretch facts from un-mastered families.
