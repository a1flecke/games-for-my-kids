/**
 * PuzzleSystem - Creed Fragment assembly puzzle for Level 3
 *
 * Player must arrange 5 creed fragments in the correct order.
 * Arrow keys to select, SPACE to pick up / place.
 * Hints appear after 2 wrong attempts.
 * Each fragment teaches part of the creed when selected.
 */
class PuzzleSystem {
    constructor() {
        this.active = false;

        // The 5 creed fragments in correct order
        this.fragments = [
            { id: 0, text: 'We believe in one God', teaching: 'This declares there is only one God, not many.' },
            { id: 1, text: 'The Father Almighty', teaching: 'God is called Father because He created everything.' },
            { id: 2, text: 'And in one Lord Jesus Christ', teaching: 'Jesus is Lord, the one sent by God to save us.' },
            { id: 3, text: 'Of one being with the Father', teaching: 'Jesus shares the same divine nature as God.' },
            { id: 4, text: 'Who came down from heaven', teaching: 'Jesus left heaven to live among people on earth.' }
        ];

        // Shuffled fragments (source pool)
        this.shuffled = [];

        // Placed fragments (target slots)
        this.placed = [null, null, null, null, null];

        // Currently held fragment (picked up from source)
        this.held = null;

        // Navigation
        this.cursorArea = 'source'; // 'source' or 'target'
        this.cursorIndex = 0;

        // Attempts tracking
        this.attempts = 0;
        this.showHints = false;
        this.nextCorrectIndex = 0; // Index in correct order to hint

        // Result state
        this.result = null; // null, 'correct', 'incorrect'
        this.resultTimer = 0;

        // Completion callback
        this.onComplete = null;
    }

    /**
     * Start the puzzle.
     * @param {Function} onComplete - Called when puzzle is solved
     */
    start(onComplete) {
        this.active = true;
        this.onComplete = onComplete;

        // Shuffle fragments
        this.shuffled = [...this.fragments];
        for (let i = this.shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffled[i], this.shuffled[j]] = [this.shuffled[j], this.shuffled[i]];
        }

