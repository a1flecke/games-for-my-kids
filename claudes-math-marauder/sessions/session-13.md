# Session 13 — Replay Harness, Dev Menu, Fuzzer
**Model:** Sonnet | **Focus:** Tools that let us verify the game holds up under load — record/replay seeded runs, a dev menu to jump anywhere, and a fuzzer that hammers combat for hours.

By the end of this session, we can prove no `Math.random()` slipped in (replays are bit-identical), and we have a fuzzer that catches edge cases before kid playtest.

## Pre-flight

1. Read spec section 8 (Testing & QA) and 9.13 (Session 13 in the breakdown).
2. Review `combat/problemGen.js` and `combat/distractors.js` — confirm both take `rng` as injected dependency (no module-level random).
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/util/recorder.js` — Run recorder (logs every input event with timestamps)
- `claudes-math-marauder/js/util/replayer.js` — Run replayer (replays a recorded run from a seed + input log)
- `claudes-math-marauder/js/dev/devMenu.js` — In-game dev menu (toggle with `?dev=1` URL param)
- `claudes-math-marauder/scripts/fuzz-combat.js` — Headless fuzzer (Node-only; runs 10k fights with random inputs, asserts no crashes)
- `claudes-math-marauder/scripts/fuzz-mapgen.js` — Map-gen fuzzer (1000 seeds, all reachable, no crashes)
- `claudes-math-marauder/scripts/replay-determinism.js` — Replay determinism test (record run → replay → compare every state)

## Files to modify

- `claudes-math-marauder/js/game.js` — wire dev menu, expose `_recorder` and `_replayer` to `window` when `?dev=1`
- `claudes-math-marauder/js/save.js` — add export/import save methods (for dev menu "load save from JSON")

## Deliverables

### 1. `util/recorder.js` — Deterministic Recording

```js
class Recorder {
  constructor() {
    this._events = [];
    this._startedAt = null;
    this._seed = null;
    this._meta = null;
    this._active = false;
  }

  start({ seed, meta }) {
    this._events = [];
    this._startedAt = performance.now();
    this._seed = seed;
    this._meta = meta;
    this._active = true;
  }

  log(kind, payload) {
    if (!this._active) return;
    this._events.push({
      t: Math.round(performance.now() - this._startedAt),
      kind,                              // 'orb_tap', 'numpad_digit', 'numpad_commit', 'pause', 'resume', 'map_node_select'
      payload                            // serializable
    });
  }

  stop() { this._active = false; }

  export() {
    return {
      version: 1,
      seed: this._seed,
      meta: this._meta,
      events: [...this._events],
      duration: performance.now() - this._startedAt
    };
  }

  exportAsJson() { return JSON.stringify(this.export()); }
}
```

What to log:
- Every orb tap: `{ kind: 'orb_tap', payload: { value: 12, position: 'top_left' } }`
- Every numpad digit / commit / cancel
- Every map node selection
- Every pause / resume
- Every settings change (font size, voice rate)
- Every "abandon run"

What NOT to log:
- Frame-by-frame anim state (too much; replay reconstructs it)
- Mouse-move events (irrelevant)
- Scroll events (game has none)

### 2. `util/replayer.js` — Replay from Recording

```js
class Replayer {
  constructor({ game, recorder }) {
    this._game = game;
    this._recorder = recorder;
    this._currentLog = null;
    this._eventIdx = 0;
    this._timer = null;
  }

  replay(log) {
    this._currentLog = log;
    this._eventIdx = 0;
    // Re-seed the game's RNG
    this._game._rng = mulberry32(log.seed);
    // Reset save to log.meta state
    this._game._save.import(log.meta);
    // Start playback: each event scheduled at log.events[i].t
    this._tick();
  }

  _tick() {
    if (this._eventIdx >= this._currentLog.events.length) {
      this._game.dispatchEvent(new CustomEvent('replay-complete'));
      return;
    }
    const ev = this._currentLog.events[this._eventIdx];
    const now = performance.now() - this._startedAt;
    const wait = Math.max(0, ev.t - now);
    this._timer = setTimeout(() => {
      this._dispatchEvent(ev);
      this._eventIdx++;
      this._tick();
    }, wait);
  }

  _dispatchEvent(ev) {
    switch (ev.kind) {
      case 'orb_tap': this._game._fight.selectOrb(ev.payload.value); break;
      case 'numpad_digit': this._game._ultimate._onDigit(ev.payload.digit); break;
      // ... all event kinds
    }
  }

