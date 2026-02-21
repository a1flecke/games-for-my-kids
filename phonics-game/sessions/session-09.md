# Session 09 — Sort Mode

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Working Sort Mode — lower-stress word categorization game.

---

## Goal

Sort Mode is a lower-stakes entry point for children who find the main tile board overwhelming,
or for first exposure to a new pattern. Children see words one at a time and drag/tap them into
labeled pattern buckets. No timer, no score, just feedback after each word.

Sort Mode is accessible from the lesson select screen for any lesson. It does not award stars
(it has a separate "practiced" badge in LocalStorage).

---

## Files to Create/Modify

- `phonics-game/js/sort.js` — Sort Mode logic
- `phonics-game/index.html` — Sort Mode screen HTML
- `phonics-game/css/style.css` — Sort Mode styles
- `phonics-game/js/game.js` — add `startSortMode(lessonId)` and `showSortMode()`

---

## Sort Mode UX

1. Select a lesson on lesson-select screen → lesson card has two buttons: "Play" and "Sort"
2. Tapping "Sort" → loads Sort Mode
3. Screen shows:
   - 3–4 pattern buckets across the bottom (labeled with pattern name + 1 example word)
   - One word card in the center (large, readable)
   - Speaker button to hear the word
   - Prompt: "Which bucket does this word belong in?"
4. Child taps a bucket OR drags the word card to a bucket
5. Correct: word floats into bucket with green flash, next word appears
6. Wrong: gentle shake, try again (word stays, bucket flashes red briefly)
7. After all words: congratulations screen with list of all words sorted

---

## `js/sort.js`

```js
class SortManager {
    constructor() {
        this.lesson = null;
        this.wordQueue = [];
        this.currentWord = null;
        this.results = { correct: [], wrong: [] };
        this.buckets = {};  // pattern → count
    }

    async start(lessonId) {
        this.lesson = await DataManager.loadLesson(lessonId);
        this.buildWordQueue();
        this.results = { correct: [], wrong: [] };
        this.buckets = {};

        this.renderBuckets();
        this.nextWord();
    }

    buildWordQueue() {
        // 12 words total, 3 per pattern (or evenly distributed)
        const patterns = this.lesson.patterns;
        const queue = [];
        for (const pattern of patterns) {
            const words = this.lesson.wordPool[pattern];
            const sample = words.sort(() => Math.random() - 0.5).slice(0, 3);
            for (const word of sample) queue.push({ word, pattern });
        }
        // Shuffle
        this.wordQueue = queue.sort(() => Math.random() - 0.5);
        this.wordIndex = 0;
    }

    renderBuckets() {
        const container = document.getElementById('sort-buckets');
        container.innerHTML = '';

        for (const pattern of this.lesson.patterns) {
            const label = this.lesson.patternLabels[pattern] || pattern;
            const example = this.lesson.wordPool[pattern][0] || '';
            const bucket = document.createElement('div');
            bucket.className = 'sort-bucket';
            bucket.dataset.pattern = pattern;
            bucket.innerHTML = `
                <div class="sort-bucket-label">${label}</div>
                <div class="sort-bucket-example">e.g. "${example}"</div>
                <div class="sort-bucket-count" id="bucket-count-${pattern}">0 words</div>
            `;
            bucket.addEventListener('click', () => this.onBucketTap(pattern));
            container.appendChild(bucket);
            this.buckets[pattern] = 0;
        }
    }

    nextWord() {
        if (this.wordIndex >= this.wordQueue.length) {
            this.showSortComplete();
            return;
        }

        this.currentWord = this.wordQueue[this.wordIndex];
        this.wordIndex++;

        const wordCard = document.getElementById('sort-word-card');
        wordCard.textContent = this.currentWord.word;
        wordCard.className = 'sort-word-card';

        // Auto-speak new word
        SpeechManager.speakIfUnmuted(this.currentWord.word);

        // Update progress
        document.getElementById('sort-progress').textContent =
            `Word ${this.wordIndex} of ${this.wordQueue.length}`;
    }

    onBucketTap(pattern) {
        if (!this.currentWord) return;
        const isCorrect = pattern === this.currentWord.pattern;
        const bucket = document.querySelector(`.sort-bucket[data-pattern="${pattern}"]`);

        if (isCorrect) {
            // Correct!
            bucket.classList.add('sort-bucket-correct');
            setTimeout(() => bucket.classList.remove('sort-bucket-correct'), 500);

            this.results.correct.push(this.currentWord.word);
            this.buckets[pattern]++;
            document.getElementById(`bucket-count-${pattern}`).textContent =
                `${this.buckets[pattern]} word${this.buckets[pattern] !== 1 ? 's' : ''}`;

            const wordCard = document.getElementById('sort-word-card');
            wordCard.classList.add('sort-card-correct');

            document.getElementById('sort-feedback').textContent =
                `✓ "${this.currentWord.word}" is a ${this.lesson.patternLabels[pattern]} word!`;

            setTimeout(() => {
                document.getElementById('sort-feedback').textContent = '';
                this.nextWord();
            }, 700);
        } else {
            // Wrong — gentle feedback
            bucket.classList.add('sort-bucket-wrong');
            setTimeout(() => bucket.classList.remove('sort-bucket-wrong'), 400);

            if (!this.results.wrong.includes(this.currentWord.word)) {
                this.results.wrong.push(this.currentWord.word);
            }

            const correctLabel = this.lesson.patternLabels[this.currentWord.pattern];
            document.getElementById('sort-feedback').textContent =
                `Hmm — try the ${correctLabel} bucket!`;

            setTimeout(() => document.getElementById('sort-feedback').textContent = '', 1500);
        }
    }

    showSortComplete() {
        document.getElementById('sort-complete-section').style.display = 'block';
        document.getElementById('sort-word-section').style.display = 'none';

        const total = this.wordQueue.length;
        const correct = this.results.correct.length;
        document.getElementById('sort-complete-msg').textContent =
            `You sorted ${correct} of ${total} words correctly! 🎉`;

        // Save "practiced" badge
        const data = SaveManager.load();
        if (!data.sortPracticed) data.sortPracticed = {};
        data.sortPracticed[this.lesson.id] = true;
        SaveManager.save(data);
    }
}
```

