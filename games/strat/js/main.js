// ─── Config ───────────────────────────────────────────────────────
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#95a5a6']
const EMPIRES = window.EMPIRES
const TERRITORIES = window.TERRITORIES
const BUILDINGS = {
  house:{name:'Maison',icon:'🏠',cost:{gold:30,wood:20},pop:500},
  farm:{name:'Ferme',icon:'🌾',cost:{gold:20},food:15},
  wall:{name:'Mur',icon:'🧱',cost:{stone:25},defense:1},
  barracks:{name:'Caserne',icon:'⚔️',cost:{gold:80,wood:40},army:2},
  market:{name:'Marché',icon:'💰',cost:{gold:50,wood:30},gold:10},
  temple:{name:'Temple',icon:'☥',cost:{gold:60,stone:30},mood:5},
  port:{name:'Port',icon:'⚓',cost:{gold:100,wood:80},trade:15},
}

// ─── State ────────────────────────────────────────────────────────
var state = {turn:0, phase:'waiting', players:{}, territories:{}, empires:{}, you:null, your_turn:false}
var selTid = null
var ws = null
var selectedEmpire = 'carthage'
var cityCanvas, cityCtx
var selectedTool = 'house'

function empireColorOf(pid) {
  const e = state.players[pid]?.empire
  return (e && EMPIRES[e]) ? EMPIRES[e].color : '#888'
}
function empireOf(pid) { return state.players[pid]?.empire || null }
function isAlly(pid) { return pid === state.you || empireOf(pid) === empireOf(state.you) }

function proj(lon,lat) { return {x:(lon+6)*70+400, y:(48-lat)*70+100} }

// ─── Auth ─────────────────────────────────────────────────────────
async function doLogin() {
  let u = document.getElementById('user-input').value.trim()
  let p = document.getElementById('pass-input').value.trim()
  if (!u||!p) { document.getElementById('login-err').textContent='Champs requis'; return }
  try {
    let r = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:u,password:p})})
    let d = await r.json()
    if (!d.ok) { document.getElementById('login-err').textContent=d.error||'Erreur'; return }
    connectWS(u, selectedEmpire)
  } catch(e) { document.getElementById('login-err').textContent='Erreur de connexion' }
}

async function doRegister() {
  let u = document.getElementById('user-input').value.trim()
  let p = document.getElementById('pass-input').value.trim()
  if (!u||!p||p.length<3) { document.getElementById('login-err').textContent='Nom + mot de passe (3+ car.)'; return }
  let r = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:u,password:p})})
  let d = await r.json()
  document.getElementById('login-err').textContent = d.ok ? '✅ Compte créé' : (d.error||'Erreur')
}

// ─── Empire selection ─────────────────────────────────────────────
function buildEmpireButtons() {
  const box = document.getElementById('empire-buttons')
  if (!box || box.children.length) return
  for (const [id, e] of Object.entries(EMPIRES)) {
    const b = document.createElement('button')
    b.className = 'empire-btn'
    b.style.setProperty('--ec', e.color)
    b.innerHTML = `${e.icon} ${e.name}`
    b.dataset.empire = id
    b.onclick = () => {
      selectedEmpire = id
      box.querySelectorAll('.empire-btn').forEach(x => x.classList.toggle('selected', x === b))
    }
    box.appendChild(b)
  }
  box.firstChild && box.firstChild.classList.add('selected')
}

