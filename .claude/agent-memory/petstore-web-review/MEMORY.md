# Petstore Web Review Agent Memory

## Common issues found in sessions
- Background drawing functions use `Math.random()` instead of seeded PRNG -- violates cached texture rule
- `saveManager.getCreature()` called from update loop instead of using cached creature ref
- Double save on auto-return: manager calls `saveResults()` then `setState()` which triggers game.js exit path that also calls `saveResults()`
- Array allocations in draw loop (drawOrder, sort) -- use pre-allocated arrays
- Canvas text font < 16px minimum (accessibility violation)
- `cancel()` method incomplete -- misses resetting all state fields (should be single source of truth)
- `setState()` called from inside `update()` causes re-entrant state transition
- `document.fonts.ready` guard missing before Canvas text rendering
- Canvas event listeners bound once but never unbound (works due to null guards but wastes cycles)
- Temp canvases created in loops (buildCompositeCache) not reused
- DOM queries (getElementById, getContext) in RAF draw loop -- cache on state entry or overlay open
- `splice()` in reverse-iteration draw loops -- use swap-and-pop for O(1) removal
- Overlay animation not cleaned up when closed via UIManager Escape handler (bypasses game cleanup)
- `style.width/height` assignments override CSS responsive sizing
- `roundRect()` requires Safari 16+ -- check iPad compatibility or polyfill
- Overlay open paths that don't pass trigger element cause broken focus-return

## Session 13 specific findings
- `_drawShowMode` queries DOM every frame (getElementById x2, getContext)
- Show mode sparkle splice in draw loop
- Photo/card species text uses 13px/14px fonts (below 16px min)
- Show mode Escape close via UIManager doesn't call _closeShowMode() -- animation leak
- _exitState doesn't clean up show mode
- _photoBg/_photoFrame not initialized in constructor
- _saveCard uses _optionsCreatureId which survives past options overlay close

## Files to check for each park-related session
- `js/park.js` -- main park logic
- `js/creature-cache.js` -- composite cache methods (buildCompositeCache, drawComposite)
- `js/game.js` -- PARK state enter/exit in setState(), update/draw switch cases
- `js/save.js` -- _defaults() must include parkVisits
- `css/style.css` -- touch-action:none on park-canvas, #screen-park.active display rule

## Key architectural patterns (verified)
- game.js owns single RAF loop; managers expose update(dt)/draw(ctx,w,h)
- Delta time capped at 50ms in game.js line 430
- Pointer events (not touch) used throughout
- CSS classes for visibility: .active (screens), .open (overlays)
- SaveManager._defaults() merges with loaded data to ensure all keys exist
- UIManager focus trap re-queries focusable elements on each Tab press (handles dynamic buttons)
- UIManager.hideOverlay does NOT call game-specific cleanup -- game must hook close paths
