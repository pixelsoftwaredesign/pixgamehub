const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameover-screen');

let CW, CH;
let gameRunning = false;
let selectedRole = 'assassin';
let city, player;
let citizens = [], policeGuards = [], enemyAssassins = [];
let particles = [];
let killMessages = [];
let keys = {};
let time = 0;
let score = 0;
let killCount = 0;
let citizenCount = 20;
let guardCount = 6;
let assassinCount = 3;
let winCondition = '';
let nightOverlay = true;
let screenShake = 0;

const menuCanvas = document.getElementById('menu-canvas');
const menuCtx = menuCanvas.getContext('2d');
let menuTime = 0;
function animateMenu() {
    if (gameRunning) return;
    menuTime += 0.02;
    menuCtx.fillStyle = '#0a0a14';
    menuCtx.fillRect(0, 0, 600, 280);

    for (let i = 0; i < 8; i++) {
        const x = 50 + i * 70;
        const h = 30 + Math.sin(menuTime + i) * 15;
        menuCtx.fillStyle = `hsl(${220 + i * 10}, 30%, ${15 + Math.sin(menuTime + i) * 5}%)`;
        menuCtx.fillRect(x, 280 - h - 20, 40, h);
        menuCtx.fillStyle = `rgba(255,220,100,${0.2 + 0.1 * Math.sin(menuTime * 2 + i)})`;
        menuCtx.fillRect(x + 10, 280 - h - 15, 8, 6);
    }

    for (let i = 0; i < 12; i++) {
        const lx = 20 + Math.sin(menuTime * 0.5 + i * 0.8) * 280 + 300;
        const ly = 40 + Math.cos(menuTime * 0.3 + i * 1.2) * 30 + 120;
        menuCtx.fillStyle = `rgba(255,${150 + i * 8},50,${0.3 + 0.2 * Math.sin(menuTime + i)})`;
        menuCtx.beginPath();
        menuCtx.arc(lx, ly, 2, 0, Math.PI * 2);
        menuCtx.fill();
    }

    const assassinX = 150 + Math.sin(menuTime) * 60;
    const assassinY = 180 + Math.cos(menuTime * 0.7) * 20;
    menuCtx.fillStyle = '#aa2222';
    menuCtx.beginPath();
    menuCtx.arc(assassinX, assassinY, 8, 0, Math.PI * 2);
    menuCtx.fill();
    menuCtx.fillStyle = '#fff';
    menuCtx.beginPath();
    menuCtx.arc(assassinX + Math.cos(menuTime * 3) * 3, assassinY - 1, 1.5, 0, Math.PI * 2);
    menuCtx.fill();

    const policeX = 350 + Math.cos(menuTime * 0.8) * 50;
    const policeY = 170 + Math.sin(menuTime * 0.6) * 25;
    menuCtx.fillStyle = '#2244aa';
    menuCtx.beginPath();
    menuCtx.arc(policeX, policeY, 8, 0, Math.PI * 2);
    menuCtx.fill();
    menuCtx.fillStyle = '#ffdd00';
    menuCtx.strokeStyle = '#ffdd00';
    menuCtx.lineWidth = 1.5;
    menuCtx.beginPath();
    menuCtx.arc(policeX, policeY, 10, 0, Math.PI * 2);
    menuCtx.stroke();

    requestAnimationFrame(animateMenu);
}
animateMenu();

document.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`.${role}`).classList.add('selected');
}
selectRole('assassin');

function startGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    CW = canvas.width;
    CH = canvas.height;

    menuScreen.style.display = 'none';
    canvas.style.display = 'block';
    hud.style.display = 'block';
    gameOverScreen.style.display = 'none';
    gameRunning = true;

    const MAP_W = 2400;
    const MAP_H = 2000;
    city = new City(MAP_W, MAP_H);

    const sx = 200 + Math.random() * (MAP_W - 400);
    const sy = 200 + Math.random() * (MAP_H - 400);
    player = new Player(sx, sy, selectedRole);

    citizens = [];
    policeGuards = [];
    enemyAssassins = [];
    particles = [];
    killMessages = [];
    score = 0;
    killCount = 0;
    screenShake = 0;

    for (let i = 0; i < citizenCount; i++) {
        let cx, cy, tries = 0;
        do {
            cx = 100 + Math.random() * (MAP_W - 200);
            cy = 100 + Math.random() * (MAP_H - 200);
            tries++;
        } while (city.collides(cx, cy, 10) && tries < 30);
        const c = new AICitizen(cx, cy);
        if (Math.random() < 0.35) c.hasEvidence = true;
        citizens.push(c);
    }

    for (let i = 0; i < guardCount; i++) {
        let gx, gy, tries = 0;
        do {
            gx = 100 + Math.random() * (MAP_W - 200);
            gy = 100 + Math.random() * (MAP_H - 200);
            tries++;
        } while (city.collides(gx, gy, 12) && tries < 30);
        policeGuards.push(new AIPoliceGuard(gx, gy));
    }

    for (let i = 0; i < assassinCount; i++) {
        if (selectedRole === 'assassin' && i === 0) continue;
        let ax, ay, tries = 0;
        do {
            ax = 100 + Math.random() * (MAP_W - 200);
            ay = 100 + Math.random() * (MAP_H - 200);
            tries++;
        } while (city.collides(ax, ay, 10) && tries < 30);
        const ea = new Player(ax, ay, 'assassin');
        ea.isGuard = false;
        ea.aiState = 'wander';
        ea.aiTimer = 0;
        ea.aiTargetX = ax;
        ea.aiTargetY = ay;
        enemyAssassins.push(ea);
    }

    if (selectedRole === 'assassin') {
        winCondition = 'eliminate_all_citizens';
        document.getElementById('objective-display').textContent = '🎯 Élimine tous les citoyens sans te faire voir';
    } else if (selectedRole === 'police') {
        winCondition = 'protect_citizens';
        document.getElementById('objective-display').textContent = '🛡️ Protège les citoyens et arrête les suspects';
    } else {
        winCondition = 'collect_evidence';
        document.getElementById('objective-display').textContent = '🔍 Ramasse les preuves et aide la police';
    }

    updateHUD();
    gameLoop();
}

function restartGame() {
    gameOverScreen.style.display = 'none';
    startGame();
}

function gameLoop() {
    if (!gameRunning) return;
    time++;

    update();
    render();
    updateHUD();

    if (time % 30 === 0) checkWinCondition();

    requestAnimationFrame(gameLoop);
}

function update() {
    if (!player.alive) return;

    player.update(keys, city, 1);

    if (keys['e'] && player.actionCooldown <= 0) {
        performAction();
    }
    if (keys['r'] && player.actionCooldown <= 0) {
        performSecondary();
    }

    for (const c of citizens) c.update(city, player, 1);
    for (const g of policeGuards) g.update(city, player, citizens, [player, ...enemyAssassins], 1);
    for (const ea of enemyAssassins) updateEnemyAssassin(ea, 1);

    updateParticles();

    if (screenShake > 0) screenShake -= 0.5;
}

