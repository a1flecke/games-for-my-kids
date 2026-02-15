/**
 * config.js - Central constants and configuration
 */

const GameState = Object.freeze({
    LOADING:   'LOADING',
    TITLE:     'TITLE',
    PLAYING:   'PLAYING',
    DIALOGUE:  'DIALOGUE',
    COMBAT:    'COMBAT',
    INVENTORY: 'INVENTORY',
    PAUSED:    'PAUSED',
    SETTINGS:  'SETTINGS',
    SAVE_SLOTS: 'SAVE_SLOTS', // Save slot picker for manual saves
    LOAD_SLOTS: 'LOAD_SLOTS', // Save slot picker for loading
    PUZZLE:    'PUZZLE',
    VICTORY:   'VICTORY',
    GAME_COMPLETE: 'GAME_COMPLETE'
});

const CONFIG = Object.freeze({
    // Canvas
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,

    // Tiles
    TILE_SIZE: 32,

    // Player
    PLAYER_SPEED: 2,
    PLAYER_SIZE: 24,

    // Timing
    AUTO_SAVE_INTERVAL: 120000, // 2 minutes
    TYPEWRITER_SPEED: 30,

    // Dialogue
    MAX_WORDS_PER_BOX: 15,

    // Colors - from plan Section 6.2 (mutable for colorblind mode)
    COLORS: {
        // Tile colors
        floor: '#8b7355',
        wall: '#4a4a4a',
        wallTop: '#6b6b6b',
        wallShadow: '#1a1a1a',
        door: '#d4af37',
        water: '#4a7c9b',
        grass: '#6b8e23',

        // Character colors
        player: '#4a6fa5',
        playerOutline: '#3a5a8a',
        enemy: '#a64253',
        npc: '#8b7355',

        // UI colors
        background: '#0f0f1e',
        uiBorder: '#8b4513',
        success: '#4a7c59',
        danger: '#a64253',
        warning: '#d4a017',
        info: '#4a6fa5',
        highlight: '#ff6b6b',
        accent1: '#4ecdc4',
        accent2: '#95e1d3'
    },

    // Default (non-colorblind) colors for restoring
    _DEFAULT_COLORS: Object.freeze({
        success: '#4a7c59',
        danger: '#a64253',
        enemy: '#a64253',
        highlight: '#ff6b6b'
    }),

    // Colorblind-safe palette (blue/orange swap for red/green)
    _COLORBLIND_COLORS: Object.freeze({
        success: '#4a7ca5',
        danger: '#cc6600',
        enemy: '#cc6600',
        highlight: '#ff9933'
    }),

    // Accessibility / Dyslexia-friendly defaults (mutable for text size)
    ACCESSIBILITY: {
        fontFamily: "'OpenDyslexic', 'Comic Sans MS', cursive",
        fontSize: 16,
        lineHeight: 1.5,
        bgColor: '#F5F0E8',
        textColor: '#2C2416'
    }
});
