# Session 10 — Hub: Wizard's Tower, Deck Builder, Codex
**Model:** Sonnet | **Focus:** The persistent home base — class picker, spell deck builder, codex (mastery heatmap with tap-to-drill), star-rating display, story-panel viewer, gold ledger.

By the end, the player has a "home" between runs that shows their progress, lets them tweak their loadout, and surfaces the mastery heatmap as a teaching tool.

## Pre-flight

1. Read spec sections 2.4 (Hub) and 5 (Save Schema).
2. Re-read CLAUDE.md sections on modal dialogs, focus return, dynamic aria-label, native `<button disabled>`.
3. Re-read `lizzies-petstore`'s settings panel as a precedent for layered overlays + focus return.
4. Run `/marauder-checklist`.

## Files to create

- `claudes-math-marauder/js/hub/hub.js` — Hub screen controller (top-level layout, button bindings)
- `claudes-math-marauder/js/hub/deckBuilder.js` — Deck builder overlay (pick 4 spells from owned)
- `claudes-math-marauder/js/hub/classPicker.js` — Class picker overlay (pick 1 of N unlocked classes)
- `claudes-math-marauder/js/hub/codex.js` — Codex overlay (13×13 mastery heatmap + tap-to-drill mini-fights)
- `claudes-math-marauder/js/hub/story.js` — Story panel viewer overlay (panels unlocked so far + audio narration)
- `claudes-math-marauder/js/hub/realmPicker.js` — Realm picker (5 realms, locked/unlocked + star rating per realm)

## Files to modify

- `claudes-math-marauder/js/game.js` — wire HUB state, route between hub overlays and run lifecycle
- `claudes-math-marauder/index.html` — add hub DOM scaffold (screens, overlay roots)
- `claudes-math-marauder/css/style.css` — hub layout, codex heatmap grid, deck-builder rows
- `claudes-math-marauder/js/save.js` — confirm `_defaults()` covers everything hub reads (audit pass)

## Deliverables

### 1. `index.html` HUB scaffold

```html
<!-- HUB screen: visible when game.state === 'HUB' -->
<section id="hub-screen" class="screen" aria-label="Wizard's Tower">
  <header class="hub-header">
    <h1>WIZARD'S TOWER</h1>
    <div class="hub-stats" role="group" aria-label="Stats">
      <div class="stat" id="hub-stat-gold"><span class="stat-icon" aria-hidden="true">💰</span><span class="stat-value" aria-label="Gold: 0">0</span></div>
      <div class="stat" id="hub-stat-class"><span class="stat-icon" aria-hidden="true">🧙</span><span class="stat-value" aria-label="Class: Apprentice">Apprentice</span></div>
    </div>
  </header>

  <div class="hub-grid">
    <button class="hub-tile" id="hub-btn-start-run" aria-label="Start a new run">
      <span class="tile-icon" aria-hidden="true">⚔️</span>
      <span class="tile-title">START RUN</span>
      <span class="tile-sub" id="hub-btn-start-run-sub">Choose a realm</span>
    </button>
    <button class="hub-tile" id="hub-btn-deck" aria-label="Build your spell deck">
      <span class="tile-icon" aria-hidden="true">📜</span>
      <span class="tile-title">DECK</span>
      <span class="tile-sub" id="hub-btn-deck-sub">4 spells equipped</span>
    </button>
    <button class="hub-tile" id="hub-btn-class" aria-label="Pick your wizard class">
      <span class="tile-icon" aria-hidden="true">🎓</span>
      <span class="tile-title">CLASS</span>
      <span class="tile-sub" id="hub-btn-class-sub">1 unlocked</span>
    </button>
    <button class="hub-tile" id="hub-btn-codex" aria-label="View the codex of facts">
      <span class="tile-icon" aria-hidden="true">📖</span>
      <span class="tile-title">CODEX</span>
      <span class="tile-sub" id="hub-btn-codex-sub">0 / 169 mastered</span>
    </button>
    <button class="hub-tile" id="hub-btn-story" aria-label="View story panels">
      <span class="tile-icon" aria-hidden="true">📚</span>
      <span class="tile-title">STORY</span>
      <span class="tile-sub" id="hub-btn-story-sub">0 panels</span>
    </button>
    <button class="hub-tile" id="hub-btn-settings" aria-label="Open settings">
      <span class="tile-icon" aria-hidden="true">⚙️</span>
      <span class="tile-title">SETTINGS</span>
      <span class="tile-sub">Voice, font, audio</span>
    </button>
  </div>

  <!-- Resume run banner (only when active run exists) -->
  <div id="hub-resume-banner" class="banner" hidden>
    <span class="banner-text">A run is in progress.</span>
    <button id="hub-btn-resume" class="primary">Resume</button>
    <button id="hub-btn-abandon" class="secondary">Abandon</button>
  </div>
</section>

<div id="overlay-root"></div>
```

