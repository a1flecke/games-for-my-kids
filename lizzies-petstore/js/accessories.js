/**
 * accessories.js — Accessory drawing functions + wardrobe UI.
 * Procedural drawing with color parameter, attached via slot-specific anchor points.
 * Anchor points adapt per head/body type.
 */

class AccessoriesLibrary {
    constructor() {
        this._accessoryData = null; // Loaded from data/accessories.json
    }

    /**
     * Load accessory catalog from data/accessories.json.
     */
    async loadCatalog() {
        const resp = await fetch('data/accessories.json');
        this._accessoryData = await resp.json();
        return this._accessoryData;
    }

    /**
     * Get accessories by slot.
     */
    getBySlot(slot) {
        if (!this._accessoryData) return [];
        return this._accessoryData.filter(a => a.slot === slot);
    }

    /**
     * Get a specific accessory by ID.
     */
    getById(id) {
        if (!this._accessoryData) return null;
        return this._accessoryData.find(a => a.id === id) || null;
    }

    /**
     * Draw an accessory to a context.
     * Placeholder — full procedural art in Session 6.
     */
    drawAccessory(ctx, accessoryId, color, scale) {
        const acc = this.getById(accessoryId);
        if (!acc) return;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2C2416';
        ctx.fillStyle = color;

        // Placeholder rectangle
        ctx.beginPath();
        ctx.roundRect(10, 10, 40, 40, 8);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Get anchor point offsets for a given slot + head/body type.
     * Returns { x, y, rotation, scale } adjustments.
     */
    getAnchor(slot, partType) {
        // Default anchors — will be refined per part type in Session 6
        const defaults = {
            head: { x: 0.5, y: 0.0, rotation: 0, scale: 1.0 },
            neck: { x: 0.5, y: 0.85, rotation: 0, scale: 1.0 },
            body: { x: 0.5, y: 0.5, rotation: 0, scale: 1.0 },
            feet: { x: 0.5, y: 1.0, rotation: 0, scale: 1.0 },
            face: { x: 0.5, y: 0.4, rotation: 0, scale: 0.8 }
        };
        return defaults[slot] || { x: 0.5, y: 0.5, rotation: 0, scale: 1.0 };
    }
}
