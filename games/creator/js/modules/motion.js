/* Module motion — vue 3D globe (Three.js) du client de jeu.
   Options de rendu pilotées par config.render (définies dans le Studio,
   section « Rendu 3D »). Bascule 2D ↔ 3D, marqueurs de territoires, picking. */

import { $, ST } from './state.js?v=2';
import { colorOfEmpire, empireOf } from './state.js?v=2';
import { selectTerr, toast, renderMap } from '../main.js?v=2';

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
    scene.background = new THREE.Color('#05070f');
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
    const ctx3 = { THREE, scene, camera, renderer, controls, group, markers: new Map(), opts, animId: null, downX: 0, downY: 0, moved: false };
    renderer.domElement.addEventListener('pointerdown', e => { ctx3.downX = e.clientX; ctx3.downY = e.clientY; ctx3.moved = false; });
    renderer.domElement.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - ctx3.downX, e.clientY - ctx3.downY) > 6) ctx3.moved = true; });
    renderer.domElement.addEventListener('pointerup', e => { if (!ctx3.moved) onGlobePick(e); });
    window.addEventListener('resize', onGlobeResize);
    container.appendChild(renderer.domElement);
    ST.threeCtx = ctx3;
    return ctx3;
  } catch (e) {
    console.error('3D indisponible :', e);
    toast('Vue 3D indisponible (connexion CDN requise)', 'error');
    ST.view3d = false;
    $('view3d-btn').textContent = '🌐 3D';
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
  c.group.add(new c.THREE.Mesh(
    new c.THREE.SphereGeometry(opts.radius, 48, 32),
    new c.THREE.MeshBasicMaterial({ color: opts.ocean, transparent: true, opacity: 0.85 })
  ));
  c.group.add(new c.THREE.Mesh(
    new c.THREE.SphereGeometry(opts.radius * 1.001, 24, 16),
    new c.THREE.MeshBasicMaterial({ color: 0x1a2c4a, wireframe: true, transparent: true, opacity: 0.25 })
  ));
  const ts = Object.values(ST.state.territories);
  if (c.markers.size === ts.length && c.markers.size > 0) { refreshGlobeColors(); return; }
  c.markers = new Map();
  const geo = new c.THREE.SphereGeometry(opts.radius * 0.055 * opts.markerScale, 10, 8);
  for (const t of ts) {
    const m = new c.THREE.Mesh(geo, new c.THREE.MeshBasicMaterial({ color: 0x555555 }));
    m.scale.setScalar(t.cap ? 2.0 : 1.0);
    m.position.copy(ll2xyz(t.lon, t.lat, opts.radius * 1.02, c.THREE));
    m.userData.tid = t.id;
    c.group.add(m);
    c.markers.set(t.id, m);
  }
  refreshGlobeColors();
}

export function refreshGlobeColors() {
  const c = ST.threeCtx;
  if (!c) return;
  for (const [tid, m] of c.markers) {
    const t = ST.state.territories[tid];
    if (!t) continue;
    m.material.color.set(t.owner ? colorOfEmpire(empireOf(t)) : '#6a6f78');
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

function startGlobeLoop() {
  const c = ST.threeCtx;
  if (!c || c.animId) return;
  const loop = () => {
    if (!ST.threeCtx) return;
    if (ST.threeCtx.opts.autorotate && !ST.threeCtx.controls.dragging) {
      ST.threeCtx.group.rotation.y += ST.threeCtx.opts.speed * 0.001;
    }
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
    btn.textContent = '🗺️ 2D';
    $('map-canvas').style.display = 'none';
    const c = await init3D();
    if (!c) return;
    c.renderer.domElement.style.display = 'block';
    onGlobeResize();
    buildGlobeMarkers();
    startGlobeLoop();
  } else {
    btn.textContent = '🌐 3D';
    if (ST.threeCtx) { ST.threeCtx.renderer.domElement.style.display = 'none'; stopGlobeLoop(); }
    $('map-canvas').style.display = 'block';
    renderMap();
  }
}
