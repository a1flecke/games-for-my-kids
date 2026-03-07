---
name: verify-kc4-levels
description: Validate all keyboard-command-4 level JSON files for correctness — item safety, shortcut ID validity, hp/phases consistency, offsetX collisions, mage depths, instruction accuracy, and taunt uniqueness.
argument-hint: "[level number or 'all']"
---

Run the verification script via the Bash tool. Report every finding as CRITICAL / WARN / INFO with the level and field that failed.

## What is checked

1. **Item type validity** — only `"health"` (with `amount`) and `"weapon"` (with `weaponId`) are engine-supported types
2. **Item after_room safety** — items delivered just before a boss corridor are swallowed by `startBossTransition`. Safe max:
   - Find the first room in the level that has a `boss` field (first_boss_id)
   - If the room at `first_boss_id - 1` has `isBonus: true` → safe_max = first_boss_id - 3
   - Otherwise → safe_max = first_boss_id - 2
   - Any `after_room > safe_max` is CRITICAL
3. **Shortcut ID validity** — every `shortcutId` in boss phases must exist in `shortcuts.json`
4. **hp vs phases.length** — every boss `hp` must equal `phases.length`
5. **OffsetX collisions** — no two monsters in the same wave may share the same `offsetX`
6. **Mage depth** — any monster with `type: "mage"` must have `depth ≤ 0.15`
7. **Depth bounds** — all monster depths must be in range `0.0–0.8`
8. **Instruction accuracy** — each boss phase `instruction` must match the `action` field for that `shortcutId` in `shortcuts.json`
9. **Taunt uniqueness** — no taunt string may be repeated across different bosses in any level

## Run this command

Use the Bash tool to execute from the repo root:

```bash
node keyboard-command-4/scripts/verify-levels.js
```

To check a single level (e.g., level 5):

```bash
node keyboard-command-4/scripts/verify-levels.js 5
```

Exit code 1 means failures found — fix all CRITICAL issues before committing.
