/* Client générique de jeu de stratégie — 100% piloté par la config reçue du serveur.
   Point d'entrée : coordonne les modules (state, blueprint, motion) et expose sur
   window les fonctions appelées par les attributs onclick du HTML. */

import { $, fmt, GID, ST, empInfo, ownerColor, empireOf, terrainProfile, unitsOf, tDef } from './modules/state.js?v=2';
import { bpRun } from './modules/blueprint.js?v=2';
import { renderOptions, buildGlobeMarkers, refreshGlobeColors, toggle3D, playBattleFx } from './modules/motion.js?v=7';
import { t as tr, tErr, tBot, applyLang, setLang } from './modules/i18n.js?v=4';

/* ─── Chargement initial : on récupère la config (empires) pour l'écran de login ─── */
async function init() {
  applyLang();
  $('login-title').textContent = tr('login.loading');
  try {
    const r = await fetch(`/api/studio/config/${encodeURIComponent(GID)}`);
    if (!r.ok) throw new Error(tr('err.configNotFound'));
    ST.config = await r.json();
    ST.blueprintCfg = ST.config.blueprint || null;
    ST.renderCfg = ST.config.render || null;
    $('login-title').textContent = (ST.config.icon || '') + ' ' + (ST.config.name || GID);
    document.title = ST.config.name || GID;
    renderEmpireButtons();
    $('login-status').textContent = tr('login.ready');
    ST.connected = true;
  } catch (e) {
    $('login-err').textContent = tr('login.loadFailed');
    $('login-status').textContent = String(e);
  }
  const auto = new URLSearchParams(location.search).get('auto');
  if (auto) {
    $('user-input').value = tr('login.player') + '-' + auto;
    const wrap = $('empire-buttons');
    const pick = wrap.querySelectorAll('.empire-btn')[auto === 'A' ? 0 : 1];
    if (pick) {
      wrap.querySelectorAll('.empire-btn').forEach(x => x.classList.remove('selected'));
      pick.classList.add('selected');
    }
    setTimeout(doJoin, 400);
  }
}