// ─── WebSocket ────────────────────────────────────────────────────
function wsUrl() {
  const cfg = window.WS_URL
  if (cfg) {
    return cfg.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const port = location.protocol === 'https:' ? '' : ':8081'
  return proto + '//' + location.hostname + port
}

function connectWS(name, empire) {
  document.getElementById('login-status').textContent = 'Connexion...'
  ws = new WebSocket(wsUrl())
  ws.onopen = () => { ws.send(JSON.stringify({action:'join',name,empire})) }
  ws.onmessage = e => {
    let msg = JSON.parse(e.data)
    if (msg.action === 'state') {
      let raw = msg.state
      let converted = {}
      for (let k in raw.territories) converted[parseInt(k)] = raw.territories[k]
      raw.territories = converted
      state = raw
      document.getElementById('login-screen').style.display = 'none'
      document.getElementById('game-ui').style.display = 'flex'
      if (window.GlobeAPI) {
        GlobeAPI.updateState(state)
        if (selTid !== null) GlobeAPI.selectTerritory(selTid)
      }
      updateHUD()
    }
    if (msg.action === 'battle') { handleBattle(msg.battle) }
    if (msg.action === 'move') { handleMove(msg.move) }
    if (msg.action === 'error') { showToast('⚠️ ' + msg.error, 'error') }
    if (msg.action === 'game_over') { alert('🏆 '+msg.winnerName+' a gagné!') }
  }
  ws.onclose = () => { document.getElementById('login-status').textContent='Déconnecté' }
}

function send(cmd, data={}) {
  if (ws && ws.readyState===WebSocket.OPEN)
    ws.send(JSON.stringify({action:'cmd', cmd, data}))
}

// ─── Toasts ────────────────────────────────────────────────────────
function showToast(text, type='info') {
  let box = document.getElementById('toast-box')
  if (!box) {
    box = document.createElement('div')
    box.id = 'toast-box'
    document.body.appendChild(box)
  }
  const t = document.createElement('div')
  t.className = 'toast ' + type
  t.textContent = text
  box.appendChild(t)
  setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => {
    t.classList.remove('show')
    setTimeout(() => t.remove(), 400)
  }, 3500)
}

function handleBattle(b) {
  if (!b) return
  if (window.GlobeAPI) {
    const aHex = empireColorOf(b.attacker)
    GlobeAPI.spawnBattleParticles(b.territory, b.attackerWins, aHex)
    if (b.fromTid !== undefined && b.toTid !== undefined) {
      GlobeAPI.spawnAttackProjectile(b.fromTid, b.toTid, b.attackerWins, aHex)
      GlobeAPI.flashTerritory(b.toTid, b.attackerWins ? 0xffffff : 0xff2222)
    }
  }
  const attacker = (state.players && state.players[b.attacker]) || {}
  const defender = (state.players && b.defender && state.players[b.defender]) || {}
  const aName = b.attacker === state.you ? 'Vous' : (attacker.name || 'Ennemi')
  const dName = b.defender === state.you ? 'vous' : (defender.name || 'ennemi')
  const aCol = empireColorOf(b.attacker)
  const dCol = b.defender ? empireColorOf(b.defender) : '#888'
  const winTxt = b.attackerWins ? 'conquis' : 'attaqué'
  const involved = b.attacker === state.you || b.defender === state.you

  logWar(
    `<span class="war-att" style="color:${aCol}">${aName}</span>` +
    (b.attackerWins ? ' 🏆 ' : ' 💀 ') +
    `<span class="war-def" style="color:${dCol}">${dName}</span> ` +
    `<span class="${b.attackerWins ? 'war-win' : 'war-lose'}">${winTxt}</span> ` +
    `<span class="war-terr">${b.territory}</span>` +
    `<div class="war-sub">⚔️ pertes att: ${b.atkLosses} · déf: ${b.defLosses}` +
    (b.atkAssist > 0 ? ` · +${b.atkAssist} alliés` : '') +
    (b.defAssist > 0 ? ` · déf +${b.defAssist}` : '') + `</div>`,
    involved
  )

  let extra = ''
  if (b.atkAssist > 0) extra += ` (+${b.atkAssist} alliés)`
  if (b.defAssist > 0) extra += ` (déf +${b.defAssist} alliés)`
  showToast(`${b.attackerWins ? '🏆' : '💀'} ${aName} ${winTxt} ${b.territory}${extra}`, b.attackerWins ? 'win' : 'lose')

  if (involved) showBattleBanner(
    b.attacker === state.you
      ? `🏆 ${aName} avez conquis ${b.territory} !`
      : `⚔️ ${aName} attaque votre territoire ${b.territory} !`,
    b.attackerWins ? 'victory' : 'defeat'
  )
}

