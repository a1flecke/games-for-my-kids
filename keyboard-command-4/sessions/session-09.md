# Session 9 — Levels 8–10 Content (Sonnet)

## Goal

Create JSON data files for Levels 8–10. These are the endgame levels: advanced shortcuts, multi-step combos, and the final boss rush. Maximum difficulty with all monster types and mostly Action Mode prompts.

## Files to Create

### `data/levels/level8.json` — Advanced Armory

**Theme:** `armory` — red, black, orange, volcanic forge, glowing runes
**Shortcuts used:** cmd_shift_z, cmd_shift_v, cmd_shift_3, cmd_shift_4, cmd_shift_n, cmd_comma, cmd_semicolon (+ heavy review)
**Rooms:** 5 standard + 1 bonus + 1 boss
**Monster types:** All 7 types in play. Gremlin (15%), Brute (15%), Shifter (20%), Mage (15%), Swarm (10%), Knight (15%), Phantom (10%)

- **Room 1**: 2 Gremlins + 2 Shifters — Cmd+Shift+Z (Redo), Cmd+Shift+V (Paste clean)
- **Room 2**: 1 Knight + 1 Phantom + 2 Gremlins — Knight shield = Cmd+Shift+3, Phantom fakes screenshot shortcut
- **Room 3**: 1 Worm Swarm + 1 Mage + 2 Gremlins — rapid-fire review of all Cmd+Shift combos
- **Room 4**: 2 Knights + 1 Brute + 1 Shifter — all Action Mode ("Redo last action", "Paste without formatting")
- **Room 5**: 2 Phantoms + 2 Shifters + 1 Mage — maximum deception + recall challenge
- **Bonus room**: 3 Knights + 2 Phantoms + 1 Brute — very hard
- **Items:** Health pack after rooms 2 and 4, Full Restore before boss, Gravity Gun (weapon 9) after room 3
- **Boss:** The Cipher — 4 phases: Cmd+Shift+3 → Cmd+Shift+Z → Cmd+Shift+V → Cmd+,

### `data/levels/level9.json` — Combo Catacombs

**Theme:** `catacombs` — gold, dark green, ancient temple, puzzle mechanisms
**Shortcuts used:** Multi-step combo sequences from plan.md §3.1 Level 9 (+ all previous)
**Rooms:** 5 standard + 1 boss
**Monster types:** All types. New mechanic: **Combo Monsters** that require a sequence of shortcuts.

**Combo Monster mechanic:**
- A special monster variant that requires 2–4 shortcuts in sequence
- Displayed as a larger monster with segmented health bar
- Each segment shows one shortcut in the sequence
- Must be pressed in order; wrong key at any point resets the sequence
- Type can be any base monster type (e.g., a "Combo Brute")

- **Room 1**: 2 Gremlins + 1 Combo Gremlin — Cmd+A → Cmd+C (2-step, gentle intro)
- **Room 2**: 1 Combo Brute + 2 Gremlins — Cmd+A → Cmd+X → Cmd+Tab → Cmd+V (4-step)
- **Room 3**: 2 Combo Gremlins + 1 Shifter + 1 Mage — Cmd+F → Cmd+G (2-step) and Cmd+Z → Cmd+Z → Cmd+Z (3-step)
- **Room 4**: 1 Combo Knight + 2 Gremlins + 1 Phantom — Knight shield is a 2-step combo
- **Room 5**: 3 Combo Gremlins + 1 Combo Shifter — heavy combo practice, Action Mode
- **Items:** Health pack after rooms 2 and 4, Full Restore before boss
- **Boss:** The Combo Wraith — 6 phases: Cmd+A → Cmd+C → Cmd+Tab → Cmd+V → Cmd+S → Cmd+W (the "full workflow")

**Note:** Combo monsters in level JSON use an array for `shortcut`:
```json
{ "type": "gremlin", "depth": 0.4, "shortcut": ["cmd_a", "cmd_c"], "mode": "key", "combo": true }
```

### `data/levels/level10.json` — Corruption Core (Final Level)

**Theme:** `core` — black, red glitch, corrupted pixels, static tears
**Shortcuts used:** ALL shortcuts from the full database (+ new: cmd_shift_a, cmd_option_v)
**Rooms:** 3 standard + 2 boss-mini + 1 final boss
**Monster types:** All types at maximum density. Mostly Action Mode.

- **Room 1**: 6 Gremlins rapid-fire — random review of Level 1–5 shortcuts (warm-up)
- **Room 2**: 2 Knights + 2 Phantoms + 2 Shifters — Level 6–8 shortcuts, all Action Mode
- **Room 3**: 1 Worm Swarm + 2 Combo Brutes + 2 Mages — combo sequences + time pressure
- **Mini-boss 1:** "Corruption Sentinel" — 3 phase boss using random Level 1–5 shortcuts
- **Mini-boss 2:** "Corruption Herald" — 4 phase boss using random Level 6–9 shortcuts
- **Items:** Full Restore before each boss encounter, MEGA Cannon (weapon 10) after mini-boss 2
- **Final Boss:** The Corruption — 7 phases, 5-second timer per phase:
  - Phase 1: Random basic shortcut (Level 1–2)
  - Phase 2: Random text shortcut (Level 3–4)
  - Phase 3: Random selection shortcut (Level 5)
  - Phase 4: Random app/browser shortcut (Level 6–7)
  - Phase 5: Random advanced shortcut (Level 8)
  - Phase 6: 3-step combo sequence
  - Phase 7: 5-step combo sequence (the ultimate test)

  Between phases, The Corruption taunts:
  - "You think you know your shortcuts? HA!"
  - "I AM every key you've forgotten!"
  - "This realm belongs to CHAOS now!"
  - "You can't undo ME!"
  - "My corruption is PERMANENT!"
  - "One more phase... you'll NEVER make it!"
  - "IMPOSSIBLE! NO ONE masters ALL the commands!"

**Victory sequence:**
- The Corruption explodes in a 5-second animation (glitch effects clearing, color restoring)
- "THE DIGITAL REALM IS RESTORED!" title card
- Commander Byte congratulations dialogue
- Final stats: total shortcuts mastered, total accuracy, total play time
- "COMMAND KNIGHT — MASTER RANK" achievement unlocked

## Rules

Same as previous level sessions, plus:
- Level 10 final boss phases use random shortcut selection — the JSON specifies a category/level range, not a fixed shortcut. The JS code will randomize at runtime.
- Combo monsters use array `shortcut` fields
- Level 10 is the only level with a 5-second timer per boss phase (urgency mechanic for the finale)
- Mini-bosses use the boss format but with fewer phases
- MEGA Cannon (weapon 10) unlocked in level 10 after mini-boss 2

## Do NOT

- Do not modify any JS files
- Do not use monster types or mechanics not defined in the plan
- Do not make the final boss longer than 7 phases (fatigue risk)
