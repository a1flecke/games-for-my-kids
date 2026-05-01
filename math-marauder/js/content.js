(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Content = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildContent() {
    const biomes = [
        { id: 'ember-library', name: 'Ember Library', palette: ['#351f47', '#f26d3d', '#ffd166'], description: 'Floating books and firelight runes.' },
        { id: 'moonlit-catacombs', name: 'Moonlit Catacombs', palette: ['#14213d', '#6a8dff', '#d8e2dc'], description: 'Crystal halls under a blue moon.' },
        { id: 'dragon-asteroid-belt', name: 'Dragon Asteroid Belt', palette: ['#111827', '#7dd3fc', '#f59e0b'], description: 'Comets, star cannons, and wingbeats.' },
        { id: 'slime-foundry', name: 'Slime Foundry', palette: ['#12372a', '#4ade80', '#facc15'], description: 'Gears churn through potion steam.' },
        { id: 'void-reef', name: 'Void Reef', palette: ['#20113a', '#38bdf8', '#f0abfc'], description: 'Gravity bubbles and shadow coral.' },
        { id: 'final-fortress', name: 'Final Fortress', palette: ['#2c2416', '#ef4444', '#f5f0e8'], description: 'A spell fortress at the edge of numbers.' }
    ];

    const monsters = [
        { id: 'ember-imp', name: 'Ember Imp', mathFocus: 'Mixed multiplication', trait: 'Small, quick, and easy to defeat with a short streak.' },
        { id: 'split-slime', name: 'Split Slime', mathFocus: 'Clean division', trait: 'Splits when division facts land cleanly.' },
        { id: 'rune-knight', name: 'Rune Knight', mathFocus: 'Inverse facts', trait: 'Shield breaks after paired multiplication and division.' },
        { id: 'mirror-mage', name: 'Mirror Mage', mathFocus: 'Commutative multiplication', trait: 'Flips factors to show matching products.' },
        { id: 'crystal-golem', name: 'Crystal Golem', mathFocus: '11s and 12s', trait: 'Slow, tough, and worth bigger rewards.' },
        { id: 'star-wyvern', name: 'Star Wyvern', mathFocus: 'Mixed operations', trait: 'Answer runes drift unless reduced motion is on.' },
        { id: 'void-wraith', name: 'Void Wraith', mathFocus: 'Weak facts', trait: 'Pulls practice from facts that need a comeback.' },
        { id: 'factor-dragon', name: 'Factor Dragon', mathFocus: 'Boss mixed finale', trait: 'Four phases of multiply, divide, missing factor, and mixed facts.' }
    ];

    const spells = [
        { id: 'starbolt', name: 'Starbolt', trigger: 'Three correct answers', description: 'A bright hit that deals extra damage.' },
        { id: 'mirror-spark', name: 'Mirror Spark', trigger: 'One wrong answer', description: 'Removes one wrong rune after a stumble.' },
        { id: 'dragon-guard', name: 'Dragon Guard', trigger: 'Five answer streak', description: 'Blocks the next monster hit.' },
        { id: 'time-gem', name: 'Time Gem', trigger: 'Boss phase', description: 'Slows rune movement without showing a timer.' }
    ];

    const raidModes = {
        quick: {
            label: 'Quick Raid',
            rooms: [
                { biomeId: 'ember-library', monsterId: 'ember-imp', hp: 3, damage: 1, promptTarget: 6, operations: ['multiply', 'divide'], band: 'warm' },
                { biomeId: 'slime-foundry', monsterId: 'split-slime', hp: 4, damage: 1, promptTarget: 7, operations: ['divide', 'multiply'], band: 'deep' },
                { biomeId: 'moonlit-catacombs', monsterId: 'rune-knight', hp: 5, damage: 1, promptTarget: 8, operations: ['multiply', 'divide', 'missing'], band: 'inverse', bossPhaseCount: 2 }
            ]
        },
        standard: {
            label: 'Standard Raid',
            rooms: [
                { biomeId: 'ember-library', monsterId: 'mirror-mage', hp: 4, damage: 1, promptTarget: 7, operations: ['multiply'], band: 'warm' },
                { biomeId: 'slime-foundry', monsterId: 'split-slime', hp: 5, damage: 1, promptTarget: 8, operations: ['divide'], band: 'deep' },
                { biomeId: 'dragon-asteroid-belt', monsterId: 'star-wyvern', hp: 5, damage: 1, promptTarget: 8, operations: ['multiply', 'divide'], band: 'deep' },
                { biomeId: 'void-reef', monsterId: 'void-wraith', hp: 6, damage: 1, promptTarget: 9, operations: ['multiply', 'divide', 'missing'], band: 'inverse' },
                { biomeId: 'final-fortress', monsterId: 'factor-dragon', hp: 9, damage: 2, promptTarget: 10, operations: ['multiply', 'divide', 'missing'], band: 'boss', bossPhaseCount: 4 }
            ]
        }
    };

    const dialogue = [
        { id: 'title-intro', speaker: 'Captain Nova', mood: 'bold', caption: 'The monster realms are stirring. Choose a raid and charge the runes.', voiceText: 'The monster realms are stirring. Choose a raid and charge the runes.' },
        { id: 'first-room', speaker: 'Captain Nova', mood: 'warm', caption: 'Pick the answer rune. A correct fact fires your spell.', voiceText: 'Pick the answer rune. A correct fact fires your spell.' },
        { id: 'wrong-answer-hint', speaker: 'Rune Compass', mood: 'steady', caption: 'Try the matching factor family. The right rune is still here.', voiceText: 'Try the matching factor family. The right rune is still here.' },
        { id: 'division-room', speaker: 'Split Slime', mood: 'squishy', caption: 'Divide me into equal groups, and I split apart.', voiceText: 'Divide me into equal groups, and I split apart.' },
        { id: 'mini-boss', speaker: 'Rune Knight', mood: 'firm', caption: 'My shield cracks when multiplication and division match.', voiceText: 'My shield cracks when multiplication and division match.' },
        { id: 'boss-intro', speaker: 'Factor Dragon', mood: 'huge', caption: 'Show me products, quotients, and missing factors.', voiceText: 'Show me products, quotients, and missing factors.' },
        { id: 'victory', speaker: 'Captain Nova', mood: 'happy', caption: 'Raid complete. Your best facts powered the final spell.', voiceText: 'Raid complete. Your best facts powered the final spell.' },
        { id: 'settings-speech', speaker: 'Guide', mood: 'calm', caption: 'Narration can read story panels aloud whenever you want.', voiceText: 'Narration can read story panels aloud whenever you want.' },
        { id: 'reduced-motion', speaker: 'Guide', mood: 'calm', caption: 'Reduced motion keeps the magic bright but steadier.', voiceText: 'Reduced motion keeps the magic bright but steadier.' },
        { id: 'practice-unlock', speaker: 'Forge Wizard', mood: 'sparkly', caption: 'Practice Forge is open. Choose one fact family for a short run.', voiceText: 'Practice Forge is open. Choose one fact family for a short run.' },
        { id: 'retreat', speaker: 'Captain Nova', mood: 'kind', caption: 'Regroup at the campfire. Your coins and practice stay saved.', voiceText: 'Regroup at the campfire. Your coins and practice stay saved.' }
    ];

    return { biomes, monsters, spells, raidModes, dialogue };
});
