#!/bin/bash
# PostToolUse hook: auto-validate lizzies-petstore data JSON files after edits.
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

if [[ "$fp" == *"lizzies-petstore/data/"* && "$fp" == *.json ]]; then
    result=$(node lizzies-petstore/scripts/validate-creature-data.js 2>&1)
    echo "$result"
    if echo "$result" | grep -q "CRITICAL"; then
        exit 2
    fi
fi