---

## Sort Mode Screen HTML (add to `index.html`)

```html
<div id="screen-sort" style="display:none;">
    <div id="sort-header">
        <button onclick="game.showLessonSelect()">← Back</button>
        <h2 id="sort-lesson-title">Sort Mode</h2>
        <div id="sort-progress">Word 0 of 12</div>
    </div>

    <div id="sort-word-section">
        <p class="sort-instruction">Which bucket does this word belong in?</p>
        <div id="sort-word-container">
            <div id="sort-word-card" class="sort-word-card">word</div>
            <button class="sort-speaker-btn"
                onclick="SpeechManager.speakIfUnmuted(document.getElementById('sort-word-card').textContent)">
                🔊 Hear it
            </button>
        </div>
        <div id="sort-feedback" class="sort-feedback"></div>
        <div id="sort-buckets" class="sort-buckets"></div>
    </div>

    <div id="sort-complete-section" style="display:none;">
        <p id="sort-complete-msg"></p>
        <div class="sort-complete-buttons">
            <button onclick="window.sortManager.start(game.currentLessonId)">🔄 Sort Again</button>
            <button onclick="game.startLesson(game.currentLessonId)">🎮 Play the Board</button>
            <button onclick="game.showLessonSelect()">📚 Lesson Select</button>
        </div>
    </div>
</div>
```

---

## Sort Mode CSS

