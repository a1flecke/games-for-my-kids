/**
 * tutorial.js — Guided first-creature experience, hint arrows.
 * Walks the player through creating their first creature step by step.
 * Tutorial state saved in localStorage (via SaveManager) — never repeats.
 *
 * Steps:
 *   1. "Pick a body!" → torso tab highlights + bounces
 *   2. User taps → torso appears with celebration sparkles
 *   3. "Now pick a head!" → head tab highlights
 *   4. User taps → head snaps to attachment with happy sound
 *   5. "Add some legs!" → legs tab
 *   6. After 3 parts placed → "Great job! Add anything you want!" → free mode
 */

class TutorialManager {
    constructor() {
        this._active = false;
        this._step = 0;
        this._bounceTimer = null;
        this._completionTimer = null;
        this._highlightEl = null;

        // Speech bubble state
        this._speechBubble = null; // { text, alpha }

        // Allowed category during tutorial (null = allow all)
        this._allowedCategory = null;

        // Bounce phase for animation
        this._bouncePhase = 0;
    }

    /**
     * Check if tutorial should run (first creature ever).
     */
    shouldRun() {
        const data = window.saveManager.load();
        return !data.tutorialComplete;
    }

    /**
     * Start the tutorial sequence.
     */
    start() {
        if (!this.shouldRun()) return;
        this.cancel(); // defensive reset on re-entry
        this._active = true;
        this._step = 0;
        this._bouncePhase = 0;
        this._advanceStep();
    }

    /**
     * Cancel and cleanup.
     */
    cancel() {
        clearTimeout(this._bounceTimer);
        this._bounceTimer = null;
        clearTimeout(this._completionTimer);
        this._completionTimer = null;
        this._active = false;
        this._step = 0;
        this._speechBubble = null;
        this._allowedCategory = null;
        this._clearHighlight();
    }

    /**
     * Complete the tutorial.
     */
    complete() {
        const cb = null; // no callback needed
        this._clearHighlight();
        this._allowedCategory = null;

        // Save tutorialComplete
        const data = window.saveManager.load();
        data.tutorialComplete = true;
        window.saveManager.save(data);

        // Show completion message
        this._speechBubble = { text: 'Great job! Add anything you want!', alpha: 0 };

        // Dismiss after 2s
        clearTimeout(this._completionTimer);
        this._completionTimer = setTimeout(() => {
            this._speechBubble = null;
            this._active = false;
            this._completionTimer = null;
        }, 2000);
    }

    /**
     * Notify tutorial that a part was placed.
     */
    onPartPlaced(slot) {
        if (!this._active) return;

        const steps = this._getSteps();
        // Check if placed part matches expected category
        if (this._step < steps.length && slot === steps[this._step].category) {
            this._step++;
            if (this._step >= steps.length) {
                this.complete();
                return;
            }
            this._advanceStep();
        }
    }

    /**
     * Whether the tutorial is currently active.
     */
    isActive() {
        return this._active;
    }

    /**
     * Check if a category tab is allowed during tutorial.
     * Returns true if tutorial is not active or category matches allowed.
     */
    isCategoryAllowed(category) {
        if (!this._active) return true;
        if (this._allowedCategory === null) return true;
        return category === this._allowedCategory;
    }

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        if (!this._active) return;

        // Advance bounce phase
        this._bouncePhase += dt;

        // Fade in speech bubble
        if (this._speechBubble && this._speechBubble.alpha < 1) {
            this._speechBubble.alpha = Math.min(1, this._speechBubble.alpha + dt / 300);
        }
    }

    /**
     * Draw speech bubble on the creator canvas.
     */
    draw(ctx, w, h) {
        if (!this._speechBubble) return;

        const text = this._speechBubble.text;
        const alpha = this._speechBubble.alpha;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Bubble position: top center of canvas
        const bx = w / 2;
        const by = 40;

        // Measure text
        ctx.font = "bold 18px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(text);
        const textW = metrics.width;
        const padX = 20;
        const padY = 14;
        const bubbleW = textW + padX * 2;
        const bubbleH = 36 + padY;
        const bubbleX = bx - bubbleW / 2;
        const bubbleY = by;
        const tailSize = 10;
        const r = 14;

        // Rounded rect background
        ctx.fillStyle = '#FFFAF5';
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(bubbleX + r, bubbleY);
        ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
        ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
        ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);

        // Tail pointing down
        ctx.lineTo(bx + tailSize, bubbleY + bubbleH);
        ctx.lineTo(bx, bubbleY + bubbleH + tailSize);
        ctx.lineTo(bx - tailSize, bubbleY + bubbleH);

        ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
        ctx.lineTo(bubbleX, bubbleY + r);
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#FF69B4';
        ctx.fillText(text, bx, bubbleY + bubbleH / 2);

        ctx.restore();
    }

    // ── Private ──────────────────────────────────────────

    /**
     * Get tutorial step definitions.
     */
    _getSteps() {
        return [
            { category: 'torso', msg: 'Pick a body!' },
            { category: 'head', msg: 'Now pick a head!' },
            { category: 'legs', msg: 'Add some legs!' }
        ];
    }

    /**
     * Advance to the current tutorial step.
     */
    _advanceStep() {
        this._clearHighlight();

        const steps = this._getSteps();
        if (this._step >= steps.length) {
            this.complete();
            return;
        }

        const step = steps[this._step];
        this._allowedCategory = step.category;
        this._speechBubble = { text: step.msg, alpha: 0 };

        // Highlight the target tab, dim others
        const tabs = document.querySelectorAll('#creator-tabs .tab');
        for (const tab of tabs) {
            const cat = tab.getAttribute('data-category');
            if (cat === step.category) {
                tab.classList.add('tab-highlight');
            } else {
                tab.classList.add('tab-dimmed');
                tab.disabled = true;
            }
        }

        // Auto-click the target tab to populate strip
        const targetTab = document.querySelector(`#creator-tabs .tab[data-category="${step.category}"]`);
        if (targetTab) {
            targetTab.click();
        }

        // Screen reader announcement
        window.uiManager.announce(step.msg);
    }

    /**
     * Remove all highlight/dim states from tabs.
     */
    _clearHighlight() {
        const tabs = document.querySelectorAll('#creator-tabs .tab');
        for (const tab of tabs) {
            tab.classList.remove('tab-highlight');
            tab.classList.remove('tab-dimmed');
            tab.disabled = false;
        }
    }
}
