// BP VERSE: ten more detailed stages. Each one is built from procedural textures (with normal maps, so light
// picks up grout, planks, cracks and stone), lots of set dressing merged into a few draw calls, animated
// background life (trains, waves, bags, flames, snow, crowds) and the shared light rig.
import * as THREE from 'three';
import { makePieces, THEMES } from './pieces.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

let K = null;
const OCT = { R: 4.95, PH: 1.2, DA: Math.PI * 0.75, TUN: 19 }; // the octagon: post radius, platform height, walkway angle, tunnel distance (metres; js/ufc.js matches these)
const col = c => new THREE.Color(c);
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- textures: an albedo canvas, plus a normal map derived from its brightness ----------
function surf(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, w, h);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  let normalMap = null;
  if (o.normal !== false) {
    const d = g.getImageData(0, 0, w, h).data, n = document.createElement('canvas'); n.width = w; n.height = h; const ng = n.getContext('2d'), nd = ng.createImageData(w, h);
    const L = (x, y) => { const i = (((y + h) % h) * w + ((x + w) % w)) * 4; return (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; }, k = o.bump || 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (L(x + 1, y) - L(x - 1, y)) * k, dy = (L(x, y + 1) - L(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      nd.data[i] = (-dx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
    }
    ng.putImageData(nd, 0, 0); normalMap = new THREE.CanvasTexture(n); normalMap.anisotropy = 8;
  }
  for (const t of [map, normalMap]) if (t && o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return { map, normalMap };
}
const speckle = (g, w, h, n, a, sz = 2) => { for (let i = 0; i < n; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${a * Math.random()})` : `rgba(255,255,255,${a * Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * sz, 1 + Math.random() * sz); } };
function M(color, o = {}) {
  const s = o.surf || {};
  return K.std(color, Object.assign({ roughness: 0.8, metalness: 0 }, o.mat, s.map ? { map: s.map } : {}, s.normalMap ? { normalMap: s.normalMap, normalScale: new THREE.Vector2(o.nscale || 1, o.nscale || 1) } : {}));
}
const T = {
  concrete: (base = '#6b6a6e', rep = [8, 4]) => surf(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, 0.18); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 10 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - 0.5) * 30; y += Math.random() * 18; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }, { repeat: rep, bump: 2 }),
  tiles: (a, b, n, grout = '#1d1d22', rep = [8, 4], bevel = true) => surf(256, 256, (g, w, h) => { g.fillStyle = grout; g.fillRect(0, 0, w, h); const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); if (bevel) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(i * s + 2, j * s + 2, s - 4, 3); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(i * s + 2, j * s + s - 5, s - 4, 3); } }
    speckle(g, w, h, 1500, 0.08); }, { repeat: rep, bump: 3 }),
  marble: (rep = [6, 3]) => surf(512, 512, (g, w, h) => { const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#e9e6e2' : '#2a2a30'; g.fillRect(i * s, j * s, s, s);
      g.strokeStyle = (i + j) % 2 ? 'rgba(120,110,105,0.35)' : 'rgba(200,190,170,0.28)'; for (let v = 0; v < 7; v++) { g.lineWidth = 0.5 + Math.random() * 2; let x = i * s + Math.random() * s, y = j * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += (Math.random() - 0.5) * 34; y += s / 14; g.lineTo(x, y); } g.stroke(); } }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.strokeRect(0, 0, s, s); g.strokeRect(s, s, s, s); g.strokeRect(s, 0, s, s); g.strokeRect(0, s, s, s); }, { repeat: rep, bump: 1.2 }),
  wood: (base = '#7a5434', rep = [6, 6], plank = 32) => surf(256, 256, (g, w, h) => { for (let y = 0; y < h; y += plank) { const sh = 0.82 + Math.random() * 0.3; g.fillStyle = base; g.fillRect(0, y, w, plank); g.fillStyle = `rgba(${sh > 1 ? '255,255,255' : '0,0,0'},${Math.abs(1 - sh) * 0.6})`; g.fillRect(0, y, w, plank);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`; g.lineWidth = 1; g.beginPath(); const yy = y + Math.random() * plank; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + rnd(-3, 3), w * 0.7, yy + rnd(-3, 3), w, yy); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, w, 2); const cut = Math.random() * w; g.fillRect(cut, y, 2, plank); } }, { repeat: rep, bump: 2.5 }),
  asphalt: (base = '#2b2b30', rep = [10, 5]) => surf(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, 0.25, 1.5); }, { repeat: rep, bump: 1.6 }),
  brick: (base = '#8a3a2a', rep = [10, 3]) => surf(256, 128, (g, w, h) => { g.fillStyle = '#3a2a24'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) { const sh = 0.75 + Math.random() * 0.4; g.fillStyle = base; g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); g.fillStyle = `rgba(0,0,0,${1 - sh})`; g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); }
    speckle(g, w, h, 1500, 0.15); }, { repeat: rep, bump: 3 }),
  snow: (rep = [8, 4]) => surf(256, 256, (g, w, h) => { g.fillStyle = '#e8edf5'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,165,190,${Math.random() * 0.18})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 6 + Math.random() * 14, 0, 0, 7); g.fill(); } speckle(g, w, h, 3000, 0.08); }, { repeat: rep, bump: 1.5 }),
  gravel: (rep = [10, 5]) => surf(256, 256, (g, w, h) => { g.fillStyle = '#5a4c3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 60 + Math.random() * 80; g.fillStyle = `rgb(${v + 20},${v + 8},${v - 8})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(10,8,6,0.3)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 10 + Math.random() * 16, 0, 0, 7); g.fill(); } }, { repeat: rep, bump: 3 }),
  metal: (base = '#5a5e66', rep = [4, 4]) => surf(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(0, y, w, 1); }
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = 'rgba(0,0,0,0.35)'; for (const [x, y] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } }, { repeat: rep, bump: 2 }),
};
// lit windows for building facades
function windowsTex(cols = 6, rows = 12, colors = ['#ffd27a', '#ffe8b0', '#8cc8ff'], lit = 0.38) {
  return K.canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.random() < lit) { g.fillStyle = colors[(Math.random() * colors.length) | 0]; g.globalAlpha = 0.6 + Math.random() * 0.4; g.fillRect(c * cw + cw * 0.18, r * ch + ch * 0.2, cw * 0.64, ch * 0.6); } g.globalAlpha = 1; });
}

// ---------- building blocks ----------
const box = (mat, sx, sy, sz, x, y, z, ry = 0, cast = true) => { const m = K.mesh(K.GEO.box, mat, cast, true); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; return m; };
const cyl = (mat, r, h, x, y, z, cast = true) => { const m = K.mesh(K.GEO.cyl, mat, cast, true); m.scale.set(r, h, r); m.position.set(x, y, z); return m; };
const sph = (mat, r, x, y, z) => { const m = K.mesh(K.GEO.sphere, mat, false, false); m.scale.setScalar(r); m.position.set(x, y, z); return m; };
function floor(mat, w = 60, d = 26, z = -7) { const m = K.mesh(new THREE.PlaneGeometry(w, d), mat, false, true); m.rotation.x = -Math.PI / 2; m.position.set(0, 0, z + d / 2); return m; }
function glow(color, size, x, y, z, op = 0.8) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op, fog: false })); s.scale.set(size, size, 1); s.position.set(x, y, z); s.userData.dyn = 1; return s; }
let GLOW = null;
function skyDome(top, mid, bot, sun) {
  return K.mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: col(top) }, mid: { value: col(mid) }, bot: { value: col(bot) }, sun: { value: new THREE.Vector3(...(sun || [0, -1, 0])).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sun; varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = d.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bot, mid, smoothstep(-0.1, 0.08, h)); float s = max(dot(d, sun), 0.0); c += vec3(1.0,0.75,0.45) * pow(s, 60.0) * 1.2 + vec3(1.0,0.5,0.3) * pow(s, 6.0) * 0.25; gl_FragColor = vec4(c, 1.0); }',
  }), false);
}
function skyline(o) {
  const n = o.n || 90, mat = K.std(o.base || 0x0d1020, { emissive: 0xffffff, emissiveMap: windowsTex(6, 12, o.win, o.lit), emissiveIntensity: o.glow || 1, roughness: 0.8 });
  const im = new THREE.InstancedMesh(K.GEO.box, mat, n), m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const hgt = rnd(o.h0 || 8, o.h1 || 40), w = rnd(o.w0 || 3, o.w1 || 7); m4.makeScale(w, hgt, w).setPosition(rnd(o.x0 || -90, o.x1 || 90), (o.y || -6) + hgt / 2, rnd(o.z0 || -30, o.z1 || -90)); im.setMatrixAt(i, m4); }
  im.userData.dyn = 1; return im;
}
function lamp(x, z, color = '#ffd9a0', h = 3.4, arm = 0.7) {
  const g = new THREE.Group(), pole = M(0x22252c, { mat: { metalness: 0.7, roughness: 0.4 } });
  g.add(cyl(pole, 0.05, h, 0, h / 2, 0), box(pole, arm, 0.05, 0.05, arm / 2, h, 0, 0, false));
  const head = box(K.basic(color), 0.3, 0.06, 0.16, arm, h - 0.05, 0, 0, false); g.add(head);
  g.add(glow(color, 1.6, arm, h - 0.12, 0, 0.75)); g.position.set(x, 0, z); return g;
}
function neon(text, color, w, h, font, x, y, z, ups) {
  const g = new THREE.Group(), p = K.textPlane(text, w, h, font || `900 140px Impact, Oswald, "Arial Black", sans-serif`, '#ffffff', color);
  p.material.color.set(color); g.add(p); const back = box(M(0x0b0b10), w * 1.04, h * 1.1, 0.06, 0, 0, -0.05, 0, false); g.add(back);
  g.add(glow(color, w * 0.9, 0, 0, 0.3, 0.25)); g.position.set(x, y, z); g.userData.dyn = 1;
  const ph = Math.random() * 10; ups.push(t => { const f = Math.sin(t * 13 + ph) > 0.97 ? 0.25 : 1; p.material.opacity = f; });
  p.material.transparent = true; return g;
}
function car(color, x, z, ry = 0) {
  const g = new THREE.Group(), body = M(color, { mat: { metalness: 0.6, roughness: 0.35 } }), glass = M(0x111822, { mat: { metalness: 0.9, roughness: 0.1 } }), tyre = M(0x0d0d0f, { mat: { roughness: 0.9 } });
  g.add(box(body, 1.9, 0.5, 4.2, 0, 0.55, 0), box(body, 1.75, 0.45, 2.2, 0, 1.0, -0.2), box(glass, 1.6, 0.36, 2.05, 0, 1.02, -0.2, 0, false));
  for (const [wx2, wz] of [[-0.92, 1.35], [0.92, 1.35], [-0.92, -1.35], [0.92, -1.35]]) { const w2 = cyl(tyre, 0.34, 0.25, wx2, 0.34, wz); w2.rotation.z = Math.PI / 2; g.add(w2); }
  for (const s of [-0.65, 0.65]) { g.add(box(K.basic('#fff6dc'), 0.32, 0.12, 0.04, s, 0.62, 2.11, 0, false)); g.add(box(K.basic('#ff2030'), 0.36, 0.1, 0.04, s, 0.66, -2.11, 0, false)); }
  g.position.set(x, 0, z); g.rotation.y = ry; return g;
}
function crowdBand(n, x0, x1, z, mat, ups, cheer = 1) {
  const bodies = new THREE.InstancedMesh(K.GEO.capsule, mat, n), heads = new THREE.InstancedMesh(K.GEO.sphereLo, mat, n), m4 = new THREE.Matrix4(), seeds = [];
  for (let i = 0; i < n; i++) seeds.push([lerp(x0, x1, i / (n - 1)) + rnd(-0.3, 0.3), z + rnd(-0.6, 0.6), rnd(0, 6), rnd(0.85, 1.1)]);
  const upd = t => seeds.forEach(([x, zz, ph, s], i) => { const b = Math.abs(Math.sin(t * 3.2 * cheer + ph)) * 0.08 * cheer; m4.makeScale(0.22 * s, 0.4 * s, 0.17 * s).setPosition(x, 0.9 * s + b, zz); bodies.setMatrixAt(i, m4); m4.makeScale(0.15 * s, 0.17 * s, 0.15 * s).setPosition(x, 1.55 * s + b, zz); heads.setMatrixAt(i, m4); bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true; });
  upd(0); ups.push(upd); const g = new THREE.Group(); g.add(bodies, heads); g.userData.dyn = 1; return g;
}
function particles(n, color, size, spread, update) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push([rnd(-spread[0], spread[0]), rnd(0, spread[1]), rnd(spread[2], spread[3]), Math.random()]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, map: GLOW, blending: THREE.AdditiveBlending }));
  p.frustumCulled = false; p.userData.dyn = 1; p.userData.update = t => { for (let i = 0; i < n; i++) update(pos, i, seed[i], t); geo.attributes.position.needsUpdate = true; };
  return p;
}
function palm(x, z, h = 6, lean = 0.2) {
  const g = new THREE.Group(), trunk = M(0x6b5238, { mat: { roughness: 1 } }), leaf = K.std(0x2f6b2a, { roughness: 0.9, side: THREE.DoubleSide });
  let px = 0, py = 0; for (let i = 0; i < 8; i++) { const seg = cyl(trunk, 0.16 - i * 0.012, h / 8 + 0.05, px, py + h / 16, 0); seg.rotation.z = -lean * (i / 8); g.add(seg); px += Math.sin(lean * i / 8) * h / 8; py += h / 8; }
  for (let i = 0; i < 8; i++) { const lf = K.mesh(new THREE.PlaneGeometry(2.6, 0.5), leaf, true, false); lf.position.set(px + Math.cos(i * 0.8) * 1.1, py - 0.25, Math.sin(i * 0.8) * 1.1); lf.rotation.set(0, -i * 0.8, -0.5); g.add(lf); }
  g.position.set(x, 0, z); return g;
}
function pine(x, z, h = 5, snow = false) {
  const g = new THREE.Group(), trunk = M(0x4a3524), needles = M(snow ? 0x2c4a3a : 0x24452c, { mat: { roughness: 1, flatShading: true } }), snowM = M(0xeef2f8);
  g.add(cyl(trunk, 0.14, h * 0.25, 0, h * 0.12, 0));
  for (let i = 0; i < 4; i++) { const c = K.mesh(K.GEO.cone, needles, true, false); const r = h * (0.32 - i * 0.06); c.scale.set(r, h * 0.3, r); c.position.y = h * (0.3 + i * 0.17); g.add(c);
    if (snow) { const s = K.mesh(K.GEO.cone, snowM, false, false); s.scale.set(r * 0.7, h * 0.12, r * 0.7); s.position.y = h * (0.38 + i * 0.17); g.add(s); } }
  g.position.set(x, 0, z); return g;
}
// merge every static mesh into one mesh per material (fewer draw calls); anything flagged dyn stays live
function bake(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), by = new Map(), drop = [];
  const dyn = o => { for (let p = o; p && p !== group; p = p.parent) if (p.userData.dyn) return true; return false; };
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.isShaderMaterial || dyn(o)) return;
    const gg = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(), mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    gg.applyMatrix4(mw);
    if (mw.determinant() < 0) for (const k of Object.keys(gg.attributes)) { const A = gg.attributes[k], n = A.itemSize, arr = A.array; for (let t = 0; t + 2 < A.count; t += 3) for (let c = 0; c < n; c++) { const i1 = (t + 1) * n + c, i2 = (t + 2) * n + c, v = arr[i1]; arr[i1] = arr[i2]; arr[i2] = v; } } // a mirrored piece: keep its faces facing out
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!by.has(key)) by.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    by.get(key).list.push(gg); drop.push(o);
  });
  drop.forEach(o => o.removeFromParent());
  for (const { mat, cast, recv, list } of by.values()) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = recv; group.add(m); list.forEach(x => x.dispose()); }
  return group;
}
const lerp = (a, b, t) => a + (b - a) * t;
function stage(group, setup, ups, extra = {}) {
  bake(group);
  const dynParts = []; group.traverse(o => { if (o.userData.update) dynParts.push(o); });
  return Object.assign({ group, setup, update(t) { ups.forEach(f => f(t)); dynParts.forEach(o => o.userData.update(t)); } }, extra);
}

