---
name: phonics-checklist
description: Pre-implementation checklist for phonics-game sessions. Prints the coding rules most likely to cause bugs. Run this before writing any session code.
---

Read the session file, then confirm each rule below before writing code.

## Screen Visibility

- **Use `.active` class** — never `style.display` — to show/hide screens.
  - `el.classList.add('active')` / `el.classList.remove('active')`
  - Overlays (settings, PIN, tutorial, celebration) use their own `.open` class.
  - Exception: loading spinners/overlays that aren't `.screen` elements may use `display` directly.

## Event Handlers

- **Always `addEventListener`** — never `onclick=` HTML attributes or `.onclick =` property assignment.
- This applies to dynamically created elements (word chips, sort buckets, tile speakers, etc.).

## innerHTML Safety

- **Never interpolate** user-facing data (lesson titles, words) into innerHTML.
- Use `createElement` + `textContent` for dynamic content.
- When innerHTML is truly needed for structure, use `escHtml()` on all variable values.

## Singleton Managers

- Managers (`tutorialManager`, `sortManager`, `audioManager`, `narrativeManager`) → **initialize in `game.init()`**, not lazily in `startLesson()`.
- Never `window.x = window.x || new X()` — reuses stale state on second play.

## Timer Cancellation

- Store **all** `setInterval` / `setTimeout` IDs (including challenge timer).
- **`showLessonSelect()` must cancel all timers**: `matchManager.cancel()`, `clearInterval(this.challengeTimer)`, etc.
- Add cancellation for any new timer introduced in the session.

## SaveManager (one localStorage key only)

- **One key**: `'phonics-progress'` — always `SaveManager.load()` / `SaveManager.save()`.
- Never call `localStorage.getItem/setItem` from outside SaveManager.
- `lessonId` keys are strings: use `String(id)` when reading/writing `data.lessons[id]`.
- When adding `lessonId + 1`: coerce to number first: `Number(lessonId) + 1`.

## CSS

- ID selectors (`#foo`) override class selectors (`.bar`) — never put `display:` in a base `#id` rule.
- Use `@keyframes` (not `transition`) for enter/exit animations on iOS Safari.
- Secondary text: **`var(--text-secondary)`** (#595143) — never `#636e72` (fails WCAG AA on cream background).

## iOS Safari

- Web Speech API: 50ms delay between `speechSynthesis.cancel()` and `speak()`.
- Web Audio: call `ctx.resume()` before playing; create `AudioContext` after first user gesture (not in constructor).

## Focus Management

- All dialogs/overlays: focus first focusable element on open; focus original trigger on close.
- Focus trap: Tab/Shift-Tab stays within; Escape closes.
- Matched tiles: `tabindex="-1"` + `aria-disabled="true"`; restored on refill.

## Don't Duplicate Existing Work

Check what already exists before adding new infrastructure:
- **Settings panel**: `#settings-panel` with `_bindSettingsPanel()` — do not add a second one.
- **PIN dialog**: `#pin-dialog` with `_openPinDialog()` — do not use `prompt()`.
- **Speech mute**: stored in `SaveManager.load().muteSpeech` — do not create a separate localStorage key.
- **SFX mute**: stored in `SaveManager.load().muteSfx` — same pattern.

## Shuffling

- Never `array.sort(() => Math.random() - 0.5)` — biased. Use Fisher-Yates:
  ```js
  for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  ```

## WCAG Non-Negotiables

- **Never** add `user-scalable=no` to viewport — violates WCAG 1.4.4.
- Touch targets ≥ 44×44px on all interactive elements.
- No color-only state indicators — use shape/text + color.
