# Session 3 — Input System & Shortcuts Database (Opus)

## Goal

Build the keyboard interception system and the complete shortcuts database. By the end, the game detects all modifier+key combos, matches them against the shortcut database, and correctly `preventDefault()`s browser/OS actions.

## Files to Create

### `js/input.js`

**InputManager Class:**
- `constructor()`: bind global `keydown`/`keyup` listeners
- Track modifier state: `{ cmd: false, shift: false, option: false, ctrl: false }`
- `keydown` handler:
  - `e.preventDefault()` on ALL keys during gameplay state (prevent browser shortcuts)
  - Detect modifiers from `e.metaKey` (Cmd/Win), `e.shiftKey`, `e.altKey` (Option/Alt), `e.ctrlKey`
  - Build combo string: `"cmd+shift+left"` normalized format
  - Queue the combo for game processing
- `keyup` handler: update modifier state
- **Game control routing:** distinguish between game controls (Tab, Escape, arrows, numbers) and shortcut attempts
  - If key is Tab → route to target cycling
  - If key is Escape → route to pause
  - If key is 1-0 → route to weapon select
  - If key is H → route to journal
  - Otherwise → treat as shortcut attempt
- `enable()` / `disable()`: toggle interception (disabled during menus, enabled during gameplay)
- `onShortcutAttempt` callback: fires with `{ keys: "cmd+c", raw: KeyboardEvent }`
- `onGameControl` callback: fires with `{ action: "tab" | "escape" | "weapon1" | ... }`

**Key normalization:**
- Map `e.key` values to consistent names: `"ArrowLeft"` → `"left"`, `"Backspace"` → `"delete"`, `" "` → `"space"`
- Handle `e.code` fallback for keys that vary by layout
- Modifier order always: `ctrl+cmd+option+shift+key` (canonical form)
- Case-insensitive key matching

**Non-interceptable shortcut detection:**
- Maintain a set of shortcuts known to escape `preventDefault()` on iPadOS Safari
- When a non-interceptable shortcut is the current target, switch to "Knowledge Monster" mode (Enter to acknowledge)

### `js/shortcuts.js`

**ShortcutManager Class:**
- Load and parse `data/shortcuts.json`
- `getShortcut(id)`: returns full shortcut object
- `getShortcutsForLevel(levelId)`: returns all shortcuts assigned to a level
- `matchAttempt(comboString, targetId)`: returns `{ correct: boolean, shortcut: object }`
- `getRandomShortcut(levelId, mode)`: pick a shortcut for monster assignment
- `getPromptText(shortcutId, mode)`: returns display text for Key Mode or Action Mode
  - Key Mode: `"⌘+C"` with physical key subtitle `"(Win+C)"`
  - Action Mode: `"Copy selected text"`
- Journal tracking:
  - `learnShortcut(id)`: marks as discovered
  - `getJournalEntries()`: returns all learned shortcuts grouped by category
  - `getStats(id)`: usage count, accuracy for a specific shortcut

### `data/shortcuts.json`

Full database of 60 shortcuts per plan.md §3.1. Each entry:
```json
{
  "id": "cmd_c",
  "keys": ["Cmd", "C"],
  "combo": "cmd+c",
  "display": "⌘+C",
  "physicalDisplay": "Win+C",
  "action": "Copy",
  "description": "Copy selected text or item to clipboard",
  "category": "basics",
  "difficulty": 1,
  "level": 1,
  "canIntercept": true
}
```

Include all 60 shortcuts from plan.md §3.1 plus category definitions. Ensure:
- Every shortcut's `combo` field matches what `InputManager` produces
- `canIntercept: false` for system-level shortcuts
- Difficulty 1–5 matches level progression
- Categories: basics, files, text, navigation, selection, apps, browser, advanced

## Key Challenges

- **Windows keyboard on iPad:** `e.metaKey` = true when Win key held. `e.altKey` = true for Alt/Option. Test that combo detection works for both physical labels.
- **Cmd+Tab (app switcher):** On iPadOS, this MAY be intercepted in a PWA/full-screen web app but NOT in regular Safari. Mark as `canIntercept: false` if unreliable; use Knowledge Monster.
- **Rapid modifier release:** Some key combos fire multiple `keydown` events. Debounce or use only the final combo detected per 100ms window.
- **e.key vs e.code:** On some keyboards, `e.key` for Option+letter gives special characters (e.g., Option+C = "ç"). Use `e.code` for the base key and `e.metaKey`/`e.altKey`/`e.shiftKey` for modifiers.

## Testing

- During gameplay, press Cmd+C → InputManager detects `"cmd+c"`, matches correctly
- Press Cmd+Shift+Left → detects `"cmd+shift+left"`, matches correctly
- Press just "A" with no modifiers → no match (not a valid shortcut)
- Press wrong shortcut → `matchAttempt` returns `{ correct: false }`
- Tab key → routes to target cycling (not treated as shortcut)
- Escape → routes to pause
- Number keys → route to weapon select
- Browser does NOT execute the actual shortcut (Cmd+N does not open new window)
- Shortcut journal populates as shortcuts are learned
- Key Mode and Action Mode prompts render correct text

## Do NOT

- Do not implement monster targeting or combat — that's session 4
- Do not render shortcut prompts on screen — HUD is session 5
- Do not implement the shortcut journal UI — that's session 5 (tutorial)
- Do not handle audio — that's session 5
