/* Module de conception de jeux — éditeurs visuels du Studio.
   Méta-données, carte/empires, unités, contres, terrains, bâtiments. */

import { $, ST, status, NEW_UNIT_ICONS, NEW_BUILDING_DEFS, MINI_EMPIRES } from './state.js';
import { renderJson } from './coding.js';

export function render() {
  if (!ST.cfg) return;
  renderMeta();
  renderMapPreset();
  renderEmpires();
  renderUnits();
  renderCounters();
  renderTerrains();
  renderBuildings();
  renderJson();
  const gid = (ST.cfg.id || ST.cfg.name || '').replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
  $('btn-play').href = gid ? `/games/creator/?gid=${gid}` : '#';
}

function setField(el) {
  const path = el.dataset.cfg;
  const parts = path.split('.');
  let o = ST.cfg;
  for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
  const key = parts[parts.length - 1];
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number' && val !== '') {
    val = String(val).includes('.') ? parseFloat(val) : parseInt(val, 10);
    if (isNaN(val)) val = 0;
  }
  if (el.type === 'text' && key === 'id') val = el.value.replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
  o[key] = val;
  renderJson();
  const gid = (ST.cfg.id || '').replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
  $('btn-play').href = gid ? `/games/creator/?gid=${gid}` : '#';
}

export function bindEvents() {
  document.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.cfg) setField(e.target);
    if (e.target.classList.contains('unit-in')) {
      const uid = e.target.dataset.uid, f = e.target.dataset.f;
      if (ST.cfg.units[uid]) {
        ST.cfg.units[uid][f] = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        if (f === 'id') { renameUnit(uid, e.target.value); }
      }
      ensureCounters(); renderUnits(); renderCounters(); renderJson();
    }
    if (e.target.classList.contains('cnt-in')) {
      const att = e.target.dataset.att, def = e.target.dataset.def;
      ST.cfg.counters[att][def] = parseFloat(e.target.value) || 0;
      renderJson();
    }
    if (e.target.classList.contains('ter-in')) {
      const tid = e.target.dataset.tid, f = e.target.dataset.f;
      if (ST.cfg.terrains[tid]) {
        ST.cfg.terrains[tid][f] = e.target.type === 'checkbox' ? e.target.checked : (e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value);
      }
      renderJson();
    }
    if (e.target.classList.contains('bld-in')) {
      const bid = e.target.dataset.bid, f = e.target.dataset.f;
      if (ST.cfg.buildings[bid]) {
        if (f.startsWith('cost.')) {
          const res = f.split('.')[1];
          ST.cfg.buildings[bid].cost[res] = parseFloat(e.target.value) || 0;
        } else {
          ST.cfg.buildings[bid][f] = e.target.type === 'checkbox' ? e.target.checked : (e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value);
        }
      }
      renderJson();
    }
    if (e.target.classList.contains('emp-in')) {
      const eid = e.target.dataset.eid, f = e.target.dataset.f;
      const info = ST.cfg.empires[eid];
      if (info) info[f] = e.target.type === 'color' ? e.target.value : e.target.value;
      renderJson();
    }
    if (e.target.id === 'map-preset') applyMapPreset(e.target.value);
  });
}

function renderMeta() {
  document.querySelectorAll('#sec-meta [data-cfg], #sec-render [data-cfg]').forEach(el => {
    const parts = el.dataset.cfg.split('.');
    let o = ST.cfg; let ok = true;
    for (const p of parts) { if (o == null || typeof o !== 'object') { ok = false; break; } o = o[p]; }
    if (!ok) o = undefined;
    if (el.type === 'checkbox') el.checked = !!o;
    else el.value = o == null ? '' : o;
  });
}

function renderMapPreset() {
  const n = (ST.cfg.territories || []).length;
  $('map-stats').textContent = `${n} territoires · ${Object.keys(allEmpires()).length} empires`;
}

function allEmpires() {
  return { ...(ST.cfg.disabledEmpires || {}), ...(ST.cfg.empires || {}) };
}

function applyMapPreset(mode) {
  if (mode === 'mini') {
    if (!confirm('La mini-carte va remplacer les territoires et empires actuels. Continuer ?')) { $('map-preset').value = 'monde'; return; }
    const m = makeMiniMap();
    ST.cfg.territories = m.territories;
    ST.cfg.empires = m.empires;
    ST.cfg.disabledEmpires = {};
    status('Mini-carte générée : 12 territoires, 4 empires.');
  } else {
    if (!ST.worldTemplate) return;
    ST.cfg.territories = JSON.parse(JSON.stringify(ST.worldTemplate.territories));
    ST.cfg.empires = JSON.parse(JSON.stringify(ST.worldTemplate.empires));
    ST.cfg.disabledEmpires = {};
    status('Retour au monde.');
  }
  render();
}

