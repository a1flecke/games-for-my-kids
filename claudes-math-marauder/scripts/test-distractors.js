#!/usr/bin/env node
'use strict';

const D = require('../js/combat/distractors.js');
const assert = require('assert');
let p = 0, f = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); p++; }
  catch (e) { console.error('FAIL', name, e.message); f++; }
}

// Seeded RNG for determinism tests
function makeRng(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

it('mul: exactly 4 unique values, exactly one correct, all non-negative for all 0..12 pairs', function() {
  const rng = makeRng(1);
  for (let a = 0; a <= 12; a++) {
    for (let b = 0; b <= 12; b++) {
      const answer = a * b;
      const orbs = D.generateDistractors({ kind: 'mul', a, b, answer }, rng);
      assert.strictEqual(orbs.length, 4, `length != 4 for ${a}×${b}: ${orbs}`);
      const unique = new Set(orbs);
      assert.strictEqual(unique.size, 4, `duplicates for ${a}×${b}: ${orbs}`);
      assert.strictEqual(orbs.filter(v => v === answer).length, 1, `correct not exactly once for ${a}×${b}: ${orbs}`);
      orbs.forEach(v => assert.ok(v >= 0, `negative orb ${v} for ${a}×${b}`));
      orbs.forEach(v => assert.ok(v <= 999, `orb > 999: ${v} for ${a}×${b}`));
    }
  }
});

it('div: exactly 4 unique values, exactly one correct for all 1..12 pairs', function() {
  const rng = makeRng(2);
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      const dividend = a * b;
      const divisor = a;
      const answer = b;
      const orbs = D.generateDistractors({ kind: 'div', a: dividend, b: divisor, answer }, rng);
      assert.strictEqual(orbs.length, 4, `length != 4 for ${dividend}÷${divisor}: ${orbs}`);
      const unique = new Set(orbs);
      assert.strictEqual(unique.size, 4, `duplicates for ${dividend}÷${divisor}: ${orbs}`);
      assert.strictEqual(orbs.filter(v => v === answer).length, 1, `correct not exactly once for ${dividend}÷${divisor}: ${orbs}`);
    }
  }
});

it('no negative orbs across 1000 random mul problems', function() {
  const rng = makeRng(3);
  for (let i = 0; i < 1000; i++) {
    const a = Math.floor(rng() * 13);
    const b = Math.floor(rng() * 13);
    const orbs = D.generateDistractors({ kind: 'mul', a, b, answer: a * b }, rng);
    orbs.forEach(v => assert.ok(v >= 0, `negative orb: ${v} for ${a}×${b}`));
  }
});

it('distractors are deterministic given same rng state', function() {
  const prob = { kind: 'mul', a: 7, b: 8, answer: 56 };
  const orbs1 = D.generateDistractors(prob, makeRng(42));
  const orbs2 = D.generateDistractors(prob, makeRng(42));
  assert.deepStrictEqual(orbs1, orbs2);
});

it('distractors differ with different rng state', function() {
  const prob = { kind: 'mul', a: 7, b: 8, answer: 56 };
  const orbs1 = D.generateDistractors(prob, makeRng(1));
  const orbs2 = D.generateDistractors(prob, makeRng(2));
  // Different seeds should (very likely) produce different orderings
  // Not a hard guarantee since shuffles could coincide, but across 4 elements it's astronomically unlikely
  assert.notDeepStrictEqual(orbs1, orbs2, 'expected different orderings with different seeds');
});

it('stretch fact (large mul): 4 unique orbs, correct included', function() {
  const rng = makeRng(4);
  // Stretch: 5 × 25 = 125
  const orbs = D.generateDistractors({ kind: 'mul', a: 5, b: 25, answer: 125 }, rng);
  assert.strictEqual(orbs.length, 4);
  assert.strictEqual(new Set(orbs).size, 4);
  assert.ok(orbs.includes(125), 'correct answer 125 missing from orbs: ' + orbs);
});

it('stretch fact (large div): 4 unique orbs, correct included', function() {
  const rng = makeRng(5);
  // Stretch: 150 ÷ 5 = 30
  const orbs = D.generateDistractors({ kind: 'div', a: 150, b: 5, answer: 30 }, rng);
  assert.strictEqual(orbs.length, 4);
  assert.strictEqual(new Set(orbs).size, 4);
  assert.ok(orbs.includes(30), 'correct answer 30 missing from orbs: ' + orbs);
});

it('edge case: answer=0 (0×anything) produces 4 unique non-negative orbs', function() {
  const rng = makeRng(6);
  for (let b = 0; b <= 12; b++) {
    const orbs = D.generateDistractors({ kind: 'mul', a: 0, b, answer: 0 }, rng);
    assert.strictEqual(orbs.length, 4, `length for 0×${b}: ${orbs}`);
    assert.strictEqual(new Set(orbs).size, 4, `duplicates for 0×${b}: ${orbs}`);
    assert.ok(orbs.includes(0), `0 missing from 0×${b} orbs: ${orbs}`);
    orbs.forEach(v => assert.ok(v >= 0, `negative orb for 0×${b}: ${v}`));
  }
});

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
