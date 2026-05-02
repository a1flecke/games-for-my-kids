#!/usr/bin/env node
'use strict';

// Node-only localStorage shim
const store = {};
global.localStorage = {
  getItem:    (k) => (k in store ? store[k] : null),
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = global;
global.document = { getElementById() { return { addEventListener() {} }; } };
global.showToast = function() {};

const { SaveManager } = require('../js/save.js');
const assert = require('assert');

let pass = 0, fail = 0;
function it(name, fn) {
  try { fn(); console.log('PASS', name); pass++; }
  catch (e) { console.error('FAIL', name, e.message); fail++; }
}

// ── Defaults shape ─────────────────────────────────────────────────
it('defaults includes every required top-level key', function() {
  const d = SaveManager._defaults();
  const required = [
    'schemaVersion', 'createdAt', 'lastPlayedAt', 'playerName',
    'totalRunsStarted', 'totalRunsCompleted', 'totalProblemsAnswered', 'totalCorrect',
    'gold', 'ownedSpellIds', 'equippedDeck', 'unlockedClassIds', 'selectedClassId',
    'realmStars', 'storyChaptersUnlocked', 'mastery', 'activeRun', 'settings',
  ];
  required.forEach(function(k) { assert.ok(k in d, 'missing key: ' + k); });
  assert.strictEqual(d.equippedDeck.length, 5);
  assert.strictEqual(d.ownedSpellIds[0], 'ember_bolt');
  assert.strictEqual(d.selectedClassId, 'apprentice');
  assert.strictEqual(d.gold, 0);
  assert.strictEqual(d.activeRun, null);
});

it('defaults.settings includes every settings key', function() {
  const s = SaveManager._defaults().settings;
  const required = [
    'speechVoiceURI', 'speechRate', 'autoNarrate', 'sfxVolume',
    'muteAll', 'reducedMotion', 'fontScale', 'showSpeedTimer',
    'allowStretchFacts', 'devMode',
  ];
  required.forEach(function(k) { assert.ok(k in s, 'missing settings key: ' + k); });
  assert.strictEqual(s.speechRate, 1.0);
  assert.strictEqual(s.sfxVolume, 0.7);
  assert.strictEqual(s.allowStretchFacts, true);
});

it('defaults.realmStars has 5 realms', function() {
  const rs = SaveManager._defaults().realmStars;
  const realms = ['goblin_forest', 'crystal_cave', 'dragon_peak', 'astral_void', 'lich_citadel'];
  realms.forEach(function(r) { assert.strictEqual(rs[r], 0, 'missing realm: ' + r); });
});

// ── Round-trip ─────────────────────────────────────────────────────
it('save/load round-trip preserves all fields', function() {
  SaveManager.reset();
  const d = SaveManager._defaults();
  d.gold = 142;
  d.mastery['mul:7x8'] = { box: 3, lastSeenAt: 1, totalAsked: 5, totalCorrect: 4, avgMs: 2000, streak: 2, shaky: false };
  d.settings.speechRate = 0.9;
  SaveManager.save(d);
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.gold, 142);
  assert.strictEqual(loaded.mastery['mul:7x8'].box, 3);
  assert.strictEqual(loaded.settings.speechRate, 0.9);
});

// ── Migration v0 → v1 ──────────────────────────────────────────────
it('migrates v0 (missing fields) to v1 schema', function() {
  SaveManager.reset();
  localStorage.setItem('claudes-math-marauder-save', JSON.stringify({ schemaVersion: 0, gold: 5 }));
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.schemaVersion, 1);
  assert.strictEqual(loaded.gold, 5);
  assert.ok('mastery' in loaded, 'mastery missing after migration');
  assert.ok('settings' in loaded, 'settings missing after migration');
  assert.ok('realmStars' in loaded, 'realmStars missing after migration');
});

// ── Corrupt JSON → fallback to defaults ────────────────────────────
it('corrupt primary save falls back to defaults', function() {
  SaveManager.reset();
  localStorage.setItem('claudes-math-marauder-save', '{not valid json');
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.gold, 0, 'expected default gold after corruption');
  assert.ok('mastery' in loaded, 'mastery should exist on fresh defaults');
});

// ── Backup recovery ────────────────────────────────────────────────
it('falls back to backup when primary is corrupt but backup is valid', function() {
  SaveManager.reset();
  const backup = SaveManager._defaults();
  backup.gold = 77;
  localStorage.setItem('claudes-math-marauder-save', '{invalid');
  localStorage.setItem('claudes-math-marauder-save-backup', JSON.stringify(backup));
  const loaded = SaveManager.load();
  assert.strictEqual(loaded.gold, 77, 'should recover gold from backup');
});

// ── export/import round-trip ───────────────────────────────────────
it('export/import round-trips deep equality', function() {
  SaveManager.reset();
  const d = SaveManager._defaults();
  d.gold = 999;
  d.selectedClassId = 'pyromancer';
  SaveManager.save(d);
  const exported = SaveManager.export();
  SaveManager.reset();
  SaveManager.import(exported);
  const reloaded = SaveManager.load();
  assert.strictEqual(reloaded.gold, 999);
  assert.strictEqual(reloaded.selectedClassId, 'pyromancer');
});

// ── Summary ────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
