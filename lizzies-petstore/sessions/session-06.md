# Session 6 — Accessories, Themes, and Naming
**Model:** Sonnet | **Focus:** Accessory catalog, theme system, creature naming, data files

---

## Pre-flight
1. Run `/petstore-checklist`
2. Read this plan fully before writing code

---

## Step 1 — Expand `data/accessories.json` (42 accessories)

Replace the existing 10-item placeholder catalog with the full 42-item catalog. Each entry follows the existing schema:

```json
{
  "id": "acc-<kebab-name>",
  "name": "<Display Name>",
  "slot": "head|neck|body|feet|face",
  "defaultColor": "#HEXVAL",
  "compatibleParts": [],
  "unlockCondition": null | "<milestone-id>",
  "tags": ["<tag>", ...]
}
```

### Full Accessory List

**Head (12):**
| ID | Name | Default Color | Unlock | Tags |
|----|------|---------------|--------|------|
| acc-crown | Crown | #FFD700 | null | fancy, starter |
| acc-tiara | Tiara | #C0C0C0 | milestone-kid-stage | fancy |
| acc-party-hat | Party Hat | #FF6B6B | null | fun, starter |
| acc-top-hat | Top Hat | #2C2416 | milestone-mythical | fancy |
| acc-beanie | Beanie | #4A90D9 | null | cute, starter |
| acc-flower-crown | Flower Crown | #FF69B4 | null | cute, starter |
| acc-butterfly-clip | Butterfly Clip | #9B59B6 | null | cute, starter |
| acc-bow | Bow | #FF69B4 | null | cute, starter |
| acc-headband | Headband | #FFD700 | null | cute, starter |
| acc-princess-cone | Princess Cone Hat | #FF69B4 | milestone-kid-stage | fancy |
| acc-cat-ears-band | Cat Ears Headband | #FF69B4 | null | cute, starter |
| acc-star-hairpin | Star Hairpin | #FFD700 | null | cute, starter |

**Neck (8):**
| ID | Name | Default Color | Unlock | Tags |
|----|------|---------------|--------|------|
| acc-bow-tie | Bow Tie | #FF0000 | null | fancy, starter |
| acc-necklace | Necklace | #FFD700 | null | fancy, starter |
| acc-scarf | Scarf | #FF6B6B | null | cute, starter |
| acc-feather-boa | Feather Boa | #FF69B4 | milestone-kid-stage | fancy |
| acc-ribbon | Ribbon | #FF69B4 | null | cute, starter |
| acc-collar-bell | Collar with Bell | #FF0000 | null | cute, starter |
| acc-lei | Lei | #FF69B4 | milestone-park-visit | nature |
| acc-medal | Medal | #FFD700 | milestone-5-creatures | fancy |

**Body (10):**
| ID | Name | Default Color | Unlock | Tags |
|----|------|---------------|--------|------|
| acc-cape | Cape | #9B59B6 | null | adventure, starter |
| acc-vest | Vest | #8B4513 | null | adventure, starter |
| acc-tutu | Tutu | #FF69B4 | milestone-kid-stage | fancy |
| acc-dress | Dress | #FF69B4 | milestone-kid-stage | fancy |
| acc-armor | Armor | #C0C0C0 | milestone-mythical | adventure |
| acc-saddle | Saddle | #8B4513 | milestone-mythical | adventure |
| acc-backpack | Backpack | #4A90D9 | null | adventure, starter |
| acc-fairy-wings-deco | Fairy Wings (Decorative) | #00CED1 | milestone-kid-stage | magical |
| acc-superhero-cape | Superhero Cape | #FF0000 | milestone-5-creatures | adventure |
| acc-sweater | Sweater | #FF6B6B | null | cute, starter |

**Feet (6):**
| ID | Name | Default Color | Unlock | Tags |
|----|------|---------------|--------|------|
| acc-boots | Boots | #8B4513 | null | adventure, starter |
| acc-socks | Socks | #FF69B4 | null | cute, starter |
| acc-leg-warmers | Leg Warmers | #FF69B4 | null | cute, starter |
| acc-anklets | Anklets | #FFD700 | null | cute, starter |
| acc-slippers | Slippers | #FF69B4 | null | cute, starter |
| acc-roller-skates | Roller Skates | #FF0000 | milestone-5-creatures | fun |

**Face (6):**
| ID | Name | Default Color | Unlock | Tags |
|----|------|---------------|--------|------|
| acc-glasses | Glasses | #2C2416 | null | fun, starter |
| acc-heart-sunglasses | Heart Sunglasses | #FF69B4 | null | fun, starter |
| acc-star-sunglasses | Star Sunglasses | #FFD700 | null | fun, starter |
| acc-monocle | Monocle | #FFD700 | milestone-mythical | fancy |
| acc-masquerade-mask | Masquerade Mask | #9B59B6 | milestone-kid-stage | fancy |
| acc-nose-ring | Nose Ring | #FFD700 | milestone-5-creatures | fun |

