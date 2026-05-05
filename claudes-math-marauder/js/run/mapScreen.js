(function(global) {
  'use strict';

  const NODE_ICONS = {
    start:     '🏠',
    combat:    '⚔️',
    elite:     '👹',
    spellshop: '🛒',
    mystery:   '🔮',
    rest:      '💤',
    boss:      '👑',
  };

  const NODE_LABELS = {
    start:     'Start',
    combat:    'Battle',
    elite:     'Elite',
    spellshop: 'Shop',
    mystery:   'Mystery',
    rest:      'Rest',
    boss:      'Boss',
  };

  class MapScreen {
    constructor() {
      this._root = null;
      this._map = null;
      this._activeRun = null;
      this._runtime = null;
      this._onSelectNode = null;
      this._goldEl = null;
    }

    show(map, activeRun, runtime, onSelectNode) {
      this._map = map;
      this._activeRun = activeRun;
      this._runtime = runtime;
      this._onSelectNode = onSelectNode;
      this._root = document.getElementById('run-map-screen');
      if (!this._root) return;
      this._root.innerHTML = '';
      this._render();
    }

    // Refresh gold display and node states after a node resolves.
    refresh(activeRun) {
      this._activeRun = activeRun;
      if (this._goldEl) {
        const gold = activeRun.goldThisRun || 0;
        this._goldEl.textContent = gold + ' g';
        this._goldEl.setAttribute('aria-label', gold + ' gold this run');
      }
      // Rebuild the map area to reflect new completed/selectable state.
      const mapArea = this._root && this._root.querySelector('.run-map-area');
      if (mapArea) {
        mapArea.remove();
        this._root.appendChild(this._buildMapArea());
      }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _render() {
      this._root.appendChild(this._buildHeader());
      this._root.appendChild(this._buildMapArea());
      this._root.appendChild(this._buildFooter());
    }

    _buildHeader() {
      const header = document.createElement('header');
      header.className = 'run-map-header';

      const quitBtn = document.createElement('button');
      quitBtn.className = 'secondary run-map-quit-btn';
      quitBtn.setAttribute('aria-label', 'Quit run and return to hub');
      quitBtn.textContent = '← Quit';
      quitBtn.addEventListener('click', () => this._onQuit());
      header.appendChild(quitBtn);

      const realm = this._runtime.getRealmById(this._activeRun.realmId);
      const realmName = realm ? realm.displayName : 'Run';
      const h2 = document.createElement('h2');
      h2.className = 'run-map-realm-name';
      h2.textContent = realmName;
      header.appendChild(h2);

      const goldEl = document.createElement('span');
      const gold = this._activeRun.goldThisRun || 0;
      goldEl.className = 'run-map-gold';
      goldEl.textContent = gold + ' g';
      goldEl.setAttribute('aria-label', gold + ' gold this run');
      this._goldEl = goldEl;
      header.appendChild(goldEl);

      return header;
    }

    _buildMapArea() {
      const area = document.createElement('div');
      area.className = 'run-map-area';
      area.setAttribute('role', 'group');
      area.setAttribute('aria-label', 'Run map');

      // SVG edge layer (aria-hidden — purely decorative)
      const svg = this._buildEdgeSvg();
      area.appendChild(svg);

      // Node buttons
      const selectableIds = this._getSelectableIds();
      this._map.columns.forEach((col, ci) => {
        col.forEach((nodeId, ri) => {
          const node = this._map.nodes.get(nodeId);
          if (!node) return;
          const btn = this._buildNodeButton(node, ci, ri, col.length, selectableIds);
          area.appendChild(btn);
        });
      });

      return area;
    }

    _buildFooter() {
      const p = document.createElement('p');
      p.className = 'run-map-status';
      const sel = this._getSelectableIds();
      p.textContent = sel.length > 0 ? 'Choose your next challenge' : 'Run complete!';
      return p;
    }

    _getSelectableIds() {
      const current = this._map.nodes.get(this._activeRun.currentNodeId);
      if (!current) return [];
      // If the current node isn't completed yet (e.g., browser closed mid-fight),
      // it remains the node to enter — don't skip past it.
      if (!current.completed && current.kind !== 'start') {
        return [current.id];
      }
      // Normal case: outgoing edges that haven't been completed yet.
      return current.edgesOut.filter((id) => {
        const n = this._map.nodes.get(id);
        return n && !n.completed;
      });
    }

    _nodePos(ci, ri, colSize) {
      // Returns { xPct, yPct } as percentages (0-100) of the map area.
      const numCols = this._map.columns.length;
      const xPct = (ci + 0.5) / numCols * 100;
      const yPct = (ri + 0.5) / colSize * 100;
      return { xPct: xPct, yPct: yPct };
    }

    _buildEdgeSvg() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'run-map-edges');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');

      const currentId = this._activeRun.currentNodeId;

      this._map.columns.forEach((col, ci) => {
        col.forEach((nodeId, ri) => {
          const node = this._map.nodes.get(nodeId);
          if (!node || node.edgesOut.length === 0) return;
          const { xPct: x1, yPct: y1 } = this._nodePos(ci, ri, col.length);

          node.edgesOut.forEach((targetId) => {
            const target = this._map.nodes.get(targetId);
            if (!target) return;
            const targetCol = this._map.columns[target.column];
            const { xPct: x2, yPct: y2 } = this._nodePos(target.column, target.row, targetCol.length);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1.toFixed(2));
            line.setAttribute('y1', y1.toFixed(2));
            line.setAttribute('x2', x2.toFixed(2));
            line.setAttribute('y2', y2.toFixed(2));
            line.setAttribute('class', node.completed ? 'run-map-edge completed' : 'run-map-edge');
            svg.appendChild(line);
          });
        });
      });

      return svg;
    }

    _buildNodeButton(node, ci, ri, colSize, selectableIds) {
      const { xPct, yPct } = this._nodePos(ci, ri, colSize);
      const isSelectable = selectableIds.includes(node.id);
      const isCompleted  = node.completed;
      const isStart      = node.kind === 'start';

      const btn = document.createElement('button');
      btn.className = 'run-map-node';
      if (isSelectable)       btn.classList.add('glow');
      if (isCompleted)        btn.classList.add('completed');
      if (!isSelectable && !isStart) btn.classList.add('locked');

      // Locked nodes: native disabled (removes from tab order, announces to AT).
      if (!isSelectable) btn.disabled = true;

      btn.setAttribute('style', 'left:' + xPct.toFixed(2) + '%;top:' + yPct.toFixed(2) + '%;');

      const icon = document.createElement('span');
      icon.className = 'run-map-node-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = NODE_ICONS[node.kind] || '?';
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'run-map-node-label';
      label.textContent = NODE_LABELS[node.kind] || node.kind;
      btn.appendChild(label);

      const ariaLabel = (NODE_LABELS[node.kind] || node.kind) + ' node' +
        (isCompleted ? ', completed' : isSelectable ? ', available' : ', locked');
      btn.setAttribute('aria-label', ariaLabel);

      if (isSelectable) {
        btn.addEventListener('click', () => this._onSelectNode(node.id, node));
      }

      return btn;
    }

    _onQuit() {
      if (!confirm('Quit this run? Your progress will be lost.')) return;
      if (this._runtime) this._runtime.abandonRun();
      if (window.game) window.game.setState('HUB');
    }
  }

  global.MapScreen = MapScreen;
})(typeof window !== 'undefined' ? window : globalThis);
