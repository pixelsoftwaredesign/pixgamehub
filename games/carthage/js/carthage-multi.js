// ═════════════════════════════════════════════════════════════════════════════
//  Carthage: Bellum Punicum — Multiplayer Client
//  Pixel Software Design 2026
// ═════════════════════════════════════════════════════════════════════════════

(function () {
'use strict';

var WS = null;
var GAME = null;    // full game state
var YOU = null;     // your ws_id
var ALLIES = [];    // allied player ids

var TERRAIN_TYPES = {
    city: { icon: '🏛', bonus: 1.0 },
    port: { icon: '⚓', bonus: 0.8 },
    fort: { icon: '🏰', bonus: 1.3 },
    temple: { icon: '☥', bonus: 0.6 },
};

var SELECTED_TERRITORY = null;
var ACTION_MODE = null;   // null | 'move' | 'attack'
var MOVE_SOURCE = null;

var lobbyContainer = null;
var gameContainer = null;
var mapCanvas = null;
var ctx = null;
var animFrame = null;
var time = 0;

var RECONNECT_DELAY = 1000;
var RECONNECT_MAX = 15000;
var reconnectAttempts = 0;

// ─── WS Connection ──────────────────────────────────────────────────────────

function connect() {
    if (WS && (WS.readyState === WebSocket.OPEN || WS.readyState === WebSocket.CONNECTING)) return;

    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = location.hostname;
    var port = (location.port || (proto === 'https:' ? '443' : '80'));
    if (host === 'localhost' || host === '127.0.0.1') {
        port = location.port === '8080' ? '8081' : location.port;
    }
    var url = proto + '//' + host + ':' + port;

    WS = new WebSocket(url);

    WS.onopen = function () {
        console.log('[CarthageMulti] WS connected');
        reconnectAttempts = 0;
        RECONNECT_DELAY = 1000;
        WS.send(JSON.stringify({
            action: 'join_game',
            gameId: 'carthage',
            username: localStorage.getItem('pix_username') || 'Anonyme',
        }));
    };

    WS.onmessage = function (e) {
        var msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }

        switch (msg.action) {
            case 'carthage_state':
                updateState(msg.state);
                break;
            case 'carthage_battle':
                showBattleResult(msg.battle);
                break;
            case 'carthage_player_joined':
                addLog('system', msg.username + ' a rejoint la partie');
                break;
            case 'carthage_player_left':
                addLog('system', msg.username + ' a quitte la partie');
                break;
            case 'carthage_game_over':
                showGameOver(msg.winnerName);
                break;
            case 'carthage_error':
                addLog('system', 'Erreur: ' + msg.error);
                break;
        }
    };

    WS.onclose = function () {
        console.log('[CarthageMulti] WS disconnected');
        WS = null;
        var delay = Math.min(RECONNECT_DELAY, RECONNECT_MAX);
        RECONNECT_DELAY *= 1.5;
        reconnectAttempts++;
        if (gameContainer || lobbyContainer) {
            addLog('system', 'Connexion perdue. Reconnexion dans ' + (delay / 1000) + 's...');
            setTimeout(connect, delay);
        }
    };

    WS.onerror = function () {
        if (WS) WS.close();
    };
}

function wsSend(data) {
    if (WS && WS.readyState === WebSocket.OPEN) {
        WS.send(JSON.stringify(data));
    }
}

// ─── State Update ───────────────────────────────────────────────────────────

function updateState(state) {
    GAME = state;
    YOU = state.you;
    ALLIES = state.allied_with || [];

    updateLobby();
    updateMap();
    updateInfoPanel();
    updateDiplomacyPanel();
    updateLog();

    if (state.winner) {
        showGameOver(state.players[state.winner] ? state.players[state.winner].username : 'Inconnu');
    }
}

// ─── Lobby UI ────────────────────────────────────────────────────────────────

function showLobby() {
    if (!lobbyContainer) createLobby();
    lobbyContainer.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
}

function createLobby() {
    lobbyContainer = document.createElement('div');
    lobbyContainer.id = 'carthage-lobby';
    lobbyContainer.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'background:rgba(10,6,18,0.95);font-family:"Courier New",monospace;';

    lobbyContainer.innerHTML =
        '<div style="text-align:center;max-width:500px;width:90%">' +
            '<h1 style="color:#d4a017;font-size:28px;margin-bottom:4px">⚔️ CARTHAGE: BELLUM PUNICUM</h1>' +
            '<p style="color:#c9a84c;font-size:13px;margin-bottom:20px;opacity:0.7">MULTIJOUEUR</p>' +
            '<div id="lobby-players" style="margin-bottom:20px">' +
                '<div style="color:#888;font-size:12px;margin-bottom:8px">JOUEURS DANS LA SALLE</div>' +
                '<div id="lobby-list" style="display:flex;flex-direction:column;gap:6px"></div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;justify-content:center">' +
                '<button id="btn-ready" style="padding:10px 28px;font-size:14px;border:2px solid #d4a017;' +
                    'background:rgba(212,160,23,0.15);color:#d4a017;border-radius:6px;cursor:pointer">' +
                    'PRET (◉)</button>' +
                '<button id="btn-leave" style="padding:10px 20px;font-size:14px;border:2px solid #e74c3c;' +
                    'background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:6px;cursor:pointer">' +
                    'QUITTER</button>' +
            '</div>' +
            '<div id="lobby-log" style="margin-top:16px;max-height:120px;overflow-y:auto;' +
                'border:1px solid rgba(212,160,23,0.2);border-radius:4px;padding:8px;text-align:left;' +
                'font-size:11px;color:#aaa"></div>' +
        '</div>';

    document.body.appendChild(lobbyContainer);

    document.getElementById('btn-ready').onclick = function () {
        var btn = this;
        if (btn.textContent.indexOf('PRET') === 0) {
            wsSend({ action: 'carthage_action', cmd: 'ready' });
            btn.textContent = '⏳ ATTENTE...';
            btn.style.opacity = '0.5';
        }
    };

    document.getElementById('btn-leave').onclick = function () {
        if (confirm('Quitter la partie multijoueur ?')) {
            WS.close();
            lobbyContainer.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'none';
            document.getElementById('multi-backdrop') &&
                (document.getElementById('multi-backdrop').style.display = 'none');
        }
    };
}

function updateLobby() {
    if (!GAME || !lobbyContainer || lobbyContainer.style.display !== 'flex') return;

    var list = document.getElementById('lobby-list');
    list.innerHTML = '';
    for (var pid in GAME.players) {
        var p = GAME.players[pid];
        var isYou = pid === YOU;
        var div = document.createElement('div');
        div.style.cssText =
            'display:flex;justify-content:space-between;align-items:center;' +
            'padding:8px 12px;border-radius:4px;' +
            'background:' + (isYou ? 'rgba(212,160,23,0.12)' : 'rgba(255,255,255,0.04)') + ';';

        var nameSpan = document.createElement('span');
        nameSpan.textContent = (isYou ? '⭐ ' : '') + p.username;
        nameSpan.style.cssText = 'color:' + (isYou ? '#ffd700' : '#eee') + ';font-size:13px';

        var statusSpan = document.createElement('span');
        statusSpan.textContent = 'Territoires: ' + p.territoryCount + ' | ⚔' + p.totalArmy;
        statusSpan.style.cssText = 'color:#aaa;font-size:11px';

        div.appendChild(nameSpan);
        div.appendChild(statusSpan);
        list.appendChild(div);
    }

    var btn = document.getElementById('btn-ready');
    if (GAME.players[YOU] && GAME.players[YOU].ready) {
        btn.textContent = '⏳ ATTENTE...';
        btn.style.opacity = '0.5';
    } else {
        btn.textContent = 'PRET (◉)';
        btn.style.opacity = '1';
    }

    var playerCount = Object.keys(GAME.players).length;
    if (playerCount >= 2 && GAME.turn === 1) {
        var label = document.querySelector('#lobby-players div:first-child');
        if (label) label.textContent = 'JOUEURS — Pret a lancer !';
        btn.textContent = 'LANCER LA PARTIE';
        btn.style.borderColor = '#2ecc71';
        btn.style.color = '#2ecc71';
    }

    if (GAME.phase === 'planning' && (GAME.turn > 1 || (playerCount >= 2 && GAME.turn === 1 && GAME.players[YOU] && GAME.players[YOU].ready))) {
        showGame();
    }
}

// ─── Game UI ─────────────────────────────────────────────────────────────────

function showGame() {
    if (lobbyContainer) lobbyContainer.style.display = 'none';
    if (!gameContainer) {
        createGameUI();
        gameContainer.style.display = 'flex';
        // Canvas dimensions must be set after display is visible
        setTimeout(resizeCanvas, 50);
    } else {
        gameContainer.style.display = 'flex';
        resizeCanvas();
    }
}

function createGameUI() {
    gameContainer = document.createElement('div');
    gameContainer.id = 'carthage-game';
    gameContainer.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;' +
        'display:none;flex-direction:column;background:rgba(10,6,18,0.98);' +
        'font-family:"Courier New",monospace;';

    gameContainer.innerHTML =
        '<div id="cg-header" style="display:flex;justify-content:space-between;align-items:center;' +
            'padding:6px 12px;background:rgba(0,0,0,0.4);border-bottom:1px solid rgba(212,160,23,0.2);' +
            'font-size:12px;color:#d4a017;flex-shrink:0">' +
            '<span id="cg-turn">Tour 1</span>' +
            '<span id="cg-phase">Planification</span>' +
            '<span id="cg-players-online">0 joueurs</span>' +
            '<button id="cg-leave" style="background:rgba(231,76,60,0.15);border:1px solid #e74c3c;' +
                'color:#e74c3c;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">QUITTER</button>' +
        '</div>' +
        '<div id="cg-body" style="display:flex;flex:1;overflow:hidden">' +
            '<div id="cg-map" style="flex:1;position:relative"></div>' +
            '<div id="cg-sidebar" style="width:300px;display:flex;flex-direction:column;border-left:1px solid rgba(212,160,23,0.15);flex-shrink:0">' +
                '<div id="cg-info" style="padding:8px;border-bottom:1px solid rgba(212,160,23,0.1)"></div>' +
                '<div id="cg-actions" style="padding:8px;border-bottom:1px solid rgba(212,160,23,0.1);display:flex;flex-wrap:wrap;gap:6px"></div>' +
                '<div id="cg-diplomacy" style="padding:8px;border-bottom:1px solid rgba(212,160,23,0.1);flex:0 0 auto;max-height:180px;overflow-y:auto"></div>' +
                '<div id="cg-log" style="padding:8px;flex:1;overflow-y:auto;font-size:11px;color:#aaa"></div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(gameContainer);

    document.getElementById('cg-leave').onclick = function () {
        if (confirm('Quitter la partie ?')) {
            WS.close();
            gameContainer.style.display = 'none';
            if (lobbyContainer) lobbyContainer.style.display = 'none';
        }
    };

    createMapCanvas();
}

function createMapCanvas() {
    var mapDiv = document.getElementById('cg-map');
    if (!mapDiv) return;

    mapCanvas = document.createElement('canvas');
    mapCanvas.style.cssText = 'width:100%;height:100%;display:block';
    mapDiv.appendChild(mapCanvas);

    resizeCanvas();
    ctx = mapCanvas.getContext('2d');

    mapCanvas.addEventListener('mousemove', function (e) {
        var r = mapCanvas.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width;
        var my = (e.clientY - r.top) / r.height;
        if (GAME) updateHover(mx * mapCanvas.width, my * mapCanvas.height);
    });

    mapCanvas.addEventListener('click', function (e) {
        var r = mapCanvas.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width;
        var my = (e.clientY - r.top) / r.height;
        if (GAME) handleMapClick(mx * mapCanvas.width, my * mapCanvas.height);
    });

    window.addEventListener('resize', function () {
        if (gameContainer && gameContainer.style.display !== 'none') {
            resizeCanvas();
        }
    });

    startRender();
}

function resizeCanvas() {
    var mapDiv = document.getElementById('cg-map');
    if (!mapDiv || !mapCanvas) return;
    mapCanvas.width = mapDiv.clientWidth;
    mapCanvas.height = mapDiv.clientHeight;
}

// ─── Map Rendering ──────────────────────────────────────────────────────────

var BUILDINGS_META = {
    temple:  { icon:'☥', name:'Temple' },
    walls:   { icon:'🏰', name:'Remparts' },
    wheat:   { icon:'🌾', name:'Ble' },
    olive:   { icon:'🫒', name:'Oliviers' },
    resin:   { icon:'🌲', name:'Resine' },
    vineyard:{ icon:'🍇', name:'Vignobles' },
    market:  { icon:'🏪', name:'Marche' },
    dock:    { icon:'⚓', name:'Quai' },
    granary: { icon:'🏪', name:'Grenier' },
    shipyard:{ icon:'⛵', name:'Chantier naval' },
    quarry:  { icon:'⛏', name:'Carriere' },
    forge:   { icon:'⚒', name:'Forge' },
    fortress:{ icon:'🏯', name:'Forteresse' },
};

var hoverTid = null;
var hoverPos = { x: 0, y: 0 };

function geoToScreen(lon, lat, w, h) {
    var x = (lon + 10) / 46;
    var y = (46 - lat) / 16;
    return { x: Math.max(0.02, Math.min(0.98, x)) * w, y: Math.max(0.02, Math.min(0.98, y)) * h };
}

var PROVINCE_DATA = [
    { name: 'Carthage', lon: 10.2, lat: 36.8 },
    { name: 'Utique', lon: 10.1, lat: 37.1 },
    { name: 'Hippo Regius', lon: 7.7, lat: 36.9 },
    { name: 'Leptis Minor', lon: 10.8, lat: 34.2 },
    { name: 'Hadrumete', lon: 10.6, lat: 34.7 },
    { name: 'Syrte', lon: 17.9, lat: 31.2 },
    { name: 'Gades', lon: -6.3, lat: 36.5 },
    { name: 'Ibiza', lon: 1.4, lat: 39.0 },
    { name: 'Sardaigne', lon: 9.1, lat: 39.2 },
    { name: 'Sicile', lon: 14.3, lat: 37.6 },
    { name: 'Corse', lon: 9.0, lat: 42.1 },
    { name: 'Malte', lon: 14.4, lat: 35.9 },
    { name: 'Tripolitaine', lon: 13.2, lat: 32.9 },
    { name: 'Numidie', lon: 3.0, lat: 36.8 },
    { name: 'Cyrene', lon: 21.9, lat: 32.8 },
    { name: 'Alexandrie', lon: 29.9, lat: 31.2 },
];

var ADJ = {
    0: [1,3,4,14,9], 1: [0,2], 2: [1,13], 3: [0,4], 4: [0,3,5],
    5: [4,14], 6: [7], 7: [6], 8: [10], 9: [0,11],
    10: [8], 11: [9], 12: [0], 13: [2], 14: [0,5,15], 15: [14],
};

// ─── Territory Polygons (Voronoi-like) ──────────────────────────────────────

var TERRITORY_REGIONS = {};

function computeTerritoryRegions(W, H) {
    TERRITORY_REGIONS = {};
    var BOUNDARY_MARGIN = 60;

    for (var i = 0; i < PROVINCE_DATA.length; i++) {
        var pd = PROVINCE_DATA[i];
        var pos = geoToScreen(pd.lon, pd.lat, W, H);
        var adj = ADJ[i] || [];
        var midpoints = [];

        for (var j = 0; j < adj.length; j++) {
            var npd = PROVINCE_DATA[adj[j]];
            if (!npd) continue;
            var npos = geoToScreen(npd.lon, npd.lat, W, H);
            var dx = npos.x - pos.x;
            var dy = npos.y - pos.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            // Perpendicular bisector offset: move perpendicular to edge
            var px = -dy / dist * 12;
            var py = dx / dist * 12;
            midpoints.push({
                x: (pos.x + npos.x) / 2 + px,
                y: (pos.y + npos.y) / 2 + py,
            });
        }

        // Add boundary extension points for edge territories
        // Check if this territory is on the edge of the known map
        var isEdge = adj.length <= 2 || (function () {
            var neighbors = adj;
            for (var k = 0; k < PROVINCE_DATA.length; k++) {
                if (k === i) continue;
                if (ADJ[k] && ADJ[k].indexOf(i) >= 0) continue;
            }
            return true;
        })();

        // Add points toward the map edges for territories with few neighbors
        if (midpoints.length < 3) {
            var edgeDirs = [];
            // Push toward nearest map edge directions
            if (pos.x < W * 0.25) edgeDirs.push({ x: -30, y: 0 });
            if (pos.x > W * 0.75) edgeDirs.push({ x: 30, y: 0 });
            if (pos.y < H * 0.25) edgeDirs.push({ x: 0, y: -30 });
            if (pos.y > H * 0.75) edgeDirs.push({ x: 0, y: 30 });
            for (var k = 0; k < edgeDirs.length; k++) {
                midpoints.push({
                    x: pos.x + edgeDirs[k].x,
                    y: pos.y + edgeDirs[k].y,
                });
            }
        }

        // Sort by angle around territory center
        midpoints.sort(function (a, b) {
            return Math.atan2(a.y - pos.y, a.x - pos.x) - Math.atan2(b.y - pos.y, b.x - pos.x);
        });

        if (midpoints.length >= 3) {
            TERRITORY_REGIONS[i] = midpoints;
        }
    }
}

function startRender() {
    if (animFrame) cancelAnimationFrame(animFrame);
    function loop() {
        try {
            time++;
            if (gameContainer && gameContainer.style.display !== 'none' && ctx && GAME) {
                renderMap(ctx);
            }
        } catch (e) {
            console.warn('[Render]', e);
        }
        animFrame = requestAnimationFrame(loop);
    }
    loop();
}

function renderMap(c) {
    var W = mapCanvas.width;
    var H = mapCanvas.height;
    // Ensure canvas has proper dimensions
    if (W < 10 || H < 10) {
        resizeCanvas();
        W = mapCanvas.width;
        H = mapCanvas.height;
        if (W < 10 || H < 10) return;
    }

    c.fillStyle = '#0a0612';
    c.fillRect(0, 0, W, H);

    var oceanGrad = c.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0, '#0a0825');
    oceanGrad.addColorStop(0.5, '#0a0a20');
    oceanGrad.addColorStop(1, '#0a0612');
    c.fillStyle = oceanGrad;
    c.fillRect(0, 0, W, H);

    c.save();
    c.globalAlpha = 0.06;
    c.strokeStyle = '#1a3a6a';
    c.lineWidth = 0.5;
    for (var i = 0; i < 10; i++) {
        c.beginPath();
        for (var x = 0; x < W; x += 5) {
            var wy = H * 0.3 + i * (H * 0.06) + Math.sin(x * 0.008 + time * 0.005 + i * 0.5) * 3;
            x === 0 ? c.moveTo(x, wy) : c.lineTo(x, wy);
        }
        c.stroke();
    }
    c.restore();

    renderTradeRoutes(c, W, H);
    renderTerritories(c, W, H);
    renderHover(c, W, H);
}

