(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.AudioManager = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildAudioManager() {
    class AudioManager {
        constructor() {
            this._ctx = null;
            this._masterGain = null;
            this._effectsGain = null;
            this._musicGain = null;
            this._musicNodes = [];
            this._volume = 0.7;
            this._muted = false;
            this._musicEnabled = false;
        }

        preWarm() {
            this._resume();
            if (this._musicEnabled) this.startMusic();
        }

        setMuted(muted) {
            this._muted = !!muted;
            if (this._effectsGain) this._effectsGain.gain.value = this._muted ? 0 : 1;
        }

        setVolume(volume) {
            this._volume = Math.max(0, Math.min(1, volume));
            if (this._masterGain) this._masterGain.gain.value = this._volume;
        }

        setMusicEnabled(enabled, startNow) {
            this._musicEnabled = !!enabled;
            if (this._musicEnabled && startNow !== false) this.startMusic();
            else this.stopMusic();
        }

        isMusicPlaying() {
            return this._musicNodes.length > 0;
        }

        startMusic() {
            this._musicEnabled = true;
            if (this.isMusicPlaying()) return;
            const ctx = this._getCtx();
            if (!ctx || !this._musicGain) return;
            ctx.resume().then(() => {
                if (!this._musicEnabled || this.isMusicPlaying()) return;
                const root = ctx.createOscillator();
                const fifth = ctx.createOscillator();
                root.type = 'sine';
                fifth.type = 'triangle';
                root.frequency.value = 130.81;
                fifth.frequency.value = 196;
                root.connect(this._musicGain);
                fifth.connect(this._musicGain);
                this._musicGain.gain.setValueAtTime(0.06, ctx.currentTime);
                root.start(ctx.currentTime);
                fifth.start(ctx.currentTime);
                this._musicNodes = [root, fifth];
            });
        }

        stopMusic() {
            const nodes = this._musicNodes.slice();
            this._musicNodes = [];
            nodes.forEach((node) => {
                try {
                    node.stop();
                    if (node.disconnect) node.disconnect();
                } catch (err) {
                    // Oscillators may already be stopped by the browser.
                }
            });
        }

        playCorrect() {
            this._playArp([523, 659, 784], 0.08, 'triangle', 0.16);
        }

        playWrong() {
            this._playArp([220, 196], 0.11, 'sawtooth', 0.10);
        }

        playHit() {
            this._playTone(140, 0.12, 'square', 0.12);
        }

        playVictory() {
            this._playArp([392, 523, 659, 784, 1046], 0.09, 'triangle', 0.18);
        }

        _getCtx() {
            if (this._ctx) return this._ctx;
            if (typeof window === 'undefined') return null;
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            this._ctx = new Ctor();
            this._masterGain = this._ctx.createGain();
            this._effectsGain = this._ctx.createGain();
            this._musicGain = this._ctx.createGain();
            this._masterGain.gain.value = this._volume;
            this._effectsGain.gain.value = this._muted ? 0 : 1;
            this._musicGain.gain.value = 0.06;
            this._effectsGain.connect(this._masterGain);
            this._musicGain.connect(this._masterGain);
            this._masterGain.connect(this._ctx.destination);
            return this._ctx;
        }

        _resume() {
            const ctx = this._getCtx();
            if (!ctx) return null;
            return ctx.resume();
        }

        _playTone(freq, duration, type, gainValue) {
            const ctx = this._getCtx();
            if (!ctx || !this._effectsGain) return;
            ctx.resume().then(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this._effectsGain);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + duration);
            });
        }

        _playArp(freqs, noteLength, type, gainValue) {
            const ctx = this._getCtx();
            if (!ctx || !this._effectsGain) return;
            ctx.resume().then(() => {
                freqs.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const start = ctx.currentTime + i * noteLength;
                    osc.type = type;
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
                    gain.gain.linearRampToValueAtTime(0, start + noteLength);
                    osc.connect(gain);
                    gain.connect(this._effectsGain);
                    osc.start(start);
                    osc.stop(start + noteLength);
                });
            });
        }
    }

    return AudioManager;
});
