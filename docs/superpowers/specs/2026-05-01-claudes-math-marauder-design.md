# Claude's Math Marauder — Design Spec

**Date:** 2026-05-01
**Author:** Claude (in collaboration with Aaron)
**Folder:** `claudes-math-marauder/`
**Status:** Approved design, pending implementation plan
**Index card:** `🤖⚔️📐` "Claude's Math Marauder" — *"Claude built this fantasy roguelike where you cast multiplication and division spells to defeat goblins, dragons, and liches."*

---

## 1. Goal & Player

A browser-based fantasy roguelike that drills multiplication and division (factors 0–12, results 0–144, plus stretch facts in the 5s/10s/2s families up to ~30) for one specific 10-year-old player.

**Player profile:**
- Age 10, strong at math, bores easily, ADHD + dyslexia
- Loves fantasy: monsters, wizards, dragons, space battles, magic, graphic novels
- Struggles with reading — every dialogue/text block must be available as audio
- Plays in 5–15 minute sessions

**Design constraints derived from the player:**
- Anti-boredom: high novelty per fight, real player choice each run, never grind-locked
- Anti-frustration: no run-loss state (B3 retry-on-defeat), no countdown timers visible by default, no harsh audio
- Reading-light: all text narrated via Web Speech, large dyslexia-friendly font, sentence-per-panel max
- Difficulty calibration: adaptive (Leitner) so the kid is always at the edge of his ability

**Tech stack** (matches repo conventions): vanilla JavaScript, HTML5 Canvas 2D, Web Audio, Web Speech, LocalStorage. No frameworks, no build step, no npm. Deployed to GitHub Pages from `main`.

---

## 2. High-Level Game Loop

### 2.1 The fantasy

Player is a young apprentice wizard in the Tower of Numbers. Each run is a march through one of five **realms** (Goblin Forest → Crystal Cave → Dragon Peak → Astral Void → Lich Citadel) to defeat its boss, learn a chapter of the story, and bring back gold + spell scrolls.

### 2.2 Top-level state machine

```
TITLE
  ↓
HUB (Wizard's Tower)
  • Cast pool / deck builder (up to 5 equipped spells)
  • Class picker (unlocked wizards)
  • Codex (story panels, mastery heatmap, drill-this-fact)
  • Realm picker (start a run)
  ↓
RUN  ─ branching node map (10–12 nodes) ─
  Node types:
    ⚔️  Combat       (standard monsters, orb combat)
    👹  Elite        (tougher monster, guaranteed spell drop)
    🛒  Spellshop    (run-scoped buffs for gold)
    🔮  Mystery      (narrated event card with choices)
    💤  Rest         (heal flavor HP OR upgrade one spell)
    👑  Boss         (multi-phase glyph-combo combat — required to clear realm)
  ↓
RESULTS (graphic-novel card: gold earned, mastery deltas, story panel if first clear)
  ↓
HUB
```

### 2.3 Run length & shape

- **Map shape:** Slay-the-Spire branching graph (A1 in brainstorm).
- **Length:** 10–12 nodes per run, ~1 minute per node = 10–15 min per run target.
- **Generation:** deterministic from `(runSeed, realmId)`; same inputs produce identical map (enables resume + replay).

### 2.4 Failure model (B3 — retry-on-defeat, no run-loss)

- Wizard HP exists for *flavor and feedback*, not run-failure. Hitting 0 doesn't end the run.
- On defeat: the fight enters **second wind** — re-fight the same monster with an apology beat ("the Lich laughs — try again!"), streak resets to 0, retries++.
- Stakes come from three live meters tracked per run:
  1. **Streak counter** — fights cleared with no retries (multiplies score/gold)
  2. **Score** — base + speed crits + streak multiplier (logged to per-realm leaderboard-of-self)
  3. **Star rating** at run end:
     - 1⭐ cleared
     - 2⭐ cleared with ≤2 retries
     - 3⭐ cleared with 0 retries (perfect)
- Star unlocks gate next class / next realm (any star count clears the realm; higher stars accelerate meta-progression).

### 2.5 Meta-progression (D4 — all three tracks)

- **Gold** — earned per run, spent in hub on permanent spell unlocks
- **Class unlocks** — beat each realm boss (any star) to unlock its associated wizard class:
  - Apprentice (start) → Pyromancer → Necromancer → Astromancer → Chronomancer
  - Each class has a unique combat feel (see §6.3)
- **Story panels** — each first-time boss clear unlocks a graphic-novel cutscene panel (audio-narrated, big 🔊 button, sentence-by-sentence highlighting, skippable). 5 realms = 5 chapters.

### 2.6 Session-friendliness

- Auto-save after every node (resume mid-run if browser closes / tab crashes).
- "Quit run" returns to hub; current run is *abandoned* (not resumable from arbitrary point) — accepted gracefully, no guilt UI.
- Hub shows total runs, total problems solved, mastery heatmap, story progress.

---

## 3. Combat Architecture

### 3.1 Per-fight state machine

```
INTRO         → monster slides in, name banner, taunt narrated
PROBLEM       → comic panel reveals "7 × 8 = ?", four orbs float up
ANSWERING     → player taps orb / types ultimate / boss glyph
RESOLVE       → spell flies, ink-burst impact, damage numbers pop
                if monster HP ≤ 0 → VICTORY
                else → PROBLEM (next problem for next swing)
MONSTER_TURN  → woven into RESOLVE on wrong/slow answers (not a separate phase)
VICTORY       → reward card + node completion
DEFEAT        → second-wind retry (B3); streak reset; restart at INTRO
```

