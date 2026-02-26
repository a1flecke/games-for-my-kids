/**
 * Keyboard Command 4 — LevelManager
 * Loads level JSON, manages room progression, renders canvas corridor transitions.
 *
 * Transition rendering is driven by the game loop — no independent RAF chains.
 * The game loop calls updateTransition(now) + drawTransition(ctx, w, h) each frame.
 */

class LevelManager {
    constructor() {
        this._rooms = [];
        this._currentRoomIndex = 0;
        this._levelId = null;
        this._levelData = null;

        // Transition state machine
        this._isTransitioning = false;
        this._transitionPhase = null; // 'fade-out', 'corridor', 'title-card', 'fade-in'
        this._phaseStartTime = 0;
        this._phaseDuration = 0;
        this._phaseSequence = [];  // remaining [{phase, duration}] entries
        this._midpointFired = false;

        // Theme/visual config for current transition
        this._corridorTheme = null;
        this._corridorItem = null;
        this._corridorBossName = null;
        this._corridorRedTint = false;

        // Callbacks
        this._onMidpoint = null;
        this._onComplete = null;
    }

    // ----------------------------------------------------------
    // Level Loading
    // ----------------------------------------------------------

    async loadLevel(id) {
        this._levelId = id;
        this._currentRoomIndex = 0;
        this._levelData = null;

        try {
            const resp = await fetch(`data/levels/level${id + 1}.json`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            this._levelData = await resp.json();
            this._rooms = this._levelData.rooms || [];
        } catch {
            // JSON doesn't exist yet — fall back to generated rooms
            this._rooms = this._generateTestRooms(id);
            this._levelData = { rooms: this._rooms, items: [] };
        }

        return this._rooms;
    }

    // ----------------------------------------------------------
    // Room Accessors
    // ----------------------------------------------------------

    getItems() {
        if (this._levelData && this._levelData.items) {
            return this._levelData.items;
        }
        return [];
    }

    // ----------------------------------------------------------
    // Standard Room Transition
    // ----------------------------------------------------------

    startTransition(fromRoomIdx, toRoomIdx, theme, onMidpoint, onComplete) {
        if (this._isTransitioning) return;
        this.cancel();

        this._isTransitioning = true;
        this._corridorTheme = theme;
        this._corridorRedTint = false;
        this._corridorBossName = null;
        this._midpointFired = false;
        this._onMidpoint = onMidpoint;
        this._onComplete = onComplete;

        // Check for item pickup in this corridor
        this._corridorItem = null;
        const items = this.getItems();
        for (const item of items) {
            if (item.after_room === fromRoomIdx) {
                this._corridorItem = item;
                break;
            }
        }

        // Phase sequence: fade-out → corridor → (midpoint fires) → fade-in
        this._phaseSequence = [
            { phase: 'fade-out', duration: 300 },
            { phase: 'corridor', duration: 500 },
            { phase: 'fade-in', duration: 300 }
        ];
        this._startNextPhase();
    }

    // ----------------------------------------------------------
    // Boss Transition
    // ----------------------------------------------------------

    startBossTransition(theme, bossName, onComplete) {
        if (this._isTransitioning) return;
        this.cancel();

        this._isTransitioning = true;
        this._corridorTheme = theme;
        this._corridorRedTint = true;
        this._corridorBossName = bossName;
        this._corridorItem = null;
        this._midpointFired = false;
        this._onMidpoint = null;
        this._onComplete = onComplete;

        // Phase sequence: fade-out → corridor → title-card → fade-in
        this._phaseSequence = [
            { phase: 'fade-out', duration: 300 },
            { phase: 'corridor', duration: 800 },
            { phase: 'title-card', duration: 2000 },
            { phase: 'fade-in', duration: 300 }
        ];
        this._startNextPhase();
    }

    // ----------------------------------------------------------
    // Phase State Machine (driven by game loop)
    // ----------------------------------------------------------

    _startNextPhase() {
        if (this._phaseSequence.length === 0) {
            this._finishTransition();
            return;
        }
        const next = this._phaseSequence.shift();
        this._transitionPhase = next.phase;
        this._phaseDuration = next.duration;
        this._phaseStartTime = performance.now();
    }

    /**
     * Called by the game loop each frame during TRANSITION state.
     * Advances the phase state machine.
     */
    updateTransition(now) {
        if (!this._isTransitioning || !this._transitionPhase) return;

        const elapsed = now - this._phaseStartTime;

        if (elapsed >= this._phaseDuration) {
            const finishedPhase = this._transitionPhase;

            // Fire midpoint callback between corridor and fade-in
            if (finishedPhase === 'corridor' && !this._midpointFired) {
                this._midpointFired = true;
                const midCb = this._onMidpoint;
                if (midCb) midCb(this._corridorItem);
            }

            this._startNextPhase();
        }
    }

    /**
     * Called by the game loop each frame during TRANSITION state.
     * Draws the transition overlay/scene to the provided context.
     * Returns true if it drew a full scene (corridor/title-card),
     * false if it drew an overlay (fade) that composites on top of the room.
     */
    drawTransition(ctx, w, h, now) {
        if (!this._isTransitioning || !this._transitionPhase) return false;

        const elapsed = now - this._phaseStartTime;
        const progress = Math.min(1, elapsed / this._phaseDuration);

        switch (this._transitionPhase) {
            case 'fade-out': {
                // Black overlay with increasing alpha — composites on room
                ctx.save();
                ctx.fillStyle = `rgba(0, 0, 0, ${progress})`;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                return false;
            }
            case 'corridor': {
                this._drawCorridor(ctx, w, h, progress);
                return true;
            }
            case 'title-card': {
                this._drawBossTitleCard(ctx, w, h, progress);
                return true;
            }
            case 'fade-in': {
                // Black overlay with decreasing alpha — composites on room
                ctx.save();
                ctx.fillStyle = `rgba(0, 0, 0, ${1 - progress})`;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                return false;
            }
        }
        return false;
    }

    // ----------------------------------------------------------
    // Corridor Rendering
    // ----------------------------------------------------------

    _drawCorridor(ctx, w, h, progress) {
        const theme = this._corridorTheme;
        if (!theme) return;

        // Clear to black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Horizontal pan offset
        const panOffset = progress * 120;

        // Perspective parameters
        const vpX = w / 2;
        const vpY = h * 0.35;
        const corridorWidth = 180;
        const farScale = 0.3;

        // Ceiling
        ctx.fillStyle = theme.ceiling;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(vpX + corridorWidth, vpY);
        ctx.lineTo(vpX - corridorWidth, vpY);
        ctx.closePath();
        ctx.fill();

        // Floor
        ctx.fillStyle = theme.floor;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.lineTo(vpX + corridorWidth, vpY + (h - vpY) * farScale);
        ctx.lineTo(vpX - corridorWidth, vpY + (h - vpY) * farScale);
        ctx.closePath();
        ctx.fill();

        // Left wall
        ctx.fillStyle = theme.wall;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(vpX - corridorWidth, vpY);
        ctx.lineTo(vpX - corridorWidth, vpY + (h - vpY) * farScale);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Right wall
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(vpX + corridorWidth, vpY);
        ctx.lineTo(vpX + corridorWidth, vpY + (h - vpY) * farScale);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Floor perspective lines (scrolling)
        ctx.strokeStyle = this._lighten(theme.floor, 0.08);
        ctx.lineWidth = 1;
        const floorTop = vpY + (h - vpY) * farScale;
        for (let i = 0; i < 10; i++) {
            const t = ((i / 10) + (panOffset / 600)) % 1;
            const y = floorTop + (h - floorTop) * t;
            const spread = t;
            const leftX = vpX - corridorWidth - (vpX - corridorWidth) * spread;
            const rightX = vpX + corridorWidth + (w - (vpX + corridorWidth)) * spread;
            ctx.beginPath();
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.stroke();
        }

        // Wall torch accents (scrolling)
        ctx.fillStyle = theme.accent;
        for (let i = 0; i < 3; i++) {
            const t = ((i / 3) + (panOffset / 400)) % 1;
            const wallY = vpY + 20 + (floorTop - vpY - 40) * t;
            const torchScale = 0.5 + t * 0.5;

            const lx = (vpX - corridorWidth) * (1 - t * 0.6);
            ctx.globalAlpha = 0.6 * torchScale;
            ctx.beginPath();
            ctx.arc(lx, wallY, 4 * torchScale, 0, Math.PI * 2);
            ctx.fill();

            const rx = w - lx;
            ctx.beginPath();
            ctx.arc(rx, wallY, 4 * torchScale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Vanishing point glow
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(vpX, vpY + 10, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Red tint for boss transition
        if (this._corridorRedTint) {
            const pulse = 0.15 + Math.sin(progress * Math.PI * 4) * 0.1;
            ctx.fillStyle = `rgba(200, 0, 0, ${pulse})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Corridor item floating
        if (this._corridorItem && progress > 0.3 && progress < 0.8) {
            this._drawCorridorItem(ctx, w, h, progress);
        }
    }

    _drawCorridorItem(ctx, w, h, progress) {
        const item = this._corridorItem;
        if (!item) return;

        const itemProgress = (progress - 0.3) / 0.5;
        const scale = 0.5 + itemProgress * 0.5;
        const bob = Math.sin(itemProgress * Math.PI * 3) * 8;
        const x = w / 2;
        const y = h * 0.45 + bob;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Glow
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();

        if (item.type === 'health') {
            ctx.fillStyle = '#2ECC71';
            ctx.fillRect(-12, -4, 24, 8);
            ctx.fillRect(-4, -12, 8, 24);
        } else if (item.type === 'weapon') {
            ctx.fillStyle = '#3A7BD5';
            ctx.fillRect(-4, -16, 8, 28);
            ctx.fillRect(-10, -4, 20, 6);
        } else {
            // Star shape (pentagram winding)
            ctx.fillStyle = '#F1C40F';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                if (i === 0) ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
                else ctx.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    // ----------------------------------------------------------
    // Boss Title Card
    // ----------------------------------------------------------

    _drawBossTitleCard(ctx, w, h, progress) {
        const bossName = this._corridorBossName || 'BOSS';

        // Dark red background
        ctx.fillStyle = '#0A0000';
        ctx.fillRect(0, 0, w, h);

        // Red vignette
        const pulse = 0.3 + Math.sin(progress * Math.PI * 2) * 0.15;
        ctx.fillStyle = `rgba(180, 0, 0, ${pulse})`;
        ctx.fillRect(0, 0, w, h);

        // Boss name — scale in
        const nameScale = progress < 0.3 ? progress / 0.3 : 1;
        const fadeOut = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1;

        ctx.save();
        ctx.translate(w / 2, h * 0.4);
        ctx.scale(nameScale, nameScale);
        ctx.globalAlpha = fadeOut;
        ctx.font = 'bold 48px OpenDyslexic, "Comic Sans MS", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FF1744';
        ctx.fillText(bossName, 0, 0);

        ctx.font = '24px OpenDyslexic, "Comic Sans MS", cursive';
        ctx.fillStyle = '#FF8A80';
        ctx.fillText('APPROACHES', 0, 50);
        ctx.restore();
    }

    // ----------------------------------------------------------
    // Transition Finish & Cancel
    // ----------------------------------------------------------

    _finishTransition() {
        const cb = this._onComplete;
        this._isTransitioning = false;
        this._transitionPhase = null;
        this._onMidpoint = null;
        this._onComplete = null;
        this._corridorItem = null;
        this._corridorBossName = null;
        this._corridorRedTint = false;
        this._phaseSequence = [];
        if (cb) cb();
    }

    cancel() {
        this._isTransitioning = false;
        this._transitionPhase = null;
        this._phaseSequence = [];
        this._onMidpoint = null;
        this._onComplete = null;
        this._corridorItem = null;
        this._corridorBossName = null;
        this._corridorRedTint = false;
    }

    // ----------------------------------------------------------
    // Test Room Generation (fallback until JSON files exist)
    // ----------------------------------------------------------

    _generateTestRooms(levelId) {
        const rooms = [];
        const roomCount = 3 + Math.floor(levelId / 3);

        for (let r = 0; r < roomCount; r++) {
            const waves = [];
            const waveCount = 2 + Math.floor(Math.random() * 2);

            for (let w = 0; w < waveCount; w++) {
                const monsterDefs = [];
                const types = ['gremlin', 'gremlin', 'gremlin', 'brute', 'shifter', 'mage', 'knight'];
                const count = 2 + Math.floor(Math.random() * 3);

                for (let m = 0; m < count; m++) {
                    const typeIdx = Math.min(
                        Math.floor(Math.random() * Math.min(types.length, 3 + levelId)),
                        types.length - 1
                    );
                    monsterDefs.push({
                        type: types[typeIdx],
                        depth: 0.15 + Math.random() * 0.4,
                        offsetX: (m - (count - 1) / 2) * 80
                    });
                }

                waves.push({
                    monsters: monsterDefs,
                    delay: w === 0 ? 0 : 1.0
                });
            }

            rooms.push({ waves });
        }

        // Last room has a boss
        const bossRoom = rooms[rooms.length - 1];
        bossRoom.boss = {
            name: 'Bug Lord',
            hp: 3
        };

        return rooms;
    }

    // ----------------------------------------------------------
    // Color Utility
    // ----------------------------------------------------------

    _lighten(hex, amount) {
        if (!hex || hex[0] !== '#') return hex;
        const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.floor(255 * amount));
        const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.floor(255 * amount));
        const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}
