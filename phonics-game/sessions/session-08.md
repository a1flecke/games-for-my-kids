# Session 08 — Tutorial System

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** First-play tutorial overlay for each new phonics pattern.

---

## Goal

When a child plays a lesson for the first time, they see a guided tutorial before the full
board appears. The tutorial:
1. Shows 6 tiles: 3 of the new pattern + 3 of a familiar pattern
2. Highlights the new-pattern tiles and explains the pattern in simple language
3. Guides the child to tap them for their first match
4. Transitions to the full lesson board

The tutorial is skipped on subsequent plays. Each phonics pattern gets its own tutorial state.

---

## Files to Create/Modify

- `phonics-game/js/tutorial.js` — tutorial overlay logic
- `phonics-game/index.html` — tutorial overlay HTML
- `phonics-game/css/style.css` — tutorial overlay styles
- `phonics-game/js/game.js` — hook tutorial into `startLesson()`

---

## `js/tutorial.js`

```js
class TutorialManager {
    constructor() {
        this.overlay = document.getElementById('tutorial-overlay');
        this.step = 0;
        this.lesson = null;
        this.onComplete = null;
    }

    shouldShow(lesson, progress) {
        // Show tutorial if ANY of this lesson's patterns haven't been seen
        if (!progress || !progress.tutorialSeen) return true;
        return lesson.patterns.some(p => !progress.tutorialSeen[p]);
    }

    start(lesson, progress, onComplete) {
        this.lesson = lesson;
        this.onComplete = onComplete;
        this.step = 0;

        // Find the first unseen pattern to teach
        const unseenPattern = lesson.patterns.find(p =>
            !progress.tutorialSeen || !progress.tutorialSeen[p]
        ) || lesson.patterns[0];

        this.targetPattern = unseenPattern;
        this.patternLabel = lesson.patternLabels[unseenPattern] || unseenPattern;
        this.patternHint = lesson.patternHint || '';

        this.showStep1();
    }

    showStep1() {
        // Step 1: Explain the pattern with example words
        const words = this.lesson.wordPool[this.targetPattern];
        const examples = words.slice(0, 3);

        document.getElementById('tut-step').textContent = 'Step 1 of 3';
        document.getElementById('tut-title').textContent = `Meet the ${this.patternLabel} sound!`;
        document.getElementById('tut-body').innerHTML = `
            <p>${this.patternHint}</p>
            <div class="tut-examples">
                ${examples.map(w =>
                    `<div class="tut-word" onclick="SpeechManager.speakIfUnmuted('${w}')">${w} <span class="tut-speaker">🔊</span></div>`
                ).join('')}
            </div>
            <p style="font-size:16px;color:#636e72;">Tap each word to hear it!</p>
        `;
        document.getElementById('tut-next-btn').textContent = 'Next →';
        document.getElementById('tut-next-btn').onclick = () => this.showStep2();
        document.getElementById('tut-skip-btn').style.display = 'block';

        this.overlay.style.display = 'flex';
        SpeechManager.speakIfUnmuted(examples[0]);
    }

    showStep2() {
        // Step 2: Show mini board, ask them to find the pattern
        document.getElementById('tut-step').textContent = 'Step 2 of 3';
        document.getElementById('tut-title').textContent = `Can you find the ${this.patternLabel} words?`;
        document.getElementById('tut-body').innerHTML = `
            <p>Tap all the <strong>${this.patternLabel}</strong> words!</p>
            <div id="tut-mini-board" class="tut-mini-board"></div>
            <p id="tut-mini-feedback" class="tut-feedback"></p>
        `;
        document.getElementById('tut-next-btn').style.display = 'none';
        document.getElementById('tut-skip-btn').style.display = 'block';

        this.buildMiniBoard();
    }

    buildMiniBoard() {
        const targetWords = this.lesson.wordPool[this.targetPattern].slice(0, 3);
        // Find a "known" or different pattern for contrast
        const otherPattern = this.lesson.patterns.find(p => p !== this.targetPattern)
            || this.targetPattern;
        const otherWords = (this.lesson.wordPool[otherPattern] || []).slice(0, 3);

        const allTiles = [
            ...targetWords.map(w => ({ word: w, pattern: this.targetPattern, isTarget: true })),
            ...otherWords.map(w => ({ word: w, pattern: otherPattern, isTarget: false }))
        ].sort(() => Math.random() - 0.5);

        const board = document.getElementById('tut-mini-board');
        board.innerHTML = '';
        this.miniSelected = [];

        for (const tileData of allTiles) {
            const el = document.createElement('div');
            el.className = 'tut-tile';
            el.textContent = tileData.word;
            el.addEventListener('click', () => {
                SpeechManager.speakIfUnmuted(tileData.word);
                if (tileData.isTarget) {
                    el.classList.add('tut-tile-correct');
                    this.miniSelected.push(tileData.word);
                    const feedback = document.getElementById('tut-mini-feedback');
                    feedback.textContent = `✓ "${tileData.word}" is a ${this.patternLabel} word!`;
                    if (this.miniSelected.length >= 3) {
                        setTimeout(() => this.showStep3(), 700);
                    }
                } else {
                    el.classList.add('tut-tile-wrong');
                    setTimeout(() => el.classList.remove('tut-tile-wrong'), 400);
                    document.getElementById('tut-mini-feedback').textContent =
                        `Hmm, try another word with the ${this.patternLabel} sound.`;
                }
            });
            board.appendChild(el);
        }
    }

    showStep3() {
        document.getElementById('tut-step').textContent = 'Step 3 of 3';
        document.getElementById('tut-title').textContent = 'You got it! 🎉';
        document.getElementById('tut-body').innerHTML = `
            <p>Great job finding the <strong>${this.patternLabel}</strong> words!</p>
            <p>Now try the full board. Good luck, Word Explorer!</p>
        `;
        document.getElementById('tut-next-btn').textContent = "Let's Play! →";
        document.getElementById('tut-next-btn').style.display = 'block';
        document.getElementById('tut-next-btn').onclick = () => this.complete();
        document.getElementById('tut-skip-btn').style.display = 'none';
    }

    skip() {
        this.complete();
    }

    complete() {
        this.overlay.style.display = 'none';

        // Mark pattern as seen in progress
        const progress = SaveManager.load();
        progress.tutorialSeen = progress.tutorialSeen || {};
        for (const p of this.lesson.patterns) {
            progress.tutorialSeen[p] = true;
        }
        SaveManager.save(progress);

        if (this.onComplete) this.onComplete();
    }
}
```

