// ============================================================
// NARUTO VS ZORO - ANIME BATTLE  |  Complete 2D Fighting Game
// ============================================================

const CW = 1200, CH = 600;
const GRAVITY = 1600;
const GROUND_Y = 510;
const MAX_HP = 1000;
const MAX_EN = 100;
const ROUND_TIME = 99;
const LOBBY_TIME = 15;
const WINS_NEEDED = 2;
const WALK_SPEED = 280;
const JUMP_VEL = -620;
const DASH_SPEED = 700;
const DASH_DUR = 0.18;
const DASH_CD = 0.5;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = 'MENU';
let mapIdx = 0, roundNum = 1, p1Wins = 0, p2Wins = 0;
let fightTimer = ROUND_TIME, lobbyTimer = LOBBY_TIME;
let stateTimer = 0, lastTime = 0;
let shakeX = 0, shakeY = 0, shakeIntensity = 0, shakeDur = 0;
let hitStop = 0;
let slowMo = 0, slowFactor = 1;
let particles = [], petals = [], slashes = [];
let naruto, zoro, npcs = [];
const keys = {};

// ============================================================
// INPUT
// ============================================================
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (state === 'MENU' && e.code === 'Enter') startGame();
  if (state === 'GAME_END' && stateTimer <= 0 && e.code === 'Enter') backToMenu();
  e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function startGame() {
  document.getElementById('menu-screen').style.display = 'none';
  state = 'LOBBY';
  lobbyTimer = LOBBY_TIME;
  roundNum = 1; p1Wins = 0; p2Wins = 0;
  mapIdx = Math.floor(Math.random() * 6);
  initLobby();
}
function backToMenu() {
  state = 'MENU';
  document.getElementById('menu-screen').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('lobby-overlay').style.display = 'none';
}

