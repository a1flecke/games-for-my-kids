# Session 07 — Scoring, Stars, and Post-Lesson Summary

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Full scoring system, star awards, and post-lesson summary screen.

---

## Goal

After completing a lesson (all tiles matched), the player sees:
- Star rating (1–3 stars based on accuracy)
- Words they matched successfully
- Words they got wrong (for review)
- "Play Again" and "Next Lesson →" buttons
- Accurate score saved to LocalStorage

---

## Files to Create/Modify

- `phonics-game/js/score.js` — scoring, accuracy tracking, star calculation
- `phonics-game/js/save.js` — update to save lesson results
- `phonics-game/js/game.js` — update `onLessonComplete()` to show summary
- `phonics-game/index.html` — add summary screen HTML
- `phonics-game/css/style.css` — summary screen styles

---

## `js/score.js`

```js
class ScoreManager {
    constructor() {
        this.correct = 0;
        this.wrong = 0;
        this.streak = 0;        // current accuracy streak
        this.maxStreak = 0;     // highest streak this session
        this.matchedWords = []; // words matched successfully
        this.wrongWords = [];   // words where wrong tap occurred (for review)
        this.points = 0;
    }

    reset() {
        this.correct = 0;
        this.wrong = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.matchedWords = [];
        this.wrongWords = [];
        this.points = 0;
    }

    recordMatch(tileCount, pattern) {
        this.correct += tileCount;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        const streakBonus = this.streak >= 5 ? 1.25 : 1.0;
        this.points += tileCount * 10 * streakBonus;
    }

    recordWrong(word) {
        this.wrong++;
        this.streak = 0;  // break streak
        if (word && !this.wrongWords.includes(word)) {
            this.wrongWords.push(word);
        }
    }

    recordMatchedWord(word) {
        if (!this.matchedWords.includes(word)) this.matchedWords.push(word);
    }

    getAccuracy() {
        const total = this.correct + this.wrong;
        if (total === 0) return 1.0;
        return this.correct / total;
    }

    getStars() {
        const accuracy = this.getAccuracy();
        const hasStreak = this.maxStreak >= 5;
        if (accuracy >= 0.90 && hasStreak) return 3;
        if (accuracy >= 0.75) return 2;
        return 1;  // 1 star for completion (no fail state)
    }

    getSummary() {
        return {
            stars: this.getStars(),
            accuracy: this.getAccuracy(),
            correct: this.correct,
            wrong: this.wrong,
            maxStreak: this.maxStreak,
            matchedWords: this.matchedWords,
            wrongWords: this.wrongWords,
            points: Math.round(this.points)
        };
    }
}
```

---

## `js/save.js` Updates

```js
class SaveManager {
    static load() {
        try {
            return JSON.parse(localStorage.getItem('phonics-progress'))
                || { lessons: {}, tutorialSeen: {}, totalWordsMatched: 0 };
        } catch(e) {
            return { lessons: {}, tutorialSeen: {}, totalWordsMatched: 0 };
        }
    }

    static save(data) {
        try { localStorage.setItem('phonics-progress', JSON.stringify(data)); }
        catch(e) { console.warn('Save failed (private browsing?)'); }
    }

    static saveLessonResult(lessonId, summary) {
        const data = this.load();
        const prev = data.lessons[lessonId] || { stars: 0, bestAccuracy: 0, completed: false };

        data.lessons[lessonId] = {
            stars: Math.max(prev.stars, summary.stars),
            bestAccuracy: Math.max(prev.bestAccuracy, summary.accuracy),
            completed: true,
            previewed: prev.previewed || false
        };

        // Unlock next lesson
        data.lessons[lessonId + 1] = data.lessons[lessonId + 1] || { stars: 0, bestAccuracy: 0, completed: false };

        data.totalWordsMatched = (data.totalWordsMatched || 0) + summary.matchedWords.length;
        this.save(data);
        return data;
    }
}
```

---

## Summary Screen HTML (add to `index.html`)

```html
<div id="screen-summary" style="display:none;">
    <div class="summary-card">
        <h2 id="summary-title">Lesson Complete!</h2>
        <div id="summary-stars" class="summary-stars">★★★</div>
        <div id="summary-accuracy" class="summary-stat"></div>
        <div id="summary-streak" class="summary-stat"></div>

        <div class="summary-words-section">
            <h3>Words You Matched ✓</h3>
            <div id="summary-matched-words" class="summary-word-list"></div>
        </div>

        <div class="summary-words-section" id="summary-review-section">
            <h3>Words to Practice 🔁</h3>
            <div id="summary-wrong-words" class="summary-word-list"></div>
        </div>

        <div class="summary-buttons">
            <button class="summary-btn" onclick="game.playAgain()">🔄 Play Again</button>
            <button class="summary-btn summary-btn-primary" onclick="game.nextLesson()">Next Lesson →</button>
            <button class="summary-btn" onclick="game.showLessonSelect()">📚 All Lessons</button>
        </div>
    </div>
</div>
```

