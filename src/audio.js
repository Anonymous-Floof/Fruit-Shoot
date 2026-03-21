// src/audio.js — Web Audio API synthesizer. All sounds are procedurally generated.
import { Settings } from './settings.js';

const AudioEngine = {
    ctx: null,
    masterGain: null,

    _init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
    },

    _volume() {
        const v = Settings.get('masterVolume');
        return (v !== undefined && v !== null) ? v : 0.5;
    },

    // Resume context on first user interaction (browser policy)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    // Core tone builder: oscillator → gain envelope → master
    _tone(type, freq, duration, gainPeak = 0.4, freqEnd = null, delay = 0) {
        this._init();
        const vol = this._volume();
        if (vol <= 0) return;

        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gainPeak * vol, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(g); g.connect(this.masterGain);
        osc.start(now); osc.stop(now + duration + 0.05);
    },

    // Noise burst (for shotgun / explosions)
    _noise(duration, gainPeak = 0.3, highpass = 500, lowpass = null, delay = 0) {
        this._init();
        const vol = this._volume();
        if (vol <= 0) return;

        const now = this.ctx.currentTime + delay;
        const bufSize = Math.floor(this.ctx.sampleRate * (duration + 0.05));
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        let node = src;

        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = highpass;
        node.connect(hp); node = hp;

        if (lowpass !== null) {
            const lp = this.ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = lowpass;
            node.connect(lp); node = lp;
        }

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gainPeak * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        node.connect(g); g.connect(this.masterGain);
        src.start(now); src.stop(now + duration + 0.05);
    },

    // ─── Game event sounds ───

    playShoot(weaponType) {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        switch (weaponType) {
            case 'sniper':
                // Deep thump + sharp transient click + tail
                this._tone('sawtooth', 110, 0.35, 0.55, 45);
                this._noise(0.08, 0.18, 1200, 4000);
                this._tone('sine', 60, 0.5, 0.25, 30, 0.01);
                break;
            case 'minigun':
                // Short punchy tick
                this._tone('square', 380, 0.05, 0.18, 220);
                this._noise(0.04, 0.08, 600, 3000);
                break;
            case 'shotgun':
                // Wide noise blast with bass body
                this._noise(0.18, 0.5, 120, 5000);
                this._tone('sawtooth', 160, 0.15, 0.4, 60);
                this._noise(0.08, 0.2, 2000, null, 0.02);
                break;
            case 'rocket':
                // Whoosh + low boom
                this._tone('sawtooth', 80, 0.4, 0.55, 35);
                this._noise(0.25, 0.28, 80, 800);
                this._tone('sine', 45, 0.45, 0.3, 25, 0.05);
                break;
            case 'laser':
                // Sharp zap with pitch sweep
                this._tone('sine', 1400, 0.06, 0.3, 700);
                this._tone('square', 800, 0.04, 0.12, 400);
                this._noise(0.03, 0.08, 3000, null);
                break;
            case 'boomerang':
                // Wobbly whoosh
                this._tone('triangle', 280, 0.35, 0.32, 560);
                this._tone('sine', 140, 0.3, 0.2, 210, 0.05);
                break;
            case 'plasma':
                // Electric charge + discharge
                this._tone('sine', 500, 0.05, 0.22, 1100);
                this._tone('square', 300, 0.08, 0.15, 600, 0.03);
                this._noise(0.04, 0.06, 1500, null, 0.02);
                break;
            case 'void':
                // Deep sub bass with distortion
                this._tone('sawtooth', 55, 0.5, 0.5, 25);
                this._tone('square', 110, 0.4, 0.2, 50, 0.02);
                this._noise(0.15, 0.15, 50, 200);
                break;
            default: // 'default' blade
                this._tone('triangle', 320, 0.12, 0.22, 180);
                this._noise(0.06, 0.08, 800, 4000);
                break;
        }
    },

    playHit() {
        this._init();
        const vol = this._volume();
        if (vol <= 0) return;
        this._tone('sine', 900, 0.05, 0.14, 350);
        this._noise(0.04, 0.07, 1000, 5000);
    },

    playDeath(radius = 15) {
        this._init();
        const vol = this._volume();
        if (vol <= 0) return;
        const freq = Math.max(80, 550 - radius * 7);
        this._tone('sawtooth', freq, 0.22, 0.4, freq * 0.35);
        this._noise(0.12, 0.2, 250, 2000);
        this._tone('sine', freq * 0.5, 0.25, 0.18, freq * 0.2, 0.04);
    },

    playPlayerHit() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Heavy impact with low rumble
        this._tone('sawtooth', 75, 0.35, 0.65, 35);
        this._noise(0.2, 0.4, 40, 400);
        this._tone('square', 150, 0.15, 0.3, 60, 0.03);
    },

    playLevelUp() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Ascending arpeggio with harmonics
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const t = i * 90;
            setTimeout(() => {
                this._tone('sine', freq, 0.28, 0.35);
                this._tone('triangle', freq * 2, 0.2, 0.12);
            }, t);
        });
        // Final shimmer
        setTimeout(() => this._tone('sine', 2093, 0.25, 0.18, 2637), 400);
    },

    playBossSpawn() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Ominous low drone sweep
        this._tone('sawtooth', 50, 1.5, 0.55, 38);
        this._noise(0.8, 0.22, 60, 300);
        setTimeout(() => {
            this._tone('sawtooth', 75, 0.9, 0.45, 55);
            this._tone('square', 37, 0.8, 0.3, 28, 0.05);
        }, 500);
        // Warning stab
        setTimeout(() => this._tone('sine', 220, 0.4, 0.5, 110), 1200);
    },

    playBossDeath() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Big explosion
        this._noise(0.7, 0.75, 40, 600);
        this._tone('sawtooth', 90, 1.0, 0.7, 18);
        this._tone('sine', 45, 1.0, 0.4, 20, 0.05);
        // Descending victory fanfare
        setTimeout(() => {
            const notes = [1047, 880, 784, 659, 523];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this._tone('sine', freq, 0.35, 0.45);
                    this._tone('triangle', freq * 1.5, 0.25, 0.15);
                }, i * 110);
            });
        }, 300);
    },

    playUpgrade() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Bright chime
        this._tone('sine', 880, 0.18, 0.28);
        this._tone('triangle', 1320, 0.14, 0.22, null, 0.08);
        this._tone('sine', 1760, 0.1, 0.18, null, 0.16);
    },

    playComboMilestone(combo) {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        const baseFreq = combo >= 100 ? 1047 : (combo >= 50 ? 784 : 523);
        this._tone('sine', baseFreq, 0.3, 0.45);
        this._tone('triangle', baseFreq * 1.25, 0.22, 0.3, null, 0.08);
        this._tone('sine', baseFreq * 2, 0.15, 0.2, null, 0.16);
        if (combo >= 100) this._noise(0.12, 0.1, 2000, null, 0.05);
    },

    playDash() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Quick whoosh
        this._tone('sine', 300, 0.18, 0.22, 1400);
        this._noise(0.12, 0.1, 600, null);
    },

    playEliteSpawn() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Threatening double-tone sting
        this._tone('sawtooth', 200, 0.3, 0.4, 100);
        this._tone('square', 300, 0.25, 0.3, 150, 0.08);
        setTimeout(() => this._tone('triangle', 440, 0.25, 0.3), 200);
    },

    playJuicingHour() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Epic climax fanfare
        this._noise(0.4, 0.3, 60, 500);
        const stabs = [523, 659, 784, 880, 1047, 1319];
        stabs.forEach((freq, i) => {
            setTimeout(() => {
                this._tone('sawtooth', freq, 0.4, 0.5, freq * 0.8);
                this._tone('sine', freq * 2, 0.3, 0.3);
            }, i * 80);
        });
    },

    playVictory() {
        this._init();
        this.resume();
        const vol = this._volume();
        if (vol <= 0) return;
        // Triumphant fanfare
        this._noise(0.2, 0.2, 1000, null);
        const melody = [523, 523, 784, 784, 1047, 1047, 1319, 1319, 1047];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                this._tone('sine', freq, 0.35, 0.4);
                this._tone('triangle', freq * 1.5, 0.2, 0.2);
            }, i * 120);
        });
    },
};

export { AudioEngine };
