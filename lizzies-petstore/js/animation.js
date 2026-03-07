/**
 * animation.js — Pivot-based animation engine with morphology detection.
 * Computes per-part transform deltas (translate, rotate, scale) each frame.
 * All rotation values are in DEGREES (drawCreatureById converts to radians).
 * Delta-time based, 60fps target, cap delta at 50ms.
 *
 * Animation cycles: idle, walk, fly, happy, eating, sleeping, bathing, bored.
 * Morphology-adaptive: no wings -> no fly, no legs -> float/slither.
 */

class AnimationEngine {
    constructor() {
        this._animations = new Map(); // creatureId -> animation state
        this._creaturePositions = null; // creatureId -> { x, y, displaySize }
    }

    /**
     * Start animating a creature.
     * @param {string} creatureId
     * @param {string} animName — 'idle', 'walk', 'fly', 'happy', 'eating', 'sleeping', 'bathing', 'bored'
     * @param {object} creatureData — full creature object (body parts inspected for morphology)
     * @param {function} [onComplete] — callback when one-shot animation finishes
     */
    startAnimation(creatureId, animName, creatureData, onComplete) {
        const morph = this._detectMorphology(creatureData);
        this._animations.set(creatureId, {
            name: animName,
            time: 0,
            morphology: morph,
            creatureId: creatureId,
            onComplete: onComplete || null,
            completed: false,
            // Interval counters for periodic effects
            nextBlinkTime: 3000 + Math.random() * 3000,
            nextEarTwitchTime: 4000 + Math.random() * 4000,
            nextZzzTime: 0,
            nextHeartTime: 0,
            nextSparkleTime: 0,
            // Blink state
            blinkUntil: 0,
            // Ear twitch state
            earTwitchUntil: 0,
            earTwitchDir: 1
        });
    }

    /**
     * Detect creature morphology from body data.
     */
    _detectMorphology(creatureData) {
        if (!creatureData || !creatureData.body) {
            return { hasWings: false, hasLegs: false, hasTail: false, hasEars: false,
                     legType: null, tailType: null, isTentacles: false, isWebbed: false, wingType: null };
        }
        const body = creatureData.body;
        const legs = body.legs;
        const firstLeg = Array.isArray(legs) ? (legs[0] || null) : legs;

        return {
            hasWings: !!(body.wings && body.wings.type),
            hasLegs: !!(firstLeg && firstLeg.type),
            hasTail: !!(body.tail && body.tail.type),
            hasEars: !!(body.extras && Array.isArray(body.extras) &&
                body.extras.some(e => e.type === 'floppy-ears' || e.type === 'pointed-ears' || e.type === 'round-ears')),
            legType: firstLeg ? firstLeg.type : null,
            tailType: body.tail ? body.tail.type : null,
            isTentacles: firstLeg ? firstLeg.type === 'tentacles-4' : false,
            isWebbed: firstLeg ? firstLeg.type === 'webbed' : false,
            wingType: body.wings ? body.wings.type : null
        };
    }

    stopAnimation(creatureId) {
        this._animations.delete(creatureId);
    }

    isAnimating(creatureId) {
        return this._animations.has(creatureId);
    }

    getAnimationName(creatureId) {
        const state = this._animations.get(creatureId);
        return state ? state.name : null;
    }

    /**
     * Update all active animations. Called by game.js (dt already capped at 50ms).
     */
    update(dt) {
        for (const [id, state] of this._animations) {
            state.time += dt;
            // Handle one-shot animation completion
            if (!state.completed) {
                const duration = this._getAnimDuration(state.name);
                if (duration > 0 && state.time >= duration) {
                    state.completed = true;
                    const cb = state.onComplete;
                    if (cb) {
                        state.onComplete = null;
                        // Switch to idle after one-shot completes
                        const morph = state.morphology;
                        this._animations.set(id, {
                            ...state,
                            name: 'idle',
                            time: 0,
                            completed: false,
                            onComplete: null,
                            nextBlinkTime: 3000 + Math.random() * 3000,
                            nextEarTwitchTime: 4000 + Math.random() * 4000,
                            blinkUntil: 0,
                            earTwitchUntil: 0
                        });
                        cb();
                    }
                }
            }
            // Spawn particles for particle-emitting animations
            this._updateParticles(state);
        }
    }

