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

function checkColorList(colors, context) {
  (Array.isArray(colors) ? colors : [colors]).forEach(c => {
    if (!isHex6(c)) {
      critical(`${context}: "${c}" is not a valid #RRGGBB color`);
    }
  });
}

// Object palettes used by MonsterRenderer (palette.body, palette.head, etc).
function checkPaletteObject(palette, context, requiredKeys) {
  if (!palette || typeof palette !== 'object' || Array.isArray(palette)) {
    critical(`${context}: palette must be an object (e.g. { body: "#xxxxxx", head: "#xxxxxx" })`);
    return;
  }
  Object.entries(palette).forEach(([k, v]) => {
    if (!isHex6(v)) critical(`${context}.palette.${k}: "${v}" is not a valid #RRGGBB color`);
  });
  (requiredKeys || []).forEach(k => {
    if (!(k in palette)) warn(`${context}.palette: missing key "${k}"`);
  });
}

function checkSize(size, context) {
  if (!Array.isArray(size) || size.length !== 2) {
    critical(`${context}: size must be a [width, height] array`);
    return;
  }
  size.forEach((n, i) => {
    if (typeof n !== 'number' || n <= 0) {
      critical(`${context}: size[${i}] must be a positive number`);
    }
  });
}

function checkLayout(layout, shape, context) {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
    critical(`${context}: layout must be an object with per-part {ox, oy} entries`);
    return;
  }
  const requiredSlots = [];
  if (shape) {
    if (shape.body)  requiredSlots.push('body');
    if (shape.head)  requiredSlots.push('head');
    if (shape.eyes)  requiredSlots.push('eyes');
    if (shape.mouth) requiredSlots.push('mouth');
    if (shape.horns) requiredSlots.push('horns');
    if (shape.tail)  requiredSlots.push('tail');
    if (shape.wings) requiredSlots.push('wings');
    if (Array.isArray(shape.limbs)) {
      shape.limbs.forEach((_, i) => requiredSlots.push('limb' + i));
    }
  }
  requiredSlots.forEach(slot => {
    const entry = layout[slot];
    if (!entry || typeof entry.ox !== 'number' || typeof entry.oy !== 'number') {
      critical(`${context}.layout.${slot}: must be {ox, oy} numbers (renderer crashes without it)`);
    }
  });
}

