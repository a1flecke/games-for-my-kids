# Session 7 — Levels 1–4 Content (Sonnet)

## Goal

Create the JSON data files for Levels 1–4. Each level needs room layouts, wave compositions, shortcut assignments, boss configurations, and item placements. These are the foundational levels that teach the basics.

## Files to Create

### `data/levels/level1.json` — Home Screen Ruins (Tutorial)

**Theme:** `ruins` — blue-gray stone, cracked app icon fragments
**Shortcuts used:** cmd_c, cmd_v, cmd_x, cmd_z, cmd_a, cmd_s
**Rooms:** 4 standard + 1 boss
**Monster types:** Glitch Gremlin only (tutorial simplicity)
**Prompt mode:** Key Mode only (recognition, not recall)

- **Room 1** (tutorial): 1 Gremlin with tutorial step "welcome" + "firstKill". Extended prompts with physical key reminders.
- **Room 2** (tutorial): 2 Gremlins, tutorial step "targetCycle" — teaches Tab cycling
- **Room 3**: 3 Gremlins, no tutorial (normal combat, still Key Mode)
- **Room 4**: 4 Gremlins, introduces Cmd+A and Cmd+S
- **Items:** Health pack after room 2, Data Blaster (weapon 2) after room 3
- **Boss:** Bug Lord — 3 phases: Cmd+Z → Cmd+X → Cmd+V

### `data/levels/level2.json` — Files Dungeon

**Theme:** `dungeon` — brown wood, amber, filing cabinets
**Shortcuts used:** cmd_n, cmd_w, cmd_p, cmd_f, cmd_g, cmd_shift_g (+ review: cmd_c, cmd_v, cmd_s)
**Rooms:** 4 standard + 1 boss
**Monster types:** Glitch Gremlin (70%), Virus Brute (30%)

- **Room 1**: 3 Gremlins — review shortcuts from Level 1 (warm-up)
- **Room 2**: 4 Gremlins — new shortcuts Cmd+N, Cmd+W, Cmd+P
- **Room 3**: 2 Gremlins + 1 Brute — Brute uses Cmd+F (3 hits with Find-related shortcuts)
- **Room 4**: 5 Gremlins rapid fire — mix of new + old shortcuts
- **Items:** Health pack after room 2, Byte Rifle (weapon 3) after room 3
- **Boss:** The File Corruptor — 4 phases: Cmd+S → Cmd+A → Cmd+C → Cmd+N

### `data/levels/level3.json` — Text Editor Tower

**Theme:** `tower` — dark purple, gold, books and quills
**Shortcuts used:** cmd_b, cmd_i, cmd_u, cmd_t, cmd_l, cmd_shift_t (+ review)
**Rooms:** 4 standard + 1 bonus + 1 boss
**Monster types:** Gremlin (50%), Brute (20%), Trojan Shifter (30% — first appearance!)

- **Room 1**: 3 Gremlins + 1 Shifter — Shifter uses Action Mode ("Make text bold")
- **Room 2**: 4 Gremlins — Cmd+T, Cmd+L, text formatting review
- **Room 3**: 2 Shifters + 2 Gremlins — testing recall of formatting shortcuts
- **Room 4**: 1 Brute + 3 Gremlins — Brute uses text formatting category
- **Bonus room**: 4 Shifters (all Action Mode) — harder, optional
- **Items:** Health pack after room 2, Plasma Cannon (weapon 4) after room 4
- **Boss:** Font Phantom — 3 phases: Cmd+B → Cmd+I → Cmd+U

### `data/levels/level4.json` — Navigation Nexus

**Theme:** `nexus` — cyan, white, glowing arrows
**Shortcuts used:** cmd_left, cmd_right, cmd_up, cmd_down, option_left, option_right, option_delete (+ review)
**Rooms:** 5 standard + 1 boss
**Monster types:** Gremlin (40%), Brute (20%), Shifter (20%), Malware Mage (20% — first appearance!)

- **Room 1**: 3 Gremlins — introduce Cmd+Left, Cmd+Right (Key Mode)
- **Room 2**: 4 Gremlins — Cmd+Up, Cmd+Down added
- **Room 3**: 2 Gremlins + 1 Mage — Mage at back with Option+Left; Gremlins charge
- **Room 4**: 3 Gremlins + 1 Shifter + 1 Mage — Action Mode for navigation ("Jump to start of line")
- **Room 5**: 2 Brutes + 2 Gremlins — review of all navigation shortcuts
- **Items:** Health pack after rooms 2 and 4, Lightning Rod (weapon 5) after room 3
- **Boss:** The Cursor King — 4 phases: Cmd+Left → Cmd+Right → Option+Left → Option+Right

## JSON Structure

Follow the format from plan.md §18.2:
```json
{
  "id": 1,
  "name": "Home Screen Ruins",
  "theme": "ruins",
  "shortcuts": ["cmd_c", "cmd_v", ...],
  "rooms": [
    {
      "id": 1,
      "waves": [
        {
          "delay": 0,
          "monsters": [
            { "type": "gremlin", "depth": 0.4, "shortcut": "cmd_c", "mode": "key" }
          ]
        }
      ],
      "isTutorial": true,
      "tutorialSteps": ["welcome", "firstKill"]
    }
  ],
  "boss": { ... },
  "items": [ ... ]
}
```

## Rules

- Every shortcut referenced must exist in `data/shortcuts.json`
- Monster types must be from the defined 7 types
- Depth values: 0.0 (far back) to 0.8 (near, not attacking yet). Never spawn at 1.0.
- Wave delays: first wave = 0, subsequent waves ≥ 1.0s
- Boss phases use shortcuts that were taught in this level or earlier
- Review shortcuts from previous levels (20–30% of encounters use old shortcuts for reinforcement)
- Level 1 rooms are smaller (1–4 monsters) to ease the tutorial
- Levels 2–4 scale up to 3–5 monsters per room

## Do NOT

- Do not modify any JS files
- Do not create shortcuts that aren't in shortcuts.json
- Do not use monster types not yet introduced (e.g., no Phantom before level 7)
