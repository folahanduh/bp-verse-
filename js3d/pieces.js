// ---------- SQUADS: what every piece of a stage's big layout looks like (js/layouts.js says where they go) ----------
// makePieces(helpers) -> build(piece, theme) gives a THREE.Group for one piece in its own frame (floor at y 0, facing
// +z); the caller places, turns and (for the mirrored half) mirrors it. Each stage has a theme: its own colours and
// materials, so a club's stairs are black steel with LED edges and a temple's are stone.
import * as THREE from 'three';

export const THEMES = {
  club: { wall: '#1a1024', trim: '#ff3fa4', accent: '#3ea6ff', metal: '#2a2a33', wood: '#2a1810', fabric: '#4a1030', floor: '#120c18', stone: '#2a2430', glow: '#ff4fd8', stair: 'steel' },
  gym: { wall: '#6a5a48', trim: '#c8102e', accent: '#f2b818', metal: '#3a3e46', wood: '#7a5434', fabric: '#18181c', floor: '#2a2a2e', stone: '#8a8478', glow: '#ffe0b0', stair: 'steel' },
  court: { wall: '#5a4a5a', trim: '#ff7a3a', accent: '#3ea6ff', metal: '#5a5e66', wood: '#8a6038', fabric: '#2a4a8a', floor: '#2f4f6d', stone: '#7a7472', glow: '#ffcf7a', stair: 'conc' },
  garden: { wall: '#8a8478', trim: '#3a6a2a', accent: '#c9a227', metal: '#2a2a2a', wood: '#6a4a2a', fabric: '#7a2a2a', floor: '#6a6458', stone: '#bab4a6', glow: '#fff2c0', stair: 'stone' },
  roof: { wall: '#5a5a62', trim: '#f2b818', accent: '#ff3b3b', metal: '#6a6e78', wood: '#5a4030', fabric: '#2a2a30', floor: '#3a3a40', stone: '#7a7a80', glow: '#ffe8b0', stair: 'steel' },
  verse: { wall: '#1a1430', trim: '#b44dff', accent: '#3ea6ff', metal: '#2a2a44', wood: '#2a1a2a', fabric: '#2a1040', floor: '#120e22', stone: '#2a2440', glow: '#c070ff', stair: 'steel' },
  hall: { wall: '#b9b2a6', trim: '#c9a227', accent: '#8a1a1a', metal: '#3a3430', wood: '#5a3a26', fabric: '#8a1a1a', floor: '#cfc9bf', stone: '#d8d2c6', glow: '#fff2d0', stair: 'stone' },
  subway: { wall: '#3a3e46', trim: '#f2b818', accent: '#1d6aca', metal: '#7a7e88', wood: '#4a3a2a', fabric: '#1a3a6a', floor: '#6a6a6e', stone: '#9a9a9e', glow: '#e8f0ff', stair: 'conc' },
  alley: { wall: '#2a2030', trim: '#ff7ab0', accent: '#3ddc84', metal: '#3a3a40', wood: '#5a4030', fabric: '#6a1a2a', floor: '#1c1c22', stone: '#4a4450', glow: '#ff7ab0', stair: 'steel' },
  penthouse: { wall: '#2a2a32', trim: '#c9a227', accent: '#6a8aff', metal: '#2a2a2e', wood: '#5a3a26', fabric: '#3a2a5a', floor: '#1c1c22', stone: '#d8d2c6', glow: '#ffd27a', stair: 'wood' },
  junkyard: { wall: '#5a4a3a', trim: '#f2b818', accent: '#c8102e', metal: '#6a5a4a', wood: '#5a4030', fabric: '#3a3a2a', floor: '#5a4c3e', stone: '#7a6a5a', glow: '#ff9a4a', stair: 'steel' },
  beach: { wall: '#c8b088', trim: '#ff5a3a', accent: '#3ea6ff', metal: '#8a8a8a', wood: '#9a7a52', fabric: '#2a8ac8', floor: '#9a7a52', stone: '#d8c8a8', glow: '#ffd090', stair: 'wood' },
  temple: { wall: '#c8d0dc', trim: '#b8202a', accent: '#c9a227', metal: '#3a3a40', wood: '#6a2a1a', fabric: '#b8202a', floor: '#c8d0dc', stone: '#9aa2ae', glow: '#ffd27a', stair: 'stone' },
  garage: { wall: '#5a5a5e', trim: '#f2b818', accent: '#3ea6ff', metal: '#6a6e78', wood: '#4a3a2a', fabric: '#2a2a2e', floor: '#5a5a5e', stone: '#7a7a7e', glow: '#e8f0ff', stair: 'conc' },
};

