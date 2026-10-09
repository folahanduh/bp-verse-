// BP VERSE realistic fighters.
// One rigged human (models/base_human.glb, Mixamo-style skeleton) is cloned for each fighter. The fighter's photo is
// painted onto the head's face UVs (so it sits on a real modelled face), the mesh is reshaped for their build, and
// every frame the game's pose angles (the same ones the 2D renderer uses) are turned into bone rotations.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

// Optional: a full avatar per fighter (same bone names as the base model, e.g. exported from an avatar creator).
// When one is listed it is used as-is instead of the base model + photo face, e.g. { julian: 'models/julian.glb' }.
export const AVATARS = {};

const U = 0.01, YAW = 0.34, HEAD_TURN = 0.3, STONE = new THREE.Color(0.55, 0.54, 0.52);
const wx = x => (x - WW / 2) * U, wy = y => (FLOOR - y) * U;

// photo landmarks in faces/<id>.png: the eyes (viewer's left first) and the middle of the mouth
const FACE = {
  julian: { eyes: [[70, 40], [112, 54]], mouth: [82, 78], hair: 'messy', hairCol: '#4a3020', choker: 1, clean: 1 },
  ryan: { eyes: [[60, 85], [100, 68]], mouth: [90, 94], hair: 'curly', hairCol: '#1e140e', shades: 1, clean: 1 },
  darren: { eyes: [[70, 78], [108, 86]], mouth: [90, 115], hair: 'curly', hairCol: '#2a1b11', shades: 1, clean: 1 },
  blake: { eyes: [[80, 62], [115, 73]], mouth: [90, 103], hair: 'long', hairCol: '#d0a874', choker: 1 },
  frank: { eyes: [[58, 85], [90, 73]], mouth: [92, 113], hair: 'locs', hairCol: '#140d09' },
  mate: { hair: 'buzz', hairCol: '#0e0a08', beard: 1 },
  clav: { hair: 'swept', hairCol: '#120e0c', jaw: 1 },
};
// the same landmarks on the base head texture (1024 x 1024, laid out face-on)
const UV_EYES = [[408, 322], [612, 322]], UV_MOUTH = [510, 492];
// jacket / waistcoat / shirt colours for the base outfit
const OUTFIT = {
  julian: { jacket: '#ecebee', vest: '#1d1c22', shirt: '#121216' },
  ryan: { jacket: '#26232e', vest: '#4b3a63', shirt: '#e8e8ee' },
  darren: { jacket: '#24222a', vest: '#3a3540', shirt: '#e8e8ee' },
  blake: { jacket: '#2ec4e6', vest: '#167f9c', shirt: '#f2f2f2' },
  frank: { jacket: '#1e1d22', vest: '#c8102e', shirt: '#2a2a30' },
  clav: { jacket: '#121216', vest: '#1e1e26', shirt: '#e8e8ee' },
};

let kit = null, base = null;
const avatars = {}, faceCache = {}, texCache = {}, geoCache = {};
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _d = new THREE.Vector3(), _ax = new THREE.Vector3();
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _m = new THREE.Matrix4();
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const boneKey = n => n.replace(/^mixamorig:?/, '');

export const humansReady = () => !!base;

export async function loadHumans(k, progress) {
  kit = k;
  const loader = new GLTFLoader(), ids = Object.keys(AVATARS);
  progress && progress(0.3, 'Loading fighters');
  const [b0, ...av] = await Promise.all([loader.loadAsync('models/base_human.glb'), ...ids.map(id => loader.loadAsync(AVATARS[id]).catch(e => { console.warn('avatar for ' + id + ' failed to load', e); return null; }))]);
  base = prep(b0); ids.forEach((id, i) => { if (av[i]) avatars[id] = prep(av[i]); });
}
// the slow per-fighter prep (photo face, body shape, outfit textures), split into small jobs so most of it can
// run in the background after the title is up; everything is cached, and built on demand if it hasn't run yet
const prepped = new Set();
export function prepJobs(i) {
  if (prepped.has(i) || !base) return [];
  prepped.add(i);
  const c = CHARS[i], L0 = lookOf(c, 0);
  return [() => faceTexture(c), () => bodyGeometry(c), () => outfitTextures(c, L0, i + ':0:0'), () => { if (L0.shirtless) muscleBody(c); if (L0.tee) teeTextures(c, L0); if (L0.shorts) legsBody(c); }];
}

// rest-pose data for a loaded model
function prep(gltf) {
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const bones = {}, meshes = {};
  scene.traverse(o => { if (o.isBone) bones[boneKey(o.name)] = o; if (o.isMesh) meshes[o.name] = o; });
  const rest = {}; for (const k in bones) rest[k] = bones[k].getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3();
  const headMesh = meshes.Wolf3D_Head;
  if (headMesh) { headMesh.geometry.computeBoundingBox(); box.copy(headMesh.geometry.boundingBox); } else box.setFromObject(scene);
  const top = headMesh ? box.max.y : box.max.y;
  const len = (a, b) => rest[a] && rest[b] ? rest[a].distanceTo(rest[b]) : 0.45;
  scene.traverse(o => { if (o.geometry) o.geometry.userData.keep = true; });
  return {
    scene, rest, top, rpm: !!headMesh,
    thigh: len('LeftUpLeg', 'LeftLeg'), shin: len('LeftLeg', 'LeftFoot'), ankle: rest.LeftFoot ? rest.LeftFoot.y : 0.1,
    headImage: headMesh && headMesh.material.map ? headMesh.material.map.image : null,
    maps: Object.fromEntries(Object.values(meshes).filter(m => m.material.map).map(m => [m.material.name, m.material.map.image])),
  };
}

// ---------- the photo face ----------
// solve the 2D affine transform that takes three photo points onto three texture points
function affine(p, q) {
  const [[x1, y1], [x2, y2], [x3, y3]] = p, det = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2);
  const solve = (v1, v2, v3) => [
    (v1 * (y2 - y3) - y1 * (v2 - v3) + (v2 * y3 - v3 * y2)) / det,
    (x1 * (v2 - v3) - v1 * (x2 - x3) + (x2 * v3 - x3 * v2)) / det,
    (x1 * (y2 * v3 - y3 * v2) - y1 * (x2 * v3 - x3 * v2) + v1 * (x2 * y3 - x3 * y2)) / det];
  const [a, c, e] = solve(q[0][0], q[1][0], q[2][0]), [b, d, f] = solve(q[0][1], q[1][1], q[2][1]);
  return [a, b, c, d, e, f];
}
function median(vals) { vals.sort((a, b) => a - b); return vals.length ? vals[vals.length >> 1] : 0; }
// the hairline on the base head texture (everything outside it is scalp)
const SCALP = [[0, 0], [1024, 0], [1024, 560], [858, 560], [852, 430], [806, 286], [744, 246], [702, 196], [640, 166], [512, 150], [384, 166], [322, 196], [280, 246], [218, 286], [172, 430], [166, 560], [0, 560]];
function faceTexture(c) {
  if (faceCache[c.id]) return faceCache[c.id];
  const S = 1024, cv = canvas(S, S), g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(base.headImage, 0, 0, S, S);
  // 1. tint the base skin to the fighter's skin tone
  const tgt = rgb(c.skin), ref = [192, 150, 142], gain = tgt.map((v, i) => v / ref[i]);
  const id = g.getImageData(0, 0, S, S), d = id.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * gain[0]); d[i + 1] = Math.min(255, d[i + 1] * gain[1]); d[i + 2] = Math.min(255, d[i + 2] * gain[2]); }
  g.putImageData(id, 0, 0);
  // 2. hair colour on the scalp, softened at the hairline
  const hc = canvas(S, S), hg = hc.getContext('2d');
  hg.fillStyle = (FACE[c.id] && FACE[c.id].hairCol) || c.hair; hg.beginPath(); SCALP.forEach(([x, y], i) => i ? hg.lineTo(x, y) : hg.moveTo(x, y)); hg.closePath(); hg.fill();
  hg.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2600; i++) { hg.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; hg.lineWidth = 1 + Math.random() * 2; const x = Math.random() * S, y = Math.random() * 600; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + (Math.random() - 0.5) * 10, y + 20 + Math.random() * 30); hg.stroke(); }
  g.filter = 'blur(5px)'; g.drawImage(hc, 0, 0); g.filter = 'none'; g.drawImage(hc, 0, 0); // soft edge + sharp core
  // 3. the photo: lined up on the eyes and mouth, colour-matched to the skin tone, feathered into the face
  const F = FACE[c.id];
  if (F && F.beard) { g.save(); g.globalAlpha = 0.85; g.fillStyle = F.hairCol; g.beginPath(); g.ellipse(510, 560, 190, 120, 0, 0, Math.PI); g.fill(); g.beginPath(); g.ellipse(510, 470, 70, 16, 0, Math.PI, 0); g.fill(); g.restore(); }
  if (F && c.img && c.img.naturalWidth) {
    const pc = canvas(S, S), pg = pc.getContext('2d', { willReadFrequently: true });
    const A = affine([F.eyes[0], F.eyes[1], F.mouth], [UV_EYES[0], UV_EYES[1], UV_MOUTH]);
    pg.setTransform(A[0], A[1], A[2], A[3], A[4], A[5]); pg.imageSmoothingQuality = 'high'; pg.drawImage(c.img, 0, 0); pg.setTransform(1, 0, 0, 1, 0, 0);
    const pd = pg.getImageData(0, 0, S, S), p = pd.data;
    // skin in the photo: cheeks under the eyes
    const ch = [[], [], []];
    for (const [x0, x1] of [[372, 452], [568, 648]]) for (let y = 404; y < 470; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * S + x) * 4; if (p[i + 3] > 200) for (let k = 0; k < 3; k++) ch[k].push(p[i + k]); }
    const med = ch.map(median), cg = tgt.map((v, i) => clamp(v / Math.max(8, med[i]), 0.7, 2.6));
    for (let i = 0; i < p.length; i += 4) { p[i] = Math.min(255, p[i] * cg[0]); p[i + 1] = Math.min(255, p[i + 1] * cg[1]); p[i + 2] = Math.min(255, p[i + 2] * cg[2]); }
    pg.putImageData(pd, 0, 0);
    // flatten the photo's own lighting (divide by a heavy blur) so its shadows don't sit on the lit 3D face
    const bl = canvas(S, S), bg = bl.getContext('2d', { willReadFrequently: true });
    bg.fillStyle = c.skin; bg.fillRect(0, 0, S, S); bg.filter = 'blur(34px)'; bg.drawImage(pc, 0, 0); bg.filter = 'none';
    const bd = bg.getImageData(0, 0, S, S).data;
    for (let i = 0; i < p.length; i += 4) for (let k = 0; k < 3; k++) p[i + k] = clamp(p[i + k] * Math.pow(tgt[k] / Math.max(12, bd[i + k]), 0.6), 0, 255);
    pg.putImageData(pd, 0, 0);
    if (F.clean) {
      // a soft mask that keeps skin and features but drops dark strands / lenses and coloured club light
      const tl = 0.3 * tgt[0] + 0.59 * tgt[1] + 0.11 * tgt[2], mc = canvas(S, S), mg = mc.getContext('2d', { willReadFrequently: true });
      const md = mg.createImageData(S, S), m = md.data;
      const near = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4, l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], [h, sat] = rgb2hsv(p[i], p[i + 1], p[i + 2]);
        let keep = clamp((l / tl - 0.4) / 0.25, 0, 1);
        if (h > 200 && h < 330 && sat > 0.22) keep = 0;
        if (near(x, y, 510, 500, 95, 42) || (!F.shades && (near(x, y, UV_EYES[0][0], UV_EYES[0][1], 48, 26) || near(x, y, UV_EYES[1][0], UV_EYES[1][1], 48, 26)))) keep = 1; // mouth, eyes
        m[i + 3] = keep * 255;
      }
      mg.putImageData(md, 0, 0);
      const fm = canvas(S, S), fg = fm.getContext('2d'); fg.filter = 'blur(7px)'; fg.drawImage(mc, 0, 0);
      pg.globalCompositeOperation = 'destination-in'; pg.drawImage(fm, 0, 0); pg.globalCompositeOperation = 'source-over';
    }
    pg.globalCompositeOperation = 'destination-in';
    pg.save(); pg.translate(510, 418); pg.scale(1, 1.16);
    const rg = pg.createRadialGradient(0, 0, 0, 0, 0, 222); rg.addColorStop(0, '#000'); rg.addColorStop(0.6, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    pg.fillStyle = rg; pg.fillRect(-600, -600, 1200, 1200); pg.restore();
    g.drawImage(pc, 0, 0);
  }
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (faceCache[c.id] = t);
}

