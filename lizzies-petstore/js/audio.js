/**
 * audio.js — Web Audio synthesizer (warm sine-based sounds).
 * AudioContext created lazily on first user gesture (iOS Safari requirement).
 * All creature voices: sine waves + low-pass filter + detuned chorus.
 *
 * Sound categories:
 *   - Creature voices (purr, mew, chirp, coo, squeak, etc.)
 *   - Interaction SFX (munch, splash, brush, pop, sparkle, etc.)
 *   - Ambient (park chirps, gentle wind)
 *   - Background music (simple sine-based melodies)
 */

class AudioManager {
    constructor() {
        this._ctx = null;      // Created lazily on first user gesture
        this._volume = 0.8;
        this._muted = false;
        this._masterGain = null;
    }

    /**
     * Get or create AudioContext lazily (iOS Safari requirement).
     * Must only be called from a user-gesture handler.
     */
    _getCtx() {
        if (!this._ctx) {
            this._ctx = new AudioContext();
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.value = this._muted ? 0 : this._volume;
            this._masterGain.connect(this._ctx.destination);
        }
        return this._ctx;
    }

    /**
     * Resume AudioContext (required after iOS Safari suspension).
     * Returns a Promise — schedule sounds inside .then().
     */
    _resume() {
        const ctx = this._getCtx();
        return ctx.resume();
    }

    /**
     * Set master volume (0-1).
     */
    setVolume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : this._volume;
        }
    }

    /**
     * Toggle mute.
     */
    setMuted(muted) {
        this._muted = muted;
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : this._volume;
        }
    }

    /**
     * Play a sound effect.
     * @param {string} type — sound name (e.g., 'pop', 'sparkle', 'munch')
     */
    playSound(type) {
        this._resume().then(() => {
            switch (type) {
                case 'pop': this._playPop(); break;
                case 'sparkle': this._playSparkle(); break;
                case 'munch': this._playMunch(); break;
                case 'happy': this._playHappyJingle(); break;
                default: break;
            }
        });
    }

    /**
     * Play a creature voice.
     * @param {string} voiceType — e.g., 'purr', 'mew', 'chirp'
     * @param {number} detune — per-creature uniqueness offset
     */
    playVoice(voiceType, detune) {
        this._resume().then(() => {
            // Voice implementations — Session 8
        });
    }

    // ── Sound implementations (placeholders for Session 8) ──

    _playPop() {
        const ctx = this._ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    }

    _playSparkle() {
        const ctx = this._ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    _playMunch() {
        // 3 quick click tones — placeholder
    }

    _playHappyJingle() {
        // Ascending major triad — placeholder
    }
}
