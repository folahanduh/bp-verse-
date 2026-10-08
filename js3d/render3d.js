// BP VERSE 3D renderer (three.js). The fight logic in js/*.js stays the same (2D plane, like MK / Injustice);
// this module draws that state as a lit 3D world. The 2D canvas on top still draws the HUD and menus.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { loadHumans, Human, humansReady } from './human.js';
import { NEW_STAGES, buildStage3D } from './stages3d.js';

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
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c3 = new THREE.Color();
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
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 30px Impact, Oswald, "Arial Black", sans-serif'; g.fillText('KINGS', fx, 92);
      g.font = '900 86px Impact, Oswald, "Arial Black", sans-serif'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(L.jersey, fx, 160); g.fillText(L.jersey, fx, 160);
      g.font = '900 64px Impact, Oswald, "Arial Black", sans-serif'; g.fillText(L.jersey, w * 0.75, 140); g.fillRect(0, h - 14, w, 14);
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
    if (L.head) animalHead(this.head, L, M);
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
// cartoon fox / furry heads (built facing +x, unit size)
function animalHead(group, L, M) {
  const sph = GEO.sphere, furM = M(L.fur, { roughness: 0.95 }), liteM = M(L.furLight, { roughness: 0.9 });
  const dark = M('#120806', { roughness: 0.3 }), white = M('#ffffff', { roughness: 0.25 });
  const put = (mat, x, y, z, sx, sy, sz, geo = sph) => { const m = mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy ?? sx, sz ?? sx); group.add(m); return m; };
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
      const ear = put(L.ear ? M(L.ear, { roughness: 0.9 }) : furM, -0.1, 0.95, z * 1.25, 0.36, 0.85, 0.28, GEO.cone); ear.rotation.x = z > 0 ? -0.35 : 0.35;
      const inner = put(L.earIn ? M(L.earIn, { roughness: 0.9 }) : liteM, -0.02, 0.92, z * 1.25, 0.2, 0.6, 0.16, GEO.cone); inner.rotation.x = ear.rotation.x;
      if (L.ear) { const tuft = put(liteM, 0.0, 1.38, z * 1.42, 0.07, 0.16, 0.06, GEO.cone); tuft.rotation.x = ear.rotation.x * 1.4; } // little tufts on the ear tips
      if (L.ear) for (const wy of [-0.24, -0.32, -0.4]) { // whiskers
        const wk = put(dark, 1.05, wy, z * 0.95, 0.012, 0.42, 0.012, GEO.cyl); wk.rotation.set(z > 0 ? 1.25 : -1.25, 0, (wy + 0.32) * 1.6);
      }
    }
    put(M('#4a0a24'), 0.75, -0.48, 0, 0.18, 0.1, 0.24); put(M('#ff6fae'), 0.8, -0.52, 0, 0.1, 0.06, 0.14);
    for (const [x, z] of [[-0.1, 0], [0.1, 0.2], [0.1, -0.2]]) put(M('#ff8ad1'), x, 0.95, z, 0.22, 0.18, 0.22);
  }
}


function syncModel(slot, f, sc, list, scale3) {
  const furry = f.furT > 0 && f.c.id === 'blake';
  const key = f.ci + ':' + f.skin + ':' + (furry ? 1 : 0);
  let m = list[slot];
  if (!m || m.key !== key) { if (m) m.dispose(); m = list[slot] = humansReady() ? new Human(f) : new Model(f); sc.add(m.root); sc.add(m.shadowBlob); }
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
  rig.spots.forEach((l, i) => { const d = o.spots && o.spots[i]; l.intensity = d ? d[1] : 0; if (d) { l.color.set(d[0]); l.position.set(d[2], d[3], d[4]); if (d.length > 5) l.target.position.set(d[5], d[6], d[7]); } });
  rig.base = o;
  rig.bloomT = o.bloomT || 0.9; if (bloomPass) bloomPass.threshold = rig.bloomT;
  scene.environmentIntensity = o.env != null ? o.env : 0.35;
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
  const sign = textPlane('BP / VERITY CLUB', 8, 1.3, 'italic 900 130px Impact, Oswald, "Arial Black", sans-serif', '#ffd6ee', '#ff3fa4'); sign.position.set(0, 4.8, -7.4); g.add(sign);
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
    setup() { setRig({ sky: '#cfe6ff', ground: '#4c8c3f', hemi: 1.2, keyCol: '#fff1d6', key: 3.2, rimCol: '#ffd9a0', rim: 1.2, fog: [0xdcecff, 30, 140], bg: null, bloomT: 1.6,
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
  const graf = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#1a1420'; c.fillRect(0, 0, w, h); c.font = '900 80px Impact, Oswald, "Arial Black", sans-serif'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.textAlign = 'center'; c.fillText('BP', w / 2, 95); c.strokeStyle = '#d10f1f'; c.lineWidth = 6; c.beginPath(); c.moveTo(90, 30); c.lineTo(100, 8); c.lineTo(115, 26); c.lineTo(128, 6); c.lineTo(141, 26); c.lineTo(156, 8); c.lineTo(166, 30); c.stroke(); });
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
// a portable basketball hoop (rim on the -x side, toward the dunker; mirrored by scale.x)
function buildHoop() {
  const g = new THREE.Group(), steel = std(0x30333a, { roughness: 0.4, metalness: 0.8 }), white = std(0xf2f2f2, { roughness: 0.3 }), orange = std(0xff5a1f, { roughness: 0.35, metalness: 0.5 });
  const base = mesh(GEO.box, std(0x1a1c22, { roughness: 0.6 }), true, true); base.scale.set(0.9, 0.25, 0.7); base.position.set(0.6, 0.125, 0); g.add(base);
  const pole = mesh(GEO.cyl, steel); pole.scale.set(0.07, 2.95, 0.07); pole.position.set(0.6, 1.47, 0); g.add(pole);
  const arm = mesh(GEO.box, steel); arm.scale.set(0.6, 0.08, 0.08); arm.position.set(0.3, 2.85, 0); g.add(arm);
  const board = mesh(GEO.box, white); board.scale.set(0.04, 0.82, 1.1); board.position.set(0, 2.78, 0); g.add(board);
  for (const [y, h, z, w] of [[2.47, 0.025, 0, 0.42], [2.73, 0.025, 0, 0.42], [2.6, 0.27, -0.2, 0.025], [2.6, 0.27, 0.2, 0.025]]) { const sq = mesh(GEO.box, orange, false); sq.scale.set(0.01, h, w); sq.position.set(-0.025, y, z); g.add(sq); }
  const rim = mesh(new THREE.TorusGeometry(0.23, 0.014, 8, 32), orange); rim.rotation.x = Math.PI / 2; rim.position.set(-0.27, 2.45, 0); g.add(rim);
  const net = mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.42, 14, 4, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.7 }), false); net.position.set(-0.27, 2.24, 0); g.add(net);
  return g;
}
// ---------- breaking concrete: crack decals, rubble, debris with physics and dust ----------
let CR = null;
const rnd2 = (a, b) => a + Math.random() * (b - a);
function crackTextures() {
  const S = 512, hc = document.createElement('canvas'); hc.width = hc.height = S; const g = hc.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  const C = S / 2, rnd = srand(7);
  // a crushed centre, a raised broken rim, and jagged cracks running out of it
  let rg = g.createRadialGradient(C, C, 0, C, C, S * 0.22); rg.addColorStop(0, '#2a2a2a'); rg.addColorStop(0.75, '#606060'); rg.addColorStop(0.9, '#b0b0b0'); rg.addColorStop(1, '#808080'); g.fillStyle = rg; g.beginPath(); g.arc(C, C, S * 0.24, 0, 7); g.fill();
  for (let i = 0; i < 26; i++) { const a = rnd() * 7, r = S * (0.05 + rnd() * 0.16), w = 10 + rnd() * 26; g.fillStyle = rnd() < 0.5 ? '#9a9a9a' : '#5a5a5a'; g.beginPath(); for (let k = 0; k < 5; k++) { const b = a + (k / 5) * 1.2, rr = r + (rnd() - 0.5) * w; g.lineTo(C + Math.cos(b) * rr, C + Math.sin(b) * rr); } g.fill(); }
  g.lineCap = 'round';
  const crack = (x, y, a, len, w, depth) => { g.strokeStyle = '#141414'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    for (let s2 = 0; s2 < len; s2 += 9) { a += (rnd() - 0.5) * 0.7; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); if (depth < 2 && rnd() < 0.08) { g.stroke(); crack(x, y, a + (rnd() < 0.5 ? 0.8 : -0.8), len * 0.4, w * 0.6, depth + 1); g.beginPath(); g.moveTo(x, y); } }
    g.stroke(); };
  for (let i = 0; i < 16; i++) { const a = i / 16 * 7 + rnd() * 0.3; crack(C + Math.cos(a) * S * 0.08, C + Math.sin(a) * S * 0.08, a, S * (0.18 + rnd() * 0.3), 3 + rnd() * 4, 0); }
  // colour: dark in the cracks and the hole, dusty concrete elsewhere; alpha fades out at the edge
  const hd = g.getImageData(0, 0, S, S).data, ac = document.createElement('canvas'); ac.width = ac.height = S; const ag = ac.getContext('2d'), ad = ag.createImageData(S, S);
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const ng = nc.getContext('2d'), nd = ng.createImageData(S, S), h = (x, y) => hd[((Math.min(S - 1, Math.max(0, y))) * S + Math.min(S - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, v = h(x, y), d = Math.hypot(x - C, y - C) / C, crackD = v < 0.2;
    const shade = crackD ? 22 : 70 + v * 120; ad.data[i] = shade * 0.98; ad.data[i + 1] = shade * 0.95; ad.data[i + 2] = shade * 0.92;
    const edge = clamp((1 - d) / 0.25, 0, 1); ad.data[i + 3] = (crackD ? 255 : Math.abs(v - 0.5) > 0.06 ? 235 : 90) * edge * (d < 0.5 ? 1 : 0.85);
    const dx = (h(x + 1, y) - h(x - 1, y)) * 4, dy = (h(x, y + 1) - h(x, y - 1)) * 4, l = Math.hypot(dx, dy, 1);
    nd.data[i] = (-dx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
  }
  ag.putImageData(ad, 0, 0); ng.putImageData(nd, 0, 0);
  const map = new THREE.CanvasTexture(ac), nrm = new THREE.CanvasTexture(nc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = nrm.anisotropy = 4;
  return { map, nrm };
}
function initCraters() {
  const tex = crackTextures(), N = 220;
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0), chunkMat = std(0xffffff, { roughness: 0.95, flatShading: true });
  const chunks = new THREE.InstancedMesh(chunkGeo, chunkMat, N); chunks.castShadow = true; chunks.frustumCulled = false; chunks.count = 0; scene.add(chunks);
  const dustTex = radialTex('rgba(170,160,150,0.55)', 'rgba(170,160,150,0)');
  CR = { tex, chunks, N, data: [], seen: -1, decals: [], dust: Array.from({ length: 24 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return { s, life: 0 }; }), last: frame, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), sc: new THREE.Vector3(), c: new THREE.Color() };
}
function updateCraters(stage) {
  if (!CR) initCraters();
  const debrisCol = stage.debris || 0x8f8a84;
  CR.decals.forEach(d => { d.visible = true; });
  // match restarted: clear everything
  if (!craters.length && CR.decals.length) { CR.decals.forEach(d => d.removeFromParent()); CR.decals = []; CR.data = []; CR.seen = -1; }
  for (const c of craters) {
    if (c.id <= CR.seen) continue;
    CR.seen = c.id;
    const X = wx(c.x), r = 0.62 * c.s;
    if (c.body) {
      for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, sz = 0.02 + Math.random() * 0.06;
        CR.data.push({ p: new THREE.Vector3(X + (Math.random() - 0.5) * 0.4, 0.15 + Math.random() * 1.45, (Math.random() - 0.5) * 0.25), v: new THREE.Vector3(Math.cos(a) * rnd2(0.2, 1.6), rnd2(-0.5, 1.8), Math.sin(a) * rnd2(0.1, 0.8)),
          r: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3), w: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10), s: sz, rest: false, shade: 0.8 + Math.random() * 0.3, col: 0x9a968e }); }
      if (CR.data.length > CR.N) CR.data.splice(0, CR.data.length - CR.N);
      continue;
    }
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: CR.tex.map, normalMap: CR.tex.nrm, normalScale: new THREE.Vector2(2, 2), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4 }));
    dm.rotation.set(-Math.PI / 2, 0, c.id * 1.7); dm.position.set(X, 0.006 + CR.decals.length * 0.0005, 0); dm.scale.setScalar(r * 2.6); dm.receiveShadow = true; dm.renderOrder = 1; scene.add(dm); CR.decals.push(dm);
    if (CR.decals.length > 8) CR.decals.shift().removeFromParent();
    // rubble: chunks blasted up and out, plus a ring of heavier pieces left at the rim
    const n = Math.round(46 * c.s);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, out = 1 + Math.random() * 3.5 * c.s, rim = i < n * 0.3;
      const sz = (rim ? 0.03 + Math.random() * 0.05 : 0.012 + Math.random() * 0.035) * (0.8 + c.s * 0.25);
      CR.data.push({ p: new THREE.Vector3(X + Math.cos(a) * r * (rim ? 0.8 : 0.2), sz, Math.sin(a) * r * (rim ? 0.6 : 0.2)), v: rim ? new THREE.Vector3(Math.cos(a) * 0.4, 0.6 + Math.random(), Math.sin(a) * 0.3) : new THREE.Vector3(Math.cos(a) * out, 2.5 + Math.random() * 5 * c.s, Math.sin(a) * out * 0.7),
        r: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3), w: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14), s: sz, rest: false, shade: 0.7 + Math.random() * 0.45 });
    }
    if (CR.data.length > CR.N) CR.data.splice(0, CR.data.length - CR.N);
    for (let i = 0; i < 6 + c.s * 4; i++) { const d = CR.dust.find(d => d.life <= 0) || CR.dust[i % CR.dust.length]; d.life = 1; d.y0 = 0; d.x = X + (Math.random() - 0.5) * r * 2; d.z = (Math.random() - 0.5) * r; d.v = 0.4 + Math.random() * 0.8; d.size = (0.6 + Math.random() * 0.8) * c.s; d.s.visible = true; }
  }
  const steps = clamp(frame - CR.last, 0, 4); CR.last = frame;
  for (let k = 0; k < steps; k++) for (const d of CR.data) {
    if (d.rest) continue;
    const dt = 1 / 60; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt); d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
    if (d.p.y < d.s) { d.p.y = d.s; d.v.y = -d.v.y * 0.28; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.55); if (Math.abs(d.v.y) < 0.3 && d.v.length() < 0.35) d.rest = true; }
  }
  CR.chunks.count = CR.data.length;
  CR.data.forEach((d, i) => { CR.q.setFromEuler(d.r); CR.sc.set(d.s * 1.3, d.flat ? d.s * 0.08 : d.s * 0.8, d.s); CR.m4.compose(d.p, CR.q, CR.sc); CR.chunks.setMatrixAt(i, CR.m4); CR.c.set(d.col || debrisCol).multiplyScalar(d.shade); CR.chunks.setColorAt(i, CR.c); });
  CR.chunks.instanceMatrix.needsUpdate = true; if (CR.chunks.instanceColor) CR.chunks.instanceColor.needsUpdate = true;
  for (const d of CR.dust) { if (d.life <= 0) { d.s.visible = false; continue; } d.life -= 0.006 * steps; const k = 1 - d.life; d.s.position.set(d.x, (d.y0 || 0) + 0.2 + k * d.v, d.z); d.s.scale.setScalar(d.size * (0.6 + k * 1.6)); d.s.material.opacity = Math.max(0, d.life) * 0.7; }
}