function renderEmpireButtons() {
  const wrap = $('empire-buttons');
  wrap.innerHTML = '';
  const ids = Object.keys(ST.config.empires || {});
  ids.forEach((eid, i) => {
    const info = ST.config.empires[eid];
    const b = document.createElement('button');
    b.className = 'empire-btn' + (i === 0 ? ' selected' : '');
    b.style.setProperty('--ec', info.color || '#888');
    b.textContent = (info.icon || '') + ' ' + info.name;
    b.dataset.eid = eid;
    b.onclick = () => {
      wrap.querySelectorAll('.empire-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    };
    wrap.appendChild(b);
  });
}

function doJoin() {
  const name = ($('user-input').value || '').trim();
  if (!name) { $('login-err').textContent = tr('login.enterName'); return; }
  const sel = $('empire-buttons').querySelector('.empire-btn.selected');
  const empire = sel ? sel.dataset.eid : Object.keys(ST.config.empires || {})[0];
  const btn = document.querySelector('.btn-row button');
  btn.disabled = true;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ST.ws = new WebSocket(`${proto}://${location.host}/games/strat/ws`);
  ST.ws.onopen = () => ST.ws.send(JSON.stringify({ action: 'join', name, empire, game: GID }));
  ST.ws.onmessage = e => onMsg(JSON.parse(e.data));
  ST.ws.onclose = () => { if ($('game-ui').style.display !== 'none') toast(tr('err.connLost'), 'error'); };
  ST.ws.onerror = () => { btn.disabled = false; $('login-err').textContent = tr('err.connError'); };
}

/* ─── Réception des messages ─── */
function onMsg(m) {
  if (m.action === 'state') {
    ST.state = m.state;
    ST.config = ST.state.config;
    ST.myPid = ST.state.you;
    ST.myEmpire = ST.state.your_empire;
    if (ST.state.config && ST.state.config.blueprint) ST.blueprintCfg = ST.state.config.blueprint;
    if ($('login-screen').style.display !== 'none') {
      $('login-screen').style.display = 'none';
      $('game-ui').style.display = 'flex';
    }
    render();
    bpRun('onState', null);
    if (ST.state.your_turn) {
      if (ST.bpTurnFired !== ST.state.turn) { ST.bpTurnFired = ST.state.turn; bpRun('onTurn', null); }
    } else {
      ST.bpTurnFired = 0;
    }
  } else if (m.action === 'error') {
    toast(tErr(m.error), 'error');
  } else if (m.action === 'battle') {
    const b = m.battle;
    playBattleFx(b.fromTid, b.toTid, b.attackerWins);
    banner(b.attackerWins ? '⚔️ ' + b.territory + ' ' + tr('battle.conquered') : '🛡️ ' + tr('battle.defended') + ' ' + b.territory, b.attackerWins ? 'victory' : 'defeat');
    toast(tr('battle.result', { result: b.attackerWins ? tr('battle.won') : tr('battle.lost'), losses: fmt(b.attackerWins ? b.atkLosses : b.defLosses) }), b.attackerWins ? 'win' : 'lose');
    bpRun('onBattle', { ...b, won: (b.attackerWins ? b.attacker === ST.myEmpire : b.attacker !== ST.myEmpire) });
  } else if (m.action === 'move') {
    const mv = m.move;
    toast(tr('move.sent', { n: fmt(mv.amount) }), 'info');
  } else if (m.action === 'war') {
    const w = m.war;
    banner(tr('war.banner', { a: w.declared, b: w.target }), 'war');
  } else if (m.action === 'bot') {
    toast(`🤖 ${m.bot.icon || ''} ${m.bot.empire} : ${tBot(m.bot.msg)}`, 'info');
  } else if (m.action === 'game_over') {
    toast(m.winner ? tr('gameOver.win', { winner: m.winner }) : tr('gameOver.over'), 'win');
  }
}

function send(cmd, data) {
  if (!ST.ws || ST.ws.readyState !== 1) return;
  ST.ws.send(JSON.stringify({ action: 'cmd', cmd, data: { tid: ST.selected, ...(data || {}) } }));
}

/* ─── Rendu global ─── */
function render() {
  const p = ST.state.players[ST.myPid];
  $('hud-empire').textContent = (empInfo(ST.myEmpire)?.icon || '') + ' ' + (empInfo(ST.myEmpire)?.name || '');
  $('hud-turn').textContent = tr('hud.turn', { n: ST.state.turn });
  $('hud-gold').textContent = '💰' + fmt(p?.gold || 0);
  $('hud-food').textContent = '🌾' + fmt(p?.food || 0);
  $('hud-wood').textContent = '🪵' + fmt(p?.wood || 0);
  $('hud-stone').textContent = '⛰' + fmt(p?.stone || 0);
  $('hud-army').textContent = '⚔️' + fmt(ST.state.empires[ST.myEmpire]?.army || 0);
  $('hud-pop').textContent = '👥' + fmt(ST.state.empires[ST.myEmpire]?.pop || 0);
  $('hud-terr').textContent = '🏘' + Object.values(ST.state.territories).filter(t => t.owner && t.owner !== ST.myPid && empireOf(t) === ST.myEmpire).length;
  const others = Object.values(ST.state.players).filter(x => x._pid !== ST.myPid);
  $('hud-players').textContent = others.length ? '👥 ' + others.map(x => x.name + (x.ready ? ' ✓' : '')).join(', ') : '';
  const btn = $('end-turn-btn');
  btn.disabled = !ST.state.your_turn || (p && p.ready);
  btn.textContent = (p && p.ready) ? tr('turn.ready') : tr('turn.end');
  renderMap();
  renderLegend();
  renderWarLog();
  if (ST.selected && ST.state.territories[ST.selected]) renderTerrBar();
  else $('terr-bar').style.display = 'none';
  if (!ST.view3d && !ST.threeCtx && renderOptions().mode === 'globe') toggle3D();
}

/* ─── Carte du monde (canvas 2D, projection équirectangulaire) ─── */
function renderMap() {
  if (ST.view3d) {
    if (ST.threeCtx) { buildGlobeMarkers(); refreshGlobeColors(); }
    return;
  }
  const cv = $('map-canvas');
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const ts = Object.values(ST.state.territories);
  if (!ts.length) return;
  const lons = ts.map(t => t.lon), lats = ts.map(t => t.lat);
  let minLon = Math.min(...lons), maxLon = Math.max(...lons);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  if (maxLon - minLon < 1) { minLon -= 0.5; maxLon += 0.5; }
  if (maxLat - minLat < 1) { minLat -= 0.5; maxLat += 0.5; }
  const pad = 60, ratioX = (W - 2 * pad) / (maxLon - minLon), ratioY = (H - 2 * pad) / (maxLat - minLat);
  const sc = Math.min(ratioX, ratioY);
  const offX = (W - (maxLon - minLon) * sc) / 2, offY = (H - (maxLat - minLat) * sc) / 2;
  ST.mapPx = {};
  for (const t of ts) {
    ST.mapPx[t.id] = {
      x: offX + (t.lon - minLon) * sc,
      y: offY + (maxLat - t.lat) * sc,
    };
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(offX + i * (maxLon - minLon) * sc / 4, pad); ctx.lineTo(offX + i * (maxLon - minLon) * sc / 4, H - pad); ctx.stroke(); }
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(pad, offY + i * (maxLat - minLat) * sc / 4); ctx.lineTo(W - pad, offY + i * (maxLat - minLat) * sc / 4); ctx.stroke(); }

  const links = new Set();
  for (const t of ts) (t.adj || []).forEach(a => links.add(t.id < a ? `${t.id}-${a}` : `${a}-${t.id}`));
  ctx.lineWidth = 2;
  for (const lk of links) {
    const [a, b] = lk.split('-').map(Number);
    if (!ST.mapPx[a] || !ST.mapPx[b]) continue;
    const ta = ST.state.territories[a], tb = ST.state.territories[b];
    const same = ta.owner && tb.owner && empireOf(ta) === empireOf(tb);
    ctx.strokeStyle = same ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(ST.mapPx[a].x, ST.mapPx[a].y); ctx.lineTo(ST.mapPx[b].x, ST.mapPx[b].y); ctx.stroke();
  }

  for (const t of ts) {
    const { x, y } = ST.mapPx[t.id];
    const r = Math.max(5, Math.min(11, sc * 0.018));
    const isSel = ST.selected === t.id;
    const isPick = ST.pickMode && ST.pendingAttack && ST.pendingAttack.to === t.id;
    ctx.beginPath();
    ctx.arc(x, y, r + (isSel ? 4 : 0) + (isPick ? 6 : 0), 0, Math.PI * 2);
    ctx.fillStyle = ownerColor(t);
    ctx.fill();
    ctx.lineWidth = isSel ? 3 : 1;
    ctx.strokeStyle = isPick ? '#ff5a3a' : (isSel ? '#fff' : 'rgba(0,0,0,0.5)');
    ctx.stroke();
    if (t.cap) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd54a';
      ctx.fill();
    }
    ctx.font = '10px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    const lab = t.owner && empireOf(t) === ST.myEmpire ? `${t.name} ${fmt(t.army || 0)}` : t.name;
    ctx.fillText(lab, x, y - r - 4);
  }
}

