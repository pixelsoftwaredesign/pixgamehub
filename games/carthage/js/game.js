const introCanvas = document.getElementById('intro-canvas');
const introScreen = document.getElementById('intro-screen');
const gameCanvas = document.getElementById('game-canvas');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameover-screen');

let scene;
let hero;
let gameRunning = false;
let gameMode = 'campaign';
let time = 0;
let turn = 1;
let gold = 500, stone = 300, pop = 50, army = 20, navy = 10;
let morale = 80, food = 100;
let provinces = [];
let tradeRoutes = [];
let selectedProvince = null;
let eventLog = [];
let mouseX = 0, mouseY = 0;
let hoverProvince = null;
let relations = {};
let season = 'spring';
let warWith = [];
let techTree = { military: 0, commerce: 0, naval: 0, culture: 0 };

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_COLORS = {
    spring: { water: '#1a3a6a', land: '#3a6a2a', sky: '#2a4a8a' },
    summer: { water: '#1a4a8a', land: '#5a8a2a', sky: '#4a6aaa' },
    autumn: { water: '#2a3a5a', land: '#8a6a2a', sky: '#6a4a5a' },
    winter: { water: '#2a2a4a', land: '#6a5a4a', sky: '#4a4a5a' }
};

const Factions = {
    CARTHAGE: { name: 'Carthage', color: '#d4a017', capital: 0 },
    ROME: { name: 'Rome', color: '#cc2222', capital: 8 },
    SYRACUSE: { name: 'Syracuse', color: '#2266cc', capital: 10 },
    NUMIDIA: { name: 'Numidie', color: '#22aa44', capital: 13 },
    EGYPT: { name: 'Égypte', color: '#ccaa22', capital: 15 },
    MACEDON: { name: 'Macédoine', color: '#6644aa', capital: 14 }
};

function initIntro() {
    introCanvas.width = window.innerWidth;
    introCanvas.height = window.innerHeight;
    scene = new CarthageScene(introCanvas);
    hero = new CarthageHero();
    hero.capeColor = '#4a154b';
    hero.armorLevel = 1;
    hero.helmetType = 2;
    hero.hasShield = true;
    hero.hasSpear = true;
    hero.state = 'idle';

    document.getElementById('title-glyphs').textContent = CarthageAlphabet.toGlyph('CARTHAGO');
    document.getElementById('title-glyphs-bottom').textContent = CarthageAlphabet.toGlyph('DEI KOTHAN');

    animateIntro();
}

function animateIntro() {
    if (gameRunning) return;
    time++;
    scene.render(time);
    requestAnimationFrame(animateIntro);
}

function startGame(mode) {
    gameMode = mode;
    gameRunning = true;
    introScreen.style.display = 'none';
    gameCanvas.style.display = 'block';
    hud.style.display = 'block';
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;

    initMediterraneanMap();
    initRelations();
    updateHUD();
    addLog('🏛️ L\'empire de Carthage s\'étend sur la Méditerranée...');
    addLog('⚔️ Rome menace nos frontières.');

    showEvent('L\'Assemblée du Peuple',
        'Les anciens de Carthage se réunissent au temple d\'Eshmoun. Quelle décision prendre ?',
        [
            { text: '🏗️ Investir dans les constructions (+50 pierre)', action: () => { stone += 50; addLog('🏗️ Construction lancée.'); endTurn(); }},
            { text: '⚔️ Renforcer l\'armée (+20 soldats)', action: () => { army += 20; pop -= 5; addLog('⚔️ Recrutement massif.'); endTurn(); }},
            { text: '💰 Développer le commerce (+100 or)', action: () => { gold += 100; addLog('💰 Flottes commerciales déployées.'); endTurn(); }}
        ]
    );

    gameCanvas.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    gameCanvas.addEventListener('click', onGameClick);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && gameRunning) togglePause(); });

    gameLoop();
}

function geoToScreen(lon, lat) {
    const x = (lon + 10) / 46;
    const y = (46 - lat) / 16;
    return { x: Math.max(0.02, Math.min(0.98, x)), y: Math.max(0.02, Math.min(0.98, y)) };
}

