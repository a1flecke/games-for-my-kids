# Session 11 — Gallery Options + Progression System (Revised)
**Model:** Sonnet | **Focus:** Gallery UX, milestone unlocks, settings reset

## Review Findings (from original spec)

1. Original spec had "~15 milestones with ~40 unlockable items" — data already exists in unlocks.json (8 milestones). No data structure work needed beyond data fixes.
2. "Achievement/sticker book screen" — scope too large, cut. Milestones show via unlock notification overlay already in HTML.
3. "Creature of the day" prompt on title — low value vs complexity, cut.
4. unlocks.json had bogus rewards: `acc-scarf` and `acc-backpack` are starter items (always visible) — changed to locked items (`acc-feather-boa` and `acc-lei`).
5. Gallery tap went directly to CARE with no options — needs options overlay for play/dress-up/goodbye.
6. `btn-delete-yes` was stubbed with comment "Delete handled by gallery in future session" — wired up here.
7. Sort functionality had no HTML or JS — added two sort buttons (newest/name).
8. `progressManager.checkMilestones()` was never called — wired after creature birth and care activity completion.
9. Settings had no reset progress — added with confirmation.
10. "Redesign" option in gallery options requires creator edit mode (not yet implemented) — deferred.
11. Unlock notification queue needed for multiple milestones triggering at once.

## Deliverables

### A. Gallery: Options Overlay + Sort + Delete

**New overlay: `overlay-creature-options`**
- Opens when tapping a gallery card (instead of direct navigation to CARE)
- Buttons: "Play! 🎮" (→ CARE), "Dress Up 👗" (→ WARDROBE), "Say Goodbye 👋" (→ delete confirm)
- Close button (✕) + Escape to dismiss
- Focus trap and focus return to trigger card

**Sort:**
- Row of two toggle buttons above gallery grid: "🕐 Newest" and "🔤 Name"
- `this._gallerySort = 'newest'` | `'name'` in game.js (memory only, resets on reload)
- Newest: sort descending by `createdAt`; Name: sort ascending by `creature.name`

**Delete:**
- `this._pendingDeleteId` tracks creature to delete
- `overlay-delete` shows "[name] is going on a big adventure!"
- `btn-delete-yes`: calls `saveManager.removeCreature()`, clears `_activeCreatureId` if deleted, repopulates gallery

### B. Progress: Milestone Unlock Notifications

**Wire checkMilestones() calls:**
- After creature birth: in `_bindNamingEvents()` btn-birth handler, after `saveManager.addCreature()`
- After care activity: in care.js `_completeActivity()`, after `_checkGrowth()`, call `window.game._checkAndNotifyMilestones()`

**Unlock notification queue in game.js:**
- `this._pendingUnlockQueue = []` in constructor
- `_checkAndNotifyMilestones()`: calls `progressManager.checkMilestones()`, appends to queue, calls `_showNextUnlock()`
- `_showNextUnlock()`: if overlay already open, return (btn-unlock-ok will call it when dismissed); dequeue next, populate overlay with milestone.name + reward names, show overlay
- `btn-unlock-ok` handler: hide overlay, call `_showNextUnlock()` for next in queue

**overlay-unlock content:**
- `#unlock-message`: milestone.name + " — " + milestone.description
- `#unlock-preview`: reward names formatted as human-readable list

**Growth stage notifications** already use overlay-unlock via `_checkGrowth()` in care.js.
Queue growth stage notifications too by routing through `_showNextUnlock()`.

### C. Settings: Reset Progress

**New "Reset Progress" button in overlay-settings** (danger/red styling)
- Separate `this._resetConfirmPending = false` flag to distinguish from creator leave confirmation
- Shows overlay-confirm with custom message "Delete ALL creatures and reset everything?"
- On confirm: `localStorage.removeItem('lizzies-petstore-save')`, `location.reload()`

### D. Data Fix: unlocks.json

Replace starter item rewards (which are always visible, making them useless as rewards):
- `milestone-2-creatures` reward `acc-scarf` → `acc-feather-boa` (locked, needs milestone-kid-stage)
- `milestone-park-visit` reward `acc-backpack` → `acc-lei` (locked, needs milestone-park-visit)

### E. File Changes

| File | Changes |
|------|---------|
| `index.html` | creature-options overlay, gallery sort bar, reset-progress button in settings |
| `css/style.css` | creature-options overlay styles, sort bar, danger button, gallery sort active state |
| `js/game.js` | Gallery: options overlay, sort, delete; Progress: `_checkAndNotifyMilestones()`, `_showNextUnlock()`; Settings: reset progress |
| `js/care.js` | Call `window.game._checkAndNotifyMilestones()` after care activity and growth notification |
| `data/unlocks.json` | Fix starter item rewards |

### F. What's NOT in this session
- Achievement/sticker book screen (deferred to session 14 polish)
- "Creature of the day" prompt (deferred to session 14)
- "Redesign" option in gallery (requires creator edit mode, not yet implemented)
- PIN-protected reset (unnecessary for a kids game)
- Sort persistence across sessions (memory-only sort is fine)

## Session end
- Run `/validate-petstore-data`, run `/petstore-checklist`, commit + push