    /**
     * Duration of one-shot animations (0 = looping).
     */
    _getAnimDuration(name) {
        switch (name) {
            case 'happy': return 2000;
            case 'eating': return 2500;
            case 'bathing': return 2000;
            default: return 0;
        }
    }

    /**
     * Spawn particles for animations that emit them.
     */
    _updateParticles(state) {
        if (!window.renderer) return;
        const pos = this._creaturePositions ? this._creaturePositions.get(state.creatureId) : null;
        if (!pos) return;

        switch (state.name) {
            case 'sleeping':
                if (state.time >= state.nextZzzTime) {
                    state.nextZzzTime = state.time + 1500 + Math.random() * 1000;
                    window.renderer.spawnZzz(
                        pos.x + pos.displaySize * 0.3,
                        pos.y - pos.displaySize * 0.5
                    );
                }
                break;
            case 'happy':
                if (state.time >= state.nextHeartTime) {
                    state.nextHeartTime = state.time + 300;
                    window.renderer.spawnHearts(pos.x, pos.y - pos.displaySize * 0.3, 2);
                }
                if (state.time >= state.nextSparkleTime) {
                    state.nextSparkleTime = state.time + 200;
                    window.renderer.spawnSparkles(
                        pos.x + (Math.random() - 0.5) * pos.displaySize,
                        pos.y + (Math.random() - 0.5) * pos.displaySize,
                        2
                    );
                }
                break;
            case 'bathing':
                if (state.time >= state.nextSparkleTime) {
                    state.nextSparkleTime = state.time + 150;
                    window.renderer.spawnCleanSparkles(
                        pos.x + (Math.random() - 0.5) * pos.displaySize * 0.8,
                        pos.y + (Math.random() - 0.5) * pos.displaySize * 0.6,
                        2
                    );
                }
                break;
        }
    }

    /**
     * Set creature screen position for particle spawning.
     */
    setCreaturePosition(creatureId, x, y, displaySize) {
        if (!this._creaturePositions) {
            this._creaturePositions = new Map();
        }
        this._creaturePositions.set(creatureId, { x, y, displaySize });
    }