function checkShapeRenderable(shape, context) {
  if (!shape || typeof shape !== 'object') return;

  // Eye expression — must be in the renderer's EXPR_CONFIG.
  const VALID_EXPRS = ['angry', 'surprised', 'happy', 'neutral', 'dead'];
  if (shape.eyes && shape.eyes.expr && !VALID_EXPRS.includes(shape.eyes.expr)) {
    critical(`${context}.shape.eyes.expr: "${shape.eyes.expr}" not in ${JSON.stringify(VALID_EXPRS)} (renderer falls back to neutral)`);
  }

  // Limb side must be 'left' or 'right' (renderer treats anything else as right).
  if (Array.isArray(shape.limbs)) {
    shape.limbs.forEach((limb, i) => {
      if (limb.side !== 'left' && limb.side !== 'right') {
        critical(`${context}.shape.limbs[${i}].side: must be "left" or "right" (got ${JSON.stringify(limb.side)})`);
      }
      if (typeof limb.seed !== 'number') warn(`${context}.shape.limbs[${i}]: missing seed (defaults to 0 — wobble pattern not unique)`);
    });
  }

  // Required pixel-sized fields and seeds.
  const partRules = {
    body:  ['rx', 'ry', 'wobble', 'seed'],
    head:  ['rx', 'ry', 'seed'],
    eyes:  ['size', 'seed'],
    mouth: ['width', 'height', 'seed'],
    horns: ['size', 'seed'],
    tail:  ['length', 'seed'],
  };
  Object.entries(partRules).forEach(([slot, fields]) => {
    const part = shape[slot];
    if (!part) return;
    fields.forEach(f => {
      if (typeof part[f] !== 'number') {
        if (f === 'seed') warn(`${context}.shape.${slot}: missing ${f} (defaults to 0 — wobble pattern not unique)`);
        else critical(`${context}.shape.${slot}: missing numeric ${f}`);
      }
    });
    // Wobble values should be in pixel range (renderer multiplies by 0.04). Fractions like 0.12 produce ~no wobble.
    if (slot === 'body' && typeof part.wobble === 'number' && part.wobble > 0 && part.wobble < 1) {
      warn(`${context}.shape.body.wobble: ${part.wobble} is a fraction; renderer expects pixel values (typical 3–10)`);
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

const STRETCH_FAMILIES = new Set(['x2', 'x5', 'x10']);

// =========================================================
// Unreferenced data files check
// =========================================================
const KNOWN_FILES = new Set(['realms.json', 'monsters.json', 'bosses.json', 'spells.json', 'classes.json', 'story.json', 'events.json']);
if (fs.existsSync(DATA_DIR)) {
  fs.readdirSync(DATA_DIR).forEach(fn => {
    if (fn.endsWith('.json') && !KNOWN_FILES.has(fn)) {
      warn(`unreferenced data file: ${fn} (not loaded by validator)`);
    }
  });
}

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

      // Palette colors — all must be valid hex; halftone/panelTint contrast vs cream.
      if (r.palette) {
        if (r.palette.bgGradient) checkColorList(r.palette.bgGradient, `${ctx}.palette.bgGradient`);
        if (r.palette.halftoneColor) {
          checkColorList(r.palette.halftoneColor, `${ctx}.palette.halftoneColor`);
          if (isHex6(r.palette.halftoneColor)) {
            const ratio = contrastRatio(r.palette.halftoneColor, CREAM);
            if (ratio < 3.0) warn(`${ctx}.palette.halftoneColor: contrast on cream is ${ratio.toFixed(2)}:1 (< 3.0)`);
          }
        }
        if (r.palette.panelTint) checkColorList(r.palette.panelTint, `${ctx}.palette.panelTint`);
      }

      // factFamilyWeights must sum to ~1.0
      if (r.factFamilyWeights) {
        const keys = ['x0','x1','x2','x3','x4','x5','x6','x7','x8','x9','x10','x11','x12'];
        const sum = keys.reduce((acc, k) => acc + (r.factFamilyWeights[k] || 0), 0);
        if (sum < 0.99 || sum > 1.01) {
          critical(`${ctx}: factFamilyWeights sum is ${sum.toFixed(4)}, must be in [0.99, 1.01] (±0.01 tolerance)`);
        } else {
          info(`${ctx}: factFamilyWeights sum = ${sum.toFixed(4)} ✓`);
        }
        keys.forEach(k => {
          if (!(k in r.factFamilyWeights)) warn(`${ctx}: factFamilyWeights missing key "${k}"`);
        });
      } else {
        critical(`${ctx}: missing factFamilyWeights`);
      }

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

      checkPaletteObject(m.palette, ctx, ['body', 'head', 'eyes', 'pupils']);
      checkSize(m.size, ctx);
      checkShapeRenderable(m.shape, ctx);
      checkLayout(m.layout, m.shape, ctx);

      if (!m.shape) warn(`${ctx}: missing shape`);
      if (!m.anim)  warn(`${ctx}: missing anim`);
      if (!Array.isArray(m.voiceTaunts) || m.voiceTaunts.length === 0) {
        warn(`${ctx}: voiceTaunts is empty or missing`);
      }
    });
    info(`monsters.json: ${monsters.length} monsters`);
  }
}