export function makePieces(H) {
  const { K, M, T, surf, speckle, glow } = H;
  const box = (mat, sx, sy, sz, x, y, z, ry = 0, cast = true) => { const m = K.mesh(K.GEO.box, mat, cast, true); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  const cyl = (mat, r, h, x, y, z, cast = true) => { const m = K.mesh(K.GEO.cyl, mat, cast, true); m.scale.set(r, h, r); m.position.set(x, y, z); return m; };
  const sph = (mat, r, x, y, z) => { const m = K.mesh(K.GEO.sphere, mat, true, false); m.scale.setScalar(r); m.position.set(x, y, z); return m; };
  // a box with rounded edges (cushions, cabinets, cars...)
  const RB = {}; const rboxGeo = (w, h, d, r) => { const k = [w, h, d, r].map(v => v.toFixed(2)).join(); if (RB[k]) return RB[k];
    r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01); const s = new THREE.Shape(), x = w / 2, y = h / 2;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    const b = Math.min(r, d / 2 - 0.01) * 0.6, g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.6, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * b) / 2); g.userData.keep = true; return (RB[k] = g); };
  const rb = (mat, w, h, d, r, x, y, z, ry = 0) => { const m = K.mesh(rboxGeo(w, h, d, r), mat, true, true); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  const tube = (mat, pts, r) => K.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 6), mat, false, false);
  const MAT = {}; // materials per theme
  function mats(th) {
    const k = JSON.stringify(th); if (MAT[k]) return MAT[k];
    const m = {
      wall: M(0xffffff, { surf: T.concrete(th.wall, [3, 1]) }), metal: M(th.metal, { mat: { metalness: 0.75, roughness: 0.35 } }), chrome: M(0xd8dce4, { mat: { metalness: 1, roughness: 0.15 } }),
      gold: M(0xc9a227, { mat: { metalness: 1, roughness: 0.25 } }), wood: M(0xffffff, { surf: T.wood(th.wood, [2, 2], 24), mat: { roughness: 0.6 } }), fabric: M(th.fabric, { mat: { roughness: 0.95 } }),
      leather: M(th.fabric, { mat: { roughness: 0.45, metalness: 0.05 } }), black: M(0x0e0e12, { mat: { roughness: 0.5, metalness: 0.3 } }), rubber: M(0x141416, { mat: { roughness: 0.95 } }),
      conc: M(0xffffff, { surf: T.concrete('#a8a49c', [2, 1]) }), stone: M(0xffffff, { surf: T.concrete(th.stone, [2, 2]), mat: { roughness: 0.8 } }), marble: M(0xffffff, { surf: T.marble([2, 2]), mat: { roughness: 0.25 } }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x9ab8d8, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
      trim: K.basic(th.trim), accent: K.basic(th.accent), glowM: K.std(0x111111, { emissive: new THREE.Color(th.glow), emissiveIntensity: 1.2 }),
      white: M(0xf2f2ee, { mat: { roughness: 0.5 } }), yellow: M(0xf2b818, { mat: { roughness: 0.5 } }), red: M(0xb8202a, { mat: { roughness: 0.6 } }), green: M(0x2f6b2a, { mat: { roughness: 0.9 } }),
      steel: M(0xffffff, { surf: surf(128, 128, (q, w, h) => { q.fillStyle = '#3a3e46'; q.fillRect(0, 0, w, h); q.strokeStyle = 'rgba(0,0,0,0.6)'; q.lineWidth = 3; for (let i = 0; i < w; i += 16) { q.beginPath(); q.moveTo(i, 0); q.lineTo(i, h); q.stroke(); q.beginPath(); q.moveTo(0, i); q.lineTo(w, i); q.stroke(); } speckle(q, w, h, 400, 0.2); }, { repeat: [2, 2], bump: 2 }), mat: { metalness: 0.7, roughness: 0.4 } }),
    };
    m.stair = th.stair === 'wood' ? m.wood : th.stair === 'stone' ? m.stone : th.stair === 'conc' ? m.conc : m.steel;
    return (MAT[k] = m);
  }
  const B = {};
  // ---- floors you stand on ----
  B.plat = (p, th, m) => { const g = new THREE.Group(), w = p.w, d = p.d, h = p.h, y0 = p.base || 0, look = p.look || 'stage';
    const top = look === 'vip' || look === 'stage' || look === 'neon' ? m.black : look === 'dais' || look === 'gallery' ? m.marble : look === 'terrace' ? m.stone : look === 'lounge' || look === 'office' ? m.wood : m.conc;
    g.add(box(look === 'neon' || look === 'stage' || look === 'vip' ? m.metal : look === 'dais' || look === 'gallery' || look === 'terrace' ? m.stone : m.conc, w, h - y0 - 0.06, d, 0, y0 + (h - y0 - 0.06) / 2, 0), box(top, w, 0.06, d, 0, h - 0.03, 0));
    const edge = look === 'stage' || look === 'neon' || look === 'vip' ? m.trim : look === 'dais' || look === 'gallery' ? m.gold : look === 'concrete' ? m.yellow : null;
    if (edge) for (const s of [-1, 1]) { g.add(box(edge, w + 0.02, 0.05, 0.05, 0, h - 0.04, s * d / 2, 0, false), box(edge, 0.05, 0.05, d + 0.02, s * w / 2, h - 0.04, 0, 0, false)); }
    if (look === 'stage' || look === 'neon') { for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) g.add(box(look === 'neon' ? m.accent : m.glowM, 0.5, 0.08, 0.02, x, h * 0.5, d / 2 + 0.01, 0, false)); } // LED strips down the front
    if (look === 'dais') g.add(box(m.red, Math.min(4, w * 0.4), 0.02, d, 0, h + 0.01, 0, 0, false)); // the carpet
    if (look === 'lounge') g.add(box(m.fabric, w * 0.7, 0.02, d * 0.7, 0, h + 0.01, 0, 0, false));
    if (look === 'vip' || look === 'gallery' || look === 'office' || look === 'concrete' || look === 'terrace') { // a railing along the edges (the long ones, and the ends)
      const rail = look === 'terrace' ? m.stone : look === 'gallery' ? m.gold : m.chrome;
      for (const s of [-1, 1]) { g.add(box(rail, w, 0.06, 0.06, 0, h + 1.0, s * (d / 2 - 0.05), 0, false)); for (let x = -w / 2 + 0.2; x <= w / 2; x += 1) g.add(box(rail, 0.05, 1.0, 0.05, x, h + 0.5, s * (d / 2 - 0.05), 0, false)); }
      if (look === 'vip' || look === 'office') for (const s of [-1, 1]) { const gl = K.mesh(new THREE.PlaneGeometry(w, 0.9), m.glass, false); gl.position.set(0, h + 0.5, s * (d / 2 - 0.05)); gl.userData.dyn = 1; g.add(gl); } }
    if (y0 > 0) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(m.metal, 0.2, y0, 0.2, a * (w / 2 - 0.2), y0 / 2, b * (d / 2 - 0.2))); // standing on legs
    return g; };
  B.mezz = B.plat; B.balcony = (p, th, m) => B.plat(Object.assign({}, p, { look: 'concrete', base: p.h - 0.25 }), th, m);
  B.stairs = (p, th, m) => { const g = new THREE.Group(), n = Math.max(3, Math.ceil(p.h / 0.2)), dl = p.len / n, mat = p.look === 'ramp' ? m.conc : m.stair;
    if (p.look === 'ramp') { const L = Math.hypot(p.len, p.h), ramp = box(mat, p.w, 0.12, L, 0, p.h / 2, 0); ramp.rotation.x = -Math.atan2(p.h, p.len); g.add(ramp); for (const s of [-1, 1]) g.add(box(m.yellow, 0.1, 0.1, L, s * p.w / 2, p.h / 2 + 0.06, 0)); return g; }
    for (let i = 0; i < n; i++) { const hh = (i + 1) * p.h / n; g.add(box(mat, p.w, hh, dl + 0.002, 0, hh / 2, -p.len / 2 + dl * (i + 0.5)));
      if (th.stair === 'steel') g.add(box(m.trim, p.w, 0.03, 0.04, 0, hh - 0.01, -p.len / 2 + dl * i + 0.02, 0, false)); } // LED step edges
    for (const s of [-1, 1]) { const x = s * (p.w / 2 + 0.04), L = Math.hypot(p.len, p.h), rail = box(th.stair === 'stone' ? m.stone : m.chrome, 0.05, 0.05, L, x, p.h / 2 + 0.95, 0, 0, false); rail.rotation.x = -Math.atan2(p.h, p.len); g.add(rail);
      for (let i = 0; i <= 3; i++) { const z = -p.len / 2 + p.len * i / 3, yy = p.h * i / 3; g.add(box(th.stair === 'stone' ? m.stone : m.chrome, 0.05, 0.95, 0.05, x, yy + 0.47, z, 0, false)); } }
    return g; };
  // ---- the nightclub ----
  B.dance = (p, th, m) => { const g = new THREE.Group(), cols = [th.trim, th.accent, th.glow, '#ffffff'];
    for (let x = -p.w / 2 + 0.5; x < p.w / 2; x += 1) for (let z = -p.d / 2 + 0.5; z < p.d / 2; z += 1) { const i = Math.abs(Math.round(x * 3 + z * 7)) % 7; if (i > 3) continue; const t = K.mesh(new THREE.PlaneGeometry(0.92, 0.92), K.std(0x111111, { emissive: new THREE.Color(cols[i]), emissiveIntensity: 0.9 }), false, true); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.012, z); g.add(t); }
    g.add(box(m.chrome, p.w + 0.1, 0.02, 0.08, 0, 0.012, -p.d / 2), box(m.chrome, p.w + 0.1, 0.02, 0.08, 0, 0.012, p.d / 2));
    const ball = sph(m.chrome, 0.6, 0, 7, 0); ball.castShadow = false; g.add(ball, box(m.metal, 0.03, 2, 0.03, 0, 8.4, 0, 0, false)); return g; };
  B.booth = (p, th, m) => { const g = new THREE.Group(), y = p.base || 0;
    g.add(rb(m.leather, 2.6, 0.45, 0.6, 0.12, 0, y + 0.42, -0.5), rb(m.leather, 2.6, 0.9, 0.22, 0.1, 0, y + 0.75, -0.75)); // seat and back
    for (const s of [-1, 1]) g.add(rb(m.leather, 0.24, 0.7, 1.4, 0.1, s * 1.18, y + 0.5, -0.1)); // the arms
    for (let i = -2; i <= 2; i++) g.add(sph(m.black, 0.035, i * 0.5, y + 0.95, -0.63)); // buttons in the tufting
    g.add(cyl(m.metal, 0.06, 0.7, 0, y + 0.35, 0.35), rb(m.marble, 1.3, 0.05, 0.65, 0.04, 0, y + 0.72, 0.35)); // the table
    for (const [a, c] of [[-0.3, '#ffe0a0'], [0.25, '#ff7ab0'], [0.4, '#9fe6ff']]) g.add(cyl(K.std(c, { transparent: true, opacity: 0.75, roughness: 0.05 }), 0.035, 0.16, a, y + 0.83, 0.35 + (a > 0 ? 0.1 : -0.05)));
    g.add(glow(th.glow, 0.7, 0, y + 0.95, 0.35, 0.4)); return g; };
  B.sofa = (p, th, m) => { const g = new THREE.Group(), y = p.base || 0;
    g.add(rb(m.leather, 2.4, 0.42, 0.9, 0.12, 0, y + 0.36, 0.05), rb(m.leather, 2.4, 0.8, 0.22, 0.1, 0, y + 0.65, -0.4));
    for (const s of [-1, 1]) g.add(rb(m.leather, 0.22, 0.6, 1.0, 0.1, s * 1.1, y + 0.45, 0)); for (const s of [-0.6, 0.6]) g.add(rb(m.fabric, 0.9, 0.12, 0.7, 0.06, s, y + 0.62, 0.05));
    for (const [a, b] of [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]]) g.add(box(m.gold, 0.06, 0.15, 0.06, a, y + 0.07, b)); return g; };
  B.bar = (p, th, m) => { const g = new THREE.Group(), L = p.len;
    g.add(box(m.wood, L, 1.08, 1.0, 0, 0.54, 0), rb(m.marble, L + 0.2, 0.07, 1.2, 0.03, 0, 1.12, 0), box(m.glowM, L, 0.04, 0.04, 0, 0.06, 0.52, 0, false));
    for (let x = -L / 2 + 0.6; x < L / 2; x += 1.2) g.add(box(m.gold, 0.04, 0.9, 0.02, x, 0.55, 0.51, 0, false)); // panelled front
    for (let x = -L / 2 + 0.9; x < L / 2; x += 1.3) { g.add(cyl(m.chrome, 0.04, 0.75, x, 0.38, 0.95), cyl(m.leather, 0.2, 0.08, x, 0.78, 0.95), cyl(m.chrome, 0.2, 0.02, x, 0.02, 0.95)); } // stools
    g.add(box(m.black, L, 2.6, 0.35, 0, 1.3, -1.25), box(m.glowM, L, 0.03, 0.4, 0, 1.4, -1.1, 0, false), box(m.glowM, L, 0.03, 0.4, 0, 2.1, -1.1, 0, false));
    for (let i = 0; i < L * 4; i++) { const x = -L / 2 + 0.2 + i * 0.25; g.add(cyl(K.std(['#2f8f4e', '#8a3a1a', '#c9c9d0', '#c9a227'][i % 4], { roughness: 0.1, transparent: true, opacity: 0.85 }), 0.045, 0.3, x, 1.58 + (i % 2) * 0.7, -1.1, false)); }
    return g; };
  B.rope = (p, th, m) => { const g = new THREE.Group(), L = p.len, n = Math.max(2, Math.round(L / 1.2)) + 1, velvet = M(0x8a0a1a, { mat: { roughness: 0.9 } });
    for (let i = 0; i < n; i++) { const x = -L / 2 + L * i / (n - 1); g.add(cyl(m.gold, 0.04, 0.9, x, 0.45, 0), cyl(m.gold, 0.16, 0.05, x, 0.025, 0), sph(m.gold, 0.06, x, 0.93, 0));
      if (i < n - 1) { const x2 = -L / 2 + L * (i + 1) / (n - 1); g.add(tube(velvet, [[x, 0.86, 0], [(x + x2) / 2, 0.62, 0], [x2, 0.86, 0]], 0.03)); } }
    return g; };
  B.speaker = (p, th, m) => { const g = new THREE.Group(), y = p.base || 0;
    for (let k = 0; k < 2; k++) { const yy = y + 0.65 + k * 1.3; g.add(rb(m.black, 1.2, 1.25, 1.0, 0.05, 0, yy, 0));
      for (const [a, b, r] of [[-0.28, 0.25, 0.22], [0.28, 0.25, 0.22], [0, -0.3, 0.3]]) { const c = cyl(m.rubber, r, 0.04, a, yy + b, 0.5); c.rotation.x = Math.PI / 2; g.add(c); const d = cyl(m.chrome, r * 0.3, 0.05, a, yy + b, 0.52); d.rotation.x = Math.PI / 2; g.add(d); }
      g.add(box(m.trim, 1.0, 0.03, 0.02, 0, yy - 0.58, 0.51, 0, false)); }
    return g; };
  B.djdesk = (p, th, m) => { const g = new THREE.Group(), y = p.base || 0, w = p.w || 4.2;
    g.add(box(m.black, w, 1.0, 1.2, 0, y + 0.5, 0), rb(m.metal, w + 0.1, 0.06, 1.3, 0.03, 0, y + 1.03, 0));
    const scr = K.textPlane('BP / VERITY', w * 0.9, 0.55, '900 120px Impact, Oswald, "Arial Black", sans-serif', '#ffffff', th.trim); scr.position.set(0, y + 0.55, 0.61); g.add(scr);
    for (const s of [-1, 1]) { const tt = cyl(m.black, 0.32, 0.06, s * 1.2, y + 1.09, 0); g.add(tt, cyl(m.chrome, 0.05, 0.08, s * 1.2, y + 1.12, 0), box(m.chrome, 0.04, 0.03, 0.3, s * 1.2 + s * 0.2, y + 1.11, -0.1, 0, false)); }
    g.add(box(m.metal, 0.9, 0.08, 0.6, 0, y + 1.09, 0)); for (let i = 0; i < 6; i++) g.add(box(i % 2 ? m.accent : m.trim, 0.08, 0.02, 0.08, -0.3 + i * 0.12, y + 1.14, 0.1, 0, false));
    g.add(box(m.glowM, w, 0.04, 0.04, 0, y + 0.02, 0.6, 0, false), glow(th.trim, 3, 0, y + 1.6, -0.4, 0.3)); return g; };
  B.pillar = (p, th, m) => { const g = new THREE.Group(), s = p.s || 1.2;
    g.add(box(m.wall, s, 4.6, s, 0, 2.3, 0), box(m.metal, s + 0.12, 0.3, s + 0.12, 0, 0.15, 0), box(m.metal, s + 0.12, 0.25, s + 0.12, 0, 4.48, 0));
    for (const y of [1.2, 3.2]) for (const r of [0, 1, 2, 3]) { const a = r * Math.PI / 2; g.add(box(m.trim, s + 0.02, 0.05, 0.02, Math.sin(a) * (s / 2 + 0.005), y, Math.cos(a) * (s / 2 + 0.005), a, false)); }
    return g; };
  B.column = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.stone, 1.3, 0.4, 1.3, 0, 0.2, 0), cyl(m.stone, 0.5, 4.2, 0, 2.5, 0), box(m.stone, 1.3, 0.4, 1.3, 0, 4.8, 0), cyl(m.stone, 0.6, 0.2, 0, 4.5, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(box(m.wall, 0.06, 4.1, 0.06, Math.cos(a) * 0.49, 2.5, Math.sin(a) * 0.49, 0, false)); } g.add(box(m.gold, 1.32, 0.06, 1.32, 0, 0.42, 0, 0, false)); return g; };
  B.htable = (p, th, m) => { const g = new THREE.Group(); g.add(cyl(m.chrome, 0.05, 1.0, 0, 0.5, 0), cyl(m.metal, 0.28, 0.03, 0, 0.015, 0), cyl(m.marble, 0.45, 0.05, 0, 1.03, 0), cyl(K.std('#ffe0a0', { transparent: true, opacity: 0.7 }), 0.04, 0.18, 0.1, 1.14, 0));
    for (const s of [-1, 1]) g.add(cyl(m.chrome, 0.03, 0.75, s * 0.65, 0.37, 0), cyl(m.leather, 0.18, 0.07, s * 0.65, 0.77, 0)); return g; };
  // ---- the gym ----
  B.ring = (p, th, m) => { const g = new THREE.Group(), s = p.s, h = p.h, e = s / 2;
    const apron = K.canvasTex(512, 128, (q, w, hh) => { q.fillStyle = '#1a1a1e'; q.fillRect(0, 0, w, hh); q.fillStyle = th.trim; q.font = '900 80px Impact, Oswald, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('IRON GYM', w / 2, hh / 2); });
    for (const r of [0, 1, 2, 3]) { const a = r * Math.PI / 2, pl = K.mesh(new THREE.PlaneGeometry(s, h), K.std(0xffffff, { map: apron, roughness: 0.8 }), false); pl.position.set(Math.sin(a) * (e + 0.01), h / 2, Math.cos(a) * (e + 0.01)); pl.rotation.y = a; g.add(pl); }
    const canvas = K.canvasTex(512, 512, (q, w, hh) => { q.fillStyle = '#e8e2d6'; q.fillRect(0, 0, w, hh); speckle(q, w, hh, 4000, 0.08); q.strokeStyle = th.trim; q.lineWidth = 10; q.beginPath(); q.arc(w / 2, hh / 2, 120, 0, 7); q.stroke(); q.fillStyle = th.trim; q.font = '900 110px Impact, Oswald, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP', w / 2, hh / 2 + 6); });
    const top = K.mesh(new THREE.PlaneGeometry(s, s), K.std(0xffffff, { map: canvas, roughness: 0.9 }), false, true); top.rotation.x = -Math.PI / 2; top.position.y = h + 0.01; g.add(top, box(m.black, s, h, s, 0, h / 2, 0));
    for (const [a, b, c] of [[-1, -1, '#3ea6ff'], [1, 1, '#ff3b5c'], [-1, 1, '#ffffff'], [1, -1, '#ffffff']]) { g.add(cyl(m.chrome, 0.08, 1.4, a * (e - 0.08), h + 0.7, b * (e - 0.08))); g.add(rb(M(c, { mat: { roughness: 0.6 } }), 0.26, 1.2, 0.26, 0.08, a * (e - 0.08), h + 0.7, b * (e - 0.08))); }
    const ropeM = M(0xe8e8e8, { mat: { roughness: 0.6 } }), redR = M(0xc8102e, { mat: { roughness: 0.6 } });
    for (let k = 0; k < 3; k++) { const y = h + 0.4 + k * 0.38, mat = k === 1 ? redR : ropeM;
      for (const s2 of [-1, 1]) { g.add(box(mat, s, 0.05, 0.05, 0, y, s2 * (e - 0.08), 0, false)); for (const s3 of [-1, 1]) g.add(box(mat, 0.05, 0.05, e - 0.9, s2 * (e - 0.08), y, s3 * (e + 0.9) / 2, 0, false)); } }
    for (const s2 of [-1, 1]) { const st = B.stairs({ w: 1.6, len: 1.8, h }, Object.assign({}, th, { stair: 'steel' }), m); st.position.set(s2 * (e + 0.9), 0, 0); st.rotation.y = -s2 * Math.PI / 2; g.add(st); }
    return g; };
  B.bag = (p, th, m) => { const g = new THREE.Group(), red = M(0x8a1a1a, { mat: { roughness: 0.5, metalness: 0.05 } });
    g.add(cyl(red, 0.3, 1.25, 0, 1.0, 0), sph(red, 0.3, 0, 1.62, 0), sph(red, 0.3, 0, 0.38, 0), cyl(m.black, 0.31, 0.12, 0, 1.4, 0), cyl(m.black, 0.31, 0.12, 0, 0.6, 0));
    g.add(box(m.chrome, 0.02, 1.2, 0.02, 0, 2.5, 0, 0, false), box(m.metal, 0.12, 0.12, 2.8, 0, 3.15, 0), box(m.metal, 0.1, 3.2, 0.1, 0, 1.6, -1.35)); return g; };
  B.rack = (p, th, m) => { const g = new THREE.Group(), L = p.len;
    for (const y of [0.45, 0.9]) { g.add(box(m.metal, L, 0.05, 0.5, 0, y, y > 0.5 ? -0.1 : 0.05)); for (let x = -L / 2 + 0.3; x < L / 2; x += 0.45) { const db = new THREE.Group(); db.add(cyl(m.chrome, 0.025, 0.36, 0, 0, 0)); for (const s of [-1, 1]) db.add(cyl(m.black, 0.07 + (x + L) % 0.04, 0.07, 0, s * 0.16, 0)); db.rotation.x = Math.PI / 2; db.position.set(x, y + 0.08, y > 0.5 ? -0.1 : 0.05); g.add(db); } }
    for (const s of [-1, 1]) g.add(box(m.metal, 0.08, 1.2, 0.6, s * L / 2, 0.6, 0)); return g; };
  B.wbench = (p, th, m) => { const g = new THREE.Group(); g.add(rb(m.leather, 0.42, 0.12, 1.4, 0.05, 0, 0.45, 0), box(m.metal, 0.1, 0.4, 1.2, 0, 0.2, 0));
    for (const s of [-1, 1]) g.add(box(m.metal, 0.08, 1.2, 0.08, s * 0.5, 0.6, -0.6)); const bar = cyl(m.chrome, 0.025, 2.0, 0, 1.15, -0.6); bar.rotation.z = Math.PI / 2; g.add(bar);
    for (const s of [-1, 1]) { const pl = cyl(m.black, 0.22, 0.06, s * 0.8, 1.15, -0.6); pl.rotation.z = Math.PI / 2; g.add(pl); } return g; };
  B.squat = (p, th, m) => { const g = new THREE.Group(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(m.metal, 0.1, 2.4, 0.1, a, 1.2, b)); for (const s of [-1, 1]) g.add(box(m.metal, 2.1, 0.08, 0.08, 0, 2.38, s), box(m.metal, 0.08, 0.08, 2.1, s, 2.38, 0));
    const bar = cyl(m.chrome, 0.025, 2.3, 0, 1.4, 0); bar.rotation.z = Math.PI / 2; g.add(bar); for (const s of [-1, 1]) for (const k of [0, 1]) { const pl = cyl(k ? m.trim : m.black, 0.25 - k * 0.05, 0.05, s * (0.9 + k * 0.07), 1.4, 0); pl.rotation.z = Math.PI / 2; g.add(pl); }
    g.add(box(m.rubber, 2.1, 0.03, 2.1, 0, 0.015, 0, 0, false)); return g; };
  B.tread = (p, th, m) => { const g = new THREE.Group(); g.add(rb(m.black, 0.8, 0.18, 1.9, 0.06, 0, 0.12, 0), box(m.rubber, 0.6, 0.02, 1.6, 0, 0.22, 0, 0, false));
    for (const s of [-1, 1]) { const arm = box(m.metal, 0.06, 1.2, 0.06, s * 0.36, 0.75, -0.75); arm.rotation.x = -0.2; g.add(arm); } g.add(rb(m.metal, 0.8, 0.3, 0.2, 0.05, 0, 1.3, -0.85), box(m.accent, 0.4, 0.14, 0.01, 0, 1.33, -0.74, 0, false)); return g; };
  B.mat = (p, th, m) => { const g = new THREE.Group(); g.add(box(M(0x1a3a6a, { mat: { roughness: 0.95 } }), p.w, 0.04, p.d, 0, 0.02, 0, 0, false)); return g; };
  // ---- the street court ----
  B.courtlines = (p, th, m) => { const g = new THREE.Group(), tex = K.canvasTex(1024, 612, (q, w, h) => { q.fillStyle = '#2f4f6d'; q.fillRect(0, 0, w, h); speckle(q, w, h, 6000, 0.08);
    q.strokeStyle = '#f2f2ee'; q.lineWidth = 6; q.strokeRect(20, 20, w - 40, h - 40); q.beginPath(); q.moveTo(w / 2, 20); q.lineTo(w / 2, h - 20); q.stroke(); q.beginPath(); q.arc(w / 2, h / 2, 70, 0, 7); q.stroke();
    q.fillStyle = '#b8402a'; for (const s of [0, 1]) { q.fillRect(s ? w - 220 : 20, h / 2 - 90, 200, 180); q.beginPath(); q.arc(s ? w - 220 : 220, h / 2, 90, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2); q.fill(); q.strokeRect(s ? w - 220 : 20, h / 2 - 90, 200, 180); q.beginPath(); q.arc(s ? w - 20 : 20, h / 2, 300, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2); q.stroke(); }
    q.fillStyle = '#ffd23f'; q.font = '900 60px Impact, Oswald, sans-serif'; q.textAlign = 'center'; q.fillText('BP', w / 2, h / 2 + 20); });
    const pl = K.mesh(new THREE.PlaneGeometry(30, 18), K.std(0xffffff, { map: tex, roughness: 0.7 }), false, true); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.01; g.add(pl); return g; };
  B.hoop = (p, th, m) => { const g = new THREE.Group(), f = 1; // the board faces +x (the middle of the court; the other end's hoop is a mirror image)
    g.add(cyl(m.metal, 0.11, 3.4, 0, 1.7, 0), box(m.metal, 1.0, 0.08, 0.08, f * 0.5, 3.2, 0), box(M(0xf2f2ee, { mat: { roughness: 0.3 } }), 0.05, 1.05, 1.8, f * 1.0, 3.4, 0), box(m.trim, 0.06, 0.45, 0.6, f * 1.02, 3.25, 0, 0, false));
    const rim = K.mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), m.trim, false); rim.rotation.x = Math.PI / 2; rim.position.set(f * 1.32, 3.05, 0); g.add(rim);
    const net = K.mesh(new THREE.CylinderGeometry(0.23, 0.14, 0.42, 12, 1, true), K.std(0xffffff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, wireframe: true }), false); net.position.set(f * 1.32, 2.83, 0); g.add(net); return g; };
  B.bleacher = (p, th, m) => { const g = new THREE.Group(), n = p.tiers || 3, al = M(0xc8ccd4, { mat: { metalness: 0.8, roughness: 0.3 } });
    for (let k = 0; k < n; k++) { const z = (k - (n - 1) / 2) * 0.9, y = 0.5 * (k + 1); g.add(box(m.metal, p.len, y - 0.08, 0.86, 0, (y - 0.08) / 2, z), box(al, p.len, 0.08, 0.86, 0, y - 0.04, z)); for (let x = -p.len / 2 + 0.6; x < p.len / 2; x += 1.6) g.add(box(m.trim, 0.04, 0.05, 0.86, x, y + 0.01, z, 0, false)); }
    const back = (n - 1) / 2 * 0.9 + 0.43; g.add(box(al, p.len, 0.06, 0.06, 0, 0.5 * n + 1.0, back)); for (let x = -p.len / 2; x <= p.len / 2; x += 2) g.add(box(al, 0.05, 1.0, 0.05, x, 0.5 * n + 0.5, back)); return g; };
  B.bench = (p, th, m) => { const g = new THREE.Group(), L = p.len || 2.4; for (const z of [-0.18, 0, 0.18]) g.add(rb(m.wood, L, 0.05, 0.14, 0.02, 0, 0.47, z)); g.add(rb(m.wood, L, 0.14, 0.05, 0.02, 0, 0.75, -0.27));
    for (const s of [-1, 1]) g.add(box(m.black, 0.06, 0.47, 0.5, s * (L / 2 - 0.15), 0.23, 0), box(m.black, 0.06, 0.4, 0.06, s * (L / 2 - 0.15), 0.62, -0.26)); return g; };
  B.dumpster = (p, th, m) => { const g = new THREE.Group(), gr = M(0x2a5a3a, { mat: { roughness: 0.7, metalness: 0.4 } }); g.add(rb(gr, 1.9, 1.15, 1.15, 0.05, 0, 0.7, 0), box(m.black, 1.95, 0.06, 1.2, 0, 1.31, 0));
    const lid = box(gr, 0.95, 0.04, 1.2, -0.48, 1.36, 0); lid.rotation.z = 0.25; g.add(lid); for (const [a, b] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) { const w = cyl(m.rubber, 0.08, 0.06, a, 0.08, b); w.rotation.z = Math.PI / 2; g.add(w); } return g; };
  B.can = (p, th, m) => { const g = new THREE.Group(); g.add(cyl(m.metal, 0.3, 0.95, 0, 0.47, 0), cyl(m.black, 0.32, 0.06, 0, 0.97, 0)); for (const y of [0.25, 0.7]) g.add(cyl(m.chrome, 0.305, 0.03, 0, y, 0)); return g; };
  B.car = (p, th, m) => { const c = H.car(['#c8102e', '#e8e8ec', '#1a3a8a', '#1a1a1e', '#f2b818'][Math.abs(Math.round(p.x * 7 + p.z * 3)) % 5], 0, 0, 0); c.position.set(0, 0, 0); const g = new THREE.Group(); g.add(c); return g; };
  B.container = (p, th, m) => { const g = new THREE.Group(), L = p.len || 6, col = ['#c8102e', '#1a5aaa', '#2a7a3a', '#d88a1a'][Math.abs(Math.round(p.x + p.z)) % 4];
    const tex = surf(256, 128, (q, w, h) => { q.fillStyle = col; q.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 10) { q.fillStyle = 'rgba(0,0,0,0.25)'; q.fillRect(x, 0, 4, h); q.fillStyle = 'rgba(255,255,255,0.08)'; q.fillRect(x + 5, 0, 2, h); } speckle(q, w, h, 900, 0.2); q.fillStyle = 'rgba(255,255,255,0.75)'; q.font = '900 30px Impact, sans-serif'; q.fillText('BPX LINES', 20, 48); }, { repeat: [1, 1], bump: 3 });
    g.add(box(M(0xffffff, { surf: tex, mat: { roughness: 0.6, metalness: 0.4 } }), L, 2.6, 2.4, 0, 1.3, 0)); for (const s of [-1, 1]) g.add(box(m.metal, 0.12, 2.62, 2.42, s * (L / 2 - 0.06), 1.3, 0), box(m.metal, L, 0.12, 0.1, 0, 2.6, s * 1.2), box(m.metal, L, 0.12, 0.1, 0, 0.06, s * 1.2));
    for (const z of [-0.5, 0.5]) g.add(box(m.chrome, 0.04, 2.2, 0.06, L / 2 + 0.02, 1.3, z, 0, false)); return g; };
  // ---- the garden ----
  const leaf = H => M(0xffffff, { surf: surf(128, 128, (q, w, h) => { q.fillStyle = '#2a5a24'; q.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { q.fillStyle = `rgba(${40 + Math.random() * 60},${90 + Math.random() * 80},${30 + Math.random() * 40},0.8)`; q.beginPath(); q.ellipse(Math.random() * w, Math.random() * h, 3, 2, Math.random() * 3, 0, 7); q.fill(); } }, { repeat: [2, 1], bump: 4 }), mat: { roughness: 0.95 } });
  let LEAF = null;
  B.hedge = (p, th, m) => { const g = new THREE.Group(); LEAF = LEAF || leaf(); g.add(rb(LEAF, p.len, 1.3, 0.9, 0.2, 0, 0.65, 0)); for (let x = -p.len / 2 + 0.5; x < p.len / 2; x += 0.9) g.add(sph(LEAF, 0.32, x, 1.25, (x * 7) % 0.3 - 0.15)); return g; };
  B.fountain = (p, th, m) => { const g = new THREE.Group(), water = K.std(0x3a8aca, { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, emissive: 0x0a3a6a, emissiveIntensity: 0.5 });
    const basin = K.mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.45, 8), m.stone, true, true); basin.position.y = 0.22; g.add(basin);
    const wt = K.mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.02, 8), water, false); wt.position.y = 0.4; wt.userData.dyn = 1; g.add(wt);
    g.add(cyl(m.stone, 0.45, 2.2, 0, 1.1, 0), cyl(m.stone, 1.1, 0.15, 0, 1.4, 0), cyl(m.stone, 0.7, 0.12, 0, 2.1, 0), sph(m.gold, 0.25, 0, 2.45, 0)); const w2 = cyl(water, 1.0, 0.02, 0, 1.48, 0); w2.userData.dyn = 1; g.add(w2, glow('#9fd6ff', 2.2, 0, 1.6, 0, 0.3)); return g; };
  B.gazebo = (p, th, m) => { const g = new THREE.Group(); g.add(B.plat({ w: 6, d: 6, h: 0.45, look: 'lounge' }, th, m));
    for (const [a, b] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) g.add(cyl(m.white, 0.16, 2.8, a, 1.85, b), box(m.white, 0.4, 0.2, 0.4, a, 0.55, b));
    const roof = K.mesh(new THREE.ConeGeometry(4.6, 1.8, 8), M(0x6a2a2a, { mat: { roughness: 0.8 } }), true, false); roof.position.y = 4.15; roof.rotation.y = Math.PI / 8; g.add(roof, box(m.white, 6.2, 0.2, 0.2, 0, 3.25, -2.6), box(m.white, 6.2, 0.2, 0.2, 0, 3.25, 2.6), box(m.white, 0.2, 0.2, 6.2, -2.6, 3.25, 0), box(m.white, 0.2, 0.2, 6.2, 2.6, 3.25, 0)); return g; };
  B.statue = (p, th, m) => { const g = new THREE.Group(), bronze = M(0x6a4a2a, { mat: { metalness: 0.8, roughness: 0.35 } });
    g.add(box(m.stone, 1.4, 1.1, 1.4, 0, 0.55, 0), box(m.stone, 1.6, 0.2, 1.6, 0, 1.2, 0), box(m.stone, 1.6, 0.15, 1.6, 0, 0.07, 0));
    g.add(cyl(bronze, 0.12, 0.9, -0.12, 1.75, 0), cyl(bronze, 0.12, 0.9, 0.12, 1.75, 0), rb(bronze, 0.55, 0.75, 0.3, 0.1, 0, 2.55, 0), sph(bronze, 0.17, 0, 3.12, 0));
    const arm = cyl(bronze, 0.07, 0.75, 0.42, 2.85, 0); arm.rotation.z = -2.4; g.add(arm, cyl(bronze, 0.07, 0.7, -0.36, 2.45, 0)); return g; };
  B.tree = (p, th, m) => { const g = new THREE.Group(); LEAF = LEAF || leaf(); g.add(box(m.stone, 0.9, 0.6, 0.9, 0, 0.3, 0), cyl(M(0x5a3a22, { mat: { roughness: 1 } }), 0.12, 2.6, 0, 1.6, 0));
    for (const [a, b, c, r] of [[0, 3.2, 0, 1.0], [0.5, 2.8, 0.3, 0.7], [-0.5, 2.9, -0.2, 0.75], [0.1, 3.7, -0.3, 0.6]]) g.add(sph(LEAF, r, a, b, c)); return g; };
  // ---- the rooftop ----
  B.ac = (p, th, m) => { const g = new THREE.Group(), u = M(0xb8bcc4, { mat: { metalness: 0.6, roughness: 0.4 } }); g.add(rb(u, 2.4, 1.4, 1.6, 0.06, 0, 0.75, 0), box(m.metal, 2.5, 0.08, 1.7, 0, 0.04, 0));
    for (const s of [-0.55, 0.55]) { const fan = cyl(m.black, 0.45, 0.04, s, 1.46, 0); g.add(fan); for (let i = 0; i < 4; i++) g.add(box(m.chrome, 0.85, 0.02, 0.05, s, 1.49, 0, i * Math.PI / 4, false)); }
    for (let y = 0.25; y < 1.2; y += 0.12) g.add(box(m.metal, 2.0, 0.02, 0.02, 0, y, 0.81, 0, false)); return g; };
  B.vent = (p, th, m) => { const g = new THREE.Group(); g.add(cyl(m.chrome, 0.32, 0.8, 0, 0.4, 0), cyl(m.chrome, 0.5, 0.15, 0, 0.88, 0), cyl(m.metal, 0.12, 0.2, 0, 1.0, 0)); return g; };
  B.skylight = (p, th, m) => { const g = new THREE.Group(), w = p.w || 3, d = p.d || 2; g.add(box(m.metal, w, 0.35, d, 0, 0.17, 0)); const gl = K.mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2.1, 0.5, 4), m.glass, false); gl.rotation.y = Math.PI / 4; gl.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4); gl.position.y = 0.6; gl.userData.dyn = 1; g.add(gl, glow('#bfe4ff', 2, 0, 0.5, 0, 0.25)); return g; };
  B.dish = (p, th, m) => { const g = new THREE.Group(); g.add(cyl(m.metal, 0.08, 1.2, 0, 0.6, 0)); const d = K.mesh(new THREE.SphereGeometry(0.7, 20, 8, 0, Math.PI * 2, 0, 0.8), m.white, true, false); d.rotation.x = -1.0; d.position.set(0, 1.3, 0.1); g.add(d); return g; };
  B.stairhouse = (p, th, m) => { const g = new THREE.Group(); g.add(box(M(0xffffff, { surf: T.brick('#7a3a2a', [3, 2]) }), 3.6, 3.0, 3.0, 0, 1.5, 0), box(m.metal, 3.8, 0.12, 3.2, 0, 3.06, 0), box(m.black, 1.0, 2.1, 0.05, 0, 1.05, -1.52), glow(th.glow, 1.4, 0, 2.4, -1.7, 0.6), box(K.basic(th.glow), 0.3, 0.12, 0.1, 0, 2.4, -1.55, 0, false)); return g; };
  B.helipad = (p, th, m) => { const g = new THREE.Group(), s = p.s, tex = K.canvasTex(512, 512, (q, w, h) => { q.fillStyle = '#2a2a30'; q.fillRect(0, 0, w, h); speckle(q, w, h, 3000, 0.1); q.strokeStyle = '#f2b818'; q.lineWidth = 14; q.beginPath(); q.arc(w / 2, h / 2, 200, 0, 7); q.stroke(); q.fillStyle = '#f2f2ee'; q.font = '900 260px Impact, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('H', w / 2, h / 2 + 10); });
    g.add(box(m.metal, s, 0.3, s, 0, 0.15, 0)); const top = K.mesh(new THREE.PlaneGeometry(s, s), K.std(0xffffff, { map: tex, roughness: 0.8 }), false, true); top.rotation.x = -Math.PI / 2; top.position.y = 0.36; g.add(top);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(sph(K.basic(i % 2 ? '#ff3b3b' : '#3ddc84'), 0.07, Math.cos(a) * s / 2.1, 0.4, Math.sin(a) * s / 2.1)); } return g; };
  B.tower = (p, th, m) => { const g = new THREE.Group(), wood = M(0xffffff, { surf: T.wood('#6a4a2a', [3, 2], 16) });
    for (const [a, b] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) g.add(box(m.metal, 0.3, 2.7, 0.3, a, 1.35, b)); for (const s of [-1, 1]) { const x1 = box(m.metal, 0.06, 3.6, 0.06, 0, 1.4, s * 1.6); x1.rotation.z = 0.9; g.add(x1); }
    g.add(box(m.steel, 3.6, 0.3, 3.6, 0, 2.85, 0), cyl(wood, 1.4, 2.6, 0, 4.3, 0), K.mesh(new THREE.ConeGeometry(1.5, 0.8, 16), m.metal, true, false)); g.children[g.children.length - 1].position.y = 6.0;
    for (const y of [3.4, 4.3, 5.2]) g.add(cyl(m.metal, 1.42, 0.06, 0, y, 0)); for (const s of [-1, 1]) g.add(box(m.chrome, 3.6, 0.05, 0.05, 0, 3.95, s * 1.78, 0, false), box(m.chrome, 0.05, 0.05, 3.6, s * 1.78, 3.95, 0, 0, false)); return g; };
  // ---- BP VERSE ----
  B.holo = (p, th, m) => { const g = new THREE.Group(); g.add(cyl(m.metal, 0.6, 0.4, 0, 0.2, 0), cyl(m.metal, 0.6, 0.3, 0, 4.05, 0)); const c = cyl(K.std(0x111111, { emissive: new THREE.Color(th.accent), emissiveIntensity: 1.3, transparent: true, opacity: 0.85 }), 0.4, 3.5, 0, 2.15, 0); c.userData.dyn = 1; g.add(c);
    for (const y of [1, 2, 3]) { const r = K.mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 24), m.trim, false); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); } g.add(glow(th.accent, 3, 0, 2.2, 0, 0.35)); return g; };
  B.neonwall = (p, th, m) => { const g = new THREE.Group(); g.add(rb(m.metal, p.len, 1.1, 0.4, 0.08, 0, 0.55, 0), box(m.trim, p.len, 0.06, 0.42, 0, 1.08, 0, 0, false), box(m.accent, p.len, 0.04, 0.42, 0, 0.2, 0, 0, false)); return g; };
  B.cube = (p, th, m) => { const g = new THREE.Group(); g.add(rb(m.metal, 1.6, 1.6, 1.6, 0.15, 0, 0.8, 0)); for (const s of [-1, 1]) g.add(box(m.trim, 1.62, 0.05, 0.05, 0, 0.8 + s * 0.4, 0.81, 0, false), box(m.accent, 0.05, 1.62, 0.05, s * 0.81, 0.8, 0.81, 0, false)); g.add(glow(th.trim, 2.5, 0, 1.9, 0, 0.3)); return g; };
  B.decal = (p, th, m) => { const g = new THREE.Group(), tex = K.canvasTex(512, 512, (q, w, h) => { q.clearRect(0, 0, w, h); q.strokeStyle = th.trim; q.lineWidth = 12; q.beginPath(); q.arc(w / 2, h / 2, 230, 0, 7); q.stroke(); q.lineWidth = 4; q.beginPath(); q.arc(w / 2, h / 2, 190, 0, 7); q.stroke(); q.fillStyle = th.trim; q.font = '900 170px Impact, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('BP', w / 2, h / 2 + 8); });
    const d = K.mesh(new THREE.PlaneGeometry(7, 7), K.basic(0xffffff, { map: tex, transparent: true, opacity: 0.85, depthWrite: false }), false); d.rotation.x = -Math.PI / 2; d.position.y = 0.015; d.userData.dyn = 1; g.add(d); return g; };
  // ---- the hall of legends ----
  B.throne = (p, th, m) => { const g = new THREE.Group(), y = p.base || 0; g.add(rb(m.gold, 1.4, 0.5, 1.1, 0.06, 0, y + 0.3, 0), rb(m.red, 1.1, 0.12, 0.85, 0.05, 0, y + 0.6, 0.05), rb(m.gold, 1.4, 1.8, 0.2, 0.08, 0, y + 1.1, -0.48), rb(m.red, 1.0, 1.2, 0.05, 0.04, 0, y + 1.2, -0.37));
    for (const s of [-1, 1]) g.add(rb(m.gold, 0.18, 0.5, 1.0, 0.05, s * 0.62, y + 0.82, 0), sph(m.gold, 0.12, s * 0.62, y + 2.05, -0.48)); g.add(glow('#fff2d0', 2.4, 0, y + 2.1, -0.4, 0.4)); return g; };
  B.case = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.wood, 1.6, 0.8, 0.8, 0, 0.4, 0), box(m.gold, 1.62, 0.04, 0.82, 0, 0.81, 0)); const gl = box(m.glass, 1.5, 0.85, 0.7, 0, 1.25, 0, 0, false); gl.userData.dyn = 1; g.add(gl);
    g.add(cyl(m.gold, 0.08, 0.3, -0.35, 0.98, 0), K.mesh(new THREE.CylinderGeometry(0.16, 0.06, 0.25, 12), m.gold, false), cyl(m.gold, 0.1, 0.06, 0.35, 0.86, 0), sph(m.gold, 0.12, 0.35, 1.0, 0)); g.children[g.children.length - 3].position.set(-0.35, 1.25, 0); g.add(glow('#fff2d0', 1.6, 0, 1.3, 0, 0.3)); return g; };
  // ---- the subway ----
  B.train = (p, th, m) => { const g = new THREE.Group(), L = p.len || 12, body = M(0xc8ccd4, { mat: { metalness: 0.8, roughness: 0.3 } });
    g.add(rb(body, L, 3.0, 3.0, 0.25, 0, 1.7, 0), box(m.black, L - 0.2, 0.25, 2.6, 0, 0.12, 0), box(K.basic(th.accent), L, 0.18, 3.02, 0, 1.0, 0, 0, false));
    for (let x = -L / 2 + 1; x < L / 2 - 0.5; x += 1.6) for (const s of [-1, 1]) g.add(box(K.std(0x111111, { emissive: 0xe8f0ff, emissiveIntensity: 0.7 }), 1.1, 0.8, 0.02, x, 2.25, s * 1.51, 0, false));
    for (const x of [-L / 4, L / 4]) for (const s of [-1, 1]) g.add(box(m.black, 1.2, 2.2, 0.03, x, 1.35, s * 1.515, 0, false)); return g; };
  B.kiosk = (p, th, m) => { const g = new THREE.Group(); g.add(rb(M(th.accent, { mat: { roughness: 0.6 } }), 2.2, 1.1, 1.6, 0.05, 0, 0.55, 0), box(m.wood, 2.3, 0.06, 1.7, 0, 1.13, 0), box(m.metal, 2.2, 1.1, 0.1, 0, 1.7, -0.75), box(m.trim, 2.5, 0.12, 1.9, 0, 2.3, 0));
    for (const s of [-1, 1]) g.add(box(m.metal, 0.08, 1.2, 0.08, s * 1.05, 1.7, 0.75)); g.add(glow(th.glow, 1.6, 0, 2.0, 0.4, 0.4)); return g; };
  B.vend = (p, th, m) => { const g = new THREE.Group(); g.add(rb(M(0xc8102e, { mat: { roughness: 0.4 } }), 1.1, 2.0, 0.9, 0.05, 0, 1.0, 0), box(K.std(0x111111, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0.7, 1.4, 0.02, -0.12, 1.15, 0.46, 0, false)); return g; };
  B.turnstile = (p, th, m) => { const g = new THREE.Group(); for (let x = -p.len / 2 + 0.3; x < p.len / 2; x += 0.9) { g.add(rb(m.chrome, 0.25, 1.0, 0.6, 0.05, x, 0.5, 0)); const arm = box(m.chrome, 0.6, 0.04, 0.04, x + 0.35, 0.85, 0.1, 0, false); g.add(arm, box(K.basic('#3ddc84'), 0.1, 0.05, 0.02, x, 0.95, 0.31, 0, false)); } return g; };
  // ---- the alley ----
  B.truck = (p, th, m) => { const g = new THREE.Group(), body = M(0xf2b818, { mat: { metalness: 0.4, roughness: 0.4 } }); g.add(rb(body, 6, 2.4, 2.4, 0.2, 0, 1.6, 0), box(m.black, 2.4, 1.0, 0.02, 0.6, 2.0, 1.21, 0, false), box(m.trim, 3.0, 0.08, 1.0, 0.6, 2.7, 1.6, 0, false));
    const aw = box(M(0xc8102e), 3.0, 0.06, 1.1, 0.6, 2.65, 1.65); aw.rotation.x = 0.25; g.add(aw); for (const [a, b] of [[-2, -1.1], [2, -1.1], [-2, 1.1], [2, 1.1]]) { const w = cyl(m.rubber, 0.42, 0.3, a, 0.42, b); w.rotation.x = Math.PI / 2; g.add(w); }
    g.add(K.textPlane('TACOS', 2.2, 0.5, '900 120px Impact, sans-serif', '#ffffff', '#ff3b3b')); g.children[g.children.length - 1].position.set(0.6, 2.95, 1.22); return g; };
  B.crate = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.wood, 1.3, 1.3, 1.3, 0, 0.65, 0)); for (const s of [-1, 1]) for (const r of [0, 1]) g.add(box(M(0x3a2414), r ? 0.08 : 1.32, r ? 1.32 : 0.08, 1.32, r ? s * 0.62 : 0, r ? 0.65 : 0.65 + s * 0.62, 0)); return g; };
  B.stall = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.wood, 2.6, 1.0, 1.4, 0, 0.5, 0), box(m.wood, 2.7, 0.06, 1.6, 0, 1.03, 0)); for (const [a, b] of [[-1.25, -0.7], [1.25, -0.7], [-1.25, 0.7], [1.25, 0.7]]) g.add(box(m.wood, 0.08, 2.4, 0.08, a, 1.2, b));
    const aw = box(M(th.trim), 2.9, 0.06, 1.8, 0, 2.4, 0.1); aw.rotation.x = 0.15; g.add(aw); for (const x of [-0.9, 0, 0.9]) { g.add(sph(K.std(0x111111, { emissive: 0xff5a3a, emissiveIntensity: 1 }), 0.13, x, 2.1, 0.8), glow('#ff7a4a', 0.8, x, 2.1, 0.8, 0.5)); } return g; };
  B.barrel = (p, th, m) => { const g = new THREE.Group(), bm = M(0x3a5a8a, { mat: { metalness: 0.6, roughness: 0.4 } }); g.add(cyl(bm, 0.38, 0.95, 0, 0.47, 0)); for (const y of [0.2, 0.5, 0.8]) g.add(cyl(m.metal, 0.39, 0.04, 0, y, 0)); return g; };
  // ---- the penthouse ----
  B.island = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.wood, p.len, 0.92, 1.0, 0, 0.46, 0), rb(m.marble, p.len + 0.2, 0.08, 1.15, 0.03, 0, 0.96, 0), box(m.glowM, p.len, 0.03, 0.03, 0, 0.04, 0.51, 0, false));
    for (let x = -p.len / 2 + 0.6; x < p.len / 2; x += 1.2) g.add(cyl(m.gold, 0.03, 0.7, x, 0.35, 0.85), cyl(m.leather, 0.2, 0.08, x, 0.72, 0.85)); g.add(cyl(m.chrome, 0.15, 0.25, 0.8, 1.12, -0.2), glow(th.glow, 1.4, 0, 2.6, 0, 0.4), cyl(m.gold, 0.25, 0.3, 0, 2.6, 0)); return g; };
  B.piano = (p, th, m) => { const g = new THREE.Group(), gloss = M(0x0a0a0c, { mat: { roughness: 0.08, metalness: 0.3 } });
    g.add(rb(gloss, 1.5, 0.3, 1.8, 0.2, 0, 0.85, 0)); const lid = rb(gloss, 1.5, 0.03, 1.7, 0.05, 0, 1.25, 0); lid.rotation.x = -0.5; lid.position.z = 0.25; g.add(lid);
    for (const [a, b] of [[-0.6, -0.7], [0.6, -0.7], [0, 0.7]]) g.add(cyl(gloss, 0.06, 0.7, a, 0.35, b)); g.add(box(m.white, 1.3, 0.04, 0.2, 0, 0.98, -0.95), rb(gloss, 0.8, 0.45, 0.4, 0.05, 0, 0.22, -1.35)); return g; };
  B.hottub = (p, th, m) => { const g = new THREE.Group(); g.add(rb(m.wood, 2.6, 0.7, 2.6, 0.1, 0, 0.35, 0)); const w = box(K.std(0x2a8aff, { emissive: 0x1a5aaa, emissiveIntensity: 0.8, transparent: true, opacity: 0.85, roughness: 0.05 }), 2.2, 0.02, 2.2, 0, 0.66, 0, 0, false); w.userData.dyn = 1; g.add(w, glow('#4ab0ff', 3, 0, 0.8, 0, 0.3)); return g; };
  B.plant = (p, th, m) => { const g = new THREE.Group(); LEAF = LEAF || leaf(); g.add(cyl(m.white, 0.36, 0.6, 0, 0.3, 0)); for (let i = 0; i < 7; i++) { const lf = K.mesh(K.GEO.cone, LEAF, true, false); lf.scale.set(0.12, 1.1, 0.12); lf.position.set(Math.cos(i) * 0.15, 1.05, Math.sin(i) * 0.15); lf.rotation.set(Math.sin(i) * 0.45, 0, Math.cos(i) * 0.45); g.add(lf); } return g; };
  // ---- the junkyard ----
  B.carstack = (p, th, m) => { const g = new THREE.Group(), cols = ['#7a4a2a', '#5a6a7a', '#8a2a2a', '#3a5a3a', '#9a8a4a']; for (let k = 0; k < 3; k++) { const c = M(cols[(k + Math.abs(Math.round(p.x))) % 5], { mat: { roughness: 0.85, metalness: 0.4 } }); g.add(rb(c, 4.2, 0.82, 1.9, 0.15, (k % 2 ? 0.15 : -0.1), 0.43 + k * 0.86, 0, (k - 1) * 0.06)); g.add(box(m.black, 1.4, 0.3, 1.92, 0.3, 0.6 + k * 0.86, 0, 0, false)); } return g; };
  B.tyres = (p, th, m) => { const g = new THREE.Group(); for (let k = 0; k < 4; k++) for (const [a, b] of k < 2 ? [[-0.3, -0.3], [0.3, 0.3]] : [[0, 0]]) { const t = K.mesh(new THREE.TorusGeometry(0.38, 0.15, 8, 16), m.rubber, true, true); t.rotation.x = Math.PI / 2; t.position.set(a, 0.15 + k * 0.29, b); g.add(t); } return g; };
  B.shack = (p, th, m) => { const g = new THREE.Group(), cor = M(0xffffff, { surf: T.metal('#6a5a4a', [3, 1]) }); g.add(box(cor, 4, 2.8, 3, 0, 1.4, 0)); const r = box(cor, 4.4, 0.08, 3.6, 0, 3.0, 0); r.rotation.x = 0.12; g.add(r, box(m.wood, 1.0, 2.0, 0.05, -0.8, 1.0, 1.52, 0, false), box(K.std(0x111111, { emissive: 0xffb050, emissiveIntensity: 0.7 }), 0.9, 0.6, 0.03, 1.0, 1.8, 1.52, 0, false)); return g; };
  B.craneb = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.yellow, 3, 2.2, 3, 0, 1.1, 0), box(m.black, 3.02, 0.3, 3.02, 0, 0.15, 0)); for (let y = 2.2; y < 12; y += 1.5) { for (const [a, b] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) g.add(box(m.yellow, 0.12, 1.5, 0.12, a, y + 0.75, b)); g.add(box(m.yellow, 1.3, 0.08, 0.08, 0, y, 0.6, 0, false)); } g.add(box(m.yellow, 12, 0.4, 0.4, 3, 12, 0)); return g; };
  // ---- the pier ----
  B.boat = (p, th, m) => { const g = new THREE.Group(), hull = M(0xf2f2ee, { mat: { roughness: 0.4 } }); const h = K.mesh(new THREE.CylinderGeometry(0.9, 0.5, 4.2, 12, 1, false, 0, Math.PI), hull, true, true); h.rotation.set(Math.PI / 2, 0, Math.PI); h.position.y = 0.9; g.add(h, box(m.wood, 1.5, 0.05, 3.8, 0, 0.72, 0), box(M(0x2a8ac8), 1.82, 0.12, 4.2, 0, 0.85, 0, 0, false)); return g; };
  B.hut = (p, th, m) => { const g = new THREE.Group(), stripes = K.canvasTex(128, 128, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = i % 2 ? '#f2f2ee' : ['#2a8ac8', '#ff5a3a', '#3ddc84'][Math.abs(Math.round(p.z)) % 3]; q.fillRect(i * 16, 0, 16, h); } });
    g.add(box(K.std(0xffffff, { map: stripes, roughness: 0.7 }), 2.8, 2.3, 2.8, 0, 1.15, 0)); const roof = K.mesh(new THREE.ConeGeometry(2.3, 1.0, 4), M(0x8a5a3a), true, false); roof.rotation.y = Math.PI / 4; roof.position.y = 2.8; g.add(roof, box(m.wood, 1.0, 1.9, 0.05, 0, 0.95, 1.42, 0, false)); return g; };
  B.lounger = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.white, 0.7, 0.08, 1.8, 0, 0.35, 0.1)); const bk = box(m.white, 0.7, 0.08, 0.7, 0, 0.6, -0.8); bk.rotation.x = 0.8; g.add(bk, box(M(0x2a8ac8), 0.6, 0.06, 1.5, 0, 0.42, 0.15, 0, false)); return g; };
  B.palm = (p, th, m) => { const g = new THREE.Group(); g.add(H.palm(0, 0, 6, 0.25)); return g; };
  B.lifeguard = (p, th, m) => { const g = new THREE.Group(); for (const [a, b] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) g.add(box(m.white, 0.22, 2.0, 0.22, a, 1.0, b));
    g.add(box(m.wood, 3, 0.3, 3, 0, 2.15, 0), box(m.white, 2.4, 1.8, 2.0, 0, 3.2, -0.3), box(M(0xc8102e), 2.8, 0.15, 2.6, 0, 4.15, -0.3), box(M(0xc8102e), 2.0, 0.5, 0.05, 0, 2.6, 1.5, 0, false), cyl(m.white, 0.04, 2, 1.3, 5, -1.2));
    g.add(K.textPlane('LIFEGUARD', 1.8, 0.35, '900 100px Impact, sans-serif', '#ffffff', '#c8102e')); g.children[g.children.length - 1].position.set(0, 2.6, 1.53); return g; };
  // ---- the frost temple ----
  B.shrine = (p, th, m) => { const g = new THREE.Group(); g.add(B.plat({ w: 10, d: 6, h: 1.4, look: 'terrace' }, th, m));
    const red = M(0xb8202a, { mat: { roughness: 0.6 } }); for (let x = -2.6; x <= 2.6; x += 1.3) g.add(cyl(red, 0.16, 3.0, x, 2.9, 0.75)); g.add(box(m.wood, 6, 3.0, 3.2, 0, 2.9, -1.2));
    for (let k = 0; k < 2; k++) { const rf = box(M(0x2a2a30, { mat: { roughness: 0.6 } }), 7.4 - k * 1.6, 0.25, 4.6 - k * 1.2, 0, 4.55 + k * 0.9, -0.8); g.add(rf); const cap = box(M(0xeef2f8), 7.5 - k * 1.6, 0.12, 4.7 - k * 1.2, 0, 4.72 + k * 0.9, -0.8, 0, false); g.add(cap); }
    for (const x of [-2, 2]) g.add(sph(K.std(0x111111, { emissive: 0xffb050, emissiveIntensity: 1 }), 0.25, x, 3.9, 1.0), glow('#ffb050', 1.4, x, 3.9, 1.0, 0.5)); return g; };
  B.torii = (p, th, m) => { const g = new THREE.Group(), red = M(0xb8202a, { mat: { roughness: 0.55 } }); for (const s of [-1, 1]) g.add(cyl(red, 0.28, 4.4, s * 2.3, 2.2, 0), cyl(m.black, 0.33, 0.4, s * 2.3, 0.2, 0));
    g.add(box(red, 6.4, 0.32, 0.5, 0, 4.0, 0), box(m.black, 7.2, 0.25, 0.6, 0, 4.45, 0), box(red, 0.3, 0.6, 0.3, 0, 3.6, 0)); return g; };
  B.lantern = (p, th, m) => { const g = new THREE.Group(); g.add(box(m.stone, 0.6, 0.15, 0.6, 0, 0.07, 0), cyl(m.stone, 0.13, 0.9, 0, 0.6, 0), box(m.stone, 0.6, 0.12, 0.6, 0, 1.1, 0), box(K.std(0x111111, { emissive: 0xffc070, emissiveIntensity: 1.1 }), 0.36, 0.3, 0.36, 0, 1.31, 0, 0, false));
    const roof = K.mesh(new THREE.ConeGeometry(0.55, 0.32, 4), m.stone, true, false); roof.rotation.y = Math.PI / 4; roof.position.y = 1.62; g.add(roof, glow('#ffc070', 1.2, 0, 1.32, 0, 0.5)); return g; };
  B.rock = (p, th, m) => { const g = new THREE.Group(), r = K.mesh(new THREE.IcosahedronGeometry(1, 1), M(0xffffff, { surf: T.concrete(th.stone, [1, 1]), mat: { roughness: 0.95, flatShading: true } }), true, true); r.scale.set((p.w || 2) / 2, (p.h || 1.4) * 0.6, (p.d || 1.6) / 2); r.position.y = (p.h || 1.4) * 0.45; g.add(r); return g; };
  B.snowbank = (p, th, m) => { const g = new THREE.Group(), sn = M(0xffffff, { surf: T.snow([1, 1]), mat: { roughness: 0.9 } }); for (let x = -p.len / 2 + 0.6; x < p.len / 2; x += 0.9) { const s = sph(sn, 0.65, x, 0.25, 0); s.scale.set(0.8, 0.55, 0.75); g.add(s); } return g; };
  // ---- the garage ----
  B.jersey = (p, th, m) => { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-0.3, 0); sh.lineTo(0.3, 0); sh.lineTo(0.18, 0.3); sh.lineTo(0.1, 0.85); sh.lineTo(-0.1, 0.85); sh.lineTo(-0.18, 0.3); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: p.len, bevelEnabled: false }); geo.translate(0, 0, -p.len / 2); const j = K.mesh(geo, m.conc, true, true); j.rotation.y = Math.PI / 2; g.add(j);
    for (let x = -p.len / 2 + 0.4; x < p.len / 2; x += 0.8) g.add(box(x % 1.6 < 0.8 ? m.yellow : m.black, 0.4, 0.15, 0.24, x, 0.6, 0, 0, false)); return g; };
  return {
    build(p, th) { const m = mats(th), f = B[p.t]; if (!f) return null; const g = f(p, th, m); return g; },
  };
}
