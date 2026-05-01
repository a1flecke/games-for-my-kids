# Math Marauder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `math-marauder/`, a standalone multiplication and clean-division monster battle game for 0-12 facts and products from 0-144.

**Architecture:** Use a self-contained vanilla HTML/CSS/JS game. Keep arithmetic, progression, save, content, audio, speech, rendering, UI, and orchestration in separate files under `math-marauder/`. Use DOM buttons for answers and accessibility, with a single canvas for animated combat.

**Tech Stack:** Plain HTML5, CSS3, ES6 JavaScript, Canvas 2D, Web Audio, Web Speech API, LocalStorage, Node built-in `assert` for tests, no npm dependencies.

---

## File Structure

- Create: `math-marauder/index.html`
- Create: `math-marauder/css/style.css`
- Create: `math-marauder/js/constants.js`
- Create: `math-marauder/js/content.js`
- Create: `math-marauder/js/problem-engine.js`
- Create: `math-marauder/js/progression.js`
- Create: `math-marauder/js/save.js`
- Create: `math-marauder/js/audio.js`
- Create: `math-marauder/js/speech.js`
- Create: `math-marauder/js/renderer.js`
- Create: `math-marauder/js/ui.js`
- Create: `math-marauder/js/game.js`
- Create: `math-marauder/scripts/run-tests.js`
- Create: `math-marauder/tests/problem-engine.test.js`
- Create: `math-marauder/tests/progression.test.js`
- Create: `math-marauder/tests/save.test.js`
- Create: `math-marauder/tests/content.test.js`
- Create: `math-marauder/tests/accessibility-static.test.js`
- Modify: `.github/scripts/update-index.js`
- Modify after generator run: `index.html`

## Cross-Cutting Rules

- Use `window.MathMarauder` as the browser namespace.
- Each JS file uses a small UMD-style export so Node tests can `require()` pure modules without a bundler.
- Keep all visibility toggles class-based: `.active`, `.open`, `.hidden`.
- Do not use `style.display`.
- Do not create `AudioContext` in a constructor.
- `game.js` owns the only `requestAnimationFrame` loop.
- Dialogue and tutorial lines must have both `caption` and `voiceText`.
- Use exact LocalStorage key `math-marauder-save`.
- Run `eval "$(mise activate bash)"` before Node commands in a new shell.

## Verification Commands

Run these from the repository root:

```bash
eval "$(mise activate bash)"
```

```bash
node math-marauder/scripts/run-tests.js
```

```bash
node .github/scripts/update-index.js
```

```bash
git diff --check
```

## Task 1: Test Harness

**Files:**
- Create: `math-marauder/scripts/run-tests.js`
- Create directory: `math-marauder/tests/`

- [ ] **Step 1: Create the test runner**

Create `math-marauder/scripts/run-tests.js`:

```js
#!/usr/bin/env node

const path = require('path');

const tests = [
    '../tests/problem-engine.test.js',
    '../tests/progression.test.js',
    '../tests/save.test.js',
    '../tests/content.test.js',
    '../tests/accessibility-static.test.js'
];

let passed = 0;

for (const rel of tests) {
    const file = path.join(__dirname, rel);
    require(file);
    passed += 1;
    console.log(`PASS ${rel}`);
}

console.log(`All Math Marauder tests passed: ${passed}/${tests.length}`);
```

- [ ] **Step 2: Run the empty suite to confirm the missing tests fail**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: FAIL with a module-not-found error for `problem-engine.test.js`.

- [ ] **Step 3: Commit the harness after test files exist in later tasks**

Commit command to use after Task 6 creates the first passing full suite:

```bash
git add math-marauder/scripts/run-tests.js math-marauder/tests
git commit -m "test: add math marauder test harness"
```

## Task 2: Problem Engine

**Files:**
- Create: `math-marauder/js/problem-engine.js`
- Create: `math-marauder/tests/problem-engine.test.js`

- [ ] **Step 1: Write the arithmetic tests**

Create `math-marauder/tests/problem-engine.test.js`:

