# Session 12: Level 5 - Constantine & Final Challenge

**Recommended Model: Opus** - Most complex session. Multi-phase boss integrating ALL previous mechanics (combat, stealth, puzzles, abilities). Three-act structure with dramatic palette shift. Victory sequence with credits. Requires holistic understanding of every system.

## Goal
Final level with 3-act structure. Transition from underground to surface. Multi-phase final boss using ALL previously learned mechanics. Victory sequence and epilogue.

## Tasks

1. **Three-act level structure**:
   - **Act 1 (Underground)**: Constantine's vision narrative, Chi-Rho symbol teaching, catacomb exit ascending upward
   - **Act 2 (Surface)**: FIRST TIME ABOVE GROUND - bright palace with different color palette (golds, whites, blues vs. dark browns), meet Constantine in throne room, Edict of Milan ceremony dialogue
   - **Act 3 (Arena)**: Final boss fight with General of old regime
2. **Multi-phase final boss**:
   - Phase 1: Standard combat (test combat skills)
   - Phase 2: Stealth phase (dodge attacks, use hiding spots - reuses Level 2 mechanic)
   - Phase 3: Puzzle phase (arrange Chi-Rho and cross symbols - reuses Level 3 mechanic)
   - Phase 4: Ability phase (use all 3 Church Father abilities - reuses Level 4 mechanic)
   - General stats: HP:200, ATK:18
3. **Create `data/levels/level5.json`**:
   - 28x22 tiles (largest level)
   - Catacomb Exit: ascending tunnel with light increasing
   - Palace Courtyard: open, bright, monumental architecture
   - Throne Room: Edict ceremony
   - Imperial Arena: final boss arena
   - Victory Monument: epilogue location
4. **Create `content/level5_dialogue.js`**:
   - Constantine's vision cutscene (narrative dialogue sequence)
   - Chi-Rho symbol explanation
   - Battle of Milvian Bridge narrative
   - Constantine meeting and Edict of Milan
   - Final boss pre-fight and inter-phase dialogue
   - Victory and epilogue (scrolling historical summary)
   - ~25 dialogue boxes total
5. **Surface palette**: New tile colors for above-ground areas (light stone, marble, gold accents, blue sky background)
6. **Victory sequence**:
   - Boss defeated
   - "Church triumphant" cutscene dialogue
   - Scrolling credits with historical facts
   - "You've completed 300 years of church history!" summary
   - Final stats (total playtime, questions correct, items found)
   - Return to title screen
7. **Level 5 questions** (4 total for boss phases)
8. **Level 5 collectibles**: Chi-Rho Shield (+10 def), Imperial Seal, Commemorative Coins, 5 Bread

## Files Modified
- `js/game.js` (3-act structure, victory sequence, credits)
- `js/combat.js` (4-phase boss logic integrating stealth/puzzle/abilities)
- `js/renderer.js` (surface palette, palace tiles, credits scroll)
- `js/screens.js` (final victory/credits screen)
- `data/enemies.json`, `data/questions.json`, `data/items.json`

## Files Created
- `data/levels/level5.json`
- `content/level5_dialogue.js`

## Validation
- 3-act progression works
- Visual shift from dark catacombs to bright palace is dramatic
- All 4 boss phases use different mechanics correctly
- Victory sequence plays in full
- Credits scroll with facts
- Game loops back to title screen
- Full playthrough: 16-20 minutes
