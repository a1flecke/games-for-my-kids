# Session 13 — Challenge Mode (Ambient Timer)

**Model:** claude-sonnet-4-6
**Estimated time:** 2–3 hours
**Deliverable:** Optional Challenge Mode with ambient (non-countdown) timer.

---

## Goal

Add an opt-in Challenge Mode with an ambient progress indicator (NOT a visible countdown number).
Challenge Mode is unlocked per lesson after completing it in Explorer Mode.

In Challenge Mode:
- An "energy bar" depletes slowly over 180 seconds
- No countdown number shown anywhere
- When energy runs out, the lesson ends with score accumulated so far
- If they clear the board before energy runs out, full stars awarded

Explorer Mode (default) has no timer at all.

---

## Files to Modify

- `phonics-game/js/game.js` — mode selection, timer management
- `phonics-game/index.html` — energy bar HTML, mode select UI
- `phonics-game/css/style.css` — energy bar styles

---

## Mode Selection UI

Add to board screen header:
```html
<div id="board-mode-indicator" class="mode-indicator">
    <span id="board-mode-label">Explorer Mode</span>
    <!-- Energy bar (only visible in Challenge Mode) -->
    <div id="energy-bar-container" class="energy-bar-container" style="display:none;">
        <div id="energy-bar-fill" class="energy-bar-fill"></div>
        <span class="energy-icon">⚡</span>
    </div>
</div>
```

Mode select dialog (shown before lesson starts, after tutorial):
```html
<div id="mode-select-overlay" class="mode-select-overlay" style="display:none;">
    <div class="mode-select-card">
        <h2>How do you want to play?</h2>
        <button class="mode-btn mode-explorer" onclick="game.selectMode('explorer')">
            <div class="mode-icon">🗺️</div>
            <div class="mode-name">Explorer Mode</div>
            <div class="mode-desc">No time pressure. Take your time!</div>
        </button>
        <button class="mode-btn mode-challenge" onclick="game.selectMode('challenge')">
            <div class="mode-icon">⚡</div>
            <div class="mode-name">Challenge Mode</div>
            <div class="mode-desc">Match as many as you can before energy runs out!</div>
        </button>
    </div>
</div>
```

The mode select dialog is shown AFTER the tutorial (or after tutorial is skipped).
First time playing a lesson: only Explorer Mode available (Challenge mode button greyed out
with label "Complete Explorer Mode first"). After lesson is completed once: both modes available.

---

## Timer Logic (in `js/game.js`)

```js
selectMode(mode) {
    this.mode = mode;
    document.getElementById('mode-select-overlay').style.display = 'none';

    if (mode === 'explorer') {
        document.getElementById('board-mode-label').textContent = 'Explorer Mode 🗺️';
        document.getElementById('energy-bar-container').style.display = 'none';
        // No timer — just start the game
        this.startBoardPlay();
    } else {
        document.getElementById('board-mode-label').textContent = 'Challenge Mode ⚡';
        document.getElementById('energy-bar-container').style.display = 'flex';
        this.startChallengeTimer();
        this.startBoardPlay();
    }
}

startChallengeTimer() {
    const DURATION = 180;  // 180 seconds
    let remaining = DURATION;
    const fill = document.getElementById('energy-bar-fill');

    this.challengeTimer = setInterval(() => {
        remaining--;
        const pct = (remaining / DURATION) * 100;
        fill.style.width = `${pct}%`;

        // Color shifts from green → yellow → orange as energy depletes
        if (pct > 60) {
            fill.style.backgroundColor = '#27ae60';
        } else if (pct > 30) {
            fill.style.backgroundColor = '#f39c12';
        } else {
            fill.style.backgroundColor = '#e74c3c';
        }

        if (remaining <= 0) {
            clearInterval(this.challengeTimer);
            this.onChallengeTimeUp();
        }
    }, 1000);
}

stopChallengeTimer() {
    if (this.challengeTimer) {
        clearInterval(this.challengeTimer);
        this.challengeTimer = null;
    }
}

onChallengeTimeUp() {
    // Energy depleted — end lesson with current score (not a failure)
    window.audioManager.playLessonComplete();
    const summary = window.scoreManager.getSummary();
    SaveManager.saveLessonResult(this.currentLessonId, summary);
    this.showSummary(summary, { timeUp: true });
}

onLessonComplete() {
    this.stopChallengeTimer();  // Stop timer if board is cleared before time up
    // ... rest of existing onLessonComplete
}
```