function makeMiniMap() {
  const W = 4, H = 3;
  const territories = [];
  const names = ['Avalon', 'Baronie', 'Cygne', 'Drake', 'Eder', 'Falcon', 'Garn', 'Havre', 'Iris', 'Jade', 'Kron', 'Lume'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = x + y * W;
    territories.push({ id, name: names[id] || 'T' + (id + 1), lon: -170 + x * 90, lat: 65 - y * 45, cap: false, home: null, adj: [] });
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = x + y * W;
    const t = territories[id];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) t.adj.push(nx + ny * W);
    }
  }
  const empires = {};
  const capOf = {};
  MINI_EMPIRES.forEach(e => { empires[e.id] = { name: e.name, color: e.color, icon: e.icon, capital: null }; capOf[e.id] = null; });
  territories.forEach((t, i) => {
    const eid = MINI_EMPIRES[i % MINI_EMPIRES.length].id;
    t.home = eid;
    if (capOf[eid] == null) { capOf[eid] = t.id; t.cap = true; empires[eid].capital = t.id; }
  });
  return { territories, empires };
}

function renderEmpires() {
  const body = $('empires-body');
  let html = '';
  for (const [eid, info] of Object.entries(allEmpires())) {
    const active = !!ST.cfg.empires[eid];
    const capName = (ST.cfg.territories || []).find(t => t.id === (info.capital || info.cap))?.name || info.capital;
    html += `<tr>
      <td><input type="checkbox" class="emp-act" data-eid="${eid}" ${active ? 'checked' : ''}></td>
      <td><span class="terr-name-cell">${info.icon || ''} ${info.name || eid}</span></td>
      <td><input class="emp-in" data-eid="${eid}" data-f="icon" type="text" value="${info.icon || ''}" style="width:56px"></td>
      <td><input class="emp-in" data-eid="${eid}" data-f="color" type="color" value="${info.color || '#888888'}"></td>
      <td>${capName == null ? '—' : capName}</td>
    </tr>`;
  }
  body.innerHTML = html;
  body.querySelectorAll('.emp-act').forEach(cb => cb.addEventListener('change', () => {
    const eid = cb.dataset.eid;
    const info = allEmpires()[eid];
    if (!info) return;
    if (cb.checked) { delete ST.cfg.disabledEmpires[eid]; ST.cfg.empires[eid] = info; }
    else { delete ST.cfg.empires[eid]; ST.cfg.disabledEmpires[eid] = info; }
    renderEmpires(); renderJson();
  }));
}

function renderUnits() {
  const body = $('units-body');
  let html = '';
  for (const [uid, u] of Object.entries(ST.cfg.units)) {
    html += `<tr>
      <td><input class="unit-in" data-uid="${uid}" data-f="id" type="text" value="${uid}" style="width:90px"></td>
      <td><input class="unit-in" data-uid="${uid}" data-f="name" type="text" value="${u.name || ''}"></td>
      <td><input class="unit-in" data-uid="${uid}" data-f="icon" type="text" value="${u.icon || '▪'}" style="width:48px"></td>
      <td><input class="unit-in" data-uid="${uid}" data-f="a" type="number" step="0.5" value="${u.a}"></td>
      <td><input class="unit-in" data-uid="${uid}" data-f="d" type="number" step="0.5" value="${u.d}"></td>
      <td><input class="unit-in" data-uid="${uid}" data-f="cost" type="number" value="${u.cost}"></td>
      <td>${uid === 'soldier' ? '' : `<button class="mini-btn danger" onclick="delUnit('${uid}')">✕</button>`}</td>
    </tr>`;
  }
  body.innerHTML = html;
}

export function addUnit() {
  let n = 1; while (ST.cfg.units['unit' + n]) n++;
  const id = 'unit' + n;
  const icon = NEW_UNIT_ICONS[n % NEW_UNIT_ICONS.length];
  ST.cfg.units[id] = { name: id, icon, a: 1.5, d: 1.5, cost: 1 };
  ensureCounters();
  renderUnits(); renderCounters(); renderJson();
  $('sec-units').scrollIntoView({ behavior: 'smooth' });
}

export function delUnit(uid) {
  if (uid === 'soldier') return;
  delete ST.cfg.units[uid];
  for (const row of Object.values(ST.cfg.counters)) delete row[uid];
  delete ST.cfg.counters[uid];
  ensureCounters();
  renderUnits(); renderCounters(); renderJson();
}

