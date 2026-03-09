# Lizzie's Petstore — Bug Fix Plan

**Source:** Kid playtesting on iPad Safari
**Date:** 2026-03-09

---

## Bug 1: Crown doesn't render well

**Severity:** Low (visual polish)
**File:** `js/accessories.js` — `_drawCrown()` (lines 187-209)

**Root cause:** The crown draws a thin zigzag profile in a 60x60 box with no solid base band. Only 2 of 5 peaks have gems. The shape reads as a raw polygon rather than a recognizable crown.

**Fix:**
- Add a filled rectangular base band across the bottom (~y=38 to y=48) so the crown has visual weight
- Add a gem to the center peak (x=30, y=14) — 3 gems total
- Widen the crown slightly (less steep angles between points) for better readability at small sizes
- Add a subtle inner highlight line along the base for a metallic feel

**Audit:** Review all 42 accessories for similar thin-rendering issues at creature scale. Particularly check: tiara, party-hat, top-hat, beanie (head accessories most visible).

---

## Bug 2: Display doesn't fit iPad Safari — kid has to zoom out

**Severity:** High (blocks basic usability)
**File:** `css/style.css` — body height (line 47), desktop media queries (lines 1369-1403)

**Root cause:** `height: 100vh` on `body`. On iPad Safari, `100vh` includes the area behind the URL/toolbar chrome, pushing bottom content (care action buttons, tab bars, nav buttons) below the visible fold.

**Fix:**
- Replace `height: 100vh` with `height: 100dvh` (dynamic viewport height, iOS 16.4+)
- Add graceful fallback: `height: 100vh; height: 100dvh;`
- Apply same fix to the desktop `body::before` and any other `100vh` references
- Verify care actions bar, creator tab bar, and park canvas are fully visible without scrolling

**Audit:** Search entire CSS for `100vh` — fix all instances. Check `min-height` and `max-height` references too.

---

## Bug 3: No obvious way to leave the park

**Severity:** Medium (navigation confusion)
**File:** `index.html` (lines 282-293), `css/style.css` (park styles)

**Root cause:** The park exit is a transparent 44x44px emoji button (🏠) in the top-left corner. On a busy park scene with colorful creatures and grass background, a 7-year-old can easily miss it.

**Fix:**
- Give `btn-park-home` a solid background (cream/white pill with border), not transparent
- Add text label: "Home" or "Back" next to the 🏠 icon
- Increase button size and use `btn-secondary` or `btn-nav` styling instead of `btn-icon-only`
- On first park visit, show a brief hint toast: "Tap Home to go back"

**Audit:** Review all back/exit buttons across screens for consistent discoverability:
- Creator: has back button in top bar — check visibility
- Wardrobe: has back button — check visibility
- Room edit: has done button — check visibility
- Gallery: has home button — check visibility

---

## Bug 4: Music and sound effects don't play

**Severity:** High (core feature broken)
**Files:** `js/audio.js`, `js/game.js`, `js/save.js`

**Root causes (multiple):**

1. **Music off by default:** `musicEnabled: false` in `SaveManager._defaults()`. Intentional for ADHD anxiety, but no onboarding tells the kid sounds exist or how to enable them.

2. **iPad silent switch:** The hardware silent switch mutes Web Audio output. No detection or user guidance.

3. **AudioContext not pre-warmed:** Since music is disabled by default, `startMusic()` bails early (line 169) without calling `_resume()`. The AudioContext isn't created until a later `playSound()` call, which may not be in a clean user-gesture context on iOS Safari.

4. **No audio feedback indicator:** No visual cue that sounds exist, are playing, or are muted.

**Fix:**
- **Pre-warm AudioContext** on the very first user tap (title screen "New Pet" or "Continue" button) by calling `audioManager._resume()` regardless of music setting. This ensures the context is created and resumed in a user-gesture handler.
- **Add a sound toggle** directly on the care screen top bar (speaker icon). Don't bury it only in settings.
- **First-play sound prompt:** After the birth animation of the very first creature, show a brief overlay: "Want sounds? 🔊" with Yes/No. Tapping Yes enables SFX + music and creates the AudioContext in a direct user gesture. This is both the onboarding *and* the iOS unlock.
- **Silent switch hint:** If `audioContext.state === 'running'` but the user taps the sound toggle and still hears nothing, show a toast: "No sound? Check your iPad's silent switch!"
- **Default SFX on:** Consider changing default to `muted: false` (already the case) and adding the first-play prompt only for music enable.

