(function(global) {
  'use strict';

  // Idle breath is computed analytically from `now` — no per-monster timers.
  // One-shot anims (hit, attack, death, charge) are tracked per-target in _states.
  class AnimationManager {
    constructor() {
      this._states = new Map(); // targetId → { kind, startedAt, duration }
    }

    // Begin a one-shot animation on a target.
    // kind: 'attack' | 'hit' | 'death' | 'charge'
    begin(targetId, anim) {
      this._states.set(targetId, {
        kind: anim.kind,
        startedAt: anim.startedAt,
        duration: anim.duration,
      });
    }

    // Advance all animations; prune completed one-shots.
    update(dt, now) {
      for (const [id, anim] of this._states) {
        if (anim.kind === 'idle') continue;
        if (now - anim.startedAt >= anim.duration) {
          this._states.delete(id);
        }
      }
    }

    // Returns a snapshot of animation state used by renderers.
    // now is passed in so the caller (game.js) controls timing.
    stateFor(targetId, now) {
      // Analytical idle breath — 1.2s cycle, ±2.5% scale
      const idleBreath = Math.sin((now / 1200) * Math.PI * 2) * 0.025;

      const base = {
        idleBreath,
        hitFlash: 0,
        attackProgress: 0,
        deathFade: 1,
        chargeGlow: 0,
        shakeUntilMs: 0,
      };

      const anim = this._states.get(targetId);
      if (!anim || anim.kind === 'idle') return base;

      const elapsed = now - anim.startedAt;
      const t = Math.min(1, elapsed / anim.duration);

      if (anim.kind === 'hit') {
        base.hitFlash = Math.max(0, 1 - t * 2.5);
        base.shakeUntilMs = anim.startedAt + Math.min(200, anim.duration * 0.6);
      } else if (anim.kind === 'attack') {
        base.attackProgress = t;
      } else if (anim.kind === 'death') {
        base.deathFade = 1 - t;
      } else if (anim.kind === 'charge') {
        base.chargeGlow = t;
      }

      return base;
    }

    cancel(targetId) {
      this._states.delete(targetId);
    }

    cancelAll() {
      this._states.clear();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationManager };
  } else {
    global.AnimationManager = AnimationManager;
  }
})(typeof window !== 'undefined' ? window : globalThis);
