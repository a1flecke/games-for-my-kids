(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.ProblemEngine = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildProblemEngine() {
    const FACTORS = Array.from({ length: 13 }, (_, i) => i);
    const HISTORY_LIMIT = 6;

    class Random {
        constructor(seed) {
            this._seed = seed || 12345;
        }

        next() {
            this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
            return this._seed / 4294967296;
        }

        int(maxExclusive) {
            return Math.floor(this.next() * maxExclusive);
        }

        pick(items) {
            return items[this.int(items.length)];
        }
    }

    class ProblemEngine {
        constructor(options) {
            const opts = options || {};
            this._rng = new Random(opts.seed || Date.now());
            this._history = [];
        }

        generate(options) {
            const opts = options || {};
            const operations = opts.operations && opts.operations.length ? opts.operations : ['multiply', 'divide'];
            for (let attempt = 0; attempt < 40; attempt += 1) {
                const problem = this._makeProblem(opts, operations);
                if (!this._history.includes(problem.promptKey)) {
                    this._remember(problem.promptKey);
                    return this._withChoices(problem);
                }
            }
            const fallback = this._forOperation(this._rng.pick(operations), opts.band, 'band', opts.factorFamily);
            this._remember(fallback.promptKey);
            return this._withChoices(fallback);
        }

        _makeProblem(opts, operations) {
            const adaptive = opts.adaptive || {};
            const source = this._chooseSource(adaptive);
            if (source === 'weak') {
                const problem = this._fromFactKey(this._rng.pick(adaptive.weakFactQueue || []), operations, source);
                if (problem) return problem;
            }
            if (source === 'adjacent') {
                const weak = this._rng.pick(adaptive.weakFactQueue || []);
                const problem = this._adjacentToFact(weak, operations, opts.band);
                if (problem) return Object.assign(problem, { source });
            }
            if (source === 'mastered') {
                const mastered = Object.keys(adaptive.factMastery || {}).filter((key) => adaptive.factMastery[key] >= 4);
                const problem = this._fromFactKey(this._rng.pick(mastered), operations, source);
                if (problem) return problem;
            }
            return this._forOperation(this._rng.pick(operations), opts.band, 'band', opts.factorFamily);
        }

        _chooseSource(adaptive) {
            const weak = adaptive.weakFactQueue || [];
            const mastered = Object.keys(adaptive.factMastery || {}).filter((key) => adaptive.factMastery[key] >= 4);
            const roll = this._rng.next();
            if (weak.length && roll < 0.30) return 'weak';
            if (weak.length && roll < 0.45) return 'adjacent';
            if (mastered.length && roll < 0.55) return 'mastered';
            return 'band';
        }

        _forOperation(operation, band, source, factorFamily) {
            const family = this._normalFamily(factorFamily);
            if (family !== null) {
                if (operation === 'divide') return this._divisionForFamily(band, source, family);
                if (operation === 'missing') return this._missingForFamily(band, source, family);
                return this._multiplicationForFamily(band, source, family);
            }
            if (operation === 'divide') return this._division(band, source);
            if (operation === 'missing') return this._missingFactor(band, source);
            return this._multiplication(band, source);
        }

        _multiplication(band, source) {
            const factors = this._factorsForBand(band);
            const a = this._rng.pick(factors);
            const b = this._rng.pick(factors);
            return {
                operation: 'multiply',
                a,
                b,
                correct: a * b,
                prompt: `${a} x ${b}`,
                voiceText: `${a} times ${b}`,
                factKey: `mul:${Math.min(a, b)}:${Math.max(a, b)}`,
                promptKey: `mul:${a}:${b}`,
                answerMax: 144,
                source
            };
        }

        _division(band, source) {
            const factors = this._factorsForBand(band).filter((n) => n > 0);
            const divisor = this._rng.pick(factors);
            const quotient = this._rng.pick(this._factorsForBand(band));
            const dividend = divisor * quotient;
            return {
                operation: 'divide',
                dividend,
                divisor,
                quotient,
                correct: quotient,
                prompt: `${dividend} / ${divisor}`,
                voiceText: `${dividend} divided by ${divisor}`,
                factKey: `div:${dividend}:${divisor}`,
                promptKey: `div:${dividend}:${divisor}`,
                answerMax: 12,
                source
            };
        }

        _multiplicationForFamily(band, source, family) {
            const b = this._rng.pick(this._factorsForBand(band));
            return {
                operation: 'multiply',
                a: family,
                b,
                correct: family * b,
                prompt: `${family} x ${b}`,
                voiceText: `${family} times ${b}`,
                factKey: `mul:${Math.min(family, b)}:${Math.max(family, b)}`,
                promptKey: `mul:${family}:${b}`,
                answerMax: 144,
                source
            };
        }

        _divisionForFamily(band, source, family) {
            const nonZero = this._factorsForBand(band).filter((n) => n > 0);
            const divisor = family > 0 ? family : this._rng.pick(nonZero);
            const quotient = family > 0 ? this._rng.pick(this._factorsForBand(band)) : 0;
            const dividend = divisor * quotient;
            return {
                operation: 'divide',
                dividend,
                divisor,
                quotient,
                correct: quotient,
                prompt: `${dividend} / ${divisor}`,
                voiceText: `${dividend} divided by ${divisor}`,
                factKey: `div:${dividend}:${divisor}`,
                promptKey: `div:${dividend}:${divisor}`,
                answerMax: 12,
                source
            };
        }

        _missingForFamily(band, source, family) {
            const nonZero = this._factorsForBand(band).filter((n) => n > 0);
            const a = family > 0 ? family : this._rng.pick(nonZero);
            const missing = family > 0 ? this._rng.pick(this._factorsForBand(band)) : 0;
            const product = a * missing;
            return {
                operation: 'missing',
                a,
                missing,
                product,
                correct: missing,
                prompt: `${a} x ? = ${product}`,
                voiceText: `${a} times what number equals ${product}`,
                factKey: `missing:${a}:${product}`,
                promptKey: `missing:${a}:${product}`,
                answerMax: 12,
                source
            };
        }

        _missingFactor(band, source) {
            const factors = this._factorsForBand(band);
            const nonZero = factors.filter((n) => n > 0);
            const a = this._rng.pick(nonZero);
            const missing = this._rng.pick(factors);
            const product = a * missing;
            return {
                operation: 'missing',
                a,
                missing,
                product,
                correct: missing,
                prompt: `${a} x ? = ${product}`,
                voiceText: `${a} times what number equals ${product}`,
                factKey: `missing:${a}:${product}`,
                promptKey: `missing:${a}:${product}`,
                answerMax: 12,
                source
            };
        }

        _fromFactKey(key, operations, source) {
            if (!key) return null;
            const parts = key.split(':');
            if (parts[0] === 'mul' && operations.includes('multiply')) {
                const a = Number(parts[1]);
                const b = Number(parts[2]);
                return {
                    operation: 'multiply',
                    a,
                    b,
                    correct: a * b,
                    prompt: `${a} x ${b}`,
                    voiceText: `${a} times ${b}`,
                    factKey: `mul:${Math.min(a, b)}:${Math.max(a, b)}`,
                    promptKey: `mul:${a}:${b}`,
                    answerMax: 144,
                    source
                };
            }
            if (parts[0] === 'div' && operations.includes('divide')) {
                const dividend = Number(parts[1]);
                const divisor = Number(parts[2]);
                return {
                    operation: 'divide',
                    dividend,
                    divisor,
                    quotient: dividend / divisor,
                    correct: dividend / divisor,
                    prompt: `${dividend} / ${divisor}`,
                    voiceText: `${dividend} divided by ${divisor}`,
                    factKey: key,
                    promptKey: key,
                    answerMax: 12,
                    source
                };
            }
            if (parts[0] === 'missing' && operations.includes('missing')) {
                const a = Number(parts[1]);
                const product = Number(parts[2]);
                if (!a) return null;
                const missing = product / a;
                if (!Number.isInteger(missing) || missing < 0 || missing > 12) return null;
                return {
                    operation: 'missing',
                    a,
                    missing,
                    product,
                    correct: missing,
                    prompt: `${a} x ? = ${product}`,
                    voiceText: `${a} times what number equals ${product}`,
                    factKey: key,
                    promptKey: key,
                    answerMax: 12,
                    source
                };
            }
            return null;
        }

        _adjacentToFact(key, operations, band) {
            if (!key) return null;
            const parts = key.split(':');
            if (parts[0] === 'mul' && operations.includes('multiply')) {
                const anchor = Number(parts[1]);
                const neighbors = this._factorsForBand(band).filter((n) => Math.abs(n - Number(parts[2])) <= 1);
                const b = this._rng.pick(neighbors.length ? neighbors : this._factorsForBand(band));
                return {
                    operation: 'multiply',
                    a: anchor,
                    b,
                    correct: anchor * b,
                    prompt: `${anchor} x ${b}`,
                    voiceText: `${anchor} times ${b}`,
                    factKey: `mul:${Math.min(anchor, b)}:${Math.max(anchor, b)}`,
                    promptKey: `mul:${anchor}:${b}`,
                    answerMax: 144
                };
            }
            if (parts[0] === 'div' && operations.includes('divide')) {
                const divisor = Number(parts[2]);
                const quotient = this._rng.pick(this._factorsForBand(band));
                const dividend = divisor * quotient;
                return {
                    operation: 'divide',
                    dividend,
                    divisor,
                    quotient,
                    correct: quotient,
                    prompt: `${dividend} / ${divisor}`,
                    voiceText: `${dividend} divided by ${divisor}`,
                    factKey: `div:${dividend}:${divisor}`,
                    promptKey: `div:${dividend}:${divisor}`,
                    answerMax: 12
                };
            }
            if (parts[0] === 'missing' && operations.includes('missing')) {
                const a = Number(parts[1]);
                const missing = Number(parts[2]) / a;
                const neighbors = this._factorsForBand(band).filter((n) => Number.isInteger(missing) && Math.abs(n - missing) <= 1);
                const nextMissing = this._rng.pick(neighbors.length ? neighbors : this._factorsForBand(band));
                const product = a * nextMissing;
                return {
                    operation: 'missing',
                    a,
                    missing: nextMissing,
                    product,
                    correct: nextMissing,
                    prompt: `${a} x ? = ${product}`,
                    voiceText: `${a} times what number equals ${product}`,
                    factKey: `missing:${a}:${product}`,
                    promptKey: `missing:${a}:${product}`,
                    answerMax: 12
                };
            }
            return null;
        }

        _factorsForBand(band) {
            if (band === 'warm') return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            return FACTORS;
        }

        _normalFamily(value) {
            if (value === undefined || value === null || value === '') return null;
            const family = Number(value);
            if (!Number.isInteger(family) || family < 0 || family > 12) return null;
            return family;
        }

        _withChoices(problem) {
            const choices = new Set([problem.correct]);
            const near = [-24, -12, -10, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 10, 12, 24];
            const max = problem.answerMax;
            for (const delta of near) {
                if (choices.size >= 4) break;
                const value = problem.correct + delta;
                if (value >= 0 && value <= max && Number.isInteger(value)) choices.add(value);
            }
            while (choices.size < 4) {
                const value = this._rng.int(max + 1);
                choices.add(value);
            }
            const shuffled = Array.from(choices);
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = this._rng.int(i + 1);
                const tmp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = tmp;
            }
            return Object.assign({}, problem, { choices: shuffled });
        }

        _remember(key) {
            this._history.push(key);
            if (this._history.length > HISTORY_LIMIT) this._history.shift();
        }
    }

    return ProblemEngine;
});
