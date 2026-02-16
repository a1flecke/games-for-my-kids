# Issue Resolution Plan: Catacombs & Creeds + Site-Wide Fixes

**Date:** 2026-02-15
**Issues covered:** #3, #4, #5, #12, #14, #15, #16, #17, #18, #19, #20, #22
**Reviewed as:** Senior HTML5 game developer with accessibility focus

---

## Priority Tiers

| Priority | Issues | Rationale |
|----------|--------|-----------|
| **P0 - Game-Breaking** | #22, #15, #17 | Data loss, player stuck, educational content broken |
| **P1 - Major UX** | #16, #19, #14, #20 | Unreadable UI, broken interactions, distracting visuals, blocked progression |
| **P2 - Cross-Game UX** | #12 | Navigation gap affecting all 10 games on iPad |
| **P3 - Content & Polish** | #5, #3, #18, #4 | Storyline, question variety, music, portraits |

---

## P0: Game-Breaking Bugs

### Issue #22: Auto-save overwrites slot 1

**Problem:** `SaveSystem.autoSave()` defaults to `this.currentSlot = 0` when no slot is active. If a player starts a new game without explicitly selecting a save slot, auto-save writes to slot 0 ("Slot 1" in the UI), overwriting another player's save data.

**Root cause:** `save.js:241-243` — When `currentSlot === null`, auto-save blindly picks slot 0.

**Fix:**
1. **On new game start:** Force the slot picker before gameplay begins. When the player clicks "New Game" on the title screen, show the save slot picker immediately and let them choose which slot to use for their new playthrough. Set `currentSlot` from their choice.
2. **Auto-save guard:** Change `autoSave()` to skip the save (with a console warning) if `currentSlot === null` instead of defaulting to 0. This prevents any accidental overwrites if the flow is somehow bypassed.
3. **Slot picker for "New Game":** In `screens.js` or `game.js`, when the player selects "New Game", show the slot picker in "new_game" mode. If a slot already has data, show a confirmation: "This will overwrite [Character Name]'s save. Continue?"

**Files:** `js/save.js`, `js/game.js`, `js/screens.js`

**Verification:**
- Start a new game, confirm slot picker appears first
- Save data in slot 2, start another new game in slot 1, verify slot 2 is untouched
- Auto-save fires only to the chosen slot

---

### Issue #15: Player gets stuck when opening door while standing on it

**Problem:** The player can interact with (toggle) a door tile they are currently standing on. When the door closes while the player occupies that tile, the player becomes trapped inside a now-solid tile and cannot move.

**Root cause:** Two problems:
1. `game.js:674-678` — `checkNearInteractable()` includes the tile the player is standing on as interactable, so the "SPACE" prompt appears.
2. `tilemap.js:251-255` — Door toggle has no check to prevent closing when the player occupies the tile.

**Fix:**
1. **Prevent door closing when occupied:** In `tilemap.js`, `interactDoor()`, add a check: if the door is currently open and the player is standing on this tile, do NOT close it. Return a message like "You can't close this door while standing in it."
2. **Better approach:** Pass the player's tile position to the interact handler, and check if `playerTile.x === doorTile.x && playerTile.y === doorTile.y`. If so, skip the close action.
3. **Safety net:** In `player.js` collision, if the player is somehow inside a solid tile, push them to the nearest walkable tile (anti-stuck failsafe).

**Files:** `js/tilemap.js`, `js/game.js`

**Verification:**
- Walk onto an open door tile, press SPACE, confirm door does NOT close
- Interact with a door from adjacent tile, confirm it toggles normally
- If a save is loaded with player on a now-closed door, verify the anti-stuck pushes them out

---

### Issue #17: Correct answer is always in position A

**Problem:** Quiz/combat question answers appear in a fixed order from `questions.json`. The correct answer is almost always the first choice in the JSON, so kids learn to always pick option 1 rather than actually learning the material. This defeats the educational purpose of the game.

**Root cause:** `combat.js:1341-1364` renders choices in `this.currentQuestion.choices` array order. `questions.js` returns the question as-is from the JSON. No shuffling occurs anywhere.

**Fix:**
1. **Shuffle answers on question retrieval:** In `questions.js`, `getQuestion()`, after selecting a question, clone it and shuffle the `choices` array using Fisher-Yates shuffle. Preserve the `correct` flag on each choice so answer checking still works.
2. **Implementation:**
   ```javascript
   // In getQuestion(), after selecting the question:
   const shuffled = { ...question, choices: [...question.choices] };
   // Fisher-Yates shuffle
   for (let i = shuffled.choices.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [shuffled.choices[i], shuffled.choices[j]] = [shuffled.choices[j], shuffled.choices[i]];
   }
   return shuffled;
   ```
