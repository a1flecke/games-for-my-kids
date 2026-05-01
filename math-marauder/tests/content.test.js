const assert = require('assert');
const content = require('../js/content.js');

assert.ok(content.biomes.length >= 6);
assert.ok(content.monsters.length >= 8);
assert.ok(content.spells.length >= 4);
assert.ok(content.raidModes.quick.rooms.length === 3);
assert.ok(content.raidModes.standard.rooms.length === 5);
assert.deepStrictEqual(content.raidModes.quick.rooms.map((room) => room.promptTarget), [6, 7, 8]);
assert.deepStrictEqual(content.raidModes.standard.rooms.map((room) => room.promptTarget), [7, 8, 8, 9, 10]);

for (const biome of content.biomes) {
    assert.ok(biome.id);
    assert.ok(biome.name);
    assert.ok(biome.palette);
}

for (const monster of content.monsters) {
    assert.ok(monster.id);
    assert.ok(monster.name);
    assert.ok(monster.mathFocus);
    assert.ok(monster.trait);
}

for (const line of content.dialogue) {
    assert.ok(line.id);
    assert.ok(line.speaker);
    assert.ok(line.caption);
    assert.ok(line.voiceText);
    assert.ok(line.caption.length <= 120, `caption too long: ${line.id}`);
    assert.ok(line.voiceText.length <= 180, `voice text too long: ${line.id}`);
}

for (const mode of Object.values(content.raidModes)) {
    for (const room of mode.rooms) {
        assert.ok(room.biomeId);
        assert.ok(room.monsterId);
        assert.ok(room.hp >= 3);
        assert.ok(room.damage >= 1 && room.damage <= 2);
        assert.ok(room.promptTarget >= 6 && room.promptTarget <= 10);
        assert.ok(room.operations.includes('multiply') || room.operations.includes('divide') || room.operations.includes('missing'));
    }
}
