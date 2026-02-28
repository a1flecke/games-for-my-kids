/**
 * Keyboard Command 4 — HudManager
 * DOM overlay elements positioned over the game canvas:
 * shortcut prompt box, combo counter, combo milestone, damage/heal vignettes,
 * low-HP pulse, boss taunt text.
 *
 * Updated only on value change — never in the RAF loop.
 */

class HudManager {
    constructor() {
        // DOM references (cached on first use)
        this._prompt = null;
        this._promptKeys = null;
        this._promptAction = null;
        this._promptPhysical = null;
        this._combo = null;
        this._milestone = null;
        this._damageVignette = null;
        this._healVignette = null;
        this._lowHpPulse = null;
        this._bossTaunt = null;

        // Timers
        this._milestoneTimer = null;
        this._damageTimer = null;
        this._healTimer = null;
        this._bossTauntTimer = null;
    }

    /**
     * Cache all DOM element references. Call once after DOM is ready.
     */
    init() {
        this._prompt = document.getElementById('shortcut-prompt');
        this._promptKeys = document.getElementById('prompt-keys');
        this._promptAction = document.getElementById('prompt-action');
        this._promptPhysical = document.getElementById('prompt-physical');
        this._combo = document.getElementById('combo-counter');
        this._milestone = document.getElementById('combo-milestone');
        this._damageVignette = document.getElementById('damage-vignette');
        this._healVignette = document.getElementById('heal-vignette');
        this._lowHpPulse = document.getElementById('low-hp-pulse');
        this._bossTaunt = document.getElementById('boss-taunt');
    }

    // =============================================================
    // Shortcut Prompt Box
    // =============================================================

    /**
     * Show the shortcut prompt above the targeted monster.
     * @param {object} shortcut — shortcut object from ShortcutManager
     * @param {string} mode — 'key' (show combo) or 'action' (show description)
     * @param {boolean} showPhysical — whether to show physical key names
     * @param {string} hintLevel — 'none' | 'partial' | 'full'
     * @param {string} partialText — partial hint text (first modifier)
     */
    showPrompt(shortcut, mode, showPhysical, hintLevel, partialText) {
        if (!this._prompt) return;

        if (!shortcut) {
            this.hidePrompt();
            return;
        }

        let keysHtml = '';
        let actionText = shortcut.action || shortcut.description || '';

        if (hintLevel === 'none') {
            keysHtml = '<span class="prompt-hidden">???</span>';
        } else if (hintLevel === 'partial') {
            keysHtml = '<span class="prompt-partial">' + escHtml(partialText || '???') + ' + ???</span>';
        } else {
            // Full — show keys or action based on mode
            if (mode === 'action') {
                keysHtml = '';
            } else {
                keysHtml = this._formatKeys(shortcut.display || shortcut.combo || '');
            }
        }

        if (this._promptKeys) this._promptKeys.innerHTML = keysHtml;
        if (this._promptAction) this._promptAction.textContent = actionText;

        if (this._promptPhysical) {
            if (showPhysical && hintLevel === 'full' && shortcut.physical) {
                this._promptPhysical.textContent = shortcut.physical;
                this._promptPhysical.classList.remove('hidden');
            } else {
                this._promptPhysical.classList.add('hidden');
            }
        }

        this._prompt.classList.add('active');
        this._prompt.setAttribute('aria-hidden', 'false');
    }

    hidePrompt() {
        if (!this._prompt) return;
        this._prompt.classList.remove('active');
        this._prompt.setAttribute('aria-hidden', 'true');
    }

    /**
     * Format key display with color-coded modifier badges.
     */
    _formatKeys(display) {
        if (!display) return '';
        // Split on + to color-code modifiers
        const parts = display.split('+');
        return parts.map(p => {
            const trimmed = p.trim();
            const lower = trimmed.toLowerCase();
            if (lower === '\u2318' || lower === 'cmd' || lower === '\u2318') {
                return '<span class="key-badge key-cmd">' + escHtml(trimmed) + '</span>';
            }
            if (lower === '\u21e7' || lower === 'shift') {
                return '<span class="key-badge key-shift">' + escHtml(trimmed) + '</span>';
            }
            if (lower === '\u2325' || lower === 'option' || lower === 'alt') {
                return '<span class="key-badge key-option">' + escHtml(trimmed) + '</span>';
            }
            if (lower === '\u2303' || lower === 'ctrl' || lower === 'control') {
                return '<span class="key-badge key-ctrl">' + escHtml(trimmed) + '</span>';
            }
            return '<span class="key-badge key-base">' + escHtml(trimmed) + '</span>';
        }).join('<span class="key-plus">+</span>');
    }

