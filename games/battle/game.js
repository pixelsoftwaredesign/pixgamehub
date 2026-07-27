// ============================================================
//  Fort2D – Battle Royale  (complete game.js)
// ============================================================

// ── canvas ───────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── helpers ──────────────────────────────────────────────────
const PI = Math.PI, TAU = PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    return Math.hypot(cx - nx, cy - ny) < cr;
}

function pointInPoly(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i][0], yi = verts[i][1];
        const xj = verts[j][0], yj = verts[j][1];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
}

// ── config ───────────────────────────────────────────────────
const MAP = 4000;
const PLAYER_R = 14;
const PLAYER_SPEED = 200;
const SPRINT_MULT = 1.6;
const MAX_HP = 100;
const MAX_SHIELD = 100;
const BOT_COUNT = 49;

const WEAPONS = {
    pickaxe: { name: 'Pickaxe', type: 'melee', dmg: 22, rate: 0.45, range: 55, spread: 0, mag: Infinity, reload: 0, matBonus: true, color: '#bbb' },
    pistol:  { name: 'Pistol',  type: 'hitscan', dmg: 18, rate: 0.22, range: 420, spread: 0.06, mag: 15, reload: 1.2, color: '#ddd' },
    shotgun: { name: 'Shotgun', type: 'hitscan', dmg: 75, rate: 0.85, range: 190, spread: 0.18, mag: 5, reload: 1.8, pellets: 8, color: '#e8a030' },
    ar:      { name: 'AR',      type: 'hitscan', dmg: 20, rate: 0.11, range: 520, spread: 0.05, mag: 30, reload: 1.6, color: '#4a4' },
    sniper:  { name: 'Sniper',  type: 'hitscan', dmg: 95, rate: 1.4, range: 850, spread: 0.008, mag: 5, reload: 2.2, color: '#55f' },
    smg:     { name: 'SMG',     type: 'hitscan', dmg: 13, rate: 0.065, range: 310, spread: 0.11, mag: 30, reload: 1.4, color: '#d44' }
};
const WEAPON_KEYS = ['pickaxe', 'pistol', 'shotgun', 'ar', 'sniper', 'smg'];

const MAT_COST = { wall: 10, ramp: 10, floor: 10 };
const MAT_HP = { wood: { wall: 150, ramp: 150, floor: 150 }, stone: { wall: 300, ramp: 300, floor: 300 }, metal: { wall: 500, ramp: 500, floor: 500 } };
const MAT_COLORS = { wood: '#a0662b', stone: '#7a7a7a', metal: '#b0bec5' };

const STORM_PHASES = [
    { wait: 30, shrink: 40, dmg: 1, pct: 1.0 },
    { wait: 25, shrink: 35, dmg: 1, pct: 0.65 },
    { wait: 22, shrink: 30, dmg: 2, pct: 0.40 },
    { wait: 18, shrink: 25, dmg: 5, pct: 0.22 },
    { wait: 15, shrink: 20, dmg: 8, pct: 0.10 },
    { wait: 12, shrink: 15, dmg: 10, pct: 0.03 }
];

// ── input ────────────────────────────────────────────────────
const keys = {};
const mouse = { x: W / 2, y: H / 2, left: false, right: false, worldX: 0, worldY: 0 };
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') game.togglePause();
    if (game.state === 'playing' || game.state === 'bus') {
        if (e.code === 'KeyQ') game.player.startBuild('wall');
        if (e.code === 'KeyE') game.player.startBuild('ramp');
        if (e.code === 'KeyF') game.player.startBuild('floor');
        if (e.code === 'KeyG') game.player.destroyNearby();
        if (e.code === 'KeyX') game.player.switchWeapon('pickaxe');
        if (e.code === 'KeyR') game.player.reload();
        const n = parseInt(e.key);
        if (n >= 1 && n <= 5 && game.player.weapons[n - 1])
            game.player.switchWeapon(game.player.weapons[n - 1]);
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
    if (game.state === 'bus') { game.dropPlayer(); return; }
    if (game.state === 'playing') game.player.shoot();
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── particles ────────────────────────────────────────────────
const particles = [];
function spawnParticles(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const s = rand(speed * 0.3, speed);
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, maxLife: life, color, r: rand(1.5, 3.5) });
    }
}

// ── bullets ──────────────────────────────────────────────────
const bullets = [];

// ── kill feed ────────────────────────────────────────────────
const killFeed = [];
function addKill(msg) {
    killFeed.unshift({ msg, time: 4 });
    if (killFeed.length > 6) killFeed.pop();
}

// ── loot ─────────────────────────────────────────────────────
const lootItems = [];

// ── map objects ──────────────────────────────────────────────
const trees = [];
const rocks = [];
const mapBuildings = [];
const structures = [];   // player-built

// ── storm ────────────────────────────────────────────────────
const storm = {
    cx: MAP / 2, cy: MAP / 2, radius: MAP * 0.58,
    targetCx: MAP / 2, targetCy: MAP / 2, targetRadius: MAP * 0.58,
    phase: 0, timer: 30, shrinking: false, shrinkTimer: 0, dmg: 1,
    startRadius: MAP * 0.58
};

function resetStorm() {
    Object.assign(storm, {
        cx: MAP / 2, cy: MAP / 2, radius: MAP * 0.58,
        targetCx: MAP / 2, targetCy: MAP / 2, targetRadius: MAP * 0.58,
        phase: 0, timer: STORM_PHASES[0].wait, shrinking: false, shrinkTimer: 0, dmg: 1
    });
}

function updateStorm(dt) {
    if (storm.shrinking) {
        storm.shrinkTimer -= dt;
        const t = clamp(1 - storm.shrinkTimer / STORM_PHASES[storm.phase].shrink, 0, 1);
        storm.cx = lerp(storm.cx, storm.targetCx, dt * 2);
        storm.cy = lerp(storm.cy, storm.targetCy, dt * 2);
        storm.radius = lerp(storm.radius, storm.targetRadius, dt * 2);
        if (storm.shrinkTimer <= 0) {
            storm.shrinking = false;
            storm.phase++;
            if (storm.phase < STORM_PHASES.length) storm.timer = STORM_PHASES[storm.phase].wait;
        }
    } else {
        storm.timer -= dt;
        if (storm.timer <= 0 && storm.phase < STORM_PHASES.length) {
            const p = STORM_PHASES[storm.phase];
            storm.targetRadius = MAP * 0.58 * p.pct;
            storm.targetCx = clamp(storm.cx + rand(-200, 200), storm.targetRadius + 100, MAP - storm.targetRadius - 100);
            storm.targetCy = clamp(storm.cy + rand(-200, 200), storm.targetRadius + 100, MAP - storm.targetRadius - 100);
            storm.shrinkTimer = p.shrink;
            storm.shrinking = true;
            storm.dmg = p.dmg;
        }
    }
}

