(function(global) {
  'use strict';

  function _makeNoise(ctx, durationSec) {
    const bufSize = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  const SFX_RECIPES = {
    orbHover(ctx, out) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      filter.connect(out);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    },

    orbCorrect(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    },

    spellCast(ctx, out) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.1);
      oscGain.gain.setValueAtTime(0.18, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(oscGain);
      oscGain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.21);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.2);
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 2;
      noiseGain.gain.setValueAtTime(0.06, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(ctx.currentTime);
    },

    hit(ctx, out) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.15);
      oscGain.gain.setValueAtTime(0.15, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.connect(oscGain);
      oscGain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.1);
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(ctx.currentTime);
    },

    critHit(ctx, out) {
      SFX_RECIPES.hit(ctx, out);
      [1760, 2093, 2637].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.06;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    },

    wrong(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.21);
    },

    streakChime3(ctx, out) {
      [523, 659, 784].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.1;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    },

    streakChime5(ctx, out) {
      [659, 784, 988, 1047, 1319].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.08;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    },

    streakChime10(ctx, out) {
      [784, 988, 1047, 1319, 1568, 2093].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.07;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.13, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      // Reverb tail
      [784, 988, 1047].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + 0.5 + i * 0.12;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    },

    ultimateChargeFull(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.65);
    },

    ultimateFire(ctx, out) {
      [[110, 440], [165, 660], [220, 880]].forEach(function(pair, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.05;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pair[0], t);
        osc.frequency.linearRampToValueAtTime(pair[1], t + 0.35);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.55);
      });
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.3);
      filter.type = 'highpass';
      filter.frequency.value = 800;
      noiseGain.gain.setValueAtTime(0.06, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(ctx.currentTime);
    },

    bossSpawn(ctx, out) {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.5);
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(ctx.currentTime);
      [110, 165].forEach(function(freq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(out);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
      });
    },

    ko(ctx, out) {
      [523, 659, 784, 1047].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.12;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    },

    bossKo(ctx, out) {
      SFX_RECIPES.ko(ctx, out);
      [1047, 1319, 1568].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + 0.5 + i * 0.14;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(80, ctx.currentTime + 0.5);
      boom.frequency.linearRampToValueAtTime(30, ctx.currentTime + 1.0);
      boomGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.5);
      boomGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
      boom.connect(boomGain);
      boomGain.connect(out);
      boom.start(ctx.currentTime + 0.5);
      boom.stop(ctx.currentTime + 1.05);
    },

    pageFlip(ctx, out) {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.08);
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      src.start(ctx.currentTime);
    },

    uiTap(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.005);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    },

    phaseBreak(ctx, out) {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      src.buffer = _makeNoise(ctx, 0.05);
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      noiseGain.gain.setValueAtTime(0.18, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(ctx.currentTime);
      [1319, 1568, 2093].forEach(function(freq, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + 0.04 + i * 0.05;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    },

    monsterSpawn(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc2.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.22);
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.24);
      osc2.connect(gain2);
      gain2.connect(out);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.25);
    },

    goblinGrunt(ctx, out) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.08);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    },
  };

  class SfxBank {
    constructor() {
      this._ctx = null;
      this._volume = 0.7;
      this._muted = false;
    }

    _getCtx() {
      if (this._ctx) return this._ctx;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this._ctx = new Ctor();
      } catch (e) { return null; }
      return this._ctx;
    }

    play(name) {
      if (this._muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      ctx.resume().then(() => this._schedule(name, ctx)).catch(function() {});
    }

    setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }

    setMuted(m) {
      this._muted = !!m;
      if (m) { try { if (this._ctx) this._ctx.suspend(); } catch (e) {} }
      else   { try { if (this._ctx) this._ctx.resume();  } catch (e) {} }
    }

    _schedule(name, ctx) {
      const fn = SFX_RECIPES[name];
      if (!fn) return;
      const g = ctx.createGain();
      g.gain.value = this._volume;
      g.connect(ctx.destination);
      fn(ctx, g);
    }
  }

  global.SfxBank = SfxBank;
})(typeof window !== 'undefined' ? window : globalThis);
