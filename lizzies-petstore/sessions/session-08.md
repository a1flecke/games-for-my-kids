# Session 8 — Audio System
**Model:** Opus | **Focus:** Warm Web Audio synthesis, creature voices, interaction SFX

## Deliverables

- `audio.js` — Web Audio synthesizer (lazy AudioContext init, `ctx.resume().then()`):
  - **Creature voices** (sine-wave based, low-pass filtered, layered):
    - Purr: 2 detuned sines 80-120Hz with amplitude modulation
    - Mew: 400Hz sine with pitch bend down, soft release
    - Chirp: Ascending sine 300→600Hz, 100ms
    - Coo: 250Hz sine with gentle vibrato, 200ms
    - Squeak: 800Hz sine, 50ms, slight wobble
    - Baa: 200Hz sine with nasal filter, 150ms
    - Whinny: Sine sweep 300→500→200Hz, 300ms
    - Growl (soft): 100Hz sine + gentle noise, cartoony
    - Roar (cute): 150Hz sweep to 300Hz, short/bouncy
    - Hiss (playful): Filtered noise burst, 100ms
  - **Interaction SFX:** Munch, water splash, brush, footstep, wing whoosh, happy jingle, pop, sparkle
  - **Ambient (park):** Random chirps 2-5s, gentle wind
  - **Background music:** Creator (upbeat pentatonic), Care (gentle chords), Park (playful melody)
  - Voice auto-assignment by head type, preview button in Creator
  - Volume slider + mute toggle
  - Touch-specific body reactions (tap tummy → giggle, scratch ears → purr, tickle feet → squeak)

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
