# Session 13 — Photo Mode + Creature Cards + Sharing
**Model:** Sonnet | **Focus:** Screenshot/share features, creature trading cards

## Deliverables

- **Photo mode** (from Care and Park):
  - Camera icon → screen dims, creature centers, background options
  - Decorative frame options (hearts, stars, flowers, plain)
  - Name rendered below in decorative font
  - "Snap!" → offscreen canvas → `canvas.toBlob()` → download/Web Share API
  - Max 2048x2048 for iPad Safari
  - Shutter-click sound
- **Creature trading card** (from Gallery):
  - "Card" button → trading-card-style image:
    - Creature render centered
    - Auto-generated species name (cat+dragon = "Catagon")
    - Stats: Age, Growth Stage, Personality, Times Fed, Park Visits
    - Decorative border matching theme
  - Downloadable as PNG
- **"Show Mode"** — tap creature in Gallery for full-screen display with idle animation at large scale

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
