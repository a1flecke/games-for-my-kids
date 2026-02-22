/**
 * Keyboard Command 4 — WeaponManager
 * Weapon types, fire animation state machine, projectile tracking.
 * Timer lifecycle pattern per CLAUDE.md.
 */

// ============================================================
// Weapon Configs (plan.md §5.1)
// ============================================================

const WEAPON_CONFIGS = [
    { id: 1,  name: 'Pixel Pistol',       unlockLevel: 1  },
    { id: 2,  name: 'Data Blaster',       unlockLevel: 2  },
    { id: 3,  name: 'Byte Rifle',         unlockLevel: 3  },
    { id: 4,  name: 'Plasma Cannon',      unlockLevel: 4  },
    { id: 5,  name: 'Lightning Rod',      unlockLevel: 5  },
    { id: 6,  name: 'Frost Ray',          unlockLevel: 6  },
    { id: 7,  name: 'Fire Launcher',      unlockLevel: 7  },
    { id: 8,  name: 'Quantum Disruptor',  unlockLevel: 8  },
    { id: 9,  name: 'Gravity Gun',        unlockLevel: 9  },
    { id: 10, name: 'MEGA Cannon',        unlockLevel: 10 }
];

// ============================================================
// WeaponManager
// ============================================================

class WeaponManager {
    constructor() {
        this.weapons = WEAPON_CONFIGS;
        this.currentWeapon = 1;
        this.unlockedWeapons = [1];

        // State machine: idle, firing, flinching
        this.state = 'idle';

        // Fire animation timing (700ms total)
        // Recoil: 0-100ms, Travel: 100-300ms, Impact: 300-500ms, Recovery: 500-700ms
        this._fireTimer = null;
        this._flinchTimer = null;
        this._fireProgress = 0;    // 0.0 to 1.0 over 700ms
        this._flinchProgress = 0;  // 0.0 to 1.0 over 300ms

        // Active projectile (one at a time)
        this._projectile = null;

        // Callbacks
        this.onFireComplete = null;
        this.onImpact = null;      // called at progress ~0.43 (300ms)
    }

    /**
     * Cancel all timers and reset state. Single source of truth for cleanup.
     */
    cancel() {
        clearTimeout(this._fireTimer);
        this._fireTimer = null;
        clearTimeout(this._flinchTimer);
        this._flinchTimer = null;
        this.state = 'idle';
        this._fireProgress = 0;
        this._flinchProgress = 0;
        this._projectile = null;
        this.onFireComplete = null;
        this.onImpact = null;
    }

    /**
     * Select a weapon by ID (1-10). Only allows unlocked weapons.
     * @param {number} id
     * @returns {boolean} Whether selection succeeded
     */
    select(id) {
        if (id < 1 || id > 10) return false;
        if (!this.unlockedWeapons.includes(id)) return false;
        if (this.state !== 'idle') return false;  // can't switch during fire/flinch
        this.currentWeapon = id;
        return true;
    }

    /**
     * Unlock weapons up to a level.
     * @param {number} level - Level number (1-10)
     */
    unlockForLevel(level) {
        for (let i = 1; i <= Math.min(level, 10); i++) {
            if (!this.unlockedWeapons.includes(i)) {
                this.unlockedWeapons.push(i);
            }
        }
    }

    /**
     * Get the current weapon config.
     */
    getCurrentWeapon() {
        return this.weapons.find(w => w.id === this.currentWeapon) || this.weapons[0];
    }

    /**
     * Get the current weapon's display state for the renderer.
     * Returns 'idle', 'firing', or 'flinch'.
     */
    getWeaponState() {
        return this.state === 'flinching' ? 'flinch' : this.state;
    }

    /**
     * Check if weapon is currently in a locked state (firing or flinching).
     */
    isLocked() {
        return this.state !== 'idle';
    }

    /**
     * Fire the current weapon at a target monster.
     * @param {Monster} target
     * @param {number} canvasW
     * @param {number} canvasH
     * @param {number} vpX
     * @param {number} vpY
     * @param {Function} onImpact - Called when projectile hits (at ~300ms)
     * @param {Function} onComplete - Called when fire sequence ends (at 700ms)
     */
    fire(target, canvasW, canvasH, vpX, vpY, onImpact, onComplete) {
        this.cancel();  // defensive reset

        this.state = 'firing';
        this._fireProgress = 0;
        this.onImpact = onImpact;
        this.onFireComplete = onComplete;

        // Calculate target screen position
        const bounds = target.getBounds(vpX, vpY, canvasH);

        // Create projectile
        this._projectile = {
            weaponId: this.currentWeapon,
            startX: canvasW / 2,
            startY: canvasH - 40,
            targetX: bounds.centerX,
            targetY: bounds.centerY,
            progress: 0,
            impactFired: false
        };

        // Fire timer: 700ms total, then back to idle
        this._fireTimer = setTimeout(() => {
            const cb = this.onFireComplete;
            this.state = 'idle';
            this._fireProgress = 0;
            this._projectile = null;
            this._fireTimer = null;
            this.onFireComplete = null;
            this.onImpact = null;
            if (cb) cb();
        }, 700);
    }

    /**
     * Trigger flinch animation (wrong answer). 300ms.
     * @param {Function} [onComplete] - Called when flinch ends
     */
    flinch(onComplete) {
        if (this.state === 'firing') return; // don't interrupt fire

        this.cancel();  // defensive reset

        this.state = 'flinching';
        this._flinchProgress = 0;

        this.onFireComplete = onComplete || null;

        this._flinchTimer = setTimeout(() => {
            const cb = this.onFireComplete;
            this.state = 'idle';
            this._flinchProgress = 0;
            this._flinchTimer = null;
            this.onFireComplete = null;
            this.onImpact = null;
            if (cb) cb();
        }, 300);
    }

    /**
     * Update weapon state each frame.
     * @param {number} dt - Delta time in seconds
     * @returns {{projectile: object|null, impact: boolean}} Render data
     */
    update(dt) {
        let impact = false;

        if (this.state === 'firing') {
            this._fireProgress = Math.min(this._fireProgress + dt / 0.7, 1);

            // Update projectile progress
            if (this._projectile) {
                // Projectile travels during 100-300ms (progress 0.14 to 0.43)
                if (this._fireProgress >= 0.14 && this._fireProgress <= 0.43) {
                    const travelProgress = (this._fireProgress - 0.14) / (0.43 - 0.14);
                    this._projectile.progress = travelProgress;
                } else if (this._fireProgress > 0.43) {
                    this._projectile.progress = 1;

                    // Trigger impact callback once
                    if (!this._projectile.impactFired) {
                        this._projectile.impactFired = true;
                        impact = true;
                        if (this.onImpact) {
                            this.onImpact();
                            this.onImpact = null;  // fire once
                        }
                    }
                }
            }
        }

        if (this.state === 'flinching') {
            this._flinchProgress = Math.min(this._flinchProgress + dt / 0.3, 1);
        }

        return {
            projectile: this._projectile,
            impact
        };
    }

    /**
     * Get weapon name by ID.
     */
    getWeaponName(id) {
        const w = this.weapons.find(w => w.id === id);
        return w ? w.name : 'Unknown';
    }
}
