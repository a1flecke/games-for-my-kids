/**
 * room.js — Creature room/home decoration.
 * Renders room background, furniture items, and creature in room.
 * Drag-to-place room items, max 8 items.
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

class RoomManager {
    constructor() {
        this._creature = null;
        this._roomData = null;
        this._placingItem = null;
        this._maxItems = 8;
    }

    /**
     * Enter room edit mode for a creature.
     */
    startEditing(creature) {
        this._creature = creature;
        this._roomData = creature ? creature.room : null;
    }

    /**
     * Place a room item at normalized coordinates.
     */
    placeItem(type, nx, ny) {
        if (!this._roomData) return false;
        if (this._roomData.items.length >= this._maxItems) return false;

        this._roomData.items.push({ type, x: nx, y: ny });
        return true;
    }

    /**
     * Remove a room item by index.
     */
    removeItem(index) {
        if (!this._roomData) return;
        this._roomData.items.splice(index, 1);
    }

    /**
     * Set wall color.
     */
    setWallColor(color) {
        if (!this._roomData) return;
        this._roomData.wallColor = color;
    }

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Room edit mode animations
    }

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        // Draw room background + items + creature — placeholder
    }
}
