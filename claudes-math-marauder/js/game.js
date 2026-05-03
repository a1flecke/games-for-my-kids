'use strict';

const STATE = {
  TITLE: 'TITLE',
  HUB: 'HUB',
  REALM_PICK: 'REALM_PICK',
  RUN_MAP: 'RUN_MAP',
  FIGHT: 'FIGHT',
  RESULTS: 'RESULTS',
  PAUSED: 'PAUSED',
  DEMO: 'DEMO',
};

// ── Demo monster data ──────────────────────────────────────────────────────────
const DEMO_MONSTERS = [
  {
    id: 'goblin',
    label: 'Goblin',
    palette: { body: '#5a8a44', head: '#6a9a54', limbs: '#4a7a34', eyes: '#fff', pupils: '#1a1a1a', mouth: '#1a1a1a', horns: '#c8a040' },
    shape: {
      body:  { kind: 'blob',       rx: 36, ry: 42, wobble: 6,  seed: 11 },
      head:  { kind: 'egg',        rx: 22, ry: 28, tilt: 0.08, seed: 12 },
      eyes:  { kind: 'comic_pair', size: 11, expr: 'angry',    seed: 13 },
      mouth: { kind: 'fang_grin',  width: 20, height: 12,      seed: 14 },
      limbs: [
        { kind: 'stub_arm', length: 26, width: 8, side: 'left',  seed: 15 },
        { kind: 'stub_arm', length: 26, width: 8, side: 'right', seed: 16 },
      ],
    },
    layout: {
      body:  { ox: 0,   oy: 0   },
      head:  { ox: 0,   oy: -56 },
      eyes:  { ox: 0,   oy: -60 },
      mouth: { ox: 0,   oy: -44 },
      limb0: { ox: -48, oy: -8  },
      limb1: { ox:  48, oy: -8  },
    },
  },
  {
    id: 'dragon',
    label: 'Dragon',
    palette: { body: '#8b3030', head: '#a03838', limbs: '#6b2020', eyes: '#ffe040', pupils: '#1a1a1a', horns: '#d0b040', wings: '#6a2020' },
    shape: {
      body:  { kind: 'blob',       rx: 52, ry: 58, wobble: 8,  seed: 21 },
      head:  { kind: 'egg',        rx: 30, ry: 36, tilt: -0.1, seed: 22 },
      eyes:  { kind: 'comic_pair', size: 14, expr: 'angry',    seed: 23 },
      horns: { kind: 'demon',      size: 22,                   seed: 24 },
      wings: { kind: 'bat',        size: 55,                   seed: 25 },
      tail:  { kind: 'tail',       length: 60, segments: 7,    seed: 26 },
    },
    layout: {
      body:  { ox: 0,   oy:  10  },
      head:  { ox: 0,   oy: -62  },
      eyes:  { ox: 0,   oy: -68  },
      horns: { ox: 0,   oy: -82  },
      wings: { ox: 0,   oy: -10  },
      tail:  { ox: 50,  oy:  30  },
    },
  },
  {
    id: 'lich',
    label: 'Lich',
    palette: { body: '#303030', head: '#282828', limbs: '#383838', eyes: '#80ff80', pupils: '#1a1a1a', mouth: '#1a1a1a' },
    shape: {
      body:  { kind: 'blob',       rx: 30, ry: 52, wobble: 4,  seed: 31 },
      head:  { kind: 'egg',        rx: 26, ry: 30, tilt: 0,    seed: 32 },
      eyes:  { kind: 'comic_pair', size: 10, expr: 'dead',     seed: 33 },
      mouth: { kind: 'fang_grin',  width: 16, height: 10,      seed: 34 },
      limbs: [
        { kind: 'bony_arm', length: 32, width: 6, side: 'left',  seed: 35 },
        { kind: 'bony_arm', length: 32, width: 6, side: 'right', seed: 36 },
      ],
    },
    layout: {
      body:  { ox: 0,   oy: 10  },
      head:  { ox: 0,   oy: -60 },
      eyes:  { ox: 0,   oy: -64 },
      mouth: { ox: 0,   oy: -50 },
      limb0: { ox: -42, oy: -5  },
      limb1: { ox:  42, oy: -5  },
    },
  },
];

