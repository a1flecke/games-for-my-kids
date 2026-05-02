# Session 5 — Combat: Orb-Cast Loop
**Model:** Opus | **Focus:** The default fight — problem panel, 4 floating orbs, correct/wrong resolve, mastery save, retry-on-defeat

The biggest gameplay session. By the end, a single fight is fully playable from `?fight=goblin_grunt` debug param: monster appears → problem renders → orbs floats up → tap correct → monster takes damage → next problem → KO → reward card.

## Pre-flight

1. Read spec sections 3 (Combat Architecture), 4 (Visual Renderer), 7 (A11y).
2. Read `keyboard-command-4/js/game.js` and `js/input.js` for the precedent on tap-to-cast loops.
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/combat/fight.js` — FightManager (state machine, problem panel, orbs, resolve, juice triggers)
- `claudes-math-marauder/js/combat/orbs.js` — orb visual renderer (procedural canvas) + hit-test
- `claudes-math-marauder/js/ui/hud.js` — combat HUD (HP bar, streak, score, ultimate meter — DOM-overlay)

## Files to modify

- `claudes-math-marauder/js/game.js` — wire up `FightManager`, accept `?fight=<monsterId>` debug param to launch a fight directly

## Deliverables

### 1. `combat/fight.js` — FightManager

This is the central combat orchestrator. It is allowed to import canvas + DOM modules (unlike the pure `combat/factKeys.js` etc.). Combat state machine driven by `game.js` per-frame `update(dt)` and `draw(ctx, w, h)`.

```js
class FightManager {
  constructor({ rng, masteryMap, realm, problemGen, distractors, mastery, onComplete, onWizardHit, audio, fxCache, monsterRenderer, wizardRenderer, hud, anim, particles }) {
    // Inject every dep so combat is testable and easily replayable
    this.state = 'IDLE';        // IDLE → INTRO → PROBLEM → ANSWERING → RESOLVE → (PROBLEM | VICTORY | DEFEAT_RETRY)
    this._monster = null;
    this._monsterCompiled = null;     // built by monsterRenderer
    this._wizardCompiled = null;
    this._currentProblem = null;
    this._currentOrbs = [];
    this._answerStartedAt = 0;
    this._streak = 0;
    this._retries = 0;
    this._score = 0;
    this._ultimateCharge = 0;          // 0..1
    this._monsterHpRemaining = 0;
    this._wizardFlavorHp = 60;
    this._recentKeys = [];
    this._timers = { _introTimer: null, _resolveTimer: null, _wrongRevealTimer: null };
    this.onComplete = onComplete;       // called with { stars, score, retries, monsterId, masteryDelta }
    this._lessonComplete = false;       // re-entry guard (CLAUDE.md rule)
  }

  start(monster) {
    this.cancel();
    this._lessonComplete = false;
    this._monster = monster;
    this._monsterCompiled = this._renderer.buildCreature(monster);
    this._monsterHpRemaining = monster.hp;
    this._streak = 0;          // streak resets on new fight
    this._score = 0;
    this._retries = 0;
    this._ultimateCharge = 0;
    this._recentKeys = [];
    this.state = 'INTRO';
    this._timers._introTimer = setTimeout(() => this._enterProblem(), 1100);
    this._anim.begin(monster.id, { kind: 'intro_slide', startedAt: performance.now(), duration: 1000 });
    this._audio.play('monsterSpawn');
    this._narrate(this._pickTaunt(monster));
  }

  cancel() {
    Object.keys(this._timers).forEach(k => { if (this._timers[k]) { clearTimeout(this._timers[k]); this._timers[k] = null; } });
    this._anim.cancelAll();
    this.onComplete = null;       // CLAUDE.md: prevent stale callback
  }

  // Called from game.js per frame
  update(dt) { /* advance any easing animations; stretch panel slide-in; orb hover wobble */ }
  draw(ctx, w, h) { /* layered draw — panel BG, parallax, monster, orbs (delegated to orbs.js), wizard, HUD overlays handled by HUD class */ }

  // Called by orbs.js on tap
  selectOrb(value) {
    if (this.state !== 'ANSWERING') return;
    const correct = value === this._currentProblem.answer;
    const timeMs = performance.now() - this._answerStartedAt;
    this._resolve({ correct, value, timeMs });
  }

  // -- private methods below --

  _enterProblem() {
    if (this.state === 'PAUSED' || this.state === 'GAMEPLAY' /* tolerate PAUSED */) { /* no-op safety */ }
    if (this._monsterHpRemaining <= 0) { this._victory(); return; }
    this._currentProblem = this._problemGen.selectProblem({ realm: this._realm, masteryMap: this._masteryMap, recentKeys: this._recentKeys, rng: this._rng, mulRatio: this._realm.mulRatio, allowStretch: this._allowStretch, realmTier: this._realm.tier });
    this._currentOrbs = this._distractors.generateDistractors(this._currentProblem, this._rng);
    this._answerStartedAt = performance.now();
    this.state = 'ANSWERING';
    this._hud.setProblem(this._currentProblem.displayText);
  }

