/**
 * portraits.js — Canvas pixel-art portrait drawing for Catacombs & Creeds
 *
 * Each character has a unique face drawn using fillRect calls.
 * Usage: drawPortrait(ctx, portraitId, x, y, size)
 *
 * Portrait IDs: 'priscilla', 'peter', 'peter_apostle', 'james', 'john',
 *               'guard', 'centurion', 'narrator', 'default'
 */

/**
 * Draw a pixel-art portrait for a character.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} portraitId
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} size - Size in pixels (portrait is square)
 */
function drawPortrait(ctx, portraitId, x, y, size) {
    const s = size / 64; // scale factor — portraits designed at 64px

    function px(px, py, pw, ph, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + Math.round(px * s), y + Math.round(py * s), Math.max(1, Math.round(pw * s)), Math.max(1, Math.round(ph * s)));
    }

    // Background circle
    const cx = x + size / 2;
    const cy = y + size / 2;
    const colors = _getPortraitColors(portraitId);

    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = Math.max(1, Math.round(2 * s));
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Draw character-specific details
    switch (portraitId) {
        case 'priscilla':       _drawPriscilla(px, s); break;
        case 'peter':           _drawPeterGuide(px, s); break;
        case 'peter_apostle':   _drawPeterApostle(px, s); break;
        case 'james':           _drawJames(px, s); break;
        case 'john':            _drawJohn(px, s); break;
        case 'guard':           _drawGuard(px, s); break;
        case 'centurion':       _drawCenturion(px, s); break;
        default:                _drawDefault(ctx, portraitId, cx, cy, size, colors); break;
    }
}

function _getPortraitColors(portraitId) {
    const palettes = {
        priscilla:     { bg: '#c9a0c0', border: '#7a3a70' },
        peter:         { bg: '#d4b46a', border: '#7a5a20' },
        peter_apostle: { bg: '#b09040', border: '#705010' },
        james:         { bg: '#6080b0', border: '#304070' },
        john:          { bg: '#60a070', border: '#305040' },
        guard:         { bg: '#9b5454', border: '#5a1414' },
        centurion:     { bg: '#c05050', border: '#801010' },
        narrator:      { bg: '#8888a8', border: '#444468' },
        default:       { bg: '#888888', border: '#444444' }
    };
    return palettes[portraitId] || palettes.default;
}

// ── Portrait drawing functions ──────────────────────────────────────────────
// All coordinates are in 64×64 px space, scaled by s.

/** Priscilla — purple-robed guide, warm face, brown hair */
function _drawPriscilla(px, s) {
    // Hair (dark brown)
    px(16, 10, 32, 6, '#5a3010');
    px(12, 14, 40, 4, '#5a3010');
    px(10, 18, 6, 16, '#5a3010');
    px(48, 18, 6, 16, '#5a3010');
    // Face (warm skin)
    px(16, 16, 32, 28, '#f0b880');
    // Eyes (friendly)
    px(22, 22, 6, 5, '#3a2010');
    px(36, 22, 6, 5, '#3a2010');
    // Eye shine
    px(24, 23, 2, 2, '#ffffff');
    px(38, 23, 2, 2, '#ffffff');
    // Nose
    px(30, 30, 4, 3, '#d09060');
    // Smile
    px(22, 37, 4, 2, '#c06050');
    px(38, 37, 4, 2, '#c06050');
    px(26, 39, 12, 2, '#c06050');
    // Purple robe
    px(10, 44, 44, 20, '#904880');
    px(18, 40, 28, 6, '#904880');
    // White collar
    px(24, 40, 16, 6, '#f5f0e8');
}

/** Peter (guide at entrance) — warm robes, kind eyes */
function _drawPeterGuide(px, s) {
    // Hair (sandy brown)
    px(16, 10, 32, 6, '#9a7030');
    px(12, 14, 40, 4, '#9a7030');
    px(10, 18, 6, 14, '#9a7030');
    px(48, 18, 6, 14, '#9a7030');
    // Face
    px(16, 16, 32, 28, '#e8a870');
    // Eyes
    px(22, 22, 6, 5, '#3a2010');
    px(36, 22, 6, 5, '#3a2010');
    px(24, 23, 2, 2, '#ffffff');
    px(38, 23, 2, 2, '#ffffff');
    // Nose
    px(30, 30, 4, 3, '#c08060');
    // Gentle smile
    px(24, 37, 16, 2, '#b05040');
    px(22, 39, 4, 2, '#b05040');
    px(38, 39, 4, 2, '#b05040');
    // Golden-tan robe
    px(10, 44, 44, 20, '#c4a44a');
    px(18, 40, 28, 6, '#c4a44a');
    // Tunic hint
    px(26, 40, 12, 6, '#e8d090');
}

/** Apostle Peter — bearded, rugged fisherman-turned-apostle */
function _drawPeterApostle(px, s) {
    // Hair (brown, slightly greying)
    px(16, 10, 32, 6, '#7a5020');
    px(12, 14, 44, 4, '#7a5020');
    px(10, 16, 6, 18, '#7a5020');
    px(48, 16, 6, 18, '#7a5020');
    // Face
    px(16, 16, 32, 28, '#d09060');
    // Eyes (deep set)
    px(20, 22, 7, 5, '#2a1a08');
    px(37, 22, 7, 5, '#2a1a08');
    px(22, 23, 2, 2, '#ffffff');
    px(39, 23, 2, 2, '#ffffff');
    // Nose (prominent)
    px(29, 29, 6, 5, '#b07050');
    // Beard (brown)
    px(14, 36, 36, 10, '#7a5020');
    px(16, 44, 32, 6, '#7a5020');
    px(14, 46, 4, 4, '#7a5020');
    px(46, 46, 4, 4, '#7a5020');
    // Brown robe
    px(10, 48, 44, 16, '#a07030');
    px(18, 42, 28, 8, '#a07030');
}

