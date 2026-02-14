/**
 * AbilitySystem - Manages Church Father abilities for Level 4
 *
 * Three abilities learned from Church Father NPCs:
 * - Augustine's Wisdom (key 4): Reveal hidden walls/passages
 * - Jerome's Translation (key 5): Decode Latin inscriptions
 * - Ambrose's Courage (key 6): Break barriers
 *
 * Only one ability can be active at a time. Toggle with number keys.
 */
class AbilitySystem {
    constructor() {
        this.abilities = {
            wisdom: {
                name: "Augustine's Wisdom",
                key: '4',
                flag: 'learned_augustine_wisdom',
                color: '#ffd700',
                description: 'Reveals hidden passages'
            },
            translation: {
                name: "Jerome's Translation",
                key: '5',
                flag: 'learned_jerome_translation',
                color: '#6ca0dc',
                description: 'Decodes Latin inscriptions'
            },
            courage: {
                name: "Ambrose's Courage",
                key: '6',
                flag: 'learned_ambrose_courage',
                color: '#cc4444',
                description: 'Breaks barriers'
            }
        };

        // Currently active ability (null or 'wisdom'/'translation'/'courage')
        this.activeAbility = null;
    }

    /**
     * Check if a specific ability is unlocked based on quest flags.
     */
    isUnlocked(abilityId, questFlags) {
        const ability = this.abilities[abilityId];
        return ability && questFlags[ability.flag];
    }

    /**
     * Get how many abilities are unlocked.
     */
    countUnlocked(questFlags) {
        let count = 0;
        for (const id of Object.keys(this.abilities)) {
            if (this.isUnlocked(id, questFlags)) count++;
        }
        return count;
    }

    /**
     * Check if all 3 abilities are unlocked.
     */
    allUnlocked(questFlags) {
        return this.countUnlocked(questFlags) >= 3;
    }

    /**
     * Update ability input. Called each frame during PLAYING state.
     * @param {InputHandler} input
     * @param {Object} questFlags - Dialogue quest flags
     * @returns {string|null} Notification message if ability toggled
     */
    update(input, questFlags) {
        for (const [id, ability] of Object.entries(this.abilities)) {
            if (input.wasPressed(ability.key)) {
                if (!this.isUnlocked(id, questFlags)) {
                    return `You haven't learned ${ability.name} yet!`;
                }

                if (this.activeAbility === id) {
                    this.activeAbility = null;
                    return `${ability.name} deactivated.`;
                } else {
                    this.activeAbility = id;
                    return `${ability.name} activated!`;
                }
            }
        }
        return null;
    }

    /**
     * Check if a specific ability is currently active.
     */
    isActive(abilityId) {
        return this.activeAbility === abilityId;
    }

    /**
     * Render ability icons in the HUD (bottom-right area).
     * Shows unlocked abilities with active indicator.
     */
    renderHUD(ctx, canvas, questFlags) {
        const a = CONFIG.ACCESSIBILITY;
        const iconSize = 36;
        const spacing = 44;
        const startX = canvas.width - spacing * 3 - 20;
        const y = canvas.height - 60;

        const ids = ['wisdom', 'translation', 'courage'];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const ability = this.abilities[id];
            const unlocked = this.isUnlocked(id, questFlags);
            const active = this.activeAbility === id;
            const x = startX + i * spacing;

            // Icon background
            ctx.fillStyle = unlocked ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x, y, iconSize, iconSize);

            // Active glow
            if (active) {
                ctx.strokeStyle = ability.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 2, y - 2, iconSize + 4, iconSize + 4);
            } else {
                ctx.strokeStyle = unlocked ? CONFIG.COLORS.uiBorder : '#444444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, iconSize, iconSize);
            }

            // Ability icon (letter + color)
            if (unlocked) {
                ctx.fillStyle = ability.color;
            } else {
                ctx.fillStyle = '#555555';
            }
            ctx.font = `bold 18px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const letter = id === 'wisdom' ? 'W' : id === 'translation' ? 'T' : 'C';
            ctx.fillText(letter, x + iconSize / 2, y + iconSize / 2);

            // Key number below
            ctx.fillStyle = unlocked ? '#cccccc' : '#555555';
            ctx.font = `11px ${a.fontFamily}`;
            ctx.textBaseline = 'top';
            ctx.fillText(ability.key, x + iconSize / 2, y + iconSize + 2);
        }
    }

    /**
     * Serialize ability state for saving.
     */
    toSaveData() {
        return { activeAbility: this.activeAbility };
    }

    /**
     * Restore ability state from save data.
     */
    fromSaveData(data) {
        if (data && data.activeAbility !== undefined) {
            this.activeAbility = data.activeAbility;
        }
    }
}

window.AbilitySystem = AbilitySystem;
