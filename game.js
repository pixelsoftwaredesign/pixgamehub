const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 540;

const GRAVITY = 0.65;
const GROUND_Y = 440;
const ARENA_LEFT = 30;
const ARENA_RIGHT = 930;
const LOBBY_W = 1800;
const LOBBY_H = 540;
const LOBBY_GROUND = 440;

let gameState = 'menu';
let keys = {};
let frameCount = 0;
let screenShake = 0;
let hitStop = 0;
let roundTimer = 99;
let timerInterval = null;
let currentRound = 1;
let maxRounds = 3;
let wins = [0, 0];
let timeSlow = 0;
let lobbyTimer = 15;
let lobbyInterval = null;
let currentMap = null;
let lobbyPlayers = [];

const MAPS = [
    { name: "Village Konoha", desc: "Rues du village caché de la feuille", bg1: '#0a1a2a', bg2: '#1a3050', ground: '#4a3020', accent: '#ff6600', platforms: [
        { x: 200, y: 350, w: 120, h: 18 }, { x: 420, y: 290, w: 100, h: 18 },
        { x: 600, y: 340, w: 130, h: 18 }, { x: 800, y: 280, w: 100, h: 18 }
    ]},
    { name: "Baratie", desc: "Bateau pirate du Grand Line", bg1: '#001a33', bg2: '#003366', ground: '#5a4020', accent: '#4488ff', platforms: [
        { x: 150, y: 360, w: 110, h: 18 }, { x: 380, y: 300, w: 90, h: 18 },
        { x: 550, y: 350, w: 140, h: 18 }, { x: 770, y: 290, w: 110, h: 18 }
    ]},
    { name: "Arène Chūnin", desc: "Le tournoi des ninja", bg1: '#1a0a0a', bg2: '#3a1a1a', ground: '#3a3a2a', accent: '#ff4444', platforms: [
        { x: 180, y: 340, w: 100, h: 18 }, { x: 400, y: 270, w: 120, h: 18 },
        { x: 620, y: 330, w: 100, h: 18 }, { x: 820, y: 260, w: 110, h: 18 }
    ]},
    { name: "Forêt de Water Seven", desc: "Canaux de la ville de l'eau", bg1: '#0a2a1a', bg2: '#1a4a2a', ground: '#3a4a2a', accent: '#44cc44', platforms: [
        { x: 160, y: 370, w: 130, h: 18 }, { x: 390, y: 310, w: 90, h: 18 },
        { x: 580, y: 360, w: 110, h: 18 }, { x: 780, y: 300, w: 120, h: 18 }
    ]},
    { name: "Montagne Myōboku", desc: "Le royaume des crapauds", bg1: '#1a1a0a', bg2: '#3a3a1a', ground: '#4a4a20', accent: '#ffaa00', platforms: [
        { x: 220, y: 330, w: 100, h: 18 }, { x: 440, y: 260, w: 130, h: 18 },
        { x: 650, y: 320, w: 100, h: 18 }, { x: 850, y: 250, w: 120, h: 18 }
    ]},
    { name: "Thriller Bark", desc: "Le vaisseau fantôme", bg1: '#0a0a1a', bg2: '#1a1a3a', ground: '#2a2a3a', accent: '#aa44ff', platforms: [
        { x: 170, y: 350, w: 120, h: 18 }, { x: 410, y: 280, w: 100, h: 18 },
        { x: 600, y: 340, w: 110, h: 18 }, { x: 810, y: 270, w: 130, h: 18 }
    ]},
];

const SoundFX = {
    ctx: null,
    init() { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(type) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const t = this.ctx.currentTime;
        switch (type) {
            case 'punch':
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(250, t);
                osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
                gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t); osc.stop(t + 0.1); break;
            case 'rasengan':
                osc.type = 'sine'; osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
                gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t); osc.stop(t + 0.5); break;
            case 'sword':
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(2000, t + 0.05);
                osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
                gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                osc.start(t); osc.stop(t + 0.18); break;
            case 'santoryu':
                osc.type = 'square'; osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
                gain.gain.setValueAtTime(0.18, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                osc.start(t); osc.stop(t + 0.45); break;
            case 'block':
                osc.type = 'triangle'; osc.frequency.setValueAtTime(400, t);
                gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                osc.start(t); osc.stop(t + 0.06); break;
            case 'ko':
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
                gain.gain.setValueAtTime(0.25, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
                osc.start(t); osc.stop(t + 0.9); break;
            case 'round':
                osc.type = 'sine'; [523, 659, 784].forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.15));
                gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t); osc.stop(t + 0.5); break;
            case 'fight':
                osc.type = 'square'; osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
                gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                osc.start(t); osc.stop(t + 0.15); break;
            case 'dash':
                osc.type = 'sine'; osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
                gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t); osc.stop(t + 0.1); break;
            case 'teleport':
                osc.type = 'sine'; osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);
                gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
                osc.start(t); osc.stop(t + 0.7); break;
            case 'lobby_tick':
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, t);
                gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                osc.start(t); osc.stop(t + 0.05); break;
        }
    }
};

let particles = [];
let hitSparks = [];
let slashEffects = [];
let auraEffects = [];
let comboDisplay = [{ count: 0, timer: 0 }, { count: 0, timer: 0 }];

function spawnParticles(x, y, color, count, speed, size, life) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * (speed || 4);
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
            life: (life || 20) + Math.random() * 15, color,
            size: size || (2 + Math.random() * 3), gravity: 0.1 });
    }
}

function spawnHitSpark(x, y, type) { hitSparks.push({ x, y, type, life: 12, maxLife: 12, rotation: Math.random() * Math.PI * 2 }); }
function spawnSlash(x, y, dir, type) { slashEffects.push({ x, y, dir, type, life: 15, maxLife: 15 }); }
function spawnAura(x, y, color, size) { auraEffects.push({ x, y, color, size, life: 20, maxLife: 20 }); }
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