**Unlock conditions used:** `null` (starter), `milestone-kid-stage`, `milestone-mythical` (3 creatures), `milestone-5-creatures`, `milestone-park-visit`. All exist in `data/unlocks.json`.

> **IMPORTANT:** The original plan used `milestone-3-creatures` which does NOT exist in `unlocks.json`. The correct milestone for "3 creatures" is `milestone-mythical`. Never invent unlock IDs — always verify against `unlocks.json`.

**`compatibleParts`:** Leave as `[]` (all parts compatible) for most. For face-slot accessories, populate with head IDs that have a flat-enough face to render correctly: `["head-cat", "head-dog", "head-bunny", "head-fox", "head-bear", "head-unicorn"]`.

### Update `data/unlocks.json` Rewards

The existing `unlocks.json` references accessories that won't exist in the new catalog:
- `milestone-5-fed` rewards `acc-chef-hat` — **rename to `acc-party-hat`** (already a starter, so remove from rewards) or pick a more fitting accessory. Best fix: change reward to `acc-scarf` (a cute starter they might not have discovered).
- `milestone-park-visit` rewards `acc-explorer-hat` — **rename to `acc-backpack`** (adventure-themed, fitting for park exploration).
- `milestone-5-park-visits` rewards `acc-park-badge` — **rename to `acc-medal`** (medals fit "park regular" theme).

Update these reward references so validation passes.

### Validation
After writing both files: run `node lizzies-petstore/scripts/validate-creature-data.js` to confirm schema + referential integrity passes clean.

---

## Step 2 — Procedural Accessory Drawing in `accessories.js`

Replace the placeholder `drawAccessory()` with real procedural Canvas 2D drawing for all 42 accessories. Keep the same API signature: `drawAccessory(ctx, accessoryId, color, scale)`.

### Drawing Rules
- **Thick outlines:** 3-4px `lineWidth`, stroke color `#2C2416`
- **Rounded shapes:** Use `roundRect`, arcs, bezier curves — nothing sharp
- **Color parameter:** `color` fills the main shape. Accents (gems, bells, buckles) use derived colors: lighter (`_lighten(color, 0.3)`) for highlights, `#FFD700` for gold accents, `#C0C0C0` for silver
- **Draw size:** Each accessory draws into a **60x60 logical pixel** box (will be scaled by `scale` param). Caller manages DPR on the target canvas.
- **No `Math.random()`** — accessories must render identically every call (deterministic, no seeded PRNG needed since no procedural texture variation)

Add a `_lighten(hex, amount)` and `_darken(hex, amount)` helper to `AccessoriesLibrary` for deriving accent colors.

### Per-Type Drawing Specs

**Head accessories** — drawn centered horizontally, sitting on top of box (y=0 is top edge where head crown would be):
- `crown`: 5-point crown shape with gem circles at peaks
- `tiara`: curved band arc with center jewel oval + side sparkle dots
- `party-hat`: triangle/cone with pom-pom circle at tip + stripe lines
- `top-hat`: rectangle brim + tall rectangle body, band stripe
- `beanie`: half-circle dome with fold line at bottom edge
- `flower-crown`: arc band with 5 small flower circles (5-petal each)
- `butterfly-clip`: small butterfly (4 wing ovals + body line), offset slightly to one side
- `bow`: two rounded triangles meeting in center circle knot
- `headband`: thin arc across top
- `princess-cone`: tall triangle with star at tip + veil curve at base
- `cat-ears-band`: thin arc with two triangle ear shapes at ends
- `star-hairpin`: small 5-point star on short line, offset to one side

**Neck accessories** — drawn centered horizontally, narrow vertical band:
- `bow-tie`: two triangles meeting at center knot circle
- `necklace`: U-curve arc chain with pendant circle at center bottom
- `scarf`: draped rectangle with fringe lines at end
- `feather-boa`: fluffy zigzag with soft edge arcs along the curve
- `ribbon`: simple tied ribbon (loop + tails)
- `collar-bell`: band arc with small circle (bell) at center bottom
- `lei`: arc of alternating colored flower circles
- `medal`: ribbon V shape + circle with star inscribed at bottom

**Body accessories** — drawn larger, covering torso area:
- `cape`: trapezoid flowing behind, scalloped bottom edge
- `vest`: open-front rectangle with lapel lines
- `tutu`: series of overlapping petal/scallop arcs across waist
- `dress`: A-line shape from shoulders to hem with collar
- `armor`: chest plate shape with cross or crest lines
- `saddle`: curved rectangle on top with stirrup circles on sides
- `backpack`: rounded rectangle with strap lines + small buckle square
- `fairy-wings-deco`: pair of translucent wing shapes (draw at `globalAlpha = 0.5`; restore alpha after drawing — do NOT use `source-atop` since these float behind the body, not clipped to it)
- `superhero-cape`: flowing cape shape with emblem circle
- `sweater`: rounded rectangle body + sleeve bumps + neck ribbing lines

