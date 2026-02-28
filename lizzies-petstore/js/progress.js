/**
 * progress.js — Unlock system, milestones, achievements.
 * Tracks player progress and unlocks new parts/accessories/themes.
 *
 * Starter set is available immediately. Additional items unlock via milestones
 * defined in data/unlocks.json.
 */

class ProgressManager {
    constructor() {
        this._unlockData = null; // Loaded from data/unlocks.json
    }

    /**
     * Load unlock definitions from data/unlocks.json.
     */
    async loadUnlocks() {
        const resp = await fetch('data/unlocks.json');
        this._unlockData = await resp.json();
        return this._unlockData;
    }

    /**
     * Check all milestones against current save data.
     * Returns array of newly unlocked milestone IDs.
     */
    checkMilestones() {
        if (!this._unlockData) return [];

        const data = window.saveManager.load();
        const newUnlocks = [];

        for (const milestone of this._unlockData) {
            if (data.milestones[milestone.id]) continue; // Already unlocked

            if (this._conditionMet(milestone.condition, data)) {
                data.milestones[milestone.id] = { unlockedAt: Date.now() };
                newUnlocks.push(milestone);

                // Apply rewards
                for (const reward of milestone.rewards) {
                    this._applyReward(reward, data);
                }
            }
        }

        if (newUnlocks.length > 0) {
            window.saveManager.save(data);
        }

        return newUnlocks;
    }

    /**
     * Check if a single condition is met.
     */
    _conditionMet(condition, data) {
        if (!condition || !condition.type) return false;

        switch (condition.type) {
            case 'creatures_created':
                return data.totalCreaturesCreated >= (condition.count || 1);
            case 'care_actions':
                return data.creatures.some(c => c.totalCareActions >= (condition.count || 1));
            case 'park_visits':
                return data.parkVisits >= (condition.count || 1);
            case 'growth_stage':
                return data.creatures.some(c => c.growthStage === condition.stage);
            default:
                return false;
        }
    }

    /**
     * Apply a reward to save data.
     */
    _applyReward(reward, data) {
        if (!reward || !reward.type) return;

        switch (reward.type) {
            case 'part':
                if (!data.unlockedParts.includes(reward.id)) {
                    data.unlockedParts.push(reward.id);
                }
                break;
            case 'accessory':
                if (!data.unlockedAccessories.includes(reward.id)) {
                    data.unlockedAccessories.push(reward.id);
                }
                break;
            case 'theme':
                if (!data.unlockedThemes.includes(reward.id)) {
                    data.unlockedThemes.push(reward.id);
                }
                break;
        }
    }

    /**
     * Check if a part/accessory is unlocked (or is a starter item).
     */
    isUnlocked(type, id) {
        const data = window.saveManager.load();
        switch (type) {
            case 'part': return data.unlockedParts.includes(id);
            case 'accessory': return data.unlockedAccessories.includes(id);
            case 'theme': return data.unlockedThemes.includes(id);
            default: return false;
        }
    }
}
