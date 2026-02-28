/**
 * park.js — Pet park: random creatures, social animations.
 * Renders park scene with player creature + up to 5 NPC creatures.
 * Touch-guided player movement. Proximity-triggered social interactions.
 *
 * Max 6 creatures rendered simultaneously (1 player + 5 NPC).
 * Each uses cached sprites via CreatureCache.
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

class ParkManager {
    constructor() {
        this._playerCreature = null;
        this._npcCreatures = [];
        this._maxNpcs = 5;
        this._parkScene = 'sunny'; // 'sunny', 'beach', 'cloud'
        this._playerPos = { x: 0.5, y: 0.5 };
        this._targetPos = null;
        this._autoWanderTimer = null;
    }

    /**
     * Enter the park with a creature.
     */
    enterPark(creature) {
        this.cancel();
        this._playerCreature = creature;
        this._playerPos = { x: 0.5, y: 0.5 };
        this._generateNPCs();
    }

    /**
     * Cancel all timers and cleanup.
     */
    cancel() {
        clearTimeout(this._autoWanderTimer);
        this._autoWanderTimer = null;
        this._playerCreature = null;
        this._npcCreatures = [];
    }

    /**
     * Generate random NPC creatures using parts library.
     */
    _generateNPCs() {
        this._npcCreatures = [];
        const count = 4 + Math.floor(Math.random() * 2); // 4-5 NPCs
        for (let i = 0; i < Math.min(count, this._maxNpcs); i++) {
            this._npcCreatures.push(this._generateRandomCreature());
        }
    }

    /**
     * Generate a single random creature.
     * Uses the same parts library for consistency.
     */
    _generateRandomCreature() {
        // Placeholder — full implementation in Session 12
        return {
            id: 'npc-' + Math.random().toString(36).substr(2, 9),
            name: this._generateName(),
            pos: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.6 + 0.2 },
            personality: ['playful', 'shy', 'silly'][Math.floor(Math.random() * 3)],
            body: {}
        };
    }

    /**
     * Generate a random creature name (adjective + noun).
     */
    _generateName() {
        const adj = ['Sparkle', 'Princess', 'Wiggly', 'Captain', 'Fluffy', 'Silly', 'Bouncy', 'Twinkle'];
        const noun = ['Fluff', 'Bumble', 'Snoot', 'Squeaky', 'Paws', 'Whiskers', 'Nibbles', 'Pudding'];
        return adj[Math.floor(Math.random() * adj.length)] + ' ' +
               noun[Math.floor(Math.random() * noun.length)];
    }

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Move player toward target, update NPC wandering, check proximity
    }

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        // Draw park background, NPCs, player creature — placeholder
    }
}
