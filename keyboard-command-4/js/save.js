/**
 * Keyboard Command 4 — SaveManager
 * Single localStorage key: 'keyboard-command-4-save'
 */

class SaveManager {
    static STORAGE_KEY = 'keyboard-command-4-save';

    static _defaults() {
        return {
            version: 1,
            highestLevel: 1,
            totalScore: 0,
            levels: {},
            shortcuts: {
                learned: {},
                stats: {}
            },
            weaponsUnlocked: [1],
            selectedWeapon: 1,
            settings: {
                fontSize: 'medium',
                showPhysicalKeys: true,
                volume: 0.7,
                monsterSpeed: 'normal',
                hints: 'always'
            }
        };
    }

    static load() {
        try {
            const raw = localStorage.getItem(SaveManager.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                // Merge with defaults so new keys are always present
                const defaults = SaveManager._defaults();
                return {
                    ...defaults,
                    ...data,
                    settings: { ...defaults.settings, ...(data.settings || {}) },
                    shortcuts: {
                        ...defaults.shortcuts,
                        ...(data.shortcuts || {}),
                        learned: { ...(defaults.shortcuts.learned), ...((data.shortcuts && data.shortcuts.learned) || {}) },
                        stats: { ...(defaults.shortcuts.stats), ...((data.shortcuts && data.shortcuts.stats) || {}) }
                    }
                };
            }
        } catch {
            // Corrupt data — return fresh defaults
        }
        return SaveManager._defaults();
    }

    static save(data) {
        try {
            localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Storage full or disabled — silently continue
        }
    }

    static reset() {
        try {
            localStorage.removeItem(SaveManager.STORAGE_KEY);
        } catch {
            // Silently continue
        }
    }

    /**
     * Save level result, keeping best scores.
     * @param {number} levelId — 0-based level index
     * @param {{ stars: number, score: number, bestCombo: number, timeTaken: number, newShortcuts: number }} stats
     */
    static saveLevelResult(levelId, stats) {
        const data = SaveManager.load();
        const key = String(levelId);
        const existing = data.levels[key] || {};

        data.levels[key] = {
            stars: Math.max(stats.stars || 0, existing.stars || 0),
            bestScore: Math.max(stats.score || 0, existing.bestScore || 0),
            bestCombo: Math.max(stats.bestCombo || 0, existing.bestCombo || 0),
            timeTaken: existing.timeTaken
                ? Math.min(stats.timeTaken || Infinity, existing.timeTaken)
                : (stats.timeTaken || 0),
            newShortcuts: Math.max(stats.newShortcuts || 0, existing.newShortcuts || 0)
        };

        SaveManager.save(data);
    }

    /**
     * Record a shortcut attempt.
     * @param {string} shortcutId
     * @param {boolean} correct
     */
    static saveShortcutStats(shortcutId, correct) {
        const data = SaveManager.load();
        if (!data.shortcuts.stats[shortcutId]) {
            data.shortcuts.stats[shortcutId] = { attempts: 0, correct: 0 };
        }
        data.shortcuts.stats[shortcutId].attempts++;
        if (correct) data.shortcuts.stats[shortcutId].correct++;
        SaveManager.save(data);
    }

    /**
     * Unlock a weapon if not already unlocked.
     * @param {number} weaponId — 1-based weapon index
     */
    static unlockWeapon(weaponId) {
        const data = SaveManager.load();
        if (!data.weaponsUnlocked.includes(weaponId)) {
            data.weaponsUnlocked.push(weaponId);
            SaveManager.save(data);
        }
    }

    /**
     * Update a single setting.
     * @param {string} key — setting key (fontSize, volume, etc.)
     * @param {*} value — setting value
     */
    static updateSettings(key, value) {
        const data = SaveManager.load();
        data.settings[key] = value;
        SaveManager.save(data);
    }
}