function renameUnit(oldId, newId) {
  if (!newId || newId === oldId) return;
  newId = newId.replace(/[^A-Za-z0-9_-]/g, '');
  if (!newId || ST.cfg.units[newId]) return;
  ST.cfg.units[newId] = ST.cfg.units[oldId];
  delete ST.cfg.units[oldId];
  ST.cfg.counters[newId] = ST.cfg.counters[oldId];
  delete ST.cfg.counters[oldId];
  for (const row of Object.values(ST.cfg.counters)) { row[newId] = row[oldId]; delete row[oldId]; }
}

function ensureCounters() {
  const ids = Object.keys(ST.cfg.units);
  ST.cfg.counters = ST.cfg.counters || {};
  for (const a of ids) { ST.cfg.counters[a] = ST.cfg.counters[a] || {}; for (const d of ids) if (ST.cfg.counters[a][d] == null) ST.cfg.counters[a][d] = 1.0; }
  for (const a of Object.keys(ST.cfg.counters)) if (!ST.cfg.units[a]) delete ST.cfg.counters[a];
}

function renderCounters() {
  ensureCounters();
  const ids = Object.keys(ST.cfg.units);
  let html = '<table class="counters-table"><tr><th>Att \ Def</th>';
  for (const d of ids) html += `<th>${ST.cfg.units[d].icon || d}</th>`;
  html += '</tr>';
  for (const a of ids) {
    html += `<tr><th>${ST.cfg.units[a].icon || a}</th>`;
    for (const d of ids) {
      const diag = a === d ? ' diag' : '';
      html += `<td><input class="cnt-in ${diag}" data-att="${a}" data-def="${d}" type="number" step="0.25" value="${ST.cfg.counters[a][d]}"></td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  $('counters-wrap').innerHTML = html;
}

function renderTerrains() {
  const body = $('terrains-body');
  let html = '';
  for (const [tid, t] of Object.entries(ST.cfg.terrains)) {
    const flags = ['buildable', 'open', 'beach', 'sea', 'fertile', 'forest'];
    html += `<tr>
      <td><span class="terr-name-cell">${tid}</span></td>
      <td><input class="ter-in" data-tid="${tid}" data-f="name" type="text" value="${t.name || tid}" style="width:90px"></td>
      <td><input class="ter-in" data-tid="${tid}" data-f="icon" type="text" value="${t.icon || '·'}" style="width:48px"></td>
      <td><input class="ter-in" data-tid="${tid}" data-f="color" type="color" value="${t.color || '#7a8a5a'}"></td>
      <td><input class="ter-in" data-tid="${tid}" data-f="defense" type="number" step="0.05" value="${t.defense || 0}"></td>`;
    for (const fl of flags) {
      html += `<td><input class="ter-in" data-tid="${tid}" data-f="${fl}" type="checkbox" ${t[fl] ? 'checked' : ''}></td>`;
    }
    html += '</tr>';
  }
  body.innerHTML = html;
}

function renderBuildings() {
  const body = $('buildings-body');
  let html = '';
  for (const [bid, b] of Object.entries(ST.cfg.buildings)) {
    const c = b.cost || {};
    html += `<tr>
      <td><span class="terr-name-cell">${bid}</span></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="name" type="text" value="${b.name || bid}" style="width:90px"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="icon" type="text" value="${b.icon || '▪'}" style="width:48px"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="cost.gold" type="number" value="${c.gold || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="cost.wood" type="number" value="${c.wood || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="cost.stone" type="number" value="${c.stone || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="pop" type="number" value="${b.pop || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="food" type="number" value="${b.food || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="fort" type="number" value="${b.fort || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="fort_hill" type="checkbox" ${b.fort_hill ? 'checked' : ''}></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="army_rate" type="number" value="${b.army_rate || 0}"></td>
      <td><input class="bld-in" data-bid="${bid}" data-f="requires_water" type="checkbox" ${b.requires_water ? 'checked' : ''}></td>
      <td><button class="mini-btn danger" onclick="delBuilding('${bid}')">✕</button></td>
    </tr>`;
  }
  body.innerHTML = html;
}

export function addBuilding() {
  const def = NEW_BUILDING_DEFS.find(b => !ST.cfg.buildings[b.id]) || (() => {
    let n = 1; while (ST.cfg.buildings['bld' + n]) n++;
    return { id: 'bld' + n, name: 'Bâtiment', icon: '🏛️', cost: { gold: 50 } };
  })();
  ST.cfg.buildings[def.id] = JSON.parse(JSON.stringify(def));
  renderBuildings(); renderJson();
  $('sec-buildings').scrollIntoView({ behavior: 'smooth' });
}

export function delBuilding(bid) {
  delete ST.cfg.buildings[bid];
  renderBuildings(); renderJson();
}
