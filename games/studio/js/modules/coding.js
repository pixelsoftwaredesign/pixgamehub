/* Module de traitement coding — éditeur Blueprint visuel (graphe d'actions
   compilé en hooks JS) et export JSON du Studio. */

import { $, ST, status } from './state.js';

const BP_EVENTS = { turn: '▶ À ton tour', turnEnd: '⏹ Fin de tour', battle: '⚔ Combat', state: '🔄 À chaque état' };
const BP_ACTIONS = {
  toast:    { label: '💬 Toast',  fields: [['msg', 'Message']] },
  banner:   { label: '📢 Bannière', fields: [['msg', 'Message']] },
  setVar:   { label: '🧮 Variable', fields: [['name', 'Nom'], ['value', 'Valeur JS']] },
  autoEnd:  { label: '⏭ Fin auto', fields: [] },
  send:     { label: '📡 Commande', fields: [['cmd', 'Commande'], ['data', 'Data (JSON)']] },
};

let bpNodes = [];   // {id, type, x, y, fields:{}}
let bpLinks = [];   // {from, to}
let bpSelLink = null;
let bpLinkTemp = null;

function bpCfg() {
  if (!ST.cfg.blueprint) ST.cfg.blueprint = { enabled: false, code: '' };
  return ST.cfg.blueprint;
}

export function bpLoadFromCfg() {
  const b = ST.cfg.blueprint;
  if ($('bp-enabled')) $('bp-enabled').checked = !!(b && b.enabled);
  bpNodes = b && Array.isArray(b.graph) ? JSON.parse(JSON.stringify(b.graph)) : [];
  bpLinks = b && Array.isArray(b.links) ? JSON.parse(JSON.stringify(b.links)) : [];
  if ($('bp-code')) $('bp-code').value = (b && b.code) || '';
  bpRender();
}

export function bpEnable() {
  const b = bpCfg();
  b.enabled = !!$('bp-enabled').checked;
  if (b.enabled && !b.code) bpCompile();
  status('Blueprint ' + (b.enabled ? 'activé' : 'désactivé') + '.');
}

export function bpClear() {
  if (!confirm('Effacer le graphique du blueprint ?')) return;
  bpNodes = []; bpLinks = [];
  bpCfg().graph = [];
  bpCfg().links = [];
  bpCompile();
  bpRender();
}

export function bpAddNode(type) {
  const n = { id: 'bp' + Date.now() + Math.floor(Math.random() * 999), type, x: 20 + Math.random() * 80, y: 20 + Math.random() * 80, fields: {} };
  if (type === 'battle') n.fields.side = 'won';
  bpNodes.push(n);
  bpRender();
  return n;
}

function bpNodeLabel(n) {
  if (BP_EVENTS[n.type]) return BP_EVENTS[n.type];
  if (BP_ACTIONS[n.type]) return BP_ACTIONS[n.type].label;
  return n.type;
}

function bpRender() {
  const canvas = $('bp-canvas');
  const svg = $('bp-svg');
  if (!canvas || !svg) return;
  const rect = canvas.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  canvas.innerHTML = '';
  bpNodes.forEach(n => {
    const el = document.createElement('div');
    const isEv = !!BP_EVENTS[n.type];
    el.className = 'bp-node ' + (isEv ? 'ev' : 'act');
    el.style.left = n.x + 'px';
    el.style.top = n.y + 'px';
    let html = `<div class="bp-node-head">${bpNodeLabel(n)}${isEv ? '<span class="bp-out" title="sortie"></span>' : ''}</div>`;
    if (!isEv) {
      html += `<span class="bp-in" title="entrée"></span>`;
      const fdefs = BP_ACTIONS[n.type].fields;
      for (const [f, label] of fdefs) {
        const v = n.fields[f] || '';
        html += `<label>${label}<input class="bp-fld" data-nid="${n.id}" data-f="${f}" value="${String(v).replace(/"/g, '&quot;')}"></label>`;
      }
      html += `<label>Condition (facultatif)<input class="bp-fld" data-nid="${n.id}" data-f="cond" value="${String(n.fields.cond || '').replace(/"/g, '&quot;')}"></label>`;
      if (n.type === 'battle') {
        html += `<label>Côté<select class="bp-side" data-nid="${n.id}">
          <option value="won" ${n.fields.side === 'won' ? 'selected' : ''}>Gagné</option>
          <option value="lost" ${n.fields.side === 'lost' ? 'selected' : ''}>Perdu</option>
          <option value="any" ${n.fields.side === 'any' ? 'selected' : ''}>Les deux</option></select></label>`;
      }
      html += '<span class="bp-out" title="sortie"></span>';
    }
    el.innerHTML = html;
    el.addEventListener('pointerdown', e => bpDragStart(e, el, n));
    canvas.appendChild(el);
    el.querySelectorAll('.bp-fld').forEach(inp => inp.addEventListener('change', () => {
      n.fields[inp.dataset.f] = inp.value;
      bpCompile();
    }));
    el.querySelectorAll('.bp-side').forEach(sel => sel.addEventListener('change', () => {
      n.fields.side = sel.value;
      bpCompile();
    }));
    el.querySelectorAll('.bp-out').forEach(dot => {
      dot.addEventListener('pointerdown', e => { e.stopPropagation(); bpLinkStart(e, n); });
    });
    el.querySelectorAll('.bp-in').forEach(dot => {
      dot.addEventListener('pointerdown', e => { e.stopPropagation(); bpLinkTarget(e, n); });
    });
  });
  let links = '';
  bpLinks.forEach(l => {
    const a = bpNodes.find(x => x.id === l.from);
    const b = bpNodes.find(x => x.id === l.to);
    if (!a || !b) return;
    const ax = a.x + 150, ay = a.y + 12, bx = b.x, by = b.y + 12;
    links += `<path d="M ${ax} ${ay} C ${ax + 40} ${ay}, ${bx - 40} ${by}, ${bx} ${by}" stroke="${bpSelLink === l ? '#ff6a5a' : '#6aa0ff'}" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>`;
  });
  svg.innerHTML = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#6aa0ff"></path></marker></defs>` + links;
}

