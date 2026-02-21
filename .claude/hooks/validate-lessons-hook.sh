#!/bin/bash
# PostToolUse hook: auto-validate phonics lesson JSON files after edits.
# Exits 2 (blocking with feedback) when validation reports errors.

input=$(cat)

fp=$(echo "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null)

if [[ "$fp" == *"phonics-game/data/lessons"* && "$fp" == *.json ]]; then
    result=$(node phonics-game/scripts/validate-lessons.js 2>&1)
    echo "$result"
    if ! echo "$result" | grep -q "0 error(s)"; then
        exit 2
    fi
fi
