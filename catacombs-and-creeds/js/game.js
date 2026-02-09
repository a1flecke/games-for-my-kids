/**
 * Game - Main game engine with player movement, collision detection, and game loop
 */

/**
 * Map - Tile-based map with collision detection
 */
class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.generateTestMap();
    }

    generateTestMap() {
        // Create a 20x15 test dungeon
        this.width = 20;
        this.height = 15;
        
        // Initialize with floor tiles
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 0; // Floor
            }
        }

        // Add walls around the perimeter
        for (let x = 0; x < this.width; x++) {
            this.tiles[0][x] = 1; // Top wall
            this.tiles[this.height - 1][x] = 1; // Bottom wall
        }
        for (let y = 0; y < this.height; y++) {
            this.tiles[y][0] = 1; // Left wall
            this.tiles[y][this.width - 1] = 1; // Right wall
        }

        // Add some interior walls to make it interesting
        // Vertical wall section
        for (let y = 3; y < 8; y++) {
            this.tiles[y][7] = 1;
        }

        // Horizontal wall section
        for (let x = 10; x < 15; x++) {
            this.tiles[5][x] = 1;
        }

        // Small room in corner
        for (let x = 15; x < 18; x++) {
            this.tiles[3][x] = 1;
            this.tiles[8][x] = 1;
        }
        for (let y = 3; y < 9; y++) {
            this.tiles[y][15] = 1;
        }

        // Create a corridor
        for (let y = 9; y < 12; y++) {
            this.tiles[y][10] = 1;
            this.tiles[y][12] = 1;
        }
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 1; // Out of bounds = wall
        }
        return this.tiles[y][x];
    }

    isWalkable(x, y) {
        return this.getTile(x, y) === 0;
    }

    // Check if a rectangular area is walkable
    isAreaWalkable(x, y, width, height) {
        const tileSize = 32;
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
}

/**
 * Player - Player character with movement and collision
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 24; // Player sprite size
        this.speed = 3; // Pixels per frame
        this.direction = 'down';
        
        // Movement state
        this.moving = {
            up: false,
            down: false,
            left: false,
            right: false
        };
    }

    // Update player position based on input
    update(map, tileSize) {
        let dx = 0;
        let dy = 0;

        // Calculate movement direction
        if (this.moving.up) {
            dy -= this.speed;
            this.direction = 'up';
        }
        if (this.moving.down) {
            dy += this.speed;
            this.direction = 'down';
        }
        if (this.moving.left) {
            dx -= this.speed;
            this.direction = 'left';
        }
        if (this.moving.right) {
            dx += this.speed;
            this.direction = 'right';
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707; // 1/sqrt(2)
            dy *= 0.707;
        }

        // Apply movement with collision detection
        this.moveWithCollision(map, dx, dy, tileSize);
    }

    // Move player with collision detection
    moveWithCollision(map, dx, dy, tileSize) {
        // Try X movement
        if (dx !== 0) {
            const newX = this.x + dx;
            const halfSize = this.size / 2;
            
            if (map.isAreaWalkable(
                newX - halfSize,
                this.y - halfSize,
                this.size,
                this.size
            )) {
                this.x = newX;
            }
        }

        // Try Y movement
        if (dy !== 0) {
            const newY = this.y + dy;
            const halfSize = this.size / 2;
            
            if (map.isAreaWalkable(
                this.x - halfSize,
                newY - halfSize,
                this.size,
                this.size
            )) {
                this.y = newY;
            }
        }
    }

    // Get tile position
    getTilePosition(tileSize) {
        return {
            x: Math.floor(this.x / tileSize),
            y: Math.floor(this.y / tileSize)
        };
    }
}

/**
 * InputHandler - Keyboard input management
 */
class InputHandler {
    constructor(player) {
        this.player = player;
        this.keys = {};
        
        // Bind keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Prevent arrow key scrolling
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    onKeyDown(e) {
        this.keys[e.key] = true;
        this.updatePlayerMovement();
    }

    onKeyUp(e) {
        this.keys[e.key] = false;
        this.updatePlayerMovement();
    }

    updatePlayerMovement() {
        // WASD and Arrow keys
        this.player.moving.up = this.keys['w'] || this.keys['W'] || this.keys['ArrowUp'];
        this.player.moving.down = this.keys['s'] || this.keys['S'] || this.keys['ArrowDown'];
        this.player.moving.left = this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft'];
        this.player.moving.right = this.keys['d'] || this.keys['D'] || this.keys['ArrowRight'];
    }

    isKeyPressed(key) {
        return this.keys[key] === true;
    }
}

/**
 * Game - Main game controller
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.tileSize = 32;
        
        // Game state
        this.map = new Map(20, 15);
        this.player = new Player(
            this.tileSize * 2.5, // Start position X (in pixels)
            this.tileSize * 2.5  // Start position Y (in pixels)
        );
        
        // Systems
        this.renderer = new Renderer(canvas, this.tileSize);
        this.input = new InputHandler(this.player);
        
        // Game loop
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        this.isRunning = false;

        // Save system foundation
        this.saveKey = 'earlyChurchDungeonSave';
    }

    init() {
        console.log('Game initialized');
        this.loadGame();
        this.start();
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
    }

    // Main game loop (60fps target)
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update FPS counter
        this.fpsCounter++;
        this.fpsTime += deltaTime;
        if (this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = 0;
            this.updateUI();
        }

        // Update game state
        this.update(deltaTime);

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Update player
        this.player.update(this.map, this.tileSize);
        
        // Auto-save periodically (every 5 seconds)
        if (Math.floor(this.lastTime / 5000) !== Math.floor((this.lastTime - deltaTime) / 5000)) {
            this.saveGame();
        }
    }

    render() {
        this.renderer.render({
            player: this.player,
            map: this.map
        });
    }

    updateUI() {
        // Update FPS display
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = this.fps;
        }

        // Update position display
        const tilePos = this.player.getTilePosition(this.tileSize);
        const posXElement = document.getElementById('posX');
        const posYElement = document.getElementById('posY');
        if (posXElement && posYElement) {
            posXElement.textContent = tilePos.x;
            posYElement.textContent = tilePos.y;
        }
    }

    // Save game to localStorage
    saveGame() {
        const saveData = {
            playerX: this.player.x,
            playerY: this.player.y,
            playerDirection: this.player.direction,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            console.log('Game saved');
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    // Load game from localStorage
    loadGame() {
        try {
            const saveData = localStorage.getItem(this.saveKey);
            if (saveData) {
                const data = JSON.parse(saveData);
                this.player.x = data.playerX;
                this.player.y = data.playerY;
                this.player.direction = data.playerDirection || 'down';
                console.log('Game loaded from save');
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
    }

    // Reset save
    resetSave() {
        localStorage.removeItem(this.saveKey);
        this.player.x = this.tileSize * 2.5;
        this.player.y = this.tileSize * 2.5;
        this.player.direction = 'down';
        console.log('Save reset');
    }
}

// Expose Game globally
window.Game = Game;
