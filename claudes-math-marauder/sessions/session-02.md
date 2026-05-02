# Session 2 — Math Engine: Problem Generation, Distractors, Mastery
**Model:** Opus | **Focus:** Pure-logic combat layer with full TDD coverage

This session writes every deterministic combat module — fact keys, mastery (Leitner), problem generation, distractor generation — and their Node-runnable tests. **No DOM, no canvas, no audio.** When this session is done, `node scripts/test-*.js` reports zero failures and every Layer-1 test from plan.md is in place.

## Pre-flight

1. Read `plan.md` (mastery engine section).
2. Read `docs/superpowers/specs/2026-05-01-claudes-math-marauder-design.md` sections 3.3, 6.5.
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/combat/factKeys.js`
- `claudes-math-marauder/js/combat/mastery.js`
- `claudes-math-marauder/js/combat/problemGen.js`
- `claudes-math-marauder/js/combat/distractors.js`
- `claudes-math-marauder/scripts/test-fact-keys.js`
- `claudes-math-marauder/scripts/test-mastery.js`
- `claudes-math-marauder/scripts/test-problem-gen.js`
- `claudes-math-marauder/scripts/test-distractors.js`

All combat modules use the same UMD-export pattern as `save.js` so Node tests can `require()` them directly.

## Deliverables

### 1. `combat/factKeys.js` — Canonical key construction

```js
(function(global) {
  'use strict';

  function mulKey(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `mul:${lo}x${hi}`;
  }

  // Division key uses larger ÷ smaller form so 56÷7 and 56÷8 are different keys (they are different facts) but 56÷7 vs 7÷56 collapse to the same one.
  function divKey(dividend, divisor) {
    const hi = Math.max(dividend, divisor);
    const lo = Math.min(dividend, divisor);
    return `div:${hi}/${lo}`;
  }

  function parseFactKey(key) {
    const m = /^mul:(\d+)x(\d+)$/.exec(key);
    if (m) return { kind: 'mul', a: +m[1], b: +m[2] };
    const d = /^div:(\d+)\/(\d+)$/.exec(key);
    if (d) return { kind: 'div', dividend: +d[1], divisor: +d[2] };
    return null;
  }

  // Canonical fact family from a key (e.g. "mul:7x8" → "x7" or "x8" — pick the smaller for family weighting)
  function familyOf(key) {
    const f = parseFactKey(key);
    if (!f) return null;
    if (f.kind === 'mul') return `x${Math.min(f.a, f.b)}`;
    return `x${f.divisor}`;
  }

  const exp = { mulKey, divKey, parseFactKey, familyOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.FactKeys = exp;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 2. `combat/mastery.js` — Leitner box engine

```js
(function(global) {
  'use strict';
  const { mulKey, divKey, familyOf } = (typeof require !== 'undefined') ? require('./factKeys.js') : global.FactKeys;

  const BOX_WEIGHT = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
  const SHAKY_MULTIPLIER = 2.5;
  const RECENCY_WINDOW = 5;
  const RECENCY_DAMPING = 0.3;
  const MASTERED_BOX = 4;
  const MASTERED_MIN_CORRECT = 6;

  function getOrCreate(masteryMap, key) {
    if (!masteryMap[key]) {
      masteryMap[key] = { box: 1, lastSeenAt: 0, totalAsked: 0, totalCorrect: 0, avgMs: 0, streak: 0, shaky: false };
    }
    return masteryMap[key];
  }

  function isMastered(stat) {
    return stat && stat.box >= MASTERED_BOX && stat.totalCorrect >= MASTERED_MIN_CORRECT;
  }

  // Update box on a resolve event.
  // ctx.masteredAvgMs = average answer time across all currently-mastered facts (or null if none) — passed in so we don't recompute it here.
  function recordResolve(masteryMap, key, { correct, timeMs, now, masteredAvgMs }) {
    const s = getOrCreate(masteryMap, key);
    s.totalAsked++;
    s.lastSeenAt = now;
    if (correct) {
      s.totalCorrect++;
      s.streak++;
      const fastThreshold = (masteredAvgMs ?? 4000) * 2;  // if no mastered baseline, treat <8s as "fast"
      const fast = timeMs < fastThreshold;
      if (fast) s.box = Math.min(5, s.box + 1);
      // running average
      s.avgMs = s.avgMs === 0 ? timeMs : Math.round((s.avgMs * 0.7) + (timeMs * 0.3));
    } else {
      s.streak = 0;
      s.box = Math.max(1, s.box - 2);
      s.shaky = true;
    }
    // Mastered facts can shed the shaky flag after 3 consecutive correct
    if (correct && s.streak >= 3) s.shaky = false;
    return s;
  }

  function masteredAvgMs(masteryMap) {
    const stats = Object.values(masteryMap).filter(isMastered);
    if (stats.length === 0) return null;
    const sum = stats.reduce((acc, s) => acc + (s.avgMs || 0), 0);
    return Math.round(sum / stats.length);
  }

  function pullWeight(stat, recentKeys) {
    const box = stat ? stat.box : 1;
    const w = BOX_WEIGHT[box] ?? 1;
    const sh = stat && stat.shaky ? SHAKY_MULTIPLIER : 1.0;
    const rd = recentKeys && recentKeys.includes(_keyOf(stat)) ? RECENCY_DAMPING : 1.0;
    return w * sh * rd;
  }
  // Note: recencyDamping wants the key, so the caller passes in the key alongside the stat; see `selectFact` in problemGen.js.

  function _keyOf() { return null; }  // unused; kept for shape

  const exp = { recordResolve, isMastered, masteredAvgMs, pullWeight, getOrCreate, BOX_WEIGHT, MASTERED_BOX, MASTERED_MIN_CORRECT, SHAKY_MULTIPLIER, RECENCY_DAMPING, RECENCY_WINDOW };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.Mastery = exp;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 3. `combat/problemGen.js` — Weighted selection + stretch facts

```js
(function(global) {
  'use strict';
  const FK = (typeof require !== 'undefined') ? require('./factKeys.js') : global.FactKeys;
  const M  = (typeof require !== 'undefined') ? require('./mastery.js')  : global.Mastery;

  // Build the eligible fact keys for a realm given factFamilyWeights.
  // factFamilyWeights example: { "x0":0, "x1":0.05, "x2":0.10, "x3":0.10, "x4":0.10, "x5":0.20, "x6":0.10, "x7":0, "x8":0, "x9":0, "x10":0.20, "x11":0, "x12":0.15 }
  // For each enabled family x_n, we include both:
  //   mul keys:  mulKey(n, k)  for k in [0..12]
  //   div keys:  divKey(n*k, n) for k in [1..12]   (canonical larger÷smaller form keeps it as div:NN/n)
  function buildEligibleKeys(factFamilyWeights) {
    const out = [];
    Object.entries(factFamilyWeights).forEach(([fam, w]) => {
      if (w <= 0) return;
      const n = +fam.slice(1);
      for (let k = 0; k <= 12; k++) out.push(FK.mulKey(n, k));
      for (let k = 1; k <= 12; k++) {
        const dividend = n * k;
        if (dividend === 0) continue;  // skip 0÷n which is a degenerate fact
        out.push(FK.divKey(dividend, Math.min(n, k) === 0 ? 1 : Math.min(n, k)));
        // Note: divKey takes (dividend, divisor); we want both n and k as candidate divisors
        // Because mulKey collapses commutative pairs, each underlying multiplication produces 2 division facts (÷n and ÷k) when n != k.
      }
    });
    // Dedupe (the loop above can produce duplicates from commutative families)
    return Array.from(new Set(out));
  }

  // Sample a problem. masteryMap is the save's mastery object (mutated externally).
  // recentKeys is an array (newest-last) of the last RECENCY_WINDOW keys answered in this session — caller maintains it.
  // rng is a 0..1 RNG (run-seeded).
  // realmTier is 1..5 (Goblin Forest=1 ... Lich Citadel=5).
  function selectProblem({ realm, masteryMap, recentKeys, rng, mulRatio, allowStretch, realmTier }) {
    const stretchProb = 0.10 + 0.02 * (realmTier - 1);
    if (allowStretch && rng() < stretchProb) {
      const stretch = _selectStretch({ masteryMap, rng });
      if (stretch) return stretch;
    }
    const eligible = buildEligibleKeys(realm.factFamilyWeights);
    const weights = eligible.map(k => {
      const stat = masteryMap[k];
      const box = stat ? stat.box : 1;
      const w = M.BOX_WEIGHT[box] ?? 1;
      const sh = stat && stat.shaky ? M.SHAKY_MULTIPLIER : 1.0;
      const rd = recentKeys.includes(k) ? M.RECENCY_DAMPING : 1.0;
      return w * sh * rd;
    });
    const ratio = mulRatio ?? 0.7;
    const isMul = rng() < ratio;
    // Filter by kind
    const indices = [];
    const kindWeights = [];
    eligible.forEach((k, i) => {
      const isThisMul = k.startsWith('mul:');
      if (isMul === isThisMul) { indices.push(i); kindWeights.push(weights[i]); }
    });
    const idx = _weightedPick(indices, kindWeights, rng);
    const key = eligible[idx];
    return _materialize(key);
  }

  function _materialize(key) {
    const f = FK.parseFactKey(key);
    if (f.kind === 'mul') {
      const a = f.a, b = f.b;
      return { kind: 'mul', a, b, answer: a * b, displayText: `${a} × ${b} = ?`, factKey: key, isStretch: false };
    } else {
      const dividend = f.dividend, divisor = f.divisor;
      return { kind: 'div', a: dividend, b: divisor, answer: dividend / divisor, displayText: `${dividend} ÷ ${divisor} = ?`, factKey: key, isStretch: false };
    }
  }

  // Stretch facts: only from families [x2, x5, x10] AND only when that family's mastered count is ≥ 4 (== "family is solid")
  function _selectStretch({ masteryMap, rng }) {
    const families = ['x2', 'x5', 'x10'];
    const ranges = { x2: [13, 50], x5: [13, 30], x10: [13, 30] };
    const eligibleFamilies = families.filter(fam => {
      const n = +fam.slice(1);
      // count how many facts in this family are mastered
      let mastered = 0;
      for (let k = 0; k <= 12; k++) {
        const key = FK.mulKey(n, k);
        if (M.isMastered(masteryMap[key])) mastered++;
      }
      return mastered >= 4;
    });
    if (eligibleFamilies.length === 0) return null;
    const fam = eligibleFamilies[Math.floor(rng() * eligibleFamilies.length)];
    const n = +fam.slice(1);
    const [lo, hi] = ranges[fam];
    const N = lo + Math.floor(rng() * (hi - lo + 1));
    const isMul = rng() < 0.6;
    if (isMul) {
      return { kind: 'mul', a: n, b: N, answer: n * N, displayText: `${n} × ${N} = ?`, factKey: `stretch:mul:${n}x${N}`, isStretch: true };
    } else {
      const dividend = n * N;
      return { kind: 'div', a: dividend, b: n, answer: N, displayText: `${dividend} ÷ ${n} = ?`, factKey: `stretch:div:${dividend}/${n}`, isStretch: true };
    }
  }

  function _weightedPick(items, weights, rng) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total === 0) return items[Math.floor(rng() * items.length)];
    let r = rng() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  const exp = { selectProblem, buildEligibleKeys, _selectStretch, _materialize };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.ProblemGen = exp;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 4. `combat/distractors.js` — Orb distractor generation

```js
(function(global) {
  'use strict';

  // Returns 4 numbers: 1 correct + 3 close-miss distractors. Always sorted/shuffled by caller using the run-seeded rng.
  // problem: { kind, a, b, answer }
  // rng: 0..1 RNG
  function generateDistractors(problem, rng) {
    const correct = problem.answer;
    const candidates = new Set();

    if (problem.kind === 'mul') {
      const { a, b } = problem;
      candidates.add(a * (b + 1));
      candidates.add(a * (b - 1));
      candidates.add((a + 1) * b);
      candidates.add((a - 1) * b);
      candidates.add(correct + 1);
      candidates.add(correct - 1);
      candidates.add(correct + 10);
      candidates.add(correct - 10);
      candidates.add(a + b);                 // common kid mistake: confuse + and ×
    } else {
      const { a: dividend, b: divisor } = problem;
      candidates.add(correct + 1);
      candidates.add(correct - 1);
      candidates.add(correct + 2);
      candidates.add(dividend - divisor);    // confuse - and ÷
      candidates.add(dividend / (divisor === 1 ? 2 : (divisor - 1)));
      candidates.add(dividend / (divisor + 1));
    }

    // Filter: positive integers, not equal to correct, plausible range
    const filtered = Array.from(candidates).filter(v => Number.isInteger(v) && v >= 0 && v !== correct && v <= 999);

    // Pick 3 unique close-misses, prefer the closest to correct
    filtered.sort((x, y) => Math.abs(x - correct) - Math.abs(y - correct));

    // Take more than 3, then shuffle to randomize within close-miss tier
    const pool = filtered.slice(0, Math.max(6, filtered.length));
    // Fisher-Yates with the run-seeded rng
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const distractors = [];
    for (const v of pool) {
      if (distractors.length === 3) break;
      if (!distractors.includes(v)) distractors.push(v);
    }

    // If we couldn't find 3 unique distractors (pathological case e.g. answer=0), fill with safe fallbacks
    let pad = 1;
    while (distractors.length < 3) {
      const fallback = correct + pad;
      if (!distractors.includes(fallback) && fallback !== correct && fallback >= 0) distractors.push(fallback);
      pad++;
      if (pad > 50) break;  // safety
    }

    const orbs = [correct, ...distractors];
    // Final shuffle
    for (let i = orbs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [orbs[i], orbs[j]] = [orbs[j], orbs[i]];
    }
    return orbs;
  }

  const exp = { generateDistractors };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.Distractors = exp;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 5. `scripts/test-fact-keys.js`

```js
const FK = require('../js/combat/factKeys.js');
const assert = require('assert');
let p=0,f=0; function it(n,fn){try{fn();console.log('PASS',n);p++}catch(e){console.error('FAIL',n,e.message);f++}}

it('mulKey collapses commutative pairs', () => {
  assert.strictEqual(FK.mulKey(7, 8), 'mul:7x8');
  assert.strictEqual(FK.mulKey(8, 7), 'mul:7x8');
});
it('divKey uses larger / smaller', () => {
  assert.strictEqual(FK.divKey(56, 7), 'div:56/7');
  assert.strictEqual(FK.divKey(7, 56), 'div:56/7');
});
it('parseFactKey round-trips', () => {
  const m = FK.parseFactKey('mul:7x8');
  assert.deepStrictEqual(m, { kind: 'mul', a: 7, b: 8 });
  const d = FK.parseFactKey('div:56/7');
  assert.deepStrictEqual(d, { kind: 'div', dividend: 56, divisor: 7 });
});

console.log(`\n${p} passed, ${f} failed`);
process.exit(f>0?1:0);
```

### 6. `scripts/test-mastery.js`

```js
const M = require('../js/combat/mastery.js');
const assert = require('assert');
let p=0,f=0; function it(n,fn){try{fn();console.log('PASS',n);p++}catch(e){console.error('FAIL',n,e.message);f++}}

it('correct + fast → box increments', () => {
  const map = {};
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 1, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 2);
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 2, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 3);
});

it('correct + slow → box unchanged', () => {
  const map = {};
  // Box starts at 1; without an existing mastered baseline, fastThreshold defaults to 8000
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 9000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].box, 1);
});

