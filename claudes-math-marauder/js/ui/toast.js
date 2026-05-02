(function(global) {
  'use strict';

  function showToast(msg, ms) {
    const duration = typeof ms === 'number' ? ms : 3000;
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function() { if (el.isConnected) el.remove(); }, duration);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast };
  } else {
    global.showToast = showToast;
  }
})(typeof window !== 'undefined' ? window : globalThis);
