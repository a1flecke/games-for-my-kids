# Math Marauder Design Spec

**Goal:** Build a standalone GitHub Pages game that helps a strong 10-year-old practice multiplication and division facts from 0 through 12, using products from 0 through 144 and clean whole-number division.

**Primary player:** A kid who is good at math, gets bored quickly, likes fantasy, monsters, wizards, dragons, space battles, magic, and graphic novels, and benefits from ADHD and dyslexia accommodations.

**Implementation target:** `math-marauder/`, using plain HTML, CSS, and JavaScript with no framework, no bundler, and no npm dependency.

## Decisions And Assumptions

- The first implementation is a complete playable browser game, not a content prototype.
- Narration audio uses the Web Speech API plus captions, not recorded voice files. This keeps the game self-contained for GitHub Pages and gives every dialogue line an audio track without asset hosting.
- Sound effects and short musical stingers use lazy Web Audio synthesis, matching the existing repo pattern and iOS Safari rules.
- The core loop uses DOM answer buttons for accessibility and touch reliability, with canvas used for animated combat, monsters, spells, and scene effects.
- Division never divides by zero. Division prompts are generated from multiplication facts: `product / divisor = quotient`, where divisor is 1-12, quotient is 0-12, and product is 0-144.
- No visible countdown timer appears by default. Challenge comes from encounter mechanics, adaptive difficulty, limited hearts, monster traits, and optional challenge modes.
- Sessions are room-count based so they naturally fit 5-15 minutes without putting time pressure on the screen.

## Player Promise

Math Marauder should feel like a compact graphic-novel raid. The player sails a spell-powered starship through monster domains, defeats creatures by choosing the correct answer, collects artifacts, and finishes a small adventure before attention fades.

Each session should offer new combinations:

- A new biome or encounter scene.
- A different monster trait.
- A different spell reward.
- Mixed multiplication and division facts.
- Occasional boss patterns that ask for the same facts in a new way.

The game must avoid long reading stretches. Every story, tutorial, and monster line appears as short caption text with a replay-audio button. The player should be able to understand the current objective from layout, icons, and spoken narration.

## Success Criteria

- A new player can start a raid in under 20 seconds.
- A quick raid lasts about 5 minutes: 3 rooms, 18-24 math prompts, one mini-boss.
- A standard raid lasts about 10-15 minutes: 5 rooms, 35-55 math prompts, one boss.
- Multiplication prompts cover factors 0-12.
- Division prompts are always clean whole-number divisions derived from the 0-12 multiplication table.
- The answer range for products is 0-144.
- The player sees four answer choices per prompt, with no duplicate choices and exactly one correct choice.
- The game adapts toward facts the player misses without trapping them in repetitive drills.
- Every dialogue and instruction line has a matching `voiceText` string for narration.
- Core arithmetic generation, distractor generation, adaptive progression, content integrity, save defaults, and static accessibility rules are covered by repeatable tests.
- The game remains playable with sound muted, speech unavailable, reduced motion enabled, and browser zoom increased.

## Educational Model

### Fact Space

The game teaches and reinforces:

- Multiplication: `a x b = product`, where `a` and `b` are each 0-12.
- Division: `product / divisor = quotient`, where `product = divisor x quotient`, `divisor` is 1-12, and `quotient` is 0-12.
- Mixed inverse recognition after the player has enough exposure: `a x ? = product` and `product / ? = quotient`.

### Difficulty Bands

The game should not begin at a baby level, because the player is already good at math. It starts with mixed known facts and ramps quickly.

1. **Warm Raid:** Mixed multiplication from 2-10 plus easy division. Used for the first room only.
2. **Deep Raid:** Mixed multiplication and division from 0-12. Includes 11s, 12s, zero, and one facts at sensible frequency.
3. **Inverse Raid:** Includes missing-factor prompts and operation swaps.
4. **Boss Raid:** Uses monster mechanics that require accuracy across several related facts, such as a dragon shield that breaks only after three correct inverse pairs.

Zero and one facts should appear, but not dominate. Once mastered, they become quick confidence beats inside harder encounters.

### Adaptive Selection

The problem engine keeps a mastery score per fact key:

- Multiplication key: `mul:a:b`, normalized so `3 x 8` and `8 x 3` share a mastery record.
- Division key: `div:product:divisor`.
- Missing-factor key: `missing:a:product`.