// ============================================================
// UTILITIES
// ============================================================
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rnd(a, b) { return Math.random() * (b - a) + a; }
function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
function spawnP(x, y, vx, vy, life, size, color, grav, shrink) {
  particles.push({ x, y, vx, vy, life, maxLife: life, size, color, grav: grav || 0, shrink: shrink !== false, alpha: 1, rot: rnd(0, 6.28), rotSpd: rnd(-3, 3), type: 'c' });
}
function spawnRectP(x, y, vx, vy, life, w, h, color, grav) {
  particles.push({ x, y, vx, vy, life, maxLife: life, size: 1, w, h, color, grav: grav || 0, shrink: false, alpha: 1, rot: 0, rotSpd: 0, type: 'r' });
}
function spawnStar(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    let a = rnd(0, 6.28), s = rnd(100, 400);
    spawnP(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.2, 0.5), rnd(3, 7), color, 0, true);
  }
}
function spawnRing(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    let a = (i / count) * 6.28;
    spawnP(x, y, Math.cos(a) * 180, Math.sin(a) * 180, 0.35, rnd(2, 5), color, 0, true);
  }
}
function spawnDust(x, y, dir) {
  for (let i = 0; i < 4; i++) {
    spawnP(x + rnd(-8, 8), y, rnd(-40, 40) + dir * 30, rnd(-60, -20), rnd(0.3, 0.6), rnd(3, 6), 'rgba(180,160,130,0.7)', 100, true);
  }
}
function spawnSlashArc(x, y, angle, len, color) {
  slashes.push({ x, y, angle, len, life: 0.25, maxLife: 0.25, color, width: 4 });
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    p.life -= dt;
    p.alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.shrink) p.size *= (1 - dt * 3);
    p.rot += p.rotSpd * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = slashes.length - 1; i >= 0; i--) {
    slashes[i].life -= dt;
    if (slashes[i].life <= 0) slashes.splice(i, 1);
  }
}
function drawParticles() {
  for (let p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.type === 'c') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, p.size), 0, 6.28);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }
  for (let s of slashes) {
    let a = s.life / s.maxLife;
    ctx.globalAlpha = a;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width * a;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// PETALS (Cherry Blossom)
// ============================================================
function initPetals() {
  petals = [];
  for (let i = 0; i < 30; i++) {
    petals.push({ x: rnd(0, CW), y: rnd(-CH, 0), vx: rnd(-15, -5), vy: rnd(20, 50), size: rnd(3, 7), rot: rnd(0, 6.28), rotSpd: rnd(-2, 2), alpha: rnd(0.3, 0.7) });
  }
}
function updatePetals(dt) {
  for (let p of petals) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx += rnd(-10, 10) * dt;
    p.rot += p.rotSpd * dt;
    if (p.y > CH + 20) { p.y = rnd(-40, -10); p.x = rnd(0, CW); }
    if (p.x < -20) p.x = CW + 10;
  }
}
function drawPetals() {
  for (let p of petals) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ffb7c5';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, 6.28);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// MAP DEFINITIONS
// ============================================================
const MAPS = [
  { // 0: Village Konoha
    name: 'VILLAGE KONOHA',
    sky: '#0d0221', sky2: '#1a0a3e', accent: '#ff6b00',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 150, y: 390, w: 180, h: 16 },
      { x: 870, y: 390, w: 180, h: 16 },
      { x: 480, y: 310, w: 240, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, this.sky); grd.addColorStop(1, this.sky2);
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Stars
      g.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) { let sx = (i * 173 + 50) % CW, sy = (i * 97 + 20) % (CH * 0.5); g.globalAlpha = 0.3 + Math.sin(Date.now() * 0.001 + i) * 0.2; g.fillRect(sx, sy, 2, 2); }
      g.globalAlpha = 1;
      // Moon
      g.fillStyle = '#ffe8c0'; g.beginPath(); g.arc(1050, 80, 40, 0, 6.28); g.fill();
      g.fillStyle = this.sky; g.beginPath(); g.arc(1065, 72, 36, 0, 6.28); g.fill();
      // Buildings
      g.fillStyle = '#141430';
      g.fillRect(30, 200, 90, GROUND_Y - 200);
      g.fillRect(130, 260, 70, GROUND_Y - 260);
      g.fillRect(1000, 180, 110, GROUND_Y - 180);
      g.fillRect(880, 240, 80, GROUND_Y - 240);
      // Windows
      g.fillStyle = '#ffcc00';
      [[30,200,90],[130,260,70],[1000,180,110],[880,240,80]].forEach(b => {
        for (let wy = b[1] + 30; wy < GROUND_Y - 20; wy += 50) {
          g.globalAlpha = 0.6 + Math.sin(Date.now() * 0.002 + b[0] + wy) * 0.3;
          g.fillRect(b[0] + 15, wy, 12, 16);
          g.fillRect(b[0] + b[2] - 27, wy, 12, 16);
        }
      });
      g.globalAlpha = 1;
      // Hokage monument silhouette
      g.fillStyle = '#0a0018';
      g.beginPath(); g.moveTo(450, GROUND_Y); g.lineTo(480, 150); g.lineTo(510, 200); g.lineTo(540, 130); g.lineTo(570, 180); g.lineTo(600, 120); g.lineTo(630, 170); g.lineTo(660, 140); g.lineTo(690, GROUND_Y); g.fill();
      // Lanterns
      drawLantern(g, 340, 350); drawLantern(g, 860, 350); drawLantern(g, 600, 270);
      // Ground
      g.fillStyle = '#2a1a0a'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#3a2a1a'; g.fillRect(0, GROUND_Y, CW, 4);
      // Platforms
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#3a2a1a';
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#ff6b00';
        g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  },
  { // 1: Baratie
    name: 'BARATIE',
    sky: '#ff7043', sky2: '#1a237e', accent: '#2196f3',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 300, y: 380, w: 200, h: 16 },
      { x: 700, y: 350, w: 200, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, '#ff8a65'); grd.addColorStop(0.4, '#ff7043'); grd.addColorStop(1, '#1a237e');
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Sun
      g.fillStyle = '#ffcc02'; g.beginPath(); g.arc(600, 120, 50, 0, 6.28); g.fill();
      g.fillStyle = '#fff8'; g.beginPath(); g.arc(600, 120, 35, 0, 6.28); g.fill();
      // Water waves
      g.strokeStyle = '#1565c0'; g.lineWidth = 3;
      for (let w = 0; w < 5; w++) {
        g.beginPath();
        for (let x = 0; x <= CW; x += 5) {
          let wy = 420 + w * 18 + Math.sin(x * 0.02 + Date.now() * 0.002 + w) * 8;
          x === 0 ? g.moveTo(x, wy) : g.lineTo(x, wy);
        }
        g.stroke();
      }
      // Ship deck (ground)
      g.fillStyle = '#5d4037'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#795548'; g.fillRect(0, GROUND_Y, CW, 5);
      // Wood planks
      g.strokeStyle = '#4e342e'; g.lineWidth = 1;
      for (let x = 0; x < CW; x += 60) { g.beginPath(); g.moveTo(x, GROUND_Y + 5); g.lineTo(x, CH); g.stroke(); }
      // Masts
      g.fillStyle = '#4e342e';
      g.fillRect(100, 100, 8, GROUND_Y - 100);
      g.fillRect(1050, 120, 8, GROUND_Y - 120);
      // Sails
      g.fillStyle = '#fff8';
      g.beginPath(); g.moveTo(108, 120); g.lineTo(180, 180); g.lineTo(108, 280); g.fill();
      g.beginPath(); g.moveTo(1058, 140); g.lineTo(1120, 190); g.lineTo(1058, 270); g.fill();
      // Platforms
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#5d4037'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#2196f3'; g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  },
  { // 2: Chūnin Arena
    name: 'CHUNIN ARENA',
    sky: '#1a1a2e', sky2: '#2d2d5e', accent: '#e53935',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 200, y: 370, w: 160, h: 16 },
      { x: 840, y: 370, w: 160, h: 16 },
      { x: 500, y: 290, w: 200, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, this.sky); grd.addColorStop(1, this.sky2);
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Arena walls
      g.fillStyle = '#3e3e5e';
      g.fillRect(0, 150, 50, GROUND_Y - 150);
      g.fillRect(CW - 50, 150, 50, GROUND_Y - 150);
      // Stone texture on walls
      g.fillStyle = '#4a4a6a';
      for (let wy = 160; wy < GROUND_Y; wy += 30) {
        g.fillRect(5, wy, 40, 25);
        g.fillRect(CW - 45, wy, 40, 25);
      }
      // Spectator stands
      g.fillStyle = '#2a2a4a';
      g.fillRect(50, 200, CW - 100, 100);
      // Spectators (silhouettes)
      for (let i = 0; i < 40; i++) {
        let sx = 70 + (i % 20) * 55, sy = 210 + Math.floor(i / 20) * 35;
        g.fillStyle = ['#444', '#555', '#333', '#4a4a4a'][i % 4];
        g.beginPath(); g.arc(sx, sy, 8, 0, 6.28); g.fill();
        g.fillRect(sx - 5, sy + 5, 10, 15);
      }
      // Torches
      drawTorch(g, 80, 310); drawTorch(g, CW - 80, 310);
      // Sand ground
      g.fillStyle = '#c4a35a'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#d4b36a'; g.fillRect(0, GROUND_Y, CW, 4);
      // Platforms
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#8a7a5a'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#e53935'; g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  },
  { // 3: Forest of Water Seven
    name: 'WATER SEVEN FOREST',
    sky: '#0a2e0a', sky2: '#1a4a1a', accent: '#4caf50',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 180, y: 400, w: 140, h: 16 },
      { x: 880, y: 380, w: 140, h: 16 },
      { x: 500, y: 300, w: 200, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, '#0d330d'); grd.addColorStop(1, '#1a4a1a');
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Large trees
      [[80, 0], [350, 50], [700, 30], [1000, 60]].forEach(t => {
        g.fillStyle = '#3e2723'; g.fillRect(t[0], 100 + t[1], 30, GROUND_Y - 100 - t[1]);
        g.fillStyle = '#1b5e20';
        g.beginPath(); g.arc(t[0] + 15, 80 + t[1], 70, 0, 6.28); g.fill();
        g.fillStyle = '#2e7d32';
        g.beginPath(); g.arc(t[0] + 15, 60 + t[1], 55, 0, 6.28); g.fill();
      });
      // Fireflies
      g.fillStyle = '#ffeb3b';
      for (let i = 0; i < 20; i++) {
        let fx = (i * 211 + 100) % CW, fy = 100 + (i * 137) % 350;
        g.globalAlpha = 0.3 + Math.sin(Date.now() * 0.003 + i * 2) * 0.3;
        g.beginPath(); g.arc(fx + Math.sin(Date.now() * 0.001 + i) * 20, fy, 3, 0, 6.28); g.fill();
      }
      g.globalAlpha = 1;
      // Vines
      g.strokeStyle = '#2e7d32'; g.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        let vx = 100 + i * 140;
        g.beginPath(); g.moveTo(vx, 0);
        for (let vy = 0; vy < 200; vy += 10) { g.lineTo(vx + Math.sin(vy * 0.05 + i) * 15, vy); }
        g.stroke();
      }
      // Ground
      g.fillStyle = '#2e1a0a'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#1b5e20'; g.fillRect(0, GROUND_Y, CW, 5);
      // Grass tufts
      g.fillStyle = '#2e7d32';
      for (let x = 0; x < CW; x += 15) {
        g.fillRect(x, GROUND_Y - 4, 3, 8);
        g.fillRect(x + 5, GROUND_Y - 6, 2, 10);
      }
      // Platforms as branches
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#4e342e'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#4caf50'; g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  },
  { // 4: Mount Myōboku
    name: 'MOUNT MYOBOKU',
    sky: '#1a1a0a', sky2: '#3a3a1a', accent: '#fdd835',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 250, y: 380, w: 180, h: 16 },
      { x: 770, y: 380, w: 180, h: 16 },
      { x: 460, y: 280, w: 280, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, '#2a2a0a'); grd.addColorStop(1, '#4a4a2a');
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Mountain peaks
      g.fillStyle = '#5a5a2a';
      g.beginPath(); g.moveTo(0, GROUND_Y); g.lineTo(200, 80); g.lineTo(400, GROUND_Y); g.fill();
      g.beginPath(); g.moveTo(300, GROUND_Y); g.lineTo(600, 40); g.lineTo(900, GROUND_Y); g.fill();
      g.beginPath(); g.moveTo(700, GROUND_Y); g.lineTo(1000, 100); g.lineTo(1200, GROUND_Y); g.fill();
      // Clouds
      g.fillStyle = '#ffffff30';
      [[200, 120, 60], [500, 80, 80], [900, 140, 50]].forEach(c => {
        g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.28); g.fill();
        g.beginPath(); g.arc(c[0] + c[2], c[1] + 10, c[2] * 0.8, 0, 6.28); g.fill();
        g.beginPath(); g.arc(c[0] - c[2] * 0.7, c[1] + 5, c[2] * 0.7, 0, 6.28); g.fill();
      });
      // Toad statues
      g.fillStyle = '#7a7a4a';
      g.beginPath(); g.arc(150, GROUND_Y - 50, 30, Math.PI, 0); g.fill();
      g.fillRect(120, GROUND_Y - 50, 60, 50);
      g.beginPath(); g.arc(1050, GROUND_Y - 45, 25, Math.PI, 0); g.fill();
      g.fillRect(1025, GROUND_Y - 45, 50, 45);
      // Waterfall
      g.fillStyle = '#4fc3f780';
      g.fillRect(590, 50, 20, 350);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = '#fff8';
        g.fillRect(588 + rnd(0, 20), 50 + i * 45, rnd(5, 15), 3);
      }
      // Ground
      g.fillStyle = '#4a4a2a'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#6a6a3a'; g.fillRect(0, GROUND_Y, CW, 4);
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#5a5a3a'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#fdd835'; g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  },
  { // 5: Thriller Bark
    name: 'THRILLER BARK',
    sky: '#0a0015', sky2: '#1a0030', accent: '#9c27b0',
    platforms: [
      { x: 0, y: GROUND_Y, w: CW, h: 90 },
      { x: 200, y: 390, w: 160, h: 16 },
      { x: 840, y: 370, w: 160, h: 16 },
      { x: 480, y: 290, w: 240, h: 16 }
    ],
    draw(g) {
      let grd = g.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, '#0a0015'); grd.addColorStop(1, '#1a0030');
      g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
      // Lightning flash
      if (Math.random() < 0.003) { g.fillStyle = '#ffffff15'; g.fillRect(0, 0, CW, CH); }
      // Ghost ship silhouette
      g.fillStyle = '#150025';
      g.beginPath(); g.moveTo(300, GROUND_Y); g.lineTo(350, 250); g.lineTo(500, 200); g.lineTo(700, 220); g.lineTo(850, 250); g.lineTo(900, GROUND_Y); g.fill();
      // Masts
      g.fillRect(450, 100, 6, 200); g.fillRect(650, 120, 6, 180);
      // Torn sails
      g.fillStyle = '#2a1040';
      g.beginPath(); g.moveTo(456, 120); g.lineTo(530, 160); g.lineTo(456, 240); g.fill();
      // Fog layers
      for (let f = 0; f < 4; f++) {
        g.fillStyle = `rgba(100,50,150,${0.05 + f * 0.02})`;
        g.fillRect(0, 300 + f * 40 + Math.sin(Date.now() * 0.0005 + f) * 20, CW, 60);
      }
      // Chains
      g.strokeStyle = '#444'; g.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        let cx = 150 + i * 400;
        g.beginPath();
        for (let cy = 0; cy < GROUND_Y; cy += 20) {
          g.arc(cx + Math.sin(cy * 0.03) * 10, cy, 6, 0, 6.28);
        }
        g.stroke();
      }
      // Moon (eerie)
      g.fillStyle = '#80cbc440'; g.beginPath(); g.arc(180, 90, 50, 0, 6.28); g.fill();
      g.fillStyle = this.sky2; g.beginPath(); g.arc(195, 82, 45, 0, 6.28); g.fill();
      // Ground (dark wood)
      g.fillStyle = '#1a0a25'; g.fillRect(0, GROUND_Y, CW, 90);
      g.fillStyle = '#2a1535'; g.fillRect(0, GROUND_Y, CW, 4);
      this.platforms.slice(1).forEach(p => {
        g.fillStyle = '#1a0a25'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#9c27b0'; g.fillRect(p.x, p.y, p.w, 3);
      });
    }
  }
];

