# Session 8: Level 1 Complete & Tutorial

**Recommended Model: Opus** - Integration session requiring all systems to work together. Tutorial design, content writing, playtesting, and balancing require holistic understanding of the game. High complexity.

## Goal
Fully playable Level 1 from start to finish. Tutorial teaches all mechanics. All dialogue, questions, enemies, and collectibles in place. Victory unlocks Level 2.

## Tasks

1. **Design and finalize Level 1 map** (`data/levels/level1.json`):
   - 20x15 tiles per plan
   - Starting chamber: safe zone, Peter NPC, altar save point
   - Three branching paths: Peter path (west), James path (north), John path (east)
   - Each path has 1 apostle NPC + enemies + collectibles
   - Hidden room (breakable wall or hidden passage) with Scripture Scroll
   - Midpoint altar (checkpoint)
   - Boss room: Roman Centurion guards exit door
   - Exit door requires 3 Apostle Coins
2. **Tutorial sequence** (first-time player):
   - Movement tutorial: "Use WASD or Arrow Keys to walk" (auto-triggers on new game)
   - Interaction tutorial: Walk near Peter -> "Press SPACE to talk"
   - First dialogue with Peter (introduces story)
   - Combat tutorial: scripted easy fight with Doubtful Villager (reduced stats)
   - "You can save at glowing altars" prompt near first altar
   - Inventory tutorial: "Press I to see your items" after first item pickup
   - Track tutorial completion in save data (don't repeat)
3. **Complete Level 1 dialogue** (`content/level1_dialogue.js`):
   - All ~15 dialogue interactions
   - Peter: mission briefing, awards Apostle Coin
   - James: teaching about spreading the word, awards Apostle Coin
   - John: teaching about love, awards Apostle Coin
   - Roman Guard encounter (branching: honest/excuse/silence)
   - Boss pre-fight and post-victory dialogue
   - Historical fact NPCs (optional side conversations)
4. **Level 1 enemies fully configured**:
   - Doubtful Villager: appears on Peter and James paths
   - Roman Scout: appears on John path and near boss room
   - Roman Centurion (boss): guards exit, harder stats, dialogue before fight
   - Enemies don't respawn once defeated (tracked in save)
5. **Victory condition**:
   - All 3 Apostle Coins collected
   - Roman Centurion defeated
   - Exit door unlocks
   - Victory dialogue plays
   - "Level 1 Complete!" screen with stats (time, questions answered, items found)
   - Transition to Level 2 (or "To be continued" if Level 2 isn't built yet)
6. **Quest tracking**:
   - Quest flags: `met_peter`, `met_james`, `met_john`, `coin_peter`, `coin_james`, `coin_john`, `boss_defeated`, `level1_complete`
   - HUD objective updates based on flags
   - Door lock checks quest flag state

## Files Modified
- `js/game.js` (tutorial flow, victory condition, level transitions)
- `js/screens.js` (victory screen)
- `js/hud.js` (objective text updates)
- `data/levels/level1.json` (finalize map design)
- `content/level1_dialogue.js` (complete all dialogue)
- `data/enemies.json` (verify Level 1 enemy stats)
- `data/questions.json` (verify Level 1 questions)

## Validation
- New game -> tutorial plays -> player understands all controls
- Can explore all 3 paths
- Collect all 3 Apostle Coins through NPC dialogues
- Fight and defeat all enemies including boss
- Questions appear in combat and work correctly
- Inventory fills with items from chests
- Save at altars and auto-save both work
- Die to boss -> respawn at checkpoint with hint
- Complete level -> victory screen -> (placeholder for Level 2)
- Full playthrough: 9-12 minutes as planned
