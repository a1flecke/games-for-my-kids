/**
 * AudioManager - Chiptune-style synthesized music and SFX via Web Audio API
 *
 * Session 13: Full audio system with synthesized music loops and sound effects.
 * No external audio files — everything is generated programmatically.
 *
 * Safari requires user interaction before AudioContext can start, so we
 * initialize on the first keypress/click/touch.
 */
class AudioManager {
    constructor() {
        this.ctx = null;           // AudioContext (created on first interaction)
        this.initialized = false;  // True after first user interaction
        this.muted = false;

        // Volume levels (0-100)
        this.masterVolume = 100;
        this.musicVolume = 70;
        this.sfxVolume = 80;

        // Gain nodes
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Current music state
        this.currentTrack = null;   // 'title', 'exploration', 'combat', etc.
        this.musicNodes = [];       // Active oscillator/gain nodes for current track
        this.musicIntervalId = null;
        this.crossfading = false;

        // Tempo and scheduling
        this.bpm = 120;
        this.nextNoteTime = 0;
        this.currentStep = 0;

        // Track whether we've set up listeners
        this.listenersAttached = false;

        // Bind the init handler
        this._onFirstInteraction = this._onFirstInteraction.bind(this);
    }

    /**
     * Attach event listeners for the first user interaction (Safari gate).
     * Call this once from Game.init().
     */
    attachListeners() {
        if (this.listenersAttached) return;
        this.listenersAttached = true;

        document.addEventListener('keydown', this._onFirstInteraction, { once: false });
        document.addEventListener('click', this._onFirstInteraction, { once: false });
        document.addEventListener('touchstart', this._onFirstInteraction, { once: false });
    }

    /**
     * Initialize AudioContext on first user interaction.
     * @private
     */
    _onFirstInteraction() {
        if (this.initialized) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                console.warn('Web Audio API not supported');
                return;
            }

            this.ctx = new AudioCtx();

