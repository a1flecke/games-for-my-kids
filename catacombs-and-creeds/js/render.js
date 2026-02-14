/**
 * Renderer - Handles all tile-based drawing with retro pixel art aesthetic
 *
 * Uses Camera instance for viewport positioning.
 * Draws all tile types, NPCs, and interaction prompts.
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.tileSize = CONFIG.TILE_SIZE;

        // Use color palette from config
        this.colors = CONFIG.COLORS;

        // Camera — extracted to its own class
        this.camera = null; // Set after setupCanvas

        // Animation timers
        this.animTime = 0;

        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;

        this.setupCanvas();

        // Create camera after canvas dimensions are set
        this.camera = new Camera(this.canvas.width, this.canvas.height);
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

    // Clear the canvas
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw a tile at grid position
    drawTile(tileX, tileY, tileType, tileState) {
        const screenPos = this.camera.worldToScreen(
            tileX * this.tileSize,
            tileY * this.tileSize
        );
        const screenX = screenPos.x;
        const screenY = screenPos.y;

        // Cull off-screen tiles
        if (screenX + this.tileSize < 0 || screenX > this.canvas.width ||
            screenY + this.tileSize < 0 || screenY > this.canvas.height) {
            return;
        }

        switch (tileType) {
            case TileType.FLOOR:
                this.drawFloor(screenX, screenY);
                break;
            case TileType.WALL:
                this.drawWall(screenX, screenY);
                break;
            case TileType.DOOR:
                this.drawDoor(screenX, screenY, tileState);
                break;
            case TileType.CHEST:
                this.drawChest(screenX, screenY, tileState);
                break;
            case TileType.ALTAR:
                this.drawAltar(screenX, screenY);
                break;
            case TileType.TORCH:
                this.drawTorch(screenX, screenY);
                break;
            case TileType.WATER:
                this.drawWater(screenX, screenY);
                break;
            case TileType.STAIRS:
                this.drawStairs(screenX, screenY);
                break;
            case TileType.HIDING:
                this.drawHidingSpot(screenX, screenY);
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
            ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
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
        ctx.fillRect(x, y + size * 3 / 4, size, size / 4);

        // Brick lines (horizontal)
        ctx.strokeStyle = this.colors.wallShadow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size, y + size / 2);
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

    // Draw door tile - visually distinct open vs closed
    drawDoor(x, y, state) {
        const ctx = this.ctx;
        const size = this.tileSize;
        const isOpen = state && state.open;
        const isLocked = state && state.locked;

        if (isOpen) {
            // Open door — show floor underneath with door frame
            this.drawFloor(x, y);

            // Draw door frame on left and right edges
            ctx.fillStyle = '#8b6914';
            ctx.fillRect(x, y, 4, size);
            ctx.fillRect(x + size - 4, y, 4, size);

            // Top frame
            ctx.fillRect(x, y, size, 3);
        } else {
            // Closed door — solid door panel
            // Floor underneath (barely visible as frame)
            ctx.fillStyle = this.colors.floor;
            ctx.fillRect(x, y, size, size);

            // Door panel
            ctx.fillStyle = isLocked ? '#8b4513' : '#d4af37';
            ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

            // Door frame
            ctx.strokeStyle = '#6b3410';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

            // Cross pattern on door
            ctx.strokeStyle = isLocked ? '#5a2d0c' : '#b8960f';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y + 4);
            ctx.lineTo(x + size / 2, y + size - 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 4, y + size / 2);
            ctx.lineTo(x + size - 4, y + size / 2);
            ctx.stroke();

            // Door handle
            ctx.fillStyle = isLocked ? '#ff4444' : '#ffd700';
            ctx.beginPath();
            ctx.arc(x + size * 0.7, y + size / 2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Lock indicator for locked doors
            if (isLocked) {
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(x + size * 0.7 - 2, y + size / 2 - 6, 4, 4);
            }
        }
    }

    // Draw chest tile - visually distinct open vs closed
    drawChest(x, y, state) {
        const ctx = this.ctx;
        const size = this.tileSize;
        const isOpen = state && state.open;

        // Floor underneath
        this.drawFloor(x, y);

        // Chest body
        const chestX = x + 4;
        const chestY = y + size / 3;
        const chestW = size - 8;
        const chestH = size / 2;

        if (isOpen) {
            // Open chest — lid tilted back
            // Chest body (darker)
            ctx.fillStyle = '#6b4226';
            ctx.fillRect(chestX, chestY, chestW, chestH);
            ctx.strokeStyle = '#4a2d15';
            ctx.lineWidth = 1;
            ctx.strokeRect(chestX, chestY, chestW, chestH);

            // Open lid (tilted back)
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(chestX, chestY - 6, chestW, 8);
            ctx.strokeStyle = '#4a2d15';
            ctx.strokeRect(chestX, chestY - 6, chestW, 8);

            // Gold sparkle inside
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(chestX + 4, chestY + 4, 3, 3);
            ctx.fillRect(chestX + chestW - 8, chestY + 6, 3, 3);
            ctx.fillRect(chestX + chestW / 2 - 1, chestY + 3, 3, 3);
        } else {
            // Closed chest
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(chestX, chestY, chestW, chestH);
            ctx.strokeStyle = '#4a2d15';
            ctx.lineWidth = 1;
            ctx.strokeRect(chestX, chestY, chestW, chestH);

            // Lid top (slight highlight)
            ctx.fillStyle = '#a0723b';
            ctx.fillRect(chestX, chestY, chestW, chestH / 3);

            // Metal clasp
            ctx.fillStyle = '#c0a030';
            ctx.fillRect(chestX + chestW / 2 - 3, chestY + chestH / 3 - 2, 6, 6);

            // Metal bands
            ctx.strokeStyle = '#c0a030';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(chestX + 2, chestY + chestH / 2);
            ctx.lineTo(chestX + chestW - 2, chestY + chestH / 2);
            ctx.stroke();
        }
    }

    // Draw altar tile - glowing stone with subtle pulse
    drawAltar(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Floor underneath
        this.drawFloor(x, y);

        // Subtle glow pulse animation
        const pulse = Math.sin(this.animTime * 2) * 0.15 + 0.85;

        // Glow effect (drawn first, behind the altar)
        ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Altar base (stone block)
        const altarX = x + 4;
        const altarY = y + size / 3;
        const altarW = size - 8;
        const altarH = size * 0.5;

        ctx.fillStyle = '#9a8a7a';
        ctx.fillRect(altarX, altarY, altarW, altarH);

        // Stone texture
        ctx.strokeStyle = '#7a6a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(altarX, altarY, altarW, altarH);

        // Cross symbol on front
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, altarY + 3);
        ctx.lineTo(x + size / 2, altarY + altarH - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(altarX + 4, altarY + altarH / 2);
        ctx.lineTo(altarX + altarW - 4, altarY + altarH / 2);
        ctx.stroke();

        // Candle flame on top
        const flameFlicker = Math.sin(this.animTime * 8) * 2;
        ctx.fillStyle = `rgba(255, 200, 50, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x + size / 2 + flameFlicker * 0.3, altarY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw torch tile - wall torch with animated flicker
    drawTorch(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Draw wall as base (torches are on walls)
        this.drawWall(x, y);

        // Torch bracket
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(x + size / 2 - 2, y + size / 3, 4, size / 2);

        // Flame with flicker
        const flicker = Math.sin(this.animTime * 10 + x * 3.7) * 1.5;
        const flicker2 = Math.cos(this.animTime * 7 + y * 2.1) * 1;

        // Outer flame glow
        ctx.fillStyle = 'rgba(255, 150, 30, 0.3)';
        ctx.beginPath();
        ctx.arc(x + size / 2 + flicker2, y + size / 3 - 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Main flame
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.ellipse(
            x + size / 2 + flicker,
            y + size / 3 - 2,
            3, 5,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Inner flame (bright)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(
            x + size / 2 + flicker * 0.5,
            y + size / 3,
            2, 3,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // Draw water tile - blue with shimmer
    drawWater(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Base water color
        ctx.fillStyle = this.colors.water;
        ctx.fillRect(x, y, size, size);

        // Shimmer effect - moving highlight waves
        const shimmer = Math.sin(this.animTime * 1.5 + x * 0.1 + y * 0.15);
        const shimmer2 = Math.cos(this.animTime * 1.2 + x * 0.15 + y * 0.1);

        ctx.fillStyle = `rgba(100, 180, 255, ${0.2 + shimmer * 0.1})`;
        ctx.fillRect(x + 2, y + 4 + shimmer2 * 2, size / 2 - 2, 2);
        ctx.fillRect(x + size / 2 + 2, y + 12 + shimmer * 2, size / 2 - 4, 2);
        ctx.fillRect(x + 6, y + 22 + shimmer2 * 1.5, size / 3, 2);

        // Darker edge
        ctx.strokeStyle = '#3a6c8b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
    }

    // Draw stairs tile - gradient suggesting descent
    drawStairs(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Base floor
        ctx.fillStyle = this.colors.floor;
        ctx.fillRect(x, y, size, size);

        // Draw stair steps (going down)
        const steps = 4;
        const stepH = size / steps;
        for (let i = 0; i < steps; i++) {
            const shade = 0.6 + (i / steps) * 0.4;
            const r = Math.floor(139 * shade);
            const g = Math.floor(115 * shade);
            const b = Math.floor(85 * shade);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x + i * 2, y + i * stepH, size - i * 4, stepH);

            // Step edge
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + i * 2, y + i * stepH);
            ctx.lineTo(x + size - i * 4 + i * 2, y + i * stepH);
            ctx.stroke();
        }

        // Down arrow indicator
        ctx.fillStyle = '#dddddd';
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size - 4);
        ctx.lineTo(x + size / 2 - 5, y + size - 10);
        ctx.lineTo(x + size / 2 + 5, y + size - 10);
        ctx.closePath();
        ctx.fill();
    }

    // Draw hiding spot tile (dark alcove)
    drawHidingSpot(x, y) {
        const ctx = this.ctx;
        const size = this.tileSize;

        // Dark recessed floor
        ctx.fillStyle = '#1a1510';
        ctx.fillRect(x, y, size, size);

        // Subtle wall edges to show it's a recessed alcove
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

        // Shadow lines
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        // Subtle shadow indicator
        const pulse = Math.sin(this.animTime * 1.5) * 0.05 + 0.1;
        ctx.fillStyle = `rgba(80, 60, 120, ${pulse})`;
        ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    }

    // Draw a guard's vision cone (semi-transparent triangle)
    drawVisionCone(enemy) {
        if (!enemy.visionCone) return;

        const screenPos = this.camera.worldToScreen(enemy.x, enemy.y);
        const ctx = this.ctx;
        const cone = enemy.visionCone;

        // Cone color based on alert state
        let coneColor;
        if (enemy.alertLevel >= 1.0) {
            coneColor = 'rgba(255, 50, 50, 0.2)';  // Red when fully alerted
        } else if (enemy.alertLevel > 0) {
            coneColor = 'rgba(255, 200, 50, 0.15)'; // Yellow when detecting
        } else {
            coneColor = 'rgba(255, 255, 100, 0.08)'; // Dim yellow when idle
        }

        // Draw cone as a triangle from enemy position
        const length = cone.length;
        const halfWidth = cone.halfWidth;

        // Calculate cone points based on facing direction
        let tipX, tipY, leftX, leftY, rightX, rightY;
        switch (cone.direction) {
            case 'right':
                tipX = screenPos.x;
                tipY = screenPos.y;
                leftX = screenPos.x + length;
                leftY = screenPos.y - halfWidth;
                rightX = screenPos.x + length;
                rightY = screenPos.y + halfWidth;
                break;
            case 'left':
                tipX = screenPos.x;
                tipY = screenPos.y;
                leftX = screenPos.x - length;
                leftY = screenPos.y + halfWidth;
                rightX = screenPos.x - length;
                rightY = screenPos.y - halfWidth;
                break;
            case 'down':
                tipX = screenPos.x;
                tipY = screenPos.y;
                leftX = screenPos.x + halfWidth;
                leftY = screenPos.y + length;
                rightX = screenPos.x - halfWidth;
                rightY = screenPos.y + length;
                break;
            case 'up':
                tipX = screenPos.x;
                tipY = screenPos.y;
                leftX = screenPos.x - halfWidth;
                leftY = screenPos.y - length;
                rightX = screenPos.x + halfWidth;
                rightY = screenPos.y - length;
                break;
            default:
                return;
        }

        ctx.fillStyle = coneColor;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
    }

    // Draw alert indicator above a guard ("!" or "!!")
    drawAlertIndicator(enemy) {
        if (!enemy.alertLevel || enemy.alertLevel <= 0) return;

        const screenPos = this.camera.worldToScreen(enemy.x, enemy.y);
        const ctx = this.ctx;
        const size = CONFIG.TILE_SIZE;

        const text = enemy.alertLevel >= 1.0 ? '!!' : '!';
        const color = enemy.alertLevel >= 1.0 ? '#ff3333' : '#ffcc00';

        // Bouncing animation
        const bounce = Math.sin(this.animTime * 8) * 3;

        ctx.font = `bold 18px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(text, screenPos.x, screenPos.y - size / 2 - 8 + bounce);
        ctx.fillStyle = color;
        ctx.fillText(text, screenPos.x, screenPos.y - size / 2 - 8 + bounce);
    }

    // Draw the player character
    drawPlayer(player) {
        const screenPos = this.camera.worldToScreen(player.x, player.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        const size = player.size;

        const ctx = this.ctx;

        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + size - 4, size * 0.4, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player body (simple character sprite)
        ctx.fillStyle = this.colors.player;
        ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);

        // Player outline
        ctx.strokeStyle = this.colors.playerOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - size / 2, screenY - size / 2, size, size);

        // Simple face based on direction
        ctx.fillStyle = '#000000';
        const faceX = screenX - size / 2;
        const faceY = screenY - size / 2;

        switch (player.direction) {
            case 'up':
                ctx.fillRect(faceX + 6, faceY + 8, 4, 4);
                ctx.fillRect(faceX + 14, faceY + 8, 4, 4);
                break;
            case 'down':
                ctx.fillRect(faceX + 6, faceY + 12, 4, 4);
                ctx.fillRect(faceX + 14, faceY + 12, 4, 4);
                break;
            case 'left':
                ctx.fillRect(faceX + 4, faceY + 10, 4, 4);
                ctx.fillRect(faceX + 12, faceY + 10, 4, 4);
                break;
            case 'right':
                ctx.fillRect(faceX + 8, faceY + 10, 4, 4);
                ctx.fillRect(faceX + 16, faceY + 10, 4, 4);
                break;
        }
    }

    // Draw an NPC - colored rectangle with direction indicator and name
    drawNPC(npc) {
        const screenPos = this.camera.worldToScreen(npc.x, npc.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        const size = CONFIG.TILE_SIZE;
        const halfSize = size / 2;

        const ctx = this.ctx;

        // Cull off-screen NPCs
        if (screenX + halfSize < 0 || screenX - halfSize > this.canvas.width ||
            screenY + halfSize < 0 || screenY - halfSize > this.canvas.height) {
            return;
        }

        // NPC shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + halfSize - 4, halfSize * 0.5, halfSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // NPC body
        const npcColor = npc.color || this.colors.npc;
        ctx.fillStyle = npcColor;
        ctx.fillRect(screenX - halfSize + 2, screenY - halfSize + 2, size - 4, size - 4);

        // NPC outline
        ctx.strokeStyle = '#2C2416';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - halfSize + 2, screenY - halfSize + 2, size - 4, size - 4);

        // Direction indicator (small triangle showing which way NPC faces)
        ctx.fillStyle = '#ffffff';
        const triSize = 4;
        switch (npc.direction) {
            case 'up':
                ctx.beginPath();
                ctx.moveTo(screenX, screenY - halfSize + 4);
                ctx.lineTo(screenX - triSize, screenY - halfSize + 4 + triSize * 2);
                ctx.lineTo(screenX + triSize, screenY - halfSize + 4 + triSize * 2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'down':
                ctx.beginPath();
                ctx.moveTo(screenX, screenY + halfSize - 4);
                ctx.lineTo(screenX - triSize, screenY + halfSize - 4 - triSize * 2);
                ctx.lineTo(screenX + triSize, screenY + halfSize - 4 - triSize * 2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'left':
                ctx.beginPath();
                ctx.moveTo(screenX - halfSize + 4, screenY);
                ctx.lineTo(screenX - halfSize + 4 + triSize * 2, screenY - triSize);
                ctx.lineTo(screenX - halfSize + 4 + triSize * 2, screenY + triSize);
                ctx.closePath();
                ctx.fill();
                break;
            case 'right':
                ctx.beginPath();
                ctx.moveTo(screenX + halfSize - 4, screenY);
                ctx.lineTo(screenX + halfSize - 4 - triSize * 2, screenY - triSize);
                ctx.lineTo(screenX + halfSize - 4 - triSize * 2, screenY + triSize);
                ctx.closePath();
                ctx.fill();
                break;
        }

        // Name label above NPC
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = `bold 11px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeText(npc.name, screenX, screenY - halfSize - 2);
        ctx.fillText(npc.name, screenX, screenY - halfSize - 2);
    }

    // Draw interaction prompt ("SPACE" hint) near the player
    drawInteractionPrompt(player, label) {
        const screenPos = this.camera.worldToScreen(player.x, player.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;

        const ctx = this.ctx;
        const text = label || 'SPACE';

        // Floating prompt above player
        const promptY = screenY - player.size - 8;

        // Pulsing opacity
        const pulse = Math.sin(this.animTime * 4) * 0.2 + 0.8;

        // Background pill
        ctx.font = `bold 12px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        const textWidth = ctx.measureText(text).width;
        const padX = 8;
        const padY = 4;
        const pillW = textWidth + padX * 2;
        const pillH = 16 + padY * 2;

        ctx.globalAlpha = pulse;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.drawRoundRect(ctx, screenX - pillW / 2, promptY - pillH / 2, pillW, pillH, 4);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        this.drawRoundRect(ctx, screenX - pillW / 2, promptY - pillH / 2, pillW, pillH, 4);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, screenX, promptY);

        ctx.globalAlpha = 1.0;
    }

    // Draw the entire map
    drawMap(map) {
        const tileSize = this.tileSize;
        const startTileX = Math.floor(this.camera.x / tileSize);
        const startTileY = Math.floor(this.camera.y / tileSize);
        const endTileX = Math.min(startTileX + this.viewportTilesX + 2, map.width);
        const endTileY = Math.min(startTileY + this.viewportTilesY + 2, map.height);

        for (let y = Math.max(0, startTileY); y < endTileY; y++) {
            for (let x = Math.max(0, startTileX); x < endTileX; x++) {
                const tileType = map.getTile(x, y);
                const tileState = map.getTileState(x, y);
                this.drawTile(x, y, tileType, tileState);
            }
        }
    }

    // Draw an enemy entity on the overworld map
    drawEnemy(enemy) {
        const screenPos = this.camera.worldToScreen(enemy.x, enemy.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        const size = CONFIG.TILE_SIZE;
        const halfSize = size / 2;

        const ctx = this.ctx;

        // Cull off-screen enemies
        if (screenX + halfSize < 0 || screenX - halfSize > this.canvas.width ||
            screenY + halfSize < 0 || screenY - halfSize > this.canvas.height) {
            return;
        }

        // Enemy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + halfSize - 4, halfSize * 0.5, halfSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enemy body
        const enemyColor = enemy.color || this.colors.enemy;
        ctx.fillStyle = enemyColor;
        ctx.fillRect(screenX - halfSize + 2, screenY - halfSize + 2, size - 4, size - 4);

        // Enemy outline (red-tinted to distinguish from NPCs)
        ctx.strokeStyle = this.colors.danger;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - halfSize + 2, screenY - halfSize + 2, size - 4, size - 4);

        // Angry eyes (to distinguish from friendly NPCs)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX - 8, screenY - 4, 6, 6);
        ctx.fillRect(screenX + 2, screenY - 4, 6, 6);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(screenX - 6, screenY - 2, 3, 3);
        ctx.fillRect(screenX + 4, screenY - 2, 3, 3);

        // Eyebrow slants (angry look)
        ctx.strokeStyle = enemyColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX - 10, screenY - 8);
        ctx.lineTo(screenX - 2, screenY - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX + 10, screenY - 8);
        ctx.lineTo(screenX + 2, screenY - 5);
        ctx.stroke();

        // Boss indicator (small crown)
        if (enemy.isBoss) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(screenX - 8, screenY - halfSize + 2);
            ctx.lineTo(screenX - 10, screenY - halfSize - 6);
            ctx.lineTo(screenX - 4, screenY - halfSize - 2);
            ctx.lineTo(screenX, screenY - halfSize - 8);
            ctx.lineTo(screenX + 4, screenY - halfSize - 2);
            ctx.lineTo(screenX + 10, screenY - halfSize - 6);
            ctx.lineTo(screenX + 8, screenY - halfSize + 2);
            ctx.closePath();
            ctx.fill();
        }

        // Name label above enemy
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = `bold 11px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const labelY = enemy.isBoss ? screenY - halfSize - 10 : screenY - halfSize - 2;
        ctx.strokeText(enemy.name, screenX, labelY);
        ctx.fillText(enemy.name, screenX, labelY);
    }

    // Draw a rounded rectangle path (fallback for older browsers without roundRect)
    drawRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            // Manual rounded rect path
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }

    // Draw a floor item (colored square with sparkle effect)
    drawFloorItem(item, itemDef) {
        const screenPos = this.camera.worldToScreen(item.x, item.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        const size = 16;

        const ctx = this.ctx;

        // Cull off-screen
        if (screenX + size < 0 || screenX - size > this.canvas.width ||
            screenY + size < 0 || screenY - size > this.canvas.height) {
            return;
        }

        // Bobbing animation
        const bob = Math.sin(this.animTime * 3 + item.x * 0.1 + item.y * 0.1) * 2;

        // Glow effect
        const pulse = Math.sin(this.animTime * 4 + item.x * 0.2) * 0.15 + 0.35;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY + bob, size * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Item square
        ctx.fillStyle = (itemDef && itemDef.color) || '#ffd700';
        ctx.fillRect(screenX - size / 2, screenY - size / 2 + bob, size, size);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - size / 2, screenY - size / 2 + bob, size, size);

        // Sparkle particles
        const sparkle = Math.sin(this.animTime * 6 + item.x) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 200, ${sparkle})`;
        ctx.fillRect(screenX + 5, screenY - 6 + bob, 2, 2);
        ctx.fillRect(screenX - 7, screenY + 4 + bob, 2, 2);
    }

    // Main render method
    render(gameState) {
        // Advance animation time
        this.animTime += 1 / 60;

        this.clear();

        // Update camera using Camera class
        this.camera.update(
            gameState.player.x,
            gameState.player.y,
            gameState.map.width * this.tileSize,
            gameState.map.height * this.tileSize
        );

        // Draw map
        this.drawMap(gameState.map);

        // Draw floor items (after map, before entities)
        if (gameState.worldItems) {
            for (const item of gameState.worldItems) {
                if (!item.pickedUp) {
                    this.drawFloorItem(item, item.def);
                }
            }
        }

        // Draw vision cones (behind enemies, on top of floor items)
        if (gameState.enemies) {
            for (const enemy of gameState.enemies) {
                if (enemy.visionCone) {
                    this.drawVisionCone(enemy);
                }
            }
        }

        // Draw enemies
        if (gameState.enemies) {
            for (const enemy of gameState.enemies) {
                this.drawEnemy(enemy);
                if (enemy.alertLevel !== undefined) {
                    this.drawAlertIndicator(enemy);
                }
            }
        }

        // Draw NPCs
        if (gameState.npcs) {
            for (const npc of gameState.npcs) {
                this.drawNPC(npc);
            }
        }

        // Draw player (on top of NPCs and enemies)
        this.drawPlayer(gameState.player);

        // Draw interaction prompt if near something interactable
        if (gameState.nearInteractable) {
            this.drawInteractionPrompt(gameState.player, 'SPACE');
        }
    }
}
