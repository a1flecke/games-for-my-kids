# Session 1 — Claude Tooling + Project Scaffold
**Model:** Opus | **Focus:** Repo plumbing, validation tooling, state-machine shell, save manager, index registration

This session creates everything *around* the game so future sessions can land on a green base. No gameplay yet.

## Pre-flight

1. Read `claudes-math-marauder/plan.md` and `docs/superpowers/specs/2026-05-01-claudes-math-marauder-design.md`.
2. There is no `/marauder-checklist` yet — this session creates it. Skim the spec sections 4 (renderer), 5 (audio), 6 (data), 7 (a11y) before writing skeleton code so the structure is right.

## Files to create

### Game directory skeleton
- `claudes-math-marauder/index.html`
- `claudes-math-marauder/css/style.css`
- `claudes-math-marauder/js/game.js`
- `claudes-math-marauder/js/save.js`
- `claudes-math-marauder/js/util/rng.js`
- `claudes-math-marauder/js/util/shuffle.js`
- `claudes-math-marauder/js/util/escape.js`
- `claudes-math-marauder/js/ui/toast.js`
- `claudes-math-marauder/data/.gitkeep` (data files come in Session 4)
- `claudes-math-marauder/scripts/test-save-migration.js`
- `claudes-math-marauder/scripts/validate-data.js` (stub returning success — fleshed out in Session 4)

### Claude tooling
- `.claude/rules/marauder.md` — path-scoped architecture rules
- `.claude/skills/marauder-checklist/SKILL.md` — pre-implementation checklist
- `.claude/skills/validate-marauder-data/SKILL.md` — data validator skill
- `.claude/hooks/validate-marauder-data-hook.sh` — auto-validate on data edits
- `.claude/agents/marauder-web-review/agent.md` — code-review agent

### Files to modify
- `.github/scripts/update-index.js` — register the game with icon, title, description, category
- `.claude/settings.json` — add the new hook entry to `hooks.PostToolUse`

## Deliverables

### 1. `index.html`

Minimal HTML scaffold matching repo conventions:

- `<title>Claude's Math Marauder</title>`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — no `user-scalable=no`
- `<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/opendyslexic">` (or whichever CDN KC4 uses — match the existing pattern by grepping `keyboard-command-4/index.html`)
- `<link rel="stylesheet" href="css/style.css">`
- One `<canvas id="game-canvas">` and one `<div id="hud-root" aria-live="polite"></div>` for HUD overlays
- One `<div id="overlay-root"></div>` for modal overlays
- `<div id="toast-root" role="status"></div>` for toasts
- `<script type="module" src="js/game.js" defer></script>` (defer; never wrap init in `window.addEventListener('load', ...)`)
- Hidden title screen: `<section id="title-screen" class="screen active">` with `<h1>Claude's Math Marauder</h1>`, subtitle "A game by Claude", a "Begin" button (id `start-button`)

### 2. `css/style.css`

Design system as CSS custom properties on `:root`:

```css
:root {
  --bg: #F5F0E8;            /* cream */
  --text: #2C2416;          /* dark on cream */
  --text-secondary: #595143;
  --accent-ink: #1a1a1a;
  --accent-comic-red: #c93434;
  --accent-comic-blue: #2c5fb3;
  --accent-comic-yellow: #f0d840;
  --panel-stroke: 4px;
  --font-base: 20px;
  --font-numerals: 64px;
  --font-stack: "OpenDyslexic", "Comic Sans MS", cursive;
  --line-height: 1.5;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-stack);
  font-size: var(--font-base);
  line-height: var(--line-height);
}

#game-canvas { display: block; touch-action: none; width: 100vw; height: 100vh; }

.screen { display: none; }
.screen.active { display: flex; flex-direction: column; align-items: center; justify-content: center; }

.overlay { display: none; position: fixed; inset: 0; background: rgba(44,36,22,0.5); z-index: 100; }
.overlay.open { display: flex; align-items: center; justify-content: center; }
.overlay[aria-hidden="true"] { pointer-events: none; }

.hidden { display: none; }
.locked { opacity: 0.5; cursor: not-allowed; }

button {
  font-family: var(--font-stack);
  font-size: var(--font-base);
  min-width: 44px; min-height: 44px;
  background: var(--accent-comic-yellow);
  color: var(--text);
  border: var(--panel-stroke) solid var(--accent-ink);
  border-radius: 12px;
  cursor: pointer;
}
button:disabled { opacity: 0.5; cursor: not-allowed; }
```

