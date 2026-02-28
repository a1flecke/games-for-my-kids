/**
 * game.js — Main state machine, game loop, screen management.
 * Owns the single RAF chain — no other module may call requestAnimationFrame.
 *
 * State transition table:
 * ──────────────────────────────────────────────────────
 *  From             | To                | Trigger
 * ──────────────────────────────────────────────────────
 *  TITLE            | CREATOR           | "Create a Creature!" button
 *  TITLE            | GALLERY           | "My Pets" button
 *  CREATOR          | GALLERY           | Back button (with unsaved-changes check)
 *  CREATOR          | NAMING            | "Done!" button (when creature is valid)
 *  NAMING           | BIRTH_ANIMATION   | "Welcome!" button
 *  BIRTH_ANIMATION  | CARE              | Auto-advance after animation completes
 *  CARE             | GALLERY           | Gallery button
 *  CARE             | WARDROBE          | Wardrobe button
 *  CARE             | ROOM_EDIT         | Room button
 *  CARE             | PARK              | Park button
 *  GALLERY          | TITLE             | Back button
 *  GALLERY          | CREATOR           | "New!" or tap creature "Edit"
 *  GALLERY          | CARE              | Tap creature card
 *  WARDROBE         | CARE              | Back button
 *  ROOM_EDIT        | CARE              | Back / Done button
 *  PARK             | CARE              | Home button
 * ──────────────────────────────────────────────────────
 *
 * RAF loop:
 *  - Active in: CREATOR, BIRTH_ANIMATION, CARE, PARK, ROOM_EDIT, WARDROBE
 *  - Paused (no update/draw) in: TITLE, GALLERY, NAMING (DOM-only screens)
 */

class Game {
    constructor() {
        this.state = 'TITLE';
        this._rafId = null;
        this._lastTime = 0;

        // Cached canvas references (populated on state entry)
        this._activeCanvas = null; // { canvas, ctx, w, h }

        // Current creature being edited/cared for
        this._activeCreatureId = null;

        // Birth animation state
        this._birthTimer = 0;
        this._birthDuration = 2500; // ms
        this._nextSparkleTime = 0;

        // Cached creature data for draw loop (avoid JSON.parse per frame)
        this._cachedCreature = null;

        // Confirm dialog callback
        this._confirmCallback = null;
    }

    init() {
        // Initialize managers — always fresh
        window.saveManager = new SaveManager();
        window.audioManager = new AudioManager();
        window.uiManager = new UIManager();
        window.partsLib = new PartsLibrary();
        window.creatureCache = new CreatureCache();
        window.animationEngine = new AnimationEngine();
        window.accessoriesLib = new AccessoriesLibrary();
        window.creator = new Creator();
        window.careManager = new CareManager();
        window.roomManager = new RoomManager();
        window.parkManager = new ParkManager();
        window.tutorialManager = new TutorialManager();
        window.progressManager = new ProgressManager();
        window.renderer = new Renderer();

        // Apply saved settings
        this._applySettings();

        // Bind all screen buttons
        this._bindScreenButtons();
        this._bindOverlayButtons();
        this._bindSettingsControls();

        // Load last active creature
        const data = window.saveManager.load();
        this._activeCreatureId = data.lastActiveCreatureId;

        // Show initial screen
        this._showScreen('TITLE');

        // Start the game loop
        this._lastTime = performance.now();
        this._tick(this._lastTime);
    }

    // ── State Machine ──────────────────────────────────

    /**
     * Transition to a new state.
     * Calls exit handler for old state, then enter handler for new state.
     */
    setState(newState) {
        const oldState = this.state;
        if (oldState === newState) return;

        this._exitState(oldState);
        this.state = newState;
        this._showScreen(newState);
        this._enterState(newState);
    }

    /**
     * Clean up when leaving a state.
     */
    _exitState(state) {
        switch (state) {
            case 'CREATOR':
                window.creator.cancel();
                break;
            case 'CARE':
                window.careManager.cancel();
                break;
            case 'PARK':
                window.parkManager.cancel();
                break;
            case 'ROOM_EDIT':
                window.roomManager.cancel();
                break;
            case 'BIRTH_ANIMATION':
                this._birthTimer = 0;
                this._nextSparkleTime = 0;
                break;
        }
        // Always cancel tutorial on state change
        window.tutorialManager.cancel();
        // Clear cached creature ref
        this._cachedCreature = null;
    }

