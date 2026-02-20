# Session 05 — Tile Rendering + Board Layout

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Working game board screen with tiles that render, display words, and show visual states.

---

## Goal

Build the game board screen. Child can:
- Select a lesson and see the board with real word tiles
- Tap tiles and see selection state (highlighted border)
- Tap speaker icon to hear words spoken aloud
- See the board reset when they navigate away and return

This session does NOT implement match detection (Session 6) or pattern glow (Session 10).
The board renders and responds to touch/clicks; matching logic comes later.

---

## Files to Create/Modify

- `phonics-game/js/board.js` — tile generation, DOM rendering, board state
- `phonics-game/js/speech.js` — Web Speech API wrapper
- `phonics-game/js/game.js` — update to show board screen on lesson select
- `phonics-game/index.html` — add board screen HTML, update game screen HTML
- `phonics-game/css/style.css` — add tile styles, board grid styles

---

## `js/speech.js`

```js
class SpeechManager {
    static speak(word) {
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }

    static isMuted() {
        return localStorage.getItem('phonics-mute-speech') === 'true';
    }

    static speakIfUnmuted(word) {
        if (!this.isMuted()) this.speak(word);
    }
}
```

---

## `js/board.js`

### Board Generation

```js
class BoardManager {
    constructor() {
        this.tiles = [];    // flat array of tile objects
        this.gridSize = 4;  // set from lesson data
        this.lesson = null;
    }

    init(lesson) {
        this.lesson = lesson;
        this.gridSize = lesson.gridSize || 4;
        this.tiles = this.generateTiles();
        this.render();
    }

    generateTiles() {
        const totalTiles = this.gridSize * this.gridSize;
        const patterns = this.lesson.patterns;
        const pool = [];

        // Distribute tiles evenly across patterns (minimum 3 per pattern)
        const perPattern = Math.max(3, Math.floor(totalTiles / patterns.length));
        for (const pattern of patterns) {
            const words = this.lesson.wordPool[pattern];
            const shuffled = [...words].sort(() => Math.random() - 0.5);
            for (let i = 0; i < perPattern && pool.length < totalTiles; i++) {
                pool.push({ word: shuffled[i % shuffled.length], pattern });
            }
        }
        // Fill remainder if needed
        while (pool.length < totalTiles) {
            const pattern = patterns[pool.length % patterns.length];
            const words = this.lesson.wordPool[pattern];
            pool.push({ word: words[Math.floor(Math.random() * words.length)], pattern });
        }

        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Create tile objects
        return pool.slice(0, totalTiles).map((item, idx) => ({
            word: item.word,
            pattern: item.pattern,
            state: 'normal',    // 'normal' | 'selected' | 'glow' | 'matched' | 'wrong'
            row: Math.floor(idx / this.gridSize),
            col: idx % this.gridSize,
            element: null       // set during render
        }));
    }

    render() {
        const grid = document.getElementById('board-grid');
        grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        grid.innerHTML = '';

        for (const tile of this.tiles) {
            const el = document.createElement('div');
            el.className = 'tile';
            el.dataset.pattern = tile.pattern;
            el.innerHTML = `
                <span class="tile-word">${tile.word}</span>
                <button class="tile-speaker" aria-label="Hear ${tile.word}" onclick="SpeechManager.speakIfUnmuted('${tile.word}'); event.stopPropagation();">🔊</button>
            `;
            el.addEventListener('click', () => game.onTileTap(tile));
            tile.element = el;
            grid.appendChild(el);
        }
    }

    setTileState(tile, state) {
        tile.state = state;
        const el = tile.element;
        el.className = `tile tile-${state}`;
        el.dataset.pattern = tile.pattern;
    }

    resetAllStates() {
        for (const tile of this.tiles) {
            if (tile.state !== 'matched') this.setTileState(tile, 'normal');
        }
    }

    getTilesByPattern(pattern) {
        return this.tiles.filter(t => t.pattern === pattern && t.state !== 'matched');
    }
}
```

---

## Board Screen HTML (add to `index.html`)

