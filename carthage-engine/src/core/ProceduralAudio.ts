export class ProceduralAudio {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private initialized = false;
    private ambientOsc1: OscillatorNode | null = null;
    private ambientOsc2: OscillatorNode | null = null;
    private ambientGain: GainNode | null = null;
    private footstepTimer = 0;
    private lastGrappleActive = false;

    public init(): void {
        if (this.initialized) return;
        try {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch {
            console.warn('[ProceduralAudio] Web Audio API indisponible');
        }
    }

    private resume(): void {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public playJump(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    public playLand(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const len = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
    }

    public playGrappleAttach(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    public playGrappleRelease(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    public playFootstep(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const len = this.ctx.sampleRate * 0.03;
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.3;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.06;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
    }

    public playDamage(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    public startAmbient(): void {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        if (this.ambientOsc1) return;

        this.ambientOsc1 = this.ctx.createOscillator();
        this.ambientOsc2 = this.ctx.createOscillator();
        this.ambientGain = this.ctx.createGain();
        this.ambientOsc1.type = 'sine';
        this.ambientOsc2.type = 'sine';
        this.ambientOsc1.frequency.value = 55;
        this.ambientOsc2.frequency.value = 82.5;
        this.ambientGain.gain.value = 0.04;

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(this.ambientOsc1.frequency);

        this.ambientOsc1.connect(this.ambientGain);
        this.ambientOsc2.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain);
        this.ambientOsc1.start();
        this.ambientOsc2.start();
        lfo.start();
    }

    public stopAmbient(): void {
        if (this.ambientOsc1) { this.ambientOsc1.stop(); this.ambientOsc1 = null; }
        if (this.ambientOsc2) { this.ambientOsc2.stop(); this.ambientOsc2 = null; }
        this.ambientGain = null;
    }

    public updateFootsteps(dt: number, vx: number, isGrounded: boolean): void {
        if (Math.abs(vx) > 10 && isGrounded) {
            this.footstepTimer += dt;
            const interval = Math.max(0.15, 0.35 - Math.abs(vx) * 0.002);
            if (this.footstepTimer >= interval) {
                this.playFootstep();
                this.footstepTimer = 0;
            }
        } else {
            this.footstepTimer = 0.25;
        }
    }

    public updateGrappleSound(grappleActive: boolean): void {
        if (grappleActive && !this.lastGrappleActive) {
            this.playGrappleAttach();
        } else if (!grappleActive && this.lastGrappleActive) {
            this.playGrappleRelease();
        }
        this.lastGrappleActive = grappleActive;
    }

    public setVolume(vol: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    }
}
