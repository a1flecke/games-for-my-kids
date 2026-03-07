/**
 * accessories.js — Accessory catalog + procedural Canvas 2D drawing for 42 accessories.
 * Each accessory draws into a 60x60 logical pixel box. Color parameter fills the main shape.
 * Thick outlines (3-4px), rounded shapes, deterministic (no Math.random).
 */

// Per-head-type anchors for head-slot accessories
const HEAD_ACCESSORY_ANCHORS = {
    'head-cat':     { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 },
    'head-dog':     { x: 0.5, y: -0.05, rotation: 0, scale: 1.0 },
    'head-bird':    { x: 0.5, y: -0.10, rotation: -5, scale: 0.8 },
    'head-bunny':   { x: 0.5, y: -0.15, rotation: 0, scale: 0.85 },
    'head-dragon':  { x: 0.5, y: -0.05, rotation: 0, scale: 1.1 },
    'head-fox':     { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 },
    'head-owl':     { x: 0.5, y: -0.10, rotation: 0, scale: 0.85 },
    'head-bear':    { x: 0.5, y: -0.05, rotation: 0, scale: 1.0 },
    'head-unicorn': { x: 0.5, y: -0.08, rotation: 0, scale: 0.95 },
    'head-mermaid': { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 }
};

// Per-head-type anchors for face-slot accessories
const FACE_ACCESSORY_ANCHORS = {
    'head-cat':     { x: 0.5, y: 0.35, rotation: 0, scale: 0.8 },
    'head-dog':     { x: 0.5, y: 0.40, rotation: 0, scale: 0.85 },
    'head-bunny':   { x: 0.5, y: 0.35, rotation: 0, scale: 0.8 },
    'head-fox':     { x: 0.5, y: 0.38, rotation: 0, scale: 0.8 },
    'head-bear':    { x: 0.5, y: 0.38, rotation: 0, scale: 0.9 },
    'head-unicorn': { x: 0.5, y: 0.35, rotation: 0, scale: 0.85 }
};

class AccessoriesLibrary {
    constructor() {
        this._accessoryData = null;
        this._drawFunctionsCache = null;
    }

    async loadCatalog() {
        const resp = await fetch('data/accessories.json');
        this._accessoryData = await resp.json();
        return this._accessoryData;
    }

    getBySlot(slot) {
        if (!this._accessoryData) return [];
        return this._accessoryData.filter(a => a.slot === slot);
    }

    getById(id) {
        if (!this._accessoryData) return null;
        return this._accessoryData.find(a => a.id === id) || null;
    }

    getAllAccessories() {
        return this._accessoryData || [];
    }

    /**
     * Get anchor point for a slot + head type.
     */
    getAnchor(slot, headType) {
        if (slot === 'head' && headType && HEAD_ACCESSORY_ANCHORS[headType]) {
            return HEAD_ACCESSORY_ANCHORS[headType];
        }
        if (slot === 'face' && headType && FACE_ACCESSORY_ANCHORS[headType]) {
            return FACE_ACCESSORY_ANCHORS[headType];
        }
        const defaults = {
            head: { x: 0.5, y: 0.0, rotation: 0, scale: 1.0 },
            neck: { x: 0.5, y: 0.85, rotation: 0, scale: 1.0 },
            body: { x: 0.5, y: 0.5, rotation: 0, scale: 1.0 },
            feet: { x: 0.5, y: 1.0, rotation: 0, scale: 1.0 },
            face: { x: 0.5, y: 0.4, rotation: 0, scale: 0.8 }
        };
        return defaults[slot] || { x: 0.5, y: 0.5, rotation: 0, scale: 1.0 };
    }

    // ── Color Helpers ──