// ---------- outfit textures: recolour the base suit, keeping its folds and stitching ----------
function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; let h = 0;
  if (dd) { if (mx === r) h = ((g - b) / dd) % 6; else if (mx === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? dd / mx : 0, mx / 255];
}
function recolor(image, size, classify, colors, extra) {
  const cv = canvas(size, size), g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, size, size);
  const id = g.getImageData(0, 0, size, size), d = id.data, n = size * size;
  const cls = new Uint8Array(n), lum = new Float32Array(n), sum = new Float64Array(8), cnt = new Float64Array(8);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], [h, s, v] = rgb2hsv(r, gg, b);
    const k = classify(h, s, v); cls[i] = k; lum[i] = (0.3 * r + 0.59 * gg + 0.11 * b) / 255; sum[k] += lum[i]; cnt[k]++;
  }
  const cols = colors.map(rgb);
  for (let i = 0; i < n; i++) {
    const k = cls[i], mean = cnt[k] ? sum[k] / cnt[k] : 0.5, col = cols[k] || cols[0];
    let m = 1 + (lum[i] / Math.max(0.05, mean) - 1) * 0.9;
    if (extra) m *= extra(i % size, (i / size) | 0, k);
    d[i * 4] = clamp(col[0] * m, 0, 255); d[i * 4 + 1] = clamp(col[1] * m, 0, 255); d[i * 4 + 2] = clamp(col[2] * m, 0, 255);
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// stable pseudo-random pattern (fur streaks, print spots)
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
function outfitTextures(c, L, key) {
  if (texCache[key]) return texCache[key];
  const O = OUTFIT[c.id] || {}, fur = !!L.furBody, bare = !!L.bare;
  const skin = c.skin;
  let jacket = L.shirt !== c.shirt || fur || bare ? L.shirt : O.jacket || L.shirt;
  let vest = O.vest || shadeHex(jacket, 0.7), shirt = O.shirt || '#e8e8ee';
  if (fur) { vest = L.furLight; shirt = L.furLight; jacket = L.fur; }
  if (bare) { jacket = vest = shirt = skin; }
  if (L.jersey) { vest = L.shirt; shirt = '#ffffff'; }
  if (L.shirt === '#c9a227') { vest = L.pants; shirt = '#f5e7a8'; } // all gold
  const furMul = fur ? (x, y) => 0.8 + 0.4 * hash(x >> 1, (y >> 3)) : null;
  // a leopard-ish print for Julian's classic jacket
  const spots = L.spots && !fur ? (() => { const sc = canvas(1024, 1024), sg = sc.getContext('2d'); sg.fillStyle = '#000';
    for (let i = 0; i < 260; i++) { sg.beginPath(); sg.ellipse(hash(i, 1) * 1024, hash(i, 2) * 1024, 7 + hash(i, 3) * 9, 5 + hash(i, 4) * 7, hash(i, 5) * 3, 0, 7); sg.fill(); }
    return sg.getImageData(0, 0, 1024, 1024).data; })() : null;
  const topExtra = (x, y, k) => (furMul ? furMul(x, y) : 1) * (spots && k === 0 && spots[(y * 1024 + x) * 4 + 3] > 128 ? 0.1 : 1);
  const maps = base.maps;
  const out = {
    top: recolor(maps.Wolf3D_Outfit_Top, 1024, (h, s, v) => (h > 250 && h < 335 && s > 0.12) ? 1 : (s < 0.13 && v > 0.62) ? 2 : 0, [jacket, vest, shirt], topExtra),
    bottom: recolor(maps.Wolf3D_Outfit_Bottom, 1024, () => 0, [fur ? L.fur : bare && !L.shorts ? skin : L.pants], furMul),
    shoes: recolor(maps.Wolf3D_Outfit_Footwear, 512, () => 0, [L.shoes], null),
  };
  if (L.print) heartPrint(out.bottom.image, L.print, 1024);
  return (texCache[key] = out);
}
// a heart print (boxer shorts): scattered little hearts over a texture's canvas
function heartPrint(cv, col, S, n = 260, sz = 0.012) {
  const g = cv.getContext('2d'); g.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = hash(i, 11) * S, y = hash(i, 12) * S, r = S * sz * (0.8 + hash(i, 13) * 0.5);
    g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r * 0.9); g.fill(); }
}
// a pair of boxers pulled over the head: waistband at the brow, the leg holes sticking up like ears
function buildBoxersHat(col, print) {
  const g = new THREE.Group();
  const cv = canvas(256, 256), q = cv.getContext('2d'); q.fillStyle = col; q.fillRect(0, 0, 256, 256); heartPrint(cv, print, 256, 40, 0.035);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const cloth = kit.std(0xffffff, { map: tex, roughness: 0.9, side: THREE.DoubleSide }), band = kit.std('#f6f6fa', { roughness: 0.7 }), stripe = kit.std(print, { roughness: 0.7 });
  const C = SKULL.c, R = SKULL.r;
  const dome = kit.mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), cloth); dome.scale.set(R.x * 1.2, R.y * 0.82, R.z * 1.17); dome.position.set(C.x, C.y + 0.022, C.z - 0.004); g.add(dome);
  const wb = kit.mesh(new THREE.TorusGeometry(1, 0.1, 8, 40), band); wb.rotation.x = Math.PI / 2; wb.scale.set(R.x * 1.2, R.z * 1.17, 0.09); wb.position.set(C.x, C.y + 0.026, C.z - 0.004); g.add(wb);
  const ws = kit.mesh(new THREE.TorusGeometry(1, 0.04, 6, 40), stripe); ws.rotation.x = Math.PI / 2; ws.scale.set(R.x * 1.235, R.z * 1.2, 0.09); ws.position.set(C.x, C.y + 0.03, C.z - 0.004); g.add(ws);
  for (const sx of [-1, 1]) { // the leg holes
    const leg = kit.mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.055, 16, 1, true), cloth); leg.position.set(C.x + sx * 0.052, C.y + 0.112, C.z - 0.01); leg.rotation.z = -sx * 0.75; g.add(leg);
    const cuff = kit.mesh(new THREE.TorusGeometry(0.031, 0.006, 6, 20), band); cuff.position.set(C.x + sx * 0.071, C.y + 0.131, C.z - 0.01); cuff.rotation.set(Math.PI / 2, 0, -sx * 0.75); g.add(cuff);
  }
  return g;
}
// bare feet (no shoes or socks): a foot along ankle -> toes, a little row of toes, the ankle bone
function buildFoot(side, skinCol) {
  const R = base.rest, A = R[side + 'Foot'], T = R[side + 'Toe_End'] || R[side + 'ToeBase'];
  const g = new THREE.Group(), m = kit.std(skinCol, { roughness: 0.62 }); if (!A || !T) return g;
  const dx = T.x - A.x, dz = T.z - A.z, len = Math.hypot(dx, dz) + 0.03, ang = Math.atan2(dx, dz);
  const foot = kit.mesh(kit.GEO.sphere, m); foot.scale.set(0.046, 0.034, len * 0.55); foot.position.set(A.x + dx * 0.45, 0.036, A.z + dz * 0.45); foot.rotation.y = ang; g.add(foot);
  const heel = kit.mesh(kit.GEO.sphere, m); heel.scale.set(0.038, 0.04, 0.045); heel.position.set(A.x - Math.sin(ang) * 0.02, 0.045, A.z - Math.cos(ang) * 0.02); g.add(heel);
  const ankle = kit.mesh(kit.GEO.sphere, m); ankle.scale.setScalar(0.036); ankle.position.set(A.x, Math.max(0.07, A.y - 0.01), A.z); g.add(ankle);
  for (let i = 0; i < 5; i++) { const w = (i - 2) * 0.017 * (side === 'Left' ? 1 : -1), tx = T.x - Math.sin(ang) * 0.012 + Math.cos(ang) * w, tz = T.z - Math.cos(ang) * 0.012 - Math.sin(ang) * w;
    const toe = kit.mesh(kit.GEO.sphere, m); toe.scale.setScalar(i === 2 ? 0.0135 : 0.011); toe.position.set(tx, 0.016, tz); g.add(toe); }
  return g;
}
function shadeHex(hex, k) { const [r, g, b] = rgb(hex); const f = v => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }

