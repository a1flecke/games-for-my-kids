/**
 * care.js — Care mode: room drawing, needs, mini-game activities, expressions, growth.
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 *
 * Activity state machine:
 *   IDLE -> FEEDING / BATHING / PETTING / PLAYING / SLEEPING -> IDLE
 *
 * Needs mechanics:
 *   - Decay ONLY during active play (1pt / 2min / need)
 *   - Floor at 20 — never desperate
 *   - On reopen: creature greets happily regardless of absence
 *
 * Touch reactions (when IDLE):
 *   - Tap creature body regions for voice + particle responses
 */

class CareManager {
    constructor() {
        this._creature = null;
        this._needsDecayTimer = null;
        this._decayIntervalMs = 120000; // 2 minutes
        this._needsFloor = 20;

        // Activity state
        this._activity = null; // null = IDLE, or 'feeding'/'bathing'/'petting'/'playing'/'sleeping'
        this._activityTimer = 0;

        // Feed activity state
        this._foodItems = [
            { type: 'cupcake', emoji: '🧁', color: '#FF69B4' },
            { type: 'apple', emoji: '🍎', color: '#FF6B6B' },
            { type: 'fish', emoji: '🐟', color: '#4A90D9' }
        ];
        this._foodPositions = []; // computed on activity start
        this._feedAnimProgress = -1; // -1 = not animating, 0-1 = float to mouth
        this._feedChosenFood = null;
        this._feedStartPos = { x: 0, y: 0 };

        // Bathe activity state
        this._bathDirtParticles = []; // { x, y, alpha } relative to creature center
        this._bathSwipeCount = 0;
        this._bathSwipesNeeded = 5;
        this._bathSpongePos = { x: 0, y: 0, visible: false };
        this._bathLastSwipeRegion = -1; // prevent same-region double count

        // Pet activity state
        this._petHeartCount = 0;
        this._petHeartsNeeded = 8;

        // Play activity state
        this._ballX = 0;
        this._ballY = 0;
        this._ballVX = 0;
        this._ballVY = 0;
        this._ballCatches = 0;
        this._ballCatchesNeeded = 3;
        this._ballRadius = 15;
        this._ballColor = '#FF6B6B';
        this._ballCatchAnim = 0; // > 0 means ball was just caught, showing burst

        // Sleep activity state
        this._sleepProgress = 0; // 0-1, lerp to bed
        this._sleepPhase = 'walk'; // 'walk', 'sleeping', 'waking'
        this._sleepWalkDuration = 1000; // ms to walk to bed
        this._sleepDuration = 3000; // ms sleeping
        this._sleepWakeDuration = 500; // ms waking up
        this._sleepStartEnergy = 0; // cached on sleep start
        this._sleepLastVisualEnergy = -1;
        this._sleepEnergyFill = null; // cached DOM ref

        // Re-entry guard for _completeActivity
        this._completing = false;

        // Expression state
        this._currentExpression = 'content';
        this._expressionCheckTimer = 0;
        this._expressionCheckInterval = 5000; // check every 5s

        // Touch reaction state
        this._canvasBound = false;
        this._creatureScreenPos = { x: 0, y: 0, displaySize: 0 }; // mutated by draw()
        this._creatureScreenPosValid = false;
        this._lastTapTime = 0;

        // Room furniture positions (computed on draw, relative to w/h)
        this._roomPositions = null; // cached { bed, bowl, ball, window }

        // Needs display change detection
        this._lastRenderedNeeds = null;

    }

    /**
     * Enter care mode for a creature.
     */
    startCaring(creature) {
        this.cancel();
        this._creature = creature;
        this._creature.lastActiveAt = Date.now();
        window.saveManager.updateCreature(creature.id, { lastActiveAt: this._creature.lastActiveAt });
        this._activity = null;
        this._currentExpression = 'content';
        this._expressionCheckTimer = 0;
        this._lastRenderedNeeds = null;
        this._startNeedsDecay();
        this._bindCareCanvas();
    }

