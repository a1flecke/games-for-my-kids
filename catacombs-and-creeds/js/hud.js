/**
 * HUD - Heads-up display showing health, objective, progress, and quick-use items
 * Dyslexia-friendly with OpenDyslexic font and clear visual hierarchy
 */
class HUD {
    constructor() {
        // Notification queue (for toast messages)
        this.notifications = [];
    }

    /**
     * Render the complete HUD.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {object} gameState - Full game state with player, inventory, dialogue, etc.
     */
    render(ctx, canvas, gameState) {
        if (!gameState.player) return;

        this.renderHealthBar(ctx, gameState.player);
        this.renderObjective(ctx, canvas, gameState);
        this.renderLevelProgress(ctx, canvas, gameState);
        this.renderQuickUseSlots(ctx, gameState.inventory);
        this.renderNotifications(ctx, canvas);
    }

    /**
     * Render health bar in top-left corner.
     */
    renderHealthBar(ctx, player) {
        const a = CONFIG.ACCESSIBILITY;
        const x = 20;
        const y = 20;
        const barWidth = 200;
        const barHeight = 30;

        // Background (dark)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health bar fill (red gradient)
        const hpPercent = player.hp / player.maxHp;
        const fillWidth = barWidth * hpPercent;

        const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
        gradient.addColorStop(0, CONFIG.COLORS.danger);
        gradient.addColorStop(1, '#ff6666');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, fillWidth, barHeight);

        // Border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // HP text (centered)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${a.fontSize}px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${player.hp} / ${player.maxHp} HP`, x + barWidth / 2, y + barHeight / 2);
        ctx.shadowBlur = 0;

