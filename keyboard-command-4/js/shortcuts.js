/**
 * Keyboard Command 4 — ShortcutManager
 * Loads the 60-shortcut database, handles matching, journal tracking, and stats.
 * Journal/stats data lives in SaveManager (shortcuts key).
 */

class ShortcutManager {
    constructor() {
        this._shortcuts = null;  // Array from JSON, null until load()
        this._byId = null;       // Map: id → shortcut object
        this._byCombo = null;    // Map: combo → shortcut object (excludes sequences)
    }

    /**
     * Fetch and parse data/shortcuts.json. Call once in game.init().
     */
    async load() {
        try {
            const resp = await fetch('data/shortcuts.json');
            this._shortcuts = await resp.json();
        } catch {
            // Network error or bad JSON — start with empty database
            this._shortcuts = [];
        }

        // Build lookup maps
        this._byId = new Map();
        this._byCombo = new Map();
        for (const s of this._shortcuts) {
            this._byId.set(s.id, s);
            if (s.combo) {
                this._byCombo.set(s.combo, s);
            }
        }
    }

    /**
     * Return full shortcut object by id.
     */
    getShortcut(id) {
        return this._byId ? this._byId.get(id) || null : null;
    }

    /**
     * Return all shortcuts for a given level number (1-10).
     */
    getShortcutsForLevel(lvl) {
        if (!this._shortcuts) return [];
        return this._shortcuts.filter(s => s.level === lvl);
    }

    /**
     * Match a combo string against a target shortcut id.
     * Returns { correct: boolean, shortcut: object|null }.
     * Also handles the special cmd+1to9 case (cmd+1 through cmd+9 all match).
     */
    matchAttempt(combo, targetId) {
        const target = this.getShortcut(targetId);
        if (!target) return { correct: false, shortcut: null };

        let correct = false;
        if (target.id === 'cmd_1to9') {
            // Any cmd+digit (1-9) matches
            correct = /^cmd\+[1-9]$/.test(combo);
        } else if (target.combo) {
            correct = combo === target.combo;
        }

        return { correct, shortcut: target };
    }

    /**
     * Find which shortcut matches a given combo string.
     * Returns the shortcut object or null.
     * Handles cmd+1to9 special case.
     */
    findByCombo(combo) {
        if (!this._byCombo) return null;

        // Direct lookup
        const direct = this._byCombo.get(combo);
        if (direct) return direct;

        // cmd+digit → cmd_1to9
        if (/^cmd\+[1-9]$/.test(combo)) {
            return this._byId.get('cmd_1to9') || null;
        }

        return null;
    }

    /**
     * Pick a random shortcut from a level's pool using Fisher-Yates.
     * Returns a shortcut object.
     */
    getRandomShortcut(lvl) {
        const pool = this.getShortcutsForLevel(lvl);
        if (!pool.length) return null;

        // Fisher-Yates on a copy to pick one uniformly at random
        const arr = pool.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr[0];
    }

    /**
     * Get display text for a shortcut.
     * mode 'key' → display text (e.g. "⌘+C"), 'action' → description text.
     */
    getPromptText(id, mode) {
        const s = this.getShortcut(id);
        if (!s) return '';
        if (mode === 'key') return s.display;
        if (mode === 'action') return s.description;
        return s.action;
    }

    /**
     * Check whether a combo is non-interceptable (OS-level, can't preventDefault).
     */
    isNonInterceptable(combo) {
        const s = this.findByCombo(combo);
        return s ? !s.canIntercept : false;
    }

    // =============================================================
    // Journal & Stats — data stored via SaveManager
    // =============================================================

    /**
     * Mark a shortcut as discovered/learned in save data.
     */
    learnShortcut(id) {
        const data = SaveManager.load();
        if (!data.shortcuts.learned) data.shortcuts.learned = {};
        data.shortcuts.learned[id] = true;
        SaveManager.save(data);
    }

    /**
     * Return all learned shortcuts grouped by category.
     */
    getJournalEntries() {
        const data = SaveManager.load();
        const learned = data.shortcuts.learned || {};
        const groups = {};

        if (!this._shortcuts) return groups;

        for (const s of this._shortcuts) {
            if (learned[s.id]) {
                if (!groups[s.category]) groups[s.category] = [];
                groups[s.category].push(s);
            }
        }
        return groups;
    }

    /**
     * Get stats for a specific shortcut.
     */
    getStats(id) {
        const data = SaveManager.load();
        const stats = data.shortcuts.stats || {};
        return stats[id] || { attempts: 0, correct: 0 };
    }

    /**
     * Record an attempt (correct or incorrect) for a shortcut.
     */
    recordAttempt(id, correct) {
        const data = SaveManager.load();
        if (!data.shortcuts.stats) data.shortcuts.stats = {};
        if (!data.shortcuts.stats[id]) {
            data.shortcuts.stats[id] = { attempts: 0, correct: 0 };
        }
        data.shortcuts.stats[id].attempts++;
        if (correct) data.shortcuts.stats[id].correct++;
        SaveManager.save(data);
    }
}
