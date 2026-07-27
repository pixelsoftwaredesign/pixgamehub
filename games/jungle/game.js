(() => {
    // ── CONSTANTS ──
    const CHARACTERS = [
        { id:'ranger', name:'RANGER', role:'Éclaireur', icon:'🦁', desc:'Rapide et furtif. Ses attaques à distance ignorent les défenses des scorpions dans la végétation dense.', color:'#44aa44', accent:'#228822', stats:{str:30,agi:90,pre:60,spi:50,hp:80}, env:'jungle', atkRange:45, atkSpeed:1.3 },
        { id:'titan', name:'TITAN', role:'Tank', icon:'🛡️', desc:'Résistant et puissant. Peut encaisser les charges des scorpions géants et briser leur carapace.', color:'#cc6622', accent:'#994411', stats:{str:90,agi:30,pre:40,spi:30,hp:150}, env:'desert', atkRange:30, atkSpeed:0.7 },
        { id:'chasseur', name:'CHASSEUR', role:'Traqueur', icon:'🏹', desc:'Spécialiste des pièges. Inflige des dégâts critiques aux points faibles des scorpions, peu importe le terrain.', color:'#aa8833', accent:'#886622', stats:{str:50,agi:55,pre:90,spi:40,hp:90}, env:'both', atkRange:55, atkSpeed:1.0 },
        { id:'druide', name:'DRUIDE', role:'Soutien', icon:'🌿', desc:'Contrôle la nature. Peut créer des lianes pour immobiliser les scorpions et soigner ses alliés.', color:'#44aa88', accent:'#228866', stats:{str:35,agi:45,pre:55,spi:90,hp:95}, env:'jungle', atkRange:40, atkSpeed:0.9 },
    ];

    const SKIN_COLORS = ['#f5d0a9','#e8b88a','#d49e6b','#a67545','#5c3a1e'];
    const HAIR_COLORS = ['#1a1a1a','#3a2200','#884400','#cc6600','#ffcc00','#ff8844','#aa4444','#4444cc','#44cc44','#ffffff','#ff66aa','#aa66ff'];
    const HAIR_STYLES = ['Court','Long','Crête','Tresse','Chauve','Iroquoi'];
    const FACE_STYLES = ['Normal','Fier','Sérieux','Souriant','Cicatrice','Tribal'];
    const ARMOR_STYLES = ['Léger','Moyen','Lourd','Tribal','Nature'];
    const ARMOR_COLORS_JUNGLE = ['#2a4a1a','#3a6a2a','#4a7a3a','#5a8a4a'];
    const ARMOR_COLORS_DESERT = ['#8a7a5a','#aa9a6a','#c8a050','#aa6633'];
    const HELMET_STYLES = ['Aucun','Casque','Masque','Couronne'];
    const TATTOO_STYLES = ['Aucun','Scorpion','Tribal','Ligne','Flamme'];
    const BACKPACK_STYLES = ['Aucun','Sac','Carquois','Herbes'];
    const TALISMAN_STYLES = ['Aucun','Griffe','Perles','Pendentif'];
    const POSE_STYLES = ['Victoire','Bras Croix','Danse','Moquerie'];

    const SCORPION_TYPES = [
        { name:'Petit', color:'#aa6622', hp:30, dmg:8, speed:2.5, size:16, xp:10, points:50 },
        { name:'Moyen', color:'#cc8833', hp:60, dmg:15, speed:1.8, size:22, xp:25, points:100 },
        { name:'Géant', color:'#cc3322', hp:200, dmg:30, speed:1.0, size:36, xp:100, points:500 },
    ];

    // ── STATE ──
    let selectedCharIdx = 0;
    let gameMode = 'solo';
    let gameState = 'menu';
    let avatar = { face:0, skin:0, hairStyle:0, hairColor:0, armorStyle:0, armorColor:0, helmet:0, tattoo:0, backpack:0, talisman:0, pose:0 };
    let players = [];
    let scorpions = [];
    let particles = [];
    let platforms = [];
    let pickups = [];
    let wave = 1;
    let waveTimer = 0;
    let waveDelay = false;
    let score = 0;
    let totalKills = 0;
    let frame = 0;
    let keys = {};
    let shakeTimer = 0;
    let canvas, ctx;
    let footstepTimer = 0;

    // ── INPUT ──
    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Escape' && gameState === 'playing') togglePause();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    // ── SCREEN MANAGEMENT ──
    window.showScreen = function(id) {
        Juice.initAudio();
        Juice.SFX.ui_select();
        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        const el = document.getElementById(id);
        if (el) { el.classList.add('active'); el.style.display = 'flex'; }
        if (id === 'select-screen') updateCharDisplay();
        if (id === 'forge-screen') updateForgePreview();
    };
    showScreen('menu-screen');

    // ── CHARACTER SELECTION ──
    window.prevChar = function(dir) {
        selectedCharIdx = (selectedCharIdx + dir + CHARACTERS.length) % CHARACTERS.length;
        updateCharDisplay();
    };

    function updateCharDisplay() {
        const c = CHARACTERS[selectedCharIdx];
        document.getElementById('sel-char-name').textContent = c.name;
        document.getElementById('sel-char-role').textContent = c.role;
        document.getElementById('sel-class-name').textContent = `${c.icon} ${c.name}`;
        document.getElementById('sel-char-desc').textContent = c.desc;
        document.getElementById('stat-str').style.width = c.stats.str + '%';
        document.getElementById('stat-agi').style.width = c.stats.agi + '%';
        document.getElementById('stat-pre').style.width = c.stats.pre + '%';
        document.getElementById('stat-spi').style.width = c.stats.spi + '%';
        document.getElementById('stat-hp').style.width = c.stats.hp + '%';

        const cvs = document.getElementById('char-preview');
        const cctx = cvs.getContext('2d');
        drawCharacterPreview(cctx, 100, 140, c, avatar, 1);
    }

    function drawCharacterPreview(c, x, y, charData, av, scale) {
        c.clearRect(0, 0, 200, 280);
        // Background
        const env = charData.env === 'jungle' ? '#0a1a0a' : charData.env === 'desert' ? '#2a1a0a' : '#1a1a0a';
        c.fillStyle = env;
        c.fillRect(0, 0, 200, 280);

        // Ground
        c.fillStyle = charData.env === 'jungle' ? '#1a3a0a' : '#4a3a1a';
        c.fillRect(0, 220, 200, 60);

        const ps = 4 * scale;
        const sc = SKIN_COLORS[av.skin];
        const hc = HAIR_COLORS[av.hairColor];
        const ac = (charData.env === 'jungle' ? ARMOR_COLORS_JUNGLE : ARMOR_COLORS_DESERT)[av.armorColor] || charData.color;

        // Shadow
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.ellipse(x, y + 40, 18, 6, 0, 0, Math.PI * 2); c.fill();

        // Legs
        c.fillStyle = ac;
        c.fillRect(x - 8, y + 14, 6, 22);
        c.fillRect(x + 2, y + 14, 6, 22);

        // Feet
        c.fillStyle = '#3a2a1a';
        c.fillRect(x - 9, y + 34, 8, 4);
        c.fillRect(x + 1, y + 34, 8, 4);

        // Body
        c.fillStyle = ac;
        c.fillRect(x - 12, y - 10, 24, 26);

        // Belt
        c.fillStyle = '#2a1a0a';
        c.fillRect(x - 12, y + 12, 24, 4);

        // Armor detail
        if (av.armorStyle >= 2) {
            c.fillStyle = '#888';
            c.fillRect(x - 10, y - 6, 4, 16);
            c.fillRect(x + 6, y - 6, 4, 16);
        }

        // Arms
        c.fillStyle = sc;
        c.fillRect(x - 18, y - 4, 6, 16);
        c.fillRect(x + 12, y - 4, 6, 16);

        // Shoulder pads
        c.fillStyle = ac;
        c.fillRect(x - 20, y - 8, 8, 6);
        c.fillRect(x + 12, y - 8, 8, 6);

        // Neck
        c.fillStyle = sc;
        c.fillRect(x - 4, y - 16, 8, 6);

        // Head
        c.fillStyle = sc;
        c.fillRect(x - 10, y - 34, 20, 18);

        // Eyes
        c.fillStyle = '#fff';
        c.fillRect(x - 7, y - 28, 5, 4);
        c.fillRect(x + 2, y - 28, 5, 4);
        c.fillStyle = '#000';
        c.fillRect(x - 6, y - 27, 3, 3);
        c.fillRect(x + 3, y - 27, 3, 3);

        // Mouth
        c.fillStyle = '#aa6666';
        c.fillRect(x - 3, y - 21, 6, 2);

        // Hair
        c.fillStyle = hc;
        const hs = av.hairStyle;
        if (hs === 0) { c.fillRect(x - 10, y - 38, 20, 6); }
        else if (hs === 1) { c.fillRect(x - 10, y - 38, 20, 6); c.fillRect(x - 12, y - 34, 4, 20); c.fillRect(x + 8, y - 34, 4, 20); }
        else if (hs === 2) { c.fillRect(x - 8, y - 42, 16, 10); c.fillRect(x - 4, y - 46, 8, 6); }
        else if (hs === 3) { c.fillRect(x - 10, y - 38, 20, 6); c.fillRect(x - 10, y - 32, 4, 24); c.fillRect(x + 6, y - 32, 4, 24); }
        else if (hs === 4) { /* bald */ }
        else if (hs === 5) { c.fillRect(x - 10, y - 38, 20, 6); c.fillRect(x - 12, y - 36, 4, 12); }

        // Helmet
        if (av.helmet > 0) {
            c.fillStyle = '#666';
            if (av.helmet === 1) { c.fillRect(x - 12, y - 40, 24, 8); c.fillRect(x - 6, y - 44, 12, 6); }
            else if (av.helmet === 2) { c.fillRect(x - 11, y - 36, 22, 14); c.fillStyle = '#000'; c.fillRect(x - 6, y - 28, 4, 4); c.fillRect(x + 2, y - 28, 4, 4); }
            else if (av.helmet === 3) { c.fillStyle = '#ffcc00'; c.fillRect(x - 12, y - 42, 24, 6); c.fillRect(x - 8, y - 46, 16, 6); c.fillRect(x - 2, y - 48, 4, 4); }
        }

        // Tattoo
        if (av.tattoo > 0) {
            c.fillStyle = 'rgba(0,0,0,0.4)';
            if (av.tattoo === 1) {
                c.fillRect(x + 14, y, 2, 8); c.fillRect(x + 16, y + 2, 2, 4);
                c.fillRect(x + 12, y + 4, 4, 2);
            } else if (av.tattoo === 2) {
                for (let i = 0; i < 3; i++) c.fillRect(x + 13, y - 2 + i * 6, 6, 2);
            } else if (av.tattoo === 3) {
                c.fillRect(x + 14, y - 2, 2, 12);
            } else if (av.tattoo === 4) {
                c.fillRect(x + 13, y, 4, 2); c.fillRect(x + 14, y + 2, 2, 4);
            }
        }

        // Backpack
        if (av.backpack > 0) {
            c.fillStyle = av.backpack === 1 ? '#5a3a1a' : av.backpack === 2 ? '#3a5a1a' : '#2a6a3a';
            c.fillRect(x - 18, y - 8, 6, 20);
            if (av.backpack === 2) { c.fillStyle = '#8a6a3a'; c.fillRect(x - 18, y - 12, 6, 6); }
        }

        // Talisman
        if (av.talisman > 0) {
            c.fillStyle = av.talisman === 1 ? '#aa6633' : av.talisman === 2 ? '#cc44aa' : '#ffcc00';
            c.beginPath(); c.arc(x, y - 12, 3, 0, Math.PI * 2); c.fill();
        }

        // Class symbol
        c.fillStyle = charData.color;
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillText(charData.icon, x, y + 56);
    }

    window.confirmChar = function() {
        showScreen('mode-screen');
    };

    // ── FORGE ──
    window.switchTab = function(btn, tabId) {
        document.querySelectorAll('.forge-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.forge-tabs .tab').forEach(t => t.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        btn.classList.add('active');
    };

    function setupForge() {
        // Face options
        const faceGrid = document.getElementById('face-options');
        FACE_STYLES.forEach((f, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.face ? ' active' : '');
            btn.textContent = f; btn.onclick = () => { avatar.face = i; updateForgeActive(faceGrid, i); updateForgePreview(); };
            faceGrid.appendChild(btn);
        });

        // Skin colors
        const skinGrid = document.getElementById('skin-options');
        SKIN_COLORS.forEach((color, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn color-btn' + (i === avatar.skin ? ' active' : '');
            btn.style.background = color;
            btn.onclick = () => { avatar.skin = i; updateForgeActive(skinGrid, i); updateForgePreview(); };
            skinGrid.appendChild(btn);
        });

        // Hair styles
        const hairGrid = document.getElementById('hair-style-options');
        HAIR_STYLES.forEach((h, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.hairStyle ? ' active' : '');
            btn.textContent = h; btn.onclick = () => { avatar.hairStyle = i; updateForgeActive(hairGrid, i); updateForgePreview(); };
            hairGrid.appendChild(btn);
        });

        // Hair colors
        const hColorGrid = document.getElementById('hair-color-options');
        HAIR_COLORS.forEach((color, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn color-btn' + (i === avatar.hairColor ? ' active' : '');
            btn.style.background = color;
            btn.onclick = () => { avatar.hairColor = i; updateForgeActive(hColorGrid, i); updateForgePreview(); };
            hColorGrid.appendChild(btn);
        });

        // Armor styles
        const armorGrid = document.getElementById('armor-style-options');
        ARMOR_STYLES.forEach((a, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.armorStyle ? ' active' : '');
            btn.textContent = a; btn.onclick = () => { avatar.armorStyle = i; updateForgeActive(armorGrid, i); updateForgePreview(); };
            armorGrid.appendChild(btn);
        });

        // Armor colors
        const acGrid = document.getElementById('armor-color-options');
        const acColors = CHARACTERS[selectedCharIdx].env === 'jungle' ? ARMOR_COLORS_JUNGLE : ARMOR_COLORS_DESERT;
        acColors.forEach((color, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn color-btn' + (i === avatar.armorColor ? ' active' : '');
            btn.style.background = color;
            btn.onclick = () => { avatar.armorColor = i; updateForgeActive(acGrid, i); updateForgePreview(); };
            acGrid.appendChild(btn);
        });

        // Helmet
        const helmGrid = document.getElementById('helmet-options');
        HELMET_STYLES.forEach((h, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.helmet ? ' active' : '');
            btn.textContent = h; btn.onclick = () => { avatar.helmet = i; updateForgeActive(helmGrid, i); updateForgePreview(); };
            helmGrid.appendChild(btn);
        });

        // Tattoos
        const tatGrid = document.getElementById('tattoo-options');
        TATTOO_STYLES.forEach((t, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.tattoo ? ' active' : '');
            btn.textContent = t; btn.onclick = () => { avatar.tattoo = i; updateForgeActive(tatGrid, i); updateForgePreview(); };
            tatGrid.appendChild(btn);
        });

        // Backpacks
        const bpGrid = document.getElementById('backpack-options');
        BACKPACK_STYLES.forEach((b, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.backpack ? ' active' : '');
            btn.textContent = b; btn.onclick = () => { avatar.backpack = i; updateForgeActive(bpGrid, i); updateForgePreview(); };
            bpGrid.appendChild(btn);
        });

        // Talismans
        const talGrid = document.getElementById('talisman-options');
        TALISMAN_STYLES.forEach((t, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.talisman ? ' active' : '');
            btn.textContent = t; btn.onclick = () => { avatar.talisman = i; updateForgeActive(talGrid, i); updateForgePreview(); };
            talGrid.appendChild(btn);
        });

        // Poses
        const poseGrid = document.getElementById('pose-options');
        POSE_STYLES.forEach((p, i) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn' + (i === avatar.pose ? ' active' : '');
            btn.textContent = p; btn.onclick = () => { avatar.pose = i; updateForgeActive(poseGrid, i); updateForgePreview(); };
            poseGrid.appendChild(btn);
        });
    }

    function updateForgeActive(grid, idx) {
        grid.querySelectorAll('.option-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    }

    window.updateForgePreview = function() {
        const cvs = document.getElementById('forge-canvas');
        const c = cvs.getContext('2d');
        const charData = CHARACTERS[selectedCharIdx];
        document.getElementById('forge-char-name').textContent = charData.name;
        drawCharacterPreview(c, 125, 180, charData, avatar, 1.3);
    };

    window.saveAvatar = function() {
        localStorage.setItem('jds_avatar', JSON.stringify(avatar));
        localStorage.setItem('jds_charIdx', selectedCharIdx);
    };

    // Load saved avatar
    function loadAvatar() {
        const saved = localStorage.getItem('jds_avatar');
        const savedIdx = localStorage.getItem('jds_charIdx');
        if (saved) avatar = JSON.parse(saved);
        if (savedIdx) selectedCharIdx = parseInt(savedIdx);
    }

    // ── GAME START ──
    window.startGame = function(mode) {
        gameMode = mode;
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';

        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        document.getElementById('hud').style.display = 'block';

        const charData = CHARACTERS[selectedCharIdx];
        const st = charData.stats;

        players = [{
            id: 0, char: charData, avatar: {...avatar},
            x: canvas.width / 2, y: canvas.height - 100,
            vx: 0, vy: 0, w: 20, h: 36,
            hp: st.hp, maxHp: st.hp,
            energy: 0, maxEnergy: 100,
            speed: 3 + st.agi / 30,
            jumpPower: 10 + st.agi / 15,
            atkDmg: 10 + st.str / 8,
            atkRange: charData.atkRange,
            atkSpeed: charData.atkSpeed,
            critChance: st.pre / 200,
            facing: 1, grounded: false,
            attacking: false, atkTimer: 0, atkCooldown: 0,
            blocking: false, hitstun: 0, invTimer: 0,
            poisonTimer: 0, poisonDmg: 0,
            specialTimer: 0, specialCooldown: 0,
        }];

        if (mode === 'coop') {
            players.push({
                id: 1, char: CHARACTERS[(selectedCharIdx + 1) % 4], avatar: {...avatar},
                x: canvas.width / 2 + 60, y: canvas.height - 100,
                vx: 0, vy: 0, w: 20, h: 36,
                hp: 100, maxHp: 100, energy: 0, maxEnergy: 100,
                speed: 3.5, jumpPower: 10, atkDmg: 12, atkRange: 35, atkSpeed: 1.0,
                critChance: 0.15, facing: 1, grounded: false,
                attacking: false, atkTimer: 0, atkCooldown: 0,
                blocking: false, hitstun: 0, invTimer: 0,
                poisonTimer: 0, poisonDmg: 0, specialTimer: 0, specialCooldown: 0,
                keys: { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', atk:'Period', spl:'Comma', block:'ArrowDown' }
            });
        }

        scorpions = [];
        particles = [];
        pickups = [];
        Juice.clear();
        Juice.clearDamageNumbers();
        Juice.clearFlashes();
        Juice.initAudio();
        wave = 1;
        waveTimer = 0;
        waveDelay = false;
        score = 0;
        totalKills = 0;
        gameState = 'playing';
        setupPlatforms();
        spawnWave();
        setupHUD();
        gameLoop();
    };

    function setupPlatforms() {
        platforms = [
            { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
        ];
        const spacing = canvas.width / 5;
        for (let i = 1; i < 5; i++) {
            platforms.push({ x: spacing * i - 50, y: canvas.height - 120 - (i % 2) * 60, w: 100, h: 12 });
        }
        platforms.push({ x: canvas.width / 2 - 60, y: canvas.height - 220, w: 120, h: 12 });
    }

    function setupHUD() {
        const charData = players[0].char;
        document.getElementById('hud-name-1').textContent = charData.name;
        const av1 = document.getElementById('hud-avatar-1');
        drawCharacterPreview(av1.getContext('2d'), 25, 30, charData, players[0].avatar, 0.5);

        if (players.length > 1) {
            document.getElementById('hud-p2').style.display = 'flex';
            document.getElementById('hud-name-2').textContent = players[1].char.name;
            const av2 = document.getElementById('hud-avatar-2');
            drawCharacterPreview(av2.getContext('2d'), 25, 30, players[1].char, players[1].avatar, 0.5);
        }
    }

    // ── WAVE SYSTEM ──
    function spawnWave() {
        waveDelay = false;
        Juice.SFX.wave_start();
        if (wave % 3 === 0) Juice.setWeather('sandstorm', 200);
        if (wave % 5 === 0) Juice.setWeather('night', 300);
        const baseCount = 3 + wave * 2;
        for (let i = 0; i < baseCount; i++) {
            setTimeout(() => {
                if (gameState !== 'playing') return;
                const typeIdx = wave >= 5 && Math.random() < 0.2 ? 2 : wave >= 3 && Math.random() < 0.3 ? 1 : 0;
                const type = SCORPION_TYPES[typeIdx];
                const side = Math.random() < 0.5 ? -30 : canvas.width + 30;
                scorpions.push({
                    x: side, y: canvas.height - 60,
                    vx: (side < 0 ? 1 : -1) * type.speed,
                    vy: 0, w: type.size, h: type.size * 0.7,
                    hp: type.hp + wave * 3, maxHp: type.hp + wave * 3,
                    dmg: type.dmg + wave, speed: type.speed,
                    type: typeIdx, color: type.color,
                    size: type.size, atkCooldown: 0,
                    poisonChance: wave >= 3 ? 0.15 : 0,
                    grounded: false, stunTimer: 0,
                    xp: type.xp, points: type.points,
                    scuttling: Math.random() * Math.PI * 2,
                });
            }, i * 400);
        }
    }

    // ── GAME LOOP ──
    function gameLoop() {
        if (gameState !== 'playing') return;
        update();
        render();
        frame++;
        requestAnimationFrame(gameLoop);
    }

    // ── UPDATE ──
    function update() {
        // Players
        players.forEach(p => updatePlayer(p));

        // Scorpions
        scorpions.forEach((s, i) => {
            if (s.stunTimer > 0) { s.stunTimer--; s.vx *= 0.8; return; }

            // AI: move toward nearest player
            let target = players[0];
            let minD = 9999;
            players.forEach(p => {
                const d = Math.hypot(p.x - s.x, p.y - s.y);
                if (d < minD) { minD = d; target = p; }
            });

            if (minD > 40) {
                s.vx = Math.sign(target.x - s.x) * s.speed;
            } else {
                s.vx *= 0.5;
                if (s.atkCooldown <= 0) {
                    dealDamageToPlayer(target, s.dmg, s);
                    s.atkCooldown = 40;
                }
            }

            // Gravity
            s.vy += 0.5;
            s.x += s.vx;
            s.y += s.vy;
            s.scuttling += 0.1;

            // Ground
            if (s.y > canvas.height - 40 - s.h / 2) {
                s.y = canvas.height - 40 - s.h / 2;
                s.vy = 0;
                s.grounded = true;
            }

            if (s.atkCooldown > 0) s.atkCooldown--;

            // Off screen
            if (s.x < -100 || s.x > canvas.width + 100) {
                scorpions.splice(i, 1);
            }
        });

        // Wave management
        if (scorpions.length === 0 && !waveDelay) {
            waveDelay = true;
            waveTimer = 120;
        }
        if (waveDelay) {
            waveTimer--;
            if (waveTimer <= 0) {
                wave++;
                if (wave > 10) {
                    gameState = 'victory';
                    Juice.SFX.victory();
                    Juice.Effects.energyBurst(canvas.width / 2, canvas.height / 2, '#ffcc00');
                    document.getElementById('victory-screen').classList.add('active');
                    document.getElementById('victory-screen').style.display = 'flex';
                    document.getElementById('hud').style.display = 'none';
                    canvas.style.display = 'none';
                    return;
                }
                spawnWave();
            }
        }

        // Pickups
        pickups.forEach((pk, i) => {
            pk.vy = (pk.vy || 0) + 0.1;
            pk.y += pk.vy;
            pk.bob = (pk.bob || 0) + 0.05;
            if (pk.y > canvas.height - 50) { pk.y = canvas.height - 50; pk.vy = 0; }

            players.forEach(p => {
                if (Math.abs(p.x - pk.x) < 20 && Math.abs(p.y - pk.y) < 20) {
                    if (pk.type === 'health') { p.hp = Math.min(p.maxHp, p.hp + 25); }
                    else if (pk.type === 'energy') { p.energy = Math.min(p.maxEnergy, p.energy + 30); }
                    else if (pk.type === 'speed') { p.speed += 1; setTimeout(() => p.speed -= 1, 5000); }
                    pickups.splice(i, 1);
                    Juice.Effects.poof(pk.x, pk.y, pk.type === 'health' ? '#44ff44' : pk.type === 'energy' ? '#44aaff' : '#ffff44');
                    Juice.SFX.pickup(p.x / canvas.width * 2 - 1);
                }
            });
        });

        // Poison
        players.forEach(p => {
            if (p.poisonTimer > 0) {
                p.poisonTimer--;
                if (p.poisonTimer % 20 === 0) {
                    p.hp -= p.poisonDmg;
                    Juice.Effects.venomSplash(p.x, p.y);
                    Juice.damageNumber(p.x, p.y - 15, p.poisonDmg, '#88ff44', false);
                }
                document.getElementById('poison-indicator').style.display = 'block';
            } else {
                document.getElementById('poison-indicator').style.display = 'none';
            }
            if (p.hp <= 0) {
                gameState = 'dead';
                Juice.SFX.death(0);
                Juice.Effects.deathBurst(p.x, p.y, '#ff4444');
                Juice.shake(8, 10);
                Juice.slowMotion(0.3, 20);
                document.getElementById('death-score').textContent = score;
                document.getElementById('death-wave').textContent = wave;
                document.getElementById('death-kills').textContent = totalKills;
                document.getElementById('death-screen').classList.add('active');
                document.getElementById('death-screen').style.display = 'flex';
                document.getElementById('hud').style.display = 'none';
                canvas.style.display = 'none';
            }
        });

        Juice.updateDamageNumbers();
        updateHUDBars();
    }

    function updatePlayer(p) {
        if (p.hitstun > 0) { p.vx *= 0.85; p.hitstun--; return; }

        const k = p.keys || { left:'KeyQ', right:'KeyD', up:'KeyZ', down:'KeyS', atk:'KeyF', spl:'KeyG', block:'KeyE' };

        p.blocking = keys[k.block] && p.grounded && !p.attacking;
        if (p.blocking) { p.vx *= 0.4; return; }

        if (keys[k.left]) { p.vx = -p.speed; p.facing = -1; }
        else if (keys[k.right]) { p.vx = p.speed; p.facing = 1; }
        else { p.vx *= 0.7; }

        // Running dust & footstep sounds
        if (Math.abs(p.vx) > 1 && p.grounded) {
            footstepTimer++;
            if (footstepTimer % 8 === 0) {
                Juice.Effects.dustRun(p.x, p.y + p.h / 2, p.facing);
                Juice.SFX.footstep_sand(p.x / canvas.width * 2 - 1);
            }
        }

        if (keys[k.up] && p.grounded) {
            p.vy = -p.jumpPower;
            p.grounded = false;
            Juice.Effects.dustLand(p.x, p.y + p.h / 2);
            Juice.SFX.jump(p.x / canvas.width * 2 - 1);
        }

        // Attack
        if (keys[k.atk] && p.atkCooldown <= 0 && !p.attacking) {
            p.attacking = true;
            p.atkTimer = 10;
            p.atkCooldown = Math.floor(18 / p.atkSpeed);
        }

        // Special
        if (keys[k.spl] && p.energy >= 100 && p.specialCooldown <= 0) {
            p.specialTimer = 25;
            p.specialCooldown = 60;
            p.energy = 0;
            Juice.SFX.special(0);
            Juice.Effects.energyBurst(p.x, p.y, p.char.color);
            Juice.shake(8, 12);
            setTimeout(() => {
                scorpions.forEach(s => {
                    if (Math.abs(s.x - p.x) < 100 && Math.abs(s.y - p.y) < 80) {
                        damageScorpion(s, p.atkDmg * 3, p);
                        Juice.Effects.critSparks(s.x, s.y);
                    }
                });
            }, 250);
        }

        if (p.attacking) {
            p.atkTimer--;
            if (p.atkTimer === 4) {
                const atkX = p.x + p.facing * p.atkRange;
                const pan = p.x / canvas.width * 2 - 1;
                scorpions.forEach(s => {
                    if (Math.abs(s.x - atkX) < p.atkRange && Math.abs(s.y - p.y) < 30) {
                        const isCrit = Math.random() < p.critChance;
                        const dmg = p.atkDmg * (isCrit ? 2.5 : 1);
                        damageScorpion(s, dmg, p);
                        if (isCrit) {
                            Juice.Effects.critSparks(s.x, s.y);
                            Juice.SFX.crit(pan);
                            Juice.shake(6, 6);
                            Juice.slowMotion(0.3, 8);
                        } else {
                            Juice.Effects.hitSparks(s.x, s.y, p.char.color);
                            Juice.SFX.punch(pan);
                            Juice.shake(3, 4);
                        }
                        Juice.damageNumber(s.x, s.y - 15, dmg, isCrit ? '#ffff00' : '#ff4444', isCrit);
                        Juice.flash(s, '#fff', 4);
                        p.energy = Math.min(p.maxEnergy, p.energy + 8);
                    }
                });
                Juice.Effects.slashTrail(atkX, p.y, p.facing, p.char.color);
                Juice.SFX.woosh(pan);
            }
            if (p.atkTimer <= 0) p.attacking = false;
        }
        if (p.atkCooldown > 0) p.atkCooldown--;
        if (p.specialCooldown > 0) p.specialCooldown--;

        // Physics
        p.vy += 0.5;
        if (p.vy > 14) p.vy = 14;
        p.x += p.vx;
        p.y += p.vy;

        p.grounded = false;
        platforms.forEach(pl => {
            if (p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w &&
                p.y + p.h / 2 > pl.y && p.y + p.h / 2 < pl.y + pl.h + 10 && p.vy >= 0) {
                p.y = pl.y - p.h / 2;
                p.vy = 0;
                p.grounded = true;
            }
        });

        if (p.x < 16) p.x = 16;
        if (p.x > canvas.width - 16) p.x = canvas.width - 16;
        if (p.y > canvas.height) { p.hp = 0; }
    }

    function damageScorpion(s, dmg, player) {
        s.hp -= dmg;
        s.stunTimer = 8;
        s.vx = Math.sign(s.x - player.x) * 5;
        s.vy = -3;
        Juice.flash(s, '#fff', 4);

        if (s.hp <= 0) {
            score += s.points;
            totalKills++;
            Juice.Effects.deathBurst(s.x, s.y, s.color);
            Juice.SFX.scorpion_death(s.x / canvas.width * 2 - 1);
            Juice.shake(5, 6);
            // Drop pickup
            if (Math.random() < 0.3) {
                const types = ['health','energy','speed'];
                pickups.push({ x: s.x, y: s.y, type: types[Math.floor(Math.random() * 3)], vy: -3 });
                Juice.Effects.sparkle(s.x, s.y, pk.type === 'health' ? '#44ff44' : '#44aaff');
            }
        } else {
            Juice.SFX.scorpion_hit(s.x / canvas.width * 2 - 1);
        }
    }

    function dealDamageToPlayer(p, dmg, scorpion) {
        if (p.invTimer > 0) return;
        if (p.blocking) {
            Juice.Effects.hitSparks(p.x, p.y, '#88aaff');
            Juice.SFX.block(p.x / canvas.width * 2 - 1);
            return;
        }
        const pan = p.x / canvas.width * 2 - 1;
        p.hp -= dmg;
        p.hitstun = 8;
        p.invTimer = 15;
        p.vx = Math.sign(p.x - scorpion.x) * 4;
        p.vy = -3;
        Juice.shake(5, 6);
        Juice.SFX.hurt(pan);
        Juice.damageNumber(p.x, p.y - 20, dmg, '#ff4444', false);
        Juice.Effects.hitSparks(p.x, p.y, '#ff4444');

        if (scorpion.poisonChance > 0 && Math.random() < scorpion.poisonChance) {
            p.poisonTimer = 120;
            p.poisonDmg = 2;
            Juice.SFX.poison(pan);
        }
    }

    function updateHUDBars() {
        const p1 = players[0];
        document.getElementById('hud-hp-1').style.width = Math.max(0, (p1.hp / p1.maxHp) * 100) + '%';
        document.getElementById('hud-energy-1').style.width = (p1.energy / p1.maxEnergy * 100) + '%';
        document.getElementById('hud-name-1').textContent = p1.char.name;
        if (players.length > 1) {
            const p2 = players[1];
            document.getElementById('hud-hp-2').style.width = Math.max(0, (p2.hp / p2.maxHp) * 100) + '%';
            document.getElementById('hud-energy-2').style.width = (p2.energy / p2.maxEnergy * 100) + '%';
        }
        document.getElementById('wave-display').textContent = `VAGUE ${wave}`;
        document.getElementById('score-display').textContent = `SCORE: ${score}`;
    }

    // ── RENDER ──
    function render() {
        ctx.save();

        // Camera effects
        Juice.updateCamera();
        Juice.applyCamera(ctx);

        // Background - gradient sky
        const skyG = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyG.addColorStop(0, '#1a3a2a');
        skyG.addColorStop(0.5, '#2a4a1a');
        skyG.addColorStop(1, '#3a3a1a');
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sun
        ctx.fillStyle = 'rgba(255,200,100,0.1)';
        ctx.beginPath(); ctx.arc(canvas.width - 80, 60, 40, 0, Math.PI * 2); ctx.fill();

        // Background trees / cacti
        drawBackground();

        // Weather overlay
        Juice.updateWeather(canvas.width, canvas.height);
        Juice.drawWeatherOverlay(ctx, canvas.width, canvas.height);

        // Platforms
        platforms.forEach(p => {
            if (p.h < 20) {
                ctx.fillStyle = '#3a2a1a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#2a5a1a';
                ctx.fillRect(p.x, p.y, p.w, 3);
            } else {
                ctx.fillStyle = '#3a5a1a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#2a4a0a';
                ctx.fillRect(p.x, p.y, p.w, 4);
            }
        });

        // Pickups (with glow)
        pickups.forEach(pk => {
            const bobY = pk.y + Math.sin(pk.bob || 0) * 3;
            ctx.save();
            ctx.shadowColor = pk.type === 'health' ? '#44ff44' : pk.type === 'energy' ? '#44aaff' : '#ffff44';
            ctx.shadowBlur = 10 + Math.sin(frame * 0.1) * 3;
            ctx.fillStyle = pk.type === 'health' ? '#44ff44' : pk.type === 'energy' ? '#44aaff' : '#ffff44';
            ctx.beginPath();
            ctx.arc(pk.x, bobY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(pk.type === 'health' ? '♥' : pk.type === 'energy' ? '★' : '⚡', pk.x, bobY + 3);
            // Sparkle
            if (frame % 12 === 0) Juice.Effects.sparkle(pk.x + (Math.random()-0.5)*10, bobY + (Math.random()-0.5)*10, ctx.fillStyle);
        });

        // Scorpions (with hit flash)
        scorpions.forEach(s => {
            Juice.drawFlash(ctx, s, () => drawScorpion(s));
        });

        // Players (with hit flash)
        players.forEach(p => {
            Juice.drawFlash(ctx, p, () => drawPlayer(p));
        });

        // Juice particles
        Juice.updateAll();
        Juice.drawAll(ctx);

        // Damage numbers
        Juice.updateDamageNumbers();
        Juice.drawDamageNumbers(ctx);

        // Wave delay text
        if (waveDelay && waveTimer > 0) {
            ctx.fillStyle = '#c8a050';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.globalAlpha = Math.sin(frame * 0.1) * 0.3 + 0.7;
            ctx.fillText(`VAGUE ${wave + 1}`, canvas.width / 2, canvas.height / 2 - 40);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    function drawBackground() {
        // Jungle trees on left
        for (let i = 0; i < 4; i++) {
            const tx = 30 + i * 80;
            const th = 80 + Math.sin(i * 3) * 30;
            ctx.fillStyle = '#1a3a0a';
            ctx.fillRect(tx - 4, canvas.height - 40 - th, 8, th);
            ctx.fillStyle = '#2a5a1a';
            ctx.beginPath(); ctx.arc(tx, canvas.height - 40 - th, 25, 0, Math.PI * 2); ctx.fill();
        }
        // Desert cacti on right
        for (let i = 0; i < 3; i++) {
            const cx = canvas.width - 60 - i * 90;
            ctx.fillStyle = '#4a6a2a';
            ctx.fillRect(cx - 3, canvas.height - 80, 6, 40);
            ctx.fillRect(cx - 15, canvas.height - 70, 12, 4);
            ctx.fillRect(cx + 3, canvas.height - 60, 12, 4);
        }
    }

    function drawScorpion(s) {
        const x = s.x, y = s.y;
        const ps = s.size / 6;

        ctx.save();
        if (s.vx < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }

        // Body
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.ellipse(x, y, s.size / 2, s.size / 3, 0, 0, Math.PI * 2); ctx.fill();

        // Segments
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x - s.size / 3 + i * ps * 2, y - 2, 2, 4);
        }

        // Claws
        const clawAngle = Math.sin(s.scuttling) * 0.3;
        ctx.fillStyle = s.color;
        ctx.save();
        ctx.translate(x - s.size / 2, y);
        ctx.rotate(-0.3 + clawAngle);
        ctx.fillRect(-8, -3, 8, 3);
        ctx.fillRect(-10, -4, 3, 5);
        ctx.restore();
        ctx.save();
        ctx.translate(x + s.size / 2, y);
        ctx.rotate(0.3 - clawAngle);
        ctx.fillRect(0, -3, 8, 3);
        ctx.fillRect(7, -4, 3, 5);
        ctx.restore();

        // Legs
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const lx = x - s.size / 3 + i * (s.size / 4);
            const ly = y + s.size / 3;
            const legOff = Math.sin(s.scuttling + i * 0.8) * 3;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx - 4, ly + 6 + legOff);
            ctx.lineTo(lx - 2, ly + 10 + legOff);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + 4, ly + 6 - legOff);
            ctx.lineTo(lx + 2, ly + 10 - legOff);
            ctx.stroke();
        }

        // Tail
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + s.size / 2, y);
        const tailX = x + s.size / 2 + 8;
        const tailY = y - 12 + Math.sin(s.scuttling * 2) * 4;
        ctx.quadraticCurveTo(tailX, y - 5, tailX, tailY);
        ctx.stroke();

        // Stinger
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(tailX, tailY, 2, 0, Math.PI * 2); ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x - s.size / 3, y - s.size / 4, 2, 2);
        ctx.fillRect(x + s.size / 4, y - s.size / 4, 2, 2);

        // HP bar
        if (s.hp < s.maxHp) {
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 12, y - s.size / 2 - 8, 24, 4);
            ctx.fillStyle = s.hp / s.maxHp > 0.5 ? '#44dd44' : '#dd4444';
            ctx.fillRect(x - 12, y - s.size / 2 - 8, 24 * (s.hp / s.maxHp), 4);
        }

        // Stun stars
        if (s.stunTimer > 0) {
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < 3; i++) {
                const a = frame * 0.2 + i * 2;
                ctx.fillRect(x + Math.cos(a) * 12, y - s.size / 2 - 4 + Math.sin(a) * 6, 3, 3);
            }
        }

        ctx.restore();
    }

    function drawPlayer(p) {
        if (p.invTimer > 0 && frame % 4 < 2) return;

        const x = Math.floor(p.x), y = Math.floor(p.y);
        const av = p.avatar;
        const sc = SKIN_COLORS[av.skin];
        const hc = HAIR_COLORS[av.hairColor];
        const ac = (p.char.env === 'jungle' ? ARMOR_COLORS_JUNGLE : ARMOR_COLORS_DESERT)[av.armorColor] || p.char.color;

        ctx.save();
        if (p.facing < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(x, y + p.h / 2 + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Block shield
        if (p.blocking) {
            ctx.fillStyle = 'rgba(100,150,255,0.3)';
            ctx.fillRect(x - 14, y - 16, 28, 36);
            ctx.strokeStyle = '#88f';
            ctx.strokeRect(x - 14, y - 16, 28, 36);
        }

        // Legs
        const walk = Math.sin(frame * 0.15) * (Math.abs(p.vx) > 0.5 ? 3 : 0);
        ctx.fillStyle = ac;
        ctx.fillRect(x - 6, y + 6, 5, 12 + walk);
        ctx.fillRect(x + 1, y + 6, 5, 12 - walk);

        // Body
        ctx.fillStyle = ac;
        ctx.fillRect(x - 9, y - 8, 18, 16);

        // Belt
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(x - 9, y + 6, 18, 3);

        // Arms
        ctx.fillStyle = sc;
        ctx.fillRect(x - 14, y - 4, 5, 12);
        ctx.fillRect(x + 9, y - 4, 5, 12);

        // Shoulder pads
        ctx.fillStyle = ac;
        ctx.fillRect(x - 15, y - 8, 7, 5);
        ctx.fillRect(x + 8, y - 8, 7, 5);

        // Head
        ctx.fillStyle = sc;
        ctx.fillRect(x - 7, y - 22, 14, 14);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 18, 4, 3);
        ctx.fillRect(x + 1, y - 18, 4, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 4, y - 17, 2, 2);
        ctx.fillRect(x + 2, y - 17, 2, 2);

        // Hair
        ctx.fillStyle = hc;
        ctx.fillRect(x - 7, y - 26, 14, 5);

        // Helmet
        if (av.helmet > 0) {
            ctx.fillStyle = '#666';
            if (av.helmet === 1) ctx.fillRect(x - 8, y - 28, 16, 6);
            else if (av.helmet === 2) ctx.fillRect(x - 8, y - 24, 16, 12);
            else if (av.helmet === 3) { ctx.fillStyle = '#ffcc00'; ctx.fillRect(x - 8, y - 30, 16, 5); }
        }

        // Attack arm
        if (p.attacking && p.atkTimer > 2) {
            const atkLen = (10 - p.atkTimer) * 4;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 10, y - 2, atkLen, 4);
            ctx.fillStyle = p.char.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + 12 + atkLen, y - 4, 4, 8);
            ctx.globalAlpha = 1;
        }

        // Special glow
        if (p.specialTimer > 0) {
            ctx.fillStyle = p.char.color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Poison effect
        if (p.poisonTimer > 0 && frame % 6 < 3) {
            ctx.fillStyle = '#88ff44';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x - 10, y - 28, 20, 40);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    // ── PAUSE / QUIT ──
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

    window.resumeGame = function() {
        gameState = 'playing';
        document.getElementById('pause-overlay').style.display = 'none';
        gameLoop();
    };

    window.quitToMenu = function() {
        gameState = 'menu';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('death-screen').style.display = 'none';
        document.getElementById('death-screen').classList.remove('active');
        document.getElementById('victory-screen').style.display = 'none';
        document.getElementById('victory-screen').classList.remove('active');
        canvas.style.display = 'none';
        showScreen('menu-screen');
    };

    window.restartGame = function() {
        document.getElementById('death-screen').style.display = 'none';
        document.getElementById('death-screen').classList.remove('active');
        startGame(gameMode);
    };

    // ── INIT ──
    loadAvatar();
    setupForge();
    updateCharDisplay();
})();
