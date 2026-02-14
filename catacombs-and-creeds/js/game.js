/**
 * Game - Main game engine with state machine, input routing, and game loop
 *
 * Session 3: Level loading from JSON, NPC support, interaction system.
 * Session 4: Dialogue system integration, quest flags, TTS.
 * Session 5: Combat system, enemies, questions.
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
        this.enemies = [];
        this.currentLevel = 0;

        // Enemy definitions loaded from enemies.json
        this.enemyDefs = {};

        // Track defeated enemies (by ID) so they don't respawn on reload
        this.defeatedEnemies = new Set();

        // Floor items in the world (spawned from level data)
        this.worldItems = [];

        // Checkpoint position (for respawn on defeat)
        this.checkpointX = 0;
        this.checkpointY = 0;

        // Interaction tracking
        this.nearInteractable = false;
        this.nearNPC = null;
        this.nearTile = null;

        // Systems
        this.renderer = new Renderer(canvas);
        this.input = new InputHandler();
        this.screens = new ScreenManager();
        this.dialogue = new DialogueSystem();
        this.combat = new CombatSystem();
        this.questions = new QuestionSystem();
        this.inventory = new InventorySystem();
        this.saveSystem = new SaveSystem();
        this.hud = new HUD();

        // Wire question system into combat
        this.combat.questionSystem = this.questions;

        // Wire inventory into combat
        this.combat.inventory = this.inventory;

        // Game loop
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        this.isRunning = false;

        // Auto-save timer
        this.lastSaveTime = 0;

        // Track session playtime (for save metadata)
        this.sessionStartTime = 0;

        // Previous state (for returning from settings)
        this.previousState = null;
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

            // Spawn enemies from level data + enemy definitions
            this.enemies = [];
            if (levelData.enemies) {
                for (const enemySpawn of levelData.enemies) {
                    // Skip already-defeated enemies
                    if (this.defeatedEnemies.has(enemySpawn.id)) {
                        continue;
                    }

                    const def = this.enemyDefs[enemySpawn.type];
                    if (!def) {
                        console.warn(`Unknown enemy type: "${enemySpawn.type}" for enemy "${enemySpawn.id}"`);
                        continue;
                    }

                    this.enemies.push({
                        id: enemySpawn.id,
                        type: enemySpawn.type,
                        name: def.name,
                        color: def.color,
                        isBoss: def.isBoss || false,
                        // World position (center of tile)
                        x: gridToWorld(enemySpawn.x, this.tileSize),
                        y: gridToWorld(enemySpawn.y, this.tileSize),
                        // Patrol state
                        originX: gridToWorld(enemySpawn.x, this.tileSize),
                        originY: gridToWorld(enemySpawn.y, this.tileSize),
                        patrolRange: (def.patrolRange || 2) * this.tileSize,
                        patrolSpeed: def.patrolSpeed || 0.5,
                        patrolDirection: 1, // 1 = right/down, -1 = left/up
                        patrolAxis: 'x',    // 'x' or 'y' - patrol horizontally
                        size: CONFIG.TILE_SIZE
                    });
                }
            }

            // Spawn floor items from level data
            this.worldItems = [];
            if (levelData.items) {
                for (const itemSpawn of levelData.items) {
                    const def = this.inventory.getDef(itemSpawn.type);
                    this.worldItems.push({
                        id: itemSpawn.id,
                        type: itemSpawn.type,
                        x: gridToWorld(itemSpawn.x, this.tileSize),
                        y: gridToWorld(itemSpawn.y, this.tileSize),
                        pickedUp: false,
                        def: def // Cache definition for rendering
                    });
                }
            }

            // Set player position from level data
            if (levelData.playerStart && this.player) {
                this.player.x = gridToWorld(levelData.playerStart.x, this.tileSize);
                this.player.y = gridToWorld(levelData.playerStart.y, this.tileSize);
                // Set initial checkpoint to player start
                this.checkpointX = this.player.x;
                this.checkpointY = this.player.y;
            }

            console.log(`Level ${levelNumber} loaded: "${levelData.name}" (${levelData.width}x${levelData.height}), ${this.npcs.length} NPCs, ${this.enemies.length} enemies`);
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

        // Load enemy definitions, questions, and item definitions in parallel
        await Promise.all([
            this.loadEnemyDefs(),
            this.questions.load(),
            this.inventory.load()
        ]);

        // Load level 1
        const success = await this.loadLevel(1);

        if (success) {
            // Register level dialogue content
            if (window.LEVEL1_DIALOGUES) {
                this.dialogue.registerDialogues(window.LEVEL1_DIALOGUES);
            }

            // Reset session start time for playtime tracking
            this.sessionStartTime = performance.now();
            this.lastSaveTime = this.sessionStartTime;

            this.changeState(GameState.PLAYING);
        } else {
            console.error('Failed to load level, returning to title');
            this.changeState(GameState.TITLE);
        }
    }

    /**
     * Load enemy type definitions from JSON.
     */
    async loadEnemyDefs() {
        try {
            const response = await fetch('data/enemies.json');
            if (!response.ok) {
                throw new Error(`Failed to load enemies.json: ${response.status}`);
            }
            this.enemyDefs = await response.json();
            console.log(`Loaded ${Object.keys(this.enemyDefs).length} enemy type(s)`);
        } catch (err) {
            console.error('Failed to load enemy definitions:', err);
            this.enemyDefs = {};
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
            case GameState.SETTINGS:
                this.updateSettings();
                break;
            case GameState.SAVE_SLOTS:
            case GameState.LOAD_SLOTS:
                this.updateSlotPicker();
                break;
        }

        // Update notifications in HUD
        this.hud.updateNotifications(deltaTime);
        this.saveSystem.updateNotifications(deltaTime);
    }

    updateTitle() {
        const action = this.screens.update(this.input, 'title');
        if (action === 'new_game') {
            this.startNewGame();
        } else if (action === 'continue') {
            // Show load slot picker
            this.previousState = GameState.TITLE;
            this.saveSystem.showSlotPicker('load', (slotIndex) => {
                if (slotIndex !== null) {
                    this.loadGameFromSlot(slotIndex);
                }
                // Return to title if cancelled or after load attempt
                this.changeState(GameState.TITLE);
            });
            this.changeState(GameState.LOAD_SLOTS);
        } else if (action === 'settings') {
            this.previousState = GameState.TITLE;
            this.screens.resetSelection();
            this.changeState(GameState.SETTINGS);
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

        // Update enemy patrol movement
        this.updateEnemies(deltaTime);

        // Check player-enemy collision (triggers combat)
        this.checkEnemyCollision();

        // Check floor item pickup
        this.checkItemPickup();

        // Update item notifications
        this.inventory.updateNotifications(deltaTime);

        // Check proximity to interactables
        this.checkNearInteractable();

        // Handle SPACE interaction
        if (this.input.wasPressed(' ') || this.input.wasPressed('e') || this.input.wasPressed('E')) {
            this.handleInteract();
        }

        // Check I key -> inventory
        if (this.input.wasPressed('i') || this.input.wasPressed('I')) {
            this.inventory.open();
            this.changeState(GameState.INVENTORY);
            return;
        }

        // Check Escape -> pause
        if (this.input.wasPressed('Escape')) {
            this.screens.resetSelection();
            this.changeState(GameState.PAUSED);
            return;
        }

        // Auto-save periodically
        if (currentTime - this.lastSaveTime >= CONFIG.AUTO_SAVE_INTERVAL) {
            this.autoSave();
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
                        this.updateCheckpoint();
                        // Show save slot picker
                        this.saveSystem.showSlotPicker('save', (slotIndex) => {
                            if (slotIndex !== null) {
                                this.saveToSlot(slotIndex);
                            }
                            this.changeState(GameState.PLAYING);
                        });
                        this.previousState = GameState.PLAYING;
                        this.changeState(GameState.SAVE_SLOTS);
                        break;
                    case 'stairs':
                        console.log('Stairs interaction — level transition not yet implemented');
                        break;
                    case 'door_locked':
                        // Check if player has a key
                        if (this.inventory.hasItem('catacomb_key')) {
                            this.inventory.removeItem('catacomb_key');
                            this.map.unlockDoor(this.nearTile.x, this.nearTile.y);
                            // Open the door immediately after unlocking
                            this.map.interact(this.nearTile.x, this.nearTile.y);
                            this.inventory.showNotification('Used Catacomb Key!');
                        } else {
                            this.inventory.showNotification('This door is locked.');
                        }
                        break;
                    case 'chest_opened':
                        // Add chest contents to inventory
                        if (result.contents) {
                            const added = this.inventory.addItem(result.contents);
                            if (added) {
                                const def = this.inventory.getDef(result.contents);
                                const itemName = def ? def.name : result.contents;
                                this.inventory.showNotification(`Obtained ${itemName}!`);
                            } else {
                                this.inventory.showNotification('Inventory full!');
                            }
                        }
                        break;
                }
            }
        }
    }

    updatePaused() {
        const action = this.screens.update(this.input, 'pause');
        if (action === 'resume') {
            this.changeState(GameState.PLAYING);
        } else if (action === 'settings') {
            this.previousState = GameState.PAUSED;
            this.screens.resetSelection();
            this.changeState(GameState.SETTINGS);
        } else if (action === 'exit_title') {
            this.autoSave(); // Auto-save before exiting
            this.player = null;
            this.map = null;
            this.npcs = [];
            this.enemies = [];
            this.worldItems = [];
            this.screens.resetSelection();
            this.changeState(GameState.TITLE);
        }
    }

    updateSettings() {
        const action = this.screens.update(this.input, 'settings');
        if (action === 'back') {
            this.screens.resetSelection();
            this.changeState(this.previousState || GameState.TITLE);
        }
    }

    updateSlotPicker() {
        this.saveSystem.updateSlotPicker(this.input);
        // Picker handles its own callback and state changes
    }

    updateDialogue(deltaTime) {
        this.dialogue.update(this.input);

        // If the dialogue system closed itself (e.g. via Escape), return to PLAYING
        if (!this.dialogue.isActive()) {
            this.changeState(GameState.PLAYING);
        }
    }

    updateCombat(deltaTime) {
        this.combat.update(deltaTime, this.input);

        // Check if combat has finished (fade-out complete)
        if (this.combat.isFinished()) {
            const result = this.combat.endCombat();

            if (result.outcome === 'victory') {
                // Remove defeated enemy from the map
                this.enemies = this.enemies.filter(e => e.id !== result.enemyId);
                this.defeatedEnemies.add(result.enemyId);
                console.log(`Enemy "${result.enemyId}" removed from map. XP gained: ${result.xpGained}`);

                // Add item drops to inventory
                if (result.itemsGained && result.itemsGained.length > 0) {
                    for (const itemId of result.itemsGained) {
                        const added = this.inventory.addItem(itemId);
                        if (added) {
                            const def = this.inventory.getDef(itemId);
                            const itemName = def ? def.name : itemId;
                            this.inventory.showNotification(`Obtained ${itemName}!`);
                        }
                    }
                }

                // Auto-save after combat victory
                this.autoSave();
            } else {
                // Defeat: respawn player at checkpoint with 50% HP
                this.player.x = this.checkpointX;
                this.player.y = this.checkpointY;
                console.log('Player respawned at checkpoint');
            }

            this.changeState(GameState.PLAYING);
        }
    }

    updateInventory(deltaTime) {
        this.inventory.updateNotifications(deltaTime);
        const result = this.inventory.update(this.input, this.player);
        if (result === 'close') {
            this.changeState(GameState.PLAYING);
        }
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
            case GameState.SETTINGS:
                // Render previous screen in background
                if (this.previousState === GameState.PLAYING || this.previousState === GameState.PAUSED) {
                    this.renderPlaying();
                } else {
                    this.screens.renderTitle(this.renderer.ctx, this.canvas);
                }
                this.screens.renderSettings(this.renderer.ctx, this.canvas);
                break;
            case GameState.SAVE_SLOTS:
            case GameState.LOAD_SLOTS:
                // Render previous screen in background
                if (this.previousState === GameState.PLAYING) {
                    this.renderPlaying();
                } else {
                    this.screens.renderTitle(this.renderer.ctx, this.canvas);
                }
                this.saveSystem.renderSlotPicker(this.renderer.ctx, this.canvas);
                break;
        }

        // Render save notification on top of everything
        this.saveSystem.renderNotification(this.renderer.ctx, this.canvas);
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
            enemies: this.enemies,
            worldItems: this.worldItems,
            nearInteractable: this.nearInteractable
        });

        // Render HUD on top of game world
        this.hud.render(this.renderer.ctx, this.canvas, this);

        // Draw item notifications on top of HUD
        this.inventory.renderNotifications(this.renderer.ctx, this.canvas);
    }

    renderDialogue() {
        this.dialogue.render(this.renderer.ctx, this.canvas);
    }

    renderCombat() {
        this.combat.render(this.renderer.ctx, this.canvas);
    }

    renderInventory() {
        this.inventory.render(this.renderer.ctx, this.canvas);
        this.inventory.renderNotifications(this.renderer.ctx, this.canvas);
    }

    // ── Enemy systems ──────────────────────────────────────────────

    /**
     * Update enemy patrol movement.
     * Enemies walk back and forth horizontally within their patrol range.
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            // Simple horizontal patrol
            enemy.x += enemy.patrolSpeed * enemy.patrolDirection;

            // Reverse direction at patrol bounds
            const distFromOrigin = enemy.x - enemy.originX;
            if (Math.abs(distFromOrigin) >= enemy.patrolRange) {
                enemy.patrolDirection *= -1;
                // Clamp to patrol bounds
                enemy.x = enemy.originX + enemy.patrolRange * Math.sign(distFromOrigin);
            }

            // Also check tile collision — reverse if hitting a wall
            const halfSize = enemy.size / 2;
            const checkX = enemy.patrolDirection > 0
                ? enemy.x + halfSize
                : enemy.x - halfSize;
            const tileX = worldToGrid(checkX, this.tileSize);
            const tileY = worldToGrid(enemy.y, this.tileSize);

            if (this.map && this.map.isSolid(tileX, tileY)) {
                enemy.patrolDirection *= -1;
                // Step back
                enemy.x -= enemy.patrolSpeed * enemy.patrolDirection;
            }
        }
    }

    /**
     * Check if the player collides with any enemy.
     * If so, start combat.
     */
    checkEnemyCollision() {
        if (!this.player || this.enemies.length === 0) return;

        const playerHalf = this.player.size / 2;
        const playerBox = {
            x: this.player.x - playerHalf,
            y: this.player.y - playerHalf,
            width: this.player.size,
            height: this.player.size
        };

        for (const enemy of this.enemies) {
            const enemyHalf = enemy.size / 2;
            const enemyBox = {
                x: enemy.x - enemyHalf,
                y: enemy.y - enemyHalf,
                width: enemy.size,
                height: enemy.size
            };

            if (aabbCollision(playerBox, enemyBox)) {
                this.startCombatWithEnemy(enemy);
                return;
            }
        }
    }

    /**
     * Check if player overlaps a floor item and auto-pickup.
     */
    checkItemPickup() {
        if (!this.player || this.worldItems.length === 0) return;

        const pickupRange = this.tileSize * 0.6;

        for (const item of this.worldItems) {
            if (item.pickedUp) continue;

            const dx = this.player.x - item.x;
            const dy = this.player.y - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= pickupRange) {
                const added = this.inventory.addItem(item.type);
                if (added) {
                    item.pickedUp = true;
                    const def = this.inventory.getDef(item.type);
                    const itemName = def ? def.name : item.type;
                    this.inventory.showNotification(`Obtained ${itemName}!`);
                } else {
                    // Only show full message once per item
                    if (!item.fullWarningShown) {
                        this.inventory.showNotification('Inventory full!');
                        item.fullWarningShown = true;
                    }
                }
            }
        }
    }

    /**
     * Initiate combat with a specific enemy.
     * @param {Object} enemy - Enemy map entity
     */
    startCombatWithEnemy(enemy) {
        const def = this.enemyDefs[enemy.type];
        if (!def) {
            console.error(`Cannot start combat: no definition for enemy type "${enemy.type}"`);
            return;
        }

        console.log(`Starting combat with ${enemy.name} (${enemy.id})`);
        this.combat.startCombat(this.player, def, enemy.id, this.currentLevel);
        this.changeState(GameState.COMBAT);
    }

    /**
     * Update the checkpoint position (called when player interacts with an altar).
     */
    updateCheckpoint() {
        if (this.player) {
            this.checkpointX = this.player.x;
            this.checkpointY = this.player.y;
            console.log(`Checkpoint updated: ${worldToGrid(this.checkpointX, this.tileSize)}, ${worldToGrid(this.checkpointY, this.tileSize)}`);
        }
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

        // Save defeated enemies
        saveData.defeatedEnemies = [...this.defeatedEnemies];

        // Save inventory
        if (this.inventory) {
            saveData.inventory = this.inventory.toSaveData();
        }

        // Save equipment bonus
        if (this.player.equipmentBonus) {
            saveData.equipmentBonus = { ...this.player.equipmentBonus };
        }

        // Save picked-up state of world items
        if (this.worldItems.length > 0) {
            saveData.pickedUpItems = this.worldItems
                .filter(i => i.pickedUp)
                .map(i => i.id);
        }

        // Save checkpoint
        saveData.checkpointX = this.checkpointX;
        saveData.checkpointY = this.checkpointY;

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

                    // Restore defeated enemies
                    if (data.defeatedEnemies) {
                        this.defeatedEnemies = new Set(data.defeatedEnemies);
                        // Remove defeated enemies from current enemy list
                        this.enemies = this.enemies.filter(e => !this.defeatedEnemies.has(e.id));
                        console.log(`Defeated enemies restored: ${this.defeatedEnemies.size}`);
                    }

                    // Restore checkpoint
                    if (data.checkpointX !== undefined) {
                        this.checkpointX = data.checkpointX;
                        this.checkpointY = data.checkpointY;
                    }

                    // Restore inventory
                    if (data.inventory && this.inventory) {
                        // Reset equipment bonus before restoring (fromSaveData re-applies)
                        this.player.equipmentBonus = { defense: 0, attack: 0, wisdom: 0 };
                        this.inventory.fromSaveData(data.inventory, this.player);
                        console.log(`Inventory restored: ${this.inventory.items.length} items`);
                    }

                    // Restore picked-up world items
                    if (data.pickedUpItems && this.worldItems.length > 0) {
                        const pickedSet = new Set(data.pickedUpItems);
                        for (const item of this.worldItems) {
                            if (pickedSet.has(item.id)) {
                                item.pickedUp = true;
                            }
                        }
                        console.log(`Picked-up items restored: ${data.pickedUpItems.length}`);
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

    // Reset save (legacy — not used with slot system)
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

    /**
     * Auto-save to the current active slot.
     */
    autoSave() {
        if (!this.player) return;
        this.saveSystem.autoSave(this);
    }

    /**
     * Save to a specific slot (called from save slot picker).
     */
    saveToSlot(slotIndex) {
        if (!this.player) return;
        this.saveSystem.saveToSlot(slotIndex, this);
    }

    /**
     * Load game from a specific slot.
     */
    async loadGameFromSlot(slotIndex) {
        const saveData = this.saveSystem.loadFromSlot(slotIndex);
        if (!saveData) {
            console.error('Failed to load save from slot', slotIndex);
            return;
        }

        // Show loading state
        this.changeState(GameState.LOADING);

        // Create player at default position
        this.player = new Player(
            this.tileSize * 2.5,
            this.tileSize * 2.5
        );

        // Load enemy definitions, questions, and item definitions in parallel
        await Promise.all([
            this.loadEnemyDefs(),
            this.questions.load(),
            this.inventory.load()
        ]);

        // Load the level from save data
        const success = await this.loadLevel(saveData.currentLevel);

        if (success) {
            // Register level dialogue content
            if (window.LEVEL1_DIALOGUES) {
                this.dialogue.registerDialogues(window.LEVEL1_DIALOGUES);
            }

            // Restore all save data
            this.restoreSaveData(saveData);

            // Reset session start time
            this.sessionStartTime = performance.now();
            this.lastSaveTime = this.sessionStartTime;

            this.changeState(GameState.PLAYING);
        } else {
            console.error('Failed to load level from save, returning to title');
            this.changeState(GameState.TITLE);
        }
    }

    /**
     * Restore game state from save data.
     */
    restoreSaveData(data) {
        // Restore player position and stats
        this.player.x = data.playerX;
        this.player.y = data.playerY;
        this.player.direction = data.playerDirection || 'down';
        this.player.hp = data.hp;
        this.player.maxHp = data.maxHp;
        this.player.attack = data.attack;
        this.player.defense = data.defense;
        this.player.xp = data.xp;
        this.player.level = data.level;
        this.player.xpThreshold = data.xpThreshold;

        // Restore checkpoint
        this.checkpointX = data.checkpointX;
        this.checkpointY = data.checkpointY;

        // Restore tile state (doors, chests, etc.)
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

        // Restore defeated enemies
        if (data.defeatedEnemies) {
            this.defeatedEnemies = new Set(data.defeatedEnemies);
            this.enemies = this.enemies.filter(e => !this.defeatedEnemies.has(e.id));
            console.log(`Defeated enemies restored: ${this.defeatedEnemies.size}`);
        }

        // Restore inventory
        if (data.inventory && this.inventory) {
            this.player.equipmentBonus = { defense: 0, attack: 0, wisdom: 0 };
            this.inventory.fromSaveData(data.inventory, this.player);
            console.log(`Inventory restored: ${this.inventory.items.length} items`);
        }

        // Restore picked-up world items
        if (data.pickedUpItems && this.worldItems.length > 0) {
            const pickedSet = new Set(data.pickedUpItems);
            for (const item of this.worldItems) {
                if (pickedSet.has(item.id)) {
                    item.pickedUp = true;
                }
            }
            console.log(`Picked-up items restored: ${data.pickedUpItems.length}`);
        }

        console.log('Game state restored from slot');
    }
}

// Expose Game globally
window.Game = Game;
