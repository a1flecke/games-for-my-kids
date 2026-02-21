#!/usr/bin/env node
// Validates phonics lesson JSON files for structural correctness.
// Run: node phonics-game/scripts/validate-lessons.js

const fs = require('fs');
const path = require('path');

const LESSONS_DIR = path.join(__dirname, '..', 'data', 'lessons');
// Hard minimum — ERROR below this. Target is 10 but some rare patterns
// (e.g. AUGHT) have fewer common American English words available.
const MIN_WORDS = 8;

// Words with dual pronunciations that depend on context — always flag.
const HOMOGRAPHS = new Set([
    'bow', 'sow', 'read', 'lead', 'wind', 'wound', 'tear', 'bass',
    'close', 'dove', 'live', 'minute', 'object', 'present', 'produce',
    'content', 'record', 'refuse', 'invalid', 'mobile', 'desert', 'permit',
    'project', 'rebel', 'subject', 'suspect', 'use', 'wound',
]);

// British-English-only spellings that American students won't recognise.
const BRITISH = new Set([
    'draught', 'nought', 'colour', 'colour', 'favour', 'honour', 'neighbour',
    'humour', 'labour', 'rumour', 'flavour', 'behaviour', 'harbour', 'mould',
    'programme', 'centre', 'fibre', 'metre', 'theatre', 'analyse', 'catalyse',
    'defence', 'licence', 'practise', 'travelling', 'fulfil',
]);

const files = fs.readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

let errors = 0;
let warnings = 0;

for (const file of files) {
    const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8'));
    const { id, title, patterns, wordPool } = lesson;
    const tag = `[L${String(id).padStart(2, '0')} ${title}]`;

    if (!patterns || !wordPool) {
        console.error(`ERROR ${tag} Missing 'patterns' or 'wordPool' field`);
        errors++;
        continue;
    }

    // 1. Each listed pattern must exist in wordPool.
    for (const p of patterns) {
        if (!wordPool[p]) {
            console.error(`ERROR ${tag} Pattern '${p}' listed in patterns[] but missing from wordPool`);
            errors++;
        }
    }

    // 2. Minimum word count.
    for (const p of patterns) {
        const words = wordPool[p] || [];
        if (words.length < MIN_WORDS) {
            console.error(`ERROR ${tag} Pattern '${p}' has ${words.length} words (minimum ${MIN_WORDS})`);
            errors++;
        }
    }

    // 3. Cross-pattern duplicates within the same lesson.
    const seen = {};
    for (const p of patterns) {
        for (const word of (wordPool[p] || [])) {
            const w = word.toLowerCase();
            if (seen[w]) {
                console.error(`ERROR ${tag} '${word}' appears in both '${seen[w]}' and '${p}'`);
                errors++;
            } else {
                seen[w] = p;
            }
        }
    }

    // 4. Known homographs (dual pronunciation).
    for (const p of patterns) {
        for (const word of (wordPool[p] || [])) {
            if (HOMOGRAPHS.has(word.toLowerCase())) {
                console.warn(`WARN  ${tag} '${word}' in '${p}' is a homograph (dual pronunciation)`);
                warnings++;
            }
        }
    }

    // 5. British-English-only spellings.
    for (const p of patterns) {
        for (const word of (wordPool[p] || [])) {
            if (BRITISH.has(word.toLowerCase())) {
                console.warn(`WARN  ${tag} '${word}' in '${p}' is a British spelling (unfamiliar to American students)`);
                warnings++;
            }
        }
    }
}

console.log(`\nValidation complete: ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0) process.exit(1);
