/**
 * ProceduralWorld.js — Générateur procédural de décors
 * Bruit de Perlin, tilemaps, thèmes (désert, jungle, scorpion)
 */

class PerlinNoise {
    constructor(seed) {
        this.seed = seed || Math.random() * 10000;
        this.perm = [];
        this.gradP = [];
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
        ];
        this.init();
    }

    init() {
        const p = new Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        let seed = this.seed;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 16807) % 2147483647;
            const j = Math.floor((seed / 2147483647) * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = this.grad3[this.perm[i] % 12];
        }
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(a, b, t) { return (1 - t) * a + t * b; }
    dot3(g, x, y) { return g[0] * x + g[1] * y; }

    noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;
        return this.lerp(
            this.lerp(this.dot3(this.gradP[A], x, y), this.dot3(this.gradP[B], x - 1, y), u),
            this.lerp(this.dot3(this.gradP[A + 1], x, y - 1), this.dot3(this.gradP[B + 1], x - 1, y - 1), u),
            v
        );
    }

    fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
        let sum = 0;
        let amp = 1;
        let freq = 1;
        let maxAmp = 0;
        for (let i = 0; i < octaves; i++) {
            sum += this.noise2D(x * freq, y * freq) * amp;
            maxAmp += amp;
            amp *= gain;
            freq *= lacunarity;
        }
        return sum / maxAmp;
    }
}

const TILE_THEMES = {
    desert: {
        name: 'Désert',
        skyTop: '#ffb703',
        skyBottom: '#fb8500',
        ground: '#dda15e',
        groundDark: '#c68642',
        accent: '#d4a373',
        particles: 'sand',
        elements: ['dune', 'rock', 'cactus', 'skull', 'oasis', 'scorpion'],
        colors: {
            dune: ['#d4a373', '#c68642', '#b87333'],
            rock: ['#8b7355', '#6b5b3e', '#5a4a2e'],
            cactus: ['#2d6a4f', '#40916c', '#52b788'],
            skull: ['#f5f5dc', '#ddd8c4', '#c4b896'],
            water: ['#48cae4', '#00b4d8', '#0096c7'],
            scorpion: ['#3d0c02', '#5c1a0a', '#8b2500'],
        },
    },
    jungle: {
        name: 'Jungle',
        skyTop: '#1a472a',
        skyBottom: '#2d6a4f',
        ground: '#3a5a40',
        groundDark: '#2d4a30',
        accent: '#588157',
        particles: 'leaves',
        elements: ['tree', 'bush', 'vine', 'flower', 'mushroom', 'scorpion'],
        colors: {
            tree: ['#6f4e37', '#8b6f47', '#a0845c'],
            leaves: ['#2b9348', '#40916c', '#52b788', '#74c69d'],
            vine: ['#3a5a40', '#4a7a50', '#5a8a60'],
            flower: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'],
            mushroom: ['#e76f51', '#f4a261', '#e9c46a'],
            scorpion: ['#3d0c02', '#5c1a0a', '#8b2500'],
        },
    },
    lava: {
        name: 'Lave',
        skyTop: '#1a0a0a',
        skyBottom: '#3a1a0a',
        ground: '#4a2a0a',
        groundDark: '#3a1a00',
        accent: '#ff4400',
        particles: 'embers',
        elements: ['rock', 'lava_pool', 'skull', 'scorpion'],
        colors: {
            rock: ['#3a3a3a', '#4a4a4a', '#2a2a2a'],
            lava: ['#ff4400', '#ff6600', '#ff8800'],
            skull: ['#f5f5dc', '#ddd8c4'],
            scorpion: ['#3d0c02', '#5c1a0a', '#8b2500'],
        },
    },
    ice: {
        name: 'Glace',
        skyTop: '#0a1a2a',
        skyBottom: '#2a4a6a',
        ground: '#88ccdd',
        groundDark: '#66aabb',
        accent: '#aaeeff',
        particles: 'snow',
        elements: ['ice_rock', 'crystal', 'tree', 'scorpion'],
        colors: {
            ice: ['#aaeeff', '#88ccdd', '#66aabb'],
            crystal: ['#ccffff', '#aaeeff', '#88ddff'],
            tree: ['#ffffff', '#eeeeee', '#dddddd'],
            scorpion: ['#3d0c02', '#5c1a0a', '#8b2500'],
        },
    },
    arabian: {
        name: 'Empire Arabe',
        skyTop: '#1a0a2a',
        skyBottom: '#4a2a1a',
        ground: '#d4a373',
        groundDark: '#c68642',
        accent: '#d4a017',
        particles: 'golden_dust',
        elements: ['palm', 'pillar', 'lantern', 'banner', 'fountain', 'scorpion'],
        colors: {
            palm: ['#6f4e37', '#8b6f47', '#2d6a4f'],
            pillar: ['#d4a373', '#c68642', '#d4a017'],
            lantern: ['#d4a017', '#b87333', '#cd7f32'],
            banner: ['#722f37', '#8b0000', '#5c1a1a'],
            fountain: ['#48cae4', '#00b4d8', '#d4a017'],
            scorpion: ['#3d0c02', '#5c1a0a', '#8b2500'],
        },
    },
};