    /**
     * Initialize when entering a state.
     */
    _enterState(state) {
        switch (state) {
            case 'CREATOR':
                this._setupCanvas('creator-canvas');
                window.renderer.drawCreatorBackground(
                    this._activeCanvas.ctx,
                    this._activeCanvas.w,
                    this._activeCanvas.h
                );
                break;

            case 'NAMING':
                this._populateNamePresets();
                break;

            case 'BIRTH_ANIMATION':
                this._birthTimer = 0;
                this._nextSparkleTime = 0;
                this._cachedCreature = this._activeCreatureId
                    ? window.saveManager.getCreature(this._activeCreatureId) : null;
                this._setupCanvas('birth-canvas');
                break;

            case 'CARE':
                this._setupCanvas('care-canvas');
                if (this._activeCreatureId) {
                    this._cachedCreature = window.saveManager.getCreature(this._activeCreatureId);
                    if (this._cachedCreature) {
                        window.careManager.startCaring(this._cachedCreature);
                        this._updateNeedsDisplay(this._cachedCreature.needs);
                    }
                }
                break;

            case 'GALLERY':
                this._populateGallery();
                break;

            case 'PARK':
                this._setupCanvas('park-canvas');
                if (this._activeCreatureId) {
                    window.parkManager.enterPark(
                        window.saveManager.getCreature(this._activeCreatureId)
                    );
                }
                break;

            case 'ROOM_EDIT':
                this._setupCanvas('room-canvas');
                break;

            case 'WARDROBE':
                this._setupCanvas('wardrobe-canvas');
                break;
        }

        window.uiManager.announce(this._screenLabel(state));
    }

    /**
     * Set up a canvas for the current screen (DPR, cache ref).
     */
    _setupCanvas(canvasId) {
        const info = window.renderer.setupCanvas(canvasId);
        if (info) {
            this._activeCanvas = info;
        }
    }

    /**
     * Get a human-readable label for a state (for screen reader announcements).
     */
    _screenLabel(state) {
        const labels = {
            'TITLE': "Lizzie's Petstore",
            'CREATOR': 'Creature Creator',
            'NAMING': 'Name your creature',
            'BIRTH_ANIMATION': 'Your creature is born!',
            'CARE': 'Care for your creature',
            'GALLERY': 'My Pets',
            'WARDROBE': 'Wardrobe',
            'ROOM_EDIT': 'Decorate your room',
            'PARK': 'Pet Park'
        };
        return labels[state] || state;
    }

    _showScreen(state) {
        // Deactivate all screens
        const screens = document.querySelectorAll('.screen');
        for (const s of screens) {
            s.classList.remove('active');
        }

        // Activate target screen
        const screenMap = {
            'TITLE': 'screen-title',
            'CREATOR': 'screen-creator',
            'NAMING': 'screen-naming',
            'BIRTH_ANIMATION': 'screen-birth',
            'CARE': 'screen-care',
            'GALLERY': 'screen-gallery',
            'WARDROBE': 'screen-wardrobe',
            'ROOM_EDIT': 'screen-room-edit',
            'PARK': 'screen-park'
        };

        const screenId = screenMap[state];
        if (screenId) {
            const el = document.getElementById(screenId);
            if (el) el.classList.add('active');
        }
    }

    // ── Game Loop (single RAF chain) ───────────────────

    _tick(now) {
        this._rafId = requestAnimationFrame((t) => this._tick(t));

        let dt = now - this._lastTime;
        this._lastTime = now;
        // Cap delta at 50ms to prevent spiral-of-death on tab-away
        if (dt > 50) dt = 50;

        // Handle pending resize (renderer sets dirty flag, we process here)
        if (window.renderer._resizeDirty) {
            window.renderer.handleResize();
            // Re-setup the active canvas if we're in a canvas state
            if (this._activeCanvas) {
                const canvasId = this._activeCanvas.canvas.id;
                this._setupCanvas(canvasId);
            }
        }

        this._update(dt);
        this._draw();
    }

    _update(dt) {
        switch (this.state) {
            case 'CREATOR':
                window.renderer.updateParticles(dt);
                window.creator.update(dt);
                break;
            case 'BIRTH_ANIMATION':
                window.renderer.updateParticles(dt);
                this._birthTimer += dt;
                if (this._birthTimer >= this._birthDuration) {
                    this.setState('CARE');
                }
                break;
            case 'CARE':
                window.renderer.updateParticles(dt);
                window.careManager.update(dt);
                window.animationEngine.update(dt);
                break;
            case 'PARK':
                window.renderer.updateParticles(dt);
                window.parkManager.update(dt);
                window.animationEngine.update(dt);
                break;
            case 'WARDROBE':
                window.animationEngine.update(dt);
                break;
            case 'ROOM_EDIT':
                window.roomManager.update(dt);
                break;
        }
    }

