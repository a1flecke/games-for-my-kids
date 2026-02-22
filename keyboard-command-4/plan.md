# Keyboard Command 4 — Game Design Document

## 1. Overview

**Title:** Keyboard Command 4: The Digital Realm
**Genre:** First-person shooting gallery / typing game hybrid
**Target:** Age 10, iPad Safari with Bluetooth Windows keyboard
**Goal:** Master ~60 iPadOS keyboard shortcuts through Doom-inspired FPS gameplay
**Tech:** Vanilla JS (ES6+), HTML5 Canvas, Web Audio API, no build step

### 1.1 Story

The Digital Realm — the world inside your iPad — has been invaded by the Corruption, a dark force turning every system into chaos. You are a **Command Knight**, a digital warrior who channels keyboard shortcuts as weapons. Each shortcut you master becomes a new power in your arsenal.

Fight through 10 corrupted system zones (Home Screen, Files, Text Editor, Browser, and more), defeat the Corruption's generals, and restore order to the Digital Realm.

### 1.2 Visual Style — Shooting Gallery FPS

The player sees a **first-person perspective** into a dungeon room (not free-roaming). Rooms are drawn in 2D with perspective depth cues (vanishing point, scaled sprites). Monsters appear at various depths within the room. A weapon sprite occupies the bottom-center of the screen.

After clearing all monsters in a room, the view transitions to the next room. This is the "House of the Dead" / "Time Crisis" model — all keyboard input goes to shortcut commands, no movement keys wasted.

**Rendering layers (back to front):**
1. Room background (walls, floor, ceiling with vanishing-point perspective)
2. Back-depth monsters (small, far away)
3. Mid-depth monsters
4. Front-depth monsters (large, close)
5. Projectiles & particle effects
6. Weapon sprite (bottom center, bobs on fire)
7. HUD overlay (health, ammo, score, shortcut prompt, target reticle)

---

## 2. Controls & Input

### 2.1 Keyboard Layout (Windows Bluetooth → iPadOS Mapping)

| Physical Key | iPadOS Maps To | Notes |
|---|---|---|
| Win (⊞) | Cmd (⌘) | Primary modifier |
| Alt | Option (⌥) | Secondary modifier |
| Ctrl | Ctrl (⌃) | Rarely used on iPadOS |
| Shift | Shift (⇧) | Standard |
| No Globe key | — | Globe shortcuts excluded; Apple keyboard only |

### 2.2 Game Controls

| Key | Action |
|---|---|
| Tab | Cycle target (next monster) |
| Shift+Tab | Cycle target (previous monster) |
| Escape | Pause menu |
| Space | Advance dialogue / skip tutorial text |
| Enter | Confirm menu selection |
| Arrow Up/Down | Navigate menus |
| H | Open shortcut journal (during gameplay) |

### 2.3 Shortcut Input

When a monster is targeted, the player presses the displayed keyboard shortcut. The game intercepts ALL key events via `keydown` with `preventDefault()` to prevent browser/OS actions.

**Interception limitations:** Some system-level shortcuts CANNOT be intercepted by a web page:
- Globe+H (Home) — system-level on Apple keyboards
- Cmd+H (Home Screen) — may pass through in Safari
- Cmd+Q — no effect on iPadOS
- Hardware volume/power keys

These shortcuts are taught via **"Knowledge Monsters"** — the monster displays the shortcut and description, and the player presses **Enter** to acknowledge (no interception needed). The shortcut journal entry is still unlocked.

### 2.4 Target Cycling

- One monster at a time is **targeted** — shown by a glowing reticle and the shortcut prompt
- **Tab** cycles forward through visible monsters; **Shift+Tab** cycles backward
- After a kill, target **auto-advances** to the nearest remaining monster
- **Charging monsters** that reach the front become **force-targeted** (deal with the threat)
- Bosses are always the sole target during their phase

---

## 3. Keyboard Shortcuts Database

### 3.1 All Shortcuts by Level

60 shortcuts organized into 10 levels of progressive difficulty. Each shortcut has:
- `keys`: the key combination (e.g., `["Cmd", "C"]`)
- `action`: what it does (e.g., "Copy")
- `description`: one-sentence explanation
- `difficulty`: 1–5
- `canIntercept`: whether `preventDefault()` works in Safari
- `category`: grouping for the shortcut journal

#### Level 1 — Home Screen Ruins (Tutorial + The Big Four)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 1 | Cmd+C | Copy | 1 |
| 2 | Cmd+V | Paste | 1 |
| 3 | Cmd+X | Cut | 1 |
| 4 | Cmd+Z | Undo | 1 |
| 5 | Cmd+A | Select All | 1 |
| 6 | Cmd+S | Save | 1 |

#### Level 2 — Files Dungeon (File Operations)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 7 | Cmd+N | New document/tab | 1 |
| 8 | Cmd+W | Close tab/document | 2 |
| 9 | Cmd+P | Print | 1 |
| 10 | Cmd+F | Find | 2 |
| 11 | Cmd+G | Find Next | 2 |
| 12 | Cmd+Shift+G | Find Previous | 2 |

