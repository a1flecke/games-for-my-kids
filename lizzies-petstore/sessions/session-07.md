# Session 7 — Animation Engine
**Model:** Opus | **Focus:** Pivot-based animation for all creature states

---

## Pre-flight
1. Run `/petstore-checklist`
2. Read this plan fully before writing code

---

## Step 1 — Fix Rotation Unit Bug (degrees, not radians)

### Current bug

`drawCreatureById()` in `creature-cache.js` applies `ctx.rotate(partAnim.rotation * Math.PI / 180)` -- it expects rotation values in **degrees**. But the current `animation.js` outputs rotation in **radians** (e.g., `(15 * Math.PI / 180) * Math.sin(...)` is already radians). This causes double-conversion: the creature rotates ~57x more than intended.

The Creator's `_buildAnimState()` correctly outputs rotation in **degrees** (raw numeric values from `_partRotations`), confirming that `drawCreatureById` was designed for degrees.

### Fix: All animation output must use degrees

Every `_compute*()` method in `AnimationEngine` must output rotation in **degrees**. Replace all instances of `(N * Math.PI / 180) * Math.sin(...)` with just `N * Math.sin(...)`.

Examples of incorrect patterns to fix:
```js
// WRONG — outputs radians, but drawCreatureById expects degrees
result.tail.rotation = (15 * Math.PI / 180) * Math.sin(t * Math.PI / 0.75);

// CORRECT — outputs degrees
result.tail.rotation = 15 * Math.sin(t * Math.PI / 0.75);
```

Apply this fix to every rotation assignment across all `_compute*()` methods. This is a precondition for all subsequent steps.

---

## Step 2 — Particle System Shape Support

The renderer's particle system currently only draws circles. Session 7 needs heart particles (happy reaction), zzz particles (sleeping), and sparkle-star particles (bathing). Extend the particle pool to support shapes.

### Add `shape` field to particle pool

In `renderer.js`, update the pre-allocated particle pool to include a `shape` field:

```js
for (let i = 0; i < this._maxParticles; i++) {
    this._particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#FFD700', size: 4,
        shape: 'circle',  // 'circle' | 'heart' | 'zzz' | 'star'
        active: false
    });
}
```

### Update `spawnParticle()` signature

Add optional `shape` parameter (defaults to `'circle'` for backward compatibility):

```js
spawnParticle(x, y, vx, vy, life, color, size, shape) {
    for (const p of this._particlePool) {
        if (!p.active) {
            p.x = x; p.y = y;
            p.vx = vx; p.vy = vy;
            p.life = life; p.maxLife = life;
            p.color = color; p.size = size;
            p.shape = shape || 'circle';
            p.active = true;
            return p;
        }
    }
    return null;
}
```

### Update `drawParticles()` to dispatch by shape

```js
drawParticles(ctx) {
    for (const p of this._particlePool) {
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        const sz = p.size * (0.5 + 0.5 * alpha);

        switch (p.shape) {
            case 'heart':
                this._drawHeart(ctx, p.x, p.y, sz);
                break;
            case 'zzz':
                this._drawZzz(ctx, p.x, p.y, sz, p.color);
                break;
            case 'star':
                this._drawStar(ctx, p.x, p.y, sz);
                break;
            default: // 'circle'
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
    ctx.globalAlpha = 1;
}
```

### Shape drawing helpers

```js
/**
 * Draw a small heart shape centered at (x, y).
 */
_drawHeart(ctx, x, y, size) {
    const s = size;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.1);
    ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
    ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
    ctx.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
    ctx.fill();
}

/**
 * Draw a "Z" character at (x, y).
 */
_drawZzz(ctx, x, y, size, color) {
    ctx.font = `bold ${Math.round(size * 3)}px OpenDyslexic, 'Comic Sans MS', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('z', x, y);
}

/**
 * Draw a 4-point sparkle star centered at (x, y).
 */