$('map-canvas').addEventListener('click', e => {
  const cv = $('map-canvas');
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  let best = null, bestD = Infinity;
  for (const [tid, pt] of Object.entries(ST.mapPx)) {
    const d = (pt.x - mx) ** 2 + (pt.y - my) ** 2;
    if (d < bestD) { bestD = d; best = tid; }
  }
  if (best && bestD < 5000) {
    if (ST.pickMode === 'attack') { setAttackTarget(Number(best)); return; }
    if (ST.pickMode === 'move') { doMoveTo(Number(best)); return; }
    selectTerr(Number(best));
  }
});
window.addEventListener('resize', () => renderMap());

/* ─── Sélection d'un territoire ─── */
function selectTerr(tid) {
  ST.selected = tid;
  ST.pendingAttack = null;
  ST.pickMode = null;
  renderMap();
  renderTerrBar();
}

function renderTerrBar() {
  const bar = $('terr-bar');
  const t = ST.state.territories[ST.selected];
  if (!t) { bar.style.display = 'none'; return; }
  const mine = t.owner === ST.myPid;
  const allied = t.owner && empireOf(t) === ST.myEmpire;
  const unitMix = Object.entries(unitsOf(t)).map(([u, n]) => `${ST.config.units[u].icon || '▪'}${n}`).join(' ') || '—';

  let html = '';
  html += `<span class="terr-bar-info">${t.cap ? '🏰' : '🏘'} ${t.name}</span>`;
  html += `<span class="terr-bar-hint">👥${fmt(t.pop || 0)} ⚔️${fmt(t.army || 0)} ${unitMix} ${t.fort ? '🧱' + t.fort : ''}${t.fort_hill ? '🏔' : ''}</span>`;

  if (mine) {
    html += `<input class="tb-amount" id="recruit-amt" type="number" min="10" step="10" value="50" title="${tr('terr.recruitTitle')}">`;
    html += `<button class="tb-btn" onclick="doRecruit()">${tr('terr.recruit')}</button>`;
    html += `<button class="tb-btn tb-conv" onclick="toggleConvert()">${tr('terr.convert')}</button>`;
    html += `<button class="tb-btn" onclick="openCity()">${tr('terr.openCity')}</button>`;
    html += `<button class="tb-btn tb-attack" onclick="toggleAttack()">${tr('terr.attack')}</button>`;
    html += `<button class="tb-btn" onclick="toggleMove()">${tr('terr.move')}</button>`;
    html += `<button class="tb-close" onclick="closeBar()">✕</button>`;
  } else {
    html += `<button class="tb-btn tb-attack" onclick="selectTerrAttack(${ST.selected})">${tr('terr.attack')}</button>`;
    html += `<button class="tb-close" onclick="closeBar()">✕</button>`;
  }
  bar.innerHTML = html;
  bar.style.display = 'flex';

  if (mine) {
    if (ST.pickMode === 'convert') renderConvert();
    if (ST.pickMode === 'attack') renderAttack();
    if (ST.pickMode === 'move') renderMove();
  }
}

