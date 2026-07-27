export class AdvancedParticles {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.particles = [];
        this.wind = 0;
        this.time = 0;
        this.init();
    }

    init() {
        for (let i = 0; i < 150; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: Math.random() * 2 - 0.5,
            vy: Math.random() * 1 - 0.5,
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.7 + 0.1,
            decay: Math.random() * 0.005 + 0.001,
            phase: Math.random() * Math.PI * 2,
            mass: 0.5 + Math.random() * 1.5,
            friction: 0.995 + Math.random() * 0.004,
            windSensitivity: 0.3 + Math.random() * 0.7
        };
    }

    update(dt, playerVx) {
        this.time += dt;
        this.wind = Math.sin(this.time * 0.8) * 0.8 + Math.cos(this.time * 0.3) * 0.4;

        const pVx = playerVx || 0;

        for (const p of this.particles) {
            const windForce = this.wind * p.windSensitivity;
            const dragForce = pVx * 0.08 * p.windSensitivity;
            const turbulence = Math.sin(this.time * 2 + p.phase) * 0.15;

            p.vx += (windForce + dragForce + turbulence) * dt * 60;
            p.vy += (0.02 / p.mass) * dt * 60;
            p.vy += Math.sin(p.x * 0.01 + this.time) * 0.3 * dt * 60;

            p.vx *= p.friction;
            p.vy *= p.friction;

            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;

            p.alpha -= p.decay * dt * 60;

            if (p.x > this.width + 20) p.x = -20;
            if (p.x < -20) p.x = this.width + 20;
            if (p.y > this.height + 20) p.y = -20;
            if (p.y < -20) p.y = this.height + 20;

            if (p.alpha <= 0) {
                Object.assign(p, this.createParticle());
                p.alpha = 0.6 + Math.random() * 0.3;
            }
        }
    }

    spawnBurst(x, y, count, opts) {
        const o = opts || {};
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * (o.speed || 5);
            this.particles.push({
                x: x + (Math.random() - 0.5) * (o.spread || 20),
                y: y + (Math.random() - 0.5) * (o.spread || 20),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                radius: (o.size || 2) + Math.random() * 2,
                alpha: 0.9,
                decay: 0.008 + Math.random() * 0.01,
                phase: Math.random() * Math.PI * 2,
                mass: 0.3 + Math.random() * 0.5,
                friction: 0.97,
                windSensitivity: 0.5
            });
        }
    }

    draw(ctx) {
        ctx.save();
        for (const p of this.particles) {
            if (p.alpha <= 0) continue;
            const flicker = 0.8 + 0.2 * Math.sin(this.time * 4 + p.phase);
            ctx.globalAlpha = p.alpha * flicker;
            ctx.fillStyle = `rgb(${200 + Math.floor(p.radius * 25)}, ${160 + Math.floor(p.phase * 10) % 40}, ${30 + Math.floor(p.mass * 20)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
