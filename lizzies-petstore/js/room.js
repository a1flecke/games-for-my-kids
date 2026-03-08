/**
 * room.js — Room decoration editor.
 * Renders room background with wall color + floor pattern, placed items, and creature.
 * Handles drag-to-reposition for placed items via pointer events.
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 *
 * State:
 *   _enterState('ROOM_EDIT') in game.js calls startEditing(creature)
 *   _exitState('ROOM_EDIT') calls cancel() and saves room data
 *
 * Input:
 *   Canvas pointer events for dragging placed items
 *   DOM buttons for catalog, wall color, floor pattern
 */

/**
 * Room item catalog — defines all placeable items.
 * Each has a type, emoji (for strip thumbnail), and draw function name.
 */
const ROOM_ITEM_CATALOG = [
    { type: 'bed',        emoji: '🛏️', label: 'Bed' },
    { type: 'food-bowl',  emoji: '🍽️', label: 'Food Bowl' },
    { type: 'toy-ball',   emoji: '⚽',  label: 'Toy Ball' },
    { type: 'plant',      emoji: '🌿',  label: 'Plant' },
    { type: 'picture',    emoji: '🖼️', label: 'Picture' },
    { type: 'rug',        emoji: '🟫',  label: 'Rug' },
    { type: 'lamp',       emoji: '💡',  label: 'Lamp' },
    { type: 'bookshelf',  emoji: '📚',  label: 'Bookshelf' }
];

const WALL_COLORS = [
    '#FFE4E1', '#E8D5E0', '#D5E8D5', '#D5E0E8',
    '#F5E6CC', '#E8E0D6', '#F0D5D5', '#D5D5F0'
];

const FLOOR_PATTERNS = ['wood', 'carpet', 'tiles'];

class RoomManager {
    constructor() {
        this._creature = null;
        this._roomData = null;
        this._maxItems = 8;

        // Drag state
        this._dragging = null;      // { index, offsetX, offsetY } or null
        this._selectedIndex = -1;   // tapped item index for highlighting/removal
        this._canvasBound = false;

        // Cached floor pattern offscreen canvas
        this._floorCache = null;
        this._floorCachePattern = null;
        this._floorCacheW = 0;
        this._floorCacheH = 0;
    }

    /**
     * Enter room edit mode for a creature.
     */
    startEditing(creature) {
        this.cancel();
        this._creature = creature;
        this._roomData = creature ? {
            ...creature.room,
            items: (creature.room.items || []).map(i => ({ ...i }))
        } : null;

        // Ensure floorPattern exists
        if (this._roomData && !this._roomData.floorPattern) {
            this._roomData.floorPattern = 'wood';
        }
        // Ensure items array
        if (this._roomData && !this._roomData.items) {
            this._roomData.items = [];
        }

        this._selectedIndex = -1;
        this._dragging = null;
        this._floorCache = null;

        this._bindCanvasInput();
    }

    /**
     * Get current room data for saving.
     */
    getRoomData() {
        return this._roomData;
    }

    /**
     * Cancel / cleanup.
     */
    cancel() {
        this._unbindCanvasInput();
        this._creature = null;
        this._roomData = null;
        this._dragging = null;
        this._selectedIndex = -1;
    }

    _unbindCanvasInput() {
        if (!this._canvasBound) return;
        const canvas = document.getElementById('room-canvas');
        if (canvas) {
            canvas.removeEventListener('pointerdown', this._onPointerDown);
            canvas.removeEventListener('pointermove', this._onPointerMove);
            canvas.removeEventListener('pointerup', this._onPointerUp);
        }
        this._canvasBound = false;
    }

    /**
     * Place a room item at a default position.
     * Returns false if at max items.
     */
    addItem(type) {
        if (!this._roomData) return false;
        if (this._roomData.items.length >= this._maxItems) return false;

        // Default position: center of floor area
        this._roomData.items.push({ type, x: 0.5, y: 0.78 });
        this._selectedIndex = this._roomData.items.length - 1;
        this._saveRoom();
        return true;
    }

    /**
     * Remove item at index.
     */
    removeItem(index) {
        if (!this._roomData) return;
        if (index < 0 || index >= this._roomData.items.length) return;
        this._roomData.items.splice(index, 1);
        this._selectedIndex = -1;
        this._saveRoom();
    }

    /**
     * Set wall color.
     */
    setWallColor(color) {
        if (!this._roomData) return;
        this._roomData.wallColor = color;
        this._saveRoom();
    }

