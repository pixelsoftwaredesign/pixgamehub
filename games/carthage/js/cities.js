import { CITY_BUILDINGS, TILE_COLORS } from './config.js'

export function openCityView(game, t) {
  game.selId = t.id
  game._cityTool = 'wall'
  document.getElementById('city-overlay').style.display = 'block'
  setTimeout(() => renderCityView(game, t), 60)
}

export function closeCityView(game) {
  document.getElementById('city-overlay').style.display = 'none'
  game.selId = null
}

export function setCityTool(game, tool) {
  game._cityTool = tool
  let names = {
    wall:'🧱 Mur', wall_2:'🧱 Mur+', wall_3:'🏰 Citadelle',
    street:'🛤 Rue', plaza:'⛲ Place', hammam:'♨️ Hammam',
    temple_small:'☥ Temple', garden:'🌺 Jardin', fountain:'⛲ Fontaine',
    tree:'🌲 Arbre', pine:'🌲 Pin', rocks:'⛰ Rocher', mountain:'🗻 Montagne',
    barracks:'⚔️ Caserne', market:'💰 Marche', house:'🏠 Logement'
  }
  let costs = { wall:30, wall_2:60, wall_3:120, street:5, plaza:40, hammam:60,
    temple_small:50, garden:20, fountain:35, tree:15, pine:25,
    rocks:25, mountain:45, barracks:100, market:80, house:50 }
  document.getElementById('city-tool-status').textContent =
    (names[tool]||tool) + ' (' + (costs[tool]||'?') + '💰)'
  document.querySelectorAll('.city-tool-btn').forEach(b => {
    b.style.background = b.dataset.tool === tool ? '#c9a84c' : '#2a1a12'
    b.style.color = b.dataset.tool === tool ? '#0a0608' : '#8a7a6a'
    b.style.borderColor = b.dataset.tool === tool ? '#c9a84c' : '#3a2a1a'
  })
}

function renderCityView(game, t) {
  let me = game.players[game.myId]
  if (!me) return
  game._cityTerr = t
  let ig = t.interior_grid || []
  let wallCount = ig.flat().filter(c => c && c.startsWith('wall')).length
  document.getElementById('city-title').textContent = t.name + (t.capital ? ' 🏛 Capitale' : '')
  document.getElementById('city-stats').textContent =
    '👥 ' + (t.population||0).toLocaleString() +
    ' | 🛡 ' + (t.army||0) +
    ' | 🏰 Niv.' + (t.level||1) +
    ' | 🧱 ' + wallCount + ' murs' +
    ' | 🌲 ' + (me.wood||0) + ' ⛰ ' + (me.stone||0) +
    ' | 🪙 ' + (me.gold||0)
  document.getElementById('city-upgrade-btn').onclick = () => game.send('upgrade_city', {tid:t.id})
  document.getElementById('city-upgrade-btn').textContent = '🏛 Ameliorer (' + ((t.level||1)*100) + '💰)'
  document.getElementById('city-auto-btn').onclick = () => game.autoLandscape(t.id)
  populateToolbar(game)
  game.setCityTool(game._cityTool || 'wall')
  renderCityCanvas(game, t)
}

function populateToolbar(game) {
  let tb = document.getElementById('city-toolbar')
  if (tb.children.length > 0) return
  let tools = [
    ['wall','🧱 Mur'],['wall_2','🧱 Mur+'],['wall_3','🏰 Citadelle'],
    ['street','🛤 Rue'],['plaza','⛲ Place'],['hammam','♨️ Hammam'],
    ['temple_small','☥ Temple'],['garden','🌺 Jardin'],['fountain','⛲ Fontaine'],
    ['tree','🌲 Arbre'],['pine','🌲 Pin'],['rocks','⛰ Rocher'],['mountain','🗻 Montagne'],
    ['barracks','⚔️ Caserne'],['market','💰 Marché'],['house','🏠 Logement'],
  ]
  for (let [tool, label] of tools) {
    let b = document.createElement('button')
    b.className = 'btn-sm city-tool-btn'
    b.dataset.tool = tool
    b.onclick = () => game.setCityTool(tool)
    b.textContent = label
    tb.appendChild(b)
  }
}

