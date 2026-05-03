#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');

let errors = 0, warns = 0;
function critical(msg) { console.error('CRITICAL:', msg); errors++; }
function warn(msg)     { console.warn('WARN:', msg); warns++; }
function info(msg)     { console.log('INFO:', msg); }

function loadOrFail(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) { critical(`missing ${file}`); return null; }
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (e) { critical(`parse error in ${file}: ${e.message}`); return null; }
}

// --- Color helpers ---

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
function isHex6(s) { return typeof s === 'string' && HEX6_RE.test(s); }

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance([r, g, b]) {
  const chan = v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const CREAM = '#F5F0E8';

function checkPaletteColors(colors, context) {
  (Array.isArray(colors) ? colors : [colors]).forEach(c => {
    if (!isHex6(c)) {
      critical(`${context}: "${c}" is not a valid #RRGGBB color`);
    }
  });
}

// --- Load all files ---

const realmsData   = loadOrFail('realms.json');
const monstersData = loadOrFail('monsters.json');
const bossesData   = loadOrFail('bosses.json');
const spellsData   = loadOrFail('spells.json');
const classesData  = loadOrFail('classes.json');
const storyData    = loadOrFail('story.json');
const eventsData   = loadOrFail('events.json');

// Build lookup sets
const realmIds   = new Set();
const monsterIds = new Set();
const bossIds    = new Set();
const spellIds   = new Set();
const classIds   = new Set();
const chapterIds = new Set();

// =========================================================
// realms.json
// =========================================================
if (realmsData) {
  const realms = realmsData.realms;
  if (!Array.isArray(realms)) {
    critical('realms.json: "realms" must be an array');
  } else {
    realms.forEach((r, i) => {
      const ctx = `realms[${i}] (${r.id})`;

      if (!r.id) { critical(`${ctx}: missing id`); return; }
      if (realmIds.has(r.id)) critical(`realms: duplicate id "${r.id}"`);
      realmIds.add(r.id);

      // Palette colors
      if (r.palette) {
        if (r.palette.bgGradient) checkPaletteColors(r.palette.bgGradient, `${ctx}.palette.bgGradient`);
        if (r.palette.halftoneColor) checkPaletteColors(r.palette.halftoneColor, `${ctx}.palette.halftoneColor`);
        if (r.palette.panelTint) checkPaletteColors(r.palette.panelTint, `${ctx}.palette.panelTint`);
      }

      // factFamilyWeights must sum to ~1.0
      if (r.factFamilyWeights) {
        const keys = ['x0','x1','x2','x3','x4','x5','x6','x7','x8','x9','x10','x11','x12'];
        const sum = keys.reduce((acc, k) => acc + (r.factFamilyWeights[k] || 0), 0);
        if (sum < 0.95 || sum > 1.05) {
          critical(`${ctx}: factFamilyWeights sum is ${sum.toFixed(4)}, must be in [0.95, 1.05]`);
        } else {
          info(`${ctx}: factFamilyWeights sum = ${sum.toFixed(4)} ✓`);
        }
        keys.forEach(k => {
          if (!(k in r.factFamilyWeights)) warn(`${ctx}: factFamilyWeights missing key "${k}"`);
        });
      } else {
        critical(`${ctx}: missing factFamilyWeights`);
      }

      // monsterPool — will cross-check after monsters loaded
      if (!Array.isArray(r.monsterPool)) critical(`${ctx}: monsterPool must be an array`);
      if (!r.bossId) warn(`${ctx}: missing bossId`);
      if (!r.storyChapterId) warn(`${ctx}: missing storyChapterId`);
    });
    info(`realms.json: ${realms.length} realms`);
  }
}

// =========================================================
// monsters.json
// =========================================================
if (monstersData) {
  const monsters = monstersData.monsters;
  if (!Array.isArray(monsters)) {
    critical('monsters.json: "monsters" must be an array');
  } else {
    monsters.forEach((m, i) => {
      const ctx = `monsters[${i}] (${m.id})`;
      if (!m.id) { critical(`${ctx}: missing id`); return; }
      if (monsterIds.has(m.id)) critical(`monsters: duplicate id "${m.id}"`);
      monsterIds.add(m.id);

      if (!Array.isArray(m.palette)) critical(`${ctx}: palette must be an array`);
      else checkPaletteColors(m.palette, `${ctx}.palette`);

      if (!m.shape) warn(`${ctx}: missing shape`);
      if (!m.anim)  warn(`${ctx}: missing anim`);
      if (!Array.isArray(m.voiceTaunts) || m.voiceTaunts.length === 0) {
        warn(`${ctx}: voiceTaunts is empty or missing`);
      }
    });
    info(`monsters.json: ${monsters.length} monsters`);
  }
}

// =========================================================
// Cross-check realm monsterPool → monster IDs
// =========================================================
if (realmsData && monstersData) {
  (realmsData.realms || []).forEach(r => {
    if (!Array.isArray(r.monsterPool)) return;
    if (r.monsterPool.length === 0) {
      info(`realm "${r.id}": monsterPool empty (expected for non-Realm-1 stubs)`);
      return;
    }
    r.monsterPool.forEach(mId => {
      if (!monsterIds.has(mId)) {
        critical(`realm "${r.id}": monsterPool references unknown monster "${mId}"`);
      }
    });
  });
}

// =========================================================
// bosses.json
// =========================================================
if (bossesData) {
  const bosses = bossesData.bosses;
  if (!Array.isArray(bosses)) {
    critical('bosses.json: "bosses" must be an array');
  } else {
    bosses.forEach((b, i) => {
      const ctx = `bosses[${i}] (${b.id})`;
      if (!b.id) { critical(`${ctx}: missing id`); return; }
      if (bossIds.has(b.id)) critical(`bosses: duplicate id "${b.id}"`);
      bossIds.add(b.id);

      // Check palette colors even for placeholder bosses
      if (Array.isArray(b.palette)) checkPaletteColors(b.palette, `${ctx}.palette`);

      // Skip deep validation for placeholder bosses
      if (b.tbdInRealms2to5 === true) {
        info(`${ctx}: tbdInRealms2to5=true — skipping deep validation`);
        return;
      }

      if (!b.realmId) critical(`${ctx}: missing realmId`);
      else if (!realmIds.has(b.realmId)) critical(`${ctx}: realmId "${b.realmId}" not found in realms`);

      if (!Array.isArray(b.palette)) critical(`${ctx}: palette must be an array`);
      else checkPaletteColors(b.palette, `${ctx}.palette`);

      if (typeof b.hp !== 'number' || b.hp < 1) critical(`${ctx}: hp must be a positive number`);

      if (!Array.isArray(b.phases)) {
        critical(`${ctx}: phases must be an array`);
      } else if (b.phases.length !== b.hp) {
        critical(`${ctx}: phases.length (${b.phases.length}) must equal hp (${b.hp})`);
      } else {
        const validModes = ['orb', 'ultimate'];
        const validKinds = ['mul', 'div', 'stretch'];
        b.phases.forEach((p, pi) => {
          if (!validKinds.includes(p.kind)) warn(`${ctx}.phases[${pi}]: kind "${p.kind}" not in ${JSON.stringify(validKinds)}`);
          if (!validModes.includes(p.mode)) warn(`${ctx}.phases[${pi}]: mode "${p.mode}" not in ${JSON.stringify(validModes)}`);
        });
        info(`${ctx}: ${b.phases.length} phases match hp ✓`);
      }

      if (!b.shape) warn(`${ctx}: missing shape`);
      if (!b.anim)  warn(`${ctx}: missing anim`);
    });

    // Cross-check realm bossId → boss IDs
    if (realmsData) {
      (realmsData.realms || []).forEach(r => {
        if (r.bossId && !bossIds.has(r.bossId)) {
          critical(`realm "${r.id}": bossId "${r.bossId}" not found in bosses`);
        }
      });
    }

    info(`bosses.json: ${bosses.length} bosses`);
  }
}

// =========================================================
// spells.json
// =========================================================
if (spellsData) {
  const spells = spellsData.spells;
  if (!Array.isArray(spells)) {
    critical('spells.json: "spells" must be an array');
  } else {
    const validUnlockKinds = ['starter', 'shop', 'boss_clear'];
    spells.forEach((s, i) => {
      const ctx = `spells[${i}] (${s.id})`;
      if (!s.id) { critical(`${ctx}: missing id`); return; }
      if (spellIds.has(s.id)) critical(`spells: duplicate id "${s.id}"`);
      spellIds.add(s.id);

      if (s.rarity === 'epic') critical(`${ctx}: epic rarity spells are not allowed`);

      if (!s.unlock || !validUnlockKinds.includes(s.unlock.kind)) {
        critical(`${ctx}: unlock.kind must be one of ${JSON.stringify(validUnlockKinds)}`);
      }

      if (isHex6(s.fxColor)) {
        const ratio = contrastRatio(s.fxColor, CREAM);
        if (ratio < 3.0) {
          warn(`${ctx}: fxColor "${s.fxColor}" contrast on cream is ${ratio.toFixed(2)}:1 (< 3.0 — may be hard to see)`);
        }
      } else if (s.fxColor) {
        critical(`${ctx}: fxColor "${s.fxColor}" is not a valid #RRGGBB color`);
      }
    });

    const starterSpells = spells.filter(s => s.unlock && s.unlock.kind === 'starter');
    if (starterSpells.length === 0) critical('spells.json: no starter spells found');
    else info(`spells.json: ${starterSpells.length} starter spell(s): ${starterSpells.map(s => s.id).join(', ')}`);

    info(`spells.json: ${spells.length} spells`);
  }
}

// =========================================================
// classes.json
// =========================================================
if (classesData) {
  const classes = classesData.classes;
  if (!Array.isArray(classes)) {
    critical('classes.json: "classes" must be an array');
  } else {
    const validUnlockKinds = ['starter', 'boss_clear'];
    classes.forEach((c, i) => {
      const ctx = `classes[${i}] (${c.id})`;
      if (!c.id) { critical(`${ctx}: missing id`); return; }
      if (classIds.has(c.id)) critical(`classes: duplicate id "${c.id}"`);
      classIds.add(c.id);

      if (!Array.isArray(c.starterDeck) || c.starterDeck.length !== 5) {
        critical(`${ctx}: starterDeck must be an array of length 5`);
      } else {
        c.starterDeck.forEach((entry, di) => {
          if (entry !== null && spellsData && !spellIds.has(entry)) {
            critical(`${ctx}: starterDeck[${di}] references unknown spell "${entry}"`);
          }
        });
      }

      if (!c.unlock || !validUnlockKinds.includes(c.unlock.kind)) {
        critical(`${ctx}: unlock.kind must be one of ${JSON.stringify(validUnlockKinds)}`);
      }

      if (c.unlock && c.unlock.kind === 'boss_clear') {
        if (c.unlock.realm && !realmIds.has(c.unlock.realm)) {
          critical(`${ctx}: unlock.realm "${c.unlock.realm}" not found in realms`);
        }
      }

      if (c.wizardSchema) {
        ['robeColor', 'hatColor', 'skinTone'].forEach(key => {
          if (c.wizardSchema[key] && !isHex6(c.wizardSchema[key])) {
            critical(`${ctx}.wizardSchema.${key}: "${c.wizardSchema[key]}" is not a valid #RRGGBB color`);
          }
        });
      }
    });

    info(`classes.json: ${classes.length} classes`);
  }
}

// Cross-check spell classRestrict → class IDs
if (spellsData && classesData) {
  (spellsData.spells || []).forEach(s => {
    if (s.classRestrict !== null && s.classRestrict !== undefined) {
      if (!classIds.has(s.classRestrict)) {
        critical(`spells "${s.id}": classRestrict "${s.classRestrict}" not found in classes`);
      }
    }
  });
}

// =========================================================
// story.json
// =========================================================
if (storyData) {
  const chapters = storyData.chapters;
  if (!Array.isArray(chapters)) {
    critical('story.json: "chapters" must be an array');
  } else {
    chapters.forEach((ch, i) => {
      const ctx = `story.chapters[${i}] (${ch.id})`;
      if (!ch.id) { critical(`${ctx}: missing id`); return; }
      if (chapterIds.has(ch.id)) critical(`story: duplicate chapter id "${ch.id}"`);
      chapterIds.add(ch.id);

      if (!Array.isArray(ch.lines) || ch.lines.length < 4 || ch.lines.length > 12) {
        critical(`${ctx}: lines.length must be in [4, 12], got ${Array.isArray(ch.lines) ? ch.lines.length : 'N/A'}`);
      }
    });

    // Cross-check realm storyChapterId → chapter IDs
    if (realmsData) {
      (realmsData.realms || []).forEach(r => {
        if (r.storyChapterId && !chapterIds.has(r.storyChapterId)) {
          warn(`realm "${r.id}": storyChapterId "${r.storyChapterId}" not found in story chapters (may be added in a later session)`);
        }
      });
    }

    const flavor = storyData.flavor;
    if (!flavor) warn('story.json: missing flavor section');
    else {
      if (!Array.isArray(flavor.victories) || flavor.victories.length === 0) warn('story.json: flavor.victories is empty');
      if (!Array.isArray(flavor.taunts)    || flavor.taunts.length    === 0) warn('story.json: flavor.taunts is empty');
    }

    info(`story.json: ${chapters.length} chapter(s)`);
  }
}

// =========================================================
// events.json
// =========================================================
if (eventsData) {
  const events = eventsData.events;
  if (!Array.isArray(events)) {
    critical('events.json: "events" must be an array');
  } else {
    const validOutcomeKinds = ['gold', 'heal', 'damage', 'spell', 'streak_bonus', 'class_unlock'];
    const eventIds = new Set();
    events.forEach((ev, i) => {
      const ctx = `events[${i}] (${ev.id})`;
      if (!ev.id) { critical(`${ctx}: missing id`); return; }
      if (eventIds.has(ev.id)) critical(`events: duplicate id "${ev.id}"`);
      eventIds.add(ev.id);

      if (!Array.isArray(ev.choices) || ev.choices.length < 1 || ev.choices.length > 3) {
        critical(`${ctx}: choices.length must be in [1, 3], got ${Array.isArray(ev.choices) ? ev.choices.length : 'N/A'}`);
      } else {
        ev.choices.forEach((ch, ci) => {
          (ch.outcomes || []).forEach((out, oi) => {
            if (!validOutcomeKinds.includes(out.kind)) {
              critical(`${ctx}.choices[${ci}].outcomes[${oi}]: kind "${out.kind}" not in ${JSON.stringify(validOutcomeKinds)}`);
            }
          });
        });
      }
    });
    info(`events.json: ${events.length} events`);
  }
}

// =========================================================
// Summary
// =========================================================
console.log(`\n${errors} critical, ${warns} warnings`);
process.exit(errors > 0 ? 1 : 0);
