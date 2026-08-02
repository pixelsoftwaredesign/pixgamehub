import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const RADIUS = 10
const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#95a5a6']
const COLOR_NUMS = COLORS.map(c => new THREE.Color(c))
const EMPIRES = window.EMPIRES
const TERRITORIES = window.TERRITORIES
function empireHex(state, owner) {
  if (!owner || !state || !state.players) return null
  const emp = state.players[owner]?.empire
  return (emp && EMPIRES[emp]) ? EMPIRES[emp].color : null
}
function homeHex(t) {
  return (t.home && EMPIRES[t.home]) ? EMPIRES[t.home].color : null
}
function isAlly(state, owner) {
  if (!owner || !state || !state.you) return false
  return state.players[owner]?.empire === state.players[state.you]?.empire
}

// ─── Lat/Lon → 3D ─────────────────────────────────────────────────
function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

// Precompute 3D positions
for (const t of TERRITORIES) {
  t.pos = latLonToVec3(t.lat, t.lon, RADIUS)
  t._px = (t.lon + 6) * 70 + 400
  t._py = (48 - t.lat) * 70 + 100
}

// ─── Voronoi Polygon Computation ──────────────────────────────────
function computeTangentFrame(pos) {
  const up = pos.clone().normalize()
  const ref = new THREE.Vector3(0, 1, 0)
  if (Math.abs(up.dot(ref)) > 0.99) ref.set(1, 0, 0)
  const tangent1 = new THREE.Vector3().crossVectors(up, ref).normalize()
  const tangent2 = new THREE.Vector3().crossVectors(up, tangent1).normalize()
  return { up, tangent1, tangent2 }
}

function computeVoronoiPolygons() {
  const VR = RADIUS * 0.99

  for (const t of TERRITORIES) {
    const frame = computeTangentFrame(t.pos)
    const pts = []

    // Midpoints with neighbors
    for (const nid of t.adj) {
      const n = TERRITORIES.find(x => x.id === nid)
      if (!n) continue
      const mid = t.pos.clone().add(n.pos).normalize().multiplyScalar(VR)
      pts.push(mid)
    }

    // Also consider non-adjacent close points to fill gaps for 1-2 neighbor territories
    if (pts.length < 4) {
      for (const other of TERRITORIES) {
        if (other.id === t.id || t.adj.includes(other.id)) continue
        const dist = t.pos.distanceTo(other.pos)
        if (dist < RADIUS * 1.6) {
          const mid = t.pos.clone().add(other.pos).normalize().multiplyScalar(VR)
          pts.push(mid)
        }
        if (pts.length >= 6) break
      }
    }

    // Sort by azimuth angle in tangent frame
    pts.sort((a, b) => {
      const da = a.clone().sub(t.pos).normalize()
      const db = b.clone().sub(t.pos).normalize()
      return Math.atan2(da.dot(frame.tangent2), da.dot(frame.tangent1))
       - Math.atan2(db.dot(frame.tangent2), db.dot(frame.tangent1))
    })

    // If still too few, add radial points
    if (pts.length < 3) {
      const needed = 6
      for (let i = 0; i < needed; i++) {
        const angle = (i / needed) * Math.PI * 2 + t.id * 1.3
        const p = new THREE.Vector3()
          .addScaledVector(frame.up, 1)
          .addScaledVector(frame.tangent1, Math.cos(angle) * 0.7)
          .addScaledVector(frame.tangent2, Math.sin(angle) * 0.7)
          .normalize()
          .multiplyScalar(VR)
        pts.push(p)
      }
      pts.sort((a, b) => {
        const da = a.clone().sub(t.pos).normalize()
        const db = b.clone().sub(t.pos).normalize()
        return Math.atan2(da.dot(frame.tangent2), da.dot(frame.tangent1))
         - Math.atan2(db.dot(frame.tangent2), db.dot(frame.tangent1))
      })
    }

    t._polyPts = pts
  }
}

