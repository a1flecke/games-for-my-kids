/**
 * Keyboard Command 4: The Digital Realm — Game Engine
 * State machine, screen management, combat integration, overlays.
 */

class Game {
    constructor() {
        this.state = 'TITLE';
        this.selectedLevel = 0;
        this.highestLevel = 1;
        this.currentLevel = null;

        // Screen references
        this._screens = {};
        this._overlays = {};

        // Focus return targets for overlays
        this._pauseTrigger = null;
        this._settingsTrigger = null;
        this._resetTrigger = null;

        // Managers
        this._inputManager = null;
        this._shortcutManager = null;
        this._weaponManager = null;

        // Bound handlers (for removal if needed)
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._titleKeyHandler = null;

        // Renderer & game loop
        this._renderer = null;
        this._rafId = null;
        this._lastTime = 0;
        this._gameState = null;

        // Combat state
        this._monsters = [];
        this._waves = [];
        this._currentWaveIndex = 0;
        this._waveDelay = 0;
        this._waveSpawned = false;
        this._roomCleared = false;

        // Player state
        this._playerHp = 100;
        this._playerMaxHp = 100;
        this._respawns = 3;
        this._score = 0;
        this._comboCount = 0;
        this._bestCombo = 0;
        this._totalKills = 0;
        this._totalAttempts = 0;
        this._correctAttempts = 0;

        // Boss state
        this._bossActive = false;
        this._boss = null;
        this._bossPhaseIndex = 0;
        this._bossPauseTimer = 0;
        this._bossTaunt = null;

        // Death/respawn state
        this._deathTimer = null;   // respawn / game-over delay
        this._roomTimer = null;    // room-clear / boss start / next room delay
        this._deathActive = false;
        this._isGameOver = false;  // true when no respawns left

        // Mage projectiles (in-flight towards player)
        this._mageProjectiles = [];

        // Speed multiplier from settings
        this._speedMultiplier = 1.0;

        // Level data
        this._levelNames = [
            'Home Screen Ruins',
            'Files Dungeon',
            'Text Editor Tower',
            'Navigation Nexus',
            'Selection Stronghold',
            'App Switcher Arena',
            'Safari Caverns',
            'Advanced Armory',
            'Combo Catacombs',
            'Corruption Core'
        ];

        // Room management
        this._rooms = [];
        this._currentRoomIndex = 0;
    }

    async init() {
        // Cache screen elements
        this._screens = {
            title: document.getElementById('screen-title'),
            select: document.getElementById('screen-select'),
            gameplay: document.getElementById('screen-gameplay'),
            results: document.getElementById('screen-results')
        };

        // Cache overlay elements
        this._overlays = {
            pause: document.getElementById('pause-overlay'),
            settings: document.getElementById('settings-overlay'),
            reset: document.getElementById('reset-overlay')
        };

        // Initialize renderer
        const canvas = document.getElementById('game-canvas');
        this._renderer = new Renderer(canvas);
        this._renderer.cacheMonsterSprites();

        // Initialize ShortcutManager and load database
        this._shortcutManager = new ShortcutManager();
        await this._shortcutManager.load();

        // Initialize InputManager with callbacks
        this._inputManager = new InputManager();
        this._inputManager.onShortcutAttempt = (data) => this._handleShortcutAttempt(data);
        this._inputManager.onGameControl = (data) => this._handleGameControl(data);

        // Initialize WeaponManager
        this._weaponManager = new WeaponManager();

        // Load save data
        this._loadProgress();

        // Bind global keyboard
        document.addEventListener('keydown', this._onKeyDown);

        // Bind overlay buttons
        this._bindPauseOverlay();
        this._bindSettingsOverlay();
        this._bindResetOverlay();
        this._bindResultsScreen();

        // Handle resize
        window.addEventListener('resize', () => {
            if (this._renderer) this._renderer.resize();
        });

        // Show title screen
        this.showTitle();
    }

    // =========================================================
    // Screen Management
    // =========================================================

    _showScreen(name) {
        for (const key of Object.keys(this._screens)) {
            this._screens[key].classList.toggle('active', key === name);
        }
    }

    showTitle() {
        // Stop game loop if running
        this._stopGameLoop();
        this._cancelAllCombat();

        // Disable input interception — let browser keys work normally
        if (this._inputManager) {
            this._inputManager.disable();
            this._inputManager.cancel();
        }

        this.state = 'TITLE';
        this._showScreen('title');

        // Focus the title heading for screen reader announcement
        const titleEl = this._screens.title.querySelector('.glitch-text');
        if (titleEl) {
            titleEl.setAttribute('tabindex', '-1');
            titleEl.focus();
        }

        // "Press any key" handler — listen once
        if (this._titleKeyHandler) {
            document.removeEventListener('keydown', this._titleKeyHandler);
        }
        const ignoredKeys = new Set([
            'Shift', 'Control', 'Alt', 'Meta',
            'CapsLock', 'Fn', 'Dead', 'NumLock', 'ScrollLock'
        ]);
        this._titleKeyHandler = (e) => {
            if (ignoredKeys.has(e.key)) return;
            document.removeEventListener('keydown', this._titleKeyHandler);
            this._titleKeyHandler = null;
            this.showLevelSelect();
        };
        document.addEventListener('keydown', this._titleKeyHandler);
    }

    showLevelSelect() {
        // Stop game loop if running
        this._stopGameLoop();
        this._cancelAllCombat();

        // Disable input interception — let browser keys work normally
        if (this._inputManager) {
            this._inputManager.disable();
            this._inputManager.cancel();
        }

        this.state = 'LEVEL_SELECT';
        this._showScreen('select');

        // Remove title listener if still active
        if (this._titleKeyHandler) {
            document.removeEventListener('keydown', this._titleKeyHandler);
            this._titleKeyHandler = null;
        }

        this._renderLevelGrid();
        this._selectLevelCard(0);
    }

