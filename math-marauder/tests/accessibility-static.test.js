const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const jsFiles = fs.readdirSync(path.join(root, 'js'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(root, 'js', name), 'utf8'));
const allSource = [html, css].concat(jsFiles).join('\n');

assert.ok(!/user-scalable\s*=\s*no/i.test(html));
assert.strictEqual((html.match(/opendyslexic/gi) || []).length, 1);
assert.ok(/<canvas[^>]+id="battle-canvas"[^>]+aria-label="Animated monster battle"/.test(html));
assert.ok(/<button[^>]+id="answer-0"/.test(html));
assert.ok(/<div[^>]+role="dialog"/.test(html));
assert.ok(/aria-modal="true"/.test(html));
assert.ok(/aria-hidden="true"/.test(html));
assert.ok(!/style\.display/.test(allSource));
assert.ok(!/(aria-live="[^"]+"[^>]*aria-hidden=|aria-hidden="[^"]+"[^>]*aria-live=)/.test(html));
assert.ok(!/(aria-live="[^"]+"[^>]*aria-label=|aria-label="[^"]+"[^>]*aria-live=)/.test(html));
