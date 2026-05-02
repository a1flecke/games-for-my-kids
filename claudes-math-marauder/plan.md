# Claude's Math Marauder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan session-by-session. Run `/marauder-checklist` before any session that writes code; run `/validate-marauder-data` after data edits; run the `marauder-web-review` agent after each session before commit.

**Goal:** A vanilla-JS browser roguelike that drills multiplication and division (factors 0–12, results 0–144, plus stretch facts in 5s/10s/2s) for one specific 10-year-old player with ADHD + dyslexia, hosted on GitHub Pages.

**Source spec:** `docs/superpowers/specs/2026-05-01-claudes-math-marauder-design.md` — read before starting any session.

**Tech stack:** Vanilla JS (ES6+), HTML5 Canvas 2D, Web Audio (synthesized SFX), Web Speech (narration), LocalStorage (save). No frameworks, no bundler, no build step. Deployed via the existing `update-index.yml` GitHub Pages workflow.

---

## Context

A new game for a 10-year-old player with ADHD + dyslexia: defeat fantasy monsters (goblins, dragons, liches, void-creatures) by casting math spells. Each run is a procedurally generated branching map through one of 5 themed realms; each fight is one or more multiplication/division problems answered via tappable orbs (default), typed ultimates (charge meter), or multi-phase boss glyph combos. Mastery is tracked via a Leitner spaced-repetition engine; difficulty stays at the edge of the player's ability without grind-locking content.

**Directory:** `claudes-math-marauder/`
**Index icon:** `🤖⚔️📐`
**Index title:** "Claude's Math Marauder"
**Index description:** "Claude built this fantasy roguelike where you cast multiplication and division spells to defeat goblins, dragons, and liches."
**Category:** `learning` in `gameCategories` in `update-index.js`

---

## Design Principles

1. **No anxiety mechanics.** No countdown timers visible by default. No HP-based run-failure (B3 retry-on-defeat). No "you're doing badly" copy. Wrong-answer text is neutral and the correct answer is narrated.
2. **High novelty per fight.** Random monsters, random map paths, random spell-shop offerings, random mystery events. Every fight has palette, monster, and taunt variation.
3. **Reading-light.** Every text block has a 🔊 button. Auto-narrate is on by default. Sentence-per-panel max for story. Single-sentence wrong-answer correction always speaks the answer.
4. **Adaptive difficulty.** Leitner box-based mastery weighting — every problem is pulled by mastery score so the player is always at their edge, never bored or frustrated.
5. **Choice everywhere.** Branching map nodes, mystery events, spell-shop picks, class selection, deck slots. 8–12 small player decisions per run.
6. **Bold comic visual identity.** Procedural canvas with thick ink outlines, halftone fill, speed lines, and burst-text impacts. Every fight feels like a comic-book page.
7. **Short clear loops.** ~60 sec per fight, 10–15 min per run. Auto-save after every node so quitting mid-run never costs progress.
8. **Stakes without loss.** Streak counter + score + 1/2/3-star run rating give "did I win cleanly?" feeling without ever ending a run on failure.

---

## Technical Architecture

### Rendering: Procedural Canvas + Comic-Effects Library

A single full-screen canvas owned by `game.js`. Every visual is drawn procedurally — no image assets. Monsters are parametric data (shape tree → primitives → ink-outline + halftone fill). Each monster's base parts are drawn once to per-part offscreen canvases and composited per frame with animation transforms (Petstore paper-doll model). The comic-effects library (`fx/comicfx.js`) provides reusable primitives: ink outline, halftone fill, speed lines, burst text, panel flash, ink burst, panel border, screen shake.

- **Single RAF chain** — only `game.js` calls `requestAnimationFrame`. All managers expose passive `update(dt)` and `draw(ctx, w, h)` methods.
- **Delta-time capped at 50ms** — iPad Safari RAF throttling.
- **Max 30 active offscreen canvases** with LRU eviction (Petstore precedent).
- **HUD lives as DOM** over the canvas — DOM is faster for static UI and accessible to screen readers.
- **Seeded PRNG** for any cached procedural texture so re-cache produces identical results.

### Touch Input

- **Pointer Events** (`pointerdown/move/up`) — unified mouse + touch, no 300ms delay, `setPointerCapture()` for any drag.
- CSS `touch-action: none` on canvas to prevent Safari scroll/zoom interference.
- Coordinate conversion: `(clientX - rect.left) * (canvas.width / rect.width)` with DPR division.
- All combat orbs ≥ 96px hitboxes, numpad keys ≥ 72px, all other interactives ≥ 44px.