function inStorm(x, y) {
    return Math.hypot(x - storm.cx, y - storm.cy) > storm.radius;
}

// ── map generation ───────────────────────────────────────────
function generateMap() {
    trees.length = 0;
    rocks.length = 0;
    mapBuildings.length = 0;
    lootItems.length = 0;
    structures.length = 0;
    bullets.length = 0;
    particles.length = 0;
    killFeed.length = 0;

    // trees
    for (let i = 0; i < 300; i++) {
        trees.push({ x: rand(100, MAP - 100), y: rand(100, MAP - 100), hp: 100, maxHp: 100, r: rand(22, 42), trunkR: rand(6, 10) });
    }
    // rocks
    for (let i = 0; i < 120; i++) {
        rocks.push({ x: rand(100, MAP - 100), y: rand(100, MAP - 100), hp: 120, maxHp: 120, r: rand(14, 26) });
    }
    // buildings
    const bw = [120, 160, 200, 250];
    for (let i = 0; i < 25; i++) {
        const w = bw[randInt(0, 3)];
        const h = bw[randInt(0, 3)];
        mapBuildings.push({
            x: rand(200, MAP - 200 - w), y: rand(200, MAP - 200 - h),
            w, h, color: `hsl(${randInt(20, 35)},${randInt(20, 40)}%,${randInt(25, 40)}%)`
        });
    }
    // chest loot
    for (let i = 0; i < 60; i++) {
        lootItems.push({ x: rand(150, MAP - 150), y: rand(150, MAP - 150), type: 'chest', taken: false });
    }
    // floor weapons
    const floorWeapons = ['pistol', 'shotgun', 'ar', 'smg', 'sniper'];
    for (let i = 0; i < 90; i++) {
        lootItems.push({ x: rand(150, MAP - 150), y: rand(150, MAP - 150), type: 'weapon', weapon: floorWeapons[randInt(0, 4)], taken: false });
    }
    // health / shield pickups
    for (let i = 0; i < 50; i++) {
        lootItems.push({ x: rand(150, MAP - 150), y: rand(150, MAP - 150), type: Math.random() < 0.5 ? 'health' : 'shield', taken: false });
    }
}

// ── entity helpers ───────────────────────────────────────────
function collidesBuilding(x, y, r, ignore) {
    for (const b of mapBuildings) {
        if (circleRect(x, y, r, b.x, b.y, b.w, b.h)) return b;
    }
    for (const s of structures) {
        if (s === ignore) continue;
        if (s.type === 'wall') {
            const a = s.angle || 0;
            const hw = 60, hh = 6;
            const cos = Math.cos(-a), sin = Math.sin(-a);
            const dx = x - s.x, dy = y - s.y;
            const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
            if (Math.abs(lx) < hw + r && Math.abs(ly) < hh + r) return s;
        }
        if (s.type === 'floor') {
            if (Math.abs(x - s.x) < 60 + r && Math.abs(y - s.y) < 6 + r) return s;
        }
        if (s.type === 'ramp') {
            const hw = 60;
            if (Math.abs(x - s.x) < hw + r && Math.abs(y - s.y) < 60 + r) return s;
        }
    }
    return null;
}

function bulletHitsObstacle(bx, by, ex, ey) {
    for (const b of mapBuildings) {
        if (lineRect(bx, by, ex, ey, b.x, b.y, b.w, b.h)) return true;
    }
    for (const s of structures) {
        if (s.type === 'wall') {
            const hw = 60, hh = 6;
            if (lineRect(bx, by, ex, ey, s.x - hw, s.y - hh, hw * 2, hh * 2)) return s;
        }
        if (s.type === 'floor') {
            if (lineRect(bx, by, ex, ey, s.x - 60, s.y - 6, 120, 12)) return s;
        }
    }
    return false;
}

function lineRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    const left = lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bot = lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
    return left || right || top || bot;
}

function lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function collidesEntity(x, y, r, arr, ignore) {
    for (const e of arr) {
        if (e === ignore || e.dead) continue;
        if (dist({ x, y }, e) < r + e.r) return e;
    }
    return null;
}

function moveEntity(e, dx, dy, dt) {
    const nx = e.x + dx * dt;
    const ny = e.y + dy * dt;
    const nr = e.r || PLAYER_R;
    if (nx - nr < 0 || nx + nr > MAP) dx = 0;
    if (ny - nr < 0 || ny + nr > MAP) dy = 0;
    let blocked = false;
    if (collidesBuilding(nx, e.y, nr, e.buildIgnore)) { dx = 0; blocked = true; }
    if (collidesBuilding(e.x, ny, nr, e.buildIgnore)) { dy = 0; blocked = true; }
    if (!blocked) {
        if (collidesBuilding(nx, ny, nr, e.buildIgnore)) {
            // try x only or y only
            if (!collidesBuilding(nx, e.y, nr, e.buildIgnore)) dy = 0;
            else if (!collidesBuilding(e.x, ny, nr, e.buildIgnore)) dx = 0;
            else { dx = 0; dy = 0; }
        }
    }
    e.x = clamp(e.x + dx * dt, nr, MAP - nr);
    e.y = clamp(e.y + dy * dt, nr, MAP - nr);
}

