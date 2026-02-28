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
        this._toastTimer = null;
        this._debounceMs = 2000;
        this._cache = null;
    }

    /**
     * Cancel all pending timers (timer lifecycle pattern).
     */
    cancel() {
        clearTimeout(this._saveTimer);
        this._saveTimer = null;
        clearTimeout(this._toastTimer);
        this._toastTimer = null;
    }

    /**
     * Default save data structure. Every key that game.js reads must exist here.
     */
    _defaults() {
        return {
            schemaVersion: 1,
            creatures: [],
            lastActiveCreatureId: null,
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
        if (this._cache) return this._cache;

        try {
            const raw = localStorage.getItem(this._key);
            if (!raw) {
                this._cache = this._defaults();
                return this._cache;
            }

            const data = JSON.parse(raw);

            // Schema migration placeholder
            if (data.schemaVersion < 1) {
                // Future migrations go here
            }

            // Merge with defaults to ensure all keys exist
            const defaults = this._defaults();
            this._cache = {
                ...defaults,
                ...data,
                settings: { ...defaults.settings, ...(data.settings || {}) }
            };
            return this._cache;
        } catch (e) {
            console.warn('SaveManager: failed to load, using defaults', e);
            this._cache = this._defaults();
            return this._cache;
        }
    }

    /**
     * Save data to localStorage. Shows toast on quota error.
     */
    save(data) {
        this._cache = null; // invalidate cache
        try {
            localStorage.setItem(this._key, JSON.stringify(data));
            this._saveCount++;

            // Backup every 5th save
            if (this._saveCount % 5 === 0) {
                localStorage.setItem(this._backupKey, JSON.stringify(data));
            }
        } catch (e) {
            // Quota exceeded - show toast
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
     * Add a creature to save data. Returns false if gallery is full.
     */
    addCreature(creature) {
        const data = this.load();
        if (data.creatures.length >= 20) {
            this._showToast('Your petstore is full! (20 creatures max)');
            return false;
        }
        data.creatures.push(creature);
        data.totalCreaturesCreated++;
        data.lastActiveCreatureId = creature.id;
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
        // Clear lastActiveCreatureId if we deleted it
        if (data.lastActiveCreatureId === id) {
            data.lastActiveCreatureId = data.creatures.length > 0
                ? data.creatures[0].id
                : null;
        }
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
     * Get settings.
     */
    getSettings() {
        return this.load().settings;
    }

    /**
     * Update settings (partial merge).
     */
    updateSettings(updates) {
        const data = this.load();
        data.settings = { ...data.settings, ...updates };
        this.save(data);
    }

    /**
     * Set the last active creature ID.
     */
    setLastActiveCreature(id) {
        const data = this.load();
        data.lastActiveCreatureId = id;
        this.autoSave(data);
    }

    /**
     * Show a user-visible toast message.
     */
    _showToast(message) {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;

        // Clear any pending toast dismiss
        clearTimeout(this._toastTimer);

        msgEl.textContent = message;
        toast.setAttribute('aria-hidden', 'false');
        toast.classList.add('open');

        this._toastTimer = setTimeout(() => {
            toast.classList.remove('open');
            toast.setAttribute('aria-hidden', 'true');
            this._toastTimer = null;
        }, 3000);
    }
}
