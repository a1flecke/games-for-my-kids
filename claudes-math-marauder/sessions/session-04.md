# Session 4 — Data Authoring Round 1 (Realm 1 Playable)
**Model:** Sonnet | **Focus:** Author the data needed to make Realm 1 (Goblin Forest) playable end-to-end after Session 9. Validator script gets fleshed out here too.

## Pre-flight

1. Read `plan.md` (data files section) and spec section 6 (Data Model & Authored Content).
2. Run `/marauder-checklist`.

## Files to create

### Data files
- `claudes-math-marauder/data/realms.json` — all 5 realms (only Realm 1 fully usable; others stub palettes + monster pool empty)
- `claudes-math-marauder/data/monsters.json` — 6 monsters covering Realm 1 + 1 sample of each type for later realms
- `claudes-math-marauder/data/bosses.json` — Goblin Warlord (Realm 1) only; other 4 bosses placeholders with `tbdInRealms2to5: true` flag (validator skips these until Session 11 fills them)
- `claudes-math-marauder/data/spells.json` — 10 starter spells
- `claudes-math-marauder/data/classes.json` — Apprentice + Pyromancer
- `claudes-math-marauder/data/story.json` — Chapter 1 + a small flavor-line bank
- `claudes-math-marauder/data/events.json` — 5 mystery events

### Files to modify
- `claudes-math-marauder/scripts/validate-data.js` — replace the stub with real validation logic

## Deliverables

### 1. `data/realms.json`

Five realm objects, indexed by `id`. Realm 1 fully populated; others with palette and theme placeholders so Session 11 can fill them.

Realm 1 example (write all five with this shape):
```jsonc
{
  "realms": [
    {
      "id": "goblin_forest",
      "displayName": "Goblin Forest",
      "tier": 1,
      "palette": {
        "bgGradient": ["#6c8a3a", "#a4c266"],
        "halftoneColor": "#3a5318",
        "panelTint": "#f8efd0"
      },
      "silhouettes": ["tree_gnarled", "mushroom_cluster", "twig_arch"],
      "monsterPool": ["goblin_grunt", "goblin_runt", "tree_imp", "fungal_creep"],
      "bossId": "goblin_warlord",
      "storyChapterId": "chapter_1",
      "factFamilyWeights": { "x0": 0, "x1": 0.05, "x2": 0.20, "x3": 0.15, "x4": 0.10, "x5": 0.20, "x6": 0.05, "x7": 0, "x8": 0, "x9": 0, "x10": 0.20, "x11": 0, "x12": 0.05 },
      "mulRatio": 0.75,
      "nodeCounts": { "combat": 5, "elite": 1, "spellshop": 1, "mystery": 1, "rest": 1 }
    },
    {
      "id": "crystal_cave",
      "displayName": "Crystal Cave",
      "tier": 2,
      "palette": { "bgGradient": ["#2c2a4a", "#6e6cb7"], "halftoneColor": "#a5a8e3", "panelTint": "#dde0ff" },
      "silhouettes": ["stalactite_jagged", "gem_cluster", "crystal_archway"],
      "monsterPool": [],
      "bossId": "crystal_titan",
      "storyChapterId": "chapter_2",
      "factFamilyWeights": { "x0": 0, "x1": 0, "x2": 0.10, "x3": 0.20, "x4": 0.15, "x5": 0.15, "x6": 0.15, "x7": 0.10, "x8": 0, "x9": 0, "x10": 0.10, "x11": 0, "x12": 0.05 },
      "mulRatio": 0.7,
      "nodeCounts": { "combat": 5, "elite": 2, "spellshop": 1, "mystery": 1, "rest": 1 }
    },
    {
      "id": "dragon_peak",
      "displayName": "Dragon Peak",
      "tier": 3,
      "palette": { "bgGradient": ["#8a2c2c", "#f0a040"], "halftoneColor": "#c93434", "panelTint": "#ffeac0" },
      "silhouettes": ["mountain_jagged", "lava_flow", "obsidian_spike"],
      "monsterPool": [],
      "bossId": "wyrm_emberhart",
      "storyChapterId": "chapter_3",
      "factFamilyWeights": { "x0": 0, "x1": 0, "x2": 0.05, "x3": 0.15, "x4": 0.15, "x5": 0.10, "x6": 0.20, "x7": 0.15, "x8": 0.10, "x9": 0, "x10": 0.05, "x11": 0, "x12": 0.05 },
      "mulRatio": 0.65,
      "nodeCounts": { "combat": 5, "elite": 2, "spellshop": 1, "mystery": 2, "rest": 1 }
    },
    {
      "id": "astral_void",
      "displayName": "Astral Void",
      "tier": 4,
      "palette": { "bgGradient": ["#0d0a2c", "#3c2a6e"], "halftoneColor": "#ddd5ff", "panelTint": "#e8e3ff" },
      "silhouettes": ["floating_debris", "small_planet", "starfield_dense"],
      "monsterPool": [],
      "bossId": "void_oracle",
      "storyChapterId": "chapter_4",
      "factFamilyWeights": { "x0": 0, "x1": 0, "x2": 0, "x3": 0.10, "x4": 0.10, "x5": 0.10, "x6": 0.15, "x7": 0.15, "x8": 0.15, "x9": 0.15, "x10": 0.05, "x11": 0.05, "x12": 0 },
      "mulRatio": 0.6,
      "nodeCounts": { "combat": 5, "elite": 2, "spellshop": 1, "mystery": 2, "rest": 1 }
    },
    {
      "id": "lich_citadel",
      "displayName": "Lich Citadel",
      "tier": 5,
      "palette": { "bgGradient": ["#2a2a2a", "#4a5a44"], "halftoneColor": "#9bb87a", "panelTint": "#ddddd5" },
      "silhouettes": ["skeletal_tower", "gravestone", "broken_arch"],
      "monsterPool": [],
      "bossId": "the_lich_king",
      "storyChapterId": "chapter_5",
      "factFamilyWeights": { "x0": 0, "x1": 0, "x2": 0.05, "x3": 0.10, "x4": 0.10, "x5": 0.10, "x6": 0.10, "x7": 0.15, "x8": 0.15, "x9": 0.10, "x10": 0.05, "x11": 0.05, "x12": 0.05 },
      "mulRatio": 0.5,
      "nodeCounts": { "combat": 5, "elite": 2, "spellshop": 1, "mystery": 2, "rest": 1 }
    }
  ]
}
```

