/**
 * Renderer - Handles all tile-based drawing with retro pixel art aesthetic
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.tileSize = CONFIG.TILE_SIZE;

        // Use color palette from config
        this.colors = CONFIG.COLORS;

        // Camera position (in pixels)
        this.camera = {
            x: 0,
            y: 0
        };

        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;

        this.setupCanvas();
    }

    setupCanvas() {
        // Set canvas size for iPad landscape (responsive)
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;

        // Target base resolution, scaled to fit
        const baseWidth = CONFIG.CANVAS_WIDTH;
        const baseHeight = CONFIG.CANVAS_HEIGHT;

        const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight);

        this.canvas.width = baseWidth;
        this.canvas.height = baseHeight;
        this.canvas.style.width = `${baseWidth * scale}px`;
        this.canvas.style.height = `${baseHeight * scale}px`;

        this.viewportTilesX = Math.ceil(this.canvas.width / this.tileSize);
        this.viewportTilesY = Math.ceil(this.canvas.height / this.tileSize);
    }

    // Update camera to follow player instantly
    updateCamera(player, mapWidth, mapHeight) {
        // Center camera on player — instant, no lerp
        this.camera.x = player.x - this.canvas.width / 2;
        this.camera.y = player.y - this.canvas.height / 2;

        // Clamp camera to map bounds
        const maxCameraX = mapWidth * this.tileSize - this.canvas.width;
        const maxCameraY = mapHeight * this.tileSize - this.canvas.height;

        this.camera.x = clamp(this.camera.x, 0, maxCameraX);
        this.camera.y = clamp(this.camera.y, 0, maxCameraY);
    }

    // Clear the canvas
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw a tile at grid position
    drawTile(tileX, tileY, tileType) {
        const screenX = tileX * this.tileSize - this.camera.x;
        const screenY = tileY * this.tileSize - this.camera.y;

        // Cull off-screen tiles
        if (screenX + this.tileSize < 0 || screenX > this.canvas.width ||
            screenY + this.tileSize < 0 || screenY > this.canvas.height) {
            return;
        }

        switch (tileType) {
            case 0: // Floor
                this.drawFloor(screenX, screenY);
                break;
            case 1: // Wall
                this.drawWall(screenX, screenY);
                break;
        }
    }

    // Draw floor tile with subtle texture
    drawFloor(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Base floor
        ctx.fillStyle = this.colors.floor;
        ctx.fillRect(x, y, size, size);

        // Add subtle grid pattern
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        // Random subtle details (deterministic based on position)
        const seed = (x * 7 + y * 13) % 100;
        if (seed < 10) {
            ctx.fillStyle = '#333333';
            ctx.fillRect(x + size/2 - 2, y + size/2 - 2, 4, 4);
        }
    }

    // Draw wall tile with 3D effect
    drawWall(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Main wall body
        ctx.fillStyle = this.colors.wall;
        ctx.fillRect(x, y, size, size);

        // Top highlight (lighting effect)
        ctx.fillStyle = this.colors.wallTop;
        ctx.fillRect(x, y, size, size / 4);

        // Bottom shadow
        ctx.fillStyle = this.colors.wallShadow;
        ctx.fillRect(x, y + size * 3/4, size, size / 4);

        // Brick lines (horizontal)
        ctx.strokeStyle = this.colors.wallShadow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + size/2);
        ctx.lineTo(x + size, y + size/2);
        ctx.stroke();

        // Brick lines (vertical, offset)
        const offset = ((x / size) % 2 === 0) ? 0 : size / 2;
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset, y + size);
        ctx.stroke();

        // Outer border
        ctx.strokeStyle = this.colors.wallShadow;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
    }

    // Draw the player character
    drawPlayer(player) {
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;
        const size = player.size;

        const ctx = this.ctx;

        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + size - 4, size * 0.4, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player body (simple character sprite)
        ctx.fillStyle = this.colors.player;
        ctx.fillRect(screenX - size/2, screenY - size/2, size, size);

        // Player outline
        ctx.strokeStyle = this.colors.playerOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - size/2, screenY - size/2, size, size);

        // Simple face based on direction
        ctx.fillStyle = '#000000';
        const faceX = screenX - size/2;
        const faceY = screenY - size/2;

        switch (player.direction) {
            case 'up':
                // Eyes looking up
                ctx.fillRect(faceX + 6, faceY + 8, 4, 4);
                ctx.fillRect(faceX + 14, faceY + 8, 4, 4);
                break;
            case 'down':
                // Eyes looking down
                ctx.fillRect(faceX + 6, faceY + 12, 4, 4);
                ctx.fillRect(faceX + 14, faceY + 12, 4, 4);
                break;
            case 'left':
                // Eyes looking left
                ctx.fillRect(faceX + 4, faceY + 10, 4, 4);
                ctx.fillRect(faceX + 12, faceY + 10, 4, 4);
                break;
            case 'right':
                // Eyes looking right
                ctx.fillRect(faceX + 8, faceY + 10, 4, 4);
                ctx.fillRect(faceX + 16, faceY + 10, 4, 4);
                break;
        }
    }

    // Draw the entire map
    drawMap(map) {
        const startTileX = Math.floor(this.camera.x / this.tileSize);
        const startTileY = Math.floor(this.camera.y / this.tileSize);
        const endTileX = Math.min(startTileX + this.viewportTilesX + 1, map.width);
        const endTileY = Math.min(startTileY + this.viewportTilesY + 1, map.height);

        for (let y = Math.max(0, startTileY); y < endTileY; y++) {
            for (let x = Math.max(0, startTileX); x < endTileX; x++) {
                const tileType = map.getTile(x, y);
                this.drawTile(x, y, tileType);
            }
        }
    }

    // Main render method
    render(gameState) {
        this.clear();
        this.updateCamera(gameState.player, gameState.map.width, gameState.map.height);
        this.drawMap(gameState.map);
        this.drawPlayer(gameState.player);
    }
}
