(function(global) {
  'use strict';

  // All shape generators return a pathFn(ctx) that defines a closed path centered at origin.
  // Callers fill/stroke the path; shapes never call fill() or stroke() internally.
  // Wobble uses seeded PRNG so identical seeds produce identical paths.

  function _rng(seed) {
    return mulberry32(hashString(String(seed)));
  }

  // Irregular oval with seeded wobble on each radial sample.
  function blob({ rx, ry, wobble, seed }) {
    rx = rx || 40; ry = ry || 40; wobble = wobble || 0; seed = seed || 0;
    const n = 20;
    const rng = _rng('blob:' + seed);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const jitter = 1 + (rng() - 0.5) * wobble * 0.04;
      pts.push({ x: Math.cos(angle) * rx * jitter, y: Math.sin(angle) * ry * jitter });
    }
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    };
  }

  // Egg/pear shape: narrower at top, wider at bottom. tilt in radians.
  function egg({ rx, ry, scale, tilt, seed }) {
    rx = rx || 25; ry = ry || 32; scale = scale || 1; tilt = tilt || 0; seed = seed || 0;
    const n = 24;
    const rng = _rng('egg:' + seed);
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const widthFactor = 1 + 0.28 * Math.cos(angle + Math.PI); // narrower top
      const jitter = 1 + (rng() - 0.5) * 0.06;
      const lx = Math.cos(angle) * rx * scale * widthFactor * jitter;
      const ly = Math.sin(angle) * ry * scale * jitter;
      pts.push({ x: lx * cosT - ly * sinT, y: lx * sinT + ly * cosT });
    }
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    };
  }

  // Two white sclera circles. Pupils/expression drawn by the caller (monsterRenderer).
  function comicEyesPair({ size, expr, seed }) {
    size = size || 12; seed = seed || 0;
    const gap = size * 0.75;
    const r = size * 0.55;
    return function(ctx) {
      // Left sclera
      ctx.beginPath();
      ctx.moveTo(-gap + r, 0);
      ctx.arc(-gap, 0, r, 0, Math.PI * 2);
      // Right sclera
      ctx.moveTo(gap + r, 0);
      ctx.arc(gap, 0, r, 0, Math.PI * 2);
      ctx.closePath();
    };
  }

  // Toothy comic grin with two visible fangs.
  function fangGrin({ width, height, seed }) {
    width = width || 20; height = height || 12; seed = seed || 0;
    const hw = width / 2, hh = height / 2;
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(-hw, -hh);
      ctx.lineTo(hw, -hh);
      ctx.lineTo(hw, hh * 0.3);
      // Right fang
      ctx.lineTo(hw * 0.5, hh * 0.3);
      ctx.lineTo(hw * 0.35, hh);
      ctx.lineTo(hw * 0.2, hh * 0.3);
      // Middle gap
      ctx.lineTo(-hw * 0.2, hh * 0.3);
      // Left fang
      ctx.lineTo(-hw * 0.35, hh);
      ctx.lineTo(-hw * 0.5, hh * 0.3);
      ctx.lineTo(-hw, hh * 0.3);
      ctx.closePath();
    };
  }

  // Short rounded arm stump. side: 'left' (-1) or 'right' (1).
  function stubArm({ length, width, side, seed }) {
    length = length || 25; width = width || 8; side = side || 'right'; seed = seed || 0;
    const dir = side === 'left' ? -1 : 1;
    const rng = _rng('stub:' + seed);
    const angle = dir * (Math.PI * 0.45 + (rng() - 0.5) * 0.2);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const hw = width / 2;
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(-hw * sinA, hw * cosA);
      ctx.lineTo(-hw * sinA + cosA * length, hw * cosA + sinA * length);
      ctx.arc(cosA * length, sinA * length, hw, angle - Math.PI / 2 + Math.PI, angle + Math.PI / 2 + Math.PI);
      ctx.lineTo(hw * sinA, -hw * cosA);
      ctx.closePath();
    };
  }

  // Segmented arm with visible elbow joint.
  function bonyArm({ length, width, side, seed }) {
    length = length || 30; width = width || 7; side = side || 'right'; seed = seed || 0;
    const dir = side === 'left' ? -1 : 1;
    const rng = _rng('bony:' + seed);
    const upperAngle = dir * (Math.PI * 0.38 + (rng() - 0.5) * 0.15);
    const lowerAngle = dir * (Math.PI * 0.65 + (rng() - 0.5) * 0.2);
    const half = length / 2;
    const jx = Math.cos(upperAngle) * half;
    const jy = Math.sin(upperAngle) * half;
    const ex = jx + Math.cos(lowerAngle) * half;
    const ey = jy + Math.sin(lowerAngle) * half;
    const hw = width / 2;
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(jx - hw, jy);
      ctx.lineTo(ex - hw, ey);
      ctx.lineTo(ex + hw, ey);
      ctx.lineTo(jx + hw, jy);
      ctx.lineTo(hw, 0);
      ctx.closePath();
    };
  }

  // S-curve tail with seeded segments.
  function tail({ length, segments, seed }) {
    length = length || 50; segments = segments || 6; seed = seed || 0;
    const rng = _rng('tail:' + seed);
    const pts = [{ x: 0, y: 0 }];
    let angle = Math.PI * 0.15;
    const segLen = length / segments;
    for (let i = 0; i < segments; i++) {
      angle += (rng() - 0.5) * 0.6 - 0.05 * i;
      pts.push({
        x: pts[pts.length - 1].x + Math.cos(angle) * segLen,
        y: pts[pts.length - 1].y + Math.sin(angle) * segLen,
      });
    }
    const tipR = 4;
    return function(ctx) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      const last = pts[pts.length - 1];
      ctx.arc(last.x, last.y, tipR, 0, Math.PI * 2);
      ctx.closePath();
    };
  }

  // Pair of horns. kind: 'ram' | 'demon' | 'antler'
  function hornsPair({ size, kind, seed }) {
    size = size || 18; kind = kind || 'demon'; seed = seed || 0;
    const rng = _rng('horns:' + kind + ':' + seed);
    const gap = size * 0.7;
    // Pre-compute jitter so pathFn is pure (called twice: once for fill, once for stroke).
    const leftJitter  = (rng() - 0.5) * 4;
    const rightJitter = (rng() - 0.5) * 4;

    function _hornPath(ctx, side) {
      const d = side === 'left' ? -1 : 1;
      const jitter = side === 'left' ? leftJitter : rightJitter;
      if (kind === 'ram') {
        // moveTo arc start so we don't accidentally connect from previous subpath
        const startAngle = side === 'left' ? Math.PI * 0.5 : 0;
        const endAngle   = side === 'left' ? Math.PI * 1.5 : Math.PI * 2;
        const cx = d * gap, cy = -size * 0.5;
        ctx.moveTo(cx + Math.cos(startAngle) * size * 0.6, cy + Math.sin(startAngle) * size * 0.6);
        ctx.arc(cx, cy, size * 0.6, startAngle, endAngle);
      } else if (kind === 'demon') {
        ctx.moveTo(d * gap * 0.6, 0);
        ctx.lineTo(d * gap * 0.9, -size * 0.5);
        ctx.lineTo(d * gap * 1.1 + d * jitter, -size * 1.1);
        ctx.lineTo(d * gap * 0.7, -size * 0.5);
      } else { // antler
        ctx.moveTo(d * gap * 0.6, 0);
        ctx.lineTo(d * gap, -size * 0.7);
        ctx.lineTo(d * gap * 1.2, -size * 0.4);
        ctx.moveTo(d * gap, -size * 0.7);
        ctx.lineTo(d * gap * 0.85, -size * 1.0);
        ctx.lineTo(d * gap * 1.05, -size * 0.85);
      }
    }

    // Both horns in one path (two subpaths). No intermediate beginPath() — that would
    // discard the first horn before the caller can fill/stroke it.
    return function(ctx) {
      ctx.beginPath();
      _hornPath(ctx, 'left');
      ctx.closePath();
      _hornPath(ctx, 'right'); // moveTo inside _hornPath starts a new subpath
      ctx.closePath();
    };
  }

  // Pair of wings. kind: 'bat' | 'feather' | 'mech'
  function wingsPair({ size, kind, seed }) {
    size = size || 40; kind = kind || 'bat'; seed = seed || 0;
    const rng = _rng('wings:' + kind + ':' + seed);

    function _wingPath(ctx, side) {
      const d = side === 'left' ? -1 : 1;
      const sx = d * 12, sy = 0;
      if (kind === 'bat') {
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(d * (12 + size * 0.5), -size * 0.5, d * (12 + size), -size * 0.3, d * (12 + size * 1.1), -size * 0.1);
        ctx.bezierCurveTo(d * (12 + size * 0.9), -size * 0.1, d * (12 + size * 0.6), size * 0.4, sx, sy + size * 0.25);
        ctx.closePath();
      } else if (kind === 'feather') {
        ctx.moveTo(sx, sy);
        ctx.lineTo(d * (12 + size * 0.4), -size * 0.6);
        ctx.lineTo(d * (12 + size * 0.8), -size * 0.35);
        ctx.lineTo(d * (12 + size * 0.55), -size * 0.55);
        ctx.lineTo(d * (12 + size * 0.85), -size * 0.15);
        ctx.lineTo(sx + d * 4, sy + size * 0.2);
        ctx.closePath();
      } else { // mech
        const w = size * 0.45;
        ctx.moveTo(sx, sy);
        ctx.lineTo(d * (12 + size * 0.3), -size * 0.7);
        ctx.lineTo(d * (12 + size * 0.3 + w), -size * 0.7);
        ctx.lineTo(d * (12 + w), sy);
        ctx.closePath();
      }
    }

    // Both wings in one path. No intermediate beginPath() — _wingPath starts each
    // side with moveTo, which correctly opens a new subpath without discarding the first.
    return function(ctx) {
      ctx.beginPath();
      _wingPath(ctx, 'left');
      _wingPath(ctx, 'right');
    };
  }

  const shapes = { blob, egg, comicEyesPair, fangGrin, stubArm, bonyArm, tail, hornsPair, wingsPair };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = shapes;
  } else {
    global.shapes = shapes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
