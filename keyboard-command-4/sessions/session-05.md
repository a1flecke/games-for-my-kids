# Session 5 — HUD, Audio & Tutorial (Opus)

## Goal

Build the HUD overlay (health, score, prompts, combo), the Web Audio sound effect system, and the tutorial/hint system. By the end, gameplay has full visual feedback, audio, and a guided tutorial for Level 1.

## Files to Create

### `js/hud.js`

**HUD Class:**
- Renders on top of the game canvas (either as a separate overlay canvas or DOM elements over the canvas)
- Recommendation: use a second `<canvas id="hud-canvas">` layered on top of game canvas (avoids DOM thrash during gameplay)
- `render(gameState)`: called each frame

**HUD Elements:**
- **Health bar** (top-left): colored rectangle (green/yellow/red) + numeric text `"♥ 85/100"`
- **Level name** (top-center): current zone name
- **Score** (top-right): `"⭐ 1250"`
- **Respawn shields** (below score): 3 shield icons, dim when used
- **Room progress** (below level name): dots showing current room / total rooms
- **Shortcut prompt box** (center, above targeted monster):
  - Key Mode: large modifier symbols + key in color (⌘=blue, ⇧=orange, ⌥=green) + action text below
  - Action Mode: large action text + "???" for keys
  - Physical key reminder below in smaller text: `"(Win+C)"`
  - Show/hide physical keys based on settings
  - Animated entrance (slide down) when new target acquired
  - Minimum font: 28px for keys, 22px for action text
- **Combo counter** (left side): `"COMBO x5 🔥"` with tier-based color
- **Weapon name** (bottom-left): current weapon + small icon
- **Journal hint** (bottom-right): `"H: Shortcut Journal"` reminder text
- **Target reticle**: drawn around the currently targeted monster (pulsing circle/crosshair)

**Damage/heal overlays:**
- Red vignette flash on damage (100ms fade-out)
- Green flash on heal (100ms fade-out)
- Low HP persistent red border pulse (below 30 HP)

**Combo milestone text:**
- Large floating text that fades: "BLAZING!", "DOMINATING!", "UNSTOPPABLE!", "LEGENDARY!"
- Gold/fire colors, centered, 1s display with fade

### `js/audio.js`

**AudioManager Class:**
- `_ctx`: AudioContext, created lazily in `init()` called from first user gesture
- `init()`: create AudioContext inside user gesture handler; `ctx.resume().then(...)` pattern
- `setVolume(level)`: master gain node 0–1.0
- All sounds synthesized — no audio files

**Sound effect methods:**
- `playWeaponFire(weaponId)`: unique synth per weapon (plan.md §9.2)
  - Pixel Pistol: short sine sweep 800→200Hz (100ms)
  - Data Blaster: noise burst + low sine (150ms)
  - Byte Rifle: sharp sawtooth crack (80ms)
  - Plasma Cannon: deep sine boom 100→40Hz (300ms)
  - Lightning Rod: white noise + rapid pitch oscillation (200ms)
  - Frost Ray: high sine + filtered noise (250ms)
  - Fire Launcher: noise burst ramp up then down (300ms)
  - Quantum Disruptor: detuned sine pair wobble (400ms)
  - Gravity Gun: low sine swell + cut (350ms)
  - MEGA Cannon: layered sines major chord + noise (500ms)
- `playMonsterHit()`: short noise burst + pitch drop (100ms)
- `playMonsterDeath()`: descending pitch sweep + noise tail (300ms)
- `playPlayerHit()`: low thud (sine 60Hz, 150ms) + noise
- `playWrongKey()`: dissonant buzz — two detuned square waves (200ms)
- `playComboMilestone(tier)`: rising arpeggio (3–5 notes, sine, 300ms)
- `playHealthPickup()`: bright ascending chime (sine 400→800→1200Hz, 200ms)
- `playRoomClear()`: triumphant major chord (300ms)
- `playBossPhaseHit()`: deep impact + sustained chord (500ms)
- `playBossDeath()`: dramatic descending sequence (1000ms)
- `playMenuSelect()`: soft click (noise, 30ms)
- `playLevelStart()`: ambient hit + low drone start

**Ambient system:**
- `startAmbience(theme)`: continuous low-frequency oscillator with slow LFO modulation
- `stopAmbience()`: fade out over 500ms
- Boss rooms: add pulsing rhythm (gain modulation on the drone)

**iOS Safari rules (from CLAUDE.md):**
- AudioContext created lazily in user-gesture handler
- `ctx.resume().then(() => ...)` — never schedule immediately after resume
- Feature detect: `if (!('AudioContext' in window || 'webkitAudioContext' in window)) return`

### `js/tutorial.js`

**TutorialManager Class:**
- `start(steps)`: begin tutorial sequence for current room
- Tutorial steps from plan.md §10.1:
  1. Welcome message from Commander Byte
  2. First monster with extended prompt and physical key reminder
  3. Target cycling introduction (two monsters on screen)
  4. Health explanation
  5. Weapon switch introduction
  6. Boss introduction

**Commander Byte Dialogue:**
- Portrait: simple pixel-art face drawn on a small canvas (or CSS/HTML overlay)
- Dialogue box: bottom of screen, text with typewriter effect
- Max 15 words per box (CLAUDE.md rule for catacombs)
- Space to advance, auto-advances after 3 seconds
- Appears during tutorial rooms and before new shortcut categories

**Hint System:**
- Track wrong attempts per monster: `monster._wrongAttempts`
- After 3 wrong: show first modifier key as hint (e.g., "Starts with ⌘...")
- After 5 wrong: reveal full shortcut (reduced points — 25 instead of 100)
- `?` key: instant reveal (0 points, no penalty)
- Settings control: "Hints: Always / After 3 / Never"

**Shortcut Journal UI:**
- Opened with `H` key → pause game, show journal overlay
- `role="dialog"`, `aria-modal="true"`, focus trap
- 8 category tabs (basics, files, text, navigation, selection, apps, browser, advanced)
- Each learned shortcut: display key combo, physical key, action, description
- Unlearned: "???" with category hint
- Arrow key navigation between entries
- Escape to close, return focus to gameplay

## Testing

- HUD renders correctly: health bar, score, level name, room progress, weapon name
- Shortcut prompt appears above targeted monster, correct text for Key/Action mode
- Physical key reminders toggle with settings
- Combo counter increments and shows correct tier text
- Damage vignette flashes on hit, green flash on heal
- Low HP red border pulse active below 30 HP
- All 10 weapon sounds play and are distinct
- Monster hit/death sounds play
- Wrong-key buzz plays on incorrect shortcut
- Room clear fanfare plays
- Volume slider works (0 = silent, 100 = full)
- Tutorial: Commander Byte dialogue appears, typewriter effect, Space advances
- Hint system: 3 wrong → partial hint, 5 wrong → full reveal
- `?` key → instant reveal
- Shortcut journal opens with H, shows learned shortcuts, category tabs work
- Audio initializes on first user gesture (no autoplay errors)

## Do NOT

- Do not implement level loading or room transitions — that's session 6
- Do not create level data files — sessions 7–9
- Do not implement settings persistence — that's session 6 (save.js)
