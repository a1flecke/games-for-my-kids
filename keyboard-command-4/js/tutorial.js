/**
 * Keyboard Command 4 — TutorialManager, HintManager, JournalManager
 * Tutorial dialogue with Commander Byte, per-monster hint tracking,
 * and shortcut journal overlay with category tabs.
 */

// =============================================================
// TutorialManager — Commander Byte dialogue box
// =============================================================

class TutorialManager {
    constructor() {
        this._dialogueEl = null;
        this._textEl = null;
        this._steps = [];
        this._currentStep = 0;
        this._typeTimer = null;
        this._autoAdvanceTimer = null;
        this._charIndex = 0;
        this._currentText = '';
        this._active = false;

        this.onStepComplete = null;
        this.onTutorialComplete = null;
    }

    init() {
        this._dialogueEl = document.getElementById('tutorial-dialogue');
        this._textEl = document.getElementById('tutorial-text');
    }

    /**
     * Start a tutorial sequence.
     * @param {Array} steps — [{message, pauseGameplay, waitForAction}]
     * @param {Function} onComplete — called when all steps done
     */
    start(steps, onComplete) {
        this.cancel();
        if (!steps || !steps.length) return;

        this._steps = steps;
        this._currentStep = 0;
        this._active = true;
        this.onTutorialComplete = onComplete || null;

        this._showStep(0);
    }

    /**
     * Advance to next step. Called on Space keypress.
     */
    advance() {
        if (!this._active) return;

        // If typewriter still running, complete it immediately
        if (this._typeTimer) {
            clearTimeout(this._typeTimer);
            this._typeTimer = null;
            if (this._textEl) this._textEl.textContent = this._currentText;
            // Start auto-advance timer
            this._startAutoAdvance();
            return;
        }

        // Move to next step
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;

        this._currentStep++;
        if (this._currentStep >= this._steps.length) {
            const cb = this.onTutorialComplete;
            this.cancel();
            if (cb) cb();
            return;
        }

        this._showStep(this._currentStep);
    }

    get active() {
        return this._active;
    }

    _showStep(index) {
        const step = this._steps[index];
        if (!step) return;

        this._currentText = step.message;
        this._charIndex = 0;

        if (this._dialogueEl) {
            this._dialogueEl.classList.add('active');
            this._dialogueEl.setAttribute('aria-hidden', 'false');
        }
        if (this._textEl) this._textEl.textContent = '';

        if (this.onStepComplete) this.onStepComplete(step);

        // Start typewriter
        this._typeNext();
    }

    _typeNext() {
        if (this._charIndex >= this._currentText.length) {
            this._typeTimer = null;
            this._startAutoAdvance();
            return;
        }

        if (this._textEl) {
            this._textEl.textContent = this._currentText.slice(0, this._charIndex + 1);
        }
        this._charIndex++;

        this._typeTimer = setTimeout(() => this._typeNext(), 40);
    }

    _startAutoAdvance() {
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = setTimeout(() => {
            this._autoAdvanceTimer = null;
            this.advance();
        }, 3000);
    }

    cancel() {
        clearTimeout(this._typeTimer);
        this._typeTimer = null;
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;
        this._active = false;
        this._steps = [];
        this._currentStep = 0;
        this.onStepComplete = null;
        this.onTutorialComplete = null;

        if (this._dialogueEl) {
            this._dialogueEl.classList.remove('active');
            this._dialogueEl.setAttribute('aria-hidden', 'true');
        }
    }
}

// =============================================================
// HintManager — per-monster wrong attempt tracking
// =============================================================

class HintManager {
    constructor() {
        this._wrongAttempts = new Map();
        this._scanned = new Set();
    }

    /**
     * Record a wrong attempt for a monster.
     */
    recordWrong(monster) {
        if (!monster) return;
        const count = this._wrongAttempts.get(monster) || 0;
        this._wrongAttempts.set(monster, count + 1);
    }

    /**
     * Get hint level for a monster based on wrong attempts and settings.
     * @param {object} monster
     * @param {string} hintsSetting — 'always' | 'after3' | 'never'
     * @returns {'none'|'partial'|'full'}
     */
    getHintLevel(monster, hintsSetting) {
        if (!monster) return 'full';

        // Scanned monsters always show full
        if (this._scanned.has(monster)) return 'full';

        if (hintsSetting === 'always') return 'full';
        if (hintsSetting === 'never') return 'none';

        // 'after3' default
        const wrong = this._wrongAttempts.get(monster) || 0;
        if (wrong >= 5) return 'full';
        if (wrong >= 3) return 'partial';
        return 'none';
    }

    /**
     * Get partial hint text — first modifier key.
     */
    getPartialHint(shortcut) {
        if (!shortcut || !shortcut.combo) return '???';
        const parts = shortcut.combo.split('+');
        if (parts.length > 1) return parts[0].toUpperCase();
        return '???';
    }

    /**
     * Mark monster as fully revealed via ? scan.
     */
    handleScan(monster) {
        if (monster) this._scanned.add(monster);
    }

    /**
     * Reset tracking for a monster (on death).
     */
    resetForMonster(monster) {
        this._wrongAttempts.delete(monster);
        this._scanned.delete(monster);
    }

