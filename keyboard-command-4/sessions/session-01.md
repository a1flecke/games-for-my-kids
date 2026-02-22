# Session 1 — Foundation (Opus)

## Goal

Create the project skeleton: HTML shell, CSS design system, and game.js state machine. By the end, the game loads, shows a title screen, navigates to level select, and enters a blank gameplay screen — all keyboard-navigable.

## Files to Create

### `index.html`
- `<title>Keyboard Command 4: The Digital Realm</title>`
- `<link>` to OpenDyslexic CDN, Comic Sans MS fallback
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — NO `user-scalable=no`
- Screens as `<div>` sections: `#screen-title`, `#screen-select`, `#screen-gameplay`, `#screen-results`
- Gameplay screen contains: `<canvas id="game-canvas">` + HUD overlay `<div id="hud">`
- Pause overlay: `<div id="pause-overlay" role="dialog" aria-modal="true">`
- Settings overlay: `<div id="settings-overlay" role="dialog" aria-modal="true">`
- `<script defer>` tags for all JS files (game.js only for now, others stubbed)
- Init pattern: `window.game = new Game(); window.game.init();`

### `css/style.css`
- CSS custom properties: `--bg-cream: #F5F0E8`, `--text-dark: #2C2416`, `--text-secondary: #595143`
- Font stack: `'OpenDyslexic', 'Comic Sans MS', cursive, sans-serif`
- Screen visibility: `.screen { display: none; } .screen.active { display: flex; }`
- No `display:` in ID rules (see CLAUDE.md CSS ID specificity rule)
- Pause/settings overlays: `.overlay { display: none; } .overlay.open { display: flex; }`
- Canvas: `image-rendering: pixelated; width: 100%; max-width: 800px;`
- Title screen: centered layout, glitch text animation (CSS only, no strobing)
- Level select: 2×5 grid of level cards, keyboard-focusable
- Level cards: `.level-card { min-height: 44px; }` (touch target)
- Settings: font size options, toggle switches, volume slider
- Screen shake: `@keyframes shake` (100ms, subtle)

### `js/game.js`
- `Game` class with state machine: `TITLE`, `LEVEL_SELECT`, `GAMEPLAY`, `PAUSED`, `RESULTS`
- `init()`: set up screens, bind keyboard navigation, load save data
- `showScreen(name)`: manages `.active` class on screens
- `showTitle()`: title screen with "PRESS ANY KEY" listener
- `showLevelSelect()`: renders 10 level cards (locked/unlocked), arrow key + Enter navigation
- `showGameplay(levelId)`: initializes Canvas, enters gameplay state (stub for now)
- `showResults(stats)`: end-of-level stats screen
- `togglePause()`: pause overlay open/close with focus trap
- `openSettings()` / `closeSettings()`: settings overlay with focus trap
- Global `keydown` listener with `preventDefault()` for game keys
- Menu navigation: ArrowUp/Down to move selection, Enter to confirm, Escape to go back

## Coding Rules (from CLAUDE.md)

- Modal dialogs: `role="dialog"`, `aria-modal="true"`, focus trap with Tab/Shift-Tab, Escape to close
- First focusable element in modals = close button
- `aria-hidden` on overlays: always set explicitly to `"true"`/`"false"`, never remove
- Visibility: use `.active`/`.open` classes, never `style.display`
- Focus-trap Escape guard: check `overlay.classList.contains('open')` before acting
- `window.game = new Game(); window.game.init();` — not `game.init()`
- No `window.addEventListener('load', ...)` — `defer` handles it
- Font loading: `<link>` only, no `@import` in CSS
- Touch targets: 44×44px minimum

## Testing

- Open `index.html` in browser
- Title screen appears with game title
- Any key press → level select screen
- Level 1 card is unlocked, levels 2–10 locked
- Arrow keys navigate level cards, Enter selects
- Selecting Level 1 → gameplay screen (blank canvas is fine)
- Escape → pause overlay with focus trap working
- Settings accessible from pause menu
- Tab/Shift-Tab cycles within overlays
- Escape closes overlays
- All text is OpenDyslexic, cream background, high contrast

## Do NOT

- Do not implement rendering, monsters, weapons, or audio yet
- Do not create any other JS files besides game.js (they'll be stubs/comments)
- Do not use mouse events anywhere
- Do not add `user-scalable=no` to viewport
- Do not put `display:` in base ID rules
