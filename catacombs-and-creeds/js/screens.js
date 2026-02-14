/**
 * ScreenManager - Renders title screen, pause menu, and settings screen
 * Uses CONFIG.ACCESSIBILITY colors/fonts for dyslexia-friendly styling.
 */
class ScreenManager {
    constructor() {
        this.selectedIndex = 0;

        this.titleOptions = ['New Game', 'Continue', 'Settings'];
        this.titleDisabled = [false, false, false]; // All enabled now

        this.pauseOptions = ['Resume', 'Settings', 'Exit to Title'];
        this.pauseDisabled = [false, false, false];

        this.settingsOptions = ['Text Size', 'TTS', 'Music Volume', 'SFX Volume', 'Colorblind Mode', 'Back'];
        this.settingsDisabled = [false, false, false, false, true, false]; // Colorblind mode is stub

        // Settings state
        this.settings = this.loadSettings();
    }

    /** Reset cursor to top when entering a new screen */
    resetSelection() {
        this.selectedIndex = 0;
    }

    /**
     * Handle menu input. Returns an action string or null.
     * @param {InputHandler} input
     * @param {string} currentScreen - 'title', 'pause', or 'settings'
     */
    update(input, currentScreen) {
        // Special handling for settings screen
        if (currentScreen === 'settings') {
            return this.updateSettings(input);
        }

        const options = currentScreen === 'title' ? this.titleOptions : this.pauseOptions;
        const disabled = currentScreen === 'title' ? this.titleDisabled : this.pauseDisabled;

        // Navigate up
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            do {
                this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
            } while (disabled[this.selectedIndex]);
        }

