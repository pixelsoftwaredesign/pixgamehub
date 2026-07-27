/**
 * AudioEngine.js — Moteur audio spatial
 * Web Audio API, SFX procéduraux, musique adaptative
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.sounds = {};
        this.music = null;
        this.musicPlaying = false;
        this.currentAmbientTheme = null;
        this.muted = false;
        this.volume = 0.5;
        this.loadedBuffers = {};
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.musicGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
            this.sfxGain.gain.value = 0.6;
            this.musicGain.gain.value = 0.5;
            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.masterGain) this.masterGain.gain.value = vol;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }

    createOscillator(type, freq, duration, gain, detune) {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        g.gain.setValueAtTime(gain, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    createNoise(duration, gain, filter) {
        if (!this.initialized) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        if (filter) {
            const f = this.ctx.createBiquadFilter();
            f.type = filter.type || 'lowpass';
            f.frequency.value = filter.freq || 1000;
            source.connect(f);
            f.connect(g);
        } else {
            source.connect(g);
        }
        g.connect(this.sfxGain);
        source.start();
    }

    playJump() {
        this.createOscillator('square', 200, 0.15, 0.15);
        this.createOscillator('square', 400, 0.1, 0.1);
    }

    playHit(pan = 0) {
        this.createNoise(0.08, 0.2, { type: 'highpass', freq: 800 });
        this.createOscillator('square', 100 + Math.random() * 50, 0.1, 0.15);
        this.createOscillator('sawtooth', 200 + Math.random() * 100, 0.08, 0.1);
    }

    playCrit() {
        this.createNoise(0.1, 0.3, { type: 'highpass', freq: 1200 });
        this.createOscillator('square', 300, 0.15, 0.2);
        this.createOscillator('sawtooth', 600, 0.1, 0.15);
        this.createOscillator('sine', 900, 0.08, 0.1);
    }

    playBlock() {
        this.createOscillator('square', 400, 0.08, 0.15);
        this.createOscillator('square', 600, 0.06, 0.1);
    }

    playHurt() {
        this.createNoise(0.1, 0.2, { type: 'lowpass', freq: 500 });
        this.createOscillator('sawtooth', 150, 0.15, 0.15);
    }

    playSpecial() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createOscillator('sine', 400 + i * 100, 0.15, 0.12);
            }, i * 50);
        }
        this.createNoise(0.3, 0.15, { type: 'bandpass', freq: 2000 });
    }

    playSelect() {
        this.createOscillator('sine', 600, 0.08, 0.1);
        setTimeout(() => this.createOscillator('sine', 800, 0.08, 0.1), 60);
    }

    playConfirm() {
        this.createOscillator('sine', 500, 0.1, 0.1);
        setTimeout(() => this.createOscillator('sine', 700, 0.1, 0.1), 80);
        setTimeout(() => this.createOscillator('sine', 900, 0.15, 0.1), 160);
    }

    playWin() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.createOscillator('sine', freq, 0.2, 0.12), i * 150);
        });
    }

    playLose() {
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, i) => {
            setTimeout(() => this.createOscillator('sine', freq, 0.25, 0.1), i * 200);
        });
    }

    playAmbient(theme) {
        if (!this.initialized) return;
        if (this.musicPlaying && this.currentAmbientTheme === theme) return;
        this.stopAmbient();
        this.musicPlaying = true;
        this.currentAmbientTheme = theme;

        const url = 'audio/Sables d\'Opale.mp3';
        if (this.loadedBuffers[url]) {
            this.music = this.playAudioBuffer(this.loadedBuffers[url], true);
        } else {
            console.log('Chargement musique...');
            this.loadAudio(url).then(buffer => {
                console.log('Musique chargée !');
                if (this.musicPlaying) {
                    this.music = this.playAudioBuffer(buffer, true);
                }
            }).catch(err => {
                console.warn('Fetch échoué, fallback <audio>:', err.message);
                this._playHTMLAudio(url);
            });
        }
    }

    _playHTMLAudio(url) {
        if (this.htmlAudio) {
            this.htmlAudio.pause();
            this.htmlAudio = null;
        }
        const audio = new Audio();
        audio.src = url;
        audio.loop = true;
        audio.volume = 0.5;
        audio.play().then(() => {
            console.log('Musique arabe jouée via <audio> !');
        }).catch(e => {
            console.warn('Impossible de jouer l\'audio:', e.message);
        });
        this.htmlAudio = audio;
        this.music = { source: { stop: () => { audio.pause(); audio.currentTime = 0; } } };
    }

    _playProceduralAmbient(theme) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc2.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const themes = {
            desert: { f1: 110, f2: 165, vol: 0.05 },
            jungle: { f1: 130, f2: 195, vol: 0.04 },
            lava: { f1: 90, f2: 135, vol: 0.06 },
            ice: { f1: 146, f2: 220, vol: 0.03 },
        };
        const t = themes[theme] || themes.desert;

        osc1.frequency.value = t.f1;
        osc2.frequency.value = t.f2;
        g.gain.value = t.vol;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain);

        osc1.start();
        osc2.start();

        this.music = { osc1, osc2, gain: g };
    }

    stopAmbient() {
        if (this.music) {
            try {
                if (this.music.source) this.music.source.stop();
                else if (this.music.osc1) this.music.osc1.stop();
                else if (this.music.osc2) this.music.osc2.stop();
            } catch (e) {}
            this.music = null;
        }
        this.musicPlaying = false;
    }

    loadAudio(url) {
        return new Promise((resolve, reject) => {
            if (!this.initialized) { reject('Not initialized'); return; }
            fetch(url)
                .then(r => r.arrayBuffer())
                .then(data => this.ctx.decodeAudioData(data))
                .then(buffer => {
                    this.loadedBuffers[url] = buffer;
                    resolve(buffer);
                })
                .catch(reject);
        });
    }

    playAudioBuffer(buffer, loop = true, fadeIn = true) {
        if (!this.initialized || !buffer) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        const g = this.ctx.createGain();
        if (fadeIn) {
            g.gain.setValueAtTime(0, this.ctx.currentTime);
            g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
        }
        source.connect(g);
        g.connect(this.musicGain);
        source.start();
        return { source, gain: g };
    }

    playSpatialSound(type, x, canvasWidth) {
        if (!this.initialized) return;
        const pan = (x / canvasWidth) * 2 - 1;
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(panner);
        panner.connect(g);
        g.connect(this.sfxGain);

        switch (type) {
            case 'hit':
                osc.type = 'square';
                osc.frequency.value = 150 + Math.random() * 100;
                g.gain.setValueAtTime(0.15, this.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.1);
                break;
            case 'jump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
                g.gain.setValueAtTime(0.1, this.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.15);
                break;
        }
    }
}

if (typeof window !== 'undefined') {
    window.AudioEngine = AudioEngine;
}
