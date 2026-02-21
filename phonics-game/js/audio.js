class AudioManager {
    constructor() {
        // ctx is null until first play — iOS Safari requires AudioContext creation
        // inside a user-gesture event handler, not at construction time.
        this.ctx = null;
        // Stored timer IDs for arpeggio/fanfare sequences so cancel() can clear them.
        this._pendingTimers = [];
    }

    _getCtx() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                this.ctx = null;
            }
        }
        return this.ctx;
    }

    isMuted() {
        // All settings live under the single 'phonics-progress' key via SaveManager.
        return SaveManager.load().muteSfx === true;
    }

    // Cancel any pending arpeggio/fanfare timers (e.g. when navigating away).
    cancel() {
        this._pendingTimers.forEach(clearTimeout);
        this._pendingTimers = [];
    }

    _scheduleTone(ctx, freq, duration, type, gain) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    _playTone(freq, duration, type = 'sine', gain = 0.3) {
        const ctx = this._getCtx();
        if (!ctx || this.isMuted()) return;
        // iOS Safari suspends AudioContext until resumed inside a user gesture.
        // resume() is async — chain the scheduling so the context is running first.
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => this._scheduleTone(ctx, freq, duration, type, gain));
            return;
        }
        this._scheduleTone(ctx, freq, duration, type, gain);
    }

    // Soft boing on tile select
    playSelect() {
        this._playTone(440, 0.08, 'sine', 0.2);
    }

    // Shimmer arpeggio when a hint tile glows
    playGlow() {
        [261, 329, 392].forEach((freq, i) => {
            const id = setTimeout(() => this._playTone(freq, 0.06, 'sine', 0.15), i * 20);
            this._pendingTimers.push(id);
        });
    }

    // C major success chord on a correct match
    playMatch() {
        [523, 659, 784].forEach(freq => this._playTone(freq, 0.3, 'sine', 0.25));
    }

    // Low thud for a wrong tap
    playWrong() {
        this._playTone(100, 0.1, 'sine', 0.3);
    }

    // Ascending fanfare on lesson complete
    playLessonComplete() {
        [523, 659, 784, 1046].forEach((freq, i) => {
            const id = setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.3), i * 120);
            this._pendingTimers.push(id);
        });
    }

    // Gentle pop when a new sort word appears
    playNextWord() {
        this._playTone(600, 0.05, 'sine', 0.15);
    }
}
