/**
 * SaveSystem - 3-slot save system with auto-save and manual save at altars
 * Dyslexia-friendly slot picker UI with large touch targets
 */
class SaveSystem {
    constructor() {
        this.slotCount = 3;
        this.currentSlot = null; // Which slot is actively being played (null = no active game)
        this.slotPrefix = 'catacombsCreeds_slot_';
        this.metaKey = 'catacombsCreeds_meta'; // Stores last played slot, playtime tracking

        // Notification system
        this.notification = null;
        this.notificationTimer = 0;

        // Slot picker UI state
        this.pickerActive = false;
        this.pickerMode = null; // 'save' or 'load'
        this.pickerSelectedIndex = 0;
        this.pickerCallback = null;

        // Load metadata (last played slot)
        this.loadMeta();
    }

    /** Load or initialize metadata */
    loadMeta() {
        try {
            const metaStr = localStorage.getItem(this.metaKey);
            if (metaStr) {
                this.meta = JSON.parse(metaStr);
            } else {
                this.meta = { lastSlot: null };
            }
        } catch (e) {
            console.error('Failed to load save metadata:', e);
            this.meta = { lastSlot: null };
        }
    }

    /** Save metadata (last played slot) */
    saveMeta() {
        try {
            localStorage.setItem(this.metaKey, JSON.stringify(this.meta));
        } catch (e) {
            console.error('Failed to save metadata:', e);
        }
    }

    /**
     * Save current game state to a slot.
     * @param {number} slotIndex - 0, 1, or 2
     * @param {object} gameState - Game state object from Game class
     * @returns {boolean} - true if saved successfully
     */
    saveToSlot(slotIndex, gameState) {
        if (slotIndex < 0 || slotIndex >= this.slotCount) {
            console.error('Invalid slot index:', slotIndex);
            return false;
        }

        // Build save data from game state
        const saveData = {
            // Player data
            playerX: gameState.player.x,
            playerY: gameState.player.y,
            playerDirection: gameState.player.direction,
            hp: gameState.player.hp,
            maxHp: gameState.player.maxHp,
            attack: gameState.player.attack,
            defense: gameState.player.defense,
            xp: gameState.player.xp,
            level: gameState.player.level,
            xpThreshold: gameState.player.xpThreshold,
            equipmentBonus: { ...gameState.player.equipmentBonus },

            // World state
            currentLevel: gameState.currentLevel,
            checkpointX: gameState.checkpointX,
            checkpointY: gameState.checkpointY,

            // Progression tracking
            tileState: gameState.map ? gameState.map.tileState : {},
            npcState: this._collectNPCState(gameState.npcs),
            questFlags: gameState.dialogue ? { ...gameState.dialogue.questFlags } : {},
            defeatedEnemies: Array.from(gameState.defeatedEnemies),
            pickedUpItems: gameState.worldItems
                .filter(i => i.pickedUp)
                .map(i => i.id),

            // Inventory
            inventory: gameState.inventory.toSaveData(),

            // Metadata
            timestamp: Date.now(),
            playtime: this._getPlaytime(slotIndex), // Track cumulative playtime
            version: '1.0'
        };

        // Attempt to save
        try {
            const key = this.slotPrefix + slotIndex;
            localStorage.setItem(key, JSON.stringify(saveData));

            // Update metadata
            this.currentSlot = slotIndex;
            this.meta.lastSlot = slotIndex;
            this.saveMeta();

            console.log(`Game saved to slot ${slotIndex}`);
            this.showNotification('Game Saved');
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            if (e.name === 'QuotaExceededError') {
                this.showNotification('Save failed: Storage full');
            } else {
                this.showNotification('Save failed');
            }
            return false;
        }
    }