### 2. `data/monsters.json`

6 monsters total: 4 standards for Realm 1 (`goblin_grunt`, `goblin_runt`, `tree_imp`, `fungal_creep`) plus 2 templates that Session 11 will copy and recolor for other realms (`gem_sprite` for Realm 2 placeholder; `ember_imp` for Realm 3 placeholder). Each monster matches the schema in plan.md / spec §4.4.

Example (write all six):
```jsonc
{
  "monsters": [
    {
      "id": "goblin_grunt",
      "name": "Goblin Grunt",
      "tier": 1,
      "hp": 1,
      "size": [180, 220],
      "palette": ["#3a6b2c", "#1b3618", "#f0d840"],
      "shape": {
        "body":  { "kind": "blob",      "rx": 70, "ry": 80, "wobble": 0.12 },
        "head":  { "kind": "egg",       "scale": 1.1, "tilt": -0.05 },
        "eyes":  { "kind": "comic_pair","size": 18, "expr": "angry" },
        "mouth": { "kind": "fang_grin" },
        "limbs": [ { "kind": "stub_arm", "side": "L" }, { "kind": "stub_arm", "side": "R" } ],
        "horns": null,
        "tail":  null
      },
      "anim": { "idle": "bob", "attack": "lunge", "hit": "squash" },
      "voiceTaunts": ["Tiny wizard! Easy lunch!", "Numbers won't save you!", "Hee hee, math is for losers!"],
      "voiceProfile": { "pitch": 1.1, "rate": 1.1 },
      "spawnSfx": "goblinGrunt"
    }
    /* ... + 5 more monsters with the same shape ... */
  ]
}
```

### 3. `data/bosses.json`

Goblin Warlord with 3 phases. Phase array length must equal `hp`.