// ---------- body shape for each build (baked into the bind-pose mesh) ----------
function shapeOf(c) {
  const B = c.build, fat = B.belly ? 1 : 0, mus = B.muscle ? 1 : 0;
  const arm = 1 + (B.armW - 1) * 0.55 + mus * 0.1 + fat * 0.12, leg = 1 + (B.legW - 1) * 0.45 + fat * 0.1, chest = 1 + (B.shoulder - 1) * 0.6 + mus * 0.1 + fat * 0.25;
  const waist = 1 + (B.waist - 0.85) * 0.75 + fat * 0.42;
  return {
    k: { Hips: waist, Spine: waist, Spine1: (waist + chest) / 2, Spine2: chest, Neck: (B.neck || 1) * (1 + mus * 0.35 + fat * 0.45), Shoulder: (chest + arm) / 2,
      Arm: arm, ForeArm: 1 + (arm - 1) * 0.8, Hand: 1 + (arm - 1) * 0.3, UpLeg: leg, Leg: 1 + (leg - 1) * 0.75, Foot: 1 + (leg - 1) * 0.2 },
    // extra push forward (belly, chest) and back (seat); sag pulls the belly down
    front: { Hips: 0.7 * fat, Spine: 1.25 * fat, Spine1: 0.8 * fat + 0.12 * mus, Spine2: 0.2 * fat + 0.15 * mus },
    back: { Hips: 0.75 * fat, UpLeg: 0.25 * fat },
    sag: { Hips: 0.025 * fat, Spine: 0.045 * fat, Spine1: 0.02 * fat },
  };
}
// reshape a skinned geometry in its bind pose: every vertex is pushed out from the bone it follows
function reshape(geo, bones, inv, sh) {
  const R = base.rest, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const segs = bones.map(b => {
    const name = boneKey(b.name), side = sideOf(name), stem = name.slice(side.length), ch = CHILD[stem];
    const P = R[name] ? R[name].clone().applyMatrix4(inv) : null, Q = ch && R[side + ch] ? R[side + ch].clone().applyMatrix4(inv) : null;
    return { P, Q, k: sh.k[stem] || 1, fr: sh.front[stem] || 0, bk: sh.back[stem] || 0, sag: (sh.sag && sh.sag[stem]) || 0 };
  });
  const v = new THREE.Vector3(), acc = new THREE.Vector3(), C = new THREE.Vector3(), dq = new THREE.Vector3(), o2 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); acc.set(0, 0, 0); let wsum = 0;
    for (let j = 0; j < 4; j++) {
      const w = sw.getComponent(i, j); if (w <= 0) continue;
      const s = segs[si.getComponent(i, j)];
      if (!s || !s.P) { acc.addScaledVector(v, w); wsum += w; continue; }
      if (s.Q) { dq.subVectors(s.Q, s.P); const t = clamp(o2.subVectors(v, s.P).dot(dq) / Math.max(1e-6, dq.lengthSq()), 0, 1); C.copy(s.P).addScaledVector(dq, t); } else C.copy(s.P);
      o2.subVectors(v, C).multiplyScalar(s.k);
      if (o2.z > 0 && s.fr) { o2.z *= 1 + s.fr; o2.y -= s.sag * clamp(o2.z / 0.15, 0, 1); } else if (o2.z < 0 && s.bk) o2.z *= 1 + s.bk;
      acc.addScaledVector(C.add(o2), w); wsum += w;
    }
    if (wsum > 0) pos.setXYZ(i, acc.x / wsum, acc.y / wsum, acc.z / wsum);
  }
  pos.needsUpdate = true; geo.computeBoundingSphere();
}
const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End', Shoulder: 'Arm', Arm: 'ForeArm', ForeArm: 'Hand', Hand: 'HandMiddle1', UpLeg: 'Leg', Leg: 'Foot', Foot: 'ToeBase', ToeBase: 'Toe_End' };
const sideOf = n => n.startsWith('Left') ? 'Left' : n.startsWith('Right') ? 'Right' : '';
function bodyGeometry(c) {
  if (geoCache[c.id]) return geoCache[c.id];
  const sh = shapeOf(c), out = {};
  base.scene.traverse(o => {
    if (!o.isSkinnedMesh || /Eye|Teeth/.test(o.name)) return;
    const geo = o.geometry.clone(), pos = geo.attributes.position;
    const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
    const hidden = o.name === 'Wolf3D_Outfit_Top' ? trinkets(geo) : null;
    reshape(geo, o.skeleton.bones, inv, sh);
    if (hidden) for (const i of hidden) pos.setXYZ(i, 0, 1.45, 0);
    if (o.name === 'Wolf3D_Head' && FACE[c.id] && FACE[c.id].jaw) bigJaw(pos);
    pos.needsUpdate = true; geo.userData.keep = true;
    out[o.name] = geo;
  });
  return (geoCache[c.id] = out);
}

// a massive, square jaw: the lower face is pushed out at the sides (keeping the mouth its size), the chin squared, dropped and pushed forward
function bigJaw(pos) {
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(x), sg = Math.sign(x), back = ss(-0.075, -0.01, z);
    if (y > 1.7 || y < 1.55 || back <= 0) continue;
    // the jaw angle: low and wide, so the outline drops straight down from the cheekbones and turns sharply at the bottom
    const gon = Math.exp(-(((y - 1.62) / 0.021) ** 2)) * back * ss(0.015, 0.045, ax);
    x += sg * gon * 0.034; y -= gon * 0.004;
    // hollow under the cheekbones, so the jaw reads as bone rather than cheeks
    x -= sg * Math.exp(-(((y - 1.672) / 0.012) ** 2)) * ss(0.045, 0.07, ax) * ss(0.0, 0.05, z) * 0.005;
    // a square chin: wider at the front, dropped and pushed forward
    const chin = Math.exp(-(((y - 1.607) / 0.016) ** 2)) * ss(0.06, 0.1, z);
    x += sg * chin * 0.011 * ss(0.0, 0.025, ax);
    z += chin * 0.016; y -= chin * 0.009;
    pos.setXYZ(i, x, y, z);
  }
}
// the base suit is a wedding outfit: drop its bow tie, buttonhole rose and watch chain (separate pieces of the mesh)
function trinkets(geo) {
  const idx = geo.index && geo.index.array, pos = geo.attributes.position, n = pos.count, out = []; if (!idx) return out;
  const par = new Int32Array(n).map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const seen = new Map();
  for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4); if (seen.has(k)) par[find(i)] = find(seen.get(k)); else seen.set(k, i); }
  for (let t = 0; t < idx.length; t += 3) { const a = find(idx[t]); par[find(idx[t + 1])] = a; par[find(idx[t + 2])] = a; }
  const comps = new Map(); for (let i = 0; i < n; i++) { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(i); }
  for (const v of comps.values()) {
    if (v.length > 260) continue;
    const mn = [9, 9, 9], mx = [-9, -9, -9];
    for (const i of v) { const q = [pos.getX(i), pos.getY(i), pos.getZ(i)]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], q[k]); mx[k] = Math.max(mx[k], q[k]); } }
    const bow = mn[1] > 1.49 && mx[1] < 1.59 && Math.abs(mn[0]) < 0.07 && Math.abs(mx[0]) < 0.07;
    const rose = mx[0] < -0.08 && mn[1] > 1.34 && mx[1] < 1.48 && mx[2] > 0.08;
    const chain = v.length < 30 && mn[1] > 1.03 && mx[1] < 1.15 && mn[2] > 0.08;
    if (bow || rose || chain) out.push(...v);
  }
  return out;
}

// ---------- shirt off: a muscular torso and bare arms, built as a skinned mesh on the same skeleton ----------
// The base model has no body under its jacket, so this makes one: lofted rings shaped like an athletic torso
// (pecs, abs, lats, traps) and arms (deltoids, biceps, forearms), weighted to the spine / arm bones, then reshaped
// for the fighter's build like the rest of the body. Muscle definition comes from a painted normal map.
const muscleCache = {};
const TORSO = [ // y, half width, front depth, back depth
  [0.95, 0.146, 0.1, 0.1], [1.03, 0.14, 0.095, 0.095], [1.11, 0.137, 0.1, 0.094], [1.19, 0.147, 0.106, 0.1], [1.27, 0.166, 0.116, 0.106],
  [1.34, 0.18, 0.126, 0.106], [1.41, 0.184, 0.118, 0.102], [1.46, 0.168, 0.09, 0.094], [1.5, 0.11, 0.066, 0.074], [1.535, 0.06, 0.058, 0.058], [1.56, 0.052, 0.05, 0.05]];
