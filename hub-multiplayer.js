// ═════════════════════════════════════════════════════════════════════════════
//  PixGameHub — HubDashboard Client (Native WebSocket, no Socket.IO)
//  Pixel Software Design
// ═════════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const WS_PROTO = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const __hubWsHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('.railway.app'))
        ? location.host : 'pixgamehub-production.up.railway.app';
    const WS_URL = `${WS_PROTO}//${__hubWsHost}/api/ws`;
    const API_URL = `${location.origin}/api`;

    let ws = null;
    let reconnectTimer = null;
    let serverStatus = null;
    let activeRooms = {};

    // ─── Status bar ───────────────────────────────────────────────────────
    function createStatusBar() {
        const bar = document.createElement('div');
        bar.id = 'hub-status-bar';
        bar.innerHTML = `
            <style>
                #hub-status-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 40px;
                    background: linear-gradient(135deg, #1a0a08, #0a0a1a);
                    border-bottom: 1px solid #2a2a3a;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    z-index: 1000;
                    font-family: monospace;
                    font-size: 12px;
                }
                #hub-status-bar .status-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                #hub-status-bar .status-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                #hub-status-bar .brand-tag {
                    color: #d4a017;
                    font-weight: bold;
                    letter-spacing: 2px;
                    font-size: 11px;
                }
                #hub-status-bar .connection-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #c1121f;
                    transition: background 0.3s;
                }
                #hub-status-bar .connection-dot.connected {
                    background: #44cc44;
                }
                #hub-status-bar .stat-chip {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid #333;
                    padding: 3px 10px;
                    border-radius: 10px;
                    color: #aaa;
                    font-size: 11px;
                }
                #hub-status-bar .stat-chip span {
                    color: #d4a017;
                    font-weight: bold;
                }
                #hub-status-bar .uptime {
                    color: #666;
                    font-size: 10px;
                }
            </style>
            <div class="status-left">
                <span class="brand-tag">&#9670; PIXEL SOFTWARE DESIGN</span>
                <span class="stat-chip">Jeux: <span id="stat-games">12</span></span>
                <span class="stat-chip">En ligne: <span id="stat-players">0</span></span>
                <span class="stat-chip">Salles: <span id="stat-rooms">0</span></span>
            </div>
            <div class="status-right">
                <span class="uptime" id="stat-uptime"></span>
                <div class="connection-dot" id="conn-dot" title="WebSocket"></div>
            </div>
        `;
        document.body.prepend(bar);

        document.body.style.paddingTop = '40px';
    }

    // ─── Player badges on game cards ──────────────────────────────────────
    function addPlayerBadges() {
        const gameMap = {
            'platform': 'platform',
            'fight': 'fight',
            'battle': 'battle',
            'anime': 'anime',
            'pixel': 'pixel',
            'jungle': 'jungle',
            'manga': 'manga',
            'arabparkour': 'arabparkour',
            'shadows': 'shadows',
            'carthage': 'carthage',
            'carthage_platformer': 'carthage_plat',
            'engine': 'engine',
        };

        const cards = document.querySelectorAll('.game-card');
        cards.forEach(card => {
            const onclick = card.getAttribute('onclick') || '';
            const match = onclick.match(/games\/([^/]+)/);
            if (!match) return;
            const dir = match[1];
            const serverKey = gameMap[dir] || dir;

            const badge = document.createElement('div');
            badge.className = 'mp-badge';
            badge.id = `badge-${serverKey}`;
            badge.style.cssText = `
                position: absolute;
                top: 16px;
                left: 16px;
                background: rgba(0,0,0,0.7);
                border: 1px solid #333;
                color: #888;
                padding: 3px 8px;
                border-radius: 6px;
                font: bold 10px monospace;
                z-index: 5;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
            `;
            badge.textContent = '● 0';
            card.style.position = 'relative';
            card.appendChild(badge);
        });
    }

    function updateBadges() {
        for (const [gameId, count] of Object.entries(activeRooms)) {
            const badge = document.getElementById(`badge-${gameId}`);
            if (!badge) continue;
            if (count > 0) {
                badge.style.opacity = '1';
                badge.textContent = `● ${count}`;
                badge.style.color = count > 3 ? '#ff4444' : count > 1 ? '#ff8800' : '#44cc44';
                badge.style.borderColor = count > 3 ? '#ff4444' : count > 1 ? '#ff8800' : '#44cc44';
            } else {
                badge.style.opacity = '0';
            }
        }

        const total = Object.values(activeRooms).reduce((s, n) => s + n, 0);
        const rooms = Object.values(activeRooms).filter(n => n > 0).length;
        const elP = document.getElementById('stat-players');
        const elR = document.getElementById('stat-rooms');
        if (elP) elP.textContent = total;
        if (elR) elR.textContent = rooms;
    }

    // ─── WebSocket connection ──────────────────────────────────────────────
    function connect() {
        if (ws && ws.readyState <= 1) return;

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            const dot = document.getElementById('conn-dot');
            if (dot) dot.classList.add('connected');
            console.log('[PixHub] WebSocket connected');
        };

        ws.onmessage = (e) => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            if (msg.action === 'rooms_list') {
                activeRooms = {};
                for (const r of msg.rooms) {
                    activeRooms[r.gameId] = r.players;
                }
                updateBadges();
            }
        };

        ws.onclose = () => {
            const dot = document.getElementById('conn-dot');
            if (dot) dot.classList.remove('connected');
            scheduleReconnect();
        };

        ws.onerror = () => {};
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, 3000);
    }

    function wsSend(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    // ─── Poll server status ───────────────────────────────────────────────
    async function fetchStatus() {
        try {
            const res = await fetch(`${API_URL}/status`);
            serverStatus = await res.json();
            const elG = document.getElementById('stat-games');
            const elU = document.getElementById('stat-uptime');
            if (elG) elG.textContent = serverStatus.games;
            if (elU) {
                const s = Math.floor(serverStatus.uptime);
                const m = Math.floor(s / 60);
                const h = Math.floor(m / 60);
                elU.textContent = h > 0 ? `${h}h ${m % 60}m` : m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
            }
            activeRooms = serverStatus.rooms || {};
            updateBadges();
        } catch {}
    }

    // ─── Init ─────────────────────────────────────────────────────────────
    function init() {
        createStatusBar();
        addPlayerBadges();
        connect();
        fetchStatus();
        setInterval(fetchStatus, 5000);
        setInterval(() => wsSend({ action: 'get_rooms' }), 4000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
