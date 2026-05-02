const assert = require('assert');

function makeElement(checked) {
    return {
        checked: !!checked,
        addEventListener() {}
    };
}

const elements = {
    'setting-sfx': makeElement(true),
    'setting-music': makeElement(true),
    'setting-speech': makeElement(true),
    'setting-reduced-motion': makeElement(false)
};

const originalDocument = global.document;
const originalMathMarauder = global.MathMarauder;
global.document = {
    addEventListener() {},
    getElementById(id) {
        return elements[id] || makeElement(false);
    }
};
global.MathMarauder = {};
require('../js/game.js');

function stubGameForAnswer() {
    const game = new MathMarauder.Game();
    game._currentProblem = { correct: 12, factKey: 'mul:3:4' };
    game._firstTry = true;
    game._progression = { recordAnswer() {} };
    game._encounter = {};
    game._raid = {
        hearts: 3,
        shields: 1,
        streak: 0,
        promptsAnswered: 0,
        correctFirstTry: 0,
        longestStreak: 0
    };
    game._ui = {
        markAnswer() {},
        showSpell() {},
        announce() {},
        setAnswers() {},
        updateHud() {}
    };
    game._speech = { speak() {} };
    game._currentRoom = {};
    game._syncScene = () => {};
    game.presentProblem = () => {};
    game._finishMonsterStep = () => {};
    return game;
}

{
    const game = new MathMarauder.Game();
    const spoken = [];
    game._speech = { speak: (text) => spoken.push(text) };
    game._narrateSpell('starbolt');
    game._narrateSpell('dragon-guard');
    game._narrateSpell('mirror-spark');
    game._narrateSpell('time-gem');
    assert.deepStrictEqual(spoken, [
        'Starbolt surge.',
        'Dragon Guard shield.',
        'Mirror Spark hint.',
        'Time Gem phase shift.'
    ]);
    assert.strictEqual(game._joinSpeech(game._spellNarrationText('mirror-spark'), 'Try again.'), 'Mirror Spark hint. Try again.');
}

{
    const game = stubGameForAnswer();
    const calls = [];
    game._audio = {
        playCorrect: () => calls.push('correct'),
        playWrong: () => calls.push('wrong'),
        playHit: () => calls.push('hit')
    };
    MathMarauder.GameRules = {
        resolveAnswer: () => ({
            hearts: 3,
            shields: 1,
            streak: 1,
            promptsAnswered: 1,
            correctFirstTry: 1,
            longestStreak: 1,
            monsterHp: 1
        })
    };
    game.handleAnswer(12, 0);
    assert.deepStrictEqual(calls, ['correct']);
}

{
    const game = stubGameForAnswer();
    const calls = [];
    game._audio = {
        playCorrect: () => calls.push('correct'),
        playWrong: () => calls.push('wrong'),
        playHit: () => calls.push('hit')
    };
    MathMarauder.GameRules = {
        resolveAnswer: () => ({
            hearts: 3,
            shields: 0,
            streak: 0,
            promptsAnswered: 1,
            correctFirstTry: 0,
            longestStreak: 0,
            monsterHp: 1,
            spellTriggered: 'mirror-spark',
            hintText: ''
        })
    };
    game.handleAnswer(10, 0);
    assert.deepStrictEqual(calls, ['wrong']);
}

{
    const game = stubGameForAnswer();
    const calls = [];
    game._audio = {
        playCorrect: () => calls.push('correct'),
        playWrong: () => calls.push('wrong'),
        playHit: () => calls.push('hit')
    };
    MathMarauder.GameRules = {
        resolveAnswer: () => ({
            hearts: 3,
            shields: 1,
            streak: 3,
            promptsAnswered: 1,
            correctFirstTry: 1,
            longestStreak: 3,
            monsterHp: 1,
            spellTriggered: 'starbolt'
        })
    };
    game.handleAnswer(12, 0);
    assert.deepStrictEqual(calls, ['correct', 'hit']);
}


{
    const game = new MathMarauder.Game();
    const musicCalls = [];
    game._save = {
        settings: {
            sfx: true,
            music: true,
            speech: true,
            reducedMotion: false
        }
    };
    game._audio = {
        setMuted() {},
        setMusicEnabled: (enabled, startNow) => musicCalls.push([enabled, startNow])
    };
    game._speech = { setEnabled() {} };
    game._ui = { applySettings() {} };
    game._saveManager = { save() {} };
    game._applySettings();
    assert.deepStrictEqual(musicCalls, [[true, false]]);

    elements['setting-music'].checked = false;
    game._saveSettingsFromControls();
    assert.deepStrictEqual(musicCalls, [[true, false], [false, true]]);
}

global.document = originalDocument;
global.MathMarauder = originalMathMarauder;
