#!/bin/bash
# PostToolUse hook: auto-validate KC4 level JSON files after edits.
# Exits 2 (blocking with feedback) when validation reports errors.

input=$(cat)

fp=$(python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null <<< "$input")

if [[ "$fp" == *"keyboard-command-4/data/levels"* && "$fp" == *.json ]]; then
    result=$(node keyboard-command-4/scripts/verify-levels.js 2>&1)
    echo "$result"
    if echo "$result" | grep -q "error(s) found"; then
        exit 2
    fi
fi
