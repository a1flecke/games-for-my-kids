/**
 * CombatSystem - Turn-based combat engine for Catacombs & Creeds
 *
 * Session 5: Full combat with player actions (Attack, Defend, Use Item,
 * Answer Question), enemy AI, damage formulas, floating damage numbers,
 * victory/defeat flows, fade transitions, and educational questions.
 *
 * Combat states: FADE_IN, PLAYER_TURN, ANIMATING, ENEMY_TURN, QUESTION,
 *                VICTORY, DEFEAT, FADE_OUT
 */

/** Combat sub-states */
const CombatState = Object.freeze({
    FADE_IN:      'FADE_IN',
    PLAYER_TURN:  'PLAYER_TURN',
    ANIMATING:    'ANIMATING',
    ENEMY_TURN:   'ENEMY_TURN',
    QUESTION:     'QUESTION',
    ITEM_SELECT:  'ITEM_SELECT',
    VICTORY:      'VICTORY',
    DEFEAT:       'DEFEAT',
    FADE_OUT:     'FADE_OUT',
    PHASE_TRANSITION: 'PHASE_TRANSITION'
});

class CombatSystem {
    constructor() {
        // Current combat state
        this.state = null;
        this.active = false;

        // Combatants
        this.player = null;
        this.enemy = null;
        this.enemyId = null;  // Map enemy ID for removal on victory

        // Combat stats (snapshot, so combat doesn't reference live player during animations)
        this.playerHP = 0;
        this.playerMaxHP = 0;
        this.enemyHP = 0;
        this.enemyMaxHP = 0;

        // Player combat modifiers
        this.defending = false;        // 50% damage reduction this turn
        this.attackBoost = false;      // +50% attack from correct question answer
        this.attackBoostMultiplier = 1;

        // Menu state
        this.selectedAction = 0;
        this.actions = ['Attack', 'Defend', 'Question', 'Item'];

        // Question state
        this.currentQuestion = null;
        this.selectedChoice = 0;
        this.questionResult = null;    // 'correct', 'incorrect', or null
        this.questionResultTimer = 0;
        this.questionExplanation = '';

        // Animation state
        this.animTimer = 0;
        this.animDuration = 0;
        this.animType = null;          // 'player_attack', 'enemy_attack', 'heal', etc.
        this.animCallback = null;

        // Floating damage numbers
        this.floatingNumbers = [];     // [{text, x, y, color, timer, duration}]

        // Turn indicator
        this.turnMessage = '';
        this.turnMessageTimer = 0;

        // Transition fade
        this.fadeAlpha = 0;
        this.fadeDuration = 300;       // ms
        this.fadeTimer = 0;
        this.fadeDirection = 'in';     // 'in' or 'out'
        this.onFadeComplete = null;

        // Victory / defeat state
        this.xpGained = 0;
        this.itemsGained = [];
        this.leveledUp = false;
        this.defeatHint = '';
        this.resultTimer = 0;

        // Boss state
        this.bossTurnCount = 0;
        this.bossPhases = null;       // Phase config from enemy definition
        this.currentPhase = 1;        // Current boss phase
        this.phaseTransitionTimer = 0;

        // Question system reference (set by Game)
        this.questionSystem = null;

        // Inventory reference (set by Game)
        this.inventory = null;

        // Abilities reference (set by Game)
        this.abilities = null;

        // Item select sub-state
        this.itemSelectList = [];    // Array of { id, name, quantity, def }
        this.selectedItemIndex = 0;

        // Current game level (for question filtering)
        this.gameLevel = 1;

        // Layout constants
        this.BUTTON_SIZE = 48;         // 44px minimum + padding
        this.BUTTON_GAP = 8;

        // Enemy shake animation
        this.enemyShakeX = 0;
        this.enemyShakeTimer = 0;

        // Player flash animation
        this.playerFlashTimer = 0;

        // Ambrose's Courage combat bonus (set by Game when starting combat)
        this.courageBonus = false;

        // Audio reference (set by Game)
        this.audio = null;
    }

    /**
     * Start a combat encounter.
     * @param {Player} player - The player object
     * @param {Object} enemyDef - Enemy definition from enemies.json
     * @param {string} enemyId - Map enemy ID for removal on victory
     * @param {number} gameLevel - Current game level for question filtering
     */
    startCombat(player, enemyDef, enemyId, gameLevel) {
        this.active = true;
        this.player = player;
        this.enemyId = enemyId;
        this.gameLevel = gameLevel || 1;

        // Snapshot player HP
        this.playerHP = player.hp;
        this.playerMaxHP = player.maxHp;

        // Create enemy instance from definition
        this.enemy = {
            name: enemyDef.name,
            hp: enemyDef.hp,
            maxHp: enemyDef.hp,
            attack: enemyDef.attack,
            defense: enemyDef.defense,
            xpReward: enemyDef.xpReward,
            itemDrops: enemyDef.itemDrops || [],
            color: enemyDef.color || CONFIG.COLORS.enemy,
            isBoss: enemyDef.isBoss || false,
            specialAttackName: enemyDef.specialAttackName || 'Heavy Strike',
            specialAttackMultiplier: enemyDef.specialAttackMultiplier || 1.5
        };

        this.enemyHP = this.enemy.hp;
        this.enemyMaxHP = this.enemy.maxHp;

        // Reset combat state
        this.defending = false;
        this.attackBoost = false;
        this.attackBoostMultiplier = 1;
        this.selectedAction = 0;
        this.floatingNumbers = [];
        this.turnMessage = '';
        this.turnMessageTimer = 0;
        this.xpGained = 0;
        this.itemsGained = [];
        this.leveledUp = false;
        this.defeatHint = '';
        this.resultTimer = 0;
        this.bossTurnCount = 0;
        this.currentPhase = 1;
        this.bossPhases = enemyDef.bossPhases || null;
        this.phaseTransitionTimer = 0;
        this.currentQuestion = null;
        this.questionResult = null;
        this.wonCombat = false;
        this.enemyShakeX = 0;
        this.enemyShakeTimer = 0;
        this.playerFlashTimer = 0;
        this.courageBonus = false;

        // Reset question tracking for this combat
        if (this.questionSystem) {
            this.questionSystem.resetCombatSession();
        }

        // Start with fade-in transition
        this.startFade('in', () => {
            this.state = CombatState.PLAYER_TURN;
            this.setTurnMessage('Your turn! Choose an action.');
        });

        console.log(`Combat started: ${this.enemy.name} (HP:${this.enemyHP}, ATK:${this.enemy.attack})`);
    }

