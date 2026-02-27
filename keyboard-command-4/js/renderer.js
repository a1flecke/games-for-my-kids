/**
 * Keyboard Command 4 — Canvas Renderer
 * Room backgrounds, monster sprites, weapons, projectiles, particles.
 * All sprites pre-rendered to offscreen canvases for 60fps on iPad.
 */

// ============================================================
// Theme Palettes (plan.md §7.3)
// ============================================================
const THEMES = {
    ruins:    { floor: '#4A5568', wall: '#2D3748', ceiling: '#1A202C', accent: '#63B3ED', decor: '#718096', name: 'Home Screen Ruins' },
    files:    { floor: '#8B6914', wall: '#6B4C12', ceiling: '#4A3510', accent: '#D4A43A', decor: '#A0854A', name: 'Files Dungeon' },
    editor:   { floor: '#2D1B4E', wall: '#1A0F30', ceiling: '#0D0720', accent: '#D4AF37', decor: '#6B46C1', name: 'Text Editor Tower' },
    navigate: { floor: '#0E4D6E', wall: '#0A3A54', ceiling: '#06283B', accent: '#00E5FF', decor: '#4DD0E1', name: 'Navigation Nexus' },
    select:   { floor: '#37474F', wall: '#263238', ceiling: '#1C2529', accent: '#42A5F5', decor: '#78909C', name: 'Selection Stronghold' },
    apps:     { floor: '#1A1A2E', wall: '#0F0F1E', ceiling: '#080814', accent: '#E040FB', decor: '#7C4DFF', name: 'App Switcher Arena' },
    safari:   { floor: '#0D3B66', wall: '#08294A', ceiling: '#041830', accent: '#00BFA5', decor: '#26C6DA', name: 'Safari Caverns' },
    armory:   { floor: '#4E1A0A', wall: '#3A1208', ceiling: '#260C05', accent: '#FF6D00', decor: '#D84315', name: 'Advanced Armory' },
    combo:    { floor: '#2E4A1E', wall: '#1F3512', ceiling: '#12200A', accent: '#FFD700', decor: '#4CAF50', name: 'Combo Catacombs' },
    core:     { floor: '#1A0A0A', wall: '#100505', ceiling: '#080202', accent: '#FF1744', decor: '#B71C1C', name: 'Corruption Core' }
};

const THEME_ORDER = ['ruins', 'files', 'editor', 'navigate', 'select', 'apps', 'safari', 'armory', 'combo', 'core'];

