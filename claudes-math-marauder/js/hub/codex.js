(function(global) {
  'use strict';

  // Box thresholds match mastery.js spaced-repetition model
  const BOX_MASTERED = 4;
  const CORRECT_MASTERED = 6;

  class Codex {
    constructor() {
      this._overlay = null;
      this._focusReturnTo = null;
      this._keyHandler = null;
      this._drillActive = false;
    }

    open(triggerEl) {
      this._focusReturnTo = triggerEl || null;
      this._ensureOverlay();
      this._renderOverlay();
      this._overlay.classList.add('open');
      this._overlay.setAttribute('aria-hidden', 'false');
      const closeBtn = this._overlay.querySelector('.hub-overlay-close');
      if (closeBtn) closeBtn.focus();
      this._bindKeys();
    }

    cancel() {
      this._unbindKeys();
      this._drillActive = false;
      if (this._overlay) {
        this._overlay.classList.remove('open');
        this._overlay.setAttribute('aria-hidden', 'true');
        if (this._focusReturnTo) this._focusReturnTo.focus();
        this._focusReturnTo = null;
      }
    }

    // Called by game.js after a codex drill completes — re-opens with fresh data
    onDrillComplete() {
      this._drillActive = false;
      this._renderOverlay();
      this._overlay.classList.add('open');
      this._overlay.setAttribute('aria-hidden', 'false');
      const closeBtn = this._overlay.querySelector('.hub-overlay-close');
      if (closeBtn) closeBtn.focus();
      this._bindKeys();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    _ensureOverlay() {
      if (this._overlay) return;
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.setAttribute('aria-hidden', 'true');
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Codex — mastery heatmap');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    _renderOverlay() {
      const data = SaveManager.load();
      const mastery = data.mastery || {};

      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel codex-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close codex');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Codex';
      panel.appendChild(title);

      const mastered = this._countMastered(mastery);
      const sub = document.createElement('p');
      sub.className = 'hub-overlay-subtitle';
      sub.textContent = mastered + ' / 169 mastered. Tap a cell to drill that fact.';
      panel.appendChild(sub);

      // Legend
      const legend = document.createElement('div');
      legend.className = 'codex-legend';
      legend.setAttribute('role', 'group');
      legend.setAttribute('aria-label', 'Color legend');
      [
        { cls: 'new',        label: 'New' },
        { cls: 'learning',   label: 'Learning' },
        { cls: 'practicing', label: 'Practicing' },
        { cls: 'mastered',   label: 'Mastered ★' },
      ].forEach(function(item) {
        const swatch = document.createElement('span');
        swatch.className = 'codex-legend-item';
        const dot = document.createElement('span');
        dot.className = 'codex-legend-swatch ' + item.cls;
        swatch.appendChild(dot);
        const lbl = document.createElement('span');
        lbl.textContent = item.label;
        swatch.appendChild(lbl);
        legend.appendChild(swatch);
      });
      panel.appendChild(legend);

      // 13×13 heatmap grid — rows = a (0..12), cols = b (0..12)
      // Use roving tabindex: only one cell is tabbable; arrow keys move between cells.
      const grid = document.createElement('div');
      grid.className = 'codex-grid';
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-label', 'Multiplication table 0 to 12');

      this._cells = [];  // 13×13 grid of cell button elements
      for (let a = 0; a <= 12; a++) {
        const row = [];
        const rowEl = document.createElement('div');
        rowEl.setAttribute('role', 'row');
        rowEl.className = 'codex-grid-row';
        for (let b = 0; b <= 12; b++) {
          const cell = this._makeCell(a, b, mastery);
          // Only the very first cell is tabbable; rest enter via arrow keys
          cell.setAttribute('tabindex', (a === 0 && b === 0) ? '0' : '-1');
          rowEl.appendChild(cell);
          row.push(cell);
        }
        grid.appendChild(rowEl);
        this._cells.push(row);
      }

      panel.appendChild(grid);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _makeCell(a, b, mastery) {
      const key = Math.min(a, b) + 'x' + Math.max(a, b);
      const cell = mastery[key] || { box: 0, totalCorrect: 0 };
      const state = this._cellState(cell);
      const product = a * b;

      let ariaLabel = a + ' times ' + b + ' equals ' + product + '.';
      if (state === 'mastered')   ariaLabel += ' Mastered.';
      else if (state === 'practicing') ariaLabel += ' Practicing.';
      else if (state === 'learning')   ariaLabel += ' Learning.';
      else                              ariaLabel += ' Not yet started.';
      ariaLabel += ' Tap to drill.';

      const btn = document.createElement('button');
      btn.className = 'codex-cell ' + state;
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', ariaLabel);
      btn.dataset.a = String(a);
      btn.dataset.b = String(b);

      const lbl = document.createElement('span');
      lbl.className = 'codex-cell-label';
      lbl.setAttribute('aria-hidden', 'true');
      lbl.textContent = a + '×' + b;
      btn.appendChild(lbl);

      if (state === 'mastered') {
        const star = document.createElement('span');
        star.className = 'codex-cell-star';
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '★';
        btn.appendChild(star);
      }

      btn.addEventListener('click', () => this._onCellTap(a, b));
      btn.addEventListener('keydown', (e) => this._onCellKeyDown(e, a, b));
      return btn;
    }

    _onCellKeyDown(e, a, b) {
      let na = a, nb = b;
      switch (e.key) {
        case 'ArrowLeft':  nb = Math.max(0, b - 1); break;
        case 'ArrowRight': nb = Math.min(12, b + 1); break;
        case 'ArrowUp':    na = Math.max(0, a - 1); break;
        case 'ArrowDown':  na = Math.min(12, a + 1); break;
        case 'Home':       nb = 0; break;
        case 'End':        nb = 12; break;
        default: return;
      }
      e.preventDefault();
      if (na === a && nb === b) return;
      // Move roving tabindex
      const prev = this._cells[a][b];
      const next = this._cells[na][nb];
      if (prev) prev.setAttribute('tabindex', '-1');
      if (next) { next.setAttribute('tabindex', '0'); next.focus(); }
    }

    _cellState(cell) {
      if (!cell || cell.box === 0) return 'new';
      if (cell.box >= BOX_MASTERED && cell.totalCorrect >= CORRECT_MASTERED) return 'mastered';
      if (cell.box >= 3) return 'practicing';
      return 'learning';
    }

    _countMastered(mastery) {
      // Count mastered cells (169 visible cells; diagonal keys count as 1, off-diagonal as 2)
      let count = 0;
      for (let a = 0; a <= 12; a++) {
        for (let b = a; b <= 12; b++) {
          const key = a + 'x' + b;
          const cell = mastery[key];
          if (cell && cell.box >= BOX_MASTERED && cell.totalCorrect >= CORRECT_MASTERED) {
            count += (a === b) ? 1 : 2;
          }
        }
      }
      return count;
    }

    _onCellTap(a, b) {
      if (this._drillActive) return;
      this._drillActive = true;

      // Hide codex overlay (keeps it in DOM for re-open after drill)
      this._unbindKeys();
      this._overlay.classList.remove('open');
      this._overlay.setAttribute('aria-hidden', 'true');

      // Delegate drill to game.js
      if (window.game && typeof window.game._launchCodexDrill === 'function') {
        window.game._launchCodexDrill(a, b, this);
      } else {
        // Fallback: just reopen codex
        this._drillActive = false;
        this._overlay.classList.add('open');
        this._overlay.setAttribute('aria-hidden', 'false');
        this._bindKeys();
      }
    }

    _bindKeys() {
      this._keyHandler = (e) => {
        if (e.key === 'Escape') {
          if (this._overlay && this._overlay.classList.contains('open')) this.cancel();
          return;
        }
        if (e.key === 'Tab') this._trapFocus(e);
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    _unbindKeys() {
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
    }

    _trapFocus(e) {
      if (!this._overlay) return;
      // Roving tabindex: cells with tabindex="-1" are reachable only via arrow keys, not Tab
      const focusable = Array.from(
        this._overlay.querySelectorAll('button:not([disabled]), [tabindex="0"]')
      ).filter(function(el) {
        return el.offsetParent !== null && el.getAttribute('tabindex') !== '-1';
      });
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  global.Codex = Codex;
})(typeof window !== 'undefined' ? window : globalThis);