Every state is driven by `game.js` RAF — no manager has its own loop (KC4/Petstore single-RAF rule). All managers expose passive `update(dt)` / `draw(ctx, w, h)` methods.

### 3.2 Three combat modes (D in brainstorm)

#### 3.2.1 Orb cast (default, ~85% of problems)

- Problem panel renders top-center: `"7 × 8 = ?"` in OpenDyslexic, ~96px numerals
- 4 floating orbs at bottom — one correct, three close-miss distractors
- Tap or click an orb → wizard casts that spell → impact panel
- Speed scoring (no visible countdown):
  ```
  score = base + max(0, (5000 - answerTimeMs) / 50)
  ```
  Faster = bigger crit (felt via crit damage and screen flash, not ticking timer)
- Wrong orb: monster takes no damage, wizard takes a flavorful hit (portrait shake), the correct answer is briefly highlighted as a learning moment ("the answer was 56!") and narrated, then a new problem rolls.

#### 3.2.2 Ultimate cast (typed, ~10% of problems)

- Charge meter fills with each correct orb-cast (roughly 3 streak fills it once; modifiable by spells)
- Next problem after meter full = **ULTIMATE**: bigger panel, dramatic narration ("Speak the truth!"), on-screen numpad (and physical keyboard if connected) — type the answer, press Enter
- Correct → massive damage (often one-shot kill on standard mobs), comic "KO!" page-flash
- Wrong → meter drains, problem reverts to a normal orb cast at 0.5× damage
- Numpad: 0–9 + ⌫ + ✓; ≥72px keys; entered digits show in a glowing sigil at 96px **before** commit (catches digit-flips)

#### 3.2.3 Boss glyph combo (multi-step, bosses only)

- Bosses have HP equal to their **phase count** (3–5 phases) — KC4-proven pattern.
- Each phase is its own labeled attack with a unique problem flavor:
  - Shield phase: division
  - Curse phase: bigger-number multiplication
  - Final phase: a stretch fact (e.g., `5 × 20`) for the killing blow
- Phase 1–2 typically orb-cast; later phases force ultimate (typed). Final boss of a realm always ends with a typed killing-blow problem for cinematic punch.
- Between phases: short narrated taunt + glyph-shatter animation.

### 3.3 Distractor generation (critical for fairness)

For each problem `a × b = c` (or `c ÷ a = b`), the orbs include the correct answer plus three "plausible-misread" distractors drawn from:

- `a × (b±1)` and `(a±1) × b` (off-by-one factor)
- `c ± 1` (off-by-one product) — catches sloppy mental math
- For division: include `c - a`, `b ± 1`, factor-swap confusions
- Filter so all 4 orbs have unique values, all in plausible "kid would write this" range
- Always exactly one correct; shuffle position via Fisher-Yates (never `sort(() => Math.random()-0.5)` — Petstore rule)

### 3.4 Per-correct juice

- Comic burst-text ("ZAP!" / "BAM!" / "CRIT!") at impact point, font-size scales with damage
- Halftone screen-flash pulse (single frame, max 80% opacity — never strobe)
- Damage number fountains up and fades
- Streak counter ticks; at 3/5/10 streak, a sparkle border lights the panel
- Audio: synthesized hit thump + sparkle (Web Audio, lazy-init in user gesture)

### 3.5 Per-wrong feedback

- Wizard portrait shakes (CSS animation, no canvas hijack)
- Correct answer revealed for 800ms with audio narration ("the answer was 56")
- Streak resets to 0 (visible counter zeroes, soft "shink" sound)
- Mastery model bumps that fact toward "shaky" → next 1–2 problems more likely to drill it

---

## 4. Visual Renderer & Comic Style

### 4.1 Canvas setup

```js
canvas.width  = canvas.clientWidth  * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);
ctx.imageSmoothingEnabled = false;  // crisp ink lines
```

Single RAF chain owned by `game.js`; all draw passes are passive `update(dt)` / `draw(ctx, w, h)` methods on managers (KC4 + Petstore rule). Delta-time capped at 50ms.

### 4.2 Layered draw order per frame (back to front)

1. **Panel background** — solid zone color + halftone gradient (cached offscreen)
2. **Parallax silhouettes** — 2 layers of zone-specific landmarks (cached offscreen)
3. **Monster sprite** — procedural, drawn fresh each frame for animation
4. **Spell projectile** — only during RESOLVE; trail of ink dots
5. **Wizard portrait** — bottom-left frame, animates on hit/cast
6. **Comic-effects layer** — burst text, speed lines, screen-flash, panel flashes
7. **HUD overlay (DOM)** — HP bars, streak, score, ultimate meter, settings

HUD lives as DOM over the canvas (faster, accessible).

### 4.3 Comic-effects library (`fx/comicfx.js`)

| Primitive | What it does | When it fires |
|---|---|---|
| `inkOutline(path, weight)` | Thick black line w/ slight wobble | Around every monster shape, panel borders |
| `halftoneFill(rect, color, density)` | Cached dot pattern at scale-aware density | Backgrounds, monster shading, impact panels |
| `speedLines(origin, direction, n)` | Radiating ink streaks | Spell cast, monster charge, dash anim |
| `burstText(x, y, word, size, color)` | Comic "POW!" with stroke + jitter | Hit/crit/KO impacts |
| `panelFlash(color, alphaCurve)` | Single-frame screen tint | Crit, KO, level-up |
| `inkBurst(x, y, radius, color)` | Splatter of ink dots radiating out | Spell impact |
| `wobbleStroke(path, seed)` | Hand-drawn jitter to any stroke | Borders, speech bubbles |
| `panelBorder(rect, style)` | Black inset comic-panel frame | Boss intro cards, story cutscenes |
| `screenShake(intensity, ms)` | Translates whole canvas | Boss attacks, KO |

