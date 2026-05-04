(function(global) {
  'use strict';

  const FONT_SCALES = [
    { value: '0.9',  label: 'Small (90%)' },
    { value: '1.0',  label: 'Default' },
    { value: '1.1',  label: 'Larger (110%)' },
    { value: '1.25', label: 'Large (125%)' },
    { value: '1.5',  label: 'Extra large (150%)' },
  ];

  class SettingsPanel {
    constructor() {
      this._overlay = null;
      this._closeBtn = null;
      this._trigger = null;
      this._data = null;
      this._resetStep = 0;
      this._resetTimer = null;

      // Form controls (set in _buildDOM)
      this._voiceSelect = null;
      this._rateSlider = null;
      this._rateLabel = null;
      this._autoNarrateChk = null;
      this._sfxVolSlider = null;
      this._sfxVolLabel = null;
      this._muteChk = null;
      this._reducedMotionChk = null;
      this._fontScaleSelect = null;
      this._showTimerChk = null;
      this._stretchChk = null;

      this._buildDOM();
    }

    _buildDOM() {
      const overlay = document.createElement('div');
      overlay.id = 'settings-overlay';
      overlay.className = 'overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Settings');
      overlay.setAttribute('aria-hidden', 'true');
      this._overlay = overlay;

      const panel = document.createElement('div');
      panel.className = 'panel settings-panel';

      // Close button — must be first focusable element
      const closeBtn = document.createElement('button');
      closeBtn.className = 'secondary settings-close-btn';
      closeBtn.setAttribute('aria-label', 'Close settings');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.close());
      this._closeBtn = closeBtn;
      panel.appendChild(closeBtn);

      const heading = document.createElement('h2');
      heading.textContent = 'Settings';
      heading.className = 'settings-heading';
      panel.appendChild(heading);

      panel.appendChild(this._buildSpeechSection());
      panel.appendChild(this._buildAudioSection());
      panel.appendChild(this._buildDisplaySection());
      panel.appendChild(this._buildGameSection());
      panel.appendChild(this._buildActionsSection());

      overlay.appendChild(panel);

      overlay.addEventListener('keydown', (e) => this._onKeyDown(e));

      const root = document.getElementById('overlay-root') || document.body;
      root.appendChild(overlay);
    }

    _buildSpeechSection() {
      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', 'settings-speech-heading');

      const h = document.createElement('h3');
      h.id = 'settings-speech-heading';
      h.textContent = 'Speech';
      section.appendChild(h);

      // Voice picker
      const voiceRow = this._row('Voice', 'settings-voice');
      const voiceSelect = document.createElement('select');
      voiceSelect.id = 'settings-voice';
      voiceSelect.className = 'settings-select';
      const noVoiceOpt = document.createElement('option');
      noVoiceOpt.value = '';
      noVoiceOpt.textContent = 'Default voice';
      voiceSelect.appendChild(noVoiceOpt);
      voiceRow.appendChild(voiceSelect);
      this._voiceSelect = voiceSelect;
      section.appendChild(voiceRow);

      // Rate slider
      const rateRow = this._row('Speech rate', 'settings-rate');
      const rateLabel = document.createElement('span');
      rateLabel.id = 'settings-rate-label';
      rateLabel.className = 'settings-slider-val';
      rateLabel.textContent = '1.0×';
      rateRow.querySelector('label').appendChild(rateLabel);
      const rateSlider = document.createElement('input');
      rateSlider.type = 'range';
      rateSlider.id = 'settings-rate';
      rateSlider.min = '0.7';
      rateSlider.max = '1.3';
      rateSlider.step = '0.1';
      rateSlider.value = '1.0';
      rateSlider.setAttribute('aria-valuetext', '1.0 times speed');
      rateRow.appendChild(rateSlider);
      this._rateSlider = rateSlider;
      this._rateLabel = rateLabel;
      section.appendChild(rateRow);

      // Auto-narrate checkbox
      const autoNarrateRow = this._checkRow('Read aloud automatically', 'settings-auto-narrate');
      this._autoNarrateChk = autoNarrateRow.querySelector('input');
      section.appendChild(autoNarrateRow);

      // Test speech button
      const testBtn = document.createElement('button');
      testBtn.className = 'secondary settings-test-btn';
      testBtn.setAttribute('aria-label', 'Test speech — speaks hello message');
      testBtn.textContent = '🔊 Test voice';
      testBtn.addEventListener('click', () => {
        if (window.speech) window.speech.speak('Hello, math marauder!');
      });
      section.appendChild(testBtn);

      return section;
    }

    _buildAudioSection() {
      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', 'settings-audio-heading');

      const h = document.createElement('h3');
      h.id = 'settings-audio-heading';
      h.textContent = 'Audio';
      section.appendChild(h);

      // SFX volume slider
      const volRow = this._row('Sound effects volume', 'settings-sfx-vol');
      const volLabel = document.createElement('span');
      volLabel.id = 'settings-sfx-vol-label';
      volLabel.className = 'settings-slider-val';
      volLabel.textContent = '70%';
      volRow.querySelector('label').appendChild(volLabel);
      const volSlider = document.createElement('input');
      volSlider.type = 'range';
      volSlider.id = 'settings-sfx-vol';
      volSlider.min = '0';
      volSlider.max = '1';
      volSlider.step = '0.1';
      volSlider.value = '0.7';
      volRow.appendChild(volSlider);
      this._sfxVolSlider = volSlider;
      this._sfxVolLabel = volLabel;
      section.appendChild(volRow);

      // Mute checkbox
      const muteRow = this._checkRow('Mute all sounds', 'settings-mute');
      this._muteChk = muteRow.querySelector('input');
      section.appendChild(muteRow);

      return section;
    }

    _buildDisplaySection() {
      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', 'settings-display-heading');

      const h = document.createElement('h3');
      h.id = 'settings-display-heading';
      h.textContent = 'Display';
      section.appendChild(h);

      // Reduced motion checkbox
      const rmRow = this._checkRow('Reduced motion', 'settings-reduced-motion');
      this._reducedMotionChk = rmRow.querySelector('input');
      section.appendChild(rmRow);

      // Font scale dropdown
      const fontRow = this._row('Text size', 'settings-font-scale');
      const fontSelect = document.createElement('select');
      fontSelect.id = 'settings-font-scale';
      fontSelect.className = 'settings-select';
      FONT_SCALES.forEach(function(s) {
        const opt = document.createElement('option');
        opt.value = s.value;
        opt.textContent = s.label;
        fontSelect.appendChild(opt);
      });
      fontRow.appendChild(fontSelect);
      this._fontScaleSelect = fontSelect;
      section.appendChild(fontRow);

      return section;
    }

    _buildGameSection() {
      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', 'settings-game-heading');

      const h = document.createElement('h3');
      h.id = 'settings-game-heading';
      h.textContent = 'Game';
      section.appendChild(h);

      const timerRow = this._checkRow('Show speed timer', 'settings-show-timer');
      this._showTimerChk = timerRow.querySelector('input');
      section.appendChild(timerRow);

      const stretchRow = this._checkRow('Allow bonus problems', 'settings-stretch');
      this._stretchChk = stretchRow.querySelector('input');
      section.appendChild(stretchRow);

      return section;
    }

    _buildActionsSection() {
      const section = document.createElement('section');
      section.className = 'settings-actions';

      const resetBtn = document.createElement('button');
      resetBtn.id = 'settings-reset-btn';
      resetBtn.className = 'secondary danger';
      resetBtn.setAttribute('aria-label', 'Reset all progress — requires confirmation');
      resetBtn.textContent = 'Reset progress';
      resetBtn.addEventListener('click', () => this._onResetClick(resetBtn));
      section.appendChild(resetBtn);

      return section;
    }

    // Helper: labeled row wrapping label + for=""
    _row(labelText, forId) {
      const row = document.createElement('div');
      row.className = 'settings-row';
      const label = document.createElement('label');
      label.setAttribute('for', forId);
      label.textContent = labelText;
      row.appendChild(label);
      return row;
    }

    // Helper: checkbox row with label wrapping
    _checkRow(labelText, id) {
      const row = document.createElement('div');
      row.className = 'settings-row settings-check-row';
      const label = document.createElement('label');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = id;
      label.appendChild(chk);
      label.appendChild(document.createTextNode(' ' + labelText));
      row.appendChild(label);
      return row;
    }

    // ── Public API ────────────────────────────────────────────────────

    open(triggerEl) {
      this._trigger = triggerEl || null;
      this._data = SaveManager.load();
      this._resetStep = 0;
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
      const resetBtn = this._overlay.querySelector('#settings-reset-btn');
      if (resetBtn) {
        resetBtn.textContent = 'Reset progress';
        resetBtn.setAttribute('aria-label', 'Reset all progress — requires confirmation');
      }

      this._populateVoices();
      this._populate(this._data.settings);
      this._bindControls();

      this._overlay.setAttribute('aria-hidden', 'false');
      this._overlay.classList.add('open');
      if (triggerEl) triggerEl.setAttribute('aria-expanded', 'true');
      this._closeBtn.focus();
    }

    close() {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
      this._overlay.setAttribute('aria-hidden', 'true');
      this._overlay.classList.remove('open');
      if (this._trigger) {
        this._trigger.setAttribute('aria-expanded', 'false');
        this._trigger.focus();
      }
      this._trigger = null;
    }

    // ── Internal ──────────────────────────────────────────────────────

    _populateVoices() {
      if (!window.speech) return;
      const voices = window.speech.getVoices();
      const select = this._voiceSelect;
      // Clear all but default option
      while (select.options.length > 1) select.remove(1);
      if (!window.speech.isSupported()) {
        select.disabled = true;
        select.options[0].textContent = 'Speech not supported';
        return;
      }
      if (voices.length === 0) {
        select.disabled = true;
        select.options[0].textContent = 'No voices available';
        return;
      }
      select.disabled = false;
      select.options[0].textContent = 'Default voice';
      voices.forEach(function(v) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name + (v.lang ? ' (' + v.lang + ')' : '');
        select.appendChild(opt);
      });
    }

    _populate(s) {
      if (s.speechVoiceURI && this._voiceSelect) {
        this._voiceSelect.value = s.speechVoiceURI;
      }
      if (this._rateSlider) {
        const rate = s.speechRate || 1.0;
        this._rateSlider.value = String(rate);
        this._rateLabel.textContent = rate.toFixed(1) + '×';
        this._rateSlider.setAttribute('aria-valuetext', rate.toFixed(1) + ' times speed');
      }
      if (this._autoNarrateChk) this._autoNarrateChk.checked = s.autoNarrate !== false;
      if (this._sfxVolSlider) {
        const vol = s.sfxVolume !== undefined ? s.sfxVolume : 0.7;
        this._sfxVolSlider.value = String(vol);
        this._sfxVolLabel.textContent = Math.round(vol * 100) + '%';
      }
      if (this._muteChk) this._muteChk.checked = !!s.muteAll;
      if (this._reducedMotionChk) this._reducedMotionChk.checked = !!s.reducedMotion;
      if (this._fontScaleSelect) {
        const scale = s.fontScale || 1.0;
        const match = FONT_SCALES.find(function(f) { return parseFloat(f.value) === scale; });
        this._fontScaleSelect.value = match ? match.value : '1.0';
      }
      if (this._showTimerChk) this._showTimerChk.checked = !!s.showSpeedTimer;
      if (this._stretchChk) this._stretchChk.checked = s.allowStretchFacts !== false;
    }

    _bindControls() {
      // Remove previous listeners by replacing nodes — simplest approach is to
      // use a stored flag; since we rebuild the listener each open(), use capture
      // at overlay level with event delegation
      this._overlay.onchange = (e) => this._onAnyChange(e);
      this._rateSlider.oninput = () => {
        const rate = parseFloat(this._rateSlider.value);
        this._rateLabel.textContent = rate.toFixed(1) + '×';
        this._rateSlider.setAttribute('aria-valuetext', rate.toFixed(1) + ' times speed');
        this._saveAndApply();
      };
      this._sfxVolSlider.oninput = () => {
        const vol = parseFloat(this._sfxVolSlider.value);
        this._sfxVolLabel.textContent = Math.round(vol * 100) + '%';
        this._saveAndApply();
      };
    }

    _onAnyChange(e) {
      const t = e.target;
      if (t === this._rateSlider || t === this._sfxVolSlider) return; // handled by oninput
      this._saveAndApply();
    }

    _saveAndApply() {
      if (!this._data) return;
      const s = this._data.settings;
      s.speechVoiceURI = this._voiceSelect.value || null;
      s.speechRate = parseFloat(this._rateSlider.value);
      s.autoNarrate = this._autoNarrateChk.checked;
      s.sfxVolume = parseFloat(this._sfxVolSlider.value);
      s.muteAll = this._muteChk.checked;
      s.reducedMotion = this._reducedMotionChk.checked;
      s.fontScale = parseFloat(this._fontScaleSelect.value);
      s.showSpeedTimer = this._showTimerChk.checked;
      s.allowStretchFacts = this._stretchChk.checked;
      SaveManager.save(this._data);
      this._applySettings(s);
    }

    _applySettings(s) {
      // Font scale
      document.documentElement.style.fontSize = Math.round(20 * (s.fontScale || 1.0)) + 'px';

      // Reduced motion (manual toggle OR OS preference)
      const forceReduced = s.reducedMotion ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (forceReduced) {
        document.body.setAttribute('data-reduced-motion', 'true');
      } else {
        document.body.removeAttribute('data-reduced-motion');
      }

      // Mute + volume
      if (window.sfx) {
        window.sfx.setMuted(s.muteAll);
        window.sfx.setVolume(s.sfxVolume !== undefined ? s.sfxVolume : 0.7);
      }

      // Speech settings
      if (window.speech) {
        window.speech.setSettings({
          voiceURI: s.speechVoiceURI,
          rate: s.speechRate,
          autoNarrate: s.autoNarrate,
        });
      }
    }

    _onResetClick(btn) {
      if (this._resetStep === 0) {
        this._resetStep = 1;
        btn.textContent = 'Tap again to confirm reset';
        btn.setAttribute('aria-label', 'Confirm reset — tap again to erase all progress');
        clearTimeout(this._resetTimer);
        this._resetTimer = setTimeout(() => {
          this._resetTimer = null;
          this._resetStep = 0;
          btn.textContent = 'Reset progress';
          btn.setAttribute('aria-label', 'Reset all progress — requires confirmation');
        }, 3000);
      } else {
        // Debounce to prevent double-tap
        btn.disabled = true;
        clearTimeout(this._resetTimer);
        this._resetTimer = null;
        SaveManager.reset();
        this._data = SaveManager.load();
        this._populate(this._data.settings);
        this._applySettings(this._data.settings);
        this._resetStep = 0;
        btn.textContent = 'Reset progress';
        btn.setAttribute('aria-label', 'Reset all progress — requires confirmation');
        btn.disabled = false;
        if (typeof showToast === 'function') showToast('Progress reset.', 2500);
      }
    }

    _onKeyDown(e) {
      if (e.key === 'Escape') {
        if (this._overlay.classList.contains('open')) this.close();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(this._overlay.querySelectorAll(
          'button:not([disabled]), select:not([disabled]), input[type="range"], input[type="checkbox"]'
        ));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
  }

  global.SettingsPanel = SettingsPanel;
})(typeof window !== 'undefined' ? window : globalThis);
