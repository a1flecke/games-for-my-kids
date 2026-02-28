/**
 * creature-cache.js — Offscreen canvas caching for creature parts.
 * Each part is rendered to its own offscreen canvas once, then composited
 * via drawImage() in the game loop. Re-cache only on part change.
 */

const RENDER_ORDER = ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories'];
const MAX_OFFSCREEN_CANVASES = 30;

class CreatureCache {
    constructor() {
        this._caches = new Map(); // creatureId → { partSlot → offscreen canvas }
        this._totalCanvases = 0;
    }

    /**
     * Build or rebuild cache for a creature.
     * @param {string} creatureId
     * @param {object} creatureData — full creature body data
     */
    buildCache(creatureId, creatureData) {
        if (this._caches.has(creatureId)) {
            this.clearCache(creatureId);
        }

        const partCanvases = {};
        // Will render each part to an offscreen canvas in Session 3
        this._caches.set(creatureId, partCanvases);
    }

    /**
     * Invalidate and re-render a single part's offscreen canvas.
     */
    invalidatePart(creatureId, partSlot) {
        const cache = this._caches.get(creatureId);
        if (!cache) return;
        // Re-render only the affected part — Session 3
    }

    /**
     * Composite all cached parts in RENDER_ORDER with animation transforms.
     * @param {CanvasRenderingContext2D} ctx — target context
     * @param {number} x — creature center X
     * @param {number} y — creature center Y
     * @param {object} animState — per-part transform deltas from AnimationEngine
     */
    drawCreature(ctx, x, y, animState) {
        // Placeholder — will composite cached canvases in RENDER_ORDER
        // Each part: ctx.save() → translate → rotate → drawImage → ctx.restore()
    }

    /**
     * Clear cache for a creature, freeing offscreen canvases.
     */
    clearCache(creatureId) {
        const cache = this._caches.get(creatureId);
        if (!cache) return;

        const count = Object.keys(cache).length;
        this._totalCanvases -= count;
        this._caches.delete(creatureId);
    }

    /**
     * Check if canvas budget allows more allocations.
     */
    _checkBudget(needed) {
        if (this._totalCanvases + needed > MAX_OFFSCREEN_CANVASES) {
            console.warn(`CreatureCache: approaching canvas limit (${this._totalCanvases}/${MAX_OFFSCREEN_CANVASES})`);
            this._evictLRU();
        }
    }

    /**
     * Evict least-recently-used creature cache.
     */
    _evictLRU() {
        // Evict first (oldest) entry
        const firstKey = this._caches.keys().next().value;
        if (firstKey) this.clearCache(firstKey);
    }
}