    _draw() {
        if (!this._activeCanvas) return;
        const { ctx, w, h } = this._activeCanvas;

        switch (this.state) {
            case 'CREATOR':
                window.renderer.clear(ctx, w, h);
                window.renderer.drawCreatorBackground(ctx, w, h);
                window.creator.draw(ctx, w, h);
                window.renderer.drawParticles(ctx);
                break;

            case 'BIRTH_ANIMATION':
                window.renderer.clear(ctx, w, h);
                this._drawBirthAnimation(ctx, w, h);
                break;

            case 'CARE': {
                window.renderer.clear(ctx, w, h);
                const wallColor = this._cachedCreature
                    ? this._cachedCreature.room.wallColor : '#FFE4E1';
                window.renderer.drawCareBackground(ctx, w, h, wallColor);
                window.careManager.draw(ctx, w, h);
                window.renderer.drawParticles(ctx);
                break;
            }

            case 'PARK':
                window.renderer.clear(ctx, w, h);
                window.renderer.drawParkBackground(ctx, w, h);
                window.parkManager.draw(ctx, w, h);
                window.renderer.drawParticles(ctx);
                break;

            case 'ROOM_EDIT':
                window.renderer.clear(ctx, w, h);
                window.renderer.drawCareBackground(ctx, w, h);
                window.roomManager.draw(ctx, w, h);
                break;

            case 'WARDROBE':
                window.renderer.clear(ctx, w, h);
                window.renderer.drawBackground(ctx, w, h);
                // Wardrobe preview rendering (future session)
                window.renderer.drawPlaceholderText(ctx, w, h, 'Wardrobe coming soon!');
                break;
        }
    }

    /**
     * Draw the birth animation (sparkle burst + creature fade-in).
     */
    _drawBirthAnimation(ctx, w, h) {
        const progress = Math.min(1, this._birthTimer / this._birthDuration);

        // Pastel gradient background
        const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
        grad.addColorStop(0, '#FFE4F0');
        grad.addColorStop(1, '#F5F0E8');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Spawn sparkles during first half (interval-based, not modulus on float)
        if (progress < 0.5 && this._birthTimer >= this._nextSparkleTime) {
            this._nextSparkleTime = this._birthTimer + 100;
            window.renderer.spawnSparkles(
                w / 2 + (Math.random() - 0.5) * 100,
                h / 2 + (Math.random() - 0.5) * 100,
                3
            );
        }

        window.renderer.drawParticles(ctx);

        // "Welcome!" text fading in during second half
        if (progress > 0.4) {
            const textAlpha = Math.min(1, (progress - 0.4) / 0.3);
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#FF69B4';
            ctx.font = "bold 32px OpenDyslexic, 'Comic Sans MS', cursive";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Welcome!', w / 2, h / 2 - 20);

            // Creature name below (use cached creature, not per-frame load)
            if (this._cachedCreature) {
                ctx.fillStyle = '#9B59B6';
                ctx.font = "24px OpenDyslexic, 'Comic Sans MS', cursive";
                ctx.fillText(this._cachedCreature.name, w / 2, h / 2 + 30);
            }
            ctx.restore();
        }
    }

    // ── Gallery ──────────────────────────────────────────

    _populateGallery() {
        const creatures = window.saveManager.getCreatures();
        const grid = document.getElementById('gallery-grid');
        const empty = document.getElementById('gallery-empty');

        if (!grid || !empty) return;

        if (creatures.length === 0) {
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.setAttribute('aria-hidden', 'false');
            return;
        }

        empty.classList.add('hidden');
        empty.setAttribute('aria-hidden', 'true');
        grid.classList.remove('hidden');

        // Build gallery cards
        grid.innerHTML = '';
        for (const creature of creatures) {
            const card = document.createElement('button');
            card.className = 'gallery-card';
            card.setAttribute('aria-label', creature.name);

            const icon = document.createElement('span');
            icon.className = 'gallery-card-icon';
            icon.textContent = this._creatureEmoji(creature);

            const name = document.createElement('span');
            name.className = 'gallery-card-name';
            name.textContent = creature.name;

            const stage = document.createElement('span');
            stage.className = 'gallery-card-stage';
            stage.textContent = creature.growthStage || 'baby';

            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(stage);

            card.addEventListener('click', () => {
                this._activeCreatureId = creature.id;
                window.saveManager.setLastActiveCreature(creature.id);
                this.setState('CARE');
            });

            grid.appendChild(card);
        }
    }