function closeBar() { ST.selected = null; ST.pendingAttack = null; ST.pickMode = null; renderMap(); $('terr-bar').style.display = 'none'; }
function toggleConvert() { ST.pickMode = ST.pickMode === 'convert' ? null : 'convert'; ST.pendingAttack = null; renderTerrBar(); }
function toggleAttack() { ST.pickMode = ST.pickMode === 'attack' ? null : 'attack'; ST.pendingAttack = null; renderTerrBar(); }
function toggleMove() { ST.pickMode = ST.pickMode === 'move' ? null : 'move'; ST.pendingAttack = null; renderTerrBar(); }

function doRecruit() {
  const amt = parseInt($('recruit-amt')?.value || '50', 10);
  send('recruit', { amount: Math.max(10, amt) });
}

/* ─── Conversion des unités ─── */
function renderConvert() {
  const t = ST.state.territories[ST.selected];
  let html = `<span class="terr-bar-hint">${tr('terr.convertTitle')}</span>`;
  for (const [uid, u] of Object.entries(ST.config.units)) {
    if (uid === 'soldier') continue;
    html += `<input class="tb-amount" id="cv-${uid}" type="number" min="1" value="1" title="${tr('terr.convertCost', { n: u.cost })}">`;
    html += `<button class="tb-btn tb-conv" onclick="doConvert('${uid}')">${u.icon || '▪'} ${u.name} (${u.cost}⚔️)</button>`;
  }
  html += `<button class="tb-close" onclick="closeBar()">✕</button>`;
  $('terr-bar').innerHTML += `<span class="tb-sep"></span>${html}`;
  $('terr-bar').style.display = 'flex';
}

function doConvert(uid) {
  const amt = parseInt($(`cv-${uid}`)?.value || '1', 10);
  send('convert', { unit: uid, amount: amt });
}

/* ─── Déplacement ─── */
function renderMove() {
  const t = ST.state.territories[ST.selected];
  const targets = Object.values(ST.state.territories)
    .filter(x => x.owner && empireOf(x) === ST.myEmpire && x.id !== ST.selected)
    .sort((a, b) => a.name.localeCompare(b.name));
  let html = `<span class="terr-bar-hint">${tr('terr.moveTo')}</span><select class="tb-dest" id="move-dest">`;
  for (const x of targets) html += `<option value="${x.id}">${x.name}</option>`;
  html += '</select>';
  html += `<input class="tb-amount" id="move-amt" type="number" min="10" value="50">`;
  html += `<button class="tb-btn" onclick="doMove()">➡️</button>`;
  html += `<button class="tb-close" onclick="closeBar()">✕</button>`;
  $('terr-bar').innerHTML += html;
  $('terr-bar').style.display = 'flex';
}
function doMoveTo(tid) { doMoveWith(tid); }
function doMove() {
  const dest = parseInt($('move-dest')?.value, 10);
  doMoveWith(dest);
}
function doMoveWith(tid) {
  const amt = parseInt($('move-amt')?.value || '50', 10);
  send('move', { to: tid, amount: Math.max(10, amt) });
  ST.pickMode = null;
}

