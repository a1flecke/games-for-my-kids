# Session 11: Level 4 - Church Fathers & Abilities

**Recommended Model: Sonnet** - The ability system is well-defined with clear triggers (reveal hidden things, decode text, break barriers). Environmental puzzles are straightforward gating mechanics. Content creation follows established patterns.

## Goal
Level 4 with ability system. Three learnable powers from Church Fathers. Environmental puzzles requiring specific abilities. Monastery setting.

## Tasks

1. **Ability system** (new mechanic):
   - 3 abilities, each learned from a Church Father NPC:
     - **Augustine's Wisdom**: Reveal hidden messages/doors (toggle overlay showing secret passages)
     - **Jerome's Translation**: Decode Latin inscriptions (interact with Latin text tiles to solve puzzles)
     - **Ambrose's Courage**: Break barriers and access special dialogue options
   - Activate with number keys (4, 5, 6) or touch icons
   - Visual indicator when ability is active (glow effect, icon in HUD)
   - Environmental challenges require specific abilities to progress
   - Must collect all 3 to reach final area
2. **Create `data/levels/level4.json`**:
   - 24x20 tiles per plan
   - Monastery Courtyard: central hub connecting all areas
   - Augustine's Study: philosophy puzzles, hidden message walls
   - Jerome's Scriptorium: Latin inscription puzzles
   - Ambrose's Chapel: courage trial (dialogue choices + barrier breaking)
   - Forbidden Library: requires all 3 abilities
   - Secret Archives: hidden lore area (requires Augustine's Wisdom)
3. **Create `content/level4_dialogue.js`**:
   - Augustine: teaches about Confessions, City of God, grants Wisdom ability
   - Jerome: teaches about Vulgate translation, grants Translation ability
   - Ambrose: teaches about confronting Emperor Theodosius, grants Courage ability
   - ~22 dialogue boxes total
4. **Level 4 enemies**: Book Burner (HP:50, ATK:9), Imperial Censor (HP:70, ATK:12), Corrupt Prefect boss (HP:140, ATK:16)
5. **Level 4 questions** (8 total per plan)
6. **Level 4 collectibles**: 3 Church Father Scrolls (unlock abilities), Augustine's Ring, Jerome's Pen, Ambrose's Staff, 4 Bread

## Files Modified
- `js/game.js` (ability system, Level 4 loading)
- `js/player.js` (ability state, ability activation)
- `js/renderer.js` (ability visual effects, monastery tiles)
- `js/hud.js` (ability icons display)
- `js/combat.js` (ability effects in combat)
- `data/enemies.json`, `data/questions.json`, `data/items.json`

## Files Created
- `js/abilities.js` (ability system)
- `data/levels/level4.json`
- `content/level4_dialogue.js`

## Validation
- Each Church Father teaches and grants an ability
- Abilities activate with correct keys
- Environmental puzzles require correct ability
- Hidden doors revealed by Wisdom
- Latin inscriptions decoded by Translation
- Barriers broken by Courage
- All 3 needed for Forbidden Library
- Level completes in 14-18 minutes
