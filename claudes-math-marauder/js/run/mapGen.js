(function(global) {
  'use strict';

  // Build a deterministic branching map from (seed, realm).
  // Returns { nodes: Map(id -> nodeRecord), startId, bossId, columns: [[ids], [ids], ...] }
  // Node record: { id, kind, column, row, edgesOut: [ids], visited: false, completed: false }
  function generateMap(seed, realm) {
    const rng = _mulberry32(seed);

    const counts = Object.assign({}, realm.nodeCounts);
    const pool = [];
    Object.entries(counts).forEach(function(entry) {
      const kind = entry[0], n = entry[1];
      for (let i = 0; i < n; i++) pool.push(kind);
    });

    // Fisher-Yates with seeded rng
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }

    // 4 middle columns + start + boss
    const layout = _layoutForRealm(pool.length);
    const columns = [];
    columns.push(['start']);
    let idCounter = 1;
    const poolCopy = pool.slice();
    layout.forEach(function(size) {
      const col = [];
      for (let i = 0; i < size; i++) {
        const kind = poolCopy.shift();
        col.push('n' + idCounter + ':' + kind);
        idCounter++;
      }
      columns.push(col);
    });
    columns.push(['boss']);

    // Build nodes Map
    const nodes = new Map();
    columns.forEach(function(col, ci) {
      col.forEach(function(rawId, ri) {
        const kind = rawId === 'start' ? 'start' : rawId === 'boss' ? 'boss' : rawId.split(':')[1];
        nodes.set(rawId, {
          id: rawId, kind: kind, column: ci, row: ri,
          edgesOut: [], visited: false, completed: false,
        });
      });
    });

    // Connect each column to the next
    for (let ci = 0; ci < columns.length - 1; ci++) {
      _connectColumns(columns[ci], columns[ci + 1], nodes, rng);
    }

    return {
      nodes: nodes,
      startId: 'start',
      bossId: 'boss',
      columns: columns.map(function(c) { return c.slice(); }),
    };
  }

  // Split poolSize across 4 columns; remainder goes to earlier middle columns.
  function _layoutForRealm(poolSize) {
    const nCols = 4;
    const base = Math.floor(poolSize / nCols);
    const extra = poolSize - base * nCols;
    const sizes = [];
    for (let i = 0; i < nCols; i++) sizes.push(base);
    for (let i = 0; i < extra; i++) sizes[i + 1 < nCols ? i + 1 : i] += 1;
    return sizes;
  }

  function _connectColumns(fromCol, toCol, nodes, rng) {
    // Each fromNode connects to 1-2 toNodes within row ±1.
    fromCol.forEach(function(fromId, fromRow) {
      const candidates = toCol.filter(function(_, toRow) {
        return Math.abs(toRow - fromRow) <= 1;
      });
      const nEdges = candidates.length === 1 ? 1 : (rng() < 0.5 ? 1 : 2);
      const picks = _pickN(candidates, Math.min(nEdges, candidates.length), rng);
      picks.forEach(function(toId) {
        const fn = nodes.get(fromId);
        if (!fn.edgesOut.includes(toId)) fn.edgesOut.push(toId);
      });
    });

    // Ensure every toNode has at least one incoming edge.
    toCol.forEach(function(toId, toRow) {
      const hasIncoming = fromCol.some(function(fromId) {
        return nodes.get(fromId).edgesOut.includes(toId);
      });
      if (!hasIncoming) {
        let bestFrom = fromCol[0];
        let bestDiff = Infinity;
        fromCol.forEach(function(fromId, fromRow) {
          const d = Math.abs(toRow - fromRow);
          if (d < bestDiff) { bestDiff = d; bestFrom = fromId; }
        });
        nodes.get(bestFrom).edgesOut.push(toId);
      }
    });
  }

  function _pickN(arr, n, rng) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy.slice(0, n);
  }

  // Standalone mulberry32 so mapGen works in Node tests without loading rng.js.
  function _mulberry32(seed) {
    let s = (seed | 0) >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    };
  }

  // BFS reachability check (used by tests + runtime to verify map integrity).
  function bfsReachable(map, fromId) {
    const seen = new Set([fromId]);
    const queue = [fromId];
    while (queue.length) {
      const id = queue.shift();
      const n = map.nodes.get(id);
      if (!n) continue;
      for (let i = 0; i < n.edgesOut.length; i++) {
        const next = n.edgesOut[i];
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return seen;
  }

  const exp = { generateMap: generateMap, bfsReachable: bfsReachable };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.MapGen = exp;
})(typeof window !== 'undefined' ? window : globalThis);
