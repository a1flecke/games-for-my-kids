/**
 * creature-cache.js — Offscreen canvas caching for creature parts.
 * Each part is rendered to its own offscreen canvas once, then composited
 * via drawImage() in the game loop. Re-cache only on part change.
 *
 * Does NOT own a RAF loop — exposes drawCreature() called by game.js.
 */

const RENDER_ORDER = ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories'];
const MAX_OFFSCREEN_CANVASES = 30;

/**
 * Attachment layout: defines where each part connects relative to the torso center.
 * Values are in normalized coordinates relative to display size.
 * Positive Y is downward.
 */
const ATTACHMENT_OFFSETS = {
    torso:       { x: 0,      y: 0 },
    head:        { x: 0,      y: -0.48 },
    eyes:        { x: 0,      y: -0.52 },
    legs:        { x: 0,      y: 0.42 },
    tail:        { x: -0.52,  y: 0.1 },
    wings:       { x: -0.1,   y: -0.2 },
    extras:      { x: 0,      y: -0.65 },
    accessories: { x: 0,      y: -0.55 }
};

class CreatureCache {
    constructor() {
        this._caches = new Map();     // creatureId -> { partSlot -> { canvas, w, h } }
        this._accessOrder = [];       // LRU tracking: most recent at end
        this._totalCanvases = 0;
    }

    /**
     * Build or rebuild the offscreen cache for a creature.
     * Renders each body part to its own offscreen canvas at display size × DPR.
     *
     * @param {string} creatureId
     * @param {object} creatureData — full creature object (body, accessories, etc.)
     * @param {number} displaySize — base display size in CSS pixels (creature will fit in this box)
     */
    buildCache(creatureId, creatureData, displaySize) {
        if (this._caches.has(creatureId)) {
            this.clearCache(creatureId);
        }

        const dpr = window.devicePixelRatio || 1;
        const body = creatureData.body || {};
        const partCanvases = {};
        let canvasCount = 0;

        // Count how many canvases we need
        for (const slot of RENDER_ORDER) {
            if (slot === 'accessories') continue; // handled separately
            const partData = this._getPartData(body, slot);
            if (partData) canvasCount++;
        }
        if (creatureData.accessories && creatureData.accessories.length > 0) {
            canvasCount++;
        }

        this._checkBudget(canvasCount);

        // Render each part to an offscreen canvas
        for (const slot of RENDER_ORDER) {
            if (slot === 'accessories') {
                // Accessories rendered as a group on one canvas (future session)
                continue;
            }

            const partData = this._getPartData(body, slot);
            if (!partData) continue;

            const partId = this._getPartId(partData, slot);
            const partMeta = window.partsLib.getById(partId);
            if (!partMeta) continue;

            const drawSize = partMeta.drawSize || { w: 100, h: 100 };
            const partScale = partData.scale || 1;
            const cw = drawSize.w * partScale;
            const ch = drawSize.h * partScale;

            // Create offscreen canvas at display size × DPR
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(cw * dpr);
            canvas.height = Math.ceil(ch * dpr);
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Draw the part
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#2C2416';

            window.partsLib.drawPart(
                ctx, partId, cw, ch,
                partData.color || partMeta.defaultColor,
                partData.covering || null,
                partData.pattern || null,
                partData.patternColor || null
            );

            partCanvases[slot] = { canvas, w: cw, h: ch };
        }

        this._caches.set(creatureId, partCanvases);
        this._totalCanvases += Object.keys(partCanvases).length;
        this._touchLRU(creatureId);
    }

