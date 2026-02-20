# Session 01 — Project Shell + Lesson Selection UI

**Model:** claude-sonnet-4-6
**Estimated time:** 2–3 hours
**Deliverable:** Fully styled `index.html` and `css/style.css` with working lesson selection screen.

---

## Goal

Build the entire game shell and lesson-select screen. By the end of this session, a child can:
- Open `phonics-game/index.html` in a browser
- See a lesson grid with 30 lessons (placeholder data)
- Tap a lesson to see it highlighted
- See the Lena character in the corner

This session establishes the CSS design system and HTML structure that all future sessions build on.

---

## Files to Create

- `phonics-game/index.html` — complete game shell
- `phonics-game/css/style.css` — complete CSS design system

---

## Detailed Requirements

### HTML Structure (`index.html`)

Script loading order (all `defer`):
```html
<script src="js/save.js" defer></script>
<script src="js/data.js" defer></script>
<script src="js/speech.js" defer></script>
<script src="js/audio.js" defer></script>
<script src="js/board.js" defer></script>
<script src="js/match.js" defer></script>
<script src="js/score.js" defer></script>
<script src="js/tutorial.js" defer></script>
<script src="js/feedback.js" defer></script>
<script src="js/sort.js" defer></script>
<script src="js/narrative.js" defer></script>
<script src="js/game.js" defer></script>
```

Screens (use `display:none` / `display:block` to show/hide):
1. `#screen-select` — lesson selection
2. `#screen-board` — main game board (placeholder only this session)
3. `#screen-sort` — Sort Mode (placeholder)
4. `#screen-summary` — post-lesson summary (placeholder)

Home button: `<a href="../" id="home-btn">🏠 Home</a>` — same style as other games (fixed top-left).

### Lesson Select Screen (`#screen-select`)

- Title: "Word Explorer" with Lena character SVG next to it
- Subtitle: "Tap a lesson to begin!"
- Grade filter tabs: ALL | Grade 1 | Grade 2 | Grade 3 | Grade 4 | Grade 5
- Lesson grid: CSS Grid, 3 columns on mobile, 5 columns on desktop
- Each lesson card:
  - Lesson number (large, bold)
  - Lesson title (smaller)
  - Grade badge (colored by grade: 1=green, 2=blue, 3=purple, 4=orange, 5=red)
  - Star display (☆☆☆ initially, fills based on LocalStorage progress)
  - Lock icon overlay if locked AND no preview allowed (see plan § 3.7)
  - Click/tap → calls `game.startLesson(id)` (stub for now)
  - "Sort Mode" badge if Sort Mode has been attempted for this lesson

- Settings gear icon (top right) → settings panel with:
  - Mute toggle (speech / SFX separately)
  - Challenge Mode toggle (show/hide ambient timer)
  - Unlock all lessons (PIN-gated: "1234")
  - Font size adjustment (small/medium/large)

### CSS Design System

Variables:
```css
:root {
    --bg: #F5F0E8;
    --text: #2C2416;
    --accent: #E8A020;       /* gold — correct / selected */
    --correct: #27ae60;      /* green — matched */
    --wrong: #e74c3c;        /* red — wrong tap */
    --glow: #3498db;         /* blue — pattern glow */
    --grade-1: #27ae60;
    --grade-2: #2980b9;
    --grade-3: #8e44ad;
    --grade-4: #e67e22;
    --grade-5: #c0392b;
    --font-tile: 'OpenDyslexic', 'Comic Sans MS', cursive;
    --font-ui: 'OpenDyslexic', 'Comic Sans MS', cursive;
}
```

OpenDyslexic CDN (same as catacombs-and-creeds):
```html
<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/opendyslexic" crossorigin="anonymous">
```

Lesson card:
- Min 100×120px
- 44px minimum touch target (cards are larger than this)
- Border-radius: 12px
- Box-shadow, hover/active scale transform
- Stars use Unicode ★ / ☆

Grade filter tabs:
- Full-width row of pills
- Active tab uses grade color
- Scroll horizontally on very small screens

### Placeholder JS (`js/game.js`)

Create a minimal stub:
```js
class Game {
    constructor() {
        this.progress = null;
    }
    init() {
        this.progress = SaveManager.load();
        this.renderLessonSelect();
    }
    renderLessonSelect() {
        // Render 30 lesson cards using placeholder lesson metadata
        // (lesson title + grade from hardcoded array — real data loaded in Session 2)
    }
    startLesson(id) {
        console.log('Starting lesson', id); // stub
    }
}
window.addEventListener('load', () => { window.game = new Game(); game.init(); });
```

### Lena Character SVG

Create a simple SVG in `assets/lena.svg`:
- Cartoon girl with a magnifying glass, 80×80px viewBox
- Simple shapes only (circles, paths) — no complex illustrations
- Used on the lesson select screen header

### Placeholder `js/save.js`

```js
class SaveManager {
    static load() {
        try {
            return JSON.parse(localStorage.getItem('phonics-progress')) || { lessons: {}, tutorialSeen: {} };
        } catch (e) { return { lessons: {}, tutorialSeen: {} }; }
    }
    static save(data) {
        try { localStorage.setItem('phonics-progress', JSON.stringify(data)); } catch (e) {}
    }
}
```

---

## Definition of Done

- [ ] `index.html` opens without JS errors in Chrome and Safari
- [ ] Lesson grid shows 30 cards (placeholder titles OK)
- [ ] Grade filter tabs show/hide correct lessons
- [ ] Stars display correctly from LocalStorage (empty = ☆☆☆)
- [ ] Home button links to `../`
- [ ] OpenDyslexic font loads
- [ ] Responsive: 3-col on 375px width, 5-col on 1024px width
- [ ] No visible countdown timers anywhere
