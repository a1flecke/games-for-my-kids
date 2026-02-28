/**
 * care.js — Care mode: needs, mini-games, expressions.
 * Manages creature room hub, needs display, interactive care activities.
 *
 * Needs mechanics:
 *   - Decay ONLY during active play (1pt / 2min / need)
 *   - Floor at 20 — never desperate
 *   - On reopen: creature greets happily regardless of absence
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

class CareManager {
    constructor() {
        this._creature = null;
        this._needsDecayTimer = null;
        this._decayIntervalMs = 120000; // 2 minutes
        this._needsFloor = 20;
        this._activeMiniGame = null;    // 'feed', 'bathe', 'pet', 'play', 'sleep', or null
    }

    /**
     * Enter care mode for a creature.
     */
    startCaring(creature) {
        this.cancel();
        this._creature = creature;
        this._creature.lastActiveAt = Date.now();
        this._startNeedsDecay();
    }

    /**
     * Cancel all timers and cleanup.
     */
    cancel() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = null;
        this._activeMiniGame = null;
        this._creature = null;
    }

    /**
     * Start needs decay interval (only while actively playing).
     */
    _startNeedsDecay() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = setInterval(() => {
            if (!this._creature) return;
            const needs = this._creature.needs;
            for (const key of ['hunger', 'cleanliness', 'energy', 'happiness']) {
                needs[key] = Math.max(this._needsFloor, needs[key] - 1);
            }
            window.saveManager.updateCreature(this._creature.id, { needs });
        }, this._decayIntervalMs);
    }

    /**
     * Feed the creature. Hunger +30.
     */
    feed(foodType) {
        if (!this._creature) return;
        this._creature.needs.hunger = Math.min(100, this._creature.needs.hunger + 30);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Bathe the creature. Cleanliness +40.
     */
    bathe() {
        if (!this._creature) return;
        this._creature.needs.cleanliness = Math.min(100, this._creature.needs.cleanliness + 40);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Pet the creature. Happiness +15.
     */
    pet() {
        if (!this._creature) return;
        this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 15);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Play with the creature. Happiness +20, Energy -10.
     */
    play() {
        if (!this._creature) return;
        this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 20);
        this._creature.needs.energy = Math.max(this._needsFloor, this._creature.needs.energy - 10);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Put the creature to sleep. Energy +50.
     */
    sleep() {
        if (!this._creature) return;
        this._creature.needs.energy = Math.min(100, this._creature.needs.energy + 50);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Check for growth stage advancement.
     * Baby (0-19) → Kid (20-49) → Adult (50+)
     */
    _checkGrowth() {
        if (!this._creature) return;
        const actions = this._creature.totalCareActions;
        let newStage = 'baby';
        if (actions >= 50) newStage = 'adult';
        else if (actions >= 20) newStage = 'kid';

        if (newStage !== this._creature.growthStage) {
            this._creature.growthStage = newStage;
            // Trigger growth celebration — Session 9
        }

        window.saveManager.updateCreature(this._creature.id, {
            needs: this._creature.needs,
            totalCareActions: this._creature.totalCareActions,
            growthStage: this._creature.growthStage
        });
    }

    /**
     * Get expression state based on needs.
     */
    getExpression() {
        if (!this._creature) return 'content';
        const n = this._creature.needs;
        if (n.hunger < 40) return 'hungry';
        if (n.cleanliness < 40) return 'messy';
        if (n.energy < 40) return 'tired';
        if (n.happiness < 40) return 'bored';
        return 'content';
    }

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Update care room animations, mini-game state
    }

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        // Draw creature room, creature, needs indicators — placeholder
    }
}
