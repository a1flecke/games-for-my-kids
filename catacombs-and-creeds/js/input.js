/**
 * InputHandler - Centralized input manager (decoupled from Player)
 *
 * Tracks held keys (isDown) for continuous actions like movement,
 * and just-pressed keys (wasPressed) for one-shot actions like menu
 * navigation and interact.
 *
 * Session 14: Added touch control support for iPad with virtual D-pad
 * and action buttons. Touch and keyboard inputs merge transparently.
 */
class InputHandler {
    constructor() {
        this.keysDown = {};
        this.justPressed = {};

        // Separate touch-held keys so keyboard and touch don't interfere
        this.touchKeysDown = {};

        // Game keys to prevent default browser behavior
        this.gameKeys = new Set([
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'w', 'W', 's', 'S', 'a', 'A', 'd', 'D',
            ' ', 'Escape', 'i', 'I', 'Enter', 'e', 'E',
            't', 'T', 'm', 'M', '1', '2', '3', '4', '5', '6'
        ]);

        // Touch control state
        this.isTouchDevice = false;
        this.canvas = null;
        this.touchButtonFeedback = {}; // label -> remaining frames for visual press feedback

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    /**
     * Attach canvas for touch controls. Call after canvas is set up.
     * @param {HTMLCanvasElement} canvas
     */
    attachCanvas(canvas) {
        this.canvas = canvas;
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        if (this.isTouchDevice) {
            canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
            canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
            canvas.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
        }
    }

    /**
     * Get touch control layout in canvas coordinates.
     * Returns button definitions with center (cx, cy), radius, mapped key, and label.
     */
    getTouchLayout() {
        if (!this.canvas) return null;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        return {
            // Virtual D-pad (left side)
            dpad: { cx: 90, cy: ch - 110, radius: 52 },

            // Action buttons (right side)
            btnA: { cx: cw - 90, cy: ch - 120, radius: 30, key: ' ', label: 'ACT' },
            btnB: { cx: cw - 30, cy: ch - 120, radius: 22, key: 'Escape', label: 'ESC' },
            btnI: { cx: cw - 30, cy: ch - 60, radius: 18, key: 'i', label: 'INV' },
        };
    }

    // ── Keyboard handlers ──────────────────────────────────────────

    onKeyDown(e) {
        if (this.gameKeys.has(e.key)) {
            e.preventDefault();
        }

        // Only mark justPressed on initial press, not repeat
        if (!this.keysDown[e.key]) {
            this.justPressed[e.key] = true;
        }
        this.keysDown[e.key] = true;
    }

    onKeyUp(e) {
        this.keysDown[e.key] = false;
    }

    // ── Touch handlers ─────────────────────────────────────────────

    /** Convert touch client coordinates to canvas coordinates */
    _touchToCanvas(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    _onTouchStart(e) {
        e.preventDefault();
        const layout = this.getTouchLayout();
        if (!layout) return;

        // Check action buttons for new touches (fire justPressed)
        for (const touch of e.changedTouches) {
            const pos = this._touchToCanvas(touch);
            let hitButton = false;
            const buttons = [layout.btnA, layout.btnB, layout.btnI];
            for (const btn of buttons) {
                const dx = pos.x - btn.cx;
                const dy = pos.y - btn.cy;
                const hitRadius = btn.radius + 10; // Extra hit area for accessibility
                if (dx * dx + dy * dy <= hitRadius * hitRadius) {
                    this.justPressed[btn.key] = true;
                    this.touchButtonFeedback[btn.label] = 8; // frames of visual feedback
                    hitButton = true;
                }
            }

            // Check D-pad hit
            const dpadDx = pos.x - layout.dpad.cx;
            const dpadDy = pos.y - layout.dpad.cy;
            const dpadDist = Math.sqrt(dpadDx * dpadDx + dpadDy * dpadDy);
            const hitDpad = dpadDist <= layout.dpad.radius * 1.4;

            // Tap-to-interact: tapping game world (not controls) triggers SPACE
            if (!hitButton && !hitDpad) {
                this.justPressed[' '] = true;
            }
        }

        // Rebuild D-pad from all active touches
        this._rebuildDpad(e.touches, layout);
    }

    _onTouchMove(e) {
        e.preventDefault();
        const layout = this.getTouchLayout();
        if (!layout) return;
        this._rebuildDpad(e.touches, layout);
    }

    _onTouchEnd(e) {
        e.preventDefault();
        const layout = this.getTouchLayout();
        if (!layout) return;
        this._rebuildDpad(e.touches, layout);
    }

    /** Rebuild D-pad direction state from all active touches */
    _rebuildDpad(touchList, layout) {
        // Clear touch-held direction keys
        this.touchKeysDown = {};

        const dpad = layout.dpad;
        for (const touch of touchList) {
            const pos = this._touchToCanvas(touch);
            const dx = pos.x - dpad.cx;
            const dy = pos.y - dpad.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Allow touch slightly outside the visual circle
            if (dist <= dpad.radius * 1.4 && dist > 8) {
                const angle = Math.atan2(dy, dx);

                // Up: angle between -135deg and -45deg
                if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) {
                    this.touchKeysDown['ArrowUp'] = true;
                }
                // Down: angle between 45deg and 135deg
                if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
                    this.touchKeysDown['ArrowDown'] = true;
                }
                // Left: angle outside -112.5deg to 112.5deg
                if (angle > Math.PI * 0.625 || angle < -Math.PI * 0.625) {
                    this.touchKeysDown['ArrowLeft'] = true;
                }
                // Right: angle between -67.5deg and 67.5deg
                if (angle > -Math.PI * 0.375 && angle < Math.PI * 0.375) {
                    this.touchKeysDown['ArrowRight'] = true;
                }
            }
        }
    }

    // ── Public API ─────────────────────────────────────────────────

    /** Returns true while key is held (keyboard OR touch D-pad) */
    isDown(key) {
        return this.keysDown[key] === true || this.touchKeysDown[key] === true;
    }

    /** Returns true only on the frame the key went down (keyboard OR touch button) */
    wasPressed(key) {
        return this.justPressed[key] === true;
    }

    /** Call at END of each game loop frame to clear justPressed state */
    update() {
        this.justPressed = {};

        // Decrement touch button visual feedback timers
        for (const label in this.touchButtonFeedback) {
            this.touchButtonFeedback[label]--;
            if (this.touchButtonFeedback[label] <= 0) {
                delete this.touchButtonFeedback[label];
            }
        }
    }
}