// ================= the stages =================
const BUILD = {
  // 1. a grand hall of legends: marble, columns, banners, a great emblem, statues and hologram displays
  hall() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.marble([7, 3.5]), mat: { roughness: 0.3, metalness: 0.05 } })));
    const stone = M(0xd8d2c6, { surf: T.concrete('#cfc8bb', [2, 6]), mat: { roughness: 0.6 } }), gold = M(0xc9a227, { mat: { metalness: 1, roughness: 0.3 } }), dark = M(0x1a1820, { mat: { roughness: 0.7 } });
    g.add(box(M(0xb9b2a6, { surf: T.concrete('#b4ad9f', [12, 3]) }), 60, 16, 0.6, 0, 8, -9.5));
    for (let i = -4; i <= 4; i++) { const x = i * 3.2; g.add(cyl(stone, 0.42, 9.5, x, 4.75, -8.2), box(stone, 1.2, 0.5, 1.2, x, 0.25, -8.2), box(stone, 1.25, 0.45, 1.25, x, 9.4, -8.2));
      for (let f = 0; f < 10; f++) { const a = f / 10 * Math.PI * 2; g.add(box(dark, 0.06, 9, 0.06, x + Math.cos(a) * 0.41, 4.75, -8.2 + Math.sin(a) * 0.41, 0, false)); } }
    g.add(box(stone, 32, 1.1, 1.6, 0, 10.2, -8.2), box(gold, 32, 0.12, 1.65, 0, 9.7, -8.2, 0, false));
    // banners between the columns
    const bannerCols = ['#3b8cff', '#b44dff', '#f5c518', '#ff3fa4', '#ff2b2b', '#2ee6c8', '#3b8cff', '#b44dff'];
    bannerCols.forEach((c, i) => { const x = -11.2 + i * 3.2, tex = K.canvasTex(128, 512, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); q.fillStyle = 'rgba(0,0,0,0.25)'; q.fillRect(0, h - 70, w, 70); q.strokeStyle = '#f2d36b'; q.lineWidth = 8; q.strokeRect(8, 8, w - 16, h - 16); q.fillStyle = '#f2d36b'; q.beginPath(); q.arc(w / 2, 180, 40, 0, 7); q.fill(); q.fillStyle = c; q.font = '900 46px Georgia'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP', w / 2, 182); });
      const b = K.mesh(new THREE.PlaneGeometry(1.3, 5.2, 1, 8), K.std(0xffffff, { map: tex, side: THREE.DoubleSide, roughness: 0.9 }), true, false); b.position.set(x + 1.6, 6.2, -8.9); b.userData.dyn = 1; g.add(b);
      const ph = i * 0.7; ups.push(t => { b.rotation.y = Math.sin(t * 0.9 + ph) * 0.06; }); });
    // the great emblem on its plinth
    const emb = K.canvasTex(512, 512, (q, w) => { const c = w / 2; let r = q.createRadialGradient(c, c, 20, c, c, c); r.addColorStop(0, '#d23a3a'); r.addColorStop(1, '#5a0d14'); q.fillStyle = r; q.beginPath(); q.arc(c, c, c - 6, 0, 7); q.fill();
      q.strokeStyle = '#f2d36b'; q.lineWidth = 18; q.beginPath(); q.arc(c, c, c - 20, 0, 7); q.stroke(); q.lineWidth = 6; q.beginPath(); q.arc(c, c, c - 60, 0, 7); q.stroke();
      q.fillStyle = '#f2d36b'; q.font = '900 220px Georgia'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP', c, c + 12); });
    const disc = K.mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 64), [M(0x8a7020, { mat: { metalness: 1, roughness: 0.35 } }), K.std(0xffffff, { map: emb, metalness: 0.4, roughness: 0.35, emissive: 0x220404 }), M(0x8a7020)], true, false);
    disc.rotation.x = Math.PI / 2; disc.position.set(0, 4.8, -7.3); disc.userData.dyn = 1; g.add(disc);
    g.add(box(stone, 3.2, 2.2, 1.6, 0, 1.1, -7.3), box(gold, 3.3, 0.1, 1.65, 0, 2.2, -7.3, 0, false));
    // statues of champions on pedestals
    for (const [x, ry] of [[-6.5, 0.4], [6.5, -0.4], [-13, 0.3], [13, -0.3]]) { const st = K.figure(M(0xbfb6a6, { mat: { roughness: 0.55 } })); st.scale.setScalar(1.7); st.position.set(x, 1.2, -6.6); st.rotation.y = ry; g.add(st, box(stone, 1.6, 1.2, 1.6, x, 0.6, -6.6)); }
    // hologram panels
    for (const x of [-3.6, 3.6]) { const holo = K.canvasTex(256, 160, (q, w, h) => { q.fillStyle = 'rgba(40,140,255,0.15)'; q.fillRect(0, 0, w, h); q.strokeStyle = '#7fd0ff'; q.lineWidth = 3; q.strokeRect(4, 4, w - 8, h - 8); for (let y = 0; y < h; y += 4) { q.fillStyle = 'rgba(120,200,255,0.12)'; q.fillRect(0, y, w, 1); } q.fillStyle = '#bfe8ff'; q.font = 'bold 22px monospace'; q.fillText('ROSTER: 6', 16, 40); q.fillText('THREAT: HIGH', 16, 80); q.fillRect(16, 100, 160, 8); });
      const p = K.mesh(new THREE.PlaneGeometry(2, 1.25), new THREE.MeshBasicMaterial({ map: holo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), false); p.position.set(x, 3.4, -6.2); p.userData.dyn = 1; g.add(p);
      ups.push(t => { p.material.opacity = 0.75 + 0.25 * Math.sin(t * 9 + x); p.position.y = 3.4 + Math.sin(t * 1.4 + x) * 0.05; }); g.add(cyl(M(0x101418, { mat: { metalness: 0.8, roughness: 0.3 } }), 0.25, 0.3, x, 0.15, -6.2), glow('#55bbff', 1.4, x, 0.4, -6.2, 0.5)); }
    // light shafts from the high windows
    for (const x of [-8, 0, 8]) { const b = K.mesh(K.GEO.beam, new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.022, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); K.placeSeg(b, new THREE.Vector3(x - 2, 12, -8), new THREE.Vector3(x + 1, 0, 0.5), 1); b.scale.x = b.scale.z = 1.6; b.userData.dyn = 1; g.add(b); }
    g.add(particles(160, 0xfff2d8, 0.05, [14, 8, -7, 2], (p, i, s, t) => { p[i * 3] = s[0] + Math.sin(t * 0.2 + i) * 0.4; p[i * 3 + 1] = (s[1] + t * 0.05 * (0.5 + s[3])) % 8; p[i * 3 + 2] = s[2]; }));
    return stage(g, () => K.setRig({ sky: '#c8d0e8', ground: '#2a2620', hemi: 0.45, keyCol: '#fff0d8', key: 1.3, rimCol: '#9fc0ff', rim: 1.2, fog: [0x14141c, 22, 70], bg: 0x0d0d12, bloomT: 1.5, env: 0.2,
      points: [['#ffd9a0', -6, 3, -5, 6], ['#ffd9a0', 6, 3, -5, 6], ['#55bbff', 0, 2, -5.5, 4]], spots: [['#ffe8c0', 45, 0, 11, -2, 0, 3.5, -7.3]] }), ups, { debris: 0xb9b2a6 });
  },

  // 2. a street court at dusk: painted court, hoops at both ends, fence, graffiti, apartment blocks
  court() {
    const g = new THREE.Group(), ups = [];
    const court = surf(1024, 512, (q, w, h) => { q.fillStyle = '#2f4f6d'; q.fillRect(0, 0, w, h); speckle(q, w, h, 12000, 0.18, 1.5); q.fillStyle = '#9b3b30'; q.fillRect(0, h * 0.3, w * 0.16, h * 0.4); q.fillRect(w * 0.84, h * 0.3, w * 0.16, h * 0.4);
      q.strokeStyle = 'rgba(245,245,245,0.9)'; q.lineWidth = 6; q.strokeRect(6, 6, w - 12, h - 12); q.beginPath(); q.moveTo(w / 2, 6); q.lineTo(w / 2, h - 6); q.stroke(); q.beginPath(); q.arc(w / 2, h / 2, 70, 0, 7); q.stroke();
      for (const s of [0, 1]) { q.beginPath(); q.arc(s ? w : 0, h / 2, h * 0.45, -Math.PI / 2, Math.PI / 2, s === 1); q.stroke(); q.strokeRect(s ? w * 0.84 : 0, h * 0.3, w * 0.16, h * 0.4); }
      q.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 20; i++) q.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 80, 2); }, { bump: 1.5 });
    const cm = M(0xffffff, { surf: court, mat: { roughness: 0.75 } }); const cf = K.mesh(new THREE.PlaneGeometry(26, 12), cm, false, true); cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0.003, -2.5); g.add(cf);
    g.add(floor(M(0xffffff, { surf: T.asphalt('#2a2a2e', [16, 6]), mat: { roughness: 0.9 } })));
    for (const s of [-1, 1]) { const h = K.buildHoop(); h.position.set(s * 11.6, 0, -2.5); h.scale.set(-s, 1, 1); h.userData.dyn = 1; g.add(h); } // hoops face the middle
    // chain-link fence and graffiti wall behind it
    const fenceT = K.canvasTex(64, 64, (q, w, h) => { q.strokeStyle = 'rgba(190,195,205,0.9)'; q.lineWidth = 2; q.beginPath(); q.moveTo(0, 0); q.lineTo(w, h); q.moveTo(w, 0); q.lineTo(0, h); q.stroke(); }, { repeat: [80, 8] });
    const fence = K.mesh(new THREE.PlaneGeometry(60, 4.2), K.std(0xffffff, { map: fenceT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), false); fence.position.set(0, 2.1, -9); g.add(fence);
    const post = M(0x50555e, { mat: { metalness: 0.7, roughness: 0.4 } }); for (let x = -28; x <= 28; x += 3.5) g.add(cyl(post, 0.05, 4.3, x, 2.15, -9));
    const graf = K.canvasTex(1024, 256, (q, w, h) => { q.fillStyle = '#6a6a72'; q.fillRect(0, 0, w, h); speckle(q, w, h, 4000, 0.2); const cs = ['#ff3fa4', '#2ee6c8', '#f5c518', '#3b8cff', '#ff6a1a'];
      // tags laid end to end (measured, then scaled to fit the wall) so they never pile on top of each other
      const tags = ['BP', 'VERSE', '1223', 'KINGS', 'FLOW', 'MOG', '23', 'DUNK', 'ZONE'].map(t => ({ t, sz: rnd(44, 72) }));
      tags.forEach(o => { q.font = `900 ${o.sz}px Impact, Oswald, "Arial Black", sans-serif`; o.w = q.measureText(o.t).width; });
      const gap = 26, k = Math.min(1, (w - 40 - gap * (tags.length - 1)) / tags.reduce((a, o) => a + o.w, 0)); let x = 20;
      tags.forEach((o, i) => { q.save(); q.translate(x + o.w * k / 2, h / 2 + rnd(-24, 24)); q.rotate(rnd(-0.15, 0.15)); q.font = `900 ${o.sz * k}px Impact, Oswald, "Arial Black", sans-serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
        q.lineWidth = 9; q.lineJoin = 'round'; q.strokeStyle = '#111'; q.fillStyle = cs[i % 5]; q.strokeText(o.t, 0, 0); q.fillText(o.t, 0, 0); q.restore(); x += o.w * k + gap; }); });
    g.add(box(M(0xffffff, { mat: { map: graf, roughness: 0.9 } }), 30, 3.4, 0.4, 0, 1.7, -11));
    // apartment blocks with fire escapes
    const brick = M(0xffffff, { surf: T.brick('#7a3a2c', [4, 6]) });
    for (let i = 0; i < 6; i++) { const x = -25 + i * 10, hgt = rnd(12, 20); g.add(box(brick, 9, hgt, 6, x, hgt / 2, -17));
      const win = K.mesh(new THREE.PlaneGeometry(8, hgt - 2), K.std(0x0c0c14, { emissive: 0xffffff, emissiveMap: windowsTex(5, 10, ['#ffcf7a', '#ffe2a8'], 0.45), roughness: 0.5 }), false); win.position.set(x, hgt / 2 + 0.5, -13.95); g.add(win);
      for (let f = 0; f < 4; f++) g.add(box(M(0x1a1a1e, { mat: { metalness: 0.7 } }), 2.4, 0.06, 0.7, x + 2.5, 3 + f * 3, -13.6, 0, false)); }
    g.add(skyDome('#3a2a6a', '#ff8a5a', '#ffd0a0', [0.3, 0.06, -1]), skyline({ n: 60, z0: -40, z1: -90, h0: 12, h1: 45, base: 0x1a1222, lit: 0.25 }));
    for (const x of [-15, -5, 5, 15]) g.add(lamp(x, -7.5, '#ffcf8a'));
    // bleachers
    const bl = M(0x8a8f99, { mat: { metalness: 0.7, roughness: 0.4 } }); for (let r = 0; r < 4; r++) g.add(box(bl, 7, 0.08, 0.5, -7, 0.35 + r * 0.38, -6.6 - r * 0.45));
    g.add(crowdBand(10, -10, -4, -7.4, M(0x2a2236), ups, 0.6));
    // power lines
    for (const y of [9, 9.4]) { const w2 = cyl(M(0x111111), 0.01, 70, 0, y, -12); w2.rotation.z = Math.PI / 2; g.add(w2); }
    return stage(g, () => K.setRig({ sky: '#ffb08a', ground: '#2a2230', hemi: 1.0, keyCol: '#ffc49a', key: 2.6, rimCol: '#8a7aff', rim: 1.6, fog: [0x6a4a6a, 30, 120], bg: null, bloomT: 1.3,
      points: [['#ffcf8a', -15, 3.2, -7, 8], ['#ffcf8a', -5, 3.2, -7, 8], ['#ffcf8a', 5, 3.2, -7, 8], ['#ffcf8a', 15, 3.2, -7, 8]] }), ups, { debris: 0x4a5a6a });
  },

  // 3. an underground metro station: tiled walls, platform edge, a train that pulls through, flickering tubes
  subway() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.tiles('#8c8c90', '#7f7f84', 4, '#3a3a40', [20, 8]), mat: { roughness: 0.45, metalness: 0.1 } }), 60, 9, -2.2));
    const strip = M(0xf2c218, { surf: surf(128, 128, (q, w, h) => { q.fillStyle = '#e8b818'; q.fillRect(0, 0, w, h); q.fillStyle = '#b98f0e'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { q.beginPath(); q.arc(x, y, 5, 0, 7); q.fill(); } }, { repeat: [60, 1], bump: 4 }) });
    const sm = K.mesh(new THREE.PlaneGeometry(60, 0.6), strip, false, true); sm.rotation.x = -Math.PI / 2; sm.position.set(0, 0.004, -2.0); g.add(sm);
    // the track pit, rails, back wall of white tiles with the station name and posters
    const pit = M(0x1a1a1e, { surf: T.gravel([20, 3]) }); g.add(box(pit, 60, 0.1, 3.6, 0, -1.3, -4.1), box(M(0x55575d, { surf: T.concrete('#5a5b60') }), 60, 1.3, 0.25, 0, -0.65, -2.35));
    const rail = M(0xa0a4ac, { mat: { metalness: 0.9, roughness: 0.3 } }); for (const z of [-3.5, -4.7]) g.add(box(rail, 60, 0.08, 0.08, 0, -1.2, z));
    const wallT = T.tiles('#e9ebe8', '#dfe2de', 8, '#9a9c98', [30, 4], true); g.add(box(M(0xffffff, { surf: wallT, mat: { roughness: 0.25 } }), 60, 8, 0.3, 0, 2.7, -6.2));
    g.add(box(M(0x1d5c3a), 60, 0.35, 0.32, 0, 2.2, -6.04, 0, false));
    const sign = K.textPlane('METRO  ·  LINE 12  ·  VERSE CENTRAL', 9, 0.7, '700 70px Arial', '#ffffff', '#000'); const sb = box(M(0x1d3a6a), 9.4, 0.85, 0.08, 0, 3.6, -6.0, 0, false); g.add(sb); sign.position.set(0, 3.6, -5.94); g.add(sign);
    const posters = [['BP VERSE', '#ff3fa4'], ['DRINK 1223', '#2ee6c8'], ['FIGHT NIGHT', '#f5c518'], ['MOG STARE', '#b44dff'], ['BE CALM', '#ff2b2b']];
    posters.forEach(([txt, c], i) => { const tex = K.canvasTex(256, 360, (q, w, h) => { q.fillStyle = '#111'; q.fillRect(0, 0, w, h); q.fillStyle = c; q.fillRect(10, 10, w - 20, h - 20); q.fillStyle = '#111'; q.font = '900 40px Impact, Oswald, "Arial Black", sans-serif'; q.textAlign = 'center'; q.fillText(txt, w / 2, h - 40); q.beginPath(); q.arc(w / 2, h / 2 - 30, 70, 0, 7); q.fill(); });
      const x = -16 + i * 8; g.add(box(M(0x222222), 1.7, 2.3, 0.06, x, 1.9, -6.0, 0, false)); const p = K.mesh(new THREE.PlaneGeometry(1.55, 2.15), K.std(0xffffff, { map: tex, roughness: 0.4, emissive: 0x111111 }), false); p.position.set(x, 1.9, -5.95); g.add(p); });
    // I-beam columns, benches, ceiling with tube lights
    const steel = M(0x3c4f6a, { mat: { metalness: 0.6, roughness: 0.5 } }); for (let x = -20; x <= 20; x += 8) { g.add(box(steel, 0.35, 6, 0.35, x, 3, -1.4), box(steel, 0.6, 0.12, 0.6, x, 0.06, -1.4)); }
    g.add(box(M(0x2a2a30, { surf: T.concrete('#33343a', [20, 2]) }), 60, 0.4, 9, 0, 6.2, -2));
    const tubes = []; for (let x = -24; x <= 24; x += 4) { const tb = box(K.basic('#e8f2ff'), 2.4, 0.06, 0.12, x, 5.95, -0.5, 0, false); tb.userData.dyn = 1; g.add(tb); tubes.push(tb); }
    ups.push(t => { tubes.forEach((tb, i) => { tb.material.color.setScalar(i === 4 && Math.sin(t * 23) > 0.6 ? 0.2 : 1); }); });
    for (const x of [-12, 4, 18]) { g.add(box(M(0x6a4a2a, { surf: T.wood('#7a5434', [1, 1], 16) }), 2.2, 0.08, 0.45, x, 0.5, -1.0), box(steel, 0.06, 0.5, 0.4, x - 1, 0.25, -1.0), box(steel, 0.06, 0.5, 0.4, x + 1, 0.25, -1.0)); }
    // the train: a long string of carriages that rolls through every so often
    const train = new THREE.Group(); train.userData.dyn = 1; const shell = M(0xc7ccd4, { surf: T.metal('#c0c5cc', [2, 1]), mat: { metalness: 0.8, roughness: 0.35 } }), winM = K.std(0x111111, { emissive: 0xfff4d8, emissiveIntensity: 0.9 });
    for (let c = 0; c < 4; c++) { const cx = c * 13; train.add(box(shell, 12.6, 3, 2.6, cx, 0.5, 0)); for (let w2 = 0; w2 < 5; w2++) train.add(box(winM, 1.6, 0.9, 0.05, cx - 4.8 + w2 * 2.4, 1.0, 1.31, 0, false)); train.add(box(K.basic('#ff2b2b'), 12.6, 0.12, 0.05, cx, -0.3, 1.31, 0, false)); }
    train.position.set(-90, -0.2, -4.1); g.add(train);
    ups.push(t => { const cyc = (t % 26) / 26, k = cyc < 0.35 ? cyc / 0.35 : 1; train.position.x = cyc < 0.35 ? lerp(-95, 60, k * k * (3 - 2 * k)) : -95; });
    return stage(g, () => K.setRig({ sky: '#dfe8ff', ground: '#303030', hemi: 0.75, keyCol: '#eef4ff', key: 1.8, rimCol: '#ffe2b0', rim: 1.0, fog: [0x101318, 14, 60], bg: 0x08090c,
      points: [['#eaf2ff', -10, 5, -1, 8], ['#eaf2ff', 10, 5, -1, 8], ['#fff4d8', 0, 1, -4, 3]] }), ups, { debris: 0x8c8c90 });
  },

  // 4. a rainy neon alley: wet asphalt, neon signs, lanterns, steam, cables and vending machines
  alley() {
    const g = new THREE.Group(), ups = [];
    const wet = surf(512, 512, (q, w, h) => { q.fillStyle = '#1c1c22'; q.fillRect(0, 0, w, h); speckle(q, w, h, 14000, 0.2, 1.5); for (let i = 0; i < 14; i++) { q.fillStyle = 'rgba(70,80,110,0.35)'; q.beginPath(); q.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 8 + Math.random() * 20, 0, 0, 7); q.fill(); } }, { repeat: [10, 5], bump: 1.4 });
    g.add(floor(M(0xffffff, { surf: wet, mat: { roughness: 0.12, metalness: 0.35 } })));
    g.add(cyl(M(0x2a2a2e, { surf: T.metal('#2c2c30', [1, 1]), mat: { metalness: 0.8, roughness: 0.4 } }), 0.5, 0.02, 3, 0.01, 0.8));
    // two rows of buildings framing the alley
    const facadeA = M(0xffffff, { surf: T.brick('#4a2e2e', [6, 8]) }), facadeB = M(0xffffff, { surf: T.concrete('#3a3d46', [4, 8]) });
    for (let i = 0; i < 7; i++) { const x = -27 + i * 9, hgt = rnd(14, 24); g.add(box(i % 2 ? facadeA : facadeB, 8.6, hgt, 4, x, hgt / 2, -9));
      const win = K.mesh(new THREE.PlaneGeometry(7.4, hgt - 3), K.std(0x080810, { emissive: 0xffffff, emissiveMap: windowsTex(4, 9, ['#ff7ab0', '#7ae8ff', '#ffd27a'], 0.4), roughness: 0.4 }), false); win.position.set(x, hgt / 2 + 1, -6.95); g.add(win);
      g.add(box(M(0x8a8f99, { mat: { metalness: 0.6 } }), 1, 0.7, 0.6, x + 2.5, 4 + (i % 3), -6.6), box(M(0x3a3a40, { mat: { metalness: 0.7 } }), 0.12, hgt, 0.12, x - 3.6, hgt / 2, -6.85)); }
    const neons = [['RAMEN', '#ff3fa4', -12], ['BAR 23', '#2ee6c8', -4], ['OPEN', '#ff2b2b', 3], ['BP', '#b44dff', 9], ['24H', '#f5c518', 15]];
    neons.forEach(([t2, c, x], i) => g.add(neon(t2, c, 2.4, 0.9, undefined, x, 3.2 + (i % 2) * 1.4, -6.7, ups)));
    // lanterns strung across, cables, vending machines
    const lanM = K.std(0xff3030, { emissive: 0xff2010, emissiveIntensity: 1.4, roughness: 0.6 });
    for (let x = -20; x <= 20; x += 2.2) { const l = sph(lanM, 0.22, x, 4.6 + Math.sin(x) * 0.15, -4.5); l.scale.y = 0.3; g.add(l, glow('#ff4020', 0.9, x, 4.6, -4.5, 0.35)); }
    for (const y of [5.2, 5.6, 6.1]) { const c2 = cyl(M(0x0a0a0a), 0.012, 60, 0, y, -5); c2.rotation.z = Math.PI / 2; g.add(c2); }
    for (const x of [-7.5, 6.5]) { g.add(box(K.std(0xe8e8f0, { emissive: 0x88ccff, emissiveIntensity: 0.25, roughness: 0.3 }), 1, 1.9, 0.8, x, 0.95, -5.8)); g.add(box(K.basic('#bfe9ff'), 0.8, 1.1, 0.02, x, 1.2, -5.39, 0, false), glow('#88ccff', 2, x, 1.2, -5.2, 0.35)); }
    // steam from grates
    g.add(particles(70, 0x9aa6b8, 0.22, [1, 2.5, -1, -0.6], (p, i, s, t) => { const k = (s[1] + t * 0.6 * (0.6 + s[3])) % 2.5; p[i * 3] = -2 + s[0] * 0.6 + Math.sin(t + i) * 0.1 * k; p[i * 3 + 1] = k; p[i * 3 + 2] = -1.5 + s[2] * 0.2; }));
    const rain = K.rainSystem(700, 0xb0c4ff); rain.userData.dyn = 1; const ru = rain.userData.update; rain.userData.update = t => ru(t, 0); g.add(rain);
    return stage(g, () => K.setRig({ sky: '#4a3a8a', ground: '#0a0a12', hemi: 0.55, keyCol: '#b0c4ff', key: 1.3, rimCol: '#ff3fa4', rim: 2.2, fog: [0x0c0a18, 10, 60], bg: 0x05050c,
      points: [['#ff3fa4', -12, 3, -5.5, 10], ['#2ee6c8', -4, 3, -5.5, 10], ['#ff2b2b', 3, 3, -5.5, 8], ['#b44dff', 9, 4, -5.5, 10]] }), ups, { debris: 0x2a2a30 });
  },

  // 5. an old boxing gym: wood floor, a ring, heavy bags that swing, weights, mirrors, sunlit windows
  gym() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.wood('#8a6038', [10, 10]), mat: { roughness: 0.55 } })));
    g.add(box(M(0xffffff, { surf: T.brick('#8a4a34', [12, 4]) }), 60, 9, 0.4, 0, 4.5, -9));
    // tall windows with god rays
    for (let x = -18; x <= 18; x += 6) { g.add(box(K.std(0xfff0d0, { emissive: 0xfff0d0, emissiveIntensity: 1.1 }), 2.2, 3.2, 0.05, x, 5.5, -8.78, 0, false), box(M(0x1a1a1a), 0.08, 3.2, 0.08, x, 5.5, -8.74, 0, false), box(M(0x1a1a1a), 2.2, 0.08, 0.08, x, 5.5, -8.74, 0, false));
      const b = K.mesh(K.GEO.beam, new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.02, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); K.placeSeg(b, new THREE.Vector3(x, 5.5, -8.7), new THREE.Vector3(x + 2.5, 0, -2), 1); b.scale.x = b.scale.z = 1.3; b.userData.dyn = 1; g.add(b); }
    // the ring
    const canvas2 = M(0xd8d2c0, { surf: T.concrete('#d6d0bc', [4, 2]) }), ropeR = M(0xc8102e), postM = M(0x1a1a20, { mat: { metalness: 0.5 } });
    g.add(box(canvas2, 7, 0.9, 5, 0, 0.45, -6.2), box(M(0x1a2a6a), 7.2, 0.5, 5.2, 0, 0.25, -6.2));
    for (const [px, pz] of [[-3.4, -3.8], [3.4, -3.8], [-3.4, -8.6], [3.4, -8.6]]) g.add(cyl(postM, 0.1, 1.6, px, 1.7, pz));
    for (let r = 0; r < 3; r++) { const y = 1.3 + r * 0.35; g.add(box(ropeR, 6.8, 0.04, 0.04, 0, y, -3.8, 0, false), box(ropeR, 6.8, 0.04, 0.04, 0, y, -8.6, 0, false), box(ropeR, 0.04, 0.04, 4.8, -3.4, y, -6.2, 0, false), box(ropeR, 0.04, 0.04, 4.8, 3.4, y, -6.2, 0, false)); }
    // heavy bags on chains
    const bagM = M(0x7a1a1a, { mat: { roughness: 0.5 } }), chainM = M(0x8a8f99, { mat: { metalness: 0.9, roughness: 0.3 } });
    for (const x of [-9, -6.5, 6.5, 9]) { const bag = new THREE.Group(); bag.userData.dyn = 1; bag.add(cyl(bagM, 0.3, 1.2, 0, -1.6, 0), cyl(chainM, 0.012, 1, 0, -0.5, 0)); bag.position.set(x, 4.2, -3.4); g.add(bag);
      const ph = x; ups.push(t => { bag.rotation.z = Math.sin(t * 1.6 + ph) * 0.06; bag.rotation.x = Math.sin(t * 1.1 + ph) * 0.04; }); }
    g.add(box(M(0x3a3a40, { mat: { metalness: 0.6 } }), 24, 0.15, 0.15, 0, 4.25, -3.4));
    // weights rack, mirror, posters, lockers
    const iron = M(0x1c1c20, { mat: { metalness: 0.7, roughness: 0.35 } });
    g.add(box(iron, 3, 0.08, 0.6, -14, 0.5, -7.5), box(iron, 3, 0.08, 0.6, -14, 1.0, -7.5)); for (let i = 0; i < 8; i++) { const db = cyl(iron, 0.09, 0.4, -15.3 + i * 0.37, 0.62 + (i % 2) * 0.5, -7.5); db.rotation.z = Math.PI / 2; g.add(db); }
    g.add(box(M(0xdfe8f0, { mat: { metalness: 1, roughness: 0.03 } }), 5, 2.4, 0.05, 14, 1.8, -8.7));
    for (let i = 0; i < 6; i++) g.add(box(M(0x5a6a5a, { surf: T.metal('#5a6a5a', [1, 1]) }), 0.6, 2, 0.5, 18 + i * 0.62, 1, -8.4));
    [['FRANK vs FLAKE', '#ff2b2b'], ['NO PAIN', '#f5c518'], ['FIGHT NIGHT 23', '#3b8cff']].forEach(([txt, c], i) => { const tex = K.canvasTex(256, 360, (q, w, h) => { q.fillStyle = '#f1e6c8'; q.fillRect(0, 0, w, h); q.fillStyle = c; q.fillRect(0, 0, w, 90); q.fillStyle = '#111'; q.font = '900 34px Impact, Oswald, "Arial Black", sans-serif'; q.textAlign = 'center'; q.fillText(txt, w / 2, 160); q.font = '20px Georgia'; q.fillText('BP VERSE PROMOTIONS', w / 2, 300); });
      const p = K.mesh(new THREE.PlaneGeometry(1.4, 1.95), K.std(0xffffff, { map: tex, roughness: 0.8 }), false); p.position.set(-6 + i * 5.5, 3, -8.78); g.add(p); });
    g.add(particles(220, 0xfff0d0, 0.04, [16, 7, -8, 1], (p, i, s, t) => { p[i * 3] = s[0] + Math.sin(t * 0.3 + i) * 0.3; p[i * 3 + 1] = (s[1] + Math.sin(t * 0.2 + i) * 0.4 + 7) % 7; p[i * 3 + 2] = s[2]; }));
    return stage(g, () => K.setRig({ sky: '#fff0d8', ground: '#4a3020', hemi: 1.0, keyCol: '#ffe2b8', key: 2.6, rimCol: '#9ab8ff', rim: 0.9, fog: [0x3a2c22, 18, 60], bg: 0x1a120c,
      points: [['#ffd9a0', -10, 4, -2, 6], ['#ffd9a0', 10, 4, -2, 6]], spots: [['#fff4e0', 90, 0, 9, -6, 0, 0, -6.2]] }), ups, { debris: 0x6a4a2c });
  },

  // 6. a skyline penthouse: glass wall onto the night city, marble, sofas, bar, chandelier, art
  penthouse() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.tiles('#1c1c22', '#22222a', 2, '#0a0a0e', [10, 5]), mat: { roughness: 0.1, metalness: 0.3 } })));
    const rug = K.mesh(new THREE.PlaneGeometry(9, 4), M(0x5a1a2a, { surf: surf(256, 128, (q, w, h) => { q.fillStyle = '#5a1a2a'; q.fillRect(0, 0, w, h); q.strokeStyle = '#c9a227'; q.lineWidth = 4; q.strokeRect(8, 8, w - 16, h - 16); q.strokeRect(20, 20, w - 40, h - 40); speckle(q, w, h, 3000, 0.15); }, { bump: 1 }), mat: { roughness: 1 } }), false, true);
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, -1.8); g.add(rug);
    // the glass wall and the city beyond it
    const frame = M(0x0e0e12, { mat: { metalness: 0.8, roughness: 0.3 } });
    for (let x = -24; x <= 24; x += 4) if (Math.abs(x) > 9) g.add(box(frame, 0.12, 8, 0.12, x, 4, -7)); // the middle slides open onto the terrace
    g.add(box(frame, 50, 0.15, 0.2, 0, 7.9, -7)); for (const sx of [-1, 1]) g.add(box(frame, 16, 0.15, 0.2, sx * 17, 0.08, -7));
    for (const sx of [-1, 1]) { const glass = K.mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshPhysicalMaterial({ color: 0x8aa0c0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 }), false); glass.position.set(sx * 17, 4, -7.05); glass.userData.dyn = 1; g.add(glass); }
    // THE TERRACE: a deck out to the edge of the tower, a glass balustrade, loungers, planters, a hot tub; the city far below
    const deck = K.mesh(new THREE.PlaneGeometry(34, 12.5), M(0xffffff, { surf: T.wood('#5a3a26', [10, 4], 24), mat: { roughness: 0.6 } }), false, true); deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.002, -13.25); g.add(deck);
    const slab = box(M(0x1a1a20, { surf: T.concrete('#2a2a30', [8, 1]) }), 34.4, 1.6, 12.9, 0, -0.8, -13.25); g.add(slab); // the edge of the floor slab
    const rail = M(0x0e0e12, { mat: { metalness: 0.85, roughness: 0.3 } });
    g.add(box(M(0x24242a), 34.4, 0.35, 0.3, 0, 0.17, -19.45), box(rail, 34.4, 0.07, 0.12, 0, 1.12, -19.45)); // the kerb and the top rail (stops you, and the camera)
    for (const sx of [-1, 1]) g.add(box(M(0x24242a), 0.3, 0.35, 12.5, sx * 17.05, 0.17, -13.25), box(rail, 0.12, 0.07, 12.5, sx * 17.05, 1.12, -13.25));
    for (let x = -17; x <= 17; x += 2.125) g.add(box(rail, 0.06, 1.1, 0.06, x, 0.6, -19.45, 0, false));
    const bal = K.mesh(new THREE.PlaneGeometry(34.4, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x9ab0d0, transparent: true, opacity: 0.16, roughness: 0.05 }), false); bal.position.set(0, 0.72, -19.42); bal.userData.dyn = 1; g.add(bal);
    const lounge = M(0xe8e2d6, { mat: { roughness: 0.8 } });
    for (const x of [-13, -10.5, 10.5, 13]) g.add(box(lounge, 0.8, 0.3, 2, x, 0.3, -16.5), box(lounge, 0.8, 0.5, 0.25, x, 0.5, -17.5));
    for (const x of [-15.5, 15.5]) { g.add(box(M(0x1a1a20), 1.4, 0.9, 1.4, x, 0.45, -9)); for (let i = 0; i < 5; i++) { const lf = K.mesh(K.GEO.cone, M(0x2f6b2a), true, false); lf.scale.set(0.2, 1.6, 0.2); lf.position.set(x + Math.cos(i * 1.3) * 0.3, 1.6, -9 + Math.sin(i * 1.3) * 0.3); lf.rotation.set(Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4); g.add(lf); } }
    const tub = cyl(M(0xd8d8de, { mat: { roughness: 0.3 } }), 1.3, 0.6, -14, 0.3, -12.5); g.add(tub);
    const water = K.mesh(new THREE.CircleGeometry(1.15, 32), K.std(0x2a8aff, { emissive: 0x1a5aaa, emissiveIntensity: 0.8, roughness: 0.05, transparent: true, opacity: 0.85 }), false); water.rotation.x = -Math.PI / 2; water.position.set(-14, 0.58, -12.5); water.userData.dyn = 1; g.add(water);
    for (let x = -16; x <= 16; x += 4) g.add(glow('#ffd9a0', 1.2, x, 0.25, -19.2, 0.5)); // little lights along the edge
    // the city far below: a grid of lit streets, moving traffic, other towers
    const GY = -38, road = M(0x1c1c22, { surf: T.asphalt('#202026', [20, 2]) });
    const ground = K.mesh(new THREE.PlaneGeometry(300, 160), M(0x0c0d12, { mat: { roughness: 0.95 } }), false); ground.rotation.x = -Math.PI / 2; ground.position.set(0, GY - 0.05, -80); g.add(ground);
    const lanesZ = [-30, -55, -85], lanesX = [-60, -25, 25, 60];
    for (const z of lanesZ) { const r = K.mesh(new THREE.PlaneGeometry(300, 7), road, false); r.rotation.x = -Math.PI / 2; r.position.set(0, GY, z); g.add(r); for (let x = -140; x < 140; x += 6) g.add(box(K.basic('#e8e0b0'), 2.2, 0.02, 0.18, x, GY + 0.02, z, 0, false)); }
    for (const x of lanesX) { const r = K.mesh(new THREE.PlaneGeometry(7, 140), road, false); r.rotation.x = -Math.PI / 2; r.position.set(x, GY + 0.01, -80); g.add(r); }
    for (const z of lanesZ) for (let x = -140; x < 140; x += 14) g.add(glow('#ffcf8a', 3, x, GY + 6, z + 4, 0.55));
    const traffic = []; for (let i = 0; i < 26; i++) { const z = lanesZ[i % 3] + (i % 2 ? 1.7 : -1.7), dir = i % 2 ? 1 : -1, cg = new THREE.Group(); cg.userData.dyn = 1;
      cg.add(box(M(['#c8102e', '#e8e8ec', '#1a3a8a', '#1a1a1e', '#f2b818'][i % 5], { mat: { metalness: 0.6, roughness: 0.35 } }), 4.2, 1.3, 1.9, 0, 0.8, 0, 0, false));
      cg.add(box(K.basic(dir > 0 ? '#fff6dc' : '#ff2030'), 0.1, 0.25, 1.6, 2.15, 0.8, 0, 0, false), box(K.basic(dir > 0 ? '#ff2030' : '#fff6dc'), 0.1, 0.25, 1.6, -2.15, 0.8, 0, 0, false));
      cg.position.set(-140 + (i * 37) % 280, GY, z); g.add(cg); traffic.push([cg, dir, 6 + (i % 4) * 2.5]); }
    ups.push(t => traffic.forEach(([cg, dir, sp]) => { cg.position.x = ((cg.position.x + 140 + dir * sp / 60) % 280 + 280) % 280 - 140; }));
    g.add(skyline({ n: 160, x0: -130, x1: 130, z0: -40, z1: -150, h0: 18, h1: 80, y: GY, base: 0x0a0c18, lit: 0.45, glow: 1.25 }), skyDome('#05061a', '#1a1a4a', '#3a2a5a'));
    g.add(glow('#fff8e0', 14, -30, 30, -150, 0.9));
    // furniture
    const leather = M(0x2a1a14, { mat: { roughness: 0.45 } }), velvet = M(0x3a2a5a, { mat: { roughness: 0.9 } }), goldM = M(0xc9a227, { mat: { metalness: 1, roughness: 0.25 } });
    for (const [x, m] of [[-9, leather], [9, velvet]]) { g.add(box(m, 3.4, 0.45, 1.1, x, 0.35, -5.2), box(m, 3.4, 0.7, 0.3, x, 0.8, -5.7), box(m, 0.3, 0.6, 1.1, x - 1.7, 0.55, -5.2), box(m, 0.3, 0.6, 1.1, x + 1.7, 0.55, -5.2)); }
    g.add(box(M(0x101010, { mat: { metalness: 0.6, roughness: 0.2 } }), 1.6, 0.06, 0.8, -9, 0.45, -3.9), box(goldM, 1.6, 0.04, 0.04, -9, 0.42, -3.5));
    // bar with lit bottle shelves
    g.add(box(M(0x1a1410, { surf: T.wood('#3a2416', [2, 1]) }), 5, 1.1, 0.8, 14, 0.55, -5.6), box(goldM, 5.05, 0.05, 0.85, 14, 1.12, -5.6));
    g.add(box(K.std(0x221a10, { emissive: 0xffb050, emissiveIntensity: 0.4 }), 5, 2.2, 0.3, 14, 2.4, -6.7));
    for (let i = 0; i < 18; i++) g.add(cyl(K.std(['#2f8f4e', '#8a3a1a', '#c9c9d0'][i % 3], { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }), 0.05, 0.32, 11.8 + (i % 9) * 0.5, 1.75 + Math.floor(i / 9) * 0.75, -6.55));
    // chandelier
    const ch = new THREE.Group(); ch.userData.dyn = 1; ch.position.set(0, 6.4, -3.5); g.add(ch);
    const crystal = K.std(0xffffff, { emissive: 0xfff2d0, emissiveIntensity: 1.1, roughness: 0.05, metalness: 0.3 });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 10 + r * 4; i++) { const a = i / (10 + r * 4) * Math.PI * 2, rr = 0.5 + r * 0.35; ch.add(sph(crystal, 0.05, Math.cos(a) * rr, -r * 0.3, Math.sin(a) * rr)); }
    ch.add(glow('#fff2d0', 3, 0, -0.3, 0, 0.6), cyl(goldM, 0.02, 1.6, 0, 0.8, 0)); ups.push(t => { ch.rotation.y = t * 0.1; ch.rotation.z = Math.sin(t * 0.7) * 0.015; });
    // art on the side walls, plants
    for (const [x, c] of [[-18, '#ff3fa4'], [-14, '#3b8cff']]) { const tex = K.canvasTex(256, 320, (q, w, h) => { q.fillStyle = '#efe7d8'; q.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { q.fillStyle = [c, '#111', '#f5c518'][i % 3]; q.globalAlpha = 0.7; q.beginPath(); q.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 60, 0, 7); q.fill(); } });
      g.add(box(goldM, 1.9, 2.4, 0.08, x, 3, -6.8, 0, false)); const p = K.mesh(new THREE.PlaneGeometry(1.7, 2.2), K.std(0xffffff, { map: tex, roughness: 0.9 }), false); p.position.set(x, 3, -6.74); g.add(p); }
    for (const x of [-10, 10]) { g.add(cyl(M(0xf2f2f2, { mat: { roughness: 0.3 } }), 0.3, 0.6, x, 0.3, -6.3)); for (let i = 0; i < 6; i++) { const lf = K.mesh(K.GEO.cone, M(0x2f6b2a), true, false); lf.scale.set(0.12, 1.2, 0.12); lf.position.set(x + Math.cos(i) * 0.15, 1.1, -6.3 + Math.sin(i) * 0.15); lf.rotation.set(Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4); g.add(lf); } }
    return stage(g, () => K.setRig({ sky: '#8a9aff', ground: '#1a1410', hemi: 0.6, keyCol: '#ffe8c8', key: 1.6, rimCol: '#6a8aff', rim: 1.8, fog: [0x0a0a18, 30, 160], bg: 0x05061a,
      points: [['#fff2d0', 0, 5.6, -3.5, 12], ['#ffb050', 14, 2.4, -5.8, 6], ['#6a8aff', -12, 3, -6, 6], ['#9ab8ff', 0, 4, -14, 10]] }), ups, { debris: 0x22222a, arena: { rx: 1000, rz: 820, cz: -560 } }); // a bigger fight floor, out over the terrace
  },

  // 7. a junkyard at sunset: car stacks, tyre piles, a swinging crane magnet, fire barrels
  junkyard() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.gravel([14, 6]), mat: { roughness: 1 } })));
    const rusts = ['#7a4a2a', '#5a6a7a', '#8a2a2a', '#3a5a3a', '#9a8a4a', '#4a4a5a'];
    const rustT = (c) => surf(128, 128, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { q.fillStyle = `rgba(${120 + Math.random() * 60},${50 + Math.random() * 30},20,${Math.random() * 0.5})`; q.beginPath(); q.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 3 + Math.random() * 8, 0, 0, 7); q.fill(); } speckle(q, w, h, 800, 0.25); }, { bump: 3 });
    const rustM = rusts.map(c => M(0xffffff, { surf: rustT(c), mat: { roughness: 0.85, metalness: 0.4 } }));
    for (let s = 0; s < 9; s++) { const x = -22 + s * 5.5 + rnd(-0.6, 0.6), n = 2 + (s % 3); for (let k = 0; k < n; k++) g.add(box(rustM[(s + k) % 6], 4.2, 1.15, 1.9, x + rnd(-0.3, 0.3), 0.58 + k * 1.15, -7.5 - (s % 2) * 2, rnd(-0.15, 0.15))); }
    const tyreM = M(0x141414, { mat: { roughness: 0.9 } }); for (let p = 0; p < 4; p++) for (let k = 0; k < 6; k++) { const t2 = K.mesh(new THREE.TorusGeometry(0.42, 0.17, 8, 18), tyreM, true, true); t2.rotation.x = Math.PI / 2; t2.position.set(-13 + p * 9 + rnd(-0.2, 0.2), 0.17 + k * 0.32, -4.4); g.add(t2); }
    // crane with a swinging magnet
    const yel = M(0xf2b818, { mat: { metalness: 0.4, roughness: 0.5 } });
    g.add(box(yel, 1.2, 9, 1.2, 14, 4.5, -9), box(yel, 10, 0.6, 0.6, 10, 9.2, -9));
    const mag = new THREE.Group(); mag.userData.dyn = 1; mag.add(cyl(M(0x222222), 0.02, 4, 0, -2, 0), cyl(M(0x333338, { mat: { metalness: 0.9, roughness: 0.3 } }), 0.6, 0.3, 0, -4.1, 0)); mag.position.set(6.5, 9, -9); g.add(mag);
    ups.push(t => { mag.rotation.z = Math.sin(t * 0.6) * 0.12; });
    // fire barrels with flames
    const flames = [];
    for (const x of [-9, 3, 18]) { g.add(cyl(rustM[0], 0.32, 0.95, x, 0.48, -3.6)); const f2 = glow('#ff8a2a', 1.2, x, 1.25, -3.6, 0.9); g.add(f2, glow('#ff4010', 2.6, x, 1.4, -3.6, 0.35)); flames.push(f2); }
    ups.push(t => flames.forEach((f2, i) => { const k = 0.85 + Math.sin(t * 17 + i * 3) * 0.12 + Math.sin(t * 7.3 + i) * 0.08; f2.scale.set(1.1 * k, 1.5 * k, 1); }));
    g.add(particles(120, 0xff8a3a, 0.08, [1, 3, -3.8, -3.4], (p, i, s, t) => { const b = [-9, 3, 18][i % 3], k = (s[1] + t * 1.2 * (0.6 + s[3])) % 3; p[i * 3] = b + Math.sin(t * 2 + i) * 0.2 * k; p[i * 3 + 1] = 1.1 + k; p[i * 3 + 2] = -3.6 + s[0] * 0.2; }));
    const fenceT = K.canvasTex(64, 64, (q, w, h) => { q.strokeStyle = 'rgba(150,150,150,0.9)'; q.lineWidth = 2; q.beginPath(); q.moveTo(0, 0); q.lineTo(w, h); q.moveTo(w, 0); q.lineTo(0, h); q.stroke(); }, { repeat: [80, 6] });
    const fn = K.mesh(new THREE.PlaneGeometry(60, 3.5), K.std(0xffffff, { map: fenceT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5 }), false); fn.position.set(0, 1.75, -12); g.add(fn);
    g.add(box(M(0xffffff, { surf: T.metal('#6a5a4a', [3, 1]) }), 4, 3, 3, -18, 1.5, -10.5), skyDome('#3a2a5a', '#ff7a3a', '#ffcc80', [-0.5, 0.05, -1]));
    g.add(skyline({ n: 40, z0: -50, z1: -100, h0: 6, h1: 26, base: 0x2a1a1a, lit: 0.12 }));
    return stage(g, () => K.setRig({ sky: '#ffa070', ground: '#3a2a1a', hemi: 1.0, keyCol: '#ffb070', key: 2.8, rimCol: '#7a6aff', rim: 1.2, fog: [0x7a4a3a, 25, 120], bg: null, bloomT: 1.3,
      points: [['#ff7a2a', -9, 1.4, -3.4, 10], ['#ff7a2a', 3, 1.4, -3.4, 10], ['#ff7a2a', 18, 1.4, -3.4, 10]] }), ups, { debris: 0x5a4c3e });
  },

  // 8. a pier at sunset: boardwalk planks, animated sea, palms, lifeguard tower, string lights, a far ferris wheel
  beach() {
    const g = new THREE.Group(), ups = [];
    g.add(floor(M(0xffffff, { surf: T.wood('#9a7a52', [12, 6], 24), mat: { roughness: 0.8 } }), 60, 12, -3));
    g.add(box(M(0xd8c09a, { surf: surf(256, 256, (q, w, h) => { q.fillStyle = '#d8c39a'; q.fillRect(0, 0, w, h); speckle(q, w, h, 9000, 0.15, 1); }, { repeat: [20, 4], bump: 1 }) }), 80, 0.2, 10, 0, -0.6, -8));
    // the sea: a moving surface
    const seaG = new THREE.PlaneGeometry(240, 120, 90, 40); seaG.rotateX(-Math.PI / 2);
    const sea = K.mesh(seaG, K.std(0x1a5a8a, { roughness: 0.12, metalness: 0.4 }), false, false); sea.position.set(0, -0.8, -72); sea.userData.dyn = 1; g.add(sea);
    const sp = seaG.attributes.position, base = Float32Array.from(sp.array);
    ups.push(t => { for (let i = 0; i < sp.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; sp.setY(i, Math.sin(x * 0.15 + t * 1.2) * 0.35 + Math.sin(z * 0.25 + t * 0.8) * 0.25); } sp.needsUpdate = true; seaG.computeVertexNormals(); });
    g.add(skyDome('#3a2a7a', '#ff7a4a', '#ffd0a0', [0, 0.04, -1]), glow('#ffd080', 40, 0, 4, -170, 1));
    // railing, string lights, palms, lifeguard tower, far ferris wheel
    const rail = M(0xf0eadc, { mat: { roughness: 0.6 } }); g.add(box(rail, 60, 0.08, 0.08, 0, 1.05, -3.1)); for (let x = -28; x <= 28; x += 1.4) g.add(box(rail, 0.07, 1.05, 0.07, x, 0.52, -3.1));
    const bulbs = K.std(0xffe8b0, { emissive: 0xffd080, emissiveIntensity: 1.5 }); for (let x = -26; x <= 26; x += 1.1) g.add(sph(bulbs, 0.06, x, 3.6 - Math.abs(Math.sin(x * 0.28)) * 0.5, -3.3));
    for (let x = -25; x <= 25; x += 5) g.add(cyl(M(0x6a5038), 0.07, 3.8, x, 1.9, -3.3));
    for (const [x, z, h] of [[-15, -6, 7], [-9, -7.5, 6], [11, -6.5, 7.5], [17, -8, 6.5]]) g.add(palm(x, z, h, rnd(0.15, 0.35)));
    const tw = M(0xe8e2d0); g.add(box(tw, 2.2, 0.1, 2, 4, 2.2, -8), box(M(0xc8102e), 2.4, 1.2, 0.1, 4, 2.9, -7.1, 0, false)); for (const [dx, dz] of [[-1, -0.9], [1, -0.9], [-1, 0.9], [1, 0.9]]) g.add(box(tw, 0.12, 2.2, 0.12, 4 + dx, 1.1, -8 + dz));
    const wheel = new THREE.Group(); wheel.userData.dyn = 1; wheel.position.set(-38, 12, -60); g.add(wheel); const wm = K.std(0xffffff, { emissive: 0xff7ab0, emissiveIntensity: 1.2 });
    const ring = K.mesh(new THREE.TorusGeometry(10, 0.15, 6, 48), wm, false, false); wheel.add(ring); for (let i = 0; i < 16; i++) { const sp2 = box(wm, 0.1, 20, 0.1, 0, 0, 0, 0, false); sp2.rotation.z = i / 16 * Math.PI; wheel.add(sp2); wheel.add(sph(K.std(0xffffff, { emissive: ['#ff3fa4', '#2ee6c8', '#f5c518'][i % 3], emissiveIntensity: 1.5 }), 0.5, Math.cos(i / 16 * Math.PI * 2) * 10, Math.sin(i / 16 * Math.PI * 2) * 10, 0)); }
    g.add(box(M(0x2a2a30), 1, 12, 1, -38, 6, -60)); ups.push(t => { wheel.rotation.z = t * 0.08; });
    // gulls
    const gulls = []; for (let i = 0; i < 6; i++) { const gl = K.mesh(new THREE.PlaneGeometry(0.6, 0.12), K.basic('#222', { side: THREE.DoubleSide }), false); gl.userData.dyn = 1; g.add(gl); gulls.push([gl, rnd(0, 6), rnd(8, 14), rnd(-30, -15)]); }
    ups.push(t => gulls.forEach(([gl, ph, y, z]) => { gl.position.set(((t * 2 + ph * 10) % 80) - 40, y + Math.sin(t + ph) * 0.6, z); gl.rotation.z = Math.sin(t * 6 + ph) * 0.4; }));
    return stage(g, () => K.setRig({ sky: '#ffb090', ground: '#5a4030', hemi: 1.1, keyCol: '#ffb070', key: 2.8, rimCol: '#ff7ab0', rim: 1.4, fog: [0xd0805a, 40, 200], bg: null, bloomT: 1.25,
      points: [['#ffd080', -10, 3.4, -3, 6], ['#ffd080', 10, 3.4, -3, 6]] }), ups, { debris: 0x8a6a42 });
  },

  // 9. a frost temple on a mountain: snowy stone court, red gates, lanterns, pines, mountains, snowfall
  temple() {
    const g = new THREE.Group(), ups = [];
    const slabs = surf(256, 256, (q, w, h) => { q.fillStyle = '#5a5e66'; q.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = 80 + Math.random() * 40; q.fillStyle = `rgb(${v},${v + 4},${v + 10})`; q.fillRect(c * 64 + 2, r * 64 + 2, 60, 60); }
      for (let i = 0; i < 30; i++) { q.fillStyle = `rgba(235,240,248,${0.18 + Math.random() * 0.3})`; q.beginPath(); q.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 5 + Math.random() * 14, 0, 0, 7); q.fill(); } }, { repeat: [10, 5], bump: 2.5 });
    g.add(floor(M(0xffffff, { surf: slabs, mat: { roughness: 0.75 } })), floor(M(0xffffff, { surf: T.snow([20, 8]) }), 200, 120, -130));
    // the temple hall
    const red = M(0xa01a1a, { mat: { roughness: 0.6 } }), dwood = M(0x3a2216, { surf: T.wood('#3a2216', [2, 2]) }), roofM = M(0x2a2e36, { mat: { roughness: 0.7 } }), snowM = M(0xf0f4fa, { mat: { roughness: 0.9 } });
    g.add(box(M(0xffffff, { surf: T.concrete('#6a6e76', [6, 1]) }), 16, 0.8, 6, 0, 0.4, -11));
    for (let x = -6; x <= 6; x += 2.4) g.add(cyl(red, 0.25, 5, x, 3.3, -9));
    g.add(box(dwood, 15, 4.6, 0.3, 0, 3.1, -12.6));
    for (let k = 0; k < 2; k++) { const w2 = 18 - k * 5, y = 6.1 + k * 2.2; g.add(box(roofM, w2, 0.5, 8 - k * 2, 0, y, -11)); g.add(box(snowM, w2 * 0.98, 0.18, (8 - k * 2) * 0.95, 0, y + 0.34, -11)); for (const s of [-1, 1]) { const tip = box(roofM, 1.2, 0.3, 0.6, s * (w2 / 2 + 0.3), y + 0.4, -11); tip.rotation.z = s * 0.4; g.add(tip); } }
    // red gates in front
    for (const x of [-11, 11]) { g.add(cyl(red, 0.22, 4.6, x - 1.6, 2.3, -6.5), cyl(red, 0.22, 4.6, x + 1.6, 2.3, -6.5), box(red, 4.6, 0.32, 0.45, x, 4.4, -6.5), box(M(0x1a1a1a), 5.2, 0.28, 0.5, x, 4.85, -6.5), box(snowM, 5.1, 0.1, 0.48, x, 5.04, -6.5)); }
    // stone lanterns
    const stoneL = M(0x8a8e96, { mat: { roughness: 0.9 } });
    for (const x of [-6.5, -3.2, 3.2, 6.5]) { g.add(box(stoneL, 0.5, 0.9, 0.5, x, 0.45, -5.2), box(K.std(0xffcc7a, { emissive: 0xff9a30, emissiveIntensity: 1.4 }), 0.42, 0.4, 0.42, x, 1.1, -5.2, 0, false), box(stoneL, 0.8, 0.15, 0.8, x, 1.38, -5.2), box(snowM, 0.7, 0.08, 0.7, x, 1.5, -5.2)); g.add(glow('#ffaa50', 1.4, x, 1.1, -5.0, 0.5)); }
    // pines and mountains
    for (let i = 0; i < 14; i++) g.add(pine(-26 + i * 4 + rnd(-1, 1), -14 - (i % 3) * 3, rnd(5, 8), true));
    for (const [x, s] of [[-50, 40], [-10, 55], [35, 45], [75, 38]]) { const mt = K.mesh(K.GEO.cone, M(0x5a6070, { mat: { roughness: 1, flatShading: true } }), false, false); mt.scale.set(s, s * 0.9, s); mt.position.set(x, s * 0.45 - 6, -120); g.add(mt); const cap = K.mesh(K.GEO.cone, snowM, false, false); cap.scale.set(s * 0.42, s * 0.36, s * 0.42); cap.position.set(x, s * 0.72 - 6, -120); g.add(cap); }
    g.add(skyDome('#5a7ab0', '#c8d8f0', '#eef2fa'));
    g.add(particles(600, 0xffffff, 0.07, [24, 12, -14, 4], (p, i, s, t) => { p[i * 3] = s[0] + Math.sin(t * 0.6 + i) * 0.5; p[i * 3 + 1] = 12 - ((s[1] + t * (0.5 + s[3] * 0.6)) % 12); p[i * 3 + 2] = s[2]; }));
    return stage(g, () => K.setRig({ sky: '#dfe8ff', ground: '#8a90a0', hemi: 1.2, keyCol: '#fff4e8', key: 2.4, rimCol: '#aac4ff', rim: 1.4, fog: [0xc8d4e8, 25, 140], bg: null, bloomT: 1.4,
      points: [['#ffaa50', -6.5, 1.2, -5, 4], ['#ffaa50', -3.2, 1.2, -5, 4], ['#ffaa50', 3.2, 1.2, -5, 4], ['#ffaa50', 6.5, 1.2, -5, 4]] }), ups, { debris: 0x8a8e96 });
  },

  // 10. a parking garage: striped pillars, parked cars, fluorescent tubes, pipes, exit signs, puddles
  garage() {
    const g = new THREE.Group(), ups = [];
    const lot = surf(512, 256, (q, w, h) => { q.fillStyle = '#5a5a5e'; q.fillRect(0, 0, w, h); speckle(q, w, h, 9000, 0.18, 1.5); q.fillStyle = 'rgba(240,240,240,0.85)'; for (let x = 0; x < w; x += 128) q.fillRect(x, 0, 6, h * 0.45);
      for (let i = 0; i < 5; i++) { q.fillStyle = 'rgba(20,20,26,0.35)'; q.beginPath(); q.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 8 + Math.random() * 18, 0, 0, 7); q.fill(); } }, { repeat: [6, 3], bump: 1.6 });
    g.add(floor(M(0xffffff, { surf: lot, mat: { roughness: 0.55, metalness: 0.1 } })));
    const conc = M(0xffffff, { surf: T.concrete('#6e6e72', [10, 2]) });
    g.add(box(conc, 60, 0.5, 26, 0, 4.6, -6), box(conc, 60, 4.6, 0.4, 0, 2.3, -12));
    const stripeT = K.canvasTex(64, 256, (q, w, h) => { q.fillStyle = '#7a7a7e'; q.fillRect(0, 0, w, h); for (let y = h - 70; y < h; y += 20) { q.fillStyle = '#f2c218'; q.fillRect(0, y, w, 10); q.fillStyle = '#111'; q.fillRect(0, y + 10, w, 10); } });
    const pillar = K.std(0xffffff, { map: stripeT, roughness: 0.8 });
    for (let x = -21; x <= 21; x += 7) { g.add(box(pillar, 0.7, 4.4, 0.7, x, 2.2, -3.6)); g.add(box(pillar, 0.7, 4.4, 0.7, x, 2.2, -10)); }
    g.add(K.textPlane('LEVEL  B2', 3, 0.7, '900 120px Arial', '#f2c218', '#000')); g.children[g.children.length - 1].position.set(0, 2.6, -11.78);
    for (const x of [-14, 14]) { g.add(box(K.basic('#1a9a4a'), 1.2, 0.4, 0.08, x, 3.6, -11.75, 0, false)); const tx = K.textPlane('EXIT', 1.1, 0.35, '900 160px Arial', '#e8ffe8', '#2aff6a'); tx.position.set(x, 3.6, -11.7); g.add(tx); }
    const colors = ['#c8102e', '#1a3a8a', '#e8e8ec', '#1a1a1e', '#f2b818', '#3a6a3a'];
    for (let i = 0; i < 6; i++) g.add(car(colors[i], -17.5 + i * 7, -7, Math.PI / 2 + (i % 2) * Math.PI));
    // pipes and fluorescent tubes
    const pipeM = M(0x9a3a2a, { mat: { metalness: 0.6, roughness: 0.4 } }); for (const z of [-2, -5, -9]) { const p = cyl(pipeM, 0.09, 60, 0, 4.2, z); p.rotation.z = Math.PI / 2; g.add(p); }
    const tubes = []; for (let x = -24; x <= 24; x += 6) { const tb = box(K.basic('#e8f6ff'), 2.2, 0.06, 0.12, x, 4.3, -1, 0, false); tb.userData.dyn = 1; g.add(tb); tubes.push(tb); }
    ups.push(t => tubes.forEach((tb, i) => { tb.material.color.setScalar(i === 2 && (Math.sin(t * 31) > 0.3 || Math.sin(t * 3) > 0.9) ? 0.15 : 1); }));
    for (let x = -20; x <= 20; x += 10) g.add(glow('#eaf6ff', 2.2, x, 4.2, -1, 0.25));
    return stage(g, () => K.setRig({ sky: '#e8f2ff', ground: '#2a2a2e', hemi: 0.7, keyCol: '#eaf4ff', key: 1.7, rimCol: '#ffd27a', rim: 0.9, fog: [0x14161a, 14, 50], bg: 0x0a0b0d,
      points: [['#eaf6ff', -12, 4, -1, 8], ['#eaf6ff', 0, 4, -1, 8], ['#eaf6ff', 12, 4, -1, 8], ['#ff2030', 0, 0.7, -9, 3]] }), ups, { debris: 0x6e6e72 });
  },

  // 11. SPECIAL: the BP FIGHT NIGHT octagon. A raised cage in the middle of a packed arena bowl: the canvas with its
  // logos, chain-link panels on padded posts (red and blue corners), a walkway with barriers out to the walkout
  // tunnel, LED boards round the floor, cageside desks, a lighting truss over the cage and a jumbotron overhead.
  // It's built the whole way round (the fight can face any way), so it skips the mirrored copies other stages use.
  octagon() {
    const g = new THREE.Group(), ups = [], TAU = Math.PI * 2;
    const R = OCT.R, AP = R * Math.cos(Math.PI / 8), SIDE = 2 * R * Math.sin(Math.PI / 8), PH = OCT.PH, DA = OCT.DA; // posts' radius, the apothem, a side, the platform, the walkway's angle
    const at = (a, r, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, -Math.sin(a) * r); // a direction angle on the floor (0 = +x, counter-clockwise from above)
    const vA = k => Math.PI / 8 + k * Math.PI / 4; // the posts: flat sides face along x and z
    const black = M(0x0c0c0e, { mat: { roughness: 0.55 } }), pad = M(0x121214, { mat: { roughness: 0.38, metalness: 0.05 } });
    // the arena floor round the cage, polished and dark
    const fl = K.mesh(new THREE.CircleGeometry(48, 48), M(0xffffff, { surf: T.tiles('#111114', '#141418', 2, '#08080a', [24, 24], false), mat: { roughness: 0.35, metalness: 0.2 } }), false, true);
    fl.rotation.x = -Math.PI / 2; fl.position.y = -PH; g.add(fl);
    // the canvas: grey, its logos printed on, the red and blue corners marked
    const matT = surf(1024, 1024, (q, w, h) => {
      const c = w / 2; q.fillStyle = '#121214'; q.fillRect(0, 0, w, h);
      q.save(); q.translate(c, c); q.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; q.lineTo(Math.cos(a) * c * 0.995, -Math.sin(a) * c * 0.995); } q.closePath();
      let gr = q.createRadialGradient(0, 0, 40, 0, 0, c); gr.addColorStop(0, '#cfccc4'); gr.addColorStop(1, '#b4b0a7'); q.fillStyle = gr; q.fill();
      q.lineWidth = 26; q.strokeStyle = '#1b1b1e'; q.stroke(); q.restore(); speckle(q, w, h, 9000, 0.06);
      // the centre logo
      q.save(); q.translate(c, c); q.globalAlpha = 0.92; q.fillStyle = '#b3121b'; q.beginPath(); q.arc(0, 0, 150, 0, TAU); q.fill(); q.lineWidth = 10; q.strokeStyle = '#d8a634'; q.stroke();
      q.lineWidth = 4; q.beginPath(); q.arc(0, 0, 128, 0, TAU); q.stroke(); q.fillStyle = '#f4ead2'; q.font = '900 132px Impact, Oswald, "Arial Black", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP', 0, 6);
      q.fillStyle = '#1a1a1e'; q.font = '900 74px Impact, Oswald, "Arial Black", sans-serif'; q.fillText('BP VERSE', 0, -232); q.font = '700 40px Impact, Oswald, "Arial Black", sans-serif'; q.fillText('F I G H T   N I G H T', 0, 232);
      // the sponsors, round the mat
      [['BRADAR', 0.62, Math.PI * 0.5], ['PRESSY ENERGY', 0.62, -Math.PI * 0.5], ['VERSE+', 0.62, 0], ['BP SPORTS', 0.62, Math.PI]].forEach(([t, r, a]) => {
        q.save(); q.rotate(-a + Math.PI / 2); q.translate(0, -r * c); q.fillStyle = 'rgba(20,20,26,0.82)'; q.font = '900 50px Impact, Oswald, "Arial Black", sans-serif'; q.fillText(t, 0, 0); q.restore(); });
      q.restore();
      // the corners: red (left) and blue (right)
      for (const [k, cc] of [[4, '#c8102e'], [0, '#1e4fd8']]) { const a = Math.PI / 8 + k * Math.PI / 4; q.save(); q.translate(c + Math.cos(a) * c * 0.86, c - Math.sin(a) * c * 0.86); q.fillStyle = cc; q.globalAlpha = 0.85; q.beginPath(); q.arc(0, 0, 46, 0, TAU); q.fill(); q.restore(); }
    }, { bump: 0.8 });
    const canvasM = M(0xffffff, { surf: matT, mat: { roughness: 0.92 } });
    const mat = K.mesh(new THREE.CircleGeometry(R + 0.04, 8, Math.PI / 8), canvasM, false, true); mat.rotation.x = -Math.PI / 2; mat.position.y = 0.004; g.add(mat);
    // the platform: black with an LED strip, "BP VERSE" round its sides
    const sideT = K.canvasTex(2048, 128, (q, w, h) => { q.fillStyle = '#08080a'; q.fillRect(0, 0, w, h); q.fillStyle = '#e8e2d2'; q.font = '900 70px Impact, Oswald, "Arial Black", sans-serif'; q.textBaseline = 'middle'; for (let x = 20; x < w; x += 512) { q.fillText('BP VERSE', x, h * 0.55); q.fillStyle = '#c8102e'; q.fillText('FIGHT NIGHT', x + 250, h * 0.55); q.fillStyle = '#e8e2d2'; } });
    const plat = K.mesh(new THREE.CylinderGeometry(R + 0.62, R + 0.7, PH, 8, 1, true, Math.PI / 8), K.std(0xffffff, { map: sideT, roughness: 0.5 }), false, true); plat.position.y = -PH / 2; g.add(plat);
    const apron = K.mesh(new THREE.RingGeometry(R - 0.05, R + 0.62, 8, 1, Math.PI / 8), black, false, true); apron.rotation.x = -Math.PI / 2; apron.position.y = 0.002; g.add(apron);
    const led = K.mesh(new THREE.CylinderGeometry(R + 0.64, R + 0.64, 0.05, 8, 1, true, Math.PI / 8), K.basic('#ff2a3a'), false); led.position.y = -0.06; g.add(led);
    // the fence: chain-link (cut out, so you see through it) between padded posts, a padded rail top and bottom
    const linkT = K.canvasTex(64, 64, (q, w, h) => { q.clearRect(0, 0, w, h); q.strokeStyle = '#b8bcc4'; q.lineWidth = 6.5; q.lineCap = 'round';
      q.beginPath(); q.moveTo(0, h / 2); q.lineTo(w / 2, 0); q.lineTo(w, h / 2); q.lineTo(w / 2, h); q.closePath(); q.stroke(); }, { repeat: [Math.round(SIDE / 0.085), Math.round(1.55 / 0.085)] });
    const linkM = K.std(0x2e3036, { map: linkT, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.75, roughness: 0.42 });
    const railM = M(0x101012, { mat: { roughness: 0.3, metalness: 0.1 } });
    for (let k = 0; k < 8; k++) {
      const m = vA(k) + Math.PI / 8, c0 = at(m, AP), ry = m - Math.PI / 2; // (a mesh's x runs along the side)
      const panel = K.mesh(new THREE.PlaneGeometry(SIDE, 1.55), linkM, false, false); panel.position.set(c0.x, 0.3 + 0.775, c0.z); panel.rotation.y = ry; g.add(panel);
      const bot = box(pad, SIDE, 0.3, 0.12, c0.x, 0.15, c0.z, ry); g.add(bot);
      const top = cyl(railM, 0.075, SIDE, c0.x, 1.9, c0.z); top.rotation.set(0, ry, Math.PI / 2); g.add(top);
      const mid = cyl(railM, 0.025, SIDE, c0.x, 1.05, c0.z); mid.rotation.set(0, ry, Math.PI / 2); g.add(mid);
      // the posts, padded; the red and blue corners
      const p0 = at(vA(k), R), cc = k === 4 ? 0xc8102e : k === 0 ? 0x1e4fd8 : 0x141416;
      g.add(cyl(M(0x1a1a1c, { mat: { metalness: 0.6, roughness: 0.35 } }), 0.06, 2.05, p0.x, 1.02, p0.z), cyl(M(cc, { mat: { roughness: 0.35 } }), 0.14, 1.55, p0.x, 1.08, p0.z), cyl(railM, 0.1, 0.12, p0.x, 2.0, p0.z));
      // the door: a frame and a latch on the walkway side
      if (Math.abs(Math.atan2(Math.sin(m - DA), Math.cos(m - DA))) < 0.1) { for (const s2 of [-0.55, 0.55]) { const d0 = c0.clone().add(new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)).multiplyScalar(s2)); g.add(box(M(0x2a2c32, { mat: { metalness: 0.8, roughness: 0.3 } }), 0.06, 1.8, 0.06, d0.x, 1.0, d0.z, ry)); }
        g.add(box(M(0x2a2c32, { mat: { metalness: 0.8 } }), 1.16, 0.06, 0.06, c0.x, 1.88, c0.z, ry), box(M(0xc9a227, { mat: { metalness: 1, roughness: 0.3 } }), 0.1, 0.16, 0.08, c0.x, 1.05, c0.z, ry)); }
    }
    // steps up to the door
    const stepM = M(0x1a1a1e, { surf: T.metal('#2a2a30', [2, 1]) });
    for (let i = 0; i < 4; i++) { const r = R + 0.85 + i * 0.4, c0 = at(DA, r), hgt = PH * (4 - i) / 4; g.add(box(stepM, 1.3, hgt, 0.4, c0.x, -PH + hgt / 2, c0.z, DA + Math.PI / 2)); }
    // the walkway out to the tunnel: a lit runner, barriers either side
    const wlen = OCT.TUN - R - 2.4, wmid = at(DA, R + 2.4 + wlen / 2, -PH + 0.01);
    const runner = K.mesh(new THREE.PlaneGeometry(1.9, wlen), M(0x1c0a0c, { mat: { roughness: 0.7 } }), false, true); runner.rotation.set(-Math.PI / 2, 0, DA - Math.PI / 2); runner.position.copy(wmid); g.add(runner);
    for (const s2 of [-1.25, 1.25]) { const off = new THREE.Vector3(Math.sin(DA), 0, Math.cos(DA)).multiplyScalar(s2), c0 = wmid.clone().add(off);
      g.add(box(M(0x26282e, { mat: { metalness: 0.7, roughness: 0.35 } }), wlen, 1.05, 0.07, c0.x, -PH + 0.53, c0.z, DA));
      const strip = box(K.basic('#ffb347'), wlen, 0.03, 0.03, c0.x - off.x * 0.25, -PH + 0.02, c0.z - off.z * 0.25, DA, false); g.add(strip); }
    // the tunnel: an arch of LED screens, smoke and light
    const tc = at(DA, OCT.TUN), tr = DA - Math.PI / 2, frameM = M(0x16161a, { mat: { metalness: 0.6, roughness: 0.35 } });
    const archT = K.canvasTex(1024, 256, (q, w, h) => { const gg = q.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, '#5a0008'); gg.addColorStop(0.5, '#d01826'); gg.addColorStop(1, '#5a0008'); q.fillStyle = gg; q.fillRect(0, 0, w, h);
      q.fillStyle = '#ffe0a0'; q.font = '900 150px Impact, Oswald, "Arial Black", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP FIGHT NIGHT', w / 2, h / 2 + 8); });
    const arch = K.mesh(new THREE.PlaneGeometry(5.2, 1.3), K.std(0xffffff, { map: archT, emissive: 0xffffff, emissiveMap: archT, emissiveIntensity: 1.25 }), false); arch.position.set(tc.x, -PH + 4.1, tc.z); arch.rotation.y = tr; g.add(arch);
    for (const s2 of [-2.7, 2.7]) { const o2 = new THREE.Vector3(Math.sin(DA), 0, Math.cos(DA)).multiplyScalar(s2); g.add(box(frameM, 0.4, 4.9, 0.6, tc.x + o2.x, -PH + 2.45, tc.z + o2.z, tr));
      const scr = K.mesh(new THREE.PlaneGeometry(1.6, 3.2), K.std(0xffffff, { map: archT, emissive: 0xffffff, emissiveMap: archT, emissiveIntensity: 0.6 }), false); scr.position.set(tc.x + o2.x * 1.42 + Math.cos(DA) * 0.2, -PH + 2.1, tc.z + o2.z * 1.42 - Math.sin(DA) * 0.2); scr.rotation.y = tr; g.add(scr); }
    g.add(box(frameM, 6, 0.5, 0.7, tc.x, -PH + 4.95, tc.z, tr));
    const back = at(DA, OCT.TUN + 1.6); g.add(box(M(0x050506), 5, 4.6, 0.3, back.x, -PH + 2.3, back.z, tr)); // the dark mouth behind
    g.add(glow('#ff3a2a', 7, tc.x, -PH + 2, tc.z, 0.35));
    const smoke = particles(70, 0x6a5458, 0.32, [2.6, 2.4, -1.2, 1.2], (pp, i, s2, t) => { const r = OCT.TUN - 0.6 - ((s2[3] * 3 + t * 0.35) % 3), sd = s2[0]; pp[i * 3] = Math.cos(DA) * r + Math.sin(DA) * sd; pp[i * 3 + 1] = -PH + 0.2 + s2[1] * 0.6 + Math.sin(t + i) * 0.1; pp[i * 3 + 2] = -Math.sin(DA) * r + Math.cos(DA) * sd; }); smoke.material.opacity = 0.18; g.add(smoke);
    // LED boards round the floor (a gap for the walkway), scrolling
    const boardT = K.canvasTex(2048, 96, (q, w, h) => { q.fillStyle = '#050507'; q.fillRect(0, 0, w, h); const ads = [['BP VERSE', '#ffd27a'], ['BRADAR', '#3ea6ff'], ['PRESSY ENERGY', '#ff2b2b'], ['FIGHT NIGHT', '#ffffff'], ['VERSE+', '#3ddc84']];
      q.font = '900 64px Impact, Oswald, "Arial Black", sans-serif'; q.textBaseline = 'middle'; let x = 30; ads.forEach(([t, c]) => { q.fillStyle = c; q.fillText(t, x, h / 2 + 4); x += q.measureText(t).width + 90; }); }, { repeat: [6, 1] });
    const thGap = 0.17, th0 = Math.PI / 2 + DA; // a cylinder's angle runs from +z; the walkway's
    const boards = K.mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.85, 64, 1, true, th0 + thGap, TAU - thGap * 2), K.std(0xffffff, { map: boardT, emissive: 0xffffff, emissiveMap: boardT, emissiveIntensity: 1.1, side: THREE.DoubleSide }), false); boards.position.y = -PH + 0.45; boards.userData.dyn = 1; g.add(boards);
    ups.push(t => { boardT.offset.x = (t * 0.03) % 1; });
    // cageside: the commentary desk, the judges, cameras on the apron
    const deskM = M(0x111114, { mat: { roughness: 0.4 } }), monM = K.std(0x0a1a2a, { emissive: 0x2a6aa8, emissiveIntensity: 0.9 });
    for (const [a, r] of [[Math.PI / 2, 7.1], [Math.PI / 2 + 0.55, 7.1], [-Math.PI / 2 + 0.4, 7.2], [Math.PI + 0.5, 7.1]]) { const c0 = at(a, r, -PH), ry = a + Math.PI / 2;
      g.add(box(deskM, 2.6, 0.75, 0.7, c0.x, -PH + 0.375, c0.z, ry), box(M(0xc9a227, { mat: { metalness: 1, roughness: 0.3 } }), 2.62, 0.05, 0.72, c0.x, -PH + 0.76, c0.z, ry));
      for (const s2 of [-0.7, 0.7]) { const o2 = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)).multiplyScalar(s2); const mon = box(monM, 0.5, 0.32, 0.03, c0.x + o2.x, -PH + 0.95, c0.z + o2.z, ry, false); mon.rotation.x = -0.2; g.add(mon);
        const per = at(a, r + 0.7, -PH); g.add(cyl(M(0x222226), 0.2, 0.9, per.x + o2.x, -PH + 0.9, per.z + o2.z), sph(M(0x5a3a2a), 0.13, per.x + o2.x, -PH + 1.52, per.z + o2.z)); } }
    // the crowd: a full bowl of seats rising away from the cage (the walkway cuts through it)
    const tiers = 12, seatM = M(0x15151a, { mat: { roughness: 0.8 } }), seatTop = M(0x24242c, { mat: { roughness: 0.7 } });
    const crowdMat = K.std(0xffffff, { roughness: 0.85 }), people = [];
    for (let i = 0; i < tiers; i++) {
      const r = 10 + i * 1.05, y = -PH + 0.55 + i * 0.55, gap = 1.6 / r;
      const riser = K.mesh(new THREE.CylinderGeometry(r, r, 0.55, 72, 1, true, th0 + gap, TAU - gap * 2), seatM, false, false); riser.position.y = y - 0.275; g.add(riser);
      const tread = K.mesh(new THREE.RingGeometry(r, r + 1.05, 72, 1, DA + gap, TAU - gap * 2), seatTop, false, true); tread.rotation.x = -Math.PI / 2; tread.position.y = y; g.add(tread);
      const n = Math.floor((TAU - gap * 2) * r / 0.62);
      for (let j = 0; j < n; j++) { if (Math.random() < 0.06) continue; const a = DA + gap + (j + 0.5) / n * (TAU - gap * 2); people.push({ a, r: r + 0.45 + rnd(-0.08, 0.08), y, ph: rnd(0, 6), s: rnd(0.9, 1.08), ti: i,
        w: rnd(0.9, 1.25), th: Math.random(), kind: Math.random(), up: Math.random() < 0.08 }); } // w: build; th: how hyped it takes to get them going; kind: clapper / fist pumper / both arms; up: stands all night
    }
    // the people: a body (shoulders wider than the waist), legs (sat or stood), two arms with hands, a head, hair or a
    // cap. Each part is one instanced mesh for the whole bowl, so a couple of thousand fans cost a handful of draws
    const NP = people.length, cyl8 = new THREE.CylinderGeometry(0.5, 0.36, 1, 8), armG = new THREE.CylinderGeometry(0.5, 0.42, 1, 6).translate(0, -0.5, 0), capG = new THREE.SphereGeometry(1, 8, 4, 0, TAU, 0, Math.PI * 0.55), legG = new THREE.BoxGeometry(1, 1, 1), headG = new THREE.SphereGeometry(1, 8, 6), handG = new THREE.IcosahedronGeometry(1, 0);
    const part = geo => { const m = new THREE.InstancedMesh(geo, crowdMat, NP); m.frustumCulled = false; return m; };
    const bodies = part(cyl8), heads = part(headG), hair = part(capG), legs = part(legG), armL = part(armG), armR = part(armG), handL = part(handG), handR = part(handG);
    const shirts = ['#1a1a1e', '#26262c', '#c8102e', '#f2f2f2', '#1e4fd8', '#3a3a42', '#d8a634', '#0e0e10', '#5a5a62', '#7a1a20', '#2c5a3a', '#e8e0d0', '#ff6a1a', '#4a2a6a'];
    const skins = ['#f1c7a5', '#d9a07a', '#a86b48', '#6b3f2a', '#3d2418', '#e8b896'], hairs = ['#141012', '#2a1a10', '#4a2e18', '#8a6a3a', '#c8b07a', '#6a6a6e', '#1a1a1a'], caps = ['#c8102e', '#111111', '#1e4fd8', '#f2f2f2', '#d8a634'], pants = ['#1c1c22', '#2a3550', '#3a3a40', '#141418', '#4a3a2a'];
    const pick = a => a[(Math.random() * a.length) | 0], cl = new THREE.Color();
    people.forEach((q, i) => { const sh = cl.set(pick(shirts)).clone(), sk = pick(skins); bodies.setColorAt(i, sh); armL.setColorAt(i, sh); armR.setColorAt(i, sh); heads.setColorAt(i, cl.set(sk)); handL.setColorAt(i, cl.set(sk)); handR.setColorAt(i, cl.set(sk));
      q.cap = Math.random() < 0.18; hair.setColorAt(i, cl.set(q.cap ? pick(caps) : pick(hairs))); legs.setColorAt(i, cl.set(pick(pants))); q.bald = !q.cap && Math.random() < 0.12;
      q.yaw = Math.atan2(-Math.cos(q.a), Math.sin(q.a)); q.x = Math.cos(q.a) * q.r; q.z = -Math.sin(q.a) * q.r; });
    // signs held up in the front rows
    const signTex = ['KO!', 'BP', 'FIGHT!', 'GOAT', 'TOUCH GLOVES', 'ONE MORE ROUND', 'VERSE', '10-9', 'BLOOD MOON', 'FINISH HIM'].map((t2, k) => K.canvasTex(256, 128, (q, w, h) => { q.fillStyle = ['#ffffff', '#ffe14a', '#ff3a3a', '#3ea6ff', '#ffffff'][k % 5]; q.fillRect(0, 0, w, h); q.strokeStyle = '#111'; q.lineWidth = 8; q.strokeRect(4, 4, w - 8, h - 8);
      q.fillStyle = k % 5 === 2 ? '#fff' : '#111'; q.font = '900 ' + (t2.length > 8 ? 34 : 64) + 'px Impact, Oswald, "Arial Black", sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(t2, w / 2, h / 2 + 4); }));
    const signMats = signTex.map(t2 => K.std(0xffffff, { map: t2, roughness: 0.8, side: THREE.DoubleSide })), signs = [], signGeo = new THREE.PlaneGeometry(0.62, 0.31);
    for (let k = 0; k < 34; k++) { const who = people.filter(q => q.ti < 4)[(Math.random() * people.filter(q => q.ti < 4).length) | 0]; if (!who || who.sign) continue; who.sign = 1; who.kind = 2;
      const m = K.mesh(signGeo, signMats[k % signMats.length], false); m.userData.dyn = 1; signs.push([m, who]); g.add(m); }
    const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3(), _yq = new THREE.Quaternion(), YAX = new THREE.Vector3(0, 1, 0);
    const put = (im, i, x, y, z, q, sx, sy, sz) => { _p.set(x, y, z); _s.set(sx, sy, sz); m4.compose(_p, q, _s); im.setMatrixAt(i, m4); };
    const m4 = new THREE.Matrix4(); let half = 0;
    const upCrowd = (t, all) => { const hype = typeof OCT_HYPE === 'function' ? OCT_HYPE() : 0.4;
      // a Mexican wave goes round when it's quiet
      const waveOn = hype < 0.6 && (t % 40) < 14, waveA = DA + ((t % 40) / 14) * TAU;
      for (let i = all ? 0 : half; i < NP; i += all ? 1 : 2) { const q = people[i], s2 = q.s;
        const wv = waveOn ? Math.max(0, 1 - Math.abs(((q.a - waveA) % TAU + TAU * 1.5) % TAU - Math.PI) * 1.6) : 0; // 0..1 as the wave passes
        const going = hype > q.th * 0.9 || wv > 0.3, stand = q.up || wv > 0.4 || (going && (q.ti < 4 ? hype > 0.35 : hype > 0.6 + q.th * 0.3));
        const bob = going ? Math.max(0, Math.sin(t * (4 + hype * 4) + q.ph)) * (0.02 + hype * 0.06) : Math.sin(t * 0.8 + q.ph) * 0.006;
        const hip = q.y + (stand ? 0.86 : 0.46) * s2 + bob + wv * 0.15, sx = 0.4 * s2 * q.w, cy = Math.cos(q.yaw), sy = Math.sin(q.yaw);
        _yq.setFromAxisAngle(YAX, q.yaw); const lean = stand ? 0 : 0.08;
        _e.set(lean, q.yaw, 0); _q.setFromEuler(_e);
        put(bodies, i, q.x, hip + 0.3 * s2, q.z, _q, sx, 0.6 * s2, 0.24 * s2 * q.w);
        if (stand) put(legs, i, q.x, hip - 0.43 * s2, q.z, _yq, 0.3 * s2 * q.w, 0.86 * s2, 0.17 * s2);
        else put(legs, i, q.x + sy * 0.2 * s2, hip - 0.04, q.z + cy * 0.2 * s2, _yq, 0.32 * s2 * q.w, 0.15 * s2, 0.48 * s2);
        const hy = hip + 0.72 * s2; put(heads, i, q.x, hy, q.z, _yq, 0.115 * s2, 0.135 * s2, 0.12 * s2);
        if (q.bald) put(hair, i, q.x, -60, q.z, _yq, 0.01, 0.01, 0.01); else put(hair, i, q.x, hy + 0.012 * s2, q.z - cy * 0.006, _yq, 0.122 * s2, (q.cap ? 0.12 : 0.13) * s2, 0.126 * s2);
        // arms: resting, clapping, pumping a fist, or both up
        const kind = q.kind < 0.45 ? 0 : q.kind < 0.8 ? 1 : 2, act = going ? 1 : 0, sp = t * (5 + hype * 5) + q.ph;
        for (const sd of [-1, 1]) { let pitch = 0.25, roll = sd * 0.1;
          if (wv > 0.4) { pitch = 2.9; roll = sd * 0.25; }
          else if (act && kind === 0) { pitch = 1.25; roll = -sd * (0.15 + 0.22 * Math.abs(Math.sin(sp * 1.4))); } // clapping
          else if (act && kind === 1 && sd === 1) { pitch = 2.55 + Math.sin(sp) * 0.35; roll = 0.1; } // a fist in the air
          else if (act && kind === 2) { pitch = 2.5 + Math.sin(sp + sd) * 0.25; roll = sd * (0.35 + Math.sin(sp * 0.7) * 0.15); } // both arms up
          else if (!stand) { pitch = 0.6; roll = sd * 0.05; } // sat, hands on their knees
          _e.set(-pitch, q.yaw, roll); _q.setFromEuler(_e);
          const shX = q.x + cy * sd * sx * 0.48, shZ = q.z - sy * sd * sx * 0.48, shY = hip + 0.55 * s2, L = 0.56 * s2;
          put(sd < 0 ? armL : armR, i, shX, shY, shZ, _q, 0.085 * s2, L, 0.085 * s2);
          _o.set(0, -L, 0).applyQuaternion(_q); put(sd < 0 ? handL : handR, i, shX + _o.x, shY + _o.y, shZ + _o.z, _yq, 0.05 * s2, 0.055 * s2, 0.05 * s2); }
      }
      half ^= 1;
      for (const k of [bodies, heads, hair, legs, armL, armR, handL, handR]) k.instanceMatrix.needsUpdate = true;
      for (const [m, q] of signs) { const upS = hype > 0.3; const ly = q.y + (upS ? 2.25 : 1.15) * q.s + (upS ? Math.sin(t * 5 + q.ph) * 0.05 : 0), fw = upS ? -0.15 : 0.32;
        m.position.set(q.x + Math.sin(q.yaw) * fw, ly, q.z + Math.cos(q.yaw) * fw); m.rotation.set(upS ? 0 : -1.2, q.yaw + Math.PI, Math.sin(t * 3 + q.ph) * 0.06, 'YXZ'); } };
    upCrowd(0, true); ups.push(t => upCrowd(t, false));
    const crowd = new THREE.Group(); crowd.add(bodies, heads, hair, legs, armL, armR, handL, handR); crowd.userData.dyn = 1; g.add(crowd);
    // phone lights and camera flashes in the crowd
    g.add(particles(260, 0xffffff, 0.22, [1, 1, 0, 1], (pp, i, s2, t) => { const a = s2[3] * TAU, ti = (i * 7) % tiers, r = 10.5 + ti * 1.05, on = Math.sin(t * (1.5 + (i % 5)) + i * 13.1) > 0.985;
      pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = on ? -PH + 1.6 + ti * 0.55 : -50; pp[i * 3 + 2] = -Math.sin(a) * r; }));
    // the outer wall of the bowl, and the dark above it
    const wall = K.mesh(new THREE.CylinderGeometry(24, 24, 14, 64, 1, true), M(0x0a0a0e, { mat: { roughness: 0.9, side: THREE.BackSide } }), false); wall.position.y = 5; g.add(wall);
    // the lighting truss over the cage, its lamps and their beams
    const trussM = M(0x2a2c32, { mat: { metalness: 0.8, roughness: 0.35 } }), TR = 6, TY = 7.6;
    for (let k = 0; k < 8; k++) { const a0 = vA(k), a1 = vA(k + 1), p0 = at(a0, TR, TY), p1 = at(a1, TR, TY), mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1), ry = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
      for (const dy of [0, 0.5]) g.add(box(trussM, len, 0.08, 0.08, mid.x, TY + dy, mid.z, ry, false));
      for (let j = 0; j < 4; j++) { const q0 = p0.clone().lerp(p1, (j + 0.5) / 4); g.add(box(trussM, 0.04, 0.5, 0.04, q0.x, TY + 0.25, q0.z, 0, false), cyl(M(0x111114, { mat: { metalness: 0.5 } }), 0.14, 0.32, q0.x, TY - 0.2, q0.z, false), box(K.basic('#fff6e4'), 0.2, 0.02, 0.2, q0.x, TY - 0.37, q0.z, 0, false)); }
      const bm = K.mesh(K.GEO.beam, new THREE.MeshBasicMaterial({ color: 0xfff2dc, transparent: true, opacity: 0.008, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); K.placeSeg(bm, at(a0 + 0.2, TR, TY - 0.4), at(a0 + Math.PI + 0.2, 1.4, 0), 1); bm.scale.x = bm.scale.z = 0.9; bm.userData.dyn = 1; g.add(bm); }
    for (let k = 0; k < 4; k++) { const p0 = at(vA(k * 2), TR, TY + 0.5); g.add(cyl(trussM, 0.03, 9, p0.x, TY + 5, p0.z, false)); }
    // the jumbotron: four screens over the cage (the round and the clock, the names on them)
    const jT = K.canvasTex(512, 288, () => {}), jc = jT.image.getContext('2d'); let jKey = '';
    const jDraw = () => { const info = typeof OCT_INFO === 'function' ? OCT_INFO() : null, key = info ? info.join('|') : 'idle'; if (key === jKey) return; jKey = key; const w = 512, h = 288;
      const gg = jc.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#120408'); gg.addColorStop(1, '#2a060c'); jc.fillStyle = gg; jc.fillRect(0, 0, w, h); jc.textAlign = 'center'; jc.textBaseline = 'middle';
      jc.fillStyle = '#d8a634'; jc.fillRect(0, 0, w, 10); jc.fillRect(0, h - 10, w, 10);
      if (!info) { jc.fillStyle = '#ffe9c0'; jc.font = '900 96px Impact, Oswald, "Arial Black", sans-serif'; jc.fillText('BP VERSE', w / 2, h * 0.42); jc.fillStyle = '#ff3a3a'; jc.font = '700 46px Impact, Oswald, sans-serif'; jc.fillText('FIGHT NIGHT', w / 2, h * 0.72); }
      else { jc.fillStyle = '#ffffff'; jc.font = '900 44px Impact, Oswald, sans-serif'; jc.fillText(info[0], w * 0.27, 52); jc.fillText(info[1], w * 0.73, 52); jc.fillStyle = '#d8a634'; jc.font = '700 30px Impact, Oswald, sans-serif'; jc.fillText('VS', w / 2, 52);
        jc.fillStyle = '#ff3a3a'; jc.font = '900 60px Impact, Oswald, sans-serif'; jc.fillText(info[2], w / 2, 140); jc.fillStyle = '#ffe9c0'; jc.font = '900 92px Impact, Oswald, sans-serif'; jc.fillText(info[3], w / 2, 225); }
      jT.needsUpdate = true; };
    jDraw();
    const jb = new THREE.Group(); jb.userData.dyn = 1; const jm = K.std(0xffffff, { map: jT, emissive: 0xffffff, emissiveMap: jT, emissiveIntensity: 1.15 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, sc = K.mesh(new THREE.PlaneGeometry(3.2, 1.8), jm, false); sc.position.copy(at(a, 1.62, 0)); sc.rotation.y = a + Math.PI / 2; jb.add(sc); }
    jb.add(box(M(0x0c0c0e, { mat: { metalness: 0.5 } }), 3.25, 1.95, 3.25, 0, 0, 0, 0, false)); jb.position.y = 10.2; g.add(jb);
    let jf = 0; ups.push(() => { if ((jf++ % 20) === 0) jDraw(); });
    // haze in the light over the cage
    const haze = particles(90, 0xfff0e0, 0.05, [6, 6, -6, 6], (pp, i, s2, t) => { pp[i * 3] = s2[0] + Math.sin(t * 0.1 + i) * 0.6; pp[i * 3 + 1] = 2.2 + s2[1] + Math.sin(t * 0.13 + i) * 0.3; pp[i * 3 + 2] = s2[2] + Math.cos(t * 0.1 + i) * 0.6; }); haze.material.opacity = 0.5; g.add(haze); // dust in the light
    // the light: dark arena, a hard white wash on the cage, red and blue corners; one spot picks out whoever's walking out
    const st = stage(g, () => K.setRig({ sky: '#c8d0ff', ground: '#120a0a', hemi: 0.35, keyCol: '#fff4e4', key: 2.1, rimCol: '#8aa8ff', rim: 0.7, fog: [0x050507, 22, 60], bg: 0x030304, env: 0.22, bloomT: 0.96,
      points: [['#ff2a3a', -4.6, 2.2, 1.9, 5], ['#2a5aff', 4.6, 2.2, -1.9, 5], ['#ffd9a8', 0, 6, 0, 10], ['#ff5a3a', at(DA, OCT.TUN - 1.5).x, -PH + 3, at(DA, OCT.TUN - 1.5).z, 10]],
      spots: [['#fff6e8', 55, 0, 11, 0, 0, 0, 0], ['#fff2dc', 0, 0, 11, 0, 0, 0, 0], ['#ffe2c0', 60, 3, 10, 3, 0, 0, 0]] }), ups, { debris: 0x8a8680, full360: true });
    // the walkout spot follows the fighter on the walkway
    ups.push(() => { const rg = K.rig && K.rig(), w = typeof OCT_SPOT === 'function' ? OCT_SPOT() : null; if (!rg) return; const L = rg.spots[1]; if (w) { L.intensity = 70; L.position.set(w[0] * 0.7, 9, w[1] * 0.7); L.target.position.set(w[0], w[2], w[1]); } else L.intensity = 0; });
    return st;
  },

  // SQUADS: BP DISTRICT, a whole city block at dusk (the layout, and what you bump into, is DISTRICT in js/stages.js)
  district() {
    const g = new THREE.Group(), ups = [], D = typeof DISTRICT !== 'undefined' ? DISTRICT : { hx: 46, hz: 28, boxes: [], base: 35 };
    // a façade texture: 4 bays x 4 floors of windows (some lit), and its glow; box faces get UVs in metres so it tiles
    const facade = (wall, frameC, lit) => { const S = 256, bay = S / 4, on = [];
      const map = K.canvasTex(S, S, (q, w, h) => { q.fillStyle = wall; q.fillRect(0, 0, w, h); speckle(q, w, h, 1800, 0.12);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * bay, y = r * bay, L = Math.random() < lit; on.push(L);
          q.fillStyle = frameC; q.fillRect(x + 8, y + 10, bay - 16, bay - 22); q.fillStyle = L ? '#ffd9a0' : '#1a2230'; q.fillRect(x + 11, y + 13, bay - 22, bay - 28);
          if (!L) { q.fillStyle = 'rgba(140,170,220,0.25)'; q.fillRect(x + 11, y + 13, (bay - 22) * 0.4, bay - 28); } q.fillStyle = 'rgba(0,0,0,0.25)'; q.fillRect(x, y + bay - 6, bay, 3); } }, { repeat: [1, 1] });
      const em = K.canvasTex(S, S, (q, w, h) => { q.fillStyle = '#000'; q.fillRect(0, 0, w, h); let i = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (on[i++]) { q.fillStyle = ['#ffcf8a', '#ffe6b8', '#ffb870'][(r + c) % 3]; q.fillRect(c * bay + 11, r * bay + 13, bay - 22, bay - 28); } }, { repeat: [1, 1] });
      return K.std(0xffffff, { map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.85, roughness: 0.75 }); };
    const bMats = [facade('#8a7a6a', '#3a3530', 0.4), facade('#5a6270', '#22262e', 0.35), facade('#a8604a', '#3a2420', 0.45), facade('#d8d0c0', '#5a5650', 0.3), facade('#3a3e48', '#14161a', 0.5)];
    const block = (mat, w, h, d, x, y, z, cast = true) => { // a box whose faces tile the façade (12 m x 12.8 m a repeat); roofs take the plain wall colour
      const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, spans = [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v, [su, sv] = spans[f]; if (!su) uv.setXY(i, 0.01, 0.99); else uv.setXY(i, uv.getX(i) * su / 12, uv.getY(i) * sv / 12.8); }
      const m = K.mesh(geo, mat, cast, true); m.position.set(x, y, z); return m; };
    // the ground: streets, pavements round the blocks, the plaza, painted lines
    const W2 = D.hx * 2, Dz = D.hz * 2;
    const ground = K.mesh(new THREE.PlaneGeometry(W2 + 60, Dz + 60), M(0xffffff, { surf: T.asphalt('#3a3a40', [24, 16]), mat: { roughness: 0.9 } }), false, true); ground.rotation.x = -Math.PI / 2; g.add(ground);
    const pave = M(0xffffff, { surf: T.tiles('#8a8680', '#7e7a74', 4, '#5a5652', [1, 1], false), mat: { roughness: 0.85 } }), kerb = M(0x9a968e);
    for (const b of D.boxes) if (b[5] === 'b') { const pw = b[2] + 2.4, pd = b[3] + 2.4; const pv = K.mesh(new THREE.PlaneGeometry(pw, pd), pave, false, true); pv.rotation.x = -Math.PI / 2; pv.position.set(b[0], 0.03, b[1]); g.add(pv);
      g.add(box(kerb, pw, 0.06, 0.15, b[0], 0.03, b[1] - pd / 2, 0, false), box(kerb, pw, 0.06, 0.15, b[0], 0.03, b[1] + pd / 2, 0, false), box(kerb, 0.15, 0.06, pd, b[0] - pw / 2, 0.03, b[1], 0, false), box(kerb, 0.15, 0.06, pd, b[0] + pw / 2, 0.03, b[1], 0, false)); }
    const plaza = K.mesh(new THREE.CircleGeometry(8.5, 48), M(0xffffff, { surf: T.tiles('#c8bca8', '#b0a48e', 8, '#6a6258', [3, 3]), mat: { roughness: 0.7 } }), false, true); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.025; g.add(plaza);
    const ringM = K.mesh(new THREE.RingGeometry(8.5, 8.9, 48), M(0x5a5248), false, true); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.03; g.add(ringM);
    const paint = K.basic('#e8e2c8'); for (const z of [-12, 0, 12]) for (let x = -33; x <= 33; x += 4) if (Math.abs(x) > 9.5) g.add(box(paint, 2, 0.01, 0.15, x, 0.035, z + (z ? 0 : 3.6), 0, false));
    for (const sx of [-1, 1]) for (let i = -3; i <= 3; i++) g.add(box(paint, 0.5, 0.01, 2.2, sx * 12.5 + i * 0.9, 0.035, -20, 0, false)); // zebra crossings
    // the blocks
    const crate = ['#c8102e', '#1a5aaa', '#2a7a3a', '#d88a1a', '#5a5e66'].map((c, i) => M(0xffffff, { surf: surf(128, 128, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { q.fillStyle = 'rgba(0,0,0,0.22)'; q.fillRect(x, 0, 3, h); q.fillStyle = 'rgba(255,255,255,0.08)'; q.fillRect(x + 4, 0, 2, h); } q.strokeStyle = 'rgba(0,0,0,0.5)'; q.lineWidth = 4; q.strokeRect(0, 0, w, h); speckle(q, w, h, 600, 0.2); }, { bump: 2 }), mat: { roughness: 0.6, metalness: 0.4 } }));
    const conc = M(0xffffff, { surf: T.concrete('#a8a49c', [2, 1]) }), wallM = M(0xffffff, { surf: T.concrete('#7a7c84', [6, 1]) }), roofM = M(0x2a2a30, { mat: { roughness: 0.9 } }), plant = M(0x2f6b2a, { mat: { roughness: 0.9 } });
    const awn = ['#c8102e', '#1a6a4a', '#f2b818', '#3a3aaa', '#e8306c'];
    D.boxes.forEach((b, n) => { const [x, z, w, d, h, k] = b;
      if (k === 'b') { const mat = bMats[n % bMats.length]; g.add(block(mat, w, h, d, x, h / 2, z), box(roofM, w + 0.3, 0.4, d + 0.3, x, h + 0.2, z));
        // a shop front: an awning and a lit window strip along the side that faces the street
        const fz = z > 0 ? -1 : 1, aw = M(awn[n % awn.length], { mat: { roughness: 0.8 } }); const am = box(aw, w * 0.8, 0.12, 1.1, x, 3.1, z + fz * (d / 2 + 0.55), 0, false); am.rotation.x = fz * 0.25; g.add(am);
        g.add(box(K.std(0x1a1410, { emissive: 0xffc070, emissiveIntensity: 0.55 }), w * 0.7, 1.8, 0.05, x, 1.5, z + fz * (d / 2 + 0.03), 0, false));
        for (const rx of [-w / 4, w / 4]) g.add(box(M(0x6a6e78, { mat: { metalness: 0.6, roughness: 0.4 } }), 1.4, 1, 1.4, x + rx, h + 0.9, z)); } // rooftop units
      else if (k === 'w') { g.add(box(wallM, w, h, d, x, h / 2, z), box(K.basic(x < 0 ? '#3ea6ff' : '#ff3b5c'), w + 0.04, 0.25, d + 0.04, x, h - 0.5, z, 0, false)); }
      else if (k === 'c') { const m = box(crate[n % crate.length], w, h, d, x, h / 2, z); g.add(m); }
      else if (k === 'l') { g.add(box(conc, w, h, d, x, h / 2, z), box(K.basic('#f2b818'), w + 0.02, 0.12, d + 0.02, x, h - 0.2, z, 0, false)); }
      else if (k === 'p') { g.add(box(conc, w, h, d, x, h / 2, z), box(M(0x3a2a1a), w - 0.2, 0.05, d - 0.2, x, h + 0.01, z, 0, false));
        for (let i = 0; i < 5; i++) { const lf = K.mesh(K.GEO.cone, plant, true, false); lf.scale.set(0.22, 1.2, 0.22); lf.position.set(x + Math.cos(i * 1.3) * 0.35, h + 0.6, z + Math.sin(i * 1.3) * 0.35); lf.rotation.set(Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4); g.add(lf); } }
      else if (k === 'k') g.add(car(['#c8102e', '#e8e8ec', '#1a3a8a', '#1a1a1e'][n % 4], x, z, w > d ? Math.PI / 2 : 0)); });
    // the bases: tinted floor, a canopy, the team's name over the middle gate
    for (const t of [0, 1]) { const sx = t ? 1 : -1, cx = sx * (D.base + D.hx) / 2, wd = D.hx - D.base, col = t ? '#ff3b5c' : '#3ea6ff';
      const fl = K.mesh(new THREE.PlaneGeometry(wd, D.hz * 2), K.std(col, { roughness: 0.8, transparent: true, opacity: 0.16 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.03, 0); fl.userData.dyn = 1; g.add(fl);
      const sign = K.textPlane(t ? 'RED BASE' : 'BLUE BASE', 5.2, 1.1, '900 120px Impact, Oswald, "Arial Black", sans-serif', '#ffffff', col); sign.position.set(sx * (D.base - 0.45), 4.4, 0); sign.rotation.y = -sx * Math.PI / 2; g.add(sign);
      g.add(box(wallM, 0.8, 1.4, 6.8, sx * D.base, 4.1, 0)); // the beam over the middle gate
      for (const z of [-4.8, 4.8]) g.add(box(M(0x2a2c32, { mat: { metalness: 0.6 } }), 0.25, 4.1, 0.25, sx * (D.hx - 1), 2.05, z), box(M(0x2a2c32, { mat: { metalness: 0.6 } }), 0.25, 4.1, 0.25, sx * (D.base + 1), 2.05, z));
      for (const z of [-20, -10, 10, 20]) g.add(box(crate[(t * 2 + (z > 0 ? 1 : 0)) % 5], 2.2, 2.4, 5, sx * (D.hx - 2), 1.2, z)); }
    // the edge of the map: the walls of the block all round (tall fronts with lit windows), and the city beyond
    for (const sz of [-1, 1]) for (let x = -D.hx - 6; x < D.hx + 6; x += 9) { const h = 10 + ((x * 7 + sz * 13) % 9 + 9) % 9 * 2; g.add(block(bMats[((x / 9 | 0) + (sz > 0 ? 2 : 0) + 10) % 5], 9, h, 6, x + 4.5, h / 2, sz * (D.hz + 3))); }
    for (const sx of [-1, 1]) for (let z = -D.hz; z < D.hz; z += 8) { const h = 9 + ((z * 5 + sx * 11) % 7 + 7) % 7 * 2; g.add(block(bMats[((z / 8 | 0) + (sx > 0 ? 1 : 3) + 10) % 5], 6, h, 8, sx * (D.hx + 3), h / 2, z + 4)); }
    g.add(skyline({ n: 120, x0: -140, x1: 140, z0: -45, z1: -130, h0: 18, h1: 70, y: 0, base: 0x1a1a28, lit: 0.35, glow: 1.1 }));
    const back = skyline({ n: 120, x0: -140, x1: 140, z0: 45, z1: 130, h0: 18, h1: 70, y: 0, base: 0x1a1a28, lit: 0.35, glow: 1.1 }); g.add(back);
    for (const sx of [-1, 1]) { const side = skyline({ n: 50, x0: sx * 60, x1: sx * 130, z0: -60, z1: 60, h0: 18, h1: 60, y: 0, base: 0x1a1a28, lit: 0.3, glow: 1 }); g.add(side); }
    g.add(skyDome('#1a1440', '#ff7a5a', '#ffc890', [0.6, 0.06, -1]), glow('#ffb070', 46, 110, 8, -150, 0.7));
    // street lamps along the lanes, and a few neon signs
    for (const x of [-30, -22, -13, 13, 22, 30]) for (const z of [-6.2, 6.2]) g.add(lamp(x, z * (Math.abs(x) > 20 ? 1 : 1.15), '#ffd9a0', 4.2, 0.8));
    for (const [txt, c, x, z, ry] of [['BP', '#ff3fa4', -19, -10.45, 0], ['OPEN 24/7', '#3ea6ff', 19, 10.45, Math.PI], ['NOODLES', '#ffd23f', -10, 20.95, Math.PI], ['GYM', '#3ddc84', 10, -20.95, 0]]) { const n2 = neon(txt, c, txt.length > 4 ? 3.2 : 1.6, 0.8, null, x, 5.5, z, ups); n2.rotation.y = ry; g.add(n2); }
    const st = stage(g, () => K.setRig({ sky: '#ffb890', ground: '#2a2230', hemi: 0.95, keyCol: '#ffc89a', key: 2.2, rimCol: '#7a8aff', rim: 1.1, fog: [0x6a4a5a, 40, 150], bg: null, env: 0.3, bloomT: 1.05,
      points: [['#ffd9a0', 0, 5, 0, 16], ['#3ea6ff', -40, 4, 0, 14], ['#ff3b5c', 40, 4, 0, 14]] }), ups, { debris: 0x4a4a52, full360: true, sqMap: D });
    return st;
  },
};
export const NEW_STAGES = Object.keys(BUILD);
// SQUADS, the big version of a stage (js/squads.js SQ_BIG): the floor under it all, each team's base (tinted floor,
// walls with the team colour, a sign over the middle gate) and the cover between them
export function buildSqKit(kit, D, o = {}) {
  K = kit; if (!GLOW) GLOW = kit.radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const g = new THREE.Group();
  const ground = K.mesh(new THREE.PlaneGeometry(D.hx * 2 + 30, D.hz * 2 + 30), M(0xffffff, { surf: T.concrete(o.floor || '#5a5a60', [16, 9]), mat: { roughness: 0.85 } }), false, true); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; g.add(ground);
  const wallM = M(0xffffff, { surf: T.concrete('#7a7c84', [3, 1]) }), conc = M(0xffffff, { surf: T.concrete('#a8a49c', [2, 1]) }), steel = M(0x3a3e46, { mat: { metalness: 0.7, roughness: 0.35 } });
  const crate = ['#c8102e', '#1a5aaa', '#2a7a3a', '#d88a1a'].map(c => M(0xffffff, { surf: surf(128, 128, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { q.fillStyle = 'rgba(0,0,0,0.22)'; q.fillRect(x, 0, 3, h); } q.strokeStyle = 'rgba(0,0,0,0.5)'; q.lineWidth = 4; q.strokeRect(0, 0, w, h); speckle(q, w, h, 500, 0.2); }, { bump: 2 }), mat: { roughness: 0.6, metalness: 0.4 } }));
  const th = THEMES[o.theme], PC = th && D.pieces ? makePieces({ K, M, T, surf, speckle, glow, car, palm }) : null, wallT = th ? M(0xffffff, { surf: T.concrete(th.wall, [3, 1]) }) : wallM;
  if (PC) for (const p of D.pieces) { const pg = PC.build(p, th); if (!pg) continue; pg.position.set(p.x, 0, p.z); pg.rotation.y = (p.ry || 0) * Math.PI / 180; if (p.mir) pg.scale.x = -1; g.add(pg); } // this stage's own things (js/layouts.js, js3d/pieces.js)
  D.boxes.forEach(([x, z, w, d, h, k], n) => {
    if (PC && k !== 'w') return; // (a themed layout: its pieces are drawn above)
    if (k === 'w') g.add(box(wallT, w, h, d, x, h / 2, z), box(K.basic(x < 0 ? '#3ea6ff' : '#ff3b5c'), w + 0.04, 0.22, d + 0.04, x, h - 0.45, z, 0, false), box(steel, w + 0.1, 0.12, d + 0.1, x, h + 0.06, z), box(th ? K.basic(th.trim) : steel, w + 0.04, 0.06, d + 0.04, x, 0.4, z, 0, false));
    else if (k === 'c') g.add(box(crate[n % crate.length], w, h, d, x, h / 2, z), box(crate[(n + 1) % crate.length], w * 0.8, h * 0.5, d * 0.8, x, h + h * 0.25, z));
    else if (k === 'l') g.add(box(conc, w, h, d, x, h / 2, z), box(K.basic('#f2b818'), w + 0.02, 0.1, d + 0.02, x, h - 0.18, z, 0, false));
    else if (k === 'o') g.add(box(conc, w, h, d, x, h / 2, z), box(steel, w + 0.25, 0.25, d + 0.25, x, 0.12, z), box(steel, w + 0.25, 0.25, d + 0.25, x, h - 0.12, z), box(K.basic('#ffd9a0'), w + 0.04, 0.08, d + 0.04, x, h * 0.6, z, 0, false));
  });
  for (const t of [0, 1]) { const sx = t ? 1 : -1, wd = D.hx - D.base, cx = sx * (D.base + D.hx) / 2, col = t ? '#ff3b5c' : '#3ea6ff';
    const fl = K.mesh(new THREE.PlaneGeometry(wd, D.hz * 2), K.std(col, { roughness: 0.8, transparent: true, opacity: 0.16 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.02, 0); fl.userData.dyn = 1; g.add(fl);
    g.add(box(wallM, 0.8, 1.2, 6.2, sx * D.base, 3.8, 0));
    const sign = K.textPlane(D.names ? D.names[t] : t ? 'RED BASE' : 'BLUE BASE', 4.6, 1.0, '900 120px Impact, Oswald, "Arial Black", sans-serif', '#ffffff', col); sign.position.set(sx * (D.base - 0.45), 3.8, 0); sign.rotation.y = -sx * Math.PI / 2; g.add(sign);
    g.add(glow(col, 5, sx * (D.hx - 3), 2.5, 0, 0.35)); }
  bake(g); return g;
}
// 1v1: a stage's own things round the edge of the fight floor (where they fit: the caller picks the spots)
export function buildDress(kit, id, items) {
  K = kit; if (!GLOW) GLOW = kit.radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const th = THEMES[id]; if (!th || !items.length) return null; const PC = makePieces({ K, M, T, surf, speckle, glow, car, palm }), g = new THREE.Group();
  for (const it of items) { const pg = PC.build(it.p, th); if (!pg) continue; pg.position.set(it.x, 0, it.z); pg.rotation.y = it.ry; g.add(pg); }
  bake(g); return g;
}
export function buildStage3D(id, kit) {
  K = kit; if (!GLOW) GLOW = kit.radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  return BUILD[id]();
}