```js
const assert = require('assert');
const ProblemEngine = require('../js/problem-engine.js');

function makeEngine(seed) {
    return new ProblemEngine({ seed: seed || 12345 });
}

{
    const engine = makeEngine();
    for (let i = 0; i < 500; i += 1) {
        const problem = engine.generate({ operations: ['multiply'], band: 'deep' });
        assert.strictEqual(problem.operation, 'multiply');
        assert.ok(problem.a >= 0 && problem.a <= 12);
        assert.ok(problem.b >= 0 && problem.b <= 12);
        assert.strictEqual(problem.correct, problem.a * problem.b);
        assert.ok(problem.correct >= 0 && problem.correct <= 144);
    }
}

{
    const engine = makeEngine();
    for (let i = 0; i < 500; i += 1) {
        const problem = engine.generate({ operations: ['divide'], band: 'deep' });
        assert.strictEqual(problem.operation, 'divide');
        assert.ok(problem.divisor >= 1 && problem.divisor <= 12);
        assert.ok(problem.quotient >= 0 && problem.quotient <= 12);
        assert.strictEqual(problem.dividend, problem.divisor * problem.quotient);
        assert.strictEqual(problem.correct, problem.quotient);
        assert.strictEqual(problem.dividend % problem.divisor, 0);
    }
}

{
    const engine = makeEngine();
    for (let i = 0; i < 250; i += 1) {
        const problem = engine.generate({ operations: ['multiply', 'divide'], band: 'deep' });
        assert.strictEqual(problem.choices.length, 4);
        assert.strictEqual(new Set(problem.choices).size, 4);
        assert.ok(problem.choices.includes(problem.correct));
        assert.ok(problem.choices.every((choice) => Number.isInteger(choice)));
        assert.ok(problem.choices.every((choice) => choice >= 0));
    }
}

{
    const engine = makeEngine();
    const seen = [];
    for (let i = 0; i < 30; i += 1) {
        const problem = engine.generate({ operations: ['multiply'], band: 'warm' });
        const key = problem.promptKey;
        assert.ok(!seen.slice(-6).includes(key), `prompt repeated too soon: ${key}`);
        seen.push(key);
    }
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node math-marauder/tests/problem-engine.test.js
```

Expected: FAIL with `Cannot find module '../js/problem-engine.js'`.

- [ ] **Step 3: Implement the problem engine**

Create `math-marauder/js/problem-engine.js`:

```js
(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.ProblemEngine = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildProblemEngine() {
    const FACTORS = Array.from({ length: 13 }, (_, i) => i);
    const HISTORY_LIMIT = 6;

    class Random {
        constructor(seed) {
            this._seed = seed || 12345;
        }

        next() {
            this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
            return this._seed / 4294967296;
        }

        int(maxExclusive) {
            return Math.floor(this.next() * maxExclusive);
        }

        pick(items) {
            return items[this.int(items.length)];
        }
    }

    class ProblemEngine {
        constructor(options) {
            const opts = options || {};
            this._rng = new Random(opts.seed || Date.now());
            this._history = [];
        }

        generate(options) {
            const opts = options || {};
            const operations = opts.operations && opts.operations.length ? opts.operations : ['multiply', 'divide'];
            for (let attempt = 0; attempt < 40; attempt += 1) {
                const operation = this._rng.pick(operations);
                const problem = operation === 'divide' ? this._division(opts.band) : this._multiplication(opts.band);
                if (!this._history.includes(problem.promptKey)) {
                    this._remember(problem.promptKey);
                    return this._withChoices(problem);
                }
            }
            const fallback = this._multiplication(opts.band);
            this._remember(fallback.promptKey);
            return this._withChoices(fallback);
        }

        _multiplication(band) {
            const factors = this._factorsForBand(band);
            const a = this._rng.pick(factors);
            const b = this._rng.pick(factors);
            return {
                operation: 'multiply',
                a,
                b,
                correct: a * b,
                prompt: `${a} x ${b}`,
                voiceText: `${a} times ${b}`,
                factKey: `mul:${Math.min(a, b)}:${Math.max(a, b)}`,
                promptKey: `mul:${a}:${b}`
            };
        }

        _division(band) {
            const factors = this._factorsForBand(band).filter((n) => n > 0);
            const divisor = this._rng.pick(factors);
            const quotient = this._rng.pick(this._factorsForBand(band));
            const dividend = divisor * quotient;
            return {
                operation: 'divide',
                dividend,
                divisor,
                quotient,
                correct: quotient,
                prompt: `${dividend} / ${divisor}`,
                voiceText: `${dividend} divided by ${divisor}`,
                factKey: `div:${dividend}:${divisor}`,
                promptKey: `div:${dividend}:${divisor}`
            };
        }

        _factorsForBand(band) {
            if (band === 'warm') return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            return FACTORS;
        }

        _withChoices(problem) {
            const choices = new Set([problem.correct]);
            const near = [-24, -12, -10, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 10, 12, 24];
            for (const delta of near) {
                if (choices.size >= 4) break;
                const value = problem.correct + delta;
                if (value >= 0 && Number.isInteger(value)) choices.add(value);
            }
            while (choices.size < 4) {
                const value = problem.operation === 'divide' ? this._rng.int(13) : this._rng.int(145);
                choices.add(value);
            }
            const shuffled = Array.from(choices);
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = this._rng.int(i + 1);
                const tmp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = tmp;
            }
            return Object.assign({}, problem, { choices: shuffled });
        }

        _remember(key) {
            this._history.push(key);
            if (this._history.length > HISTORY_LIMIT) this._history.shift();
        }
    }

    return ProblemEngine;
});
```

