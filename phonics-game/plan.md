# Phonics Matching Game — Revised Design Plan

*Revised 2026-02-19 incorporating three expert reviews: web developer (technical feasibility),
UX/game design (engagement + mechanics), and phonics education (curriculum + ADHD/dyslexia).*

---

## 1. Overview

A tap-to-match phonics game for grades 1–5. Children see a grid of word tiles; they tap words
that share the same phonics pattern to clear them. As they master patterns, the word pool grows
and grid size scales. The game speaks every word aloud on tap — no audio files needed.

**Target audience:** Grades 1–5 (ages 6–11), including students with dyslexia and ADHD.
**Platform:** iPad Safari (primary); desktop Chrome/Firefox (secondary). GitHub Pages hosted.
**Session length:** 5–12 minutes recommended; no forced minimum.

---

## 2. Critical Architecture Decisions

### 2.1 Rendering: DOM + CSS Grid (not Canvas)

Canvas is wrong for word tiles. Word tiles are primarily text — they need:
- Native browser font rendering (OpenDyslexic renders poorly on Canvas)
- CSS transitions for tile animations
- Native touch event handling
- Accessible text for screen readers and ARIA

Use `<div>` tiles laid out with CSS Grid. Animations via CSS transitions and `classList`.

### 2.2 Audio: Web Speech API (SpeechSynthesis)

Do NOT ship 500 audio files (~50MB). Instead use the browser's built-in SpeechSynthesis API:
```js
function speak(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.85;  // Slightly slower for clarity
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
}
```
SpeechSynthesis is available in all modern browsers including iOS Safari. Zero download.
Falls back silently if unavailable. Works offline after first page load.

### 2.3 Script Loading: `<script defer>` with global classes

Use the same pattern as all other games in this repo. No ES6 modules (`type="module"`).
This avoids CORS issues in local file:// testing, matches the project's established pattern,
and reduces complexity.

### 2.4 Game Mechanic: Tap-to-Select (not Swap)

Do NOT use the Candy Crush swap mechanic. Swap requires:
1. Identify a phonics pattern (linguistic abstraction)
2. Plan spatial adjacency (spatial reasoning)
3. Execute the swap correctly

Combining phonics recognition with spatial planning is excessive cognitive load for 6–9 year olds
and is especially punishing for ADHD learners who may recognize the pattern but cannot find an
adjacent match.

**Tap-to-Select mechanic:**
- Player taps any tile to select it
- All other tiles sharing the same phonics pattern **glow** (reveal mode)
- Player taps 2+ additional same-pattern tiles
- When 3+ same-pattern tiles are selected, they animate away
- No adjacency requirement — find your pattern anywhere on the board

This directly reinforces the learning goal: the child must identify the phonics pattern, and the
game confirms whether they are right.

### 2.5 Grid Size Scales with Grade Level

| Grade | Grid | Tiles |
|-------|------|-------|
| 1     | 4×4  | 16    |
| 2     | 5×5  | 25    |
| 3     | 5×5  | 25    |
| 4     | 6×6  | 36    |
| 5     | 6×6  | 36    |

### 2.6 No "No File Modified Twice" Rule

The original plan's "NO FILE IS MODIFIED TWICE" constraint is an anti-pattern that prevents bug
fixes. Remove it entirely. Normal iterative development applies.

### 2.7 index.html is Session 1

The game shell (`index.html`) is built in Session 1, not Session 23. Every subsequent session
adds to a working, testable product.

---

## 3. UX Design

### 3.1 Interaction Model

**Tile states:**
1. **Normal** — word displayed, white/cream background, dark text
2. **Selected** — highlighted border (gold/orange), slightly scaled up
3. **Pattern-glow** — soft blue glow when another tile of same pattern is selected
4. **Wrong** — brief red shake animation (400ms), then returns to Normal
5. **Matched** — green flash, then tile fades and slides away
6. **Locked** — greyed out (if used for difficulty)

**Selection flow:**
1. Tap tile A → tile A becomes Selected; all same-pattern tiles glow
2. Tap tile B (same pattern) → B becomes Selected too, A and B glow
3. Tap tile C (same pattern) → all three animate as Matched, clear with new tiles fading in
4. If player taps a non-matching tile → Wrong animation, selection resets
5. Deselect: tap Selected tile again, or tap empty area

**Tap-to-hear:** Every tile has a small speaker icon (🔊). Tap it to hear the word spoken.
Tapping the word itself also speaks it before registering a selection.

