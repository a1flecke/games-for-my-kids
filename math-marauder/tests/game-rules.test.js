const assert = require('assert');
const GameRules = require('../js/game-rules.js');

{
    const quick = GameRules.createRaidState('quick');
    assert.strictEqual(quick.mode, 'quick');
    assert.strictEqual(quick.rooms.length, 3);
    assert.deepStrictEqual(quick.rooms.map((room) => room.promptTarget), [6, 7, 8]);
    assert.strictEqual(quick.hearts, 3);
    assert.strictEqual(quick.shields, 1);
}

{
    const standard = GameRules.createRaidState('standard');
    assert.strictEqual(standard.mode, 'standard');
    assert.strictEqual(standard.rooms.length, 5);
    assert.deepStrictEqual(standard.rooms.map((room) => room.promptTarget), [7, 8, 8, 9, 10]);
    assert.strictEqual(standard.rooms[4].bossPhaseCount, 4);
}

{
    const state = GameRules.createEncounterState({ monsterId: 'ember-imp', hp: 3, damage: 1, promptTarget: 6 });
    assert.strictEqual(state.promptsRemaining, 6);
    const afterCorrect = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
    assert.strictEqual(afterCorrect.promptsRemaining, 5);
    assert.strictEqual(afterCorrect.roomComplete, false);
    assert.strictEqual(afterCorrect.streak, 1);
    assert.strictEqual(afterCorrect.feedbackKind, 'correct');
}

{
    let state = GameRules.createEncounterState({ monsterId: 'factor-dragon', hp: 9, damage: 2, promptTarget: 10, bossPhaseCount: 4 });
    const phaseTargets = [];
    for (let phase = 1; phase <= 4; phase += 1) {
        phaseTargets.push(state.phaseTarget);
        while (!state.phaseComplete && !state.roomComplete) {
            state = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
        }
        if (!state.roomComplete) state = GameRules.advanceEncounterPhase(state);
    }
    assert.deepStrictEqual(phaseTargets, [3, 3, 2, 2]);
    assert.strictEqual(state.roomCorrectAnswers, 10);
    assert.strictEqual(state.roomComplete, true);
}

{
    const state = GameRules.createEncounterState({ monsterId: 'split-slime', hp: 4, damage: 1, promptTarget: 6 });
    const afterWrong = GameRules.resolveAnswer(state, { correct: false, firstTry: false });
    assert.strictEqual(afterWrong.hearts, 3);
    assert.strictEqual(afterWrong.shields, 0);
    assert.strictEqual(afterWrong.feedbackKind, 'try-again');
    const afterSecondWrong = GameRules.resolveAnswer(afterWrong, { correct: false, firstTry: false });
    assert.strictEqual(afterSecondWrong.hearts, 2);
    assert.ok(afterSecondWrong.hintText.includes('Think'));
}

{
    const state = GameRules.createEncounterState({ monsterId: 'rune-knight', hp: 4, damage: 2, promptTarget: 6 });
    state.hearts = 1;
    state.shields = 0;
    const retreat = GameRules.resolveAnswer(state, { correct: false, firstTry: false });
    assert.strictEqual(retreat.recoveryMode, 'retreat');
    assert.strictEqual(retreat.hearts, 1);
    assert.strictEqual(retreat.keepsProgress, true);
    assert.ok(retreat.feedbackText.includes('Regroup'));
}

{
    let state = GameRules.createEncounterState({ monsterId: 'ember-imp', hp: 3, damage: 1, promptTarget: 6 });
    state = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
    state = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
    state = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
    assert.strictEqual(state.spellTriggered, 'starbolt');
    assert.ok(state.feedbackText.includes('Starbolt'));
}

{
    let state = GameRules.createEncounterState({ monsterId: 'ember-imp', hp: 3, damage: 1, promptTarget: 8 });
    for (let i = 0; i < 5; i += 1) {
        state = GameRules.resolveAnswer(state, { correct: true, firstTry: true });
    }
    assert.strictEqual(state.spellTriggered, 'dragon-guard');
    assert.ok(state.shields >= 2);
}