function initMediterraneanMap() {
    const W = gameCanvas.width;
    const H = gameCanvas.height;

    const raw = [
        { name: 'Carthage', lon: 10.2, lat: 36.8, owner: 'carthage', strength: 40, gold: 25, level: 2, type: 'city', pop: 15 },
        { name: 'Utique', lon: 10.1, lat: 37.1, owner: 'carthage', strength: 20, gold: 12, level: 1, type: 'port', pop: 5 },
        { name: 'Hippo Regius', lon: 7.7, lat: 36.9, owner: 'carthage', strength: 15, gold: 10, level: 1, type: 'port', pop: 4 },
        { name: 'Leptis Minor', lon: 10.8, lat: 34.2, owner: 'carthage', strength: 18, gold: 14, level: 1, type: 'city', pop: 6 },
        { name: 'Hadrumete', lon: 10.6, lat: 34.7, owner: 'carthage', strength: 15, gold: 10, level: 1, type: 'port', pop: 4 },
        { name: 'Syrte', lon: 17.9, lat: 31.2, owner: 'carthage', strength: 12, gold: 8, level: 1, type: 'temple', pop: 3 },
        { name: 'Gades', lon: -6.3, lat: 36.5, owner: 'neutral', strength: 30, gold: 15, level: 2, type: 'port', pop: 8, faction: 'SPAIN' },
        { name: 'Ibiza', lon: 1.4, lat: 39.0, owner: 'neutral', strength: 15, gold: 12, level: 1, type: 'port', pop: 4, faction: 'SPAIN' },
        { name: 'Sardaigne', lon: 9.1, lat: 39.2, owner: 'enemy', strength: 55, gold: 20, level: 2, type: 'fort', pop: 8, faction: 'ROME' },
        { name: 'Sicile', lon: 14.3, lat: 37.6, owner: 'enemy', strength: 50, gold: 22, level: 2, type: 'city', pop: 10, faction: 'ROME' },
        { name: 'Corse', lon: 9.0, lat: 42.1, owner: 'enemy', strength: 40, gold: 15, level: 1, type: 'fort', pop: 5, faction: 'ROME' },
        { name: 'Malte', lon: 14.4, lat: 35.9, owner: 'neutral', strength: 20, gold: 18, level: 2, type: 'temple', pop: 3, faction: 'INDEP' },
        { name: 'Tripolitaine', lon: 13.2, lat: 32.9, owner: 'carthage', strength: 15, gold: 10, level: 1, type: 'city', pop: 5 },
        { name: 'Numidie', lon: 3.0, lat: 36.8, owner: 'enemy', strength: 45, gold: 12, level: 1, type: 'fort', pop: 10, faction: 'NUMIDIA' },
        { name: 'Cyrène', lon: 21.9, lat: 32.8, owner: 'carthage', strength: 18, gold: 14, level: 1, type: 'temple', pop: 4 },
        { name: 'Alexandrie', lon: 29.9, lat: 31.2, owner: 'enemy', strength: 35, gold: 20, level: 2, type: 'city', pop: 12, faction: 'EGYPT' }
    ];

    provinces = raw.map(p => {
        const s = geoToScreen(p.lon, p.lat);
        return {
            ...p,
            x: s.x * W,
            y: s.y * H,
            w: 60 + Math.random() * 16,
            h: 48 + Math.random() * 12,
            pulse: Math.random() * Math.PI * 2,
            isCapital: p.name === 'Carthage' || p.name === 'Alexandrie',
            fortLevel: p.type === 'fort' ? 2 : 0,
            tradePost: p.type === 'port',
            unrest: 0,
            loyalty: p.owner === 'carthage' ? 80 : 50
        };
    });

    tradeRoutes = [
        [0, 1], [1, 2], [0, 3], [3, 4], [4, 5],
        [0, 14], [5, 14], [14, 15],
        [6, 7], [8, 10], [9, 11], [2, 13],
        [0, 9], [0, 12]
    ];
}

function initRelations() {
    relations = {
        ROME: -30,
        SYRACUSE: 0,
        NUMIDIA: 10,
        EGYPT: 20,
        MACEDON: -10
    };
    warWith = ['ROME'];
}

function onGameClick(e) {
    if (!gameRunning) return;
    const mx = e.clientX;
    const my = e.clientY;

    for (const p of provinces) {
        const dx = mx - p.x;
        const dy = my - p.y;
        if (Math.abs(dx) < p.w / 2 && Math.abs(dy) < p.h / 2) {
            selectProvince(p);
            return;
        }
    }
}

