/**
 * NPC - Non-player character entity
 *
 * Simple entities with position, name, and dialogue reference.
 * No animation or patrol — just static characters on the map.
 * NPCs block movement (they are solid).
 */
class NPC {
    /**
     * @param {Object} data - NPC data from level JSON
     * @param {string} data.id - Unique identifier
     * @param {string} data.name - Display name
     * @param {number} data.x - Grid X position
     * @param {number} data.y - Grid Y position
     * @param {string} data.direction - Facing direction ('up','down','left','right')
     * @param {string} data.dialogueId - ID for dialogue lookup
     * @param {string} data.portrait - Portrait identifier for dialogue box
     * @param {string} [data.color] - Optional display color override
     */
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.direction = data.direction || 'down';
        this.dialogueId = data.dialogueId || null;
        this.portrait = data.portrait || null;
        this.color = data.color || null;

        // Convert grid position to pixel position (center of tile)
        this.gridX = data.x;
        this.gridY = data.y;
        this.x = gridToWorld(data.x, CONFIG.TILE_SIZE);
        this.y = gridToWorld(data.y, CONFIG.TILE_SIZE);

        // Interaction tracking
        this.hasBeenTalkedTo = false;

        // Size for rendering and collision
        this.size = CONFIG.TILE_SIZE;
    }

    /**
     * Check if the player is within interaction range (1 tile).
     * @param {Player} player
     * @returns {boolean}
     */
    isPlayerInRange(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= CONFIG.TILE_SIZE * 1.5;
    }

    /**
     * Called when the player interacts with this NPC.
     * Returns dialogue info for the dialogue system.
     */
    interact() {
        this.hasBeenTalkedTo = true;
        console.log(`Talking to ${this.name} (dialogue: ${this.dialogueId})`);
        return {
            type: 'npc_dialogue',
            npcId: this.id,
            npcName: this.name,
            dialogueId: this.dialogueId,
            portrait: this.portrait
        };
    }

    /**
     * Get tile position.
     */
    getTilePosition() {
        return { x: this.gridX, y: this.gridY };
    }
}