- [ ] **Step 4: Run the problem-engine test**

Run:

```bash
node math-marauder/tests/problem-engine.test.js
```

Expected: PASS with no output.

- [ ] **Step 5: Run the suite**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: FAIL because the remaining planned test files do not exist yet.

- [ ] **Step 6: Commit**

```bash
git add math-marauder/js/problem-engine.js math-marauder/tests/problem-engine.test.js
git commit -m "feat: add math marauder problem engine"
```

## Task 3: Progression And Scoring

**Files:**
- Create: `math-marauder/js/progression.js`
- Create: `math-marauder/tests/progression.test.js`

- [ ] **Step 1: Write progression tests**

Create `math-marauder/tests/progression.test.js`:

```js
const assert = require('assert');
const Progression = require('../js/progression.js');

{
    const progression = new Progression();
    const before = progression.getMastery('mul:7:8');
    progression.recordAnswer({ factKey: 'mul:7:8', correct: true, firstTry: true });
    assert.ok(progression.getMastery('mul:7:8') > before);
}

{
    const progression = new Progression();
    progression.recordAnswer({ factKey: 'div:56:7', correct: false, firstTry: false });
    assert.ok(progression.getMastery('div:56:7') < 0);
    assert.ok(progression.getWeakFacts().includes('div:56:7'));
}

{
    const progression = new Progression();
    const threeStars = progression.scoreRaid({ total: 30, correctFirstTry: 28, hearts: 3, longestStreak: 12 });
    const oneStar = progression.scoreRaid({ total: 30, correctFirstTry: 18, hearts: 1, longestStreak: 4 });
    assert.strictEqual(threeStars.stars, 3);
    assert.strictEqual(oneStar.stars, 1);
}
```

- [ ] **Step 2: Run the progression test and verify it fails**

Run:

```bash
node math-marauder/tests/progression.test.js
```

Expected: FAIL with `Cannot find module '../js/progression.js'`.

- [ ] **Step 3: Implement progression**

Create `math-marauder/js/progression.js`:

```js
(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Progression = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildProgression() {
    class Progression {
        constructor(saved) {
            this._mastery = Object.assign({}, saved && saved.factMastery);
            this._weakFacts = Array.isArray(saved && saved.weakFactQueue) ? saved.weakFactQueue.slice() : [];
        }

        getMastery(key) {
            return this._mastery[key] || 0;
        }

        getWeakFacts() {
            return this._weakFacts.slice();
        }

        recordAnswer(result) {
            const key = result.factKey;
            const current = this.getMastery(key);
            let next = current;
            if (result.correct && result.firstTry) next += 2;
            else if (result.correct) next += 1;
            else next -= 2;
            this._mastery[key] = Math.max(-10, Math.min(10, next));
            if (!result.correct && !this._weakFacts.includes(key)) this._weakFacts.unshift(key);
            if (result.correct && this._mastery[key] >= 4) {
                this._weakFacts = this._weakFacts.filter((item) => item !== key);
            }
            this._weakFacts = this._weakFacts.slice(0, 24);
        }

        scoreRaid(stats) {
            const total = Math.max(1, stats.total);
            const accuracy = stats.correctFirstTry / total;
            let stars = 1;
            if (accuracy >= 0.85 && stats.hearts >= 2) stars = 3;
            else if (accuracy >= 0.7 || stats.hearts >= 2) stars = 2;
            return {
                stars,
                accuracy,
                coins: Math.round(40 + accuracy * 80 + stats.longestStreak * 3)
            };
        }

        toJSON() {
            return {
                factMastery: Object.assign({}, this._mastery),
                weakFactQueue: this._weakFacts.slice()
            };
        }
    }

    return Progression;
});
```

- [ ] **Step 4: Run the progression test**

Run:

```bash
node math-marauder/tests/progression.test.js
```

Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add math-marauder/js/progression.js math-marauder/tests/progression.test.js
git commit -m "feat: add math marauder progression model"
```

## Task 4: Save Manager

**Files:**
- Create: `math-marauder/js/save.js`
- Create: `math-marauder/tests/save.test.js`

- [ ] **Step 1: Write save tests**

Create `math-marauder/tests/save.test.js`:

```js
const assert = require('assert');
const SaveManager = require('../js/save.js');

