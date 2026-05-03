(function(global) {
  'use strict';

  // Fixed wizard portrait layout — always drawn as a 200×240 canvas.
  const PORTRAIT_W = 200;
  const PORTRAIT_H = 240;

  // Class palette definitions.
  const CLASS_PALETTES = {
    apprentice: { robe: '#4a60a8', hat: '#2a3a78', face: '#f5c89a', staff: '#8b6020', gem: '#40d0f0' },
    pyromancer: { robe: '#a84030', hat: '#702020', face: '#f5c89a', staff: '#8b6020', gem: '#f07020' },
    stormcaller: { robe: '#6040a8', hat: '#402870', face: '#f5c89a', staff: '#506080', gem: '#80d0ff' },
    necromancer: { robe: '#304020', hat: '#202810', face: '#c8c0a0', staff: '#303030', gem: '#80ff80' },
  };

  class WizardRenderer {
    constructor(fxCache) {
      this._cache = fxCache;
    }

    // Build (or retrieve from cache) the wizard portrait for a given classId.
    // Returns a compiled object with a single canvas.
    buildPortrait(classId) {
      const cacheKey = 'wizard:' + classId;
      let canvas = this._cache.get(cacheKey);
      if (!canvas) {
        canvas = this._cache.build(cacheKey, PORTRAIT_W, PORTRAIT_H, (ctx) => {
          this._drawPortrait(ctx, classId, PORTRAIT_W, PORTRAIT_H);
        });
      }
      return { canvas, classId };
    }

    // Draw the wizard portrait onto ctx at (x, y), applying animState transforms.
    // animState comes from AnimationManager.stateFor().
    drawPortrait(ctx, x, y, compiled, animState, now) {
      if (!compiled) return;
      const { canvas } = compiled;

      ctx.save();

      // Hit flash: portrait shakes and flashes white
      if (animState && animState.hitFlash > 0) {
        if (animState.shakeUntilMs > now) {
          const shake = comicfx.screenShake(now, 5, animState.shakeUntilMs);
          ctx.translate(shake.dx, shake.dy);
        }
        ctx.drawImage(canvas, x, y);
        ctx.save();
        ctx.globalAlpha = animState.hitFlash * 0.6;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x, y, PORTRAIT_W, PORTRAIT_H);
        ctx.restore();
      } else {
        // Idle breath: gentle vertical bob
        const breathY = animState ? Math.sin((now / 1400) * Math.PI * 2) * 2 : 0;
        ctx.translate(0, breathY);
        ctx.drawImage(canvas, x, y);
      }

      // Ultimate charge: sparkle aura
      if (animState && animState.chargeGlow > 0) {
        ctx.save();
        ctx.globalAlpha = animState.chargeGlow * 0.5;
        ctx.strokeStyle = '#f0d840';
        ctx.lineWidth = 3 + animState.chargeGlow * 4;
        ctx.shadowColor = '#f0d840';
        ctx.shadowBlur = 12;
        ctx.strokeRect(x + 4, y + 4, PORTRAIT_W - 8, PORTRAIT_H - 8);
        ctx.restore();
      }

      ctx.restore();
    }

    _drawPortrait(ctx, classId, w, h) {
      const pal = CLASS_PALETTES[classId] || CLASS_PALETTES.apprentice;
      const cx = w / 2;

      // Robe body
      ctx.fillStyle = pal.robe;
      ctx.beginPath();
      ctx.moveTo(cx - 55, h);
      ctx.lineTo(cx - 40, h * 0.42);
      ctx.lineTo(cx + 40, h * 0.42);
      ctx.lineTo(cx + 55, h);
      ctx.closePath();
      ctx.fill();
      comicfx.inkOutline(ctx, function(c) {
        c.beginPath();
        c.moveTo(cx - 55, h); c.lineTo(cx - 40, h * 0.42);
        c.lineTo(cx + 40, h * 0.42); c.lineTo(cx + 55, h); c.closePath();
      }, 3, '#1a1a1a', 0);

      // Staff
      ctx.save();
      ctx.strokeStyle = pal.staff;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 42, h * 0.85);
      ctx.lineTo(cx + 30, h * 0.15);
      ctx.stroke();
      // Staff gem
      ctx.fillStyle = pal.gem;
      ctx.beginPath();
      ctx.arc(cx + 27, h * 0.13, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();
      ctx.restore();

      // Face
      ctx.fillStyle = pal.face;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.32, 26, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();

      // Eyes
      for (const side of [-1, 1]) {
        const ex = cx + side * 10, ey = h * 0.29;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, ey, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
      }

      // Mouth — slight smile
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, h * 0.38, 10, 0.15, Math.PI - 0.15);
      ctx.stroke();

      // Pointed hat
      ctx.fillStyle = pal.hat;
      ctx.beginPath();
      ctx.moveTo(cx, h * 0.02);
      ctx.lineTo(cx - 34, h * 0.18);
      ctx.lineTo(cx + 34, h * 0.18);
      ctx.closePath();
      ctx.fill();
      // Hat brim
      ctx.fillStyle = pal.robe;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.18, 38, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
      // Re-outline hat
      comicfx.inkOutline(ctx, function(c) {
        c.beginPath();
        c.moveTo(cx, h * 0.02); c.lineTo(cx - 34, h * 0.18); c.lineTo(cx + 34, h * 0.18); c.closePath();
      }, 2.5, '#1a1a1a', 0);
    }

    invalidate(classId) {
      this._cache.invalidate('wizard:' + classId);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WizardRenderer };
  } else {
    global.WizardRenderer = WizardRenderer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