function drawLantern(g, x, y) {
  g.fillStyle = '#444'; g.fillRect(x - 1, y - 40, 2, 40);
  g.fillStyle = '#ff4400';
  g.beginPath(); g.arc(x, y, 12, 0, 6.28); g.fill();
  g.fillStyle = '#ff880080';
  g.beginPath(); g.arc(x, y, 20, 0, 6.28); g.fill();
}
function drawTorch(g, x, y) {
  g.fillStyle = '#5d4037'; g.fillRect(x - 3, y, 6, 40);
  g.fillStyle = '#ff6600';
  g.beginPath(); g.arc(x, y, 8 + Math.sin(Date.now() * 0.01) * 3, 0, 6.28); g.fill();
  g.fillStyle = '#ffcc0080';
  g.beginPath(); g.arc(x, y, 15, 0, 6.28); g.fill();
}

// ============================================================
// ATTACK DEFINITIONS
// ============================================================
const ATK = {
  naruto: {
    punch:      { su: 4,  ac: 5,  rc: 10, dmg: 60,  rng: 70,  kb: 120,  hs: 0.2,  eg: 10, ec: 0,  h: 40,  oy: -60,  color: '#ff8c00' },
    rasengan:   { su: 14, ac: 8,  rc: 16, dmg: 140, rng: 90,  kb: 250,  hs: 0.35, eg: 20, ec: 35, h: 60,  oy: -75,  color: '#2196f3' },
    uzumaki:    { su: 20, ac: 10, rc: 22, dmg: 200, rng: 110, kb: 350,  hs: 0.45, eg: 25, ec: 55, h: 90,  oy: -85,  color: '#ff5722' }
  },
  zoro: {
    slash:      { su: 5,  ac: 6,  rc: 12, dmg: 65,  rng: 90,  kb: 140,  hs: 0.22, eg: 12, ec: 0,  h: 50,  oy: -65,  color: '#9e9e9e' },
    santoryu:   { su: 16, ac: 9,  rc: 18, dmg: 150, rng: 110, kb: 280,  hs: 0.38, eg: 22, ec: 40, h: 80,  oy: -80,  color: '#4caf50' },
    onigiri:    { su: 22, ac: 12, rc: 24, dmg: 210, rng: 130, kb: 380,  hs: 0.5,  eg: 28, ec: 60, h: 100, oy: -95,  color: '#f44336' }
  }
};

// ============================================================
// FIGHTER CLASS
// ============================================================
class Fighter {
  constructor(cfg) {
    this.name = cfg.name;
    this.charType = cfg.charType;
    this.x = cfg.x; this.y = cfg.y;
    this.vx = 0; this.vy = 0;
    this.w = 50; this.h = 110;
    this.facing = cfg.facing;
    this.hp = MAX_HP; this.en = 0;
    this.state = 'idle';
    this.atkType = null;
    this.atkTimer = 0;
    this.atkPhase = '';
    this.hitStun = 0;
    this.blockTimer = 0;
    this.dashTimer = 0;
    this.dashCD = 0;
    this.dashDir = 0;
    this.grounded = false;
    this.animFrame = 0;
    this.animTime = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hasHit = false;
    this.blocking = false;
    this.ko = false;
    this.iFrames = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get hurtbox() { return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 5 }; }

  reset(x, y, f) {
    this.x = x; this.y = y; this.facing = f;
    this.hp = MAX_HP; this.en = 0;
    this.state = 'idle'; this.atkType = null; this.atkTimer = 0;
    this.hitStun = 0; this.blockTimer = 0; this.dashTimer = 0; this.dashCD = 0;
    this.vx = 0; this.vy = 0;
    this.grounded = false; this.ko = false; this.iFrames = 0;
    this.combo = 0; this.comboTimer = 0; this.hasHit = false;
  }

  startAttack(type) {
    if (this.state === 'attack' || this.state === 'hit' || this.ko || this.dashTimer > 0) return;
    let a = ATK[this.charType][type];
    if (this.en < a.ec) return;
    if (a.ec > 0) this.en -= a.ec;
    this.state = 'attack';
    this.atkType = type;
    this.atkTimer = 0;
    this.atkPhase = 'startup';
    this.hasHit = false;
    this.vx = 0;
  }

  takeDamage(dmg, kb, hs, fromRight) {
    if (this.iFrames > 0) return;
    if (this.blocking) {
      dmg = Math.floor(dmg * 0.15);
      kb *= 0.2;
      hs *= 0.3;
      spawnStar(this.cx, this.cy - 30, '#fff', 5);
    } else {
      this.state = 'hit';
      this.hitStun = hs;
      this.vx = fromRight ? -kb : kb;
      this.vy = -100;
      spawnStar(this.cx, this.cy - 30, '#ff0', 8);
      spawnRing(this.cx, this.cy - 30, '#ff8', 12);
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.en = Math.min(MAX_EN, this.en + Math.floor(dmg * 0.08));
  }

  update(dt, opponent) {
    if (this.ko) { this.vy += GRAVITY * dt; this.y += this.vy * dt; this.vx *= 0.9; this.x += this.vx * dt; return; }

    this.animTime += dt;
    this.animFrame++;
    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.dashCD > 0) this.dashCD -= dt;
    if (this.hitStun > 0) { this.hitStun -= dt; if (this.hitStun <= 0) { this.state = 'idle'; } }
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }

    // Face opponent
    if (this.state !== 'hit' && this.state !== 'attack' && this.dashTimer <= 0) {
      this.facing = opponent.cx > this.cx ? 1 : -1;
    }

    // Blocking
    this.blocking = false;
    if (this.state !== 'attack' && this.state !== 'hit' && this.grounded && this.dashTimer <= 0) {
      if (this.charType === 'naruto' && keys['KeyS'] && !keys['KeyW']) this.blocking = true;
      if (this.charType === 'zoro' && keys['ArrowDown'] && !keys['ArrowUp']) this.blocking = true;
    }
    if (this.blocking) this.state = 'block';

