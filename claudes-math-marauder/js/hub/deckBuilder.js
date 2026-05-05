(function(global) {
  'use strict';

  class DeckBuilder {
    constructor() {
      this._overlay = null;
      this._draft = [];
      this._spellsData = null;
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
      ov.setAttribute('aria-label', 'Deck builder');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    async _loadAndShow() {
      if (!this._spellsData) {
        if (!this._loadPromise) {
          this._loadPromise = fetch('data/spells.json')
            .then(function(r) { return r.json(); })
            .then((d) => { this._spellsData = d.spells; this._loadPromise = null; });
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
      this._draft = (data.equippedDeck || []).filter(Boolean).slice();
      const owned = data.ownedSpellIds || ['ember_bolt'];

      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close deck builder');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Deck Builder';
      panel.appendChild(title);

      const sub = document.createElement('p');
      sub.className = 'hub-overlay-subtitle';
      sub.id = 'deck-builder-sub';
      sub.textContent = 'Equip 3–4 spells. Tap to toggle.';
      panel.appendChild(sub);

      const list = document.createElement('div');
      list.className = 'deck-spell-list';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Spells');

      const allSpells = this._spellsData || [];
      allSpells.forEach((spell) => {
        const isOwned = owned.includes(spell.id);
        const btn = this._makeSpellRow(spell, isOwned);
        list.appendChild(btn);
      });
      panel.appendChild(list);

      const actions = document.createElement('div');
      actions.className = 'hub-overlay-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'primary';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => this._save());
      actions.appendChild(saveBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => this.cancel());
      actions.appendChild(cancelBtn);

      panel.appendChild(actions);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _makeSpellRow(spell, isOwned) {
      const equipped = this._draft.includes(spell.id);
      const label = (isOwned ? '' : 'Locked: ') + spell.name;
      const btn = document.createElement('button');
      btn.className = 'deck-spell-row';
      btn.setAttribute('aria-pressed', equipped ? 'true' : 'false');
      btn.setAttribute('aria-label', label);
      if (!isOwned) btn.disabled = true;

      const check = document.createElement('span');
      check.className = 'deck-spell-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = equipped ? '✓' : (isOwned ? '○' : '🔒');
      btn.appendChild(check);

      const info = document.createElement('div');
      info.className = 'deck-spell-info';

      const name = document.createElement('div');
      name.className = 'deck-spell-name';
      name.textContent = spell.name;
      info.appendChild(name);

      const desc = document.createElement('div');
      desc.className = 'deck-spell-desc';
      desc.textContent = this._spellDesc(spell);
      info.appendChild(desc);

      btn.appendChild(info);

      const rarity = document.createElement('span');
      rarity.className = 'deck-spell-rarity ' + (spell.rarity || 'common');
      rarity.textContent = spell.rarity || 'common';
      btn.appendChild(rarity);

      if (isOwned) {
        btn.addEventListener('click', () => this._toggle(spell.id));
      }

      return btn;
    }

    _spellDesc(spell) {
      const m = spell.modifiers || {};
      const parts = [];
      if (m.baseDamageBonus)     parts.push('+' + Math.round(m.baseDamageBonus * 100) + '% dmg');
      if (m.speedCritBonus)      parts.push('+' + Math.round(m.speedCritBonus * 100) + '% speed crit');
      if (m.streakBonusBonus)    parts.push('+' + Math.round(m.streakBonusBonus * 100) + '% streak');
      if (m.ultimateChargeBonus) parts.push('+' + Math.round(m.ultimateChargeBonus * 100) + '% ult charge');
      return parts.length ? parts.join(' · ') : 'No modifiers';
    }

    _toggle(spellId) {
      if (this._draft.includes(spellId)) {
        if (this._draft.length <= 3) {
          if (typeof showToast === 'function') showToast('Need at least 3 spells equipped.');
          return;
        }
        this._draft = this._draft.filter(function(id) { return id !== spellId; });
      } else {
        if (this._draft.length >= 4) {
          if (typeof showToast === 'function') showToast('Max 4 spells. Remove one first.');
          return;
        }
        this._draft.push(spellId);
      }
      this._reRender();
    }

    _reRender() {
      if (!this._overlay) return;
      const data = SaveManager.load();
      const owned = data.ownedSpellIds || ['ember_bolt'];
      const list = this._overlay.querySelector('.deck-spell-list');
      if (!list) return;
      list.innerHTML = '';
      const allSpells = this._spellsData || [];
      allSpells.forEach((spell) => {
        const isOwned = owned.includes(spell.id);
        list.appendChild(this._makeSpellRow(spell, isOwned));
      });
    }

    _save() {
      const data = SaveManager.load();
      if (this._draft.length < 3) {
        if (typeof showToast === 'function') showToast('Equip at least 3 spells before saving.');
        return;
      }
      // Build a 5-slot deck array (padded with nulls to maintain slot structure)
      const deck = this._draft.slice(0, 4);
      while (deck.length < 5) deck.push(null);
      data.equippedDeck = deck;
      SaveManager.save(data);
      if (window.hubScreen) window.hubScreen.refresh();
      this.cancel();
    }

    _bindKeys() {
      this._keyHandler = (e) => {
        if (e.key === 'Escape') {
          if (this._overlay && this._overlay.classList.contains('open')) this.cancel();
          return;
        }
        if (e.key === 'Tab') {
          this._trapFocus(e);
        }
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

  global.DeckBuilder = DeckBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