// ─── War log ───────────────────────────────────────────────────────
function toggleWarLog() {
  const log = document.getElementById('war-log')
  const show = log.style.display === 'none'
  log.style.display = show ? 'block' : 'none'
  document.getElementById('warlog-btn').style.background = show ? '#4a3a28' : ''
}

function logWar(html, involved) {
  const log = document.getElementById('war-log')
  if (!log) return
  const e = document.createElement('div')
  e.className = 'war-entry' + (involved ? ' war-mine' : '')
  e.innerHTML = html
  log.prepend(e)
  while (log.children.length > 40) log.removeChild(log.lastChild)
}

function showBattleBanner(text, cls) {
  let b = document.getElementById('battle-banner')
  if (!b) {
    b = document.createElement('div')
    b.id = 'battle-banner'
    document.body.appendChild(b)
  }
  b.textContent = text
  b.className = 'show ' + (cls || '')
  clearTimeout(b._t)
  b._t = setTimeout(() => b.classList.remove('show'), 3200)
}

function handleMove(m) {
  if (!m) return
  if (window.GlobeAPI && m.fromTid !== undefined && m.toTid !== undefined)
    GlobeAPI.spawnMoveAnimation(m.fromTid, m.toTid)
  const t = TERRITORIES.find(x => x.id === m.toTid)
  showToast(`🛡️ ${m.amount} soldats envoyés vers ${t ? t.name : m.toTid}`, 'info')
}

// ─── Territory Click Handler (called by Globe3D) ──────────────────
function handleTerritoryClick(id) {
  const td = state.territories[id]

  if (td && td.owner === state.you) {
    selTid = id
    GlobeAPI.selectTerritory(id)
    showTerritoryBar(id)
  } else if (td && td.owner && !isAlly(td.owner)) {
    showEnemyBar(id)
  } else if (selTid !== null) {
    const fromT = state.territories[selTid]
    if (fromT?.owner === state.you) {
      if (td?.owner && isAlly(td.owner)) {
        send('move', {tid: selTid, to: id, amount: 50})
        if (window.GlobeAPI) GlobeAPI.spawnMoveAnimation(selTid, id)
      } else {
        send('attack', {tid: selTid, to: id})
      }
      selTid = null
      GlobeAPI.clearSelection()
      hideTerritoryBar()
    }
  }
}
window.handleTerritoryClick = handleTerritoryClick

function handleOpenCity(id) {
  const t = TERRITORIES.find(x => x.id === id)
  if (!t) return
  selTid = id
  GlobeAPI.selectTerritory(id)
  openCity(t)
}
window.handleOpenCity = handleOpenCity

function handleEnemyDoubleClick(id) {
  const td = state.territories[id]
  if (!td || !td.owner || isAlly(td.owner)) return
  let fromId = null
  if (selTid !== null && state.territories[selTid]?.owner === state.you) {
    fromId = selTid
  } else {
    let best = -1
    for (const sid in state.territories) {
      const st = state.territories[sid]
      if (st?.owner === state.you && (st.army || 0) > best) {
        best = st.army || 0
        fromId = Number(sid)
      }
    }
  }
  if (fromId === null) return
  const pv = attackPreview(fromId, id)
  send('attack', {tid: fromId, to: id})
  if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(fromId, id, pv ? pv.chance >= 50 : false, empireColorOf(state.you))
  hideTerritoryBar()
  selTid = null
  GlobeAPI.clearSelection()
}
window.handleEnemyDoubleClick = handleEnemyDoubleClick

function armyByOwner() {
  const m = {}
  for (const id in state.territories) {
    const t = state.territories[id]
    if (t && t.owner) m[t.owner] = (m[t.owner] || 0) + (t.army || 0)
  }
  return m
}