    /**
     * Load game state from a slot.
     * @param {number} slotIndex - 0, 1, or 2
     * @returns {object|null} - Save data object, or null if slot is empty/corrupted
     */
    loadFromSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.slotCount) {
            console.error('Invalid slot index:', slotIndex);
            return null;
        }

        try {
            const key = this.slotPrefix + slotIndex;
            const saveStr = localStorage.getItem(key);

            if (!saveStr) {
                return null; // Empty slot
            }

            const saveData = JSON.parse(saveStr);

            // Basic validation
            if (!saveData.playerX || !saveData.currentLevel) {
                console.error('Corrupted save data in slot', slotIndex);
                return null;
            }

            // Mark this slot as active
            this.currentSlot = slotIndex;
            this.meta.lastSlot = slotIndex;
            this.saveMeta();

            console.log(`Game loaded from slot ${slotIndex}`);
            return saveData;
        } catch (e) {
            console.error('Failed to load from slot', slotIndex, ':', e);
            this.showNotification('Failed to load save');
            return null;
        }
    }

    /**
     * Get slot preview info for UI.
     * @param {number} slotIndex
     * @returns {object} - { isEmpty, levelName, playtime, progress, timestamp }
     */
    getSlotPreview(slotIndex) {
        try {
            const key = this.slotPrefix + slotIndex;
            const saveStr = localStorage.getItem(key);

            if (!saveStr) {
                return { isEmpty: true };
            }

            const data = JSON.parse(saveStr);

            // Calculate progress % (example: defeated enemies + opened chests + collected items)
            const totalTasks = 10; // Placeholder — can be calculated from level data
            const completed = (data.defeatedEnemies ? data.defeatedEnemies.length : 0) +
                              (data.pickedUpItems ? data.pickedUpItems.length : 0);
            const progress = Math.min(100, Math.floor((completed / totalTasks) * 100));

            return {
                isEmpty: false,
                levelName: this._getLevelName(data.currentLevel),
                playtime: this._formatPlaytime(data.playtime || 0),
                progress: progress,
                timestamp: data.timestamp,
                playerLevel: data.level || 1
            };
        } catch (e) {
            console.error('Failed to preview slot', slotIndex, ':', e);
            return { isEmpty: true, corrupted: true };
        }
    }

    /**
     * Delete a save slot.
     * @param {number} slotIndex
     */
    deleteSlot(slotIndex) {
        const key = this.slotPrefix + slotIndex;
        localStorage.removeItem(key);
        console.log(`Deleted save slot ${slotIndex}`);
    }

    /**
     * Check if any save slots exist.
     * @returns {boolean}
     */
    hasSaveData() {
        for (let i = 0; i < this.slotCount; i++) {
            const key = this.slotPrefix + i;
            if (localStorage.getItem(key)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Auto-save to the current active slot.
     * @param {object} gameState
     */
    autoSave(gameState) {
        if (this.currentSlot === null) {
            // No active slot — pick slot 0 by default for new games
            this.currentSlot = 0;
        }
        this.saveToSlot(this.currentSlot, gameState);
    }

    /**
     * Show save slot picker UI.
     * @param {string} mode - 'save' or 'load'
     * @param {function} callback - Called with selected slot index, or null if cancelled
     */
    showSlotPicker(mode, callback) {
        this.pickerActive = true;
        this.pickerMode = mode;
        this.pickerSelectedIndex = this.meta.lastSlot || 0;
        this.pickerCallback = callback;
    }

    /** Close slot picker without selecting */
    closeSlotPicker() {
        this.pickerActive = false;
        this.pickerMode = null;
        this.pickerCallback = null;
    }

    /**
     * Update slot picker input.
     * @param {InputHandler} input
     * @returns {number|null} - Selected slot index, or null if still picking
     */
    updateSlotPicker(input) {
        if (!this.pickerActive) return null;

        // Navigate up
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.pickerSelectedIndex = (this.pickerSelectedIndex - 1 + this.slotCount) % this.slotCount;
        }

        // Navigate down
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.pickerSelectedIndex = (this.pickerSelectedIndex + 1) % this.slotCount;
        }

        // Number keys (1-3)
        if (input.wasPressed('1')) this.pickerSelectedIndex = 0;
        if (input.wasPressed('2')) this.pickerSelectedIndex = 1;
        if (input.wasPressed('3')) this.pickerSelectedIndex = 2;

        // Confirm selection
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            const selected = this.pickerSelectedIndex;
            const callback = this.pickerCallback; // Save ref before close nullifies it
            this.closeSlotPicker();
            if (callback) {
                callback(selected);
            }
            return selected;
        }

        // Cancel
        if (input.wasPressed('Escape')) {
            const callback = this.pickerCallback; // Save ref before close nullifies it
            this.closeSlotPicker();
            if (callback) {
                callback(null);
            }
            return null;
        }

        return null;
    }

    /**
     * Render slot picker UI on canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    renderSlotPicker(ctx, canvas) {
        if (!this.pickerActive) return;

        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Box dimensions
        const boxW = 500;
        const boxH = 400;
        const boxX = centerX - boxW / 2;
        const boxY = centerY - boxH / 2;

        // Box background
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Box border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Title
        ctx.fillStyle = a.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 28px ${a.fontFamily}`;
        const title = this.pickerMode === 'save' ? 'Save Game' : 'Load Game';
        ctx.fillText(title, centerX, boxY + 40);

        // Render 3 save slots
        const slotHeight = 80;
        const slotStartY = boxY + 80;
        const slotSpacing = 90;

        for (let i = 0; i < this.slotCount; i++) {
            const slotY = slotStartY + i * slotSpacing;
            const isSelected = i === this.pickerSelectedIndex;
            const preview = this.getSlotPreview(i);

            this._renderSlot(ctx, centerX, slotY, i + 1, preview, isSelected);
        }

        // Bottom hint
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.fillStyle = a.textColor;
        ctx.globalAlpha = 0.6;
        ctx.fillText('Arrow Keys / 1-2-3 to select | Enter to confirm | Esc to cancel', centerX, boxY + boxH - 25);
        ctx.globalAlpha = 1.0;
    }

    /**
     * Render a single save slot.
     * @private
     */
    _renderSlot(ctx, centerX, y, slotNumber, preview, isSelected) {
        const a = CONFIG.ACCESSIBILITY;
        const slotW = 440;
        const slotH = 70;
        const slotX = centerX - slotW / 2;

        // Background (highlight if selected)
        if (isSelected) {
            ctx.fillStyle = CONFIG.COLORS.info;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(slotX, y - slotH / 2, slotW, slotH);
            ctx.globalAlpha = 1.0;
        }

        // Border
        ctx.strokeStyle = isSelected ? CONFIG.COLORS.info : CONFIG.COLORS.uiBorder;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(slotX, y - slotH / 2, slotW, slotH);

        // Slot number on left
        ctx.fillStyle = isSelected ? CONFIG.COLORS.info : a.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 24px ${a.fontFamily}`;
        ctx.fillText(`${slotNumber}.`, slotX + 15, y);

        // Slot content
        if (preview.isEmpty) {
            ctx.fillStyle = '#999999';
            ctx.font = `italic 18px ${a.fontFamily}`;
            ctx.fillText(preview.corrupted ? '[Corrupted]' : '[Empty]', slotX + 60, y);
        } else {
            // Level name
            ctx.fillStyle = a.textColor;
            ctx.font = `bold 20px ${a.fontFamily}`;
            ctx.fillText(preview.levelName, slotX + 60, y - 15);

            // Details: playtime, level, progress
            ctx.font = `16px ${a.fontFamily}`;
            ctx.fillStyle = CONFIG.COLORS.info;
            ctx.fillText(
                `Lvl ${preview.playerLevel} | ${preview.playtime} | ${preview.progress}% complete`,
                slotX + 60,
                y + 12
            );

            // Timestamp (right-aligned)
            ctx.textAlign = 'right';
            ctx.fillStyle = '#999999';
            ctx.font = `14px ${a.fontFamily}`;
            ctx.fillText(this._formatTimestamp(preview.timestamp), slotX + slotW - 15, y + 12);
        }
    }

    /** Show a toast notification */
    showNotification(message) {
        this.notification = message;
        this.notificationTimer = 2000; // 2 seconds
    }

    /** Update notification timer */
    updateNotifications(deltaTime) {
        if (this.notification && this.notificationTimer > 0) {
            this.notificationTimer -= deltaTime;
            if (this.notificationTimer <= 0) {
                this.notification = null;
            }
        }
    }

    /** Render notification toast in top-right corner */
    renderNotification(ctx, canvas) {
        if (!this.notification) return;

        const a = CONFIG.ACCESSIBILITY;
        const padding = 20;
        const boxPadding = 15;

        // Measure text
        ctx.font = `bold 18px ${a.fontFamily}`;
        const textWidth = ctx.measureText(this.notification).width;
        const boxW = textWidth + boxPadding * 2;
        const boxH = 50;
        const boxX = canvas.width - boxW - padding;
        const boxY = padding;

        // Background (dark semi-transparent)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Border
        ctx.strokeStyle = CONFIG.COLORS.success;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Text
        ctx.fillStyle = CONFIG.COLORS.success;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.notification, boxX + boxW / 2, boxY + boxH / 2);
    }

    // --- Helper methods ---

    /** Collect NPC state for saving */
    _collectNPCState(npcs) {
        const state = {};
        for (const npc of npcs) {
            state[npc.id] = {
                hasBeenTalkedTo: npc.hasBeenTalkedTo || false
            };
        }
        return state;
    }

    /** Get cumulative playtime for a slot (placeholder) */
    _getPlaytime(slotIndex) {
        // TODO: Track playtime properly (requires game to track session start time)
        const preview = this.getSlotPreview(slotIndex);
        return preview.isEmpty ? 0 : (preview.playtime || 0);
    }

    /** Format playtime in minutes */
    _formatPlaytime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        }
    }

    /** Format timestamp as relative time or date */
    _formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        // Fallback to date string
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    /** Get level name from level number */
    _getLevelName(levelNum) {
        const names = {
            1: 'Level 1: The Catacombs',
            2: 'Level 2: Hidden Passage',
            3: 'Level 3: Sacred Chamber',
            4: 'Level 4: Guardian\'s Trial',
            5: 'Level 5: Final Confrontation'
        };
        return names[levelNum] || `Level ${levelNum}`;
    }
}
