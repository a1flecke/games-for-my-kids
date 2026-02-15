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
        this.puzzle = new PuzzleSystem();
        this.abilities = new AbilitySystem();
        this.audio = new AudioManager();

        // Wire question system into combat
        this.combat.questionSystem = this.questions;

        // Wire inventory and abilities into combat
        this.combat.inventory = this.inventory;
        this.combat.abilities = this.abilities;

        // Wire audio into subsystems
        this.combat.audio = this.audio;
        this.combat.canvas = canvas;
        this.dialogue.audio = this.audio;
        this.saveSystem.audio = this.audio;

        // Wire settings changes to audio system and colorblind mode
        this.screens.onSettingsChanged = (settings) => {
            this.audio.applySettings(settings);
            this._applyColorblindMode(settings.colorblindMode);
        };

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

        // Victory stats and callback (set when entering VICTORY state)
        this.victoryStats = null;
        this.victoryCallback = null;
    }

    init() {
        console.log('Game initialized');

        // Attach canvas for touch controls (detects touch device, sets up listeners)
        this.input.attachCanvas(this.canvas);

        // Attach audio listeners for Safari interaction gate
        this.audio.attachListeners();

        // Apply saved audio settings from ScreenManager
        this.audio.applySettings(this.screens.settings);

        // Apply saved colorblind mode
        if (this.screens.settings.colorblindMode) {
            this._applyColorblindMode(true);
        }

        // Register service worker for offline play
        this._registerServiceWorker();

        // Disable "Continue" if no saves exist at startup
        this.screens.titleDisabled[1] = !this.saveSystem.hasSaveData();

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

        // Update music based on new state
        this._updateMusicForState(newState);

        // Disable "Continue" on title screen when no saves exist
        if (newState === GameState.TITLE) {
            this.screens.titleDisabled[1] = !this.saveSystem.hasSaveData();
        }
    }

    /** Play the appropriate music track for the current game state. */
    _updateMusicForState(state) {
        switch (state) {
            case GameState.TITLE:
                this.audio.playMusic('title');
                break;
            case GameState.PLAYING:
                this.audio.playMusic('exploration');
                break;
            case GameState.COMBAT:
                this.audio.playMusic('combat');
                break;
            case GameState.VICTORY:
            case GameState.GAME_COMPLETE:
                this.audio.stopMusic(0.5);
                this.audio.playSFX('victory');
                break;
            // Paused/dialogue/inventory keep current music
        }
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

                    const enemyObj = {
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
                        patrolDirection: 1,
                        patrolAxis: 'x',
                        size: CONFIG.TILE_SIZE,
                        // Stealth system (for patrol guards with routes)
                        isStealth: def.stealth || false,
                        alertLevel: 0,       // 0 = idle, 0-1 = detecting, >= 1 = alerted
                        visionCone: null,     // Set each frame for stealth enemies
                        facingDirection: 'right' // Updated during patrol
                    };

                    // Waypoint patrol route (from level JSON)
                    if (enemySpawn.patrolRoute && enemySpawn.patrolRoute.length > 1) {
                        enemyObj.patrolRoute = enemySpawn.patrolRoute.map(wp => ({
                            x: gridToWorld(wp.x, this.tileSize),
                            y: gridToWorld(wp.y, this.tileSize)
                        }));
                        enemyObj.patrolWaypointIndex = 0;
                        enemyObj.useWaypoints = true;
                    } else {
                        enemyObj.useWaypoints = false;
                    }

                    this.enemies.push(enemyObj);
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

    /** Update HTML loading progress bar (0-100) */
    _setLoadingProgress(percent) {
        const el = document.getElementById('loadingProgress');
        if (el) el.style.width = `${percent}%`;
    }

    /** Create player, load level, transition to PLAYING */
    async startNewGame() {
        // Show loading state
        this.changeState(GameState.LOADING);
        this._setLoadingProgress(10);

        // Create player at default position (will be updated by loadLevel)
        this.player = new Player(
            this.tileSize * 2.5,
            this.tileSize * 2.5
        );

        // Load enemy definitions, questions, and item definitions in parallel
        this._setLoadingProgress(30);
        await Promise.all([
            this.loadEnemyDefs(),
            this.questions.load(),
            this.inventory.load()
        ]);
        this._setLoadingProgress(70);

        // Load level 1
        const success = await this.loadLevel(1);
        this._setLoadingProgress(100);

        if (success) {
            // Register level dialogue content
            this.registerLevelDialogues(1);

            // Reset session start time for playtime tracking
            this.sessionStartTime = performance.now();
            this.lastSaveTime = this.sessionStartTime;

            this.changeState(GameState.PLAYING);

            // Tutorial: movement hint on first new game
            this.hud.showNotification('Use WASD or Arrow Keys to move!', 'info');
            this.dialogue.setFlag('tutorial_movement');
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
            case GameState.PUZZLE:
                this.updatePuzzle(deltaTime);
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
            case GameState.VICTORY:
                this.updateVictory();
                break;
            case GameState.GAME_COMPLETE:
                this.updateGameComplete(deltaTime);
                break;
        }

        // Update notifications in HUD
        this.hud.updateNotifications(deltaTime);
        this.saveSystem.updateNotifications(deltaTime);

        // F3 toggles debug UI overlay
        if (this.input.wasPressed('F3')) {
            const ui = document.getElementById('ui');
            if (ui) {
                ui.style.display = ui.style.display === 'none' ? '' : 'none';
            }
        }
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
        this.updatePlayerMovement(deltaTime);

        // Update enemy patrol movement
        this.updateEnemies(deltaTime);

        // Check player-enemy collision (triggers combat)
        this.checkEnemyCollision();

        // If enemy collision changed state (combat or boss dialogue), stop processing
        if (this.state !== GameState.PLAYING) return;

        // Check stealth bypass bonus (sneaking past patrol guards)
        this.checkStealthBypass();

        // Check floor item pickup
        this.checkItemPickup();

        // Update item notifications
        this.inventory.updateNotifications(deltaTime);

        // Check proximity to interactables
        this.checkNearInteractable();

        // Tutorial: show interact hint when first near an NPC
        if (this.nearNPC && !this.dialogue.getFlag('tutorial_interact')) {
            this.dialogue.setFlag('tutorial_interact');
            this.hud.showNotification('Press SPACE or E to talk!', 'info');
        }

        // Tutorial: show stealth hint when first near a patrol guard (Level 2+)
        if (!this.dialogue.getFlag('tutorial_stealth')) {
            for (const enemy of this.enemies) {
                if (enemy.isStealth) {
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.tileSize * 7) {
                        this.dialogue.setFlag('tutorial_stealth');
                        this.hud.showNotification('Hide in dark alcoves to avoid guards!', 'warning');
                        break;
                    }
                }
            }
        }

        // Tutorial: show save hint when first near an altar
        if (this.nearTile && !this.dialogue.getFlag('tutorial_save')) {
            const tileType = this.map.getTile(this.nearTile.x, this.nearTile.y);
            if (tileType === TileType.ALTAR) {
                this.dialogue.setFlag('tutorial_save');
                this.hud.showNotification('You can save at glowing altars!', 'info');
            }
        }

        // Handle SPACE interaction
        if (this.input.wasPressed(' ') || this.input.wasPressed('e') || this.input.wasPressed('E')) {
            this.handleInteract();
        }

        // Check ability keys (4, 5, 6) when abilities are available (Level 4+)
        if (this.currentLevel >= 4) {
            const abilityMsg = this.abilities.update(this.input, this.dialogue.questFlags);
            if (abilityMsg) {
                this.hud.showNotification(abilityMsg, 'info');
            }
        }

        // Check M key -> mute toggle
        if (this.input.wasPressed('m') || this.input.wasPressed('M')) {
            const muted = this.audio.toggleMute();
            this.hud.showNotification(muted ? 'Audio Muted' : 'Audio Unmuted', 'info');
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
    updatePlayerMovement(deltaTime) {
        const player = this.player;
        const timeScale = (deltaTime || 16.67) / 16.67; // Normalize to 60fps
        const speed = player.speed * timeScale;
        let dx = 0;
        let dy = 0;

        if (player.moving.up) {
            dy -= speed;
            player.direction = 'up';
        }
        if (player.moving.down) {
            dy += speed;
            player.direction = 'down';
        }
        if (player.moving.left) {
            dx -= speed;
            player.direction = 'left';
        }
        if (player.moving.right) {
            dx += speed;
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

            // Special handling for council lectern (puzzle trigger)
            if (this.nearNPC.id === 'council_lectern' && this.currentLevel === 3) {
                this._handleCouncilLectern();
                return;
            }

            // Special handling for library guardian (ability check)
            if (this.nearNPC.id === 'library_guardian' && this.currentLevel === 4) {
                this._handleLibraryGuardian();
                return;
            }

            if (result.dialogueId) {
                this.dialogue.startDialogue(result.dialogueId, () => {
                    // Check for coin/token/fragment rewards after dialogue
                    this.checkDialogueRewards();
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
                        this.audio.playSFX('save');
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
                        this.handleStairsInteraction();
                        break;
                    case 'door_locked':
                        // Check if player has a key
                        if (this.inventory.hasItem('catacomb_key')) {
                            this.inventory.removeItem('catacomb_key');
                            this.map.unlockDoor(this.nearTile.x, this.nearTile.y);
                            // Open the door immediately after unlocking
                            this.map.interact(this.nearTile.x, this.nearTile.y);
                            this.inventory.showNotification('Used Catacomb Key!');
                            this.audio.playSFX('door_open');
                        } else {
                            this.inventory.showNotification('This door is locked.');
                        }
                        break;
                    case 'chest_opened':
                        // Add chest contents to inventory
                        this.audio.playSFX('chest');
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
                    case 'hidden_wall':
                        this._handleHiddenWall(result.x, result.y);
                        break;
                    case 'latin_tile':
                        this._handleLatinTile(result.x, result.y);
                        break;
                    case 'barrier':
                        this._handleBarrier(result.x, result.y);
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
        // But only if the completion callback hasn't already changed state
        if (!this.dialogue.isActive() && this.state === GameState.DIALOGUE) {
            this.changeState(GameState.PLAYING);
        }
    }

    updateCombat(deltaTime) {
        this.combat.update(deltaTime, this.input);

        // Check if combat has finished (fade-out complete)
        if (this.combat.isFinished()) {
            const wasBoss = this.combat.enemy && this.combat.enemy.isBoss;
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

                // Boss post-victory dialogue
                if (wasBoss) {
                    const victoryDialogueMap = { 1: 'boss_victory', 2: 'boss_victory_l2', 3: 'boss_victory_l3', 4: 'boss_victory_l4', 5: 'boss_victory_l5' };
                    const victoryDialogue = victoryDialogueMap[this.currentLevel] || 'boss_victory';
                    this.dialogue.startDialogue(victoryDialogue, () => {
                        this.checkDialogueRewards();
                        this.changeState(GameState.PLAYING);
                    });
                    this.changeState(GameState.DIALOGUE);
                    return;
                }

                this.changeState(GameState.PLAYING);
            } else {
                // Defeat: respawn player at checkpoint with 50% HP
                this.player.x = this.checkpointX;
                this.player.y = this.checkpointY;
                this.hud.showNotification('Try using Defend or Questions!', 'warning');
                console.log('Player respawned at checkpoint');
                this.changeState(GameState.PLAYING);
            }
        }
    }

    updateInventory(deltaTime) {
        this.inventory.updateNotifications(deltaTime);
        const result = this.inventory.update(this.input, this.player);
        if (result === 'close') {
            this.changeState(GameState.PLAYING);
        }
    }

    updatePuzzle(deltaTime) {
        const result = this.puzzle.update(this.input, deltaTime);
        if (result === 'solved') {
            // Puzzle solved — unlock the debate hall door and show completion dialogue
            this.dialogue.setFlag('puzzle_solved');
            // Unlock the debate hall door at (10,3)
            if (this.map) {
                this.map.unlockDoor(10, 3);
                this.map.interact(10, 3); // Open it
            }
            this.dialogue.startDialogue('puzzle_complete', () => {
                this.checkDialogueRewards();
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
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
            case GameState.PUZZLE:
                this.renderPlaying();
                this.puzzle.render(this.renderer.ctx, this.canvas);
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
            case GameState.VICTORY:
                this.screens.renderVictory(this.renderer.ctx, this.canvas, this.victoryStats || {});
                break;
            case GameState.GAME_COMPLETE:
                this.screens.renderGameComplete(this.renderer.ctx, this.canvas, this.victoryStats || {}, this.creditsScrollY || 0);
                break;
        }

        // Render save notification on top of everything
        this.saveSystem.renderNotification(this.renderer.ctx, this.canvas);
    }

    renderLoading() {
        const ctx = this.renderer.ctx;
        const a = CONFIG.ACCESSIBILITY;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        ctx.fillStyle = a.bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = a.textColor;
        ctx.font = `bold 28px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', cx, cy - 20);

        ctx.font = `18px ${a.fontFamily}`;
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.fillText('Preparing the catacombs', cx, cy + 20);

        // Canvas-based progress bar
        const barW = 240;
        const barH = 12;
        const barX = cx - barW / 2;
        const barY = cy + 50;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barW, barH);

        // Animated indeterminate shimmer
        const shimmer = (Date.now() % 2000) / 2000;
        const fillW = barW * 0.3;
        const fillX = barX + (barW - fillW) * shimmer;
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.fillRect(fillX, barY, fillW, barH);

        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
    }

    renderPlaying() {
        // Pass active ability to renderer for tile effect rendering
        this.renderer.abilityActive = this.abilities.activeAbility;

        this.renderer.render({
            player: this.player,
            map: this.map,
            npcs: this.npcs,
            enemies: this.enemies,
            worldItems: this.worldItems,
            nearInteractable: this.nearInteractable
        });

        // Show "Hidden" indicator if player is in a hiding spot
        if (this.player && this.map) {
            const pt = this.player.getTilePosition();
            if (this.map.getTile(pt.x, pt.y) === TileType.HIDING) {
                const ctx = this.renderer.ctx;
                const a = CONFIG.ACCESSIBILITY;
                ctx.font = `bold 14px ${a.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const screenPos = this.renderer.camera.worldToScreen(this.player.x, this.player.y);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.strokeText('HIDDEN', screenPos.x, screenPos.y - this.player.size - 4);
                ctx.fillStyle = '#88cc88';
                ctx.fillText('HIDDEN', screenPos.x, screenPos.y - this.player.size - 4);
            }
        }

        // Render HUD on top of game world (pass input for touch controls)
        this.hud.render(this.renderer.ctx, this.canvas, this);

        // Render ability icons (Level 4+)
        if (this.currentLevel >= 4) {
            this.abilities.renderHUD(this.renderer.ctx, this.canvas, this.dialogue.questFlags);
        }

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
     * Supports both simple back-and-forth patrol and waypoint-based routes.
     * For stealth enemies, also updates vision cones and detection.
     */
    updateEnemies(deltaTime) {
        const timeScale = (deltaTime || 16.67) / 16.67;
        for (const enemy of this.enemies) {
            if (enemy.useWaypoints) {
                this.updateWaypointPatrol(enemy, timeScale);
            } else {
                this.updateSimplePatrol(enemy, timeScale);
            }

            // Update vision cone for stealth enemies
            if (enemy.isStealth) {
                this.updateVisionCone(enemy);
                this.updateDetection(enemy, deltaTime);
            }
        }
    }

    /**
     * Simple horizontal back-and-forth patrol (original behavior).
     */
    updateSimplePatrol(enemy, timeScale) {
        const scaledSpeed = enemy.patrolSpeed * timeScale;
        enemy.x += scaledSpeed * enemy.patrolDirection;

        // Reverse direction at patrol bounds
        const distFromOrigin = enemy.x - enemy.originX;
        if (Math.abs(distFromOrigin) >= enemy.patrolRange) {
            enemy.patrolDirection *= -1;
            enemy.x = enemy.originX + enemy.patrolRange * Math.sign(distFromOrigin);
        }

        // Track facing direction
        enemy.facingDirection = enemy.patrolDirection > 0 ? 'right' : 'left';

        // Check tile collision
        const halfSize = enemy.size / 2;
        const checkX = enemy.patrolDirection > 0
            ? enemy.x + halfSize
            : enemy.x - halfSize;
        const tileX = worldToGrid(checkX, this.tileSize);
        const tileY = worldToGrid(enemy.y, this.tileSize);

        if (this.map && this.map.isSolid(tileX, tileY)) {
            // Correct position before flipping (undo this frame's move)
            enemy.x -= scaledSpeed * enemy.patrolDirection;
            enemy.patrolDirection *= -1;
        }
    }

    /**
     * Waypoint-based patrol: enemy moves toward next waypoint, advances when reached.
     */
    updateWaypointPatrol(enemy, timeScale) {
        const scaledSpeed = enemy.patrolSpeed * timeScale;
        const route = enemy.patrolRoute;
        const target = route[enemy.patrolWaypointIndex];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < scaledSpeed * 2) {
            // Reached waypoint — advance to next
            enemy.patrolWaypointIndex = (enemy.patrolWaypointIndex + 1) % route.length;
        } else {
            // Move toward waypoint
            const nx = dx / dist;
            const ny = dy / dist;
            enemy.x += nx * scaledSpeed;
            enemy.y += ny * scaledSpeed;

            // Update facing direction based on dominant movement axis
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.facingDirection = dx > 0 ? 'right' : 'left';
            } else {
                enemy.facingDirection = dy > 0 ? 'down' : 'up';
            }
        }
    }

    /**
     * Update a stealth enemy's vision cone data (used for rendering and detection).
     */
    updateVisionCone(enemy) {
        const coneLength = this.tileSize * 4; // 4 tiles long
        const coneHalfWidth = this.tileSize * 2; // 2 tiles wide at the far end

        // Check if player has ichthys_pendant equipped (reduces detection range)
        let lengthMultiplier = 1.0;
        if (this.inventory && this.inventory.equipped && this.inventory.equipped.accessory) {
            const equipped = this.inventory.equipped.accessory;
            if (equipped === 'ichthys_pendant') {
                lengthMultiplier = 0.6;
            }
        }

        enemy.visionCone = {
            direction: enemy.facingDirection,
            length: coneLength * lengthMultiplier,
            halfWidth: coneHalfWidth * lengthMultiplier
        };
    }

    /**
     * Check if player is in a stealth enemy's vision cone and update detection.
     */
    updateDetection(enemy, deltaTime) {
        if (!this.player) return;

        // Check if player is hiding in an alcove
        const playerTile = this.player.getTilePosition();
        const playerTileType = this.map ? this.map.getTile(playerTile.x, playerTile.y) : TileType.FLOOR;
        const isHiding = playerTileType === TileType.HIDING;

        if (isHiding) {
            // Player is hidden — reduce alert
            enemy.alertLevel = Math.max(0, enemy.alertLevel - (deltaTime / 1000));
            return;
        }

        // Check if player is inside the vision cone
        const cone = enemy.visionCone;
        if (!cone) return;

        const playerInCone = this.isPointInVisionCone(
            this.player.x, this.player.y,
            enemy.x, enemy.y,
            cone.direction, cone.length, cone.halfWidth
        );

        if (playerInCone) {
            // Build up detection (0.5 seconds to full alert)
            enemy.alertLevel += (deltaTime / 500);

            if (enemy.alertLevel >= 1.0) {
                enemy.alertLevel = 1.0;
                // Trigger forced combat (harder: enemy gets first strike handled in combat)
                this.triggerStealthCombat(enemy);
            }
        } else {
            // Slowly reduce alert when player leaves cone
            enemy.alertLevel = Math.max(0, enemy.alertLevel - (deltaTime / 1500));
        }
    }

    /**
     * Check if a point is inside a vision cone.
     */
    isPointInVisionCone(px, py, ex, ey, direction, length, halfWidth) {
        const dx = px - ex;
        const dy = py - ey;

        // Project onto the cone's forward axis
        let forward, lateral;
        switch (direction) {
            case 'right':  forward = dx;  lateral = dy; break;
            case 'left':   forward = -dx; lateral = dy; break;
            case 'down':   forward = dy;  lateral = dx; break;
            case 'up':     forward = -dy; lateral = dx; break;
            default: return false;
        }

        // Must be in front of the guard and within range
        if (forward <= 0 || forward > length) return false;

        // The cone widens linearly from 0 at the guard to halfWidth at max range
        const allowedLateral = (forward / length) * halfWidth;
        return Math.abs(lateral) <= allowedLateral;
    }

    /**
     * Trigger combat from stealth detection (harder combat).
     */
    triggerStealthCombat(enemy) {
        // Reset alert so it doesn't re-trigger
        enemy.alertLevel = 0;

        // Show detection message
        this.hud.showNotification('You were spotted!', 'error');

        // Start combat — stealth enemies are tougher when they catch you
        this.startCombatWithEnemy(enemy);
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
                // Boss pre-fight dialogue (first encounter only)
                const prefightFlagMap = { 1: 'boss_prefight_shown', 2: 'boss_prefight_l2_shown', 3: 'boss_prefight_l3_shown', 4: 'boss_prefight_l4_shown', 5: 'boss_prefight_l5_shown' };
                const prefightDialogueMap = { 1: 'boss_prefight', 2: 'boss_prefight_l2', 3: 'boss_prefight_l3', 4: 'boss_prefight_l4', 5: 'boss_prefight_l5' };
                const prefightFlag = prefightFlagMap[this.currentLevel] || 'boss_prefight_shown';
                const prefightDialogue = prefightDialogueMap[this.currentLevel] || 'boss_prefight';
                if (enemy.isBoss && !this.dialogue.getFlag(prefightFlag)) {
                    this.dialogue.setFlag(prefightFlag);
                    // Push player back to avoid immediate re-trigger
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const halfSize = this.player.size / 2;

                    // Try full tile push-back, then half, then quarter
                    let pushed = false;
                    for (const scale of [1, 0.5, 0.25]) {
                        const newX = this.player.x + (dx / dist) * this.tileSize * scale;
                        const newY = this.player.y + (dy / dist) * this.tileSize * scale;
                        if (this.map.isAreaWalkable(
                            newX - halfSize, newY - halfSize,
                            this.player.size, this.player.size
                        )) {
                            this.player.x = newX;
                            this.player.y = newY;
                            pushed = true;
                            break;
                        }
                    }
                    // If no valid push-back position, leave player in place

                    const enemyRef = enemy;
                    this.dialogue.startDialogue(prefightDialogue, () => {
                        this.startCombatWithEnemy(enemyRef);
                    });
                    this.changeState(GameState.DIALOGUE);
                    return;
                }

                // Tutorial combat hint (first combat only)
                if (!this.dialogue.getFlag('tutorial_combat')) {
                    this.hud.showNotification('Attack, Defend, or answer Questions!', 'info');
                    this.dialogue.setFlag('tutorial_combat');
                }

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
                    this.audio.playSFX('item_pickup');

                    // Tutorial: show inventory hint after first item pickup
                    if (!this.dialogue.getFlag('tutorial_inventory')) {
                        this.dialogue.setFlag('tutorial_inventory');
                        this.hud.showNotification('Press I to see your items!', 'info');
                    }
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
     * Check if the player has successfully sneaked past a stealth enemy.
     * Awards bonus XP for stealth bypass.
     */
    checkStealthBypass() {
        if (!this.player || this.enemies.length === 0) return;

        for (const enemy of this.enemies) {
            if (!enemy.isStealth || enemy.stealthBypassed) continue;

            // Check if player is behind the enemy (past its patrol route area)
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Player must be far enough away and have been near enough at some point
            if (dist > this.tileSize * 6) {
                // Check if player was ever close to this enemy (within 5 tiles)
                if (!enemy.playerWasNear) continue;

                enemy.stealthBypassed = true;
                const bonusXP = 15;
                this.player.gainXP(bonusXP);
                this.hud.showNotification(`Stealth bonus! +${bonusXP} XP`, 'success');
            } else if (dist < this.tileSize * 5) {
                enemy.playerWasNear = true;
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

        // Apply Ambrose's Courage bonus if unlocked
        if (this.abilities.isUnlocked('courage', this.dialogue.questFlags)) {
            this.combat.courageBonus = true;
        }

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

    /**
     * Check if dialogue set any reward flags and award items.
     * Called after dialogue completes. Supports Level 1 coins and Level 2 tokens.
     */
    checkDialogueRewards() {
        const flags = this.dialogue.questFlags;

        // Level 1: Apostle Coins
        const coinFlags = ['coin_peter', 'coin_james', 'coin_john'];
        for (const flag of coinFlags) {
            if (flags[flag] && !flags[`awarded_${flag}`]) {
                this.inventory.addItem('apostle_coin');
                this.inventory.showNotification('Obtained Apostle Coin!');
                this.dialogue.setFlag(`awarded_${flag}`);
                console.log(`Awarded apostle coin for ${flag}`);
            }
        }

        // Level 2: Martyr Tokens
        const tokenFlags = ['token_polycarp', 'token_ignatius', 'token_perpetua', 'token_felicity'];
        for (const flag of tokenFlags) {
            if (flags[flag] && !flags[`awarded_${flag}`]) {
                this.inventory.addItem('martyr_token');
                this.inventory.showNotification('Obtained Martyr Token!');
                this.dialogue.setFlag(`awarded_${flag}`);
                console.log(`Awarded martyr token for ${flag}`);
            }
        }

        // Level 3: Creed Fragments
        const fragmentFlags = ['fragment_1', 'fragment_2', 'fragment_3', 'fragment_4', 'fragment_5'];
        for (const flag of fragmentFlags) {
            if (flags[flag] && !flags[`awarded_${flag}`]) {
                this.inventory.addItem('creed_fragment');
                this.inventory.showNotification('Obtained Creed Fragment!');
                this.dialogue.setFlag(`awarded_${flag}`);
                console.log(`Awarded creed fragment for ${flag}`);
            }
        }

        // Level 4: Church Father Scrolls
        const scrollFlags = ['scroll_augustine', 'scroll_jerome', 'scroll_ambrose'];
        for (const flag of scrollFlags) {
            if (flags[flag] && !flags[`awarded_${flag}`]) {
                this.inventory.addItem('father_scroll');
                this.inventory.showNotification('Obtained Church Father Scroll!');
                this.dialogue.setFlag(`awarded_${flag}`);
                console.log(`Awarded father scroll for ${flag}`);
            }
        }
    }

    /**
     * Handle council lectern interaction for Level 3 puzzle.
     */
    _handleCouncilLectern() {
        const flags = this.dialogue.questFlags;

        // Already solved?
        if (flags.puzzle_solved) {
            this.inventory.showNotification('The Creed is already assembled!');
            return;
        }

        // Check if all 5 fragments are collected
        const fragmentCount = this.countCreedFragments();
        if (fragmentCount < 5) {
            this.dialogue.startDialogue('puzzle_not_ready', () => {
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
            return;
        }

        // All fragments collected — explain puzzle then start it
        if (!flags.puzzle_explained) {
            this.dialogue.startDialogue('puzzle_intro', () => {
                this.checkDialogueRewards();
                // Start puzzle after dialogue
                this.puzzle.start(() => {
                    // Puzzle solved callback handled in updatePuzzle
                });
                this.changeState(GameState.PUZZLE);
            });
            this.changeState(GameState.DIALOGUE);
        } else {
            // Already explained, start puzzle directly
            this.puzzle.start(() => {});
            this.changeState(GameState.PUZZLE);
        }
    }

    /**
     * Handle Library Guardian interaction for Level 4.
     * Checks if player has all 3 abilities, then unlocks forbidden library.
     */
    _handleLibraryGuardian() {
        const flags = this.dialogue.questFlags;

        if (flags.library_unlocked) {
            this.inventory.showNotification('The Library is already open!');
            return;
        }

        if (this.abilities.allUnlocked(flags)) {
            // Unlock the forbidden library doors
            if (this.map) {
                this.map.unlockDoor(11, 14);
                this.map.interact(11, 14);
                this.map.unlockDoor(12, 14);
                this.map.interact(12, 14);
            }
            this.dialogue.startDialogue('library_guardian_unlock', () => {
                this.checkDialogueRewards();
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
        } else {
            this.dialogue.startDialogue('library_guardian_intro', () => {
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
        }
    }

    /**
     * Handle hidden wall interaction (requires Augustine's Wisdom).
     */
    _handleHiddenWall(x, y) {
        if (!this.abilities.isActive('wisdom')) {
            this.inventory.showNotification('This wall looks unusual...');
            return;
        }

        if (this.map.revealHiddenWall(x, y)) {
            this.dialogue.setFlag('hidden_wall_revealed');
            this.hud.showNotification('Secret passage revealed!', 'success');
        }
    }

    /**
     * Handle Latin tile interaction (requires Jerome's Translation).
     */
    _handleLatinTile(x, y) {
        if (!this.abilities.isActive('translation')) {
            this.inventory.showNotification('There is Latin text here...');
            return;
        }

        const flags = this.dialogue.questFlags;
        // Determine which inscription based on position
        if (y === 2 && !flags.decoded_latin_1) {
            this.dialogue.startDialogue('latin_decoded_1', () => {
                this.checkDialogueRewards();
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
        } else if (y === 3 && !flags.decoded_latin_2) {
            this.dialogue.startDialogue('latin_decoded_2', () => {
                this.checkDialogueRewards();
                this.changeState(GameState.PLAYING);
            });
            this.changeState(GameState.DIALOGUE);
        } else {
            this.inventory.showNotification('You have already decoded this.');
        }
    }

    /**
     * Handle barrier interaction (requires Ambrose's Courage).
     */
    _handleBarrier(x, y) {
        if (!this.abilities.isActive('courage')) {
            this.inventory.showNotification('A solid barrier blocks the way.');
            return;
        }

        if (this.map.breakBarrier(x, y)) {
            this.dialogue.setFlag('barrier_broken');
            this.hud.showNotification('Barrier destroyed!', 'success');
        }
    }

    /**
     * Count creed fragments collected based on quest flags.
     */
    countCreedFragments() {
        const flags = this.dialogue.questFlags;
        let count = 0;
        if (flags.fragment_1) count++;
        if (flags.fragment_2) count++;
        if (flags.fragment_3) count++;
        if (flags.fragment_4) count++;
        if (flags.fragment_5) count++;
        return count;
    }

    /**
     * Handle stairs interaction — check victory conditions for the current level.
     */
    handleStairsInteraction() {
        if (this.currentLevel === 1) {
            this.handleLevel1Stairs();
        } else if (this.currentLevel === 2) {
            this.handleLevel2Stairs();
        } else if (this.currentLevel === 3) {
            this.handleLevel3Stairs();
        } else if (this.currentLevel === 4) {
            this.handleLevel4Stairs();
        } else if (this.currentLevel === 5) {
            this.handleLevel5Stairs();
        }
    }

    /**
     * Level 1 stairs: need 3 coins + boss defeated → victory dialogue → Level 2.
     */
    handleLevel1Stairs() {
        const flags = this.dialogue.questFlags;
        const coins = (flags.coin_peter ? 1 : 0) +
                      (flags.coin_james ? 1 : 0) +
                      (flags.coin_john ? 1 : 0);

        if (coins < 3) {
            this.inventory.showNotification(`You need ${3 - coins} more Apostle Coin(s)!`);
            return;
        }

        if (!flags.boss_defeated) {
            this.inventory.showNotification('The Roman Centurion still guards the path!');
            return;
        }

        // All conditions met — start victory dialogue then show victory screen
        this.dialogue.startDialogue('victory', () => {
            this.checkDialogueRewards();
            this.enterVictoryState(() => this.transitionToLevel(2));
        });
        this.changeState(GameState.DIALOGUE);
    }

    /**
     * Level 2 stairs: need 4 martyr tokens + boss defeated → victory screen.
     */
    handleLevel2Stairs() {
        const flags = this.dialogue.questFlags;
        const tokens = this.countMartyrTokens();

        if (tokens < 4) {
            this.inventory.showNotification(`You need ${4 - tokens} more Martyr Token(s)!`);
            return;
        }

        if (!flags.boss_defeated_l2) {
            this.inventory.showNotification('The Roman Prefect still blocks the escape!');
            return;
        }

        // All conditions met — start victory dialogue then show victory screen
        this.dialogue.startDialogue('victory_l2', () => {
            this.checkDialogueRewards();
            this.enterVictoryState(() => this.transitionToLevel(3));
        });
        this.changeState(GameState.DIALOGUE);
    }

    /**
     * Level 3 stairs: need puzzle solved + boss defeated → victory dialogue → next level or victory.
     */
    handleLevel3Stairs() {
        const flags = this.dialogue.questFlags;

        if (!flags.puzzle_solved) {
            this.inventory.showNotification('You must assemble the Creed first!');
            return;
        }

        if (!flags.boss_defeated_l3) {
            this.inventory.showNotification('Arius still blocks the way!');
            return;
        }

        // All conditions met — victory dialogue then show victory screen
        this.dialogue.startDialogue('victory_l3', () => {
            this.checkDialogueRewards();
            this.enterVictoryState(() => this.transitionToLevel(4));
        });
        this.changeState(GameState.DIALOGUE);
    }

    /**
     * Level 4 stairs: need all 3 abilities + boss defeated → victory dialogue.
     */
    handleLevel4Stairs() {
        const flags = this.dialogue.questFlags;

        if (!flags.library_unlocked) {
            this.inventory.showNotification('The Forbidden Library must be opened first!');
            return;
        }

        if (!flags.boss_defeated_l4) {
            this.inventory.showNotification('The Corrupt Prefect still guards the way!');
            return;
        }

        // All conditions met — victory dialogue then show victory screen
        this.dialogue.startDialogue('victory_l4', () => {
            this.checkDialogueRewards();
            this.enterVictoryState(() => this.transitionToLevel(5));
        });
        this.changeState(GameState.DIALOGUE);
    }

    /**
     * Level 5 stairs: need boss defeated → final victory dialogue → game complete.
     */
    handleLevel5Stairs() {
        const flags = this.dialogue.questFlags;

        if (!flags.boss_defeated_l5) {
            this.inventory.showNotification('The General still opposes you!');
            return;
        }

        // All conditions met — victory dialogue then game complete
        this.dialogue.startDialogue('victory_l5', () => {
            this.checkDialogueRewards();
            this.enterGameComplete();
        });
        this.changeState(GameState.DIALOGUE);
    }

    /**
     * Enter the final game completion state with credits and stats.
     */
    enterGameComplete() {
        const playtimeMs = performance.now() - this.sessionStartTime;
        const minutes = Math.floor(playtimeMs / 60000);
        const seconds = Math.floor((playtimeMs % 60000) / 1000);
        const playtime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.victoryStats = {
            levelName: 'All Levels Complete',
            playtime: playtime,
            enemiesDefeated: this.defeatedEnemies.size,
            itemsFound: this.inventory.items.length +
                         (this.inventory.equipped.shield ? 1 : 0) +
                         (this.inventory.equipped.accessory ? 1 : 0),
            playerLevel: this.player.level,
            isGameComplete: true
        };

        // Credits scroll position (animated in updateGameComplete)
        this.creditsScrollY = 0;

        // Auto-save with final state
        this.autoSave();

        this.changeState(GameState.GAME_COMPLETE);
    }

    /**
     * Update game complete / credits screen.
     */
    updateGameComplete(deltaTime) {
        // Scroll credits upward
        this.creditsScrollY += (deltaTime || 16) * 0.03;

        // Press Enter after credits reach a threshold to return to title
        if (this.creditsScrollY > 10 &&
            (this.input.wasPressed('Enter') || this.input.wasPressed(' '))) {
            this.player = null;
            this.map = null;
            this.npcs = [];
            this.enemies = [];
            this.worldItems = [];
            this.victoryStats = null;
            this.screens.resetSelection();
            this.changeState(GameState.TITLE);
        }
    }

    /**
     * Count martyr tokens collected based on quest flags.
     */
    countMartyrTokens() {
        const flags = this.dialogue.questFlags;
        let count = 0;
        if (flags.token_polycarp) count++;
        if (flags.token_ignatius) count++;
        if (flags.token_perpetua) count++;
        if (flags.token_felicity) count++;
        return count;
    }

    /**
     * Transition to a new level. Preserves player stats and inventory.
     */
    async transitionToLevel(levelNumber) {
        this.changeState(GameState.LOADING);

        // Preserve player state across levels
        const preservedPlayer = {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            attack: this.player.attack,
            defense: this.player.defense,
            xp: this.player.xp,
            level: this.player.level,
            xpThreshold: this.player.xpThreshold,
            equipmentBonus: { ...this.player.equipmentBonus }
        };

        // Clear level-specific state
        this.defeatedEnemies.clear();

        // Load new level
        const success = await this.loadLevel(levelNumber);
        if (success) {
            // Restore player stats
            Object.assign(this.player, preservedPlayer);

            // Register level dialogue content
            this.registerLevelDialogues(levelNumber);

            // Reset session timer for new level playtime
            this.sessionStartTime = performance.now();
            this.lastSaveTime = this.sessionStartTime;

            this.hud.showNotification(`Level ${levelNumber}: ${this.map.name}`, 'info');
            this.changeState(GameState.PLAYING);

            // Auto-save at level start
            this.autoSave();
        } else {
            console.error(`Failed to load level ${levelNumber}`);
            this.changeState(GameState.TITLE);
        }
    }

    /**
     * Register dialogue content for a given level number.
     */
    registerLevelDialogues(levelNumber) {
        switch (levelNumber) {
            case 1:
                if (window.LEVEL1_DIALOGUES) {
                    this.dialogue.registerDialogues(window.LEVEL1_DIALOGUES);
                }
                break;
            case 2:
                if (window.LEVEL2_DIALOGUES) {
                    this.dialogue.registerDialogues(window.LEVEL2_DIALOGUES);
                }
                break;
            case 3:
                if (window.LEVEL3_DIALOGUES) {
                    this.dialogue.registerDialogues(window.LEVEL3_DIALOGUES);
                }
                break;
            case 4:
                if (window.LEVEL4_DIALOGUES) {
                    this.dialogue.registerDialogues(window.LEVEL4_DIALOGUES);
                }
                break;
            case 5:
                if (window.LEVEL5_DIALOGUES) {
                    this.dialogue.registerDialogues(window.LEVEL5_DIALOGUES);
                }
                break;
        }
    }

    /**
     * Transition to the victory screen with stats.
     * @param {function} [onContinue] - Called when player presses Enter (e.g., transition to next level)
     */
    enterVictoryState(onContinue) {
        const playtimeMs = performance.now() - this.sessionStartTime;
        const minutes = Math.floor(playtimeMs / 60000);
        const seconds = Math.floor((playtimeMs % 60000) / 1000);
        const playtime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const flags = this.dialogue.questFlags;
        const levelName = this.map ? this.map.name : `Level ${this.currentLevel}`;

        // Level-specific collectible info
        const collectibleInfo = this._getLevelCollectibleInfo(flags);

        this.victoryStats = {
            levelName: `Level ${this.currentLevel}`,
            subtitle: levelName,
            playtime: playtime,
            enemiesDefeated: this.defeatedEnemies.size,
            coinsCollected: collectibleInfo.count,
            coinsTotal: collectibleInfo.total,
            collectibleLabel: collectibleInfo.label,
            completionMessage: collectibleInfo.message,
            nextMessage: onContinue ? 'To be continued...' : 'The End',
            itemsFound: this.inventory.items.length +
                         (this.inventory.equipped.shield ? 1 : 0) +
                         (this.inventory.equipped.accessory ? 1 : 0),
            playerLevel: this.player.level
        };

        this.victoryCallback = onContinue || null;

        // Auto-save with victory state
        this.autoSave();

        this.changeState(GameState.VICTORY);
    }

    /** Get level-specific collectible info for victory stats */
    _getLevelCollectibleInfo(flags) {
        switch (this.currentLevel) {
            case 1: return {
                label: 'Apostle Coins:',
                count: (flags.coin_peter ? 1 : 0) + (flags.coin_james ? 1 : 0) + (flags.coin_john ? 1 : 0),
                total: 3,
                message: 'Your journey through the catacombs is complete!'
            };
            case 2: return {
                label: 'Martyr Tokens:',
                count: this.countMartyrTokens(),
                total: 4,
                message: 'You escaped the hidden passages!'
            };
            case 3: return {
                label: 'Creed Progress:',
                count: flags.puzzle_solved ? 1 : 0,
                total: 1,
                message: 'The Creed has been assembled!'
            };
            case 4: return {
                label: 'Father Scrolls:',
                count: (flags.scroll_augustine ? 1 : 0) + (flags.scroll_jerome ? 1 : 0) + (flags.scroll_ambrose ? 1 : 0),
                total: 3,
                message: 'The Church Fathers have taught you well!'
            };
            case 5: return {
                label: 'Final Victory:',
                count: 1,
                total: 1,
                message: 'Freedom has been won!'
            };
            default: return {
                label: 'Collectibles:',
                count: 0,
                total: 0,
                message: 'Level complete!'
            };
        }
    }

    /**
     * Update victory screen — wait for Enter to continue.
     */
    updateVictory() {
        if (this.input.wasPressed('Enter') || this.input.wasPressed(' ')) {
            const callback = this.victoryCallback;
            this.victoryStats = null;
            this.victoryCallback = null;
            if (callback) {
                callback();
            } else {
                this.player = null;
                this.map = null;
                this.npcs = [];
                this.enemies = [];
                this.worldItems = [];
                this.screens.resetSelection();
                this.changeState(GameState.TITLE);
            }
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

    /**
     * Auto-save to the current active slot.
     */
    autoSave() {
        if (!this.player) return;
        const elapsed = performance.now() - this.sessionStartTime;
        this.saveSystem.autoSave(this, elapsed);
    }

    /**
     * Save to a specific slot (called from save slot picker).
     */
    saveToSlot(slotIndex) {
        if (!this.player) return;
        const elapsed = performance.now() - this.sessionStartTime;
        this.saveSystem.saveToSlot(slotIndex, this, elapsed);
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
            this.registerLevelDialogues(saveData.currentLevel);

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

        // Restore modified tiles (revealed walls, broken barriers)
        if (data.modifiedTiles && this.map) {
            this.map.replayModifiedTiles(data.modifiedTiles);
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

        // Restore ability state
        if (data.abilities && this.abilities) {
            this.abilities.fromSaveData(data.abilities);
        }

        console.log('Game state restored from slot');
    }
    /**
     * Apply or remove colorblind-safe color palette.
     * @param {boolean} enabled
     */
    _applyColorblindMode(enabled) {
        const target = enabled ? CONFIG._COLORBLIND_COLORS : CONFIG._DEFAULT_COLORS;
        for (const key of Object.keys(target)) {
            CONFIG.COLORS[key] = target[key];
        }
    }

    /**
     * Register service worker for offline play.
     */
    _registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').then(reg => {
                console.log('Service worker registered:', reg.scope);
            }).catch(err => {
                console.warn('Service worker registration failed:', err);
            });
        }
    }
}

// Expose Game globally
window.Game = Game;
