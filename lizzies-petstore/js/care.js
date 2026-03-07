/**
 * care.js — Care mode: needs, mini-games, expressions, touch reactions.
 * Manages creature room hub, needs display, interactive care activities.
 *
 * Needs mechanics:
 *   - Decay ONLY during active play (1pt / 2min / need)
 *   - Floor at 20 — never desperate
 *   - On reopen: creature greets happily regardless of absence
 *
 * Touch reactions:
 *   - Tap creature body regions on care canvas for voice + particle responses
 *   - Head -> creature voice + sparkles
 *   - Tummy -> chirp + hearts
 *   - Legs -> squeak + sparkles
 *   - Wings -> wingWhoosh + sparkles
 *   - Tail -> mew + hearts
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

class CareManager {
    constructor() {
        this._creature = null;
        this._needsDecayTimer = null;
        this._decayIntervalMs = 120000; // 2 minutes
        this._needsFloor = 20;
        this._activeMiniGame = null;    // 'feed', 'bathe', 'pet', 'play', 'sleep', or null

        // Touch reaction state
        this._canvasBound = false;
        this._creatureScreenPos = { x: 0, y: 0, displaySize: 0 }; // mutated by draw()
        this._creatureScreenPosValid = false;
        this._lastTapTime = 0; // debounce rapid taps
    }

    /**
     * Enter care mode for a creature.
     */
    startCaring(creature) {
        this.cancel();
        this._creature = creature;
        this._creature.lastActiveAt = Date.now();
        this._startNeedsDecay();
        this._bindCareCanvas();
    }

    /**
     * Cancel all timers and cleanup.
     */
    cancel() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = null;
        this._activeMiniGame = null;
        this._creature = null;
        this._creatureScreenPosValid = false;
    }

    /**
     * Bind pointerdown on the care canvas for touch body reactions.
     * Uses a stored handler reference to avoid stacking.
     */
    _bindCareCanvas() {
        const canvas = document.getElementById('care-canvas');
        if (!canvas || this._canvasBound) return;

        this._canvasBound = true;
        canvas.addEventListener('pointerdown', (e) => {
            this._onCanvasTap(e, canvas);
        });
    }

    /**
     * Handle a tap on the care canvas. Hit-test creature body regions.
     */
    _onCanvasTap(e, canvas) {
        if (!this._creature || !this._creatureScreenPosValid) return;

        // Debounce rapid taps (300ms cooldown)
        const now = performance.now();
        if (now - this._lastTapTime < 300) return;
        this._lastTapTime = now;

        const rect = canvas.getBoundingClientRect();
        const tapX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const tapY = (e.clientY - rect.top) * (canvas.height / rect.height);

        // Convert to CSS coordinates (canvas coords are DPR-scaled)
        const dpr = window.devicePixelRatio || 1;
        const cssX = tapX / dpr;
        const cssY = tapY / dpr;

        const pos = this._creatureScreenPos;
        const halfSize = pos.displaySize / 2;

        // Check if tap is within creature bounds
        const dx = cssX - pos.x;
        const dy = cssY - pos.y;
        if (Math.abs(dx) > halfSize || Math.abs(dy) > halfSize) return;

        // Determine body region based on relative position
        const relY = (cssY - (pos.y - halfSize)) / pos.displaySize; // 0=top, 1=bottom
        const relX = (cssX - (pos.x - halfSize)) / pos.displaySize; // 0=left, 1=right

        const body = this._creature.body;
        const hasWings = body && body.wings && body.wings.type;
        const hasTail = body && body.tail && body.tail.type;

        // Wing regions: far left or far right edges
        if (hasWings && (relX < 0.15 || relX > 0.85)) {
            window.audioManager.playSound('wingWhoosh');
            window.renderer.spawnSparkles(cssX, cssY, 4);
            return;
        }

        // Tail region: right side, mid-height
        if (hasTail && relX > 0.75 && relY > 0.3 && relY < 0.7) {
            window.audioManager.playVoice('mew', 0);
            window.renderer.spawnHearts(cssX, cssY, 3);
            // Brief tail wag animation
            if (this._creature.id) {
                window.animationEngine.startAnimation(
                    this._creature.id, 'happy', this._creature
                );
            }
            return;
        }

        // Head region: top 35%
        if (relY < 0.35) {
            window.audioManager.playCreatureVoice(this._creature);
            window.renderer.spawnSparkles(cssX, cssY, 4);
            return;
        }

        // Legs/feet region: bottom 30%
        if (relY > 0.7) {
            window.audioManager.playVoice('squeak', 0);
            window.renderer.spawnSparkles(cssX, cssY, 3);
            return;
        }

        // Tummy region: middle area (default)
        window.audioManager.playVoice('chirp', 0);
        window.renderer.spawnHearts(cssX, cssY, 4);
    }

    /**
     * Start needs decay interval (only while actively playing).
     */
    _startNeedsDecay() {
        clearInterval(this._needsDecayTimer);
        this._needsDecayTimer = setInterval(() => {
            if (!this._creature) return;
            const needs = this._creature.needs;
            for (const key of ['hunger', 'cleanliness', 'energy', 'happiness']) {
                needs[key] = Math.max(this._needsFloor, needs[key] - 1);
            }
            window.saveManager.updateCreature(this._creature.id, { needs });
        }, this._decayIntervalMs);
    }

    /**
     * Feed the creature. Hunger +30.
     */
    feed(foodType) {
        if (!this._creature) return;
        this._creature.needs.hunger = Math.min(100, this._creature.needs.hunger + 30);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Bathe the creature. Cleanliness +40.
     */
    bathe() {
        if (!this._creature) return;
        this._creature.needs.cleanliness = Math.min(100, this._creature.needs.cleanliness + 40);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Pet the creature. Happiness +15.
     */
    pet() {
        if (!this._creature) return;
        this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 15);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Play with the creature. Happiness +20, Energy -10.
     */
    play() {
        if (!this._creature) return;
        this._creature.needs.happiness = Math.min(100, this._creature.needs.happiness + 20);
        this._creature.needs.energy = Math.max(this._needsFloor, this._creature.needs.energy - 10);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Put the creature to sleep. Energy +50.
     */
    sleep() {
        if (!this._creature) return;
        this._creature.needs.energy = Math.min(100, this._creature.needs.energy + 50);
        this._creature.totalCareActions++;
        this._checkGrowth();
    }

    /**
     * Check for growth stage advancement.
     * Baby (0-19) -> Kid (20-49) -> Adult (50+)
     */
    _checkGrowth() {
        if (!this._creature) return;
        const actions = this._creature.totalCareActions;
        let newStage = 'baby';
        if (actions >= 50) newStage = 'adult';
        else if (actions >= 20) newStage = 'kid';

        if (newStage !== this._creature.growthStage) {
            this._creature.growthStage = newStage;
            // Trigger growth celebration — Session 9
        }

        window.saveManager.updateCreature(this._creature.id, {
            needs: this._creature.needs,
            totalCareActions: this._creature.totalCareActions,
            growthStage: this._creature.growthStage
        });
    }

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
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Update care room animations, mini-game state
    }

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        if (!this._creature) return;

        const creatureId = this._creature.id;
        const displaySize = Math.min(w, h) * 0.45;
        const cx = w / 2;
        const cy = h * 0.42;

        // Mutate pre-allocated position (no allocation in hot path)
        this._creatureScreenPos.x = cx;
        this._creatureScreenPos.y = cy;
        this._creatureScreenPos.displaySize = displaySize;
        this._creatureScreenPosValid = true;

        // Update creature position for particle spawning
        window.animationEngine.setCreaturePosition(creatureId, cx, cy, displaySize);

        // Get animation state and draw creature
        if (window.creatureCache.hasCache(creatureId)) {
            const animState = window.animationEngine.getState(creatureId);
            window.creatureCache.drawCreatureById(
                ctx, cx, cy, animState, displaySize, creatureId
            );
        }
    }
}
