'use strict';

// OrbsRenderer — canvas orb visuals and tap hit-testing for the combat answer panel.
// layout() must be called each draw cycle so positions track canvas resize.
class OrbsRenderer {
  constructor(fxCache) {
    this._cache = fxCache;
    this._hover = -1;
    this._centers = [];
    this._orbR = 48;  // 96px diameter
  }

  // Compute orb centers for the current canvas dimensions.
  // 4 orbs in a 2×2 grid, centered horizontally, below the problem panel.
  layout(canvasW, canvasH) {
    const orbD = 96;
    const orbR = orbD / 2;
    const gap = 22;
    const gridW = orbD * 2 + gap;
    const startX = (canvasW - gridW) / 2;
    // Problem panel occupies top ~40%; place orbs starting ~55% down
    const startY = canvasH * 0.56;
    this._orbR = orbR;
    this._centers = [
      { x: startX + orbR,                y: startY + orbR },
      { x: startX + orbD + gap + orbR,   y: startY + orbR },
      { x: startX + orbR,                y: startY + orbD + gap + orbR },
      { x: startX + orbD + gap + orbR,   y: startY + orbD + gap + orbR },
    ];
  }

  draw(ctx, orbs) {
    if (!orbs || orbs.length === 0 || this._centers.length === 0) return;
    const count = Math.min(4, orbs.length);
    for (let i = 0; i < count; i++) {
      const c = this._centers[i];
      if (!c) continue;
      this._drawOrb(ctx, c.x, c.y, orbs[i], i);
    }
  }

  // Returns index 0..3 of the tapped orb, or -1 if none.
  // x, y must be in CSS-pixel canvas coordinates.
  hitTest(x, y) {
    for (let i = 0; i < this._centers.length; i++) {
      const c = this._centers[i];
      const dx = x - c.x;
      const dy = y - c.y;
      // Hitbox slightly larger than visual radius for touch accessibility (≥96px target total)
      if (dx * dx + dy * dy <= (this._orbR + 4) * (this._orbR + 4)) return i;
    }
    return -1;
  }

  setHover(idx) { this._hover = idx; }

  // ── Private ────────────────────────────────────────────────────────────────

  _drawOrb(ctx, cx, cy, value, idx) {
    const r = this._orbR;
    const isHover = this._hover === idx;

    ctx.save();

    // Clip subsequent fills to the orb circle so the halftone texture
    // doesn't bleed past the edge.
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isHover ? '#f0d840' : '#dde0ff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    comicfx.halftoneFill(ctx, cx - r, cy - r, r * 2, r * 2,
      isHover ? '#b8a010' : '#8888cc', 0.04, idx + 1);
    ctx.restore();

    // Ink outline
    const orbPath = function(c) {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
    };
    comicfx.inkOutline(ctx, orbPath, isHover ? 5 : 4, '#1a1a1a', idx + 10);

    // Number
    const numStr = String(value);
    const fontSize = numStr.length >= 3 ? 30 : (numStr.length === 2 ? 38 : 46);
    ctx.fillStyle = '#2C2416';
    ctx.font = 'bold ' + fontSize + 'px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, cx, cy + 2);

    ctx.restore();
  }
}
