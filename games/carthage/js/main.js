import { Game } from './game.js'
import { renderMap } from './map.js'
import { openCityView, closeCityView } from './cities.js'
import { addFX, projectile } from './particles.js'
import { COLORS, proj } from './config.js'

let game = null
let ws = null
let token = ''
let username = ''

const CIVS = {
  carthage: { name: "Carthage",     color: "#2ed573" },
  rome:     { name: "Rome",         color: "#ff4757" },
  hellen:   { name: "Hellénistique", color: "#ffa502" },
  maya:     { name: "Maya",         color: "#a4b0be" },
  azteque:  { name: "Aztèque",      color: "#e8d5a3" }
}

async function api(path, body) {
  let r = await fetch("http://localhost:8080" + path, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  })
  return r.json()
}

window.doLogin = async () => {
  let u = document.getElementById('auth-user').value.trim()
  let p = document.getElementById('auth-pass').value.trim()
  let err = document.getElementById('auth-err')
  if (!u || !p) { err.textContent = "Nom et mot de passe requis."; return }
  let r = await api("/api/auth/login", { username: u, password: p })
  if (r.error) { err.textContent = r.error; return }
  document.getElementById('auth-user').value = ''
  document.getElementById('auth-pass').value = ''
  err.textContent = ''
  connectWS(r.token, u)
}

window.doRegister = async () => {
  let u = document.getElementById('auth-user').value.trim()
  let p = document.getElementById('auth-pass').value.trim()
  let err = document.getElementById('auth-err')
  if (!u || !p) { err.textContent = "Nom et mot de passe requis."; return }
  if (p.length < 4) { err.textContent = "Mot de passe min 4 caracteres."; return }
  let r = await api("/api/auth/register", { username: u, password: p })
  if (r.error) { err.textContent = r.error; return }
  err.textContent = "Compte cree ! Connectez-vous."
}

function connectWS(tok, user) {
  token = tok; username = user
  document.getElementById('ws-status').textContent = "Connexion WebSocket..."
  ws = new WebSocket("ws://localhost:8081")
  ws.onopen = () => {
    document.getElementById('ws-status').textContent = "Connecte au serveur !"
    ws.send(JSON.stringify({ action: "auth", token }))
  }
  ws.onmessage = (e) => handleWS(JSON.parse(e.data))
  ws.onclose = () => {
    document.getElementById('ws-status').textContent = "Deconnecte. Reconnexion..."
    setTimeout(() => connectWS(token, username), 3000)
  }
  ws.onerror = () => { document.getElementById('ws-status').textContent = "Erreur de connexion" }
}

function handleWS(msg) {
  if (msg.action === "auth_ok") {
    document.getElementById('ws-status').textContent = "Authentifie, jointure de la partie..."
    ws.send(JSON.stringify({ action: "join_game", gameId: "carthage", username }))
  }
  if (msg.action === "auth_fail") {
    document.getElementById('ws-status').textContent = "Auth echouee"
  }
  if (msg.action === "init_room") {
    document.getElementById('auth-screen').style.display = 'none'
    let savedCiv = localStorage.getItem('carthage_civ')
    if (savedCiv && CIVS[savedCiv]) {
      chooseCiv(savedCiv)
    } else {
      document.getElementById('civ-screen').style.display = 'flex'
      document.getElementById('civ-welcome').textContent = "Bienvenue, " + username + ". Choisissez votre civilisation."
    }
  }
  if (msg.action === "carthage_state") {
    let state = msg.state
    document.getElementById('auth-screen').style.display = 'none'
    document.getElementById('civ-screen').style.display = 'none'
    let showCharScreen = state.you && state.players && state.players[state.you] && !state.players[state.you].character && state.turn === 1 && state.characters
    if (!showCharScreen) document.getElementById('char-screen').style.display = 'none'
    if (showCharScreen) { document.getElementById('char-screen').style.display = 'flex'; showCharacters(state.characters) }
    if (!showCharScreen) {
      document.getElementById('hud').style.display = 'block'
      document.getElementById('log').style.display = 'block'
      document.getElementById('players').style.display = 'block'
      document.getElementById('turn-btn').style.display = 'block'
    }
    if (!game) {
      game = new Game(ws)
      game.myId = state.you
      game.render = () => renderMap(game)
      game.render()
      game.initEvents()
    }
    game.updateState(state)
  }
  if (msg.action === "carthage_game_over") {
    document.getElementById('victory').style.display = 'flex'
    document.getElementById('vic-title').textContent = msg.winnerName + " a gagne !"
    document.getElementById('vic-text').textContent = "La partie est terminee."
  }
  if (msg.action === "carthage_battle") handleBattle(msg.battle)
  if (msg.action === "carthage_error") {
    if (game) game.log(msg.error || "Erreur")
  }
}

