# Session 4: Dialogue System (New)

**Recommended Model: Opus** - Writing a brand new system from scratch that replaces 3 files. Needs careful architecture for state management, rendering, branching logic, accessibility features, and quest integration. High complexity.

## Goal
Replace both existing dialogue implementations with one clean system. Fully integrated with the game loop. Dyslexia-friendly. Supports linear sequences, branching choices, and quest flag triggers.

## Tasks

1. **Delete old dialogue files**: `dialogue.js`, `dialogueSystem.js`, `textRenderer.js`
2. **Create new `js/dialogue.js`** - Unified dialogue system:
   - **State management**: active/inactive, current sequence, current index
   - **Text rendering**: Dyslexia-friendly box (cream background #F5F0E8, dark text #2C2416, Comic Sans MS)
   - **Typewriter effect**: 30ms per character, skippable with SPACE
   - **Portrait display**: 64x64, left side of box, with placeholder generation for missing images
   - **Speaker name**: Bold, above text
   - **Word wrapping**: Automatic, no hyphenation, preserve word integrity
   - **Auto-splitting**: If text exceeds 15 words, automatically split into multiple sequential boxes at sentence boundaries (NOT truncation with "...")
   - **Choices**: 2-3 options, navigate with UP/DOWN arrows, select with SPACE/Enter, number keys for quick select
   - **Continue indicator**: Blinking down-arrow when text is complete
   - **TTS integration**: Toggle with T key, Web Speech API
   - **Quest flag triggers**: Dialogue nodes can set quest flags (e.g., `"setFlag": "met_peter"`)
   - **Branching**: Choice actions can specify next dialogue ID or inline dialogue sequence
   - **Callbacks**: `onComplete` callback for post-dialogue game logic
   - **No key conflicts**: Does NOT capture 'A' key. Only uses SPACE, Enter, Escape, arrows, number keys, T while active.
3. **Create `content/level1_dialogue.js`** - Level 1 dialogue content:
   - Tutorial introduction (narrator, 3 boxes)
   - Controls tutorial (guide, 3 boxes)
   - Peter's greeting and mission
   - James's teaching
   - John's teaching
   - Each apostle awards an Apostle Coin via quest flag
   - Roman Guard encounter (branching)
   - Boss pre-fight dialogue
   - Victory dialogue
   - Total: ~15 dialogue interactions
4. **Integrate with game loop**:
   - PLAYING -> DIALOGUE state transition when pressing SPACE near NPC
   - DIALOGUE -> PLAYING when dialogue ends
   - Player movement disabled during dialogue
   - Game renders world behind dialogue box (semi-transparent overlay optional)
5. **Load portraits** at game start:
   - Load all 4 existing PNGs (peter, paul, lydia, timothy)
   - Generate placeholders for missing characters (narrator, guide, guard, etc.)

## Files Modified
- `js/game.js` (dialogue integration, state transitions)
- `js/renderer.js` (render dialogue on top of game world)
- `index.html` (update script tags)

## Files Created
- `js/dialogue.js` (new unified system)
- `content/level1_dialogue.js`

## Files Deleted
- `js/dialogue.js` (old - replaced)
- `js/dialogueSystem.js`
- `js/textRenderer.js`
- `js/sampleDialogue.js` (content moved to level1_dialogue.js)
- `js/gameDialogueData.js` (content moved to level1_dialogue.js)

## Validation
- Walk up to NPC, press SPACE -> dialogue box appears
- Typewriter effect plays, SPACE skips to full text
- SPACE advances to next box
- Choices appear and are navigable
- Dialogue ends and returns to gameplay
- Quest flags are set correctly
- 'T' toggles TTS
- No key conflicts with movement
- Text auto-splits at 15 words instead of truncating
