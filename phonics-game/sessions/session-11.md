# Session 11 — Narrative Frame + Celebrations

**Model:** claude-sonnet-4-6
**Estimated time:** 2–3 hours
**Deliverable:** Lena the Word Explorer character, celebration animations, story progression.

---

## Goal

Give the game a lightweight narrative frame so children have a reason to return:
- "Lena the Word Explorer" is exploring a magical library
- Each completed lesson unlocks a new "room" in the library
- Celebration screen after each lesson (animated, non-flashing)
- Lena appears on lesson select, celebrates after each lesson

---

## Files to Create/Modify

- `phonics-game/js/narrative.js` — Lena character, room unlock logic
- `phonics-game/assets/lena.svg` — Lena character SVG
- `phonics-game/index.html` — narrative elements
- `phonics-game/css/style.css` — celebration, narrative styles
- `phonics-game/js/game.js` — update `onLessonComplete()` sequence

---

## `assets/lena.svg` — Lena Character

Create a simple cartoon SVG character (80×80px viewBox). Minimal, friendly:
- Circular head (peach)
- Two dot eyes, curved smile
- Magnifying glass (simple lines)
- Ponytail
- No complex gradients needed

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <!-- Body / torso -->
  <ellipse cx="40" cy="65" rx="20" ry="14" fill="#4a90d9"/>
  <!-- Head -->
  <circle cx="40" cy="38" r="18" fill="#f4a261"/>
  <!-- Eyes -->
  <circle cx="34" cy="36" r="2.5" fill="#2C2416"/>
  <circle cx="46" cy="36" r="2.5" fill="#2C2416"/>
  <!-- Smile -->
  <path d="M 33 43 Q 40 49 47 43" stroke="#2C2416" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Ponytail -->
  <ellipse cx="56" cy="32" rx="5" ry="10" fill="#e76f51" transform="rotate(-20 56 32)"/>
  <!-- Magnifying glass handle -->
  <line x1="54" y1="54" x2="64" y2="66" stroke="#2C2416" stroke-width="3" stroke-linecap="round"/>
  <!-- Magnifying glass circle -->
  <circle cx="49" cy="50" r="9" fill="none" stroke="#2C2416" stroke-width="3"/>
  <circle cx="49" cy="50" r="7" fill="rgba(200,230,255,0.5)"/>
</svg>
```

---

## `js/narrative.js`

```js
class NarrativeManager {
    constructor() {
        this.totalRooms = 30;
    }

    getRoomsUnlocked(progress) {
        if (!progress || !progress.lessons) return 0;
        // Count completed lessons
        return Object.values(progress.lessons).filter(l => l.completed).length;
    }

    getRoomDescription(lessonId) {
        // Short, thematic descriptions per grade block
        if (lessonId <= 6)  return "the Alphabet Atrium";
        if (lessonId <= 14) return "the Vowel Vault";
        if (lessonId <= 20) return "the Spelling Sanctum";
        if (lessonId <= 25) return "the Morpheme Museum";
        return "the Academic Archives";
    }

    showRoomUnlock(lessonId) {
        const room = this.getRoomDescription(lessonId);
        const overlay = document.getElementById('narrative-overlay');
        document.getElementById('narrative-msg').textContent =
            `Lena unlocked a new room: ${room}!`;
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
            }, 600);
        }, 2500);
    }

    updateLenaOnSelect(progress) {
        const rooms = this.getRoomsUnlocked(progress);
        const total = this.totalRooms;
        const pct = Math.round((rooms / total) * 100);
        document.getElementById('lena-progress-text').textContent =
            `${rooms}/${total} rooms explored`;
        document.getElementById('lena-progress-bar-fill').style.width = `${pct}%`;
    }
}
```

---

## Narrative Overlay HTML (add to `index.html`)

```html
<!-- Room unlock overlay (brief, auto-dismissing) -->
<div id="narrative-overlay" class="narrative-overlay" style="display:none;">
    <img src="assets/lena.svg" alt="Lena" class="narrative-lena">
    <p id="narrative-msg" class="narrative-msg"></p>
</div>

<!-- Celebration overlay (after lesson complete) -->
<div id="celebration-overlay" class="celebration-overlay" style="display:none;">
    <div class="celebration-card">
        <img src="assets/lena.svg" alt="Lena celebrating" class="celebration-lena">
        <h2 id="celebration-title">Amazing Work!</h2>
        <p id="celebration-subtitle"></p>
        <div id="celebration-confetti" class="confetti-container"></div>
    </div>
</div>
```

Lena on lesson select (add to `#screen-select` header area):
```html
<div id="lena-corner" class="lena-corner">
    <img src="assets/lena.svg" alt="Lena the Word Explorer" class="lena-img">
    <div class="lena-info">
        <div class="lena-name">Lena's Library</div>
        <div id="lena-progress-text">0/30 rooms explored</div>
        <div class="lena-progress-bar">
            <div id="lena-progress-bar-fill" class="lena-progress-bar-fill" style="width:0%"></div>
        </div>
    </div>
</div>
```