    showGameplay(levelId) {
        this._cancelAllCombat();

        this.state = 'GAMEPLAY';
        this.currentLevel = levelId;
        this._showScreen('gameplay');

        // Cache room background for this level's theme
        const themeKey = THEME_ORDER[levelId] || 'ruins';
        this._renderer.cacheBackground(themeKey);
        this._renderer.resize();

        // Apply speed from settings
        this._speedMultiplier = this._settings.monsterSpeed === 'slow' ? 0.6 : 1.0;

        // Set up weapon manager for this level
        this._weaponManager.cancel();
        this._weaponManager.unlockForLevel(levelId + 1);

        // Load weapon selection from save
        const data = SaveManager.load();
        if (data.selectedWeapon && this._weaponManager.unlockedWeapons.includes(data.selectedWeapon)) {
            this._weaponManager.currentWeapon = data.selectedWeapon;
        }

        // Reset player combat state
        this._playerHp = 100;
        this._respawns = 3;
        this._score = 0;
        this._comboCount = 0;
        this._bestCombo = 0;
        this._totalKills = 0;
        this._totalAttempts = 0;
        this._correctAttempts = 0;
        this._deathActive = false;
        this._bossActive = false;
        this._boss = null;
        this._mageProjectiles = [];

        // Generate test room data (real levels come in sessions 7-9)
        this._rooms = this._generateTestRooms(levelId);
        this._currentRoomIndex = 0;

        // Start first room
        this._startRoom(this._rooms[0]);

        // Update HUD
        this._updateHud();

        // Enable input interception
        if (this._inputManager) {
            this._inputManager.onShortcutAttempt = (data) => this._handleShortcutAttempt(data);
            this._inputManager.onGameControl = (data) => this._handleGameControl(data);
            this._inputManager.enable();
        }

        // Start game loop
        this._startGameLoop();
    }

    // =========================================================
    // Room & Wave Management
    // =========================================================

    _generateTestRooms(levelId) {
        // Hardcoded test data until real level JSON in sessions 7-9
        const rooms = [];
        const roomCount = 3 + Math.floor(levelId / 3);

        for (let r = 0; r < roomCount; r++) {
            const waves = [];
            const waveCount = 2 + Math.floor(Math.random() * 2);

            for (let w = 0; w < waveCount; w++) {
                const monsterDefs = [];
                const types = ['gremlin', 'gremlin', 'gremlin', 'brute', 'shifter', 'mage', 'knight'];
                const count = 2 + Math.floor(Math.random() * 3);

                for (let m = 0; m < count; m++) {
                    const typeIdx = Math.min(
                        Math.floor(Math.random() * Math.min(types.length, 3 + levelId)),
                        types.length - 1
                    );
                    monsterDefs.push({
                        type: types[typeIdx],
                        depth: 0.15 + Math.random() * 0.4,
                        offsetX: (m - (count - 1) / 2) * 80
                    });
                }

                waves.push({
                    monsters: monsterDefs,
                    delay: w === 0 ? 0 : 1.0
                });
            }

            rooms.push({ waves });
        }

        // Last room has a boss
        const bossRoom = rooms[rooms.length - 1];
        bossRoom.boss = {
            name: 'Bug Lord',
            hp: 3,
            phases: this._generateBossPhases(levelId)
        };

        return rooms;
    }

    _generateBossPhases(levelId) {
        const phases = [];
        const phaseCount = 3 + Math.floor(levelId / 3);

        for (let i = 0; i < phaseCount; i++) {
            const s = this._shortcutManager.getRandomShortcut(levelId + 1);
            if (s) {
                phases.push({
                    instruction: s.action || s.description,
                    shortcutId: s.id,
                    taunt: i === 0 ? 'You dare challenge me?!'
                        : i === phaseCount - 1 ? 'This cannot be!'
                        : 'Is that all you have?!'
                });
            }
        }
        return phases;
    }

    _startRoom(roomData) {
        this._monsters = [];
        this._waves = roomData.waves || [];
        this._currentWaveIndex = 0;
        this._waveDelay = 0;
        this._waveSpawned = false;
        this._roomCleared = false;
        this._mageProjectiles = [];

        // Spawn first wave immediately
        if (this._waves.length > 0) {
            this._spawnWave(this._waves[0]);
            this._waveSpawned = true;
            this._currentWaveIndex = 0;
        }

        // Auto-target first monster
        this._autoTarget();

        // Update room progress dots
        this._updateRoomProgress();
    }

    _spawnWave(waveData) {
        const assignShortcut = (type) => {
            const s = this._shortcutManager.getRandomShortcut(this.currentLevel + 1);
            const result = {
                shortcutId: s ? s.id : 'unknown',
                promptMode: type === 'shifter' ? 'action' : 'key'
            };

            // Knights get a different shortcut for shield
            if (type === 'knight') {
                const shieldS = this._shortcutManager.getRandomShortcut(this.currentLevel + 1);
                result.shieldShortcutId = shieldS ? shieldS.id : result.shortcutId;
            }

            return result;
        };

        for (const def of waveData.monsters) {
            if (def.type === 'swarm') {
                const swarm = MonsterFactory.createSwarm(def.depth, assignShortcut);
                this._monsters.push(...swarm);
            } else {
                const assignment = assignShortcut(def.type);
                const m = MonsterFactory.create(
                    def.type,
                    def.depth,
                    assignment.shortcutId,
                    assignment.promptMode,
                    def.offsetX || 0
                );
                if (assignment.shieldShortcutId) {
                    m.shieldShortcutId = assignment.shieldShortcutId;
                }
                this._monsters.push(m);
            }
        }
    }

    // =========================================================
    // Targeting System
    // =========================================================

    _autoTarget() {
        const alive = this._monsters.filter(m => m.isAlive());
        if (alive.length === 0) return;

        // Clear all targeting
        for (const m of this._monsters) m.targeted = false;

        // Target the closest (highest depth) alive monster
        alive.sort((a, b) => b.depth - a.depth);
        alive[0].targeted = true;
    }

    _cycleTarget(direction) {
        const alive = this._monsters.filter(m => m.isAlive());
        if (alive.length === 0) return;

        const currentIdx = alive.findIndex(m => m.targeted);

        // Clear all targeting
        for (const m of this._monsters) m.targeted = false;

        let nextIdx;
        if (currentIdx < 0) {
            nextIdx = 0;
        } else {
            nextIdx = currentIdx + direction;
            if (nextIdx < 0) nextIdx = alive.length - 1;
            if (nextIdx >= alive.length) nextIdx = 0;
        }

        alive[nextIdx].targeted = true;
    }