function createVoronoiMesh(t, color, opacity) {
  const pts = t._polyPts
  if (!pts || pts.length < 3) return null

  // Create convex geometry from polygon points extruded from sphere center
  const geo = new THREE.BufferGeometry()
  const vertices = []
  const indices = []
  const normals = []

  // Center point (slightly below surface)
  const center = t.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)

  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length
    // Triangle: center, pt_i, pt_next
    const vi = vertices.length / 3
    vertices.push(center.x, center.y, center.z)
    vertices.push(pts[i].x, pts[i].y, pts[i].z)
    vertices.push(pts[next].x, pts[next].y, pts[next].z)
    indices.push(vi, vi + 1, vi + 2)

    // Normals (face normal = center → outward)
    const n = center.clone().normalize()
    for (let k = 0; k < 3; k++) normals.push(n.x, n.y, n.z)
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  const mat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  })

  return new THREE.Mesh(geo, mat)
}

// ─── Procedural Globe Texture (fallback) ──────────────────────────
function makeProceduralTexture() {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 512
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(512, 256, 0, 512, 256, 400)
  grad.addColorStop(0, '#0a1628')
  grad.addColorStop(0.6, '#0d1f3c')
  grad.addColorStop(1, '#050d1a')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 512)

  ctx.strokeStyle = '#1a3a6a'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.3
  for (let lat = -80; lat <= 80; lat += 10) {
    const y = (90 - lat) / 180 * 512
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke()
  }
  for (let lon = -180; lon <= 180; lon += 10) {
    const x = (lon + 180) / 360 * 1024
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke()
  }

  function fillContinent(pts) {
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) {
      const [lon, lat] = pts[i]
      const x = (lon + 180) / 360 * 1024
      const y = (90 - lat) / 180 * 512
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#2a6a3a'; ctx.fill()
    ctx.globalAlpha = 0.2; ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 0.5; ctx.stroke()
  }
  fillContinent([[-10,50],[0,52],[5,51],[7,49],[5,47],[7,45],[5,43],[7,41],[12,42],[15,44],[20,46],[25,44],[30,45],[28,41],[25,39],[22,37],[24,35],[21,35],[15,37],[12,38],[10,37],[5,37],[3,36],[-2,37],[-5,36],[-8,37],[-10,40],[-10,45]])
  fillContinent([[-5,36],[-2,35],[0,33],[3,33],[5,34],[7,33],[10,35],[12,34],[15,33],[18,33],[20,32],[25,31],[30,31],[32,30],[35,32],[38,35],[36,36],[35,32],[32,28],[30,27],[25,28],[20,30],[15,30],[10,30],[5,32],[0,31],[-5,33],[-10,30],[-10,36]])
  fillContinent([[25,38],[28,38],[30,38],[32,37],[36,36],[38,35],[36,37],[32,39],[30,40],[28,41],[26,41],[25,40]])
  ctx.globalAlpha = 1
  return new THREE.CanvasTexture(c)
}

// ─── Globe3D Class ─────────────────────────────────────────────────
class Globe3D {
  constructor() {
    this.selectedId = null
    this.state = null
    this.animationTime = 0
    this._raycaster = new THREE.Raycaster()
    this._pointer = new THREE.Vector2()
    this._polysOutdated = true
  }

  init(container) {
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    this.camera.position.set(0, 6, 32)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.domElement.style.pointerEvents = 'auto'
    container.appendChild(this.renderer.domElement)
    this.container = container

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 16
    this.controls.maxDistance = 60
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.5
    this.controls.target.set(0, 0, 0)
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY }

