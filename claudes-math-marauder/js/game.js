'use strict';

const STATE = {
  TITLE: 'TITLE',
  HUB: 'HUB',
  REALM_PICK: 'REALM_PICK',
  RUN_MAP: 'RUN_MAP',
  FIGHT: 'FIGHT',
  RESULTS: 'RESULTS',
  PAUSED: 'PAUSED',
};

class Game {
  constructor() {
    this.state = STATE.TITLE;
    this.canvas = null;
    this.ctx = null;
    this._lastFrameTime = 0;
    this._rafId = 0;
    this._prevState = null;
    this._save = null;
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
    // Apply font scale
    if (data.settings.fontScale && data.settings.fontScale !== 1.0) {
      document.documentElement.style.fontSize = Math.round(20 * data.settings.fontScale) + 'px';
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
  }

  _loop(now) {
    if (!this._lastFrameTime) this._lastFrameTime = now;
    let dt = now - this._lastFrameTime;
    if (dt > 50) dt = 50;
    this._lastFrameTime = now;

    if (this.state !== STATE.PAUSED) this._update(dt);
    this._draw();
    this._rafId = requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // Future sessions drive managers here
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.fillStyle = '#F5F0E8';
    this.ctx.fillRect(0, 0, w, h);
  }

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
}

// CLAUDE.md init pattern
window.game = new Game();
window.game.init();
