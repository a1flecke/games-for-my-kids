---
name: validate-marauder-data
description: Validate all claudes-math-marauder data/*.json files for schema integrity, referential consistency, and contrast rules.
---

Run `node claudes-math-marauder/scripts/validate-data.js` and fix any reported CRITICAL or WARN errors before committing.

If the script exits non-zero, read the output and fix each reported issue. Re-run until it exits 0.