// Cross-check realm monsterPool → monster IDs
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

      // Palette + size validated for all bosses, including TBD ones.
      checkPaletteObject(b.palette, ctx, ['body', 'head']);
      if (b.size) checkSize(b.size, ctx);

      // Phase factFamilyHint validation
      const VALID_FACT_FAMILIES = new Set(['x0','x1','x2','x3','x4','x5','x6','x7','x8','x9','x10','x11','x12']);
      if (Array.isArray(b.phases)) {
        b.phases.forEach((p, pi) => {
          if (p.factFamilyHint && !VALID_FACT_FAMILIES.has(p.factFamilyHint)) {
            critical(`${ctx}.phases[${pi}]: factFamilyHint "${p.factFamilyHint}" is not a valid family (must be x0–x12)`);
          }
          if (p.kind === 'stretch' && p.factFamilyHint && !STRETCH_FAMILIES.has(p.factFamilyHint)) {
            warn(`${ctx}.phases[${pi}]: stretch kind requires factFamilyHint in ${JSON.stringify([...STRETCH_FAMILIES])} (got "${p.factFamilyHint}")`);
          }
        });
      }

      // TBD bosses skip deep validation but get palette + stretch checks above.
      if (b.tbdInRealms2to5 === true) {
        info(`${ctx}: tbdInRealms2to5=true — skipping shape/layout validation`);
        return;
      }

      if (!b.realmId) critical(`${ctx}: missing realmId`);
      else if (!realmIds.has(b.realmId)) critical(`${ctx}: realmId "${b.realmId}" not found in realms`);

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

      checkShapeRenderable(b.shape, ctx);
      checkLayout(b.layout, b.shape, ctx);

      if (!b.shape) warn(`${ctx}: missing shape`);
      if (!b.anim)  warn(`${ctx}: missing anim`);
    });

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
          warn(`${ctx}: fxColor "${s.fxColor}" contrast on cream is ${ratio.toFixed(2)}:1 (< 3.0 — particle FX only, not text)`);
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
        if (c.unlock.minStars !== undefined) {
          if (typeof c.unlock.minStars !== 'number' || c.unlock.minStars < 1 || c.unlock.minStars > 3) {
            critical(`${ctx}: unlock.minStars must be in [1, 3], got ${c.unlock.minStars}`);
          }
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
      } else {
        // Single-sentence-per-panel rule from spec §7.2.
        ch.lines.forEach((line, li) => {
          if (typeof line !== 'string') return;
          // Count sentence-ending punctuation that's followed by a space and a capital letter or end-of-string.
          // Allow ellipses ("...") and trailing punctuation. Two sentence-enders mid-line indicate two sentences.
          const stripped = line.replace(/\.\.\./g, '…');
          const matches = stripped.match(/[.!?](?=\s+[A-Z])/g);
          if (matches && matches.length >= 1) {
            warn(`${ctx}.lines[${li}]: appears to contain multiple sentences (spec §7.2: one sentence per panel)`);
          }
        });
      }
    });

    if (realmsData) {
      (realmsData.realms || []).forEach(r => {
        if (r.storyChapterId && !chapterIds.has(r.storyChapterId)) {
          // Realms 2–5 chapters are deferred to Session 11; warn (non-blocking).
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
    const validOutcomeKinds = new Set(['gold', 'heal', 'damage', 'spell', 'streak_bonus', 'class_unlock']);
    const eventIds = new Set();
    events.forEach((ev, i) => {
      const ctx = `events[${i}] (${ev.id})`;
      if (!ev.id) { critical(`${ctx}: missing id`); return; }
      if (eventIds.has(ev.id)) critical(`events: duplicate id "${ev.id}"`);
      eventIds.add(ev.id);

      if (!Array.isArray(ev.choices) || ev.choices.length < 1 || ev.choices.length > 3) {
        critical(`${ctx}: choices.length must be in [1, 3], got ${Array.isArray(ev.choices) ? ev.choices.length : 'N/A'}`);
        return;
      }

      ev.choices.forEach((ch, ci) => {
        if (!Array.isArray(ch.outcomes) || ch.outcomes.length < 1) {
          critical(`${ctx}.choices[${ci}]: outcomes must have at least 1 entry (spec §8.2)`);
          return;
        }
        ch.outcomes.forEach((out, oi) => {
          const ctx2 = `${ctx}.choices[${ci}].outcomes[${oi}]`;
          if (!validOutcomeKinds.has(out.kind)) {
            critical(`${ctx2}: kind "${out.kind}" not in ${JSON.stringify([...validOutcomeKinds])}`);
            return;
          }
          // Per-kind shape checks
          if (out.kind === 'gold') {
            if (typeof out.delta !== 'number') critical(`${ctx2}: gold outcome requires numeric "delta"`);
          } else if (out.kind === 'heal' || out.kind === 'damage' || out.kind === 'streak_bonus') {
            if (typeof out.amount !== 'number' || out.amount <= 0) {
              critical(`${ctx2}: ${out.kind} outcome requires positive numeric "amount"`);
            }
          } else if (out.kind === 'spell') {
            if (out.rarity && !['common', 'rare'].includes(out.rarity)) {
              warn(`${ctx2}: spell rarity "${out.rarity}" unusual for Realm 1 (expected common|rare)`);
            }
          } else if (out.kind === 'class_unlock') {
            if (!out.classId) critical(`${ctx2}: class_unlock outcome requires "classId"`);
            else if (classesData && !classIds.has(out.classId)) {
              critical(`${ctx2}: class_unlock classId "${out.classId}" not found in classes`);
            }
          }
        });
      });
    });
    info(`events.json: ${events.length} events`);
  }
}

// =========================================================
// Summary
// =========================================================
console.log(`\n${errors} critical, ${warns} warnings`);
process.exit(errors > 0 ? 1 : 0);
