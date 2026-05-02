#!/usr/bin/env node
'use strict';

const M = require('../js/combat/mastery.js');
const assert = require('assert');
let p = 0, f = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); p++; }
  catch (e) { console.error('FAIL', name, e.message); f++; }
}

it('correct + fast → box increments', function() {
  const map = {};
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 1, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 2);
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 2, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 3);
});

it('correct + slow (above 2× mastered avg) → box unchanged', function() {
  const map = {};
  // masteredAvgMs=2000, fastThreshold=4000; 9000 > 4000 → slow
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 9000, now: 1, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 1);
});

it('correct + slow with null baseline → box unchanged above 8s threshold', function() {
  const map = {};
  // null masteredAvgMs → fastThreshold defaults to 8000; 9000 > 8000 → slow
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 9000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].box, 1);
});

it('correct + fast with null baseline → box increments under 8s', function() {
  const map = {};
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 2000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].box, 2);
});

it('wrong → box decrements by 2 (floored at 1) and shaky=true', function() {
  const map = {};
  for (let i = 0; i < 3; i++) {
    M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: i + 1, masteredAvgMs: 2000 });
  }
  assert.strictEqual(map['mul:7x8'].box, 4);
  M.recordResolve(map, 'mul:7x8', { correct: false, timeMs: 6000, now: 99, masteredAvgMs: 2000 });
  assert.strictEqual(map['mul:7x8'].box, 2);
  assert.strictEqual(map['mul:7x8'].shaky, true);
});

it('wrong from box 1 stays at box 1', function() {
  const map = {};
  M.recordResolve(map, 'mul:1x1', { correct: false, timeMs: 1000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:1x1'].box, 1);
});

it('box never exceeds 5', function() {
  const map = {};
  for (let i = 0; i < 10; i++) {
    M.recordResolve(map, 'mul:2x3', { correct: true, timeMs: 500, now: i + 1, masteredAvgMs: 1000 });
  }
  assert.strictEqual(map['mul:2x3'].box, 5);
});

it('isMastered: requires box>=4 AND totalCorrect>=6', function() {
  const map = {};
  // 5 correct fast answers → box=5, totalCorrect=5 → NOT yet mastered
  for (let i = 0; i < 5; i++) {
    M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: i + 1, masteredAvgMs: 2000 });
  }
  assert.strictEqual(M.isMastered(map['mul:7x8']), false, 'should not be mastered at totalCorrect=5');
  // 6th correct → totalCorrect=6, box=5 → mastered
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 6, masteredAvgMs: 2000 });
  assert.strictEqual(M.isMastered(map['mul:7x8']), true);
});

it('isMastered: null stat is false', function() {
  assert.strictEqual(M.isMastered(null), false);
  assert.strictEqual(M.isMastered(undefined), false);
});

it('shaky clears after 3 consecutive correct', function() {
  const map = {};
  M.recordResolve(map, 'mul:7x8', { correct: false, timeMs: 6000, now: 1, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].shaky, true);
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 2, masteredAvgMs: null });
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 3, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].shaky, true, 'should still be shaky at streak=2');
  M.recordResolve(map, 'mul:7x8', { correct: true, timeMs: 1000, now: 4, masteredAvgMs: null });
  assert.strictEqual(map['mul:7x8'].shaky, false);
});

it('totalAsked increments on every resolve', function() {
  const map = {};
  for (let i = 0; i < 7; i++) {
    M.recordResolve(map, 'mul:4x6', { correct: i % 2 === 0, timeMs: 2000, now: i, masteredAvgMs: null });
  }
  assert.strictEqual(map['mul:4x6'].totalAsked, 7);
});

it('masteredAvgMs returns null with no mastered facts', function() {
  assert.strictEqual(M.masteredAvgMs({}), null);
});

it('masteredAvgMs averages over mastered facts', function() {
  const map = {};
  // Make two facts mastered with known avgMs
  const keys = ['mul:5x6', 'mul:5x7'];
  for (const k of keys) {
    for (let i = 0; i < 6; i++) {
      M.recordResolve(map, k, { correct: true, timeMs: 2000, now: i, masteredAvgMs: 2000 });
    }
    assert.ok(M.isMastered(map[k]), k + ' should be mastered');
  }
  const avg = M.masteredAvgMs(map);
  assert.ok(avg > 0 && avg < 5000, 'avg should be a plausible number: ' + avg);
});

it('pullWeight: box=1, not shaky, not recent → weight 5', function() {
  assert.strictEqual(M.pullWeight('mul:7x8', { box: 1, shaky: false }, []), 5);
});

it('pullWeight: box=5 → weight 1', function() {
  assert.strictEqual(M.pullWeight('mul:7x8', { box: 5, shaky: false }, []), 1);
});

it('pullWeight: shaky multiplier applies', function() {
  const w = M.pullWeight('mul:7x8', { box: 1, shaky: true }, []);
  assert.strictEqual(w, 5 * M.SHAKY_MULTIPLIER);
});

it('pullWeight: recency damping applies when key in recentKeys', function() {
  const w = M.pullWeight('mul:7x8', { box: 1, shaky: false }, ['mul:7x8']);
  assert.strictEqual(w, 5 * M.RECENCY_DAMPING);
});

it('pullWeight: null stat treated as box=1', function() {
  assert.strictEqual(M.pullWeight('mul:7x8', null, []), 5);
});

it('100-problem simulation: most facts converge to box >= 3', function() {
  const map = {};
  const keys = ['mul:5x6', 'mul:5x7', 'mul:6x7', 'mul:7x8', 'mul:8x9', 'mul:6x9'];
  for (let i = 0; i < 100; i++) {
    const k = keys[i % keys.length];
    M.recordResolve(map, k, { correct: true, timeMs: 1500, now: i, masteredAvgMs: 2000 });
  }
  for (const k of keys) {
    assert.ok(map[k].box >= 3, k + ' should be box>=3, got ' + map[k].box);
  }
});

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