// ========== DRAW CHARACTERS ==========
function drawNaruto(p, px, py, f) {
    ctx.save();
    ctx.translate(px + p.w / 2, py + p.h / 2);
    ctx.scale(f, 1);
    const runCycle = Math.sin(p.walkFrame * 0.8);
    const isRunning = p.onGround && Math.abs(p.vx) > 0.5;
    const isAttacking = p.attacking;
    const atkPhase = p.attackFrame / Math.max(1, p.attackDuration);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, p.h / 2 - 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (p.energy >= p.maxEnergy) {
        const as = 35 + Math.sin(frameCount * 0.15) * 8;
        const gr = ctx.createRadialGradient(0, 0, 5, 0, 0, as);
        gr.addColorStop(0, 'rgba(255,136,0,0.3)'); gr.addColorStop(1, 'rgba(255,68,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, as, 0, Math.PI * 2); ctx.fill();
    }

    if (p.blocking) {
        ctx.strokeStyle = 'rgba(255,200,0,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(4, 0, 30, -1, 1); ctx.stroke();
    }

    // Legs
    ctx.fillStyle = '#cc5500';
    if (isRunning) {
        ctx.save(); ctx.translate(-4, p.h / 2 - 16); ctx.rotate(runCycle * 0.6);
        ctx.fillRect(-4, 0, 8, 16); ctx.restore();
        ctx.save(); ctx.translate(4, p.h / 2 - 16); ctx.rotate(-runCycle * 0.6);
        ctx.fillRect(-4, 0, 8, 16); ctx.restore();
    } else {
        ctx.fillRect(-8, p.h / 2 - 16, 8, 16);
        ctx.fillRect(1, p.h / 2 - 16, 8, 16);
    }

    ctx.fillStyle = '#333';
    if (isRunning) {
        ctx.save(); ctx.translate(-4, p.h / 2 - 1); ctx.rotate(runCycle * 0.6);
        ctx.fillRect(-5, 0, 10, 4); ctx.restore();
        ctx.save(); ctx.translate(4, p.h / 2 - 1); ctx.rotate(-runCycle * 0.6);
        ctx.fillRect(-5, 0, 10, 4); ctx.restore();
    } else {
        ctx.fillRect(-9, p.h / 2 - 2, 10, 4); ctx.fillRect(0, p.h / 2 - 2, 10, 4);
    }

    // Body
    ctx.fillStyle = '#ff6600'; ctx.fillRect(-11, -p.h / 2 + 12, 22, 28);
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -p.h / 2 + 12, 12, 5);
    ctx.fillStyle = '#cc4400'; ctx.fillRect(-1, -p.h / 2 + 17, 2, 20);

    // Arms
    ctx.fillStyle = '#ff6600';
    if (isAttacking && (p.attackType === 'punch' || p.attackType === 'special1')) {
        const ext = Math.sin(atkPhase * Math.PI) * 18;
        ctx.fillRect(8, -p.h / 2 + 18, 8 + ext, 6);
        ctx.fillStyle = '#f0c890'; ctx.fillRect(14 + ext, -p.h / 2 + 17, 8, 8);
        ctx.fillStyle = '#ff6600'; ctx.fillRect(-16, -p.h / 2 + 18, 8, 6);
    } else if (isAttacking && p.attackType === 'special2') {
        const ext = Math.sin(atkPhase * Math.PI) * 22;
        ctx.fillRect(8, -p.h / 2 + 16, 8 + ext, 6);
        ctx.fillRect(8, -p.h / 2 + 24, 8 + ext, 6);
        ctx.fillStyle = '#f0c890';
        ctx.fillRect(14 + ext, -p.h / 2 + 15, 8, 8);
        ctx.fillRect(14 + ext, -p.h / 2 + 23, 8, 8);
    } else {
        const sw = isRunning ? runCycle * 0.4 : Math.sin(frameCount * 0.04) * 0.1;
        ctx.save(); ctx.translate(-12, -p.h / 2 + 16); ctx.rotate(sw);
        ctx.fillRect(-4, 0, 8, 16); ctx.fillStyle = '#f0c890'; ctx.fillRect(-3, 14, 7, 6); ctx.restore();
        ctx.save(); ctx.translate(12, -p.h / 2 + 16); ctx.rotate(-sw);
        ctx.fillStyle = '#ff6600'; ctx.fillRect(-4, 0, 8, 16); ctx.fillStyle = '#f0c890'; ctx.fillRect(-3, 14, 7, 6); ctx.restore();
    }

    // Rasengan
    if (isAttacking && p.attackType === 'special1' && atkPhase > 0.2) {
        const rx = 22 + Math.sin(atkPhase * Math.PI) * 15;
        const rr = 10 + Math.sin(frameCount * 0.3) * 3;
        const rg = ctx.createRadialGradient(rx, -p.h / 2 + 22, 0, rx, -p.h / 2 + 22, rr);
        rg.addColorStop(0, 'rgba(100,200,255,0.9)'); rg.addColorStop(1, 'rgba(0,100,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(rx, -p.h / 2 + 22, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 20; i++) { const a = i * 0.5 + frameCount * 0.2; ctx.lineTo(rx + Math.cos(a) * i * 0.5, -p.h / 2 + 22 + Math.sin(a) * i * 0.5); }
        ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#f0c890'; ctx.fillRect(-9, -p.h / 2, 18, 14);

    // Hair
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-10, -p.h / 2 - 2); ctx.lineTo(-14, -p.h / 2 - 10); ctx.lineTo(-8, -p.h / 2 - 3);
    ctx.lineTo(-6, -p.h / 2 - 14); ctx.lineTo(-2, -p.h / 2 - 4); ctx.lineTo(2, -p.h / 2 - 15);
    ctx.lineTo(5, -p.h / 2 - 3); ctx.lineTo(9, -p.h / 2 - 12); ctx.lineTo(10, -p.h / 2 - 2); ctx.fill();

    // Headband
    ctx.fillStyle = '#335'; ctx.fillRect(-11, -p.h / 2 + 2, 22, 5);
    ctx.fillStyle = '#aab'; ctx.fillRect(-7, -p.h / 2 + 2, 14, 5);
    ctx.fillStyle = '#335'; ctx.fillRect(-11, -p.h / 2 + 2, 4, 14 + Math.sin(frameCount * 0.1) * 3);

    // Eyes
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -p.h / 2 + 5, 5, 5); ctx.fillRect(1, -p.h / 2 + 5, 5, 5);
    ctx.fillStyle = '#4488ff'; ctx.fillRect(-4, -p.h / 2 + 6, 3, 3); ctx.fillRect(3, -p.h / 2 + 6, 3, 3);
    ctx.fillStyle = '#111'; ctx.fillRect(-3, -p.h / 2 + 7, 2, 2); ctx.fillRect(4, -p.h / 2 + 7, 2, 2);

    // Whiskers
    ctx.strokeStyle = '#cc8866'; ctx.lineWidth = 1;
    [-3, -5, -7].forEach(dy => {
        ctx.beginPath(); ctx.moveTo(-9, -p.h / 2 + 10 + dy * 0.3); ctx.lineTo(-13, -p.h / 2 + 11 + dy * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, -p.h / 2 + 10 + dy * 0.3); ctx.lineTo(13, -p.h / 2 + 11 + dy * 0.3); ctx.stroke();
    });

    // Mouth
    if (isAttacking) { ctx.fillStyle = '#aa4444'; ctx.fillRect(-3, -p.h / 2 + 12, 6, 3); }
    else { ctx.fillStyle = '#cc8866'; ctx.fillRect(-2, -p.h / 2 + 12, 4, 1); }

    ctx.restore();
}