#### Level 3 — Text Editor Tower (Text Formatting)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 13 | Cmd+B | Bold | 1 |
| 14 | Cmd+I | Italic | 1 |
| 15 | Cmd+U | Underline | 1 |
| 16 | Cmd+T | New tab (Safari) | 2 |
| 17 | Cmd+L | Go to address bar | 2 |
| 18 | Cmd+Shift+T | Reopen closed tab | 3 |

#### Level 4 — Navigation Nexus (Text Navigation)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 19 | Cmd+Left | Beginning of line | 2 |
| 20 | Cmd+Right | End of line | 2 |
| 21 | Cmd+Up | Top of document | 2 |
| 22 | Cmd+Down | Bottom of document | 2 |
| 23 | Option+Left | Previous word | 3 |
| 24 | Option+Right | Next word | 3 |
| 25 | Option+Delete | Delete previous word | 3 |

#### Level 5 — Selection Stronghold (Text Selection)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 26 | Shift+Left | Select character left | 2 |
| 27 | Shift+Right | Select character right | 2 |
| 28 | Shift+Up | Select line up | 2 |
| 29 | Shift+Down | Select line down | 2 |
| 30 | Cmd+Shift+Left | Select to line start | 3 |
| 31 | Cmd+Shift+Right | Select to line end | 3 |
| 32 | Option+Shift+Left | Select previous word | 3 |
| 33 | Option+Shift+Right | Select next word | 3 |

#### Level 6 — App Switcher Arena (App Management)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 34 | Cmd+Tab | Switch to next app | 2 |
| 35 | Cmd+Shift+Tab | Switch to previous app | 3 |
| 36 | Cmd+Space | Spotlight Search | 2 |
| 37 | Cmd+H | Go to Home Screen | 2 |
| 38 | Cmd+. | Cancel / Escape in dialogs | 2 |
| 39 | Cmd+Option+D | Toggle Dock | 3 |

#### Level 7 — Safari Caverns (Browser Mastery)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 40 | Cmd+R | Reload page | 2 |
| 41 | Cmd+D | Bookmark page | 2 |
| 42 | Cmd+[ | Go back | 2 |
| 43 | Cmd+] | Go forward | 2 |
| 44 | Cmd+Shift+R | Toggle Reader mode | 3 |
| 45 | Cmd+1…9 | Switch to tab 1–9 | 3 |

#### Level 8 — Advanced Armory (Power Shortcuts)

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 46 | Cmd+Shift+Z | Redo | 3 |
| 47 | Cmd+Shift+V | Paste without formatting | 3 |
| 48 | Cmd+Shift+3 | Take screenshot | 3 |
| 49 | Cmd+Shift+4 | Screenshot (alternate) | 3 |
| 50 | Cmd+Shift+N | New private window | 3 |
| 51 | Cmd+, | Open app settings/preferences | 3 |
| 52 | Cmd+; | Check spelling | 3 |

#### Level 9 — Combo Catacombs (Multi-Step Operations)

Monsters in this level require **sequences** of shortcuts:

| # | Sequence | Operation | Difficulty |
|---|----------|-----------|------------|
| 53 | Cmd+A → Cmd+C | Select All then Copy | 4 |
| 54 | Cmd+A → Cmd+X → Cmd+Tab → Cmd+V | Cut All, switch app, paste | 5 |
| 55 | Cmd+F → (type) → Cmd+G | Find then Find Next | 4 |
| 56 | Cmd+Z → Cmd+Z → Cmd+Z | Triple Undo | 3 |
| 57 | Cmd+A → Cmd+B → Cmd+I | Select All, Bold, Italic | 4 |
| 58 | Cmd+L → Cmd+A → Cmd+C | Address bar, select, copy URL | 4 |

#### Level 10 — Corruption Core (Boss Rush + Final Exam)

All previous shortcuts mixed. Boss encounters require 5–7 step sequences. New shortcuts:

| # | Shortcut | Action | Difficulty |
|---|----------|--------|------------|
| 59 | Cmd+Shift+A | Deselect All | 4 |
| 60 | Cmd+Option+V | Move (Paste as Move) | 4 |

### 3.2 Shortcut Prompt Modes

Monsters display shortcuts in one of two modes:

1. **Key Mode** (recognition): Shows the keys — e.g., `⌘+N`. Player presses the combo.
2. **Action Mode** (recall): Shows the action — e.g., `"Open a new document"`. Player must remember the shortcut.

Level 1–3 use mostly Key Mode. Level 4+ mixes in Action Mode. Level 9–10 are mostly Action Mode.

### 3.3 iPadOS Key Display

Display modifier keys with standard symbols AND text labels for clarity:
- `⌘ Cmd` / `⌥ Option` / `⇧ Shift` / `⌃ Ctrl`
- Physical key reminder: "(Win key)" next to ⌘, "(Alt key)" next to ⌥

---

## 4. Monster Types

### 4.1 Monster Roster

