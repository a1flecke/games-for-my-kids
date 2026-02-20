# Session 06 — Match Detection + Board Clearing

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Working match detection. Tapping 3+ same-pattern tiles clears them.

---

## Goal

Implement the core match mechanic:
1. Player taps tile A → A selected, all same-pattern tiles glow (pattern reveal)
2. Player taps tile B (same pattern) → B also selected
3. Player taps tile C (same pattern) → all 3 animate as matched, clear with new tiles
4. Player taps wrong-pattern tile → wrong animation, selection resets
5. Board tracks progress (matched count / total)

---

## Files to Create/Modify

- `phonics-game/js/match.js` — match detection, selection management
- `phonics-game/js/board.js` — update: refill on clear, detectValidMoves
- `phonics-game/js/game.js` — update `onTileTap` to use MatchManager
- `phonics-game/css/style.css` — matched tile fade-out animation refinements

---

## `js/match.js`

```js
class MatchManager {
    constructor(boardManager, scoreManager) {
        this.board = boardManager;
        this.score = scoreManager;
        this.selected = [];         // currently selected tiles
        this.matchedCount = 0;
        this.totalTiles = 0;
    }

    init(lesson) {
        this.selected = [];
        this.matchedCount = 0;
        this.totalTiles = this.board.tiles.length;
        this.updateProgress();
    }

    onTileTap(tile) {
        if (tile.state === 'matched') return;  // ignore matched tiles

        if (this.selected.length === 0) {
            // First tap: select and reveal same-pattern tiles
            this.selectFirst(tile);
        } else if (tile.state === 'selected') {
            // Tapping an already-selected tile: deselect it
            this.deselectTile(tile);
            if (this.selected.length === 0) {
                this.board.resetAllStates();
            }
        } else if (tile.pattern === this.selected[0].pattern) {
            // Same-pattern tile: add to selection
            this.board.setTileState(tile, 'selected');
            this.selected.push(tile);

            // If 3+ selected, trigger match
            if (this.selected.length >= 3) {
                this.triggerMatch();
            }
        } else {
            // Wrong pattern: wrong animation, reset
            this.wrongTap(tile);
        }
    }

    selectFirst(tile) {
        this.board.setTileState(tile, 'selected');
        this.selected = [tile];

        // Glow all other same-pattern tiles
        const samePattern = this.board.getTilesByPattern(tile.pattern)
            .filter(t => t !== tile);
        for (const t of samePattern) {
            this.board.setTileState(t, 'glow');
        }
    }

    deselectTile(tile) {
        this.board.setTileState(tile, 'normal');
        this.selected = this.selected.filter(t => t !== tile);
    }

    wrongTap(tile) {
        this.board.setTileState(tile, 'wrong');
        setTimeout(() => {
            this.board.setTileState(tile, 'normal');
        }, 400);
        this.score.recordWrong();
        this.resetSelection();
    }

    resetSelection() {
        for (const tile of this.selected) {
            if (tile.state !== 'matched') this.board.setTileState(tile, 'normal');
        }
        // Also reset any glowing tiles
        for (const tile of this.board.tiles) {
            if (tile.state === 'glow') this.board.setTileState(tile, 'normal');
        }
        this.selected = [];
    }

    triggerMatch() {
        const matchedPattern = this.selected[0].pattern;
        const matchedWords = this.selected.map(t => t.word);
        const patternLabel = this.board.lesson.patternLabels[matchedPattern] || matchedPattern;

        // Animate matched tiles
        for (const tile of this.selected) {
            this.board.setTileState(tile, 'matched');
        }

        // Show brief pattern feedback
        this.showPatternFeedback(patternLabel, matchedWords);

        this.matchedCount += this.selected.length;
        this.score.recordMatch(this.selected.length, matchedPattern);
        this.selected = [];

        // After animation, refill board
        setTimeout(() => {
            this.board.refill();
            this.updateProgress();

            // Check win condition
            if (this.matchedCount >= this.totalTiles) {
                setTimeout(() => game.onLessonComplete(), 600);
            } else if (!this.board.detectValidMoves()) {
                this.board.handleNoValidMoves();
            }
        }, 500);
    }

    showPatternFeedback(patternLabel, words) {
        const el = document.getElementById('board-pattern-feedback');
        el.textContent = `✓ ${patternLabel}! (${words.join(', ')})`;
        el.style.opacity = '1';
        setTimeout(() => { el.style.opacity = '0'; }, 1800);
    }

    updateProgress() {
        const matched = this.board.tiles.filter(t => t.state === 'matched').length;
        const total = this.totalTiles;
        document.getElementById('board-progress').textContent = `${matched} / ${total} matched`;
    }
}
```

---

## `js/board.js` Updates

### `refill()` method

After tiles are matched and animate away, refill with new words:

