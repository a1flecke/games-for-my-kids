(function(global) {
  'use strict';

  // Module-level cache for halftone pattern canvases (keyed by color:density:seed).
  const _halftoneCache = new Map();

  function _getHalftoneCanvas(color, density, seed) {
    const key = color + ':' + density + ':' + seed;
    if (_halftoneCache.has(key)) return _halftoneCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    _drawHalftonePattern(canvas.getContext('2d'), 64, 64, color, density, seed);
    _halftoneCache.set(key, canvas);
    return canvas;
  }

  function _drawHalftonePattern(ctx, pw, ph, color, density, seed) {
    const rng = mulberry32(hashString('ht:' + color + ':' + density + ':' + seed));
    const count = Math.floor(pw * ph * density);
    ctx.clearRect(0, 0, pw, ph);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const cx = rng() * pw;
      const cy = rng() * ph;
      const r = 1.5 + rng() * 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Thick ink-outline stroke around a path defined by pathFn(ctx).
  // wobbleSeed > 0 adds a second slightly-offset pass for a hand-drawn feel.
  function inkOutline(ctx, pathFn, weight, color, wobbleSeed) {
    weight = weight === undefined ? 4 : weight;
    color = color || '#1a1a1a';
    wobbleSeed = wobbleSeed || 0;
    ctx.save();
    ctx.lineWidth = weight;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (wobbleSeed) {
      const rng = mulberry32(hashString('io:' + wobbleSeed));
      ctx.save();
      ctx.translate((rng() - 0.5) * 1.5, (rng() - 0.5) * 1.5);
      ctx.globalAlpha = 0.4;
      pathFn(ctx);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    pathFn(ctx);
    ctx.stroke();
    ctx.restore();
  }

  // Halftone dot-pattern fill in (x, y, w, h). Cached by (color, density, seed).
  function halftoneFill(ctx, x, y, w, h, color, density, seed) {
    density = density === undefined ? 0.04 : density;
    seed = seed === undefined ? 0 : seed;
    const patternCanvas = _getHalftoneCanvas(color, density, seed);
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    ctx.save();
    ctx.fillStyle = pattern;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Radiating speed lines from (ox, oy) in direction dirRad ± spread.
  function speedLines(ctx, ox, oy, dirRad, n, len, color) {
    n = n === undefined ? 8 : n;
    len = len === undefined ? 80 : len;
    color = color || '#1a1a1a';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    const spread = Math.PI * 0.4;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const angle = dirRad - spread / 2 + t * spread;
      const lineLen = len * (0.5 + (i % 3) * 0.25);
      ctx.lineWidth = 0.8 + (i % 2) * 0.8;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(angle) * lineLen, oy + Math.sin(angle) * lineLen);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Comic POW!/ZAP! text with fat stroke + fill and slight seeded rotation.
  function burstText(ctx, x, y, text, size, color, strokeColor, seed) {
    size = size === undefined ? 48 : size;
    color = color || '#f0d840';
    strokeColor = strokeColor || '#1a1a1a';
    seed = seed === undefined ? 0 : seed;
    const rng = mulberry32(hashString('bt:' + text + ':' + seed));
    const rot = (rng() * 0.2) - 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = 'bold ' + size + 'px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, size * 0.18);
    ctx.strokeStyle = strokeColor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // Single-frame screen tint. alpha is provided by an external animation curve.
  function panelFlash(ctx, w, h, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Splatter of ink dots radiating from (x, y).
  function inkBurst(ctx, x, y, radius, color, n, seed) {
    n = n === undefined ? 20 : n;
    seed = seed === undefined ? 0 : seed;
    const rng = mulberry32(hashString('ib:' + x + ':' + y + ':' + seed));
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * radius;
      const r = 1 + rng() * 4;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Comic-style thick inset border.
  function panelBorder(ctx, x, y, w, h, weight, color) {
    weight = weight === undefined ? 6 : weight;
    color = color || '#1a1a1a';
    ctx.save();
    ctx.lineWidth = weight;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(x + weight / 2, y + weight / 2, w - weight, h - weight);
    ctx.restore();
  }

  // Returns {dx, dy} offset for the caller to translate the canvas by.
  // Returns {dx:0, dy:0} when untilMs has passed or reduced-motion is active.
  function screenShake(now, intensity, untilMs) {
    if (now >= untilMs) return { dx: 0, dy: 0 };
    if (document.body.hasAttribute('data-reduced-motion')) return { dx: 0, dy: 0 };
    const remaining = untilMs - now;
    const fade = Math.min(1, remaining / 150);
    const rng = mulberry32((now * 100) | 0);
    return {
      dx: (rng() - 0.5) * intensity * 2 * fade,
      dy: (rng() - 0.5) * intensity * 2 * fade,
    };
  }

  // Helper used by shapes.js: perturb an array of {x,y} points and draw as a closed path.
  function wobbleStroke(ctx, points, wobbleSeed, jitterAmount) {
    jitterAmount = jitterAmount === undefined ? 2 : jitterAmount;
    const rng = mulberry32(hashString('ws:' + wobbleSeed));
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(
      points[0].x + (rng() - 0.5) * jitterAmount,
      points[0].y + (rng() - 0.5) * jitterAmount
    );
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(
        points[i].x + (rng() - 0.5) * jitterAmount,
        points[i].y + (rng() - 0.5) * jitterAmount
      );
    }
    ctx.closePath();
  }

  const comicfx = {
    inkOutline,
    halftoneFill,
    speedLines,
    burstText,
    panelFlash,
    inkBurst,
    panelBorder,
    screenShake,
    wobbleStroke,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = comicfx;
  } else {
    global.comicfx = comicfx;
  }
})(typeof window !== 'undefined' ? window : globalThis);
