export function computeVoronoi(territories) {
  if (!territories || territories.length < 2) return {}
  let pts = territories.filter(t => t.lon != null)
  let xs = pts.map(t => t._px), ys = pts.map(t => t._py)
  let minX = Math.min(...xs) - 200, maxX = Math.max(...xs) + 200
  let minY = Math.min(...ys) - 200, maxY = Math.max(...ys) + 200

  let cells = {}
  for (let t of pts) {
    let poly = [{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}]
    for (let o of pts) {
      if (o.id === t.id) continue
      let mx = (t._px + o._px)/2, my = (t._py + o._py)/2
      let nx = o._px - t._px, ny = o._py - t._py
      poly = clipHalfPlane(poly, mx, my, nx, ny)
      if (poly.length < 3) break
    }
    if (poly.length >= 3) cells[t.id] = poly
  }
  return cells
}

function clipHalfPlane(poly, mx, my, nx, ny) {
  let out = []
  for (let i = 0; i < poly.length; i++) {
    let j = (i + 1) % poly.length
    let pi = poly[i], pj = poly[j]
    let di = (pi.x - mx) * nx + (pi.y - my) * ny
    let dj = (pj.x - mx) * nx + (pj.y - my) * ny
    if (di <= 0) out.push(pi)
    if ((di < 0 && dj > 0) || (di > 0 && dj < 0)) {
      let t = -di / (dj - di)
      out.push({x: pi.x + t * (pj.x - pi.x), y: pi.y + t * (pj.y - pi.y)})
    }
  }
  return out
}