All effects are **seeded per-instance** (Petstore rule on cached procedural textures) so re-cached halftones render identically across LRU evictions.

### 4.4 Monster rendering — parametric "creature schema"

Each monster is data, not art:

```jsonc
{
  "id": "goblin_grunt",
  "name": "Goblin Grunt",
  "tier": 1,
  "hp": 1,
  "size": [180, 220],
  "palette": ["#3a6b2c", "#1b3618", "#f0d840"],
  "shape": {
    "body":  { "kind": "blob",      "rx": 70, "ry": 80, "wobble": 0.12 },
    "head":  { "kind": "egg",       "scale": 1.1, "tilt": -0.05 },
    "eyes":  { "kind": "comic_pair","size": 18, "expr": "angry" },
    "mouth": { "kind": "fang_grin" },
    "limbs": [ { "kind": "stub_arm", "side": "L" }, { "kind": "stub_arm", "side": "R" } ],
    "horns": null,
    "tail":  null
  },
  "anim": { "idle": "bob", "attack": "lunge", "hit": "squash" },
  "voiceTaunts": ["Tiny wizard! Easy lunch!", "Numbers won't save you!"],
  "spawnSfx": "goblinGrunt"
}
```

A `MonsterRenderer` walks the shape tree, draws each part procedurally (`inkOutline` + `halftoneFill`), applies palette, applies animation. ~25–30 standard monsters via parameter tweaks. 5 bosses authored more carefully (one per realm).

### 4.5 Animation system

- Idle: per-monster `update(dt)` advances a phase clock; positions limbs/head via sine-wave offsets
- Attack: short curve (translate forward → squash → return) over 350ms; drives `monster.x` offset
- Hit reaction: flash white 60ms, squash 80% scale 100ms, return; `screenShake`
- Death: ink-burst + halftone fade-out + comic "KO!" burst-text, 600ms total, monster removed at end
- All animations delta-time based, capped at 50ms (Petstore RAF-throttling rule)

### 4.6 Realm visual themes

| Realm | Palette | Halftone color | Silhouettes | Sky/panel BG |
|---|---|---|---|---|
| Goblin Forest | greens + browns | green dots | gnarled trees, mushrooms | dawn green-yellow |
| Crystal Cave | violets + cyan | violet dots | stalactites, gem clusters | dark blue gradient |
| Dragon Peak | reds + oranges | red dots | jagged peaks, lava | sunset crimson |
| Astral Void | indigo + magenta | white dots on dark | floating debris, planets | starfield |
| Lich Citadel | grayscale + sickly green | green dots on slate | skeletal towers, gravestones | overcast gray-green |

Each realm has 4–5 monsters from the parametric schema + 1 hand-tuned boss + a unique parallax background.

### 4.7 Wizard portrait

- Bottom-left frame, 220×260px, panel-bordered
- Class-specific look: same base wizard schema, different palette/staff/hat per class
- Animates on cast (staff thrust + speed-lines), on hit (face flash + portrait shake), on ultimate-charge-full (sparkle aura)

### 4.8 Performance targets

- 60fps on iPad Safari
- ≤ 50ms dt cap
- ≤ 30 active offscreen canvases (Petstore LRU pattern; warn + LRU evict if exceeded)
- No per-frame `SaveManager.load()` — cache run/creature state on state entry, invalidate on save

---

## 5. Audio System

Two paths, both lazy-init in a user gesture (CLAUDE.md iOS Safari rule).

### 5.1 Web Speech API — narration & dialogue

- All on-screen text > ~3 words gets a 🔊 button to read aloud
- "Auto-narrate" toggle (default ON; tap-to-replay always available)
- Voice picker: lists `speechSynthesis.getVoices()`, prefers known-good iPad voices ("Daniel (United Kingdom)", "Karen", "Samantha", "Moira")
- Speech-rate slider: 0.7×–1.3×, default 1.0×
- Playback rule:
  ```js
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 50);
  ```
- `voiceschanged` event listener loads voice list async (iOS delays it)
- Per-character voice flavor: small pitch/rate offsets via `monster.voiceProfile`

**Narration sources:**
- Title screen welcome
- Hub navigation announcements
- Monster intro taunts (drawn from `voiceTaunts`)
- Boss intro speech
- Wrong-answer correction ("the answer was 56")
- Story cutscene panels (sentence-by-sentence with auto-advance)
- Mystery node event text
- Settings/menu announcements

### 5.2 Web Audio — synthesized SFX

Single `AudioContext` lazily created on first user interaction; `ctx.resume().then(() => schedule())` for oscillators (CLAUDE.md). All SFX synthesized — no audio files (consistent with KC4).