```js
refill() {
    const matchedTiles = this.tiles.filter(t => t.state === 'matched');
    if (matchedTiles.length === 0) return;

    const patterns = this.lesson.patterns;

    // Count remaining patterns on board
    const remaining = {};
    for (const t of this.tiles.filter(t => t.state !== 'matched')) {
        remaining[t.pattern] = (remaining[t.pattern] || 0) + 1;
    }

    // Build refill pool — ensure each pattern has representation
    const refillPool = [];
    for (let i = 0; i < matchedTiles.length; i++) {
        // Pick pattern with fewest tiles remaining
        const pattern = patterns.reduce((a, b) =>
            (remaining[a] || 0) <= (remaining[b] || 0) ? a : b
        );
        const words = this.lesson.wordPool[pattern];
        const usedWords = this.tiles.map(t => t.word);
        const available = words.filter(w => !usedWords.includes(w));
        const word = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : words[Math.floor(Math.random() * words.length)];
        refillPool.push({ word, pattern });
        remaining[pattern] = (remaining[pattern] || 0) + 1;
    }

    // Shuffle refill pool
    refillPool.sort(() => Math.random() - 0.5);

    // Replace matched tiles with new tiles (fade in)
    let refillIdx = 0;
    for (const tile of matchedTiles) {
        const newData = refillPool[refillIdx++];
        tile.word = newData.word;
        tile.pattern = newData.pattern;
        tile.state = 'normal';

        // Update DOM element
        const wordSpan = tile.element.querySelector('.tile-word');
        wordSpan.textContent = tile.word;
        tile.element.dataset.pattern = tile.pattern;
        tile.element.className = 'tile tile-fadein';
        tile.element.querySelector('.tile-speaker').setAttribute('aria-label', `Hear ${tile.word}`);
        // Update onclick to use new word
        tile.element.querySelector('.tile-speaker').setAttribute(
            'onclick', `SpeechManager.speakIfUnmuted('${tile.word}'); event.stopPropagation();`
        );
        setTimeout(() => {
            tile.element.classList.remove('tile-fadein');
            tile.element.className = 'tile';
        }, 400);
    }
}
```

### `detectValidMoves()` method

```js
detectValidMoves() {
    const patternCounts = {};
    for (const tile of this.tiles) {
        if (tile.state !== 'matched') {
            patternCounts[tile.pattern] = (patternCounts[tile.pattern] || 0) + 1;
        }
    }
    return Object.values(patternCounts).some(count => count >= 3);
}
```

### `handleNoValidMoves()` method

```js
handleNoValidMoves() {
    // Animate a brief "swirl" on all tiles
    for (const tile of this.tiles.filter(t => t.state !== 'matched')) {
        tile.element.classList.add('tile-swirl');
        setTimeout(() => tile.element.classList.remove('tile-swirl'), 800);
    }

    // Highlight one valid group (or shuffle if truly none exist)
    setTimeout(() => {
        this.injectValidMoves();
    }, 1000);
}

injectValidMoves() {
    // Force-replace 3 random non-matched tiles with a valid matching group
    const nonMatched = this.tiles.filter(t => t.state !== 'matched');
    if (nonMatched.length < 3) return;

    const targetPattern = this.lesson.patterns[0];
    const words = this.lesson.wordPool[targetPattern];
    const slots = nonMatched.slice(0, 3);

    for (let i = 0; i < 3; i++) {
        slots[i].word = words[i % words.length];
        slots[i].pattern = targetPattern;
        const wordSpan = slots[i].element.querySelector('.tile-word');
        wordSpan.textContent = slots[i].word;
        slots[i].element.dataset.pattern = targetPattern;
    }
}
```

---

## CSS Additions

```css
.tile-fadein {
    animation: fadeIn 0.4s ease;
}
@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
}

.tile-swirl {
    animation: swirl 0.8s ease;
}
@keyframes swirl {
    0%   { transform: rotate(0deg); }
    25%  { transform: rotate(-8deg) scale(0.95); }
    75%  { transform: rotate(8deg) scale(0.95); }
    100% { transform: rotate(0deg); }
}

#board-pattern-feedback {
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    color: var(--correct);
    min-height: 32px;
    margin: 8px 0;
    opacity: 0;
    transition: opacity 0.3s;
}
```

---

## `js/game.js` Updates

```js
onTileTap(tile) {
    SpeechManager.speakIfUnmuted(tile.word);
    window.matchManager.onTileTap(tile);
}

async startLesson(id) {
    const lesson = await DataManager.loadLesson(id);
    // ... show board screen ...
    window.boardManager = new BoardManager();
    boardManager.init(lesson);
    window.matchManager = new MatchManager(boardManager, scoreManager);
    matchManager.init(lesson);
}

onLessonComplete() {
    // Stub for Session 9 (post-lesson summary)
    alert('Lesson complete! 🎉');
}
```

---

## Definition of Done

- [ ] Tapping tile A selects it and glows all same-pattern tiles
- [ ] Tapping same-pattern tile B adds it to selection
- [ ] Tapping same-pattern tile C (3rd) triggers match animation and clears tiles
- [ ] Tapping wrong-pattern tile shakes it briefly and resets selection
- [ ] Cleared tiles are replaced with new tiles (fade-in animation)
- [ ] `detectValidMoves()` correctly returns false when no 3+ groups exist
- [ ] `handleNoValidMoves()` plays swirl animation and injects valid moves
- [ ] Progress counter updates correctly
- [ ] No console errors during match/refill cycle
