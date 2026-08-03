/* Module d'état partagé du client de jeu — conteneur d'état, helpers de
   configuration et utilitaires communs aux modules (carte, blueprint, motion). */

export const $ = id => document.getElementById(id);
export const fmt = n => Math.round(n).toLocaleString('fr-FR');
export const GID = new URLSearchParams(location.search).get('gid') || 'strat';

export const ST = {
  state: null,            // état reçu du serveur (territoires, joueurs, empires…)
  config: null,           // config du jeu (units, terrains, combat…)
  ws: null,
  myPid: null,
  myEmpire: null,
  selected: null,         // territoire sélectionné
  pendingAttack: null,    // {to: tid}
  pendingAttacks: new Set(),  // "from:to" des attaques lancées par le joueur
  fx2d: [],               // effets d'attaque 2D (projectiles + explosions)
  fx2dId: null,           // requestAnimationFrame de la boucle d'effets 2D
  pickMode: null,         // 'attack' | 'move' | 'convert' | null
  connected: false,
  blueprintCfg: null,     // config.blueprint (moteur de règles bonus)
  bpModule: null,         // hooks compilés du blueprint
  bpVars: {},             // variables de session du blueprint
  bpTurnFired: 0,
  bpAutoEndFired: 0,
  view3d: false,          // vue 3D globe active
  threeCtx: null,         // {THREE, scene, camera, renderer, controls, group, markers, opts}
  renderCfg: null,        // config.render (options de rendu du jeu)
  mapPx: {},              // tid -> {x, y}
  pan: { x: 0, y: 0 },
  zoom: 1,
  cityTid: null,
  curBuild: null,
  bannerT: null,
};

export function empireOf(t) { return t.owner ? ST.state.players[t.owner]?.empire : null; }
export function empInfo(eid) { return eid ? ST.state.empires[eid] || ST.config.empires[eid] : null; }
export function colorOfEmpire(eid) { return empInfo(eid)?.color || '#8a8a8a'; }
export function ownerColor(t) { return t.owner ? colorOfEmpire(empireOf(t)) : '#555'; }

export function unitsOf(t) {
  const u = t.units || {};
  const out = {};
  for (const k of Object.keys(ST.config.units)) {
    if (u[k] > 0) out[k] = u[k];
  }
  return out;
}
export function tDef(t) { return (t.army || 0) + Object.entries(unitsOf(t)).reduce((s, [u, n]) => s + n * ST.config.units[u].d, 0); }
export function tAtk(t) { return (t.army || 0) + Object.entries(unitsOf(t)).reduce((s, [u, n]) => s + n * ST.config.units[u].a, 0); }

export function terrainFlag(ter, flag, def) {
  const t = ST.config.terrains[ter] || {};
  return t[flag] !== undefined ? !!t[flag] : !!def;
}

export function terrainProfile(t) {
  const g = t.grid;
  if (!g || !Array.isArray(g)) return { plain_ratio: 1, hills: 0, forests: 0, defense: 0, beach: false };
  const counts = {};
  let defense = 0, plain = 0, beach = 0;
  for (const row of g) for (const cell of row) {
    const ter = (cell && typeof cell === 'object') ? (cell.t || 'plain') : 'plain';
    counts[ter] = (counts[ter] || 0) + 1;
    defense += (ST.config.terrains[ter] || {}).defense || 0;
    if (terrainFlag(ter, 'open')) plain++;
    if (terrainFlag(ter, 'beach')) beach++;
  }
  const land = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  return {
    plain_ratio: (plain + beach) / land,
    hills: counts.hill || 0,
    forests: counts.forest || 0,
    defense,
    beach: beach > 0,
  };
}
