/**
 * InventorySystem - Item management, equipment, and inventory UI
 *
 * Session 6: Full inventory with grid UI, equipment slots, consumable usage,
 * quest item tracking, and save/load serialization.
 */
class InventorySystem {
    constructor() {
        // Item slots: array of { id, quantity } for stackables, { id } for non-stackable
        this.items = [];
        this.maxSlots = 20; // Quest items don't count toward this

        // Equipment: slot-based
        this.equipped = { shield: null, accessory: null };

        // Item definitions (loaded from items.json)
        this.itemDefs = {};

        // Inventory UI state
        this.isOpen = false;
        this.cursorIndex = 0;    // Grid cursor position (0-19)
        this.subMenuOpen = false;
        this.subMenuIndex = 0;
        this.subMenuActions = []; // e.g. ['Use', 'Examine'] or ['Equip', 'Examine']
        this.selectedItem = null; // Currently selected item for sub-menu

        // Quest items shown separately — we still store them in this.items
        // but they don't count toward maxSlots

        // Item notification queue
        this.notifications = []; // [{ text, timer }]
        this.NOTIFICATION_DURATION = 2000; // 2 seconds

        // UI layout constants
        this.GRID_COLS = 4;
        this.GRID_ROWS = 5;
        this.SLOT_SIZE = 60;
        this.SLOT_GAP = 6;
    }

    /**
     * Load item definitions from JSON.
     */
    async load() {
        try {
            const response = await fetch('data/items.json');
            if (!response.ok) {
                throw new Error(`Failed to load items.json: ${response.status}`);
            }
            this.itemDefs = await response.json();
            console.log(`Loaded ${Object.keys(this.itemDefs).length} item definition(s)`);
        } catch (err) {
            console.error('Failed to load item definitions:', err);
            this.itemDefs = {};
        }
    }

    /**
     * Get item definition by ID.
     */
    getDef(itemId) {
        return this.itemDefs[itemId] || null;
    }

    /**
     * Add an item to inventory.
     * @returns {boolean} true if added, false if inventory full
     */
    addItem(itemId, quantity) {
        if (quantity === undefined) quantity = 1;
        const def = this.getDef(itemId);
        if (!def) {
            console.warn(`Unknown item: ${itemId}`);
            return false;
        }

        // Stackable items: find existing stack and add to it
        if (def.stackable) {
            const existing = this.items.find(i => i.id === itemId);
            if (existing) {
                existing.quantity = Math.min((existing.quantity || 1) + quantity, def.maxStack || 99);
                return true;
            }
        }

        // Check capacity (quest items don't count)
        if (def.category !== 'quest' && this.getNonQuestCount() >= this.maxSlots) {
            console.log('Inventory full!');
            return false;
        }

        // Add new slot
        if (def.stackable) {
            this.items.push({ id: itemId, quantity: quantity });
        } else {
            this.items.push({ id: itemId });
        }
        return true;
    }

    /**
     * Remove an item (or reduce stack) from inventory.
     * @returns {boolean} true if removed
     */
    removeItem(itemId, quantity) {
        if (quantity === undefined) quantity = 1;
        const index = this.items.findIndex(i => i.id === itemId);
        if (index === -1) return false;

        const slot = this.items[index];
        const def = this.getDef(itemId);

        if (def && def.stackable && slot.quantity > quantity) {
            slot.quantity -= quantity;
        } else {
            this.items.splice(index, 1);
        }
        return true;
    }

    /**
     * Check if player has an item.
     */
    hasItem(itemId) {
        return this.items.some(i => i.id === itemId);
    }

    /**
     * Get total quantity of an item.
     */
    getItemCount(itemId) {
        const slot = this.items.find(i => i.id === itemId);
        if (!slot) return 0;
        return slot.quantity || 1;
    }