**Feet accessories** — drawn small, at bottom of box:
- `boots`: rounded boot shape (toe curve + shaft rectangle)
- `socks`: ankle-high rounded shapes with ribbed top lines
- `leg-warmers`: scrunched tube shapes with horizontal lines
- `anklets`: small chain of circles around ankle line
- `slippers`: rounded low shapes with pom-pom circle on top
- `roller-skates`: boot shape + 4 small circles at bottom (wheels)

**Face accessories** — drawn to fit over eye/nose area of head:
- `glasses`: two circles connected by bridge line, arm lines to sides
- `heart-sunglasses`: two heart shapes connected by bridge arc
- `star-sunglasses`: two 5-point stars connected by bridge arc
- `monocle`: single circle with chain curve hanging down
- `masquerade-mask`: curved mask shape with two eye-hole ovals + stick line extending right
- `nose-ring`: small circle/hoop at center bottom

### Anchor Adaptation System

Replace the generic `getAnchor()` with per-head-type anchors for `head` and `face` slots. These define where the accessory renders relative to the head part's bounding box:

```js
const HEAD_ACCESSORY_ANCHORS = {
    'head-cat':     { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 },
    'head-dog':     { x: 0.5, y: -0.05, rotation: 0, scale: 1.0 },
    'head-bird':    { x: 0.5, y: -0.10, rotation: -5, scale: 0.8 },
    'head-bunny':   { x: 0.5, y: -0.15, rotation: 0, scale: 0.85 },
    'head-dragon':  { x: 0.5, y: -0.05, rotation: 0, scale: 1.1 },
    'head-fox':     { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 },
    'head-owl':     { x: 0.5, y: -0.10, rotation: 0, scale: 0.85 },
    'head-bear':    { x: 0.5, y: -0.05, rotation: 0, scale: 1.0 },
    'head-unicorn': { x: 0.5, y: -0.08, rotation: 0, scale: 0.95 },
    'head-mermaid': { x: 0.5, y: -0.05, rotation: 0, scale: 0.9 }
};

const FACE_ACCESSORY_ANCHORS = {
    'head-cat':     { x: 0.5, y: 0.35, rotation: 0, scale: 0.8 },
    'head-dog':     { x: 0.5, y: 0.40, rotation: 0, scale: 0.85 },
    'head-bunny':   { x: 0.5, y: 0.35, rotation: 0, scale: 0.8 },
    'head-fox':     { x: 0.5, y: 0.38, rotation: 0, scale: 0.8 },
    'head-bear':    { x: 0.5, y: 0.38, rotation: 0, scale: 0.9 },
    'head-unicorn': { x: 0.5, y: 0.35, rotation: 0, scale: 0.85 }
};
```

Neck, body, and feet anchors remain generic defaults (keyed by slot only). Body accessories render relative to the torso center; feet relative to the legs attachment point; neck between head and torso.

---

## Step 3 — Accessory Rendering in CreatureCache

### Current bug
`buildCache()` has `if (slot === 'accessories') continue;` and a comment "handled separately" — but accessories are never actually rendered. `drawCreatureById()` iterates `RENDER_ORDER` including `'accessories'` but finds no cached canvas for it, so nothing draws.

### Fix: Render accessories in `buildCache()`

Remove the `continue` for accessories. Instead, when `slot === 'accessories'`:

1. Read `creatureData.accessories` array (may be empty or missing)
2. If empty/missing, skip (no canvas needed)
3. Create ONE offscreen canvas for all accessories composited together
4. For each accessory in the array:
   - Look up anchor position based on `acc.slot` and the creature's head type (for head/face slots)
   - Call `window.accessoriesLib.drawAccessory(ctx, acc.type, acc.color, anchorScale)` at the computed position
5. Store as `cache['accessories'] = { canvas, w, h }`

**Sizing:** The accessories composite canvas should be the same size as the overall creature display bounds (approximately `displaySize x displaySize`) so accessories can be positioned relative to body parts.

**Head type lookup:** To compute face/head accessory anchors, `buildCache` needs the creature's head type: `creatureData.body.head?.type || null`. Pass this to `accessoriesLib.getAnchor(slot, headType)`.

### Fix: `invalidatePart('accessories', ...)` must re-render the accessories canvas

Currently `invalidatePart` tries to look up part data via `_getPartData(body, partSlot)` — this fails for accessories since they're in `creature.accessories[]`, not `creature.body.accessories`. Add a special case:

```js
if (partSlot === 'accessories') {
    this._buildAccessoriesCanvas(creatureId, creatureData, displaySize);
    return;
}
```

Extract the accessories canvas logic into a `_buildAccessoriesCanvas(creatureId, creatureData, displaySize)` helper called by both `buildCache` and `invalidatePart`.

### Accessory draw IDs

`drawAccessory()` currently takes an `accessoryId` (e.g., `"acc-crown"`). The creature data model stores `type: "crown"` (without prefix). The library's `getById()` expects the full ID. Ensure consistency: either store the full `"acc-crown"` ID in creature data, or strip the prefix in `drawAccessory()`. **Decision:** Store `"acc-crown"` as the `type` in `creature.accessories[]` to match the catalog IDs exactly. This is a change from the plan.md data model which shows `type: "crown"` — update to `type: "acc-crown"`.

---

## Step 4 — Accessory Tab in Creator

### HTML: Add tab button to `#creator-tabs` in `index.html`

Add after the Extras tab:
```html
<button class="tab" role="tab" data-category="accessories" aria-label="Dress Up" aria-selected="false">
    <span class="tab-icon">🎀</span>
</button>
```

### `_populateStrip` special case for accessories

`_populateStrip(category)` currently calls `window.partsLib.getByCategory(category)` — this returns nothing for `'accessories'` since accessories are in a separate catalog. Add a branch:

```js
_populateStrip(category) {
    // ...existing code...
    if (category === 'accessories') {
        this._populateAccessoryStrip();
        return;
    }
    const parts = window.partsLib.getByCategory(category);
    // ...rest of existing code...
}
```

### `_populateAccessoryStrip()` — new method

Groups accessories by slot with visual dividers:

1. For each slot in order (`head`, `neck`, `body`, `feet`, `face`):
   - Render a non-interactive slot header: `<div class="strip-slot-label" aria-hidden="true">👑 Head</div>`
   - Slot icons: head=👑, neck=🎀, body=👗, feet=👢, face=👓
   - For each accessory in that slot from `window.accessoriesLib.getBySlot(slot)`:
     - Create a `.part-thumb-wrap` button (same pattern as body parts)
     - Draw a 72x72 thumbnail via `accessoriesLib.drawAccessory()` on a small offscreen canvas
     - Locked accessories (unlock condition not met) get the 🔒 overlay and `disabled` attribute
     - **Equipped indicator:** If this accessory is already on the creature, add a `.equipped` class (checkmark badge or colored border)

### Tap-to-Equip/Unequip

- Tap an accessory thumbnail:
  - If NOT equipped → equip: push `{ type: accId, slot: accSlot, color: accDefaultColor }` onto `creature.accessories[]`. Remove any existing accessory in the same slot first (one per slot max).
  - If already equipped (same ID) → unequip: remove from `creature.accessories[]`
  - Push undo snapshot (see below)
  - Invalidate accessories cache: `window.creatureCache.invalidatePart(creature.id, 'accessories', creature)`
  - Recompute hit boxes
  - Play sparkle particles at attachment point on equip
  - Update the equipped indicator on the strip

### Accessory Selection on Canvas

When user taps the creature on the canvas, hit testing must also check accessory bounding boxes. Add accessory hit boxes to `_computePartHitBoxes()`:

- For each equipped accessory, compute its screen position using the same anchor logic as `drawCreatureById` and store in `_partHitBoxes` with a key like `'acc:head'` or `'acc:neck'` (prefixed to distinguish from body slots)
- When an accessory hit box is tapped, set `this._selectedAccessory = accIndex` (new field) and show the style panel in accessory mode

### Accessory Style Panel Mode

When an accessory is selected (via canvas tap or strip tap of equipped accessory):
- Show the style panel with **only the Color tab visible**. Hide texture, transform, and eyes tabs.
- Add a method `_showStylePanelForAccessory(accIndex)` that:
  - Hides tabs: texture, transform, eyes (set `classList.add('hidden')`, `setAttribute('aria-hidden', 'true')`)
  - Shows only color tab selected
  - Color changes call `_onAccessoryColorChange(hex)` which updates `creature.accessories[accIndex].color` and invalidates cache
- When switching back to body part selection, restore all style tabs to visible
- Track which mode the style panel is in with a `_stylePanelMode` field: `'part'` or `'accessory'`

### New creator state fields

```js
this._selectedAccessory = null;  // index into creature.accessories[] or null
this._stylePanelMode = 'part';   // 'part' | 'accessory'
```

Clear both in `cancel()` and `startCreating()`.

### Undo/Redo

The undo system currently snapshots `this._creature.body`. It must ALSO snapshot `this._creature.accessories`:

- `_pushUndo()`: deep-clone both `this._creature.body` AND `this._creature.accessories`
- `_applyUndo(snapshot)`: restore both body and accessories from snapshot
- Verify that accessory equip, unequip, and color change all call `_pushUndo()` before mutating

