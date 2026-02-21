---
name: phonics-checklist
description: Pre-implementation checklist for phonics-game sessions. Prints the coding rules most likely to cause bugs. Run this before writing any session code.
---

Read the session file, then confirm each rule below before writing code.

## Spec Code Has Bugs — Fix Before Implementing

Session specs often contain code samples that violate CLAUDE.md rules. Before using any code sample from the spec, scan it for these patterns and replace them:

| ❌ Spec pattern | ✅ Fix |
|---|---|
| `style.display = 'none'` / `'block'` / `'flex'` | Use a CSS class instead (`.active`, `.open`, `.hidden`) |
| `onclick="..."` HTML attribute | Remove attr; bind with `addEventListener` in JS |
| `.onclick = () => ...` | Use `addEventListener` — no stacking risk |
| `.sort(() => Math.random() - 0.5)` | Fisher-Yates (see Shuffling section) |
| `color: #636e72` | `color: var(--text-secondary)` |
| `localStorage.getItem / .setItem` | `SaveManager.load()` / `SaveManager.save()` |
| `window.x = window.x \|\| new X()` | `window.x = new X()` in `game.init()` — always fresh |
| `document.getElementById('tut-next-btn').onclick = ...` | Same button, multiple steps → single listener that dispatches on `this.step` |

The ⚠️ Watch Out section in each session file lists spec-specific violations. **Read it before writing a single line of code.**

---

## Timer Lifecycle Pattern

Every manager that uses `setTimeout` or `setInterval` **must** follow this exact pattern. Missing any part is a bug.

```js
class SomeManager {
    constructor() {
        // Declare ALL timer IDs as null at construction.
        this._mainTimer = null;
        this._shakeTimer = null;   // even short cosmetic timers
        this.onComplete = null;
    }

    cancel() {
        // cancel() clears EVERY timer and resets callbacks.
        // Call this at the start of start()/open() AND from showLessonSelect().
        clearTimeout(this._mainTimer);  this._mainTimer = null;
        clearTimeout(this._shakeTimer); this._shakeTimer = null;
        this._close();          // if this manager controls an overlay
        this.onComplete = null; // prevent stale callbacks
    }

    complete() {
        const cb = this.onComplete;  // ← save callback FIRST, before cancel() nulls it
        this.cancel();               // cleanup: clears timers, overlay, and onComplete
        // ... save state ...
        if (cb) cb();
    }

    skip() {
        this.complete(); // ← delegates — don't duplicate cancel logic here
    }

    start(data, onComplete) {
        this.cancel(); // ← defensive reset — prevents stacked listeners on re-entry
        this.onComplete = onComplete;
        // ... initialize fresh state ...
    }
}
```

**Key rules:**
- Every `setTimeout(...)` call → store the return value in `this._somethingTimer`
- Short cosmetic timers (e.g., shake removal after 400 ms) still need IDs — they can fire on detached DOM
- Use `el.isConnected` guard inside stored shake timers: `if (el.isConnected) el.classList.remove(...)`
- `cancel()` is the single source of truth for cleanup — never inline `clearTimeout` elsewhere
- `showLessonSelect()` must call `managerInstance.cancel()` for every manager

---

## Defensive Re-initialization

Every `start()` / `open()` / `show()` method that can be called more than once must reset state first:

```js
// ❌ Missing — re-entry stacks a new focus-trap handler on top of the old one
start(lesson, progress, onComplete) {
    this.lesson = lesson;
    // ...
}

// ✅ Correct — cancel() resets everything; _open() adds exactly one listener
start(lesson, progress, onComplete) {
    this.cancel();   // always call cancel() first
    this.lesson = lesson;
    // ...
}
```

This applies to any manager that opens an overlay — `TutorialManager`, and any future managers — wherever `start()` / `open()` / `show()` can be called more than once.

---

## Screen Visibility

- **Screens** → `.active` class (`el.classList.add('active')` / `.remove('active')`)
- **Overlays** (settings, PIN, tutorial, celebration) → `.open` class
- **Any element toggled visible/hidden** → a semantic class like `.hidden { display: none }` — NOT `style.display`
- No exceptions for "internal" elements like review sections — they still use a class

---

## Event Handlers

- **Always `addEventListener`** — never `onclick=` HTML attributes or `.onclick =` property assignment.
- For elements with multiple behavior states (next button in a multi-step flow): bind once in the constructor and dispatch on `this.step` — do NOT rebind on each step.
- This applies to dynamically created elements (word chips, sort buckets, tile speakers, etc.).

---

## innerHTML Safety