### Canvas + DPR Setup

```js
canvas.width  = canvas.clientWidth  * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);
ctx.imageSmoothingEnabled = false;  // crisp ink lines
```

### Animation: Pivot-Based, Delta-Time

Each monster part has a pivot point and simple animation curves (sine-wave rotation, bounce, scale oscillation). Parts drawn in z-order with `ctx.save() / translate / rotate / drawImage / restore`. No parent-child transform chain. Idle / attack / hit / death animations all delta-time based.

### Audio

- **Web Speech** for all narration. Lazy-init in user gesture. Always `cancel()` then `setTimeout(speak, 50)` (iOS Safari quirk). `voiceschanged` listener for async voice list load. Per-character pitch/rate offsets via `monster.voiceProfile`.
- **Web Audio** for all SFX, all synthesized (sine/triangle/square + filtered noise + low-pass filter — KC4 precedent). `AudioContext` lazily created on first user gesture; oscillators scheduled inside `ctx.resume().then(() => ...)`.
- All loss/wrong sounds capped at "soft and cartoony" — no harsh or sudden audio.
- `prefers-reduced-motion` → screen shake + panel flashes drop to static highlight.

### State Machine

```
TITLE → HUB → REALM_PICK → RUN_MAP → FIGHT → RESULTS → HUB
                              ↕
                        SHOP / MYSTERY / REST nodes (overlays on RUN_MAP)
                              ↕
                          PAUSED (any state)
                       SETTINGS (overlay)
                           CODEX (overlay from HUB)
                       DECK_BUILD (overlay from HUB)
                       CLASS_PICK (overlay from HUB)
                          STORY (overlay after first boss clear)
```

State transitions cancel all timers/animations. Pause halts all `update(dt)` advancement and pauses speech. Settings/codex/deck-build/class-pick/story are overlay states layered over the screen they were opened from.

### Save System

- **LocalStorage key:** `claudes-math-marauder-save`
- **Backup key:** `claudes-math-marauder-save-backup`, written every 5 saves
- **Schema versioned:** `schemaVersion: 1` in save data
- **Auto-save:** debounced 500ms on combat resolve; eager save at every map node, every overlay close, every settings change
- **`SaveManager._defaults()`** must include every key game.js reads (CLAUDE.md completeness rule)
- **All save reads/writes** go through SaveManager — never direct `localStorage` access
- **Quota error** → user-visible toast (not silent failure)

### Save Schema (key: `claudes-math-marauder-save`)

```jsonc
{
  "schemaVersion": 1,
  "createdAt": 1714400000000,
  "lastPlayedAt": 1714400000000,
  "playerName": null,
  "totalRunsStarted": 0,
  "totalRunsCompleted": 0,
  "totalProblemsAnswered": 0,
  "totalCorrect": 0,
  "gold": 0,
  "ownedSpellIds": ["ember_bolt"],
  "equippedDeck": ["ember_bolt", null, null, null, null],
  "unlockedClassIds": ["apprentice"],
  "selectedClassId": "apprentice",
  "realmStars": {
    "goblin_forest": 0,
    "crystal_cave": 0,
    "dragon_peak": 0,
    "astral_void": 0,
    "lich_citadel": 0
  },
  "storyChaptersUnlocked": [],
  "mastery": {},
  "activeRun": null,
  "settings": {
    "speechVoiceURI": null,
    "speechRate": 1.0,
    "autoNarrate": true,
    "sfxVolume": 0.7,
    "muteAll": false,
    "reducedMotion": false,
    "fontScale": 1.0,
    "showSpeedTimer": false,
    "allowStretchFacts": true,
    "devMode": false
  }
}
```

### Mastery Engine — Leitner Spaced Repetition

Per-fact stats keyed by canonical id (`mul:7x8` smaller×larger; `div:56/7` larger÷smaller):

```jsonc
"mastery": {
  "mul:7x8": {
    "box": 3,
    "lastSeenAt": 1714400000000,
    "totalAsked": 14,
    "totalCorrect": 12,
    "avgMs": 2100,
    "streak": 4,
    "shaky": false
  }
}
```

**Box update on resolve:**
- Correct + fast (`< 2 × avgMs of mastered facts`) → `box = min(5, box + 1)`
- Correct + slow → `box` unchanged
- Wrong → `box = max(1, box - 2)`, `shaky = true`
- **Mastered = `box ≥ 4 && totalCorrect ≥ 6`**

