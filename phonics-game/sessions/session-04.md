# Session 04 — Grade 4–5 Phonics Data (Lessons 21–30)

**Model:** claude-haiku-4-5-20251001
**Estimated time:** 2–3 hours
**Deliverable:** 10 lesson JSON files for Grade 4–5 content. Update `js/data.js` metadata.

---

## Goal

Complete all Grade 4–5 lesson JSON files. Also finalize `DataManager.getLessonMeta()`
with all 30 lessons so the lesson select screen is complete.

---

## Files to Create/Modify

- `data/lessons/lesson-21.json` through `lesson-30.json`
- `js/data.js` — update `getLessonMeta()` to include all 30 lessons

---

## Lesson Specifications

Grade 4 uses `gridSize: 6` (6×6 = 36 tiles). Grade 5 also uses `gridSize: 6`.

### Lesson 21: Prefixes — Basic (Grade 4)
Patterns: `prefix_un`, `prefix_re`, `prefix_pre`, `prefix_dis`
- `prefix_un`: unlock, unpack, undo, unfair, unhappy, unkind, unsafe, untie, untrue, unusual, unclear, uncover, unload, unplug
- `prefix_re`: replay, rebuild, rewrite, reopen, return, recall, reclaim, recount, refill, reheat, remind, rename, repay, reset, restart
- `prefix_pre`: predict, preview, preschool, preheat, preorder, prepay, pretest, prevent, prejudge, prepaid, prehistoric
- `prefix_dis`: discover, disagree, dislike, displace, display, disturb, distrust, disorder, disconnect, disappear, disapprove, disrespect
Pattern hint: "A prefix at the beginning changes the word's meaning!"

### Lesson 22: Suffixes — -tion, -sion, -ness, -ment (Grade 4)
Patterns: `suffix_tion`, `suffix_sion`, `suffix_ness`, `suffix_ment`
- `suffix_tion`: nation, station, action, fiction, fraction, section, mention, attention, direction, election, fraction, location, motion, notion, option, portion, question, tradition, vacation
- `suffix_sion`: vision, mission, passion, tension, version, mansion, extension, explosion, invasion, confusion, permission, profession, revision, decision, division
- `suffix_ness`: kindness, darkness, sadness, weakness, sickness, hardness, boldness, coldness, freshness, greatness, goodness, happiness, illness, loneliness, madness
- `suffix_ment`: movement, payment, treatment, statement, agreement, argument, enjoyment, government, improvement, judgment, moment, pavement, punishment, replacement, requirement
Pattern hint: "These suffixes change VERBS and ADJECTIVES into NOUNS!"

### Lesson 23: Greek Roots I (Grade 4)
Patterns: `root_bio`, `root_geo`, `root_graph`, `root_phon`
- `root_bio`: biology, biography, biome, biosphere, antibiotic, biodiversity, biohazard
- `root_geo`: geography, geology, geometry, geothermal, geocache, geode
- `root_graph`: autograph, photograph, paragraph, biography, graphic, telegraph, seismograph
- `root_phon`: phone, microphone, phonics, symphony, earphone, saxophone, megaphone, homophone
Pattern hint: "Greek roots are like building blocks — they appear in many English words!"

### Lesson 24: Latin Roots I (Grade 4)
Patterns: `root_port`, `root_dict`, `root_rupt`, `root_struct`
- `root_port`: transport, import, export, airport, report, support, portable, porter
- `root_dict`: dictate, dictionary, predict, verdict, contradict, dedicate, dictator
- `root_rupt`: erupt, interrupt, disrupt, rupture, abrupt, corrupt, bankrupt
- `root_struct`: construct, structure, instruct, destroy, destruct, restructure, infrastructure
Pattern hint: "Latin roots tell you the core meaning of a word!"

### Lesson 25: Compound Words and Homophones (Grade 4)
Patterns: `compound`, `homophone`
- `compound`: playground, notebook, sunflower, birthday, raincoat, bookshelf, doorbell, fireplace, football, goldfish, haircut, homework, laptop, moonlight, newspaper, popcorn, rainbow, sailboat, snowball, starfish, sunlight, thunderstorm, waterfall, weekend, windmill
- `homophone`: their/there, your/you're, two/too/to, hear/here, no/know, new/knew, write/right, see/sea, by/buy/bye, flower/flour, sail/sale, mail/male, tale/tail, plane/plain, main/mane
Pattern hint: "Compound words join two words together. Homophones sound the same but are spelled differently!"