        // Reset state
        this.placed = [null, null, null, null, null];
        this.held = null;
        this.cursorArea = 'source';
        this.cursorIndex = 0;
        this.attempts = 0;
        this.showHints = false;
        this.nextCorrectIndex = 0;
        this.result = null;
        this.resultTimer = 0;
    }

    /**
     * Update puzzle input.
     * @param {InputHandler} input
     * @param {number} deltaTime
     * @returns {string|null} 'solved' when puzzle is complete
     */
    update(input, deltaTime) {
        if (!this.active) return null;

        // Handle result display
        if (this.result !== null) {
            this.resultTimer -= deltaTime;
            if (this.resultTimer <= 0 || input.wasPressed(' ') || input.wasPressed('Enter')) {
                if (this.result === 'correct') {
                    this.active = false;
                    if (this.onComplete) this.onComplete();
                    return 'solved';
                }
                this.result = null;
            }
            return null;
        }

        // Navigation
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            if (this.cursorArea === 'target') {
                this.cursorArea = 'source';
                this.cursorIndex = Math.min(this.cursorIndex, this._availableSourceCount() - 1);
                if (this.cursorIndex < 0) this.cursorIndex = 0;
            }
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            if (this.cursorArea === 'source') {
                this.cursorArea = 'target';
                this.cursorIndex = Math.min(this.cursorIndex, 4);
            }
        }
        if (input.wasPressed('ArrowLeft') || input.wasPressed('a') || input.wasPressed('A')) {
            this.cursorIndex = Math.max(0, this.cursorIndex - 1);
        }
        if (input.wasPressed('ArrowRight') || input.wasPressed('d') || input.wasPressed('D')) {
            const maxIndex = this.cursorArea === 'source' ? this._availableSourceCount() - 1 : 4;
            this.cursorIndex = Math.min(maxIndex, this.cursorIndex + 1);
        }

        // Select / place
        if (input.wasPressed(' ') || input.wasPressed('Enter')) {
            this._handleSelect();
        }

        // Escape to cancel held fragment
        if (input.wasPressed('Escape')) {
            if (this.held !== null) {
                // Return held fragment to source
                this.shuffled.push(this.held);
                this.held = null;
            }
        }

        return null;
    }

    /**
     * Handle selecting a fragment or placing it.
     */
    _handleSelect() {
        if (this.cursorArea === 'source') {
            // Pick up a fragment from source
            const available = this.shuffled.filter(f => f !== null);
            if (this.held === null && available.length > 0) {
                const idx = Math.min(this.cursorIndex, available.length - 1);
                this.held = available[idx];
                this.shuffled = this.shuffled.filter(f => f !== this.held);
            } else if (this.held !== null) {
                // Swap with source item
                const available2 = this.shuffled.filter(f => f !== null);
                if (available2.length > 0 && this.cursorIndex < available2.length) {
                    const swap = available2[this.cursorIndex];
                    const swapIdx = this.shuffled.indexOf(swap);
                    this.shuffled[swapIdx] = this.held;
                    this.held = swap;
                }
            }
        } else if (this.cursorArea === 'target') {
            const slot = this.cursorIndex;
            if (this.held !== null) {
                // Place into target slot
                if (this.placed[slot] !== null) {
                    // Swap with existing
                    const existing = this.placed[slot];
                    this.placed[slot] = this.held;
                    this.held = existing;
                } else {
                    this.placed[slot] = this.held;
                    this.held = null;
                }

                // Check if all slots are filled
                if (this.placed.every(p => p !== null)) {
                    this._checkSolution();
                }
            } else if (this.placed[slot] !== null) {
                // Pick up from target slot
                this.held = this.placed[slot];
                this.placed[slot] = null;
            }
        }
    }

    /**
     * Check if the placed fragments are in correct order.
     */
    _checkSolution() {
        const correct = this.placed.every((f, i) => f && f.id === i);

        if (correct) {
            this.result = 'correct';
            this.resultTimer = 3000;
        } else {
            this.attempts++;
            this.result = 'incorrect';
            this.resultTimer = 2500;

            // Enable hints after 2 wrong attempts
            if (this.attempts >= 2) {
                this.showHints = true;
                // Find the first incorrectly placed fragment
                for (let i = 0; i < 5; i++) {
                    if (!this.placed[i] || this.placed[i].id !== i) {
                        this.nextCorrectIndex = i;
                        break;
                    }
                }
            }

            // Return all placed fragments to source
            for (let i = 0; i < 5; i++) {
                if (this.placed[i] !== null) {
                    this.shuffled.push(this.placed[i]);
                    this.placed[i] = null;
                }
            }
        }
    }

    /**
     * Count available fragments in source.
     */
    _availableSourceCount() {
        return this.shuffled.length;
    }

    /**
     * Render the puzzle UI.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    render(ctx, canvas) {
        if (!this.active) return;

        const a = CONFIG.ACCESSIBILITY;
        const w = canvas.width;
        const h = canvas.height;

        // Background
        ctx.fillStyle = 'rgba(30, 25, 20, 0.95)';
        ctx.fillRect(0, 0, w, h);

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold 24px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Assemble the Nicene Creed', w / 2, 15);

        // Instructions
        ctx.fillStyle = '#cccccc';
        ctx.font = `14px ${a.fontFamily}`;
        ctx.fillText('Arrange the fragments in the correct order', w / 2, 45);

        // Source area (top) — Available fragments
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('Available Fragments:', 30, 75);

        const sourceY = 95;
        const fragW = w - 60;
        const fragH = 40;
        const gap = 5;

        for (let i = 0; i < this.shuffled.length; i++) {
            const frag = this.shuffled[i];
            const fy = sourceY + i * (fragH + gap);
            const isSelected = this.cursorArea === 'source' && this.cursorIndex === i;
            const isHinted = this.showHints && frag.id === this.nextCorrectIndex;

            // Fragment box
            ctx.fillStyle = isSelected ? 'rgba(74, 111, 165, 0.8)' : 'rgba(60, 50, 40, 0.8)';
            if (isHinted) ctx.fillStyle = 'rgba(74, 124, 89, 0.8)';
            ctx.fillRect(30, fy, fragW, fragH);

            // Border
            ctx.strokeStyle = isSelected ? '#ffffff' : (isHinted ? '#4a7c59' : '#8b7355');
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(30, fy, fragW, fragH);

            // Text
            ctx.fillStyle = isSelected ? '#ffffff' : '#e8d8c0';
            ctx.font = `${isSelected ? 'bold ' : ''}${a.fontSize}px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const arrow = isSelected ? '\u25B6 ' : '  ';
            ctx.fillText(arrow + frag.text, 40, fy + fragH / 2);

            // Hint label
            if (isHinted) {
                ctx.fillStyle = '#4a7c59';
                ctx.font = `bold 11px ${a.fontFamily}`;
                ctx.textAlign = 'right';
                ctx.fillText('HINT: This goes first!', 30 + fragW - 10, fy + fragH / 2);
            }
        }

        // Held fragment indicator
        if (this.held) {
            const heldY = sourceY + this.shuffled.length * (fragH + gap) + 10;
            ctx.fillStyle = '#ffd700';
            ctx.font = `bold 14px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.fillText('Holding: ' + this.held.text, 30, heldY);
        }

        // Target area (bottom) — Placement slots
        const targetStartY = h - 260;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('Creed Order (place fragments here):', 30, targetStartY - 25);

        for (let i = 0; i < 5; i++) {
            const ty = targetStartY + i * (fragH + gap);
            const isSelected = this.cursorArea === 'target' && this.cursorIndex === i;
            const frag = this.placed[i];

            // Slot number
            ctx.fillStyle = '#888888';
            ctx.font = `bold 14px ${a.fontFamily}`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${i + 1}.`, 50, ty + fragH / 2);

            // Slot box
            if (frag) {
                ctx.fillStyle = isSelected ? 'rgba(74, 111, 165, 0.8)' : 'rgba(80, 70, 50, 0.8)';
            } else {
                ctx.fillStyle = isSelected ? 'rgba(60, 60, 80, 0.6)' : 'rgba(40, 35, 30, 0.5)';
            }
            ctx.fillRect(55, ty, fragW - 25, fragH);

            // Border
            ctx.strokeStyle = isSelected ? '#ffffff' : '#555555';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(55, ty, fragW - 25, fragH);

            // Content
            ctx.textAlign = 'left';
            if (frag) {
                ctx.fillStyle = '#e8d8c0';
                ctx.font = `${a.fontSize}px ${a.fontFamily}`;
                ctx.fillText(frag.text, 65, ty + fragH / 2);
            } else {
                ctx.fillStyle = '#666666';
                ctx.font = `14px ${a.fontFamily}`;
                ctx.fillText('(empty slot)', 65, ty + fragH / 2);
            }
        }

        // Teaching text for selected fragment
        const selectedFrag = this._getSelectedFragment();
        if (selectedFrag) {
            ctx.fillStyle = '#aaaacc';
            ctx.font = `13px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(selectedFrag.teaching, w / 2, h - 15);
        }

        // Controls hint
        ctx.fillStyle = '#888888';
        ctx.font = `12px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Arrows to navigate | SPACE to pick/place | ESC to drop', w / 2, h - 2);

        // Result overlay
        if (this.result !== null) {
            this._renderResult(ctx, w, h, a);
        }
    }

    /**
     * Get the currently selected fragment (for teaching text).
     */
    _getSelectedFragment() {
        if (this.held) return this.held;
        if (this.cursorArea === 'source' && this.cursorIndex < this.shuffled.length) {
            return this.shuffled[this.cursorIndex];
        }
        if (this.cursorArea === 'target' && this.placed[this.cursorIndex]) {
            return this.placed[this.cursorIndex];
        }
        return null;
    }

    /**
     * Render the result overlay (correct/incorrect).
     */
    _renderResult(ctx, w, h, a) {
        const isCorrect = this.result === 'correct';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        const boxW = 500;
        const boxH = 180;
        const boxX = w / 2 - boxW / 2;
        const boxY = h / 2 - boxH / 2;

        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = isCorrect ? CONFIG.COLORS.success : CONFIG.COLORS.warning;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isCorrect) {
            ctx.fillStyle = CONFIG.COLORS.success;
            ctx.font = `bold 28px ${a.fontFamily}`;
            ctx.fillText('Correct!', w / 2, boxY + 20);

            ctx.fillStyle = a.textColor;
            ctx.font = `18px ${a.fontFamily}`;
            ctx.fillText('You assembled the Nicene Creed!', w / 2, boxY + 65);
            ctx.fillText('The path to the Debate Hall is now open.', w / 2, boxY + 95);
        } else {
            ctx.fillStyle = CONFIG.COLORS.warning;
            ctx.font = `bold 28px ${a.fontFamily}`;
            ctx.fillText('Not quite!', w / 2, boxY + 20);

            ctx.fillStyle = a.textColor;
            ctx.font = `18px ${a.fontFamily}`;
            ctx.fillText('Try again! Think about the order', w / 2, boxY + 65);
            ctx.fillText('of the creed\'s statements.', w / 2, boxY + 90);

            if (this.attempts >= 2) {
                ctx.fillStyle = CONFIG.COLORS.info;
                ctx.font = `14px ${a.fontFamily}`;
                ctx.fillText('Hint: Look for the highlighted fragment!', w / 2, boxY + 125);
            }
        }

        ctx.fillStyle = '#888888';
        ctx.font = `14px ${a.fontFamily}`;
        ctx.fillText('Press SPACE to continue', w / 2, boxY + boxH - 30);
    }
}

// Expose globally
window.PuzzleSystem = PuzzleSystem;
