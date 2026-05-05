(function(global) {
  'use strict';

  class ClassPicker {
    constructor() {
      this._overlay = null;
      this._classesData = null;
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
      ov.setAttribute('aria-label', 'Class picker');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    async _loadAndShow() {
      if (!this._classesData) {
        if (!this._loadPromise) {
          this._loadPromise = fetch('data/classes.json')
            .then(function(r) { return r.json(); })
            .then((d) => { this._classesData = d.classes; this._loadPromise = null; });
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
      const selected = data.selectedClassId || 'apprentice';
      const unlocked = data.unlockedClassIds || ['apprentice'];
      const activeRun = !!data.activeRun;

      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close class picker');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Choose Class';
      panel.appendChild(title);

      if (activeRun) {
        const warn = document.createElement('p');
        warn.className = 'hub-overlay-subtitle hub-overlay-warn';
        warn.textContent = 'Finish or abandon your run first to change class.';
        panel.appendChild(warn);
      }

      const list = document.createElement('div');
      list.className = 'class-list';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Wizard classes');

      const classes = this._classesData || [];
      classes.forEach((cls) => {
        const isUnlocked = unlocked.includes(cls.id);
        const isSelected = cls.id === selected;
        const btn = this._makeClassRow(cls, isUnlocked, isSelected, activeRun);
        list.appendChild(btn);
      });

      panel.appendChild(list);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _makeClassRow(cls, isUnlocked, isSelected, activeRun) {
      const label = (isUnlocked ? '' : 'Locked: ') + cls.name + (isSelected ? ' (current)' : '');
      const btn = document.createElement('button');
      btn.className = 'class-row' + (isSelected ? ' selected' : '');
      btn.setAttribute('aria-label', label);
      if (!isUnlocked || activeRun) btn.disabled = true;

      const icon = document.createElement('span');
      icon.className = 'class-row-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = isUnlocked ? '🧙' : '🔒';
      btn.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'class-row-info';

      const name = document.createElement('div');
      name.className = 'class-row-name';
      name.textContent = cls.name;
      info.appendChild(name);

      const passive = document.createElement('div');
      passive.className = 'class-row-passive';
      passive.textContent = cls.passive ? cls.passive.description : '';
      info.appendChild(passive);

      if (!isUnlocked) {
        const hint = document.createElement('div');
        hint.className = 'class-row-unlock';
        hint.textContent = this._unlockHint(cls.unlock);
        info.appendChild(hint);
      }

      btn.appendChild(info);

      if (isUnlocked && !activeRun) {
        btn.addEventListener('click', () => this._selectClass(cls));
      }

      return btn;
    }

    _unlockHint(unlock) {
      if (!unlock) return '';
      if (unlock.kind === 'starter') return '';
      if (unlock.kind === 'boss_clear') {
        return 'Beat the ' + (unlock.realm || 'first') + ' realm boss';
      }
      return 'Locked';
    }

    _selectClass(cls) {
      const data = SaveManager.load();
      if (data.activeRun) {
        if (typeof showToast === 'function') showToast('Finish or abandon your run first.');
        return;
      }
      const wasClass = data.selectedClassId;
      data.selectedClassId = cls.id;
      // Replace deck with the new class's starter deck
      if (cls.starterDeck) {
        data.equippedDeck = cls.starterDeck.slice();
      }
      // Make sure the class's starter spells are in owned list
      if (cls.starterDeck) {
        cls.starterDeck.forEach(function(id) {
          if (id && !data.ownedSpellIds.includes(id)) {
            data.ownedSpellIds.push(id);
          }
        });
      }
      SaveManager.save(data);
      if (typeof showToast === 'function' && wasClass !== cls.id) {
        showToast('Class changed to ' + cls.name + '. Deck updated.');
      }
      if (window.hubScreen) window.hubScreen.refresh();
      this.cancel();
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

  global.ClassPicker = ClassPicker;
})(typeof window !== 'undefined' ? window : globalThis);
