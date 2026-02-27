# CLAUDE.md

## Project Overview

Collection of educational browser games for grades 2–6 (ages 7–12), some designed with dyslexia and ADHD accommodations. All games are self-contained in their own directories and deployed to GitHub Pages.

## Tech Stack

- **Vanilla JavaScript (ES6+)**, HTML5, CSS3 — no frameworks, no bundlers, no npm
- **HTML5 Canvas** for game rendering (catacombs-and-creeds, keyboard-command-4)
- **LocalStorage** for save data
- Games run directly in-browser with no build step

## Environment

Use `mise` to manage `node` and `yarn` versions. Activate mise shell before running node/yarn:
```bash
eval "$(mise activate bash)"
```

## Development Workflow

There is no build, lint, or test step. Edit files directly and commit.

**Regenerate the main index page locally:**
```bash
node .github/scripts/update-index.js
```

**Deployment:** Pushing to `main` triggers `.github/workflows/update-index.yml` which regenerates `index.html` and deploys to GitHub Pages. The workflow auto-commits index changes with `[skip ci]`.

## Verification Workflows

Run these skills after editing the relevant files — before committing:

| When | Skill | What it checks |
|------|-------|----------------|
| After editing any `catacombs-and-creeds/data/levels/levelN.json` | `/verify-maps` | BFS reachability of all NPCs, items, chests, enemies from player start |
| After editing `math-coloring-2/index.html` themes | `/verify-math-geometry` | Every section overlaps nearest neighbor by ≥15px |
| After editing any `phonics-game/data/lessons/*.json` | `/validate-lessons` | Word count ≥8, no cross-pattern duplicates, no homographs, no British spellings |
| After editing any `keyboard-command-4/data/levels/levelN.json` | `/verify-kc4-levels` | Item safety, shortcut ID validity, hp/phases consistency, offsetX collisions, mage depths, instruction accuracy, taunt uniqueness |

PostToolUse hooks run automatically after each Edit/Write:
- Lesson validator (phonics lesson JSON files)
- JS pattern checks (phonics-game and keyboard-command-4 JS/HTML files)
- Level JSON validator (keyboard-command-4 level JSON files)

## Adding a New Game

1. Create a directory with the game name (e.g., `my-game/`)
2. Add an `index.html` inside it — the `<title>` tag is extracted for the index page
3. To customize the card on the index page, add an entry to `manualGameConfig` in `.github/scripts/update-index.js` with icon, title, and description
4. Push to `main` — the workflow handles the rest

## Architecture

Each game is independent — no shared libraries or components between games. Games range from single-file (`index.html` with inline JS/CSS) to multi-file modular JS (e.g., `catacombs-and-creeds/` with separate renderer, dialogue, game logic).

