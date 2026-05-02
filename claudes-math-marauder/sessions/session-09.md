# Session 9 — Run Map: Branching Graph + Resume
**Model:** Opus | **Focus:** Deterministic Slay-the-Spire-style branching map; map screen UI; mid-run auto-save; resume on reload. **Realm 1 fully playable end-to-end after this session.**

## Pre-flight

1. Read spec sections 2.3 (run length & shape), 6.4 (run state).
2. Read this plan's mapGen section.
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/run/mapGen.js` — pure-logic deterministic map generator
- `claudes-math-marauder/js/run/runtime.js` — run lifecycle (start, advance, save, abandon, resume)
- `claudes-math-marauder/js/run/mapScreen.js` — DOM/canvas map screen UI
- `claudes-math-marauder/js/run/events.js` — Mystery event resolver (Realm 1's 5 events)
- `claudes-math-marauder/js/run/shop.js` — Spell-shop offering generator + UI
- `claudes-math-marauder/scripts/test-map-gen.js`

## Files to modify

- `claudes-math-marauder/js/game.js` — wire RUN_MAP / FIGHT / RESULTS state transitions; on init, if `save.activeRun` is set, resume into RUN_MAP at that node

## Deliverables

### 1. `run/mapGen.js` — Pure-logic map generation

```js
(function(global) {
  'use strict';

  // Build a deterministic branching map from (seed, realm).
  // Returns { nodes: Map(id -> nodeRecord), startId, bossId, columns: [[ids], [ids], ...] }
  // Node record: { id, kind, column, row, x, y, edgesOut: [ids], visited, completed }
  function generateMap(seed, realm) {
    const rng = _mulberry32(seed);

    // Node-type composition — drawn from realm.nodeCounts
    const counts = { ...realm.nodeCounts };
    // Build a multiset of node kinds (excluding boss + start)
    const pool = [];
    Object.entries(counts).forEach(([kind, n]) => { for (let i = 0; i < n; i++) pool.push(kind); });
    // Shuffle pool (Fisher-Yates with seeded rng)
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const total = pool.length;     // should be 9 (5+1+1+1+1) for Realm 1, leaves 11 with start+boss

    // Lay out columns: 4 columns of 2-3 nodes each + final boss column with 1 node
    // Constraint: total in middle columns = pool.length
    // Strategy: 4 columns, sizes [2, 3, 2, 2] = 9 (matches Realm 1); pull from pool in order
    const layout = _layoutForRealm(realm, pool.length);  // returns array of column sizes
    const columns = [];
    columns.push(['start']);                              // col 0
    let idCounter = 1;
    layout.forEach((size, ci) => {
      const col = [];
      for (let i = 0; i < size; i++) {
        const kind = pool.shift();
        col.push(`n${idCounter++}:${kind}`);
      }
      columns.push(col);
    });
    columns.push(['boss']);

    // Build nodes Map
    const nodes = new Map();
    columns.forEach((col, ci) => {
      col.forEach((id, ri) => {
        const kind = id === 'start' ? 'start' : id === 'boss' ? 'boss' : id.split(':')[1];
        nodes.set(id, { id, kind, column: ci, row: ri, x: ci, y: ri, edgesOut: [], visited: false, completed: false });
      });
    });

    // Connect each node in column ci to 1-2 nodes in column ci+1
    // Constraints:
    //   - Every node in ci has at least 1 outgoing edge
    //   - Every node in ci+1 has at least 1 incoming edge
    //   - Edges don't cross (ri sorted: a node at row r in ci can connect to rows in [r-1, r, r+1] of ci+1, clamped)
    for (let ci = 0; ci < columns.length - 1; ci++) {
      const fromCol = columns[ci];
      const toCol = columns[ci + 1];
      _connectColumns(fromCol, toCol, nodes, rng);
    }

    return {
      nodes, startId: 'start', bossId: 'boss',
      columns: columns.map(c => c.slice())
    };
  }

  function _layoutForRealm(realm, poolSize) {
    // For Realm 1 with poolSize=9, return [2,3,2,2].
    // For other realms, compute a balanced 4-column layout: split poolSize across 4 columns evenly with remainder spread to middle.
    const nCols = 4;
    const base = Math.floor(poolSize / nCols);
    const extra = poolSize - base * nCols;   // distribute these to col indices [1, 2, 3, ...]
    const sizes = Array(nCols).fill(base);
    for (let i = 0; i < extra; i++) sizes[i + 1 < nCols ? i + 1 : i] += 1;
    return sizes;
  }

  function _connectColumns(fromCol, toCol, nodes, rng) {
    // Greedy: each fromNode connects to 1-2 toNodes within row ±1.
    // Then sweep toCol — any toNode with no incoming, connect from the closest fromNode.
    fromCol.forEach((fromId, fromRow) => {
      const candidates = toCol.filter((_, toRow) => Math.abs(toRow - fromRow) <= 1);
      // Connect to 1 or 2 candidates randomly
      const nEdges = candidates.length === 1 ? 1 : (rng() < 0.5 ? 1 : 2);
      const picks = _pickN(candidates, Math.min(nEdges, candidates.length), rng);
      picks.forEach(toId => {
        const fn = nodes.get(fromId);
        if (!fn.edgesOut.includes(toId)) fn.edgesOut.push(toId);
      });
    });
    // Ensure every toNode has incoming
    toCol.forEach((toId, toRow) => {
      const hasIncoming = fromCol.some(fromId => nodes.get(fromId).edgesOut.includes(toId));
      if (!hasIncoming) {
        // Find closest fromNode by row and link
        let bestFrom = fromCol[0]; let bestDiff = Infinity;
        fromCol.forEach((fromId, fromRow) => { const d = Math.abs(toRow - fromRow); if (d < bestDiff) { bestDiff = d; bestFrom = fromId; } });
        nodes.get(bestFrom).edgesOut.push(toId);
      }
    });
  }

  function _pickN(arr, n, rng) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy.slice(0, n);
  }

  function _mulberry32(seed) {
    let s = seed | 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
    };
  }

  // BFS reachability check (used by tests + at runtime to verify no orphan nodes)
  function bfsReachable(map, fromId) {
    const seen = new Set([fromId]);
    const queue = [fromId];
    while (queue.length) {
      const id = queue.shift();
      const n = map.nodes.get(id);
      if (!n) continue;
      for (const next of n.edgesOut) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return seen;
  }

  const exp = { generateMap, bfsReachable };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.MapGen = exp;
})(typeof window !== 'undefined' ? window : globalThis);
```

### 2. `scripts/test-map-gen.js`

```js
const MG = require('../js/run/mapGen.js');
const assert = require('assert');
let p=0,f=0; function it(n,fn){try{fn();console.log('PASS',n);p++}catch(e){console.error('FAIL',n,e.message);f++}}