function storage() {
    const data = {};
    return {
        getItem: (key) => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
        setItem: (key, value) => { data[key] = String(value); },
        removeItem: (key) => { delete data[key]; }
    };
}

{
    const manager = new SaveManager(storage());
    const defaults = manager.defaults();
    assert.strictEqual(defaults.version, 1);
    assert.deepStrictEqual(defaults.unlockedBiomes, ['ember-library']);
    assert.deepStrictEqual(defaults.unlockedSpells, ['starbolt']);
    assert.strictEqual(defaults.settings.speech, true);
    assert.strictEqual(defaults.settings.music, false);
    assert.ok(defaults.stats);
}

{
    const fake = storage();
    fake.setItem('math-marauder-save', '{bad json');
    const manager = new SaveManager(fake);
    const loaded = manager.load();
    assert.strictEqual(loaded.version, 1);
    assert.strictEqual(loaded.raidsCompleted, 0);
}

{
    const fake = storage();
    const manager = new SaveManager(fake);
    const save = manager.defaults();
    save.raidsCompleted = 2;
    save.factMastery['mul:7:8'] = 4;
    manager.save(save);
    const loaded = manager.load();
    assert.strictEqual(loaded.raidsCompleted, 2);
    assert.strictEqual(loaded.factMastery['mul:7:8'], 4);
}
```

- [ ] **Step 2: Run the save test and verify it fails**

Run:

```bash
node math-marauder/tests/save.test.js
```

Expected: FAIL with `Cannot find module '../js/save.js'`.

- [ ] **Step 3: Implement save manager**

Create `math-marauder/js/save.js` using the default object from the design spec, a `load()` method that merges stored data onto defaults, a `save(data)` method that writes JSON, and a `reset()` method that removes the key.

The file must export a `SaveManager` class and attach it to `window.MathMarauder.SaveManager`.

- [ ] **Step 4: Run the save test**

Run:

```bash
node math-marauder/tests/save.test.js
```

Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add math-marauder/js/save.js math-marauder/tests/save.test.js
git commit -m "feat: add math marauder save manager"
```

## Task 5: Content Data

**Files:**
- Create: `math-marauder/js/content.js`
- Create: `math-marauder/tests/content.test.js`

- [ ] **Step 1: Write content tests**

Create `math-marauder/tests/content.test.js`:

```js
const assert = require('assert');
const content = require('../js/content.js');

assert.ok(content.biomes.length >= 6);
assert.ok(content.monsters.length >= 8);
assert.ok(content.spells.length >= 4);

for (const biome of content.biomes) {
    assert.ok(biome.id);
    assert.ok(biome.name);
    assert.ok(biome.palette);
}

for (const monster of content.monsters) {
    assert.ok(monster.id);
    assert.ok(monster.name);
    assert.ok(monster.mathFocus);
    assert.ok(monster.trait);
}

for (const line of content.dialogue) {
    assert.ok(line.id);
    assert.ok(line.speaker);
    assert.ok(line.caption);
    assert.ok(line.voiceText);
    assert.ok(line.caption.length <= 120, `caption too long: ${line.id}`);
    assert.ok(line.voiceText.length <= 180, `voice text too long: ${line.id}`);
}
```

- [ ] **Step 2: Run the content test and verify it fails**

Run:

```bash
node math-marauder/tests/content.test.js
```

Expected: FAIL with `Cannot find module '../js/content.js'`.

- [ ] **Step 3: Implement content data**

Create `math-marauder/js/content.js` with:

- 6 biomes from the design spec.
- 8 monster definitions from the design spec.
- 4 spells from the design spec.
- At least 10 dialogue lines covering title intro, first room, wrong answer hint, first division encounter, mini-boss, boss intro, victory, settings speech prompt, reduced-motion explanation, and Practice Forge unlock.

Use this export shape:

```js
(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Content = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildContent() {
    return {
        biomes: [],
        monsters: [],
        spells: [],
        dialogue: []
    };
});
```

Replace the empty arrays with complete data before running the tests.

- [ ] **Step 4: Run the content test**

Run:

```bash
node math-marauder/tests/content.test.js
```

Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add math-marauder/js/content.js math-marauder/tests/content.test.js
git commit -m "feat: add math marauder content data"
```

## Task 6: Static Page And Accessibility Tests

**Files:**
- Create: `math-marauder/index.html`
- Create: `math-marauder/css/style.css`
- Create: `math-marauder/js/constants.js`
- Create: `math-marauder/tests/accessibility-static.test.js`

- [ ] **Step 1: Write the static accessibility test**

Create `math-marauder/tests/accessibility-static.test.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const jsFiles = fs.readdirSync(path.join(root, 'js'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(root, 'js', name), 'utf8'));
const allSource = [html, css].concat(jsFiles).join('\n');

assert.ok(!/user-scalable\s*=\s*no/i.test(html));
assert.strictEqual((html.match(/opendyslexic/gi) || []).length, 1);
assert.ok(/<canvas[^>]+id="battle-canvas"[^>]+aria-label="Animated monster battle"/.test(html));
assert.ok(/<button[^>]+id="answer-0"/.test(html));
assert.ok(/role="dialog"/.test(html));
assert.ok(/aria-modal="true"/.test(html));
assert.ok(/aria-hidden="true"/.test(html));
assert.ok(!/style\.display/.test(allSource));
assert.ok(!/aria-live="[^"]+"[^>]*aria-hidden=/.test(html));
assert.ok(!/aria-live="[^"]+"[^>]*aria-label=/.test(html));
```

- [ ] **Step 2: Run the static test and verify it fails**

Run:

```bash
node math-marauder/tests/accessibility-static.test.js
```

Expected: FAIL because `index.html` and `css/style.css` do not exist yet.

- [ ] **Step 3: Create the HTML shell**

Create `math-marauder/index.html` with these required parts:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Math Marauder</title>
    <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/opendyslexic" crossorigin="anonymous">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="screen-title" class="screen active" role="main" aria-label="Math Marauder">
        <h1>Math Marauder</h1>
        <p id="title-tagline">Raid monster realms with multiplication and division magic.</p>
        <button id="btn-quick-raid" class="primary-action">Quick Raid</button>
        <button id="btn-standard-raid">Standard Raid</button>
        <button id="btn-settings" aria-expanded="false">Settings</button>
    </div>

    <div id="screen-map" class="screen" aria-label="Raid map"></div>

    <div id="screen-raid" class="screen" aria-label="Monster battle">
        <canvas id="battle-canvas" width="960" height="540" aria-label="Animated monster battle"></canvas>
        <div id="battle-status" role="status" class="sr-only"></div>
        <div id="prompt-panel">
            <div id="math-prompt" aria-label="Math prompt"></div>
            <div id="answer-grid" role="group" aria-label="Choose the correct answer">
                <button id="answer-0" class="answer-button" data-answer-index="0"></button>
                <button id="answer-1" class="answer-button" data-answer-index="1"></button>
                <button id="answer-2" class="answer-button" data-answer-index="2"></button>
                <button id="answer-3" class="answer-button" data-answer-index="3"></button>
            </div>
        </div>
    </div>

    <div id="screen-results" class="screen" aria-label="Raid results"></div>

    <div id="dialogue-panel" class="dialogue-panel hidden" role="status">
        <p id="dialogue-speaker"></p>
        <p id="dialogue-caption"></p>
        <button id="btn-replay-dialogue">Replay narration</button>
    </div>

    <div id="settings-overlay" class="overlay" role="dialog" aria-modal="true" aria-label="Settings" aria-hidden="true">
        <div class="overlay-panel">
            <button id="btn-close-settings" class="close-button" aria-label="Close settings">x</button>
            <h2>Settings</h2>
            <label><input id="setting-sfx" type="checkbox" checked> Sound effects</label>
            <label><input id="setting-music" type="checkbox"> Music</label>
            <label><input id="setting-speech" type="checkbox" checked> Narration</label>
            <label><input id="setting-reduced-motion" type="checkbox"> Reduced motion</label>
        </div>
    </div>

    <script src="js/constants.js" defer></script>
    <script src="js/content.js" defer></script>
    <script src="js/problem-engine.js" defer></script>
    <script src="js/progression.js" defer></script>
    <script src="js/save.js" defer></script>
    <script src="js/audio.js" defer></script>
    <script src="js/speech.js" defer></script>
    <script src="js/renderer.js" defer></script>
    <script src="js/ui.js" defer></script>
    <script src="js/game.js" defer></script>
</body>
</html>
```

- [ ] **Step 4: Create CSS**

Create `math-marauder/css/style.css` with:

- Root colors that meet contrast on cream.
- `.screen`, `.screen.active`, `.hidden`, `.overlay`, `.overlay.open`.
- 44 px minimum target sizes.
- OpenDyslexic and Comic Sans font stack.
- Responsive answer grid.
- Reduced-motion media query.

