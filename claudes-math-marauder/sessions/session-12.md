# Session 12 — Cutscenes, Results Cards, Transitions
**Model:** Sonnet | **Focus:** Story-panel renderer (procedural canvas comic panels), results card with star rating + loot reveal, screen transitions (page-flip / panel-wipe), boss intro polish.

By the end, the game has the **graphic-novel feel** the player wanted — story panels render procedurally on canvas, the results card rolls out with stars and loot, and screen transitions feel like flipping a comic page.

## Pre-flight

1. Read spec section 4 (Renderer + Comic FX) and 7 (Story).
2. Re-read Session 3 (`fx/comicfx.js` primitives) and Session 7 (boss KO cinematic).
3. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/fx/storyPanel.js` — Procedural panel renderer (reads `imageDescriptor` from story.json)
- `claudes-math-marauder/js/ui/resultsCard.js` — Post-fight results overlay (stars, score, loot reveal)
- `claudes-math-marauder/js/fx/transitions.js` — Screen transitions (page-flip, panel-wipe, ink-splatter)
- `claudes-math-marauder/js/fx/figureRegistry.js` — Pose/figure descriptor → canvas drawing map

## Files to modify

- `claudes-math-marauder/js/hub/story.js` — replace placeholder panels with `storyPanel.draw()`
- `claudes-math-marauder/js/run/runtime.js` — show results card on fight victory + boss KO
- `claudes-math-marauder/js/game.js` — call `transitions.play()` on screen change

## Deliverables

### 1. `fx/storyPanel.js` — Procedural Comic Panels

`imageDescriptor` JSON DSL (defined in story.json):

```json
{
  "scene": "interior_tower",         // background type from a known set
  "framing": "wide",                 // "wide" | "close" | "extreme"
  "lighting": "moonlight",           // tints palette
  "figures": [
    { "id": "wizard", "pose": "stand_left", "expression": "determined" },
    { "id": "fallen_goblin", "pose": "lie_right", "expression": "defeated" }
  ],
  "fx": ["ink_splatter_left"],
  "caption": "Victory!",             // burst-text overlay
  "speech": [                        // optional speech bubbles
    { "from": "wizard", "text": "And so the warlord falls..." }
  ]
}
```

Renderer signature:

```js
class StoryPanelRenderer {
  constructor({ figureRegistry, comicfx }) { /* ... */ }

  // Draw a story panel into a target canvas at a given size
  draw(ctx, w, h, descriptor, palette) {
    this._drawScene(ctx, w, h, descriptor.scene, palette, descriptor.lighting);
    this._drawFigures(ctx, w, h, descriptor.figures, palette, descriptor.framing);
    this._drawFx(ctx, w, h, descriptor.fx, palette);
    if (descriptor.caption) this._comicfx.burstText(ctx, w/2, h*0.85, descriptor.caption, palette);
    if (descriptor.speech) this._drawSpeechBubbles(ctx, w, h, descriptor.speech, descriptor.figures);
  }

  _drawScene(ctx, w, h, sceneId, palette, lighting) {
    // Known scenes: 'interior_tower', 'forest_glade', 'mine_shaft', 'spire_lava',
    //              'cloud_pinnacle', 'void_chasm', 'wizard_workshop', 'starfield'
    // Each is a procedural drawing with halftone fills + ink-line silhouettes
  }

  _drawFigures(ctx, w, h, figures, palette, framing) {
    figures.forEach(f => {
      const drawer = this._figureRegistry.get(f.id);
      if (!drawer) return;
      const pos = this._posForPose(f.pose, w, h, framing);
      drawer(ctx, pos.x, pos.y, pos.scale, f.expression, palette);
    });
  }