function attackPreview(fromId, toId, amount) {
  const fromT = state.territories[fromId]
  const toT = state.territories[toId]
  if (!fromT || !toT) return null
  const armies = armyByOwner()
  const myEmp = state.your_empire || state.players[state.you]?.empire
  const atk = amount
    ? Math.max(1, Math.min(Math.floor(amount), fromT.army || 0))
    : Math.floor((fromT.army || 0) * 0.7)
  const allyArmy = myEmp ? Math.max(0, ((state.empires[myEmp] || {}).army || 0) - (armies[state.you] || 0)) : 0
  const atkFull = atk + Math.floor(allyArmy * 0.2)
  const defBase = Math.floor((toT.army || 0) * (1 + (toT.fort || 0) * 0.2))
  const defEmp = state.players[toT.owner]?.empire
  const defAllyArmy = defEmp ? Math.max(0, ((state.empires[defEmp] || {}).army || 0) - (armies[toT.owner] || 0)) : 0
  const defFull = defBase + Math.floor(defAllyArmy * 0.2)
  const chance = atkFull <= 0 ? 0 : Math.max(0, Math.min(1, (atkFull * 1.2 - defFull) / (atkFull * 0.4)))
  return { atk: atkFull, def: defFull, chance: Math.round(chance * 100) }
}

// ─── Territory action bar (compact, non-blocking) ─────────────────
function showTerritoryBar(id) {
  const bar = document.getElementById('terr-bar')
  if (!bar) return
  const t = TERRITORIES.find(x => x.id === id)
  const td = state.territories[id]
  const me = state.players[state.you] || {}
  const adj = (t?.adj || []).map(x => TERRITORIES.find(y => y.id === x))
  const enemies = adj.filter(x => x && state.territories[x.id]?.owner && !isAlly(state.territories[x.id].owner))

  bar.innerHTML = ''
  const info = document.createElement('span')
  info.className = 'terr-bar-info'
  info.textContent = `📍 ${t?.name} ${t?.cap ? '🏛' : ''} — 👥${td?.pop||0} ⚔️${td?.army||0} (+${Math.max(1, Math.floor((td?.pop||0)/200))}/tour)`
  bar.appendChild(info)

  const btn = tbBtn

  bar.appendChild(btn('🏙 Ouvrir la ville', 'tb-btn', () => openCity(t)))
  bar.appendChild(btn('Recruter +100', me.gold >= 50 ? 'tb-btn' : 'tb-btn disabled', () => {
    send('recruit', {tid: id, amount: 100})
    if (window.GlobeAPI) GlobeAPI.spawnRecruitEffect(id)
  }))
  bar.appendChild(btn('Recruter +300', me.gold >= 150 ? 'tb-btn' : 'tb-btn disabled', () => {
    send('recruit', {tid: id, amount: 300})
    if (window.GlobeAPI) GlobeAPI.spawnRecruitEffect(id)
  }))
  const pushDest = []
  for (const tid in state.territories) {
    const ot = state.territories[tid]
    if (ot?.owner && isAlly(ot.owner) && Number(tid) !== id) {
      pushDest.push({id: Number(tid), name: TERRITORIES.find(y => y.id === Number(tid))?.name || tid})
    }
  }
  if (pushDest.length) {
    const hint = document.createElement('span')
    hint.className = 'terr-bar-hint'
    hint.textContent = '🚚 Pousser des renforts :'
    bar.appendChild(hint)
    const input = document.createElement('input')
    input.type = 'number'
    input.min = 1
    input.max = td?.army || 0
    input.value = 50
    input.className = 'tb-amount'
    input.title = `Soldats disponibles : ${td?.army||0}`
    bar.appendChild(input)
    const sel = document.createElement('select')
    sel.className = 'tb-dest'
    for (const d of pushDest) {
      const o = document.createElement('option')
      o.value = d.id
      o.textContent = d.name
      sel.appendChild(o)
    }
    bar.appendChild(sel)
    const b = btn('➡ Pousser', 'tb-btn tb-move', () => {
      const amount = Math.max(1, Math.min(parseInt(input.value) || 50, td?.army || 1))
      send('move', {tid: id, to: Number(sel.value), amount})
      if (window.GlobeAPI) GlobeAPI.spawnMoveAnimation(id, Number(sel.value))
    })
    bar.appendChild(b)
  }
  if (enemies.length) {
    const hint = document.createElement('span')
    hint.className = 'terr-bar-hint'
    hint.textContent = '⚔️ Attaques possibles :'
    bar.appendChild(hint)
    const amt = document.createElement('input')
    amt.type = 'number'
    amt.min = 1
    amt.max = td?.army || 0
    amt.value = Math.max(1, Math.floor((td?.army || 0) * 0.7))
    amt.className = 'tb-amount'
    amt.title = `Soldats disponibles : ${td?.army||0}`
    bar.appendChild(amt)
    const renderEn = (en) => {
      const amount = Math.max(1, Math.min(parseInt(amt.value) || 50, td?.army || 1))
      const pv = attackPreview(id, en.id, amount)
      const chance = pv ? pv.chance : 0
      const pct = chance >= 60 ? 'pct-high' : (chance >= 35 ? 'pct-mid' : 'pct-low')
      const b = btn(`⚔️ ${en.name} (${pv ? `⚔️${pv.atk} vs ⚔️${pv.def} — ` : ''}${chance}%)`, 'tb-btn tb-attack', () => {
        send('attack', {tid: id, to: en.id, amount})
        if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(id, en.id, pv ? pv.chance >= 50 : false, empireColorOf(state.you))
        hideTerritoryBar()
        selTid = null
        GlobeAPI.clearSelection()
      })
      b.classList.add(pct)
      return b
    }
    const enButtons = enemies.map(renderEn)
    enButtons.forEach(b => bar.appendChild(b))
    amt.oninput = () => {
      const buttons = Array.from(bar.querySelectorAll('.tb-attack'))
      enemies.forEach((en, i) => {
        const nb = renderEn(en)
        buttons[i].replaceWith(nb)
      })
    }
  }
  bar.appendChild(btn('✕', 'tb-close', () => hideTerritoryBar()))
  bar.style.display = 'flex'
}

