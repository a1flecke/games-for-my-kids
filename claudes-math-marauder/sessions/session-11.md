# Session 11 — Data Authoring Round 2: Fill the World
**Model:** Sonnet | **Focus:** Author the remaining 4 realms, all monsters, 4 more bosses, full spell roster, all classes, full story arc, full event/shop pool. Make the game feel **big**.

By the end of this session, every realm is playable, every fact family is reachable, and the codex has 169 facts to track.

## Pre-flight

1. Read spec section 5 (Save Schema) and 6 (Data Files).
2. Review Realm 1 data files from Session 4 as the template.
3. Re-read the design spec's per-realm fact-family weighting strategy.
4. Run `/marauder-checklist`.
5. Run `/validate-marauder-data` on existing files to confirm baseline.

## Files to modify

- `claudes-math-marauder/data/realms.json` — flesh out realms 2–5 fully
- `claudes-math-marauder/data/monsters.json` — add ~20 more monsters across realms 2–5
- `claudes-math-marauder/data/bosses.json` — add 4 more bosses (one per realm 2–5)
- `claudes-math-marauder/data/spells.json` — verify all 10 starter spells, add 6 more shop-only spells
- `claudes-math-marauder/data/classes.json` — add 3 more classes (Pyromancer already drafted in S4)
- `claudes-math-marauder/data/story.json` — add chapters 2–5 (one per boss kill)
- `claudes-math-marauder/data/events.json` — add 8 more events (total 13)
- `claudes-math-marauder/scripts/validate-data.js` — extend to check the new constraints

## Deliverables

### 1. `realms.json` — 5 realms total

Each realm gets a unique fact-family-weight profile. The progression is designed so the player encounters every fact family by Realm 5. Earlier realms revisit easy families to give the kid wins; later realms front-load harder families.

| Realm | Tier | Theme | Family weights (notable) | Stretch enabled? |
|---|---|---|---|---|
| 1: Forest of Threes | 1 | green/cream forest | x2,x3,x5,x10 dominant | yes (mastered only) |
| 2: Goblin Mines | 2 | dim purple mines | x4,x6,x7 dominant; light x3,x5,x8 | yes |
| 3: Dragon's Spire | 3 | red/orange volcano | x6,x7,x8,x9 dominant | yes |
| 4: Sky Citadel | 4 | blue/silver clouds | x7,x8,x9,x11,x12 dominant | yes |
| 5: Void Crucible | 5 | black/violet void | all families equal weight; division-heavy | yes |

```json
{
  "id": "goblin_mines",
  "tier": 2,
  "name": "Goblin Mines",
  "description": "A maze of tunnels lit by greenglow torches.",
  "palette": {
    "bg": "#3A2A4A",
    "accent": "#7A5A8A",
    "ink": "#1A0A2A",
    "highlight": "#FCD86A"
  },
  "silhouettes": ["pickaxe", "ore", "torch"],
  "monsterPool": ["goblin_grunt", "kobold_thief", "bat_swarm", "tunnel_spider", "elder_goblin"],
  "bossId": "shaman_zorgath",
  "factFamilyWeights": {
    "x0": 0,
    "x1": 0,
    "x2": 0.05,
    "x3": 0.05,
    "x4": 0.18,
    "x5": 0.10,
    "x6": 0.20,
    "x7": 0.18,
    "x8": 0.12,
    "x9": 0.05,
    "x10": 0.07,
    "x11": 0,
    "x12": 0
  },
  "nodeCounts": { "totalNodes": 13, "elites": 2, "shops": 2, "rest": 1, "mystery": 2 },
  "rewardMultiplier": 1.2,
  "unlockedBy": "beat_goblin_warlord"
}
```

Repeat for realms 3, 4, 5 with appropriate weights and `nodeCounts` scaling slightly upward (15, 17, 19 nodes).

### 2. `monsters.json` — 24+ total monsters

Roster targets per realm:
- Realm 1: 4 monsters (already done in S4) + 2 elite variants
- Realm 2: 4 base + 1 elite
- Realm 3: 5 base + 2 elite (volcano theme — fire imps, lava elementals, dragon whelps)
- Realm 4: 5 base + 2 elite (cloud theme — wind sylphs, sky knights, storm callers)
- Realm 5: 5 base + 2 elite (void theme — null wraiths, paradox golems, eldritch eyes)

Each monster has fields per S4 schema:
- `id`, `name`, `realm`, `tier` (1–3 within realm), `hpHits`, `damageMultiplier`, `palette`, `parts[]`, `idleAnim`, `attackAnim`, `voiceProfile`, `flavorText`