    // Stars
    const starGeo = new THREE.BufferGeometry()
    const starCount = 3000
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 200
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0.6 }))
    this.scene.add(this.stars)

    // Globe with satellite texture (async load)
    this._initGlobeTexture()

    // Transparent sky clouds
    this._createClouds()

    // Outer glow
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.03, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.12, side: THREE.BackSide })
    )
    this.scene.add(this.glow)

    // Lights
    this.scene.add(new THREE.AmbientLight(0x222244, 0.5))
    const sun = new THREE.DirectionalLight(0xffeedd, 1.5)
    sun.position.set(10, 15, 5); this.scene.add(sun)
    const fill = new THREE.DirectionalLight(0x4488ff, 0.3)
    fill.position.set(-10, -5, -10); this.scene.add(fill)

    // Compute Voronoi polygons
    computeVoronoiPolygons()

    // Territory polygon group
    this.polyGroup = new THREE.Group()
    this.scene.add(this.polyGroup)

    // Territory dots
    this.dotGroup = new THREE.Group()
    this.scene.add(this.dotGroup)
    this.pointsGroup = new THREE.Group()
    this.dotGroup.add(this.pointsGroup)
    this._createTerritoryDots()

    // Adjacency lines
    this.lineGroup = new THREE.Group()
    this.scene.add(this.lineGroup)
    this._createAdjacencyLines()

    // Selection ring
    const ringGeo = new THREE.RingGeometry(0.25, 0.38, 24)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    this.ring = new THREE.Mesh(ringGeo, ringMat)
    this.scene.add(this.ring)

    this._setupInput()

    this._onResize = () => this._handleResize()
    window.addEventListener('resize', this._onResize)

    this._running = true
    this._animate = () => this._renderLoop()
    requestAnimationFrame(this._animate)
  }

  // ─── Texture Loading ─────────────────────────────────────────────
  _initGlobeTexture() {
    // Start with procedural fallback immediately
    const fallbackTex = makeProceduralTexture()
    this.globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 0.98, 48, 36),
      new THREE.MeshPhongMaterial({ map: fallbackTex, specular: 0x112244, shininess: 20 })
    )
    this.scene.add(this.globe)

    // Try to load real satellite texture
    const loader = new THREE.TextureLoader()
    const urls = [
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    ]
    let urlIdx = 0
    const tryLoad = () => {
      if (urlIdx >= urls.length) return
      loader.load(urls[urlIdx],
        tex => {
          this.globe.material.map = tex
          this.globe.material.needsUpdate = true
        },
        undefined,
        () => { urlIdx++; tryLoad() }
      )
    }
    tryLoad()
  }

  // ─── Clouds ──────────────────────────────────────────────────────
  _createClouds() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 512
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 1024, 512)

    const drawBlob = (x, y, r, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(255,255,255,${alpha})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < 220; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      const r = 20 + Math.random() * 70
      drawBlob(x, y, r, 0.05 + Math.random() * 0.25)
    }

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshLambertMaterial({
      map: tex, transparent: true, opacity: 0.18, depthWrite: false,
    })
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.06, 48, 36), mat)
    this.scene.add(this.clouds)

    this.clouds2 = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.09, 48, 36),
      new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.12, depthWrite: false })
    )
    this.scene.add(this.clouds2)
  }

  // ─── Voronoi Polygon Rendering ────────────────────────────────────
  _updatePolys(state) {
    while (this.polyGroup.children.length) {
      const c = this.polyGroup.children[0]
      c.geometry?.dispose()
      c.material?.dispose()
      this.polyGroup.remove(c)
    }

    for (const t of TERRITORIES) {
      const td = state?.territories ? state.territories[t.id] : null
      const owner = td ? td.owner : null
      const empHex = empireHex(state, owner)
      const color = empHex ? new THREE.Color(empHex) : new THREE.Color(0x222233)
      const mesh = createVoronoiMesh(t, color, owner ? 0.5 : 0.05)
      if (mesh) {
        mesh.renderOrder = -1
        mesh.userData.territoryId = t.id
        t._polyMesh = mesh
        this.polyGroup.add(mesh)
      }
    }
  }

  // ─── Territory Markers ───────────────────────────────────────────
  _createTerritoryDots() {
    for (const t of TERRITORIES) {
      const isCap = t.cap
      const up = t.pos.clone().normalize()

      // Colored light — soft glow sphere tinted by owner, ON the surface
      const gMat = new THREE.MeshBasicMaterial({
        color: 0x2244aa, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false,
      })
      const gGeo = new THREE.SphereGeometry((isCap ? 0.6 : 0.45) / 50, 16, 12)
      const glowM = new THREE.Mesh(gGeo, gMat)
      glowM.position.copy(up.clone().multiplyScalar(RADIUS * 0.985))
      glowM.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)
      t._glow = glowM
      this.pointsGroup.add(glowM)

      // Transparent colored circle — hidden until owned, tiny
      const circGeo = new THREE.CircleGeometry((isCap ? 0.62 : 0.5) / 3000, 28)
      const circMat = new THREE.MeshBasicMaterial({
        color: 0x444444, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2,
      })
      const circle = new THREE.Mesh(circGeo, circMat)
      circle.renderOrder = 50
      circle.visible = false
      circle.position.copy(up.clone().multiplyScalar(RADIUS * 0.985))
      circle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)
      circle.userData.territoryId = t.id
      t._circle = circle
      this.dotGroup.add(circle)

      // Invisible hit target (no gray dot)
      const dotGeo = new THREE.SphereGeometry(isCap ? 0.45 : 0.35, 10, 8)
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
      const mesh = new THREE.Mesh(dotGeo, mat)
      mesh.renderOrder = 100
      mesh.visible = false
      mesh.position.copy(up.clone().multiplyScalar(RADIUS * 0.985))
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)
      mesh.userData.territoryId = t.id
      t._mesh = mesh
      this.dotGroup.add(mesh)

      // Visible point marking the exact city position
      const vdotGeo = new THREE.SphereGeometry(isCap ? 0.11 : 0.07, 14, 10)
      const vdotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true, depthWrite: false, transparent: true, opacity: 0.75 })
      const vdot = new THREE.Mesh(vdotGeo, vdotMat)
      vdot.renderOrder = 90
      vdot.position.copy(up.clone().multiplyScalar(RADIUS * 0.985))
      vdot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)
      t._vdot = vdot
      this.pointsGroup.add(vdot)

      // City name — glued flat on the globe surface, at the exact city position
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 256, 64)
      ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6
      ctx.fillStyle = '#999'
      ctx.fillText(t.name, 128, 42)
      const tex = new THREE.CanvasTexture(canvas)
      tex.minFilter = THREE.LinearFilter
      tex.anisotropy = 4
      const nameMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      })
      const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), nameMat)
      nameMesh.renderOrder = 999
      nameMesh.position.copy(up.clone().multiplyScalar(RADIUS * 0.985))
      const north = new THREE.Vector3(0, 1, 0)
      const east = new THREE.Vector3().crossVectors(north, up)
      if (east.lengthSq() < 1e-4) east.set(0, 0, 1)
      east.normalize()
      const northTangent = north.clone().addScaledVector(up, -north.dot(up))
      if (northTangent.lengthSq() < 1e-4) northTangent.copy(up.clone().cross(east))
      northTangent.normalize()
      nameMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, northTangent, up))
      t._sprite = nameMesh
      this.pointsGroup.add(nameMesh)
    }
  }

  // ─── Adjacency Lines ─────────────────────────────────────────────
  _createAdjacencyLines() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0.08 })
    for (const t of TERRITORIES) {
      for (const nId of t.adj) {
        if (nId > t.id) continue
        const n = TERRITORIES.find(x => x.id === nId)
        if (!n) continue
        const pts = []
        const steps = 16
        const p1 = t.pos.clone().normalize().multiplyScalar(RADIUS * 0.99)
        const p2 = n.pos.clone().normalize().multiplyScalar(RADIUS * 0.99)
        for (let i = 0; i <= steps; i++) {
          const p = new THREE.Vector3().lerpVectors(p1, p2, i / steps)
          p.normalize().multiplyScalar(RADIUS * 0.99)
          pts.push(p)
        }
        this.lineGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat))
      }
    }
  }

  // ─── Input ───────────────────────────────────────────────────────
  _setupInput() {
    const el = this.renderer.domElement
    el.addEventListener('contextmenu', e => e.preventDefault())

    el.addEventListener('pointerdown', e => {
      this._pointerDown = { x: e.clientX, y: e.clientY, time: Date.now() }
      if (e.button === 2) {
        const hit = this._hitTest(e.clientX, e.clientY)
        if (hit !== null && window.handleOpenCity) {
          window.handleOpenCity(hit)
        }
      }
    })

    el.addEventListener('pointerup', e => {
      if (e.button !== 0) return
      const down = this._pointerDown
      if (!down) return
      const dx = e.clientX - down.x, dy = e.clientY - down.y
      const dt = Date.now() - down.time
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && dt < 300) {
        const hit = this._hitTest(e.clientX, e.clientY)
        if (hit !== null && window.handleTerritoryClick) {
          window.handleTerritoryClick(hit)
        }
      }
    })

    // Double-click → fly & select (or attack an enemy directly)
    el.addEventListener('dblclick', e => {
      const hit = this._hitTest(e.clientX, e.clientY)
      if (hit === null) return
      const td = this.state?.territories ? this.state.territories[hit] : null
      const enemy = td && td.owner && td.owner !== this.state.you && !isAlly(this.state, td.owner)
      if (enemy && window.handleEnemyDoubleClick) {
        window.handleEnemyDoubleClick(hit)
        return
      }
      this.flyToTerritory(hit)
      this.selectTerritory(hit)
    })
  }

  _hitTest(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this._raycaster.setFromCamera(this._pointer, this.camera)
    const targets = []
    for (const t of TERRITORIES) {
      targets.push(t._mesh, t._circle)
      if (t._polyMesh) targets.push(t._polyMesh)
    }
    const hits = this._raycaster.intersectObjects(targets)
    if (hits.length) return hits[0].object.userData.territoryId
    return null
  }

  // ─── State Update ────────────────────────────────────────────────
  updateState(state) {
    this.state = state

    // Update polygon colors
    this._updatePolys(state)

    for (const t of TERRITORIES) {
      const td = state.territories ? state.territories[t.id] : null
      const owner = td ? td.owner : null
      const empHex = empireHex(state, owner)
      const color = empHex ? new THREE.Color(empHex) : new THREE.Color(0x444444)

      // Glow colored by owner (colored light)
      t._glow.material.color.copy(owner ? color.clone() : new THREE.Color(homeHex(t) || 0x444444))
      t._glow.material.opacity = owner ? 0.22 : 0.12

      // Visible city point, colored by owner (or by its home empire)
      t._vdot.material.color.copy(owner ? color.clone() : new THREE.Color(homeHex(t) || 0xffffff))

      // Transparent circle colored by owner — attached to the map, only when owned
      t._circle.visible = !!owner
      t._circle.material.color.copy(color)
      t._circle.material.opacity = owner ? 0.5 : 0

      // City name glued on the ground
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 256, 64)
      ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6
      ctx.fillStyle = owner ? empHex : '#999'
      let label = t.name
      if (td && td.army !== undefined) label += ` ${td.army}`
      ctx.fillText(label, 128, 42)
      const tex = new THREE.CanvasTexture(canvas)
      tex.minFilter = THREE.LinearFilter
      tex.anisotropy = 4
      t._sprite.material.map = tex
      t._sprite.material.needsUpdate = true
    }

    if (this.selectedId !== null) this._highlightTerritory(this.selectedId)
  }

  // ─── Selection ────────────────────────────────────────────────────
  selectTerritory(id) {
    this.selectedId = id
    this._highlightTerritory(id)
    const t = TERRITORIES.find(x => x.id === id)
    if (t) {
      const pos = t.pos.clone().normalize().multiplyScalar(RADIUS * 1.01)
      this.ring.position.copy(pos)
      this.ring.lookAt(new THREE.Vector3(0, 0, 0))
      this.ring.material.opacity = 0.7
    }
  }

  clearSelection() {
    this.selectedId = null
    this.ring.material.opacity = 0
    if (this.state) this.updateState(this.state)
  }

  _highlightTerritory(id) {
    for (const t of TERRITORIES) {
      const isSel = t.id === id
      const isAdj = t.adj.includes(id)
      if (isSel) {
        t._glow.material.opacity = 0.5
        t._glow.material.color.set(0xffd700)
        t._vdot.material.color.set(0xffd700)
        t._vdot.scale.setScalar(1.8)
        t._circle.visible = true
        t._circle.material.opacity = 0.5
        t._circle.material.color.set(0xffd700)
        t._circle.scale.setScalar(1.25)
      } else {
        t._circle.scale.setScalar(1)
        t._vdot.scale.setScalar(1)
        // restore based on state
        const td = this.state?.territories ? this.state.territories[t.id] : null
        const owner = td ? td.owner : null
        const empHex = empireHex(this.state, owner)
        const color = empHex ? new THREE.Color(empHex) : new THREE.Color(homeHex(t) || 0x444444)
        if (isAdj) {
          const aOwner = this.state?.territories ? this.state.territories[t.id]?.owner : null
          const aColor = aOwner && isAlly(this.state, aOwner) ? 0x2ecc71 : 0xff4444
          t._glow.material.color.set(aColor)
          t._glow.material.opacity = 0.35
          t._vdot.material.color.set(aColor)
          t._vdot.scale.setScalar(1.4)
          t._circle.visible = true
          t._circle.material.opacity = 0.45
        } else {
          t._glow.material.color.copy(color)
          t._glow.material.opacity = owner ? 0.4 : 0.18
          t._vdot.material.color.copy(owner ? color.clone() : new THREE.Color(homeHex(t) || 0xffffff))
          t._circle.visible = !!owner
          t._circle.material.opacity = owner ? 0.5 : 0
        }
        t._circle.material.color.copy(color)
      }
    }
  }

  // ─── Battle Particles ────────────────────────────────────────────
  flashTerritory(tid, colorHex, duration = 900) {
    const t = TERRITORIES.find(x => x.id === tid)
    const mesh = t && t._polyMesh
    if (!mesh || !mesh.material || Array.isArray(mesh.material)) return
    const mat = mesh.material
    const base = mat.color.clone()
    const flash = new THREE.Color(colorHex)
    const start = performance.now()
    const animId = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / duration)
      const wave = 0.5 - 0.5 * Math.cos(p * Math.PI * 5)
      mat.color.copy(base).lerp(flash, wave * 0.95)
      if (p >= 1) { clearInterval(animId); mat.color.copy(base) }
    }, 16)
  }
  spawnBattleParticles(territoryName, attackerWins) {
    const t = TERRITORIES.find(x => x.name === territoryName)
    if (!t) return
    const count = 60
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const vels = []
    for (let i = 0; i < count; i++) {
      const spread = 8
      positions[i * 3] = t.pos.x + (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = t.pos.y + (Math.random() - 0.5) * spread
      positions[i * 3 + 2] = t.pos.z + (Math.random() - 0.5) * spread
      const c = attackerWins ? new THREE.Color(0xffd700) : new THREE.Color(0xe74c3c)
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      vels.push({ x: (Math.random() - 0.5) * 0.08, y: (Math.random() - 0.5) * 0.08, z: (Math.random() - 0.5) * 0.08 })
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    const points = new THREE.Points(geo, mat)
    this.dotGroup.add(points)
    const start = performance.now()
    const duration = 1500
    const animId = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration)
      const pos = points.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        pos[i * 3] += vels[i].x; pos[i * 3 + 1] += vels[i].y; pos[i * 3 + 2] += vels[i].z
        vels[i].y -= 0.002
      }
      points.geometry.attributes.position.needsUpdate = true
      mat.opacity = 1 - progress
      if (progress >= 1) {
        clearInterval(animId)
        this.dotGroup.remove(points)
        points.geometry.dispose(); mat.dispose()
      }
    }, 16)
  }

  // ─── Attack projectile (arc from → to) ───────────────────────────
  spawnAttackProjectile(fromTid, toTid, attackerWins) {
    const a = TERRITORIES.find(x => x.id === fromTid)
    const b = TERRITORIES.find(x => x.id === toTid)
    if (!a || !b) return
    const p1 = a.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)
    const p2 = b.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)
    const color = attackerWins ? 0xffd700 : 0xff5522

    const arcPts = []
    const steps = 28
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const base = new THREE.Vector3().lerpVectors(p1, p2, u)
      const lift = base.clone().normalize().multiplyScalar(RADIUS * 0.14 * Math.sin(u * Math.PI))
      arcPts.push(base.add(lift))
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(arcPts)
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
    const line = new THREE.Line(lineGeo, lineMat)
    line.renderOrder = 800
    this.dotGroup.add(line)

    // Trailing particles following the projectile
    const trailN = 24
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailN * 3), 3))
    const trailMat = new THREE.PointsMaterial({ color, size: 0.11, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const trail = new THREE.Points(trailGeo, trailMat)
    trail.renderOrder = 850
    this.dotGroup.add(trail)

    const dotGeo = new THREE.SphereGeometry(0.13, 10, 8)
    const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.renderOrder = 860
    this.dotGroup.add(dot)

    const start = performance.now()
    const duration = 650
    const animId = setInterval(() => {
      const u = Math.min(1, (performance.now() - start) / duration)
      const idx = Math.min(steps, Math.floor(u * steps))
      dot.position.copy(arcPts[idx])
      const tp = trail.geometry.attributes.position.array
      for (let i = 0; i < trailN; i++) {
        const back = Math.max(0, idx - i - 1)
        const p = arcPts[back]
        tp[i * 3] = p.x; tp[i * 3 + 1] = p.y; tp[i * 3 + 2] = p.z
      }
      trail.geometry.attributes.position.needsUpdate = true
      trailMat.opacity = Math.max(0, 0.9 - u * 0.4)
      if (u >= 1) {
        clearInterval(animId)
        this.dotGroup.remove(line); this.dotGroup.remove(dot); this.dotGroup.remove(trail)
        line.geometry.dispose(); lineMat.dispose()
        dot.geometry.dispose(); dotMat.dispose()
        trail.geometry.dispose(); trailMat.dispose()
        const impact = b.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)
        this._impactBurst(impact, attackerWins)
        this._captureFlash(b.pos.clone().normalize().multiplyScalar(RADIUS * 1.0), attackerWins)
      }
    }, 16)
  }

  // ─── Troop movement dot (arc from → to) ──────────────────────────
  spawnMoveAnimation(fromTid, toTid) {
    const a = TERRITORIES.find(x => x.id === fromTid)
    const b = TERRITORIES.find(x => x.id === toTid)
    if (!a || !b) return
    const p1 = a.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)
    const p2 = b.pos.clone().normalize().multiplyScalar(RADIUS * 0.985)
    const pts = []
    const steps = 30
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const base = new THREE.Vector3().lerpVectors(p1, p2, u)
      const lift = base.clone().normalize().multiplyScalar(RADIUS * 0.06 * Math.sin(u * Math.PI))
      pts.push(base.add(lift))
    }
    const dotGeo = new THREE.SphereGeometry(0.06, 10, 8)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, depthWrite: false })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.renderOrder = 850
    this.dotGroup.add(dot)

    const start = performance.now()
    const duration = 500
    const animId = setInterval(() => {
      const u = Math.min(1, (performance.now() - start) / duration)
      dot.position.copy(pts[Math.min(steps, Math.floor(u * steps))])
      dotMat.opacity = Math.min(1, u * 4)
      if (u >= 1) {
        clearInterval(animId)
        this.dotGroup.remove(dot)
        dot.geometry.dispose(); dotMat.dispose()
      }
    }, 16)
  }

  // ─── Recruit pulse at a territory ────────────────────────────────
  spawnRecruitEffect(tid) {
    const t = TERRITORIES.find(x => x.id === tid)
    if (!t) return
    this._captureFlash(t.pos.clone().normalize().multiplyScalar(RADIUS * 1.0), true, 0.4)
  }

  _impactBurst(pos, attackerWins) {
    const color = attackerWins ? 0xffd700 : 0xff5522
    // Bright expanding flash sphere
    const flashGeo = new THREE.SphereGeometry(0.09, 12, 10)
    const flashMat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const flash = new THREE.Mesh(flashGeo, flashMat)
    flash.renderOrder = 920
    flash.position.copy(pos)
    this.dotGroup.add(flash)
    const count = 70
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const vels = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z
      const c = new THREE.Color(color)
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      vels.push(dir.multiplyScalar(0.18 + Math.random() * 0.18))
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const points = new THREE.Points(geo, mat)
    this.dotGroup.add(points)
    const start = performance.now()
    const duration = 800
    const animId = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration)
      const arr = points.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        arr[i * 3] += vels[i].x; arr[i * 3 + 1] += vels[i].y; arr[i * 3 + 2] += vels[i].z
        vels[i].y -= 0.006
      }
      points.geometry.attributes.position.needsUpdate = true
      mat.opacity = 1 - progress
      flash.scale.setScalar(1 + progress * 6)
      flash.material.opacity = Math.max(0, 1 - progress * 2)
      if (progress >= 1) {
        clearInterval(animId)
        this.dotGroup.remove(points); this.dotGroup.remove(flash)
        points.geometry.dispose(); mat.dispose()
        flash.geometry.dispose(); flash.material.dispose()
      }
    }, 16)
  }

  _captureFlash(pos, attackerWins, maxOpacity = 0.8) {
    const color = attackerWins ? 0xffd700 : 0xff5533
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.4, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    )
    ring.renderOrder = 900
    ring.position.copy(pos)
    ring.lookAt(new THREE.Vector3(0, 0, 0))
    this.dotGroup.add(ring)
    const ring2 = ring.clone()
    ring2.renderOrder = 901
    this.dotGroup.add(ring2)
    const start = performance.now()
    const duration = 900
    const animId = setInterval(() => {
      const u = Math.min(1, (performance.now() - start) / duration)
      ring.scale.setScalar(1 + u * 5)
      ring.material.opacity = maxOpacity * (1 - u)
      ring2.scale.setScalar(1 + (Math.max(0, u - 0.15)) * 4)
      ring2.material.opacity = maxOpacity * 0.7 * Math.max(0, 1 - u * 1.4)
      if (u >= 1) {
        clearInterval(animId)
        this.dotGroup.remove(ring); this.dotGroup.remove(ring2)
        ring.geometry.dispose(); ring.material.dispose()
        ring2.geometry.dispose(); ring2.material.dispose()
      }
    }, 16)
  }

  // ─── Camera ──────────────────────────────────────────────────────
  setZoom(z) {
    this.camera.zoom = Math.max(1, Math.min(20, z))
    this.camera.updateProjectionMatrix()
    if (this.pointsGroup) this.pointsGroup.scale.setScalar(1 / this.camera.zoom)
  }

  getZoom() {
    return this.camera.zoom || 1
  }

  setAutoRotate(on) {
    this.controls.autoRotate = on
    this._rotating = on
  }

  flyToTerritory(id) {
    const t = TERRITORIES.find(x => x.id === id)
    if (!t) return
    const dir = t.pos.clone().normalize()
    const target = dir.clone().multiplyScalar(RADIUS * 0.3)
    const endPos = dir.clone().multiplyScalar(RADIUS * 2.8)
    this.controls.autoRotate = false
    this._flyAnim = {
      startPos: this.camera.position.clone(),
      endPos,
      startTarget: this.controls.target.clone(),
      endTarget: target,
      startTime: performance.now(),
      duration: 900,
    }
  }

  _updateFlyAnim() {
    const anim = this._flyAnim
    if (!anim) return
    const t2 = Math.min(1, (performance.now() - anim.startTime) / anim.duration)
    const ease = 1 - Math.pow(1 - t2, 3)
    this.camera.position.lerpVectors(anim.startPos, anim.endPos, ease)
    this.controls.target.lerpVectors(anim.startTarget, anim.endTarget, ease)
    if (t2 >= 1) {
      this._flyAnim = null
      this.controls.autoRotate = this._rotating !== false
    }
  }

  // ─── Resize ──────────────────────────────────────────────────────
  _handleResize() {
    if (!this.container) return
    const w = this.container.clientWidth, h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  // ─── Render Loop ──────────────────────────────────────────────────
  _renderLoop() {
    if (!this._running) return
    this.animationTime += 0.016
    this._updateFlyAnim()
    this.controls.update()

    if (this.clouds) this.clouds.rotation.y += 0.0003
    if (this.clouds2) this.clouds2.rotation.y -= 0.0002

    if (this.selectedId !== null) {
      this.ring.material.opacity = 0.3 + 0.3 * Math.sin(this.animationTime * 3)
      const s = 1 + 0.06 * Math.sin(this.animationTime * 2)
      this.ring.scale.setScalar(s)
    }

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this._animate)
  }

  // ─── Cleanup ─────────────────────────────────────────────────────
  dispose() {
    this._running = false
    window.removeEventListener('resize', this._onResize)
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

// ─── Expose globally ───────────────────────────────────────────────
const globe = new Globe3D()
window.GlobeAPI = {
  init: (container) => globe.init(container),
  updateState: (state) => globe.updateState(state),
  selectTerritory: (id) => globe.selectTerritory(id),
  clearSelection: () => globe.clearSelection(),
  hitTest: (x, y) => globe._hitTest(x, y),
  spawnBattleParticles: (name, win) => globe.spawnBattleParticles(name, win),
  spawnAttackProjectile: (from, to, win) => globe.spawnAttackProjectile(from, to, win),
  flashTerritory: (tid, hex, dur) => globe.flashTerritory(tid, hex, dur),
  spawnMoveAnimation: (from, to) => globe.spawnMoveAnimation(from, to),
  spawnRecruitEffect: (tid) => globe.spawnRecruitEffect(tid),
  flyTo: (id) => globe.flyToTerritory(id),
  setAutoRotate: (on) => globe.setAutoRotate(on),
  setZoom: (z) => globe.setZoom(z),
  getZoom: () => globe.getZoom(),
  dispose: () => globe.dispose(),
}