_drawStar(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const outerX = x + Math.cos(angle) * size;
        const outerY = y + Math.sin(angle) * size;
        const innerAngle = angle + Math.PI / 4;
        const innerX = x + Math.cos(innerAngle) * size * 0.3;
        const innerY = y + Math.sin(innerAngle) * size * 0.3;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
}
```

### Add convenience spawners

```js
/**
 * Spawn heart particles floating upward.
 */
spawnHearts(x, y, count) {
    for (let i = 0; i < count; i++) {
        this.spawnParticle(
            x + (Math.random() - 0.5) * 40,
            y,
            (Math.random() - 0.5) * 20,
            -(30 + Math.random() * 30),
            800 + Math.random() * 400,
            '#FF69B4',
            4 + Math.random() * 2,
            'heart'
        );
    }
}

/**
 * Spawn a single "z" particle drifting upward.
 */
spawnZzz(x, y) {
    this.spawnParticle(
        x + (Math.random() - 0.5) * 10,
        y,
        5 + Math.random() * 10,
        -(15 + Math.random() * 10),
        1200 + Math.random() * 400,
        '#9B59B6',
        4 + Math.random() * 2,
        'zzz'
    );
}

/**
 * Spawn sparkle-star particles (for bathing clean effect).
 */
spawnCleanSparkles(x, y, count) {
    const colors = ['#FFD700', '#FFFFFF', '#87CEEB'];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5);
        const speed = 30 + Math.random() * 40;
        this.spawnParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            500 + Math.random() * 300,
            colors[i % colors.length],
            3 + Math.random() * 3,
            'star'
        );
    }
}
```

### Increase particle pool size

Hearts, zzz, and sparkle-stars run alongside normal sparkles. Increase `_maxParticles` from 50 to **80** to handle simultaneous animation particle effects.

---

## Step 3 — Rewrite AnimationEngine with Morphology Detection

Replace the entire `AnimationEngine` class in `animation.js`. The rewrite addresses:
1. Rotation units (degrees throughout)
2. Morphology detection from creature data (not manual flags)
3. Interval-counter blink/twitch timing (not modulus on float)
4. Particle spawning integration
5. One-shot animation completion callbacks

### Constructor and State Structure

```js
class AnimationEngine {
    constructor() {
        this._animations = new Map(); // creatureId -> animation state
    }

