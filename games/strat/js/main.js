// ─── Config ───────────────────────────────────────────────────────
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#95a5a6']
const EMPIRES = window.EMPIRES
const TERRITORIES = window.TERRITORIES
const UNIT_STATS = {
  soldier:  {name:'Soldat',   icon:'🗡️', a:1.0, d:1.0, cost:1},
  cavalry:  {name:'Cavalier', icon:'🐴', a:2.5, d:1.5, cost:2},
  elephant: {name:'Éléphant', icon:'🐘', a:5.0, d:4.0, cost:5},
  camel:    {name:'Chameau',  icon:'🐫', a:3.0, d:2.5, cost:3},
  navy:     {name:'Navire',   icon:'🚢', a:2.0, d:2.0, cost:4},
}
const UNIT_ORDER = ['soldier','cavalry','elephant','camel','navy']
const COUNTER = {
  soldier:  {soldier:1.0, cavalry:1.0, elephant:1.0, camel:1.0, navy:1.0},
  cavalry:  {soldier:2.0, cavalry:1.0, elephant:0.5, camel:1.0, navy:1.0},
  elephant: {soldier:1.0, cavalry:2.0, elephant:1.0, camel:0.5, navy:1.0},
  camel:    {soldier:1.0, cavalry:1.0, elephant:2.0, camel:1.0, navy:1.0},
  navy:     {soldier:1.0, cavalry:1.0, elephant:1.0, camel:1.0, navy:1.5},
}
function atkTypeMult(utype, toT) {
  const defU = unitsOf(toT)
  let total = 0
  for (const d of UNIT_ORDER) total += defU[d] * UNIT_STATS[d].d
  const prof = terrainProfile(toT)
  let mult = 1
  if (total > 0) {
    for (const d of UNIT_ORDER) {
      if (defU[d] > 0) {
        let w = (defU[d] * UNIT_STATS[d].d) / total
        if (utype === 'cavalry' && d === 'soldier') w *= prof.plain_ratio
        mult += (COUNTER[utype][d] - 1) * w
      }
    }
  }
  const fort = toT.fort || 0
  const fort_hill = toT.fort_hill || 0
  if (utype === 'elephant') mult += 0.25 * (fort + fort_hill)
  else mult *= Math.max(0.3, 1 - 0.1 * fort)
  return mult
}
function dominantUnit(units) {
  let best = 'soldier', bn = -1
  for (const k in units) if (units[k] > bn) { bn = units[k]; best = k }
  return best
}
function unitsOf(td) {
  const u = td?.units || {}
  return {
    soldier: td?.army || 0,
    cavalry: u.cavalry || 0,
    elephant: u.elephant || 0,
    camel: u.camel || 0,
    navy: u.navy || 0,
  }
}
function unitIcon(u) { return (UNIT_STATS[u] || UNIT_STATS.soldier).icon }
function terrainProfile(td) {
  if (!td?.grid) return { plain_ratio: 1, hills: 0, forests: 0, beach: true }
  let hills = 0, forests = 0, plain = 0, beach = 0
  for (const row of td.grid) for (const cell of row) {
    const ter = cell && typeof cell === 'object' ? (cell.t || 'plain') : 'plain'
    if (ter === 'hill') hills++
    else if (ter === 'forest') forests++
    else if (ter === 'beach') beach++
    else if (ter === 'plain') plain++
  }
  const land = Math.max(1, hills + forests + plain + beach)
  return { plain_ratio: (plain + beach) / land, hills, forests, beach: beach > 0 }
}
function ownerPower(pid, def) {
  let p = 0
  for (const id in state.territories) {
    const t = state.territories[id]
    if (t?.owner !== pid) continue
    const uu = unitsOf(t)
    if (def) p += t.army + uu.cavalry*1.5 + uu.elephant*4 + uu.camel*2.5 + uu.navy*2
    else p += t.army + uu.cavalry*2.5 + uu.elephant*5 + uu.camel*3 + uu.navy*2
  }
  return p
}
const BUILDINGS = {
  house:{name:'Maison',icon:'🏠',cost:{gold:30,wood:20},pop:500},
  farm:{name:'Ferme',icon:'🌾',cost:{gold:20},food:15},
  wall:{name:'Mur',icon:'🧱',cost:{stone:25},defense:1},
  barracks:{name:'Caserne',icon:'⚔️',cost:{gold:80,wood:40},army:2},
  temple:{name:'Temple',icon:'☥',cost:{gold:60,stone:30},mood:5},
  port:{name:'Port',icon:'⚓',cost:{gold:100,wood:80}},
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
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    try { ws.close() } catch (e) {}
  }
  const sock = new WebSocket(wsUrl())
  ws = sock
  sock.onopen = () => { if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({action:'join',name,empire})) }
  sock.onmessage = e => {
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
    if (msg.action === 'war') { handleWarDeclared(msg.war) }
    if (msg.action === 'move') { handleMove(msg.move) }
    if (msg.action === 'error') { showToast('⚠️ ' + msg.error, 'error') }
    if (msg.action === 'game_over') { alert('🏆 '+msg.winnerName+' a gagné!') }
  }
  sock.onclose = () => { document.getElementById('login-status').textContent='Déconnecté' }
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
      GlobeAPI.spawnAttackProjectile(b.fromTid, b.toTid, b.attackerWins, aHex, b.unit)
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
  let uDesc = unitIcon(b.unit)
  if (b.units) {
    const parts = []
    for (const k of UNIT_ORDER) if ((b.units[k] || 0) > 0) parts.push(`${UNIT_STATS[k].icon}${b.units[k]}`)
    if (parts.length) uDesc = parts.join(' ')
  }

  logWar(
    `<span class="war-att" style="color:${aCol}">${aName}</span>` +
    (b.attackerWins ? ' 🏆 ' : ' 💀 ') +
    `<span class="war-def" style="color:${dCol}">${dName}</span> ` +
    `<span class="${b.attackerWins ? 'war-win' : 'war-lose'}">${winTxt}</span> ` +
    `<span class="war-terr">${b.territory}</span>` +
    `<div class="war-sub">${uDesc} pertes att: ${b.atkLosses} · déf: ${b.defLosses}` +
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

function empireInfo(emp) {
  const e = (state.empires && state.empires[emp]) || EMPIRES[emp]
  return e ? {name: e.name, icon: e.icon, color: e.color} : {name: emp, icon: '⚑', color: '#888'}
}

function handleWarDeclared(w) {
  if (!w) return
  const a = empireInfo(w.declared), b = empireInfo(w.target)
  const mine = w.declared === state.your_empire || w.target === state.your_empire
  logWar(
    `<span class="war-att" style="color:${a.color}">${a.icon} ${a.name}</span> ` +
    `<span class="war-win">⚔️ DÉCLARE LA GUERRE</span> ` +
    `<span class="war-def" style="color:${b.color}">${b.icon} ${b.name}</span>`,
    mine
  )
  showToast(`⚔️ ${a.name} déclare la guerre à ${b.name} !`, mine ? 'war' : 'info')
  if (mine) showBattleBanner(`⚔️ GUERRE ! ${a.name} ⚔️ ${b.name}`, 'war')
  updateHUD()
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
  const pv = attackPreview(fromId, id, {soldier: Math.floor((state.territories[fromId]?.army || 0) * 0.7)})
  send('attack', {tid: fromId, to: id})
  if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(fromId, id, pv ? pv.chance >= 50 : false, empireColorOf(state.you), 'soldier')
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

function attackPreview(fromId, toId, units) {
  const fromT = state.territories[fromId]
  const toT = state.territories[toId]
  if (!fromT || !toT) return null
  const uu = unitsOf(fromT)
  let total = 0
  for (const k of UNIT_ORDER) total += Math.min(units[k] || 0, uu[k] || 0)
  if (total <= 0) return null
  let atkPow = 0
  for (const k of UNIT_ORDER) {
    const n = Math.min(units[k] || 0, uu[k] || 0)
    if (n > 0) atkPow += n * UNIT_STATS[k].a * atkTypeMult(k, toT)
  }
  const myEmp = state.your_empire || state.players[state.you]?.empire
  let allyPow = 0
  for (const pid in state.players) {
    if (pid !== state.you && state.players[pid]?.empire === myEmp) allyPow += ownerPower(pid)
  }
  atkPow += Math.floor(allyPow * 0.2)
  const prof = terrainProfile(toT)
  const defFull = ownerPower(toT.owner, true) * (1 + ((toT.fort || 0) + 0.5 * (toT.fort_hill || 0)) * 0.2) * (1 + (prof.hills + prof.forests) * 0.05)
  const defEmp = state.players[toT.owner]?.empire
  let defAllyPow = 0
  for (const pid in state.players) {
    if (pid !== toT.owner && state.players[pid]?.empire === defEmp) defAllyPow += ownerPower(pid, true)
  }
  const defPow = defFull + Math.floor(defAllyPow * 0.2)
  const chance = atkPow <= 0 ? 0 : Math.max(0, Math.min(1, (atkPow * 1.2 - defPow) / (atkPow * 0.4)))
  const notes = []
  if (units.navy > 0 && !prof.beach) notes.push('🚢 pas de plage')
  if (prof.hills + prof.forests > 0) notes.push(`⛰️${prof.hills}🌲${prof.forests} défense +${Math.round((prof.hills + prof.forests) * 5)}%`)
  return { atk: Math.round(atkPow), def: Math.round(defPow), chance: Math.round(chance * 100), total, notes }
}

// ─── Territory action bar (compact, non-blocking) ─────────────────
function showTerritoryBar(id) {
  const bar = document.getElementById('terr-bar')
  if (!bar) return
  const t = TERRITORIES.find(x => x.id === id)
  const td = state.territories[id]
  const me = state.players[state.you] || {}

  bar.innerHTML = ''
  const info = document.createElement('span')
  info.className = 'terr-bar-info'
  const uu = unitsOf(td)
  const extraU = UNIT_ORDER.slice(1).filter(k => uu[k] > 0).map(k => `${UNIT_STATS[k].icon}${uu[k]}`).join(' ')
  info.textContent = `📍 ${t?.name} ${t?.cap ? '🏛' : ''} — 👥${td?.pop||0} ⚔️${td?.army||0}${extraU ? ' ' + extraU : ''} (+${Math.max(1, Math.floor((td?.pop||0)/200))}/tour)`
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
  const convHint = document.createElement('span')
  convHint.className = 'terr-bar-hint'
  convHint.textContent = '🔁 Convertir des soldats :'
  bar.appendChild(convHint)
  const convAmt = document.createElement('input')
  convAmt.type = 'number'
  convAmt.min = 1
  convAmt.max = Math.max(1, td?.army || 0)
  convAmt.value = 1
  convAmt.className = 'tb-amount'
  convAmt.title = `Soldats disponibles : ${td?.army||0}`
  bar.appendChild(convAmt)
  for (const k of ['cavalry','elephant','camel','navy']) {
    const st = UNIT_STATS[k]
    const b = btn(`${st.icon} (${st.cost}⚔)`, 'tb-btn tb-conv', () => {
      const amount = Math.max(1, parseInt(convAmt.value) || 1)
      send('convert', {tid: id, unit: k, amount})
      if (window.GlobeAPI) GlobeAPI.spawnRecruitEffect(id)
      hideTerritoryBar()
      selTid = null
      GlobeAPI.clearSelection()
    })
    b.title = `${st.name} — coût ${st.cost} soldats / unité`
    b.classList.toggle('disabled', (td?.army || 0) < st.cost)
    bar.appendChild(b)
  }
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
  const allEnemies = []
  for (const tid in state.territories) {
    const ot = state.territories[tid]
    if (ot?.owner && !isAlly(ot.owner)) {
      allEnemies.push({id: Number(tid), name: TERRITORIES.find(y => y.id === Number(tid))?.name || tid, army: ot.army || 0})
    }
  }
  if (allEnemies.length) {
    const hint = document.createElement('span')
    hint.className = 'terr-bar-hint'
    hint.textContent = '⚔️ Attaquer (mélange d\'unités) :'
    bar.appendChild(hint)
    const rows = []
    for (const k of UNIT_ORDER) {
      const pool = unitsOf(td)[k] || 0
      const wrap = document.createElement('span')
      wrap.className = 'tb-mix'
      const lab = document.createElement('span')
      lab.className = 'tb-mix-label'
      lab.textContent = UNIT_STATS[k].icon
      lab.title = `${UNIT_STATS[k].name} — disponibles : ${pool}`
      const inp = document.createElement('input')
      inp.type = 'number'
      inp.min = 0
      inp.max = pool
      inp.value = k === 'soldier' ? Math.max(0, Math.floor((td?.army || 0) * 0.7)) : 0
      inp.className = 'tb-amount'
      inp.title = `${UNIT_STATS[k].name} disponibles : ${pool}`
      wrap.appendChild(lab)
      wrap.appendChild(inp)
      bar.appendChild(wrap)
      rows.push({k, inp, pool})
    }
    const tsel = buildEnemySelect(allEnemies)
    bar.appendChild(tsel)
    const pvEl = document.createElement('span')
    pvEl.className = 'terr-bar-info'
    bar.appendChild(pvEl)
    const attackBtn = tbBtn('⚔️ Attaquer', 'tb-btn tb-attack', () => {
      const units = {}
      for (const r of rows) {
        const v = Math.max(0, parseInt(r.inp.value) || 0)
        if (v > 0) units[r.k] = Math.min(v, r.pool)
      }
      const toId = Number(tsel.value)
      const pv = attackPreview(id, toId, units)
      send('attack', {tid: id, to: toId, units})
      if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(id, toId, pv ? pv.chance >= 50 : false, empireColorOf(state.you), dominantUnit(units))
      hideTerritoryBar()
      selTid = null
      GlobeAPI.clearSelection()
    })
    const updatePv = () => {
      const units = {}
      let total = 0
      for (const r of rows) {
        const v = Math.max(0, parseInt(r.inp.value) || 0)
        if (v > 0) { units[r.k] = Math.min(v, r.pool); total += units[r.k] }
      }
      const toId = Number(tsel.value)
      const pv = attackPreview(id, toId, units)
      const et = allEnemies.find(e => e.id === toId)
      pvEl.textContent = pv
        ? `⚔️${pv.atk} vs 🛡️${pv.def} — ${pv.chance}% (${total} envoyés)${pv.notes?.length ? ' — ' + pv.notes.join(' · ') : ''}`
        : 'Aucune unité sélectionnée'
      attackBtn.classList.toggle('disabled', !pv || !et || total < 1)
    }
    for (const r of rows) r.inp.oninput = updatePv
    tsel.onchange = updatePv
    bar.appendChild(attackBtn)
    updatePv()
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

function buildEnemySelect(list, selectedId) {
  const sel = document.createElement('select')
  sel.className = 'tb-dest'
  const groups = {}
  for (const e of list) {
    const emp = empireOf(state.territories[e.id]?.owner)
    if (!emp) continue
    if (!groups[emp]) groups[emp] = {info: empireInfo(emp), cities: []}
    groups[emp].cities.push(e)
  }
  for (const emp in groups) {
    const g = groups[emp]
    g.cities.sort((a, b) => a.name.localeCompare(b.name))
    const atWar = (g.info.wars || []).includes(state.your_empire)
    const og = document.createElement('optgroup')
    og.label = `${g.info.icon} ${g.info.name} ${atWar ? '⚔️' : '☮️'}`
    for (const c of g.cities) {
      const o = document.createElement('option')
      o.value = c.id
      o.textContent = `${c.name} (⚔️${c.army})`
      if (c.id === selectedId) o.selected = true
      og.appendChild(o)
    }
    sel.appendChild(og)
  }
  return sel
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
  hint.textContent = '⚔️ Attaquer :'
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
  const targets = []
  for (const tid in state.territories) {
    const ot = state.territories[tid]
    if (ot?.owner && !isAlly(ot.owner)) {
      targets.push({id: Number(tid), name: TERRITORIES.find(y => y.id === Number(tid))?.name || tid, army: ot.army || 0})
    }
  }
  const tsel = buildEnemySelect(targets, id)
  bar.appendChild(tsel)
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
    const toId = Number(tsel.value)
    const amount = Math.max(1, Math.min(parseInt(amt.value) || 50, state.territories[sid]?.army || 1))
    const pv = attackPreview(sid, toId, {soldier: amount})
    send('attack', {tid: sid, to: toId, amount})
    if (window.GlobeAPI) GlobeAPI.spawnAttackProjectile(sid, toId, pv ? pv.chance >= 50 : false, empireColorOf(state.you), 'soldier')
    hideTerritoryBar()
    selTid = null
    GlobeAPI.clearSelection()
  })
  const updatePv = () => {
    const sid = Number(sel.value)
    const toId = Number(tsel.value)
    const amount = Math.max(1, Math.min(parseInt(amt.value) || 50, state.territories[sid]?.army || 1))
    const pv = attackPreview(sid, toId, {soldier: amount})
    const st = state.territories[sid]
    pvEl.textContent = pv ? `⚔️${pv.atk} vs ⚔️${pv.def} — ${pv.chance}% (${st?.army||0} dispo, ${amount} envoyés)` : ''
    attackBtn.classList.toggle('disabled', !pv || pv.atk <= 0)
  }
  sel.onchange = updatePv
  tsel.onchange = updatePv
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
  const myWars = myEmp ? (emps[myEmp]?.wars || []) : []
  const warLine = myWars.length
    ? `<div class="legend-war">⚔️ En guerre : ${myWars.map(w => {
        const ew = emps[w]; return `<span style="color:${ew?.color||'#fff'}">${ew?.icon||'⚑'} ${ew?.name||w}</span>`
      }).join(' ')}</div>`
    : `<div class="legend-war peace">☮️ En paix avec tous</div>`
  leg.innerHTML = `<h4>🎨 Empires</h4>` + warLine +
    Object.entries(emps).map(([id, e]) => {
      const mine = myEmp && id === myEmp
      return `<div class="legend-row${mine ? ' you' : ''}">
        <span class="swatch" style="background:${e.color}"></span>
        <span class="ename">${e.icon} ${e.name}</span>
        <span class="ewar">${myWars.includes(id) ? '⚔️' : (mine ? '' : '☮️')}</span>
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
  const legend = document.getElementById('city-msg')
  if (legend) legend.innerHTML = '🌊 eau &nbsp;·&nbsp; 🏖️ plage (ports) &nbsp;·&nbsp; ⛰️ colline (murs +50%) &nbsp;·&nbsp; 🌲 forêt (bloque) &nbsp;·&nbsp; 🌾 fertile (fermes +50%)'
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
  let tools = [['house','🏠 Maison'],['farm','🌾 Ferme'],['wall','🧱 Mur'],['barracks','⚔️ Caserne'],['temple','☥ Temple'],['port','⚓ Port']]
  for (let [k,v] of tools) {
    let b = document.createElement('button')
    b.textContent = v
    b.onclick = () => { selectedTool = k; document.querySelectorAll('#city-tools button').forEach(x=>x.classList.remove('active')); b.classList.add('active') }
    el.appendChild(b)
  }
}

function defaultGrid() {
  return Array.from({length:8},()=>Array.from({length:8},()=>({t:'plain',b:null})))
}

function renderCityCanvas(t) {
  let td = state.territories[t.id]
  let grid = td?.grid || defaultGrid()
  let GS = 8, T = 56, P = 16
  cityCanvas.width = GS*T + P*2
  cityCanvas.height = GS*T + P*2
  let ctx = cityCtx
  ctx.fillStyle = '#08060a'
  ctx.fillRect(0,0,cityCanvas.width,cityCanvas.height)

  const TERRAIN = {
    plain:   {col:'#14100e', icon:''},
    water:   {col:'#0a1c30', icon:'🌊'},
    beach:   {col:'#241e14', icon:'🏖️'},
    hill:    {col:'#231812', icon:'⛰️'},
    forest:  {col:'#0f2212', icon:'🌲'},
    fertile: {col:'#16260e', icon:'🌾'},
  }
  const BUILD_COLS = {house:'#2a1a12',farm:'#1a2a12',wall:'#3a1a12',barracks:'#2a1210',temple:'#1a102a',port:'#101a2a'}
  const BUILD_ICONS = {house:'🏠',farm:'🌾',wall:'🧱',barracks:'⚔️',temple:'☥',port:'⚓'}

  for (let row=0; row<GS; row++) {
    for (let c=0; c<GS; c++) {
      let cx = P + c*T + T/2, cy = P + row*T + T/2
      let cell = grid[row][c]
      let ter = 'plain', bld = null
      if (cell && typeof cell === 'object') { ter = cell.t || 'plain'; bld = cell.b || null }
      else if (cell && typeof cell === 'string') bld = cell
      let terrainStyle = TERRAIN[ter] || TERRAIN.plain
      let col = terrainStyle.col
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
      if (terrainStyle.icon) { ctx.font='15px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.globalAlpha=0.85; ctx.fillText(terrainStyle.icon, cx, cy); ctx.globalAlpha=1 }
      if (bld) {
        ctx.fillStyle = BUILD_COLS[bld] || '#1a1a1a'
        ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
        ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
        ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
        ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.fill()
        ctx.font='24px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(BUILD_ICONS[bld]||'⬜', cx, cy)
      }
    }
  }

  let pop = td?.pop||0
  let army = td?.army||0
  document.getElementById('city-stats').textContent = `👥${pop.toLocaleString()} ⚔️${army} 🧱${td?.fort||0}${td?.fort_hill ? ' ⛰️'+(td.fort_hill) : ''}`

  cityCanvas.onclick = (e) => {
    let rect = cityCanvas.getBoundingClientRect()
    let mx = (e.clientX - rect.left) * (cityCanvas.width/rect.width)
    let my = (e.clientY - rect.top) * (cityCanvas.height/rect.height)
    let gc = Math.floor((mx - P) / T), gr = Math.floor((my - P) / T)
    if (gc>=0 && gr>=0 && gc<GS && gr<GS) {
      let cell = grid[gr][gc]
      let ter = (cell && typeof cell === 'object') ? (cell.t || 'plain') : 'plain'
      if (!(cell && typeof cell === 'object' && cell.b) && ter !== 'water' && ter !== 'forest') {
        send('build', {tid:t.id, building:selectedTool, gx:gc, gy:gr})
        if (!state.territories[t.id].grid) state.territories[t.id].grid = defaultGrid()
        state.territories[t.id].grid[gr][gc] = {t: ter, b: selectedTool}
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
