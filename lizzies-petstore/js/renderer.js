/**
 * renderer.js — Canvas 2D: DPR setup, resize, backgrounds, particles.
 * Does NOT own its own RAF loop. Exposes draw methods called by game.js.
 */

class Renderer {
    constructor() {
        this._canvasMap = {};   // id -> { canvas, ctx, w, h }
        this._particlePool = [];
        this._maxParticles = 80;
        this._fontsReady = false;
        this._resizeDirty = false;
        this._creatorBgCache = null;
        this._creatorBgW = 0;
        this._creatorBgH = 0;
        this._careBgCache = null;
        this._careBgKey = null;

        // Pre-allocate particle pool
        for (let i = 0; i < this._maxParticles; i++) {
            this._particlePool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0,
                color: '#FFD700', size: 4,
                shape: 'circle', // 'circle', 'heart', 'zzz', 'star'
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
        this._careBgCache = null;
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
     * Draw the care room background (cached to offscreen canvas).
     * @param {string} floorPattern — 'wood', 'carpet', or 'tiles'
     */
    drawCareBackground(ctx, w, h, wallColor, floorPattern) {
        const wc = wallColor || '#FFE4E1';
        const pat = floorPattern || 'wood';

        // Use cached background if valid
        if (this._careBgCache && this._careBgKey === wc + pat + w + h) {
            ctx.drawImage(this._careBgCache, 0, 0);
            return;
        }

        // Build offscreen cache
        const dpr = window.devicePixelRatio || 1;
        const c = document.createElement('canvas');
        c.width = w * dpr;
        c.height = h * dpr;
        const offCtx = c.getContext('2d');
        offCtx.scale(dpr, dpr);

        // Wall
        offCtx.fillStyle = wc;
        offCtx.fillRect(0, 0, w, h * 0.6);

        // Floor
        const floorY = h * 0.6;
        const floorH = h * 0.4;

        if (pat === 'carpet') {
            offCtx.fillStyle = '#C8A8B8';
            offCtx.fillRect(0, floorY, w, floorH);
            offCtx.fillStyle = 'rgba(160, 120, 140, 0.3)';
            for (let y = floorY; y < h; y += 6) {
                for (let x = ((y - floorY) % 12 === 0 ? 0 : 3); x < w; x += 6) {
                    offCtx.fillRect(x, y, 2, 2);
                }
            }
        } else if (pat === 'tiles') {
            offCtx.fillStyle = '#E0D8D0';
            offCtx.fillRect(0, floorY, w, floorH);
            offCtx.strokeStyle = '#C8C0B8';
            offCtx.lineWidth = 1;
            const tileSize = 30;
            for (let y = floorY; y < h; y += tileSize) {
                for (let x = 0; x < w; x += tileSize) {
                    offCtx.strokeRect(x, y, tileSize, tileSize);
                }
            }
        } else {
            // wood (default)
            offCtx.fillStyle = '#D4C4A8';
            offCtx.fillRect(0, floorY, w, floorH);
            offCtx.strokeStyle = '#C0B090';
            offCtx.lineWidth = 1;
            const plankH = 20;
            for (let y = floorY; y < h; y += plankH) {
                offCtx.beginPath();
                offCtx.moveTo(0, y);
                offCtx.lineTo(w, y);
                offCtx.stroke();
                const offset = (Math.floor((y - floorY) / plankH) % 2) * 50;
                for (let x = offset; x < w; x += 100) {
                    offCtx.beginPath();
                    offCtx.moveTo(x, y);
                    offCtx.lineTo(x, y + plankH);
                    offCtx.stroke();
                }
            }
        }

        // Baseboard
        offCtx.fillStyle = '#B8A88A';
        offCtx.fillRect(0, h * 0.58, w, h * 0.04);

        this._careBgCache = c;
        this._careBgKey = wc + pat + w + h;

        ctx.drawImage(c, 0, 0);
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

    // ── Particle System ──────────────────────────────────

    /**
     * Get a particle from the pool.
     * @param {string} [shape='circle'] — 'circle', 'heart', 'zzz', 'star'
     */
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
                3 + Math.random() * 3,
                'star'
            );
        }
    }

    /**
     * Spawn heart particles floating upward.
     */
    spawnHearts(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.spawnParticle(
                x + (Math.random() - 0.5) * 40,
                y,
                (Math.random() - 0.5) * 20,
                -30 - Math.random() * 30,
                800 + Math.random() * 400,
                '#FF69B4',
                4 + Math.random() * 3,
                'heart'
            );
        }
    }

    /**
     * Spawn a single Zzz particle floating up and right.
     */
    spawnZzz(x, y) {
        this.spawnParticle(
            x, y,
            8 + Math.random() * 5,
            -15 - Math.random() * 10,
            1200 + Math.random() * 400,
            '#9B59B6',
            6 + Math.random() * 3,
            'zzz'
        );
    }

    /**
     * Spawn clean sparkle particles (blue/cyan).
     */
    spawnCleanSparkles(x, y, count) {
        const colors = ['#4A90D9', '#00CED1', '#48CAE4', '#90E0EF'];
        for (let i = 0; i < count; i++) {
            this.spawnParticle(
                x, y,
                (Math.random() - 0.5) * 40,
                -20 - Math.random() * 30,
                500 + Math.random() * 300,
                colors[i % colors.length],
                3 + Math.random() * 2,
                'star'
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
            // Gravity varies by shape: hearts/zzz float up, others fall gently
            if (p.shape === 'zzz') {
                p.vy -= 5 * dtSec; // slight upward acceleration
            } else if (p.shape === 'heart') {
                p.vy += 10 * dtSec; // very gentle gravity
            } else {
                p.vy += 30 * dtSec; // normal gravity
            }
            p.life -= dt;
            if (p.life <= 0) p.active = false;
        }
    }

    /**
     * Draw all active particles to a context.
     * Batched: no ctx.save()/restore() per particle.
     */
    drawParticles(ctx) {
        for (const p of this._particlePool) {
            if (!p.active) continue;
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;

            const s = p.size * (0.5 + 0.5 * alpha);

            switch (p.shape) {
                case 'heart':
                    this._drawHeartParticle(ctx, p.x, p.y, s);
                    break;
                case 'zzz':
                    this._drawZzzParticle(ctx, p.x, p.y, s, alpha);
                    break;
                case 'star':
                    this._drawStarParticle(ctx, p.x, p.y, s);
                    break;
                default:
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Draw a heart shape at (x, y) with radius s.
     */
    _drawHeartParticle(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.3);
        ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.1);
        ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
        ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
        ctx.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Draw a "Z" character at (x, y).
     */
    _drawZzzParticle(ctx, x, y, s, alpha) {
        ctx.font = `bold ${Math.round(s * 2.5)}px OpenDyslexic, 'Comic Sans MS', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Z', x, y);
    }

    /**
     * Draw a 5-point star at (x, y) with radius s.
     */
    _drawStarParticle(ctx, x, y, s) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / 5;
            const ox = x + Math.cos(outerAngle) * s;
            const oy = y + Math.sin(outerAngle) * s;
            const ix = x + Math.cos(innerAngle) * s * 0.4;
            const iy = y + Math.sin(innerAngle) * s * 0.4;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Check if any particles are still active.
     */
    hasActiveParticles() {
        return this._particlePool.some(p => p.active);
    }
}
