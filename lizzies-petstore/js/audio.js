/**
 * audio.js — Web Audio synthesizer (warm sine-based sounds).
 * AudioContext created lazily on first user gesture (iOS Safari requirement).
 * All creature voices: sine waves + low-pass filter + detuned chorus.
 *
 * Sound categories:
 *   - Background music (3 tracks: creator, care, park — opt-in, ADHD-friendly)
 *   - Ambient park sounds (wind + random chirps)
 *   - Creature voices (purr, mew, chirp, coo, squeak, baa, whinny, growl, roar, hiss)
 *   - Interaction SFX (pop, sparkle, munch, splash, brush, footstep, wingWhoosh, happyJingle)
 *
 * No timers needed — Web Audio's AudioParam scheduling + onended callbacks handle all timing.
 */

// Head type -> default voice mapping
const HEAD_VOICE_MAP = {
    'cat': 'purr', 'dog': 'growl', 'bunny': 'squeak', 'bird': 'chirp',
    'dragon': 'roar', 'fox': 'mew', 'owl': 'coo', 'bear': 'growl',
    'unicorn': 'whinny', 'mermaid': 'coo'
};

// Pentatonic scales for music tracks (frequencies in Hz)
const MUSIC_SCALES = {
    creator: [262, 294, 330, 392, 440, 523, 587, 659, 784],  // C major pentatonic
    care:    [175, 196, 220, 262, 294, 349, 392, 440, 523],  // F major pentatonic
    park:    [196, 220, 247, 294, 330, 392, 440, 494, 587]   // G major pentatonic
};

// 8 phrase patterns per track (indices into scale, -1 = rest)
const MUSIC_PHRASES = {
    creator: [
        [0, 2, 4, 5, 4, 2, 0, -1],
        [5, 4, 2, 0, 2, 4, 5, -1],
        [0, 4, 2, 5, 3, 1, 0, -1],
        [2, -1, 4, -1, 5, 4, 2, 0],
        [0, 0, 2, 4, 5, 5, 4, -1],
        [5, 3, 5, 7, 5, 3, 0, -1],
        [0, 1, 2, 3, 4, 5, 6, 7],
        [7, 6, 5, 4, 3, 2, 1, 0]
    ],
    care: [
        [0, 2, 4, 2, 0, -1, -1, -1],
        [4, 2, 0, 2, 4, -1, -1, -1],
        [0, -1, 2, -1, 4, -1, 2, 0],
        [5, 4, 2, 0, -1, -1, -1, -1],
        [0, 2, 0, 4, 2, 0, -1, -1],
        [2, 4, 5, 4, 2, 0, -1, -1],
        [0, 3, 5, 3, 0, -1, -1, -1],
        [5, 3, 0, 3, 5, -1, -1, -1]
    ],
    park: [
        [0, 2, 4, 5, 7, 5, 4, 2],
        [7, 5, 4, 2, 0, 2, 4, 5],
        [0, -1, 4, 5, -1, 2, 4, 0],
        [2, 4, 2, 5, 7, 5, 2, 0],
        [0, 4, 7, 4, 0, 5, 7, 5],
        [5, 7, 5, 2, 0, 2, 5, 7],
        [0, 2, 0, 4, 0, 5, 0, 7],
        [7, 0, 5, 0, 4, 0, 2, 0]
    ]
};

// Tempo per track (seconds per note)
const MUSIC_TEMPOS = {
    creator: 0.3,
    care: 0.55,
    park: 0.25
};

