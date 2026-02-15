/**
 * TileMap - Data-driven tile map with collision and interaction
 *
 * Tile types:
 *   0 = FLOOR   - walkable
 *   1 = WALL    - solid, blocks movement
 *   2 = DOOR    - interactable, can be open/closed/locked
 *   3 = CHEST   - interactable, can be opened for loot
 *   4 = ALTAR   - interactable, save checkpoint
 *   5 = TORCH   - decorative wall torch (solid like wall)
 *   6 = WATER   - blocks movement, decorative
 *   7 = STAIRS  - walkable, triggers level transition
 */

const TileType = Object.freeze({
    FLOOR:  0,
    WALL:   1,
    DOOR:   2,
    CHEST:  3,
    ALTAR:  4,
    TORCH:  5,
    WATER:  6,
    STAIRS: 7,
    HIDING: 8,     // Alcove / hiding spot — walkable, hides player from guard vision cones
    BOOKSHELF: 9,  // Decorative bookshelf — solid, used in library level
    HIDDEN_WALL: 10, // Wall that can be revealed by Augustine's Wisdom ability
    LATIN_TILE: 11,  // Floor tile with Latin inscription, interactable with Jerome's Translation
    BARRIER: 12,     // Destructible barrier, breakable with Ambrose's Courage
    MARBLE: 13,      // Bright marble floor — walkable, palace/surface aesthetic
    PILLAR: 14       // Gold/marble pillar — solid, decorative palace element
});

