#!/usr/bin/env node

/**
 * Validate all lizzies-petstore data/*.json files.
 * Checks schema integrity, color formats, referential integrity,
 * attachment point consistency, duplicate IDs, minimum counts, and unlock conditions.
 *
 * Exit code 0 = pass, 1 = CRITICAL errors found.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

let criticalCount = 0;
let warnCount = 0;

function critical(file, msg) {
    console.error(`  CRITICAL [${file}]: ${msg}`);
    criticalCount++;
}

function warn(file, msg) {
    console.warn(`  WARN [${file}]: ${msg}`);
    warnCount++;
}

function info(file, msg) {
    console.log(`  INFO [${file}]: ${msg}`);
}

function loadJSON(filename) {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) {
        critical(filename, `File not found: ${fp}`);
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
        critical(filename, `Invalid JSON: ${e.message}`);
        return null;
    }
}

function isValidColor(c) {
    return typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
}

// ── parts.json ──────────────────────────────────────────────

function validateParts(parts) {
    const file = 'parts.json';
    if (!parts) return;

    if (!Array.isArray(parts)) {
        critical(file, 'Root must be an array');
        return;
    }

    const ids = new Set();
    const requiredFields = ['id', 'name', 'category', 'defaultColor', 'hitBox', 'pivotPoint'];
    const validCategories = ['head', 'eyes', 'torso', 'legs', 'tail', 'wings', 'extras'];
    const categoryCounts = {};

    for (const part of parts) {
        // Required fields
        for (const field of requiredFields) {
            if (part[field] === undefined) {
                critical(file, `Part "${part.id || part.name || '?'}" missing required field: ${field}`);
            }
        }

        // Duplicate IDs
        if (part.id) {
            if (ids.has(part.id)) {
                critical(file, `Duplicate part ID: ${part.id}`);
            }
            ids.add(part.id);
        }

        // Category validity
        if (part.category && !validCategories.includes(part.category)) {
            critical(file, `Part "${part.id}" has invalid category: ${part.category}`);
        }

        // Color format
        if (part.defaultColor && !isValidColor(part.defaultColor)) {
            critical(file, `Part "${part.id}" has invalid color format: ${part.defaultColor} (expected #RRGGBB)`);
        }

        // HitBox structure
        if (part.hitBox) {
            for (const k of ['x', 'y', 'w', 'h']) {
                if (typeof part.hitBox[k] !== 'number') {
                    critical(file, `Part "${part.id}" hitBox missing or non-numeric field: ${k}`);
                }
            }
        }

        // PivotPoint structure
        if (part.pivotPoint) {
            for (const k of ['x', 'y']) {
                if (typeof part.pivotPoint[k] !== 'number') {
                    critical(file, `Part "${part.id}" pivotPoint missing or non-numeric field: ${k}`);
                }
            }
        }

        // Count by category
        if (part.category) {
            categoryCounts[part.category] = (categoryCounts[part.category] || 0) + 1;
        }
    }

    // Minimum starter items per slot (at least 2 with no unlock condition)
    for (const cat of validCategories) {
        const starterCount = parts.filter(p => p.category === cat && !p.unlockCondition).length;
        if (starterCount < 2) {
            warn(file, `Category "${cat}" has only ${starterCount} starter items (no unlockCondition). Recommend at least 2.`);
        }
    }

    info(file, `${parts.length} parts validated (${Object.entries(categoryCounts).map(([k,v]) => `${k}:${v}`).join(', ')})`);
    return ids;
}

// ── accessories.json ────────────────────────────────────────

function validateAccessories(accessories, partIds) {
    const file = 'accessories.json';
    if (!accessories) return;

    if (!Array.isArray(accessories)) {
        critical(file, 'Root must be an array');
        return;
    }

    const ids = new Set();
    const validSlots = ['head', 'neck', 'body', 'feet', 'face'];

    for (const acc of accessories) {
        for (const field of ['id', 'name', 'slot']) {
            if (acc[field] === undefined) {
                critical(file, `Accessory "${acc.id || acc.name || '?'}" missing required field: ${field}`);
            }
        }

        if (acc.id) {
            if (ids.has(acc.id)) {
                critical(file, `Duplicate accessory ID: ${acc.id}`);
            }
            ids.add(acc.id);
        }

        if (acc.slot && !validSlots.includes(acc.slot)) {
            critical(file, `Accessory "${acc.id}" has invalid slot: ${acc.slot}`);
        }

        // Check compatibleParts references
        if (acc.compatibleParts && Array.isArray(acc.compatibleParts)) {
            for (const ref of acc.compatibleParts) {
                if (partIds && !partIds.has(ref)) {
                    warn(file, `Accessory "${acc.id}" references unknown part: ${ref}`);
                }
            }
        }

        // Color validation
        if (acc.defaultColor && !isValidColor(acc.defaultColor)) {
            critical(file, `Accessory "${acc.id}" has invalid color: ${acc.defaultColor}`);
        }
    }

    info(file, `${accessories.length} accessories validated`);
    return ids;
}

// ── themes.json ─────────────────────────────────────────────

function validateThemes(themes) {
    const file = 'themes.json';
    if (!themes) return;

    if (!Array.isArray(themes)) {
        critical(file, 'Root must be an array');
        return;
    }

    const ids = new Set();

    for (const theme of themes) {
        for (const field of ['id', 'name']) {
            if (theme[field] === undefined) {
                critical(file, `Theme "${theme.id || theme.name || '?'}" missing required field: ${field}`);
            }
        }

        if (theme.id) {
            if (ids.has(theme.id)) {
                critical(file, `Duplicate theme ID: ${theme.id}`);
            }
            ids.add(theme.id);
        }

        // Background color validation
        if (theme.backgroundColor && !isValidColor(theme.backgroundColor)) {
            critical(file, `Theme "${theme.id}" has invalid backgroundColor: ${theme.backgroundColor}`);
        }
    }

    info(file, `${themes.length} themes validated`);
    return ids;
}

// ── unlocks.json ────────────────────────────────────────────

function validateUnlocks(unlocks) {
    const file = 'unlocks.json';
    if (!unlocks) return;

    if (!Array.isArray(unlocks)) {
        critical(file, 'Root must be an array');
        return;
    }

    const ids = new Set();

    for (const unlock of unlocks) {
        for (const field of ['id', 'name', 'condition', 'rewards']) {
            if (unlock[field] === undefined) {
                critical(file, `Unlock "${unlock.id || unlock.name || '?'}" missing required field: ${field}`);
            }
        }

        if (unlock.id) {
            if (ids.has(unlock.id)) {
                critical(file, `Duplicate unlock ID: ${unlock.id}`);
            }
            ids.add(unlock.id);
        }

        // Condition validation
        if (unlock.condition) {
            if (!unlock.condition.type) {
                critical(file, `Unlock "${unlock.id}" condition missing type`);
            }
            if (unlock.condition.count !== undefined && typeof unlock.condition.count !== 'number') {
                critical(file, `Unlock "${unlock.id}" condition count must be a number`);
            }
        }

        // Rewards must be an array
        if (unlock.rewards && !Array.isArray(unlock.rewards)) {
            critical(file, `Unlock "${unlock.id}" rewards must be an array`);
        }
    }

    info(file, `${unlocks.length} unlocks validated`);
    return ids;
}

// ── names.json ──────────────────────────────────────────────

function validateNames(names) {
    const file = 'names.json';
    if (!names) return;

    if (!names.categories || !Array.isArray(names.categories)) {
        critical(file, 'Must have a "categories" array');
        return;
    }

    let totalNames = 0;

    for (const cat of names.categories) {
        if (!cat.vibe || !cat.names) {
            critical(file, `Name category missing "vibe" or "names" field`);
            continue;
        }
        if (!Array.isArray(cat.names)) {
            critical(file, `Category "${cat.vibe}" names must be an array`);
            continue;
        }
        totalNames += cat.names.length;
    }

    if (totalNames < 20) {
        warn(file, `Only ${totalNames} preset names. Recommend at least 60.`);
    }

    info(file, `${totalNames} preset names across ${names.categories.length} categories`);
}

// ── Cross-file referential integrity ────────────────────────

function validateCrossReferences(parts, accessories, unlocks) {
    const unlockIds = new Set();
    if (unlocks) {
        for (const u of unlocks) {
            if (u.id) unlockIds.add(u.id);
        }
    }

    // Check part unlockCondition references
    if (parts) {
        for (const part of parts) {
            if (part.unlockCondition && !unlockIds.has(part.unlockCondition)) {
                warn('parts.json', `Part "${part.id}" references unknown unlockCondition: ${part.unlockCondition}`);
            }
        }
    }

    // Check accessory unlockCondition references
    if (accessories) {
        for (const acc of accessories) {
            if (acc.unlockCondition && !unlockIds.has(acc.unlockCondition)) {
                warn('accessories.json', `Accessory "${acc.id}" references unknown unlockCondition: ${acc.unlockCondition}`);
            }
        }
    }
}

// ── Main ────────────────────────────────────────────────────

function main() {
    console.log('Validating lizzies-petstore data files...\n');

    const parts = loadJSON('parts.json');
    const accessories = loadJSON('accessories.json');
    const themes = loadJSON('themes.json');
    const unlocks = loadJSON('unlocks.json');
    const names = loadJSON('names.json');

    const partIds = validateParts(parts);
    validateAccessories(accessories, partIds);
    validateThemes(themes);
    const unlockIds = validateUnlocks(unlocks);
    validateNames(names);

    // Cross-file checks
    validateCrossReferences(parts, accessories, unlocks);

    console.log('');
    if (criticalCount > 0) {
        console.error(`RESULT: ${criticalCount} CRITICAL error(s), ${warnCount} warning(s)`);
        process.exit(1);
    } else if (warnCount > 0) {
        console.log(`RESULT: 0 errors, ${warnCount} warning(s)`);
    } else {
        console.log('RESULT: All data files valid.');
    }
}

main();
