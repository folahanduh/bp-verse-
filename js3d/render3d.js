// BP VERSE 3D renderer (three.js). The fight logic in js/*.js stays the same (2D plane, like MK / Injustice);
// this module draws that state as a lit 3D world. The 2D canvas on top still draws the HUD and menus.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';

const U = 0.01, YAW = 0.34;                 // 1 game pixel = 1 cm; fighters turn a little toward the camera
const wx = x => (x - WW / 2) * U, wy = y => (FLOOR - y) * U;
const QUALITY = [
  { name: 'LOW', pr: 0.6, shadows: 0, bloom: false, samples: 0, fx: 0.5 },
  { name: 'MEDIUM', pr: 1, shadows: 1024, bloom: true, samples: 0, fx: 0.8 },
  { name: 'HIGH', pr: 1.5, shadows: 2048, bloom: true, samples: 4, fx: 1 },
  { name: 'ULTRA', pr: 2, shadows: 4096, bloom: true, samples: 4, fx: 1 },
];

let renderer, composer, renderPass, bloomPass, camera, scene, selScene, selCam, rig, fx3, glCanvas, qLevel = -1;
const stages = [], models = [null, null], selModels = [null, null];
const cam3 = { yaw: 0, ty: 1.25, x: 0 };
let fpsT = performance.now(), fpsN = 0, fps = 60, fightFrames = 0, slowFrames = 0;

// ---------- small helpers ----------
const GEO = {};
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const col = c => new THREE.Color(c);
function std(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0 }, o)); }
function basic(color, o) { return new THREE.MeshBasicMaterial(Object.assign({ color, toneMapped: false }, o)); }
function mesh(geo, mat, cast = true, recv = false) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  t.anisotropy = 4; return t;
}
function imgTex(image) { const t = new THREE.Texture(image); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = 4; return t; }
function noiseTex(base, spread, n, repeat, size = 256) {
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * spread; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  }, { repeat });
}
function radialTex(inner, outer) {
  return canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
}
function placeSeg(m, a, b, rad) {
  _v.subVectors(b, a); const len = _v.length() || 1e-4;
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _v.divideScalar(len));
  m.scale.set(rad, len, rad);
}
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