// ============================================================
// Particle Pool
// ============================================================
class ParticlePool {
    constructor(maxSize = 50) {
        this._pool = [];
        for (let i = 0; i < maxSize; i++) {
            this._pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 3, active: false });
        }
    }

    emit(x, y, count, color, speed = 2, size = 3) {
        let spawned = 0;
        for (let i = 0; i < this._pool.length && spawned < count; i++) {
            const p = this._pool[i];
            if (!p.active) {
                const angle = Math.random() * Math.PI * 2;
                const spd = speed * (0.5 + Math.random());
                p.x = x;
                p.y = y;
                p.vx = Math.cos(angle) * spd;
                p.vy = Math.sin(angle) * spd - 1; // slight upward bias
                p.life = 1.0;
                p.maxLife = 0.4 + Math.random() * 0.4; // 0.4–0.8s
                p.color = color;
                p.size = size * (0.5 + Math.random() * 0.5);
                p.active = true;
                spawned++;
            }
        }
    }

    update(dt) {
        for (let i = 0; i < this._pool.length; i++) {
            const p = this._pool[i];
            if (!p.active) continue;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.05 * dt * 60; // gravity
            p.life -= dt / p.maxLife;
            if (p.life <= 0) {
                p.active = false;
            }
        }
    }

    draw(ctx) {
        for (let i = 0; i < this._pool.length; i++) {
            const p = this._pool[i];
            if (!p.active) continue;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    clear() {
        for (let i = 0; i < this._pool.length; i++) {
            this._pool[i].active = false;
        }
    }
}

// ============================================================
// Renderer
// ============================================================
class Renderer {
    get canvas() { return this._canvas; }

    constructor(canvas) {
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._width = 800;
        this._height = 600;

        // Offscreen caches
        this._bgCache = null;
        this._currentTheme = null;
        this._spriteCache = {}; // key: 'type_state' → offscreen canvas

        // Vanishing point
        this._vpX = 400;
        this._vpY = 200;

        // Particle system
        this.particles = new ParticlePool(50);

        // Active projectiles for rendering
        this._projectiles = [];

        // Screen shake state (driven by game loop, no independent timers)
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
        this._shakeIntensity = 0;
        this._shakeDuration = 0;
        this._shakeElapsed = 0;

        // Floating text system (max 8, recycle oldest)
        this._floatingTexts = [];
    }

    // ----------------------------------------------------------
    // Room Background
    // ----------------------------------------------------------

    cacheBackground(themeKey) {
        const theme = THEMES[themeKey] || THEMES.ruins;
        this._currentTheme = themeKey;

        const offscreen = document.createElement('canvas');
        offscreen.width = this._width;
        offscreen.height = this._height;
        const ctx = offscreen.getContext('2d');

        this._drawRoomBackground(ctx, theme);
        this._bgCache = offscreen;
    }

    _drawRoomBackground(ctx, theme) {
        const w = this._width;
        const h = this._height;
        const vpX = this._vpX;
        const vpY = this._vpY;

        // Ceiling
        ctx.fillStyle = theme.ceiling;
        ctx.fillRect(0, 0, w, h);

        // Floor (perspective trapezoid)
        const floorY = vpY + 80;
        const grad = ctx.createLinearGradient(0, floorY, 0, h);
        grad.addColorStop(0, this._darken(theme.floor, 0.6));
        grad.addColorStop(1, theme.floor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.lineTo(vpX + 200, floorY);
        ctx.lineTo(vpX - 200, floorY);
        ctx.closePath();
        ctx.fill();

        // Floor perspective lines
        ctx.strokeStyle = this._lighten(theme.floor, 0.1);
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const x = (w / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, h);
            ctx.lineTo(vpX, vpY + 80);
            ctx.stroke();
        }
        // Horizontal floor lines
        for (let i = 1; i <= 5; i++) {
            const t = i / 5;
            const y = floorY + (h - floorY) * t;
            const leftX = vpX - 200 + (0 - (vpX - 200)) * t;
            const rightX = vpX + 200 + (w - (vpX + 200)) * t;
            ctx.beginPath();
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.stroke();
        }

        // Left wall
        const wallGrad = ctx.createLinearGradient(0, 0, vpX - 200, 0);
        wallGrad.addColorStop(0, theme.wall);
        wallGrad.addColorStop(1, this._darken(theme.wall, 0.7));
        ctx.fillStyle = wallGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(vpX - 200, vpY);
        ctx.lineTo(vpX - 200, floorY);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Right wall
        const wallGrad2 = ctx.createLinearGradient(w, 0, vpX + 200, 0);
        wallGrad2.addColorStop(0, theme.wall);
        wallGrad2.addColorStop(1, this._darken(theme.wall, 0.7));
        ctx.fillStyle = wallGrad2;
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(vpX + 200, vpY);
        ctx.lineTo(vpX + 200, floorY);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Wall edges
        ctx.strokeStyle = this._lighten(theme.wall, 0.15);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vpX - 200, vpY);
        ctx.lineTo(vpX - 200, floorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(vpX + 200, vpY);
        ctx.lineTo(vpX + 200, floorY);
        ctx.stroke();

        // Back wall
        const backGrad = ctx.createLinearGradient(vpX - 200, vpY, vpX + 200, vpY);
        backGrad.addColorStop(0, this._darken(theme.wall, 0.5));
        backGrad.addColorStop(0.5, this._darken(theme.wall, 0.4));
        backGrad.addColorStop(1, this._darken(theme.wall, 0.5));
        ctx.fillStyle = backGrad;
        ctx.fillRect(vpX - 200, vpY, 400, floorY - vpY);

        // Decorations
        this._drawDecorations(ctx, theme);
    }

    _drawDecorations(ctx, theme) {
        const vpX = this._vpX;
        const vpY = this._vpY;

        // Torches on left and right walls
        this._drawTorch(ctx, vpX - 180, vpY + 40, theme.accent);
        this._drawTorch(ctx, vpX + 180, vpY + 40, theme.accent);

        // Back wall detail — archway or banner
        ctx.strokeStyle = theme.decor;
        ctx.lineWidth = 3;
        // Arch on back wall
        ctx.beginPath();
        ctx.arc(vpX, vpY + 40, 60, Math.PI, 0);
        ctx.lineTo(vpX + 60, vpY + 80);
        ctx.lineTo(vpX - 60, vpY + 80);
        ctx.closePath();
        ctx.stroke();

        // Small accent marks on walls
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
            const y = vpY + 20 + i * 25;
            ctx.fillRect(vpX - 195, y, 8, 3);
            ctx.fillRect(vpX + 187, y, 8, 3);
        }
        ctx.globalAlpha = 1;
    }

    _drawTorch(ctx, x, y, color) {
        // Bracket
        ctx.fillStyle = '#555';
        ctx.fillRect(x - 2, y, 4, 20);
        // Flame
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ----------------------------------------------------------
    // Monster Sprite Caching
    // ----------------------------------------------------------

    cacheMonsterSprites() {
        const types = ['gremlin', 'brute', 'shifter', 'mage', 'swarm', 'knight', 'phantom'];
        const states = ['idle', 'hit'];
        this._spriteCache = {};

        for (const type of types) {
            for (const state of states) {
                const key = `${type}_${state}`;
                const size = 64; // base sprite size
                const offscreen = document.createElement('canvas');
                offscreen.width = size;
                offscreen.height = size;
                const ctx = offscreen.getContext('2d');

                if (state === 'hit') {
                    // White flash overlay
                    this._drawMonsterBase(ctx, type, size);
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.fillRect(0, 0, size, size);
                    ctx.globalCompositeOperation = 'source-over';
                } else {
                    this._drawMonsterBase(ctx, type, size);
                }

                this._spriteCache[key] = offscreen;
            }
        }
    }

    _drawMonsterBase(ctx, type, size) {
        const cx = size / 2;
        const cy = size / 2;

        switch (type) {
            case 'gremlin':
                this._drawGremlin(ctx, cx, cy, size);
                break;
            case 'brute':
                this._drawBrute(ctx, cx, cy, size);
                break;
            case 'shifter':
                this._drawShifter(ctx, cx, cy, size);
                break;
            case 'mage':
                this._drawMage(ctx, cx, cy, size);
                break;
            case 'swarm':
                this._drawSwarm(ctx, cx, cy, size);
                break;
            case 'knight':
                this._drawKnight(ctx, cx, cy, size);
                break;
            case 'phantom':
                this._drawPhantom(ctx, cx, cy, size);
                break;
        }
    }

    // --- Individual Monster Drawings ---

    _drawGremlin(ctx, cx, cy, s) {
        // Small green imp
        ctx.fillStyle = '#2ECC71';
        // Body
        ctx.fillRect(cx - 10, cy - 5, 20, 22);
        // Head
        ctx.beginPath();
        ctx.arc(cx, cy - 12, 12, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - 7, cy - 16, 4, 4);
        ctx.fillRect(cx + 3, cy - 16, 4, 4);
        // Ears (pointed)
        ctx.fillStyle = '#2ECC71';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 16);
        ctx.lineTo(cx - 18, cy - 28);
        ctx.lineTo(cx - 6, cy - 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy - 16);
        ctx.lineTo(cx + 18, cy - 28);
        ctx.lineTo(cx + 6, cy - 20);
        ctx.fill();
        // Glitch effect — static lines
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(cx - 10, cy - 3, 20, 2);
        ctx.fillRect(cx - 8, cy + 8, 16, 1);
    }

    _drawBrute(ctx, cx, cy, s) {
        // Large red hulking figure
        ctx.fillStyle = '#C0392B';
        // Body (wider)
        ctx.fillRect(cx - 18, cy - 8, 36, 30);
        // Head
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 14, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - 8, cy - 18, 5, 5);
        ctx.fillRect(cx + 3, cy - 18, 5, 5);
        // Pulsing veins
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy);
        ctx.lineTo(cx - 10, cy - 4);
        ctx.lineTo(cx - 5, cy + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 16, cy);
        ctx.lineTo(cx + 10, cy - 4);
        ctx.lineTo(cx + 5, cy + 2);
        ctx.stroke();
        // Arms
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(cx - 24, cy - 4, 8, 20);
        ctx.fillRect(cx + 16, cy - 4, 8, 20);
    }

    _drawShifter(ctx, cx, cy, s) {
        // Purple cloaked figure
        ctx.fillStyle = '#8E44AD';
        // Cloak body (triangle)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.lineTo(cx - 18, cy + 20);
        ctx.lineTo(cx + 18, cy + 20);
        ctx.closePath();
        ctx.fill();
        // Hood
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 12, Math.PI, 0);
        ctx.fill();
        // Face — shifting, simple oval
        ctx.fillStyle = '#D2B4DE';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 12, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Question mark on face (recall monster)
        ctx.fillStyle = '#4A235A';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy - 11);
    }

    _drawMage(ctx, cx, cy, s) {
        // Dark robed figure with glowing staff
        ctx.fillStyle = '#2C3E50';
        // Robe
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx - 14, cy + 20);
        ctx.lineTo(cx + 14, cy + 20);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = '#34495E';
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 10, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(cx - 5, cy - 18, 3, 3);
        ctx.fillRect(cx + 2, cy - 18, 3, 3);
        // Staff
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + 16, cy - 24);
        ctx.lineTo(cx + 16, cy + 18);
        ctx.stroke();
        // Staff orb
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.arc(cx + 16, cy - 26, 5, 0, Math.PI * 2);
        ctx.fill();
        // Orb glow
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(cx + 16, cy - 26, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSwarm(ctx, cx, cy, s) {
        // Cluster of small blue worms
        const wormColor = '#3498DB';
        const positions = [
            [cx - 12, cy - 8], [cx + 8, cy - 10], [cx - 4, cy + 2],
            [cx + 12, cy], [cx - 8, cy + 12], [cx + 4, cy + 10],
            [cx, cy - 4], [cx + 14, cy + 12]
        ];
        for (const [wx, wy] of positions) {
            ctx.fillStyle = wormColor;
            ctx.beginPath();
            ctx.ellipse(wx, wy, 4, 2, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            // Tiny eye
            ctx.fillStyle = '#fff';
            ctx.fillRect(wx + 2, wy - 1, 2, 2);
        }
    }

    _drawKnight(ctx, cx, cy, s) {
        // Armored black knight with shield
        ctx.fillStyle = '#2C3E50';
        // Body armor
        ctx.fillRect(cx - 14, cy - 8, 28, 28);
        // Helmet
        ctx.fillStyle = '#1C2833';
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 12, 0, Math.PI * 2);
        ctx.fill();
        // Visor slit
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - 8, cy - 16, 16, 3);
        // Shield
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy - 6);
        ctx.lineTo(cx - 22, cy + 12);
        ctx.lineTo(cx - 14, cy + 18);
        ctx.lineTo(cx - 14, cy - 6);
        ctx.closePath();
        ctx.fill();
        // Shield glow
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Sword
        ctx.strokeStyle = '#BDC3C7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + 16, cy - 20);
        ctx.lineTo(cx + 16, cy + 14);
        ctx.stroke();
        // Sword guard
        ctx.strokeStyle = '#F1C40F';
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy - 6);
        ctx.lineTo(cx + 22, cy - 6);
        ctx.stroke();
    }

    _drawPhantom(ctx, cx, cy, s) {
        // Ghostly translucent figure
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#D5F5E3';
        // Wispy body
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy + 20);
        ctx.quadraticCurveTo(cx - 18, cy, cx - 10, cy - 16);
        ctx.quadraticCurveTo(cx, cy - 26, cx + 10, cy - 16);
        ctx.quadraticCurveTo(cx + 18, cy, cx + 14, cy + 20);
        // Wavy bottom
        ctx.quadraticCurveTo(cx + 8, cy + 14, cx, cy + 20);
        ctx.quadraticCurveTo(cx - 8, cy + 14, cx - 14, cy + 20);
        ctx.fill();
        // Eyes
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#1A5276';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5, cy - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        // Fake text hint (deceptive)
        ctx.fillStyle = '#E74C3C';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FAKE', cx, cy + 6);
        ctx.globalAlpha = 1;
    }

    // ----------------------------------------------------------
    // Draw Monster at Depth (using cached sprites)
    // ----------------------------------------------------------

    drawMonster(monster, time) {
        const ctx = this._ctx;
        const { type, depth, state } = monster;
        const cacheKey = `${type}_${
            (state === 'dying' || state === 'hit') ? 'hit' :
            (state === 'advancing' || state === 'spawning') ? 'idle' :
            state
        }`;
        const sprite = this._spriteCache[cacheKey];
        if (!sprite) return;

        // Depth → position and scale
        const scale = 0.3 + depth * 0.7;
        const posX = this._vpX + (monster.offsetX || 0) * scale;
        const floorY = this._vpY + 80;
        const posY = floorY + (this._height - floorY) * depth * 0.8;

        // Idle bob
        let bobY = 0;
        if (state === 'idle' || state === 'moving') {
            bobY = Math.sin(time * 3 + depth * 5) * 3 * scale;
        }

        const drawW = sprite.width * scale;
        const drawH = sprite.height * scale;
        const x = posX - drawW / 2;
        const y = posY - drawH + bobY;

        // Dying: per-type death animation
        if (state === 'dying') {
            const dp = monster.deathProgress || 0;
            this._drawDeathAnimation(ctx, type, dp, posX, posY, drawW, drawH, sprite, scale);
            return;
        }

        // Target reticle
        if (monster.targeted) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            const rSize = drawW * 0.7;
            ctx.beginPath();
            ctx.arc(posX, y + drawH / 2, rSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.drawImage(sprite, x, y, drawW, drawH);
    }

    // ----------------------------------------------------------
    // Per-Type Death Animations
    // ----------------------------------------------------------

    _drawDeathAnimation(ctx, type, dp, cx, cy, w, h, sprite, scale) {
        ctx.save();
        switch (type) {
            case 'gremlin':
                this._deathGremlin(ctx, dp, cx, cy, w, h, sprite);
                break;
            case 'brute':
                this._deathBrute(ctx, dp, cx, cy, w, h, sprite);
                break;
            case 'shifter':
                this._deathShifter(ctx, dp, cx, cy, w, h, sprite);
                break;
            case 'mage':
                this._deathMage(ctx, dp, cx, cy, w, h, sprite, scale);
                break;
            case 'swarm':
                this._deathSwarm(ctx, dp, cx, cy, w, h, sprite);
                break;
            case 'knight':
                this._deathKnight(ctx, dp, cx, cy, w, h, sprite);
                break;
            case 'phantom':
                this._deathPhantom(ctx, dp, cx, cy, w, h, sprite, scale);
                break;
            default: {
                // Generic fallback fade
                ctx.globalAlpha = 1 - dp;
                const ds = 1 + dp * 0.3;
                ctx.drawImage(sprite, cx - w * ds / 2, cy - h * ds, w * ds, h * ds);
            }
        }
        ctx.restore();
    }

    // Gremlin: pixelates into 8x8 blocks that scatter outward
    _deathGremlin(ctx, dp, cx, cy, w, h, sprite) {
        const blockSize = 8;
        const cols = Math.ceil(w / blockSize);
        const rows = Math.ceil(h / blockSize);
        const sx = cx - w / 2;
        const sy = cy - h;

        ctx.globalAlpha = 1 - dp;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const bx = sx + c * blockSize;
                const by = sy + r * blockSize;
                // Scatter outward from center
                const dx = (bx + blockSize / 2 - cx) * dp * 2;
                const dy = (by + blockSize / 2 - (cy - h / 2)) * dp * 2;
                ctx.drawImage(sprite,
                    c * blockSize * (sprite.width / w), r * blockSize * (sprite.height / h),
                    blockSize * (sprite.width / w), blockSize * (sprite.height / h),
                    bx + dx, by + dy, blockSize, blockSize
                );
            }
        }
    }

    // Brute: crack lines, body splits into 3 pieces falling down
    _deathBrute(ctx, dp, cx, cy, w, h, sprite) {
        const sx = cx - w / 2;
        const sy = cy - h;
        const thirdW = w / 3;

        // Draw crack lines first
        if (dp < 0.5) {
            ctx.globalAlpha = 1;
            ctx.drawImage(sprite, sx, sy, w, h);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = dp * 2;
            // Vertical cracks
            ctx.beginPath();
            ctx.moveTo(cx - thirdW / 2, sy);
            ctx.lineTo(cx - thirdW / 2 + dp * 4, sy + h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + thirdW / 2, sy);
            ctx.lineTo(cx + thirdW / 2 - dp * 4, sy + h);
            ctx.stroke();
        } else {
            const fall = (dp - 0.5) * 2; // 0→1 in second half
            ctx.globalAlpha = 1 - fall;
            // Left piece — falls left + down
            ctx.drawImage(sprite, 0, 0, sprite.width / 3, sprite.height,
                sx - fall * 20, sy + fall * 40, thirdW, h);
            // Center piece — falls straight down
            ctx.drawImage(sprite, sprite.width / 3, 0, sprite.width / 3, sprite.height,
                sx + thirdW, sy + fall * 60, thirdW, h);
            // Right piece — falls right + down
            ctx.drawImage(sprite, sprite.width * 2 / 3, 0, sprite.width / 3, sprite.height,
                sx + thirdW * 2 + fall * 20, sy + fall * 40, thirdW, h);
        }
    }

    // Shifter: dissolves into rising purple smoke
    _deathShifter(ctx, dp, cx, cy, w, h, sprite) {
        ctx.globalAlpha = 1 - dp;
        ctx.drawImage(sprite, cx - w / 2, cy - h, w, h);
        // Rising purple smoke particles
        if (dp > 0.1) {
            const smokeAlpha = Math.min(1, dp * 1.5) * (1 - dp);
            ctx.globalAlpha = smokeAlpha;
            ctx.fillStyle = '#8E44AD';
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + dp * 3;
                const dist = dp * 30;
                const px = cx + Math.cos(angle) * dist;
                const py = cy - h / 2 - dp * 40 + Math.sin(angle) * dist * 0.5;
                const size = 4 + dp * 6;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Mage: implodes to center, energy burst ring expands
    _deathMage(ctx, dp, cx, cy, w, h, sprite, scale) {
        const centerY = cy - h / 2;
        if (dp < 0.5) {
            // Implode — scale down to center
            const shrink = 1 - dp * 1.6;
            const sw = w * shrink;
            const sh = h * shrink;
            ctx.globalAlpha = 1;
            ctx.drawImage(sprite, cx - sw / 2, centerY - sh / 2, sw, sh);
        } else {
            // Energy burst ring
            const ringProgress = (dp - 0.5) * 2;
            ctx.globalAlpha = 1 - ringProgress;
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, centerY, ringProgress * 50 * scale, 0, Math.PI * 2);
            ctx.stroke();
            // Inner bright flash
            ctx.fillStyle = '#00E5FF';
            ctx.globalAlpha = (1 - ringProgress) * 0.5;
            ctx.beginPath();
            ctx.arc(cx, centerY, (1 - ringProgress) * 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Swarm: each worm pops staggered with small bursts
    _deathSwarm(ctx, dp, cx, cy, w, h, sprite) {
        const wormCount = 8;
        for (let i = 0; i < wormCount; i++) {
            const stagger = i / wormCount * 0.6;
            const localDp = Math.max(0, Math.min(1, (dp - stagger) / 0.4));
            if (localDp >= 1) continue; // fully dead

            const angle = (i / wormCount) * Math.PI * 2;
            const dist = 12;
            const wx = cx + Math.cos(angle) * dist - w / 2;
            const wy = cy - h / 2 + Math.sin(angle) * dist - h / 2;

            if (localDp > 0) {
                // Pop burst
                ctx.globalAlpha = 1 - localDp;
                ctx.fillStyle = '#3498DB';
                const burstSize = 3 + localDp * 8;
                ctx.beginPath();
                ctx.arc(wx + w / 2, wy + h / 2, burstSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Still alive — draw from sprite section
                ctx.globalAlpha = 1;
                ctx.drawImage(sprite, cx - w / 2, cy - h, w, h);
                break; // sprite has all worms, draw once
            }
        }
    }

    // Knight: 4 armor plates fly off in cardinal directions
    _deathKnight(ctx, dp, cx, cy, w, h, sprite) {
        const centerY = cy - h / 2;
        if (dp < 0.3) {
            // Brief shake (deterministic jitter)
            ctx.globalAlpha = 1;
            const jx = Math.sin(dp * 40) * 4 * (1 - dp / 0.3);
            ctx.drawImage(sprite, cx - w / 2 + jx, cy - h, w, h);
        } else {
            const flyProgress = (dp - 0.3) / 0.7;
            ctx.globalAlpha = 1 - flyProgress;
            // Figure fades in center
            ctx.drawImage(sprite, cx - w / 2, cy - h, w, h);
            // 4 armor plate rectangles fly off
            ctx.fillStyle = '#2C3E50';
            const dist = flyProgress * 40;
            const plateW = w * 0.3;
            const plateH = h * 0.25;
            // Up
            ctx.fillRect(cx - plateW / 2, centerY - dist - plateH / 2, plateW, plateH);
            // Down
            ctx.fillRect(cx - plateW / 2, centerY + dist - plateH / 2, plateW, plateH);
            // Left
            ctx.fillRect(cx - dist - plateW / 2, centerY - plateH / 2, plateW, plateH);
            // Right
            ctx.fillRect(cx + dist - plateW / 2, centerY - plateH / 2, plateW, plateH);
        }
    }

    // Phantom: skeleton briefly revealed, then dust particles
    _deathPhantom(ctx, dp, cx, cy, w, h, sprite, scale) {
        const centerY = cy - h / 2;
        if (dp < 0.4) {
            // Reveal skeleton (simple line drawing)
            ctx.globalAlpha = 1 - dp * 0.5;
            ctx.drawImage(sprite, cx - w / 2, cy - h, w, h);
            ctx.globalAlpha = dp / 0.4;
            ctx.strokeStyle = '#BDC3C7';
            ctx.lineWidth = 1.5;
            // Spine
            ctx.beginPath();
            ctx.moveTo(cx, centerY - h * 0.3);
            ctx.lineTo(cx, centerY + h * 0.3);
            ctx.stroke();
            // Ribs
            for (let i = 0; i < 3; i++) {
                const ry = centerY - h * 0.1 + i * h * 0.12;
                ctx.beginPath();
                ctx.moveTo(cx - 8 * scale, ry);
                ctx.lineTo(cx + 8 * scale, ry);
                ctx.stroke();
            }
            // Skull circle
            ctx.beginPath();
            ctx.arc(cx, centerY - h * 0.35, 6 * scale, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Dust particles scatter
            const dustProgress = (dp - 0.4) / 0.6;
            ctx.globalAlpha = 1 - dustProgress;
            ctx.fillStyle = '#D5F5E3';
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const dist = dustProgress * 35;
                const px = cx + Math.cos(angle) * dist;
                const py = centerY + Math.sin(angle) * dist;
                ctx.fillRect(px - 2, py - 2, 4, 4);
            }
        }
    }

    // ----------------------------------------------------------
    // Weapon Sprite
    // ----------------------------------------------------------

    drawWeapon(weaponId, state, time, switchProgress) {
        const ctx = this._ctx;
        const w = this._width;
        const h = this._height;

        // Weapon base position: bottom center
        const baseX = w / 2;
        const baseY = h - 20;

        // Weapon switch animation — slide down/up
        let switchOffsetY = 0;
        if (switchProgress !== undefined && switchProgress >= 0) {
            if (switchProgress < 0.5) {
                // First half: weapon drops down
                switchOffsetY = switchProgress * 2 * 120;
            } else {
                // Second half: new weapon rises up
                switchOffsetY = (1 - (switchProgress - 0.5) * 2) * 120;
            }
        }

        // Per-weapon idle animation
        let idleBobY = 0;
        let idleBobX = 0;
        let idleRotation = 0;
        if (state === 'idle') {
            switch (weaponId) {
                case 1: // Pistol — left-right sway
                    idleBobX = Math.sin(time * 1.5) * 3;
                    idleBobY = Math.sin(time * 2) * 2;
                    break;
                case 2: // Blaster — slight barrel rotation
                    idleBobY = Math.sin(time * 2) * 2;
                    idleRotation = Math.sin(time) * 0.05;
                    break;
                case 3: // Rifle — steady with subtle bob
                    idleBobY = Math.sin(time * 1.8) * 2;
                    break;
                case 4: // Cannon — heavy bob
                    idleBobY = Math.sin(time * 1.5) * 4;
                    break;
                case 5: // Lightning — jittery
                    idleBobY = Math.sin(time * 3) * 2;
                    idleBobX = Math.cos(time * 4) * 1.5;
                    break;
                case 6: // Frost — smooth wave
                    idleBobY = Math.sin(time * 1.8) * 3;
                    break;
                case 7: // Fire — flickering
                    idleBobY = Math.sin(time * 2.5) * 2 + Math.sin(time * 5) * 1;
                    break;
                case 8: // Disruptor — slow wobble
                    idleBobY = Math.sin(time * 1.5) * 3;
                    idleRotation = Math.sin(time * 0.8) * 0.03;
                    break;
                case 9: // Gravity — floating feel
                    idleBobY = Math.sin(time * 1.2) * 4;
                    break;
                case 10: // MEGA — pulsing
                    idleBobY = Math.sin(time * 2) * 3;
                    break;
                default:
                    idleBobY = Math.sin(time * 2) * 3;
            }
        }

        // Recoil
        let recoilY = 0;
        let recoilX = 0;
        if (state === 'firing') {
            recoilY = -15;
        } else if (state === 'flinch') {
            recoilX = 5;
            recoilY = 5;
        }

        const x = baseX + recoilX + idleBobX;
        const y = baseY + idleBobY + recoilY + switchOffsetY;

        const weapon = this._getWeaponDesign(weaponId);

        ctx.save();
        ctx.translate(x, y);
        if (idleRotation) ctx.rotate(idleRotation);

        // Draw weapon body
        ctx.fillStyle = weapon.color;
        ctx.fillRect(-weapon.width / 2, -weapon.height, weapon.width, weapon.height);

        // Barrel
        ctx.fillStyle = weapon.barrelColor;
        ctx.fillRect(-weapon.barrelW / 2, -weapon.height - weapon.barrelH, weapon.barrelW, weapon.barrelH);

        // Accent detail
        ctx.fillStyle = weapon.accent;
        ctx.fillRect(-weapon.width / 2 + 2, -weapon.height + 4, weapon.width - 4, 4);

        // Per-weapon idle effects at barrel tip
        const barrelTipY = -weapon.height - weapon.barrelH;
        if (state === 'idle') {
            this._drawWeaponIdleEffect(ctx, weaponId, time, weapon, barrelTipY);
        }

        // Muzzle flash during firing
        if (state === 'firing') {
            ctx.fillStyle = weapon.muzzleColor;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, barrelTipY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    _drawWeaponIdleEffect(ctx, weaponId, time, weapon, barrelTipY) {
        switch (weaponId) {
            case 3: { // Rifle — scope glint every 3s
                const glintPhase = (time % 3) / 3;
                if (glintPhase < 0.05) {
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 1 - glintPhase / 0.05;
                    ctx.fillRect(-1, barrelTipY - 2, 2, 2);
                    ctx.globalAlpha = 1;
                }
                break;
            }
            case 4: { // Cannon — glow pulse at muzzle
                const glowAlpha = 0.2 + Math.sin(time * 2) * 0.15;
                ctx.fillStyle = weapon.muzzleColor;
                ctx.globalAlpha = glowAlpha;
                ctx.beginPath();
                ctx.arc(0, barrelTipY, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 5: { // Lightning — occasional spark
                if (Math.sin(time * 7) > 0.9) {
                    ctx.strokeStyle = '#82B1FF';
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(0, barrelTipY);
                    ctx.lineTo((Math.random() - 0.5) * 10, barrelTipY - 5 - Math.random() * 5);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
                break;
            }
            case 6: { // Frost — small blue crystal that grows/shrinks
                const crystalSize = 2 + Math.sin(time * 2) * 1.5;
                ctx.fillStyle = '#80DEEA';
                ctx.globalAlpha = 0.6;
                ctx.fillRect(-crystalSize / 2, barrelTipY - crystalSize, crystalSize, crystalSize);
                ctx.globalAlpha = 1;
                break;
            }
            case 7: { // Fire — flame flicker at tip
                ctx.fillStyle = '#FF6E40';
                ctx.globalAlpha = 0.7;
                const fx = (Math.sin(time * 8) * 2);
                const fy = barrelTipY - 2 + Math.sin(time * 6) * 2;
                ctx.beginPath();
                ctx.arc(fx, fy, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 8: { // Disruptor — thin purple arc that oscillates
                ctx.strokeStyle = '#CE93D8';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.3;
                ctx.beginPath();
                ctx.arc(0, barrelTipY, 6, Math.sin(time * 2), Math.sin(time * 2) + Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;
            }
            case 9: { // Gravity — 2 orbiting debris squares
                for (let i = 0; i < 2; i++) {
                    const angle = time * 3 + i * Math.PI;
                    const ox = Math.cos(angle) * 8;
                    const oy = barrelTipY + Math.sin(angle) * 4;
                    ctx.fillStyle = '#78909C';
                    ctx.globalAlpha = 0.7;
                    ctx.fillRect(ox - 1.5, oy - 1.5, 3, 3);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 10: { // MEGA — rainbow cycling glow
                const hue = (time * 60) % 360;
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(0, barrelTipY, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
        }
    }

    _getWeaponDesign(id) {
        const weapons = [
            { color: '#42A5F5', barrelColor: '#1E88E5', accent: '#90CAF9', muzzleColor: '#64B5F6', width: 24, height: 40, barrelW: 8, barrelH: 16 },  // Pixel Pistol
            { color: '#66BB6A', barrelColor: '#43A047', accent: '#A5D6A7', muzzleColor: '#81C784', width: 32, height: 36, barrelW: 14, barrelH: 14 }, // Data Blaster
            { color: '#EF5350', barrelColor: '#E53935', accent: '#EF9A9A', muzzleColor: '#FF8A80', width: 20, height: 48, barrelW: 6, barrelH: 22 },  // Byte Rifle
            { color: '#FFA726', barrelColor: '#FB8C00', accent: '#FFE0B2', muzzleColor: '#FFCC80', width: 30, height: 38, barrelW: 12, barrelH: 16 }, // Plasma Cannon
            { color: '#E0E0E0', barrelColor: '#9E9E9E', accent: '#64B5F6', muzzleColor: '#82B1FF', width: 22, height: 44, barrelW: 8, barrelH: 20 },  // Lightning Rod
            { color: '#4DD0E1', barrelColor: '#00ACC1', accent: '#B2EBF2', muzzleColor: '#80DEEA', width: 26, height: 42, barrelW: 10, barrelH: 18 }, // Frost Ray
            { color: '#FF7043', barrelColor: '#F4511E', accent: '#FFAB91', muzzleColor: '#FF8A65', width: 28, height: 40, barrelW: 12, barrelH: 16 }, // Fire Launcher
            { color: '#AB47BC', barrelColor: '#8E24AA', accent: '#CE93D8', muzzleColor: '#BA68C8', width: 24, height: 46, barrelW: 10, barrelH: 20 }, // Quantum Disruptor
            { color: '#546E7A', barrelColor: '#37474F', accent: '#78909C', muzzleColor: '#90A4AE', width: 30, height: 44, barrelW: 14, barrelH: 18 }, // Gravity Gun
            { color: '#FFD54F', barrelColor: '#FFC107', accent: '#FFF176', muzzleColor: '#FFE57F', width: 34, height: 42, barrelW: 16, barrelH: 16 }, // MEGA Cannon
        ];
        return weapons[(id - 1) % weapons.length];
    }

    // ----------------------------------------------------------
    // Projectile Rendering
    // ----------------------------------------------------------

    drawProjectile(weaponId, startX, startY, targetX, targetY, progress) {
        const ctx = this._ctx;
        const weapon = this._getWeaponDesign(weaponId);

        // Draw trailing copies (3-4 fading copies at previous positions)
        for (let i = 3; i >= 1; i--) {
            const trailProgress = progress - i * 0.04;
            if (trailProgress < 0.14) continue; // not yet traveling
            const trailAlpha = 0.3 - i * 0.07;
            if (trailAlpha <= 0) continue;
            const tx = startX + (targetX - startX) * trailProgress;
            const ty = startY + (targetY - startY) * trailProgress;
            const ts = 1 - trailProgress * 0.5;
            ctx.globalAlpha = trailAlpha;
            ctx.fillStyle = weapon.muzzleColor;
            ctx.beginPath();
            ctx.arc(tx, ty, 4 * ts, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Interpolate position
        const x = startX + (targetX - startX) * progress;
        const y = startY + (targetY - startY) * progress;

        // Scale down as it travels away
        const scale = 1 - progress * 0.5;

        ctx.fillStyle = weapon.muzzleColor;
        ctx.globalAlpha = 1 - progress * 0.3;

        switch (weaponId) {
            case 1: // Pixel Pistol — small bolt
                ctx.fillRect(x - 3 * scale, y - 3 * scale, 6 * scale, 6 * scale);
                break;
            case 2: // Data Blaster — 3 bolts spread
                for (let i = -1; i <= 1; i++) {
                    ctx.fillRect(x + i * 8 * scale - 2, y - 2, 4 * scale, 4 * scale);
                }
                break;
            case 3: // Byte Rifle — thin beam
                ctx.strokeStyle = weapon.muzzleColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;
            case 4: // Plasma Cannon — glowing orb
                ctx.beginPath();
                ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(x, y, 14 * scale, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 5: { // Lightning Rod — jagged line (deterministic jitter)
                ctx.strokeStyle = '#82B1FF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                const segments = 6;
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments * progress;
                    const seed = i * 73.7;
                    const lx = startX + (targetX - startX) * t + Math.sin(seed) * 15;
                    const ly = startY + (targetY - startY) * t + Math.cos(seed * 1.3) * 8;
                    ctx.lineTo(lx, ly);
                }
                ctx.stroke();
                break;
            }
            case 6: // Frost Ray — ice beam
                ctx.strokeStyle = '#80DEEA';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                // Ice crystals (deterministic positions)
                ctx.fillStyle = '#B2EBF2';
                for (let i = 0; i < 3; i++) {
                    const seed = i * 47.3 + progress * 10;
                    const cx = x + Math.sin(seed) * 6;
                    const cy = y + Math.cos(seed * 1.5) * 6;
                    ctx.fillRect(cx - 2, cy - 2, 4, 4);
                }
                break;
            case 7: // Fire Launcher — fireball
                ctx.fillStyle = '#FF6E40';
                ctx.beginPath();
                ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFAB40';
                ctx.beginPath();
                ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 8: // Quantum Disruptor — vortex
                ctx.strokeStyle = '#CE93D8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, 5 * scale, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 9: // Gravity Gun — distortion ripple
                ctx.strokeStyle = 'rgba(144,164,174,0.5)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 10: // MEGA Cannon — rainbow beam
                const colors = ['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];
                for (let i = 0; i < colors.length; i++) {
                    ctx.strokeStyle = colors[i];
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY + i * 2 - 5);
                    ctx.lineTo(x, y + i * 2 - 5);
                    ctx.stroke();
                }
                break;
            default:
                ctx.fillRect(x - 3, y - 3, 6, 6);
        }

        ctx.globalAlpha = 1;
    }

    // ----------------------------------------------------------
    // Impact Effects
    // ----------------------------------------------------------

    spawnImpact(x, y, weaponId) {
        const weapon = this._getWeaponDesign(weaponId);
        this.particles.emit(x, y, 8, weapon.muzzleColor, 3, 3);
    }

    spawnMiss() {
        // Red scatter particles at a random location to indicate a miss
        const x = this._width * (0.2 + Math.random() * 0.6);
        const y = this._height * (0.2 + Math.random() * 0.4);
        this.particles.emit(x, y, 5, '#E74C3C', 2, 2);
    }

    spawnDeathEffect(x, y, monsterType) {
        const colors = {
            gremlin: '#2ECC71',
            brute: '#C0392B',
            shifter: '#8E44AD',
            mage: '#00E5FF',
            swarm: '#3498DB',
            knight: '#BDC3C7',
            phantom: '#D5F5E3'
        };
        this.particles.emit(x, y, 15, colors[monsterType] || '#fff', 4, 4);
    }

    // ----------------------------------------------------------
    // Main Render Pipeline
    // ----------------------------------------------------------

    render(gameState, time) {
        const ctx = this._ctx;

        // 1. Clear
        ctx.clearRect(0, 0, this._width, this._height);

        // 2. Background
        if (this._bgCache) {
            ctx.drawImage(this._bgCache, 0, 0);
        }

        // 3. Sort monsters by depth (back to front) and draw
        if (gameState.monsters) {
            const sorted = gameState.monsters.slice().sort((a, b) => a.depth - b.depth);
            for (const monster of sorted) {
                this.drawMonster(monster, time);
            }
        }

        // 4. Projectiles
        if (gameState.projectiles) {
            for (const proj of gameState.projectiles) {
                this.drawProjectile(
                    proj.weaponId,
                    proj.startX, proj.startY,
                    proj.targetX, proj.targetY,
                    proj.progress
                );
            }
        }

        // 5. Particles
        this.particles.draw(ctx);

        // 5b. Floating texts
        this.drawFloatingTexts(ctx);

        // 6. Weapon
        this.drawWeapon(
            gameState.weaponId || 1,
            gameState.weaponState || 'idle',
            time,
            gameState.switchProgress
        );
    }

    // ----------------------------------------------------------
    // Screen Shake (game-loop-driven, no independent timers)
    // ----------------------------------------------------------

    startShake(intensity, durationMs) {
        this._shakeIntensity = intensity;
        this._shakeDuration = durationMs / 1000;
        this._shakeElapsed = 0;
    }

    updateShake(dt) {
        if (this._shakeIntensity <= 0) return;
        this._shakeElapsed += dt;
        if (this._shakeElapsed >= this._shakeDuration) {
            this._shakeIntensity = 0;
            this._shakeOffsetX = 0;
            this._shakeOffsetY = 0;
            return;
        }
        const remaining = 1 - this._shakeElapsed / this._shakeDuration;
        const mag = this._shakeIntensity * remaining;
        this._shakeOffsetX = (Math.random() * 2 - 1) * mag;
        this._shakeOffsetY = (Math.random() * 2 - 1) * mag;
    }

    getShakeTransform() {
        if (this._shakeIntensity <= 0) return '';
        return `translate(${this._shakeOffsetX.toFixed(1)}px, ${this._shakeOffsetY.toFixed(1)}px)`;
    }

    // ----------------------------------------------------------
    // Floating Text System
    // ----------------------------------------------------------

    addFloatingText(text, x, y, color, fontSize) {
        if (this._floatingTexts.length >= 8) {
            this._floatingTexts.shift(); // recycle oldest
        }
        const fs = fontSize || 18;
        this._floatingTexts.push({
            text, x, y, color,
            fontSize: fs,
            fontStr: `bold ${fs}px OpenDyslexic, "Comic Sans MS", cursive`,
            life: 1.0,
            maxLife: 0.8,
            vy: -1.5
        });
    }

    updateFloatingTexts(dt) {
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingTexts[i];
            ft.y += ft.vy * dt * 60;
            ft.life -= dt / ft.maxLife;
            if (ft.life <= 0) {
                this._floatingTexts.splice(i, 1);
            }
        }
    }

    drawFloatingTexts(ctx) {
        for (const ft of this._floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.life);
            ctx.font = ft.fontStr;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Shadow for readability
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // ----------------------------------------------------------
    // Resize
    // ----------------------------------------------------------

    resize() {
        const parent = this._canvas.parentElement;
        if (!parent) return;
        const maxW = Math.min(parent.clientWidth, 800);
        const ratio = this._height / this._width;
        this._canvas.style.width = maxW + 'px';
        this._canvas.style.height = (maxW * ratio) + 'px';
    }

    // ----------------------------------------------------------
    // Color Utilities
    // ----------------------------------------------------------

    _darken(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
    }

    _lighten(hex, amount) {
        const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.floor(255 * amount));
        const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.floor(255 * amount));
        const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}
