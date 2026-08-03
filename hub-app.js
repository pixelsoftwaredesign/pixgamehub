/* PIXGAMEHUB — plateforme de jeux (style Steam)
   Boutique · Détail jeu · Bibliothèque · Communauté (chat+classements) · Studio */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const store = {
    token: localStorage.getItem('pix_token') || '',
    username: localStorage.getItem('pix_username') || '',
    ws: null, wsReady: false,
    catalog: [], library: new Set(),
    online: {}, rooms: [],
    chat: new Map(), chatRoom: 'global_hub',
    currentGame: '',
};

// ─── API ───────────────────────────────────────────────────────────
async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (store.token) headers['Authorization'] = 'Bearer ' + store.token;
    try {
        const res = await fetch(path, { ...opts, headers });
        return await res.json();
    } catch { return {}; }
}

// ─── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    $('#toast-root').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 320); }, 3800);
}

// ─── WebSocket ─────────────────────────────────────────────────────
function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    store.ws = new WebSocket(`${proto}//${location.host}`);
    store.ws.onopen = () => {
        store.wsReady = true;
        if (store.token) store.ws.send(JSON.stringify({ action: 'auth', token: store.token }));
        store.ws.send(JSON.stringify({ action: 'join_chat_room', room: 'global_hub' }));
        store.ws.send(JSON.stringify({ action: 'presence', game: store.currentGame }));
        setInterval(() => { if (store.wsReady) store.ws.send(JSON.stringify({ action: 'get_rooms' })); }, 5000);
    };
    store.ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.action === 'auth_ok') { store.username = m.username; localStorage.setItem('pix_username', m.username); }
        else if (m.action === 'chat_history') { store.chat.set(m.room, m.messages || []); if (m.room === store.chatRoom) renderChat(); }
        else if (m.action === 'receive_chat_message') {
            const arr = store.chat.get(m.room) || [];
            arr.push({ sender: m.sender, content: m.content, ts: m.ts });
            if (arr.length > 60) arr.splice(0, arr.length - 60);
            store.chat.set(m.room, arr);
            if (m.room === store.chatRoom) renderChat();
        }
        else if (m.action === 'rooms_list') {
            store.rooms = m.rooms || [];
            store.online = m.online || {};
            updateStats();
            if (location.hash.startsWith('#game/')) renderGameOnline();
            else if (location.hash === '#community') renderCommunityOnline();
        }
    };
    store.ws.onclose = () => { store.wsReady = false; setTimeout(connectWS, 3000); };
    store.ws.onerror = () => {};
}

function wsSend(obj) { if (store.wsReady) store.ws.send(JSON.stringify(obj)); }

function updateStats() {
    const onlineTotal = Object.values(store.online).reduce((a, b) => a + b, 0) +
        store.rooms.reduce((a, r) => a + r.players, 0);
    const activeRooms = store.rooms.filter(r => r.players > 0).length;
    const elO = $('#stat-online'), elR = $('#stat-rooms');
    if (elO) elO.textContent = onlineTotal;
    if (elR) elR.textContent = activeRooms;
}

function setPresence(game) {
    store.currentGame = game || '';
    wsSend({ action: 'presence', game: store.currentGame });
}

// ─── Auth ──────────────────────────────────────────────────────────
function openAuth() {
    if ($('#auth-modal')) return;
    const root = $('#modal-root');
    const el = document.createElement('div');
    el.className = 'modal-backdrop'; el.id = 'auth-modal';
    el.innerHTML = `
        <div class="auth-box">
            <h2>PIXGAMEHUB</h2>
            <div class="auth-sub">Connecte-toi pour ta bibliothèque, tes succès et le chat</div>
            <form id="auth-form">
                <div class="field"><label>Nom d'utilisateur</label><input id="auth-username" type="text" minlength="3" required /></div>
                <div class="field"><label>Mot de passe</label><input id="auth-password" type="password" minlength="4" required /></div>
                <button class="btn btn-primary" style="width:100%;justify-content:center" id="auth-submit" type="submit">CONNEXION</button>
                <div class="auth-error" id="auth-error"></div>
            </form>
            <div class="auth-toggle" id="auth-toggle">Pas de compte ? S'inscrire</div>
        </div>`;
    root.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });

    let isRegister = false;
    const btn = $('#auth-submit'), toggle = $('#auth-toggle'), err = $('#auth-error');
    toggle.onclick = () => {
        isRegister = !isRegister;
        btn.textContent = isRegister ? "S'INSCRIRE" : 'CONNEXION';
        toggle.textContent = isRegister ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire";
    };
    $('#auth-form').onsubmit = async (e) => {
        e.preventDefault();
        const username = $('#auth-username').value.trim();
        const password = $('#auth-password').value;
        err.textContent = '';
        const path = isRegister ? '/api/register' : '/api/login';
        const res = await api(path, { method: 'POST', body: JSON.stringify({ username, password }) });
        if (!res.ok) { err.textContent = res.error || 'Erreur'; return; }
        if (isRegister) {
            isRegister = false;
            btn.textContent = 'CONNEXION';
            toggle.textContent = "Pas de compte ? S'inscrire";
            err.textContent = 'Compte créé ! Connecte-toi maintenant.';
            err.style.color = 'var(--green)';
            return;
        }
        store.token = res.token; store.username = res.username;
        localStorage.setItem('pix_token', res.token);
        localStorage.setItem('pix_username', res.username);
        el.remove();
        toast(`Bienvenue, ${res.username} !`, 'success');
        wsSend({ action: 'auth', token: res.token });
        renderUserZone();
        await refreshLibrary();
        route();
    };
}

