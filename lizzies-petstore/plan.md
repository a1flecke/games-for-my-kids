# Imaginary Creatures — Lizzie's Petstore

## Context

A new game for 7-year-old girls: design fantastical creatures from mix-and-match body parts, style them with colors/coverings/accessories, then care for them in a room you decorate, with interactive mini-games for each care activity. Bonus: take pets to a pet park to meet randomly generated creatures.

**Directory:** `lizzies-petstore/`
**Index icon:** `🦄🐾✨`
**Index title:** "Lizzie's Petstore"
**Index description:** "Design magical creatures from mix-and-match parts, dress them up, and care for your imaginary pets!"
**Category:** `creativity` in `gameCategories` in `update-index.js`

---

## Design Principles (from expert reviews)

1. **No anxiety mechanics** — Needs only decay during active play (freeze when app closed). Floor at 20 (never desperate). No death, no sickness, no guilt.
2. **Icon-first UI** — Every button has a large icon. Text labels are secondary. A 7-year-old with dyslexia should never need to read to play.
3. **Guided first experience** — First creature is tutorial-guided (bouncing arrows, one step at a time). Free mode after.
4. **Exaggerated feedback** — Every interaction produces sparkles, bounces, hearts, sounds. Creatures react with joy, not just meter changes.
5. **Progression via unlocks** — Start with a basic set of parts/accessories. Unlock more through milestones (care for 3 creatures, visit park 5 times, etc.).
6. **Cute art style** — Thick 3-4px outlines, rounded shapes, BIG expressive eyes (25-30% of head), bright saturated colors, idle animations that breathe life into everything.
7. **Dress-up is first-class** — Quick wardrobe access in Care mode, not just in Creator. Tap-tap-tap to try looks.

---

## Technical Architecture

### Rendering Strategy: "Paper Doll" with Offscreen Caching

Each body part is drawn procedurally to its own **offscreen canvas** once (on creation or modification). The game loop composites cached part canvases via `drawImage()` — a single GPU-accelerated call per part. Re-cache only when a part's color/covering/scale changes.

- **CreatureCache class** — Manages per-part offscreen canvases. On creature change, re-renders only the affected part. Exposes a `drawCreature(ctx, x, y, animState)` method that composites all parts with animation transforms.
- **Covering textures** — Pre-rendered as separate texture canvases per covering type (fur, scales, feathers, smooth) at standard sizes. Applied via `globalCompositeOperation = 'source-atop'` onto part shapes. One-time cost, not per-frame.
- **Park creature limit** — Maximum 6 creatures rendered simultaneously (1 player + 5 NPC). Each uses cached sprites.

### Touch Input: Pointer Events + Bounding Boxes

- Use **Pointer Events** (`pointerdown/move/up`) instead of touch events — unified mouse+touch, no 300ms delay, `setPointerCapture()` for drag tracking.
- CSS `touch-action: none` on canvas to prevent Safari scroll/zoom interference.
- **Hit testing** via bounding-box rectangles per part (defined in `parts.json`). No path-based hit testing needed.
- **Coordinate conversion**: `(clientX - rect.left) * (canvas.width / rect.width)` with DPR division.
- **60px minimum hitboxes** for body parts in creator (larger than standard 44px for small fingers).
- **Generous snap zones** (50px radius) for attachment points with visual glow indicators.

### Canvas + DPR

```js
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);
```

### Animation: Pivot-Based (Not Skeletal)

Each body part has a **pivot point** and simple animation curves (sine-wave rotation, bounce, scale oscillation). Parts drawn in z-order with `ctx.save() / translate / rotate / drawImage / restore`. No parent-child transform chain.

- Tail wag: rotate tail canvas around base pivot
- Wing flap: rotate wing canvases around shoulder pivot
- Breathing: scale torso on sine wave
- Head bob: translate head up/down
- Delta-time based, 60fps target, cap delta at 50ms for RAF throttling

### Sound Design: Warm Web Audio

All creature voices use **sine waves only** (softest oscillator type) with:
- **Low-pass BiquadFilterNode** (800-1200Hz cutoff) to remove harshness
- **Layer 2-3 detuned sine oscillators** for warmth (chorus effect)
- Short durations (50-150ms) with fast attack, slow release envelopes
- `OscillatorNode.detune` for per-creature voice uniqueness
- Noise-based sounds (water, brushing) via `AudioBuffer` filled with `Math.random()`
- **Default all sounds to cute end** — growls are soft and cartoony, never deep or sudden
- Sound preview when selecting voice type in Creator

### State Machine

```
TITLE → CREATOR → BIRTH_ANIMATION → CARE (hub) → PARK
                                   ↕ WARDROBE
                                   ↕ ROOM_EDIT
  GALLERY ↔ CARE
  GALLERY → CREATOR (edit existing)
```