    /**
     * Clear all tracking (room/level transition).
     */
    clear() {
        this._wrongAttempts.clear();
        this._scanned.clear();
    }
}

// =============================================================
// JournalManager — shortcut journal overlay
// =============================================================

class JournalManager {
    constructor() {
        this._overlay = null;
        this._tabContainer = null;
        this._entryList = null;
        this._closeBtn = null;
        this._journalTrigger = null;
        this._isOpen = false;

        this._categories = [
            { id: 'basics', label: 'Basics' },
            { id: 'files', label: 'Files' },
            { id: 'text', label: 'Text' },
            { id: 'navigation', label: 'Nav' },
            { id: 'selection', label: 'Select' },
            { id: 'apps', label: 'Apps' },
            { id: 'browser', label: 'Browser' },
            { id: 'advanced', label: 'Advanced' }
        ];
        this._activeCategory = 'basics';
    }

    init() {
        this._overlay = document.getElementById('journal-overlay');
        this._tabContainer = document.getElementById('journal-tabs');
        this._entryList = document.getElementById('journal-entries');
        this._closeBtn = document.getElementById('journal-close');

        if (this._closeBtn) {
            this._closeBtn.addEventListener('click', () => this.close());
        }

        // Build tabs
        if (this._tabContainer) {
            this._tabContainer.textContent = '';
            for (const cat of this._categories) {
                const btn = document.createElement('button');
                btn.className = 'journal-tab';
                btn.textContent = cat.label;
                btn.setAttribute('data-category', cat.id);
                btn.setAttribute('aria-pressed', cat.id === this._activeCategory ? 'true' : 'false');
                btn.addEventListener('click', () => this._selectCategory(cat.id));
                this._tabContainer.appendChild(btn);
            }
        }

        // Focus trap + Escape
        if (this._overlay) {
            this._overlay.addEventListener('keydown', (e) => {
                if (!this._overlay.classList.contains('open')) return;

                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                    return;
                }

                if (e.key === 'Tab') {
                    this._trapFocus(e);
                }
            });
        }
    }

    /**
     * Open journal overlay.
     * @param {Element} triggerEl — element to return focus to on close
     * @param {object} journalEntries — from ShortcutManager.getJournalEntries()
     * @param {Array} allShortcuts — full shortcut database for unlearned entries
     */
    open(triggerEl, journalEntries, allShortcuts) {
        if (!this._overlay) return;
        if (this._isOpen) this.close();

        this._isOpen = true;
        this._journalTrigger = triggerEl || document.activeElement;
        this._journalEntries = journalEntries || {};
        this._allShortcuts = allShortcuts || [];

        this._overlay.classList.add('open');
        this._overlay.setAttribute('aria-hidden', 'false');

        this._selectCategory(this._activeCategory);

        if (this._closeBtn) this._closeBtn.focus();
    }

    close() {
        if (!this._overlay) return;
        if (!this._isOpen) return;

        this._isOpen = false;
        this._overlay.classList.remove('open');
        this._overlay.setAttribute('aria-hidden', 'true');

        // Return focus to trigger
        if (this._journalTrigger && this._journalTrigger.isConnected) {
            this._journalTrigger.focus();
        }
        this._journalTrigger = null;
    }

    get isOpen() {
        return this._isOpen;
    }

    _selectCategory(catId) {
        this._activeCategory = catId;

        // Update tab states
        if (this._tabContainer) {
            const tabs = this._tabContainer.querySelectorAll('.journal-tab');
            tabs.forEach(t => {
                t.setAttribute('aria-pressed', t.dataset.category === catId ? 'true' : 'false');
            });
        }

        this._renderEntries(catId);
    }

    _renderEntries(catId) {
        if (!this._entryList) return;
        this._entryList.textContent = '';

        const learned = this._journalEntries[catId] || [];
        const learnedIds = new Set(learned.map(s => s.id));

        // All shortcuts in this category
        const allInCat = this._allShortcuts.filter(s => s.category === catId);

        if (allInCat.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'journal-empty';
            empty.textContent = 'No shortcuts in this category yet.';
            this._entryList.appendChild(empty);
            return;
        }

        for (const s of allInCat) {
            const entry = document.createElement('div');
            entry.className = 'journal-entry';

            if (learnedIds.has(s.id)) {
                const keys = document.createElement('span');
                keys.className = 'journal-entry-keys';
                keys.textContent = s.display || s.combo;

                const action = document.createElement('span');
                action.className = 'journal-entry-action';
                action.textContent = s.action || s.description;

                entry.appendChild(keys);
                entry.appendChild(action);
            } else {
                entry.classList.add('journal-entry-locked');
                const unknown = document.createElement('span');
                unknown.className = 'journal-entry-keys';
                unknown.textContent = '???';

                const action = document.createElement('span');
                action.className = 'journal-entry-action';
                action.textContent = '???';

                entry.appendChild(unknown);
                entry.appendChild(action);
            }

            this._entryList.appendChild(entry);
        }
    }

    _trapFocus(e) {
        if (!this._overlay) return;
        const focusable = this._overlay.querySelectorAll(
            'button:not([disabled]):not(.hidden), [tabindex]:not([tabindex="-1"]):not(.hidden)'
        );
        if (!focusable.length) return;

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

    cancel() {
        if (this._isOpen) this.close();
    }
}
