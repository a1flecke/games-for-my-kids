/**
 * parts.js — Body part procedural drawing functions.
 * Each function draws to a provided context with 3-4px thick outlines and rounded shapes.
 *
 * Drawing functions: drawPartType(ctx, w, h, color)
 * Covering renderer: fur, scales, feathers, smooth (applied via source-atop compositing)
 * Pattern renderer: solid, spots, stripes, gradient
 *
 * All coordinates are relative to the part's drawSize (w × h).
 * Callers provide the canvas context already sized to drawSize × scale × DPR.
 */

class PartsLibrary {
    constructor() {
        this._partData = null; // Loaded from data/parts.json
        this._drawFunctions = this._buildDrawTable();
    }

    /**
     * Load part catalog from data/parts.json.
     */
    async loadCatalog() {
        const resp = await fetch('data/parts.json');
        this._partData = await resp.json();
        return this._partData;
    }

    /**
     * Get all parts in a category.
     */
    getByCategory(category) {
        if (!this._partData) return [];
        return this._partData.filter(p => p.category === category);
    }

    /**
     * Get a specific part by ID.
     */
    getById(id) {
        if (!this._partData) return null;
        return this._partData.find(p => p.id === id) || null;
    }

    /**
     * Draw a part to a context at its drawSize dimensions.
     * The context should be pre-scaled if needed (DPR, creature scale).
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} partId — e.g. 'head-cat'
     * @param {number} w — draw width
     * @param {number} h — draw height
     * @param {string} color — fill color
     * @param {string} covering — 'fur', 'scales', 'feathers', 'smooth', or null
     * @param {string} pattern — 'solid', 'spots', 'stripes', 'gradient', or null
     * @param {string} patternColor — secondary color for patterns
     */
    drawPart(ctx, partId, w, h, color, covering, pattern, patternColor) {
        const drawFn = this._drawFunctions[partId];
        if (!drawFn) return;

        ctx.save();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2C2416';

        // Draw base shape filled with color
        ctx.fillStyle = color;
        drawFn(ctx, w, h, color);

        ctx.restore();

        // Apply covering texture via source-atop
        if (covering && covering !== 'smooth') {
            this._applyCovering(ctx, w, h, covering, color);
        }

        // Apply pattern via source-atop
        if (pattern && pattern !== 'solid') {
            this._applyPattern(ctx, w, h, pattern, color, patternColor);
        }
    }

    // ── Seeded PRNG (deterministic textures across re-caches) ──