Every answer updates:

- Correct on first try: mastery rises.
- Correct after one mistake: mastery rises slightly.
- Wrong: mastery drops and the fact receives a short-term revisit flag.
- Repeated wrong facts reappear through a different monster or visual wrapper, not as the same prompt back-to-back.

The generator uses weighted random selection:

- 45 percent current raid band.
- 30 percent weak facts.
- 15 percent facts adjacent to weak facts, such as the same factor family.
- 10 percent mastered facts for momentum and confidence.

No exact prompt should repeat within the last 6 prompts unless the player is in a focused practice mode.

## Game Structure

### Modes

**Quick Raid**

- 3 rooms.
- 6-8 prompts per room.
- One mini-boss at the end.
- Designed for 5 minutes.

**Standard Raid**

- 5 rooms.
- 7-10 prompts per room.
- One boss at the end.
- Designed for 10-15 minutes.

**Practice Forge**

- Targeted 2-5 minute practice for a chosen family, such as 7s, 12s, or division by 8.
- Unlocks after the first standard raid.
- Does not look like a worksheet; it uses a forge scene where correct answers power magical equipment.

### Raid Flow

1. Player chooses a mode on the map.
2. A short narrated panel introduces the domain.
3. Each room spawns one monster encounter.
4. The current math prompt appears above four answer runes.
5. Correct answers fire a spell and damage the monster.
6. Wrong answers trigger a brief monster action and a hint.
7. Defeating the monster gives coins, artifact energy, and mastery updates.
8. At the end, the victory screen shows stars, strongest fact family, and one fact to train next.

### Combat Rules

- The player starts each raid with 3 hearts.
- Correct answer: player attacks; streak meter rises.
- Wrong answer: monster attacks; player loses a shield pip or heart depending on monster strength.
- Two wrong attempts on the same prompt reveal a structured hint, then the player can still answer.
- The game never blocks progress with shame text. Feedback uses neutral phrasing like "Try the matching factor" or "Split 48 into 6 equal groups."
- If hearts reach zero, the player retreats with earned coins, keeps mastery progress, hears a short neutral line, and can retry the room with one restored heart. The game never shows a failure screen that discards the session.
- A streak unlocks a spell. Spells are assistive rewards, not required reading:
  - **Starbolt:** Big damage after 3 correct answers.
  - **Mirror Spark:** Removes one wrong answer.
  - **Dragon Guard:** Blocks the next monster hit.
  - **Time Gem:** Slows answer-card movement without showing a timer.

## Monster And Biome Design

### Biomes

1. **Ember Library:** Floating books, fire imps, wizard apprentices.
2. **Moonlit Catacombs:** Skeleton knights, rune doors, glowing crystals.
3. **Dragon Asteroid Belt:** Space dragons, comet eggs, star cannons.
4. **Slime Foundry:** Split slimes, gear golems, potion vats.
5. **Void Reef:** Star krakens, shadow rays, gravity bubbles.
6. **Final Fortress:** Mixed boss gauntlet with rotating mechanics.

### Monster Mechanics

| Monster | Math Focus | Gameplay Twist |
| --- | --- | --- |
| Ember Imp | Mixed multiplication | Basic encounter with fast animations and low health. |
| Split Slime | Clean division | Correct division splits slime, then finishes it with the quotient. |
| Rune Knight | Inverse facts | Shield breaks when the player answers a multiplication/division pair. |
| Mirror Mage | Commutative multiplication | Shows `8 x 7` after `7 x 8` style facts, reinforcing equivalence. |
| Crystal Golem | 11s and 12s | High health, slow attacks, bigger reward. |
| Star Wyvern | Mixed operations | Answer cards orbit slowly; reduced-motion mode disables orbit. |
| Void Wraith | Weak facts | Pulls from the adaptive weak-fact pool. |
| Factor Dragon | Boss | Multi-phase fight: multiplication, division, missing factor, mixed finale. |

Monster art should be procedural canvas art rather than external images. Each monster gets a silhouette, idle animation, hit animation, defeat animation, and color variant. This keeps the page self-contained and creates enough novelty without asset management overhead.

## Reading And Audio

### Dialogue Rules

- Dialogue is limited to one or two short sentences per panel.
- Every dialogue object contains:
  - `id`
  - `speaker`
  - `caption`
  - `voiceText`
  - `mood`
