(function(global) {
  'use strict';

  // Quick Fight overlay — lets the player pick a monster directly from the hub.
  // Preserved from the Session 8 hub stub so the game remains testable until
  // Session 11's run-map replaces this with the full node-traversal flow.
  class QuickFightOverlay {
    constructor() {
      this._overlay = null;
      this._realm = null;
      this._monsters = null;
      this._boss = null;
      this._loaded = false;
      this._loadPromise = null;
      this._focusReturnTo = null;
      this._keyHandler = null;
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
      ov.setAttribute('aria-label', 'Quick fight — choose a monster');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    async _loadAndShow() {
      if (!this._loaded) {
        if (!this._loadPromise) {
          this._loadPromise = Promise.all([
            fetch('data/monsters.json').then(function(r) { return r.json(); }),
            fetch('data/realms.json').then(function(r) { return r.json(); }),
            fetch('data/bosses.json').then(function(r) { return r.json(); }),
          ]).then((results) => {
            const [monstersData, realmsData, bossesData] = results;
            this._realm = realmsData.realms.find(function(r) { return r.id === 'goblin_forest'; });
            const poolIds = this._realm ? (this._realm.monsterPool || []) : [];
            this._monsters = poolIds.map(function(id) {
              return monstersData.monsters.find(function(m) { return m.id === id; });
            }).filter(Boolean);
            this._boss = bossesData.bosses.find(function(b) { return b.realmId === 'goblin_forest'; });
            this._loaded = true;
            this._loadPromise = null;
          });
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
      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close quick fight');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Quick Fight';
      panel.appendChild(title);

      const sub = document.createElement('p');
      sub.className = 'hub-overlay-subtitle';
      sub.textContent = 'Goblin Forest — choose your opponent';
      panel.appendChild(sub);

      const grid = document.createElement('div');
      grid.className = 'hub-monster-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Monsters');

      (this._monsters || []).forEach((monster) => {
        grid.appendChild(this._makeMonsterCard(monster));
      });

      if (this._boss) {
        grid.appendChild(this._makeBossCard(this._boss));
      }

      panel.appendChild(grid);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _makeMonsterCard(monster) {
      const card = document.createElement('div');
      card.className = 'hub-card';

      const name = document.createElement('h4');
      name.className = 'hub-card-name';
      name.textContent = monster.name || monster.id;
      card.appendChild(name);

      const tier = document.createElement('p');
      tier.className = 'hub-card-tier';
      tier.textContent = 'Tier ' + (monster.tier || 1) + ' · ' + (monster.hp || 1) + ' HP';
      card.appendChild(tier);

      const btn = document.createElement('button');
      btn.className = 'primary hub-fight-btn';
      btn.setAttribute('aria-label', 'Fight ' + (monster.name || monster.id));
      btn.textContent = 'Fight!';
      btn.addEventListener('click', () => { this.cancel(); this._startMonsterFight(monster); });
      card.appendChild(btn);

      return card;
    }

    _makeBossCard(boss) {
      const card = document.createElement('div');
      card.className = 'hub-card hub-boss-card';

      const badge = document.createElement('span');
      badge.className = 'hub-boss-badge';
      badge.textContent = 'BOSS';
      card.appendChild(badge);

      const name = document.createElement('h4');
      name.className = 'hub-card-name';
      name.textContent = boss.name || boss.id;
      card.appendChild(name);

      const phases = document.createElement('p');
      phases.className = 'hub-card-tier';
      phases.textContent = (boss.phases ? boss.phases.length : 3) + ' phases';
      card.appendChild(phases);

      const btn = document.createElement('button');
      btn.className = 'primary hub-fight-btn';
      btn.setAttribute('aria-label', 'Challenge ' + (boss.name || boss.id));
      btn.textContent = 'Challenge!';
      btn.addEventListener('click', () => { this.cancel(); this._startBossFight(boss); });
      card.appendChild(btn);

      return card;
    }

    _startMonsterFight(monster) {
      if (!window.game || !this._realm) return;
      const data = SaveManager.load();
      const allowStretch = data.settings.allowStretchFacts !== false;
      window.game._startFight(monster, this._realm, data.mastery, allowStretch, {});
    }

    _startBossFight(boss) {
      if (!window.game || !this._realm) return;
      const data = SaveManager.load();
      window.game._startBossFight(boss, this._realm, data.mastery);
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

  global.QuickFightOverlay = QuickFightOverlay;
})(typeof window !== 'undefined' ? window : globalThis);
