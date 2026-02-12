# Session 14: Polish, Accessibility & Deployment

**Recommended Model: Sonnet** - Bug fixes, accessibility tweaks, and service worker setup are well-defined tasks. Touch control implementation follows standard patterns. Cross-browser testing is systematic verification work.

## Goal
Final polish pass. Full accessibility audit. Service worker for offline play. Performance optimization. Cross-browser verification. The game is production-ready.

## Tasks

1. **Accessibility audit and fixes**:
   - Verify WCAG AA contrast ratios on all text (4.5:1 minimum)
   - Test all 3 text sizes (small/medium/large) throughout entire game
   - Verify 44x44px minimum touch targets on all interactive elements
   - No flashing/strobing effects anywhere
   - Keyboard-only playthrough test (no mouse/touch required)
   - TTS works on all dialogue
   - Colorblind mode implementation (blue/orange palette swap)
2. **Performance optimization**:
   - Profile on iPad Safari - ensure stable 60fps
   - Optimize canvas rendering (only redraw changed tiles if needed)
   - Minimize garbage collection (object pooling for particles/damage numbers)
   - Verify <3 second level load times
   - Verify <100ms save times
3. **Touch controls** (iPad):
   - On-screen D-pad for movement (appears on touch devices)
   - Touch-friendly action buttons in combat
   - Tap-to-interact for NPCs and objects
   - Pinch-to-zoom disabled (prevent accidental zooming)
4. **Service worker** (`service-worker.js`):
   - Cache all game assets on first load
   - Serve from cache when offline
   - Update strategy: check for updates on load, apply on next visit
5. **Bug fix pass**:
   - Playtest all 5 levels start to finish
   - Fix any edge cases (inventory full, all enemies defeated, revisiting completed areas)
   - Verify save/load works across all levels
   - Test level transitions
6. **Final UI polish**:
   - Consistent color palette across all screens
   - Smooth transitions between all states
   - Loading progress bar (if assets take time)
   - Error messages are user-friendly
7. **Cross-browser testing checklist**:
   - iPad Safari (iOS 15+) - PRIMARY
   - Chrome desktop
   - Safari macOS
   - Edge
   - Firefox

## Files Modified
- Multiple files (accessibility fixes, performance tweaks)
- `js/input.js` (touch controls)
- `js/renderer.js` (colorblind palette, performance)
- `js/screens.js` (loading progress)
- `index.html` (service worker registration)

## Files Created
- `service-worker.js`

## Validation
- Full playthrough on iPad Safari: smooth, no bugs, accessible
- Full playthrough keyboard-only: all features accessible
- Text sizes all work correctly
- TTS reads all dialogue
- Offline play works after first load
- All 5 levels completable
- Save/load works across all levels
- Total playtime: 45-90 minutes as designed