    // Dash
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * DASH_SPEED;
      this.iFrames = 0.05;
      spawnP(this.cx - this.dashDir * 20, this.y + this.h * 0.7, -this.dashDir * rnd(30, 80), rnd(-20, 20), 0.3, rnd(3, 6), '#ffffff80', 0, true);
      if (this.dashTimer <= 0) { this.vx = 0; this.state = 'idle'; }
    }

    // Attack
    if (this.state === 'attack') {
      let a = ATK[this.charType][this.atkType];
      this.atkTimer += dt;
      let frame = this.atkTimer * 60;
      if (frame < a.su) { this.atkPhase = 'startup'; }
      else if (frame < a.su + a.ac) {
        this.atkPhase = 'active';
        // Hit detection
        if (!this.hasHit) {
          let hb = this.facing === 1
            ? { x: this.cx, y: this.y + this.h + a.oy, w: a.rng, h: a.h }
            : { x: this.cx - a.rng, y: this.y + this.h + a.oy, w: a.rng, h: a.h };
          let ob = opponent.hurtbox;
          if (overlap(hb, ob)) {
            this.hasHit = true;
            let dmg = a.dmg;
            if (this.en >= MAX_EN && a.ec === 0) { dmg = Math.floor(dmg * 1.5); this.en = 0; }
            // Combo bonus
            this.combo++;
            this.comboTimer = 1.5;
            let comboBonus = 1 + (this.combo - 1) * 0.05;
            dmg = Math.floor(dmg * comboBonus);

            let fromRight = this.cx < opponent.cx;
            opponent.takeDamage(dmg, a.kb, a.hs, fromRight);
            this.en = Math.min(MAX_EN, this.en + a.eg);

            // Effects
            hitStop = this.atkType === 'punch' || this.atkType === 'slash' ? 0.06 : 0.1;
            shakeIntensity = dmg > 100 ? 10 : 5;
            shakeDur = 0.2;
            let hx = (this.cx + opponent.cx) / 2, hy = (this.cy + opponent.cy) / 2 - 20;
            spawnStar(hx, hy, a.color, 10);
            if (dmg > 100) {
              slowMo = 0.3; slowFactor = 0.3;
              spawnRing(hx, hy, a.color, 16);
            }
          }
        }
      } else {
        this.atkPhase = 'recovery';
      }
      if (this.atkTimer * 60 >= a.su + a.ac + a.rc) {
        this.state = 'idle'; this.atkType = null;
      }
    }

    // Physics
    if (this.dashTimer <= 0) {
      this.vy += GRAVITY * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.state !== 'attack' && this.state !== 'hit' && this.dashTimer <= 0 && !this.blocking) {
        this.vx *= 0.82;
      }
    }

    // Platform collision
    this.grounded = false;
    let map = MAPS[mapIdx];
    for (let p of map.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        let prevBot = this.feet - this.vy * dt;
        if (prevBot <= p.y + 5 && this.feet >= p.y && this.vy >= 0) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
        }
      }
    }

    // Bounds
    this.x = clamp(this.x, 10, CW - this.w - 10);
    if (this.y > CH + 100) { this.hp = 0; }

    // KO
    if (this.hp <= 0 && !this.ko) {
      this.ko = true;
      this.vy = -300;
      this.vx = this.facing * -100;
    }

    // State update for idle/walk
    if (this.state !== 'attack' && this.state !== 'hit' && this.dashTimer <= 0 && !this.ko) {
      if (this.blocking) this.state = 'block';
      else if (!this.grounded) this.state = this.vy < 0 ? 'jump' : 'fall';
      else if (Math.abs(this.vx) > 20) this.state = 'walk';
      else this.state = 'idle';
    }
  }
}

