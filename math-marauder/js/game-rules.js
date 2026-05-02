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

    function phasePromptCount(promptTarget, phaseCount, phaseIndex) {
        const base = Math.floor(promptTarget / phaseCount);
        const extra = promptTarget % phaseCount;
        return Math.max(1, base + (phaseIndex <= extra ? 1 : 0));
    }

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
        const promptTarget = Math.max(1, room.promptTarget || room.hp || 1);
        const phaseCount = Math.max(1, room.bossPhaseCount || 1);
        const phaseTarget = phasePromptCount(promptTarget, phaseCount, 1);
        return Object.assign(createRaidState('quick'), {
            monsterId: room.monsterId,
            monsterHp: phaseTarget,
            monsterMaxHp: phaseTarget,
            monsterDamage: room.damage,
            promptTarget,
            promptsRemaining: promptTarget,
            roomCorrectAnswers: 0,
            phaseIndex: 1,
            phaseCount,
            phaseTarget,
            phaseProgress: 0,
            wrongAttemptsOnPrompt: 0
        });
    }

    function resolveAnswer(state, answer) {
        const next = Object.assign({}, state);
        next.phaseComplete = false;
        next.roomComplete = false;
        next.spellTriggered = '';
        next.promptsAnswered += 1;
        if (answer.correct) {
            next.streak += 1;
            next.longestStreak = Math.max(next.longestStreak, next.streak);
            if (answer.firstTry) next.correctFirstTry += 1;
            next.wrongAttemptsOnPrompt = 0;
            next.roomCorrectAnswers = (next.roomCorrectAnswers || 0) + 1;
            next.promptsRemaining = Math.max(0, next.promptTarget - next.roomCorrectAnswers);
            next.phaseProgress = (next.phaseProgress || 0) + 1;
            next.monsterHp = Math.max(0, (next.phaseTarget || 1) - next.phaseProgress);
            if (next.streak > 0 && next.streak % 5 === 0) {
                next.shields += 1;
                next.spellTriggered = 'dragon-guard';
            } else if (next.streak > 0 && next.streak % 3 === 0) {
                next.spellTriggered = 'starbolt';
            }
            if (next.promptsRemaining <= 0) {
                next.roomComplete = true;
                next.monsterHp = 0;
            } else if (next.phaseProgress >= next.phaseTarget) {
                next.phaseComplete = true;
                next.monsterHp = 0;
            }
            next.feedbackKind = 'correct';
            next.feedbackText = spellText(next.spellTriggered) || 'Spell hit!';
            return next;
        }

        next.streak = 0;
        next.wrongAttemptsOnPrompt += 1;
        next.spellTriggered = 'mirror-spark';
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
        next.feedbackText = 'Mirror Spark reveals the field. Try again.';
        next.hintText = next.wrongAttemptsOnPrompt >= 2 ? 'Think about the matching factor family.' : '';
        return next;
    }

    function advanceEncounterPhase(state) {
        const next = Object.assign({}, state);
        if (next.roomComplete) return next;
        next.phaseIndex = Math.min((next.phaseIndex || 1) + 1, next.phaseCount || 1);
        next.phaseTarget = phasePromptCount(next.promptTarget, next.phaseCount || 1, next.phaseIndex);
        next.phaseProgress = 0;
        next.phaseComplete = false;
        next.monsterMaxHp = next.phaseTarget;
        next.monsterHp = next.phaseTarget;
        next.spellTriggered = 'time-gem';
        next.feedbackText = 'Time Gem steadies the next phase.';
        return next;
    }

    function spellText(spellId) {
        return {
            'starbolt': 'Starbolt surge!',
            'dragon-guard': 'Dragon Guard recharged a shield.'
        }[spellId] || '';
    }

    return { RAID_MODES, createRaidState, createEncounterState, resolveAnswer, advanceEncounterPhase };
});