function tbBtn(label, cls, fn) {
  const b = document.createElement('button')
  b.textContent = label
  if (cls) b.className = cls
  b.onclick = fn
  return b
}

function showEnemyBar(id) {
  const bar = document.getElementById('terr-bar')
  if (!bar) return
  const t = TERRITORIES.find(x => x.id === id)
  const td = state.territories[id]
  const sources = []
  for (const sid in state.territories) {
    const st = state.territories[sid]
    if (st?.owner === state.you && Number(sid) !== id) {
      sources.push({id: Number(sid), name: TERRITORIES.find(y => y.id === Number(sid))?.name || sid, army: st.army || 0})
    }
  }
  sources.sort((a, b) => b.army - a.army)

  bar.innerHTML = ''
  const info = document.createElement('span')
  info.className = 'terr-bar-info'
  info.textContent = `⛔ ${t?.name} (ennemi) — ⚔️${td?.army||0} 👥${td?.pop||0}`
  bar.appendChild(info)

  if (!sources.length) {
    const hint = document.createElement('span')
    hint.className = 'terr-bar-hint'
    hint.textContent = 'Vous ne contrôlez aucun territoire'
    bar.appendChild(hint)
    bar.appendChild(tbBtn('✕', 'tb-close', () => hideTerritoryBar()))
    bar.style.display = 'flex'
    return
  }

  const hint = document.createElement('span')
  hint.className = 'terr-bar-hint'
  hint.textContent = '⚔️ Attaquer depuis :'
  bar.appendChild(hint)
  const sel = document.createElement('select')
  sel.className = 'tb-dest'
  for (const s of sources) {
    const o = document.createElement('option')
    o.value = s.id
    o.textContent = `${s.name} (⚔️${s.army})`
    sel.appendChild(o)
  }
  bar.appendChild(sel)
  const amt = document.createElement('input')
  amt.type = 'number'
  amt.min = 1
  amt.max = sources.length ? (sources[0].army || 0) : 1
  amt.value = Math.max(1, Math.floor((sources[0]?.army || 0) * 0.7))
  amt.className = 'tb-amount'
  amt.title = "Soldats engagés dans l'attaque"
  bar.appendChild(amt)
  const pvEl = document.createElement('span')
  pvEl.className = 'terr-bar-info'
  bar.appendChild(pvEl)
  const attackBtn = tbBtn('⚔️ Attaquer', 'tb-btn tb-attack', () => {
    const sid = Number(sel.value)
    const amount = Math.max(1, Math.min(parseInt(amt.value) || 50, state.territories[sid]?.army || 1))
    const pv = attackPreview(sid, id, amount)
    send('attack', {tid: sid, to: id, amount})
    if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(sid, id, pv ? pv.chance >= 50 : false, empireColorOf(state.you))
    hideTerritoryBar()
    selTid = null
    GlobeAPI.clearSelection()
  })
  const updatePv = () => {
    const sid = Number(sel.value)
    const amount = Math.max(1, Math.min(parseInt(amt.value) || 50, state.territories[sid]?.army || 1))
    const pv = attackPreview(sid, id, amount)
    const st = state.territories[sid]
    pvEl.textContent = pv ? `⚔️${pv.atk} vs ⚔️${pv.def} — ${pv.chance}% (${st?.army||0} dispo, ${amount} envoyés)` : ''
    attackBtn.classList.toggle('disabled', !pv || pv.atk <= 0)
  }
  sel.onchange = updatePv
  amt.oninput = updatePv
  bar.appendChild(attackBtn)
  updatePv()
  bar.appendChild(tbBtn('✕', 'tb-close', () => hideTerritoryBar()))
  bar.style.display = 'flex'
}