// ---------- finisher worlds: Frank's arena, the portal into it, Julian's flood ----------
function buildArena() {
  const g = new THREE.Group();
  const wood = canvasTex(1024, 512, (c, w, h) => {
    for (let i = 0; i < 64; i++) { const y = i * h / 64; c.fillStyle = ['#c98a4a', '#d29652', '#bd7f42', '#cf9150'][i % 4]; c.fillRect(0, y, w, h / 64 + 1); for (let j = 0; j < 6; j++) { c.fillStyle = 'rgba(60,30,10,0.25)'; c.fillRect(((i * 97 + j * 211) % 1024), y, 2, h / 64); } }
    c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.strokeRect(20, 20, w - 40, h - 40); c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 20); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, 70, 0, 7); c.stroke(); c.fillStyle = '#552583'; c.beginPath(); c.arc(w / 2, h / 2, 64, 0, 7); c.fill();
    c.fillStyle = '#fdb927'; c.font = '900 60px Impact, Oswald, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BP', w / 2, h / 2 + 3);
    for (const sx of [0, 1]) { const x0 = sx ? w - 20 : 20, dx = sx ? -1 : 1; c.fillStyle = 'rgba(85,37,131,0.85)'; c.fillRect(Math.min(x0, x0 + dx * 190), h / 2 - 60, 190, 120); c.strokeRect(Math.min(x0, x0 + dx * 190), h / 2 - 60, 190, 120);
      c.beginPath(); c.arc(x0 + dx * 190, h / 2, 60, -Math.PI / 2, Math.PI / 2, sx === 1); c.stroke(); c.beginPath(); c.arc(x0, h / 2, 230, -1.2, 1.2, false); if (sx) { c.beginPath(); c.arc(x0, h / 2, 230, Math.PI - 1.2, Math.PI + 1.2); } c.stroke(); }
  });
  const floor = mesh(new THREE.PlaneGeometry(30, 15), std(0xffffff, { map: wood, roughness: 0.2, metalness: 0.02 }), false, true); floor.rotation.x = -Math.PI / 2; floor.position.z = -3.5; g.add(floor);
  const apron = mesh(new THREE.PlaneGeometry(80, 40), std(0x1a1418, { roughness: 0.6 }), false, true); apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.01, -6); g.add(apron);
  // the stands: tiers rising behind the court, packed with fans in gold, purple and white
  const tierM = std(0x221a2c, { roughness: 0.8 });
  for (let r = 0; r < 11; r++) { const tier = mesh(GEO.box, tierM); tier.scale.set(68, 0.55 + r * 0.55, 1.1); tier.position.set(0, (0.55 + r * 0.55) / 2, -11.2 - r * 1.05); g.add(tier); }
  const N = 990, bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.21, 0.6, 6), std(0xffffff, { roughness: 0.8 }), N), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), std(0xffffff, { roughness: 0.6 }), N);
  const seats = [], kit = ['#fdb927', '#552583', '#ffffff', '#fdb927', '#552583', '#e01b2b', '#111111'], skins = ['#f1c7a8', '#d8a588', '#a8714f', '#6b4030', '#e8b892'], cc = new THREE.Color();
  for (let i = 0; i < N; i++) { const r = i % 11, cx = Math.floor(i / 11); seats.push({ x: -31 + cx * 0.69 + (Math.random() - 0.5) * 0.2, y: 0.55 + r * 0.55 + 0.32, z: -11.2 - r * 1.05 + (Math.random() - 0.5) * 0.2, ph: Math.random() * 7, sp: 5 + Math.random() * 5 });
    bodies.setColorAt(i, cc.set(kit[(Math.random() * kit.length) | 0])); heads.setColorAt(i, cc.set(skins[(Math.random() * skins.length) | 0])); }
  g.add(bodies, heads);
  // a jumbotron over the court and banks of lights
  const scr = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#0a0612'; c.fillRect(0, 0, w, h); c.fillStyle = '#fdb927'; c.font = '900 120px Impact, Oswald, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SLAM CITY', w / 2, h / 2); });
  const jt = mesh(GEO.box, std(0x111118, { roughness: 0.4, metalness: 0.5 })); jt.scale.set(6, 2, 2); jt.position.set(0, 9.5, -6); g.add(jt);
  for (const zz of [1.01, -1.01]) { const sc2 = mesh(new THREE.PlaneGeometry(5.6, 1.6), basic(0xffffff, { map: scr }), false); sc2.position.set(0, 9.5, -6 + zz); if (zz < 0) sc2.rotation.y = Math.PI; g.add(sc2); }
  for (let i = -3; i <= 3; i++) { const lamp = mesh(GEO.box, basic('#fff6e0')); lamp.scale.set(1.6, 0.12, 0.6); lamp.position.set(i * 5, 13, -5); g.add(lamp); }
  const back = mesh(new THREE.PlaneGeometry(90, 30), std(0x0c0a12, { roughness: 1 }), false); back.position.set(0, 12, -24); g.add(back);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const update = (t, cheer) => { seats.forEach((s, i) => { const b = Math.abs(Math.sin(t * s.sp + s.ph)) * (0.05 + 0.18 * cheer);
    p.set(s.x, s.y + b, s.z); m4.compose(p, q, sc); bodies.setMatrixAt(i, m4); p.y += 0.42; m4.compose(p, q, sc); heads.setMatrixAt(i, m4); });
    bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; };
  update(0, 0); bodies.instanceColor.needsUpdate = true; heads.instanceColor.needsUpdate = true;
  const setup = () => setRig({ sky: '#d8dcff', ground: '#3a2a18', hemi: 0.6, keyCol: '#fff4e0', key: 1.7, rimCol: '#ffd9a0', rim: 1.3, fog: [0x0a0810, 30, 95], bg: 0x07060c, env: 0.3, bloomT: 1.1,
    points: [['#ffd27a', 0, 8, -1, 26], ['#8aa8ff', -9, 6, -6, 16], ['#ffa060', 9, 6, -6, 16]], spots: [['#ffffff', 60, 0, 13, 3, 0, 0, -1], ['#fdb927', 30, -8, 11, 2, -3, 0, -2], ['#b48cff', 30, 8, 11, 2, 3, 0, -2]] });
  return { group: g, update, setup };
}
function buildPortal() {
  const g = new THREE.Group();
  const swirl = canvasTex(512, 512, (c, w, h) => { const C = w / 2; const rg = c.createRadialGradient(C, C, 10, C, C, C); rg.addColorStop(0, 'rgba(255,240,200,1)'); rg.addColorStop(0.35, 'rgba(180,77,255,0.9)'); rg.addColorStop(0.8, 'rgba(60,20,140,0.6)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,220,140,0.75)'; c.lineWidth = 6; for (let a = 0; a < 5; a++) { c.beginPath(); for (let s2 = 0; s2 < 60; s2++) { const r = s2 * 4, an = a * 1.256 + s2 * 0.12; c.lineTo(C + Math.cos(an) * r, C + Math.sin(an) * r); } c.stroke(); } });
  const disc = mesh(new THREE.CircleGeometry(1, 48), basic(0xffffff, { map: swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false);
  const ring = mesh(new THREE.TorusGeometry(1, 0.07, 10, 64), basic('#ffd27a'), false);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3.glowTex, color: 0xb44dff, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(4.5);
  g.add(glow, disc, ring); g.userData = { disc }; return g;
}
function buildFlood() {
  const geo = new THREE.PlaneGeometry(44, 18, 88, 36); geo.rotateX(-Math.PI / 2);
  const m = mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1f6fbf, transparent: true, opacity: 0.72, roughness: 0.05, metalness: 0.15, emissive: 0x0a2a55, emissiveIntensity: 0.55, depthWrite: false }), false);
  m.position.z = -3; m.userData.base = geo.attributes.position.array.slice(); m.renderOrder = 3; return m;
}

