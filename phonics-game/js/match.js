class MatchManager {
    constructor(boardManager, scoreManager) {
        this.board = boardManager;
        this.score = scoreManager;  // ScoreManager instance (or null in tests)
        this.selected = [];
        this.matchedCount = 0;
        this.totalTiles = 0;
        // Stored timer IDs so back-navigation can cancel pending callbacks.
        this._matchTimer = null;
        this._winTimer = null;
    }

    init(lesson) {
        this.selected = [];
        this.matchedCount = 0;
        this.totalTiles = this.board.tiles.length;
        this.updateProgress();
    }

    // Cancel all pending timers. Call before navigating away mid-game.
    cancel() {
        clearTimeout(this._matchTimer);
        clearTimeout(this._winTimer);
        this._matchTimer = null;
        this._winTimer = null;
        if (this.board) this.board.cancel();
    }

    onTileTap(tile) {
        if (tile.state === 'matched') return;

        if (this.selected.length === 0) {
            // First tap: select tile and glow all same-pattern tiles.
            this.selectFirst(tile);
        } else if (tile.state === 'selected') {
            // Tapping an already-selected tile deselects it.
            this.deselectTile(tile);
            if (this.selected.length === 0) {
                this.board.resetAllStates();
            }
        } else if (tile.pattern === this.selected[0].pattern) {
            // Same-pattern tile: add to selection; trigger match at 3+.
            this.board.setTileState(tile, 'selected');
            this.selected.push(tile);
            if (this.selected.length >= 3) {
                this.triggerMatch();
            }
        } else {
            // Wrong pattern: shake animation and reset selection.
            this.wrongTap(tile);
        }
    }

    selectFirst(tile) {
        this.board.setTileState(tile, 'selected');
        this.selected = [tile];
        const hintMode = window.game ? window.game.hintMode : 'one';
        if (hintMode === 'none') return;
        // hintMode === 'one': glow exactly 1 random same-pattern tile.
        const candidates = this.board.getTilesByPattern(tile.pattern).filter(t => t !== tile);
        if (candidates.length === 0) return;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.board.setTileState(pick, 'glow');
    }

    deselectTile(tile) {
        this.board.setTileState(tile, 'normal');
        this.selected = this.selected.filter(t => t !== tile);
    }

    wrongTap(tile) {
        this.board.setTileState(tile, 'wrong');
        setTimeout(() => {
            // Only reset if still in 'wrong' — user may have triggered something else.
            if (tile.state === 'wrong') this.board.setTileState(tile, 'normal');
        }, 400);
        if (this.score) this.score.recordWrong(tile.word);
        this.resetSelection();
    }

    resetSelection() {
        // Reset selected tiles back to normal (don't disturb matched or wrong tiles).
        for (const tile of this.selected) {
            if (tile.state !== 'matched') this.board.setTileState(tile, 'normal');
        }
        // Also reset any glowing tiles (don't use resetAllStates — it would clear wrong animation).
        for (const tile of this.board.tiles) {
            if (tile.state === 'glow') this.board.setTileState(tile, 'normal');
        }
        this.selected = [];
    }

    triggerMatch() {
        const matchedPattern = this.selected[0].pattern;
        const matchedWords = this.selected.map(t => t.word);
        const patternLabel = this.board.lesson.patternLabels?.[matchedPattern] || matchedPattern;

        // Animate matched tiles out.
        for (const tile of this.selected) {
            this.board.setTileState(tile, 'matched');
        }

        // Reset any still-glowing tiles (same-pattern tiles not selected).
        for (const tile of this.board.tiles) {
            if (tile.state === 'glow') this.board.setTileState(tile, 'normal');
        }

        this.showPatternFeedback(patternLabel, matchedWords);
        this.matchedCount += this.selected.length;
        if (this.score) {
            this.score.recordMatch(this.selected.length, matchedPattern);
            for (const word of matchedWords) {
                this.score.recordMatchedWord(word);
            }
        }
        this.selected = [];

        // After fade-out animation (400ms), refill and check game state.
        this._matchTimer = setTimeout(() => {
            this._matchTimer = null;
            this.board.refill();
            this.updateProgress();

            if (this.matchedCount >= this.totalTiles) {
                this._winTimer = setTimeout(() => {
                    this._winTimer = null;
                    window.game.onLessonComplete();
                }, 600);
            } else if (!this.board.detectValidMoves()) {
                this.board.handleNoValidMoves();
            }
        }, 500);
    }

    showPatternFeedback(patternLabel, words) {
        const el = document.getElementById('board-pattern-feedback');
        // Clear first so aria-live fires even when the same pattern is matched consecutively.
        el.textContent = '';
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            el.textContent = `\u2713 ${patternLabel}! (${words.join(', ')})`;
            el.style.opacity = '1';
            setTimeout(() => { el.style.opacity = '0'; }, 1800);
        });
    }

    updateProgress() {
        document.getElementById('board-progress').textContent =
            `${this.matchedCount} / ${this.totalTiles} matched`;
    }
}
