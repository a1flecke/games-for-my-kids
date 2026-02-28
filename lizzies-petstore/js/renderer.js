/**
 * renderer.js — Canvas 2D: backgrounds, creature compositing, particles.
 * Does NOT own its own RAF loop. Exposes draw methods called by game.js.
 */

class Renderer {
    constructor() {
        this._canvasMap = {};  // id → { canvas, ctx }
        this._backgroundCache = null;
        this._particlePool = [];
        this._maxParticles = 50;

        // Pre-allocate particle pool
        for (let i = 0; i < this._maxParticles; i++) {
            this._particlePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0,
                color: '#FFD700', size: 4,
                active: false
            });
        }
    }

    /**
     * Set up a canvas element with DPR scaling.
     * Call on init and on resize.
     */
    setupCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        this._canvasMap[canvasId] = { canvas, ctx };
        return { canvas, ctx, w: canvas.clientWidth, h: canvas.clientHeight };
    }

    /**
     * Get a particle from the pool.
     */
    spawnParticle(x, y, vx, vy, life, color, size) {
        for (const p of this._particlePool) {
            if (!p.active) {
                p.x = x; p.y = y;
                p.vx = vx; p.vy = vy;
                p.life = life; p.maxLife = life;
                p.color = color; p.size = size;
                p.active = true;
                return p;
            }
        }
        return null; // Pool exhausted
    }

    /**
     * Update all active particles.
     */
    updateParticles(dt) {
        const dtSec = dt / 1000;
        for (const p of this._particlePool) {
            if (!p.active) continue;
            p.x += p.vx * dtSec;
            p.y += p.vy * dtSec;
            p.life -= dt;
            if (p.life <= 0) p.active = false;
        }
    }

    /**
     * Draw all active particles to a context.
     */
    drawParticles(ctx) {
        for (const p of this._particlePool) {
            if (!p.active) continue;
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Clear a canvas context.
     */
    clear(ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
    }
}
