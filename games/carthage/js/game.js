import { COLORS, proj } from './config.js'
import { computeVoronoi } from './voronoi.js'
import { addFX, renderParticles, projectile } from './particles.js'
import { openCityView, closeCityView } from './cities.js'

export class Game {
  constructor(ws) {
    this.ws = ws
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.territories = []
    this.players = {}
    this.myId = null
    this.turn = 1
    this.selId = null
    this.fx = []
    this.mapLoaded = false
    this.mapPaths = []
    this._voronoi = {}
    this._cityTerr = null
    this._cityTool = 'wall'
    this._siegeToggles = {bombard:false, ram:false, catapult:false, naval:false}
    this.alliances = []
    this.pendingAlliances = []
    this.marketItems = {}
    this.chronicles = []
    this._setupVisible = false
    this._foundLon = null
    this._foundLat = null
    this._destroyTid = null
    this.cam = { x: -400, y: -160, zoom: 0.6 }
    this.resize()
    this.loadMapData()
  }

  resize() { this.canvas.width = innerWidth; this.canvas.height = innerHeight }

  async loadMapData() {
    try {
      let r = await fetch('/games/carthage/data/world.geojson')
      let geo = await r.json(); this.mapPaths = []
      for (let feat of geo.features) {
        let geom = feat.geometry
        let polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
        for (let poly of polys) {
          let ring = poly[0]; if (!ring || ring.length < 4) continue
          let pts = ring.map(c => proj(c[0], c[1]))
          if (pts.some(p => p.x > -5000 && p.x < 8000 && p.y > -3000 && p.y < 5000)) this.mapPaths.push(pts)
        }
      }
      this.mapLoaded = true
    } catch(e) { console.warn('Map load failed', e) }
  }