            // Create gain node hierarchy: source -> category gain -> master gain -> destination
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);

            this._applyVolumes();

            this.initialized = true;
            console.log('AudioManager initialized');

            // Remove listeners — no longer needed
            document.removeEventListener('keydown', this._onFirstInteraction);
            document.removeEventListener('click', this._onFirstInteraction);
            document.removeEventListener('touchstart', this._onFirstInteraction);
        } catch (e) {
            console.error('Failed to initialize AudioManager:', e);
        }
    }

    // ── Volume Controls ──────────────────────────────────────────────

    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(100, value));
        this._applyVolumes();
    }

    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(100, value));
        this._applyVolumes();
    }

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(100, value));
        this._applyVolumes();
    }

    toggleMute() {
        this.muted = !this.muted;
        this._applyVolumes();
        return this.muted;
    }

    /**
     * Apply volume settings from the ScreenManager settings.
     * @param {object} settings - { musicVolume, sfxVolume }
     */
    applySettings(settings) {
        if (settings.musicVolume !== undefined) {
            this.musicVolume = settings.musicVolume;
        }
        if (settings.sfxVolume !== undefined) {
            this.sfxVolume = settings.sfxVolume;
        }
        this._applyVolumes();
    }

    /** @private */
    _applyVolumes() {
        if (!this.initialized) return;
        const master = this.muted ? 0 : this.masterVolume / 100;
        this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(this.musicVolume / 100, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(this.sfxVolume / 100, this.ctx.currentTime);
    }

    // ── Music System ─────────────────────────────────────────────────

    /**
     * Play a music track. Crossfades from current track if different.
     * @param {string} trackName - 'title', 'exploration', 'combat', 'victory', 'gameover'
     */
    playMusic(trackName) {
        if (!this.initialized || this.currentTrack === trackName) return;

        // Stop current music with fade out
        this.stopMusic(0.5);

        this.currentTrack = trackName;

        // Start new track after brief fade gap
        setTimeout(() => {
            if (this.currentTrack !== trackName) return; // Changed again before we started
            this._startTrack(trackName);
        }, 100);
    }

    /**
     * Stop current music.
     * @param {number} fadeTime - Fade out time in seconds
     */
    stopMusic(fadeTime = 0.3) {
        if (!this.initialized) return;

        // Stop scheduled note loop
        if (this.musicIntervalId !== null) {
            clearInterval(this.musicIntervalId);
            this.musicIntervalId = null;
        }

        // Fade out and stop all active music nodes
        const now = this.ctx.currentTime;
        for (const node of this.musicNodes) {
            try {
                if (node.gain) {
                    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
                    node.gain.gain.linearRampToValueAtTime(0, now + fadeTime);
                }
                if (node.osc) {
                    node.osc.stop(now + fadeTime + 0.1);
                }
            } catch (e) {
                // Node already stopped
            }
        }
        this.musicNodes = [];
        this.currentStep = 0;
    }

    /** @private */
    _startTrack(trackName) {
        if (!this.initialized) return;

        const tracks = {
            title: () => this._playSequenceLoop(this._titleMelody(), 130, 0.12),
            exploration: () => this._playSequenceLoop(this._explorationMelody(), 90, 0.08),
            combat: () => this._playSequenceLoop(this._combatMelody(), 160, 0.15),
        };

        const startFn = tracks[trackName];
        if (startFn) {
            startFn();
        }
    }

    /**
     * Play a looping note sequence using scheduled oscillators.
     * @private
     */
    _playSequenceLoop(melody, bpm, volume) {
        if (!this.initialized) return;

        const beatDuration = 60 / bpm; // seconds per beat
        this.currentStep = 0;

        const scheduleNote = () => {
            if (!this.initialized || this.musicNodes.length === 0 && this.currentStep > 0) return;

            const note = melody[this.currentStep % melody.length];
            this.currentStep++;

            if (note && note.freq > 0) {
                this._playMusicNote(note.freq, note.duration * beatDuration, volume, note.wave || 'square');
            }

            // Also play bass note if defined
            if (note && note.bass > 0) {
                this._playMusicNote(note.bass, note.duration * beatDuration * 0.9, volume * 0.5, 'triangle');
            }
        };

        // Schedule first note immediately
        scheduleNote();

        // Schedule subsequent notes at beat intervals
        this.musicIntervalId = setInterval(scheduleNote, beatDuration * 1000);

        // Track that music is playing (dummy tracker)
        this.musicNodes.push({ trackId: this.currentTrack });
    }

    /** @private */
    _playMusicNote(freq, duration, volume, waveType) {
        if (!this.initialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = waveType || 'square';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        // Quick attack, sustain, then fade
        gain.gain.setValueAtTime(volume, this.ctx.currentTime + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration + 0.05);

        this.musicNodes.push({ osc, gain });

        // Clean up after note ends
        osc.onended = () => {
            const idx = this.musicNodes.indexOf(this.musicNodes.find(n => n.osc === osc));
            if (idx > -1) this.musicNodes.splice(idx, 1);
        };
    }

    // ── Melody Definitions ───────────────────────────────────────────
    // Notes: C4=262, D4=294, E4=330, F4=349, G4=392, A4=440, B4=494, C5=523
    // Duration is in beats (1 = quarter note, 0.5 = eighth note)

    /** @private */
    _titleMelody() {
        // Hopeful, 8-bit style melody in C major
        return [
            { freq: 262, bass: 131, duration: 1, wave: 'square' },    // C4
            { freq: 330, bass: 131, duration: 0.5, wave: 'square' },  // E4
            { freq: 392, bass: 165, duration: 1, wave: 'square' },    // G4
            { freq: 523, bass: 165, duration: 1.5, wave: 'square' },  // C5
            { freq: 0, bass: 0, duration: 0.5 },                      // rest
            { freq: 392, bass: 196, duration: 0.5, wave: 'square' },  // G4
            { freq: 440, bass: 196, duration: 1, wave: 'square' },    // A4
            { freq: 392, bass: 165, duration: 1, wave: 'square' },    // G4
            { freq: 330, bass: 131, duration: 1, wave: 'square' },    // E4
            { freq: 294, bass: 147, duration: 0.5, wave: 'square' },  // D4
            { freq: 262, bass: 131, duration: 1.5, wave: 'square' },  // C4
            { freq: 0, bass: 0, duration: 1 },                        // rest
            { freq: 294, bass: 147, duration: 0.5, wave: 'square' },  // D4
            { freq: 330, bass: 165, duration: 0.5, wave: 'square' },  // E4
            { freq: 392, bass: 196, duration: 1, wave: 'square' },    // G4
            { freq: 440, bass: 220, duration: 1.5, wave: 'square' },  // A4
            { freq: 0, bass: 0, duration: 0.5 },                      // rest
            { freq: 392, bass: 196, duration: 0.5, wave: 'square' },  // G4
            { freq: 330, bass: 165, duration: 1, wave: 'square' },    // E4
            { freq: 294, bass: 147, duration: 1, wave: 'square' },    // D4
            { freq: 262, bass: 131, duration: 2, wave: 'square' },    // C4
            { freq: 0, bass: 0, duration: 2 },                        // rest
        ];
    }

    /** @private */
    _explorationMelody() {
        // Atmospheric, low-key melody in A minor
        return [
            { freq: 220, bass: 110, duration: 2, wave: 'triangle' },    // A3
            { freq: 0, bass: 0, duration: 1 },
            { freq: 262, bass: 131, duration: 1.5, wave: 'triangle' },  // C4
            { freq: 247, bass: 110, duration: 1, wave: 'triangle' },    // B3
            { freq: 220, bass: 110, duration: 2, wave: 'triangle' },    // A3
            { freq: 0, bass: 0, duration: 1.5 },
            { freq: 196, bass: 98, duration: 1, wave: 'triangle' },     // G3
            { freq: 220, bass: 110, duration: 1.5, wave: 'triangle' },  // A3
            { freq: 262, bass: 131, duration: 2, wave: 'triangle' },    // C4
            { freq: 0, bass: 0, duration: 1 },
            { freq: 247, bass: 124, duration: 1, wave: 'triangle' },    // B3
            { freq: 220, bass: 110, duration: 2, wave: 'triangle' },    // A3
            { freq: 196, bass: 98, duration: 1.5, wave: 'triangle' },   // G3
            { freq: 175, bass: 87, duration: 1, wave: 'triangle' },     // F3
            { freq: 196, bass: 98, duration: 2, wave: 'triangle' },     // G3
            { freq: 0, bass: 0, duration: 2 },
        ];
    }

    /** @private */
    _combatMelody() {
        // Urgent, fast tempo in D minor
        return [
            { freq: 294, bass: 147, duration: 0.5, wave: 'sawtooth' },  // D4
            { freq: 294, bass: 147, duration: 0.5, wave: 'sawtooth' },  // D4
            { freq: 349, bass: 175, duration: 0.5, wave: 'sawtooth' },  // F4
            { freq: 440, bass: 220, duration: 1, wave: 'sawtooth' },    // A4
            { freq: 392, bass: 196, duration: 0.5, wave: 'sawtooth' },  // G4
            { freq: 349, bass: 175, duration: 0.5, wave: 'sawtooth' },  // F4
            { freq: 330, bass: 165, duration: 0.5, wave: 'sawtooth' },  // E4
            { freq: 294, bass: 147, duration: 1, wave: 'sawtooth' },    // D4
            { freq: 0, bass: 0, duration: 0.25 },
            { freq: 262, bass: 131, duration: 0.5, wave: 'sawtooth' },  // C4
            { freq: 294, bass: 147, duration: 0.5, wave: 'sawtooth' },  // D4
            { freq: 349, bass: 175, duration: 1, wave: 'sawtooth' },    // F4
            { freq: 330, bass: 165, duration: 0.5, wave: 'sawtooth' },  // E4
            { freq: 294, bass: 147, duration: 0.5, wave: 'sawtooth' },  // D4
            { freq: 262, bass: 131, duration: 0.5, wave: 'sawtooth' },  // C4
            { freq: 294, bass: 147, duration: 1.5, wave: 'sawtooth' },  // D4
            { freq: 0, bass: 0, duration: 0.5 },
        ];
    }

    // ── Sound Effects ────────────────────────────────────────────────

    /**
     * Play a named sound effect.
     * @param {string} name - SFX name
     */
    playSFX(name) {
        if (!this.initialized || this.muted) return;

        switch (name) {
            case 'footstep':      this._sfxFootstep(); break;
            case 'door_open':     this._sfxDoorOpen(); break;
            case 'item_pickup':   this._sfxItemPickup(); break;
            case 'menu_navigate': this._sfxMenuNavigate(); break;
            case 'menu_select':   this._sfxMenuSelect(); break;
            case 'dialogue':      this._sfxDialogue(); break;
            case 'attack':        this._sfxAttack(); break;
            case 'damage':        this._sfxDamage(); break;
            case 'heal':          this._sfxHeal(); break;
            case 'save':          this._sfxSave(); break;
            case 'level_up':      this._sfxLevelUp(); break;
            case 'victory':       this._sfxVictory(); break;
            case 'defeat':        this._sfxDefeat(); break;
            case 'chest':         this._sfxChest(); break;
            default:
                console.warn(`Unknown SFX: ${name}`);
        }
    }

    /** @private - Short noise burst */
    _sfxFootstep() {
        this._playTone(80, 0.04, 0.06, 'square');
    }

    /** @private - Rising tone */
    _sfxDoorOpen() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.2);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    /** @private - Bright ascending arpeggio */
    _sfxItemPickup() {
        const freqs = [523, 659, 784]; // C5, E5, G5
        freqs.forEach((f, i) => {
            this._playTone(f, 0.08, i * 0.06, 'square');
        });
    }

    /** @private - Soft click */
    _sfxMenuNavigate() {
        this._playTone(600, 0.03, 0.03, 'square');
    }

    /** @private - Confirmation tone */
    _sfxMenuSelect() {
        this._playTone(523, 0.06, 0.08, 'square');
        this._playTone(784, 0.06, 0.1, 'square', 0.06);
    }

    /** @private - Soft pop */
    _sfxDialogue() {
        this._playTone(440, 0.03, 0.04, 'sine');
    }

    /** @private - Impact noise */
    _sfxAttack() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /** @private - Low thud */
    _sfxDamage() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /** @private - Gentle ascending chime */
    _sfxHeal() {
        const freqs = [392, 494, 587]; // G4, B4, D5
        freqs.forEach((f, i) => {
            this._playTone(f, 0.1, 0.12, 'sine', i * 0.08);
        });
    }

    /** @private - Warm chord */
    _sfxSave() {
        const now = this.ctx.currentTime;
        const freqs = [262, 330, 392]; // C4, E4, G4 - C major chord
        for (const f of freqs) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.setValueAtTime(0.08, now + 0.3);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.7);
        }
    }

    /** @private - Ascending arpeggio */
    _sfxLevelUp() {
        const freqs = [262, 330, 392, 523, 659, 784]; // C4 E4 G4 C5 E5 G5
        freqs.forEach((f, i) => {
            this._playTone(f, 0.12, 0.15, 'square', i * 0.08);
        });
    }

    /** @private - Triumphant short jingle */
    _sfxVictory() {
        const notes = [
            { freq: 392, delay: 0 },     // G4
            { freq: 494, delay: 0.1 },    // B4
            { freq: 587, delay: 0.2 },    // D5
            { freq: 784, delay: 0.35 },   // G5
        ];
        for (const note of notes) {
            this._playTone(note.freq, 0.15, 0.2, 'square', note.delay);
        }
    }

    /** @private - Somber descending */
    _sfxDefeat() {
        const notes = [
            { freq: 330, delay: 0 },      // E4
            { freq: 294, delay: 0.2 },     // D4
            { freq: 247, delay: 0.4 },     // B3
            { freq: 196, delay: 0.6 },     // G3
        ];
        for (const note of notes) {
            this._playTone(note.freq, 0.2, 0.25, 'triangle', note.delay);
        }
    }

    /** @private - Chest open sound */
    _sfxChest() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.15);
        osc.frequency.setValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // ── Utility ──────────────────────────────────────────────────────

    /**
     * Play a single tone.
     * @private
     * @param {number} freq - Frequency in Hz
     * @param {number} attackDuration - Attack + sustain duration in seconds
     * @param {number} totalDuration - Total duration in seconds
     * @param {string} waveType - 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} delay - Delay before starting in seconds
     */
    _playTone(freq, attackDuration, totalDuration, waveType, delay) {
        if (!this.initialized) return;

        const startTime = this.ctx.currentTime + (delay || 0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = waveType || 'square';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.setValueAtTime(0.12, startTime + attackDuration);
        gain.gain.linearRampToValueAtTime(0, startTime + totalDuration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(startTime);
        osc.stop(startTime + totalDuration + 0.05);
    }

    /**
     * Serialize audio preferences for saving.
     */
    toSaveData() {
        return {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted
        };
    }

    /**
     * Restore audio preferences from save data.
     */
    fromSaveData(data) {
        if (!data) return;
        if (data.masterVolume !== undefined) this.masterVolume = data.masterVolume;
        if (data.musicVolume !== undefined) this.musicVolume = data.musicVolume;
        if (data.sfxVolume !== undefined) this.sfxVolume = data.sfxVolume;
        if (data.muted !== undefined) this.muted = data.muted;
        this._applyVolumes();
    }
}

// Expose globally
window.AudioManager = AudioManager;
