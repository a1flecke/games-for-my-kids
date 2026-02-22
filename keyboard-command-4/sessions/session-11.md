# Session 11 — Accessibility & iPad Optimization (Opus)

## Goal

Ensure full accessibility compliance and solid iPad Safari performance. OpenDyslexic font integration, WCAG AA contrast everywhere, touch targets, ARIA attributes on all interactive elements, and performance optimization for 60fps on iPad.

## Accessibility Checklist

### Font & Text
- [ ] OpenDyslexic loaded via `<link rel="stylesheet">` (CDN), Comic Sans MS fallback
- [ ] No `@import` for fonts in CSS (double HTTP request — CLAUDE.md rule)
- [ ] Minimum 16px font size everywhere; scalable via settings (16/18/22px)
- [ ] Line height ≥ 1.5 on all text blocks
- [ ] `document.documentElement.style.fontSize` for size scaling (CLAUDE.md rule)
- [ ] Font size setting persists via SaveManager

### Color & Contrast
- [ ] Menu screens: cream background (#F5F0E8), dark text (#2C2416)
- [ ] Secondary text: #595143 or darker (never #666/#888/#999 — CLAUDE.md rule)
- [ ] All text passes WCAG AA 4.5:1 contrast
- [ ] Shortcut prompt box: always high-contrast regardless of room theme
- [ ] Color-blind safe: monsters distinguishable by shape/size, not just color
- [ ] Health bar: numeric value always shown (not just color bar)

### Touch Targets
- [ ] All menu buttons ≥ 44×44px
- [ ] Level select cards ≥ 44×44px
- [ ] Settings controls ≥ 44×44px
- [ ] Pause menu items ≥ 44×44px

### No Flashing/Strobing
- [ ] Death animations use fades, not repeated flashes
- [ ] Screen shake is brief (≤150ms) and subtle (≤6px)
- [ ] MEGA Cannon white flash: single 100ms flash, not repeated
- [ ] Combo visual effects: glows and particles, no strobing
- [ ] No animation exceeds 3 flashes per second (WCAG 2.3.1)

### Viewport
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — NO `user-scalable=no`

### ARIA & Keyboard Navigation
- [ ] All overlays: `role="dialog"`, `aria-modal="true"`, `aria-label="..."`
- [ ] `aria-hidden="true"/"false"` on overlays (never removeAttribute — CLAUDE.md rule)
- [ ] Focus traps on all overlays (Tab/Shift+Tab cycle, Escape to close)
- [ ] Escape guard: check `.contains('open')` before acting (CLAUDE.md rule)
- [ ] First focusable in dialog = close button
- [ ] Modal focus-return: on close, return focus to trigger element
- [ ] Level select cards: `role="button"`, `tabindex="0"`, `aria-label="Level N: Zone Name, N stars"`
- [ ] Locked levels: `aria-disabled="true"`, `tabindex="-1"`
- [ ] Settings toggles: proper `aria-pressed` or native checkbox `checked`
- [ ] Dynamic aria-label: update when textContent changes (CLAUDE.md rule)
- [ ] Screen reader announcements for: room clear, boss phase, level complete, damage taken

### ADHD Accommodations
- [ ] No visible countdown timers (monsters approach visually, no number ticking down)
- [ ] Generous timing: charging monsters take 8–12s to reach attack range
- [ ] Pause anytime (Escape), no penalty
- [ ] Short rooms (~2–3 min each, full level 10–15 min)
- [ ] Always-visible room progress
- [ ] Auto-save every room
- [ ] Hint system prevents hard-stuck frustration
- [ ] Monster speed setting: Normal / Slow (50% speed accessibility mode)

## iPad Safari Optimization

### Performance
- [ ] 60fps with 8 monsters + 50 particles (test with throttled CPU)
- [ ] All monster sprites pre-rendered to offscreen canvases
- [ ] Room backgrounds cached
- [ ] Particle pool: no allocations during gameplay
- [ ] HUD text cached; only re-render changed values
- [ ] Canvas `drawImage()` from cache, never re-draw primitives each frame
- [ ] RAF throttle: if delta > 20ms, reduce particle count

### Web Audio (iOS Safari Rules — from CLAUDE.md)
- [ ] AudioContext created lazily in first user-gesture handler
- [ ] `ctx.resume().then(() => schedule)` — never schedule immediately
- [ ] Feature detect: `if (!('AudioContext' in window || 'webkitAudioContext' in window))`
- [ ] `webkitAudioContext` fallback for older Safari

### Canvas Sizing
- [ ] Base: 800×600, scales to viewport maintaining aspect ratio
- [ ] `image-rendering: pixelated` (or `crisp-edges` with fallback)
- [ ] Handles orientation changes (landscape preferred)
- [ ] Retina display: set canvas.width/height to devicePixelRatio × CSS size, then scale context

### Key Interception on iPad Safari
- [ ] All game keys `preventDefault()` during gameplay
- [ ] `e.metaKey` correctly detects Windows key as Cmd
- [ ] `e.altKey` correctly detects Alt as Option
- [ ] `e.code` used for key identity (not `e.key` which varies with Option combos)
- [ ] Non-interceptable shortcuts handled via Knowledge Monster mode
- [ ] Test actual iPad: Cmd+Tab, Cmd+H, Cmd+Space interception behavior

### Memory Management
- [ ] No memory leaks from event listeners (all listeners removable)
- [ ] Offscreen canvases cleaned up on level unload
- [ ] Timer cleanup follows CLAUDE.md pattern (cancel() clears all, null-guard callbacks)

## Testing

- Full playthrough of Level 1 on iPad Safari (or Safari responsive mode)
- VoiceOver on: navigate menus, hear level descriptions, hear shortcut prompts
- Font size: change setting, all text scales correctly
- Slow monster mode: monsters at 50% speed
- 60fps maintained through combat (use Safari Web Inspector → Performance)
- Web Audio plays on first key press (no autoplay errors)
- All overlays trap focus correctly
- Escape closes overlays, returns focus to trigger

## Do NOT

- Do not add new features or mechanics
- Do not change game balance or level data
- Do not add `user-scalable=no` to viewport
- Do not use `@import` for fonts
- Do not use `#666` or lighter colors for text on cream