const realm1 = { nodeCounts: { combat: 5, elite: 1, spellshop: 1, mystery: 1, rest: 1 } };

it('every map has exactly one start and one boss', () => {
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    let starts = 0, bosses = 0;
    m.nodes.forEach(n => { if (n.kind === 'start') starts++; if (n.kind === 'boss') bosses++; });
    assert.strictEqual(starts, 1);
    assert.strictEqual(bosses, 1);
  }
});

it('all nodes reachable from start (BFS)', () => {
  for (let s = 1; s <= 100; s++) {
    const m = MG.generateMap(s, realm1);
    const reached = MG.bfsReachable(m, m.startId);
    assert.strictEqual(reached.size, m.nodes.size, `seed ${s}: reached ${reached.size} / total ${m.nodes.size}`);
  }
});

it('boss reachable via every leaf path (no orphan branches)', () => {
  // Every node must have at least one path to boss.
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    m.nodes.forEach((n, id) => {
      const reached = MG.bfsReachable(m, id);
      assert.ok(reached.has(m.bossId), `seed ${s}: ${id} cannot reach boss`);
    });
  }
});

it('total node count is 11 for Realm 1 (start + 9 middle + boss)', () => {
  for (let s = 1; s <= 50; s++) {
    const m = MG.generateMap(s, realm1);
    assert.strictEqual(m.nodes.size, 11);
  }
});