// ── Game ──────────────────────────────────────────────────────────────────────
class Game {
  constructor() {
    this.state = STATE.TITLE;
    this.canvas = null;
    this.ctx = null;
    this._lastFrameTime = 0;
    this._rafId = 0;
    this._prevState = null;
    this._save = null;

    // FX system — initialised in init()
    this._fxCache = null;
    this._animManager = null;
    this._particles = null;
    this._monsterRenderer = null;
    this._wizardRenderer = null;

    // Demo-mode state
    this._demo = null;

    // FPS tracking
    this._fpsFrames = 0;
    this._fpsLast = 0;
    this._fpsEl = null;
  }

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._setupCanvasDpr();
    window.addEventListener('resize', () => this._setupCanvasDpr());

    this._loop = this._loop.bind(this);
    this._rafId = requestAnimationFrame(this._loop);

    this._bindTitleScreen();
    this._bindPauseScreen();

    this._save = SaveManager.load();
    const data = this._save;
    if (data.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.setAttribute('data-reduced-motion', 'true');
    }
    if (data.settings.fontScale && data.settings.fontScale !== 1.0) {
      document.documentElement.style.fontSize = Math.round(20 * data.settings.fontScale) + 'px';
    }

    // Initialise FX system
    this._fxCache = new FxCache(30);
    this._animManager = new AnimationManager();
    this._particles = new ParticlePool(128);
    this._monsterRenderer = new MonsterRenderer(this._fxCache);
    this._wizardRenderer = new WizardRenderer(this._fxCache);

    // FPS counter
    this._fpsEl = document.getElementById('fps-counter');