// ============================================================
// DRAW CHARACTERS
// ============================================================
function drawNaruto(g, f) {
  g.save();
  g.translate(f.cx, f.feet);
  if (f.facing === -1) g.scale(-1, 1);

  let walkCycle = Math.sin(f.animFrame * 0.25);
  let idleBob = Math.sin(f.animTime * 3) * 2;
  let legOff = f.state === 'walk' ? walkCycle * 14 : 0;
  let armOff = f.state === 'walk' ? walkCycle * 12 : 0;
  let blockOff = f.blocking ? 8 : 0;

  // Hit flash
  if (f.hitStun > 0 && Math.sin(f.hitStun * 40) > 0) {
    g.globalAlpha = 0.5;
  }
  // iFrame blink
  if (f.iFrames > 0 && Math.sin(f.iFrames * 60) > 0) g.globalAlpha = 0.4;

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(0, 0, 25, 6, 0, 0, 6.28); g.fill();

  // Legs
  g.fillStyle = '#ff6b00';
  g.fillRect(-14, -42 + legOff, 11, 42 - legOff);
  g.fillRect(3, -42 - legOff, 11, 42 + legOff);
  // Sandals
  g.fillStyle = '#1a237e';
  g.fillRect(-16, -2 + legOff, 15, 8);
  g.fillRect(1, -2 - legOff, 15, 8);

  // Body
  g.fillStyle = '#ff8c00';
  g.fillRect(-18, -95 + idleBob, 36, 56);
  // White collar
  g.fillStyle = '#f5f5f5';
  g.fillRect(-16, -97 + idleBob, 32, 8);
  // Zipper
  g.fillStyle = '#222';
  g.fillRect(-1, -90 + idleBob, 2, 48);
  // Belt
  g.fillStyle = '#e65100';
  g.fillRect(-18, -42 + idleBob, 36, 6);

  // Arms
  g.fillStyle = '#ff8c00';
  let punchExtend = (f.state === 'attack' && f.atkPhase === 'active') ? 25 : 0;
  let punchY = f.atkType === 'punch' ? -70 : (f.atkType === 'rasengan' ? -80 : -65);

  // Back arm
  g.fillRect(-26, -85 + idleBob + armOff + blockOff, 10, 35);
  // Front arm
  g.fillRect(16, -85 + idleBob - armOff - blockOff + (f.blocking ? -10 : 0), 10, 35);
  if (f.blocking) {
    g.fillRect(6, -95 + idleBob, 16, 10);
  }
  // Hands
  g.fillStyle = '#ffcc99';
  if (f.state === 'attack' && f.atkType === 'punch' && f.atkPhase === 'active') {
    g.fillRect(16 + punchExtend, punchY + idleBob, 14, 14);
    g.fillStyle = '#ff8c00';
    g.fillRect(16 + punchExtend - 2, punchY - 3 + idleBob, 18, 6);
  } else {
    g.fillRect(-26, -52 + idleBob + armOff, 10, 10);
    g.fillRect(16, -52 + idleBob - armOff, 10, 10);
  }

  // Head
  g.fillStyle = '#ffcc99';
  g.beginPath(); g.arc(0, -110 + idleBob, 20, 0, 6.28); g.fill();

  // Hair spikes
  g.fillStyle = '#ffd700';
  let spikes = [[-14, -125, -20, -145, -8, -122], [-6, -125, -10, -148, -2, -122],
    [2, -125, 0, -150, 6, -122], [10, -125, 6, -146, 14, -122],
    [16, -122, 14, -142, 20, -118]];
  spikes.forEach(s => {
    g.beginPath();
    g.moveTo(s[0], -110 + idleBob + (s[1] + 110));
    g.lineTo(s[2], -110 + idleBob + (s[3] + 110));
    g.lineTo(s[4], -110 + idleBob + (s[5] + 110));
    g.fill();
  });
  // Side hair
  g.beginPath(); g.moveTo(-19, -110 + idleBob); g.lineTo(-26, -118 + idleBob); g.lineTo(-18, -102 + idleBob); g.fill();
  g.beginPath(); g.moveTo(19, -110 + idleBob); g.lineTo(26, -118 + idleBob); g.lineTo(18, -102 + idleBob); g.fill();

  // Headband
  g.fillStyle = '#1565c0';
  g.fillRect(-21, -120 + idleBob, 42, 9);
  // Metal plate
  g.fillStyle = '#bbb';
  g.fillRect(-8, -119 + idleBob, 16, 7);
  g.strokeStyle = '#555'; g.lineWidth = 1;
  g.strokeRect(-8, -119 + idleBob, 16, 7);
  // Konoha symbol
  g.strokeStyle = '#333'; g.lineWidth = 1;
  g.beginPath(); g.arc(0, -115 + idleBob, 3, 0, 4.5); g.stroke();
  // Tails
  g.fillStyle = '#1565c0';
  let tailWave = Math.sin(f.animTime * 5) * 5;
  g.fillRect(-25, -120 + idleBob, 8, 5);
  g.fillRect(-32 + tailWave, -118 + idleBob, 10, 4);
  g.fillRect(-38 + tailWave * 1.2, -116 + idleBob, 10, 4);

  // Eyes
  g.fillStyle = '#2196f3';
  g.fillRect(-8, -113 + idleBob, 5, 5);
  g.fillRect(3, -113 + idleBob, 5, 5);
  g.fillStyle = '#0d47a1';
  g.fillRect(-7, -112 + idleBob, 3, 3);
  g.fillRect(4, -112 + idleBob, 3, 3);
  g.fillStyle = '#000';
  g.fillRect(-6, -111 + idleBob, 2, 2);
  g.fillRect(5, -111 + idleBob, 2, 2);

  // Whisker marks
  g.strokeStyle = '#cc9966'; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(-19, -104 + i * 4 + idleBob); g.lineTo(-13, -103 + i * 4 + idleBob); g.stroke();
    g.beginPath(); g.moveTo(13, -104 + i * 4 + idleBob); g.lineTo(19, -103 + i * 4 + idleBob); g.stroke();
  }

  // Mouth
  if (f.state === 'attack') {
    g.fillStyle = '#333';
    g.beginPath(); g.arc(0, -100 + idleBob, 4, 0, Math.PI); g.fill();
  } else {
    g.strokeStyle = '#666'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, -100 + idleBob, 3, 0.2, Math.PI - 0.2); g.stroke();
  }

  g.globalAlpha = 1;

  // Rasengan effect
  if (f.state === 'attack' && f.atkType === 'rasengan' && f.atkPhase === 'active') {
    let rx = 40, ry = punchY + idleBob + 7;
    g.fillStyle = '#2196f380';
    g.beginPath(); g.arc(rx, ry, 22, 0, 6.28); g.fill();
    g.fillStyle = '#64b5f6';
    g.beginPath(); g.arc(rx, ry, 15, 0, 6.28); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(rx, ry, 8, 0, 6.28); g.fill();
    // Spiral
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath();
    for (let t = 0; t < 12; t += 0.3) {
      let sr = t * 1.5, sa = t * 2 + f.animTime * 15;
      let sx = rx + Math.cos(sa) * sr, sy = ry + Math.sin(sa) * sr;
      t === 0 ? g.moveTo(sx, sy) : g.lineTo(sx, sy);
    }
    g.stroke();
  }

  // Uzumaki Barrage aura
  if (f.state === 'attack' && f.atkType === 'uzumaki' && f.atkPhase === 'active') {
    let grd = g.createRadialGradient(0, -50 + idleBob, 10, 0, -50 + idleBob, 80);
    grd.addColorStop(0, '#ff572280'); grd.addColorStop(0.5, '#ff980040'); grd.addColorStop(1, '#ff980000');
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -50 + idleBob, 80, 0, 6.28); g.fill();
    g.strokeStyle = '#ff5722'; g.lineWidth = 3;
    for (let r = 0; r < 3; r++) {
      let ra = f.animTime * 10 + r * 2.09;
      g.beginPath(); g.arc(0, -50 + idleBob, 30 + r * 15, ra, ra + 2); g.stroke();
    }
  }

  // Aura when energy full
  if (f.en >= MAX_EN && !f.ko) {
    let grd = g.createRadialGradient(0, -55, 10, 0, -55, 60);
    grd.addColorStop(0, '#ff8c0040'); grd.addColorStop(1, '#ff8c0000');
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -55, 60 + Math.sin(f.animTime * 6) * 10, 0, 6.28); g.fill();
  }

  g.restore();
}