Challenge Mode star threshold:
- In challenge mode, full stars can be earned even if board isn't cleared (accuracy still matters)
- `ScoreManager.getStars()` already calculates based on accuracy — no change needed

---

## Energy Bar CSS

```css
.energy-bar-container {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 160px;
    height: 16px;
    background: #dfe6e9;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
}

.energy-bar-fill {
    height: 100%;
    width: 100%;
    background: #27ae60;
    border-radius: 8px;
    transition: width 1s linear, background-color 0.5s;
    /* NOTE: linear transition — no sudden jumps */
}

.energy-icon {
    position: absolute;
    right: 4px;
    font-size: 12px;
    pointer-events: none;
}

.mode-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
}

#board-mode-label {
    font-size: 14px;
    color: #636e72;
    white-space: nowrap;
}
```

---

## Mode Select Card CSS

```css
.mode-select-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 700;
}

.mode-select-card {
    background: var(--bg);
    border-radius: 20px;
    padding: 28px;
    max-width: 420px;
    width: 90%;
    text-align: center;
}

.mode-select-card h2 {
    font-size: 22px;
    margin: 0 0 20px;
}

.mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 16px;
    margin: 10px 0;
    border: 3px solid #dfe6e9;
    border-radius: 14px;
    background: white;
    cursor: pointer;
    touch-action: manipulation;
    min-height: 100px;
    transition: border-color 0.15s, transform 0.1s;
}

.mode-btn:active { transform: scale(0.97); }

.mode-explorer { border-color: var(--glow); }
.mode-challenge { border-color: var(--accent); }

.mode-icon { font-size: 32px; margin-bottom: 4px; }
.mode-name { font-size: 20px; font-weight: bold; color: var(--text); }
.mode-desc { font-size: 14px; color: #636e72; margin-top: 4px; }

.mode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

---

## Summary Screen Update for Challenge Mode

In `showSummary()`, if `options.timeUp`:
```js
if (options && options.timeUp) {
    document.getElementById('summary-title').textContent = '⚡ Time Up!';
    // Add note: "Your energy ran out — here's how you did!"
    document.getElementById('summary-title').insertAdjacentHTML('afterend',
        '<p style="color:#636e72;font-size:16px;">Your energy ran out — here\'s how you did!</p>'
    );
}
```

---

## Definition of Done

- [ ] Default mode is Explorer (no timer shown, no timer code running)
- [ ] Mode select dialog appears after tutorial completes
- [ ] Challenge Mode button greyed out with "Complete Explorer first" for new lessons
- [ ] Energy bar visible only in Challenge Mode (not in Explorer)
- [ ] Energy bar depletes smoothly over 180 seconds (linear CSS transition)
- [ ] Energy bar color shifts green → yellow → orange (no red flash)
- [ ] Time-up ends lesson gracefully with summary (not an error/failure state)
- [ ] Clearing board before time up stops timer and shows normal summary
- [ ] No countdown number visible anywhere
- [ ] Timer stops when navigating away (back button)

---

## ⚠️ Watch Out — Known Spec Issues

1. **Timer leak**: `this.challengeTimer` must be cleared in `showLessonSelect()`. Add `this.stopChallengeTimer()` alongside `matchManager.cancel()`.

2. **Energy bar color via CSS classes**: spec uses direct style manipulation `fill.style.backgroundColor = '#27ae60'`. Use CSS classes instead (e.g., `fill.className = 'energy-bar-fill energy-high'`) so color is defined in CSS, not JS.

3. **Mode select dialog**: add Escape key handler to dismiss (defaults to explorer mode).

4. **`insertAdjacentHTML` with template literal**: `summary-title.insertAdjacentHTML('afterend', \`<p>...\`)` — use `createElement` + `textContent` instead.
