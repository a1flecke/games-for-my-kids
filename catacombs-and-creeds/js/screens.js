/**
 * ScreenManager - Renders title screen and pause menu on the canvas
 * Uses CONFIG.ACCESSIBILITY colors/fonts for dyslexia-friendly styling.
 */
class ScreenManager {
    constructor() {
        this.selectedIndex = 0;

        this.titleOptions = ['New Game', 'Continue', 'Settings'];
        this.titleDisabled = [false, true, true]; // Continue & Settings are stubs

        this.pauseOptions = ['Resume', 'Settings', 'Exit to Title'];
        this.pauseDisabled = [false, true, false];
    }

    /** Reset cursor to top when entering a new screen */
    resetSelection() {
        this.selectedIndex = 0;
    }

    /**
     * Handle menu input. Returns an action string or null.
     * @param {InputHandler} input
     * @param {string} currentScreen - 'title' or 'pause'
     */
    update(input, currentScreen) {
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

    /** Map menu index to action string */
    getAction(screen, index) {
        if (screen === 'title') {
            switch (index) {
                case 0: return 'new_game';
                case 1: return 'continue';
                case 2: return 'settings';
            }
        } else {
            switch (index) {
                case 0: return 'resume';
                case 1: return 'settings';
                case 2: return 'exit_title';
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
}
