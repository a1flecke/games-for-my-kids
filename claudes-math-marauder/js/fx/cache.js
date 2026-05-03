(function(global) {
  'use strict';

  class FxCache {
    constructor(maxCanvases) {
      this.max = maxCanvases === undefined ? 30 : maxCanvases;
      this._map = new Map();
      this._lru = []; // head = LRU, tail = MRU
    }

    get(key) {
      if (!this._map.has(key)) return null;
      this._bumpLru(key);
      return this._map.get(key);
    }

    build(key, w, h, drawFn) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      drawFn(canvas.getContext('2d'), w, h);
      this._map.set(key, canvas);
      this._bumpLru(key);
      this._evictIfNeeded();
      return canvas;
    }

    invalidate(key) {
      if (!this._map.has(key)) return;
      this._map.delete(key);
      const idx = this._lru.indexOf(key);
      if (idx !== -1) this._lru.splice(idx, 1);
    }

    size() { return this._map.size; }

    _bumpLru(key) {
      const idx = this._lru.indexOf(key);
      if (idx !== -1) this._lru.splice(idx, 1);
      this._lru.push(key);
    }

    _evictIfNeeded() {
      while (this._map.size > this.max) {
        const oldest = this._lru.shift();
        this._map.delete(oldest);
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FxCache };
  } else {
    global.FxCache = FxCache;
  }
})(typeof window !== 'undefined' ? window : globalThis);
