#!/usr/bin/env node
'use strict';

const PG = require('../js/combat/problemGen.js');
const FK = require('../js/combat/factKeys.js');
const M  = require('../js/combat/mastery.js');
const assert = require('assert');
let p = 0, f = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); p++; }
  catch (e) { console.error('FAIL', name, e.message); f++; }
}

// Mulberry32 seeded PRNG — must match rng.js (divisor 0x100000000)
function makeRng(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

const realm1 = { factFamilyWeights: { x2: 0.2, x5: 0.4, x10: 0.4 } };

it('every multiplication answer is correct', function() {
  const rng = makeRng(1);
  for (let i = 0; i < 200; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 1.0, allowStretch: false, realmTier: 1 });
    if (prob.kind === 'mul') assert.strictEqual(prob.answer, prob.a * prob.b, prob.displayText);
  }
});

it('every division answer is an integer and correct', function() {
  const rng = makeRng(2);
  for (let i = 0; i < 200; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.0, allowStretch: false, realmTier: 1 });
    if (prob.kind === 'div') {
      assert.ok(Number.isInteger(prob.answer), 'non-integer: ' + prob.displayText);
      assert.strictEqual(prob.a / prob.b, prob.answer, prob.displayText);
    }
  }
});

it('answers are in range 0..144', function() {
  const rng = makeRng(7);
  for (let i = 0; i < 500; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.5, allowStretch: false, realmTier: 1 });
    assert.ok(prob.answer >= 0 && prob.answer <= 144, 'out of range: ' + prob.answer + ' from ' + prob.displayText);
  }
});

it('displayText contains a "?" and the operands', function() {
  const rng = makeRng(3);
  for (let i = 0; i < 50; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.5, allowStretch: false, realmTier: 1 });
    assert.ok(prob.displayText.includes('?'), 'displayText missing ?: ' + prob.displayText);
    assert.ok(prob.displayText.includes(String(prob.a)), 'displayText missing a: ' + prob.displayText);
    assert.ok(prob.displayText.includes(String(prob.b)), 'displayText missing b: ' + prob.displayText);
  }
});

it('determinism: same seed + state produces identical problem sequence', function() {
  function runSeq(seed) {
    const rng = makeRng(seed);
    const seq = [];
    for (let i = 0; i < 30; i++) {
      seq.push(PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.7, allowStretch: false, realmTier: 1 }).factKey);
    }
    return seq;
  }
  const a = runSeq(42);
  const b = runSeq(42);
  assert.deepStrictEqual(a, b);
});

it('different seeds produce different sequences', function() {
  function runSeq(seed) {
    const rng = makeRng(seed);
    const seq = [];
    for (let i = 0; i < 30; i++) {
      seq.push(PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.7, allowStretch: false, realmTier: 1 }).factKey);
    }
    return seq;
  }
  const a = runSeq(1);
  const b = runSeq(2);
  assert.notDeepStrictEqual(a, b);
});

it('stretch facts gated: empty mastery never produces stretch', function() {
  const rng = makeRng(99);
  for (let i = 0; i < 300; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.7, allowStretch: true, realmTier: 5 });
    assert.strictEqual(prob.isStretch, false, 'got stretch with empty mastery: ' + prob.factKey);
  }
});

it('stretch facts produced when x5 family mastered (>= 4 facts)', function() {
  const map = {};
  // Mark x5 facts 0..12 as mastered
  for (let k = 0; k <= 12; k++) {
    map[FK.mulKey(5, k)] = { box: 5, lastSeenAt: 1, totalAsked: 10, totalCorrect: 10, avgMs: 1000, streak: 5, shaky: false };
  }
  const rng = makeRng(123);
  let stretchCount = 0;
  for (let i = 0; i < 1000; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: map, recentKeys: [], rng, mulRatio: 0.7, allowStretch: true, realmTier: 5 });
    if (prob.isStretch) stretchCount++;
  }
  // Tier 5 stretch prob = 0.18; expect roughly 180 ± wide margin
  assert.ok(stretchCount > 80 && stretchCount < 300, 'stretchCount=' + stretchCount + ' outside expected range');
});

it('stretch answers are outside 0-12 range', function() {
  const map = {};
  for (let k = 0; k <= 12; k++) {
    map[FK.mulKey(5, k)] = { box: 5, lastSeenAt: 1, totalAsked: 10, totalCorrect: 10, avgMs: 1000, streak: 5, shaky: false };
  }
  const rng = makeRng(456);
  let found = false;
  for (let i = 0; i < 2000; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: map, recentKeys: [], rng, mulRatio: 0.7, allowStretch: true, realmTier: 5 });
    if (prob.isStretch) {
      // For x5 stretch: a or b should be > 12
      const large = Math.max(prob.a, prob.b);
      assert.ok(large > 12, 'stretch operand not > 12: ' + prob.displayText);
      found = true;
    }
  }
  assert.ok(found, 'no stretch problems found in 2000 attempts');
});

it('buildEligibleKeys: includes keys from all active families', function() {
  const weights = { x2: 0.5, x5: 0.5 };
  const keys = PG.buildEligibleKeys(weights);
  assert.ok(keys.some(k => k.startsWith('mul:') && k.includes('x2')), 'missing x2 mul keys');
  assert.ok(keys.some(k => k.startsWith('mul:') && k.includes('x5')), 'missing x5 mul keys');
  assert.ok(keys.some(k => k.startsWith('div:')), 'missing div keys');
});

it('buildEligibleKeys: excludes families with weight 0', function() {
  const weights = { x0: 0, x1: 0, x2: 0.5, x12: 0 };
  const keys = PG.buildEligibleKeys(weights);
  // x0 and x1 and x12 excluded; x2 included
  assert.ok(!keys.some(k => k === 'mul:0x0'), 'x0 family should be excluded');
  assert.ok(keys.some(k => k.startsWith('mul:') && k.includes('x2')), 'x2 should be included');
});

it('buildEligibleKeys: no duplicate keys', function() {
  const weights = { x2: 0.3, x5: 0.4, x10: 0.3 };
  const keys = PG.buildEligibleKeys(weights);
  const unique = new Set(keys);
  assert.strictEqual(unique.size, keys.length, 'duplicate keys found');
});

it('mulRatio=1.0 produces only mul problems', function() {
  const rng = makeRng(5);
  for (let i = 0; i < 50; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 1.0, allowStretch: false, realmTier: 1 });
    assert.strictEqual(prob.kind, 'mul');
  }
});

it('mulRatio=0.0 produces only div problems', function() {
  const rng = makeRng(6);
  for (let i = 0; i < 50; i++) {
    const prob = PG.selectProblem({ realm: realm1, masteryMap: {}, recentKeys: [], rng, mulRatio: 0.0, allowStretch: false, realmTier: 1 });
    assert.strictEqual(prob.kind, 'div');
  }
});

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
