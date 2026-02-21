# CLAUDE.md

## Project Overview

Collection of educational browser games for grades 2–6 (ages 7–12), some designed with dyslexia and ADHD accommodations. All games are self-contained in their own directories and deployed to GitHub Pages.

## Tech Stack

- **Vanilla JavaScript (ES6+)**, HTML5, CSS3 — no frameworks, no bundlers, no npm
- **HTML5 Canvas** for game rendering (catacombs-and-creeds)
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

A PostToolUse hook also runs the lesson validator automatically after each lesson file edit.

## Adding a New Game

1. Create a directory with the game name (e.g., `my-game/`)
2. Add an `index.html` inside it — the `<title>` tag is extracted for the index page
3. To customize the card on the index page, add an entry to `manualGameConfig` in `.github/scripts/update-index.js` with icon, title, and description
4. Push to `main` — the workflow handles the rest

## Architecture

Each game is independent — no shared libraries or components between games. Games range from single-file (`index.html` with inline JS/CSS) to multi-file modular JS (e.g., `catacombs-and-creeds/` with separate renderer, dialogue, game logic).

### catacombs-and-creeds (active development)

Educational dungeon crawler — the most complex game. Key docs:
- `plan.md` — full design spec (1700 lines): levels, mechanics, accessibility requirements, content

All 5 levels built with full content. Core systems complete: combat, inventory (580×560 panel), 3-slot save system, dialogue with pixel-art portraits, question bank (66 questions), NPC/enemy/item placement verified reachable across all maps.

**Key source files:**
- `js/game.js` — main engine/state machine
- `js/tilemap.js` — map, tile types; interact() takes optional playerTile param
- `js/render.js` — Canvas rendering
- `js/dialogue.js` — dialogue system using portraits.js
- `js/portraits.js` — pixel-art portraits for 7 characters
- `js/save.js` — 3-slot save; autoSave() skips if currentSlot === null
- `js/questions.js` — 66-question bank, Fisher-Yates shuffle, session-wide deduplication
- `content/level1_dialogue.js` — guide NPC is "Priscilla" (not Peter)
- `data/levels/level{1-5}.json` — level maps and entity placement

**Tile type walkability** (critical for map editing — do not confuse):
- Walkable: FLOOR=0, DOOR=2, ALTAR=4, STAIRS=7, HIDING=8, LATIN_TILE=11, MARBLE=13
- Solid: WALL=1, CHEST=3, TORCH=5, WATER=6, BOOKSHELF=9, HIDDEN_WALL=10, BARRIER=12, PILLAR=14

Use `/verify-maps` skill to BFS-check all level maps for reachability after editing.

**Target platform:** iPad Safari with Bluetooth keyboard. Must maintain 60fps on iPad.

### math-coloring-2 (complete — may add levels/lessons)

2nd grade math coloring game. Single file: `math-coloring-2/index.html` (all JS/CSS/HTML inline).

**Key data structures (all in the `<script>` block):**
- `themes` — object with 7 keys (`puppies`, `kitties`, `unicorns`, `frogs`, `elephants`, `turtles`, `butterflies`). Each is an array of section objects: `{ x, y, r, answer, type:'circle' }` or `{ x, y, points:[[x,y],...], answer, type:'polygon'|'triangle' }`. The `x,y` field doubles as the number label position for polygons, so set it near the centroid.
- `lessons` — array of 25 lesson objects (indices 0–24). Each: `{ title, description, problems: { [answerInt]: [string,...] } }`.
- `colors` — maps answer integer → CSS hex. Every answer value used in any theme needs an entry; missing values fall back to `'#FFB6C1'`.

**Critical rules when editing themes:**
- **Section overlap**: Every section must visually overlap its nearest neighbor by ≥15px. For circles: `overlap = (r1 + r2) - dist(centers)`. For polygons: at least one vertex must land inside the adjacent circle (`vertex_dist < r`). Use `/verify-math-geometry` skill to check.
- **Hit-test order**: Sections are tested in reverse array order (last = topmost). Small sections (eyes, nose) must be listed AFTER the large body/head circles they visually sit on top of.
- **Rendering**: Two-pass draw — all fills before all strokes. Never revert to single-pass (causes visible outline gaps where circles overlap).
- **Answer values**: All answer keys in a theme must exist in the `colors` map. Currently missing nothing; if you add a new answer value, add it to `colors` first.

**Grade-level rules for lessons:**
- Lessons 1–21 mix in `×` and `÷` notation (grandfathered). For new lessons (22+): **no `÷` or `×` symbols** — these are Grade 3 standards. Use addition/subtraction phrasing only (`'Half of 8 = ?'` not `'8 ÷ 2'`).
- Fractions-of-quantities (`1/4 of 32`) are Grade 4+, not appropriate for a 2nd grade game.
- Telling-time problems: "minute hand at 6 = 30 minutes past" — answer must be 30, not 6.

### phonics-game (active development)

Word Explorer — phonics matching game for grades 1–5. Multi-file modular JS.

**Session workflow:** After each session: run a web engineer review agent → fix issues → delete the session file → commit + push.

