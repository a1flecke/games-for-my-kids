(function(global) {
  'use strict';

  const GRAVITY = 220; // px/s²

  class ParticlePool {
    constructor(size) {
      size = size === undefined ? 128 : size;
      this._size = size;
      this._pool = [];
      this._next = 0; // round-robin eviction index
      for (let i = 0; i < size; i++) {
        this._pool.push({ live: false, kind: 'sparkle', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff' });
      }
    }

    // Claim a slot (round-robin on full pool — oldest particle evicted).
    spawn(kind, x, y, vx, vy, ttl, color) {
      let slot = -1;
      for (let i = 0; i < this._size; i++) {
        if (!this._pool[i].live) { slot = i; break; }
      }
      if (slot === -1) {
        slot = this._next;
        this._next = (this._next + 1) % this._size;
      }
      const p = this._pool[slot];
      p.live = true; p.kind = kind;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = ttl; p.maxLife = ttl; p.color = color;
    }

    // Advance all live particles. No allocations.
    update(dt) {
      const dtSec = dt / 1000;
      for (let i = 0; i < this._size; i++) {
        const p = this._pool[i];
        if (!p.live) continue;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy += GRAVITY * dtSec;
        p.life -= dt;
        if (p.life <= 0) p.live = false;
      }
    }

    // Draw all live particles — batched globalAlpha, no save/restore per particle.
    draw(ctx) {
      // Draw each kind in a group to minimize state changes.
      this._drawKind(ctx, 'sparkle');
      this._drawKind(ctx, 'ember');
      this._drawKind(ctx, 'inkdot');
      ctx.globalAlpha = 1;
    }

    _drawKind(ctx, kind) {
      for (let i = 0; i < this._size; i++) {
        const p = this._pool[i];
        if (!p.live || p.kind !== kind) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        if (kind === 'sparkle') {
          const s = 3;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        } else if (kind === 'ember') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParticlePool };
  } else {
    global.ParticlePool = ParticlePool;
  }
})(typeof window !== 'undefined' ? window : globalThis);
