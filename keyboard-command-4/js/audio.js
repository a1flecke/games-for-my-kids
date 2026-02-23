/**
 * Keyboard Command 4 — AudioManager
 * Web Audio synthesized sound effects + ambient drone.
 * AudioContext created lazily on first user gesture (iOS Safari requirement).
 */

class AudioManager {
    constructor() {
        this._ctx = null;
        this._masterGain = null;
        this._ambientOsc = null;
        this._ambientGain = null;
        this._ambientStopTimer = null;
        this._fanfareTimer = null;
        this._volume = 0.7;
    }

    /**
     * Initialize audio — call from a user gesture handler.
     * Creates AudioContext and master gain node.
     */
    init() {
        const ctx = this._getCtx();
        if (!ctx) return;
        if (!this._masterGain) {
            this._masterGain = ctx.createGain();
            this._masterGain.gain.value = this._volume;
            this._masterGain.connect(ctx.destination);
        }
    }

    /**
     * Lazily create AudioContext.
     */
    _getCtx() {
        if (this._ctx) return this._ctx;
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        this._ctx = new Ctor();
        return this._ctx;
    }

    /**
     * Ensure master gain exists and return it.
     */
    _getMaster() {
        if (!this._masterGain) {
            const ctx = this._getCtx();
            if (!ctx) return null;
            this._masterGain = ctx.createGain();
            this._masterGain.gain.value = this._volume;
            this._masterGain.connect(ctx.destination);
        }
        return this._masterGain;
    }

    /**
     * Set master volume (0–1).
     */
    setVolume(level) {
        this._volume = Math.max(0, Math.min(1, level));
        if (this._masterGain) {
            this._masterGain.gain.value = this._volume;
        }
    }

    // =============================================================
    // Sound Helpers
    // =============================================================

