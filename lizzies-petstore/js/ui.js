/**
 * ui.js — Pointer event framework, modals, coordinate conversion.
 * Handles all touch/mouse input via Pointer Events (not touch events).
 */

class UIManager {
    constructor() {
        this._dragState = null;
        this._longPressTimer = null;
        this._longPressMs = 300;
        this._focusTrapHandlers = new Map(); // overlayId -> handler
    }

    /**
     * Convert pointer event coordinates to canvas-local coordinates (DPR-aware).
     */
    canvasCoords(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    /**
     * Hit-test a point against a bounding box.
     * Box: { x, y, w, h } in canvas coordinates.
     */
    hitTest(point, box) {
        return point.x >= box.x && point.x <= box.x + box.w &&
               point.y >= box.y && point.y <= box.y + box.h;
    }

    /**
     * Register pointer event handlers on a canvas.
     * Callbacks: { onTap, onDragStart, onDragMove, onDragEnd, onLongPress }
     * All callbacks receive { x, y } in canvas coordinates.
     */
    bindCanvas(canvasId, callbacks) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        let startPos = null;
        let startTime = 0;
        let isDragging = false;
        const TAP_THRESHOLD = 10; // px movement tolerance for tap

        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);

            const pos = this.canvasCoords(e, canvas);
            startPos = pos;
            startTime = performance.now();
            isDragging = false;

            // Long-press detection
            clearTimeout(this._longPressTimer);
            if (callbacks.onLongPress) {
                this._longPressTimer = setTimeout(() => {
                    if (startPos && !isDragging) {
                        callbacks.onLongPress(pos);
                        startPos = null; // consume — prevent tap
                    }
                }, this._longPressMs);
            }

            if (callbacks.onDragStart) {
                callbacks.onDragStart(pos);
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!startPos) return;
            e.preventDefault();

            const pos = this.canvasCoords(e, canvas);
            const dx = pos.x - startPos.x;
            const dy = pos.y - startPos.y;

            if (!isDragging && Math.sqrt(dx * dx + dy * dy) > TAP_THRESHOLD) {
                isDragging = true;
                clearTimeout(this._longPressTimer);
            }

            if (isDragging && callbacks.onDragMove) {
                callbacks.onDragMove(pos);
            }
        });

        const onUp = (e) => {
            if (!startPos && !isDragging) return;
            e.preventDefault();

            clearTimeout(this._longPressTimer);

            const pos = this.canvasCoords(e, canvas);

            if (isDragging) {
                if (callbacks.onDragEnd) callbacks.onDragEnd(pos);
            } else if (startPos) {
                // Tap (not consumed by long-press)
                if (callbacks.onTap) callbacks.onTap(pos);
            }

            startPos = null;
            isDragging = false;
        };

        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
    }

    /**
     * Show a modal overlay with focus trap.
     */
    showOverlay(overlayId, triggerEl) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        // Store trigger for focus-return
        overlay._triggerEl = triggerEl || document.activeElement;

        // Focus the close button (first focusable element)
        const closeBtn = overlay.querySelector('.btn-close');
        if (closeBtn) closeBtn.focus();

        // Set up focus trap + Escape handler
        this._setupFocusTrap(overlay);
    }

    /**
     * Hide a modal overlay and return focus to trigger.
     */
    hideOverlay(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        // Remove focus trap handler
        const handler = this._focusTrapHandlers.get(overlayId);
        if (handler) {
            overlay.removeEventListener('keydown', handler);
            this._focusTrapHandlers.delete(overlayId);
        }

        // Return focus to trigger
        if (overlay._triggerEl && overlay._triggerEl.focus) {
            overlay._triggerEl.focus();
        }
        overlay._triggerEl = null;
    }

    /**
     * Set up focus trap and Escape-to-close for an overlay.
     */
    _setupFocusTrap(overlay) {
        // Remove old handler if any
        const oldHandler = this._focusTrapHandlers.get(overlay.id);
        if (oldHandler) {
            overlay.removeEventListener('keydown', oldHandler);
        }

        const handler = (e) => {
            // Escape guard: check overlay is still open
            if (!overlay.classList.contains('open')) {
                overlay.removeEventListener('keydown', handler);
                this._focusTrapHandlers.delete(overlay.id);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideOverlay(overlay.id);
                return;
            }

            if (e.key === 'Tab') {
                const focusable = overlay.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        this._focusTrapHandlers.set(overlay.id, handler);
        overlay.addEventListener('keydown', handler);
    }

    /**
     * Announce a message to screen readers via the live region.
     */
    announce(message) {
        const el = document.getElementById('sr-announcer');
        if (el) el.textContent = message;
    }

    /**
     * HTML-escape a string for safe innerHTML interpolation.
     */
    escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
