---
paths:
  - "phonics-game/**"
---

# Phonics Game — Architecture Notes

Word Explorer — phonics matching game for grades 1–5. Multi-file modular JS.

**Session workflow:** After each session: run a web engineer review agent → fix issues → delete the session file → commit + push.

**Session tracking:** Sessions defined in `phonics-game/sessions/`. Delete session file after completing it. Run sessions in order per `sessions/MODEL-ASSIGNMENTS.md` (Haiku for data-entry sessions, Sonnet for implementation sessions).

**Key files:**
- `index.html` — game shell with 4 screens: `#screen-select`, `#screen-board`, `#screen-sort`, `#screen-summary`
- `css/style.css` — design system (CSS vars incl. `--text-secondary`, grade colors, responsive 3/4/5-col lesson grid)
- `js/game.js` — Game class: lesson select rendering, grade filter, settings panel, PIN dialog (all with focus traps)
- `js/save.js` — SaveManager (localStorage key: `phonics-progress`); `_defaults()` defines all required fields
- `js/data.js` — DataManager: `loadLesson(id)` fetches JSON; `getLessonMeta()` returns all 30 lessons (field: `gradeLevel`)
- `data/lessons/lesson-{01-30}.json` — phonics lesson data; schema uses `gradeLevel` field

**Grid sizes by grade:** Grade 1: 4×4 (16 tiles), Grade 2–3: 5×5 (25), Grade 4–5: 6×6 (36). See `plan.md § 2.5`.

**Target platform:** iPad Safari (primary), desktop Chrome/Firefox. DOM + CSS Grid (not Canvas).

## Phonics Data Rules

All of these apply to every lesson JSON edit:

- Words must phonetically exemplify their pattern — check for exceptions (e.g. "word" sounds like "ur" not "or"; "smooth" has silent TH)
- **Homographs:** avoid words with two pronunciations (e.g. "read", "wind", "wound", "bow", "use"). The HOMOGRAPHS set in `validate-lessons.js` is the source of truth.
- **No cross-pattern duplicates** within the same lesson — a word that belongs to pattern A must not appear in pattern B of the same file.
- **Blend classification:** verify which blend family a word belongs to. "sly" is an SL-blend (s-blend), not an L-blend.
- **VCE (silent-E) patterns:** r-controlled vowels are NOT long vowels. "cure", "lure", "pure" are /ɜː/, not long-U — exclude from `u_e` pattern.
- **Root transparency:** the root must be clearly visible and productive in the word. "constrict" has STRICT/STRING root, not STRUCT. "manuscript" serves both SCRIB and MAN — pick one lesson.
- **British spellings:** "draught", "nought", "colour", etc. are unrecognizable to American students — use American equivalents.
- **Grade-appropriate vocabulary:** avoid adult medical terms (e.g. "gout"), archaic words, and proper nouns at early grade levels.
- Run `/validate-lessons` after every lesson file edit (also runs automatically via hook).
