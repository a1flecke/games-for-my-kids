# Session 9 — Care Mode: Room, Needs, and Mini-Games
**Model:** Opus | **Focus:** Creature room, needs meters, interactive care activities

## Deliverables

- `care.js` — Care mode manager:
  - **Creature Room:** Decoratable room with wall color, bed, food bowl, toy, window. Creature idles in center, wanders to objects.
  - **Needs display:** 4 icon meters (food bowl, water drop, lightning, heart). Bar + icon, no text. Start with 2 visible; energy + cleanliness unlock after 2nd creature.
  - **Needs mechanics:** Decay 1pt/2min during active play only. Floor 20. On reopen: greets happily. When <40: gentle pulse. When <25: looks toward relevant object.
  - **Interactive care mini-games:**
    - **Feed:** Drag food from 3 choices to mouth. Hunger +30. Body-type food preferences.
    - **Bathe:** Drag sponge across creature. Dirt particles → sparkles. Cleanliness +40.
    - **Pet:** Stroke with finger. Hearts float up. Happiness +15. Different area reactions.
    - **Play:** Tap ball → creature chases. 3 throws = complete. Happiness +20, Energy -10.
    - **Sleep:** Tap bed → creature walks to bed, zzz animation, 5s fast-forward. Energy +50.
  - **Expressions:** Content (>60), Hungry (<40), Messy (<40), Tired (<40), Bored (<40)
  - **Growth system:** Baby (0-19) → Kid (20-49) → Adult (50+) based on totalCareActions. Celebration on growth.

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