---

## Tutorial Overlay HTML (add to `index.html`, inside body)

```html
<div id="tutorial-overlay" class="tutorial-overlay" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="tut-title">
    <div class="tutorial-card">
        <div id="tut-step" class="tut-step">Step 1 of 3</div>
        <h2 id="tut-title" class="tut-title"></h2>
        <div id="tut-body" class="tut-body"></div>
        <div class="tut-buttons">
            <button id="tut-skip-btn" class="tut-btn tut-btn-secondary"
                onclick="window.tutorialManager.skip()">Skip Tutorial</button>
            <button id="tut-next-btn" class="tut-btn tut-btn-primary"
                onclick="">Next →</button>
        </div>
    </div>
</div>
```

---

## Tutorial CSS

```css
.tutorial-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.tutorial-card {
    background: var(--bg);
    border-radius: 20px;
    padding: 28px;
    max-width: 440px;
    width: 90%;
    box-shadow: 0 16px 48px rgba(0,0,0,0.3);
    font-family: var(--font-ui);
}

.tut-step {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #636e72;
    margin-bottom: 8px;
}

.tut-title {
    font-size: 24px;
    margin: 0 0 16px;
    color: var(--text);
}

.tut-body p {
    font-size: 18px;
    line-height: 1.5;
    margin: 8px 0;
}

.tut-examples {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 16px 0;
    flex-wrap: wrap;
}

.tut-word {
    background: white;
    border: 3px solid var(--glow);
    border-radius: 12px;
    padding: 10px 18px;
    font-family: var(--font-tile);
    font-size: 22px;
    cursor: pointer;
    touch-action: manipulation;
}

.tut-mini-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 16px 0;
}

.tut-tile {
    background: white;
    border: 3px solid #ccc;
    border-radius: 10px;
    padding: 12px 6px;
    text-align: center;
    font-family: var(--font-tile);
    font-size: 18px;
    cursor: pointer;
    touch-action: manipulation;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tut-tile-correct {
    background: #d5f5e3;
    border-color: var(--correct);
    transform: scale(1.05);
}

.tut-tile-wrong {
    animation: wrongShake 0.4s ease;
    border-color: var(--wrong);
}

.tut-feedback {
    text-align: center;
    font-size: 16px;
    min-height: 24px;
    color: var(--correct);
    margin: 8px 0 0;
}

.tut-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: flex-end;
}

.tut-btn {
    padding: 12px 20px;
    border-radius: 10px;
    border: 2px solid #dfe6e9;
    font-family: var(--font-ui);
    font-size: 16px;
    cursor: pointer;
    min-height: 44px;
    touch-action: manipulation;
}

.tut-btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    font-weight: bold;
}

.tut-btn-secondary {
    background: white;
    color: #636e72;
}
```

---

## `js/game.js` Updates

```js
async startLesson(id) {
    this.currentLessonId = id;
    const lesson = await DataManager.loadLesson(id);
    const progress = SaveManager.load();

    document.getElementById('screen-select').style.display = 'none';
    document.getElementById('board-lesson-title').textContent = lesson.title;

    window.boardManager = new BoardManager();
    window.scoreManager = new ScoreManager();

    if (window.tutorialManager.shouldShow(lesson, progress)) {
        // Show board screen in background (invisible until tutorial done)
        document.getElementById('screen-board').style.display = 'block';
        boardManager.init(lesson);
        window.tutorialManager.start(lesson, progress, () => {
            window.matchManager = new MatchManager(boardManager, scoreManager);
            matchManager.init(lesson);
        });
    } else {
        document.getElementById('screen-board').style.display = 'block';
        boardManager.init(lesson);
        window.matchManager = new MatchManager(boardManager, scoreManager);
        matchManager.init(lesson);
    }
}
```

---

## Definition of Done

- [ ] First launch of lesson 1 shows tutorial overlay
- [ ] Step 1 displays 3 example words from the new pattern; tapping speaks them
- [ ] Step 2 mini board has 6 tiles (3 target + 3 other), shuffled
- [ ] Tapping correct tiles shows green confirmation; wrong tiles show shake
- [ ] Finding all 3 target tiles advances to Step 3 automatically
- [ ] Step 3 has "Let's Play!" button that dismisses tutorial and starts game
- [ ] "Skip Tutorial" exits immediately to game
- [ ] Tutorial state saved to LocalStorage; second play of same lesson skips tutorial
- [ ] Tutorial is fully keyboard navigable (Tab/Enter)
- [ ] `aria-modal` and `role="dialog"` set correctly for screen readers