| # | Name | Tier | HP | Speed | Behavior | Visual |
|---|------|------|-----|-------|----------|--------|
| 1 | **Glitch Gremlin** | Common | 1 | Fast | Appears in groups of 3–5, single shortcut each. Rushes forward. | Small green pixelated imp, glitchy static effect |
| 2 | **Virus Brute** | Tank | 3 | Slow | Absorbs 3 hits (same shortcut category). Lumbers forward. | Large red hulking figure, pulsing veins |
| 3 | **Trojan Shifter** | Tricky | 1 | Medium | Always uses Action Mode (shows description, not keys). Tests recall. | Purple cloaked figure, face shifts between forms |
| 4 | **Malware Mage** | Ranged | 2 | Stationary | Stays at back, fires projectiles on a timer. Must be dealt with before timer expires. | Dark robed figure with glowing staff |
| 5 | **Worm Swarm** | Horde | 1 each | Fast | 5–8 tiny worms appear simultaneously. Rapid-fire easy shortcuts. | Cluster of small blue worms |
| 6 | **Ransomware Knight** | Shield | 2+shield | Medium | Shield must be broken with one shortcut, then vulnerable to kill shortcut. | Armored black knight with glowing shield |
| 7 | **Phishing Phantom** | Deceptive | 1 | Slow | Displays a WRONG shortcut hint. Player must know the correct one. Appears level 7+. | Ghostly translucent figure with fake text |

### 4.2 Monster Behavior Details

**Movement:** Monsters exist at depth positions 0.0 (back of room) to 1.0 (front/attack range). Charging monsters advance along this axis. At depth 1.0, they attack the player.

**Attack pattern:**
- Charging monsters (Gremlin, Brute, Knight): advance toward player; deal damage on contact
- Ranged monsters (Mage): fire projectile every 4 seconds; projectile deals damage on arrival
- Horde (Swarm): advance rapidly; each surviving worm deals small damage at depth 1.0
- Deceptive (Phantom): does not attack directly; wrong answer from confusion deals self-damage

**Death animations:** Each monster type has a unique 0.5s death animation:
- Gremlin: pixelates and scatters
- Brute: cracks and crumbles
- Shifter: dissolves into smoke
- Mage: implodes with energy burst
- Swarm: each worm pops individually
- Knight: armor shatters, figure fades
- Phantom: revealed as skeleton, disintegrates

### 4.3 Monster Spawn Patterns Per Room

Each room defines a **wave sequence**. Example:
```json
{
  "waves": [
    { "monsters": [{"type": "gremlin", "depth": 0.3}, {"type": "gremlin", "depth": 0.5}] },
    { "monsters": [{"type": "brute", "depth": 0.4}], "delay": 1.0 },
    { "monsters": [{"type": "mage", "depth": 0.1}, {"type": "gremlin", "depth": 0.6}] }
  ]
}
```

---

## 5. Weapons

### 5.1 Weapon Roster

Weapons are visual/audio variations on the "correct answer" animation. The player doesn't choose ammo — each weapon has unlimited use. Weapons unlock by progressing through levels.

| # | Name | Unlock | Visual Effect | Sound |
|---|------|--------|---------------|-------|
| 1 | **Pixel Pistol** | Start | Small blue laser bolt | Short pew |
| 2 | **Data Blaster** | Level 2 | Green shotgun spread (3 bolts) | Chunky blast |
| 3 | **Byte Rifle** | Level 3 | Thin red precision beam | Sharp crack |
| 4 | **Plasma Cannon** | Level 4 | Orange glowing orb, explosion on hit | Deep boom |
| 5 | **Lightning Rod** | Level 5 | White-blue chain lightning | Electric crackle |
| 6 | **Frost Ray** | Level 6 | Ice-blue beam, freeze particles | Crystalline hiss |
| 7 | **Fire Launcher** | Level 7 | Red-orange fireball, napalm splash | Roaring whoosh |
| 8 | **Quantum Disruptor** | Level 8 | Purple vortex, reality-tear effect | Warbling hum |
| 9 | **Gravity Gun** | Level 9 | Invisible pull + crush implosion | Deep thrum |
| 10 | **MEGA Cannon** | Level 10 | Rainbow beam, massive screen flash | Dramatic chord |

### 5.2 Weapon Selection

- **Number keys 1–0** select weapons (1=Pixel Pistol, 0=MEGA Cannon)
- Current weapon shown at bottom of screen
- Weapon selection fires only when NO modifier keys are held. `Cmd+1` through `Cmd+9` (Safari tab switching, Level 7) are shortcut combos, not weapon switches. InputManager checks: if `e.metaKey || e.altKey || e.ctrlKey` → route as shortcut attempt; if bare number key → route as weapon select.
- HUD shows weapon name and small icon

### 5.3 Weapon Fire Animation

All weapons share a timing structure:
1. **Recoil** (0–100ms): Weapon sprite kicks back/up
2. **Projectile travel** (100–300ms): Effect travels from weapon to target
3. **Impact** (300–500ms): Hit effect on monster + damage application
4. **Recovery** (500–700ms): Weapon returns to rest position