function updateEnemyAssassin(ea, dt) {
    if (!ea.alive) return;
    if (ea.stunTimer > 0) { ea.stunTimer -= dt; return; }
    if (ea.actionCooldown > 0) ea.actionCooldown -= dt;
    if (ea.revealTimer > 0) ea.revealTimer -= dt;

    ea.aiTimer -= dt;

    if (ea.aiState === 'wander') {
        const dx = ea.aiTargetX - ea.x;
        const dy = ea.aiTargetY - ea.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10 || ea.aiTimer <= 0) {
            let tx, ty, tries = 0;
            do {
                tx = 100 + Math.random() * (city.w - 200);
                ty = 100 + Math.random() * (city.h - 200);
                tries++;
            } while (city.collides(tx, ty, ea.r) && tries < 10);
            ea.aiTargetX = tx;
            ea.aiTargetY = ty;
            ea.aiTimer = 120 + Math.random() * 180;
        } else {
            const mx = (dx / dist) * ea.speed * 0.8;
            const my = (dy / dist) * ea.speed * 0.8;
            const nx = ea.x + mx;
            const ny = ea.y + my;
            if (!city.collides(nx, ea.y, ea.r)) ea.x = nx;
            if (!city.collides(ea.x, ny, ea.r)) ea.y = ny;
            ea.facing = Math.atan2(dy, dx);
        }

        let closestCitizen = null;
        let closestDist = 120;
        for (const c of citizens) {
            if (!c.alive) continue;
            const d = ea.distTo(c);
            if (d < closestDist) {
                closestDist = d;
                closestCitizen = c;
            }
        }

        if (closestCitizen && Math.random() < 0.02) {
            ea.aiState = 'hunting';
            ea.aiTarget = closestCitizen;
            ea.aiTimer = 180;
        }
    } else if (ea.aiState === 'hunting') {
        if (!ea.aiTarget || !ea.aiTarget.alive || ea.aiTimer <= 0) {
            ea.aiState = 'wander';
            ea.aiTimer = 60;
            return;
        }

        const dx = ea.aiTarget.x - ea.x;
        const dy = ea.aiTarget.y - ea.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ea.facing = Math.atan2(dy, dx);

        if (dist > 25) {
            const mx = (dx / dist) * ea.speed;
            const my = (dy / dist) * ea.speed;
            const nx = ea.x + mx;
            const ny = ea.y + my;
            if (!city.collides(nx, ea.y, ea.r)) ea.x = nx;
            if (!city.collides(ea.x, ny, ea.r)) ea.y = ny;
        } else {
            ea.aiTarget.takeDamage(100);
            ea.revealTimer = 180;
            addKillMessage(`🗡️ Un citoyen a été éliminé !`);
            spawnParticles(ea.aiTarget.x, ea.aiTarget.y, '#ff4444', 15);
            screenShake = 8;

            for (const g of policeGuards) {
                if (g.alive && g.distTo(ea) < 250) {
                    g.alerted = true;
                    g.suspect = ea;
                    g.state = 'chase';
                }
            }

            ea.aiState = 'flee';
            ea.aiTimer = 120;
        }
    } else if (ea.aiState === 'flee') {
        const dx = ea.x - (ea.aiTarget ? ea.aiTarget.x : ea.x);
        const dy = ea.y - (ea.aiTarget ? ea.aiTarget.y : ea.y);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const mx = (dx / dist) * ea.speed * 1.5;
        const my = (dy / dist) * ea.speed * 1.5;
        const nx = ea.x + mx;
        const ny = ea.y + my;
        if (!city.collides(nx, ea.y, ea.r)) ea.x = nx;
        if (!city.collides(ea.x, ny, ea.r)) ea.y = ny;
        ea.facing = Math.atan2(my, mx);

        if (ea.aiTimer <= 0) {
            ea.aiState = 'wander';
            ea.aiTimer = 60;
        }
    }

    ea.x = Math.max(ea.r, Math.min(city.w - ea.r, ea.x));
    ea.y = Math.max(ea.r, Math.min(city.h - ea.r, ea.y));
}

function performAction() {
    player.actionCooldown = player.getWeaponCooldown();

    if (player.role === 'assassin') {
        let closest = null;
        let closestDist = player.getWeaponRange();
        for (const c of citizens) {
            if (!c.alive) continue;
            const d = player.distTo(c);
            if (d < closestDist) { closestDist = d; closest = c; }
        }
        for (const g of policeGuards) {
            if (!g.alive) continue;
            const d = player.distTo(g);
            if (d < closestDist) { closestDist = d; closest = g; }
        }
        if (player.distTo(player) < 10) {}

        if (closest) {
            closest.takeDamage(player.getWeaponDamage());
            player.revealTimer = 150;
            spawnParticles(closest.x, closest.y, '#ff4444', 12);
            screenShake = 6;

            if (!closest.alive) {
                player.kills++;
                score += 100;
                addKillMessage(`🗡️ ${player.role === 'assassin' ? 'Tu' : 'Un joueur'} as éliminé ${closest instanceof AICitizen ? 'un citoyen' : 'un policier'} !`);
                spawnParticles(closest.x, closest.y, '#ff0000', 20);
                screenShake = 10;

                for (const g of policeGuards) {
                    if (g.alive && g.distTo(player) < 280) {
                        g.alerted = true;
                        g.suspect = player;
                        g.state = 'chase';
                    }
                }
                for (const c of citizens) {
                    if (c.alive && c.distTo(player) < 150) {
                        c.panicLevel = 1;
                    }
                }
            }
        }
    } else if (player.role === 'police') {
        let closest = null;
        let closestDist = player.getWeaponRange();
        const allTargets = [...citizens, ...enemyAssassins, player];
        for (const t of allTargets) {
            if (!t.alive || t === player) continue;
            const d = player.distTo(t);
            if (d < closestDist) { closestDist = d; closest = t; }
        }

        if (closest) {
            if (closest instanceof Player && closest.role === 'assassin') {
                closest.takeDamage(player.getWeaponDamage());
                spawnParticles(closest.x, closest.y, '#4488ff', 10);
                if (!closest.alive) {
                    player.kills++;
                    score += 200;
                    addKillMessage(`🔫 Tu as neutralisé l'assassin !`);
                    spawnParticles(closest.x, closest.y, '#4488ff', 20);
                    screenShake = 10;
                }
            } else if (closest instanceof AICitizen) {
                player.hp = Math.max(0, player.hp - 15);
                addKillMessage(`⚠️ Tu as blessé un citoyen ! -15 HP`);
                screenShake = 5;
                if (player.hp <= 0) player.alive = false;
            }
        }
    } else if (player.role === 'citizen') {
        const ev = city.findNearestEvidence(player.x, player.y, 30);
        if (ev) {
            ev.found = true;
            player.evidence++;
            score += 50;
            addKillMessage(`🔍 Preuve collectée ! (${player.evidence})`);
            spawnParticles(ev.x, ev.y, '#ffdd00', 8);

            for (const g of policeGuards) {
                if (g.alive && g.distTo(player) < 200) {
                    g.alerted = true;
                    g.state = 'chase';
                }
            }
        }
    }
}

