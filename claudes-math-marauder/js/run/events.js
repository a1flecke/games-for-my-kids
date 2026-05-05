(function(global) {
  'use strict';

  class EventResolver {
    constructor() {
      this._overlay = null;
      this._opener = null;
      this._onComplete = null;
      this._runtime = null;
      this._keydownHandler = null;
    }

    open(event, runtime, onComplete) {
      this._runtime = runtime;
      this._onComplete = onComplete;
      this._opener = document.activeElement;
      this._render(event);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _render(event) {
      const overlay = document.createElement('div');
      overlay.className = 'overlay event-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Mystery Event');
      overlay.setAttribute('aria-hidden', 'true');

      const panel = document.createElement('div');
      panel.className = 'panel event-panel';

      // Close button — first focusable element per CLAUDE.md
      const closeBtn = document.createElement('button');
      closeBtn.className = 'secondary overlay-close-btn';
      closeBtn.setAttribute('aria-label', 'Skip this event');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this._close(false));
      panel.appendChild(closeBtn);

      const iconEl = document.createElement('div');
      iconEl.className = 'event-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = '🔮';
      panel.appendChild(iconEl);

      const promptEl = document.createElement('p');
      promptEl.className = 'event-prompt';
      promptEl.textContent = event.prompt;
      panel.appendChild(promptEl);

      if (typeof SpeechManager !== 'undefined' && window.speech) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'secondary read-aloud';
        speakBtn.setAttribute('aria-label', 'Read event aloud');
        speakBtn.textContent = '🔊';
        speakBtn.addEventListener('click', () => {
          if (window.speech) window.speech.speak(event.prompt, { interrupt: true });
        });
        panel.appendChild(speakBtn);
      }

      const choicesEl = document.createElement('div');
      choicesEl.className = 'event-choices';
      event.choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'primary event-choice-btn';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => this._choose(event, choice));
        choicesEl.appendChild(btn);
      });
      panel.appendChild(choicesEl);

      overlay.appendChild(panel);

      const root = document.getElementById('overlay-root') || document.body;
      root.appendChild(overlay);
      this._overlay = overlay;

      // Open
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('open');
      closeBtn.focus();

      // Focus trap
      this._keydownHandler = (e) => this._onKeyDown(e, overlay);
      overlay.addEventListener('keydown', this._keydownHandler);
    }

    _onKeyDown(e, overlay) {
      if (e.key === 'Escape') {
        if (overlay.classList.contains('open')) this._close(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(overlay.querySelectorAll('button:not([disabled])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
    }

    _choose(event, choice) {
      // Apply outcomes
      (choice.outcomes || []).forEach((outcome) => {
        switch (outcome.kind) {
          case 'gold':
            if (this._runtime) this._runtime.modifyGold(outcome.delta || 0);
            break;
          case 'spell': {
            if (!this._runtime) break;
            const data = SaveManager.load();
            const ownedIds = data.ownedSpellIds || [];
            const available = this._runtime.getSpells().filter(function(s) {
              return s.rarity === outcome.rarity && !ownedIds.includes(s.id);
            });
            if (available.length > 0) {
              // Use a simple deterministic pick based on event+choice for reproducibility,
              // but Math.random() is fine here (not a combat module).
              const pick = available[Math.floor(Math.random() * available.length)];
              this._runtime.addSpell(pick.id);
              if (window.showToast) showToast('Gained spell: ' + pick.name + '!', 3000);
            }
            break;
          }
          // 'heal', 'damage', 'streak_bonus' — flavor only in B3 (no real HP)
          default:
            break;
        }
      });

      this._close(true);
    }

    _close(resolved) {
      if (!this._overlay) return;
      const overlay = this._overlay;
      this._overlay = null;

      if (this._keydownHandler) {
        overlay.removeEventListener('keydown', this._keydownHandler);
        this._keydownHandler = null;
      }

      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');

      // Remove from DOM after transition
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);

      // Return focus to opener
      if (this._opener && document.contains(this._opener)) {
        this._opener.focus();
      }
      this._opener = null;

      const cb = this._onComplete;
      this._onComplete = null;
      this._runtime = null;
      if (cb) cb(resolved);
    }
  }

  global.EventResolver = EventResolver;
})(typeof window !== 'undefined' ? window : globalThis);