During the 700ms animation, input is **locked** (no accidental double-fires). This also provides rhythm to combat.

---

## 6. Health & Damage System

### 6.1 Player Health

- **Max HP:** 100
- **Starting HP per level:** 100
- **Display:** Health bar in HUD, numerical value, color-coded (green > 60, yellow 30–60, red < 30)
- **Damage sources:**
  - Charging monster reaches depth 1.0: 15 damage
  - Mage projectile hits: 10 damage
  - Wrong shortcut pressed: 5 damage (self-inflicted mistake penalty)
  - Worm swarm (each surviving worm): 3 damage
  - Boss attacks: 20 damage

### 6.2 Healing

- **Health Pack** (+25 HP): Found between rooms, shown as floating green cross
- **Full Restore** (+100 HP): Found before boss rooms
- **Combo Heal** (+5 HP): Awarded for 5-kill combo streak
- **HP cannot exceed 100**

### 6.3 Death & Respawn

- At 0 HP: screen cracks, fade to red, "SYSTEM CRASH" text
- **Respawn at current room** with 50 HP (no level restart — anti-frustration)
- 3 respawns per level; after 3, restart the level
- Respawn counter shown in HUD as small shield icons

### 6.4 Screen Effects

- **Damage taken:** Brief red vignette + screen shake (100ms)
- **Low health:** Subtle pulsing red border (persistent below 30 HP)
- **Heal:** Brief green flash
- **Kill:** Small screen shake + XP pop-up number

---

## 7. Level Design

### 7.1 Level Structure

Each level has:
- **3–5 rooms** of standard combat encounters
- **1 bonus room** (optional, harder, better rewards)
- **1 boss chamber**
- **Transition corridors** between rooms (narrative + item pickups)

Total: 10 levels × ~5 rooms = ~50 rooms + 10 boss fights

### 7.2 Room Layout

Each room is a Canvas scene ~800×600. The perspective view shows:
- Floor (gradient, receding into distance)
- Left and right walls (converging to vanishing point)
- Ceiling
- Decorative elements (torches, banners, cracks, pipes — varies by level theme)
- Monster spawn positions at various depths

### 7.3 Level Themes & Visual Palettes

| Level | Zone Name | Theme | Colors | Decor |
|---|---|---|---|---|
| 1 | Home Screen Ruins | Crumbling entry hall | Blue-gray stone | App icon fragments, cracked tiles |
| 2 | Files Dungeon | Underground archive | Brown wood, amber | Filing cabinets, paper stacks, folders |
| 3 | Text Editor Tower | Gothic library spire | Dark purple, gold | Books, quills, ink splashes, glowing text |
| 4 | Navigation Nexus | Crystal tunnels | Cyan, white | Glowing arrows, compass roses, signposts |
| 5 | Selection Stronghold | Fortress interior | Steel gray, blue | Highlight beams, selection boxes, chains |
| 6 | App Switcher Arena | Floating platforms | Dark space, neon | App windows floating, dock fragments |
| 7 | Safari Caverns | Underwater cave | Deep blue, teal | Coral, bubbles, web-page fragments |
| 8 | Advanced Armory | Volcanic forge | Red, black, orange | Anvils, glowing runes, weapon racks |
| 9 | Combo Catacombs | Ancient temple | Gold, dark green | Columns, mosaics, puzzle mechanisms |
| 10 | Corruption Core | Digital void | Black, red glitch | Corrupted pixels, static, glitch tears |

### 7.4 Boss Encounters

Each level ends with a boss — a multi-step puzzle fight requiring sequential shortcuts.

| Level | Boss Name | HP | Phases | Puzzle Sequence |
|---|---|---|---|---|
| 1 | **Bug Lord** | 3 phases | 3 | Phase 1: Cmd+Z (undo its attack), Phase 2: Cmd+X (cut its minion), Phase 3: Cmd+V (paste the cure) |
| 2 | **The File Corruptor** | 4 phases | 4 | Cmd+S (save data) → Cmd+A (select all) → Cmd+C (copy backup) → Cmd+N (create new safe file) |
| 3 | **Font Phantom** | 3 phases | 3 | Cmd+B (bold the shield) → Cmd+I (italic dodge) → Cmd+U (underline the weakness) |
| 4 | **The Cursor King** | 4 phases | 4 | Cmd+Left (dodge left) → Cmd+Right (dodge right) → Option+Left (step back) → Option+Right (strike) |
| 5 | **Selection Serpent** | 5 phases | 5 | Shift+Right ×3 (grab tail segments) → Cmd+Shift+Left (grab head) → Cmd+X (sever) |
| 6 | **The Taskmaster** | 4 phases | 4 | Cmd+Tab (dodge app attack) → Cmd+Space (find weakness) → Cmd+. (cancel its spell) → Cmd+H (banish to home) |
| 7 | **The Web Weaver** | 5 phases | 5 | Cmd+L (locate it) → Cmd+F (find weak point) → Cmd+R (reload your weapon) → Cmd+[ (evade back) → Cmd+] (strike forward) |
| 8 | **The Cipher** | 4 phases | 4 | Cmd+Shift+3 (snapshot weakness) → Cmd+Shift+Z (redo the trap) → Cmd+Shift+V (paste the key cleanly) → Cmd+, (access core settings) |
| 9 | **The Combo Wraith** | 6 phases | 6 | Cmd+A → Cmd+C → Cmd+Tab → Cmd+V → Cmd+S → Cmd+W (full workflow: select, copy, switch, paste, save, close) |
| 10 | **The Corruption** | 7 phases | 7 | Random selection from ALL learned shortcuts. Each phase draws 1 shortcut. Speed matters — 5 second timer per phase. Final boss. |