| Sound | Synth recipe |
|---|---|
| Orb hover | sine 600Hz, 80ms, low-pass 1500Hz |
| Orb tap (correct) | square 220→880Hz sweep, 120ms, fast attack, soft release |
| Spell cast | triangle + filtered noise burst, 200ms |
| Hit (normal) | low square 110Hz + filtered noise thump, 150ms |
| Crit hit | hit + bright sparkle (sine 1760Hz arpeggio) |
| Wrong answer | low triangle 80Hz, 200ms, soft (cute-end, never harsh — Petstore rule) |
| Streak chime (3/5/10) | bell-like 3-note arpeggio, sine + harmonic |
| Ultimate charge full | rising sine 220→880Hz, 600ms |
| Ultimate fire | layered sweep + screen-flash sync |
| Boss spawn | low rumble (filtered noise) + dramatic chord |
| KO | triumphant 4-note motif |
| Page-flip (transitions) | paper rustle (filtered noise burst) |
| UI button tap | soft click, 40ms |

Master volume slider + mute toggle in settings; persists in save.

### 5.3 ARIA + audio together

- `aria-live="polite"` regions for score / streak / "answer was X" correction
- Never combine `aria-live` with `aria-hidden` toggling (CLAUDE.md)
- Never put `aria-label` on aria-live regions
- 🔊 button is real `<button>` with `aria-label="Read aloud"`; updates to `"Replay"` after first use; uses `disabled` attribute when speech unavailable

### 5.4 Reduced-motion

- `prefers-reduced-motion` media query auto-disables screen shake + panel flashes (effects fall back to static highlight)
- Manual override toggle in settings

---

## 6. Data Model & Authored Content

### 6.1 Authored data files (ship in `data/`)

- **`data/realms.json`** — 5 realm definitions (palette, halftone, silhouettes, music key, fact-family weights, monster pool, boss id, story chapter id)
- **`data/monsters.json`** — ~30 standard monsters (parametric schemas)
- **`data/bosses.json`** — 5 boss schemas (one per realm) with phase arrays
- **`data/spells.json`** — ~25 spells
- **`data/classes.json`** — 5 wizard classes
- **`data/story.json`** — 5 chapters (~6–10 short narrated lines each) + run-flavor lines (taunts, victory blurbs)
- **`data/events.json`** — ~20 mystery-node events (narrated prompt + 2–3 choices + outcomes)

### 6.2 Spell schema

```jsonc
{
  "id": "ember_bolt",
  "name": "Ember Bolt",
  "rarity": "common",
  "tier": 1,
  "classRestrict": null,
  "fxColor": "#ff7733",
  "fxKind": "spark",
  "modifiers": {
    "baseDamageBonus": 0,
    "speedCritBonus": 0.1,
    "streakBonusBonus": 0,
    "ultimateChargeBonus": 0.2
  },
  "unlock": { "kind": "shop", "cost": 30 }
}
```

A run carries a "deck" of up to 5 equipped spells. Effects stack additively. `fxColor`/`fxKind` make each spell visually distinct in combat.

### 6.3 Class schema

```jsonc
{
  "id": "pyromancer",
  "name": "Pyromancer",
  "passive": {
    "type": "crit_chain",
    "description": "Each consecutive correct answer increases crit damage by 5% (caps at 50%)."
  },
  "starterDeck": ["ember_bolt", "kindle_step", "ash_shield"],
  "unlock": { "kind": "boss_clear", "realm": "goblin_forest", "minStars": 1 },
  "wizardSchema": { /* portrait params */ }
}
```

Class roster:
- **Apprentice** (start) — vanilla
- **Pyromancer** — chains crits
- **Necromancer** — steals flavor-HP on correct
- **Astromancer** — slows monster attack timing
- **Chronomancer** — reveals one wrong distractor for free, once per fight

### 6.4 Run state (in-memory; auto-saved per node for resume)

```jsonc
{
  "runId": "uuid",
  "realmId": "goblin_forest",
  "classId": "apprentice",
  "deck": ["ember_bolt", "...", "..."],
  "seed": 1209384,
  "mapNodes": [/* generated branching graph */],
  "currentNodeId": "n3",
  "wizardHpFlavor": 60,
  "streak": 5,
  "score": 1240,
  "retries": 1,
  "ultimateCharge": 0.7,
  "goldThisRun": 24,
  "spellsAddedThisRun": [],
  "factsThisRun": [/* {factKey, correct, ms} */],
  "startedAt": 1714400000000
}
```

### 6.5 Mastery engine — Leitner spaced repetition

#### Fact keys (canonical, dedupe commutative pairs)

- `"mul:7x8"` — always smaller × larger
- `"div:56/7"` — always larger ÷ smaller form

#### Per-fact stats

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

#### Box update rule on resolve

- Correct + fast (`< 2 × avgMs of mastered facts`) → `box = min(5, box + 1)`
- Correct + slow → `box` unchanged
- Wrong → `box = max(1, box - 2)`, `shaky = true`
- **Mastered = `box ≥ 4 && totalCorrect ≥ 6`**

#### Problem selection (per problem)

1. Build eligible-fact set from realm's `factFamilyWeights`
2. Compute pull weight per fact:
   ```
   weight = boxWeight[box] × shakyMultiplier × recencyDamping
   boxWeight = [_, 5, 4, 3, 2, 1]   // lower box = higher weight
   shakyMultiplier = 2.5 if shaky else 1.0
   recencyDamping = 0.3 if seen in last 5 problems else 1.0
   ```
3. With probability `0.10 + 0.02 × realmTier` (0.12 in realm 1 → 0.20 in realm 5), instead pull a **stretch fact** from a mastered family (`5×N`, `10×N`, `2×N` where N ∈ {13..30}, plus their division inverses)
4. Pick weighted-random from the resulting distribution
5. 70% multiplication / 30% division by default; realm config can override

Mastery is recomputed/saved at end of every fight (batch write, not per problem).

