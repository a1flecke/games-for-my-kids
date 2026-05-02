(function(global) {
  'use strict';

  // Canonical key: always smaller×larger so 7×8 and 8×7 collapse to the same key
  function mulKey(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return 'mul:' + lo + 'x' + hi;
  }

  // Division key: larger/smaller so divKey(56,7) === divKey(7,56) === "div:56/7"
  function divKey(dividend, divisor) {
    const hi = Math.max(dividend, divisor);
    const lo = Math.min(dividend, divisor);
    return 'div:' + hi + '/' + lo;
  }

  function parseFactKey(key) {
    const m = /^mul:(\d+)x(\d+)$/.exec(key);
    if (m) return { kind: 'mul', a: +m[1], b: +m[2] };
    const d = /^div:(\d+)\/(\d+)$/.exec(key);
    if (d) return { kind: 'div', dividend: +d[1], divisor: +d[2] };
    return null;
  }

  // Returns the canonical family string for a key, e.g. "mul:7x8" → "x7"
  function familyOf(key) {
    const f = parseFactKey(key);
    if (!f) return null;
    if (f.kind === 'mul') return 'x' + Math.min(f.a, f.b);
    return 'x' + f.divisor;
  }

  const exp = { mulKey, divKey, parseFactKey, familyOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.FactKeys = exp;
})(typeof window !== 'undefined' ? window : globalThis);