- Captions use OpenDyslexic with Comic Sans fallback, at least 16pt, with 1.5-2x line height.
- The first focusable control in dialogue overlays is the close button.
- Every dialogue panel has a replay narration button.
- Speech can be disabled in settings.

### Speech Synthesis

The speech manager must:

- Feature-detect `speechSynthesis`.
- Avoid calling `speak()` immediately after `cancel()` on iOS Safari. Use a 50 ms delay.
- Keep captions visible whether speech is available or not.
- Use short utterances so the player can interrupt or replay without waiting.
- Never require speech to understand math prompts.

## UI And Accessibility

### Visual Style

The game should feel like a colorful fantasy-space combat panel, not a worksheet and not a marketing page.

- Cream background and dark readable text for menus.
- High-contrast answer buttons.
- Canvas playfield with richer colors, but no flashing or strobing.
- Answer runes use large numerals and math symbols.
- Prompt symbols use `x` and `/` visibly, with speech reading them as "times" and "divided by."
- Cards and panels use at most 8 px radius unless a circular icon button is clearer.

### Controls

- Touch-first: answer buttons are at least 44 by 44 px.
- Keyboard support:
  - Number keys `1` through `4` choose answer buttons.
  - Arrow keys move answer focus.
  - Enter or Space activates focused answer.
  - Escape closes open overlays.
- Pointer and keyboard paths must produce the same game state updates.

### Accessibility Requirements

- Use OpenDyslexic via one HTML `<link>` only.
- Do not use `user-scalable=no`.
- Do not use `style.display` for visibility toggles.
- Use `.active`, `.open`, and `.hidden` classes for visibility state.
- Use native buttons for all answer choices and controls.
- Disabled locked controls use the `disabled` attribute.
- Settings and dialogue overlays use `role="dialog"`, `aria-modal="true"`, `aria-hidden="true"` or `"false"`, focus trap, Escape close guard, and focus return.
- `aria-live` regions do not also use `aria-hidden` or `aria-label`.
- Any labelled element whose visible text changes also updates its `aria-label`.
- Canvas has an `aria-label`, but gameplay decisions remain available through DOM controls and status text.
- Reduced motion setting disables answer orbiting, screen shake, and large particle bursts.
- No visible countdown timers by default.

## Save Data

Use LocalStorage key `math-marauder-save`.

Default save object:

```js
{
  version: 1,
  raidsCompleted: 0,
  standardRaidsCompleted: 0,
  bestStarsByMode: {},
  factMastery: {},
  weakFactQueue: [],
  unlockedBiomes: ['ember-library'],
  unlockedSpells: ['starbolt'],
  settings: {
    sfx: true,
    music: false,
    speech: true,
    reducedMotion: false,
    fontScale: 'normal'
  },
  stats: {
    promptsAnswered: 0,
    correctFirstTry: 0,
    longestStreak: 0
  }
}
```

Every key read by the game must exist in the defaults. Versioned migration starts at version 1 even if no migration is needed yet.

## Architecture

### Proposed Files

- `math-marauder/index.html`: Screens, overlays, script includes, semantic controls.
- `math-marauder/css/style.css`: Responsive layout, accessibility tokens, animation classes.
- `math-marauder/js/constants.js`: Numeric constants, state names, storage key.
- `math-marauder/js/content.js`: Biomes, monsters, spells, dialogue, and reward tables.
- `math-marauder/js/problem-engine.js`: Pure arithmetic generation, distractors, prompt history, fact keys.
- `math-marauder/js/progression.js`: Mastery updates, adaptive weights, unlocks, raid scoring.
- `math-marauder/js/game-rules.js`: Raid mode room contracts, encounter state, combat resolution, and retreat recovery.
- `math-marauder/js/save.js`: Defaults, load, save, reset, migration.
- `math-marauder/js/audio.js`: Lazy Web Audio sound effects and optional music.
- `math-marauder/js/speech.js`: Speech synthesis narration queue.
- `math-marauder/js/renderer.js`: Canvas setup, DPR scaling, procedural monsters, particles.
- `math-marauder/js/ui.js`: DOM binding, focus traps, settings overlays, announcements.
- `math-marauder/js/game.js`: Main state machine, single RAF loop, combat flow.
- `math-marauder/scripts/run-tests.js`: Node test runner.
- `math-marauder/tests/*.test.js`: Unit, content, save, and static accessibility tests.
- `math-marauder/tests/browser-ui.html`: Browser-side UI interaction test runner for focus traps, duplicate-click guards, keyboard choices, and reduced motion.

