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
        this.renderMuteIndicator(ctx, canvas, gameState.audio);
        this.renderNotifications(ctx, canvas);

        // Touch controls overlay (only on touch devices)
        if (gameState.input && gameState.input.isTouchDevice) {
            this.renderTouchControls(ctx, canvas, gameState.input);
        }
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

        // Calculate progress based on current level
        const currentLevel = gameState.currentLevel || 1;
        let collected, total, progressText;

        if (currentLevel === 5) {
            collected = this._countLevel5Progress(gameState);
            total = 4;
            progressText = `Progress: ${collected}/${total}`;
        } else if (currentLevel === 4) {
            collected = this._countFatherScrolls(gameState);
            total = 3;
            progressText = `Scrolls: ${collected}/${total}`;
        } else if (currentLevel === 3) {
            collected = this._countCreedFragments(gameState);
            total = 5;
            progressText = `Fragments: ${collected}/${total}`;
        } else if (currentLevel === 2) {
            collected = this._countMartyrTokens(gameState);
            total = 4;
            progressText = `Tokens: ${collected}/${total}`;
        } else {
            collected = this._countApostleCoins(gameState);
            total = 3;
            progressText = `Coins: ${collected}/${total}`;
        }

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
        const progress = collected / total;

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

            // Fade out in last 500ms
            if (notif.timer < 500) {
                ctx.globalAlpha = notif.timer / 500;
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

            ctx.globalAlpha = 1.0;
        }
    }

    /**
     * Render mute indicator in bottom-right corner.
     */
    renderMuteIndicator(ctx, canvas, audio) {
        if (!audio) return;

        const a = CONFIG.ACCESSIBILITY;
        const x = canvas.width - 90;
        const y = canvas.height - 40;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, 70, 24);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 70, 24);

        ctx.fillStyle = audio.muted ? CONFIG.COLORS.danger : '#aaaaaa';
        ctx.font = `bold 12px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(audio.muted ? 'MUTED (M)' : 'M: Mute', x + 35, y + 12);
    }

    /**
     * Render on-screen touch controls (D-pad + action buttons).
     * Only called when isTouchDevice is true.
     */
    renderTouchControls(ctx, canvas, input) {
        const layout = input.getTouchLayout();
        if (!layout) return;

        const a = CONFIG.ACCESSIBILITY;
        ctx.save();
        ctx.globalAlpha = 0.35;

        // ── D-pad ──
        const dpad = layout.dpad;
        const r = dpad.radius;

        // D-pad background circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(dpad.cx, dpad.cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction arrows
        ctx.globalAlpha = 0.6;
        const arrowLen = 14;
        const arrowOff = r * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 20px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Highlight active directions
        const up = input.touchKeysDown['ArrowUp'];
        const down = input.touchKeysDown['ArrowDown'];
        const left = input.touchKeysDown['ArrowLeft'];
        const right = input.touchKeysDown['ArrowRight'];

        // Up arrow
        ctx.fillStyle = up ? '#ffcc00' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(dpad.cx, dpad.cy - arrowOff - arrowLen);
        ctx.lineTo(dpad.cx - 10, dpad.cy - arrowOff);
        ctx.lineTo(dpad.cx + 10, dpad.cy - arrowOff);
        ctx.closePath();
        ctx.fill();

        // Down arrow
        ctx.fillStyle = down ? '#ffcc00' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(dpad.cx, dpad.cy + arrowOff + arrowLen);
        ctx.lineTo(dpad.cx - 10, dpad.cy + arrowOff);
        ctx.lineTo(dpad.cx + 10, dpad.cy + arrowOff);
        ctx.closePath();
        ctx.fill();

        // Left arrow
        ctx.fillStyle = left ? '#ffcc00' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(dpad.cx - arrowOff - arrowLen, dpad.cy);
        ctx.lineTo(dpad.cx - arrowOff, dpad.cy - 10);
        ctx.lineTo(dpad.cx - arrowOff, dpad.cy + 10);
        ctx.closePath();
        ctx.fill();

        // Right arrow
        ctx.fillStyle = right ? '#ffcc00' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(dpad.cx + arrowOff + arrowLen, dpad.cy);
        ctx.lineTo(dpad.cx + arrowOff, dpad.cy - 10);
        ctx.lineTo(dpad.cx + arrowOff, dpad.cy + 10);
        ctx.closePath();
        ctx.fill();

        // ── Action buttons ──
        const buttons = [layout.btnA, layout.btnB, layout.btnI, layout.btnM];
        for (const btn of buttons) {
            const isPressed = input.touchButtonFeedback[btn.label] > 0;

            ctx.globalAlpha = isPressed ? 0.7 : 0.35;

            // Button circle
            ctx.fillStyle = isPressed ? 'rgba(255, 204, 0, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(btn.cx, btn.cy, btn.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isPressed ? '#ffcc00' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Button label
            ctx.globalAlpha = isPressed ? 0.9 : 0.6;
            ctx.fillStyle = '#ffffff';
            const fontSize = btn.radius > 24 ? 14 : 11;
            ctx.font = `bold ${fontSize}px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.cx, btn.cy);
        }

        ctx.restore();
    }

    // --- Helper methods ---

    /**
     * Determine current objective text based on game state.
     * @private
     */
    _getCurrentObjective(gameState) {
        if (!gameState.dialogue) return null;

        const flags = gameState.dialogue.questFlags;
        const currentLevel = gameState.currentLevel || 1;

        if (currentLevel === 5) {
            return this._getLevel5Objective(flags, gameState);
        } else if (currentLevel === 4) {
            return this._getLevel4Objective(flags, gameState);
        } else if (currentLevel === 3) {
            return this._getLevel3Objective(flags, gameState);
        } else if (currentLevel === 2) {
            return this._getLevel2Objective(flags, gameState);
        }
        return this._getLevel1Objective(flags, gameState);
    }

    /** @private */
    _getLevel1Objective(flags, gameState) {
        const coinsCollected = this._countApostleCoins(gameState);

        if (flags.level1_complete) return 'Level 1 Complete!';
        if (coinsCollected >= 3 && flags.boss_defeated) return 'Find the exit stairs';
        if (coinsCollected >= 3) return 'Defeat the Roman Centurion';
        if (flags.met_peter_guide) return `Find the Apostles (${coinsCollected}/3 coins)`;
        return 'Explore the catacombs';
    }

    /** @private */
    _getLevel2Objective(flags, gameState) {
        const tokensCollected = this._countMartyrTokens(gameState);

        if (flags.level2_complete) return 'Level 2 Complete!';
        if (tokensCollected >= 4 && flags.boss_defeated_l2) return 'Find the escape tunnel';
        if (tokensCollected >= 4) return 'Defeat the Roman Prefect';
        if (flags.met_polycarp) return `Find the Martyrs (${tokensCollected}/4 tokens)`;
        return 'Explore the catacombs';
    }

    /** @private */
    _getLevel3Objective(flags, gameState) {
        const fragments = this._countCreedFragments(gameState);

        if (flags.level3_complete) return 'Level 3 Complete!';
        if (flags.boss_defeated_l3) return 'Find the exit stairs';
        if (flags.puzzle_solved) return 'Defeat Arius in the Debate Hall';
        if (fragments >= 5) return 'Assemble the Creed at the Lectern';
        if (flags.met_athanasius) return `Find the Bishops (${fragments}/5 fragments)`;
        return 'Explore the Grand Library';
    }

    /** @private */
    _getLevel5Objective(flags, gameState) {
        if (flags.game_complete) return 'Game Complete!';
        if (flags.boss_defeated_l5) return 'Find the Victory Monument';
        if (flags.arena_unlocked) return 'Defeat the General';
        if (flags.met_constantine && flags.heard_edict) return 'Enter the Arena';
        if (flags.met_constantine) return 'Hear the Edict of Milan';
        if (flags.learned_chi_rho) return 'Meet Emperor Constantine';
        return 'Explore and learn about Constantine';
    }

    /** @private */
    _getLevel4Objective(flags, gameState) {
        const scrolls = this._countFatherScrolls(gameState);

        if (flags.level4_complete) return 'Level 4 Complete!';
        if (flags.boss_defeated_l4) return 'Find the exit stairs';
        if (flags.library_unlocked) return 'Defeat the Corrupt Prefect';
        if (scrolls >= 3) return 'Enter the Forbidden Library';
        if (flags.met_monastery_monk) return `Learn from the Fathers (${scrolls}/3)`;
        return 'Explore the monastery';
    }

    /**
     * Count Level 5 progress milestones based on quest flags.
     * @private
     */
    _countLevel5Progress(gameState) {
        if (!gameState.dialogue) return 0;
        const flags = gameState.dialogue.questFlags;
        let count = 0;
        if (flags.learned_chi_rho) count++;
        if (flags.met_constantine) count++;
        if (flags.heard_edict) count++;
        if (flags.boss_defeated_l5) count++;
        return count;
    }

    /**
     * Count Church Father scrolls collected based on quest flags.
     * @private
     */
    _countFatherScrolls(gameState) {
        if (!gameState.dialogue) return 0;
        const flags = gameState.dialogue.questFlags;
        let count = 0;
        if (flags.scroll_augustine) count++;
        if (flags.scroll_jerome) count++;
        if (flags.scroll_ambrose) count++;
        return count;
    }

    /**
     * Count apostle coins collected based on quest flags.
     * @private
     */
    _countApostleCoins(gameState) {
        if (!gameState.dialogue) return 0;
        const flags = gameState.dialogue.questFlags;
        let count = 0;
        if (flags.coin_peter) count++;
        if (flags.coin_james) count++;
        if (flags.coin_john) count++;
        return count;
    }

    /**
     * Count creed fragments collected based on quest flags.
     * @private
     */
    _countCreedFragments(gameState) {
        if (!gameState.dialogue) return 0;
        const flags = gameState.dialogue.questFlags;
        let count = 0;
        if (flags.fragment_1) count++;
        if (flags.fragment_2) count++;
        if (flags.fragment_3) count++;
        if (flags.fragment_4) count++;
        if (flags.fragment_5) count++;
        return count;
    }

    /**
     * Count martyr tokens collected based on quest flags.
     * @private
     */
    _countMartyrTokens(gameState) {
        if (!gameState.dialogue) return 0;
        const flags = gameState.dialogue.questFlags;
        let count = 0;
        if (flags.token_polycarp) count++;
        if (flags.token_ignatius) count++;
        if (flags.token_perpetua) count++;
        if (flags.token_felicity) count++;
        return count;
    }
}
