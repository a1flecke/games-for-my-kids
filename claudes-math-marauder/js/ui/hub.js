(function(global) {
  'use strict';

  // Minimal hub screen: loads Goblin Forest data and lets the player pick a fight.
  // Populates #hub-screen on show(). Session 9 will replace this with the full
  // run-map system; this stub makes the game playable end-to-end in the meantime.
  class HubScreen {
    constructor() {
      this._root = null;
      this._realm = null;
      this._monsters = null;
      this._boss = null;
      this._loaded = false;
      this._loading = false;
    }

    show() {
      this._root = document.getElementById('hub-screen');
      if (!this._root) return;
      this._root.innerHTML = '';
      this._renderSkeleton();
      if (this._loaded) {
        this._renderContent();
      } else if (!this._loading) {
        this._loadData();
      }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _renderSkeleton() {
      // Back button (top-left) — returns to title screen so users aren't trapped in hub
      const back = document.createElement('button');
      back.className = 'secondary hub-back-btn';
      back.setAttribute('aria-label', 'Back to title screen');
      back.textContent = '← Title';
      back.addEventListener('click', function() {
        if (window.game) window.game.setState('TITLE');
      });
      this._root.appendChild(back);

      // Gear button (top-right, same as title screen)
      const gear = document.createElement('button');
      gear.className = 'secondary settings-gear-btn';
      gear.setAttribute('aria-label', 'Open settings');
      gear.setAttribute('aria-expanded', 'false');
      gear.textContent = '⚙️';
      gear.addEventListener('click', function() {
        if (window.settingsPanel) window.settingsPanel.open(gear);
      });
      this._root.appendChild(gear);

      const heading = document.createElement('h2');
      heading.className = 'hub-title';
      heading.textContent = "Wizard's Tower";
      this._root.appendChild(heading);

      const loading = document.createElement('p');
      loading.id = 'hub-loading';
      loading.className = 'hub-loading-text';
      loading.textContent = 'Loading…';
      this._root.appendChild(loading);
    }

    async _loadData() {
      this._loading = true;
      try {
        const [monstersData, realmsData, bossesData] = await Promise.all([
          fetch('data/monsters.json').then(function(r) { return r.json(); }),
          fetch('data/realms.json').then(function(r) { return r.json(); }),
          fetch('data/bosses.json').then(function(r) { return r.json(); }),
        ]);

        this._realm = realmsData.realms.find(function(r) { return r.id === 'goblin_forest'; });
        const poolIds = this._realm ? (this._realm.monsterPool || []) : [];
        this._monsters = poolIds.map(function(id) {
          return monstersData.monsters.find(function(m) { return m.id === id; });
        }).filter(Boolean);
        this._boss = bossesData.bosses.find(function(b) { return b.realmId === 'goblin_forest'; });

        this._loaded = true;
        this._loading = false;

        // Only render if hub screen is still active
        if (this._root && this._root.classList.contains('active')) {
          this._renderContent();
        }
      } catch (err) {
        this._loading = false;
        console.error('[HubScreen] Load failed:', err);
        if (this._root) {
          const loadingEl = this._root.querySelector('#hub-loading');
          if (loadingEl) loadingEl.textContent = 'Could not load game data. Try refreshing.';
        }
      }
    }

    _renderContent() {
      const loadingEl = this._root.querySelector('#hub-loading');
      if (loadingEl) loadingEl.remove();

      const realmName = this._realm ? (this._realm.name || 'Goblin Forest') : 'Goblin Forest';

      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', 'hub-realm-heading');
      section.className = 'hub-realm-section';

      const realmHeading = document.createElement('h3');
      realmHeading.id = 'hub-realm-heading';
      realmHeading.className = 'hub-realm-name';
      realmHeading.textContent = realmName + ' — Realm 1';
      section.appendChild(realmHeading);

      const intro = document.createElement('p');
      intro.className = 'hub-intro';
      intro.textContent = 'Choose a fight:';
      section.appendChild(intro);

      const grid = document.createElement('div');
      grid.className = 'hub-monster-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Monsters');

      // Regular monster cards
      const monsters = this._monsters || [];
      monsters.forEach((monster) => {
        grid.appendChild(this._makeMonsterCard(monster));
      });

      // Boss card
      if (this._boss) {
        grid.appendChild(this._makeBossCard(this._boss));
      }

      section.appendChild(grid);
      this._root.appendChild(section);
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
      tier.textContent = 'Tier ' + (monster.tier || 1);
      card.appendChild(tier);

      const btn = document.createElement('button');
      btn.className = 'primary hub-fight-btn';
      btn.setAttribute('aria-label', 'Fight ' + (monster.name || monster.id));
      btn.textContent = 'Fight!';
      btn.addEventListener('click', () => this._startMonsterFight(monster));
      card.appendChild(btn);

      return card;
    }

    _makeBossCard(boss) {
      const card = document.createElement('div');
      card.className = 'hub-card hub-boss-card';

      const label = document.createElement('span');
      label.className = 'hub-boss-badge';
      label.textContent = 'BOSS';
      card.appendChild(label);

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
      btn.addEventListener('click', () => this._startBossFight(boss));
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
  }

  global.HubScreen = HubScreen;
})(typeof window !== 'undefined' ? window : globalThis);