```html
<div id="screen-board" style="display:none;">
    <div id="board-header">
        <button id="board-back-btn" onclick="game.showLessonSelect()">← Back</button>
        <h2 id="board-lesson-title">Lesson Title</h2>
        <div id="board-progress">0 / 0 matched</div>
    </div>
    <div id="board-grid" class="board-grid" aria-label="Word tiles" role="grid">
        <!-- Tiles rendered by BoardManager.render() -->
    </div>
    <div id="board-hint" class="board-hint">
        Tap a word, then find more words with the same sound!
    </div>
    <div id="board-pattern-feedback" class="pattern-feedback" aria-live="polite"></div>
</div>
```

---

## CSS: Tile Styles

```css
.board-grid {
    display: grid;
    gap: 8px;
    padding: 12px;
    max-width: 600px;
    margin: 0 auto;
}

.tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    padding: 8px;
    background: white;
    border: 3px solid #ccc;
    border-radius: 12px;
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.1s, background-color 0.15s, border-color 0.15s;
    font-family: var(--font-tile);
    font-size: 22px;
    font-weight: bold;
    color: var(--text);
    letter-spacing: 0.05em;
    position: relative;
    user-select: none;
}

.tile:active { transform: scale(0.95); }

.tile-selected {
    background: #fff8e1;
    border-color: var(--accent);
    border-width: 4px;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(232,160,32,0.4);
}

.tile-glow {
    background: #e8f4fd;
    border-color: var(--glow);
    border-width: 3px;
    animation: glowPulse 1.2s ease-in-out infinite;
}

@keyframes glowPulse {
    0%,100% { box-shadow: 0 0 6px rgba(52,152,219,0.4); }
    50%      { box-shadow: 0 0 14px rgba(52,152,219,0.7); }
}

.tile-wrong {
    animation: wrongShake 0.4s ease;
    border-color: var(--wrong);
}

@keyframes wrongShake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
}

.tile-matched {
    background: #d5f5e3;
    border-color: var(--correct);
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.4s, transform 0.4s;
    pointer-events: none;
}

.tile-speaker {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
    min-width: 28px;
    min-height: 28px;
    opacity: 0.6;
    touch-action: manipulation;
}
.tile-speaker:hover { opacity: 1; }

.tile-word {
    font-size: 22px;
    line-height: 1.2;
    text-align: center;
}

/* Responsive grid sizing */
@media (max-width: 480px) { .tile { min-height: 70px; } .tile-word { font-size: 18px; } }
@media (min-width: 768px) { .tile { min-height: 100px; } .tile-word { font-size: 24px; } }
```

---

## `js/game.js` Updates

Add to `Game` class:
```js
showLessonSelect() {
    document.getElementById('screen-board').style.display = 'none';
    document.getElementById('screen-select').style.display = 'block';
}

async startLesson(id) {
    const lesson = await DataManager.loadLesson(id);
    document.getElementById('screen-select').style.display = 'none';
    document.getElementById('screen-board').style.display = 'block';
    document.getElementById('board-lesson-title').textContent = lesson.title;
    window.boardManager = new BoardManager();
    boardManager.init(lesson);
}

onTileTap(tile) {
    // Speak the word
    SpeechManager.speakIfUnmuted(tile.word);
    // Selection logic (full implementation in Session 6)
    if (tile.state === 'normal' || tile.state === 'glow') {
        boardManager.setTileState(tile, 'selected');
    } else if (tile.state === 'selected') {
        boardManager.setTileState(tile, 'normal');
        boardManager.resetAllStates();
    }
}
```

---

## Definition of Done

- [ ] Selecting a lesson shows the board with correct word tiles
- [ ] Each tile is sized ≥80px tall on iPad screen
- [ ] Tapping a tile speaks the word aloud (SpeechSynthesis)
- [ ] Tapping speaker icon speaks word without toggling selection
- [ ] Tapping a tile highlights it (selected state)
- [ ] Tapping a selected tile deselects it
- [ ] No console errors on tile render
- [ ] Board layout is responsive (4×4 on grade 1, 5×5 on grade 2, 6×6 on grade 4)
- [ ] Back button returns to lesson select