  _drawSpeechBubbles(ctx, w, h, bubbles, figures) {
    // Word-balloon: rounded rectangle with tail pointing to figure
    // Text inside is drawn with comic-block font (OpenDyslexic available; canvas falls back to Comic Sans)
    // Word-wrap if text > 28 chars
  }
}
```

### 2. `fx/figureRegistry.js`

A registry keyed by figure ID. Each entry is a function `(ctx, x, y, scale, expression, palette) => void` that draws the figure procedurally using `fx/shapes.js` primitives.

```js
const figureRegistry = {
  wizard: (ctx, x, y, scale, expr, palette) => {
    // Same wizard shape as in fx/wizardRenderer.js but with pose variations
    // expr drives mouth shape: 'determined' = grim line, 'shocked' = O, 'happy' = smile, 'defeated' = downturn
  },
  fallen_goblin: (ctx, x, y, scale, expr, palette) => { /* lying-down silhouette */ },
  goblin_warlord: (ctx, x, y, scale, expr, palette) => { /* uses parts from monsters.json */ },
  shaman_zorgath: ...,
  spire_dragon: ...,
  sky_lord: ...,
  void_king: ...,
  fallen_<each-boss>: ...,
  // Background figures
  goblin_grunt: ...,
  bat: ...,
  glow_orb: ...
};
```

Pose names (`pose` field): `stand_left`, `stand_right`, `stand_center`, `lie_left`, `lie_right`, `kneel_left`, `kneel_right`, `fly_left`, `fly_right`, `loom_above`.

### 3. `ui/resultsCard.js`

Shown on every fight victory. Comic-panel-style card overlay with:
- Big "VICTORY!" or "BOSS DOWN!" header (burst text)
- Stars: 0–3 stars rendered in big style with stagger animation (1st star pops at 200ms, 2nd at 400ms, 3rd at 600ms)
- Score breakdown: base + speed bonus + streak multiplier + retries penalty
- Loot reveal: gold, +1 spell (if shop reward), story panel unlock (if applicable, with thumbnail)
- "CONTINUE" button
- 🔊 Read-aloud button that narrates "Three stars! Excellent work, wizard!"

Star rating formula:
```
let stars = 0;
if (retries === 0) stars++;
if (avgAnswerTimeMs < 4000 && correctRate >= 0.9) stars++;
if (streakMax >= 5 && correctRate === 1.0) stars++;
```

Draft tuning numbers — finalized via playtest in Session 14.

```js
class ResultsCard {
  constructor({ audio, speech, save, focusReturnTo }) { /* ... */ }

  show(result, opts = {}) {
    this.cancel();
    this._result = result;
    this._build();
    this._overlay.classList.add('open');
    this._overlay.setAttribute('aria-hidden', 'false');
    this._focusFirstButton();
    this._bindKeys();
    this._animateStars();           // staggered timers
    this._narrateSummary();
  }

  cancel() {
    Object.values(this._timers).forEach(t => { if (t) clearTimeout(t); });
    Object.keys(this._timers).forEach(k => this._timers[k] = null);
    this._unbindKeys();
    if (this._overlay) {
      this._overlay.classList.remove('open');
      this._overlay.setAttribute('aria-hidden', 'true');
    }
    this._speech.cancel();
    this.onContinue = null;
  }

  _animateStars() {
    [200, 400, 600].forEach((delay, i) => {
      this._timers[`_star${i}`] = setTimeout(() => {
        if (i < this._result.stars) {
          this._overlay.querySelector(`#result-star-${i}`).classList.add('lit');
          this._audio.play('starGain');
        }
      }, delay);
    });
  }

  _narrateSummary() {
    const messages = ['Three stars! Excellent work, wizard!', 'Two stars! Well fought!', 'One star! Keep practicing!', 'Try again, wizard.'];
    this._speech.speak(messages[3 - this._result.stars]);
  }
}
```

**ARIA:**
- `role="dialog" aria-modal="true" aria-label="Results"`
- Stars are decorative (`aria-hidden="true"`) — the dialog's accessible name explains the rating
- Score breakdown rows have `<div role="group" aria-labelledby="score-label-X">`
- Continue button is the focused element

### 4. `fx/transitions.js`

Screen-to-screen transitions. Each transition is a 600–900ms full-screen overlay animation.

```js
const transitions = {
  pageFlip: ({ from, to, ctx, w, h, audio }) => Promise<void>,
  panelWipe: ({ from, to, ctx, w, h, audio }) => Promise<void>,
  inkSplatter: ({ from, to, ctx, w, h, audio }) => Promise<void>,
};
```

Where the transitions are used:
- `pageFlip`: HUB → RUN_MAP, and back
- `panelWipe`: between map nodes (subtle, ~400ms)
- `inkSplatter`: pre-boss-fight (dramatic, ~900ms)

Each transition draws to a top-layer canvas (`#transition-canvas`) that overlays everything:

```js
async function pageFlip({ ctx, w, h, audio }) {
  audio.play('pageFlip');
  const start = performance.now();
  const duration = 700;
  return new Promise(resolve => {
    function frame() {
      const t = (performance.now() - start) / duration;
      if (t >= 1) { ctx.clearRect(0, 0, w, h); resolve(); return; }
      ctx.clearRect(0, 0, w, h);
      const angle = t * Math.PI * 0.5;       // 0 → 90°
      const slideX = Math.sin(angle) * w;
      // Draw a "page" rectangle that sweeps across the screen with a slight rotation
      ctx.save();
      ctx.translate(slideX - w, 0);
      ctx.fillStyle = '#F5F0E8';
      ctx.fillRect(0, 0, w, h);
      // Ink-line edge
      ctx.strokeStyle = '#1A1208';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
```

