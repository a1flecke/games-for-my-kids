# Session 9: Level 2 - Persecutions & Stealth

**Recommended Model: Opus** - New stealth mechanic with vision cones, patrol AI, and detection logic is architecturally complex. Requires careful design of guard behavior, hiding spots, and integration with existing combat.

## Goal
Level 2 with stealth mechanic. Guards patrol with vision cones. Player can sneak or fight. New collectibles (Martyr Tokens). New NPCs (Polycarp). Level 2 map and all content.

## Tasks

1. **Stealth system** (new mechanic):
   - Guard entities with patrol routes (defined in level JSON: array of waypoints)
   - Vision cone rendering: triangular area in front of guard, rendered semi-transparently
   - Detection: player in vision cone for >0.5 seconds = alert -> forced combat (harder enemies)
   - Hiding spots: special tiles (alcoves, shadow tiles) where player is invisible to guards
   - Stealth bonus: successfully sneaking past guard = bonus item or XP
   - Visual indicator: "!" above guard when detecting, "!!" when alerted
2. **Create `data/levels/level2.json`**:
   - 25x20 tiles per plan
   - Winding catacomb labyrinth
   - 3-4 patrol guards with overlapping routes
   - Secret passages (hidden walls that can be walked through)
   - Shrine room (checkpoint with Polycarp lore)
   - Escape tunnel (final exit)
   - Polycarp NPC location
3. **Create `content/level2_dialogue.js`**:
   - Polycarp: explains persecution, martyrdom, and the underground church
   - Martyr stories: Polycarp, Ignatius, Perpetua, Felicity (each awards a Martyr Token)
   - Fish symbol (Ichthys) teaching dialogue
   - Guard encounters (branching dialogues)
   - ~18 dialogue boxes total
4. **Level 2 enemies**:
   - Roman Patrol (HP:45, ATK:10) - patrolling guards, avoidable
   - Informant (HP:35, ATK:7) - surprise encounters in dead ends
   - Prefect (HP:100, ATK:15) - boss at escape tunnel
5. **Level 2 questions** (6 total per plan):
   - Why Rome persecuted Christians
   - What is a martyr
   - Fish symbol meaning
   - Ichthys meaning
   - Why meet in catacombs
   - Who was Polycarp
6. **Level 2 collectibles**:
   - 4 Martyr Tokens (quest items from NPC dialogues)
   - Ichthys Pendant (equipment: stealth detection range reduced)
   - Church Father Letter (lore collectible)
   - 3 Bread
7. **Victory condition**:
   - All 4 Martyr Tokens collected
   - Prefect boss defeated
   - Escape tunnel accessible
   - Level 2 complete screen

## Files Modified
- `js/game.js` (stealth system update loop, Level 2 loading)
- `js/renderer.js` (vision cone rendering, stealth UI elements)
- `js/npc.js` (patrol behavior, vision cone logic)
- `js/enemy.js` (patrol route following)
- `data/enemies.json` (add Level 2 enemies)
- `data/questions.json` (add Level 2 questions)
- `data/items.json` (add Level 2 items)

## Files Created
- `data/levels/level2.json`
- `content/level2_dialogue.js`

## Validation
- Guards patrol along defined routes
- Vision cones render and detect player
- Hiding spots make player invisible
- Stealth bypass awards bonus
- Detection triggers harder combat
- All 4 Martyr Tokens collectible
- Boss fight works
- Level completes in 10-14 minutes
