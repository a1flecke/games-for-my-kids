(function attach(root) {
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Constants = {
        STORAGE_KEY: 'math-marauder-save',
        STATES: {
            TITLE: 'TITLE',
            MAP: 'MAP',
            DIALOGUE: 'DIALOGUE',
            RAID: 'RAID',
            ROOM_REWARD: 'ROOM_REWARD',
            PAUSED: 'PAUSED',
            RESULTS: 'RESULTS',
            SETTINGS: 'SETTINGS'
        },
        FACTOR_MIN: 0,
        FACTOR_MAX: 12,
        PRODUCT_MAX: 144
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
