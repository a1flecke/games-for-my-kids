# Session 6 — Combat: Typed Ultimate Spell
**Model:** Sonnet | **Focus:** The "type the answer" mode that fires when the ultimate meter is full

By the end, every ~3 streaks fills the ultimate meter; the next problem becomes a typed ultimate (numpad + physical keyboard), correct = massive damage, wrong = meter drains and reverts to orb cast at half damage.

## Pre-flight

1. Read spec section 3.2.2 (Ultimate cast).
2. Re-read CLAUDE.md rules on focus management (numpad will be a focus-trapped overlay), aria-pressed, and dynamic aria-label.
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/combat/ultimate.js` — Ultimate state machine + numpad UI

## Files to modify

- `claudes-math-marauder/js/combat/fight.js` — call into ultimate.js when `_ultimateCharge >= 1` at problem-entry time
- `claudes-math-marauder/css/style.css` — numpad layout + glowing-sigil animation

## Deliverables

### 1. `combat/ultimate.js`

A FightManager-owned helper. Renders an overlay panel with:
- Bigger problem panel — 128px numerals, dramatic styling
- Glowing input sigil — shows the typed digits at 96px **before** commit (catches dyslexia digit-flips)
- 3×4 numpad: `7 8 9` / `4 5 6` / `1 2 3` / `⌫ 0 ✓`
- Each numpad key ≥ 72px, `<button>` element, `aria-label="seven"` etc. (readable to AT)

```js
class Ultimate {
  constructor({ audio, hud, anim, fxCache, fight }) {
    this._timers = { _resolveTimer: null, _entryTimer: null };
    this._buf = '';                    // typed digits
    this._currentProblem = null;
    this._answerStartedAt = 0;
    this._maxDigits = 6;               // never need more than 6 (max product 144 + room)
    this.onResolve = null;             // called with { correct, value, timeMs }
    this._overlay = null;              // DOM root
    this._physicalKeyHandler = null;
  }

  start(problem) {
    this.cancel();
    this._currentProblem = problem;
    this._buf = '';
    this._answerStartedAt = performance.now();
    this._build();
    this._overlay.classList.add('open');
    this._overlay.setAttribute('aria-hidden', 'false');
    this._focusFirstButton();
    this._bindPhysicalKeys();
    this._narrate('Speak the truth!');
  }

  cancel() {
    Object.keys(this._timers).forEach(k => { if (this._timers[k]) { clearTimeout(this._timers[k]); this._timers[k] = null; } });
    this._unbindPhysicalKeys();
    if (this._overlay) {
      this._overlay.classList.remove('open');
      this._overlay.setAttribute('aria-hidden', 'true');
      // keep DOM in place — show/hide via class only
    }
    this.onResolve = null;
  }

  _build() {
    if (this._overlay) return;
    this._overlay = document.createElement('div');
    this._overlay.id = 'ultimate-overlay';
    this._overlay.className = 'overlay';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-modal', 'true');
    this._overlay.setAttribute('aria-label', 'Ultimate spell');
    this._overlay.setAttribute('aria-hidden', 'true');
    // Build inner DOM: problem panel + sigil + numpad grid
    // Use innerHTML with escHtml() on any interpolated values per CLAUDE.md
    document.getElementById('overlay-root').appendChild(this._overlay);
    // bind numpad clicks via addEventListener (never .onclick, never inline onclick="" attrs)
  }

  _onDigit(d) {
    if (this._buf.length >= this._maxDigits) return;
    this._buf += d;
    this._renderSigil();
  }

  _onBackspace() { this._buf = this._buf.slice(0, -1); this._renderSigil(); }

  _onCommit() {
    if (this._buf.length === 0) return;
    const value = parseInt(this._buf, 10);
    const timeMs = performance.now() - this._answerStartedAt;
    const correct = value === this._currentProblem.answer;
    this._audio.play(correct ? 'ultimateFire' : 'wrong');
    if (correct) this._fx.burst('wizard', 'KO!');
    const cb = this.onResolve;
    this.cancel();
    this._timers._resolveTimer = setTimeout(() => { if (cb) cb({ correct, value, timeMs }); }, 400);
  }

  _renderSigil() {
    const sigil = this._overlay.querySelector('#ultimate-sigil');
    if (!sigil) return;
    sigil.textContent = this._buf || ' ';
    sigil.setAttribute('aria-label', this._buf ? `Entered ${this._buf}` : 'No digits entered');
  }

  _focusFirstButton() { /* focus the ✓ commit button last (last focusable in tab order); first focusable should be ⌫ — match repo convention "first focusable element must be a close button" by treating ⌫ as the close-equivalent */ }