// ── Player ───────────────────────────────────────────────────
class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.r = PLAYER_R;
        this.hp = MAX_HP; this.shield = 0;
        this.angle = 0;
        this.speed = PLAYER_SPEED;
        this.weapons = ['pickaxe', null, null, null, null];
        this.weaponIndex = 0;
        this.ammo = {};
        this.mats = { wood: 0, stone: 0, metal: 0 };
        this.matType = 'wood';
        this.cooldown = 0;
        this.reloadTimer = 0;
        this.reloading = false;
        this.buildMode = null;
        this.buildIgnore = null;
        this.kills = 0;
        this.dead = false;
        this.inBus = true;
        this.parachute = false;
        this.vy = 0;
        this.buildIgnore = this;
        this.name = 'You';
        this.color = '#2196F3';
        this.flashTimer = 0;
        this.sprinting = false;
    }

    get weapon() { return this.weapons[this.weaponIndex]; }
    get weaponData() { return this.weapon ? WEAPONS[this.weapon] : WEAPONS.pickaxe; }

    switchWeapon(w) {
        const idx = this.weapons.indexOf(w);
        if (idx !== -1) {
            this.weaponIndex = idx;
            this.buildMode = null;
            this.reloading = false;
        }
    }

    reload() {
        const w = this.weaponData;
        if (!w || w.type !== 'hitscan' || this.reloading) return;
        const max = w.mag;
        if ((this.ammo[this.weapon] || 0) >= max) return;
        this.reloading = true;
        this.reloadTimer = w.reload;
    }

    startBuild(type) {
        if (this.buildMode === type) { this.buildMode = null; return; }
        this.buildMode = type;
        this.weaponIndex = 0;
        this.reloading = false;
    }

    placeBuild() {
        if (!this.buildMode) return;
        const cost = MAT_COST[this.buildMode];
        if (this.mats[this.matType] < cost) return;
        const d = 65;
        const bx = this.x + Math.cos(this.angle) * d;
        const by = this.y + Math.sin(this.angle) * d;
        if (collidesBuilding(bx, by, 10, null)) return;
        if (bx < 20 || bx > MAP - 20 || by < 20 || by > MAP - 20) return;
        this.mats[this.matType] -= cost;
        structures.push({
            x: bx, y: by, type: this.buildMode, mat: this.matType,
            hp: MAT_HP[this.matType][this.buildMode],
            maxHp: MAT_HP[this.matType][this.buildMode],
            angle: this.buildMode === 'wall' ? this.angle : (this.buildMode === 'ramp' ? this.angle : 0),
            builtBy: this
        });
    }

    destroyNearby() {
        let closest = null, closestD = 80;
        for (const s of structures) {
            const d = dist(this, s);
            if (d < closestD) { closestD = d; closest = s; }
        }
        if (closest) {
            closest.hp -= 40;
            spawnParticles(closest.x, closest.y, MAT_COLORS[closest.mat], 8, 120, 0.4);
            if (closest.hp <= 0) {
                structures.splice(structures.indexOf(closest), 1);
                spawnParticles(closest.x, closest.y, MAT_COLORS[closest.mat], 15, 160, 0.5);
            }
        }
    }

    shoot() {
        if (this.dead || this.cooldown > 0 || this.reloading) return;
        const w = this.weaponData;
        if (w.type === 'melee') {
            this.meleeAttack();
            return;
        }
        if ((this.ammo[this.weapon] || 0) <= 0) { this.reload(); return; }
        this.ammo[this.weapon]--;
        const pellets = w.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * w.spread * 2;
            const a = this.angle + spread;
            bullets.push({
                x: this.x + Math.cos(a) * 18,
                y: this.y + Math.sin(a) * 18,
                vx: Math.cos(a) * 1200,
                vy: Math.sin(a) * 1200,
                life: w.range / 1200,
                dmg: w.dmg / (w.pellets || 1),
                owner: this,
                trail: []
            });
        }
        this.cooldown = w.rate;
        spawnParticles(this.x + Math.cos(this.angle) * 18, this.y + Math.sin(this.angle) * 18, '#ff0', 3, 80, 0.15);
    }

    meleeAttack() {
        const w = this.weaponData;
        const targets = [...game.bots];
        for (const t of targets) {
            if (t.dead) continue;
            if (dist(this, t) < w.range + t.r) {
                const da = Math.abs(angle(this, t) - this.angle);
                if (da < PI * 0.6) {
                    this.damageEntity(t, w.dmg);
                }
            }
        }
        // harvest
        for (const tree of trees) {
            if (dist(this, tree) < w.range + tree.r) {
                tree.hp -= w.dmg;
                const amt = this.matType === 'wood' ? 8 : 4;
                this.mats[this.matType] += amt;
                spawnParticles(tree.x, tree.y, '#5a3', 5, 100, 0.3);
                if (tree.hp <= 0) {
                    this.mats.wood += 30;
                    spawnParticles(tree.x, tree.y, '#5a3', 20, 180, 0.6);
                }
                break;
            }
        }
        for (const rock of rocks) {
            if (dist(this, rock) < w.range + rock.r) {
                rock.hp -= w.dmg;
                const amt = this.matType === 'stone' ? 8 : 4;
                this.mats[this.matType] += amt;
                spawnParticles(rock.x, rock.y, '#888', 5, 100, 0.3);
                if (rock.hp <= 0) {
                    this.mats.stone += 30;
                    spawnParticles(rock.x, rock.y, '#888', 20, 180, 0.6);
                }
                break;
            }
        }
        this.cooldown = w.rate;
    }

    damageEntity(target, dmg) {
        let actual = dmg;
        if (target.shield > 0) {
            const absorbed = Math.min(target.shield, actual);
            target.shield -= absorbed;
            actual -= absorbed;
        }
        target.hp -= actual;
        target.flashTimer = 0.12;
        spawnParticles(target.x, target.y, '#f44', 6, 100, 0.3);
        if (target.hp <= 0) {
            target.hp = 0;
            target.dead = true;
            this.kills++;
            const name = target.name || 'Bot';
            addKill(`${this.name} eliminated ${name} with ${this.weaponData.name}`);
        }
    }

    takeDamage(dmg, attacker) {
        if (this.dead) return;
        let actual = dmg;
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, actual);
            this.shield -= absorbed;
            actual -= absorbed;
        }
        this.hp -= actual;
        this.flashTimer = 0.12;
        spawnParticles(this.x, this.y, '#f44', 5, 100, 0.3);
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            const name = attacker ? (attacker.name || 'Bot') : 'Storm';
            addKill(`${name} eliminated ${this.name}`);
            game.onPlayerDeath();
        }
    }

    pickUpLoot() {
        for (const l of lootItems) {
            if (l.taken || dist(this, l) > 40) continue;
            if (l.type === 'chest') {
                l.taken = true;
                const weps = ['pistol', 'shotgun', 'ar', 'smg', 'sniper'];
                const got = weps[randInt(0, 4)];
                this.addWeapon(got);
                this.mats.wood += randInt(30, 60);
                this.mats.stone += randInt(20, 40);
                this.mats.metal += randInt(10, 30);
                if (Math.random() < 0.4) this.shield = Math.min(MAX_SHIELD, this.shield + 50);
                spawnParticles(l.x, l.y, '#FFD700', 12, 140, 0.5);
            } else if (l.type === 'weapon') {
                this.addWeapon(l.weapon);
                l.taken = true;
                spawnParticles(l.x, l.y, '#aaf', 6, 80, 0.3);
            } else if (l.type === 'health') {
                if (this.hp < MAX_HP) {
                    this.hp = Math.min(MAX_HP, this.hp + 25);
                    l.taken = true;
                    spawnParticles(l.x, l.y, '#4f4', 6, 80, 0.3);
                }
            } else if (l.type === 'shield') {
                if (this.shield < MAX_SHIELD) {
                    this.shield = Math.min(MAX_SHIELD, this.shield + 25);
                    l.taken = true;
                    spawnParticles(l.x, l.y, '#48f', 6, 80, 0.3);
                }
            }
        }
    }

    addWeapon(w) {
        const empty = this.weapons.indexOf(null);
        if (empty !== -1) {
            this.weapons[empty] = w;
            this.ammo[w] = WEAPONS[w].mag;
        } else if (!this.weapons.includes(w)) {
            this.weapons[this.weaponIndex === 0 ? 1 : this.weaponIndex] = w;
            this.ammo[w] = WEAPONS[w].mag;
        } else {
            this.ammo[w] = WEAPONS[w].mag;
        }
    }

    update(dt) {
        if (this.dead || this.inBus) return;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo[this.weapon] = this.weaponData.mag;
                this.reloading = false;
            }
        }

        // mouse world position
        mouse.worldX = mouse.x - W / 2 + game.camera.x;
        mouse.worldY = mouse.y - H / 2 + game.camera.y;
        this.angle = Math.atan2(mouse.worldY - this.y, mouse.worldX - this.x);

        // movement
        let dx = 0, dy = 0;
        if (keys['KeyW'] || keys['KeyZ']) dy = -1;
        if (keys['KeyS']) dy = 1;
        if (keys['KeyA'] || keys['KeyQ']) dx = -1;
        if (keys['KeyD']) dx = 1;
        if (dx || dy) {
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;
        }
        this.sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
        const spd = this.speed * (this.sprinting ? SPRINT_MULT : 1);
        moveEntity(this, dx * spd, dy * spd, dt);

        // auto-fire
        if (mouse.left && this.cooldown <= 0 && !this.reloading) {
            if (this.buildMode) this.placeBuild();
            else this.shoot();
        }

        // pick up loot
        this.pickUpLoot();

        // cycle mat type
        if (keys['Digit7']) this.matType = 'wood';
        if (keys['Digit8']) this.matType = 'stone';
        if (keys['Digit9']) this.matType = 'metal';

        // storm damage
        if (inStorm(this.x, this.y)) {
            this.takeDamage(storm.dmg * dt, null);
        }
    }
}

