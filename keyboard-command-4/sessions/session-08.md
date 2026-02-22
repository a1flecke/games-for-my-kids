# Session 8 — Levels 5–7 Content (Sonnet)

## Goal

Create JSON data files for Levels 5–7. These are mid-game levels introducing text selection, app management, and browser shortcuts. Difficulty escalates with new monster types and Action Mode prompts.

## Files to Create

### `data/levels/level5.json` — Selection Stronghold

**Theme:** `stronghold` — steel gray, blue, highlight beams
**Shortcuts used:** shift_left, shift_right, shift_up, shift_down, cmd_shift_left, cmd_shift_right, option_shift_left, option_shift_right (+ review of Levels 1–4)
**Rooms:** 5 standard + 1 boss
**Monster types:** Gremlin (30%), Brute (20%), Shifter (25%), Mage (15%), Worm Swarm (10% — first appearance!)

- **Room 1**: 3 Gremlins — Shift+Arrow basics (Key Mode)
- **Room 2**: 4 Gremlins + 1 Shifter — Cmd+Shift combos, Shifter tests recall
- **Room 3**: 1 Worm Swarm (5 worms) — rapid-fire Shift+Arrow shortcuts, first horde encounter
- **Room 4**: 2 Mages + 3 Gremlins — Mages at back with Option+Shift combos
- **Room 5**: 2 Shifters + 1 Brute + 2 Gremlins — mixed review, mostly Action Mode
- **Items:** Health pack after rooms 2 and 4, Frost Ray (weapon 6) after room 3
- **Boss:** Selection Serpent — 5 phases: Shift+Right (×3 fast) → Cmd+Shift+Left → Cmd+X

### `data/levels/level6.json` — App Switcher Arena

**Theme:** `arena` — dark space, neon, floating app windows
**Shortcuts used:** cmd_tab, cmd_shift_tab, cmd_space, cmd_h, cmd_period, cmd_option_d (+ review)
**Rooms:** 4 standard + 1 bonus + 1 boss
**Monster types:** Gremlin (25%), Brute (15%), Shifter (25%), Mage (15%), Knight (20% — first appearance!)

- **Room 1**: 4 Gremlins — Cmd+Tab, Cmd+Space, Cmd+H (Key Mode)
- **Room 2**: 1 Knight + 2 Gremlins — Knight's shield = Cmd+Tab, kill = Cmd+H
- **Room 3**: 2 Shifters + 2 Gremlins + 1 Mage — Action Mode ("Switch to next app", "Open search")
- **Room 4**: 2 Knights + 3 Gremlins — both knights have different shield/kill combos
- **Bonus room**: 3 Knights + 2 Mages — high difficulty optional room
- **Items:** Health pack after rooms 2 and 3, Fire Launcher (weapon 7) after room 4
- **Boss:** The Taskmaster — 4 phases: Cmd+Tab → Cmd+Space → Cmd+. → Cmd+H

**Note on non-interceptable shortcuts:**
- Cmd+H (Home Screen) may not be interceptable. If `canIntercept: false` in shortcuts.json, monsters using it become Knowledge Monsters (player presses Enter to acknowledge).
- Cmd+Space (Spotlight) — test interceptability; if not, same treatment.
- Mark these in the level JSON with `"mode": "knowledge"` for affected monsters.

### `data/levels/level7.json` — Safari Caverns

**Theme:** `caverns` — deep blue, teal, coral and bubbles
**Shortcuts used:** cmd_r, cmd_d, cmd_bracket_left, cmd_bracket_right, cmd_shift_r, cmd_1_through_9 (+ review)
**Rooms:** 5 standard + 1 boss
**Monster types:** Gremlin (20%), Brute (15%), Shifter (20%), Mage (15%), Knight (15%), Phantom (15% — first appearance!)

- **Room 1**: 3 Gremlins + 1 Shifter — Cmd+R, Cmd+D, Cmd+T review
- **Room 2**: 1 Knight + 2 Gremlins + 1 Mage — browser navigation shortcuts
- **Room 3**: 2 Phantoms + 2 Gremlins — Phantoms show WRONG hints (e.g., shows "Cmd+D" for Reload, correct is Cmd+R). First deceptive encounter.
- **Room 4**: 3 Shifters + 2 Gremlins — Action Mode ("Go back one page", "Reload this page")
- **Room 5**: 1 Knight + 1 Phantom + 2 Gremlins + 1 Brute — full monster variety
- **Items:** Health pack after rooms 2 and 4, Quantum Disruptor (weapon 8) after room 3
- **Boss:** The Web Weaver — 5 phases: Cmd+L → Cmd+F → Cmd+R → Cmd+[ → Cmd+]

## Rules

Same as session 7:
- Every shortcut must exist in `shortcuts.json`
- Only introduce monster types at the level specified in plan.md (Swarm: Level 5, Knight: Level 6, Phantom: Level 7)
- Depth values: 0.0–0.8 for spawns
- 20–30% review shortcuts from earlier levels
- Scale difficulty: more monsters per wave, more Action Mode, more complex modifiers
- Mark `"mode": "knowledge"` for non-interceptable shortcuts

## Do NOT

- Do not modify any JS files
- Do not introduce monster types before their designated level
- Do not use shortcuts from levels that haven't been played yet