    _lighten(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const nr = Math.min(255, Math.round(r + (255 - r) * amount));
        const ng = Math.min(255, Math.round(g + (255 - g) * amount));
        const nb = Math.min(255, Math.round(b + (255 - b) * amount));
        return '#' + [nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    _darken(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const nr = Math.max(0, Math.round(r * (1 - amount)));
        const ng = Math.max(0, Math.round(g * (1 - amount)));
        const nb = Math.max(0, Math.round(b * (1 - amount)));
        return '#' + [nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Draw an accessory to a context. Draws into a 60x60 box, scaled by `scale`.
     */
    drawAccessory(ctx, accessoryId, color, scale) {
        const acc = this.getById(accessoryId);
        if (!acc) return;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2C2416';
        ctx.fillStyle = color;

        const type = accessoryId.replace('acc-', '');
        const draw = this._drawFunctions[type];
        if (draw) {
            draw.call(this, ctx, color);
        } else {
            // Fallback: simple rounded rect
            ctx.beginPath();
            ctx.roundRect(10, 10, 40, 40, 8);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    get _drawFunctions() {
        if (this._drawFunctionsCache) return this._drawFunctionsCache;
        this._drawFunctionsCache = {
            // ── HEAD ──
            'crown': this._drawCrown,
            'tiara': this._drawTiara,
            'party-hat': this._drawPartyHat,
            'top-hat': this._drawTopHat,
            'beanie': this._drawBeanie,
            'flower-crown': this._drawFlowerCrown,
            'butterfly-clip': this._drawButterflyClip,
            'bow': this._drawBow,
            'headband': this._drawHeadband,
            'princess-cone': this._drawPrincessCone,
            'cat-ears-band': this._drawCatEarsBand,
            'star-hairpin': this._drawStarHairpin,
            // ── NECK ──
            'bow-tie': this._drawBowTie,
            'necklace': this._drawNecklace,
            'scarf': this._drawScarf,
            'feather-boa': this._drawFeatherBoa,
            'ribbon': this._drawRibbon,
            'collar-bell': this._drawCollarBell,
            'lei': this._drawLei,
            'medal': this._drawMedal,
            // ── BODY ──
            'cape': this._drawCape,
            'vest': this._drawVest,
            'tutu': this._drawTutu,
            'dress': this._drawDress,
            'armor': this._drawArmor,
            'saddle': this._drawSaddle,
            'backpack': this._drawBackpack,
            'fairy-wings-deco': this._drawFairyWingsDeco,
            'superhero-cape': this._drawSuperheroCape,
            'sweater': this._drawSweater,
            // ── FEET ──
            'boots': this._drawBoots,
            'socks': this._drawSocks,
            'leg-warmers': this._drawLegWarmers,
            'anklets': this._drawAnklets,
            'slippers': this._drawSlippers,
            'roller-skates': this._drawRollerSkates,
            // ── FACE ──
            'glasses': this._drawGlasses,
            'heart-sunglasses': this._drawHeartSunglasses,
            'star-sunglasses': this._drawStarSunglasses,
            'monocle': this._drawMonocle,
            'masquerade-mask': this._drawMasqueradeMask,
            'nose-ring': this._drawNoseRing
        };
        return this._drawFunctionsCache;
    }

    // ══════════════════════════════════════════════════════
    // ── HEAD ACCESSORIES ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawCrown(ctx, color) {
        ctx.beginPath();
        ctx.moveTo(10, 45);
        ctx.lineTo(10, 20);
        ctx.lineTo(18, 30);
        ctx.lineTo(25, 10);
        ctx.lineTo(30, 25);
        ctx.lineTo(35, 10);
        ctx.lineTo(42, 30);
        ctx.lineTo(50, 20);
        ctx.lineTo(50, 45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Gems at peaks
        ctx.fillStyle = '#FFD700';
        for (const x of [25, 35]) {
            ctx.beginPath();
            ctx.arc(x, 14, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawTiara(ctx, color) {
        ctx.beginPath();
        ctx.arc(30, 40, 22, Math.PI, 0, false);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.lineWidth = 3;
        // Center jewel
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.ellipse(30, 22, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Side sparkles
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath(); ctx.arc(18, 30, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(42, 30, 2, 0, Math.PI * 2); ctx.fill();
    }

    _drawPartyHat(ctx, color) {
        ctx.beginPath();
        ctx.moveTo(15, 52);
        ctx.lineTo(30, 8);
        ctx.lineTo(45, 52);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Stripes
        ctx.strokeStyle = this._lighten(color, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, 40); ctx.lineTo(40, 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(23, 30); ctx.lineTo(37, 30); ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
        // Pom-pom
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(30, 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawTopHat(ctx, color) {
        // Brim
        ctx.beginPath();
        ctx.ellipse(30, 48, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Body
        ctx.fillRect(16, 15, 28, 34);
        ctx.strokeRect(16, 15, 28, 34);
        // Band
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.fillRect(16, 38, 28, 6);
        ctx.strokeRect(16, 38, 28, 6);
    }

    _drawBeanie(ctx, color) {
        ctx.beginPath();
        ctx.arc(30, 38, 22, Math.PI, 0, false);
        ctx.lineTo(52, 50);
        ctx.lineTo(8, 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Fold line
        ctx.strokeStyle = this._darken(color, 0.2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 46);
        ctx.lineTo(50, 46);
        ctx.stroke();
    }

    _drawFlowerCrown(ctx, color) {
        // Band arc
        ctx.strokeStyle = '#27AE60';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(30, 45, 22, Math.PI, 0, false);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
        // 5 flowers along the arc
        const flowerPositions = [
            { x: 12, y: 38 }, { x: 20, y: 28 }, { x: 30, y: 24 },
            { x: 40, y: 28 }, { x: 48, y: 38 }
        ];
        const petalColors = [color, this._lighten(color, 0.3), color, this._lighten(color, 0.2), color];
        for (let fi = 0; fi < flowerPositions.length; fi++) {
            const fp = flowerPositions[fi];
            ctx.fillStyle = petalColors[fi];
            for (let p = 0; p < 5; p++) {
                const angle = (p / 5) * Math.PI * 2;
                const px = fp.x + Math.cos(angle) * 4;
                const py = fp.y + Math.sin(angle) * 4;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            // Center
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawButterflyClip(ctx, color) {
        // Offset to the right
        const cx = 35, cy = 30;
        // Wings (4 ovals)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.ellipse(cx - 8, cy - 6, 8, 10, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + 8, cy - 6, 8, 10, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx - 6, cy + 6, 6, 7, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + 6, cy + 6, 6, 7, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
        // Body
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 14);
        ctx.lineTo(cx, cy + 14);
        ctx.stroke();
        // Antennae
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.quadraticCurveTo(cx - 6, cy - 22, cx - 8, cy - 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.quadraticCurveTo(cx + 6, cy - 22, cx + 8, cy - 20); ctx.stroke();
    }

    _drawBow(ctx, color) {
        // Left loop
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.quadraticCurveTo(10, 15, 10, 30);
        ctx.quadraticCurveTo(10, 45, 30, 30);
        ctx.fill();
        ctx.stroke();
        // Right loop
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.quadraticCurveTo(50, 15, 50, 30);
        ctx.quadraticCurveTo(50, 45, 30, 30);
        ctx.fill();
        ctx.stroke();
        // Center knot
        ctx.fillStyle = this._darken(color, 0.2);
        ctx.beginPath();
        ctx.arc(30, 30, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawHeadband(ctx, color) {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(30, 45, 24, Math.PI + 0.3, -0.3, false);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(30, 45, 24, Math.PI + 0.3, -0.3, false);
        ctx.stroke();
    }

    _drawPrincessCone(ctx, color) {
        // Tall cone
        ctx.beginPath();
        ctx.moveTo(18, 55);
        ctx.lineTo(30, 5);
        ctx.lineTo(42, 55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Star at tip
        ctx.fillStyle = '#FFD700';
        this._drawStarShape(ctx, 30, 8, 5);
        ctx.fill();
        ctx.stroke();
        // Veil curve at base
        ctx.strokeStyle = this._lighten(color, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 5);
        ctx.quadraticCurveTo(55, 20, 50, 40);
        ctx.stroke();
    }

    _drawCatEarsBand(ctx, color) {
        // Headband arc
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(30, 48, 22, Math.PI, 0, false);
        ctx.stroke();
        // Left ear triangle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(10, 38);
        ctx.lineTo(16, 15);
        ctx.lineTo(24, 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner ear
        ctx.fillStyle = this._lighten(color, 0.4);
        ctx.beginPath();
        ctx.moveTo(13, 35);
        ctx.lineTo(16, 22);
        ctx.lineTo(21, 33);
        ctx.closePath();
        ctx.fill();
        // Right ear triangle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(36, 35);
        ctx.lineTo(44, 15);
        ctx.lineTo(50, 38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = this._lighten(color, 0.4);
        ctx.beginPath();
        ctx.moveTo(39, 33);
        ctx.lineTo(44, 22);
        ctx.lineTo(47, 35);
        ctx.closePath();
        ctx.fill();
    }

    _drawStarHairpin(ctx, color) {
        // Pin line (offset to one side)
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(35, 50);
        ctx.lineTo(35, 30);
        ctx.stroke();
        // Star at top
        ctx.fillStyle = color;
        this._drawStarShape(ctx, 35, 22, 10);
        ctx.fill();
        ctx.stroke();
    }

    // ══════════════════════════════════════════════════════
    // ── NECK ACCESSORIES ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawBowTie(ctx, color) {
        // Left triangle
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(10, 18);
        ctx.lineTo(10, 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right triangle
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(50, 18);
        ctx.lineTo(50, 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Center knot
        ctx.fillStyle = this._darken(color, 0.2);
        ctx.beginPath();
        ctx.arc(30, 30, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawNecklace(ctx, color) {
        // Chain U-curve
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(30, 15, 22, 0.2, Math.PI - 0.2, false);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        // Pendant
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.arc(30, 37, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawScarf(ctx, color) {
        // Draped rectangle
        ctx.beginPath();
        ctx.roundRect(12, 20, 36, 14, 6);
        ctx.fill();
        ctx.stroke();
        // Hanging end
        ctx.beginPath();
        ctx.roundRect(32, 20, 14, 28, 4);
        ctx.fill();
        ctx.stroke();
        // Fringe
        ctx.lineWidth = 2;
        for (let x = 35; x <= 43; x += 4) {
            ctx.beginPath();
            ctx.moveTo(x, 48);
            ctx.lineTo(x, 54);
            ctx.stroke();
        }
    }

    _drawFeatherBoa(ctx, color) {
        // Fluffy zigzag
        ctx.lineWidth = 2;
        const points = [];
        for (let i = 0; i <= 6; i++) {
            const x = 8 + i * 7.3;
            const y = 30 + (i % 2 === 0 ? -5 : 5);
            points.push({ x, y });
        }
        ctx.fillStyle = color;
        for (const p of points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        // Outline arcs
        ctx.strokeStyle = '#2C2416';
        for (const p of points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawRibbon(ctx, color) {
        // Loop
        ctx.beginPath();
        ctx.ellipse(30, 25, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tails
        ctx.beginPath();
        ctx.moveTo(24, 33);
        ctx.quadraticCurveTo(20, 50, 15, 52);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(36, 33);
        ctx.quadraticCurveTo(40, 50, 45, 52);
        ctx.stroke();
    }

    _drawCollarBell(ctx, color) {
        // Band arc
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(30, 20, 20, 0.1, Math.PI - 0.1, false);
        ctx.stroke();
        ctx.lineWidth = 3;
        // Bell
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(30, 42, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bell slit
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 37);
        ctx.lineTo(30, 47);
        ctx.stroke();
    }

    _drawLei(ctx, color) {
        // Arc of alternating flower circles
        const colors = [color, this._lighten(color, 0.3), '#FFFFFF', color, this._lighten(color, 0.2)];
        for (let i = 0; i < 7; i++) {
            const angle = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
            const x = 30 + Math.cos(angle) * 22;
            const y = 18 + Math.sin(angle) * 18;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawMedal(ctx, color) {
        // Ribbon V
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(20, 10);
        ctx.lineTo(30, 28);
        ctx.lineTo(40, 10);
        ctx.lineTo(44, 10);
        ctx.lineTo(30, 32);
        ctx.lineTo(16, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Circle medal
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(30, 40, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Star on medal
        ctx.fillStyle = this._darken('#FFD700', 0.15);
        this._drawStarShape(ctx, 30, 40, 6);
        ctx.fill();
    }

    // ══════════════════════════════════════════════════════
    // ── BODY ACCESSORIES ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawCape(ctx, color) {
        ctx.beginPath();
        ctx.moveTo(18, 8);
        ctx.lineTo(12, 52);
        ctx.quadraticCurveTo(20, 56, 30, 55);
        ctx.quadraticCurveTo(40, 56, 48, 52);
        ctx.lineTo(42, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Clasp
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(30, 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawVest(ctx, color) {
        // Body
        ctx.beginPath();
        ctx.roundRect(14, 10, 32, 40, 4);
        ctx.fill();
        ctx.stroke();
        // Open front (draw cream line down center)
        ctx.strokeStyle = '#F5F0E8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(30, 10);
        ctx.lineTo(30, 50);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
        // Lapel lines
        ctx.beginPath();
        ctx.moveTo(28, 10);
        ctx.lineTo(24, 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(32, 10);
        ctx.lineTo(36, 22);
        ctx.stroke();
    }

    _drawTutu(ctx, color) {
        // Series of scallop arcs
        for (let i = 0; i < 7; i++) {
            const x = 6 + i * 8;
            ctx.fillStyle = i % 2 === 0 ? color : this._lighten(color, 0.2);
            ctx.beginPath();
            ctx.ellipse(x, 30, 8, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawDress(ctx, color) {
        // A-line shape
        ctx.beginPath();
        ctx.moveTo(22, 8);
        ctx.lineTo(10, 52);
        ctx.lineTo(50, 52);
        ctx.lineTo(38, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Collar
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.ellipse(30, 10, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawArmor(ctx, color) {
        // Chest plate
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(10, 50);
        ctx.lineTo(50, 50);
        ctx.lineTo(45, 10);
        ctx.quadraticCurveTo(30, 5, 15, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Cross lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 12);
        ctx.lineTo(30, 48);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(14, 30);
        ctx.lineTo(46, 30);
        ctx.stroke();
    }

    _drawSaddle(ctx, color) {
        // Curved body
        ctx.beginPath();
        ctx.ellipse(30, 28, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Pommel bump
        ctx.beginPath();
        ctx.arc(14, 24, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stirrups
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(14, 50, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(46, 50, 4, 0, Math.PI * 2);
        ctx.stroke();
        // Straps
        ctx.beginPath();
        ctx.moveTo(14, 42);
        ctx.lineTo(14, 46);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(46, 42);
        ctx.lineTo(46, 46);
        ctx.stroke();
    }

    _drawBackpack(ctx, color) {
        // Main body
        ctx.beginPath();
        ctx.roundRect(14, 12, 32, 38, 8);
        ctx.fill();
        ctx.stroke();
        // Pocket
        ctx.fillStyle = this._darken(color, 0.15);
        ctx.beginPath();
        ctx.roundRect(20, 30, 20, 14, 4);
        ctx.fill();
        ctx.stroke();
        // Straps
        ctx.lineWidth = 4;
        ctx.strokeStyle = this._darken(color, 0.2);
        ctx.beginPath();
        ctx.moveTo(20, 12);
        ctx.lineTo(16, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(40, 12);
        ctx.lineTo(44, 4);
        ctx.stroke();
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 3;
        // Buckle
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(27, 28, 6, 4);
        ctx.strokeRect(27, 28, 6, 4);
    }

    _drawFairyWingsDeco(ctx, color) {
        const oldAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        // Left wing
        ctx.beginPath();
        ctx.ellipse(18, 25, 14, 20, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right wing
        ctx.beginPath();
        ctx.ellipse(42, 25, 14, 20, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Lower wings
        ctx.beginPath();
        ctx.ellipse(20, 42, 10, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(40, 42, 10, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = oldAlpha;
    }

    _drawSuperheroCape(ctx, color) {
        ctx.beginPath();
        ctx.moveTo(15, 5);
        ctx.quadraticCurveTo(5, 35, 10, 55);
        ctx.quadraticCurveTo(30, 50, 50, 55);
        ctx.quadraticCurveTo(55, 35, 45, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Emblem circle
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.arc(30, 25, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawSweater(ctx, color) {
        // Body
        ctx.beginPath();
        ctx.roundRect(12, 10, 36, 36, 6);
        ctx.fill();
        ctx.stroke();
        // Sleeves
        ctx.beginPath();
        ctx.roundRect(4, 14, 12, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(44, 14, 12, 20, 5);
        ctx.fill();
        ctx.stroke();
        // Ribbing lines at neck
        ctx.lineWidth = 2;
        ctx.strokeStyle = this._darken(color, 0.2);
        ctx.beginPath();
        ctx.moveTo(20, 12);
        ctx.lineTo(40, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(18, 15);
        ctx.lineTo(42, 15);
        ctx.stroke();
    }

    // ══════════════════════════════════════════════════════
    // ── FEET ACCESSORIES ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawBoots(ctx, color) {
        // Left boot
        ctx.beginPath();
        ctx.roundRect(8, 20, 16, 28, 4);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(4, 42, 22, 10, 4);
        ctx.fill();
        ctx.stroke();
        // Right boot
        ctx.beginPath();
        ctx.roundRect(36, 20, 16, 28, 4);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(34, 42, 22, 10, 4);
        ctx.fill();
        ctx.stroke();
    }

    _drawSocks(ctx, color) {
        // Left sock
        ctx.beginPath();
        ctx.roundRect(10, 18, 14, 30, 6);
        ctx.fill();
        ctx.stroke();
        // Ribbed top
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(10, 22); ctx.lineTo(24, 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 25); ctx.lineTo(24, 25); ctx.stroke();
        // Right sock
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(36, 18, 14, 30, 6);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(36, 22); ctx.lineTo(50, 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(36, 25); ctx.lineTo(50, 25); ctx.stroke();
    }

    _drawLegWarmers(ctx, color) {
        // Left
        ctx.beginPath();
        ctx.roundRect(10, 16, 14, 34, 5);
        ctx.fill();
        ctx.stroke();
        // Horizontal scrunch lines
        ctx.lineWidth = 1.5;
        for (let y = 22; y <= 44; y += 5) {
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(24, y);
            ctx.stroke();
        }
        // Right
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(36, 16, 14, 34, 5);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (let y = 22; y <= 44; y += 5) {
            ctx.beginPath();
            ctx.moveTo(36, y);
            ctx.lineTo(50, y);
            ctx.stroke();
        }
    }

    _drawAnklets(ctx, color) {
        // Chain of circles around ankle
        ctx.fillStyle = color;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = 20 + Math.cos(angle) * 8;
            const y = 35 + Math.sin(angle) * 8;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        // Second anklet
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = 40 + Math.cos(angle) * 8;
            const y = 35 + Math.sin(angle) * 8;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _drawSlippers(ctx, color) {
        // Left slipper
        ctx.beginPath();
        ctx.ellipse(17, 40, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Pom-pom
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.arc(17, 34, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right slipper
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(43, 40, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = this._lighten(color, 0.3);
        ctx.beginPath();
        ctx.arc(43, 34, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _drawRollerSkates(ctx, color) {
        // Left boot
        ctx.beginPath();
        ctx.roundRect(6, 16, 18, 22, 4);
        ctx.fill();
        ctx.stroke();
        // Wheels
        ctx.fillStyle = '#2C2416';
        for (const wx of [9, 17, 25]) {
            ctx.beginPath();
            ctx.arc(wx, 46, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        // Right boot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(34, 16, 18, 22, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#2C2416';
        for (const wx of [37, 45, 53]) {
            ctx.beginPath();
            ctx.arc(wx, 46, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    // ══════════════════════════════════════════════════════
    // ── FACE ACCESSORIES ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawGlasses(ctx, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        // Left lens
        ctx.beginPath();
        ctx.arc(20, 30, 10, 0, Math.PI * 2);
        ctx.stroke();
        // Right lens
        ctx.beginPath();
        ctx.arc(40, 30, 10, 0, Math.PI * 2);
        ctx.stroke();
        // Bridge
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(30, 30);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(30, 28, 4, 0, Math.PI, true);
        ctx.stroke();
        // Arms
        ctx.beginPath();
        ctx.moveTo(10, 30);
        ctx.lineTo(4, 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(56, 28);
        ctx.stroke();
    }

    _drawHeartSunglasses(ctx, color) {
        ctx.fillStyle = color;
        // Left heart
        this._drawHeartShape(ctx, 20, 30, 10);
        ctx.fill();
        ctx.stroke();
        // Right heart
        this._drawHeartShape(ctx, 40, 30, 10);
        ctx.fill();
        ctx.stroke();
        // Bridge
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, 26, 4, 0, Math.PI, true);
        ctx.stroke();
    }

    _drawStarSunglasses(ctx, color) {
        ctx.fillStyle = color;
        // Left star
        this._drawStarShape(ctx, 20, 30, 10);
        ctx.fill();
        ctx.stroke();
        // Right star
        this._drawStarShape(ctx, 40, 30, 10);
        ctx.fill();
        ctx.stroke();
        // Bridge
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, 26, 4, 0, Math.PI, true);
        ctx.stroke();
    }

    _drawMonocle(ctx, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        // Circle
        ctx.beginPath();
        ctx.arc(30, 28, 12, 0, Math.PI * 2);
        ctx.stroke();
        // Chain curve
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 40);
        ctx.quadraticCurveTo(25, 52, 20, 55);
        ctx.stroke();
    }

    _drawMasqueradeMask(ctx, color) {
        ctx.fillStyle = color;
        // Mask body
        ctx.beginPath();
        ctx.moveTo(8, 30);
        ctx.quadraticCurveTo(8, 18, 20, 18);
        ctx.quadraticCurveTo(30, 15, 40, 18);
        ctx.quadraticCurveTo(52, 18, 52, 30);
        ctx.quadraticCurveTo(52, 38, 40, 38);
        ctx.quadraticCurveTo(30, 40, 20, 38);
        ctx.quadraticCurveTo(8, 38, 8, 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Eye holes
        ctx.fillStyle = '#F5F0E8';
        ctx.beginPath();
        ctx.ellipse(22, 28, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(38, 28, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stick
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(52, 32);
        ctx.lineTo(58, 48);
        ctx.stroke();
    }

    _drawNoseRing(ctx, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, 38, 8, 0.3, Math.PI - 0.3, false);
        ctx.stroke();
        // Small bead at opening
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(30 + Math.cos(0.3) * 8, 38 + Math.sin(0.3) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ══════════════════════════════════════════════════════
    // ── Shape Helpers ────────────────────────────────────
    // ══════════════════════════════════════════════════════

    _drawStarShape(ctx, cx, cy, size) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / 5;
            const ox = cx + Math.cos(outerAngle) * size;
            const oy = cy + Math.sin(outerAngle) * size;
            const ix = cx + Math.cos(innerAngle) * size * 0.4;
            const iy = cy + Math.sin(innerAngle) * size * 0.4;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();
    }

    _drawHeartShape(ctx, cx, cy, size) {
        const s = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.6);
        ctx.bezierCurveTo(cx, cy - s * 0.4, cx - s * 1.2, cy - s * 0.4, cx - s * 1.2, cy + s * 0.1);
        ctx.bezierCurveTo(cx - s * 1.2, cy + s * 0.8, cx, cy + s * 1.2, cx, cy + s * 1.2);
        ctx.bezierCurveTo(cx, cy + s * 1.2, cx + s * 1.2, cy + s * 0.8, cx + s * 1.2, cy + s * 0.1);
        ctx.bezierCurveTo(cx + s * 1.2, cy - s * 0.4, cx, cy - s * 0.4, cx, cy + s * 0.6);
        ctx.closePath();
    }
}
