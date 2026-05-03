(function(global) {
  'use strict';

  const Z_ORDER = ['tail', 'wings', 'limbs', 'body', 'head', 'eyes', 'mouth', 'horns'];

  // Padding around each part canvas so outlines don't clip.
  const PAD = 12;

  // Expression config for comicEyesPair pupils.
  const EXPR_CONFIG = {
    angry:     { pupilFrac: 0.38, browTilt: 0.55 },
    surprised: { pupilFrac: 0.48, browTilt: 0 },
    happy:     { pupilFrac: 0.40, browTilt: -0.3 },
    neutral:   { pupilFrac: 0.42, browTilt: 0 },
    dead:      { pupilFrac: 0, browTilt: 0 },
  };

  class MonsterRenderer {
    constructor(fxCache) {
      this._cache = fxCache;
    }

    // Build per-part offscreen canvases for a monster. Returns a compiled object.
    // monster: { id, palette, shape:{body,head,eyes,mouth,limbs,tail,wings,horns}, layout }
    buildCreature(monster) {
      const parts = {};
      const id = monster.id;

      for (const slot of Z_ORDER) {
        const shapeDef = monster.shape[slot];
        if (!shapeDef && slot !== 'limbs') continue;

        if (slot === 'limbs') {
          const limbDefs = monster.shape.limbs;
          if (!limbDefs || !limbDefs.length) continue;
          parts.limbs = limbDefs.map((def, idx) => {
            return this._buildPart(id, 'limb' + idx, def, monster.palette, monster.layout['limb' + idx] || { ox: 0, oy: 0 });
          });
          continue;
        }

        const layout = (monster.layout && monster.layout[slot]) || { ox: 0, oy: 0 };
        parts[slot] = this._buildPart(id, slot, shapeDef, monster.palette, layout);
      }

      const bbox = this._computeBbox(monster);
      return { parts, bbox };
    }

    _buildPart(monsterId, slot, shapeDef, palette, layout) {
      const cacheKey = monsterId + ':' + slot + ':' + shapeDef.seed;
      let canvas = this._cache.get(cacheKey);

      if (!canvas) {
        const { w, h } = this._partSize(slot, shapeDef);
        canvas = this._cache.build(cacheKey, w, h, (ctx) => {
          this._drawPart(ctx, slot, shapeDef, palette, w, h);
        });
      }

      return { canvas, cx: layout.ox, cy: layout.oy };
    }

    _partSize(slot, def) {
      let w, h;
      if (slot === 'body')  { w = (def.rx || 40) * 2 + PAD * 2; h = (def.ry || 40) * 2 + PAD * 2; }
      else if (slot === 'head')  { w = (def.rx || 25) * 2 + PAD * 2; h = (def.ry || 32) * 2 + PAD * 2; }
      else if (slot === 'eyes')  { w = (def.size || 12) * 4 + PAD * 2; h = (def.size || 12) * 2 + PAD * 2; }
      else if (slot === 'mouth') { w = (def.width || 20) + PAD * 2; h = (def.height || 12) + PAD * 2; }
      else if (slot === 'tail')  { w = (def.length || 50) + PAD * 2; h = (def.length || 50) + PAD * 2; }
      else if (slot === 'horns') { w = (def.size || 18) * 3 + PAD * 2; h = (def.size || 18) * 2 + PAD * 2; }
      else if (slot === 'wings') { w = (def.size || 40) * 3 + PAD * 2; h = (def.size || 40) + PAD * 2; }
      else if (slot.startsWith('limb')) { w = (def.length || 30) + PAD * 2; h = (def.length || 30) + PAD * 2; }
      else { w = 80; h = 80; }
      return { w: Math.ceil(w), h: Math.ceil(h) };
    }

    _drawPart(ctx, slot, def, palette, w, h) {
      const cx = w / 2, cy = h / 2;
      ctx.translate(cx, cy);

      if (slot === 'body') {
        const pathFn = shapes.blob(def);
        ctx.fillStyle = palette.body || '#888';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 4, '#1a1a1a', def.seed);
      } else if (slot === 'head') {
        const pathFn = shapes.egg(def);
        ctx.fillStyle = palette.head || palette.body || '#888';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 3, '#1a1a1a', def.seed);
      } else if (slot === 'eyes') {
        this._drawEyes(ctx, def, palette);
      } else if (slot === 'mouth') {
        const pathFn = shapes.fangGrin(def);
        ctx.fillStyle = palette.mouth || '#1a1a1a';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 2, '#1a1a1a', def.seed);
      } else if (slot === 'tail') {
        const pathFn = shapes.tail(def);
        ctx.fillStyle = palette.body || '#888';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 3, '#1a1a1a', def.seed);
      } else if (slot === 'horns') {
        const pathFn = shapes.hornsPair(def);
        ctx.fillStyle = palette.horns || '#c8a040';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 3, '#1a1a1a', def.seed);
      } else if (slot === 'wings') {
        const pathFn = shapes.wingsPair(def);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = palette.wings || '#444';
        pathFn(ctx); ctx.fill();
        ctx.globalAlpha = 1;
        comicfx.inkOutline(ctx, pathFn, 2, '#1a1a1a', def.seed);
      } else if (slot.startsWith('limb')) {
        const kindFn = def.kind === 'bony_arm' ? shapes.bonyArm : shapes.stubArm;
        const pathFn = kindFn(def);
        ctx.fillStyle = palette.limbs || palette.body || '#888';
        pathFn(ctx); ctx.fill();
        comicfx.inkOutline(ctx, pathFn, 3, '#1a1a1a', def.seed);
      }
    }

    _drawEyes(ctx, def, palette) {
      const size = def.size || 12;
      const expr = def.expr || 'neutral';
      const gap = size * 0.75;
      const r = size * 0.55;
      const cfg = EXPR_CONFIG[expr] || EXPR_CONFIG.neutral;

      for (const side of [-1, 1]) {
        const ex = side * gap;
        // Sclera
        ctx.beginPath();
        ctx.arc(ex, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = palette.eyes || '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1a1a1a';
        ctx.stroke();

        if (expr === 'dead') {
          // X pupils for dead expression
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          const s = r * 0.55;
          ctx.beginPath();
          ctx.moveTo(ex - s, -s); ctx.lineTo(ex + s, s);
          ctx.moveTo(ex + s, -s); ctx.lineTo(ex - s, s);
          ctx.stroke();
        } else {
          // Round pupil
          const pr = r * cfg.pupilFrac;
          ctx.beginPath();
          ctx.arc(ex, 0, pr, 0, Math.PI * 2);
          ctx.fillStyle = palette.pupils || '#1a1a1a';
          ctx.fill();
        }

        // Eyebrow for angry/happy
        if (cfg.browTilt !== 0) {
          const bx = ex, by = -r * 1.15;
          const bw = r * 0.9;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(side * cfg.browTilt);
          ctx.fillStyle = palette.pupils || '#1a1a1a';
          ctx.fillRect(-bw / 2, -3, bw, 4);
          ctx.restore();
        }
      }
    }

    // Composite all cached parts onto ctx with animation transforms.
    drawCreature(ctx, x, y, compiled, animState, now) {
      if (!compiled) return;
      const { parts, bbox } = compiled;

      ctx.save();

      // Death fade
      if (animState && animState.deathFade < 1) {
        ctx.globalAlpha = Math.max(0, animState.deathFade);
      }

      // Screen shake for hit — uses caller's RAF now so it matches animState timing
      if (animState && now !== undefined && animState.shakeUntilMs > now) {
        const shake = comicfx.screenShake(now, 4, animState.shakeUntilMs);
        ctx.translate(shake.dx, shake.dy);
      }

      // Attack lunge: translate the whole creature toward the player
      if (animState && animState.attackProgress > 0) {
        const lunge = Math.sin(animState.attackProgress * Math.PI) * 14;
        ctx.translate(-lunge, 0);
      }

      // Draw all parts in Z_ORDER
      for (const slot of Z_ORDER) {
        if (slot === 'limbs') {
          if (!parts.limbs) continue;
          for (const lp of parts.limbs) {
            this._drawPartCanvas(ctx, x, y, lp, animState, slot);
          }
        } else {
          if (!parts[slot]) continue;
          this._drawPartCanvas(ctx, x, y, parts[slot], animState, slot);
        }
      }

      // Hit flash overlay on top of all parts
      if (animState && animState.hitFlash > 0) {
        ctx.save();
        if (bbox) {
          ctx.globalAlpha = animState.hitFlash * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + bbox.x, y + bbox.y, bbox.w, bbox.h);
        }
        ctx.restore();
      }

      ctx.restore();
    }

    _drawPartCanvas(ctx, anchorX, anchorY, part, animState, slot) {
      const { canvas, cx, cy } = part;
      const hw = canvas.width / 2;
      const hh = canvas.height / 2;

      ctx.save();

      // Idle breath scale on body and head
      if (animState && (slot === 'body' || slot === 'head')) {
        const s = 1 + animState.idleBreath;
        ctx.translate(anchorX + cx, anchorY + cy);
        ctx.scale(s, s);
        ctx.drawImage(canvas, -hw, -hh);
      } else {
        ctx.drawImage(canvas, anchorX + cx - hw, anchorY + cy - hh);
      }

      ctx.restore();
    }

    _computeBbox(monster) {
      const shape = monster.shape;
      const rx = (shape.body && shape.body.rx) || 40;
      const ry = (shape.body && shape.body.ry) || 40;
      const headRy = (shape.head && shape.head.ry) || 30;
      const headOy = (monster.layout && monster.layout.head) ? monster.layout.head.oy : -ry - headRy;
      return {
        x: -(rx + PAD),
        y: headOy - headRy - PAD,
        w: (rx + PAD) * 2,
        h: ry * 2 + Math.abs(headOy) + headRy + PAD * 2,
      };
    }

    invalidatePart(creatureId, slot) {
      this._cache.invalidate(creatureId + ':' + slot);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MonsterRenderer };
  } else {
    global.MonsterRenderer = MonsterRenderer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