**New for elites:** `isElite: true`, +1 hpHit, ~25% bigger sprite, slightly brighter highlight color, occasional dialog quip.

### 3. `bosses.json` — 5 bosses total

Each realm boss has 3 phases. Phase design follows the template:
- **Phase 1**: orb cast on a fact family the realm emphasized
- **Phase 2**: orb cast on a *harder* family the realm introduced
- **Phase 3**: typed ultimate (or stretch-fact ultimate) using a stretched fact

| Boss | Realm | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| Goblin Warlord | 1 | x5 div | x10 mul | stretch (if any mastered) or x10 ultimate |
| Shaman Zorgath | 2 | x4 mul | x7 div | x6 ultimate |
| Spire Dragon Vrak'tor | 3 | x8 mul | x9 div | x7 stretch ultimate |
| Sky Lord Aerion | 4 | x11 div | x12 mul | x9 stretch ultimate |
| Void King Null | 5 | random hard mul | random hard div | full-keyboard ultimate (any answer 1–144) |

Each boss includes `introSpeech`, `phaseHints[]`, `defeatSpeech`, `voiceProfile`, `palette`, `parts` (bigger / more elaborate than monsters), and `koCinematicNotes`.

### 4. `spells.json` — 16 total spells

**Starter (free, in starter decks):**
1. Ember Bolt (Apprentice starter, fire, 1 hit, x3 hint)
2. Frost Lance (ice, 1 hit, x4 hint)
3. Stone Hammer (earth, 1 hit, x6 hint)
4. Wind Slash (air, 1 hit, x5 hint)
5. Spark Dart (lightning, 1 hit, x2 hint)

**Shop-only (cost 80–150 gold):**
6. Inferno (fire, 2 hits, x7 hint)
7. Glacial Spike (ice, 2 hits, x8 hint)
8. Earthen Ward (earth, 1 hit + heal 15, x6 hint)
9. Storm Lash (lightning, 2 hits, x9 hint)
10. Mind Pierce (psychic, 1 hit ignoring armor, x11 hint)
11. Solar Flare (light, 2 hits, x12 hint)
12. Spectral Bolt (shadow, 1 hit + lifesteal 10, x10 hint)
13. Time Stop (utility, 1 hit + +50% answer time on next problem, x4 hint)
14. Twin Comet (fire, 1.5 hits avg, x6 hint, "rolls" damage)
15. Voidbeam (void, 2 hits, x12 hint, only available in Realm 5 shops)
16. Truth's Hammer (light, 3 hits, stretch x5 hint, very rare)

Each spell entry:
```json
{
  "id": "ember_bolt",
  "name": "Ember Bolt",
  "icon": "🔥",
  "element": "fire",
  "factFamilyHint": "x3",
  "baseDamage": 1.0,
  "description": "A bolt of red flame.",
  "cost": null,
  "rarity": "common",
  "starterFor": ["apprentice"],
  "effects": []
}
```

### 5. `classes.json` — 4 classes total

```
1. Apprentice — starter — bonus: +1 starting HP, balanced
2. Pyromancer — unlocked after beating Realm 2 — bonus: +20% damage on x3, x6, x7 (fire-aligned)
3. Stormcaller — unlocked after Realm 3 — bonus: +10% ultimate charge gain (faster ultimate)
4. Voidweaver — unlocked after Realm 5 (NG+) — bonus: stretch facts available even without mastery (with a small score penalty)
```

Each class has `id`, `name`, `description`, `unlockCondition`, `startingDeck` (4 spell IDs), `passiveBonus`, `iconColor`.

### 6. `story.json` — 5 chapters

```
Chapter 1: "The Wizard Awakens" — 4 panels — unlocks at game start
Chapter 2: "Goblin Warlord Falls" — 5 panels — unlocks after Realm 1 boss
Chapter 3: "Whispers in the Mines" — 6 panels — unlocks after Realm 2 boss
Chapter 4: "The Spire of Dragons" — 6 panels — unlocks after Realm 3 boss
Chapter 5: "Sky Citadel" — 6 panels — unlocks after Realm 4 boss
Chapter 6 (epilogue): "The Void Within" — 8 panels — unlocks after Realm 5 boss
```

Each panel:
```json
{
  "id": "ch2_p1",
  "imageDescriptor": "<JSON describing canvas-rendered panel>",
  "narration": "The Goblin Warlord falls. His warhammer shatters into stardust.",
  "voiceProfile": { "rate": 0.95, "pitch": 1.0 }
}
```

