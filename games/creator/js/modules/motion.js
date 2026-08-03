/* Module motion — vue 3D globe (Three.js) du client de jeu.
   Options de rendu pilotées par config.render (définies dans le Studio,
   section « Rendu 3D »). Bascule 2D ↔ 3D, marqueurs de territoires, picking. */

import { $, ST } from './state.js?v=2';
import { colorOfEmpire, empireOf } from './state.js?v=2';
import { selectTerr, toast, renderMap } from '../main.js?v=2';
import { t as tr, terrName } from './i18n.js?v=7';

export function renderOptions() {
  const r = (ST.config && ST.config.render) || ST.renderCfg || {};
  const g = r.globe || {};
  return {
    mode: r.mode || '2d',
    radius: Number(g.radius) || 1.6,
    autorotate: g.autorotate !== false,
    speed: Number(g.speed) != null ? Number(g.speed) : 0.15,
    ocean: g.ocean || '#0b3d66',
    markerScale: Number(g.markerScale) || 0.9,
    markerSize: Number(g.markerSize) || 0.055,
    markerOpacity: g.markerOpacity != null ? Number(g.markerOpacity) : 1,
    texture: g.texture || null,
    labels: g.labels !== false,
    labelScale: Number(g.labelScale) || 1,
  };
}

function ll2xyz(lon, lat, r, THREE) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

async function init3D() {
  if (ST.threeCtx) return ST.threeCtx;
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const container = $('map-container');
    const opts = renderOptions();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1a33');
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 200);
    camera.position.set(opts.radius * 0.6, opts.radius * 1.1, opts.radius * 3.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;z-index:0;';
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = opts.radius * 1.4;
    controls.maxDistance = opts.radius * 10;
    const group = new THREE.Group();
    scene.add(group);
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(makeStars(), 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x8aa0c0, size: 0.02 })));
    const ctx3 = { THREE, scene, camera, renderer, controls, group, markers: new Map(), labels: new Map(), fx: [], opts, animId: null, downX: 0, downY: 0, moved: false };
    renderer.domElement.addEventListener('pointerdown', e => { ctx3.downX = e.clientX; ctx3.downY = e.clientY; ctx3.moved = false; });
    renderer.domElement.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - ctx3.downX, e.clientY - ctx3.downY) > 6) ctx3.moved = true; });
    renderer.domElement.addEventListener('pointerup', e => { if (!ctx3.moved) onGlobePick(e); });
    window.addEventListener('resize', onGlobeResize);
    container.appendChild(renderer.domElement);
    ST.threeCtx = ctx3;
    return ctx3;
  } catch (e) {
    console.error('3D indisponible :', e);
    toast(tr('motion.no3d'), 'error');
    ST.view3d = false;
    $('view3d-btn').textContent = tr('motion.3d');
    return null;
  }
}

function makeStars() {
  const pts = [];
  for (let i = 0; i < 800; i++) {
    const r = 16 + Math.random() * 12;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pts.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
  }
  return pts;
}

export function buildGlobeMarkers() {
  const c = ST.threeCtx;
  if (!c || !ST.state || !ST.state.territories) return;
  const opts = renderOptions();
  c.opts = opts;
  c.group.clear();
  if (opts.texture) {
    let tex = c.earthTex;
    if (!tex) {
      tex = new c.THREE.TextureLoader().load(opts.texture);
      tex.colorSpace = c.THREE.SRGBColorSpace;
      c.earthTex = tex;
    }
    c.group.add(new c.THREE.Mesh(
      new c.THREE.SphereGeometry(opts.radius, 48, 32),
      new c.THREE.MeshBasicMaterial({ map: tex, color: 0xffffff })
    ));
  } else {
    c.group.add(new c.THREE.Mesh(
      new c.THREE.SphereGeometry(opts.radius, 48, 32),
      new c.THREE.MeshBasicMaterial({ color: opts.ocean, transparent: true, opacity: 0.85 })
    ));
    c.group.add(new c.THREE.Mesh(
      new c.THREE.SphereGeometry(opts.radius * 1.001, 24, 16),
      new c.THREE.MeshBasicMaterial({ color: 0x1a2c4a, wireframe: true, transparent: true, opacity: 0.25 })
    ));
  }
  const ts = Object.values(ST.state.territories);
  if (c.markers.size !== ts.length || c.markers.size === 0) {
    c.markers = new Map();
    const geo = new c.THREE.SphereGeometry(opts.radius * opts.markerSize * 2 * opts.markerScale, 10, 8);
    for (const t of ts) {
      const m = new c.THREE.Mesh(geo, new c.THREE.MeshBasicMaterial({
        color: 0x555555, transparent: true, opacity: opts.markerOpacity, depthWrite: false
      }));
      m.userData.tid = t.id;
      m.userData.base = t.cap ? 2.0 : 1.0;
      m.position.copy(ll2xyz(t.lon, t.lat, opts.radius * 1.005, c.THREE));
      c.markers.set(t.id, m);
    }
  }
  for (const m of c.markers.values()) c.group.add(m);
  if (opts.labels) {
    if (c.labels.size !== ts.length || c.labels.size === 0) {
      c.labels = new Map();
      for (const t of ts) {
        const spr = makeLabel(c, t);
        c.labels.set(t.id, spr);
      }
    }
    for (const spr of c.labels.values()) c.group.add(spr);
  }
  buildGlobeLinks(c);
  refreshGlobeColors();
}