    // =============================================================
    // Combo Counter
    // =============================================================

    showCombo(count, tier) {
        if (!this._combo) return;
        this._combo.textContent = 'x' + count + ' COMBO';
        this._combo.className = 'combo-counter active combo-tier-' + tier;
        this._combo.setAttribute('aria-hidden', 'false');
    }

    hideCombo() {
        if (!this._combo) return;
        this._combo.classList.remove('active');
        this._combo.setAttribute('aria-hidden', 'true');
    }

    // =============================================================
    // Combo Milestone Text
    // =============================================================

    showComboMilestone(text) {
        if (!this._milestone) return;

        clearTimeout(this._milestoneTimer);
        this._milestone.textContent = text;
        // Force reflow to restart animation
        this._milestone.classList.remove('active');
        void this._milestone.offsetWidth;
        this._milestone.classList.add('active');
        this._milestone.setAttribute('aria-hidden', 'false');

        this._milestoneTimer = setTimeout(() => {
            this._milestoneTimer = null;
            if (this._milestone && this._milestone.isConnected) {
                this._milestone.classList.remove('active');
                this._milestone.setAttribute('aria-hidden', 'true');
            }
        }, 1500);
    }

    // =============================================================
    // Damage / Heal Vignettes
    // =============================================================

    flashDamage() {
        if (!this._damageVignette) return;
        clearTimeout(this._damageTimer);
        this._damageVignette.classList.add('active');

        this._damageTimer = setTimeout(() => {
            this._damageTimer = null;
            if (this._damageVignette && this._damageVignette.isConnected) {
                this._damageVignette.classList.remove('active');
            }
        }, 150);
    }

    flashHeal() {
        if (!this._healVignette) return;
        clearTimeout(this._healTimer);
        this._healVignette.classList.add('active');

        this._healTimer = setTimeout(() => {
            this._healTimer = null;
            if (this._healVignette && this._healVignette.isConnected) {
                this._healVignette.classList.remove('active');
            }
        }, 150);
    }

    // =============================================================
    // Low HP Pulse
    // =============================================================

    setLowHp(isLow) {
        if (!this._lowHpPulse) return;
        this._lowHpPulse.classList.toggle('active', isLow);
    }

    // =============================================================
    // Boss Taunt
    // =============================================================

    showBossTaunt(text) {
        if (!this._bossTaunt) return;
        clearTimeout(this._bossTauntTimer);
        this._bossTaunt.textContent = text;
        this._bossTaunt.classList.add('active');
        this._bossTaunt.setAttribute('aria-hidden', 'false');

        this._bossTauntTimer = setTimeout(() => {
            this._bossTauntTimer = null;
            if (this._bossTaunt && this._bossTaunt.isConnected) {
                this.hideBossTaunt();
            }
        }, 3000);
    }

    hideBossTaunt() {
        if (!this._bossTaunt) return;
        this._bossTaunt.classList.remove('active');
        this._bossTaunt.setAttribute('aria-hidden', 'true');
    }

    // =============================================================
    // Cleanup
    // =============================================================

    cancel() {
        clearTimeout(this._milestoneTimer);
        this._milestoneTimer = null;
        clearTimeout(this._damageTimer);
        this._damageTimer = null;
        clearTimeout(this._healTimer);
        this._healTimer = null;
        clearTimeout(this._bossTauntTimer);
        this._bossTauntTimer = null;

        this.hidePrompt();
        this.hideCombo();
        this.hideBossTaunt();
        this.setLowHp(false);

        if (this._milestone) {
            this._milestone.classList.remove('active');
            this._milestone.setAttribute('aria-hidden', 'true');
        }
        if (this._damageVignette) {
            this._damageVignette.classList.remove('active');
        }
        if (this._healVignette) {
            this._healVignette.classList.remove('active');
        }
    }
}

/**
 * HTML-escape helper — required by CLAUDE.md for any innerHTML interpolation.
 */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