/* ─── Attaque (avec aperçu du combat, même formule que le serveur) ─── */
function selectTerrAttack(tid) { ST.selected = tid; toggleAttack(); }
function setAttackTarget(tid) {
  ST.pendingAttack = { to: tid };
  renderMap();
  renderAttack();
}
function toggleAttackTarget(tid) {
  ST.pendingAttack = { to: tid };
  ST.pickMode = 'attack';
  renderMap();
  renderAttack();
}

function renderAttack() {
  const t = ST.state.territories[ST.selected];
  const targets = Object.values(ST.state.territories)
    .filter(x => !x.owner || empireOf(x) !== ST.myEmpire)
    .sort((a, b) => a.name.localeCompare(b.name));
  let html = `<span class="terr-bar-hint">${tr('terr.attackTitle')}</span>`;
  html += '<select class="tb-dest" id="atk-dest" onchange="toggleAttackTarget(+this.value)">';
  html += `<option value="">${tr('terr.chooseTarget')}</option>`;
  for (const x of targets) html += `<option value="${x.id}" ${ST.pendingAttack && ST.pendingAttack.to === x.id ? 'selected' : ''}>${x.name}</option>`;
  html += '</select>';
  html += '<span id="atk-units"></span>';
  html += '<span id="atk-preview"></span>';
  html += `<button class="tb-btn tb-attack" onclick="doAttack()">${tr('terr.launch')}</button>`;
  html += `<button class="tb-close" onclick="closeBar()">✕</button>`;
  $('terr-bar').innerHTML += html;
  $('terr-bar').style.display = 'flex';

  let uh = '';
  for (const [uid, u] of Object.entries(ST.config.units)) {
    const pool = uid === 'soldier' ? (t.army || 0) : (t.units?.[uid] || 0);
    if (!pool) continue;
    const def = uid === 'soldier' ? Math.floor(pool * 0.7) : pool;
    uh += `<span class="tb-mix">${u.icon || '▪'}<input class="tb-amount" id="atk-${uid}" type="number" min="0" max="${pool}" value="${def}" oninput="updatePreview()"></span>`;
  }
  $('atk-units').innerHTML = uh || `<span class="terr-bar-hint">${tr('terr.noUnits')}</span>`;
  updatePreview();
}

function updatePreview() {
  const el = $('atk-preview');
  if (!el) return;
  if (!ST.pendingAttack) { el.innerHTML = `<span class="terr-bar-hint">${tr('terr.chooseTargetFirst')}</span>`; return; }
  const t = ST.state.territories[ST.selected];
  const toT = ST.state.territories[ST.pendingAttack.to];
  const sent = {};
  for (const uid of Object.keys(ST.config.units)) {
    const pool = uid === 'soldier' ? (t.army || 0) : (t.units?.[uid] || 0);
    const v = Math.max(0, Math.min(pool, parseInt($(`atk-${uid}`)?.value || '0', 10)));
    if (v > 0) sent[uid] = v;
  }
  if (!Object.keys(sent).length) { el.innerHTML = `<span class="terr-bar-hint">${tr('terr.noUnitsSent')}</span>`; return; }
  const res = previewCombat(t, toT, sent);
  if (res.error) { el.innerHTML = `<span class="pct-low">⚠ ${tErr(res.error)}</span>`; return; }
  const mid = 1.0, lo = 0.8, hi = 1.2;
  const pct = Math.round(((res.atkPower * mid - res.defPower) / res.defPower) * 100);
  const cls = pct > 20 ? 'pct-high' : (pct > -10 ? 'pct-mid' : 'pct-low');
  const outcome = res.atkPower * lo > res.defPower ? tr('terr.previewWin') : (res.atkPower * hi > res.defPower ? tr('terr.previewFifty') : tr('terr.previewLose'));
  el.innerHTML = `<span class="terr-bar-hint">${tr('terr.previewPower', { atk: fmt(res.atkPower), def: fmt(res.defPower) })}</span> <span class="${cls}">(${pct > 0 ? '+' : ''}${pct}% — ${outcome})</span>`;
}