### 6.6 Save schema (key: `claudes-math-marauder-save`)

```jsonc
{
  "schemaVersion": 1,
  "createdAt": 1714400000000,
  "lastPlayedAt": 1714400000000,
  "playerName": null,
  "totalRunsStarted": 7,
  "totalRunsCompleted": 5,
  "totalProblemsAnswered": 412,
  "totalCorrect": 380,
  "gold": 142,
  "ownedSpellIds": ["ember_bolt", "kindle_step", "ash_shield", "frost_orb"],
  "equippedDeck": ["ember_bolt", "frost_orb", "kindle_step", "ash_shield", null],
  "unlockedClassIds": ["apprentice", "pyromancer"],
  "selectedClassId": "pyromancer",
  "realmStars": {
    "goblin_forest": 3,
    "crystal_cave": 2,
    "dragon_peak": 0,
    "astral_void": 0,
    "lich_citadel": 0
  },
  "storyChaptersUnlocked": ["chapter_1", "chapter_2"],
  "mastery": { /* per-fact stats */ },
  "activeRun": { /* run state above; null when no run in progress */ },
  "settings": { /* §6.7 */ }
}
```

**SaveManager contract:**
- Single key, schema-versioned (Petstore pattern)
- Backup key: `claudes-math-marauder-save-backup`, updated every 5 saves
- All save reads/writes through SaveManager — never direct `localStorage`
- `_defaults()` includes every field game.js reads (CLAUDE.md completeness rule)
- `try/catch` quota errors → user-visible toast
- Migration step on load: `schemaVersion < current` → run versioned migrators

### 6.7 Settings sub-object

```jsonc
"settings": {
  "speechVoiceURI": "com.apple.speech.synthesis.voice.daniel",
  "speechRate": 1.0,
  "autoNarrate": true,
  "sfxVolume": 0.7,
  "muteAll": false,
  "reducedMotion": false,
  "fontScale": 1.0,
  "showSpeedTimer": false,
  "allowStretchFacts": true
}
```

### 6.8 Per-fact analytics in-game (Codex)

- Codex screen in hub shows a 13×13 grid (0–12 × 0–12) of multiplication facts
- Each cell colored by box: red (1) → orange → yellow → green (4+) → gold (mastered)
- Tap a cell → fact, current stats, "drill this one" button (queues 5-problem mini-fight on that fact, small reward, no run consumed)
- Same for division (separate grid view)
- Makes mastery progress legible to the kid and gives him agency over what to drill

---

## 7. Accessibility, Dyslexia & ADHD Specifics

### 7.1 Hard-required (from project CLAUDE.md)

- **Font:** OpenDyslexic via `<link rel="stylesheet">` (CDN), Comic Sans MS fallback. Never `@import` in CSS. Canvas text uses `ctx.font = '20px OpenDyslexic, "Comic Sans MS", cursive'` and waits on `document.fonts.ready` before first canvas text render.
- **Min font size 16pt.** Default game-text 20px. Problem panel numerals 64–96px.
- **Line height 1.5–2×** everywhere.
- **Cream background** (`#F5F0E8`), **dark text** (`#2C2416`), secondary `#595143`. WCAG AA contrast 4.5:1 verified across all text/UI pairs by `scripts/check-contrast.js`.
- **Touch targets ≥ 44×44px.** Combat orbs 96px, numpad keys 72px, settings switches 48px.
- **No `user-scalable=no`** in viewport meta — pinch-zoom must work.
- **No flashing/strobing.** Panel-flash peaks at 80% opacity for ≤ 1 frame, never repeats within 500ms. `prefers-reduced-motion` strips flashes + screen-shake; manual override toggle.
- **No countdown timers visible by default.** Speed scoring is invisible (only the bonus damage appears). Settings flag "show speed timer" off by default.

### 7.2 Dyslexia-specific

- **Numeral clarity:** problem-panel numerals use OpenDyslexic; for `6/9/0` distinction, render with extra letter-spacing and a tiny serif foot baked into the canvas drawing
- **Typed-input echo:** ultimate numpad shows entered digits at 96px in glowing sigil **before** commit; ⌫ corrects without penalty
- **Wrong-answer narration always speaks the correct answer.** ("the answer was fifty-six")
- **Story / dialogue text size 22px+, narrated by default.** Sentence-by-sentence highlighting (current sentence has yellow `#fef0a0` background tint)
- **Single sentence per panel max.** Story chapters break long passages into short panels.
- **No required reading.** Every interactive element has icon + tooltip + audio narration; text labels never carry sole meaning.

### 7.3 ADHD-specific

- **No anxiety mechanics.** No countdown timers in combat. No HP-based run-failure (B3). No "you're doing badly" copy ever — wrong-answer text is neutral.
- **High novelty per fight.** Random monsters, random map paths, random spell-shop offerings, random mystery events. Every fight has visual variation (palette, monster shape, taunt).
- **Short clear loops.** ~60 sec per fight, ~10–15 min per run. Auto-save after every node so quitting mid-run isn't a loss.
- **Big visible reward per correct answer.** Burst-text + sound + damage number + streak meter tick.
- **Pause is real.** Pause overlay anywhere → all timers/animations halt; `update(dt)` short-circuits when state is `PAUSED`. Resume returns to exactly the same problem. Timer callbacks tolerate PAUSED state (KC4 rule).
- **Skip / fast-forward respected.** Cutscenes, monster intros, results cards have a skip button (focus-on-open, Escape closes). Boss intros skippable after 1.5s minimum.
- **No grinding gates.** Every realm unlocks via *clearing* the previous realm at any star count — never "earn 200 gold first."
- **Choice everywhere.** Branching map nodes, mystery options, spell-shop picks, class selection, deck slot choice — every run has 8–12 small player decisions.

