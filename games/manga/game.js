(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 500;

    // ── MANGA CHARACTERS ──
    const CHARS = [
        { id:'ryu', name:'RYU', title:'Le Combattant',
          color:'#fff', hair:'#1a1a1a', skin:'#f5d0a9', gi:'#fff', band:'#cc0000',
          stats:{hp:100,spd:3.5,jmp:11,dmg:12,range:28,spdAtk:1.0},
          specials:['Hadoken','Shoryuken','Tatsumaki'] },
        { id:'sakura', name:'SAKURA', title:'L\'Étudiante',
          color:'#ff88cc', hair:'#884422', skin:'#f5d0a9', gi:'#ffccdd', band:'#ff4488',
          stats:{hp:90,spd:4.0,jmp:12,dmg:10,range:26,spdAtk:1.2},
          specials:['Sakura Hadoken','Flower Kick','Senpu'] },
        { id:'kazuya', name:'KAZUYA', title:'Le Démon',
          color:'#aa44ff', hair:'#1a1a1a', skin:'#e8c8a0', gi:'#2a2a2a', band:'#8800cc',
          stats:{hp:110,spd:3.2,jmp:10,dmg:15,range:30,spdAtk:0.8},
          specials:['Devil Fist','Electric Storm','Demon Flip'] },
        { id:'jin', name:'JIN', title:'Le Vengeur',
          color:'#ff4444', hair:'#ffcc00', skin:'#f5d0a9', gi:'#1a1a3a', band:'#cc0000',
          stats:{hp:95,spd:3.8,jmp:11,dmg:13,range:32,spdAtk:1.1},
          specials:['Electric Wind','Rage Art','Crescent Kick'] },
        { id:'chun', name:'CHUN', title:'La Maîtresse',
          color:'#4488ff', hair:'#1a1a1a', skin:'#f0c890', gi:'#2244aa', band:'#4488ff',
          stats:{hp:85,spd:4.5,jmp:13,dmg:9,range:34,spdAtk:1.3},
          specials:['Hyakuretsu','Spinning Bird','Kikoken'] },
        { id:'akuma', name:'AKUMA', title:'Le Dieu du Combat',
          color:'#ff0000', hair:'#8a1a1a', skin:'#c08060', gi:'#4a1a2a', band:'#ff0000',
          stats:{hp:120,spd:3.0,jmp:9,dmg:18,range:26,spdAtk:0.7},
          specials:['Shun Goku Satsu','Raging Demon','Gohadoken'] },
    ];

    let gameMode = 'versus';
    let gameState = 'menu';
    let p1Char = 0, p2Char = 1;
    let players = [];
    let bots = [];
    let particles = [];
    let speedLines = [];
    let platforms = [];
    let keys = {};
    let frame = 0;
    let timer = 99;
    let timerInterval = null;
    let round = 1;
    let scores = [0, 0];
    let maxRounds = 3;
    let roundActive = false;
    let announceTimer = 0;
    let hitStopTimer = 0;
    let screenFlash = 0;
    let mangaLines = [];

    const P1_KEYS = { left:'KeyA', right:'KeyD', up:'KeyW', down:'KeyS', atk:'KeyF', spl:'KeyG', block:'KeyE' };
    const P2_KEYS = { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', atk:'Period', spl:'Comma', block:'ArrowDown' };

    document.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Escape' && gameState === 'playing') togglePause(); });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    // ── SCREENS ──
    window.showScreen = function(id) {
        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        const el = document.getElementById(id);
        if (el) { el.classList.add('active'); el.style.display = 'flex'; }
        if (id === 'select-screen') { setupCharGrids(); updatePreviews(); }
    };
    window.selectMode = function(mode) {
        gameMode = mode;
        showScreen('select-screen');
    };

    // ── CHAR GRID ──
    function setupCharGrids() {
        ['p1-grid','p2-grid'].forEach((gid, pi) => {
            const grid = document.getElementById(gid);
            if (grid.children.length > 0) return;
            CHARS.forEach((c, ci) => {
                const card = document.createElement('div');
                card.className = 'char-card' + (ci === (pi === 0 ? p1Char : p2Char) ? ' selected' : '');
                card.dataset.idx = ci;
                const cvs = document.createElement('canvas');
                cvs.width = 40; cvs.height = 50;
                drawMiniChar(cvs.getContext('2d'), c, 20, 30);
                card.appendChild(cvs);
                const lbl = document.createElement('div');
                lbl.className = 'char-label';
                lbl.textContent = c.name;
                card.appendChild(lbl);
                card.onclick = () => {
                    grid.querySelectorAll('.char-card').forEach(cc => cc.classList.remove('selected'));
                    card.classList.add('selected');
                    if (pi === 0) p1Char = ci; else p2Char = ci;
                    updatePreviews();
                };
                grid.appendChild(card);
            });
        });
    }

    function updatePreviews() {
        const c1 = CHARS[p1Char], c2 = CHARS[p2Char];
        drawCharPreview(document.getElementById('preview-canvas-1').getContext('2d'), c1, 90, 160, 1);
        drawCharPreview(document.getElementById('preview-canvas-2').getContext('2d'), c2, 90, 160, 1);
        document.getElementById('preview-name-1').textContent = c1.name;
        document.getElementById('preview-title-1').textContent = c1.title;
        document.getElementById('preview-name-2').textContent = c2.name;
        document.getElementById('preview-title-2').textContent = c2.title;
    }

    // ── MANGA CHARACTER DRAWING ──
    function drawMiniChar(c, ch, x, y) {
        c.clearRect(0, 0, 40, 50);
        c.fillStyle = '#111'; c.fillRect(0, 0, 40, 50);
        // Body
        c.fillStyle = ch.gi; c.fillRect(x - 6, y - 4, 12, 14);
        // Head
        c.fillStyle = ch.skin; c.fillRect(x - 5, y - 14, 10, 10);
        // Hair
        c.fillStyle = ch.hair; c.fillRect(x - 5, y - 16, 10, 4);
        // Eyes
        c.fillStyle = ch.color === '#fff' ? '#000' : ch.color;
        c.fillRect(x - 3, y - 11, 2, 2); c.fillRect(x + 1, y - 11, 2, 2);
        // Legs
        c.fillStyle = ch.gi; c.fillRect(x - 4, y + 10, 3, 6); c.fillRect(x + 1, y + 10, 3, 6);
    }

    function drawCharPreview(c, ch, x, y, scale) {
        c.clearRect(0, 0, 180, 260);
        // Background aura
        const g = c.createRadialGradient(x, y - 20, 10, x, y - 20, 80);
        g.addColorStop(0, ch.color + '33');
        g.addColorStop(1, 'transparent');
        c.fillStyle = g; c.fillRect(0, 0, 180, 260);

        const ps = 4 * scale;

        // Shadow
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.ellipse(x, y + 50, 18, 5, 0, 0, Math.PI * 2); c.fill();

        // Legs
        c.fillStyle = ch.gi;
        c.fillRect(x - 8, y + 16, 6, 26);
        c.fillRect(x + 2, y + 16, 6, 26);

        // Belt
        c.fillStyle = ch.band;
        c.fillRect(x - 8, y + 14, 16, 4);

        // Body
        c.fillStyle = ch.gi;
        c.fillRect(x - 12, y - 12, 24, 28);

        // Chest detail
        c.fillStyle = ch.band;
        c.fillRect(x - 1, y - 8, 2, 20);

        // Arms
        c.fillStyle = ch.skin;
        c.fillRect(x - 18, y - 6, 6, 16);
        c.fillRect(x + 12, y - 6, 6, 16);

        // Hands
        c.fillStyle = ch.skin;
        c.fillRect(x - 19, y + 8, 8, 6);
        c.fillRect(x + 11, y + 8, 8, 6);

        // Shoulders
        c.fillStyle = ch.gi;
        c.fillRect(x - 18, y - 12, 8, 8);
        c.fillRect(x + 10, y - 12, 8, 8);

        // Neck
        c.fillStyle = ch.skin;
        c.fillRect(x - 4, y - 20, 8, 8);

        // Head
        c.fillStyle = ch.skin;
        c.fillRect(x - 10, y - 40, 20, 20);

        // MANGA EYES (big, expressive)
        // Left eye
        c.fillStyle = '#fff';
        c.fillRect(x - 8, y - 34, 7, 6);
        c.fillStyle = ch.color === '#fff' ? '#2244aa' : ch.color;
        c.fillRect(x - 7, y - 33, 5, 4);
        c.fillStyle = '#000';
        c.fillRect(x - 6, y - 32, 3, 3);
        c.fillStyle = '#fff';
        c.fillRect(x - 5, y - 33, 1, 1); // highlight

        // Right eye
        c.fillStyle = '#fff';
        c.fillRect(x + 1, y - 34, 7, 6);
        c.fillStyle = ch.color === '#fff' ? '#2244aa' : ch.color;
        c.fillRect(x + 2, y - 33, 5, 4);
        c.fillStyle = '#000';
        c.fillRect(x + 3, y - 32, 3, 3);
        c.fillStyle = '#fff';
        c.fillRect(x + 4, y - 33, 1, 1);

        // Eyebrows (angry)
        c.fillStyle = ch.hair;
        c.fillRect(x - 9, y - 37, 8, 2);
        c.fillRect(x + 1, y - 37, 8, 2);

        // Nose
        c.fillStyle = ch.skin;
        c.globalAlpha = 0.6;
        c.fillRect(x - 1, y - 28, 2, 3);
        c.globalAlpha = 1;

        // Mouth (determined)
        c.fillStyle = '#cc6666';
        c.fillRect(x - 3, y - 22, 6, 2);

        // Hair (spiky manga style)
        c.fillStyle = ch.hair;
        c.fillRect(x - 11, y - 44, 22, 6);
        // Spikes
        const spikes = [[-10,-48,5,6],[-4,-50,4,8],[2,-48,5,6],[8,-46,4,6],[-12,-42,4,4],[10,-42,4,4]];
        spikes.forEach(([sx, sy, sw, sh]) => c.fillRect(x + sx, y + sy, sw, sh));

        // Headband
        c.fillStyle = ch.band;
        c.fillRect(x - 11, y - 40, 22, 3);
        // Tails
        c.fillRect(x + 10, y - 39, 8, 2);
        c.fillRect(x + 14, y - 37, 6, 2);

        // Aura lines
        c.strokeStyle = ch.color;
        c.globalAlpha = 0.3;
        c.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const a = frame * 0.05 + i * 1.5;
            c.beginPath();
            c.moveTo(x + Math.cos(a) * 25, y - 20 + Math.sin(a) * 25);
            c.lineTo(x + Math.cos(a) * 35, y - 20 + Math.sin(a) * 35);
            c.stroke();
        }
        c.globalAlpha = 1;
    }

    // ── LAUNCH FIGHT ──
    window.launchFight = function() {
        canvas.style.display = 'block';
        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        document.getElementById('hud').style.display = 'block';

        const c1 = CHARS[p1Char], c2 = CHARS[p2Char];
        document.getElementById('hud-name-1').textContent = c1.name;
        document.getElementById('hud-name-2').textContent = c2.name;

        platforms = [
            { x: 0, y: 460, w: 800, h: 40 },
            { x: 120, y: 350, w: 120, h: 12 },
            { x: 320, y: 300, w: 140, h: 12 },
            { x: 560, y: 350, w: 120, h: 12 },
        ];

        players = [
            createFighter(0, c1, P1_KEYS),
        ];

        if (gameMode === 'versus') {
            players.push(createFighter(1, c2, P2_KEYS));
            bots = [];
        } else if (gameMode === 'coop') {
            players.push(createFighter(1, c2, P2_KEYS));
            bots = [createBot(CHARS[2], 600), createBot(CHARS[3], 200)];
        } else if (gameMode === 'tag') {
            players.push(createFighter(1, c2, P2_KEYS));
            bots = [createBot(CHARS[4], 600), createBot(CHARS[5], 200)];
        }

        scores = [0, 0];
        round = 1;
        gameState = 'playing';
        particles = [];
        speedLines = [];
        mangaLines = [];
        Juice.clear();
        Juice.clearDamageNumbers();
        Juice.clearFlashes();
        Juice.initAudio();
        startRound();
    };

    function createFighter(id, ch, k) {
        return {
            id, char: ch, keys: k,
            x: id === 0 ? 200 : 600, y: 350,
            vx: 0, vy: 0, w: 20, h: 40,
            hp: ch.stats.hp, maxHp: ch.stats.hp,
            sp: 0, maxSp: 100,
            speed: ch.stats.spd, jumpPower: ch.stats.jmp,
            atkDmg: ch.stats.dmg, atkRange: ch.stats.range, atkSpd: ch.stats.spdAtk,
            facing: id === 0 ? 1 : -1,
            grounded: false,
            attacking: false, atkTimer: 0, atkCooldown: 0,
            blocking: false, hitstun: 0, invTimer: 0,
            combo: 0, comboTimer: 0,
            walkFrame: 0, wins: 0,
            specialActive: false, specialTimer: 0,
        };
    }

    function createBot(ch, x) {
        return {
            id: bots.length + 2, char: ch, keys: {},
            x, y: 350, vx: 0, vy: 0, w: 20, h: 40,
            hp: ch.stats.hp, maxHp: ch.stats.hp,
            sp: 0, maxSp: 100,
            speed: ch.stats.spd, jumpPower: ch.stats.jmp,
            atkDmg: ch.stats.dmg, atkRange: ch.stats.range, atkSpd: ch.stats.spdAtk,
            facing: 1, grounded: false,
            attacking: false, atkTimer: 0, atkCooldown: 0,
            blocking: false, hitstun: 0, invTimer: 0,
            combo: 0, comboTimer: 0, walkFrame: 0, wins: 0,
            specialActive: false, specialTimer: 0,
            ai: true, aiTimer: 0,
        };
    }

    function startRound() {
        roundActive = false;
        announceTimer = 120;
        const all = [...players, ...bots];
        all.forEach((f, i) => {
            f.hp = f.maxHp; f.sp = 0;
            f.x = i < 2 ? (i === 0 ? 200 : 600) : (i === 2 ? 600 : 200);
            f.y = 350; f.vx = 0; f.vy = 0;
            f.hitstun = 0; f.invTimer = 0;
            f.attacking = false; f.blocking = false;
            f.combo = 0; f.specialActive = false;
        });

        document.getElementById('round-announce').style.display = 'flex';
        document.getElementById('announce-text').textContent = `ROUND ${round}`;
        setTimeout(() => {
            document.getElementById('announce-text').textContent = 'FIGHT!';
            setTimeout(() => {
                document.getElementById('round-announce').style.display = 'none';
                roundActive = true;
                startTimer();
                gameLoop();
            }, 600);
        }, 800);

        updateHUD();
    }

    function startTimer() {
        timer = 99;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (roundActive && --timer <= 0) { timer = 0; endRound(); }
        }, 1000);
    }

    // ── UPDATE ──
    function update() {
        if (!roundActive) return;
        if (hitStopTimer > 0) { hitStopTimer--; return; }

        const all = [...players, ...bots];
        players.forEach(p => updateFighter(p, keys));
        bots.forEach(b => updateBot(b, all));
        all.forEach(f => {
            updatePhysics(f);
            if (f.comboTimer > 0) f.comboTimer--; else f.combo = 0;
            if (f.invTimer > 0) f.invTimer--;
            if (f.hitstun > 0) f.hitstun--;
            if (f.atkCooldown > 0) f.atkCooldown--;
            if (f.specialTimer > 0) f.specialTimer--;
        });

        // Particles
        Juice.updateAll();
        Juice.updateDamageNumbers();
        Juice.updateCamera();

        // Manga speed lines
        mangaLines.forEach((l, i) => { l.life--; if (l.life <= 0) mangaLines.splice(i, 1); });

        // Screen flash
        if (screenFlash > 0) screenFlash--;

        // Check win
        const alive = all.filter(f => f.hp > 0);
        if (alive.length <= 1) endRound();

        updateHUD();
    }

    function updateFighter(f, inputKeys) {
        if (f.hitstun > 0) { f.vx *= 0.85; return; }
        const k = f.keys;
        if (!k.left) return;

        f.blocking = inputKeys[k.block] && f.grounded && !f.attacking;
        if (f.blocking) { f.vx *= 0.4; return; }

        if (inputKeys[k.left]) { f.vx = -f.speed; f.facing = -1; f.walkFrame++; }
        else if (inputKeys[k.right]) { f.vx = f.speed; f.facing = 1; f.walkFrame++; }
        else { f.vx *= 0.7; }

        if (inputKeys[k.up] && f.grounded) {
            f.vy = -f.jumpPower; f.grounded = false;
            Juice.Effects.dustRun(f.x, f.y + f.h / 2, f.facing);
            Juice.SFX.jump(f.x / 800 * 2 - 1);
        }

        if (inputKeys[k.atk] && f.atkCooldown <= 0 && !f.attacking) {
            f.attacking = true; f.atkTimer = 12;
            f.atkCooldown = Math.floor(18 / f.atkSpd);
        }

        if (inputKeys[k.spl] && f.sp >= 100 && f.atkCooldown <= 0) {
            activateSpecial(f);
        }

        if (f.attacking) {
            f.atkTimer--;
            if (f.atkTimer === 5) {
                const atkX = f.x + f.facing * f.atkRange;
                const pan = f.x / 800 * 2 - 1;
                [...players, ...bots].forEach(ot => {
                    if (ot.id !== f.id && Math.abs(ot.x - atkX) < f.atkRange && Math.abs(ot.y - f.y) < 30) {
                        f.combo++; f.comboTimer = 50;
                        const mult = f.combo > 2 ? 1.5 : 1;
                        const isCrit = f.combo > 3;
                        hitFighter(ot, f.atkDmg * mult, 6, f.facing, f, isCrit);
                    }
                });
                Juice.Effects.slashTrail(atkX, f.y, f.facing, f.char.color);
                Juice.SFX.woosh(pan);
            }
            if (f.atkTimer <= 0) f.attacking = false;
        }
    }

    function activateSpecial(f) {
        f.specialActive = true; f.specialTimer = 25;
        f.sp = 0; f.atkCooldown = 30;
        Juice.SFX.special(f.x / 800 * 2 - 1);
        Juice.Effects.energyBurst(f.x, f.y, f.char.color);
        Juice.slowMotion(0.2, 15);
        Juice.shake(10, 12);
        screenFlash = 8;
        addMangaLines(f.x, f.y, f.char.color);

        setTimeout(() => {
            [...players, ...bots].forEach(ot => {
                if (ot.id !== f.id && Math.abs(ot.x - f.x) < 80 && Math.abs(ot.y - f.y) < 50) {
                    hitFighter(ot, f.atkDmg * 3, 15, f.facing, f, true);
                    Juice.Effects.critSparks(ot.x, ot.y);
                }
            });
            Juice.Effects.energyBurst(f.x + f.facing * 40, f.y, '#fff');
        }, 250);
        f.specialActive = false;
    }

    function updateBot(bot, all) {
        if (bot.hitstun > 0) { bot.vx *= 0.85; return; }
        const enemies = all.filter(f => f.id !== bot.id);
        let target = enemies[0], minD = 999;
        enemies.forEach(e => { const d = Math.abs(e.x - bot.x); if (d < minD) { minD = d; target = e; } });
        if (!target) return;

        const dir = target.x > bot.x ? 1 : -1;
        bot.facing = dir;
        if (minD > 50) { bot.vx = dir * bot.speed * 0.7; bot.walkFrame++; }
        else if (minD < 25) bot.vx = -dir * bot.speed * 0.3;
        else bot.vx *= 0.7;

        if (bot.grounded && Math.random() < 0.02) { bot.vy = -bot.jumpPower; bot.grounded = false; }

        if (minD < bot.atkRange + 10 && bot.atkCooldown <= 0 && Math.random() < 0.08) {
            bot.attacking = true; bot.atkTimer = 12;
            bot.atkCooldown = Math.floor(22 / bot.atkSpd);
        }

        if (bot.sp >= 100 && minD < 60 && bot.atkCooldown <= 0 && Math.random() < 0.02) {
            activateSpecial(bot);
        }

        if (bot.attacking) {
            bot.atkTimer--;
            if (bot.atkTimer === 5) {
                const atkX = bot.x + dir * bot.atkRange;
                const pan = bot.x / 800 * 2 - 1;
                enemies.forEach(ot => {
                    if (Math.abs(ot.x - atkX) < bot.atkRange && Math.abs(ot.y - bot.y) < 30) {
                        bot.combo++; bot.comboTimer = 50;
                        hitFighter(ot, bot.atkDmg, 5, dir, bot, false);
                    }
                });
                Juice.Effects.slashTrail(atkX, bot.y, dir, bot.char.color);
            }
            if (bot.atkTimer <= 0) bot.attacking = false;
        }
    }

    function hitFighter(target, dmg, knockback, dir, attacker, isCrit) {
        if (target.invTimer > 0) return;
        if (target.blocking) {
            Juice.Effects.hitSparks(target.x, target.y, '#88aaff');
            Juice.SFX.block(target.x / 800 * 2 - 1);
            target.sp = Math.min(target.maxSp, target.sp + 5);
            return;
        }
        const pan = target.x / 800 * 2 - 1;
        const finalDmg = isCrit ? dmg * 1.5 : dmg;
        target.hp -= finalDmg;
        target.hitstun = 8; target.invTimer = 12;
        target.vx = knockback * dir; target.vy = -3;

        attacker.sp = Math.min(attacker.maxSp, attacker.sp + 10);
        target.sp = Math.min(target.maxSp, target.sp + 5);

        // MANGA EFFECTS
        Juice.damageNumber(target.x, target.y - 25, Math.floor(finalDmg), isCrit ? '#ffff00' : '#ff4444', isCrit);
        Juice.flash(target, '#fff', isCrit ? 6 : 3);
        Juice.Effects.hitSparks(target.x, target.y, isCrit ? '#ff0' : attacker.char.color);

        if (isCrit) {
            Juice.SFX.crit(pan);
            Juice.shake(8, 8);
            hitStopTimer = 6;
            screenFlash = 4;
            addMangaLines(target.x, target.y, '#ff0');
        } else {
            Juice.SFX.punch(pan);
            Juice.shake(3, 4);
            hitStopTimer = 2;
        }

        // Manga impact text
        if (finalDmg > 15 || isCrit) {
            addMangaImpactText(target.x, target.y - 40, isCrit ? 'CRITICAL!' : 'HIT!');
        }

        if (target.hp <= 0) {
            Juice.SFX.death(pan);
            Juice.Effects.deathBurst(target.x, target.y, target.char.color);
            screenFlash = 10;
        }
    }

    function updatePhysics(f) {
        f.vy += 0.55;
        if (f.vy > 14) f.vy = 14;
        f.x += f.vx; f.y += f.vy;

        f.grounded = false;
        platforms.forEach(p => {
            if (f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w &&
                f.y + f.h / 2 > p.y && f.y + f.h / 2 < p.y + p.h + 8 && f.vy >= 0) {
                f.y = p.y - f.h / 2; f.vy = 0; f.grounded = true;
            }
        });

        if (f.x < 16) f.x = 16;
        if (f.x > 784) f.x = 784;
        if (f.y > 520) { f.hp = 0; }
    }

    function endRound() {
        roundActive = false;
        clearInterval(timerInterval);
        const all = [...players, ...bots];
        const alive = all.filter(f => f.hp > 0);
        const winner = alive.length === 1 ? alive[0] : alive.sort((a, b) => b.hp - a.hp)[0];
        if (winner && winner.id < 2) scores[winner.id]++;
        if (winner) winner.wins++;

        if (scores[0] >= Math.ceil(maxRounds / 2) || scores[1] >= Math.ceil(maxRounds / 2) || round >= maxRounds) {
            showResult(winner);
        } else {
            round++;
            setTimeout(() => startRound(), 1500);
        }
    }

    function showResult(winner) {
        gameState = 'result';
        const winnerChar = winner ? winner.char : CHARS[0];
        document.getElementById('winner-text').textContent = winner ? `${winnerChar.name} GAGNE!` : 'MATCH NUL!';
        document.getElementById('winner-name').textContent = winnerChar.title;

        const wc = document.getElementById('winner-canvas').getContext('2d');
        let wf = 0;
        function drawWinner() {
            wc.fillStyle = '#0a0a0a'; wc.fillRect(0, 0, 300, 200);
            drawCharPreview(wc, winnerChar, 150, 130, 1.2);
            // Victory particles
            for (let i = 0; i < 3; i++) {
                const a = wf * 0.05 + i * 2;
                wc.fillStyle = winnerChar.color;
                wc.globalAlpha = 0.5;
                wc.fillRect(150 + Math.cos(a) * 60, 100 + Math.sin(a) * 40, 4, 4);
            }
            wc.globalAlpha = 1;
            wf++;
            if (gameState === 'result') requestAnimationFrame(drawWinner);
        }
        drawWinner();

        document.getElementById('result-screen').classList.add('active');
        document.getElementById('result-screen').style.display = 'flex';
        canvas.style.display = 'none';
        document.getElementById('hud').style.display = 'none';
    }

    window.rematch = function() {
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('result-screen').classList.remove('active');
        launchFight();
    };

    function addMangaLines(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            mangaLines.push({
                x1: x + Math.cos(angle) * 10,
                y1: y + Math.sin(angle) * 10,
                x2: x + Math.cos(angle) * 60,
                y2: y + Math.sin(angle) * 60,
                color, life: 12,
            });
        }
    }

    let impactTexts = [];
    function addMangaImpactText(x, y, text) {
        impactTexts.push({ x, y, text, life: 30, vy: -1.5 });
    }

    function updateHUD() {
        const p1 = players[0], p2 = players[1] || players[0];
        const hp1 = Math.max(0, p1.hp / p1.maxHp * 100);
        const hp2 = Math.max(0, p2.hp / p2.maxHp * 100);
        document.getElementById('hp-1').style.width = hp1 + '%';
        document.getElementById('hp-2').style.width = hp2 + '%';
        document.getElementById('hp-dmg-1').style.width = hp1 + '%';
        document.getElementById('hp-dmg-2').style.width = hp2 + '%';
        document.getElementById('sp-1').style.width = (p1.sp / p1.maxSp * 100) + '%';
        document.getElementById('sp-2').style.width = (p2.sp / p2.maxSp * 100) + '%';
        document.getElementById('timer').textContent = timer;
        document.getElementById('round-display').textContent = `ROUND ${round} | ${scores[0]} - ${scores[1]}`;
        if (p1.combo > 1) document.getElementById('combo-p1').textContent = `${p1.combo} HIT COMBO!`;
        else document.getElementById('combo-p1').textContent = '';
    }

    // ── RENDER ──
    function render() {
        if (gameState !== 'playing') return;
        ctx.save();

        Juice.updateCamera();
        Juice.applyCamera(ctx);

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, 500);
        bg.addColorStop(0, '#0a0a1a');
        bg.addColorStop(0.6, '#1a0a1a');
        bg.addColorStop(1, '#2a1a0a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 800, 500);

        // Manga background details
        drawMangaBG();

        // Screen flash
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${screenFlash / 10})`;
            ctx.fillRect(0, 0, 800, 500);
        }

        // Platforms
        platforms.forEach(p => {
            if (p.h < 20) {
                ctx.fillStyle = '#2a1a3a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(p.x, p.y, p.w, 2);
            } else {
                ctx.fillStyle = '#3a2a1a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(p.x, p.y, p.w, 3);
            }
        });

        // Manga speed lines (behind fighters)
        mangaLines.forEach(l => {
            ctx.strokeStyle = l.color;
            ctx.globalAlpha = l.life / 12;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Fighters
        [...players, ...bots].forEach(f => {
            if (f.hp <= 0) return;
            if (f.invTimer > 0 && frame % 4 < 2) return;
            Juice.drawFlash(ctx, f, () => drawMangaFighter(f));
        });

        // Juice effects
        Juice.drawAll(ctx);
        Juice.drawDamageNumbers(ctx);

        // Impact texts
        impactTexts.forEach((t, i) => {
            t.y += t.vy; t.life--;
            ctx.save();
            ctx.globalAlpha = t.life / 30;
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(t.text, t.x, t.y);
            ctx.restore();
            if (t.life <= 0) impactTexts.splice(i, 1);
        });

        ctx.restore();
        frame++;
        requestAnimationFrame(gameLoop);
    }

    function drawMangaBG() {
        // Moon
        ctx.fillStyle = 'rgba(255,200,150,0.08)';
        ctx.beginPath(); ctx.arc(680, 80, 35, 0, Math.PI * 2); ctx.fill();

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 15; i++) {
            ctx.globalAlpha = 0.2 + Math.sin(frame * 0.02 + i) * 0.15;
            ctx.fillRect((i * 57 + 10) % 780, (i * 31 + 5) % 200, 2, 2);
        }
        ctx.globalAlpha = 1;

        // Manga panel lines (decorative)
        ctx.strokeStyle = 'rgba(255,68,68,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 200, 0);
            ctx.lineTo(i * 200 + 50, 500);
            ctx.stroke();
        }
    }

    function drawMangaFighter(f) {
        const x = Math.floor(f.x), y = Math.floor(f.y);
        const ch = f.char;
        ctx.save();
        if (f.facing < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(x, y + f.h / 2 + 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Block shield
        if (f.blocking) {
            ctx.fillStyle = 'rgba(100,150,255,0.3)';
            ctx.fillRect(x - 14, y - 20, 28, 42);
            ctx.strokeStyle = '#88f';
            ctx.strokeRect(x - 14, y - 20, 28, 42);
        }

        const walk = Math.sin(f.walkFrame * 0.2) * (Math.abs(f.vx) > 0.5 ? 3 : 0);

        // Legs
        ctx.fillStyle = ch.gi;
        ctx.fillRect(x - 7, y + 8 + walk, 5, 14);
        ctx.fillRect(x + 2, y + 8 - walk, 5, 14);
        // Feet
        ctx.fillStyle = '#3a1a0a';
        ctx.fillRect(x - 8, y + 20 + walk, 7, 4);
        ctx.fillRect(x + 1, y + 20 - walk, 7, 4);

        // Body
        ctx.fillStyle = ch.gi;
        ctx.fillRect(x - 10, y - 10, 20, 20);

        // Belt
        ctx.fillStyle = ch.band;
        ctx.fillRect(x - 10, y + 8, 20, 3);

        // Arms
        ctx.fillStyle = ch.skin;
        ctx.fillRect(x - 16, y - 6, 6, 14);
        ctx.fillRect(x + 10, y - 6, 6, 14);

        // Head
        ctx.fillStyle = ch.skin;
        ctx.fillRect(x - 8, y - 28, 16, 18);

        // MANGA EYES
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 6, y - 24, 5, 5);
        ctx.fillRect(x + 1, y - 24, 5, 5);
        ctx.fillStyle = ch.color === '#fff' ? '#2244aa' : ch.color;
        ctx.fillRect(x - 5, y - 23, 4, 3);
        ctx.fillRect(x + 2, y - 23, 4, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 4, y - 22, 2, 2);
        ctx.fillRect(x + 3, y - 22, 2, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 4, y - 23, 1, 1);
        ctx.fillRect(x + 3, y - 23, 1, 1);

        // Eyebrows
        ctx.fillStyle = ch.hair;
        ctx.fillRect(x - 7, y - 27, 6, 2);
        ctx.fillRect(x + 1, y - 27, 6, 2);

        // Mouth
        if (f.hitstun > 0) {
            ctx.fillStyle = '#cc4444';
            ctx.fillRect(x - 3, y - 14, 6, 3);
        } else {
            ctx.fillStyle = '#cc6666';
            ctx.fillRect(x - 2, y - 14, 4, 2);
        }

        // Hair (spiky)
        ctx.fillStyle = ch.hair;
        ctx.fillRect(x - 9, y - 32, 18, 5);
        ctx.fillRect(x - 8, y - 36, 5, 5);
        ctx.fillRect(x - 2, y - 38, 4, 6);
        ctx.fillRect(x + 4, y - 36, 5, 5);
        ctx.fillRect(x + 7, y - 34, 4, 4);
        ctx.fillRect(x - 10, y - 30, 4, 4);

        // Headband
        ctx.fillStyle = ch.band;
        ctx.fillRect(x - 9, y - 30, 18, 3);

        // Attack arm
        if (f.attacking && f.atkTimer > 3) {
            const atkLen = (12 - f.atkTimer) * 4;
            ctx.fillStyle = ch.skin;
            ctx.fillRect(x + 10, y - 4, atkLen, 5);
            // Impact effect
            ctx.fillStyle = ch.color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x + 10 + atkLen, y - 6, 6, 9);
            ctx.globalAlpha = 1;
        }

        // Special aura
        if (f.specialTimer > 0 || f.specialActive) {
            const auraSize = 20 + Math.sin(frame * 0.2) * 8;
            ctx.fillStyle = ch.color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.arc(x, y, auraSize, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(x, y, auraSize * 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Combo display
        if (f.combo > 1) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 2;
            ctx.fillText(`${f.combo} HIT!`, x, y - 40);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    function gameLoop() {
        update();
        render();
    }

    // ── CONTROLS ──
    window.togglePause = function() {
        if (gameState === 'playing') {
            gameState = 'paused';
            document.getElementById('pause-overlay').style.display = 'flex';
        } else if (gameState === 'paused') {
            gameState = 'playing';
            document.getElementById('pause-overlay').style.display = 'none';
            gameLoop();
        }
    };
    window.resumeGame = function() { gameState = 'playing'; document.getElementById('pause-overlay').style.display = 'none'; gameLoop(); };
    window.quitToMenu = function() {
        gameState = 'menu';
        clearInterval(timerInterval);
        document.getElementById('hud').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('result-screen').classList.remove('active');
        document.getElementById('pause-overlay').style.display = 'none';
        canvas.style.display = 'none';
        showScreen('title-screen');
    };

    showScreen('title-screen');
})();
