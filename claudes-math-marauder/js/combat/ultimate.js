'use strict';

// Ultimate — typed-numpad overlay for the ultimate spell.
// DOM-based (not canvas), so it can be a dialog with full focus management.
// Created once per FightManager lifecycle; shown/hidden via .open class.
class Ultimate {
  constructor({ audio, hud, anim }) {
    this._audio = audio || null;
    this._hud = hud;
    this._anim = anim;

    this._timers = { _resolveTimer: null };
    this._buf = '';
    this._currentProblem = null;
    this._answerStartedAt = 0;
    this._maxDigits = 6;
    this.onResolve = null;
    // Re-entry/input lock: true while the 400ms post-commit feedback timer runs.
    this._committing = false;

    this._overlay = null;
    this._sigilEl = null;
    this._probEl = null;
    this._physicalKeyHandler = null;
    this._backBtn = null;
    this._commitBtn = null;
    // Ordered list for focus trap: ⌫ first (CLAUDE.md: first focusable = close analog), ✓ last.
    this._focusables = [];
  }

  start(problem) {
    this.cancel();
    this._currentProblem = problem;
    this._buf = '';
    this._committing = false;
    this._answerStartedAt = performance.now();
    this._build();
    if (this._probEl) this._probEl.textContent = problem.displayText;
    if (this._sigilEl) {
      this._sigilEl.classList.remove('committed-correct', 'committed-wrong');
    }
    this._renderSigil();
    this._overlay.classList.add('open');
    this._overlay.setAttribute('aria-hidden', 'false');
    this._focusBackButton();
    this._bindPhysicalKeys();
    this._narrate('Speak the truth!');
  }

