# Session 02 — Grade 1 Phonics Data (Lessons 1–6)

**Model:** claude-haiku-4-5-20251001
**Estimated time:** 2–3 hours
**Deliverable:** Six lesson JSON files for Grade 1 content, plus `js/data.js` loader.

---

## Goal

Create the phonics data for all 6 Grade 1 lessons. This is primarily data entry + structure
work — no complex algorithms needed. Haiku is appropriate for this session.

By the end of this session:
- `data/lessons/lesson-01.json` through `lesson-06.json` exist and are valid JSON
- `js/data.js` can `fetch()` and return a lesson object
- The game shell from Session 1 can load and display real lesson metadata

---

## Files to Create

- `phonics-game/data/lessons/lesson-01.json` through `lesson-06.json`
- `phonics-game/js/data.js`

---

## Lesson Specifications

Each lesson JSON follows the schema in `plan.md` § 5.1. Below are the required words.

### Lesson 1: Short Vowels — CVC Words (Grade 1)
Patterns: `short_a`, `short_i`, `short_o`
Grid size: 4 (4×4 = 16 tiles)

Word pool (minimum 10 per pattern, use only 3-letter CVC words):
- `short_a`: cat, hat, bat, mat, ran, tan, can, map, cap, lap, sad, bad, mad, dad, had
- `short_i`: sit, bit, hit, fit, pin, tin, win, big, pig, fig, did, hid, kid, lid, rid
- `short_o`: hop, top, pop, mop, dot, got, not, cod, rod, nod, fog, hog, log, jog, cob

Tutorial words: `short_a: ["cat", "hat", "mat"]`, `short_i: ["sit", "bit", "hit"]`
Pattern hint: "Listen for the vowel sound in the middle of the word."

### Lesson 2: Short Vowels — More CVC (Grade 1)
Patterns: `short_e`, `short_u`, `short_a_review`
Grid size: 4

Word pool:
- `short_e`: bed, red, led, fed, hen, ten, men, pen, set, let, wet, pet, bet, met, net
- `short_u`: cup, pup, bug, hug, mug, run, fun, sun, bun, cut, but, gut, hut, mud, bud
- `short_a_review`: cat, hat, can, map, sad, ran, bat, cap, mad, had, pan, fan, man, tan, van

Pattern hint: "Say each word. What vowel sound do you hear in the middle?"

### Lesson 3: Consonant Digraphs (Grade 1)
Patterns: `sh`, `ch`, `th`, `wh`
Grid size: 4

Word pool:
- `sh`: ship, shop, shed, shelf, shell, shin, shout, share, shape, shut, shift, shall, show
- `ch`: chip, chin, chop, chest, chain, chair, chase, cheap, check, cheese, child, change
- `th`: thin, thick, them, that, then, this, with, math, bath, path, cloth, tooth, smooth
- `wh`: when, what, where, which, while, wheat, wheel, whine, whale, whiff, whip

Pattern hint: "Two letters working together to make one sound!"

### Lesson 4: L-Blends and S-Blends (Grade 1)
Patterns: `l_blend`, `s_blend`
Grid size: 4

Word pool:
- `l_blend`: black, blow, blue, clap, clay, clue, flag, flat, flip, glad, glow, plan, play, sled, slip, slow, sly
- `s_blend`: skin, skip, sky, slam, sled, slim, snail, snap, snow, span, spin, star, step, swim, sweet

Pattern hint: "Two consonants working together at the beginning of the word!"

### Lesson 5: R-Blends and End Blends (Grade 1)
Patterns: `r_blend`, `end_blend`
Grid size: 4

Word pool:
- `r_blend`: brain, brick, bring, brown, crack, craft, crawl, crop, draw, dream, dress, drive, frog, from, grab, grin, grow, press, print, track, trap, trick, trip, truck, trim
- `end_blend`: and, band, find, hand, land, pond, send, wind, bent, dent, hint, mint, rent, tent, best, fist, list, mist, rest, test, camp, damp, jump, lamp, ramp, stamp

Pattern hint: "Listen for two consonants together at the END of the word!"

### Lesson 6: Long Vowels — Silent E (VCE) (Grade 1)
Patterns: `a_e`, `i_e`, `o_e`, `u_e`
Grid size: 4

Word pool:
- `a_e`: bake, cake, lake, make, rake, take, wake, came, game, name, same, tame, face, lace, pace, race, cage, page, sage, wave, gave, cave, save, tale, sale, pale, male
- `i_e`: bike, hike, like, mike, pine, vine, wine, fine, line, mine, nine, wide, hide, ride, side, tide, site, kite, bite, fire, hire, wire, tile, mile, file, pile
- `o_e`: bone, cone, home, phone, stone, tone, zone, hope, mole, hole, role, pole, note, vote, quote, globe, robe, code, mode, rode, woke, poke, joke, smoke
- `u_e`: cube, cute, huge, mule, rule, tube, tune, use, fuse, dune, June, tune

Pattern hint: "The E at the end is silent but makes the vowel say its name!"

---

## `js/data.js`

```js
class DataManager {
    static async loadLesson(id) {
        const response = await fetch(`./data/lessons/lesson-${String(id).padStart(2,'0')}.json`);
        if (!response.ok) throw new Error(`Lesson ${id} not found`);
        return response.json();
    }

    // Hardcoded metadata for lesson select screen (no fetch needed)
    static getLessonMeta() {
        return [
            { id: 1, title: 'Short Vowels — CVC Words', gradeLevel: 1 },
            { id: 2, title: 'Short Vowels — More CVC', gradeLevel: 1 },
            { id: 3, title: 'Consonant Digraphs', gradeLevel: 1 },
            { id: 4, title: 'L-Blends & S-Blends', gradeLevel: 1 },
            { id: 5, title: 'R-Blends & End Blends', gradeLevel: 1 },
            { id: 6, title: 'Long Vowels — Silent E', gradeLevel: 1 },
            // Sessions 3-5 will fill in lessons 7-30
        ];
    }
}
```

---

## Definition of Done

- [ ] All 6 JSON files are valid (run `node -e "JSON.parse(require('fs').readFileSync('lesson-01.json','utf8'))"` for each)
- [ ] Each lesson has ≥10 words per pattern
- [ ] Words are age-appropriate for Grade 1 (3-5 letters max, common words only)
- [ ] No proper nouns, no archaic words
- [ ] `js/data.js` `loadLesson(1)` returns valid object in browser console
- [ ] Lesson select screen in Session 1's game.js renders all 6 lessons with real titles and grade badges