    /**
     * Default (no animation) state — all transforms at identity.
     * All rotation values are in DEGREES.
     */
    _defaultState() {
        const state = {};
        for (const slot of ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories']) {
            state[slot] = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        return state;
    }

    /**
     * Get the current animation state for a creature (per-part transforms).
     * All rotation values are in DEGREES.
     */
    getState(creatureId) {
        const state = this._animations.get(creatureId);
        if (!state) return this._defaultState();

        switch (state.name) {
            case 'idle': return this._computeIdle(state);
            case 'walk': return this._computeWalk(state);
            case 'fly': return this._computeFly(state);
            case 'happy': return this._computeHappy(state);
            case 'eating': return this._computeEating(state);
            case 'sleeping': return this._computeSleeping(state);
            case 'bathing': return this._computeBathing(state);
            case 'bored': return this._computeBored(state);
            default: return this._defaultState();
        }
    }

    // ── Idle ──

    _computeIdle(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        // Breathing: torso scaleY oscillates +/-3% on 2s sine wave
        result.torso.scaleY = 1 + 0.03 * Math.sin(t * Math.PI);

        // Head bob: slight up/down, offset from breathing
        result.head.translateY = 2 * Math.sin(t * Math.PI * 0.8);

        // Tail sway: +/-15 deg on 1.5s sine (DEGREES, not radians)
        if (m.hasTail) {
            result.tail.rotation = 15 * Math.sin(t * Math.PI / 0.75);
        }

        // Blink: interval-counter based
        if (state.time >= state.nextBlinkTime && state.blinkUntil <= state.time) {
            state.blinkUntil = state.time + 150;
            state.nextBlinkTime = state.time + 3000 + Math.random() * 3000;
        }
        if (state.time < state.blinkUntil) {
            result.eyes.scaleY = 0.1;
        }

        // Ear twitch: only if creature has ear extras
        if (m.hasEars) {
            if (state.time >= state.nextEarTwitchTime && state.earTwitchUntil <= state.time) {
                state.earTwitchUntil = state.time + 300;
                state.earTwitchDir = Math.random() > 0.5 ? 1 : -1;
                state.nextEarTwitchTime = state.time + 4000 + Math.random() * 4000;
            }
            if (state.time < state.earTwitchUntil) {
                const twitchProgress = (state.earTwitchUntil - state.time) / 300;
                result.extras.rotation = state.earTwitchDir * 5 * Math.sin(twitchProgress * Math.PI);
            }
        }

        // Wing fold: scale oscillation on 3s cycle
        if (m.hasWings) {
            const wingPhase = Math.sin(t * Math.PI / 1.5);
            result.wings.scaleX = 0.9 + 0.1 * wingPhase;
            result.wings.scaleY = 0.9 + 0.1 * wingPhase;
        }

        // Tentacle undulate
        if (m.isTentacles) {
            result.legs.rotation = 8 * Math.sin(t * Math.PI / 0.6);
        }

        return result;
    }

    // ── Walk ──

    _computeWalk(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        // Body bob: 3px on 0.5s cycle (2Hz)
        result.torso.translateY = 3 * Math.sin(t * Math.PI * 4);

        if (m.hasLegs) {
            if (m.isTentacles) {
                result.legs.rotation = 12 * Math.sin(t * Math.PI * 3);
                result.legs.translateX = 3 * Math.sin(t * Math.PI * 1.5);
            } else {
                result.legs.rotation = 20 * Math.sin(t * Math.PI * 4);
            }
        } else {
            result.torso.translateY = 4 * Math.sin(t * Math.PI * 3);
            result.torso.translateX = 2 * Math.sin(t * Math.PI * 1.5);
        }

        result.head.translateY = 1.5 * Math.sin(t * Math.PI * 4 - 0.3);

        if (m.hasTail) {
            result.tail.rotation = 10 * Math.sin(t * Math.PI * 4 + Math.PI * 0.5);
        }

        return result;
    }

    // ── Fly ──

    _computeFly(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        if (!m.hasWings) return this._computeIdle(state);

        result.torso.translateY = -4 - 4 * Math.sin(t * Math.PI * 4);

        // Wing flap: +/-45 deg rapid
        result.wings.rotation = 45 * Math.sin(t * Math.PI * 8);

        if (m.hasLegs) {
            result.legs.translateY = -10;
            result.legs.scaleY = 0.8;
        }

        if (m.hasTail) {
            result.tail.rotation = -15;
            result.tail.translateY = 3 * Math.sin(t * Math.PI * 2);
        }

        result.head.translateY = Math.sin(t * Math.PI * 2);

        // All parts follow body lift
        result.head.translateY += result.torso.translateY * 0.8;
        result.legs.translateY = (result.legs.translateY || 0) + result.torso.translateY * 0.5;
        result.extras.translateY = result.torso.translateY * 0.9;

        return result;
    }

    // ── Happy (One-Shot, 2s) ──

    _computeHappy(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 1600) {
            const hopIndex = Math.min(2, Math.floor(t / 400));
            const hopStart = hopIndex * 400;
            const hopDuration = hopIndex === 2 ? 800 : 400;
            const hopProgress = Math.min(1, (t - hopStart) / hopDuration);
            const hopHeights = [25, 28, 30];

            const hopY = -hopHeights[hopIndex] * Math.sin(hopProgress * Math.PI);
            result.torso.translateY = hopY;
            result.head.translateY = hopY * 0.9;
            result.legs.translateY = hopY * 0.7;
            result.extras.translateY = hopY * 0.9;
            result.tail.translateY = hopY * 0.6;

            // Spin on 3rd hop
            if (hopIndex === 2) {
                result.torso.rotation = 360 * hopProgress;
                result.head.rotation = 360 * hopProgress;
            }

            // Fast tail wag
            result.tail.rotation = (result.tail.rotation || 0) + 25 * Math.sin(t / 1000 * Math.PI * 6);
        } else {
            // Settle phase: elastic bounce
            const settleT = (t - 1600) / 400;
            const bounce = 1 + 0.1 * Math.sin(settleT * Math.PI * 3) * (1 - settleT);
            result.torso.scaleY = bounce;
            result.torso.scaleX = 2 - bounce;
        }

        return result;
    }