    _getTargetedMonster() {
        return this._monsters.find(m => m.targeted && m.isAlive()) || null;
    }

    _forceTargetCheck() {
        // If any monster reaches depth 0.85, force-select it
        const alive = this._monsters.filter(m => m.isAlive());
        const dangerMonster = alive.find(m => m._forceTargeted && !m.targeted);
        if (dangerMonster) {
            for (const m of this._monsters) m.targeted = false;
            dangerMonster.targeted = true;
        }
    }

    // =========================================================
    // Game Loop
    // =========================================================

    _startGameLoop() {
        // Cancel any existing loop
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._lastTime = 0;
        this._renderer.particles.clear();

        const loop = (timestamp) => {
            // Guard: stop if no longer in gameplay or paused
            if (this.state !== 'GAMEPLAY' && this.state !== 'PAUSED') {
                this._rafId = null;
                return;
            }

            // Delta time in seconds, capped to prevent spiral-of-death
            if (this._lastTime === 0) this._lastTime = timestamp;
            const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
            this._lastTime = timestamp;

            // Only update when not paused
            if (this.state === 'GAMEPLAY') {
                this._updateGameplay(dt, timestamp / 1000);
            }

            // Always render (keeps the canvas visible while paused)
            this._buildAndRender(timestamp / 1000);

            this._rafId = requestAnimationFrame(loop);
        };

        this._rafId = requestAnimationFrame(loop);
    }

    _stopGameLoop() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _updateGameplay(dt, time) {
        if (this._deathActive) return;

        // Update particles
        this._renderer.particles.update(dt);

        // Boss mode
        if (this._bossActive) {
            this._updateBoss(dt);
            return;
        }

        // Update monsters
        for (let i = this._monsters.length - 1; i >= 0; i--) {
            const m = this._monsters[i];
            const event = m.update(dt, this._speedMultiplier);

            if (event === 'attack') {
                // Monster reached player — deal damage
                this._playerTakeDamage(m.config.attackDamage);
                // Kill the monster after attacking
                m.hp = 0;
                m.state = 'dying';
                m.deathProgress = 0;
                // Re-target next alive monster
                this._autoTarget();
            } else if (event === 'projectile') {
                // Mage fires projectile
                this._mageProjectiles.push({
                    startDepth: m.depth,
                    progress: 0,
                    travelTime: m.config.projectileTravelTime,
                    damage: m.config.projectileDamage,
                    sourceX: m.offsetX
                });
            } else if (event === 'dead') {
                // Monster fully dead — remove
                this._monsters.splice(i, 1);
            }
        }

        // Update mage projectiles
        for (let i = this._mageProjectiles.length - 1; i >= 0; i--) {
            const p = this._mageProjectiles[i];
            p.progress += dt / p.travelTime;
            if (p.progress >= 1) {
                this._playerTakeDamage(p.damage);
                this._mageProjectiles.splice(i, 1);
            }
        }

        // Update weapon
        if (this._weaponManager) {
            this._weaponManager.update(dt);
        }

        // Force-target check
        this._forceTargetCheck();

        // Check wave progression
        this._checkWaveProgression(dt);

        // Check room clear
        this._checkRoomClear();
    }

    _checkWaveProgression(dt) {
        if (this._roomCleared) return;

        // Check if current wave's monsters are all defeated (dead or dying)
        const aliveCount = this._monsters.filter(m => m.state !== 'dead' && m.state !== 'dying').length;

        if (aliveCount === 0 && this._currentWaveIndex < this._waves.length - 1) {
            // Wait for wave delay
            this._waveDelay += dt;
            const nextWave = this._waves[this._currentWaveIndex + 1];
            const delay = nextWave.delay || 0;

            if (this._waveDelay >= delay) {
                this._currentWaveIndex++;
                this._waveDelay = 0;
                this._spawnWave(this._waves[this._currentWaveIndex]);
                this._autoTarget();
            }
        }
    }

    _checkRoomClear() {
        if (this._roomCleared) return;

        const alive = this._monsters.filter(m => m.isAlive());
        const allWavesSpawned = this._currentWaveIndex >= this._waves.length - 1;

        if (alive.length === 0 && allWavesSpawned && this._mageProjectiles.length === 0) {
            this._roomCleared = true;

            // Check for boss
            const room = this._rooms[this._currentRoomIndex];
            if (room && room.boss) {
                // Start boss fight after a short delay
                clearTimeout(this._roomTimer);
                this._roomTimer = setTimeout(() => {
                    this._roomTimer = null;
                    this._startBoss(room.boss);
                }, 1000);
                return;
            }

            // Auto-save after room clear
            this._autoSave();

            // Advance to next room or level complete
            if (this._currentRoomIndex < this._rooms.length - 1) {
                clearTimeout(this._roomTimer);
                this._roomTimer = setTimeout(() => {
                    this._roomTimer = null;
                    this._currentRoomIndex++;
                    this._startRoom(this._rooms[this._currentRoomIndex]);
                    this._autoTarget();

                    // Re-cache background for variety (session 6 will do proper transitions)
                    const themeKey = THEME_ORDER[this.currentLevel] || 'ruins';
                    this._renderer.cacheBackground(themeKey);
                }, 1500);
            } else {
                // Level complete
                this._levelComplete();
            }
        }
    }

    // =========================================================
    // Combat — Shortcut Handling
    // =========================================================