function renderTradeRoutes(c, W, H) {
    if (!GAME) return;
    var territories = GAME.territories || [];
    c.save();
    c.globalAlpha = 0.12;
    c.strokeStyle = '#d4a017';
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    for (var tid in ADJ) {
        var t = territories[tid];
        if (!t || !t.owner) continue;
        var src = PROVINCE_DATA[tid];
        if (!src) continue;
        var srcPos = geoToScreen(src.lon, src.lat, W, H);
        var adj = ADJ[tid];
        for (var j = 0; j < adj.length; j++) {
            var dstT = territories[adj[j]];
            if (!dstT || !dstT.owner || dstT.owner === t.owner) continue;
            var dst = PROVINCE_DATA[adj[j]];
            if (!dst) continue;
            var dstPos = geoToScreen(dst.lon, dst.lat, W, H);
            c.beginPath();
            c.moveTo(srcPos.x, srcPos.y);
            c.lineTo(dstPos.x, dstPos.y);
            c.stroke();
        }
    }
    c.setLineDash([]);
    c.restore();
}

function getOwnerColor(owner) {
    if (owner === YOU) return '#d4a017';
    if (!owner) return '#555';

    var idx = 0;
    var keys = GAME ? Object.keys(GAME.players) : [];
    for (var i = 0; i < keys.length; i++) {
        if (keys[i] === owner) { idx = i; break; }
    }
    var colors = ['#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#e67e22', '#1abc9c'];
    return colors[idx % colors.length];
}