function renderUserZone() {
    const zone = $('#user-zone');
    if (!zone) return;
    if (store.token && store.username) {
        const initials = store.username.slice(0, 2).toUpperCase();
        zone.innerHTML = `
            <div class="avatar" title="${esc(store.username)}">${esc(initials)}</div>
            <span class="username">${esc(store.username)}</span>
            <button class="btn btn-ghost btn-sm" id="btn-logout">Quitter</button>`;
        $('#btn-logout').onclick = async () => {
            await api('/api/logout', { method: 'POST', body: JSON.stringify({ token: store.token }) });
            store.token = ''; store.username = '';
            localStorage.removeItem('pix_token'); localStorage.removeItem('pix_username');
            store.library.clear();
            toast('Déconnecté.', 'info');
            renderUserZone(); route();
        };
    } else {
        zone.innerHTML = `<button class="btn btn-primary btn-sm" id="btn-login">SE CONNECTER</button>`;
        $('#btn-login').onclick = () => openAuth();
    }
}

// ─── Routing ───────────────────────────────────────────────────────
function route() {
    const h = location.hash || '#store';
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === h.slice(1).split('/')[0]));
    const view = $('#view');
    setPresence(h.startsWith('#game/') ? h.slice(6).split('?')[0] : '');
    if (h.startsWith('#game/')) { renderGame(decodeURIComponent(h.slice(6))); return; }
    switch (h) {
        case '#library': renderLibrary(); break;
        case '#community': renderCommunity(); break;
        case '#studio': renderStudio(); break;
        default: renderStore(); if (h !== '#store') location.replace('#store');
    }
    window.scrollTo(0, 0);
}

// ─── Cards ─────────────────────────────────────────────────────────
function gameCard(g) {
    const owned = store.library.has(g.id);
    const online = store.online[g.id] || 0;
    return `
    <div class="game-card" data-gid="${esc(g.id)}">
        <div class="game-preview">
            <canvas class="preview-canvas" data-game="${esc(g.id)}"></canvas>
            <div class="game-icon">${esc(g.icon || '🎮')}</div>
        </div>
        <div class="game-info">
            <span class="game-genre">${esc(g.genre || 'Jeu')}${g.studio ? ' · Studio' : ''}</span>
            <h3>${esc(g.name)}</h3>
            <div class="game-tags">${(g.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="game-footer">
            <span class="game-online">${online > 0 ? `<b>${online}</b> en jeu` : 'En ligne'}</span>
            <button class="btn ${owned ? 'btn-ghost' : 'btn-primary'} btn-sm btn-play">${owned ? 'JOUER' : 'JOUER'}</button>
        </div>
    </div>`;
}

function bindCard(root, g) {
    const card = root.querySelector(`[data-gid="${CSS.escape(g.id)}"]`);
    if (!card) return;
    card.onclick = e => { if (!e.target.closest('button')) location.hash = '#game/' + encodeURIComponent(g.id); };
    const play = card.querySelector('.btn-play');
    if (play) play.onclick = e => { e.stopPropagation(); playGame(g); };
}

function renderGrid(container, games, emptyMsg) {
    if (!games.length) {
        container.innerHTML = `<div class="empty-state"><div class="big-icon">🎮</div><h2>Aucun jeu</h2><p>${esc(emptyMsg || '')}</p></div>`;
        return;
    }
    container.innerHTML = games.map(gameCard).join('');
    games.forEach(g => bindCard(container, g));
    PixPreviews.mount(container);
}