function bpDragStart(e, el, n) {
  e.preventDefault();
  const startX = e.clientX, startY = e.clientY, ox = n.x, oy = n.y;
  const move = ev => {
    n.x = Math.max(0, ox + ev.clientX - startX);
    n.y = Math.max(0, oy + ev.clientY - startY);
    el.style.left = n.x + 'px';
    el.style.top = n.y + 'px';
    bpRenderLinks();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    bpRender();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function bpRenderLinks() {
  const svg = $('bp-svg');
  let links = '';
  bpLinks.forEach(l => {
    const a = bpNodes.find(x => x.id === l.from);
    const b = bpNodes.find(x => x.id === l.to);
    if (!a || !b) return;
    const ax = a.x + 150, ay = a.y + 12, bx = b.x, by = b.y + 12;
    links += `<path d="M ${ax} ${ay} C ${ax + 40} ${ay}, ${bx - 40} ${by}, ${bx} ${by}" stroke="#6aa0ff" stroke-width="2" fill="none"></path>`;
  });
  svg.innerHTML = links;
}

function bpLinkStart(e, fromNode) {
  e.preventDefault();
  bpLinkTemp = fromNode;
  document.body.style.cursor = 'crosshair';
}
function bpLinkTarget(e, toNode) {
  e.stopPropagation();
  if (!bpLinkTemp) return;
  if (bpLinkTemp.id === toNode.id) { bpLinkTemp = null; document.body.style.cursor = ''; return; }
  bpLinks = bpLinks.filter(l => !(l.from === bpLinkTemp.id && l.to === toNode.id));
  bpLinks.push({ from: bpLinkTemp.id, to: toNode.id });
  bpLinkTemp = null;
  document.body.style.cursor = '';
  bpCompile();
  bpRender();
}
document.addEventListener('pointerup', () => { bpLinkTemp = null; document.body.style.cursor = ''; });

export function bpCompile() {
  const b = bpCfg();
  const src = [];
  src.push('return {');
  const byEv = {};
  for (const n of bpNodes) if (BP_EVENTS[n.type]) (byEv[n.type] = byEv[n.type] || []).push(n);
  const hookFor = { turn: 'onTurn', turnEnd: 'onTurnEnd', battle: 'onBattle', state: 'onState' };
  for (const etype of Object.keys(hookFor)) {
    const evs = byEv[etype] || [];
    if (!evs.length) continue;
    src.push(`  ${hookFor[etype]}: function(ctx, info){`);
    for (const ev of evs) {
      const conds = [];
      if (etype === 'battle' && ev.fields.side && ev.fields.side !== 'any') {
        conds.push(`info && info.won === ${ev.fields.side === 'won' ? 'true' : 'false'}`);
      }
      const chain = bpChainOf(ev);
      if (chain.length) {
        const wrap = conds.length ? `    if (${conds.join(' && ')}) {\n` : '';
        if (wrap) src.push(wrap);
        for (const a of chain) src.push(bpActionLine(a));
        if (wrap) src.push('    }');
      }
    }
    src.push('  },');
  }
  src.push('};');
  b.code = src.join('\n');
  if ($('bp-code')) $('bp-code').value = b.code;
  b.graph = bpNodes.map(n => JSON.parse(JSON.stringify(n)));
  b.links = bpLinks.map(l => ({ ...l }));
  try {
    new Function('ctx', 'info', b.code);
    $('bp-code').classList.remove('bad');
  } catch (e) {
    $('bp-code').classList.add('bad');
  }
}

function bpChainOf(ev) {
  const seen = new Set();
  const out = [];
  const visit = n => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    for (const l of bpLinks) if (l.from === n.id) {
      const t = bpNodes.find(x => x.id === l.to);
      if (t) { out.push(t); visit(t); }
    }
  };
  visit(ev);
  return out;
}

function bpActionLine(a) {
  const c = (a.fields.cond || '').trim();
  let line = '';
  const pad = '    ';
  if (a.type === 'toast') line = `ctx.toast(${JSON.stringify(a.fields.msg || '')});`;
  else if (a.type === 'banner') line = `ctx.banner(${JSON.stringify(a.fields.msg || '')});`;
  else if (a.type === 'setVar') line = `ctx.setVar(${JSON.stringify(a.fields.name || '')}, ${a.fields.value || '0'});`;
  else if (a.type === 'autoEnd') line = `ctx.autoEndTurn();`;
  else if (a.type === 'send') line = `ctx.send(${JSON.stringify(a.fields.cmd || '')}, ${(a.fields.data || '{}').trim() || '{}'});`;
  else line = '/* action inconnue */';
  return c ? `${pad}if (${c}) { ${line} }` : pad + line;
}

export function buildPayload() {
  const p = JSON.parse(JSON.stringify(ST.cfg));
  delete p.disabledEmpires;
  if (p.territories) {
    for (const t of p.territories) {
      if (t.home && !p.empires[t.home]) { t.home = null; t.cap = false; }
    }
  }
  return p;
}

export function renderJson() {
  const payload = buildPayload();
  $('json-preview').value = JSON.stringify(payload, null, 2);
  $('json-size').textContent = `~${Math.round($('json-preview').value.length / 1024 * 10) / 10} Ko`;
}

export function downloadJson() {
  const blob = new Blob([$('json-preview').value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (ST.cfg.id || 'jeu') + '.json';
  a.click();
}
