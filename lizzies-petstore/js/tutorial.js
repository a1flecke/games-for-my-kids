/**
 * tutorial.js — Guided first-creature experience, hint arrows.
 * Walks the player through creating their first creature step by step.
 * Tutorial state saved in localStorage (via SaveManager) — never repeats.
 *
 * Steps:
 *   1. "Pick a body!" → body tab highlights + bounces
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
        this._highlightEl = null;
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
        this._active = true;
        this._step = 0;
        this._advanceStep();
    }

    /**
     * Cancel and cleanup.
     */
    cancel() {
        clearTimeout(this._bounceTimer);
        this._bounceTimer = null;
        this._active = false;
        this._step = 0;
        this._clearHighlight();
    }

    /**
     * Complete the tutorial.
     */
    complete() {
        this.cancel();
        const data = window.saveManager.load();
        data.tutorialComplete = true;
        window.saveManager.save(data);
    }

    /**
     * Notify tutorial that a part was placed.
     */
    onPartPlaced(category) {
        if (!this._active) return;
        this._step++;
        if (this._step >= 3) {
            // After 3 parts, free mode
            this.complete();
            return;
        }
        this._advanceStep();
    }

    /**
     * Whether the tutorial is currently active.
     */
    isActive() {
        return this._active;
    }

    /**
     * Advance to the next tutorial step.
     */
    _advanceStep() {
        this._clearHighlight();
        const steps = ['torso', 'head', 'legs'];
        if (this._step >= steps.length) {
            this.complete();
            return;
        }
        // Highlight the target tab — will show bouncing arrow in Session 4
    }

    _clearHighlight() {
        // Remove any highlight/bounce indicators
    }
}