Note the **CSS ID specificity rule** from CLAUDE.md: never put `display:` in a base ID rule when a class controls visibility. `#title-screen.active { display: flex; }` is correct; `#title-screen { display: flex; }` is wrong.

### 3. `js/save.js` — SaveManager (single source of truth)

Class with **all static methods** so callers never hold an instance. Required methods:

```js
const KEY = 'claudes-math-marauder-save';
const BACKUP_KEY = 'claudes-math-marauder-save-backup';
const SCHEMA_VERSION = 1;

const SaveManager = {
  load() { /* return parsed save or _defaults() if missing/corrupt; on parse-fail try BACKUP_KEY; on second fail show toast and return _defaults() */ },
  save(data) { /* stringify, write KEY; every 5th save also write BACKUP_KEY; catch quota error → toast */ },
  reset() { /* localStorage.removeItem(KEY); localStorage.removeItem(BACKUP_KEY); */ },
  _defaults() { /* return the schema shape from plan.md verbatim — every key game.js may read */ },
  _migrate(data) { /* if data.schemaVersion < SCHEMA_VERSION, apply numbered migrators; return migrated data */ },
  _saveCount: 0,
};
```

**`_defaults()` MUST return** every key listed in plan.md's "Save Schema" — `mastery: {}`, `activeRun: null`, `settings` with all keys, `realmStars` with all 5 realms keyed to 0, `equippedDeck` with 5 nulls (or `["ember_bolt", null, null, null, null]` since Ember Bolt is the starter), `ownedSpellIds: ["ember_bolt"]`, `unlockedClassIds: ["apprentice"]`, `selectedClassId: "apprentice"`. If a future session adds a field, add it to `_defaults()` in the same commit.

**Migration shape:**
```js
const MIGRATIONS = {
  0: (d) => { /* 0→1: noop placeholder; future migrations slot in here */ return d; },
};
function _migrate(data) {
  let d = data || {};
  let v = d.schemaVersion || 0;
  while (v < SCHEMA_VERSION) {
    d = MIGRATIONS[v](d);
    v++;
    d.schemaVersion = v;
  }
  return d;
}
```

### 4. `js/game.js` — State-machine shell

Single RAF chain; passes `dt` to `update()` and `draw()`. State machine boilerplate only — no gameplay logic yet.

```js
const STATE = {
  TITLE: 'TITLE',
  HUB: 'HUB',
  REALM_PICK: 'REALM_PICK',
  RUN_MAP: 'RUN_MAP',
  FIGHT: 'FIGHT',
  RESULTS: 'RESULTS',
  PAUSED: 'PAUSED',
};

class Game {
  constructor() {
    this.state = STATE.TITLE;
    this.canvas = null;
    this.ctx = null;
    this._lastFrameTime = 0;
    this._rafId = 0;
    this._save = null;          // cached save snapshot, refresh on state entry
  }

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._setupCanvasDpr();
    window.addEventListener('resize', () => this._setupCanvasDpr());
    this._save = SaveManager.load();
    this._bindTitleScreen();
    this._loop = this._loop.bind(this);
    this._rafId = requestAnimationFrame(this._loop);
  }

  _setupCanvasDpr() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = this.canvas.clientWidth  * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(1,0,0,1,0,0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  _loop(now) {
    if (!this._lastFrameTime) this._lastFrameTime = now;
    let dt = now - this._lastFrameTime;
    if (dt > 50) dt = 50;
    this._lastFrameTime = now;

    if (this.state !== STATE.PAUSED) this._update(dt);
    this._draw();
    this._rafId = requestAnimationFrame(this._loop);
  }

  _update(dt) { /* placeholder; future sessions drive managers from here */ }
  _draw() { /* placeholder; clear canvas with cream */ this.ctx.fillStyle = '#F5F0E8'; this.ctx.fillRect(0,0,this.canvas.clientWidth, this.canvas.clientHeight); }

  setState(next) {
    if (this.state === next) return;
    // future sessions: cancel timers/animations on transition
    this.state = next;
    this._refreshScreens();
  }

  _refreshScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const id = `${this.state.toLowerCase().replace(/_/g,'-')}-screen`;
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  _bindTitleScreen() {
    const btn = document.getElementById('start-button');
    if (btn) btn.addEventListener('click', () => this.setState(STATE.HUB));
  }
}

// CLAUDE.md init pattern — exact:
window.game = new Game();
window.game.init();
```