### 7.4 State-machine accessibility hooks

- Screen visibility uses **CSS classes only** (CLAUDE.md): `.active` (screens), `.open` (overlays), `.hidden` (internal). No `style.display` assignments in JS.
- Modals: `<div role="dialog" aria-modal="true" aria-label="...">` (never `<aside>`). Close button first focusable. Tab/Shift-Tab focus trap + Escape to close. `aria-hidden` always explicit `'true'`/`'false'`. Focus returns to trigger button on close.
- Focus-trap Escape handler guards `if (overlay.classList.contains('open'))` (CLAUDE.md stale-handler rule).
- `aria-pressed` only on toggle buttons with persistent state (deck slot, equipped class). `role="option"` inside `role="listbox"` uses `aria-selected`. Use `role="group"` for the spell-deck grid (not `role="list"` with `<button>` children).
- All dynamic `textContent` updates on labelled elements also update `setAttribute('aria-label', ...)`.
- `aria-live="polite"` regions for streak/score/correction. Never combined with `aria-hidden` toggling. No `aria-label` on aria-live regions.
- Native `<button disabled>` for locked spells/realms. `.locked` class is supplementary visual only.
- Filtered list items toggle `aria-hidden` on hidden cards so AT counts stay accurate. Overlays always use explicit `'true'`/`'false'` — never `removeAttribute`.

### 7.5 Settings panel

| Setting | Default | Notes |
|---|---|---|
| Master mute | off | persists |
| SFX volume | 0.7 | slider |
| Speech rate | 1.0× | 0.7–1.3 |
| Speech voice | system best | dropdown |
| Auto-narrate | on | first run |
| Reduced motion | follows OS | manual override |
| Font scale | 1.0× | 0.9 / 1.0 / 1.1 / 1.25 / 1.5 — applied via `document.documentElement.style.fontSize`, not by re-declaring CSS vars |
| Show speed timer | off | adult-debug-style toggle |
| Allow stretch facts | on | parental opt-out |
| Reset progress | button | confirmation dialog |

---

## 8. Testing Strategy

The repo has no unit-test framework and no build step, so testing is **layered**: pure-logic Node scripts for deterministic systems, validation scripts for data files, manual playtest checklists per session, and a code-review agent per session.

### 8.1 Layer 1 — Node-runnable logic tests (`claudes-math-marauder/scripts/test-*.js`)

Combat engine's deterministic layers are pure modules (no DOM, no canvas) so Node can `require()` them. Each test asserts and prints `PASS`/`FAIL`.

**`scripts/test-problem-gen.js`**
- All `mul:AxB` keys for `0 ≤ A ≤ B ≤ 12` produce correct answers
- Division generator never produces non-integer result
- Distractor pool: every set of 4 orbs contains exactly one correct, all unique, all in plausible range
- Distractors never include the correct answer twice
- Stretch-fact gate: a fact family below mastery threshold never produces stretch problems
- Determinism: same `(seed, masteryState, realmId)` → same problem sequence

**`scripts/test-mastery.js`**
- Correct + fast → box increments (capped at 5)
- Wrong → box decrements by 2 (floored at 1) and `shaky=true`
- Mastered flag only when `box ≥ 4 && totalCorrect ≥ 6`
- `recencyDamping` and `shakyMultiplier` produce expected weight distribution
- Simulated 200-problem run from blank converges most fact-keys into box 3+ when answered correctly
- Save/load round-trip preserves all mastery fields

**`scripts/test-distractors.js`**
- For 1000 random `(a, b)` pairs in 0..12: distractors always unique, in plausible range, never negative, never identical to correct
- For 200 division problems: factor-swap confusion included when distinct from other distractors

**`scripts/test-map-gen.js`**
- Every map: exactly one START, one BOSS
- All nodes reachable from START (BFS)
- BOSS reachable via every leaf path
- Total node count ∈ [10, 12]
- Node-type distribution within configured ranges per realm
- Same `(seed, realmId)` → identical map (determinism for resume)

**`scripts/test-save-migration.js`**
- v1 ↔ v1 round-trip preserves all fields
- Synthetic `v0` (missing `mastery`, missing `unlockedClassIds`) migrates cleanly with defaults
- Corrupt JSON triggers backup-key recovery + user-visible toast (mock; asserts code-path taken)
- `_defaults()` includes every key game.js reads (asserted via grep across `js/**`)

### 8.2 Layer 2 — Data validation skill `/validate-marauder-data`

A skill (and matching `scripts/validate-data.js`) runs after any edit to `data/*.json` (auto via PostToolUse hook, like petstore). Checks:

- All monster `id` values unique; referenced from realm pools without typos
- All boss `id` values unique; phases array length === hp; every phase shortcutId references a valid problem-kind
- All spell `id` values unique; `unlock.kind ∈ {"shop","boss_clear","starter"}`; `classRestrict` either null or refers to existing class
- All class `starterDeck` IDs reference real spells; `unlock.realm` references real realm
- All story chapter IDs match realm IDs; chapter line count between 4 and 12
- All event choices have ≥1 outcome; outcomes reference valid keys
- All palette colors valid hex; meet WCAG AA against cream where used as text/UI color
- Realm `factFamilyWeights` sum to within `[0.95, 1.05]`
- No unreferenced data files

