(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.GameRules = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildGameRules() {
    const RAID_MODES = {
        quick: {
            rooms: [
                { biomeId: 'ember-library', monsterId: 'ember-imp', hp: 3, damage: 1, promptTarget: 6, operations: ['multiply', 'divide'], band: 'warm' },
                { biomeId: 'slime-foundry', monsterId: 'split-slime', hp: 4, damage: 1, promptTarget: 7, operations: ['divide', 'multiply'], band: 'deep' },
                { biomeId: 'moonlit-catacombs', monsterId: 'rune-knight', hp: 5, damage: 1, promptTarget: 8, operations: ['multiply', 'divide', 'missing'], band: 'inverse', bossPhaseCount: 2 }
            ]
        },
        standard: {
            rooms: [
                { biomeId: 'ember-library', monsterId: 'mirror-mage', hp: 4, damage: 1, promptTarget: 7, operations: ['multiply'], band: 'warm' },
                { biomeId: 'slime-foundry', monsterId: 'split-slime', hp: 5, damage: 1, promptTarget: 8, operations: ['divide'], band: 'deep' },
                { biomeId: 'dragon-asteroid-belt', monsterId: 'star-wyvern', hp: 5, damage: 1, promptTarget: 8, operations: ['multiply', 'divide'], band: 'deep' },
                { biomeId: 'void-reef', monsterId: 'void-wraith', hp: 6, damage: 1, promptTarget: 9, operations: ['multiply', 'divide', 'missing'], band: 'inverse' },
                { biomeId: 'final-fortress', monsterId: 'factor-dragon', hp: 9, damage: 2, promptTarget: 10, operations: ['multiply', 'divide', 'missing'], band: 'boss', bossPhaseCount: 4 }
            ]
        }
    };

    function createRaidState(mode) {
        const resolvedMode = mode || 'quick';
        const config = RAID_MODES[resolvedMode] || RAID_MODES.quick;
        return {
            mode: resolvedMode,
            roomIndex: 0,
            hearts: 3,
            shields: 1,
            streak: 0,
            coins: 0,
            promptsAnswered: 0,
            correctFirstTry: 0,
            longestStreak: 0,
            rooms: config.rooms.map((room) => Object.assign({}, room))
        };
    }

    function createEncounterState(room) {
        return Object.assign(createRaidState('quick'), {
            monsterId: room.monsterId,
            monsterHp: room.hp,
            monsterMaxHp: room.hp,
            monsterDamage: room.damage,
            promptTarget: room.promptTarget,
            wrongAttemptsOnPrompt: 0
        });
    }

    function resolveAnswer(state, answer) {
        const next = Object.assign({}, state);
        next.promptsAnswered += 1;
        if (answer.correct) {
            next.monsterHp = Math.max(0, next.monsterHp - 1);
            next.streak += 1;
            next.longestStreak = Math.max(next.longestStreak, next.streak);
            if (answer.firstTry) next.correctFirstTry += 1;
            next.wrongAttemptsOnPrompt = 0;
            next.feedbackKind = 'correct';
            next.feedbackText = 'Spell hit!';
            return next;
        }

        next.streak = 0;
        next.wrongAttemptsOnPrompt += 1;
        if (next.shields > 0) next.shields -= 1;
        else next.hearts -= next.monsterDamage;

        if (next.hearts <= 0) {
            next.hearts = 1;
            next.shields = 0;
            next.recoveryMode = 'retreat';
            next.keepsProgress = true;
            next.feedbackKind = 'regroup';
            next.feedbackText = 'Regroup at the campfire. Your coins and practice stay saved.';
            return next;
        }

        next.feedbackKind = 'try-again';
        next.feedbackText = 'Try again.';
        next.hintText = next.wrongAttemptsOnPrompt >= 2 ? 'Think about the matching factor family.' : '';
        return next;
    }

    return { RAID_MODES, createRaidState, createEncounterState, resolveAnswer };
});