function getOwnerName(owner) {
    if (!owner || !GAME) return 'Independant';
    if (owner === YOU) return 'Vous';
    var p = GAME.players[owner];
    return p ? p.username : 'Inconnu';
}

function isAdjacentToEnemy(tid) {
    var adj = ADJ[tid];
    if (!adj || !GAME) return false;
    var t = GAME.territories[tid];
    if (!t) return false;
    for (var j = 0; j < adj.length; j++) {
        var neighbor = GAME.territories[adj[j]];
        if (neighbor && neighbor.owner && neighbor.owner !== t.owner) {
            return true;
        }
    }
    return false;
}

function renderTerritories(c, W, H) {
    if (!GAME) return;
    var territories = GAME.territories || [];

    for (var i = 0; i < territories.length; i++) {
        var t = territories[i];
        var pd = PROVINCE_DATA[t.id];
        if (!pd) continue;

        var pos = geoToScreen(pd.lon, pd.lat, W, H);
        var pw = 50, ph = 40;
        var pulse = Math.sin(time * 0.02 + t.id) * 2;
        var isSelected = SELECTED_TERRITORY === t.id;
        var isHover = hoverTid === t.id;
        var isEnemyBorder = isAdjacentToEnemy(t.id);
        var color = getOwnerColor(t.owner);

        c.save();

        if (t.owner === YOU) {
            var glow = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pw);
            glow.addColorStop(0, 'rgba(212,160,23,0.1)');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = glow;
            c.fillRect(pos.x - pw, pos.y - ph, pw * 2, ph * 2);
        }

        c.globalAlpha = 0.2 + (t.owner === YOU ? 0.1 : 0) + (isSelected ? 0.15 : 0) + (isHover ? 0.08 : 0);
        c.fillStyle = color;
        c.beginPath();
        c.ellipse(pos.x + pulse, pos.y + pulse, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        c.fill();

        c.globalAlpha = 0.7 + (isSelected ? 0.3 : 0) + (isHover ? 0.15 : 0);
        c.strokeStyle = color;
        c.lineWidth = isSelected ? 3 : (isEnemyBorder ? 2 : 1.5);
        c.beginPath();
        c.ellipse(pos.x, pos.y, pw / 2 + pulse, ph / 2 + pulse, 0, 0, Math.PI * 2);
        c.stroke();

        if (isEnemyBorder && t.owner === YOU) {
            c.globalAlpha = 0.3 + 0.2 * Math.sin(time * 0.05);
            c.strokeStyle = '#ff4444';
            c.lineWidth = 1;
            c.setLineDash([3, 3]);
            c.beginPath();
            c.ellipse(pos.x, pos.y, pw / 2 + 6 + pulse, ph / 2 + 6 + pulse, 0, 0, Math.PI * 2);
            c.stroke();
            c.setLineDash([]);
        }

        c.globalAlpha = 1;
        c.fillStyle = '#fff';
        c.font = 'bold ' + (isSelected ? 12 : 10) + 'px sans-serif';
        c.textAlign = 'center';
        c.fillText(t.name, pos.x, pos.y - 10);

        c.fillStyle = color;
        c.font = '10px sans-serif';
        c.fillText('⚔' + t.army + ' 🏛' + t.fortLevel, pos.x, pos.y + 7);

        // Building icons
        if (t.buildings && t.buildings.length) {
            var icons = t.buildings.map(function (bk) {
                var bm = BUILDINGS_META[bk];
                return bm ? bm.icon : '';
            }).filter(function (s) { return s; });
            if (icons.length) {
                c.globalAlpha = 0.9;
                c.font = '9px sans-serif';
                c.textAlign = 'center';
                var yOff = 22;
                for (var bi = 0; bi < Math.min(icons.length, 4); bi++) {
                    c.fillText(icons[bi], pos.x - 8 + bi * 10, pos.y + yOff);
                }
                c.globalAlpha = 1;
            }
        }

        if (ACTION_MODE === 'move' && MOVE_SOURCE === t.id && t.owner === YOU) {
            c.globalAlpha = 0.5 + 0.3 * Math.sin(time * 0.08);
            c.strokeStyle = '#2ecc71';
            c.lineWidth = 3;
            c.beginPath();
            c.ellipse(pos.x, pos.y, pw / 2 + 4, ph / 2 + 4, 0, 0, Math.PI * 2);
            c.stroke();
            c.globalAlpha = 1;
        }

        c.restore();
    }
}

