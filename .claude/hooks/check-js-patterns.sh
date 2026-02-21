#!/bin/bash
# PostToolUse hook: scan phonics-game JS/HTML files for common coding standard violations.
# Exits 2 (blocking with feedback to Claude) when violations are found.
# Runs after every Edit or Write tool use on a matching file.

input=$(cat)

fp=$(python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null <<< "$input")

# Only run on phonics-game JS or HTML files
if [[ "$fp" != *"phonics-game/"* ]]; then exit 0; fi
if [[ "$fp" != *.js && "$fp" != *.html ]]; then exit 0; fi

errors=()

# 1. Biased shuffle — sort(() => Math.random() - 0.5)
if grep -Eq '\.sort\s*\(\s*\(\s*\)\s*=>\s*Math\.random\(\)' "$fp" 2>/dev/null; then
    errors+=("VIOLATION: Biased shuffle detected (.sort(() => Math.random() - 0.5)). Use Fisher-Yates instead.")
fi

# 2. Direct localStorage access outside SaveManager
if grep -Eq 'localStorage\.(getItem|setItem|removeItem)' "$fp" 2>/dev/null; then
    # Allow inside save.js itself
    if [[ "$fp" != *"save.js" ]]; then
        errors+=("VIOLATION: Direct localStorage access detected. Use SaveManager.load() / SaveManager.save() — one key: 'phonics-progress'.")
    fi
fi

# 3. Inline onclick attribute in HTML files
if [[ "$fp" == *.html ]]; then
    if grep -Eq 'onclick=' "$fp" 2>/dev/null; then
        errors+=("VIOLATION: onclick= HTML attribute detected. Use addEventListener in JS instead.")
    fi
fi

# 4. .onclick = property assignment in JS
if [[ "$fp" == *.js ]]; then
    if grep -Eq '\.(onclick|onchange|onsubmit)\s*=' "$fp" 2>/dev/null; then
        errors+=("VIOLATION: .onclick/.onchange property assignment detected. Use addEventListener instead.")
    fi
fi

# 5. Hardcoded inaccessible color #636e72 in CSS/style strings
if grep -iEq '#636e72' "$fp" 2>/dev/null; then
    errors+=("VIOLATION: Hardcoded color #636e72 detected — fails WCAG AA on cream background. Use var(--text-secondary) instead.")
fi

# 6. Lazy singleton init pattern: window.x = window.x || new X()
if [[ "$fp" == *.js ]]; then
    if grep -Eq 'window\.\w+\s*=\s*window\.\w+\s*\|\|' "$fp" 2>/dev/null; then
        errors+=("VIOLATION: Lazy singleton pattern (window.x = window.x || new X()) detected. Initialize managers fresh in game.init() — never lazily.")
    fi
fi

# 7. style.display assignment (warn on non-test JS files — common mistake)
if [[ "$fp" == *.js ]]; then
    if grep -Eq '\.style\.display\s*=' "$fp" 2>/dev/null; then
        errors+=("VIOLATION: style.display assignment detected. Use CSS classes instead: .active (screens), .open (overlays), .hidden (internal elements). Exception: display:none on non-toggle elements like loading spinners is OK — verify this is intentional.")
    fi
fi

if [ ${#errors[@]} -gt 0 ]; then
    echo ""
    echo "=== phonics-game coding standard violations in $fp ==="
    for err in "${errors[@]}"; do
        echo "  • $err"
    done
    echo ""
    echo "Fix the violation(s) above before proceeding. See CLAUDE.md and phonics-checklist for correct patterns."
    exit 2
fi

exit 0
