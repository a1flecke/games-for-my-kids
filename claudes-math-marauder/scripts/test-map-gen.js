'use strict';
const MG = require('../js/run/mapGen.js');
const assert = require('assert');

let p = 0, f = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); p++; }
  catch (e) { console.error('FAIL', name, e.message); f++; }
}

const realm1 = { nodeCounts: { combat: 5, elite: 1, spellshop: 1, mystery: 1, rest: 1 } };

it('every map has exactly one start and one boss', function() {
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    let starts = 0, bosses = 0;
    m.nodes.forEach(function(n) { if (n.kind === 'start') starts++; if (n.kind === 'boss') bosses++; });
    assert.strictEqual(starts, 1, 'seed ' + s + ': expected 1 start');
    assert.strictEqual(bosses, 1, 'seed ' + s + ': expected 1 boss');
  }
});

it('all nodes reachable from start (BFS)', function() {
  for (let s = 1; s <= 100; s++) {
    const m = MG.generateMap(s, realm1);
    const reached = MG.bfsReachable(m, m.startId);
    assert.strictEqual(reached.size, m.nodes.size,
      'seed ' + s + ': reached ' + reached.size + ' / total ' + m.nodes.size);
  }
});

it('boss reachable from every node', function() {
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    m.nodes.forEach(function(n, id) {
      const reached = MG.bfsReachable(m, id);
      assert.ok(reached.has(m.bossId), 'seed ' + s + ': ' + id + ' cannot reach boss');
    });
  }
});

it('total node count is 11 for Realm 1 (start + 9 middle + boss)', function() {
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    assert.strictEqual(m.nodes.size, 11, 'seed ' + s + ': got ' + m.nodes.size + ' nodes');
  }
});

it('determinism: same seed + realm produces identical map', function() {
  const a = MG.generateMap(42, realm1);
  const b = MG.generateMap(42, realm1);
  const sig = function(m) {
    return JSON.stringify([...m.nodes.entries()].sort().map(function(e) {
      return [e[0], e[1].edgesOut.slice().sort()];
    }));
  };
  assert.strictEqual(sig(a), sig(b));
});

it('different seeds produce different maps', function() {
  const a = MG.generateMap(1, realm1);
  const b = MG.generateMap(2, realm1);
  const sig = function(m) {
    return JSON.stringify([...m.nodes.entries()].sort().map(function(e) {
      return [e[0], e[1].edgesOut.slice().sort()];
    }));
  };
  assert.notStrictEqual(sig(a), sig(b));
});

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
