class BoardManager {
    constructor() {
        this.tiles = [];    // flat array of tile objects
        this.gridSize = 4;  // set from lesson data
        this.lesson = null;
        this._noMovesTimer = null;
    }

    init(lesson) {
        this.lesson = lesson;
        this.gridSize = lesson.gridSize || 4;
        this.tiles = this.generateTiles();
        this.render();
    }

    // Cancel pending no-moves injection timer (called from MatchManager.cancel()).
    cancel() {
        clearTimeout(this._noMovesTimer);
        this._noMovesTimer = null;
    }

    generateTiles() {
        const totalTiles = this.gridSize * this.gridSize;
        const patterns = this.lesson.patterns;
        const pool = [];

        // Distribute tiles evenly across patterns (minimum 3 per pattern).
        const perPattern = Math.max(3, Math.floor(totalTiles / patterns.length));
        for (const pattern of patterns) {
            const words = this.lesson.wordPool[pattern];
            // Fisher-Yates shuffle (not biased sort-based shuffle).
            const shuffled = [...words];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
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
            el.setAttribute('aria-pressed', 'false');

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
        // Communicate selection state to screen readers (VoiceOver, TalkBack).
        el.setAttribute('aria-pressed', state === 'selected' ? 'true' : 'false');
        // Matched tiles are not interactive — hide them from keyboard and AT.
        if (state === 'matched') {
            el.setAttribute('tabindex', '-1');
            el.setAttribute('aria-disabled', 'true');
        } else {
            el.setAttribute('tabindex', '0');
            el.removeAttribute('aria-disabled');
        }
    }

    resetAllStates() {
        for (const tile of this.tiles) {
            if (tile.state !== 'matched') this.setTileState(tile, 'normal');
        }
    }

    getTilesByPattern(pattern) {
        return this.tiles.filter(t => t.pattern === pattern && t.state !== 'matched');
    }

    // Replace matched tiles with fresh words, balancing pattern distribution.
    refill() {
        const matchedTiles = this.tiles.filter(t => t.state === 'matched');
        if (matchedTiles.length === 0) return;

        const patterns = this.lesson.patterns;

        // Count visible (non-matched) tiles per pattern before refill.
        const remaining = {};
        for (const t of this.tiles.filter(t => t.state !== 'matched')) {
            remaining[t.pattern] = (remaining[t.pattern] || 0) + 1;
        }

        // Track all words currently on board (to avoid same-word-twice within a refill batch).
        const usedInBatch = new Set(this.tiles.map(t => t.word));

        // Build refill pool — fill each slot with the pattern that needs it most.
        const refillPool = [];
        for (let i = 0; i < matchedTiles.length; i++) {
            const pattern = patterns.reduce((a, b) =>
                (remaining[a] || 0) <= (remaining[b] || 0) ? a : b
            );
            const words = this.lesson.wordPool[pattern];
            const available = words.filter(w => !usedInBatch.has(w));
            const word = available.length > 0
                ? available[Math.floor(Math.random() * available.length)]
                : words[Math.floor(Math.random() * words.length)];
            refillPool.push({ word, pattern });
            remaining[pattern] = (remaining[pattern] || 0) + 1;
            usedInBatch.add(word);
        }

        // Fisher-Yates shuffle so refilled patterns don't cluster together.
        for (let i = refillPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [refillPool[i], refillPool[j]] = [refillPool[j], refillPool[i]];
        }

        let refillIdx = 0;
        for (const tile of matchedTiles) {
            const newData = refillPool[refillIdx++];
            tile.word = newData.word;
            tile.pattern = newData.pattern;
            tile.state = 'normal';

            // Update DOM. Event listeners already reference the tile object, so updating
            // tile.word/pattern is sufficient for click handlers — no need to re-bind.
            tile.element.querySelector('.tile-word').textContent = tile.word;
            tile.element.setAttribute('aria-label', tile.word);
            tile.element.setAttribute('aria-pressed', 'false');
            tile.element.setAttribute('tabindex', '0');
            tile.element.removeAttribute('aria-disabled');
            tile.element.dataset.pattern = tile.pattern;
            tile.element.querySelector('.tile-speaker').setAttribute('aria-label', `Hear ${tile.word}`);

            // Fade-in animation; only reset class to 'tile' if state is still normal.
            tile.element.className = 'tile tile-fadein';
            setTimeout(() => {
                if (tile.state === 'normal') tile.element.className = 'tile';
            }, 400);
        }
    }

    // Returns true if at least one pattern has 3+ unmatched tiles remaining.
    detectValidMoves() {
        const patternCounts = {};
        for (const tile of this.tiles) {
            if (tile.state !== 'matched') {
                patternCounts[tile.pattern] = (patternCounts[tile.pattern] || 0) + 1;
            }
        }
        return Object.values(patternCounts).some(count => count >= 3);
    }

    // Called when no valid moves exist — animate tiles then inject a valid group.
    handleNoValidMoves() {
        // Announce to screen readers that the board is reshuffling.
        const live = document.getElementById('aria-live');
        if (live) live.textContent = 'No matches left — reshuffling the board!';

        for (const tile of this.tiles.filter(t => t.state !== 'matched')) {
            tile.element.classList.add('tile-swirl');
            setTimeout(() => tile.element.classList.remove('tile-swirl'), 800);
        }
        this._noMovesTimer = setTimeout(() => {
            this._noMovesTimer = null;
            this.injectValidMoves();
        }, 1000);
    }

    // Force-replace 3 non-matched tiles with a guaranteed matching group.
    injectValidMoves() {
        const nonMatched = this.tiles.filter(t => t.state !== 'matched');
        if (nonMatched.length < 3) return;

        const targetPattern = this.lesson.patterns[0];
        const words = this.lesson.wordPool[targetPattern];

        for (let i = 0; i < 3; i++) {
            const tile = nonMatched[i];
            tile.word = words[i % words.length];
            tile.pattern = targetPattern;
            // Ensure tile is in a clean interactive state before updating DOM.
            this.setTileState(tile, 'normal');
            tile.element.querySelector('.tile-word').textContent = tile.word;
            tile.element.setAttribute('aria-label', tile.word);
            tile.element.dataset.pattern = targetPattern;
            tile.element.querySelector('.tile-speaker').setAttribute('aria-label', `Hear ${tile.word}`);
        }
    }
}