- [ ] **Step 5: Create constants**

Create `math-marauder/js/constants.js`:

```js
(function attach(root) {
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Constants = {
        STORAGE_KEY: 'math-marauder-save',
        STATES: {
            TITLE: 'TITLE',
            MAP: 'MAP',
            DIALOGUE: 'DIALOGUE',
            RAID: 'RAID',
            ROOM_REWARD: 'ROOM_REWARD',
            PAUSED: 'PAUSED',
            RESULTS: 'RESULTS',
            SETTINGS: 'SETTINGS'
        },
        FACTOR_MIN: 0,
        FACTOR_MAX: 12,
        PRODUCT_MAX: 144
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

- [ ] **Step 6: Run the static accessibility test**

Run:

```bash
node math-marauder/tests/accessibility-static.test.js
```

Expected: PASS with no output.

- [ ] **Step 7: Run the full suite**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS for the tests created so far.

- [ ] **Step 8: Commit**

```bash
git add math-marauder/index.html math-marauder/css/style.css math-marauder/js/constants.js math-marauder/scripts/run-tests.js math-marauder/tests
git commit -m "feat: add math marauder page shell"
```

## Task 7: Audio And Speech Managers

**Files:**
- Create: `math-marauder/js/audio.js`
- Create: `math-marauder/js/speech.js`
- Modify: `math-marauder/tests/accessibility-static.test.js`

- [ ] **Step 1: Extend static checks**

Add checks to `accessibility-static.test.js` that source contains `speechSynthesis`, `setTimeout`, `AudioContext`, and `ctx.resume().then`.

- [ ] **Step 2: Verify the extended static test fails**

Run:

```bash
node math-marauder/tests/accessibility-static.test.js
```

Expected: FAIL because audio and speech files do not contain the required patterns yet.

- [ ] **Step 3: Implement `audio.js`**

Implement an `AudioManager` class that:

- Has `_ctx`, `_masterGain`, `_volume`, and `_muted` initialized in the constructor.
- Creates AudioContext only inside `_getCtx()`, called from `preWarm()` or a sound method triggered by user input.
- Schedules oscillators only inside `ctx.resume().then(() => { ... })`.
- Provides `playCorrect()`, `playWrong()`, `playHit()`, `playVictory()`, `setMuted()`, and `setVolume()`.

- [ ] **Step 4: Implement `speech.js`**

Implement a `SpeechManager` class that:

- Feature-detects `speechSynthesis`.
- Exposes `speak(text)`, `cancel()`, `setEnabled(enabled)`, and `replayLast()`.
- Calls `speechSynthesis.cancel()` and then schedules `speechSynthesis.speak(utterance)` inside `setTimeout(..., 50)`.
- Stores the last spoken text for replay.

- [ ] **Step 5: Run tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add math-marauder/js/audio.js math-marauder/js/speech.js math-marauder/tests/accessibility-static.test.js
git commit -m "feat: add math marauder audio and speech"
```

## Task 8: Renderer

**Files:**
- Create: `math-marauder/js/renderer.js`
- Modify: `math-marauder/css/style.css`

- [ ] **Step 1: Implement DPR canvas setup**

Create `Renderer` with:

- `constructor(canvas)`
- `resize()`
- `draw(scene)`
- `_drawBackground(scene)`
- `_drawMonster(monster, state)`
- `_drawParticles(particles)`

`resize()` must use `devicePixelRatio`, set canvas buffer size from client size, and keep CSS dimensions stable.

- [ ] **Step 2: Implement procedural art**

Add procedural drawing for the 8 monster IDs from `content.js`. Each monster needs:

- Idle pose.
- Hit flash.
- Defeat dissolve.
- Reduced-motion mode that stops bobbing and large particles.

- [ ] **Step 3: Add renderer smoke path in `game.js` later**

Leave renderer callable as `new MathMarauder.Renderer(canvas)` so Task 10 can wire it into the state machine.

- [ ] **Step 4: Browser-check the canvas**

Open `math-marauder/index.html` directly. Confirm the canvas area is visible, has nonzero dimensions, and does not overlap answer controls at desktop and mobile widths.

- [ ] **Step 5: Commit**

```bash
git add math-marauder/js/renderer.js math-marauder/css/style.css
git commit -m "feat: add math marauder combat renderer"
```

## Task 9: UI Manager And Accessibility Behavior

**Files:**
- Create: `math-marauder/js/ui.js`
- Modify: `math-marauder/index.html`
- Modify: `math-marauder/css/style.css`

### Player Truth Table

