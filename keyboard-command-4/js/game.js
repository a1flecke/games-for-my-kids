/**
 * Keyboard Command 4: The Digital Realm — Game Engine
 * State machine, screen management, keyboard navigation, overlays.
 */

class Game {
    constructor() {
        this.state = 'TITLE';
        this.selectedLevel = 0;
        this.highestLevel = 1;
        this.currentLevel = null;

        // Screen references
        this._screens = {};
        this._overlays = {};

        // Focus return targets for overlays
        this._pauseTrigger = null;
        this._settingsTrigger = null;
        this._resetTrigger = null;

        // Bound handlers (for removal if needed)
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._titleKeyHandler = null;

        // Renderer & game loop
        this._renderer = null;
        this._rafId = null;
        this._lastTime = 0;
        this._gameState = null;

        // Level data
        this._levelNames = [
            'Home Screen Ruins',
            'Files Dungeon',
            'Text Editor Tower',
            'Navigation Nexus',
            'Selection Stronghold',
            'App Switcher Arena',
            'Safari Caverns',
            'Advanced Armory',
            'Combo Catacombs',
            'Corruption Core'
        ];
    }

    init() {
        // Cache screen elements
        this._screens = {
            title: document.getElementById('screen-title'),
            select: document.getElementById('screen-select'),
            gameplay: document.getElementById('screen-gameplay'),
            results: document.getElementById('screen-results')
        };

        // Cache overlay elements
        this._overlays = {
            pause: document.getElementById('pause-overlay'),
            settings: document.getElementById('settings-overlay'),
            reset: document.getElementById('reset-overlay')
        };

        // Initialize renderer
        const canvas = document.getElementById('game-canvas');
        this._renderer = new Renderer(canvas);
        this._renderer.cacheMonsterSprites();

        // Load save data
        this._loadProgress();

        // Bind global keyboard
        document.addEventListener('keydown', this._onKeyDown);

        // Bind overlay buttons
        this._bindPauseOverlay();
        this._bindSettingsOverlay();
        this._bindResetOverlay();
        this._bindResultsScreen();

        // Handle resize
        window.addEventListener('resize', () => {
            if (this._renderer) this._renderer.resize();
        });

        // Show title screen
        this.showTitle();
    }

    // =========================================================
    // Screen Management
    // =========================================================

    _showScreen(name) {
        for (const key of Object.keys(this._screens)) {
            this._screens[key].classList.toggle('active', key === name);
        }
    }

    showTitle() {
        // Stop game loop if running
        this._stopGameLoop();
        this._gameState = null;

        this.state = 'TITLE';
        this._showScreen('title');

        // Focus the title heading for screen reader announcement
        const titleEl = this._screens.title.querySelector('.glitch-text');
        if (titleEl) {
            titleEl.setAttribute('tabindex', '-1');
            titleEl.focus();
        }

        // "Press any key" handler — listen once
        if (this._titleKeyHandler) {
            document.removeEventListener('keydown', this._titleKeyHandler);
        }
        const ignoredKeys = new Set([
            'Shift', 'Control', 'Alt', 'Meta',
            'CapsLock', 'Fn', 'Dead', 'NumLock', 'ScrollLock'
        ]);
        this._titleKeyHandler = (e) => {
            if (ignoredKeys.has(e.key)) return;
            document.removeEventListener('keydown', this._titleKeyHandler);
            this._titleKeyHandler = null;
            this.showLevelSelect();
        };
        document.addEventListener('keydown', this._titleKeyHandler);
    }

    showLevelSelect() {
        // Stop game loop if running
        this._stopGameLoop();
        this._gameState = null;

        this.state = 'LEVEL_SELECT';
        this._showScreen('select');

        // Remove title listener if still active
        if (this._titleKeyHandler) {
            document.removeEventListener('keydown', this._titleKeyHandler);
            this._titleKeyHandler = null;
        }

        this._renderLevelGrid();
        this._selectLevelCard(0);
    }

