(function(global) {
  'use strict';

  // For innerHTML only — never apply to setAttribute or textContent
  function escHtml(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escHtml };
  } else {
    global.escHtml = escHtml;
  }
})(typeof window !== 'undefined' ? window : globalThis);
