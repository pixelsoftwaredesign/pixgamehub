export class AudioManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.masterVolume = 0.7;
        this.initialized = false;
        this.audioCtx = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API non disponible');
        }
    }

    loadSound(key, src) {
        return new Promise((resolve) => {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.oncanplaythrough = () => {
                this.sounds[key] = audio;
                resolve(audio);
            };
            audio.onerror = () => {
                resolve(null);
            };
        });
    }

    generateTone(key, frequency, duration, type = 'sine') {
        if (!this.audioCtx) return;

        const sampleRate = this.audioCtx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
                case 'noise':
                    sample = (Math.random() * 2 - 1) * 0.3;
                    break;
            }

            const envelope = Math.min(1, (length - i) / (sampleRate * 0.05)) * Math.min(1, i / (sampleRate * 0.01));
            data[i] = sample * envelope * this.masterVolume;
        }

        this.sounds[key] = buffer;
    }

    generateSoundEffects() {
        this.init();
        if (!this.audioCtx) return;

        this.generateTone('jump', 440, 0.15, 'sine');
        this.generateTone('land', 220, 0.1, 'triangle');
        this.generateTone('roll', 330, 0.2, 'sine');
        this.generateTone('wallrun', 380, 0.3, 'triangle');
        this.generateTone('grapple', 660, 0.25, 'sine');
        this.generateTone('grapple_attach', 800, 0.2, 'triangle');
        this.generateTone('grapple_release', 200, 0.25, 'sine');
        this.generateTone('collect', 880, 0.2, 'sine');
        this.generateTone('hurt', 150, 0.3, 'square');
        this.generateTone('combo', 520, 0.15, 'sine');
        this.generateTone('dash', 500, 0.12, 'triangle');
        this.generateTone('slide', 300, 0.25, 'sine');
        this.generateTone('wind', 120, 0.4, 'noise');
    }

    play(key, volume = 1) {
        if (this.isMuted) return;

        const sound = this.sounds[key];
        if (!sound) return;

        try {
            if (this.audioCtx && sound instanceof AudioBuffer) {
                const source = this.audioCtx.createBufferSource();
                source.buffer = sound;
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.value = volume * this.masterVolume;
                source.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);
                source.start(0);
            } else if (sound instanceof HTMLAudioElement) {
                const clone = sound.cloneNode();
                clone.volume = volume * this.masterVolume;
                clone.play().catch(() => {});
            }
        } catch (e) {}
    }

    playWithPitch(key, pitchShift, volume = 1) {
        if (this.isMuted) return;

        const sound = this.sounds[key];
        if (!sound || !this.audioCtx) return;

        try {
            if (sound instanceof AudioBuffer) {
                const source = this.audioCtx.createBufferSource();
                source.buffer = sound;
                source.playbackRate.value = pitchShift;
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.value = volume * this.masterVolume;
                source.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);
                source.start(0);
            }
        } catch (e) {}
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    setVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
    }

    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
}