function selectProvince(p) {
    selectedProvince = p;
    const ownerLabel = p.owner === 'carthage' ? 'Notre empire' :
                       p.owner === 'enemy' ? (p.faction || 'Ennemi') : 'Indépendant';
    document.getElementById('info-text').textContent =
        `${p.name} — ${ownerLabel} | ⚔${p.strength} | 🪙${p.gold}/tour | Pop: ${p.pop}`;

    if (p.owner === 'carthage') {
        const upgCost = 15 * p.level;
        const recruitCount = 5 + p.level * 3;
        showEvent(p.name,
            `Province de ${p.name} (${p.type}). Niveau ${p.level}. Loyauté: ${p.loyalty}%.`,
            [
                { text: `🏗️ Améliorer (+${upgCost} pierre)`, action: () => {
                    if (stone >= upgCost) { stone -= upgCost; p.level++; addLog(`🏗️ ${p.name} au niveau ${p.level}.`); }
                    else addLog('⚠️ Pas assez de pierre.'); endTurn();
                }},
                { text: `⚔️ Recruter (+${recruitCount} soldats, 25 or)`, action: () => {
                    if (gold >= 25) { gold -= 25; army += recruitCount; addLog(`⚔️ ${recruitCount} soldats recrutés à ${p.name}.`); }
                    else addLog('⚠️ Pas assez d\'or.'); endTurn();
                }},
                { text: `⚓ Recruter marine (+${Math.floor(p.level * 2)} navires, 30 or)`, action: () => {
                    if (gold >= 30) { gold -= 30; navy += Math.floor(p.level * 2); addLog(`⚓ Flotte renforcée à ${p.name}.`); }
                    else addLog('⚠️ Pas assez d\'or.'); endTurn();
                }},
                { text: '❌ Fermer', action: () => {} }
            ]
        );
    } else if (p.owner === 'neutral') {
        const atkCost = Math.max(10, p.strength);
        showEvent(p.name,
            `${p.name} est indépendant. Force: ${p.strength}. Que faire ?`,
            [
                { text: `⚔️ Attaquer (${atkCost} or, ${Math.floor(p.strength * 0.8)} armée min)`, action: () => {
                    if (gold >= atkCost && army >= p.strength * 0.8) {
                        gold -= atkCost;
                        const ratio = army / (p.strength + army * 0.5);
                        const win = Math.random() < ratio;
                        if (win) {
                            p.owner = 'carthage'; p.color = '#d4a017';
                            army -= Math.floor(p.strength * 0.25);
                            pop += p.pop;
                            addLog(`🎉 ${p.name} conquise !`);
                        } else {
                            army -= Math.floor(p.strength * 0.4);
                            addLog(`💀 Défaite à ${p.name}...`);
                        }
                    } else addLog('⚠️ Ressources ou armée insuffisantes.'); endTurn();
                }},
                { text: `💰 Offrir tribut (+40 or, améliore relations)`, action: () => {
                    if (gold >= 40) { gold -= 40; p.strength = Math.max(5, p.strength - 8);
                        if (p.faction && relations[p.faction] !== undefined) relations[p.faction] += 10;
                        addLog(`🤝 Tribut envoyé à ${p.name}.`);
                    } else addLog('⚠️ Pas assez d\'or.'); endTurn();
                }},
                { text: '❌ Fermer', action: () => {} }
            ]
        );
    } else {
        const isAtWar = p.faction && warWith.includes(p.faction);
        const atkCost = isAtWar ? p.strength * 1.5 : p.strength * 2.5;
        const choices = [];

        if (isAtWar) {
            choices.push({ text: `⚔️ Attaquer (${Math.floor(atkCost)} or)`, action: () => {
                if (gold >= atkCost && army >= p.strength) {
                    gold -= atkCost;
                    const ratio = army / (p.strength + army * 0.6);
                    const win = Math.random() < ratio;
                    if (win) {
                        p.owner = 'carthage'; p.color = '#d4a017';
                        army -= Math.floor(p.strength * 0.35);
                        addLog(`🎉 ${p.name} conquise à ${p.faction} !`);
                    } else {
                        army -= Math.floor(p.strength * 0.5);
                        addLog(`💀 Défaite coûteuse à ${p.name}...`);
                    }
                } else addLog('⚠️ Ressources insuffisantes.'); endTurn();
            }});
            choices.push({ text: `🕊️ Demander la paix (100 or)`, action: () => {
                if (gold >= 100) { gold -= 100;
                    if (p.faction) { warWith = warWith.filter(f => f !== p.faction);
                        if (relations[p.faction] !== undefined) relations[p.faction] += 20; }
                    addLog(`🕊️ Paix signée avec ${p.faction || p.name}.`);
                } else addLog('⚠️ Pas assez d\'or.'); endTurn();
            }});
        } else {
            choices.push({ text: `⚔️ Déclarer la guerre`, action: () => {
                if (p.faction) { warWith.push(p.faction);
                    if (relations[p.faction] !== undefined) relations[p.faction] -= 40; }
                addLog(`⚔️ Guerre déclarée à ${p.faction || p.name} !`); endTurn();
            }});
            choices.push({ text: `🤝 Proposer alliance (80 or)`, action: () => {
                if (gold >= 80) { gold -= 80;
                    if (p.faction && relations[p.faction] !== undefined) {
                        relations[p.faction] += 30;
                        if (relations[p.faction] >= 50) { p.owner = 'carthage'; p.color = '#d4a017';
                            addLog(`🤝 ${p.name} rejoint notre alliance !`);
                        } else addLog(`🤝 Relations améliorées avec ${p.faction}.`);
                    }
                } else addLog('⚠️ Pas assez d\'or.'); endTurn();
            }});
        }
        choices.push({ text: '❌ Fermer', action: () => {} });
        showEvent(p.name, `${p.name} (${p.faction || 'ennemi'}). Force: ${p.strength}. ${isAtWar ? 'EN GUERRE.' : 'Paix.'}`, choices);
    }
}