// ---------- background slams: a cracked wall or a shattered window where a thrown fighter hit ----------
let BGM = null;
function glassTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), C = S / 2, rnd = srand(11);
  g.clearRect(0, 0, S, S); g.lineCap = 'round';
  const spokes = 14, ends = [];
  for (let i = 0; i < spokes; i++) { // radial cracks
    let a = i / spokes * Math.PI * 2 + rnd() * 0.3, x = C, y = C, pts = [[x, y]]; const len = S * (0.3 + rnd() * 0.2);
    for (let d = 0; d < len; d += 14) { a += (rnd() - 0.5) * 0.25; x += Math.cos(a) * 14; y += Math.sin(a) * 14; pts.push([x, y]); }
    ends.push(pts); g.strokeStyle = 'rgba(235,245,255,0.95)'; g.lineWidth = 2.2; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
  }
  for (const r of [0.08, 0.16, 0.26, 0.36]) { // concentric rings joining the spokes
    g.strokeStyle = 'rgba(225,238,255,0.8)'; g.lineWidth = 1.6; g.beginPath();
    ends.forEach((pts, i) => { const p = pts[Math.min(pts.length - 1, Math.round(pts.length * r / 0.45))]; if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke();
  }
  const hole = g.createRadialGradient(C, C, 0, C, C, S * 0.09); hole.addColorStop(0, 'rgba(0,0,0,0.85)'); hole.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hole; g.beginPath(); g.arc(C, C, S * 0.1, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BG_DEBRIS = { concrete: 0x9a968e, marble: 0xe8e4dc, tile: 0xe9ebe8, brick: 0x9a3f2c, metal: 0x8a8f96, stone: 0x8e8a84, glass: 0xdff4ff };
function updateBgMarks(stage) {
  if (!CR) initCraters();
  if (!BGM) BGM = { decals: [], seen: -1, glass: glassTexture(), rc: new THREE.Raycaster() };
  if (!bgMarks.length && BGM.decals.length) { BGM.decals.forEach(d => d.removeFromParent()); BGM.decals = []; BGM.seen = -1; }
  BGM.decals.forEach(d => { d.visible = true; });
  for (const m of bgMarks) {
    if (m.id <= BGM.seen) continue;
    BGM.seen = m.id;
    // find the real surface behind the impact point (fall back to the table's depth)
    const X = wx(m.x), Y = wy(m.y); let Z = m.z * U;
    const list = []; stage.group.traverse(o => { if (o.isMesh && o.visible !== false && !(o.material && o.material.transparent && o.material.opacity < 0.2)) list.push(o); });
    BGM.rc.set(new THREE.Vector3(X, Y, Z + 2.5), new THREE.Vector3(0, 0, -1)); BGM.rc.far = 6;
    const hit = BGM.rc.intersectObjects(list, false)[0]; if (hit) Z = hit.point.z;
    const glass = m.kind === 'glass';
    const mat = glass ? new THREE.MeshBasicMaterial({ map: BGM.glass, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
      : new THREE.MeshStandardMaterial({ map: CR.tex.map, normalMap: CR.tex.nrm, normalScale: new THREE.Vector2(2.2, 2.2), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4 });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); dm.position.set(X, Y, Z + 0.03); dm.rotation.z = m.id * 1.3; dm.scale.setScalar(glass ? 2.4 : 2.0); dm.renderOrder = 2; scene.add(dm); BGM.decals.push(dm);
    if (BGM.decals.length > 6) BGM.decals.shift().removeFromParent();
    // rubble or glass shards blasted out of the wall, falling to the floor
    const col = BG_DEBRIS[m.kind] || 0x9a968e, n = glass ? 60 : 44;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sz = glass ? 0.02 + Math.random() * 0.05 : 0.02 + Math.random() * 0.06;
      CR.data.push({ p: new THREE.Vector3(X + Math.cos(a) * 0.3, Y + Math.sin(a) * 0.3, Z + 0.1), v: new THREE.Vector3(Math.cos(a) * rnd2(0.3, 2.0), rnd2(-0.5, 2.5), rnd2(0.6, 2.6)),
        r: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3), w: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12), s: sz, rest: false, shade: 0.85 + Math.random() * 0.3, col, flat: glass }); }
    if (CR.data.length > CR.N) CR.data.splice(0, CR.data.length - CR.N);
    for (let i = 0; i < 8; i++) { const d = CR.dust.find(d => d.life <= 0) || CR.dust[i % CR.dust.length]; d.life = 1; d.x = X + (Math.random() - 0.5) * 1.2; d.z = Z + 0.3; d.v = 0.3 + Math.random() * 0.6; d.size = 0.9 + Math.random() * 0.8; d.y0 = Y - 0.8; d.s.visible = true; }
  }
}

// ---------- stage items (models for what sits on the stage, what's in a fighter's hands, and what's thrown) ----------
const PROP_MATS = {};
function propMat(k, make) { return PROP_MATS[k] || (PROP_MATS[k] = make()); }
function brickTex() { return canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#5b2a20'; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) { g.fillStyle = ['#9a3f2c', '#8a3626', '#a84a33'][(r + c + 9) % 3]; g.fillRect(c * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26); } }, { repeat: [3, 1.5] }); }
function propMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'brick') { const m = mesh(GEO.box, propMat('brick', () => std(0x9a3f2c, { roughness: 0.92 }))); m.scale.set(0.22, 0.075, 0.105); g.add(m); }
  else if (kind === 'bottle') {
    const gl = propMat('glass', () => std(0x2f8f4e, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x0a2a14 }));
    const b = mesh(GEO.cyl, gl); b.scale.set(0.035, 0.17, 0.035); g.add(b); const n = mesh(GEO.cyl, gl); n.scale.set(0.014, 0.08, 0.014); n.position.y = 0.12; g.add(n);
  } else if (kind === 'speaker') {
    const b = mesh(GEO.box, propMat('spk', () => std(0x141418, { roughness: 0.55 }))); b.scale.set(0.3, 0.42, 0.26); g.add(b);
    for (const [y, r] of [[-0.06, 0.1], [0.13, 0.05]]) { const c = mesh(GEO.cyl, propMat('cone', () => std(0x2a2a30, { roughness: 0.4, metalness: 0.3 }))); c.rotation.x = Math.PI / 2; c.position.set(0, y, 0.135); c.scale.set(r, 0.02, r); g.add(c); }
  } else if (kind === 'pipe') { const m = mesh(GEO.cyl, propMat('pipe', () => std(0x8a8f99, { roughness: 0.35, metalness: 0.85 }))); m.rotation.z = Math.PI / 2; m.scale.set(0.03, 0.7, 0.03); g.add(m); }
  else if (kind === 'vent') { const m = mesh(GEO.box, propMat('vent', () => std(0x9aa0aa, { roughness: 0.4, metalness: 0.8 }))); m.scale.set(0.45, 0.035, 0.34); m.rotation.x = Math.PI / 2; g.add(m); }
  else if (kind === 'can') {
    const mt = propMat('can', () => std(0x6c7480, { roughness: 0.45, metalness: 0.7 }));
    const b = mesh(GEO.cyl, mt); b.scale.set(0.16, 0.42, 0.16); g.add(b); const l = mesh(GEO.cyl, mt); l.scale.set(0.175, 0.03, 0.175); l.position.y = 0.22; g.add(l);
  } else if (kind === 'vase') {
    const pts = [[0.0, -0.25], [0.11, -0.25], [0.16, -0.12], [0.17, 0.02], [0.1, 0.16], [0.07, 0.22], [0.09, 0.26]].map(([x, y]) => new THREE.Vector2(x, y));
    const tex = propMat('vaseTex', () => canvasTex(256, 128, (q, w, h) => { q.fillStyle = '#f4f2ee'; q.fillRect(0, 0, w, h); q.strokeStyle = '#1f4fa8'; q.lineWidth = 4; for (let i = 0; i < 8; i++) { q.beginPath(); q.arc(i * 32 + 16, h / 2, 12, 0, 7); q.stroke(); } q.fillStyle = '#1f4fa8'; q.fillRect(0, 10, w, 6); q.fillRect(0, h - 16, w, 6); }));
    g.add(mesh(new THREE.LatheGeometry(pts, 24), propMat('vase', () => std(0xffffff, { map: tex, roughness: 0.15, metalness: 0.05 }))));
  } else if (kind === 'extinguisher') {
    const r = mesh(GEO.cyl, propMat('ext', () => std(0xc8102e, { roughness: 0.3, metalness: 0.3 }))); r.scale.set(0.09, 0.5, 0.09); g.add(r);
    const top = mesh(GEO.cyl, propMat('steel', () => std(0x30333a, { roughness: 0.3, metalness: 0.9 }))); top.scale.set(0.04, 0.1, 0.04); top.position.y = 0.3; g.add(top);
  } else if (kind === 'dumbbell') {
    const st = propMat('steel', () => std(0x30333a, { roughness: 0.3, metalness: 0.9 })), bar = mesh(GEO.cyl, st); bar.rotation.z = Math.PI / 2; bar.scale.set(0.02, 0.45, 0.02); g.add(bar);
    for (const s2 of [-1, 1]) { const pl = mesh(GEO.cyl, propMat('plate', () => std(0x141418, { roughness: 0.5, metalness: 0.4 }))); pl.rotation.z = Math.PI / 2; pl.scale.set(0.1, 0.07, 0.1); pl.position.x = s2 * 0.17; g.add(pl); }
  } else if (kind === 'stool') {
    const wd = propMat('stoolW', () => std(0x6a4a2a, { roughness: 0.7 })), seat = mesh(GEO.cyl, wd); seat.scale.set(0.2, 0.05, 0.2); seat.position.y = 0.32; g.add(seat);
    for (let i = 0; i < 3; i++) { const lg = mesh(GEO.cyl, wd); lg.scale.set(0.02, 0.62, 0.02); const a = i / 3 * Math.PI * 2; lg.position.set(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13); lg.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); g.add(lg); }
  } else if (kind === 'tire') { const t2 = mesh(new THREE.TorusGeometry(0.26, 0.11, 10, 24), propMat('tyre', () => std(0x141414, { roughness: 0.9 }))); g.add(t2); }
  else if (kind === 'cooler') {
    const b = mesh(GEO.box, propMat('cool', () => std(0x2a6ac8, { roughness: 0.4 }))); b.scale.set(0.5, 0.32, 0.32); g.add(b);
    const l = mesh(GEO.box, propMat('lid', () => std(0xf2f2f2, { roughness: 0.4 }))); l.scale.set(0.52, 0.07, 0.34); l.position.y = 0.19; g.add(l);
  } else if (kind === 'lantern') { const b = mesh(GEO.box, propMat('lant', () => std(0xffcc7a, { emissive: 0xff9a30, emissiveIntensity: 1.3, roughness: 0.6 }))); b.scale.set(0.24, 0.34, 0.24); g.add(b); const c2 = mesh(GEO.box, propMat('lantT', () => std(0x2a1a10))); c2.scale.set(0.3, 0.05, 0.3); c2.position.y = 0.19; g.add(c2); }
  else if (kind === 'cone') {
    const c2 = mesh(GEO.cone, propMat('tcone', () => std(0xff5a10, { roughness: 0.5 }))); c2.scale.set(0.15, 0.5, 0.15); g.add(c2);
    const band = mesh(GEO.cyl, propMat('band', () => std(0xf2f2f2, { roughness: 0.4 }))); band.scale.set(0.095, 0.07, 0.095); band.position.y = 0.04; g.add(band);
    const bs = mesh(GEO.box, propMat('tcone', () => std(0xff5a10))); bs.scale.set(0.34, 0.03, 0.34); bs.position.y = -0.24; g.add(bs);
  } else { const m = mesh(new THREE.SphereGeometry(0.12, 18, 12), propMat('bball', () => std(0xffffff, { map: fx3.ballTex, roughness: 0.6 }))); g.add(m); }
  return g;
}
const PROP_LIFT = { vase: 0.25, extinguisher: 0.25, dumbbell: 0.1, stool: 0.31, tire: 0.37, cooler: 0.16, lantern: 0.17, cone: 0.25 };
// each stage's items, standing just behind the fight line
function buildStageProps(stageIdx) {
  const defs = PROPS[STAGES[stageIdx].id] || [], g = new THREE.Group(), items = [];
  defs.forEach(([x, kind]) => {
    const base = new THREE.Group(); base.position.set(wx(x), 0, -0.85); g.add(base);
    let top = 0;
    if (kind === 'brick') { const wall = mesh(GEO.box, propMat('wall', () => std(0xffffff, { map: brickTex(), roughness: 0.95 })), true, true); wall.scale.set(1.2, 0.55, 0.3); wall.position.y = 0.275; base.add(wall); top = 0.59; }
    else if (kind === 'bottle') { const st = mesh(GEO.cyl, propMat('stool', () => std(0x1c1c22, { roughness: 0.4, metalness: 0.6 })), true, true); st.scale.set(0.2, 0.62, 0.2); st.position.y = 0.31; base.add(st); top = 0.79; }
    else if (kind === 'pipe') { const cr = mesh(GEO.box, propMat('crate', () => std(0x6a4a2a, { roughness: 0.9 })), true, true); cr.scale.set(0.6, 0.5, 0.5); cr.position.y = 0.25; base.add(cr); top = 0.53; }
    else if (kind === 'vent') { const ac = mesh(GEO.box, propMat('acbox', () => std(0x50505a, { roughness: 0.6, metalness: 0.4 })), true, true); ac.scale.set(0.8, 0.7, 0.55); ac.position.y = 0.35; base.add(ac); top = 0.88; }
    else if (kind === 'hoopball') { const rk = mesh(GEO.box, propMat('rack', () => std(0x2a2a30, { roughness: 0.5, metalness: 0.6 })), true, true); rk.scale.set(0.5, 0.5, 0.3); rk.position.y = 0.25; base.add(rk); top = 0.62; }
    else if (kind === 'speaker') top = 0.21; else if (kind === 'can') top = 0.21;
    else if (kind === 'vase') { const pd = mesh(GEO.box, propMat('ped', () => std(0xd8d2c6, { roughness: 0.6 })), true, true); pd.scale.set(0.5, 0.9, 0.5); pd.position.y = 0.45; base.add(pd); top = 0.9 + PROP_LIFT.vase; }
    else if (kind === 'lantern') { const pd = mesh(GEO.box, propMat('lpost', () => std(0x8a8e96, { roughness: 0.9 })), true, true); pd.scale.set(0.35, 0.7, 0.35); pd.position.y = 0.35; base.add(pd); top = 0.7 + PROP_LIFT.lantern; }
    else if (PROP_LIFT[kind]) top = PROP_LIFT[kind];
    const item = propMesh(kind); item.position.y = top + (kind === 'bottle' ? 0.17 : kind === 'brick' ? 0.04 : 0); if (kind === 'vent') item.position.z = 0.3;
    if (kind === 'brick') item.rotation.y = 0.25;
    base.add(item); items.push({ item, x, kind });
  });
  g.visible = false; scene.add(g);
  return { group: g, items };
}
function projMesh(kind) {
  if (kind === 'stare') { // the Mog Stare: the word MOGGED flies at them, with a streak of light behind it
    const grp = new THREE.Group();
    const tex = canvasTex(1024, 256, (g, w, h) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 900 176px Impact, Oswald, "Arial Black", sans-serif';
      g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = '#03101c'; g.strokeText('MOGGED', w / 2, h / 2 + 6);
      g.shadowColor = '#5ad1ff'; g.shadowBlur = 34; const gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9fe6ff');
      g.fillStyle = gr; g.fillText('MOGGED', w / 2, h / 2 + 6); g.shadowBlur = 0; g.fillText('MOGGED', w / 2, h / 2 + 6);
    });
    const txt = mesh(new THREE.PlaneGeometry(12.6, 3.15), basic(0xffffff, { map: tex, transparent: true, depthWrite: false }), false); txt.renderOrder = 3; grp.add(txt);
    const trail = mesh(GEO.sphere, basic('#5ad1ff', { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), false); trail.scale.set(6, 0.45, 0.3); grp.add(trail);
    const glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3.glowTex, color: 0x5ad1ff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 })); glow2.scale.set(12, 4, 1); grp.add(glow2);
    grp.userData = { txt, trail };
    return grp;
  }
  if (kind === 'ball') return mesh(new THREE.SphereGeometry(1, 20, 14), std(0xffffff, { map: fx3.ballTex, roughness: 0.6 }));
  const grp = new THREE.Group();
  if (kind === 'wave') {
    // a breaking wave: a curled profile extruded across the stage, dark at the base and light at the crest, with a foam lip
    const sh = new THREE.Shape(); sh.moveTo(-1.3, -0.82);
    sh.quadraticCurveTo(-0.6, -0.2, 0.1, 0.45); sh.quadraticCurveTo(0.55, 0.52, 0.66, 0.2);
    sh.quadraticCurveTo(0.72, 0.0, 0.36, 0.06); sh.quadraticCurveTo(0.14, -0.5, 0.62, -0.82); sh.lineTo(-1.3, -0.82);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.6, curveSegments: 18, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07, bevelSegments: 3 });
    geo.translate(0, 0, -0.8);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), lo = new THREE.Color('#0a3a86'), hi = new THREE.Color('#8fd2ff'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { c.copy(lo).lerp(hi, clamp((pos.getY(i) + 0.82) / 1.3, 0, 1) ** 1.6); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.86, emissive: '#0b3470', emissiveIntensity: 0.7, depthWrite: false }));
    grp.add(water);
    const lip = [], N = 9; for (let i = 0; i < N; i++) { const z = -0.85 + 1.7 * i / (N - 1); lip.push(new THREE.Vector3(0.6 + Math.sin(i * 1.7) * 0.04, 0.24 + Math.cos(i * 2.3) * 0.04, z)); }
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lip), 24, 0.075, 6), basic('#f2faff', { transparent: true, opacity: 0.92 })));
    const crest = []; for (let i = 0; i < N; i++) { const z = -0.85 + 1.7 * i / (N - 1); crest.push(new THREE.Vector3(0.12 + Math.cos(i * 1.3) * 0.05, 0.47, z)); }
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crest), 24, 0.05, 6), basic('#dff1ff', { transparent: true, opacity: 0.7 })));
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
  // projectiles (thrown stage items use a model of that item)
  const used = {};
  for (const pr of projs) {
    const key = pr.kind === 'prop' ? 'prop:' + pr.obj : pr.kind, pool = fx3.proj[key] || (fx3.proj[key] = []);
    used[key] = used[key] || 0;
    let m = pool[used[key]]; if (!m) { m = pr.kind === 'prop' ? propMesh(pr.obj) : projMesh(pr.kind); scene.add(m); pool.push(m); }
    used[key]++; m.visible = true;
    const d = Math.sign(pr.vx) || 1, rr = pr.r * U;
    m.position.set(wx(pr.x), wy(pr.y), 0.15);
    if (pr.kind === 'prop') { m.rotation.set(0, 0, -pr.t * 0.32 * d); }
    else if (pr.kind === 'ball') { m.scale.setScalar(rr); m.rotation.z = -pr.t * 0.2 * d; }
    else if (pr.kind === 'stare') { m.scale.setScalar(rr); m.rotation.y = 0; m.userData.trail.position.x = -d * 8; m.userData.txt.rotation.z = Math.sin(pr.t * 0.35) * 0.05; m.userData.txt.scale.setScalar(Math.min(1, 0.55 + pr.t * 0.08)); } // the word always reads left to right
    else if (pr.kind === 'wave') { m.scale.setScalar(rr * 1.1); m.rotation.y = d > 0 ? 0 : Math.PI; }
    else { m.scale.setScalar(rr * 0.9); m.rotation.set(pr.t * 0.2, pr.t * 0.25, 0); }
  }
  for (const k in fx3.proj) fx3.proj[k].forEach((m, i) => { if (i >= (used[k] || 0)) m.visible = false; });
  // Ryan's hypno field
  const big = P.find(f => f.big > 0);
  fx3.hypno.visible = !!big;
  if (big) { fx3.hypno.position.set(wx(big.x), 0.02, 0); fx3.hypno.scale.set(2.3, 0.6, 1); fx3.hypno.material.opacity = 0.3 + 0.12 * Math.sin(frame / 8); }
}

