/**
 * save.js — SaveManager (auto-save, gallery, backup).
 * Single localStorage key: 'lizzies-petstore-save'.
 * Backup key: 'lizzies-petstore-save-backup' updated every 5th save.
 */

class SaveManager {
    constructor() {
        this._key = 'lizzies-petstore-save';
        this._backupKey = 'lizzies-petstore-save-backup';
        this._saveCount = 0;
        this._saveTimer = null;
        this._debounceMs = 2000;
    }

    /**
     * Default save data structure. Every key that game.js reads must exist here.
     */
    _defaults() {
        return {
            schemaVersion: 1,
            creatures: [],
            settings: {
                volume: 80,
                muted: false
            },
            tutorialComplete: false,
            milestones: {},
            parkVisits: 0,
            totalCreaturesCreated: 0,
            unlockedParts: [],
            unlockedAccessories: [],
            unlockedThemes: [],
            savedOutfits: {}
        };
    }

    /**
     * Load save data, merging with defaults for forward-compatibility.
     */
    load() {
        try {
            const raw = localStorage.getItem(this._key);
            if (!raw) return this._defaults();

            const data = JSON.parse(raw);

            // Schema migration placeholder
            if (data.schemaVersion < 1) {
                // Future migrations go here
            }

            // Merge with defaults to ensure all keys exist
            const defaults = this._defaults();
            return { ...defaults, ...data, settings: { ...defaults.settings, ...(data.settings || {}) } };
        } catch (e) {
            console.warn('SaveManager: failed to load, using defaults', e);
            return this._defaults();
        }
    }

    /**
     * Save data to localStorage. Shows toast on quota error.
     */
    save(data) {
        try {
            localStorage.setItem(this._key, JSON.stringify(data));
            this._saveCount++;

            // Backup every 5th save
            if (this._saveCount % 5 === 0) {
                localStorage.setItem(this._backupKey, JSON.stringify(data));
            }
        } catch (e) {
            // Quota exceeded — show toast
            this._showToast('Could not save! Storage may be full.');
            console.error('SaveManager: quota error', e);
        }
    }

    /**
     * Debounced auto-save. Call on every creature/room change.
     */
    autoSave(data) {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.save(data);
        }, this._debounceMs);
    }

    /**
     * Add a creature to save data.
     */
    addCreature(creature) {
        const data = this.load();
        if (data.creatures.length >= 20) {
            this._showToast('Your petstore is full! (20 creatures max)');
            return false;
        }
        data.creatures.push(creature);
        data.totalCreaturesCreated++;
        this.save(data);
        return true;
    }

    /**
     * Update a creature in save data by ID.
     */
    updateCreature(id, updates) {
        const data = this.load();
        const idx = data.creatures.findIndex(c => c.id === id);
        if (idx === -1) return;
        data.creatures[idx] = { ...data.creatures[idx], ...updates };
        this.autoSave(data);
    }

    /**
     * Remove a creature from save data by ID.
     */
    removeCreature(id) {
        const data = this.load();
        data.creatures = data.creatures.filter(c => c.id !== id);
        this.save(data);
    }

    /**
     * Get all creatures.
     */
    getCreatures() {
        return this.load().creatures;
    }

    /**
     * Get a single creature by ID.
     */
    getCreature(id) {
        return this.load().creatures.find(c => c.id === id) || null;
    }

    /**
     * Show a user-visible toast message.
     */
    _showToast(message) {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;
        msgEl.textContent = message;
        toast.setAttribute('aria-hidden', 'false');
        toast.classList.add('open');
        setTimeout(() => {
            toast.classList.remove('open');
            toast.setAttribute('aria-hidden', 'true');
        }, 3000);
    }
}
