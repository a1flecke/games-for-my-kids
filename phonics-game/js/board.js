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

        // Distribute tiles evenly across patterns (minimum 3 per pattern).
        const perPattern = Math.max(3, Math.floor(totalTiles / patterns.length));
        for (const pattern of patterns) {
            const words = this.lesson.wordPool[pattern];
            const shuffled = [...words].sort(() => Math.random() - 0.5);
            for (let i = 0; i < perPattern && pool.length < totalTiles; i++) {
                pool.push({ word: shuffled[i % shuffled.length], pattern });
            }
        }
        // Fill any remainder caused by integer division.
        while (pool.length < totalTiles) {
            const pattern = patterns[pool.length % patterns.length];
            const words = this.lesson.wordPool[pattern];
            pool.push({ word: words[Math.floor(Math.random() * words.length)], pattern });
        }

        // Fisher-Yates shuffle so patterns don't cluster.
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

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
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', tile.word);

            const wordSpan = document.createElement('span');
            wordSpan.className = 'tile-word';
            wordSpan.textContent = tile.word;

            // Speaker button — secondary action, stops propagation so tile isn't also tapped.
            const speakerBtn = document.createElement('button');
            speakerBtn.className = 'tile-speaker';
            speakerBtn.setAttribute('aria-label', `Hear ${tile.word}`);
            speakerBtn.textContent = '🔊';
            speakerBtn.addEventListener('click', e => {
                e.stopPropagation();
                SpeechManager.speakIfUnmuted(tile.word);
            });

            el.appendChild(wordSpan);
            el.appendChild(speakerBtn);

            el.addEventListener('click', () => window.game.onTileTap(tile));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.game.onTileTap(tile);
                }
            });

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