// ── Bot ──────────────────────────────────────────────────────
class Bot extends Player {
    constructor(x, y, idx) {
        super(x, y);
        this.name = `Bot${idx}`;
        this.state = 'wander';
        this.target = null;
        this.moveTarget = { x: x, y: y };
        this.stateTimer = 0;
        this.color = `hsl(${randInt(0, 360)},60%,50%)`;
        this.buildCooldown = 0;
        this.skill = rand(0.3, 1.0);
        // give random weapons
        const weps = ['pistol', 'shotgun', 'ar', 'smg'];
        this.weapons[0] = 'pickaxe';
        const numW = randInt(1, 3);
        const pool = [...weps];
        for (let i = 0; i < numW && pool.length; i++) {
            const wi = randInt(0, pool.length - 1);
            this.addWeapon(pool.splice(wi, 1)[0]);
        }
        if (Math.random() < 0.3) this.weapons[randInt(1, 4)] = 'sniper';
        this.weaponIndex = randInt(1, 4);
        while (!this.weapons[this.weaponIndex] && this.weaponIndex > 0) this.weaponIndex--;
        this.mats.wood = randInt(20, 100);
        this.mats.stone = randInt(10, 60);
        this.mats.metal = randInt(0, 30);
    }

    updateBot(dt, allBots) {
        if (this.dead || this.inBus) return;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo[this.weapon] = this.weaponData.mag;
                this.reloading = false;
            }
        }
        if (this.buildCooldown > 0) this.buildCooldown -= dt;

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.changeState(allBots);

        // storm
        if (inStorm(this.x, this.y)) {
            this.takeDamage(storm.dmg * dt, null);
            if (this.state !== 'flee') this.changeState(allBots);
        }

        // auto fire if target
        if (this.target && !this.target.dead) {
            this.angle = angle(this, this.target);
            const d = dist(this, this.target);
            if (d < this.weaponData.range && this.cooldown <= 0 && !this.reloading) {
                this.shoot();
            }
        }

        switch (this.state) {
            case 'wander':
                this.moveToward(this.moveTarget, dt, this.speed * 0.7);
                break;
            case 'loot':
                this.moveToward(this.moveTarget, dt, this.speed * 0.9);
                if (dist(this, this.moveTarget) < 35) this.pickUpLoot();
                break;
            case 'fight':
                if (this.target && !this.target.dead) {
                    const d = dist(this, this.target);
                    if (d > this.weaponData.range * 0.6) {
                        this.moveToward(this.target, dt, this.speed * 0.85);
                    } else if (d < 100 && this.weapon !== 'shotgun') {
                        // back off for ranged weapons
                        this.moveToward({ x: this.x - (this.target.x - this.x), y: this.y - (this.target.y - this.y) }, dt, this.speed * 0.6);
                    }
                    // build when shot
                    if (this.flashTimer > 0 && this.buildCooldown <= 0 && this.mats[this.matType] >= 10) {
                        this.botBuild();
                    }
                    // heal
                    if (this.hp < 40 && this.mats.wood > 0) this.pickUpLoot();
                } else {
                    this.changeState(allBots);
                }
                break;
            case 'flee':
                this.moveToward(this.moveTarget, dt, this.speed * 1.1);
                break;
        }

        this.pickUpLoot();

        // storm damage
        if (inStorm(this.x, this.y)) {
            // handled above
        }
    }

    changeState(allBots) {
        // check for nearby enemies
        let nearestEnemy = null, nearestDist = 350;
        for (const b of allBots) {
            if (b === this || b.dead || b.inBus) continue;
            const d = dist(this, b);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = b; }
        }
        if (game.player && !game.player.dead && !game.player.inBus) {
            const d = dist(this, game.player);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = game.player; }
        }

        if (inStorm(this.x, this.y)) {
            this.state = 'flee';
            this.moveTarget = { x: storm.cx + rand(-storm.radius * 0.3, storm.radius * 0.3), y: storm.cy + rand(-storm.radius * 0.3, storm.radius * 0.3) };
            this.stateTimer = 2;
            return;
        }

        if (nearestEnemy && nearestDist < 320) {
            this.state = 'fight';
            this.target = nearestEnemy;
            this.stateTimer = rand(2, 4);
            // equip best weapon
            this.autoEquipWeapon(nearestDist);
            return;
        }

        // look for loot
        let nearestLoot = null, lootDist = 300;
        for (const l of lootItems) {
            if (l.taken) continue;
            const d = dist(this, l);
            if (d < lootDist) { lootDist = d; nearestLoot = l; }
        }

        if (nearestLoot && this.hp < 80) {
            this.state = 'loot';
            this.moveTarget = { x: nearestLoot.x, y: nearestLoot.y };
            this.stateTimer = 3;
            return;
        }

        this.state = 'wander';
        this.moveTarget = { x: clamp(this.x + rand(-400, 400), 100, MAP - 100), y: clamp(this.y + rand(-400, 400), 100, MAP - 100) };
        this.stateTimer = rand(2, 5);
    }

    autoEquipWeapon(distToTarget) {
        if (distToTarget < 120) {
            for (let i = 0; i < this.weapons.length; i++) {
                if (this.weapons[i] === 'shotgun') { this.weaponIndex = i; return; }
            }
            for (let i = 0; i < this.weapons.length; i++) {
                if (this.weapons[i] === 'smg') { this.weaponIndex = i; return; }
            }
        } else if (distToTarget < 350) {
            for (let i = 0; i < this.weapons.length; i++) {
                if (this.weapons[i] === 'ar') { this.weaponIndex = i; return; }
            }
        } else {
            for (let i = 0; i < this.weapons.length; i++) {
                if (this.weapons[i] === 'sniper') { this.weaponIndex = i; return; }
            }
        }
    }

    botBuild() {
        if (this.mats[this.matType] < 10) return;
        this.mats[this.matType] -= 10;
        const types = ['wall', 'wall', 'wall', 'floor'];
        const type = types[randInt(0, 3)];
        const a = this.target ? angle(this.target, this) : rand(0, TAU);
        structures.push({
            x: this.x + Math.cos(a) * 50,
            y: this.y + Math.sin(a) * 50,
            type, mat: this.matType,
            hp: MAT_HP[this.matType][type],
            maxHp: MAT_HP[this.matType][type],
            angle: a,
            builtBy: this
        });
        this.buildCooldown = 1.2;
    }

    moveToward(t, dt, spd) {
        const dx = t.x - this.x, dy = t.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 10) return;
        moveEntity(this, (dx / d) * spd, (dy / d) * spd, dt);
    }

    shoot() {
        if (this.cooldown > 0 || this.reloading) return;
        const w = this.weaponData;
        if (w.type === 'melee') {
            if (this.target && dist(this, this.target) < w.range + (this.target.r || PLAYER_R)) {
                this.damageEntity(this.target, w.dmg);
            }
            this.cooldown = w.rate;
            return;
        }
        if ((this.ammo[this.weapon] || 0) <= 0) { this.reload(); return; }
        this.ammo[this.weapon]--;
        const pellets = w.pellets || 1;
        const skillSpread = w.spread * (2 - this.skill);
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * skillSpread * 2;
            const a = this.angle + spread;
            bullets.push({
                x: this.x + Math.cos(a) * 18,
                y: this.y + Math.sin(a) * 18,
                vx: Math.cos(a) * 1200,
                vy: Math.sin(a) * 1200,
                life: w.range / 1200,
                dmg: w.dmg / (w.pellets || 1),
                owner: this,
                trail: []
            });
        }
        this.cooldown = w.rate;
    }
}

