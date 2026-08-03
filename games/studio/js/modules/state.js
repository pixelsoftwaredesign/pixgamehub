/* Module d'état partagé du Studio.
   Singleton accessible par tous les modules (création, initialisation,
   conception, coding). */

export const $ = id => document.getElementById(id);

export const ST = {
  cfg: null,                 // config en cours d'édition (structure complète)
  list: [],                  // configs existantes
  worldTemplate: null,       // territoires/empires du monde (préset monde)
  countersDirty: false,
  privateKey: '',            // clé privée (mémoire uniquement, jamais persistée)
};

export function status(text, isErr) {
  const el = $('save-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'status' + (isErr ? ' err' : '');
  clearTimeout(status._t);
  status._t = setTimeout(() => { el.textContent = ''; }, 6000);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const NEW_UNIT_ICONS = ['🗡️', '🐴', '🐘', '🐫', '🚢', '🏹', '🛡️', '🔥', '💣', '👑'];
export const NEW_BUILDING_DEFS = [
  { id: 'house',     name: 'Maison',    icon: '🏠', cost: { gold: 30, wood: 20 }, pop: 500 },
  { id: 'farm',      name: 'Ferme',     icon: '🌾', cost: { gold: 20 }, food: 15, fertile_bonus: 22 },
  { id: 'wall',      name: 'Mur',       icon: '🧱', cost: { stone: 25 }, fort: 1, fort_hill: true },
  { id: 'barracks',  name: 'Caserne',   icon: '⚔️', cost: { gold: 80, wood: 40 }, army_rate: 2 },
  { id: 'temple',    name: 'Temple',    icon: '☥',  cost: { gold: 60, stone: 30 }, pop: 300 },
  { id: 'port',      name: 'Port',      icon: '⚓', cost: { gold: 100, wood: 80 }, requires_water: true },
];
export const MINI_EMPIRES = [
  { id: 'red',   name: 'Rouges', color: '#e5484d', icon: '🔴' },
  { id: 'blue',  name: 'Bleus',  color: '#3a86ff', icon: '🔵' },
  { id: 'green', name: 'Verts',  color: '#38b26a', icon: '🟢' },
  { id: 'gold',  name: 'Dorés',  color: '#f2b623', icon: '🟡' },
];