**Problem selection (per problem):**
1. Build eligible-fact set from realm `factFamilyWeights`.
2. Compute weight per fact: `boxWeight[box] × shakyMultiplier × recencyDamping` where `boxWeight = {1:5, 2:4, 3:3, 4:2, 5:1}`, `shakyMultiplier = 2.5 if shaky else 1.0`, `recencyDamping = 0.3 if seen in last 5 problems else 1.0`.
3. With probability `0.10 + 0.02 × realmTier`, instead pull a stretch fact from a mastered family:
   - 5s: `5 × N` for `N ∈ [13, 30]`
   - 10s: `10 × N` for `N ∈ [13, 30]`
   - 2s: `2 × N` for `N ∈ [13, 50]`
4. Pick weighted-random.
5. 70% multiplication / 30% division by default; realm config can override.

Mastery recomputed/saved at end of every fight (batch write, not per-problem).

### Run Generation — Deterministic Branching Map

Map generated from `(runSeed, realmId)`. 10–12 nodes per run.

- One **START** node, one **BOSS** node (last)
- 4–5 columns of 1–3 nodes each, plus pre-boss merge
- Edges connect column N to column N+1 only
- Node-type distribution per realm (combat-heavy in early realms, more elites and shops late)
- All nodes BFS-reachable from START; BOSS reachable from every leaf path
- Same `(seed, realmId)` → byte-identical map (enables resume + replay)

### Combat Architecture

Per-fight state machine (driven by `game.js` RAF, no manager owns its own loop):

```
INTRO → PROBLEM → ANSWERING → RESOLVE → (PROBLEM | VICTORY | DEFEAT_RETRY)
```

**Three combat modes (D in brainstorm):**
1. **Orb cast** (default, ~85%) — 4 floating orbs (1 correct + 3 close-miss distractors), tap to cast
2. **Ultimate cast** (~10%) — typed answer on numpad, fires when ultimate meter is full
3. **Boss glyph combo** — bosses have HP = phase count (3–5); each phase has a labeled problem-kind; final realm-ending blow is always a typed stretch fact

**Speed scoring (no visible countdown):** `score = base + max(0, (5000 - answerTimeMs) / 50)`. Faster = bigger crit (felt via crit damage and screen flash, not a ticking timer).

**Distractor generation (orb cast):**
- For `a × b = c`: include `a × (b±1)`, `(a±1) × b`, `c ± 1`
- For `c ÷ a = b`: include `c - a`, `b ± 1`, factor-swap confusions
- All 4 orbs unique values; always exactly one correct; Fisher-Yates shuffle

**Per-correct juice:** burst-text ("ZAP!"/"BAM!"/"CRIT!"), halftone screen-flash (single frame, ≤ 80%), damage number fountain, streak counter tick, sparkle border at 3/5/10 streak.

**Per-wrong feedback:** wizard portrait shake, 800ms reveal of correct answer with audio narration ("the answer was 56"), streak resets to 0, mastery box decrements + `shaky = true`.

**Failure model (B3):** wizard HP is flavor only — going to 0 enters "second wind" retry, not run-loss. Stakes come from streak / score / 1-2-3⭐ rating.

### Comic-Effects Primitives (`fx/comicfx.js`)

| Primitive | What it does |
|---|---|
| `inkOutline(path, weight)` | Thick black wobble-line stroke |
| `halftoneFill(rect, color, density)` | Cached dot pattern |
| `speedLines(origin, dir, n)` | Radiating ink streaks |
| `burstText(x, y, word, size, color)` | Comic POW! with stroke + jitter |
| `panelFlash(color, alphaCurve)` | Single-frame screen tint |
| `inkBurst(x, y, radius, color)` | Splatter of ink dots |
| `wobbleStroke(path, seed)` | Hand-drawn jitter on any stroke |
| `panelBorder(rect, style)` | Black inset comic frame |
| `screenShake(intensity, ms)` | Translates whole canvas |

All effects seeded per-instance.

### File Structure