| Before | Player action | Immediate visible change |
| --- | --- | --- |
| Title screen active | Click Quick Raid | Title deactivates, raid screen activates, prompt appears. |
| Raid prompt visible | Click answer button | Button shows selected feedback, spell animation starts. |
| Settings closed | Click Settings | Overlay opens, close button receives focus. |
| Settings open | Press Escape | Overlay closes, focus returns to Settings button. |
| Dialogue visible | Click Replay narration | Same caption remains, narration restarts. |

### Misleading UI Risks

- Answer cards must not move in reduced-motion mode.
- A wrong answer must not visually look like progress damage against the monster.
- Locked modes must use disabled native buttons, not only a visual locked class.
- Status text must match visible state after every screen transition.

### Interaction Replay Checklist

- Start quick raid, answer four prompts, open settings, close settings, continue answering.
- Repeat-click the same answer button and confirm only one answer is processed.
- Use keys `1`, `2`, `3`, `4` for answers.
- Reopen settings three times and confirm focus returns correctly each time.
- Toggle reduced motion during a raid and confirm animation intensity changes immediately.

- [ ] **Step 1: Implement class-based screen switching**

`UIManager` should expose:

- `showScreen(screenId)`
- `setPrompt(problem)`
- `setAnswers(choices, onChoose)`
- `showDialogue(line, onClose)`
- `openSettings(settings)`
- `closeSettings()`
- `announce(text)`

All screen changes use `.classList.add('active')` and `.classList.remove('active')`.

- [ ] **Step 2: Implement focus trap**

Settings overlay must:

- Set `aria-hidden="false"` on open.
- Set trigger `aria-expanded="true"` on open.
- Focus `#btn-close-settings` on open.
- Trap Tab and Shift-Tab.
- Close on Escape only when `.open` is present.
- Set `aria-hidden="true"` on close.
- Restore focus to `#btn-settings` on close.

- [ ] **Step 3: Implement answer binding guard**

When a choice is made:

- Disable all answer buttons immediately.
- Call the game callback once.
- Re-enable buttons only when the next prompt is rendered.

- [ ] **Step 4: Browser-check interactions**

Use keyboard and pointer paths for title, settings, answers, and replay narration.

- [ ] **Step 5: Run tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add math-marauder/js/ui.js math-marauder/index.html math-marauder/css/style.css
git commit -m "feat: add math marauder accessible UI"
```

## Task 10: Game State Machine And Combat

**Files:**
- Create: `math-marauder/js/game.js`
- Modify: `math-marauder/js/problem-engine.js`
- Modify: `math-marauder/js/progression.js`

- [ ] **Step 1: Add combat state helpers**

Create pure helper methods in `game.js` or a small internal object:

- `startRaid(mode)`
- `startRoom()`
- `presentProblem()`
- `handleAnswer(choice)`
- `finishRoom()`
- `finishRaid()`
- `tick(timestamp)`

- [ ] **Step 2: Wire managers**

On `DOMContentLoaded`:

```js
window.game = new MathMarauder.Game();
window.game.init();
```

Do not call `game.init()` as an implicit global.

- [ ] **Step 3: Implement single RAF loop**

`Game.init()` starts one RAF loop. `tick()` updates the renderer for `RAID`, `ROOM_REWARD`, and `RESULTS`, and does not create manager-owned RAF loops.

- [ ] **Step 4: Implement combat resolution**

Rules:

- Correct answer on first try damages monster, increments streak, updates mastery as first try.
- Correct answer after a mistake damages monster, resets streak, updates mastery as correct but not first try.
- Wrong answer marks the prompt as attempted, damages shield or heart, updates mastery as wrong.
- Two wrong attempts announce a hint and keep the same prompt.
- Monster defeat advances room.
- Last room defeat calls `finishRaid()`.

- [ ] **Step 5: Implement speech and audio events**

Call:

- `audio.preWarm()` on the first title button click.
- `speech.speak(line.voiceText)` when dialogue opens and speech is enabled.
- `audio.playCorrect()` for correct choices.
- `audio.playWrong()` for wrong choices.
- `audio.playVictory()` on raid completion.

- [ ] **Step 6: Browser-check one quick raid**

Complete a quick raid with at least one correct and one wrong answer. Confirm hearts, monster health, prompt changes, reward screen, save persistence, speech replay, and sound mute.

- [ ] **Step 7: Run tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add math-marauder/js/game.js math-marauder/js/problem-engine.js math-marauder/js/progression.js
git commit -m "feat: add math marauder raid loop"
```

## Task 11: Practice Forge And Unlocks

