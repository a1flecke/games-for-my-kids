/**
 * Keyboard Command 4 — Monster System
 * Monster class, MonsterFactory, type configs, behaviors.
 */

// ============================================================
// Monster Type Configurations (plan.md §4.1)
// ============================================================

const MONSTER_TYPES = {
    gremlin: {
        name: 'Glitch Gremlin',
        tier: 'common',
        baseHp: 1,
        speed: 0.12,       // depth units per second
        behavior: 'charge',
        attackDamage: 10,
        spriteKey: 'gremlin'
    },
    brute: {
        name: 'Virus Brute',
        tier: 'tank',
        baseHp: 3,
        speed: 0.05,
        behavior: 'charge',
        attackDamage: 15,
        spriteKey: 'brute'
    },
    shifter: {
        name: 'Trojan Shifter',
        tier: 'tricky',
        baseHp: 1,
        speed: 0.08,
        behavior: 'charge',
        attackDamage: 10,
        promptMode: 'action',  // always shows action description, not key combo
        spriteKey: 'shifter'
    },
    mage: {
        name: 'Malware Mage',
        tier: 'ranged',
        baseHp: 2,
        speed: 0,            // stationary
        behavior: 'ranged',
        attackDamage: 15,
        projectileInterval: 4, // seconds between projectiles
        projectileDamage: 10,
        projectileTravelTime: 2,
        spriteKey: 'mage'
    },
    swarm: {
        name: 'Worm Swarm',
        tier: 'horde',
        baseHp: 1,
        speed: 0.15,
        behavior: 'charge',
        attackDamage: 5,
        swarmCount: 5,
        spriteKey: 'swarm'
    },
    knight: {
        name: 'Ransomware Knight',
        tier: 'shield',
        baseHp: 1,
        shieldHp: 1,
        speed: 0.07,
        behavior: 'charge',
        attackDamage: 15,
        spriteKey: 'knight'
    },
    phantom: {
        name: 'Phishing Phantom',
        tier: 'deceptive',
        baseHp: 1,
        speed: 0.04,
        behavior: 'charge',
        attackDamage: 0,     // damage comes from player's wrong-answer confusion
        spriteKey: 'phantom'
    }
};

// ============================================================
// Monster Class
// ============================================================

class Monster {
    /**
     * @param {string} type - Key into MONSTER_TYPES
     * @param {number} depth - Starting depth (0.0 back, 1.0 front)
     * @param {string} shortcutId - ID of assigned shortcut
     * @param {string} promptMode - 'key' or 'action'
     * @param {number} offsetX - Horizontal offset from center
     */
    constructor(type, depth, shortcutId, promptMode, offsetX) {
        const config = MONSTER_TYPES[type];
        if (!config) throw new Error(`Unknown monster type: ${type}`);

        this.type = type;
        this.config = config;
        this.hp = config.baseHp;
        this.maxHp = config.baseHp;
        this.shieldHp = config.shieldHp || 0;
        this.maxShieldHp = this.shieldHp;
        this.depth = depth;
        this.speed = config.speed;
        this.shortcutId = shortcutId;
        this.shieldShortcutId = null;  // set externally for knight
        this.promptMode = promptMode || config.promptMode || 'key';
        this.offsetX = offsetX || 0;

        // State: spawning → idle/advancing → hit → dying → dead
        this.state = 'spawning';
        this._spawnTimer = 0;
        this._hitTimer = 0;
        this._deathTimer = 0;
        this.deathProgress = 0;

        // Targeting
        this.targeted = false;

        // Mage projectile timer
        this._projectileTimer = config.projectileInterval || 0;
        this._projectilePending = false;

        // Force-target flag (when monster reaches danger zone)
        this._forceTargeted = false;
    }

    /**
     * Update monster each frame.
     * @param {number} dt - Delta time in seconds
     * @param {number} speedMultiplier - From settings (1.0 normal, 0.6 slow)
     * @returns {string|null} Event: 'attack', 'projectile', 'dead', or null
     */
    update(dt, speedMultiplier) {
        switch (this.state) {
            case 'spawning':
                this._spawnTimer += dt;
                if (this._spawnTimer >= 0.3) {
                    this.state = this.speed > 0 ? 'advancing' : 'idle';
                }
                return null;

            case 'idle':
                // Mages stay idle but fire projectiles
                if (this.config.behavior === 'ranged') {
                    this._projectileTimer -= dt;
                    if (this._projectileTimer <= 0) {
                        this._projectileTimer = this.config.projectileInterval;
                        return 'projectile';
                    }
                }
                return null;

            case 'advancing':
                this.depth += this.speed * speedMultiplier * dt;
                if (this.depth >= 1.0) {
                    this.depth = 1.0;
                    return 'attack';
                }
                // Check force-target zone
                if (this.depth >= 0.85 && !this._forceTargeted) {
                    this._forceTargeted = true;
                }
                return null;

            case 'hit':
                this._hitTimer += dt;
                if (this._hitTimer >= 0.2) {
                    if (this.hp <= 0) {
                        this.state = 'dying';
                        this._deathTimer = 0;
                        this.deathProgress = 0;
                    } else {
                        this.state = this.speed > 0 ? 'advancing' : 'idle';
                    }
                }
                return null;

            case 'dying':
                this._deathTimer += dt;
                this.deathProgress = Math.min(this._deathTimer / 0.5, 1);
                if (this.deathProgress >= 1) {
                    this.state = 'dead';
                    return 'dead';
                }
                return null;

            case 'dead':
                return null;
        }
        return null;
    }