### Thumbnail caching for accessories

`_buildThumbnailCache()` currently builds thumbnails for body parts only. Add a section that iterates all accessories from the catalog and renders 72x72 thumbnails via `drawAccessory()`. Store in the same `_thumbnailCache` Map with the accessory ID as key (e.g., `'acc-crown'`).

> **IMPORTANT:** `_buildThumbnailCache()` must wait for `accessoriesLib.loadCatalog()` to complete. See Step 7 for async loading fix.

---

## Step 5 — Enhance `data/themes.json`

Add two new fields to each of the 10 existing themes:

```json
{
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "sceneElements": ["element1", "element2"]
}
```

- `colorPalette`: 5 suggested creature colors that look good with that theme's background
- `sceneElements`: Decorative keywords for background scene rendering (consumed by `room.js` in session 9 — for now, just define the data). E.g., `["stars", "moon"]` for Nighttime, `["bubbles", "seaweed"]` for Underwater.

### Theme-Accessory Reference Updates

Update `suggestedAccessories` arrays to reference valid new accessory IDs:
- Party: `["acc-party-hat", "acc-bow-tie"]` (already correct)
- Morning: `["acc-flower-crown", "acc-ribbon"]`
- Nighttime: `["acc-star-hairpin", "acc-masquerade-mask"]`
- Adventure: `["acc-cape", "acc-boots", "acc-backpack"]`
- Fancy: `["acc-crown", "acc-tiara", "acc-necklace", "acc-dress"]`
- Space: `["acc-superhero-cape", "acc-star-sunglasses"]`
- Underwater: `["acc-lei", "acc-anklets"]`
- Rainbow: `["acc-flower-crown", "acc-tutu", "acc-leg-warmers"]`
- School: `["acc-backpack", "acc-glasses"]`
- Galaxy: `["acc-star-sunglasses", "acc-cape"]`

After writing: run `node lizzies-petstore/scripts/validate-creature-data.js`.

---

## Step 6 — Naming Screen Overhaul

### Current problems
1. `_populateNamePresets()` uses a hardcoded 12-name list — ignores `data/names.json` entirely
2. No vibe category filters
3. No species name generation
4. "Welcome!" button always enabled (falls back to "Creature" if empty)
5. No back button to return to creator
6. `role="option"` on name buttons inside `role="listbox"` container — must use `aria-selected`, not `aria-pressed` (per CLAUDE.md ARIA rules)

### HTML Changes (`index.html`)

Replace the naming screen content:

```html
<div id="screen-naming" class="screen" aria-label="Name your creature">
    <div class="naming-top-bar">
        <button id="btn-naming-back" class="btn btn-icon" aria-label="Back to creator">
            <span class="btn-icon">←</span>
        </button>
        <h2>Name Your Creature!</h2>
    </div>
    <canvas id="naming-preview" aria-label="Creature preview"></canvas>
    <p id="species-name" class="species-label" aria-live="polite"></p>
    <div id="vibe-filters" class="vibe-filter-bar" role="tablist" aria-label="Name categories">
        <button class="vibe-tab" role="tab" data-vibe="all" aria-selected="true">All</button>
        <button class="vibe-tab" role="tab" data-vibe="cute" aria-selected="false">🩷 Cute</button>
        <button class="vibe-tab" role="tab" data-vibe="silly" aria-selected="false">😜 Silly</button>
        <button class="vibe-tab" role="tab" data-vibe="magical" aria-selected="false">✨ Magic</button>
        <button class="vibe-tab" role="tab" data-vibe="nature" aria-selected="false">🌿 Nature</button>
        <button class="vibe-tab" role="tab" data-vibe="space" aria-selected="false">🚀 Space</button>
    </div>
    <div id="name-presets" class="name-grid" role="listbox" aria-label="Name suggestions">
        <!-- Populated dynamically -->
    </div>
    <div class="name-input-wrap">
        <input type="text" id="name-input" class="name-input"
               maxlength="20" placeholder="Or type a name..."
               aria-label="Custom creature name"
               autocomplete="off" spellcheck="false">
    </div>
    <button id="btn-birth" class="btn btn-primary" disabled aria-label="Welcome your creature!">
        <span class="btn-icon">🎉</span>
        <span class="btn-text">Welcome!</span>
    </button>
</div>
```

### State transition: Add NAMING → CREATOR back navigation

In `game.js._bindScreenButtons()`:
```js
document.getElementById('btn-naming-back').addEventListener('click', () => {
    this.setState('CREATOR');
});
```