function handleBattle(b) {
  if (!b || !game) return
  let terr = game.territories.find(t => t.name === b.territory)
  if (terr) {
    let px = terr._px, py = terr._py
    addFX(game.fx, px, py, '#ffd700', 60, 7)
    addFX(game.fx, px, py, '#ff4757', 50, 6)
    addFX(game.fx, px, py, '#fff', 40, 5)
    if (b.wallsDestroyed > 0) {
      addFX(game.fx, px, py, '#8d3629', b.wallsDestroyed*3, 5)
      for (let i = 0; i < b.wallsDestroyed*2; i++) {
        let a = Math.random()*6.2832
        game.fx.push({x:px+(Math.random()-0.5)*30, y:py+(Math.random()-0.5)*30,
          vx:Math.cos(a)*(1+Math.random()*3), vy:Math.sin(a)*(1+Math.random()*3),
          life:20+Math.random()*15, ml:35, s:2+Math.random()*2.5, color:'#b23b2b', wall:true})
      }
    }
    if (b.attackerWins && b.wallsDestroyed !== undefined) {
      for (let i = 0; i < 20; i++) {
        let a = Math.random()*6.2832
        game.fx.push({x:px+(Math.random()-0.5)*20, y:py+(Math.random()-0.5)*20-10,
          vx:Math.cos(a)*(0.5+Math.random()*2), vy:-1-Math.random()*3,
          life:40+Math.random()*30, ml:70, s:1.5+Math.random()*2, color:'#c9a84c', flag:true})
      }
    }
    if (b.attacker && b.defender) {
      let atkTerr = game.territories.find(t => t.owner === b.attacker && t.adj && t.adj.includes(terr?.id))
      if (!atkTerr) atkTerr = game.territories.find(t => t.owner === b.attacker)
      if (atkTerr) projectile(game.fx, atkTerr._px, atkTerr._py, terr._px, terr._py, '#ff6b35')
    }
  }
  if (b.attacker === game.myId || b.defender === game.myId) {
    let bar = document.getElementById('battle-bar')
    let win = b.attackerWins ? 'VICTOIRE' : 'DEFAITE'
    let wallInfo = b.wallsDestroyed > 0 ? ' -' + b.wallsDestroyed : ''
    bar.style.background = b.attackerWins ? '#2a5a2a' : '#5a1a1a'
    bar.textContent = win + ' — ' + b.territory + wallInfo + ' : ' + b.atkLosses + '/' + b.defLosses
    bar.style.display = 'block'
    setTimeout(() => { bar.style.opacity = '0'
      setTimeout(() => { bar.style.display = 'none'; bar.style.opacity = '1' }, 500) }, 4000)
    let aname = game.players[b.attacker]?.username || '?'
    let dname = game.players[b.defender]?.username || '?'
    document.getElementById('br-title').innerHTML = win + ' — ' + b.territory
    document.getElementById('br-detail').innerHTML =
      aname + ' ('+b.attackers+') vs ' + dname + ' ('+b.defenders+')' +
      '<br><span>' + (b.attackerWins ? aname : dname) + ' gagne</span>'
    document.getElementById('br-loss').innerHTML =
      'Pertes : ' + b.atkLosses + ' / ' + b.defLosses +
      (b.wallsDestroyed > 0 ? ' - ' + b.wallsDestroyed + ' murs detruits' : '') +
      (b.lwReward ? ' +' + b.lwReward + ' LW' : '')
    document.getElementById('battle-report').style.display = 'block'
  }
}

function showCharacters(chars) {
  let el = document.getElementById('char-buttons')
  if (el.children.length > 0) return
  for (let [id, c] of Object.entries(chars)) {
    let d = document.createElement('div')
    d.style.cssText = 'background:#150e11;border:2px solid '+c.color+';padding:10px 16px;margin:6px;border-radius:8px;cursor:pointer;text-align:center;width:180px'
    d.onclick = () => chooseChar(id)
    d.innerHTML = '<div style="font-size:28px;margin-bottom:4px">' + (c.portrait || '?') + '</div>' +
      '<b style="color:'+c.color+';font-size:13px">' + c.name + '</b><br>' +
      '<span style="color:#e2a03d;font-size:10px">' + c.title + '</span><br>' +
      '<span style="color:#aaa;font-size:9px">' + c.desc + '</span>'
    el.appendChild(d)
  }
}

function chooseChar(charId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ action: "carthage_action", cmd: "choose_character", character: charId }))
  ws.send(JSON.stringify({ action: "carthage_action", cmd: "ready" }))
  document.getElementById('char-err').textContent = "En attente des autres joueurs..."
}

window.chooseCiv = (civId) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ action: "carthage_action", cmd: "choose_civilization", civilization: civId }))
  localStorage.setItem('carthage_civ', civId)
  document.getElementById('civ-err').textContent = "Civ choisie, choisis maintenant ton general..."
  document.getElementById('civ-screen').style.display = 'none'
  document.getElementById('char-screen').style.display = 'flex'
}

window.switchTab = (tab) => {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none')
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'))
  let tabEl = document.getElementById('tab-' + tab)
  if (!tabEl) return
  tabEl.style.display = 'block'
  let btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]')
  if (btn) btn.classList.add('active')
  if (game) game.refreshPanel()
}

window.gameRef = () => game
window.closeCityView = () => { if (game) closeCityView(game) }
window.submitFoundCity = () => { if (game) game.submitFoundCity() }
window.cancelFoundCity = () => { document.getElementById('found-city-dialog').style.display = 'none' }
window.confirmDestroyCity = () => { if (game) game.confirmDestroyCity() }
window.cancelDestroyCity = () => { document.getElementById('destroy-city-dialog').style.display = 'none' }

window.onload = () => {
  let b = document.getElementById('civ-buttons')
  Object.entries(CIVS).forEach(([k, v]) => {
    let d = document.createElement('div')
    d.style.cssText = 'background:#150e11;border:2px solid #8d3629;padding:12px 30px;margin:8px;border-radius:8px;cursor:pointer;text-align:center;width:300px'
    d.onmouseover = () => { d.style.borderColor = v.color; d.style.transform = 'scale(1.05)' }
    d.onmouseout = () => { d.style.borderColor = '#8d3629'; d.style.transform = 'scale(1)' }
    d.onclick = () => window.chooseCiv(k)
    d.innerHTML = "<h3 style='color:" + v.color + ";margin:4px 0'>" + v.name + "</h3>"
    b.appendChild(d)
  })
}