Honor `prefers-reduced-motion`: when set, all transitions immediately resolve (instant cut).

### 5. Boss intro polish

In Session 7 the boss intro was a slide-in + title card. Polish in this session:

- Slide-in animation eased with a small overshoot (cubic-bezier-style ease-out-back)
- Title card uses `comicfx.burstText` with 96px stroked title
- Three "danger speed lines" sweep in from corners during the title
- The "tap to skip" hint pulses at 1Hz after 1.5s
- Boss voice narration applies pitch/rate from `boss.voiceProfile`
- After narration ends, transition to phase 1 with a `panelWipe` (200ms)

### 6. `runtime.js` integration

```js
async _onFightComplete(result) {
  await this._transitions.panelWipe({ ... });
  this._resultsCard.onContinue = () => this._afterResults(result);
  this._resultsCard.show(result);
}

_afterResults(result) {
  this._resultsCard.cancel();
  // Apply rewards
  this._save.applyFightRewards(result);
  // Advance map
  if (result.outcome === 'boss_victory') this._afterBossVictory(result);
  else this._returnToMap();
}

_afterBossVictory(result) {
  this._save.applyBossRewards(result);
  // Save unlocks (next realm, next class, next story chapter)
  // Fire story-unlock notification
  this._showStoryUnlockToast(result.bossId);
  // After a short delay, return to HUB
  setTimeout(() => this._enterHub(), 2500);
}
```

### 7. `hub/story.js` integration

Replace placeholder rendering in `story.js` with calls to `storyPanel.draw()`. Each panel renders into its own offscreen canvas (cached — same LRU as monsters), then drawn into the panel viewer.

When the player taps 🔊 on a panel: `speech.speak(panel.narration)` with `panel.voiceProfile`.

### 8. CSS

```css
#transition-canvas {
  position: fixed; inset: 0; pointer-events: none; z-index: 1000;
  display: block;
}
#results-card { /* full-screen panel-bordered overlay */ }
#results-card .stars { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
#results-card .star { font-size: 80px; color: #2C2416; opacity: 0.3; transition: opacity 200ms, transform 200ms; }
#results-card .star.lit { opacity: 1; transform: scale(1.1); color: #F0D840; }
@media (prefers-reduced-motion: reduce) {
  #results-card .star, #transition-canvas { transition: none; }
}
```

## Tests to run

Manual playtest:

- [ ] Beat a Realm 1 fight — results card appears, stars animate (staggered), narration plays
- [ ] All 4 star scenarios: 0 stars (defeat-retry x3), 1 star (no streak), 2 stars (good streak), 3 stars (perfect)
- [ ] Beat a boss — results card shows, story unlock toast appears, 2.5s later return to HUB
- [ ] Open story → Chapter 2 panels render procedurally (no missing assets / blank panels)
- [ ] Speech bubbles render with proper word-wrap; 🔊 read-aloud per panel works
- [ ] HUB → start run: page-flip transition plays
- [ ] Map → pre-boss: ink-splatter transition plays
- [ ] `prefers-reduced-motion: reduce` set → all transitions instant
- [ ] No memory leak from results card / story panel openings (test 50× rapid open/close)

Edge cases:

- [ ] Story panel with 0 figures (background-only) renders without crash
- [ ] Speech bubble with 50+ characters word-wraps correctly
- [ ] Two figures at the same `pose` slot — second one offsets to avoid overlap
- [ ] Caption with apostrophe: `"It's over!"` — escaped properly in canvas text
- [ ] Continue button on results card returns focus to map node (or HUB tile if boss-victory path)

## Acceptance checklist

- [ ] All transitions respect `prefers-reduced-motion`
- [ ] Results card follows timer-lifecycle pattern (constructor null, cancel clears all, save cb before cancel)
- [ ] Story panels cache in LRU (same cache as monsters)
- [ ] No `style.display` in JS
- [ ] No `aria-live` on elements that toggle `aria-hidden`
- [ ] Speech bubbles are decorative on canvas (text alternative is the panel narration via 🔊 button)
- [ ] All Layer-1 tests still pass

## Session end

1. Re-run all Layer-1 tests
2. Manual playtest: full run with story panels viewed, results card stars verified, transitions smooth
3. Run `marauder-web-review` agent
4. Commit `Session 12: cutscenes — story panels, results cards, transitions, boss intro polish`
5. Push to `main`