function gameAction(action) {
    if (!gameRunning) return;
    switch (action) {
        case 'build':
            showEvent('Construction',
                'Que voulez-vous construire ?',
                [
                    { text: '🏛️ Temple (+20 or/tour, -100 or, -50 pierre)', action: () => {
                        if (gold >= 100 && stone >= 50) { gold -= 100; stone -= 50; addLog('🏛️ Temple construit.'); }
                        else addLog('⚠️ Ressources insuffisantes.'); endTurn();
                    }},
                    { text: '🏗️ Mur (+30 défense, -80 pierre)', action: () => {
                        if (stone >= 80) { stone -= 80; army += 10; addLog('🏗️ Murailles renforcées.'); }
                        else addLog('⚠️ Pas assez de pierre.'); endTurn();
                    }},
                    { text: '🏗️ Port (+15 or/tour, -60 or, -30 pierre)', action: () => {
                        if (gold >= 60 && stone >= 30) { gold -= 60; stone -= 30; navy += 5; addLog('🏗️ Port construit.'); }
                        else addLog('⚠️ Ressources insuffisantes.'); endTurn();
                    }},
                    { text: '❌ Annuler', action: () => {} }
                ]
            );
            break;
        case 'recruit':
            showEvent('Recrutement',
                'Combien de soldats recruter ?',
                [
                    { text: '⚔️ +20 (20 or)', action: () => {
                        if (gold >= 20) { gold -= 20; army += 20; addLog('⚔️ 20 soldats recrutés.'); }
                        else addLog('⚠️ Pas assez d\'or.'); endTurn();
                    }},
                    { text: '⚔️ +50 (40 or)', action: () => {
                        if (gold >= 40) { gold -= 40; army += 50; addLog('⚔️ 50 soldats recrutés.'); }
                        else addLog('⚠️ Pas assez d\'or.'); endTurn();
                    }},
                    { text: '⚓ +10 navires (50 or)', action: () => {
                        if (gold >= 50) { gold -= 50; navy += 10; addLog('⚓ 10 navires lancés.'); }
                        else addLog('⚠️ Pas assez d\'or.'); endTurn();
                    }},
                    { text: '❌ Annuler', action: () => {} }
                ]
            );
            break;
        case 'trade':
            const tradeGold = 30 + turn * 3 + techTree.commerce * 10;
            const tradeStone = 10 + turn + techTree.commerce * 5;
            gold += tradeGold;
            stone += tradeStone;
            food += 5;
            pop += 2;
            addLog(`💰 Commerce: +${tradeGold} or, +${tradeStone} pierre.`);
            endTurn();
            break;
        case 'expand':
            const unowned = provinces.filter(p => p.owner !== 'carthage');
            if (unowned.length > 0) {
                const target = unowned[Math.floor(Math.random() * unowned.length)];
                selectProvince(target);
            } else addLog('🎉 Toutes les provinces sont nôtres !');
            break;
    }
}

