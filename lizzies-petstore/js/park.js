/**
 * park.js — Pet park: random creatures, social animations, scene backgrounds.
 * Renders park scene with player creature + up to 5 NPC creatures.
 * Touch-guided player movement. Proximity-triggered social interactions.
 *
 * Max 6 creatures rendered simultaneously (1 player + 5 NPC).
 * NPCs use composite caching (1 offscreen canvas each).
 * Player creature uses normal per-part caching.
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

// Harmonious color generation: HSL palette from a base hue
function _hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
}

// Adjectives + nouns for NPC names
const PARK_ADJECTIVES = [
    'Sparkle', 'Princess', 'Wiggly', 'Captain', 'Fluffy', 'Silly',
    'Bouncy', 'Twinkle', 'Dizzy', 'Snuggly', 'Zippy', 'Giggly',
    'Dreamy', 'Fuzzy', 'Peppy', 'Jolly', 'Cuddly', 'Dazzle'
];
const PARK_NOUNS = [
    'Fluff', 'Bumble', 'Snoot', 'Squeaky', 'Paws', 'Whiskers',
    'Nibbles', 'Pudding', 'Noodle', 'Muffin', 'Pickle', 'Cookie',
    'Biscuit', 'Sprout', 'Pebble', 'Waffle', 'Dumpling', 'Bubble'
];

// Starter parts per category (unlockCondition === null)
const STARTER_PART_IDS = {
    torso: ['torso-round', 'torso-oval', 'torso-long', 'torso-stocky', 'torso-fluffy-cloud', 'torso-heart'],
    head: ['head-cat', 'head-dog', 'head-bird', 'head-bunny'],
    eyes: ['eyes-sparkle', 'eyes-button', 'eyes-cat-slit', 'eyes-wide-round'],
    legs: ['legs-paws-2', 'legs-paws-4', 'legs-bird-2', 'legs-hooves-4', 'legs-webbed', 'legs-stubby'],
    tail: ['tail-fluffy', 'tail-fish', 'tail-curly', 'tail-stub'],
    wings: ['wings-bird', 'wings-butterfly'],
    extras: ['extras-unicorn-horn', 'extras-floppy-ears', 'extras-pointed-ears', 'extras-round-ears', 'extras-antennae']
};

const PARK_PERSONALITIES = ['playful', 'shy', 'silly', 'curious'];

// Tappable prop positions per scene (normalized coords)
const PARK_PROPS = {
    sunny:  { x: 0.78, y: 0.48, radius: 40, type: 'fountain' },
    beach:  { x: 0.72, y: 0.52, radius: 40, type: 'tidepool' },
    cloud:  { x: 0.80, y: 0.38, radius: 45, type: 'rainbow' }
};

class ParkManager {
    constructor() {
        this._playerCreature = null;
        this._playerCreatureId = null;
        this._npcCreatures = [];   // { id, name, personality, body, pos:{x,y}, targetPos, speed, facing }
        this._maxNpcs = 5;

        // Scene
        this._parkScene = 'sunny'; // 'sunny', 'beach', 'cloud'
        this._bgCache = null;
        this._bgCacheKey = '';

        // Player movement
        this._playerPos = { x: 0.5, y: 0.65 };
        this._playerTarget = null;
        this._playerSpeed = 0.12; // normalized units per second
        this._playerFacing = 1;   // 1 = right, -1 = left

        // Auto-wander
        this._idleTime = 0;
        this._autoWanderDelay = 8000; // 8s

        // NPC wander timers (interval counters per NPC)
        this._npcNextWander = []; // parallel array to _npcCreatures

        // Social interaction tracking (per visit)
        this._greetedNpcs = new Set();    // NPC ids that gave greeting bonus
        this._playedWithNpcs = new Set(); // NPC ids that gave play bonus
        this._propTapped = false;          // fountain/tidepool/rainbow tapped this visit
        this._greetingCooldowns = {};      // npcId -> cooldown timer (ms remaining)

        // Energy drain (interval counter)
        this._energyTimer = 0;
        this._nextEnergyDrain = 90000; // 90s
        this._tiredWarningShown = false;
        this._tiredAutoReturn = 0; // countdown for auto-return

        // Floating text queue
        this._floatingTexts = []; // { text, x, y, life, maxLife, color }

        // Happiness gained this visit (for saving on exit)
        this._happinessGained = 0;
        this._energyDrained = 0;
        this._resultsSaved = false; // Guard against double-save

        // Pre-allocated draw order array (avoid per-frame GC)
        this._drawOrder = [];

        // Seeded PRNG for cached backgrounds
        this._bgSeed = 0;

        // Canvas bound flag
        this._canvasBound = false;
    }

    // ── Seeded PRNG (deterministic backgrounds on re-cache) ──

    _seededRandom(seed) {
        let s = seed | 0;
        return () => {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
        };
    }

    /**
     * Enter the park with a creature.
     * @param {object} creature — full creature data object
     * @param {number} parkVisits — total visits (for scene selection)
     */
    enterPark(creature, parkVisits) {
        this.cancel();
        this._playerCreature = creature;
        this._playerCreatureId = creature.id;
        this._playerPos = { x: 0.1, y: 0.65 }; // Start at left edge (walk-in)
        this._playerTarget = { x: 0.45, y: 0.65 }; // Walk to center
        this._playerFacing = 1;
        this._idleTime = 0;
        this._energyTimer = 0;
        this._nextEnergyDrain = 90000;
        this._tiredWarningShown = false;
        this._tiredAutoReturn = 0;
        this._happinessGained = 0;
        this._energyDrained = 0;
        this._resultsSaved = false;
        this._greetedNpcs.clear();
        this._playedWithNpcs.clear();
        this._propTapped = false;
        this._greetingCooldowns = {};
        this._floatingTexts = [];
        this._bgCache = null;
        this._bgSeed = (parkVisits * 7919 + 42) | 0; // Deterministic per visit count

        // Select scene based on visits
        if (parkVisits >= 7) {
            this._parkScene = 'cloud';
        } else if (parkVisits >= 3) {
            this._parkScene = 'beach';
        } else {
            this._parkScene = 'sunny';
        }

        // Update park name in DOM
        const nameEl = document.getElementById('park-name');
        if (nameEl) {
            const sceneNames = { sunny: 'Sunny Park', beach: 'Seaside Beach', cloud: 'Cloud Garden' };
            nameEl.textContent = sceneNames[this._parkScene];
        }

        // Build player creature cache
        this._buildPlayerCache();

        // Start player walk animation
        window.animationEngine.startAnimation(
            this._playerCreatureId, 'walk', this._playerCreature
        );

        // Generate NPCs
        this._generateNPCs();

        // Build NPC composite caches
        for (const npc of this._npcCreatures) {
            const npcDisplaySize = 60; // Smaller than player
            window.creatureCache.buildCompositeCache(npc.id, npc, npcDisplaySize);
        }

        // Bind canvas input
        this._bindParkCanvas();

        // Apply arrival happiness
        this._happinessGained = 15;
    }

    /**
     * Cancel all state and cleanup.
     */
    cancel() {
        // Clear NPC caches
        for (const npc of this._npcCreatures) {
            window.creatureCache.clearCache(npc.id);
        }
        this._playerCreature = null;
        this._playerCreatureId = null;
        this._npcCreatures = [];
        this._npcNextWander = [];
        this._playerTarget = null;
        this._floatingTexts = [];
        this._bgCache = null;
        this._greetedNpcs.clear();
        this._playedWithNpcs.clear();
        this._greetingCooldowns = {};
        this._idleTime = 0;
        this._energyTimer = 0;
        this._tiredAutoReturn = 0;
        this._tiredWarningShown = false;
    }

    /**
     * Save accumulated park benefits to the creature before exiting.
     * Called by game.js on PARK exit.
     */
    saveResults() {
        if (!this._playerCreatureId || this._resultsSaved) return;
        this._resultsSaved = true;
        const creature = window.saveManager.getCreature(this._playerCreatureId);
        if (!creature) return;

        const needs = creature.needs || { hunger: 80, cleanliness: 90, energy: 70, happiness: 85 };
        needs.happiness = Math.min(100, needs.happiness + this._happinessGained);
        needs.energy = Math.max(20, needs.energy - this._energyDrained);

        window.saveManager.updateCreature(this._playerCreatureId, { needs });
    }

    // ── NPC Generation ───────────────────────────────────

    _generateNPCs() {
        this._npcCreatures = [];
        this._npcNextWander = [];
        const count = 4 + Math.floor(Math.random() * 2); // 4-5

        for (let i = 0; i < Math.min(count, this._maxNpcs); i++) {
            const npc = this._generateRandomCreature(i);
            this._npcCreatures.push(npc);
            this._npcNextWander.push(3000 + Math.random() * 4000);
        }
    }

    _generateRandomCreature(index) {
        // Harmonious color palette from random base hue
        const baseHue = Math.random() * 360;
        const palette = [
            _hslToHex(baseHue, 65, 60),
            _hslToHex(baseHue + 30, 55, 65),
            _hslToHex(baseHue - 25, 70, 55),
            _hslToHex(baseHue + 60, 50, 70)
        ];
        const pickColor = () => palette[Math.floor(Math.random() * palette.length)];

        // Pick one random part from each starter category
        const pickPart = (category) => {
            const ids = STARTER_PART_IDS[category];
            return ids[Math.floor(Math.random() * ids.length)];
        };

        const torsoId = pickPart('torso');
        const headId = pickPart('head');
        const eyesId = pickPart('eyes');

        const body = {
            torso: { type: torsoId.replace('torso-', ''), covering: 'smooth', color: pickColor(), scale: 1 },
            head: { type: headId.replace('head-', ''), covering: 'smooth', color: pickColor(), scale: 0.8 },
            eyes: { type: eyesId.replace('eyes-', ''), color: pickColor() }
        };

        // Optional parts with probability
        if (Math.random() < 0.7) {
            const legId = pickPart('legs');
            body.legs = [{ type: legId.replace('legs-', ''), color: pickColor() }];
        }
        if (Math.random() < 0.6) {
            const tailId = pickPart('tail');
            body.tail = { type: tailId.replace('tail-', ''), color: pickColor() };
        }
        if (Math.random() < 0.3) {
            const wingId = pickPart('wings');
            body.wings = { type: wingId.replace('wings-', ''), color: pickColor() };
        }
        if (Math.random() < 0.4) {
            const extraId = pickPart('extras');
            body.extras = [{ type: extraId.replace('extras-', ''), color: pickColor() }];
        }

        // Distribute NPCs across the park area, avoiding overlap
        let posX, posY, tries = 0;
        do {
            posX = 0.15 + Math.random() * 0.7;
            posY = 0.45 + Math.random() * 0.35;
            tries++;
        } while (tries < 20 && this._tooCloseToExisting(posX, posY));

        return {
            id: 'npc-' + index + '-' + Math.random().toString(36).substr(2, 6),
            name: this._generateName(),
            personality: PARK_PERSONALITIES[Math.floor(Math.random() * PARK_PERSONALITIES.length)],
            body: body,
            accessories: [],
            pos: { x: posX, y: posY },
            targetPos: null,
            speed: 0.03 + Math.random() * 0.02, // Slower than player
            facing: Math.random() > 0.5 ? 1 : -1,
            bounceTime: Math.random() * 6000 // Offset idle bounce phase
        };
    }

    _tooCloseToExisting(x, y) {
        for (const npc of this._npcCreatures) {
            const dx = npc.pos.x - x;
            const dy = npc.pos.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.15) return true;
        }
        return false;
    }

    _generateName() {
        const adj = PARK_ADJECTIVES[Math.floor(Math.random() * PARK_ADJECTIVES.length)];
        const noun = PARK_NOUNS[Math.floor(Math.random() * PARK_NOUNS.length)];
        return adj + ' ' + noun;
    }

    // ── Build Player Cache ───────────────────────────────

    _buildPlayerCache() {
        if (!this._playerCreature || !this._playerCreatureId) return;
        const info = window.renderer.getCanvas('park-canvas');
        if (!info) return;
        const displaySize = Math.min(info.w, info.h) * 0.28;
        // Always rebuild (handles resize case where display size changes)
        window.creatureCache.buildCache(
            this._playerCreatureId, this._playerCreature, displaySize
        );
    }

    // ── Canvas Input ─────────────────────────────────────

    _bindParkCanvas() {
        const canvas = document.getElementById('park-canvas');
        if (!canvas || this._canvasBound) return;
        this._canvasBound = true;

        canvas.addEventListener('pointerdown', (e) => {
            this._onCanvasTap(e, canvas);
        });
    }

    _onCanvasTap(e, canvas) {
        if (!this._playerCreature) return;

        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;   // normalized 0-1
        const py = (e.clientY - rect.top) / rect.height;

        const info = window.renderer.getCanvas('park-canvas');
        if (!info) return;
        const w = info.w;
        const h = info.h;

        // Check if tapping an NPC (within 120px)
        for (const npc of this._npcCreatures) {
            const npcScreenX = npc.pos.x * w;
            const npcScreenY = npc.pos.y * h;
            const tapScreenX = px * w;
            const tapScreenY = py * h;
            const dist = Math.sqrt(
                (npcScreenX - tapScreenX) ** 2 + (npcScreenY - tapScreenY) ** 2
            );
            if (dist < 60) {
                this._onNpcTap(npc, w, h);
                return;
            }
        }

        // Check if tapping a prop
        const prop = PARK_PROPS[this._parkScene];
        if (prop) {
            const propScreenX = prop.x * w;
            const propScreenY = prop.y * h;
            const tapScreenX = px * w;
            const tapScreenY = py * h;
            const dist = Math.sqrt(
                (propScreenX - tapScreenX) ** 2 + (propScreenY - tapScreenY) ** 2
            );
            if (dist < prop.radius) {
                this._onPropTap(prop, w, h);
                return;
            }
        }

        // Otherwise: move player to tap position (clamped to grass area)
        const targetX = Math.max(0.05, Math.min(0.95, px));
        const targetY = Math.max(0.42, Math.min(0.85, py));
        this._playerTarget = { x: targetX, y: targetY };
        this._idleTime = 0;

        // Update facing direction
        if (targetX > this._playerPos.x + 0.01) this._playerFacing = 1;
        else if (targetX < this._playerPos.x - 0.01) this._playerFacing = -1;

        // Switch to walk animation
        if (window.animationEngine.getAnimationName(this._playerCreatureId) !== 'walk') {
            window.animationEngine.startAnimation(
                this._playerCreatureId, 'walk', this._playerCreature
            );
        }
    }

    _onNpcTap(npc, w, h) {
        // Check if player is close enough to interact
        const dx = (npc.pos.x - this._playerPos.x) * w;
        const dy = (npc.pos.y - this._playerPos.y) * h;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 120) {
            // Move player toward NPC first
            this._playerTarget = {
                x: npc.pos.x + (this._playerPos.x > npc.pos.x ? 0.08 : -0.08),
                y: npc.pos.y
            };
            this._playerTarget._pendingNpc = npc;
            this._idleTime = 0;
            if (window.animationEngine.getAnimationName(this._playerCreatureId) !== 'walk') {
                window.animationEngine.startAnimation(
                    this._playerCreatureId, 'walk', this._playerCreature
                );
            }
            return;
        }

        this._playWithNpc(npc, w, h);
    }

    _playWithNpc(npc, w, h) {
        if (this._playedWithNpcs.has(npc.id)) return; // Already played this visit
        this._playedWithNpcs.add(npc.id);

        // Sparkles between creatures
        const midX = ((this._playerPos.x + npc.pos.x) / 2) * w;
        const midY = ((this._playerPos.y + npc.pos.y) / 2) * h;
        window.renderer.spawnSparkles(midX, midY, 6);
        window.renderer.spawnHearts(midX, midY - 20, 3);

        // Play happy jingle
        if (window.audioManager) window.audioManager.playSound('happy');

        // Happy animation for player
        window.animationEngine.startAnimation(
            this._playerCreatureId, 'happy', this._playerCreature, () => {
                if (this._playerCreature) {
                    window.animationEngine.startAnimation(
                        this._playerCreatureId, 'idle', this._playerCreature
                    );
                }
            }
        );

        // NPC bounce handled in draw via npc.playBounceUntil
        npc.playBounceUntil = Date.now() + 600;

        // Happiness +5
        this._happinessGained += 5;
        this._spawnFloatingText('+5', midX, midY - 30, '#FF69B4');
    }

    _onPropTap(prop, w, h) {
        if (this._propTapped) return;
        this._propTapped = true;

        const propX = prop.x * w;
        const propY = prop.y * h;

        // Splash sparkles
        const splashColors = ['#4A90D9', '#00CED1', '#48CAE4', '#90E0EF'];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 30 + Math.random() * 40;
            window.renderer.spawnParticle(
                propX, propY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 20,
                600 + Math.random() * 300,
                splashColors[i % splashColors.length],
                3 + Math.random() * 2,
                'star'
            );
        }

        if (window.audioManager) window.audioManager.playSound('splash');

        this._happinessGained += 3;
        this._spawnFloatingText('+3', propX, propY - 20, '#4A90D9');
    }

    // ── Floating Text ────────────────────────────────────

    _spawnFloatingText(text, x, y, color) {
        this._floatingTexts.push({
            text, x, y,
            life: 1000,
            maxLife: 1000,
            color: color || '#FF69B4'
        });
    }

    // ── Update (called by game.js each frame) ────────────

    update(dt) {
        if (!this._playerCreature) return;

        const info = window.renderer.getCanvas('park-canvas');
        if (!info) return;
        const w = info.w;
        const h = info.h;

        // Move player toward target
        this._updatePlayerMovement(dt, w, h);

        // Update NPC wandering
        this._updateNPCs(dt, w, h);

        // Proximity checks
        this._updateProximity(dt, w, h);

        // Energy drain
        this._updateEnergy(dt);

        // Update greeting cooldowns
        for (const id of Object.keys(this._greetingCooldowns)) {
            this._greetingCooldowns[id] -= dt;
            if (this._greetingCooldowns[id] <= 0) {
                delete this._greetingCooldowns[id];
            }
        }

        // Floating text decay
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            this._floatingTexts[i].life -= dt;
            this._floatingTexts[i].y -= dt * 0.02; // Float upward
            if (this._floatingTexts[i].life <= 0) {
                this._floatingTexts.splice(i, 1);
            }
        }
    }

    _updatePlayerMovement(dt, w, h) {
        if (!this._playerTarget) {
            this._idleTime += dt;
            // Auto-wander after idle period
            if (this._idleTime >= this._autoWanderDelay) {
                this._idleTime = 0;
                this._playerTarget = {
                    x: Math.max(0.1, Math.min(0.9, this._playerPos.x + (Math.random() - 0.5) * 0.25)),
                    y: Math.max(0.45, Math.min(0.82, this._playerPos.y + (Math.random() - 0.5) * 0.15))
                };
                const dx = this._playerTarget.x - this._playerPos.x;
                if (Math.abs(dx) > 0.01) this._playerFacing = dx > 0 ? 1 : -1;
                window.animationEngine.startAnimation(
                    this._playerCreatureId, 'walk', this._playerCreature
                );
            }
            return;
        }

        const dx = this._playerTarget.x - this._playerPos.x;
        const dy = this._playerTarget.y - this._playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.015) {
            // Arrived
            this._playerPos.x = this._playerTarget.x;
            this._playerPos.y = this._playerTarget.y;

            // Check for pending NPC interaction
            const pendingNpc = this._playerTarget._pendingNpc;
            this._playerTarget = null;

            // Switch to idle
            if (window.animationEngine.getAnimationName(this._playerCreatureId) === 'walk') {
                window.animationEngine.startAnimation(
                    this._playerCreatureId, 'idle', this._playerCreature
                );
            }

            if (pendingNpc) {
                this._playWithNpc(pendingNpc, w, h);
            }
            return;
        }

        // Move toward target
        const speed = this._playerSpeed * (dt / 1000);
        const moveX = (dx / dist) * speed;
        const moveY = (dy / dist) * speed;
        this._playerPos.x += moveX;
        this._playerPos.y += moveY;
        this._idleTime = 0;
    }

    _updateNPCs(dt, w, h) {
        for (let i = 0; i < this._npcCreatures.length; i++) {
            const npc = this._npcCreatures[i];
            npc.bounceTime = (npc.bounceTime || 0) + dt;

            // Wander
            this._npcNextWander[i] -= dt;
            if (this._npcNextWander[i] <= 0) {
                this._npcNextWander[i] = 3000 + Math.random() * 5000;
                npc.targetPos = {
                    x: Math.max(0.1, Math.min(0.9, npc.pos.x + (Math.random() - 0.5) * 0.15)),
                    y: Math.max(0.42, Math.min(0.82, npc.pos.y + (Math.random() - 0.5) * 0.1))
                };
                const ndx = npc.targetPos.x - npc.pos.x;
                if (Math.abs(ndx) > 0.01) npc.facing = ndx > 0 ? 1 : -1;
            }

            // Move toward target
            if (npc.targetPos) {
                const dx = npc.targetPos.x - npc.pos.x;
                const dy = npc.targetPos.y - npc.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.01) {
                    npc.targetPos = null;
                } else {
                    const speed = npc.speed * (dt / 1000);
                    npc.pos.x += (dx / dist) * speed;
                    npc.pos.y += (dy / dist) * speed;
                }
            }
        }
    }

    _updateProximity(dt, w, h) {
        for (const npc of this._npcCreatures) {
            const dx = (npc.pos.x - this._playerPos.x) * w;
            const dy = (npc.pos.y - this._playerPos.y) * h;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Proximity greeting (80px)
            if (dist < 80 && !this._greetingCooldowns[npc.id]) {
                this._greetingCooldowns[npc.id] = 5000; // 5s cooldown

                // Spawn hearts above NPC
                window.renderer.spawnHearts(npc.pos.x * w, npc.pos.y * h - 30, 2);

                // NPC bounce
                npc.playBounceUntil = Date.now() + 400;

                // Play creature voice
                if (window.audioManager) {
                    window.audioManager.playCreatureVoice(npc);
                }

                // Happiness +3 (once per NPC per visit)
                if (!this._greetedNpcs.has(npc.id)) {
                    this._greetedNpcs.add(npc.id);
                    this._happinessGained += 3;
                    this._spawnFloatingText('+3', npc.pos.x * w, npc.pos.y * h - 40, '#FF69B4');
                    // Check daily task
                    if (window.game) window.game._checkTaskCompletion('park_greet');
                }
            }
        }
    }

    _updateEnergy(dt) {
        this._energyTimer += dt;
        if (this._energyTimer >= this._nextEnergyDrain) {
            this._nextEnergyDrain = this._energyTimer + 90000;
            this._energyDrained += 1;

            // Check if tired (use cached creature, not saveManager per-frame)
            if (this._playerCreature) {
                const currentEnergy = (this._playerCreature.needs ? this._playerCreature.needs.energy : 70) - this._energyDrained;
                if (currentEnergy <= 25 && !this._tiredWarningShown) {
                    this._tiredWarningShown = true;
                    this._tiredAutoReturn = 10000;
                    const info = window.renderer.getCanvas('park-canvas');
                    if (info) {
                        this._spawnFloatingText(
                            'Getting tired...',
                            this._playerPos.x * info.w,
                            this._playerPos.y * info.h - 50,
                            '#8B6914'
                        );
                    }
                }
            }
        }

        // Auto-return countdown when tired
        if (this._tiredAutoReturn > 0) {
            this._tiredAutoReturn -= dt;
            if (this._tiredAutoReturn <= 0) {
                // saveResults will be called by game.js _onExit — guard prevents double-save
                if (window.game) window.game.setState('CARE');
            }
        }
    }

    // ── Draw (called by game.js each frame) ──────────────

    draw(ctx, w, h) {
        if (!this._playerCreature) return;

        // Draw scene background (cached)
        this._drawSceneBackground(ctx, w, h);

        // Draw scene props
        this._drawSceneProps(ctx, w, h);

        // Collect all creatures sorted by Y for correct depth ordering
        // Reuse pre-allocated array to avoid per-frame GC
        this._drawOrder.length = 0;

        // Player
        this._drawOrder.push({
            type: 'player',
            y: this._playerPos.y,
            id: this._playerCreatureId,
            npc: null
        });

        // NPCs
        for (const npc of this._npcCreatures) {
            this._drawOrder.push({
                type: 'npc',
                y: npc.pos.y,
                id: null,
                npc: npc
            });
        }

        // Sort by Y (back to front)
        this._drawOrder.sort((a, b) => a.y - b.y);

        // Draw creatures
        for (const entry of this._drawOrder) {
            if (entry.type === 'player') {
                this._drawPlayerCreature(ctx, w, h);
            } else {
                this._drawNPC(ctx, w, h, entry.npc);
            }
        }

        // Draw floating text
        this._drawFloatingTexts(ctx);

        // Draw NPC name labels
        this._drawNpcLabels(ctx, w, h);
    }

    _drawPlayerCreature(ctx, w, h) {
        if (!window.creatureCache.hasCache(this._playerCreatureId)) return;

        const displaySize = Math.min(w, h) * 0.28;
        const px = this._playerPos.x * w;
        const py = this._playerPos.y * h;

        // Update animation engine position for particles
        window.animationEngine.setCreaturePosition(this._playerCreatureId, px, py, displaySize);

        const animState = window.animationEngine.getState(this._playerCreatureId);

        ctx.save();
        ctx.translate(px, py);
        if (this._playerFacing < 0) ctx.scale(-1, 1);
        ctx.translate(-px, -py);

        window.creatureCache.drawCreatureById(
            ctx, px, py, animState, displaySize, this._playerCreatureId
        );
        ctx.restore();
    }

    _drawNPC(ctx, w, h, npc) {
        if (!window.creatureCache.hasCache(npc.id)) return;

        const nx = npc.pos.x * w;
        const ny = npc.pos.y * h;

        // Idle bounce animation (whole-sprite)
        const t = (npc.bounceTime || 0) / 1000;
        let bounceY = 2 * Math.sin(t * Math.PI);
        let scaleX = npc.facing;
        let scaleY = 1 + 0.02 * Math.sin(t * Math.PI * 0.8);

        // Play bounce (when greeting or playing)
        if (npc.playBounceUntil && Date.now() < npc.playBounceUntil) {
            const elapsed = npc.playBounceUntil - Date.now();
            const total = 600;
            const progress = 1 - (elapsed / total);
            const bounce = Math.sin(progress * Math.PI * 3) * (1 - progress);
            scaleX *= (1 + bounce * 0.15);
            scaleY = 1 + bounce * 0.15;
            bounceY -= bounce * 15;
        }

        window.creatureCache.drawComposite(ctx, nx, ny + bounceY, npc.id, scaleX, scaleY);
    }

    _drawNpcLabels(ctx, w, h) {
        ctx.save();
        ctx.font = "16px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (const npc of this._npcCreatures) {
            const nx = npc.pos.x * w;
            const ny = npc.pos.y * h + 35;

            // Pill background
            const textWidth = ctx.measureText(npc.name).width;
            const pillW = textWidth + 12;
            const pillH = 20;

            ctx.fillStyle = 'rgba(245, 240, 232, 0.85)';
            ctx.beginPath();
            ctx.roundRect(nx - pillW / 2, ny - 2, pillW, pillH, 10);
            ctx.fill();

            ctx.fillStyle = '#595143';
            ctx.fillText(npc.name, nx, ny);
        }
        ctx.restore();
    }

    _drawFloatingTexts(ctx) {
        if (this._floatingTexts.length === 0) return;

        ctx.save();
        ctx.font = "bold 18px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const ft of this._floatingTexts) {
            const alpha = Math.max(0, ft.life / ft.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ── Scene Background Drawing (cached) ────────────────

    _drawSceneBackground(ctx, w, h) {
        const key = this._parkScene + w + h;
        if (this._bgCache && this._bgCacheKey === key) {
            ctx.drawImage(this._bgCache, 0, 0);
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        const c = document.createElement('canvas');
        c.width = w * dpr;
        c.height = h * dpr;
        const offCtx = c.getContext('2d');
        offCtx.scale(dpr, dpr);

        const rng = this._seededRandom(this._bgSeed);
        switch (this._parkScene) {
            case 'sunny': this._drawSunnyBg(offCtx, w, h, rng); break;
            case 'beach': this._drawBeachBg(offCtx, w, h, rng); break;
            case 'cloud': this._drawCloudBg(offCtx, w, h, rng); break;
        }

        this._bgCache = c;
        this._bgCacheKey = key;
        ctx.drawImage(c, 0, 0);
    }

    _drawSunnyBg(ctx, w, h, rng) {
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.5);

        // Sun
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(w * 0.85, h * 0.12, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.arc(w * 0.85, h * 0.12, 22, 0, Math.PI * 2);
        ctx.fill();

        // Grass
        const grassGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
        grassGrad.addColorStop(0, '#7EC850');
        grassGrad.addColorStop(0.3, '#6ABF3F');
        grassGrad.addColorStop(1, '#5DA83A');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, h * 0.4, w, h * 0.6);

        // Dirt path
        ctx.fillStyle = '#D4B896';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.75, w * 0.35, h * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // White fence
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        const fenceY = h * 0.38;
        ctx.beginPath();
        ctx.moveTo(0, fenceY);
        ctx.lineTo(w, fenceY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, fenceY + 15);
        ctx.lineTo(w, fenceY + 15);
        ctx.stroke();
        for (let x = 20; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, fenceY - 8);
            ctx.lineTo(x, fenceY + 22);
            ctx.stroke();
        }

        // Trees
        this._drawTree(ctx, w * 0.12, h * 0.32, 35, 50);
        this._drawTree(ctx, w * 0.88, h * 0.30, 30, 45);

        // Flowers (seeded for deterministic cache)
        const flowerColors = ['#FF69B4', '#FFD700', '#FF6B6B', '#9B59B6', '#00CED1'];
        for (let i = 0; i < 12; i++) {
            const fx = w * 0.05 + rng() * w * 0.9;
            const fy = h * 0.48 + rng() * h * 0.15;
            ctx.fillStyle = flowerColors[i % flowerColors.length];
            ctx.beginPath();
            ctx.arc(fx, fy, 4 + rng() * 2, 0, Math.PI * 2);
            ctx.fill();
            // Stem
            ctx.strokeStyle = '#5DA83A';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(fx, fy + 3);
            ctx.lineTo(fx, fy + 10);
            ctx.stroke();
        }
    }

    _drawBeachBg(ctx, w, h, rng) {
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
        skyGrad.addColorStop(0, '#48CAE4');
        skyGrad.addColorStop(1, '#90E0EF');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.4);

        // Ocean
        const oceanGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.45);
        oceanGrad.addColorStop(0, '#0077B6');
        oceanGrad.addColorStop(1, '#48CAE4');
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, h * 0.3, w, h * 0.15);

        // Waves (white curves)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const waveY = h * 0.38 + i * 12;
            ctx.beginPath();
            for (let x = 0; x < w; x += 2) {
                const y = waveY + 4 * Math.sin(x / 30 + i * 2);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Sand
        const sandGrad = ctx.createLinearGradient(0, h * 0.42, 0, h);
        sandGrad.addColorStop(0, '#F5DEB3');
        sandGrad.addColorStop(1, '#DEB887');
        ctx.fillStyle = sandGrad;
        ctx.fillRect(0, h * 0.42, w, h * 0.58);

        // Palm trees
        this._drawPalmTree(ctx, w * 0.15, h * 0.35, 40);
        this._drawPalmTree(ctx, w * 0.92, h * 0.33, 35);

        // Shells (seeded for deterministic cache)
        const shellColors = ['#FFB6C1', '#FFE4E1', '#E8D5F5', '#FFFFF0'];
        for (let i = 0; i < 8; i++) {
            const sx = w * 0.1 + rng() * w * 0.8;
            const sy = h * 0.5 + rng() * h * 0.3;
            ctx.fillStyle = shellColors[i % shellColors.length];
            ctx.beginPath();
            ctx.ellipse(sx, sy, 5, 3, rng() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#DEB887';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Sun
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.1, 28, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawCloudBg(ctx, w, h, rng) {
        // Purple-blue gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#2C1E5B');
        skyGrad.addColorStop(0.4, '#5B3A8C');
        skyGrad.addColorStop(1, '#8B6FC0');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Stars (seeded for deterministic cache)
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 30; i++) {
            const sx = rng() * w;
            const sy = rng() * h * 0.4;
            const sr = 1 + rng() * 1.5;
            ctx.globalAlpha = 0.4 + rng() * 0.6;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Rainbow arc
        const rcx = w * 0.5;
        const rcy = h * 0.35;
        const rainbowColors = ['#FF6B6B', '#FFD700', '#27AE60', '#4A90D9', '#9B59B6'];
        for (let i = 0; i < rainbowColors.length; i++) {
            ctx.strokeStyle = rainbowColors[i];
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(rcx, rcy, 80 + i * 5, Math.PI, 0);
            ctx.stroke();
        }

        // Floating cloud islands
        this._drawCloudIsland(ctx, w * 0.2, h * 0.5, 80, 30);
        this._drawCloudIsland(ctx, w * 0.55, h * 0.55, 100, 35);
        this._drawCloudIsland(ctx, w * 0.8, h * 0.48, 70, 25);

        // Main ground cloud
        this._drawCloudIsland(ctx, w * 0.5, h * 0.72, w * 0.6, h * 0.15);

        // Star flowers on main cloud (seeded for deterministic cache)
        const starFlowerColors = ['#FFD700', '#FF69B4', '#00CED1', '#E8D5F5'];
        for (let i = 0; i < 10; i++) {
            const fx = w * 0.25 + rng() * w * 0.5;
            const fy = h * 0.65 + rng() * h * 0.08;
            ctx.fillStyle = starFlowerColors[i % starFlowerColors.length];
            ctx.globalAlpha = 0.8;
            this._drawStarShape(ctx, fx, fy, 5);
            ctx.globalAlpha = 1;
        }
    }

    // ── Scene Props Drawing (per-frame, not cached) ──────

    _drawSceneProps(ctx, w, h) {
        const prop = PARK_PROPS[this._parkScene];
        if (!prop) return;

        const px = prop.x * w;
        const py = prop.y * h;

        switch (prop.type) {
            case 'fountain':
                this._drawFountain(ctx, px, py);
                break;
            case 'tidepool':
                this._drawTidepool(ctx, px, py);
                break;
            case 'rainbow':
                // Rainbow already drawn in background; add shimmer indicator
                this._drawPropIndicator(ctx, px, py);
                break;
        }
    }

    _drawFountain(ctx, x, y) {
        ctx.save();
        // Base
        ctx.fillStyle = '#B8B0A8';
        ctx.beginPath();
        ctx.ellipse(x, y + 15, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8B8478';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pillar
        ctx.fillStyle = '#C8C0B8';
        ctx.fillRect(x - 6, y - 10, 12, 25);

        // Bowl
        ctx.fillStyle = '#B8B0A8';
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 20, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Water
        ctx.fillStyle = '#48CAE4';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Water spout
        ctx.strokeStyle = '#48CAE4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.quadraticCurveTo(x - 8, y - 25, x - 12, y - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.quadraticCurveTo(x + 8, y - 25, x + 12, y - 8);
        ctx.stroke();

        ctx.restore();
    }

    _drawTidepool(ctx, x, y) {
        ctx.save();
        // Pool shape
        ctx.fillStyle = '#0077B6';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Rock border
        ctx.strokeStyle = '#8B8478';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Shimmer highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x - 8, y - 5, 8, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawPropIndicator(ctx, x, y) {
        // Subtle glow to show it's tappable
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Helper Drawing Functions ─────────────────────────

    _drawTree(ctx, x, y, crownR, trunkH) {
        // Trunk
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(x - 6, y, 12, trunkH);

        // Crown (layered circles)
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(x, y - 5, crownR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.arc(x - crownR * 0.3, y - crownR * 0.1, crownR * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + crownR * 0.3, y - crownR * 0.2, crownR * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawPalmTree(ctx, x, y, height) {
        // Trunk (curved)
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.quadraticCurveTo(x + 10, y + height * 0.5, x + 5, y);
        ctx.stroke();

        // Fronds
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        const frondAngles = [-0.8, -0.3, 0.2, 0.7, 1.2];
        for (const angle of frondAngles) {
            ctx.beginPath();
            ctx.moveTo(x + 5, y);
            const endX = x + 5 + Math.cos(angle) * 35;
            const endY = y + Math.sin(angle) * 25;
            ctx.quadraticCurveTo(x + 5 + Math.cos(angle) * 20, y - 5, endX, endY);
            ctx.stroke();
        }
    }

    _drawCloudIsland(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x - w * 0.15, y - h * 0.2, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Grass on top
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.3, w * 0.4, h * 0.15, 0, Math.PI, 0);
        ctx.fill();
    }

    _drawStarShape(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / 5;
            const ox = x + Math.cos(outerAngle) * r;
            const oy = y + Math.sin(outerAngle) * r;
            const ix = x + Math.cos(innerAngle) * r * 0.4;
            const iy = y + Math.sin(innerAngle) * r * 0.4;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
    }
}
