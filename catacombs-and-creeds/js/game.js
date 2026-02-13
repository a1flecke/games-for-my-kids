/**
 * Game - Main game engine with state machine, input routing, and game loop
 *
 * Session 3: Level loading from JSON, NPC support, interaction system.
 * Session 4: Dialogue system integration, quest flags, TTS.
 * TileMap class extracted to tilemap.js, Camera to camera.js.
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
        this.npcs = [];
        this.currentLevel = 0;

        // Interaction tracking
        this.nearInteractable = false;
        this.nearNPC = null;
        this.nearTile = null;

        // Systems
        this.renderer = new Renderer(canvas);
        this.input = new InputHandler();
        this.screens = new ScreenManager();
        this.dialogue = new DialogueSystem();

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

    /**
     * Load a level from JSON and set up the map, NPCs, player position.
     * @param {number} levelNumber
     */
    async loadLevel(levelNumber) {
        const url = `data/levels/level${levelNumber}.json`;
        console.log(`Loading level ${levelNumber} from ${url}...`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }
            const levelData = await response.json();

            // Create tilemap
            this.map = new TileMap(levelData);
            this.currentLevel = levelNumber;

            // Spawn NPCs
            this.npcs = [];
            if (levelData.npcs) {
                for (const npcData of levelData.npcs) {
                    this.npcs.push(new NPC(npcData));
                }
            }

            // Set player position from level data
            if (levelData.playerStart && this.player) {
                this.player.x = gridToWorld(levelData.playerStart.x, this.tileSize);
                this.player.y = gridToWorld(levelData.playerStart.y, this.tileSize);
            }

            console.log(`Level ${levelNumber} loaded: "${levelData.name}" (${levelData.width}x${levelData.height}), ${this.npcs.length} NPCs`);
            return true;
        } catch (err) {
            console.error('Level load failed:', err);
            return false;
        }
    }

    /** Create player, load level, transition to PLAYING */
    async startNewGame() {
        // Show loading state
        this.changeState(GameState.LOADING);

        // Create player at default position (will be updated by loadLevel)
        this.player = new Player(
            this.tileSize * 2.5,
            this.tileSize * 2.5
        );

        // Load level 1
        const success = await this.loadLevel(1);

        if (success) {
            // Register level dialogue content
            if (window.LEVEL1_DIALOGUES) {
                this.dialogue.registerDialogues(window.LEVEL1_DIALOGUES);
            }

            // Try to load saved game data (position, stats, quest flags)
            this.loadGame();
            this.lastSaveTime = performance.now();
            this.changeState(GameState.PLAYING);
        } else {
            console.error('Failed to load level, returning to title');
            this.changeState(GameState.TITLE);
        }
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
            case GameState.LOADING:
                // Nothing to update — waiting for async load
                break;
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

        // Update player with NPC collision
        this.updatePlayerMovement();

        // Check proximity to interactables
        this.checkNearInteractable();

        // Handle SPACE interaction
        if (this.input.wasPressed(' ') || this.input.wasPressed('e') || this.input.wasPressed('E')) {
            this.handleInteract();
        }

        // Check Escape -> pause
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

    /**
     * Update player movement with NPC collision.
     * Players collide against both tiles and NPCs.
     */
    updatePlayerMovement() {
        const player = this.player;
        let dx = 0;
        let dy = 0;

        if (player.moving.up) {
            dy -= player.speed;
            player.direction = 'up';
        }
        if (player.moving.down) {
            dy += player.speed;
            player.direction = 'down';
        }
        if (player.moving.left) {
            dx -= player.speed;
            player.direction = 'left';
        }
        if (player.moving.right) {
            dx += player.speed;
            player.direction = 'right';
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        const halfSize = player.size / 2;

        // Try X movement
        if (dx !== 0) {
            const newX = player.x + dx;
            if (this.map.isAreaWalkableWithNPCs(
                newX - halfSize, player.y - halfSize,
                player.size, player.size,
                this.npcs
            )) {
                player.x = newX;
            }
        }

        // Try Y movement
        if (dy !== 0) {
            const newY = player.y + dy;
            if (this.map.isAreaWalkableWithNPCs(
                player.x - halfSize, newY - halfSize,
                player.size, player.size,
                this.npcs
            )) {
                player.y = newY;
            }
        }
    }

    /**
     * Check if the player is near an interactable tile or NPC.
     * Updates this.nearInteractable, this.nearNPC, this.nearTile.
     */
    checkNearInteractable() {
        this.nearInteractable = false;
        this.nearNPC = null;
        this.nearTile = null;

        // Check NPCs first (higher priority)
        for (const npc of this.npcs) {
            if (npc.isPlayerInRange(this.player)) {
                this.nearInteractable = true;
                this.nearNPC = npc;
                return;
            }
        }

        // Check interactable tiles in front of the player (based on facing direction)
        const playerTile = this.player.getTilePosition();
        const facingTiles = this.getFacingTiles(playerTile.x, playerTile.y, this.player.direction);

        for (const tile of facingTiles) {
            if (this.map.isInteractable(tile.x, tile.y)) {
                this.nearInteractable = true;
                this.nearTile = tile;
                return;
            }
        }

        // Also check the tile the player is standing on
        if (this.map.isInteractable(playerTile.x, playerTile.y)) {
            this.nearInteractable = true;
            this.nearTile = { x: playerTile.x, y: playerTile.y };
        }
    }

    /**
     * Get tiles in front of the player based on their facing direction.
     * Returns 1-2 tiles to check (the one directly in front, plus diagonal).
     */
    getFacingTiles(tileX, tileY, direction) {
        switch (direction) {
            case 'up':    return [{ x: tileX, y: tileY - 1 }];
            case 'down':  return [{ x: tileX, y: tileY + 1 }];
            case 'left':  return [{ x: tileX - 1, y: tileY }];
            case 'right': return [{ x: tileX + 1, y: tileY }];
            default:      return [];
        }
    }

    /**
     * Handle player pressing the interact button (SPACE/E).
     */
    handleInteract() {
        if (!this.nearInteractable) return;

        // NPC interaction — start dialogue
        if (this.nearNPC) {
            const result = this.nearNPC.interact();
            console.log('NPC interaction:', result);

            if (result.dialogueId) {
                this.dialogue.startDialogue(result.dialogueId, () => {
                    // Dialogue ended — return to playing
                    this.changeState(GameState.PLAYING);
                });
                this.changeState(GameState.DIALOGUE);
            }
            return;
        }

        // Tile interaction
        if (this.nearTile) {
            const result = this.map.interact(this.nearTile.x, this.nearTile.y);
            if (result) {
                console.log('Tile interaction:', result);

                // Handle specific results
                switch (result.type) {
                    case 'altar_save':
                        this.saveGame();
                        break;
                    case 'stairs':
                        console.log('Stairs interaction — level transition not yet implemented');
                        break;
                    case 'door_locked':
                        // Could show a message in the future
                        break;
                    case 'chest_opened':
                        // Could add item to inventory in the future
                        break;
                }
            }
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
            this.npcs = [];
            this.screens.resetSelection();
            this.changeState(GameState.TITLE);
        }
    }

    updateDialogue(deltaTime) {
        this.dialogue.update(this.input);

        // If the dialogue system closed itself (e.g. via Escape), return to PLAYING
        if (!this.dialogue.isActive()) {
            this.changeState(GameState.PLAYING);
        }
    }

    updateCombat(deltaTime) {
        // Stub — implemented in Session 5
    }

    updateInventory(deltaTime) {
        // Stub — implemented in Session 6
    }

    render() {
        switch (this.state) {
            case GameState.LOADING:
                this.renderLoading();
                break;
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

    renderLoading() {
        const ctx = this.renderer.ctx;
        const a = CONFIG.ACCESSIBILITY;

        ctx.fillStyle = a.bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = a.textColor;
        ctx.font = `bold 28px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);

        ctx.font = `18px ${a.fontFamily}`;
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.fillText('Preparing the catacombs', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    renderPlaying() {
        this.renderer.render({
            player: this.player,
            map: this.map,
            npcs: this.npcs,
            nearInteractable: this.nearInteractable
        });
    }

    renderDialogue() {
        this.dialogue.render(this.renderer.ctx, this.canvas);
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

        // Update level name display
        const levelElement = document.getElementById('levelName');
        if (levelElement && this.map) {
            levelElement.textContent = `Level ${this.currentLevel}: ${this.map.name}`;
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
            currentLevel: this.currentLevel,
            timestamp: Date.now()
        };

        // Save tile state (doors opened, chests looted, etc.)
        if (this.map) {
            saveData.tileState = this.map.tileState;
        }

        // Save NPC talked-to state
        if (this.npcs.length > 0) {
            saveData.npcState = {};
            for (const npc of this.npcs) {
                saveData.npcState[npc.id] = {
                    hasBeenTalkedTo: npc.hasBeenTalkedTo
                };
            }
        }

        // Save quest flags from dialogue system
        if (this.dialogue) {
            saveData.questFlags = { ...this.dialogue.questFlags };
        }

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

                // Only restore if same level
                if (data.currentLevel === this.currentLevel) {
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

                    // Restore tile state
                    if (data.tileState && this.map) {
                        for (const key of Object.keys(data.tileState)) {
                            if (this.map.tileState[key]) {
                                Object.assign(this.map.tileState[key], data.tileState[key]);
                            }
                        }
                    }

                    // Restore NPC state
                    if (data.npcState && this.npcs.length > 0) {
                        for (const npc of this.npcs) {
                            if (data.npcState[npc.id]) {
                                npc.hasBeenTalkedTo = data.npcState[npc.id].hasBeenTalkedTo;
                            }
                        }
                    }

                    // Restore quest flags
                    if (data.questFlags && this.dialogue) {
                        this.dialogue.questFlags = { ...data.questFlags };
                        console.log('Quest flags restored:', Object.keys(data.questFlags));
                    }

                    console.log('Game loaded from save');
                } else {
                    console.log('Save data is for a different level, starting fresh');
                }
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
    }

    // Reset save
    resetSave() {
        localStorage.removeItem(this.saveKey);
        if (this.player && this.map) {
            // Reset to level start position
            this.player.x = this.tileSize * 2.5;
            this.player.y = this.tileSize * 2.5;
            this.player.direction = 'down';
        }
        console.log('Save reset');
    }
}

// Expose Game globally
window.Game = Game;
