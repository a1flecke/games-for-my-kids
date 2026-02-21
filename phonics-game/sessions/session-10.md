# Session 10 — Sound Effects + Progress Tracking

**Model:** claude-sonnet-4-6
**Estimated time:** 2–3 hours
**Deliverable:** Web Audio synthesized SFX, mute controls, and complete progress persistence.

---

## Goal

1. Add synthesized sound effects (match success, wrong tap, lesson complete, tile select)
2. Complete mute/unmute controls (speech + SFX independently)
3. Finalize LocalStorage progress: lesson unlock chain, total words matched, sort badges
4. Show correct progress state (stars, lock icons, sort badges) on lesson select screen

---

## Files to Create/Modify

- `phonics-game/js/audio.js` — synthesized Web Audio SFX
- `phonics-game/js/save.js` — finalize progress schema
- `phonics-game/js/game.js` — wire up SFX calls + progress display
- `phonics-game/css/style.css` — settings panel styles

---

## `js/audio.js`

```js
class AudioManager {
    constructor() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            this.ctx = null;
        }
    }

    isMuted() {
        return localStorage.getItem('phonics-mute-sfx') === 'true';
    }

    _playTone(freq, duration, type = 'sine', gain = 0.3) {
        if (!this.ctx || this.isMuted()) return;
        // iOS Safari requires resuming context on user gesture
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playSelect() {
        // Soft boing: 440Hz sine, 80ms
        this._playTone(440, 0.08, 'sine', 0.2);
    }

    playGlow() {
        // Shimmer: rising arpeggio C-E-G over 60ms
        [261, 329, 392].forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.06, 'sine', 0.15), i * 20);
        });
    }

    playMatch() {
        // Success chord: C major, 300ms
        [523, 659, 784].forEach(freq => this._playTone(freq, 0.3, 'sine', 0.25));
    }

    playWrong() {
        // Low thud: 100Hz, 100ms
        this._playTone(100, 0.1, 'sine', 0.3);
    }

    playLessonComplete() {
        // Ascending fanfare: C-E-G-C over 500ms
        const notes = [523, 659, 784, 1046];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.3), i * 120);
        });
    }

    playNextWord() {
        // Gentle "pop": 600Hz, 50ms
        this._playTone(600, 0.05, 'sine', 0.15);
    }
}
```

---

## Wire SFX into Existing Code

In `js/match.js`, add audio calls:
```js
// In selectFirst():
window.audioManager.playSelect();

// In the glow loop:
window.audioManager.playGlow();  // (call once, not per tile)

// In triggerMatch():
window.audioManager.playMatch();

// In wrongTap():
window.audioManager.playWrong();
```

In `js/game.js`:
```js
onLessonComplete() {
    window.audioManager.playLessonComplete();
    // ... rest of existing code
}
```

In `js/sort.js`:
```js
// After correct sort:
window.audioManager.playMatch();
// New word:
window.audioManager.playNextWord();
```

---

## Settings Panel HTML (add to `index.html`, inside `#screen-select`)

```html
<div id="settings-panel" class="settings-panel" style="display:none;">
    <div class="settings-panel-inner">
        <h3>Settings</h3>
        <label class="settings-row">
            <span>Word Speech</span>
            <input type="checkbox" id="toggle-speech" checked
                onchange="localStorage.setItem('phonics-mute-speech', !this.checked)">
        </label>
        <label class="settings-row">
            <span>Sound Effects</span>
            <input type="checkbox" id="toggle-sfx" checked
                onchange="localStorage.setItem('phonics-mute-sfx', !this.checked)">
        </label>
        <div class="settings-row">
            <span>Text Size</span>
            <select onchange="document.documentElement.style.setProperty('--tile-font-scale', this.value)">
                <option value="1">Normal</option>
                <option value="1.2">Large</option>
                <option value="1.4">Extra Large</option>
            </select>
        </div>
        <div class="settings-row">
            <button onclick="game.unlockAllLessons()">🔓 Unlock All (teacher)</button>
        </div>
        <button class="settings-close-btn" onclick="document.getElementById('settings-panel').style.display='none'">
            ✕ Close
        </button>
    </div>
</div>
```

Settings gear button (top-right of lesson select header):
```html
<button id="settings-btn" onclick="document.getElementById('settings-panel').style.display='flex'"
    aria-label="Settings">⚙️</button>
```

---

## `js/save.js` — Complete Unlock Logic

```js
static isLessonUnlocked(lessonId, data) {
    if (lessonId === 1) return true;  // Always unlocked
    if (!data || !data.lessons) return false;
    // Unlocked if previous lesson completed OR teacher override
    return data.unlockAll === true ||
        (data.lessons[lessonId - 1] && data.lessons[lessonId - 1].completed === true);
}

static markPreviewed(lessonId) {
    const data = this.load();
    data.lessons[lessonId] = data.lessons[lessonId] || {};
    data.lessons[lessonId].previewed = true;
    this.save(data);
}
```

