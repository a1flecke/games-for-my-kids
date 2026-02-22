# Session 13 — Registration & Cleanup (Haiku)

## Goal

Register the game in the site index, update CLAUDE.md with game-specific rules, and clean up any remaining issues.

## Tasks

### 1. Register in update-index.js

Add to `manualGameConfig` in `.github/scripts/update-index.js`:
```js
'keyboard-command-4': {
    icon: '⌨️🔫💥',
    title: 'Keyboard Command 4',
    description: 'Battle the Corruption in this Doom-inspired shooting gallery! Master 60+ iPadOS keyboard shortcuts by firing the right commands at digital monsters.'
}
```

Add to `gameCategories.skills`:
```js
skills: ['keyboard-quest', 'keyboard-quest-2', 'keyboard-command-4']
```

### 2. Regenerate index.html

```bash
eval "$(mise activate bash)"
node .github/scripts/update-index.js
```

### 3. Update CLAUDE.md

Add a section for keyboard-command-4 under Architecture:

```markdown
### keyboard-command-4 (active development)

Doom-inspired shooting gallery teaching iPadOS keyboard shortcuts. Canvas 2D rendering + Web Audio synthesis.

**Key source files:**
- `js/game.js` — main state machine, game loop, combat, health, combos
- `js/renderer.js` — Canvas 2D shooting gallery renderer, room backgrounds, sprites
- `js/input.js` — keyboard interception, modifier detection, shortcut matching
- `js/monsters.js` — 7 monster types with behaviors, death animations
- `js/weapons.js` — 10 weapon types with fire animations
- `js/hud.js` — HUD overlay (health, score, prompt, combo)
- `js/audio.js` — Web Audio synthesizer for all SFX
- `js/levels.js` — level loader, room transitions, wave spawning
- `js/shortcuts.js` — shortcut database, journal, prompt generation
- `js/tutorial.js` — tutorial system, hints, Commander Byte dialogue
- `js/save.js` — LocalStorage save (key: `keyboard-command-4-save`)
- `data/shortcuts.json` — 60 iPadOS keyboard shortcuts with metadata
- `data/levels/level{1-10}.json` — room layouts, waves, boss configs

**Target platform:** iPad Safari with Bluetooth Windows keyboard. Must maintain 60fps.
```

### 4. Delete Session Files

After all sessions are complete, delete:
- `keyboard-command-4/sessions/` directory (all session files + MODEL-ASSIGNMENTS.md)

Note: Only delete after ALL 13 sessions are complete. This session is the final one.

### 5. Commit & Push

Commit message: "Register keyboard-command-4 in site index and update CLAUDE.md"

## Do NOT

- Do not modify any game code
- Do not change game behavior
- Do not delete plan.md (keep as reference)