it('determinism: same (seed, realm) produces identical map', () => {
  const a = MG.generateMap(42, realm1);
  const b = MG.generateMap(42, realm1);
  // Compare adjacency lists
  const sigA = JSON.stringify([...a.nodes.entries()].sort().map(([id, n]) => [id, n.edgesOut.slice().sort()]));
  const sigB = JSON.stringify([...b.nodes.entries()].sort().map(([id, n]) => [id, n.edgesOut.slice().sort()]));
  assert.strictEqual(sigA, sigB);
});

it('different seeds produce different maps', () => {
  const a = MG.generateMap(1, realm1);
  const b = MG.generateMap(2, realm1);
  const sigA = JSON.stringify([...a.nodes.entries()].sort().map(([id, n]) => [id, n.edgesOut.slice().sort()]));
  const sigB = JSON.stringify([...b.nodes.entries()].sort().map(([id, n]) => [id, n.edgesOut.slice().sort()]));
  assert.notStrictEqual(sigA, sigB);
});

console.log(`\n${p} passed, ${f} failed`);
process.exit(f>0?1:0);
```

### 3. `run/runtime.js` — Run lifecycle

```js
class Runtime {
  startRun(realm, classData) {
    const seed = Date.now() & 0x7fffffff;       // simple seed; could be UUID-derived
    const map = MapGen.generateMap(seed, realm);
    const data = SaveManager.load();
    data.activeRun = {
      runId: _uuid(),
      realmId: realm.id,
      classId: classData.id,
      deck: data.equippedDeck.slice(),
      seed,
      mapNodes: _serializeMap(map),
      currentNodeId: map.startId,
      wizardHpFlavor: 60,
      streak: 0,
      score: 0,
      retries: 0,
      ultimateCharge: 0,
      goldThisRun: 0,
      spellsAddedThisRun: [],
      factsThisRun: [],
      startedAt: Date.now()
    };
    data.totalRunsStarted++;
    SaveManager.save(data);
    return data.activeRun;
  }

