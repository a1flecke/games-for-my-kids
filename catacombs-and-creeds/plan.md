# Catacombs & Creeds: Early Church Quest

## Project Design Document

-----

## 1. PROJECT OVERVIEW

### 1.1 Purpose

Educational dungeon crawler game teaching 3rd-6th grade students about early Christian church history through interactive gameplay.

### 1.2 Target Audience

- **Age:** 3rd-6th grade (ages 8-12)
- **Learning Challenges:** Students with ADHD and dyslexia
- **Cognitive Ability:** High comprehension, strong with stories, struggles with reading
- **Platform:** iPad with Safari browser and Bluetooth keyboard

### 1.3 Educational Goals

- Understand the role of apostles in spreading Christianity
- Learn why Christians were persecuted in the Roman Empire
- Comprehend what creeds are and why the Nicene Creed matters
- Identify key Church Fathers and their contributions
- Understand Constantine’s role in legitimizing Christianity

### 1.4 Game Summary

5-level dungeon crawler spanning 300 years of church history (30-400 AD). Players navigate tile-based environments, engage in turn-based combat with educational questions, solve puzzles, and interact with historical figures through dialogue.

**Total Playtime:** 45-90 minutes (9-18 minutes per level)

-----

## 2. TECHNICAL SPECIFICATIONS

### 2.1 Technology Stack

- **Frontend:** Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas API
- **Audio:** Web Audio API
- **Storage:** LocalStorage API
- **Deployment:** GitHub Pages
- **No External Frameworks:** Pure vanilla JS for simplicity and performance

### 2.2 Platform Requirements

- **Primary:** iPad Safari (iOS 15+)
- **Input:** Bluetooth keyboard + touch controls
- **Screen:** Responsive canvas (800x600 base, scales to fit)
- **Offline:** Service Worker for offline play after initial load
- **Performance:** Stable 60 FPS

### 2.3 Browser Compatibility

- **Must Support:** iPad Safari, Chrome (desktop), Edge
- **Should Support:** Firefox, Safari (macOS)
- **No Support Needed:** IE11

### 2.4 File Structure

```
catacombs-and-creeds/
├── index.html
├── README.md
├── TEACHER_GUIDE.md
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── config.js           # Game configuration constants
│   ├── game.js             # Main game loop and state management
│   ├── input.js            # Keyboard/touch input handler
│   ├── camera.js           # Camera system
│   ├── renderer.js         # Rendering engine
│   ├── map.js              # Tile map system
│   ├── player.js           # Player entity
│   ├── enemy.js            # Enemy entities
│   ├── dialogue.js         # Dialogue manager
│   ├── dialogueUI.js       # Dialogue rendering
│   ├── combat.js           # Combat system
│   ├── combatUI.js         # Combat UI
│   ├── inventory.js        # Inventory management
│   ├── inventoryUI.js      # Inventory UI
│   ├── items.js            # Item definitions
│   ├── saveSystem.js       # Save/load functionality
│   ├── audio.js            # Audio manager
│   ├── ui.js               # UI manager
│   └── utils.js            # Utility functions
├── assets/
│   ├── sprites/
│   │   ├── player/
│   │   ├── enemies/
│   │   ├── tiles/
│   │   └── items/
│   ├── portraits/          # Character portraits (64x64)
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   └── fonts/
│       └── OpenDyslexic/
└── data/
    ├── level1_map.json
    ├── level1_content.json
    ├── level2_map.json
    ├── level2_content.json
    ├── level3_map.json
    ├── level3_content.json
    ├── level4_map.json
    ├── level4_content.json
    ├── level5_map.json
    ├── level5_content.json
    ├── enemies.json
    ├── items.json
    └── questions.json
```

-----

## 3. ACCESSIBILITY REQUIREMENTS

### 3.1 Dyslexia Accommodations

#### Text Rendering