### Save System

- **LocalStorage key:** `lizzies-petstore-save`
- **Schema version:** `schemaVersion: 1` in save data for future migration
- **Auto-save:** Debounced 2s on every creature/room change
- **Max 20 creatures** (soft limit with friendly "gallery full" message)
- **Backup key:** `lizzies-petstore-save-backup` updated every 5th save
- **Needs freeze:** `lastCaredAt` only used for within-session decay. On app reopen, creature greets happily regardless of absence. Max decay capped at 24 hours, floor at 20.

### Creature Data Model
```json
{
  "schemaVersion": 1,
  "id": "crypto.randomUUID()",
  "name": "Sparklehorn",
  "createdAt": 1709136000000,
  "growthStage": "baby",
  "totalCareActions": 0,
  "personality": "playful",
  "body": {
    "torso": { "type": "round", "covering": "fur", "pattern": "spots", "color": "#FF69B4", "scale": 1.0 },
    "head": { "type": "cat", "covering": "fur", "color": "#FF69B4", "scale": 0.8 },
    "eyes": { "type": "sparkle", "color": "#4A90D9" },
    "legs": [
      { "type": "paws", "color": "#FFD700", "position": "front-left" },
      { "type": "paws", "color": "#FFD700", "position": "front-right" }
    ],
    "tail": { "type": "fluffy", "color": "#9B59B6" },
    "wings": { "type": "butterfly", "color": "#00CED1", "pattern": "gradient" },
    "extras": [{ "type": "unicorn-horn", "color": "#FFD700" }]
  },
  "accessories": [
    { "type": "crown", "slot": "head", "color": "#FFD700" }
  ],
  "room": {
    "wallColor": "#FFE4E1",
    "items": [{ "type": "bed", "x": 0.2, "y": 0.7 }]
  },
  "needs": { "hunger": 80, "cleanliness": 90, "energy": 70, "happiness": 85 },
  "lastActiveAt": 1709136000000,
  "favorites": { "food": "cupcake" }
}
```

### File Structure
```
lizzies-petstore/
  index.html
  css/style.css
  js/
    game.js, creator.js, renderer.js, creature-cache.js, parts.js,
    accessories.js, animation.js, care.js, room.js, park.js,
    audio.js, save.js, tutorial.js, ui.js, progress.js
  data/
    parts.json, accessories.json, themes.json, unlocks.json, names.json
  scripts/
    validate-creature-data.js
```

---

## Session Plan (14 sessions)

### Session 1 — Claude Tooling + Project Scaffold [COMPLETE]
Opus | Rules, hooks, skills, agents, validation, skeleton files

### Session 2 — Core Engine + Index Registration
Opus | State machine, Canvas setup, save system, index registration

### Session 3 — Body Part Drawing Library
Opus | Procedural Canvas drawing for all body part types

### Session 4 — Creator Studio: Layout, Palette, and Placement
Opus | Creator screen UI, part selection, placement system

### Session 5 — Creator Studio: Styling Tools
Opus | Colors, coverings, patterns, resize, rotate, eye customization

### Session 6 — Accessories, Themes, and Naming
Sonnet | Accessory catalog, theme system, creature naming, data files

### Session 7 — Animation Engine
Opus | Pivot-based animation for all creature states

### Session 8 — Audio System
Opus | Warm Web Audio synthesis, creature voices, interaction SFX

### Session 9 — Care Mode: Room, Needs, and Mini-Games
Opus | Creature room, needs meters, interactive care activities

### Session 10 — Wardrobe + Room Decoration
Opus | Quick dress-up in care mode, room customization

### Session 11 — Pet Gallery + Progression System
Sonnet | Gallery view, unlocks, milestones, achievements

### Session 12 — Pet Park
Opus | Park scene, random creatures, social interactions

### Session 13 — Photo Mode + Creature Cards + Sharing
Sonnet | Screenshot/share features, creature trading cards

### Session 14 — Polish, Accessibility, iPad QA
Opus | A11y audit, touch polish, performance optimization, final testing

---

## Session Conventions (all sessions)

Each session starts with:
1. Run `/petstore-checklist` to review coding rules
2. Read the session deliverables

Each session ends with:
1. Delete the session working file (if any)
2. Run `/validate-petstore-data` (if data files were modified)
3. Run `node lizzies-petstore/scripts/validate-creature-data.js`
4. Run petstore-web-review agent to catch bugs
5. If new gotchas discovered, update MEMORY.md `## lizzies-petstore: key gotchas` section
6. Commit all work with descriptive message
7. Push to main