function hideTerritoryBar() {
  const bar = document.getElementById('terr-bar')
  if (bar) bar.style.display = 'none'
}

// ─── HUD ──────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-turn').textContent = `Tour ${state.turn||0}`
  let me = state.players[state.you]||{}
  let myEmp = state.your_empire || (me.empire) || null
  let emp = myEmp ? (state.empires||{})[myEmp] : null
  const empEl = document.getElementById('hud-empire')
  if (emp) {
    empEl.style.display = 'inline'
    empEl.style.color = emp.color
    empEl.textContent = `${emp.icon} ${emp.name}`
  } else {
    empEl.style.display = 'none'
  }
  updateLegend(myEmp)
  document.getElementById('hud-gold').textContent = `💰${me.gold||0}`
  document.getElementById('hud-food').textContent = `🌾${me.food||0}`
  document.getElementById('hud-wood').textContent = `🪵${me.wood||0}`
  document.getElementById('hud-stone').textContent = `⛰${me.stone||0}`
  const myPids = myEmp ? (emp?.players || []) : [state.you]
  let totalArmy = Object.values(state.territories||{}).filter(t=>myPids.includes(t.owner)).reduce((s,t)=>s+(t.army||0),0)
  document.getElementById('hud-army').textContent = `⚔️${totalArmy}`
  document.getElementById('hud-pop').textContent = `👥${(emp?.pop||0).toLocaleString()}`
  let nTerr = Object.values(state.territories||{}).filter(t=>myPids.includes(t.owner)).length
  document.getElementById('hud-terr').textContent = `🏘${nTerr}`
  let pStr = Object.entries(state.players||{}).map(([id,p])=>{
    let c = empireColorOf(id)
    return `<span style="color:${c}">${id===state.you?'▶':''}${p.name||'?'}${isAlly(id)?' (all)':''}</span>`
  }).join(' ')
  document.getElementById('hud-players').innerHTML = pStr
  let btn = document.getElementById('end-turn-btn')
  btn.disabled = !state.your_turn || me.ready
  btn.textContent = me.ready ? '✅ En attente' : '⏭ Fin du tour'
}

function endTurn() { send('ready') }

function toggleLegend() {
  const leg = document.getElementById('empire-legend')
  const show = leg.style.display === 'none'
  leg.style.display = show ? 'block' : 'none'
  document.getElementById('legend-btn').style.background = show ? '#4a3a28' : ''
  if (show) updateLegend(state.your_empire || '')
}