### 2. `hub/hub.js`

```js
class HubScreen {
  constructor({ save, audio, hud, runtime, deckBuilder, classPicker, codex, story, realmPicker, settings }) {
    this._save = save;
    this._audio = audio;
    this._runtime = runtime;
    this._deckBuilder = deckBuilder;
    this._classPicker = classPicker;
    this._codex = codex;
    this._story = story;
    this._realmPicker = realmPicker;
    this._settings = settings;
    this._root = document.getElementById('hub-screen');
  }

  show() {
    this._root.classList.add('active');
    this._refresh();
    document.getElementById('hub-btn-start-run').focus();
    this._bind();
  }

  hide() {
    this._root.classList.remove('active');
    this._unbind();
  }

  _refresh() {
    const data = this._save.load();
    document.querySelector('#hub-stat-gold .stat-value').textContent = String(data.meta.gold);
    document.querySelector('#hub-stat-gold .stat-value').setAttribute('aria-label', `Gold: ${data.meta.gold}`);
    const classDef = this._classDefById(data.meta.classId);
    document.querySelector('#hub-stat-class .stat-value').textContent = classDef.name;
    document.querySelector('#hub-stat-class .stat-value').setAttribute('aria-label', `Class: ${classDef.name}`);
    const deckCount = (data.meta.deck || []).length;
    document.getElementById('hub-btn-deck-sub').textContent = `${deckCount} spells equipped`;
    const unlockedClasses = data.meta.unlockedClasses || ['apprentice'];
    document.getElementById('hub-btn-class-sub').textContent = `${unlockedClasses.length} unlocked`;
    const masteredCount = this._countMastered(data.mastery);
    document.getElementById('hub-btn-codex-sub').textContent = `${masteredCount} / 169 mastered`;
    const storyCount = (data.meta.storyUnlocked || []).length;
    document.getElementById('hub-btn-story-sub').textContent = `${storyCount} panels`;
    const banner = document.getElementById('hub-resume-banner');
    if (data.activeRun) banner.removeAttribute('hidden');
    else banner.setAttribute('hidden', '');
  }

  _bind() {
    document.getElementById('hub-btn-start-run').addEventListener('click', this._handlers.startRun);
    document.getElementById('hub-btn-deck').addEventListener('click', this._handlers.deck);
    document.getElementById('hub-btn-class').addEventListener('click', this._handlers.cls);
    document.getElementById('hub-btn-codex').addEventListener('click', this._handlers.codex);
    document.getElementById('hub-btn-story').addEventListener('click', this._handlers.story);
    document.getElementById('hub-btn-settings').addEventListener('click', this._handlers.settings);
    document.getElementById('hub-btn-resume').addEventListener('click', this._handlers.resume);
    document.getElementById('hub-btn-abandon').addEventListener('click', this._handlers.abandon);
  }

  _unbind() { /* mirror remove */ }
}
```

### 3. `hub/deckBuilder.js`

A modal overlay listing all owned spells (from `save.meta.spells`), with checkboxes for the 4 selected. Constraints:

- Min 3, max 4 spells equipped
- Each spell row shows: icon, name, factFamilyHint, baseDamage, description
- Spells the player doesn't own are dimmed and shown with `<button disabled aria-label="Locked: Frost Lance">`
- Tap a spell to toggle equipped state (with visual checkmark)
- "Save" button writes `save.meta.deck` and closes
- "Cancel" reverts unsaved changes

