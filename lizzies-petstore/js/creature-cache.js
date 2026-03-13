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
    tail:        { x: -0.20,  y: 0.1 },
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
                // Accessories rendered as a composite canvas
                const accCanvas = this._buildAccessoriesCanvas(creatureData, dpr);
                if (accCanvas) {
                    partCanvases['accessories'] = accCanvas;
                }
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

        // Accessories are a special composite canvas
        if (partSlot === 'accessories') {
            const dpr = window.devicePixelRatio || 1;
            const hadAccessories = !!cache['accessories'];
            const accCanvas = this._buildAccessoriesCanvas(creatureData, dpr);
            if (accCanvas) {
                if (!hadAccessories) {
                    this._checkBudget(1);
                    this._totalCanvases++;
                }
                cache['accessories'] = accCanvas;
            } else if (hadAccessories) {
                delete cache['accessories'];
                this._totalCanvases--;
            }
            this._touchLRU(creatureId);
            return;
        }

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
     * Build a composite offscreen canvas with all accessories drawn.
     * Each accessory is drawn at its anchor position relative to a 200px reference.
     * Canvas is padded vertically so negative-y anchors (hats above head) and
     * high-y anchors (feet at y=1.0) aren't clipped. The padding preserves each
     * anchor's distance from canvas center, so the ATTACHMENT_OFFSETS position
     * stays correct.
     * Returns { canvas, w, h } or null if no accessories.
     */
    _buildAccessoriesCanvas(creatureData, dpr) {
        if (!creatureData.accessories || creatureData.accessories.length === 0) return null;
        if (!window.accessoriesLib) return null;

        const refSize = 200; // match reference creature size
        const padY = 40;     // vertical margin for above-head / below-feet anchors
        const canvasH = refSize + padY * 2;
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(refSize * dpr);
        canvas.height = Math.ceil(canvasH * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Determine head type for anchor lookup
        const headType = creatureData.body && creatureData.body.head
            ? `head-${creatureData.body.head.type}` : null;

        for (const acc of creatureData.accessories) {
            const accMeta = window.accessoriesLib.getById(acc.type);
            if (!accMeta) continue;

            const anchor = window.accessoriesLib.getAnchor(accMeta.slot, headType);
            const accScale = anchor.scale || 1;

            // Position relative to refSize, shifted down by padY so negative
            // y anchors (head-slot hats) land inside the canvas
            const drawX = anchor.x * refSize;
            const drawY = anchor.y * refSize + padY;

            ctx.save();
            ctx.translate(drawX, drawY);
            if (anchor.rotation) {
                ctx.rotate(anchor.rotation * Math.PI / 180);
            }
            // Accessory draws into 60x60 box centered at origin
            ctx.translate(-30 * accScale, -30 * accScale);
            window.accessoriesLib.drawAccessory(ctx, acc.type, acc.color || accMeta.defaultColor, accScale);
            ctx.restore();
        }

        return { canvas, w: refSize, h: canvasH };
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

            if (slot === 'tail') {
                // Tails: flip horizontally so narrow base (x=0) is at the
                // attachment point and the shape extends left (away from body).
                // Negate rotation to preserve world-space direction after flip.
                if (partAnim.rotation) {
                    ctx.rotate(-partAnim.rotation * Math.PI / 180);
                }
                ctx.scale(
                    partAnim.scaleX || 1,
                    partAnim.scaleY || 1
                );
                ctx.scale(-1, 1);
                ctx.drawImage(part.canvas, 0, -partH / 2, partW, partH);
            } else {
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
            }

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

    // ── Composite Cache (for NPC park creatures) ─────────

    /**
     * Build a single composite offscreen canvas containing all parts rendered in
     * RENDER_ORDER. Used for NPC creatures in the park to save canvas budget
     * (1 canvas per NPC instead of ~8).
     *
     * NPCs cannot have per-part animation — only whole-sprite transforms.
     *
     * @param {string} creatureId
     * @param {object} creatureData — full creature object
     * @param {number} displaySize — base display size in CSS pixels
     */
    buildCompositeCache(creatureId, creatureData, displaySize) {
        if (this._caches.has(creatureId)) {
            this.clearCache(creatureId);
        }

        this._checkBudget(1);

        const dpr = window.devicePixelRatio || 1;
        const canvasSize = displaySize * 2; // Extra room for offset parts (wings, tail)
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(canvasSize * dpr);
        canvas.height = Math.ceil(canvasSize * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const body = creatureData.body || {};
        const cx = canvasSize / 2; // center X
        const cy = canvasSize / 2; // center Y
        const scale = displaySize / 200; // normalize to 200px reference

        for (const slot of RENDER_ORDER) {
            if (slot === 'accessories') continue; // skip accessories for NPCs

            const partData = this._getPartData(body, slot);
            if (!partData) continue;

            const partId = this._getPartId(partData, slot);
            const partMeta = window.partsLib ? window.partsLib.getById(partId) : null;
            if (!partMeta) continue;

            const drawSize = partMeta.drawSize || { w: 100, h: 100 };
            const partScale = partData.scale || 1;
            const cw = drawSize.w * partScale;
            const ch = drawSize.h * partScale;

            // Draw part to a temp canvas first
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = Math.ceil(cw * dpr);
            tmpCanvas.height = Math.ceil(ch * dpr);
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.scale(dpr, dpr);
            tmpCtx.lineWidth = 3;
            tmpCtx.lineCap = 'round';
            tmpCtx.lineJoin = 'round';
            tmpCtx.strokeStyle = '#2C2416';

            window.partsLib.drawPart(
                tmpCtx, partId, cw, ch,
                partData.color || partMeta.defaultColor,
                partData.covering || null,
                partData.pattern || null,
                partData.patternColor || null
            );

            // Composite onto the main canvas at attachment offset
            const attachment = ATTACHMENT_OFFSETS[slot] || { x: 0, y: 0 };
            const px = cx + attachment.x * displaySize;
            const py = cy + attachment.y * displaySize;
            const partW = cw * scale;
            const partH = ch * scale;

            // Tails: flip horizontally so narrow base is at attachment
            // and the shape extends left (away from body)
            if (slot === 'tail') {
                ctx.save();
                ctx.translate(px, py);
                ctx.scale(-1, 1);
                ctx.drawImage(tmpCanvas, 0, -partH / 2, partW, partH);
                ctx.restore();
            } else {
                ctx.drawImage(tmpCanvas, px - partW / 2, py - partH / 2, partW, partH);
            }

            // Mirror wings
            if (slot === 'wings') {
                const mirrorPx = cx - attachment.x * displaySize;
                ctx.save();
                ctx.translate(mirrorPx, py);
                ctx.scale(-1, 1);
                ctx.drawImage(tmpCanvas, -partW / 2, -partH / 2, partW, partH);
                ctx.restore();
            }
        }

        // Store as a single-canvas entry with a special '_composite' key
        this._caches.set(creatureId, { _composite: { canvas, w: canvasSize, h: canvasSize } });
        this._totalCanvases += 1;
        this._touchLRU(creatureId);
    }

    /**
     * Draw a composite-cached creature (whole-sprite, no per-part transforms).
     * Supports whole-sprite scale and horizontal flip.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x — center X (CSS pixels)
     * @param {number} y — center Y (CSS pixels)
     * @param {string} creatureId
     * @param {number} [scaleX=1]
     * @param {number} [scaleY=1]
     */
    drawComposite(ctx, x, y, creatureId, scaleX, scaleY) {
        const cache = this._caches.get(creatureId);
        if (!cache || !cache._composite) return;

        const comp = cache._composite;
        const sx = scaleX || 1;
        const sy = scaleY || 1;

        ctx.save();
        ctx.translate(x, y);
        if (sx !== 1 || sy !== 1) {
            ctx.scale(sx, sy);
        }
        ctx.drawImage(comp.canvas, -comp.w / 2, -comp.h / 2, comp.w, comp.h);
        ctx.restore();
    }
}