it('wrong → box decrements by 2 (floored at 1) and shaky=true', () => {
  const map = {};
  // raise to 4
  for (let i = 0; i < 3; i++) M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: i+1, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 4);
  M.recordResolve(map, 'mul:7x8', { correct: false, timeMs: 6000, now: 99, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 2);
  assert.strictEqual(map['mul:7x8'].shaky, true);
});

it('wrong from box 1 stays at box 1', () => {
  const map = {};
  M.recordResolve(map, 'mul:1x1', { correct: false, timeMs: 1000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:1x1'].box, 1);
});

it('mastered = box>=4 && totalCorrect>=6', () => {
  const map = {};
  for (let i = 0; i < 5; i++) M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: i+1, masteredAvgMs: 2000 });
  // box should be at 5, totalCorrect=5 — not yet mastered
  assert.strictEqual(M.isMastered(map['mul:7x8']), false);
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 6, masteredAvgMs: 2000 });
  assert.strictEqual(M.isMastered(map['mul:7x8']), true);
});

it('shaky clears after 3-correct streak', () => {
  const map = {};
  M.recordResolve(map, 'mul:7x8', { correct: false, timeMs: 6000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].shaky, true);
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 2, masteredAvgMs: null });
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 3, masteredAvgMs: null });
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 4, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].shaky, false);
});