function drawZoro(g, f) {
  g.save();
  g.translate(f.cx, f.feet);
  if (f.facing === -1) g.scale(-1, 1);

  let walkCycle = Math.sin(f.animFrame * 0.25);
  let idleBob = Math.sin(f.animTime * 2.5) * 2;
  let legOff = f.state === 'walk' ? walkCycle * 14 : 0;
  let armOff = f.state === 'walk' ? walkCycle * 10 : 0;

  if (f.hitStun > 0 && Math.sin(f.hitStun * 40) > 0) g.globalAlpha = 0.5;
  if (f.iFrames > 0 && Math.sin(f.iFrames * 60) > 0) g.globalAlpha = 0.4;

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(0, 0, 25, 6, 0, 0, 6.28); g.fill();

  // Legs
  g.fillStyle = '#1b3a1b';
  g.fillRect(-14, -42 + legOff, 11, 42 - legOff);
  g.fillRect(3, -42 - legOff, 11, 42 + legOff);
  // Boots
  g.fillStyle = '#222';
  g.fillRect(-16, -2 + legOff, 15, 8);
  g.fillRect(1, -2 - legOff, 15, 8);

  // Body
  g.fillStyle = '#f5f5f5';
  g.fillRect(-18, -95 + idleBob, 36, 56);
  // Open shirt
  g.fillStyle = '#ffcc99';
  g.fillRect(-6, -90 + idleBob, 12, 40);
  // Chest scar (X)
  g.strokeStyle = '#c62828'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-10, -85 + idleBob); g.lineTo(10, -60 + idleBob); g.stroke();
  g.beginPath(); g.moveTo(10, -85 + idleBob); g.lineTo(-10, -60 + idleBob); g.stroke();

  // Haramaki
  g.fillStyle = '#2e7d32';
  g.fillRect(-18, -44 + idleBob, 36, 10);
  g.strokeStyle = '#1b5e20'; g.lineWidth = 1;
  for (let i = 0; i < 36; i += 4) {
    g.beginPath(); g.moveTo(-18 + i, -44 + idleBob); g.lineTo(-18 + i, -34 + idleBob); g.stroke();
  }

  // Swords on hip
  g.fillStyle = '#9e9e9e';
  g.fillRect(-22, -40 + idleBob, 3, 45);
  g.fillStyle = '#795548';
  g.fillRect(-23, -42 + idleBob, 5, 6);
  g.fillStyle = '#888';
  g.fillRect(20, -35 + idleBob, 3, 40);
  g.fillStyle = '#795548';
  g.fillRect(19, -37 + idleBob, 5, 6);

  // Arms
  g.fillStyle = '#ffcc99';
  let slashExtend = (f.state === 'attack' && f.atkPhase === 'active') ? 15 : 0;
  let holdingSword = f.state !== 'attack' || f.atkType !== 'santoryu';

  // Back arm
  g.fillRect(-24, -85 + idleBob + armOff, 8, 32);
  // Front arm
  g.fillRect(16, -85 + idleBob - armOff, 8, 32);

  // Sword in hand
  if (f.state === 'attack') {
    let swordAngle = 0;
    if (f.atkType === 'slash') {
      swordAngle = f.atkPhase === 'startup' ? -0.5 : (f.atkPhase === 'active' ? 1.2 : 0.3);
    } else if (f.atkType === 'onigiri') {
      swordAngle = f.atkPhase === 'startup' ? -1.5 : (f.atkPhase === 'active' ? 0.8 : 0);
    } else {
      swordAngle = f.atkPhase === 'active' ? 0.8 : 0;
    }
    g.save();
    g.translate(20, -70 + idleBob - armOff);
    g.rotate(swordAngle);
    g.fillStyle = '#bbb';
    g.fillRect(-2, -50, 4, 50);
    g.fillStyle = '#ddd';
    g.fillRect(-1, -50, 2, 50);
    g.fillStyle = '#795548';
    g.fillRect(-4, -2, 8, 8);
    g.restore();
  } else {
    g.fillStyle = '#bbb';
    g.save();
    g.translate(20, -70 + idleBob - armOff);
    g.rotate(-0.3);
    g.fillRect(-2, -40, 4, 40);
    g.fillStyle = '#795548';
    g.fillRect(-4, -2, 8, 6);
    g.restore();
  }

  // Santoryu - sword in mouth
  if (f.state === 'attack' && f.atkType === 'santoryu') {
    g.fillStyle = '#bbb';
    g.save();
    g.translate(0, -103 + idleBob);
    g.rotate(f.atkPhase === 'active' ? 0.5 : -0.2);
    g.fillRect(-2, -5, 4, 50);
    g.fillStyle = '#ddd';
    g.fillRect(-1, -5, 2, 50);
    g.restore();
    // Extra swords in hands
    g.save();
    g.translate(-20, -70 + idleBob + armOff);
    g.rotate(f.atkPhase === 'active' ? -0.8 : 0.3);
    g.fillStyle = '#bbb';
    g.fillRect(-2, -45, 4, 45);
    g.fillStyle = '#795548';
    g.fillRect(-4, -2, 8, 6);
    g.restore();
  }

  // Head
  g.fillStyle = '#ffcc99';
  g.beginPath(); g.arc(0, -110 + idleBob, 19, 0, 6.28); g.fill();

  // Hair
  g.fillStyle = '#2e7d32';
  let gSpikes = [[-10, -128, -14, -140, -6, -125], [0, -128, -3, -145, 3, -125],
    [8, -126, 5, -140, 12, -123], [-16, -118, -22, -128, -14, -115],
    [14, -118, 20, -126, 16, -114]];
  gSpikes.forEach(s => {
    g.beginPath(); g.moveTo(s[0], -110 + idleBob + (s[1] + 110));
    g.lineTo(s[2], -110 + idleBob + (s[3] + 110));
    g.lineTo(s[4], -110 + idleBob + (s[5] + 110)); g.fill();
  });

  // Bandana
  g.fillStyle = '#2e7d32';
  g.fillRect(-20, -120 + idleBob, 40, 10);
  // Bandana tails
  let bWave = Math.sin(f.animTime * 4) * 4;
  g.fillRect(-24, -118 + idleBob, 8, 5);
  g.fillRect(-30 + bWave, -116 + idleBob, 8, 4);

  // Eye area (bandana covers right eye)
  g.fillStyle = '#ffcc99';
  g.beginPath(); g.arc(0, -110 + idleBob, 19, Math.PI * 0.65, Math.PI * 1.35); g.fill();
  // Left eye visible
  g.fillStyle = '#b71c1c';
  g.fillRect(-8, -113 + idleBob, 5, 5);
  g.fillStyle = '#000';
  g.fillRect(-7, -112 + idleBob, 3, 3);

  // Earring
  g.fillStyle = '#ffd700';
  g.beginPath(); g.arc(-18, -103 + idleBob, 3, 0, 6.28); g.fill();
  g.strokeStyle = '#ffd700'; g.lineWidth = 1;
  g.beginPath(); g.arc(-18, -100 + idleBob, 2, 0, Math.PI); g.stroke();

  // Mouth
  if (f.state === 'attack' && f.atkType === 'santoryu') {
    g.fillStyle = '#333';
    g.beginPath(); g.arc(2, -100 + idleBob, 3, 0, Math.PI); g.fill();
  } else {
    g.strokeStyle = '#666'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, -100 + idleBob, 3, 0.3, Math.PI - 0.3); g.stroke();
  }

  g.globalAlpha = 1;

  // Santoryu green energy
  if (f.state === 'attack' && f.atkType === 'santoryu' && f.atkPhase === 'active') {
    let grd = g.createRadialGradient(0, -50 + idleBob, 10, 0, -50 + idleBob, 80);
    grd.addColorStop(0, '#4caf5080'); grd.addColorStop(0.5, '#2e7d3240'); grd.addColorStop(1, '#2e7d3200');
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -50 + idleBob, 80, 0, 6.28); g.fill();
    g.strokeStyle = '#4caf50'; g.lineWidth = 3;
    for (let r = 0; r < 3; r++) {
      let ra = f.animTime * 12 + r * 2.09;
      g.beginPath(); g.arc(0, -50 + idleBob, 25 + r * 15, ra, ra + 1.5); g.stroke();
    }
  }

  // Onigiri red energy
  if (f.state === 'attack' && f.atkType === 'onigiri' && f.atkPhase === 'active') {
    let grd = g.createRadialGradient(0, -60 + idleBob, 10, 0, -60 + idleBob, 90);
    grd.addColorStop(0, '#f4433680'); grd.addColorStop(1, '#f4433600');
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -60 + idleBob, 90, 0, 6.28); g.fill();
    g.strokeStyle = '#f44336'; g.lineWidth = 4;
    g.beginPath();
    g.moveTo(30, -120 + idleBob); g.lineTo(30, 0 + idleBob);
    g.stroke();
  }

  // Aura when energy full
  if (f.en >= MAX_EN && !f.ko) {
    let grd = g.createRadialGradient(0, -55, 10, 0, -55, 60);
    grd.addColorStop(0, '#4caf5040'); grd.addColorStop(1, '#4caf5000');
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -55, 60 + Math.sin(f.animTime * 6) * 10, 0, 6.28); g.fill();
  }

  g.restore();
}

// ============================================================
// LOBBY
// ============================================================
class NPC {
  constructor(x) {
    this.x = x; this.y = GROUND_Y - 110;
    this.w = 50; this.h = 110;
    this.vx = rnd(-40, 40);
    this.type = Math.random() < 0.5 ? 'naruto' : 'zoro';
    this.facing = this.vx > 0 ? 1 : -1;
    this.walkTimer = rnd(1, 4);
    this.animFrame = 0;
    this.animTime = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }
  update(dt) {
    this.animFrame++;
    this.animTime += dt;
    this.walkTimer -= dt;
    if (this.walkTimer <= 0) {
      this.vx = rnd(-50, 50);
      this.facing = this.vx > 0 ? 1 : -1;
      this.walkTimer = rnd(1.5, 5);
    }
    this.x += this.vx * dt;
    if (this.x < 20) { this.x = 20; this.vx = Math.abs(this.vx); this.facing = 1; }
    if (this.x > CW - 70) { this.x = CW - 70; this.vx = -Math.abs(this.vx); this.facing = -1; }
  }
}

let lobbyDecos = [];
function initLobby() {
  npcs = [];
  for (let i = 0; i < 12; i++) npcs.push(new NPC(rnd(50, CW - 100)));
  lobbyDecos = [];
  // Cherry blossom trees
  lobbyDecos.push({ type: 'tree', x: 150, y: GROUND_Y });
  lobbyDecos.push({ type: 'tree', x: 1050, y: GROUND_Y });
  // Torii gate
  lobbyDecos.push({ type: 'torii', x: 600, y: GROUND_Y });
  // Lanterns
  lobbyDecos.push({ type: 'lantern', x: 350, y: GROUND_Y - 40 });
  lobbyDecos.push({ type: 'lantern', x: 850, y: GROUND_Y - 40 });
  initPetals();
}