---

## Summary Screen CSS

```css
.summary-card {
    max-width: 500px;
    margin: 20px auto;
    padding: 24px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    text-align: center;
    font-family: var(--font-ui);
}

.summary-stars {
    font-size: 48px;
    margin: 16px 0;
    letter-spacing: 8px;
}

.summary-stat {
    font-size: 18px;
    color: #636e72;
    margin: 4px 0;
}

.summary-words-section {
    text-align: left;
    margin: 16px 0;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
}

.summary-words-section h3 {
    font-size: 16px;
    margin: 0 0 8px 0;
    color: var(--text);
}

.summary-word-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.summary-word-chip {
    background: white;
    border: 2px solid #dfe6e9;
    border-radius: 20px;
    padding: 4px 12px;
    font-family: var(--font-tile);
    font-size: 16px;
    cursor: pointer;  /* tap to hear */
}
.summary-word-chip:active { background: #e8f4fd; }

.summary-buttons {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
}

.summary-btn {
    padding: 12px 20px;
    border: 2px solid #dfe6e9;
    border-radius: 10px;
    background: white;
    font-family: var(--font-ui);
    font-size: 16px;
    cursor: pointer;
    min-height: 44px;
    touch-action: manipulation;
}
.summary-btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    font-weight: bold;
}
```

---

## `js/game.js` Updates

```js
onLessonComplete() {
    const summary = window.scoreManager.getSummary();
    const savedData = SaveManager.saveLessonResult(this.currentLessonId, summary);
    this.showSummary(summary);
}

showSummary(summary) {
    document.getElementById('screen-board').style.display = 'none';
    document.getElementById('screen-summary').style.display = 'block';

    // Stars display
    const stars = summary.stars;
    document.getElementById('summary-stars').textContent =
        '★'.repeat(stars) + '☆'.repeat(3 - stars);

    // Stats
    document.getElementById('summary-accuracy').textContent =
        `Accuracy: ${Math.round(summary.accuracy * 100)}%`;
    document.getElementById('summary-streak').textContent =
        summary.maxStreak >= 5 ? `🔥 Best streak: ${summary.maxStreak} in a row!` : '';

    // Matched words (tappable chips that speak the word)
    const matchedDiv = document.getElementById('summary-matched-words');
    matchedDiv.innerHTML = summary.matchedWords.map(w =>
        `<span class="summary-word-chip" onclick="SpeechManager.speakIfUnmuted('${w}')">${w} 🔊</span>`
    ).join('');

    // Wrong words (for review)
    const wrongDiv = document.getElementById('summary-wrong-words');
    const reviewSection = document.getElementById('summary-review-section');
    if (summary.wrongWords.length === 0) {
        reviewSection.style.display = 'none';
    } else {
        reviewSection.style.display = 'block';
        wrongDiv.innerHTML = summary.wrongWords.map(w =>
            `<span class="summary-word-chip" onclick="SpeechManager.speakIfUnmuted('${w}')">${w} 🔊</span>`
        ).join('');
    }
}

playAgain() {
    window.scoreManager.reset();
    this.startLesson(this.currentLessonId);
}

nextLesson() {
    const nextId = this.currentLessonId + 1;
    if (nextId <= 30) {
        window.scoreManager.reset();
        this.startLesson(nextId);
    } else {
        this.showLessonSelect();
    }
}
```

---

## Definition of Done

- [ ] Completing a lesson shows the summary screen
- [ ] Stars display correctly (★★★ vs ★★☆ vs ★☆☆)
- [ ] Matched words shown as tappable chips; tap speaks the word
- [ ] Wrong words section hidden when 0 wrong taps
- [ ] "Play Again" restarts the same lesson
- [ ] "Next Lesson →" opens the next lesson (or lesson select if lesson 30)
- [ ] Results saved to LocalStorage; lesson select shows updated stars on return
- [ ] Accuracy calculation correct: correct / (correct + wrong)
- [ ] 3 stars requires ≥90% accuracy AND streak of 5+
