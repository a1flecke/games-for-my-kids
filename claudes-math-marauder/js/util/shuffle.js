(function(global) {
  'use strict';

  function shuffleInPlace(arr, rng) {
    const random = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shuffleInPlace };
  } else {
    global.shuffleInPlace = shuffleInPlace;
  }
})(typeof window !== 'undefined' ? window : globalThis);
