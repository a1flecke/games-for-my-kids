'use strict';

// FightManager — central combat orchestrator.
// Allowed to use DOM, canvas, and audio globals (unlike pure combat/* modules).
// Injected deps keep combat testable and replayable given (runSeed, masteryState, inputSequence).
class FightManager {
  constructor({ rng, masteryMap, realm, problemGen, distractors, mastery,
                onComplete, audio, monsterRenderer, wizardRenderer,
                hud, anim, particles, allowStretch }) {
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
    this._allowStretch = allowStretch !== false;

    this.state = 'IDLE';
    this._monster = null;
    this._monsterCompiled = null;
    this._monsterKO = false;
    this._wizardCompiled = null;
    this._currentProblem = null;
    this._currentOrbs = [];
    this._orbsRenderer = null;
    this._answerStartedAt = 0;
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._ultimateCharge = 0;
    this._monsterHpRemaining = 0;
    this._wizardFlavorHp = 60;
    this._recentKeys = [];
    this._problemsAnsweredThisFight = 0;
    this._correctThisFight = 0;

    // Timer IDs — all declared as null per CLAUDE.md timer lifecycle pattern
    this._introTimer = null;
    this._resolveTimer = null;
    this._wrongRevealTimer = null;

    // Pause tracking — shifts _answerStartedAt forward by paused duration so
    // the speed bonus reflects active answering time only.
    this._pausedAt = 0;

    // Burst-text queue drawn each frame
    this._burstTexts = [];

    // Monster draw position — updated each draw() call so _burst() knows where to spawn
    this._monsterX = 0;
    this._monsterY = 0;

    // Ultimate helper — created lazily in start() so hud/anim refs are ready.
    this._ultimate = null;
    // When set, the next correct orb-cast answer deals half damage (ultimate-miss penalty).
    this._halfDamageOnNext = false;

    this.onComplete = onComplete || null;
    this._lessonComplete = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setOrbsRenderer(orbsRenderer) {
    this._orbsRenderer = orbsRenderer;
  }

  start(monster, opts) {
    this.cancel();
    opts = opts || {};
    this._lessonComplete = false;
    this._monster = monster;
    this._monsterKO = false;
    this._monsterCompiled = this._renderer.buildCreature(monster);
    this._wizardCompiled = this._wizardRenderer.buildPortrait('apprentice');
    this._monsterHpRemaining = monster.hp;
    this._streak = 0;
    this._score = 0;
    this._retries = 0;
    this._ultimateCharge = opts.startCharged ? 1.0 : 0;
    this._halfDamageOnNext = false;
    this._recentKeys = [];
    this._burstTexts = [];
    this._problemsAnsweredThisFight = 0;
    this._correctThisFight = 0;
    this._wizardFlavorHp = 60;
    this.state = 'INTRO';

    // Create Ultimate helper once per FightManager lifecycle.
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
    this._hud.setUltimateCharge(this._ultimateCharge);
    this._hud.setWizardHp(60);

    this._introTimer = setTimeout(() => this._enterProblem(), 1100);
    this._anim.begin(monster.id, { kind: 'intro_slide', startedAt: performance.now(), duration: 1000 });
    this._playAudio('monsterSpawn');
    this._narrate(this._pickTaunt(monster));
  }

  cancel() {
    clearTimeout(this._introTimer);        this._introTimer = null;
    clearTimeout(this._resolveTimer);      this._resolveTimer = null;
    clearTimeout(this._wrongRevealTimer);  this._wrongRevealTimer = null;
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

    // Monster
    if (this._monsterCompiled && this._monster) {
      const mx = w * 0.62;
      const my = h * 0.40;
      this._monsterX = mx;
      this._monsterY = my;
      const animState = this._anim.stateFor(this._monster.id, now);

      // Intro slide-in from right
      let drawX = mx;
      if (this.state === 'INTRO') {
        const introAnim = this._anim._states ? this._anim._states.get(this._monster.id) : null;
        if (introAnim && introAnim.kind === 'intro_slide') {
          const elapsed = now - introAnim.startedAt;
          const t = Math.min(1, elapsed / introAnim.duration);
          const ease = 1 - Math.pow(1 - t, 3);
          drawX = mx + w * 0.25 * (1 - ease);
        }
      }

      // Once KO'd, the death anim plays then is pruned by AnimationManager —
      // hold the monster invisible from that point so it doesn't pop back.
      if (this._monsterKO && animState.deathFade >= 1) {
        // skip drawing
      } else {
        ctx.save();
        if (animState.deathFade < 1) ctx.globalAlpha = Math.max(0, animState.deathFade);
        this._renderer.drawCreature(ctx, drawX, my, this._monsterCompiled, animState, now);
        ctx.restore();

        // Monster HP bar above monster — hide once KO'd
        if (!this._monsterKO) {
          this._drawMonsterHpBar(ctx, drawX, my, this._monster);
        }
      }
    }

    // Orbs — only shown in ANSWERING state
    if (this._orbsRenderer && this.state === 'ANSWERING' && this._currentOrbs.length > 0) {
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

    // Burst texts
    const nowMs = performance.now();
    for (let i = 0; i < this._burstTexts.length; i++) {
      const burst = this._burstTexts[i];
      if (burst.expiresAt <= nowMs) continue;
      const age = 1 - (burst.expiresAt - nowMs) / 800;
      const alpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      comicfx.burstText(ctx, burst.x, burst.y, burst.text, 48, '#f0d840', '#1a1a1a', 4);
      ctx.restore();
    }
  }

  // Called by game.js when entering/leaving PAUSED state.
  // Pause-aware speed bonus: shift _answerStartedAt by the paused duration so
  // a paused fight doesn't penalise the player's answer time.
  notifyPaused() {
    if (this._pausedAt) return;
    this._pausedAt = performance.now();
  }

  notifyResumed() {
    if (!this._pausedAt) return;
    const pausedFor = performance.now() - this._pausedAt;
    if (this._answerStartedAt) this._answerStartedAt += pausedFor;
    this._pausedAt = 0;
  }

  // Called by game.js pointer handler
  selectOrb(value) {
    if (this.state !== 'ANSWERING') return;
    const correct = value === this._currentProblem.answer;
    const timeMs = performance.now() - this._answerStartedAt;
    this._resolve({ correct, value, timeMs });
  }

  // ── Private state machine ──────────────────────────────────────────────────

  _enterProblem() {
    if (this._monsterHpRemaining <= 0) { this._victory(); return; }

    this._currentProblem = this._problemGen.selectProblem({
      realm: this._realm,
      masteryMap: this._masteryMap,
      recentKeys: this._recentKeys,
      rng: this._rng,
      mulRatio: this._realm.mulRatio,
      allowStretch: this._allowStretch,
      realmTier: this._realm.tier,
    });

    if (!this._currentProblem) {
      this._victory();
      return;
    }

    // Ultimate gate: if meter is full, launch the typed-numpad overlay.
    if (this._ultimateCharge >= 1.0 && this._ultimate) {
      this.state = 'ULTIMATE_ANSWERING';
      // Ultimate.start() calls cancel() which nulls onResolve — assign AFTER start.
      this._ultimate.start(this._currentProblem);
      this._ultimate.onResolve = (result) => this._resolveUltimate(result);
      return;
    }

    this._currentOrbs = this._distractors.generateDistractors(this._currentProblem, this._rng);
    this._answerStartedAt = performance.now();
    this.state = 'ANSWERING';
    this._hud.setProblem(this._currentProblem.displayText);
  }

  _resolve({ correct, value, timeMs }) {
    this.state = 'RESOLVE';
    this._problemsAnsweredThisFight++;

    // Stretch facts use namespaced keys (stretch:*) and are not stored in mastery
    if (!this._currentProblem.isStretch) {
      this._mastery.recordResolve(this._masteryMap, this._currentProblem.factKey, {
        correct,
        timeMs,
        now: Date.now(),
        masteredAvgMs: this._mastery.masteredAvgMs(this._masteryMap),
      });
    }

    this._recentKeys.push(this._currentProblem.factKey);
    if (this._recentKeys.length > 5) this._recentKeys.shift();

    if (correct) {
      this._correctThisFight++;
      const speedBonus = Math.max(0, (5000 - timeMs) / 50);
      const streakMult = 1 + (this._streak * 0.05);
      const halfDamage = this._halfDamageOnNext;
      this._halfDamageOnNext = false;
      const dmg = Math.round((100 + speedBonus) * streakMult * (halfDamage ? 0.5 : 1));
      this._score += dmg;
      this._streak++;
      this._monsterHpRemaining -= 1;
      this._ultimateCharge = Math.min(1, this._ultimateCharge + 0.34);
      this._hud.setStreak(this._streak);
      this._hud.setScore(this._score);
      this._hud.setUltimateCharge(this._ultimateCharge);
      this._anim.begin(this._monster.id, { kind: 'hit', startedAt: performance.now(), duration: 350 });
      this._playAudio(timeMs < 2000 ? 'critHit' : 'hit');
      this._burst(this._monsterX, this._monsterY - 50, timeMs < 2000 ? 'CRIT!' : 'ZAP!');
      this._resolveTimer = setTimeout(() => {
        if (this._monsterHpRemaining <= 0) this._victory();
        else this._enterProblem();
      }, 600);
    } else {
      this._streak = 0;
      this._hud.setStreak(0);
      this._wizardFlavorHp = Math.max(0, this._wizardFlavorHp - 10);
      this._hud.setWizardHp(this._wizardFlavorHp);
      this._anim.begin('wizard', { kind: 'hit', startedAt: performance.now(), duration: 250 });
      this._playAudio('wrong');
      this._narrate('The answer was ' + this._currentProblem.answer + '.');
      this._hud.flashCorrect(this._currentProblem.answer);
      this._wrongRevealTimer = setTimeout(() => {
        if (this._wizardFlavorHp <= 0) this._defeatRetry();
        else this._enterProblem();
      }, 1200);
    }
  }

  _resolveUltimate({ correct, value, timeMs, escaped }) {
    if (this._lessonComplete) return;     // re-entry guard (CLAUDE.md)
    this.state = 'RESOLVE';
    this._problemsAnsweredThisFight++;

    if (!this._currentProblem.isStretch) {
      this._mastery.recordResolve(this._masteryMap, this._currentProblem.factKey, {
        correct,
        timeMs,
        now: Date.now(),
        masteredAvgMs: this._mastery.masteredAvgMs(this._masteryMap),
      });
    }

    this._recentKeys.push(this._currentProblem.factKey);
    if (this._recentKeys.length > 5) this._recentKeys.shift();

    this._ultimateCharge = 0;
    this._hud.setUltimateCharge(0);

    if (correct) {
      this._correctThisFight++;
      this._streak++;
      this._monsterHpRemaining = Math.max(0, this._monsterHpRemaining - 3);
      this._score += 500;
      this._hud.setStreak(this._streak);
      this._hud.setScore(this._score);
      this._anim.begin(this._monster.id, { kind: 'hit', startedAt: performance.now(), duration: 600 });
      this._playAudio('ko');
      this._burst(this._monsterX, this._monsterY - 60, 'ULTIMATE!');
      this._resolveTimer = setTimeout(() => {
        if (this._monsterHpRemaining <= 0) this._victory();
        else this._enterProblem();
      }, 800);
    } else {
      this._streak = 0;
      this._hud.setStreak(0);
      this._halfDamageOnNext = true;
      if (!escaped) {
        this._narrate('The answer was ' + this._currentProblem.answer + '.');
        this._hud.flashCorrect(this._currentProblem.answer);
      }
      this._resolveTimer = setTimeout(() => this._enterProblem(), 1200);
    }
  }

  _victory() {
    if (this._lessonComplete) return;
    this._lessonComplete = true;
    this._monsterKO = true;

    // Commit mastery to save — once per fight, not per problem
    const data = SaveManager.load();
    data.mastery = this._masteryMap;
    data.totalProblemsAnswered = (data.totalProblemsAnswered || 0) + this._problemsAnsweredThisFight;
    data.totalCorrect = (data.totalCorrect || 0) + this._correctThisFight;
    SaveManager.save(data);

    const cb = this.onComplete;   // save before cancel() nulls it
    const score = this._score;
    const streak = this._streak;
    const retries = this._retries;
    const monsterId = this._monster ? this._monster.id : null;
    this.cancel();

    if (this._monster) {
      this._anim.begin(this._monster.id, { kind: 'death', startedAt: performance.now(), duration: 700 });
    }
    this._playAudio('ko');
    this._burst(this._monsterX, this._monsterY - 60, 'KO!');

    setTimeout(function() {
      if (cb) cb({ outcome: 'victory', score: score, streak: streak, retries: retries, monsterId: monsterId });
    }, 800);
  }

  _defeatRetry() {
    this._retries++;
    this._wizardFlavorHp = 60;
    this._streak = 0;
    this._hud.setWizardHp(60);
    this._hud.setStreak(0);
    this._narrate(this._monster.name + ' laughs! Try again!');
    this._resolveTimer = setTimeout(() => this._enterProblem(), 1500);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _burst(x, y, text) {
    this._burstTexts.push({ text: text, x: x, y: y, expiresAt: performance.now() + 800 });
    if (this._particles) {
      for (let p = 0; p < 10; p++) {
        const angle = this._rng() * Math.PI * 2;
        const speed = 60 + this._rng() * 80;
        this._particles.spawn('sparkle', x, y,
          Math.cos(angle) * speed, Math.sin(angle) * speed - 40,
          400 + this._rng() * 300, '#f0d840');
      }
    }
  }

  _narrate(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const monster = this._monster;
    setTimeout(function() {
      const utt = new SpeechSynthesisUtterance(text);
      if (monster && monster.voiceProfile) {
        utt.pitch = monster.voiceProfile.pitch;
        utt.rate = monster.voiceProfile.rate;
      }
      speechSynthesis.speak(utt);
    }, 50);
  }

  _pickTaunt(monster) {
    if (!monster.voiceTaunts || !monster.voiceTaunts.length) return monster.name + ' appears!';
    return monster.voiceTaunts[Math.floor(this._rng() * monster.voiceTaunts.length)];
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
      ctx.fillStyle = '#6c8a3a';
    }
    ctx.fillRect(0, 0, w, h);
  }

  _drawMonsterHpBar(ctx, mx, my, monster) {
    const barW = 180;
    const barH = 14;
    const barX = mx - barW / 2;
    const barY = my - 150;
    const frac = Math.max(0, this._monsterHpRemaining / monster.hp);

    ctx.fillStyle = '#2C2416';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#8b2020';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#4a9a2a';
    ctx.fillRect(barX, barY, barW * frac, barH);

    // Monster name with stroke for readability over any realm bg
    ctx.font = 'bold 16px "OpenDyslexic", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1a1a1a';
    ctx.strokeText(monster.name, mx, barY - 4);
    ctx.fillStyle = '#F5F0E8';
    ctx.fillText(monster.name, mx, barY - 4);
    ctx.textBaseline = 'alphabetic';
  }
}