  cancel() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._currentLog = null;
  }
}
```

### 3. `dev/devMenu.js` — In-Game Dev Menu

Toggled by `?dev=1` URL param. Adds a fixed-position button bottom-right of the screen; tapping opens a modal with:

- **Seed override**: input field; "Apply" button creates a new run with that seed
- **Jump to**: dropdowns to jump to (1) any realm, (2) any boss, (3) any story chapter, (4) shop test, (5) ultimate test, (6) drill mini-fight test
- **Mastery override**: "Set all facts mastered" / "Reset mastery" / "Set 50% mastered (random)"
- **Gold/spell override**: "+1000 gold" / "Unlock all spells" / "Equip random deck"
- **Replay controls**:
  - "Start recording" → enables `Recorder`
  - "Stop & download" → exports the recording as a `.json` file
  - "Upload replay" → file picker that accepts a `.json` log → calls `replayer.replay(log)`
- **Save controls**:
  - "Export save (clipboard)" → copies `JSON.stringify(save.load())` to clipboard
  - "Import save (paste)" → modal with textarea → parses and imports
  - "Reset save" → confirms, then clears save and reloads
- **Toggles**:
  - "Force reduced motion" (toggles `body[data-reduced-motion]`)
  - "Force big-font" (forces 24px root font-size)
  - "Show hitboxes" (renders orb hitboxes in red overlay)
  - "Verbose logging" (enables `console.log` traces in combat)

Implementation: pure DOM modal. `role="dialog" aria-modal="true" aria-label="Dev menu"`. Native `<button>` and `<select>` elements. Standard timer-lifecycle pattern.

Dev menu is **never accessible without the `?dev=1` query param** — there's no UI surface to it from normal play. Don't even create the DOM elements unless the param is present.

### 4. `scripts/fuzz-combat.js` — Headless Combat Fuzzer

Node-only script. Reuses the UMD-exported combat modules.

```js
const { selectProblem } = require('../js/combat/problemGen.js');
const { generateDistractors } = require('../js/combat/distractors.js');
const { recordResolve, isMastered } = require('../js/combat/mastery.js');
const { mulberry32 } = require('../js/util/rng.js');

function fuzzOneFight(seed) {
  const rng = mulberry32(seed);
  const masteryMap = {};
  const realm = require('../data/realms.json').realms[0];
  const recentKeys = [];
  const fakeAnswers = [true, false, true, true, false, true, true]; // simulated

  for (let problemIdx = 0; problemIdx < 50; problemIdx++) {
    const problem = selectProblem({ realm, masteryMap, recentKeys, rng, mulRatio: 0.7, allowStretch: true, realmTier: 1 });
    if (!problem) throw new Error(`Seed ${seed}, problem ${problemIdx}: selectProblem returned null`);
    if (typeof problem.answer !== 'number') throw new Error(`Bad answer type at seed ${seed}, problem ${problemIdx}`);
    if (problem.answer < 0 || problem.answer > 144) throw new Error(`Answer out of bounds at seed ${seed}, problem ${problemIdx}: ${problem.answer}`);

    const orbs = generateDistractors(problem, rng);
    if (orbs.length !== 4) throw new Error(`Expected 4 orbs, got ${orbs.length}`);
    if (!orbs.includes(problem.answer)) throw new Error(`Correct answer not among orbs`);
    if (new Set(orbs).size !== orbs.length) throw new Error(`Duplicate orbs`);

    const correct = fakeAnswers[problemIdx % fakeAnswers.length];
    recordResolve(masteryMap, problem.factKey, { correct, timeMs: 2000, now: Date.now(), masteredAvgMs: 2500 });
    recentKeys.push(problem.factKey);
    if (recentKeys.length > 5) recentKeys.shift();
  }
}