function performSecondary() {
    player.actionCooldown = 30;

    if (player.role === 'assassin' && player.grenades > 0) {
        player.grenades--;
        const gx = player.x + Math.cos(player.facing) * 50;
        const gy = player.y + Math.sin(player.facing) * 50;
        player.smokeActive = true;
        player.smokeTimer = 180;
        player.smokeX = gx;
        player.smokeY = gy;
        spawnParticles(gx, gy, '#888888', 25);
        addKillMessage(`💨 Fumigène déployé !`);
    } else if (player.role === 'police' && player.ammo > 0) {
        player.ammo--;
        const bx = player.x + Math.cos(player.facing) * 15;
        const by = player.y + Math.sin(player.facing) * 15;
        const ex = player.x + Math.cos(player.facing) * 250;
        const ey = player.y + Math.sin(player.facing) * 250;

        spawnParticles(bx, by, '#ffaa00', 5);
        spawnParticles(ex, ey, '#ffff00', 3);
        screenShake = 3;

        for (const c of citizens) {
            if (c.alive && player.distTo(c) < 250) {
                const angle = Math.atan2(c.y - player.y, c.x - player.x);
                const diff = Math.abs(angle - player.facing);
                if (diff < 0.4 || diff > Math.PI * 2 - 0.4) {
                    c.takeDamage(80);
                    if (!c.alive) {
                        player.hp = Math.max(0, player.hp - 20);
                        addKillMessage(`💀 Citoyen tué par balle ! -20 HP`);
                    }
                }
            }
        }

        for (const ea of enemyAssassins) {
            if (ea.alive && player.distTo(ea) < 250) {
                const angle = Math.atan2(ea.y - player.y, ea.x - player.x);
                const diff = Math.abs(angle - player.facing);
                if (diff < 0.4 || diff > Math.PI * 2 - 0.4) {
                    ea.takeDamage(80);
                    if (!ea.alive) {
                        player.kills++;
                        score += 200;
                        addKillMessage(`🔫 Assassin neutralisé par balle !`);
                    }
                }
            }
        }
    } else if (player.role === 'citizen') {
        for (const g of policeGuards) {
            if (g.alive && player.distTo(g) < 120) {
                g.alerted = true;
                addKillMessage(`📢 Alerte envoyée au policier !`);
                break;
            }
        }
    }
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color: color,
            r: 1 + Math.random() * 2
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.98;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function addKillMessage(msg) {
    killMessages.push({ text: msg, time: 180 });
    if (killMessages.length > 5) killMessages.shift();
    const feed = document.getElementById('kill-feed');
    feed.innerHTML = '';
    for (const m of killMessages) {
        const div = document.createElement('div');
        div.className = 'kill-msg';
        div.textContent = m.text;
        feed.appendChild(div);
    }
}

function checkWinCondition() {
    const aliveCitizens = citizens.filter(c => c.alive).length;
    const aliveAssassins = enemyAssassins.filter(e => e.alive).length + (player.alive && player.role === 'assassin' ? 1 : 0);

    if (winCondition === 'eliminate_all_citizens') {
        if (aliveCitizens === 0 && player.alive) {
            endGame('VICTOIRE', 'Tu as éliminé tous les citoyens !', score);
        } else if (!player.alive) {
            endGame('DÉFAITE', 'Tu as été neutralisé...', score);
        }
    } else if (winCondition === 'protect_citizens') {
        if (!player.alive) {
            endGame('DÉFAITE', 'Tu as été éliminé...', score);
        } else if (aliveAssassins === 0) {
            endGame('VICTOIRE', 'Tous les assassins ont été neutralisés !', score);
        } else if (aliveCitizens === 0) {
            endGame('DÉFAITE', 'Tous les citoyens ont été éliminés...', score);
        }
    } else if (winCondition === 'collect_evidence') {
        if (!player.alive) {
            endGame('DÉFAITE', 'Tu as été éliminé...', score);
        } else if (player.evidence >= 5) {
            endGame('VICTOIRE', 'Preuves suffisantes collectées !', score);
        } else if (aliveCitizens === 0) {
            endGame('DÉFAITE', 'Plus de citoyens à protéger...', score);
        }
    }
}

function endGame(title, text, finalScore) {
    gameRunning = false;
    gameOverScreen.style.display = 'flex';
    document.getElementById('go-title').textContent = title;
    document.getElementById('go-title').style.color = title === 'VICTOIRE' ? '#44cc44' : '#ff4444';
    document.getElementById('go-text').textContent = text;
    document.getElementById('go-stats').textContent = `Score: ${finalScore} | Kills: ${player.kills} | Preuves: ${player.evidence}`;
}

function render() {
    ctx.save();

    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
        shakeX = (Math.random() - 0.5) * screenShake * 2;
        shakeY = (Math.random() - 0.5) * screenShake * 2;
    }

    const camX = player.x - CW / 2 + shakeX;
    const camY = player.y - CH / 2 + shakeY;

    city.render(ctx, camX, camY, CW, CH, time);

    for (const c of citizens) {
        const sx = c.x - camX;
        const sy = c.y - camY;
        if (sx > -50 && sx < CW + 50 && sy > -50 && sy < CH + 50) {
            c.render(ctx, camX, camY, time);
        }
    }

    for (const g of policeGuards) {
        const sx = g.x - camX;
        const sy = g.y - camY;
        if (sx > -50 && sx < CW + 50 && sy > -50 && sy < CH + 50) {
            g.render(ctx, camX, camY, time);
        }
    }

    for (const ea of enemyAssassins) {
        const sx = ea.x - camX;
        const sy = ea.y - camY;
        if (sx > -50 && sx < CW + 50 && sy > -50 && sy < CH + 50) {
            ea.render(ctx, camX, camY, time);
        }
    }

    if (player.alive) {
        player.render(ctx, camX, camY, time);
    }

    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y - camY, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (nightOverlay) {
        ctx.save();
        const playerSX = CW / 2;
        const playerSY = CH / 2;
        const visionR = player.role === 'police' ? 220 : 180;

        ctx.fillStyle = 'rgba(5,5,15,0.55)';
        ctx.fillRect(0, 0, CW, CH);

        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(playerSX, playerSY, 0, playerSX, playerSY, visionR);
        grad.addColorStop(0, 'rgba(0,0,0,0.7)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CW, CH);

        for (const sl of city.streetLights) {
            const lx = sl.x - camX;
            const ly = sl.y - camY;
            if (lx > -100 && lx < CW + 100 && ly > -100 && ly < CH + 100) {
                const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, sl.radius * 0.6);
                lg.addColorStop(0, 'rgba(0,0,0,0.4)');
                lg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = lg;
                ctx.fillRect(lx - sl.radius, ly - sl.radius, sl.radius * 2, sl.radius * 2);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    renderMinimap(camX, camY);
    renderKillFeed();

    ctx.restore();
}

function renderMinimap(camX, camY) {
    const mc = document.getElementById('minimap-canvas');
    const mctx = mc.getContext('2d');
    const mw = mc.width;
    const mh = mc.height;
    const scaleX = mw / city.w;
    const scaleY = mh / city.h;

    mctx.fillStyle = '#0a0a14';
    mctx.fillRect(0, 0, mw, mh);

    mctx.fillStyle = '#1a1a25';
    for (const b of city.buildings) {
        mctx.fillRect(b.x * scaleX - b.w * scaleX / 2, b.y * scaleY - b.h * scaleY / 2, b.w * scaleX, b.h * scaleY);
    }

    for (const c of citizens) {
        if (!c.alive) continue;
        mctx.fillStyle = '#22aa44';
        mctx.fillRect(c.x * scaleX - 1, c.y * scaleY - 1, 2, 2);
    }

    for (const g of policeGuards) {
        if (!g.alive) continue;
        mctx.fillStyle = '#4488ff';
        mctx.fillRect(g.x * scaleX - 1.5, g.y * scaleY - 1.5, 3, 3);
    }

    for (const ea of enemyAssassins) {
        if (!ea.alive) continue;
        mctx.fillStyle = '#ff4444';
        mctx.fillRect(ea.x * scaleX - 1.5, ea.y * scaleY - 1.5, 3, 3);
    }

    if (player.alive) {
        mctx.fillStyle = '#ffffff';
        mctx.beginPath();
        mctx.arc(player.x * scaleX, player.y * scaleY, 3, 0, Math.PI * 2);
        mctx.fill();
    }

    mctx.strokeStyle = 'rgba(255,255,255,0.2)';
    mctx.lineWidth = 1;
    mctx.strokeRect(
        camX * scaleX, camY * scaleY,
        CW * scaleX, CH * scaleY
    );
}

function renderKillFeed() {
    const feed = document.getElementById('kill-feed');
    feed.innerHTML = '';
    for (const m of killMessages) {
        const div = document.createElement('div');
        div.className = 'kill-msg';
        div.textContent = m.text;
        feed.appendChild(div);
    }
    killMessages = killMessages.filter(m => m.time-- > 0);
}

function updateHUD() {
    const roleEl = document.getElementById('role-display');
    const roleNames = { assassin: '🗡️ ASSASSIN', police: '🔫 POLICE', citizen: '🚶 CITOYEN' };
    const roleColors = { assassin: '#ff4444', police: '#4488ff', citizen: '#44cc44' };
    roleEl.textContent = roleNames[player.role];
    roleEl.style.color = roleColors[player.role];
    roleEl.style.borderColor = roleColors[player.role];

    document.getElementById('score-display').textContent = score;

    const hpBar = document.getElementById('hp-bar');
    hpBar.style.width = (player.hp / player.maxHp * 100) + '%';

    const wpnNames = { knife: 'COUTEAU', pistol: 'PISTOLET', fist: 'POINGS', grenade: 'GRENADE' };
    document.getElementById('weapon-name').textContent = wpnNames[player.currentWeapon];

    const ammoEl = document.getElementById('ammo-count');
    if (player.role === 'police') {
        ammoEl.textContent = `${player.ammo} balles`;
    } else if (player.role === 'assassin') {
        ammoEl.textContent = `${player.grenades} grenades`;
    } else {
        ammoEl.textContent = `${player.evidence} preuves`;
    }

    const aliveCitizens = citizens.filter(c => c.alive).length;
    const aliveAssassins = enemyAssassins.filter(e => e.alive).length + (player.role === 'assassin' && player.alive ? 1 : 0);

    if (player.role === 'assassin') {
        document.getElementById('objective-display').textContent = `Citoyens: ${aliveCitizens} | Police: ${policeGuards.filter(g => g.alive).length}`;
    } else if (player.role === 'police') {
        document.getElementById('objective-display').textContent = `Citoyens: ${aliveCitizens} | Suspects: ${aliveAssassins}`;
    } else {
        document.getElementById('objective-display').textContent = `Citoyens: ${aliveCitizens} | Preuves: ${player.evidence}/5`;
    }
}

window.addEventListener('resize', () => {
    if (!gameRunning) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    CW = canvas.width;
    CH = canvas.height;
});
