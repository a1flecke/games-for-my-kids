#!/usr/bin/env node
/**
 * KC4 level JSON verification script.
 * Usage: node keyboard-command-4/scripts/verify-levels.js [levelNumber|all]
 * Run from the repo root.
 */

const fs = require('fs');
const path = require('path');
const base = 'keyboard-command-4/data/levels';
const shortcutsPath = 'keyboard-command-4/data/shortcuts.json';

const shortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
const shortcutMap = {};
for (const s of shortcuts) shortcutMap[s.id] = s;

const files = fs.readdirSync(base).filter(f => /^level\d+\.json$/.test(f)).sort();
const targetLevel = process.argv[2] && process.argv[2] !== 'all' ? parseInt(process.argv[2]) : null;

let errors = 0;
const allTaunts = {}; // taunt -> 'LevelN BossName'

for (const file of files) {
  const levelNum = parseInt(file.match(/\d+/)[0]);
  if (targetLevel && levelNum !== targetLevel) continue;
  const data = JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
  const tag = 'L' + levelNum;

  // Find first boss room and safe max
  const rooms = data.rooms || [];
  const firstBossRoom = rooms.find(r => r.boss);
  const firstBossId = firstBossRoom ? firstBossRoom.id : null;
  let safeMax = null;
  if (firstBossId !== null) {
    const prevRoom = rooms.find(r => r.id === firstBossId - 1);
    safeMax = prevRoom && prevRoom.isBonus ? firstBossId - 3 : firstBossId - 2;
  }

  // Check items
  for (const item of (data.items || [])) {
    if (item.type !== 'health' && item.type !== 'weapon') {
      console.log('[CRITICAL] ' + tag + ' item type "' + item.type + '" is not engine-supported (use "health" or "weapon")');
      errors++;
    }
    if (item.type === 'health' && typeof item.amount !== 'number') {
      console.log('[CRITICAL] ' + tag + ' health item missing amount field');
      errors++;
    }
    if (item.type === 'weapon' && typeof item.weaponId !== 'number') {
      console.log('[CRITICAL] ' + tag + ' weapon item missing weaponId field');
      errors++;
    }
    if (safeMax !== null && item.after_room > safeMax) {
      console.log('[CRITICAL] ' + tag + ' item after_room=' + item.after_room + ' unsafe (safe max=' + safeMax + ', first boss=room ' + firstBossId + ')');
      errors++;
    }
  }

  // Check rooms/waves/bosses
  for (const room of rooms) {
    const rTag = tag + ' R' + room.id;

    // OffsetX collisions
    for (let wi = 0; wi < (room.waves || []).length; wi++) {
      const wave = room.waves[wi];
      const seen = {};
      for (const m of (wave.monsters || [])) {
        if (seen[m.offsetX] !== undefined) {
          console.log('[CRITICAL] ' + rTag + ' W' + (wi + 1) + ' offsetX=' + m.offsetX + ' collision between ' + seen[m.offsetX] + ' and ' + m.type);
          errors++;
        }
        seen[m.offsetX] = m.type;

        // Mage depth
        if (m.type === 'mage' && m.depth > 0.15) {
          console.log('[CRITICAL] ' + rTag + ' mage depth=' + m.depth + ' exceeds 0.15');
          errors++;
        }

        // Depth bounds
        if (m.depth < 0.0 || m.depth > 0.8) {
          console.log('[CRITICAL] ' + rTag + ' ' + m.type + ' depth=' + m.depth + ' out of range 0.0-0.8');
          errors++;
        }

        // Unknown fields (warn about spec anti-patterns)
        if (m.combo !== undefined) console.log('[WARN] ' + rTag + ' monster has combo field (not implemented)');
        if (m.mode !== undefined)  console.log('[WARN] ' + rTag + ' monster has mode field (not implemented)');
        if (Array.isArray(m.shortcut)) console.log('[WARN] ' + rTag + ' monster has array shortcut field (not implemented)');
      }
    }

    // Boss checks
    if (room.boss) {
      const boss = room.boss;
      const bTag = rTag + ' boss "' + boss.name + '"';

      // hp vs phases
      if (boss.hp !== (boss.phases || []).length) {
        console.log('[CRITICAL] ' + bTag + ' hp=' + boss.hp + ' but phases.length=' + (boss.phases || []).length);
        errors++;
      }

      // Phase checks
      for (let pi = 0; pi < (boss.phases || []).length; pi++) {
        const phase = boss.phases[pi];
        const pTag = bTag + ' phase ' + (pi + 1);

        // ShortcutId validity
        if (!shortcutMap[phase.shortcutId]) {
          console.log('[CRITICAL] ' + pTag + ' shortcutId "' + phase.shortcutId + '" not found in shortcuts.json');
          errors++;
        } else {
          // Instruction accuracy
          const expected = shortcutMap[phase.shortcutId].action;
          if (phase.instruction !== expected) {
            console.log('[WARN] ' + pTag + ' instruction "' + phase.instruction + '" does not match shortcuts.json action "' + expected + '"');
          }
        }

        // Taunt uniqueness
        if (phase.taunt) {
          const existing = allTaunts[phase.taunt];
          if (existing) {
            console.log('[CRITICAL] ' + pTag + ' taunt duplicates ' + existing + ': "' + phase.taunt + '"');
            errors++;
          } else {
            allTaunts[phase.taunt] = tag + ' ' + boss.name;
          }
        }
      }
    }
  }
}

if (errors === 0) {
  console.log('All KC4 level files passed verification.');
} else {
  console.log(errors + ' error(s) found.');
  process.exit(1);
}
