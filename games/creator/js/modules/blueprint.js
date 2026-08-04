/* Module blueprint — moteur de règles bonus défini dans le Studio.
   Compile le code du blueprint (hooks JS) et l'invoque au moment des
   événements de jeu (état, tour, combat, fin de tour). */

import { $, ST } from './state.js?v=2';
import { send, toast, banner } from '../main.js?v=35';

export function buildBlueprint(code) {
  try {
    const mod = new Function(code)();
    return (mod && typeof mod === 'object') ? mod : null;
  } catch (e) {
    console.error('Blueprint invalide :', e);
    return null;
  }
}

export function bpRun(hook, info) {
  if (!ST.blueprintCfg || !ST.blueprintCfg.enabled || !ST.blueprintCfg.code) return;
  if (!ST.bpModule) ST.bpModule = buildBlueprint(ST.blueprintCfg.code);
  if (!ST.bpModule || typeof ST.bpModule[hook] !== 'function') return;
  try { ST.bpModule[hook](makeBpCtx(), info); }
  catch (e) { console.error('Blueprint(' + hook + ') :', e); }
}

function makeBpCtx() {
  const p = ST.state.players[ST.myPid];
  let caps = 0, terrs = 0;
  for (const t of Object.values(ST.state.territories || {})) {
    if (t.owner === ST.myPid) { terrs++; if (t.cap) caps++; }
  }
  const emp = ST.state.empires[ST.myEmpire];
  return {
    state: ST.state, config: ST.config, pid: ST.myPid, empire: ST.myEmpire,
    turn: ST.state.turn, phase: ST.state.phase,
    gold: p?.gold || 0, food: p?.food || 0, wood: p?.wood || 0, stone: p?.stone || 0,
    army: emp?.army || 0, pop: emp?.pop || 0, terrs, capitals: caps,
    toast: t => toast(t, 'info'),
    banner: t => banner(t, 'victory'),
    autoEndTurn: () => {
      if (ST.state.your_turn && ST.bpAutoEndFired !== ST.state.turn) { ST.bpAutoEndFired = ST.state.turn; send('ready', {}); }
    },
    send: (cmd, data) => send(cmd, data || {}),
    setVar: (k, v) => { ST.bpVars[k] = v; },
    getVar: k => ST.bpVars[k],
  };
}