```js
class DeckBuilder {
  constructor({ save, spellsData, audio, focusReturnTo }) {
    this._save = save;
    this._spells = spellsData;        // loaded from data/spells.json
    this._audio = audio;
    this._overlay = null;
    this._draft = [];                 // working copy
    this._focusReturnTo = focusReturnTo; // element to refocus on close
    this._timers = { _resolveTimer: null };
  }

  open() {
    this.cancel();                     // re-entry guard
    const data = this._save.load();
    this._draft = [...(data.meta.deck || [])];
    this._build(data.meta.spells || []);
    this._overlay.classList.add('open');
    this._overlay.setAttribute('aria-hidden', 'false');
    this._focusFirstButton();
    this._bindKeys();
  }

  cancel() {
    Object.values(this._timers).forEach(t => { if (t) clearTimeout(t); });
    Object.keys(this._timers).forEach(k => this._timers[k] = null);
    this._unbindKeys();
    if (this._overlay) {
      this._overlay.classList.remove('open');
      this._overlay.setAttribute('aria-hidden', 'true');
    }
  }

  _build(ownedIds) { /* render dialog DOM with role="dialog" + aria-modal="true" + aria-label="Deck builder" */ }

  _toggle(spellId) {
    if (this._draft.includes(spellId)) {
      if (this._draft.length <= 3) { this._toast('Need at least 3 spells'); return; }
      this._draft = this._draft.filter(id => id !== spellId);
    } else {
      if (this._draft.length >= 4) { this._toast('Max 4 spells. Remove one first.'); return; }
      this._draft.push(spellId);
    }
    this._render();
  }

  _save_() {
    const data = this._save.load();
    data.meta.deck = [...this._draft];
    this._save.save(data);
    this.cancel();
    if (this._focusReturnTo) this._focusReturnTo.focus();
  }
}
```

**ARIA contract:**
- `role="dialog" aria-modal="true" aria-label="Deck builder"`
- First focusable: ✕ close button
- Each spell row: native `<button>` (disabled when locked) with `aria-pressed="true"` if currently equipped, `"false"` otherwise
- Tab/Shift-Tab cycles within the dialog; Escape closes (with `classList.contains('open')` guard)
- Focus returns to `#hub-btn-deck` on close

### 4. `hub/classPicker.js`

Same modal pattern as deck builder. Lists `data/classes.json` with locked/unlocked state. Picking a class:
- Sets `save.meta.classId = id`
- Replaces `save.meta.deck` with the new class's `startingDeck`
- Saves immediately

Locked classes show their unlock condition: e.g., `"Beat Realm 2 boss"`. Use `<button disabled>` per CLAUDE.md.

### 5. `hub/codex.js` — The Mastery Heatmap

The teaching centerpiece. A 13×13 grid showing every multiplication fact, color-coded by mastery state:

- New (no attempts): cream `#F5F0E8` background, dashed gray border
- Learning (box 1–2): pale red `#FCE8E8`
- Practicing (box 3): pale yellow `#FCF4D8`
- Mastered (box ≥ 4 and `totalCorrect ≥ 6`): pale green `#D8F0D8` with a star `★`
- Each cell is a native `<button>` (≥ 44px) with `aria-label="3 times 7 equals 21. Mastered."` etc.

Tapping a cell launches a **drill mini-fight** — a 3-problem fight focused only on that fact family + adjacent (e.g., tap 3×7 → 3 problems pulled from `x3` family, weighted heavy on `3×7`). On mini-fight complete: returns to codex; mastery is updated; the cell visually updates.

```js
class Codex {
  constructor({ save, problemGen, fight, distractors, mastery, audio, hud, focusReturnTo }) {
    this._save = save;
    this._problemGen = problemGen;
    this._fight = fight;          // FightManager (reused)
    this._mastery = mastery;
    this._audio = audio;
    this._hud = hud;
    this._overlay = null;
    this._focusReturnTo = focusReturnTo;
  }

  open() {
    this.cancel();
    this._build();
    this._overlay.classList.add('open');
    this._overlay.setAttribute('aria-hidden', 'false');
    this._focusFirstButton();
    this._bindKeys();
  }

  _build() {
    const data = this._save.load();
    // Render 13×13 grid (a in 0..12, b in 0..12). Each cell is <button> with aria-label.
    // Color by box state.
  }

  _onCellTap(a, b) {
    const factKey = `${Math.min(a,b)}x${Math.max(a,b)}`;
    // Build a 3-problem mini-fight focused on this fact
    // Use the existing FightManager but with a custom problem source:
    //   _customProblems: 3 problems sampled where one is exactly `a × b` and 2 are family neighbors
    this._launchMiniFight(factKey, a, b);
  }

  _launchMiniFight(factKey, a, b) {
    // Hide codex (stays in DOM, classList.remove('open'))
    // FightManager.start(monster_drill, customProblems)
    // On complete: re-open codex, refresh
  }
}
```

**Heatmap as teaching surface:** This is the most important UI element for the parent's mental model — it shows what the player has mastered and what's still red. It's also a fast way for the kid to grind a specific weak fact without starting a full run.

### 6. `hub/story.js`