it('100-problem simulation converges most facts to box ≥ 3', () => {
  const map = {};
  const keys = ['mul:5x6','mul:5x7','mul:6x7','mul:7x8','mul:8x9','mul:6x9'];
  for (let i = 0; i < 100; i++) {
    const k = keys[i % keys.length];
    M.recordResolve(map, k, { correct: true, timeMs: 1500, now: i, masteredAvgMs: 2000 });
  }
  for (const k of keys) assert.ok(map[k].box >= 3, `${k} box ${map[k].box}`);
});

console.log(`\n${p} passed, ${f} failed`);
process.exit(f>0?1:0);
```

### 7. `scripts/test-problem-gen.js`

```js
const PG = require('../js/combat/problemGen.js');
const FK = require('../js/combat/factKeys.js');
const assert = require('assert');
let p=0,f=0; function it(n,fn){try{fn();console.log('PASS',n);p++}catch(e){console.error('FAIL',n,e.message);f++}}

// Mulberry32 with fixed seed for determinism
function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}

const realm1 = { factFamilyWeights: { x2: 0.2, x5: 0.4, x10: 0.4 } };

it('every multiplication answer is correct', () => {
  const rng = makeRng(1);
  const map = {};
  for (let i = 0; i < 200; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: map, recentKeys: [], rng, mulRatio: 1.0, allowStretch: false, realmTier: 1 });
    if (prob.kind === 'mul') assert.strictEqual(prob.answer, prob.a * prob.b);
  }
});

