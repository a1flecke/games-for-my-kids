# Session 14 — Polish, iPad Optimization, and GitHub Pages Registration

**Model:** claude-sonnet-4-6
**Estimated time:** 3–4 hours
**Deliverable:** Production-ready game. Performance optimized for iPad Safari. Registered on main index page.

---

## Goal

Final polish session:
1. Performance audit on iPad Safari (or simulator)
2. Animation smoothing (60fps tile transitions)
3. Edge case handling (empty lesson data, fetch failures, LocalStorage full)
4. Cross-browser testing (Chrome, Firefox, Safari)
5. Register game in `.github/scripts/update-index.js` `manualGameConfig`
6. Verify GitHub Pages deployment works correctly

---

## Files to Modify

- `phonics-game/index.html` — meta tags, viewport, final HTML cleanup
- `phonics-game/css/style.css` — performance optimizations
- `phonics-game/js/data.js` — error handling for failed lesson fetch
- `phonics-game/js/game.js` — edge cases, loading state
- `.github/scripts/update-index.js` — register game in index

---

## 1. Performance Optimizations

### CSS `will-change` for frequently animated elements

```css
.tile {
    will-change: transform;
}
.tile-selected, .tile-glow, .tile-matched {
    will-change: transform, background-color;
}
.energy-bar-fill {
    will-change: width;
}
```

### Prevent layout thrash during board refill

In `board.js` `refill()`, batch DOM reads before DOM writes:
```js
refill() {
    // Read phase: collect all matched tiles
    const matchedTiles = this.tiles.filter(t => t.state === 'matched');
    if (matchedTiles.length === 0) return;

    // ... compute refillPool (pure JS, no DOM) ...

    // Write phase: update DOM in one batch
    requestAnimationFrame(() => {
        let refillIdx = 0;
        for (const tile of matchedTiles) {
            const newData = refillPool[refillIdx++];
            // ... update tile.element ...
        }
    });
}
```

### Tile rendering: `transform: translateZ(0)` for GPU compositing

```css
.board-grid {
    transform: translateZ(0);  /* Promote to GPU layer */
}
```

### Reduce CSS specificity chains

Review and flatten any deeply nested selectors. Target: no selector longer than 3 levels.

---

## 2. Edge Case Handling

### Failed lesson fetch

```js
// In DataManager.loadLesson():
static async loadLesson(id) {
    try {
        const response = await fetch(`./data/lessons/lesson-${String(id).padStart(2,'0')}.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } catch(err) {
        console.error(`Failed to load lesson ${id}:`, err);
        // Return minimal fallback so game doesn't crash
        return {
            id,
            title: `Lesson ${id}`,
            gradeLevel: Math.ceil(id / 6),
            gridSize: 4,
            patterns: ['short_a'],
            patternLabels: { short_a: 'Short A' },
            wordPool: { short_a: ['cat', 'hat', 'bat', 'mat', 'cap', 'map', 'ran', 'tan', 'can', 'lap'] },
            patternHint: 'Loading error — using fallback words.'
        };
    }
}
```

Show loading indicator while lesson fetches:
```js
async startLesson(id) {
    document.getElementById('loading-overlay').style.display = 'flex';
    try {
        const lesson = await DataManager.loadLesson(id);
        // ...
    } finally {
        document.getElementById('loading-overlay').style.display = 'none';
    }
}
```

Loading overlay HTML:
```html
<div id="loading-overlay" style="display:none; position:fixed; inset:0; background:rgba(255,255,255,0.8); display:flex; align-items:center; justify-content:center; z-index:1100; font-size:24px; font-family:var(--font-ui);">
    Loading... 📚