Lists unlocked story panels (`save.meta.storyUnlocked`). Each panel has:
- A title
- A 4–6 panel comic strip (placeholder images for now — real art added in Session 12)
- A 🔊 read-aloud button per panel that narrates the panel text
- A "back" button

Each panel is a `<button>` (when unlocked) or a placeholder card (when not yet unlocked, dimmed with "Beat the Goblin Warlord to unlock" hint). Native `<button disabled>` for locked.

### 7. `hub/realmPicker.js`

A list/grid of 5 realms (Forest of Threes, Goblin Mines, Dragon's Spire, Sky Citadel, Void Crucible). Each card shows:

- Realm name + thumbnail (palette-tinted blob)
- Unlock state (locked = `<button disabled>` with hint `"Beat the previous realm"`)
- Star rating (0–3) from `save.meta.stars[realmId]`
- Best score
- Best run time (optional)

Picking a realm: confirms via a small inline modal ("Start a run in Forest of Threes?"), then calls `runtime.startRun(realmId)`.

### 8. `game.js` HUB wiring

```js
async _enterHub() {
  this.state = 'HUB';
  // Cancel any active fight/managers
  if (this._fight) this._fight.cancel();
  if (this._bossFight) this._bossFight.cancel();
  // Hide all other screens
  document.getElementById('run-screen')?.classList.remove('active');
  document.getElementById('fight-screen')?.classList.remove('active');
  this._hub.show();
}

_onResumeRun() {
  const data = this._save.load();
  if (!data.activeRun) return;
  this.state = 'RUN';
  this._hub.hide();
  this._runtime.resume(data.activeRun);  // throws into RUN_MAP
}

_onAbandonRun() {
  // Confirm via inline dialog, then:
  this._runtime.abandonRun();
  this._hub._refresh();
}
```

## Tests to run

Manual:

- [ ] HUB renders gold, class, deck count, codex count, story count correctly
- [ ] Tile keyboard nav: Tab moves between tiles in DOM order; Enter/Space activates
- [ ] Deck builder: open → see 10 spells → toggle 1 → save → reopen → state persists
- [ ] Deck builder: cannot drop below 3 (toast appears); cannot exceed 4 (toast appears)
- [ ] Deck builder: locked spells render `<button disabled>`, are not focusable in tab order
- [ ] Class picker: only Apprentice unlocked; Pyromancer is locked + disabled
- [ ] Class picker: switching class replaces deck (and toast confirms)
- [ ] Codex: opens 13×13 grid; mastered cells show star; tap a cell → drill mini-fight launches
- [ ] Codex: drill mini-fight uses the existing FightManager + custom problem source
- [ ] Codex: on drill complete, codex re-opens with updated cell color
- [ ] Story: shows N unlocked panels; locked panels are dimmed; 🔊 read-aloud reads panel text
- [ ] Realm picker: shows 5 realms; only Realm 1 unlocked; tapping starts a run
- [ ] Resume banner: only visible when `save.activeRun` is non-null
- [ ] Resume → returns to map; Abandon → confirm dialog → save.activeRun cleared
- [ ] Focus returns correctly on every overlay close

Edge cases:

- [ ] Open codex with 0 mastered → all cells red/cream, no crashes
- [ ] Open story with 0 unlocked → empty state shows "Beat your first boss to start the story"
- [ ] Switch class while a run is active → blocked or auto-abandon (decide and document; default = blocked with toast "Finish or abandon your run first")

## Acceptance checklist

- [ ] All 6 hub overlay managers follow timer-lifecycle pattern (constructor null, cancel() clears all)
- [ ] All overlays use `role="dialog" aria-modal="true" aria-label="..."`
- [ ] All overlays focus a close button first; trap focus; Escape closes (with classList guard)
- [ ] All overlays return focus to the triggering hub tile on close
- [ ] All locked items use native `<button disabled>` (or `tabindex="-1" aria-disabled="true"` for divs)
- [ ] Codex heatmap cells have dynamic `aria-label` reflecting current state ("3 times 7. Mastered.")
- [ ] No `style.display` in JS; visibility via classes
- [ ] HUB layout works at 768×1024 (iPad portrait) and 1024×768 (iPad landscape)
- [ ] All Layer-1 tests still pass

## Session end

1. Run all Layer-1 tests
2. Manual playtest: HUB → start run → finish run → return to HUB → check star rating + gold updated
3. Manual playtest: Codex drill → mini-fight → mastery updated → cell color changes
4. Run `marauder-web-review` agent
5. Commit `Session 10: hub — wizard's tower, deck builder, codex heatmap, story viewer`
6. Push to `main`
