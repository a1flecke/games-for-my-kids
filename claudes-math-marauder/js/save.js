(function(global) {
  'use strict';

  const KEY = 'claudes-math-marauder-save';
  const BACKUP_KEY = 'claudes-math-marauder-save-backup';
  const SCHEMA_VERSION = 1;

  let _saveCount = 0;

  function _defaults() {
    return {
      schemaVersion: SCHEMA_VERSION,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playerName: null,
      totalRunsStarted: 0,
      totalRunsCompleted: 0,
      totalProblemsAnswered: 0,
      totalCorrect: 0,
      gold: 0,
      ownedSpellIds: ['ember_bolt'],
      equippedDeck: ['ember_bolt', null, null, null, null],
      unlockedClassIds: ['apprentice'],
      selectedClassId: 'apprentice',
      realmStars: {
        goblin_forest: 0,
        crystal_cave: 0,
        dragon_peak: 0,
        astral_void: 0,
        lich_citadel: 0,
      },
      storyChaptersUnlocked: [],
      mastery: {},
      activeRun: null,
      settings: {
        speechVoiceURI: null,
        speechRate: 1.0,
        autoNarrate: true,
        sfxVolume: 0.7,
        muteAll: false,
        reducedMotion: false,
        fontScale: 1.0,
        showSpeedTimer: false,
        allowStretchFacts: true,
        devMode: false,
      },
    };
  }

  const MIGRATIONS = {
    0: function(d) {
      // 0→1: populate missing fields from defaults
      const def = _defaults();
      d.schemaVersion = 1;
      if (!d.mastery) d.mastery = {};
      if (!d.settings) d.settings = Object.assign({}, def.settings);
      if (!d.realmStars) d.realmStars = Object.assign({}, def.realmStars);
      if (!d.ownedSpellIds) d.ownedSpellIds = [...def.ownedSpellIds];
      if (!d.equippedDeck) d.equippedDeck = [...def.equippedDeck];
      if (!d.unlockedClassIds) d.unlockedClassIds = [...def.unlockedClassIds];
      if (d.selectedClassId === undefined) d.selectedClassId = def.selectedClassId;
      if (d.gold === undefined) d.gold = 0;
      if (d.activeRun === undefined) d.activeRun = null;
      if (!d.storyChaptersUnlocked) d.storyChaptersUnlocked = [];
      return d;
    },
  };

  function _migrate(data) {
    let d = data || {};
    let v = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;
    while (v < SCHEMA_VERSION) {
      if (MIGRATIONS[v]) d = MIGRATIONS[v](d);
      v++;
      d.schemaVersion = v;
    }
    return d;
  }

  function _tryParse(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
  }

  function _showSaveError(msg) {
    if (typeof showToast === 'function') showToast(msg, 5000);
    else if (typeof console !== 'undefined') console.warn('[SaveManager]', msg);
  }

  const SaveManager = {
    load() {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      let data = raw ? _tryParse(raw) : null;
      if (!data) {
        const backup = (typeof localStorage !== 'undefined') ? localStorage.getItem(BACKUP_KEY) : null;
        data = backup ? _tryParse(backup) : null;
        if (!data) {
          if (raw) _showSaveError('Save data corrupted. Starting fresh.');
          return _defaults();
        }
        _showSaveError('Recovered from backup save.');
      }
      return _migrate(data);
    },

    save(data) {
      if (typeof localStorage === 'undefined') return;
      data.lastPlayedAt = Date.now();
      const str = JSON.stringify(data);
      try {
        localStorage.setItem(KEY, str);
        _saveCount++;
        if (_saveCount % 5 === 0) localStorage.setItem(BACKUP_KEY, str);
      } catch (e) {
        _showSaveError('Could not save: storage full.');
      }
    },

    reset() {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(KEY);
      localStorage.removeItem(BACKUP_KEY);
      _saveCount = 0;
    },

    export() {
      return JSON.parse(JSON.stringify(this.load()));
    },

    import(snapshot) {
      const d = JSON.parse(JSON.stringify(snapshot));
      this.save(d);
    },

    _defaults,
    _migrate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SaveManager };
  } else {
    global.SaveManager = SaveManager;
  }
})(typeof window !== 'undefined' ? window : globalThis);