### 8.3 Layer 3 — Pre-implementation checklist `/marauder-checklist`

Mirrors `petstore-checklist`/`kc4-checklist`: prints rules most likely to cause bugs, run **before** writing any session code. Includes:

- Single RAF chain rule (only `game.js`)
- Timer lifecycle pattern (every manager: null timers, `cancel()`, `complete()` save-cb-before-cancel, `start()` defensive reset)
- Web Audio iOS quirks
- Web Speech iOS quirks
- `aria-hidden` explicit, `aria-pressed` rules, `role="list"`/`role="button"` rule
- `try/catch` async overlay timing
- `SaveManager._defaults()` completeness
- Re-entry guards on shared callbacks
- Visibility classes only — no `style.display`
- Dynamic `aria-label` updates with `textContent`
- `setInterval`/`setTimeout` PAUSED-state tolerance

### 8.4 Layer 4 — Per-session manual playtest checklist (in each `sessions/session-NN.md`)

Each session ends with a hand-run iPad Safari playtest checklist tailored to that session's deliverables. This caught most of the bugs in petstore and KC4.

### 8.5 Layer 5 — Code-review agent `marauder-web-review`

A new Claude agent definition in `.claude/agents/marauder-web-review.md` (mirroring petstore-web-review / kc4-web-review). Run after each session before commit. Reviews:

- Diff against the session's spec
- KC4/Petstore architecture rules (RAF, timers, audio init, Save, ARIA)
- Performance hot-paths (no per-frame allocs, no per-frame `SaveManager.load()`)
- Accessibility (focus management, Escape guards, aria-live conflicts)
- The `marauder-checklist` rules

### 8.6 Layer 6 — Determinism harness for combat replays

Combat is fully deterministic given `(runSeed, masteryState, inputSequence)`.

- `scripts/replay.js <run.json>` runs a saved input sequence headlessly through the combat engine and asserts the same final state
- Debug menu in dev mode can save a replay file from a live run; replay reproduces exact problem set / orb arrangement / mastery deltas
- Bonus fuzzer: `scripts/fuzz-runs.js` runs 10k random runs per realm, asserts no exceptions, no NaN damage, no infinite loops, all mastery keys remain valid

### 8.7 Layer 7 — In-browser dev menu

Hidden behind a settings checkbox `dev mode`. Adds:

- "Skip to boss" button on map screen
- "Set mastery state" panel — bulk-set boxes for testing problem generation
- "Force monster" picker
- "Replay last run" button
- "Speech voice debug" — list all voices with sample-play

Dev mode never auto-enables and is invisible to normal play.

### 8.8 Verification matrix

| Bug class | Caught by |
|---|---|
| Wrong math answers | Layer 1 (test-problem-gen) |
| Bad orb distractors | Layer 1 (test-distractors) |
| Mastery drift | Layer 1 (test-mastery) + Layer 6 (fuzz) |
| Unreachable map nodes | Layer 1 (test-map-gen) |
| Save schema corruption | Layer 1 (test-save-migration) + Layer 5 (review) |
| Bad data file | Layer 2 (`/validate-marauder-data` + hook) |
| RAF/timer/Web Audio init bugs | Layer 3 (checklist) + Layer 5 (review) |
| Performance regressions | Layer 5 (review) + Layer 4 (playtest) |
| Accessibility regressions | Layer 5 (review) + Session 14 a11y pass |
| Unfair fight feel | Layer 6 (replay) |

---

## 9. Implementation Plan — Session Breakdown

This is the *shape*; the full per-session detailed plan is produced by the writing-plans skill after this design is approved. Each session is sized for one Claude work block ending with: tests pass → `marauder-web-review` agent → commit.