```jsonc
{
  "bosses": [
    {
      "id": "goblin_warlord",
      "name": "Korg the Warlord",
      "realmId": "goblin_forest",
      "size": [320, 400],
      "palette": ["#5a3c1a", "#2a1c0a", "#c93434"],
      "hp": 3,
      "shape": { /* full schema like a monster */ },
      "anim": { "idle": "menacing_breath", "attack": "club_swing", "hit": "stagger", "phaseBreak": "armor_shatter" },
      "introSpeech": "So you're the apprentice they sent? Good. I'll add your bones to my collection.",
      "voiceProfile": { "pitch": 0.85, "rate": 0.95 },
      "phases": [
        { "label": "BONE ARMOR", "kind": "div", "hint": "Break the bone armor!", "factFamilyHint": "x5", "mode": "orb" },
        { "label": "BLOODFRENZY", "kind": "mul", "hint": "Cut through the rage!", "factFamilyHint": "x10", "mode": "orb" },
        { "label": "FINAL ROAR",  "kind": "stretch", "hint": "End it!",            "factFamilyHint": "x5", "mode": "ultimate" }
      ]
    },
    /* placeholders for other 4 bosses with `"tbdInRealms2to5": true` and minimal valid shape so the validator can ignore them */
  ]
}
```

The combat engine reads `phases[i].mode` to pick orb-cast vs typed-ultimate. Phase `kind` is `mul`, `div`, or `stretch` (forces a stretch fact from the named family, falling back to a normal hard problem if family not yet mastered).

### 4. `data/spells.json`

10 spells, only `ember_bolt` is starter. Mix of common/rare/epic. All rarities only `common` and `rare` for Realm 1 unlocks; reserve `epic` for later realms.

```jsonc
{
  "spells": [
    { "id": "ember_bolt",     "name": "Ember Bolt",     "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#ff7733", "fxKind": "spark",   "modifiers": { "baseDamageBonus": 0,    "speedCritBonus": 0.1, "streakBonusBonus": 0,    "ultimateChargeBonus": 0.2 }, "unlock": { "kind": "starter" } },
    { "id": "frost_orb",      "name": "Frost Orb",      "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#7ec8ff", "fxKind": "orb",     "modifiers": { "baseDamageBonus": 0.1,  "speedCritBonus": 0,   "streakBonusBonus": 0,    "ultimateChargeBonus": 0   }, "unlock": { "kind": "shop",    "cost": 30 } },
    { "id": "stone_shield",   "name": "Stone Shield",   "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#a89372", "fxKind": "shield",  "modifiers": { "baseDamageBonus": 0,    "speedCritBonus": 0,   "streakBonusBonus": 0.2,  "ultimateChargeBonus": 0   }, "unlock": { "kind": "shop",    "cost": 25 } },
    { "id": "kindle_step",    "name": "Kindle Step",    "rarity": "common", "tier": 1, "classRestrict": "pyromancer", "fxColor": "#ff9933", "fxKind": "trail",   "modifiers": { "baseDamageBonus": 0,    "speedCritBonus": 0.2, "streakBonusBonus": 0,    "ultimateChargeBonus": 0   }, "unlock": { "kind": "starter" } },
    { "id": "ash_shield",     "name": "Ash Shield",     "rarity": "common", "tier": 1, "classRestrict": "pyromancer", "fxColor": "#bb8855", "fxKind": "shield",  "modifiers": { "baseDamageBonus": 0,    "speedCritBonus": 0,   "streakBonusBonus": 0.15, "ultimateChargeBonus": 0   }, "unlock": { "kind": "starter" } },
    { "id": "spark_fan",      "name": "Spark Fan",      "rarity": "rare",   "tier": 2, "classRestrict": null,         "fxColor": "#ffcc44", "fxKind": "fan",     "modifiers": { "baseDamageBonus": 0.15, "speedCritBonus": 0.1, "streakBonusBonus": 0,    "ultimateChargeBonus": 0   }, "unlock": { "kind": "shop",    "cost": 60 } },
    { "id": "icy_lance",      "name": "Icy Lance",      "rarity": "rare",   "tier": 2, "classRestrict": null,         "fxColor": "#aaddff", "fxKind": "lance",   "modifiers": { "baseDamageBonus": 0.2,  "speedCritBonus": 0,   "streakBonusBonus": 0.1,  "ultimateChargeBonus": 0   }, "unlock": { "kind": "shop",    "cost": 70 } },
    { "id": "thorn_thresh",   "name": "Thorn Thresh",   "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#558844", "fxKind": "thorn",   "modifiers": { "baseDamageBonus": 0.05, "speedCritBonus": 0.1, "streakBonusBonus": 0.1,  "ultimateChargeBonus": 0   }, "unlock": { "kind": "shop",    "cost": 30 } },
    { "id": "moss_blanket",   "name": "Moss Blanket",   "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#3a6b2c", "fxKind": "haze",    "modifiers": { "baseDamageBonus": 0,    "speedCritBonus": 0,   "streakBonusBonus": 0,    "ultimateChargeBonus": 0.3 }, "unlock": { "kind": "shop",    "cost": 35 } },
    { "id": "willow_dart",    "name": "Willow Dart",    "rarity": "common", "tier": 1, "classRestrict": null,         "fxColor": "#88aa55", "fxKind": "dart",    "modifiers": { "baseDamageBonus": 0.05, "speedCritBonus": 0.05,"streakBonusBonus": 0.05, "ultimateChargeBonus": 0.05}, "unlock": { "kind": "shop",    "cost": 25 } }
  ]
}
```

