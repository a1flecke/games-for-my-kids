'use strict';

// BossFightManager — multi-phase boss combat orchestrator.
// Mirrors FightManager's dep-injection pattern and timer lifecycle (CLAUDE.md).
// Allowed to use DOM, canvas, and audio globals (unlike pure combat/* modules).
class BossFightManager {
  constructor({ rng, masteryMap, realm, problemGen, distractors, mastery,
                audio, monsterRenderer, wizardRenderer,
                hud, anim, particles }) {
    this._rng = rng;
    this._masteryMap = masteryMap;
    this._realm = realm;
    this._problemGen = problemGen;
    this._distractors = distractors;
    this._mastery = mastery;
    this._audio = audio || null;
    this._renderer = monsterRenderer;
    this._wizardRenderer = wizardRenderer;
    this._hud = hud;
    this._anim = anim;
    this._particles = particles;

    this.state = 'IDLE';
    this._boss = null;
    this._bossCompiled = null;
    this._wizardCompiled = null;
    this._currentPhaseIdx = 0;
    this._currentProblem = null;
    this._currentOrbs = [];
    this._orbsRenderer = null;
    this._answerStartedAt = 0;
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._wizardFlavorHp = 60;

    // Timer IDs — all null per CLAUDE.md timer lifecycle pattern
    this._introTimer = null;
    this._phaseBreakTimer = null;
    this._resolveTimer = null;
    this._koTimer = null;

    // Pause tracking — shifts _answerStartedAt by paused duration
    this._pausedAt = 0;

    // Intro state: when intro started (for skip-after-1.5s gate)
    this._introStartedAt = 0;

    // Burst-text queue drawn each frame
    this._burstTexts = [];

    // Flash state for phase-break and KO effects: { color, maxAlpha, startedAt, duration }
    this._flashState = null;

    // Boss draw position — updated each draw() so _burst() knows where to spawn
    this._bossX = 0;
    this._bossY = 0;

    // Ultimate helper — created lazily in start()
    this._ultimate = null;

    this.onComplete = null;
    this._lessonComplete = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setOrbsRenderer(orbsRenderer) {
    this._orbsRenderer = orbsRenderer;
  }

  start(boss, realm, masteryMap) {
    // cancel() nulls onComplete to prevent stale callbacks; preserve the
    // caller-supplied callback across the defensive cancel at start().
    const savedCb = this.onComplete;
    this.cancel();
    this.onComplete = savedCb;
    this._lessonComplete = false;
    this._boss = boss;
    this._realm = realm;
    this._masteryMap = masteryMap;
    this._bossCompiled = this._renderer.buildCreature(boss);
    this._wizardCompiled = this._wizardRenderer.buildPortrait('apprentice');
    this._currentPhaseIdx = 0;
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._wizardFlavorHp = 60;
    this._burstTexts = [];
    this._flashState = null;
    this._introStartedAt = performance.now();
    this.state = 'INTRO';

    if (!this._ultimate) {
      this._ultimate = new Ultimate({
        audio: this._audio,
        hud: this._hud,
        anim: this._anim,
      });
    }

    this._hud.show();
    this._hud.setStreak(0);
    this._hud.setScore(0);
    this._hud.setWizardHp(60);
    this._hud.setBossPhaseLabel('');

    this._introTimer = setTimeout(() => this._enterPhase(0), 2400);
    this._anim.begin(boss.id, { kind: 'intro_slide', startedAt: performance.now(), duration: 1000 });
    this._playAudio('bossSpawn');
    this._narrate(boss.introSpeech, boss);
  }

  cancel() {
    clearTimeout(this._introTimer);      this._introTimer = null;
    clearTimeout(this._phaseBreakTimer); this._phaseBreakTimer = null;
    clearTimeout(this._resolveTimer);    this._resolveTimer = null;
    clearTimeout(this._koTimer);         this._koTimer = null;
    if (this._ultimate) this._ultimate.cancel();
    if (this._anim) this._anim.cancelAll();
    if (this._hud) this._hud.hide();
    this.onComplete = null;
  }

  // Per-frame update — called by game.js loop (not an independent RAF)
  update(dt) {
    const now = performance.now();
    this._burstTexts = this._burstTexts.filter(function(b) { return b.expiresAt > now; });
  }

  // Per-frame draw — called by game.js loop
  draw(ctx, w, h) {
    const now = performance.now();

    this._drawBackground(ctx, w, h);

    if (this._bossCompiled && this._boss) {
      const bx = w * 0.58;
      const by = h * 0.38;
      this._bossX = bx;
      this._bossY = by;
      const animState = this._anim.stateFor(this._boss.id, now);

      // Intro slide-in from right
      let drawX = bx;
      if (this.state === 'INTRO') {
        const introAnim = this._anim._states ? this._anim._states.get(this._boss.id) : null;
        if (introAnim && introAnim.kind === 'intro_slide') {
          const elapsed = now - introAnim.startedAt;
          const t = Math.min(1, elapsed / introAnim.duration);
          const ease = 1 - Math.pow(1 - t, 3);
          drawX = bx + w * 0.30 * (1 - ease);
        }
      }

      if (!(this.state === 'BOSS_KO' && animState.deathFade >= 1)) {
        ctx.save();
        if (animState.deathFade < 1) ctx.globalAlpha = Math.max(0, animState.deathFade);
        this._renderer.drawCreature(ctx, drawX, by, this._bossCompiled, animState, now);
        ctx.restore();
      }

      if (this.state !== 'BOSS_KO') {
        this._drawBossPhaseBar(ctx, drawX, by, this._boss);
      }
    }

    // Orbs — only in PHASE_ORB state
    if (this._orbsRenderer && this.state === 'PHASE_ORB' && this._currentOrbs.length > 0) {
      this._orbsRenderer.layout(w, h);
      this._orbsRenderer.draw(ctx, this._currentOrbs);
    }

    // Wizard portrait (bottom-left)
    if (this._wizardCompiled) {
      const wz = this._anim.stateFor('wizard', now);
      const scale = 0.42;
      ctx.save();
      ctx.translate(56, h - 70);
      ctx.scale(scale, scale);
      this._wizardRenderer.drawPortrait(ctx, -100, -120, this._wizardCompiled, wz, now);
      ctx.restore();
    }

    // Boss intro title card
    if (this.state === 'INTRO') {
      this._drawIntroCard(ctx, w, h, now);
    }

    // Panel flash (phase break / KO)
    if (this._flashState) {
      const fs = this._flashState;
      const elapsed = now - fs.startedAt;
      if (elapsed < fs.duration) {
        const alpha = fs.maxAlpha * (1 - elapsed / fs.duration);
        comicfx.panelFlash(ctx, w, h, fs.color, alpha);
      } else {
        this._flashState = null;
      }
    }

    // Burst texts
    for (let i = 0; i < this._burstTexts.length; i++) {
      const burst = this._burstTexts[i];
      if (burst.expiresAt <= now) continue;
      const age = 1 - (burst.expiresAt - now) / 900;
      const alpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      comicfx.burstText(ctx, burst.x, burst.y, burst.text, burst.size, '#f0d840', '#1a1a1a', 4);
      ctx.restore();
    }
  }

  notifyPaused() {
    if (this._pausedAt) return;
    this._pausedAt = performance.now();
    // game.js already pauses window.speech; don't double-pause here
  }

  notifyResumed() {
    if (!this._pausedAt) return;
    const pausedFor = performance.now() - this._pausedAt;
    if (this._answerStartedAt) this._answerStartedAt += pausedFor;
    this._pausedAt = 0;
  }

  // Called by game.js pointer handler when state === 'PHASE_ORB'
  selectOrb(value) {
    if (this.state !== 'PHASE_ORB') return;
    const correct = value === this._currentProblem.answer;
    const timeMs = performance.now() - this._answerStartedAt;
    this._resolve({ correct, value, timeMs });
  }

  // Called by game.js pointer handler to skip the intro (only allowed after 1.5s)
  trySkipIntro() {
    if (this.state !== 'INTRO') return;
    if (performance.now() - this._introStartedAt < 1500) return;
    clearTimeout(this._introTimer);
    this._introTimer = null;
    this._enterPhase(0);
  }

  // ── Private state machine ──────────────────────────────────────────────────

  _enterPhase(idx) {
    if (idx >= this._boss.phases.length) { this._victory(); return; }
    this._currentPhaseIdx = idx;
    this._currentProblem = null;
    this._currentOrbs = [];
    const phase = this._boss.phases[idx];
    this.state = 'PHASE_INTRO';
    // Clear stale problem text so previous phase's problem doesn't linger during phase break.
    this._hud.setProblem('');
    this._hud.setBossPhaseLabel('PHASE ' + (idx + 1) + ': ' + phase.label);
    this._narrate(phase.hint, null);
    clearTimeout(this._phaseBreakTimer);
    this._phaseBreakTimer = setTimeout(() => this._enterProblem(), 1500);
  }

  _enterProblem() {
    const phase = this._boss.phases[this._currentPhaseIdx];

    if (phase.kind === 'stretch') {
      const stretch = this._problemGen._selectStretch({ masteryMap: this._masteryMap, rng: this._rng });
      if (stretch) {
        this._currentProblem = stretch;
      } else {
        // No mastered family yet — fall back to a normal problem from the hint family
        this._currentProblem = this._problemGen.selectProblem({
          realm: { factFamilyWeights: { [phase.factFamilyHint]: 1.0 } },
          masteryMap: this._masteryMap,
          recentKeys: [],
          rng: this._rng,
          mulRatio: 0.5,
          allowStretch: false,
          realmTier: this._realm.tier || 1,
        });
      }
    } else {
      this._currentProblem = this._problemGen.selectProblem({
        realm: { factFamilyWeights: { [phase.factFamilyHint]: 1.0 } },
        masteryMap: this._masteryMap,
        recentKeys: [],
        rng: this._rng,
        mulRatio: phase.kind === 'mul' ? 1.0 : 0.0,
        allowStretch: false,
        realmTier: this._realm.tier || 1,
      });
    }

    // Null guard: selectProblem returns null only if no eligible keys exist (shouldn't happen)
    if (!this._currentProblem) {
      this._currentProblem = { displayText: '5 × 5 = ?', answer: 25, factKey: 'mul:5x5', isStretch: false, kind: 'mul', a: 5, b: 5 };
    }

    if (phase.mode === 'ultimate') {
      this.state = 'PHASE_ULTIMATE';
      // Ultimate.start() calls cancel() which nulls onResolve — assign AFTER start.
      this._ultimate.start(this._currentProblem);
      this._ultimate.onResolve = ({ correct, value, timeMs, escaped }) => {
        this._resolve({ correct, value, timeMs, escaped });
      };
    } else {
      this._currentOrbs = this._distractors.generateDistractors(this._currentProblem, this._rng);
      this._answerStartedAt = performance.now();
      this.state = 'PHASE_ORB';
    }
    this._hud.setProblem(this._currentProblem.displayText);
  }

  _resolve({ correct, value, timeMs, escaped }) {
    if (this._lessonComplete) return;          // re-entry guard (CLAUDE.md)
    if (!this._currentProblem) return;         // defensive: cancel raced this callback
    if (!this._currentProblem.isStretch) {
      this._mastery.recordResolve(this._masteryMap, this._currentProblem.factKey, {
        correct,
        timeMs,
        now: Date.now(),
        masteredAvgMs: this._mastery.masteredAvgMs(this._masteryMap),
      });
    }

    if (correct) {
      this._streak++;
      this._score += 200;
      this._hud.setStreak(this._streak);
      this._hud.setScore(this._score);

      // Glyph shatter: panel flash + ink burst + boss shake
      this._flashState = { color: '#fff', maxAlpha: 0.7, startedAt: performance.now(), duration: 500 };
      this._burst(this._bossX, this._bossY - 60, 'CRACK!', 48);
      this._anim.begin(this._boss.id, { kind: 'hit', startedAt: performance.now(), duration: 400 });
      this._playAudio('phaseBreak');

      this.state = 'PHASE_BREAK_ANIM';
      clearTimeout(this._phaseBreakTimer);
      this._phaseBreakTimer = setTimeout(() => this._enterPhase(this._currentPhaseIdx + 1), 1300);
    } else {
      this._streak = 0;
      this._hud.setStreak(0);
      this._wizardFlavorHp = Math.max(0, this._wizardFlavorHp - 15);
      this._hud.setWizardHp(this._wizardFlavorHp);
      this._anim.begin(this._boss.id, { kind: 'attack', startedAt: performance.now(), duration: 600 });
      this._playAudio('wrong');
      if (!escaped) {
        this._narrate('The answer was ' + this._currentProblem.answer + '.', null);
        this._hud.flashCorrect(this._currentProblem.answer);
      }
      clearTimeout(this._resolveTimer);
      this._resolveTimer = setTimeout(() => {
        if (this._wizardFlavorHp <= 0) this._defeatRetry();
        else this._enterProblem();
      }, 1500);
    }
  }

  _victory() {
    if (this._lessonComplete) return;
    this._lessonComplete = true;

    // Commit mastery to save — once per fight (CLAUDE.md mastery save cadence)
    const data = SaveManager.load();
    data.mastery = this._masteryMap;
    SaveManager.save(data);

    const cb = this.onComplete;
    const score = this._score;
    const streak = this._streak;
    const retries = this._retries;
    const bossId = this._boss ? this._boss.id : null;
    const bossX = this._bossX;
    const bossY = this._bossY;
    this.cancel();

    this.state = 'BOSS_KO';

    if (this._boss) {
      this._anim.begin(this._boss.id, { kind: 'death', startedAt: performance.now(), duration: 1500 });
    }

    // KO cinematic — flash + VICTORY! burst
    this._flashState = { color: '#fff', maxAlpha: 1.0, startedAt: performance.now(), duration: 400 };
    this._burst(bossX, bossY - 80, 'VICTORY!', 72);
    this._playAudio('ko');

    this._koTimer = setTimeout(function() {
      if (cb) cb({ outcome: 'boss_victory', score: score, streak: streak, retries: retries, bossId: bossId });
    }, 2000);
  }

  _defeatRetry() {
    this._retries++;
    this._wizardFlavorHp = 60;
    this._streak = 0;
    this._hud.setWizardHp(60);
    this._hud.setStreak(0);
    this._narrate(this._boss.name + ' laughs! Try again!', this._boss);
    clearTimeout(this._resolveTimer);
    this._resolveTimer = setTimeout(() => this._enterPhase(this._currentPhaseIdx), 2000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _burst(x, y, text, size) {
    this._burstTexts.push({ text: text, x: x, y: y, size: size || 48, expiresAt: performance.now() + 900 });
    if (this._particles) {
      const bossColor = (this._boss && this._boss.palette && this._boss.palette.body) ? this._boss.palette.body : '#f0d840';
      for (let p = 0; p < 12; p++) {
        const angle = this._rng() * Math.PI * 2;
        const speed = 70 + this._rng() * 100;
        this._particles.spawn('inkdot', x, y,
          Math.cos(angle) * speed, Math.sin(angle) * speed - 50,
          500 + this._rng() * 400, bossColor);
      }
    }
  }

  _narrate(text, voice) {
    if (!window.speech) return;
    const opts = (voice && voice.voiceProfile)
      ? { pitch: voice.voiceProfile.pitch, rate: voice.voiceProfile.rate }
      : undefined;
    window.speech.speakIfAuto(text, opts);
  }

  _playAudio(name) {
    if (this._audio && typeof this._audio.play === 'function') {
      this._audio.play(name);
    }
  }

  _drawBackground(ctx, w, h) {
    const palette = this._realm && this._realm.palette;
    if (palette && palette.bgGradient && palette.bgGradient.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, palette.bgGradient[0]);
      grad.addColorStop(1, palette.bgGradient[1]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#3a5c2a';
    }
    ctx.fillRect(0, 0, w, h);
  }

  _drawBossPhaseBar(ctx, bx, by, boss) {
    const phaseCount = boss.phases.length;
    const segGap = 4;
    const barW = 220;
    const segW = Math.floor((barW - (phaseCount - 1) * segGap) / phaseCount);
    const barH = 18;
    const barX = bx - barW / 2;
    const barY = by - 180;

    ctx.fillStyle = '#2C2416';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    for (let i = 0; i < phaseCount; i++) {
      const sx = barX + i * (segW + segGap);
      const cleared = i < this._currentPhaseIdx;
      const current = i === this._currentPhaseIdx;
      // High-contrast progression: cleared = muted gold, current = bright red, pending = dark gray.
      ctx.fillStyle = cleared ? '#a87c30' : current ? '#e84040' : '#3a3028';
      ctx.fillRect(sx, barY, segW, barH);
      if (current) {
        ctx.strokeStyle = '#fff080';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, barY + 1, segW - 2, barH - 2);
      }
    }

    ctx.font = 'bold 18px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1a1a1a';
    ctx.strokeText(boss.name, bx, barY - 4);
    ctx.fillStyle = '#F5F0E8';
    ctx.fillText(boss.name, bx, barY - 4);
    ctx.textBaseline = 'alphabetic';
  }

  _drawIntroCard(ctx, w, h, now) {
    if (!this._boss) return;

    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.36);
    comicfx.panelBorder(ctx, w * 0.08, h * 0.12, w * 0.84, h * 0.36, 5, '#f0d840');

    ctx.font = 'bold 42px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a1a1a';
    ctx.strokeText(this._boss.name.toUpperCase(), w / 2, h * 0.26);
    ctx.fillStyle = '#f0d840';
    ctx.fillText(this._boss.name.toUpperCase(), w / 2, h * 0.26);

    // Skip hint visible after 1.5s
    if (now - this._introStartedAt > 1500) {
      ctx.font = '15px "OpenDyslexic", "Comic Sans MS", cursive';
      ctx.fillStyle = 'rgba(245,240,232,0.75)';
      ctx.fillText('Tap to skip', w / 2, h * 0.12 + h * 0.36 - 18);
    }

    ctx.textBaseline = 'alphabetic';
  }
}