function previewCombat(t, toT, sent) {
  const cmb = ST.config.combat, atk = ST.config.attack;
  const units = ST.config.units;
  const prof = terrainProfile(toT);
  if (sent.navy && atk.navy_requires_beach !== false && !prof.beach) {
    return { error: 'Pas de plage pour débarquer (navires)' };
  }
  let defPower = tDef(toT) * (1 + ((toT.fort || 0) + (cmb.fort_hill_factor || 0.5) * (toT.fort_hill || 0)) * (cmb.fort_defense || 0.2)) * (1 + prof.defense);
  let atkPower = 0;
  for (const [u, n] of Object.entries(sent)) atkPower += n * units[u].a * atkTypeMult(u, toT, units, cmb, prof);
  const total = Object.values(sent).reduce((s, n) => s + n, 0);
  return { atkPower, defPower, total };
}

function atkTypeMult(utype, toT, units, cmb, prof) {
  const total = tDef(toT);
  let mult = 1.0;
  if (total > 0) {
    for (const dType of Object.keys(units)) {
      const dCount = dType === 'soldier' ? (toT.army || 0) : (toT.units?.[dType] || 0);
      if (dCount > 0) {
        let w = (dCount * units[dType].d) / total;
        if (utype === 'cavalry' && dType === 'soldier' && ST.config.attack.cavalry_open_terrain !== false) w *= prof.plain_ratio;
        mult += ((ST.config.counters[utype]?.[dType]) - 1) * w;
      }
    }
  }
  const fort = toT.fort || 0, fortHill = toT.fort_hill || 0;
  if (utype === 'elephant') mult += (cmb.elephant_bonus || 0.25) * (fort + fortHill);
  else mult *= Math.max(cmb.fort_min || 0.3, 1 - (cmb.fort_penalty || 0.1) * fort);
  return mult;
}

function doAttack() {
  if (!ST.pendingAttack) { toast(tr('terr.chooseTargetFirst'), 'error'); return; }
  const t = ST.state.territories[ST.selected];
  const units = {};
  for (const uid of Object.keys(ST.config.units)) {
    const pool = uid === 'soldier' ? (t.army || 0) : (t.units?.[uid] || 0);
    const v = Math.max(0, Math.min(pool, parseInt($(`atk-${uid}`)?.value || '0', 10)));
    if (v > 0) units[uid] = v;
  }
  if (!Object.keys(units).length) { toast(tr('terr.noUnitsSent'), 'error'); return; }
  send('attack', { to: ST.pendingAttack.to, units });
}

/* ─── Ville (grille générée) ─── */
function openCity() {
  ST.cityTid = ST.selected;
  $('city-view').style.display = 'flex';
  renderCity();
}
function closeCity() { ST.cityTid = null; $('city-view').style.display = 'none'; }

function renderCity() {
  const t = ST.state.territories[ST.cityTid];
  if (!t) { closeCity(); return; }
  $('city-title').textContent = (t.cap ? '🏰' : '🏘') + ' ' + t.name;
  $('city-stats').textContent = `👥${fmt(t.pop || 0)} ⚔️${fmt(t.army || 0)} 🧱${t.fort || 0}`;
  const gs = ST.config.grid_size || 8;
  const cv = $('city-canvas');
  const CELL = 46;
  cv.width = gs * CELL; cv.height = gs * CELL;
  const ctx = cv.getContext('2d');
  const grid = t.grid || [];
  for (let y = 0; y < gs; y++) for (let x = 0; x < gs; x++) {
    const cell = grid[y]?.[x];
    const ter = (cell && typeof cell === 'object') ? (cell.t || 'plain') : 'plain';
    const tcfg = ST.config.terrains[ter] || {};
    ctx.fillStyle = tcfg.color || '#7a8a5a';
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
    ctx.font = '20px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cell && typeof cell === 'object' && cell.b) {
      const b = ST.config.buildings[cell.b];
      ctx.fillText(b?.icon || '▪', x * CELL + CELL / 2, y * CELL + CELL / 2);
    } else {
      ctx.fillText(tcfg.icon || '·', x * CELL + CELL / 2, y * CELL + CELL / 2);
    }
  }
  cv.onclick = e => {
    const rect = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / gs));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / gs));
    if (ST.curBuild) buildAt(x, y);
  };

  const tools = $('city-tools');
  let th = '';
  for (const [bid, b] of Object.entries(ST.config.buildings)) {
    const cost = Object.entries(b.cost || {}).map(([r, n]) => `${r === 'gold' ? '💰' : r === 'food' ? '🌾' : r === 'wood' ? '🪵' : '⛰'}${n}`).join(' ');
    th += `<button id="bt-${bid}" class="${ST.curBuild === bid ? 'active' : ''}" onclick="setBuild('${bid}')">${b.icon || '▪'} ${b.name} (${cost})</button>`;
  }
  tools.innerHTML = th || '<span>—</span>';
}

