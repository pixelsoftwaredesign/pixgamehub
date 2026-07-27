/**
 * WindSystem.js — Vent interactif & physique du décor
 * Rafales, oscillation des éléments, influence sur particules
 */

class WindGust {
    constructor(x, width, force, duration) {
        this.x = x;
        this.width = width;
        this.force = force;
        this.duration = duration;
        this.age = 0;
        this.active = true;
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.duration) this.active = false;
    }

    getForceAt(px) {
        if (!this.active) return 0;
        const dist = Math.abs(px - this.x);
        if (dist > this.width) return 0;
        const falloff = 1 - dist / this.width;
        const timeFade = 1 - this.age / this.duration;
        return this.force * falloff * timeFade;
    }
}

class WindSystem {
    constructor(config = {}) {
        this.baseForce = config.baseForce || 2.0;
        this.direction = config.direction || 1;
        this.time = 0;
        this.gusts = [];
        this.gustTimer = 0;
        this.gustInterval = config.gustInterval || 120;
        this.maxGusts = config.maxGusts || 3;
        this.turbulence = config.turbulence || 0.5;
        this.treeSway = {};
        this.enabled = true;
    }

    getWindForce(x) {
        if (!this.enabled) return 0;

        const base = this.baseForce * this.direction;
        const sine1 = Math.sin(this.time * 0.7) * 1.2;
        const sine2 = Math.sin(this.time * 0.3 + 1.5) * 1.8;
        const sine3 = Math.sin(this.time * 1.5 + 0.7) * 0.4;
        let gustForce = 0;

        for (const gust of this.gusts) {
            gustForce += gust.getForceAt(x || 0);
        }

        return (base + sine1 + sine2 + sine3 + gustForce) * this.turbulence * 3;
    }

    getGustStrength() {
        let max = 0;
        for (const gust of this.gusts) {
            max = Math.max(max, Math.abs(gust.force));
        }
        return max;
    }

    getWindAngle(x, y) {
        const force = this.getWindForce(x);
        const verticalSway = Math.sin(this.time * 1.2 + x * 0.005) * 0.1;
        return Math.atan2(verticalSway, force * 0.05);
    }

    getTreeSway(x, height) {
        const force = this.getWindForce(x);
        const sway = Math.sin(this.time * 1.5 + x * 0.01) * force * 0.03;
        const heightFactor = Math.min(1, height / 100);
        return sway * heightFactor;
    }

    getVineSway(x, y) {
        const force = this.getWindForce(x);
        const sway = Math.sin(this.time * 2 + y * 0.02) * force * 0.04;
        return sway;
    }

    getLeafDrift(x, y) {
        const force = this.getWindForce(x);
        return {
            vx: force * 0.3 + Math.sin(this.time * 3 + x * 0.01) * 0.5,
            vy: Math.sin(this.time * 2 + y * 0.015) * 0.3 + 0.5,
            rotation: Math.sin(this.time * 2.5 + x * 0.008) * 0.1,
        };
    }

    getGrassSway(x) {
        const force = this.getWindForce(x);
        return Math.sin(this.time * 2.5 + x * 0.03) * force * 0.02;
    }

    getSandDrift() {
        const force = this.getWindForce(0);
        return {
            vx: force * 0.8,
            vy: Math.sin(this.time) * 0.3,
            lifting: Math.max(0, force * 0.15),
        };
    }

    getSnowDrift() {
        const force = this.getWindForce(0);
        return {
            vx: force * 0.4 + Math.sin(this.time * 0.5) * 0.5,
            vy: 0.8 + Math.abs(Math.sin(this.time * 0.3)) * 0.5,
            turbulence: Math.sin(this.time * 1.5) * 0.3,
        };
    }

    applyToParticle(particle, theme) {
        if (!this.enabled) return;

        const force = this.getWindForce(particle.x);

        switch (theme) {
            case 'desert':
                particle.vx += force * 0.02;
                particle.vy += Math.sin(this.time + particle.x * 0.01) * 0.01;
                break;
            case 'jungle':
                particle.vx += force * 0.01;
                particle.vy += Math.sin(this.time * 1.5 + particle.x * 0.02) * 0.02;
                break;
            case 'ice':
                particle.vx += force * 0.015;
                particle.vy += Math.sin(this.time * 0.8) * 0.01;
                break;
            case 'lava':
                particle.vy -= Math.abs(force) * 0.005;
                particle.vx += force * 0.005;
                break;
        }
    }

    spawnGust() {
        if (this.gusts.length >= this.maxGusts) return;

        const x = Math.random() * 2000;
        const width = 200 + Math.random() * 400;
        const force = (3 + Math.random() * 5) * this.direction;
        const duration = 60 + Math.random() * 120;

        this.gusts.push(new WindGust(x, width, force, duration));
    }

    update(dt) {
        this.time += dt * 0.016;
        this.gustTimer += dt;

        if (this.gustTimer >= this.gustInterval) {
            this.gustTimer = 0;
            this.spawnGust();
        }

        for (let i = this.gusts.length - 1; i >= 0; i--) {
            this.gusts[i].update(dt);
            if (!this.gusts[i].active) {
                this.gusts.splice(i, 1);
            }
        }
    }

    setTheme(theme) {
        switch (theme) {
            case 'desert':
                this.baseForce = 3.0;
                this.turbulence = 0.7;
                this.gustInterval = 80;
                this.direction = 1;
                break;
            case 'jungle':
                this.baseForce = 1.5;
                this.turbulence = 0.4;
                this.gustInterval = 150;
                this.direction = Math.random() > 0.5 ? 1 : -1;
                break;
            case 'lava':
                this.baseForce = 1.0;
                this.turbulence = 0.3;
                this.gustInterval = 200;
                this.direction = -1;
                break;
            case 'ice':
                this.baseForce = 4.0;
                this.turbulence = 0.8;
                this.gustInterval = 60;
                this.direction = -1;
                break;
        }
    }

    drawWindDebug(ctx, camera) {
        ctx.save();
        ctx.globalAlpha = 0.3;

        for (const gust of this.gusts) {
            const sx = gust.x - camera.x;
            const sw = gust.width;
            ctx.fillStyle = gust.force > 0 ? '#4488ff' : '#ff4444';
            ctx.fillRect(sx, camera.y, sw, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.fillText(`${gust.force.toFixed(1)}`, sx + 5, camera.y + 12);
        }

        const force = this.getWindForce(camera.x + 400);
        ctx.fillStyle = '#ffaa00';
        ctx.font = '10px monospace';
        ctx.fillText(`Wind: ${force.toFixed(1)}`, 10, camera.y + 15);

        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.WindSystem = WindSystem;
    window.WindGust = WindGust;
}
