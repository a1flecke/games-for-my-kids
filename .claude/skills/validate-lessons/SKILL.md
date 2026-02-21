---
name: validate-lessons
description: Validate all phonics lesson JSON files for structural correctness — word counts, cross-pattern duplicates within a lesson, homographs, and British spellings.
---

Run the phonics lesson validator and report any errors or warnings.

## Instructions

Run the validator script from the project root:

```bash
eval "$(mise activate bash)" && node phonics-game/scripts/validate-lessons.js
```

The script checks all 30 lesson files in `phonics-game/data/lessons/` and reports:

- **ERROR** — Pattern missing from wordPool, word count below 8 (hard minimum), or cross-pattern duplicate within the same lesson. Exits non-zero.
- **WARN** — Known homograph (dual pronunciation) or British spelling unfamiliar to American students.

## Common fixes

| Error | Fix |
|-------|-----|
| Pattern has N words (minimum 8) | Add more words for that pattern (target 10) |
| Word appears in both pattern A and B | Remove from the less-representative pattern |
| Homograph warning | Replace with unambiguous word (e.g. "bow" → "elbow") |
| British spelling | Replace with American equivalent |

## Phonics rules the script does NOT check (manual review)

- R-controlled vowels masquerading as pure VCE (cure/lure/pure are /ɜː/, not long-U)
- Wrong blend class (sly is SL-blend, not L-blend)
- Root transparency (constrict ≠ STRUCT root; manuscript serves both SCRIB and MAN)
- Grade-inappropriate vocabulary (adult medical terms, archaic words)
- Overly obscure academic words at early grade levels