    /**
     * Set floor pattern.
     */
    setFloorPattern(pattern) {
        if (!this._roomData) return;
        this._roomData.floorPattern = pattern;
        this._floorCache = null; // invalidate
        this._saveRoom();
    }

    /**
     * Save room data back to creature.
     */
    _saveRoom() {
        if (!this._creature || !this._roomData) return;
        this._creature.room = this._roomData;
        window.saveManager.updateCreature(this._creature.id, { room: this._roomData });
    }

    /**
     * Check if item strip should be dimmed (at max items).
     */
    isAtMaxItems() {
        if (!this._roomData) return false;
        return this._roomData.items.length >= this._maxItems;
    }

    // ── Canvas Pointer Input ─────────────────────────────

    _bindCanvasInput() {
        if (this._canvasBound) return;
        const canvas = document.getElementById('room-canvas');
        if (!canvas) return;

        this._onPointerDown = (e) => this._handlePointerDown(e);
        this._onPointerMove = (e) => this._handlePointerMove(e);
        this._onPointerUp = (e) => this._handlePointerUp(e);

        canvas.addEventListener('pointerdown', this._onPointerDown);
        canvas.addEventListener('pointermove', this._onPointerMove);
        canvas.addEventListener('pointerup', this._onPointerUp);
        this._canvasBound = true;
    }