| # | Session | Focus | Key Deliverables |
|---|---|---|---|
| **1** | Skeleton + Save + Tests scaffolding | Foundations | Repo structure, `index.html` registered in `update-index.js`, CSS design system (cream + comic palette), state-machine shell (TITLE/HUB/RUN/FIGHT/RESULTS/PAUSED), SaveManager schema v1 + backup, `scripts/test-save-migration.js`, `scripts/validate-data.js`, `/marauder-checklist` skill, `/validate-marauder-data` skill, post-tool-use hook, `marauder-web-review` agent definition, `.claude/rules/marauder.md` rules file. |
| **2** | Problem generation + mastery engine | Pure logic, no UI | `combat/problemGen.js`, `combat/mastery.js` (Leitner boxes, recency, shaky), `combat/distractors.js`, `combat/factKeys.js`, stretch-fact gate, `scripts/test-problem-gen.js`, `scripts/test-mastery.js`, `scripts/test-distractors.js`. All Layer-1 tests passing. |
| **3** | Comic renderer + monster schema | Visual identity | Canvas + DPR, single RAF in `game.js`, `fx/comicfx.js` library, `MonsterRenderer` walks parametric schema, idle/attack/hit/death animations, offscreen caching for backgrounds + monster bases. Demo screen renders one of each shape primitive. |
| **4** | Data authoring round 1 | Realm + monsters | `data/realms.json` (5 realms), `data/monsters.json` (5–6 monsters across realms — covers Realm 1 fully + one of each for later), `data/spells.json` (~10 starters), `data/classes.json` (Apprentice + Pyromancer), `data/story.json` (chapter 1), `data/events.json` (5 events). All validated. |
| **5** | Combat — orb cast loop | Standard fight | `combat/fight.js` state machine, problem panel rendering, 4 floating orbs with hover/tap, correct/wrong resolve, damage numbers, streak counter, ultimate-meter accumulation, mastery save on resolve, retry-on-defeat (B3), wizard portrait reactions. iPad pointer-events tested. |
| **6** | Combat — ultimate cast (typed) | Numpad spell | Ultimate trigger when meter full, on-screen numpad (≥72px keys), digit echo sigil, ⌫ + ✓, physical-keyboard support, big-damage payoff, fail-down-to-orb path. |
| **7** | Combat — boss glyph combo | Multi-phase boss | Boss state machine extension, phase array drives problem kinds, glyph-shatter transition between phases, dramatic narration + screen flash on phase break, KO cinematic. Implement Realm 1's Goblin Warlord boss end-to-end. |
| **8** | Audio: Web Speech + Web Audio | Voice + SFX | Lazy-init audio context, full SFX bank, every text block has 🔊 button, auto-narrate setting, voice picker + speech-rate slider, monster taunt narration, wrong-answer narration ("the answer was 56"), `prefers-reduced-motion` integration. |
| **9** | Run map + node graph | Branching shape | `run/mapGen.js` deterministic branching map (10–12 nodes/realm), `scripts/test-map-gen.js`, map screen renders connected nodes with inline panels per type, node selection + path-tracking, mid-run auto-save, resume-on-reload. **Realm 1 fully playable end-to-end here.** |
| **10** | Hub + meta-progression | Outside the run | Hub screen (Wizard's Tower) with realm picker, deck builder (drag/tap to slot up to 5 spells), class picker, gold display, spell-shop in-run flow, codex screen with mastery heatmap (13×13 grid + tap-to-drill mini-fights), star-rating system on run completion, story-panel viewer. |
| **11** | Data authoring round 2 | Fill the world | Remaining ~25 monsters across realms 2–5, 4 more boss schemas, ~15 more spells, 3 more classes (Necromancer, Astromancer, Chronomancer), chapters 2–5 of story, 15 more mystery events. Validate. Fuzz-run all 5 realms. |
| **12** | Cutscenes + results cards + transitions | Polish layer | Story-panel viewer with sentence-by-sentence highlighting, narration auto-advance, results card after each run (gold, stars, mastery delta, story unlock if first clear), comic page-turn screen transitions, KO cinematic for last boss of each realm. |
| **13** | Replay harness + dev menu + fuzzer | QA tools | `scripts/replay.js` deterministic replay, dev menu (skip-to-boss, force-monster, set-mastery, voice debug), `scripts/fuzz-runs.js` (10k runs/realm assert no exceptions/NaN/dead loops). |
| **14** | Accessibility + iPad QA + final polish | Ship | Full a11y audit (VoiceOver pass, contrast script, focus-trap audit, font-loading guards), iPad Safari 60fps verification (devtools profiler), font-scale slider, settings panel finalized, error toasts, edge cases (corrupt save, 0 mastery, 100% mastery, rapid-tap), final QA checklist, MEMORY.md update, push live. |

**Why this ordering:**

- Tests + scaffolding first (Sessions 1–2) so every later session lands on a green base
- Combat (5–7) gated on data (4) gated on renderer (3) gated on logic (2) — no fake placeholders that get rewritten
- One realm playable end-to-end at Session 9 — the kid can playtest a real-but-narrow version mid-build
- Authoring round 2 (11) deliberately late so we've validated the data shape against working code first
- Polish (12, 14) at the end where it lands hardest

**Session size budget:** roughly mirrors petstore's 13-session cadence. Each session ends with `marauder-web-review` + manual playtest before commit.

---

## 10. Open Questions for Implementation Plan

Things to nail down when writing the per-session implementation plan (not blockers for the spec):

- Exact orb layout: 2×2 grid vs single arc? (orb count fixed at 4)
- Map node visual: lines vs dotted paths? Animated reveal as you advance?
- Class portraits: are all 5 wizards visually distinct enough via palette swap, or do they need different schemas? (Lean toward palette swap for v1.)
- Spell shop UX: 3 random offerings vs full owned-deck swap-in? (Lean toward 3 random.)
- Mystery events: how dialog-heavy can they get without breaking the reading-light goal? (Cap at 2 short narrated sentences per event prompt.)
- Boss intro cinematic length: aim for ≤ 8 seconds, skippable after 1.5s.

---

## 11. Out of Scope (v1)

- Online multiplayer
- Real-time leaderboards across users (per-self-best is in scope)
- Cloud save (LocalStorage only)
- Custom monster/spell editor for the player
- Localization (English only)
- Touch-drag deck reordering with animation (tap-to-swap is fine for v1)
- Pre-recorded voice acting (Web Speech only — confirmed)
- Music tracks (synthesized SFX only — KC4 precedent)

---

## 12. Acceptance Criteria

The game is "done" when:

1. All 14 sessions complete, each with `marauder-web-review` clean
2. All Layer-1 logic tests pass (`node scripts/test-*.js`)
3. `/validate-marauder-data` reports zero errors
4. `scripts/check-contrast.js` reports zero WCAG AA violations
5. `scripts/fuzz-runs.js` completes 10k runs/realm with zero exceptions
6. Manual iPad Safari playtest: 60fps verified, VoiceOver navigates all screens, all 5 realms clearable
7. The kid plays a 10-minute session without expressing boredom, frustration, or asking for help reading
8. Game is registered in `.github/scripts/update-index.js` and deployed via the existing GitHub Pages workflow

---

*End of design.*
