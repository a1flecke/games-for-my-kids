#!/usr/bin/env node
'use strict';
// Validates claudes-math-marauder/data/*.json files.
// Stub for Session 1 — Session 4 fleshes this out with full validators.

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(function(f) { return f.endsWith('.json'); }) : [];

if (files.length === 0) {
  console.log('OK (no data files yet — validator stub from Session 1)');
  process.exit(0);
}

let errors = 0;
files.forEach(function(f) {
  const fp = path.join(dataDir, f);
  try {
    JSON.parse(fs.readFileSync(fp, 'utf8'));
    console.log('OK ' + f);
  } catch (e) {
    console.error('CRITICAL ' + f + ': ' + e.message);
    errors++;
  }
});

if (errors > 0) {
  console.error(errors + ' error(s) found.');
  process.exit(1);
}
console.log('All data files valid.');
process.exit(0);
