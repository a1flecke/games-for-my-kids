# Session 5: Combat System

**Recommended Model: Opus** - Complex new system with many interacting parts: turn state machine, damage formulas, enemy AI, question integration, UI layout, transitions, and victory/defeat flows. Needs careful design to avoid bugs.

## Goal
Turn-based combat with educational questions. Entry/exit transitions. Player actions: Attack, Defend, Use Item, Answer Question. Enemy AI. Victory/defeat flows.

## Tasks

1. **Create `js/combat.js`** - Turn-based combat engine:
   - **Combat state**: player turn, enemy turn, animating, victory, defeat
   - **Entry**: Player walks into enemy -> fade to black (300ms) -> combat screen
   - **Exit**: Victory -> XP + items -> fade back to exploration. Defeat -> respawn at checkpoint.
   - **Player actions**:
     - Attack: `(attack - defense/2) + random(-2, +2)`, 10% crit (2x), 5% miss
     - Defend: Reduce incoming damage by 50% for one turn
     - Use Item: Opens mini-inventory of consumables
     - Answer Question: Correct = heal 20 HP or +50% next attack. Incorrect = brief explanation, no penalty, can retry next turn.
   - **Enemy AI** (simple):
     - Always attacks (no complex behavior for MVP)
     - Boss enemies: alternate attack/special patterns
   - **Combat UI**:
     - Enemy sprite: top-center (colored rectangle placeholder with name)
     - Health bars: player (bottom-left) and enemy (top) with numeric HP display
     - Action menu: bottom-right, large buttons (44x44px minimum)
     - Damage numbers: float up animation
     - Turn indicator text
   - **Victory**: "+X XP" display, level-up check, item drops, enemy removed from map
   - **Defeat**: "You were defeated..." with hint text, respawn at last checkpoint with 50% HP
2. **Create `data/enemies.json`** - Enemy definitions:
   - Level 1 enemies per plan:
     - Doubtful Villager (HP:30, ATK:5)
     - Roman Scout (HP:50, ATK:8)
     - Roman Centurion - Boss (HP:80, ATK:12)
   - Include: name, hp, attack, defense, xpReward, itemDrops, portrait, isBoss flag
3. **Create `js/questions.js`** - Question system:
   - Load questions from data
   - Track which questions have been asked (don't repeat in same combat)
   - Multiple choice (3 options) with explanation on answer
   - Filter questions by current level
   - Display: question text + 3 choice buttons, navigate with arrows
4. **Create `data/questions.json`** - Question bank:
   - All 5 Level 1 questions from plan Section 5.1
   - Format: `{ question, choices: [{text, correct, explanation}], level, topic }`
5. **Wire combat into game state machine**:
   - PLAYING -> COMBAT transition on enemy collision
   - COMBAT -> PLAYING on victory
   - COMBAT -> PLAYING (at checkpoint) on defeat
   - Enemy entities on map with patrol behavior (simple: walk back and forth)

## Files Modified
- `js/game.js` (combat state, enemy collision detection)
- `js/renderer.js` (enemy rendering on overworld map)
- `index.html` (new script tags)

## Files Created
- `js/combat.js`
- `js/questions.js`
- `data/enemies.json`
- `data/questions.json`

## Validation
- Walk into enemy -> combat screen appears
- All 4 actions work (Attack, Defend, Item stub, Question)
- Damage formula matches plan spec
- Questions display with 3 choices
- Correct answer heals or boosts
- Wrong answer shows explanation
- Victory awards XP, removes enemy from map
- Defeat respawns at checkpoint with hint
- Boss fight works with higher stats