// ── Game ─────────────────────────────────────────────────────
class Game {
    constructor() {
        this.state = 'menu';  // menu, bus, playing, paused, victory, defeated
        this.player = null;
        this.bots = [];
        this.camera = { x: MAP / 2, y: MAP / 2 };
        this.alive = 50;
        this.placement = 50;
        this.busX = -100; this.busY = MAP / 2;
        this.busAngle = 0;
        this.busSpeed = 300;
        this.busPath = [];
        this.busIdx = 0;
        this.shakeTimer = 0;
        this.shakeMag = 0;
    }

    start() {
        this.bindUI();
        this.loop(0);
    }

    bindUI() {
        document.getElementById('playBtn').addEventListener('click', () => this.startGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('quitBtn').addEventListener('click', () => this.quitToHub());
        document.getElementById('victoryBackBtn').addEventListener('click', () => this.quitToHub());
        document.getElementById('defeatBackBtn').addEventListener('click', () => this.quitToHub());
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        generateMap();
        resetStorm();
        this.alive = 50;
        this.placement = 50;
        this.state = 'bus';
        // bus path
        this.busX = rand(100, MAP / 2 - 200);
        this.busY = rand(100, MAP - 100);
        this.busAngle = rand(-0.3, 0.3);
        this.bots = [];
        for (let i = 0; i < BOT_COUNT; i++) {
            const bx = rand(200, MAP - 200);
            const by = rand(200, MAP - 200);
            this.bots.push(new Bot(bx, by, i + 1));
        }
        this.player = new Player(0, 0);
        this.player.inBus = true;
        // show bus screen
        document.getElementById('bus-screen').classList.remove('hidden');
    }

    dropPlayer() {
        if (this.state !== 'bus') return;
        this.player.x = this.busX;
        this.player.y = this.busY;
        this.player.inBus = false;
        this.player.parachute = true;
        this.player.vy = 0;
        this.state = 'playing';
        document.getElementById('bus-screen').classList.add('hidden');
        // drop all bots near their positions
        for (const b of this.bots) {
            b.inBus = false;
        }
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pause-menu').classList.add('hidden');
        }
    }

    quitToHub() {
        window.location.href = '../..';
    }

    onPlayerDeath() {
        this.placement = this.alive;
        this.state = 'defeated';
        document.getElementById('defeat-placement').textContent = `#${this.placement} / 50 Players`;
        document.getElementById('defeat-stats').innerHTML =
            `Kills: ${this.player.kills}<br>`;
        document.getElementById('defeat-screen').classList.remove('hidden');
    }

    onVictory() {
        this.state = 'victory';
        document.getElementById('victory-stats').innerHTML =
            `Kills: ${this.player.kills}<br>Players Eliminated: ${50 - this.alive}`;
        document.getElementById('victory-screen').classList.remove('hidden');
    }

    shake(mag, dur) {
        this.shakeMag = mag;
        this.shakeTimer = dur;
    }