### 3.2 Timer Design

**No visible countdown timer by default.** Visible countdowns create test anxiety and impair
working memory — directly contraindicated for the ADHD/dyslexia target audience.

**Default: Explorer Mode** — No time pressure. Play until board is cleared or player chooses to
move on. Progress shown as a "words cleared" counter.

**Optional: Challenge Mode** — An ambient progress bar (not a number) slowly depletes.
When it runs out, the lesson ends with the score accumulated so far. No alarming sound.
Framed as "energy" not "time running out." Unlocked after completing Explorer Mode for a lesson.

### 3.3 Tutorial System

**First play of each new phonics pattern** triggers a 3-step mini-tutorial (skippable after
first completion):
1. Board shows only 6 tiles: 3 of the new pattern + 3 of a known pattern
2. Animated tap shows: "These words share the [pattern name] sound. Tap them to match!"
3. Player taps, success animation, "You found them! Now try the full board."

**First ever launch:** 4-tile board. "Tap a word to select it." → Tap reveals glow. "These
words all have the short-A sound — can you find them?" → Child taps → Celebrate → Lesson begins.

Tutorial state stored in LocalStorage per pattern, per lesson.

### 3.4 No-Valid-Moves Handling

After board refill, the game checks whether any 3+ same-pattern matches exist. If not:
1. Gentle "stuck" animation — tiles shuffle briefly with a swirl effect
2. A hint glows: one valid group highlighted for 1.5 seconds
3. Board is silently re-randomized with guaranteed matches

Child never sees an error message or locked state.

### 3.5 Post-Match Feedback

After each successful 3-tile match:
- Brief celebration overlay (0.6s): "✓ Short-A pattern!"
- The matched words shown with the shared letters highlighted in color
- Word list panel on side scrolls to add matched words

### 3.6 Post-Lesson Summary

After lesson completion (board cleared or Explorer Mode ended):
- Stars awarded (1–3, based on accuracy %)
- Summary screen: "Words you matched: [list]"
- "Words to practice: [list of wrong-selection words]"
- Tap each word to hear it again
- "Next Lesson →" or "Play Again" buttons

### 3.7 Lesson Unlock + Preview Mode

**Unlock:** Completing any lesson unlocks the next.
**Preview Mode:** Child (or teacher) can attempt ANY lesson without needing prior completion.
Preview mode doesn't award stars — a separate "preview" badge shows they've tried it.
This allows teachers to assign specific lessons regardless of prior progress.

**Unlock override:** A settings panel (accessible via long-press on lesson + PIN code "1234")
allows parents/teachers to unlock any lesson.

### 3.8 Narrative Frame

A lightweight story wrapper: **"Lena the Word Explorer"** is exploring a magical library where
each room is locked by a phonics pattern. Clearing a lesson unlocks the next room. No game-over
state — the library always lets Lena in. Character is a small sprite that appears on lesson-select
and celebrates with the player after each lesson.

### 3.9 Combo Scoring (Accuracy-Based, Not Speed-Based)

- **Accuracy streak:** 5 correct matches in a row (no wrong taps) → streak multiplier (1.25×)
- **Chain bonus:** Clearing the whole board in one session → bonus stars
- **No speed combo** — speed rewards punish slow readers and ADHD learners who self-interrupt

Star thresholds:
- 1★ = complete the lesson (any accuracy)
- 2★ = 75% accuracy (fewer than 25% wrong taps)
- 3★ = 90% accuracy + accuracy streak of 5+ at some point

---

## 4. Phonics Curriculum — 30 Lessons (Grades 1–5)

Follows the Orton-Gillingham / structured literacy sequence: simple to complex,
explicit to implicit, with cumulative review.

### Grade 1 — Foundational Phonics (Lessons 1–6)

| # | Title | Patterns | Example Words |
|---|-------|----------|---------------|
| 1 | Short Vowels — CVC Words | short_a, short_i, short_o | cat, sit, hop |
| 2 | Short Vowels — More CVC | short_e, short_u, review | bed, cup, hat |
| 3 | Consonant Digraphs | sh, ch, th, wh | ship, chin, thin, when |
| 4 | L-Blends & S-Blends | bl,cl,fl,gl,pl,sl,sk,sm,sn,sp,st,sw | black, clap, flag, skin, snap |
| 5 | R-Blends & End Blends | br,cr,dr,fr,gr,pr,tr / nd,nt,st,mp | bright, crash, and, jump |
| 6 | Long Vowels — Silent E (VCE) | a_e, i_e, o_e, u_e | cake, bike, home, cube |