// ---------- fighter models ----------
function torsoTexture(c, L, bodyHex) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = bodyHex; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const fx = w * 0.25; // front of the body sits at u = 0.25
    if (L.spots) { g.fillStyle = '#15151b'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse((i * 53) % w, (i * 97) % h, 9 + (i % 3) * 4, 7 + (i % 2) * 4, 0, 0, 7); g.fill(); } }
    if (L.furBody) { g.fillStyle = L.furLight; g.beginPath(); g.ellipse(fx, h * 0.62, w * 0.12, h * 0.34, 0, 0, 7); g.fill();
      for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(0,0,0,0.08)`; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 6); g.stroke(); } }
    if ((c.id === 'ryan' || c.id === 'darren') && !L.bare) {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; for (const o of [-10, 10]) { g.beginPath(); g.moveTo(fx + o, 8); g.lineTo(fx + o + o * 0.2, 90); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.strokeRect(fx - 34, 170, 68, 46);
    }
    if (L.jersey) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, 10);
      g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(fx - 30, 0); g.lineTo(fx, 52); g.lineTo(fx + 30, 0); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 30px Impact, sans-serif'; g.fillText('KINGS', fx, 92);
      g.font = '900 86px Impact, sans-serif'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(L.jersey, fx, 160); g.fillText(L.jersey, fx, 160);
      g.font = '900 64px Impact, sans-serif'; g.fillText(L.jersey, w * 0.75, 140); g.fillRect(0, h - 14, w, 14);
    }
    if (c.build.muscle && !L.jersey && !L.bare) { g.fillStyle = c.skin; g.beginPath(); g.ellipse(fx, 0, 40, 34, 0, 0, 7); g.fill(); g.fillRect(0, 0, w, 4); }
    if (L.bare) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; for (const o of [-24, 24]) { g.beginPath(); g.arc(fx + o, 50, 26, 0.3, Math.PI - 0.3); g.stroke(); } g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(fx, 180, 3, 0, 7); g.fill(); }
  });
}

class Model {
  constructor(f) {
    const c = f.c, B = f.b; this.c = c;
    const furry = f.furT > 0 && c.id === 'blake';
    const L = this.L = furry && !lookOf(c, f.skin).furBody ? lookOf(c, 1) : lookOf(c, f.skin);
    this.key = f.ci + ':' + f.skin + ':' + (furry ? 1 : 0);
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.mats = []; this.own = [];
    const M = (color, o) => { const m = std(color, o); this.mats.push(m); return m; };
    const fur = !!L.furBody;
    const skinM = M(fur ? L.fur : c.skin, { roughness: 0.55 });
    const bodyHex = L.bare ? c.skin : fur ? L.fur : L.shirt;
    const tTex = torsoTexture(c, L, bodyHex); this.own.push(tTex);
    const torsoM = M(0xffffff, { map: tTex, roughness: fur ? 0.95 : 0.8 });
    const sleeveM = fur ? M(L.fur, { roughness: 0.95 }) : L.sleeves ? M(L.spots ? 0xffffff : L.shirt, { map: L.spots ? tTex : null, roughness: 0.8 }) : skinM;
    const handM = fur ? sleeveM : skinM;
    const legTopM = fur ? sleeveM : L.bare ? skinM : M(L.pants, { roughness: 0.85 });
    const legLowM = fur ? sleeveM : (L.bare || L.shorts) ? skinM : legTopM;
    const shoeM = M(L.shoes, { roughness: 0.45 }), soleM = M(fur ? L.furLight : '#f2f2f2', { roughness: 0.6 });
    const hairM = M(c.hair, { roughness: 0.9 });
    const sph = GEO.sphere, cyl = GEO.cyl;
    const add = (m, parent = this.body) => { parent.add(m); return m; };
    const part = (mat, geo = sph) => add(mesh(geo, mat));
    // limbs: 2 segments + 3 joints (+ optional muscle lumps)
    const limb = (m1, m2, endMat, lumps, sock) => ({ s1: part(m1, cyl), s2: part(m2, cyl), j0: part(m1), j1: part(m1), j2: part(m2), end: part(endMat),
      b1: lumps ? part(m1) : null, b2: lumps ? part(m2) : null, sock: sock ? part(M(sock), cyl) : null, sole: null });
    const armLumps = !!(B.muscle || B.belly), legLumps = !!(B.muscle || B.belly);
    this.armB = limb(sleeveM, sleeveM, handM, armLumps); this.armF = limb(sleeveM, sleeveM, handM, armLumps);
    this.legB = limb(legTopM, legLowM, shoeM, legLumps, L.socks); this.legF = limb(legTopM, legLowM, shoeM, legLumps, L.socks);
    this.legB.sole = part(soleM); this.legF.sole = part(soleM);
    // torso: tapered elliptical cylinder (shoulders -> waist)
    const taper = clamp(B.waist / B.shoulder, 0.45, 1.3);
    this.torsoGeo = new THREE.CylinderGeometry(1, taper, 1, 20, 3); this.own.push(this.torsoGeo);
    this.torso = part(torsoM, this.torsoGeo);
    this.chest = part(torsoM); this.pelvis = part(L.briefs ? M(L.briefs, { roughness: 0.6 }) : legTopM);
    this.delts = [part(sleeveM), part(sleeveM)];
    this.belly = B.belly ? part(torsoM) : null; this.butt = B.belly ? part(legTopM) : null;
    this.neck = part(skinM, cyl);
    this.hood = (c.id === 'ryan' || c.id === 'darren') && !L.bare ? part(M(shade(L.shirt, 0.8))) : null;
    this.chain = L.chain ? add(mesh(new THREE.TorusGeometry(1, 0.08, 8, 24), M(L.chain, { metalness: 1, roughness: 0.25 }))) : null;
    if (this.chain) this.own.push(this.chain.geometry);
    // head
    this.head = add(new THREE.Group());
    if (L.head) this.buildAnimalHead(L, M);
    else {
      this.skull = mesh(sph, skinM); this.head.add(this.skull);
      const faceTex = imgTex(c.img); this.own.push(faceTex);
      const faceM = std(0xffffff, { map: faceTex, emissiveMap: faceTex, emissive: 0xffffff, emissiveIntensity: 0.28, transparent: true, depthWrite: false, roughness: 0.7 }); this.mats.push(faceM);
      this.face = mesh(GEO.face, faceM, false); this.face.renderOrder = 2; this.head.add(this.face);
      this.hair = [];
      const hb = mesh(sph, hairM); hb.position.set(-0.22, 0.12, 0); hb.scale.set(0.95, 0.98, 1.0); this.head.add(hb); this.hair.push(hb);
      if (c.curls) for (let i = 0; i < 9; i++) { const a = -0.3 + i * 0.42, q = mesh(sph, hairM); q.position.set(Math.cos(a) * -0.55 - 0.1, 0.55 + Math.sin(i) * 0.12, Math.sin(a) * 0.6); q.scale.setScalar(0.34); this.head.add(q); }
      if (c.longHair) { const lh = mesh(sph, hairM); lh.position.set(-0.45, -0.55, 0); lh.scale.set(0.55, 1.2, 0.95); this.head.add(lh); }
      if (c.locs) for (let i = 0; i < 9; i++) { const lc = mesh(cyl, hairM); const a = (i / 8) * Math.PI - Math.PI / 2; lc.position.set(-0.55 - Math.abs(Math.sin(a)) * 0.1, -0.35, Math.sin(a) * 0.75); lc.scale.set(0.09, 1.1, 0.09); lc.rotation.z = -0.15; this.head.add(lc); }
      if (L.headband) { const hbM = M(L.headband); const t = mesh(new THREE.TorusGeometry(1.0, 0.09, 8, 28), hbM); this.own.push(t.geometry); t.rotation.x = Math.PI / 2; t.position.y = 0.42; t.scale.set(0.93, 0.93, 1); this.head.add(t); }
    }
    // tail, cape, sword
    if (L.tail) { const tM = M(L.fur, { roughness: 0.95 }), tipM = M(L.furLight, { roughness: 0.95 }); this.tail = []; for (let i = 0; i < 10; i++) this.tail.push(part(i >= 8 ? tipM : tM)); }
    if (L.cape) {
      this.capeGeo = new THREE.PlaneGeometry(1, 1, 4, 8); this.own.push(this.capeGeo);
      this.cape = add(mesh(this.capeGeo, M(L.cape, { side: THREE.DoubleSide, roughness: 0.6 })));
    }
    if (c.sword) {
      this.sword = add(new THREE.Group());
      const blade = mesh(GEO.box, std(0xe8ecf5, { metalness: 1, roughness: 0.15, emissive: 0x6a2aa0, emissiveIntensity: 0.9 }));
      blade.scale.set(1, 0.05, 0.012); blade.position.x = 0.5; this.sword.add(blade); this.mats.push(blade.material);
      const guard = mesh(GEO.box, M(0xc9a227, { metalness: 1, roughness: 0.3 })); guard.scale.set(0.03, 0.2, 0.05); this.sword.add(guard);
      const grip = mesh(GEO.box, M(0x3a2418)); grip.scale.set(0.12, 0.04, 0.04); grip.position.x = -0.07; this.sword.add(grip);
    }
    this.shadowBlob = mesh(GEO.disc, new THREE.MeshBasicMaterial({ map: fx3.blobTex, transparent: true, depthWrite: false, opacity: 0.7 }), false);
    this.shadowBlob.rotation.x = -Math.PI / 2; this.shadowBlob.renderOrder = 1;
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3.glowTex, color: c.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    this.root.add(this.aura);
    for (const m of this.mats) if (m.emissive) { m.userData.e0 = m.emissive.clone(); m.userData.i0 = m.emissiveIntensity; }
  }
  buildAnimalHead(L, M) {
    const sph = GEO.sphere, furM = M(L.fur, { roughness: 0.95 }), liteM = M(L.furLight, { roughness: 0.9 });
    const dark = M('#120806', { roughness: 0.3 }), white = M('#ffffff', { roughness: 0.25 });
    const put = (mat, x, y, z, sx, sy, sz, geo = sph) => { const m = mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy ?? sx, sz ?? sx); this.head.add(m); return m; };
    if (L.head === 'fox') {
      put(furM, 0, 0, 0, 0.95, 0.88, 0.85);
      put(liteM, 0.62, -0.2, 0, 0.55, 0.32, 0.4); put(dark, 1.12, -0.12, 0, 0.12);
      put(liteM, 0.35, -0.3, 0.45, 0.32, 0.25, 0.25); put(liteM, 0.35, -0.3, -0.45, 0.32, 0.25, 0.25);
      for (const z of [0.42, -0.42]) {
        put(M('#ffb52e', { roughness: 0.2 }), 0.66, 0.15, z, 0.14, 0.11, 0.09); put(dark, 0.74, 0.15, z, 0.07, 0.09, 0.06);
        const ear = put(furM, -0.05, 0.85, z * 1.1, 0.32, 0.75, 0.22, GEO.cone); ear.rotation.x = z > 0 ? -0.25 : 0.25;
        const inner = put(dark, 0.05, 0.82, z * 1.1, 0.18, 0.5, 0.12, GEO.cone); inner.rotation.x = ear.rotation.x;
      }
    } else {
      put(furM, 0, 0, 0, 1.04, 0.98, 0.98);
      put(liteM, 0.55, -0.32, 0, 0.55, 0.38, 0.55);
      put(M('#ff5fa8', { roughness: 0.3 }), 1.02, -0.12, 0, 0.13, 0.1, 0.16);
      for (const z of [0.42, -0.42]) {
        put(white, 0.72, 0.16, z, 0.22, 0.3, 0.2); put(M('#3a7bd5', { roughness: 0.15 }), 0.88, 0.14, z, 0.1, 0.2, 0.14); put(dark, 0.94, 0.14, z, 0.05, 0.11, 0.08);
        put(white, 0.95, 0.24, z * 0.92, 0.03); put(M('#ff8ad1'), 0.68, -0.2, z * 1.15, 0.16, 0.08, 0.1);
        const ear = put(furM, -0.1, 0.95, z * 1.25, 0.36, 0.85, 0.28, GEO.cone); ear.rotation.x = z > 0 ? -0.35 : 0.35;
        const inner = put(liteM, -0.02, 0.92, z * 1.25, 0.2, 0.6, 0.16, GEO.cone); inner.rotation.x = ear.rotation.x;
      }
      put(M('#4a0a24'), 0.75, -0.48, 0, 0.18, 0.1, 0.24); put(M('#ff6fae'), 0.8, -0.52, 0, 0.1, 0.06, 0.14);
      for (const [x, z] of [[-0.1, 0], [0.1, 0.2], [0.1, -0.2]]) put(M('#ff8ad1'), x, 0.95, z, 0.22, 0.18, 0.22);
    }
  }
  dispose() { this.root.removeFromParent(); this.mats.forEach(m => m.dispose()); this.own.forEach(o => o.dispose()); this.shadowBlob.material.dispose(); this.aura.material.dispose(); this.shadowBlob.removeFromParent(); }

  // pose the model from the fighter's game state (same joint maths as the 2D renderer)
  update(f, scale3 = 1) {
    const c = f.c, B = f.b, s = f.scale, F = f.facing, p = Object.assign({}, getPose(f));
    const h = f.h * s, legL = h * 0.46, th = legL * 0.52, sh = legL * 0.5, torso = h * 0.29, ua = h * 0.17 * B.arm, la = h * 0.16 * B.arm;
    const r = (14 + f.h * 0.05) * s, lw = f.lw * s, sw = f.sw * s, shoW = sw * B.shoulder, waistW = sw * B.waist;
    const aw1 = lw * 0.95 * B.armW, aw2 = lw * 0.8 * B.armW, lg1 = lw * 1.1 * B.legW, lg2 = lw * 0.88 * B.legW;
    p.ft += p.crouch; p.fs -= p.crouch; p.bt += p.crouch * 0.6; p.bs -= p.crouch * 1.2;
    const depth = (a, b) => th * Math.cos(a) + sh * Math.cos(b);
    const onGround = f.y >= FLOOR - 0.5;
    const hipY = (onGround ? Math.max(depth(p.ft, p.fs), depth(p.bt, p.bs)) : legL * 0.95) + lg2 * 0.3;
    const hop = f.victory && c.id === 'ryan' ? Math.abs(Math.sin(frame / 8)) * 14 : 0;
    // root: feet position, turned a little toward the camera
    this.root.position.set(wx(f.x), wy(f.y) + hop * U, 0);
    this.root.rotation.y = F > 0 ? -YAW : Math.PI + YAW;
    this.root.scale.setScalar(scale3);
    this.root.visible = !(f.vanish > 0 && frame % 2);
    this.body.rotation.z = p.rot; this.body.position.y = p.rot ? lw * 0.45 * p.rot / 1.5 * U : 0;
    // reuse vectors instead of allocating every frame (less garbage collection on slower machines)
    const pool = this._pool || (this._pool = Array.from({ length: 48 }, () => new THREE.Vector3())); let vi = 0;
    const V = (x, y, z) => pool[vi++].set(x * U, y * U, z * U * F);
    const hip = V(0, hipY, 0), ux = Math.sin(p.lean), uy = Math.cos(p.lean);
    const shoP = { x: ux * torso, y: hipY + uy * torso }, sho = V(shoP.x, shoP.y, 0);
    const end = (x, y, a, len) => ({ x: x + Math.sin(a) * len, y: y - Math.cos(a) * len });
    const setLimb = (L2, x0, y0, z, a1, l1, a2, l2, w1, w2, isLeg) => {
      const k = end(x0, y0, a1, l1), e = end(k.x, k.y, a2, l2);
      const A = V(x0, y0, z), K = V(k.x, k.y, z), E = V(e.x, e.y, z);
      placeSeg(L2.s1, A, K, w1 * 0.5 * U); placeSeg(L2.s2, K, E, w2 * 0.5 * U);
      L2.j0.position.copy(A); L2.j0.scale.setScalar(w1 * 0.5 * U);
      L2.j1.position.copy(K); L2.j1.scale.setScalar(Math.max(w1, w2) * 0.5 * U);
      L2.j2.position.copy(E); L2.j2.scale.setScalar(w2 * 0.5 * U);
      if (L2.b1) { L2.b1.position.lerpVectors(A, K, 0.45); L2.b1.quaternion.copy(L2.s1.quaternion); L2.b1.scale.set(w1 * 0.66 * U, l1 * 0.36 * U, w1 * 0.66 * U); }
      if (L2.b2) { L2.b2.position.lerpVectors(K, E, 0.3); L2.b2.quaternion.copy(L2.s2.quaternion); L2.b2.scale.set(w2 * 0.6 * U, l2 * 0.3 * U, w2 * 0.6 * U); }
      if (L2.sock) { _w.lerpVectors(K, E, 0.55); placeSeg(L2.sock, _w, E, w2 * 0.56 * U); }
      if (isLeg) {
        L2.end.position.set((e.x + lg2 * 0.35) * U, (e.y + lg2 * 0.05) * U, z * U * F); L2.end.scale.set(lg2 * 0.85 * U, lg2 * 0.42 * U, lg2 * 0.55 * U); L2.end.rotation.set(0, 0, 0);
        L2.sole.position.set((e.x + lg2 * 0.35) * U, (e.y - lg2 * 0.25) * U, z * U * F); L2.sole.scale.set(lg2 * 0.88 * U, lg2 * 0.14 * U, lg2 * 0.56 * U);
      } else { L2.end.position.copy(E); L2.end.scale.setScalar(aw2 * 0.64 * U); }
      return E;
    };
    const zArm = shoW * 0.48 + aw1 * 0.25, zLeg = waistW * (B.belly ? 0.34 : 0.26);
    setLimb(this.armB, shoP.x, shoP.y - 4 * s, -zArm, p.bu, ua, p.bl, la, aw1, aw2);
    setLimb(this.legB, 0, hipY, -zLeg, p.bt, th, p.bs, sh, lg1, lg2, true);
    setLimb(this.legF, 0, hipY, zLeg, p.ft, th, p.fs, sh, lg1, lg2, true);
    const handF = setLimb(this.armF, shoP.x, shoP.y - 4 * s, zArm, p.fu, ua, p.fl, la, aw1 * (f.move === 'force' ? 1.2 : 1), aw2 * (f.move === 'force' ? 1.2 : 1));
    // torso + upper body
    this.torso.position.lerpVectors(hip, sho, 0.5); this.torso.rotation.set(0, 0, -p.lean);
    this.torso.scale.set(sw * 0.36 * U, torso * U, shoW * 0.5 * U);
    this.chest.position.lerpVectors(hip, sho, 0.8); this.chest.rotation.set(0, 0, -p.lean);
    this.chest.scale.set(sw * (B.muscle ? 0.46 : 0.38) * U, torso * 0.3 * U, shoW * 0.5 * U);
    this.pelvis.position.copy(hip); this.pelvis.scale.set(sw * 0.36 * U, torso * 0.22 * U, waistW * 0.52 * U);
    this.delts[0].position.set(shoP.x * U, (shoP.y - 4 * s) * U, -zArm * U * F); this.delts[1].position.set(shoP.x * U, (shoP.y - 4 * s) * U, zArm * U * F);
    this.delts.forEach(d => d.scale.setScalar(aw1 * (B.muscle ? 0.75 : 0.58) * U));
    if (this.belly) {
      const jig = Math.sin(frame / 3.2) * (Math.abs(f.vx) > 0.5 || f.stun > 0 || f.kd === 1 ? 3.5 : 0.8) * s;
      this.belly.position.set((ux * torso * 0.3 + waistW * 0.3) * U, (hipY + uy * torso * 0.3 + jig) * U, 0);
      this.belly.scale.set(waistW * 0.55 * U, torso * 0.62 * U, waistW * 0.62 * U);
      this.butt.position.set((-waistW * 0.32) * U, (hipY + 2) * U, 0); this.butt.scale.set(waistW * 0.38 * U, torso * 0.35 * U, waistW * 0.55 * U);
    }
    const hc = { x: shoP.x + ux * r * 0.95 + r * 0.12, y: shoP.y + uy * r * 0.95 };
    const neckW = lw * (B.muscle ? 1.3 : B.belly ? 1.2 : 0.7);
    placeSeg(this.neck, sho, V(hc.x, hc.y, 0), neckW * 0.5 * U);
    this.head.position.set(hc.x * U, hc.y * U, 0);
    this.head.rotation.set(0, -0.78 * F, -p.ht); // turn the face toward the camera (3/4 view)
    this.head.scale.setScalar(r * U);
    if (this.skull) { this.skull.scale.set(0.9, 1.05, 0.88); this.face.scale.set(0.9, 1.05, 0.88); }
    if (this.hood) { this.hood.position.set((shoP.x - r * 0.6) * U, (shoP.y + r * 0.05) * U, 0); this.hood.scale.set(r * 0.6 * U, r * 0.55 * U, r * 0.9 * U); }
    if (this.chain) { this.chain.position.set((shoP.x + r * 0.08) * U, (shoP.y - 2) * U, 0); this.chain.rotation.set(Math.PI / 2, 0.25, 0); this.chain.scale.setScalar(neckW * 0.85 * U); }
    if (this.tail) {
      const sway = Math.sin(frame / 9) * 0.25;
      this.tail.forEach((m, i) => {
        const t = (i + 1) / 10, a = -0.5 - t * 1.4 + sway * t, rr = lw * (L_isFox(this.L) ? 0.9 + Math.sin(t * Math.PI) * 0.9 : 1.3 + Math.sin(t * Math.PI));
        m.position.set((-waistW * 0.45 - Math.cos(a) * h * 0.36 * t) * U, (hipY + 4 - Math.sin(a) * h * 0.3 * t) * U, 0); m.scale.setScalar(rr * U);
      });
    }
    if (this.cape) {
      const pos = this.capeGeo.attributes.position, trail = clamp(Math.abs(f.vx) * 4, 0, 30) * s;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5, v = 0.5 - pos.getY(i); // u across shoulders, v down the cape
        const wave = Math.sin(frame / 5 + v * 4 + u * 2) * 6 * v * s;
        pos.setXYZ(i, (shoP.x - shoW * 0.35 - v * (h * 0.18 + trail) + wave * 0.3) * U, (shoP.y - v * (legL * 1.25 + torso * 0.9)) * U, (u - 0.5) * shoW * 1.05 * U * F + wave * 0.2 * U);
      }
      pos.needsUpdate = true; this.capeGeo.computeVertexNormals();
    }
    if (this.sword) { this.sword.position.set(waistW * 0.35 * U, (hipY - 2 * s) * U, 0); this.sword.rotation.set(0, 0, 0.25 + Math.sin(frame / 7) * 0.05); this.sword.scale.setScalar(0.42 * f.h * s * U); }
    // hit flash / armour / buffs
    const flash = f.flash > 0, armour = f.armor > 0;
    for (const m of this.mats) {
      if (!m.emissive) continue;
      if (flash) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 1.2; }
      else if (armour) { m.emissive.setHex(0x8a4060); m.emissiveIntensity = 0.35; }
      else if (m.userData.e0) { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.i0; }
    }
    const buff = f.flow > 0 || f.big > 0 || f.armor > 0 || (cine && cine.side === f.side && cine.kind === 'act');
    this.aura.material.opacity = lerp(this.aura.material.opacity, buff ? 0.55 + 0.15 * Math.sin(frame / 6) : 0, 0.15);
    this.aura.position.set(0, h * 0.55 * U, 0); this.aura.scale.set(h * 1.3 * U, h * 1.5 * U, 1);
    // ground blob shadow (always, cheap)
    const lift = clamp((FLOOR - f.y) / 200, 0, 0.7), lying = f.kd === 2 || f.kd === 3 || (f.kd === 1 && f.bounced);
    this.shadowBlob.position.set(wx(f.x) - (lying ? F * f.h * 0.4 * U : 0), 0.012, 0);
    const bw = (lying ? f.h * 1.1 : f.bw * 1.6) * s * (1 - lift * 0.5) * U * scale3; this.shadowBlob.scale.set(bw, bw * 0.45, 1);
    this.shadowBlob.material.opacity = 0.55 * (1 - lift);
    // hands for the claw rake
    this._handF = handF;
  }
}
const L_isFox = L => L.tail === 'fox';

function syncModel(slot, f, sc, list, scale3) {
  const furry = f.furT > 0 && f.c.id === 'blake';
  const key = f.ci + ':' + f.skin + ':' + (furry ? 1 : 0);
  let m = list[slot];
  if (!m || m.key !== key) { if (m) m.dispose(); m = list[slot] = new Model(f); sc.add(m.root); sc.add(m.shadowBlob); }
  m.update(f, scale3);
  return m;
}

// ---------- shared light rig (same light count on every stage, so shaders never recompile) ----------
function makeRig(sc) {
  const r = {};
  r.hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1); sc.add(r.hemi);
  r.key = new THREE.DirectionalLight(0xffffff, 2.5); r.key.position.set(3, 9, 7); r.key.castShadow = true;
  Object.assign(r.key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -1, near: 1, far: 30 });
  r.key.shadow.bias = -0.0004; r.key.shadow.normalBias = 0.02;
  sc.add(r.key, r.key.target);
  r.rim = new THREE.DirectionalLight(0xffffff, 1.5); r.rim.position.set(-4, 5, -6); sc.add(r.rim);
  r.points = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 16, 2); sc.add(l); return l; });
  r.spots = [0, 1, 2].map(() => { const l = new THREE.SpotLight(0xffffff, 0, 30, 0.32, 0.5, 1.2); sc.add(l, l.target); return l; });
  r.cine = new THREE.PointLight(0xffffff, 0, 10, 2); sc.add(r.cine);
  return r;
}
function setRig(o) {
  rig.hemi.color.set(o.sky); rig.hemi.groundColor.set(o.ground); rig.hemi.intensity = o.hemi;
  rig.key.color.set(o.keyCol); rig.key.intensity = o.key; rig.rim.color.set(o.rimCol); rig.rim.intensity = o.rim;
  rig.points.forEach((l, i) => { const d = o.points[i]; l.intensity = d ? d[4] : 0; if (d) { l.color.set(d[0]); l.position.set(d[1], d[2], d[3]); } });
  rig.spots.forEach((l, i) => { const d = o.spots && o.spots[i]; l.intensity = d ? d[1] : 0; if (d) { l.color.set(d[0]); l.position.set(d[2], d[3], d[4]); } });
  rig.base = o;
  scene.fog = new THREE.Fog(o.fog[0], o.fog[1], o.fog[2]);
  scene.background = o.bg != null ? col(o.bg) : null;
}

// ---------- stages ----------
function floorPlane(mat, w = 44, d = 22) { const m = mesh(new THREE.PlaneGeometry(w, d), mat, false, true); m.rotation.x = -Math.PI / 2; m.position.z = -d / 2 + 6; return m; }
function rainSystem(n, color) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 6), seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seed[i * 3] = (Math.random() - 0.5) * 24; seed[i * 3 + 1] = Math.random() * 12; seed[i * 3 + 2] = -Math.random() * 10 + 3; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
  m.frustumCulled = false;
  m.userData.update = (t, cx) => {
    for (let i = 0; i < n; i++) {
      const x = cx + seed[i * 3] - t * 2 % 1, y = 12 - ((seed[i * 3 + 1] + t * 14) % 12), z = seed[i * 3 + 2];
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x - 0.04; pos[i * 6 + 4] = y - 0.28; pos[i * 6 + 5] = z;
    }
    g.attributes.position.needsUpdate = true;
  };
  return m;
}
function textPlane(text, w, h, font, color, glow) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, cw, ch) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font; g.shadowColor = glow; g.shadowBlur = 30; g.fillStyle = color;
    g.fillText(text, cw / 2, ch / 2); g.fillText(text, cw / 2, ch / 2);
  });
  return mesh(new THREE.PlaneGeometry(w, h), basic(0xffffff, { map: tex, transparent: true, depthWrite: false }), false);
}
function figure(mat, headMat) {
  const g = new THREE.Group();
  const body = mesh(GEO.capsule, mat); body.position.y = 0.95; body.scale.set(0.24, 0.42, 0.18); g.add(body);
  const head = mesh(GEO.sphere, headMat || mat); head.position.y = 1.62; head.scale.setScalar(0.17); g.add(head);
  const arms = [0, 1].map(i => { const a = mesh(GEO.cyl, mat); a.scale.set(0.05, 0.55, 0.05); g.add(a); return a; });
  const legs = [0, 1].map(i => { const l = mesh(GEO.cyl, mat); l.scale.set(0.07, 0.75, 0.07); l.position.set(0, 0.38, i ? 0.1 : -0.1); g.add(l); return l; });
  g.userData = { body, head, arms, legs };
  return g;
}
function faceHead(image) {
  const g = new THREE.Group(), t = imgTex(image);
  const s = mesh(GEO.sphere, std(0x2a1a1a)); g.add(s);
  const f = mesh(GEO.face, std(0xffffff, { map: t, transparent: true, depthWrite: false }), false); f.rotation.y = -Math.PI / 2; g.add(f);
  return g;
}

function buildClub() {
  const g = new THREE.Group(), anim = [];
  const tileTex = canvasTex(256, 256, (c, w, h) => {
    const cols = ['#ff3fa4', '#3b8cff', '#b44dff', '#2ee6c8'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 3 ? '#140a18' : cols[(i * 4 + j) % 4]; c.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  }, { repeat: [11, 5.5] });
  const floorM = std(0xffffff, { map: tileTex, emissiveMap: tileTex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.22, metalness: 0.4 });
  g.add(floorPlane(floorM));
  const brick = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1c0d22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#0c0510'; c.lineWidth = 4; for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 32 % 2) * 32; x < w; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } } }, { repeat: [10, 3] });
  const wall = mesh(new THREE.PlaneGeometry(50, 14), std(0xffffff, { map: brick, roughness: 0.95 }), false, true); wall.position.set(0, 7, -7.5); g.add(wall);
  const sign = textPlane('BP / VERITY CLUB', 8, 1.3, 'italic 900 130px Impact, sans-serif', '#ffd6ee', '#ff3fa4'); sign.position.set(0, 4.8, -7.4); g.add(sign);
  const sub = textPlane('4 LEGENDS · 1 CLUB · ENDLESS PROBLEMS', 5, 0.4, 'bold 60px sans-serif', '#ff9a9a', '#ff2b2b'); sub.position.set(0, 4.0, -7.4); g.add(sub);
  const tube = (c, x, y, w, hgt) => { const m = mesh(GEO.box, basic(c), false); m.position.set(x, y, -7.35); m.scale.set(w, hgt, 0.06); g.add(m); return m; };
  const tubes = [tube('#b44dff', -4.6, 5.9, 2.6, 0.07), tube('#f5c518', 4.6, 5.9, 2.6, 0.07), tube('#3b8cff', -9, 3.6, 0.07, 3.5), tube('#ff2b2b', 9, 3.6, 0.07, 3.5)];
  const darkM = std(0x0c0812, { roughness: 0.6 });
  for (const sx of [-7, 7]) for (let k = 0; k < 3; k++) { const s = mesh(GEO.box, darkM, true, true); s.position.set(sx, 0.55 + k * 1.1, -6.6); s.scale.set(1, 1.05, 0.8); g.add(s); const cone = mesh(GEO.cyl, std(0x1a1222)); cone.rotation.x = Math.PI / 2; cone.position.set(sx, 0.55 + k * 1.1, -6.18); cone.scale.set(0.34, 0.05, 0.34); g.add(cone); }
  const booth = mesh(GEO.box, darkM, true, true); booth.position.set(0, 0.55, -5.4); booth.scale.set(2.4, 1.1, 0.9); g.add(booth);
  const strip = mesh(GEO.box, basic('#ff3fa4'), false); strip.position.set(0, 1.12, -4.94); strip.scale.set(2.4, 0.05, 0.02); g.add(strip);
  const dj = figure(darkM); dj.position.set(0, 0.2, -6); g.add(dj);
  const phones = mesh(new THREE.TorusGeometry(0.19, 0.03, 6, 16, Math.PI), basic('#2ee6c8'), false); phones.position.set(0, 1.84, -6); g.add(phones);
  // crowd with the featured regulars
  const crowd = [], crowdM = std(0x221828, { roughness: 0.6 });
  for (let i = 0; i < 20; i++) {
    const x = -12 + i * 1.25 + (Math.sin(i * 7) * 0.3); if (Math.abs(x) < 1.6) continue;
    const special = i === 4 ? 'model' : i === 15 ? 'hoodie' : null;
    const f = figure(crowdM, null); f.position.set(x, 0, -3.8 - (i % 3) * 0.7); f.scale.setScalar(0.9 + (i * 13 % 5) * 0.06);
    if (special) { f.userData.head.visible = false; const fh = faceHead(CROWD_IMG[special]); fh.position.y = 1.62; fh.scale.set(0.17, 0.2, 0.17); fh.rotation.y = 0.3; f.add(fh); }
    f.userData.ph = i * 1.3; f.userData.up = i % 2; g.add(f); crowd.push(f);
  }
  const creature = mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshStandardMaterial({ map: imgTex(CROWD_IMG.creature), transparent: true, alphaTest: 0.3, roughness: 0.8 }), false);
  creature.position.set(9.2, 1.1, -4.2); g.add(creature);
  const ball = mesh(new THREE.IcosahedronGeometry(0.5, 2), std(0xffffff, { metalness: 1, roughness: 0.12, flatShading: true }), false); ball.position.set(0, 6.2, -3); g.add(ball);
  const cord = mesh(GEO.cyl, darkM, false); cord.position.set(0, 7.5, -3); cord.scale.set(0.01, 2.2, 0.01); g.add(cord);
  // visible light beams
  const beams = [0, 1, 2].map(i => { const b = mesh(GEO.beam, new THREE.MeshBasicMaterial({ color: ['#ff3fa4', '#3b8cff', '#b44dff'][i], transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); g.add(b); return b; });
  const lasers = [0, 1, 2, 3].map(i => { const l = mesh(GEO.cyl, basic(i % 2 ? '#2ee6c8' : '#ff2b2b', { transparent: true, opacity: 0.6 }), false); l.scale.set(0.012, 26, 0.012); g.add(l); return l; });
  return {
    group: g,
    setup() { setRig({ sky: '#6a3a8a', ground: '#12060f', hemi: 0.7, keyCol: '#ffe0f0', key: 1.5, rimCol: '#6a7dff', rim: 2.2, fog: [0x12061a, 12, 45], bg: 0x07040d,
      points: [['#ff3fa4', 0, 4.6, -6.5, 22], ['#2ee6c8', 0, 1.6, -4.5, 8], ['#b44dff', -8, 3, -5, 14], ['#3b8cff', 8, 3, -5, 14]],
      spots: [['#ff3fa4', 45, -5, 8, -1], ['#3b8cff', 45, 0, 8, -1], ['#b44dff', 45, 5, 8, -1]] }); },
    update(t) {
      const bt = beat();
      floorM.emissiveIntensity = 0.05 + 0.22 * bt;
      tubes.forEach((m, i) => m.material.color.setScalar(0.7 + 0.3 * Math.sin(t * 3 + i)));
      ball.rotation.y = t * 0.6;
      crowd.forEach(f => { const d = f.userData, b = Math.abs(Math.sin(t * Math.PI * BPM / 60 + d.ph));
        d.body.position.y = 0.95 + b * 0.06; (d.head.visible ? d.head : f.children[f.children.length - 1]).position.y = 1.62 + b * 0.06;
        d.arms.forEach((a, k) => { const up = d.up ? 2.6 + Math.sin(t * 5 + d.ph + k) * 0.4 : 0.4 + Math.sin(t * 4 + d.ph + k) * 0.3; a.position.set(Math.sin(up) * 0.27, 1.25 + b * 0.06 - Math.cos(up) * 0.27, k ? 0.26 : -0.26); a.rotation.set(k ? 0.2 : -0.2, 0, -up); }); });
      dj.userData.head.position.y = 1.62 + Math.sin(t * Math.PI * BPM / 60) * 0.04;
      rig.spots.forEach((l, i) => { l.target.position.set(Math.sin(t * (0.7 + i * 0.2) + i) * 5, 0, 1 + Math.cos(t * 0.5 + i) * 1.5); });
      beams.forEach((b, i) => { const L2 = rig.spots[i]; placeSeg(b, L2.position, L2.target.position, 1); b.scale.x = b.scale.z = 1; });
      lasers.forEach((l, i) => { l.position.set(i < 2 ? -10 : 10, 6, -6); l.rotation.set(0.6 + Math.sin(t * 0.8 + i) * 0.4, 0, (i < 2 ? -1 : 1) * (0.9 + Math.sin(t * 0.6 + i) * 0.3)); l.material.opacity = 0.25 + 0.5 * bt; });
    },
  };
}

function buildGarden() {
  const g = new THREE.Group();
  const sky = mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: col('#3f8ff0') }, mid: { value: col('#bfe0ff') }, bot: { value: col('#ffe1b0') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.7, h)) : mix(bot, mid, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(c, 1.0); }',
  }), false);
  g.add(sky);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,250,230,1)', 'rgba(255,220,150,0)'), blending: THREE.AdditiveBlending, fog: false, depthWrite: false })); sun.position.set(40, 38, -120); sun.scale.set(40, 40, 1); g.add(sun);
  const grassTex = noiseTex('#4f8f3f', 0.25, 9000, [26, 12]);
  g.add(floorPlane(std(0xffffff, { map: grassTex, roughness: 0.95 }), 120, 60));
  const stone = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#7d776c'; c.fillRect(0, 0, w, h); for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { c.fillStyle = (i + j) % 2 ? '#aaa496' : '#9d968a'; c.fillRect(i * 44 + (j % 2) * 22 - 10, j * 43 + 2, 40, 39); } }, { repeat: [14, 1] });
  const path = mesh(new THREE.PlaneGeometry(44, 2.8), std(0xffffff, { map: stone, roughness: 0.85 }), false, true); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.006, 0.2); g.add(path);
  const hedgeTex = noiseTex('#2f6b34', 0.35, 7000, [12, 1]);
  const hedgeM = std(0xffffff, { map: hedgeTex, bumpMap: hedgeTex, bumpScale: 3, roughness: 1 });
  const hedge = mesh(new THREE.BoxGeometry(46, 2.2, 1.2), hedgeM, true, true); hedge.position.set(0, 1.1, -6.6); g.add(hedge);
  for (let x = -18; x <= 18; x += 6) { const a = mesh(new THREE.BoxGeometry(1.4, 1.7, 0.2), std(0x10260f, { roughness: 1 }), false); a.position.set(x, 0.85, -5.98); g.add(a); }
  const trees = [];
  for (let i = 0; i < 11; i++) {
    const tr = new THREE.Group(), x = -22 + i * 4.4 + Math.sin(i * 3) * 0.8, z = -10 - (i % 3) * 2.2;
    const trunk = mesh(GEO.cyl, std(0x5a3d26, { roughness: 1 })); trunk.scale.set(0.22, 3.2, 0.22); trunk.position.y = 1.6; tr.add(trunk);
    for (const [dx, dy, s, c] of [[0, 3.8, 1.5, '#3f7f3a'], [-0.9, 3.2, 1.1, '#3a7535'], [0.9, 3.3, 1.1, '#2f6a2e'], [0.2, 4.6, 1, '#5a9c4e']]) {
      const cpy = mesh(GEO.ico, std(c, { roughness: 0.9, flatShading: true })); cpy.position.set(dx, dy, 0); cpy.scale.setScalar(s); tr.add(cpy);
    }
    tr.position.set(x, 0, z); tr.userData.ph = i; g.add(tr); trees.push(tr);
  }
  for (const [x, s] of [[-30, 22], [5, 30], [40, 25]]) { const hill = mesh(GEO.sphere, std(0x6fa35e, { roughness: 1 }), false); hill.position.set(x, -s * 0.7, -70); hill.scale.set(s * 1.6, s, s); g.add(hill); }
  // fountain with spray
  const stoneM = std(0xb9b2a6, { roughness: 0.8 });
  const basin = mesh(GEO.cyl, stoneM, true, true); basin.position.set(0, 0.25, -4.4); basin.scale.set(1.7, 0.5, 1.0); g.add(basin);
  const water = mesh(GEO.cyl, std(0x6fb8e0, { roughness: 0.05, metalness: 0.3 })); water.position.set(0, 0.48, -4.4); water.scale.set(1.55, 0.04, 0.9); g.add(water);
  const col1 = mesh(GEO.cyl, stoneM); col1.position.set(0, 1.0, -4.4); col1.scale.set(0.16, 1.4, 0.16); g.add(col1);
  const bowl = mesh(GEO.cyl, stoneM); bowl.position.set(0, 1.7, -4.4); bowl.scale.set(0.6, 0.12, 0.4); g.add(bowl);
  const sprayN = 160, sprayG = new THREE.BufferGeometry(), sprayP = new Float32Array(sprayN * 3);
  sprayG.setAttribute('position', new THREE.BufferAttribute(sprayP, 3));
  const spray = new THREE.Points(sprayG, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false })); spray.frustumCulled = false; g.add(spray);
  // flowers
  const flowers = new THREE.InstancedMesh(GEO.sphereLo, std(0xffffff, { roughness: 0.6 }), 420);
  const m4 = new THREE.Matrix4(), fcols = ['#ff6fa8', '#ffd84d', '#ffffff', '#b77cff', '#ff8a4d'].map(c => col(c));
  for (let i = 0; i < 420; i++) { m4.makeScale(0.07, 0.07, 0.07).setPosition(-22 + Math.random() * 44, 0.08 + Math.random() * 0.3, -5.85 + Math.random() * 0.5); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, fcols[i % 5]); }
  g.add(flowers);
  const lampM = basic('#ffe9a8');
  for (const x of [-9, -3, 3, 9]) { const p = mesh(GEO.cyl, std(0x222222)); p.position.set(x, 1.3, -5.4); p.scale.set(0.05, 2.6, 0.05); g.add(p); const b = mesh(GEO.sphere, lampM, false); b.position.set(x, 2.7, -5.4); b.scale.setScalar(0.14); g.add(b); }
  const petN = 140, petG = new THREE.BufferGeometry(), petP = new Float32Array(petN * 3), petS = [];
  for (let i = 0; i < petN; i++) petS.push([Math.random() * 30 - 15, Math.random() * 8, Math.random() * 8 - 5, Math.random()]);
  petG.setAttribute('position', new THREE.BufferAttribute(petP, 3));
  const petals = new THREE.Points(petG, new THREE.PointsMaterial({ color: 0xffb0d0, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false })); petals.frustumCulled = false; g.add(petals);
  return {
    group: g,
    setup() { setRig({ sky: '#cfe6ff', ground: '#4c8c3f', hemi: 1.2, keyCol: '#fff1d6', key: 3.2, rimCol: '#ffd9a0', rim: 1.2, fog: [0xdcecff, 30, 140], bg: null,
      points: [['#ffe9a8', -3, 2.7, -5.2, 6], ['#ffe9a8', 3, 2.7, -5.2, 6]] }); },
    update(t) {
      trees.forEach(tr => { tr.rotation.z = Math.sin(t * 1.2 + tr.userData.ph) * 0.025; });
      for (let i = 0; i < sprayN; i++) { const p = (t * 0.8 + i / sprayN) % 1, side = i % 2 ? 1 : -1, v = 0.6 + (i % 5) * 0.1, ang = i * 2.39; sprayP[i * 3] = Math.cos(ang) * side * v * p; sprayP[i * 3 + 1] = 1.8 + 1.2 * p - 2.2 * p * p; sprayP[i * 3 + 2] = -4.4 + Math.sin(ang) * v * p * 0.6; }
      sprayG.attributes.position.needsUpdate = true;
      for (let i = 0; i < petN; i++) { const s = petS[i]; petP[i * 3] = cam3.x + ((s[0] + t * 0.6 * (0.5 + s[3]) + Math.sin(t + i) * 0.3 + 15) % 30) - 15; petP[i * 3 + 1] = 8 - ((s[1] + t * 0.5 * (0.5 + s[3])) % 8); petP[i * 3 + 2] = s[2]; }
      petG.attributes.position.needsUpdate = true;
    },
  };
}

function buildRoof() {
  const g = new THREE.Group();
  const starN = 600, starG = new THREE.BufferGeometry(), starP = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) { const a = Math.random() * Math.PI * 2, e = 0.08 + Math.random() * 1.2; starP[i * 3] = Math.cos(a) * 120 * Math.cos(e); starP[i * 3 + 1] = Math.sin(e) * 120; starP[i * 3 + 2] = -Math.abs(Math.sin(a)) * 120 * Math.cos(e) - 20; }
  starG.setAttribute('position', new THREE.BufferAttribute(starP, 3));
  g.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true, fog: false })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,250,235,1)', 'rgba(255,250,235,0)'), fog: false, depthWrite: false })); moon.position.set(-40, 34, -120); moon.scale.set(18, 18, 1); g.add(moon);
  const winTex = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 9) if (Math.random() < 0.35) { c.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#8cc8ff'; c.fillRect(x, y, 5, 6); } });
  const city = new THREE.InstancedMesh(GEO.box, std(0x0c1030, { emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.1, roughness: 0.8 }), 170);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 170; i++) { const hgt = 6 + Math.random() * 30, w = 2 + Math.random() * 4; m4.makeScale(w, hgt, w).setPosition(-70 + Math.random() * 140, -12 + hgt / 2, -22 - Math.random() * 60); city.setMatrixAt(i, m4); }
  g.add(city);
  for (let i = 0; i < 8; i++) { const s = mesh(GEO.box, basic(['#ff3fa4', '#2ee6c8', '#b44dff'][i % 3]), false); s.position.set(-50 + i * 14, 6 + (i * 7 % 10), -30 - (i * 13 % 25)); s.scale.set(3, 0.4, 0.1); g.add(s); }
  const conc = noiseTex('#2c2c36', 0.2, 6000, [12, 6]);
  g.add(floorPlane(std(0xffffff, { map: conc, roughness: 0.6, metalness: 0.15 })));
  for (const [x, z, s] of [[-3, 1.5, 1.2], [4.5, 2.4, 0.9], [-6, -1, 1.5]]) { const pd = mesh(GEO.disc, std(0x101018, { roughness: 0.05, metalness: 0.8 }), false, true); pd.rotation.x = -Math.PI / 2; pd.position.set(x, 0.008, z); pd.scale.set(s, s * 0.5, 1); g.add(pd); }
  const pad = mesh(new THREE.RingGeometry(1.5, 1.65, 48), basic('#f5c518', { transparent: true, opacity: 0.6 }), false); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.01, 1.2); g.add(pad);
  const railM = std(0x3a3a48, { metalness: 0.6, roughness: 0.4 });
  const rail = mesh(GEO.box, railM); rail.position.set(0, 1.05, -3.6); rail.scale.set(40, 0.06, 0.06); g.add(rail);
  for (let x = -20; x <= 20; x += 1.2) { const p = mesh(GEO.box, railM); p.position.set(x, 0.52, -3.6); p.scale.set(0.05, 1.05, 0.05); g.add(p); }
  const unitM = std(0x45454f, { roughness: 0.5, metalness: 0.3 });
  for (const x of [-6.5, 6]) { const u2 = mesh(GEO.box, unitM, true, true); u2.position.set(x, 0.6, -2.8); u2.scale.set(1.6, 1.2, 1); g.add(u2); const fan = mesh(GEO.cyl, std(0x22222a)); fan.position.set(x, 1.22, -2.8); fan.scale.set(0.45, 0.04, 0.45); g.add(fan); }
  const tank = mesh(GEO.cyl, std(0x4a3a2c, { roughness: 0.9 })); tank.position.set(9, 3.4, -6); tank.scale.set(1.2, 2.2, 1.2); g.add(tank);
  const roofc = mesh(GEO.cone, std(0x3a2c20)); roofc.position.set(9, 4.9, -6); roofc.scale.set(1.35, 0.8, 1.35); g.add(roofc);
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) { const l = mesh(GEO.cyl, std(0x3a2c20)); l.position.set(9 + dx, 1.15, -6 + dz); l.scale.set(0.07, 2.3, 0.07); g.add(l); }
  const ant = mesh(GEO.cyl, railM); ant.position.set(-9, 2.5, -5); ant.scale.set(0.04, 5, 0.04); g.add(ant);
  const blink = mesh(GEO.sphere, basic('#ff2b2b'), false); blink.position.set(-9, 5.05, -5); blink.scale.setScalar(0.09); g.add(blink);
  const heli = new THREE.Group(); const hb = mesh(GEO.box, std(0x111111)); hb.scale.set(1.4, 0.45, 0.5); heli.add(hb); const ht = mesh(GEO.box, std(0x111111)); ht.scale.set(1.2, 0.1, 0.1); ht.position.x = 1.1; heli.add(ht);
  const hbeam = mesh(GEO.beam, new THREE.MeshBasicMaterial({ color: 0xffffe0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false);
  g.add(heli, hbeam);
  const rain = rainSystem(500, 0xaabbff); g.add(rain);
  return {
    group: g,
    setup() { setRig({ sky: '#3a4a8a', ground: '#0a0a14', hemi: 0.7, keyCol: '#aabbff', key: 1.8, rimCol: '#ff3fa4', rim: 1.6, fog: [0x0a0c22, 18, 110], bg: 0x050816,
      points: [['#ff3fa4', -6, 2.5, -3, 14], ['#2ee6c8', 6, 2.5, -3, 14]], spots: [['#ffffe0', 0, 0, 14, -10]] }); },
    update(t) {
      blink.visible = frame % 50 < 25;
      heli.position.set(((t * 1.6) % 60) - 30, 13, -14);
      const sp = rig.spots[0]; sp.position.copy(heli.position); sp.intensity = 220; sp.target.position.set(heli.position.x + Math.sin(t) * 4, 0, 0); placeSeg(hbeam, sp.position, sp.target.position, 1); hbeam.scale.x = hbeam.scale.z = 1.4;
      rain.userData.update(t, cam3.x);
    },
  };
}

function buildVerse() {
  const g = new THREE.Group();
  const back = mesh(new THREE.PlaneGeometry(150, 84), new THREE.MeshBasicMaterial({ map: imgTex(VERSE_IMG), fog: false, toneMapped: false }), false); back.position.set(0, 24, -70); g.add(back);
  const wet = noiseTex('#1b0f16', 0.18, 5000, [10, 5]);
  g.add(floorPlane(std(0xffffff, { map: wet, roughness: 0.18, metalness: 0.45 })));
  const wallM = std(0x15101a, { roughness: 0.9 });
  const ledge = mesh(GEO.box, wallM, true, true); ledge.position.set(0, 0.4, -4); ledge.scale.set(40, 0.8, 0.4); g.add(ledge);
  const fenceTex = canvasTex(64, 64, (c, w, h) => { c.strokeStyle = 'rgba(160,160,170,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke(); }, { repeat: [60, 5] });
  const fence = mesh(new THREE.PlaneGeometry(40, 3), std(0xffffff, { map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), false); fence.position.set(0, 2.3, -4.1); g.add(fence);
  // basketball hoop
  const poleM = std(0x2a2a30, { metalness: 0.6, roughness: 0.4 });
  const pole = mesh(GEO.cyl, poleM); pole.position.set(6.5, 1.8, -3.2); pole.scale.set(0.07, 3.6, 0.07); g.add(pole);
  const board = mesh(GEO.box, std(0xffffff, { roughness: 0.3 })); board.position.set(6.5, 3.5, -2.95); board.scale.set(1.4, 0.9, 0.05); g.add(board);
  const sq = mesh(GEO.box, basic('#d10f1f'), false); sq.position.set(6.5, 3.4, -2.92); sq.scale.set(0.5, 0.4, 0.01); g.add(sq);
  const rim = mesh(new THREE.TorusGeometry(0.24, 0.02, 8, 24), std(0xff5a1f, { metalness: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.set(6.5, 3.1, -2.6); g.add(rim);
  const net = mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.4, 12, 3, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.6 }), false); net.position.set(6.5, 2.88, -2.6); g.add(net);
  const graf = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#1a1420'; c.fillRect(0, 0, w, h); c.font = '900 80px Impact, sans-serif'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.textAlign = 'center'; c.fillText('BP', w / 2, 95); c.strokeStyle = '#d10f1f'; c.lineWidth = 6; c.beginPath(); c.moveTo(90, 30); c.lineTo(100, 8); c.lineTo(115, 26); c.lineTo(128, 6); c.lineTo(141, 26); c.lineTo(156, 8); c.lineTo(166, 30); c.stroke(); });
  const gw = mesh(GEO.box, std(0xffffff, { map: graf, roughness: 0.9 }), true, true); gw.position.set(-8, 1.6, -5.5); gw.scale.set(4, 3.2, 0.3); g.add(gw);
  for (const x of [-12, -3, 3, 12]) { const bar = mesh(GEO.box, basic('#ff2040'), false); bar.position.set(x, 2.6, -4.6); bar.scale.set(1.2, 0.05, 0.05); g.add(bar); }
  const rain = rainSystem(500, 0xffaacc); g.add(rain);
  return {
    group: g,
    setup() { setRig({ sky: '#6a2a5a', ground: '#0a0408', hemi: 0.7, keyCol: '#ff9aa8', key: 1.7, rimCol: '#8a5aff', rim: 2.4, fog: [0x1a0612, 14, 90], bg: 0x0a0410,
      points: [['#ff2040', -6, 2.6, -3.5, 16], ['#ff2040', 6, 2.6, -3.5, 16], ['#8a5aff', 0, 4, -6, 20]] }); },
    update(t) { rain.userData.update(t, cam3.x); },
  };
}

// ---------- effects: sparks, dust, rings, impact stars, projectiles ----------
function makePoints(cap, blending) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(cap * 3), rgba = new Float32Array(cap * 4), size = new Float32Array(cap);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rgba', new THREE.BufferAttribute(rgba, 4)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending, uniforms: { scale: { value: 500 } },
    vertexShader: 'attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale; void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; gl_FragColor = vec4(vC.rgb, vC.a * smoothstep(0.5, 0.05, r)); }',
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return { pts, pos, rgba, size, cap, n: 0, g, mat };
}
function makeFX(sc) {
  const fx = {};
  fx.add = makePoints(900, THREE.AdditiveBlending); fx.norm = makePoints(500, THREE.NormalBlending);
  sc.add(fx.add.pts, fx.norm.pts);
  fx.glowTex = radialTex('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  fx.blobTex = radialTex('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)');
  fx.starTex = canvasTex(128, 128, (g) => { g.translate(64, 64); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 18 : 62; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); });
  fx.rings = Array.from({ length: 10 }, () => { const m = mesh(new THREE.RingGeometry(0.85, 1, 48), basic(0xffffff, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false); m.visible = false; sc.add(m); return m; });
  fx.stars = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.starTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; sc.add(s); return s; });
  fx.hypno = mesh(new THREE.RingGeometry(0.92, 1, 64), basic('#b44dff', { transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }), false); fx.hypno.rotation.x = -Math.PI / 2; sc.add(fx.hypno);
  fx.proj = { wave: [], spiral: [], ball: [] };
  fx.ballTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d4601a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a0a04'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); for (const x of [w / 4, w * 3 / 4]) { g.moveTo(x, 0); g.lineTo(x, h); } g.stroke(); g.beginPath(); g.arc(0, h / 2, h * 0.6, -1.2, 1.2); g.arc(w, h / 2, h * 0.6, Math.PI - 1.2, Math.PI + 1.2); g.stroke(); });
  return fx;
}
function projMesh(kind) {
  if (kind === 'ball') return mesh(new THREE.SphereGeometry(1, 20, 14), std(0xffffff, { map: fx3.ballTex, roughness: 0.6 }));
  const grp = new THREE.Group();
  if (kind === 'wave') {
    for (let i = 0; i < 3; i++) { const t = mesh(new THREE.TorusGeometry(1 - i * 0.12, 0.08 - i * 0.015, 8, 32, Math.PI * 0.9), basic(['#e0f2ff', '#5aa8ff', '#1a4fb0'][i], { transparent: true, opacity: 0.9 }), false); t.rotation.z = -Math.PI * 0.45; t.position.x = -i * 0.25; grp.add(t); }
  } else {
    const k = mesh(new THREE.TorusKnotGeometry(0.7, 0.12, 64, 8), basic('#e0b3ff'), false); grp.add(k);
    const o = mesh(new THREE.TorusGeometry(1, 0.06, 8, 32), basic('#b44dff'), false); grp.add(o);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3.glowTex, color: kind === 'wave' ? 0x3b8cff : 0xb44dff, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(4); grp.add(glow);
  return grp;
}
const hexRGB = c => { if (!c || c[0] !== '#') return [1, 1, 1]; const n = parseInt(c.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
function updateFX() {
  const A = fx3.add, N = fx3.norm, q = QUALITY[qLevel].fx; A.n = 0; N.n = 0;
  let ri = 0, si = 0;
  for (const p of parts) {
    if (p.z === undefined) p.z = 0.15 + (Math.random() - 0.5) * 0.5;
    const a = p.life / p.max, X = wx(p.x), Y = wy(p.y);
    if (p.k === 's' && A.n < A.cap) { if (q < 1 && (A.n % 3) > 3 * q) continue; const [r, g, b] = hexRGB(p.c), i = A.n++; A.pos.set([X, Y, p.z], i * 3); A.rgba.set([r * 1.4 + 0.3, g * 1.4 + 0.3, b * 1.4 + 0.3, clamp(a * 1.6, 0, 1)], i * 4); A.size[i] = 0.07 + a * 0.05; }
    else if ((p.k === 'd' || p.k === 'b') && N.n < N.cap) { const i = N.n++, dark = p.k === 'b'; N.pos.set([X, Y, p.z], i * 3); N.rgba.set(dark ? [0.25, 0.22, 0.27, a] : [0.72, 0.66, 0.75, a * 0.45], i * 4); N.size[i] = dark ? 0.06 : 0.12 + (1 - a) * 0.25; }
    else if ((p.k === 'r' || p.k === 'f') && ri < fx3.rings.length) {
      const m = fx3.rings[ri++]; m.visible = true; m.material.color.set(p.c); m.material.opacity = a;
      const s = ((1 - a) * 90 + 10) * U * (p.k === 'f' ? 1.8 : 1); m.scale.setScalar(s);
      if (p.k === 'f') { m.position.set(X, 0.02, 0); m.rotation.set(-Math.PI / 2, 0, 0); } else { m.position.set(X, Y, p.z + 0.2); m.quaternion.copy(camera.quaternion); }
    } else if (p.k === 'i' && si < fx3.stars.length) { const s = fx3.stars[si++]; s.visible = true; s.position.set(X, Y, 0.45); const k = ((1 - a) * 46 * p.s + 12 * p.s) * U * 2.2; s.scale.set(k, k, 1); s.material.rotation = p.a; s.material.color.set(p.c); s.material.opacity = Math.min(1, a * 2); }
  }
  for (; ri < fx3.rings.length; ri++) fx3.rings[ri].visible = false;
  for (; si < fx3.stars.length; si++) fx3.stars[si].visible = false;
  for (const P2 of [A, N]) { P2.g.setDrawRange(0, P2.n); for (const k of ['position', 'rgba', 'size']) P2.g.attributes[k].needsUpdate = true; }
  // projectiles
  const used = { wave: 0, spiral: 0, ball: 0 };
  for (const pr of projs) {
    const pool = fx3.proj[pr.kind]; if (!pool) continue;
    let m = pool[used[pr.kind]]; if (!m) { m = projMesh(pr.kind); scene.add(m); pool.push(m); }
    used[pr.kind]++; m.visible = true;
    const d = Math.sign(pr.vx) || 1, rr = pr.r * U;
    m.position.set(wx(pr.x), wy(pr.y), 0.15);
    if (pr.kind === 'ball') { m.scale.setScalar(rr); m.rotation.z = -pr.t * 0.2 * d; }
    else if (pr.kind === 'wave') { m.scale.setScalar(rr * 1.1); m.rotation.y = d > 0 ? 0 : Math.PI; }
    else { m.scale.setScalar(rr * 0.9); m.rotation.set(pr.t * 0.2, pr.t * 0.25, 0); }
  }
  for (const k in fx3.proj) fx3.proj[k].forEach((m, i) => { if (i >= used[k]) m.visible = false; });
  // Ryan's hypno field
  const big = P.find(f => f.big > 0);
  fx3.hypno.visible = !!big;
  if (big) { fx3.hypno.position.set(wx(big.x), 0.02, 0); fx3.hypno.scale.set(2.3, 0.6, 1); fx3.hypno.material.opacity = 0.3 + 0.12 * Math.sin(frame / 8); }
}

// ---------- camera (follows the fight; swings and orbits for intros, supers and the win) ----------
function updateCamera3D(models3) {
  const z = camZ();
  let tx = wx(cam.x), ty = 1.0, yaw = 0, dist = 5.7 / z;
  if (cine && P[cine.side]) {
    const f = P[cine.side], k = cine.t / cine.max, dir = f.facing;
    if (cine.kind === 'act') { tx = wx(f.x); ty = wy(f.y - f.h * f.scale * 0.62); yaw = dir * lerp(1.0, 0.25, ease(k)); dist = lerp(3.2, 4.4, ease(k)); }
    else { tx = wx(cine.x); ty = wy(cine.y); yaw = 0.7 * Math.sin(k * Math.PI * 2) * dir; dist = 3.6 + Math.sin(k * Math.PI) * 0.8; }
  } else if (matchOver && winner >= 0) {
    const f = P[winner]; tx = wx(f.x); ty = wy(f.y - f.h * 0.6); yaw = f.facing * (0.55 + 0.12 * Math.sin(overT / 80)); dist = 3.8;
  } else if (introT > 120) {
    const k = (introT - 120) / 110; yaw = 0.9 * ease(k) * (introT > 175 ? -1 : 1); dist = 5.7 + 1.6 * ease(k);
  }
  cam3.yaw = lerp(cam3.yaw, yaw, cine ? 0.12 : 0.06);
  cam3.ty = lerp(cam3.ty, ty, 0.12); cam3.x = lerp(cam3.x, tx, cine ? 0.25 : 0.2);
  const d = cam3.dist = lerp(cam3.dist || dist, dist, 0.1);
  const sh = shake * 0.006;
  camera.position.set(cam3.x + Math.sin(cam3.yaw) * d + (Math.random() - 0.5) * sh, cam3.ty + 0.35 + d * 0.05 + (Math.random() - 0.5) * sh, Math.cos(cam3.yaw) * d);
  camera.lookAt(cam3.x, cam3.ty, 0);
  camera.rotateZ(cam.roll * 0.7);
  // key light + shadow box follow the action
  rig.key.position.set(cam3.x + 3, 9, 7); rig.key.target.position.set(cam3.x, 0, 0);
}

// ---------- quality ----------
function applyQuality(level) {
  level = clamp(level | 0, 0, QUALITY.length - 1);
  const Q = QUALITY[level];
  const pr = Math.min(Q.pr, window.devicePixelRatio || 1) * (level >= 2 ? 1 : 1);
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = !!Q.shadows;
  if (Q.shadows) { rig.key.shadow.mapSize.set(Q.shadows, Q.shadows); if (rig.key.shadow.map) { rig.key.shadow.map.dispose(); rig.key.shadow.map = null; } }
  scene.traverse(o => { if (o.material && o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); } });
  composer = null;
  if (Q.bloom) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: Q.samples });
    composer = new EffectComposer(renderer, rt);
    renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.4, 0.9); composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  qLevel = level; resize();
}
function resize() {
  if (!renderer) return;
  const w = glCanvas.clientWidth || 960, h = glCanvas.clientHeight || 540;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (selCam) { selCam.aspect = w / h; selCam.updateProjectionMatrix(); }
  if (composer) composer.setSize(w, h);
  const scale = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  fx3.add.mat.uniforms.scale.value = scale; fx3.norm.mat.uniforms.scale.value = scale;
}

// ---------- character select scene ----------
function buildSelect() {
  selScene = new THREE.Scene(); selScene.background = col(0x0b0612); selScene.fog = new THREE.Fog(0x0b0612, 12, 30);
  selScene.environment = scene.environment; selScene.environmentIntensity = 0.4;
  selCam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100); selCam.position.set(0, 1.9, 10.5); selCam.lookAt(0, 1.25, 0);
  selScene.add(new THREE.HemisphereLight(0x8a6aaa, 0x100810, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0, 6, 6); selScene.add(key);
  const floor = mesh(new THREE.CircleGeometry(14, 48), std(0x120a18, { roughness: 0.25, metalness: 0.5 }), false, true); floor.rotation.x = -Math.PI / 2; selScene.add(floor);
  selScene.userData.spots = [-1, 1].map(s => { const l = new THREE.SpotLight(0xffffff, 120, 20, 0.35, 0.6, 1.2); l.position.set(s * 3.6, 7, 3); l.target.position.set(s * 3.6, 0, 0); selScene.add(l, l.target); return l; });
  selScene.userData.pads = [-1, 1].map(s => { const r = mesh(new THREE.RingGeometry(0.9, 1.05, 48), basic(0xffffff, { transparent: true, opacity: 0.7, side: THREE.DoubleSide }), false); r.rotation.x = -Math.PI / 2; r.position.set(s * 3.6, 0.01, 0); selScene.add(r); return r; });
  const wall = mesh(new THREE.PlaneGeometry(40, 16), std(0x1a0d22, { roughness: 0.9 }), false); wall.position.set(0, 6, -6); selScene.add(wall);
}

// ---------- public API ----------
const R3D = window.R3D = {
  ready: false, canvas: null, fps: () => fps, qualityName: () => QUALITY[qLevel] ? QUALITY[qLevel].name : '',
  async init(progress) {
    glCanvas = R3D.canvas = document.getElementById('gl');
    progress(0.05, 'Starting the 3D engine');
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 400);
    scene = new THREE.Scene();
    Object.assign(GEO, {
      sphere: new THREE.SphereGeometry(1, 26, 18), sphereLo: new THREE.SphereGeometry(1, 10, 8), cyl: new THREE.CylinderGeometry(1, 1, 1, 16, 1),
      cone: new THREE.ConeGeometry(1, 1, 14), box: new THREE.BoxGeometry(1, 1, 1), ico: new THREE.IcosahedronGeometry(1, 1), disc: new THREE.CircleGeometry(1, 32),
      capsule: new THREE.CapsuleGeometry(1, 1, 6, 12), beam: new THREE.CylinderGeometry(1.6, 0.15, 1, 24, 1, true), // narrow end at the light
      // the face photo wraps the front of the head
      face: new THREE.SphereGeometry(1.012, 32, 24, Math.PI - Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.1, Math.PI * 0.78),
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
    rig = makeRig(scene); fx3 = makeFX(scene);
    progress(0.15, 'Waiting for faces and art');
    await Promise.all([...CHARS.map(c => c.img), CROWD_IMG.model, CROWD_IMG.hoodie, CROWD_IMG.creature, VERSE_IMG].map(i => i.decode ? i.decode().catch(() => {}) : null));
    const builders = [['BP / Verity Club', buildClub], ['The Garden', buildGarden], ['Rooftop', buildRoof], ['BP Verse', buildVerse]];
    for (let i = 0; i < builders.length; i++) {
      progress(0.2 + i * 0.15, 'Building stage: ' + builders[i][0]);
      await nextFrame();
      const st = builders[i][1](); st.group.visible = false; scene.add(st.group); stages.push(st);
    }
    buildSelect();
    applyQuality(gfx.quality);
    addEventListener('resize', resize);
    // warm up: compile shaders for every stage + a pair of fighters so the first fight doesn't stutter
    progress(0.82, 'Compiling shaders');
    await nextFrame();
    const dummies = [makeFighter(0, 0, 0), makeFighter(3, 1, 1)];
    dummies.forEach((f, i) => { f.hp = f.maxHp; syncModel(i, f, scene, models, 1); });
    for (let i = 0; i < stages.length; i++) { stages.forEach((s, j) => { s.group.visible = j === i; }); stages[i].setup(); renderer.compile(scene, camera); await nextFrame(); progress(0.84 + i * 0.03, 'Compiling shaders'); }
    stages.forEach(s => { s.group.visible = false; });
    // keep the warm-up pair (hidden) so their compiled shader programs stay cached
    R3D._warm = models.slice(); R3D._warm.forEach(m => { m.root.visible = false; m.shadowBlob.visible = false; }); models[0] = models[1] = null;
    progress(1, 'Ready');
    R3D.ready = true;
  },
  setQuality(l) { if (renderer) applyQuality(l); },
  show(on) { if (glCanvas) glCanvas.style.visibility = on ? 'visible' : 'hidden'; },
  invert(on) { if (glCanvas) glCanvas.style.filter = on ? 'invert(1)' : ''; },
  render(sc, cm) { if (composer && sc === scene) { renderPass.scene = sc; renderPass.camera = cm; composer.render(); } else renderer.render(sc, cm); },
  renderFight() {
    if (!R3D.ready || !P.length) return;
    const st = stages[stageId] || stages[0];
    if (R3D._stage !== stageId) { stages.forEach((s, j) => { s.group.visible = j === stageId; }); st.setup(); R3D._stage = stageId; cam3.dist = 0; }
    const t = frame / 60;
    st.update(t);
    P.forEach((f, i) => syncModel(i, f, scene, models, 1));
    updateFX();
    updateCamera3D();
    // super cinematics: drop the world lights, light the fighter in their colour
    const b = rig.base, dim = cine ? (cine.kind === 'act' ? 0.35 : 0.6) : 1;
    rig.hemi.intensity = b.hemi * dim; rig.key.intensity = b.key * (cine ? 0.7 : 1);
    if (cine && P[cine.side]) { const f = P[cine.side]; rig.cine.color.set(f.c.color); rig.cine.intensity = 30 + 20 * Math.sin(frame / 4); rig.cine.position.set(wx(f.x) + f.facing * 0.8, wy(f.y - f.h * 0.7), 1.5); }
    else rig.cine.intensity = 0;
    R3D.show(true);
    R3D.render(scene, camera);
    // head positions on the overlay (for status icons / tags)
    models.forEach((m, i) => { if (!m || !P[i]) return; m.head.getWorldPosition(_v); const a = R3D.project3(_v.x, _v.y, _v.z); _v.y += m.head.scale.y; const b2 = R3D.project3(_v.x, _v.y, _v.z); P[i]._head = { x: a[0], y: a[1], r: Math.max(8, a[1] - b2[1]) }; });
    // frame-rate watch: drop quality automatically if the machine struggles
    const now = performance.now(); fpsN++; if (now - fpsT > 1000) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
      if (gfx.auto && fps < 38 && qLevel > 0 && ++slowFrames >= 3) { slowFrames = 0; gfx.quality = qLevel - 1; applyQuality(gfx.quality); saveSettings(); toast = { msg: 'Graphics set to ' + QUALITY[qLevel].name + ' for smoother play', t: 200 }; }
      else if (fps >= 38) slowFrames = 0; }
  },
  renderSelect() {
    if (!R3D.ready) return;
    const slots = mode === 'gallery' ? [0] : [0, 1];
    [0, 1].forEach(s => {
      const on = slots.includes(s), d = dummyFor(s);
      d.x = WW / 2 + (s ? 360 : -360); d.y = FLOOR; d.facing = s ? -1 : 1;
      const m = syncModel(s, d, selScene, selModels, 1.35);
      m.root.visible = on; m.shadowBlob.visible = on;
      const c = CHARS[sel[s]], sp = selScene.userData.spots[s], pad = selScene.userData.pads[s];
      sp.color.set(c.color); sp.intensity = on ? 140 : 0; pad.material.color.set(c.color); pad.visible = on;
      if (d.flash > 0) d.flash--;
    });
    R3D.show(true);
    renderer.render(selScene, selCam);
  },
  // render a stage once and copy it into a 2D canvas (stage select thumbnails)
  stagePreview(i, target) {
    if (!R3D.ready) return false;
    stages.forEach((s, j) => { s.group.visible = j === i; }); stages[i].setup(); stages[i].update(frame / 60);
    models.forEach(m => { if (m) { m.root.visible = false; m.shadowBlob.visible = false; } });
    const saved = { x: camera.position.clone(), q: camera.quaternion.clone() };
    camera.position.set(0, 1.9, 9.2); camera.lookAt(0, 1.4, 0);
    R3D.render(scene, camera);
    target.getContext('2d').drawImage(glCanvas, 0, 0, target.width, target.height);
    camera.position.copy(saved.x); camera.quaternion.copy(saved.q);
    models.forEach(m => { if (m) { m.root.visible = true; m.shadowBlob.visible = true; } });
    R3D._stage = -1;
    return true;
  },
  // world (game pixels) -> overlay pixels
  project(x, y) { return R3D.project3(wx(x), wy(y), 0); },
  project3(X, Y, Z) { _w.set(X, Y, Z).project(camera); return [(_w.x + 1) / 2 * W, (1 - _w.y) / 2 * H]; },
};

window.LOAD = window.LOAD || {};
(async () => {
  LOAD.started = true;
  try {
    if (gfx.renderer === '2d') throw new Error('2D renderer chosen in settings');
    const test = document.createElement('canvas').getContext('webgl2');
    if (!test) throw new Error('WebGL2 not available');
    await R3D.init((p, msg) => { LOAD.p = p; LOAD.msg = msg; });
    LOAD.mode3d = true;
  } catch (e) { console.warn('3D renderer off:', e); LOAD.error = String(e.message || e); LOAD.mode3d = false; }
  LOAD.p = 1; LOAD.done = true;
})();