function endTurn() {
    turn++;
    season = SEASONS[Math.floor((turn - 1) / 3) % 4];

    let totalGoldIncome = 0;
    let totalPopGrowth = 0;
    for (const p of provinces) {
        if (p.owner === 'carthage') {
            const income = p.gold + p.level * 3 + (p.tradePost ? 5 : 0);
            totalGoldIncome += income;
            totalPopGrowth += 1;
        }
    }
    gold += totalGoldIncome;
    pop += totalPopGrowth;
    stone += provinces.filter(p => p.owner === 'carthage').length * 2;
    food = Math.max(0, food - Math.floor(pop * 0.3));
    morale = Math.min(100, morale + (food > 0 ? 2 : -5));

    if (food <= 0) { pop = Math.max(10, pop - 5); morale -= 10; addLog('饥️ Famine ! Population meurt.'); }

    if (turn % 3 === 0) {
        for (const faction of Object.keys(Factions)) {
            if (faction === 'CARTHAGE') continue;
            if (relations[faction] !== undefined) {
                relations[faction] += (Math.random() > 0.5 ? 1 : -1) * 3;
                relations[faction] = Math.max(-100, Math.min(100, relations[faction]));
            }
        }
    }

    const enemyProvinces = provinces.filter(p => p.owner === 'enemy');
    if (enemyProvinces.length > 0 && Math.random() < 0.3) {
        const target = enemyProvinces[Math.floor(Math.random() * enemyProvinces.length)];
        if (warWith.includes(target.faction)) {
            target.strength += Math.floor(Math.random() * 8) + 2;
            addLog(`⚔️ ${target.faction || 'Ennemi'} renforce ${target.name}.`);
        }
    }

    if (turn % 4 === 0) {
        const events = [
            { title: 'Tempête en Mer', text: 'Une tempête détruit une partie de notre flotte.',
              action: () => { navy = Math.max(0, navy - 5); gold -= 30; addLog('🌊 Flotte endommagée.'); }},
            { title: 'Festival de Tanit', text: 'Le peuple célèbre la déesse. Moral en hausse.',
              action: () => { morale += 15; pop += 10; addLog('🎉 Festival célébré.'); }},
            { title: 'Épidémie', text: 'Une maladie se propage dans la ville.',
              action: () => { pop -= 8; morale -= 10; addLog('🤒 Épidémie...'); }},
            { title: 'Découverte Minière', text: 'Des gisements d\'argent sont découverts.',
              action: () => { gold += 80; addLog('⛏️ Argent trouvé !'); }},
            { title: 'Embargo Romain', text: 'Rome bloque nos routes commerciales.',
              action: () => { gold -= 40; addLog('🚫 Embargo romain.'); }},
            { title: 'Alliance Numide', text: 'Les Numides offrent leur soutien militaire.',
              action: () => { army += 15; if (relations.NUMIDIA !== undefined) relations.NUMIDIA += 10; addLog('🤝 Alliance numide.'); }},
            { title: 'Révolte des Mercenaires', text: 'Les mercenaires exigent plus d\'or.',
              action: () => {
                if (gold >= 50) { gold -= 50; addLog('💰 Mercenaires payés.'); }
                else { army -= 10; morale -= 15; addLog('💀 Mercenaires en révolte !'); }
            }},
            { title: 'Récolte', text: 'Les champs sont abondants cette saison.',
              action: () => { food += 30; gold += 20; addLog('🌾 Récolte abondante.'); }},
            { title: 'Jeux du Cirque', text: 'Le peuple se divertit. Moral en hausse.',
              action: () => { morale += 10; pop += 5; addLog('🎪 Jeux célébrés.'); }},
            { title: 'Sénat Romain', text: 'Rome envoie un ultimatum.',
              action: () => {
                showEvent('ULTIMATUM DE ROME', 'Rome exige la reddition de la Sardaigne. Refuser ?',
                    [{ text: 'Refuser (guerre totale)', action: () => { warWith.push('ROME'); relations.ROME -= 50; addLog('⚔️ Guerre totale contre Rome !'); }},
                     { text: 'Céder la Sardaigne', action: () => {
                        const sar = provinces.find(p => p.name === 'Sardaigne');
                        if (sar) { sar.owner = 'enemy'; sar.faction = 'ROME'; sar.color = Factions.ROME.color; }
                        gold += 40; addLog('😔 Sardaigne cédée.'); }}]);
            }},
            { title: 'Exploration', text: 'Des explorateurs découvent de nouvelles terres.',
              action: () => { gold += 30; stone += 20; addLog('🗺️ Nouvelles terres découvertes !'); }},
            { title: 'Cérémonie Religieuse', text: 'Les prêtres d\'Eshmoun organisent un rituel.',
              action: () => { morale += 8; food += 10; addLog('⛩️ Cérémonie célébrée.'); }}
        ];
        const evt = events[Math.floor(Math.random() * events.length)];
        showEvent(evt.title, evt.text, [{ text: 'Continuer', action: () => { evt.action(); endTurn(); }}]);
        return;
    }

    const carthageCount = provinces.filter(p => p.owner === 'carthage').length;
    if (carthageCount >= 10) {
        endGame('🏆 VICTOIRE IMPÉRIALE', 'Carthage domine la Méditerranée !', gold);
        return;
    }
    if (carthageCount <= 1 && turn > 5) {
        endGame('💀 CHUTE DE CARTHAGE', 'L\'empire est tombé...', gold);
        return;
    }

    updateHUD();
    document.getElementById('turn-num').textContent = turn;
}

