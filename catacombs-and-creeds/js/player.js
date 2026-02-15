/**
 * Player - Player character with movement, collision, and RPG stats
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        this.direction = 'down';

        // Movement state (set by Game from input each frame)
        this.moving = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        // RPG stats
        this.hp = 100;
        this.maxHp = 100;
        this.attack = 8;
        this.defense = 5;
        this.xp = 0;
        this.level = 1;
        this.xpThreshold = 100;

        // Equipment stat bonuses (modified by InventorySystem equip/unequip)
        this.equipmentBonus = { defense: 0, attack: 0, wisdom: 0 };
    }

    /** Update player position based on movement flags */
    update(map, deltaTime) {
        const timeScale = (deltaTime || 16.67) / 16.67; // Normalize to 60fps
        const speed = this.speed * timeScale;
        let dx = 0;
        let dy = 0;

        if (this.moving.up) {
            dy -= speed;
            this.direction = 'up';
        }
        if (this.moving.down) {
            dy += speed;
            this.direction = 'down';
        }
        if (this.moving.left) {
            dx -= speed;
            this.direction = 'left';
        }
        if (this.moving.right) {
            dx += speed;
            this.direction = 'right';
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707; // 1/sqrt(2)
            dy *= 0.707;
        }

        this.moveWithCollision(map, dx, dy);
    }

    /** Move player with per-axis collision detection */
    moveWithCollision(map, dx, dy) {
        const halfSize = this.size / 2;

        // Try X movement
        if (dx !== 0) {
            const newX = this.x + dx;
            if (map.isAreaWalkable(newX - halfSize, this.y - halfSize, this.size, this.size)) {
                this.x = newX;
            }
        }

        // Try Y movement
        if (dy !== 0) {
            const newY = this.y + dy;
            if (map.isAreaWalkable(this.x - halfSize, newY - halfSize, this.size, this.size)) {
                this.y = newY;
            }
        }
    }

    /** Get current tile position */
    getTilePosition() {
        return {
            x: worldToGrid(this.x, CONFIG.TILE_SIZE),
            y: worldToGrid(this.y, CONFIG.TILE_SIZE)
        };
    }

    /** Add XP and trigger level up when threshold reached */
    gainXP(amount) {
        this.xp += amount;
        while (this.xp >= this.xpThreshold) {
            this.levelUp();
        }
    }

    /** Level up: boost stats, full heal, increase threshold by 10% */
    levelUp() {
        this.xp -= this.xpThreshold;
        this.level++;
        this.maxHp += 10;
        this.attack += 2;
        this.defense += 1;
        this.hp = this.maxHp;
        this.xpThreshold = Math.ceil(this.xpThreshold * 1.1);
        console.log(`Level up! Now level ${this.level}`);
    }

    /** Get effective attack (base + equipment bonus) */
    getEffectiveAttack() {
        return this.attack + this.equipmentBonus.attack;
    }

    /** Get effective defense (base + equipment bonus) */
    getEffectiveDefense() {
        return this.defense + this.equipmentBonus.defense;
    }

    /** Reduce HP by amount (min 0) */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    /** Restore HP by amount (capped at maxHp) */
    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    /** Check if another entity is within range (default 1.5 tiles) */
    isNear(entity, range) {
        if (range === undefined) range = 1.5 * CONFIG.TILE_SIZE;
        const dx = this.x - entity.x;
        const dy = this.y - entity.y;
        return Math.sqrt(dx * dx + dy * dy) <= range;
    }

    /** Returns true if player is dead */
    isDead() {
        return this.hp <= 0;
    }
}
