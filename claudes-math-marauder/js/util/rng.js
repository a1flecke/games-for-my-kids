(function(global) {
  'use strict';

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
  }

  // Mulberry32 seeded PRNG — returns a function that produces [0, 1) floats
  function mulberry32(seed) {
    let s = (seed | 0) >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hashString, mulberry32 };
  } else {
    global.hashString = hashString;
    global.mulberry32 = mulberry32;
  }
})(typeof window !== 'undefined' ? window : globalThis);
