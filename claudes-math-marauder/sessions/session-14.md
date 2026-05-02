# Session 14 — Accessibility, iPad QA, Final Polish
**Model:** Opus | **Focus:** Real-device testing on iPad with Bluetooth keyboard, full accessibility audit, performance tuning, kid playtest. Ship-ready by end of session.

By the end, the game runs at 60fps on a real iPad in Safari, passes a full a11y audit, and has been playtested by the actual 10-year-old target audience.

## Pre-flight

1. Read CLAUDE.md sections on Accessibility Requirements and HTML/JS Coding Standards (full pass).
2. Read spec section 7 (Accessibility & Comfort) and 11 (Open Questions).
3. Run `/marauder-checklist`.
4. Get an iPad (any model, iOS 14+) + Bluetooth keyboard ready.
5. Charge a kid for the playtest session :).

## Goals

By session end:
- 60 fps minimum on iPad Safari (target: iPad 9th gen or newer, 1024×768 viewport)
- Full WCAG AA pass (axe-core or manual contrast / keyboard / screen-reader audit)
- ≥ 4.5:1 contrast on every text element on every screen
- All interactive elements ≥ 44px
- VoiceOver flow: full game playable with VoiceOver only (where reasonable)
- Keyboard-only flow: full game playable with Tab/Enter/Esc/Arrows
- Reduced-motion: all animations skip / instant-cut
- Kid playtest: 30-minute session with the actual player; iterate on top 3 pain points

## Files to modify (most files lightly)

- `claudes-math-marauder/css/style.css` — final pass on contrast, font sizing, focus rings
- `claudes-math-marauder/js/*.js` — fix any a11y regressions found
- `claudes-math-marauder/js/ui/settings.js` — verify font scale, voice rate, audio volume sliders
- `claudes-math-marauder/index.html` — verify viewport meta, lang attr, document title
- `claudes-math-marauder/CLAUDE.md` — game-specific quirks discovered during QA

## Deliverables

### 1. Performance pass

**Target: 60 fps minimum on iPad 9.**

Profiling steps:
1. Open game on iPad Safari, connect Web Inspector from Mac
2. Record a 60-second timeline during a Realm 5 boss fight (the most complex scene)
3. Identify any frames > 16.7ms

Likely hot spots and their fixes:

| Hot spot | Fix |
|---|---|
| Per-frame `drawCreature` redraw | Confirm cached offscreen canvas hit (check LRU stats); evict only on resize |
| Particle burst (>50 particles) | Cap pool size to 80; recycle aggressively |
| Speech `cancel()` triggering layout | Already debounced via 50ms setTimeout — verify still in place |
| Halftone dot pattern | Pre-bake into a tile canvas; `ctx.drawImage` instead of per-dot calls |
| Inline SVG map node count > 19 | Already capped at 19; ensure `<g>` nodes reused on resize, not recreated |
| Boss intro speech blocking RAF | Already async; verify no blocking work in `_narrate()` |
| Resize handler thrash on rotate | Debounce to 100ms; also make sure the cache is invalidated only when DPR changes |

**Memory budget:** under 80 MB heap on iPad 9 (older devices have ~256 MB usable for Safari tabs).

### 2. Accessibility audit

Run through this checklist on every screen + overlay:

#### Color & Contrast
- [ ] Body text: ≥ 4.5:1 (#2C2416 on #F5F0E8 = 13.5:1 ✓)
- [ ] Secondary text uses #595143 or darker — never #666/#888/#999
- [ ] Focus rings visible on all interactive elements: 3px solid #2C2416, offset 2px
- [ ] Locked / disabled state still ≥ 3:1 contrast (so it's visible but distinguishable)

#### Touch & Pointer
- [ ] Every interactive element ≥ 44×44px (orbs are 96px ✓, numpad ≥ 72px ✓)
- [ ] No element relies on hover-only state
- [ ] `touch-action: none` set on canvas containers (prevents iOS double-tap zoom interference)

#### Keyboard
- [ ] Tab moves through every interactive element in DOM order
- [ ] Shift-Tab reverses
- [ ] Enter/Space activates buttons
- [ ] Escape closes any open overlay
- [ ] Arrow keys navigate map nodes (extra: keyboard-only players can use arrows to move between nodes on the map)
- [ ] No keyboard trap outside of intentional focus-trap modals
- [ ] Focus visible on every focusable element (`:focus-visible` styles applied)

#### Screen Reader (VoiceOver / TalkBack)
- [ ] Every screen has a useful `aria-label` (or `<h1>`)
- [ ] Every modal: `role="dialog" aria-modal="true" aria-label="..."`
- [ ] Every button has discernible text or `aria-label`
- [ ] Live-update regions use `role="status"` (problem, score, streak)
- [ ] No `aria-live` + `aria-hidden` collisions
- [ ] No `aria-live` + `aria-label` collisions
- [ ] Dynamic `aria-label` updates whenever `textContent` changes on labelled elements
- [ ] Locked items: native `<button disabled>` — never a `.locked` div

#### Motion
- [ ] `prefers-reduced-motion: reduce` honored:
  - Boss intro: no slide; just appears
  - Phase break: no shake; just label change
  - Page-flip / panel-wipe / ink-splatter: instant cut
  - Particle bursts: 1 frame, then despawn
  - Star animations on results card: pop instantly without transform/opacity transition

#### Speech & Audio
- [ ] All voiced text has a visible 🔊 button — none auto-plays without user gesture (except mid-fight where audio is the player's choice)
- [ ] Settings panel exposes voice picker, voice rate (0.5–1.5), master volume (0–1), SFX volume (0–1), speech volume (0–1)
- [ ] Audio mute toggle persists across sessions

### 3. Final CSS pass

```css
/* Focus ring — visible on all focusable elements */
*:focus-visible {
  outline: 3px solid var(--ink-dark);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Cream background variants for AA-safe muted text */
:root {
  --bg: #F5F0E8;
  --ink-dark: #2C2416;
  --ink-muted: #595143;     /* AA-safe on cream */
  --accent-comic-yellow: #F0D840;
  --accent-comic-red: #D04030;
  --accent-comic-blue: #2A60B0;
  --error-red: #B83020;
}

/* Touch target floor — global */
button, [role="button"], input[type="button"] {
  min-width: 44px;
  min-height: 44px;
}
```

### 4. iPad-specific QA

- [ ] Run on iPad 9 (oldest target) and iPad Pro (current target)
- [ ] Both portrait (768×1024) and landscape (1024×768)
- [ ] iOS Safari 16, 17, 18
- [ ] Verify no double-tap zoom on canvas
- [ ] Verify Bluetooth keyboard works (numpad ultimate, Tab nav, Esc close)
- [ ] Verify `safe-area-inset-*` respected (notch, home indicator)
- [ ] Audio survives backgrounding the tab + resume
- [ ] Save survives Safari clearing the tab cache (verify localStorage retained)

### 5. Kid playtest protocol

30-minute session, player journals after:

**Phase 1 (10 min): Onboarding**
- Hand them the iPad. No instructions. Watch.
- Note where they pause, look confused, try to tap something that's not interactive.
- Ask: "What did you think was going to happen?"

**Phase 2 (15 min): Free play**
- "Play however you want for 15 minutes."
- Watch for: boredom (does the kid wander away?), frustration (does the kid say "this is stupid"?), excitement (do they laugh / lean in?).
- Time how long until they hit their first ultimate, first phase break, first boss kill.

**Phase 3 (5 min): Debrief**
- "What did you like the most?"
- "What was annoying?"
- "What was hard? Was it the math hard or the game hard?"
- "Would you play again?"

Take notes on every "annoying" or "confusing" — those become the polish backlog.

### 6. Top 3 polish pass (post-playtest)

Whatever the kid said is annoying — fix it before commit. Likely candidates from common kid-playtest patterns:

- Speech rate too slow → adjust default to 1.05
- Numpad commit button too small / hard to find → make ✓ button green and 1.5× width
- Phase break delay too long → tighten from 1300ms to 900ms
- Boss intro too long → shrink "tap to skip" wait from 1.5s to 1.0s
- Story panels too text-heavy → confirm narration is accurate; offer "skip narration" toggle
- Mastery delta after each fight isn't visible → add a small "mastery +1" toast on streak-end
- Wrong-answer penalty narration says the answer too loud / too long → adjust voice rate to 1.1

### 7. Final regression test pass

- [ ] All Layer-1 tests pass
- [ ] All fuzz scripts (10k combat, 5k mapgen) pass
- [ ] Replay-determinism test passes
- [ ] Manual: full Realm 1 run from new save → boss kill → results → HUB → save reload → resume → finish run
- [ ] Manual: full Realm 5 run with all classes/spells unlocked
- [ ] Manual: 30-minute mixed session — check for memory leak (DOM node count steady, listener count steady)

### 8. Hosting / deployment

- [ ] `claudes-math-marauder/index.html` is the entry; pushing to `main` triggers `update-index.yml`
- [ ] Game card on the index page registered in `.github/scripts/update-index.js` (icon `🤖⚔️📐`, category `learning`)
- [ ] After push, verify GitHub Pages serves the game at `https://<user>.github.io/games-for-my-kids/claudes-math-marauder/`

### 9. Update game-specific CLAUDE.md / rules

`/Users/aaronfleckenstein/development/github/games-for-my-kids/.claude/rules/marauder.md` should already exist (created in Session 1). Add discovered quirks:
- Per-fight mastery save batching (prevents localStorage thrash)
- Speech delay quirk on iPad
- LRU cache stats target (≤30 canvases, ~6MB)
- Replay/dev menu opt-in via `?dev=1`

## Tests to run

- [ ] **Layer-1**: `bash scripts/test-all.sh` → all green
- [ ] **Performance**: 60s recording on iPad 9, no frame > 16.7ms
- [ ] **Memory**: 30-min play session, heap stable < 80 MB, DOM nodes stable, listener count stable
- [ ] **A11y axe-core scan**: 0 violations
- [ ] **VoiceOver flow**: Full Realm 1 run completable with VoiceOver only (verify orb tap announces problem + answer)
- [ ] **Keyboard-only flow**: Full Realm 1 run completable with Tab/Enter/Esc/Arrows only
- [ ] **Reduced motion**: Game playable with `prefers-reduced-motion: reduce`; no jarring animations
- [ ] **Kid playtest**: Player completes Realm 1 in 5–15 min; reports ≥ "fun" rating

## Acceptance checklist

- [ ] 60 fps on iPad 9 in Realm 5 boss
- [ ] WCAG AA: contrast, touch targets, keyboard, screen reader all pass
- [ ] `prefers-reduced-motion` fully honored
- [ ] Speech mute and voice picker work on iOS Safari
- [ ] Save survives tab close, browser restart, Safari cache eviction (localStorage)
- [ ] Resume works mid-run after closing the tab
- [ ] Kid playtest done; top-3 issues fixed
- [ ] Game registered on the games-for-my-kids index
- [ ] CLAUDE.md per-game rules updated with discovered quirks

## Session end

1. Run all automated tests one final time
2. Run `marauder-web-review` agent across the entire `claudes-math-marauder/` tree
3. Push final fixes
4. Commit `Session 14: a11y, iPad QA, kid playtest, ship`
5. Push to `main`
6. Verify GitHub Pages deploys cleanly; open the game on a fresh device and play one full run end-to-end
7. Celebrate with the player. They earned it. 🎉
