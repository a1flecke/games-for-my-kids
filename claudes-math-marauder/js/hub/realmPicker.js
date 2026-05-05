(function(global) {
  'use strict';

  // Swatch colors sourced from each realm's bgGradient[0]
  const REALM_SWATCHES = {
    goblin_forest: '#6c8a3a',
    crystal_cave:  '#2c2a4a',
    dragon_peak:   '#8a2c2c',
    astral_void:   '#0d0a2c',
    lich_citadel:  '#2a2a2a',
  };

  class RealmPicker {
    constructor() {
      this._overlay = null;
      this._realmsData = null;
      this._focusReturnTo = null;
      this._keyHandler = null;
      this._loadPromise = null;
    }

    open(triggerEl) {
      this._focusReturnTo = triggerEl || null;
      this._ensureOverlay();
      this._loadAndShow();
    }

    cancel() {
      this._unbindKeys();
      if (this._overlay) {
        this._overlay.classList.remove('open');
        this._overlay.setAttribute('aria-hidden', 'true');
        if (this._focusReturnTo) this._focusReturnTo.focus();
        this._focusReturnTo = null;
      }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    _ensureOverlay() {
      if (this._overlay) return;
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.setAttribute('aria-hidden', 'true');
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Choose a realm');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    async _loadAndShow() {
      if (!this._realmsData) {
        if (!this._loadPromise) {
          this._loadPromise = fetch('data/realms.json')
            .then(function(r) { return r.json(); })
            .then((d) => { this._realmsData = d.realms; this._loadPromise = null; });
        }
        await this._loadPromise;
      }
      this._renderOverlay();
      this._overlay.classList.add('open');
      this._overlay.setAttribute('aria-hidden', 'false');
      const closeBtn = this._overlay.querySelector('.hub-overlay-close');
      if (closeBtn) closeBtn.focus();
      this._bindKeys();
    }

    _renderOverlay() {
      const data = SaveManager.load();
      const realmStars = data.realmStars || {};
      const realms = this._realmsData || [];

      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close realm picker');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Choose a Realm';
      panel.appendChild(title);

      const sub = document.createElement('p');
      sub.className = 'hub-overlay-subtitle';
      sub.textContent = 'Beat the previous realm\'s boss to unlock the next.';
      panel.appendChild(sub);

      const list = document.createElement('div');
      list.className = 'realm-list';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Realms');

      realms.forEach((realm, idx) => {
        // Tier 1 always unlocked; higher tiers unlock after previous boss cleared
        const isUnlocked = this._isRealmUnlocked(realm, idx, realmStars);
        const stars = realmStars[realm.id] || 0;
        list.appendChild(this._makeRealmRow(realm, isUnlocked, stars));
      });

      panel.appendChild(list);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _isRealmUnlocked(realm, idx, realmStars) {
      if (idx === 0) return true;
      // Unlocked if previous realm has at least 1 star (boss beaten)
      const prev = (this._realmsData || [])[idx - 1];
      return prev && (realmStars[prev.id] || 0) >= 1;
    }

    _makeRealmRow(realm, isUnlocked, stars) {
      const starsStr = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
      const label = (isUnlocked ? realm.displayName : 'Locked: ' + realm.displayName) +
        (isUnlocked ? '. Stars: ' + stars + ' of 3.' : '. Beat the previous realm boss to unlock.');

      const btn = document.createElement('button');
      btn.className = 'realm-row';
      btn.setAttribute('aria-label', label);
      if (!isUnlocked) btn.disabled = true;

      const swatch = document.createElement('span');
      swatch.className = 'realm-row-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = REALM_SWATCHES[realm.id] || '#888';
      btn.appendChild(swatch);

      const info = document.createElement('div');
      info.className = 'realm-row-info';

      const name = document.createElement('div');
      name.className = 'realm-row-name';
      name.textContent = (isUnlocked ? '' : '🔒 ') + realm.displayName;
      info.appendChild(name);

      if (isUnlocked) {
        const starEl = document.createElement('div');
        starEl.className = 'realm-row-stars';
        starEl.setAttribute('aria-hidden', 'true');
        starEl.textContent = starsStr;
        info.appendChild(starEl);
      } else {
        const hint = document.createElement('div');
        hint.className = 'realm-row-locked-hint';
        hint.textContent = 'Beat the previous realm boss to unlock';
        info.appendChild(hint);
      }

      btn.appendChild(info);

      if (isUnlocked) {
        btn.addEventListener('click', () => this._pickRealm(realm));
      }

      return btn;
    }

    _pickRealm(realm) {
      this.cancel();
      if (window.game && typeof window.game._startRunInRealm === 'function') {
        window.game._startRunInRealm(realm.id);
      } else if (window.game) {
        // Fallback: launch a debug fight in this realm
        if (typeof showToast === 'function') showToast('Run map coming in Session 11!');
      }
    }

    _bindKeys() {
      this._keyHandler = (e) => {
        if (e.key === 'Escape') {
          if (this._overlay && this._overlay.classList.contains('open')) this.cancel();
          return;
        }
        if (e.key === 'Tab') this._trapFocus(e);
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    _unbindKeys() {
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
    }

    _trapFocus(e) {
      if (!this._overlay) return;
      const focusable = Array.from(
        this._overlay.querySelectorAll('button:not([disabled]), [tabindex="0"]')
      ).filter(function(el) { return el.offsetParent !== null; });
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  global.RealmPicker = RealmPicker;
})(typeof window !== 'undefined' ? window : globalThis);