### Grade 2 — Vowel Teams & R-Controlled (Lessons 7–14)

| # | Title | Patterns | Example Words |
|---|-------|----------|---------------|
| 7  | Long-A Vowel Teams | ai, ay | rain, train, play, stay |
| 8  | Long-E Vowel Teams | ee, ea | feet, meet, read, beach |
| 9  | Long-O Vowel Teams | oa, ow | boat, coat, snow, slow |
| 10 | Long-I & Long-U Teams | igh, ie / ue, ui | night, pie, blue, fruit |
| 11 | R-Controlled — ar, or | ar, or | car, farm, corn, fort |
| 12 | R-Controlled — er, ir, ur | er, ir, ur | her, bird, turn, fur |
| 13 | Diphthongs — oi, oy | oi, oy | coin, oil, boy, toy |
| 14 | Diphthongs — ou, ow | ou, ow | cloud, house, cow, town |

### Grade 3 — Spelling Patterns & Syllables (Lessons 15–20)

| # | Title | Patterns | Example Words |
|---|-------|----------|---------------|
| 15 | Silent Letters — kn, wr, gn | kn, wr, gn | knot, knee, write, wren, gnome |
| 16 | Silent GH Patterns | igh, ight, aught, ought | night, light, caught, thought |
| 17 | Soft C and Soft G | soft_c, soft_g | city, cent, giant, gym |
| 18 | Syllable Types — Closed & Open | closed, open | nap, bet / no, be, go |
| 19 | VCE & Vowel Team Syllables | vce_syl, vt_syl | pancake, sunshine, rainbow |
| 20 | Common Suffixes | -ing, -ed, -er, -est, -ly, -ful, -less | jumping, faster, slowly |

### Grade 4 — Morphology (Lessons 21–25)

| # | Title | Patterns | Example Words |
|---|-------|----------|---------------|
| 21 | Prefixes — Basic | un-, re-, pre-, dis- | unlock, replay, predict, discover |
| 22 | Suffixes — -tion, -sion, -ness, -ment | -tion, -sion, -ness, -ment | nation, vision, kindness, movement |
| 23 | Greek Roots I | bio, geo, graph, phon | biology, geography, autograph, phone |
| 24 | Latin Roots I | port, dict, rupt, struct | transport, dictate, erupt, construct |
| 25 | Compound Words & Homophones | compound, homophone | playground, their/there/they're |

### Grade 5 — Advanced Morphology (Lessons 26–30)

| # | Title | Patterns | Example Words |
|---|-------|----------|---------------|
| 26 | Advanced Prefixes | inter-, sub-, trans-, over- | international, submarine, transfer |
| 27 | Advanced Suffixes | -ible/-able, -ous, -al | flexible, famous, musical |
| 28 | Latin Roots II | scrib/script, vis/vid, aud, man | describe, visible, audio, manual |
| 29 | Greek Roots II | log/logy, micro, astro, scope | biology, microscope, astronomy |
| 30 | Academic Vocabulary | multisyllabic, morpheme_mix | extraordinary, circumstances |

---

## 5. Data Structures

### 5.1 Lesson JSON (`data/lessons/lesson-01.json`)

```json
{
  "id": 1,
  "title": "Short Vowels — CVC Words",
  "gradeLevel": 1,
  "gridSize": 4,
  "explorer": true,
  "patterns": ["short_a", "short_i", "short_o"],
  "patternLabels": {
    "short_a": "Short A",
    "short_i": "Short I",
    "short_o": "Short O"
  },
  "wordPool": {
    "short_a": ["cat", "hat", "bat", "mat", "ran", "tan", "can", "map", "cap", "lap"],
    "short_i": ["sit", "bit", "hit", "fit", "pin", "tin", "win", "big", "pig", "fig"],
    "short_o": ["hop", "top", "pop", "mop", "dot", "got", "not", "cod", "rod", "nod"]
  },
  "patternHint": "Listen for the vowel sound in the middle of each word.",
  "tutorialWords": {
    "short_a": ["cat", "hat", "mat"],
    "short_i": ["sit", "bit", "hit"]
  }
}
```

### 5.2 Global State (in-memory, not a file)

