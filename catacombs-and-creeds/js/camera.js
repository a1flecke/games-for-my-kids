/**
 * Camera - Handles viewport positioning and world/screen coordinate conversion
 *
 * Instant follow (no lerp), clamped to map bounds.
 * Extracted from Renderer so camera logic is self-contained.
 */
class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Update camera to follow a target, clamped to map pixel bounds.
     * @param {number} targetX - Target pixel X (e.g. player.x)
     * @param {number} targetY - Target pixel Y (e.g. player.y)
     * @param {number} mapPixelWidth - Map width in pixels (map.width * tileSize)
     * @param {number} mapPixelHeight - Map height in pixels (map.height * tileSize)
     */
    update(targetX, targetY, mapPixelWidth, mapPixelHeight) {
        // Center camera on target
        this.x = targetX - this.canvasWidth / 2;
        this.y = targetY - this.canvasHeight / 2;

        // Clamp to map bounds
        const maxX = mapPixelWidth - this.canvasWidth;
        const maxY = mapPixelHeight - this.canvasHeight;

        this.x = clamp(this.x, 0, Math.max(0, maxX));
        this.y = clamp(this.y, 0, Math.max(0, maxY));
    }

    /**
     * Convert world coordinates to screen coordinates.
     * @param {number} worldX
     * @param {number} worldY
     * @returns {{x: number, y: number}}
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * Convert screen coordinates to world coordinates.
     * @param {number} screenX
     * @param {number} screenY
     * @returns {{x: number, y: number}}
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    /**
     * Update canvas dimensions (e.g. on resize).
     */
    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
}