    _handleShortcutAttempt(data) {
        if (!this._weaponManager) return;
        if (this._deathActive) return;

        const combo = data.keys;

        // Check if this is a non-interceptable combo (Knowledge Monster territory)
        if (this._inputManager.isNonInterceptable(combo)) {
            // Future: spawn Knowledge Monster prompt
            return;
        }

        // Weapon locked?
        if (this._weaponManager.isLocked()) return;

        this._totalAttempts++;

        // Boss mode has its own handling
        if (this._bossActive) {
            this._handleBossShortcut(combo);
            return;
        }

        // Get targeted monster
        const target = this._getTargetedMonster();
        if (!target) return;

        // Get the shortcut the target requires
        const targetShortcutId = target.getActiveShortcutId();
        const match = this._shortcutManager.matchAttempt(combo, targetShortcutId);

        if (match.correct) {
            this._correctAttempts++;
            this._shortcutManager.recordAttempt(targetShortcutId, true);
            this._shortcutManager.learnShortcut(targetShortcutId);

            // Fire weapon
            const vpX = this._renderer._vpX;
            const vpY = this._renderer._vpY;
            const canvasW = this._renderer._width;
            const canvasH = this._renderer._height;

            // Lock input during fire animation — before fire() to prevent race
            this._inputManager.lock();

            this._weaponManager.fire(
                target,
                canvasW, canvasH, vpX, vpY,
                () => {
                    // On impact — guard against cancelled state
                    if (!this._weaponManager || this._deathActive) return;

                    const result = target.takeDamage(1);

                    if (result === 'killed') {
                        this._totalKills++;
                        this._comboCount++;
                        if (this._comboCount > this._bestCombo) {
                            this._bestCombo = this._comboCount;
                        }

                        // Score: base 100 + combo bonus
                        this._score += 100 + this._comboCount * 10;

                        // Combo heal milestones
                        if (this._comboCount === 5 || this._comboCount === 10) {
                            this._playerHeal(5);
                        }

                        // Death effect
                        const bounds = target.getBounds(vpX, vpY, canvasH);
                        this._renderer.spawnDeathEffect(bounds.centerX, bounds.centerY, target.type);

                        // Auto-target next
                        this._autoTarget();
                    } else if (result === 'shield-break') {
                        // Shield broken — visual feedback
                        const bounds = target.getBounds(vpX, vpY, canvasH);
                        this._renderer.particles.emit(bounds.centerX, bounds.centerY, 8, '#3498DB', 3, 3);

                        this._comboCount++;
                        this._score += 50;
                    } else {
                        // Hit but not killed (brute)
                        this._comboCount++;
                        this._score += 50;
                    }

                    this._updateHud();
                },
                () => {
                    // On fire complete — nothing extra needed
                }
            );

            // Update shortcut prompt on HUD
            this._updateShortcutPrompt();
        } else {
            // Wrong shortcut
            const pressed = this._shortcutManager.findByCombo(combo);
            if (pressed) this._shortcutManager.recordAttempt(pressed.id, false);

            // Flinch
            this._weaponManager.flinch();

            // Player takes 5 damage
            this._playerTakeDamage(5);

            // Reset combo
            this._comboCount = 0;

            // Miss particles
            this._renderer.spawnMiss();

            // Update status for screen reader
            const statusEl = document.getElementById('hud-status');
            if (statusEl) {
                statusEl.textContent = pressed
                    ? `Wrong shortcut: ${pressed.action}. Try: ${match.shortcut ? match.shortcut.action : 'unknown'}`
                    : 'Unrecognized shortcut';
            }

            this._updateHud();
        }
    }

    // =========================================================
    // Health System
    // =========================================================

    _playerTakeDamage(amount) {
        this._playerHp = Math.max(0, this._playerHp - amount);
        this._updateHud();

        // Screen shake effect (brief)
        this._renderer.particles.emit(
            this._renderer._width / 2,
            this._renderer._height / 2,
            3, '#FF0000', 1, 2
        );

        if (this._playerHp <= 0) {
            this._handlePlayerDeath();
        }
    }

    _playerHeal(amount) {
        this._playerHp = Math.min(this._playerMaxHp, this._playerHp + amount);
        this._updateHud();

        // Green flash particles
        this._renderer.particles.emit(
            this._renderer._width / 2,
            this._renderer._height - 60,
            5, '#2ECC71', 2, 2
        );
    }

    _handlePlayerDeath() {
        if (this._deathActive) return;
        this._deathActive = true;

        // Cancel weapon to prevent stale onFireComplete callbacks
        if (this._weaponManager) this._weaponManager.cancel();

        if (this._respawns > 0) {
            // Decrement respawns immediately so HUD is correct during animation
            this._respawns--;
            this._isGameOver = false;
            this._updateHud();

            // Respawn after death animation
            clearTimeout(this._deathTimer);
            this._deathTimer = setTimeout(() => {
                this._deathTimer = null;
                this._playerHp = 50;
                this._deathActive = false;
                this._comboCount = 0;
                this._updateHud();
            }, 1500);
        } else {
            // Game over
            this._isGameOver = true;
            clearTimeout(this._deathTimer);
            this._deathTimer = setTimeout(() => {
                this._deathTimer = null;
                this._gameOver();
            }, 2000);
        }
    }

    _gameOver() {
        this._deathActive = false;
        // Show results with failure state
        this.showResults({
            kills: this._totalKills,
            accuracy: this._totalAttempts > 0
                ? Math.round((this._correctAttempts / this._totalAttempts) * 100)
                : 0,
            bestCombo: this._bestCombo,
            score: this._score,
            stars: 0,
            completed: false
        });
    }

    // =========================================================
    // Boss Fight
    // =========================================================

    _startBoss(bossData) {
        this._bossActive = true;
        this._boss = bossData;
        this._bossPhaseIndex = 0;
        this._bossPauseTimer = 0;
        this._bossTaunt = bossData.phases[0] ? bossData.phases[0].taunt : null;

        // Create a visual boss monster (large brute-like)
        const bossMonster = MonsterFactory.create('brute', 0.4, '', 'key', 0);
        bossMonster.hp = bossData.hp;
        bossMonster.maxHp = bossData.hp;
        bossMonster.speed = 0; // boss doesn't advance
        bossMonster.state = 'idle';
        bossMonster.targeted = true;
        this._monsters = [bossMonster];

        this._updateHud();
        this._updateShortcutPrompt();
    }

    _updateBoss(dt) {
        if (!this._boss) return;

        // Between-phase pause
        if (this._bossPauseTimer > 0) {
            this._bossPauseTimer -= dt;
            return;
        }

        // Update weapon (particles already updated by _updateGameplay before boss branch)
        if (this._weaponManager) {
            this._weaponManager.update(dt);
        }
    }

