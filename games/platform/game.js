const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 540;

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    play(type) {
        if (!this.enabled || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        const t = this.ctx.currentTime;
        switch(type) {
            case 'jump':
                o.type = 'square';
                o.frequency.setValueAtTime(300, t);
                o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                o.start(t); o.stop(t + 0.2);
                break;
            case 'gem':
                o.type = 'sine';
                o.frequency.setValueAtTime(800, t);
                o.frequency.exponentialRampToValueAtTime(1400, t + 0.1);
                g.gain.setValueAtTime(0.1, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                o.start(t); o.stop(t + 0.15);
                break;
            case 'hurt':
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(200, t);
                o.frequency.exponentialRampToValueAtTime(50, t + 0.3);
                g.gain.setValueAtTime(0.15, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                o.start(t); o.stop(t + 0.3);
                break;
            case 'kill':
                o.type = 'square';
                o.frequency.setValueAtTime(150, t);
                o.frequency.exponentialRampToValueAtTime(400, t + 0.08);
                o.frequency.exponentialRampToValueAtTime(100, t + 0.2);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                o.start(t); o.stop(t + 0.25);
                break;
            case 'powerup':
                o.type = 'sine';
                o.frequency.setValueAtTime(400, t);
                o.frequency.setValueAtTime(600, t + 0.1);
                o.frequency.setValueAtTime(800, t + 0.2);
                g.gain.setValueAtTime(0.1, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                o.start(t); o.stop(t + 0.35);
                break;
            case 'win':
                o.type = 'sine';
                o.frequency.setValueAtTime(523, t);
                o.frequency.setValueAtTime(659, t + 0.15);
                o.frequency.setValueAtTime(784, t + 0.3);
                o.frequency.setValueAtTime(1047, t + 0.45);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                o.start(t); o.stop(t + 0.6);
                break;
            case 'death':
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(300, t);
                o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
                g.gain.setValueAtTime(0.15, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                o.start(t); o.stop(t + 0.6);
                break;
        }
    }
}

const audio = new AudioEngine();

class Particle {
    constructor(x, y, color, vx, vy, life, size) {
        this.x = x; this.y = y; this.color = color;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size || 3;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
        this.life--;
    }
    draw() {
        const a = this.life / this.maxLife;
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - game.camera.x, this.y, this.size * a + 1, this.size * a + 1);
        ctx.globalAlpha = 1;
    }
}

const LEVELS = [
    {
        name: "Dune des Égarés",
        bg: '#F4A460',
        groundColor: '#DEB887',
        skyTop: '#87CEEB',
        skyBot: '#FDB813',
        platforms: [
            { x: 0, y: 480, w: 400, h: 60, ground: true },
            { x: 460, y: 480, w: 150, h: 60, ground: true },
            { x: 200, y: 380, w: 120, h: 20 },
            { x: 650, y: 480, w: 310, h: 60, ground: true },
            { x: 500, y: 370, w: 100, h: 20 },
            { x: 750, y: 310, w: 100, h: 20 },
            { x: 870, y: 250, w: 90, h: 20 },
        ],
        movingPlatforms: [
            { x: 320, y: 320, w: 80, h: 16, dx: 0, dy: 1, range: 60 },
            { x: 600, y: 280, w: 80, h: 16, dx: 1, dy: 0, range: 80 },
        ],
        gems: [
            { x: 230, y: 350 }, { x: 300, y: 350 }, { x: 490, y: 340 },
            { x: 530, y: 340 }, { x: 680, y: 450 }, { x: 780, y: 280 },
            { x: 890, y: 220 }, { x: 550, y: 250 },
        ],
        scorpions: [
            { x: 480, y: 448, dir: -1, minX: 460, maxX: 600 },
            { x: 700, y: 448, dir: -1, minX: 650, maxX: 800 },
        ],
        snakes: [
            { x: 300, y: 360, dir: -1, minX: 200, maxX: 310 },
        ],
        quicksand: [
            { x: 430, y: 470, w: 30, h: 10 },
        ],
        powerups: [
            { x: 520, y: 340, type: 'speed' },
            { x: 890, y: 195, type: 'jump' },
        ],
        cacti: [
            { x: 100, y: 440 }, { x: 700, y: 440 }, { x: 900, y: 440 },
        ],
        flag: { x: 920, y: 190 },
        playerStart: { x: 50, y: 430 },
    },
    {
        name: "Canyon des Serpents",
        bg: '#CD853F',
        groundColor: '#B8860B',
        skyTop: '#FF6347',
        skyBot: '#FFD700',
        platforms: [
            { x: 0, y: 480, w: 200, h: 60, ground: true },
            { x: 280, y: 480, w: 120, h: 60, ground: true },
            { x: 450, y: 480, w: 180, h: 60, ground: true },
            { x: 700, y: 480, w: 260, h: 60, ground: true },
            { x: 150, y: 370, w: 100, h: 20 },
            { x: 350, y: 350, w: 100, h: 20 },
            { x: 550, y: 300, w: 120, h: 20 },
            { x: 700, y: 370, w: 100, h: 20 },
            { x: 820, y: 290, w: 100, h: 20 },
        ],
        movingPlatforms: [
            { x: 230, y: 400, w: 80, h: 16, dx: 0, dy: 1, range: 50 },
            { x: 630, y: 350, w: 80, h: 16, dx: 1, dy: 0, range: 60 },
            { x: 450, y: 250, w: 80, h: 16, dx: 0, dy: 1, range: 40 },
        ],
        gems: [
            { x: 170, y: 340 }, { x: 370, y: 320 }, { x: 570, y: 270 },
            { x: 600, y: 270 }, { x: 720, y: 340 }, { x: 840, y: 260 },
            { x: 300, y: 450 }, { x: 500, y: 450 }, { x: 750, y: 450 },
        ],
        scorpions: [
            { x: 300, y: 448, dir: -1, minX: 280, maxX: 390 },
            { x: 500, y: 448, dir: -1, minX: 450, maxX: 620 },
            { x: 750, y: 448, dir: -1, minX: 700, maxX: 850 },
        ],
        snakes: [
            { x: 160, y: 350, dir: -1, minX: 150, maxX: 240 },
            { x: 720, y: 350, dir: -1, minX: 700, maxX: 790 },
            { x: 840, y: 270, dir: -1, minX: 820, maxX: 910 },
        ],
        quicksand: [
            { x: 410, y: 470, w: 40, h: 10 },
            { x: 680, y: 470, w: 20, h: 10 },
        ],
        powerups: [
            { x: 370, y: 320, type: 'shield' },
            { x: 840, y: 235, type: 'health' },
        ],
        cacti: [
            { x: 50, y: 440 }, { x: 480, y: 440 }, { x: 730, y: 440 },
        ],
        flag: { x: 920, y: 235 },
        playerStart: { x: 50, y: 430 },
    },
    {
        name: "Tombeau du Pharaon",
        bg: '#4A3728',
        groundColor: '#3E2723',
        skyTop: '#1a0a2e',
        skyBot: '#4A1A6B',
        platforms: [
            { x: 0, y: 480, w: 180, h: 60, ground: true },
            { x: 250, y: 480, w: 150, h: 60, ground: true },
            { x: 500, y: 480, w: 130, h: 60, ground: true },
            { x: 750, y: 480, w: 210, h: 60, ground: true },
            { x: 100, y: 380, w: 90, h: 20 },
            { x: 280, y: 340, w: 100, h: 20 },
            { x: 450, y: 370, w: 90, h: 20 },
            { x: 600, y: 300, w: 110, h: 20 },
            { x: 760, y: 350, w: 90, h: 20 },
            { x: 860, y: 250, w: 100, h: 20 },
        ],
        movingPlatforms: [
            { x: 190, y: 400, w: 70, h: 16, dx: 0, dy: 1, range: 55 },
            { x: 400, y: 300, w: 70, h: 16, dx: 1, dy: 0, range: 70 },
            { x: 660, y: 250, w: 70, h: 16, dx: 0, dy: 1, range: 45 },
            { x: 520, y: 200, w: 80, h: 16, dx: 1, dy: 0, range: 60 },
        ],
        gems: [
            { x: 120, y: 350 }, { x: 300, y: 310 }, { x: 470, y: 340 },
            { x: 620, y: 270 }, { x: 650, y: 270 }, { x: 780, y: 320 },
            { x: 880, y: 220 }, { x: 540, y: 170 }, { x: 560, y: 170 },
        ],
        scorpions: [
            { x: 270, y: 448, dir: -1, minX: 250, maxX: 390 },
            { x: 530, y: 448, dir: -1, minX: 500, maxX: 620 },
            { x: 780, y: 448, dir: -1, minX: 750, maxX: 900 },
        ],
        snakes: [
            { x: 100, y: 360, dir: -1, minX: 100, maxX: 180 },
            { x: 620, y: 280, dir: -1, minX: 600, maxX: 700 },
            { x: 880, y: 230, dir: -1, minX: 860, maxX: 950 },
        ],
        quicksand: [
            { x: 220, y: 470, w: 30, h: 10 },
            { x: 460, y: 470, w: 40, h: 10 },
            { x: 700, y: 470, w: 50, h: 10 },
        ],
        powerups: [
            { x: 300, y: 310, type: 'speed' },
            { x: 780, y: 320, type: 'shield' },
            { x: 880, y: 195, type: 'jump' },
        ],
        cacti: [
            { x: 60, y: 440 }, { x: 510, y: 440 }, { x: 760, y: 440 },
        ],
        flag: { x: 930, y: 195 },
        playerStart: { x: 40, y: 430 },
    },
];

class Game {
    constructor() {
        this.state = 'menu';
        this.currentLevel = 0;
        this.score = 0;
        this.lives = 3;
        this.player = null;
        this.enemies = [];
        this.gems = [];
        this.powerups = [];
        this.particles = [];
        this.platforms = [];
        this.movingPlatforms = [];
        this.quicksand = [];
        this.cacti = [];
        this.camera = { x: 0 };
        this.keys = {};
        this.levelData = null;
        this.powerTimer = 0;
        this.powerType = '';
        this.shieldActive = false;
        this.invincible = 0;
        this.time = 0;
        this.scrollingX = 0;

        this.setupInput();
        this.menuLoop();
    }

    setupInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') {
                if (this.state === 'playing') this.pause();
                else if (this.state === 'paused') this.resume();
            }
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    }

    updateHUD() {
        document.getElementById('hud-score').textContent = '💎 ' + this.score;
        document.getElementById('hud-lives').textContent = '❤️ ' + this.lives;
        document.getElementById('hud-level').textContent = this.levelData ? this.levelData.name : '';
        const pe = document.getElementById('hud-power');
        if (this.powerType && this.powerTimer > 0) {
            const names = { speed: '⚡Vitesse', shield: '🛡Bouclier', jump: '🦘Saut+' };
            pe.textContent = names[this.powerType] + ' ' + Math.ceil(this.powerTimer / 60) + 's';
        } else {
            pe.textContent = '';
        }
    }

    startGame() {
        audio.init();
        this.currentLevel = 0;
        this.score = 0;
        this.lives = 3;
        this.state = 'playing';
        this.hideAllScreens();
        this.loadLevel(this.currentLevel);
        if (!this._looping) {
            this._looping = true;
            this.loop();
        }
    }

    loadLevel(idx) {
        const ld = LEVELS[idx];
        this.levelData = ld;
        this.platforms = ld.platforms.map(p => ({ ...p }));
        this.movingPlatforms = ld.movingPlatforms.map(p => ({ ...p, origX: p.x, origY: p.y }));
        this.quicksand = ld.quicksand.map(q => ({ ...q }));
        this.cacti = ld.cacti.map(c => ({ ...c }));
        this.gems = ld.gems.map(g => ({ ...g, collected: false, bob: Math.random() * Math.PI * 2 }));
        this.powerups = ld.powerups.map(p => ({ ...p, collected: false, bob: Math.random() * Math.PI * 2 }));
        this.enemies = [];
        ld.scorpions.forEach(s => {
            this.enemies.push({ type: 'scorpion', x: s.x, y: s.y, w: 28, h: 18, dir: s.dir, minX: s.minX, maxX: s.maxX, alive: true, anim: 0 });
        });
        ld.snakes.forEach(s => {
            this.enemies.push({ type: 'snake', x: s.x, y: s.y, w: 30, h: 16, dir: s.dir, minX: s.minX, maxX: s.maxX, alive: true, anim: 0, tongueOut: 0 });
        });
        this.player = {
            x: ld.playerStart.x, y: ld.playerStart.y,
            w: 20, h: 32,
            vx: 0, vy: 0,
            onGround: false,
            facing: 1,
            walkAnim: 0,
            inQuicksand: false,
            jumpHeld: false,
        };
        this.powerType = '';
        this.powerTimer = 0;
        this.shieldActive = false;
        this.invincible = 0;
        this.particles = [];
        this.camera.x = 0;
        this.updateHUD();
    }

    pause() {
        this.state = 'paused';
        this.showScreen('pause-screen');
    }

    resume() {
        this.state = 'playing';
        this.hideAllScreens();
    }

    retryLevel() {
        this.state = 'playing';
        this.hideAllScreens();
        this.loadLevel(this.currentLevel);
    }

    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel >= LEVELS.length) {
            this.state = 'victory';
            document.getElementById('victory-score').textContent = 'Score: ' + this.score;
            this.showScreen('victory-screen');
            audio.play('win');
            return;
        }
        this.state = 'playing';
        this.hideAllScreens();
        this.loadLevel(this.currentLevel);
    }

    quitToMenu() {
        this.state = 'menu';
        this.showScreen('start-screen');
    }

    die() {
        this.lives--;
        audio.play('death');
        this.spawnParticles(this.player.x + 10, this.player.y + 16, '#ff0000', 20);
        if (this.lives <= 0) {
            this.state = 'gameover';
            document.getElementById('final-score').textContent = 'Score: ' + this.score;
            this.showScreen('gameover-screen');
        } else {
            document.getElementById('death-msg').textContent = 'Vies restantes: ' + this.lives;
            this.state = 'dead';
            this.showScreen('death-screen');
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push(new Particle(x, y, color,
                Math.cos(angle) * speed, Math.sin(angle) * speed - 1,
                20 + Math.random() * 20, 2 + Math.random() * 3));
        }
    }

    spawnJumpParticles() {
        const p = this.player;
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(p.x + p.w / 2, p.y + p.h,
                '#DEB887', (Math.random() - 0.5) * 2, -Math.random() * 1.5,
                15, 3));
        }
    }

    spawnGemParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            this.particles.push(new Particle(x, y, '#FFA500',
                Math.cos(a) * 2, Math.sin(a) * 2,
                20, 3));
        }
    }

    spawnKillParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            this.particles.push(new Particle(x, y, '#FF4444',
                Math.cos(a) * 3, Math.sin(a) * 3,
                25, 4));
        }
    }

    rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    saveGame() {
        const data = {
            level: this.currentLevel,
            score: this.score,
            lives: this.lives,
        };
        localStorage.setItem('desertAdventure', JSON.stringify(data));
        alert('Sauvegardé!');
    }

    loadGame() {
        audio.init();
        const raw = localStorage.getItem('desertAdventure');
        if (!raw) { alert('Aucune sauvegarde.'); return; }
        const data = JSON.parse(raw);
        this.currentLevel = data.level;
        this.score = data.score;
        this.lives = data.lives;
        this.state = 'playing';
        this.hideAllScreens();
        this.loadLevel(this.currentLevel);
        if (!this._looping) {
            this._looping = true;
            this.loop();
        }
    }

    updatePlayer() {
        const p = this.player;
        const k = this.keys;
        const moveLeft = k['ArrowLeft'] || k['KeyA'];
        const moveRight = k['ArrowRight'] || k['KeyD'];
        const jumpKey = k['Space'] || k['ArrowUp'] || k['KeyW'];

        let speed = 3;
        let jumpForce = -10;
        if (this.powerType === 'speed' && this.powerTimer > 0) speed = 5;
        if (this.powerType === 'jump' && this.powerTimer > 0) jumpForce = -13;

        p.inQuicksand = false;
        for (const qs of this.quicksand) {
            if (p.x + p.w > qs.x && p.x < qs.x + qs.w && p.y + p.h > qs.y && p.y + p.h < qs.y + qs.h + 10) {
                p.inQuicksand = true;
                break;
            }
        }
        if (p.inQuicksand) speed *= 0.35;

        if (moveLeft) { p.vx = -speed; p.facing = -1; p.walkAnim += 0.15; }
        else if (moveRight) { p.vx = speed; p.facing = 1; p.walkAnim += 0.15; }
        else { p.vx = 0; p.walkAnim = 0; }

        if (jumpKey && p.onGround && !p.jumpHeld) {
            p.vy = jumpForce;
            p.onGround = false;
            p.jumpHeld = true;
            audio.play('jump');
            this.spawnJumpParticles();
        }
        if (!jumpKey) p.jumpHeld = false;

        p.vy += 0.5;
        if (p.vy > 12) p.vy = 12;

        p.x += p.vx;
        this.resolveCollisionX(p);
        p.y += p.vy;
        p.onGround = false;
        this.resolveCollisionY(p);

        const allPlats = this.platforms.concat(this.movingPlatforms);
        for (const mp of this.movingPlatforms) {
            if (p.x + p.w > mp.x && p.x < mp.x + mp.w && Math.abs(p.y + p.h - mp.y) < 4 && p.vy >= 0) {
                if (mp.dx) p.x += mp.dx > 0 ? 1.5 : -1.5;
                if (mp.dy) p.y += mp.dy > 0 ? 1.5 : -1.5;
            }
        }

        if (p.x < 0) p.x = 0;
        if (p.x > 960) p.x = 960;
        if (p.y > 600) {
            this.die();
            return;
        }

        if (this.invincible > 0) this.invincible--;
        if (this.powerTimer > 0) {
            this.powerTimer--;
            if (this.powerTimer <= 0) { this.powerType = ''; this.shieldActive = false; }
        }

        for (let i = 0; i < this.gems.length; i++) {
            const g = this.gems[i];
            if (!g.collected && this.rectsOverlap(p, { x: g.x - 6, y: g.y - 6, w: 12, h: 12 })) {
                g.collected = true;
                this.score += 10;
                audio.play('gem');
                this.spawnGemParticles(g.x, g.y);
            }
        }

        for (let i = 0; i < this.powerups.length; i++) {
            const pw = this.powerups[i];
            if (!pw.collected && this.rectsOverlap(p, { x: pw.x - 8, y: pw.y - 8, w: 16, h: 16 })) {
                pw.collected = true;
                this.score += 25;
                this.powerType = pw.type;
                this.powerTimer = 600;
                if (pw.type === 'shield') this.shieldActive = true;
                if (pw.type === 'health') { this.lives = Math.min(this.lives + 1, 5); this.powerType = ''; this.powerTimer = 0; }
                audio.play('powerup');
                this.spawnGemParticles(pw.x, pw.y);
            }
        }

        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (this.rectsOverlap(p, { x: e.x, y: e.y, w: e.w, h: e.h })) {
                if (p.vy > 0 && p.y + p.h - 10 < e.y + e.h / 2) {
                    e.alive = false;
                    p.vy = -8;
                    this.score += 50;
                    audio.play('kill');
                    this.spawnKillParticles(e.x + e.w / 2, e.y + e.h / 2);
                } else if (this.invincible <= 0) {
                    if (this.shieldActive) {
                        this.shieldActive = false;
                        this.powerType = '';
                        this.powerTimer = 0;
                        this.invincible = 60;
                        audio.play('hurt');
                    } else {
                        this.invincible = 60;
                        p.vy = -6;
                        p.vx = p.facing * -4;
                        this.lives--;
                        audio.play('hurt');
                        this.spawnParticles(p.x + 10, p.y + 16, '#ff4444', 10);
                        if (this.lives <= 0) {
                            this.die();
                            return;
                        }
                    }
                }
            }
        }

        for (const c of this.cacti) {
            if (this.rectsOverlap(p, { x: c.x - 6, y: c.y - 30, w: 12, h: 30 }) && this.invincible <= 0) {
                if (this.shieldActive) {
                    this.shieldActive = false;
                    this.powerType = '';
                    this.powerTimer = 0;
                    this.invincible = 60;
                    audio.play('hurt');
                } else {
                    this.invincible = 60;
                    p.vy = -6;
                    this.lives--;
                    audio.play('hurt');
                    this.spawnParticles(p.x + 10, p.y + 16, '#ff4444', 10);
                    if (this.lives <= 0) { this.die(); return; }
                }
            }
        }

        const fl = this.levelData.flag;
        if (this.rectsOverlap(p, { x: fl.x - 10, y: fl.y - 40, w: 20, h: 40 })) {
            this.state = 'levelComplete';
            this.score += 100;
            audio.play('win');
            const msg = this.currentLevel < LEVELS.length - 1 ? 'Bravo! Passons au niveau suivant!' : 'Tous les niveaux terminés!';
            document.getElementById('win-msg').textContent = msg;
            document.getElementById('next-btn').textContent = this.currentLevel < LEVELS.length - 1 ? 'Suivant' : 'Victoire!';
            this.showScreen('win-screen');
        }
    }

    resolveCollisionX(p) {
        for (const pl of this.platforms) {
            if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
                if (p.vx > 0) p.x = pl.x - p.w;
                else if (p.vx < 0) p.x = pl.x + pl.w;
                p.vx = 0;
            }
        }
    }

    resolveCollisionY(p) {
        const allPlats = this.platforms.concat(this.movingPlatforms);
        for (const pl of allPlats) {
            if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
                if (p.vy > 0) {
                    p.y = pl.y - p.h;
                    p.vy = 0;
                    p.onGround = true;
                } else if (p.vy < 0) {
                    p.y = pl.y + pl.h;
                    p.vy = 0;
                }
            }
        }
    }

    updateEnemies() {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            e.anim += 0.1;
            const spd = e.type === 'scorpion' ? 1 : 1.5;
            e.x += e.dir * spd;
            if (e.x <= e.minX || e.x >= e.maxX) e.dir *= -1;
            if (e.type === 'snake') {
                e.tongueOut = (e.tongueOut + 1) % 120;
            }
        }
    }

    updateMovingPlatforms() {
        for (const mp of this.movingPlatforms) {
            if (mp.dx) {
                mp.x += mp.dx * 1.2;
                if (Math.abs(mp.x - mp.origX) > mp.range) mp.dx *= -1;
            }
            if (mp.dy) {
                mp.y += mp.dy * 1.2;
                if (Math.abs(mp.y - mp.origY) > mp.range) mp.dy *= -1;
            }
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
    }

    updateCamera() {
        const target = this.player.x - canvas.width / 3;
        this.camera.x += (target - this.camera.x) * 0.08;
        if (this.camera.x < 0) this.camera.x = 0;
        const maxCam = 960 - canvas.width;
        if (maxCam > 0 && this.camera.x > maxCam) this.camera.x = maxCam;
        this.scrollingX -= this.player.vx * 0.3;
    }

    drawSky() {
        const ld = this.levelData;
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, ld.skyTop);
        grad.addColorStop(1, ld.skyBot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawDunes() {
        ctx.fillStyle = '#E8C872';
        for (let i = 0; i < 5; i++) {
            const ox = ((i * 280 + this.scrollingX * 0.2) % (canvas.width + 200)) - 100;
            ctx.beginPath();
            ctx.moveTo(ox - 100, canvas.height);
            ctx.quadraticCurveTo(ox + 50, canvas.height - 80 - i * 10, ox + 200, canvas.height);
            ctx.fill();
        }
        ctx.fillStyle = '#D4A844';
        for (let i = 0; i < 4; i++) {
            const ox = ((i * 320 + 150 + this.scrollingX * 0.35) % (canvas.width + 300)) - 150;
            ctx.beginPath();
            ctx.moveTo(ox - 120, canvas.height);
            ctx.quadraticCurveTo(ox + 60, canvas.height - 50 - i * 8, ox + 240, canvas.height);
            ctx.fill();
        }
    }

    drawPyramids() {
        const ld = this.levelData;
        if (ld === LEVELS[0]) {
            this.drawPyramid(600, 180, 160, 180, '#C4A035');
            this.drawPyramid(750, 220, 100, 140, '#B8942A');
        } else if (ld === LEVELS[1]) {
            this.drawPyramid(700, 150, 200, 220, '#A0522D');
            this.drawPyramid(850, 200, 120, 170, '#8B4513');
        } else {
            this.drawPyramid(500, 120, 250, 260, '#3E2723');
            this.drawPyramid(750, 180, 160, 200, '#4E342E');
            ctx.fillStyle = '#FFD700';
            ctx.font = '20px serif';
            ctx.fillText('🏛', 600 - this.camera.x, 160);
        }
    }

    drawPyramid(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - this.camera.x, y + h);
        ctx.lineTo(x - this.camera.x, y);
        ctx.lineTo(x + w / 2 - this.camera.x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(x - this.camera.x, y);
        ctx.lineTo(x + w / 2 - this.camera.x, y + h);
        ctx.lineTo(x - this.camera.x, y + h);
        ctx.closePath();
        ctx.fill();
    }

    drawCacti() {
        for (const c of this.cacti) {
            const sx = c.x - this.camera.x;
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(sx - 4, c.y - 30, 8, 30);
            ctx.fillRect(sx - 14, c.y - 25, 10, 6);
            ctx.fillRect(sx - 14, c.y - 25, 6, -10);
            ctx.fillRect(sx + 6, c.y - 20, 10, 6);
            ctx.fillRect(sx + 10, c.y - 20, 6, -8);
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(sx - 2, c.y - 30, 4, 30);
        }
    }

    drawPlatforms() {
        for (const p of this.platforms) {
            const sx = p.x - this.camera.x;
            if (sx > -p.w && sx < canvas.width + p.w) {
                if (p.ground) {
                    ctx.fillStyle = this.levelData.groundColor;
                    ctx.fillRect(sx, p.y, p.w, p.h);
                    ctx.fillStyle = '#C4A44A';
                    for (let i = 0; i < p.w; i += 12) {
                        ctx.fillRect(sx + i, p.y, 6, 3);
                    }
                } else {
                    ctx.fillStyle = '#A0522D';
                    ctx.fillRect(sx, p.y, p.w, p.h);
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(sx, p.y, p.w, 4);
                    ctx.fillStyle = '#6B3410';
                    ctx.fillRect(sx + 2, p.y + p.h - 3, p.w - 4, 3);
                }
            }
        }
        for (const mp of this.movingPlatforms) {
            const sx = mp.x - this.camera.x;
            if (sx > -mp.w && sx < canvas.width + mp.w) {
                ctx.fillStyle = '#DAA520';
                ctx.fillRect(sx, mp.y, mp.w, mp.h);
                ctx.fillStyle = '#B8860B';
                ctx.fillRect(sx, mp.y, mp.w, 3);
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(sx + mp.w / 2 - 6, mp.y + 4, 12, 3);
            }
        }
    }

    drawQuicksand() {
        for (const qs of this.quicksand) {
            const sx = qs.x - this.camera.x;
            ctx.fillStyle = '#C4A44A';
            ctx.globalAlpha = 0.6;
            ctx.fillRect(sx, qs.y, qs.w, qs.h + 5);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#D4B44A';
            const t = Date.now() / 500;
            for (let i = 0; i < qs.w; i += 4) {
                const dy = Math.sin(t + i) * 2;
                ctx.fillRect(sx + i, qs.y + dy, 3, 2);
            }
        }
    }

    drawGems() {
        const t = Date.now() / 300;
        for (const g of this.gems) {
            if (g.collected) continue;
            const sx = g.x - this.camera.x;
            if (sx < -20 || sx > canvas.width + 20) continue;
            const bob = Math.sin(t + g.bob) * 3;
            ctx.save();
            ctx.translate(sx, g.y + bob);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#FF8C00';
            ctx.fillRect(-6, -6, 12, 12);
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(-4, -4, 8, 8);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
        }
    }

    drawPowerups() {
        const t = Date.now() / 250;
        const colors = { speed: '#00FFFF', shield: '#FFD700', jump: '#00FF00', health: '#FF4444' };
        for (const pw of this.powerups) {
            if (pw.collected) continue;
            const sx = pw.x - this.camera.x;
            if (sx < -20 || sx > canvas.width + 20) continue;
            const bob = Math.sin(t + pw.bob) * 4;
            const col = colors[pw.type];
            ctx.save();
            ctx.translate(sx, pw.y + bob);
            const glow = 0.5 + Math.sin(t * 2) * 0.3;
            ctx.globalAlpha = glow;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icons = { speed: '⚡', shield: '🛡', jump: '⬆', health: '❤' };
            ctx.fillText(icons[pw.type], 0, 0);
            ctx.restore();
        }
    }

    drawFlag() {
        const fl = this.levelData.flag;
        const sx = fl.x - this.camera.x;
        const t = Date.now() / 300;
        const wave = Math.sin(t) * 5;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sx - 2, fl.y - 40, 4, 40);
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(sx + 2, fl.y - 40);
        ctx.lineTo(sx + 22 + wave, fl.y - 32);
        ctx.lineTo(sx + 2, fl.y - 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', sx, fl.y - 32);
    }

    drawScorpion(e) {
        const sx = e.x - this.camera.x;
        const legAnim = Math.sin(e.anim * 3) * 3;

        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(sx + 4, e.y + 2, 20, 10);

        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 3; i++) {
            const lx = sx + 6 + i * 5;
            ctx.fillRect(lx, e.y + 12, 2, 5 + (i % 2 ? legAnim : -legAnim));
            ctx.fillRect(lx + 10, e.y + 12, 2, 5 + (i % 2 ? -legAnim : legAnim));
        }

        const tailDir = e.dir;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + (tailDir > 0 ? 4 : 24), e.y + 5);
        ctx.quadraticCurveTo(sx + (tailDir > 0 ? -8 : 32), e.y - 5,
            sx + (tailDir > 0 ? 0 : 28), e.y - 12);
        ctx.stroke();

        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(sx + (tailDir > 0 ? 0 : 28), e.y - 13, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a1a';
        const pinAnim = Math.sin(e.anim * 2) * 2;
        ctx.fillRect(sx + (e.dir > 0 ? 24 : -6), e.y + 1, 6, 3 + pinAnim);
        ctx.fillRect(sx + (e.dir > 0 ? 24 : -6), e.y + 8, 6, 3 - pinAnim);
        ctx.fillRect(sx + (e.dir > 0 ? 28 : -10), e.y + 1, 4, 2);
        ctx.fillRect(sx + (e.dir > 0 ? 28 : -10), e.y + 9, 4, 2);

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(sx + (e.dir > 0 ? 22 : 4), e.y, 3, 2);
        ctx.fillRect(sx + (e.dir > 0 ? 22 : 4), e.y + 11, 3, 2);
    }

    drawSnake(e) {
        const sx = e.x - this.camera.x;
        const slither = Math.sin(e.anim * 4) * 4;

        ctx.fillStyle = '#228B22';
        for (let i = 0; i < 6; i++) {
            const segX = sx + 25 - i * 5;
            const segY = e.y + 8 + Math.sin(e.anim * 4 + i * 0.8) * 3;
            const r = i === 0 ? 6 : 4 - i * 0.3;
            ctx.beginPath();
            ctx.arc(segX, segY, Math.max(r, 2), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#006400';
        ctx.beginPath();
        ctx.moveTo(sx + 24, e.y + 2);
        ctx.lineTo(sx + 30, e.y + 8);
        ctx.lineTo(sx + 24, e.y + 14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#006400';
        ctx.beginPath();
        ctx.moveTo(sx + 24, e.y + 3);
        ctx.lineTo(sx + 28, e.y - 2);
        ctx.lineTo(sx + 24, e.y + 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(sx + (e.dir > 0 ? 22 : 6), e.y + 3, 2, 2);
        ctx.fillRect(sx + (e.dir > 0 ? 22 : 6), e.y + 9, 2, 2);

        if (e.tongueOut > 80 && e.tongueOut < 110) {
            const tLen = 6;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 1.5;
            const tx = e.dir > 0 ? sx + 30 : sx;
            const tdir = e.dir > 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(tx, e.y + 8);
            ctx.lineTo(tx + tdir * tLen, e.y + 6);
            ctx.moveTo(tx + tdir * tLen, e.y + 8);
            ctx.lineTo(tx + tdir * tLen, e.y + 10);
            ctx.stroke();
        }
    }

    drawEnemies() {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.type === 'scorpion') this.drawScorpion(e);
            else this.drawSnake(e);
        }
    }

    drawPlayer() {
        const p = this.player;
        const sx = p.x - this.camera.x;

        if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2 === 0) return;

        const legAnim = Math.sin(p.walkAnim * 2) * 4;
        const isMoving = Math.abs(p.vx) > 0.5;

        ctx.fillStyle = '#3E2723';
        ctx.fillRect(sx + 3, p.y + 24, 6, 8 + (isMoving ? legAnim : 0));
        ctx.fillRect(sx + 11, p.y + 24, 6, 8 - (isMoving ? legAnim : 0));

        ctx.fillStyle = '#2C1810';
        ctx.fillRect(sx + 2, p.y + 30 + (isMoving ? legAnim : 0), 8, 2);
        ctx.fillRect(sx + 10, p.y + 30 - (isMoving ? legAnim : 0), 8, 2);

        ctx.fillStyle = '#D2691E';
        ctx.fillRect(sx + 2, p.y + 12, 16, 14);

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sx + 16, p.y + 14, 6, 8);
        ctx.fillRect(sx + 17, p.y + 12, 4, 3);

        ctx.fillStyle = '#DEB887';
        ctx.fillRect(sx + 4, p.y + 4, 12, 10);

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx + 3, p.y + 2, 14, 5);

        ctx.fillStyle = '#A0522D';
        ctx.fillRect(sx + 1, p.y + 1, 18, 4);
        ctx.fillRect(sx + 4, p.y - 2, 12, 4);

        ctx.fillStyle = '#111';
        const eyeX = p.facing > 0 ? sx + 12 : sx + 5;
        ctx.fillRect(eyeX, p.y + 7, 3, 3);
        ctx.fillRect(eyeX + 5, p.y + 7, 3, 3);

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx + 10, p.y + 11, 2, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#FF6347';
        ctx.fillRect(sx + 8, p.y + 10, 4, 1);

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sx - 2, p.y + 8, 4, 10);
        ctx.fillRect(sx - 4, p.y + 8, 6, 3);

        if (this.shieldActive) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
            ctx.beginPath();
            ctx.arc(sx + 10, p.y + 16, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.powerType === 'speed' && this.powerTimer > 0) {
            ctx.fillStyle = 'rgba(0,255,255,0.3)';
            ctx.fillRect(sx - 10, p.y + 5, 8, 20);
        }
    }

    drawParticles() {
        for (const p of this.particles) p.draw();
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawSky();
        this.drawDunes();
        this.drawPyramids();
        this.drawCacti();
        this.drawQuicksand();
        this.drawPlatforms();
        this.drawGems();
        this.drawPowerups();
        this.drawFlag();
        this.drawEnemies();
        this.drawPlayer();
        this.drawParticles();
    }

    loop() {
        if (this.state === 'playing') {
            this.time++;
            this.updatePlayer();
            this.updateEnemies();
            this.updateMovingPlatforms();
            this.updateParticles();
            this.updateCamera();
            this.updateHUD();
            this.draw();
        }
        requestAnimationFrame(() => this.loop());
    }

    menuLoop() {
        if (this.state === 'menu') {
            const t = Date.now() / 1000;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#87CEEB');
            grad.addColorStop(1, '#FDB813');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#E8C872';
            ctx.beginPath();
            ctx.moveTo(0, 400);
            ctx.quadraticCurveTo(240, 340, 480, 400);
            ctx.quadraticCurveTo(720, 460, 960, 380);
            ctx.lineTo(960, 540);
            ctx.lineTo(0, 540);
            ctx.fill();
            this.drawPyramid(400, 180, 200, 220, '#C4A035');
            this.drawPyramid(600, 230, 120, 170, '#B8942A');
            this.drawCacti();
        }
        requestAnimationFrame(() => this.menuLoop());
    }
}

const game = new Game();