**Audit:** Trace every `playSound()` and `playVoice()` call path to verify it originates from a user gesture (pointer/click handler). Check `startAmbient()` — park ambient sounds start on state entry, not direct user gesture.

---

## Bug 5: Kid gets bored — needs tasks/activities for engagement

**Severity:** High (retention)
**Files:** New: `js/tasks.js`, `data/tasks.json`. Modified: `js/game.js`, `js/save.js`, `index.html`, `css/style.css`

**Root cause:** The game has creation, care, park, and dress-up, but no structured goal system. The ~7 milestones in `unlocks.json` are passive — the kid doesn't see them as goals. There's no daily variety, no visible objectives, no "what should I do next?" guidance.

**Fix — Add a "Daily Tasks" system:**

### Data: `data/tasks.json`
Pool of ~20 task templates:
```json
[
  { "id": "feed", "text": "Feed {name}", "icon": "🍎", "action": "feed" },
  { "id": "bathe", "text": "Give {name} a bath", "icon": "🛁", "action": "bathe" },
  { "id": "park", "text": "Visit the park", "icon": "🌳", "action": "park_visit" },
  { "id": "accessory", "text": "Try a new look", "icon": "👑", "action": "wardrobe" },
  { "id": "photo", "text": "Take a photo", "icon": "📷", "action": "photo" },
  { "id": "friend", "text": "Make a park friend", "icon": "💕", "action": "park_greet" },
  { "id": "play", "text": "Play catch", "icon": "⚾", "action": "play" },
  { "id": "room", "text": "Decorate the room", "icon": "🎨", "action": "room_edit" },
  { "id": "pet", "text": "Pet {name}", "icon": "💜", "action": "pet" },
  { "id": "sleep", "text": "Tuck {name} in", "icon": "😴", "action": "sleep" },
  { "id": "card", "text": "Make a creature card", "icon": "🃏", "action": "card" },
  { "id": "create", "text": "Create a new friend", "icon": "✨", "action": "create" }
]
```

### Logic: `js/tasks.js` — TaskManager
- On app load: check `save.dailyTasks.date` vs today
- If new day (or first launch): pick 3 random tasks from pool, seeded by date for consistency
- Track completion: when the matching action fires, mark task complete
- Reward: completing all 3 daily tasks awards a "star" for that day (tracked in save data)
- Stars accumulate and unlock bonus cosmetics (star badge accessory at 5 stars, rainbow theme at 10, etc.)

### UI: Task board
- Add a clipboard/checklist button (📋) to the care screen nav bar
- Tapping opens a small overlay showing 3 tasks with checkboxes
- Completed tasks show a checkmark with sparkle animation
- "All done!" celebration when 3/3 complete (confetti + jingle)
- Badge on the clipboard icon showing incomplete count (e.g., red dot with "2")

### Save data addition
```js
// In SaveManager._defaults():
dailyTasks: {
  date: null,        // 'YYYY-MM-DD' string
  taskIds: [],       // 3 selected task IDs
  completed: [],     // completed task IDs
  totalStars: 0      // lifetime stars earned
}
```

### Integration points
- `care.js _completeActivity()` → check if matching task, mark complete
- `game.js setState('PARK')` → check park_visit task
- `game.js _openWardrobe()` → check wardrobe task
- `game.js _openPhotoMode()` → check photo task
- `park.js` NPC greet → check park_greet task
- `game.js setState('ROOM_EDIT')` → check room_edit task
- `game.js setState('CREATOR')` → check create task
- `game.js _takeCardPhoto()` → check card task

### Additional engagement
- **Milestone progress display:** On the task board overlay, show next upcoming milestone with progress bar ("3/5 care actions until Master Chef!")
- **"What should I do?" button:** On care screen, a "?" button that suggests an activity based on lowest need or next incomplete task
- **Creature reactions:** When a task is completed, the creature does a happy bounce animation

---

## Implementation Order

| Step | Bug | Effort | Rationale |
|------|-----|--------|-----------|
| 1 | **#2 iPad viewport** | ~15 min | Unblocks basic usability; CSS-only change |
| 2 | **#4 Audio** | ~45 min | Core feature; requires AudioContext pre-warm + onboarding UI |
| 3 | **#3 Park exit** | ~20 min | Quick UI fix; navigation confusion |
| 4 | **#1 Crown rendering** | ~20 min | Visual polish + accessory audit |
| 5 | **#5 Daily tasks** | ~2-3 hrs | New system: data, manager, UI, save integration |
