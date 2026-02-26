---
paths:
  - "keyboard-command-4/**"
---

# KC4 Architecture Rules

These rules prevent the bug classes that recur most often in KC4 sessions. Violating any of them is a HIGH-severity bug.

## Single RAF Chain — game.js Owns the Loop

**IMPORTANT:** Only `game.js` may call `requestAnimationFrame`. No manager, renderer, or transition system may start its own RAF chain. Two independent RAF chains writing to the same canvas cause flickering and frame tearing on iPad.

Managers that need per-frame updates must expose **passive methods** called by the game loop:
```js
// CORRECT — game loop drives the manager
class SomeManager {
    update(dt) { /* advance state */ }
    draw(ctx, w, h) { /* render to canvas */ }
}
// game loop:  manager.update(dt); manager.draw(ctx, w, h);

// WRONG — manager owns its own animation loop
class SomeManager {
    start() { this._raf = requestAnimationFrame(() => this._tick()); }
}
```

This applies to: LevelManager transitions, particle systems, any future animation system.

## Timer Callbacks Must Tolerate PAUSED State

`setTimeout`/`setInterval` callbacks that check game state must treat PAUSED as equivalent to GAMEPLAY. The user can pause at any moment — including during a room-clear delay.

```js
// WRONG — stalls forever if user pauses during the 1500ms delay
this._roomTimer = setTimeout(() => {
    if (this.state !== 'GAMEPLAY') return;  // PAUSED → returns → never fires again
    this._advanceRoom();
}, 1500);

// CORRECT — pausing doesn't stall progression
this._roomTimer = setTimeout(() => {
    if (this.state !== 'GAMEPLAY' && this.state !== 'PAUSED') return;
    this._advanceRoom();
}, 1500);
```

## Batch SaveManager Calls

When updating multiple save fields at once, do a single `load() → modify → save()` instead of calling multiple static methods (each does its own JSON parse/stringify cycle):

```js
// WRONG — 4x redundant JSON parse/stringify
SaveManager.saveLevelResult(levelId, stats);
SaveManager.saveShortcutStats(shortcutId, true);
SaveManager.unlockWeapon(weaponId);
SaveManager.updateSettings('hints', 'always');

// CORRECT — single load/modify/save
const data = SaveManager.load();
data.levels[String(levelId)] = { /* ... */ };
data.shortcuts.stats[shortcutId].correct++;
if (!data.weaponsUnlocked.includes(weaponId)) data.weaponsUnlocked.push(weaponId);
SaveManager.save(data);
```

Use the static helper methods (`saveLevelResult`, etc.) when touching a single field. Inline the pattern when touching 2+ fields.

## LevelManager Transition Contract

LevelManager transitions use a **phase state machine** driven by the game loop — no independent timers or RAF.

- `updateTransition(now)` — advances the phase clock. Called every frame during TRANSITION state.
- `drawTransition(ctx, w, h, now)` — renders the current phase. Returns `true` if it drew a full scene (corridor, title-card) or `false` if it drew an overlay (fade) that composites on top of the room.
- **Always call both together.** Calling `drawTransition` without `updateTransition` → phases never advance. Calling `updateTransition` without `drawTransition` → black screen.
- **Midpoint callback** fires after the corridor phase completes, before fade-in. This is when room state changes and item pickups apply.
- **No `setTimeout` inside LevelManager.** All timing uses `performance.now()` deltas against `_phaseStartTime`.

Game loop integration pattern:
```js
if (this.state === 'TRANSITION') {
    this._levelManager.updateTransition(now);
    // During fade phases, render the room underneath
    if (phase === 'fade-out' || phase === 'fade-in') {
        this._renderRoom();
    }
    this._levelManager.drawTransition(ctx, w, h, now);
}
```

## Timing Constants Must Be Synchronized

These durations are coupled across files. Changing one without the other is a bug:

| Constant | Value | Files |
|----------|-------|-------|
| Input lock after fire | 700ms | `input.js` lock timer, `weapons.js` fire sequence |
| Monster death animation | 500ms | `monsters.js` deathDuration, `renderer.js` fade-out |
| Corridor transition | 500ms | `levels.js` phase duration |
| Boss corridor | 800ms | `levels.js` boss phase duration |
| Boss title card | 2000ms | `levels.js` title-card phase duration |

## Monster Invariants

- **Mage speed is always 0.** Mages stay idle and fire projectiles. Setting speed > 0 makes them charge the player, breaking ranged combat design.
- **Force-target at depth >= 0.85.** When a charging monster reaches 85% depth, game.js force-targets it. Don't remove this — it's the "danger zone" mechanic that prevents unfair damage.
- **Projectile `impactFired` flag.** Check before calling `onImpact()` to prevent double-damage from rapid fire animations.

## Session Spec Requirements

When writing session plans for KC4:

1. **Default settings must be justified.** Every user-facing default (hints, volume, speed) must include a rationale. "Start with hints always visible so new players can learn" — not just `hints: 'after3'` without explanation.
2. **Spec code samples are often wrong.** Before implementing any code from a spec, scan it against the kc4-checklist patterns table. Common violations: `style.display`, `.onclick`, independent RAF chains, `new AudioContext()` in constructor.
3. **State machine transitions must be explicit.** If adding a new state (e.g., TRANSITION), document: which states can enter it, which states it can exit to, what the game loop does during it, and what input is accepted/blocked.
4. **Canvas rendering ownership must be stated.** If the plan says "render X to canvas", it must specify whether game.js calls the render method (correct) or the new class owns its own RAF (wrong).