function updateLegend(myEmp) {
  const leg = document.getElementById('empire-legend')
  if (!leg || leg.style.display === 'none') return
  const emps = state.empires || {}
  const terr = state.territories || {}
  const counts = {}
  Object.values(terr).forEach(t => { if (t.owner) counts[t.owner] = (counts[t.owner]||0)+1 })
  const owned = {}
  Object.entries(emps).forEach(([id, e]) => {
    owned[id] = (e.players||[]).reduce((s, pid) => s + (counts[pid]||0), 0)
  })
  leg.innerHTML = `<h4>🎨 Empires</h4>` +
    Object.entries(emps).map(([id, e]) => {
      const mine = myEmp && id === myEmp
      return `<div class="legend-row${mine ? ' you' : ''}">
        <span class="swatch" style="background:${e.color}"></span>
        <span class="ename">${e.icon} ${e.name}</span>
        <span style="color:${mine ? '#7dffa0' : '#8a9a7a'}">${owned[id]}</span>
      </div>`
    }).join('')
}

function toggleRotation() {
  const btn = document.getElementById('rotate-btn')
  const rotating = !(btn.dataset.on === '1')
  GlobeAPI.setAutoRotate(rotating)
  btn.dataset.on = rotating ? '1' : '0'
  btn.classList.toggle('active', !rotating)
  btn.textContent = rotating ? '⏸ Rotation' : '▶ Rotation'
}

function toggleZoom() {
  const btn = document.getElementById('zoom-btn')
  const zoomed = GlobeAPI.getZoom() > 1
  GlobeAPI.setZoom(zoomed ? 1 : 20)
  btn.classList.toggle('active', !zoomed)
  btn.textContent = zoomed ? '🔍 ×20' : '🔍 ×1'
}

// ─── City view ────────────────────────────────────────────────────
function openCity(t) {
  if (!cityCanvas) {
    cityCanvas = document.getElementById('city-canvas')
    cityCtx = cityCanvas.getContext('2d')
  }
  document.getElementById('city-view').style.display = 'flex'
  document.getElementById('city-title').textContent = t.name + (t.cap ? ' 🏛' : '')
  document.getElementById('city-stats').textContent = ''
  renderCityTools()
  renderCityActions(t)
  renderCityCanvas(t)
}

function closeCity() {
  document.getElementById('city-view').style.display = 'none'
  selTid = null
  if (window.GlobeAPI) GlobeAPI.clearSelection()
  hideTerritoryBar()
}

// ─── Recruit & troop movement UI ──────────────────────────────────
function renderCityActions(t) {
  const el = document.getElementById('city-actions')
  if (!el) return
  el.innerHTML = ''
  const me = state.players[state.you] || {}
  const td = state.territories[t.id]

  const title = document.createElement('div')
  title.className = 'city-actions-title'
  title.textContent = '⚔️ Armée'
  el.appendChild(title)

  const row = document.createElement('div')
  row.className = 'city-actions-row'

  const mkBtn = (label, cost, fn) => {
    const b = document.createElement('button')
    b.textContent = label
    b.className = 'action-btn'
    if (cost && (me.gold||0) < cost) b.classList.add('disabled')
    b.onclick = fn
    return b
  }
  row.appendChild(mkBtn('Recruter +100 (−50💰)', 50, () => {
    send('recruit', {tid: t.id, amount: 100})
    if (window.GlobeAPI) GlobeAPI.spawnRecruitEffect(t.id)
    showToast('⚔️ Recrutement de 100 soldats...', 'info')
  }))
  row.appendChild(mkBtn('Recruter +300 (−150💰)', 150, () => {
    send('recruit', {tid: t.id, amount: 300})
    if (window.GlobeAPI) GlobeAPI.spawnRecruitEffect(t.id)
    showToast('⚔️ Recrutement de 300 soldats...', 'info')
  }))
  el.appendChild(row)

  const adjOwned = t.adj.map(id => ({id, t: TERRITORIES.find(x => x.id === id)}))
    .filter(({id, t: at}) => at && state.territories[id]?.owner && isAlly(state.territories[id].owner))

  if (adjOwned.length > 0) {
    const sub = document.createElement('div')
    sub.className = 'city-actions-title'
    sub.textContent = '🛡️ Déplacer des troupes'
    el.appendChild(sub)
    const row2 = document.createElement('div')
    row2.className = 'city-actions-row'
    for (const {id, t: at} of adjOwned) {
      const b = document.createElement('button')
      b.className = 'action-btn move-btn'
      b.textContent = `+50 → ${at.name}`
      b.onclick = () => { send('move', {tid: t.id, to: id, amount: 50}) }
      row2.appendChild(b)
    }
    el.appendChild(row2)
  }
}

