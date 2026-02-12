# Session 10: Level 3 - Creeds & Puzzles

**Recommended Model: Sonnet** - The puzzle system (ordering 5 fragments) is well-defined with clear correct answers and hint logic. Multi-phase boss adds complexity but builds on existing combat system. Content-heavy but structurally straightforward.

## Goal
Level 3 with puzzle mechanic. Creed Fragment assembly. Library setting. Athanasius NPC. Debate-style boss fight with Arius.

## Tasks

1. **Puzzle system** (new mechanic):
   - Creed assembly UI: 5 fragments displayed, player arranges in correct order
   - Navigation: arrow keys to select fragment, SPACE to place
   - Correct order: "We believe in one God" -> "The Father Almighty" -> "And in one Lord Jesus Christ" -> "Of one being with the Father" -> "Who came down from heaven"
   - Hints: After 2 wrong attempts, highlight the next correct fragment
   - Educational: each fragment teaches part of the creed when selected
   - Success: door opens, celebration animation
   - Failure: "Try again!" with encouragement, no penalty
2. **Create `data/levels/level3.json`**:
   - 22x18 tiles per plan
   - Grand Library: central hub with bookshelves (decorative tiles)
   - 5 Bishop Chambers: one fragment each, accessed from library
   - Council Chamber: puzzle room where fragments are assembled
   - Athanasius's Study: checkpoint with lore
   - Debate Hall: boss area for Arius fight
3. **Create `content/level3_dialogue.js`**:
   - Athanasius: explains the problem (different teachings), introduces quest
   - 5 Bishops: each gives one Creed Fragment and teaches about it
   - Pre-puzzle dialogue explaining what to do
   - Post-puzzle congratulations
   - Arius pre-boss dialogue (theological debate framing)
   - ~20 dialogue boxes total
4. **Level 3 enemies**:
   - Confused Scholar (HP:40, ATK:6)
   - Arian Follower (HP:60, ATK:11)
   - Arius (HP:120, ATK:14) - multi-stage boss (2 phases)
     - Phase 1: standard combat
     - Phase 2: question-focused (must answer correctly to deal damage)
5. **Level 3 questions** (7 total per plan)
6. **Level 3 collectibles**: 5 Creed Fragments, Athanasius's Letter, Trinity Shield (+8 def), 2 Scripture Scrolls
7. **Multi-stage boss support**: Add phase system to combat.js for boss fights with multiple phases

## Files Modified
- `js/game.js` (puzzle state, Level 3 loading)
- `js/combat.js` (multi-phase boss support)
- `js/renderer.js` (library tiles, puzzle UI rendering)
- `data/enemies.json` (Level 3 enemies)
- `data/questions.json` (Level 3 questions)
- `data/items.json` (Level 3 items)

## Files Created
- `js/puzzle.js` (Creed assembly puzzle system)
- `data/levels/level3.json`
- `content/level3_dialogue.js`

## Validation
- Library environment renders correctly
- 5 bishop chambers accessible
- Creed Fragments collectible
- Puzzle UI works (arrange 5 fragments)
- Hints appear after 2 failures
- Correct assembly opens door
- Arius boss has 2 phases
- Level completes in 12-16 minutes