`imageDescriptor` is a small JSON DSL the renderer reads to draw a procedural panel: e.g., `{ scene: "interior_tower", figures: [{ id: "wizard", pose: "stand_left" }, { id: "fallen_goblin", pose: "lie_right" }], caption: "Victory!" }`. Implementation in Session 12.

### 7. `events.json` — 13 events

Categories: 🧙 Boon (3), 🪦 Curse (3), 🎁 Loot (3), 🤝 Encounter (3), 🌀 Chaos (1).

Each event has 2–4 choices. Each choice has an outcome formatted as:
```json
{
  "id": "wandering_merchant",
  "title": "Wandering Merchant",
  "description": "An old merchant offers you a strange deal.",
  "choices": [
    { "label": "Buy a random spell (60 gold)", "outcome": { "kind": "buy_random_spell", "cost": 60 } },
    { "label": "Politely decline", "outcome": { "kind": "noop" } }
  ]
}
```

Outcome kinds (handled in `run/events.js` — built in S9):
- `buy_random_spell` — adds random unowned spell, deducts gold
- `gain_gold` — adds N gold
- `lose_gold` — deducts N gold
- `gain_max_hp` — increases base wizard HP for this run
- `boon_streak_start` — start the next fight at streak 3
- `curse_orb_fewer` — next 2 fights show only 3 orbs (fewer answer options) [stretch]
- `noop`

### 8. `scripts/validate-data.js` extensions

Add validators for:
- Realm `factFamilyWeights` sum to 1.0 (±0.01 tolerance)
- Boss phases reference valid `factFamilyHint` values
- Boss `phases.length === 3` (spec contract)
- Spell `starterFor[]` IDs all exist in `classes.json`
- Class `startingDeck` IDs all exist in `spells.json`
- Story chapter IDs unique; `imageDescriptor.figures[].id` present in a known figure registry (figure registry built in S12 — for now, validator just checks JSON parses)
- Event outcome `kind` is one of the known set
- Monster IDs unique; `realm` references existing realm
- All palette colors are valid 7-char hex (`/^#[0-9A-Fa-f]{6}$/`)

### 9. Data scale check

After this session, the totals should be approximately:
- 5 realms
- ~24 monsters
- 5 bosses
- 16 spells
- 4 classes
- 6 story chapters
- 13 events

### 10. Run-time integration sanity test

Manual: do a full run of each realm. Each run should:
- Pull problems with the realm's `factFamilyWeights` distribution
- Display monsters from the realm's `monsterPool`
- Open a shop with realm-tier spells
- Reach a boss that uses the realm-appropriate phases
- On boss kill: unlock the next realm + the next class (if applicable) + the next story chapter

## Tests to run

Automated:
- [ ] Run `/validate-marauder-data` — passes for all data files
- [ ] Run `node scripts/validate-data.js` — exit 0
- [ ] Existing Layer-1 tests still pass

Manual playtest:
- [ ] Realm 1 → Realm 2 → ... → Realm 5: each realm has unique palette, monster set, boss
- [ ] Beating Realm 2 boss unlocks Pyromancer class + advances story to chapter 3
- [ ] Pyromancer's +20% damage on x3,x6,x7 fires correctly (verified via score check)
- [ ] Codex heatmap shows ALL 169 facts (no missing cells)
- [ ] All 13 events trigger correctly when their node is opened
- [ ] All 16 spells castable when equipped (no missing assets / strings)

Edge cases:
- [ ] Voidweaver class: unlocked only after Realm 5; stretch facts work without mastery (with score penalty applied)
- [ ] Shop in Realm 5 can sell Voidbeam (only place it appears)
- [ ] Realm 5 boss "Void King Null" full-keyboard ultimate accepts any 2-digit answer

## Acceptance checklist

- [ ] All 5 realms playable end-to-end
- [ ] Every fact family appears in at least one realm with weight > 0
- [ ] Every realm's `factFamilyWeights` sums to 1.0
- [ ] Every boss has 3 phases with correct hint/mode shape
- [ ] Class unlock chain works (Apprentice → Pyromancer → Stormcaller → Voidweaver)
- [ ] Story panel chain works (Ch1 default → Ch6 epilogue)
- [ ] All data files pass validators
- [ ] No `Math.random()` calls in any of the new pure logic — only seeded `_rng`

## Session end

1. Run `/validate-marauder-data` and `/marauder-checklist`
2. Run all Layer-1 tests
3. Manual playtest: complete a full Realm 5 run end-to-end
4. Run `marauder-web-review` agent
5. Commit `Session 11: data — 5 realms, 24 monsters, 5 bosses, 16 spells, 4 classes, 6 story chapters`
6. Push to `main`
