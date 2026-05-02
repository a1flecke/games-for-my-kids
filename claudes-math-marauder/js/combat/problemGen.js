(function(global) {
  'use strict';

  var FK = (typeof require !== 'undefined') ? require('./factKeys.js') : global.FactKeys;
  var M  = (typeof require !== 'undefined') ? require('./mastery.js')  : global.Mastery;

  // Build the eligible fact-key pool for a realm.
  // For each enabled family x_n (weight > 0), includes:
  //   mul: n×0, n×1, ..., n×12
  //   div: (n*k)÷n for k=1..12  (canonical "how many n's in n*k" form)
  function buildEligibleKeys(factFamilyWeights) {
    var out = [];
    Object.entries(factFamilyWeights).forEach(function(entry) {
      var fam = entry[0], w = entry[1];
      if (w <= 0) return;
      var n = +fam.slice(1);
      // Multiplication facts
      for (var k = 0; k <= 12; k++) out.push(FK.mulKey(n, k));
      // Division facts: (n*k) ÷ n = k for k=1..12
      for (var j = 1; j <= 12; j++) {
        var dividend = n * j;
        if (dividend === 0) continue;  // skip 0÷anything
        out.push(FK.divKey(dividend, n));
      }
    });
    // Dedupe — commutative mul pairs and repeated div facts from overlapping families
    return Array.from(new Set(out));
  }

  // Select one problem for the current fight turn.
  // realm: { factFamilyWeights }
  // masteryMap: save.mastery object (read-only here; mutation happens in fight.js after resolve)
  // recentKeys: array (newest-last) of last RECENCY_WINDOW keys answered this session
  // rng: run-seeded PRNG
  // mulRatio: 0..1, fraction of problems that are multiplication (default 0.7)
  // allowStretch: bool
  // realmTier: 1..5
  function selectProblem(opts) {
    var realm = opts.realm;
    var masteryMap = opts.masteryMap;
    var recentKeys = opts.recentKeys;
    var rng = opts.rng;
    var mulRatio = opts.mulRatio != null ? opts.mulRatio : 0.7;
    var allowStretch = opts.allowStretch;
    var realmTier = opts.realmTier || 1;

    // Stretch check: probability grows with realm tier
    var stretchProb = 0.10 + 0.02 * (realmTier - 1);
    if (allowStretch && rng() < stretchProb) {
      var stretch = _selectStretch({ masteryMap: masteryMap, rng: rng });
      if (stretch) return stretch;
    }

    var eligible = buildEligibleKeys(realm.factFamilyWeights);
    if (eligible.length === 0) return null;

    // Compute per-key weight using Leitner box + shaky + recency
    var weights = eligible.map(function(k) {
      return M.pullWeight(k, masteryMap[k], recentKeys);
    });

    // Split by kind according to mulRatio
    var isMul = rng() < mulRatio;
    var kindIndices = [];
    var kindWeights = [];
    eligible.forEach(function(k, i) {
      var isMulKey = k.startsWith('mul:') || k.startsWith('stretch:mul:');
      if (isMul === isMulKey) { kindIndices.push(i); kindWeights.push(weights[i]); }
    });

    // Fallback: if no keys of the desired kind, use the other
    if (kindIndices.length === 0) {
      eligible.forEach(function(k, i) { kindIndices.push(i); kindWeights.push(weights[i]); });
    }

    var idx = _weightedPick(kindIndices, kindWeights, rng);
    return _materialize(eligible[idx]);
  }

  function _materialize(key) {
    if (!key) return null;
    var f = FK.parseFactKey(key);
    if (!f) return null;
    if (f.kind === 'mul') {
      return {
        kind: 'mul', a: f.a, b: f.b,
        answer: f.a * f.b,
        displayText: f.a + ' × ' + f.b + ' = ?',
        factKey: key, isStretch: false,
      };
    } else {
      return {
        kind: 'div', a: f.dividend, b: f.divisor,
        answer: f.dividend / f.divisor,
        displayText: f.dividend + ' ÷ ' + f.divisor + ' = ?',
        factKey: key, isStretch: false,
      };
    }
  }

  // Stretch facts: only from x2, x5, x10 families when ≥4 facts in that family are mastered
  function _selectStretch(opts) {
    var masteryMap = opts.masteryMap;
    var rng = opts.rng;
    var families = ['x2', 'x5', 'x10'];
    var ranges = { x2: [13, 50], x5: [13, 30], x10: [13, 30] };

    var eligible = families.filter(function(fam) {
      var n = +fam.slice(1);
      var mastered = 0;
      for (var k = 0; k <= 12; k++) {
        if (M.isMastered(masteryMap[FK.mulKey(n, k)])) mastered++;
      }
      return mastered >= 4;
    });

    if (eligible.length === 0) return null;

    var fam = eligible[Math.floor(rng() * eligible.length)];
    var n = +fam.slice(1);
    var range = ranges[fam];
    var lo = range[0], hi = range[1];
    var N = lo + Math.floor(rng() * (hi - lo + 1));
    var isMul = rng() < 0.6;

    if (isMul) {
      return {
        kind: 'mul', a: n, b: N,
        answer: n * N,
        displayText: n + ' × ' + N + ' = ?',
        factKey: 'stretch:mul:' + n + 'x' + N,
        isStretch: true,
      };
    } else {
      var dividend = n * N;
      return {
        kind: 'div', a: dividend, b: n,
        answer: N,
        displayText: dividend + ' ÷ ' + n + ' = ?',
        factKey: 'stretch:div:' + dividend + '/' + n,
        isStretch: true,
      };
    }
  }

  function _weightedPick(items, weights, rng) {
    if (items.length === 0) return undefined;
    var total = weights.reduce(function(a, b) { return a + b; }, 0);
    if (total === 0) return items[Math.floor(rng() * items.length)];
    var r = rng() * total;
    for (var i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  var exp = { selectProblem, buildEligibleKeys, _selectStretch, _materialize, _weightedPick };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.ProblemGen = exp;
})(typeof window !== 'undefined' ? window : globalThis);
