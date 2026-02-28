# Session 6 — Accessories, Themes, and Naming
**Model:** Sonnet | **Focus:** Accessory catalog, theme system, creature naming, data files

## Deliverables

- `accessories.js` — Accessory procedural drawing + wardrobe UI:
  - **Head** (12): crown, tiara, party hat, top hat, beanie, flower crown, butterfly clip, bow, headband, princess cone hat, cat ears headband, star hairpin
  - **Neck** (8): bow tie, necklace, scarf, feather boa, ribbon, collar with bell, lei, medal
  - **Body** (10): cape, vest, tutu, dress, armor, saddle, backpack, fairy wings (decorative), superhero cape, sweater
  - **Feet** (6): boots, socks, leg warmers, anklets, slippers, roller skates
  - **Face** (6): glasses, heart sunglasses, star sunglasses, monocle, masquerade mask, nose ring
  - Each with color parameter, drawn procedurally, attached via slot-specific anchor points per head/body type
  - **Accessory anchor adaption:** Each head type defines head-accessory anchor offsets. Crown on cat head vs bird head renders at different position/angle/scale.
- `data/accessories.json` — Full catalog with slot, compatibleParts, unlockCondition, colors
- `data/themes.json` — 10 themes with background scene, suggested accessories, color palette, ambient sound key
- `data/names.json` — 60 preset creature names organized by vibe (cute, silly, magical, nature, space)
- Creature naming screen: Scrollable preset name buttons + custom text input + auto-generated species name
- "Birth animation" transition: sparkle burst, creature bounce, first sound, name flourish → CARE

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
