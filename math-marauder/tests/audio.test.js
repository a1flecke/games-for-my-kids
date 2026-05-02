const assert = require('assert');

const AudioManager = require('../js/audio.js');

class FakeAudioParam {
    constructor(value) {
        this.value = value || 0;
        this.events = [];
    }

    setValueAtTime(value, time) {
        this.value = value;
        this.events.push(['set', value, time]);
    }

    linearRampToValueAtTime(value, time) {
        this.value = value;
        this.events.push(['linear', value, time]);
    }
}

class FakeNode {
    constructor(type) {
        this.type = type;
        this.connections = [];
        this.started = false;
        this.stopped = false;
        this.frequency = new FakeAudioParam(0);
        this.gain = new FakeAudioParam(1);
    }

    connect(node) {
        this.connections.push(node);
    }

    start() {
        this.started = true;
    }

    stop() {
        this.stopped = true;
    }

    disconnect() {
        this.disconnected = true;
    }
}

class FakeAudioContext {
    constructor() {
        this.currentTime = 10;
        this.destination = new FakeNode('destination');
        this.oscillators = [];
        this.gains = [];
    }

    createGain() {
        const gain = new FakeNode('gain');
        this.gains.push(gain);
        return gain;
    }

    createOscillator() {
        const osc = new FakeNode('oscillator');
        this.oscillators.push(osc);
        return osc;
    }

    resume() {
        this.resumed = true;
        return {
            then: (cb) => {
                cb();
                return { catch() {} };
            }
        };
    }
}

{
    const originalWindow = global.window;
    global.window = { AudioContext: FakeAudioContext };
    const audio = new AudioManager();
    assert.strictEqual(audio.isMusicPlaying(), false);
    audio.setMusicEnabled(true);
    assert.strictEqual(audio.isMusicPlaying(), true);
    assert.ok(audio._ctx.oscillators.length >= 2, 'music should create layered oscillators');
    audio.setMusicEnabled(false);
    assert.strictEqual(audio.isMusicPlaying(), false);
    assert.ok(audio._ctx.oscillators.every((osc) => osc.stopped), 'music oscillators should stop cleanly');
    global.window = originalWindow;
}

{
    const originalWindow = global.window;
    global.window = { AudioContext: FakeAudioContext };
    const audio = new AudioManager();
    audio.setMusicEnabled(true);
    const musicCount = audio._ctx.oscillators.length;
    const musicGain = audio._musicGain;
    audio.playCorrect();
    assert.strictEqual(audio._effectsGain.gain.value, 1);
    assert.ok(audio._ctx.oscillators.length >= musicCount + 3, 'correct SFX should schedule three effect tones');
    assert.ok(audio._ctx.oscillators.slice(musicCount).every((osc) => osc.connections.length), 'SFX oscillators should connect to gains');
    assert.ok(musicGain.gain.events.some((event) => event[1] <= 0.02), 'SFX should duck music so effects are audible');
    assert.ok(audio._ctx.gains.some((gain) => gain.gain.events.some((event) => event[1] >= 0.24)), 'SFX gain should be strong enough for tablet speakers');
    audio.setMuted(true);
    assert.strictEqual(audio._effectsGain.gain.value, 0);
    audio.setMuted(false);
    audio.playWrong();
    assert.strictEqual(audio._effectsGain.gain.value, 1);
    assert.ok(audio._ctx.oscillators.length >= musicCount + 5, 'wrong SFX should schedule two more effect tones');
    global.window = originalWindow;
}
