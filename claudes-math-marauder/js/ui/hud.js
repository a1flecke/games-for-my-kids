'use strict';

// HUD — DOM overlay for combat stats.
// Children are appended to the existing #hud-root element (role="status", z-index:50).
// Live regions (#hud-problem, #hud-correction) use aria-live="polite" directly;
// the parent #hud-root already carries role="status" but adding child live regions
// ensures per-element announcement control.
// Rule: never put aria-hidden on live region elements. To hide the whole HUD, the
// caller adds .hidden to #hud-root (display:none removes it from AT automatically).
class HUD {
  constructor(rootEl) {
    this._root = rootEl;
    this._problemEl = null;
    this._streakEl = null;
    this._scoreEl = null;
    this._ultimateEl = null;
    this._wizardHpFillEl = null;
    this._correctionEl = null;
    this._correctionTimer = null;
    this._bossPhaseEl = null;
    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  // Updates the problem display and announces to screen readers via aria-live.
  // No aria-label: live regions announce textContent directly.
  setProblem(text) {
    this._problemEl.textContent = text;
  }

  setStreak(n) {
    const text = 'Streak: ' + n;
    this._streakEl.textContent = text;
    this._streakEl.setAttribute('aria-label', text);
  }

  setScore(n) {
    const text = 'Score: ' + n;
    this._scoreEl.textContent = text;
    this._scoreEl.setAttribute('aria-label', text);
  }

  setUltimateCharge(pct) {
    this._ultimateEl.value = pct;
    this._ultimateEl.setAttribute('aria-label', 'Ultimate charge: ' + Math.round(pct * 100) + '%');
  }

  setWizardHp(n) {
    const pct = Math.max(0, Math.min(100, (n / 60) * 100));
    // style.width on a flex-fill bar is fine — this is not a visibility toggle
    this._wizardHpFillEl.style.width = pct + '%';
    this._wizardHpFillEl.parentElement.setAttribute('aria-label', 'Wizard HP: ' + Math.round(pct) + '%');
  }

  flashCorrect(value) {
    const text = 'Answer: ' + value;
    this._correctionEl.textContent = text;
    // No aria-label — this is a live region; textContent drives the announcement
    this._correctionEl.classList.remove('hidden');
    clearTimeout(this._correctionTimer);
    this._correctionTimer = setTimeout(() => {
      this._correctionEl.classList.add('hidden');
    }, 1100);
  }

  // Updates the boss phase label. Pass empty string to hide.
  // Live region — textContent drives announcement (no aria-label per CLAUDE.md rule).
  setBossPhaseLabel(text) {
    this._bossPhaseEl.textContent = text;
    if (text) {
      this._bossPhaseEl.classList.remove('hidden');
    } else {
      this._bossPhaseEl.classList.add('hidden');
    }
  }

  // Hides the entire HUD using .hidden class (display:none).
  // Does NOT touch aria-hidden on #hud-root because it carries role="status" (aria-live).
  // display:none removes all children from the AT tree without needing aria-hidden.
  hide() {
    this._root.classList.add('hidden');
  }

  show() {
    this._root.classList.remove('hidden');
  }

  // Updates the boss phase label. Pass empty string to hide.
  // Live region — textContent drives announcement (no aria-label).
  setBossPhaseLabel(text) {
    this._bossPhaseEl.textContent = text;
    if (text) {
      this._bossPhaseEl.classList.remove('hidden');
    } else {
      this._bossPhaseEl.classList.add('hidden');
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _build() {
    this._root.innerHTML = '';

    // Problem display — aria-live so VoiceOver speaks each new problem
    // No aria-label here (rule: no aria-live + aria-label on same element)
    this._problemEl = document.createElement('div');
    this._problemEl.id = 'hud-problem';
    this._problemEl.setAttribute('aria-live', 'polite');
    this._problemEl.setAttribute('aria-atomic', 'true');
    this._root.appendChild(this._problemEl);

    // Streak counter — has aria-label because textContent is already "Streak: N"
    this._streakEl = document.createElement('div');
    this._streakEl.id = 'hud-streak';
    this._root.appendChild(this._streakEl);

    // Score — same pattern as streak
    this._scoreEl = document.createElement('div');
    this._scoreEl.id = 'hud-score';
    this._root.appendChild(this._scoreEl);

    // Ultimate charge — <progress> has no textContent so aria-label drives announcement
    const ultWrap = document.createElement('div');
    ultWrap.id = 'hud-ultimate-wrap';
    this._ultimateEl = document.createElement('progress');
    this._ultimateEl.id = 'hud-ultimate';
    this._ultimateEl.max = 1;
    this._ultimateEl.value = 0;
    this._ultimateEl.setAttribute('aria-label', 'Ultimate charge: 0%');
    ultWrap.appendChild(this._ultimateEl);
    this._root.appendChild(ultWrap);

    // Wizard HP bar — visual-only bar (role="img" avoids redundant AT traversal)
    const wizWrap = document.createElement('div');
    wizWrap.id = 'hud-wizard-hp-wrap';
    const wizBg = document.createElement('div');
    wizBg.id = 'hud-wizard-hp-bg';
    wizBg.setAttribute('role', 'img');
    wizBg.setAttribute('aria-label', 'Wizard HP: 100%');
    this._wizardHpFillEl = document.createElement('div');
    this._wizardHpFillEl.id = 'hud-wizard-hp-fill';
    wizBg.appendChild(this._wizardHpFillEl);
    wizWrap.appendChild(wizBg);
    this._root.appendChild(wizWrap);

    // Correction reveal — aria-live so "Answer was N" is announced without aria-label
    this._correctionEl = document.createElement('div');
    this._correctionEl.id = 'hud-correction';
    this._correctionEl.setAttribute('aria-live', 'polite');
    this._correctionEl.setAttribute('aria-atomic', 'true');
    this._correctionEl.classList.add('hidden');
    this._root.appendChild(this._correctionEl);

    // Boss phase label — live region, hidden until boss fight starts.
    // No aria-label (rule: no aria-live + aria-label on same element).
    // No aria-hidden toggle — .hidden (display:none) removes from AT tree.
    this._bossPhaseEl = document.createElement('div');
    this._bossPhaseEl.id = 'hud-boss-phase-label';
    this._bossPhaseEl.setAttribute('aria-live', 'polite');
    this._bossPhaseEl.setAttribute('aria-atomic', 'true');
    this._bossPhaseEl.classList.add('hidden');
    this._root.appendChild(this._bossPhaseEl);
  }
}