  _bindPhysicalKeys() {
    this._physicalKeyHandler = (e) => {
      if (this._buf === null) return;            // safety guard
      if (e.key >= '0' && e.key <= '9') { this._onDigit(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace')   { this._onBackspace(); e.preventDefault(); }
      else if (e.key === 'Enter')       { this._onCommit();    e.preventDefault(); }
      else if (e.key === 'Escape')      {
        // Close-via-Escape handler MUST guard against firing after overlay is already closed:
        if (this._overlay && this._overlay.classList.contains('open')) {
          // Treat Escape as cancel-and-revert: drain meter, revert to orb cast at half damage
          const cb = this.onResolve;
          this.cancel();
          if (cb) cb({ correct: false, value: null, timeMs: performance.now() - this._answerStartedAt, escaped: true });
        }
      }
    };
    window.addEventListener('keydown', this._physicalKeyHandler);
  }

  _unbindPhysicalKeys() {
    if (this._physicalKeyHandler) window.removeEventListener('keydown', this._physicalKeyHandler);
    this._physicalKeyHandler = null;
  }
}
```

**ARIA contract (CLAUDE.md rules):**
- `role="dialog" aria-modal="true" aria-label="Ultimate spell"` (never `<aside>`)
- `aria-hidden` always explicit `"true"`/`"false"` — never `removeAttribute`
- Focus trap (Tab/Shift-Tab cycle within the 12 numpad buttons + ⌫ + ✓), Escape closes (with `classList.contains('open')` guard)
- On open: focus ⌫ (the "back-out" button — closest analog to "close")
- On close: return focus to the canvas (so subsequent orb taps in the next round work via keyboard if user is in keyboard-only mode)
- Each numpad button is a native `<button>` with proper `aria-label` (digit names spelled out for AT clarity)
- `aria-pressed` is NOT used — these are action buttons, not toggles

### 2. FightManager integration

In `combat/fight.js`'s `_enterProblem()`:
```js
_enterProblem() {
  if (this._monsterHpRemaining <= 0) { this._victory(); return; }
  this._currentProblem = this._problemGen.selectProblem({ /* ... */ });
  // ULTIMATE GATE
  if (this._ultimateCharge >= 1.0) {
    this._ultimate.onResolve = ({ correct, value, timeMs, escaped }) => this._resolveUltimate({ correct, value, timeMs, escaped });
    this._ultimate.start(this._currentProblem);
    this.state = 'ULTIMATE_ANSWERING';
    return;
  }
  // standard orb path:
  this._currentOrbs = this._distractors.generateDistractors(this._currentProblem, this._rng);
  this._answerStartedAt = performance.now();
  this.state = 'ANSWERING';
  this._hud.setProblem(this._currentProblem.displayText);
}

_resolveUltimate({ correct, value, timeMs, escaped }) {
  this._mastery.recordResolve(/* ... */);
  if (correct) {
    // Massive damage — usually one-shot kills
    this._monsterHpRemaining = Math.max(0, this._monsterHpRemaining - 3);
    this._ultimateCharge = 0;
    this._streak++;
    this._score += 500;
    this._hud.setUltimateCharge(0);
    this._anim.begin(this._monster.id, { kind: 'hit', startedAt: performance.now(), duration: 600 });
    this._fx.panelFlash('#fff', 0.6);
    this._timers._resolveTimer = setTimeout(() => {
      if (this._monsterHpRemaining <= 0) this._victory();
      else { this.state = 'PROBLEM'; this._enterProblem(); }
    }, 800);
  } else {
    // Drain meter, revert to orb cast at half damage
    this._ultimateCharge = 0;
    this._streak = 0;
    this._hud.setUltimateCharge(0);
    this._hud.setStreak(0);
    if (!escaped) this._narrate(`The answer was ${this._currentProblem.answer}.`);
    // Half-damage path: re-enter problem and apply a damage modifier to the next correct answer
    this._halfDamageOnNext = true;
    this._timers._resolveTimer = setTimeout(() => { this.state = 'PROBLEM'; this._enterProblem(); }, 1200);
  }
}
```

### 3. CSS for numpad + sigil

```css
#ultimate-overlay { /* full-screen, panel-bordered, centered content */ }
#ultimate-overlay .panel { background: var(--bg); border: 6px solid var(--accent-ink); border-radius: 16px; padding: 32px; max-width: 90vw; max-height: 90vh; }
#ultimate-sigil { font-size: 96px; line-height: 1; min-height: 120px; padding: 16px 32px; text-align: center; border: 4px dashed var(--accent-comic-yellow); border-radius: 12px; background: rgba(240,216,64,0.1); transition: text-shadow 200ms; text-shadow: 0 0 12px rgba(240,216,64,0.6); }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
.numpad button { min-width: 72px; min-height: 72px; font-size: 32px; }
```

## Tests to run

Manual playtest via `?fight=goblin_grunt&ultimate=1` (debug param: starts a fight with ultimate already charged):

- [ ] Ultimate overlay opens; problem text large; sigil empty initially
- [ ] Tapping numpad digits accumulates into sigil; sigil shows live digits
- [ ] ⌫ removes last digit
- [ ] ✓ commits — correct = massive damage + KO sound, wrong = meter drains
- [ ] Physical keyboard: digits 0–9 work; Backspace works; Enter commits; Escape closes (with revert)
- [ ] Focus trap: Tab cycles only inside the numpad; Shift-Tab cycles backwards; Escape closes
- [ ] On overlay close, focus returns somewhere usable (canvas / next interactive element)
- [ ] aria-hidden flips correctly; never `removeAttribute`
- [ ] No `aria-label` on `aria-live` regions (sigil uses `textContent` + dynamic `aria-label` only — both update together)
- [ ] No `style.display` in JS

## Acceptance checklist

- [ ] Ultimate triggers when `_ultimateCharge >= 1.0` and resets to 0 on resolve
- [ ] Numpad keys ≥ 72px (CLAUDE.md ≥44px floor with bonus)
- [ ] Digit-echo sigil is at 96px in OpenDyslexic before commit
- [ ] Physical keyboard support verified
- [ ] Focus-trap Escape handler guards `classList.contains('open')`
- [ ] Re-entry guard on `start()` (calls `cancel()` first)
- [ ] No memory leak: opening + closing the ultimate 100× doesn't grow listener count (verify via `getEventListeners(window)` in devtools)
- [ ] All existing Layer-1 tests still pass

## Session end

1. Re-run all Layer-1 tests
2. Manual playtest of ultimate flow
3. Run `marauder-web-review` agent
4. Commit `Session 6: combat — typed ultimate spell + numpad + physical-key support`
5. Push to `main`
