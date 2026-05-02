# Session 8 — Audio: Web Speech + Web Audio SFX
**Model:** Sonnet | **Focus:** Speech narration with iPad Safari quirks; full SFX bank synthesized; settings panel hooks

## Pre-flight

1. Read spec section 5 (Audio System).
2. Read CLAUDE.md sections on Web Speech (iOS Safari), Web Audio (iOS Safari), `aria-live`/`aria-label` conflicts.
3. Read `keyboard-command-4/js/audio.js` for the synthesized SFX precedent.
4. Read `lizzies-petstore/js/audio.js` for the warm Web Audio + lazy-init precedent.
5. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/audio/sfx.js` — synthesized sound bank
- `claudes-math-marauder/js/audio/speech.js` — Web Speech wrapper with iPad Safari workarounds
- `claudes-math-marauder/js/ui/settings.js` — Settings panel (speech voice picker, rate slider, sfx volume, mute, reduced motion, font scale)

## Files to modify

- `claudes-math-marauder/js/game.js` — wire up audio context lazy-init on first user gesture; settings overlay open/close
- `claudes-math-marauder/js/save.js` — ensure all settings keys are in `_defaults()` (they should be from Session 1; verify)

## Deliverables

### 1. `audio/speech.js` — SpeechManager

Singleton wrapper. Lazy `getVoices()` (iPad delays the list).

```js
class SpeechManager {
  constructor() {
    this._voices = [];
    this._voiceURI = null;
    this._rate = 1.0;
    this._autoNarrate = true;
    this._enabled = ('speechSynthesis' in window);
    this._loadingVoicesPromise = null;
    if (this._enabled) {
      // iOS: voices may be empty initially; subscribe to voiceschanged
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      this._loadVoices();
    }
  }

  _loadVoices() {
    if (!this._enabled) return;
    this._voices = window.speechSynthesis.getVoices();
  }

  setSettings({ voiceURI, rate, autoNarrate }) {
    if (voiceURI !== undefined) this._voiceURI = voiceURI;
    if (rate !== undefined) this._rate = rate;
    if (autoNarrate !== undefined) this._autoNarrate = autoNarrate;
  }

  speak(text, opts = {}) {
    if (!this._enabled) return;
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? this._rate;
    u.pitch = opts.pitch ?? 1.0;
    if (this._voiceURI) {
      const v = this._voices.find(x => x.voiceURI === this._voiceURI);
      if (v) u.voice = v;
    } else {
      // Auto-pick best iPad voice
      const preferred = ['Daniel', 'Karen', 'Samantha', 'Moira'];
      const v = this._voices.find(x => preferred.some(p => x.name.includes(p)));
      if (v) u.voice = v;
    }
    // iOS quirk: cancel + 50ms delay
    window.speechSynthesis.cancel();
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); }
      catch (e) { /* swallow — speech is best-effort */ }
    }, 50);
  }

  cancel() {
    if (!this._enabled) return;
    try { window.speechSynthesis.cancel(); } catch {}
  }

  pause() { if (this._enabled) try { window.speechSynthesis.pause(); } catch {} }
  resume() { if (this._enabled) try { window.speechSynthesis.resume(); } catch {} }

  speakIfAuto(text, opts) { if (this._autoNarrate) this.speak(text, opts); }

  isSupported() { return this._enabled; }
  getVoices() { return this._voices.slice(); }
}
```

**Note on `_autoNarrate`:** If true, dynamic on-screen text triggers speech automatically. If false, only manual 🔊 button taps trigger speech. The 🔊 button is always available regardless of setting.

### 2. `audio/sfx.js` — SFX bank

Single AudioContext, lazy-created on first user gesture.

```js
class SfxBank {
  constructor() {
    this._ctx = null;
    this._volume = 0.7;
    this._muted = false;
  }

  _getCtx() {
    if (this._ctx) return this._ctx;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
    return this._ctx;
  }

  // Caller passes a user-gesture-bound function. Internally we lazy-create the ctx and call ctx.resume().
  play(name) {
    if (this._muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    ctx.resume().then(() => this._schedule(name, ctx)).catch(() => {});
  }

  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }
  setMuted(m) { this._muted = !!m; if (m) try { this._ctx?.suspend(); } catch {} else try { this._ctx?.resume(); } catch {} }