function showEvent(title, text, choices) {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'flex';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').textContent = text;
    const choicesDiv = document.getElementById('modal-choices');
    choicesDiv.innerHTML = '';
    for (const c of choices) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = c.text;
        btn.onclick = () => { modal.style.display = 'none'; c.action(); };
        choicesDiv.appendChild(btn);
    }
}

function addLog(msg) {
    eventLog.push({ text: msg, time: 360 });
    if (eventLog.length > 8) eventLog.shift();
    const logDiv = document.getElementById('event-log');
    logDiv.innerHTML = '';
    for (const m of eventLog) {
        const div = document.createElement('div');
        div.className = 'log-msg';
        div.textContent = m.text;
        logDiv.appendChild(div);
    }
}

function updateHUD() {
    document.getElementById('gold').textContent = gold;
    document.getElementById('stone').textContent = stone;
    document.getElementById('pop').textContent = pop;
    document.getElementById('army').textContent = army;
    document.getElementById('info-text').textContent =
        `Tour ${turn} | ${season.charAt(0).toUpperCase() + season.slice(1)} | Moral: ${morale}% | Nourriture: ${food}`;
    renderMinimap();
}

function renderMinimap() {
    const mc = document.getElementById('minimap-canvas');
    const mctx = mc.getContext('2d');
    mctx.fillStyle = '#0a0612';
    mctx.fillRect(0, 0, 160, 160);

    for (const p of provinces) {
        const sx = (p.x / gameCanvas.width) * 160;
        const sy = (p.y / gameCanvas.height) * 160;
        mctx.fillStyle = p.owner === 'carthage' ? '#d4a017' : p.owner === 'enemy' ? (p.color || '#cc2222') : '#666';
        mctx.globalAlpha = p.owner === 'carthage' ? 0.9 : 0.5;
        mctx.beginPath();
        mctx.arc(sx, sy, 4, 0, Math.PI * 2);
        mctx.fill();
    }
    mctx.globalAlpha = 1;
    mctx.strokeStyle = '#b8860b';
    mctx.lineWidth = 1;
    mctx.strokeRect(0, 0, 160, 160);
}

function endGame(title, text, score) {
    gameRunning = false;
    gameOverScreen.style.display = 'flex';
    document.getElementById('go-title').textContent = title;
    document.getElementById('go-text').textContent = text;
    document.getElementById('go-stats').textContent =
        `Tour: ${turn} | Or: ${score} | Provinces: ${provinces.filter(p => p.owner === 'carthage').length}/${provinces.length}`;
}

function togglePause() { addLog('⏸️ Pause'); }

function gameLoop() {
    if (!gameRunning) return;
    time++;
    const ctx = gameCanvas.getContext('2d');
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    renderMediterraneanMap(ctx);
    renderTradeRoutes(ctx);
    renderProvinces(ctx);
    renderHover(ctx);
    renderSeasonIndicator(ctx);
    requestAnimationFrame(gameLoop);
}