### 5. `data/classes.json`

Apprentice (start) + Pyromancer (boss-clear unlock for Realm 1):

```jsonc
{
  "classes": [
    {
      "id": "apprentice",
      "name": "Apprentice",
      "passive": { "type": "vanilla", "description": "Steady caster with no class bonus. Best for learning." },
      "starterDeck": ["ember_bolt", null, null, null, null],
      "unlock": { "kind": "starter" },
      "wizardSchema": { "robeColor": "#5a4a8a", "hatColor": "#3a2a6a", "staffKind": "wand_simple", "skinTone": "#f0d6c2" }
    },
    {
      "id": "pyromancer",
      "name": "Pyromancer",
      "passive": { "type": "crit_chain", "description": "Each consecutive correct answer increases crit damage by 5% (caps at 50%)." },
      "starterDeck": ["ember_bolt", "kindle_step", "ash_shield", null, null],
      "unlock": { "kind": "boss_clear", "realm": "goblin_forest", "minStars": 1 },
      "wizardSchema": { "robeColor": "#aa3322", "hatColor": "#661a0a", "staffKind": "staff_flame", "skinTone": "#f0c8a0" }
    }
  ]
}
```

### 6. `data/story.json`

Chapter 1 (~6 short narrated lines) + flavor-line bank (10 victory lines, 10 generic taunts):

```jsonc
{
  "chapters": [
    {
      "id": "chapter_1",
      "realmId": "goblin_forest",
      "title": "Into the Goblin Forest",
      "lines": [
        "Your master's last words still echo in your ears.",
        "The Tower of Numbers has fallen.",
        "Goblins march from the forest. They carry stolen wisdom.",
        "You are the last apprentice. The math is yours to wield.",
        "Cast true. Cast fast. Save the tower.",
        "And so you step into the trees..."
      ]
    }
  ],
  "flavor": {
    "victories": ["Easy.", "Numbers don't lie.", "Cast and dismissed.", "Calculated.", "Another one down.", "The math wins again.", "Sum of nothing.", "Carry the one — to the grave!", "Solved.", "Next problem!"],
    "taunts":    ["Try a number, wizard!", "Your books won't help you here!", "Multiply this!", "How does it divide now?", "Numbers? I eat numbers!", "Wizard? More like fizzler!", "Show me your work!", "Cast something — anything!", "Slow!", "Wrong already?"]
  }
}
```

### 7. `data/events.json`

5 mystery events. Each has narrated prompt (≤ 2 short sentences), 2–3 choices, outcomes referencing recognized keys (`gold`, `heal`, `damage`, `spell`, `streak_bonus`).

```jsonc
{
  "events": [
    {
      "id": "lost_traveler",
      "prompt": "A traveler with a torn satchel offers a trade.",
      "choices": [
        { "text": "Give 10 gold for a mystery scroll", "outcomes": [{ "kind": "gold", "delta": -10 }, { "kind": "spell", "rarity": "common" }] },
        { "text": "Walk past", "outcomes": [] }
      ]
    },
    /* + 4 more events */
  ]
}
```

