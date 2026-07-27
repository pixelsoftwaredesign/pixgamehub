(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 500;

    // ── PIXEL CHARACTERS (from characters.js) ──
    const CHAR_LIST = Object.values(CHARACTERS).filter(c =>
        ['knight','berserker','mage','ninja','paladin','archer'].includes(c.id)
    );
    const CHAR_MAP = {};
    CHAR_LIST.forEach(c => { CHAR_MAP[c.id] = c; });

    const STATS = {};
    Object.values(CHARACTERS).forEach(c => {
        STATS[c.id] = {
            speed: c.speed,
            jump: c.jump,
            hp: c.hp,
            dmg: c.attackPower,
            atkSpd: c.attackSpeed,
            range: c.range,
        };
    });

    const MAPS = [
        { id:'arena', name:'Arène', bg:'#1a1a2e', ground:'#3a3a4e', accent:'#ff4400' },
        { id:'forest', name:'Forêt', bg:'#0a1a0a', ground:'#2a4a1a', accent:'#44ff44' },
        { id:'lava', name:'Lave', bg:'#2a0a0a', ground:'#4a2a0a', accent:'#ff8800' },
        { id:'ice', name:'Glace', bg:'#0a1a2a', ground:'#2a4a6a', accent:'#88ddff' },
        { id:'castle', name:'Château', bg:'#1a1a1a', ground:'#3a3a3a', accent:'#ffcc00' },
    ];

    // Effects manager from renderer.js
    const effects = new EffectsManager();
    const camera = new Camera(canvas);

    // ── PLAYER CONTROLS ──
    const PLAYER_KEYS = [
        { left:'KeyA', right:'KeyD', up:'KeyW', down:'KeyS', atk:'KeyF', spl:'KeyG', block:'KeyS' },
        { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', atk:'Numpad1', spl:'Numpad2', block:'ArrowDown' },
        { left:'KeyJ', right:'KeyL', up:'KeyI', down:'KeyK', atk:'Numpad4', spl:'Numpad5', block:'KeyK' },
        { left:'Numpad4', right:'Numpad6', up:'Numpad8', down:'Numpad5', atk:'Numpad0', spl:'NumpadDecimal', block:'Numpad5' },
    ];

    // ── GAME STATE ──
    let state = 'menu';
    let mode = 'versus';
    let players = [];
    let bots = [];
    let particles = [];
    let projectiles = [];
    let platforms = [];
    let keys = {};
    let frame = 0;
    let timer = 99;
    let timerInterval = null;
    let round = 1;
    let scores = [0, 0];
    let maxRounds = 3;
    let currentMap = MAPS[0];
    let winner = null;
    let shakeTimer = 0;
    let slowTimer = 0;

    // ── INPUT ──
    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Escape' && state === 'playing') togglePause();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    // ── MENU SETUP ──
    function setupMenu() {
        // Mode buttons
        document.querySelectorAll('.mode-select .pixel-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.mode-select .pixel-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                mode = btn.dataset.mode;
            };
        });

        // Character cards
        ['p1-chars','p2-chars'].forEach((id, pi) => {
            const grid = document.getElementById(id);
            CHAR_LIST.forEach((c, ci) => {
                const card = document.createElement('div');
                card.className = 'char-card' + (ci === (pi === 0 ? 0 : 1) ? ' selected' : '');
                card.dataset.char = c.id;
                card.dataset.player = pi;
                const cvs = document.createElement('canvas');
                cvs.width = 28; cvs.height = 32;
                drawCharPreview(cvs, c);
                card.innerHTML = '';
                card.appendChild(cvs);
                const name = document.createElement('div');
                name.className = 'char-name';
                name.textContent = c.name;
                card.appendChild(name);
                card.onclick = () => {
                    grid.querySelectorAll('.char-card').forEach(cc => cc.classList.remove('selected'));
                    card.classList.add('selected');
                };
                grid.appendChild(card);
            });
        });

        // Map cards
        const mapGrid = document.getElementById('map-grid');
        MAPS.forEach((m, i) => {
            const card = document.createElement('div');
            card.className = 'map-card' + (i === 0 ? ' selected' : '');
            card.dataset.map = m.id;
            const cvs = document.createElement('canvas');
            cvs.width = 80; cvs.height = 50;
            drawMapPreview(cvs, m);
            card.appendChild(cvs);
            const label = document.createElement('span');
            label.textContent = m.name;
            label.style.position = 'relative';
            label.style.zIndex = 1;
            card.appendChild(label);
            card.onclick = () => {
                mapGrid.querySelectorAll('.map-card').forEach(cc => cc.classList.remove('selected'));
                card.classList.add('selected');
                currentMap = m;
            };
            mapGrid.appendChild(card);
        });

        // Title animation
        animateTitle();

        // Start button
        document.getElementById('start-btn').onclick = () => { Juice.initAudio(); Juice.SFX.ui_select(); startGame(); };
        document.getElementById('resume-btn').onclick = togglePause;
        document.getElementById('quit-btn').onclick = () => { location.reload(); };
        document.getElementById('rematch-btn').onclick = startGame;
        document.getElementById('menu-btn').onclick = () => { location.reload(); };
    }

    function drawCharPreview(cvs, char) {
        const c = cvs.getContext('2d');
        c.fillStyle = '#111'; c.fillRect(0,0,28,32);
        const ps = 3;
        const sprite = char.sprite ? char.sprite.body : [[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[0,1,2,1,2,1,0],[0,1,1,1,1,1,0],[0,0,1,0,1,0,0],[0,1,1,1,1,1,0],[0,1,0,1,0,1,0]];
        sprite.forEach((row, y) => {
            row.forEach((v, x) => {
                if (v === 1) c.fillStyle = char.color;
                else if (v === 2) c.fillStyle = char.skinColor || '#ffcc88';
                else return;
                c.fillRect(x * ps + 4, y * ps + 4, ps, ps);
            });
        });
    }

    function drawMapPreview(cvs, map) {
        const c = cvs.getContext('2d');
        c.fillStyle = map.bg; c.fillRect(0,0,80,50);
        c.fillStyle = map.ground; c.fillRect(0,40,80,10);
        c.fillStyle = map.accent;
        for (let i = 0; i < 4; i++) {
            c.fillRect(10 + i * 20, 35, 12, 2);
        }
        c.fillStyle = map.accent;
        c.globalAlpha = 0.3;
        c.beginPath(); c.arc(65, 12, 6, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
    }

    function animateTitle() {
        const cvs = document.getElementById('title-preview');
        const c = cvs.getContext('2d');
        c.fillStyle = '#111'; c.fillRect(0,0,320,80);

        // Two fighters
        const f1x = 80 + Math.sin(frame * 0.03) * 20;
        const f2x = 240 + Math.sin(frame * 0.03 + Math.PI) * 20;
        drawPixelFighter(c, f1x, 50, '#4488ff', frame);
        drawPixelFighter(c, f2x, 50, '#ff4444', frame + 30);

        // Clash sparks
        if (frame % 40 < 8) {
            c.fillStyle = '#ff0';
            const cx = 160;
            for (let i = 0; i < 5; i++) {
                const a = i * Math.PI / 2.5 + frame * 0.2;
                c.fillRect(cx + Math.cos(a) * 12, 40 + Math.sin(a) * 12, 2, 2);
            }
        }

        // Ground
        c.fillStyle = '#333'; c.fillRect(0, 58, 320, 2);

        frame++;
        requestAnimationFrame(animateTitle);
    }

    function drawPixelFighter(c, x, y, color, f) {
        const walk = Math.sin(f * 0.15);
        // Body
        c.fillStyle = color;
        c.fillRect(x - 4, y - 6, 8, 10);
        // Head
        c.fillStyle = '#ffcc88';
        c.fillRect(x - 3, y - 12, 6, 6);
        // Eyes
        c.fillStyle = '#000';
        c.fillRect(x - 2, y - 10, 2, 2);
        c.fillRect(x + 1, y - 10, 2, 2);
        // Legs
        c.fillStyle = color;
        c.fillRect(x - 3, y + 4, 3, 5 + walk);
        c.fillRect(x + 1, y + 4, 3, 5 - walk);
    }

    // ── START GAME ──
    function startGame() {
        const p1Card = document.querySelector('#p1-chars .char-card.selected');
        const p2Card = document.querySelector('#p2-chars .char-card.selected');
        const p1Char = CHAR_MAP[p1Card.dataset.char];
        const p2Char = CHAR_MAP[p2Card.dataset.char];

        document.getElementById('hud-name-1').textContent = p1Char.name.toUpperCase();
        document.getElementById('hud-name-2').textContent = p2Char.name.toUpperCase();

        platforms = generatePlatforms(currentMap);
        particles = [];
        projectiles = [];
        Juice.clear();
        Juice.clearDamageNumbers();
        Juice.clearFlashes();
        Juice.initAudio();
        scores = [0, 0];
        round = 1;

        players = [
            createPlayer(0, p1Char, PLAYER_KEYS[0], '#4488ff'),
        ];

        if (mode === 'versus' || mode === 'ffa') {
            players.push(createPlayer(1, p2Char, PLAYER_KEYS[1], '#ff4444'));
        }

        if (mode === 'coop') {
            players.push(createPlayer(1, p2Char, PLAYER_KEYS[1], '#44ff44'));
            bots = [createBot(CHAR_LIST[2], '#ff8800', 400)];
            bots.push(createBot(CHAR_LIST[3], '#ff44ff', 600));
        }

        if (mode === 'ffa') {
            bots = [
                createBot(CHAR_LIST[2], '#ff8800', 200),
                createBot(CHAR_LIST[3], '#ff44ff', 600),
            ];
        }

        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';
        canvas.style.display = 'block';
        state = 'playing';
        startTimer();
        gameLoop();
    }

    function createPlayer(id, char, keys, color) {
        const stats = STATS[char.id];
        return {
            id, char, keys, color,
            x: 100 + id * 500, y: 300,
            vx: 0, vy: 0,
            w: 16, h: 22,
            hp: stats.hp, maxHp: stats.hp,
            sp: 0, maxSp: 100,
            stats,
            facing: id === 0 ? 1 : -1,
            grounded: false,
            attacking: false, atkTimer: 0, atkCooldown: 0,
            blocking: false,
            dashTimer: 0, dashCooldown: 0,
            hitstun: 0, invTimer: 0,
            combo: 0, comboTimer: 0,
            wins: 0,
            walkFrame: 0,
        };
    }

    function createBot(char, color, x) {
        const stats = STATS[char.id];
        return {
            id: bots.length + 2, char, color,
            x, y: 300, vx: 0, vy: 0,
            w: 16, h: 22,
            hp: stats.hp, maxHp: stats.hp,
            sp: 0, maxSp: 100,
            stats,
            facing: 1,
            grounded: false,
            attacking: false, atkTimer: 0, atkCooldown: 0,
            blocking: false,
            dashTimer: 0, dashCooldown: 0,
            hitstun: 0, invTimer: 0,
            combo: 0, comboTimer: 0,
            wins: 0,
            walkFrame: 0,
            ai: true, aiTimer: 0, aiTarget: null, aiState: 'wander',
        };
    }

    function generatePlatforms(map) {
        const plats = [
            { x: 0, y: 460, w: 800, h: 40, type: 'ground' },
            { x: 100, y: 350, w: 120, h: 12, type: 'float' },
            { x: 300, y: 300, w: 120, h: 12, type: 'float' },
            { x: 500, y: 350, w: 120, h: 12, type: 'float' },
            { x: 200, y: 220, w: 100, h: 12, type: 'float' },
            { x: 550, y: 250, w: 100, h: 12, type: 'float' },
        ];
        return plats;
    }

    // ── TIMER ──
    function startTimer() {
        timer = 99;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (state === 'playing' && --timer <= 0) {
                timer = 0;
                endRound();
            }
        }, 1000);
    }

    function togglePause() {
        if (state === 'playing') {
            state = 'paused';
            document.getElementById('pause-screen').style.display = 'flex';
        } else if (state === 'paused') {
            state = 'playing';
            document.getElementById('pause-screen').style.display = 'none';
            gameLoop();
        }
    }

    // ── UPDATE ──
    function update() {
        if (state !== 'playing') return;

        const allFighters = [...players, ...bots];

        // Update players
        players.forEach(p => updateFighter(p, keys));
        bots.forEach(b => updateBot(b, allFighters));
        allFighters.forEach(f => {
            updatePhysics(f);
            if (f.comboTimer > 0) f.comboTimer--;
            else f.combo = 0;
            if (f.invTimer > 0) f.invTimer--;
            if (f.hitstun > 0) f.hitstun--;
            if (f.dashCooldown > 0) f.dashCooldown--;
            if (f.atkCooldown > 0) f.atkCooldown--;
        });

        // Projectile updates
        projectiles.forEach((pr, i) => {
            pr.x += pr.vx;
            pr.y += pr.vy;
            pr.life--;
            if (pr.life <= 0) { projectiles.splice(i, 1); return; }
            allFighters.forEach(f => {
                if (f.id !== pr.owner && Math.abs(f.x - pr.x) < 14 && Math.abs(f.y - pr.y) < 14) {
                    dealDamage(f, pr.dmg, pr.knx, pr.dir);
                    projectiles.splice(i, 1);
                }
            });
        });

        // Particle updates
        particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            p.vy += p.grav || 0;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        });

        // Check win condition
        const alive = allFighters.filter(f => f.hp > 0);
        if (alive.length <= 1) endRound();

        // Update HUD
        updateHUD();

        if (shakeTimer > 0) shakeTimer--;
        if (slowTimer > 0) slowTimer--;
    }

    function updateFighter(f, inputKeys) {
        if (f.hitstun > 0) { f.vx *= 0.8; return; }

        const k = f.keys;
        f.blocking = inputKeys[k.block] && f.grounded && !f.attacking;

        if (f.blocking) { f.vx *= 0.5; return; }

        // Movement
        if (inputKeys[k.left]) { f.vx = -f.stats.speed; f.facing = -1; f.walkFrame++; }
        else if (inputKeys[k.right]) { f.vx = f.stats.speed; f.facing = 1; f.walkFrame++; }
        else { f.vx *= 0.7; }

        // Jump
        if (inputKeys[k.up] && f.grounded) {
            f.vy = -f.stats.jump;
            f.grounded = false;
            Juice.Effects.dustRun(f.x, f.y + f.h / 2, f.facing);
            Juice.SFX.jump(f.x / 800 * 2 - 1);
        }

        // Attack
        if (inputKeys[k.atk] && f.atkCooldown <= 0 && !f.attacking) {
            f.attacking = true;
            f.atkTimer = 12;
            f.atkCooldown = Math.floor(20 / f.stats.atkSpd);
        }

        // Special
        if (inputKeys[k.spl] && f.sp >= 100 && f.atkCooldown <= 0) {
            f.attacking = true;
            f.atkTimer = 20;
            f.atkCooldown = 30;
            f.sp = 0;
            Juice.SFX.special(f.x / 800 * 2 - 1);
            Juice.Effects.energyBurst(f.x, f.y, f.color);
            Juice.slowMotion(0.3, 12);
            Juice.shake(8, 10);
            setTimeout(() => {
                const target = f.facing > 0 ? f.x + 30 : f.x - 30;
                [...players, ...bots].forEach(ot => {
                    if (ot.id !== f.id && Math.abs(ot.x - target) < 40 && Math.abs(ot.y - f.y) < 30) {
                        dealDamage(ot, f.stats.dmg * 2.5, 12, f.facing);
                        Juice.Effects.critSparks(ot.x, ot.y);
                    }
                });
                Juice.Effects.energyBurst(target, f.y, '#fff');
            }, 200);
        }

        if (f.attacking) {
            f.atkTimer--;
            if (f.atkTimer === 6) {
                // Hit frame
                const atkX = f.x + f.facing * f.stats.range / 2;
                const pan = f.x / 800 * 2 - 1;
                [...players, ...bots].forEach(ot => {
                    if (ot.id !== f.id && Math.abs(ot.x - atkX) < f.stats.range && Math.abs(ot.y - f.y) < 25) {
                        f.combo++;
                        f.comboTimer = 40;
                        const mult = f.combo > 2 ? 1.5 : 1;
                        const isCrit = f.combo > 3;
                        dealDamage(ot, f.stats.dmg * mult, 6, f.facing);
                        if (isCrit) {
                            Juice.Effects.critSparks(ot.x, ot.y);
                            Juice.SFX.crit(pan);
                        } else {
                            Juice.Effects.hitSparks(ot.x, ot.y, f.color);
                            Juice.SFX.punch(pan);
                        }
                        f.sp = Math.min(f.maxSp, f.sp + 12);
                    }
                });
                Juice.Effects.slashTrail(atkX, f.y, f.facing, f.color);
                Juice.SFX.woosh(pan);
            }
            if (f.atkTimer <= 0) f.attacking = false;
        }
    }

    function updateBot(bot, allFighters) {
        if (bot.hitstun > 0) { bot.vx *= 0.8; return; }

        bot.aiTimer--;
        const enemies = allFighters.filter(f => f.id !== bot.id);
        let target = enemies[0];
        let minDist = 999;
        enemies.forEach(e => {
            const d = Math.abs(e.x - bot.x);
            if (d < minDist) { minDist = d; target = e; }
        });

        if (!target) return;

        // AI behavior
        const dir = target.x > bot.x ? 1 : -1;
        bot.facing = dir;

        if (minDist > 80) {
            bot.vx = dir * bot.stats.speed * 0.7;
            bot.walkFrame++;
        } else if (minDist < 30) {
            bot.vx = -dir * bot.stats.speed * 0.3;
        } else {
            bot.vx *= 0.7;
        }

        // Jump occasionally
        if (bot.grounded && Math.random() < 0.02) {
            bot.vy = -bot.stats.jump;
            bot.grounded = false;
        }

        // Attack
        if (minDist < bot.stats.range + 10 && bot.atkCooldown <= 0 && Math.random() < 0.08) {
            bot.attacking = true;
            bot.atkTimer = 12;
            bot.atkCooldown = Math.floor(25 / bot.stats.atkSpd);
        }

        // Special
        if (bot.sp >= 100 && minDist < 60 && bot.atkCooldown <= 0 && Math.random() < 0.03) {
            bot.attacking = true;
            bot.atkTimer = 20;
            bot.atkCooldown = 30;
            bot.sp = 0;
            Juice.SFX.special(bot.x / 800 * 2 - 1);
            Juice.Effects.energyBurst(bot.x, bot.y, bot.color);
            Juice.shake(6, 8);
            setTimeout(() => {
                enemies.forEach(ot => {
                    if (Math.abs(ot.x - bot.x) < 50 && Math.abs(ot.y - bot.y) < 30) {
                        dealDamage(ot, bot.stats.dmg * 2, 10, dir);
                        Juice.Effects.critSparks(ot.x, ot.y);
                    }
                });
            }, 200);
        }

        if (bot.attacking) {
            bot.atkTimer--;
            if (bot.atkTimer === 6) {
                const atkX = bot.x + dir * bot.stats.range / 2;
                const pan = bot.x / 800 * 2 - 1;
                enemies.forEach(ot => {
                    if (Math.abs(ot.x - atkX) < bot.stats.range && Math.abs(ot.y - bot.y) < 25) {
                        bot.combo++;
                        bot.comboTimer = 40;
                        dealDamage(ot, bot.stats.dmg, 5, dir);
                        Juice.Effects.hitSparks(ot.x, ot.y, bot.color);
                        Juice.SFX.punch(pan);
                        bot.sp = Math.min(bot.maxSp, bot.sp + 10);
                    }
                });
                Juice.Effects.slashTrail(atkX, bot.y, dir, bot.color);
            }
            if (bot.atkTimer <= 0) bot.attacking = false;
        }
    }

    function updatePhysics(f) {
        // Gravity
        f.vy += 0.55;
        if (f.vy > 14) f.vy = 14;

        f.x += f.vx;
        f.y += f.vy;

        // Platform collision
        f.grounded = false;
        platforms.forEach(p => {
            if (f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w &&
                f.y + f.h / 2 > p.y && f.y + f.h / 2 < p.y + p.h + 8 && f.vy >= 0) {
                f.y = p.y - f.h / 2;
                f.vy = 0;
                f.grounded = true;
            }
        });

        // Bounds
        if (f.x < 16) f.x = 16;
        if (f.x > 784) f.x = 784;
        if (f.y > 520) {
            f.hp -= 20;
            f.x = 400; f.y = 200; f.vy = -8;
            spawnParticles(f.x, f.y, '#f00', 10, 1);
            shakeTimer = 5;
            if (f.hp <= 0) f.hp = 1;
        }
    }

    function dealDamage(f, dmg, knockback, dir) {
        if (f.invTimer > 0) return;
        if (f.blocking) {
            effects.particles.emitSparks(f.x, f.y);
            Juice.SFX.block(f.x / 800 * 2 - 1);
            f.sp = Math.min(f.maxSp, f.sp + 5);
            return;
        }
        const pan = f.x / 800 * 2 - 1;
        f.hp -= dmg;
        f.hitstun = 8;
        f.invTimer = 10;
        f.vx = knockback * dir;
        f.vy = -3;

        const isCrit = dmg > 15;
        Juice.shake(isCrit ? 6 : 3, isCrit ? 8 : 4);
        Juice.SFX.hurt(pan);
        effects.floatingTexts.addDamage(f.x, f.y - 20, Math.floor(dmg), isCrit);
        effects.particles.emitHit(f.x, f.y);
        effects.screenFlash.color = '#fff';
        effects.screenFlash.duration = 0.2;

        const target = f.id < players.length ? players[f.id] : f;
        target.sp = Math.min(target.maxSp, target.sp + dmg * 0.5);
    }

    function spawnParticles(x, y, color, count, size) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 1) * 4,
                size: size || 2,
                color,
                life: 15 + Math.random() * 15,
                grav: 0.1,
            });
        }
    }

    function endRound() {
        clearInterval(timerInterval);
        const allFighters = [...players, ...bots];
        const alive = allFighters.filter(f => f.hp > 0);

        if (alive.length === 1) {
            const winnerF = alive[0];
            if (winnerF.id < players.length) {
                scores[winnerF.id]++;
            }
            winnerF.wins++;
        } else {
            // Most HP wins
            alive.sort((a, b) => b.hp - a.hp);
            if (alive[0].id < players.length) scores[alive[0].id]++;
        }

        if (scores[0] >= Math.ceil(maxRounds / 2) || scores[1] >= Math.ceil(maxRounds / 2) || round >= maxRounds) {
            showResult();
        } else {
            round++;
            resetRound();
        }
    }

    function resetRound() {
        const allFighters = [...players, ...bots];
        allFighters.forEach((f, i) => {
            f.hp = f.maxHp;
            f.sp = 0;
            f.x = 100 + i * 200;
            f.y = 300;
            f.vx = 0; f.vy = 0;
            f.hitstun = 0; f.invTimer = 0;
            f.attacking = false; f.blocking = false;
        });
        startTimer();
    }

    function showResult() {
        state = 'result';
        clearInterval(timerInterval);
        const winnerIdx = scores[0] > scores[1] ? 0 : 1;
        const winnerChar = players[winnerIdx] ? players[winnerIdx].char : CHAR_LIST[0];
        document.getElementById('winner-text').textContent =
            scores[0] === scores[1] ? 'MATCH NUL!' :
            `JOUEUR ${winnerIdx + 1} - ${winnerChar.name.toUpperCase()} GAGNE!`;

        // Victory dance
        const vd = document.getElementById('victory-dance');
        const vdc = vd.getContext('2d');
        let vdFrame = 0;
        function drawVictory() {
            vdc.fillStyle = '#111'; vdc.fillRect(0,0,200,150);
            const by = 80 + Math.abs(Math.sin(vdFrame * 0.1)) * -20;
            drawPixelFighter(vdc, 100, by, winnerChar.color, vdFrame);
            // Stars
            for (let i = 0; i < 3; i++) {
                const a = vdFrame * 0.05 + i * 2;
                vdc.fillStyle = '#ff0';
                vdc.fillRect(100 + Math.cos(a) * 40, 60 + Math.sin(a) * 30, 4, 4);
            }
            vdFrame++;
            if (state === 'result') requestAnimationFrame(drawVictory);
        }
        drawVictory();

        document.getElementById('result-screen').style.display = 'flex';
        canvas.style.display = 'none';
        document.getElementById('hud').style.display = 'none';
    }

    // ── HUD ──
    function updateHUD() {
        const p1 = players[0];
        const p2 = players[1] || players[0];
        document.getElementById('hp-1').style.width = Math.max(0, (p1.hp / p1.maxHp) * 100) + '%';
        document.getElementById('sp-1').style.width = (p1.sp / p1.maxSp * 100) + '%';
        document.getElementById('hp-2').style.width = Math.max(0, (p2.hp / p2.maxHp) * 100) + '%';
        document.getElementById('sp-2').style.width = (p2.sp / p2.maxSp * 100) + '%';

        // HP bar color
        const hp1 = p1.hp / p1.maxHp;
        const hp2 = p2.hp / p2.maxHp;
        document.getElementById('hp-1').style.background =
            hp1 > 0.5 ? 'linear-gradient(#44dd44,#22aa22)' :
            hp1 > 0.25 ? 'linear-gradient(#ddaa44,#aa7722)' : 'linear-gradient(#dd4444,#aa2222)';
        document.getElementById('hp-2').style.background =
            hp2 > 0.5 ? 'linear-gradient(#44dd44,#22aa22)' :
            hp2 > 0.25 ? 'linear-gradient(#ddaa44,#aa7722)' : 'linear-gradient(#dd4444,#aa2222)';

        document.getElementById('timer-display').textContent = timer;
        document.getElementById('round-display').textContent = `Manche ${round}`;
        document.getElementById('score-display').textContent = `${scores[0]} - ${scores[1]}`;
    }

    // ── RENDER ──
    function render() {
        if (state !== 'playing') return;

        ctx.save();

        // Effects manager update (handles hitstop, slowmo)
        effects.update(1);

        // Juice camera
        Juice.updateCamera();
        Juice.applyCamera(ctx);

        // Background
        ctx.fillStyle = currentMap.bg;
        ctx.fillRect(0, 0, 800, 500);

        // Background decorations
        drawMapDecor();

        // Platforms
        platforms.forEach(p => {
            if (p.type === 'ground') {
                ctx.fillStyle = currentMap.ground;
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = currentMap.accent;
                ctx.fillRect(p.x, p.y, p.w, 3);
            } else {
                ctx.fillStyle = currentMap.ground;
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = currentMap.accent;
                ctx.fillRect(p.x, p.y, p.w, 2);
                ctx.fillStyle = currentMap.ground;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(p.x + 4, p.y + p.h, 4, 20);
                ctx.fillRect(p.x + p.w - 8, p.y + p.h, 4, 20);
                ctx.globalAlpha = 1;
            }
        });

        // Projectiles
        projectiles.forEach(pr => {
            ctx.fillStyle = pr.color || '#ff0';
            ctx.fillRect(pr.x - 3, pr.y - 3, 6, 6);
        });

        // Fighters (with hit flash)
        [...players, ...bots].forEach(f => {
            if (f.hp <= 0) return;
            if (f.invTimer > 0 && frame % 4 < 2) return;
            Juice.drawFlash(ctx, f, () => drawFighter(f));
        });

        // Juice particles & damage numbers
        Juice.updateAll();
        Juice.drawAll(ctx);

        // New effects system
        effects.particles.draw(ctx);
        effects.floatingTexts.draw(ctx);
        effects.drawFlash(ctx, canvas);

        ctx.restore();
        frame++;
        requestAnimationFrame(gameLoop);
    }

    function drawMapDecor() {
        const map = currentMap;
        // Moon/sun
        ctx.fillStyle = map.accent;
        ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.arc(700, 60, 30, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath(); ctx.arc(700, 60, 50, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 12; i++) {
            const sx = (i * 73 + 20) % 780;
            const sy = (i * 37 + 10) % 180;
            ctx.globalAlpha = 0.3 + Math.sin(frame * 0.02 + i) * 0.2;
            ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
    }

    function drawFighter(f) {
        const x = Math.floor(f.x);
        const y = Math.floor(f.y);
        const dir = f.facing;
        const ps = 3; // pixel size

        ctx.save();
        if (dir < 0) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x - 6, y + f.h / 2 - 2, 12, 4);

        // Block shield
        if (f.blocking) {
            ctx.fillStyle = 'rgba(100,150,255,0.4)';
            ctx.fillRect(x - 8, y - 12, 16, 24);
            ctx.strokeStyle = '#88f';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 8, y - 12, 16, 24);
        }

        // Body
        const walk = Math.sin(f.walkFrame * 0.2);
        const bobY = f.grounded ? Math.abs(walk) * 1 : 0;

        // Legs
        ctx.fillStyle = f.char.color;
        if (f.grounded && Math.abs(f.vx) > 0.5) {
            ctx.fillRect(x - 4, y + 4 + walk, 3, 7);
            ctx.fillRect(x + 1, y + 4 - walk, 3, 7);
        } else {
            ctx.fillRect(x - 4, y + 4, 3, 6);
            ctx.fillRect(x + 1, y + 4, 3, 6);
        }

        // Body
        ctx.fillStyle = f.char.color;
        ctx.fillRect(x - 5, y - 5 - bobY, 10, 10);

        // Belt
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 5, y + 3 - bobY, 10, 2);

        // Head
        ctx.fillStyle = f.char.skinColor || '#ffcc88';
        ctx.fillRect(x - 4, y - 12 - bobY, 8, 7);

        // Eyes
        ctx.fillStyle = '#000';
        if (f.hitstun > 0) {
            ctx.fillRect(x - 3, y - 10 - bobY, 2, 1);
            ctx.fillRect(x + 1, y - 10 - bobY, 2, 1);
        } else {
            ctx.fillRect(x - 3, y - 10 - bobY, 2, 2);
            ctx.fillRect(x + 1, y - 10 - bobY, 2, 2);
        }

        // Character-specific features
        if (f.char.id === 'knight' || f.char.id === 'paladin') {
            ctx.fillStyle = f.char.id === 'knight' ? '#88aaff' : '#ffdd44';
            ctx.fillRect(x - 5, y - 14 - bobY, 10, 3);
            ctx.fillRect(x - 6, y - 12 - bobY, 12, 1);
        } else if (f.char.id === 'mage') {
            ctx.fillStyle = '#aa44ff';
            ctx.fillRect(x - 4, y - 16 - bobY, 8, 4);
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 1, y - 15 - bobY, 2, 2);
        } else if (f.char.id === 'ninja') {
            ctx.fillStyle = '#222';
            ctx.fillRect(x - 4, y - 11 - bobY, 8, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 3, y - 10 - bobY, 2, 1);
            ctx.fillRect(x + 1, y - 10 - bobY, 2, 1);
        } else if (f.char.id === 'berserker') {
            ctx.fillStyle = '#ff6666';
            ctx.fillRect(x - 6, y - 5 - bobY, 2, 6);
            ctx.fillRect(x + 4, y - 5 - bobY, 2, 6);
        } else if (f.char.id === 'archer') {
            ctx.fillStyle = '#886622';
            ctx.fillRect(x + 6, y - 8 - bobY, 2, 14);
            ctx.fillStyle = '#ccc';
            ctx.fillRect(x + 6, y - 8 - bobY, 1, 3);
        }

        // Attack animation
        if (f.attacking && f.atkTimer > 4) {
            const atkLen = (12 - f.atkTimer) * 3;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 6, y - 2 - bobY, atkLen, 4);
            // Slash effect
            ctx.fillStyle = f.char.color;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x + 8 + i * 4, y - 4 - bobY + i * 2, 3, 3);
            }
            ctx.globalAlpha = 1;
        }

        // Special attack
        if (f.attacking && f.atkTimer > 10) {
            ctx.fillStyle = '#ff0';
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y - bobY, 20 - f.atkTimer, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Combo display
        if (f.combo > 1) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`${f.combo} COMBO!`, x - 15, y - 18 - bobY);
        }

        ctx.restore();
    }

    function gameLoop() {
        update();
        render();
    }

    setupMenu();
})();
