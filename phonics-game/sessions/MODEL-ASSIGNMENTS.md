# Model Assignments Per Session

Reviewed by engineering agent. Assignments based on task complexity:
- **Haiku** — Data entry, content generation, simple file creation (no algorithmic complexity)
- **Sonnet** — Standard implementation: UI, game logic, algorithms, integration work
- **Opus** — Not needed for this project (all sessions are well-defined implementation tasks)

| Session | Title | Model | Rationale |
|---------|-------|-------|-----------|
| 01 | Project Shell + Lesson Selection UI | Sonnet | CSS design system + HTML structure + stub JS — needs good design judgment |
| 02 | Grade 1 Phonics Data (Lessons 1–6) | **Haiku** | Pure data entry: word lists, JSON files. No algorithmic complexity. |
| 03 | Grade 2–3 Phonics Data (Lessons 7–20) | **Haiku** | Pure data entry: 14 more lesson JSON files. Low complexity. |
| 04 | Grade 4–5 Phonics Data (Lessons 21–30) | **Haiku** | Pure data entry: 10 lesson JSON files. Low complexity. |
| 05 | Tile Rendering + Board Layout | Sonnet | DOM generation, CSS tile states, SpeechSynthesis integration |
| 06 | Match Detection + Board Clearing | Sonnet | Core game algorithm: selection state machine, pattern validation, refill constraint |
| 07 | Scoring, Stars, Post-Lesson Summary | Sonnet | Scoring logic, summary screen UI, LocalStorage persistence |
| 08 | Tutorial System | Sonnet | Multi-step tutorial flow, mini-board logic, ARIA dialog |
| 09 | Sort Mode | Sonnet | Second game mode: word-to-bucket matching, state management |
| 10 | Sound Effects + Progress Tracking | Sonnet | Web Audio API synthesis, complete save/load system |
| 11 | Narrative Frame + Celebrations | Sonnet | SVG character, CSS confetti animation, room unlock narrative |
| 12 | Accessibility Pass | Sonnet | ARIA audit, keyboard nav, WCAG contrast checks, iOS fixes |
| 13 | Challenge Mode (Ambient Timer) | Sonnet | Mode select overlay, interval timer, energy bar animation |
| 14 | Polish, iPad Optimization, GitHub Pages | Sonnet | Performance audit, edge cases, cross-browser, index registration |

---

## Session Execution Order