const SPINE = [['Hips', 1.019], ['Spine', 1.118], ['Spine1', 1.247], ['Spine2', 1.367], ['Neck', 1.523]];
function muscleTextures(c) {
  const S = 512, hc = canvas(S, S), g = hc.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  const v2y = v => (1 - v) * S, u2x = u => u * S, x2u = (x, w) => 0.5 + x / (2 * Math.PI * w); // u = 0.5 is the front middle
  const blob = (u, v, rx, ry, a) => { g.save(); g.translate(u2x(u), v2y(v)); g.scale(1, ry / rx); const r = g.createRadialGradient(0, 0, 0, 0, 0, rx * S); r.addColorStop(0, `rgba(255,255,255,${a})`); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-rx * S, -rx * S, rx * S * 2, rx * S * 2); g.restore(); };
  const line = (pts, w, a) => { g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(u2x(u), v2y(v)) : g.moveTo(u2x(u), v2y(v))); g.stroke(); };
  g.filter = 'blur(3px)';
  for (const sg of [-1, 1]) {
    blob(0.5 + sg * 0.075, 0.66, 0.085, 0.07, 0.75);                                               // pecs
    line([[0.5 + sg * 0.01, 0.56], [0.5 + sg * 0.07, 0.555], [0.5 + sg * 0.14, 0.6], [0.5 + sg * 0.17, 0.67]], 7, 0.55); // under the pecs
    for (let r = 0; r < 3; r++) blob(0.5 + sg * 0.03, 0.47 - r * 0.1, 0.03, 0.04, 0.55);            // abs
    line([[0.5 + sg * 0.115, 0.52], [0.5 + sg * 0.1, 0.3], [0.5 + sg * 0.065, 0.12]], 6, 0.4);     // obliques
    for (let r = 0; r < 3; r++) line([[0.5 + sg * 0.125, 0.53 - r * 0.05], [0.5 + sg * 0.15, 0.55 - r * 0.05]], 4, 0.3); // serratus
    blob(sg > 0 ? 0.82 : 0.18, 0.55, 0.1, 0.14, 0.45);                                             // lats
    blob(sg > 0 ? 0.88 : 0.12, 0.78, 0.07, 0.06, 0.4);                                             // shoulder blades
    blob(0.5 + sg * 0.22, 0.86, 0.09, 0.06, 0.45);                                                 // traps / collarbones
  }
  line([[0.5, 0.74], [0.5, 0.15]], 5, 0.5);                                                        // linea alba
  for (let r = 0; r < 3; r++) line([[0.47, 0.42 - r * 0.1], [0.53, 0.42 - r * 0.1]], 4, 0.45);      // ab rows
  line([[0.0, 0.95], [0.0, 0.1]], 8, 0.5); line([[1.0, 0.95], [1.0, 0.1]], 8, 0.5);                // spine groove
  g.filter = 'none';
  const hd = g.getImageData(0, 0, S, S).data, h = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  const nc = canvas(S, S), ng = nc.getContext('2d'), nd = ng.createImageData(S, S);
  const ac = canvas(S, S), ag = ac.getContext('2d'), ad = ag.createImageData(S, S), sk = rgb(c.skin).map((v, i) => v * [0.8, 0.78, 0.8][i]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, dx = (h(x + 1, y) - h(x - 1, y)) * 5, dy = (h(x, y + 1) - h(x, y - 1)) * 5, l = Math.hypot(dx, dy, 1);
    nd.data[i] = (-dx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
    const occ = 0.8 + 0.4 * h(x, y) + (hash(x, y) - 0.5) * 0.05; // creases darker, mounds lighter
    for (let k = 0; k < 3; k++) ad.data[i + k] = clamp(sk[k] * occ, 0, 255); ad.data[i + 3] = 255;
  }
  ng.putImageData(nd, 0, 0); ag.putImageData(ad, 0, 0);
  const nt = new THREE.CanvasTexture(nc), at = new THREE.CanvasTexture(ac); at.colorSpace = THREE.SRGBColorSpace; nt.anisotropy = at.anisotropy = 4;
  return { normal: nt, albedo: at };
}
// shared by the bare torso / arms and the bare legs: skinned vertices on the base skeleton, rings stitched into quads
function skinBuilder() {
  let body = null; base.scene.traverse(o => { if (o.isSkinnedMesh && o.name === 'Wolf3D_Body') body = o; });
  const bones = body.skeleton.bones, bi = {}; bones.forEach((b, i) => { bi[boneKey(b.name)] = i; });
  const pos = [], uv = [], idx = [], sI = [], sW = [];
  const push = (p, u, v, w) => { pos.push(p.x, p.y, p.z); uv.push(u, v); const e = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 4), t = e.reduce((a, b) => a + b[1], 0) || 1;
    for (let k = 0; k < 4; k++) { sI.push(e[k] ? bi[e[k][0]] || 0 : 0); sW.push(e[k] ? e[k][1] / t : 0); } };
  // stitch rings into quads, facing outward (checked on the first quad against the first ring's centre)
  const grid = (rows, cols, base0, ctr) => {
    const p3 = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), a0 = p3(base0), nrm = new THREE.Vector3().crossVectors(p3(base0 + cols).sub(a0), p3(base0 + 1).sub(a0));
    const flip = nrm.dot(a0.clone().sub(ctr)) < 0;
    for (let r = 0; r < rows - 1; r++) for (let q = 0; q < cols - 1; q++) { const a = base0 + r * cols + q, b = a + cols; if (flip) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  };
  const finish = (c, groups) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
    geo.setIndex(idx); groups.forEach(([a, n, m]) => geo.addGroup(a, n, m));
    reshape(geo, bones, new THREE.Matrix4().copy(body.matrixWorld).invert(), Object.assign({}, shapeOf(c), { front: {}, back: {}, sag: {} }));
    geo.computeVertexNormals(); geo.userData.keep = true;
    return geo;
  };
  return { pos, idx, push, grid, finish };
}
// tee: the same body a little looser and smoother (cloth over it), with short sleeves standing off the upper arm
const SLEEVE_END = 0.42; // how far down the upper arm the sleeve reaches (0 = shoulder, 1 = elbow)
function muscleBody(c, tee) {
  const key = c.id + (tee ? ':tee' : ''); if (muscleCache[key]) return muscleCache[key];
  const B = skinBuilder(), { pos, idx, push, grid } = B, R = base.rest;
  // torso
  const N = 48, n = 2.6, rows = 34, spineW = y => { const w = {}; for (let i = 0; i < SPINE.length - 1; i++) { const [a, ya] = SPINE[i], [b, yb] = SPINE[i + 1]; if (y <= yb || i === SPINE.length - 2) { const t = clamp((y - ya) / (yb - ya), 0, 1); w[a] = 1 - t; w[b] = t; return w; } } return w; };
  const prof = y => { let i = 0; while (i < TORSO.length - 2 && TORSO[i + 1][0] < y) i++; const A = TORSO[i], B = TORSO[i + 1], t = clamp((y - A[0]) / (B[0] - A[0]), 0, 1), e = t * t * (3 - 2 * t); return [lerp(A[1], B[1], e), lerp(A[2], B[2], e), lerp(A[3], B[3], e)]; };
  const t0 = pos.length / 3, P = new THREE.Vector3(), detail = tee ? 0.45 : 1;
  for (let r = 0; r < rows; r++) {
    const y = lerp(TORSO[0][0], TORSO[TORSO.length - 1][0], r / (rows - 1)), cz = y < 1.35 ? lerp(0.01, -0.004, (y - 0.95) / 0.4) : lerp(-0.004, -0.03, (y - 1.35) / 0.21);
    let [hw, df, db] = prof(y);
    if (tee) { const loose = clamp((1.5 - y) / 0.08, 0, 1); hw += 0.011 * loose; df += 0.012 * loose; db += 0.01 * loose; } // the neckline stays snug
    for (let q = 0; q <= N; q++) {
      const ph = (q / N) * Math.PI * 2 - Math.PI, sp = Math.sin(ph), cp = Math.cos(ph), front = cp > 0;
      let x = hw * Math.sign(sp) * Math.pow(Math.abs(sp), 2 / n), z = (front ? df : db) * Math.sign(cp) * Math.pow(Math.abs(cp), 2 / n);
      if (front && y > 1.28 && y < 1.44) z += detail * 0.02 * Math.sin((y - 1.28) / 0.16 * Math.PI) * (Math.exp(-(((x - 0.075) / 0.06) ** 2)) + Math.exp(-(((x + 0.075) / 0.06) ** 2))); // pecs
      if (front && y > 1.26 && y < 1.45) z -= detail * 0.006 * Math.exp(-((x / 0.014) ** 2));            // sternum
      if (!front) z += detail * 0.008 * Math.exp(-((x / 0.02) ** 2));                                        // spine groove
      P.set(x, y, cz + z);
      const w = spineW(y), sh = clamp((Math.abs(x) - 0.11) / 0.07, 0, 1) * clamp((y - 1.36) / 0.1, 0, 1), side = x > 0 ? 'Left' : 'Right';
      if (sh > 0) { for (const k in w) w[k] *= 1 - sh * 0.7; w[side + 'Shoulder'] = sh * 0.45; w[side + 'Arm'] = sh * 0.25; }
      push(P, q / N, (y - TORSO[0][0]) / (TORSO[TORSO.length - 1][0] - TORSO[0][0]), w);
    }
  }
  grid(rows, N + 1, t0, new THREE.Vector3(0, TORSO[0][0], 0.01));
  const groups = [[0, idx.length, 0]];
  // arms: rings along shoulder -> elbow -> wrist (upper arms are material 2, so a tee can put sleeves on them)
  const A = new THREE.Vector3(), D = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3(), F = new THREE.Vector3(0, 0, 1);
  for (const side of ['Left', 'Right']) {
    const sg = side === 'Left' ? 1 : -1;
    const segs = [[side + 'Arm', side + 'ForeArm', [[-0.12, 0.06], [0, 0.068], [0.15, 0.062], [0.35, 0.053], [0.52, 0.055], [0.75, 0.046], [0.97, 0.041]], 0.5],
                  [side + 'ForeArm', side + 'Hand', [[-0.04, 0.041], [0.2, 0.047], [0.45, 0.043], [0.75, 0.035], [1.04, 0.029]], 0.3]];
    for (const [a, b, rad, bulge] of segs) {
      const upper = !a.endsWith('ForeArm'), i0 = idx.length;
      const pa = R[a], pb = R[b]; D.subVectors(pb, pa); const len = D.length(); D.normalize();
      U.crossVectors(D, F).normalize(); V.crossVectors(U, D).normalize(); // V ~ the front of the arm
      const NR = 18, M2 = 20, s0 = pos.length / 3, c0 = pa.clone().addScaledVector(D, rad[0][0] * len);
      for (let r = 0; r < NR; r++) {
        const s = lerp(rad[0][0], rad[rad.length - 1][0], r / (NR - 1)), v = r / (NR - 1);
        let k = 0; while (k < rad.length - 2 && rad[k + 1][0] < s) k++;
        const t = clamp((s - rad[k][0]) / (rad[k + 1][0] - rad[k][0]), 0, 1), rr = lerp(rad[k][1], rad[k + 1][1], t * t * (3 - 2 * t));
        A.copy(pa).addScaledVector(D, s * len);
        if (upper && s < 0.15) A.y += 0.012 * (1 - s / 0.15); // deltoid sits up over the joint
        for (let q = 0; q <= M2; q++) {
          const ph = (q / M2) * Math.PI * 2, cf = Math.cos(ph), cs = Math.sin(ph);
          let r2 = rr * (1 + (upper ? 0 : 0.12 * cs * cs));
          if (upper) r2 += 0.009 * bulge * detail * Math.max(0, cf) * Math.exp(-(((s - 0.55) / 0.18) ** 2)); // bicep
          if (upper && tee) r2 += 0.009 * clamp((SLEEVE_END + 0.02 - v) / 0.04, 0, 1) * clamp((v - 0.1) / 0.12, 0, 1); // the sleeve stands off the arm (not up inside the shoulder)
          P.copy(A).addScaledVector(V, cf * r2).addScaledVector(U, cs * r2 * sg);
          const w = {};
          if (!upper) { const e = clamp((0.12 - s) / 0.16, 0, 1), h2 = clamp((s - 0.85) / 0.2, 0, 1) * 0.35; w[a] = 1 - e * 0.5 - h2; w[side + 'Arm'] = e * 0.5; w[side + 'Hand'] = h2; }
          else { const st = clamp((0.08 - s) / 0.2, 0, 1), el = clamp((s - 0.82) / 0.18, 0, 1) * 0.5; w[a] = 1 - st * 0.45 - el; w[side + 'Shoulder'] = st * 0.45; w[side + 'ForeArm'] = el; }
          push(P, q / M2, v, w);
        }
      }
      grid(NR, M2 + 1, s0, c0);
      groups.push([i0, idx.length - i0, upper ? 2 : 1]);
    }
  }
  return (muscleCache[key] = { geo: B.finish(c, groups), tex: muscleTextures(c) });
}
// shorts: bare legs from mid-thigh (inside the shorts) down into the shoes; thighs are v 0..0.5 of the texture, shins 0.5..1
const legsCache = {};
function legsBody(c) {
  if (legsCache[c.id]) return legsCache[c.id];
  const B = skinBuilder(), { pos, push, grid } = B, R = base.rest;
  const A = new THREE.Vector3(), D = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3(), F = new THREE.Vector3(0, 0, 1), P = new THREE.Vector3();
  for (const side of ['Left', 'Right']) {
    const segs = [[side + 'UpLeg', side + 'Leg', [[0.6, 0.054], [0.8, 0.053], [0.92, 0.051], [1.03, 0.049]], 0],
                  [side + 'Leg', side + 'Foot', [[-0.06, 0.049], [0.12, 0.05], [0.3, 0.056], [0.5, 0.05], [0.75, 0.04], [0.92, 0.034], [1.02, 0.033]], 0.5]];
    for (const [a, b, rad, v0] of segs) {
      const shin = v0 > 0, pa = R[a], pb = R[b]; D.subVectors(pb, pa); const len = D.length(); D.normalize();
      U.crossVectors(D, F).normalize(); V.crossVectors(U, D).normalize(); // V ~ the front of the leg
      const NR = 16, M2 = 20, s0 = pos.length / 3, c0 = pa.clone().addScaledVector(D, rad[0][0] * len);
      for (let r = 0; r < NR; r++) {
        const s = lerp(rad[0][0], rad[rad.length - 1][0], r / (NR - 1));
        let k = 0; while (k < rad.length - 2 && rad[k + 1][0] < s) k++;
        const t = clamp((s - rad[k][0]) / (rad[k + 1][0] - rad[k][0]), 0, 1), rr = lerp(rad[k][1], rad[k + 1][1], t * t * (3 - 2 * t));
        A.copy(pa).addScaledVector(D, s * len);
        for (let q = 0; q <= M2; q++) {
          const ph = (q / M2) * Math.PI * 2, cf = Math.cos(ph), cs = Math.sin(ph);
          let r2 = rr;
          if (shin) r2 += 0.008 * Math.max(0, -cf) * Math.exp(-(((s - 0.3) / 0.16) ** 2)); // calf at the back
          else r2 += 0.006 * Math.max(0, cf) * Math.exp(-(((s - 0.75) / 0.2) ** 2));      // quad at the front
          P.copy(A).addScaledVector(V, cf * r2).addScaledVector(U, cs * r2);
          const w = {};
          if (shin) { const e = clamp((0.1 - s) / 0.16, 0, 1) * 0.5, h2 = clamp((s - 0.85) / 0.2, 0, 1) * 0.4; w[a] = 1 - e - h2; w[side + 'UpLeg'] = e; w[side + 'Foot'] = h2; }
          else { const e = clamp((s - 0.86) / 0.2, 0, 1) * 0.5; w[a] = 1 - e; w[side + 'Leg'] = e; }
          push(P, q / M2, v0 + 0.5 * r / (NR - 1), w);
        }
      }
      grid(NR, M2 + 1, s0, c0);
    }
  }
  return (legsCache[c.id] = B.finish(c, []));
}
// skin for the bare legs, with socks if the look has them
const legTexCache = {};
function legTexture(c, socks) {
  const key = c.id + (socks || ''); if (legTexCache[key]) return legTexCache[key];
  const W = 64, H = 256, cv = canvas(W, H), g = cv.getContext('2d'), sk = rgb(c.skin).map((v, i) => Math.round(v * [0.88, 0.84, 0.84][i]));
  g.fillStyle = `rgb(${sk})`; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,235,220' : '60,30,20'},0.05)`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  g.fillStyle = 'rgba(80,40,30,0.12)'; g.fillRect(0, H * 0.48, W, H * 0.04); // the knee
  if (socks) { // v 0.86..1 is the bottom of the canvas
    g.fillStyle = socks; g.fillRect(0, H * 0.86, W, H * 0.14);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < W; x += 4) g.fillRect(x, H * 0.86, 2, H * 0.14); // ribbing
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, H * 0.86, W, 3);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; // v grows downward on the canvas (thigh at the top)
  return (legTexCache[key] = t);
}
// a T-shirt: the shirt over the torso texture with a crew neck and hem, and short sleeves on the upper arms
const teeCache = {};
function teeTextures(c, L) {
  const key = c.id + L.shirt; if (teeCache[key]) return teeCache[key];
  const base0 = muscleBody(c, true).tex.albedo.image, S = base0.width, y = v => (1 - v) * S, col = L.shirt;
  const fabric = (g, v0, v1) => { // cotton: a fine grain plus a few soft folds
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; g.fillRect(Math.random() * S, y(lerp(v0, v1, Math.random())), 2, 1); }
    for (let i = 0; i < 14; i++) { const x = Math.random() * S, gr = g.createLinearGradient(x - 14, 0, x + 14, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 14, y(v1), 28, y(v0) - y(v1)); }
  };
  // torso: shirt everywhere below a crew neckline that dips at the front (u = 0.5)
  const tc = canvas(S, S), tg = tc.getContext('2d'); tg.drawImage(base0, 0, 0);
  const neck = u => 0.955 - 0.05 * ((1 + Math.cos((u - 0.5) * Math.PI * 2)) / 2) ** 2;
  tg.fillStyle = col; tg.beginPath(); tg.moveTo(0, S); for (let i = 0; i <= 64; i++) tg.lineTo(i / 64 * S, y(neck(i / 64))); tg.lineTo(S, S); tg.closePath(); tg.fill();
  fabric(tg, 0, 0.95);
  tg.strokeStyle = shadeHex(col, 0.72); tg.lineWidth = 7; tg.beginPath(); for (let i = 0; i <= 64; i++) tg.lineTo(i / 64 * S, y(neck(i / 64)) + 4); tg.stroke(); // ribbed collar
  tg.fillStyle = 'rgba(0,0,0,0.25)'; tg.fillRect(0, y(0.035), S, 3); // hem stitching
  // upper arm: sleeve from the shoulder (v 0) down to SLEEVE_END, then skin
  const ac = canvas(S, S), ag = ac.getContext('2d'); ag.drawImage(base0, 0, 0);
  ag.fillStyle = col; ag.fillRect(0, y(SLEEVE_END), S, S - y(SLEEVE_END)); fabric(ag, 0, SLEEVE_END);
  ag.fillStyle = shadeHex(col, 0.7); ag.fillRect(0, y(SLEEVE_END) - 1, S, 6); // sleeve hem
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return (teeCache[key] = { torso: mk(tc), sleeve: mk(ac) });
}
// a basketball tank top painted over the bare torso texture (colour, trim, number front and back)
const jerseyCache = {};
function jerseyTexture(c, L) {
  const key = c.id + L.shirt + L.jersey; if (jerseyCache[key]) return jerseyCache[key];
  const base0 = muscleBody(c).tex.albedo.image, S = base0.width, cv = canvas(S, S), g = cv.getContext('2d');
  g.drawImage(base0, 0, 0);
  const y = v => (1 - v) * S, trim = L.trim || '#ffffff';
  g.fillStyle = L.shirt; g.fillRect(0, y(0.86), S, y(0) - y(0.86));
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 1400; i++) g.fillRect(Math.random() * S, y(Math.random() * 0.86), 2, 2); // mesh fabric
  // arm holes and a scoop neck show skin again
  g.globalCompositeOperation = 'destination-out';
  for (const u of [0.25, 0.75]) { g.beginPath(); g.ellipse(u * S, y(0.8), S * 0.11, S * 0.16, 0, 0, 7); g.fill(); }
  g.beginPath(); g.ellipse(0.5 * S, y(0.92), S * 0.09, S * 0.12, 0, 0, 7); g.fill();
  g.globalCompositeOperation = 'destination-over'; g.drawImage(base0, 0, 0); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = trim; g.lineWidth = 6;
  for (const u of [0.25, 0.75]) { g.beginPath(); g.ellipse(u * S, y(0.8), S * 0.11, S * 0.16, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
  g.beginPath(); g.ellipse(0.5 * S, y(0.92), S * 0.09, S * 0.12, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${S * 0.16}px Impact, Oswald, "Arial Black", sans-serif`; g.lineWidth = 8; g.strokeStyle = trim; g.fillStyle = L.num || '#ffffff';
  for (const [u, sc] of [[0.5, 1], [0, 1.2], [1, 1.2]]) { g.save(); g.translate(u * S, y(0.58)); g.scale(sc * 0.8, sc); g.strokeText(L.jersey, 0, 0); g.fillText(L.jersey, 0, 0); g.restore(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (jerseyCache[key] = t);
}

// ---------- accessories (built in model space, then hung on a bone) ----------
const SKULL = { c: new THREE.Vector3(0, 1.715, 0.006), r: new THREE.Vector3(0.083, 0.128, 0.103) };
// alpha strands for hair cards (white: the material colour tints it)
let HAIR_TEX = null;
function hairTex() {
  if (HAIR_TEX) return HAIR_TEX;
  HAIR_TEX = kit.canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * w, end = h * (0.55 + Math.random() * 0.45), a = 0.55 + Math.random() * 0.45, k = Math.random() < 0.3 ? 150 : 255;
      g.strokeStyle = `rgba(${k},${k},${k},${a})`; g.lineWidth = 1.5 + Math.random() * 3.5;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (Math.random() - 0.5) * 30, end * 0.35, x + (Math.random() - 0.5) * 30, end * 0.7, x + (Math.random() - 0.5) * 24, end); g.stroke();
    }
  });
  return HAIR_TEX;
}
// a point on the skull ellipsoid: yaw around the head (0 = facing forward, +z), pitch from the crown (0 = top)
function skullPoint(yaw, pitch, out, lift = 1) {
  const sp = Math.sin(pitch);
  return out.set(SKULL.c.x + Math.sin(yaw) * sp * SKULL.r.x * lift, SKULL.c.y + Math.cos(pitch) * SKULL.r.y * lift, SKULL.c.z + Math.cos(yaw) * sp * SKULL.r.z * lift);
}
// one hair card: a ribbon that runs over the scalp from the crown, then (optionally) hangs down
function hairCard(arr, yaw, p0, p1, lift, width, hang, flare, wig) {
  const pts = [], nrm = [], P = new THREE.Vector3(), Nn = new THREE.Vector3();
  const n1 = 7;
  for (let i = 0; i <= n1; i++) {
    const s = i / n1, pitch = lerp(p0, p1, s), y = yaw + Math.sin(s * 3 + wig) * 0.06;
    skullPoint(y, pitch, P, lift + s * 0.015); pts.push(P.clone());
    nrm.push(Nn.copy(P).sub(SKULL.c).normalize().clone());
  }
  if (hang > 0) {
    const last = pts[pts.length - 1], out = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    for (let i = 1; i <= 6; i++) { const t = i / 6; pts.push(last.clone().add(new THREE.Vector3(0, -hang * t, 0)).addScaledVector(out, flare * t * t + Math.sin(t * 4 + wig) * 0.006)); nrm.push(out.clone()); }
  }
  const base = arr.pos.length / 3, T = new THREE.Vector3(), Sd = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    T.subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
    Sd.crossVectors(T, nrm[i]).normalize().multiplyScalar(width * (1 - 0.55 * t) / 2);
    for (const sg of [-1, 1]) { arr.pos.push(pts[i].x + Sd.x * sg, pts[i].y + Sd.y * sg, pts[i].z + Sd.z * sg); arr.uv.push(sg < 0 ? 0 : 1, t); }
  }
  for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; arr.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
function buildHair(kind) {
  const rnd = (a, b) => a + Math.random() * (b - a), cards = { pos: [], uv: [], idx: [] }, solid = [];
  // cap over the skull, higher at the front so the forehead shows
  const cap = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6);
  cap.rotateX(-0.42); cap.scale(SKULL.r.x * 1.05, SKULL.r.y * 1.02, SKULL.r.z * 1.04); cap.translate(SKULL.c.x, SKULL.c.y + 0.004, SKULL.c.z - 0.004);
  solid.push(cap);
  if (kind === 'buzz') { /* just the cap */ }
  else if (kind === 'swept') { // swept back from the hairline over the crown, tight on the sides
    for (let i = 0; i < 46; i++) { const yaw = rnd(-0.95, 0.95);
      hairCard(cards, yaw, rnd(1.0, 1.12), 0.02, rnd(1.07, 1.14), rnd(0.04, 0.055), 0, 0, Math.random() * 6);
      hairCard(cards, yaw + Math.PI, 0.02, rnd(0.75, 1.05), rnd(1.06, 1.12), rnd(0.04, 0.055), 0, 0, Math.random() * 6); }
    for (const sg of [-1, 1]) for (let i = 0; i < 10; i++) hairCard(cards, sg * rnd(1.2, 2.0), rnd(0.55, 0.75), rnd(1.15, 1.35), 1.03, 0.04, 0, 0, Math.random() * 6);
  }
  else if (kind === 'messy') {
    for (let i = 0; i < 90; i++) {
      const yaw = (i / 90) * Math.PI * 2 + rnd(-0.08, 0.08), front = Math.cos(yaw);
      // fringe falls forward over the forehead to the brows; the rest sweeps down the sides and back
      const p1 = front > 0.5 ? rnd(1.05, 1.3) : front > -0.2 ? rnd(1.25, 1.55) : rnd(1.5, 1.9);
      hairCard(cards, yaw, rnd(0.05, 0.3), p1, front > 0.5 ? rnd(1.04, 1.09) : rnd(1.06, 1.15), rnd(0.035, 0.05), front > 0.5 ? rnd(0.0, 0.02) : rnd(0.01, 0.05), 0.02, Math.random() * 6);
    }
  } else if (kind === 'long') {
    for (let i = 0; i < 110; i++) {
      const yaw = (i / 110) * Math.PI * 2 + rnd(-0.05, 0.05), front = Math.cos(yaw);
      const fr = front > 0.45; // parted in the middle; strands frame the face
      hairCard(cards, yaw, rnd(0.03, 0.2), fr ? rnd(0.85, 1.05) : rnd(1.35, 1.6), rnd(1.05, 1.13), rnd(0.045, 0.06), fr ? 0 : rnd(0.24, 0.34), fr ? 0 : rnd(0.03, 0.07), Math.random() * 6);
    }
    for (const sg of [-1, 1]) for (let i = 0; i < 8; i++) { const yaw = sg * rnd(0.75, 1.05); hairCard(cards, yaw, rnd(0.15, 0.35), rnd(1.2, 1.4), rnd(1.1, 1.16), 0.05, rnd(0.22, 0.3), 0.04, Math.random() * 6); }
  } else if (kind === 'curly') {
    const ball = new THREE.SphereGeometry(1, 7, 5), P = new THREE.Vector3();
    for (let i = 0; i < 300; i++) {
      const yaw = Math.random() * Math.PI * 2, front = Math.cos(yaw), pitch = front > 0.55 ? rnd(0.05, 0.85) : rnd(0.05, 1.45);
      skullPoint(yaw, pitch, P, rnd(1.04, 1.24));
      const r = rnd(0.012, 0.021), g = ball.clone(); g.scale(r, r * rnd(0.8, 1.3), r); g.rotateY(Math.random() * 3); g.translate(P.x, P.y, P.z); solid.push(g);
    }
    for (let i = 0; i < 16; i++) { skullPoint(rnd(-0.7, 0.7), rnd(0.85, 1.0), P, 1.07); const r = rnd(0.011, 0.016), g = ball.clone(); g.scale(r, r * 1.4, r); g.translate(P.x, P.y - 0.008, P.z + 0.006); solid.push(g); }
  } else if (kind === 'locs') {
    const P = new THREE.Vector3();
    for (let i = 0; i < 54; i++) {
      const yaw = (i * 2.399) % (Math.PI * 2), front = Math.cos(yaw), pitch = front > 0.5 ? rnd(0.35, 0.75) : rnd(0.25, 1.25);
      skullPoint(yaw, pitch, P, 1.03); const root = P.clone(), out = root.clone().sub(SKULL.c).normalize();
      const len = front > 0.5 ? rnd(0.08, 0.12) : rnd(0.18, 0.3), hz = new THREE.Vector3(out.x, 0, out.z).normalize();
      const pts = [root, root.clone().addScaledVector(out, 0.03), root.clone().addScaledVector(hz, 0.045).add(new THREE.Vector3(0, -len * 0.35, 0)), root.clone().addScaledVector(hz, 0.06).add(new THREE.Vector3(0, -len, 0))];
      solid.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, rnd(0.008, 0.011), 5, false));
    }
  }
  const sgeo = mergeGeometries(solid.map(g => g.index ? g : g)); solid.forEach(g => g.dispose());
  let cgeo = null;
  if (cards.pos.length) {
    cgeo = new THREE.BufferGeometry(); cgeo.setAttribute('position', new THREE.Float32BufferAttribute(cards.pos, 3)); cgeo.setAttribute('uv', new THREE.Float32BufferAttribute(cards.uv, 2));
    cgeo.setIndex(cards.idx); cgeo.computeVertexNormals();
  }
  return { solid: sgeo, cards: cgeo };
}
function buildShades() {
  const g = new THREE.Group();
  const shape = new THREE.Shape(), w = 0.027, h = 0.017, r = 0.008;
  shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r); shape.lineTo(w, h - r * 0.5); shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r); shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const lensG = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false, curveSegments: 6 });
  const lensM = kit.std(0x050507, { roughness: 0.06, metalness: 0.85, envMapIntensity: 2 }), frameM = kit.std(0x0d0d10, { roughness: 0.4 });
  for (const s of [-1, 1]) {
    const lens = kit.mesh(lensG, lensM, false); lens.position.set(s * 0.031, 1.727, 0.112); lens.rotation.y = s * 0.12; g.add(lens);
    const rim = kit.mesh(lensG, frameM, false); rim.scale.set(1.12, 1.18, 1); rim.position.set(s * 0.031, 1.728, 0.109); rim.rotation.y = s * 0.12; g.add(rim);
    const arm = kit.mesh(kit.GEO.box, frameM, false); arm.scale.set(0.004, 0.006, 0.11); arm.position.set(s * 0.072, 1.734, 0.06); arm.rotation.y = -s * 0.1; g.add(arm);
  }
  const bridge = kit.mesh(kit.GEO.box, frameM, false); bridge.scale.set(0.012, 0.004, 0.004); bridge.position.set(0, 1.736, 0.114); g.add(bridge);
  return g;
}
function buildChoker(ring, neckK) {
  const g = new THREE.Group(), lea = kit.std(0x0c0c0f, { roughness: 0.35 }), metal = kit.std(0xd8d8e0, { metalness: 1, roughness: 0.25 });
  const band = kit.mesh(new THREE.TorusGeometry(1, 0.16, 8, 36), lea); band.rotation.x = Math.PI / 2; band.scale.set(0.054 * neckK, 0.05 * neckK, 0.054); band.position.set(0, 1.545, 0.006); g.add(band);
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, s = kit.mesh(kit.GEO.sphereLo, metal, false); s.scale.setScalar(0.0045); s.position.set(Math.sin(a) * 0.057 * neckK, 1.545, 0.006 + Math.cos(a) * 0.053 * neckK); g.add(s); }
  if (ring) { const r = kit.mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 20), metal, false); r.position.set(0, 1.524, 0.062 * neckK); g.add(r); }
  return g;
}
// a necklace: the lower half of a ring, lying on the chest
function buildChain(color, chestK) {
  const g = new THREE.TorusGeometry(0.095, 0.0055, 6, 40, Math.PI); g.rotateZ(Math.PI);
  const m = kit.mesh(g, kit.std(color, { metalness: 1, roughness: 0.22 }));
  m.rotation.x = -0.55; m.scale.set(0.9 * chestK, 1, 1); m.position.set(0, 1.5, 0.07 * chestK); return m;
}
function buildSword() {
  const g = new THREE.Group();
  const blade = kit.mesh(kit.GEO.box, kit.std(0xe8ecf5, { metalness: 1, roughness: 0.15, emissive: 0x6a2aa0, emissiveIntensity: 0.9 })); blade.scale.set(0.012, 0.05, 1); blade.position.z = 0.5; g.add(blade);
  const guard = kit.mesh(kit.GEO.box, kit.std(0xc9a227, { metalness: 1, roughness: 0.3 })); guard.scale.set(0.05, 0.2, 0.03); g.add(guard);
  const grip = kit.mesh(kit.GEO.box, kit.std(0x3a2418)); grip.scale.set(0.04, 0.04, 0.12); grip.position.z = -0.07; g.add(grip);
  return g;
}
function textCard(text, w, h, col) {
  return kit.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.7, map: kit.canvasTex(256, Math.round(256 * h / w), (g, cw, ch) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${ch * 0.9}px Impact, Oswald, "Arial Black", sans-serif`; g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 6; g.strokeText(text, cw / 2, ch / 2); g.fillText(text, cw / 2, ch / 2);
  }) }), false);
}

