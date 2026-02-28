/**
 * ui.js — Pointer event framework, modals, color palette, coordinate conversion.
 * Handles all touch/mouse input via Pointer Events (not touch events).
 */

class UIManager {
    constructor() {
        this._dragState = null;
        this._longPressTimer = null;
        this._longPressMs = 300;
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
     * Show a modal overlay with focus trap.
     */
    showOverlay(overlayId, triggerEl) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        // Store trigger for focus-return
        overlay._triggerEl = triggerEl;

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
        const handler = (e) => {
            // Escape guard: check overlay is still open
            if (!overlay.classList.contains('open')) {
                overlay.removeEventListener('keydown', handler);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideOverlay(overlay.id);
                overlay.removeEventListener('keydown', handler);
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