- **Never interpolate** user-facing data (lesson titles, words) into innerHTML.
- Use `createElement` + `textContent` for dynamic content.
- When innerHTML is truly needed for structure, use `escHtml()` on all variable values.
- `container.innerHTML = ''` to clear is fine — that's not interpolation.

---

## Singleton Managers

- Managers (`tutorialManager`, `sortManager`, `audioManager`, `narrativeManager`) → **initialize in `game.init()`**, not lazily in `startLesson()`.
- Never `window.x = window.x || new X()` — reuses stale state on second play.

---

## SaveManager (one localStorage key only)

- **One key**: `'phonics-progress'` — always `SaveManager.load()` / `SaveManager.save()`.
- Never call `localStorage.getItem/setItem` from outside SaveManager.
- `lessonId` keys are strings: use `String(id)` when reading/writing `data.lessons[id]`.
- When adding `lessonId + 1`: coerce to number first: `Number(lessonId) + 1`.

---

## CSS

- ID selectors (`#foo`) override class selectors (`.bar`) — never put `display:` in a base `#id` rule.
- Use `@keyframes` (not `transition`) for enter/exit animations on iOS Safari.
- Secondary text: **`var(--text-secondary)`** (#595143) — never `#636e72` (fails WCAG AA on cream background).

---

## iOS Safari

- Web Speech API: 50ms delay between `speechSynthesis.cancel()` and `speak()`.
- Web Audio: call `ctx.resume()` before playing; create `AudioContext` after first user gesture (not in constructor).

---

## Focus Management

**On open:** focus the first focusable element inside the overlay/dialog.

**On close:** return focus to whichever element triggered the opening.
- User-triggered dialog (e.g., settings gear → panel): return to the trigger button.
- Programmatically-opened dialog (e.g., tutorial opens automatically on lesson start): return focus to the first logical element in the now-active view — e.g., `#board-grid .tile` or `#board-back-btn`. Never leave focus in a void.

**Focus trap:** Tab/Shift-Tab stays within the overlay; Escape closes/skips.
- Query focusable elements dynamically inside the trap handler (step content changes between steps).
- Exclude `.hidden` elements from focusable set.

**Matched/disabled tiles:** `tabindex="-1"` + `aria-disabled="true"`; restored on refill.

---

## aria-pressed

- **Every `role="button"` element created with `createElement`** → set `aria-pressed="false"` at creation, even for stateless trigger buttons (e.g., "Hear word" chips).
- Update to `aria-pressed="true"` when the button enters a selected/pressed state.
- Matched tiles in the mini board: set `tabindex="-1"` + `aria-disabled="true"` (not aria-pressed) after selection.
- Native `<button>` elements don't need `aria-pressed` unless they toggle state.

---

## Dynamic aria-label

- Static `aria-label` in HTML is fixed — VoiceOver reads the attribute, **not** the `textContent`.
- Whenever you set `textContent` on an element that has (or needs) an `aria-label`, update the `aria-label` too:

```js
// ❌ VoiceOver says "Stars earned" regardless of actual star count
starsEl.textContent = '★★☆';

// ✅ VoiceOver says "2 of 3 stars earned"
starsEl.textContent = '★★☆';
starsEl.setAttribute('aria-label', '2 of 3 stars earned');
```

---

## Optional Chaining for Lesson JSON Fields

Lesson JSON fields beyond the required core (`id`, `title`, `gradeLevel`, `patterns`, `wordPool`) may be absent. Use optional chaining:

```js
// ❌ Throws if lesson.patternLabels is undefined
const label = lesson.patternLabels[pattern];

// ✅ Safe
const label = lesson.patternLabels?.[pattern] || pattern;
```

Fields that may be absent: `patternLabels`, `patternHint`, `tutorialWords`, `explorer`.

---

## Don't Duplicate Existing Work

Check what already exists before adding new infrastructure:
- **Settings panel**: `#settings-panel` with `_bindSettingsPanel()` — do not add a second one.
- **PIN dialog**: `#pin-dialog` with `_openPinDialog()` — do not use `prompt()`.
- **Speech mute**: stored in `SaveManager.load().muteSpeech` — do not create a separate localStorage key.
- **SFX mute**: stored in `SaveManager.load().muteSfx` — same pattern.

---

## Shuffling

- Never `array.sort(() => Math.random() - 0.5)` — biased. Use Fisher-Yates:
  ```js
  for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  ```

---

## WCAG Non-Negotiables

- **Never** add `user-scalable=no` to viewport — violates WCAG 1.4.4.
- Touch targets ≥ 44×44px on all interactive elements.
- No color-only state indicators — use shape/text + color.