function renderMediterraneanMap(ctx) {
    const W = gameCanvas.width;
    const H = gameCanvas.height;
    const sc = SEASON_COLORS[season];
    const g = (lon, lat) => geoToScreen(lon, lat);

    const skyG = ctx.createLinearGradient(0, 0, 0, H);
    skyG.addColorStop(0, sc.sky);
    skyG.addColorStop(0.5, '#0a0612');
    skyG.addColorStop(1, '#0a0612');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(20,50,90,0.3)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#1a3a6a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        for (let x = 0; x < W; x += 5) {
            const wy = H * 0.15 + i * (H * 0.05) + Math.sin(x * 0.008 + time * 0.01 + i * 0.5) * 4;
            x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }
    ctx.restore();

    function drawCoast(points, fillColor, alpha) {
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        const p0 = g(points[0][0], points[0][1]);
        ctx.moveTo(p0.x * W, p0.y * H);
        for (let i = 1; i < points.length; i++) {
            const p = g(points[i][0], points[i][1]);
            ctx.lineTo(p.x * W, p.y * H);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    const europeCoast = [
        [-10, 44], [-8, 43.5], [-6, 43], [-4, 43.3], [-2, 43.5],
        [0, 43.2], [3, 43.4], [5, 43.3], [6, 43.5], [7, 44],
        [8, 44.3], [9, 45], [10, 45.5], [12, 45.5], [13, 45.7],
        [14, 45.2], [15, 45], [16, 44.8], [17, 44.8], [18, 45.3],
        [19, 45.5], [20, 45.5], [21, 45.2], [22, 44.5], [23, 44.3],
        [24, 42.3], [25, 41], [26, 41.2], [27, 41], [28, 41.2],
        [29, 41.5], [30, 42], [32, 42.5], [34, 42], [36, 42.5],
        [37, 37], [36, 36.5], [36, 37], [35, 37], [34, 37.5],
        [33, 37], [32, 36.8], [30, 36.5], [28, 36.5], [27, 37],
        [26, 38], [25, 38.5], [24, 38], [23, 38], [22, 37.5],
        [21, 37], [20, 36.8], [19, 37], [18, 37], [17, 37],
        [16, 38], [15.5, 38.5], [16, 39.5], [16.5, 39.8], [17, 40.5],
        [17.5, 40.8], [18, 41.5], [17.5, 42.5], [16, 43.5],
        [15, 43.8], [14.5, 44], [13, 44.5], [12, 44.5], [11, 44],
        [10, 44.5], [9, 44.2], [8, 44], [7, 43.7], [6.5, 43.3],
        [5, 43], [4, 43], [3, 43.2], [1, 43], [0, 42.5],
        [-1, 43], [-2, 43], [-3.5, 43], [-5, 42.8], [-6, 43.2],
        [-7, 43.5], [-8.5, 44], [-9, 44], [-10, 44]
    ];

    const africaCoast = [
        [-10, 35.5], [-8, 35], [-6, 35.5], [-5, 36], [-5.5, 36],
        [-2, 35.5], [-1, 35.8], [0, 35.8], [1, 36.5], [3, 37],
        [4, 37], [5, 36.5], [6, 36.7], [7, 37], [8, 37], [9, 37.3],
        [10, 37.3], [10.5, 37], [10.5, 36.5], [11, 35.8], [11, 35],
        [10.5, 34.7], [11, 34], [11.2, 33.5], [11.8, 33], [12, 33],
        [13, 33], [14, 32.8], [15, 33], [16, 33.5], [17, 33],
        [18, 32.5], [19, 32], [20, 31.8], [21, 32], [22, 32.5],
        [23, 32], [24, 31.5], [25, 31.5], [26, 31], [27, 31.2],
        [28, 31], [29, 31], [30, 31], [31, 31.5], [32, 31.5],
        [33, 30], [33, 30], [-10, 30], [-10, 35.5]
    ];

    const sicily = [
        [12.5, 38.3], [13, 38.2], [13.5, 38.1], [14, 37.8],
        [15, 37.2], [15.5, 37.1], [15.7, 37.5], [15, 38],
        [14.5, 38.1], [14, 38.3], [13.5, 38.4], [13, 38.4], [12.5, 38.3]
    ];

    const sardinia = [
        [8.5, 41.2], [9, 41.3], [9.8, 41], [10.2, 40.5],
        [10, 39.8], [9.5, 39.2], [9, 39], [8.5, 39.2],
        [8.3, 39.5], [8.3, 40], [8.5, 40.5], [8.5, 41.2]
    ];

    const corsica = [
        [8.8, 43], [9, 43.1], [9.3, 42.8], [9.5, 42.3],
        [9.3, 41.8], [9, 41.5], [8.8, 41.8], [8.7, 42.3],
        [8.5, 42.8], [8.8, 43]
    ];

    const crete = [
        [23.5, 35.7], [24, 35.5], [24.5, 35.5], [25, 35.5],
        [25.5, 35.5], [26, 35.3], [26.2, 35.2], [26, 35],
        [25, 35.1], [24, 35.3], [23.5, 35.7]
    ];

    const balearics = [
        [1.4, 39], [1.8, 39], [2.2, 39.3], [2.8, 39.4],
        [3.2, 39.5], [3.3, 39.4], [3, 39.2], [2.5, 38.9],
        [2, 38.8], [1.6, 38.8], [1.4, 39]
    ];

    drawCoast(europeCoast, sc.land, 0.35);
    drawCoast(africaCoast, '#3a2a1a', 0.35);
    drawCoast(sicily, sc.land, 0.3);
    drawCoast(sardinia, sc.land, 0.3);
    drawCoast(corsica, sc.land, 0.3);
    drawCoast(crete, sc.land, 0.25);
    drawCoast(balearics, sc.land, 0.25);

    ctx.strokeStyle = sc.land;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;

    function strokeCoast(points) {
        ctx.beginPath();
        const p0 = g(points[0][0], points[0][1]);
        ctx.moveTo(p0.x * W, p0.y * H);
        for (let i = 1; i < points.length; i++) {
            const p = g(points[i][0], points[i][1]);
            ctx.lineTo(p.x * W, p.y * H);
        }
        ctx.stroke();
    }

    strokeCoast(europeCoast);
    strokeCoast(africaCoast);
    strokeCoast(sicily);
    strokeCoast(sardinia);
    strokeCoast(corsica);
    strokeCoast(crete);
    strokeCoast(balearics);
    ctx.globalAlpha = 1;
}

function renderTradeRoutes(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const [a, b] of tradeRoutes) {
        const pa = provinces[a];
        const pb = provinces[b];
        if (!pa || !pb) continue;
        if (pa.owner !== 'carthage' && pb.owner !== 'carthage') continue;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
}

function renderProvinces(ctx) {
    for (const p of provinces) {
        const pulse = Math.sin(time * 0.02 + p.pulse) * 2;
        const isSelected = selectedProvince === p;

        ctx.save();

        if (p.owner === 'carthage') {
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w * 0.7);
            glow.addColorStop(0, 'rgba(212,160,23,0.12)');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(p.x - p.w, p.y - p.h, p.w * 2, p.h * 2);
        }

        const fillColor = p.owner === 'carthage' ? '#d4a017' :
                          p.owner === 'enemy' ? (p.color || '#cc2222') : '#555';
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.12 + (p.owner === 'carthage' ? 0.08 : 0) + (isSelected ? 0.1 : 0);
        ctx.beginPath();
        ctx.ellipse(p.x + pulse, p.y + pulse, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.6 + (isSelected ? 0.3 : 0);
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w / 2 + pulse, p.h / 2 + pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${isSelected ? 13 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 6);

        ctx.fillStyle = '#aaa';
        ctx.font = '9px sans-serif';
        ctx.fillText(`⚔${p.strength} 🪙${p.gold}`, p.x, p.y + 8);

        if (p.owner === 'carthage') {
            ctx.fillStyle = '#ffd700';
            ctx.font = '8px sans-serif';
            ctx.fillText(`Nv.${p.level}`, p.x, p.y + 18);
        }

        const icon = p.type === 'city' ? '🏛' : p.type === 'port' ? '⚓' : p.type === 'temple' ? '☥' : p.type === 'fort' ? '🏰' : '';
        if (icon) {
            ctx.font = '14px serif';
            ctx.fillText(icon, p.x, p.y - p.h / 2 - 4);
        }

        if (p.isCapital) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '8px sans-serif';
            ctx.fillText('★ CAPITALE', p.x, p.y + p.h / 2 + 12);
        }

        if (p.owner === 'enemy' && p.faction && warWith.includes(p.faction)) {
            ctx.fillStyle = '#ff3333';
            ctx.globalAlpha = 0.5 + Math.sin(time * 0.05) * 0.3;
            ctx.font = '10px sans-serif';
            ctx.fillText('⚔', p.x + p.w / 2, p.y - p.h / 2);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    CarthageAlphabet.renderDecorativeLine(ctx, 20, gameCanvas.height - 30, gameCanvas.width - 40, '#b8860b');
}

function renderHover(ctx) {
    hoverProvince = null;
    for (const p of provinces) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        if (Math.abs(dx) < p.w / 2 && Math.abs(dy) < p.h / 2) {
            hoverProvince = p;
            break;
        }
    }

    if (hoverProvince) {
        const p = hoverProvince;
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w / 2 + 4, p.h / 2 + 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tipW = 200;
        const tipH = 60;
        let tipX = mouseX + 15;
        let tipY = mouseY - 60;
        if (tipX + tipW > gameCanvas.width) tipX = mouseX - tipW - 15;
        if (tipY < 0) tipY = mouseY + 15;

        ctx.fillStyle = 'rgba(10,6,18,0.92)';
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipW, tipH, 6);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipW, tipH, 6);
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, tipX + 10, tipY + 18);

        const ownerText = p.owner === 'carthage' ? 'Notre empire' :
                         p.owner === 'enemy' ? (p.faction || 'Ennemi') : 'Indépendant';
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${ownerText} | ⚔${p.strength} | 🪙${p.gold}`, tipX + 10, tipY + 34);
        ctx.fillText(`Type: ${p.type} | Pop: ${p.pop} | Nv.${p.level}`, tipX + 10, tipY + 48);
        ctx.restore();
    }
}

function renderSeasonIndicator(ctx) {
    const W = gameCanvas.width;
    const seasonIcons = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
    const seasonNames = { spring: 'Printemps', summer: 'Été', autumn: 'Automne', winter: 'Hiver' };

    ctx.save();
    ctx.fillStyle = 'rgba(10,6,18,0.7)';
    ctx.fillRect(W - 140, 8, 130, 28);
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 140, 8, 130, 28);

    ctx.fillStyle = '#ffd700';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${seasonIcons[season]} ${seasonNames[season]} — Tour ${turn}`, W - 16, 26);
    ctx.textAlign = 'left';
    ctx.restore();
}

initIntro();