class AudioManager {
    constructor() {
        this._ctx = null;      // Created lazily on first user gesture
        this._volume = 0.8;
        this._muted = false;
        this._masterGain = null;
        this._lastSparkleTime = 0; // Throttle sparkle sounds to 1 per 200ms

        // Music system
        this._musicGain = null;
        this._musicEnabled = false;
        this._musicTrack = null;       // current track name
        this._musicOscs = [];          // active music oscillators for cleanup
        this._lastPhraseIndex = -1;
        this._musicGen = 0;            // generation counter to prevent stale onended

        // Ambient system
        this._ambientWind = null;
        this._ambientActive = false;
        this._ambientGen = 0;          // generation counter for chirp scheduling
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

            // Music goes through separate gain for independent control
            this._musicGain = this._ctx.createGain();
            this._musicGain.gain.value = this._musicEnabled ? 0.15 : 0;
            this._musicGain.connect(this._masterGain);
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
     * Enable/disable background music (ADHD-friendly opt-in).
     */
    setMusicEnabled(enabled) {
        this._musicEnabled = enabled;
        if (this._musicGain) {
            this._musicGain.gain.value = enabled ? 0.15 : 0;
        }
        if (enabled && this._musicTrack) {
            this._stopMusicOscs();
            this._musicGen++;
            this._resume().then(() => this._scheduleNextPhrase());
        } else if (!enabled) {
            this._stopMusicOscs();
        }
    }

    // ══════════════════════════════════════════════════════
    // ── BACKGROUND MUSIC ─────────────────────────────────
    // ══════════════════════════════════════════════════════

    /**
     * Start background music for a given screen.
     * @param {string} trackName — 'creator', 'care', or 'park'
     */
    startMusic(trackName) {
        if (this._musicTrack === trackName) return;
        this.stopMusic();
        this._musicTrack = trackName;
        if (!this._musicEnabled) return;
        this._lastPhraseIndex = -1;
        this._musicGen++;
        this._resume().then(() => this._scheduleNextPhrase());
    }

    /**
     * Stop background music.
     */
    stopMusic() {
        this._musicTrack = null;
        this._stopMusicOscs();
    }

    _stopMusicOscs() {
        for (const osc of this._musicOscs) {
            try { osc.stop(); } catch (e) { /* already stopped */ }
            try { osc.disconnect(); } catch (e) { /* already disconnected */ }
        }
        this._musicOscs = [];
    }

    /**
     * Schedule the next melodic phrase. Chains via onended — no timers.
     */
    _scheduleNextPhrase() {
        if (!this._musicTrack || !this._musicEnabled || !this._ctx) return;

        const trackName = this._musicTrack;
        const gen = this._musicGen;
        const scale = MUSIC_SCALES[trackName];
        const phrases = MUSIC_PHRASES[trackName];
        const tempo = MUSIC_TEMPOS[trackName];
        if (!scale || !phrases) return;

        // Clear old refs (all previous oscs have ended by the time we're called)
        this._musicOscs = [];

        // Pick random phrase (avoid immediate repeat)
        let idx;
        do {
            idx = Math.floor(Math.random() * phrases.length);
        } while (idx === this._lastPhraseIndex && phrases.length > 1);
        this._lastPhraseIndex = idx;

        const phrase = phrases[idx];
        const ctx = this._ctx;
        const t = ctx.currentTime + 0.05; // tiny buffer to avoid scheduling in the past

        let lastOsc = null;

        for (let i = 0; i < phrase.length; i++) {
            const noteIdx = phrase[i];
            if (noteIdx < 0) continue; // rest

            const freq = scale[noteIdx];
            if (!freq) continue;

            const noteStart = t + i * tempo;
            const noteDur = tempo * 0.85; // slight gap between notes

            // Main note (triangle for warmth)
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 900;

            const gain = ctx.createGain();
            const attackEnd = noteStart + Math.min(0.04, noteDur * 0.2);
            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.15, attackEnd);
            gain.gain.setValueAtTime(0.15, noteStart + noteDur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this._musicGain);
            osc.start(noteStart);
            osc.stop(noteStart + noteDur);

            this._musicOscs.push(osc);
            lastOsc = osc;
        }

        // Chain to next phrase when this one ends (generation check prevents stale callbacks)
        if (lastOsc) {
            lastOsc.onended = () => {
                if (this._musicGen === gen && this._musicTrack === trackName && this._musicEnabled) {
                    this._scheduleNextPhrase();
                }
            };
        }
    }

    // ══════════════════════════════════════════════════════
    // ── AMBIENT PARK SOUNDS ──────────────────────────────
    // ══════════════════════════════════════════════════════

    /**
     * Start ambient park sounds (wind + random chirps).
     */
    startAmbient() {
        if (this._ambientActive) return;
        this._ambientActive = true;
        this._ambientGen++;
        this._resume().then(() => {
            this._startWind();
            this._scheduleAmbientChirp();
        });
    }

    /**
     * Stop ambient park sounds.
     */
    stopAmbient() {
        this._ambientActive = false;
        this._ambientGen++;
        if (this._ambientWind) {
            try { this._ambientWind.stop(); } catch (e) { /* already stopped */ }
            this._ambientWind = null;
        }
    }