// ---------- camera: frames both fighters itself (no 2D clamping), zooms with their distance, follows jumps,
// punches in on heavy hits, leans into combos and cuts to close-ups for intros, supers and KOs ----------
const bodyFrame = f => {
  const h = (f.h * 0.85 + 28) * U * f.scale, down = f.kd >= 2 || (f.kd === 1 && f.bounced);
  return { x: wx(f.x) - (down ? f.facing * h * 0.45 : 0), y: wy(f.y), h, w: down ? h * 0.55 : 0.25 };
};
function updateCamera3D() {
  const [a, b] = P, A = bodyFrame(a), B = bodyFrame(b);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
  const tall = Math.max(A.h, B.h), air = Math.max(A.y, B.y);
  let tx = (A.x + B.x) / 2, ty = tall * 0.5 + air * 0.55, yaw = 0;
  let dist = clamp(Math.max((Math.abs(A.x - B.x) / 2 + 0.65 + Math.max(A.w, B.w)) / tanH, (tall * 0.62 + air * 0.7) / tanV), 3.1, 7.4);
  let rate = 0.08, follow = 0.14, snap = cam3.snap, lift = 0, tz = 0;
  if (!(introT > 125 && introLong())) cam3.phase = 0;
  if (cam3.match !== a) { cam3.match = a; snap = true; } // a new match: cut, don't pan
  const ko = P.find(f => f.ko);
  if (cine && cine.kind === 'fin' && P[cine.side]) {
    // finisher: frame both fighters (or just the winner once the loser is gone) and orbit slowly
    const w = P[cine.side], l = P[1 - cine.side], Wf = bodyFrame(w), Lf = bodyFrame(l), k = cine.t / cine.max;
    // everything in play: the winner, the loser (unless gone), and Julian's wave
    const xs = [Wf.x], tops = [Wf.y + Wf.h], wv = projs.find(p => p.fin);
    if (!l.gone) { xs.push(Lf.x); tops.push(Lf.y + Lf.h); }
    if (wv) { xs.push(wx(wv.x)); tops.push(wy(wv.y) + wv.r * U); }
    const x0 = Math.min(...xs), x1 = Math.max(...xs), top = Math.max(1.7, ...tops), span = x1 - x0;
    tx = (x0 + x1) / 2; ty = top * 0.54;
    dist = clamp(Math.max((span / 2 + 0.8) / tanH, (top * 0.68) / tanV) * 1.05, 2.8, 10);
    yaw = w.facing * lerp(0.7, -0.35, swing(k)) * clamp(2.4 / (span + 0.6), 0.3, 1); rate = 0.12; follow = 0.16; lift = 0.55;
    if (cine.hoop) { // the alley-oop: keep Frank, the opponent, Lejohn and the whole hoop in shot
      const xs = [Wf.x, Lf.x, wx(cine.hoop.x) + 0.5 * w.facing, wx(cine.hoop.x) - 0.4 * w.facing].concat(cine.mate && cine.t > 40 ? [wx(cine.mate.x)] : []);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), top = 3.3 * cine.hoop.rise + Math.max(Wf.y + Wf.h, 1.8) * (1 - cine.hoop.rise);
      tx = (x0 + x1) / 2; ty = top * 0.5; dist = clamp(Math.max(((x1 - x0) / 2 + 0.7) / tanH, (top * 0.56) / tanV) * 1.05, 3.2, 10);
      yaw = w.facing * lerp(0.45, -0.25, swing(k)); lift = 0.3;
    }
    if (cine.t <= 2) snap = true;
    if (cine.cam) { // the finisher is directing: cut to its shot
      const c = cine.cam; tx = wx(c.x); ty = wy(c.y); tz = (c.z || 0) * U; yaw = c.yaw; dist = c.dist; lift = c.lift || 0; cam3.fov = c.fov || 34; rate = 0.16; follow = 0.2;
      if (cine.shot !== cam3.finShot) { cam3.finShot = cine.shot; snap = true; }
    } else cam3.fov = 34;
  } else if (cine && P[cine.side]) {
    const f = P[cine.side], F = bodyFrame(f), k = cine.t / cine.max, dir = f.facing;
    if (cine.kind === 'act') { tx = F.x + dir * 0.2; ty = F.y + F.h * 0.7; yaw = dir * lerp(1.05, 0.3, ease(k)); dist = lerp(1.9, 3.4, ease(k)); }
    else { tx = wx(cine.x); ty = wy(cine.y); yaw = 0.7 * Math.sin(k * Math.PI * 2) * dir; dist = 3.0 + Math.sin(k * Math.PI) * 0.8; }
    rate = 0.12; follow = 0.25;
  } else if (P.some(f => f.bg)) {
    // a background slam: pull back and turn so the wall and the fight are both in shot
    const v = P.find(f => f.bg), o = P.find(f => f !== v), V = bodyFrame(v), O = bodyFrame(o), vz = (v.z || 0) * U;
    tx = lerp(O.x, V.x, 0.55); ty = 0.95 + Math.min(0.55, -vz * 0.06); tz = vz * 0.5; yaw = Math.sign(V.x - O.x || 1) * -0.32; dist = clamp(4.2 - vz * 0.55 + Math.abs(V.x - O.x) * 0.3, 4, 10); rate = 0.1; follow = 0.12;
  } else if (matchOver && winner >= 0) {
    const f = P[winner], F = bodyFrame(f), oc = outroClock(), sl = clamp(overT / OUT_SLOW, 0, 1); // a slow, low push-in during the slow motion, then a gentle orbit
    tx = F.x; ty = F.y + F.h * lerp(0.62, 0.72, sl); yaw = f.facing * (lerp(1.0, 0.6, ease(sl)) + 0.15 * Math.sin(oc / 80)); dist = lerp(3.4, 2.5, ease(sl)) + Math.min(1, oc / 200) * 0.3; lift = lerp(-0.6, 0, sl); rate = 0.05;
  } else if (ko && (slowmo > 0 || endT > 0)) {
    const K = bodyFrame(ko); tx = K.x - ko.facing * 0.4; ty = K.y + 0.45; dist = 3.0; yaw = -ko.facing * 0.55; rate = 0.05; follow = 0.1;
  } else if (introT > 125 && introLong()) {
    // the pre-fight intro, cut like a film (see INTRO_BEATS): a wide establishing shot; a low hero shot on each
    // fighter walking in; each one's signature shot while they speak; a low two-shot pushing in as they square up
    const AF = bodyFrame(a), BF = bodyFrame(b), mid = (AF.x + BF.x) / 2, B = introBeat() || INTRO_BEATS[INTRO_BEATS.length - 1];
    const phase = INTRO_BEATS.indexOf(B) + 1, k = clamp((B.from - introT) / (B.from - B.to), 0, 1);
    if (phase !== cam3.phase) { cam3.phase = phase; snap = true; }
    cam3.fov = 34;
    if (B.kind === 'est') { tx = mid; ty = 1.05; yaw = lerp(-0.85, -0.4, ease(k)); dist = lerp(8.6, 7.0, ease(k)); lift = -0.35; }
    else if (B.kind === 'hero') { // low and in front of them, looking up as they come
      const f = P[B.side], F = bodyFrame(f); tx = F.x + f.facing * 0.25; ty = F.y + F.h * 0.7; yaw = f.facing * lerp(0.95, 0.75, k); dist = lerp(3.8, 3.1, k); lift = -0.7; cam3.fov = 30;
    } else if (B.kind === 'line') {
      const f = P[B.side], o = P[1 - B.side], F = bodyFrame(f), O = bodyFrame(o), id = f.c.id, away = Math.sign(O.x - F.x) || 1;
      if (id === 'clav' && k < 0.72) { // extreme close-up on the jawline as he strokes it
        tx = F.x + f.facing * 0.04; ty = F.y + F.h * 0.9; yaw = f.facing * lerp(0.1, 0.22, k); dist = 0.95; lift = -0.35; cam3.fov = 19;
      } else if (id === 'darren' && k < 0.4) { // tight on the shades
        tx = F.x + f.facing * 0.05; ty = F.y + F.h * 0.92; yaw = f.facing * 0.7; dist = 1.25; lift = -0.2; cam3.fov = 18;
      } else if (id === 'frank' || id === 'ryan') { // from down low, looking up at them
        tx = F.x + f.facing * 0.2; ty = F.y + F.h * (id === 'ryan' ? 0.6 : 0.68); yaw = f.facing * lerp(0.7, 0.55, k); dist = id === 'ryan' ? 2.0 : 2.8; lift = -0.85; cam3.fov = 26;
      } else { // over the listener's shoulder on a long lens
        tx = lerp(F.x, O.x, 0.14); ty = F.y + F.h * 0.78; const cx = O.x + away * (1.22 - 0.1 * k), cz = 0.32;
        yaw = Math.atan2(cx - tx, cz); dist = Math.hypot(cx - tx, cz); lift = -0.23; cam3.fov = 17;
      }
      if (cam3.sub !== (id === 'clav' ? k < 0.72 : id === 'darren' ? k < 0.4 : 0)) { cam3.sub = id === 'clav' ? k < 0.72 : id === 'darren' ? k < 0.4 : 0; snap = true; }
    } else { tx = mid; ty = Math.max(AF.h, BF.h) * 0.56; yaw = lerp(0.62, 0.3, ease(k)); dist = lerp(5.2, 4.0, ease(k)) + Math.abs(AF.x - BF.x) * 0.28; lift = -0.32; }
    rate = 0.2; follow = 0.22;
  } else if (introT > 45) {
    const k = ease((125 - introT) / 80); yaw = lerp(0.45, 0, k); dist *= lerp(0.75, 1, k); rate = 0.12;
  } else {
    const att = P.find(f => f.combo >= 3 && f.comboT > 0);
    if (att) { dist *= 0.86; yaw -= att.facing * 0.12; }
    yaw += Math.sin(frame / 420) * 0.045; ty += Math.sin(frame / 300) * 0.02;
  }
  // heavy hits: a quick push toward the impact
  const kick = cine ? 0 : clamp(cam.kick, 0, 0.2);
  if (kick > 0.002 && cam.hx !== undefined) { const k2 = clamp(kick * 6, 0, 1); tx = lerp(tx, wx(cam.hx), 0.4 * k2); ty = lerp(ty, wy(cam.hy), 0.3 * k2); }
  if (snap) { cam3.x = tx; cam3.ty = ty; cam3.yaw = yaw; cam3.dist = dist; cam3.lift = lift; cam3.z = tz; cam3.snap = false; }
  cam3.z = lerp(cam3.z || 0, tz, follow);
  cam3.x = lerp(cam3.x, tx, follow); cam3.ty = lerp(cam3.ty, ty, follow);
  cam3.yaw = lerp(cam3.yaw, yaw, rate); cam3.dist = lerp(cam3.dist || dist, dist, rate);
  const d = cam3.dist * (1 - kick * 2.2), sh = shake * 0.005;
  cam3.lift = lerp(cam3.lift || 0, lift, 0.08);
  camera.position.set(cam3.x + Math.sin(cam3.yaw) * d + (Math.random() - 0.5) * sh, cam3.ty + 0.18 + d * (0.06 + cam3.lift * 0.25) + (Math.random() - 0.5) * sh, cam3.z + Math.cos(cam3.yaw) * d);
  camera.lookAt(cam3.x, cam3.ty, cam3.z);
  camera.rotateZ(cam.roll * 0.7);
  if (!(cine && cine.kind === 'fin')) cam3.finShot = 0;
  const fov = cam3.phase || (cine && cine.kind === 'fin' && cine.cam) ? cam3.fov || 34 : 34; // intro and finisher shots set their own lens
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
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
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.4, rig.bloomT || 0.9); composer.addPass(bloomPass);
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
  // a dark showroom: reflective floor with a faint grid, a curved backdrop, coloured spotlights, light shafts and embers
  selScene = new THREE.Scene(); selScene.background = col(0x050308); selScene.fog = new THREE.Fog(0x050308, 9, 26);
  selScene.environment = scene.environment; selScene.environmentIntensity = 0.3;
  selCam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100); selCam.position.set(0, 1.55, 7.6); selCam.lookAt(0, 1.35, 0);
  selScene.add(new THREE.HemisphereLight(0x6a5a8a, 0x080408, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(0, 5, 7); selScene.add(key);
  const grid = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0c0910'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, { repeat: [10, 10] });
  const floor = mesh(new THREE.CircleGeometry(16, 64), std(0xffffff, { map: grid, roughness: 0.2, metalness: 0.55 }), false, true); floor.rotation.x = -Math.PI / 2; selScene.add(floor);
  const back = mesh(new THREE.CylinderGeometry(11, 11, 14, 64, 1, true, Math.PI * 0.75, Math.PI * 0.5), std(0x140c1c, { roughness: 0.95, side: THREE.BackSide }), false);
  back.position.set(0, 6, 3); selScene.add(back);
  selScene.userData.spots = [-1, 1].map(s => { const l = new THREE.SpotLight(0xffffff, 120, 22, 0.42, 0.55, 1.1); l.position.set(s * 2.6, 7.5, 3.2); l.target.position.set(s * 2.6, 0.8, 0); selScene.add(l, l.target); return l; });
  selScene.userData.rims = [-1, 1].map(s => { const l = new THREE.PointLight(0xffffff, 0, 8, 2); l.position.set(s * 3.4, 2.6, -1.6); selScene.add(l); return l; });
  selScene.userData.beams = [-1, 1].map(s => { const b = mesh(GEO.beam, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false);
    placeSeg(b, new THREE.Vector3(s * 2.6, 7.5, 3.2), new THREE.Vector3(s * 2.6, 0, 0), 1); b.scale.x = b.scale.z = 0.9; selScene.add(b); return b; });
  selScene.userData.pads = [-1, 1].map(s => { const r = mesh(new THREE.RingGeometry(0.95, 1.05, 64), basic(0xffffff, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }), false); r.rotation.x = -Math.PI / 2; r.position.set(s * 2.6, 0.01, 0); selScene.add(r);
    const glow = mesh(GEO.disc, new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), false); glow.rotation.x = -Math.PI / 2; glow.position.set(s * 2.6, 0.012, 0); glow.scale.setScalar(1.6); selScene.add(glow); r.userData.glow = glow; return r; });
  const n = 220, pg = new THREE.BufferGeometry(), pp = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push([(Math.random() - 0.5) * 12, Math.random() * 6, -Math.random() * 5 + 1, Math.random()]);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const embers = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff6a4a, size: 0.035, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); embers.frustumCulled = false; selScene.add(embers);
  selScene.userData.embers = t => { for (let i = 0; i < n; i++) { const s0 = seed[i]; pp[i * 3] = s0[0] + Math.sin(t * 0.7 + i) * 0.2; pp[i * 3 + 1] = (s0[1] + t * (0.25 + s0[3] * 0.35)) % 6; pp[i * 3 + 2] = s0[2]; } pg.attributes.position.needsUpdate = true; };
}