**Boss mechanics:**
- Boss displays current phase instruction (e.g., "SAVE THE DATA! Quick!")
- Correct shortcut → boss takes damage, phase advances, dramatic animation
- Wrong shortcut → boss attacks (20 damage), phase does NOT advance
- Between phases: 1.5s pause for boss taunt dialogue
- Boss health bar segmented by phase
- Boss death: dramatic 3-second destruction sequence

---

## 8. HUD Design

### 8.1 Layout

```
┌─────────────────────────────────────────────────┐
│ [♥ 85/100 ████████░░]   LEVEL 3    [⭐ 1250]   │  ← Top bar
│                                     [🛡️🛡️🛡️]   │  ← Lives/respawns
│                                                   │
│                                                   │
│              ╔══════════════╗                      │  ← Target prompt
│              ║  ⌘ Cmd + B   ║                      │    (centered above
│              ║    "Bold"     ║                      │     targeted monster)
│              ╚══════════════╝                      │
│                                                   │
│                  [MONSTER]                         │
│                                                   │
│                                                   │
│  [COMBO: x3 🔥]                                   │  ← Combo counter
│                                                   │
│               ╱▔▔▔╲                               │  ← Weapon sprite
│              ╱ GUN  ╲                              │
│  [🔫 Byte Rifle]                [H: Journal]     │  ← Weapon name + hint
└─────────────────────────────────────────────────┘
```

### 8.2 HUD Elements

| Element | Position | Details |
|---|---|---|
| Health bar | Top-left | Colored bar + numeric HP |
| Level name | Top-center | Current zone name |
| Score | Top-right | Cumulative points |
| Respawn shields | Below score | 3 shield icons, dim when used |
| Target prompt | Center, above monster | Shows shortcut or action description |
| Combo counter | Left side | Shows streak count, fires at 3+ |
| Weapon display | Bottom-left | Current weapon name + icon |
| Journal hint | Bottom-right | "H: Shortcut Journal" reminder |
| Room progress | Below level name | "Room 2/4" or dots |

### 8.3 Shortcut Prompt Box

The prompt box is the most important UI element — must be instantly readable:
- Large text: shortcut keys at 28px+, action text at 22px+
- High contrast: dark text on bright background, thick border
- Key Mode: shows modifier symbols + key with color coding (Cmd=blue, Shift=orange, Option=green)
- Action Mode: shows description text with "???" for keys
- Physical key reminder shown in smaller text below: "(Win + C)"
- Animated entrance: slides down when new target acquired

---

## 9. Audio Design (Web Audio API)

### 9.1 Audio System

All sounds synthesized via Web Audio API oscillators and noise — no audio files needed. AudioContext created lazily inside first user gesture handler.

### 9.2 Sound Effects

| Sound | Trigger | Synthesis |
|---|---|---|
| Weapon fire (per weapon) | Correct shortcut | Varies: sine pew, sawtooth blast, etc. |
| Monster hit | Damage dealt | Short noise burst + pitch drop |
| Monster death | HP reaches 0 | Descending pitch sweep + noise |
| Player hit | Damage taken | Low thud + brief noise |
| Wrong key | Incorrect shortcut | Dissonant buzz (short) |
| Combo milestone | 3/5/10 streak | Rising arpeggio |
| Health pickup | Collect health | Bright ascending chime |
| Room clear | All monsters dead | Triumphant chord |
| Boss phase hit | Boss takes damage | Impact + choir-like chord |
| Boss death | Boss defeated | Extended dramatic sequence |
| Menu select | UI navigation | Soft click |
| Level start | Enter level | Ambient drone + hit |

### 9.3 Background Ambience

Each level zone has a simple ambient drone (low-frequency oscillator with slow modulation). Boss rooms add a pulsing rhythm. No complex music — keeps CPU budget for rendering.

### 9.4 iOS Safari Audio Rules

- `AudioContext` created lazily in first user-gesture handler (not constructor)
- `ctx.resume()` returns Promise — chain scheduling in `.then()`
- `speechSynthesis.cancel()` + 50ms delay before `speak()` on iOS

---

## 10. Tutorial System

### 10.1 Level 1 Tutorial Flow

Level 1 doubles as the tutorial. A guide character ("Commander Byte") appears as a portrait in dialogue boxes and walks the player through:

