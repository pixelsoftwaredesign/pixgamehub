/* Module de création de jeux — génération agentic (IA), clés API et
   sauvegarde des configs créées dans le Studio. */

import { $, ST, status, escapeHtml } from './state.js';
import { render } from './conception.js';
import { bpLoadFromCfg, buildPayload } from './coding.js';
import { refreshList } from './initialisation.js';

function currentKey() {
  ST.privateKey = ($('priv-key') && $('priv-key').value || ST.privateKey).trim();
  return ST.privateKey;
}

export async function createKey() {
  const name = ($('key-name') || {}).value || 'Studio';
  const game = ($('key-game') || {}).value || (ST.cfg.id || '');
  if (!game) { status('Indiquez un identifiant de jeu pour la clé.', true); return; }
  try {
    const r = await fetch('/api/keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, game }),
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || 'erreur');
    if ($('priv-key')) $('priv-key').value = res.privateKey;
    ST.privateKey = res.privateKey;
    status('🔐 Clés créées : privée copiée dans le champ ci-dessus (publique = ' + res.publicKey.slice(0, 14) + '…).');
    listKeys();
  } catch (e) { status('❌ ' + e.message, true); }
}

export async function listKeys() {
  try {
    const r = await fetch('/api/keys');
    const res = await r.json();
    const keys = res.keys || [];
    const wrap = $('keys-wrap');
    if (!wrap) return;
    wrap.innerHTML = keys.length
      ? '<table class="keys-table"><tr><th>Nom</th><th>Jeu</th><th>Clé publique</th></tr>' +
        keys.map(k => `<tr><td>${escapeHtml(k.name || '')}</td><td>${escapeHtml(k.game || '')}</td><td class="mono">${k.publicKey}</td></tr>`).join('') + '</table>'
      : '<p class="hint">Aucune clé pour l’instant.</p>';
  } catch (e) { /* silencieux */ }
}

export async function generateGame() {
  const prompt = ($('ai-prompt') || {}).value || '';
  if (!prompt) { status('Décrivez d’abord le jeu à générer.', true); return; }
  const btn = $('btn-generate');
  btn.disabled = true; btn.textContent = '✨ Génération…';
  try {
    const r = await fetch('/api/studio/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, apiKey: currentKey() }),
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || 'erreur');
    ST.cfg = res.config;
    ST.worldTemplate = JSON.parse(JSON.stringify(ST.cfg));
    ST.cfg.disabledEmpires = {};
    if ($('game-select')) $('game-select').value = ST.cfg.id || '';
    bpLoadFromCfg();
    render();
    status('✨ Jeu généré : « ' + (ST.cfg.name || ST.cfg.id) + ' » — vérifiez, puis sauvegardez.');
  } catch (e) {
    status('❌ ' + e.message, true);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Générer le jeu';
  }
}

export async function saveGame() {
  if (!ST.cfg) return;
  if (!ST.cfg.id) {
    status('Choisissez un identifiant (id) avant de sauvegarder.', true);
    return;
  }
  const payload = buildPayload();
  const btn = $('btn-save');
  btn.disabled = true; btn.textContent = '💾 Sauvegarde…';
  try {
    const r = await fetch('/api/studio/config/' + encodeURIComponent(ST.cfg.id), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, apiKey: currentKey() }),
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || 'erreur');
    await refreshList();
    status('✅ Jeu « ' + payload.name + ' » sauvegardé. Jouable via /games/creator/?gid=' + ST.cfg.id);
  } catch (e) {
    status('❌ ' + e.message, true);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Sauvegarder';
  }
}