const FUZZ_RUNS = 10000;
let failures = 0;
for (let seed = 1; seed <= FUZZ_RUNS; seed++) {
  try { fuzzOneFight(seed); }
  catch (err) { failures++; console.error(`SEED ${seed}: ${err.message}`); }
}
console.log(`${FUZZ_RUNS} fights run; ${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);
```

Run with: `node claudes-math-marauder/scripts/fuzz-combat.js`. CI-eligible (exits non-zero on failure).

### 5. `scripts/fuzz-mapgen.js` — Map-Gen Fuzzer

```js
const { generateMap } = require('../js/run/mapGen.js');
const realms = require('../data/realms.json').realms;

const FUZZ_RUNS = 1000;
let failures = 0;
for (const realm of realms) {
  for (let seed = 1; seed <= FUZZ_RUNS; seed++) {
    try {
      const map = generateMap({ realm, seed });
      // Assert exactly one start node
      const starts = map.nodes.filter(n => n.kind === 'start');
      if (starts.length !== 1) throw new Error(`Realm ${realm.id} seed ${seed}: ${starts.length} start nodes`);
      // Assert exactly one boss node
      const bosses = map.nodes.filter(n => n.kind === 'boss');
      if (bosses.length !== 1) throw new Error(`Realm ${realm.id} seed ${seed}: ${bosses.length} boss nodes`);
      // BFS from start
      const visited = bfsReachable(map);
      if (visited.size !== map.nodes.length) throw new Error(`Realm ${realm.id} seed ${seed}: ${map.nodes.length - visited.size} unreachable nodes`);
      // Boss reachable from every node (forward graph)
      for (const node of map.nodes) {
        if (!canReachBoss(map, node.id)) throw new Error(`Realm ${realm.id} seed ${seed}: ${node.id} cannot reach boss`);
      }
    } catch (err) { failures++; console.error(err.message); }
  }
}
console.log(`${realms.length * FUZZ_RUNS} maps run; ${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);
```

### 6. `scripts/replay-determinism.js` — Determinism Test

This is the canary that proves we have no hidden non-determinism (no rogue `Math.random()`, no `Date.now()` in pure code, no DOM-state-dependent logic).

```js
// 1. Record a 50-problem fight with a fixed seed and a fixed input sequence
// 2. Re-run the same fight: same seed, same input sequence
// 3. Assert every problem's factKey, displayText, and answer are identical
// 4. Assert every distractor set is identical
// 5. Assert mastery state at the end is bit-identical

const { selectProblem } = require('../js/combat/problemGen.js');
const { generateDistractors } = require('../js/combat/distractors.js');
const { mulberry32 } = require('../js/util/rng.js');
const realms = require('../data/realms.json').realms;
const realm = realms[0];

function runWithSeed(seed) {
  const rng = mulberry32(seed);
  const masteryMap = {};
  const recentKeys = [];
  const trace = [];
  const inputs = ['correct', 'wrong', 'correct', 'correct', 'wrong']; // fixed input sequence

  for (let i = 0; i < 50; i++) {
    const problem = selectProblem({ realm, masteryMap, recentKeys, rng, mulRatio: 0.7, allowStretch: true, realmTier: 1 });
    const orbs = generateDistractors(problem, rng);
    trace.push({ key: problem.factKey, ans: problem.answer, orbs: [...orbs] });
    const correct = inputs[i % inputs.length] === 'correct';
    require('../js/combat/mastery.js').recordResolve(masteryMap, problem.factKey, { correct, timeMs: 2000, now: 1000000 + i, masteredAvgMs: 2500 });
    recentKeys.push(problem.factKey);
    if (recentKeys.length > 5) recentKeys.shift();
  }
  return { trace, masteryMap };
}

const a = runWithSeed(42);
const b = runWithSeed(42);
if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('NON-DETERMINISTIC'); process.exit(1); }
console.log('DETERMINISTIC ✓');
```

### 7. `save.js` extensions

```js
class SaveManager {
  // ... existing methods ...
  export() { return { ...this._cache }; }
  import(snapshot) { this._cache = JSON.parse(JSON.stringify(snapshot)); this.save(this._cache); }
}
```

### 8. CI integration

Add the fuzz scripts to a top-level test runner script:

```bash
# claudes-math-marauder/scripts/test-all.sh
#!/usr/bin/env bash
set -e
node scripts/test-fact-keys.js
node scripts/test-mastery.js
node scripts/test-problem-gen.js
node scripts/test-distractors.js
node scripts/test-save-migration.js
node scripts/test-map-gen.js
node scripts/replay-determinism.js
node scripts/fuzz-combat.js
node scripts/fuzz-mapgen.js
node scripts/validate-data.js
echo "All tests passed."
```

The `/validate-marauder-data` skill runs this entire script.

## Tests to run

Automated:
- [ ] `node scripts/fuzz-combat.js` → 10000 fights, 0 failures
- [ ] `node scripts/fuzz-mapgen.js` → 5000 maps (5 realms × 1000 seeds), 0 failures
- [ ] `node scripts/replay-determinism.js` → "DETERMINISTIC ✓"
- [ ] `bash scripts/test-all.sh` → exit 0

Manual:
- [ ] `?dev=1` → dev menu button appears bottom-right
- [ ] Dev menu: "Jump to Realm 3 boss" → boss fight launches
- [ ] Dev menu: "Set all facts mastered" → codex shows all green
- [ ] Dev menu: "Start recording" → play 1 fight → "Stop & download" → JSON file downloads
- [ ] Dev menu: "Upload replay" → pick the downloaded file → replay plays back accurately
- [ ] Dev menu: "Export save (clipboard)" → paste into "Import save" → save round-trips identically
- [ ] Dev menu: "Force reduced motion" → all transitions instant
- [ ] Dev menu invisible without `?dev=1` (DOM not even created)

Edge cases:
- [ ] Replay a recorded run after migrating save schema (recorder logs `meta.version`; if mismatch, replay refuses with clear error)
- [ ] Fuzzer with empty mastery map (start-of-game) — never crashes
- [ ] Fuzzer with all-mastered map — stretch facts kick in correctly

## Acceptance checklist

- [ ] All fuzz scripts exit 0 in CI
- [ ] Replay-determinism test passes (no `Math.random()`, no `Date.now()` in pure code)
- [ ] Dev menu DOM only created with `?dev=1` (no leakage to normal players)
- [ ] Recorder/replayer are pure (no DOM dependencies in core logic — only event dispatch touches DOM)
- [ ] All Layer-1 tests still pass

## Session end

1. Run `bash scripts/test-all.sh`
2. Manual: record a full Realm 1 run, replay it, confirm deterministic
3. Run `marauder-web-review` agent
4. Commit `Session 13: dev tools — recorder, replayer, dev menu, combat & map-gen fuzzers`
5. Push to `main`
