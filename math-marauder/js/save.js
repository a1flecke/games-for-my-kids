(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.SaveManager = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildSaveManager() {
    const STORAGE_KEY = 'math-marauder-save';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function mergeDefaults(defaults, saved) {
        const merged = clone(defaults);
        if (!saved || typeof saved !== 'object') return merged;
        for (const key of Object.keys(saved)) {
            if (saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key]) && merged[key]) {
                merged[key] = Object.assign({}, merged[key], saved[key]);
            } else {
                merged[key] = saved[key];
            }
        }
        return merged;
    }

    class SaveManager {
        constructor(storage) {
            this._storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        }

        defaults() {
            return {
                version: 1,
                raidsCompleted: 0,
                standardRaidsCompleted: 0,
                coins: 0,
                bestStarsByMode: {},
                factMastery: {},
                weakFactQueue: [],
                unlockedBiomes: ['ember-library'],
                unlockedSpells: ['starbolt'],
                settings: {
                    sfx: true,
                    music: false,
                    speech: true,
                    reducedMotion: false,
                    fontScale: 'normal'
                },
                stats: {
                    promptsAnswered: 0,
                    correctFirstTry: 0,
                    longestStreak: 0
                }
            };
        }

        load() {
            const defaults = this.defaults();
            if (!this._storage) return defaults;
            try {
                const raw = this._storage.getItem(STORAGE_KEY);
                if (!raw) return defaults;
                return mergeDefaults(defaults, JSON.parse(raw));
            } catch (err) {
                return defaults;
            }
        }

        save(data) {
            if (!this._storage) return;
            this._storage.setItem(STORAGE_KEY, JSON.stringify(mergeDefaults(this.defaults(), data)));
        }

        reset() {
            if (!this._storage) return;
            this._storage.removeItem(STORAGE_KEY);
        }
    }

    SaveManager.STORAGE_KEY = STORAGE_KEY;
    return SaveManager;
});
