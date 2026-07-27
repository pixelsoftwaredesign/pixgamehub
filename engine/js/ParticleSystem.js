/**
 * ParticleSystem.js — Système de particules interactif
 * Ambiance dynamique (sable, feuilles, neige, braises)
 */

class Particle {
    constructor(x, y, vx, vy, size, color, alpha, life, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.alpha = alpha;
        this.life = life;
        this.maxLife = life;
        this.type = type || 'square';
        this.gravity = 0;
        this.rotation = 0;
        this.rotSpeed = 0;
        this.scale = 1;
        this.scaleDecay = 0;
        this.wind = 0;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.vx += this.wind * dt;
        this.life -= dt;
        this.alpha = Math.max(0, (this.life / this.maxLife) * this.alpha);
        this.rotation += this.rotSpeed * dt;
        this.scale -= this.scaleDecay * dt;
        return this.life > 0 && this.alpha > 0;
    }

    draw(ctx) {
        if (this.alpha <= 0 || this.scale <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
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
            case 'leaf':
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size / 2, this.rotation, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'snowflake':
                ctx.fillRect(-this.size / 2, -0.5, this.size, 1);
                ctx.fillRect(-0.5, -this.size / 2, 1, this.size);
                break;
            case 'ember':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = this.alpha * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'dust':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'splash':
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
        }
        ctx.restore();
    }
}

const PARTICLE_PRESETS = {
    desert: {
        ambient: {
            colors: ['rgba(244,211,142,0.5)', 'rgba(212,163,115,0.4)', 'rgba(196,134,66,0.3)'],
            sizeRange: [1, 4],
            speedX: [1.5, 4],
            speedY: [-0.5, 0.5],
            lifeRange: [60, 150],
            type: 'dust',
            gravity: 0.01,
            wind: 0.02,
        },
        sandstorm: {
            colors: ['#d4a373', '#c68642', '#b87333', '#a06828'],
            sizeRange: [2, 6],
            speedX: [4, 8],
            speedY: [-2, 2],
            lifeRange: [40, 80],
            type: 'dust',
            gravity: 0.02,
            wind: 0.1,
        },
        burst: {
            colors: ['#ffb703', '#fb8503', '#ff8800', '#ffffff'],
            sizeRange: [2, 5],
            speedX: [-6, 6],
            speedY: [-6, 6],
            lifeRange: [15, 35],
            type: 'circle',
            gravity: 0.05,
        },
    },
    jungle: {
        ambient: {
            colors: ['#a7c957', '#6a994e', '#386641', '#ffb703'],
            sizeRange: [2, 5],
            speedX: [-1, 1],
            speedY: [0.5, 2],
            lifeRange: [80, 180],
            type: 'leaf',
            gravity: 0.015,
            rotSpeed: [-0.05, 0.05],
        },
        fireflies: {
            colors: ['#ffd93d', '#ffb703', '#ffffff'],
            sizeRange: [1, 3],
            speedX: [-0.5, 0.5],
            speedY: [-0.5, 0.5],
            lifeRange: [100, 250],
            type: 'circle',
            gravity: -0.005,
        },
        burst: {
            colors: ['#2b9348', '#40916c', '#52b788', '#ffffff'],
            sizeRange: [3, 6],
            speedX: [-5, 5],
            speedY: [-5, 5],
            lifeRange: [20, 40],
            type: 'circle',
            gravity: 0.03,
        },
    },
    lava: {
        ambient: {
            colors: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00'],
            sizeRange: [1, 3],
            speedX: [-0.5, 0.5],
            speedY: [-2, -0.5],
            lifeRange: [30, 80],
            type: 'ember',
            gravity: -0.03,
        },
        burst: {
            colors: ['#ff4400', '#ff6600', '#ffcc00', '#ffffff'],
            sizeRange: [3, 7],
            speedX: [-8, 8],
            speedY: [-8, 4],
            lifeRange: [15, 30],
            type: 'ember',
            gravity: 0.08,
        },
    },
    ice: {
        ambient: {
            colors: ['#ffffff', '#eeffff', '#ddeeff'],
            sizeRange: [1, 4],
            speedX: [-0.5, 0.5],
            speedY: [0.3, 1.5],
            lifeRange: [100, 250],
            type: 'snowflake',
            gravity: 0.005,
            rotSpeed: [-0.02, 0.02],
        },
        burst: {
            colors: ['#aaeeff', '#88ddff', '#ffffff'],
            sizeRange: [2, 5],
            speedX: [-5, 5],
            speedY: [-5, 5],
            lifeRange: [20, 40],
            type: 'circle',
            gravity: 0.04,
        },
    },
    arabian: {
        ambient: {
            colors: ['rgba(212,160,23,0.5)', 'rgba(255,215,0,0.4)', 'rgba(184,115,51,0.3)', 'rgba(255,235,150,0.3)'],
            sizeRange: [1, 3],
            speedX: [0.5, 2],
            speedY: [-0.3, 0.3],
            lifeRange: [80, 200],
            type: 'circle',
            gravity: -0.005,
            rotSpeed: [-0.02, 0.02],
        },
        golden_dust: {
            colors: ['#ffd700', '#d4a017', '#ffec8b', '#fff8dc', '#f0e68c'],
            sizeRange: [1, 2],
            speedX: [0.3, 1.5],
            speedY: [-0.2, 0.2],
            lifeRange: [100, 250],
            type: 'circle',
            gravity: -0.003,
        },
        sandstorm: {
            colors: ['#d4a373', '#c68642', '#d4a017', '#b87333'],
            sizeRange: [2, 5],
            speedX: [3, 7],
            speedY: [-1.5, 1.5],
            lifeRange: [40, 80],
            type: 'dust',
            gravity: 0.01,
            wind: 0.08,
        },
        burst: {
            colors: ['#d4a017', '#ffd700', '#ffec8b', '#ffffff'],
            sizeRange: [2, 5],
            speedX: [-6, 6],
            speedY: [-6, 6],
            lifeRange: [15, 35],
            type: 'circle',
            gravity: 0.04,
        },
    },
};