it('every division answer is integer and correct', () => {
  const rng = makeRng(2);
  const map = {};
  for (let i = 0; i < 200; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: map, recentKeys: [], rng, mulRatio: 0, allowStretch: false, realmTier: 1 });
    if (prob.kind === 'div') {
      assert.ok(Number.isInteger(prob.answer), `non-integer: ${prob.displayText}`);
      assert.strictEqual(prob.a / prob.b, prob.answer);
    }
  }
});

it('determinism: same seed + state produces same problem sequence', () => {
  const seq1 = [];
  const rng1 = makeRng(42);
  for (let i = 0; i < 30; i++) seq1.push(PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng: rng1, mulRatio: 0.7, allowStretch: false, realmTier: 1 }).factKey);
  const seq2 = [];
  const rng2 = makeRng(42);
  for (let i = 0; i < 30; i++) seq2.push(PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng: rng2, mulRatio: 0.7, allowStretch: false, realmTier: 1 }).factKey);
  assert.deepStrictEqual(seq1, seq2);
});

it('stretch facts gated: empty mastery never produces stretch', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 200; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.7, allowStretch: true, realmTier: 5 });
    assert.strictEqual(prob.isStretch, false);
  }
});

it('stretch facts produced when family mastered (5s)', () => {
  const map = {};
  // mark all 5xN for N=0..12 as mastered
  for (let k = 0; k <= 12; k++) map[FK.mulKey(5, k)] = { box: 5, lastSeenAt: 1, totalAsked: 10, totalCorrect: 10, avgMs: 1000, streak: 5, shaky: false };
  const rng = makeRng(123);
  let stretchCount = 0;
  for (let i = 0; i < 1000; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: map, recentKeys: [], rng, mulRatio: 0.7, allowStretch: true, realmTier: 5 });
    if (prob.isStretch) stretchCount++;
  }
  // expected ~0.20 in tier 5; check it's between 10% and 30%
  assert.ok(stretchCount > 100 && stretchCount < 300, `stretchCount=${stretchCount}`);
});

