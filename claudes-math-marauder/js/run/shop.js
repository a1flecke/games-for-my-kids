(function(global) {
  'use strict';

  const RARITY_COSTS = { common: 25, rare: 60, epic: 100 };
  const RARITY_TIERS = [
    ['common'],
    ['common', 'rare'],
    ['rare', 'epic'],
  ];

  class SpellShop {
    constructor() {
      this._overlay = null;
      this._opener = null;
      this._onComplete = null;
      this._runtime = null;
      this._keydownHandler = null;
    }

    open(nodeId, runtime, onComplete) {
      this._runtime = runtime;
      this._onComplete = onComplete;
      this._opener = document.activeElement;

      const run = runtime.resume();
      const seed = run ? ((run.seed ^ hashString(nodeId)) & 0x7fffffff) : Date.now();
      const shopRng = mulberry32(seed);

      const offerings = this._generateOfferings(shopRng, runtime);
      this._render(offerings);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _generateOfferings(rng, runtime) {
      const data = SaveManager.load();
      const ownedIds = data.ownedSpellIds || [];
      const spells = runtime.getSpells();
      const offerings = [];

      RARITY_TIERS.forEach(function(rarities) {
        const pool = spells.filter(function(s) {
          return rarities.includes(s.rarity) && !ownedIds.includes(s.id);
        });
        if (pool.length === 0) return;
        const pick = pool[Math.floor(rng() * pool.length)];
        const cost = RARITY_COSTS[pick.rarity] || 25;
        offerings.push({ spell: pick, cost: cost });
      });

      return offerings;
    }

    _render(offerings) {
      const run = this._runtime ? this._runtime.resume() : null;
      const gold = run ? (run.goldThisRun || 0) : 0;

      const overlay = document.createElement('div');
      overlay.className = 'overlay shop-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Spell Shop');
      overlay.setAttribute('aria-hidden', 'true');

      const panel = document.createElement('div');
      panel.className = 'panel shop-panel';

      // Close button — first focusable element
      const closeBtn = document.createElement('button');
      closeBtn.className = 'secondary overlay-close-btn';
      closeBtn.setAttribute('aria-label', 'Leave the shop');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this._close(true));
      panel.appendChild(closeBtn);

      const heading = document.createElement('h3');
      heading.className = 'shop-heading';
      heading.textContent = '🛒 Spell Shop';
      panel.appendChild(heading);

      const goldEl = document.createElement('p');
      goldEl.className = 'shop-gold-display';
      goldEl.textContent = 'Your gold: ' + gold + ' g';
      goldEl.setAttribute('aria-live', 'polite');
      panel.appendChild(goldEl);

      if (offerings.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'shop-empty';
        empty.textContent = 'No new spells available. Check back later!';
        panel.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'shop-offerings';
        offerings.forEach((offering) => {
          grid.appendChild(this._buildOfferingCard(offering, gold, goldEl));
        });
        panel.appendChild(grid);
      }

      overlay.appendChild(panel);

      const root = document.getElementById('overlay-root') || document.body;
      root.appendChild(overlay);
      this._overlay = overlay;

      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('open');
      closeBtn.focus();

      this._keydownHandler = (e) => this._onKeyDown(e, overlay);
      overlay.addEventListener('keydown', this._keydownHandler);
    }

    _buildOfferingCard(offering, currentGold, goldDisplayEl) {
      const spell = offering.spell;
      const cost  = offering.cost;

      const card = document.createElement('div');
      card.className = 'shop-card rarity-' + spell.rarity;

      const name = document.createElement('h4');
      name.className = 'shop-card-name';
      name.textContent = spell.name;
      card.appendChild(name);

      const rarity = document.createElement('span');
      rarity.className = 'shop-card-rarity';
      rarity.textContent = spell.rarity.charAt(0).toUpperCase() + spell.rarity.slice(1);
      card.appendChild(rarity);

      const costEl = document.createElement('p');
      costEl.className = 'shop-card-cost';
      costEl.textContent = cost + ' gold';
      card.appendChild(costEl);

      const actions = document.createElement('div');
      actions.className = 'shop-card-actions';

      const buyBtn = document.createElement('button');
      buyBtn.className = 'primary shop-buy-btn';
      buyBtn.textContent = 'Buy';
      buyBtn.setAttribute('aria-label', 'Buy ' + spell.name + ' for ' + cost + ' gold');
      if (currentGold < cost) buyBtn.disabled = true;
      buyBtn.addEventListener('click', () => {
        const newGold = this._runtime.modifyGold(-cost);
        this._runtime.addSpell(spell.id);
        buyBtn.disabled = true;
        buyBtn.textContent = 'Owned';
        if (goldDisplayEl) {
          goldDisplayEl.textContent = 'Your gold: ' + newGold + ' g';
        }
        if (window.showToast) showToast('Purchased ' + spell.name + '!', 2500);
        // Disable other cards if gold now insufficient
        const allBuyBtns = this._overlay ? this._overlay.querySelectorAll('.shop-buy-btn:not([disabled])') : [];
        const run2 = this._runtime.resume();
        const g2 = run2 ? run2.goldThisRun : 0;
        allBuyBtns.forEach(function(b) {
          const c2 = parseInt(b.getAttribute('data-cost') || '0', 10);
          if (g2 < c2) b.disabled = true;
        });
      });
      buyBtn.setAttribute('data-cost', cost);

      const skipBtn = document.createElement('button');
      skipBtn.className = 'secondary shop-skip-btn';
      skipBtn.textContent = 'Skip';
      skipBtn.setAttribute('aria-label', 'Skip ' + spell.name);
      skipBtn.addEventListener('click', () => this._close(true));

      actions.appendChild(buyBtn);
      actions.appendChild(skipBtn);
      card.appendChild(actions);

      return card;
    }

    _onKeyDown(e, overlay) {
      if (e.key === 'Escape') {
        if (overlay.classList.contains('open')) this._close(true);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(overlay.querySelectorAll('button:not([disabled]), select:not([disabled])'));
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

      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);

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

  global.SpellShop = SpellShop;
})(typeof window !== 'undefined' ? window : globalThis);