3. **No changes needed to combat.js** — it already checks `choices[selectedChoice].correct`, which works regardless of order.

**Files:** `js/questions.js`

**Related check:** Verify all questions in `data/questions.json` have the `correct: true` flag set properly on exactly one choice each (not relying on position).

**Verification:**
- Enter combat 5+ times, confirm answer positions vary
- Confirm correct answers are still recognized in all positions
- Check that explanations still match the selected answer

---

## P1: Major UX Issues

### Issue #16: Inventory screen text overlaps

**Problem:** Text in the inventory screen overlaps and is unreadable. The panel (480x480) is too small for the item grid + equipment sidebar + quest items + item description, especially with the accessibility-required font sizes.

**Root cause:** `inventory.js:494-550` — Fixed panel dimensions that don't account for content overflow:
- Item grid (5 rows x 60px + 6px gap each = 330px) starts at panelY+45
- Item description overlaps quest items section (only 18px gap)
- Equipment sidebar (150px wide) overlaps grid on smaller canvases
- 480px panel height is insufficient for all sections at 16pt+ font

**Fix:**
1. **Increase panel dimensions:** Change `panelW` from 480 to at minimum 560, `panelH` from 480 to 560. Better yet, calculate dynamically based on canvas size.
2. **Reflow layout:**
   - Move item description to a dedicated area below the grid with proper spacing (at least 40px gap)
   - Move quest items below the description
   - Increase equipment sidebar width or move it below the grid for narrow canvases
3. **Add text truncation:** For long item descriptions, truncate with "..." and show full text only in Examine action.
4. **Responsive sizing:** Use `Math.min(canvas.width - 40, 560)` for panel width to handle different screen sizes.

**Files:** `js/inventory.js`

**Verification:**
- Open inventory with 5+ items including equipment and quest items
- Verify no text overlap at any resolution
- Test on iPad Safari (1024x768 logical pixels)

---

### Issue #19: UX glitch — "Press space" prompt does nothing

**Problem:** The player sees a "SPACE" interaction prompt above their character but pressing space does nothing. The player also doesn't understand what the interactable object is or why they should interact with it.

**Root cause:** `game.js:674-678` — `checkNearInteractable()` marks the tile the player is standing on as interactable. This happens with:
- Already-opened doors (player walked through, now standing on open door — interaction returns "door_closed" which re-closes, OR the open door has no useful interaction)
- Already-opened chests (returns "chest_empty" which shows no notification)
- Tiles the player walked over that have no remaining useful interaction

Also, `render.js:1177-1178` always shows the generic "SPACE" label with no context about WHAT to interact with.