  send(cmd, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ action: "carthage_action", cmd, ...data }))
  }

  s2w(sx, sy) { return { x: (sx - this.cam.x) / this.cam.zoom, y: (sy - this.cam.y) / this.cam.zoom } }

  log(text) {
    let el = document.getElementById('log-content')
    el.innerHTML = text + "<br>" + (el.innerHTML || "")
  }

  updateState(state) {
    let oldOwners = {}
    for (let t of this.territories) oldOwners[t.id] = t.owner
    this.territories = state.territories || []
    this.players = state.players || {}
    this.myId = state.you || this.myId
    this.turn = state.turn || 1
    this.alliances = state.alliances || []
    this.pendingAlliances = state.pendingAlliances || []
    this.marketItems = state.marketItems || {}
    this.chronicles = state.chronicles || []
    for (let t of this.territories) {
      if (t.lon != null && t.lat != null) {
        let pp = proj(t.lon, t.lat); t._px = pp.x; t._py = pp.y
      }
    }
    this._voronoi = computeVoronoi(this.territories)
    for (let t of this.territories) {
      let old = oldOwners[t.id]
      if (old !== undefined && old !== t.owner && t.owner) {
        let pList = Object.keys(this.players), pIdx = pList.indexOf(t.owner)
        addFX(this.fx, t._px, t._py, COLORS[Math.max(0, pIdx) % COLORS.length], 35, 5)
        addFX(this.fx, t._px, t._py, '#fff', 15, 3)
      }
    }
    this.updateHUD()
    if (state.phase === "setup" && this.players[this.myId] && !this.players[this.myId].setupDone) {
      document.getElementById('setup-screen').style.display = 'flex'
      if (!this._setupVisible) { this.showSetup(); this._setupVisible = true }
      document.getElementById('turn-btn').style.display = 'none'
    } else if (this._setupVisible) {
      document.getElementById('setup-screen').style.display = 'none'
      this._setupVisible = false
      document.getElementById('turn-btn').style.display = 'block'
    }
    let pList = Object.keys(this.players)
    document.getElementById('players-list').innerHTML = pList.map(id => {
      let p = this.players[id]
      let c = COLORS[Math.max(0, pList.indexOf(id)) % COLORS.length]
      return "<span style='color:" + c + "'>" + (id === this.myId ? "▶ " : "") + (p?.username || "") + (p?.ready ? " ✅" : " ⏳") + "</span><br>"
    }).join("")
    if (state.log && state.log.length) {
      document.getElementById('log-content').innerHTML =
        state.log.slice(-5).map(l => "[" + l.sender + "] " + l.text).join("<br>") + "<br>" +
        (document.getElementById('log-content').innerHTML || "")
    }
    let turnBtn = document.getElementById('turn-btn')
    if (this.players[this.myId]?.ready) {
      turnBtn.textContent = 'Tour termine'; turnBtn.disabled = true
    } else {
      turnBtn.textContent = 'Fin du tour'; turnBtn.disabled = false
    }
    if (document.getElementById('tab-panel').style.display !== 'none') this.refreshPanel()
  }

  updateHUD() {
    let me = this.players[this.myId]
    if (!me) { document.getElementById('hud').style.display = 'none'; return }
    document.getElementById('hud').style.display = 'block'
    document.getElementById('hud-title').innerText = (me.civilization || "?").toUpperCase() + " — " + (me.username || "")
    document.getElementById('hud-gold').innerText = me.gold || 0
    document.getElementById('hud-food').innerText = me.food || 0
    document.getElementById('hud-army').innerText = me.totalArmy || 0
    document.getElementById('hud-moral').innerText = me.moral || 0
    document.getElementById('hud-stone').innerText = me.stone || 0
    document.getElementById('hud-wood').innerText = me.wood || 0
    document.getElementById('hud-marble').innerText = me.marble || 0
    document.getElementById('hud-weapons').innerText = me.weapons || 0
    document.getElementById('hud-ships').innerText = me.ships || 0
    document.getElementById('hud-lw').innerText = me.lwPoints || 0
    document.getElementById('hud-pop').innerText = this.territories.filter(t => t.owner === this.myId).reduce((s, t) => s + (t.population || 0), 0).toLocaleString()
    document.getElementById('hud-turn').innerText = this.turn
  }

  initEvents() {
    let canvas = this.canvas
    addEventListener('resize', () => this.resize())
    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        let inp = document.getElementById('chat-input')
        let txt = inp.value.trim()
        if (txt) { this.send('chat', {text: txt}); inp.value = '' }
      }
    })
    document.getElementById('found-city-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.submitFoundCity()
    })
    canvas.onwheel = (e) => {
      e.preventDefault()
      let mx = e.clientX, my = e.clientY
      let wx = (mx - this.cam.x) / this.cam.zoom, wy = (my - this.cam.y) / this.cam.zoom
      this.cam.zoom = Math.max(0.3, Math.min(5, this.cam.zoom * (e.deltaY < 0 ? 1.1 : 0.9)))
      this.cam.x = mx - wx * this.cam.zoom
      this.cam.y = my - wy * this.cam.zoom
    }
    let dragging = false, dragSX = 0, dragSY = 0
    canvas.onmousedown = (e) => {
      if (e.button === 2) {
        document.getElementById('tab-panel').style.display = 'none'
        let w = this.s2w(e.clientX, e.clientY)
        let hit = null
        for (let t of this.territories) {
          if (Math.hypot((t._px||0) - w.x, (t._py||0) - w.y) < 12) { hit = t; break }
        }
        if (hit && hit.owner === this.myId && !hit.capital) {
          this._destroyTid = hit.id
          document.getElementById('destroy-city-name').textContent = hit.name
          document.getElementById('destroy-city-dialog').style.display = 'block'
        } else if (!hit) {
          this._foundLon = null; this._foundLat = null
          document.getElementById('found-city-input').value = ''
          document.getElementById('found-city-err').textContent = ''
          document.getElementById('found-city-dialog').style.display = 'block'
          setTimeout(() => document.getElementById('found-city-input').focus(), 100)
        }
        return
      }
      let w = this.s2w(e.clientX, e.clientY)
      let hit = null
      for (let t of this.territories) {
        if (Math.hypot((t._px||0) - w.x, (t._py||0) - w.y) < 12) { hit = t; break }
      }
      if (hit) {
        if (hit.owner === this.myId) {
          this.selId = hit.id
          openCityView(this, hit)
        } else if (this.selId !== null) {
          let srcT = this.territories.find(t => t.id === this.selId)
          if (srcT && srcT.owner === this.myId) {
            let extra = {}
            let s = this._siegeToggles || {}
            if (s.bombard) extra.bombard = true
            if (s.ram) extra.ram = true
            if (s.catapult) extra.catapult = true
            if (s.naval) extra.naval = true
            this.send('attack', { from: this.selId, to: hit.id, ...extra })
            projectile(this.fx, srcT._px, srcT._py, hit._px, hit._py, '#ff6b35')
            this.log("Attaque lancee sur " + hit.name + " !")
          }
          document.getElementById('tab-panel').style.display = 'none'
          this.selId = null
        } else {
          this.log("Selectionne d'abord un de tes territoires")
        }
      } else {
        document.getElementById('tab-panel').style.display = 'none'
        this.selId = null
        dragging = true
        dragSX = e.clientX - this.cam.x
        dragSY = e.clientY - this.cam.y
      }
    }
    addEventListener('mousemove', e => { if (dragging) { this.cam.x = e.clientX - dragSX; this.cam.y = e.clientY - dragSY } })
    addEventListener('mouseup', () => { dragging = false })
    canvas.oncontextmenu = (e) => e.preventDefault()
  }

  endTurn() {
    this.send('ready')
    document.getElementById('turn-btn').textContent = 'En attente...'
    document.getElementById('turn-btn').disabled = true
  }

  showChronicles() {
    let list = document.getElementById('chronicles-list')
    let overlay = document.getElementById('chronicles-overlay')
    if (!this.chronicles.length) {
      list.innerHTML = '<div style="color:#888">Aucune chronique.</div>'
    } else {
      list.innerHTML = this.chronicles.slice().reverse().map(c => {
        return '<div style="border-bottom:1px solid #222;padding:4px 0">' +
          '<span style="color:#e2a03d;font-weight:bold">[' + (c.category||'EVT') + ']</span> ' +
          '<span style="color:#666">Tour ' + c.turn + '</span><br>' +
          '<span>' + c.text + '</span></div>'
      }).join('')
    }
    overlay.style.display = 'block'
  }

  submitFoundCity() {
    let inp = document.getElementById('found-city-input')
    let name = inp.value.trim()
    if (!name || name.length < 2) {
      document.getElementById('found-city-err').textContent = 'Nom invalide (min 2 caracteres)'
      return
    }
    this.send('found_city', { lon: this._foundLon, lat: this._foundLat, name })
    document.getElementById('found-city-dialog').style.display = 'none'
  }

  confirmDestroyCity() {
    this.send('destroy_city', { tid: this._destroyTid })
    document.getElementById('destroy-city-dialog').style.display = 'none'
  }

  showTargets(src) {
    let el = document.getElementById('tab-military')
    let enemies = this.territories.filter(t => t.owner !== this.myId)
    let srcTerr = this.territories.find(t => t.id === src?.id)
    let html = '<h5>' + (srcTerr ? srcTerr.name : 'Territoire') + ' — ' + (srcTerr ? srcTerr.army : 0) + '</h5>'
    if (srcTerr && srcTerr.owner === this.myId) {
      html += '<div style="margin:4px 0">' +
        '<button class="btn-sm" onclick="window.gameRef().send(\'recruit\',{tid:' + srcTerr.id + ',amount:50})">+50</button>' +
        '<button class="btn-sm" onclick="window.gameRef().send(\'recruit\',{tid:' + srcTerr.id + ',amount:100})">+100</button>' +
        '<button class="btn-sm" onclick="window.gameRef().send(\'recruit\',{tid:' + srcTerr.id + ',amount:250})">+250</button>' +
        '</div>'
      html += '<div style="margin:4px 0">' +
        '<button class="btn-sm" onclick="window.gameRef().send(\'fortify\',{tid:' + srcTerr.id + '})">Fortifier (or)</button>' +
        '<button class="btn-sm" onclick="window.gameRef().send(\'fortify\',{tid:' + srcTerr.id + ',use_stone:true})">Fortifier (pierre)</button>' +
        '<button class="btn-sm green-btn" onclick="window.gameRef().send(\'mobilize\',{tid:' + srcTerr.id + '})">Mobilisation</button>' +
        '</div>'
      let adjFriendly = this.territories.filter(t =>
        t.owner === this.myId && t.id !== srcTerr.id && srcTerr.adj && srcTerr.adj.includes(t.id)
      )
      if (adjFriendly.length) {
        html += '<div style="margin:4px 0;font-size:10px;color:#70a1ff">Deplacer :</div>'
        html += adjFriendly.map(t =>
          '<button class="btn-sm" onclick="window.gameRef().send(\'move_army\',{from:' + srcTerr.id + ',to:' + t.id + ',amount:50})">50 → ' + t.name + '</button>' +
          '<button class="btn-sm" onclick="window.gameRef().send(\'move_army\',{from:' + srcTerr.id + ',to:' + t.id + ',amount:200})">200 → ' + t.name + '</button>'
        ).join('')
      }
    }
    if (enemies.length && src?.id != null) {
      html += '<div style="margin:4px 0;font-size:10px;color:#ff6b35">Attaquer :</div>'
      let me = this.players[this.myId]
      let hasShips = me && me.ships > 0
      let srcIsPort = srcTerr && (srcTerr.type === "port" || srcTerr.type === "city" || srcTerr.capital)
      let s = this._siegeToggles || {}
      html += '<div style="font-size:9px;margin:3px 0;color:#aaa">' +
        '<label style="cursor:pointer;margin-right:6px"><input type="checkbox" ' + (s.bombard?'checked':'') +
        ' onchange="window.gameRef()._siegeToggles.bombard=this.checked;window.gameRef().refreshPanel()"> Bombard</label>' +
        '<label style="cursor:pointer;margin-right:6px"><input type="checkbox" ' + (s.ram?'checked':'') +
        ' onchange="window.gameRef()._siegeToggles.ram=this.checked;window.gameRef().refreshPanel()"> Belier</label>' +
        '<label style="cursor:pointer;margin-right:6px"><input type="checkbox" ' + (s.catapult?'checked':'') +
        ' onchange="window.gameRef()._siegeToggles.catapult=this.checked;window.gameRef().refreshPanel()"> Catapulte</label>'
      if (hasShips && srcIsPort) {
        html += '<label style="cursor:pointer;margin-right:6px"><input type="checkbox" ' + (s.naval?'checked':'') +
          ' onchange="window.gameRef()._siegeToggles.naval=this.checked;window.gameRef().refreshPanel()"> Navale</label>'
      }
      html += '</div>'
      html += enemies.map(t => {
        let isAdj = srcTerr && srcTerr.adj && srcTerr.adj.includes(t.id)
        let extra = ''
        if (s.bombard) extra += ',bombard:true'
        if (s.ram) extra += ',ram:true'
        if (s.catapult) extra += ',catapult:true'
        if (s.naval) extra += ',naval:true'
        let label = (s.naval?'⛵ ':'') + t.name + ' (' + t.army + ')'
        return '<button class="btn-sm ' + (isAdj?'red-btn':'') + '" onclick="window.gameRef().send(\'attack\',{from:' + src.id + ',to:' + t.id + extra + '});window.gameRef().closeP()">' + label + '</button>'
      }).join('')
    }
    if (srcTerr && srcTerr.owner === this.myId) {
      html += '<div style="margin-top:6px;padding-top:4px;border-top:1px solid #333;font-size:9px;color:#888">' +
        '<span style="color:#e2a03d">' + srcTerr.name + '</span>' +
        ' | Niv.' + (srcTerr.level||1) +
        ' | Fort.' + (srcTerr.fortLevel||0) +
        ' | ' + (srcTerr.population||'?').toLocaleString() +
        (srcTerr.capital ? ' | Capitale' : '') +
        '</div>'
    }
    el.innerHTML = html
  }

  closeP() {
    document.getElementById('tab-panel').style.display = 'none'
    this.selId = null
    this._siegeToggles = {bombard:false, ram:false, catapult:false, naval:false}
  }

  refreshPanel() {
    let activeTab = document.querySelector('.tab-btn.active')
    if (!activeTab) return
    let tab = activeTab.dataset.tab
    if (tab === 'military' && this.selId !== null) {
      let t = this.territories.find(x => x.id === this.selId)
      if (t) this.showTargets(t)
    }
    if (tab === 'economy') this.renderEconomy()
    if (tab === 'buildings') this.renderBuildings()
    if (tab === 'alliances') this.renderAlliances()
    if (tab === 'market') this.renderMarket()
    if (tab === 'lw') this.renderLW()
  }

  showSetup() {
    let me = this.players[this.myId]
    if (!me) return
    let content = document.getElementById('setup-content')
    let myTerrs = this.territories.filter(t => t.owner === this.myId)
    let html = '<table style="width:100%;font-size:11px;border-collapse:collapse">'
    html += '<tr style="color:#e2a03d"><th style="text-align:left;padding:4px">Territoire</th><th style="padding:4px">Pop</th><th style="padding:4px">Soldats</th><th style="padding:4px">Ajouter Pop</th><th style="padding:4px">Ajouter Soldats</th></tr>'
    for (let t of myTerrs) {
      html += '<tr style="border-top:1px solid #333">' +
        '<td style="padding:4px">' + t.name + '</td>' +
        '<td style="padding:4px;text-align:center">' + (t.population || 0) + '</td>' +
        '<td style="padding:4px;text-align:center">' + (t.army || 0) + '</td>' +
        '<td style="padding:4px;text-align:center"><input id="spop-' + t.id + '" type="number" min="0" max="' + (me.availablePopulation||0) + '" value="0" style="width:80px;background:#150e11;border:1px solid #555;color:#fff;padding:3px 5px;border-radius:3px;font-family:monospace;font-size:10px"></td>' +
        '<td style="padding:4px;text-align:center"><input id="sarm-' + t.id + '" type="number" min="0" max="' + (me.availableSoldiers||0) + '" value="0" style="width:80px;background:#150e11;border:1px solid #555;color:#fff;padding:3px 5px;border-radius:3px;font-family:monospace;font-size:10px">' +
        '<button class="btn-sm" onclick="window.gameRef().distributeToTerritory(' + t.id + ')">+</button></td>' +
        '</tr>'
    }
    html += '</table>'
    content.innerHTML = html
    this.updateSetupSummary()
  }

  updateSetupSummary() {
    let me = this.players[this.myId]
    if (!me) return
    document.getElementById('setup-summary').innerHTML =
      'Population restante: <b>' + (me.availablePopulation || 0).toLocaleString() + '</b> | ' +
      'Soldats restants: <b>' + (me.availableSoldiers || 0).toLocaleString() + '</b>'
  }

  distributeToTerritory(tid) {
    let pop = parseInt(document.getElementById('spop-' + tid).value) || 0
    let sold = parseInt(document.getElementById('sarm-' + tid).value) || 0
    if (pop <= 0 && sold <= 0) return
    this.send('distribute', { tid, population: pop, soldiers: sold })
  }

  finishSetup() { this.send('ready', {}) }

  renderEconomy() {
    let el = document.getElementById('tab-economy')
    let me = this.players[this.myId]
    if (!me) { el.innerHTML = ''; return }
    let html = '<h5>Ressources</h5>' +
      '<div style="font-size:10px;color:#aaa;margin:4px 0">' +
      'Or: ' + (me.gold||0) + ' | Nourriture: ' + (me.food||0) + '<br>' +
      'Bois: ' + (me.wood||0) + ' | Pierre: ' + (me.stone||0) + '<br>' +
      'Marbre: ' + (me.marble||0) + ' | Armes: ' + (me.weapons||0) + '<br>' +
      'Navires: ' + (me.ships||0) + ' | LW: ' + (me.lwPoints||0) +
      '</div>' +
      '<hr style="border-color:#333;margin:6px 0">' +
      '<h5>Actions</h5>' +
      '<div>' +
      '<button onclick="window.gameRef().send(\'economy_harvest\')">Moissonner (+50 nourriture)</button>' +
      '<button onclick="window.gameRef().send(\'economy_extract\')">Extraire (+30 pierre, +15 marbre)</button>' +
      '</div>' +
      '<div style="margin-top:4px">' +
      '<button onclick="window.gameRef().send(\'economy_ship\')" ' + ((me.wood||0) < 50 ? 'disabled' : '') + '>Construire navire (-50 bois)</button>' +
      '<button onclick="window.gameRef().send(\'economy_convoi\')" ' + ((me.stone||0) < 20 || (me.marble||0) < 10 ? 'disabled' : '') + '>Convoi maritime (-20 pierre, -10 marbre, +40 or)</button>' +
      '</div>'
    el.innerHTML = html
  }

  renderBuildings() {
    let el = document.getElementById('tab-buildings')
    let me = this.players[this.myId]
    if (!me) { el.innerHTML = ''; return }
    let types = [
      {key:'wheat',icon:'🌾'},{key:'olive',icon:'🫒'},{key:'resin',icon:'🌲'},{key:'vineyard',icon:'🍇'},
      {key:'granary',icon:'🏪'},{key:'quarry',icon:'⛏'},{key:'shipyard',icon:'⛵'},{key:'forge',icon:'⚒'},
      {key:'temple',icon:'☥'},{key:'walls',icon:'🏰'},{key:'market',icon:'🏪'},{key:'dock',icon:'⚓'},
      {key:'fortress',icon:'🏯'},{key:'pyramid',icon:'🗿'},{key:'observatory',icon:'🔭'},{key:'ballcourt',icon:'⚽'},
      {key:'chinampa',icon:'🌿'},{key:'sacbe',icon:'🛤'},{key:'codex',icon:'📜'},
    ]
    let selTerr = this.selId !== null ? this.territories.find(t => t.id === this.selId) : null
    let html = '<h5>Construire un batiment</h5>'
    if (!selTerr || selTerr.owner !== this.myId)
      html += '<div style="font-size:10px;color:#888;margin-bottom:4px">Cliquez sur un de vos territoires pour y construire.</div>'
    if (selTerr && selTerr.owner === this.myId)
      html += '<div style="font-size:10px;color:#aaa;margin-bottom:4px">' + selTerr.name + ' (Niv.' + selTerr.level + ', Or: ' + me.gold + ')</div>'
    types.forEach(t => {
      let already = selTerr && selTerr.buildings && selTerr.buildings.includes(t.key)
      let disabled = already || !selTerr || selTerr.owner !== this.myId
      html += '<button class="btn-sm" ' + (disabled ? 'disabled' : '') +
        ' onclick="window.gameRef().send(\'construct\',{tid:' + (selTerr?selTerr.id:0) + ',building:\'' + t.key + '\'})">' +
        t.icon + ' ' + t.key.charAt(0).toUpperCase() + t.key.slice(1) + '</button>'
    })
    if (selTerr && selTerr.buildings && selTerr.buildings.length) {
      let icons = {wheat:'🌾',olive:'🫒',resin:'🌲',vineyard:'🍇',granary:'🏪',quarry:'⛏',shipyard:'⛵',
        forge:'⚒',temple:'☥',walls:'🏰',market:'🏪',dock:'⚓',fortress:'🏯',pyramid:'🗿',
        observatory:'🔭',ballcourt:'⚽',chinampa:'🌿',sacbe:'🛤',codex:'📜'}
      html += '<div style="margin-top:6px;font-size:10px;color:#aaa">Bat: ' + selTerr.buildings.map(b => icons[b]||'🏗').join(' ') + '</div>'
    }
    el.innerHTML = html
  }

  renderAlliances() {
    let el = document.getElementById('tab-alliances')
    let me = this.players[this.myId]
    if (!me) { el.innerHTML = ''; return }
    let others = Object.entries(this.players).filter(([id]) => id !== this.myId)
    let allies = this.alliances || []
    let myAllies = allies.filter(a => a.includes(this.myId))
    let pending = this.pendingAlliances || []
    let html = '<h5>Diplomatie</h5>'
    if (myAllies.length) {
      html += '<div style="margin:4px 0;color:#2ed573">Allies:</div>'
      myAllies.forEach(a => {
        let allyId = a[0] === this.myId ? a[1] : a[0]
        let name = this.players[allyId]?.username || '?'
        html += '<div style="font-size:10px;margin:2px 0">' + name +
          ' <button class="btn-sm red-btn" onclick="window.gameRef().send(\'break_alliance\',{ally:\'' + allyId + '\'})">Rompre</button></div>'
      })
    }
    let received = pending.filter(p => p.to === this.myId)
    if (received.length) {
      html += '<div style="margin-top:6px;color:#ffa502">Propositions recues:</div>'
      received.forEach(p => {
        let name = this.players[p.from]?.username || '?'
        html += '<div style="font-size:10px;margin:2px 0">' + name +
          ' <button class="btn-sm green-btn" onclick="window.gameRef().send(\'accept_alliance\',{from:\'' + p.from + '\'})">Accepter</button>' +
          ' <button class="btn-sm red-btn" onclick="window.gameRef().send(\'reject_alliance\',{from:\'' + p.from + '\'})">Refuser</button></div>'
      })
    }
    html += '<div style="margin-top:6px;color:#aaa">Proposer:</div>'
    others.forEach(([id, p]) => {
      let isPending = pending.some(pp => pp.from === this.myId && pp.to === id)
      let isAlly = myAllies.some(a => a.includes(id))
      html += '<button class="btn-sm" ' + (isPending||isAlly ? 'disabled' : '') +
        ' onclick="window.gameRef().send(\'propose_alliance\',{to:\'' + id + '\'})">' +
        (isPending ? 'En attente' : isAlly ? 'Allie' : p.username||'?') + '</button>'
    })
    el.innerHTML = html
  }

  renderMarket() {
    let el = document.getElementById('tab-market')
    let me = this.players[this.myId]
    if (!me) { el.innerHTML = ''; return }
    let items = this.marketItems || {}
    let html = '<h5>Marche</h5><div style="font-size:10px;color:#aaa;margin-bottom:4px">Or: ' + me.gold + ' | LW: ' + (me.lwPoints||0) + '</div>'
    Object.entries(items).forEach(([id, item]) => {
      let canBuy = (me.gold||0) >= (item.cost_gold||0) && (me.lwPoints||0) >= (item.cost_lw||0) && (me.wood||0) >= (item.cost_wood||0)
      let rarityColor = {'commun':'#aaa','rare':'#2ecc71','epique':'#9b59b6','legendaire':'#f1c40f','mythique':'#e74c3c'}
      html += '<div style="display:flex;align-items:center;margin:3px 0;font-size:10px;border-bottom:1px solid #222;padding:3px 0">' +
        '<span style="font-size:16px;margin-right:8px">' + (item.icon||'📦') + '</span>' +
        '<div style="flex:1"><b style="color:' + (rarityColor[item.rarity]||'#aaa') + '">' + item.name + '</b> ' +
        '<span style="color:#666">' + (item.cost_gold?item.cost_gold+'💰 ':'') + (item.cost_lw?item.cost_lw+'🏆 ':'') + (item.cost_wood?item.cost_wood+'🪵':'') + '</span><br>' +
        '<span style="color:#888">' + (item.desc||'') + '</span></div>' +
        '<button class="btn-sm" ' + (!canBuy?'disabled':'') +
        ' onclick="window.gameRef().send(\'market_buy\',{item_id:\'' + id + '\'})">Acheter</button></div>'
    })
    el.innerHTML = html
  }

  setCityTool(tool) {
    this._cityTool = tool
    let names = {
      wall:'Mur', wall_2:'Mur+', wall_3:'Citadelle',
      street:'Rue', plaza:'Place', hammam:'Hammam',
      temple_small:'Temple', garden:'Jardin', fountain:'Fontaine',
      tree:'Arbre', pine:'Pin', rocks:'Rocher', mountain:'Montagne',
      barracks:'Caserne', market:'Marche', house:'Logement'
    }
    let costs = { wall:30, wall_2:60, wall_3:120, street:5, plaza:40, hammam:60,
      temple_small:50, garden:20, fountain:35, tree:15, pine:25,
      rocks:25, mountain:45, barracks:100, market:80, house:50 }
    document.getElementById('city-tool-status').textContent =
      (names[tool]||tool) + ' (' + (costs[tool]||'?') + ')'
    document.querySelectorAll('.city-tool-btn').forEach(b => {
      b.style.background = b.dataset.tool === tool ? '#c9a84c' : '#2a1a12'
      b.style.color = b.dataset.tool === tool ? '#0a0608' : '#8a7a6a'
      b.style.borderColor = b.dataset.tool === tool ? '#c9a84c' : '#3a2a1a'
    })
  }

  autoLandscape(tid) {
    let t = this.territories.find(x => x.id === tid)
    if (!t || !t.interior_grid) return
    let items = ['tree','pine','rocks','garden','street','tree']
    let oct = (r,c) => {
      let GS = 12
      if (r===0||r===GS-1) return c>=4&&c<=7
      if (r===1||r===GS-2) return c>=3&&c<=8
      if (r===2||r===GS-3) return c>=2&&c<=9
      if (r===3||r===GS-4) return c>=1&&c<=10
      return c>=0&&c<=GS-1
    }
    for (let r = 0; r < t.interior_grid.length; r++)
      for (let c = 0; c < t.interior_grid[r].length; c++)
        if (t.interior_grid[r][c] === null && oct(r, c))
          this.send('build_interior', {tid, building: items[Math.floor(Math.random()*items.length)], gx:c, gy:r})
    document.getElementById('city-msg').textContent = 'Paysage automatique lance...'
  }

  renderLW() {
    let el = document.getElementById('tab-lw')
    let me = this.players[this.myId]
    if (!me) { el.innerHTML = ''; return }
    let lwItems = [
      {key:'weapons', name:'Lot d\'armes', icon:'⚔️', cost:30, desc:'+10 armes'},
      {key:'ship', name:'Navire', icon:'⛵', cost:50, desc:'+1 navire'},
      {key:'factory', name:'Usine', icon:'🏭', cost:80, desc:'+2 armes/tour'},
    ]
    let html = '<h5>Points de Guerre (LW)</h5><div style="font-size:10px;color:#aaa;margin-bottom:4px">LW: ' + (me.lwPoints||0) + '</div>'
    lwItems.forEach(item => {
      let canBuy = (me.lwPoints||0) >= item.cost
      html += '<div style="margin:3px 0">' +
        '<button class="btn-sm" ' + (!canBuy?'disabled':'') +
        ' onclick="window.gameRef().send(\'build_lw\',{item:\'' + item.key + '\'})">' +
        item.icon + ' ' + item.name + ' (' + item.cost + ' LW)</button>' +
        ' <span style="font-size:9px;color:#888">' + item.desc + '</span></div>'
    })
    el.innerHTML = html
  }
}