### 8. `scripts/validate-data.js`

Replace stub with full validator. Behaviors:

- Load each `data/*.json`, parse, fail fast on syntax errors
- All `monster.id` unique; `realm.monsterPool` references valid monster IDs (skip empty pools for non-Realm-1 — that's expected this session)
- All `boss.id` unique; `boss.realmId` references valid realm; `boss.phases.length === boss.hp` (skip if `tbdInRealms2to5: true`)
- All `spell.id` unique; `unlock.kind ∈ {"starter","shop","boss_clear"}`; `classRestrict` either null or refers to existing class
- All `class.id` unique; `class.starterDeck` length is 5; every non-null deck entry references a valid spell ID; class `unlock.realm` references a real realm
- All `chapter.id` matches a realm `storyChapterId`; `chapter.lines.length` ∈ `[4, 12]`
- All `event.id` unique; each `event.choices.length` ∈ `[1, 3]`; outcome kinds ∈ `{"gold","heal","damage","spell","streak_bonus","class_unlock"}`
- All palette colors are valid `#RRGGBB`; for any color used as text/UI on cream, run contrast check via `js/util/contrast.js` (placeholder: write the helper inline if `util/contrast.js` doesn't exist yet)
- Every realm `factFamilyWeights` sums to within `[0.95, 1.05]`
- Print `CRITICAL` for blocking errors (hook will block commit), `WARN` for non-blocking, `INFO` for stats

Exit nonzero on `CRITICAL`.

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');

let errors = 0, warns = 0;
function critical(msg) { console.error('CRITICAL:', msg); errors++; }
function warn(msg) { console.warn('WARN:', msg); warns++; }
function info(msg) { console.log('INFO:', msg); }

function loadOrFail(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) { critical(`missing ${file}`); return null; }
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (e) { critical(`parse error in ${file}: ${e.message}`); return null; }
}

const realms = loadOrFail('realms.json');
const monsters = loadOrFail('monsters.json');
const bosses = loadOrFail('bosses.json');
const spells = loadOrFail('spells.json');
const classes = loadOrFail('classes.json');
const story = loadOrFail('story.json');
const events = loadOrFail('events.json');

// ... (full validator body as enumerated above) ...

console.log(`\n${errors} critical, ${warns} warnings`);
process.exit(errors > 0 ? 1 : 0);
```

Write the full validator body — every check from the bullet list above. No placeholders.

## Tests to run

```bash
node claudes-math-marauder/scripts/validate-data.js     # 0 critical, 0 warnings
```

Hook test: edit one of the data files (e.g., add a single space and save), confirm the validator runs automatically and the output appears.

## Acceptance checklist

- [ ] `data/realms.json` has all 5 realms; Realm 1 fully populated with non-empty `monsterPool`
- [ ] `data/monsters.json` has at least the 4 Realm-1 monsters fully realized
- [ ] `data/bosses.json` has Goblin Warlord with phases.length === hp
- [ ] `data/spells.json` has Ember Bolt as a `starter` and 9 more spells
- [ ] `data/classes.json` has Apprentice (starter) + Pyromancer (boss_clear realm goblin_forest)
- [ ] `data/story.json` has chapter_1 with 4–12 lines + flavor bank
- [ ] `data/events.json` has 5 events, each with valid choices and outcomes
- [ ] `scripts/validate-data.js` reports zero CRITICAL errors
- [ ] PostToolUse hook runs the validator automatically on `data/*.json` edits
- [ ] All palette colors validated as `#RRGGBB`
- [ ] Realm 1's `factFamilyWeights` sums to ~1.0
- [ ] No `epic` rarity spells in Realm 1's likely shop offerings

## Session end

1. `node scripts/validate-data.js` — zero critical errors
2. Run `marauder-web-review` agent (data-only review — focus on schema correctness)
3. Commit `Session 4: data — realms, Realm 1 monsters, Goblin Warlord, starter spells, Apprentice + Pyromancer, chapter 1, 5 events`
4. Push to `main`