```
claudes-math-marauder/
  index.html
  css/
    style.css                 — design system, screens/overlays, comic palette, fonts
  js/
    game.js                   — main state machine, single RAF, screen management
    save.js                   — SaveManager (single key, schema v1, backup, _defaults)
    runtime.js                — run state lifecycle (start, advance, save, abandon)

    combat/
      factKeys.js             — canonical key construction (mul:AxB, div:c/a)
      mastery.js              — Leitner box updates, weight calc
      problemGen.js           — weighted problem selection, stretch-fact gate
      distractors.js          — orb distractor generation
      fight.js                — per-fight state machine, juice triggers
      ultimate.js             — typed-numpad ultimate spell
      bossFight.js            — multi-phase boss state machine

    fx/
      comicfx.js              — ink outline, halftone, speed lines, burst text, screen flash, ink burst, panel border, screen shake
      monsterRenderer.js      — walks parametric schema → drawImage from per-part offscreen cache
      wizardRenderer.js       — same model for wizard portrait per class
      shapes.js               — primitive shape generators (blob, egg, comic_pair eyes, fang_grin, etc.)
      particles.js            — small particle pool (sparkle, ember, ink-dot)

    run/
      mapGen.js               — deterministic branching map
      mapScreen.js            — map renderer + node click handlers
      events.js               — mystery event resolver
      shop.js                 — spell-shop offering generator + UI

    hub/
      hub.js                  — hub screen (realm picker, codex/deck/class entry)
      deckBuilder.js          — deck slot UI
      classPicker.js          — class selection UI
      codex.js                — mastery heatmap + drill-this-fact mini-fights
      story.js                — story-panel viewer with sentence highlighting

    audio/
      sfx.js                  — synthesized sound bank
      speech.js               — Web Speech wrapper (cancel + 50ms delay, voice list, rate)

    ui/
      hud.js                  — combat HUD (HP, streak, score, ultimate meter)
      overlay.js              — base overlay shell (focus trap, Escape, focus return)
      toast.js                — quota / save errors
      results.js              — results card after each run
      settings.js             — settings panel

    util/
      rng.js                  — seeded PRNG (Mulberry32) + hashString
      shuffle.js              — Fisher-Yates
      contrast.js             — color contrast checker (used by validator)
      escape.js               — escHtml helper

  data/
    realms.json               — 5 realm definitions
    monsters.json             — ~30 standard monsters
    bosses.json               — 5 boss schemas
    spells.json               — ~25 spells
    classes.json              — 5 wizard classes
    story.json                — 5 chapters + flavor lines
    events.json               — ~20 mystery events

  scripts/
    test-problem-gen.js
    test-mastery.js
    test-distractors.js
    test-map-gen.js
    test-save-migration.js
    validate-data.js
    check-contrast.js
    fuzz-runs.js
    replay.js
```

---

## Session Plan (14 sessions)

Each session ends with: tests pass → `marauder-web-review` agent → commit (and push). Full per-session detail lives in `sessions/session-NN.md`.

### Session 1 — Claude Tooling + Project Scaffold
Opus | Rules, hooks, skills, agents, validation, skeleton files, save schema, state machine shell, index.html registered

### Session 2 — Math Engine: Problem Generation, Distractors, Mastery
Opus | Pure-logic combat layer with full TDD coverage (no DOM). All Layer-1 tests passing.

### Session 3 — Comic Renderer + Monster Schema + Animation
Opus | `fx/comicfx.js`, `fx/monsterRenderer.js`, `fx/wizardRenderer.js`, `fx/shapes.js`, idle/attack/hit/death animations, demo screen

### Session 4 — Data Authoring Round 1 (Realm 1 Playable)
Sonnet | `data/realms.json` (all 5), `data/monsters.json` (~6 standards covering Realm 1), `data/spells.json` (~10 starters), `data/classes.json` (Apprentice + Pyromancer), `data/story.json` (chapter 1), `data/events.json` (5 events)

### Session 5 — Combat: Orb-Cast Loop
Opus | `combat/fight.js` state machine, problem panel, 4 floating orbs, correct/wrong resolve, damage numbers, streak counter, ultimate-meter accumulation, mastery save

### Session 6 — Combat: Typed Ultimate Spell
Sonnet | Numpad (≥72px keys), digit echo sigil, ⌫ + ✓, physical-keyboard support, big-damage payoff, fail-down-to-orb path

### Session 7 — Boss Fight: Glyph Combo
Opus | `combat/bossFight.js`, phase array drives problem kinds, glyph-shatter transition, narrated phase break, KO cinematic, Realm 1's Goblin Warlord boss end-to-end

### Session 8 — Audio: Web Speech + Web Audio SFX
Sonnet | Lazy-init audio context, full SFX bank, 🔊 button on every text block, auto-narrate setting, voice picker + speech-rate slider, monster taunts, wrong-answer narration, `prefers-reduced-motion` integration

### Session 9 — Run Map: Branching Graph + Resume
Opus | `run/mapGen.js` deterministic branching map, `scripts/test-map-gen.js`, map screen with inline panels per node type, node selection + path-tracking, mid-run auto-save, resume-on-reload. **Realm 1 playable end-to-end.**

