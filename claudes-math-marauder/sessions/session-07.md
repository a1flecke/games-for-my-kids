# Session 7 — Boss Fight: Glyph Combo
**Model:** Opus | **Focus:** Multi-phase boss state machine, glyph-shatter transitions, narrated phase breaks, KO cinematic. Realm 1's Goblin Warlord boss end-to-end.

## Pre-flight

1. Read spec section 3.2.3 (Boss glyph combo).
2. Read `data/bosses.json` from Session 4 — Goblin Warlord schema.
3. Re-read `keyboard-command-4` boss precedent (KC4 has multi-phase bosses with phase shortcutId arrays — same skeleton).
4. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/combat/bossFight.js` — BossFightManager (extends/reuses FightManager pieces)

## Files to modify

- `claudes-math-marauder/js/game.js` — wire BossFightManager into FIGHT state when the active node is a boss
- `claudes-math-marauder/js/combat/fight.js` — refactor any pieces that need to be shared between FightManager and BossFightManager into shared helpers (extract `_resolve()` if both need it; otherwise keep duplicate but well-tested)

## Deliverables

### 1. `combat/bossFight.js`

```js
class BossFightManager {
  constructor(deps) {
    // same deps as FightManager + boss data
    this.state = 'IDLE';
    this._boss = null;
    this._bossCompiled = null;
    this._currentPhaseIdx = 0;
    this._currentProblem = null;
    this._currentOrbs = [];
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._wizardFlavorHp = 60;
    this._timers = { _introTimer: null, _phaseBreakTimer: null, _resolveTimer: null };
    this.onComplete = null;
    this._lessonComplete = false;
  }

  start(boss, realm, masteryMap) {
    this.cancel();
    this._lessonComplete = false;
    this._boss = boss;
    this._realm = realm;
    this._masteryMap = masteryMap;
    this._bossCompiled = this._renderer.buildCreature(boss);
    this._currentPhaseIdx = 0;
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._wizardFlavorHp = 60;
    this.state = 'INTRO';
    this._timers._introTimer = setTimeout(() => this._enterPhase(0), 2400);
    this._narrate(boss.introSpeech);
    this._audio.play('bossSpawn');
  }

  cancel() { /* clear all timers, null onComplete (CLAUDE.md) */ }

  _enterPhase(idx) {
    if (idx >= this._boss.phases.length) { this._victory(); return; }
    this._currentPhaseIdx = idx;
    const phase = this._boss.phases[idx];
    this.state = 'PHASE_INTRO';
    this._hud.setBossPhaseLabel(`PHASE ${idx + 1}: ${phase.label}`);
    this._narrate(phase.hint);
    this._timers._phaseBreakTimer = setTimeout(() => this._enterProblem(), 1500);
  }

  _enterProblem() {
    const phase = this._boss.phases[this._currentPhaseIdx];
    // Build problem according to phase.kind
    if (phase.kind === 'stretch') {
      // Force a stretch problem from phase.factFamilyHint, falling back to a hard problem if not yet mastered
      const stretch = this._problemGen._selectStretch({ masteryMap: this._masteryMap, rng: this._rng });
      if (stretch) this._currentProblem = stretch;
      else this._currentProblem = this._problemGen.selectProblem({ /* normal hard mul/div from the family */ });
    } else {
      // Filter to mul or div from the family hint
      this._currentProblem = this._problemGen.selectProblem({ realm: { factFamilyWeights: { [phase.factFamilyHint]: 1.0 } }, masteryMap: this._masteryMap, recentKeys: [], rng: this._rng, mulRatio: phase.kind === 'mul' ? 1.0 : 0.0, allowStretch: false, realmTier: this._realm.tier });
    }
    if (phase.mode === 'ultimate') {
      this._ultimate.onResolve = ({ correct, value, timeMs, escaped }) => this._resolve({ correct, value, timeMs, escaped });
      this._ultimate.start(this._currentProblem);
      this.state = 'PHASE_ULTIMATE';
    } else {
      this._currentOrbs = this._distractors.generateDistractors(this._currentProblem, this._rng);
      this._answerStartedAt = performance.now();
      this.state = 'PHASE_ORB';
    }
    this._hud.setProblem(this._currentProblem.displayText);
  }

  selectOrb(value) {
    if (this.state !== 'PHASE_ORB') return;
    const correct = value === this._currentProblem.answer;
    const timeMs = performance.now() - this._answerStartedAt;
    this._resolve({ correct, value, timeMs });
  }

  _resolve({ correct, value, timeMs, escaped }) {
    this._mastery.recordResolve(this._masteryMap, this._currentProblem.factKey, { correct, timeMs, now: Date.now(), masteredAvgMs: this._mastery.masteredAvgMs(this._masteryMap) });
    if (correct) {
      this._streak++;
      this._score += 200;
      this._hud.setStreak(this._streak);
      this._hud.setScore(this._score);
      this._fx.panelFlash('#fff', 0.5);
      this._fx.burst(this._boss.id, 'CRACK!');
      this._anim.begin(this._boss.id, { kind: 'phase_break', startedAt: performance.now(), duration: 1100 });
      this._audio.play('phaseBreak');
      this._timers._phaseBreakTimer = setTimeout(() => this._enterPhase(this._currentPhaseIdx + 1), 1300);
    } else {
      this._streak = 0;
      this._hud.setStreak(0);
      this._wizardFlavorHp = Math.max(0, this._wizardFlavorHp - 15);
      this._hud.setWizardHp(this._wizardFlavorHp);
      this._anim.begin(this._boss.id, { kind: 'attack', startedAt: performance.now(), duration: 600 });
      this._audio.play('wrong');
      if (!escaped) this._narrate(`The answer was ${this._currentProblem.answer}.`);
      this._timers._resolveTimer = setTimeout(() => {
        if (this._wizardFlavorHp <= 0) this._defeatRetry();
        else this._enterProblem();
      }, 1500);
    }
  }

