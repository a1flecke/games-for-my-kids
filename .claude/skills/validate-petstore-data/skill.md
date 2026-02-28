---
name: validate-petstore-data
description: Validate all lizzies-petstore data/*.json files for schema integrity, referential consistency, and unlock condition validity.
argument-hint: "[file name or 'all']"
---

Run the petstore data validation script to check all JSON data files:

```bash
eval "$(mise activate bash)" && node lizzies-petstore/scripts/validate-creature-data.js
```

The validator checks:
1. **Schema integrity** — required fields per type in parts.json, accessories.json, themes.json, unlocks.json, names.json
2. **Color format** — all color values match `#RRGGBB` format
3. **Referential integrity** — accessory `compatibleParts` reference valid part types, unlock conditions reference valid milestone IDs
4. **Attachment point consistency** — all parts define required pivot and hitbox fields
5. **No duplicate IDs** within or across files
6. **Minimum part counts** per category (at least 2 starter items per slot)
7. **Unlock condition validity** — milestone IDs in unlock conditions exist in unlocks.json

Report all CRITICAL errors (exit code 1) and WARN issues. Fix all CRITICAL errors before committing.