  cancel() {
    if (this._timers._resolveTimer) {
      clearTimeout(this._timers._resolveTimer);
      this._timers._resolveTimer = null;
    }
    this._committing = false;
    this._unbindPhysicalKeys();
    if (this._overlay) {
      const wasOpen = this._overlay.classList.contains('open');
      this._overlay.classList.remove('open');
      this._overlay.setAttribute('aria-hidden', 'true');
      if (this._sigilEl) {
        this._sigilEl.classList.remove('committed-correct', 'committed-wrong');
      }
      // Return focus to body on close so touch-based orb selection works cleanly next round.
      if (wasOpen) document.body.focus();
    }
    this.onResolve = null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _build() {
    if (this._overlay) return; // Build DOM once; reuse on subsequent starts.

    this._overlay = document.createElement('div');
    this._overlay.id = 'ultimate-overlay';
    this._overlay.className = 'overlay';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-modal', 'true');
    this._overlay.setAttribute('aria-label', 'Ultimate spell');
    this._overlay.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'ultimate-panel';

    // Problem text — large display
    this._probEl = document.createElement('div');
    this._probEl.id = 'ultimate-problem';
    panel.appendChild(this._probEl);

    // Sigil — echoes typed digits at 96px before commit.
    // No aria-live (CLAUDE.md: no aria-live + aria-label on same element).
    // Dynamic aria-label is updated in _renderSigil() alongside textContent.
    this._sigilEl = document.createElement('div');
    this._sigilEl.id = 'ultimate-sigil';
    this._sigilEl.setAttribute('aria-label', 'No digits entered');
    panel.appendChild(this._sigilEl);

    // Numpad — 3×4 grid (role="group" per CLAUDE.md; not role="list")
    const numpad = document.createElement('div');
    numpad.className = 'numpad';
    numpad.setAttribute('role', 'group');
    numpad.setAttribute('aria-label', 'Number pad');

    // DOM order: ⌫ first (focus-trap close analog per CLAUDE.md), then digits, ✓ last.
    // CSS grid positions each button independently so visual layout is correct.
    const KEYS = [
      { label: '⌫', ariaLabel: 'backspace', digit: null, row: 4, col: 1, isBack:   true  },
      { label: '7', ariaLabel: 'seven',     digit: '7',  row: 1, col: 1 },
      { label: '8', ariaLabel: 'eight',     digit: '8',  row: 1, col: 2 },
      { label: '9', ariaLabel: 'nine',      digit: '9',  row: 1, col: 3 },
      { label: '4', ariaLabel: 'four',      digit: '4',  row: 2, col: 1 },
      { label: '5', ariaLabel: 'five',      digit: '5',  row: 2, col: 2 },
      { label: '6', ariaLabel: 'six',       digit: '6',  row: 2, col: 3 },
      { label: '1', ariaLabel: 'one',       digit: '1',  row: 3, col: 1 },
      { label: '2', ariaLabel: 'two',       digit: '2',  row: 3, col: 2 },
      { label: '3', ariaLabel: 'three',     digit: '3',  row: 3, col: 3 },
      { label: '0', ariaLabel: 'zero',      digit: '0',  row: 4, col: 2 },
      { label: '✓', ariaLabel: 'commit',    digit: null, row: 4, col: 3, isCommit: true  },
    ];

    this._focusables = [];

    for (let ki = 0; ki < KEYS.length; ki++) {
      const key = KEYS[ki];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = key.label;
      btn.setAttribute('aria-label', key.ariaLabel);
      // Grid position set inline — layout property, not visibility toggle (CLAUDE.md allows this).
      btn.style.gridRow = key.row;
      btn.style.gridColumn = key.col;

      if (key.isBack) {
        btn.classList.add('numpad-back');
        this._backBtn = btn;
        btn.addEventListener('click', () => this._onBackspace());
      } else if (key.isCommit) {
        btn.classList.add('numpad-commit');
        this._commitBtn = btn;
        btn.addEventListener('click', () => this._onCommit());
      } else {
        const digit = key.digit;
        btn.addEventListener('click', () => this._onDigit(digit));
      }

      numpad.appendChild(btn);
      this._focusables.push(btn);
    }

    panel.appendChild(numpad);
    this._overlay.appendChild(panel);
    document.getElementById('overlay-root').appendChild(this._overlay);
  }

  _onDigit(d) {
    if (this._committing) return;
    if (this._buf.length >= this._maxDigits) return;
    // Strip leading zeros: '0' + any digit replaces with that digit (no '07' display).
    if (this._buf === '0') this._buf = '';
    this._buf += d;
    this._renderSigil();
  }

  _onBackspace() {
    if (this._committing) return;
    this._buf = this._buf.slice(0, -1);
    this._renderSigil();
  }

  _onCommit() {
    if (this._committing) return;
    if (this._buf.length === 0) return;
    this._committing = true;

    const value = parseInt(this._buf, 10);
    const timeMs = performance.now() - this._answerStartedAt;
    const correct = value === this._currentProblem.answer;
    if (this._audio) this._audio.play(correct ? 'ultimateFire' : 'wrong');

    // Visual feedback ON the overlay during the 400ms close delay.
    if (this._sigilEl) {
      this._sigilEl.classList.add(correct ? 'committed-correct' : 'committed-wrong');
    }

    const cb = this.onResolve;   // save BEFORE cancel() nulls it (CLAUDE.md pattern)
    this._timers._resolveTimer = setTimeout(() => {
      this.cancel();
      if (cb) cb({ correct, value, timeMs });
    }, 400);
  }

  _renderSigil() {
    if (!this._sigilEl) return;
    this._sigilEl.textContent = this._buf || ' '; // NBSP to maintain height when empty
    // Dynamic aria-label updated alongside textContent (CLAUDE.md).
    // No aria-live here (CLAUDE.md: no aria-live + aria-label on same element).
    this._sigilEl.setAttribute('aria-label',
      this._buf ? 'Entered ' + this._buf : 'No digits entered');
  }

  _focusBackButton() {
    if (this._backBtn) this._backBtn.focus();
  }

  _narrate(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    setTimeout(function() {
      speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }, 50);
  }

  _bindPhysicalKeys() {
    this._physicalKeyHandler = (e) => {
      // Guard: only handle when overlay is open (stale-handler safety, CLAUDE.md).
      if (!this._overlay || !this._overlay.classList.contains('open')) return;

      if (e.key >= '0' && e.key <= '9') {
        this._onDigit(e.key);
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        this._onBackspace();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        this._onCommit();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        // Escape guard: classList.contains check (CLAUDE.md focus-trap rule).
        // Also bail if a commit is mid-flight (avoid double-resolve).
        if (this._committing) { e.preventDefault(); return; }
        if (this._overlay.classList.contains('open')) {
          const cb = this.onResolve;
          const timeMs = performance.now() - this._answerStartedAt;
          this.cancel();
          if (cb) cb({ correct: false, value: null, timeMs: timeMs, escaped: true });
        }
        e.preventDefault();
      } else if (e.key === 'Tab') {
        // Focus trap: cycle Tab/Shift-Tab within the numpad buttons.
        e.preventDefault();
        const focused = document.activeElement;
        const idx = this._focusables.indexOf(focused);
        if (e.shiftKey) {
          const prev = (idx <= 0) ? this._focusables[this._focusables.length - 1] : this._focusables[idx - 1];
          if (prev) prev.focus();
        } else {
          const next = (idx >= this._focusables.length - 1) ? this._focusables[0] : this._focusables[idx + 1];
          if (next) next.focus();
        }
      }
    };
    window.addEventListener('keydown', this._physicalKeyHandler);
  }

  _unbindPhysicalKeys() {
    if (this._physicalKeyHandler) {
      window.removeEventListener('keydown', this._physicalKeyHandler);
      this._physicalKeyHandler = null;
    }
  }
}
