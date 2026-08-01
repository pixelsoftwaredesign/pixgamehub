export function addFX(fx, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    let a = Math.random() * 6.2832, s = 0.3 + Math.random() * (speed || 3)
    fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:15+Math.random()*25,ml:40,s:1+Math.random()*2.5,color})
  }
}

export function projectile(fx, x1, y1, x2, y2, color) {
  let dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy), steps = Math.min(60, Math.max(10, dist/3))
  for (let i = 0; i < steps; i++) {
    let t = i / steps, px = x1 + dx * t + (Math.random()-0.5)*12, py = y1 + dy * t + (Math.random()-0.5)*12
    fx.push({x:px,y:py,vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3 - 0.5,
      life:20+Math.random()*10,ml:30,s:0.5+Math.random(),color})
  }
}

export function renderParticles(ctx, fx) {
  for (let i = fx.length - 1; i >= 0; i--) {
    let p = fx[i]
    p.x += p.vx || 0; p.y += p.vy || 0; p.life--
    ctx.globalAlpha = Math.max(0, p.life / p.ml)
    if (p.wall) {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x-2, p.y-2, 4+p.s*0.5, 4+p.s*0.5)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(p.x-2, p.y-2, 4+p.s*0.5, 4+p.s*0.5)
    } else if (p.flag) {
      ctx.strokeStyle = '#6b3a2a'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(p.x, p.y+5); ctx.lineTo(p.x, p.y-8); ctx.stroke()
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.moveTo(p.x+1, p.y-8); ctx.lineTo(p.x+8, p.y-5); ctx.lineTo(p.x+1, p.y-2); ctx.closePath(); ctx.fill()
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s*(0.4+0.6*p.life/p.ml), 0, 6.2832); ctx.fill()
    }
    if (p.life <= 0) fx.splice(i, 1)
  }
  ctx.globalAlpha = 1
}