In `_enterState('CREATOR')`: if returning from NAMING, the creator should still have the creature loaded (don't call `startCreating()` again). Only call `startCreating()` when coming from TITLE/GALLERY. Track this with a flag or check if `window.creator._creature` is already set.

> **IMPORTANT:** The current flow is: Creator Done → NAMING → Welcome → save creature → BIRTH. If user goes NAMING → back → CREATOR, the creature should NOT be saved yet. The creature is only saved on "Welcome!" click. This is already correct since `saveManager.addCreature()` is only called in the btn-birth handler.

### Load names from `data/names.json`

Fetch `names.json` during `_enterState('NAMING')` (or preload during `init()`). Store on game instance:

```js
async _loadNames() {
    if (this._namesData) return; // already loaded
    const resp = await fetch('data/names.json');
    this._namesData = await resp.json();
}
```

Call `await this._loadNames()` at the top of `_populateNamePresets()` (make it async). Since NAMING is a DOM-only screen (no RAF drawing), the brief async delay is acceptable.

### `_populateNamePresets()` rewrite

1. Load names from `this._namesData`
2. Render ALL names (all vibes) as `role="option"` buttons with `data-vibe` attribute and `aria-selected="false"`
3. Style as `.name-pill` buttons (pill-shaped, 44px min-height)
4. Default: all visible ("All" filter active)

### Vibe filter behavior

- Tap a vibe tab → set `aria-selected="true"` on it, `"false"` on others
- Filter name pills: matching vibe gets `removeAttribute('aria-hidden')` + `style.display` removed. Non-matching gets `setAttribute('aria-hidden', 'true')` + `classList.add('hidden')`. (Use `.hidden` class per coding standards — never `style.display`.)

> **Wait — name pills are list items, not overlays.** Per CLAUDE.md: `removeAttribute('aria-hidden')` is correct for *filtered list items*. Overlays use explicit `'true'`/`'false'`. So for name pills: `removeAttribute('aria-hidden')` to show, `setAttribute('aria-hidden', 'true')` to hide. Add `.hidden` class for visual hide.

### Name pill selection

- Tap a name pill → fill `#name-input` with that name
- Set `aria-selected="true"` on tapped pill, `"false"` on all others (correct for `role="option"` per CLAUDE.md)
- Do NOT use `aria-pressed` — that's for toggle buttons, not options in a listbox
- If user types in the custom input, deselect all pills (`aria-selected="false"` on all)

### "Welcome!" button enable/disable

- Use the native `disabled` attribute (it's a `<button>`, not a role="button" div)
- Enable when `#name-input` has ≥ 1 non-whitespace character
- Listen to both `input` event on the text field AND name pill clicks
- Remove the `|| 'Creature'` fallback in the btn-birth click handler — button is disabled when empty, so this case can't happen. But keep a defensive fallback of `'My Creature'` just in case.

### Auto-Generated Species Name

Add `_generateSpeciesName(creature)` to `game.js`:

```js
_generateSpeciesName(creature) {
    const headNames = {
        'cat': 'Cat', 'dog': 'Pup', 'bird': 'Bird', 'bunny': 'Bunny',
        'dragon': 'Dragon', 'fox': 'Fox', 'owl': 'Owl', 'bear': 'Bear',
        'unicorn': 'Unicorn', 'mermaid': 'Merfolk'
    };
    const torsoMods = {
        'round': 'Chubby', 'oval': 'Sleek', 'long': 'Slinky',
        'stocky': 'Sturdy', 'serpentine': 'Wiggly', 'fluffy-cloud': 'Fluffy',
        'heart': 'Lovely', 'star': 'Starry'
    };
    const suffixes = {
        'wings': '-wing', 'tail': '-tail', 'extras': '-horn'
    };

    const headType = creature.body.head?.type || 'cat';
    const torsoType = creature.body.torso?.type || 'round';
    const headName = headNames[headType] || 'Creature';
    const mod = torsoMods[torsoType] || '';

    // Pick one suffix based on most distinctive extra part
    let suffix = '';
    if (creature.body.wings) suffix = suffixes.wings;
    else if (creature.body.extras?.length > 0) suffix = suffixes.extras;
    else if (creature.body.tail) suffix = suffixes.tail;

    return mod ? `${mod} ${headName}${suffix}` : `${headName}${suffix}`;
}
```

Display in `#species-name` element on entering NAMING state. Use `textContent` (not `innerHTML`).

### CSS Styling (add to `css/style.css`)

```css
.name-pill {
    min-height: 44px;
    padding: 8px 16px;
    border-radius: 22px;
    border: 2px solid #D4C5A9;
    background: #F5F0E8;
    color: #2C2416;
    font-size: 16px;
    cursor: pointer;
}
.name-pill[aria-selected="true"] {
    background: #FF69B4;
    color: #FFFFFF;
    border-color: #FF69B4;
}
.name-grid {
    max-height: 40vh;
    overflow-y: auto;
    gap: 8px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px;
}
.vibe-filter-bar {
    display: flex;
    gap: 4px;
    justify-content: center;
    padding: 8px;
    flex-wrap: wrap;
}
.vibe-tab {
    min-height: 44px;
    padding: 6px 12px;
    border-radius: 16px;
    border: 2px solid #D4C5A9;
    background: #F5F0E8;
    color: #2C2416;
    font-size: 14px;
    cursor: pointer;
}
.vibe-tab[aria-selected="true"] {
    background: #9B59B6;
    color: #FFFFFF;
    border-color: #9B59B6;
}
.species-label {
    color: #595143;
    font-style: italic;
    text-align: center;
    margin: 8px 0;
    font-size: 16px;
}
.naming-top-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
}
```

---

## Step 7 — Birth Animation Enhancement

### Current state
`_drawBirthAnimation()` draws sparkles + "Welcome!" text + creature name, but does NOT draw the actual creature. The creature cache is retrieved in `_enterState('BIRTH_ANIMATION')` via `saveManager.getCreature()`, but `creatureCache.buildCache()` is never called for the birth screen.

### Fix: Build creature cache on entering BIRTH_ANIMATION

In `_enterState('BIRTH_ANIMATION')`, after setting `_cachedCreature`, build the cache:

```js
case 'BIRTH_ANIMATION':
    this._birthTimer = 0;
    this._nextSparkleTime = 0;
    this._cachedCreature = this._activeCreatureId
        ? window.saveManager.getCreature(this._activeCreatureId) : null;
    this._setupCanvas('birth-canvas');
    // Build creature cache for rendering
    if (this._cachedCreature && this._activeCanvas) {
        const displaySize = Math.min(this._activeCanvas.w, this._activeCanvas.h) * 0.4;
        this._birthDisplaySize = displaySize;
        window.creatureCache.buildCache(
            this._cachedCreature.id, this._cachedCreature, displaySize
        );
    }
    break;
```

Add `this._birthDisplaySize = 0;` to the constructor.

### Enhanced Animation Sequence (2.5s total, same duration)

| Phase | Time | What happens |
|-------|------|-------------|
| Sparkle burst | 0–500ms | Radial sparkle explosion (keep existing) |
| Creature reveal | 500–1500ms | Creature scales from 0 → 1.2 → 1.0 (elastic ease), alpha 0 → 1 |
| Name flourish | 1500–2000ms | Creature name text fades in + floats up 20px |
| Hold | 2000–2500ms | Gentle idle bounce (sine scale 1.0 ± 0.03) + heart particles |

### Drawing the creature

In `_drawBirthAnimation()`, after progress > 0.2 (during reveal phase):

```js
if (progress > 0.2 && this._cachedCreature) {
    const revealProgress = Math.min(1, (progress - 0.2) / 0.4); // 0→1 over 0.2-0.6
    const elasticScale = this._elasticEaseOut(revealProgress);
    const alpha = Math.min(1, revealProgress * 2); // fade in faster

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h / 2);
    ctx.scale(elasticScale, elasticScale);
    ctx.translate(-w / 2, -h / 2);
    window.creatureCache.drawCreatureById(
        ctx, w / 2, h / 2, null, this._birthDisplaySize,
        this._cachedCreature.id
    );
    ctx.restore();
}
```

Add `_elasticEaseOut(t)` helper:
```js
_elasticEaseOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}
```

### Heart particles (2.0–2.5s)

During the hold phase, spawn heart-shaped particles floating upward. Use existing `renderer.spawnSparkles()` if it supports a shape parameter, or add a simple upward-floating heart drawn as two arcs + a triangle (small, 8px, pink `#FF69B4`). Use interval counter pattern:

```js
if (progress > 0.8 && this._birthTimer >= this._nextHeartTime) {
    this._nextHeartTime = this._birthTimer + 400;
    // spawn heart particle at random x near creature center
}
```

Add `this._nextHeartTime = 0;` and reset it alongside `_nextSparkleTime` in enter/exit.

### Name text positioning

Move the name text below the creature (not overlapping it):
```js
const nameY = h / 2 + this._birthDisplaySize * 0.6;
```

### Sound
No sound in this session (audio.js is session 8). Leave a comment:
```js
// TODO: Session 8 — play birth celebration sound here
```

---

## Step 8 — Integration & Async Loading

### Load accessories catalog during init

**Bug in current code:** `window.accessoriesLib = new AccessoriesLibrary()` is created in `game.js init()` but `loadCatalog()` is never called. Add it alongside the parts catalog load:

```js
// Load catalogs (fire-and-forget; resolves before user navigates)
window.partsLib.loadCatalog();
window.accessoriesLib.loadCatalog();
```

### Creator thumbnail cache timing

`_buildThumbnailCache()` runs during `startCreating()`, which happens when the user clicks "Create a Creature!". By this time, both `partsLib` and `accessoriesLib` should have their catalogs loaded (fetch was kicked off at init, user has to navigate through title screen first). But add a defensive guard:

```js
if (!this._accessoryCatalog) {
    this._accessoryCatalog = window.accessoriesLib._accessoryData;
}
if (!this._accessoryCatalog) return; // catalog not loaded yet
```

Or better: have `_buildThumbnailCache()` check `accessoriesLib._accessoryData` and skip accessory thumbnails if not yet loaded, with a note that they'll be built on first strip population.

### Creature data model: accessory type field

Standardize on storing the full catalog ID in `creature.accessories[].type`:
```json
{ "type": "acc-crown", "slot": "head", "color": "#FFD700" }
```

This matches `accessories.json` IDs and avoids prefix stripping. Update `_newCreatureTemplate()` in creator.js — the `accessories` array starts empty: `accessories: []`.

### Save data compatibility

`_newCreatureTemplate()` already creates `accessories: []`. Verify that `SaveManager` serializes and deserializes the accessories array correctly. Since it's already in the creature data model schema, this should work. But verify that existing saved creatures (from sessions 2-5) that lack an `accessories` field don't crash — add a default in the load path:

```js
creature.accessories = creature.accessories || [];
```

---

## Step 9 — Validation & Review

1. Run `node lizzies-petstore/scripts/validate-creature-data.js` — must pass clean
2. Run `/validate-petstore-data` skill — must pass clean
3. Manual verification checklist:
   - [ ] All 42 accessories draw correctly in thumbnails (no blank/broken)
   - [ ] Accessory tab (🎀) appears in creator and populates the strip with slot groupings
   - [ ] Tap accessory to equip — sparkles play, equipped indicator shows
   - [ ] Tap equipped accessory again to unequip
   - [ ] One accessory per slot max — equipping replaces previous
   - [ ] Accessory renders on creature on canvas at correct anchor position
   - [ ] Accessories adapt position per head type (crown on cat vs bird)
   - [ ] Color change applies to equipped accessory via style panel
   - [ ] Style panel shows only Color tab for accessories (no texture/transform/eyes)
   - [ ] Undo/redo works for accessory equip, unequip, and color changes
   - [ ] Naming screen loads all 64 names from `names.json`
   - [ ] Vibe filters show/hide correct names
   - [ ] Name pill tap fills the text input and selects the pill
   - [ ] Custom name input deselects all pills
   - [ ] "Welcome!" button disabled when name input empty, enabled when ≥ 1 char
   - [ ] Back button on naming screen returns to creator with creature intact
   - [ ] Species name generates correctly and displays
   - [ ] Birth animation shows creature with elastic bounce reveal
   - [ ] Birth animation shows creature name below creature
   - [ ] Heart particles spawn during hold phase
   - [ ] Full flow: Creator → accessories → Done → Name → Welcome → Birth → Care
   - [ ] Full flow with back: Creator → Done → Name → Back → Creator → Done → Name → Welcome
   - [ ] Existing creatures without accessories load without crash
4. Run `petstore-web-review` agent

---

## Files Modified

| File | Change |
|------|--------|
| `data/accessories.json` | Expand from 10 → 42 accessories with correct unlock IDs |
| `data/themes.json` | Add `colorPalette`, `sceneElements`, update `suggestedAccessories` |
| `data/unlocks.json` | Fix reward references: `acc-chef-hat` → `acc-scarf`, `acc-explorer-hat` → `acc-backpack`, `acc-park-badge` → `acc-medal` |
| `js/accessories.js` | Full procedural drawing for 42 accessories, anchor adaptation system, lighten/darken helpers |
| `js/creator.js` | Accessories tab + strip population, equip/unequip logic, accessory style panel mode, accessory hit boxes, undo/redo for accessories, accessory thumbnails |
| `js/creature-cache.js` | Remove `continue` for accessories slot, add `_buildAccessoriesCanvas()`, fix `invalidatePart('accessories')` |
| `js/game.js` | Load accessories catalog, rewrite `_populateNamePresets()` with names.json + vibe filters, add `_generateSpeciesName()`, name input enable/disable, NAMING→CREATOR back transition, build creature cache on BIRTH_ANIMATION entry, enhanced birth animation with elastic reveal + hearts, `_elasticEaseOut()` |
| `index.html` | Accessories tab in creator tabs, redesigned naming screen with vibe filters + back button |
| `css/style.css` | Name pills, vibe filters, species label, naming top bar, strip slot labels, equipped indicator, accessory-related styles |

---

## Session End Checklist
1. Delete session working files (if any)
2. Run `/validate-petstore-data`
3. Run `node lizzies-petstore/scripts/validate-creature-data.js`
4. Run petstore-web-review agent
5. If new gotchas discovered, update MEMORY.md
6. Commit all work with descriptive message
7. Push to main