/** Apostle James — blue robe, younger face */
function _drawJames(px, s) {
    // Hair (dark, neat)
    px(18, 10, 28, 6, '#2a1a08');
    px(14, 14, 36, 4, '#2a1a08');
    px(12, 18, 6, 12, '#2a1a08');
    px(46, 18, 6, 12, '#2a1a08');
    // Face (lighter skin, young)
    px(16, 16, 32, 28, '#e8b888');
    // Eyes (bright)
    px(22, 22, 6, 5, '#2a3868');
    px(36, 22, 6, 5, '#2a3868');
    px(23, 23, 2, 2, '#ffffff');
    px(37, 23, 2, 2, '#ffffff');
    // Nose
    px(30, 29, 4, 4, '#c89870');
    // Smile (bright)
    px(23, 36, 18, 2, '#c05050');
    px(21, 38, 4, 2, '#c05050');
    px(39, 38, 4, 2, '#c05050');
    // Blue robe
    px(10, 44, 44, 20, '#5070a0');
    px(18, 40, 28, 6, '#5070a0');
    px(26, 40, 12, 6, '#90b0d0');
}

/** Apostle John — green robe, youthful and gentle */
function _drawJohn(px, s) {
    // Hair (dark brown, flowing)
    px(18, 10, 28, 6, '#3a2010');
    px(14, 14, 36, 6, '#3a2010');
    px(10, 18, 6, 20, '#3a2010');
    px(48, 18, 6, 20, '#3a2010');
    // Face (young, bright)
    px(16, 16, 32, 28, '#ecc080');
    // Eyes (gentle)
    px(22, 22, 6, 5, '#2a4828');
    px(36, 22, 6, 5, '#2a4828');
    px(23, 23, 2, 2, '#ffffff');
    px(37, 23, 2, 2, '#ffffff');
    // Nose (small)
    px(30, 30, 4, 3, '#cca070');
    // Peaceful smile
    px(25, 36, 14, 2, '#c05050');
    px(23, 38, 4, 2, '#c05050');
    px(37, 38, 4, 2, '#c05050');
    // Green robe
    px(10, 44, 44, 20, '#508050');
    px(18, 40, 28, 6, '#508050');
    // Scroll hint (right side)
    px(42, 40, 6, 18, '#f5e8c0');
    px(42, 40, 6, 2, '#c0a050');
    px(42, 56, 6, 2, '#c0a050');
}

/** Roman Guard — helmet, stern face */
function _drawGuard(px, s) {
    // Helmet (red crest)
    px(14, 4, 36, 4, '#cc2020');
    px(14, 4, 36, 2, '#cc2020');
    // Helmet body (dark iron)
    px(12, 8, 40, 16, '#666666');
    px(10, 14, 6, 12, '#555555');
    px(48, 14, 6, 12, '#555555');
    // Cheek guards
    px(10, 20, 8, 14, '#555555');
    px(46, 20, 8, 14, '#555555');
    // Face (stern)
    px(18, 20, 28, 22, '#d09070');
    // Eyes (narrow)
    px(20, 24, 8, 4, '#1a1008');
    px(36, 24, 8, 4, '#1a1008');
    // Nose (strong)
    px(29, 30, 6, 6, '#b07850');
    // Tight mouth
    px(22, 38, 20, 2, '#8a5030');
    // Red tunic
    px(10, 44, 44, 20, '#aa2020');
    // Gold trim
    px(10, 44, 44, 3, '#ccaa00');
}

/** Roman Centurion — gold-accented helmet, commanding look */
function _drawCenturion(px, s) {
    // Helmet (gold plume)
    px(14, 2, 36, 6, '#ccaa00');
    px(20, 6, 24, 4, '#ccaa00');
    // Helmet body (bronze/gold)
    px(12, 8, 40, 14, '#998820');
    px(8, 12, 8, 14, '#887710');
    px(48, 12, 8, 14, '#887710');
    // Cheek guards (wider)
    px(8, 18, 10, 16, '#998820');
    px(46, 18, 10, 16, '#998820');
    // Face (authoritative)
    px(18, 18, 28, 26, '#c08860');
    // Eyes (piercing)
    px(20, 23, 8, 4, '#0a0808');
    px(36, 23, 8, 4, '#0a0808');
    px(22, 24, 2, 2, '#ffffff');
    px(38, 24, 2, 2, '#ffffff');
    // Strong jaw
    px(29, 30, 6, 5, '#a07050');
    // Stern frown
    px(22, 38, 20, 2, '#703020');
    // Red/gold armor
    px(10, 44, 44, 20, '#993333');
    px(10, 44, 44, 3, '#ccaa00');
    px(10, 50, 44, 3, '#ccaa00');
}

/** Default fallback — colored circle with initial letter */
function _drawDefault(ctx, portraitId, cx, cy, size, colors) {
    const initial = (portraitId || '?')[0].toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.44)}px ${CONFIG.ACCESSIBILITY.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
}

// Expose globally
window.drawPortrait = drawPortrait;