    /**
     * Invalidate and re-render a single part's offscreen canvas.
     * Only the affected part is re-drawn — all other cached parts are untouched.
     */
    invalidatePart(creatureId, partSlot, creatureData) {
        const cache = this._caches.get(creatureId);
        if (!cache) return;

        const body = creatureData.body || {};
        const partData = this._getPartData(body, partSlot);

        // If the part was removed, delete its canvas
        if (!partData) {
            if (cache[partSlot]) {
                delete cache[partSlot];
                this._totalCanvases--;
            }
            return;
        }

        const partId = this._getPartId(partData, partSlot);
        const partMeta = window.partsLib.getById(partId);
        if (!partMeta) return;

        const dpr = window.devicePixelRatio || 1;
        const drawSize = partMeta.drawSize || { w: 100, h: 100 };
        const partScale = partData.scale || 1;
        const cw = drawSize.w * partScale;
        const ch = drawSize.h * partScale;

        // If this slot didn't exist before, check budget
        if (!cache[partSlot]) {
            this._checkBudget(1);
            this._totalCanvases++;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(cw * dpr);
        canvas.height = Math.ceil(ch * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2C2416';

        window.partsLib.drawPart(
            ctx, partId, cw, ch,
            partData.color || partMeta.defaultColor,
            partData.covering || null,
            partData.pattern || null,
            partData.patternColor || null
        );

        cache[partSlot] = { canvas, w: cw, h: ch };
        this._touchLRU(creatureId);
    }

    /**
     * Composite all cached parts in RENDER_ORDER with animation transforms.
     * Called by game.js in the draw loop — single drawImage() per part.
     *
     * @param {CanvasRenderingContext2D} ctx — target context (DPR-scaled)
     * @param {number} x — creature center X (CSS pixels)
     * @param {number} y — creature center Y (CSS pixels)
     * @param {object} animState — per-part transforms from AnimationEngine.getState()
     * @param {number} displaySize — base display size for layout scaling
     */
    drawCreature(ctx, x, y, animState, displaySize) {
        const creatureId = this._getFirstCachedId();
        if (!creatureId) return;
        this.drawCreatureById(ctx, x, y, animState, displaySize, creatureId);
    }

    /**
     * Draw a specific creature by ID.
     */
    drawCreatureById(ctx, x, y, animState, displaySize, creatureId) {
        const cache = this._caches.get(creatureId);
        if (!cache) return;

        const anim = animState || {};
        const scale = displaySize / 200; // normalize to 200px reference size

        for (const slot of RENDER_ORDER) {
            const part = cache[slot];
            if (!part) continue;

            const attachment = ATTACHMENT_OFFSETS[slot] || { x: 0, y: 0 };
            const partAnim = anim[slot] || { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };

            // Compute part center position
            const px = x + attachment.x * displaySize + partAnim.translateX * scale;
            const py = y + attachment.y * displaySize + partAnim.translateY * scale;

            // Get pivot point from part metadata for rotation
            const partW = part.w * scale;
            const partH = part.h * scale;

            ctx.save();
            ctx.translate(px, py);

            // Apply animation transforms
            if (partAnim.rotation) {
                ctx.rotate(partAnim.rotation * Math.PI / 180);
            }
            ctx.scale(
                partAnim.scaleX || 1,
                partAnim.scaleY || 1
            );

            // Draw the cached canvas centered on the attachment point
            ctx.drawImage(
                part.canvas,
                -partW / 2, -partH / 2,
                partW, partH
            );

            ctx.restore();

            // Mirror wings on the other side
            if (slot === 'wings') {
                const mirrorPx = x - attachment.x * displaySize - partAnim.translateX * scale;

                ctx.save();
                ctx.translate(mirrorPx, py);
                ctx.scale(-1, 1); // horizontal flip
                if (partAnim.rotation) {
                    ctx.rotate(partAnim.rotation * Math.PI / 180);
                }
                ctx.scale(
                    partAnim.scaleX || 1,
                    partAnim.scaleY || 1
                );
                ctx.drawImage(
                    part.canvas,
                    -partW / 2, -partH / 2,
                    partW, partH
                );
                ctx.restore();
            }
        }
        // LRU is touched only on buildCache/invalidatePart — not here in the hot draw path
    }

    /**
     * Check if a creature has a cached representation.
     */
    hasCache(creatureId) {
        return this._caches.has(creatureId);
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

        // Remove from LRU
        const idx = this._accessOrder.indexOf(creatureId);
        if (idx !== -1) this._accessOrder.splice(idx, 1);
    }

    /**
     * Clear all caches (e.g., on resize — offscreen canvases need new DPR).
     */
    clearAll() {
        this._caches.clear();
        this._accessOrder = [];
        this._totalCanvases = 0;
    }

    // ── Private Helpers ───────────────────────────────────

    /**
     * Extract part data from creature body for a given slot.
     * Handles the array case for legs.
     */
    _getPartData(body, slot) {
        const data = body[slot];
        if (!data) return null;
        // Legs are stored as an array — use the first entry for the type
        if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
        return data;
    }

    /**
     * Build the part ID string from part data.
     * e.g., { type: 'cat' } in slot 'head' → 'head-cat'
     */
    _getPartId(partData, slot) {
        if (!partData || !partData.type) return null;
        return `${slot}-${partData.type}`;
    }

    /**
     * Get the first cached creature ID (for the single-creature drawCreature).
     */
    _getFirstCachedId() {
        const first = this._caches.keys().next();
        return first.done ? null : first.value;
    }

    /**
     * Update LRU tracking — move creature to end (most recently used).
     */
    _touchLRU(creatureId) {
        const idx = this._accessOrder.indexOf(creatureId);
        if (idx !== -1) this._accessOrder.splice(idx, 1);
        this._accessOrder.push(creatureId);
    }

    /**
     * Check if canvas budget allows more allocations.
     * Evicts LRU creature if over budget.
     */
    _checkBudget(needed) {
        while (this._totalCanvases + needed > MAX_OFFSCREEN_CANVASES && this._accessOrder.length > 0) {
            const oldestId = this._accessOrder[0];
            console.warn(
                `CreatureCache: over budget (${this._totalCanvases}+${needed}/${MAX_OFFSCREEN_CANVASES}), evicting ${oldestId}`
            );
            this.clearCache(oldestId);
        }
    }
}