async function playGame(g) {
    if (store.token && !store.library.has(g.id)) {
        const res = await api('/api/library/toggle', { method: 'POST', body: JSON.stringify({ token: store.token, game: g.id }) });
        if (res.added) { store.library.add(g.id); toast(`« ${g.name} » ajouté à votre bibliothèque.`, 'success'); }
        if (store.token && ACH_FIRST[g.id]) {
            await api('/api/achievements/unlock', { method: 'POST', body: JSON.stringify({ token: store.token, game: g.id, ach: 'first_play' }) });
        }
    }
    setPresence(g.id);
    location.href = g.url;
}

// succès auto-débloqués à la première partie
const ACH_FIRST = { strat: 1, carthage: 1 };

// ─── Store ─────────────────────────────────────────────────────────
function renderStore() {
    const view = $('#view');
    const featured = store.catalog.find(g => g.id === 'strat') || store.catalog[0];
    const others = store.catalog.filter(g => g.id !== (featured && featured.id));
    const query = ($('#search-input').value || '').trim().toLowerCase();

    let list = others;
    if (query) {
        list = list.filter(g =>
            (g.name || '').toLowerCase().includes(query) ||
            (g.genre || '').toLowerCase().includes(query) ||
            (g.tags || []).some(t => t.toLowerCase().includes(query)));
    }

    view.innerHTML = `
        <section class="hero">
            <div class="hero-preview"><canvas class="preview-canvas" data-game="${esc(featured.id)}" data-fixed></canvas></div>
            <div class="hero-body">
                <span class="hero-genre">${esc(featured.genre || 'Jeu')} · À la une</span>
                <h1 class="hero-title">${esc(featured.name)}</h1>
                <p class="hero-desc">${esc(featured.desc)}</p>
                <div class="hero-actions">
                    <button class="btn btn-gold btn-lg" id="hero-play">▶ JOUER</button>
                    <button class="btn btn-ghost" id="hero-detail">Voir la fiche</button>
                    <span class="hero-players" id="hero-online">${(store.online[featured.id] || 0)} en jeu</span>
                </div>
            </div>
        </section>
        <h2 class="section-title">${query ? `Résultats pour « ${esc(query)} »` : 'Tous les jeux'} <small>${list.length} jeux</small></h2>
        <div class="games-grid" id="store-grid"></div>`;

    $('#hero-play').onclick = () => playGame(featured);
    $('#hero-detail').onclick = () => location.hash = '#game/' + encodeURIComponent(featured.id);
    renderGrid($('#store-grid'), list, 'Aucun jeu ne correspond à ta recherche.');
    PixPreviews.mount($('.hero'));
}

function renderGameOnline() {
    const el = $('#detail-online');
    if (el) el.innerHTML = `${store.online[store.currentGame] || 0} en jeu`;
}

// ─── Game detail ───────────────────────────────────────────────────
async function renderGame(gid) {
    const view = $('#view');
    const g = store.catalog.find(x => x.id === gid);
    if (!g) { view.innerHTML = `<div class="empty-state"><h2>Jeu introuvable</h2></div>`; return; }
    const owned = store.library.has(g.id);

    view.innerHTML = `
        <a class="detail-back" href="#store">← Retour à la boutique</a>
        <section class="game-detail">
            <div class="detail-hero">
                <canvas class="preview-canvas" data-game="${esc(g.id)}" data-fixed></canvas>
                <div class="detail-body">
                    <span class="detail-genre">${esc(g.genre || 'Jeu')}${g.studio ? ' · Créé dans le Studio' : ''}</span>
                    <h1>${esc(g.icon || '')} ${esc(g.name)}</h1>
                    <p class="detail-desc">${esc(g.desc)}</p>
                    <div class="game-tags">${(g.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
                    <div class="detail-actions">
                        <button class="btn btn-gold btn-lg" id="detail-play">▶ JOUER</button>
                        <button class="btn ${owned ? 'btn-danger' : 'btn-ghost'}" id="detail-lib">${owned ? '− Retirer de la bibliothèque' : '+ Ajouter à la bibliothèque'}</button>
                        <span class="detail-players" id="detail-online">${store.online[g.id] || 0} en jeu</span>
                    </div>
                </div>
            </div>
            <div class="detail-stats">
                <div class="panel"><h4>🏆 Classement top 10</h4><ul class="lb-list" id="detail-lb"><li class="lb-empty">Chargement...</li></ul></div>
                <div class="panel"><h4>🎖️ Succès</h4><div class="ach-grid" id="detail-ach"><div class="lb-empty">Chargement...</div></div></div>
            </div>
        </section>`;

    PixPreviews.mount($('.detail-hero'));

    $('#detail-play').onclick = () => playGame(g);
    $('#detail-lib').onclick = async () => {
        if (!store.token) { toast('Connecte-toi pour gérer ta bibliothèque.', 'info'); openAuth(); return; }
        const res = await api('/api/library/toggle', { method: 'POST', body: JSON.stringify({ token: store.token, game: g.id }) });
        if (res.added) { store.library.add(g.id); toast('Ajouté à la bibliothèque.', 'success'); }
        else { store.library.delete(g.id); toast('Retiré de la bibliothèque.', 'info'); }
        renderGame(gid);
    };

    const lb = await api('/api/leaderboard/' + encodeURIComponent(gid));
    renderLeaderboard($('#detail-lb'), lb.leaderboard || []);

    const ach = await api('/api/achievements/' + encodeURIComponent(gid));
    renderAchievements($('#detail-ach'), ach.definitions || [], ach.unlocked || []);
}

