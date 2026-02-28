/**
 * renderer.js — Canvas 2D: DPR setup, resize, backgrounds, particles.
 * Does NOT own its own RAF loop. Exposes draw methods called by game.js.
 */

class Renderer {
    constructor() {
        this._canvasMap = {};   // id -> { canvas, ctx, w, h }
        this._particlePool = [];
        this._maxParticles = 50;
        this._fontsReady = false;
        this._resizeDirty = false;
        this._creatorBgCache = null;
        this._creatorBgW = 0;
        this._creatorBgH = 0;

        // Pre-allocate particle pool
        for (let i = 0; i < this._maxParticles; i++) {
            this._particlePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0,
                color: '#FFD700', size: 4,
                active: false
            });
        }

        // Font loading guard
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => { this._fontsReady = true; });
        } else {
            this._fontsReady = true;
        }

        // Resize sets a dirty flag — game.js checks it in the loop
        this._onResize = () => { this._resizeDirty = true; };
        window.addEventListener('resize', this._onResize);
    }

    /**
     * Set up a canvas element with DPR scaling.
     * Call on init and on resize.
     */
    setupCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Skip if canvas has no dimensions yet (hidden screen)
        if (w === 0 || h === 0) return null;

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before re-scaling
        ctx.scale(dpr, dpr);

        this._canvasMap[canvasId] = { canvas, ctx, w, h };
        return { canvas, ctx, w, h };
    }

    /**
     * Handle pending resize. Called by game.js in the tick loop (not independently).
     */
    handleResize() {
        if (!this._resizeDirty) return;
        this._resizeDirty = false;
        this._creatorBgCache = null; // invalidate cached backgrounds
        for (const id of Object.keys(this._canvasMap)) {
            this.setupCanvas(id);
        }
    }

    /**
     * Get cached canvas info. Returns null if not set up yet.
     */
    getCanvas(canvasId) {
        return this._canvasMap[canvasId] || null;
    }

    /**
     * Clear a canvas.
     */
    clear(ctx, w, h) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    /**
     * Draw a cream background (default scene).
     */
    drawBackground(ctx, w, h) {
        ctx.fillStyle = '#F5F0E8';
        ctx.fillRect(0, 0, w, h);
    }

    /**
     * Draw the care room background.
     */
    drawCareBackground(ctx, w, h, wallColor) {
        // Wall
        ctx.fillStyle = wallColor || '#FFE4E1';
        ctx.fillRect(0, 0, w, h * 0.6);

        // Floor
        ctx.fillStyle = '#D4C4A8';
        ctx.fillRect(0, h * 0.6, w, h * 0.4);

        // Baseboard
        ctx.fillStyle = '#B8A88A';
        ctx.fillRect(0, h * 0.58, w, h * 0.04);
    }

    /**
     * Draw the park background with grass and sky.
     */
    drawParkBackground(ctx, w, h) {
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.6);

        // Grass
        const grassGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
        grassGrad.addColorStop(0, '#7EC850');
        grassGrad.addColorStop(1, '#5DA83A');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }

    /**
     * Draw the creator workspace background (cached grid dots).
     */
    drawCreatorBackground(ctx, w, h) {
        this._ensureCreatorBgCache(w, h);
        ctx.drawImage(this._creatorBgCache, 0, 0);
    }

    /**
     * Build offscreen cache for creator background.
     */
    _ensureCreatorBgCache(w, h) {
        if (this._creatorBgCache && this._creatorBgW === w && this._creatorBgH === h) return;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const offCtx = c.getContext('2d');
        offCtx.fillStyle = '#F5F0E8';
        offCtx.fillRect(0, 0, w, h);
        offCtx.fillStyle = 'rgba(44, 36, 22, 0.06)';
        const spacing = 30;
        for (let x = spacing; x < w; x += spacing) {
            for (let y = spacing; y < h; y += spacing) {
                offCtx.beginPath();
                offCtx.arc(x, y, 1.5, 0, Math.PI * 2);
                offCtx.fill();
            }
        }
        this._creatorBgCache = c;
        this._creatorBgW = w;
        this._creatorBgH = h;
    }

    /**
     * Draw placeholder text (used before creatures are drawn).
     */
    drawPlaceholderText(ctx, w, h, text) {
        if (!this._fontsReady) return;

        ctx.save();
        ctx.fillStyle = '#B8A88A';
        ctx.font = "20px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
        ctx.restore();
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
     * Spawn a burst of sparkle particles.
     */
    spawnSparkles(x, y, count) {
        const colors = ['#FFD700', '#FF69B4', '#9B59B6', '#4A90D9', '#FF6B6B'];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5);
            const speed = 40 + Math.random() * 60;
            this.spawnParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                600 + Math.random() * 400,
                colors[i % colors.length],
                3 + Math.random() * 3
            );
        }
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
            p.vy += 30 * dtSec; // gentle gravity
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
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Check if any particles are still active.
     */
    hasActiveParticles() {
        return this._particlePool.some(p => p.active);
    }
}
