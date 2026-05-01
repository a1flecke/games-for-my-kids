#!/usr/bin/env node

const path = require('path');

const tests = [
    '../tests/problem-engine.test.js',
    '../tests/progression.test.js',
    '../tests/game-rules.test.js',
    '../tests/save.test.js',
    '../tests/content.test.js',
    '../tests/accessibility-static.test.js'
];

let passed = 0;

for (const rel of tests) {
    const file = path.join(__dirname, rel);
    require(file);
    passed += 1;
    console.log(`PASS ${rel}`);
}

console.log(`All Math Marauder tests passed: ${passed}/${tests.length}`);