  _schedule(name, ctx) {
    const g = ctx.createGain(); g.gain.value = this._volume; g.connect(ctx.destination);
    const fn = SFX_RECIPES[name];
    if (!fn) return;
    fn(ctx, g);
  }
}

const SFX_RECIPES = {
  orbHover(ctx, out) { /* sine 600Hz, 80ms, low-pass 1500Hz */ },
  orbCorrect(ctx, out) { /* square sweep 220 → 880Hz, 120ms */ },
  spellCast(ctx, out) { /* triangle + filtered noise burst, 200ms */ },
  hit(ctx, out) { /* low square 110Hz + noise thump, 150ms */ },
  critHit(ctx, out) { /* hit recipe + sine 1760Hz arpeggio sparkle */ },
  wrong(ctx, out) { /* low triangle 80Hz, 200ms — soft, never harsh */ },
  streakChime3(ctx, out) { /* sine bell arpeggio */ },
  streakChime5(ctx, out) { /* sine bell arpeggio higher */ },
  streakChime10(ctx, out) { /* sine bell arpeggio highest + reverb tail */ },
  ultimateChargeFull(ctx, out) { /* rising sine 220→880Hz, 600ms */ },
  ultimateFire(ctx, out) { /* layered sweep + screen-flash sync — duration ~700ms */ },
  bossSpawn(ctx, out) { /* low rumble (filtered noise) + dramatic chord */ },
  ko(ctx, out) { /* triumphant 4-note motif — sine major arpeggio */ },
  bossKo(ctx, out) { /* ko motif extended + low boom */ },
  pageFlip(ctx, out) { /* paper rustle (filtered noise burst) */ },
  uiTap(ctx, out) { /* soft 40ms click */ },
  phaseBreak(ctx, out) { /* sharp filtered-noise crack + sparkle */ },
  monsterSpawn(ctx, out) { /* short low burst + cute whine */ },
  goblinGrunt(ctx, out) { /* short cute whine */ },
};
```

Each recipe creates `OscillatorNode` / `BiquadFilterNode` / `AudioBuffer`-based noise, schedules envelopes via `AudioParam.setValueAtTime` and `linearRampToValueAtTime`, calls `osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);`. **All inside the `.then()` of `ctx.resume()`** (already handled by the dispatcher). Never schedule outside `_schedule()`.

**Implementation rule:** No deep / sudden / harsh sounds. All sound levels capped at `globalVolume × 0.7` so even max-volume the wrong-answer thump is "soft".

### 3. `ui/settings.js` — Settings panel

Settings overlay opened from a gear button on TITLE and HUB. Modal dialog with focus trap.

UI elements:
- Speech voice dropdown (`<select>`) populated from `speech.getVoices()`. Disabled if voices empty / speech unsupported with a helpful message.
- Speech rate slider: 0.7–1.3 step 0.1, label updates with current value, `aria-valuetext="1.0 times speed"` updated dynamically
- Auto-narrate toggle: native `<input type="checkbox">` (no `aria-pressed` — `checked` is the ARIA carrier per CLAUDE.md)
- SFX volume slider 0–1 step 0.1
- Master mute toggle (checkbox)
- Reduced motion toggle (checkbox; default reflects `prefers-reduced-motion` media query)
- Font scale dropdown: 0.9 / 1.0 / 1.1 / 1.25 / 1.5 — applied via `document.documentElement.style.fontSize`, NOT by re-declaring CSS vars (CLAUDE.md rule)
- Show speed timer (checkbox; off by default)
- Allow stretch facts (checkbox; on by default)
- Reset progress button — opens a nested confirmation dialog
- Test-speech button — speaks "Hello, math marauder" using current settings

All changes save to `data.settings` via SaveManager on each `change` event (not on close — user might forget to close).

**Modal accessibility (CLAUDE.md):**
- `<div role="dialog" aria-modal="true" aria-label="Settings">`
- First focusable element = close (✕) button
- Tab/Shift-Tab focus trap
- Escape closes (with `classList.contains('open')` guard)
- On open: focus close button, set `aria-hidden="false"`, set `aria-expanded="true"` on trigger
- On close: focus returns to trigger button (the gear icon)

### 4. 🔊 button helper

A small utility: `attachReadAloud(el, getText)` scans for or attaches a 🔊 button to any text-bearing element. Used by HUD problem panel, story panels, mystery event prompts, settings labels.

```js
export function attachReadAloud(parent, getText, opts = {}) {
  const btn = document.createElement('button');
  btn.className = 'read-aloud';
  btn.setAttribute('aria-label', 'Read aloud');
  btn.innerHTML = '🔊';
  btn.addEventListener('click', () => { window.speech.speak(getText()); btn.setAttribute('aria-label', 'Replay'); });
  parent.appendChild(btn);
  if (!window.speech?.isSupported?.()) btn.disabled = true;     // CLAUDE.md: native disabled for proper AT
  return btn;
}
```

### 5. `prefers-reduced-motion` integration

In `game.js`'s init:
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const settingReduced = save.settings.reducedMotion;
const reducedMotion = prefersReduced || settingReduced;
document.body.dataset.reducedMotion = reducedMotion ? '1' : '0';
```
The `[data-reduced-motion="1"]` selector in CSS strips screen-shake, panel-flashes, and any high-frequency animations. The fx library reads `document.body.dataset.reducedMotion` once per state-entry (cache it; don't query the DOM per frame).

## Tests to run

Manual:

- [ ] Speech: open title screen, tap 🔊 next to subtitle. Audio plays "A game by Claude".
- [ ] Speech: voice dropdown populates with available voices on iPad
- [ ] Speech: rate slider changes playback speed when re-tested
- [ ] Speech: cancelling and re-speaking works without dropping the second utterance (the 50ms delay)
- [ ] Speech: Pause halts, Resume continues
- [ ] Speech: works gracefully when `'speechSynthesis' in window === false` (Safari without the API in some configurations)
- [ ] SFX: orb tap plays the correct chime; volume slider changes loudness; mute disables all SFX
- [ ] SFX: AudioContext is created only on first user gesture (verify in devtools — no warning about user gesture)
- [ ] SFX: all wrong-answer sounds are soft, not harsh
- [ ] Settings: focus trap traps Tab; Escape closes; focus returns to gear button
- [ ] Settings: every change persists in localStorage immediately
- [ ] Settings: reset progress shows confirmation; on confirm, save is reset to defaults
- [ ] Reduced motion: enabling it strips screen-shake on next combat hit

Re-run Layer-1 tests:
```bash
node claudes-math-marauder/scripts/test-fact-keys.js
node claudes-math-marauder/scripts/test-mastery.js
node claudes-math-marauder/scripts/test-problem-gen.js
node claudes-math-marauder/scripts/test-distractors.js
node claudes-math-marauder/scripts/test-save-migration.js
```

## Acceptance checklist

- [ ] AudioContext is lazy-created in `_getCtx()`, never in a constructor
- [ ] All oscillators scheduled inside `ctx.resume().then(() => ...)` (no oscillator scheduling outside the resolved promise)
- [ ] `speechSynthesis.cancel()` always followed by 50ms `setTimeout` before `.speak()` (iOS quirk)
- [ ] Voice list refreshed on `voiceschanged` event
- [ ] Settings panel has focus trap + Escape + focus-return; Escape guard checks `classList.contains('open')`
- [ ] No `aria-pressed` on `<input type="checkbox">` elements
- [ ] No `aria-label` on `aria-live` regions in the settings panel
- [ ] All settings persist to `data.settings` via SaveManager — not direct `localStorage`
- [ ] Reset-progress dialog uses native `<button>` with `aria-label`; double-click resistant via debounce
- [ ] Font scale applied via `document.documentElement.style.fontSize` only

## Session end

1. Re-run all Layer-1 tests
2. Manual playtest of speech, SFX, settings panel
3. Run `marauder-web-review` agent
4. Commit `Session 8: audio — speech, synthesized SFX, settings panel`
5. Push to `main`