console.log(`\n${p} passed, ${f} failed`);
process.exit(f>0?1:0);
```

### 8. `scripts/test-distractors.js`

```js
const D = require('../js/combat/distractors.js');
const assert = require('assert');
let p=0,f=0; function it(n,fn){try{fn();console.log('PASS',n);p++}catch(e){console.error('FAIL',n,e.message);f++}}
function rng() { return Math.random(); }   // for non-determinism tests; determinism is tested in problem-gen

it('mul: 4 unique values, exactly one matches answer', () => {
  for (let a = 0; a <= 12; a++) for (let b = 0; b <= 12; b++) {
    const orbs = D.generateDistractors({ kind: 'mul', a, b, answer: a * b }, rng);
    assert.strictEqual(orbs.length, 4);
    const unique = new Set(orbs);
    assert.strictEqual(unique.size, 4, `orbs not unique for ${a}×${b}: ${orbs}`);
    assert.strictEqual(orbs.filter(v => v === a * b).length, 1);
    orbs.forEach(v => assert.ok(v >= 0 && v <= 999, `orb out of range: ${v}`));
  }
});

it('div: 4 unique values, exactly one matches answer', () => {
  for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
    const dividend = a * b;
    const divisor = a;
    const orbs = D.generateDistractors({ kind: 'div', a: dividend, b: divisor, answer: b }, rng);
    assert.strictEqual(orbs.length, 4);
    const unique = new Set(orbs);
    assert.strictEqual(unique.size, 4);
    assert.strictEqual(orbs.filter(v => v === b).length, 1);
  }
});

