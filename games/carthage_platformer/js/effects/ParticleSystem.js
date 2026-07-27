export class ParticleSystem {
    constructor(width, height) {
        this.particles = [];
        this.width = width;
        this.height = height;
        this.time = 0;
        this.init();
    }

    init() {
        for (let i = 0; i < 120; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2.5 + 0.5,
                speedX: Math.random() * 1.8 - 0.3,
                speedY: Math.random() * 0.6 - 0.2,
                opacity: Math.random() * 0.6 + 0.15,
                phase: Math.random() * Math.PI * 2,
                drift: Math.random() * 0.3
            });
        }
    }

    update(dt) {
        this.time += dt;
        for (const p of this.particles) {
            const windGust = Math.sin(this.time * 0.5 + p.phase) * 0.5;
            p.x += (p.speedX + windGust * 0.3) * dt * 60;
            p.y += (p.speedY + Math.sin(this.time + p.phase) * 0.2) * dt * 60;

            if (p.x > this.width + 10) p.x = -10;
            if (p.x < -10) p.x = this.width + 10;
            if (p.y > this.height + 10) p.y = -10;
            if (p.y < -10) p.y = this.height + 10;
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            const flicker = 0.7 + 0.3 * Math.sin(this.time * 3 + p.phase);
            ctx.fillStyle = `rgba(255, 183, 3, ${p.opacity * flicker})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    spawnBurst(x, y, count, opts) {
        const o = opts || {};
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * (o.speed || 4);
            this.particles.push({
                x: x + (Math.random() - 0.5) * (o.spread || 20),
                y: y + (Math.random() - 0.5) * (o.spread || 20),
                size: (o.size || 2) + Math.random() * 2,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed - 1,
                opacity: 0.8,
                phase: Math.random() * Math.PI * 2,
                drift: 0,
                life: o.life || 60
            });
        }
    }
}