```js
const state = {
    currentLesson: null,    // lesson JSON object
    board: [],              // 2D array of tile objects
    selected: [],           // tiles currently selected
    score: 0,
    accuracy: { correct: 0, wrong: 0 },
    streak: 0,
    matchedWords: [],       // for post-lesson summary
    wrongWords: [],         // for post-lesson review
    mode: 'explorer',       // 'explorer' | 'challenge'
    tutorialSeen: {}        // patternKey → true (persisted in LocalStorage)
};
```

### 5.3 Tile Object

```js
{
    word: 'cat',
    pattern: 'short_a',
    element: <div>,       // DOM reference
    state: 'normal',      // 'normal' | 'selected' | 'glow' | 'matched' | 'wrong'
    row: 0,
    col: 0
}
```

### 5.4 Progress (LocalStorage key: `phonics-progress`)

```json
{
    "lessons": {
        "1": { "stars": 3, "bestAccuracy": 0.94, "completed": true, "previewed": false },
        "2": { "stars": 2, "bestAccuracy": 0.81, "completed": true, "previewed": false }
    },
    "tutorialSeen": { "short_a": true, "short_i": true },
    "totalWordsMatched": 247,
    "currentStreak": 0
}
```

---

## 6. Accessibility Requirements

All of the following are **non-negotiable** for this game:

