# Session 2 — Canvas Renderer (Opus)

## Goal

Build the shooting gallery renderer: room backgrounds with perspective, monster sprite drawing, weapon sprite, projectile effects, and particle system. By the end, a test room renders at 60fps with placeholder monsters at different depths.

## Files to Create

### `js/renderer.js`

**Room Background Rendering:**
- `Renderer` class managing the 800×600 Canvas
- `drawRoom(theme)`: perspective room with vanishing point at center
  - Floor: gradient from near (bright) to far (dark), perspective lines
  - Walls: left/right walls converging to vanishing point, themed color
  - Ceiling: matching gradient
  - Decorative elements per theme (torches, banners, etc.) — simple geometric shapes
- Pre-render room background to offscreen canvas on room load via `cacheBackground(theme)`
- 10 theme palettes matching plan.md §7.3

**Monster Sprite Rendering:**
- `drawMonster(type, depth, frame, state)`: draws a monster at given depth (0.0–1.0)
- Depth affects: Y position (higher = further), scale (smaller = further), and render order
- Each monster type drawn with Canvas primitives (circles, rects, arcs) — pixel-art style
- 7 monster types from plan.md §4.1: Glitch Gremlin, Virus Brute, Trojan Shifter, Malware Mage, Worm Swarm, Ransomware Knight, Phishing Phantom
- States: `idle` (bobbing), `moving` (advancing), `hit` (flash white), `dying` (type-specific death anim)
- Pre-render each monster type + state to offscreen sprite cache on level load

**Weapon Sprite:**
- `drawWeapon(weaponId, state)`: draws current weapon at bottom-center
- States: `idle`, `firing` (recoil + return), `flinch` (wrong answer)
- 10 weapon designs from plan.md §5.1 — each distinct shape/color
- Weapon bobs slightly during idle (breathing animation)

**Projectile & Effects:**
- `drawProjectile(weaponId, progress)`: projectile traveling from weapon to target (0.0–1.0 progress)
- Each weapon has unique projectile visual (laser bolt, spread shot, beam, fireball, etc.)
- Impact effect at target location (explosion, sparks, ice crystals, etc.)

**Particle System:**
- `ParticlePool` class with pre-allocated 50-particle pool
- `emit(x, y, count, color, speed)`: spawn particles from pool
- `updateParticles(dt)` + `drawParticles()`: called each frame
- Particles: simple circles with velocity, gravity, fade-out
- Used for: hit sparks, death effects, combo fire trail, health pickup shimmer

**Render Pipeline:**
- `render(gameState)`: main render function called by game loop
  1. Draw cached room background
  2. Sort monsters by depth (back to front)
  3. Draw monsters
  4. Draw projectiles
  5. Draw particles
  6. Draw weapon sprite
- `resize(width, height)`: handle canvas resize maintaining 800×600 base with scaling

## Performance Requirements

- All monster sprites pre-rendered to offscreen canvases
- Room background cached — drawn once per room
- `drawImage()` from cache, never re-draw primitives each frame
- Particle pool: no allocations during gameplay
- Target: constant 60fps with 8 monsters + 50 particles visible

## Testing

- Load level 1 with test room data
- Room background renders with perspective (floor, walls, ceiling)
- Place test monsters at depths 0.2, 0.5, 0.8 — correct size scaling
- Monsters bob in idle animation
- Fire weapon — projectile travels to target, impact effect plays
- Death animation triggers correctly for each monster type
- Particle effects visible on kills
- Performance: 60fps with 8 monsters on screen (check with dev tools)
- Canvas scales correctly in different viewport sizes

## Do NOT

- Do not handle keyboard input or game logic — that's session 3–4
- Do not render HUD elements — that's session 5
- Do not load level JSON files — use hardcoded test data
- Do not implement audio — that's session 5