Game-specific architecture notes are in path-scoped rules files (auto-loaded when editing that game's files):

- **catacombs-and-creeds** — Canvas dungeon crawler, 5 levels complete. See `.claude/rules/catacombs.md`.
- **math-coloring-2** — 2nd grade math coloring game, single-file. See `.claude/rules/math-coloring.md`.
- **phonics-game** — Word Explorer, phonics matching for grades 1–5. See `.claude/rules/phonics.md`.
- **keyboard-command-4** — Shortcut-teaching shooter, multi-file Canvas. See `.claude/rules/kc4-architecture.md`.

## HTML/JS Coding Standards

Rules that apply to ALL games in this repo. These prevent recurring bugs:

**Font loading:** Load OpenDyslexic via `<link rel="stylesheet">` in HTML only — never also `@import` in CSS (double HTTP request, render-blocking).

**Viewport:** Never use `user-scalable=no` — violates WCAG 1.4.4. Users with dyslexia rely on browser zoom.

**Modal dialogs:** Use `<div role="dialog" aria-modal="true" aria-label="...">` (not `<aside>` — conflicting landmark). First focusable element must be a close (✕) button. Implement Tab/Shift-Tab focus trap + Escape to close. On open: focus close button, `setAttribute('aria-hidden', 'false')` on overlay, set `aria-expanded="true"` on trigger. On close: `setAttribute('aria-hidden', 'true')` on overlay, reverse aria-expanded. Note: `removeAttribute('aria-hidden')` is correct for *filtered list items* (lesson cards) but overlays always use explicit `'false'`/`'true'` — never remove the attribute.

**innerHTML safety:** HTML-escape any interpolated values: `String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')`. Use an `escHtml()` helper.

**Locked interactive elements:** For native `<button>` elements use the `disabled` attribute — it removes the element from tab order and announces correctly to AT automatically. For `role="button"` divs/spans, set `tabindex="-1"` AND `aria-disabled="true"`. A visual `.locked` class alone is insufficient in both cases.

**Filtered lists:** When hiding items with `display:none`, also set `aria-hidden="true"` so AT list counts stay accurate.

**Font size scaling:** Apply via `document.documentElement.style.fontSize = '20px'` rather than re-declaring a CSS custom property on `:root` from a class (fragile source-order dependency).

**`window.game` init pattern:** `window.game = new Game(); window.game.init();` — never `game.init()` (relies on implicit global before assignment completes). With `defer`, call directly — never wrap in `window.addEventListener('load', ...)` which delays rendering.

**Timer lifecycle pattern (managers with setTimeout/setInterval):** Every manager that uses timers must follow this pattern exactly — missing any part is a bug:
```js
class SomeManager {
    constructor() {
        this._mainTimer = null;   // declare ALL timer IDs as null
        this._shakeTimer = null;  // even short cosmetic timers — they fire on detached DOM
        this.onComplete = null;
    }
    cancel() {                    // single source of truth for cleanup
        clearTimeout(this._mainTimer);  this._mainTimer = null;
        clearTimeout(this._shakeTimer); this._shakeTimer = null;
        this._close();            // if manager controls an overlay
        this.onComplete = null;   // prevent stale callbacks
    }
    complete() {
        const cb = this.onComplete;  // save BEFORE cancel() nulls it
        this.cancel();               // cleanup: timers, overlay, onComplete
        // ... save state ...
        if (cb) cb();
    }
    skip()     { this.complete(); }          // delegate — never duplicate cancel logic
    start(...) { this.cancel(); /* ... then init */ }  // defensive reset on re-entry
}
```
Detached-element callbacks: use `if (el.isConnected) el.classList.remove(...)` inside stored shake timers. `showLessonSelect()` must call `.cancel()` on every active manager.

**Visibility toggles:** Never use `style.display` to show/hide any element. Use a CSS class for every case: `.active` (screens), `.open` (overlays/panels), `.hidden` (internal elements). `container.innerHTML = ''` to clear is fine — that's not a visibility toggle.

**Dynamic aria-label:** Static `aria-label` in HTML is fixed — VoiceOver reads the attribute, not `textContent`. Whenever `textContent` changes on a labelled element, also update `setAttribute('aria-label', ...)` to match.

**CSS ID specificity:** ID selectors (`#foo`) always beat class selectors (`.bar`) regardless of source order. Never put `display:` in a base ID rule when a class like `.screen` controls visibility — the ID rule will silently override `display:none`. Instead: put `display:flex` only in `#foo.active { display: flex; }`.

**Web Speech API (iOS Safari):** `cancel()` silences an immediately-following `speak()` call on iOS. Always delay: `speechSynthesis.cancel(); setTimeout(() => speechSynthesis.speak(utterance), 50)`. Also feature-detect: `if (!('speechSynthesis' in window)) return`.

**Web Audio API (iOS Safari):** `AudioContext` must be created lazily inside a user-gesture handler — never in a constructor. `ctx.resume()` returns a Promise; never schedule oscillator nodes immediately after calling it. Chain scheduling inside `.then()`: `ctx.resume().then(() => scheduleOscillator())`.

**Toggle/selection buttons:** `aria-pressed` is for buttons with a **persistent binary state** — tile selection, grade filter tabs, settings toggles. Set `aria-pressed="false"` on creation and update to `"true"` when active. Pure action triggers (navigate, speak-word, sort-into-bucket) do NOT use `aria-pressed`. A visual `.selected` class alone is invisible to assistive technology.

**`aria-live` + `aria-label` conflict:** Never put both on the same element. VoiceOver announces both — an `aria-label` overrides `textContent` for AT, so a live region with an `aria-label` will either double-announce or announce the wrong text. Use `aria-live` alone; changing `textContent` drives the announcement.

**Modal focus-return:** On close, return focus to the element that opened the dialog (e.g., the settings button) — not to a button inside the now-hidden panel.

**Focus trap Escape guard:** Focus trap keydown handlers must guard against firing after the overlay is already closed. Always check `el.classList.contains('open')` before acting on Escape: `if (e.key === 'Escape') { if (overlay.classList.contains('open')) doClose(); return; }`. Without this guard, a stale handler registered before `_dismissX()` could fire on the next Escape keypress and corrupt state.

**Timer race with async navigation:** `setInterval`/`setTimeout` callbacks that call into game state (e.g. `onChallengeTimeUp()`) must guard against `null` state at the top: `if (!window.scoreManager) return;`. `clearInterval` prevents *future* firings but cannot cancel a callback already in the JS call stack — so a tick that fires in the same event loop turn as `showLessonSelect()` (which nulls managers) will still execute. Always null-guard before accessing `window.scoreManager`, `window.matchManager`, etc.

**SaveManager `_defaults()` completeness:** Every key that `game.js` reads from progress must exist in `SaveManager._defaults()`. If `game.init()` checks `if (data.someKey !== undefined)`, `_defaults()` must include `someKey` with its default value — otherwise fresh installs behave correctly but the key is never included in saved data until the user explicitly changes that setting.

**`try/catch` async overlay timing:** When an overlay is shown before an `async` operation, hiding it in `finally` keeps it visible for all synchronous code that runs *after* the `await` inside the `try` block — including screen transitions and overlay launches. Instead, call `classList.remove('open')` immediately after the `await` (before screen transitions), and repeat in `catch` for the error path: `const lesson = await DataManager.loadLesson(id); loadingOverlay.classList.remove('open'); // hide before screen switch`. A `finally`-only approach is wrong when the overlay has a high z-index that would cover subsequent overlays (e.g., mode-select, tutorial).

**Re-entry guard for functions reachable from multiple timer paths:** Any function that can be called from two independent timer paths (e.g., `onLessonComplete()` reachable from both match.js `_winTimer` and board.js `_noMovesTimer`) must set a boolean guard flag immediately on entry: `if (this._lessonComplete) return; this._lessonComplete = true;`. Reset the flag at the start of each new play (in `startLesson()`). The guarded function must also cancel all related timers/managers on entry to prevent in-flight timers from calling it a second time: cancel `matchManager` at the top of `onLessonComplete()`, not only inside `showLessonSelect()`.

## Accessibility Requirements (All Games)

These are non-negotiable for the target audience (dyslexia + ADHD accommodations):
- **Font:** OpenDyslexic via CDN with Comic Sans MS fallback (Comic Sans is pre-installed on iPads), minimum 16pt, 1.5–2× line height
- **Colors:** Cream background (#F5F0E8), dark text (#2C2416), WCAG AA contrast (4.5:1 minimum). Secondary/muted text: use #595143 or darker on cream — never #666, #888, #999 (all fail WCAG AA on cream)
- **Touch targets:** 44×44px minimum on all interactive elements
- **No flashing/strobing effects**
- **No countdown timers visible by default** (anxiety-inducing for ADHD learners)

