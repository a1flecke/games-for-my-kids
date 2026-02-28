/**
 * parts.js — Body part procedural drawing functions.
 * Each function draws to a provided context with 3-4px thick outlines and rounded shapes.
 *
 * Drawing functions: drawPartType(ctx, color, covering, pattern, scale)
 * Covering renderer: fur, scales, feathers, smooth (applied via source-atop compositing)
 * Pattern renderer: solid, spots, stripes, gradient
 */

class PartsLibrary {
    constructor() {
        this._partData = null; // Loaded from data/parts.json
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
     * Draw a part to a context. Dispatches to the correct drawing function.
     */
    drawPart(ctx, partId, color, covering, pattern, scale) {
        const part = this.getById(partId);
        if (!part) return;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2C2416';

        // Draw base shape (placeholder — filled in Session 3)
        this._drawPlaceholderShape(ctx, part.category, color);

        // Apply covering texture
        if (covering && covering !== 'smooth') {
            this._applyCovering(ctx, covering, color);
        }

        ctx.restore();
    }

    /**
     * Placeholder shape for scaffold — will be replaced with procedural art in Session 3.
     */
    _drawPlaceholderShape(ctx, category, color) {
        ctx.fillStyle = color;
        ctx.beginPath();

        switch (category) {
            case 'head':
                ctx.arc(50, 50, 40, 0, Math.PI * 2);
                break;
            case 'torso':
                ctx.ellipse(50, 60, 40, 50, 0, 0, Math.PI * 2);
                break;
            case 'legs':
                ctx.roundRect(20, 0, 20, 60, 8);
                break;
            case 'tail':
                ctx.ellipse(40, 20, 30, 15, Math.PI / 6, 0, Math.PI * 2);
                break;
            case 'wings':
                ctx.ellipse(40, 40, 35, 50, -Math.PI / 8, 0, Math.PI * 2);
                break;
            case 'eyes':
                ctx.arc(30, 30, 15, 0, Math.PI * 2);
                break;
            case 'extras':
                ctx.moveTo(50, 0);
                ctx.lineTo(60, 30);
                ctx.lineTo(40, 30);
                ctx.closePath();
                break;
            default:
                ctx.rect(10, 10, 80, 80);
        }

        ctx.fill();
        ctx.stroke();
    }

    /**
     * Apply covering texture via source-atop compositing.
     * Placeholder — full implementation in Session 3.
     */
    _applyCovering(ctx, covering, color) {
        // Will be implemented in Session 3 with proper texture canvases
    }
}