    /**
     * Use a consumable item on the player.
     * @returns {Object|null} { message, healed } or null if not usable
     */
    useItem(itemId, player) {
        const def = this.getDef(itemId);
        if (!def || def.category !== 'consumable') return null;
        if (!this.hasItem(itemId)) return null;

        let result = null;

        if (def.effect) {
            switch (def.effect.type) {
                case 'heal': {
                    const before = player.hp;
                    player.heal(def.effect.amount);
                    const healed = player.hp - before;
                    result = { message: `Used ${def.name}! Healed ${healed} HP.`, healed: healed };
                    break;
                }
                case 'fullHeal': {
                    const before = player.hp;
                    player.hp = player.maxHp;
                    const healed = player.hp - before;
                    result = { message: `Used ${def.name}! Fully healed!`, healed: healed };
                    break;
                }
            }
        }

        if (result) {
            this.removeItem(itemId, 1);
        }
        return result;
    }

    /**
     * Use a consumable during combat (operates on combat HP snapshot).
     * @returns {Object|null} { message, healed }
     */
    useItemInCombat(itemId, combat) {
        const def = this.getDef(itemId);
        if (!def || def.category !== 'consumable') return null;
        if (!this.hasItem(itemId)) return null;

        let result = null;

        if (def.effect) {
            switch (def.effect.type) {
                case 'heal': {
                    const before = combat.playerHP;
                    combat.playerHP = Math.min(combat.playerMaxHP, combat.playerHP + def.effect.amount);
                    const healed = combat.playerHP - before;
                    result = { message: `Used ${def.name}! Healed ${healed} HP.`, healed: healed };
                    break;
                }
                case 'fullHeal': {
                    const before = combat.playerHP;
                    combat.playerHP = combat.playerMaxHP;
                    const healed = combat.playerHP - before;
                    result = { message: `Used ${def.name}! Fully healed!`, healed: healed };
                    break;
                }
            }
        }

        if (result) {
            this.removeItem(itemId, 1);
        }
        return result;
    }

    /**
     * Equip an equipment item. Unequips the current item in that slot first.
     */
    equipItem(itemId, player) {
        const def = this.getDef(itemId);
        if (!def || def.category !== 'equipment' || !def.slot) return false;
        if (!this.hasItem(itemId)) return false;

        // Unequip current item in that slot (if any)
        if (this.equipped[def.slot]) {
            this.unequipItem(def.slot, player);
        }

        // Remove from inventory and place in equipment slot
        this.removeItem(itemId);
        this.equipped[def.slot] = itemId;

        // Apply stat bonuses
        if (def.statBonus) {
            for (const stat of Object.keys(def.statBonus)) {
                if (player.equipmentBonus[stat] !== undefined) {
                    player.equipmentBonus[stat] += def.statBonus[stat];
                }
            }
        }

        console.log(`Equipped ${def.name} in ${def.slot} slot`);
        return true;
    }

    /**
     * Unequip an item from a slot and return it to inventory.
     */
    unequipItem(slot, player) {
        const itemId = this.equipped[slot];
        if (!itemId) return false;

        const def = this.getDef(itemId);
        if (!def) return false;

        // Remove stat bonuses
        if (def.statBonus) {
            for (const stat of Object.keys(def.statBonus)) {
                if (player.equipmentBonus[stat] !== undefined) {
                    player.equipmentBonus[stat] -= def.statBonus[stat];
                }
            }
        }

        // Return to inventory
        this.equipped[slot] = null;
        this.addItem(itemId);

        console.log(`Unequipped ${def.name} from ${slot} slot`);
        return true;
    }

    /**
     * Get list of usable consumable items (for combat item sub-menu).
     * @returns {Array} [{ id, name, quantity, def }]
     */
    getUsableItems() {
        const usable = [];
        for (const slot of this.items) {
            const def = this.getDef(slot.id);
            if (def && def.category === 'consumable') {
                usable.push({
                    id: slot.id,
                    name: def.name,
                    quantity: slot.quantity || 1,
                    def: def
                });
            }
        }
        return usable;
    }

