---
name: verify-math-geometry
description: Check that every section in each math-coloring-2 theme overlaps its nearest neighbor by at least 15px, preventing visual disconnection between body parts.
argument-hint: "[theme name or 'all']"
---

Run a geometry overlap check on the `themes` object in `math-coloring-2/index.html`.

## What to check

For every section in every theme (or the specified theme), verify it has at least one other section in the same theme that it overlaps with by ≥15px.

**Overlap rules:**
- Circle–circle: `overlap = (r1 + r2) - sqrt((x2-x1)² + (y2-y1)²)`. Must be ≥15.
- Polygon/triangle touching circle: at least one vertex of the polygon must be inside the circle radius: `sqrt((vx-cx)² + (vy-cy)²) < r`. "Inside" counts as overlap = `r - dist`.
- Circle touching polygon: same — check all polygon vertices against the circle.
- Polygon–polygon: check if any vertex of one is inside the bounding radius of the other's centroid (use the `x,y` field as centroid).

## Instructions

1. Read `math-coloring-2/index.html` and extract the `themes` object. Use a Bash subagent to run a Node.js script for accuracy.

2. For each theme (or the one specified in $ARGUMENTS):
   - For each section, find its maximum overlap with any other section in the same theme.
   - Flag any section where max overlap < 15px as a connectivity problem.

3. Report results:
   - `✓ Theme name: all N sections connected (min overlap Xpx between [section A] and [section B])`
   - Or: `✗ Theme name: [section at x,y] has max overlap Xpx with nearest neighbor — NEEDS FIX`

4. For any failing section, suggest a coordinate adjustment to achieve ≥20px overlap.

## Node.js template

```javascript
const fs = require('fs');
const html = fs.readFileSync('math-coloring-2/index.html', 'utf8');

// Extract themes object from the script block
const match = html.match(/const themes = (\{[\s\S]*?\n        \};)/);
if (!match) { console.error('Could not find themes object'); process.exit(1); }

// Evaluate the themes object (safe — it's our own file)
const themes = eval('(' + match[1].replace(/;$/, '') + ')');

function distCircleCircle(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function maxOverlap(section, others) {
  let best = -Infinity;
  for (const other of others) {
    if (other === section) continue;
    let overlap = -Infinity;

    if (section.type === 'circle' && other.type === 'circle') {
      overlap = (section.r + other.r) - distCircleCircle(section, other);
    } else if (section.type === 'circle' && other.points) {
      // Check if any vertex of polygon is inside this circle
      for (const [vx, vy] of other.points) {
        const d = Math.sqrt((vx - section.x) ** 2 + (vy - section.y) ** 2);
        overlap = Math.max(overlap, section.r - d);
      }
    } else if (section.points && other.type === 'circle') {
      // Check if any vertex of this polygon is inside the other circle
      for (const [vx, vy] of section.points) {
        const d = Math.sqrt((vx - other.x) ** 2 + (vy - other.y) ** 2);
        overlap = Math.max(overlap, other.r - d);
      }
    } else if (section.points && other.points) {
      // Approximate: check vertex distances to centroid
      for (const [vx, vy] of section.points) {
        const d = Math.sqrt((vx - other.x) ** 2 + (vy - other.y) ** 2);
        overlap = Math.max(overlap, 30 - d); // rough estimate
      }
    }
    best = Math.max(best, overlap);
  }
  return best;
}

const themesToCheck = process.argv[2] && process.argv[2] !== 'all'
  ? { [process.argv[2]]: themes[process.argv[2]] }
  : themes;

let allOk = true;
for (const [name, sections] of Object.entries(themesToCheck)) {
  const problems = [];
  let minOverall = Infinity;
  for (const section of sections) {
    const ov = maxOverlap(section, sections);
    if (ov < minOverall) minOverall = ov;
    if (ov < 15) {
      problems.push(`  ✗ section at (${section.x},${section.y}) answer=${section.answer}: max overlap=${ov.toFixed(1)}px`);
      allOk = false;
    }
  }
  if (problems.length === 0) {
    console.log(`✓ ${name}: all ${sections.length} sections connected (min overlap ${minOverall.toFixed(1)}px)`);
  } else {
    console.log(`✗ ${name}:`);
    problems.forEach(p => console.log(p));
  }
}
process.exit(allOk ? 0 : 1);
```

Run with: `node /tmp/check_geometry.js [theme]`