    // ── Eating (One-Shot, 2.5s) ──

    _computeEating(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 500) {
            const dipProgress = t / 500;
            result.head.translateY = 20 * this._easeOutQuad(dipProgress);
            result.eyes.translateY = 20 * this._easeOutQuad(dipProgress);
        } else if (t < 1400) {
            const bobTime = t - 500;
            const bobIndex = Math.min(2, Math.floor(bobTime / 300));
            const bobProgress = (bobTime - bobIndex * 300) / 300;
            const bobOffset = -5 * Math.sin(bobProgress * Math.PI);
            result.head.translateY = 20 + bobOffset;
            result.eyes.translateY = 20 + bobOffset;
        } else if (t < 2000) {
            const returnProgress = (t - 1400) / 600;
            result.head.translateY = 20 * (1 - this._easeInQuad(returnProgress));
            result.eyes.translateY = result.head.translateY;
        } else if (t < 2500) {
            const blinkTime = t - 2000;
            if (blinkTime < 300) {
                result.eyes.scaleY = 0.1;
            }
            result.torso.scaleX = 1.02;
            result.torso.scaleY = 1.02;
        }

        return result;
    }

    _easeOutQuad(t) { return t * (2 - t); }
    _easeInQuad(t) { return t * t; }

    // ── Sleeping (Looping) ──

    _computeSleeping(state) {
        const t = state.time / 1000;
        const result = this._defaultState();

        result.eyes.scaleY = 0.1;

        result.torso.scaleY = 1 + 0.06 * Math.sin(t * Math.PI / 2);

        result.head.rotation = 5 + 0.5 * Math.sin(t * 0.5);
        result.head.translateY = 1 * Math.sin(t * Math.PI / 2);

        if (state.morphology.hasTail) {
            result.tail.rotation = -5;
        }

        if (state.morphology.hasWings) {
            result.wings.scaleX = 0.85;
            result.wings.scaleY = 0.85;
        }

        return result;
    }

    // ── Bathing (One-Shot, 2s) ──

    _computeBathing(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 1000) {
            const intensity = 1 - (t / 1000);
            const tSec = t / 1000;

            result.torso.translateX = 10 * intensity * Math.sin(tSec * Math.PI * 20);
            result.torso.translateY = 3 * intensity * Math.cos(tSec * Math.PI * 15);
            result.torso.rotation = 5 * intensity * Math.sin(tSec * Math.PI * 25);

            result.head.rotation = 8 * intensity * Math.sin(tSec * Math.PI * 30);
            result.head.translateX = 5 * intensity * Math.cos(tSec * Math.PI * 18);

            if (state.morphology.hasTail) {
                result.tail.rotation = 20 * intensity * Math.sin(tSec * Math.PI * 15);
            }
        } else {
            const settleT = (t - 1000) / 1000;
            result.torso.scaleY = 1 + 0.02 * Math.sin(settleT * Math.PI * 2);
        }

        return result;
    }

    // ── Bored (Looping) ──

    _computeBored(state) {
        const t = state.time / 1000;
        const result = this._defaultState();

        result.torso.scaleY = 1 + 0.03 * Math.sin(t * Math.PI / 2);

        result.head.rotation = 10;

        result.torso.scaleY += 0.02 * Math.max(0, Math.sin(t * Math.PI / 4));

        // Slow blink every 5s
        if (state.time >= state.nextBlinkTime && state.blinkUntil <= state.time) {
            state.blinkUntil = state.time + 200;
            state.nextBlinkTime = state.time + 5000;
        }
        if (state.time < state.blinkUntil) {
            result.eyes.scaleY = 0.1;
        }

        if (state.morphology.hasTail) {
            result.tail.rotation = 8 * Math.sin(t * Math.PI);
        }

        if (state.morphology.hasWings) {
            result.wings.scaleY = 0.88;
            result.wings.rotation = -3;
        }

        return result;
    }
}