### Session 10 — Hub + Meta-Progression
Opus | Hub screen (Wizard's Tower) with realm picker, deck builder, class picker, gold display, spell-shop in-run flow, codex (13×13 mastery heatmap + tap-to-drill mini-fights), star-rating system, story-panel viewer

### Session 11 — Data Authoring Round 2 (Fill the World)
Sonnet | Remaining ~25 monsters across realms 2–5, 4 more boss schemas, ~15 more spells, 3 more classes (Necromancer, Astromancer, Chronomancer), chapters 2–5 of story, 15 more mystery events; fuzz-run all 5 realms

### Session 12 — Cutscenes, Results Cards, Transitions
Sonnet | Story-panel viewer with sentence-by-sentence highlighting, narration auto-advance, results card (gold, stars, mastery delta, story unlock), comic page-turn screen transitions, KO cinematic for last boss of each realm

### Session 13 — Replay Harness, Dev Menu, Fuzzer
Sonnet | `scripts/replay.js` deterministic replay, dev menu (skip-to-boss, force-monster, set-mastery, voice debug), `scripts/fuzz-runs.js` (10k runs/realm assert no exceptions/NaN/dead loops)

### Session 14 — Accessibility, iPad QA, Final Polish
Opus | Full a11y audit (VoiceOver, contrast script, focus-trap audit, font-loading guards), iPad Safari 60fps verification, font-scale slider, settings panel finalized, error toasts, edge cases, final QA checklist, MEMORY.md update, push live

---

## Session Conventions (all sessions)

### Each session starts with:
1. Read this `plan.md` and the source spec at `docs/superpowers/specs/2026-05-01-claudes-math-marauder-design.md`
2. Read the corresponding `sessions/session-NN.md`
3. Run `/marauder-checklist` to review coding rules

### Each session ends with:
1. Run any new Layer-1 tests added in this session: `node claudes-math-marauder/scripts/test-*.js`
2. If `data/*.json` was modified, run `/validate-marauder-data`
3. Run `marauder-web-review` agent to catch bugs
4. If new gotchas discovered, append to MEMORY.md `## claudes-math-marauder: key gotchas` section
5. Commit all work with descriptive message
6. Push to `main` (the `update-index.yml` workflow will regenerate `index.html` and deploy)
7. Delete the working notes section (if any) but **leave the session file in place**

---

## Testing Strategy (Layered)

| Layer | What it covers | When it runs |
|---|---|---|
| **L1 — Node logic tests** (`scripts/test-*.js`) | Problem gen, distractors, mastery, map gen, save migration. Pure modules, no DOM. | After every relevant code change. |
| **L2 — Data validation** (`scripts/validate-data.js` + `/validate-marauder-data` skill) | Schema integrity, ID uniqueness/refs, color hex validity, contrast against cream, weights sum to ~1. | Auto via PostToolUse hook on `data/*.json` edit; manual after data sessions. |
| **L3 — Pre-implementation checklist** (`/marauder-checklist`) | The KC4/Petstore-derived rules most likely to cause bugs. | Before writing any session code. |
| **L4 — Manual playtest** (per-session checklist) | Hand-run iPad Safari pass tailored to that session's deliverables. | At session end. |
| **L5 — Code review** (`marauder-web-review` agent) | Diff vs spec; KC4/Petstore architecture rules; performance hot-paths; ARIA. | After every session before commit. |
| **L6 — Determinism + fuzz** (`scripts/replay.js`, `scripts/fuzz-runs.js`) | Replay reproducibility; 10k random runs no exceptions/NaN/dead loops. | Session 13 onward. |
| **L7 — Dev menu** | In-browser shortcuts (skip to boss, force monster, set mastery, voice debug). | Hidden behind `settings.devMode`. |

---

## Out of Scope (v1)

- Online multiplayer or cross-user leaderboards
- Cloud save (LocalStorage only)
- Custom monster/spell editor for the player
- Localization (English only)
- Pre-recorded voice acting (Web Speech only — confirmed)
- Music tracks (synthesized SFX only)

---

## Acceptance Criteria

The game is "done" when all 14 sessions complete and:

1. All Layer-1 logic tests pass (`node scripts/test-*.js` zero failures)
2. `/validate-marauder-data` reports zero errors
3. `scripts/check-contrast.js` reports zero WCAG AA violations
4. `scripts/fuzz-runs.js` completes 10k runs/realm with zero exceptions
5. Manual iPad Safari playtest: 60fps verified, VoiceOver navigates all screens, all 5 realms clearable
6. The kid plays a 10-minute session without expressing boredom, frustration, or asking for help reading
7. Game is registered in `.github/scripts/update-index.js` and deployed via the existing GitHub Pages workflow
