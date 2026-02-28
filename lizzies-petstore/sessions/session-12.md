# Session 12 — Pet Park
**Model:** Opus | **Focus:** Park scene, random creatures, social interactions

## Deliverables

- `park.js` — Pet park manager:
  - **Park scene backgrounds** (3, unlocked via progression):
    - Sunny Park (starter): grass, trees, sky, fence, fountain, bench, flowers
    - Beach (3 visits): sand, waves, palms, shells, tide pools
    - Cloud Garden (7 visits): floating islands, rainbow bridges, star flowers
  - **Random creature generator:** 4-5 NPCs using parts.js, harmonious random colors, auto-generated names (adj + noun), random personality
  - **Player creature:** Touch-guided movement. Tap → walk/fly there. Auto-wander after 10s idle.
  - **Social interactions** (proximity + player-initiated):
    - Near (80px): auto-sniff animation, greeting sounds
    - Tap NPC → play together: chase circles, bounce, play bow, synchronized jump
    - Tap fountain → drink + splash
    - Tap bench → sit + rest, NPC may join
    - Tap ball → throw, all creatures chase
  - **Park benefits:** Happiness +25 on arrival, +5 per NPC interaction. Energy -2/min.
  - "Go Home" button → CARE
  - New random NPCs each visit
  - Max 6 creatures rendered (1 player + 5 NPC)

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