  _victory() {
    if (this._lessonComplete) return;
    this._lessonComplete = true;
    const cb = this.onComplete;
    this.cancel();
    this.state = 'BOSS_KO';
    this._anim.begin(this._boss.id, { kind: 'death', startedAt: performance.now(), duration: 1500 });
    this._fx.panelFlash('#fff', 1.0);
    this._fx.burst(this._boss.id, 'VICTORY!');
    this._audio.play('bossKo');
    setTimeout(() => { if (cb) cb({ outcome: 'boss_victory', score: this._score, streak: this._streak, retries: this._retries, bossId: this._boss.id }); }, 2000);
  }

  _defeatRetry() {
    this._retries++;
    this._wizardFlavorHp = 60;
    this._streak = 0;
    this._narrate(`${this._boss.name} laughs! Try again!`);
    this._timers._resolveTimer = setTimeout(() => this._enterPhase(this._currentPhaseIdx), 2000);
  }

  update(dt) { /* advance animations */ }
  draw(ctx, w, h) { /* layered: background, parallax, boss, orbs (if phase=PHASE_ORB), wizard, comic effects */ }
}
```

### 2. Phase break animation

The "glyph shatter" effect on a successful phase break:
1. Pause inputs (state = `PHASE_BREAK_ANIM`)
2. Render a panel flash (`panelFlash('#fff', 0.7→0`)) over 200ms
3. `inkBurst` at the boss's center — color matches `boss.palette[1]`
4. Several small shape fragments fly outward (use `ParticlePool` with `kind: 'inkdot'`, ~12 particles)
5. Boss shake for 300ms (`anim.begin(bossId, { kind: 'phase_shake' })`)
6. Phase label fades out, next phase label fades in
7. After 1300ms total, `_enterPhase(next)` is called

### 3. Boss intro card

Before the first problem, show a 2.4s intro:
- Boss slides in from offscreen (translate animation)
- Big panel-bordered title card overlaid: `boss.name` (e.g., "KORG THE WARLORD") in 64px with comic burst-style stroke
- Boss intro speech narrated via Web Speech (boss `voiceProfile` applied)
- Tap-to-skip the intro after 1.5s (per spec — skippable but not insta-dismissable)

### 4. Boss KO cinematic

When the last phase is cleared:
- Boss takes a 1.5s death animation: ink-burst + halftone-fade + comic "VICTORY!" burst-text at the screen center
- Screen-flash white at 100% (single frame)
- A "loot drop" appears as a 2D animated card (gold + first-clear story panel unlock if applicable) — handled in Session 12 (results card); for now, just call `onComplete` after 2s

### 5. game.js wiring

```js
// when entering FIGHT state for a boss node:
if (node.kind === 'boss') {
  this._bossFight.onComplete = (result) => this._onFightComplete(result);
  this._bossFight.start(this._bossById(realm.bossId), realm, this._save.mastery);
}
// otherwise standard fight:
else { this._fight.start(monster); }
```

## Tests to run

Manual playtest via `?boss=goblin_warlord`:

- [ ] Boss intro plays (slide-in + title card + narration)
- [ ] Tap-to-skip works only after 1.5s
- [ ] Phase 1 (BONE ARMOR — div from x5) renders correctly with orb cast
- [ ] Correct answer → glyph-shatter effect + phase break animation
- [ ] Phase 2 (BLOODFRENZY — mul from x10) similar
- [ ] Phase 3 (FINAL ROAR — stretch with mode: ultimate) opens the ultimate overlay
- [ ] Correct ultimate → boss KO cinematic with VICTORY! burst text
- [ ] Wrong answer → wizard takes flavor damage; if HP hits 0, second-wind retry plays apology and re-enters current phase
- [ ] Mastery is updated correctly per problem; saved once at fight end
- [ ] Pause halts boss animations and speech
- [ ] All existing Layer-1 tests still pass

Edge cases:
- [ ] Phase 3 stretch: if no `x5` family is mastered yet, stretch falls back to a normal hard problem (no crash)
- [ ] Boss intro speech can be canceled by Pause without leaving speech queued
- [ ] Phase break timer + intro timer both cleaned up on `cancel()`

## Acceptance checklist

- [ ] BossFightManager passes the same timer-lifecycle pattern as FightManager (constructor `null` IDs, `cancel()` clears all, `_victory` saves cb before cancel, re-entry guard `_lessonComplete`)
- [ ] No `Math.random()` calls in `bossFight.js` (uses run-seeded `_rng`)
- [ ] `aria-live` updates on `#hud-boss-phase-label` (new HUD element added) work without `aria-hidden` toggles
- [ ] Boss intro and phase narrations use `speech.cancel()` then 50ms delay (CLAUDE.md iOS rule)
- [ ] Goblin Warlord beatable end-to-end with 0 retries, 1 retry, 2 retries — score reflects correctly

## Session end

1. Re-run all Layer-1 tests
2. Manual playtest end-to-end (multiple runs to test all retry paths)
3. Run `marauder-web-review` agent
4. Commit `Session 7: combat — boss glyph combo (Goblin Warlord end-to-end)`
5. Push to `main`