        // Level indicator below health bar
        ctx.font = `14px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = a.textColor;
        ctx.fillText(`Lvl ${player.level}`, x, y + barHeight + 18);

        // XP progress
        const xpPercent = player.xp / player.xpThreshold;
        const xpBarWidth = 200;
        const xpBarHeight = 8;
        const xpY = y + barHeight + 25;

        // XP bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, xpY, xpBarWidth, xpBarHeight);

        // XP bar fill (gold)
        ctx.fillStyle = CONFIG.COLORS.success;
        ctx.fillRect(x, xpY, xpBarWidth * xpPercent, xpBarHeight);

        // XP bar border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, xpY, xpBarWidth, xpBarHeight);
    }

    /**
     * Render current objective in top-center.
     */
    renderObjective(ctx, canvas, gameState) {
        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;
        const y = 20;

        // Determine objective based on quest flags
        const objective = this._getCurrentObjective(gameState);

        if (!objective) return;

        // Measure text for background box
        ctx.font = `bold 18px ${a.fontFamily}`;
        const textWidth = ctx.measureText(objective).width;
        const boxPadding = 15;
        const boxWidth = textWidth + boxPadding * 2;
        const boxHeight = 40;

        // Background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(centerX - boxWidth / 2, y, boxWidth, boxHeight);

        // Border
        ctx.strokeStyle = CONFIG.COLORS.info;
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - boxWidth / 2, y, boxWidth, boxHeight);

        // Objective text
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(objective, centerX, y + boxHeight / 2);
    }

    /**
     * Render level progress in top-right corner.
     */
    renderLevelProgress(ctx, canvas, gameState) {
        const a = CONFIG.ACCESSIBILITY;
        const padding = 20;
        const y = 20;

        // Calculate progress based on apostle coins collected
        const coinsCollected = this._countApostleCoins(gameState);
        const totalCoins = 3;
        const progressText = `Coins: ${coinsCollected}/${totalCoins}`;

        // Measure text for background box
        ctx.font = `bold ${a.fontSize}px ${a.fontFamily}`;
        const textWidth = ctx.measureText(progressText).width;
        const boxPadding = 12;
        const boxWidth = textWidth + boxPadding * 2;
        const boxHeight = 35;
        const boxX = canvas.width - boxWidth - padding;

        // Background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boxX, y, boxWidth, boxHeight);

        // Border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, y, boxWidth, boxHeight);

        // Progress text
        ctx.fillStyle = CONFIG.COLORS.success;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(progressText, boxX + boxWidth / 2, y + boxHeight / 2);

        // Progress bar below text
        const progressBarWidth = boxWidth - 10;
        const progressBarHeight = 6;
        const progressBarX = boxX + 5;
        const progressBarY = y + boxHeight + 5;
        const progress = coinsCollected / totalCoins;

        // Progress bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Progress bar fill
        ctx.fillStyle = CONFIG.COLORS.success;
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);

        // Progress bar border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    }

    /**
     * Render quick-use item slots in bottom-left corner.
     * Items bound to keys 1, 2, 3 for quick use during gameplay.
     */
    renderQuickUseSlots(ctx, inventory) {
        if (!inventory) return;

        const a = CONFIG.ACCESSIBILITY;
        const x = 20;
        const y = CONFIG.CANVAS_HEIGHT - 100;
        const slotSize = 50;
        const slotSpacing = 60;

        // Get first 3 consumable items from inventory
        const consumables = inventory.items
            .filter(item => {
                const def = inventory.getDef(item.id);
                return def && def.category === 'consumable';
            })
            .slice(0, 3);

        for (let i = 0; i < 3; i++) {
            const slotX = x + i * slotSpacing;
            const item = consumables[i];

            // Slot background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(slotX, y, slotSize, slotSize);

            // Slot border
            ctx.strokeStyle = CONFIG.COLORS.uiBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(slotX, y, slotSize, slotSize);

            // Key number in top-left corner
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 14px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`${i + 1}`, slotX + 4, y + 4);

            if (item) {
                const def = inventory.getDef(item.id);

                // Item color swatch (centered)
                ctx.fillStyle = def.color || '#cccccc';
                ctx.fillRect(slotX + 10, y + 18, 30, 20);

                // Item quantity (bottom-right)
                if (item.quantity > 1) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold 12px ${a.fontFamily}`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    ctx.shadowBlur = 3;
                    ctx.fillText(`${item.quantity}`, slotX + slotSize - 4, y + slotSize - 4);
                    ctx.shadowBlur = 0;
                }
            } else {
                // Empty slot indicator
                ctx.fillStyle = '#666666';
                ctx.font = `18px ${a.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('-', slotX + slotSize / 2, y + slotSize / 2 + 5);
            }
        }
    }

    /**
     * Add a notification to the queue.
     * @param {string} message - Notification text
     * @param {string} type - 'info', 'success', 'warning', or 'error'
     */
    showNotification(message, type = 'info') {
        this.notifications.push({
            message: message,
            type: type,
            timer: 2000 // 2 seconds
        });
    }

    /**
     * Update notification timers.
     * @param {number} deltaTime - Time elapsed since last frame (ms)
     */
    updateNotifications(deltaTime) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            this.notifications[i].timer -= deltaTime;
            if (this.notifications[i].timer <= 0) {
                this.notifications.splice(i, 1);
            }
        }
    }

    /**
     * Render toast notifications stacked vertically in top-right.
     */
    renderNotifications(ctx, canvas) {
        if (this.notifications.length === 0) return;

        const a = CONFIG.ACCESSIBILITY;
        const padding = 20;
        const startY = 80; // Below level progress
        const spacing = 60;

        for (let i = 0; i < this.notifications.length; i++) {
            const notif = this.notifications[i];
            const y = startY + i * spacing;

            // Determine color based on type
            let borderColor, textColor;
            switch (notif.type) {
                case 'success':
                    borderColor = CONFIG.COLORS.success;
                    textColor = CONFIG.COLORS.success;
                    break;
                case 'warning':
                    borderColor = '#ffcc00';
                    textColor = '#ffcc00';
                    break;
                case 'error':
                    borderColor = CONFIG.COLORS.danger;
                    textColor = CONFIG.COLORS.danger;
                    break;
                default:
                    borderColor = CONFIG.COLORS.info;
                    textColor = CONFIG.COLORS.info;
            }

            // Measure text
            ctx.font = `bold 16px ${a.fontFamily}`;
            const textWidth = ctx.measureText(notif.message).width;
            const boxPadding = 15;
            const boxWidth = textWidth + boxPadding * 2;
            const boxHeight = 50;
            const boxX = canvas.width - boxWidth - padding;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(boxX, y, boxWidth, boxHeight);

            // Border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, y, boxWidth, boxHeight);

            // Text
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notif.message, boxX + boxWidth / 2, y + boxHeight / 2);

            // Fade out in last 500ms
            if (notif.timer < 500) {
                ctx.globalAlpha = notif.timer / 500;
            }
            ctx.globalAlpha = 1.0;
        }
    }

    // --- Helper methods ---

    /**
     * Determine current objective text based on game state.
     * @private
     */
    _getCurrentObjective(gameState) {
        if (!gameState.dialogue) return null;

        const flags = gameState.dialogue.questFlags;
        const coinsCollected = this._countApostleCoins(gameState);

        // Check if player has collected all coins
        if (coinsCollected >= 3) {
            return 'Find the exit stairs';
        }

        // Check if any apostle has been found
        if (flags.met_peter || flags.met_john || flags.met_paul) {
            return `Find the Apostles (${coinsCollected}/3 coins)`;
        }

        // Default objective
        return 'Explore the catacombs';
    }

    /**
     * Count apostle coins collected.
     * @private
     */
    _countApostleCoins(gameState) {
        if (!gameState.inventory) return 0;
        return gameState.inventory.getItemCount('apostle_coin');
    }
}