    /**
     * Simple seeded PRNG (mulberry32). Same seed always produces
     * the same sequence, so fur/scale textures look identical
     * after LRU eviction and re-cache.
     */
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
     * Hash a string to a 32-bit integer for PRNG seeding.
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return hash;
    }

    // ── Covering Renderer ─────────────────────────────────

    /**
     * Apply covering texture via source-atop compositing.
     * Draws texture only where the part shape exists (opaque pixels).
     */
    _applyCovering(ctx, w, h, covering, color) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        switch (covering) {
            case 'fur':
                this._drawFurTexture(ctx, w, h, color);
                break;
            case 'scales':
                this._drawScalesTexture(ctx, w, h, color);
                break;
            case 'feathers':
                this._drawFeathersTexture(ctx, w, h, color);
                break;
        }

        ctx.restore();
    }

    /**
     * Fur: short random strokes along the surface.
     */
    _drawFurTexture(ctx, w, h, color) {
        const darker = this._adjustBrightness(color, -30);
        ctx.strokeStyle = darker;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // Seeded PRNG so texture is identical across re-caches
        const rng = this._seededRandom(this._hashString(color + 'fur'));

        const spacing = 8;
        for (let x = 2; x < w - 2; x += spacing) {
            for (let y = 2; y < h - 2; y += spacing) {
                const ox = (rng() - 0.5) * 4;
                const oy = (rng() - 0.5) * 4;
                const angle = rng() * Math.PI;
                const len = 3 + rng() * 4;
                ctx.beginPath();
                ctx.moveTo(x + ox, y + oy);
                ctx.lineTo(
                    x + ox + Math.cos(angle) * len,
                    y + oy + Math.sin(angle) * len
                );
                ctx.stroke();
            }
        }
    }

    /**
     * Scales: overlapping small arcs in a grid.
     */
    _drawScalesTexture(ctx, w, h, color) {
        const darker = this._adjustBrightness(color, -25);
        const lighter = this._adjustBrightness(color, 15);
        ctx.lineWidth = 0.8;

        const scaleW = 10;
        const scaleH = 8;
        for (let row = 0; row < h / scaleH + 1; row++) {
            const offset = (row % 2) * (scaleW / 2);
            for (let col = -1; col < w / scaleW + 1; col++) {
                const cx = col * scaleW + offset;
                const cy = row * scaleH;
                ctx.beginPath();
                ctx.arc(cx, cy, scaleW / 2, 0, Math.PI, false);
                ctx.fillStyle = lighter;
                ctx.fill();
                ctx.strokeStyle = darker;
                ctx.stroke();
            }
        }
    }

    /**
     * Feathers: layered soft ovals.
     */
    _drawFeathersTexture(ctx, w, h, color) {
        const lighter = this._adjustBrightness(color, 20);
        ctx.fillStyle = lighter;
        ctx.globalAlpha = 0.3;

        const featherW = 12;
        const featherH = 16;
        for (let row = 0; row < h / featherH + 1; row++) {
            const offset = (row % 2) * (featherW / 2);
            for (let col = -1; col < w / featherW + 1; col++) {
                const cx = col * featherW + offset + featherW / 2;
                const cy = row * featherH + featherH / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, featherW / 2, featherH / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
    }

    // ── Pattern Renderer ──────────────────────────────────

    /**
     * Apply pattern via source-atop compositing.
     */
    _applyPattern(ctx, w, h, pattern, color, patternColor) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        const secondary = patternColor || this._adjustBrightness(color, -40);

        switch (pattern) {
            case 'spots':
                this._drawSpotsPattern(ctx, w, h, secondary);
                break;
            case 'stripes':
                this._drawStripesPattern(ctx, w, h, secondary);
                break;
            case 'gradient':
                this._drawGradientPattern(ctx, w, h, color, secondary);
                break;
        }

        ctx.restore();
    }

    /**
     * Spots: random circles scattered across the part.
     */
    _drawSpotsPattern(ctx, w, h, spotColor) {
        ctx.fillStyle = spotColor;
        // Seeded-ish placement for consistency
        const spots = [
            [0.2, 0.3, 0.08], [0.6, 0.2, 0.06], [0.4, 0.6, 0.07],
            [0.8, 0.5, 0.05], [0.3, 0.8, 0.06], [0.7, 0.7, 0.08],
            [0.15, 0.55, 0.05], [0.5, 0.4, 0.06]
        ];
        for (const [rx, ry, rr] of spots) {
            const x = rx * w;
            const y = ry * h;
            const r = rr * Math.max(w, h);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Stripes: parallel curved lines following the body contour.
     */
    _drawStripesPattern(ctx, w, h, stripeColor) {
        ctx.strokeStyle = stripeColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;

        const count = 5;
        for (let i = 1; i <= count; i++) {
            const y = (i / (count + 1)) * h;
            ctx.beginPath();
            ctx.moveTo(w * 0.1, y);
            ctx.quadraticCurveTo(w * 0.5, y - 5 + Math.sin(i) * 3, w * 0.9, y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Gradient: two-tone vertical blend.
     */
    _drawGradientPattern(ctx, w, h, color1, color2) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.6, color2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
    }

    // ── Color Utilities ───────────────────────────────────

    /**
     * Adjust hex color brightness by amount (-255 to 255).
     */
    _adjustBrightness(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    // ── Draw Function Dispatch Table ──────────────────────

    _buildDrawTable() {
        return {
            // Heads
            'head-cat': (ctx, w, h, c) => this._drawHeadCat(ctx, w, h, c),
            'head-dog': (ctx, w, h, c) => this._drawHeadDog(ctx, w, h, c),
            'head-bird': (ctx, w, h, c) => this._drawHeadBird(ctx, w, h, c),
            'head-bunny': (ctx, w, h, c) => this._drawHeadBunny(ctx, w, h, c),
            'head-dragon': (ctx, w, h, c) => this._drawHeadDragon(ctx, w, h, c),
            'head-fox': (ctx, w, h, c) => this._drawHeadFox(ctx, w, h, c),
            'head-owl': (ctx, w, h, c) => this._drawHeadOwl(ctx, w, h, c),
            'head-bear': (ctx, w, h, c) => this._drawHeadBear(ctx, w, h, c),
            'head-unicorn': (ctx, w, h, c) => this._drawHeadUnicorn(ctx, w, h, c),
            'head-mermaid': (ctx, w, h, c) => this._drawHeadMermaid(ctx, w, h, c),

            // Eyes
            'eyes-sparkle': (ctx, w, h, c) => this._drawEyesSparkle(ctx, w, h, c),
            'eyes-button': (ctx, w, h, c) => this._drawEyesButton(ctx, w, h, c),
            'eyes-cat-slit': (ctx, w, h, c) => this._drawEyesCatSlit(ctx, w, h, c),
            'eyes-wide-round': (ctx, w, h, c) => this._drawEyesWideRound(ctx, w, h, c),
            'eyes-sleepy': (ctx, w, h, c) => this._drawEyesSleepy(ctx, w, h, c),
            'eyes-starry': (ctx, w, h, c) => this._drawEyesStarry(ctx, w, h, c),

            // Torsos
            'torso-round': (ctx, w, h, c) => this._drawTorsoRound(ctx, w, h, c),
            'torso-oval': (ctx, w, h, c) => this._drawTorsoOval(ctx, w, h, c),
            'torso-long': (ctx, w, h, c) => this._drawTorsoLong(ctx, w, h, c),
            'torso-stocky': (ctx, w, h, c) => this._drawTorsoStocky(ctx, w, h, c),
            'torso-serpentine': (ctx, w, h, c) => this._drawTorsoSerpentine(ctx, w, h, c),
            'torso-fluffy-cloud': (ctx, w, h, c) => this._drawTorsoFluffyCloud(ctx, w, h, c),
            'torso-heart': (ctx, w, h, c) => this._drawTorsoHeart(ctx, w, h, c),
            'torso-star': (ctx, w, h, c) => this._drawTorsoStar(ctx, w, h, c),

            // Legs
            'legs-paws-2': (ctx, w, h, c) => this._drawLegsPaws2(ctx, w, h, c),
            'legs-paws-4': (ctx, w, h, c) => this._drawLegsPaws4(ctx, w, h, c),
            'legs-bird-2': (ctx, w, h, c) => this._drawLegsBird(ctx, w, h, c),
            'legs-hooves-4': (ctx, w, h, c) => this._drawLegsHooves(ctx, w, h, c),
            'legs-tentacles-4': (ctx, w, h, c) => this._drawLegsTentacles(ctx, w, h, c),
            'legs-webbed': (ctx, w, h, c) => this._drawLegsWebbed(ctx, w, h, c),
            'legs-stubby': (ctx, w, h, c) => this._drawLegsStubby(ctx, w, h, c),

            // Tails
            'tail-fluffy': (ctx, w, h, c) => this._drawTailFluffy(ctx, w, h, c),
            'tail-dragon': (ctx, w, h, c) => this._drawTailDragon(ctx, w, h, c),
            'tail-fish': (ctx, w, h, c) => this._drawTailFish(ctx, w, h, c),
            'tail-peacock': (ctx, w, h, c) => this._drawTailPeacock(ctx, w, h, c),
            'tail-curly': (ctx, w, h, c) => this._drawTailCurly(ctx, w, h, c),
            'tail-mermaid': (ctx, w, h, c) => this._drawTailMermaid(ctx, w, h, c),
            'tail-phoenix': (ctx, w, h, c) => this._drawTailPhoenix(ctx, w, h, c),
            'tail-stub': (ctx, w, h, c) => this._drawTailStub(ctx, w, h, c),

            // Wings
            'wings-bird': (ctx, w, h, c) => this._drawWingsBird(ctx, w, h, c),
            'wings-butterfly': (ctx, w, h, c) => this._drawWingsButterfly(ctx, w, h, c),
            'wings-dragon': (ctx, w, h, c) => this._drawWingsDragon(ctx, w, h, c),
            'wings-fairy': (ctx, w, h, c) => this._drawWingsFairy(ctx, w, h, c),
            'wings-bat': (ctx, w, h, c) => this._drawWingsBat(ctx, w, h, c),
            'wings-angel': (ctx, w, h, c) => this._drawWingsAngel(ctx, w, h, c),

            // Extras
            'extras-unicorn-horn': (ctx, w, h, c) => this._drawExtrasUnicornHorn(ctx, w, h, c),
            'extras-antlers': (ctx, w, h, c) => this._drawExtrasAntlers(ctx, w, h, c),
            'extras-deer-horns': (ctx, w, h, c) => this._drawExtrasDeerHorns(ctx, w, h, c),
            'extras-floppy-ears': (ctx, w, h, c) => this._drawExtrasFloppyEars(ctx, w, h, c),
            'extras-pointed-ears': (ctx, w, h, c) => this._drawExtrasPointedEars(ctx, w, h, c),
            'extras-round-ears': (ctx, w, h, c) => this._drawExtrasRoundEars(ctx, w, h, c),
            'extras-dorsal-fin': (ctx, w, h, c) => this._drawExtrasDorsalFin(ctx, w, h, c),
            'extras-side-fins': (ctx, w, h, c) => this._drawExtrasSideFins(ctx, w, h, c),
            'extras-tusks': (ctx, w, h, c) => this._drawExtrasTusks(ctx, w, h, c),
            'extras-antennae': (ctx, w, h, c) => this._drawExtrasAntennae(ctx, w, h, c)
        };
    }

    // ══════════════════════════════════════════════════════
    //  HEAD DRAWING FUNCTIONS
    //  All heads draw within (0,0) to (w,h) with rounded shapes
    //  and cute features. 3px outlines, fill + stroke.
    // ══════════════════════════════════════════════════════

    _drawHeadCat(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.4, ry = h * 0.38;

        // Ears (pointed triangles with rounded tops)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.7, cy - ry * 0.5);
        ctx.lineTo(cx - rx * 0.4, cy - ry * 1.4);
        ctx.lineTo(cx - rx * 0.05, cy - ry * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.05, cy - ry * 0.6);
        ctx.lineTo(cx + rx * 0.4, cy - ry * 1.4);
        ctx.lineTo(cx + rx * 0.7, cy - ry * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner ear pink
        const innerColor = this._adjustBrightness(color, 30);
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.55, cy - ry * 0.55);
        ctx.lineTo(cx - rx * 0.38, cy - ry * 1.15);
        ctx.lineTo(cx - rx * 0.15, cy - ry * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.15, cy - ry * 0.6);
        ctx.lineTo(cx + rx * 0.38, cy - ry * 1.15);
        ctx.lineTo(cx + rx * 0.55, cy - ry * 0.55);
        ctx.closePath();
        ctx.fill();

        // Head circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nose (small pink triangle)
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.moveTo(cx, cy + ry * 0.15);
        ctx.lineTo(cx - 4, cy + ry * 0.35);
        ctx.lineTo(cx + 4, cy + ry * 0.35);
        ctx.closePath();
        ctx.fill();

        // Mouth (W shape)
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + ry * 0.45);
        ctx.quadraticCurveTo(cx - 4, cy + ry * 0.55, cx, cy + ry * 0.4);
        ctx.quadraticCurveTo(cx + 4, cy + ry * 0.55, cx + 8, cy + ry * 0.45);
        ctx.stroke();
        ctx.lineWidth = 3;

        // Whiskers
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.3, cy + ry * 0.2);
        ctx.lineTo(cx - rx * 1.0, cy + ry * 0.1);
        ctx.moveTo(cx - rx * 0.3, cy + ry * 0.35);
        ctx.lineTo(cx - rx * 1.0, cy + ry * 0.35);
        ctx.moveTo(cx + rx * 0.3, cy + ry * 0.2);
        ctx.lineTo(cx + rx * 1.0, cy + ry * 0.1);
        ctx.moveTo(cx + rx * 0.3, cy + ry * 0.35);
        ctx.lineTo(cx + rx * 1.0, cy + ry * 0.35);
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    _drawHeadDog(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.42, ry = h * 0.38;

        // Floppy ear shapes (behind head)
        ctx.fillStyle = this._adjustBrightness(color, -20);
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.75, cy + ry * 0.1, rx * 0.35, ry * 0.7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.75, cy + ry * 0.1, rx * 0.35, ry * 0.7, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Snout (lighter rounded bump)
        const snoutColor = this._adjustBrightness(color, 25);
        ctx.fillStyle = snoutColor;
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.3, rx * 0.45, ry * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nose (big dark oval)
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.15, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + ry * 0.22);
        ctx.lineTo(cx, cy + ry * 0.45);
        ctx.moveTo(cx - 7, cy + ry * 0.5);
        ctx.quadraticCurveTo(cx, cy + ry * 0.6, cx + 7, cy + ry * 0.5);
        ctx.stroke();
        ctx.lineWidth = 3;

        // Tongue
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.6, 4, 6, 0, 0, Math.PI);
        ctx.fill();
    }

    _drawHeadBird(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.5;
        const rx = w * 0.38, ry = h * 0.38;

        // Head circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tuft on top
        ctx.fillStyle = this._adjustBrightness(color, -20);
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - ry);
        ctx.quadraticCurveTo(cx, cy - ry - 15, cx + 5, cy - ry);
        ctx.quadraticCurveTo(cx + 8, cy - ry - 10, cx + 12, cy - ry + 2);
        ctx.fill();
        ctx.stroke();

        // Beak (orange triangle)
        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.6, cy);
        ctx.lineTo(cx + rx + 12, cy + 3);
        ctx.lineTo(cx + rx * 0.6, cy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawHeadBunny(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.65;
        const rx = w * 0.38, ry = h * 0.28;

        // Long ears
        ctx.fillStyle = color;
        const earW = rx * 0.3, earH = h * 0.35;
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.35, cy - ry - earH * 0.6, earW, earH, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.35, cy - ry - earH * 0.6, earW, earH, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.35, cy - ry - earH * 0.6, earW * 0.5, earH * 0.7, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.35, cy - ry - earH * 0.6, earW * 0.5, earH * 0.7, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Head (round with puffy cheeks)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Puffy cheeks
        ctx.fillStyle = this._adjustBrightness(color, 15);
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.6, cy + ry * 0.2, rx * 0.3, ry * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.6, cy + ry * 0.2, rx * 0.3, ry * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose (pink dot)
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();

        // Buck teeth
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(cx - 3, cy + ry * 0.25, 6, 6, 1);
        ctx.fill();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    _drawHeadDragon(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.42, ry = h * 0.35;

        // Small horns
        ctx.fillStyle = this._adjustBrightness(color, -30);
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.5, cy - ry * 0.7);
        ctx.lineTo(cx - rx * 0.35, cy - ry * 1.3);
        ctx.lineTo(cx - rx * 0.15, cy - ry * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.15, cy - ry * 0.7);
        ctx.lineTo(cx + rx * 0.35, cy - ry * 1.3);
        ctx.lineTo(cx + rx * 0.5, cy - ry * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head (slightly elongated, wider)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Snout
        ctx.fillStyle = this._adjustBrightness(color, 15);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.35, rx * 0.5, ry * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nostrils (two small circles)
        ctx.fillStyle = this._adjustBrightness(color, -40);
        ctx.beginPath();
        ctx.arc(cx - 5, cy + ry * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5, cy + ry * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Small smile
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.3, 8, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    _drawHeadFox(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.4, ry = h * 0.36;

        // Pointed ears
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.7, cy - ry * 0.3);
        ctx.lineTo(cx - rx * 0.45, cy - ry * 1.5);
        ctx.lineTo(cx - rx * 0.1, cy - ry * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.1, cy - ry * 0.5);
        ctx.lineTo(cx + rx * 0.45, cy - ry * 1.5);
        ctx.lineTo(cx + rx * 0.7, cy - ry * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.55, cy - ry * 0.4);
        ctx.lineTo(cx - rx * 0.43, cy - ry * 1.2);
        ctx.lineTo(cx - rx * 0.25, cy - ry * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.25, cy - ry * 0.55);
        ctx.lineTo(cx + rx * 0.43, cy - ry * 1.2);
        ctx.lineTo(cx + rx * 0.55, cy - ry * 0.4);
        ctx.closePath();
        ctx.fill();

        // Head (slightly pointed face)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White face mask
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(cx, cy - ry * 0.2);
        ctx.quadraticCurveTo(cx - rx * 0.5, cy + ry * 0.3, cx - rx * 0.15, cy + ry * 0.7);
        ctx.lineTo(cx + rx * 0.15, cy + ry * 0.7);
        ctx.quadraticCurveTo(cx + rx * 0.5, cy + ry * 0.3, cx, cy - ry * 0.2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawHeadOwl(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.42, ry = h * 0.38;

        // Ear tufts
        ctx.fillStyle = this._adjustBrightness(color, -20);
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.6, cy - ry * 0.6);
        ctx.lineTo(cx - rx * 0.55, cy - ry * 1.3);
        ctx.lineTo(cx - rx * 0.2, cy - ry * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.2, cy - ry * 0.6);
        ctx.lineTo(cx + rx * 0.55, cy - ry * 1.3);
        ctx.lineTo(cx + rx * 0.6, cy - ry * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Face disk (lighter circle)
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.05, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.moveTo(cx, cy + ry * 0.1);
        ctx.lineTo(cx - 5, cy + ry * 0.35);
        ctx.lineTo(cx + 5, cy + ry * 0.35);
        ctx.closePath();
        ctx.fill();
    }

    _drawHeadBear(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.42, ry = h * 0.38;

        // Round ears
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx - rx * 0.65, cy - ry * 0.65, rx * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + rx * 0.65, cy - ry * 0.65, rx * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.arc(cx - rx * 0.65, cy - ry * 0.65, rx * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + rx * 0.65, cy - ry * 0.65, rx * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Snout area
        ctx.fillStyle = this._adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.25, rx * 0.4, ry * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.15, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.2, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    _drawHeadUnicorn(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.6;
        const rx = w * 0.38, ry = h * 0.3;

        // Horn (spiral golden horn)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - ry * 0.8);
        ctx.lineTo(cx, cy - ry * 0.8 - h * 0.25);
        ctx.lineTo(cx + 5, cy - ry * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Horn spiral lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = this._adjustBrightness('#FFD700', -30);
        for (let i = 1; i <= 3; i++) {
            const y = cy - ry * 0.8 - h * 0.25 * (1 - i / 4);
            const hw = 2 + i * 1.2;
            ctx.beginPath();
            ctx.moveTo(cx - hw, y);
            ctx.lineTo(cx + hw, y);
            ctx.stroke();
        }
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2C2416';

        // Small ears
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.7, cy - ry * 0.6, rx * 0.2, ry * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + rx * 0.7, cy - ry * 0.6, rx * 0.2, ry * 0.35, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head (horse-like oval)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Muzzle
        ctx.fillStyle = this._adjustBrightness(color, 20);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ry * 0.4, rx * 0.35, ry * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nostrils
        ctx.fillStyle = this._adjustBrightness(color, -30);
        ctx.beginPath();
        ctx.arc(cx - 4, cy + ry * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 4, cy + ry * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawHeadMermaid(ctx, w, h, color) {
        const cx = w / 2, cy = h * 0.55;
        const rx = w * 0.38, ry = h * 0.36;

        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hair flowing out
        ctx.fillStyle = this._adjustBrightness(color, -20);
        ctx.beginPath();
        ctx.moveTo(cx - rx, cy - ry * 0.3);
        ctx.quadraticCurveTo(cx - rx - 8, cy + ry * 0.5, cx - rx + 5, cy + ry);
        ctx.lineTo(cx - rx * 0.5, cy - ry * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + rx, cy - ry * 0.3);
        ctx.quadraticCurveTo(cx + rx + 8, cy + ry * 0.5, cx + rx - 5, cy + ry);
        ctx.lineTo(cx + rx * 0.5, cy - ry * 0.2);
        ctx.closePath();
        ctx.fill();

        // Small tiara
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - ry * 0.85);
        ctx.lineTo(cx - 8, cy - ry * 1.1);
        ctx.lineTo(cx - 3, cy - ry * 0.9);
        ctx.lineTo(cx, cy - ry * 1.2);
        ctx.lineTo(cx + 3, cy - ry * 0.9);
        ctx.lineTo(cx + 8, cy - ry * 1.1);
        ctx.lineTo(cx + 12, cy - ry * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Nose
        ctx.fillStyle = this._adjustBrightness(color, -15);
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.15, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy + ry * 0.15, 8, 0.3, Math.PI - 0.3);
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    // ══════════════════════════════════════════════════════
    //  EYE DRAWING FUNCTIONS
    //  Eyes draw as a pair within (0,0) to (w,h).
    //  Should be 25-30% of head width = big and expressive.
    // ══════════════════════════════════════════════════════

    _drawEyesSparkle(ctx, w, h, color) {
        const eyeR = h * 0.4;
        const lx = w * 0.25, rx = w * 0.75, ey = h * 0.5;

        // White sclera
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(lx, ey, eyeR, eyeR * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(rx, ey, eyeR, eyeR * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Iris
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ey, eyeR * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey, eyeR * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.arc(lx, ey, eyeR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey, eyeR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle highlights (big + small white dots)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx - eyeR * 0.15, ey - eyeR * 0.2, eyeR * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx + eyeR * 0.2, ey + eyeR * 0.15, eyeR * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx - eyeR * 0.15, ey - eyeR * 0.2, eyeR * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx + eyeR * 0.2, ey + eyeR * 0.15, eyeR * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawEyesButton(ctx, w, h, color) {
        const eyeR = h * 0.35;
        const lx = w * 0.28, rx = w * 0.72, ey = h * 0.5;

        // Simple filled circles
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Small highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx - eyeR * 0.2, ey - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx - eyeR * 0.2, ey - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawEyesCatSlit(ctx, w, h, color) {
        const eyeR = h * 0.4;
        const lx = w * 0.25, rx = w * 0.75, ey = h * 0.5;

        // Almond-shaped eyes
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(lx, ey, eyeR, eyeR * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(rx, ey, eyeR, eyeR * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vertical slit pupils
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.ellipse(lx, ey, eyeR * 0.12, eyeR * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rx, ey, eyeR * 0.12, eyeR * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx - eyeR * 0.15, ey - eyeR * 0.15, eyeR * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx - eyeR * 0.15, ey - eyeR * 0.15, eyeR * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawEyesWideRound(ctx, w, h, color) {
        const eyeR = h * 0.42;
        const lx = w * 0.25, rx = w * 0.75, ey = h * 0.5;

        // Big round sclera
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Big iris
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ey + eyeR * 0.05, eyeR * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey + eyeR * 0.05, eyeR * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.arc(lx, ey + eyeR * 0.05, eyeR * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey + eyeR * 0.05, eyeR * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx - eyeR * 0.2, ey - eyeR * 0.15, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx - eyeR * 0.2, ey - eyeR * 0.15, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawEyesSleepy(ctx, w, h, color) {
        const eyeW = h * 0.4;
        const lx = w * 0.25, rx = w * 0.75, ey = h * 0.5;

        // Half-closed eyes (arc on top, flat on bottom)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(lx, ey + eyeW * 0.15, eyeW, eyeW * 0.4, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(rx, ey + eyeW * 0.15, eyeW, eyeW * 0.4, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Small iris peeking
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ey + eyeW * 0.05, eyeW * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey + eyeW * 0.05, eyeW * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Droopy eyelid line
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(lx, ey + eyeW * 0.15, eyeW, eyeW * 0.4, 0, Math.PI + 0.3, -0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(rx, ey + eyeW * 0.15, eyeW, eyeW * 0.4, 0, Math.PI + 0.3, -0.3);
        ctx.stroke();
        ctx.lineWidth = 3;
    }

    _drawEyesStarry(ctx, w, h, color) {
        const lx = w * 0.25, rx = w * 0.75, ey = h * 0.5;
        const r = h * 0.38;

        // Draw star-shaped eyes
        const drawStar = (x, y, outerR, innerR, points) => {
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };

        // Star outline
        ctx.fillStyle = color;
        drawStar(lx, ey, r, r * 0.45, 5);
        ctx.fill();
        ctx.stroke();
        drawStar(rx, ey, r, r * 0.45, 5);
        ctx.fill();
        ctx.stroke();

        // Center pupil
        ctx.fillStyle = '#2C2416';
        ctx.beginPath();
        ctx.arc(lx, ey, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ey, r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx - r * 0.15, ey - r * 0.15, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx - r * 0.15, ey - r * 0.15, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    // ══════════════════════════════════════════════════════
    //  TORSO DRAWING FUNCTIONS
    // ══════════════════════════════════════════════════════

    _drawTorsoRound(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.45, h * 0.43, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly highlight
        ctx.fillStyle = this._adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.05, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTorsoOval(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly highlight
        ctx.fillStyle = this._adjustBrightness(color, 20);
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.08, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTorsoLong(ctx, w, h, color) {
        const cx = w / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cx - w * 0.35, h * 0.05, w * 0.7, h * 0.9, w * 0.25);
        ctx.fill();
        ctx.stroke();

        // Belly stripe
        ctx.fillStyle = this._adjustBrightness(color, 20);
        ctx.beginPath();
        ctx.roundRect(cx - w * 0.15, h * 0.15, w * 0.3, h * 0.7, w * 0.1);
        ctx.fill();
    }

    _drawTorsoStocky(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cx - w * 0.45, cy - h * 0.42, w * 0.9, h * 0.84, w * 0.2);
        ctx.fill();
        ctx.stroke();

        // Belly
        ctx.fillStyle = this._adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.ellipse(cx, cy + h * 0.05, w * 0.28, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTorsoSerpentine(ctx, w, h, color) {
        const cx = w / 2;
        // S-curved body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.2, h * 0.05);
        ctx.bezierCurveTo(
            cx + w * 0.35, h * 0.2,
            cx - w * 0.35, h * 0.5,
            cx + w * 0.2, h * 0.7
        );
        ctx.bezierCurveTo(
            cx + w * 0.35, h * 0.8,
            cx - w * 0.1, h * 0.9,
            cx, h * 0.95
        );
        ctx.lineTo(cx - w * 0.15, h * 0.93);
        ctx.bezierCurveTo(
            cx - w * 0.3, h * 0.85,
            cx + w * 0.15, h * 0.75,
            cx - w * 0.05, h * 0.65
        );
        ctx.bezierCurveTo(
            cx - w * 0.5, h * 0.45,
            cx + w * 0.5, h * 0.15,
            cx + w * 0.05, h * 0.05
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Belly scales (lighter line down center)
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const y = h * 0.1 + (h * 0.8 / 8) * i;
            const x = cx + Math.sin(i * 0.8) * w * 0.05;
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.08, h * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.lineWidth = 3;
    }

    _drawTorsoFluffyCloud(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = color;

        // Multiple overlapping circles for cloud effect
        const bumps = [
            [0.3, 0.4, 0.25], [0.5, 0.3, 0.28], [0.7, 0.4, 0.25],
            [0.25, 0.55, 0.22], [0.5, 0.55, 0.3], [0.75, 0.55, 0.22],
            [0.35, 0.7, 0.22], [0.5, 0.72, 0.25], [0.65, 0.7, 0.22]
        ];

        // Fill all bumps first (no outlines between bumps)
        ctx.beginPath();
        for (const [bx, by, br] of bumps) {
            ctx.moveTo(bx * w + br * w, by * h);
            ctx.arc(bx * w, by * h, br * w, 0, Math.PI * 2);
        }
        ctx.fill();

        // Single outline around the cloud shape
        for (const [bx, by, br] of bumps) {
            ctx.beginPath();
            ctx.arc(bx * w, by * h, br * w, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawTorsoHeart(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.moveTo(cx, h * 0.85);
        // Left lobe
        ctx.bezierCurveTo(
            cx - w * 0.5, h * 0.55,
            cx - w * 0.5, h * 0.15,
            cx, h * 0.3
        );
        // Right lobe
        ctx.bezierCurveTo(
            cx + w * 0.5, h * 0.15,
            cx + w * 0.5, h * 0.55,
            cx, h * 0.85
        );
        ctx.fill();
        ctx.stroke();

        // Highlight on left lobe
        ctx.fillStyle = this._adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.15, h * 0.32, w * 0.1, h * 0.08, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTorsoStar(ctx, w, h, color) {
        const cx = w / 2, cy = h / 2;
        const outerR = Math.min(w, h) * 0.45;
        const innerR = outerR * 0.45;
        const points = 5;

        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center circle highlight
        ctx.fillStyle = this._adjustBrightness(color, 25);
        ctx.beginPath();
        ctx.arc(cx, cy, innerR * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ══════════════════════════════════════════════════════
    //  LEG DRAWING FUNCTIONS
    //  Legs draw as a set (2 or 4) within the bounding box.
    // ══════════════════════════════════════════════════════

    _drawLegsPaws2(ctx, w, h, color) {
        const legW = w * 0.22;
        const spacing = w * 0.35;
        const cx = w / 2;

        for (let i = -1; i <= 1; i += 2) {
            const x = cx + i * spacing / 2;
            ctx.fillStyle = color;
            // Leg
            ctx.beginPath();
            ctx.roundRect(x - legW / 2, 0, legW, h * 0.75, [0, 0, legW * 0.3, legW * 0.3]);
            ctx.fill();
            ctx.stroke();

            // Paw (wider at bottom)
            ctx.beginPath();
            ctx.ellipse(x, h * 0.8, legW * 0.65, h * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Toe lines
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - legW * 0.2, h * 0.72);
            ctx.lineTo(x - legW * 0.2, h * 0.85);
            ctx.moveTo(x + legW * 0.2, h * 0.72);
            ctx.lineTo(x + legW * 0.2, h * 0.85);
            ctx.stroke();
            ctx.lineWidth = 3;
        }
    }

    _drawLegsPaws4(ctx, w, h, color) {
        const legW = w * 0.14;
        const positions = [-0.38, -0.13, 0.13, 0.38];

        for (const pos of positions) {
            const x = w / 2 + pos * w;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x - legW / 2, 0, legW, h * 0.72, [0, 0, legW * 0.3, legW * 0.3]);
            ctx.fill();
            ctx.stroke();

            // Paw
            ctx.beginPath();
            ctx.ellipse(x, h * 0.78, legW * 0.6, h * 0.17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawLegsBird(ctx, w, h, color) {
        const cx = w / 2;
        const spacing = w * 0.3;

        for (let i = -1; i <= 1; i += 2) {
            const x = cx + i * spacing / 2;
            // Thin stick legs
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h * 0.55);
            // Knee bend
            ctx.lineTo(x + i * 3, h * 0.65);
            ctx.lineTo(x, h * 0.75);
            ctx.stroke();

            // Three toes
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x - 8, h * 0.9);
            ctx.lineTo(x, h * 0.75);
            ctx.lineTo(x + 8, h * 0.9);
            ctx.moveTo(x, h * 0.75);
            ctx.lineTo(x + i * 5, h * 0.92);
            ctx.stroke();

            ctx.strokeStyle = '#2C2416';
            ctx.lineWidth = 3;
        }
    }

    _drawLegsHooves(ctx, w, h, color) {
        const legW = w * 0.1;
        const positions = [-0.38, -0.13, 0.13, 0.38];

        for (const pos of positions) {
            const x = w / 2 + pos * w;
            ctx.fillStyle = color;
            // Slender leg
            ctx.beginPath();
            ctx.roundRect(x - legW / 2, 0, legW, h * 0.7, 3);
            ctx.fill();
            ctx.stroke();

            // Hoof (darker, wider at bottom)
            ctx.fillStyle = this._adjustBrightness(color, -40);
            ctx.beginPath();
            ctx.roundRect(x - legW * 0.7, h * 0.7, legW * 1.4, h * 0.25, [0, 0, 4, 4]);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawLegsTentacles(ctx, w, h, color) {
        const positions = [-0.35, -0.12, 0.12, 0.35];

        for (let idx = 0; idx < positions.length; idx++) {
            const x = w / 2 + positions[idx] * w;
            const curl = (idx % 2 === 0) ? 1 : -1;

            ctx.fillStyle = color;
            ctx.lineWidth = 3;

            // Wavy tentacle
            ctx.beginPath();
            ctx.moveTo(x - 6, 0);
            ctx.bezierCurveTo(
                x - 6 + curl * 8, h * 0.3,
                x - 4 - curl * 8, h * 0.6,
                x - 3 + curl * 5, h * 0.9
            );
            ctx.lineTo(x + 3 + curl * 5, h * 0.9);
            ctx.bezierCurveTo(
                x + 4 - curl * 8, h * 0.6,
                x + 6 + curl * 8, h * 0.3,
                x + 6, 0
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Suction cups (small circles)
            ctx.fillStyle = this._adjustBrightness(color, 30);
            for (let i = 1; i <= 3; i++) {
                const t = i / 4;
                const sx = x + curl * Math.sin(t * 3) * 4;
                const sy = t * h * 0.85;
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawLegsWebbed(ctx, w, h, color) {
        const cx = w / 2, spacing = w * 0.35;

        for (let i = -1; i <= 1; i += 2) {
            const x = cx + i * spacing / 2;
            ctx.fillStyle = color;
            // Short leg
            ctx.beginPath();
            ctx.roundRect(x - 7, 0, 14, h * 0.55, 5);
            ctx.fill();
            ctx.stroke();

            // Webbed foot (fan shape)
            ctx.beginPath();
            ctx.moveTo(x, h * 0.5);
            ctx.lineTo(x - 15, h * 0.95);
            ctx.quadraticCurveTo(x - 5, h * 0.88, x, h * 0.92);
            ctx.quadraticCurveTo(x + 5, h * 0.88, x + 15, h * 0.95);
            ctx.lineTo(x, h * 0.5);
            ctx.fill();
            ctx.stroke();

            // Web lines
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.55);
            ctx.lineTo(x - 8, h * 0.92);
            ctx.moveTo(x, h * 0.55);
            ctx.lineTo(x + 8, h * 0.92);
            ctx.stroke();
            ctx.lineWidth = 3;
        }
    }

    _drawLegsStubby(ctx, w, h, color) {
        const positions = [-0.3, -0.1, 0.1, 0.3];

        for (const pos of positions) {
            const x = w / 2 + pos * w;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x - 8, 0, 16, h * 0.85, [0, 0, 8, 8]);
            ctx.fill();
            ctx.stroke();
        }
    }

    // ══════════════════════════════════════════════════════
    //  TAIL DRAWING FUNCTIONS
    //  Tails attach at (0, h/2) and extend to the right.
    // ══════════════════════════════════════════════════════

    _drawTailFluffy(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Base
        ctx.beginPath();
        ctx.moveTo(0, h * 0.3);
        ctx.quadraticCurveTo(w * 0.3, h * 0.1, w * 0.5, h * 0.2);
        ctx.quadraticCurveTo(w * 0.7, h * 0.3, w * 0.85, h * 0.25);

        // Fluffy tip (bumps)
        ctx.quadraticCurveTo(w * 0.95, h * 0.15, w * 0.9, h * 0.35);
        ctx.quadraticCurveTo(w, h * 0.45, w * 0.92, h * 0.55);
        ctx.quadraticCurveTo(w * 0.95, h * 0.7, w * 0.82, h * 0.65);

        ctx.quadraticCurveTo(w * 0.6, h * 0.8, w * 0.3, h * 0.7);
        ctx.quadraticCurveTo(w * 0.1, h * 0.6, 0, h * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawTailDragon(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Pointed dragon tail with spade tip
        ctx.beginPath();
        ctx.moveTo(0, h * 0.3);
        ctx.quadraticCurveTo(w * 0.3, h * 0.15, w * 0.6, h * 0.2);
        ctx.lineTo(w * 0.8, h * 0.15);
        // Spade tip
        ctx.quadraticCurveTo(w * 0.95, h * 0.05, w, h * 0.25);
        ctx.quadraticCurveTo(w, h * 0.5, w * 0.95, h * 0.7);
        ctx.quadraticCurveTo(w * 0.85, h * 0.5, w * 0.8, h * 0.55);
        ctx.lineTo(w * 0.6, h * 0.6);
        ctx.quadraticCurveTo(w * 0.3, h * 0.65, 0, h * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ridges on top
        ctx.fillStyle = this._adjustBrightness(color, -20);
        for (let i = 0; i < 3; i++) {
            const x = w * 0.2 + i * w * 0.15;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.2);
            ctx.lineTo(x + 5, h * 0.05);
            ctx.lineTo(x + 10, h * 0.2);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawTailFish(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Tapered body
        ctx.beginPath();
        ctx.moveTo(0, h * 0.3);
        ctx.quadraticCurveTo(w * 0.4, h * 0.25, w * 0.6, h * 0.35);

        // Fan fin
        ctx.quadraticCurveTo(w * 0.7, h * 0.05, w * 0.95, h * 0.0);
        ctx.quadraticCurveTo(w * 0.85, h * 0.3, w * 0.95, h * 0.5);
        ctx.quadraticCurveTo(w * 0.85, h * 0.7, w * 0.95, h);
        ctx.quadraticCurveTo(w * 0.7, h * 0.95, w * 0.6, h * 0.65);

        ctx.quadraticCurveTo(w * 0.4, h * 0.75, 0, h * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fin lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this._adjustBrightness(color, -25);
        ctx.beginPath();
        ctx.moveTo(w * 0.65, h * 0.4);
        ctx.lineTo(w * 0.9, h * 0.15);
        ctx.moveTo(w * 0.65, h * 0.5);
        ctx.lineTo(w * 0.92, h * 0.5);
        ctx.moveTo(w * 0.65, h * 0.6);
        ctx.lineTo(w * 0.9, h * 0.85);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawTailPeacock(ctx, w, h, color) {
        const cx = w * 0.5, cy = h * 0.5;

        // Fan of feather plumes
        const featherCount = 7;
        for (let i = 0; i < featherCount; i++) {
            const angle = -Math.PI * 0.35 + (Math.PI * 0.7 * i) / (featherCount - 1);
            const length = w * 0.45;
            const ex = cx + Math.cos(angle) * length;
            const ey = cy + Math.sin(angle) * length;

            ctx.fillStyle = this._adjustBrightness(color, i * 5 - 15);
            ctx.beginPath();
            ctx.ellipse(
                cx + Math.cos(angle) * length * 0.6,
                cy + Math.sin(angle) * length * 0.6,
                5, length * 0.45,
                angle + Math.PI / 2, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();

            // Eye spot at tip
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4A90D9';
            ctx.beginPath();
            ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Base stem
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.4);
        ctx.quadraticCurveTo(w * 0.2, h * 0.3, cx, cy);
        ctx.quadraticCurveTo(w * 0.2, h * 0.7, 0, h * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawTailCurly(ctx, w, h, color) {
        ctx.fillStyle = color;
        const cx = w * 0.55, cy = h * 0.45;
        const r = Math.min(w, h) * 0.35;

        // Spiral curl
        ctx.beginPath();
        ctx.moveTo(0, h * 0.35);
        ctx.quadraticCurveTo(w * 0.2, h * 0.2, w * 0.4, h * 0.25);
        ctx.arc(cx, cy, r, -Math.PI * 0.7, Math.PI * 1.3);
        ctx.quadraticCurveTo(w * 0.2, h * 0.7, 0, h * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawTailMermaid(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Scaled tail body
        ctx.beginPath();
        ctx.moveTo(0, h * 0.25);
        ctx.quadraticCurveTo(w * 0.3, h * 0.15, w * 0.5, h * 0.2);
        ctx.quadraticCurveTo(w * 0.65, h * 0.25, w * 0.55, h * 0.4);

        // Flowing fin
        ctx.quadraticCurveTo(w * 0.7, h * 0.2, w, h * 0.1);
        ctx.quadraticCurveTo(w * 0.8, h * 0.45, w * 0.95, h * 0.5);
        ctx.quadraticCurveTo(w * 0.8, h * 0.55, w, h * 0.9);
        ctx.quadraticCurveTo(w * 0.7, h * 0.8, w * 0.55, h * 0.6);

        ctx.quadraticCurveTo(w * 0.65, h * 0.75, w * 0.5, h * 0.8);
        ctx.quadraticCurveTo(w * 0.3, h * 0.85, 0, h * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawTailPhoenix(ctx, w, h, color) {
        // Multiple flowing flame-like feathers
        const lighter = this._adjustBrightness(color, 30);
        const darker = this._adjustBrightness(color, -20);
        const colors = [color, lighter, darker, '#FFD700', color];

        for (let i = 0; i < 5; i++) {
            const offset = (i - 2) * h * 0.12;
            const length = w * (0.7 + (i % 2) * 0.15);
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(0, h * 0.45 + offset);
            ctx.quadraticCurveTo(
                length * 0.4, h * 0.35 + offset,
                length, h * 0.3 + offset + i * 3
            );
            ctx.quadraticCurveTo(
                length * 0.5, h * 0.55 + offset,
                0, h * 0.55 + offset
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawTailStub(ctx, w, h, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(w * 0.45, h * 0.5, w * 0.4, h * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // ══════════════════════════════════════════════════════
    //  WING DRAWING FUNCTIONS
    //  Wings draw with pivot at right side (attach to torso).
    //  drawSize is for ONE wing — creature-cache mirrors for the pair.
    // ══════════════════════════════════════════════════════

    _drawWingsBird(ctx, w, h, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.quadraticCurveTo(w * 0.7, h * 0.05, w * 0.3, h * 0.1);
        ctx.quadraticCurveTo(w * 0.05, h * 0.15, 0, h * 0.25);
        // Feather tips
        ctx.lineTo(w * 0.08, h * 0.35);
        ctx.lineTo(0, h * 0.4);
        ctx.lineTo(w * 0.1, h * 0.48);
        ctx.lineTo(w * 0.05, h * 0.55);
        ctx.quadraticCurveTo(w * 0.4, h * 0.5, w * 0.7, h * 0.55);
        ctx.quadraticCurveTo(w * 0.85, h * 0.45, w * 0.9, h * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Feather lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this._adjustBrightness(color, -20);
        for (let i = 0; i < 4; i++) {
            const x = w * 0.2 + i * w * 0.15;
            ctx.beginPath();
            ctx.moveTo(w * 0.85, h * 0.35);
            ctx.quadraticCurveTo(x + w * 0.1, h * 0.2, x, h * 0.15 + i * 5);
            ctx.stroke();
        }
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawWingsButterfly(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Upper wing
        ctx.beginPath();
        ctx.moveTo(w * 0.85, h * 0.3);
        ctx.quadraticCurveTo(w * 0.4, h * 0.0, w * 0.05, h * 0.15);
        ctx.quadraticCurveTo(w * 0.0, h * 0.35, w * 0.2, h * 0.45);
        ctx.quadraticCurveTo(w * 0.5, h * 0.4, w * 0.85, h * 0.3);
        ctx.fill();
        ctx.stroke();

        // Lower wing
        ctx.beginPath();
        ctx.moveTo(w * 0.85, h * 0.35);
        ctx.quadraticCurveTo(w * 0.5, h * 0.45, w * 0.15, h * 0.5);
        ctx.quadraticCurveTo(w * 0.0, h * 0.7, w * 0.15, h * 0.85);
        ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.85, h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing spots
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.ellipse(w * 0.35, h * 0.25, w * 0.1, h * 0.08, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w * 0.35, h * 0.65, w * 0.08, h * 0.06, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawWingsDragon(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Membrane wing with finger bones
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        // Top edge with bone points
        ctx.lineTo(w * 0.6, h * 0.05);
        ctx.lineTo(w * 0.55, h * 0.15);
        ctx.lineTo(w * 0.3, h * 0.0);
        ctx.lineTo(w * 0.28, h * 0.12);
        ctx.lineTo(w * 0.05, h * 0.05);
        // Scalloped bottom
        ctx.quadraticCurveTo(w * 0.1, h * 0.35, w * 0.2, h * 0.5);
        ctx.quadraticCurveTo(w * 0.35, h * 0.65, w * 0.5, h * 0.55);
        ctx.quadraticCurveTo(w * 0.65, h * 0.7, w * 0.8, h * 0.55);
        ctx.lineTo(w * 0.9, h * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bone lines
        ctx.lineWidth = 2;
        ctx.strokeStyle = this._adjustBrightness(color, -30);
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.lineTo(w * 0.6, h * 0.05);
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.lineTo(w * 0.3, h * 0.0);
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.lineTo(w * 0.05, h * 0.05);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawWingsFairy(ctx, w, h, color) {
        // Draw fully opaque so source-atop covering works correctly.
        // Gossamer effect achieved via lighter color tint + sparkle dots.
        const gossamerColor = this._adjustBrightness(color, 35);
        ctx.fillStyle = gossamerColor;

        // Upper gossamer wing
        ctx.beginPath();
        ctx.moveTo(w * 0.85, h * 0.3);
        ctx.bezierCurveTo(w * 0.5, h * 0.0, w * 0.1, h * 0.05, w * 0.05, h * 0.25);
        ctx.bezierCurveTo(w * 0.1, h * 0.4, w * 0.5, h * 0.42, w * 0.85, h * 0.3);
        ctx.fill();
        ctx.stroke();

        // Lower wing
        ctx.beginPath();
        ctx.moveTo(w * 0.85, h * 0.35);
        ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.15, h * 0.55, w * 0.1, h * 0.75);
        ctx.bezierCurveTo(w * 0.3, h * 0.85, w * 0.65, h * 0.7, w * 0.85, h * 0.5);
        ctx.fill();
        ctx.stroke();

        // Sparkle dots on wings
        ctx.fillStyle = '#FFFFFF';
        const sparkles = [[0.3, 0.2], [0.5, 0.15], [0.2, 0.35], [0.4, 0.6], [0.25, 0.7]];
        for (const [sx, sy] of sparkles) {
            ctx.beginPath();
            ctx.arc(sx * w, sy * h, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawWingsBat(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Bat-style membrane
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.lineTo(w * 0.5, h * 0.05);
        ctx.lineTo(w * 0.1, h * 0.1);

        // Scalloped edge (3 points)
        ctx.quadraticCurveTo(w * 0.05, h * 0.3, w * 0.15, h * 0.45);
        ctx.quadraticCurveTo(w * 0.1, h * 0.55, w * 0.2, h * 0.65);
        ctx.quadraticCurveTo(w * 0.25, h * 0.75, w * 0.4, h * 0.7);
        ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.6, h * 0.65);
        ctx.quadraticCurveTo(w * 0.7, h * 0.6, w * 0.9, h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Finger bones
        ctx.lineWidth = 2;
        ctx.strokeStyle = this._adjustBrightness(color, -25);
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.lineTo(w * 0.1, h * 0.1);
        ctx.moveTo(w * 0.9, h * 0.35);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.moveTo(w * 0.9, h * 0.4);
        ctx.lineTo(w * 0.4, h * 0.7);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawWingsAngel(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Layered feather wing
        // Back layer (larger)
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.25);
        ctx.quadraticCurveTo(w * 0.5, h * 0.0, w * 0.1, h * 0.1);
        ctx.quadraticCurveTo(w * 0.0, h * 0.25, w * 0.05, h * 0.4);
        // Feather scallops
        ctx.quadraticCurveTo(w * 0.1, h * 0.5, w * 0.2, h * 0.48);
        ctx.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.35, h * 0.52);
        ctx.quadraticCurveTo(w * 0.4, h * 0.6, w * 0.5, h * 0.55);
        ctx.quadraticCurveTo(w * 0.6, h * 0.6, w * 0.65, h * 0.55);
        ctx.quadraticCurveTo(w * 0.75, h * 0.5, w * 0.9, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front layer (smaller, lighter)
        ctx.fillStyle = this._adjustBrightness(color, 20);
        ctx.beginPath();
        ctx.moveTo(w * 0.9, h * 0.3);
        ctx.quadraticCurveTo(w * 0.6, h * 0.15, w * 0.3, h * 0.2);
        ctx.quadraticCurveTo(w * 0.2, h * 0.3, w * 0.25, h * 0.4);
        ctx.quadraticCurveTo(w * 0.4, h * 0.45, w * 0.55, h * 0.42);
        ctx.quadraticCurveTo(w * 0.7, h * 0.45, w * 0.9, h * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // ══════════════════════════════════════════════════════
    //  EXTRAS DRAWING FUNCTIONS
    // ══════════════════════════════════════════════════════

    _drawExtrasUnicornHorn(ctx, w, h, color) {
        // Spiral horn
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h);
        ctx.lineTo(w * 0.5, 0);
        ctx.lineTo(w * 0.7, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Spiral lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this._adjustBrightness(color, -25);
        for (let i = 1; i <= 4; i++) {
            const y = h * (i / 5);
            const hw = w * 0.1 + (w * 0.1 * i / 5);
            ctx.beginPath();
            ctx.moveTo(w / 2 - hw, y);
            ctx.lineTo(w / 2 + hw, y);
            ctx.stroke();
        }
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawExtrasAntlers(ctx, w, h, color) {
        ctx.fillStyle = color;
        ctx.lineWidth = 3;

        // Left antler
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h);
        ctx.lineTo(w * 0.3, h * 0.5);
        ctx.lineTo(w * 0.15, h * 0.3);
        ctx.moveTo(w * 0.3, h * 0.5);
        ctx.lineTo(w * 0.1, h * 0.1);
        ctx.moveTo(w * 0.3, h * 0.5);
        ctx.lineTo(w * 0.25, h * 0.15);
        ctx.stroke();

        // Right antler
        ctx.beginPath();
        ctx.moveTo(w * 0.65, h);
        ctx.lineTo(w * 0.7, h * 0.5);
        ctx.lineTo(w * 0.85, h * 0.3);
        ctx.moveTo(w * 0.7, h * 0.5);
        ctx.lineTo(w * 0.9, h * 0.1);
        ctx.moveTo(w * 0.7, h * 0.5);
        ctx.lineTo(w * 0.75, h * 0.15);
        ctx.stroke();

        // Branch tips (small circles)
        ctx.fillStyle = color;
        const tips = [
            [0.15, 0.3], [0.1, 0.1], [0.25, 0.15],
            [0.85, 0.3], [0.9, 0.1], [0.75, 0.15]
        ];
        for (const [tx, ty] of tips) {
            ctx.beginPath();
            ctx.arc(tx * w, ty * h, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawExtrasDeerHorns(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left horn
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h);
        ctx.quadraticCurveTo(w * 0.2, h * 0.5, w * 0.15, h * 0.1);
        ctx.quadraticCurveTo(w * 0.2, h * 0.0, w * 0.25, h * 0.15);
        ctx.quadraticCurveTo(w * 0.35, h * 0.55, w * 0.42, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right horn
        ctx.beginPath();
        ctx.moveTo(w * 0.58, h);
        ctx.quadraticCurveTo(w * 0.65, h * 0.55, w * 0.75, h * 0.15);
        ctx.quadraticCurveTo(w * 0.8, h * 0.0, w * 0.85, h * 0.1);
        ctx.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.65, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawExtrasFloppyEars(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left floppy ear
        ctx.beginPath();
        ctx.ellipse(w * 0.2, h * 0.5, w * 0.15, h * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right floppy ear
        ctx.beginPath();
        ctx.ellipse(w * 0.8, h * 0.5, w * 0.15, h * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.ellipse(w * 0.2, h * 0.5, w * 0.08, h * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w * 0.8, h * 0.5, w * 0.08, h * 0.28, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawExtrasPointedEars(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left pointed ear
        ctx.beginPath();
        ctx.moveTo(w * 0.15, h);
        ctx.lineTo(w * 0.2, h * 0.1);
        ctx.lineTo(w * 0.35, h * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right pointed ear
        ctx.beginPath();
        ctx.moveTo(w * 0.65, h * 0.7);
        ctx.lineTo(w * 0.8, h * 0.1);
        ctx.lineTo(w * 0.85, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.85);
        ctx.lineTo(w * 0.22, h * 0.3);
        ctx.lineTo(w * 0.32, h * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.68, h * 0.75);
        ctx.lineTo(w * 0.78, h * 0.3);
        ctx.lineTo(w * 0.8, h * 0.85);
        ctx.closePath();
        ctx.fill();
    }

    _drawExtrasRoundEars(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left round ear
        ctx.beginPath();
        ctx.arc(w * 0.2, h * 0.5, w * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right round ear
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.5, w * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ear
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.arc(w * 0.2, h * 0.5, w * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.5, w * 0.09, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawExtrasDorsalFin(ctx, w, h, color) {
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.moveTo(w * 0.2, h);
        ctx.quadraticCurveTo(w * 0.3, h * 0.3, w * 0.5, h * 0.05);
        ctx.quadraticCurveTo(w * 0.65, h * 0.3, w * 0.8, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ridge lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this._adjustBrightness(color, -20);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.1);
        ctx.lineTo(w * 0.45, h * 0.85);
        ctx.moveTo(w * 0.5, h * 0.15);
        ctx.lineTo(w * 0.6, h * 0.85);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
    }

    _drawExtrasSideFins(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left fin
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.4);
        ctx.quadraticCurveTo(w * 0.05, h * 0.2, w * 0.0, h * 0.5);
        ctx.quadraticCurveTo(w * 0.05, h * 0.8, w * 0.3, h * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right fin
        ctx.beginPath();
        ctx.moveTo(w * 0.7, h * 0.4);
        ctx.quadraticCurveTo(w * 0.95, h * 0.2, w, h * 0.5);
        ctx.quadraticCurveTo(w * 0.95, h * 0.8, w * 0.7, h * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawExtrasTusks(ctx, w, h, color) {
        ctx.fillStyle = color;

        // Left tusk
        ctx.beginPath();
        ctx.moveTo(w * 0.25, 0);
        ctx.quadraticCurveTo(w * 0.15, h * 0.5, w * 0.2, h);
        ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.35, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right tusk
        ctx.beginPath();
        ctx.moveTo(w * 0.65, 0);
        ctx.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.8, h);
        ctx.quadraticCurveTo(w * 0.85, h * 0.5, w * 0.75, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _drawExtrasAntennae(ctx, w, h, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        // Left antenna stalk
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h);
        ctx.quadraticCurveTo(w * 0.2, h * 0.4, w * 0.15, h * 0.15);
        ctx.stroke();

        // Right antenna stalk
        ctx.beginPath();
        ctx.moveTo(w * 0.65, h);
        ctx.quadraticCurveTo(w * 0.8, h * 0.4, w * 0.85, h * 0.15);
        ctx.stroke();

        // Antenna tips (glowing circles)
        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.arc(w * 0.15, h * 0.15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = this._adjustBrightness(color, 30);
        ctx.beginPath();
        ctx.arc(w * 0.85, h * 0.15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2C2416';
    }
}