1. **Welcome:** "The Digital Realm needs you, Command Knight! I'll teach you how to fight."
2. **First monster:** Single Glitch Gremlin appears. Prompt shows `⌘ Cmd + C` with highlight. "Press the Win key and C together to fire your weapon!"
3. **Practice room:** 3 more Gremlins with basic shortcuts. Each has an extended prompt with physical key reminder.
4. **Target cycling:** Two monsters on screen. "Press Tab to switch targets!"
5. **Health explanation:** Player intentionally shown getting hit. "Wrong keys hurt! Watch your health bar."
6. **Weapon switch:** "Press 2 to switch to the Data Blaster!"
7. **Boss intro:** Bug Lord. Multi-step explained: "The boss needs multiple commands to defeat. Follow the prompts!"

### 10.2 Hint System

- If the player makes 3 wrong attempts on the same monster, a **hint** appears showing the first key of the shortcut
- After 5 wrong attempts, the full shortcut is revealed (reduced points)
- **"Scan" ability:** Press `?` to reveal the answer immediately (0 points for that kill, no penalty)
- Hints become less frequent as levels progress (fading training wheels)

### 10.3 Shortcut Journal

- Opened with `H` key during gameplay (pauses the game)
- Shows all **discovered** shortcuts organized by category
- Undiscovered shortcuts shown as "???"
- Each entry shows: key combo, action, and which level it was learned in
- Searchable by category tabs (Basics, Files, Text, Navigation, Selection, Apps, Browser, Advanced)

---

## 11. Progression & Scoring

### 11.1 Score System

| Action | Points |
|---|---|
| Kill (Key Mode) | 100 |
| Kill (Action Mode) | 150 (harder — recall vs recognition) |
| Kill with no wrong attempts | +50 bonus |
| Combo kill (3+) | 100 × combo multiplier |
| Boss phase clear | 200 |
| Room clear (no damage) | 500 bonus |
| Level clear | 1000 |

### 11.2 Combo System

- Consecutive correct answers build a combo counter
- 3+ combo: "COMBO x3" text, screen border glows
- 5+ combo: "BLAZING!" text, fire particles on weapon, +5 HP heal
- 10+ combo: "UNSTOPPABLE!" text, enhanced weapon visual
- Any wrong answer resets the combo to 0

### 11.3 Level Unlock

- Levels unlock sequentially (must clear Level N to unlock Level N+1)
- Each level has a 1–3 star rating based on: score thresholds, accuracy %, completion time
- Stars are cosmetic only — no gating on stars

### 11.4 End-of-Level Stats

After clearing a level (including boss), show:
- Monsters defeated / total
- Accuracy percentage
- Best combo
- Shortcuts learned (new ones unlocked this level)
- Star rating
- Time taken
- "New weapon unlocked!" notification if applicable

---

## 12. Save System

### 12.1 LocalStorage Structure

Key: `keyboard-command-4-save`

```json
{
  "version": 1,
  "currentLevel": 3,
  "highestLevel": 3,
  "totalScore": 12500,
  "levels": {
    "1": { "stars": 3, "bestScore": 2800, "bestAccuracy": 95, "bestCombo": 12, "completed": true },
    "2": { "stars": 2, "bestScore": 2100, "bestAccuracy": 82, "bestCombo": 7, "completed": true }
  },
  "shortcuts": {
    "cmd+c": { "learned": true, "timesUsed": 24, "accuracy": 92 },
    "cmd+v": { "learned": true, "timesUsed": 18, "accuracy": 88 }
  },
  "weaponsUnlocked": [1, 2, 3],
  "selectedWeapon": 3,
  "settings": {
    "fontSize": "medium",
    "showPhysicalKeys": true,
    "volume": 0.7
  }
}
```

### 12.2 Save Triggers

- Auto-save after each room clear
- Auto-save after boss defeat
- Auto-save on settings change
- Manual save not needed (always auto)

### 12.3 Reset

- Settings menu includes "Reset All Progress" behind a confirmation dialog
- Confirmation requires typing "RESET" (prevents accidental wipes)

---

## 13. Accessibility

### 13.1 Visual