function drawLobbyBG(g) {
  let grd = g.createLinearGradient(0, 0, 0, CH);
  grd.addColorStop(0, '#0d0221'); grd.addColorStop(1, '#1a0a3e');
  g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
  // Stars
  g.fillStyle = '#fff';
  for (let i = 0; i < 50; i++) {
    let sx = (i * 173 + 50) % CW, sy = (i * 97 + 20) % (CH * 0.4);
    g.globalAlpha = 0.2 + Math.sin(Date.now() * 0.001 + i) * 0.2;
    g.fillRect(sx, sy, 2, 2);
  }
  g.globalAlpha = 1;
  // Moon
  g.fillStyle = '#ffe8c0'; g.beginPath(); g.arc(900, 80, 35, 0, 6.28); g.fill();
  g.fillStyle = '#0d0221'; g.beginPath(); g.arc(912, 72, 32, 0, 6.28); g.fill();

  // Draw decorations
  for (let d of lobbyDecos) {
    if (d.type === 'tree') {
      // Trunk
      g.fillStyle = '#5d4037';
      g.fillRect(d.x - 8, d.y - 140, 16, 140);
      g.fillRect(d.x - 15, d.y - 100, 30, 8);
      // Foliage (cherry blossom)
      g.fillStyle = '#e91e63';
      g.beginPath(); g.arc(d.x, d.y - 160, 55, 0, 6.28); g.fill();
      g.fillStyle = '#f48fb1';
      g.beginPath(); g.arc(d.x - 20, d.y - 145, 40, 0, 6.28); g.fill();
      g.beginPath(); g.arc(d.x + 25, d.y - 150, 38, 0, 6.28); g.fill();
      g.fillStyle = '#fce4ec';
      g.beginPath(); g.arc(d.x + 10, d.y - 170, 25, 0, 6.28); g.fill();
    }
    if (d.type === 'torii') {
      g.fillStyle = '#c62828';
      g.fillRect(d.x - 60, d.y - 160, 12, 160);
      g.fillRect(d.x + 48, d.y - 160, 12, 160);
      g.fillRect(d.x - 70, d.y - 165, 140, 12);
      g.fillRect(d.x - 55, d.y - 145, 110, 8);
    }
    if (d.type === 'lantern') {
      drawLantern(g, d.x, d.y);
    }
  }

  // Ground
  g.fillStyle = '#1a1a0a';
  g.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);
  g.fillStyle = '#2a2a1a';
  g.fillRect(0, GROUND_Y, CW, 4);
  // Path stones
  g.fillStyle = '#3a3a2a';
  for (let x = 50; x < CW; x += 80) {
    g.beginPath(); g.ellipse(x, GROUND_Y + 30, 25, 10, 0, 0, 6.28); g.fill();
  }
}

// ============================================================
// SCREEN EFFECTS
// ============================================================
function addShake(intensity, dur) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDur = Math.max(shakeDur, dur);
}
function updateShake(dt) {
  if (shakeDur > 0) {
    shakeDur -= dt;
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeIntensity *= 0.9;
  } else {
    shakeX = 0; shakeY = 0; shakeIntensity = 0;
  }
}

// ============================================================
// HUD
// ============================================================
function updateHUD() {
  let p1h = document.getElementById('p1-health-fill');
  let p2h = document.getElementById('p2-health-fill');
  let p1e = document.getElementById('p1-energy-fill');
  let p2e = document.getElementById('p2-energy-fill');
  let p1ht = document.getElementById('p1-health-text');
  let p2ht = document.getElementById('p2-health-text');

  let h1 = clamp(naruto.hp / MAX_HP * 100, 0, 100);
  let h2 = clamp(zoro.hp / MAX_HP * 100, 0, 100);
  p1h.style.width = h1 + '%';
  p2h.style.width = h2 + '%';

  p1h.className = 'bar-fill health-fill' + (h1 < 25 ? ' low' : h1 < 50 ? ' mid' : '');
  p2h.className = 'bar-fill health-fill' + (h2 < 25 ? ' low' : h2 < 50 ? ' mid' : '');

  p1ht.textContent = Math.max(0, Math.ceil(naruto.hp));
  p2ht.textContent = Math.max(0, Math.ceil(zoro.hp));

  p1e.style.width = (naruto.en / MAX_EN * 100) + '%';
  p2e.style.width = (zoro.en / MAX_EN * 100) + '%';

  p1e.className = 'bar-fill energy-fill-p1' + (naruto.en >= MAX_EN ? ' pulse' : '');
  p2e.className = 'bar-fill energy-fill-p2' + (zoro.en >= MAX_EN ? ' pulse' : '');

  document.getElementById('timer-display').textContent = Math.max(0, Math.ceil(fightTimer));
  document.getElementById('timer-display').className = fightTimer <= 10 ? 'urgent' : '';
  document.getElementById('round-display').textContent = 'ROUND ' + roundNum;

  let w1 = '', w2 = '';
  for (let i = 0; i < p1Wins; i++) w1 += '★';
  for (let i = 0; i < p2Wins; i++) w2 += '★';
  document.getElementById('p1-wins').textContent = w1;
  document.getElementById('p2-wins').textContent = w2;

  // Combos
  let cp1 = document.getElementById('combo-p1');
  let cp2 = document.getElementById('combo-p2');
  if (naruto.combo >= 2) { cp1.textContent = naruto.combo + ' COMBO!'; cp1.className = 'combo-display combo-left show'; }
  else { cp1.className = 'combo-display combo-left'; }
  if (zoro.combo >= 2) { cp2.textContent = zoro.combo + ' COMBO!'; cp2.className = 'combo-display combo-right show'; }
  else { cp2.className = 'combo-display combo-right'; }
}

function showAnnounce(text, dur) {
  let el = document.getElementById('announce');
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, dur * 1000);
}

// ============================================================
// COMBAT / FIGHT LOGIC
// ============================================================
function initFight() {
  naruto = new Fighter({ name: 'NARUTO', charType: 'naruto', x: 250, y: GROUND_Y - 110, facing: 1 });
  zoro = new Fighter({ name: 'ZORO', charType: 'zoro', x: 900, y: GROUND_Y - 110, facing: -1 });
  fightTimer = ROUND_TIME;
  document.getElementById('hud').style.display = 'block';
  initPetals();
}

function updateFight(dt) {
  // Timer
  fightTimer -= dt;
  if (fightTimer <= 0) {
    fightTimer = 0;
    endRound();
    return;
  }

  // Input - P1 (Naruto)
  if (!naruto.ko && naruto.hitStun <= 0 && naruto.dashTimer <= 0) {
    if (keys['KeyA']) naruto.vx = -WALK_SPEED;
    else if (keys['KeyD']) naruto.vx = WALK_SPEED;
    if (keys['KeyW'] && naruto.grounded) { naruto.vy = JUMP_VEL; naruto.grounded = false; spawnDust(naruto.cx, naruto.feet, 0); }
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      if (naruto.dashCD <= 0) {
        naruto.dashTimer = DASH_DUR;
        naruto.dashCD = DASH_CD;
        naruto.dashDir = naruto.facing;
        naruto.iFrames = DASH_DUR;
        naruto.state = 'dash';
      }
    }
    if (keys['KeyF']) naruto.startAttack('punch');
    if (keys['KeyG']) naruto.startAttack('rasengan');
    if (keys['KeyH']) naruto.startAttack('uzumaki');
  }

  // Input - P2 (Zoro)
  if (!zoro.ko && zoro.hitStun <= 0 && zoro.dashTimer <= 0) {
    if (keys['ArrowLeft']) zoro.vx = -WALK_SPEED;
    else if (keys['ArrowRight']) zoro.vx = WALK_SPEED;
    if (keys['ArrowUp'] && zoro.grounded) { zoro.vy = JUMP_VEL; zoro.grounded = false; spawnDust(zoro.cx, zoro.feet, 0); }
    if (keys['ControlRight'] || keys['ControlLeft']) {
      if (zoro.dashCD <= 0) {
        zoro.dashTimer = DASH_DUR;
        zoro.dashCD = DASH_CD;
        zoro.dashDir = zoro.facing;
        zoro.iFrames = DASH_DUR;
        zoro.state = 'dash';
      }
    }
    if (keys['KeyJ']) zoro.startAttack('slash');
    if (keys['KeyK']) zoro.startAttack('santoryu');
    if (keys['KeyL']) zoro.startAttack('onigiri');
  }

  // Passive energy regen
  naruto.en = Math.min(MAX_EN, naruto.en + 3 * dt);
  zoro.en = Math.min(MAX_EN, zoro.en + 3 * dt);

  // Run particles
  if (naruto.state === 'walk' && naruto.grounded && naruto.animFrame % 8 === 0) {
    spawnDust(naruto.cx, naruto.feet, -naruto.facing);
  }
  if (zoro.state === 'walk' && zoro.grounded && zoro.animFrame % 8 === 0) {
    spawnDust(zoro.cx, zoro.feet, -zoro.facing);
  }

  // Update fighters
  naruto.update(dt, zoro);
  zoro.update(dt, naruto);

  // Push apart if overlapping
  if (naruto.x + naruto.w > zoro.x && naruto.x < zoro.x + zoro.w &&
      naruto.y + naruto.h > zoro.y && naruto.y < zoro.y + zoro.h) {
    let push = (naruto.cx - zoro.cx) > 0 ? 2 : -2;
    naruto.x += push; zoro.x -= push;
  }

  // Check KO
  if ((naruto.ko || zoro.ko) && state === 'FIGHT') {
    setTimeout(endRound, 1500);
    state = 'ROUND_END_PENDING';
  }
  if (naruto.hp <= 0 && !naruto.ko) naruto.ko = true;
  if (zoro.hp <= 0 && !zoro.ko) zoro.ko = true;

  updateHUD();
}

