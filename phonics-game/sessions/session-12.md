# Session 12 — Accessibility Pass

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Full accessibility compliance — ARIA, keyboard nav, WCAG contrast, touch targets.

---

## Goal

Ensure the game meets all non-negotiable accessibility requirements from `plan.md` § 6:
- OpenDyslexic font active everywhere
- WCAG AA contrast (4.5:1) on all text/background combinations
- 44px minimum touch targets on all interactive elements
- ARIA labels on all tiles, buttons, screens
- Keyboard navigation: Tab/Enter/Escape/Arrow keys
- Live regions for screen reader announcements
- No color-only pattern indicators (shape + color both used)
- iOS Safari specific fixes

This is an audit-and-fix session — read all existing screens, identify gaps, fix them all.

---

## Files to Modify

- `phonics-game/css/style.css` — contrast fixes, touch target sizes, font enforcement
- `phonics-game/index.html` — ARIA attributes, role attributes, live regions
- `phonics-game/js/board.js` — keyboard navigation for tiles
- `phonics-game/js/game.js` — keyboard handling

---

## Accessibility Checklist

### 1. Font Enforcement

Verify OpenDyslexic loads from CDN. Add fallback chain:
```css
:root {
    --font-tile: 'OpenDyslexic', 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
    --font-ui: 'OpenDyslexic', 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
}

* { font-family: var(--font-ui); }
.tile, .tut-word, .sort-word-card, .summary-word-chip { font-family: var(--font-tile); }
```

Letter spacing on ALL word display elements: `letter-spacing: 0.06em;`
Line height everywhere: `line-height: 1.5;`

### 2. WCAG AA Contrast Audit

Check every text/background combination:
- `#2C2416` on `#F5F0E8` → ~15:1 ✓ (well above 4.5:1)
- `#636e72` on `white` → 4.2:1 ✗ FAILS — change to `#5a6569` → 4.6:1 ✓
- Star display `★` on white → use `#d4a100` instead of `#f1c40f` for better contrast
- Grade badge text on colored background — verify each grade color meets 4.5:1

Automated check: use browser DevTools Accessibility panel or aXe extension.

### 3. Touch Target Audit

Every interactive element needs `min-height: 44px` AND `min-width: 44px`:
- Lesson cards: ✓ (already larger)
- Tile speaker button: currently 28px → change to `min-width: 44px; min-height: 44px`
- Settings checkboxes: wrap in larger tap area
- Tutorial "Skip" button: verify 44px
- Sort Mode buckets: verify 44px minimum
- Summary word chips: increase padding → `padding: 8px 16px`
- Back buttons: verify 44px
- Grade filter tabs: verify 44px height

Add to CSS:
```css
button, a, [role="button"], [tabindex="0"] {
    min-height: 44px;
    touch-action: manipulation;
}
```

### 4. ARIA Attributes

**Lesson select screen:**
```html
<main id="screen-select" role="main" aria-label="Lesson Selection">
<div id="lesson-grid" role="grid" aria-label="Lessons">
<!-- Each lesson card: -->
<div role="gridcell" aria-label="Lesson 3: Consonant Digraphs, Grade 1, 2 stars, unlocked"
     tabindex="0" onclick="..." onkeydown="if(event.key==='Enter') game.startLesson(3)">
```

**Board screen:**
```html
<div id="board-grid" role="grid" aria-label="Word matching board">
<!-- Each tile: -->
<div role="gridcell"
     aria-label="${word} - ${patternLabel}"
     aria-pressed="${tile.state === 'selected'}"
     tabindex="0">
```

**Live region for matches:**
```html
<div id="live-region" role="status" aria-live="polite" aria-atomic="true"
     style="position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;">
</div>
```

Update `MatchManager.showPatternFeedback()`:
```js
document.getElementById('live-region').textContent =
    `Matched ${matchedWords.join(', ')} — ${patternLabel} pattern!`;
```

**Tutorial overlay:**
- Already has `role="dialog"` and `aria-modal="true"` — verify `aria-labelledby` points to `tut-title`

**Sort Mode:**
```html
<div id="sort-buckets" role="group" aria-label="Pattern buckets">
<div class="sort-bucket" role="button" tabindex="0"
     aria-label="${label} bucket: ${count} words sorted"
     onkeydown="if(event.key==='Enter') sortManager.onBucketTap('${pattern}')">
```

### 5. Keyboard Navigation

**Tile grid keyboard nav:**
Add to `BoardManager.render()`: each tile gets `tabindex="0"`.
Add keyboard handler to board grid:
```js
document.getElementById('board-grid').addEventListener('keydown', (e) => {
    const tile = this.tiles.find(t => t.element === document.activeElement);
    if (!tile) return;
    const { row, col } = tile;
    const gs = this.gridSize;
    let next = null;

    if (e.key === 'ArrowRight') next = this.getTile(row, col + 1);
    if (e.key === 'ArrowLeft')  next = this.getTile(row, col - 1);
    if (e.key === 'ArrowDown')  next = this.getTile(row + 1, col);
    if (e.key === 'ArrowUp')    next = this.getTile(row - 1, col);
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        game.onTileTap(tile);
        return;
    }
    if (e.key === 'Escape') {
        window.matchManager.resetSelection();
        return;
    }
    if (next) { e.preventDefault(); next.element.focus(); }
});

getTile(row, col) {
    if (row < 0 || col < 0 || row >= this.gridSize || col >= this.gridSize) return null;
    return this.tiles.find(t => t.row === row && t.col === col);
}
```

### 6. Pattern Indicator: Color + Shape

Pattern glow state uses BOTH:
- Color change (border: blue)
- Icon indicator: add a small pattern symbol to each glowing tile

In `setTileState()`, when state === 'glow', add a pattern icon badge:
```js
// In tile HTML, add a pattern badge area
el.innerHTML = `
    <span class="tile-pattern-badge" id="badge-${tile.id}" aria-hidden="true"></span>
    <span class="tile-word">${tile.word}</span>
    <button class="tile-speaker" ...>🔊</button>
`;

// When setting glow state, set badge character
if (state === 'glow') {
    badge.textContent = patternSymbol(tile.pattern);
    badge.style.display = 'block';
} else {
    badge.style.display = 'none';
}
```

`patternSymbol(pattern)` returns a simple shape: `short_a → 'A'`, `ai → 'ai'`, etc.
This ensures pattern is indicated by both the blue glow color AND a text badge.

### 7. iOS Safari Specifics

- `touch-action: manipulation` on all tiles (prevents double-tap zoom)
- `-webkit-tap-highlight-color: transparent` on tiles
- `user-select: none` on tiles
- Prevent scroll when tapping tiles: `e.preventDefault()` is NOT called (allows scroll)
- `position: fixed` overlays need `overscroll-behavior: none` to prevent background scroll

```css
.tile {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
}
.tutorial-overlay, .celebration-overlay {
    overscroll-behavior: none;
}
```

---

## Definition of Done

- [ ] All text passes WCAG AA contrast (4.5:1) — verified with browser DevTools
- [ ] All interactive elements ≥44px touch target (verified on iPad simulator)
- [ ] `aria-label` on every tile, button, and screen container
- [ ] Live region announces matches to screen readers
- [ ] Arrow keys navigate tile grid
- [ ] Enter/Space selects focused tile
- [ ] Escape resets selection
- [ ] Tab navigation reaches all interactive elements
- [ ] Pattern indicators use both color AND text badge (not color alone)
- [ ] No double-tap zoom on iOS (touch-action: manipulation)
- [ ] OpenDyslexic font loads and renders on all tiles
- [ ] Letter spacing 0.06em on all word display elements
