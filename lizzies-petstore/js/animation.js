/**
 * animation.js — Pivot-based animation engine.
 * Computes per-part transform deltas (translate, rotate, scale) each frame.
 * Delta-time based, 60fps target, cap delta at 50ms.
 *
 * Animation cycles: idle, walk, fly, happy, eating, sleeping, bathing, bored.
 * Morphology-adaptive: no wings → no fly, no legs → float/slither.
 */

class AnimationEngine {
    constructor() {
        this._animations = new Map(); // creatureId → animation state
    }

    /**
     * Start animating a creature.
     * @param {string} creatureId
     * @param {string} animName — 'idle', 'walk', 'fly', 'happy', 'eating', 'sleeping', 'bathing', 'bored'
     * @param {object} morphology — which parts the creature has (for adaptive animations)
     */
    startAnimation(creatureId, animName, morphology) {
        this._animations.set(creatureId, {
            name: animName,
            time: 0,
            morphology: morphology || {}
        });
    }

    /**
     * Stop animating a creature.
     */
    stopAnimation(creatureId) {
        this._animations.delete(creatureId);
    }

    /**
     * Update all active animations.
     * @param {number} dt — delta time in ms (capped at 50ms by game.js)
     */
    update(dt) {
        for (const [id, state] of this._animations) {
            state.time += dt;
        }
    }

    /**
     * Get the current animation state for a creature (per-part transforms).
     * Returns an object keyed by part slot with { translateX, translateY, rotation, scaleX, scaleY }.
     */
    getState(creatureId) {
        const state = this._animations.get(creatureId);
        if (!state) return this._defaultState();

        switch (state.name) {
            case 'idle': return this._computeIdle(state);
            case 'walk': return this._computeWalk(state);
            case 'happy': return this._computeHappy(state);
            case 'sleeping': return this._computeSleeping(state);
            case 'bored': return this._computeBored(state);
            default: return this._defaultState();
        }
    }

    /**
     * Default (no animation) state — all transforms at identity.
     */
    _defaultState() {
        const state = {};
        for (const slot of ['legs', 'tail', 'torso', 'wings', 'head', 'eyes', 'extras', 'accessories']) {
            state[slot] = { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        return state;
    }

    /**
     * Idle animation: breathing, blink, ear twitch, tail sway, wing fold.
     * Will be fully implemented in Session 7.
     */
    _computeIdle(state) {
        const t = state.time / 1000; // seconds
        const result = this._defaultState();

        // Breathing: torso scaleY oscillates ±3% on 2s sine wave
        result.torso.scaleY = 1 + 0.03 * Math.sin(t * Math.PI);

        // Tail sway: rotate ±15° on 1.5s sine wave
        result.tail.rotation = (15 * Math.PI / 180) * Math.sin(t * Math.PI / 0.75);

        // Head bob: slight up/down
        result.head.translateY = 2 * Math.sin(t * Math.PI * 0.8);

        return result;
    }

    _computeWalk(state) {
        return this._defaultState(); // Session 7
    }

    _computeHappy(state) {
        return this._defaultState(); // Session 7
    }

    _computeSleeping(state) {
        return this._defaultState(); // Session 7
    }

    _computeBored(state) {
        return this._defaultState(); // Session 7
    }
}