    // ── UPDATE ──
    update(dt) {
        if (this.state === 'bus') {
            this.busX += Math.cos(this.busAngle) * this.busSpeed * dt;
            this.busY += Math.sin(this.busAngle) * this.busSpeed * dt + 50 * dt;
            this.camera.x = this.busX;
            this.camera.y = this.busY;
            if (this.busX > MAP + 200 || this.busY > MAP + 200 || this.busX < -200) {
                this.busX = rand(100, 500);
                this.busY = rand(100, MAP - 100);
            }
            return;
        }
        if (this.state !== 'playing') return;

        updateStorm(dt);

        this.player.update(dt);
        if (this.player.parachute) {
            this.player.vy += 200 * dt;
            this.player.y += this.player.vy * dt;
            if (this.player.y >= 200) {
                this.player.parachute = false;
                this.player.y = 200;
                this.player.vy = 0;
            }
        }

        // bots
        for (const b of this.bots) {
            b.updateBot(dt, this.bots);
        }

        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 6) b.trail.shift();
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < 0 || b.x > MAP || b.y < 0 || b.y > MAP) {
                bullets.splice(i, 1);
                continue;
            }
            // hit obstacle
            const hitObs = bulletHitsObstacle(b.trail[b.trail.length - 1]?.x || b.x, b.trail[b.trail.length - 1]?.y || b.y, b.x, b.y);
            if (hitObs) {
                if (hitObs.hp !== undefined) {
                    hitObs.hp -= b.dmg;
                    if (hitObs.hp <= 0) {
                        const idx = structures.indexOf(hitObs);
                        if (idx !== -1) structures.splice(idx, 1);
                    }
                }
                spawnParticles(b.x, b.y, '#ff0', 4, 80, 0.2);
                bullets.splice(i, 1);
                continue;
            }
            // hit players
            let hit = false;
            if (b.owner !== this.player && !this.player.dead && !this.player.inBus) {
                if (dist(b, this.player) < this.player.r + 3) {
                    this.player.takeDamage(b.dmg, b.owner);
                    this.shake(3, 0.1);
                    bullets.splice(i, 1);
                    hit = true;
                }
            }
            if (!hit) {
                for (const bot of this.bots) {
                    if (b.owner === bot || bot.dead) continue;
                    if (dist(b, bot) < bot.r + 3) {
                        bot.takeDamage(b.dmg, b.owner);
                        spawnParticles(bot.x, bot.y, '#f44', 5, 100, 0.3);
                        if (bot.dead) {
                            if (b.owner === this.player) this.player.kills++;
                        }
                        bullets.splice(i, 1);
                        hit = true;
                        break;
                    }
                }
            }
        }

        // player dead from bots killing
        if (this.player.dead && this.state === 'playing') {
            // already handled
        }

        // storm damage for bots
        for (const b of this.bots) {
            if (!b.dead && !b.inBus && inStorm(b.x, b.y)) {
                b.hp -= storm.dmg * dt;
                if (b.hp <= 0) {
                    b.dead = true;
                    b.hp = 0;
                    addKill(`${b.name} was eliminated by the Storm`);
                }
            }
        }

        // update alive count (single source of truth)
        let aliveCount = this.player.dead ? 0 : 1;
        for (const b of this.bots) if (!b.dead) aliveCount++;
        this.alive = aliveCount;
        if (this.alive <= 1 && !this.player.dead && this.state === 'playing') this.onVictory();

        // camera
        const tx = this.player.x, ty = this.player.y;
        this.camera.x = lerp(this.camera.x, tx, 0.08);
        this.camera.y = lerp(this.camera.y, ty, 0.08);
        this.camera.x = clamp(this.camera.x, W / 2, MAP - W / 2);
        this.camera.y = clamp(this.camera.y, H / 2, MAP - H / 2);

        // shake
        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        // particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // kill feed
        for (let i = killFeed.length - 1; i >= 0; i--) {
            killFeed[i].time -= dt;
            if (killFeed[i].time <= 0) killFeed.splice(i, 1);
        }

        // clean taken loot
        for (let i = lootItems.length - 1; i >= 0; i--) {
            if (lootItems[i].taken) lootItems.splice(i, 1);
        }

        // clean dead trees/rocks
        for (let i = trees.length - 1; i >= 0; i--) {
            if (trees[i].hp <= 0) trees.splice(i, 1);
        }
        for (let i = rocks.length - 1; i >= 0; i--) {
            if (rocks[i].hp <= 0) rocks.splice(i, 1);
        }
    }

    // ── RENDER ──
    render() {
        ctx.clearRect(0, 0, W, H);

        if (this.state === 'menu') return;

        const cx = this.camera.x - W / 2 + (this.shakeTimer > 0 ? rand(-this.shakeMag, this.shakeMag) : 0);
        const cy = this.camera.y - H / 2 + (this.shakeTimer > 0 ? rand(-this.shakeMag, this.shakeMag) : 0);

        ctx.save();
        ctx.translate(-cx, -cy);

        this.renderMap(cx, cy);
        this.renderLoot();
        this.renderStructures();
        this.renderTrees();
        this.renderRocks();
        this.renderMapBuildings();
        this.renderBullets();
        this.renderPlayers();
        if (this.player && this.player.buildMode && !this.player.dead) this.renderBuildPreview();
        this.renderStormOverlay(cx, cy);

        ctx.restore();

        this.renderUI();
        this.renderMinimap();
        this.renderKillFeed();
        this.renderStormInfo();
        if (this.state === 'bus') this.renderBusOverlay();
    }

    renderMap(cx, cy) {
        // grass
        ctx.fillStyle = '#4a7c3f';
        ctx.fillRect(0, 0, MAP, MAP);
        // grid
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        const gs = 100;
        const sx = Math.max(0, Math.floor(cx / gs) * gs);
        const sy = Math.max(0, Math.floor(cy / gs) * gs);
        const ex = Math.min(MAP, cx + W + gs);
        const ey = Math.min(MAP, cy + H + gs);
        ctx.beginPath();
        for (let x = sx; x <= ex; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, ey); }
        for (let y = sy; y <= ey; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(ex, y); }
        ctx.stroke();
        // map border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, MAP, MAP);
    }

    renderMapBuildings() {
        for (const b of mapBuildings) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            // windows
            ctx.fillStyle = 'rgba(255,255,200,0.25)';
            const ws = 20, gap = 30;
            for (let wx = b.x + 15; wx < b.x + b.w - 15; wx += gap) {
                for (let wy = b.y + 15; wy < b.y + b.h - 15; wy += gap) {
                    ctx.fillRect(wx, wy, ws, ws);
                }
            }
        }
    }

    renderStructures() {
        for (const s of structures) {
            const mc = MAT_COLORS[s.mat];
            const hpPct = s.hp / s.maxHp;
            ctx.globalAlpha = 0.4 + hpPct * 0.6;
            ctx.fillStyle = mc;
            if (s.type === 'wall') {
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle || 0);
                ctx.fillRect(-60, -6, 120, 12);
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-60, -6, 120, 12);
                ctx.restore();
            } else if (s.type === 'floor') {
                ctx.fillRect(s.x - 60, s.y - 6, 120, 12);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(s.x - 60, s.y - 6, 120, 12);
            } else if (s.type === 'ramp') {
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle || 0);
                ctx.beginPath();
                ctx.moveTo(-60, 30);
                ctx.lineTo(60, -30);
                ctx.lineTo(60, 30);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
    }

    renderTrees() {
        for (const t of trees) {
            // trunk
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.trunkR, 0, TAU);
            ctx.fill();
            // canopy
            ctx.fillStyle = '#2d5a1e';
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#3a7a28';
            ctx.beginPath();
            ctx.arc(t.x - t.r * 0.2, t.y - t.r * 0.2, t.r * 0.6, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            // hp bar
            if (t.hp < t.maxHp) {
                this.drawHpBar(t.x, t.y - t.r - 8, 30, 4, t.hp / t.maxHp, '#4a4');
            }
        }
    }

    renderRocks() {
        for (const r of rocks) {
            ctx.fillStyle = '#757575';
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.arc(r.x - r.r * 0.15, r.y - r.r * 0.15, r.r * 0.55, 0, TAU);
            ctx.fill();
            if (r.hp < r.maxHp) {
                this.drawHpBar(r.x, r.y - r.r - 8, 24, 4, r.hp / r.maxHp, '#888');
            }
        }
    }

    renderLoot() {
        for (const l of lootItems) {
            if (l.taken) continue;
            if (l.type === 'chest') {
                // glow
                ctx.fillStyle = `rgba(255,215,0,${0.15 + Math.sin(Date.now() / 300) * 0.1})`;
                ctx.beginPath();
                ctx.arc(l.x, l.y, 22, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(l.x - 10, l.y - 8, 20, 16);
                ctx.fillStyle = '#DAA520';
                ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
            } else if (l.type === 'weapon') {
                const wc = WEAPONS[l.weapon]?.color || '#fff';
                ctx.fillStyle = wc;
                ctx.fillRect(l.x - 8, l.y - 3, 16, 6);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(l.x - 8, l.y - 3, 16, 2);
            } else if (l.type === 'health') {
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(l.x - 7, l.y - 3, 14, 6);
                ctx.fillRect(l.x - 3, l.y - 7, 6, 14);
            } else if (l.type === 'shield') {
                ctx.fillStyle = '#42a5f5';
                ctx.beginPath();
                ctx.arc(l.x, l.y, 8, 0, TAU);
                ctx.fill();
                ctx.fillStyle = '#1565c0';
                ctx.fillRect(l.x - 3, l.y - 5, 6, 10);
            }
        }
    }

    renderBullets() {
        for (const b of bullets) {
            // trail
            if (b.trail.length > 1) {
                ctx.strokeStyle = 'rgba(255,255,0,0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (const pt of b.trail) ctx.lineTo(pt.x, pt.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, TAU);
            ctx.fill();
        }
    }

    renderPlayers() {
        // bots
        for (const b of this.bots) {
            if (b.dead || b.inBus) continue;
            this.renderCharacter(b, b.color, b.flashTimer > 0);
        }
        // player
        if (this.player && !this.player.dead && !this.player.inBus) {
            this.renderCharacter(this.player, '#2196F3', this.player.flashTimer > 0);
            // build mode indicator
            if (this.player.buildMode) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, 25, 0, TAU);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    renderCharacter(p, color, flash) {
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + p.r + 2, p.r * 0.8, 4, 0, 0, TAU);
        ctx.fill();

        // body
        ctx.fillStyle = flash ? '#fff' : color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // direction indicator
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(p.angle) * p.r * 0.6, p.y + Math.sin(p.angle) * p.r * 0.6, 4, 0, TAU);
        ctx.fill();

        // weapon visual
        const wd = p.weaponData;
        if (wd) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = wd.color || '#888';
            if (wd.type === 'melee') {
                ctx.fillRect(10, -2, 14, 4);
            } else {
                ctx.fillRect(10, -3, 18, 6);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(10, -3, 18, 2);
            }
            ctx.restore();
        }

        // hp bar above
        if (p.hp < MAX_HP || p.shield > 0) {
            this.drawHpBar(p.x, p.y - p.r - 14, 30, 4, p.hp / MAX_HP, '#4caf50');
            if (p.shield > 0) {
                this.drawHpBar(p.x, p.y - p.r - 8, 30, 3, p.shield / MAX_SHIELD, '#42a5f5');
            }
        }

        // name
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - p.r - 18);
    }

    drawHpBar(x, y, w, h, pct, color) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = color;
        ctx.fillRect(x - w / 2, y, w * clamp(pct, 0, 1), h);
    }

    renderBuildPreview() {
        const p = this.player;
        const d = 65;
        const bx = p.x + Math.cos(p.angle) * d;
        const by = p.y + Math.sin(p.angle) * d;
        const valid = !collidesBuilding(bx, by, 10, null) && bx > 20 && bx < MAP - 20 && by > 20 && by < MAP - 20 && p.mats[p.matType] >= MAT_COST[p.buildMode];
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = valid ? '#4f4' : '#f44';
        if (p.buildMode === 'wall') {
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(p.angle || 0);
            ctx.fillRect(-60, -6, 120, 12);
            ctx.restore();
        } else if (p.buildMode === 'floor') {
            ctx.fillRect(bx - 60, by - 6, 120, 12);
        } else if (p.buildMode === 'ramp') {
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(p.angle || 0);
            ctx.beginPath();
            ctx.moveTo(-60, 30);
            ctx.lineTo(60, -30);
            ctx.lineTo(60, 30);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    renderStormOverlay(cx, cy) {
        // draw purple outside the safe zone
        ctx.save();
        ctx.fillStyle = `rgba(100, 0, 180, ${0.22 + Math.sin(Date.now() / 500) * 0.05})`;
        ctx.beginPath();
        ctx.rect(0, 0, MAP, MAP);
        ctx.arc(storm.cx, storm.cy, storm.radius, 0, TAU, true);
        ctx.fill();
        // storm border
        ctx.strokeStyle = 'rgba(180, 80, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(storm.cx, storm.cy, storm.radius, 0, TAU);
        ctx.stroke();
        // target zone
        if (storm.shrinking || storm.timer < STORM_PHASES[storm.phase]?.wait * 0.5) {
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(storm.targetCx, storm.targetCy, storm.targetRadius, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    renderUI() {
        if (!this.player) return;
        const p = this.player;

        // ── bottom bar ──
        const barH = 80;
        const barY = H - barH;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, barY, W, barH);

        // health
        ctx.fillStyle = '#333';
        ctx.fillRect(15, barY + 8, 200, 14);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(15, barY + 8, 200 * (p.hp / MAX_HP), 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(p.hp)} HP`, 115, barY + 19);

        // shield
        ctx.fillStyle = '#333';
        ctx.fillRect(15, barY + 26, 200, 14);
        ctx.fillStyle = '#42a5f5';
        ctx.fillRect(15, barY + 26, 200 * (p.shield / MAX_SHIELD), 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.ceil(p.shield)} Shield`, 115, barY + 37);

        // weapons inventory
        const invX = W / 2 - 175;
        for (let i = 0; i < 5; i++) {
            const ix = invX + i * 72;
            const iy = barY + 10;
            const active = i === p.weaponIndex;
            ctx.fillStyle = active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
            ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = active ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(ix, iy, 64, 52, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#aaa';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}`, ix + 32, iy + 12);
            if (p.weapons[i]) {
                const wd = WEAPONS[p.weapons[i]];
                ctx.fillStyle = wd.color;
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(wd.name, ix + 32, iy + 30);
                if (wd.type === 'hitscan') {
                    ctx.fillStyle = '#ccc';
                    ctx.font = '10px sans-serif';
                    const ammo = p.ammo[p.weapons[i]] || 0;
                    ctx.fillText(`${ammo}/${wd.mag}`, ix + 32, iy + 45);
                }
            } else {
                ctx.fillStyle = '#555';
                ctx.fillText('Empty', ix + 32, iy + 34);
            }
        }

        // resources
        const rx = W - 160;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = MAT_COLORS.wood;
        ctx.fillText(`Wood: ${p.mats.wood}`, rx, barY + 22);
        ctx.fillStyle = MAT_COLORS.stone;
        ctx.fillText(`Stone: ${p.mats.stone}`, rx, barY + 38);
        ctx.fillStyle = MAT_COLORS.metal;
        ctx.fillText(`Metal: ${p.mats.metal}`, rx, barY + 54);
        ctx.fillStyle = p.matType === 'wood' ? '#fff' : '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText(`[7]Wood [8]Stone [9]Metal`, rx - 30, barY + 70);

        // build mode indicator
        if (p.buildMode) {
            ctx.fillStyle = 'rgba(0,150,255,0.8)';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`BUILD: ${p.buildMode.toUpperCase()} (${p.mats[p.matType]} ${p.matType})`, W / 2, barY - 10);
        }

        // reload indicator
        if (p.reloading) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            const pct = 1 - p.reloadTimer / p.weaponData.reload;
            ctx.fillText(`RELOADING ${Math.round(pct * 100)}%`, W / 2, barY - 28);
        }

        // alive count
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Alive: ${this.alive}`, W - 20, 30);

        // crosshair (if playing)
        if (this.state === 'playing' && !p.dead) {
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            const cr = 12;
            ctx.beginPath();
            ctx.moveTo(mouse.x - cr, mouse.y); ctx.lineTo(mouse.x + cr, mouse.y);
            ctx.moveTo(mouse.x, mouse.y - cr); ctx.lineTo(mouse.x, mouse.y + cr);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 3, 0, TAU);
            ctx.stroke();
        }
    }

    renderMinimap() {
        const s = 170;
        const mx = W - s - 14;
        const my = 50;
        const scale = s / MAP;

        // bg
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(mx - 2, my - 2, s + 4, s + 4);
        ctx.fillStyle = '#3a5c2a';
        ctx.fillRect(mx, my, s, s);

        // buildings
        ctx.fillStyle = 'rgba(100,70,50,0.5)';
        for (const b of mapBuildings) {
            ctx.fillRect(mx + b.x * scale, my + b.y * scale, b.w * scale, b.h * scale);
        }

        // storm
        ctx.strokeStyle = 'rgba(180,80,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx + storm.cx * scale, my + storm.cy * scale, storm.radius * scale, 0, TAU);
        ctx.stroke();

        // storm fill
        ctx.fillStyle = 'rgba(100,0,180,0.25)';
        ctx.beginPath();
        ctx.rect(mx, my, s, s);
        ctx.arc(mx + storm.cx * scale, my + storm.cy * scale, storm.radius * scale, 0, TAU, true);
        ctx.fill();

        // enemies (nearby)
        if (this.player && !this.player.dead) {
            for (const b of this.bots) {
                if (b.dead) continue;
                const d = dist(this.player, b);
                if (d < 800) {
                    ctx.fillStyle = '#f44';
                    ctx.fillRect(mx + b.x * scale - 1.5, my + b.y * scale - 1.5, 3, 3);
                }
            }
            // player
            ctx.fillStyle = '#2196F3';
            ctx.beginPath();
            ctx.arc(mx + this.player.x * scale, my + this.player.y * scale, 3, 0, TAU);
            ctx.fill();
        }

        // border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, s, s);

        // label
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MAP', mx + 4, my + 10);
    }

    renderKillFeed() {
        ctx.textAlign = 'left';
        let ky = 50;
        for (const k of killFeed) {
            const alpha = Math.min(1, k.time);
            ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
            ctx.fillRect(W - 320, ky - 12, 304, 18);
            ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
            ctx.font = '11px sans-serif';
            ctx.fillText(k.msg, W - 314, ky);
            ky += 20;
        }
    }

    renderStormInfo() {
        if (this.state !== 'playing') return;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(W / 2 - 80, 8, 160, 28);
        ctx.fillStyle = '#b480ff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        if (storm.shrinking) {
            ctx.fillText(`Storm shrinking... ${Math.ceil(storm.shrinkTimer)}s`, W / 2, 26);
        } else if (storm.phase < STORM_PHASES.length) {
            ctx.fillText(`Next storm in ${Math.ceil(storm.timer)}s`, W / 2, 26);
        } else {
            ctx.fillText('Final Storm', W / 2, 26);
        }
    }

    renderBusOverlay() {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        // draw bus
        const bx = this.busX, by = this.busY;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(this.busAngle);
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(-30, -10, 60, 20);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-20, -6, 15, 12);
        // balloon
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.ellipse(0, -25, 18, 22, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    // ── MAIN LOOP ──
    loop(ts) {
        const dt = Math.min((ts - (this._last || ts)) / 1000, 0.05);
        this._last = ts;
        this.update(dt);
        this.render();
        requestAnimationFrame(t => this.loop(t));
    }
}

// ── roundRect polyfill ──
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
        this.closePath();
    };
}

// ── INIT ──
const game = new Game();
game.start();
