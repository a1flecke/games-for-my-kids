(function(global) {
  'use strict';

  class HubScreen {
    constructor() {
      this._root = null;
      this._deckBuilder = null;
      this._classPicker = null;
      this._codex = null;
      this._story = null;
      this._realmPicker = null;
      this._quickFight = null;

      // Bound handlers (stored so they can be removed on hide)
      this._handlers = null;
    }

    // Called once after overlays are created (by game.js after all classes load)
    setOverlays({ deckBuilder, classPicker, codex, story, realmPicker, quickFight }) {
      this._deckBuilder = deckBuilder;
      this._classPicker = classPicker;
      this._codex = codex;
      this._story = story;
      this._realmPicker = realmPicker;
      this._quickFight = quickFight;
    }

    show() {
      this._root = document.getElementById('hub-screen');
      if (!this._root) return;
      this._refresh();
      this._bindHandlers();
      const startBtn = document.getElementById('hub-btn-start-run');
      if (startBtn) startBtn.focus();
    }

    hide() {
      this._unbindHandlers();
    }

    // Re-read save and update all stat labels + subtitles
    refresh() {
      this._refresh();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    _refresh() {
      const data = SaveManager.load();

      // Gold
      const goldVal = document.querySelector('#hub-stat-gold .hub-stat-value');
      if (goldVal) {
        goldVal.textContent = String(data.gold || 0);
        goldVal.setAttribute('aria-label', 'Gold: ' + (data.gold || 0));
      }

      // Class name
      const classId = data.selectedClassId || 'apprentice';
      const className = this._classNameById(classId);
      const classVal = document.querySelector('#hub-stat-class .hub-stat-value');
      if (classVal) {
        classVal.textContent = className;
        classVal.setAttribute('aria-label', 'Class: ' + className);
      }

      // Deck subtitle
      const deck = (data.equippedDeck || []).filter(Boolean);
      const deckSub = document.getElementById('hub-btn-deck-sub');
      if (deckSub) deckSub.textContent = deck.length + ' spell' + (deck.length !== 1 ? 's' : '') + ' equipped';

      // Class subtitle
      const unlocked = data.unlockedClassIds || ['apprentice'];
      const classSub = document.getElementById('hub-btn-class-sub');
      if (classSub) classSub.textContent = unlocked.length + ' unlocked';

      // Codex subtitle
      const mastered = this._countMastered(data.mastery || {});
      const codexSub = document.getElementById('hub-btn-codex-sub');
      if (codexSub) codexSub.textContent = mastered + ' / 169 mastered';

      // Story subtitle
      const storyCount = (data.storyChaptersUnlocked || []).length;
      const storySub = document.getElementById('hub-btn-story-sub');
      if (storySub) storySub.textContent = storyCount + ' chapter' + (storyCount !== 1 ? 's' : '');

      // Resume banner
      const banner = document.getElementById('hub-resume-banner');
      if (banner) {
        if (data.activeRun) {
          banner.classList.remove('hidden');
        } else {
          banner.classList.add('hidden');
        }
      }
    }

    _classNameById(id) {
      // Inline map — avoids async fetch; classes.json has only 2 classes for now
      const names = { apprentice: 'Apprentice', pyromancer: 'Pyromancer' };
      return names[id] || id;
    }

    _countMastered(mastery) {
      // Count mastered cells (each a×b and b×a is a separate cell = 169 total)
      // Diagonal (a=b) contributes 1 cell per key; off-diagonal contributes 2
      let count = 0;
      for (let a = 0; a <= 12; a++) {
        for (let b = a; b <= 12; b++) {
          const key = a + 'x' + b;
          const cell = mastery[key];
          if (cell && cell.box >= 4 && cell.totalCorrect >= 6) {
            count += (a === b) ? 1 : 2;
          }
        }
      }
      return count;
    }

    _bindHandlers() {
      this._handlers = {
        startRun: () => {
          const btn = document.getElementById('hub-btn-start-run');
          if (this._realmPicker) this._realmPicker.open(btn);
        },
        deck: () => {
          const btn = document.getElementById('hub-btn-deck');
          if (this._deckBuilder) this._deckBuilder.open(btn);
        },
        cls: () => {
          const btn = document.getElementById('hub-btn-class');
          if (this._classPicker) this._classPicker.open(btn);
        },
        codex: () => {
          const btn = document.getElementById('hub-btn-codex');
          if (this._codex) this._codex.open(btn);
        },
        story: () => {
          const btn = document.getElementById('hub-btn-story');
          if (this._story) this._story.open(btn);
        },
        fight: () => {
          const btn = document.getElementById('hub-btn-fight');
          if (this._quickFight) this._quickFight.open(btn);
        },
        settings: () => {
          const btn = document.getElementById('hub-settings-btn');
          if (window.settingsPanel) window.settingsPanel.open(btn);
        },
        resume: () => {
          if (window.game) window.game._onResumeRun();
        },
        abandon: () => {
          if (window.game) window.game._onAbandonRun();
        },
      };

      this._addBtn('hub-btn-start-run', this._handlers.startRun);
      this._addBtn('hub-btn-deck',      this._handlers.deck);
      this._addBtn('hub-btn-class',     this._handlers.cls);
      this._addBtn('hub-btn-codex',     this._handlers.codex);
      this._addBtn('hub-btn-story',     this._handlers.story);
      this._addBtn('hub-btn-fight',     this._handlers.fight);
      this._addBtn('hub-settings-btn',  this._handlers.settings);
      this._addBtn('hub-btn-resume',    this._handlers.resume);
      this._addBtn('hub-btn-abandon',   this._handlers.abandon);
    }

    _unbindHandlers() {
      if (!this._handlers) return;
      this._removeBtn('hub-btn-start-run', this._handlers.startRun);
      this._removeBtn('hub-btn-deck',      this._handlers.deck);
      this._removeBtn('hub-btn-class',     this._handlers.cls);
      this._removeBtn('hub-btn-codex',     this._handlers.codex);
      this._removeBtn('hub-btn-story',     this._handlers.story);
      this._removeBtn('hub-btn-fight',     this._handlers.fight);
      this._removeBtn('hub-settings-btn',  this._handlers.settings);
      this._removeBtn('hub-btn-resume',    this._handlers.resume);
      this._removeBtn('hub-btn-abandon',   this._handlers.abandon);
      this._handlers = null;
    }

    _addBtn(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    }

    _removeBtn(id, fn) {
      const el = document.getElementById(id);
      if (el) el.removeEventListener('click', fn);
    }
  }

  global.HubScreen = HubScreen;
})(typeof window !== 'undefined' ? window : globalThis);