function makeLabel(c, t) {
  const name = String(terrName(t.id) || t.name || ('T' + t.id));
  const cv = document.createElement('canvas');
  const sh = 64;
  cv.width = 256; cv.height = sh;
  let g = cv.getContext('2d');
  g.font = '600 30px system-ui, sans-serif';
  const tw = Math.min(256, Math.ceil(g.measureText(name).width) + 16);
  cv.width = Math.max(48, tw);
  g = cv.getContext('2d');
  g.font = '600 28px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.strokeText(name, cv.width / 2, sh - 6);
  g.fillStyle = '#f4f7ff';
  g.fillText(name, cv.width / 2, sh - 6);
  const tex = new c.THREE.CanvasTexture(cv);
  const spr = new c.THREE.Sprite(new c.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const mr = c.opts.radius * c.opts.markerSize * 2 * (c.opts.markerScale || 1);
  const k = c.opts.radius * 0.085 * (c.opts.labelScale || 1) / 6.6667;
  spr.position.copy(ll2xyz(t.lon, t.lat, c.opts.radius * 1.005 + mr + k / 2, c.THREE));
  spr.scale.set(k * (cv.width / sh), k, 1);
  spr.userData.tid = t.id;
  return spr;
}

function buildGlobeLinks(c) {
  const opts = renderOptions();
  const ts = Object.values(ST.state.territories);
  const pos = [], col = [], meta = [];
  const links = new Set();
  for (const t of ts) (t.adj || []).forEach(a => links.add(t.id < a ? `${t.id}-${a}` : `${a}-${t.id}`));
  for (const lk of links) {
    const [a, b] = lk.split('-').map(Number);
    const ta = ST.state.territories[a], tb = ST.state.territories[b];
    if (!ta || !tb) continue;
    const A = ll2xyz(ta.lon, ta.lat, opts.radius * 1.03, c.THREE);
    const B = ll2xyz(tb.lon, tb.lat, opts.radius * 1.03, c.THREE);
    const same = ta.owner && tb.owner && empireOf(ta) === empireOf(tb);
    const rgb = same ? [1, 1, 1] : [0.25, 0.38, 0.55];
    pos.push(A.x, A.y, A.z, B.x, B.y, B.z);
    col.push(...rgb, ...rgb);
    meta.push([a, b]);
  }
  if (c.links) c.group.remove(c.links);
  if (c.linkGeo) c.linkGeo.dispose();
  if (c.linkMat) c.linkMat.dispose();
  c.linkMeta = meta;
  if (!pos.length) { c.links = null; return; }
  const g = new c.THREE.BufferGeometry();
  g.setAttribute('position', new c.THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new c.THREE.Float32BufferAttribute(col, 3));
  const m = new c.THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 });
  c.links = new c.THREE.LineSegments(g, m);
  c.linkGeo = g; c.linkMat = m;
  c.group.add(c.links);
}

export function refreshGlobeColors() {
  const c = ST.threeCtx;
  if (!c) return;
  for (const [tid, m] of c.markers) {
    const t = ST.state.territories[tid];
    if (!t) continue;
    m.material.color.set(t.owner ? colorOfEmpire(empireOf(t)) : '#6a6f78');
  }
  if (c.linkMeta && c.linkGeo) {
    const col = [];
    for (const [a, b] of c.linkMeta) {
      const ta = ST.state.territories[a], tb = ST.state.territories[b];
      const same = ta && tb && ta.owner && tb.owner && empireOf(ta) === empireOf(tb);
      const rgb = same ? [1, 1, 1] : [0.25, 0.38, 0.55];
      col.push(...rgb, ...rgb);
    }
    c.linkGeo.setAttribute('color', new c.THREE.Float32BufferAttribute(col, 3));
    c.linkGeo.attributes.color.needsUpdate = true;
  }
}

function onGlobePick(e) {
  const c = ST.threeCtx;
  if (!c) return;
  const rect = c.renderer.domElement.getBoundingClientRect();
  const mouse = new c.THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new c.THREE.Raycaster();
  ray.setFromCamera(mouse, c.camera);
  const hits = ray.intersectObjects(Array.from(c.markers.values()), false);
  if (hits.length) {
    const tid = hits[0].object.userData.tid;
    c.controls.target.copy(hits[0].object.position.clone());
    selectTerr(tid);
  }
}