**Fix:**
1. **Filter out no-op interactions from standing tile:** In `checkNearInteractable()`, only mark the standing tile as interactable if it has a meaningful interaction:
   - Doors: only if currently closed (opening from standing position shouldn't happen; see #15 fix)
   - Chests: only if not yet opened
   - Altars: always interactable (save checkpoint)
   - Stairs: always interactable
2. **Add contextual labels:** Change the interaction prompt to show what the interaction does:
   - NPC nearby: "SPACE: Talk"
   - Closed door: "SPACE: Open"
   - Chest: "SPACE: Open"
   - Altar: "SPACE: Save"
   - Stairs: "SPACE: Descend"
3. **Pass the label from `checkNearInteractable()`** to the renderer, so the prompt is informative.

**Files:** `js/game.js`, `js/render.js`

**Verification:**
- Walk around Level 1, confirm prompt only appears near interactable objects
- Confirm pressing SPACE always does something when the prompt is visible
- Confirm each prompt shows a contextual label

---

### Issue #14: Black dots move when the player moves

**Problem:** Distracting "black dots" that the player doesn't understand move when the player moves. Based on code analysis, these are most likely one of:
1. **Entity shadows** — Semi-transparent black ellipses drawn below NPCs and enemies (`render.js:857-860`, `999-1002`). When the camera follows the player, all entities shift on screen.
2. **Enemy eyes** — White/red squares on enemy sprites that are conspicuous on the map.
3. **Player face pixels** — Black 4x4 rectangles (`render.js:816-837`) that change position as the player changes direction.

**Investigation needed:** Look at the screenshot from issue #14 to confirm exactly which visual elements are the "black dots." Most likely it's the enemy shadows or the player's face dots.

**Fix (addressing all likely causes):**
1. **If entity shadows:** Make shadows optional or lighter. Change `rgba(0, 0, 0, 0.3)` to `rgba(0, 0, 0, 0.1)` for a subtler effect, or remove shadows entirely since the retro pixel art style doesn't need them.
2. **If player face:** The player's eyes (4x4 black rectangles) change position based on `player.direction`. This is by design but may be confusing. Options:
   - Make the eyes a different color (e.g., white) so they're clearly part of the face
   - Add a slightly different colored body fill so the face is more recognizable
3. **If enemy rendering:** Enemies on the overworld have conspicuous features. Consider adding a subtle name label or indicator to make it clear these are characters, not mysterious dots.
4. **General improvement:** Add brief tutorial text in Level 1: "Watch out for Roman Guards!" with an arrow pointing at the first guard encounter, so players understand what entities are.

**Files:** `js/render.js`, possibly `content/level1_dialogue.js`

**Verification:**
- Play Level 1, confirm no unexplained visual elements
- Ask a child tester if they understand all visual elements on screen

---

### Issue #20: Unreachable scouts in Level 1

**Problem:** Some NPCs ("scouts" = apostles) in Level 1 cannot be reached by the player.

**Root cause analysis:** Based on the current `level1.json` tile layout, all three apostles SHOULD be reachable through the corridor/door system:
- Apostle Peter (3,5): via left corridor through doors (4,16) and (4,7)
- Apostle James (14,2): via center corridor through door (14,8) (reached from big corridor at y=10)
- Apostle John (26,5): via right corridor through door (24,7) and door (19,5)

Note: Previous commits (e11ec81) already fixed some unreachable entities. This issue may be:
1. A remaining path blockage not yet fixed
2. A door that should be unlocked but isn't
3. Player confusion about how to navigate the map (no objectives/compass)

**Fix:**
1. **Audit all paths:** Programmatically verify every NPC position is reachable from `playerStart` using a flood-fill walkability check (consider writing a simple Node.js verification script).
2. **Fix any blocked paths:** If flood-fill reveals unreachable NPCs, add doors or remove walls to create access.
3. **Add objective hints:** After talking to Peter guide, show a HUD objective: "Find the 3 Apostles in the catacombs" with directional hints.
4. **Add minimap or compass:** Consider adding a simple minimap showing unexplored areas, or an objective arrow pointing toward the nearest unvisited apostle.

**Files:** `data/levels/level1.json`, `js/game.js`, `js/hud.js`

**Verification:**
- Run flood-fill verification from playerStart to each NPC
- Playtest Level 1 from start to completion
- Confirm all 3 apostles can be reached and interacted with

---

## P2: Cross-Game UX

### Issue #12: Add a "Back to Home" button to all game pages

**Problem:** When playing on iPad, there's no way to return to the game library page from within a game. Players must manually edit the URL or use browser back, which is difficult for young children.

**Root cause:** None of the 10 game `index.html` files include navigation back to the parent directory.

**Fix:**
1. **Add a floating "Home" button** to every game's `index.html`:
   ```html
   <a href="../" id="home-btn" style="
     position: fixed; top: 12px; left: 12px; z-index: 9999;
     background: rgba(0,0,0,0.6); color: white; text-decoration: none;
     padding: 8px 16px; border-radius: 20px; font-family: 'Comic Sans MS', cursive;
     font-size: 16px; touch-action: manipulation; min-width: 44px; min-height: 44px;
     display: flex; align-items: center; gap: 6px;
   ">&#x1F3E0; Home</a>
   ```
2. **Design considerations:**
   - 44x44px minimum touch target (accessibility requirement)
   - Fixed position so it's always visible
   - Semi-transparent background so it doesn't obscure gameplay
   - High z-index to stay on top of game UI
   - `touch-action: manipulation` to prevent double-tap zoom on iPad
3. **For canvas-based games (catacombs-and-creeds):** The button should be an HTML element overlaying the canvas, NOT drawn on the canvas itself, so it works regardless of game state.
4. **For quiz/story games:** Add the button to the HTML body, visible on all screens.

**Games to update (all 10):**
- ancient-greece-rpg/index.html
- catacombs-and-creeds/index.html
- grammar-quiz/index.html
- keyboard-quest/index.html
- keyboard-quest-2/index.html
- keyboard-quest-3/index.html
- math-coloring/index.html
- math-coloring-2/index.html
- roman-emperors-quiz/index.html
- roman-quiz/index.html

**Verification:**
- Test each game on iPad Safari — confirm button visible and tappable
- Confirm button doesn't overlap critical game UI
- Confirm `../` navigates correctly on GitHub Pages

---

## P3: Content & Polish

### Issue #5: Storyline confusion — Peter guide says to find Peter

**Problem:** Level 1 intro NPC is "Peter" who tells you to "find the three apostles." One of the three apostles to find is "Apostle Peter." This is confusing — why am I looking for Peter when Peter just told me what to do?

**Root cause:** `data/levels/level1.json` has both `peter_guide` (guide NPC at 14,18) and `apostle_peter` (quest NPC at 3,5). `content/level1_dialogue.js` has `peter_intro` dialogue where Peter explains the mission.

**Fix:**
1. **Rename the guide NPC** from "Peter" to a different early church figure. Good options:
   - **"Priscilla"** — Historical early church leader, less commonly known than Peter/James/John, provides female representation
   - **"Luke"** — The physician and author, known as a companion but not one of the 12 apostles
   - **"Barnabas"** — Known as an encourager, fits the guide role thematically
2. **Recommended: "Priscilla"** — Update:
   - `level1.json`: Change `peter_guide` name to "Priscilla", update portrait and color
   - `level1_dialogue.js`: Change `peter_intro` speaker to "Priscilla", update dialogue text
   - `dialogue.js`: Add `priscilla` portrait color (e.g., `'#a06090'` purple/mauve)
3. **Update dialogue text** to reference all three apostles by name: "Find Apostle Peter, Apostle James, and Apostle John. They each carry an Apostle Coin."

**Files:** `data/levels/level1.json`, `content/level1_dialogue.js`, `js/dialogue.js`

**Verification:**
- Start Level 1, confirm guide NPC is Priscilla (not Peter)
- Find Apostle Peter, confirm no naming confusion
- Read all dialogue for consistency

---

### Issue #3: Too few questions — they loop too often

**Problem:** The game has approximately 35 questions total across 5 levels (~7 per level). During combat, questions repeat within a short play session, making the game monotonous and reducing educational value.

**Root cause:** `data/questions.json` has limited questions. `questions.js` tracks `askedThisCombat` which resets per combat, so questions can repeat across combats in the same session.

**Fix:**
1. **Expand question bank to 25+ per level (125+ total):**
   - Level 1 (Early Church/Persecution): Add questions about catacombs, early Christian practices, Roman persecution, apostles
   - Level 2 (Church Fathers): Add questions about Augustine, Jerome, Ambrose, early theology
   - Level 3 (Councils): Add questions about Nicaea, Chalcedon, creeds, doctrinal debates
   - Level 4 (Scripture): Add questions about Bible books, translations, Dead Sea Scrolls
   - Level 5 (Legacy): Add questions about monasticism, missions, church growth
2. **Add session-wide tracking:** Extend `askedThisCombat` to `askedThisSession` that persists across combats (cleared only on new session or level change). This prevents repeats even across multiple fights.
3. **Add difficulty tiers:** Tag questions with difficulty (easy/medium/hard). Start with easy, progress to harder as player advances. This extends replay value.
4. **Save asked-questions state:** Include asked question IDs in the save data so questions don't repeat across play sessions.

**Files:** `data/questions.json`, `js/questions.js`, `js/save.js`

**Verification:**
- Play through Level 1 with 10+ combat encounters, confirm no repeated questions
- Verify questions are age-appropriate (3rd-6th grade, ages 8-12)
- Count total questions per level, confirm 25+

---

### Issue #18: Music needs more variety

**Problem:** The synthesized music loops are too short and become repetitive/distracting quickly. The `audio.js` system generates chiptune tracks programmatically, but the patterns are brief.

**Root cause:** `audio.js` plays synthesized loops at 120 BPM with a limited number of notes/patterns per track. The exploration and combat tracks repeat after a few bars.

**Fix:**
1. **Extend music patterns:** For each track (exploration, combat, title):
   - Increase the number of pattern variations from ~4 bars to 16+ bars
   - Add A/B/C sections that alternate (e.g., verse/chorus/bridge pattern)
   - Vary instrumentation between sections (add/remove oscillators)
2. **Add procedural variation:**
   - Slight random variations in note timing (humanization)
   - Randomly select from multiple melodic phrases for each section
   - Change key/octave every 4-8 bars
3. **Add ambient exploration track:** A quieter, atmospheric track for exploration that relies more on sustained pads/drones and less on melodic repetition. This is less tiring for extended play.
4. **Add volume fade during dialogue:** Reduce music volume during dialogue/quiz sequences for better focus.
5. **Add per-level themes:** Each level could have a subtly different exploration track (different key, tempo, or instrument emphasis) for variety across the game.

**Files:** `js/audio.js`

**Verification:**
- Play for 5+ minutes continuous, confirm music doesn't feel repetitive
- Verify no audio glitches on iPad Safari
- Confirm music volume doesn't compete with UI sounds

---

### Issue #4: Add character portraits to dialogue and battle

**Problem:** Characters in dialogue have only colored circles with their initial letter as "portraits." This is visually bland and makes it hard for young players to connect with characters.

**Root cause:** `dialogue.js:512-541` — `_drawPortrait()` draws a colored circle with the first letter of the speaker's name. No actual character art exists.

**Fix:**
1. **Create canvas-drawn pixel art portraits** (no external image files needed):
   - Draw 64x64 pixel art portraits procedurally on the canvas
   - Each character gets a distinct face: hair style/color, skin tone, clothing color, facial features
   - Portraits are drawn using `ctx.fillRect()` calls composing simple pixel art
2. **Portrait designs:**
   - **Priscilla (guide):** Purple robe, brown hair, warm smile
   - **Apostle Peter:** Beard, brown robe, rough appearance
   - **Apostle James:** Blue robe, younger face
   - **Apostle John:** Green robe, youthful, scroll in hand
   - **Roman Guard:** Red/brown helmet, stern face
   - **Centurion:** Gold-accented helmet, authoritative
3. **Implementation:** Create a `portraits.js` file with a `drawPortrait(ctx, portraitId, x, y, size)` function that uses canvas drawing commands to render each character.
4. **Also show portraits in combat:** During the question/answer phase, show the enemy portrait in the battle UI for visual context.

**Files:** New `js/portraits.js`, `js/dialogue.js`, `js/combat.js`, `index.html` (add script tag)

**Verification:**
- Each NPC/enemy displays a unique recognizable portrait
- Portraits render clearly at 64x64 and scale well
- No performance impact (portraits should be simple enough for 60fps)

---

## Implementation Order

The recommended implementation sequence, accounting for dependencies:

| Phase | Issues | Est. Complexity | Dependencies |
|-------|--------|----------------|--------------|
| 1 | #22 (auto-save), #15 (stuck in doors), #17 (answer shuffle) | Low | None — critical fixes first |
| 2 | #19 (interaction prompt), #16 (inventory layout) | Medium | Builds on #15 door fix |
| 3 | #14 (black dots), #12 (home button) | Low-Medium | Independent |
| 4 | #5 (storyline), #20 (unreachable scouts) | Medium | Map and dialogue changes |
| 5 | #3 (more questions) | High (content creation) | Question shuffle from #17 |
| 6 | #18 (music variety) | High | Independent |
| 7 | #4 (portraits) | High | Storyline changes from #5 |

---

## Cross-Cutting Concerns

### Related Issues to Check During Implementation

1. **Save compatibility:** Changes to save data structure (#22, #3) must handle loading old saves gracefully. Add a save version number and migration logic.
2. **Level data changes (#20, #5):** Any changes to `level1.json` NPC positions or IDs must be tested against existing save data to prevent "NPC not found" errors on load.
3. **Touch targets (#12, #16):** All new UI elements must meet 44x44px minimum touch target (accessibility requirement from CLAUDE.md).
4. **Font consistency:** All new text must use `CONFIG.ACCESSIBILITY.fontFamily` (OpenDyslexic with Comic Sans fallback).
5. **Performance:** All rendering changes must maintain 60fps on iPad Safari. Profile after each phase.
6. **ADHD accommodations:** New music patterns (#18) should be calming, not overstimulating. Question UI (#17) should have clear visual feedback. Dialogue changes (#5) should keep under 15 words per box.

### Testing Checklist (Per Phase)

- [ ] Play Level 1 start-to-finish on iPad Safari
- [ ] Verify 60fps maintained during gameplay
- [ ] Test save/load cycle (save, close browser, reload, load save)
- [ ] Test all 3 save slots independently
- [ ] Verify auto-save fires at 2-minute intervals to correct slot
- [ ] Check all text readability (font size, contrast, no overlap)
- [ ] Test keyboard AND touch controls
- [ ] Verify no JavaScript errors in Safari console
