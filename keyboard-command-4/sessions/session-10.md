# Session 10 — Polish & Effects (Opus)

## Goal

Add visual polish that makes the game feel satisfying: screen shake, combo visual effects, particle enhancements, death animations, level transitions, and weapon upgrade visuals. This is the "game feel" session.

## Files to Modify

### `js/renderer.js`

**Screen Shake:**
- `startShake(intensity, duration)`: offset canvas by random ±intensity pixels each frame for duration ms
- Player damage: intensity=4, duration=100ms
- Monster kill: intensity=2, duration=80ms
- Boss phase hit: intensity=6, duration=150ms
- Wrong answer: intensity=1, duration=50ms (subtle flinch)
- Use CSS `transform: translate()` on canvas container for efficiency (avoids re-rendering)

**Combo Visual Effects by Tier:**
- x3 (COMBO): gold border glow on canvas container (CSS box-shadow animation)
- x5 (BLAZING): fire particle trail follows weapon sprite; warm color shift on room background
- x8 (DOMINATING): golden tint overlay on scene; larger impact particles
- x10 (UNSTOPPABLE): weapon glows with aura (drawn behind weapon sprite); screen border pulses gold
- x15 (LEGENDARY): rainbow weapon trail; particles on every kill are multicolored

**Enhanced Death Animations (per monster type):**
- Gremlin: body pixelates into 8×8 blocks, blocks scatter outward and fade (0.5s)
- Brute: cracks appear (drawn lines), body splits into 3 pieces that fall (0.5s)
- Shifter: dissolves into purple smoke particles rising upward (0.5s)
- Mage: implodes to center point, energy burst ring expands outward (0.5s)
- Swarm: each worm pops individually with small green burst (staggered, 0.3s total)
- Knight: armor plates fly off (4 pieces), figure underneath fades (0.6s)
- Phantom: skeleton briefly revealed, then disintegrates into dust (0.5s)

**Projectile Enhancements:**
- Each weapon projectile leaves a trail (fading copies behind it)
- Impact effects: rings, sparks, or themed particles per weapon type
- MEGA Cannon: screen flash white for 100ms (not strobe — single brief flash)

**Room Transition Polish:**
- Fade uses smooth easing (ease-in-out), not linear
- Corridor scene has parallax: walls move faster than floor (depth illusion)
- Boss corridor: screen tints red gradually, particle embers float upward
- Item pickups in corridors have floating bob animation + sparkle particles

### `js/hud.js`

**Combo Milestone Text:**
- "COMBO x3!", "BLAZING!", etc. — large text that:
  1. Pops in with scale animation (0→1.2→1.0 in 200ms)
  2. Holds for 800ms
  3. Fades out over 300ms
- Color matches tier (gold, orange, red, purple, rainbow)

**Score Pop-ups:**
- "+100" floats up from kill position, fades out
- "+150" for Action Mode kills
- Combo bonus shows as separate "+x3 COMBO BONUS"

**Damage Numbers:**
- Monster damage shown as floating number above monster: "-1 HP"
- Player damage shown as red text in HUD area

**Boss Phase Transition:**
- Boss health bar segment lights up when phase cleared
- Taunt text slides in from side, holds 1.5s, slides out
- Screen flash on phase change

### `js/weapons.js`

**Weapon Visual Upgrades:**
- Each weapon has a unique idle animation (not just bob):
  - Pistol: slight sway
  - Blaster: barrel rotates slowly
  - Rifle: scope glint (brief bright pixel)
  - Cannon: glow pulses
  - Lightning Rod: sparks along the shaft
  - Frost Ray: frost crystals form and melt on barrel
  - Fire Launcher: flame flickers at tip
  - Disruptor: reality-warp shimmer around barrel
  - Gravity Gun: small debris orbits
  - MEGA Cannon: rainbow energy crackle

**Weapon Switch Animation:**
- Current weapon drops down (200ms)
- New weapon rises up (200ms)
- Matching sound effect from audio.js

### `js/game.js`

**Victory Sequence (Level 10 completion):**
- 5-second corruption-clearing animation
- Glitch effects reduce across screen
- Colors restore to vibrant
- Title card: "THE DIGITAL REALM IS RESTORED!"
- Commander Byte congratulations
- Roll final stats
- "COMMAND KNIGHT — MASTER RANK" badge

## Performance Notes

- Screen shake via CSS transform (no canvas re-draw needed)
- Particle enhancements: stay within 50-particle pool budget — recycle aggressively
- Death animations: pre-calculate particle positions, don't allocate new objects mid-animation
- Combo glow effects: CSS box-shadow on canvas container (GPU-accelerated)
- Score pop-ups: max 5 simultaneous, oldest removed when exceeded

## Testing

- Kill a monster → satisfying screen shake + death animation + score pop-up
- Build a 5-combo → "BLAZING!" text pops, fire particles on weapon
- Build a 10-combo → "UNSTOPPABLE!" text, weapon glow aura
- Boss phase cleared → health segment lights up, taunt slides in
- Room transition → smooth fade, parallax corridor, item pickup if present
- Weapon switch → smooth drop/rise animation with sound
- All effects at 60fps on iPad (test with throttled CPU in dev tools)
- No strobing or flashing effects (single brief flashes OK, no repeating)

## Do NOT

- Do not add any new game mechanics or features
- Do not change monster stats or level data
- Do not add audio (already done in session 5) — only trigger existing sounds
- Do not add strobing/repeating flash effects (accessibility violation)
