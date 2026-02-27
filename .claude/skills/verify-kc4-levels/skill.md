---
name: verify-kc4-levels
description: Validate all keyboard-command-4 level JSON files for correctness — item safety, shortcut ID validity, hp/phases consistency, offsetX collisions, mage depths, instruction accuracy, and taunt uniqueness.
argument-hint: "[level number or 'all']"
---

Run the verification script below via the Bash tool (or a Bash subagent). Report every finding as CRITICAL / WARN / INFO with the level and field that failed.

## What is checked

1. **Item type validity** — only `"health"` (with `amount`) and `"weapon"` (with `weaponId`) are engine-supported types
2. **Item after_room safety** — items delivered just before a boss corridor are swallowed by `startBossTransition`. Safe max:
   - Find the first room in the level that has a `boss` field (first_boss_id)
   - If the room at `first_boss_id - 1` has `isBonus: true` → safe_max = first_boss_id - 3
   - Otherwise → safe_max = first_boss_id - 2
   - Any `after_room > safe_max` is CRITICAL
3. **Shortcut ID validity** — every `shortcutId` in boss phases must exist in `shortcuts.json`
4. **hp vs phases.length** — every boss `hp` must equal `phases.length`
5. **OffsetX collisions** — no two monsters in the same wave may share the same `offsetX`
6. **Mage depth** — any monster with `type: "mage"` must have `depth ≤ 0.15`
7. **Depth bounds** — all monster depths must be in range `0.0–0.8`
8. **Instruction accuracy** — each boss phase `instruction` must match the `action` field for that `shortcutId` in `shortcuts.json`
9. **Taunt uniqueness** — no taunt string may be repeated across different bosses in any level

## Run this script

Use the Bash tool to execute:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const base = 'keyboard-command-4/data/levels';
const shortcutsPath = 'keyboard-command-4/data/shortcuts.json';

const shortcuts = JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
const shortcutMap = {};
for (const s of shortcuts) shortcutMap[s.id] = s;

const files = fs.readdirSync(base).filter(f => /^level\d+\.json$/.test(f)).sort();
const args = process.argv.slice(1);
const targetLevel = args[0] && args[0] !== 'all' ? parseInt(args[0]) : null;

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
      console.log('[CRITICAL] ' + tag + ' item type \"' + item.type + '\" is not engine-supported (use \"health\" or \"weapon\")');
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
          console.log('[CRITICAL] ' + rTag + ' W' + (wi+1) + ' offsetX=' + m.offsetX + ' collision between ' + seen[m.offsetX] + ' and ' + m.type);
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
      const bTag = rTag + ' boss \"' + boss.name + '\"';

      // hp vs phases
      if (boss.hp !== (boss.phases || []).length) {
        console.log('[CRITICAL] ' + bTag + ' hp=' + boss.hp + ' but phases.length=' + (boss.phases||[]).length);
        errors++;
      }

      // Phase checks
      for (let pi = 0; pi < (boss.phases || []).length; pi++) {
        const phase = boss.phases[pi];
        const pTag = bTag + ' phase ' + (pi+1);

        // ShortcutId validity
        if (!shortcutMap[phase.shortcutId]) {
          console.log('[CRITICAL] ' + pTag + ' shortcutId \"' + phase.shortcutId + '\" not found in shortcuts.json');
          errors++;
        } else {
          // Instruction accuracy
          const expected = shortcutMap[phase.shortcutId].action;
          if (phase.instruction !== expected) {
            console.log('[WARN] ' + pTag + ' instruction \"' + phase.instruction + '\" does not match shortcuts.json action \"' + expected + '\"');
          }
        }

        // Taunt uniqueness
        if (phase.taunt) {
          const existing = allTaunts[phase.taunt];
          if (existing) {
            console.log('[CRITICAL] ' + pTag + ' taunt duplicates ' + existing + ': \"' + phase.taunt + '\"');
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
"
```

Run this from the repo root. Exit code 1 means failures found — fix all CRITICAL issues before committing.
