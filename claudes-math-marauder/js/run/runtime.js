(function(global) {
  'use strict';

  function _uuid() {
    return 'run-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 0xffff).toString(16);
  }

  function _serializeMapNodes(map) {
    const obj = {};
    map.nodes.forEach(function(n, id) {
      obj[id] = { visited: false, completed: false };
    });
    // Start is implicitly completed — it's the origin.
    obj[map.startId] = { visited: true, completed: true };
    return obj;
  }

  class Runtime {
    constructor() {
      this._realmsData = null;
      this._monstersData = null;
      this._bossesData = null;
      this._eventsData = null;
      this._spellsData = null;
      this._loading = null;
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    async loadData() {
      if (this._realmsData) return;
      if (this._loading) return this._loading;
      this._loading = Promise.all([
        fetch('data/realms.json').then(function(r) { return r.json(); }),
        fetch('data/monsters.json').then(function(r) { return r.json(); }),
        fetch('data/bosses.json').then(function(r) { return r.json(); }),
        fetch('data/events.json').then(function(r) { return r.json(); }),
        fetch('data/spells.json').then(function(r) { return r.json(); }),
      ]).then((results) => {
        this._realmsData   = results[0];
        this._monstersData = results[1];
        this._bossesData   = results[2];
        this._eventsData   = results[3];
        this._spellsData   = results[4];
        this._loading = null;
      });
      return this._loading;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    getRealmById(id) {
      return this._realmsData ? this._realmsData.realms.find(function(r) { return r.id === id; }) : null;
    }

    getMonsterById(id) {
      return this._monstersData ? this._monstersData.monsters.find(function(m) { return m.id === id; }) : null;
    }

    getMonstersForRealm(realm) {
      if (!this._monstersData || !realm) return [];
      const pool = realm.monsterPool || [];
      return pool.map((id) => this.getMonsterById(id)).filter(Boolean);
    }

    getBossById(id) {
      return this._bossesData ? this._bossesData.bosses.find(function(b) { return b.id === id; }) : null;
    }

    getRealmBoss(realm) {
      return realm ? this.getBossById(realm.bossId) : null;
    }

    getEvents() {
      return this._eventsData ? this._eventsData.events : [];
    }

    getSpells() {
      return this._spellsData ? this._spellsData.spells : [];
    }

    getSpellById(id) {
      return this._spellsData ? this._spellsData.spells.find(function(s) { return s.id === id; }) : null;
    }

    // ── Run lifecycle ─────────────────────────────────────────────────────────

    startRun(realm) {
      const seed = (Date.now() ^ Math.floor(Math.random() * 0x80000000)) & 0x7fffffff;
      const map = MapGen.generateMap(seed, realm);
      const data = SaveManager.load();
      data.activeRun = {
        runId: _uuid(),
        realmId: realm.id,
        classId: data.selectedClassId || 'apprentice',
        deck: (data.equippedDeck || []).slice(),
        seed: seed,
        mapNodes: _serializeMapNodes(map),
        currentNodeId: map.startId,
        wizardHpFlavor: 60,
        streak: 0,
        score: 0,
        retries: 0,
        ultimateCharge: 0,
        goldThisRun: 0,
        spellsAddedThisRun: [],
        factsThisRun: [],
        startedAt: Date.now(),
      };
      data.totalRunsStarted = (data.totalRunsStarted || 0) + 1;
      SaveManager.save(data);
      return { run: data.activeRun, map: map };
    }

    // Rebuild map from seed+realmId and overlay visited/completed from save.
    buildMap(activeRun) {
      const realm = this.getRealmById(activeRun.realmId);
      if (!realm) return null;
      const map = MapGen.generateMap(activeRun.seed, realm);
      const saved = activeRun.mapNodes || {};
      map.nodes.forEach(function(n, id) {
        const s = saved[id];
        if (s) { n.visited = s.visited; n.completed = s.completed; }
      });
      return map;
    }

    // Call before entering a node (fight/shop/event/rest).
    advanceTo(nodeId) {
      const data = SaveManager.load();
      if (!data.activeRun) return;
      data.activeRun.currentNodeId = nodeId;
      if (!data.activeRun.mapNodes[nodeId]) data.activeRun.mapNodes[nodeId] = {};
      data.activeRun.mapNodes[nodeId].visited = true;
      SaveManager.save(data);
    }

    // Call after successfully completing a node.
    completeNode(nodeId, outcome) {
      const data = SaveManager.load();
      if (!data.activeRun) return;
      if (!data.activeRun.mapNodes[nodeId]) data.activeRun.mapNodes[nodeId] = {};
      data.activeRun.mapNodes[nodeId].completed = true;
      data.activeRun.currentNodeId = nodeId;

      if (outcome) {
        if (typeof outcome.goldDelta === 'number') {
          data.activeRun.goldThisRun = Math.max(0, (data.activeRun.goldThisRun || 0) + outcome.goldDelta);
        }
        if (outcome.spellId) {
          const run = data.activeRun;
          if (!run.spellsAddedThisRun.includes(outcome.spellId)) {
            run.spellsAddedThisRun.push(outcome.spellId);
          }
          if (!data.ownedSpellIds.includes(outcome.spellId)) {
            data.ownedSpellIds.push(outcome.spellId);
          }
        }
        if (typeof outcome.retries === 'number') {
          data.activeRun.retries = (data.activeRun.retries || 0) + outcome.retries;
        }
        if (typeof outcome.score === 'number') {
          data.activeRun.score = (data.activeRun.score || 0) + outcome.score;
        }
      }
      SaveManager.save(data);
      return data.activeRun;
    }

    // Adjust run gold (events, shop purchases).
    modifyGold(delta) {
      const data = SaveManager.load();
      if (!data.activeRun) return 0;
      data.activeRun.goldThisRun = Math.max(0, (data.activeRun.goldThisRun || 0) + delta);
      SaveManager.save(data);
      return data.activeRun.goldThisRun;
    }

    addSpell(spellId) {
      const data = SaveManager.load();
      if (!data.activeRun) return;
      if (!data.activeRun.spellsAddedThisRun.includes(spellId)) {
        data.activeRun.spellsAddedThisRun.push(spellId);
      }
      if (!data.ownedSpellIds.includes(spellId)) data.ownedSpellIds.push(spellId);
      SaveManager.save(data);
    }

    finishRun(opts) {
      opts = opts || {};
      const data = SaveManager.load();
      if (!data.activeRun) return;
      const run = data.activeRun;

      data.gold = (data.gold || 0) + (run.goldThisRun || 0);

      const retries = run.retries || 0;
      const score = run.score || 0;
      let stars = 1;
      if (retries === 0) stars = 2;
      if (retries === 0 && score >= 1000) stars = 3;

      if (!data.realmStars) data.realmStars = {};
      const prev = data.realmStars[run.realmId] || 0;
      if (stars > prev) data.realmStars[run.realmId] = stars;

      data.totalRunsCompleted = (data.totalRunsCompleted || 0) + 1;
      data.activeRun = null;
      SaveManager.save(data);

      return { stars: stars, gold: run.goldThisRun || 0 };
    }

    abandonRun() {
      const data = SaveManager.load();
      data.activeRun = null;
      SaveManager.save(data);
    }

    resume() {
      return SaveManager.load().activeRun || null;
    }
  }

  global.Runtime = Runtime;
})(typeof window !== 'undefined' ? window : globalThis);
