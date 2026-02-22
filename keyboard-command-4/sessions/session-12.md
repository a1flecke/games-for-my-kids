# Session 12 — Balance & QA (Sonnet)

## Goal

Playtest-driven balance tuning, bug fixing, and quality assurance. Play through all 10 levels (via code inspection and simulation) and tune difficulty, shortcut distribution, monster speed, damage values, and scoring.

## Balance Review Checklist

### Monster Speed & Timing
- [ ] Level 1 Gremlins: 12s to reach attack range (very generous for tutorial)
- [ ] Level 2–3 Gremlins: 10s to reach attack range
- [ ] Level 4–6 Gremlins: 8s
- [ ] Level 7–10 Gremlins: 6s (still generous)
- [ ] Brutes: 2× Gremlin time (double the travel time)
- [ ] Mage projectile interval: 4s — enough time to deal with charging monsters first
- [ ] Worm Swarm: fast but small damage (3 each) so total damage is manageable
- [ ] Slow mode (50% speed): verify all monsters are 2× slower

### Damage Balance
- [ ] Player starting HP (100) can survive 6+ wrong answers without dying (6 × 5 = 30 damage from wrongs, + 2–3 monster hits at 15 = 75 total)
- [ ] Health pickups placed before difficulty spikes
- [ ] Full Restore always before boss encounters
- [ ] Boss damage (20) is punishing but survivable with 3 wrong answers
- [ ] 3 respawns per level: sufficient for learning, not infinite

### Shortcut Distribution
- [ ] Each shortcut appears ≥3 times across its level's rooms (spaced repetition)
- [ ] Review shortcuts from previous levels make up 20–30% of encounters per level
- [ ] No shortcut appears only once (insufficient practice)
- [ ] Boss shortcuts all come from the current level's taught set (or earlier)
- [ ] Level 10 boss phases cover all 8 categories

### Difficulty Curve
- [ ] Level 1: trivially easy (tutorial, 1–4 monsters per room, all Key Mode)
- [ ] Level 2–3: easy-moderate (new shortcuts, first Brute/Shifter encounters)
- [ ] Level 4–5: moderate (3-modifier shortcuts, Mage time pressure, first Swarm)
- [ ] Level 6–7: moderate-hard (Knight shields, Phantom deception, Action Mode)
- [ ] Level 8: hard (all monster types, complex shortcuts)
- [ ] Level 9: hard (combo sequences, multi-step monsters)
- [ ] Level 10: very hard (all shortcuts, speed pressure on final boss)
- [ ] No difficulty cliff (no sudden jump that would frustrate a 10-year-old)

### Scoring Balance
- [ ] 3-star thresholds are achievable but challenging:
  - 1 star: complete the level (baseline)
  - 2 stars: >80% accuracy
  - 3 stars: >90% accuracy + 0 deaths
- [ ] Score per level roughly scales with level number (more monsters = more points)
- [ ] Combo multiplier rewards skill but isn't required for progression

### Hint System
- [ ] "After 3 misses" hint reveals first modifier — enough to narrow down
- [ ] "After 5 misses" full reveal — prevents total frustration
- [ ] `?` key instant reveal gives 0 points — fair trade-off
- [ ] Hint frequency setting: "Always" shows hint immediately (accessibility mode)

## QA Checklist

### Save System
- [ ] Fresh install: defaults load correctly, Level 1 unlocked
- [ ] Level completion saves: reload page, progress persists
- [ ] Settings persist across reloads
- [ ] Weapon unlocks persist
- [ ] Shortcut journal entries persist
- [ ] Save data migration: if version changes, old saves still load (merge with defaults)
- [ ] Reset: typing "RESET" clears all data; cancel preserves data

### Edge Cases
- [ ] Pressing shortcut during weapon fire animation (700ms lock): rejected gracefully
- [ ] Pressing Tab with 0 monsters alive: no crash
- [ ] Pressing weapon keys for locked weapons: ignored
- [ ] Boss fight: wrong key → boss attacks, but phase doesn't regress
- [ ] Boss fight: spam wrong keys rapidly → only one attack per wrong attempt (700ms lock applies)
- [ ] Player death during boss fight → respawn → boss phases do NOT reset
- [ ] All 3 respawns used + death → level restart (boss phases DO reset)
- [ ] Level 10 final boss with timed phases: timer pauses during pause menu
- [ ] Rapidly pressing Escape → pause/unpause → no state corruption
- [ ] Changing weapons during boss fight: works, no issues
- [ ] Window blur/focus: game pauses on blur, resumes on focus
- [ ] Very rapid correct answers (mashing): 700ms lock prevents double-counting

### Performance
- [ ] 60fps through the highest monster-density rooms (Level 10 Room 3: Swarm + 2 Combo Brutes + 2 Mages)
- [ ] Particle effects don't accumulate unbounded (pool max 50)
- [ ] No memory growth over a full 10-level playthrough
- [ ] Canvas resize on orientation change: no distortion

## Adjustments to Make

After reviewing, update:
- Monster speed values in `js/monsters.js` if timing feels wrong
- Damage values in `js/game.js` if too punishing or too easy
- Shortcut assignments in `data/levels/*.json` if distribution is uneven
- Score thresholds in `js/save.js` or `js/game.js` for star ratings
- Hint timing in `js/tutorial.js` if frustration points identified
- Any typos in shortcut descriptions or boss taunts

## Do NOT

- Do not add new features, mechanics, or systems
- Do not redesign the UI or HUD
- Do not change the number of levels, rooms, or boss phases
- Do not remove the hint system or accessibility features