    /**
     * Get count of non-quest items in inventory.
     */
    getNonQuestCount() {
        let count = 0;
        for (const slot of this.items) {
            const def = this.getDef(slot.id);
            if (def && def.category !== 'quest') {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if non-quest inventory is full.
     */
    isFull() {
        return this.getNonQuestCount() >= this.maxSlots;
    }

    /**
     * Show an item notification popup.
     */
    showNotification(text) {
        this.notifications.push({ text: text, timer: this.NOTIFICATION_DURATION });
    }

    /**
     * Update notifications (tick down timers).
     */
    updateNotifications(deltaTime) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            this.notifications[i].timer -= deltaTime;
            if (this.notifications[i].timer <= 0) {
                this.notifications.splice(i, 1);
            }
        }
    }

    // ── Inventory UI ──────────────────────────────────────────────────

    open() {
        this.isOpen = true;
        this.cursorIndex = 0;
        this.subMenuOpen = false;
        this.selectedItem = null;
    }

    close() {
        this.isOpen = false;
        this.subMenuOpen = false;
        this.selectedItem = null;
    }

    /**
     * Get visible items split into regular and quest lists.
     */
    getDisplayItems() {
        const regular = [];
        const quest = [];
        for (const slot of this.items) {
            const def = this.getDef(slot.id);
            if (!def) continue;
            if (def.category === 'quest') {
                quest.push(slot);
            } else {
                regular.push(slot);
            }
        }
        return { regular, quest };
    }

    /**
     * Update inventory UI from input.
     * @param {InputHandler} input
     * @param {Player} player
     * @returns {string|null} 'close' if inventory should close
     */
    update(input, player) {
        if (!this.isOpen) return null;

        // Close inventory
        if (input.wasPressed('i') || input.wasPressed('I') || input.wasPressed('Escape')) {
            this.close();
            return 'close';
        }

        if (this.subMenuOpen) {
            return this.updateSubMenu(input, player);
        }

        // Navigate grid
        const { regular } = this.getDisplayItems();
        const maxIndex = Math.max(0, regular.length - 1);

        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.cursorIndex = Math.max(0, this.cursorIndex - this.GRID_COLS);
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.cursorIndex = Math.min(maxIndex, this.cursorIndex + this.GRID_COLS);
        }
        if (input.wasPressed('ArrowLeft') || input.wasPressed('a') || input.wasPressed('A')) {
            this.cursorIndex = Math.max(0, this.cursorIndex - 1);
        }
        if (input.wasPressed('ArrowRight') || input.wasPressed('d') || input.wasPressed('D')) {
            this.cursorIndex = Math.min(maxIndex, this.cursorIndex + 1);
        }

        // Select item
        if (input.wasPressed(' ') || input.wasPressed('Enter')) {
            if (this.cursorIndex < regular.length) {
                const slot = regular[this.cursorIndex];
                const def = this.getDef(slot.id);
                if (def) {
                    this.openSubMenu(slot, def);
                }
            }
        }

        return null;
    }

    openSubMenu(slot, def) {
        this.selectedItem = slot;
        this.subMenuOpen = true;
        this.subMenuIndex = 0;

        // Build actions based on item category
        this.subMenuActions = [];
        if (def.category === 'consumable') {
            this.subMenuActions.push('Use');
        }
        if (def.category === 'equipment') {
            this.subMenuActions.push('Equip');
        }
        this.subMenuActions.push('Examine');
    }

    updateSubMenu(input, player) {
        // Close sub-menu
        if (input.wasPressed('Escape')) {
            this.subMenuOpen = false;
            this.selectedItem = null;
            return null;
        }

        // Navigate
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.subMenuIndex = (this.subMenuIndex - 1 + this.subMenuActions.length) % this.subMenuActions.length;
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.subMenuIndex = (this.subMenuIndex + 1) % this.subMenuActions.length;
        }

        // Select action
        if (input.wasPressed(' ') || input.wasPressed('Enter')) {
            const action = this.subMenuActions[this.subMenuIndex];
            this.executeSubMenuAction(action, player);
        }