  _resolve({ correct, value, timeMs }) {
    this.state = 'RESOLVE';
    this._mastery.recordResolve(this._masteryMap, this._currentProblem.factKey, { correct, timeMs, now: Date.now(), masteredAvgMs: this._mastery.masteredAvgMs(this._masteryMap) });
    this._recentKeys.push(this._currentProblem.factKey);
    if (this._recentKeys.length > 5) this._recentKeys.shift();

    if (correct) {
      const speedBonus = Math.max(0, (5000 - timeMs) / 50);
      const streakMult = 1 + (this._streak * 0.05);
      const dmg = Math.round((100 + speedBonus) * streakMult);
      this._score += dmg;
      this._streak++;
      this._monsterHpRemaining -= 1;
      this._ultimateCharge = Math.min(1, this._ultimateCharge + 0.34);
      this._hud.setStreak(this._streak);
      this._hud.setScore(this._score);
      this._hud.setUltimateCharge(this._ultimateCharge);
      this._anim.begin(this._monster.id, { kind: 'hit', startedAt: performance.now(), duration: 350 });
      this._audio.play(timeMs < 2000 ? 'critHit' : 'hit');
      this._fx.burst(this._monster.id, timeMs < 2000 ? 'CRIT!' : 'ZAP!');
      this._timers._resolveTimer = setTimeout(() => {
        if (this._monsterHpRemaining <= 0) this._victory();
        else this._enterProblem();
      }, 600);
    } else {
      this._streak = 0;
      this._hud.setStreak(0);
      this._wizardFlavorHp = Math.max(0, this._wizardFlavorHp - 10);
      this._hud.setWizardHp(this._wizardFlavorHp);
      this._anim.begin('wizard', { kind: 'hit', startedAt: performance.now(), duration: 250 });
      this._audio.play('wrong');
      this._narrate(`The answer was ${this._currentProblem.answer}.`);
      this._hud.flashCorrect(this._currentProblem.answer);
      this._timers._wrongRevealTimer = setTimeout(() => {
        if (this._wizardFlavorHp <= 0) this._defeatRetry();
        else this._enterProblem();
      }, 1200);
    }
  }

  _victory() {
    if (this._lessonComplete) return;
    this._lessonComplete = true;
    const cb = this.onComplete;        // CLAUDE.md: save before cancel
    this.cancel();
    this._anim.begin(this._monster.id, { kind: 'death', startedAt: performance.now(), duration: 700 });
    this._audio.play('ko');
    this._fx.burst(this._monster.id, 'KO!');
    setTimeout(() => {
      if (cb) cb({ outcome: 'victory', score: this._score, streak: this._streak, retries: this._retries, monsterId: this._monster.id });
    }, 800);
  }

  _defeatRetry() {
    this._retries++;
    this._wizardFlavorHp = 60;
    this._streak = 0;
    this._hud.setWizardHp(60);
    this._narrate(`${this._monster.name} laughs! Try again!`);
    this._timers._resolveTimer = setTimeout(() => this._enterProblem(), 1500);
  }

  _narrate(text) { /* delegate to audio.speech.speak(text) — async, non-blocking */ }
  _pickTaunt(monster) { /* pick from monster.voiceTaunts */ }
}
```

**Critical patterns** (cross-checked against `/marauder-checklist`):
- All timer IDs declared in constructor as `null`
- `cancel()` clears every timer + nulls onComplete
- `_victory()` saves callback before `cancel()`
- Re-entry guard `_lessonComplete`
- `setTimeout` callbacks tolerate PAUSED state (game.js's `_update` short-circuits already, but the timer fires the next problem regardless of pause — guard at the top: `if (this.state === 'PAUSED') { /* re-arm timer or no-op */ }`)
- All damage computation uses the run-seeded `rng` only via `problemGen` and `distractors` — no `Math.random()` in fight.js

### 2. `combat/orbs.js` — Orb renderer + hit-test

```js
class OrbsRenderer {
  constructor(fxCache) { this._cache = fxCache; this._hover = -1; }
  layout(canvasW, canvasH) { /* compute 4 orb centers in a 2x2 grid centered horizontally, ~120px below the problem panel; 96px diameter */ }
  draw(ctx, orbs) { /* for each orb: panelBorder via inkOutline of a circle; halftoneFill at low density inside; large numeral centered (96px OpenDyslexic) */ }
  hitTest(x, y) { /* return index 0..3 or -1 */ }
  setHover(idx) { this._hover = idx; }
}
```

Hit-test invoked from `game.js`'s pointerdown handler when state === FIGHT and FightManager.state === ANSWERING. ≥96px hitboxes (CLAUDE.md).

### 3. `ui/hud.js` — Combat HUD (DOM overlay)

DOM, not canvas. Children of `#hud-root`:

- `#hud-problem` — large numeral display (96px), `aria-live="polite"` so VoiceOver speaks each new problem
- `#hud-streak` — "Streak: N"
- `#hud-score` — "Score: N"
- `#hud-ultimate` — meter (0–100%), `<progress>` element with `aria-label`
- `#hud-wizard-hp` — flavor HP bar
- `#hud-correction` — for "the answer was 56" reveal; updates `aria-label` synchronously with `textContent`