**Session tracking:** Sessions defined in `phonics-game/sessions/`. Delete session file after completing it. Run sessions in order per `sessions/MODEL-ASSIGNMENTS.md` (Haiku for data-entry sessions, Sonnet for implementation sessions).

**Key files:**
- `index.html` — game shell with 4 screens: `#screen-select`, `#screen-board`, `#screen-sort`, `#screen-summary`
- `css/style.css` — design system (CSS vars incl. `--text-secondary`, grade colors, responsive 3/4/5-col lesson grid)
- `js/game.js` — Game class: lesson select rendering, grade filter, settings panel, PIN dialog (all with focus traps)
- `js/save.js` — SaveManager (localStorage key: `phonics-progress`); `_defaults()` defines all required fields
- `js/data.js` — DataManager: `loadLesson(id)` fetches JSON; `getLessonMeta()` returns all 30 lessons (field: `gradeLevel`)
- `data/lessons/lesson-{01-30}.json` — phonics lesson data (Sessions 2–4); schema uses `gradeLevel` field

**Grid sizes by grade:** Grade 1: 4×4 (16 tiles), Grade 2–3: 5×5 (25), Grade 4–5: 6×6 (36). See `plan.md § 2.5`.

**Target platform:** iPad Safari (primary), desktop Chrome/Firefox. DOM + CSS Grid (not Canvas).

**Phonics data rules (all lesson JSON edits):**
- Words must phonetically exemplify their pattern — check for exceptions (e.g. "word" sounds like "ur" not "or"; "smooth" has silent TH)
- **Homographs:** avoid words with two pronunciations (e.g. "read", "wind", "wound", "bow", "use"). The HOMOGRAPHS set in `validate-lessons.js` is the source of truth.
- **No cross-pattern duplicates** within the same lesson — a word that belongs to pattern A must not appear in pattern B of the same file.
- **Blend classification:** verify which blend family a word belongs to. "sly" is an SL-blend (s-blend), not an L-blend.
- **VCE (silent-E) patterns:** r-controlled vowels are NOT long vowels. "cure", "lure", "pure" are /ɜː/, not long-U — exclude from `u_e` pattern.
- **Root transparency:** the root must be clearly visible and productive in the word. "constrict" has STRICT/STRING root, not STRUCT. "manuscript" serves both SCRIB and MAN — pick one lesson.
- **British spellings:** "draught", "nought", "colour", etc. are unrecognizable to American students — use American equivalents.
- **Grade-appropriate vocabulary:** avoid adult medical terms (e.g. "gout"), archaic words, and proper nouns at early grade levels.
- Run `/validate-lessons` after every lesson file edit (also runs automatically via hook).

## HTML/JS Coding Standards

Rules that apply to ALL games in this repo. These prevent recurring bugs:

**Font loading:** Load OpenDyslexic via `<link rel="stylesheet">` in HTML only — never also `@import` in CSS (double HTTP request, render-blocking).

**Viewport:** Never use `user-scalable=no` — violates WCAG 1.4.4. Users with dyslexia rely on browser zoom.

**Modal dialogs:** Use `<div role="dialog" aria-modal="true" aria-label="...">` (not `<aside>` — conflicting landmark). First focusable element must be a close (✕) button. Implement Tab/Shift-Tab focus trap + Escape to close. On open: focus close button, set `aria-hidden="false"` on panel, set `aria-expanded="true"` on trigger. On close: reverse all three.

**innerHTML safety:** HTML-escape any interpolated values: `String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')`. Use an `escHtml()` helper.

**Locked interactive elements:** Set `tabindex="-1"` AND `aria-disabled="true"` — a visual `.locked` class alone is invisible to assistive technology.

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

**Toggle/selection buttons:** Any `role="button"` created with `createElement` needs `aria-pressed="false"` at creation — including stateless trigger buttons (e.g., speak-word chips). Update to `"true"` when pressed/selected. A visual `.selected` class alone is invisible to assistive technology.

**Modal focus-return:** On close, return focus to the element that opened the dialog (e.g., the settings button) — not to a button inside the now-hidden panel.

## Accessibility Requirements (All Games)

These are non-negotiable for the target audience (dyslexia + ADHD accommodations):
- **Font:** OpenDyslexic via CDN with Comic Sans MS fallback (Comic Sans is pre-installed on iPads), minimum 16pt, 1.5–2× line height
- **Colors:** Cream background (#F5F0E8), dark text (#2C2416), WCAG AA contrast (4.5:1 minimum). Secondary/muted text: use #595143 or darker on cream — never #666, #888, #999 (all fail WCAG AA on cream)
- **Touch targets:** 44×44px minimum on all interactive elements
- **No flashing/strobing effects**
- **No countdown timers visible by default** (anxiety-inducing for ADHD learners)

**catacombs-and-creeds specific:**
- **Text:** Maximum 15 words per dialogue box, no time pressure, typewriter effect skippable
- **ADHD:** Auto-save every 2 minutes, always-visible objectives, 9–18 min per level