it('1000 random pairs: no negative orbs, no zero-division pathologies', () => {
  for (let i = 0; i < 1000; i++) {
    const a = Math.floor(Math.random() * 13);
    const b = Math.floor(Math.random() * 13);
    const orbs = D.generateDistractors({ kind: 'mul', a, b, answer: a * b }, rng);
    orbs.forEach(v => assert.ok(v >= 0, `negative orb: ${v}`));
  }
});

console.log(`\n${p} passed, ${f} failed`);
process.exit(f>0?1:0);
```

## Tests to run

```bash
node claudes-math-marauder/scripts/test-fact-keys.js
node claudes-math-marauder/scripts/test-mastery.js
node claudes-math-marauder/scripts/test-problem-gen.js
node claudes-math-marauder/scripts/test-distractors.js
```

All four must report `0 failed`.

## Acceptance checklist

- [ ] `combat/factKeys.js` — UMD-export, `mulKey` collapses commutative pairs, `divKey` uses larger÷smaller form
- [ ] `combat/mastery.js` — Leitner box update bounds (1..5), `mastered` flag, `shaky` clear-on-3-streak
- [ ] `combat/problemGen.js` — weighted selection, stretch-fact gate, determinism with same seed
- [ ] `combat/distractors.js` — always 4 unique orbs, exactly one correct, all in plausible range
- [ ] All four `test-*.js` scripts pass (zero failures)
- [ ] No DOM, canvas, or audio imports anywhere under `combat/` (grep `js/combat/` for `document|canvas|AudioContext|requestAnimationFrame` — must be empty)
- [ ] No `Math.random()` calls inside `combat/` modules (combat must be deterministic via injected rng) — distractors.js's fallback shuffle uses the passed-in rng only

## Session end

1. Run all four test scripts — confirm zero failures
2. Run `marauder-web-review` agent
3. Commit `Session 2: math engine — problem gen, distractors, Leitner mastery + tests`
4. Push to `main`
