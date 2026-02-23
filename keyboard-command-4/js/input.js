/**
 * Keyboard Command 4 — InputManager
 * Keyboard interception, modifier routing, combo normalization, fire lock.
 * Only intercepts keys during GAMEPLAY state; menus use normal browser keys.
 */

class InputManager {
    constructor() {
        this._enabled = false;
        this._inputLocked = false;
        this._lockTimer = null;

        // Callbacks — set by game.js
        this.onShortcutAttempt = null;  // { keys: "cmd+c", raw: KeyboardEvent }
        this.onGameControl = null;      // { action: "escape"|"next-target"|... }

        // Bound handler for add/remove
        this._onKeyDown = this._handleKeyDown.bind(this);

        // Non-interceptable combos (OS-level, preventDefault has no effect)
        this._nonInterceptable = new Set([
            'cmd+tab', 'cmd+shift+tab', 'cmd+space', 'cmd+h'
        ]);

        // e.code → canonical key name mapping
        this._codeMap = {
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'Backspace': 'delete',
            'Space': 'space',
            'BracketLeft': '[',
            'BracketRight': ']',
            'Comma': ',',
            'Period': '.',
            'Semicolon': ';'
        };
    }

    /**
     * Activate interception — call when entering GAMEPLAY state.
     */
    enable() {
        if (this._enabled) return;
        this._enabled = true;
        document.addEventListener('keydown', this._onKeyDown);
    }

    /**
     * Deactivate interception — call when leaving GAMEPLAY state.
     */
    disable() {
        if (!this._enabled) return;
        this._enabled = false;
        document.removeEventListener('keydown', this._onKeyDown);
    }

    /**
     * Clear lock timer and reset all state.
     */
    cancel() {
        clearTimeout(this._lockTimer);
        this._lockTimer = null;
        this._inputLocked = false;
        this.onShortcutAttempt = null;
        this.onGameControl = null;
    }

    /**
     * Lock input for 700ms after weapon fire.
     * Tab target cycling still works while locked.
     */
    lock() {
        this._inputLocked = true;
        clearTimeout(this._lockTimer);
        this._lockTimer = setTimeout(() => {
            this._inputLocked = false;
            this._lockTimer = null;
        }, 700);
    }

    /**
     * Check if a combo string is non-interceptable.
     */
    isNonInterceptable(combo) {
        return this._nonInterceptable.has(combo);
    }

    // =============================================================
    // Internal — Key Handling
    // =============================================================

    _handleKeyDown(e) {
        if (!this._enabled) return;

        // 1. Escape → pause (always allowed, even when locked)
        if (e.key === 'Escape') {
            e.preventDefault();
            if (this.onGameControl) this.onGameControl({ action: 'escape' });
            return;
        }

        // 2. Tab → target cycling (allowed even when input-locked)
        if (e.key === 'Tab') {
            e.preventDefault();
            if (this.onGameControl) {
                this.onGameControl({ action: e.shiftKey ? 'prev-target' : 'next-target' });
            }
            return;
        }

        // 3. Bare H (no modifiers) → journal
        if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            if (this.onGameControl) this.onGameControl({ action: 'journal' });
            return;
        }

        // 4. Bare Space (no modifiers) → advance dialogue / generic action
        if (e.key === ' ' && !e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            if (this.onGameControl) this.onGameControl({ action: 'space' });
            return;
        }

        // 4b. Bare ? (shift+/ on most keyboards) → scan/reveal targeted monster
        if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !e.metaKey && !e.altKey && !e.ctrlKey) {
            e.preventDefault();
            if (this.onGameControl) this.onGameControl({ action: 'scan' });
            return;
        }

        // 5. Bare digit 1-0 (no meta/alt/ctrl) → weapon select
        if (!e.metaKey && !e.altKey && !e.ctrlKey && /^[0-9]$/.test(e.key)) {
            e.preventDefault();
            if (this.onGameControl) this.onGameControl({ action: 'weapon' + e.key });
            return;
        }

        // 6. Modifier key held → shortcut attempt
        if (e.metaKey || e.altKey || e.ctrlKey) {
            e.preventDefault();

            // Ignore if input is locked (fire animation in progress)
            if (this._inputLocked) return;

            const combo = this._buildCombo(e);
            if (this.onShortcutAttempt) {
                this.onShortcutAttempt({ keys: combo, raw: e });
            }
            return;
        }

        // 7. Otherwise → ignore (do NOT blanket-prevent)
    }

    /**
     * Normalize a KeyboardEvent into a canonical combo string.
     * Order: ctrl+cmd+option+shift+key (all lowercase).
     * Uses e.code for the base key to avoid Option+letter giving special chars.
     */
    _buildCombo(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('cmd');
        if (e.altKey) parts.push('option');
        // Only include shift if it's not a standalone modifier press
        // and the key itself isn't Shift
        if (e.shiftKey && e.key !== 'Shift') parts.push('shift');

        // Determine the base key from e.code
        let key = this._resolveKey(e);
        if (key) parts.push(key);

        return parts.join('+');
    }

    /**
     * Resolve the base key from the event, using e.code for letter/digit keys
     * and the _codeMap for special keys.
     */
    _resolveKey(e) {
        const code = e.code;

        // Modifier-only press (e.g. just Meta or Alt) — no base key
        if (['MetaLeft', 'MetaRight', 'AltLeft', 'AltRight',
             'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
            return '';
        }

        // Check code map for special keys (Arrow, Backspace, Space, brackets, etc.)
        if (this._codeMap[code]) {
            return this._codeMap[code];
        }

        // Letter keys: KeyA → a, KeyB → b, etc.
        if (code.startsWith('Key')) {
            return code.slice(3).toLowerCase();
        }

        // Digit keys: Digit1 → 1, Digit0 → 0
        if (code.startsWith('Digit')) {
            return code.slice(5);
        }

        // Numpad digits
        if (code.startsWith('Numpad') && code.length === 7) {
            return code.slice(6);
        }

        // Tab key
        if (code === 'Tab') return 'tab';

        // Forward Delete key (Fn+Backspace on Mac)
        if (code === 'Delete') return 'delete';

        // Fallback: use e.key lowercased
        return e.key.toLowerCase();
    }
}