- **Font:** OpenDyslexic or Comic Sans MS (fallback)
- **Size:** Minimum 16pt, adjustable (small/medium/large)
- **Spacing:** 1.5-2x line height
- **Background:** Cream/beige (#f5f5dc), never pure white
- **Contrast:** WCAG AA minimum (4.5:1 for body text)
- **Color:** Dark gray text (#2c2c2c) on cream background

#### Text Presentation Rules

- **Maximum Words Per Screen:** 15 words
- **Maximum Sentences Per Box:** 2 sentences
- **No Time Pressure:** Never time-limited reading
- **Text-to-Speech:** Optional Web Speech API integration
- **Skip Option:** Hold button to skip dialogue entirely
- **Typewriter Speed:** 50ms per character, skippable

#### Word Wrapping

- Automatic word wrap at sentence boundaries
- No hyphenation
- Preserve word integrity

### 3.2 ADHD Accommodations

#### Attention Management

- **Session Length:** 9-18 minutes per level
- **Auto-Save:** Every 2 minutes automatically
- **Manual Save:** Checkpoint altars in levels
- **Clear Objectives:** Always visible current goal
- **Progress Indicators:** Visual progress bars per level
- **Immediate Feedback:** Instant response to all actions

#### Engagement Features

- **Hyperfocus Channeling:** Achievement system for milestones
- **Dopamine Rewards:** Visual/audio feedback for accomplishments
- **Natural Breaks:** Save points between sections
- **Optional Fast Travel:** Return to completed checkpoints
- **Background Music Toggle:** Can disable for focus

#### UI Clarity

- **Minimal Clutter:** Only essential information on screen
- **Large Touch Targets:** Minimum 44x44px for all buttons
- **Consistent Layout:** UI elements never move
- **Visual Hierarchy:** Clear importance through size/color

### 3.3 Universal Design

- **Colorblind Mode:** Alternative color palettes available
- **Keyboard-Only Play:** Fully playable without mouse/touch
- **Audio Optional:** All audio can be disabled
- **No Flashing:** No strobing effects (seizure safety)
- **Pausable:** Can pause at any moment
- **Forgiving Gameplay:** No permanent failure states

-----

## 4. GAME SYSTEMS

### 4.1 Core Game Loop

```javascript
// 60 FPS game loop
function gameLoop(currentTime) {
    calculateDeltaTime();
    handleInput();
    updateGameState(deltaTime);
    renderFrame();
    requestAnimationFrame(gameLoop);
}
```

**Game States:**

- `LOADING` - Initial asset loading
- `TITLE` - Title screen with New/Continue
- `PLAYING` - Normal exploration mode
- `DIALOGUE` - Conversation with NPC
- `COMBAT` - Turn-based battle
- `INVENTORY` - Inventory management screen
- `PAUSED` - Pause menu
- `GAME_OVER` - Death screen (retry from checkpoint)
- `VICTORY` - Level complete / game complete

### 4.2 Movement System

#### Player Movement

- **Type:** Tile-based with pixel-perfect movement
- **Speed:** 2 pixels per frame (configurable)
- **Controls:**
  - Keyboard: WASD or Arrow keys
  - Touch: On-screen D-pad (optional)
- **Collision:** Axis-aligned bounding box (AABB)
- **Tile Size:** 32x32 pixels

#### Collision Detection

```javascript
// Check four corners of player hitbox against tile map
function checkCollision(player, map) {
    const corners = getPlayerCorners();
    for (corner of corners) {
        const gridPos = worldToGrid(corner);
        if (map.isSolid(gridPos.x, gridPos.y)) {
            return true;
        }
    }
    return false;
}
```

#### Camera System

- **Type:** Follow camera centered on player
- **Smoothing:** No smoothing (instant follow for clarity)
- **Bounds:** Clamped to map edges
- **Viewport:** 800x600 pixels

### 4.3 Dialogue System

#### Structure

```json
{
  "dialogue_id": {
    "speaker": "Apostle Peter",
    "portrait": "peter",
    "text": "Welcome, young believer!",
    "next": "next_dialogue_id",
    "choices": [
      {
        "text": "Tell me more",
        "next": "dialogue_branch_1"
      }
    ]
  }
}
```

#### Features

- **Linear Dialogue:** Automatic progression with next field
- **Branching Dialogue:** Choices lead to different paths
- **Typewriter Effect:** Characters appear sequentially
- **Skip:** Press SPACE to skip typewriter or entire dialogue
- **Portraits:** 64x64 pixel art character faces
- **Word Wrap:** Automatic text wrapping to fit box width

#### UI Layout

- **Position:** Bottom 150px of screen
- **Portrait:** Left side, 80x80px
- **Text Area:** Right of portrait, wrapped text
- **Speaker Name:** Above text, bold
- **Continue Indicator:** Blinking arrow when ready to advance
- **Choices:** Vertically stacked, navigate with UP/DOWN

### 4.4 Combat System

#### Turn Structure

```
Player Turn → Player Action → Enemy Turn → Enemy Action → Repeat
```

#### Player Actions

1. **Attack:** Deal damage based on stats
1. **Defend:** Reduce incoming damage by 50%
1. **Use Item:** Consume item from inventory
1. **Answer Question:** Correct answer = heal/advantage

#### Combat Mechanics

- **Damage Formula:** `(Attack - Defense/2) + Random(-2, +2)`
- **Critical Hit:** 10% chance for 2x damage
- **Miss Chance:** 5% chance to miss
- **Turn Order:** Always player first (educational focus)

#### Educational Questions

- **Frequency:** Optional action, not required every turn
- **Benefit:** Correct = restore 20 HP or boost next attack
- **Penalty:** Incorrect = no benefit, can retry
- **Format:** Multiple choice (3 options)
- **Time Limit:** None (dyslexia accommodation)

#### Combat UI

- **Enemy Sprite:** Top-center, 64x64 or larger
- **Player Sprite:** Bottom-left, same as overworld
- **Health Bars:** Visual bars + numbers
- **Action Menu:** Bottom-right, large touch targets
- **Damage Numbers:** Float up when damage dealt
- **Status Effects:** Icons above sprites

#### Victory/Defeat

- **Victory:** XP awarded, items dropped, return to exploration
- **Defeat:** Return to last checkpoint with hint
- **No Permadeath:** Forgiving for educational context

### 4.5 Inventory System

#### Item Categories

1. **Consumables:** Bread (heal 20 HP), Water (heal 10 HP)
1. **Quest Items:** Creed Fragments, Apostle Coins, Letters
1. **Equipment:** Shields, Prayer Beads (stat boosts)
1. **Collectibles:** Optional items for completionists

#### Inventory Rules

- **Capacity:** 20 item slots
- **Stacking:** Consumables stack to 99
- **Quest Items:** Don’t count toward capacity
- **Sorting:** Auto-sort by category
- **Quick Use:** 1-3 keys for hotbar items

#### UI

- **Grid:** 4x5 grid layout
- **Touch Targets:** 60x60px minimum per slot
- **Item Info:** Hover/tap shows description
- **Actions:** Use, Drop, Examine
- **Access:** Press ‘I’ or touch button

### 4.6 Save System

#### Auto-Save Triggers

- Every 2 minutes of gameplay
- After completing dialogue
- After winning combat
- When picking up quest items
- When entering new room
- At checkpoint altars

#### Save Data Structure

```json
{
  "slot1": {
    "timestamp": "2026-02-10T14:30:00Z",
    "playtime": 1234,
    "currentLevel": 2,
    "playerData": {
      "x": 320,
      "y": 480,
      "hp": 85,
      "maxHp": 100,
      "xp": 120,
      "level": 3
    },
    "inventory": [
      {"id": "bread", "quantity": 3},
      {"id": "apostle_coin_peter", "quantity": 1}
    ],
    "questFlags": {
      "met_peter": true,
      "apostle_coins_collected": 2,
      "level1_complete": true
    },
    "enemiesDefeated": ["enemy_1_id", "enemy_2_id"],
    "dialoguesSeen": ["intro_1", "intro_2"]
  }
}
```

#### Features

- **3 Save Slots:** Multiple students on same device
- **Slot Preview:** Shows level, playtime, progress %
- **No Save Punishment:** Can’t lose >2 min progress
- **Visual Feedback:** “Game Saved ✓” notification
- **Export/Import:** JSON export for teacher review

### 4.7 Audio System

#### Music

- **Style:** 8-bit/16-bit chiptune, MIDI-like
- **Format:** MP3 or OGG (browser compatibility)
- **Tracks:**
  - Title theme
  - Level 1: Hopeful exploration
  - Level 2: Tense sneaking
  - Level 3: Contemplative library
  - Level 4: Sacred reverence
  - Level 5: Triumphant finale
  - Combat theme
  - Victory jingle
  - Game over theme

#### Sound Effects

- **Player:** Footsteps, item pickup, level up
- **UI:** Menu navigate, menu select, dialogue advance
- **Combat:** Attack, hit, miss, heal, critical
- **World:** Door open/close, chest open, save chime
- **Abilities:** Unique sound per Church Father ability

#### Implementation

- **Web Audio API:** For synthesis and playback
- **Volume Controls:** Master, Music, SFX separate
- **Mute Button:** Always accessible
- **Visual Indicators:** Show when sound plays (accessibility)
- **No Essential Audio:** Gameplay never requires hearing

-----

## 5. LEVEL DESIGN

### 5.1 Level 1: The Apostolic Age (30-100 AD)

#### Learning Objectives

- Identify the 12 apostles and their mission
- Understand Jesus’s message of love
- Learn what “apostle” means
- Recognize early challenges faced by Christians

#### Narrative

Player meets Apostle Peter in Jerusalem catacombs. Peter explains the apostles’ mission to spread Jesus’s teachings. Player explores three paths meeting different apostles (Peter, James, John), each sharing part of the story. Collect 3 Apostle Coins. Final encounter with Roman patrol introduces combat.

#### Map Layout

- **Size:** 20x15 tiles (640x480 pixels)
- **Starting Chamber:** Safe zone with Peter
- **Three Paths:** One per apostle to meet
- **Hidden Rooms:** Contain extra items
- **Checkpoint:** Midpoint altar
- **Boss Room:** Roman Centurion

#### Collectibles

- 3 Apostle Coins (Peter, James, John)
- 2 Bread (healing items)
- 1 Prayer Beads (equipment)
- 1 Scripture Scroll (hidden, full heal)

#### Enemies

- **Doubtful Villager** (HP: 30, Attack: 5) - Easy
- **Roman Scout** (HP: 50, Attack: 8) - Medium
- **Roman Centurion** (HP: 80, Attack: 12) - Boss

#### Questions (5 total)

1. What does “apostle” mean? → One who is sent
1. How many apostles did Jesus choose? → 12
1. What did apostles teach? → Love God and neighbor
1. Who led the apostles? → Peter
1. Why did Romans oppose Christians? → Refused to worship emperor

#### Victory Condition

- Collect all 3 Apostle Coins
- Defeat Roman Centurion
- Unlock door to Level 2

**Estimated Time:** 9-12 minutes

-----

### 5.2 Level 2: The Persecutions (100-250 AD)

#### Learning Objectives

- Understand why Christians were persecuted
- Learn about life in the underground church
- Identify martyrs and their significance
- Recognize secret Christian symbols (Ichthys)

#### Narrative

150 AD. Player enters occupied catacombs. Roman patrols search for Christians. Meet Polycarp hiding in the catacombs. He explains persecution and martyrdom. Player must sneak past guards or fight. Collect 4 Martyr Tokens representing historical martyrs. Learn about secret fish symbol. Escape or confront prefect.

#### New Mechanic: Stealth

- **Patrol Routes:** Guards walk predetermined paths
- **Vision Cones:** See where guards are looking
- **Hiding Spots:** Alcoves, shadows, behind pillars
- **Detection:** If caught, forced combat (harder enemies)
- **Reward:** Bonus items for successful stealth

#### Map Layout

- **Size:** 25x20 tiles (800x640 pixels)
- **Winding Catacombs:** Labyrinth design
- **Patrol Routes:** 3-4 guards with overlapping coverage
- **Secret Passages:** Hidden shortcuts
- **Shrine Room:** Checkpoint with lore
- **Escape Tunnel:** Final exit

#### Collectibles

- 4 Martyr Tokens (Polycarp, Ignatius, Perpetua, Felicity)
- Ichthys Pendant (stealth boost)
- Church Father Letter (Polycarp’s writing)
- 3 Bread

#### Enemies

- **Roman Patrol** (HP: 45, Attack: 10) - Avoidable
- **Informant** (HP: 35, Attack: 7) - Surprise encounter
- **Prefect** (HP: 100, Attack: 15) - Boss

#### Questions (6 total)

1. Why did Rome persecute Christians? → Refused emperor worship
1. What is a martyr? → One who dies for faith
1. What symbol did secret Christians use? → Fish (Ichthys)
1. What does Ichthys mean? → Jesus Christ, God’s Son, Savior
1. Why meet in catacombs? → Safe from Roman authorities
1. Who was Polycarp? → Early church father and martyr

**Estimated Time:** 10-14 minutes

-----

### 5.3 Level 3: The Creeds (250-325 AD)

#### Learning Objectives

- Define what a creed is
- Understand why the church needed creeds
- Learn key phrases from Nicene Creed
- Know about Council of Nicaea (325 AD)

#### Narrative

325 AD. Confusion in the church! Different bishops teach different things about Jesus. Meet young Athanasius who explains the problem. Search the library for true teachings. Collect 5 Creed Fragments from different sources. Assemble the fragments in correct order at the Council chamber. Final debate with Arius (through question-based combat).

#### New Mechanic: Puzzles

- **Creed Assembly:** Drag-and-drop or sequential selection
- **Correct Order:** 5 fragments must be arranged correctly
- **Hints:** After 2 wrong attempts, provide clues
- **Educational:** Each fragment teaches part of creed
- **Door Locks:** Correct assembly opens paths

#### Simplified Nicene Creed Fragments

1. “We believe in one God”
1. “The Father Almighty”
1. “And in one Lord Jesus Christ”
1. “Of one being with the Father”
1. “Who came down from heaven”

#### Map Layout

- **Size:** 22x18 tiles (704x576 pixels)
- **Grand Library:** Central hub with books
- **5 Bishop Chambers:** One fragment each
- **Council Chamber:** Puzzle room
- **Athanasius’s Study:** Checkpoint and lore
- **Debate Hall:** Boss area

#### Collectibles

- 5 Creed Fragments (quest items)
- Athanasius’s Letter (lore)
- Trinity Shield (equipment)
- 2 Scripture Scrolls

#### Enemies

- **Confused Scholar** (HP: 40, Attack: 6) - Wants answers
- **Arian Follower** (HP: 60, Attack: 11) - Debate combat
- **Arius** (HP: 120, Attack: 14) - Multi-stage boss

#### Questions (7 total)

1. What is a creed? → Statement of belief
1. Why did church need creeds? → To agree on truth
1. When was Council of Nicaea? → 325 AD
1. What did Nicene Creed settle? → Jesus’s divine nature
1. Who was Athanasius? → Defender of orthodoxy
1. Who opposed Athanasius? → Arius
1. What does “consubstantial” mean? → Same substance as God

**Estimated Time:** 12-16 minutes

-----

### 5.4 Level 4: The Church Fathers (325-400 AD)

#### Learning Objectives

- Identify key Church Fathers (Augustine, Jerome, Ambrose)
- Understand their contributions
- Learn about major theological works
- Recognize importance of scholarship

#### Narrative

380 AD. Player arrives at monastery where elderly Church Fathers teach. Each Father gives a quest and teaches a special ability. Use combined abilities to access forbidden library being threatened by book burners. Protect sacred texts from corrupt official.

#### New Mechanic: Abilities

**Three Learnable Powers:**

1. **Augustine’s Wisdom** (from Augustine of Hippo)
- **Effect:** Reveal hidden messages on walls
- **Use:** Find secret doors and clues
- **Teaching:** Augustine wrote Confessions & City of God
1. **Jerome’s Translation** (from St. Jerome)
- **Effect:** Decode Latin inscriptions
- **Use:** Solve text puzzles
- **Teaching:** Jerome translated Bible (Vulgate)
1. **Ambrose’s Courage** (from Ambrose of Milan)
- **Effect:** Stand firm in dialogue, break barriers
- **Use:** Special dialogue options, physical obstacles
- **Teaching:** Ambrose confronted Emperor Theodosius

**Ability Usage:**

- Press number keys or touch icons
- Environmental challenges require specific abilities
- Must collect all three to complete level

#### Map Layout

- **Size:** 24x20 tiles (768x640 pixels)
- **Monastery Courtyard:** Central hub
- **Augustine’s Study:** Philosophy chamber
- **Jerome’s Scriptorium:** Translation room
- **Ambrose’s Chapel:** Courage trial
- **Forbidden Library:** Final challenge
- **Secret Archives:** Hidden lore

#### Collectibles

- 3 Church Father Scrolls (unlock abilities)
- Augustine’s Ring (wisdom boost)
- Jerome’s Pen (translation tool)
- Ambrose’s Staff (courage symbol)
- 4 Bread

#### Enemies

- **Book Burner** (HP: 50, Attack: 9) - Vandal
- **Imperial Censor** (HP: 70, Attack: 12) - Bureaucrat
- **Corrupt Prefect** (HP: 140, Attack: 16) - Boss

#### Questions (8 total)

1. What did Augustine write? → Confessions, City of God
1. What is the Vulgate? → Latin Bible translation
1. Who translated the Bible to Latin? → Jerome
1. Who confronted Emperor Theodosius? → Ambrose
1. Why was Ambrose important? → Stood for church authority
1. What did Augustine teach about grace? → Salvation through God’s grace
1. Why translate Bible to Latin? → So common people could read
1. What did Church Fathers preserve? → Theological truth

**Estimated Time:** 14-18 minutes

-----

### 5.5 Level 5: Constantine & The Final Challenge (312-400 AD)

#### Learning Objectives

- Understand Constantine’s conversion
- Learn about the Edict of Milan (313 AD)
- Comprehend Christianity’s legalization
- See transformation from underground to established

#### Narrative

312 AD. Constantine sees vision before Battle of Milvian Bridge (“In this sign, conquer” - Chi-Rho symbol). Church emerges from catacombs. Player witnesses Edict of Milan proclamation at imperial palace. Old guard attempts final persecution. Multi-phase boss using all learned mechanics. Victory establishes church legitimacy.

#### Three Acts Structure

**Act 1: The Vision** (Underground)

- Constantine’s vision cutscene
- Chi-Rho symbol explained
- Battle of Milvian Bridge narrative
- Transition from darkness to light

**Act 2: The Edict** (Surface)

- FIRST TIME ABOVE GROUND
- Bright palace contrasts with catacombs
- Meet Constantine in throne room
- Edict of Milan ceremony
- “Christians may worship freely”

**Act 3: The Test** (Arena)

- Final boss: General of old regime
- Multi-phase fight testing ALL mechanics
- Phase 1: Combat (standard)
- Phase 2: Stealth (avoid attacks)
- Phase 3: Puzzle (arrange symbols)
- Phase 4: Abilities (use all three powers)

#### Map Layout

- **Size:** 28x22 tiles (896x704 pixels)
- **Catacomb Exit:** Ascending tunnel
- **Palace Courtyard:** Open, bright, monumental
- **Throne Room:** Edict ceremony location
- **Imperial Arena:** Final boss battle
- **Victory Monument:** Epilogue scene

#### Collectibles

- Chi-Rho Shield (Constantine’s gift)
- Imperial Seal (quest completion)
- Commemorative Coins (set completion bonus)
- 5 Bread (final challenges)

#### Enemies

- **Old Guard Soldier** (HP: 60, Attack: 13)
- **Hardliner Prefect** (HP: 80, Attack: 15)
- **Final Boss - General** (HP: 200, Attack: 18, Multi-phase)

#### Multi-Phase Boss Questions

- **Phase 1:** “What did Constantine see?” → Chi-Rho in sky
- **Phase 2:** “What was Edict of Milan?” → Made Christianity legal
- **Phase 3:** “What year was the Edict?” → 313 AD
- **Phase 4:** “How did Church Fathers preserve truth?” → Writing and councils

#### Victory Sequence

1. Boss defeated
1. Cutscene: Church triumphant, Christians free
1. Scrolling credits with historical facts
1. “You’ve completed 300 years of church history!”
1. Unlock: Scholar Mode (harder questions, faster gameplay)

#### Historical Epilogue

```
"Congratulations, scholar!

You've journeyed through 300 years of early church history.

From 12 apostles in Jerusalem...
To a legal religion across the Roman Empire.

The creeds you assembled still guide Christians today.
The Church Fathers you met shaped theology forever.
The martyrs you honored inspire faith even now.

You've witnessed how faith survived persecution,
How truth was preserved through writing,
How courage stood against emperors.

Well done, young historian!"
```

**Estimated Time:** 16-20 minutes

-----

## 6. VISUAL DESIGN

### 6.1 Art Style

- **Era:** 8-16 bit retro (NES/SNES aesthetic)
- **Palette:** Limited color palette (16-32 colors per sprite)
- **Resolution:** Pixel-perfect rendering
- **Tile Size:** 32x32 pixels
- **Sprite Size:** Player/enemies 24x32, portraits 64x64
- **Style Reference:** Early Final Fantasy, Dragon Quest

### 6.2 Color Palette (Dyslexia-Friendly)

**Primary Colors:**

- Background: `#f5f5dc` (Cream)
- Text: `#2c2c2c` (Dark Gray)
- Player: `#4a6fa5` (Blue)
- Enemy: `#a64253` (Red)
- NPC: `#8b7355` (Brown)
- UI Border: `#8b4513` (Saddle Brown)

**Tile Colors:**

- Floor: `#8b7355` (Stone brown)
- Wall: `#4a4a4a` (Dark gray)
- Door: `#d4af37` (Gold)
- Water: `#4a7c9b` (Blue-gray)
- Grass: `#6b8e23` (Olive green)

**UI Colors:**

- Success: `#4a7c59` (Green)
- Danger: `#a64253` (Red)
- Warning: `#d4a017` (Gold)
- Info: `#4a6fa5` (Blue)

**Colorblind Mode:**

- Alternative palette using patterns + colors
- Blue/Orange scheme instead of Red/Green

### 6.3 Sprite Requirements

#### Characters

- **Player:** 4 directions (up, down, left, right), 2-frame walk animation
- **NPCs:** Static facing sprites, 64x64 portraits
- **Enemies:** Facing sprites, simple attack animations
- **Bosses:** Larger sprites (64x64 or 96x96)

#### Tiles

- **Floor Variations:** Stone, dirt, wood (3 types)
- **Walls:** Stone, brick, catacomb (3 types)
- **Interactive:** Doors, chests, altars, torches
- **Decorative:** Pillars, statues, books, rubble

#### UI Elements

- **Icons:** 16x16 for items, abilities, status
- **Portraits:** 64x64 for NPCs in dialogue
- **Buttons:** Touch-friendly sizes (44x44 minimum)
- **Cursors:** Selection indicators

### 6.4 Animation Requirements

- **Player Walk:** 2 frames per direction (8 frames total)
- **Enemy Idle:** Optional 2-frame breathing
- **Attack Effect:** Simple flash or swing
- **Damage Flash:** Red tint on sprite
- **Typewriter:** Smooth character appearance
- **UI Transitions:** Fade in/out (200ms)

### 6.5 Placeholder Strategy

**For MVP (Initial Development):**

- Colored rectangles for sprites
- Single character initials for portraits
- Solid colors for tiles
- Text labels for UI

**For Final (Art Production):**

- Pixel art sprites
- Hand-drawn portraits
- Textured tiles
- Icon graphics

-----

## 7. CONTENT REQUIREMENTS

### 7.1 Dialogue Count

- **Level 1:** ~15 dialogue boxes
- **Level 2:** ~18 dialogue boxes
- **Level 3:** ~20 dialogue boxes
- **Level 4:** ~22 dialogue boxes
- **Level 5:** ~25 dialogue boxes
- **Total:** ~100 dialogue boxes

### 7.2 Question Bank

- **Level 1:** 5 questions (apostles, early church)
- **Level 2:** 6 questions (persecution, martyrs)
- **Level 3:** 7 questions (creeds, councils)
- **Level 4:** 8 questions (church fathers, scholarship)
- **Level 5:** 4 questions (Constantine, legitimization)
- **Total:** 30 unique questions

### 7.3 Enemy Roster

- **Level 1:** 3 enemy types + 1 boss
- **Level 2:** 3 enemy types + 1 boss
- **Level 3:** 3 enemy types + 1 boss
- **Level 4:** 3 enemy types + 1 boss
- **Level 5:** 3 enemy types + 1 multi-phase boss
- **Total:** 15 enemy types, 5 bosses

### 7.4 Item List

**Consumables:**

- Bread (heal 20 HP)
- Water (heal 10 HP)
- Scripture Scroll (full heal, rare)
- Blessed Wine (HP + temporary stat boost)

**Quest Items:**

- Apostle Coins (12 total, 3 per level 1)
- Martyr Tokens (4 for level 2)
- Creed Fragments (5 for level 3)
- Church Father Scrolls (3 for level 4)
- Imperial Seal (level 5)

**Equipment:**

- Faith Shield (+5 defense)
- Prayer Beads (+3 wisdom for questions)
- Trinity Shield (+8 defense, level 3 reward)
- Augustine’s Ring (+wisdom)
- Jerome’s Pen (+translation power)
- Ambrose’s Staff (+courage)
- Chi-Rho Shield (+10 defense, final reward)

**Collectibles:**

- Commemorative Coins (hidden in each level)
- Church Father Letters (lore items)

### 7.5 Music Tracks

1. Title Theme (1 min loop)
1. Level 1 Music (2 min loop)
1. Level 2 Music (2 min loop)
1. Level 3 Music (2 min loop)
1. Level 4 Music (2 min loop)
1. Level 5 Music (2 min loop)
1. Combat Theme (1.5 min loop)
1. Victory Jingle (10 sec)
1. Game Over Theme (15 sec)
1. Final Victory (30 sec)

### 7.6 Sound Effects (Minimum)

- Footstep (stone)
- Door open/close
- Item pickup
- Menu navigate
- Menu select
- Dialogue advance
- Attack (player)
- Attack (enemy)
- Hit (take damage)
- Miss
- Heal
- Level up
- Ability use (3 unique)
- Save chime
- Puzzle correct
- Puzzle incorrect

-----

## 8. VOCABULARY & LANGUAGE

### 8.1 Tier 1 Vocabulary (Essential - Must Know)

- **Apostle:** One sent by God to spread His message
- **Creed:** A statement of belief
- **Persecution:** Being harmed for your beliefs
- **Emperor:** Ruler of Rome
- **Church Father:** Important early Christian teacher

### 8.2 Tier 2 Vocabulary (Important - Should Know)

- **Martyr:** Someone who dies for their faith
- **Council:** Meeting of church leaders
- **Edict:** Official order from emperor
- **Catacomb:** Underground burial place
- **Trinity:** God as Father, Son, Holy Spirit

### 8.3 Tier 3 Vocabulary (Enrichment - Could Know)

- **Heresy:** False teaching
- **Orthodox:** Correct belief
- **Constantine:** Emperor who legalized Christianity
- **Nicaea:** City where important council met
- **Augustine:** Church Father who wrote Confessions
- **Jerome:** Translated Bible to Latin
- **Vulgate:** Latin Bible translation
- **Ambrose:** Church Father who confronted emperor

### 8.4 Historical Names (Simplified)

**Apostles:**

- Peter (leader)
- James (brother of John)
- John (beloved disciple)
- Paul (missionary to non-Jews)

**Martyrs:**

- Polycarp (burned at stake)
- Ignatius (fed to lions)
- Perpetua (young mother)
- Felicity (her servant)

**Church Fathers:**

- Augustine of Hippo
- Jerome
- Ambrose of Milan
- Athanasius

**Emperors:**

- Nero (persecutor)
- Diocletian (great persecution)
- Constantine (converter)
- Theodosius (confronted by Ambrose)

### 8.5 Language Guidelines

#### For Dialogue

- **Sentence Length:** Maximum 15 words
- **Vocabulary Level:** 3rd-4th grade reading level
- **Tone:** Conversational, not preachy
- **Avoid:** Theological jargon without explanation
- **Include:** Context clues for new words

#### For Questions

- **Question Stem:** Clear, direct (8-12 words)
- **Answer Choices:** 3-5 words each
- **Distractors:** Plausible but clearly wrong
- **Explanation:** 1-2 sentences after answer

#### Example Question Structure

```
Question: "What does 'apostle' mean?"

Choices:
A) One who is sent ✓
B) A temple priest
C) A Roman soldier

Explanation: "Apostle comes from Greek 'apostolos' meaning 
'one who is sent.' Jesus sent the 12 apostles to spread 
His message."
```

-----

## 9. USER EXPERIENCE FLOWS

### 9.1 First-Time Player Experience

**Flow:**

```
1. Title Screen
   ↓ (Press SPACE)
2. "Welcome! Use WASD to move, SPACE to interact"
   ↓
3. Tutorial Movement (5 seconds)
   ↓
4. First Dialogue (Peter introduction)
   ↓
5. Tutorial Combat (scripted easy fight)
   ↓
6. "You can save anytime at glowing altars"
   ↓
7. First Save Point
   ↓
8. Free Exploration
```

**Tutorial Elements:**

- **Movement:** “Use WASD or Arrow keys to walk”
- **Dialogue:** “Press SPACE to advance text”
- **Combat:** “Choose your action from the menu”
- **Questions:** “Correct answers help you in battle”
- **Inventory:** “Press I to see your items”
- **Save:** “Walk into glowing altars to save”

### 9.2 Save/Load Flow

**Saving:**

```
1. Walk to checkpoint altar (auto-highlight when near)
2. Press SPACE
3. "Save to which slot?" (show 3 slots)
4. Select slot
5. "Game Saved ✓" (2 second notification)
6. Continue playing
```

**Loading:**

```
1. Title Screen → "Continue"
2. Show 3 save slots with preview:
   - Level name
   - Timestamp
   - Progress % (optional)
   - Playtime
3. Select slot
4. Confirm "Load this game?"
5. Game loads to exact saved position
```

**Auto-Save:**

- Silent save every 2 minutes
- Small icon flashes in corner
- No interruption to gameplay
- Uses last selected slot

### 9.3 Combat Flow

**Entry:**

```
1. Player walks into enemy sprite
2. Screen fade to black (300ms)
3. Combat screen fades in (300ms)
4. Enemy intro: "[Enemy Name] blocks your path!"
5. Combat UI appears
6. Player turn begins
```

**Turn Sequence:**

```
PLAYER TURN:
1. Action menu appears (Attack/Defend/Item/Question)
2. Player selects action
3. Action executes with animation
4. Damage/effect resolves
   ↓
ENEMY TURN:
5. Enemy AI chooses action
6. Attack animation
7. Damage resolves
   ↓
8. Check win/lose conditions
9. If battle continues → return to step 1
```

**Victory:**

```
1. Enemy sprite flashes, fades out
2. "Victory!" text
3. XP gained ("+20 XP")
4. Level up check (if applicable)
5. Items dropped (if any)
6. Return to exploration (fade transition)
```

**Defeat:**

```
1. Player HP reaches 0
2. Screen shakes
3. "You were defeated..."
4. Hint based on battle (e.g., "Try defending more!")
5. Respawn at last checkpoint
6. HP restored to 50%
```

### 9.4 Dialogue Flow

**Linear Dialogue:**

```
1. Walk to NPC, press SPACE
2. Dialogue box slides up from bottom
3. Portrait appears left side
4. Speaker name appears
5. Text types out character by character
   - Can press SPACE to skip typing
6. Continue arrow blinks when done
7. Press SPACE to advance
8. Repeat steps 5-7 for subsequent boxes
9. Dialogue ends, box slides down
```

**Branching Dialogue (Choices):**

```
1-5. [Same as linear]
6. Choice menu appears with 2-3 options
7. UP/DOWN to navigate choices
8. Selected choice highlighted
9. Press SPACE to select
10. Dialogue branches based on choice
11. Continue as linear dialogue
```

-----

## 10. TECHNICAL CONSTRAINTS

### 10.1 Performance Targets

- **Frame Rate:** Stable 60 FPS
- **Load Time:** <3 seconds per level
- **Save Time:** <100ms (imperceptible)
- **Asset Load:** Lazy loading per level
- **Memory:** <100MB total
- **Canvas Rendering:** Only redraw changed areas (dirty rectangles)

### 10.2 LocalStorage Limits

- **Total Quota:** ~5-10MB (browser dependent)
- **Per Save Slot:** <100KB
- **Strategy:** Compress JSON, store only diffs
- **Fallback:** Warn user if quota exceeded

### 10.3 Browser Compatibility

**Required Features:**

- Canvas API (2D context)
- Web Audio API
- LocalStorage
- RequestAnimationFrame
- ES6+ JavaScript
- Fetch API (for JSON loading)

**Polyfills Not Needed:**

- IE11 support (not required)
- Older mobile browsers

**Testing Matrix:**

|Browser|Version|Platform|Priority|
|-------|-------|--------|--------|
|Safari |15+    |iOS     |P0      |
|Chrome |Latest |Desktop |P1      |
|Safari |Latest |macOS   |P1      |
|Edge   |Latest |Desktop |P2      |
|Firefox|Latest |Desktop |P2      |

### 10.4 Asset Optimization

**Images:**

- Format: PNG-8 (indexed color)
- Compression: TinyPNG or similar
- Sprite Sheets: Combine small sprites
- Max File Size: 50KB per sprite sheet

**Audio:**

- Format: MP3 (best compatibility)
- Bitrate: 96kbps for music, 64kbps for SFX
- Length: Loop points for seamless repetition
- Max File Size: 500KB per music track, 20KB per SFX

**JSON:**

- Minify for production
- No comments in production files
- Use short key names

**Code:**

- Minify JavaScript for production
- Remove console.log statements
- Bundle related files
- Use compression (gzip via GitHub Pages)

-----

## 11. EDUCATIONAL STANDARDS ALIGNMENT

### 11.1 National Standards (Optional)

**NCSS (National Council for Social Studies):**

- Theme 1: Culture
- Theme 2: Time, Continuity, and Change
- Theme 5: Individuals, Groups, and Institutions

**Common Core ELA (Reading Informational Text):**

- CCSS.ELA-LITERACY.RI.3-6.1: Ask and answer questions
- CCSS.ELA-LITERACY.RI.3-6.3: Describe relationships between events
- CCSS.ELA-LITERACY.RI.3-6.7: Use information from text

### 11.2 Learning Outcomes

**Knowledge (Remember):**

- List the 12 apostles
- Define key terms (apostle, creed, martyr)
- Identify dates (325 AD, 313 AD)

**Comprehension (Understand):**

- Explain why Christians were persecuted
- Describe what creeds accomplish
- Summarize Constantine’s role

**Application (Apply):**

- Connect historical events to outcomes
- Use learned vocabulary in context
- Demonstrate understanding through gameplay choices

**Analysis (Analyze):**

- Compare different Church Fathers’ contributions
- Distinguish between correct and incorrect theological statements
- Examine cause-and-effect in history

### 11.3 Assessment Methods

**Embedded Assessment:**

- Combat questions (correct/incorrect tracking)
- Dialogue choices (revealing understanding)
- Puzzle solutions (applying knowledge)
- Completion metrics (quest items collected)

**Post-Game Reflection:**

- “What surprised you about early Christians?”
- “Which Church Father was most interesting?”
- “Why do you think creeds were important?”

**Teacher Dashboard (Optional):**

- Question accuracy per topic
- Time spent per level
- Concepts needing review
- Overall comprehension score

-----

## 12. DEVELOPMENT PRIORITIES

### 12.1 MVP (Minimum Viable Product)

**Phase 1: Core Engine (Week 1-2)**

- Game loop (60 FPS)
- Input handling (keyboard)
- Camera system
- Tile-based map
- Player movement with collision
- Basic renderer (colored rectangles)

**Phase 2: Dialogue (Week 2-3)**

- Dialogue manager
- Dialogue UI (dyslexia-friendly)
- Typewriter effect
- Linear and branching dialogue
- Test dialogues for Level 1

**Phase 3: Combat (Week 3-4)**

- Turn-based combat system
- Combat UI
- Enemy AI (basic)
- Question integration
- 3 test enemies

**Phase 4: Level 1 Complete (Week 4-5)**

- Full Level 1 map
- All dialogue written
- All questions written
- 3 enemies + 1 boss
- Collectibles system
- Victory condition

**Phase 5: Save System (Week 5)**

- LocalStorage save/load
- 3 save slots
- Auto-save implementation
- Save UI

**MVP Deliverable:** Playable Level 1 (9-12 minutes) with all core systems functional.

### 12.2 Feature Complete

**Phase 6-9: Levels 2-5 (Week 6-12)**

- One level per 1.5 weeks
- Each introduces new mechanic
- Progressive difficulty
- Full content (dialogue, questions, enemies)

**Phase 10: Polish (Week 13)**

- UI/UX refinement
- Accessibility testing
- Bug fixes
- Performance optimization

**Phase 11: Audio (Week 14)**

- Music composition/integration
- Sound effects
- Audio controls

**Phase 12: Art (Week 15-16)**

- Sprite creation
- Portrait art
- Tile textures
- UI graphics

**Feature Complete Deliverable:** All 5 levels playable, all systems working, placeholder art.

### 12.3 Production Ready

**Phase 13: Art Production (Week 17-18)**

- Replace all placeholders
- Consistent art style
- Animations

**Phase 14: Testing (Week 19)**

- Playtesting with target audience
- Accessibility audit
- Cross-browser testing
- Bug fixes

**Phase 15: Deployment (Week 20)**

- GitHub Pages setup
- Service worker
- Documentation (README, Teacher Guide)
- Analytics (optional)

**Production Ready Deliverable:** Fully polished game ready for classroom use.

-----

## 13. SUCCESS METRICS

### 13.1 Educational Metrics

- **Comprehension:** 80%+ accuracy on questions by level 5
- **Engagement:** 90%+ of students complete all 5 levels
- **Retention:** Students can answer questions 1 week later
- **Accessibility:** Students with dyslexia/ADHD complete without frustration

### 13.2 Technical Metrics

- **Performance:** 60 FPS maintained on iPad Safari
- **Stability:** <1 crash per 100 play sessions
- **Load Times:** <3 seconds per level
- **Save Reliability:** 100% save success rate

### 13.3 User Experience Metrics

- **Time to First Action:** <30 seconds from load to movement
- **Tutorial Clarity:** 90%+ understand controls without help
- **Difficulty Balance:** <10% retry rate on non-boss combat
- **Progression Pacing:** 9-18 minutes per level (as designed)

-----

## 14. RISK MITIGATION

### 14.1 Technical Risks

**Risk:** LocalStorage quota exceeded

- **Mitigation:** Compress save data, warn before limit, allow export

**Risk:** Audio not loading on iPad

- **Mitigation:** Require user interaction before audio, fallback to silent mode

**Risk:** Performance drops below 60 FPS

- **Mitigation:** Dirty rectangle rendering, reduce particle effects, profile and optimize

**Risk:** Browser compatibility issues

- **Mitigation:** Test early on target platforms, use widely supported APIs

### 14.2 Content Risks

**Risk:** Historical inaccuracy

- **Mitigation:** Fact-check with theological consultant, cite sources

**Risk:** Denominational bias

- **Mitigation:** Focus on universally accepted early church history, avoid disputed theology

**Risk:** Reading level too high

- **Mitigation:** Test with target age group, revise based on feedback

**Risk:** Cultural insensitivity

- **Mitigation:** Avoid glorifying violence/persecution, emphasize historical context

### 14.3 Educational Risks

**Risk:** Students don’t learn intended concepts

- **Mitigation:** Embedded assessment, teacher feedback loop, iterative content revision

**Risk:** Game too easy/hard

- **Mitigation:** Difficulty settings, extensive playtesting, forgiving mechanics

**Risk:** Accessibility gaps

- **Mitigation:** Follow WCAG guidelines, test with students who have learning differences

-----

## 15. FUTURE ENHANCEMENTS (Post-Launch)

### 15.1 Additional Content

- **Level 6-7:** Reformation era (optional expansion)
- **Side Quests:** Deeper dives into specific Church Fathers
- **Collectible Cards:** Trading card-style character bios
- **Achievements:** 30+ unlockable achievements

### 15.2 Features

- **Multiplayer:** Turn-based co-op mode (local)
- **Character Creator:** Customize player appearance
- **Difficulty Modes:** Easy/Normal/Scholar
- **Speedrun Timer:** For competitive students
- **New Game+:** Replay with harder questions

### 15.3 Platforms

- **Desktop App:** Electron wrapper for offline play
- **Mobile App:** iOS/Android native apps
- **Chromebook:** PWA installation

### 15.4 Teacher Tools

- **Lesson Plans:** Accompanying curriculum
- **Printable Worksheets:** Offline reinforcement
- **Quiz Generator:** Export questions for testing
- **Progress Reports:** Detailed analytics per student

-----

## 16. APPENDICES

### 16.1 Glossary of Technical Terms

**AABB:** Axis-Aligned Bounding Box (collision detection)
**Canvas:** HTML5 element for 2D/3D graphics
**Dirty Rectangle:** Only redrawing changed screen areas
**FPS:** Frames Per Second (target: 60)
**Game Loop:** Core update/render cycle
**Tile-Based:** World built from grid of square tiles
**Typewriter Effect:** Text appearing character by character
**Web Audio API:** Browser API for sound synthesis/playback

### 16.2 Historical Sources

**Primary Sources:**

- Nicene Creed (325 AD)
- Edict of Milan (313 AD)
- Augustine’s Confessions
- Eusebius’s Church History

**Secondary Sources:**

- “Early Christian Doctrines” by J.N.D. Kelly
- “The Early Church” by Henry Chadwick
- “Christianity: The First Three Thousand Years” by Diarmaid MacCulloch

### 16.3 Development Tools

**Recommended:**

- **Code Editor:** VS Code with Copilot
- **Version Control:** Git + GitHub
- **Pixel Art:** Aseprite, Piskel (web)
- **Audio:** Beepbox (chiptune), Audacity
- **Testing:** BrowserStack (cross-browser)
- **Deployment:** GitHub Pages (free hosting)

### 16.4 Accessibility Resources

**Guidelines:**

- WCAG 2.1 Level AA
- Game Accessibility Guidelines (gameaccessibilityguidelines.com)

**Testing Tools:**

- Wave (accessibility checker)
- Coblis (colorblind simulation)
- Screen reader testing (NVDA)

-----

## 17. CONTACT & ATTRIBUTION

### 17.1 Credits Template

```
CATACOMBS & CREEDS: The Early Church Quest

Game Design: [Your Name]
Programming: [Contributors]
Art: [Artists]
Music: [Composers]
Historical Consultation: [Consultant]

Special Thanks:
- Students of [School Name] for playtesting
- [Teacher Name] for educational guidance

Educational Resources:
- [List sources]

Built with:
- HTML5 Canvas
- Web Audio API
- JavaScript (ES6+)

License: [Choose license]
```

### 17.2 License Recommendations

**For Educational Use:**

- Creative Commons BY-NC-SA 4.0 (Attribution, Non-Commercial, Share-Alike)

**For Open Source:**

- MIT License (permissive)
- GPL v3 (copyleft)

### 17.3 Privacy & Data

**Student Data Protection:**

- No server-side data collection
- All data stored locally on device
- No third-party analytics (unless opt-in)
- Compliance with COPPA (Children’s Online Privacy Protection Act)
- FERPA compliance (Family Educational Rights and Privacy Act)

**Privacy Policy (Summary):**

```
This game:
- Does NOT collect personal information
- Does NOT transmit data to servers
- Stores game progress locally on your device only
- Does NOT use cookies or tracking
- Is safe for children under 13
```

-----

**END OF DESIGN DOCUMENT**

-----

## Document Metadata

**Version:** 1.0  
**Last Updated:** February 10, 2026  
**Status:** Ready for Development  
**Next Steps:** Provide to GitHub Copilot for implementation planning

-----

## Usage Instructions for GitHub Copilot

This document serves as the complete specification for the “Catacombs & Creeds” educational game. When using GitHub Copilot to implement this project:

1. **Start with Core Systems:** Begin with Section 4 (Game Systems) to understand the foundational architecture
1. **Reference Technical Specs:** Section 2 provides all technical constraints and requirements
1. **Prioritize Accessibility:** Section 3 is critical - these are non-negotiable requirements
1. **Follow Development Phases:** Section 12 outlines the recommended build order
1. **Use Content Specs:** Sections 7-8 define all content requirements and language guidelines
1. **Implement Level-by-Level:** Section 5 provides complete specifications for each level

**Key Principles:**

- Dyslexia-friendly text rendering is mandatory
- ADHD accommodations (auto-save, clear objectives) are required
- Educational content must be age-appropriate and historically accurate
- Performance target is 60 FPS on iPad Safari
- All mechanics must be forgiving and encourage learning

**For Each Implementation Session:**

1. Reference the relevant section of this document
1. Follow the technical specifications exactly
1. Prioritize accessibility requirements
1. Test on target platform (iPad Safari)
1. Validate educational content accuracy