### Lesson 26: Advanced Prefixes (Grade 5)
Patterns: `prefix_inter`, `prefix_sub`, `prefix_trans`, `prefix_over`
- `prefix_inter`: international, internet, interview, interact, intermediate, intercept, interject, interrupt, interval, intersect
- `prefix_sub`: submarine, subway, subtract, substitute, submerge, subtitle, suburb, subscription, substandard
- `prefix_trans`: transport, transfer, transform, translate, transmission, transparent, transaction, transcript, transplant, transatlantic
- `prefix_over`: overlook, overcome, overdue, overflow, overpass, overcome, overhear, overload, overpower, overthrow, overtime

### Lesson 27: Advanced Suffixes (Grade 5)
Patterns: `suffix_ible`, `suffix_able`, `suffix_ous`, `suffix_al`
- `suffix_ible`: flexible, possible, visible, terrible, horrible, sensible, responsible, incredible, accessible, compatible, convertible, digestible, eligible, feasible, invincible
- `suffix_able`: capable, comfortable, remarkable, adorable, acceptable, achievable, affordable, agreeable, available, believable, charitable, enjoyable, favorable, manageable, valuable
- `suffix_ous`: famous, dangerous, adventurous, gorgeous, humorous, joyous, marvelous, mysterious, nervous, numerous, obvious, poisonous, serious, various, vigorous
- `suffix_al`: musical, magical, chemical, historical, physical, electrical, financial, general, horizontal, identical, logical, musical, natural, optical, political

### Lesson 28: Latin Roots II (Grade 5)
Patterns: `root_scrib`, `root_vis`, `root_aud`, `root_man`
- `root_scrib`: describe, prescription, manuscript, subscribe, inscription, scribbble, scribe, scripture
- `root_vis`: visible, vision, visit, visual, television, invisible, preview, review, revise, supervise
- `root_aud`: audio, audience, auditorium, audible, audiobook, inaudible, audition
- `root_man`: manual, manufacture, manage, command, demand, manuscript, manipulate, maneuver

### Lesson 29: Greek Roots II (Grade 5)
Patterns: `root_log`, `root_micro`, `root_astro`, `root_scope`
- `root_log`: biology, geology, ecology, mythology, technology, psychology, sociology, monologue, dialogue, epilogue, catalog, catalog
- `root_micro`: microscope, microphone, microchip, microwave, microbe, microbiology, microfilm, microorganism
- `root_astro`: astronomy, astronaut, asteroid, astrophysics, astronomer, astrology, astrodome
- `root_scope`: telescope, microscope, kaleidoscope, periscope, stethoscope, endoscope, horoscope

### Lesson 30: Academic Vocabulary — Multisyllabic (Grade 5)
Patterns: `academic_prefix_suffix`, `academic_root_combo`
- `academic_prefix_suffix`: unexpected, uncomfortable, unremarkable, irresponsible, predetermined, independence, irreversible, misunderstanding, overconfident, underestimate, predetermined
- `academic_root_combo`: extraordinary, circumstances, environment, representative, transformation, transportation, communication, organization, electricity, geography, investigation, microorganism, international, biodiversity

Pattern hint: "Break long words into parts — each part has a meaning!"

---

## `js/data.js` Update — Complete `getLessonMeta()`

Add all 30 lessons to the array. Abbreviated here — include all:
```js
{ id: 21, title: 'Prefixes — Basic', gradeLevel: 4 },
{ id: 22, title: 'Suffixes — -tion, -sion, -ness, -ment', gradeLevel: 4 },
// ... through lesson 30
{ id: 30, title: 'Academic Vocabulary — Multisyllabic', gradeLevel: 5 },
```

---

## Definition of Done

- [ ] All 10 JSON files valid
- [ ] Each lesson has ≥10 words per pattern
- [ ] Grade 4–5 words are appropriate reading level
- [ ] All 30 lessons appear in the lesson select screen
- [ ] `getLessonMeta()` returns exactly 30 entries