API:
```js
class HUD {
  setProblem(text) { /* updates textContent + aria-label; triggers narration via speech.speak if autoNarrate */ }
  setStreak(n) { /* updates textContent + aria-label */ }
  setScore(n) { /* same */ }
  setUltimateCharge(pct) { /* progress.value */ }
  setWizardHp(n) { /* width animation */ }
  flashCorrect(value) { /* show #hud-correction with the answer for 1100ms */ }
  hide() { /* class .hidden, aria-hidden=true */ }
  show() { /* remove .hidden, aria-hidden=false */ }
}
```

**ARIA rules to enforce here (CLAUDE.md):**
- `aria-live` regions never combined with `aria-hidden` toggling — instead, when HUD hides, set `display: none` via class on the parent `#hud-root`, leave the live regions alone
- No `aria-label` on the `aria-live` regions themselves
- Update `aria-label` whenever `textContent` changes on labelled elements (but live regions don't need a label)

### 4. `game.js` modifications

- Add a `FightManager` instance lifecycle: created on entering FIGHT state, `cancel()`'d on leaving
- Add `?fight=<monsterId>` debug param: on init, if present, jump straight to FIGHT against that monster (use a stub realm = realm 1 + empty mastery)
- Pointer event handlers (`pointerdown` / `pointerup`) on canvas: convert coords with DPR, dispatch to OrbsRenderer.hitTest in FIGHT state

### 5. Saving mastery on resolve

Combat updates the in-memory `masteryMap` per problem. The fight manager calls `SaveManager` ONCE at fight end (in `_victory` / `_defeatRetry`-triggered path). Pattern:
```js
// In _victory or just after:
const data = SaveManager.load();
data.mastery = this._masteryMap;     // we worked on a reference
data.totalProblemsAnswered += this._problemsAnsweredThisFight;
data.totalCorrect += this._correctThisFight;
SaveManager.save(data);
```
Or, since mastery was a direct reference into `data.mastery`, just call `SaveManager.save(data)` once where `data` is the load-time snapshot. Either way, NO save during per-problem resolve (CLAUDE.md hot-path).

## Tests to run

No new Layer-1 tests this session (combat orchestrator is stateful + DOM-coupled). Manual tests via `?fight=goblin_grunt`:

- [ ] Fight launches; monster slides in; taunt narrated
- [ ] First problem appears; 4 orbs render; one matches the answer
- [ ] Tap correct orb → hit animation, damage number, streak ticks to 1, score updates
- [ ] After 1 correct, monster KOs (hp=1), KO animation, callback fires
- [ ] Tap wrong orb → wizard portrait shake, "the answer was N" narrated and shown for 1100ms, streak resets to 0
- [ ] Tapping orbs during INTRO/RESOLVE phases is ignored (state guard)
- [ ] Pause (e.g., dev key `P`) halts updates; resume picks up at the same problem
- [ ] After fight, `SaveManager.load()` shows updated mastery for the answered fact key
- [ ] No `Math.random()` calls inside combat (grep `combat/` for `Math.random`)
- [ ] No DOM allocs inside `update()` / `draw()` (grep `combat/` and `fx/` for `createElement` / `innerHTML` inside any update/draw method)

Re-run all Session 2 tests — they must still pass:
```bash
node claudes-math-marauder/scripts/test-fact-keys.js
node claudes-math-marauder/scripts/test-mastery.js
node claudes-math-marauder/scripts/test-problem-gen.js
node claudes-math-marauder/scripts/test-distractors.js
```

## Acceptance checklist

- [ ] FightManager has all 5 timer-lifecycle pattern requirements (constructor `null` IDs, `cancel()` clears them, `_victory` saves cb before cancel, `start()` defensive cancel, re-entry guard `_lessonComplete`)
- [ ] No `style.display` assignments in JS (HUD show/hide uses classes)
- [ ] `aria-live="polite"` on `#hud-problem` and `#hud-correction`; no `aria-hidden` toggling on those elements
- [ ] `#hud-ultimate` `<progress>` has `aria-label` (it has no textContent so the label drives announcement)
- [ ] Orb hitboxes ≥ 96px on iPad
- [ ] Pause halts speech (`speechSynthesis.pause()`) and resumes it on unpause
- [ ] Mastery saved exactly once per fight, not per problem
- [ ] Speed bonus computed correctly for `< 5000ms` answers; never negative
- [ ] Wrong-answer narration always speaks the correct answer (assert by inspecting the SpeechManager call list)
- [ ] Streak counter updates persist into `data.totalProblemsAnswered`/`data.totalCorrect` after fight save
- [ ] Wrong on box-1 fact does not crash (decrement floors at 1)
- [ ] Wrong on a stretch fact does not corrupt mastery for the underlying mul fact (stretch keys are namespaced `stretch:*` and not stored in mastery)

## Session end

1. Re-run all Layer-1 tests
2. Manual playtest of `?fight=goblin_grunt` — tick acceptance checklist
3. Run `marauder-web-review` agent
4. Commit `Session 5: combat — orb-cast loop + HUD + retry-on-defeat`
5. Push to `main`