// ---------- the fighter ----------
const AIM = {}; // bone -> the child bone that sets its direction
for (const s of ['Left', 'Right']) Object.assign(AIM, { [s + 'Shoulder']: s + 'Arm', [s + 'Arm']: s + 'ForeArm', [s + 'ForeArm']: s + 'Hand', [s + 'Hand']: s + 'HandMiddle1', [s + 'UpLeg']: s + 'Leg', [s + 'Leg']: s + 'Foot', [s + 'Foot']: s + 'ToeBase' });
Object.assign(AIM, { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End' });

// turned to stone: every material gets a uniform that swaps its albedo (texture and all) for grey stone that keeps the texture's light and dark
// shorts: everything of a mesh below a height (in its bind pose, so it moves with the legs) is cut away
function cutBelow(m, y) {
  const u = m.userData.cutU = { value: y };
  m.onBeforeCompile = sh => { sh.uniforms.uCutY = u;
    sh.vertexShader = 'varying float vBindY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBindY = position.y;');
    sh.fragmentShader = 'varying float vBindY;\nuniform float uCutY;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', 'if (vBindY < uCutY) discard;\n#include <clipping_planes_fragment>'); };
}
// fur: stacked shells of the body pushed out along the normals, each thinner (alpha-tested strand noise) than the last
let FUR_TEX = null;
function furTex() {
  if (FUR_TEX) return FUR_TEX;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), id = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = Math.pow(Math.random(), 0.8) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0);
  const t = FUR_TEX = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}