function renderHover(c, W, H) {
    if (hoverTid === null || !GAME) return;
    var t = GAME.territories[hoverTid];
    if (!t) return;

    var pd = PROVINCE_DATA[t.id];
    if (!pd) return;

    var pos = geoToScreen(pd.lon, pd.lat, W, H);
    c.save();

    c.strokeStyle = '#ffd700';
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.ellipse(pos.x, pos.y, 30, 24, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    var tipX = pos.x + 20;
    var tipY = pos.y - 50;
    if (tipX + 180 > W) tipX = pos.x - 200;
    if (tipY < 0) tipY = pos.y + 20;

    c.fillStyle = 'rgba(10,6,18,0.92)';
    c.beginPath();
    c.roundRect(tipX, tipY, 180, 55, 6);
    c.fill();
    c.strokeStyle = '#b8860b';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(tipX, tipY, 180, 55, 6);
    c.stroke();

    c.fillStyle = '#ffd700';
    c.font = 'bold 12px sans-serif';
    c.textAlign = 'left';
    c.fillText(t.name, tipX + 8, tipY + 16);

    c.fillStyle = '#aaa';
    c.font = '10px sans-serif';
    c.fillText(getOwnerName(t.owner) + ' | ⚔' + t.army + ' | Niv.' + t.fortLevel, tipX + 8, tipY + 32);
    c.fillText('Type: ' + t.type + ' | Capital: ' + (t.capital ? 'Oui' : 'Non'), tipX + 8, tipY + 46);

    c.restore();
}

function updateHover(mx, my) {
    if (!GAME) return;
    hoverTid = null;

    for (var i = 0; i < GAME.territories.length; i++) {
        var t = GAME.territories[i];
        var pd = PROVINCE_DATA[t.id];
        if (!pd) continue;
        var pos = geoToScreen(pd.lon, pd.lat, mapCanvas.width, mapCanvas.height);
        var dx = mx - pos.x;
        var dy = my - pos.y;
        if (Math.abs(dx) < 25 && Math.abs(dy) < 20) {
            hoverTid = t.id;
            hoverPos = { x: mx, y: my };
            break;
        }
    }
}

// ─── Map Interactions ────────────────────────────────────────────────────────

function handleMapClick(mx, my) {
    if (!GAME || GAME.phase !== 'planning') return;

    var clicked = null;
    for (var i = 0; i < GAME.territories.length; i++) {
        var t = GAME.territories[i];
        var pd = PROVINCE_DATA[t.id];
        if (!pd) continue;
        var pos = geoToScreen(pd.lon, pd.lat, mapCanvas.width, mapCanvas.height);
        var dx = mx - pos.x;
        var dy = my - pos.y;
        if (Math.abs(dx) < 25 && Math.abs(dy) < 20) {
            clicked = t;
            break;
        }
    }

    if (!clicked) {
        SELECTED_TERRITORY = null;
        ACTION_MODE = null;
        MOVE_SOURCE = null;
        updateActions();
        updateInfoPanel();
        return;
    }

    if (ACTION_MODE === 'move' && MOVE_SOURCE !== null) {
        if (MOVE_SOURCE !== clicked.id && clicked.owner === YOU &&
            ADJ[MOVE_SOURCE] && ADJ[MOVE_SOURCE].indexOf(clicked.id) >= 0) {
            var amount = prompt('Nombre de soldats a deplacer de ' + GAME.territories[MOVE_SOURCE].name + ' (max ' + (GAME.territories[MOVE_SOURCE].army - 1) + ') :', '5');
            if (amount) {
                wsSend({ action: 'carthage_action', cmd: 'move_army', from: MOVE_SOURCE, to: clicked.id, amount: parseInt(amount) || 5 });
            }
        }
        ACTION_MODE = null;
        MOVE_SOURCE = null;
        updateActions();
        return;
    }

    if (ACTION_MODE === 'attack' && MOVE_SOURCE !== null) {
        if (MOVE_SOURCE !== clicked.id && clicked.owner !== YOU &&
            ADJ[MOVE_SOURCE] && ADJ[MOVE_SOURCE].indexOf(clicked.id) >= 0) {
            if (confirm('Attaquer ' + clicked.name + ' depuis ' + GAME.territories[MOVE_SOURCE].name + ' ?')) {
                wsSend({ action: 'carthage_action', cmd: 'attack', from: MOVE_SOURCE, to: clicked.id });
            }
        }
        ACTION_MODE = null;
        MOVE_SOURCE = null;
        updateActions();
        return;
    }

    SELECTED_TERRITORY = clicked.id;
    updateActions();
    updateInfoPanel();
    if (clicked.owner === YOU) {
        showCityInterface(clicked.id);
    }
}

// ─── City Interface (Modal) ───────────────────────────────────────────────────

function showCityInterface(tid) {
    var existing = document.getElementById('cg-city-modal');
    if (existing) existing.remove();

    var t = GAME.territories[tid];
    if (!t) return;
    var pd = PROVINCE_DATA[t.id];
    if (!pd) return;
    var me = GAME.players[YOU];
    var isYours = t.owner === YOU;

    var modal = document.createElement('div');
    modal.id = 'cg-city-modal';
    modal.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2000;' +
        'background:rgba(16,10,28,0.97);border:2px solid ' + (isYours ? '#d4a017' : '#555') + ';' +
        'border-radius:10px;padding:20px;min-width:380px;max-width:450px;max-height:80vh;' +
        'overflow-y:auto;font-family:"Courier New",monospace;box-shadow:0 0 60px rgba(0,0,0,0.9);';

    // Header
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div>' +
            '<span style="font-size:20px;color:#ffd700;font-weight:bold">' + (pd.icon || '🏛') + ' ' + t.name + '</span>' +
            '<span style="font-size:11px;color:#888;margin-left:8px">[' + t.type + ']</span>' +
            (t.capital ? '<span style="font-size:12px;color:#ffd700;margin-left:6px">⭐ CAPITALE</span>' : '') +
        '</div>' +
        '<button onclick="document.getElementById(\'cg-city-modal\').remove()" style="background:none;border:1px solid #555;color:#888;border-radius:4px;cursor:pointer;padding:2px 8px;font-size:16px">✕</button>' +
        '</div>';

    // Owner & Status
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#ccc;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px">' +
        '<div>Proprietaire: <span style="color:' + getOwnerColor(t.owner) + '">' + getOwnerName(t.owner) + '</span></div>' +
        '<div>Armée: <span style="color:#d4a017">⚔' + t.army + '</span></div>' +
        '<div>Fortification: <span style="color:#d4a017">🏛 Niv.' + t.fortLevel + '</span></div>' +
        '<div>Production: <span style="color:#2ecc71">🌾' + (t.foodIncome || 0) + ' 🪙' + (t.goldIncome || 0) +
            (t.shipIncome > 0 ? ' ⛵' + t.shipIncome : '') + (t.stoneIncome > 0 ? ' ⛏' + t.stoneIncome : '') + '</span></div>' +
        '</div>';

    // Buildings
    if (t.buildings && t.buildings.length) {
        html += '<div style="font-size:11px;color:#d4a017;margin-bottom:6px">BATIMENTS:</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">';
        for (var bi = 0; bi < t.buildings.length; bi++) {
            var bm = BUILDINGS_META[t.buildings[bi]];
            if (bm) {
                html += '<span style="font-size:11px;padding:3px 8px;background:rgba(212,160,23,0.1);border:1px solid rgba(212,160,23,0.2);border-radius:4px;color:#ddd">' +
                    bm.icon + ' ' + bm.name + '</span>';
            }
        }
        html += '</div>';
    }

    // Actions
    if (isYours && GAME.phase === 'planning') {
        html += '<div style="font-size:11px;color:#d4a017;margin-bottom:6px">ACTIONS:</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">';

        // Fortify
        html += '<button onclick="wsSend({action:\'carthage_action\',cmd:\'fortify\',tid:' + t.id + '});document.getElementById(\'cg-city-modal\').remove()" style="padding:5px 10px;font-size:10px;border:1px solid #d4a017;background:rgba(212,160,23,0.1);color:#d4a017;border-radius:4px;cursor:pointer">🏗 Fortif (or)</button>';
        html += '<button onclick="wsSend({action:\'carthage_action\',cmd:\'fortify\',tid:' + t.id + ',use_stone:true});document.getElementById(\'cg-city-modal\').remove()" style="padding:5px 10px;font-size:10px;border:1px solid #888;background:rgba(136,136,136,0.1);color:#aaa;border-radius:4px;cursor:pointer">🏗 Fortif (pierre)</button>';

        // Recruit
        html += '<button onclick="wsSend({action:\'carthage_action\',cmd:\'recruit\',tid:' + t.id + ',amount:5});document.getElementById(\'cg-city-modal\').remove()" style="padding:5px 10px;font-size:10px;border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:4px;cursor:pointer">⚔ Recruter 5</button>';
        html += '<button onclick="wsSend({action:\'carthage_action\',cmd:\'recruit\',tid:' + t.id + ',amount:10});document.getElementById(\'cg-city-modal\').remove()" style="padding:5px 10px;font-size:10px;border:1px solid #e74c3c;background:rgba(231,76,60,0.15);color:#e74c3c;border-radius:4px;cursor:pointer">⚔ Recruter 10</button>';

        // Move / Attack
        var hasAdj = ADJ[t.id] && ADJ[t.id].length;
        if (hasAdj) {
            html += '<button onclick="ACTION_MODE=\'move\';MOVE_SOURCE=' + t.id + ';document.getElementById(\'cg-city-modal\').remove();updateActions()" style="padding:5px 10px;font-size:10px;border:1px solid #3498db;background:rgba(52,152,219,0.1);color:#3498db;border-radius:4px;cursor:pointer">📦 Deplacer</button>';

            // Check for enemy adjacent
            var hasEnemy = false;
            var adjList = ADJ[t.id];
            for (var aj = 0; aj < adjList.length; aj++) {
                var n = GAME.territories[adjList[aj]];
                if (n && n.owner !== YOU) { hasEnemy = true; break; }
            }
            if (hasEnemy && t.army >= 2) {
                html += '<button onclick="ACTION_MODE=\'attack\';MOVE_SOURCE=' + t.id + ';document.getElementById(\'cg-city-modal\').remove();updateActions()" style="padding:5px 10px;font-size:10px;border:1px solid #ff4444;background:rgba(255,68,68,0.1);color:#ff4444;border-radius:4px;cursor:pointer">⚔ Attaquer</button>';
            }
        }

        html += '</div>';

        // Construction
        html += '<div style="font-size:11px;color:#2ecc71;margin-bottom:6px">CONSTRUCTION:</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">';
        var BUILD_LIST = [
            { key:'wheat', label:'🌾 Ble (15)' },
            { key:'olive', label:'🫒 Oliviers (20)' },
            { key:'resin', label:'🌲 Resine (25)' },
            { key:'vineyard', label:'🍇 Vignobles (20)' },
            { key:'granary', label:'🏪 Grenier (25)' },
            { key:'quarry', label:'⛏ Carriere (30)' },
            { key:'shipyard', label:'⛵ Chantier (35)' },
            { key:'forge', label:'⚒ Forge (40)' },
            { key:'fortress', label:'🏯 Forteresse (70)' },
            { key:'temple', label:'☥ Temple (30)' },
            { key:'walls', label:'🏰 Remparts (40)' },
            { key:'market', label:'🏪 Marche (35)' },
            { key:'dock', label:'⚓ Quai (25)' },
        ];
        for (var bj = 0; bj < BUILD_LIST.length; bj++) {
            var bk = BUILD_LIST[bj].key;
            var alreadyBuilt = t.buildings && t.buildings.indexOf(bk) >= 0;
            if (!alreadyBuilt) {
                html += '<button onclick="wsSend({action:\'carthage_action\',cmd:\'construct\',tid:' + t.id + ',building:\'' + bk + '\'});document.getElementById(\'cg-city-modal\').remove()" style="padding:4px 8px;font-size:10px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.06);color:#2ecc71;border-radius:3px;cursor:pointer">' + BUILD_LIST[bj].label + '</button>';
            }
        }
        html += '</div>';
    }

    // LW Panel
    if (isYours && GAME.phase === 'planning' && me) {
        html += '<div style="border-top:1px solid rgba(212,160,23,0.15);padding-top:8px;margin-top:4px">' +
            '<div style="font-size:11px;color:#ffd700;margin-bottom:4px">⚔ LW CONSTRUCTION (' + (me.lwPoints || 0) + ' pts)</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px">' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'ship\'});document.getElementById(\'cg-city-modal\').remove()" style="padding:4px 8px;font-size:10px;border:1px solid #3498db;background:rgba(52,152,219,0.1);color:#3498db;border-radius:3px;cursor:pointer">⛵ Navire (50)</button>' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'weapons\'});document.getElementById(\'cg-city-modal\').remove()" style="padding:4px 8px;font-size:10px;border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:3px;cursor:pointer">⚒ Armes (30)</button>' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'factory\'});document.getElementById(\'cg-city-modal\').remove()" style="padding:4px 8px;font-size:10px;border:1px solid #2ecc71;background:rgba(46,204,113,0.1);color:#2ecc71;border-radius:3px;cursor:pointer">🏭 Usine (80)</button>' +
            '</div></div>';
    }

    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// ─── UI Panels ───────────────────────────────────────────────────────────────

function updateInfoPanel() {
    var el = document.getElementById('cg-info');
    if (!el || !GAME) return;

    if (SELECTED_TERRITORY === null) {
        var me = GAME.players[YOU];
        el.innerHTML = '<div style="font-size:12px;color:#d4a017">VOTRE EMPIRE</div>' +
            '<div style="font-size:11px;color:#aaa;margin-top:4px">' +
            '🪙 Or: ' + (me ? me.gold : 0) + ' | 🎌 Territoires: ' + (me ? me.territoryCount : 0) +
            ' | ⚔ Armee: ' + (me ? me.totalArmy : 0) + ' | ❤ Moral: ' + (me ? me.moral : 0) + '%' +
            '</div>' +
            '<div style="font-size:10px;color:#888;margin-top:2px">' +
            '🌾 Nourriture: ' + (me ? me.food : 0) +
            ' | ⛵ Navires: ' + (me ? me.ships : 0) +
            ' | ⛏ Pierre: ' + (me ? me.stone : 0) +
            ' | ⚒ Armes: ' + (me ? me.weapons : 0) +
            '</div>' +
            '<div style="font-size:10px;color:#ffd700;margin-top:2px">' +
            '⚔ LW: ' + (me ? me.lwPoints : 0) + ' pts' +
            '</div>' +
            '<div style="font-size:10px;color:#888;margin-top:2px">' +
            'Phase: ' + GAME.phase + ' | Tour: ' + GAME.turn +
            '</div>';
        return;
    }

    var t = GAME.territories[SELECTED_TERRITORY];
    if (!t) return;

    el.innerHTML = '<div style="font-size:13px;color:#ffd700;font-weight:bold">' + t.name + '</div>' +
        '<div style="font-size:11px;color:#aaa;margin-top:4px">' +
        'Proprietaire: ' + getOwnerName(t.owner) + '<br>' +
        '⚔ Armee: ' + t.army + '<br>' +
        '🏛 Fortification: Niv.' + t.fortLevel + '<br>' +
        'Type: ' + t.type + '<br>' +
        (t.capital ? '⭐ CAPITALE<br>' : '') +
        '</div>' +
        (t.buildings && t.buildings.length ? '<div style="font-size:11px;color:#d4a017;margin-top:4px">Batiments:<br>' +
            t.buildings.map(function (bk) {
                var bm = BUILDINGS_META[bk];
                return bm ? '<span style="margin-right:6px">' + bm.icon + ' ' + bm.name + '</span>' : '';
            }).join('') +
            '</div>' : '');
}

function updateActions() {
    var el = document.getElementById('cg-actions');
    if (!el || !GAME || GAME.phase !== 'planning') {
        if (el) el.innerHTML = '<div style="color:#888;font-size:11px">En attente du tour suivant...</div>';
        return;
    }

    var buttons = [];
    var t = SELECTED_TERRITORY !== null ? GAME.territories[SELECTED_TERRITORY] : null;

    if (t && t.owner === YOU) {
        buttons.push({ text: '📦 DEPLACER', action: function () {
            ACTION_MODE = 'move';
            MOVE_SOURCE = t.id;
            updateActions();
        }});

        var hasEnemyAdj = false;
        var adj = ADJ[t.id];
        if (adj) {
            for (var j = 0; j < adj.length; j++) {
                var neighbor = GAME.territories[adj[j]];
                if (neighbor && neighbor.owner !== YOU) { hasEnemyAdj = true; break; }
            }
        }

        if (hasEnemyAdj && t.army >= 2) {
            buttons.push({ text: '⚔ ATTAQUER', action: function () {
                ACTION_MODE = 'attack';
                MOVE_SOURCE = t.id;
                updateActions();
            }});
        }

        buttons.push({ text: '🏗 FORTIFIER (20+ or)', action: function () {
            wsSend({ action: 'carthage_action', cmd: 'fortify', tid: t.id, use_stone: false });
        }});

        buttons.push({ text: '🏗 FORTIFIER (8 pierre)', action: function () {
            wsSend({ action: 'carthage_action', cmd: 'fortify', tid: t.id, use_stone: true });
        }});

        buttons.push({ text: '⚔ RECRUTER (5)', action: function () {
            wsSend({ action: 'carthage_action', cmd: 'recruit', tid: t.id, amount: 5 });
        }});

        buttons.push({ text: '⚔ RECRUTER (10)', action: function () {
            wsSend({ action: 'carthage_action', cmd: 'recruit', tid: t.id, amount: 10 });
        }});

        // Building buttons
        var BUILD_LIST = [
            { key:'wheat', label:'🌾 Ble (15+ or)' },
            { key:'olive', label:'🫒 Oliviers (20+)' },
            { key:'resin', label:'🌲 Resine (25+)' },
            { key:'vineyard', label:'🍇 Vignobles (20+)' },
            { key:'granary', label:'🏪 Grenier (25+)' },
            { key:'quarry', label:'⛏ Carriere (30+)' },
            { key:'shipyard', label:'⛵ Chantier naval (35+)' },
            { key:'forge', label:'⚒ Forge (40+)' },
            { key:'fortress', label:'🏯 Forteresse (70+)' },
            { key:'temple', label:'☥ Temple (30+)' },
            { key:'walls', label:'🏰 Remparts (40+)' },
            { key:'market', label:'🏪 Marche (35+)' },
            { key:'dock', label:'⚓ Quai (25+)' },
        ];
        for (var b = 0; b < BUILD_LIST.length; b++) {
            (function (bk, bl) {
                var alreadyBuilt = t.buildings && t.buildings.indexOf(bk) >= 0;
                if (!alreadyBuilt) {
                    buttons.push({ text: bl, action: function () {
                        wsSend({ action: 'carthage_action', cmd: 'construct', tid: t.id, building: bk });
                    }});
                }
            })(BUILD_LIST[b].key, BUILD_LIST[b].label);
        }
    }

    if (t && t.owner !== YOU && t.owner !== null) {
        var isAlly = ALLIES.indexOf(t.owner) >= 0;
        if (isAlly) {
            buttons.push({ text: '💔 ROMPRE ALLIANCE', action: function () {
                if (confirm('Briser l\'alliance ? (TRAHISON, -20 moral)')) {
                    wsSend({ action: 'carthage_action', cmd: 'break_alliance', ally: t.owner });
                }
            }});
        } else if (!isAlly && GAME.phase === 'planning') {
            buttons.push({ text: '🤝 PROPOSER ALLIANCE', action: function () {
                wsSend({ action: 'carthage_action', cmd: 'propose_alliance', to: t.owner });
            }});
        }
    }

    if (ACTION_MODE === 'move') {
        buttons = [{ text: '🔴 ANNULER DEPLACEMENT', action: function () {
            ACTION_MODE = null;
            MOVE_SOURCE = null;
            updateActions();
        }}];
    }

    if (ACTION_MODE === 'attack') {
        buttons = [{ text: '🔴 ANNULER ATTAQUE', action: function () {
            ACTION_MODE = null;
            MOVE_SOURCE = null;
            updateActions();
        }}];
    }

    buttons.push({ text: GAME.players[YOU] && GAME.players[YOU].ready ? '⏳ PRET' : '✅ FIN DU TOUR', action: function () {
        wsSend({ action: 'carthage_action', cmd: 'ready' });
    }});

    el.innerHTML = '';
    for (var k = 0; k < buttons.length; k++) {
        var btn = document.createElement('button');
        btn.textContent = buttons[k].text;
        btn.style.cssText =
            'padding:6px 12px;font-size:11px;border:1px solid rgba(212,160,23,0.3);' +
            'background:rgba(212,160,23,0.08);color:#d4a017;border-radius:4px;cursor:pointer;' +
            'transition:all 0.1s';
        btn.onmouseover = function () { this.style.background = 'rgba(212,160,23,0.2)'; };
        btn.onmouseout = function () { this.style.background = 'rgba(212,160,23,0.08)'; };
        btn.onclick = buttons[k].action;
        el.appendChild(btn);
    }

    // LW Construction panel
    if (GAME.players[YOU]) {
        var lwEl = document.getElementById('cg-lw-panel');
        if (!lwEl) {
            lwEl = document.createElement('div');
            lwEl.id = 'cg-lw-panel';
            lwEl.style.cssText = 'padding:8px;border-top:1px solid rgba(212,160,23,0.15);flex-shrink:0';
            var sidebar = document.getElementById('cg-sidebar');
            if (sidebar) sidebar.appendChild(lwEl);
        }
        var me = GAME.players[YOU];
        lwEl.innerHTML = '<div style="font-size:11px;color:#ffd700;margin-bottom:4px">⚔ CONSTRUCTION LW (' + (me.lwPoints || 0) + ' pts)</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px">' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'ship\'})" style="padding:5px 10px;font-size:10px;border:1px solid #3498db;background:rgba(52,152,219,0.1);color:#3498db;border-radius:3px;cursor:pointer">⛵ Navire (50 LW)</button>' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'weapons\'})" style="padding:5px 10px;font-size:10px;border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:3px;cursor:pointer">⚒ Armes (30 LW)</button>' +
            '<button onclick="wsSend({action:\'carthage_action\',cmd:\'build_lw\',item:\'factory\'})" style="padding:5px 10px;font-size:10px;border:1px solid #2ecc71;background:rgba(46,204,113,0.1);color:#2ecc71;border-radius:3px;cursor:pointer">🏭 Usine (80 LW)</button>' +
            '</div>' +
            (me.lwFactories ? '<div style="font-size:9px;color:#2ecc71;margin-top:2px">🏭 Usines: ' + me.lwFactories + ' (+' + (me.lwFactories * 2) + ' armes/tour)</div>' : '');
    }
}

function updateDiplomacyPanel() {
    var el = document.getElementById('cg-diplomacy');
    if (!el || !GAME) return;

    var html = '<div style="font-size:11px;color:#d4a017;margin-bottom:6px">DIPLOMATIE</div>';

    var pending = GAME.pendingAlliances || [];
    for (var i = 0; i < pending.length; i++) {
        var p = pending[i];
        if (p.to === YOU) {
            var fromName = GAME.players[p.from] ? GAME.players[p.from].username : 'Inconnu';
            html += '<div style="font-size:11px;color:#888;margin-bottom:4px;padding:4px;' +
                'border:1px solid rgba(212,160,23,0.2);border-radius:4px">' +
                '🤝 ' + fromName + ' propose une alliance' +
                '<div style="margin-top:4px">' +
                '<button onclick="window._cgAccept(\'' + p.from + '\')" style="padding:3px 8px;font-size:10px;' +
                'border:1px solid #2ecc71;background:rgba(46,204,113,0.1);color:#2ecc71;border-radius:3px;cursor:pointer">ACCEPTER</button>' +
                ' <button onclick="window._cgReject(\'' + p.from + '\')" style="padding:3px 8px;font-size:10px;' +
                'border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:3px;cursor:pointer">REFUSER</button>' +
                '</div></div>';
        }
    }

    var alliances = GAME.alliances || [];
    if (alliances.length > 0) {
        html += '<div style="font-size:10px;color:#2ecc71;margin-top:4px">ALLIANCES ACTIVES:</div>';
        for (var j = 0; j < alliances.length; j++) {
            var a = alliances[j];
            var other = a[0] === YOU ? a[1] : a[0];
            var otherName = GAME.players[other] ? GAME.players[other].username : 'Inconnu';
            html += '<div style="font-size:10px;color:#2ecc71;padding:2px 0">🤝 ' + otherName + '</div>';
        }
    }

    el.innerHTML = html;

    window._cgAccept = function (fromId) {
        wsSend({ action: 'carthage_action', cmd: 'accept_alliance', from: fromId });
    };
    window._cgReject = function (fromId) {
        wsSend({ action: 'carthage_action', cmd: 'reject_alliance', from: fromId });
    };
}

function updateMap() {
    // Map is rendered in the render loop
}

function updateLog() {
    var el = document.getElementById('cg-log');
    if (!el || !GAME) return;

    var log = GAME.log || [];
    el.innerHTML = log.slice(-15).map(function (m) {
        return '<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03)">' +
            '<span style="color:#888">[' + m.sender + ']</span> ' + m.text +
            '</div>';
    }).join('');
}

// ─── Battle Result ───────────────────────────────────────────────────────────

function showBattleResult(battle) {
    var modal = document.createElement('div');
    modal.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2001;' +
        'background:rgba(10,6,18,0.96);border:2px solid ' +
        (battle.attackerWins ? '#2ecc71' : '#e74c3c') + ';border-radius:8px;' +
        'padding:20px;text-align:center;font-family:"Courier New",monospace;' +
        'min-width:300px;box-shadow:0 0 40px rgba(0,0,0,0.8)';

    var winnerText = battle.attackerWins ? 'VICTOIRE' : 'DEFAITE';
    var winnerColor = battle.attackerWins ? '#2ecc71' : '#e74c3c';
    var attName = GAME && GAME.players[battle.attacker] ? GAME.players[battle.attacker].username : 'Attaquant';
    var defName = GAME && GAME.players[battle.defender] ? GAME.players[battle.defender].username : 'Defenseur';

    modal.innerHTML =
        '<div style="font-size:24px;color:' + winnerColor + ';font-weight:bold;margin-bottom:8px">' +
            winnerText + '</div>' +
        '<div style="font-size:14px;color:#ffd700;margin-bottom:12px">⚔ BATAILLE DE ' + battle.territory + '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-bottom:16px">' +
            attName + ' vs ' + defName +
        '</div>' +
        '<table style="margin:0 auto;font-size:12px;color:#ccc;border-collapse:collapse">' +
            '<tr><td style="padding:3px 10px">Attaque:</td><td style="padding:3px 10px;color:#d4a017">' + battle.attackers + '</td>' +
            '<td style="padding:3px 10px;color:#e74c3c">-' + battle.atkLosses + '</td></tr>' +
            '<tr><td style="padding:3px 10px">Defense:</td><td style="padding:3px 10px;color:#d4a017">' + battle.defenders + '</td>' +
            '<td style="padding:3px 10px;color:#e74c3c">-' + battle.defLosses + '</td></tr>' +
        '</table>' +
        (battle.attackerWins
            ? '<div style="margin-top:12px;padding:6px;background:rgba(46,204,113,0.1);border-radius:4px;font-size:11px;color:#2ecc71">Territoire conquis !</div>'
            : '<div style="margin-top:12px;padding:6px;background:rgba(231,76,60,0.1);border-radius:4px;font-size:11px;color:#e74c3c">Attaque repoussee</div>') +
        '<button onclick="this.parentNode.remove()" style="margin-top:12px;padding:6px 20px;' +
            'border:1px solid #d4a017;background:rgba(212,160,23,0.1);color:#d4a017;border-radius:4px;cursor:pointer">FERMER</button>';

    document.body.appendChild(modal);
}

// ─── Game Over ───────────────────────────────────────────────────────────────

function showGameOver(winnerName) {
    var isYou = GAME && GAME.winner === YOU;

    var overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:3000;' +
        'display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.85);font-family:"Courier New",monospace;';

    overlay.innerHTML =
        '<div style="text-align:center">' +
            '<div style="font-size:48px;margin-bottom:12px">' + (isYou ? '🏆' : '💀') + '</div>' +
            '<div style="font-size:28px;color:' + (isYou ? '#ffd700' : '#e74c3c') + ';font-weight:bold;margin-bottom:8px">' +
                (isYou ? 'VICTOIRE !' : 'DEFAITE') +
            '</div>' +
            '<div style="font-size:16px;color:#aaa;margin-bottom:20px">' +
                winnerName + ' remporte la partie !' +
            '</div>' +
            '<div style="display:flex;gap:10px;justify-content:center">' +
                '<button onclick="location.reload()" style="padding:10px 24px;border:2px solid #d4a017;' +
                    'background:rgba(212,160,23,0.15);color:#d4a017;border-radius:6px;cursor:pointer;font-size:14px">REJOUER</button>' +
                '<button onclick="location.href=\'/\'" style="padding:10px 24px;border:2px solid #555;' +
                    'background:rgba(255,255,255,0.05);color:#888;border-radius:6px;cursor:pointer;font-size:14px">HUB</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);
}

// ─── Log Helper ──────────────────────────────────────────────────────────────

function addLog(sender, text) {
    var el = document.getElementById('lobby-log') || document.getElementById('cg-log');
    if (!el) return;
    var div = document.createElement('div');
    div.style.cssText = 'padding:2px 0;color:#aaa;font-size:11px';
    div.innerHTML = '<span style="color:#888">[' + sender + ']</span> ' + text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init() {
    if (document.getElementById('carthage-lobby')) return;

    var backdrop = document.createElement('div');
    backdrop.id = 'multi-backdrop';
    backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999;' +
        'background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;' +
        'font-family:"Courier New",monospace;color:#d4a017;font-size:18px';
    backdrop.innerHTML = 'Connexion au serveur multijoueur...';
    document.body.appendChild(backdrop);

    createLobby();
    showLobby();
    connect();
}

// Expose for integration with existing game menu
window.CarthageMulti = {
    init: init,
    isActive: function () {
        return WS && WS.readyState === WebSocket.OPEN;
    },
};

})();
