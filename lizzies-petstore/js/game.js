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
        this._birthGradient = null; // cached gradient for birth animation

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

        // Load catalogs (fire-and-forget; resolves before user navigates)
        window.partsLib.loadCatalog();
        window.accessoriesLib.loadCatalog();

        // Load names data
        this._namesData = null;
        this._loadNames();

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

    /**
     * Load names.json data.
     */
    async _loadNames() {
        try {
            const resp = await fetch('data/names.json');
            this._namesData = await resp.json();
        } catch (e) {
            console.warn('Failed to load names.json', e);
        }
    }

    // ── State Machine ──────────────────────────────────

    /**
     * Transition to a new state.
     * Calls exit handler for old state, then enter handler for new state.
     */
    setState(newState) {
        const oldState = this.state;
        if (oldState === newState) return;

        this._exitState(oldState, newState);
        this.state = newState;
        this._showScreen(newState);
        this._enterState(newState);
    }

    /**
     * Clean up when leaving a state.
     */
    _exitState(state, newState) {
        switch (state) {
            case 'CREATOR':
                // Don't cancel creator when going to NAMING — we'll come back
                if (newState !== 'NAMING') {
                    window.creator.cancel();
                }
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                }
                // Stop temp creature animation
                if (window.creator._creature) {
                    window.animationEngine.stopAnimation(window.creator._creature.id);
                }
                window.audioManager.stopMusic();
                break;
            case 'CARE':
                window.careManager.cancel();
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                }
                window.audioManager.stopMusic();
                break;
            case 'PARK':
                window.parkManager.cancel();
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                }
                window.audioManager.stopMusic();
                window.audioManager.stopAmbient();
                break;
            case 'ROOM_EDIT':
                // Room data is auto-saved by roomManager on every change
                window.roomManager.cancel();
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                }
                // Invalidate care background cache (wall/floor may have changed)
                window.renderer._careBgCache = null;
                break;
            case 'WARDROBE':
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                    // Invalidate creature cache so CARE re-renders with new accessories
                    window.creatureCache.clearCache(this._activeCreatureId);
                }
                break;
            case 'BIRTH_ANIMATION':
                this._birthTimer = 0;
                this._nextSparkleTime = 0;
                if (this._activeCreatureId) {
                    window.animationEngine.stopAnimation(this._activeCreatureId);
                }
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
                window.creator._computeLayout();
                window.creator._computePartHitBoxes();
                // Re-bind canvas input if needed (e.g., coming back from NAMING)
                window.creator._bindCanvasInput();
                if (window.tutorialManager.shouldRun()) {
                    window.tutorialManager.start();
                }
                window.audioManager.startMusic('creator');
                break;

            case 'NAMING':
                this._populateNamePresets();
                this._bindNamingEvents();
                this._setupNamingPreview();
                this._generateSpeciesName();
                break;

            case 'BIRTH_ANIMATION':
                this._birthTimer = 0;
                this._nextSparkleTime = 0;
                this._cachedCreature = this._activeCreatureId
                    ? window.saveManager.getCreature(this._activeCreatureId) : null;
                this._setupCanvas('birth-canvas');
                window.audioManager.playSound('happy');
                window.audioManager.stopMusic();
                // Cache birth gradient (avoid creating per frame)
                if (this._activeCanvas) {
                    const { ctx, w, h } = this._activeCanvas;
                    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
                    grad.addColorStop(0, '#FFE4F0');
                    grad.addColorStop(1, '#F5F0E8');
                    this._birthGradient = grad;
                }
                // Build creature cache for rendering in birth animation
                if (this._cachedCreature) {
                    const birthInfo = window.renderer.getCanvas('birth-canvas');
                    const birthSize = birthInfo ? Math.min(birthInfo.w, birthInfo.h) * 0.4 : 150;
                    if (!window.creatureCache.hasCache(this._activeCreatureId)) {
                        window.creatureCache.buildCache(
                            this._activeCreatureId, this._cachedCreature, birthSize
                        );
                    }
                    window.animationEngine.startAnimation(
                        this._activeCreatureId, 'happy', this._cachedCreature
                    );
                }
                break;

            case 'CARE':
                this._setupCanvas('care-canvas');
                if (this._activeCreatureId) {
                    this._cachedCreature = window.saveManager.getCreature(this._activeCreatureId);
                    if (this._cachedCreature) {
                        window.careManager.startCaring(this._cachedCreature);
                        this._updateNeedsDisplay(this._cachedCreature.needs);
                        // Build cache and start idle animation
                        const careInfo = window.renderer.getCanvas('care-canvas');
                        const careSize = careInfo ? Math.min(careInfo.w, careInfo.h) * 0.45 : 150;
                        if (!window.creatureCache.hasCache(this._activeCreatureId)) {
                            window.creatureCache.buildCache(
                                this._activeCreatureId, this._cachedCreature, careSize
                            );
                        }
                        window.animationEngine.startAnimation(
                            this._activeCreatureId, 'idle', this._cachedCreature
                        );
                    }
                }
                window.audioManager.startMusic('care');
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
                window.audioManager.startMusic('park');
                window.audioManager.startAmbient();
                break;

            case 'ROOM_EDIT':
                this._setupCanvas('room-canvas');
                if (this._activeCreatureId) {
                    this._cachedCreature = window.saveManager.getCreature(this._activeCreatureId);
                    if (this._cachedCreature) {
                        window.roomManager.startEditing(this._cachedCreature);
                        this._populateRoomUI();
                        // Build cache and start idle animation
                        const roomInfo = window.renderer.getCanvas('room-canvas');
                        const roomSize = roomInfo ? Math.min(roomInfo.w, roomInfo.h) * 0.35 : 120;
                        if (!window.creatureCache.hasCache(this._activeCreatureId)) {
                            window.creatureCache.buildCache(
                                this._activeCreatureId, this._cachedCreature, roomSize
                            );
                        }
                        window.animationEngine.startAnimation(
                            this._activeCreatureId, 'idle', this._cachedCreature
                        );
                    }
                }
                break;

            case 'WARDROBE':
                this._setupCanvas('wardrobe-canvas');
                if (this._activeCreatureId) {
                    this._cachedCreature = window.saveManager.getCreature(this._activeCreatureId);
                    if (this._cachedCreature) {
                        this._populateWardrobeUI();
                        // Build cache and start idle animation
                        const wardInfo = window.renderer.getCanvas('wardrobe-canvas');
                        const wardSize = wardInfo ? Math.min(wardInfo.w, wardInfo.h) * 0.45 : 150;
                        if (!window.creatureCache.hasCache(this._activeCreatureId)) {
                            window.creatureCache.buildCache(
                                this._activeCreatureId, this._cachedCreature, wardSize
                            );
                        }
                        window.animationEngine.startAnimation(
                            this._activeCreatureId, 'idle', this._cachedCreature
                        );
                    }
                }
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
            // Invalidate room positions on resize
            if (window.careManager) {
                window.careManager._roomPositions = null;
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
                window.animationEngine.update(dt);
                window.tutorialManager.update(dt);
                break;
            case 'BIRTH_ANIMATION':
                window.renderer.updateParticles(dt);
                window.animationEngine.update(dt);
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
                window.renderer.updateParticles(dt);
                window.animationEngine.update(dt);
                break;
            case 'ROOM_EDIT':
                window.roomManager.update(dt);
                window.animationEngine.update(dt);
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
                const floorPat = this._cachedCreature
                    ? (this._cachedCreature.room.floorPattern || 'wood') : 'wood';
                window.renderer.drawCareBackground(ctx, w, h, wallColor, floorPat);
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
                window.roomManager.draw(ctx, w, h);
                break;

            case 'WARDROBE': {
                window.renderer.clear(ctx, w, h);
                window.renderer.drawBackground(ctx, w, h);
                // Draw creature preview centered
                if (this._cachedCreature && this._activeCreatureId &&
                    window.creatureCache.hasCache(this._activeCreatureId)) {
                    const displaySize = Math.min(w, h) * 0.45;
                    const animState = window.animationEngine.getState(this._activeCreatureId);
                    window.creatureCache.drawCreatureById(
                        ctx, w / 2, h / 2, animState, displaySize, this._activeCreatureId
                    );
                }
                window.renderer.drawParticles(ctx);
                break;
            }
        }
    }

    /**
     * Draw the birth animation (sparkle burst + creature fade-in).
     */
    _drawBirthAnimation(ctx, w, h) {
        const progress = Math.min(1, this._birthTimer / this._birthDuration);

        // Pastel gradient background (gradient cached on state entry)
        if (this._birthGradient) {
            ctx.fillStyle = this._birthGradient;
        } else {
            ctx.fillStyle = '#FFE4F0';
        }
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

        // Draw creature with elastic reveal
        if (this._cachedCreature && this._activeCreatureId) {
            const creatureY = h * 0.42;
            const displaySize = Math.min(w, h) * 0.4;

            // Elastic scale-in: 0 -> overshoot -> settle
            let creatureScale = 1;
            if (progress < 0.3) {
                const t = progress / 0.3;
                creatureScale = t * 1.15; // grow to 115%
            } else if (progress < 0.5) {
                const t = (progress - 0.3) / 0.2;
                creatureScale = 1.15 - t * 0.15; // settle to 100%
            }

            ctx.save();
            ctx.globalAlpha = Math.min(1, progress / 0.2);
            const animState = window.animationEngine.getState(this._activeCreatureId);
            window.animationEngine.setCreaturePosition(
                this._activeCreatureId, w / 2, creatureY, displaySize
            );
            ctx.translate(w / 2, creatureY);
            ctx.scale(creatureScale, creatureScale);
            ctx.translate(-w / 2, -creatureY);
            window.creatureCache.drawCreatureById(
                ctx, w / 2, creatureY, animState, displaySize, this._activeCreatureId
            );
            ctx.restore();
        }

        window.renderer.drawParticles(ctx);

        // "Welcome!" text fading in during second half
        if (progress > 0.4) {
            const textAlpha = Math.min(1, (progress - 0.4) / 0.3);
            ctx.save();
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#FF69B4';
            ctx.font = "bold 28px OpenDyslexic, 'Comic Sans MS', cursive";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textY = h * 0.72;
            ctx.fillText('Welcome!', w / 2, textY);

            // Creature name below
            if (this._cachedCreature) {
                ctx.fillStyle = '#9B59B6';
                ctx.font = "22px OpenDyslexic, 'Comic Sans MS', cursive";
                ctx.fillText(this._cachedCreature.name, w / 2, textY + 35);
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

    _populateNamePresets(vibeFilter) {
        const grid = document.getElementById('name-presets');
        if (!grid) return;

        const vibe = vibeFilter || 'all';
        let allNames = [];

        if (this._namesData && this._namesData.categories) {
            for (const cat of this._namesData.categories) {
                if (vibe === 'all' || cat.vibe === vibe) {
                    allNames = allNames.concat(cat.names);
                }
            }
        }

        // Fallback if data not loaded yet
        if (allNames.length === 0) {
            allNames = [
                'Sparkle', 'Bubbles', 'Moonbeam', 'Cupcake',
                'Stardust', 'Biscuit', 'Twinkle', 'Marshmallow',
                'Pepper', 'Sunshine', 'Pudding', 'Zigzag'
            ];
        }

        // Fisher-Yates shuffle
        const shuffled = [...allNames];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Show up to 12 names
        const count = Math.min(12, shuffled.length);

        grid.innerHTML = '';
        for (const name of shuffled.slice(0, count)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary name-preset';
            btn.textContent = name;
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', name);
            btn.addEventListener('click', () => {
                const input = document.getElementById('name-input');
                if (input) {
                    input.value = name;
                    this._updateBirthButton();
                }
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

    /**
     * Bind naming screen events (vibe filters, input, back button).
     * Uses clone-replace for idempotent re-binding.
     */
    _bindNamingEvents() {
        // Vibe filter pills
        const vibeBar = document.getElementById('vibe-filters');
        if (vibeBar) {
            const pills = vibeBar.querySelectorAll('.vibe-pill');
            for (const pill of pills) {
                const newPill = pill.cloneNode(true);
                pill.parentNode.replaceChild(newPill, pill);

                newPill.addEventListener('click', () => {
                    // Update active state
                    vibeBar.querySelectorAll('.vibe-pill').forEach(p => {
                        p.classList.remove('active-vibe');
                        p.setAttribute('aria-checked', 'false');
                    });
                    newPill.classList.add('active-vibe');
                    newPill.setAttribute('aria-checked', 'true');

                    const vibe = newPill.getAttribute('data-vibe');
                    this._populateNamePresets(vibe);
                });
            }
        }

        // Name input — enable/disable Welcome button
        const nameInput = document.getElementById('name-input');
        if (nameInput) {
            const newInput = nameInput.cloneNode(true);
            nameInput.parentNode.replaceChild(newInput, nameInput);
            newInput.addEventListener('input', () => {
                this._updateBirthButton();
                // Deselect any preset pills
                const grid = document.getElementById('name-presets');
                if (grid) {
                    grid.querySelectorAll('.name-preset').forEach(b => {
                        b.setAttribute('aria-selected', 'false');
                    });
                }
            });
        }

        // Back button — return to creator
        const backBtn = document.getElementById('btn-naming-back');
        if (backBtn) {
            const newBack = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBack, backBtn);
            newBack.addEventListener('click', () => {
                // Restore creator state
                this.setState('CREATOR');
            });
        }

        // Re-bind birth button (clone-replace for idempotent)
        const birthBtn = document.getElementById('btn-birth');
        if (birthBtn) {
            const newBirth = birthBtn.cloneNode(true);
            birthBtn.parentNode.replaceChild(newBirth, birthBtn);
            newBirth.addEventListener('click', () => {
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
        }
    }

    /**
     * Enable/disable the Welcome button based on name input.
     */
    _updateBirthButton() {
        const input = document.getElementById('name-input');
        const btn = document.getElementById('btn-birth');
        if (!input || !btn) return;
        btn.disabled = input.value.trim().length === 0;
    }

    /**
     * Set up the naming preview canvas with creature rendering.
     */
    _setupNamingPreview() {
        const creature = window.creator.getCreature();
        if (!creature) return;

        const previewInfo = window.renderer.setupCanvas('naming-preview');
        if (!previewInfo) return;

        const { ctx, w, h } = previewInfo;
        const displaySize = Math.min(w, h) * 0.7;

        // Build cache if needed
        if (!window.creatureCache.hasCache(creature.id)) {
            window.creatureCache.buildCache(creature.id, creature, displaySize);
        }

        // Draw once (static preview)
        window.renderer.clear(ctx, w, h);
        window.renderer.drawBackground(ctx, w, h);
        const animState = window.animationEngine.getState(creature.id);
        window.creatureCache.drawCreatureById(
            ctx, w / 2, h / 2, animState, displaySize, creature.id
        );
    }

    /**
     * Generate a species name from the creature's body parts.
     */
    _generateSpeciesName() {
        const creature = window.creator.getCreature();
        const el = document.getElementById('species-name');
        if (!creature || !el) return;

        const head = creature.body.head ? creature.body.head.type : '';
        const wings = creature.body.wings ? creature.body.wings.type : '';
        const tail = creature.body.tail ? creature.body.tail.type : '';

        // Combine head + modifier from wings/tail
        const headNames = {
            'cat': 'Kitling', 'dog': 'Puppling', 'bunny': 'Bunnifae',
            'bird': 'Aviari', 'dragon': 'Dragonette', 'fox': 'Foxlet',
            'owl': 'Owlkin', 'bear': 'Bearling', 'unicorn': 'Unicorni',
            'mermaid': 'Merfae'
        };
        const wingMods = {
            'feathered': ' Flyer', 'butterfly': ' Flutter', 'bat': ' Swooper',
            'fairy': ' Fae', 'dragon': ' Wyrm'
        };
        const tailMods = {
            'fluffy': ' Floof', 'spiky': ' Spike', 'phoenix': ' Blaze',
            'fish': ' Splash', 'devil': ' Imp'
        };

        let species = headNames[head] || 'Creature';
        if (wings && wingMods[wings]) species += wingMods[wings];
        else if (tail && tailMods[tail]) species += tailMods[tail];

        el.textContent = `a ${species}`;
    }

    // ── Needs Display ────────────────────────────────────

    _updateNeedsDisplay(needs) {
        if (!needs) return;

        // Unlock energy + cleanliness after 2nd creature
        const data = window.saveManager.load();
        const hasUnlocked = data.totalCreaturesCreated >= 2;

        const needKeys = ['hunger', 'happiness', 'cleanliness', 'energy'];
        for (const key of needKeys) {
            const value = needs[key];
            const meter = document.getElementById('need-' + key);
            if (!meter) continue;

            // Show/hide unlockable needs
            if (key === 'cleanliness' || key === 'energy') {
                if (hasUnlocked) {
                    meter.classList.remove('hidden');
                    meter.setAttribute('aria-hidden', 'false');
                } else {
                    meter.classList.add('hidden');
                    meter.setAttribute('aria-hidden', 'true');
                    continue;
                }
            }

            // Update bar fill width
            const fill = meter.querySelector('.need-meter-fill');
            if (fill) {
                fill.style.width = value + '%';
                // Color class
                fill.classList.remove('need-warn', 'need-low');
                if (value < 40) fill.classList.add('need-low');
                else if (value < 60) fill.classList.add('need-warn');
            }

            // Pulse icon when low
            const icon = meter.querySelector('.need-meter-icon');
            if (icon) {
                if (value < 40) {
                    icon.classList.add('need-pulse');
                } else {
                    icon.classList.remove('need-pulse');
                }
            }

            // Update aria-label
            meter.setAttribute('aria-label', key + ': ' + value + '%');
        }
    }

    // ── Color Name Helper ──────────────────────────────

    _colorName(hex) {
        const names = {
            '#FF69B4': 'Pink', '#FF6B6B': 'Red', '#FFD700': 'Gold', '#FF8C00': 'Orange',
            '#9B59B6': 'Purple', '#4A90D9': 'Blue', '#00CED1': 'Teal', '#27AE60': 'Green',
            '#C0C0C0': 'Silver', '#8B4513': 'Brown', '#2C2416': 'Black', '#FFFFFF': 'White',
            '#FFE4E1': 'Light Pink', '#E8D5E0': 'Lavender', '#D5E8D5': 'Mint',
            '#D5E0E8': 'Light Blue', '#F5E6CC': 'Peach', '#E8E0D6': 'Tan',
            '#F0D5D5': 'Rose', '#D5D5F0': 'Periwinkle', '#FF0000': 'Red'
        };
        return names[hex] || hex;
    }

    // ── Wardrobe UI ─────────────────────────────────────

    _populateWardrobeUI() {
        this._wardrobeSlot = 'head'; // current active slot
        this._populateWardrobeSlot('head');
        this._populateWardrobeColors();

        // Bind wardrobe tab clicks
        const tabs = document.querySelectorAll('#wardrobe-tabs .tab');
        for (const tab of tabs) {
            // Clone-replace for idempotent binding
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('#wardrobe-tabs .tab').forEach(t => {
                    t.setAttribute('aria-selected', 'false');
                });
                newTab.setAttribute('aria-selected', 'true');

                const slot = newTab.getAttribute('data-slot');
                this._wardrobeSlot = slot;
                this._populateWardrobeSlot(slot);
                this._populateWardrobeColors();
            });
        }
    }

    _populateWardrobeSlot(slot) {
        const strip = document.getElementById('wardrobe-strip');
        if (!strip) return;

        strip.innerHTML = '';
        const allAcc = window.accessoriesLib.getBySlot(slot);
        const creature = this._cachedCreature;
        if (!creature) return;

        // Check which accessories are unlocked
        const saveData = window.saveManager.load();
        const unlockedAcc = saveData.unlockedAccessories || [];

        // Current equipped accessory for this slot
        const equipped = (creature.accessories || []).find(a => {
            const meta = window.accessoriesLib.getById(a.type);
            return meta && meta.slot === slot;
        });

        for (const acc of allAcc) {
            // Check if locked
            const isLocked = acc.unlockCondition && !acc.tags.includes('starter') &&
                !unlockedAcc.includes(acc.id);
            const isEquipped = equipped && equipped.type === acc.id;

            const btn = document.createElement('button');
            btn.className = 'part-thumb';
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', acc.name + (isEquipped ? ' (equipped)' : '') + (isLocked ? ' (locked)' : ''));
            btn.setAttribute('aria-selected', isEquipped ? 'true' : 'false');

            if (isLocked) {
                btn.disabled = true;
            }

            // Thumbnail canvas
            const wrap = document.createElement('div');
            wrap.className = 'part-thumb-wrap';

            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 60;
            thumbCanvas.height = 60;
            const tctx = thumbCanvas.getContext('2d');
            const color = (isEquipped && equipped.color) ? equipped.color : acc.defaultColor;
            window.accessoriesLib.drawAccessory(tctx, acc.id, color, 1);
            wrap.appendChild(thumbCanvas);

            // Equipped badge
            if (isEquipped) {
                const badge = document.createElement('span');
                badge.className = 'part-thumb-equipped';
                badge.textContent = '\u2713';
                wrap.appendChild(badge);
            }

            // Lock icon
            if (isLocked) {
                const lock = document.createElement('span');
                lock.className = 'part-lock-icon';
                lock.textContent = '\uD83D\uDD12';
                wrap.appendChild(lock);
            }

            btn.appendChild(wrap);

            if (!isLocked) {
                btn.addEventListener('click', () => {
                    if (isEquipped) {
                        this._unequipAccessory(slot);
                    } else {
                        this._equipAccessory(acc.id, slot);
                    }
                    // Re-populate to reflect changes
                    this._populateWardrobeSlot(slot);
                    this._populateWardrobeColors();
                });
            }

            strip.appendChild(btn);
        }
    }

    _equipAccessory(accId, slot) {
        if (!this._cachedCreature) return;
        const acc = window.accessoriesLib.getById(accId);
        if (!acc) return;

        // Remove any existing accessory in this slot
        this._cachedCreature.accessories = (this._cachedCreature.accessories || [])
            .filter(a => {
                const meta = window.accessoriesLib.getById(a.type);
                return !meta || meta.slot !== slot;
            });

        // Add new accessory
        this._cachedCreature.accessories.push({
            type: accId,
            slot: slot,
            color: acc.defaultColor
        });

        // Invalidate cache and save
        window.creatureCache.invalidatePart(
            this._activeCreatureId, 'accessories', this._cachedCreature
        );
        window.saveManager.updateCreature(this._activeCreatureId, {
            accessories: this._cachedCreature.accessories
        });

        window.audioManager.playSound('sparkle');
        // Sparkle burst on creature
        if (this._activeCanvas) {
            const { w, h } = this._activeCanvas;
            window.renderer.spawnSparkles(w / 2, h / 2, 5);
        }
    }

    _unequipAccessory(slot) {
        if (!this._cachedCreature) return;

        this._cachedCreature.accessories = (this._cachedCreature.accessories || [])
            .filter(a => {
                const meta = window.accessoriesLib.getById(a.type);
                return !meta || meta.slot !== slot;
            });

        window.creatureCache.invalidatePart(
            this._activeCreatureId, 'accessories', this._cachedCreature
        );
        window.saveManager.updateCreature(this._activeCreatureId, {
            accessories: this._cachedCreature.accessories
        });

        window.audioManager.playSound('pop');
    }

    _populateWardrobeColors() {
        const row = document.getElementById('wardrobe-color-row');
        if (!row) return;

        // Find equipped accessory for current slot
        const slot = this._wardrobeSlot;
        const creature = this._cachedCreature;
        if (!creature) {
            row.classList.add('hidden');
            return;
        }

        const equipped = (creature.accessories || []).find(a => {
            const meta = window.accessoriesLib.getById(a.type);
            return meta && meta.slot === slot;
        });

        if (!equipped) {
            row.classList.add('hidden');
            return;
        }

        row.classList.remove('hidden');
        row.innerHTML = '';

        const colors = [
            '#FF69B4', '#FF6B6B', '#FFD700', '#FF8C00',
            '#9B59B6', '#4A90D9', '#00CED1', '#27AE60',
            '#C0C0C0', '#8B4513', '#2C2416', '#FFFFFF'
        ];

        for (const color of colors) {
            const swatch = document.createElement('button');
            swatch.className = 'wardrobe-color-swatch';
            swatch.setAttribute('role', 'radio');
            swatch.setAttribute('aria-label', this._colorName(color));
            swatch.setAttribute('aria-checked', equipped.color === color ? 'true' : 'false');
            swatch.style.backgroundColor = color;
            if (color === '#FFFFFF') {
                swatch.classList.add('wardrobe-color-swatch--white');
            }

            swatch.addEventListener('click', () => {
                equipped.color = color;
                window.creatureCache.invalidatePart(
                    this._activeCreatureId, 'accessories', this._cachedCreature
                );
                window.saveManager.updateCreature(this._activeCreatureId, {
                    accessories: this._cachedCreature.accessories
                });
                // Update swatch selection
                row.querySelectorAll('.wardrobe-color-swatch').forEach(s => {
                    s.setAttribute('aria-checked', 'false');
                });
                swatch.setAttribute('aria-checked', 'true');
                // Re-draw thumbnails
                this._populateWardrobeSlot(slot);
            });

            row.appendChild(swatch);
        }
    }

    // ── Room Edit UI ──────────────────────────────────────

    _populateRoomUI() {
        this._populateRoomItemStrip();
        this._populateWallColorPicker();
        this._populateFloorPatternPicker();
    }

    _populateRoomItemStrip() {
        const strip = document.getElementById('room-items-strip');
        if (!strip) return;

        strip.innerHTML = '';
        const atMax = window.roomManager.isAtMaxItems();

        for (const item of ROOM_ITEM_CATALOG) {
            const btn = document.createElement('button');
            btn.className = 'part-thumb';
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', item.label);
            btn.setAttribute('aria-selected', 'false');

            if (atMax) {
                btn.disabled = true;
            }

            // Emoji thumbnail
            const wrap = document.createElement('div');
            wrap.className = 'part-thumb-wrap';
            const emoji = document.createElement('span');
            emoji.className = 'room-item-emoji';
            emoji.textContent = item.emoji;
            wrap.appendChild(emoji);
            btn.appendChild(wrap);

            btn.addEventListener('click', () => {
                if (window.roomManager.addItem(item.type)) {
                    window.audioManager.playSound('pop');
                    // Refresh strip to update disabled state
                    this._populateRoomItemStrip();
                } else {
                    window.saveManager._showToast('Room is full! (8 items max)');
                }
            });

            strip.appendChild(btn);
        }
    }

    _populateWallColorPicker() {
        const row = document.getElementById('room-wall-colors');
        if (!row) return;

        // Keep the label, remove old swatches
        const label = row.querySelector('.room-picker-label');
        row.innerHTML = '';
        if (label) row.appendChild(label);

        const currentColor = this._cachedCreature
            ? (this._cachedCreature.room.wallColor || '#FFE4E1')
            : '#FFE4E1';

        for (const color of WALL_COLORS) {
            const swatch = document.createElement('button');
            swatch.className = 'room-wall-swatch';
            swatch.setAttribute('role', 'radio');
            swatch.setAttribute('aria-label', 'Wall color: ' + this._colorName(color));
            swatch.setAttribute('aria-checked', color === currentColor ? 'true' : 'false');
            swatch.style.backgroundColor = color;

            swatch.addEventListener('click', () => {
                window.roomManager.setWallColor(color);
                // Update selection
                row.querySelectorAll('.room-wall-swatch').forEach(s => {
                    s.setAttribute('aria-checked', 'false');
                });
                swatch.setAttribute('aria-checked', 'true');
            });

            row.appendChild(swatch);
        }
    }

    _populateFloorPatternPicker() {
        const row = document.getElementById('room-floor-patterns');
        if (!row) return;

        const label = row.querySelector('.room-picker-label');
        row.innerHTML = '';
        if (label) row.appendChild(label);

        const currentPattern = this._cachedCreature
            ? (this._cachedCreature.room.floorPattern || 'wood')
            : 'wood';

        const labels = { wood: 'Wood', carpet: 'Carpet', tiles: 'Tiles' };

        for (const pattern of FLOOR_PATTERNS) {
            const btn = document.createElement('button');
            btn.className = 'room-floor-btn';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-label', labels[pattern]);
            btn.setAttribute('aria-checked', pattern === currentPattern ? 'true' : 'false');
            btn.textContent = labels[pattern];

            btn.addEventListener('click', () => {
                window.roomManager.setFloorPattern(pattern);
                row.querySelectorAll('.room-floor-btn').forEach(b => {
                    b.setAttribute('aria-checked', 'false');
                });
                btn.setAttribute('aria-checked', 'true');
            });

            row.appendChild(btn);
        }
    }

    // ── Settings ─────────────────────────────────────────

    _applySettings() {
        const settings = window.saveManager.getSettings();
        window.audioManager.setVolume(settings.volume / 100);
        window.audioManager.setMuted(settings.muted);
        window.audioManager.setMusicEnabled(settings.musicEnabled);
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
                window.audioManager.setVolume(vol / 100);
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

        // Music toggle (ADHD-friendly opt-in, defaults to Off)
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            const settings = window.saveManager.getSettings();
            musicToggle.textContent = settings.musicEnabled ? 'On' : 'Off';
            musicToggle.setAttribute('aria-checked', String(settings.musicEnabled));

            musicToggle.addEventListener('click', () => {
                const currentSettings = window.saveManager.getSettings();
                const newEnabled = !currentSettings.musicEnabled;
                window.audioManager.setMusicEnabled(newEnabled);
                window.saveManager.updateSettings({ musicEnabled: newEnabled });
                musicToggle.textContent = newEnabled ? 'On' : 'Off';
                musicToggle.setAttribute('aria-checked', String(newEnabled));
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

        document.getElementById('btn-settings').addEventListener('click', () => {
            window.uiManager.showOverlay('overlay-settings');
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

        document.getElementById('btn-undo').addEventListener('click', () => {
            window.creator.undo();
        });
        document.getElementById('btn-redo').addEventListener('click', () => {
            window.creator.redo();
        });

        document.getElementById('btn-name-finish').addEventListener('click', () => {
            if (window.creator.canFinish()) {
                this.setState('NAMING');
            }
        });

        // Naming screen birth button is bound in _bindNamingEvents()

        // Care action buttons — start activities (not instant effects)
        document.getElementById('btn-feed').addEventListener('click', () => {
            if (!this._cachedCreature) return;
            window.careManager.startActivity('feeding');
        });
        document.getElementById('btn-bathe').addEventListener('click', () => {
            if (!this._cachedCreature) return;
            window.careManager.startActivity('bathing');
        });
        document.getElementById('btn-pet').addEventListener('click', () => {
            if (!this._cachedCreature) return;
            window.careManager.startActivity('petting');
        });
        document.getElementById('btn-play').addEventListener('click', () => {
            if (!this._cachedCreature) return;
            window.careManager.startActivity('playing');
        });
        document.getElementById('btn-sleep').addEventListener('click', () => {
            if (!this._cachedCreature) return;
            if (!window.careManager.canSleep()) {
                window.saveManager._showToast('Not tired!');
                return;
            }
            window.careManager.startActivity('sleeping');
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