</div>
```

### LocalStorage full (iOS private browsing)

Already handled in `SaveManager.save()` with try/catch. Add user notification:
```js
static save(data) {
    try {
        localStorage.setItem('phonics-progress', JSON.stringify(data));
    } catch(e) {
        // Private browsing or storage full — progress will not persist this session
        // Show a one-time gentle notice
        if (!window._saveWarned) {
            window._saveWarned = true;
            console.warn('Progress could not be saved. Private browsing may be enabled.');
        }
    }
}
```

### SpeechSynthesis not available

```js
// In SpeechManager.speak():
static speak(word) {
    if (!window.speechSynthesis) return;  // Graceful no-op
    // ...
}
```

### Board with only 1 pattern

If a lesson JSON has only 1 pattern, the board can always make matches — no special handling
needed for "no valid moves" (all tiles are always the same pattern). But ensure `injectValidMoves()`
doesn't crash:
```js
injectValidMoves() {
    const nonMatched = this.tiles.filter(t => t.state !== 'matched');
    if (nonMatched.length < 3) { game.onLessonComplete(); return; }
    // ...
}
```

---

## 3. HTML Meta Tags and Viewport

Ensure `index.html` has:
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>Word Explorer — Phonics Game</title>
    <meta name="description" content="Phonics matching game for grades 1-5. Learn reading patterns!">
    <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/opendyslexic" crossorigin="anonymous">
    <link rel="stylesheet" href="css/style.css">
    <!-- Home button (same style as all other games) -->
</head>
```

Home button (same as all other games in repo):
```html
<a href="../" id="home-btn" style="position:fixed;top:12px;left:12px;z-index:9999;background:rgba(0,0,0,0.6);color:white;text-decoration:none;padding:8px 14px;border-radius:20px;font-family:'Comic Sans MS',cursive;font-size:16px;touch-action:manipulation;min-width:44px;min-height:44px;display:flex;align-items:center;gap:6px;box-sizing:border-box;">🏠 Home</a>
```

---

## 4. Register in Main Index

Update `.github/scripts/update-index.js` `manualGameConfig`:
```js
'phonics-game': {
    icon: '📖',
    title: 'Word Explorer',
    description: 'Phonics matching game for grades 1–5. Match words by sound patterns to unlock the magical library!',
    category: 'Language Arts'
}
```

Then run locally to verify:
```bash
eval "$(mise activate bash)"
node .github/scripts/update-index.js
```

Confirm the game appears in the Language Arts section of the main `index.html`.

---

## 5. Cross-Browser Testing Checklist

Test in the following environments:
- [ ] iPad Safari (iOS 17+) — primary target
- [ ] Desktop Chrome (latest)
- [ ] Desktop Firefox (latest)
- [ ] Desktop Safari (macOS)

For each browser, verify:
- [ ] Lesson select loads and shows all 30 lessons
- [ ] Tile board renders and tiles are tappable/clickable
- [ ] SpeechSynthesis speaks words (may require user gesture first on some browsers)
- [ ] SFX plays on first tap
- [ ] Lesson completes and shows summary
- [ ] LocalStorage saves and loads correctly
- [ ] No console errors

---

## 6. Final CSS Cleanup

- Remove any `!important` declarations (should be none)
- Consolidate duplicate selectors
- Verify responsive breakpoints cover 375px (iPhone SE) to 1366px (iPad Pro)
- Test landscape orientation on iPad (board should reflow correctly)

Landscape layout addition:
```css
@media (orientation: landscape) and (max-height: 600px) {
    .board-grid {
        max-width: none;
        max-height: calc(100vh - 80px);
        aspect-ratio: auto;
    }
    .tile {
        min-height: 60px;
    }
}
```

---

## Definition of Done

- [ ] No JavaScript errors in any browser's console
- [ ] Page loads in < 3 seconds on wifi (verify in Network tab: < 300KB total)
- [ ] Tile animations run at 60fps (verify with Performance tab)
- [ ] SpeechSynthesis works on iPad Safari (requires HTTPS — GitHub Pages provides this)
- [ ] Game registered in `manualGameConfig` and appears on main index page after running update script
- [ ] All 30 lesson cards load without fetch errors
- [ ] Failed fetch shows fallback gracefully (no crash)
- [ ] Progress saves and restores correctly across page refreshes
- [ ] Home button navigates to `../` correctly on GitHub Pages
- [ ] Game works in landscape orientation on iPad
