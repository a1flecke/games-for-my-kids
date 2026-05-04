(function(global) {
  'use strict';

  class SpeechManager {
    constructor() {
      this._voices = [];
      this._voiceURI = null;
      this._rate = 1.0;
      this._autoNarrate = true;
      this._muted = false;
      this._enabled = ('speechSynthesis' in window);
      if (this._enabled) {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
        this._loadVoices();
      }
    }

    _loadVoices() {
      if (!this._enabled) return;
      this._voices = window.speechSynthesis.getVoices();
    }

    setSettings({ voiceURI, rate, autoNarrate, muted } = {}) {
      if (voiceURI !== undefined) this._voiceURI = voiceURI;
      if (rate !== undefined) this._rate = rate;
      if (autoNarrate !== undefined) this._autoNarrate = autoNarrate;
      if (muted !== undefined) {
        this._muted = !!muted;
        if (this._muted) this.cancel();
      }
    }

    speak(text, opts) {
      if (!this._enabled) return;
      if (this._muted) return;
      if (!text) return;
      opts = opts || {};
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate !== undefined ? opts.rate : this._rate;
      u.pitch = opts.pitch !== undefined ? opts.pitch : 1.0;
      if (this._voiceURI) {
        const v = this._voices.find(x => x.voiceURI === this._voiceURI);
        if (v) u.voice = v;
      } else {
        const preferred = ['Daniel', 'Karen', 'Samantha', 'Moira'];
        const v = this._voices.find(x => preferred.some(p => x.name.includes(p)));
        if (v) u.voice = v;
      }
      // iOS quirk: cancel silences an immediately-following speak()
      window.speechSynthesis.cancel();
      setTimeout(function() {
        try { window.speechSynthesis.speak(u); } catch (e) {}
      }, 50);
    }

    cancel() {
      if (!this._enabled) return;
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    pause() { if (this._enabled) try { window.speechSynthesis.pause(); } catch (e) {} }
    resume() { if (this._enabled) try { window.speechSynthesis.resume(); } catch (e) {} }

    speakIfAuto(text, opts) { if (this._autoNarrate) this.speak(text, opts); }

    isSupported() { return this._enabled; }
    getVoices() { return this._voices.slice(); }
  }

  // Attaches a 🔊 button to parent that reads text via window.speech.
  function attachReadAloud(parent, getText, opts) {
    opts = opts || {};
    const btn = document.createElement('button');
    btn.className = 'read-aloud';
    btn.setAttribute('aria-label', 'Read aloud');
    btn.innerHTML = '🔊';
    btn.addEventListener('click', function() {
      if (window.speech) window.speech.speak(getText());
    });
    if (!window.speech || !window.speech.isSupported()) btn.disabled = true;
    parent.appendChild(btn);
    return btn;
  }

  global.SpeechManager = SpeechManager;
  global.attachReadAloud = attachReadAloud;
})(typeof window !== 'undefined' ? window : globalThis);