    _handleBossShortcut(combo) {
        if (!this._boss || this._bossPauseTimer > 0) return;

        const phases = this._boss.phases;
        if (this._bossPhaseIndex >= phases.length) return;

        const phase = phases[this._bossPhaseIndex];
        const match = this._shortcutManager.matchAttempt(combo, phase.shortcutId);

        if (match.correct) {
            this._correctAttempts++;
            this._shortcutManager.recordAttempt(phase.shortcutId, true);
            this._shortcutManager.learnShortcut(phase.shortcutId);

            // Fire at boss
            const bossMonster = this._monsters[0];
            if (bossMonster) {
                const vpX = this._renderer._vpX;
                const vpY = this._renderer._vpY;
                const canvasW = this._renderer._width;
                const canvasH = this._renderer._height;

                // Lock input before fire to prevent race
                this._inputManager.lock();

                this._weaponManager.fire(
                    bossMonster,
                    canvasW, canvasH, vpX, vpY,
                    () => {
                        // Phase damage — guard against cancelled state
                        if (!this._weaponManager || this._deathActive) return;
                        bossMonster.takeDamage(1);
                        this._score += 200;
                        this._comboCount++;

                        const bounds = bossMonster.getBounds(vpX, vpY, canvasH);
                        this._renderer.particles.emit(bounds.centerX, bounds.centerY, 12, '#FFD700', 4, 4);

                        this._bossPhaseIndex++;

                        if (this._bossPhaseIndex >= phases.length) {
                            // Boss defeated
                            bossMonster.state = 'dying';
                            bossMonster.deathProgress = 0;
                            this._bossActive = false;

                            // Level complete after death animation
                            clearTimeout(this._roomTimer);
                            this._roomTimer = setTimeout(() => {
                                this._roomTimer = null;
                                this._autoSave();
                                this._levelComplete();
                            }, 1500);
                        } else {
                            // Next phase — pause for taunt
                            this._bossPauseTimer = 1.5;
                            this._bossTaunt = phases[this._bossPhaseIndex].taunt;
                            this._updateShortcutPrompt();
                        }

                        this._updateHud();
                    },
                    null
                );
            }
        } else {
            // Wrong — boss attacks player (20 damage)
            const pressed = this._shortcutManager.findByCombo(combo);
            if (pressed) this._shortcutManager.recordAttempt(pressed.id, false);

            this._weaponManager.flinch();
            this._playerTakeDamage(20);
            this._comboCount = 0;
            this._renderer.spawnMiss();
            this._updateHud();
        }
    }

    // =========================================================
    // Combo System
    // =========================================================

    _getComboTier() {
        // Visual effects escalate at milestones
        if (this._comboCount >= 15) return 5;
        if (this._comboCount >= 10) return 4;
        if (this._comboCount >= 8) return 3;
        if (this._comboCount >= 5) return 2;
        if (this._comboCount >= 3) return 1;
        return 0;
    }

    // =========================================================
    // Level Complete
    // =========================================================

    _levelComplete() {
        // Calculate stars
        const accuracy = this._totalAttempts > 0
            ? (this._correctAttempts / this._totalAttempts)
            : 0;
        let stars = 1;
        if (accuracy >= 0.7 && this._respawns >= 2) stars = 2;
        if (accuracy >= 0.9 && this._respawns >= 3) stars = 3;

        // Save progress
        const data = SaveManager.load();
        const levelKey = String(this.currentLevel);
        if (!data.levels[levelKey] || (data.levels[levelKey].stars || 0) < stars) {
            data.levels[levelKey] = {
                stars,
                bestScore: Math.max(this._score, (data.levels[levelKey] && data.levels[levelKey].bestScore) || 0),
                bestCombo: Math.max(this._bestCombo, (data.levels[levelKey] && data.levels[levelKey].bestCombo) || 0)
            };
        }

        // Unlock next level
        if (this.currentLevel + 2 > data.highestLevel) {
            data.highestLevel = Math.min(this.currentLevel + 2, 10);
        }
        this.highestLevel = data.highestLevel;

        // Unlock next weapon
        const nextWeapon = this.currentLevel + 2;
        if (nextWeapon <= 10 && !data.weaponsUnlocked.includes(nextWeapon)) {
            data.weaponsUnlocked.push(nextWeapon);
        }

        SaveManager.save(data);

        // Sync local state so level select shows updated stars
        this._levels = data.levels;

        this.showResults({
            kills: this._totalKills,
            accuracy: Math.round(accuracy * 100),
            bestCombo: this._bestCombo,
            score: this._score,
            stars,
            completed: true
        });
    }

    _autoSave() {
        const data = SaveManager.load();
        data.highestLevel = this.highestLevel;
        data.selectedWeapon = this._weaponManager.currentWeapon;
        SaveManager.save(data);
    }

    // =========================================================
    // HUD Updates (DOM, only on value change)
    // =========================================================

    _updateHud() {
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        const scoreText = document.getElementById('score-text');
        const levelName = document.getElementById('level-name');
        const weaponName = document.getElementById('weapon-name');

        if (healthBar) {
            const pct = Math.max(0, Math.min(100, this._playerHp));
            healthBar.style.width = pct + '%';
            healthBar.setAttribute('aria-valuenow', String(pct));
            healthBar.setAttribute('aria-label', `Health: ${pct}`);
        }
        if (healthText) healthText.textContent = String(Math.max(0, this._playerHp));
        if (scoreText) scoreText.textContent = String(this._score);
        if (levelName) levelName.textContent = `Level ${(this.currentLevel || 0) + 1}`;
        if (weaponName) weaponName.textContent = this._weaponManager.getWeaponName(this._weaponManager.currentWeapon);

        // Respawn shields
        const shields = document.querySelectorAll('.respawn-shields .shield');
        shields.forEach((s, i) => {
            s.classList.toggle('active', i < this._respawns);
        });
        const shieldsContainer = document.getElementById('respawn-shields');
        if (shieldsContainer) {
            shieldsContainer.setAttribute('aria-label', `${this._respawns} respawns remaining`);
        }
    }

    _updateRoomProgress() {
        const el = document.getElementById('room-progress');
        if (!el) return;
        const total = this._rooms.length;
        const current = this._currentRoomIndex + 1;
        el.textContent = `Room ${current}/${total}`;
    }

