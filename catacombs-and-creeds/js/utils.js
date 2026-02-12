/**
 * utils.js - Shared utility functions
 */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function worldToGrid(px, tileSize) {
    return Math.floor(px / tileSize);
}

function gridToWorld(tile, tileSize) {
    return tile * tileSize + tileSize / 2;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aabbCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}