function renderCityCanvas(game, t) {
  let canvas = document.getElementById('city-canvas')
  if (!canvas) return
  let ig = t.interior_grid || []
  let GS = ig.length || 12
  let T = 52, P = 18, R = T / 2 * 0.86
  canvas.width = GS * T + P * 2
  canvas.height = GS * T + P * 2
  let ctx = canvas.getContext('2d')
  let oct = (r, c) => {
    if (r === 0 || r === GS-1) return c >= 4 && c <= 7
    if (r === 1 || r === GS-2) return c >= 3 && c <= 8
    if (r === 2 || r === GS-3) return c >= 2 && c <= 9
    if (r === 3 || r === GS-4) return c >= 1 && c <= 10
    return c >= 0 && c <= GS-1
  }
  let icons = {
    wall:'🧱',wall_2:'🧱',wall_3:'🏰',street:'🛤',plaza:'⛲',hammam:'♨️',
    temple_small:'☥',garden:'🌺',fountain:'⛲',tree:'🌲',pine:'🌲',rocks:'⛰',
    mountain:'🗻',barracks:'⚔️',market:'💰',house:'🏠',center:'🏛'
  }

  ctx.fillStyle = '#060306'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  function drawOctCell(cx, cy, r, fill, stroke, lw) {
    ctx.beginPath()
    let a0 = Math.PI / 8
    ctx.moveTo(cx + r*Math.cos(a0), cy + r*Math.sin(a0))
    for (let i = 1; i < 8; i++) {
      let a = Math.PI * i / 4 + a0
      ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
    }
    ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw||1; ctx.stroke() }
  }

  for (let r = 0; r < GS; r++) {
    for (let c = 0; c < GS; c++) {
      let cx = P + c*T + T/2, cy = P + r*T + T/2
      let cell = (ig[r] && ig[r][c]) || null
      if (!oct(r, c)) continue

      if (cell === null) {
        drawOctCell(cx, cy, R, '#120a0e', 'rgba(255,255,255,0.12)', 1)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.lineWidth = 1
        let h = R * 0.45
        ctx.beginPath()
        ctx.moveTo(cx-h, cy); ctx.lineTo(cx+h, cy)
        ctx.moveTo(cx, cy-h); ctx.lineTo(cx, cy+h)
        ctx.stroke()
      } else if (cell.startsWith('wall')) {
        let lvl = cell === 'wall_3' ? 3 : (cell === 'wall_2' ? 2 : 1)
        let wc = ['#5a2d22','#7a3d2a','#9a5d3a'][lvl-1]
        let wb = ['#8d3629','#b23b2b','#c9a84c'][lvl-1]
        drawOctCell(cx, cy, R, wc, wb, 1.5)
        ctx.save()
        ctx.beginPath()
        let a0 = Math.PI / 8
        ctx.moveTo(cx + R*0.85*Math.cos(a0), cy + R*0.85*Math.sin(a0))
        for (let i = 1; i < 8; i++) {
          let a = Math.PI * i / 4 + a0
          ctx.lineTo(cx + R*0.85*Math.cos(a), cy + R*0.85*Math.sin(a))
        }
        ctx.closePath(); ctx.clip()
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1
        for (let ly = cy - R*0.7; ly < cy + R*0.7; ly += 7) {
          ctx.beginPath(); ctx.moveTo(cx-R, ly); ctx.lineTo(cx+R, ly); ctx.stroke()
        }
        ctx.restore()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('L'+lvl, cx, cy-6)
        ctx.font = '15px serif'
        ctx.fillText('🧱', cx, cy+10)
      } else if (cell === 'center') {
        drawOctCell(cx, cy, R, '#6a5a2a', '#c9a84c', 1.5)
        let grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, R)
        grad.addColorStop(0, 'rgba(201,168,76,0.25)')
        grad.addColorStop(1, 'rgba(201,168,76,0)')
        drawOctCell(cx, cy, R, grad, null, 0)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('N'+(t.level||1), cx, cy-6)
        ctx.font = '22px serif'
        ctx.fillText('🏛', cx, cy+8)
      } else {
        drawOctCell(cx, cy, R, TILE_COLORS[cell]||'#2a2a2a', 'rgba(255,255,255,0.28)', 1)
        ctx.font = '19px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(icons[cell]||'⬜', cx, cy)
      }
    }
  }

  canvas.onclick = (e) => {
    let rect = canvas.getBoundingClientRect()
    let ratio = canvas.width / rect.width
    let mx = (e.clientX - rect.left) * ratio
    let my = (e.clientY - rect.top) * ratio
    let gc = Math.floor((mx - P) / T)
    let gr = Math.floor((my - P) / T)
    if (gc >= 0 && gr >= 0 && gc < GS && gr < GS && oct(gr, gc)) {
      let cx = P + gc*T + T/2, cy = P + gr*T + T/2
      if (Math.hypot(mx-cx, my-cy) <= R)
        cityTileClick(game, t, gr, gc)
    }
  }
}

function cityTileClick(game, t, r, c) {
  let ig = t.interior_grid || []
  let cell = (ig[r] && ig[r][c]) || null
  let tool = game._cityTool || 'wall'
  if (cell && cell.startsWith('wall')) {
    let next = cell === 'wall' ? 'wall_2' : (cell === 'wall_2' ? 'wall_3' : null)
    if (next) {
      game.send('build_interior', {tid:t.id, building:next, gx:c, gy:r})
      document.getElementById('city-msg').textContent = '🏗️ Mur ameliore...'
    } else
      document.getElementById('city-msg').textContent = '🏰 Mur au niveau maximum'
    return
  }
  if (cell === null) {
    game.send('build_interior', {tid:t.id, building:tool, gx:c, gy:r})
    let names = {wall:'Mur',wall_2:'Mur+',wall_3:'Citadelle',street:'Rue',plaza:'Place',
      hammam:'Hammam',temple_small:'Temple',garden:'Jardin',fountain:'Fontaine',
      tree:'Arbre',pine:'Pin',rocks:'Rocher',mountain:'Montagne',
      barracks:'Caserne',market:'Marche',house:'Logement'}
    document.getElementById('city-msg').textContent = '🏗️ '+(names[tool]||tool)+' en construction...'
    return
  }
  document.getElementById('city-msg').textContent = '⚠️ Case deja occupee'
}

function autoLandscape(game, tid) {
  let t = game.territories.find(x => x.id === tid)
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
        game.send('build_interior', {tid, building: items[Math.floor(Math.random()*items.length)], gx:c, gy:r})
  document.getElementById('city-msg').textContent = '🌳 Paysage automatique lance...'
}
