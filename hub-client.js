// ═════════════════════════════════════════════════════════════════════════════
//  PixGameHub Client Bundle — Pixel Software Design
//  AuthUI + MessengerUI + LeaderboardUI + MarketUI + pixHush
//  Adapted from TypeScript to vanilla JS (no build system needed)
// ═════════════════════════════════════════════════════════════════════════════
(function() {
'use strict';

const API = location.origin + '/api';
const PROD_API = 'https://pixelsoftwaredesign.xyz';
let _ws = null;
let _username = localStorage.getItem('pix_username') || '';
let _token = localStorage.getItem('pix_token') || '';

let _wsApiCallbacks = {};
let _wsApiId = 0;
function wsApiCall(path, body) {
    return new Promise((resolve, reject) => {
        if (!_ws || _ws.readyState !== 1) return reject(new Error('WS not connected'));
        const id = ++_wsApiId;
        _wsApiCallbacks[id] = { resolve, reject };
        _ws.send(JSON.stringify({ action: 'ws_api', id, path, body }));
        setTimeout(() => { if (_wsApiCallbacks[id]) { _wsApiCallbacks[id].reject(new Error('Timeout')); delete _wsApiCallbacks[id]; } }, 8000);
    });
}

// ─── pixHush (Toast Notifications) ──────────────────────────────────────────
function pixHush(message, type) {
    type = type || 'info';
    let container = document.getElementById('pix-hush-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pix-hush-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;font-family:monospace;pointer-events:none;';
        document.body.appendChild(container);
    }
    const colors = { success: '#2ecc71', error: '#e74c3c', info: '#8d3629' };
    const bgs = { success: 'rgba(15,30,20,0.95)', error: 'rgba(30,15,15,0.95)', info: 'rgba(26,15,20,0.95)' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${bgs[type]};border:2px solid ${colors[type]};color:#fff;padding:12px 20px;border-radius:6px;font-size:0.9rem;box-shadow:0 5px 15px rgba(0,0,0,0.6);pointer-events:auto;opacity:0;transform:translateX(50px);transition:opacity 0.3s,transform 0.3s;display:flex;align-items:center;justify-content:space-between;min-width:250px;font-family:monospace;`;
    toast.innerHTML = `<span>${message}</span><span style="font-size:0.7rem;color:#8c757d;margin-left:15px;">PIXSYS</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
window.pixHush = pixHush;

// ─── AuthUI ─────────────────────────────────────────────────────────────────
function showAuthUI(onSuccess) {
    const el = document.createElement('div');
    el.id = 'pix-auth-modal';
    el.innerHTML = `
        <style>
            #pix-auth-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(18,9,12,0.95);display:flex;align-items:center;justify-content:center;font-family:monospace;z-index:10000;color:#e2a03d}
            .auth-box{background:#1a0f14;border:2px solid #8d3629;padding:30px;border-radius:8px;width:350px;text-align:center}
            .auth-box h2{margin-bottom:5px;font-size:1.8rem}
            .auth-sub{color:#8c757d;font-size:0.85rem;margin-bottom:20px}
            .auth-input{width:100%;padding:10px;margin-bottom:15px;background:#12090c;border:1px solid #552119;color:#fff;font-family:monospace;border-radius:4px;box-sizing:border-box}
            .auth-btn{width:100%;padding:10px;background:#8d3629;color:#fff;border:none;font-family:monospace;font-weight:bold;border-radius:4px;cursor:pointer;transition:background 0.2s;font-size:1rem}
            .auth-btn:hover{background:#b54535}
            .auth-error{color:#ff5555;font-size:0.85rem;margin-top:10px}
            .auth-toggle{margin-top:15px;color:#8c757d;font-size:0.8rem;cursor:pointer}
            .auth-toggle:hover{color:#e2a03d}
        </style>
        <div class="auth-box">
            <h2>PIXGAMEHUB</h2>
            <div class="auth-sub">Pixel Software Design</div>
            <form id="auth-form">
                <input type="text" id="auth-username" class="auth-input" placeholder="Nom d'operateur" required minlength="3"/>
                <input type="password" id="auth-password" class="auth-input" placeholder="Mot de passe" required minlength="4"/>
                <button type="submit" class="auth-btn" id="auth-submit-btn">CONNEXION</button>
                <div class="auth-error" id="auth-error"></div>
            </form>
            <div class="auth-toggle" id="auth-toggle">Pas de compte ? S'inscrire</div>
        </div>
    `;
    document.body.appendChild(el);

    let isRegister = false;
    document.getElementById('auth-toggle').onclick = () => {
        isRegister = !isRegister;
        document.getElementById('auth-submit-btn').textContent = isRegister ? "S'INSCRIRE" : 'CONNEXION';
        document.getElementById('auth-toggle').textContent = isRegister ? 'Deja un compte ? Se connecter' : "Pas de compte ? S'inscrire";
    };

    document.getElementById('auth-form').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        try {
            if (!_ws || _ws.readyState !== 1) {
                errorEl.textContent = 'Connexion au serveur... reessayez dans 2s.';
                return;
            }
            const action = isRegister ? '/auth/register' : '/auth/login';
            const data = await wsApiCall(action, { username, password });
            if (data.error) throw new Error(data.error);
            if (isRegister) {
                pixHush('Operateur enregistre ! Connectez-vous.', 'success');
                isRegister = false;
                document.getElementById('auth-submit-btn').textContent = 'CONNEXION';
                document.getElementById('auth-toggle').textContent = "Pas de compte ? S'inscrire";
                return;
            }
            localStorage.setItem('pix_token', data.token);
            localStorage.setItem('pix_username', data.username);
            _token = data.token;
            _username = data.username;
            el.remove();
            pixHush(`Bienvenue, ${data.username} !`, 'success');
            onSuccess(data.token, data.username);
        } catch (err) {
            errorEl.textContent = err.message;
        }
    };
}

// ─── MessengerUI ────────────────────────────────────────────────────────────
let _messengerCurrentRoom = 'global_hub';
function initMessenger(ws) {
    _ws = ws;
    const container = document.createElement('div');
    container.id = 'pix-messenger-widget';
    container.innerHTML = `
        <style>
            #pix-messenger-widget{position:fixed;bottom:20px;right:20px;font-family:monospace;z-index:99999}
            .messenger-toggle-btn{background:#8d3629;color:#fff;border:2px solid #e2a03d;padding:12px 20px;border-radius:30px;cursor:pointer;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.5);transition:transform 0.2s}
            .messenger-toggle-btn:hover{transform:scale(1.05)}
            .messenger-window{position:absolute;bottom:60px;right:0;width:320px;height:420px;background:#1a0f14;border:2px solid #8d3629;border-radius:8px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.7);color:#e2a03d}
            .messenger-header{background:#12090c;padding:12px;border-bottom:1px solid #552119;display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:0.9rem}
            .messenger-messages{flex:1;padding:10px;overflow-y:auto;font-size:0.85rem;display:flex;flex-direction:column;gap:8px}
            .chat-msg{background:#12090c;padding:8px;border-radius:4px;border-left:3px solid #8d3629}
            .chat-msg .sender{color:#85b5ff;font-weight:bold;margin-bottom:2px}
            .chat-msg .text{color:#fff;word-break:break-word}
            .messenger-input-area{padding:10px;background:#12090c;border-top:1px solid #552119;display:flex;gap:5px}
            .messenger-input{flex:1;background:#1a0f14;border:1px solid #552119;color:#fff;padding:8px;font-family:monospace;border-radius:4px}
            .messenger-send-btn{background:#8d3629;color:#fff;border:none;padding:8px 12px;font-family:monospace;font-weight:bold;border-radius:4px;cursor:pointer}
            .messenger-send-btn:hover{background:#b54535}
        </style>
        <button class="messenger-toggle-btn" id="toggle-chat-btn">MESSENGER</button>
        <div class="messenger-window" id="messenger-window">
            <div class="messenger-header">
                <span>CANAL: <span id="current-chat-room">GLOBAL</span></span>
                <button id="close-chat-btn" style="background:none;border:none;color:#e2a03d;cursor:pointer;font-weight:bold">X</button>
            </div>
            <div class="messenger-messages" id="messenger-messages"></div>
            <form class="messenger-input-area" id="chat-form">
                <input type="text" class="messenger-input" id="chat-input" placeholder="Message..." autocomplete="off" required/>
                <button type="submit" class="messenger-send-btn">ENVOYER</button>
            </form>
        </div>
    `;
    document.body.appendChild(container);

    const msgs = document.getElementById('messenger-messages');
    let isOpen = false;

    document.getElementById('toggle-chat-btn').onclick = () => {
        isOpen = !isOpen;
        document.getElementById('messenger-window').style.display = isOpen ? 'flex' : 'none';
        if (isOpen) msgs.scrollTop = msgs.scrollHeight;
    };
    document.getElementById('close-chat-btn').onclick = () => {
        isOpen = false;
        document.getElementById('messenger-window').style.display = 'none';
    };
    document.getElementById('chat-form').onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        if (input.value && _ws && _ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({ action: 'send_chat_message', room: _messengerCurrentRoom, content: input.value }));
            input.value = '';
        }
    };

    function appendMsg(sender, content) {
        const el = document.createElement('div');
        el.className = 'chat-msg';
        el.innerHTML = `<div class="sender">${sender}</div><div class="text">${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function joinRoom(room) {
        _messengerCurrentRoom = room;
        document.getElementById('current-chat-room').textContent = room.toUpperCase();
        msgs.innerHTML = '';
        if (_ws && _ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({ action: 'join_chat_room', room }));
        }
    }

    joinRoom('global_hub');

    return {
        handleChatMessage(msg) {
            if (msg.room === _messengerCurrentRoom) appendMsg(msg.sender, msg.content);
        },
        handleChatHistory(data) {
            if (data.room === _messengerCurrentRoom) {
                msgs.innerHTML = '';
                data.messages.forEach(m => appendMsg(m.sender, m.content));
            }
        },
        switchRoom: joinRoom
    };
}

// ─── LeaderboardUI ──────────────────────────────────────────────────────────
function showLeaderboard(gameId) {
    const el = document.createElement('div');
    el.id = 'pix-leaderboard-modal';
    el.innerHTML = `
        <style>
            #pix-leaderboard-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(18,9,12,0.9);display:flex;align-items:center;justify-content:center;font-family:monospace;z-index:10001;color:#e2a03d}
            .lb-box{background:#1a0f14;border:2px solid #8d3629;padding:30px;border-radius:8px;width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.7)}
            .lb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #552119;padding-bottom:10px}
            .lb-list{list-style:none;padding:0;margin:0;max-height:250px;overflow-y:auto}
            .lb-item{display:flex;justify-content:space-between;padding:10px;background:#12090c;margin-bottom:8px;border-radius:4px;border-left:3px solid #8d3629;font-size:0.9rem}
            .lb-item span{color:#fff}
            .close-lb-btn{background:#8d3629;color:#fff;border:none;padding:8px 15px;font-family:monospace;font-weight:bold;border-radius:4px;cursor:pointer;margin-top:20px;width:100%}
            .close-lb-btn:hover{background:#b54535}
        </style>
        <div class="lb-box">
            <div class="lb-header"><h2>CLASSEMENT</h2><span style="font-size:0.8rem;color:#8c757d">TOP 10</span></div>
            <ul class="lb-list" id="lb-entries"><li style="text-align:center;color:#8c757d">Chargement...</li></ul>
            <button class="close-lb-btn" id="close-lb">FERMER</button>
        </div>
    `;
    document.body.appendChild(el);
    document.getElementById('close-lb').onclick = () => el.remove();

    fetch(`${API}/leaderboard/${gameId}`).then(r => r.json()).then(data => {
        const list = document.getElementById('lb-entries');
        if (!data.leaderboard || !data.leaderboard.length) {
            list.innerHTML = '<li style="text-align:center;color:#8c757d">Aucun score enregistre.</li>';
            return;
        }
        list.innerHTML = '';
        data.leaderboard.forEach((entry, i) => {
            const item = document.createElement('li');
            item.className = 'lb-item';
            item.innerHTML = `<span>#${i+1} ${entry.username}</span><span style="color:#e2a03d">${entry.score} PTS</span>`;
            list.appendChild(item);
        });
    }).catch(() => {
        document.getElementById('lb-entries').innerHTML = '<li style="text-align:center;color:#ff5555">Erreur de connexion.</li>';
    });
}

// ─── MarketUI ───────────────────────────────────────────────────────────────
function showMarket(username) {
    let balance = 0;
    const el = document.createElement('div');
    el.id = 'pix-market-modal';
    el.innerHTML = `
        <style>
            #pix-market-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(18,9,12,0.92);display:flex;align-items:center;justify-content:center;font-family:monospace;z-index:10002;color:#e2a03d}
            .mk-box{background:#1a0f14;border:2px solid #8d3629;padding:30px;border-radius:8px;width:550px;box-shadow:0 10px 30px rgba(0,0,0,0.8)}
            .mk-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #552119;padding-bottom:10px}
            .wallet-disp{background:#12090c;padding:12px;border-radius:6px;border-left:3px solid #e2a03d;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
            .mk-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;max-height:250px;overflow-y:auto;margin-bottom:20px}
            .mk-item{background:#12090c;border:1px solid #552119;padding:15px;border-radius:6px;text-align:center;display:flex;flex-direction:column;justify-content:space-between}
            .mk-item h4{margin:0 0 5px;color:#fff;font-size:1rem}
            .mk-item p{margin:0 0 10px;color:#8c757d;font-size:0.8rem}
            .buy-btn,.topup-btn{background:#8d3629;color:#fff;border:none;padding:8px;font-family:monospace;font-weight:bold;border-radius:4px;cursor:pointer;width:100%}
            .buy-btn:hover,.topup-btn:hover{background:#b54535}
            .topup-btn{background:#33151b;border:1px solid #8d3629;width:auto;font-size:0.8rem;padding:8px 15px}
            .close-mk-btn{background:#22080c;color:#8c757d;border:1px solid #55151b;padding:8px;font-family:monospace;font-weight:bold;border-radius:4px;cursor:pointer;width:100%}
            .close-mk-btn:hover{color:#fff;background:#33151b}
        </style>
        <div class="mk-box">
            <div class="mk-header"><h2>PIXGAMEHUBMARKET</h2><span style="font-size:0.8rem;color:#8c757d">PIXSOFTPAY</span></div>
            <div class="wallet-disp">
                <div><span style="font-size:0.8rem;color:#8c757d">SOLDE PORTEFEUILLE</span><div id="mk-bal" style="font-size:1.2rem;font-weight:bold;color:#fff">Chargement...</div></div>
                <button class="topup-btn" id="mk-topup">+ RECHARGER (50)</button>
            </div>
            <div class="mk-grid">
                <div class="mk-item"><div><h4>Epee de Carthage</h4><p>Arme legendaire skin exclusif.</p></div><button class="buy-btn" data-item="sword_carthage_01" data-price="15">15 CREDITS</button></div>
                <div class="mk-item"><div><h4>Bouclier Punique</h4><p>Defense renforcee +20%.</p></div><button class="buy-btn" data-item="shield_punic_02" data-price="25">25 CREDITS</button></div>
                <div class="mk-item"><div><h4>Relique Doree</h4><p>Multiplicateur de score x2.</p></div><button class="buy-btn" data-item="relic_gold_03" data-price="40">40 CREDITS</button></div>
                <div class="mk-item"><div><h4>Pass Operateur VIP</h4><p>Acces anticipe aux nouveautes.</p></div><button class="buy-btn" data-item="vip_pass_2026" data-price="50">50 CREDITS</button></div>
            </div>
            <button class="close-mk-btn" id="close-mk">RETOUR AU HUB</button>
        </div>
    `;
    document.body.appendChild(el);
    document.getElementById('close-mk').onclick = () => el.remove();
    document.getElementById('mk-topup').onclick = () => topUp(50);

    async function fetchWallet() {
        try {
            const res = await fetch(`${PROD_API}/pixsoftpay/wallet/`, { mode: 'cors' });
            const text = await res.text();
            const m = text.match(/([\d\s,.]+)\s*TND/);
            if (m) {
                balance = parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) || 0;
            }
            document.getElementById('mk-bal').textContent = balance.toFixed(2) + ' TND';
        } catch {
            document.getElementById('mk-bal').textContent = 'Hors ligne';
        }
    }

    async function topUp(amount) {
        pixHush(`Rechargement via PixSoftPay en ligne...`, 'info');
        window.open(`${PROD_API}/pixsoftpay/wallet/`, '_blank');
    }

    el.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = async () => {
            const itemId = btn.dataset.item;
            const price = parseFloat(btn.dataset.price);
            pixHush(`Achat [${itemId}] — redirection vers PixSoftPay...`, 'info');
            window.open(`${PROD_API}/pixsoftpay/create/`, '_blank');
        };
    });

    fetchWallet();
}

// ─── WebSocket Manager ──────────────────────────────────────────────────────
let _messenger = null;
function connectWS(onReady) {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${location.host}`);

    ws.onopen = () => {
        console.log('[PixHub] WS connected');
        const dot = document.getElementById('conn-dot');
        if (dot) dot.classList.add('connected');
        if (_token) ws.send(JSON.stringify({ action: 'auth', token: _token }));
        if (onReady) onReady(ws);
    };

    ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.action === 'ws_api_response' && msg.id && _wsApiCallbacks[msg.id]) {
            _wsApiCallbacks[msg.id].resolve(msg);
            delete _wsApiCallbacks[msg.id];
            return;
        }
        if (msg.action === 'auth_ok') pixHush(`Connecte: ${msg.username}`, 'success');
        if (msg.action === 'chat_history' && _messenger) _messenger.handleChatHistory(msg);
        if (msg.action === 'receive_chat_message' && _messenger) _messenger.handleChatMessage(msg);
        if (msg.action === 'rooms_list') updateRoomBadges(msg.rooms);
    };

    ws.onclose = () => {
        const dot = document.getElementById('conn-dot');
        if (dot) dot.classList.remove('connected');
        setTimeout(() => connectWS(onReady), 3000);
    };

    ws.onerror = () => {};
    _ws = ws;
    _messenger = initMessenger(ws);
}

function updateRoomBadges(roomsList) {
    const total = roomsList.reduce((s, r) => s + r.players, 0);
    const activeRooms = roomsList.filter(r => r.players > 0).length;
    const elP = document.getElementById('stat-players');
    const elR = document.getElementById('stat-rooms');
    if (elP) elP.textContent = total;
    if (elR) elR.textContent = activeRooms;
}

// ─── Global Init ────────────────────────────────────────────────────────────
function init() {
    connectWS(() => {
        if (!_token || !_username) {
            showAuthUI(() => {});
        }
    });

    setInterval(() => {
        if (_ws && _ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({ action: 'get_rooms' }));
        }
    }, 4000);
}

// Export to global
window.PixHub = { showLeaderboard, showMarket, showAuthUI, connectWS, pixHush };
window.showLeaderboard = showLeaderboard;
window.showMarket = showMarket;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
