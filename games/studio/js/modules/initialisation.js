/* Module d'initialisation de jeux — chargement des configs existantes,
   liste, et création d'un nouveau jeu depuis le monde de référence. */

import { $, ST, status } from './state.js';
import { bindEvents, render } from './conception.js';
import { bpLoadFromCfg } from './coding.js';

export async function init() {
  bindEvents();
  await refreshList();
  const fromParam = new URLSearchParams(location.search).get('gid');
  await loadFrom(fromParam || 'strat');
}

export async function refreshList() {
  try {
    const r = await fetch('/api/studio/configs');
    ST.list = (await r.json()).games || [];
    const sel = $('game-select');
    sel.innerHTML = ST.list.map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('');
  } catch (e) { status('Liste indisponible', true); }
}

export async function loadFrom(gid) {
  try {
    const r = await fetch('/api/studio/config/' + encodeURIComponent(gid));
    if (!r.ok) throw new Error('introuvable');
    ST.cfg = await r.json();
  } catch (e) {
    ST.cfg = await fetch('/api/studio/config/strat').then(x => x.json());
  }
  ST.worldTemplate = JSON.parse(JSON.stringify(ST.cfg));
  if (!$('game-select').value || gid !== 'strat') $('game-select').value = ST.cfg.id || gid;
  bpLoadFromCfg();
  render();
  status('Config « ' + (ST.cfg.name || ST.cfg.id) + ' » chargée.');
}

export function newGame() {
  ST.cfg = JSON.parse(JSON.stringify(ST.worldTemplate));
  ST.cfg.id = ''; ST.cfg.name = ''; ST.cfg.icon = '🎮'; ST.cfg.genre = 'Stratégie';
  ST.cfg.disabledEmpires = {};
  bpLoadFromCfg();
  render();
  status('Nouveau jeu — à partir du monde de Strat.');
}

export async function loadSelected() {
  const gid = $('game-select').value;
  if (!gid) return;
  await loadFrom(gid);
}