function drawZoro(p, px, py, f) {
    ctx.save();
    ctx.translate(px + p.w / 2, py + p.h / 2);
    ctx.scale(f, 1);
    const runCycle = Math.sin(p.walkFrame * 0.8);
    const isRunning = p.onGround && Math.abs(p.vx) > 0.5;
    const isAttacking = p.attacking;
    const atkPhase = p.attackFrame / Math.max(1, p.attackDuration);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, p.h / 2 - 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (p.energy >= p.maxEnergy) {
        const as = 35 + Math.sin(frameCount * 0.15) * 8;
        const gr = ctx.createRadialGradient(0, 0, 5, 0, 0, as);
        gr.addColorStop(0, 'rgba(68,204,68,0.3)'); gr.addColorStop(1, 'rgba(0,100,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, as, 0, Math.PI * 2); ctx.fill();
    }

    if (p.blocking) {
        ctx.strokeStyle = 'rgba(180,180,200,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(4, -5, 28, -0.8, 0.8); ctx.stroke();
    }

    // Legs
    ctx.fillStyle = '#228833';
    if (isRunning) {
        ctx.save(); ctx.translate(-4, p.h / 2 - 16); ctx.rotate(runCycle * 0.6);
        ctx.fillRect(-4, 0, 8, 16); ctx.restore();
        ctx.save(); ctx.translate(4, p.h / 2 - 16); ctx.rotate(-runCycle * 0.6);
        ctx.fillRect(-4, 0, 8, 16); ctx.restore();
    } else {
        ctx.fillRect(-8, p.h / 2 - 16, 8, 16); ctx.fillRect(1, p.h / 2 - 16, 8, 16);
    }

    ctx.fillStyle = '#553322';
    if (isRunning) {
        ctx.save(); ctx.translate(-4, p.h / 2 - 1); ctx.rotate(runCycle * 0.6);
        ctx.fillRect(-5, 0, 10, 4); ctx.restore();
        ctx.save(); ctx.translate(4, p.h / 2 - 1); ctx.rotate(-runCycle * 0.6);
        ctx.fillRect(-5, 0, 10, 4); ctx.restore();
    } else {
        ctx.fillRect(-9, p.h / 2 - 2, 10, 4); ctx.fillRect(0, p.h / 2 - 2, 10, 4);
    }

    // Body
    ctx.fillStyle = '#eee'; ctx.fillRect(-11, -p.h / 2 + 12, 22, 28);
    ctx.fillStyle = '#22aa44'; ctx.fillRect(-11, -p.h / 2 + 24, 22, 10);
    ctx.fillStyle = '#e0b080'; ctx.fillRect(-5, -p.h / 2 + 14, 4, 6); ctx.fillRect(1, -p.h / 2 + 14, 4, 6);

    // Arms
    ctx.fillStyle = '#e0b080';
    if (isAttacking) {
        const ext = Math.sin(atkPhase * Math.PI) * 20;
        if (p.attackType === 'punch') {
            ctx.fillRect(8, -p.h / 2 + 16, 10, 6);
            ctx.fillStyle = '#ddd'; ctx.fillRect(16 + ext * 0.5, -p.h / 2 + 14, 2, 30);
            ctx.fillStyle = '#8a6a30'; ctx.fillRect(14, -p.h / 2 + 16, 6, 4);
        } else if (p.attackType === 'special1') {
            ctx.fillRect(8, -p.h / 2 + 14, 8, 6); ctx.fillRect(8, -p.h / 2 + 22, 8, 6);
            ctx.fillStyle = '#ddd';
            ctx.fillRect(14 + ext * 0.5, -p.h / 2 + 10, 2, 35);
            ctx.fillRect(14 + ext * 0.5, -p.h / 2 + 18, 2, 35);
            ctx.fillRect(-2, -p.h / 2 + 11, 20, 2);
        } else {
            ctx.fillRect(8, -p.h / 2 + 16, 10, 6);
            ctx.fillStyle = '#ddd'; ctx.fillRect(14, -p.h / 2 + 16 + ext, 2, 28);
            ctx.fillStyle = '#8a6a30'; ctx.fillRect(12, -p.h / 2 + 14, 6, 4);
        }
    } else {
        const sw = isRunning ? runCycle * 0.4 : Math.sin(frameCount * 0.04) * 0.1;
        ctx.save(); ctx.translate(12, -p.h / 2 + 16); ctx.rotate(-sw - 0.2);
        ctx.fillRect(-3, 0, 7, 14); ctx.fillStyle = '#ddd'; ctx.fillRect(2, -8, 2, 30);
        ctx.fillStyle = '#8a6a30'; ctx.fillRect(0, 10, 6, 4); ctx.restore();
        ctx.save(); ctx.translate(-12, -p.h / 2 + 16); ctx.rotate(sw);
        ctx.fillStyle = '#e0b080'; ctx.fillRect(-4, 0, 7, 14); ctx.restore();
    }

    // Head
    ctx.fillStyle = '#e0b080'; ctx.fillRect(-9, -p.h / 2, 18, 14);
    ctx.fillStyle = '#22aa33';
    ctx.beginPath();
    ctx.moveTo(-10, -p.h / 2 - 2); ctx.lineTo(-12, -p.h / 2 - 8); ctx.lineTo(-6, -p.h / 2 - 3);
    ctx.lineTo(-4, -p.h / 2 - 10); ctx.lineTo(0, -p.h / 2 - 4); ctx.lineTo(3, -p.h / 2 - 9);
    ctx.lineTo(6, -p.h / 2 - 3); ctx.lineTo(10, -p.h / 2 - 2); ctx.fill();

    ctx.fillStyle = '#ddd'; ctx.fillRect(-10, -p.h / 2 + 4, 20, 4);
    ctx.fillStyle = '#228833'; ctx.fillRect(-10, -p.h / 2 + 3, 12, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(1, -p.h / 2 + 5, 5, 4);
    ctx.fillStyle = '#22aa33'; ctx.fillRect(3, -p.h / 2 + 6, 3, 3);
    ctx.fillStyle = '#111'; ctx.fillRect(4, -p.h / 2 + 7, 2, 2);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(-10, -p.h / 2 + 6, 3, 5);

    if (isAttacking) { ctx.fillStyle = '#aa4444'; ctx.fillRect(-3, -p.h / 2 + 12, 6, 2); }
    else { ctx.fillStyle = '#cc8866'; ctx.fillRect(-2, -p.h / 2 + 12, 4, 1); }

    ctx.restore();
}

// ========== LOBBY CHARACTERS (smaller, walking) ==========
function drawLobbyChar(x, y, type, walkFrame, facing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    const rf = Math.sin(walkFrame * 0.1) * 0.3;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 28, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

    if (type === 'naruto') {
        ctx.fillStyle = '#cc5500';
        ctx.save(); ctx.rotate(rf); ctx.fillRect(-5, 10, 5, 14); ctx.restore();
        ctx.save(); ctx.rotate(-rf); ctx.fillRect(1, 10, 5, 14); ctx.restore();
        ctx.fillStyle = '#ff6600'; ctx.fillRect(-8, -8, 16, 20);
        ctx.fillStyle = '#fff'; ctx.fillRect(-4, -8, 8, 4);
        ctx.fillStyle = '#f0c890'; ctx.fillRect(-6, -16, 12, 10);
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-7, -18); ctx.lineTo(-10, -24); ctx.lineTo(-4, -19); ctx.lineTo(-2, -26);
        ctx.lineTo(1, -19); ctx.lineTo(4, -25); ctx.lineTo(6, -18); ctx.lineTo(7, -18); ctx.fill();
        ctx.fillStyle = '#335'; ctx.fillRect(-8, -14, 16, 3);
        ctx.fillStyle = '#4488ff'; ctx.fillRect(-4, -13, 2, 2); ctx.fillRect(1, -13, 2, 2);
    } else {
        ctx.fillStyle = '#228833';
        ctx.save(); ctx.rotate(rf); ctx.fillRect(-5, 10, 5, 14); ctx.restore();
        ctx.save(); ctx.rotate(-rf); ctx.fillRect(1, 10, 5, 14); ctx.restore();
        ctx.fillStyle = '#eee'; ctx.fillRect(-8, -8, 16, 20);
        ctx.fillStyle = '#22aa44'; ctx.fillRect(-8, 2, 16, 6);
        ctx.fillStyle = '#e0b080'; ctx.fillRect(-6, -16, 12, 10);
        ctx.fillStyle = '#22aa33';
        ctx.beginPath();
        ctx.moveTo(-7, -18); ctx.lineTo(-8, -22); ctx.lineTo(-3, -19);
        ctx.lineTo(-1, -24); ctx.lineTo(2, -19); ctx.lineTo(5, -21); ctx.lineTo(7, -18); ctx.fill();
        ctx.fillStyle = '#228833'; ctx.fillRect(-7, -14, 8, 3);
        ctx.fillStyle = '#fff'; ctx.fillRect(1, -13, 3, 2);
        ctx.fillStyle = '#22aa33'; ctx.fillRect(2, -12, 2, 2);
    }

    ctx.restore();
}

// ========== LOBBY MAP ==========
function drawLobbyMap() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0a2e'); grad.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + 50) % canvas.width;
        const sy = (i * 97 + 10) % (canvas.height * 0.5);
        const tw = Math.sin(frameCount * 0.03 + i) * 0.3 + 0.7;
        ctx.globalAlpha = tw * 0.5;
        ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
    }
    ctx.globalAlpha = 1;

    // Torii gate in center
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(460, 180, 12, 260); ctx.fillRect(488, 180, 12, 260);
    ctx.fillRect(450, 180, 60, 12); ctx.fillRect(455, 200, 50, 6);

    // Cherry blossom trees
    for (const tx of [80, 200, 350, 600, 750, 880]) {
        ctx.fillStyle = '#3a2a10'; ctx.fillRect(tx - 3, 340, 6, 100);
        ctx.fillStyle = 'rgba(255,150,170,0.3)';
        ctx.beginPath(); ctx.arc(tx, 320, 30, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 4; i++) {
            const px = tx + Math.sin(frameCount * 0.015 + i * 1.5) * 25;
            const py = ((frameCount * 0.4 + i * 80) % 200) + 280;
            ctx.fillStyle = 'rgba(255,150,170,0.4)'; ctx.fillRect(px, py, 3, 2);
        }
    }

    // Ground
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, LOBBY_GROUND + 70, canvas.width, 100);
    const sg = ctx.createLinearGradient(0, LOBBY_GROUND + 66, 0, LOBBY_GROUND + 74);
    sg.addColorStop(0, '#6a5030'); sg.addColorStop(1, '#4a3020');
    ctx.fillStyle = sg; ctx.fillRect(20, LOBBY_GROUND + 66, canvas.width - 40, 8);

    // Floor lanterns
    for (let i = 0; i < 6; i++) {
        const lx = 80 + i * 170;
        ctx.fillStyle = '#880000'; ctx.fillRect(lx - 2, LOBBY_GROUND + 40, 4, 20);
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(lx, LOBBY_GROUND + 38, 8 + Math.sin(frameCount * 0.05 + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Platforms in lobby
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(150, 360, 120, 12);
    ctx.fillRect(400, 320, 120, 12);
    ctx.fillRect(650, 350, 120, 12);

    // Draw NPC players walking around
    for (const np of lobbyPlayers) {
        drawLobbyChar(np.x - camera.x, np.y, np.type, np.walkFrame, np.facing);
    }

    // Draw player
    if (players.length === 1) {
        const p = players[0];
        drawLobbyChar(p.x - camera.x, p.y, p.type, p.walkFrame, p.facing);
    }
}

// ========== PLAYER ==========
function createPlayer(index, x) {
    const isNaruto = index === 0;
    return {
        x, y: GROUND_Y, w: 28, h: 70,
        vx: 0, vy: 0, hp: 100, maxHp: 100, energy: 0, maxEnergy: 100,
        facing: 1, onGround: true, speed: isNaruto ? 4.8 : 4.5,
        jumpPower: isNaruto ? -14 : -13, attacking: false, attackType: null,
        attackFrame: 0, attackDuration: 0, attackingHit: false,
        hitstun: 0, blockstun: 0, blocking: false, dashing: false,
        dashTimer: 0, dashCooldown: 0, walkFrame: 0, walkTimer: 0,
        invincible: 0, combo: 0, lastHitTime: 0, pushback: 0,
        index, type: isNaruto ? 'naruto' : 'zoro',
        punchDmg: isNaruto ? 8 : 10, special1Dmg: isNaruto ? 25 : 20, special2Dmg: isNaruto ? 35 : 30,
    };
}

let players = [];
let camera = { x: 0, y: 0 };

function canAttack(p) { return !p.attacking && p.hitstun <= 0 && p.blockstun <= 0; }

function startAttack(p, type) {
    if (!canAttack(p)) return;
    p.attacking = true; p.attackType = type; p.attackFrame = 0; p.attackingHit = false;
    p.attackDuration = type === 'punch' ? 14 : (type === 'special1' ? 25 : 35);
}

function getAttackHitbox(p) {
    const range = p.attackType === 'special1' ? 65 : (p.attackType === 'special2' ? 80 : 45);
    return { x: p.facing === 1 ? p.x + p.w : p.x - range, y: p.y, w: range, h: p.h };
}

function getDamage(p) {
    let dmg = p.attackType === 'punch' ? p.punchDmg : (p.attackType === 'special1' ? p.special1Dmg : p.special2Dmg);
    if (frameCount - p.lastHitTime < 30) { p.combo++; dmg = Math.floor(dmg * (1 + p.combo * 0.12)); }
    else p.combo = 0;
    p.lastHitTime = frameCount;
    if (p.energy >= p.maxEnergy) { dmg = Math.floor(dmg * 1.5); p.energy = 0; }
    return dmg;
}

function applyHit(attacker, defender, dmg) {
    const pushForce = attacker.attackType === 'special2' ? 10 : (attacker.attackType === 'special1' ? 7 : 4);
    defender.hp -= dmg;
    defender.hitstun = attacker.attackType === 'special2' ? 22 : (attacker.attackType === 'special1' ? 16 : 10);
    defender.pushback = pushForce * attacker.facing;
    defender.vx = pushForce * attacker.facing * 0.4;
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + dmg * 0.6);
    comboDisplay[attacker.index].count++;
    comboDisplay[attacker.index].timer = 60;

    const hx = (attacker.x + attacker.w / 2 + defender.x + defender.w / 2) / 2;
    const hy = defender.y + defender.h / 3;
    const pc = attacker.type === 'naruto' ? '#4488ff' : '#ccffcc';

    spawnParticles(hx, hy, pc, attacker.attackType === 'special2' ? 25 : 12, 5, 4);
    if (attacker.attackType !== 'punch') spawnAura(hx, hy, attacker.type === 'naruto' ? 'rgba(50,150,255,0.6)' : 'rgba(68,255,68,0.5)', 35);
    if (attacker.type === 'zoro') spawnSlash(hx, hy, attacker.facing, attacker.attackType);
    spawnHitSpark(hx, hy, attacker.attackType);

    screenShake = dmg >= 20 ? 15 : (dmg >= 12 ? 8 : 4);
    if (dmg >= 20) timeSlow = 8;
    hitStop = attacker.attackType === 'special2' ? 8 : (attacker.attackType === 'special1' ? 5 : 3);
    SoundFX.play(attacker.type === 'zoro' ? (attacker.attackType === 'special1' ? 'santoryu' : 'sword') : (attacker.attackType === 'special1' ? 'rasengan' : 'punch'));

    if (defender.hp <= 0) { defender.hp = 0; hitStop = 18; screenShake = 25; timeSlow = 20; SoundFX.play('ko'); }
}

function updateFighter(p, upKey, leftKey, rightKey, punchKey, s1Key, s2Key, downKey) {
    const other = players[1 - p.index];
    if (p.hitstun > 0) { p.hitstun--; p.vx *= 0.9; }
    if (p.blockstun > 0) p.blockstun--;
    if (p.invincible > 0) p.invincible--;
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.hp <= 0) return;

    if (!p.attacking && p.hitstun <= 0) p.facing = other.x > p.x ? 1 : -1;

    if (p.hitstun <= 0 && p.blockstun <= 0 && !p.dashing) {
        if (keys[leftKey]) {
            p.vx -= p.speed * 0.45;
            if (p.onGround) { p.walkTimer++; if (p.walkTimer > 4) { p.walkTimer = 0; p.walkFrame = (p.walkFrame + 1) % 8; } }
            if (p.onGround && frameCount % 4 === 0) spawnParticles(p.x + p.w / 2, p.y + p.h, '#c8a870', 2, 1.5, 2, 12);
        }
        if (keys[rightKey]) {
            p.vx += p.speed * 0.45;
            if (p.onGround) { p.walkTimer++; if (p.walkTimer > 4) { p.walkTimer = 0; p.walkFrame = (p.walkFrame + 1) % 8; } }
            if (p.onGround && frameCount % 4 === 0) spawnParticles(p.x + p.w / 2, p.y + p.h, '#c8a870', 2, 1.5, 2, 12);
        }
    }

    if (keys[upKey] && p.onGround && p.hitstun <= 0 && !p.attacking) {
        p.vy = p.jumpPower; p.onGround = false;
        spawnParticles(p.x + p.w / 2, p.y + p.h, '#aaa', 6, 2, 3, 10);
    }
    if (!p.onGround && frameCount % 6 === 0) spawnParticles(p.x + p.w / 2, p.y + p.h, 'rgba(200,200,200,0.4)', 1, 1, 2, 8);

    p.blocking = keys[downKey] && p.onGround && p.hitstun <= 0 && !p.attacking;

    if (keys[downKey] && p.onGround && p.dashCooldown <= 0 && p.hitstun <= 0 && !p.blocking) {
        p.dashing = true; p.dashTimer = 8; p.dashCooldown = 25; p.invincible = 8; p.vx = p.facing * 14;
        for (let i = 0; i < 5; i++) spawnParticles(p.x + p.w / 2, p.y + p.h / 2, p.type === 'naruto' ? '#ff8800' : '#44ff44', 2, 3, 3, 10);
        SoundFX.play('dash');
    }
    if (p.dashing) { p.dashTimer--; if (p.dashTimer <= 0) p.dashing = false; }

    if (keys[punchKey] && !p._pkHeld) { startAttack(p, 'punch'); p._pkHeld = true; }
    if (keys[s1Key] && !p._s1Held) { startAttack(p, 'special1'); p._s1Held = true; }
    if (keys[s2Key] && !p._s2Held) { startAttack(p, 'special2'); p._s2Held = true; }
    if (!keys[punchKey]) p._pkHeld = false;
    if (!keys[s1Key]) p._s1Held = false;
    if (!keys[s2Key]) p._s2Held = false;

    p.vx *= 0.8; p.vy += GRAVITY; if (p.vy > 14) p.vy = 14;

    if (p.pushback !== 0) { p.vx += p.pushback; p.pushback *= 0.8; if (Math.abs(p.pushback) < 0.1) p.pushback = 0; }

    p.x += p.vx; p.y += p.vy;
    if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
    if (p.x < ARENA_LEFT) { p.x = ARENA_LEFT; p.vx = 0; }
    if (p.x + p.w > ARENA_RIGHT) { p.x = ARENA_RIGHT - p.w; p.vx = 0; }

    // Platform collision
    if (currentMap && currentMap.platforms) {
        for (const plat of currentMap.platforms) {
            if (p.vy > 0 && p.x + p.w > plat.x && p.x < plat.x + plat.w &&
                p.y + p.h >= plat.y && p.y + p.h - p.vy <= plat.y + 8) {
                p.y = plat.y - p.h; p.vy = 0; p.onGround = true;
            }
        }
    }

    if (rectOverlap(p, other)) {
        const ov = (p.x + p.w / 2) - (other.x + other.w / 2);
        p.x += ov > 0 ? 2 : -2; other.x -= ov > 0 ? 2 : -2;
    }

    if (p.attacking) {
        p.attackFrame++;
        if (p.attackFrame === Math.floor(p.attackDuration * 0.35) && !p.attackingHit) {
            const hb = { x: p.facing === 1 ? p.x + p.w : p.x - (p.attackType === 'special1' ? 65 : (p.attackType === 'special2' ? 80 : 45)),
                y: p.y, w: p.attackType === 'special1' ? 65 : (p.attackType === 'special2' ? 80 : 45), h: p.h };
            if (rectOverlap(hb, other) && other.invincible <= 0) {
                if (other.blocking) {
                    SoundFX.play('block'); other.blockstun = 10; other.pushback = p.facing * 4;
                    spawnParticles(other.x + other.w / 2, other.y + other.h / 3, '#8888ff', 6, 3, 2);
                    p.energy = Math.min(p.maxEnergy, p.energy + 5);
                } else {
                    applyHit(p, other, getDamage(p));
                }
                p.attackingHit = true;
            }
        }
        if (p.attackFrame >= p.attackDuration) { p.attacking = false; p.attackType = null; p.attackFrame = 0; p.attackingHit = false; }
    }

    if (!p.attacking && p.hp > 0) p.energy = Math.min(p.maxEnergy, p.energy + 0.15);
}

function rectOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += (p.gravity || 0.1); p.vx *= 0.96; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}
function updateHitSparks() { for (let i = hitSparks.length - 1; i >= 0; i--) { hitSparks[i].life--; if (hitSparks[i].life <= 0) hitSparks.splice(i, 1); } }
function updateSlashEffects() { for (let i = slashEffects.length - 1; i >= 0; i--) { slashEffects[i].life--; if (slashEffects[i].life <= 0) slashEffects.splice(i, 1); } }
function updateAuraEffects() { for (let i = auraEffects.length - 1; i >= 0; i--) { auraEffects[i].life--; if (auraEffects[i].life <= 0) auraEffects.splice(i, 1); } }

// ========== MAP DRAWING ==========
function drawMapBackground(map) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, map.bg1); grad.addColorStop(1, map.bg2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Moon
    ctx.fillStyle = 'rgba(255,255,200,0.1)';
    ctx.beginPath(); ctx.arc(800, 80, 50, 0, Math.PI * 2); ctx.fill();

    // Map-specific decorations
    if (map.name === "Village Konoha") {
        // Buildings
        ctx.fillStyle = 'rgba(60,40,20,0.2)';
        for (const bx of [50, 200, 400, 600, 750, 900]) {
            const bh = 80 + Math.sin(bx * 0.1) * 40;
            ctx.fillRect(bx, GROUND_Y - bh + 70, 50, bh);
            ctx.fillStyle = 'rgba(255,200,100,0.15)';
            for (let wy = GROUND_Y - bh + 80; wy < GROUND_Y + 60; wy += 18) {
                for (let wx = bx + 8; wx < bx + 45; wx += 16) ctx.fillRect(wx, wy, 8, 10);
            }
            ctx.fillStyle = 'rgba(60,40,20,0.2)';
        }
    } else if (map.name === "Baratie") {
        // Water waves
        ctx.strokeStyle = 'rgba(68,136,255,0.2)'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            for (let x = 0; x < canvas.width; x += 5) {
                ctx.lineTo(x, GROUND_Y + 80 + i * 8 + Math.sin(x * 0.02 + frameCount * 0.03 + i) * 5);
            }
            ctx.stroke();
        }
    } else if (map.name === "Arène Chūnin") {
        // Spectator stands
        ctx.fillStyle = 'rgba(80,60,40,0.2)';
        ctx.fillRect(0, GROUND_Y - 200, canvas.width, 80);
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = `rgba(${100 + i * 5},${80 + i * 3},${60 + i * 2},0.15)`;
            ctx.fillRect(i * 48, GROUND_Y - 180, 40, 12);
        }
    } else if (map.name === "Thriller Bark") {
        // Fog
        for (let i = 0; i < 8; i++) {
            const fx = (i * 150 + frameCount * 0.3) % (canvas.width + 200) - 100;
            ctx.fillStyle = 'rgba(100,80,120,0.05)';
            ctx.beginPath(); ctx.ellipse(fx, GROUND_Y + 20, 100, 30, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Platforms
    if (map.platforms) {
        for (const p of map.platforms) {
            ctx.fillStyle = map.ground;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(p.x, p.y, p.w, 3);
        }
    }

    // Ground
    ctx.fillStyle = map.ground; ctx.fillRect(0, GROUND_Y + 70, canvas.width, 100);
    const sg = ctx.createLinearGradient(0, GROUND_Y + 66, 0, GROUND_Y + 74);
    sg.addColorStop(0, map.accent + '40'); sg.addColorStop(1, map.ground);
    ctx.fillStyle = sg; ctx.fillRect(20, GROUND_Y + 66, canvas.width - 40, 8);
    ctx.strokeStyle = map.accent + '60'; ctx.lineWidth = 2;
    ctx.strokeRect(18, GROUND_Y + 64, canvas.width - 36, 12);
}

// ========== DRAW EFFECTS ==========
function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.min(1, p.life / 15);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawHitSparks() {
    for (const h of hitSparks) {
        const t = h.life / h.maxLife;
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rotation); ctx.globalAlpha = t;
        if (h.type === 'special2') {
            ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3 + frameCount * 0.1);
                ctx.fillRect(-2, -20 * t, 4, 20 * t); ctx.restore(); }
        } else if (h.type === 'special1') {
            ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 20 * (1 - t), 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const r = 15 * (1 - t);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.restore();
    }
}