class Tile {
    constructor(x, y, type, config) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = config;
        this.variation = Math.random();
        this.noise = 0;
    }
}

class DecorElement {
    constructor(type, x, y, scale, color, layer) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.color = color;
        this.layer = layer;
        this.variation = Math.random();
        this.rotation = (Math.random() - 0.5) * 0.2;
    }
}

class ProceduralWorld {
    constructor(config = {}) {
        this.width = config.width || 4000;
        this.height = config.height || 600;
        this.tileSize = config.tileSize || 40;
        this.theme = TILE_THEMES[config.theme || 'desert'];
        this.themeName = config.theme || 'desert';
        this.perlin = new PerlinNoise(config.seed || Math.random() * 10000);
        this.tiles = [];
        this.decorElements = [];
        this.platforms = [];
        this.spawnPoints = [];
        this.groundY = config.groundY || this.height - 140;
        this.layers = { far: [], mid: [], near: [] };
        this.generate();
    }

    generate() {
        this.tiles = [];
        this.decorElements = [];
        this.platforms = [];
        this.spawnPoints = [];
        this.layers = { far: [], mid: [], near: [] };

        this.generateTerrain();
        this.generateDecor();
        this.generatePlatforms();
        this.generateSpawnPoints();
    }

    generateTerrain() {
        const cols = Math.ceil(this.width / this.tileSize) + 2;
        const rows = Math.ceil(this.height / this.tileSize) + 2;

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                const noiseVal = this.perlin.fbm(col * 0.05, row * 0.05, 3);
                const isGround = y >= this.groundY + noiseVal * 20;
                const isDeepGround = y >= this.groundY + 40 + noiseVal * 10;

                let type = 'air';
                if (isDeepGround) type = 'ground_deep';
                else if (isGround) type = 'ground';

                if (type !== 'air') {
                    const tile = new Tile(x, y, type, {
                        noise: noiseVal,
                        depth: isDeepGround ? 2 : 1,
                    });
                    this.tiles.push(tile);
                }
            }
        }
    }

    generateDecor() {
        const density = this.themeName === 'jungle' ? 120 : 180;
        const elements = this.theme.elements;
        const colors = this.theme.colors;

        for (let x = 50; x < this.width - 50; x += density + Math.random() * density) {
            const noiseX = x * 0.003;
            const noiseVal = this.perlin.fbm(noiseX, 0.5, 2);
            const groundOffset = noiseVal * 20;

            const typeIdx = Math.floor(Math.random() * elements.length);
            const type = elements[typeIdx];
            const colorSet = colors[type] || colors.rock || ['#888'];
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];
            const scale = 0.6 + Math.random() * 0.8;
            const y = this.groundY + groundOffset;

            const layer = Math.random() < 0.3 ? 'far' : Math.random() < 0.6 ? 'mid' : 'near';

            const el = new DecorElement(type, x, y - this.getDecorHeight(type) * scale, scale, color, layer);
            el.noise = noiseVal;
            this.decorElements.push(el);
            this.layers[layer].push(el);
        }
    }

    getDecorHeight(type) {
        const heights = {
            dune: 30, rock: 45, cactus: 70, skull: 15, oasis: 20,
            tree: 130, bush: 40, vine: 80, flower: 25, mushroom: 20,
            lava_pool: 10, ice_rock: 50, crystal: 60,
            palm: 100, pillar: 80, lantern: 15, banner: 60, fountain: 25,
        };
        return heights[type] || 40;
    }

    generatePlatforms() {
        const platformCount = Math.floor(this.width / 300);
        for (let i = 0; i < platformCount; i++) {
            const x = 150 + i * 280 + Math.random() * 80;
            const y = this.groundY - 80 - Math.random() * 120;
            const w = 80 + Math.random() * 80;
            const noise = this.perlin.fbm(x * 0.01, 0, 2);
            this.platforms.push({
                x, y: y + noise * 20, w, h: 10,
                type: 'float',
                color: this.theme.ground,
                accent: this.theme.accent,
            });
        }
    }

    generateSpawnPoints() {
        this.spawnPoints = [
            { x: 100, y: this.groundY - 30 },
            { x: this.width / 2, y: this.groundY - 30 },
            { x: this.width - 100, y: this.groundY - 30 },
        ];
        for (let i = 0; i < 5; i++) {
            this.spawnPoints.push({
                x: 200 + Math.random() * (this.width - 400),
                y: this.groundY - 30,
            });
        }
    }

    getGroundY(x) {
        const col = Math.floor(x / this.tileSize);
        const noise = this.perlin.fbm(col * 0.05, 0.5, 3);
        return this.groundY + noise * 20;
    }

    drawGround(ctx, camera) {
        const startX = Math.max(0, Math.floor(camera.x / this.tileSize) * this.tileSize);
        const endX = Math.min(this.width, camera.x + camera.width / camera.zoom + this.tileSize);

        for (let x = startX; x < endX; x += this.tileSize) {
            const groundY = this.getGroundY(x);
            const col = Math.floor(x / this.tileSize);
            const noise = this.perlin.fbm(col * 0.05, 0.5, 3);

            const gradient = ctx.createLinearGradient(x, groundY, x, this.height);
            gradient.addColorStop(0, this.theme.ground);
            gradient.addColorStop(0.4, this.theme.groundDark);
            gradient.addColorStop(1, this.theme.groundDark);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, groundY, this.tileSize, this.height - groundY);

            ctx.fillStyle = this.theme.accent;
            ctx.globalAlpha = 0.3 + noise * 0.2;
            ctx.fillRect(x, groundY, this.tileSize, 3);
            ctx.globalAlpha = 1;
        }
    }

    drawDecor(ctx, camera, layer, time) {
        const elements = this.layers[layer] || [];
        const parallaxOffset = layer === 'far' ? 0.5 : layer === 'mid' ? 0.7 : 0.9;

        for (const el of elements) {
            const drawX = el.x - camera.x * parallaxOffset;
            if (drawX + 100 < 0 || drawX - 100 > camera.width / camera.zoom) continue;

            ctx.save();
            ctx.translate(el.x, el.y);
            ctx.scale(el.scale, el.scale);
            ctx.rotate(el.rotation);
            ctx.fillStyle = el.color;

            this.drawDecorElement(ctx, el, time);

            ctx.restore();
        }
    }

    drawDecorElement(ctx, el, time) {
        switch (el.type) {
            case 'dune':
                ctx.beginPath();
                ctx.moveTo(-40, 0);
                ctx.quadraticCurveTo(-20, -25, 0, -20);
                ctx.quadraticCurveTo(20, -15, 40, 0);
                ctx.closePath();
                ctx.fill();
                break;

            case 'rock':
                ctx.beginPath();
                ctx.moveTo(-25, 0);
                ctx.lineTo(-30, -20);
                ctx.lineTo(-15, -35);
                ctx.lineTo(10, -30);
                ctx.lineTo(25, -15);
                ctx.lineTo(20, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.moveTo(-15, -35);
                ctx.lineTo(10, -30);
                ctx.lineTo(25, -15);
                ctx.lineTo(20, 0);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                break;

            case 'cactus':
                ctx.fillRect(-8, -60, 16, 60);
                ctx.fillRect(-22, -45, 14, 12);
                ctx.fillRect(-22, -45, 8, -25);
                ctx.fillRect(8, -35, 14, 12);
                ctx.fillRect(14, -35, 8, -20);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(-4, -58, 3, 55);
                break;

            case 'skull':
                ctx.beginPath();
                ctx.arc(0, -8, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(-6, -2, 12, 6);
                ctx.fillStyle = '#000';
                ctx.fillRect(-5, -10, 3, 3);
                ctx.fillRect(2, -10, 3, 3);
                ctx.fillRect(-2, -5, 4, 2);
                break;

            case 'tree':
                ctx.fillStyle = '#6f4e37';
                ctx.fillRect(-12, -100, 24, 100);
                ctx.fillStyle = el.color;
                ctx.beginPath();
                ctx.arc(0, -110, 50, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.arc(-15, -120, 25, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'bush':
                ctx.beginPath();
                ctx.arc(-12, -15, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(12, -15, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, -22, 16, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'vine':
                ctx.strokeStyle = el.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let i = 0; i < 6; i++) {
                    const t = i / 5;
                    const vx = Math.sin(t * 3 + (time || 0) * 0.5) * 15;
                    ctx.lineTo(vx, -i * 15);
                }
                ctx.stroke();
                break;

            case 'flower':
                const petals = 5;
                for (let i = 0; i < petals; i++) {
                    const angle = (i / petals) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.ellipse(
                        Math.cos(angle) * 6, -12 + Math.sin(angle) * 6,
                        4, 6, angle, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                ctx.fillStyle = '#ffd93d';
                ctx.beginPath();
                ctx.arc(0, -12, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'mushroom':
                ctx.fillStyle = '#f5f5dc';
                ctx.fillRect(-4, -15, 8, 15);
                ctx.fillStyle = el.color;
                ctx.beginPath();
                ctx.arc(0, -15, 12, Math.PI, 0, false);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillRect(-3, -18, 2, 2);
                ctx.fillRect(3, -16, 2, 2);
                break;

            case 'lava_pool':
                const lavaTime = time || 0;
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.ellipse(0, 0, 35 + Math.sin(lavaTime * 2) * 3, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff8800';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.ellipse(0, -2, 25, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;

            case 'ice_rock':
                ctx.beginPath();
                ctx.moveTo(-20, 0);
                ctx.lineTo(-15, -30);
                ctx.lineTo(0, -45);
                ctx.lineTo(15, -30);
                ctx.lineTo(20, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.moveTo(-15, -30);
                ctx.lineTo(0, -45);
                ctx.lineTo(5, -25);
                ctx.closePath();
                ctx.fill();
                break;

            case 'crystal':
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-8, -20);
                ctx.lineTo(-4, -50);
                ctx.lineTo(4, -50);
                ctx.lineTo(8, -20);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.moveTo(-4, -50);
                ctx.lineTo(-2, -30);
                ctx.lineTo(4, -50);
                ctx.closePath();
                ctx.fill();
                break;

            case 'palm':
                ctx.fillStyle = '#6f4e37';
                ctx.fillRect(-6, -80, 12, 80);
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + (time || 0) * 0.3;
                    ctx.fillStyle = '#2d6a4f';
                    ctx.save();
                    ctx.translate(0, -80);
                    ctx.rotate(angle * 0.3);
                    ctx.beginPath();
                    ctx.ellipse(0, -20, 8, 25, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#d4a017';
                ctx.beginPath();
                ctx.arc(0, -82, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'pillar':
                ctx.fillStyle = '#d4a373';
                ctx.fillRect(-6, -80, 12, 80);
                ctx.fillStyle = '#d4a017';
                ctx.fillRect(-8, -82, 16, 6);
                ctx.fillRect(-8, -4, 16, 6);
                ctx.fillStyle = '#c5941a';
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(-6, -i * 10, 12, 1);
                }
                break;

            case 'lantern':
                ctx.fillStyle = '#b87333';
                ctx.fillRect(-1, -25, 2, 10);
                ctx.fillStyle = '#d4a017';
                ctx.beginPath();
                ctx.moveTo(-8, -15);
                ctx.lineTo(-6, -25);
                ctx.lineTo(6, -25);
                ctx.lineTo(8, -15);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#da8a3e';
                ctx.fillRect(-6, -15, 12, 8);
                ctx.fillStyle = 'rgba(255,200,80,0.4)';
                const flicker = Math.sin((time || 0) * 8) * 2;
                ctx.beginPath();
                ctx.arc(0, -11, 10 + flicker, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'banner':
                const sway = Math.sin((time || 0) * 2) * 8;
                ctx.fillStyle = '#722f37';
                ctx.beginPath();
                ctx.moveTo(-15, -60);
                ctx.quadraticCurveTo(-15 + sway * 0.3, -40, -15 + sway, -10);
                ctx.lineTo(-10 + sway, -10);
                ctx.quadraticCurveTo(-10 + sway * 0.3, -40, -10, -60);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#d4a017';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(-13 + sway * 0.2, -45, 3, 3);
                ctx.beginPath();
                ctx.arc(-12 + sway * 0.2, -35, 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'fountain':
                ctx.fillStyle = '#d4a373';
                ctx.beginPath();
                ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(72,202,228,0.5)';
                ctx.beginPath();
                ctx.ellipse(0, -2, 25, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#d4a017';
                ctx.fillRect(-3, -25, 6, 23);
                ctx.beginPath();
                ctx.arc(0, -28, 5, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 3; i++) {
                    const angle = (time || 0) * 2 + i * Math.PI * 2 / 3;
                    const fx = Math.cos(angle) * 8;
                    const fy = -28 + Math.sin((time || 0) * 3 + i) * 3;
                    ctx.fillStyle = 'rgba(72,202,228,0.5)';
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'scorpion':
                this.drawScorpion(ctx, el, time);
                break;
        }
    }

    drawScorpion(ctx, el, time) {
        const t = time || 0;
        ctx.fillStyle = el.color || '#3d0c02';

        ctx.beginPath();
        ctx.ellipse(0, -8, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillRect(-16, -10, 12, 4);
        ctx.fillRect(4, -10, 12, 4);

        ctx.strokeStyle = el.color || '#3d0c02';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.quadraticCurveTo(-20, -25, -12, -35 + Math.sin(t * 3) * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.quadraticCurveTo(20, -25, 12, -35 + Math.sin(t * 3 + 1) * 3);
        ctx.stroke();

        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-13, -36, 2, 2);
        ctx.fillRect(11, -36, 2, 2);
    }

    drawPlatforms(ctx, camera) {
        for (const p of this.platforms) {
            const drawX = p.x - camera.x;
            if (drawX + p.w < 0 || drawX > camera.width / camera.zoom) continue;

            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = p.accent;
            ctx.fillRect(p.x, p.y, p.w, 2);
        }
    }
}

if (typeof window !== 'undefined') {
    window.PerlinNoise = PerlinNoise;
    window.ProceduralWorld = ProceduralWorld;
    window.TILE_THEMES = TILE_THEMES;
}