    /**
     * Get a representative emoji for a creature (based on head type).
     */
    _creatureEmoji(creature) {
        const headMap = {
            'cat': '😺', 'dog': '🐶', 'bunny': '🐰',
            'bird': '🐦', 'dragon': '🐉', 'fox': '🦊'
        };
        const headType = creature.body && creature.body.head
            ? creature.body.head.type : 'cat';
        return headMap[headType] || '🐾';
    }

    // ── Naming ──────────────────────────────────────────

    _populateNamePresets() {
        const grid = document.getElementById('name-presets');
        if (!grid) return;

        // Pick 8 random names from the names data
        const allNames = [
            'Sparkle', 'Bubbles', 'Moonbeam', 'Cupcake',
            'Stardust', 'Biscuit', 'Twinkle', 'Marshmallow',
            'Pepper', 'Sunshine', 'Pudding', 'Zigzag'
        ];

        // Fisher-Yates shuffle
        const shuffled = [...allNames];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        grid.innerHTML = '';
        for (const name of shuffled.slice(0, 8)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary name-preset';
            btn.textContent = name;
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', name);
            btn.addEventListener('click', () => {
                const input = document.getElementById('name-input');
                if (input) input.value = name;
                // Deselect others
                grid.querySelectorAll('.name-preset').forEach(b => {
                    b.setAttribute('aria-selected', 'false');
                });
                btn.setAttribute('aria-selected', 'true');
            });
            btn.setAttribute('aria-selected', 'false');
            grid.appendChild(btn);
        }
    }

    // ── Needs Display ────────────────────────────────────

    _updateNeedsDisplay(needs) {
        const container = document.getElementById('needs-display');
        if (!container || !needs) return;

        const icons = {
            hunger: '🍽️',
            cleanliness: '🛁',
            energy: '💤',
            happiness: '💕'
        };

        container.innerHTML = '';
        for (const [key, value] of Object.entries(needs)) {
            const icon = icons[key] || '❓';
            const el = document.createElement('span');
            el.className = 'need-icon';
            el.setAttribute('aria-label', `${key}: ${value}%`);
            el.setAttribute('title', `${key}: ${value}%`);
            el.textContent = icon;

            // Dim the icon when need is low
            if (value < 40) {
                el.classList.add('need-low');
            }

            container.appendChild(el);
        }
    }

    // ── Settings ─────────────────────────────────────────

    _applySettings() {
        const settings = window.saveManager.getSettings();
        window.audioManager.setVolume(settings.volume);
        window.audioManager.setMuted(settings.muted);
    }

    _bindSettingsControls() {
        const volumeSlider = document.getElementById('volume-slider');
        const muteToggle = document.getElementById('mute-toggle');

        if (volumeSlider) {
            // Set initial value from save
            const settings = window.saveManager.getSettings();
            volumeSlider.value = settings.volume;

            volumeSlider.addEventListener('input', () => {
                const vol = parseInt(volumeSlider.value, 10);
                window.audioManager.setVolume(vol);
                window.saveManager.updateSettings({ volume: vol });
            });
        }

        if (muteToggle) {
            const settings = window.saveManager.getSettings();
            muteToggle.textContent = settings.muted ? 'On' : 'Off';
            muteToggle.setAttribute('aria-checked', String(settings.muted));

            muteToggle.addEventListener('click', () => {
                const currentSettings = window.saveManager.getSettings();
                const newMuted = !currentSettings.muted;
                window.audioManager.setMuted(newMuted);
                window.saveManager.updateSettings({ muted: newMuted });
                muteToggle.textContent = newMuted ? 'On' : 'Off';
                muteToggle.setAttribute('aria-checked', String(newMuted));
            });
        }
    }

    // ── Unsaved Changes Confirmation ─────────────────────

    /**
     * Show the unsaved-changes confirmation overlay.
     * If the user confirms, calls `onConfirm`.
     */
    _confirmLeaveCreator(triggerEl, onConfirm) {
        this._confirmCallback = onConfirm;
        window.uiManager.showOverlay('overlay-confirm', triggerEl);
    }