    _startWind() {
        if (!this._ambientActive || !this._ctx) return;
        const ctx = this._ctx;

        // 2-second looping noise buffer for wind
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.5;

        const gain = ctx.createGain();
        gain.gain.value = 0.03;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        noise.start();

        this._ambientWind = noise;
    }

    _scheduleAmbientChirp() {
        if (!this._ambientActive || !this._ctx) return;

        const gen = this._ambientGen;
        const ctx = this._ctx;
        const delay = 3 + Math.random() * 4; // 3-7 seconds
        const t = ctx.currentTime + delay;

        // Random chirp: ascending sine burst
        const freq = 400 + Math.random() * 300;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.06);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        osc.start(t);
        osc.stop(t + 0.08);

        // Chain to next chirp (generation check prevents stale callbacks after stop/start)
        osc.onended = () => {
            if (this._ambientGen === gen && this._ambientActive) {
                this._scheduleAmbientChirp();
            }
        };
    }

    // ══════════════════════════════════════════════════════
    // ── SOUND EFFECTS ────────────────────────────────────
    // ══════════════════════════════════════════════════════

    /**
     * Play a sound effect.
     * @param {string} type — sound name (e.g., 'pop', 'sparkle', 'munch')
     */
    playSound(type) {
        // Throttle sparkle sounds
        if (type === 'sparkle') {
            const now = performance.now();
            if (now - this._lastSparkleTime < 200) return;
            this._lastSparkleTime = now;
        }
        this._resume().then(() => {
            switch (type) {
                case 'pop': this._playPop(); break;
                case 'sparkle': this._playSparkle(); break;
                case 'munch': this._playMunch(); break;
                case 'splash': this._playSplash(); break;
                case 'brush': this._playBrush(); break;
                case 'footstep': this._playFootstep(); break;
                case 'wingWhoosh': this._playWingWhoosh(); break;
                case 'happy': this._playHappyJingle(); break;
                default: break;
            }
        });
    }

    /**
     * Play a creature voice.
     * @param {string} voiceType — e.g., 'purr', 'mew', 'chirp'
     * @param {number} [detune=0] — per-creature uniqueness offset in cents (-50 to +50)
     */
    playVoice(voiceType, detune) {
        this._resume().then(() => {
            const d = detune || 0;
            switch (voiceType) {
                case 'purr': this._playPurr(d); break;
                case 'mew': this._playMew(d); break;
                case 'chirp': this._playChirp(d); break;
                case 'coo': this._playCoo(d); break;
                case 'squeak': this._playSqueak(d); break;
                case 'baa': this._playBaa(d); break;
                case 'whinny': this._playWhinny(d); break;
                case 'growl': this._playGrowl(d); break;
                case 'roar': this._playRoar(d); break;
                case 'hiss': this._playHiss(d); break;
                default: break;
            }
        });
    }

    /**
     * Play a creature's voice using its stored voice type.
     * @param {object} creature — creature data with voiceType field
     */
    playCreatureVoice(creature) {
        if (!creature) return;
        const voiceType = creature.voiceType || this.getDefaultVoice(creature);
        // Derive a consistent detune from creature ID
        let detune = 0;
        if (creature.id) {
            let hash = 0;
            for (let i = 0; i < creature.id.length; i++) {
                hash = ((hash << 5) - hash + creature.id.charCodeAt(i)) | 0;
            }
            detune = ((hash % 101) - 50); // -50 to +50 cents
        }
        this.playVoice(voiceType, detune);
    }

    /**
     * Get default voice type for a creature based on head type.
     */
    getDefaultVoice(creature) {
        const headType = creature && creature.body && creature.body.head
            ? creature.body.head.type : null;
        return HEAD_VOICE_MAP[headType] || 'mew';
    }

    // ── Helper: create a lowpass-filtered sine with gain envelope ──

    /**
     * Create a basic voice chain: oscillator -> lowpass -> gain -> master.
     * Returns { osc, filter, gain, ctx, t } for further scheduling.
     */
    _voiceChain(freq, filterFreq, detuneCents) {
        const ctx = this._ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        if (detuneCents) osc.detune.value = detuneCents;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq || 2000;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);

        return { osc, filter, gain, ctx, t };
    }

    // ══════════════════════════════════════════════════════
    // ── CREATURE VOICES ──────────────────────────────────
    // ══════════════════════════════════════════════════════

    /**
     * Purr: 2 detuned sines 80-120Hz with amplitude modulation at 20Hz.
     */
    _playPurr(detune) {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.4;

        // Main sine
        const v1 = this._voiceChain(100, 800, detune);
        v1.gain.gain.setValueAtTime(0.25, t);
        v1.gain.gain.linearRampToValueAtTime(0.001, t + dur);
        v1.osc.start(t);
        v1.osc.stop(t + dur);

        // Detuned chorus
        const v2 = this._voiceChain(105, 800, detune + 7);
        v2.gain.gain.setValueAtTime(0.2, t);
        v2.gain.gain.linearRampToValueAtTime(0.001, t + dur);
        v2.osc.start(t);
        v2.osc.stop(t + dur);

        // Amplitude modulation via LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 20;
        lfoGain.gain.value = 0.1;
        lfo.connect(lfoGain);
        lfoGain.connect(v1.gain.gain);
        lfo.start(t);
        lfo.stop(t + dur);
    }

    /**
     * Mew: 400Hz sine with pitch bend down to 300Hz, soft release.
     */
    _playMew(detune) {
        const v = this._voiceChain(400, 1500, detune);
        const t = v.t;
        v.osc.frequency.setValueAtTime(400, t);
        v.osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);
        v.gain.gain.setValueAtTime(0.3, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        v.osc.start(t);
        v.osc.stop(t + 0.2);
    }

    /**
     * Chirp: Ascending sine 300-600Hz, 100ms.
     */
    _playChirp(detune) {
        const v = this._voiceChain(300, 2000, detune);
        const t = v.t;
        v.osc.frequency.setValueAtTime(300, t);
        v.osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
        v.gain.gain.setValueAtTime(0.25, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        v.osc.start(t);
        v.osc.stop(t + 0.1);
    }

    /**
     * Coo: 250Hz sine with gentle vibrato (6Hz, +/-20 cents), 200ms.
     */
    _playCoo(detune) {
        const ctx = this._ctx;
        const v = this._voiceChain(250, 1200, detune);
        const t = v.t;

        // Vibrato via LFO on detune
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 6;
        lfoGain.gain.value = 20; // +/- 20 cents
        lfo.connect(lfoGain);
        lfoGain.connect(v.osc.detune);
        lfo.start(t);
        lfo.stop(t + 0.2);

        v.gain.gain.setValueAtTime(0.25, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        v.osc.start(t);
        v.osc.stop(t + 0.2);
    }

    /**
     * Squeak: 800Hz sine, 50ms, slight wobble.
     */
    _playSqueak(detune) {
        const v = this._voiceChain(800, 3000, detune);
        const t = v.t;
        v.osc.frequency.setValueAtTime(800, t);
        v.osc.frequency.setValueAtTime(850, t + 0.02);
        v.osc.frequency.setValueAtTime(780, t + 0.035);
        v.gain.gain.setValueAtTime(0.2, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        v.osc.start(t);
        v.osc.stop(t + 0.05);
    }

    /**
     * Baa: 200Hz sine with nasal bandpass filter Q=5, 150ms.
     */
    _playBaa(detune) {
        const v = this._voiceChain(200, 1500, detune);
        const t = v.t;
        // Override filter to bandpass for nasal quality
        v.filter.type = 'bandpass';
        v.filter.frequency.value = 600;
        v.filter.Q.value = 5;
        v.gain.gain.setValueAtTime(0.3, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        v.osc.start(t);
        v.osc.stop(t + 0.15);
    }

    /**
     * Whinny: Sine sweep 300-500-200Hz, 300ms.
     */
    _playWhinny(detune) {
        const v = this._voiceChain(300, 2000, detune);
        const t = v.t;
        v.osc.frequency.setValueAtTime(300, t);
        v.osc.frequency.exponentialRampToValueAtTime(500, t + 0.12);
        v.osc.frequency.exponentialRampToValueAtTime(200, t + 0.28);
        v.gain.gain.setValueAtTime(0.25, t);
        v.gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        v.osc.start(t);
        v.osc.stop(t + 0.3);
    }

    /**
     * Growl (soft): 100Hz sine + gentle low noise mix, cartoony.
     */
    _playGrowl(detune) {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.2;

        // Main sine
        const v = this._voiceChain(100, 600, detune);
        v.gain.gain.setValueAtTime(0.25, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        v.osc.start(t);
        v.osc.stop(t + dur);

        // Gentle noise layer
        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 300;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this._masterGain);
        noise.start(t);
        noise.stop(t + dur);
    }

    /**
     * Roar (cute): 150Hz sweep to 300Hz, short/bouncy.
     */
    _playRoar(detune) {
        const v = this._voiceChain(150, 1000, detune);
        const t = v.t;
        const dur = 0.2;
        v.osc.frequency.setValueAtTime(150, t);
        v.osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
        v.osc.frequency.exponentialRampToValueAtTime(200, t + dur);
        v.gain.gain.setValueAtTime(0.3, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        v.osc.start(t);
        v.osc.stop(t + dur);
    }

    /**
     * Hiss (playful): Filtered noise burst, bandpass 2000Hz, 100ms.
     */
    _playHiss(detune) {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.1;

        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + (detune || 0) * 5;
        filter.Q.value = 3;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        noise.start(t);
        noise.stop(t + dur);
    }

    // ══════════════════════════════════════════════════════
    // ── INTERACTION SFX ──────────────────────────────────
    // ══════════════════════════════════════════════════════

    /**
     * Pop: 600Hz sine, quick pitch drop, 50ms.
     */
    _playPop() {
        const v = this._voiceChain(600, 3000, 0);
        const t = v.t;
        v.osc.frequency.setValueAtTime(600, t);
        v.osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
        v.gain.gain.setValueAtTime(0.3, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        v.osc.start(t);
        v.osc.stop(t + 0.05);
    }

    /**
     * Sparkle: 1200Hz + 1800Hz layered sines, 200ms shimmer.
     */
    _playSparkle() {
        const ctx = this._ctx;
        const t = ctx.currentTime;

        for (const freq of [1200, 1800]) {
            const v = this._voiceChain(freq, 4000, 0);
            v.gain.gain.setValueAtTime(0.12, t);
            v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            v.osc.start(t);
            v.osc.stop(t + 0.2);
        }
    }

    /**
     * Munch: 3 quick clicks at 300Hz, 40ms each, 60ms apart.
     */
    _playMunch() {
        const ctx = this._ctx;
        const t = ctx.currentTime;

        for (let i = 0; i < 3; i++) {
            const offset = i * 0.06;
            const v = this._voiceChain(300 + i * 30, 1500, 0);
            v.gain.gain.setValueAtTime(0.25, t + offset);
            v.gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);
            v.osc.start(t + offset);
            v.osc.stop(t + offset + 0.04);
        }
    }

    /**
     * Splash: White noise burst filtered through lowpass sweep 2000-200Hz, 300ms.
     */
    _playSplash() {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.3;

        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + dur);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        noise.start(t);
        noise.stop(t + dur);
    }

    /**
     * Brush: Gentle filtered noise, 200ms, bandpass 1000Hz.
     */
    _playBrush() {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.2;

        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        noise.start(t);
        noise.stop(t + dur);
    }

    /**
     * Footstep: 100Hz sine thud, 80ms, exponential decay.
     */
    _playFootstep() {
        const v = this._voiceChain(100, 500, 0);
        const t = v.t;
        v.gain.gain.setValueAtTime(0.2, t);
        v.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        v.osc.start(t);
        v.osc.stop(t + 0.08);
    }

    /**
     * Wing whoosh: Noise through bandpass sweep 500-2000Hz, 150ms.
     */
    _playWingWhoosh() {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const dur = 0.15;

        const bufferSize = Math.ceil(ctx.sampleRate * dur);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(2000, t + dur);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._masterGain);
        noise.start(t);
        noise.stop(t + dur);
    }

    /**
     * Happy jingle: Ascending major triad C5-E5-G5, staccato.
     */
    _playHappyJingle() {
        const ctx = this._ctx;
        const t = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        for (let i = 0; i < notes.length; i++) {
            const offset = i * 0.08;
            const v = this._voiceChain(notes[i], 3000, 0);
            v.gain.gain.setValueAtTime(0.2, t + offset);
            v.gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
            v.osc.start(t + offset);
            v.osc.stop(t + offset + 0.12);
        }
    }
}
