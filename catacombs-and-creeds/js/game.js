/**
 * Game - Main game engine with state machine, input routing, and game loop
 */

/**
 * TileMap - Tile-based map with collision detection
 */
class TileMap {
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
}

/**
 * Game - Main game controller with state machine
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.tileSize = CONFIG.TILE_SIZE;

        // State machine — start at title screen
        this.state = GameState.TITLE;

        // Game objects (created on startNewGame)
        this.map = null;
        this.player = null;

        // Systems
        this.renderer = new Renderer(canvas);
        this.input = new InputHandler();
        this.screens = new ScreenManager();

        // Game loop
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        this.isRunning = false;

        // Auto-save timer
        this.lastSaveTime = 0;

        // Save system foundation
        this.saveKey = 'earlyChurchDungeonSave';
    }

    init() {
        console.log('Game initialized');
        this.start();
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastSaveTime = this.lastTime;
        this.gameLoop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
    }

    changeState(newState) {
        console.log(`State: ${this.state} -> ${newState}`);
        this.state = newState;
    }

    /** Create map and player, transition to PLAYING */
    startNewGame() {
        this.map = new TileMap(20, 15);
        this.player = new Player(
            this.tileSize * 2.5,
            this.tileSize * 2.5
        );
        this.loadGame();
        this.lastSaveTime = performance.now();
        this.changeState(GameState.PLAYING);
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
        this.update(deltaTime, currentTime);

        // Render
        this.render();

        // Clear justPressed AFTER update+render so wasPressed works for one full frame
        this.input.update();

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime, currentTime) {
        switch (this.state) {
            case GameState.TITLE:
                this.updateTitle();
                break;
            case GameState.PLAYING:
                this.updatePlaying(deltaTime, currentTime);
                break;
            case GameState.DIALOGUE:
                this.updateDialogue(deltaTime);
                break;
            case GameState.COMBAT:
                this.updateCombat(deltaTime);
                break;
            case GameState.INVENTORY:
                this.updateInventory(deltaTime);
                break;
            case GameState.PAUSED:
                this.updatePaused();
                break;
        }
    }

    updateTitle() {
        const action = this.screens.update(this.input, 'title');
        if (action === 'new_game') {
            this.startNewGame();
        }
    }

    updatePlaying(deltaTime, currentTime) {
        // Read input and apply to player movement
        this.player.moving.up = this.input.isDown('w') || this.input.isDown('W') || this.input.isDown('ArrowUp');
        this.player.moving.down = this.input.isDown('s') || this.input.isDown('S') || this.input.isDown('ArrowDown');
        this.player.moving.left = this.input.isDown('a') || this.input.isDown('A') || this.input.isDown('ArrowLeft');
        this.player.moving.right = this.input.isDown('d') || this.input.isDown('D') || this.input.isDown('ArrowRight');

        // Update player
        this.player.update(this.map);

        // Check Escape → pause
        if (this.input.wasPressed('Escape')) {
            this.screens.resetSelection();
            this.changeState(GameState.PAUSED);
            return;
        }

        // Auto-save periodically
        if (currentTime - this.lastSaveTime >= CONFIG.AUTO_SAVE_INTERVAL) {
            this.saveGame();
            this.lastSaveTime = currentTime;
        }
    }

    updatePaused() {
        const action = this.screens.update(this.input, 'pause');
        if (action === 'resume') {
            this.changeState(GameState.PLAYING);
        } else if (action === 'exit_title') {
            this.saveGame();
            this.player = null;
            this.map = null;
            this.screens.resetSelection();
            this.changeState(GameState.TITLE);
        }
    }

    updateDialogue(deltaTime) {
        // Stub — implemented in Session 4
    }

    updateCombat(deltaTime) {
        // Stub — implemented in Session 5
    }

    updateInventory(deltaTime) {
        // Stub — implemented in Session 6
    }

    render() {
        switch (this.state) {
            case GameState.TITLE:
                this.screens.renderTitle(this.renderer.ctx, this.canvas);
                break;
            case GameState.PLAYING:
                this.renderPlaying();
                break;
            case GameState.DIALOGUE:
                this.renderPlaying();
                this.renderDialogue();
                break;
            case GameState.COMBAT:
                this.renderCombat();
                break;
            case GameState.INVENTORY:
                this.renderPlaying();
                this.renderInventory();
                break;
            case GameState.PAUSED:
                this.renderPlaying();
                this.screens.renderPause(this.renderer.ctx, this.canvas);
                break;
        }
    }

    renderPlaying() {
        this.renderer.render({
            player: this.player,
            map: this.map
        });
    }

    renderDialogue() {
        // Stub — implemented in Session 4
    }

    renderCombat() {
        // Stub — implemented in Session 5
    }

    renderInventory() {
        // Stub — implemented in Session 6
    }

    updateUI() {
        // Update FPS display
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = this.fps;
        }

        // Update position display (guard against null player on title screen)
        if (this.player) {
            const tilePos = this.player.getTilePosition();
            const posXElement = document.getElementById('posX');
            const posYElement = document.getElementById('posY');
            if (posXElement && posYElement) {
                posXElement.textContent = tilePos.x;
                posYElement.textContent = tilePos.y;
            }
        }
    }

    // Save game to localStorage
    saveGame() {
        if (!this.player) return;

        const saveData = {
            playerX: this.player.x,
            playerY: this.player.y,
            playerDirection: this.player.direction,
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            attack: this.player.attack,
            defense: this.player.defense,
            xp: this.player.xp,
            level: this.player.level,
            xpThreshold: this.player.xpThreshold,
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
        if (!this.player) return;

        try {
            const saveData = localStorage.getItem(this.saveKey);
            if (saveData) {
                const data = JSON.parse(saveData);
                this.player.x = data.playerX;
                this.player.y = data.playerY;
                this.player.direction = data.playerDirection || 'down';
                // Restore stats if present in save
                if (data.hp !== undefined) {
                    this.player.hp = data.hp;
                    this.player.maxHp = data.maxHp;
                    this.player.attack = data.attack;
                    this.player.defense = data.defense;
                    this.player.xp = data.xp;
                    this.player.level = data.level;
                    this.player.xpThreshold = data.xpThreshold;
                }
                console.log('Game loaded from save');
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
    }

    // Reset save
    resetSave() {
        localStorage.removeItem(this.saveKey);
        if (this.player) {
            this.player.x = this.tileSize * 2.5;
            this.player.y = this.tileSize * 2.5;
            this.player.direction = 'down';
        }
        console.log('Save reset');
    }
}

// Expose Game globally
window.Game = Game;