        // Navigate down
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            do {
                this.selectedIndex = (this.selectedIndex + 1) % options.length;
            } while (disabled[this.selectedIndex]);
        }

        // Select
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            if (!disabled[this.selectedIndex]) {
                return this.getAction(currentScreen, this.selectedIndex);
            }
        }

        // Escape in pause menu = resume
        if (currentScreen === 'pause' && input.wasPressed('Escape')) {
            return 'resume';
        }

        return null;
    }

    /**
     * Handle settings screen input.
     * @param {InputHandler} input
     * @returns {string|null} - Action string or null
     */
    updateSettings(input) {
        // Navigate up
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            do {
                this.selectedIndex = (this.selectedIndex - 1 + this.settingsOptions.length) % this.settingsOptions.length;
            } while (this.settingsDisabled[this.selectedIndex]);
        }

        // Navigate down
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            do {
                this.selectedIndex = (this.selectedIndex + 1) % this.settingsOptions.length;
            } while (this.settingsDisabled[this.selectedIndex]);
        }

        // Navigate left/right to change setting values
        if (input.wasPressed('ArrowLeft') || input.wasPressed('a') || input.wasPressed('A')) {
            this.changeSettingValue(this.selectedIndex, -1);
        }
        if (input.wasPressed('ArrowRight') || input.wasPressed('d') || input.wasPressed('D')) {
            this.changeSettingValue(this.selectedIndex, 1);
        }

        // Select (only for "Back" option)
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            if (this.selectedIndex === 5) { // Back
                return 'back';
            }
        }

        // Escape = back
        if (input.wasPressed('Escape')) {
            return 'back';
        }

        return null;
    }

    /**
     * Change a setting value.
     * @param {number} index - Settings option index
     * @param {number} direction - -1 for left/decrease, 1 for right/increase
     */
    changeSettingValue(index, direction) {
        switch (index) {
            case 0: // Text Size
                const sizes = ['Small', 'Medium', 'Large'];
                let sizeIdx = sizes.indexOf(this.settings.textSize);
                sizeIdx = (sizeIdx + direction + sizes.length) % sizes.length;
                this.settings.textSize = sizes[sizeIdx];
                this.applyTextSize();
                break;

            case 1: // TTS
                this.settings.tts = !this.settings.tts;
                break;

            case 2: // Music Volume
                this.settings.musicVolume = Math.max(0, Math.min(100, this.settings.musicVolume + direction * 10));
                break;

            case 3: // SFX Volume
                this.settings.sfxVolume = Math.max(0, Math.min(100, this.settings.sfxVolume + direction * 10));
                break;

            case 4: // Colorblind Mode (stub)
                // this.settings.colorblindMode = !this.settings.colorblindMode;
                break;
        }

        this.saveSettings();
    }

    /** Map menu index to action string */
    getAction(screen, index) {
        if (screen === 'title') {
            switch (index) {
                case 0: return 'new_game';
                case 1: return 'continue';
                case 2: return 'settings';
            }
        } else if (screen === 'pause') {
            switch (index) {
                case 0: return 'resume';
                case 1: return 'settings';
                case 2: return 'exit_title';
            }
        } else if (screen === 'settings') {
            switch (index) {
                case 5: return 'back'; // Back option
                default: return null; // Settings items are handled in update
            }
        }
        return null;
    }

    /** Draw the title screen */
    renderTitle(ctx, canvas) {
        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;

        // Cream background
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = a.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 42px ${a.fontFamily}`;
        ctx.fillText('Catacombs & Creeds', centerX, 160);

        // Subtitle
        ctx.font = `24px ${a.fontFamily}`;
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.fillText('Early Church Quest', centerX, 215);

        // Menu options
        this.renderMenuOptions(
            ctx, centerX, 310,
            this.titleOptions, this.titleDisabled
        );

        // Bottom instruction text
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.fillStyle = a.textColor;
        ctx.globalAlpha = 0.5;
        ctx.fillText('Arrow Keys to navigate, Enter to select', centerX, canvas.height - 50);
        ctx.globalAlpha = 1.0;
    }

    /** Draw the pause overlay */
    renderPause(ctx, canvas) {
        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Box dimensions
        const boxW = 320;
        const boxH = 280;
        const boxX = centerX - boxW / 2;
        const boxY = centerY - boxH / 2;

        // Box background
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Box border (saddle brown)
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Title
        ctx.fillStyle = a.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 32px ${a.fontFamily}`;
        ctx.fillText('Paused', centerX, boxY + 50);

        // Menu options
        this.renderMenuOptions(
            ctx, centerX, boxY + 110,
            this.pauseOptions, this.pauseDisabled
        );
    }

    /** Shared helper to draw menu options with highlight and disabled styling */
    renderMenuOptions(ctx, centerX, startY, options, disabled) {
        const a = CONFIG.ACCESSIBILITY;
        const spacing = 50;

        for (let i = 0; i < options.length; i++) {
            const y = startY + i * spacing;
            const isSelected = i === this.selectedIndex;
            const isDisabled = disabled[i];

            // Font
            ctx.font = `${isSelected ? 'bold ' : ''}22px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isDisabled) {
                ctx.fillStyle = '#999999';
            } else if (isSelected) {
                ctx.fillStyle = CONFIG.COLORS.info;
            } else {
                ctx.fillStyle = a.textColor;
            }

            // Cursor arrow for selected option
            const label = isSelected ? '\u25B6  ' + options[i] : options[i];
            ctx.fillText(label, centerX, y);
        }
    }

    /** Draw the settings screen */
    renderSettings(ctx, canvas) {
        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Box dimensions
        const boxW = 500;
        const boxH = 450;
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
        ctx.font = `bold 32px ${a.fontFamily}`;
        ctx.fillText('Settings', centerX, boxY + 40);

        // Render settings options
        const startY = boxY + 100;
        const spacing = 55;

        for (let i = 0; i < this.settingsOptions.length; i++) {
            const y = startY + i * spacing;
            const isSelected = i === this.selectedIndex;
            const isDisabled = this.settingsDisabled[i];

            // Option label (left-aligned)
            ctx.font = `${isSelected ? 'bold ' : ''}20px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            if (isDisabled) {
                ctx.fillStyle = '#999999';
            } else if (isSelected) {
                ctx.fillStyle = CONFIG.COLORS.info;
            } else {
                ctx.fillStyle = a.textColor;
            }

            const label = isSelected && i !== 5 ? '\u25B6  ' + this.settingsOptions[i] : this.settingsOptions[i];
            ctx.fillText(label, boxX + 30, y);

            // Value (right-aligned) — skip for "Back"
            if (i < 5) {
                const value = this.getSettingValueString(i);
                ctx.textAlign = 'right';
                ctx.fillStyle = isSelected ? CONFIG.COLORS.info : CONFIG.COLORS.success;
                ctx.fillText(value, boxX + boxW - 30, y);

                // Left/right arrows for selected setting
                if (isSelected && !isDisabled) {
                    ctx.fillStyle = CONFIG.COLORS.info;
                    ctx.font = `16px ${a.fontFamily}`;
                    ctx.fillText('\u25C0', boxX + boxW - 150, y); // Left arrow
                    ctx.fillText('\u25B6', boxX + boxW - 20, y);  // Right arrow
                }
            }
        }

        // Bottom instruction text
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.fillStyle = a.textColor;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5;
        ctx.fillText('Arrow Keys to navigate & change | Enter/Esc to go back', centerX, boxY + boxH - 25);
        ctx.globalAlpha = 1.0;
    }

    /** Get setting value as display string */
    getSettingValueString(index) {
        switch (index) {
            case 0: return this.settings.textSize;
            case 1: return this.settings.tts ? 'On' : 'Off';
            case 2: return `${this.settings.musicVolume}%`;
            case 3: return `${this.settings.sfxVolume}%`;
            case 4: return 'Off'; // Colorblind mode stub
            default: return '';
        }
    }

    /** Load settings from localStorage */
    loadSettings() {
        try {
            const settingsStr = localStorage.getItem('catacombsCreeds_settings');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                // Apply text size on load
                this.applyTextSizeFromValue(settings.textSize);
                return settings;
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }

        // Default settings
        return {
            textSize: 'Medium',
            tts: false,
            musicVolume: 70,
            sfxVolume: 80,
            colorblindMode: false
        };
    }

    /** Save settings to localStorage */
    saveSettings() {
        try {
            localStorage.setItem('catacombsCreeds_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    /** Apply text size setting by updating CONFIG.ACCESSIBILITY.fontSize */
    applyTextSize() {
        this.applyTextSizeFromValue(this.settings.textSize);
    }

    /** Draw the victory screen */
    renderVictory(ctx, canvas, stats) {
        const a = CONFIG.ACCESSIBILITY;
        const centerX = canvas.width / 2;
        const w = canvas.width;
        const h = canvas.height;

        // Background - cream with gold border
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(0, 0, w, h);

        // Decorative gold border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 6;
        ctx.strokeRect(20, 20, w - 40, h - 40);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(26, 26, w - 52, h - 52);

        // Title
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 42px ${a.fontFamily}`;
        ctx.fillText('Level 1 Complete!', centerX, 100);

        // Subtitle
        ctx.font = `24px ${a.fontFamily}`;
        ctx.fillStyle = a.textColor;
        ctx.fillText('The Catacombs', centerX, 145);

        // Stats box
        const boxW = 400;
        const boxH = 240;
        const boxX = centerX - boxW / 2;
        const boxY = 180;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Stats
        ctx.font = `18px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = a.textColor;

        const statX = boxX + 30;
        let statY = boxY + 20;
        const lineH = 40;

        const statLines = [
            { label: 'Time Played:', value: stats.playtime || '0:00' },
            { label: 'Enemies Defeated:', value: String(stats.enemiesDefeated || 0) },
            { label: 'Apostle Coins:', value: `${stats.coinsCollected || 0} / 3` },
            { label: 'Items Found:', value: String(stats.itemsFound || 0) },
            { label: 'Player Level:', value: String(stats.playerLevel || 1) }
        ];

        for (const stat of statLines) {
            ctx.fillStyle = a.textColor;
            ctx.font = `18px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, statX, statY);

            ctx.fillStyle = CONFIG.COLORS.success;
            ctx.font = `bold 18px ${a.fontFamily}`;
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, boxX + boxW - 30, statY);
            statY += lineH;
        }

        // Message
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.font = `20px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText('Your journey through the catacombs is complete!', centerX, boxY + boxH + 30);

        // To be continued
        ctx.fillStyle = a.textColor;
        ctx.font = `bold 22px ${a.fontFamily}`;
        ctx.fillText('To be continued...', centerX, boxY + boxH + 70);

        // Continue prompt
        ctx.fillStyle = '#888888';
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
        ctx.fillText('Press Enter to return to title', centerX, h - 50);
        ctx.globalAlpha = 1.0;
    }

    /** Apply text size from a value string */
    applyTextSizeFromValue(sizeStr) {
        switch (sizeStr) {
            case 'Small':
                CONFIG.ACCESSIBILITY.fontSize = 14;
                break;
            case 'Medium':
                CONFIG.ACCESSIBILITY.fontSize = 16;
                break;
            case 'Large':
                CONFIG.ACCESSIBILITY.fontSize = 18;
                break;
        }
    }
}