function setBuild(bid) { ST.curBuild = ST.curBuild === bid ? null : bid; renderCity(); }
function buildAt(gx, gy) {
  if (!ST.curBuild) return;
  send('build', { building: ST.curBuild, gx, gy });
  ST.curBuild = null;
}

/* ─── Panneaux latéraux ─── */
function toggleLegend() { const el = $('empire-legend'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function toggleWarLog() { const el = $('war-log'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }

function renderLegend() {
  const el = $('empire-legend');
  let html = `<h4>${tr('legend.title')}</h4>`;
  for (const [eid, e] of Object.entries(ST.state.empires)) {
    const isMe = eid === ST.myEmpire;
    html += `<div class="legend-row ${isMe ? 'you' : ''}"><span class="swatch" style="background:${e.color}"></span><span class="ename">${e.icon} ${e.name}</span><span class="yours">${fmt(e.army)}⚔️ ${fmt(e.pop)}👥</span><span class="ewar">${e.wars.length ? '⚔️' : ''}</span></div>`;
  }
  el.innerHTML = html;
}

function renderWarLog() {
  const el = $('war-log');
  let html = `<h4>${tr('warLog.title')}</h4>`;
  const wars = [];
  for (const [eid, e] of Object.entries(ST.state.empires)) {
    for (const t of e.wars || []) {
      if (eid < t) wars.push([eid, t]);
    }
  }
  if (!wars.length) html += `<div class="war-entry"><span class="war-win">☮ ${tr('warLog.none')}</span></div>`;
  for (const [a, b] of wars) {
    const me = a === ST.myEmpire || b === ST.myEmpire;
    html += `<div class="war-entry">⚔️ <span class="war-att">${empInfo(a)?.icon} ${empInfo(a)?.name}</span> vs <span class="war-def">${empInfo(b)?.icon} ${empInfo(b)?.name}</span>${me ? ` <span class="war-win">(${tr('warLog.you')})</span>` : ''}</div>`;
  }
  el.innerHTML = html;
}

/* ─── Tour ─── */
function endTurn() {
  const btn = $('end-turn-btn');
  if (btn.disabled) return;
  bpRun('onTurnEnd', null);
  send('ready', {});
  btn.disabled = true;
  btn.textContent = tr('turn.ready');
}

/* ─── Toasts & bannière ─── */
function toast(text, type) {
  const box = $('toast-box');
  const d = document.createElement('div');
  d.className = 'toast ' + (type || 'info');
  d.textContent = text;
  box.appendChild(d);
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, 2600);
}

function banner(text, type) {
  const b = $('battle-banner');
  b.textContent = text;
  b.className = type;
  b.classList.add('show');
  clearTimeout(ST.bannerT);
  ST.bannerT = setTimeout(() => b.classList.remove('show'), 2800);
}

/* ─── Exports pour les modules (state, blueprint, motion) ─── */
export { send, toast, banner, selectTerr, renderMap };

window.__onLangChange = () => {
  if (ST.state && ST.myEmpire) render();
};

/* ─── Fonctions globales appelées par les onclick du HTML ─── */
Object.assign(window, {
  doJoin, endTurn, toggle3D, toggleLegend, toggleWarLog,
  closeBar, doAttack, doConvert, doMove, doRecruit,
  openCity, closeCity, selectTerrAttack, setBuild,
  toggleAttack, toggleConvert, toggleMove,
  toggleAttackTarget, updatePreview,
  setLang, tErr, tBot,
});

init();