    /**
     * End combat and clean up.
     * @returns {Object} Result with outcome and data
     */
    endCombat() {
        this.active = false;
        const result = {
            outcome: this.wonCombat ? 'victory' : 'defeat',
            enemyId: this.enemyId,
            xpGained: this.xpGained,
            itemsGained: this.itemsGained,
            leveledUp: this.leveledUp,
            playerHP: this.playerHP
        };

        // Sync HP back to player
        this.player.hp = this.playerHP;

        this.state = null;
        this.player = null;
        this.enemy = null;

        return result;
    }

    // ── Fade transitions ────────────────────────────────────────────

    startFade(direction, callback) {
        this.state = direction === 'in' ? CombatState.FADE_IN : CombatState.FADE_OUT;
        this.fadeDirection = direction;
        this.fadeTimer = 0;
        this.fadeAlpha = direction === 'in' ? 1 : 0;
        this.onFadeComplete = callback;
    }

    updateFade(deltaTime) {
        this.fadeTimer += deltaTime;
        const progress = Math.min(this.fadeTimer / this.fadeDuration, 1);

        if (this.fadeDirection === 'in') {
            // Fade from black to combat screen
            this.fadeAlpha = 1 - progress;
        } else {
            // Fade from combat screen to black
            this.fadeAlpha = progress;
        }

        if (progress >= 1) {
            if (this.onFadeComplete) {
                const cb = this.onFadeComplete;
                this.onFadeComplete = null;
                cb();
            }
        }
    }

    // ── Turn message helper ─────────────────────────────────────────

    setTurnMessage(text) {
        this.turnMessage = text;
        this.turnMessageTimer = 2000; // Show for 2 seconds
    }

    // ── Floating damage numbers ─────────────────────────────────────

    addFloatingNumber(text, x, y, color) {
        this.floatingNumbers.push({
            text: text,
            x: x,
            y: y,
            color: color || '#ffffff',
            timer: 0,
            duration: 1200
        });
    }