// ---------- title / menu backdrop: Blake on a rooftop ledge over the city, moonlight and rain (Arkham style) ----------
let titleProps = null, titleF = null;
const titleModels = [null];
function buildTitleProps() {
  const g = new THREE.Group();
  // the painted BP VERSE city as the backdrop, a wet rooftop, a concrete ledge, rain and drifting mist
  const back = mesh(new THREE.PlaneGeometry(170, 96), new THREE.MeshBasicMaterial({ map: imgTex(VERSE_IMG), fog: false, toneMapped: false, color: 0x9a96a4 }), false);
  back.position.set(-8, 16, -72); g.add(back);
  const roofM = std(0x15151b, { roughness: 0.32, metalness: 0.4 });
  const roof = mesh(new THREE.PlaneGeometry(30, 7), roofM, false, true); roof.rotation.x = -Math.PI / 2; roof.position.set(0, 0, 0.6); g.add(roof);
  const conc = std(0x2e2e37, { roughness: 0.9 }), capM = std(0x3c3c47, { roughness: 0.7 });
  const ledge = mesh(GEO.box, conc, true, true); ledge.scale.set(12, 0.56, 0.8); ledge.position.set(0, 0.28, -3.2); g.add(ledge);
  const cap = mesh(GEO.box, capM, true, true); cap.scale.set(12.1, 0.07, 0.9); cap.position.set(0, 0.595, -3.2); g.add(cap);
  for (let i = 0; i < 12; i++) { const st = mesh(GEO.box, std(0x111116, { roughness: 1 }), false); st.scale.set(0.02, 0.5, 0.01); st.position.set(-5.5 + i, 0.3, -2.79); g.add(st); }
  const vent = mesh(GEO.box, std(0x24242c, { roughness: 0.6, metalness: 0.4 }), true, true); vent.scale.set(1.1, 0.9, 0.9); vent.position.set(-3.4, 0.45, -1.6); g.add(vent);
  const rain = rainSystem(900, 0xa8b4d8); g.add(rain);
  const mistTex = radialTex('rgba(150,160,190,0.35)', 'rgba(150,160,190,0)'), mist = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 })); m.scale.set(26, 7, 1); m.position.set(-30 + i * 10, -1 + (i % 3), -18 - (i % 4) * 6); g.add(m); mist.push(m); }
  // the vibe's particles: embers rising, bubbles, gold dust, snow
  const PN = 280, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = Array.from({ length: PN }, () => [Math.random() * 18 - 10, Math.random() * 8, -0.8 - Math.random() * 14, Math.random()]);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pm = new THREE.PointsMaterial({ map: fx3.glowTex, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0.85 });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; g.add(pts);
  const TU = g.userData = { rain, mist, back, pts, pm, fx: 'rain' };
  TU.update = t => {
    rain.visible = TU.fx === 'rain'; mist.forEach((m, i) => { m.position.x = -34 + ((i * 10 + t * 0.6) % 70); });
    if (rain.visible) rain.userData.update(t, 0);
    pts.visible = TU.fx !== 'rain';
    if (pts.visible) { for (let i = 0; i < PN; i++) { const [x0, y0, z0, r] = ps[i], o = i * 3; let x = x0, y = y0;
      if (TU.fx === 'rise') { y = (y0 + t * (0.35 + r * 0.7)) % 8 - 0.4; x += Math.sin(t * 0.8 + i) * 0.3; }
      else if (TU.fx === 'bubbles') { y = (y0 + t * (0.22 + r * 0.3)) % 8 - 0.4; x += Math.sin(t * 1.6 + i) * 0.12; }
      else if (TU.fx === 'fall') { y = 7.6 - (y0 + t * (0.25 + r * 0.35)) % 8; x += Math.sin(t * 0.6 + i) * 0.4; }
      else { x += Math.sin(t * 0.3 + i) * 0.8; y += Math.sin(t * 0.5 + i * 1.3) * 0.5; }
      pp[o] = x; pp[o + 1] = y; pp[o + 2] = z0; }
      pg.attributes.position.needsUpdate = true; }
  };
  g.visible = false; scene.add(g); return g;
}
function hideFight() {
  if (R3D._mate) R3D._mate.root.visible = R3D._mate.shadowBlob.visible = false; if (R3D._hoop) R3D._hoop.visible = false;
  stages.forEach(s => { if (s.props) s.props.group.visible = false; });
  if (CR) { CR.chunks.count = 0; CR.decals.forEach(d => { d.visible = false; }); CR.dust.forEach(d => { d.s.visible = false; }); }
  models.forEach(m => { if (m) { m.root.visible = false; m.shadowBlob.visible = false; } });
  for (const k in fx3.proj) fx3.proj[k].forEach(m => { m.visible = false; });
  fx3.add.g.setDrawRange(0, 0); fx3.norm.g.setDrawRange(0, 0); fx3.rings.forEach(m => { m.visible = false; }); fx3.stars.forEach(m => { m.visible = false; }); fx3.hypno.visible = false;
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
    const kit = { GEO, mesh, std, basic, canvasTex, radialTex, placeSeg, setRig, rainSystem, textPlane, figure, buildHoop };
    const builders = [['BP / Verity Club', buildClub], ['The Garden', buildGarden], ['Rooftop', buildRoof], ['BP Verse', buildVerse]]
      .concat(NEW_STAGES.map(id => [STAGES.find(s => s.id === id).name, () => buildStage3D(id, kit)]));
    for (let i = 0; i < builders.length; i++) {
      progress(0.18 + i * (0.58 / builders.length), 'Building stage: ' + builders[i][0]);
      await nextFrame();
      const st = builders[i][1](); st.group.visible = false; scene.add(st.group); stages.push(st);
    }
    progress(0.78, 'Loading fighters');
    Object.values(GEO).forEach(g => { g.userData.keep = true; });
    try { await loadHumans({ GEO, std, mesh, canvasTex, animalHead, propMesh, fx3: () => fx3 }, (k, msg) => progress(0.78 + k * 0.04, msg)); }
    catch (e) { console.warn('realistic fighters unavailable, using the stylised ones', e); }
    buildSelect(); titleProps = buildTitleProps();
    stages.forEach((st, i) => { st.props = buildStageProps(i); });
    applyQuality(gfx.quality);
    addEventListener('resize', resize);
    // warm up: compile shaders for every stage + a pair of fighters so the first fight doesn't stutter
    progress(0.82, 'Compiling shaders');
    await nextFrame();
    const dummies = [makeFighter(0, 0, 0), makeFighter(3, 1, 1)];
    dummies.forEach((f, i) => { f.hp = f.maxHp; syncModel(i, f, scene, models, 1); });
    for (let i = 0; i < stages.length; i++) { stages.forEach((s, j) => { s.group.visible = j === i; s.props.group.visible = j === i; }); stages[i].setup(); renderer.compile(scene, camera); await nextFrame(); progress(0.84 + i * (0.14 / stages.length), 'Compiling shaders'); }
    stages.forEach(s => { s.group.visible = false; s.props.group.visible = false; });
    // keep the warm-up pair (hidden) so their compiled shader programs stay cached
    R3D._warm = models.slice(); R3D._warm.forEach(m => { m.root.visible = false; m.shadowBlob.visible = false; }); models[0] = models[1] = null;
    // portraits for fighters without a photo, rendered from their 3D model
    if (humansReady()) CHARS.forEach((c, ci) => { if (!c.noPhoto) return;
      const f = makeFighter(ci, 0, 0); f.x = WW / 2; f.y = FLOOR; f.facing = 1; f.hp = f.maxHp;
      const h = new Human(f); selScene.add(h.root); h.update(f, 1); h.root.rotation.y = -Math.PI / 2 + 0.3; h.root.updateMatrixWorld(true);
      const hp = new THREE.Vector3(); h.headWorld(hp); const bw = glCanvas.width, bh = glCanvas.height;
      const pc = new THREE.PerspectiveCamera(20, bw / bh, 0.05, 20); pc.position.set(hp.x + 0.05, hp.y - 0.02, hp.z + 0.62); pc.lookAt(hp.x, hp.y - 0.05, hp.z);
      const sp0 = selScene.userData.spots.map(l => l.intensity); selScene.userData.spots.forEach(l => { l.intensity = 0; });
      renderer.render(selScene, pc);
      const out = document.createElement('canvas'); out.width = 150; out.height = 180; const ch2 = bh * 0.92, cw2 = ch2 * 150 / 180;
      out.getContext('2d').drawImage(glCanvas, (bw - cw2) / 2, (bh - ch2) / 2, cw2, ch2, 0, 0, 150, 180);
      c.img = new Image(); c.img.src = out.toDataURL('image/png');
      selScene.userData.spots.forEach((l, i) => { l.intensity = sp0[i]; }); selScene.remove(h.root); h.dispose(); });
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
    if (R3D._stage !== stageId) { stages.forEach((s, j) => { s.group.visible = j === stageId; s.props.group.visible = j === stageId; }); st.setup(); R3D._stage = stageId; cam3.snap = true; titleProps.visible = false; if (titleModels[0]) { titleModels[0].root.visible = false; } }
    const t = frame / 60;
    if (arenaOn !== !!R3D._arenaOn) { // Frank took the fight to the arena
      R3D._arenaOn = arenaOn;
      if (arenaOn) { if (!R3D._arena) { R3D._arena = buildArena(); scene.add(R3D._arena.group); } R3D._arena.group.visible = true; st.group.visible = st.props.group.visible = false; R3D._arena.setup(); cam3.snap = true; }
      else { if (R3D._arena) R3D._arena.group.visible = false; st.group.visible = st.props.group.visible = true; st.setup(); }
    }
    if (arenaOn && cine && cine.hoop) R3D._arena.group.position.x = wx(cine.hoop.x) - P[cine.side].facing * 13.1; // the hoop sits on a baseline
    if (arenaOn) R3D._arena.update(t, cine && cine.boom ? 1 : 0.35); else st.update(t);
    const po = cine && cine.portal;
    if (po) { if (!R3D._portal) { R3D._portal = buildPortal(); scene.add(R3D._portal); } const pr = R3D._portal; pr.visible = true; pr.position.set(wx(po.x), 1.35, 0); pr.scale.setScalar(Math.max(0.01, po.open) * 1.35); pr.rotation.y = Math.PI / 2 - P[cine.side].facing * 0.75; pr.userData.disc.rotation.z = -t * 3; }
    else if (R3D._portal) R3D._portal.visible = false;
    const fl = cine && cine.flood;
    if (fl > 0.001) { if (!R3D._flood) { R3D._flood = buildFlood(); scene.add(R3D._flood); } const fm = R3D._flood, pos = fm.geometry.attributes.position, b0 = fm.userData.base; fm.visible = true; fm.position.y = fl * 0.6;
      for (let i = 0; i < pos.count; i++) { const x = b0[i * 3], z = b0[i * 3 + 2]; pos.array[i * 3 + 1] = (Math.sin(x * 1.3 + t * 2.2) * 0.05 + Math.sin(z * 1.7 - t * 1.6) * 0.04) * (0.4 + fl); }
      pos.needsUpdate = true; fm.geometry.computeVertexNormals(); }
    else if (R3D._flood) R3D._flood.visible = false;
    P.forEach((f, i) => syncModel(i, f, scene, models, 1));
    updateCraters(st); updateBgMarks(st);
    // finisher extras: Lejohn Rames and the hoop for the alley-oop
    const mt = cine && cine.mate;
    if (mt) { const mf = mateFrom(mt); if (!R3D._mate) { R3D._mate = new Human(mf); scene.add(R3D._mate.root, R3D._mate.shadowBlob); } R3D._mate.update(mf, 1); R3D._mate.root.visible = R3D._mate.shadowBlob.visible = true; }
    else if (R3D._mate) R3D._mate.root.visible = R3D._mate.shadowBlob.visible = false;
    if (cine && cine.hoop) R3D._lastHoop = { x: cine.hoop.x, rise: cine.hoop.rise, d: P[cine.side].facing };
    const hp = (cine && cine.hoop) || (arenaOn && R3D._lastHoop);
    if (hp) { if (!R3D._hoop) { R3D._hoop = buildHoop(); scene.add(R3D._hoop); } const hd = cine ? P[cine.side].facing : hp.d; R3D._hoop.visible = true; R3D._hoop.position.set(wx(hp.x), -2.7 * (1 - hp.rise), 0); R3D._hoop.scale.set(hd, 1, 1); }
    else if (R3D._hoop) R3D._hoop.visible = false;
    // stage items: hidden while respawning, glowing when someone can grab them
    st.props.items.forEach((it, k) => { const p = props[k]; it.item.visible = !!p && p.cd <= 0;
      const near = p && p.cd <= 0 && P.some(f => Math.abs(f.x - p.x) < 110 && !f.ai); it.item.traverse(o => { if (o.material && o.material.emissive) { o.material.emissive.setScalar(near ? 0.25 + 0.2 * Math.sin(frame / 6) : 0); } }); });
    updateFX();
    updateCamera3D();
    // super cinematics: drop the world lights, light the fighter in their colour
    const b = rig.base, dim = cine ? (cine.kind === 'act' ? 0.35 : cine.kind === 'fin' ? 0.8 : 0.6) : 1;
    rig.hemi.intensity = b.hemi * dim; rig.key.intensity = b.key * (cine ? 0.7 : 1);
    if (cine && P[cine.side]) { const f = P[cine.side]; rig.cine.color.set(f.c.color); rig.cine.intensity = cine.kind === 'fin' ? 8 : 30 + 20 * Math.sin(frame / 4); rig.cine.position.set(wx(f.x) + f.facing * 0.8, wy(f.y - f.h * 0.7), 1.5); }
    else rig.cine.intensity = 0;
    R3D.show(true);
    R3D.render(scene, camera);
    // head positions on the overlay (for status icons / tags)
    models.forEach((m, i) => { if (!m || !P[i]) return; let hr; if (m.headWorld) hr = m.headWorld(_v); else { m.head.getWorldPosition(_v); hr = m.head.scale.y; } const a = R3D.project3(_v.x, _v.y, _v.z); _v.y += hr; const b2 = R3D.project3(_v.x, _v.y, _v.z); P[i]._head = { x: a[0], y: a[1], r: Math.max(8, a[1] - b2[1]) }; });
    // frame-rate watch: drop quality automatically if the machine struggles
    const now = performance.now(); fpsN++; if (now - fpsT > 1000) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
      if (gfx.auto && fps < 38 && qLevel > 0 && ++slowFrames >= 3) { slowFrames = 0; gfx.quality = qLevel - 1; applyQuality(gfx.quality); saveSettings(); toast = { msg: 'Graphics set to ' + QUALITY[qLevel].name + ' for smoother play', t: 200 }; }
      else if (fps >= 38) slowFrames = 0; }
  },
  // menus: the rooftop scene; title=true frames Blake in the middle, menus push him to the right
  renderTitle(isTitle, v) {
    if (!R3D.ready) return false;
    v = v || { id: 'blake', gaze: 1, rot: 1.78, fx: 'rain', back: 0x9a96a4, pcol: '#a8b4d8', rig: { sky: '#2a3552', ground: '#040408', hemi: 0.16, keyCol: '#9fb4ff', key: 0.22, rimCol: '#c8d6ff', rim: 1.7, fog: [0x07070f, 12, 120], bg: 0x020308, env: 0.06, bloomT: 1.2, points: [['#ff2040', 0.6, -0.6, -4.6, 3], ['#4a5cff', -3.5, 2.4, -1.2, 4]] } };
    if (R3D._stage !== 'title' || R3D._vibe !== v.id) { // a new mood: lights, the city's tint, the particles
      stages.forEach(s => { s.group.visible = false; });
      setRig(v.rig);
      const TU = titleProps.userData; TU.fx = v.fx; TU.back.material.color.set(v.back); TU.pm.color.set(v.pcol); TU.pm.size = v.fx === 'bubbles' ? 0.2 : v.fx === 'fall' ? 0.13 : 0.16;
      if (R3D._stage !== 'title') R3D._menuK = isTitle ? 0 : 1;
      titleProps.visible = true; hideFight(); R3D._stage = 'title'; R3D._vibe = v.id;
    }
    hideFight();
    const t = frame / 60; titleProps.userData.update(t);
    titleF = (typeof vibeFighter === 'function') ? vibeFighter(v) : (titleF || Object.assign(makeFighter(3, 0, 0), { gaze: true }));
    titleF.x = WW / 2; titleF.y = FLOOR; titleF.facing = 1;
    const m = syncModel(0, titleF, scene, titleModels, 1);
    m.root.position.set(0.55, 0.63, -3.2); m.root.rotation.y = v.rot; m.root.visible = true; m.shadowBlob.visible = false; m.root.updateMatrixWorld(true);
    const k = R3D._menuK = lerp(R3D._menuK, isTitle ? 0 : 1, 0.04);
    camera.position.set(lerp(-1.3, -2.1, k) + Math.sin(t * 0.07) * 0.22, 0.42 + Math.sin(t * 0.05) * 0.05, lerp(1.95, 2.25, k));
    camera.lookAt(lerp(-0.45, -0.75, k), lerp(2.15, 1.78, k), -4); camera.rotateZ(Math.sin(t * 0.04) * 0.008);
    rig.key.position.set(2, 7, 6); rig.key.target.position.set(0.5, 0.5, -3);
    R3D.show(true); R3D.invert(false);
    R3D.render(scene, camera);
    return true;
  },
  renderSelect(vs) {
    if (!R3D.ready) return;
    const gal = mode === 'gallery', t = frame / 60;
    selCam.position.set(Math.sin(t * 0.15) * 0.15, 1.6, vs ? lerp(9, 7.4, 1 - vsT / 130) : 8.3); selCam.lookAt(0, 1.45, 0);
    const slots = gal ? [0] : [0, 1], U2 = selScene.userData;
    U2.embers(t);
    [0, 1].forEach(s => {
      const on = slots.includes(s), d = dummyFor(s), px = gal ? -1.7 : s ? 2.6 : -2.6;
      d.x = WW / 2 + px * 100; d.y = FLOOR; d.facing = s ? -1 : 1;
      const m = syncModel(s, d, selScene, selModels, 1.8);
      m.root.visible = on; m.shadowBlob.visible = on;
      m.root.rotation.y += d.facing > 0 ? -0.42 : 0.42; // turn toward the camera like a showroom
      const c = CHARS[sel[s]], sp = U2.spots[s], pad = U2.pads[s], rim = U2.rims[s], beam = U2.beams[s];
      sp.position.x = px; sp.target.position.x = px; pad.position.x = px; pad.userData.glow.position.x = px; rim.position.x = px + (s ? 0.8 : -0.8);
      placeSeg(beam, sp.position, sp.target.position, 1); beam.scale.x = beam.scale.z = 0.9;
      sp.color.set(0xffffff).lerp(_c3.set(c.color), 0.3); sp.intensity = on ? 115 : 0; rim.color.set(c.color); rim.intensity = on ? 26 : 0;
      pad.material.color.set(c.color); pad.userData.glow.material.color.set(c.color); pad.visible = pad.userData.glow.visible = beam.visible = on;
      beam.material.color.set(c.color); beam.material.opacity = 0.05 + 0.015 * Math.sin(t * 2 + s);
      if (d.flash > 0) d.flash--;
    });
    R3D.show(true);
    renderer.render(selScene, selCam);
  },
  // render a stage once and copy it into a 2D canvas (stage select thumbnails)
  stagePreview(i, target) {
    if (!R3D.ready) return false;
    stages.forEach((s, j) => { s.group.visible = j === i; if (s.props) s.props.group.visible = false; }); stages[i].setup(); stages[i].update(frame / 60);
    models.forEach(m => { if (m) { m.root.visible = false; m.shadowBlob.visible = false; } });
    titleProps.visible = false; if (titleModels[0]) titleModels[0].root.visible = false;
    const saved = { x: camera.position.clone(), q: camera.quaternion.clone() };
    camera.position.set(0, 1.9, 9.2); camera.lookAt(0, 1.4, 0);
    R3D.render(scene, camera);
    target.getContext('2d').drawImage(glCanvas, 0, 0, target.width, target.height);
    camera.position.copy(saved.x); camera.quaternion.copy(saved.q);
    models.forEach(m => { if (m) { m.root.visible = true; m.shadowBlob.visible = true; } });
    R3D._stage = -1;
    return true;
  },
  // handles for tests and tinkering in the console
  debug: () => ({ THREE, Human, selScene, selCam, renderer, scene, camera, models, stages }),
  propPoint(x) { return R3D.project3(wx(x), 1.15, -0.85); },
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