- **Font:** OpenDyslexic (CDN) with Comic Sans MS fallback. Minimum 22px on tiles, 18px elsewhere.
- **Letter spacing:** 0.05em on word tiles (helps dyslexic readers).
- **Line height:** 1.5+ everywhere.
- **Colors:** Cream background (#F5F0E8), dark text (#2C2416). WCAG AA contrast (4.5:1 minimum).
- **Pattern indicators:** Use BOTH color AND shape/texture for pattern groups (never color alone —
  8–10% of males have red-green color blindness).
- **Tile size:** Minimum 80×80px on mobile (≥44px touch target per Apple HIG). Scale up on desktop.
- **Text-to-speech:** Speaker icon on every tile. Also auto-speak tile when tapped.
- **No countdown timers visible by default** (anxiety-inducing for ADHD learners).
- **No flashing or strobing effects.** Celebration animation: confetti particles only, no flashes.
- **Auto-save:** Progress saved to LocalStorage after every lesson completion.
- **No lives, no fail states.** A wrong tap gives gentle feedback; play continues always.
- **ARIA:** All interactive elements have `aria-label`. Live region announces matches.
- **Keyboard:** Tab navigates tiles; Enter selects; Escape deselects.

---

## 7. Sort Mode (Second Game Mode)

Sort Mode is lower-stress than the match board and ideal for:
- First exposure to a new phonics pattern
- Students who find the tile board overwhelming
- Classroom warmup activities

**Mechanic:** 12 word cards appear one at a time. Child drags/taps each into one of 3–4 labeled
buckets (pattern buckets). Immediate feedback: correct = green flash + spoken confirmation;
wrong = gentle shake + try again (card stays available).

No timer. No score. Progress tracked as "words sorted correctly."

Sort Mode is accessible from the lesson select screen for any lesson, regardless of stars.

---

## 8. Project File Structure

```
phonics-game/
├── index.html              # Game shell, lesson select screen, all screens
├── css/
│   └── style.css           # All styles
├── js/
│   ├── data.js             # loadLesson(), lesson progress utilities
│   ├── board.js            # Board generation, tile rendering, refill
│   ├── match.js            # Match detection, pattern validation
│   ├── speech.js           # Web Speech API wrapper
│   ├── tutorial.js         # Tutorial overlay system
│   ├── feedback.js         # Post-match and post-lesson feedback
│   ├── sort.js             # Sort Mode implementation
│   ├── score.js            # Scoring, stars, accuracy tracking
│   ├── save.js             # LocalStorage save/load
│   ├── audio.js            # Web Audio API sound effects (synthesized)
│   ├── narrative.js        # Lena character, story overlay
│   └── game.js             # Main state machine, screen routing
├── data/
│   └── lessons/
│       ├── lesson-01.json  # Grade 1, Lesson 1
│       ├── lesson-02.json
│       └── ...             # lesson-01.json through lesson-30.json
└── assets/
    └── lena.svg            # Lena the Word Explorer character (simple SVG)
```

---

## 9. Board Refill Algorithm

When tiles are cleared, new tiles refill from the top with a fade-in animation.

**Constraint satisfaction for guaranteed matches:**
1. Count tiles per pattern remaining on board.
2. If any pattern has fewer than 3 tiles remaining, add 3 tiles of that pattern to the refill pool.
3. Shuffle refill pool, then fill empty spots top-to-bottom, left-to-right.
4. After placement, run `detectValidMoves()` — if no valid moves exist (can happen when patterns
   cluster badly), trigger the gentle "stuck" handling (see § 3.4).

**Board generation (fresh start):**
1. For a lesson with N patterns and grid size G×G:
   - Tiles per pattern = floor(G×G / N), with remainder distributed evenly
   - Minimum 3 tiles per pattern guaranteed
2. Shuffle all tiles randomly.
3. Run `detectValidMoves()` — if no valid moves, re-shuffle (loop max 10 times, then force inject
   a valid group).

---

## 10. Sound Design (Web Audio API Synthesized)

Use synthesized sounds — no audio files. Same approach used in catacombs-and-creeds.

| Event | Sound |
|-------|-------|
| Tile select | Soft "boing" (sine wave, 440Hz, 80ms) |
| Pattern glow | Gentle "shimmer" (rising arpeggio, 60ms) |
| Match success | "Ding" chord (C-E-G, 300ms) |
| Wrong tap | Soft "thud" (low sine, 100ms) |
| Lesson complete | Ascending fanfare (500ms) |

Web Speech API handles word pronunciation. Web Audio API handles SFX.
User can mute both separately. Mute state saved in LocalStorage.

---

## 11. Performance Requirements

- Page load: < 2 seconds on a standard wifi connection (no 50MB audio — zero concern)
- 60fps tile animations on iPad Safari
- Board refill completes in < 300ms
- SpeechSynthesis latency is browser-controlled; no workarounds needed
- Initial page size target: < 300KB total (HTML + CSS + JS + data for all 30 lessons)

---

## 12. GitHub Pages Compatibility

- All files are static — no server-side logic
- JSON lesson files fetched via `fetch('./data/lessons/lesson-01.json')` — works on GitHub Pages
- SpeechSynthesis available in GitHub Pages (served over HTTPS, required for iOS permission)
- No Service Worker required (lesson data is small; no offline requirement)
- No build step — edit files directly

---

## 13. Review Findings Summary

### From the Web Developer Review:
- ✅ SpeechSynthesis instead of 500 audio files
- ✅ DOM rendering instead of Canvas
- ✅ `<script defer>` instead of ES6 modules
- ✅ Timer removed by default (opt-in Challenge Mode)
- ✅ index.html built in Session 1
- ✅ No "NO FILE IS MODIFIED TWICE" anti-pattern
- ✅ 44px touch targets throughout
- ✅ iOS Safari compatibility (SpeechSynthesis requires HTTPS = GitHub Pages)

### From the UX/Game Design Review:
- ✅ Tap-to-select (not swap) — removes spatial constraint from phonics task
- ✅ Pattern-glow feedback on first tap (visual cue for same-pattern tiles)
- ✅ Mandatory tutorial for each new pattern
- ✅ No visible countdown — Explorer Mode default
- ✅ No-valid-moves detection with gentle "stuck" handling
- ✅ Post-lesson summary naming learned words
- ✅ Accuracy-based streaks (not speed-based combos)
- ✅ Sort Mode as lower-stress alternative
- ✅ Narrative frame (Lena the Word Explorer)
- ✅ Preview Mode for teachers
- ✅ Text-to-speech on every tile (tap speaker icon)
- ✅ 1★ for completion (no fail state)

### From Phonics Education / Orton-Gillingham Principles:
- ✅ Grade 1 content added (CVC, digraphs, blends — missing from original plan)
- ✅ Proper O-G sequence: simple→complex, explicit→implicit, cumulative
- ✅ 30 lessons instead of 20 to cover grades 1–5 properly
- ✅ No grade 6–8 content (removed — out of scope for grades 1–5)
- ✅ Morpheme instruction at grades 4–5 (prefixes, suffixes, Greek/Latin roots)
- ✅ Pattern labels shown after match (explicit pattern naming)
- ✅ Word-by-word speech on tap (supports decoding practice)
- ✅ Wrong-tap feedback: gentle, non-punitive
- ✅ OpenDyslexic font, wide letter spacing, no time pressure
- ✅ Post-lesson word review list (reinforces retention)
