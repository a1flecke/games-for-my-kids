(function(global) {
  'use strict';

  // Returns exactly 4 numbers: the correct answer + 3 close-miss distractors, shuffled.
  // problem: { kind, a, b, answer }
  // rng: run-seeded 0..1 PRNG (must be provided — no Math.random() inside combat modules)
  function generateDistractors(problem, rng) {
    const correct = problem.answer;
    const candidates = new Set();

    if (problem.kind === 'mul') {
      const a = problem.a, b = problem.b;
      candidates.add(a * (b + 1));
      candidates.add(a * (b - 1));
      candidates.add((a + 1) * b);
      candidates.add((a - 1) * b);
      candidates.add(correct + 1);
      candidates.add(correct - 1);
      candidates.add(correct + 10);
      candidates.add(correct - 10);
      candidates.add(a + b);       // common kid mistake: confuse + with ×
      candidates.add(correct + 2);
      candidates.add(correct - 2);
    } else {
      const dividend = problem.a, divisor = problem.b;
      candidates.add(correct + 1);
      candidates.add(correct - 1);
      candidates.add(correct + 2);
      candidates.add(correct - 2);
      candidates.add(dividend - divisor);         // confuse − with ÷
      if (divisor > 1) candidates.add(Math.floor(dividend / (divisor - 1)));
      candidates.add(Math.floor(dividend / (divisor + 1)));
      candidates.add(dividend - correct);          // off-by-one on quotient
    }

    // Filter: non-negative integers, not equal to correct, plausible range
    const filtered = Array.from(candidates).filter(function(v) {
      return Number.isInteger(v) && v >= 0 && v !== correct && v <= 999;
    });

    // Sort by closeness to correct answer (prefer close-miss distractors)
    filtered.sort(function(x, y) { return Math.abs(x - correct) - Math.abs(y - correct); });

    // Take a pool then shuffle so distractor order isn't always the same
    const pool = filtered.slice(0, Math.max(6, filtered.length));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }

    const distractors = [];
    for (let vi = 0; vi < pool.length; vi++) {
      if (distractors.length === 3) break;
      if (!distractors.includes(pool[vi])) distractors.push(pool[vi]);
    }

    // Pathological fallback: answer=0 or very few valid candidates
    let pad = 1;
    while (distractors.length < 3) {
      const fallback = correct + pad;
      if (fallback !== correct && fallback >= 0 && !distractors.includes(fallback)) {
        distractors.push(fallback);
      }
      pad++;
      if (pad > 150) break;  // safety valve
    }

    const orbs = [correct].concat(distractors);

    // Final shuffle so correct answer isn't always position 0
    for (let oi = orbs.length - 1; oi > 0; oi--) {
      const oj = Math.floor(rng() * (oi + 1));
      const otmp = orbs[oi]; orbs[oi] = orbs[oj]; orbs[oj] = otmp;
    }

    return orbs;
  }

  const exp = { generateDistractors };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  else global.Distractors = exp;
})(typeof window !== 'undefined' ? window : globalThis);