    _updateShortcutPrompt() {
        const statusEl = document.getElementById('hud-status');
        if (!statusEl) return;

        if (this._bossActive && this._boss) {
            const phase = this._boss.phases[this._bossPhaseIndex];
            if (phase) {
                statusEl.textContent = `Boss phase: ${phase.instruction}`;
            }
            return;
        }

        const target = this._getTargetedMonster();
        if (target) {
            const shortcutId = target.getActiveShortcutId();
            const s = this._shortcutManager.getShortcut(shortcutId);
            if (s) {
                const text = target.promptMode === 'action'
                    ? s.action || s.description
                    : s.display || s.combo;
                statusEl.textContent = `Target: ${target.config.name} — ${text}`;
            }
        }
    }

    // =========================================================
    // Build Render State & Render
    // =========================================================

    _buildAndRender(time) {
        // Build gameState object for the renderer
        const gameState = {
            monsters: this._monsters.map(m => ({
                type: m.type,
                depth: m.depth,
                state: m.state,
                offsetX: m.offsetX,
                targeted: m.targeted,
                deathProgress: m.deathProgress,
                shieldHp: m.shieldHp
            })),
            projectiles: [],
            weaponId: this._weaponManager ? this._weaponManager.currentWeapon : 1,
            weaponState: this._weaponManager ? this._weaponManager.getWeaponState() : 'idle'
        };

        // Add weapon projectile if active
        if (this._weaponManager && this._weaponManager._projectile) {
            const p = this._weaponManager._projectile;
            gameState.projectiles.push({
                weaponId: p.weaponId,
                startX: p.startX,
                startY: p.startY,
                targetX: p.targetX,
                targetY: p.targetY,
                progress: p.progress
            });
        }

        // Render
        this._renderer.render(gameState, time);

        // Draw boss taunt text if in boss pause
        if (this._bossActive && this._bossPauseTimer > 0 && this._bossTaunt) {
            const ctx = this._renderer._ctx;
            ctx.save();
            ctx.font = 'bold 24px OpenDyslexic, "Comic Sans MS", cursive';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF4444';
            ctx.globalAlpha = Math.min(1, this._bossPauseTimer / 0.3);
            ctx.fillText(this._bossTaunt, this._renderer._width / 2, 120);
            ctx.restore();
        }

        // Draw combo counter if active
        if (this._comboCount >= 3) {
            const ctx = this._renderer._ctx;
            ctx.save();
            const tier = this._getComboTier();
            const colors = ['#FFD700', '#FF8C00', '#FF4500', '#FF00FF', '#00FFFF'];
            ctx.font = `bold ${20 + tier * 4}px OpenDyslexic, "Comic Sans MS", cursive`;
            ctx.textAlign = 'right';
            ctx.fillStyle = colors[Math.min(tier, colors.length - 1)];
            ctx.fillText(`${this._comboCount}x COMBO`, this._renderer._width - 20, 80);
            ctx.restore();
        }

        // Draw death overlay if dying
        if (this._deathActive) {
            const ctx = this._renderer._ctx;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, this._renderer._width, this._renderer._height);
            ctx.font = 'bold 36px OpenDyslexic, "Comic Sans MS", cursive';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF4444';
            if (this._isGameOver) {
                ctx.fillText('GAME OVER', this._renderer._width / 2, this._renderer._height / 2);
            } else {
                ctx.fillText('RESPAWNING...', this._renderer._width / 2, this._renderer._height / 2);
            }
            ctx.restore();
        }
    }

    // =========================================================
    // Cancel All Combat State
    // =========================================================

    _cancelAllCombat() {
        this._gameState = null;
        this._monsters = [];
        this._waves = [];
        this._mageProjectiles = [];
        this._bossActive = false;
        this._boss = null;
        this._deathActive = false;
        this._isGameOver = false;
        this._roomCleared = false;

        clearTimeout(this._deathTimer);
        this._deathTimer = null;
        clearTimeout(this._roomTimer);
        this._roomTimer = null;

        if (this._weaponManager) this._weaponManager.cancel();
    }

    // =========================================================
    // Game Controls
    // =========================================================

    _handleGameControl(data) {
        switch (data.action) {
            case 'escape':
                this.togglePause();
                break;
            case 'next-target':
            case 'prev-target':
                if (!this._bossActive) {
                    this._cycleTarget(data.action === 'next-target' ? 1 : -1);
                    this._updateShortcutPrompt();
                }
                break;
            case 'journal':
                // Future: open shortcut journal overlay (session 5)
                break;
            case 'space':
                // Future: advance dialogue / acknowledge Knowledge Monster
                break;
            default:
                // weapon1-weapon0: weapon switching
                if (data.action.startsWith('weapon')) {
                    const digit = data.action.slice(6);
                    const weaponId = digit === '0' ? 10 : parseInt(digit, 10);
                    if (this._weaponManager && this._weaponManager.select(weaponId)) {
                        this._updateHud();
                        // Save weapon selection
                        const saveData = SaveManager.load();
                        saveData.selectedWeapon = weaponId;
                        SaveManager.save(saveData);
                    }
                }
                break;
        }
    }

    showResults(stats) {
        this._stopGameLoop();
        this._cancelAllCombat();

        // Disable input interception
        if (this._inputManager) {
            this._inputManager.disable();
            this._inputManager.cancel();
        }

        this.state = 'RESULTS';
        this._showScreen('results');

        const statsEl = document.getElementById('results-stats');
        const starsEl = document.getElementById('results-stars');

        if (stats) {
            const lines = [
                `Monsters defeated: ${stats.kills || 0}`,
                `Accuracy: ${stats.accuracy || 0}%`,
                `Best combo: ${stats.bestCombo || 0}`,
                `Score: ${stats.score || 0}`
            ];
            statsEl.textContent = '';
            lines.forEach(line => {
                const p = document.createElement('p');
                p.textContent = line;
                statsEl.appendChild(p);
            });

            const starCount = stats.stars || 0;
            const starText = '\u2605'.repeat(starCount) + '\u2606'.repeat(3 - starCount);
            starsEl.textContent = starText;
            starsEl.setAttribute('aria-label', `${starCount} of 3 stars earned`);
        }

        // Focus first button
        const nextBtn = document.getElementById('results-next');
        if (nextBtn) nextBtn.focus();
    }

    // =========================================================
    // Level Grid
    // =========================================================

    _renderLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.textContent = '';

        for (let i = 0; i < 10; i++) {
            const card = document.createElement('div');
            card.className = 'level-card';
            card.setAttribute('role', 'button');
            card.setAttribute('data-level', String(i));

            const unlocked = i < this.highestLevel;

            if (!unlocked) {
                card.classList.add('locked');
                card.setAttribute('tabindex', '-1');
                card.setAttribute('aria-disabled', 'true');
            } else {
                card.setAttribute('tabindex', '0');
            }

            // Level number
            const num = document.createElement('span');
            num.className = 'level-num';
            num.textContent = String(i + 1);
            card.appendChild(num);

            // Level info
            const info = document.createElement('div');
            info.className = 'level-info';

            const name = document.createElement('span');
            name.className = 'level-name';
            name.textContent = this._levelNames[i];
            info.appendChild(name);

            if (unlocked) {
                const stars = document.createElement('span');
                stars.className = 'level-stars';
                const savedStars = this._getLevelStars(i);
                stars.textContent = '\u2605'.repeat(savedStars) + '\u2606'.repeat(3 - savedStars);
                stars.setAttribute('aria-label', `${savedStars} of 3 stars`);
                info.appendChild(stars);
            }

            card.appendChild(info);

            if (!unlocked) {
                const lock = document.createElement('span');
                lock.className = 'lock-icon';
                lock.textContent = '\uD83D\uDD12';
                lock.setAttribute('aria-hidden', 'true');
                card.appendChild(lock);
            }

            const label = unlocked
                ? `Level ${i + 1}: ${this._levelNames[i]}`
                : `Level ${i + 1}: ${this._levelNames[i]} (locked)`;
            card.setAttribute('aria-label', label);

            // Click / Enter handler
            card.addEventListener('click', () => {
                if (!unlocked) return;
                this.showGameplay(i);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!unlocked) return;
                    this.showGameplay(i);
                }
            });

            grid.appendChild(card);
        }
    }

    _selectLevelCard(index) {
        const cards = document.querySelectorAll('.level-card');
        if (!cards.length) return;

        // Clamp to valid range
        index = Math.max(0, Math.min(index, cards.length - 1));
        this.selectedLevel = index;

        // Remove previous selection
        cards.forEach(c => c.classList.remove('selected'));

        // Apply selection and focus
        cards[index].classList.add('selected');
        cards[index].focus();
    }

    // =========================================================
    // Keyboard Handler
    // =========================================================

    _handleKeyDown(e) {
        // LEVEL_SELECT navigation
        if (this.state === 'LEVEL_SELECT') {
            this._handleLevelSelectKeys(e);
            return;
        }

        // GAMEPLAY keys are handled by InputManager — nothing to do here
        if (this.state === 'GAMEPLAY') return;

        // PAUSED — global fallback if focus escapes the overlay
        if (this.state === 'PAUSED') {
            if (e.key === 'Escape') {
                e.preventDefault();
                this._closePause();
            }
            return;
        }

        // RESULTS keys
        if (this.state === 'RESULTS') {
            this._handleResultsKeys(e);
            return;
        }
    }

    _handleLevelSelectKeys(e) {
        const cards = document.querySelectorAll('.level-card');
        if (!cards.length) return;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                this._selectLevelCard(Math.min(this.selectedLevel + 1, cards.length - 1));
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                this._selectLevelCard(Math.max(this.selectedLevel - 1, 0));
                break;
            case 'Escape':
                e.preventDefault();
                this.showTitle();
                break;
        }
    }

    _handleResultsKeys(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.showLevelSelect();
                break;
            case 'Escape':
                e.preventDefault();
                this.showLevelSelect();
                break;
        }
    }

    // =========================================================
    // Pause Overlay
    // =========================================================

    togglePause() {
        const overlay = this._overlays.pause;
        if (overlay.classList.contains('open')) {
            this._closePause();
        } else {
            this._openPause();
        }
    }

    _openPause() {
        if (this.state !== 'GAMEPLAY') return;
        this.state = 'PAUSED';

        // Disable input interception while paused
        if (this._inputManager) this._inputManager.disable();

        const overlay = this._overlays.pause;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        // Focus the close button
        this._pauseTrigger = document.activeElement;
        document.getElementById('pause-close').focus();
    }

    _closePause() {
        const overlay = this._overlays.pause;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        this.state = 'GAMEPLAY';

        // Re-enable input interception
        if (this._inputManager) this._inputManager.enable();

        // Return focus
        if (this._pauseTrigger && this._pauseTrigger.isConnected) {
            this._pauseTrigger.focus();
        }
        this._pauseTrigger = null;
    }

    _bindPauseOverlay() {
        const overlay = this._overlays.pause;
        const closeBtn = document.getElementById('pause-close');
        const resumeBtn = document.getElementById('pause-resume');
        const settingsBtn = document.getElementById('pause-settings');
        const quitBtn = document.getElementById('pause-quit');

        closeBtn.addEventListener('click', () => this._closePause());
        resumeBtn.addEventListener('click', () => this._closePause());

        settingsBtn.addEventListener('click', () => {
            this._settingsTrigger = settingsBtn;
            this._openSettings();
        });

        quitBtn.addEventListener('click', () => {
            // Close overlay without restoring GAMEPLAY state — we're going to menu
            const overlay = this._overlays.pause;
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            this._pauseTrigger = null;
            this.showLevelSelect();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closePause();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Settings Overlay
    // =========================================================

    _openSettings() {
        const overlay = this._overlays.settings;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        if (!this._settingsTrigger) {
            this._settingsTrigger = document.activeElement;
        }
        document.getElementById('settings-close').focus();
    }

    _closeSettings() {
        const overlay = this._overlays.settings;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        // Return focus to trigger
        if (this._settingsTrigger && this._settingsTrigger.isConnected) {
            this._settingsTrigger.focus();
        }
        this._settingsTrigger = null;
    }

    _bindSettingsOverlay() {
        const overlay = this._overlays.settings;
        const closeBtn = document.getElementById('settings-close');

        closeBtn.addEventListener('click', () => this._closeSettings());

        // Font size buttons
        const fontBtns = overlay.querySelectorAll('.font-size-btn');
        fontBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                const sizeMap = { small: '16px', medium: '18px', large: '22px' };
                document.documentElement.style.fontSize = sizeMap[size];

                // Update aria-checked
                fontBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');

                this._saveSetting('fontSize', size);
            });
        });

        // Physical keys toggle
        const physToggle = document.getElementById('show-physical-keys');
        physToggle.addEventListener('click', () => {
            const current = physToggle.getAttribute('aria-checked') === 'true';
            physToggle.setAttribute('aria-checked', String(!current));
            this._saveSetting('showPhysicalKeys', !current);
        });

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', () => {
            this._saveSetting('volume', Number(volumeSlider.value) / 100);
        });

        // Monster speed buttons
        const speedBtns = overlay.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                speedBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');
                this._saveSetting('monsterSpeed', btn.dataset.speed);
                // Live-update speed multiplier during gameplay
                this._speedMultiplier = btn.dataset.speed === 'slow' ? 0.6 : 1.0;
            });
        });

        // Hints buttons
        const hintsBtns = overlay.querySelectorAll('.hints-btn');
        hintsBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                hintsBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
                btn.setAttribute('aria-checked', 'true');
                this._saveSetting('hints', btn.dataset.hints);
            });
        });

        // Reset progress button
        document.getElementById('reset-progress').addEventListener('click', () => {
            this._resetTrigger = document.getElementById('reset-progress');
            this._openReset();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closeSettings();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Reset Confirmation Overlay
    // =========================================================

    _openReset() {
        const overlay = this._overlays.reset;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        const input = document.getElementById('reset-input');
        const confirmBtn = document.getElementById('reset-confirm');
        input.value = '';
        confirmBtn.disabled = true;

        document.getElementById('reset-close').focus();
    }

    _closeReset() {
        const overlay = this._overlays.reset;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        // Return focus
        if (this._resetTrigger && this._resetTrigger.isConnected) {
            this._resetTrigger.focus();
        }
        this._resetTrigger = null;
    }

    _bindResetOverlay() {
        const overlay = this._overlays.reset;
        const closeBtn = document.getElementById('reset-close');
        const cancelBtn = document.getElementById('reset-cancel');
        const confirmBtn = document.getElementById('reset-confirm');
        const input = document.getElementById('reset-input');

        closeBtn.addEventListener('click', () => this._closeReset());
        cancelBtn.addEventListener('click', () => this._closeReset());

        // Enable confirm when input matches
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value.trim().toUpperCase() !== 'RESET';
        });

        confirmBtn.addEventListener('click', () => {
            this._resetAllProgress();
            this._closeReset();
            this._closeSettings();
            if (this.state === 'PAUSED') {
                this._closePause();
            }
            this.showTitle();
        });

        // Focus trap + Escape
        overlay.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('open')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._closeReset();
                return;
            }

            if (e.key === 'Tab') {
                this._trapFocus(e, overlay);
            }
        });
    }

    // =========================================================
    // Results Screen
    // =========================================================

    _bindResultsScreen() {
        document.getElementById('results-next').addEventListener('click', () => {
            // Advance to next level if available
            if (this.currentLevel !== null && this.currentLevel < 9) {
                this.showGameplay(this.currentLevel + 1);
            } else {
                this.showLevelSelect();
            }
        });

        document.getElementById('results-replay').addEventListener('click', () => {
            if (this.currentLevel !== null) {
                this.showGameplay(this.currentLevel);
            }
        });

        document.getElementById('results-menu').addEventListener('click', () => {
            this.showLevelSelect();
        });
    }

    // =========================================================
    // Focus Trap Utility
    // =========================================================

    _trapFocus(e, container) {
        const focusable = container.querySelectorAll(
            'button:not([disabled]):not(.hidden), input:not([disabled]):not(.hidden), [tabindex]:not([tabindex="-1"]):not(.hidden)'
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    // =========================================================
    // Save / Load — delegates to SaveManager (save.js)
    // =========================================================

    _loadProgress() {
        const data = SaveManager.load();
        this.highestLevel = data.highestLevel;
        this._settings = data.settings;
        this._levels = data.levels;

        // Restore weapon unlocks
        if (this._weaponManager && data.weaponsUnlocked) {
            this._weaponManager.unlockedWeapons = data.weaponsUnlocked.slice();
        }

        // Apply settings
        this._applySettings();
    }

    _saveProgress() {
        const data = SaveManager.load();
        data.highestLevel = this.highestLevel;
        data.levels = this._levels;
        data.settings = this._settings;
        if (this._weaponManager) {
            data.weaponsUnlocked = this._weaponManager.unlockedWeapons.slice();
            data.selectedWeapon = this._weaponManager.currentWeapon;
        }
        SaveManager.save(data);
    }

    _saveSetting(key, value) {
        this._settings[key] = value;
        this._applySettings();
        this._saveProgress();
    }

    _applySettings() {
        // Font size
        const sizeMap = { small: '16px', medium: '18px', large: '22px' };
        document.documentElement.style.fontSize = sizeMap[this._settings.fontSize] || '18px';

        // Update settings UI to match loaded state
        const fontBtns = document.querySelectorAll('.font-size-btn');
        fontBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.size === this._settings.fontSize));
        });

        const physToggle = document.getElementById('show-physical-keys');
        if (physToggle) {
            physToggle.setAttribute('aria-checked', String(this._settings.showPhysicalKeys));
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = String(Math.round(this._settings.volume * 100));
        }

        const speedBtns = document.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.speed === this._settings.monsterSpeed));
        });

        const hintsBtns = document.querySelectorAll('.hints-btn');
        hintsBtns.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.hints === this._settings.hints));
        });
    }

    _getLevelStars(levelIndex) {
        const levelData = this._levels[String(levelIndex)];
        return levelData ? (levelData.stars || 0) : 0;
    }

    _resetAllProgress() {
        SaveManager.reset();
        const data = SaveManager.load();
        this.highestLevel = data.highestLevel;
        this._settings = data.settings;
        this._levels = data.levels;
        if (this._weaponManager) {
            this._weaponManager.unlockedWeapons = [1];
            this._weaponManager.currentWeapon = 1;
        }
        this._applySettings();
    }
}

// Initialize
window.game = new Game();
window.game.init().catch(err => console.error('Game init failed:', err));