    updateFloatingNumbers(deltaTime) {
        for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
            const fn = this.floatingNumbers[i];
            fn.timer += deltaTime;
            fn.y -= deltaTime * 0.03; // Float upward
            if (fn.timer >= fn.duration) {
                this.floatingNumbers.splice(i, 1);
            }
        }
    }

    // ── Damage calculation ──────────────────────────────────────────

    /**
     * Calculate player attack damage.
     * Formula: (attack - defense/2) + random(-2, +2), 10% crit (2x), 5% miss
     */
    calculatePlayerDamage() {
        // 5% miss chance
        if (Math.random() < 0.05) {
            return { damage: 0, isCrit: false, isMiss: true };
        }

        let baseDamage = this.player.getEffectiveAttack() - (this.enemy.defense / 2);
        baseDamage += randomInt(-2, 2);
        baseDamage = Math.max(1, Math.round(baseDamage)); // Minimum 1 damage

        // Apply Ambrose's Courage bonus (+2 damage)
        if (this.courageBonus) {
            baseDamage += 2;
        }

        // Apply attack boost from correct question
        if (this.attackBoost) {
            baseDamage = Math.round(baseDamage * this.attackBoostMultiplier);
            this.attackBoost = false;
            this.attackBoostMultiplier = 1;
        }

        // 10% critical hit (2x damage)
        const isCrit = Math.random() < 0.10;
        if (isCrit) {
            baseDamage *= 2;
        }

        return { damage: baseDamage, isCrit: isCrit, isMiss: false };
    }

    /**
     * Calculate enemy attack damage.
     * @param {boolean} isSpecial - Whether this is a boss special attack
     */
    calculateEnemyDamage(isSpecial) {
        let baseDamage = this.enemy.attack - (this.player.getEffectiveDefense() / 2);
        baseDamage += randomInt(-2, 2);
        baseDamage = Math.max(1, Math.round(baseDamage));

        if (isSpecial) {
            baseDamage = Math.round(baseDamage * this.enemy.specialAttackMultiplier);
        }

        // Apply defend reduction
        if (this.defending) {
            baseDamage = Math.round(baseDamage * 0.5);
            this.defending = false;
        }

        return baseDamage;
    }

    // ── Animation helpers ───────────────────────────────────────────

    startAnimation(type, duration, callback) {
        this.state = CombatState.ANIMATING;
        this.animType = type;
        this.animTimer = 0;
        this.animDuration = duration;
        this.animCallback = callback;
    }

    updateAnimation(deltaTime) {
        this.animTimer += deltaTime;

        // Enemy shake effect
        if (this.animType === 'player_attack' && this.enemyShakeTimer > 0) {
            this.enemyShakeTimer -= deltaTime;
            this.enemyShakeX = Math.sin(this.enemyShakeTimer * 0.05) * 4;
            if (this.enemyShakeTimer <= 0) {
                this.enemyShakeX = 0;
            }
        }

        // Player flash effect
        if (this.animType === 'enemy_attack' && this.playerFlashTimer > 0) {
            this.playerFlashTimer -= deltaTime;
        }

        if (this.animTimer >= this.animDuration) {
            const cb = this.animCallback;
            this.animType = null;
            this.animCallback = null;
            if (cb) cb();
        }
    }

    // ── Main update ─────────────────────────────────────────────────

    /**
     * Update combat state. Called each frame by Game.updateCombat().
     * @param {number} deltaTime - ms since last frame
     * @param {InputHandler} input - Input handler
     */
    update(deltaTime, input) {
        if (!this.active) return;

        // Update floating numbers
        this.updateFloatingNumbers(deltaTime);

        // Update turn message timer
        if (this.turnMessageTimer > 0) {
            this.turnMessageTimer -= deltaTime;
        }

        switch (this.state) {
            case CombatState.FADE_IN:
            case CombatState.FADE_OUT:
                this.updateFade(deltaTime);
                break;

            case CombatState.PLAYER_TURN:
                this.updatePlayerTurn(input);
                break;

            case CombatState.ANIMATING:
                this.updateAnimation(deltaTime);
                break;

            case CombatState.ENEMY_TURN:
                this.executeEnemyTurn();
                break;

            case CombatState.QUESTION:
                this.updateQuestion(input, deltaTime);
                break;

            case CombatState.ITEM_SELECT:
                this.updateItemSelect(input);
                break;

            case CombatState.VICTORY:
                this.updateVictory(deltaTime, input);
                break;

            case CombatState.DEFEAT:
                this.updateDefeat(deltaTime, input);
                break;

            case CombatState.PHASE_TRANSITION:
                this.updatePhaseTransition(deltaTime, input);
                break;
        }
    }

    // ── Player turn ─────────────────────────────────────────────────

    updatePlayerTurn(input) {
        // Navigate action menu with arrows
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.selectedAction = (this.selectedAction - 1 + this.actions.length) % this.actions.length;
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.selectedAction = (this.selectedAction + 1) % this.actions.length;
        }

        // Number keys for quick select
        for (let i = 0; i < this.actions.length; i++) {
            if (input.wasPressed(String(i + 1))) {
                this.selectedAction = i;
                this.executePlayerAction();
                return;
            }
        }

        // Enter/Space to select
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            this.executePlayerAction();
        }
    }

    executePlayerAction() {
        const action = this.actions[this.selectedAction];

        switch (action) {
            case 'Attack':
                this.playerAttack();
                break;
            case 'Defend':
                this.playerDefend();
                break;
            case 'Question':
                this.playerQuestion();
                break;
            case 'Item':
                this.playerUseItem();
                break;
        }
    }

    playerAttack() {
        // In boss phase 2 with question_required, reduce damage unless boosted
        const isQuestionPhase = this._isQuestionRequiredPhase();

        const result = this.calculatePlayerDamage();

        if (result.isMiss) {
            this.setTurnMessage('You missed!');
            this.addFloatingNumber('MISS', 400, 150, '#888888');
            if (this.audio) this.audio.playSFX('footstep');
            this.startAnimation('player_attack', 600, () => {
                this.startEnemyTurn();
            });
            return;
        }

        // In question phase, attacks deal half damage without a boost
        let finalDamage = result.damage;
        if (isQuestionPhase && !this.attackBoost) {
            finalDamage = Math.max(1, Math.round(result.damage * 0.5));
            this.setTurnMessage(`Reduced damage! Answer Questions for full power!`);
        }

        // Apply damage to enemy
        this.enemyHP = Math.max(0, this.enemyHP - finalDamage);
        if (this.audio) this.audio.playSFX('attack');

        // Trigger shake
        this.enemyShakeTimer = 400;

        // Floating number
        const dmgColor = result.isCrit ? '#ff4444' : '#ffffff';
        const dmgText = result.isCrit ? `${finalDamage} CRIT!` : String(finalDamage);
        this.addFloatingNumber(dmgText, 400, 120, dmgColor);

        if (result.isCrit) {
            this.setTurnMessage(`Critical hit! ${finalDamage} damage!`);
        } else if (!isQuestionPhase || this.attackBoost) {
            this.setTurnMessage(`You deal ${finalDamage} damage!`);
        }

        // Check for enemy defeat
        if (this.enemyHP <= 0) {
            this.startAnimation('player_attack', 600, () => {
                this.onVictory();
            });
        } else {
            // Check for boss phase transition
            const phaseChanged = this._checkPhaseTransition();
            this.startAnimation('player_attack', 600, () => {
                if (phaseChanged) {
                    this.state = CombatState.PHASE_TRANSITION;
                    this.phaseTransitionTimer = 2500;
                } else {
                    this.startEnemyTurn();
                }
            });
        }
    }

    playerDefend() {
        this.defending = true;
        if (this.audio) this.audio.playSFX('menu_select');

        // In defend_required phase, defending also heals slightly
        if (this._isDefendRequiredPhase()) {
            const healAmount = Math.min(10, this.playerMaxHP - this.playerHP);
            if (healAmount > 0) {
                this.playerHP += healAmount;
                this.addFloatingNumber(`+${healAmount} HP`, 200, 420, CONFIG.COLORS.success);
            }
            this.setTurnMessage('Perfect defense! You brace and recover! (50% reduction)');
        } else {
            this.setTurnMessage('You brace for the next attack! (50% damage reduction)');
        }
        this.addFloatingNumber('DEFEND', 400, 450, CONFIG.COLORS.info);

        this.startAnimation('defend', 400, () => {
            this.startEnemyTurn();
        });
    }

    playerQuestion() {
        if (!this.questionSystem) {
            this.setTurnMessage('No questions available!');
            return;
        }

        const question = this.questionSystem.getQuestion(this.gameLevel);
        if (!question) {
            this.setTurnMessage('No questions available!');
            return;
        }

        this.currentQuestion = question;
        this.selectedChoice = 0;
        this.questionResult = null;
        this.questionResultTimer = 0;
        this.questionExplanation = '';
        this.state = CombatState.QUESTION;
    }

    playerUseItem() {
        if (!this.inventory) {
            this.setTurnMessage('No items to use yet!');
            return;
        }

        this.itemSelectList = this.inventory.getUsableItems();
        if (this.itemSelectList.length === 0) {
            this.setTurnMessage('No usable items!');
            return;
        }

        this.selectedItemIndex = 0;
        this.state = CombatState.ITEM_SELECT;
    }

    updateItemSelect(input) {
        // Navigate item list
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.selectedItemIndex = (this.selectedItemIndex - 1 + this.itemSelectList.length) % this.itemSelectList.length;
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.selectedItemIndex = (this.selectedItemIndex + 1) % this.itemSelectList.length;
        }

        // Number keys for quick select
        for (let i = 0; i < Math.min(this.itemSelectList.length, 4); i++) {
            if (input.wasPressed(String(i + 1))) {
                this.selectedItemIndex = i;
                this.executeItemUse();
                return;
            }
        }

        // Confirm selection
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            this.executeItemUse();
            return;
        }

        // Cancel back to action menu
        if (input.wasPressed('Escape')) {
            this.state = CombatState.PLAYER_TURN;
        }
    }

    executeItemUse() {
        const item = this.itemSelectList[this.selectedItemIndex];
        if (!item || !this.inventory) return;

        const result = this.inventory.useItemInCombat(item.id, this);
        if (result) {
            this.setTurnMessage(result.message);
            if (result.healed > 0) {
                this.addFloatingNumber(`+${result.healed} HP`, 200, 420, CONFIG.COLORS.success);
                if (this.audio) this.audio.playSFX('heal');
            }
            // Using an item consumes the turn
            this.startAnimation('heal', 400, () => {
                this.startEnemyTurn();
            });
        } else {
            this.setTurnMessage('Could not use item!');
            this.state = CombatState.PLAYER_TURN;
        }
    }

    // ── Enemy turn ──────────────────────────────────────────────────

    startEnemyTurn() {
        this.state = CombatState.ENEMY_TURN;
    }

    executeEnemyTurn() {
        this.bossTurnCount++;

        // Boss alternates between normal attack and special
        let isSpecial = false;
        let attackName = 'attacks';
        if (this.enemy.isBoss && this.bossTurnCount % 2 === 0) {
            isSpecial = true;
            attackName = `uses ${this.enemy.specialAttackName}`;
        }

        const damage = this.calculateEnemyDamage(isSpecial);

        // Apply damage to player
        this.playerHP = Math.max(0, this.playerHP - damage);
        if (this.audio) this.audio.playSFX('damage');

        // Trigger player flash
        this.playerFlashTimer = 400;

        // Floating number
        const dmgColor = isSpecial ? '#ff6600' : '#ff4444';
        this.addFloatingNumber(String(damage), 200, 450, dmgColor);
        this.setTurnMessage(`${this.enemy.name} ${attackName} for ${damage} damage!`);

        // Check for player defeat
        if (this.playerHP <= 0) {
            this.startAnimation('enemy_attack', 600, () => {
                this.onDefeat();
            });
        } else {
            this.startAnimation('enemy_attack', 600, () => {
                this.state = CombatState.PLAYER_TURN;
                this.selectedAction = 0;
                this.setTurnMessage('Your turn! Choose an action.');
            });
        }
    }

    // ── Question handling ───────────────────────────────────────────

    updateQuestion(input, deltaTime) {
        // If showing result, wait for timer or input
        if (this.questionResult !== null) {
            this.questionResultTimer -= deltaTime;
            if (this.questionResultTimer <= 0 ||
                input.wasPressed('Enter') || input.wasPressed(' ')) {
                this.finishQuestion();
            }
            return;
        }

        // Navigate choices
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.selectedChoice = (this.selectedChoice - 1 + this.currentQuestion.choices.length) % this.currentQuestion.choices.length;
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.selectedChoice = (this.selectedChoice + 1) % this.currentQuestion.choices.length;
        }

        // Number keys
        for (let i = 0; i < this.currentQuestion.choices.length; i++) {
            if (input.wasPressed(String(i + 1))) {
                this.selectedChoice = i;
                this.answerQuestion();
                return;
            }
        }

        // Enter/Space to answer
        if (input.wasPressed('Enter') || input.wasPressed(' ')) {
            this.answerQuestion();
        }

        // Escape to go back to action menu
        if (input.wasPressed('Escape')) {
            this.currentQuestion = null;
            this.state = CombatState.PLAYER_TURN;
        }
    }

    answerQuestion() {
        const choice = this.currentQuestion.choices[this.selectedChoice];

        if (choice.correct) {
            this.questionResult = 'correct';
            this.questionExplanation = choice.explanation;
            this.questionResultTimer = 3000;

            // In final stand phase, always give attack boost with higher multiplier
            if (this._isFinalStandPhase()) {
                this.attackBoost = true;
                this.attackBoostMultiplier = 2.0;
                this.addFloatingNumber('+100% ATK!', 200, 420, CONFIG.COLORS.warning);
                this.setTurnMessage('Correct! Your faith empowers a mighty strike!');
            }
            // Otherwise: heal 20 HP or +50% next attack (random)
            else if (this.playerHP < this.playerMaxHP && Math.random() < 0.5) {
                const healAmount = Math.min(20, this.playerMaxHP - this.playerHP);
                this.playerHP += healAmount;
                this.addFloatingNumber(`+${healAmount} HP`, 200, 420, CONFIG.COLORS.success);
                this.setTurnMessage(`Correct! You heal ${healAmount} HP!`);
                if (this.audio) this.audio.playSFX('heal');
            } else {
                this.attackBoost = true;
                this.attackBoostMultiplier = 1.5;
                this.addFloatingNumber('+50% ATK', 200, 420, CONFIG.COLORS.warning);
                this.setTurnMessage('Correct! Your next attack is boosted!');
            }
        } else {
            this.questionResult = 'incorrect';
            this.questionExplanation = choice.explanation;
            this.questionResultTimer = 3500;
            this.setTurnMessage('Not quite! Read the explanation.');
        }
    }

    finishQuestion() {
        this.currentQuestion = null;
        this.questionResult = null;
        this.questionExplanation = '';

        // Move to enemy turn (question consumes the player's turn)
        this.startEnemyTurn();
    }

    // ── Boss Phase System ──────────────────────────────────────────

    /**
     * Check if the boss should transition to a new phase.
     * @returns {boolean} true if phase changed
     */
    _checkPhaseTransition() {
        if (!this.bossPhases || !this.enemy.isBoss) return false;

        for (const phase of this.bossPhases) {
            if (phase.phase > this.currentPhase &&
                this.enemyHP <= this.enemyMaxHP * phase.hpThreshold) {
                this.currentPhase = phase.phase;
                this.setTurnMessage(phase.message);
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the current boss phase requires questions for full damage.
     */
    _isQuestionRequiredPhase() {
        if (!this.bossPhases || this.currentPhase <= 1) return false;
        const phase = this.bossPhases.find(p => p.phase === this.currentPhase);
        return phase && (phase.behavior === 'question_required' || phase.behavior === 'final_stand');
    }

    /**
     * Check if the current boss phase makes defend extra effective.
     */
    _isDefendRequiredPhase() {
        if (!this.bossPhases || this.currentPhase <= 1) return false;
        const phase = this.bossPhases.find(p => p.phase === this.currentPhase);
        return phase && phase.behavior === 'defend_required';
    }

    /**
     * Check if the current boss phase is the final stand (all mechanics boosted).
     */
    _isFinalStandPhase() {
        if (!this.bossPhases || this.currentPhase <= 1) return false;
        const phase = this.bossPhases.find(p => p.phase === this.currentPhase);
        return phase && phase.behavior === 'final_stand';
    }

    /**
     * Update phase transition display.
     */
    updatePhaseTransition(deltaTime, input) {
        this.phaseTransitionTimer -= deltaTime;
        if (this.phaseTransitionTimer <= 0 ||
            input.wasPressed('Enter') || input.wasPressed(' ')) {
            this.state = CombatState.PLAYER_TURN;
            this.selectedAction = 0;

            // Phase-specific hint messages
            const phase = this.bossPhases ? this.bossPhases.find(p => p.phase === this.currentPhase) : null;
            if (phase) {
                switch (phase.behavior) {
                    case 'defend_required':
                        this.setTurnMessage('Your turn! Use Defend to survive the onslaught!');
                        break;
                    case 'question_required':
                        this.setTurnMessage('Your turn! Answer Questions to deal full damage!');
                        break;
                    case 'final_stand':
                        this.setTurnMessage('Your turn! Use everything you have learned!');
                        break;
                    default:
                        this.setTurnMessage('Your turn! Choose an action.');
                }
            } else {
                this.setTurnMessage('Your turn! Answer Questions to deal full damage!');
            }
        }
    }

    // ── Victory / Defeat ────────────────────────────────────────────

    onVictory() {
        this.state = CombatState.VICTORY;
        this.wonCombat = true; // Track victory for endCombat outcome
        this.resultTimer = 0;

        // Calculate rewards
        this.xpGained = this.enemy.xpReward;
        this.itemsGained = [...this.enemy.itemDrops];

        // Apply XP to player (check for level up)
        const prevLevel = this.player.level;
        this.player.hp = this.playerHP; // sync HP before gainXP (which may full-heal on level up)
        this.player.gainXP(this.xpGained);
        this.leveledUp = this.player.level > prevLevel;

        // Re-sync HP after possible level up
        this.playerHP = this.player.hp;
        this.playerMaxHP = this.player.maxHp;

        if (this.audio) {
            this.audio.playSFX('victory');
            if (this.leveledUp) this.audio.playSFX('level_up');
        }
        this.setTurnMessage(`Victory! +${this.xpGained} XP`);
        console.log(`Combat victory: +${this.xpGained} XP, leveled up: ${this.leveledUp}`);
    }

    updateVictory(deltaTime, input) {
        this.resultTimer += deltaTime;

        // Wait for player to dismiss (after a short delay)
        if (this.resultTimer > 1000 &&
            (input.wasPressed('Enter') || input.wasPressed(' ') || input.wasPressed('Escape'))) {
            this.startFade('out', () => {
                // Combat is done, Game will handle the result
            });
        }
    }

    onDefeat() {
        this.state = CombatState.DEFEAT;
        this.resultTimer = 0;
        this.defeatHint = 'Try using Defend to reduce damage, or answer Questions to heal!';
        if (this.audio) this.audio.playSFX('defeat');
        this.setTurnMessage('You were defeated...');
        console.log('Combat defeat');
    }

    updateDefeat(deltaTime, input) {
        this.resultTimer += deltaTime;

        // Wait for player to dismiss
        if (this.resultTimer > 1500 &&
            (input.wasPressed('Enter') || input.wasPressed(' ') || input.wasPressed('Escape'))) {
            // Set player to 50% HP for respawn
            this.playerHP = Math.ceil(this.playerMaxHP * 0.5);
            this.player.hp = this.playerHP;

            this.startFade('out', () => {
                // Combat is done, Game will handle respawn
            });
        }
    }

    /**
     * Check if combat has ended (fade-out complete).
     * @returns {boolean}
     */
    isFinished() {
        return this.state === CombatState.FADE_OUT && this.fadeAlpha >= 1;
    }

    /**
     * Get the combat result after it finishes.
     * @returns {string} 'victory' or 'defeat'
     */
    getOutcome() {
        // Check what state we were in before fade-out
        if (this.xpGained > 0) return 'victory';
        return 'defeat';
    }

    // ── Rendering ───────────────────────────────────────────────────

    /**
     * Render the combat screen.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    render(ctx, canvas) {
        if (!this.active) return;

        const a = CONFIG.ACCESSIBILITY;
        const w = canvas.width;
        const h = canvas.height;

        // Background
        this.drawBackground(ctx, w, h);

        // Only draw combat UI if not fully faded
        if (this.fadeAlpha < 0.95) {
            // Enemy area (top)
            this.drawEnemy(ctx, w, h);

            // Player area (bottom)
            this.drawPlayerStatus(ctx, w, h);

            // Health bars
            this.drawHealthBars(ctx, w, h);

            // Turn indicator
            this.drawTurnMessage(ctx, w, h, a);

            // Action menu (during player turn)
            if (this.state === CombatState.PLAYER_TURN) {
                this.drawActionMenu(ctx, w, h, a);
            }

            // Question screen
            if (this.state === CombatState.QUESTION) {
                this.drawQuestion(ctx, w, h, a);
            }

            // Item select screen
            if (this.state === CombatState.ITEM_SELECT) {
                this.drawItemMenu(ctx, w, h, a);
            }

            // Floating damage numbers
            this.drawFloatingNumbers(ctx, a);

            // Victory screen
            if (this.state === CombatState.VICTORY) {
                this.drawVictoryScreen(ctx, w, h, a);
            }

            // Defeat screen
            if (this.state === CombatState.DEFEAT) {
                this.drawDefeatScreen(ctx, w, h, a);
            }

            // Phase transition screen
            if (this.state === CombatState.PHASE_TRANSITION) {
                this.drawPhaseTransition(ctx, w, h, a);
            }
        }

        // Fade overlay (always drawn on top)
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ── Drawing helpers ─────────────────────────────────────────────

    drawBackground(ctx, w, h) {
        // Dark dungeon background with subtle gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f0f1e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Subtle stone texture lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    drawEnemy(ctx, w, h) {
        const centerX = w / 2 + this.enemyShakeX;
        const enemyY = 80;
        const enemyW = 80;
        const enemyH = 100;

        // Enemy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(centerX, enemyY + enemyH + 10, enemyW * 0.6, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enemy body (colored rectangle placeholder)
        ctx.fillStyle = this.enemy.color;
        ctx.fillRect(centerX - enemyW / 2, enemyY, enemyW, enemyH);

        // Enemy outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - enemyW / 2, enemyY, enemyW, enemyH);

        // Boss crown indicator
        if (this.enemy.isBoss) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(centerX - 15, enemyY - 5);
            ctx.lineTo(centerX - 20, enemyY - 20);
            ctx.lineTo(centerX - 10, enemyY - 12);
            ctx.lineTo(centerX, enemyY - 22);
            ctx.lineTo(centerX + 10, enemyY - 12);
            ctx.lineTo(centerX + 20, enemyY - 20);
            ctx.lineTo(centerX + 15, enemyY - 5);
            ctx.closePath();
            ctx.fill();
        }

        // Enemy eyes (simple)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(centerX - 15, enemyY + 25, 10, 10);
        ctx.fillRect(centerX + 5, enemyY + 25, 10, 10);
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 12, enemyY + 28, 5, 5);
        ctx.fillRect(centerX + 8, enemyY + 28, 5, 5);

        // Enemy name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 18px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.enemy.name, w / 2, enemyY + enemyH + 20);
    }

    drawPlayerStatus(ctx, w, h) {
        const playerY = h - 180;
        const playerX = 40;
        const size = 60;

        // Player icon flash when taking damage
        let alpha = 1;
        if (this.playerFlashTimer > 0) {
            alpha = Math.sin(this.playerFlashTimer * 0.02) > 0 ? 1 : 0.3;
        }

        ctx.globalAlpha = alpha;

        // Player body (blue rectangle)
        ctx.fillStyle = CONFIG.COLORS.player;
        ctx.fillRect(playerX, playerY, size, size);
        ctx.strokeStyle = CONFIG.COLORS.playerOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(playerX, playerY, size, size);

        // Simple face
        ctx.fillStyle = '#000000';
        ctx.fillRect(playerX + 15, playerY + 18, 8, 8);
        ctx.fillRect(playerX + 37, playerY + 18, 8, 8);

        ctx.globalAlpha = 1;

        // Player label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${CONFIG.ACCESSIBILITY.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('You', playerX, playerY + size + 8);

        // Defend indicator
        if (this.defending) {
            ctx.fillStyle = CONFIG.COLORS.info;
            ctx.font = `bold 12px ${CONFIG.ACCESSIBILITY.fontFamily}`;
            ctx.fillText('DEFENDING', playerX, playerY - 16);
        }

        // Attack boost indicator
        if (this.attackBoost) {
            ctx.fillStyle = CONFIG.COLORS.warning;
            ctx.font = `bold 12px ${CONFIG.ACCESSIBILITY.fontFamily}`;
            ctx.fillText('ATK BOOST', playerX, playerY - (this.defending ? 30 : 16));
        }
    }

    drawHealthBars(ctx, w, h) {
        const a = CONFIG.ACCESSIBILITY;
        const barWidth = 200;
        const barHeight = 20;

        // ── Enemy health bar (top center) ──
        const enemyBarX = w / 2 - barWidth / 2;
        const enemyBarY = 210;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(enemyBarX, enemyBarY, barWidth, barHeight);

        // Health fill
        const enemyPercent = Math.max(0, this.enemyHP / this.enemyMaxHP);
        const enemyBarColor = enemyPercent > 0.5 ? CONFIG.COLORS.success :
                              enemyPercent > 0.25 ? CONFIG.COLORS.warning :
                              CONFIG.COLORS.danger;
        ctx.fillStyle = enemyBarColor;
        ctx.fillRect(enemyBarX, enemyBarY, barWidth * enemyPercent, barHeight);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyBarX, enemyBarY, barWidth, barHeight);

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 14px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.enemyHP} / ${this.enemyMaxHP}`, w / 2, enemyBarY + barHeight / 2);

        // ── Player health bar (bottom left) ──
        const playerBarX = 40;
        const playerBarY = h - 100;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(playerBarX, playerBarY, barWidth, barHeight);

        // Health fill
        const playerPercent = Math.max(0, this.playerHP / this.playerMaxHP);
        const playerBarColor = playerPercent > 0.5 ? CONFIG.COLORS.success :
                               playerPercent > 0.25 ? CONFIG.COLORS.warning :
                               CONFIG.COLORS.danger;
        ctx.fillStyle = playerBarColor;
        ctx.fillRect(playerBarX, playerBarY, barWidth * playerPercent, barHeight);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerBarX, playerBarY, barWidth, barHeight);

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 14px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.playerHP} / ${this.playerMaxHP}`, playerBarX + barWidth / 2, playerBarY + barHeight / 2);

        // Label
        ctx.font = `12px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('HP', playerBarX, playerBarY - 16);
    }

    drawTurnMessage(ctx, w, h, a) {
        if (this.turnMessageTimer <= 0 || !this.turnMessage) return;

        // Message bar at the middle of the screen
        const msgY = h / 2 - 15;
        const alpha = Math.min(1, this.turnMessageTimer / 500);

        ctx.globalAlpha = alpha;

        // Background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, msgY - 5, w, 35);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.turnMessage, w / 2, msgY + 12);

        ctx.globalAlpha = 1;
    }

    drawActionMenu(ctx, w, h, a) {
        const menuX = w - 220;
        const menuY = h - 220;
        const menuW = 200;
        const menuH = 210;

        // Menu background
        ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(menuX, menuY, menuW, menuH);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 16px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Actions', menuX + menuW / 2, menuY + 8);

        // Action buttons
        const buttonStartY = menuY + 36;
        const buttonH = this.BUTTON_SIZE;

        for (let i = 0; i < this.actions.length; i++) {
            const btnY = buttonStartY + i * (buttonH + this.BUTTON_GAP / 2);
            const isSelected = i === this.selectedAction;

            // Button background
            if (isSelected) {
                ctx.fillStyle = CONFIG.COLORS.info;
            } else {
                ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
            }
            ctx.fillRect(menuX + 10, btnY, menuW - 20, buttonH - 4);

            // Button border
            ctx.strokeStyle = isSelected ? '#ffffff' : '#555555';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(menuX + 10, btnY, menuW - 20, buttonH - 4);

            // Button text
            ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
            ctx.font = `${isSelected ? 'bold ' : ''}${a.fontSize}px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const prefix = `${i + 1}. `;
            const arrow = isSelected ? '\u25B6 ' : '  ';
            ctx.fillText(arrow + prefix + this.actions[i], menuX + 20, btnY + (buttonH - 4) / 2);
        }
    }

    drawQuestion(ctx, w, h, a) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        const boxW = w - 80;
        const boxH = 340;
        const boxX = 40;
        const boxY = h / 2 - boxH / 2;

        // Question box
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Question title
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.font = `bold 18px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Answer the Question!', w / 2, boxY + 12);

        // Question text (word-wrapped)
        ctx.fillStyle = a.textColor;
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        this.drawWrappedText(ctx, this.currentQuestion.question, boxX + 20, boxY + 45, boxW - 40, a);

        // If showing result
        if (this.questionResult !== null) {
            this.drawQuestionResult(ctx, boxX, boxY, boxW, boxH, a);
            return;
        }

        // Choice buttons
        const choiceStartY = boxY + 120;
        const choiceH = this.BUTTON_SIZE;

        for (let i = 0; i < this.currentQuestion.choices.length; i++) {
            const choiceY = choiceStartY + i * (choiceH + 10);
            const isSelected = i === this.selectedChoice;

            // Choice background
            ctx.fillStyle = isSelected ? CONFIG.COLORS.info : 'rgba(60, 60, 80, 0.3)';
            ctx.fillRect(boxX + 20, choiceY, boxW - 40, choiceH);

            // Choice border
            ctx.strokeStyle = isSelected ? '#ffffff' : CONFIG.COLORS.uiBorder;
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(boxX + 20, choiceY, boxW - 40, choiceH);

            // Choice text
            ctx.fillStyle = isSelected ? '#ffffff' : a.textColor;
            ctx.font = `${isSelected ? 'bold ' : ''}${a.fontSize}px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const prefix = `${i + 1}. `;
            const arrow = isSelected ? '\u25B6 ' : '  ';
            ctx.fillText(arrow + prefix + this.currentQuestion.choices[i].text,
                boxX + 30, choiceY + choiceH / 2);
        }

        // Hint
        ctx.fillStyle = '#888888';
        ctx.font = `12px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Arrow Keys to navigate, Enter to answer, Escape to go back', w / 2, boxY + boxH - 10);
    }

    drawQuestionResult(ctx, boxX, boxY, boxW, boxH, a) {
        const isCorrect = this.questionResult === 'correct';
        const resultY = boxY + 110;

        // Result banner
        ctx.fillStyle = isCorrect ? CONFIG.COLORS.success : CONFIG.COLORS.danger;
        ctx.fillRect(boxX + 20, resultY, boxW - 40, 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 20px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isCorrect ? 'Correct!' : 'Not quite!', boxX + boxW / 2, resultY + 20);

        // Explanation text (word-wrapped)
        ctx.fillStyle = a.textColor;
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        this.drawWrappedText(ctx, this.questionExplanation, boxX + 20, resultY + 55, boxW - 40, a);

        // Continue hint
        ctx.fillStyle = '#888888';
        ctx.font = `12px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Press Enter or Space to continue', boxX + boxW / 2, boxY + boxH - 10);
    }

    drawFloatingNumbers(ctx, a) {
        for (const fn of this.floatingNumbers) {
            const alpha = Math.max(0, 1 - fn.timer / fn.duration);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fn.color;
            ctx.font = `bold 22px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fn.text, fn.x, fn.y);
        }
        ctx.globalAlpha = 1;
    }

    drawVictoryScreen(ctx, w, h, a) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);

        const boxW = 360;
        const boxH = 240;
        const boxX = w / 2 - boxW / 2;
        const boxY = h / 2 - boxH / 2;

        // Victory box
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = CONFIG.COLORS.success;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Title
        ctx.fillStyle = CONFIG.COLORS.success;
        ctx.font = `bold 28px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Victory!', w / 2, boxY + 20);

        // Enemy defeated
        ctx.fillStyle = a.textColor;
        ctx.font = `18px ${a.fontFamily}`;
        ctx.fillText(`${this.enemy.name} defeated!`, w / 2, boxY + 60);

        // XP gained
        ctx.fillStyle = CONFIG.COLORS.warning;
        ctx.font = `bold 22px ${a.fontFamily}`;
        ctx.fillText(`+${this.xpGained} XP`, w / 2, boxY + 95);

        // Level up notification
        let nextY = boxY + 130;
        if (this.leveledUp) {
            ctx.fillStyle = CONFIG.COLORS.accent1;
            ctx.font = `bold 20px ${a.fontFamily}`;
            ctx.fillText('LEVEL UP!', w / 2, nextY);
            nextY += 30;
        }

        // Item drops
        if (this.itemsGained.length > 0) {
            ctx.fillStyle = a.textColor;
            ctx.font = `16px ${a.fontFamily}`;
            for (const itemId of this.itemsGained) {
                const def = this.inventory ? this.inventory.getDef(itemId) : null;
                const displayName = def ? def.name : itemId;
                ctx.fillText(`Found: ${displayName}`, w / 2, nextY);
                nextY += 24;
            }
        }

        // Continue hint
        if (this.resultTimer > 1000) {
            ctx.fillStyle = '#888888';
            ctx.font = `14px ${a.fontFamily}`;
            ctx.fillText('Press Enter to continue', w / 2, boxY + boxH - 25);
        }
    }

    drawDefeatScreen(ctx, w, h, a) {
        // Semi-transparent red overlay
        ctx.fillStyle = 'rgba(40, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        const boxW = 400;
        const boxH = 200;
        const boxX = w / 2 - boxW / 2;
        const boxY = h / 2 - boxH / 2;

        // Defeat box
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = CONFIG.COLORS.danger;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Title
        ctx.fillStyle = CONFIG.COLORS.danger;
        ctx.font = `bold 28px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Defeated!', w / 2, boxY + 20);

        // Message
        ctx.fillStyle = a.textColor;
        ctx.font = `16px ${a.fontFamily}`;
        ctx.fillText('You will respawn at the last checkpoint.', w / 2, boxY + 65);

        // Hint
        ctx.fillStyle = CONFIG.COLORS.info;
        ctx.font = `14px ${a.fontFamily}`;
        this.drawWrappedText(ctx, this.defeatHint, boxX + 20, boxY + 100, boxW - 40, a);

        // Continue hint
        if (this.resultTimer > 1500) {
            ctx.fillStyle = '#888888';
            ctx.font = `14px ${a.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.fillText('Press Enter to continue', w / 2, boxY + boxH - 20);
        }
    }

    drawItemMenu(ctx, w, h, a) {
        const menuX = w - 240;
        const menuY = h - 260;
        const menuW = 220;
        const itemCount = this.itemSelectList.length;
        const menuH = 40 + itemCount * (this.BUTTON_SIZE + 4);

        // Menu background
        ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.strokeStyle = CONFIG.COLORS.warning;
        ctx.lineWidth = 3;
        ctx.strokeRect(menuX, menuY, menuW, menuH);

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold 16px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Use Item', menuX + menuW / 2, menuY + 8);

        // Item buttons
        const buttonStartY = menuY + 34;
        const buttonH = this.BUTTON_SIZE;

        for (let i = 0; i < itemCount; i++) {
            const item = this.itemSelectList[i];
            const btnY = buttonStartY + i * (buttonH + 4);
            const isSelected = i === this.selectedItemIndex;

            // Button background
            ctx.fillStyle = isSelected ? CONFIG.COLORS.info : 'rgba(60, 60, 80, 0.8)';
            ctx.fillRect(menuX + 10, btnY, menuW - 20, buttonH - 4);

            // Button border
            ctx.strokeStyle = isSelected ? '#ffffff' : '#555555';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(menuX + 10, btnY, menuW - 20, buttonH - 4);

            // Item color swatch
            if (item.def) {
                ctx.fillStyle = item.def.color || '#888888';
                ctx.fillRect(menuX + 16, btnY + 6, 14, 14);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(menuX + 16, btnY + 6, 14, 14);
            }

            // Item text
            ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
            ctx.font = `${isSelected ? 'bold ' : ''}${a.fontSize}px ${a.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const prefix = `${i + 1}. `;
            const qtyText = item.quantity > 1 ? ` x${item.quantity}` : '';
            ctx.fillText(prefix + item.name + qtyText, menuX + 36, btnY + (buttonH - 4) / 2);
        }

        // Hint
        ctx.fillStyle = '#888888';
        ctx.font = `11px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Esc to cancel', menuX + menuW / 2, buttonStartY + itemCount * (buttonH + 4) + 2);
    }

    drawPhaseTransition(ctx, w, h, a) {
        // Dramatic overlay
        ctx.fillStyle = 'rgba(40, 0, 40, 0.6)';
        ctx.fillRect(0, 0, w, h);

        const boxW = 450;
        const boxH = 150;
        const boxX = w / 2 - boxW / 2;
        const boxY = h / 2 - boxH / 2;

        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = CONFIG.COLORS.warning;
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = CONFIG.COLORS.warning;
        ctx.font = `bold 24px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`Phase ${this.currentPhase}!`, w / 2, boxY + 15);

        ctx.fillStyle = a.textColor;
        ctx.font = `16px ${a.fontFamily}`;
        this.drawWrappedText(ctx, this.turnMessage, boxX + 20, boxY + 55, boxW - 40, a);

        ctx.fillStyle = '#888888';
        ctx.font = `14px ${a.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to continue', w / 2, boxY + boxH - 25);
    }

    /**
     * Simple word-wrap text drawing helper.
     */
    drawWrappedText(ctx, text, x, y, maxWidth, a) {
        ctx.font = `${a.fontSize}px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const lineHeight = a.fontSize * a.lineHeight;
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
            const testLine = line ? line + ' ' + words[i] : words[i];
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && line) {
                ctx.fillText(line, x, currentY);
                line = words[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, x, currentY);
        }
    }
}

// Expose globally
window.CombatSystem = CombatSystem;
window.CombatState = CombatState;