    /**
     * Cancel all timers and cleanup.
     */
    cancel() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = null;
        if (this._activity) {
            this._activity = null;
            this._setActionButtonsDisabled(false);
        }
        this._creature = null;
        this._creatureScreenPosValid = false;
        this._roomPositions = null;
        this._lastRenderedNeeds = null;
    }

    /**
     * Start a care activity. Disables action buttons.
     */
    startActivity(type) {
        if (!this._creature) return;
        if (this._activity) return; // already in an activity

        this._activity = type;
        this._activityTimer = 0;

        // Disable action buttons during activity
        this._setActionButtonsDisabled(true);

        switch (type) {
            case 'feeding':
                this._initFeeding();
                break;
            case 'bathing':
                this._initBathing();
                break;
            case 'petting':
                this._initPetting();
                break;
            case 'playing':
                this._initPlaying();
                break;
            case 'sleeping':
                this._initSleeping();
                break;
        }
    }

    /**
     * Complete the current activity. Applies effects, re-enables buttons.
     */
    _completeActivity() {
        if (!this._creature || !this._activity) return;
        if (this._completing) return;
        this._completing = true;

        const activity = this._activity;
        this._activity = null;
        this._activityTimer = 0;

        switch (activity) {
            case 'feeding':
                this._creature.needs.hunger = Math.min(100, this._creature.needs.hunger + 30);
                // Bonus for favorite food
                if (this._feedChosenFood && this._creature.favorites &&
                    this._feedChosenFood.type === this._creature.favorites.food) {
                    this._creature.needs.hunger = Math.min(100, this._creature.needs.hunger + 10);
                }
                this._creature.totalCareActions++;
                window.audioManager.playSound('munch');
                break;

            case 'bathing':
                this._creature.needs.cleanliness = Math.min(100, this._creature.needs.cleanliness + 40);
                this._creature.totalCareActions++;
                window.audioManager.playSound('sparkle');
                break;

            case 'petting':
                this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 15);
                this._creature.totalCareActions++;
                window.audioManager.playSound('happy');
                break;

            case 'playing':
                this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 20);
                this._creature.needs.energy = Math.max(this._needsFloor, this._creature.needs.energy - 10);
                this._creature.totalCareActions++;
                window.audioManager.playSound('happy');
                break;

            case 'sleeping':
                this._creature.needs.energy = Math.min(100, this._creature.needs.energy + 50);
                this._creature.totalCareActions++;
                break;
        }

        // Play happy animation after activity
        if (this._creature.id && activity !== 'sleeping') {
            window.animationEngine.startAnimation(
                this._creature.id, 'happy', this._creature
            );
        } else if (this._creature.id && activity === 'sleeping') {
            window.animationEngine.startAnimation(
                this._creature.id, 'idle', this._creature
            );
        }

        // Check growth and save
        this._checkGrowth();

        // Update needs display
        if (window.game) {
            window.game._updateNeedsDisplay(this._creature.needs);
        }

        // Spawn celebration particles
        const pos = this._creatureScreenPos;
        if (pos.displaySize > 0) {
            window.renderer.spawnSparkles(pos.x, pos.y - pos.displaySize * 0.3, 6);
        }

        // Re-enable action buttons
        this._setActionButtonsDisabled(false);
        this._completing = false;
    }

    /**
     * Cancel the current activity without applying effects.
     */
    cancelActivity() {
        if (!this._activity) return;
        this._activity = null;
        this._activityTimer = 0;

        // Restore idle animation
        if (this._creature && this._creature.id) {
            window.animationEngine.startAnimation(
                this._creature.id, 'idle', this._creature
            );
        }

        this._setActionButtonsDisabled(false);
    }

    /**
     * Check if an activity is active.
     */
    isInActivity() {
        return this._activity !== null;
    }

    /**
     * Check if sleep should be available.
     */
    canSleep() {
        if (!this._creature) return false;
        return this._creature.needs.energy < 80;
    }

    // ── Activity Initialization ──────────────────────────

    _initFeeding() {
        this._feedAnimProgress = -1;
        this._feedChosenFood = null;
        this._foodPositions = []; // computed in draw based on canvas size
        window.audioManager.playCreatureVoice(this._creature);
    }

    _initBathing() {
        this._bathSwipeCount = 0;
        this._bathLastSwipeRegion = -1;
        this._bathSpongePos = { x: 0, y: 0, visible: false };
        // Generate dirt particles around creature
        this._bathDirtParticles = [];
        for (let i = 0; i < 10; i++) {
            this._bathDirtParticles.push({
                x: (Math.random() - 0.5) * 0.7,  // relative to creature size
                y: (Math.random() - 0.5) * 0.7,
                alpha: 0.6 + Math.random() * 0.4,
                size: 3 + Math.random() * 4
            });
        }
        // Start bathing animation
        if (this._creature && this._creature.id) {
            window.animationEngine.startAnimation(
                this._creature.id, 'bathing', this._creature
            );
        }
        window.audioManager.playSound('splash');
    }

    _initPetting() {
        this._petHeartCount = 0;
        // Keep idle animation during petting (happy starts on complete)
    }

    _initPlaying() {
        // Start ball at random position in play area
        this._ballCatches = 0;
        this._ballCatchAnim = 0;
        this._resetBallPosition();
        window.audioManager.playSound('pop');
    }

    _resetBallPosition() {
        // Ball spawns in lower half of canvas, away from creature
        const w = this._creatureScreenPos.displaySize > 0 ? (this._creatureScreenPos.x * 2) : 300;
        const h = this._creatureScreenPos.displaySize > 0 ? (this._creatureScreenPos.y * 2.4) : 400;
        this._ballX = 50 + Math.random() * (w - 100);
        this._ballY = h * 0.55 + Math.random() * (h * 0.25);
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 40;
        this._ballVX = Math.cos(angle) * speed;
        this._ballVY = Math.sin(angle) * speed;
    }

    _initSleeping() {
        this._sleepProgress = 0;
        this._sleepPhase = 'walk';
        this._sleepStartEnergy = this._creature ? this._creature.needs.energy : 0;
        this._sleepLastVisualEnergy = -1;
        this._sleepEnergyFill = document.querySelector('.need-meter-fill[data-need="energy"]');
        if (this._creature && this._creature.id) {
            window.animationEngine.startAnimation(
                this._creature.id, 'walk', this._creature
            );
        }
    }

    // ── Disable/Enable Action Buttons ────────────────────

    _setActionButtonsDisabled(disabled) {
        const ids = ['btn-feed', 'btn-bathe', 'btn-pet', 'btn-play', 'btn-sleep'];
        for (const id of ids) {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = disabled;
        }
    }

    // ── Canvas Input ─────────────────────────────────────

    /**
     * Bind pointerdown on the care canvas for touch reactions and activity input.
     */
    _bindCareCanvas() {
        const canvas = document.getElementById('care-canvas');
        if (!canvas || this._canvasBound) return;

        this._canvasBound = true;

        canvas.addEventListener('pointerdown', (e) => {
            this._onCanvasDown(e, canvas);
        });

        canvas.addEventListener('pointermove', (e) => {
            this._onCanvasMove(e, canvas);
        });

        canvas.addEventListener('pointerup', (e) => {
            this._onCanvasUp(e, canvas);
        });
    }

    /**
     * Convert pointer event to CSS coordinates (DPR-aware).
     */
    _pointerToCSS(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const tapX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const tapY = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x: tapX / dpr, y: tapY / dpr };
    }

    _onCanvasDown(e, canvas) {
        if (!this._creature || !this._creatureScreenPosValid) return;

        const { x, y } = this._pointerToCSS(e, canvas);

        // Route to activity handler
        if (this._activity === 'feeding') {
            this._onFeedTap(x, y);
            return;
        }
        if (this._activity === 'bathing') {
            this._bathSpongePos.x = x;
            this._bathSpongePos.y = y;
            this._bathSpongePos.visible = true;
            canvas.setPointerCapture(e.pointerId);
            return;
        }
        if (this._activity === 'petting') {
            canvas.setPointerCapture(e.pointerId);
            this._onPetStroke(x, y);
            return;
        }
        if (this._activity === 'playing') {
            this._onPlayTap(x, y);
            return;
        }
        if (this._activity === 'sleeping') {
            // Tap to skip sleep
            this._completeActivity();
            return;
        }

        // IDLE mode: tap creature for reactions
        this._onCreatureTap(x, y);
    }

    _onCanvasMove(e, canvas) {
        if (!this._creature) return;

        const { x, y } = this._pointerToCSS(e, canvas);

        if (this._activity === 'bathing') {
            this._bathSpongePos.x = x;
            this._bathSpongePos.y = y;
            this._bathSpongePos.visible = true;
            this._onBathSwipe(x, y);
            return;
        }
        if (this._activity === 'petting') {
            this._onPetStroke(x, y);
            return;
        }
    }

    _onCanvasUp(e, canvas) {
        if (this._activity === 'bathing') {
            this._bathSpongePos.visible = false;
        }
    }

    // ── Feed Activity Input ──────────────────────────────

    _onFeedTap(x, y) {
        if (this._feedAnimProgress >= 0) return; // already animating

        // Check if tap hits any food item
        for (const food of this._foodPositions) {
            const dx = x - food.cx;
            const dy = y - food.cy;
            if (Math.abs(dx) < 35 && Math.abs(dy) < 35) {
                this._feedChosenFood = food;
                this._feedStartPos = { x: food.cx, y: food.cy };
                this._feedAnimProgress = 0;
                window.audioManager.playSound('pop');

                // Start eating animation
                if (this._creature.id) {
                    window.animationEngine.startAnimation(
                        this._creature.id, 'eating', this._creature
                    );
                }
                return;
            }
        }
    }

    // ── Bathe Activity Input ─────────────────────────────

    _onBathSwipe(x, y) {
        if (!this._creature || this._bathSwipeCount >= this._bathSwipesNeeded) return;

        const pos = this._creatureScreenPos;
        const halfSize = pos.displaySize / 2;

        // Check if swipe is within creature bounds
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (Math.abs(dx) > halfSize || Math.abs(dy) > halfSize) return;

        // Determine which region (split creature into 3 vertical zones)
        const relY = (y - (pos.y - halfSize)) / pos.displaySize;
        const region = Math.floor(relY * 3);
        if (region === this._bathLastSwipeRegion) return;

        this._bathLastSwipeRegion = region;
        this._bathSwipeCount++;

        // Remove a dirt particle
        if (this._bathDirtParticles.length > 0) {
            const removed = this._bathDirtParticles.pop();
            // Spawn clean sparkles where dirt was
            window.renderer.spawnCleanSparkles(
                pos.x + removed.x * pos.displaySize,
                pos.y + removed.y * pos.displaySize,
                3
            );
        }

        window.audioManager.playSound('brush');

        // Check completion
        if (this._bathSwipeCount >= this._bathSwipesNeeded) {
            // Clear remaining dirt
            this._bathDirtParticles = [];
            // Short delay then complete
            this._activityTimer = -500; // will complete when timer reaches 0 after 500ms
        }
    }

    // ── Pet Activity Input ───────────────────────────────

    _onPetStroke(x, y) {
        if (this._petHeartCount >= this._petHeartsNeeded) return;

        const pos = this._creatureScreenPos;
        const halfSize = pos.displaySize / 2;

        // Check within creature bounds
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (Math.abs(dx) > halfSize || Math.abs(dy) > halfSize) return;

        // Debounce (only count every 200ms)
        const now = performance.now();
        if (now - this._lastTapTime < 200) return;
        this._lastTapTime = now;

        this._petHeartCount++;
        window.renderer.spawnHearts(x, y - 10, 2);
        window.audioManager.playCreatureVoice(this._creature);

        if (this._petHeartCount >= this._petHeartsNeeded) {
            // Short delay then complete
            this._activityTimer = -300;
        }
    }

    // ── Play Activity Input ──────────────────────────────

    _onPlayTap(x, y) {
        if (this._ballCatches >= this._ballCatchesNeeded) return;
        if (this._ballCatchAnim > 0) return; // already catching

        const dx = x - this._ballX;
        const dy = y - this._ballY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 50) {
            // Caught!
            this._ballCatches++;
            this._ballCatchAnim = 300; // 300ms catch animation
            window.audioManager.playSound('pop');
            window.renderer.spawnSparkles(this._ballX, this._ballY, 4);

            // Creature does a happy hop
            if (this._creature.id) {
                window.animationEngine.startAnimation(
                    this._creature.id, 'happy', this._creature
                );
            }

            if (this._ballCatches >= this._ballCatchesNeeded) {
                this._activityTimer = -500; // complete after 500ms
            } else {
                // Respawn ball after catch animation
                // Ball will respawn when _ballCatchAnim reaches 0
            }
        }
    }

    // ── Creature Tap (IDLE mode) ─────────────────────────

    _onCreatureTap(x, y) {
        // Debounce rapid taps (300ms cooldown)
        const now = performance.now();
        if (now - this._lastTapTime < 300) return;
        this._lastTapTime = now;

        const pos = this._creatureScreenPos;
        const halfSize = pos.displaySize / 2;

        // Check if tap is within creature bounds
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (Math.abs(dx) > halfSize || Math.abs(dy) > halfSize) return;

        // Determine body region
        const relY = (y - (pos.y - halfSize)) / pos.displaySize;
        const relX = (x - (pos.x - halfSize)) / pos.displaySize;

        const body = this._creature.body;
        const hasWings = body && body.wings && body.wings.type;
        const hasTail = body && body.tail && body.tail.type;

        // Wings
        if (hasWings && (relX < 0.15 || relX > 0.85)) {
            window.audioManager.playSound('wingWhoosh');
            window.renderer.spawnSparkles(x, y, 4);
            return;
        }
        // Tail
        if (hasTail && relX > 0.75 && relY > 0.3 && relY < 0.7) {
            window.audioManager.playVoice('mew', 0);
            window.renderer.spawnHearts(x, y, 3);
            if (this._creature.id) {
                window.animationEngine.startAnimation(this._creature.id, 'happy', this._creature);
            }
            return;
        }
        // Head
        if (relY < 0.35) {
            window.audioManager.playCreatureVoice(this._creature);
            window.renderer.spawnSparkles(x, y, 4);
            return;
        }
        // Legs
        if (relY > 0.7) {
            window.audioManager.playVoice('squeak', 0);
            window.renderer.spawnSparkles(x, y, 3);
            return;
        }
        // Tummy (default)
        window.audioManager.playVoice('chirp', 0);
        window.renderer.spawnHearts(x, y, 4);
    }

    // ── Needs Decay ──────────────────────────────────────

    _startNeedsDecay() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = setInterval(() => {
            if (!this._creature) return;
            const needs = this._creature.needs;
            for (const key of ['hunger', 'cleanliness', 'energy', 'happiness']) {
                needs[key] = Math.max(this._needsFloor, needs[key] - 1);
            }
            window.saveManager.updateCreature(this._creature.id, { needs });
            if (window.game) {
                window.game._updateNeedsDisplay(needs);
            }
        }, this._decayIntervalMs);
    }

    // ── Expression System ────────────────────────────────

    /**
     * Get expression state based on needs.
     */
    getExpression() {
        if (!this._creature) return 'content';
        const n = this._creature.needs;
        if (n.hunger < 40) return 'hungry';
        if (n.cleanliness < 40) return 'messy';
        if (n.energy < 40) return 'tired';
        if (n.happiness < 40) return 'bored';
        return 'content';
    }

    /**
     * Check expression and update animation if changed.
     */
    _updateExpression() {
        if (!this._creature || this._activity) return;

        const expr = this.getExpression();
        if (expr === this._currentExpression) return;

        this._currentExpression = expr;

        // Map expression to animation
        const animMap = {
            'content': 'idle',
            'hungry': 'bored',
            'messy': 'bored',
            'tired': 'bored',
            'bored': 'bored'
        };

        if (this._creature.id) {
            window.animationEngine.startAnimation(
                this._creature.id, animMap[expr] || 'idle', this._creature
            );
        }
    }

    // ── Growth System ────────────────────────────────────

    _checkGrowth() {
        if (!this._creature) return;
        const actions = this._creature.totalCareActions;
        let newStage = 'baby';
        if (actions >= 50) newStage = 'adult';
        else if (actions >= 20) newStage = 'kid';

        const grew = newStage !== this._creature.growthStage;
        this._creature.growthStage = newStage;

        window.saveManager.updateCreature(this._creature.id, {
            needs: this._creature.needs,
            totalCareActions: this._creature.totalCareActions,
            growthStage: this._creature.growthStage
        });

        if (grew) {
            // Growth celebration
            window.audioManager.playSound('happy');
            const pos = this._creatureScreenPos;
            if (pos.displaySize > 0) {
                window.renderer.spawnSparkles(pos.x, pos.y, 8);
                window.renderer.spawnHearts(pos.x, pos.y - pos.displaySize * 0.4, 5);
            }

            // Show unlock overlay with growth message
            const msgEl = document.getElementById('unlock-message');
            if (msgEl) {
                msgEl.textContent = this._creature.name + ' is now a ' + newStage + '!';
            }
            window.uiManager.showOverlay('overlay-unlock');
        }
    }

    // ── Update (called by game.js each frame) ────────────

    update(dt) {
        if (!this._creature) return;

        // Expression check (every 5s, not every frame)
        this._expressionCheckTimer += dt;
        if (this._expressionCheckTimer >= this._expressionCheckInterval) {
            this._expressionCheckTimer = 0;
            this._updateExpression();
        }

        // Update active activity
        if (this._activity) {
            this._activityTimer += dt;
            this._updateActivity(dt);
        }
    }

    _updateActivity(dt) {
        switch (this._activity) {
            case 'feeding':
                this._updateFeeding(dt);
                break;
            case 'bathing':
                this._updateBathing(dt);
                break;
            case 'petting':
                this._updatePetting(dt);
                break;
            case 'playing':
                this._updatePlaying(dt);
                break;
            case 'sleeping':
                this._updateSleeping(dt);
                break;
        }
    }

    _updateFeeding(dt) {
        if (this._feedAnimProgress >= 0) {
            this._feedAnimProgress += dt / 2000; // 2s float animation
            if (this._feedAnimProgress >= 1) {
                this._completeActivity();
            }
        }
    }

    _updateBathing(dt) {
        // Check for delayed completion
        if (this._bathSwipeCount >= this._bathSwipesNeeded && this._activityTimer >= 0) {
            this._completeActivity();
        }
    }

    _updatePetting(dt) {
        // Check for delayed completion
        if (this._petHeartCount >= this._petHeartsNeeded && this._activityTimer >= 0) {
            this._completeActivity();
        }
    }

    _updatePlaying(dt) {
        // Ball catch animation countdown
        if (this._ballCatchAnim > 0) {
            this._ballCatchAnim -= dt;
            if (this._ballCatchAnim <= 0 && this._ballCatches < this._ballCatchesNeeded) {
                this._resetBallPosition();
            }
        }

        // Move ball (only when not in catch animation)
        if (this._ballCatchAnim <= 0 && this._ballCatches < this._ballCatchesNeeded) {
            const dtSec = dt / 1000;
            this._ballX += this._ballVX * dtSec;
            this._ballY += this._ballVY * dtSec;

            // Use cached canvas dimensions from room position computation
            const maxW = this._roomPositions ? this._roomPositions._canvasW : 300;
            const maxH = this._roomPositions ? this._roomPositions._canvasH : 400;

            // Bounce off walls
            if (this._ballX < this._ballRadius) {
                this._ballX = this._ballRadius;
                this._ballVX = Math.abs(this._ballVX);
            }
            if (this._ballX > maxW - this._ballRadius) {
                this._ballX = maxW - this._ballRadius;
                this._ballVX = -Math.abs(this._ballVX);
            }
            if (this._ballY < maxH * 0.4) {
                this._ballY = maxH * 0.4;
                this._ballVY = Math.abs(this._ballVY);
            }
            if (this._ballY > maxH - this._ballRadius - 10) {
                this._ballY = maxH - this._ballRadius - 10;
                this._ballVY = -Math.abs(this._ballVY);
            }
        }

        // Check for delayed completion
        if (this._ballCatches >= this._ballCatchesNeeded && this._activityTimer >= 0) {
            this._completeActivity();
        }
    }

    _updateSleeping(dt) {
        this._sleepProgress += dt;

        if (this._sleepPhase === 'walk') {
            if (this._sleepProgress >= this._sleepWalkDuration) {
                this._sleepPhase = 'sleeping';
                this._sleepProgress = 0;
                if (this._creature.id) {
                    window.animationEngine.startAnimation(
                        this._creature.id, 'sleeping', this._creature
                    );
                }
            }
        } else if (this._sleepPhase === 'sleeping') {
            // Gradually fill energy display (visual only — actual save on complete)
            if (this._creature) {
                const fillProgress = Math.min(1, this._sleepProgress / this._sleepDuration);
                const targetEnergy = Math.min(100, this._sleepStartEnergy + 50);
                const visualEnergy = Math.round(this._sleepStartEnergy + (targetEnergy - this._sleepStartEnergy) * fillProgress);
                if (visualEnergy !== this._sleepLastVisualEnergy) {
                    this._sleepLastVisualEnergy = visualEnergy;
                    if (this._sleepEnergyFill) {
                        this._sleepEnergyFill.style.width = visualEnergy + '%';
                    }
                }
            }

            if (this._sleepProgress >= this._sleepDuration) {
                this._sleepPhase = 'waking';
                this._sleepProgress = 0;
                window.audioManager.playCreatureVoice(this._creature);
            }
        } else if (this._sleepPhase === 'waking') {
            if (this._sleepProgress >= this._sleepWakeDuration) {
                this._completeActivity();
            }
        }
    }

    // ── Draw (called by game.js each frame) ──────────────

    draw(ctx, w, h) {
        if (!this._creature) return;

        // Compute room positions + cached colors/gradients (invalidated on resize)
        if (!this._roomPositions) {
            const windowPos = { x: w * 0.7, y: h * 0.08, w: 100, h: 80 };
            const wallColor = this._creature.room ? this._creature.room.wallColor : '#FFE4E1';
            const skyGrad = ctx.createLinearGradient(windowPos.x, windowPos.y, windowPos.x, windowPos.y + windowPos.h);
            skyGrad.addColorStop(0, '#87CEEB');
            skyGrad.addColorStop(1, '#B0E0E6');
            this._roomPositions = {
                bed: { x: w * 0.72, y: h * 0.55, w: 90, h: 50 },
                bowl: { x: w * 0.18, y: h * 0.68, w: 40, h: 22 },
                toyBall: { x: w * 0.35, y: h * 0.72, r: 12 },
                window: windowPos,
                _skyGrad: skyGrad,
                _bedDark: this._darkenColor(wallColor, 0.85),
                _bedLight: this._lightenColor(wallColor, 1.1),
                _bedOutline: this._darkenColor(wallColor, 0.7),
                _ballOutline: this._darkenColor(this._ballColor, 0.8),
                _ballPlayOutline: this._darkenColor(this._ballColor, 0.7),
                _canvasW: w,
                _canvasH: h
            };
        }

        // Draw room furniture (behind creature)
        this._drawRoomFurniture(ctx, w, h);

        // Creature position
        const displaySize = Math.min(w, h) * 0.45;
        let cx = w / 2;
        let cy = h * 0.42;

        // During sleep walk, lerp creature toward bed
        if (this._activity === 'sleeping' && this._sleepPhase === 'walk') {
            const t = Math.min(1, this._sleepProgress / this._sleepWalkDuration);
            const eased = t * (2 - t); // easeOutQuad
            const bedCenter = this._roomPositions.bed;
            cx = w / 2 + (bedCenter.x - w / 2) * eased;
            cy = h * 0.42 + (bedCenter.y - 10 - h * 0.42) * eased;
        } else if (this._activity === 'sleeping' && (this._sleepPhase === 'sleeping' || this._sleepPhase === 'waking')) {
            // Stay at bed
            cx = this._roomPositions.bed.x;
            cy = this._roomPositions.bed.y - 10;
        }

        // Update cached screen position
        this._creatureScreenPos.x = cx;
        this._creatureScreenPos.y = cy;
        this._creatureScreenPos.displaySize = displaySize;
        this._creatureScreenPosValid = true;

        // Update creature position for particle spawning
        window.animationEngine.setCreaturePosition(this._creature.id, cx, cy, displaySize);

        // Draw creature
        if (window.creatureCache.hasCache(this._creature.id)) {
            const animState = window.animationEngine.getState(this._creature.id);
            window.creatureCache.drawCreatureById(
                ctx, cx, cy, animState, displaySize, this._creature.id
            );
        }

        // Draw activity overlays (on top of creature)
        if (this._activity) {
            this._drawActivity(ctx, w, h);
        }

        // Draw expression indicators (dirty particles for messy, etc.)
        this._drawExpressionIndicators(ctx, w, h);
    }

    // ── Room Furniture Drawing ───────────────────────────

    _drawRoomFurniture(ctx, w, h) {
        const r = this._roomPositions;

        // Window
        this._drawWindow(ctx, r.window);

        // Bed
        this._drawBed(ctx, r.bed);

        // Food bowl
        this._drawFoodBowl(ctx, r.bowl);

        // Toy ball (only when not in play activity — play has its own bouncing ball)
        if (this._activity !== 'playing') {
            this._drawToyBall(ctx, r.toyBall);
        }
    }

    _drawWindow(ctx, pos) {
        ctx.save();
        // Curtain left
        ctx.fillStyle = '#FFE4E1';
        ctx.beginPath();
        ctx.moveTo(pos.x - 8, pos.y);
        ctx.quadraticCurveTo(pos.x - 8, pos.y + pos.h + 10, pos.x + 15, pos.y + pos.h + 10);
        ctx.lineTo(pos.x - 8, pos.y);
        ctx.fill();
        // Curtain right
        ctx.beginPath();
        ctx.moveTo(pos.x + pos.w + 8, pos.y);
        ctx.quadraticCurveTo(pos.x + pos.w + 8, pos.y + pos.h + 10, pos.x + pos.w - 15, pos.y + pos.h + 10);
        ctx.lineTo(pos.x + pos.w + 8, pos.y);
        ctx.fill();

        // Window frame
        ctx.fillStyle = '#FFFAF5';
        ctx.strokeStyle = '#B8A88A';
        ctx.lineWidth = 3;
        const radius = 8;
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.w, pos.h, radius);
        ctx.fill();
        ctx.stroke();

        // Sky gradient inside (cached)
        ctx.fillStyle = this._roomPositions._skyGrad;
        ctx.beginPath();
        ctx.roundRect(pos.x + 4, pos.y + 4, pos.w - 8, pos.h - 8, radius - 2);
        ctx.fill();

        // Cross panes
        ctx.strokeStyle = '#FFFAF5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pos.x + pos.w / 2, pos.y + 4);
        ctx.lineTo(pos.x + pos.w / 2, pos.y + pos.h - 4);
        ctx.moveTo(pos.x + 4, pos.y + pos.h / 2);
        ctx.lineTo(pos.x + pos.w - 4, pos.y + pos.h / 2);
        ctx.stroke();

        ctx.restore();
    }

    _drawBed(ctx, pos) {
        ctx.save();
        const r = this._roomPositions;

        // Bed base (darker tint of wall color)
        ctx.fillStyle = r._bedDark;
        ctx.beginPath();
        ctx.roundRect(pos.x - pos.w / 2, pos.y, pos.w, pos.h, 10);
        ctx.fill();

        // Mattress/cushion (lighter tint)
        ctx.fillStyle = r._bedLight;
        ctx.beginPath();
        ctx.roundRect(pos.x - pos.w / 2 + 5, pos.y + 5, pos.w - 10, pos.h - 15, 8);
        ctx.fill();

        // Pillow
        ctx.fillStyle = '#FFFAF5';
        ctx.beginPath();
        ctx.ellipse(pos.x - pos.w / 2 + 22, pos.y + 15, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = r._bedOutline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pos.x - pos.w / 2, pos.y, pos.w, pos.h, 10);
        ctx.stroke();

        ctx.restore();
    }

    _drawFoodBowl(ctx, pos) {
        ctx.save();

        // Bowl body
        ctx.fillStyle = '#D4C4A8';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + pos.h * 0.6, pos.w / 2, pos.h, 0, 0, Math.PI);
        ctx.fill();

        // Bowl rim
        ctx.strokeStyle = '#B8A88A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + pos.h * 0.6, pos.w / 2, pos.h * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Bowl interior
        ctx.fillStyle = '#FFFAF5';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + pos.h * 0.6, pos.w / 2 - 3, pos.h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawToyBall(ctx, pos) {
        ctx.save();

        ctx.fillStyle = this._ballColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
        ctx.fill();

        // Star highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(pos.x - 3, pos.y - 3, pos.r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this._roomPositions._ballOutline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // ── Activity Drawing ─────────────────────────────────

    _drawActivity(ctx, w, h) {
        switch (this._activity) {
            case 'feeding':
                this._drawFeeding(ctx, w, h);
                break;
            case 'bathing':
                this._drawBathing(ctx, w, h);
                break;
            case 'petting':
                this._drawPetting(ctx, w, h);
                break;
            case 'playing':
                this._drawPlaying(ctx, w, h);
                break;
            case 'sleeping':
                // Sleep visuals handled by animation engine (zzz particles)
                break;
        }
    }

    _drawFeeding(ctx, w, h) {
        // Compute food positions (3 items at bottom of canvas)
        if (this._foodPositions.length === 0) {
            const y = h * 0.82;
            const spacing = w / 4;
            for (let i = 0; i < this._foodItems.length; i++) {
                this._foodPositions.push({
                    ...this._foodItems[i],
                    cx: spacing + spacing * i,
                    cy: y
                });
            }
        }

        ctx.save();

        // Draw food choices (if not yet chosen)
        if (this._feedAnimProgress < 0) {
            for (const food of this._foodPositions) {
                // Food background circle
                ctx.fillStyle = food.color + '30';
                ctx.beginPath();
                ctx.arc(food.cx, food.cy, 30, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = food.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(food.cx, food.cy, 30, 0, Math.PI * 2);
                ctx.stroke();

                // Food emoji
                ctx.font = "28px OpenDyslexic, 'Comic Sans MS', cursive";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = food.color;
                ctx.fillText(food.emoji, food.cx, food.cy);
            }
        } else if (this._feedChosenFood) {
            // Animate chosen food floating to creature mouth
            const t = Math.min(1, this._feedAnimProgress);
            const eased = t * (2 - t);
            const pos = this._creatureScreenPos;

            const fx = this._feedStartPos.x + (pos.x - this._feedStartPos.x) * eased;
            const fy = this._feedStartPos.y + (pos.y - 20 - this._feedStartPos.y) * eased;
            // Arc upward
            const arcOffset = -40 * Math.sin(t * Math.PI);

            ctx.globalAlpha = 1 - t * 0.3;
            ctx.font = "28px OpenDyslexic, 'Comic Sans MS', cursive";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this._feedChosenFood.color;
            ctx.fillText(this._feedChosenFood.emoji, fx, fy + arcOffset);
        }

        ctx.restore();
    }

    _drawBathing(ctx, w, h) {
        const pos = this._creatureScreenPos;

        ctx.save();

        // Draw dirt particles
        for (const dirt of this._bathDirtParticles) {
            ctx.globalAlpha = dirt.alpha;
            ctx.fillStyle = '#8B7355';
            ctx.beginPath();
            ctx.arc(
                pos.x + dirt.x * pos.displaySize,
                pos.y + dirt.y * pos.displaySize,
                dirt.size,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw sponge at pointer position
        if (this._bathSpongePos.visible) {
            const sx = this._bathSpongePos.x;
            const sy = this._bathSpongePos.y;

            // Sponge shape
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.roundRect(sx - 18, sy - 12, 36, 24, 6);
            ctx.fill();

            ctx.strokeStyle = '#D4A017';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(sx - 18, sy - 12, 36, 24, 6);
            ctx.stroke();

            // Dots on sponge
            ctx.fillStyle = '#D4A017';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(sx - 8 + i * 8, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Progress indicator
        const progress = this._bathSwipeCount / this._bathSwipesNeeded;
        this._drawProgressIndicator(ctx, w, h, progress, '🛁');

        ctx.restore();
    }

    _drawPetting(ctx, w, h) {
        ctx.save();

        // Progress indicator
        const progress = this._petHeartCount / this._petHeartsNeeded;
        this._drawProgressIndicator(ctx, w, h, progress, '💕');

        ctx.restore();
    }

    _drawPlaying(ctx, w, h) {
        ctx.save();

        // Draw bouncing ball
        if (this._ballCatchAnim <= 0 && this._ballCatches < this._ballCatchesNeeded) {
            // Ball shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.ellipse(this._ballX, this._ballY + this._ballRadius + 2, this._ballRadius * 0.8, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ball
            ctx.fillStyle = this._ballColor;
            ctx.beginPath();
            ctx.arc(this._ballX, this._ballY, this._ballRadius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(this._ballX - 4, this._ballY - 4, this._ballRadius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = this._roomPositions._ballPlayOutline;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this._ballX, this._ballY, this._ballRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Progress indicator
        const progress = this._ballCatches / this._ballCatchesNeeded;
        this._drawProgressIndicator(ctx, w, h, progress, '⚽');

        ctx.restore();
    }

    /**
     * Draw a small progress indicator in the top-left corner of the canvas.
     */
    _drawProgressIndicator(ctx, w, h, progress, emoji) {
        const px = 50;
        const py = 30;
        const barW = 60;
        const barH = 8;

        // Background pill
        ctx.fillStyle = 'rgba(255, 250, 245, 0.9)';
        ctx.beginPath();
        ctx.roundRect(px - 30, py - 16, barW + 46, 32, 16);
        ctx.fill();

        ctx.strokeStyle = '#E8DDD0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px - 30, py - 16, barW + 46, 32, 16);
        ctx.stroke();

        // Emoji
        ctx.font = "16px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2C2416';
        ctx.fillText(emoji, px - 14, py);

        // Track
        ctx.fillStyle = '#E8DDD0';
        ctx.beginPath();
        ctx.roundRect(px + 2, py - barH / 2, barW, barH, 4);
        ctx.fill();

        // Fill
        const fillW = Math.max(0, barW * Math.min(1, progress));
        if (fillW > 0) {
            ctx.fillStyle = '#27AE60';
            ctx.beginPath();
            ctx.roundRect(px + 2, py - barH / 2, fillW, barH, 4);
            ctx.fill();
        }
    }

    // ── Expression Indicators ────────────────────────────

    _drawExpressionIndicators(ctx, w, h) {
        if (this._activity) return;
        if (!this._creature) return;

        const pos = this._creatureScreenPos;
        const expr = this._currentExpression;

        // Messy expression: small dirt particles around creature
        if (expr === 'messy') {
            ctx.save();
            ctx.fillStyle = '#8B7355';
            ctx.globalAlpha = 0.3;
            // Static dust motes (positions derived from creature position, not random per frame)
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const dist = pos.displaySize * 0.4;
                ctx.beginPath();
                ctx.arc(
                    pos.x + Math.cos(angle) * dist,
                    pos.y + Math.sin(angle) * dist,
                    2, 0, Math.PI * 2
                );
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // ── Color Utilities ──────────────────────────────────

    _darkenColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return '#' +
            Math.round(r * factor).toString(16).padStart(2, '0') +
            Math.round(g * factor).toString(16).padStart(2, '0') +
            Math.round(b * factor).toString(16).padStart(2, '0');
    }

    _lightenColor(hex, factor) {
        const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
        const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
        const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
        return '#' +
            Math.round(r).toString(16).padStart(2, '0') +
            Math.round(g).toString(16).padStart(2, '0') +
            Math.round(b).toString(16).padStart(2, '0');
    }
}