        return null;
    }

    executeSubMenuAction(action, player) {
        if (!this.selectedItem) return;

        const itemId = this.selectedItem.id;
        const def = this.getDef(itemId);

        switch (action) {
            case 'Use': {
                const result = this.useItem(itemId, player);
                if (result) {
                    this.showNotification(result.message);
                }
                this.subMenuOpen = false;
                this.selectedItem = null;
                break;
            }
            case 'Equip': {
                this.equipItem(itemId, player);
                this.showNotification(`Equipped ${def.name}!`);
                this.subMenuOpen = false;
                this.selectedItem = null;
                break;
            }
            case 'Examine': {
                if (def) {
                    this.showNotification(def.description);
                }
                this.subMenuOpen = false;
                this.selectedItem = null;
                break;
            }
        }
    }

    // ── Rendering ─────────────────────────────────────────────────────

    /**
     * Render the full inventory screen.
     */
    render(ctx, canvas) {
        if (!this.isOpen) return;

        const a = CONFIG.ACCESSIBILITY;
        const w = canvas.width;
        const h = canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        // Inventory panel
        const panelW = 480;
        const panelH = 480;
        const panelX = (w - panelW) / 2;
        const panelY = (h - panelH) / 2;

        // Panel background
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Title
        ctx.fillStyle = a.textColor;
        ctx.font = `bold 22px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Inventory', w / 2, panelY + 10);

        // Item grid
        const { regular, quest } = this.getDisplayItems();
        const gridX = panelX + 20;
        const gridY = panelY + 45;

        this.drawItemGrid(ctx, regular, gridX, gridY, a);

        // Equipped items sidebar
        this.drawEquipmentSidebar(ctx, panelX + panelW - 150, gridY, a);

        // Quest items section (below grid)
        const questY = gridY + this.GRID_ROWS * (this.SLOT_SIZE + this.SLOT_GAP) + 10;
        this.drawQuestItems(ctx, quest, gridX, questY, a);

        // Sub-menu (if open)
        if (this.subMenuOpen && this.selectedItem) {
            this.drawSubMenu(ctx, a);
        }

        // Controls hint
        ctx.fillStyle = '#888888';
        ctx.font = `12px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Arrow Keys to navigate, Space to select, I or Esc to close', w / 2, panelY + panelH - 8);
    }

    drawItemGrid(ctx, items, startX, startY, a) {
        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                const index = row * this.GRID_COLS + col;
                const slotX = startX + col * (this.SLOT_SIZE + this.SLOT_GAP);
                const slotY = startY + row * (this.SLOT_SIZE + this.SLOT_GAP);
                const isSelected = index === this.cursorIndex && !this.subMenuOpen;

                // Slot background
                ctx.fillStyle = isSelected ? 'rgba(74, 111, 165, 0.4)' : 'rgba(0, 0, 0, 0.15)';
                ctx.fillRect(slotX, slotY, this.SLOT_SIZE, this.SLOT_SIZE);

                // Slot border
                ctx.strokeStyle = isSelected ? '#ffd700' : CONFIG.COLORS.uiBorder;
                ctx.lineWidth = isSelected ? 3 : 1;
                ctx.strokeRect(slotX, slotY, this.SLOT_SIZE, this.SLOT_SIZE);

                // Draw item if slot is filled
                if (index < items.length) {
                    const slot = items[index];
                    const def = this.getDef(slot.id);
                    if (def) {
                        this.drawItemIcon(ctx, def, slotX, slotY, slot.quantity);
                    }
                }
            }
        }

        // Draw item name/description below grid for selected item
        const { regular } = this.getDisplayItems();
        if (this.cursorIndex < regular.length && !this.subMenuOpen) {
            const slot = regular[this.cursorIndex];
            const def = this.getDef(slot.id);
            if (def) {
                const descY = startY + this.GRID_ROWS * (this.SLOT_SIZE + this.SLOT_GAP) - 8;
                ctx.fillStyle = a.textColor;
                ctx.font = `bold 14px ${a.fontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(def.name, startX, descY);

                ctx.font = `12px ${a.fontFamily}`;
                ctx.fillStyle = '#666666';
                ctx.fillText(def.description, startX, descY + 18);
            }
        }
    }

    drawItemIcon(ctx, def, x, y, quantity) {
        const size = this.SLOT_SIZE;
        const iconSize = 28;
        const iconX = x + (size - iconSize) / 2;
        const iconY = y + 6;

        // Colored square icon
        ctx.fillStyle = def.color || '#888888';
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        // Category indicator
        switch (def.category) {
            case 'consumable':
                // Small + symbol
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(iconX + iconSize / 2 - 1, iconY + 4, 3, iconSize - 8);
                ctx.fillRect(iconX + 4, iconY + iconSize / 2 - 1, iconSize - 8, 3);
                break;
            case 'equipment':
                // Small shield shape
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(iconX + iconSize / 2, iconY + 3);
                ctx.lineTo(iconX + iconSize - 4, iconY + 8);
                ctx.lineTo(iconX + iconSize / 2, iconY + iconSize - 3);
                ctx.lineTo(iconX + 4, iconY + 8);
                ctx.closePath();
                ctx.stroke();
                break;
            case 'collectible':
                // Small star
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 14px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2605', iconX + iconSize / 2, iconY + iconSize / 2);
                break;
        }

        // Item name (abbreviated)
        const shortName = def.name.length > 8 ? def.name.substring(0, 7) + '.' : def.name;
        ctx.fillStyle = '#2C2416';
        ctx.font = `bold 10px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(shortName, x + size / 2, iconY + iconSize + 2);

        // Quantity badge (for stackables with quantity > 1)
        if (quantity && quantity > 1) {
            const badgeX = x + size - 14;
            const badgeY = y + 2;
            ctx.fillStyle = '#333333';
            ctx.fillRect(badgeX - 2, badgeY, 16, 14);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 11px ${CONFIG.ACCESSIBILITY.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String(quantity), badgeX + 6, badgeY + 1);
        }
    }

    drawEquipmentSidebar(ctx, x, y, a) {
        ctx.fillStyle = a.textColor;
        ctx.font = `bold 14px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Equipped', x, y);

        const slots = ['shield', 'accessory'];
        const slotLabels = { shield: 'Shield', accessory: 'Accessory' };

        for (let i = 0; i < slots.length; i++) {
            const slotName = slots[i];
            const slotY = y + 24 + i * 70;

            // Slot label
            ctx.fillStyle = '#666666';
            ctx.font = `11px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(slotLabels[slotName], x, slotY);

            // Slot box
            const boxY = slotY + 14;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(x, boxY, this.SLOT_SIZE, this.SLOT_SIZE - 10);
            ctx.strokeStyle = CONFIG.COLORS.uiBorder;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, boxY, this.SLOT_SIZE, this.SLOT_SIZE - 10);

            // Equipped item
            const equippedId = this.equipped[slotName];
            if (equippedId) {
                const def = this.getDef(equippedId);
                if (def) {
                    // Small colored square
                    ctx.fillStyle = def.color || '#888888';
                    ctx.fillRect(x + 8, boxY + 5, 20, 20);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 8, boxY + 5, 20, 20);

                    // Name next to it
                    ctx.fillStyle = a.textColor;
                    ctx.font = `10px ${a.fontFamily}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(def.name, x + 32, boxY + 15);

                    // Stat bonus
                    if (def.statBonus) {
                        ctx.fillStyle = CONFIG.COLORS.success;
                        ctx.font = `9px ${a.fontFamily}`;
                        let bonusText = Object.entries(def.statBonus)
                            .map(([k, v]) => `+${v} ${k.substring(0, 3).toUpperCase()}`)
                            .join(' ');
                        ctx.fillText(bonusText, x + 32, boxY + 30);
                    }
                }
            } else {
                ctx.fillStyle = '#999999';
                ctx.font = `10px ${a.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Empty', x + this.SLOT_SIZE / 2, boxY + (this.SLOT_SIZE - 10) / 2);
            }
        }
    }

    drawQuestItems(ctx, questItems, x, y, a) {
        if (questItems.length === 0) return;

        ctx.fillStyle = a.textColor;
        ctx.font = `bold 12px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Quest Items:', x, y);

        let qx = x;
        for (let i = 0; i < questItems.length; i++) {
            const def = this.getDef(questItems[i].id);
            if (!def) continue;

            ctx.fillStyle = def.color || '#ffd700';
            ctx.fillRect(qx, y + 18, 14, 14);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(qx, y + 18, 14, 14);

            ctx.fillStyle = a.textColor;
            ctx.font = `11px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(def.name, qx + 18, y + 20);

            qx += ctx.measureText(def.name).width + 30;
        }
    }

    drawSubMenu(ctx, a) {
        if (!this.selectedItem) return;

        const def = this.getDef(this.selectedItem.id);
        if (!def) return;

        // Position sub-menu near center
        const menuW = 140;
        const menuH = 30 + this.subMenuActions.length * 36;
        const menuX = (ctx.canvas.width - menuW) / 2;
        const menuY = (ctx.canvas.height - menuH) / 2;

        // Background
        ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(menuX, menuY, menuW, menuH);

        // Item name header
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold 13px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(def.name, menuX + menuW / 2, menuY + 6);

        // Action buttons
        for (let i = 0; i < this.subMenuActions.length; i++) {
            const btnY = menuY + 28 + i * 36;
            const isSelected = i === this.subMenuIndex;

            ctx.fillStyle = isSelected ? CONFIG.COLORS.info : 'rgba(60, 60, 80, 0.8)';
            ctx.fillRect(menuX + 8, btnY, menuW - 16, 30);
            ctx.strokeStyle = isSelected ? '#ffffff' : '#555555';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(menuX + 8, btnY, menuW - 16, 30);

            ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
            ctx.font = `${isSelected ? 'bold ' : ''}14px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const arrow = isSelected ? '\u25B6 ' : '';
            ctx.fillText(arrow + this.subMenuActions[i], menuX + menuW / 2, btnY + 15);
        }
    }

    /**
     * Render item notification popups at top of screen.
     */
    renderNotifications(ctx, canvas) {
        if (this.notifications.length === 0) return;

        const a = CONFIG.ACCESSIBILITY;
        const w = canvas.width;

        for (let i = 0; i < this.notifications.length; i++) {
            const notif = this.notifications[i];
            const alpha = Math.min(1, notif.timer / 400); // Fade out in last 400ms
            const y = 10 + i * 32;

            ctx.globalAlpha = alpha;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.font = `bold 16px ${a.fontFamily}`;
            const textWidth = ctx.measureText(notif.text).width;
            const padX = 16;
            const bgW = textWidth + padX * 2;
            const bgH = 26;
            const bgX = (w - bgW) / 2;

            ctx.fillRect(bgX, y, bgW, bgH);

            // Gold border
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(bgX, y, bgW, bgH);

            // Text
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notif.text, w / 2, y + bgH / 2);

            ctx.globalAlpha = 1;
        }
    }

    // ── Serialization ─────────────────────────────────────────────────

    toSaveData() {
        return {
            items: this.items.map(slot => ({ ...slot })),
            equipped: { ...this.equipped }
        };
    }

    fromSaveData(data, player) {
        if (!data) return;

        this.items = (data.items || []).map(slot => ({ ...slot }));

        // Restore equipment and re-apply stat bonuses
        this.equipped = { shield: null, accessory: null };
        if (data.equipped) {
            for (const slot of Object.keys(data.equipped)) {
                const itemId = data.equipped[slot];
                if (itemId) {
                    this.equipped[slot] = itemId;
                    // Re-apply stat bonuses
                    const def = this.getDef(itemId);
                    if (def && def.statBonus && player) {
                        for (const stat of Object.keys(def.statBonus)) {
                            if (player.equipmentBonus[stat] !== undefined) {
                                player.equipmentBonus[stat] += def.statBonus[stat];
                            }
                        }
                    }
                }
            }
        }
    }
}

// Expose globally
window.InventorySystem = InventorySystem;
