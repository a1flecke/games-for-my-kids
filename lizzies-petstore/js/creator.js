/**
 * creator.js — Creator studio: palette, placement, styling tools.
 * Manages the creature creation workspace.
 *
 * Two placement modes:
 *   - Tap-to-place (primary): tap part → auto-snap to attachment point
 *   - Drag-to-place (advanced): long-press 300ms → drag → snap to nearest valid point
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

class Creator {
    constructor() {
        this._creature = null;       // Creature being built
        this._selectedPart = null;   // Currently selected placed part
        this._activeCategory = 'head';
        this._undoStack = [];
        this._redoStack = [];
        this._maxUndoSteps = 20;
        this._isDirty = false;       // Unsaved changes flag
    }

    /**
     * Start creating a new creature (or editing an existing one).
     * @param {object|null} existingCreature — null for new, creature data for edit
     */
    startCreating(existingCreature) {
        this._creature = existingCreature || this._newCreatureTemplate();
        this._selectedPart = null;
        this._undoStack = [];
        this._redoStack = [];
        this._isDirty = false;
    }

    /**
     * Create a blank creature template.
     */
    _newCreatureTemplate() {
        return {
            id: typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : this._uuidFallback(),
            name: '',
            createdAt: Date.now(),
            growthStage: 'baby',
            totalCareActions: 0,
            personality: 'playful',
            body: {
                torso: null,
                head: null,
                eyes: null,
                legs: [],
                tail: null,
                wings: null,
                extras: []
            },
            accessories: [],
            room: {
                wallColor: '#FFE4E1',
                items: []
            },
            needs: { hunger: 80, cleanliness: 90, energy: 70, happiness: 85 },
            lastActiveAt: Date.now(),
            favorites: {}
        };
    }

    /**
     * UUID v4 fallback for environments without crypto.randomUUID.
     */
    _uuidFallback() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Check if creature has minimum parts (torso + head) for "Done" button.
     */
    canFinish() {
        return this._creature &&
               this._creature.body.torso !== null &&
               this._creature.body.head !== null;
    }

    /**
     * Get the current creature data.
     */
    getCreature() {
        return this._creature;
    }

    /**
     * Whether there are unsaved changes.
     */
    isDirty() {
        return this._isDirty;
    }

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Animation updates for creator workspace
    }

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        // Draw creature on workspace canvas — placeholder
    }
}
