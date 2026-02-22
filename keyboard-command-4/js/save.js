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
                hints: 'after3'
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
}