class ParticleSystem {
    constructor(theme) {
        this.particles = [];
        this.theme = theme || 'desert';
        this.presets = PARTICLE_PRESETS[this.theme] || PARTICLE_PRESETS.desert;
        this.maxParticles = 200;
        this.emitTimer = 0;
        this.emitInterval = 3;
    }

    setTheme(theme) {
        this.theme = theme;
        this.presets = PARTICLE_PRESETS[theme] || PARTICLE_PRESETS.desert;
    }

    emitAmbient(camera) {
        this.emitTimer++;
        if (this.emitTimer < this.emitInterval) return;
        this.emitTimer = 0;

        if (this.particles.length >= this.maxParticles) return;

        const preset = this.presets.ambient;
        if (!preset) return;

        const p = new Particle(
            camera.x + Math.random() * (camera.width / camera.zoom),
            preset.speedY[1] < 0 ? camera.height / camera.zoom * 0.8 : -10,
            preset.speedX[0] + Math.random() * (preset.speedX[1] - preset.speedX[0]),
            preset.speedY[0] + Math.random() * (preset.speedY[1] - preset.speedY[0]),
            preset.sizeRange[0] + Math.random() * (preset.sizeRange[1] - preset.sizeRange[0]),
            preset.colors[Math.floor(Math.random() * preset.colors.length)],
            0.8,
            preset.lifeRange[0] + Math.random() * (preset.lifeRange[1] - preset.lifeRange[0]),
            preset.type
        );
        p.gravity = preset.gravity || 0;
        p.wind = preset.wind || 0;
        if (preset.rotSpeed) {
            p.rotSpeed = preset.rotSpeed[0] + Math.random() * (preset.rotSpeed[1] - preset.rotSpeed[0]);
        }
        this.particles.push(p);
    }

    emitBurst(x, y, presetName, count) {
        const preset = this.presets[presetName] || this.presets.burst;
        const n = count || 20;

        for (let i = 0; i < n; i++) {
            const p = new Particle(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 10,
                preset.speedX[0] + Math.random() * (preset.speedX[1] - preset.speedX[0]),
                preset.speedY[0] + Math.random() * (preset.speedY[1] - preset.speedY[0]),
                preset.sizeRange[0] + Math.random() * (preset.sizeRange[1] - preset.sizeRange[0]),
                preset.colors[Math.floor(Math.random() * preset.colors.length)],
                1.0,
                preset.lifeRange[0] + Math.random() * (preset.lifeRange[1] - preset.lifeRange[0]),
                preset.type
            );
            p.gravity = preset.gravity || 0;
            this.particles.push(p);
        }
    }

    emitHit(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            const p = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 3,
                color || '#ffffff',
                1.0,
                15 + Math.random() * 20,
                'circle'
            );
            p.gravity = 0.1;
            this.particles.push(p);
        }
    }

    emitDust(x, y) {
        for (let i = 0; i < 5; i++) {
            const p = new Particle(
                x + (Math.random() - 0.5) * 10,
                y,
                (Math.random() - 0.5) * 3,
                -1 - Math.random() * 2,
                2 + Math.random() * 3,
                '#d4a373',
                0.6,
                20 + Math.random() * 15,
                'dust'
            );
            this.particles.push(p);
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

if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
    window.PARTICLE_PRESETS = PARTICLE_PRESETS;
}