---

## Progress Display on Lesson Select

In `js/game.js` `renderLessonSelect()`, use save data to show:
- Stars: ★★★ / ★★☆ / ★☆☆ / ☆☆☆
- Lock icon: if `!SaveManager.isLessonUnlocked(id, progress)` and not in preview mode
- Sort badge: if `progress.sortPracticed && progress.sortPracticed[id]` → show "🗂" badge
- Preview mode: locked lessons still show "Preview" button (no star awarded)

```js
renderLessonSelect() {
    const progress = SaveManager.load();
    const meta = DataManager.getLessonMeta();
    const grid = document.getElementById('lesson-grid');
    grid.innerHTML = '';

    for (const lesson of meta) {
        const lessonData = progress.lessons[lesson.id] || {};
        const unlocked = SaveManager.isLessonUnlocked(lesson.id, progress);
        const stars = lessonData.stars || 0;
        const sortDone = progress.sortPracticed && progress.sortPracticed[lesson.id];

        const card = document.createElement('div');
        card.className = `lesson-card grade-${lesson.gradeLevel} ${unlocked ? '' : 'locked'}`;
        // ... render card with appropriate state
        grid.appendChild(card);
    }
}
```

---

## `js/game.js` — `unlockAllLessons()`

```js
unlockAllLessons() {
    const pin = prompt('Enter teacher PIN:');
    if (pin === '1234') {
        const data = SaveManager.load();
        data.unlockAll = true;
        SaveManager.save(data);
        this.renderLessonSelect();
        alert('All lessons unlocked!');
    } else {
        alert('Incorrect PIN.');
    }
}
```

---

## CSS: Settings Panel

```css
.settings-panel {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
}

.settings-panel-inner {
    background: var(--bg);
    border-radius: 16px;
    padding: 24px;
    max-width: 360px;
    width: 90%;
}

.settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #dfe6e9;
    font-size: 18px;
    font-family: var(--font-ui);
    cursor: pointer;
    gap: 12px;
}

.settings-close-btn {
    margin-top: 16px;
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #dfe6e9;
    font-size: 16px;
    cursor: pointer;
    min-height: 44px;
}

/* Lesson card locked state */
.lesson-card.locked {
    opacity: 0.6;
    position: relative;
}
.lesson-card.locked::after {
    content: '🔒';
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 18px;
}
```

---

## Definition of Done

- [ ] Match, wrong, select, glow, lesson-complete sounds play correctly
- [ ] SFX mute toggle works independently of speech mute
- [ ] Settings panel opens/closes correctly
- [ ] Lesson 1 always unlocked; lessons 2+ unlock after completing previous lesson
- [ ] Stars display correctly on lesson select after completing lessons
- [ ] Sort badge shows on lessons where Sort Mode was practiced
- [ ] Teacher unlock (PIN 1234) unlocks all lessons persistently
- [ ] Mute settings persist across page reloads (LocalStorage)
- [ ] No audio errors on iOS Safari (context resumption handled)
- [ ] "Show hint tile" toggle shows/hides one hint tile correctly
- [ ] Hint setting persists across page reloads

---

## ⚠️ Watch Out — Known Spec Issues

1. **Settings panel already exists** — `#settings-panel` with full `_bindSettingsPanel()` was built in Session 01. Do NOT add the new settings HTML from this spec. Only ADD the missing "Sound Effects" toggle row and hook up AudioManager's mute state in `_bindSettingsPanel()`.

2. **PIN dialog already exists** — `#pin-dialog` with `_openPinDialog()` was built in Session 01. Do NOT implement `prompt()`/`alert()` unlock flow. Reuse the existing dialog.

3. **AudioManager mute key**: `isMuted()` must read `SaveManager.load().muteSfx` (NOT `localStorage.getItem('phonics-mute-sfx')`). All settings live under `'phonics-progress'`.

4. **AudioContext iOS**: do not create `AudioContext` in the constructor — iOS Safari requires it to be created (or resumed) inside a user-gesture event handler. Create it lazily on first sound play: `this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)()`.

5. **Settings toggles**: use `addEventListener` in `_bindSettingsPanel()` — not `onchange=` HTML attributes.

6. **Hint tile toggle already implemented** — `#hint-toggle` with `game.hintMode` ('one'|'none') was built in session 06b. The hint toggle, `_syncSettings()`, and `selectFirst()` in match.js are already wired up. Do NOT re-implement. Only verify the "Show hint tile" row is present in the settings panel HTML.
