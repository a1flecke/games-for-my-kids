(function(global) {
  'use strict';

  const BOX_WEIGHT = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
  const SHAKY_MULTIPLIER = 2.5;
  const RECENCY_WINDOW = 5;
  const RECENCY_DAMPING = 0.3;
  const MASTERED_BOX = 4;
  const MASTERED_MIN_CORRECT = 6;

  function getOrCreate(masteryMap, key) {
    if (!masteryMap[key]) {
      masteryMap[key] = {
        box: 1, lastSeenAt: 0, totalAsked: 0,
        totalCorrect: 0, avgMs: 0, streak: 0, shaky: false,
      };
    }
    return masteryMap[key];
  }

  function isMastered(stat) {
    return !!(stat && stat.box >= MASTERED_BOX && stat.totalCorrect >= MASTERED_MIN_CORRECT);
  }

  // Update Leitner state for one resolved problem.
  // masteredAvgMs: average answer-time across currently-mastered facts, or null if none yet.
  function recordResolve(masteryMap, key, ctx) {
    const correct = ctx.correct;
    const timeMs = ctx.timeMs;
    const now = ctx.now;
    const masteredAvgMs = ctx.masteredAvgMs;

    const s = getOrCreate(masteryMap, key);
    s.totalAsked++;
    s.lastSeenAt = now;

    if (correct) {
      s.totalCorrect++;
      s.streak++;
      // Fast = under 2× the mastered average (fall back to 6 s if no baseline)
      const fastThreshold = (masteredAvgMs != null ? masteredAvgMs : 6000) * 2;
      if (timeMs < fastThreshold) s.box = Math.min(5, s.box + 1);
      s.avgMs = s.avgMs === 0 ? timeMs : Math.round(s.avgMs * 0.7 + timeMs * 0.3);
    } else {
      s.streak = 0;
      s.box = Math.max(1, s.box - 2);
      s.shaky = true;
    }

    // Shake clears after 3 consecutive correct
    if (correct && s.streak >= 3) s.shaky = false;

    return s;
  }

  // Average answer-time across all currently-mastered facts; null if none mastered yet.
  function masteredAvgMs(masteryMap) {
    const stats = Object.values(masteryMap).filter(isMastered);
    if (stats.length === 0) return null;
    const sum = stats.reduce(function(acc, s) { return acc + (s.avgMs || 0); }, 0);
    return Math.round(sum / stats.length);
  }

  // Per-fact selection weight. key and recentKeys must both be provided for recency damping.
  function pullWeight(key, stat, recentKeys) {
    const box = stat ? stat.box : 1;
    const w = BOX_WEIGHT[box] !== undefined ? BOX_WEIGHT[box] : 1;
    const sh = stat && stat.shaky ? SHAKY_MULTIPLIER : 1.0;
    const rd = recentKeys && recentKeys.includes(key) ? RECENCY_DAMPING : 1.0;
    return w * sh * rd;
  }

  const exp = {
    recordResolve, isMastered, masteredAvgMs, pullWeight, getOrCreate,
    BOX_WEIGHT, MASTERED_BOX, MASTERED_MIN_CORRECT, SHAKY_MULTIPLIER,
    RECENCY_DAMPING, RECENCY_WINDOW,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.Mastery = exp;
})(typeof window !== 'undefined' ? window : globalThis);