function drawSlashEffects() {
    for (const s of slashEffects) {
        const t = s.life / s.maxLife; ctx.globalAlpha = t;
        ctx.strokeStyle = s.type === 'special1' ? '#44ff44' : '#ccffcc';
        ctx.lineWidth = s.type === 'special2' ? 4 : 3;
        ctx.beginPath();
        ctx.arc(s.x + s.dir * 10, s.y, 25 * (1 - t) + 10, -1 * s.dir, 1.5 * s.dir, s.dir < 0);
        ctx.stroke(); ctx.globalAlpha = 1;
    }
}

function drawAuraEffects() {
    for (const a of auraEffects) {
        const t = a.life / a.maxLife; ctx.globalAlpha = t * 0.6;
        const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.size * (1 - t * 0.3));
        gr.addColorStop(0, a.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawComboDisplay() {
    for (let i = 0; i < 2; i++) {
        const cd = comboDisplay[i];
        if (cd.count >= 2 && cd.timer > 0) {
            const x = i === 0 ? 150 : canvas.width - 150;
            ctx.save(); ctx.globalAlpha = cd.timer / 60;
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
            ctx.fillText(cd.count + ' HITS!', x, 130);
            ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff8844'; ctx.fillText('COMBO', x, 150);
            ctx.restore();
        }
    }
}

function drawHealthBars() {
    for (let i = 0; i < 2; i++) {
        const p = players[i];
        document.getElementById(`hp-bar-${i + 1}`).style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
        document.getElementById(`hp-bar-${i + 1}`).className = 'health-bar-inner' + (p.hp < 25 ? ' critical' : (p.hp < 50 ? ' low' : ''));
        document.getElementById(`energy-bar-${i + 1}`).style.width = (p.energy / p.maxEnergy * 100) + '%';
        document.getElementById(`energy-bar-${i + 1}`).className = 'energy-bar-inner' + (p.energy >= p.maxEnergy ? ' ready' : '');
        let ws = ''; for (let w = 0; w < wins[i]; w++) ws += '★ ';
        document.getElementById(`wins-p${i + 1}`).textContent = ws;
    }
}

// ========== LOBBY ==========
function createLobby() {
    lobbyPlayers = [];
    const types = ['naruto', 'zoro'];
    for (let i = 0; i < 12; i++) {
        lobbyPlayers.push({
            x: 100 + Math.random() * (LOBBY_W - 200),
            y: LOBBY_GROUND,
            type: types[Math.floor(Math.random() * 2)],
            walkFrame: Math.random() * 100,
            facing: Math.random() > 0.5 ? 1 : -1,
            vx: (Math.random() - 0.5) * 2,
        });
    }
}

function updateLobby() {
    for (const np of lobbyPlayers) {
        np.x += np.vx;
        np.walkFrame++;
        if (np.x < 50 || np.x > LOBBY_W - 50) np.vx *= -1;
        np.facing = np.vx > 0 ? 1 : -1;
        // Random direction change
        if (Math.random() < 0.01) np.vx = (Math.random() - 0.5) * 2.5;
    }
    // Player in lobby
    if (players.length === 1) {
        const p = players[0];
        p.vx = 0;
        if (keys['KeyA'] || keys['KeyQ']) { p.vx = -3; p.facing = -1; p.walkFrame++; }
        if (keys['KeyD']) { p.vx = 3; p.facing = 1; p.walkFrame++; }
        p.x += p.vx;
        if (p.x < 20) p.x = 20;
        if (p.x > LOBBY_W - 20) p.x = LOBBY_W - 20;
    }
    camera.x = Math.max(0, Math.min(LOBBY_W - canvas.width, (players[0] ? players[0].x : 480) - canvas.width / 2));
}

// ========== GAME FLOW ==========
function startLobby() {
    gameState = 'lobby';
    lobbyTimer = 15;
    currentMap = MAPS[Math.floor(Math.random() * MAPS.length)];
    players = [createPlayer(0, 480)];
    players[0].y = LOBBY_GROUND;
    camera.x = 0;
    particles = [];
    createLobby();

    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';

    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = setInterval(() => {
        if (gameState === 'lobby') {
            lobbyTimer--;
            document.getElementById('lobby-timer').textContent = `Prochaine manche: ${lobbyTimer}s`;
            if (lobbyTimer <= 5) SoundFX.play('lobby_tick');
            if (lobbyTimer <= 0) {
                clearInterval(lobbyInterval);
                teleportToMap();
            }
        }
    }, 1000);
}

function teleportToMap() {
    gameState = 'teleporting';
    SoundFX.play('teleport');
    // Flash effect
    spawnParticles(players[0].x, players[0].y, '#ff8800', 30, 8, 5, 20);

    setTimeout(() => {
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('map-reveal').style.display = 'flex';
        document.getElementById('map-reveal-name').textContent = currentMap.name;
        document.getElementById('map-reveal-name').style.color = currentMap.accent;
        document.getElementById('map-reveal-desc').textContent = currentMap.desc;

        setTimeout(() => {
            document.getElementById('map-reveal').style.display = 'none';
            currentRound = 1;
            wins = [0, 0];
            startRound();
        }, 2500);
    }, 800);
}

function startRound() {
    particles = []; hitSparks = []; slashEffects = []; auraEffects = [];
    comboDisplay = [{ count: 0, timer: 0 }, { count: 0, timer: 0 }];
    screenShake = 0; hitStop = 0; timeSlow = 0;
    players = [createPlayer(0, 250), createPlayer(1, 680)];
    roundTimer = 99;
    document.getElementById('timer-display').textContent = '99';
    document.getElementById('round-display').textContent = 'ROUND ' + currentRound;
    document.getElementById('hud').style.display = 'flex';

    const ann = document.getElementById('round-announce');
    ann.style.display = 'flex';
    document.getElementById('announce-text').textContent = 'ROUND ' + currentRound;
    document.getElementById('announce-sub').textContent = '';
    gameState = 'roundstart';
    SoundFX.play('round');

    setTimeout(() => { document.getElementById('announce-sub').textContent = 'FIGHT!'; SoundFX.play('fight'); }, 1000);
    setTimeout(() => {
        ann.style.display = 'none'; gameState = 'playing';
        timerInterval = setInterval(() => {
            if (gameState === 'playing') { roundTimer--; document.getElementById('timer-display').textContent = Math.max(0, roundTimer); }
        }, 1000);
    }, 1800);
}

function checkRoundEnd() {
    for (let i = 0; i < 2; i++) {
        if (players[i].hp <= 0) {
            const winner = 1 - i; wins[winner]++;
            gameState = 'roundend'; clearInterval(timerInterval);
            const koEl = document.getElementById('ko-screen');
            koEl.style.display = 'flex';
            document.getElementById('ko-text').textContent = 'K.O.!';
            document.getElementById('ko-winner').textContent = (winner === 0 ? 'NARUTO' : 'ZORO') + ' GAGNE!';
            setTimeout(() => {
                koEl.style.display = 'none';
                if (wins[winner] >= Math.ceil(maxRounds / 2) + 0.5 || currentRound >= maxRounds) showMatchEnd(winner);
                else { currentRound++; startRound(); }
            }, 2500);
            return;
        }
    }
    if (roundTimer <= 0) {
        gameState = 'roundend'; clearInterval(timerInterval);
        const winner = players[0].hp >= players[1].hp ? 0 : 1; wins[winner]++;
        const koEl = document.getElementById('ko-screen');
        koEl.style.display = 'flex';
        document.getElementById('ko-text').textContent = 'TIME!';
        document.getElementById('ko-winner').textContent = (winner === 0 ? 'NARUTO' : 'ZORO') + ' GAGNE!';
        setTimeout(() => {
            koEl.style.display = 'none';
            if (wins[winner] >= Math.ceil(maxRounds / 2) + 0.5 || currentRound >= maxRounds) showMatchEnd(winner);
            else { currentRound++; startRound(); }
        }, 2500);
    }
}

function showMatchEnd(winner) {
    gameState = 'matchend';
    document.getElementById('gameover-screen').style.display = 'flex';
    document.getElementById('winner-title').textContent = 'VICTOIRE!';
    document.getElementById('winner-name').textContent = (winner === 0 ? 'NARUTO' : 'ZORO') + ' EST LE CHAMPION!';
}

// ========== GAME LOOP ==========
function gameLoop() {
    if (gameState === 'lobby') {
        updateLobby();
        drawLobbyMap();
    }

    if (gameState === 'teleporting') {
        updateLobby();
        drawLobbyMap();
        ctx.fillStyle = `rgba(255,255,255,${Math.sin(frameCount * 0.3) * 0.3 + 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (gameState === 'playing' && hitStop <= 0) {
        updateFighter(players[0], 'KeyW', 'KeyA', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyS');
        updateFighter(players[1], 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyJ', 'KeyK', 'KeyL', 'ArrowDown');
        updateParticles(); updateHitSparks(); updateSlashEffects(); updateAuraEffects();
        for (let i = 0; i < 2; i++) { if (comboDisplay[i].timer > 0) comboDisplay[i].timer--; }
        checkRoundEnd();
    }

    if (hitStop > 0) hitStop--;

    if (gameState === 'playing' || gameState === 'roundend' || gameState === 'matchend') {
        ctx.save();
        if (screenShake > 0) {
            ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
            screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0;
        }

        if (currentMap) drawMapBackground(currentMap);

        if (players.length === 2) {
            for (const p of players) {
                if (p.hp <= 0) continue;
                const drawFn = p.type === 'naruto' ? drawNaruto : drawZoro;
                if (p.dashing) {
                    ctx.globalAlpha = 0.2; drawFn(p, p.x - p.vx * 3, p.y, p.facing); ctx.globalAlpha = 1;
                }
                drawFn(p, p.x, p.y, p.facing);
            }
            drawHealthBars(); drawComboDisplay();
        }

        drawParticles(); drawHitSparks(); drawSlashEffects(); drawAuraEffects();
        ctx.restore();
    }

    frameCount++;
    requestAnimationFrame(gameLoop);
}

// ========== EVENTS ==========
document.getElementById('btn-start').addEventListener('click', () => { SoundFX.init(); startLobby(); });

document.getElementById('btn-resume').addEventListener('click', () => {
    document.getElementById('pause-screen').style.display = 'none'; gameState = 'playing';
    timerInterval = setInterval(() => { if (gameState === 'playing') { roundTimer--; document.getElementById('timer-display').textContent = Math.max(0, roundTimer); } }, 1000);
});

document.getElementById('btn-quit').addEventListener('click', () => {
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    gameState = 'menu'; clearInterval(timerInterval); clearInterval(lobbyInterval);
});

document.getElementById('btn-rematch').addEventListener('click', () => {
    document.getElementById('gameover-screen').style.display = 'none'; startLobby();
});

document.getElementById('btn-menu').addEventListener('click', () => {
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    gameState = 'menu'; currentRound = 1; wins = [0, 0];
});

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
        if (gameState === 'playing') { gameState = 'paused'; document.getElementById('pause-screen').style.display = 'flex'; clearInterval(timerInterval); }
        else if (gameState === 'paused') {
            document.getElementById('pause-screen').style.display = 'none'; gameState = 'playing';
            timerInterval = setInterval(() => { if (gameState === 'playing') { roundTimer--; document.getElementById('timer-display').textContent = Math.max(0, roundTimer); } }, 1000);
        }
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

gameLoop();