function renderLeaderboard(el, entries) {
    if (!entries.length) { el.innerHTML = '<li class="lb-empty">Aucun score enregistré.</li>'; return; }
    el.innerHTML = entries.map((e, i) => `
        <li class="lb-item">
            <span class="lb-rank">#${i + 1}</span>
            <span class="lb-name">${esc(e.username)}</span>
            <span class="lb-score">${Number(e.score).toLocaleString('fr-FR')} PTS</span>
        </li>`).join('');
}

function renderAchievements(el, defs, unlocked) {
    const set = new Set(unlocked);
    if (!defs.length) { el.innerHTML = '<div class="lb-empty">Pas encore de succès pour ce jeu.</div>'; return; }
    el.innerHTML = defs.map(a => `
        <div class="ach-item ${set.has(a.id) ? 'earned' : ''}" title="${esc(a.desc)}">
            <div class="ach-icon">${set.has(a.id) ? esc(a.icon || '🏆') : '🔒'}</div>
            <div class="ach-name">${esc(a.name)}</div>
            <div class="ach-desc">${esc(a.desc)}</div>
        </div>`).join('');
}

// ─── Library ───────────────────────────────────────────────────────
async function renderLibrary() {
    const view = $('#view');
    if (!store.token) {
        view.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">📚</div>
                <h2>Ta bibliothèque est vide</h2>
                <p>Connecte-toi pour retrouver tes jeux et tes succès.</p>
                <button class="btn btn-primary btn-lg" id="lib-login">SE CONNECTER</button>
            </div>`;
        $('#lib-login').onclick = () => openAuth();
        return;
    }
    await refreshLibrary();
    const owned = store.catalog.filter(g => store.library.has(g.id));
    view.innerHTML = `
        <h2 class="section-title">📚 Ma bibliothèque <small>${owned.length} jeux</small></h2>
        <div class="games-grid" id="lib-grid"></div>`;
    renderGrid($('#lib-grid'), owned, 'Joue à un jeu pour l’ajouter ici.');
}

async function refreshLibrary() {
    if (!store.token) return;
    const res = await api('/api/library?token=' + encodeURIComponent(store.token));
    store.library = new Set((res.library || []).map(l => l.game));
}

// ─── Community ─────────────────────────────────────────────────────
function renderCommunity() {
    const view = $('#view');
    const rooms = ['global_hub', ...store.catalog.map(g => g.id)];
    view.innerHTML = `
        <div class="community">
            <div class="panel chat-box">
                <h4>💬 Salon de discussion <span class="game-online" id="chat-room-label" style="float:right">${esc(store.chatRoom)}</span></h4>
                <div class="chat-rooms" id="chat-rooms"></div>
                <div class="chat-messages" id="chat-messages"></div>
                <form class="chat-input-area" id="chat-form">
                    <input type="text" id="chat-input" placeholder="Message..." autocomplete="off" ${store.token ? '' : 'disabled'} />
                    <button class="btn btn-primary" type="submit" ${store.token ? '' : 'disabled'}>ENVOYER</button>
                </form>
            </div>
            <div>
                <div class="panel" style="margin-bottom:18px">
                    <h4>🟢 Salles actives</h4>
                    <div class="presence-list" id="room-list"><div class="lb-empty">Chargement...</div></div>
                </div>
                <div class="panel">
                    <h4>📡 Présence par jeu</h4>
                    <div class="presence-list" id="presence-list"><div class="lb-empty">Chargement...</div></div>
                </div>
            </div>
        </div>`;

    renderChatRooms(rooms);
    renderChat();
    renderCommunityOnline();

    $('#chat-form').onsubmit = (e) => {
        e.preventDefault();
        const input = $('#chat-input');
        if (store.token && input.value.trim()) {
            wsSend({ action: 'send_chat_message', room: store.chatRoom, content: input.value.trim() });
            input.value = '';
        } else if (!store.token) {
            toast('Connecte-toi pour parler dans le chat.', 'info');
            openAuth();
        }
    };
    if (!store.token) {
        $('#chat-form').addEventListener('click', () => { if (!store.token) openAuth(); });
    }
}

function renderChatRooms(rooms) {
    const el = $('#chat-rooms');
    if (!el) return;
    el.innerHTML = rooms.map(r => `
        <button class="chat-room-btn ${r === store.chatRoom ? 'active' : ''}" data-room="${esc(r)}">${r === 'global_hub' ? '🌐 GLOBAL' : esc(r)}</button>`).join('');
    $$('.chat-room-btn', el).forEach(b => b.onclick = () => {
        store.chatRoom = b.dataset.room;
        wsSend({ action: 'join_chat_room', room: store.chatRoom });
        renderChatRooms(rooms);
        renderChat();
    });
}

function renderChat() {
    const el = $('#chat-messages');
    const label = $('#chat-room-label');
    if (!el) return;
    if (label) label.textContent = store.chatRoom;
    const msgs = store.chat.get(store.chatRoom) || [];
    if (!msgs.length) { el.innerHTML = '<div class="lb-empty">Aucun message. Sois le premier !</div>'; return; }
    el.innerHTML = msgs.map(m => {
        const t = m.ts ? new Date(m.ts * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="chat-msg"><span class="cm-time">${t}</span><div class="cm-sender">${esc(m.sender)}</div><div class="cm-text">${esc(m.content)}</div></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function renderCommunityOnline() {
    const roomEl = $('#room-list');
    const presEl = $('#presence-list');
    if (!roomEl || !presEl) return;
    const active = store.rooms.filter(r => r.players > 0);
    roomEl.innerHTML = active.length
        ? active.map(r => `<div class="presence-row"><span class="pr-name">${esc(r.name || r.id)} <span style="color:var(--muted)">(${esc(r.phase)})</span></span><span class="pr-online"><b>${r.players}</b> joueur${r.players > 1 ? 's' : ''}</span></div>`).join('')
        : '<div class="lb-empty">Aucune partie en cours.</div>';
    const sorted = Object.entries(store.online).sort((a, b) => b[1] - a[1]);
    presEl.innerHTML = sorted.map(([gid, n]) => {
        const g = store.catalog.find(x => x.id === gid);
        return `<div class="presence-row"><span class="pr-name">${esc(g ? g.icon + ' ' + g.name : gid)}</span><span class="pr-online"><b>${n}</b> en ligne</span></div>`;
    }).join('');
}

// ─── Studio ────────────────────────────────────────────────────────
function renderStudio() {
    const view = $('#view');
    const created = store.catalog.filter(g => g.studio);
    view.innerHTML = `
        <section class="studio-hero">
            <div class="sh-icon">🎛️</div>
            <div>
                <h1>Studio de jeux</h1>
                <p>Crée ton propre jeu de stratégie sans coder : unités, contres, terrains, bâtiments, économie et combat. Puis joue-le dans la boutique et la bibliothèque.</p>
            </div>
            <div class="sh-actions">
                <a class="btn btn-gold btn-lg" href="games/studio/index.html">＋ CRÉER UN JEU</a>
            </div>
        </section>
        <h2 class="section-title">🎮 Jeux créés dans le Studio <small>${created.length}</small></h2>
        <div class="games-grid" id="studio-grid"></div>`;
    renderGrid($('#studio-grid'), created, 'Aucun jeu créé. Lance le Studio pour en créer un !');
}

// ─── Init ──────────────────────────────────────────────────────────
function particles() {
    const bg = $('#particles-bg');
    for (let i = 0; i < 26; i++) {
        const d = document.createElement('div');
        d.className = 'dot';
        d.style.cssText = `width:${2 + Math.random() * 3}px;height:${2 + Math.random() * 3}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-duration:${6 + Math.random() * 10}s;animation-delay:${Math.random() * 6}s;`;
        bg.appendChild(d);
    }
}

async function init() {
    particles();
    renderUserZone();
    connectWS();
    const res = await api('/api/catalog');
    store.catalog = res.games || [];
    if (store.token) await refreshLibrary();
    window.addEventListener('hashchange', route);
    $('#search-input').addEventListener('input', () => {
        if ((location.hash || '#store') === '#store') renderStore();
    });
    route();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