function onGlobeResize() {
  const c = ST.threeCtx;
  if (!c) return;
  const w = $('map-container').clientWidth, h = $('map-container').clientHeight;
  c.camera.aspect = w / Math.max(1, h);
  c.camera.updateProjectionMatrix();
  c.renderer.setSize(w, h);
}

function fxPos(c, t) { return ll2xyz(t.lon, t.lat, c.opts.radius * 1.02, c.THREE); }

function explosion(c, pos, color, scale) {
  const s = scale || 1;
  const ring = new c.THREE.Mesh(
    new c.THREE.RingGeometry(0.015 * s, 0.03 * s, 28),
    new c.THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: c.THREE.DoubleSide, depthWrite: false })
  );
  ring.position.copy(pos);
  ring.lookAt(pos.clone().multiplyScalar(2));
  const N = s > 1 ? 34 : 22;
  const dirs = new Float32Array(N * 3), speeds = new Float32Array(N), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    dirs[i * 3] = Math.sin(b) * Math.cos(a);
    dirs[i * 3 + 1] = Math.cos(b);
    dirs[i * 3 + 2] = Math.sin(b) * Math.sin(a);
    speeds[i] = 0.03 + Math.random() * 0.08;
    base[i * 3] = pos.x; base[i * 3 + 1] = pos.y; base[i * 3 + 2] = pos.z;
  }
  const pgeo = new c.THREE.BufferGeometry();
  pgeo.setAttribute('position', new c.THREE.BufferAttribute(base.slice(), 3));
  const pts = new c.THREE.Points(pgeo, new c.THREE.PointsMaterial({
    color, size: 0.055 * s, transparent: true, opacity: 1, depthWrite: false,
    blending: c.THREE.AdditiveBlending
  }));
  const flash = new c.THREE.Mesh(
    new c.THREE.SphereGeometry(0.025 * s, 12, 10),
    new c.THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false,
      blending: c.THREE.AdditiveBlending
    })
  );
  flash.position.copy(pos);
  c.scene.add(ring); c.scene.add(pts); c.scene.add(flash);
  c.fx.push({ ring, pts, dirs, speeds, base, flash, scale: s, age: 0, dur: 1.15 });
  if (!c.animId) startGlobeLoop();
}

function bezi(p0, p1, p2, t, out) {
  const u = 1 - t;
  out.x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  out.y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  out.z = u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z;
}

/* Projectile (bombardement) : traînée lumineuse de la source vers la cible. */
function launchProjectile(c, A, B, color, onHit) {
  const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(c.opts.radius * 1.35);
  const N = 14;
  const geo = new c.THREE.BufferGeometry();
  geo.setAttribute('position', new c.THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new c.THREE.Points(geo, new c.THREE.PointsMaterial({
    color, size: c.opts.radius * 0.06, transparent: true, opacity: 1, depthWrite: false,
    blending: c.THREE.AdditiveBlending
  }));
  const head = new c.THREE.Mesh(
    new c.THREE.SphereGeometry(c.opts.radius * 0.03, 12, 10),
    new c.THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1, depthWrite: false,
      blending: c.THREE.AdditiveBlending
    })
  );
  c.scene.add(pts); c.scene.add(head);
  c.fx.push({ type: 'proj', A, B, mid, N, pts, head, color, age: 0, dur: 0.7, onHit });
  if (!c.animId) startGlobeLoop();
}

export function playBattleFx(fromTid, toTid, won, projectile = true) {
  const c = ST.threeCtx;
  if (!c || !ST.view3d || !ST.state || !ST.state.territories) return;
  const ta = ST.state.territories[fromTid];
  const tb = ST.state.territories[toTid];
  if (!ta || ta.lon == null || !tb || tb.lon == null) return;
  const color = won ? 0xffd34a : 0xff5040;
  const B = fxPos(c, tb);
  if (projectile) {
    launchProjectile(c, fxPos(c, ta), B, color, () => explosion(c, B, color, 1.4));
  } else {
    explosion(c, B, color, 1.4);
  }
}

/* Flash de départ lors de l'envoi d'une attaque : projectile vers la cible
   (retour visuel immédiat) + petite explosion à l'arrivée. */
export function launchAttackFx(fromTid, toTid) {
  const c = ST.threeCtx;
  if (!c || !ST.view3d || !ST.state || !ST.state.territories) return;
  const ta = ST.state.territories[fromTid];
  const tb = toTid != null ? ST.state.territories[toTid] : null;
  if (!ta || ta.lon == null) return;
  if (!tb || tb.lon == null) { explosion(c, fxPos(c, ta), 0xffd34a, 0.6); return; }
  const A = fxPos(c, ta), B = fxPos(c, tb);
  launchProjectile(c, A, B, 0xffd34a, () => explosion(c, B, 0xffd34a, 0.8));
}

