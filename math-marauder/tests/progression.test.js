const assert = require('assert');
const Progression = require('../js/progression.js');

{
    const progression = new Progression();
    const before = progression.getMastery('mul:7:8');
    progression.recordAnswer({ factKey: 'mul:7:8', correct: true, firstTry: true });
    assert.ok(progression.getMastery('mul:7:8') > before);
}

{
    const progression = new Progression();
    progression.recordAnswer({ factKey: 'div:56:7', correct: false, firstTry: false });
    assert.ok(progression.getMastery('div:56:7') < 0);
    assert.ok(progression.getWeakFacts().includes('div:56:7'));
}

{
    const progression = new Progression();
    progression.recordAnswer({ factKey: 'mul:7:8', correct: false, firstTry: false });
    progression.recordAnswer({ factKey: 'mul:3:3', correct: true, firstTry: true });
    progression.recordAnswer({ factKey: 'mul:3:3', correct: true, firstTry: true });
    const adaptive = progression.getAdaptiveConfig();
    assert.deepStrictEqual(adaptive.weakFactQueue, ['mul:7:8']);
    assert.strictEqual(adaptive.factMastery['mul:3:3'], 4);
}

{
    const progression = new Progression();
    const threeStars = progression.scoreRaid({ total: 30, correctFirstTry: 28, hearts: 3, longestStreak: 12 });
    const oneStar = progression.scoreRaid({ total: 30, correctFirstTry: 18, hearts: 1, longestStreak: 4 });
    assert.strictEqual(threeStars.stars, 3);
    assert.strictEqual(oneStar.stars, 1);
}

{
    const progression = new Progression();
    const quickSave = { raidsCompleted: 0, standardRaidsCompleted: 0, bestStarsByMode: {} };
    progression.completeRaid(quickSave, { mode: 'quick', stars: 3 });
    assert.ok(!progression.getUnlockedModes(quickSave).includes('practice-forge'));

    const standardSave = { raidsCompleted: 0, standardRaidsCompleted: 0, bestStarsByMode: {} };
    progression.completeRaid(standardSave, { mode: 'standard', stars: 2, coins: 75 });
    assert.ok(progression.getUnlockedModes(standardSave).includes('practice-forge'));
    assert.strictEqual(standardSave.coins, 75);

    const practice = progression.makePracticeConfig('mul:7:8');
    assert.deepStrictEqual(practice.operations, ['multiply', 'divide', 'missing']);
    assert.strictEqual(practice.factorFamily, 7);
    assert.ok(practice.promptTarget <= 8);

    assert.strictEqual(progression.makePracticeConfig('div:56:7').factorFamily, 7);
    assert.strictEqual(progression.makePracticeConfig('missing:9:81').factorFamily, 9);
}