    /**
     * Play a simple tone with attack/decay envelope.
     */
    _playTone(freq, duration, type, gainVal) {
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;

        ctx.resume().then(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type || 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(gainVal || 0.3, ctx.currentTime + 0.01);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(master);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        });
    }

    /**
     * Play a sequence of tones (arpeggio).
     */
    _playArpeggio(freqs, noteLen, type, gainVal) {
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;

        ctx.resume().then(() => {
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = ctx.currentTime + i * noteLen;

                osc.type = type || 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(gainVal || 0.2, start + 0.01);
                gain.gain.linearRampToValueAtTime(0, start + noteLen);

                osc.connect(gain);
                gain.connect(master);
                osc.start(start);
                osc.stop(start + noteLen);
            });
        });
    }

    /**
     * Create a noise burst (white noise) for impact sounds.
     */
    _playNoise(duration, gainVal) {
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;

        ctx.resume().then(() => {
            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            src.buffer = buffer;
            gain.gain.setValueAtTime(gainVal || 0.15, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

            src.connect(gain);
            gain.connect(master);
            src.start(ctx.currentTime);
        });
    }

    // =============================================================
    // Weapon Fire Sounds — unique per weapon ID (1-10)
    // =============================================================

    playWeaponFire(weaponId) {
        const id = weaponId || 1;
        // Each weapon gets a distinct synth signature
        const configs = {
            1: { freq: 440, dur: 0.15, type: 'square' },      // Pixel Pistol
            2: { freq: 330, dur: 0.2, type: 'sawtooth' },      // Byte Blaster
            3: { freq: 520, dur: 0.12, type: 'triangle' },     // Code Cannon
            4: { freq: 200, dur: 0.3, type: 'sawtooth' },      // Debug Shotgun
            5: { freq: 600, dur: 0.1, type: 'square' },        // Syntax Sniper
            6: { freq: 280, dur: 0.25, type: 'triangle' },     // Logic Launcher
            7: { freq: 150, dur: 0.35, type: 'sawtooth' },     // Firewall Flamer
            8: { freq: 700, dur: 0.08, type: 'square' },       // Quantum Quasar
            9: { freq: 380, dur: 0.18, type: 'triangle' },     // Data Disruptor
            10: { freq: 100, dur: 0.4, type: 'sawtooth' }      // BFG (Boss Frag Gun)
        };
        const c = configs[id] || configs[1];
        this._playTone(c.freq, c.dur, c.type, 0.25);
        // Add a short noise burst for impact feel
        this._playNoise(0.05, 0.1);
    }

    // =============================================================
    // Combat Sounds
    // =============================================================

    playMonsterHit() {
        this._playTone(300, 0.1, 'square', 0.2);
        this._playNoise(0.04, 0.08);
    }

    playMonsterDeath() {
        // Descending pitch sweep
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;

        ctx.resume().then(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(master);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        });
    }

    playPlayerHit() {
        this._playTone(150, 0.15, 'sawtooth', 0.3);
        this._playNoise(0.06, 0.12);
    }

    playWrongKey() {
        // Dissonant buzzer
        this._playTone(90, 0.2, 'sawtooth', 0.2);
        this._playTone(95, 0.2, 'square', 0.15);
    }

    playHealthPickup() {
        this._playArpeggio([523, 659, 784], 0.08, 'triangle', 0.2);
    }

    playRoomClear() {
        // Triumphant ascending arpeggio
        this._playArpeggio([523, 659, 784, 1047], 0.1, 'square', 0.2);
    }

    // =============================================================
    // Combo Sounds
    // =============================================================

    playComboMilestone(tier) {
        // Higher tiers = more notes, higher pitch
        const baseFreqs = [
            [440, 554, 659],              // tier 1: 3-note
            [440, 554, 659, 880],         // tier 2: 4-note
            [523, 659, 784, 1047, 1319],  // tier 3: 5-note
            [523, 659, 784, 1047, 1319, 1568],  // tier 4
            [262, 523, 659, 784, 1047, 1319, 1568]  // tier 5
        ];
        const freqs = baseFreqs[Math.min(tier - 1, baseFreqs.length - 1)] || baseFreqs[0];
        this._playArpeggio(freqs, 0.07, 'square', 0.18);
    }

    // =============================================================
    // Boss Sounds
    // =============================================================

    playBossPhaseHit() {
        this._playTone(200, 0.3, 'sawtooth', 0.3);
        this._playNoise(0.1, 0.15);
        // Impact chord
        this._playArpeggio([200, 250, 300], 0.05, 'square', 0.2);
    }

    playBossDeath() {
        // Long dramatic descending sweep + fanfare
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;

        ctx.resume().then(() => {
            // Sweep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(master);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.85);
        });

        // Delayed fanfare
        clearTimeout(this._fanfareTimer);
        this._fanfareTimer = setTimeout(() => {
            this._fanfareTimer = null;
            this._playArpeggio([523, 659, 784, 1047], 0.12, 'square', 0.2);
        }, 500);
    }

    // =============================================================
    // Menu Sounds
    // =============================================================

    playMenuSelect() {
        this._playTone(660, 0.08, 'triangle', 0.15);
    }

    playLevelStart() {
        this._playArpeggio([330, 440, 554], 0.1, 'square', 0.2);
    }

    // =============================================================
    // Ambient Drone
    // =============================================================

    startAmbience() {
        const ctx = this._getCtx();
        if (!ctx) return;
        const master = this._getMaster();
        if (!master) return;
        if (this._ambientOsc) return; // already running

        ctx.resume().then(() => {
            this._ambientGain = ctx.createGain();
            this._ambientGain.gain.setValueAtTime(0, ctx.currentTime);
            this._ambientGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1);
            this._ambientGain.connect(master);

            this._ambientOsc = ctx.createOscillator();
            this._ambientOsc.type = 'sine';
            this._ambientOsc.frequency.value = 55; // Low A
            this._ambientOsc.connect(this._ambientGain);
            this._ambientOsc.start(ctx.currentTime);
        });
    }

    stopAmbience() {
        if (!this._ambientOsc || !this._ambientGain) return;
        const ctx = this._getCtx();
        if (!ctx) return;

        try {
            this._ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            const osc = this._ambientOsc;
            clearTimeout(this._ambientStopTimer);
            this._ambientStopTimer = setTimeout(() => {
                this._ambientStopTimer = null;
                try { osc.stop(); } catch { /* already stopped */ }
            }, 600);
        } catch {
            // Node may already be disconnected
        }

        this._ambientOsc = null;
        this._ambientGain = null;
    }

    // =============================================================
    // Cleanup
    // =============================================================

    cancel() {
        this.stopAmbience();
        clearTimeout(this._fanfareTimer);
        this._fanfareTimer = null;
        clearTimeout(this._ambientStopTimer);
        this._ambientStopTimer = null;
    }
}
