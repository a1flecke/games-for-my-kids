#!/usr/bin/env node
'use strict';

const FK = require('../js/combat/factKeys.js');
const assert = require('assert');
let p = 0, f = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); p++; }
  catch (e) { console.error('FAIL', name, e.message); f++; }
}

it('mulKey collapses commutative pairs', function() {
  assert.strictEqual(FK.mulKey(7, 8), 'mul:7x8');
  assert.strictEqual(FK.mulKey(8, 7), 'mul:7x8');
  assert.strictEqual(FK.mulKey(0, 5), 'mul:0x5');
  assert.strictEqual(FK.mulKey(5, 0), 'mul:0x5');
  assert.strictEqual(FK.mulKey(12, 12), 'mul:12x12');
});

it('divKey uses larger / smaller', function() {
  assert.strictEqual(FK.divKey(56, 7), 'div:56/7');
  assert.strictEqual(FK.divKey(7, 56), 'div:56/7');
  assert.strictEqual(FK.divKey(144, 12), 'div:144/12');
  assert.strictEqual(FK.divKey(1, 1), 'div:1/1');
});

it('parseFactKey round-trips mul', function() {
  assert.deepStrictEqual(FK.parseFactKey('mul:7x8'), { kind: 'mul', a: 7, b: 8 });
  assert.deepStrictEqual(FK.parseFactKey('mul:0x12'), { kind: 'mul', a: 0, b: 12 });
});

it('parseFactKey round-trips div', function() {
  assert.deepStrictEqual(FK.parseFactKey('div:56/7'), { kind: 'div', dividend: 56, divisor: 7 });
  assert.deepStrictEqual(FK.parseFactKey('div:144/12'), { kind: 'div', dividend: 144, divisor: 12 });
});

it('parseFactKey returns null for unknown key', function() {
  assert.strictEqual(FK.parseFactKey('stretch:mul:5x25'), null);
  assert.strictEqual(FK.parseFactKey('garbage'), null);
  assert.strictEqual(FK.parseFactKey(''), null);
});

it('familyOf mul uses smaller factor', function() {
  assert.strictEqual(FK.familyOf('mul:7x8'), 'x7');
  assert.strictEqual(FK.familyOf('mul:0x5'), 'x0');
  assert.strictEqual(FK.familyOf('mul:12x12'), 'x12');
});

it('familyOf div uses divisor', function() {
  assert.strictEqual(FK.familyOf('div:56/7'), 'x7');
  assert.strictEqual(FK.familyOf('div:144/12'), 'x12');
});

it('familyOf returns null for unknown key', function() {
  assert.strictEqual(FK.familyOf('garbage'), null);
});

console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