function endRound() {
  state = 'ROUND_END';
  if (naruto.hp <= 0 && zoro.hp <= 0) {
    showAnnounce('DOUBLE KO!', 2);
  } else if (zoro.hp <= 0 || naruto.hp > zoro.hp) {
    p1Wins++;
    showAnnounce('NARUTO WINS!', 2);
  } else {
    p2Wins++;
    showAnnounce('ZORO WINS!', 2);
  }
  stateTimer = 2.5;
}

// ============================================================
// GAME LOOP
// ============================================================
function update(dt) {
  updateParticles(dt);
  updatePetals(dt);
  updateShake(dt);
  if (slowMo > 0) { slowMo -= dt; } else { slowFactor = 1; }

  switch (state) {
    case 'LOBBY':
      lobbyTimer -= dt;
      document.getElementById('lobby-timer').textContent = Math.ceil(lobbyTimer);
      document.getElementById('lobby-overlay').style.display = 'block';
      // Player movement in lobby
      if (keys['KeyA']) naruto.x -= WALK_SPEED * dt;
      if (keys['KeyD']) naruto.x += WALK_SPEED * dt;
      naruto.x = clamp(naruto.x, 10, CW - 60);
      naruto.animTime += dt;
      naruto.animFrame++;
      if (naruto.animFrame % 10 === 0 && (keys['KeyA'] || keys['KeyD']))
        spawnDust(naruto.cx, naruto.feet, keys['KeyA'] ? 1 : -1);
      for (let n of npcs) n.update(dt);
      if (lobbyTimer <= 0) {
        state = 'TRANSITION';
        stateTimer = 2;
        document.getElementById('lobby-overlay').style.display = 'none';
        // Teleport effect
        for (let i = 0; i < 50; i++) {
          spawnP(naruto.cx + rnd(-30, 30), naruto.cy + rnd(-30, 30), rnd(-200, 200), rnd(-200, 200), rnd(0.5, 1.2), rnd(3, 8), '#fff', 0, true);
        }
        showAnnounce('TELEPORTING...', 1.5);
      }
      break;

    case 'TRANSITION':
      stateTimer -= dt;
      if (stateTimer <= 0) {
        state = 'INTRO';
        stateTimer = 2.5;
        initFight();
        showAnnounce('ROUND ' + roundNum, 1.5);
      }
      break;

    case 'INTRO':
      stateTimer -= dt;
      if (stateTimer <= 1 && stateTimer + dt > 1) {
        showAnnounce('FIGHT!', 1);
      }
      if (stateTimer <= 0) {
        state = 'FIGHT';
      }
      break;

    case 'FIGHT':
      let effectiveDt = dt * slowFactor;
      if (hitStop > 0) { hitStop -= dt; } else {
        updateFight(effectiveDt);
      }
      break;

    case 'ROUND_END':
      stateTimer -= dt;
      naruto.update(dt * 0.3, zoro);
      zoro.update(dt * 0.3, naruto);
      if (stateTimer <= 0) {
        if (p1Wins >= WINS_NEEDED || p2Wins >= WINS_NEEDED) {
          state = 'GAME_END';
          stateTimer = 3;
          let winner = p1Wins >= WINS_NEEDED ? 'NARUTO' : 'ZORO';
          showAnnounce(winner + ' WINS THE MATCH!', 3);
        } else {
          roundNum++;
          mapIdx = Math.floor(Math.random() * 6);
          state = 'TRANSITION';
          stateTimer = 2;
          showAnnounce('NEXT ROUND...', 1.5);
        }
      }
      break;

    case 'GAME_END':
      stateTimer -= dt;
      if (stateTimer <= -1) {
        document.getElementById('announce').style.display = 'none';
      }
      break;
  }
}

function render() {
  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  if (state === 'LOBBY') {
    drawLobbyBG(ctx);
    drawPetals();
    for (let n of npcs) {
      ctx.save();
      ctx.translate(n.x + n.w / 2, n.feet);
      if (n.vx < 0) ctx.scale(-1, 1);
      if (n.type === 'naruto') drawMiniNaruto(ctx, n);
      else drawMiniZoro(ctx, n);
      ctx.restore();
    }
    // Player
    naruto.facing = 1;
    drawNaruto(ctx, naruto);
    // Label
    ctx.fillStyle = '#ff8c00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', naruto.cx, naruto.y - 10);
  } else if (state === 'TRANSITION') {
    drawLobbyBG(ctx);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = clamp(stateTimer / 2, 0, 1);
    ctx.fillRect(0, 0, CW, CH);
    ctx.globalAlpha = 1;
  } else if (state === 'INTRO' || state === 'FIGHT' || state === 'ROUND_END' || state === 'GAME_END') {
    MAPS[mapIdx].draw(ctx);
    drawPetals();
    // Draw fighters
    drawNaruto(ctx, naruto);
    drawZoro(ctx, zoro);
    // Draw effects
    drawParticles();
  }

  ctx.restore();
}

function drawMiniNaruto(g, n) {
  g.fillStyle = '#ff8c00';
  g.fillRect(-12, -90, 24, 50);
  g.fillStyle = '#ff6b00';
  g.fillRect(-10, -42, 8, 42);
  g.fillRect(2, -42, 8, 42);
  g.fillStyle = '#ffcc99';
  g.beginPath(); g.arc(0, -100, 14, 0, 6.28); g.fill();
  g.fillStyle = '#ffd700';
  for (let i = -2; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * 5 - 3, -112); g.lineTo(i * 5 + 3, -112); g.lineTo(i * 5, -122); g.fill();
  }
  g.fillStyle = '#1565c0'; g.fillRect(-15, -112, 30, 5);
  g.fillStyle = '#f5f5f5'; g.fillRect(-10, -92, 20, 6);
}

function drawMiniZoro(g, n) {
  g.fillStyle = '#f5f5f5';
  g.fillRect(-12, -90, 24, 50);
  g.fillStyle = '#1b3a1b';
  g.fillRect(-10, -42, 8, 42);
  g.fillRect(2, -42, 8, 42);
  g.fillStyle = '#ffcc99';
  g.beginPath(); g.arc(0, -100, 14, 0, 6.28); g.fill();
  g.fillStyle = '#2e7d32';
  for (let i = -1; i <= 1; i++) {
    g.beginPath(); g.moveTo(i * 6 - 3, -112); g.lineTo(i * 6 + 3, -112); g.lineTo(i * 6, -120); g.fill();
  }
  g.fillStyle = '#2e7d32'; g.fillRect(-14, -112, 28, 5);
  g.fillStyle = '#2e7d32';
  g.fillRect(-14, -44, 24, 8);
  g.fillStyle = '#9e9e9e';
  g.fillRect(14, -80, 2, 40);
}

// ============================================================
// INIT
// ============================================================
function init() {
  naruto = new Fighter({ name: 'NARUTO', charType: 'naruto', x: 250, y: GROUND_Y - 110, facing: 1 });
  zoro = new Fighter({ name: 'ZORO', charType: 'zoro', x: 900, y: GROUND_Y - 110, facing: -1 });
  initPetals();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(ts) {
  let dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

document.getElementById('menu-screen').style.display = 'flex';
init();