```css
#sort-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 2px solid #dfe6e9;
}

.sort-instruction {
    text-align: center;
    font-size: 20px;
    margin: 16px;
    font-family: var(--font-ui);
}

#sort-word-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
}

.sort-word-card {
    font-family: var(--font-tile);
    font-size: 36px;
    font-weight: bold;
    letter-spacing: 0.05em;
    color: var(--text);
    background: white;
    border: 4px solid var(--glow);
    border-radius: 16px;
    padding: 20px 40px;
    min-width: 200px;
    text-align: center;
    transition: transform 0.3s;
}

.sort-card-correct {
    background: #d5f5e3;
    border-color: var(--correct);
    transform: scale(1.1);
}

.sort-speaker-btn {
    padding: 10px 20px;
    border-radius: 10px;
    border: 2px solid #dfe6e9;
    background: white;
    font-size: 16px;
    cursor: pointer;
    min-height: 44px;
    touch-action: manipulation;
}

.sort-feedback {
    text-align: center;
    font-size: 18px;
    min-height: 28px;
    color: var(--correct);
    margin: 8px 0;
    font-family: var(--font-ui);
}

.sort-buckets {
    display: flex;
    gap: 10px;
    justify-content: center;
    padding: 16px;
    flex-wrap: wrap;
}

.sort-bucket {
    background: white;
    border: 3px solid #dfe6e9;
    border-radius: 14px;
    padding: 14px 16px;
    min-width: 110px;
    text-align: center;
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.1s, border-color 0.15s;
    min-height: 80px;
}
.sort-bucket:active { transform: scale(0.95); }

.sort-bucket-label {
    font-family: var(--font-ui);
    font-size: 18px;
    font-weight: bold;
    color: var(--text);
}

.sort-bucket-example {
    font-size: 14px;
    color: #636e72;
    margin: 4px 0;
}

.sort-bucket-count {
    font-size: 13px;
    color: #636e72;
    margin-top: 6px;
}

.sort-bucket-correct {
    border-color: var(--correct);
    background: #d5f5e3;
    transform: scale(1.05);
}

.sort-bucket-wrong {
    animation: wrongShake 0.4s ease;
    border-color: var(--wrong);
}
```

---

## Lesson Card Updates (Session 1's lesson card needs a Sort button)

Update the lesson card HTML in `renderLessonSelect()`:
```js
// Each card now has two action buttons
el.innerHTML = `
    <div class="lesson-card-num">${lesson.id}</div>
    <div class="lesson-card-title">${lesson.title}</div>
    <div class="lesson-card-grade">Grade ${lesson.gradeLevel}</div>
    <div class="lesson-card-stars">${starsHtml}</div>
    <div class="lesson-card-actions">
        <button class="lesson-play-btn" onclick="event.stopPropagation(); game.startLesson(${lesson.id})">Play ▶</button>
        <button class="lesson-sort-btn" onclick="event.stopPropagation(); game.startSortMode(${lesson.id})">Sort 🗂</button>
    </div>
`;
```

---

## `js/game.js` Addition

```js
async startSortMode(id) {
    this.currentLessonId = id;
    document.getElementById('screen-select').style.display = 'none';
    document.getElementById('screen-sort').style.display = 'block';
    document.getElementById('sort-lesson-title').textContent = 'Sort Mode';
    document.getElementById('sort-complete-section').style.display = 'none';
    document.getElementById('sort-word-section').style.display = 'block';

    window.sortManager = window.sortManager || new SortManager();
    await sortManager.start(id);
}
```

---

## Definition of Done

- [ ] "Sort" button appears on each lesson card
- [ ] Sort Mode loads lesson data and shows pattern buckets
- [ ] Word card displays one word at a time; auto-speaks on appearance
- [ ] "Hear it" button re-speaks word
- [ ] Tapping correct bucket: green flash, word count increments, next word
- [ ] Tapping wrong bucket: shake animation, helpful feedback, word stays
- [ ] After all words: completion message with count
- [ ] "Play the Board" button transitions to main game mode
- [ ] No timer shown anywhere in Sort Mode
- [ ] Sort practiced state saved to LocalStorage (shows badge on lesson card)

---

## ⚠️ Watch Out — Known Spec Issues

1. **Lesson card "Sort" button**: spec puts button in `el.innerHTML` with `onclick="event.stopPropagation(); game.startSortMode(${lesson.id})"`. Use `createElement` + `addEventListener` for both Play and Sort buttons — do not use innerHTML for the card body since it breaks the existing rendering pattern in `renderLessonSelect()`.

2. **`buildWordQueue` shuffle**: `queue.sort(() => Math.random() - 0.5)` appears twice — use Fisher-Yates both times.

3. **Sort speaker button DOM read**: spec reads word from DOM `document.getElementById('sort-word-card').textContent`. Use `this.currentWord.word` instead (already tracked in state).

4. **`window.sortManager` init**: create in `game.init()`, not in `startSortMode()`. Avoids stale state on second play.

5. **`renderBuckets` innerHTML**: wraps `${label}` and `${example}` in template literal — use `escHtml()` on both values.

6. **Sort buckets keyboard**: add `role="button"`, `tabindex="0"`, and `keydown` (Enter/Space) handler in `renderBuckets()`.
