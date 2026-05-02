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