- **Font:** OpenDyslexic via CDN, Comic Sans MS fallback
- **Min font size:** 16px, scalable via settings (16/18/22px)
- **Background:** Cream (#F5F0E8) for menus/HUD text areas; game canvas uses level themes but maintains high contrast on prompts
- **Text contrast:** Dark (#2C2416) on cream, WCAG AA 4.5:1 minimum
- **Prompt box:** Always high-contrast regardless of room theme (dark text on light box with border)
- **No flashing/strobing:** Death animations use fades, not flashes. Screen shake is brief (100ms) and subtle.
- **Color-blind safe:** Monster types distinguished by shape/size, not just color. Health bar has numeric readout.

### 13.2 Cognitive (ADHD Accommodations)

- **No visible countdown timers** — monsters approach visually but no number ticking down
- **Generous timing:** Charging monsters take 8–12 seconds to reach attack range (not 2–3)
- **Pause anytime:** Escape pauses instantly, no penalty
- **Short sessions:** Each room is ~2–3 minutes; full level is 10–15 minutes
- **Always-visible objective:** Room progress dots always shown
- **Auto-save:** Never lose progress (save every room)
- **Hint system:** Prevents hard-stuck frustration (see §10.2)

### 13.3 Motor

- **All keyboard, no mouse** — inherent to game design
- **No rapid key sequences** (except Level 9+ combos, which have generous timing)
- **700ms input lock** after each fire — prevents accidental double-presses
- **Touch targets:** Menu buttons 44×44px minimum

### 13.4 Settings Panel

Accessible via Escape → Settings:
- Font size: Small (16px) / Medium (18px) / Large (22px)
- Show physical key names: On/Off (shows "Win+C" alongside "⌘+C")
- Volume: Slider 0–100%
- Monster speed: Normal / Slow (50% speed for all monsters — accessibility mode)
- Hints: Always / After 3 misses / Never

---

## 14. Technical Architecture

### 14.1 File Structure

```
keyboard-command-4/
├── index.html              — Shell: screens, Canvas, HUD overlay elements
├── css/
│   └── style.css           — Styles, animations, screen shake CSS
├── js/
│   ├── game.js             — State machine, screen management, game loop
│   ├── renderer.js         — Canvas 2D room rendering, sprites, effects
│   ├── input.js            — Keyboard interception, modifier detection, shortcut matching
│   ├── monsters.js         — Monster types, behaviors, sprite drawing, death anims
│   ├── weapons.js          — Weapon types, fire animations, projectile effects
│   ├── hud.js              — HUD rendering (health, score, prompt, combo)
│   ├── audio.js            — Web Audio synthesizer for all SFX
│   ├── levels.js           — Level loader, room transitions, wave spawning
│   ├── shortcuts.js        — Shortcut database, journal, prompt generation
│   ├── tutorial.js         — Tutorial overlays, hint system, Commander Byte
│   └── save.js             — LocalStorage save/load, progress, stats
├── data/
│   ├── shortcuts.json      — Full shortcut database with metadata
│   └── levels/
│       ├── level1.json     — Room layouts, waves, shortcuts, boss config
│       ├── level2.json
│       ├── ...
│       └── level10.json
└── plan.md
```

### 14.2 Game Loop

```
requestAnimationFrame loop (60fps target):
  1. Input: Process queued keyboard events
  2. Update: Monster positions, timers, projectiles, combo state
  3. Render:
     a. Clear canvas
     b. Draw room background
     c. Draw monsters (back to front by depth)
     d. Draw projectiles & effects
     e. Draw weapon sprite
     f. Draw HUD overlay
  4. Audio: Trigger queued sound events
```

### 14.3 State Machine

```
TITLE → LEVEL_SELECT → GAMEPLAY → ROOM_TRANSITION → GAMEPLAY → ...
                                → BOSS_FIGHT → LEVEL_COMPLETE → LEVEL_SELECT
                                → PAUSE (overlay)
                                → JOURNAL (overlay)
                                → GAME_OVER → respawn or LEVEL_SELECT
```

### 14.4 Canvas Sizing

- Base resolution: 800×600
- Scale to fit viewport maintaining aspect ratio
- CSS `image-rendering: pixelated` for crisp pixel art at any scale
- On iPad: fills most of the screen in landscape

### 14.5 Performance Budget

- Target: 60fps on iPad Safari
- Monster sprite drawing: pre-render to offscreen canvases on level load
- Particle system: max 50 particles at once, simple circles/squares
- No DOM manipulation during gameplay (all Canvas)
- HUD text: cache static elements, only re-render changed values

---

## 15. Room Transition Design

Between rooms, the camera "moves" through a corridor:
1. Current room fades/slides out (300ms)
2. Corridor view shown with level-themed walls (500ms pan animation)
3. Optional: item pickup in corridor (health pack, weapon unlock)
4. Commander Byte dialogue if new shortcut category is introduced
5. Next room fades/slides in (300ms)

Total transition: ~1.5–2 seconds (fast enough to maintain flow)

---

## 16. Menu Screens

### 16.1 Title Screen

- Game title with glitch-text animation effect
- "PRESS ANY KEY TO START" prompt
- Background: slowly animating digital void

### 16.2 Level Select

- 10 level cards in a 2×5 grid
- Each card shows: level number, zone name, star rating, lock/unlock icon
- Locked levels show silhouette + lock icon
- Selected level highlights with border glow
- Arrow keys + Enter to navigate and select

### 16.3 Pause Menu

- Overlay on gameplay (dims background)
- Options: Resume, Settings, Shortcut Journal, Quit to Level Select
- Arrow keys + Enter navigation

### 16.4 Settings

- Accessible from pause menu and title screen
- Font size, physical key labels, volume, monster speed, hint frequency
- Changes apply immediately and auto-save

---

## 17. Combo Kill Streaks & Visual Feedback

### 17.1 Streak Tiers

| Streak | Label | Visual Effect |
|---|---|---|
| 3 | "COMBO x3" | Gold text flash, border glow |
| 5 | "BLAZING!" | Fire particles trail weapon, +5 HP |
| 8 | "DOMINATING!" | Screen tints gold, weapon glows |
| 10 | "UNSTOPPABLE!" | Full gold border, weapon aura, +5 HP |
| 15+ | "LEGENDARY!" | Rainbow weapon trail, maximum visual flair |

### 17.2 Wrong Answer Feedback

- Screen flashes red briefly (100ms vignette, not strobe)
- Weapon flinches (recoil without firing)
- Wrong-answer buzz sound
- Combo resets to 0
- 5 damage to player
- Targeted monster "laughs" (brief animation)

---

## 18. Data File Formats

### 18.1 shortcuts.json

```json
{
  "shortcuts": [
    {
      "id": "cmd_c",
      "keys": ["Cmd", "C"],
      "display": "⌘+C",
      "physicalDisplay": "Win+C",
      "action": "Copy",
      "description": "Copy selected text or item to clipboard",
      "category": "basics",
      "difficulty": 1,
      "level": 1,
      "canIntercept": true
    }
  ],
  "categories": [
    { "id": "basics", "name": "The Basics", "icon": "⚡" },
    { "id": "files", "name": "File Operations", "icon": "📁" },
    { "id": "text", "name": "Text Formatting", "icon": "✏️" },
    { "id": "navigation", "name": "Navigation", "icon": "🧭" },
    { "id": "selection", "name": "Selection", "icon": "🔲" },
    { "id": "apps", "name": "App Management", "icon": "📱" },
    { "id": "browser", "name": "Browser", "icon": "🌐" },
    { "id": "advanced", "name": "Advanced", "icon": "⚙️" }
  ]
}
```

### 18.2 levelN.json

```json
{
  "id": 1,
  "name": "Home Screen Ruins",
  "theme": "ruins",
  "shortcuts": ["cmd_c", "cmd_v", "cmd_x", "cmd_z", "cmd_a", "cmd_s"],
  "rooms": [
    {
      "id": 1,
      "waves": [
        {
          "delay": 0,
          "monsters": [
            { "type": "gremlin", "depth": 0.4, "shortcut": "cmd_c", "mode": "key" }
          ]
        },
        {
          "delay": 1.5,
          "monsters": [
            { "type": "gremlin", "depth": 0.3, "shortcut": "cmd_v", "mode": "key" },
            { "type": "gremlin", "depth": 0.6, "shortcut": "cmd_x", "mode": "key" }
          ]
        }
      ],
      "isTutorial": true,
      "tutorialSteps": ["welcome", "firstKill", "targetCycle"]
    }
  ],
  "boss": {
    "name": "Bug Lord",
    "hp": 3,
    "phases": [
      { "instruction": "UNDO the attack!", "shortcut": "cmd_z", "taunt": "You can't reverse what I've done!" },
      { "instruction": "CUT the power link!", "shortcut": "cmd_x", "taunt": "My power grows!" },
      { "instruction": "PASTE the antivirus!", "shortcut": "cmd_v", "taunt": "No! The cure!" }
    ]
  },
  "items": [
    { "after_room": 2, "type": "health", "amount": 25 },
    { "after_room": 3, "type": "weapon", "weaponId": 2 }
  ]
}
```

---

## 19. Non-Interceptable Shortcut Handling

Some iPadOS system shortcuts cannot be `preventDefault()`'d in Safari. Strategy:

### 19.1 "Knowledge Monster" Variant

For non-interceptable shortcuts, a special monster type appears:
- Displayed with a book icon instead of a weapon reticle
- Shows: "LEARN: ⌘+H = Go to Home Screen"
- Player presses **Enter** to acknowledge (the shortcut is NOT pressed)
- Still counts as a "kill" with points
- Shortcut added to journal as "Learned (system shortcut)"

### 19.2 List of Non-Interceptable Shortcuts

These are taught via Knowledge Monster only:
- Cmd+H (Home Screen) — interceptable varies by Safari version
- Cmd+Shift+H (Home Screen alternate)
- Cmd+Space (Spotlight) — may be interceptable in full-screen web app
- System volume/brightness keys

All other shortcuts in the database are interceptable via `preventDefault()`.

---

## 20. Performance Optimization

### 20.1 Sprite Caching

On level load, pre-render all monster sprites (each frame of each type) to offscreen canvases. During gameplay, use `drawImage()` from cache — never re-draw sprites from primitives each frame.

### 20.2 Background Caching

Room backgrounds are static — render once to an offscreen canvas on room load. Each frame just `drawImage()` the cached background.

### 20.3 Particle Pool

Pre-allocate a pool of 50 particle objects. Reuse rather than create/destroy. Each particle: `{x, y, vx, vy, life, color, size}`.

### 20.4 Text Rendering

Canvas `fillText()` is expensive. Cache HUD text that doesn't change every frame. Only re-render score/health text when values change.

### 20.5 RAF Throttle

If `requestAnimationFrame` reports a delta > 20ms (below 50fps), reduce particle count and skip non-essential animations to maintain gameplay smoothness.