class TileMap {
    /**
     * @param {Object} levelData - Parsed JSON level data with tiles, width, height, etc.
     */
    constructor(levelData) {
        this.width = levelData.width;
        this.height = levelData.height;
        this.name = levelData.name || 'Unknown';

        // Build 2D tile array from flat array
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = levelData.tiles[y * this.width + x];
            }
        }

        // Per-tile state for interactive tiles, keyed by "x,y"
        // e.g. { "5,3": { open: false, locked: true } }
        this.tileState = {};

        // Track tiles modified at runtime (revealed walls, broken barriers)
        // Array of {x, y, newType} — replayed on save/load
        this.modifiedTiles = [];

        // Initialize interactive tile state from level metadata
        this.initTileState(levelData.tileMetadata || []);
    }

    /**
     * Initialize per-tile state from level metadata.
     * @param {Array} metadata - [{x, y, locked, contents, ...}]
     */
    initTileState(metadata) {
        for (const entry of metadata) {
            const key = `${entry.x},${entry.y}`;
            this.tileState[key] = { ...entry, open: false };
        }

        // Ensure all interactive tiles have state even if not in metadata
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                const key = `${x},${y}`;
                if (this.isInteractableTile(tile) && !this.tileState[key]) {
                    this.tileState[key] = { x, y, open: false, locked: false };
                }
            }
        }
    }

    /**
     * Get tile type at grid coordinates.
     * Out of bounds returns WALL.
     */
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return TileType.WALL;
        }
        return this.tiles[y][x];
    }

    /**
     * Get tile state for an interactive tile.
     * @returns {Object|null}
     */
    getTileState(x, y) {
        return this.tileState[`${x},${y}`] || null;
    }

    /**
     * Check if a tile type is solid (blocks movement).
     */
    isSolid(x, y) {
        const tile = this.getTile(x, y);
        switch (tile) {
            case TileType.WALL:
            case TileType.TORCH:
            case TileType.WATER:
            case TileType.BOOKSHELF:
            case TileType.HIDDEN_WALL:
            case TileType.BARRIER:
            case TileType.PILLAR:
                return true;
            case TileType.DOOR: {
                // Locked or closed doors are solid
                const state = this.getTileState(x, y);
                return state ? !state.open : false;
            }
            case TileType.CHEST: {
                // Chests are solid (can't walk through them)
                return true;
            }
            default:
                return false;
        }
    }

    /**
     * Check if a tile is walkable (not solid).
     */
    isWalkable(x, y) {
        return !this.isSolid(x, y);
    }

    /**
     * Check if a rectangular pixel area is walkable.
     * Used for player collision detection.
     */
    isAreaWalkable(x, y, width, height) {
        const tileSize = CONFIG.TILE_SIZE;
        const left = Math.floor(x / tileSize);
        const right = Math.floor((x + width - 1) / tileSize);
        const top = Math.floor(y / tileSize);
        const bottom = Math.floor((y + height - 1) / tileSize);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (!this.isWalkable(tx, ty)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Check if a tile is walkable considering NPC positions.
     * NPCs block movement like walls.
     */
    isAreaWalkableWithNPCs(x, y, width, height, npcs) {
        // First check tile walkability
        if (!this.isAreaWalkable(x, y, width, height)) {
            return false;
        }

        // Then check NPC collision
        if (npcs) {
            for (const npc of npcs) {
                const npcHalf = CONFIG.TILE_SIZE / 2;
                if (aabbCollision(
                    { x: x, y: y, width: width, height: height },
                    { x: npc.x - npcHalf, y: npc.y - npcHalf, width: CONFIG.TILE_SIZE, height: CONFIG.TILE_SIZE }
                )) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if a tile type is interactable.
     */
    isInteractableTile(tileType) {
        return tileType === TileType.DOOR ||
               tileType === TileType.CHEST ||
               tileType === TileType.ALTAR ||
               tileType === TileType.STAIRS ||
               tileType === TileType.HIDDEN_WALL ||
               tileType === TileType.LATIN_TILE ||
               tileType === TileType.BARRIER;
    }

    /**
     * Check if the tile at grid position is interactable.
     */
    isInteractable(x, y) {
        return this.isInteractableTile(this.getTile(x, y));
    }

    /**
     * Interact with a tile. Returns a result object describing what happened.
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {Object|null} - { type, message } or null if not interactable
     */
    interact(x, y) {
        const tile = this.getTile(x, y);
        const state = this.getTileState(x, y);

        if (!state) return null;

        switch (tile) {
            case TileType.DOOR:
                return this.interactDoor(x, y, state);
            case TileType.CHEST:
                return this.interactChest(x, y, state);
            case TileType.ALTAR:
                return this.interactAltar(x, y, state);
            case TileType.STAIRS:
                return this.interactStairs(x, y, state);
            case TileType.HIDDEN_WALL:
                return { type: 'hidden_wall', x, y };
            case TileType.LATIN_TILE:
                return { type: 'latin_tile', x, y };
            case TileType.BARRIER:
                return { type: 'barrier', x, y };
            default:
                return null;
        }
    }

    interactDoor(x, y, state) {
        if (state.locked) {
            console.log(`Door at ${x},${y} is locked!`);
            return { type: 'door_locked', message: 'This door is locked.' };
        }
        if (state.open) {
            // Close the door
            state.open = false;
            console.log(`Door at ${x},${y} closed.`);
            return { type: 'door_closed', message: 'Door closed.' };
        }
        // Open the door
        state.open = true;
        console.log(`Door at ${x},${y} opened.`);
        return { type: 'door_opened', message: 'Door opened.' };
    }

    interactChest(x, y, state) {
        if (state.open) {
            console.log(`Chest at ${x},${y} is already open.`);
            return { type: 'chest_empty', message: 'This chest is empty.' };
        }
        state.open = true;
        const contents = state.contents || 'nothing';
        console.log(`Chest at ${x},${y} opened! Contains: ${contents}`);
        return { type: 'chest_opened', message: `Found: ${contents}`, contents: contents };
    }

    interactAltar(x, y, state) {
        console.log(`Save at altar ${x},${y}`);
        return { type: 'altar_save', message: 'Progress saved at the altar.' };
    }

    interactStairs(x, y, state) {
        const direction = state.direction || 'down';
        console.log(`Stairs at ${x},${y} going ${direction}`);
        return { type: 'stairs', message: `Stairs leading ${direction}.`, direction: direction };
    }

    /**
     * Reveal a hidden wall, turning it into a floor tile.
     */
    revealHiddenWall(x, y) {
        if (this.getTile(x, y) === TileType.HIDDEN_WALL) {
            this.tiles[y][x] = TileType.FLOOR;
            this.modifiedTiles.push({ x, y, newType: TileType.FLOOR });
            console.log(`Hidden wall at ${x},${y} revealed.`);
            return true;
        }
        return false;
    }

    /**
     * Break a barrier, turning it into a floor tile.
     */
    breakBarrier(x, y) {
        if (this.getTile(x, y) === TileType.BARRIER) {
            this.tiles[y][x] = TileType.FLOOR;
            this.modifiedTiles.push({ x, y, newType: TileType.FLOOR });
            console.log(`Barrier at ${x},${y} broken.`);
            return true;
        }
        return false;
    }

    /**
     * Replay tile modifications from save data.
     * @param {Array} modifications - [{x, y, newType}]
     */
    replayModifiedTiles(modifications) {
        if (!modifications) return;
        for (const mod of modifications) {
            if (mod.y >= 0 && mod.y < this.height && mod.x >= 0 && mod.x < this.width) {
                this.tiles[mod.y][mod.x] = mod.newType;
            }
        }
        this.modifiedTiles = [...modifications];
    }

    /**
     * Unlock a door at the given position.
     */
    unlockDoor(x, y) {
        const state = this.getTileState(x, y);
        if (state && this.getTile(x, y) === TileType.DOOR) {
            state.locked = false;
            console.log(`Door at ${x},${y} unlocked.`);
            return true;
        }
        return false;
    }
}
