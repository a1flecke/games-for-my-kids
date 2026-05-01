const assert = require('assert');
const ProblemEngine = require('../js/problem-engine.js');

function makeEngine(seed) {
    return new ProblemEngine({ seed: seed || 12345 });
}

{
    const engine = makeEngine();
    for (let i = 0; i < 500; i += 1) {
        const problem = engine.generate({ operations: ['multiply'], band: 'deep' });
        assert.strictEqual(problem.operation, 'multiply');
        assert.ok(problem.a >= 0 && problem.a <= 12);
        assert.ok(problem.b >= 0 && problem.b <= 12);
        assert.strictEqual(problem.correct, problem.a * problem.b);
        assert.ok(problem.correct >= 0 && problem.correct <= 144);
    }
}

{
    const engine = makeEngine();
    for (let i = 0; i < 500; i += 1) {
        const problem = engine.generate({ operations: ['divide'], band: 'deep' });
        assert.strictEqual(problem.operation, 'divide');
        assert.ok(problem.divisor >= 1 && problem.divisor <= 12);
        assert.ok(problem.quotient >= 0 && problem.quotient <= 12);
        assert.strictEqual(problem.dividend, problem.divisor * problem.quotient);
        assert.strictEqual(problem.correct, problem.quotient);
        assert.strictEqual(problem.dividend % problem.divisor, 0);
    }
}

{
    const engine = makeEngine();
    for (let i = 0; i < 250; i += 1) {
        const problem = engine.generate({ operations: ['multiply', 'divide', 'missing'], band: 'deep' });
        assert.strictEqual(problem.choices.length, 4);
        assert.strictEqual(new Set(problem.choices).size, 4);
        assert.ok(problem.choices.includes(problem.correct));
        assert.ok(problem.choices.every((choice) => Number.isInteger(choice)));
        assert.ok(problem.choices.every((choice) => choice >= 0));
    }
}

{
    const engine = makeEngine();
    const seen = [];
    for (let i = 0; i < 30; i += 1) {
        const problem = engine.generate({ operations: ['multiply'], band: 'warm' });
        const key = problem.promptKey;
        assert.ok(!seen.slice(-6).includes(key), `prompt repeated too soon: ${key}`);
        seen.push(key);
    }
}

{
    const engine = makeEngine();
    for (let i = 0; i < 250; i += 1) {
        const problem = engine.generate({ operations: ['missing'], band: 'deep' });
        assert.strictEqual(problem.operation, 'missing');
        assert.ok(problem.a >= 1 && problem.a <= 12);
        assert.ok(problem.missing >= 0 && problem.missing <= 12);
        assert.strictEqual(problem.product, problem.a * problem.missing);
        assert.strictEqual(problem.correct, problem.missing);
        assert.ok(problem.choices.every((choice) => choice >= 0 && choice <= 12));
        assert.ok(problem.voiceText.includes('what number'));
    }
}

{
    const engine = makeEngine(98765);
    const counts = { weak: 0, adjacent: 0, mastered: 0, band: 0 };
    for (let i = 0; i < 240; i += 1) {
        const problem = engine.generate({
            operations: ['multiply', 'divide', 'missing'],
            band: 'deep',
            adaptive: {
                weakFactQueue: ['mul:7:8', 'div:56:7'],
                factMastery: { 'mul:2:2': 8, 'mul:3:3': 6 }
            }
        });
        counts[problem.source] += 1;
    }
    assert.ok(counts.weak >= 35, `weak facts not weighted enough: ${counts.weak}`);
    assert.ok(counts.adjacent >= 15, `adjacent facts not represented: ${counts.adjacent}`);
    assert.ok(counts.mastered >= 5, `mastered review facts not represented: ${counts.mastered}`);
    assert.ok(counts.band >= 40, `current-band facts not represented: ${counts.band}`);
}