    /**
     * Start animating a creature.
     * @param {string} creatureId
     * @param {string} animName — 'idle', 'walk', 'fly', 'happy', 'eating', 'sleeping', 'bathing', 'bored'
     * @param {object} creatureData — full creature object (body parts inspected for morphology)
     * @param {function} [onComplete] — callback when one-shot animation finishes (happy, eating, bathing)
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
            // Interval counters for periodic effects (not modulus on float)
            nextBlinkTime: 3000 + Math.random() * 3000,
            nextEarTwitchTime: 4000 + Math.random() * 4000,
            nextZzzTime: 0,
            nextHeartTime: 0,
            nextSparkleTime: 0,
            // Blink state
            blinkUntil: 0, // timestamp (state.time) when blink ends
            // Ear twitch state
            earTwitchUntil: 0,
            earTwitchDir: 1
        });
    }
```

### Morphology Detection

Inspect the creature's body data to determine what parts exist:

```js
    /**
     * Detect creature morphology from body data.
     * Used to adapt animations (no wings -> skip fly, tentacles -> undulate, etc.)
     */
    _detectMorphology(creatureData) {
        if (!creatureData || !creatureData.body) {
            return { hasWings: false, hasLegs: false, hasTail: false, hasEars: false,
                     legType: null, tailType: null };
        }
        const body = creatureData.body;
        const legs = body.legs;
        const firstLeg = Array.isArray(legs) ? (legs[0] || null) : legs;

        return {
            hasWings: !!body.wings,
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
```

### Stop and Query Methods

```js
    /**
     * Stop animating a creature.
     */
    stopAnimation(creatureId) {
        this._animations.delete(creatureId);
    }

    /**
     * Check if a creature is currently animating.
     */
    isAnimating(creatureId) {
        return this._animations.has(creatureId);
    }

    /**
     * Get current animation name for a creature.
     */
    getAnimationName(creatureId) {
        const state = this._animations.get(creatureId);
        return state ? state.name : null;
    }

    /**
     * Update all active animations. Called by game.js (dt already capped at 50ms).
     * @param {number} dt — delta time in ms
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
                        this._animations.set(id, {
                            ...state,
                            name: 'idle',
                            time: 0,
                            completed: false,
                            onComplete: null
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
            default: return 0; // looping
        }
    }
```

### Particle Spawning in Update (not draw)

```js
    /**
     * Spawn particles for animations that emit them.
     * Called from update(), not draw(), to keep draw path allocation-free.
     */
    _updateParticles(state) {
        if (!window.renderer) return;
        // Need creature position for particles — use a stored position or skip
        // Position is set by the caller via setCreaturePosition()
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
     * Called by care.js/park.js before each frame.
     * @param {string} creatureId
     * @param {number} x — screen center X (CSS px)
     * @param {number} y — screen center Y (CSS px)
     * @param {number} displaySize — creature display size
     */
    setCreaturePosition(creatureId, x, y, displaySize) {
        if (!this._creaturePositions) {
            this._creaturePositions = new Map();
        }
        this._creaturePositions.set(creatureId, { x, y, displaySize });
    }
```

### Default State

```js
    /**
     * Default (no animation) state — all transforms at identity.
     * All rotation values are in DEGREES (drawCreatureById converts to radians).
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
     * Returns an object keyed by part slot with { translateX, translateY, rotation, scaleX, scaleY }.
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
```

---

## Step 4 — Idle Animation

The idle cycle is the most commonly visible animation. Every creature should feel alive even when the player isn't interacting.

### Spec

| Sub-animation | Target slot(s) | Parameters | Notes |
|---|---|---|---|
| Breathing | torso `scaleY` | +/-3% (0.97-1.03), 2s full sine cycle | Always active |
| Blink | eyes `scaleY` | Squash to 0.1 for 150ms, then restore | Interval counter: 3-6s between blinks |
| Ear twitch | extras `rotation` | +/-5 deg for 300ms | Only if `hasEars`; interval counter: 4-8s |
| Tail sway | tail `rotation` | +/-15 deg, 1.5s sine | Only if `hasTail` |
| Wing fold | wings `scaleX`/`scaleY` | 0.9-1.0, 3s sine | Only if `hasWings` |
| Head bob | head `translateY` | +/-2px, ~2.5s sine | Always active, slightly offset from breathing |
| Tentacle undulate | legs `rotation` | +/-8 deg, 1.2s sine | Only if `isTentacles` |

### Implementation

```js
    _computeIdle(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        // Breathing: torso scaleY oscillates +/-3% on 2s sine wave
        result.torso.scaleY = 1 + 0.03 * Math.sin(t * Math.PI); // 2s period

        // Head bob: slight up/down, offset from breathing
        result.head.translateY = 2 * Math.sin(t * Math.PI * 0.8);

        // Tail sway: +/-15 deg on 1.5s sine
        if (m.hasTail) {
            result.tail.rotation = 15 * Math.sin(t * Math.PI / 0.75);
        }

        // Blink: interval-counter based, not modulus on float
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

        // Tentacle undulate: sinusoidal wiggle
        if (m.isTentacles) {
            result.legs.rotation = 8 * Math.sin(t * Math.PI / 0.6);
        }

        return result;
    }
```

> **NOTE on `Math.random()` in blink/twitch scheduling:** The `Math.random()` calls here happen in `_computeIdle` which runs per-frame. This is acceptable because these values set *next-time counters* for timing variation only -- they don't affect visual rendering determinism. The seeded-PRNG rule applies to cached textures, not animation timing jitter.

---

## Step 5 — Walk Cycle

### Spec

| Sub-animation | Target | Parameters | Notes |
|---|---|---|---|
| Body bob | torso `translateY` | +/-3px, 0.5s cycle | Simulates footfall impact |
| Leg swing | legs `rotation` | +/-20 deg alternating, 0.5s cycle | Only if `hasLegs`; tentacles: wider undulation |
| Head follow | head `translateY` | +/-1.5px, 0.5s cycle with 0.1s phase delay | Trails body motion |
| Tail direction | tail `rotation` | +/-10 deg, 0.5s cycle, opposite phase to body | Only if `hasTail` |
| Float/slither (no legs) | torso `translateY` + `translateX` | Y: +/-4px, X: +/-2px sine wave | For legless creatures |

### Implementation

```js
    _computeWalk(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        // Body bob: 3px on 0.5s cycle (2Hz)
        result.torso.translateY = 3 * Math.sin(t * Math.PI * 4);

        if (m.hasLegs) {
            if (m.isTentacles) {
                // Tentacles: wider undulation
                result.legs.rotation = 12 * Math.sin(t * Math.PI * 3);
                result.legs.translateX = 3 * Math.sin(t * Math.PI * 1.5);
            } else {
                // Standard leg swing +/-20 deg
                result.legs.rotation = 20 * Math.sin(t * Math.PI * 4);
            }
        } else {
            // No legs: float/slither locomotion
            result.torso.translateY = 4 * Math.sin(t * Math.PI * 3);
            result.torso.translateX = 2 * Math.sin(t * Math.PI * 1.5);
        }

        // Head follows body bob with slight phase delay
        result.head.translateY = 1.5 * Math.sin(t * Math.PI * 4 - 0.3);

        // Tail follows movement direction (opposite phase)
        if (m.hasTail) {
            result.tail.rotation = 10 * Math.sin(t * Math.PI * 4 + Math.PI * 0.5);
        }

        return result;
    }
```

---

## Step 6 — Fly Cycle

### Spec

Only available if creature `hasWings`. If `startAnimation` is called with `'fly'` on a wingless creature, fall back to idle.

| Sub-animation | Target | Parameters |
|---|---|---|
| Wing flap | wings `rotation` | +/-45 deg, 0.25s half-cycle (4Hz) |
| Body lift | torso `translateY` | -8 to 0px oscillation (0.5s cycle) |
| Legs tuck | legs `translateY` | -10px (constant offset, legs drawn higher) |
| Tail stream | tail `rotation` | -15 deg constant (streams behind) |
| Head steady | head `translateY` | +/-1px (minimal bob, slower than walk) |

### Implementation

```js
    _computeFly(state) {
        const t = state.time / 1000;
        const result = this._defaultState();
        const m = state.morphology;

        // If no wings, fall back to idle
        if (!m.hasWings) return this._computeIdle(state);

        // Body lift oscillation
        result.torso.translateY = -4 - 4 * Math.sin(t * Math.PI * 4);

        // Wing flap: +/-45 deg rapid
        result.wings.rotation = 45 * Math.sin(t * Math.PI * 8);

        // Legs tuck upward
        if (m.hasLegs) {
            result.legs.translateY = -10;
            result.legs.scaleY = 0.8; // Slightly contracted
        }

        // Tail streams back
        if (m.hasTail) {
            result.tail.rotation = -15;
            result.tail.translateY = 3 * Math.sin(t * Math.PI * 2);
        }

        // Head: minimal bob
        result.head.translateY = Math.sin(t * Math.PI * 2);

        // All parts follow body lift
        result.head.translateY += result.torso.translateY * 0.8;
        result.legs.translateY = (result.legs.translateY || 0) + result.torso.translateY * 0.5;
        result.extras.translateY = result.torso.translateY * 0.9;

        return result;
    }
```

---

## Step 7 — Happy Reaction (One-Shot)

### Spec (2s total duration)

| Phase | Time (ms) | What happens |
|---|---|---|
| Hop 1 | 0-400 | Body translateY arcs up 25px and back (sine half-wave) |
| Hop 2 | 400-800 | Same hop, slightly higher (28px) |
| Hop 3 + Spin | 800-1600 | Highest hop (30px) + torso rotation 0 -> 360 deg |
| Settle | 1600-2000 | Gentle bounce (scaleY 0.9 -> 1.1 -> 1.0, elastic ease) |

Particles: hearts + sparkles spawn throughout (handled in `_updateParticles`).

### Implementation

```js
    _computeHappy(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 1600) {
            // 3 hops
            const hopIndex = Math.min(2, Math.floor(t / 400));
            const hopStart = hopIndex * 400;
            const hopDuration = hopIndex === 2 ? 800 : 400;
            const hopProgress = Math.min(1, (t - hopStart) / hopDuration);
            const hopHeights = [25, 28, 30];

            // Hop arc (sine half-wave = up and back down)
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

            // Tail wag faster during happy
            result.tail.rotation = (result.tail.rotation || 0) + 25 * Math.sin(t / 1000 * Math.PI * 6);
        } else {
            // Settle phase: elastic bounce
            const settleT = (t - 1600) / 400; // 0->1
            const bounce = 1 + 0.1 * Math.sin(settleT * Math.PI * 3) * (1 - settleT);
            result.torso.scaleY = bounce;
            result.torso.scaleX = 2 - bounce; // inverse squash/stretch
        }

        return result;
    }
```

---

## Step 8 — Eating Animation (One-Shot)

### Spec (2.5s total)

| Phase | Time (ms) | What happens |
|---|---|---|
| Head dip | 0-500 | Head translateY 0 -> 20px (ease-out) |
| Bob 1 | 500-800 | Head bobs up 5px and back to 20px |
| Bob 2 | 800-1100 | Same bob |
| Bob 3 | 1100-1400 | Same bob |
| Return | 1400-2000 | Head translateY 20 -> 0px (ease-in) |
| Satisfied blink | 2000-2500 | Slow blink (eyes scaleY 0.1 for 300ms), slight smile |

### Implementation

```js
    _computeEating(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 500) {
            // Dip head down
            const dipProgress = t / 500;
            result.head.translateY = 20 * this._easeOutQuad(dipProgress);
            result.eyes.translateY = 20 * this._easeOutQuad(dipProgress);
        } else if (t < 1400) {
            // 3 quick bobs at bottom position
            const bobTime = t - 500;
            const bobIndex = Math.min(2, Math.floor(bobTime / 300));
            const bobProgress = (bobTime - bobIndex * 300) / 300;
            const bobOffset = -5 * Math.sin(bobProgress * Math.PI);
            result.head.translateY = 20 + bobOffset;
            result.eyes.translateY = 20 + bobOffset;
        } else if (t < 2000) {
            // Return to normal
            const returnProgress = (t - 1400) / 600;
            result.head.translateY = 20 * (1 - this._easeInQuad(returnProgress));
            result.eyes.translateY = result.head.translateY;
        } else if (t < 2500) {
            // Satisfied blink (300ms slow blink)
            const blinkTime = t - 2000;
            if (blinkTime < 300) {
                result.eyes.scaleY = 0.1;
            }
            // Slight scale up (contentment)
            result.torso.scaleX = 1.02;
            result.torso.scaleY = 1.02;
        }

        return result;
    }

    /** Quadratic ease-out: decelerating. */
    _easeOutQuad(t) { return t * (2 - t); }

    /** Quadratic ease-in: accelerating. */
    _easeInQuad(t) { return t * t; }
```

---

## Step 9 — Sleeping Animation (Looping)

### Spec

| Sub-animation | Target | Parameters |
|---|---|---|
| Eyes closed | eyes `scaleY` | Constant 0.1 |
| Deep breathing | torso `scaleY` | +/-6% (doubled from idle), 4s cycle |
| Head tilt | head `rotation` | 5 deg constant lean + subtle 0.5 deg oscillation |
| Zzz particles | spawned from head | One "z" every 1.5-2.5s, drifts up-right |

### Implementation

```js
    _computeSleeping(state) {
        const t = state.time / 1000;
        const result = this._defaultState();

        // Eyes closed
        result.eyes.scaleY = 0.1;

        // Deep breathing: doubled amplitude on slower 4s cycle
        result.torso.scaleY = 1 + 0.06 * Math.sin(t * Math.PI / 2);

        // Head tilts and follows breathing slightly
        result.head.rotation = 5 + 0.5 * Math.sin(t * 0.5);
        result.head.translateY = 1 * Math.sin(t * Math.PI / 2);

        // Tail relaxed
        if (state.morphology.hasTail) {
            result.tail.rotation = -5;
        }

        // Wings folded
        if (state.morphology.hasWings) {
            result.wings.scaleX = 0.85;
            result.wings.scaleY = 0.85;
        }

        // Zzz particles handled in _updateParticles()

        return result;
    }
```

---

## Step 10 — Bathing Animation (One-Shot)

### Spec (2s total)

| Phase | Time (ms) | What happens |
|---|---|---|
| Shake | 0-1000 | Multi-axis rapid wiggle, decreasing intensity |
| Sparkle clean | 1000-2000 | Body settles, clean-sparkle particles emit outward |

### Implementation

```js
    _computeBathing(state) {
        const t = state.time; // ms
        const result = this._defaultState();

        if (t < 1000) {
            // Shake phase: intensity decreases over time
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
            // Settle phase: slight happy bounce
            const settleT = (t - 1000) / 1000;
            result.torso.scaleY = 1 + 0.02 * Math.sin(settleT * Math.PI * 2);

            // Clean sparkle particles handled in _updateParticles()
        }

        return result;
    }
```

---

## Step 11 — "A Little Bored" Animation (Looping)

### Spec

This is NOT a sad animation. The creature is mildly restless and seeking attention. Key differences from idle:
- Slower breathing (half speed)
- Persistent head tilt toward player (right side)
- Occasional slow blink (every 5s)
- Occasional small sigh (extra-deep breath)

| Sub-animation | Target | Parameters |
|---|---|---|
| Slow breathing | torso `scaleY` | +/-3%, 4s cycle (half idle speed) |
| Head tilt | head `rotation` | 10 deg constant lean toward player |
| Slow blink | eyes `scaleY` | 0.1 for 200ms every 5s |
| Sigh | torso `scaleY` | Additional +2% on 8s cycle |
| Reduced tail sway | tail `rotation` | +/-8 deg (half idle amplitude), 2s |

### Implementation

```js
    _computeBored(state) {
        const t = state.time / 1000;
        const result = this._defaultState();

        // Slower breathing (half speed, 4s cycle)
        result.torso.scaleY = 1 + 0.03 * Math.sin(t * Math.PI / 2);

        // Head tilted toward player (constant lean)
        result.head.rotation = 10;

        // Occasional sigh: deeper breath on 8s cycle
        result.torso.scaleY += 0.02 * Math.max(0, Math.sin(t * Math.PI / 4));

        // Slow blink every 5s (interval counter)
        if (state.time >= state.nextBlinkTime && state.blinkUntil <= state.time) {
            state.blinkUntil = state.time + 200;
            state.nextBlinkTime = state.time + 5000;
        }
        if (state.time < state.blinkUntil) {
            result.eyes.scaleY = 0.1;
        }

        // Reduced tail sway
        if (state.morphology.hasTail) {
            result.tail.rotation = 8 * Math.sin(t * Math.PI);
        }

        // Wings slightly drooped
        if (state.morphology.hasWings) {
            result.wings.scaleY = 0.88;
            result.wings.rotation = -3;
        }

        return result;
    }
```

---

## Step 12 — Game Loop Integration

### Update `game.js` to drive animations in all canvas states

In `_update(dt)`, the animation engine is already called for CARE and PARK states. Add it to CREATOR and BIRTH_ANIMATION states as well:

```js
_update(dt) {
    switch (this.state) {
        case 'CREATOR':
            window.renderer.updateParticles(dt);
            window.creator.update(dt);
            window.tutorialManager.update(dt);
            window.animationEngine.update(dt);
            break;
        case 'BIRTH_ANIMATION':
            window.renderer.updateParticles(dt);
            this._birthTimer += dt;
            window.animationEngine.update(dt);
            if (this._birthTimer >= this._birthDuration) {
                this.setState('CARE');
            }
            break;
        // ...existing CARE, PARK, WARDROBE cases unchanged...
    }
}
```

### Start idle animation on state entry

In `_enterState()`, whenever a creature is loaded for display, start its idle animation:

**CARE state:**
```js
case 'CARE':
    this._setupCanvas('care-canvas');
    if (this._activeCreatureId) {
        this._cachedCreature = window.saveManager.getCreature(this._activeCreatureId);
        if (this._cachedCreature) {
            window.careManager.startCaring(this._cachedCreature);
            this._updateNeedsDisplay(this._cachedCreature.needs);
            // Start idle animation with morphology detection
            window.animationEngine.startAnimation(
                this._cachedCreature.id, 'idle', this._cachedCreature
            );
        }
    }
    break;
```

**BIRTH_ANIMATION state:** Start idle after creature cache is built (for gentle breathing during reveal):
```js
case 'BIRTH_ANIMATION':
    // ...existing setup...
    if (this._cachedCreature) {
        window.animationEngine.startAnimation(
            this._cachedCreature.id, 'idle', this._cachedCreature
        );
    }
    break;
```

### Stop animation on state exit

In `_exitState()`, stop the creature's animation:
```js
_exitState(state) {
    // Stop animation for active creature
    if (this._activeCreatureId) {
        window.animationEngine.stopAnimation(this._activeCreatureId);
    }
    // ...existing switch cases...
}
```

### Pass animation state to `drawCreatureById`

In `_draw()`, for any state that renders creatures, get the animation state and pass it:

**CARE draw example:**
```js
case 'CARE': {
    window.renderer.clear(ctx, w, h);
    const wallColor = this._cachedCreature
        ? this._cachedCreature.room.wallColor : '#FFE4E1';
    window.renderer.drawCareBackground(ctx, w, h, wallColor);
    window.careManager.draw(ctx, w, h);
    window.renderer.drawParticles(ctx);
    break;
}
```

The `careManager.draw()` should internally call:
```js
const animState = window.animationEngine.getState(this._creatureId);
window.creatureCache.drawCreatureById(ctx, x, y, animState, displaySize, this._creatureId);
```

And before drawing, set the creature position for particle spawning:
```js
window.animationEngine.setCreaturePosition(this._creatureId, x, y, displaySize);
```

### Creator idle preview

The Creator already has `_buildAnimState()` for user-applied rotations/flips. Layer animation on top by merging the animation engine state with the creator's manual transforms:

```js
_buildAnimState() {
    const state = {};
    // Get animation state (if running)
    const animState = window.animationEngine.getState(this._creature.id);

    for (const slot of RENDER_ORDER) {
        const rotation = this._partRotations.get(slot) || 0;
        const flip = this._partFlips.get(slot) || false;
        const anim = animState[slot] || { translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1 };

        state[slot] = {
            translateX: anim.translateX,
            translateY: anim.translateY,
            rotation: rotation + anim.rotation,
            scaleX: (flip ? -1 : 1) * anim.scaleX,
            scaleY: anim.scaleY
        };
    }
    return state;
}
```

Start idle animation when entering Creator (so the preview creature breathes):
```js
startCreating(existingCreature) {
    // ...existing setup...
    window.animationEngine.startAnimation(this._creature.id, 'idle', this._creature);
}
```

---

## Step 13 — Morphology-Adaptive Behavior Summary

Document the fallback behavior for creatures missing parts:

| Missing Part | Animation Adaptation |
|---|---|
| No wings | `fly` falls back to `idle`; wing fold/flap skipped in all anims |
| No legs | Walk uses float/slither (sinusoidal X+Y drift); fly skips leg tuck |
| Tentacles (legs-tentacles-4) | Walk uses wider undulation; idle uses tentacle wave |
| No tail | Tail sway/stream skipped in all anims |
| No ears (extras) | Ear twitch skipped in idle |
| Webbed feet | Walk uses same motion as standard legs (no special case needed) |

No code changes needed for this step -- all the morphology checks are already in Steps 4-11. This step is a reference table for verification.

---

## Step 14 — Validation & Review

1. Run `node lizzies-petstore/scripts/validate-creature-data.js` -- must pass clean
2. Run `/validate-petstore-data` skill -- must pass clean (if data files were modified)
3. Manual verification checklist:
   - [ ] Idle animation shows breathing (torso scaleY oscillation visible)
   - [ ] Idle animation shows blinking (eyes squash every 3-6s)
   - [ ] Idle animation shows tail sway (for creatures with tails)
   - [ ] Idle animation shows wing fold (for creatures with wings)
   - [ ] Idle animation shows ear twitch (for creatures with ear extras)
   - [ ] Idle animation shows tentacle undulation (for tentacle creatures)
   - [ ] Walk cycle shows body bob and leg swing
   - [ ] Walk cycle for legless creature shows float/slither
   - [ ] Fly cycle shows wing flap and body lift (winged creatures only)
   - [ ] Fly cycle falls back to idle for wingless creatures
   - [ ] Happy reaction shows 3 hops with spin on last hop
   - [ ] Happy reaction spawns heart and sparkle particles
   - [ ] Eating shows head dip, 3 bobs, return, and satisfied blink
   - [ ] Sleeping shows closed eyes and deep breathing
   - [ ] Sleeping spawns zzz particles floating up
   - [ ] Bathing shows shake wiggle then sparkle-star particles
   - [ ] Bored shows slower idle with head tilt (NOT sad)
   - [ ] Creator preview shows idle breathing animation
   - [ ] Creator user-applied rotation/flip still works with animation layered on
   - [ ] All rotation values render correctly (no double-conversion bug)
   - [ ] Particle shapes render correctly: hearts, zzz text, star sparkles
   - [ ] No flickering or visual glitches at 60fps
   - [ ] Tab-away and back doesn't cause animation spiral (dt capped at 50ms)
   - [ ] Birth animation creature has idle breathing during reveal
   - [ ] Care mode creature animates in idle by default
   - [ ] State transitions cleanly stop/start animations (no stale animation state)
4. Run `petstore-web-review` agent

---

## Files Modified

| File | Change |
|------|--------|
| `js/animation.js` | Complete rewrite: morphology detection, 8 animation cycles (idle, walk, fly, happy, eating, sleeping, bathing, bored) with correct degree-based rotation, interval-counter blink/twitch, one-shot completion callbacks, particle spawning integration, creature position tracking |
| `js/renderer.js` | Particle shape support (heart, zzz, star), shape drawing helpers, convenience spawners (`spawnHearts`, `spawnZzz`, `spawnCleanSparkles`), increased pool to 80 |
| `js/game.js` | Drive `animationEngine.update(dt)` in CREATOR and BIRTH_ANIMATION states, start/stop idle animation on state entry/exit, pass animation state to creature drawing |
| `js/creator.js` | Merge animation engine state with user transforms in `_buildAnimState()`, start idle animation in `startCreating()` |

---

## Session End Checklist
1. Delete session working files (if any)
2. Run `/validate-petstore-data`
3. Run `node lizzies-petstore/scripts/validate-creature-data.js`
4. Run petstore-web-review agent
5. If new gotchas discovered, update MEMORY.md
6. Commit all work with descriptive message
7. Push to main
