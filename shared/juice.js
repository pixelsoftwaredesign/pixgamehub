/**
 * GAME JUICE ENGINE v1.0
 * Système de particules, effets caméra, audio spatial, météo
 * Utilisable dans n'importe quel jeu Canvas 2D
 */
const Juice = (() => {
    // ── AUDIO ENGINE (Web Audio API) ──
    let audioCtx = null;
    let masterGain = null;
    const sfxCache = {};

    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        masterGain.connect(audioCtx.destination);
    }

    function playTone(freq, duration, type = 'square', vol = 0.3, pan = 0) {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const panner = audioCtx.createStereoPanner();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playNoise(duration, vol = 0.2, filter = 800, pan = 0) {
        initAudio();
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = filter;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        const panner = audioCtx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        source.connect(filt);
        filt.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain);
        source.start();
    }

    // ── SFX BANK ──
    const SFX = {
        punch: (pan) => { playNoise(0.08, 0.3, 1200, pan); playTone(150, 0.06, 'square', 0.2, pan); },
        kick: (pan) => { playNoise(0.1, 0.35, 800, pan); playTone(100, 0.08, 'sawtooth', 0.2, pan); },
        special: (pan) => { playTone(440, 0.3, 'sine', 0.2, pan); playTone(660, 0.25, 'sine', 0.15, pan); playNoise(0.2, 0.15, 2000, pan); },
        hurt: (pan) => { playTone(200, 0.15, 'sawtooth', 0.25, pan); playNoise(0.06, 0.2, 600, pan); },
        death: (pan) => { playTone(300, 0.4, 'sawtooth', 0.3, pan); playTone(150, 0.5, 'sawtooth', 0.2, pan); playNoise(0.3, 0.2, 400, pan); },
        jump: (pan) => { playTone(300, 0.1, 'sine', 0.15, pan); playTone(500, 0.08, 'sine', 0.1, pan); },
        land: (pan) => { playNoise(0.06, 0.15, 500, pan); },
        gem: (pan) => { playTone(880, 0.1, 'sine', 0.15, pan); playTone(1100, 0.15, 'sine', 0.1, pan); },
        pickup: (pan) => { playTone(660, 0.08, 'sine', 0.15, pan); playTone(880, 0.12, 'sine', 0.12, pan); playTone(1100, 0.1, 'sine', 0.1, pan); },
        block: (pan) => { playNoise(0.05, 0.2, 2000, pan); playTone(220, 0.08, 'square', 0.1, pan); },
        scorpion_hit: (pan) => { playNoise(0.1, 0.25, 1000, pan); playTone(180, 0.1, 'sawtooth', 0.15, pan); },
        scorpion_death: (pan) => { playNoise(0.2, 0.2, 600, pan); playTone(120, 0.2, 'sawtooth', 0.15, pan); },
        poison: (pan) => { playTone(200, 0.3, 'sine', 0.1, pan); playTone(180, 0.4, 'sine', 0.08, pan); },
        wave_start: () => { playTone(440, 0.15, 'sine', 0.15); setTimeout(() => playTone(660, 0.15, 'sine', 0.12), 150); setTimeout(() => playTone(880, 0.2, 'sine', 0.1), 300); },
        victory: () => { [440,554,659,880].forEach((f,i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.15), i*120)); },
        click: () => { playTone(600, 0.04, 'square', 0.08); },
        woosh: (pan) => { playNoise(0.15, 0.12, 2000, pan); },
        impact_heavy: (pan) => { playTone(80, 0.2, 'sawtooth', 0.3, pan); playNoise(0.15, 0.3, 600, pan); playTone(60, 0.3, 'square', 0.15, pan); },
        crit: (pan) => { playTone(880, 0.06, 'square', 0.2, pan); playTone(1200, 0.1, 'sine', 0.15, pan); playNoise(0.08, 0.2, 1500, pan); },
        // Terrain footsteps
        footstep_sand: (pan) => { playNoise(0.04, 0.06, 300, pan); },
        footstep_grass: (pan) => { playNoise(0.04, 0.05, 600, pan); },
        footstep_stone: (pan) => { playNoise(0.03, 0.08, 1200, pan); },
        // UI
        ui_hover: () => { playTone(800, 0.03, 'sine', 0.05); },
        ui_select: () => { playTone(600, 0.04, 'square', 0.08); playTone(900, 0.06, 'sine', 0.06); },
        ui_back: () => { playTone(400, 0.06, 'square', 0.06); },
    };

    // ── PARTICLE SYSTEM ──
    const particles = [];
    const MAX_PARTICLES = 500;

    class Particle {
        constructor(x, y, opts = {}) {
            this.x = x;
            this.y = y;
            this.vx = opts.vx || (Math.random() - 0.5) * 4;
            this.vy = opts.vy || (Math.random() - 1) * 3;
            this.size = opts.size || 2 + Math.random() * 3;
            this.color = opts.color || '#fff';
            this.life = opts.life || 20 + Math.random() * 20;
            this.maxLife = this.life;
            this.gravity = opts.gravity ?? 0.1;
            this.friction = opts.friction ?? 0.98;
            this.shape = opts.shape || 'rect'; // rect, circle, star, line
            this.rotation = opts.rotation || Math.random() * Math.PI * 2;
            this.rotSpeed = opts.rotSpeed || (Math.random() - 0.5) * 0.2;
            this.shrink = opts.shrink ?? true;
            this.fadeOut = opts.fadeOut ?? true;
            this.glow = opts.glow || false;
            this.trail = opts.trail || false;
            this.trailPoints = [];
        }

        update() {
            if (this.trail) {
                this.trailPoints.push({ x: this.x, y: this.y });
                if (this.trailPoints.length > 6) this.trailPoints.shift();
            }
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.rotSpeed;
            this.life--;
            return this.life > 0;
        }

        draw(ctx) {
            const alpha = this.fadeOut ? this.life / this.maxLife : 1;
            const sz = this.shrink ? this.size * (this.life / this.maxLife) : this.size;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            if (this.glow) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = sz * 2;
            }

            // Trail
            if (this.trail && this.trailPoints.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = sz * 0.5;
                ctx.globalAlpha = alpha * 0.3;
                this.trailPoints.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x - this.x, p.y - this.y);
                    else ctx.lineTo(p.x - this.x, p.y - this.y);
                });
                ctx.stroke();
                ctx.globalAlpha = alpha;
            }

            ctx.fillStyle = this.color;
            if (this.shape === 'rect') {
                ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
            } else if (this.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.shape === 'star') {
                const s = sz / 2;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    if (i === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
                    else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                }
                ctx.closePath();
                ctx.fill();
            } else if (this.shape === 'line') {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-sz, 0);
                ctx.lineTo(sz, 0);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function emit(x, y, count, opts = {}) {
        for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
            particles.push(new Particle(x, y, {
                ...opts,
                vx: opts.vx !== undefined ? opts.vx + (Math.random() - 0.5) * (opts.spread || 2) : (Math.random() - 0.5) * (opts.spread || 4),
                vy: opts.vy !== undefined ? opts.vy + (Math.random() - 0.5) * (opts.spread || 2) : (Math.random() - 1) * (opts.spread || 4),
                color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color,
                size: opts.size || 2 + Math.random() * 3,
                life: opts.life || 15 + Math.random() * 15,
            }));
        }
    }

    function updateAll() {
        for (let i = particles.length - 1; i >= 0; i--) {
            if (!particles[i].update()) particles.splice(i, 1);
        }
    }

    function drawAll(ctx) {
        particles.forEach(p => p.draw(ctx));
    }

    function clear() { particles.length = 0; }

    // ── PRESET EFFECTS ──
    const Effects = {
        dustRun(x, y, dir) {
            emit(x, y - 5, 3, { color: ['#aa9966','#887744','#ccbb88'], size: 3, vy: -0.5, vx: -dir * 1.5, spread: 1.5, life: 15, gravity: 0.02, shape: 'circle' });
        },
        dustLand(x, y) {
            emit(x, y, 8, { color: ['#aa9966','#887744'], size: 3, spread: 4, life: 12, gravity: 0, shape: 'circle' });
        },
        sandStorm(width, height) {
            emit(Math.random() * width, Math.random() * height * 0.8, 2, { color: ['#ddcc88','#ccbb77','#bbaa66'], size: 2, vx: 4, vy: 0.5, spread: 1, life: 40, gravity: 0, shape: 'circle', friction: 1 });
        },
        venomSplash(x, y) {
            emit(x, y, 12, { color: ['#44ff44','#22cc22','#88ff00','#00ff88'], size: 3, spread: 5, life: 20, gravity: 0.15, shape: 'circle', glow: true });
        },
        hitSparks(x, y, color = '#ff0') {
            emit(x, y, 8, { color: [color, '#fff', '#ffa'], size: 3, spread: 5, life: 12, gravity: 0, shape: 'star', glow: true });
        },
        critSparks(x, y) {
            emit(x, y, 15, { color: ['#ff0','#ff4','#ffa','#fff'], size: 4, spread: 7, life: 18, gravity: 0, shape: 'star', glow: true, trail: true });
        },
        slashTrail(x, y, dir, color = '#fff') {
            for (let i = 0; i < 5; i++) {
                emit(x + dir * i * 6, y + (Math.random() - 0.5) * 10, 1, { color, size: 2, vx: dir * 2, vy: (Math.random() - 0.5) * 2, spread: 0.5, life: 8, gravity: 0, shape: 'line', rotation: dir > 0 ? 0 : Math.PI });
            }
        },
        energyBurst(x, y, color = '#44aaff') {
            emit(x, y, 20, { color: [color, '#fff'], size: 4, spread: 8, life: 25, gravity: -0.05, shape: 'circle', glow: true, trail: true });
        },
        deathBurst(x, y, color = '#ff4444') {
            emit(x, y, 25, { color: [color, '#ff8', '#fff'], size: 4, spread: 8, life: 30, gravity: 0.08, shape: 'star', glow: true });
            emit(x, y, 10, { color: '#333', size: 5, spread: 5, life: 20, gravity: 0.15, shape: 'circle' });
        },
        poof(x, y, color = '#aaa') {
            emit(x, y, 12, { color: [color, '#fff'], size: 5, spread: 4, life: 20, gravity: -0.08, shape: 'circle' });
        },
        sparkle(x, y, color = '#ff0') {
            emit(x, y, 3, { color, size: 2, spread: 2, life: 15, gravity: -0.05, shape: 'star', glow: true });
        },
        rain(width, height, count = 3) {
            for (let i = 0; i < count; i++) {
                emit(Math.random() * width, -5, 1, { color: '#aaccff', size: 1, vx: -1, vy: 8 + Math.random() * 4, spread: 0.5, life: height / 10, gravity: 0.2, shape: 'line', rotation: Math.PI / 6, friction: 1 });
            }
        },
        cherryBlossom(width, height) {
            emit(Math.random() * width, -5, 1, { color: ['#ffb8c6','#ff99aa','#ffc0cb'], size: 3, vx: 0.5, vy: 0.8, spread: 0.5, life: 80, gravity: 0.005, shape: 'circle', rotation: 0, rotSpeed: 0.02, friction: 0.999 });
        },
        lavaGlow(x, y) {
            emit(x, y, 1, { color: ['#ff4400','#ff8800','#ffcc00'], size: 4, spread: 2, life: 25, gravity: -0.1, shape: 'circle', glow: true });
        },
    };

    // ── CAMERA SYSTEM ──
    let camShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    let slowMo = { active: false, factor: 1, duration: 0 };
    let hitStop = { active: false, duration: 0 };

    function shake(intensity = 5, duration = 8) {
        camShake.intensity = intensity;
        camShake.duration = duration;
    }

    function slowMotion(factor = 0.3, duration = 15) {
        slowMo.active = true;
        slowMo.factor = factor;
        slowMo.duration = duration;
    }

    function freeze(duration = 4) {
        hitStop.active = true;
        hitStop.duration = duration;
    }

    function updateCamera() {
        if (camShake.duration > 0) {
            camShake.x = (Math.random() - 0.5) * camShake.intensity * 2;
            camShake.y = (Math.random() - 0.5) * camShake.intensity * 2;
            camShake.duration--;
            camShake.intensity *= 0.85;
        } else {
            camShake.x = 0;
            camShake.y = 0;
        }
        if (slowMo.duration > 0) { slowMo.duration--; } else { slowMo.active = false; slowMo.factor = 1; }
        if (hitStop.duration > 0) { hitStop.duration--; return true; }
        return false;
    }

    function applyCamera(ctx) {
        ctx.translate(camShake.x, camShake.y);
    }

    function getTimeScale() {
        return slowMo.active ? slowMo.factor : 1;
    }

    // ── FLOATING DAMAGE NUMBERS ──
    const dmgNumbers = [];

    function damageNumber(x, y, dmg, color = '#ff4444', isCrit = false) {
        dmgNumbers.push({
            x, y, text: isCrit ? `${Math.floor(dmg)}!` : `${Math.floor(dmg)}`,
            color: isCrit ? '#ffff00' : color,
            size: isCrit ? 18 : 14,
            life: 40,
            vy: -2,
        });
    }

    function updateDamageNumbers() {
        for (let i = dmgNumbers.length - 1; i >= 0; i--) {
            const d = dmgNumbers[i];
            d.y += d.vy;
            d.vy += 0.05;
            d.life--;
            if (d.life <= 0) dmgNumbers.splice(i, 1);
        }
    }

    function drawDamageNumbers(ctx) {
        dmgNumbers.forEach(d => {
            ctx.save();
            ctx.globalAlpha = d.life / 40;
            ctx.fillStyle = d.color;
            ctx.font = `bold ${d.size}px monospace`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText(d.text, d.x, d.y);
            ctx.restore();
        });
    }

    function clearDamageNumbers() { dmgNumbers.length = 0; }

    // ── WEATHER SYSTEM ──
    let weatherState = 'clear'; // clear, sandstorm, rain, night, fog
    let weatherTimer = 0;

    function setWeather(type, duration = 300) {
        weatherState = type;
        weatherTimer = duration;
    }

    function updateWeather(width, height) {
        if (weatherTimer > 0) {
            weatherTimer--;
            if (weatherTimer <= 0) weatherState = 'clear';
        }
        if (weatherState === 'sandstorm') Effects.sandStorm(width, height);
        if (weatherState === 'rain') Effects.rain(width, height);
        if (weatherState === 'fog') Effects.cherryBlossom(width, height);
    }

    function drawWeatherOverlay(ctx, width, height) {
        if (weatherState === 'night') {
            ctx.fillStyle = 'rgba(10,10,40,0.4)';
            ctx.fillRect(0, 0, width, height);
        } else if (weatherState === 'sandstorm') {
            ctx.fillStyle = 'rgba(200,180,120,0.15)';
            ctx.fillRect(0, 0, width, height);
        } else if (weatherState === 'fog') {
            ctx.fillStyle = 'rgba(200,200,220,0.1)';
            ctx.fillRect(0, 0, width, height);
        }
    }

    // ── HIT FLASH SYSTEM ──
    const flashTargets = new Map();

    function flash(target, color = '#fff', duration = 4) {
        flashTargets.set(target, { color, duration });
    }

    function drawFlash(ctx, target, drawFn) {
        const f = flashTargets.get(target);
        if (f && f.duration > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            drawFn();
            ctx.fillStyle = f.color;
            ctx.globalAlpha = f.duration / 4;
            // Approximate fill over the target
            ctx.fillRect(target.x - (target.w || 10), target.y - (target.h || 10), (target.w || 20) * 2, (target.h || 20) * 2);
            ctx.restore();
            f.duration--;
            if (f.duration <= 0) flashTargets.delete(target);
        } else {
            drawFn();
        }
    }

    function clearFlashes() { flashTargets.clear(); }

    // ── PUBLIC API ──
    return {
        SFX,
        emit, updateAll, drawAll, clear,
        Effects,
        shake, slowMotion, freeze,
        updateCamera, applyCamera, getTimeScale,
        damageNumber, updateDamageNumbers, drawDamageNumbers, clearDamageNumbers,
        setWeather, updateWeather, drawWeatherOverlay,
        flash, drawFlash, clearFlashes,
        initAudio,
        get particleCount() { return particles.length; },
    };
})();

if (typeof module !== 'undefined') module.exports = Juice;