    _canvasCoords(e) {
        const canvas = document.getElementById('room-canvas');
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1),
            y: (e.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1)
        };
    }

    _handlePointerDown(e) {
        if (!this._roomData) return;
        const pos = this._canvasCoords(e);
        const canvas = document.getElementById('room-canvas');
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Check if tapping the remove X button on a selected item
        if (this._selectedIndex >= 0 && this._selectedIndex < this._roomData.items.length) {
            const selItem = this._roomData.items[this._selectedIndex];
            const sx = selItem.x * w;
            const sy = selItem.y * h;
            // X button is at (sx + 25, sy - 25), 44px hit area
            if (Math.abs(pos.x - (sx + 25)) < 22 && Math.abs(pos.y - (sy - 25)) < 22) {
                this.removeItem(this._selectedIndex);
                // Refresh item strip if game has the method
                if (window.game && window.game._populateRoomItemStrip) {
                    window.game._populateRoomItemStrip();
                }
                window.audioManager.playSound('pop');
                e.preventDefault();
                return;
            }
        }

        // Hit test placed items (reverse order — top items first)
        for (let i = this._roomData.items.length - 1; i >= 0; i--) {
            const item = this._roomData.items[i];
            const ix = item.x * w;
            const iy = item.y * h;
            const hitSize = 44; // WCAG minimum touch target

            if (Math.abs(pos.x - ix) < hitSize && Math.abs(pos.y - iy) < hitSize) {
                this._dragging = {
                    index: i,
                    offsetX: pos.x - ix,
                    offsetY: pos.y - iy
                };
                this._selectedIndex = i;
                canvas.setPointerCapture(e.pointerId);
                e.preventDefault();
                return;
            }
        }

        // Tap on empty area — deselect
        this._selectedIndex = -1;
    }

    _handlePointerMove(e) {
        if (!this._dragging || !this._roomData) return;
        const pos = this._canvasCoords(e);
        const canvas = document.getElementById('room-canvas');
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        const item = this._roomData.items[this._dragging.index];
        if (!item) return;

        // Clamp to room area (floor region: y 0.6-0.95, x 0.05-0.95)
        item.x = Math.max(0.05, Math.min(0.95, (pos.x - this._dragging.offsetX) / w));
        item.y = Math.max(0.6, Math.min(0.95, (pos.y - this._dragging.offsetY) / h));
        e.preventDefault();
    }

    _handlePointerUp(e) {
        if (this._dragging) {
            this._saveRoom();
            this._dragging = null;
        }
    }

    // ── Update / Draw ────────────────────────────────────

    update(dt) {
        // Room edit animations (currently none needed)
    }

    draw(ctx, w, h) {
        if (!this._roomData) return;

        // Wall
        ctx.fillStyle = this._roomData.wallColor || '#FFE4E1';
        ctx.fillRect(0, 0, w, h * 0.6);

        // Floor with pattern
        this._drawFloor(ctx, w, h);

        // Baseboard
        ctx.fillStyle = '#B8A88A';
        ctx.fillRect(0, h * 0.58, w, h * 0.04);

        // Draw placed items
        for (let i = 0; i < this._roomData.items.length; i++) {
            const item = this._roomData.items[i];
            const ix = item.x * w;
            const iy = item.y * h;
            const isSelected = (i === this._selectedIndex);

            this.drawRoomItem(ctx, item.type, ix, iy, w, h, isSelected);
        }

        // Draw creature (centered, smaller than care mode)
        if (this._creature && this._creature.id) {
            const displaySize = Math.min(w, h) * 0.35;
            const cx = w / 2;
            const cy = h * 0.45;

            if (window.creatureCache.hasCache(this._creature.id)) {
                const animState = window.animationEngine.getState(this._creature.id);
                window.creatureCache.drawCreatureById(
                    ctx, cx, cy, animState, displaySize, this._creature.id
                );
            }
        }
    }

    // ── Floor Drawing ────────────────────────────────────

    _drawFloor(ctx, w, h) {
        const pattern = this._roomData.floorPattern || 'wood';
        const floorY = h * 0.6;
        const floorH = h * 0.4;

        // Use cached floor if valid
        if (this._floorCache && this._floorCachePattern === pattern &&
            this._floorCacheW === w && this._floorCacheH === floorH) {
            ctx.drawImage(this._floorCache, 0, floorY);
            return;
        }

        // Build floor cache
        const fc = document.createElement('canvas');
        fc.width = w * (window.devicePixelRatio || 1);
        fc.height = floorH * (window.devicePixelRatio || 1);
        const fctx = fc.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        fctx.scale(dpr, dpr);

        switch (pattern) {
            case 'wood':
                this._drawWoodFloor(fctx, w, floorH);
                break;
            case 'carpet':
                this._drawCarpetFloor(fctx, w, floorH);
                break;
            case 'tiles':
                this._drawTileFloor(fctx, w, floorH);
                break;
        }

        this._floorCache = fc;
        this._floorCachePattern = pattern;
        this._floorCacheW = w;
        this._floorCacheH = floorH;

        ctx.drawImage(fc, 0, floorY);
    }

    _drawWoodFloor(ctx, w, h) {
        ctx.fillStyle = '#D4C4A8';
        ctx.fillRect(0, 0, w, h);

        // Wood plank lines
        ctx.strokeStyle = '#C0B090';
        ctx.lineWidth = 1;
        const plankH = 20;
        for (let y = 0; y < h; y += plankH) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            // Staggered vertical joints
            const offset = (Math.floor(y / plankH) % 2) * 50;
            for (let x = offset; x < w; x += 100) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + plankH);
                ctx.stroke();
            }
        }
    }

    _drawCarpetFloor(ctx, w, h) {
        ctx.fillStyle = '#C8A8B8';
        ctx.fillRect(0, 0, w, h);

        // Subtle carpet texture dots
        ctx.fillStyle = 'rgba(160, 120, 140, 0.3)';
        for (let y = 0; y < h; y += 6) {
            for (let x = (y % 12 === 0 ? 0 : 3); x < w; x += 6) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    _drawTileFloor(ctx, w, h) {
        ctx.fillStyle = '#E0D8D0';
        ctx.fillRect(0, 0, w, h);

        // Tile grid
        ctx.strokeStyle = '#C8C0B8';
        ctx.lineWidth = 1;
        const tileSize = 30;
        for (let y = 0; y < h; y += tileSize) {
            for (let x = 0; x < w; x += tileSize) {
                ctx.strokeRect(x, y, tileSize, tileSize);
            }
        }
    }

    // ── Room Item Drawing ────────────────────────────────

    drawRoomItem(ctx, type, x, y, w, h, selected) {
        ctx.save();

        // Selection highlight
        if (selected) {
            ctx.strokeStyle = '#FF69B4';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(x, y, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Remove X button (44px hit area)
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(x + 25, y - 25, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = "bold 16px OpenDyslexic, 'Comic Sans MS', cursive";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('X', x + 25, y - 25);
        }

        switch (type) {
            case 'bed':         this._drawBed(ctx, x, y); break;
            case 'food-bowl':   this._drawFoodBowl(ctx, x, y); break;
            case 'toy-ball':    this._drawToyBall(ctx, x, y); break;
            case 'plant':       this._drawPlant(ctx, x, y); break;
            case 'picture':     this._drawPicture(ctx, x, y); break;
            case 'rug':         this._drawRug(ctx, x, y); break;
            case 'lamp':        this._drawLamp(ctx, x, y); break;
            case 'bookshelf':   this._drawBookshelf(ctx, x, y); break;
        }

        ctx.restore();
    }

    _drawBed(ctx, x, y) {
        // Bed base
        ctx.fillStyle = '#C8A898';
        ctx.beginPath();
        ctx.roundRect(x - 35, y - 10, 70, 30, 8);
        ctx.fill();
        ctx.strokeStyle = '#A08878';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mattress
        ctx.fillStyle = '#FFE4E1';
        ctx.beginPath();
        ctx.roundRect(x - 30, y - 6, 60, 20, 6);
        ctx.fill();

        // Pillow
        ctx.fillStyle = '#FFFAF5';
        ctx.beginPath();
        ctx.ellipse(x - 18, y + 2, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#E8DDD0';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _drawFoodBowl(ctx, x, y) {
        // Bowl body
        ctx.fillStyle = '#D4C4A8';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 20, 12, 0, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#B8A88A';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bowl rim
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 20, 5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Food dots
        ctx.fillStyle = '#8B6F47';
        for (const dx of [-8, 0, 8, -4, 4]) {
            ctx.beginPath();
            ctx.arc(x + dx, y + 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawToyBall(ctx, x, y) {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#E05555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Star highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawPlant(ctx, x, y) {
        // Pot
        ctx.fillStyle = '#C8785A';
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x - 10, y + 18);
        ctx.lineTo(x + 10, y + 18);
        ctx.lineTo(x + 12, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#A06848';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pot rim
        ctx.fillStyle = '#D08868';
        ctx.fillRect(x - 14, y - 2, 28, 5);

        // Leaves
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 8, y - 6, 5, 10, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 8, y - 6, 5, 10, 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawPicture(ctx, x, y) {
        // Frame
        ctx.fillStyle = '#C8A070';
        ctx.beginPath();
        ctx.roundRect(x - 20, y - 16, 40, 32, 3);
        ctx.fill();
        ctx.strokeStyle = '#A08050';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner picture — simple sky + mountain
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(x - 16, y - 12, 32, 24);

        // Mountain
        ctx.fillStyle = '#7EC850';
        ctx.beginPath();
        ctx.moveTo(x - 16, y + 12);
        ctx.lineTo(x - 4, y - 2);
        ctx.lineTo(x + 8, y + 12);
        ctx.fill();

        // Sun
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + 10, y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawRug(ctx, x, y) {
        // Outer oval
        ctx.fillStyle = '#C8A8B8';
        ctx.beginPath();
        ctx.ellipse(x, y, 35, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#A08898';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner oval (border pattern)
        ctx.fillStyle = '#D8B8C8';
        ctx.beginPath();
        ctx.ellipse(x, y, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawLamp(ctx, x, y) {
        // Lamp post
        ctx.fillStyle = '#B8A88A';
        ctx.fillRect(x - 3, y - 5, 6, 25);

        // Base
        ctx.fillStyle = '#A09888';
        ctx.beginPath();
        ctx.ellipse(x, y + 18, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shade (trapezoid)
        ctx.fillStyle = '#FFE4CC';
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 5);
        ctx.lineTo(x - 16, y - 25);
        ctx.lineTo(x + 16, y - 25);
        ctx.lineTo(x + 10, y - 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#E8D4B8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Light glow
        ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y - 15, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawBookshelf(ctx, x, y) {
        // Shelf frame
        ctx.fillStyle = '#C8A070';
        ctx.beginPath();
        ctx.roundRect(x - 22, y - 20, 44, 40, 3);
        ctx.fill();
        ctx.strokeStyle = '#A08050';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shelves
        ctx.fillStyle = '#B09060';
        ctx.fillRect(x - 20, y - 2, 40, 3);

        // Books — top shelf
        const topBooks = [
            { color: '#FF6B6B', w: 7 },
            { color: '#4A90D9', w: 6 },
            { color: '#27AE60', w: 8 },
            { color: '#9B59B6', w: 6 },
            { color: '#FFD700', w: 7 }
        ];
        let bx = x - 18;
        for (const book of topBooks) {
            ctx.fillStyle = book.color;
            ctx.fillRect(bx, y - 18, book.w, 16);
            bx += book.w + 1;
        }

        // Books — bottom shelf
        const botBooks = [
            { color: '#FF69B4', w: 8 },
            { color: '#00CED1', w: 6 },
            { color: '#FF6B6B', w: 7 },
            { color: '#4A90D9', w: 7 }
        ];
        bx = x - 18;
        for (const book of botBooks) {
            ctx.fillStyle = book.color;
            ctx.fillRect(bx, y + 2, book.w, 16);
            bx += book.w + 1;
        }
    }
}
