# Session 4 — Combat System (Opus)

## Goal

Build the complete combat system: monster spawning, behaviors, targeting, weapon firing, damage, health, combos, and death. By the end, a full room encounter plays from wave spawn to room clear.

## Files to Create/Modify

### `js/monsters.js`

**Monster Class:**
- `constructor(type, depth, shortcutId, promptMode)`: initialize with type config, position, assigned shortcut
- Properties: `hp`, `maxHp`, `depth`, `speed`, `state`, `type`, `shortcutId`, `promptMode`
- States: `spawning` (0.3s entrance) → `idle`/`advancing` → `hit` (0.2s flash) → `dying` (0.5s death anim) → `dead`
- `update(dt)`: advance depth based on speed, check attack range (depth ≥ 1.0), trigger attack
- `takeDamage(amount)`: reduce HP, trigger `hit` state, if HP ≤ 0 trigger `dying`
- `getScale()`: returns render scale based on depth (0.3 at depth 0.0, 1.0 at depth 1.0)
- `getBounds()`: returns {x, y, width, height} for rendering and targeting reticle placement

**MonsterFactory:**
- `create(type, depth, shortcutId, mode)`: factory method with type configs from plan.md §4.1
- Type configs define: baseHp, speed, behavior, sprite key
- Special behaviors:
  - `brute`: 3 HP, needs same-category shortcuts for each hit
  - `shifter`: always Action Mode regardless of room setting
  - `mage`: stationary, fires projectile every 4s, projectile has `travelTime: 2s`
  - `swarm`: spawns 5 mini-worms as separate sub-entities
  - `knight`: has shield HP (1) + body HP (1); shield shortcut differs from kill shortcut
  - `phantom`: displays wrong shortcut hint; only appears level 7+

### `js/weapons.js`

**WeaponManager Class:**
- `weapons[]`: array of 10 weapon configs from plan.md §5.1
- `currentWeapon`: index of selected weapon
- `state`: `idle`, `firing`, `flinching`
- `select(id)`: switch weapon (only to unlocked weapons)
- `fire(targetMonster)`: trigger fire sequence
  1. Set state to `firing` (700ms total animation)
  2. Recoil phase (0–100ms)
  3. Projectile travel phase (100–300ms) — renderer draws projectile
  4. Impact phase (300–500ms) — monster takes damage, impact effect
  5. Recovery (500–700ms) — return to idle
  6. Fire `onFireComplete` callback
- `flinch()`: wrong-answer flinch animation (300ms)
- `isLocked()`: returns true during fire/flinch animation (blocks input)

**Projectile tracking:**
- Active projectile: `{ weaponId, startX, startY, targetX, targetY, progress: 0–1 }`
- Updated each frame, passed to renderer for drawing
- On progress=1.0: trigger impact effect + damage

### `js/game.js` (modify)

**Combat Integration:**
- `startRoom(roomData)`: initialize monsters from wave data, set up targeting
- `gameLoop(timestamp)`: RAF loop
  1. `dt = timestamp - lastTime` (capped at 33ms to prevent spiral)
  2. `inputManager.process()` → handle queued shortcut attempts
  3. `updateMonsters(dt)` → advance monsters, check attacks
  4. `weaponManager.update(dt)` → advance fire animation
  5. `updateProjectiles(dt)`
  6. `checkRoomClear()` → if all monsters dead, advance to next room/boss
  7. `renderer.render(gameState)`
- **Targeting system:**
  - `currentTarget`: index into active monsters array
  - `cycleTarget(direction)`: Tab = +1, Shift+Tab = -1, wrap around
  - Auto-advance: after kill, target nearest monster (by depth — closest first)
  - Force-target: if a monster reaches depth 0.85, force-select it
  - Only one target at a time; reticle drawn around targeted monster
- **Shortcut attempt handling:**
  - On shortcut attempt: check if weapon locked → reject
  - Match against `currentTarget.shortcutId`
  - Correct → `weaponManager.fire(target)`, increment combo, add score
  - Wrong → `weaponManager.flinch()`, reset combo, 5 damage to player, wrong-answer sound
- **Wave spawning:**
  - Each wave has a `delay` (seconds after previous wave)
  - Monsters spawn when wave triggers (entrance animation)
  - Next wave triggers when current wave's monsters are all dead (or after delay, whichever is later)

**Health System:**
- `playerHp`: 100, capped at 100
- `takeDamage(amount)`: reduce HP, trigger screen shake + red vignette
- `heal(amount)`: increase HP, cap at 100, trigger green flash
- `respawns`: 3 per level
- At 0 HP: death sequence → respawn in current room with 50 HP, decrement respawns
- At 0 respawns + 0 HP: game over → restart level option

**Combo System:**
- `comboCount`: consecutive correct answers
- Milestones at 3, 5, 8, 10, 15 (visual effects escalate)
- At 5 and 10: +5 HP heal
- Wrong answer: reset to 0

**Boss Fight Mode:**
- `startBoss(bossData)`: enter boss state
- Boss has `phases[]`, each with instruction text + required shortcut
- One phase active at a time; correct shortcut → phase damage + advance
- Wrong shortcut → boss attacks (20 damage), phase does NOT advance
- Between phases: 1.5s pause for taunt text
- All phases cleared → boss death sequence → level complete

## Testing

- Room with 3 Gremlins spawns correctly at specified depths
- Tab cycles target between monsters
- Correct shortcut → weapon fires, monster takes damage, dies at 0 HP
- Wrong shortcut → flinch animation, -5 HP, combo reset
- Combo counter increments on consecutive kills, resets on miss
- Monster advancing to depth 1.0 deals damage to player
- Player at 0 HP → death → respawn with 50 HP
- Wave spawning: next wave after current cleared
- Boss fight: phases advance on correct shortcut, boss taunts between phases
- 700ms input lock prevents double-fire

## Do NOT

- Do not implement HUD rendering — that's session 5
- Do not implement audio — that's session 5
- Do not implement room transitions/corridor scenes — that's session 6
- Do not implement tutorial overlays — that's session 5
- Do not create level JSON data — use hardcoded test data, real levels in sessions 7–9