**Files:**
- Modify: `math-marauder/index.html`
- Modify: `math-marauder/js/game.js`
- Modify: `math-marauder/js/progression.js`
- Modify: `math-marauder/js/save.js`
- Modify: `math-marauder/js/content.js`
- Modify: `math-marauder/tests/progression.test.js`

- [ ] **Step 1: Add tests for unlocks**

Extend `progression.test.js` to verify:

- Practice Forge unlocks after one completed raid.
- Weak fact queue can produce a focused practice config.
- A mastered fact remains eligible at a low weight.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
node math-marauder/tests/progression.test.js
```

Expected: FAIL for missing unlock methods.

- [ ] **Step 3: Implement unlocks**

Add:

- `getUnlockedModes(saveData)`
- `completeRaid(saveData, raidResult)`
- `makePracticeConfig(factKey)`

Practice Forge should target one factor family or inverse pair without repeating the exact same prompt more than necessary.

- [ ] **Step 4: Add Practice Forge UI**

Add a disabled Practice Forge button on title or map. Enable it after one completed raid. Use the native `disabled` attribute while locked.

- [ ] **Step 5: Run tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add math-marauder/index.html math-marauder/js/game.js math-marauder/js/progression.js math-marauder/js/save.js math-marauder/js/content.js math-marauder/tests/progression.test.js
git commit -m "feat: add math marauder practice forge"
```

## Task 12: Index Integration

**Files:**
- Modify: `.github/scripts/update-index.js`
- Modify after generator run: `index.html`

- [ ] **Step 1: Add Math Marauder to category order**

In `.github/scripts/update-index.js`, update `gameCategories.math` to include:

```js
math: ['math-coloring', 'math-coloring-2', 'math-marauder'],
```

- [ ] **Step 2: Add manual game config**

Add:

```js
'math-marauder': {
  icon: 'x/?',
  title: 'Math Marauder',
  description: 'Battle imps, slimes, wizards, and dragons by mastering multiplication and clean division facts from 0 through 12.'
}
```

Use ASCII text for the icon unless the project owner asks for emoji metadata.

- [ ] **Step 3: Regenerate the index**

Run:

```bash
node .github/scripts/update-index.js
```

Expected: root `index.html` changes and includes `math-marauder/`.

- [ ] **Step 4: Run tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/scripts/update-index.js index.html
git commit -m "feat: list math marauder on game index"
```

## Task 13: Full Verification

**Files:**
- All files touched in prior tasks.

- [ ] **Step 1: Run automated tests**

Run:

```bash
node math-marauder/scripts/run-tests.js
```

Expected: `All Math Marauder tests passed: 5/5`.

- [ ] **Step 2: Run index generation**

Run:

```bash
node .github/scripts/update-index.js
```

Expected: command exits 0. If `index.html` changes, inspect and keep the expected Math Marauder card.

- [ ] **Step 3: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 4: Direct-file browser smoke test**

Open:

```text
math-marauder/index.html
```

Verify:

- Title screen appears.
- Quick Raid starts.
- Four answer buttons are visible and large.
- Correct answer damages monster.
- Wrong answer gives neutral feedback and keeps the game playable.
- Settings overlay traps focus and closes with Escape.
- Replay narration button speaks the current line when speech is available.
- Reduced motion removes answer orbit and large particles.

- [ ] **Step 5: Local-server browser smoke test**

Run:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/math-marauder/
```

Repeat the direct-file smoke test.

- [ ] **Step 6: iPad Safari checklist**

Verify on iPad Safari or record as not run:

- Browser zoom works.
- First tap unlocks Web Audio.
- Speech replay works after closing and reopening dialogue.
- Answer buttons remain visible in portrait and landscape.
- No hover-only control is required.
- No visible countdown timer appears by default.

- [ ] **Step 7: Final commit if verification changed files**

If verification changed expected files, commit them:

```bash
git add math-marauder .github/scripts/update-index.js index.html
git commit -m "chore: verify math marauder"
```

## Self-Review Checklist

- The implementation creates a new standalone game directory.
- The arithmetic range matches 0-12 factors and 0-144 products.
- Division is clean and never divides by zero.
- The player defeats monsters by choosing the right answer.
- The design supports short 5-15 minute sessions.
- The game uses fantasy, monsters, wizards, dragons, space battle energy, magic, and graphic-novel style.
- Dialogue has audio narration through Web Speech.
- Animation and sound effects are included.
- ADHD and dyslexia accommodations are explicit.
- Automated tests cover core math generation, progression, saves, content, and static accessibility.
- Browser and iPad Safari checks are listed with concrete expected behavior.