---

## Celebration CSS (confetti — CSS-only, no flashing)

```css
.celebration-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 900;
}

.celebration-card {
    background: white;
    border-radius: 24px;
    padding: 32px;
    text-align: center;
    max-width: 400px;
    width: 90%;
    position: relative;
    overflow: hidden;
}

.celebration-lena {
    width: 100px;
    height: 100px;
    animation: celebrationBounce 0.6s ease infinite alternate;
}

@keyframes celebrationBounce {
    from { transform: translateY(0); }
    to   { transform: translateY(-12px); }
}

.confetti-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}

/* 12 confetti pieces — CSS animations, no JavaScript, no flashing */
.confetti-piece {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    animation: confettiFall 2s ease-in infinite;
}

@keyframes confettiFall {
    0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
}

/* Vary position, color, delay for 12 pieces */
.confetti-piece:nth-child(1)  { left: 10%; background: #e74c3c; animation-delay: 0s; }
.confetti-piece:nth-child(2)  { left: 20%; background: #3498db; animation-delay: 0.15s; }
.confetti-piece:nth-child(3)  { left: 30%; background: #f1c40f; animation-delay: 0.3s; }
.confetti-piece:nth-child(4)  { left: 40%; background: #27ae60; animation-delay: 0.05s; }
.confetti-piece:nth-child(5)  { left: 50%; background: #9b59b6; animation-delay: 0.2s; }
.confetti-piece:nth-child(6)  { left: 60%; background: #e67e22; animation-delay: 0.1s; }
.confetti-piece:nth-child(7)  { left: 70%; background: #e74c3c; animation-delay: 0.35s; }
.confetti-piece:nth-child(8)  { left: 80%; background: #3498db; animation-delay: 0.25s; }
.confetti-piece:nth-child(9)  { left: 15%; background: #f1c40f; animation-delay: 0.4s; }
.confetti-piece:nth-child(10) { left: 45%; background: #27ae60; animation-delay: 0.08s; }
.confetti-piece:nth-child(11) { left: 65%; background: #9b59b6; animation-delay: 0.18s; }
.confetti-piece:nth-child(12) { left: 85%; background: #e67e22; animation-delay: 0.28s; }

.narrative-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 800;
    transition: opacity 0.6s;
}

.narrative-lena { width: 80px; height: 80px; }
.narrative-msg {
    color: white;
    font-family: var(--font-ui);
    font-size: 22px;
    text-align: center;
    margin-top: 16px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.lena-corner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border-radius: 12px;
    border: 2px solid #dfe6e9;
    margin: 12px;
}

.lena-img { width: 56px; height: 56px; }

.lena-progress-bar {
    width: 120px;
    height: 8px;
    background: #dfe6e9;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 6px;
}

.lena-progress-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.5s ease;
}
```

---

## `js/game.js` — Updated `onLessonComplete()` sequence

```js
onLessonComplete() {
    window.audioManager.playLessonComplete();

    const summary = window.scoreManager.getSummary();
    const savedData = SaveManager.saveLessonResult(this.currentLessonId, summary);

    // Brief celebration overlay (1.5s) → then narrative room unlock (if new) → then summary
    this.showCelebration(summary.stars, () => {
        const isNewCompletion = summary.stars > 0;
        if (isNewCompletion) {
            window.narrativeManager.showRoomUnlock(this.currentLessonId);
        }
        setTimeout(() => {
            this.showSummary(summary);
        }, isNewCompletion ? 3000 : 100);
    });
}

showCelebration(stars, onDone) {
    const overlay = document.getElementById('celebration-overlay');
    document.getElementById('celebration-title').textContent =
        stars === 3 ? '🌟 Perfect!' : stars === 2 ? '🎉 Great Job!' : '✨ You Did It!';
    document.getElementById('celebration-subtitle').textContent =
        `You earned ${stars} star${stars !== 1 ? 's' : ''}!`;

    // Inject confetti pieces
    const confetti = document.getElementById('celebration-confetti');
    confetti.innerHTML = Array.from({length: 12}, (_, i) =>
        `<div class="confetti-piece"></div>`
    ).join('');

    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.display = 'none';
        confetti.innerHTML = '';
        if (onDone) onDone();
    }, 1800);
}
```

---

## Definition of Done

- [ ] Lena SVG renders correctly in all browsers
- [ ] Lena appears on lesson select with progress bar
- [ ] Progress bar advances when lessons are completed
- [ ] Celebration overlay appears after lesson complete (1.8s, then disappears)
- [ ] Confetti animates with CSS only (no JS animation loop, no flashing)
- [ ] Room unlock message appears after celebration, auto-dismisses after 2.5s
- [ ] Summary screen appears after all narrative sequences
- [ ] No animation uses rapid color flashing (ADHD/photosensitivity safety)
- [ ] Celebration is fully skippable (tap anywhere to dismiss early)