    showGameplay(levelId) {
        this.state = 'GAMEPLAY';
        this.currentLevel = levelId;
        this._showScreen('gameplay');

        // Cache room background for this level's theme
        const themeKey = THEME_ORDER[levelId] || 'ruins';
        this._renderer.cacheBackground(themeKey);
        this._renderer.resize();

        // Set up test game state with demo monsters
        this._gameState = {
            monsters: this._createTestMonsters(),
            projectiles: [],
            weaponId: Math.min(levelId + 1, 10),
            weaponState: 'idle'
        };

        // Update HUD
        document.getElementById('level-name').textContent = `Level ${levelId + 1}`;

        // Start game loop
        this._startGameLoop();
    }

    _createTestMonsters() {
        const types = ['gremlin', 'brute', 'shifter', 'mage', 'swarm', 'knight', 'phantom'];
        const monsters = [];
        // Place 3–5 test monsters at various depths
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            monsters.push({
                type: types[i % types.length],
                depth: 0.2 + (i / (count - 1)) * 0.6,
                state: 'idle',
                offsetX: (i - (count - 1) / 2) * 80,
                targeted: i === 0,
                deathProgress: 0
            });
        }
        return monsters;
    }

    // =========================================================
    // Game Loop
    // =========================================================

    _startGameLoop() {
        // Cancel any existing loop
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._lastTime = 0;
        this._renderer.particles.clear();

        const loop = (timestamp) => {
            // Guard: stop if no longer in gameplay or paused
            if (this.state !== 'GAMEPLAY' && this.state !== 'PAUSED') {
                this._rafId = null;
                return;
            }

            // Delta time in seconds, capped to prevent spiral-of-death
            if (this._lastTime === 0) this._lastTime = timestamp;
            const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
            this._lastTime = timestamp;

            // Only update when not paused
            if (this.state === 'GAMEPLAY') {
                this._updateGameplay(dt, timestamp / 1000);
            }

            // Always render (keeps the canvas visible while paused)
            this._renderer.render(this._gameState, timestamp / 1000);

            this._rafId = requestAnimationFrame(loop);
        };

        this._rafId = requestAnimationFrame(loop);
    }

    _stopGameLoop() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _updateGameplay(dt, time) {
        if (!this._gameState) return;

        // Update particles
        this._renderer.particles.update(dt);

        // Update projectiles
        const projs = this._gameState.projectiles;
        for (let i = projs.length - 1; i >= 0; i--) {
            projs[i].progress += dt * 3; // ~0.33s travel time
            if (projs[i].progress >= 1) {
                // Impact effect
                this._renderer.spawnImpact(projs[i].targetX, projs[i].targetY, projs[i].weaponId);
                projs.splice(i, 1);
            }
        }

        // Update dying monsters
        const monsters = this._gameState.monsters;
        for (let i = monsters.length - 1; i >= 0; i--) {
            if (monsters[i].state === 'dying') {
                monsters[i].deathProgress += dt * 2; // 0.5s death
                if (monsters[i].deathProgress >= 1) {
                    monsters.splice(i, 1);
                }
            }
        }
    }

    showResults(stats) {
        this.state = 'RESULTS';
        this._showScreen('results');

        const statsEl = document.getElementById('results-stats');
        const starsEl = document.getElementById('results-stars');

        // Stub stats for now
        if (stats) {
            const lines = [
                `Monsters defeated: ${stats.kills || 0}`,
                `Accuracy: ${stats.accuracy || 0}%`,
                `Best combo: ${stats.bestCombo || 0}`,
                `Score: ${stats.score || 0}`
            ];
            statsEl.textContent = '';
            lines.forEach(line => {
                const p = document.createElement('p');
                p.textContent = line;
                statsEl.appendChild(p);
            });

            const starCount = stats.stars || 0;
            const starText = '\u2605'.repeat(starCount) + '\u2606'.repeat(3 - starCount);
            starsEl.textContent = starText;
            starsEl.setAttribute('aria-label', `${starCount} of 3 stars earned`);
        }
    }

    // =========================================================
    // Level Grid
    // =========================================================

    _renderLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.textContent = '';

        for (let i = 0; i < 10; i++) {
            const card = document.createElement('div');
            card.className = 'level-card';
            card.setAttribute('role', 'button');
            card.setAttribute('data-level', String(i));

            const unlocked = i < this.highestLevel;

            if (!unlocked) {
                card.classList.add('locked');
                card.setAttribute('tabindex', '-1');
                card.setAttribute('aria-disabled', 'true');
            } else {
                card.setAttribute('tabindex', '0');
            }

            // Level number
            const num = document.createElement('span');
            num.className = 'level-num';
            num.textContent = String(i + 1);
            card.appendChild(num);

            // Level info
            const info = document.createElement('div');
            info.className = 'level-info';

            const name = document.createElement('span');
            name.className = 'level-name';
            name.textContent = this._levelNames[i];
            info.appendChild(name);

            if (unlocked) {
                const stars = document.createElement('span');
                stars.className = 'level-stars';
                const savedStars = this._getLevelStars(i);
                stars.textContent = '\u2605'.repeat(savedStars) + '\u2606'.repeat(3 - savedStars);
                stars.setAttribute('aria-label', `${savedStars} of 3 stars`);
                info.appendChild(stars);
            }

            card.appendChild(info);

            if (!unlocked) {
                const lock = document.createElement('span');
                lock.className = 'lock-icon';
                lock.textContent = '\uD83D\uDD12';
                lock.setAttribute('aria-hidden', 'true');
                card.appendChild(lock);
            }

            const label = unlocked
                ? `Level ${i + 1}: ${this._levelNames[i]}`
                : `Level ${i + 1}: ${this._levelNames[i]} (locked)`;
            card.setAttribute('aria-label', label);

            // Click / Enter handler
            card.addEventListener('click', () => {
                if (!unlocked) return;
                this.showGameplay(i);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!unlocked) return;
                    this.showGameplay(i);
                }
            });

            grid.appendChild(card);
        }
    }

    _selectLevelCard(index) {
        const cards = document.querySelectorAll('.level-card');
        if (!cards.length) return;

        // Clamp to valid range
        index = Math.max(0, Math.min(index, cards.length - 1));
        this.selectedLevel = index;

        // Remove previous selection
        cards.forEach(c => c.classList.remove('selected'));

        // Apply selection and focus
        cards[index].classList.add('selected');
        cards[index].focus();
    }

    // =========================================================
    // Keyboard Handler
    // =========================================================

    _handleKeyDown(e) {
        // LEVEL_SELECT navigation
        if (this.state === 'LEVEL_SELECT') {
            this._handleLevelSelectKeys(e);
            return;
        }

        // GAMEPLAY keys
        if (this.state === 'GAMEPLAY') {
            this._handleGameplayKeys(e);
            return;
        }

        // PAUSED — global fallback if focus escapes the overlay
        if (this.state === 'PAUSED') {
            if (e.key === 'Escape') {
                e.preventDefault();
                this._closePause();
            }
            return;
        }

        // RESULTS keys
        if (this.state === 'RESULTS') {
            this._handleResultsKeys(e);
            return;
        }
    }

    _handleLevelSelectKeys(e) {
        const cards = document.querySelectorAll('.level-card');
        if (!cards.length) return;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                this._selectLevelCard(Math.min(this.selectedLevel + 1, cards.length - 1));
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                this._selectLevelCard(Math.max(this.selectedLevel - 1, 0));
                break;
            case 'Escape':
                e.preventDefault();
                this.showTitle();
                break;
        }
    }

    _handleGameplayKeys(e) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.togglePause();
                break;
            case 'Tab':
                e.preventDefault();
                // Future: target cycling
                break;
            case 'h':
            case 'H':
                e.preventDefault();
                // Future: shortcut journal
                break;
            case ' ':
                e.preventDefault();
                // Future: advance dialogue
                break;
            default:
                // Future: shortcut matching will preventDefault only on recognized combos.
                // For now, do NOT blanket-prevent modifier keys — it breaks
                // system shortcuts (Cmd+Tab, accessibility) and traps users.
                break;
        }
    }

    _handleResultsKeys(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.showLevelSelect();
                break;
            case 'Escape':
                e.preventDefault();
                this.showLevelSelect();
                break;
        }
    }

    // =========================================================
    // Pause Overlay
    // =========================================================

    togglePause() {
        const overlay = this._overlays.pause;
        if (overlay.classList.contains('open')) {
            this._closePause();
        } else {
            this._openPause();
        }
    }

    _openPause() {
        if (this.state !== 'GAMEPLAY') return;
        this.state = 'PAUSED';

        const overlay = this._overlays.pause;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        // Focus the close button
        this._pauseTrigger = document.activeElement;
        document.getElementById('pause-close').focus();
    }

    _closePause() {
        const overlay = this._overlays.pause;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        this.state = 'GAMEPLAY';

        // Return focus
        if (this._pauseTrigger && this._pauseTrigger.isConnected) {
            this._pauseTrigger.focus();
        }
        this._pauseTrigger = null;
    }

    _bindPauseOverlay() {
        const overlay = this._overlays.pause;
        const closeBtn = document.getElementById('pause-close');
        const resumeBtn = document.getElementById('pause-resume');
        const settingsBtn = document.getElementById('pause-settings');
        const quitBtn = document.getElementById('pause-quit');

        closeBtn.addEventListener('click', () => this._closePause());
        resumeBtn.addEventListener('click', () => this._closePause());

        settingsBtn.addEventListener('click', () => {
            this._settingsTrigger = settingsBtn;
            this._openSettings();
        });

        quitBtn.addEventListener('click', () => {
            // Close overlay without restoring GAMEPLAY state — we're going to menu
            const overlay = this._overlays.pause;
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            this._pauseTrigger = null;
            this.showLevelSelect();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closePause();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Settings Overlay
    // =========================================================

    _openSettings() {
        const overlay = this._overlays.settings;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        if (!this._settingsTrigger) {
            this._settingsTrigger = document.activeElement;
        }
        document.getElementById('settings-close').focus();
    }

    _closeSettings() {
        const overlay = this._overlays.settings;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        // Return focus to trigger
        if (this._settingsTrigger && this._settingsTrigger.isConnected) {
            this._settingsTrigger.focus();
        }
        this._settingsTrigger = null;
    }

    _bindSettingsOverlay() {
        const overlay = this._overlays.settings;
        const closeBtn = document.getElementById('settings-close');

        closeBtn.addEventListener('click', () => this._closeSettings());

        // Font size buttons
        const fontBtns = overlay.querySelectorAll('.font-size-btn');
        fontBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                const sizeMap = { small: '16px', medium: '18px', large: '22px' };
                document.documentElement.style.fontSize = sizeMap[size];

                // Update aria-checked
                fontBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');

                this._saveSetting('fontSize', size);
            });
        });

        // Physical keys toggle
        const physToggle = document.getElementById('show-physical-keys');
        physToggle.addEventListener('click', () => {
            const current = physToggle.getAttribute('aria-checked') === 'true';
            physToggle.setAttribute('aria-checked', String(!current));
            this._saveSetting('showPhysicalKeys', !current);
        });

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', () => {
            this._saveSetting('volume', Number(volumeSlider.value) / 100);
        });

        // Monster speed buttons
        const speedBtns = overlay.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                speedBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');
                this._saveSetting('monsterSpeed', btn.dataset.speed);
            });
        });

        // Hints buttons
        const hintsBtns = overlay.querySelectorAll('.hints-btn');
        hintsBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                hintsBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');
                this._saveSetting('hints', btn.dataset.hints);
            });
        });

        // Reset progress button
        document.getElementById('reset-progress').addEventListener('click', () => {
            this._resetTrigger = document.getElementById('reset-progress');
            this._openReset();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closeSettings();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Reset Confirmation Overlay
    // =========================================================

    _openReset() {
        const overlay = this._overlays.reset;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        const input = document.getElementById('reset-input');
        const confirmBtn = document.getElementById('reset-confirm');
        input.value = '';
        confirmBtn.disabled = true;

        document.getElementById('reset-close').focus();
    }

    _closeReset() {
        const overlay = this._overlays.reset;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        // Return focus
        if (this._resetTrigger && this._resetTrigger.isConnected) {
            this._resetTrigger.focus();
        }
        this._resetTrigger = null;
    }

    _bindResetOverlay() {
        const overlay = this._overlays.reset;
        const closeBtn = document.getElementById('reset-close');
        const cancelBtn = document.getElementById('reset-cancel');
        const confirmBtn = document.getElementById('reset-confirm');
        const input = document.getElementById('reset-input');

        closeBtn.addEventListener('click', () => this._closeReset());
        cancelBtn.addEventListener('click', () => this._closeReset());

        // Enable confirm when input matches
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value.trim().toUpperCase() !== 'RESET';
        });

        confirmBtn.addEventListener('click', () => {
            this._resetAllProgress();
            this._closeReset();
            this._closeSettings();
            if (this.state === 'PAUSED') {
                this._closePause();
            }
            this.showTitle();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closeReset();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Results Screen
    // =========================================================

    _bindResultsScreen() {
        document.getElementById('results-next').addEventListener('click', () => {
            // Advance to next level if available
            if (this.currentLevel !== null && this.currentLevel < 9) {
                this.showGameplay(this.currentLevel + 1);
            } else {
                this.showLevelSelect();
            }
        });

        document.getElementById('results-replay').addEventListener('click', () => {
            if (this.currentLevel !== null) {
                this.showGameplay(this.currentLevel);
            }
        });

        document.getElementById('results-menu').addEventListener('click', () => {
            this.showLevelSelect();
        });
    }

    // =========================================================
    // Focus Trap Utility
    // =========================================================

    _trapFocus(e, container) {
        const focusable = container.querySelectorAll(
            'button:not([disabled]):not(.hidden), input:not([disabled]):not(.hidden), [tabindex]:not([tabindex="-1"]):not(.hidden)'
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    // =========================================================
    // Save / Load — delegates to SaveManager (save.js)
    // =========================================================

    _loadProgress() {
        const data = SaveManager.load();
        this.highestLevel = data.highestLevel;
        this._settings = data.settings;
        this._levels = data.levels;

        // Apply settings
        this._applySettings();
    }

    _saveProgress() {
        const data = SaveManager.load();
        data.highestLevel = this.highestLevel;
        data.levels = this._levels;
        data.settings = this._settings;
        SaveManager.save(data);
    }

    _saveSetting(key, value) {
        this._settings[key] = value;
        this._applySettings();
        this._saveProgress();
    }

    _applySettings() {
        // Font size
        const sizeMap = { small: '16px', medium: '18px', large: '22px' };
        document.documentElement.style.fontSize = sizeMap[this._settings.fontSize] || '18px';

        // Update settings UI to match loaded state
        const fontBtns = document.querySelectorAll('.font-size-btn');
        fontBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.size === this._settings.fontSize));
        });

        const physToggle = document.getElementById('show-physical-keys');
        if (physToggle) {
            physToggle.setAttribute('aria-checked', String(this._settings.showPhysicalKeys));
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = String(Math.round(this._settings.volume * 100));
        }

        const speedBtns = document.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.speed === this._settings.monsterSpeed));
        });

        const hintsBtns = document.querySelectorAll('.hints-btn');
        hintsBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.hints === this._settings.hints));
        });
    }

    _getLevelStars(levelIndex) {
        const levelData = this._levels[String(levelIndex)];
        return levelData ? (levelData.stars || 0) : 0;
    }

    _resetAllProgress() {
        SaveManager.reset();
        const data = SaveManager.load();
        this.highestLevel = data.highestLevel;
        this._settings = data.settings;
        this._levels = data.levels;
        this._applySettings();
    }
}

// Initialize
window.game = new Game();
window.game.init();