### 5. `js/util/rng.js` — Seeded PRNG

Mulberry32 + `hashString` per Petstore precedent.

```js
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function seededRandom(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}
```

### 6. `js/util/shuffle.js` — Fisher-Yates

```js
export function shuffleInPlace(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### 7. `js/util/escape.js` — escHtml

```js
export function escHtml(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

### 8. `js/ui/toast.js` — Quota / save error toast

Minimal:
```js
export function showToast(msg, ms = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { if (el.isConnected) el.remove(); }, ms);
}
```

### 9. `scripts/test-save-migration.js`

Node script — run with `node claudes-math-marauder/scripts/test-save-migration.js`. Use a localStorage shim and `assert`:

```js
// node-only shim
const store = {};
global.localStorage = {
  getItem: (k) => k in store ? store[k] : null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = { addEventListener() {} };
global.document = { getElementById() { return { addEventListener() {} }; } };

// dynamic import the SaveManager source
// Convert ES export to CommonJS by reading and evaling, OR ship save.js as both ESM and a CJS-compatible format.
// SIMPLER: factor save.js into pure object exported via globalThis pattern that both Node and browser can read.
```

**Decision (resolves the "save.js as both module and Node-loadable" tension):** ship the SaveManager core as a UMD-style file:

```js
// js/save.js — top of file
(function(global) {
  'use strict';
  // ... SaveManager body ...
  if (typeof module !== 'undefined' && module.exports) module.exports = { SaveManager };
  else global.SaveManager = SaveManager;
})(typeof window !== 'undefined' ? window : globalThis);
```

This pattern is reused for every pure-logic module that has a Node test counterpart (combat/factKeys.js, combat/mastery.js, combat/problemGen.js, combat/distractors.js, run/mapGen.js, util/rng.js, util/shuffle.js).

**Test cases (test-save-migration.js):**

```js
const { SaveManager } = require('../js/save.js');
const assert = require('assert');

let pass = 0, fail = 0;
function it(name, fn) { try { fn(); console.log('PASS', name); pass++; } catch (e) { console.error('FAIL', name, e.message); fail++; } }

// Defaults shape
it('defaults includes every required key', () => {
  const d = SaveManager._defaults();
  ['schemaVersion','mastery','activeRun','settings','realmStars','equippedDeck','ownedSpellIds','unlockedClassIds','selectedClassId','gold'].forEach(k => assert.ok(k in d, `missing ${k}`));
  assert.strictEqual(d.equippedDeck.length, 5);
  assert.strictEqual(d.ownedSpellIds[0], 'ember_bolt');
});

it('settings has every key', () => {
  const s = SaveManager._defaults().settings;
  ['speechVoiceURI','speechRate','autoNarrate','sfxVolume','muteAll','reducedMotion','fontScale','showSpeedTimer','allowStretchFacts','devMode'].forEach(k => assert.ok(k in s, `missing settings.${k}`));
});

// Round-trip
it('save/load round-trip preserves all fields', () => {
  SaveManager.reset();
  const d = SaveManager._defaults();
  d.gold = 142;
  d.mastery['mul:7x8'] = { box: 3, lastSeenAt: 1, totalAsked: 5, totalCorrect: 4, avgMs: 2000, streak: 2, shaky: false };
  SaveManager.save(d);
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.gold, 142);
  assert.strictEqual(loaded.mastery['mul:7x8'].box, 3);
});

// Migration from v0
it('migrates v0 (missing fields) to current schema', () => {
  SaveManager.reset();
  global.localStorage.setItem('claudes-math-marauder-save', JSON.stringify({ schemaVersion: 0, gold: 5 }));
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.schemaVersion, 1);
  assert.strictEqual(loaded.gold, 5);
  assert.ok('mastery' in loaded);
  assert.ok('settings' in loaded);
});

// Corrupt JSON → fallback to defaults
it('corrupt save falls back to defaults (and toast call counted)', () => {
  SaveManager.reset();
  global.localStorage.setItem('claudes-math-marauder-save', '{not json');
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.gold, 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
```

### 10. `scripts/validate-data.js` (stub)

```js
#!/usr/bin/env node
// Validates claudes-math-marauder/data/*.json files.
// Stub for Session 1 — Session 4 fleshes this out.
console.log('OK (no data files yet — validator stub from Session 1)');
process.exit(0);
```

### 11. `.claude/rules/marauder.md`

Path-scoped architecture rules. Mirror `.claude/rules/lizzies-petstore.md` shape. Header:

```markdown
---
paths:
  - "claudes-math-marauder/**"
---

# Claude's Math Marauder — Architecture Rules

## Single RAF Chain — game.js Owns the Loop
[Same wording as KC4/Petstore rule, adapted for math-marauder managers (FightManager, BossFightManager, MapManager, AnimationManager, SpeechManager)]

## Timer Lifecycle Pattern
[Same pattern as Petstore]

## Combat Determinism
- Combat must be deterministic given (runSeed, masteryStateAtFightStart, inputSequence). Never call Math.random() inside combat code — always use the run-seeded PRNG. This is required for the replay harness (Session 13).
- Distractors are shuffled with Fisher-Yates using the run-seeded PRNG.

## Mastery Save Cadence
- Update mastery in-memory per problem; commit to SaveManager once per fight at VICTORY/DEFEAT_RETRY (batch write).
- Never call SaveManager.save() per problem (CLAUDE.md hot-path rule).

## Combat Module Purity
- Modules under combat/ must not import any DOM, canvas, or audio modules. They are pure logic so Node tests can require() them.
- Visual effects, audio cues, and DOM updates live in fight.js's renderer/effect callbacks, called by the FightManager.

[plus all the standard CLAUDE.md rules abbreviated]
```

### 12. `.claude/skills/marauder-checklist/SKILL.md`

Mirror `.claude/skills/petstore-checklist/SKILL.md` exactly in shape, but adapt the bug-pattern table for math-marauder. Include sections:
- Spec code patterns to fix (same patterns table as petstore-checklist, adapted)
- Single RAF rule
- Timer lifecycle pattern
- Web Audio iOS quirks
- Web Speech iOS quirks
- ARIA rules (aria-hidden explicit, aria-pressed only on toggles, role="group" not role="list" for button grids)
- `try/catch` async overlay timing
- `SaveManager._defaults()` completeness
- Re-entry guards on shared callbacks (`onFightComplete` reachable from VICTORY and DEFEAT_RETRY paths)
- Visibility classes only — no `style.display`
- Combat purity rule (no DOM/canvas in combat/)
- Mastery save cadence rule
- Stretch-fact eligibility (only families with `mastery.box >= 4 && totalCorrect >= 6`)

### 13. `.claude/skills/validate-marauder-data/SKILL.md`

```markdown
---
name: validate-marauder-data
description: Validate all claudes-math-marauder data/*.json files for schema integrity, referential consistency, and contrast.
---

Run `node claudes-math-marauder/scripts/validate-data.js` and fix any reported errors.
```

### 14. `.claude/hooks/validate-marauder-data-hook.sh`

Mirror `.claude/hooks/validate-petstore-data-hook.sh` verbatim, swap paths:

```bash
#!/bin/bash
input=$(cat)
fp=$(python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null <<< "$input")

if [[ "$fp" == *"claudes-math-marauder/data/"* && "$fp" == *.json ]]; then
    result=$(node claudes-math-marauder/scripts/validate-data.js 2>&1)
    echo "$result"
    if echo "$result" | grep -q "CRITICAL"; then
        exit 2
    fi
fi
```

`chmod +x .claude/hooks/validate-marauder-data-hook.sh`.

### 15. `.claude/agents/marauder-web-review/agent.md`

Mirror `.claude/agents/petstore-web-review/agent.md` shape. Frontmatter:

```markdown
---
name: marauder-web-review
description: Senior web engineer code reviewer for claudes-math-marauder sessions. Use after implementing a session to catch bugs before committing.
model: claude-sonnet-4-6
memory: project
---
```

Body checklist sections (adapt the petstore agent body):
1. Combat correctness — orb shuffle uses run-seeded PRNG; distractors unique; mastery box update bounds
2. Game loop correctness — single RAF, dt cap, dt-driven animations
3. Touch input — Pointer Events, `touch-action: none`, ≥96px orbs, ≥72px numpad
4. Timer/async safety — every manager's full timer lifecycle pattern
5. State machine correctness — clean transitions, pause halts speech + animations
6. Combat purity — no DOM/canvas in `combat/` modules
7. Save system — `_defaults()` completeness, batch writes, schema migration
8. Mastery engine — Leitner box update bounds, stretch-fact gate, recency damping
9. Audio — lazy AudioContext, `cancel()` + 50ms delay for speech, no harsh sounds
10. ARIA — explicit `aria-hidden`, `aria-pressed` only on toggles, `role="group"` for button grids, dynamic `aria-label` follows `textContent`
11. Performance — no per-frame `SaveManager.load()`, no per-frame allocs in `update`/`draw`
12. Accessibility — OpenDyslexic + Comic Sans, 16pt min, cream/`#2C2416` palette, ≥4.5:1 contrast, ≥44px targets
13. Edge cases — corrupt save, 0 mastery, 100% mastery, rapid-tap, Web Speech absent, AudioContext blocked

### 16. `.github/scripts/update-index.js` modification

Add to `manualGameConfig`:
```js
"claudes-math-marauder": {
  icon: "🤖⚔️📐",
  title: "Claude's Math Marauder",
  description: "Claude built this fantasy roguelike where you cast multiplication and division spells to defeat goblins, dragons, and liches.",
  category: "learning",
},
```

Run `node .github/scripts/update-index.js` to verify the index regenerates without error and confirm the card appears in `index.html`.

### 17. `.claude/settings.json` modification

Add the new hook to `hooks.PostToolUse[0].hooks` array (alongside the existing four hooks):
```json
{ "type": "command", "command": "bash .claude/hooks/validate-marauder-data-hook.sh" }
```

## Tests to run

```bash
node claudes-math-marauder/scripts/test-save-migration.js     # all PASS
node claudes-math-marauder/scripts/validate-data.js           # OK (stub)
node .github/scripts/update-index.js                          # regenerates index.html
```

Then open `index.html` in a browser. Verify:
- Title screen renders with cream background, dark text, OpenDyslexic font
- "Begin" button click transitions to HUB (a placeholder screen — empty for now)
- No console errors

## Acceptance checklist

- [ ] `index.html` registered in `update-index.js` and visible on the regenerated repo index page
- [ ] `js/save.js` UMD-exports SaveManager so both browser and Node `require()` work
- [ ] `_defaults()` returns every key listed in plan.md's save schema (10 mastery + 10 settings keys + all top-level keys)
- [ ] `node scripts/test-save-migration.js` reports zero failures (5+ tests pass)
- [ ] `Game.init()` boots the RAF loop; pause halts updates (set `state = PAUSED` and confirm `_update` not called)
- [ ] DPR scaling correctly applied (resize window, no blur)
- [ ] `.claude/rules/marauder.md` is path-scoped via frontmatter and auto-loads when editing files under `claudes-math-marauder/`
- [ ] `/marauder-checklist` skill prints expected output
- [ ] `/validate-marauder-data` skill runs the validator script
- [ ] PostToolUse hook entry added to `.claude/settings.json` and the hook is `chmod +x`
- [ ] `marauder-web-review` agent definition exists at the expected path
- [ ] No `style.display` assignments in JS (visibility uses classes)
- [ ] No `user-scalable=no` in viewport meta
- [ ] Initial commit includes all of the above

## Session end

1. `node claudes-math-marauder/scripts/test-save-migration.js` — must PASS
2. `node .github/scripts/update-index.js` — index regenerates without error
3. Run `marauder-web-review` agent against the session's diff
4. Commit with message `Session 1: scaffold claudes-math-marauder + tooling`
5. Push to `main`