Sessions must be executed in order 01 → 14. Each session depends on the previous:
- Sessions 02–04 can run in parallel (no interdependency — all are data files)
- Session 05 requires 01 (shell) and at least Session 02 (for real lesson data)
- Sessions 06–14 must be sequential (each builds on the previous session's code)

**Recommended execution plan:**
1. Run Session 01 (shell)
2. Run Sessions 02, 03, 04 in parallel (data)
3. Run Sessions 05 → 14 sequentially

---

## Time Estimates Per Session

| Session | Estimated Claude Time |
|---------|----------------------|
| 01 | 2–3 hours |
| 02 | 2–3 hours |
| 03 | 3–4 hours |
| 04 | 2–3 hours |
| 05 | 3–4 hours |
| 06 | 3–4 hours |
| 07 | 3–4 hours |
| 08 | 3–4 hours |
| 09 | 3–4 hours |
| 10 | 2–3 hours |
| 11 | 2–3 hours |
| 12 | 3–4 hours |
| 13 | 2–3 hours |
| 14 | 3–4 hours |

**Total estimated time:** 36–51 hours across 14 sessions.

---

## Starting a Session

When starting a session, tell Claude:
1. The session number and file: "Implement session-XX as described in phonics-game/sessions/session-XX.md"
2. The session's model (as noted above)
3. "Read plan.md first for overall architecture context"

Claude should:
1. Read `phonics-game/plan.md` for architecture overview
2. Read the specific session file for detailed requirements
3. Read existing files before modifying them
4. Implement exactly what the session specifies — no more, no less

---

## Cross-Session Dependencies and Clarifications

These clarifications address gaps identified in the final review.

### Class Defined Before It Is Used

| Class | Defined in | First used in |
|-------|-----------|---------------|
| `DataManager` | Session 02 (`js/data.js`) | Session 05 |
| `SaveManager` | Session 01 (`js/save.js` stub) | Session 01 |
| `BoardManager` | Session 05 (`js/board.js`) | Session 05 |
| `MatchManager` | Session 06 (`js/match.js`) | Session 06 |
| `ScoreManager` | Session 07 (`js/score.js`) | Session 06 references it as a constructor param |
| `SpeechManager` | Session 05 (`js/speech.js`) | Session 05 |
| `AudioManager` | Session 10 (`js/audio.js`) | Session 10 |
| `TutorialManager` | Session 08 (`js/tutorial.js`) | Session 08 |
| `SortManager` | Session 09 (`js/sort.js`) | Session 09 |
| `NarrativeManager` | Session 11 (`js/narrative.js`) | Session 11 |

**Important**: Session 06's `MatchManager` constructor accepts a `scoreManager` parameter.
Since `ScoreManager` isn't defined until Session 07, Session 06 should stub it:
```js
// Temporary stub in session-06 until session-07 adds the real class:
class ScoreManager {
    recordMatch(count, pattern) {}
    recordWrong(word) {}
    getStars() { return 1; }
    getSummary() { return { stars: 1, accuracy: 1, correct: 0, wrong: 0, maxStreak: 0, matchedWords: [], wrongWords: [], points: 0 }; }
}
```
Session 07 **replaces** this stub with the full implementation.

### Session 05 → Session 06: `onTileTap` Transition

Session 05 implements a **basic stub** `onTileTap()` in `game.js` (select/deselect only).
Session 06 **replaces** this entirely — the full `MatchManager.onTileTap()` becomes the only
tile tap handler. When implementing Session 06:
- Delete the stub `onTileTap` logic from Session 05's `game.js`
- Replace with: `onTileTap(tile) { SpeechManager.speakIfUnmuted(tile.word); window.matchManager.onTileTap(tile); }`
- This is an intentional overwrite, not a bug

### Board Refill: Word Pool Cycling

When a lesson has fewer unique words than tiles × refill cycles needed, words will repeat.
This is acceptable — repetition reinforces phonics learning. The refill algorithm should
cycle through words gracefully:

```js
// In refill(), when available.length === 0, cycle from full pool:
const word = words[Math.floor(Math.random() * words.length)];
```

No special handling needed for word exhaustion. Repeated words on the board are fine.

### Challenge Mode Unlock Tracking

Session 10's `SaveManager.saveLessonResult()` should also record challenge mode eligibility:
```js
// After saving lesson result:
data.lessons[lessonId].challengeUnlocked = true;  // Available after first Explorer completion
```

Session 13 reads this in `selectMode()`:
```js
const eligible = progress.lessons[this.currentLessonId]?.challengeUnlocked === true;
document.querySelector('.mode-challenge').disabled = !eligible;
```

### Challenge Mode Toggle in Session 01 Settings Panel

Session 01 adds a "Challenge Mode" toggle to the settings panel as a **visual stub** (checkbox
with no functionality). Session 13 wires it up. The toggle label should read:
"Challenge Mode (complete a lesson first to unlock)". Session 01 does NOT need to implement
any timer or mode logic — just the UI element.

### Session 01: Star Display from LocalStorage

Session 01 reads star data from `SaveManager.load()` and displays it. Since `ScoreManager`
(which calculates stars) is built in Session 07, Session 01 simply reads the `stars` field
from LocalStorage directly:
```js
const stars = progress.lessons?.[lesson.id]?.stars || 0;
```
This is the persisted integer value (0–3), not calculated dynamically.