### State Machine

- `TITLE`
- `MAP`
- `DIALOGUE`
- `RAID`
- `ROOM_REWARD`
- `PAUSED`
- `RESULTS`
- `SETTINGS`

`game.js` owns the only `requestAnimationFrame` chain. Managers do not start independent RAF loops.

### Data Flow

1. `game.js` requests an encounter from `progression.js`.
2. `progression.js` asks `problem-engine.js` for the next prompt.
3. `ui.js` renders the prompt and answer buttons.
4. Player input returns an answer to `game.js`.
5. `game.js` resolves combat and calls `progression.updateFactResult()`.
6. `renderer.js` draws the visual outcome.
7. `audio.js` and `speech.js` respond to explicit game events.
8. `save.js` persists summary progress at room end and raid end.

## Testing Strategy

### Automated Tests

Use Node's built-in `assert` module. Do not add npm packages.

Required test groups:

- `problem-engine.test.js`
  - Multiplication products stay within 0-144.
  - Multiplication factors stay within 0-12.
  - Division prompts never divide by zero.
  - Division prompts always produce whole-number quotients.
  - Missing-factor prompts avoid ambiguous zero-factor forms and keep answers in 0-12.
  - Four answer choices contain exactly one correct answer.
  - Distractors are unique, non-negative, and plausible.
  - Prompt history prevents immediate repetition.
  - Adaptive weighting produces current-band, weak, adjacent, and mastered-review facts during normal raids.
- `progression.test.js`
  - Correct answers increase mastery.
  - Wrong answers decrease mastery and add weak-fact weight.
  - Mastered zero and one facts appear less often without disappearing entirely.
  - Raid scoring maps accuracy and hearts to stars.
- `game-rules.test.js`
  - Quick and standard raids use the expected room counts and prompt targets.
  - Boss rooms expose phase counts.
  - Correct and wrong answers update combat state visibly.
  - Zero-heart recovery retreats without losing earned progress.
- `save.test.js`
  - Defaults include every key read by the game.
  - Corrupt localStorage falls back to defaults.
  - Version 1 saves round-trip.
- `content.test.js`
  - At least 6 biomes.
  - At least 8 monster types.
  - At least 4 spells.
  - Every dialogue line has `caption` and `voiceText`.
  - Captions stay short enough for dyslexia-friendly panels.
- `accessibility-static.test.js`
  - Viewport does not include `user-scalable=no`.
  - OpenDyslexic link appears exactly once.
  - Overlays use `div role="dialog"` and explicit `aria-hidden`.
  - Native answer controls are buttons.
  - Source does not use `style.display`.
  - No element combines `aria-live` with `aria-hidden` or `aria-label`.

### Browser Verification

Manual browser checks after implementation:

- Open `math-marauder/index.html` directly from disk.
- Open through a local static server.
- Start a quick raid.
- Answer correctly, answer incorrectly, use keyboard choices, use touch or pointer choices.
- Open `math-marauder/tests/browser-ui.html` and confirm all browser UI behavior tests pass.
- Toggle speech, replay narration, mute sound, enable reduced motion, increase font size.
- Confirm a standard raid can finish.
- Confirm LocalStorage progress persists after reload.
- Confirm the main `index.html` includes Math Marauder after running the index script.

### iPad Safari Checks

Because the target includes iPad Safari:

- AudioContext is created only after a user gesture.
- `ctx.resume()` is awaited before scheduling sound nodes.
- Speech replay still works after interrupted narration.
- Browser zoom remains available.
- Answer controls remain visible and at least 44 by 44 px in landscape and portrait.
- No screen requires hover.

## Acceptance Checklist

- `math-marauder/` is added as a new self-contained game.
- `.github/scripts/update-index.js` includes Math Marauder in the math category with manual card metadata.
- The generated root `index.html` includes the new game card.
- `node math-marauder/scripts/run-tests.js` passes.
- `node .github/scripts/update-index.js` runs cleanly.
- `git diff --check` has no whitespace errors.
- A human can complete one quick raid in the browser.
- All required accessibility settings are present.
- All dialogue has caption and speech text.
- No visible countdown timer is shown by default.
