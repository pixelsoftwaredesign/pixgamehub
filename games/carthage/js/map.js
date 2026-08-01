import { COLORS, proj } from './config.js'
import { renderParticles } from './particles.js'

export function renderMap(game) {
  let ctx = game.ctx, cam = game.cam
  ctx.save()
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.translate(cam.x, cam.y)
  ctx.scale(cam.zoom, cam.zoom)

  ctx.fillStyle = 'rgba(15,40,70,0.5)'
  ctx.fillRect(-6000, -4000, 20000, 14000)

  if (game.mapLoaded && game.mapPaths.length) {
    ctx.beginPath()
    for (let pts of game.mapPaths) {
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y)
      ctx.closePath()
    }
    ctx.fillStyle = '#4a6a3a'
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,40,10,0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // Voronoi
  let pList = Object.keys(game.players)
  let vor = game._voronoi
  if (vor) {
    for (let t of game.territories) {
      let poly = vor[t.id]
      if (!poly || poly.length < 3) continue
      let pIdx = pList.indexOf(t.owner), color = t.owner ? COLORS[Math.max(0, pIdx) % COLORS.length] : null
      if (!color) continue
      ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y)
      for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.globalAlpha = t.id === game.selId ? 0.3 : 0.12; ctx.fill(); ctx.globalAlpha = 1
      ctx.strokeStyle = color; ctx.lineWidth = t.id === game.selId ? 1.5 : 0.5
      ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1
    }
  }

  for (let t of game.territories) {
    if (t.lon == null) continue
    let px = t._px, py = t._py
    let pIdx = pList.indexOf(t.owner), color = t.owner ? COLORS[Math.max(0, pIdx) % COLORS.length] : '#555'
    let r = t.capital ? 3.5 : 2.5, isSel = t.id === game.selId, isMine = t.owner === game.myId

    if (t.owner) {
      ctx.globalAlpha = 0.08; ctx.fillStyle = color
      ctx.fill(octPath(px, py, r + 5)); ctx.fill(octPath(px, py, r + 9))
      ctx.globalAlpha = 1
    }
    ctx.shadowColor = color; ctx.shadowBlur = isSel ? 10 : 5
    let oct = octPath(px, py, isSel ? r + 2 : r)
    ctx.fillStyle = 'rgba(10,5,8,0.92)'; ctx.fill(oct)
    ctx.strokeStyle = color; ctx.lineWidth = isSel ? 2.5 : (isMine ? 1.8 : 1); ctx.stroke(oct)
    ctx.shadowBlur = 0

    if (isSel) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 200)
      ctx.stroke(octPath(px, py, r + 5)); ctx.globalAlpha = 1
    }

    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'
    ctx.fillText(t.name, px, py - r - 6)
    ctx.fillStyle = isMine ? '#c9a84c' : '#aaa'; ctx.font = '6px monospace'
    ctx.fillText('🛡' + (t.army || 0), px, py + r + 7)
    ctx.font = '6px monospace'
    ctx.fillText(t.capital ? '🏛' : t.type === 'port' ? '⚓' : t.type === 'fort' ? '🏰' : '🏘', px, py + 1)

    if (t.owner && t.fortLevel > 0) {
      ctx.fillStyle = '#c9a84c'
      for (let fi = 0; fi < Math.min(t.fortLevel, 5); fi++)
        ctx.fillRect(px - 3 + fi * 2.5 - 0.6, py + r + 12 - 0.6, 1.2, 1.2)
    }
  }

  // Attack lines
  if (game.selId != null) {
    let srcT = game.territories.find(t => t.id === game.selId)
    if (srcT && srcT.owner === game.myId && srcT.lon != null) {
      for (let t of game.territories) {
        if (t.owner && t.owner !== game.myId && srcT.adj && srcT.adj.includes(t.id) && t.lon != null) {
          ctx.save()
          ctx.globalAlpha = 0.12 + 0.1 * Math.sin(Date.now() / 300)
          ctx.strokeStyle = '#c94a3a'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
          ctx.beginPath(); ctx.moveTo(srcT._px, srcT._py)
          let mx = (srcT._px + t._px) / 2, my = (srcT._py + t._py) / 2 - 15
          ctx.quadraticCurveTo(mx, my, t._px, t._py); ctx.stroke(); ctx.setLineDash([])
          ctx.globalAlpha = 0.15 + 0.15 * Math.sin(Date.now() / 200 + t.id)
          ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 1
          let pr = 10 + 5 * Math.sin(Date.now() / 250 + t.id)
          ctx.beginPath(); ctx.arc(t._px, t._py, pr, 0, 6.2832); ctx.stroke()
          ctx.restore()
        }
      }
    }
  }

  // Fleet
  for (let t of game.territories) {
    if (!t.owner || t.lon == null) continue
    let me = game.players[t.owner], ships = me ? (me.ships || 0) : 0
    if (ships > 0 && (t.type === 'port' || t.type === 'city' || t.capital)) {
      let pIdx = pList.indexOf(t.owner), color = pIdx >= 0 ? COLORS[pIdx % COLORS.length] : '#555'
      for (let fi = 0; fi < Math.min(ships, 8); fi++) {
        let ang = Date.now() / 2000 + fi * 0.8
        ctx.save(); ctx.translate(t._px + Math.cos(ang) * 12, t._py + Math.sin(ang) * 12)
        ctx.rotate(ang + 1.57); ctx.fillStyle = color
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(ang)
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(4, 3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill()
        ctx.restore()
      }
    }
  }

  ctx.restore()
  renderParticles(ctx, game.fx)
  requestAnimationFrame(() => game.render ? game.render() : null)
}

function octPath(cx, cy, r) {
  let p = new Path2D()
  for (let i = 0; i < 8; i++) {
    let a = Math.PI * i / 4 + Math.PI / 8
    let x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)
  }
  p.closePath()
  return p
}
