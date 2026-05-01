const assert = require('assert');
const SaveManager = require('../js/save.js');

function storage() {
    const data = {};
    return {
        getItem: (key) => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
        setItem: (key, value) => { data[key] = String(value); },
        removeItem: (key) => { delete data[key]; }
    };
}

{
    const manager = new SaveManager(storage());
    const defaults = manager.defaults();
    assert.strictEqual(defaults.version, 1);
    assert.strictEqual(defaults.standardRaidsCompleted, 0);
    assert.strictEqual(defaults.coins, 0);
    assert.deepStrictEqual(defaults.unlockedBiomes, ['ember-library']);
    assert.deepStrictEqual(defaults.unlockedSpells, ['starbolt']);
    assert.strictEqual(defaults.settings.speech, true);
    assert.strictEqual(defaults.settings.music, false);
    assert.ok(defaults.stats);
}

{
    const fake = storage();
    fake.setItem('math-marauder-save', '{bad json');
    const manager = new SaveManager(fake);
    const loaded = manager.load();
    assert.strictEqual(loaded.version, 1);
    assert.strictEqual(loaded.raidsCompleted, 0);
}

{
    const fake = storage();
    const manager = new SaveManager(fake);
    const save = manager.defaults();
    save.raidsCompleted = 2;
    save.factMastery['mul:7:8'] = 4;
    manager.save(save);
    const loaded = manager.load();
    assert.strictEqual(loaded.raidsCompleted, 2);
    assert.strictEqual(loaded.factMastery['mul:7:8'], 4);
}