function furMat(rootCol, tipCol, k, len, thin) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(rootCol).lerp(new THREE.Color(tipCol), k * 0.55), alphaMap: furTex(), alphaTest: 0.2 + (thin || 0.7) * k, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const u = m.userData.shellU = { value: len * k };
  m.onBeforeCompile = sh => { sh.uniforms.uShell = u; sh.vertexShader = 'uniform float uShell;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * uShell;'); };
  m.customProgramCacheKey = () => 'fur';
  return m;
}
function furShells(src, n, len, rootCol, tipCol, mats) {
  for (let i = 1; i <= n; i++) {
    const m = furMat(rootCol, tipCol, i / n, len), sk = new THREE.SkinnedMesh(src.geometry, m);
    sk.frustumCulled = false; sk.castShadow = false; sk.name = 'Fur'; src.parent.add(sk); sk.bind(src.skeleton, src.bindMatrix); mats.push(m);
  }
}
function stoneable(m) {
  if (!m.color || m.isShaderMaterial || m.userData.stoneU) return;
  const u = m.userData.stoneU = { value: 0 }, prev = m.userData.cutU || m.userData.shellU ? m.onBeforeCompile : null;
  m.customProgramCacheKey = () => (m.userData.cutU ? 'stone-cut' : 'stone') + (m.userData.shellU ? '-fur' : '');
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.uStone = u;
    sh.fragmentShader = 'uniform float uStone;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { float sl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${STONE.r}, ${STONE.g}, ${STONE.b}) * (0.72 + 0.55 * sqrt(sl)), uStone); }`); };
}
export class Human {
  constructor(f) {
    const c = f.c; this.c = c;
    const furry = f.furT > 0 && c.id === 'blake';
    const L = this.L = furry && !lookOf(c, f.skin).furBody ? lookOf(c, 1) : lookOf(c, f.skin);
    this.key = f.ci + ':' + f.skin + ':' + (furry ? 1 : 0);
    const src = this.src = avatars[c.id] || base, dressed = src === base;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.model = cloneSkinned(src.scene); this.model.rotation.y = Math.PI / 2; this.body.add(this.model);
    this.mats = []; this.own = []; this.morph = [];
    this.bones = {}; this.model.traverse(o => { if (o.isBone) this.bones[boneKey(o.name)] = o; });
    this.restQ = {}; this.childDir = {};
    for (const k in this.bones) this.restQ[k] = this.bones[k].quaternion.clone();
    for (const k in AIM) { const b = this.bones[k], ch = this.bones[AIM[k]]; if (b && ch) this.childDir[k] = ch.position.clone().normalize(); }
    this.H = src.top; // model height to the top of the skull
    const geos = dressed ? bodyGeometry(c) : {}, tex = dressed ? outfitTextures(c, L, this.key) : null, animal = !!L.head;
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      o.material = o.material.clone(); this.mats.push(o.material);
      if (o.morphTargetDictionary && o.morphTargetDictionary.mouthOpen !== undefined) this.morph.push(o);
      if (!dressed) return;
      const mn = o.material.name;
      if (geos[o.name]) o.geometry = geos[o.name];
      if (mn === 'Wolf3D_Headwear' || mn === 'Wolf3D_Beard') o.visible = false;
      if (animal && /Head|Eye|Teeth/.test(o.name)) o.visible = false;
      if (mn === 'Wolf3D_Skin') { o.material.map = faceTexture(c); o.material.roughness = 0.62; }
      if (mn === 'Wolf3D_Body') { o.material.map = null; o.material.color.set(L.furBody ? L.fur : c.skin).multiply(new THREE.Color(0.93, 0.86, 0.83)); }
      if (mn === 'Wolf3D_Outfit_Top') { o.material.map = tex.top; if (L.shirtless || L.tee) o.visible = false; }
      if (mn === 'Wolf3D_Outfit_Bottom') { o.material.map = tex.bottom; if (L.shorts) { cutBelow(o.material, typeof L.shorts === 'number' ? L.shorts : 0.6); o.material.side = THREE.DoubleSide; } }
      if (mn === 'Wolf3D_Body' && L.shorts) cutBelow(o.material, 0.31); // its ankle pieces would poke through the bare legs
      if (mn === 'Wolf3D_Outfit_Footwear') { o.material.map = tex.shoes; if (L.barefoot) o.visible = false; }
      if (/Outfit/.test(mn)) { if (L.shirt === '#c9a227' && !L.tee) { o.material.metalness = 0.75; o.material.roughness = 0.32; } if (L.furBody) { o.material.roughness = 1; o.material.metalnessMap = null; o.material.metalness = 0; } }
      if (mn === 'Wolf3D_Eye' && FACE[c.id] && FACE[c.id].shades) o.visible = false;
    });
    // fists
    for (const k in this.bones) {
      const m = /Hand(Index|Middle|Ring|Pinky)(\d)$/.exec(k), t = /HandThumb(\d)$/.exec(k);
      if (m) { this.openQ = this.openQ || {}; this.openQ[k] = this.restQ[k].clone(); this.restQ[k] = this.restQ[k].clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), m[2] === '1' ? 1.35 : 1.45)); }
      else if (t) this.restQ[k] = this.restQ[k].clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5));
      if (m || t) this.bones[k].quaternion.copy(this.restQ[k]);
    }
    let body = null; this.model.traverse(o => { if (o.isSkinnedMesh && o.name === 'Wolf3D_Body') body = o; });
    const addSkinned = (geo, mats, name) => { const sk = new THREE.SkinnedMesh(geo, mats); sk.castShadow = true; sk.frustumCulled = false; sk.name = name;
      body.parent.add(sk); sk.bind(body.skeleton, body.bindMatrix); for (const m of [].concat(mats)) if (!this.mats.includes(m)) this.mats.push(m); };
    if (dressed && (L.shirtless || L.tee)) {
      const mb = muscleBody(c, !!L.tee), skinMat = new THREE.MeshStandardMaterial({ map: mb.tex.albedo, normalMap: mb.tex.normal, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.46, metalness: 0 });
      let torsoMat = skinMat, upperMat = skinMat;
      if (L.tee) { // cotton, or satin for the gold one
        const tt = teeTextures(c, L), gold = L.shirt === '#c9a227', cloth = { roughness: gold ? 0.42 : 0.88, metalness: gold ? 0.35 : 0 };
        torsoMat = new THREE.MeshStandardMaterial(Object.assign({ map: tt.torso }, cloth)); upperMat = new THREE.MeshStandardMaterial(Object.assign({ map: tt.sleeve }, cloth));
      } else if (L.jersey) torsoMat = new THREE.MeshStandardMaterial({ map: jerseyTexture(c, L), normalMap: mb.tex.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.7, metalness: 0 });
      addSkinned(mb.geo, [torsoMat, skinMat, upperMat], L.tee ? 'Tee' : 'BareTorso');
    }
    if (dressed && L.shorts) addSkinned(legsBody(c), new THREE.MeshStandardMaterial({ map: legTexture(c, L.socks), roughness: 0.55, metalness: 0 }), 'BareLegs');
    if (dressed && L.shells) { // fur all over: the suit, the hands and neck
      const furry = []; this.model.traverse(o => { if (o.isSkinnedMesh && o.visible && !o.geometry.morphAttributes.position && /Wolf3D_(Body|Outfit_Top|Outfit_Bottom)/.test(o.material.name) && !o.material.userData.cutU) furry.push(o); });
      furry.forEach(o => furShells(o, 6, 0.016, shadeHex(L.fur, 0.78), L.furLight, this.mats));
    }
    if (dressed) this.accessorize(c, L, animal);
    const fx3 = kit.fx3();
    this.shadowBlob = kit.mesh(kit.GEO.disc, new THREE.MeshBasicMaterial({ map: fx3.blobTex, transparent: true, depthWrite: false, opacity: 0.7 }), false);
    this.shadowBlob.rotation.x = -Math.PI / 2; this.shadowBlob.renderOrder = 1;
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3.glowTex, color: c.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    this.root.add(this.aura);
    for (const m of this.mats) { if (m.emissive) { m.userData.e0 = m.emissive.clone(); m.userData.i0 = m.emissiveIntensity; } if (m.color) { m.userData.c0 = m.color.clone(); m.userData.r0 = m.roughness; } stoneable(m); }
  }
  // hang an object (built in model space) on a bone so it follows the animation
  hang(boneName, obj) {
    const b = this.bones[boneName]; if (!b) return obj;
    const holder = new THREE.Group();
    this.model.updateMatrixWorld(true);
    // the model's rest transform relative to the bone (bones are in their rest pose here)
    _m.copy(this.model.matrixWorld).invert().multiply(b.matrixWorld).invert();
    holder.matrixAutoUpdate = true; holder.applyMatrix4(_m);
    holder.add(obj); b.add(holder); return obj;
  }
  accessorize(c, L, animal) {
    const F = FACE[c.id] || {}, sh = shapeOf(c);
    const M = (color, o) => { const m = kit.std(color, o); this.mats.push(m); return m; };
    const keep = o => { o.traverse(x => { if (x.isMesh) { if (x.material && !this.mats.includes(x.material)) this.mats.push(x.material); x.castShadow = true; } }); return o; };
    if (animal) {
      const head = new THREE.Group(); kit.animalHead(head, L, M);
      head.rotation.y = -Math.PI / 2; head.scale.setScalar(0.13); head.position.copy(SKULL.c).add(new THREE.Vector3(0, -0.01, 0.01));
      this.hang('Head', keep(head));
    } else {
      if (L.boxersHat) this.hang('Head', keep(buildBoxersHat(L.boxersHat, L.print || '#e0262f'))); // no hair: there's a pair of boxers on his head
      else {
      const hcol = F.hairCol || c.hair, HG = buildHair(F.hair || 'messy'), dark = rgb(hcol).reduce((a, v) => a + v, 0) < 120; // black hair: less sheen, so the cards don't flash grey
      this.hang('Head', kit.mesh(HG.solid, M(hcol, { roughness: dark ? 0.85 : 0.75 })));
      if (HG.cards) this.hang('Head', kit.mesh(HG.cards, M(hcol, { roughness: dark ? 0.8 : 0.5, map: hairTex(), alphaTest: 0.35, side: THREE.DoubleSide })));
      }
      if (F.shades) this.hang('Head', keep(buildShades()));
      if (L.headband) { const hb = kit.mesh(new THREE.TorusGeometry(1, 0.1, 8, 32), M(L.headband)); hb.rotation.x = Math.PI / 2 - 0.35; hb.scale.set(SKULL.r.x * 1.12, SKULL.r.z * 1.1, 0.12); hb.position.set(0, SKULL.c.y + 0.045, SKULL.c.z + 0.005); this.hang('Head', hb); }
    }
    if (L.barefoot) for (const sd of ['Left', 'Right']) this.hang(sd + 'Foot', keep(buildFoot(sd, c.skin)));
    if (F.choker && !L.furBody) this.hang('Neck', keep(buildChoker(c.id === 'julian', sh.k.Neck)));
    if (L.chain) this.hang('Spine2', keep(buildChain(L.chain, sh.k.Spine2 * (L.shirtless ? 1.25 : L.tee ? 1.33 : 1))));
    if (c.sword) { this.sword = buildSword(); this.sword.position.set(0, 0.93, 0.14 * sh.k.Hips); this.sword.rotation.x = -0.28; this.sword.scale.setScalar(0.62); this.hang('Hips', keep(this.sword)); }
    if (L.jersey && !L.shirtless) {
      const fr = textCard(L.jersey, 0.16, 0.13, '#ffffff'); fr.position.set(0, 1.3, 0.155 * sh.k.Spine2); this.hang('Spine2', keep(fr));
      const bk = textCard(L.jersey, 0.2, 0.16, '#ffffff'); bk.position.set(0, 1.32, -0.14 * sh.k.Spine2); bk.rotation.y = Math.PI; this.hang('Spine2', keep(bk));
    }
    if (L.briefs) { const b = kit.mesh(kit.GEO.sphere, M(L.briefs, { roughness: 0.6 })); b.scale.set(0.17 * sh.k.Hips, 0.1, 0.13 * sh.k.Hips); b.position.set(0, 0.93, 0.012); this.hang('Hips', b); }
    if (L.cape) {
      this.capeGeo = new THREE.PlaneGeometry(1, 1, 5, 10); this.own.push(this.capeGeo);
      this.cape = kit.mesh(this.capeGeo, M(L.cape, { side: THREE.DoubleSide, roughness: 0.6 })); this.cape.frustumCulled = false; this.hang('Spine2', this.cape);
      this.capeW = 0.36 * sh.k.Spine2;
    }
    if (L.tail) {
      const tM = M(L.fur, { roughness: 0.95 }), tipM = M(L.furLight, { roughness: 0.95 }), g = new THREE.Group();
      const n = L.shells ? 14 : 10; this.tail = [];
      for (let i = 0; i < n; i++) {
        const m = kit.mesh(kit.GEO.sphere, i >= n - 2 ? tipM : tM); g.add(m); this.tail.push(m);
        if (L.shells) for (let j = 1; j <= 3; j++) { const fm = furMat(i >= n - 2 ? L.furLight : L.fur, L.furLight, j / 3, 0, 0.55); this.mats.push(fm); const fl = kit.mesh(kit.GEO.sphere, fm, false); fl.scale.setScalar(1 + j * 0.12); m.add(fl); }
      }
      g.position.set(0, 0.95, -0.12 * sh.k.Hips); this.hang('Hips', g);
    }
  }
  dispose() {
    this.root.removeFromParent(); this.shadowBlob.removeFromParent();
    this.root.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); });
    this.mats.forEach(m => m.dispose()); this.own.forEach(o => o.dispose());
    this.shadowBlob.material.dispose(); this.aura.material.dispose();
  }
  // point a bone (in its current parent frame) along a world direction
  aim(name, dir) {
    const b = this.bones[name], cd = this.childDir[name]; if (!b || !cd) return;
    b.updateWorldMatrix(false, false);
    _a.copy(cd).transformDirection(b.matrixWorld);
    _q.setFromUnitVectors(_a, dir);
    _pq.setFromRotationMatrix(_m.extractRotation(b.parent.matrixWorld));
    b.quaternion.premultiply(_pq).premultiply(_q).premultiply(_pq.invert());
    b.updateWorldMatrix(false, false);
  }
  twist(name, axis, ang) {
    const b = this.bones[name]; if (!b || !ang) return;
    _q.setFromAxisAngle(axis, ang);
    _pq.setFromRotationMatrix(_m.extractRotation(b.parent.matrixWorld));
    b.quaternion.premultiply(_pq).premultiply(_q).premultiply(_pq.invert());
    b.updateWorldMatrix(false, false);
  }
  refresh(name) { const b = this.bones[name]; if (b) b.updateWorldMatrix(false, false); }
  // a direction in the pose frame (x forward, y up, z toward the fighter's right side) -> world
  dir(x, y, z) { return _d.set(x, y, z).transformDirection(this.body.matrixWorld); }
  update(f, scale3 = 1) {
    const c = f.c, F = f.facing, p = Object.assign({}, getPose(f));
    p.ft += p.crouch; p.fs -= p.crouch; p.bt += p.crouch * 0.6; p.bs -= p.crouch * 1.2;
    const tall = (f.h * 0.85 + 28) * U, S = tall / this.H * f.scale, src = this.src;
    const th = src.thigh * S, sh = src.shin * S, ank = src.ankle * S * 0.9;
    const onGround = f.y >= FLOOR - 0.5;
    const depth = (a, b) => th * Math.cos(a) + sh * Math.cos(b);
    const hipY = onGround ? Math.max(depth(p.ft, p.fs), depth(p.bt, p.bs)) + ank : (th + sh) * 0.94 + ank;
    const hop = f.victory && c.id === 'ryan' ? Math.abs(Math.sin(frame / 8)) * 0.14 : 0;
    // finishers can flatten (squash), plant into the floor (sink) or remove (gone) a fighter
    const sq = f.squash || 0;
    this.root.position.set(wx(f.x), wy(f.y) + hop - (f.sink || 0) * tall * 0.5, (f.z || 0) * U); // z: thrown into the background
    this.root.rotation.y = F > 0 ? -YAW : Math.PI + YAW;
    this.root.scale.set(scale3 * (1 + sq * 0.3), scale3 * (1 - sq * 0.62), scale3 * (1 + sq * 0.3));
    this.root.visible = !(f.vanish > 0 && frame % 2) && !f.gone; this.shadowBlob.visible = !f.gone;
    // tumbling turns about the middle of the body in the air, about the feet near the floor (so they land flat)
    const rot = p.rot, piv = f.kd === 1 ? tall * f.scale * 0.5 * clamp(wy(f.y) / (tall * 0.5), 0, 1) : 0;
    this.body.rotation.z = rot;
    this.body.position.set(piv * Math.sin(rot), piv * (1 - Math.cos(rot)) + (rot ? 0.12 * S * Math.abs(Math.sin(rot)) : 0), 0);
    this.model.scale.setScalar(S);
    for (const k in this.childDir) this.bones[k].quaternion.copy(this.restQ[k]);
    this.root.updateMatrixWorld(true);
    // hips: placed so the feet reach the floor
    const hips = this.bones.Hips;
    _v.set((p.lunge || 0) * tall * f.scale * 0.9, hipY, 0); this.body.localToWorld(_v); hips.parent.worldToLocal(_v); hips.position.copy(_v);
    const fr = F > 0 ? 'Right' : 'Left', bk = F > 0 ? 'Left' : 'Right', out = F; // the front limbs are the ones nearest the camera
    const lean = p.lean, td = a => this.dir(Math.sin(a), Math.cos(a), 0);
    // hips and shoulders turn into punches and kicks (the move's tw, plus whichever arm is reaching)
    const tw = clamp(0.32 * (Math.sin(p.fu) - Math.sin(p.bu)) + (p.tw || 0), -1.1, 1.1);
    this.aim('Hips', td(lean * 0.3)); _ax.copy(td(lean * 0.3)); this.twist('Hips', _ax, tw * 0.32 * F);
    this.aim('Spine', td(lean * 0.55)); this.aim('Spine1', td(lean * 0.8)); this.aim('Spine2', td(lean));
    _ax.copy(td(lean)); this.twist('Spine1', _ax, tw * 0.3 * F); this.twist('Spine2', _ax, tw * 0.45 * F);
    this.aim('Neck', td(lean + p.ht * 0.4)); this.aim('Head', td(lean + p.ht));
    _ax.copy(td(lean + p.ht)); this.twist('Head', _ax, -(HEAD_TURN + (p.hy || 0)) * F - tw * 0.65 * F); // hy: turn the face further toward the camera
    const arm = (s, a1, a2, o, hz) => {
      this.refresh(s + 'Shoulder');
      this.aim(s + 'Arm', this.dir(Math.sin(a1), -Math.cos(a1), o * (0.26 + (p.spread || 0) * 1.3 + hz * 0.7)).clone());
      const raise = Math.max(0, -Math.cos(a2));
      const d2 = this.dir(Math.sin(a2), -Math.cos(a2), -o * (0.16 * raise + hz * 1.1)).clone();
      this.aim(s + 'ForeArm', d2); this.aim(s + 'Hand', d2);
    };
    const leg = (s, a1, a2, o) => {
      this.aim(s + 'UpLeg', this.dir(Math.sin(a1), -Math.cos(a1), o * (0.07 + (p.spread || 0) * 0.2)).clone());
      this.aim(s + 'Leg', this.dir(Math.sin(a2), -Math.cos(a2), o * 0.02).clone());
      const fa = a2 + (onGround ? 0.9 : 0.6);
      this.aim(s + 'Foot', this.dir(Math.sin(fa), -Math.cos(fa), 0).clone());
    };
    arm(fr, p.fu, p.fl, out, p.hz || 0); arm(bk, p.bu, p.bl, -out, p.hzb || 0);
    // point: the front hand's index finger straightens out of the fist (pointing, running a finger along the jaw)
    if (this.openQ) { const pt = clamp(p.point || 0, 0, 1); if (pt > 0 || this._pt) { for (let n = 1; n <= 3; n++) { const k = fr + 'HandIndex' + n, b = this.bones[k]; if (b && this.openQ[k]) b.quaternion.copy(this.restQ[k]).slerp(this.openQ[k], pt); } this._pt = pt > 0; } }
    leg(fr, p.ft, p.fs, out); leg(bk, p.bt, p.bs, -out);
    // mouth: shout on supers and hits, smile on the win
    const talk = (cine && cine.side === f.side) || (introSpeaking(f) && Math.floor(frame / 6) % 3 !== 0) ? 0.35 + 0.35 * Math.abs(Math.sin(frame / 3)) : 0;
    const open = Math.max(talk, f.stun > 0 ? 0.55 : 0, f.ko ? 0.25 : 0, f.move && MOVES[f.move] && MOVES[f.move].heavy && f.mt > MOVES[f.move].start - 4 && f.mt < MOVES[f.move].end + 6 ? 0.4 : 0);
    const smile = f.victory ? 0.7 : 0;
    for (const m of this.morph) { const d = m.morphTargetDictionary, inf = m.morphTargetInfluences; inf[d.mouthOpen] = lerp(inf[d.mouthOpen], open, 0.35); if (d.mouthSmile !== undefined) inf[d.mouthSmile] = lerp(inf[d.mouthSmile], smile, 0.2); }
    // the sword wobbles; the tail swishes; the cape flows
    if (this.sword) this.sword.rotation.x = -0.28 + Math.sin(frame / 7) * 0.05 - (f.move === 'thrust' ? 0.25 : 0);
    if (this.tail) {
      const sway = Math.sin(frame / 9) * 0.3, fox = this.L.tail === 'fox';
      const cat = !!this.L.shells, n = this.tail.length;
      this.tail.forEach((m, i) => { const t = (i + 1) / n, a = cat ? 0.4 + t * 2.1 + sway * t * 1.4 : 0.5 + t * 1.3 + sway * t, rr = fox ? 0.03 + Math.sin(t * Math.PI) * 0.035 : cat ? 0.038 + Math.sin(t * Math.PI * 0.8) * 0.03 : 0.045 + Math.sin(t * Math.PI) * 0.04;
        m.position.set(Math.sin(sway * t * 2) * 0.05, -Math.cos(a) * (cat ? 0.6 : 0.5) * t + 0.05, -Math.sin(a) * (cat ? 0.52 : 0.45) * t); m.scale.setScalar(rr); });
    }
    if (this.cape) {
      const pos = this.capeGeo.attributes.position, trail = clamp(Math.abs(f.vx) * 0.04, 0, 0.3), W2 = this.capeW;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5, v = 0.5 - pos.getY(i), wave = Math.sin(frame / 5 + v * 4 + u * 2) * 0.05 * v;
        pos.setXYZ(i, (u - 0.5) * W2 * (1 + v * 0.3), 1.47 - v * 1.05, -0.13 - v * (0.18 + trail) - wave);
      }
      pos.needsUpdate = true; this.capeGeo.computeVertexNormals();
    }
    // a stage item held overhead between both hands
    const holding = f.prop && f.move && MOVES[f.move] && MOVES[f.move].prop;
    if (holding && (!this.held || this.held.userData.kind !== f.prop)) { if (this.held) this.held.removeFromParent(); this.held = kit.propMesh(f.prop); this.held.userData.kind = f.prop; this.root.add(this.held); }
    if (this.held) {
      this.held.visible = !!holding;
      if (holding && this.bones.LeftHand && this.bones.RightHand) {
        this.bones.LeftHand.getWorldPosition(_v); this.bones.RightHand.getWorldPosition(_a); _v.add(_a).multiplyScalar(0.5);
        this.root.updateMatrixWorld(); this.root.worldToLocal(_v); this.held.position.copy(_v); this.held.scale.setScalar(1 / scale3);
      }
    }
    // turned to stone (finisher): grey and matte
    const stn = f.stone || 0;
    if (stn > 0 || this._stone) { for (const m of this.mats) { if (m.userData.stoneU) m.userData.stoneU.value = stn; if (m.userData.r0 !== undefined) m.roughness = lerp(m.userData.r0, 1, stn); } this._stone = stn > 0; }
    // hit flash / armour glow
    const flash = f.flash > 0, armour = f.armor > 0;
    for (const m of this.mats) {
      if (!m.emissive) continue;
      if (flash) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 0.9; }
      else if (armour) { m.emissive.setHex(0x8a4060); m.emissiveIntensity = 0.35; }
      else if (m.userData.e0) { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.i0; }
    }
    const h = f.h * f.scale;
    const buff = f.flow > 0 || f.big > 0 || f.armor > 0 || f.asc > 0 || (cine && cine.side === f.side && cine.kind === 'act');
    this.aura.material.color.set(f.asc > 0 ? '#f5c518' : c.color);
    this.aura.material.opacity = lerp(this.aura.material.opacity, buff ? 0.5 + 0.15 * Math.sin(frame / 6) : 0, 0.15);
    this.aura.position.set(0, tall * f.scale * 0.5, 0); this.aura.scale.set(h * 1.3 * U, h * 1.6 * U, 1);
    const lift = clamp((FLOOR - f.y) / 200, 0, 0.7), lying = f.kd === 2 || f.kd === 3 || (f.kd === 1 && f.bounced);
    this.shadowBlob.position.set(wx(f.x) - (lying ? F * tall * 0.45 : 0), 0.012, (f.z || 0) * U);
    const bw = (lying ? tall * 120 : f.bw * 1.5) * f.scale * (1 - lift * 0.5) * U * scale3; this.shadowBlob.scale.set(bw, bw * 0.45, 1);
    this.shadowBlob.material.opacity = 0.6 * (1 - lift);
  }
  // world position of the head and its radius (for the overlay's status icons)
  headWorld(v) { const b = this.bones.Head; if (!b) return 0.1; b.getWorldPosition(v); const s = this.model.scale.x * this.root.scale.x; v.y += 0.08 * s; return 0.12 * s; }
}