  advanceTo(nodeId) { /* update activeRun.currentNodeId + mark visited; SaveManager.save() */ }
  resolveNode(outcome) { /* apply outcome to activeRun (gold delta, spell unlock, etc.); save */ }
  finishRun({ outcome, stars, score }) { /* write realmStars, increment totalRunsCompleted, clear activeRun, save */ }
  abandonRun() { /* clear activeRun without star/completed credit; save */ }
  resume() { /* return SaveManager.load().activeRun (may be null) */ }
}
```

### 4. `run/mapScreen.js` — Map screen UI

DOM-based (faster than canvas for static UI; accessible).

- A grid layout of node buttons. Columns positioned via CSS grid. Edges drawn as inline SVG lines beneath the buttons.
- Each node is a `<button>` with:
  - Icon emoji (⚔️ 👹 🛒 🔮 💤 👑) + label
  - `aria-label="Combat node, row 2"` updated dynamically as state changes
  - Disabled (`<button disabled>`) for nodes not reachable from `currentNodeId` (via BFS using only outgoing edges from currently-visited)
  - `.locked` class for visual treatment in addition to native `disabled`
  - `.completed` class for already-cleared nodes
- The currently selectable nodes (next column from current) get a `.glow` class with subtle pulsing animation
- Click → `runtime.advanceTo(nodeId)` then transition to FIGHT / SHOP / MYSTERY / REST overlay

**SVG edges:** Generated once per map from `nodes` adjacency list. Edges from completed nodes have a different color to show progress.

### 5. `run/events.js` — Mystery event resolver

Read from `data/events.json`. On entering a Mystery node:
1. Open a modal dialog (focus trap + Escape + focus return)
2. Show event prompt + 🔊 button (auto-narrated if setting on)
3. Show 2-3 choice buttons; on click, apply outcomes
4. Outcome kinds:
   - `gold`: `runtime.modifyGold(delta)`
   - `heal`: not used in B3 (no real HP); flavor only
   - `damage`: flavor wizard HP only
   - `spell`: pick a random spell of the given rarity from `data/spells.json` excluding owned; add to `ownedSpellIds` and `spellsAddedThisRun`
   - `streak_bonus`: extend streak counter
   - `class_unlock`: unused in events, reserved
5. Display outcome text (also narrated), then close the modal and continue to next column

### 6. `run/shop.js` — Spell shop offerings

When entering a Spellshop node, generate 3 random offerings:
- Use the run's `seed` mixed with `nodeId` as a sub-seed for determinism
- Offerings: 1 random common (~40% odds), 1 random common-or-rare, 1 random rare-or-epic
- Filter out spells the player already owns
- Each offering shows: name, rarity badge, cost (rarity-tiered), modifier summary, 🔊 button for narration
- Two buttons: "Buy" (disabled if `gold < cost`), "Skip" (always enabled)
- On Buy: `gold -= cost`, `ownedSpellIds.push(spellId)`, save, close modal, advance

### 7. `game.js` integration

- On init: check `save.activeRun`; if non-null, transition to RUN_MAP and restore from `mapNodes` + `currentNodeId`
- On entering RUN_MAP: build map from `seed + realmId` (deterministic) and overlay `visited`/`completed` from `activeRun.mapNodes`
- On selecting a node: dispatch to FIGHT (combat/elite/boss) or open the appropriate overlay (shop/mystery/rest)
- On FIGHT victory: increment `goldThisRun` (random 5–15 gold), call `runtime.advanceTo(nextNode)`, return to RUN_MAP
- On reaching BOSS node and winning: open RESULTS card → `finishRun()` → return to HUB

### 8. Resume contract

- Auto-save fires after every node advance and every modal-close
- On reload, the player resumes at exactly the node they left from, with all run-scoped state intact (gold, streak, retries, ultimate charge, deck additions, mastery deltas)
- "Quit run" button on the map screen calls `abandonRun()` and returns to HUB; the run is irrevocably abandoned (no resume from arbitrary point)

## Tests to run

```bash
node claudes-math-marauder/scripts/test-map-gen.js
```

Plus all existing Layer-1 tests must still pass.

Manual playtest of Realm 1 end-to-end:

- [ ] Start a run from HUB
- [ ] Map renders with 11 nodes, start glowing, all others locked
- [ ] Click first available node → fight launches, win → return to map, current node moves forward
- [ ] All node kinds tested: combat, elite, spellshop, mystery, rest
- [ ] Reaching boss node launches Goblin Warlord boss fight
- [ ] On boss victory, RESULTS card shown (placeholder OK — Session 12 fleshes it out)
- [ ] On reload mid-run, the run resumes at the exact same node with all state preserved
- [ ] On "Quit run", run is abandoned cleanly; HUB reflects no active run

## Acceptance checklist

- [ ] `mapGen.js` is pure (no DOM / canvas / audio imports); UMD-exported for Node tests
- [ ] All 6 map-gen tests pass
- [ ] `test-map-gen.js` part of standard Layer-1 test runs
- [ ] Resume works after browser close
- [ ] Map nodes use native `<button disabled>` for locked (CLAUDE.md ARIA rule)
- [ ] Edges drawn via inline SVG (works with screen readers; visual)
- [ ] No `style.display` in JS; visibility via classes
- [ ] Mystery / Shop overlays follow modal accessibility contract (focus trap + Escape + focus return)
- [ ] Run advance / save uses `runtime.advanceTo()` — never direct `SaveManager.save()` from event handlers
- [ ] Realm 1 fully playable from HUB → run → boss → results → HUB

## Session end

1. Re-run all Layer-1 tests including the new map-gen tests
2. Manual playtest: complete at least 2 full runs of Realm 1 (one with 0 retries, one with 2+ retries) to verify mastery deltas and run-state persistence
3. Run `marauder-web-review` agent
4. Commit `Session 9: run map — branching graph, mid-run save, resume, Realm 1 playable`
5. Push to `main`
