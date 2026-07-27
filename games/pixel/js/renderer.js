/**
 * RENDERER.JS — Moteur de rendu moderne
 * Particles, effets, shaders, post-processing, caméra
 */

class Particle {
    constructor(x, y, vx, vy, size, color, alpha, decay, type = 'square') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.alpha = alpha;
        this.decay = decay;
        this.type = type;
        this.life = 1;
        this.maxLife = 1;
        this.gravity = 0;
        this.rotation = 0;
        this.rotSpeed = 0;
        this.scale = 1;
        this.scaleDecay = 0;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.alpha -= this.decay * dt;
        this.life -= this.decay * dt;
        this.rotation += this.rotSpeed * dt;
        this.scale -= this.scaleDecay * dt;
        return this.alpha > 0 && this.life > 0;
    }

    draw(ctx) {
        if (this.alpha <= 0 || this.scale <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = this.color;

        switch (this.type) {
            case 'square':
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'star':
                this.drawStar(ctx, this.size);
                break;
            case 'line':
                ctx.fillRect(-this.size / 2, -0.5, this.size, 1);
                break;
            case 'text':
                ctx.font = `${this.size}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(this.text || '*', 0, 0);
                break;
        }
        ctx.restore();
    }

    drawStar(ctx, size) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size / 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, config = {}) {
        const count = config.count || 10;
        const color = config.color || '#ffffff';
        const colors = config.colors || [color];
        for (let i = 0; i < count; i++) {
            const p = new Particle(
                x + (config.spreadX || 0) * (Math.random() - 0.5),
                y + (config.spreadY || 0) * (Math.random() - 0.5),
                (config.vx || 0) + (Math.random() - 0.5) * (config.vxRand || 4),
                (config.vy || 0) + (Math.random() - 0.5) * (config.vyRand || 4),
                (config.size || 3) + Math.random() * (config.sizeRand || 2),
                colors[Math.floor(Math.random() * colors.length)],
                config.alpha || 1.0,
                (config.decay || 0.02) + Math.random() * (config.decayRand || 0.01),
                config.type || 'square'
            );
            p.gravity = config.gravity || 0;
            p.rotSpeed = (config.rotSpeed || 0) * (Math.random() - 0.5);
            p.scaleDecay = config.scaleDecay || 0;
            this.particles.push(p);
        }
    }

    emitDust(x, y) {
        this.emit(x, y, {
            count: 5, colors: ['#c8a050', '#b89040', '#d8b060'],
            vxRand: 3, vyRand: 2, size: 3, sizeRand: 2,
            decay: 0.03, decayRand: 0.01, type: 'square',
            gravity: -0.1,
        });
    }

    emitSandstorm(x, y) {
        this.emit(x, y, {
            count: 20, colors: ['#c8a050', '#b89040', '#a88030', '#d8b060'],
            vx: -3, vxRand: 2, vyRand: 4, size: 2, sizeRand: 3,
            decay: 0.015, decayRand: 0.01, type: 'square', gravity: 0.05,
        });
    }

    emitVenom(x, y) {
        this.emit(x, y, {
            count: 8, colors: ['#44cc44', '#22aa22', '#88ff88'],
            vxRand: 4, vyRand: 4, size: 3, sizeRand: 2,
            decay: 0.025, decayRand: 0.01, type: 'circle', gravity: -0.05,
        });
    }

    emitSparks(x, y) {
        this.emit(x, y, {
            count: 6, colors: ['#ffaa00', '#ff8800', '#ffcc44', '#ffffff'],
            vxRand: 5, vyRand: 5, size: 2, sizeRand: 1,
            decay: 0.04, decayRand: 0.02, type: 'circle', gravity: 0.1,
        });
    }

    emitCrit(x, y) {
        this.emit(x, y, {
            count: 15, colors: ['#ff4444', '#ff8800', '#ffcc00', '#ffffff'],
            vxRand: 8, vyRand: 8, size: 4, sizeRand: 3,
            decay: 0.03, decayRand: 0.02, type: 'star', gravity: 0.05,
        });
    }

    emitSlash(x, y, angle, length) {
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const px = x + Math.cos(angle) * length * t;
            const py = y + Math.sin(angle) * length * t;
            this.emit(px, py, {
                count: 1, colors: ['#ffffff', '#ffcc44'],
                vxRand: 2, vyRand: 2, size: 3, sizeRand: 1,
                decay: 0.05, type: 'line',
            });
        }
    }

    emitEnergyBurst(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.emit(x, y, {
                count: 1, colors: [color, '#ffffff'],
                vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                size: 3, sizeRand: 1, decay: 0.04, type: 'circle',
            });
        }
    }

    emitDeath(x, y, color) {
        this.emit(x, y, {
            count: 30, colors: [color, '#ffffff', '#888888'],
            vxRand: 10, vyRand: 10, size: 4, sizeRand: 3,
            decay: 0.02, decayRand: 0.01, type: 'square',
        });
        this.emit(x, y, {
            count: 10, colors: ['#ffffff'],
            vxRand: 15, vyRand: 15, size: 2, sizeRand: 1,
            decay: 0.03, type: 'star',
        });
    }

    emitHeal(x, y) {
        this.emit(x, y, {
            count: 8, colors: ['#44ff44', '#88ff88', '#ffffff'],
            vxRand: 2, vy: -3, vyRand: 1, size: 3, sizeRand: 1,
            decay: 0.02, decayRand: 0.01, type: 'circle',
        });
    }

    emitShield(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.emit(x, y, {
                count: 1, colors: ['#4488ff', '#88aaff'],
                vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                size: 4, sizeRand: 1, decay: 0.02, type: 'circle',
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (!this.particles[i].update(dt)) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles = [];
    }

    get count() {
        return this.particles.length;
    }
}

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.smoothing = 0.08;
        this.bounds = { left: -500, right: 500, top: -200, bottom: 200 };
    }

    follow(target) {
        this.targetX = target.x - this.canvas.width / 2;
        this.targetY = target.y - this.canvas.height / 2 + 50;
    }

    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    update(dt) {
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;

        this.x = Math.max(this.bounds.left, Math.min(this.bounds.right - this.canvas.width, this.x));
        this.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom - this.canvas.height, this.y));

        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        if (this.shakeDuration > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeDuration -= dt;
            this.shakeIntensity *= 0.95;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    apply(ctx) {
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    restore(ctx) {
        ctx.restore();
    }

    screenToWorld(sx, sy) {
        return {
            x: sx / this.zoom + this.x,
            y: sy / this.zoom + this.y,
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom,
            y: (wy - this.y) * this.zoom,
        };
    }
}

class FloatingText {
    constructor(x, y, text, color, size = 16) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.vy = -2;
        this.decay = 0.02;
        this.scale = 0;
        this.targetScale = 1;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.vy *= 0.98;
        this.alpha -= this.decay * dt;
        this.scale += (this.targetScale - this.scale) * 0.2;
        if (this.alpha < 0.5) this.targetScale = 0;
        return this.alpha > 0;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.font = `bold ${this.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(this.text, 1, 1);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

class FloatingTextSystem {
    constructor() {
        this.texts = [];
    }

    add(x, y, text, color = '#ffffff', size = 16) {
        this.texts.push(new FloatingText(x, y, text, color, size));
    }

    addDamage(x, y, damage, isCrit = false) {
        const text = isCrit ? `${damage}!` : `${damage}`;
        const color = isCrit ? '#ffaa00' : '#ff4444';
        const size = isCrit ? 22 : 16;
        this.add(x, y - 20, text, color, size);
    }

    addHeal(x, y, amount) {
        this.add(x, y - 20, `+${amount}`, '#44ff44', 16);
    }

    addCombo(x, y, combo) {
        this.add(x, y - 30, `${combo} COMBO!`, '#ffaa00', 20);
    }

    addSpecial(x, y) {
        this.add(x, y - 30, 'SPECIAL!', '#aa44ff', 24);
    }

    update(dt) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            if (!this.texts[i].update(dt)) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const t of this.texts) {
            t.draw(ctx);
        }
    }

    clear() {
        this.texts = [];
    }
}

class EffectsManager {
    constructor() {
        this.particles = new ParticleSystem();
        this.floatingTexts = new FloatingTextSystem();
        this.screenFlash = { alpha: 0, color: '#ffffff', duration: 0 };
        this.slowMotion = { active: false, scale: 1, duration: 0 };
        this.hitStop = { active: false, duration: 0 };
    }

    update(dt) {
        if (this.hitStop.active) {
            this.hitStop.duration -= dt;
            if (this.hitStop.duration <= 0) this.hitStop.active = false;
            return 0;
        }

        const timeScale = this.slowMotion.active ? this.slowMotion.scale : 1;
        const scaledDt = dt * timeScale;

        this.particles.update(scaledDt);
        this.floatingTexts.update(scaledDt);

        if (this.screenFlash.duration > 0) {
            this.screenFlash.duration -= dt;
            this.screenFlash.alpha = this.screenFlash.duration / 0.3;
        }

        if (this.slowMotion.active) {
            this.slowMotion.duration -= dt;
            if (this.slowMotion.duration <= 0) this.slowMotion.active = false;
        }

        return timeScale;
    }

    triggerHitStop(duration = 0.08) {
        this.hitStop.active = true;
        this.hitStop.duration = duration;
    }

    triggerSlowMotion(scale = 0.3, duration = 0.5) {
        this.slowMotion.active = true;
        this.slowMotion.scale = scale;
        this.slowMotion.duration = duration;
    }

    triggerFlash(color = '#ffffff', duration = 0.3) {
        this.screenFlash.color = color;
        this.screenFlash.duration = duration;
        this.screenFlash.alpha = 1;
    }

    drawFlash(ctx, canvas) {
        if (this.screenFlash.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.screenFlash.alpha * 0.5;
            ctx.fillStyle = this.screenFlash.color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    clear() {
        this.particles.clear();
        this.floatingTexts.clear();
        this.screenFlash.alpha = 0;
        this.slowMotion.active = false;
        this.hitStop.active = false;
    }
}

if (typeof window !== 'undefined') {
    window.Particle = Particle;
    window.ParticleSystem = ParticleSystem;
    window.Camera = Camera;
    window.FloatingText = FloatingText;
    window.FloatingTextSystem = FloatingTextSystem;
    window.EffectsManager = EffectsManager;
}
