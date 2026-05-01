(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Progression = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildProgression() {
    class Progression {
        constructor(saved) {
            this._mastery = Object.assign({}, saved && saved.factMastery);
            this._weakFacts = Array.isArray(saved && saved.weakFactQueue) ? saved.weakFactQueue.slice() : [];
        }

        getMastery(key) {
            return this._mastery[key] || 0;
        }

        getWeakFacts() {
            return this._weakFacts.slice();
        }

        getAdaptiveConfig() {
            return {
                factMastery: Object.assign({}, this._mastery),
                weakFactQueue: this._weakFacts.slice()
            };
        }

        recordAnswer(result) {
            const key = result.factKey;
            const current = this.getMastery(key);
            let next = current;
            if (result.correct && result.firstTry) next += 2;
            else if (result.correct) next += 1;
            else next -= 2;
            this._mastery[key] = Math.max(-10, Math.min(10, next));
            if (!result.correct && !this._weakFacts.includes(key)) this._weakFacts.unshift(key);
            if (result.correct && this._mastery[key] >= 4) {
                this._weakFacts = this._weakFacts.filter((item) => item !== key);
            }
            this._weakFacts = this._weakFacts.slice(0, 24);
        }

        scoreRaid(stats) {
            const total = Math.max(1, stats.total);
            const accuracy = stats.correctFirstTry / total;
            let stars = 1;
            if (accuracy >= 0.85 && stats.hearts >= 2) stars = 3;
            else if (accuracy >= 0.7 || stats.hearts >= 2) stars = 2;
            return {
                stars,
                accuracy,
                coins: Math.round(40 + accuracy * 80 + stats.longestStreak * 3)
            };
        }

        getUnlockedModes(saveData) {
            const modes = ['quick', 'standard'];
            if ((saveData.standardRaidsCompleted || 0) >= 1) modes.push('practice-forge');
            return modes;
        }

        completeRaid(saveData, raidResult) {
            saveData.raidsCompleted = (saveData.raidsCompleted || 0) + 1;
            if (raidResult.mode === 'standard') {
                saveData.standardRaidsCompleted = (saveData.standardRaidsCompleted || 0) + 1;
            }
            saveData.bestStarsByMode = saveData.bestStarsByMode || {};
            saveData.bestStarsByMode[raidResult.mode] = Math.max(saveData.bestStarsByMode[raidResult.mode] || 0, raidResult.stars || 1);
            return saveData;
        }

        makePracticeConfig(factKey) {
            const parts = factKey.split(':');
            const factorFamily = Number(parts[1]);
            return {
                mode: 'practice-forge',
                factorFamily,
                operations: ['multiply', 'divide', 'missing'],
                band: 'practice',
                promptTarget: 8,
                avoidExactRepeatWindow: 4
            };
        }

        toJSON() {
            return {
                factMastery: Object.assign({}, this._mastery),
                weakFactQueue: this._weakFacts.slice()
            };
        }
    }

    return Progression;
});