function renderCityTools() {
  let el = document.getElementById('city-tools')
  if (el.children.length > 0) return
  let tools = [['house','🏠 Maison'],['farm','🌾 Ferme'],['wall','🧱 Mur'],['barracks','⚔️ Caserne'],['market','💰 Marché'],['temple','☥ Temple'],['port','⚓ Port']]
  for (let [k,v] of tools) {
    let b = document.createElement('button')
    b.textContent = v
    b.onclick = () => { selectedTool = k; document.querySelectorAll('#city-tools button').forEach(x=>x.classList.remove('active')); b.classList.add('active') }
    el.appendChild(b)
  }
}

function renderCityCanvas(t) {
  let td = state.territories[t.id]
  let grid = td?.grid || Array.from({length:8},()=>Array(8).fill(null))
  let GS = 8, T = 56, P = 16
  cityCanvas.width = GS*T + P*2
  cityCanvas.height = GS*T + P*2
  let ctx = cityCtx
  ctx.fillStyle = '#08060a'
  ctx.fillRect(0,0,cityCanvas.width,cityCanvas.height)

  for (let row=0; row<GS; row++) {
    for (let c=0; c<GS; c++) {
      let cx = P + c*T + T/2, cy = P + row*T + T/2
      let cell = grid[row][c]
      let col = '#12100e'
      let icon = ''
      if (cell === null) { col = '#0e0a0c'; if (row===0||row===GS-1||c===0||c===GS-1) col='#1a1210' }
      else {
        col = {house:'#2a1a12',farm:'#1a2a12',wall:'#3a1a12',barracks:'#2a1210',market:'#2a2a10',temple:'#1a102a',port:'#101a2a'}[cell]||'#1a1a1a'
        icon = {house:'🏠',farm:'🌾',wall:'🧱',barracks:'⚔️',market:'💰',temple:'☥',port:'⚓'}[cell]||'⬜'
      }
      ctx.fillStyle = col
      let pad = 2, x=cx-T/2+pad, y=cy-T/2+pad, w=T-pad*2, h=T-pad*2, r=2
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.stroke()
      if (icon) { ctx.font='24px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(icon, cx, cy) }
    }
  }

  let pop = td?.pop||0
  let army = td?.army||0
  document.getElementById('city-stats').textContent = `👥${pop.toLocaleString()} ⚔️${army} 🧱${td?.fort||0}`

  cityCanvas.onclick = (e) => {
    let rect = cityCanvas.getBoundingClientRect()
    let mx = (e.clientX - rect.left) * (cityCanvas.width/rect.width)
    let my = (e.clientY - rect.top) * (cityCanvas.height/rect.height)
    let gc = Math.floor((mx - P) / T), gr = Math.floor((my - P) / T)
    if (gc>=0 && gr>=0 && gc<GS && gr<GS) {
      if (grid[gr][gc] === null) {
        send('build', {tid:t.id, building:selectedTool, gx:gc, gy:gr})
        if (!state.territories[t.id].grid) state.territories[t.id].grid = Array.from({length:8},()=>Array(8).fill(null))
        state.territories[t.id].grid[gr][gc] = selectedTool
        renderCityCanvas(t)
      }
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildEmpireButtons()
  const container = document.getElementById('map-container')
  if (container && window.GlobeAPI) {
    GlobeAPI.init(container)
  }
})