    // ── Button Bindings ────────────────────────────────

    _bindScreenButtons() {
        // Title screen
        document.getElementById('btn-new-creature').addEventListener('click', () => {
            window.creator.startCreating();
            this.setState('CREATOR');
        });

        document.getElementById('btn-my-pets').addEventListener('click', () => {
            this.setState('GALLERY');
        });

        // Creator screen
        document.getElementById('btn-creator-back').addEventListener('click', (e) => {
            if (window.creator.isDirty()) {
                this._confirmLeaveCreator(e.currentTarget, () => {
                    this.setState('GALLERY');
                });
            } else {
                this.setState('GALLERY');
            }
        });

        document.getElementById('btn-name-finish').addEventListener('click', () => {
            if (window.creator.canFinish()) {
                this.setState('NAMING');
            }
        });

        // Naming screen
        document.getElementById('btn-birth').addEventListener('click', () => {
            const input = document.getElementById('name-input');
            const name = (input && input.value.trim()) || 'Creature';
            const creature = window.creator.getCreature();
            if (!creature) return;

            creature.name = name;
            creature.createdAt = Date.now();
            creature.lastActiveAt = Date.now();

            if (window.saveManager.addCreature(creature)) {
                this._activeCreatureId = creature.id;
                this.setState('BIRTH_ANIMATION');
            }
        });

        // Care screen
        document.getElementById('btn-care-gallery').addEventListener('click', () => {
            this.setState('GALLERY');
        });
        document.getElementById('btn-wardrobe').addEventListener('click', () => {
            this.setState('WARDROBE');
        });
        document.getElementById('btn-room-edit').addEventListener('click', () => {
            this.setState('ROOM_EDIT');
        });
        document.getElementById('btn-park').addEventListener('click', () => {
            this.setState('PARK');
        });

        // Gallery screen
        document.getElementById('btn-gallery-back').addEventListener('click', () => {
            this.setState('TITLE');
        });
        document.getElementById('btn-gallery-new').addEventListener('click', () => {
            window.creator.startCreating();
            this.setState('CREATOR');
        });

        // Wardrobe screen
        document.getElementById('btn-wardrobe-back').addEventListener('click', () => {
            this.setState('CARE');
        });

        // Room edit screen
        document.getElementById('btn-room-back').addEventListener('click', () => {
            this.setState('CARE');
        });
        document.getElementById('btn-room-done').addEventListener('click', () => {
            this.setState('CARE');
        });

        // Park screen
        document.getElementById('btn-park-home').addEventListener('click', () => {
            this.setState('CARE');
        });
    }

    _bindOverlayButtons() {
        // Unsaved changes confirm
        document.getElementById('btn-confirm-yes').addEventListener('click', () => {
            window.uiManager.hideOverlay('overlay-confirm');
            if (this._confirmCallback) {
                const cb = this._confirmCallback;
                this._confirmCallback = null;
                cb();
            }
        });

        document.getElementById('btn-confirm-no').addEventListener('click', () => {
            window.uiManager.hideOverlay('overlay-confirm');
            this._confirmCallback = null;
        });

        // Confirm overlay close button
        const confirmClose = document.querySelector('#overlay-confirm .btn-close');
        if (confirmClose) {
            confirmClose.addEventListener('click', () => {
                window.uiManager.hideOverlay('overlay-confirm');
                this._confirmCallback = null;
            });
        }

        // Delete creature confirm
        document.getElementById('btn-delete-yes').addEventListener('click', () => {
            // Delete handled by gallery in future session
            window.uiManager.hideOverlay('overlay-delete');
        });

        document.getElementById('btn-delete-no').addEventListener('click', () => {
            window.uiManager.hideOverlay('overlay-delete');
        });

        const deleteClose = document.querySelector('#overlay-delete .btn-close');
        if (deleteClose) {
            deleteClose.addEventListener('click', () => {
                window.uiManager.hideOverlay('overlay-delete');
            });
        }

        // Settings overlay close
        const settingsClose = document.querySelector('#overlay-settings .btn-close');
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                window.uiManager.hideOverlay('overlay-settings');
            });
        }

        // Unlock notification
        document.getElementById('btn-unlock-ok').addEventListener('click', () => {
            window.uiManager.hideOverlay('overlay-unlock');
        });
    }
}

// ── Init ───────────────────────────────────────────────
window.game = new Game();
window.game.init();