    // Boot into demo mode if ?demo=1
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      this._initDemo();
      this.setState(STATE.DEMO);
    }
  }

  _setupCanvasDpr() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width === w * dpr && this.canvas.height === h * dpr) return;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
    // Invalidate all cached canvases when DPR changes — they were drawn for the old scale.
    if (this._fxCache) this._fxCache._map.clear();
    if (this._demo) this._demo.compiled = null; // will rebuild on next frame
  }

  // ── RAF loop ─────────────────────────────────────────────────────────────────
  _loop(now) {
    if (!this._lastFrameTime) this._lastFrameTime = now;
    let dt = now - this._lastFrameTime;
    if (dt > 50) dt = 50;
    this._lastFrameTime = now;

    // FPS counter — update DOM 1× per second
    this._fpsFrames++;
    if (now - this._fpsLast >= 1000) {
      if (this._fpsEl) this._fpsEl.textContent = this._fpsFrames + ' fps';
      this._fpsFrames = 0;
      this._fpsLast = now;
    }

    if (this.state !== STATE.PAUSED) this._update(dt, now);
    this._draw(now);
    this._rafId = requestAnimationFrame(this._loop);
  }

  _update(dt, now) {
    if (this._animManager) this._animManager.update(dt, now);
    if (this._particles) this._particles.update(dt);
  }

  _draw(now) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.fillStyle = '#F5F0E8';
    this.ctx.fillRect(0, 0, w, h);

    if (this.state === STATE.DEMO) {
      this._drawDemo(now, w, h);
    }

    if (this._particles) this._particles.draw(this.ctx);
  }

  // ── State machine ─────────────────────────────────────────────────────────────
  setState(next) {
    if (this.state === next) return;
    this._prevState = this.state;
    this.state = next;
    this._refreshScreens();
  }

  _refreshScreens() {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    const id = this.state.toLowerCase().replace(/_/g, '-') + '-screen';
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
    } else {
      console.warn('[Game] No screen element for state:', this.state, '(expected #' + id + ')');
    }
  }

  // ── Title / Pause bindings ────────────────────────────────────────────────────
  _bindTitleScreen() {
    const btn = document.getElementById('start-button');
    if (btn) btn.addEventListener('click', () => this.setState(STATE.HUB));
  }

  _bindPauseScreen() {
    const btn = document.getElementById('resume-button');
    if (btn) btn.addEventListener('click', () => {
      if (this.state === STATE.PAUSED && this._prevState) {
        this.setState(this._prevState);
      }
    });
  }

  pause() {
    if (this.state !== STATE.PAUSED) this.setState(STATE.PAUSED);
  }

  // ── Demo screen ───────────────────────────────────────────────────────────────
  _initDemo() {
    // Compile all three demo monsters.
    const compiled = DEMO_MONSTERS.map(m => this._monsterRenderer.buildCreature(m));
    // Wizard portrait.
    const wizard = this._wizardRenderer.buildPortrait('apprentice');
    // State for the panelFlash tile toggle.
    let flashOn = false;
    let shakeUntilMs = 0;

    this._demo = {
      compiled,
      wizard,
      flashOn,
      shakeUntilMs,
      monsters: DEMO_MONSTERS,
    };

    // Bind demo DOM buttons — set up ONCE, not in RAF.
    this._bindDemoButtons();
  }

  _bindDemoButtons() {
    // "Hit me" buttons for each monster.
    DEMO_MONSTERS.forEach((m, i) => {
      const btn = document.getElementById('demo-hit-' + i);
      if (btn) btn.addEventListener('click', () => {
        this._animManager.begin(m.id, {
          kind: 'hit',
          startedAt: performance.now(),
          duration: 400,
        });
        // Spawn particles at monster position.
        const pos = this._demoMonsterPos(i, this.canvas.clientWidth, this.canvas.clientHeight);
        for (let p = 0; p < 12; p++) {
          const rng = mulberry32((Date.now() * 31 + p * 17) | 0);
          this._particles.spawn('sparkle', pos.x, pos.y - 30,
            (rng() - 0.5) * 180, -60 - rng() * 120, 500 + rng() * 300, '#f0d840');
        }
      });
    });

    // Flash toggle.
    const flashBtn = document.getElementById('demo-flash-toggle');
    if (flashBtn) flashBtn.addEventListener('click', () => {
      this._demo.flashOn = !this._demo.flashOn;
      flashBtn.setAttribute('aria-pressed', this._demo.flashOn ? 'true' : 'false');
    });

    // Screen-shake toggle.
    const shakeBtn = document.getElementById('demo-shake-toggle');
    if (shakeBtn) shakeBtn.addEventListener('click', () => {
      this._demo.shakeUntilMs = performance.now() + 400;
    });
  }

  _demoMonsterPos(idx, w, h) {
    const monsterAreaTop = h * 0.52;
    const monsterAreaH = h - monsterAreaTop - 60;
    const slotW = w / 3;
    return {
      x: slotW * idx + slotW / 2,
      y: monsterAreaTop + monsterAreaH * 0.5,
    };
  }

  _drawDemo(now, w, h) {
    const ctx = this.ctx;
    const demo = this._demo;
    if (!demo) return;

    // Rebuild compiled parts if cache was cleared (e.g. DPR change).
    if (!demo.compiled || demo.compiled.some(c => !c)) {
      demo.compiled = DEMO_MONSTERS.map(m => this._monsterRenderer.buildCreature(m));
    }

    // ── Primitives grid ─────────────────────────────────────────────────
    const COLS = 5, ROWS = 2;
    const GRID_TOP = 12;
    const TILE_W = Math.floor(w / COLS);
    const TILE_H = Math.floor((h * 0.46) / ROWS);

    const primitives = [
      { label: 'inkOutline', draw: (x, y, tw, th) => this._demoInkOutline(ctx, x, y, tw, th) },
      { label: 'halftoneFill', draw: (x, y, tw, th) => this._demoHalftoneFill(ctx, x, y, tw, th) },
      { label: 'speedLines', draw: (x, y, tw, th) => this._demoSpeedLines(ctx, x, y, tw, th) },
      { label: 'burstText ZAP!', draw: (x, y, tw, th) => this._demoBurstText(ctx, x, y, tw, th) },
      { label: 'inkBurst', draw: (x, y, tw, th) => this._demoInkBurst(ctx, x, y, tw, th) },
      { label: 'panelFlash', draw: (x, y, tw, th) => this._demoPanelFlash(ctx, x, y, tw, th, now) },
      { label: 'panelBorder', draw: (x, y, tw, th) => this._demoPanelBorder(ctx, x, y, tw, th) },
      { label: 'screenShake', draw: (x, y, tw, th) => this._demoScreenShake(ctx, x, y, tw, th, now) },
      { label: 'wizard', draw: (x, y, tw, th) => this._demoWizard(ctx, x, y, tw, th, now) },
      { label: 'particles', draw: (x, y, tw, th) => this._demoParticlesTile(ctx, x, y, tw, th) },
    ];

    for (let i = 0; i < primitives.length; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const tx = col * TILE_W, ty = GRID_TOP + row * TILE_H;
      const pad = 6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx + pad, ty + pad, TILE_W - pad * 2, TILE_H - pad * 2);
      ctx.clip();
      primitives[i].draw(tx, ty, TILE_W, TILE_H);
      ctx.restore();
      comicfx.panelBorder(ctx, tx + pad, ty + pad, TILE_W - pad * 2, TILE_H - pad * 2, 3);
      // Tile label
      ctx.fillStyle = '#595143';
      ctx.font = '11px "OpenDyslexic", "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.fillText(primitives[i].label, tx + TILE_W / 2, ty + TILE_H - 8);
    }

    // ── Section divider ──────────────────────────────────────────────────
    const divY = GRID_TOP + ROWS * TILE_H + 6;
    ctx.strokeStyle = '#2C2416';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(12, divY); ctx.lineTo(w - 12, divY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Three demo monsters ──────────────────────────────────────────────
    const shake = comicfx.screenShake(now, 5, demo.shakeUntilMs);

    for (let i = 0; i < 3; i++) {
      const pos = this._demoMonsterPos(i, w, h);
      const animState = this._animManager.stateFor(DEMO_MONSTERS[i].id, now);
      ctx.save();
      ctx.translate(shake.dx, shake.dy);
      this._monsterRenderer.drawCreature(ctx, pos.x, pos.y, demo.compiled[i], animState, now);
      ctx.restore();

      // Monster label
      ctx.fillStyle = '#2C2416';
      ctx.font = 'bold 16px "OpenDyslexic", "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.fillText(DEMO_MONSTERS[i].label, pos.x, pos.y + 80);
    }

    // panelFlash — skip when reduced-motion is active (prefers-reduced-motion or manual toggle)
    if (demo.flashOn && !document.body.hasAttribute('data-reduced-motion')) {
      const alpha = 0.35 + 0.2 * Math.sin(now / 400);
      comicfx.panelFlash(ctx, w, h, '#f0d840', alpha);
    }
  }

  // ── Primitive tile drawers ────────────────────────────────────────────────────
  _demoInkOutline(ctx, tx, ty, tw, th) {
    const blobFn = shapes.blob({ rx: tw * 0.28, ry: th * 0.28, wobble: 8, seed: 99 });
    ctx.save();
    ctx.translate(tx + tw / 2, ty + th / 2 - 8);
    ctx.fillStyle = '#4a60a8';
    blobFn(ctx); ctx.fill();
    comicfx.inkOutline(ctx, blobFn, 4, '#1a1a1a', 99);
    ctx.restore();
  }

  _demoHalftoneFill(ctx, tx, ty, tw, th) {
    const pad = 16;
    comicfx.halftoneFill(ctx, tx + pad, ty + pad, tw - pad * 2, th - pad * 2 - 14, '#4a7a34', 0.055, 7);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx + pad, ty + pad, tw - pad * 2, th - pad * 2 - 14);
  }

  _demoSpeedLines(ctx, tx, ty, tw, th) {
    const cx = tx + tw / 2, cy = ty + th * 0.45;
    comicfx.speedLines(ctx, cx, cy, 0, 12, Math.min(tw, th) * 0.38, '#1a1a1a');
    ctx.fillStyle = '#f0d840';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
  }

  _demoBurstText(ctx, tx, ty, tw, th) {
    comicfx.burstText(ctx, tx + tw / 2, ty + th * 0.44, 'ZAP!', Math.min(tw, th) * 0.38, '#f0d840', '#1a1a1a', 5);
  }

  _demoInkBurst(ctx, tx, ty, tw, th) {
    const cx = tx + tw / 2, cy = ty + th * 0.44;
    comicfx.inkBurst(ctx, cx, cy, Math.min(tw, th) * 0.34, '#1a1a1a', 24, 42);
    ctx.fillStyle = '#c93434';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  _demoPanelFlash(ctx, tx, ty, tw, th, now) {
    const reducedMotion = document.body.hasAttribute('data-reduced-motion');
    const alpha = reducedMotion ? 0.3 : (0.25 + 0.2 * Math.sin(now / 350));
    // panelFlash fills from (0,0) by tw×th; translate so origin is tile top-left.
    ctx.save();
    ctx.translate(tx, ty);
    comicfx.panelFlash(ctx, tw, th - 14, '#c93434', alpha);
    ctx.restore();
    ctx.fillStyle = '#2C2416';
    ctx.font = '12px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('pulsing', tx + tw / 2, ty + th * 0.44);
  }

  _demoPanelBorder(ctx, tx, ty, tw, th) {
    const pad = 14;
    comicfx.panelBorder(ctx, tx + pad, ty + pad, tw - pad * 2, th - pad * 2 - 14, 6, '#1a1a1a');
    comicfx.panelBorder(ctx, tx + pad + 6, ty + pad + 6, tw - pad * 2 - 12, th - pad * 2 - 26, 2, '#595143');
  }

  _demoScreenShake(ctx, tx, ty, tw, th, now) {
    const shaking = this._demo && this._demo.shakeUntilMs > now;
    const { dx, dy } = comicfx.screenShake(now, 5, (this._demo && this._demo.shakeUntilMs) || 0);
    ctx.save();
    ctx.translate(tx + tw / 2 + dx, ty + th * 0.42 + dy);
    const sqFn = function(c) {
      c.beginPath(); c.rect(-20, -20, 40, 40);
    };
    ctx.fillStyle = shaking ? '#c93434' : '#2c5fb3';
    sqFn(ctx); ctx.fill();
    comicfx.inkOutline(ctx, sqFn, 3, '#1a1a1a', 0);
    ctx.restore();
  }

  _demoWizard(ctx, tx, ty, tw, th, now) {
    const demo = this._demo;
    if (!demo || !demo.wizard) return;
    const scale = Math.min(tw / 200, (th - 20) / 240) * 0.85;
    const wx = tx + tw / 2 - (200 * scale) / 2;
    const wy = ty + (th - 20) / 2 - (240 * scale) / 2;
    ctx.save();
    ctx.translate(wx + (200 * scale) / 2, wy + (240 * scale) / 2);
    ctx.scale(scale, scale);
    this._wizardRenderer.drawPortrait(ctx, -100, -120, demo.wizard,
      this._animManager.stateFor('wizard', now), now);
    ctx.restore();
  }

  _demoParticlesTile(ctx, tx, ty, tw, th) {
    // Particles are drawn globally in _draw(); this tile just shows a label hint.
    ctx.fillStyle = '#595143';
    ctx.font = '12px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('click monsters', tx + tw / 2, ty + th * 0.44);
  }
}

// CLAUDE.md init pattern
window.game = new Game();
window.game.init();