function tickMarkers(c, t) {
  for (const [tid, m] of c.markers) {
    m.scale.setScalar(m.userData.base * (1 + 0.3 * Math.sin(t * 2.4 + tid * 0.7)));
  }
}

function tickFx(c, dt) {
  const v = new c.THREE.Vector3();
  for (let i = c.fx.length - 1; i >= 0; i--) {
    const f = c.fx[i];
    f.age += dt;
    const k = Math.min(1, f.age / f.dur);
    if (f.type === 'proj') {
      bezi(f.A, f.mid, f.B, k, v);
      f.head.position.copy(v);
      const arr = f.pts.geometry.attributes.position.array;
      for (let j = 0; j < f.N; j++) {
        const tt = Math.max(0, k - (j + 1) * 0.045);
        bezi(f.A, f.mid, f.B, tt, v);
        arr[j * 3] = v.x; arr[j * 3 + 1] = v.y; arr[j * 3 + 2] = v.z;
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
      f.pts.material.opacity = Math.max(0, 1 - k * 0.5);
      if (k >= 1) {
        c.scene.remove(f.pts); c.scene.remove(f.head);
        f.pts.geometry.dispose(); f.pts.material.dispose();
        f.head.geometry.dispose(); f.head.material.dispose();
        c.fx.splice(i, 1);
        if (f.onHit) f.onHit();
      }
      continue;
    }
    f.ring.scale.setScalar((1 + k * 4.5) * (f.scale || 1));
    f.ring.material.opacity = Math.max(0, 1 - k);
    if (f.flash) {
      f.flash.scale.setScalar((1 + k * 6) * (f.scale || 1));
      f.flash.material.opacity = Math.max(0, 0.95 * (1 - k * 1.5));
    }
    const arr = f.pts.geometry.attributes.position.array;
    for (let j = 0; j < arr.length; j += 3) {
      arr[j] = f.base[j] + f.dirs[j] * f.speeds[j / 3] * k * 1.6;
      arr[j + 1] = f.base[j + 1] + f.dirs[j + 1] * f.speeds[j / 3] * k * 1.6;
      arr[j + 2] = f.base[j + 2] + f.dirs[j + 2] * f.speeds[j / 3] * k * 1.6;
    }
    f.pts.geometry.attributes.position.needsUpdate = true;
    f.pts.material.opacity = Math.max(0, 1 - k);
    if (f.age >= f.dur) {
      c.scene.remove(f.ring); c.scene.remove(f.pts); c.scene.remove(f.flash);
      f.ring.geometry.dispose(); f.ring.material.dispose();
      f.pts.geometry.dispose(); f.pts.material.dispose();
      if (f.flash) { f.flash.geometry.dispose(); f.flash.material.dispose(); }
      c.fx.splice(i, 1);
    }
  }
}

function startGlobeLoop() {
  const c = ST.threeCtx;
  if (!c || c.animId) return;
  const loop = () => {
    if (!ST.threeCtx) return;
    if (ST.threeCtx.opts.autorotate && !ST.threeCtx.controls.dragging) {
      ST.threeCtx.group.rotation.y += ST.threeCtx.opts.speed * 0.001;
    }
    if (ST.threeCtx.fx.length) tickFx(ST.threeCtx, 1 / 60);
    tickMarkers(ST.threeCtx, performance.now() / 1000);
    ST.threeCtx.controls.update();
    ST.threeCtx.renderer.render(ST.threeCtx.scene, ST.threeCtx.camera);
    ST.threeCtx.animId = requestAnimationFrame(loop);
  };
  c.animId = requestAnimationFrame(loop);
}

function stopGlobeLoop() {
  if (ST.threeCtx && ST.threeCtx.animId) { cancelAnimationFrame(ST.threeCtx.animId); ST.threeCtx.animId = null; }
}

export async function toggle3D() {
  ST.view3d = !ST.view3d;
  const btn = $('view3d-btn');
  if (ST.view3d) {
    btn.textContent = tr('motion.2d');
    $('map-canvas').style.display = 'none';
    const c = await init3D();
    if (!c) return;
    c.renderer.domElement.style.display = 'block';
    onGlobeResize();
    buildGlobeMarkers();
    startGlobeLoop();
  } else {
    btn.textContent = tr('motion.3d');
    if (ST.threeCtx) { ST.threeCtx.renderer.domElement.style.display = 'none'; stopGlobeLoop(); }
    $('map-canvas').style.display = 'block';
    renderMap();
  }
}