    /**
     * Deal damage to this monster.
     * @param {number} amount
     * @returns {string} 'shield-break', 'hit', or 'killed'
     */
    takeDamage(amount) {
        if (this.shieldHp > 0) {
            this.shieldHp -= amount;
            if (this.shieldHp <= 0) {
                this.shieldHp = 0;
                this.state = 'hit';
                this._hitTimer = 0;
                return 'shield-break';
            }
            this.state = 'hit';
            this._hitTimer = 0;
            return 'hit';
        }

        this.hp -= amount;
        this.state = 'hit';
        this._hitTimer = 0;

        if (this.hp <= 0) {
            this.hp = 0;
            return 'killed';
        }
        return 'hit';
    }

    /**
     * Get the current shortcut ID this monster requires.
     * For knights with shields, returns shieldShortcutId if shield is up.
     */
    getActiveShortcutId() {
        if (this.type === 'knight' && this.shieldHp > 0 && this.shieldShortcutId) {
            return this.shieldShortcutId;
        }
        return this.shortcutId;
    }

    /**
     * Render scale based on depth (0.3 at back, 1.0 at front).
     */
    getScale() {
        return 0.3 + this.depth * 0.7;
    }

    /**
     * Get bounding box for rendering and targeting.
     * @param {number} vpX - Vanishing point X
     * @param {number} vpY - Vanishing point Y
     * @param {number} canvasH - Canvas height
     * @returns {{x: number, y: number, width: number, height: number, centerX: number, centerY: number}}
     */
    getBounds(vpX, vpY, canvasH) {
        const scale = this.getScale();
        const floorY = vpY + 80;
        const spriteSize = 64;

        const posX = vpX + this.offsetX * scale;
        const posY = floorY + (canvasH - floorY) * this.depth * 0.8;
        const drawW = spriteSize * scale;
        const drawH = spriteSize * scale;

        return {
            x: posX - drawW / 2,
            y: posY - drawH,
            width: drawW,
            height: drawH,
            centerX: posX,
            centerY: posY - drawH / 2
        };
    }

    /**
     * Whether this monster is alive (not dying/dead).
     */
    isAlive() {
        return this.state !== 'dying' && this.state !== 'dead';
    }
}

// ============================================================
// MonsterFactory
// ============================================================

class MonsterFactory {
    /**
     * Create a single monster.
     * @param {string} type - Monster type key
     * @param {number} depth - Starting depth
     * @param {string} shortcutId - Assigned shortcut
     * @param {string} [promptMode] - 'key' or 'action'
     * @param {number} [offsetX] - Horizontal offset
     * @returns {Monster}
     */
    static create(type, depth, shortcutId, promptMode, offsetX) {
        return new Monster(type, depth, shortcutId, promptMode, offsetX || 0);
    }

    /**
     * Create monsters from a wave definition.
     * @param {Array} waveDef - Array of {type, depth, offsetX?, promptMode?}
     * @param {Function} assignShortcut - (type) => {shortcutId, promptMode, shieldShortcutId?}
     * @returns {Monster[]}
     */
    static createWave(waveDef, assignShortcut) {
        const monsters = [];
        for (const def of waveDef) {
            const assignment = assignShortcut(def.type);
            const m = MonsterFactory.create(
                def.type,
                def.depth,
                assignment.shortcutId,
                def.promptMode || assignment.promptMode,
                def.offsetX || 0
            );
            if (assignment.shieldShortcutId) {
                m.shieldShortcutId = assignment.shieldShortcutId;
            }
            monsters.push(m);
        }
        return monsters;
    }

    /**
     * Create swarm sub-entities from a single swarm definition.
     * @param {number} depth - Starting depth
     * @param {Function} assignShortcut - (type) => assignment
     * @param {number} count - Number of worms (default 5)
     * @returns {Monster[]}
     */
    static createSwarm(depth, assignShortcut, count) {
        count = count || 5;
        const monsters = [];
        for (let i = 0; i < count; i++) {
            const assignment = assignShortcut('swarm');
            const offsetX = (i - (count - 1) / 2) * 40;
            const m = MonsterFactory.create(
                'swarm',
                depth + (Math.random() * 0.1 - 0.05),
                assignment.shortcutId,
                assignment.promptMode,
                offsetX
            );
            monsters.push(m);
        }
        return monsters;
    }
}
