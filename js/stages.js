// ---------- camera + stages (parallax layers, animated backgrounds) ----------
const cam = { x: WW / 2, z: 1, kick: 0, roll: 0, oy: 0 };
const camZ = () => cam.z + cam.kick;
function updateCamera(snap) {
  if (!P.length) return;
  const [a, b] = P;
  // super cinematics: the camera swings in, rolls and dollies around the fighter
  if (cine && P[cine.side]) {
    const f = P[cine.side], k = cine.t / cine.max, dir = f.facing;
    let tx, ty, z, roll;
    if (cine.kind === 'act') {
      const e = easeOut(Math.min(1, cine.t / 22)), out = k > 0.86 ? ease((k - 0.86) / 0.14) : 0;
      tx = f.x + dir * lerp(-120, 40, ease(k)); ty = f.y - f.h * f.scale * 0.6;
      z = lerp(1.15, 2.2, e) * (1 - out * 0.45);
      roll = -dir * (0.12 * Math.sin(k * Math.PI * 1.2) - 0.04);
      if (f.c.super.move === 'presence' && k > 0.5) { const foe = P[1 - cine.side], m = ease((k - 0.5) / 0.3); tx = lerp(tx, foe.x, m); ty = lerp(ty, foe.y - foe.h * 0.6, m); }
    } else {
      tx = cine.x; ty = cine.y; z = 1.6 + 0.35 * Math.sin(k * Math.PI); roll = 0.14 * Math.sin(k * Math.PI * 2.5);
    }
    cam.x = lerp(cam.x, tx, 0.25); cam.z = lerp(cam.z, z, 0.2); cam.roll = lerp(cam.roll, roll, 0.2);
    cam.oy = lerp(cam.oy, H * 0.5 - FS + cam.z * (FLOOR - ty), 0.25);
    cam.kick *= 0.86; return;
  }
  cam.roll *= 0.88; cam.oy *= 0.85;
  let cx = (a.x + b.x) / 2, z = clamp(W / (Math.abs(a.x - b.x) + 440), 1, 1.28);
  if (matchOver && winner >= 0) { cx = P[winner].x; z = 1.55; }
  else if (introT > 125 && introLong()) { // pre-fight intro: wide while they walk in, in on whoever is talking, then a two-shot
    if (introT <= INTRO_SPEAK[0] && introT > 164) { const spk = introT > INTRO_SPEAK[1] ? a : b, lis = spk === a ? b : a; cx = lerp(spk.x, lis.x, 0.2); z = 1.4; }
    else z = introT > INTRO_SPEAK[0] ? 1.0 : 1.12;
  }
  else if (introT > 120) z = 1.0;
  cx = clamp(cx, W / 2 / z, WW - W / 2 / z);
  cam.x = snap ? cx : lerp(cam.x, cx, 0.12);
  cam.z = snap ? z : lerp(cam.z, z, 0.08);
  cam.kick *= 0.86;
  cam.x = clamp(cam.x, W / 2 / cam.z, WW - W / 2 / cam.z);
}
function worldT() { const z = camZ(); ctx.translate(W / 2, FS + cam.oy); ctx.scale(z, z); ctx.translate(-cam.x, -FLOOR); }
const worldToScreen = (wx, wy) => [W / 2 + (wx - cam.x) * camZ(), FS + cam.oy + (wy - FLOOR) * camZ()];
function applyRoll() {
  if (Math.abs(cam.roll) < 0.001) return;
  ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll); const s = 1 + Math.abs(cam.roll) * 1.9; ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
}
// 2.5D floor: a perspective plane receding to a vanishing point, scrolling with the camera
const FLOOR_BACK = 46;
function perspFloor(st) {
  const z = camZ(), yF = FS + cam.oy, yb = yF - FLOOR_BACK * z, vpY = yb - 240, yEnd = H + 260;
  ctx.fillStyle = st.base; ctx.fillRect(-300, yb, W + 600, yEnd - yb);
  const u0 = (yb - vpY) / (yF - vpY), u1 = (yEnd - vpY) / (yF - vpY), N = 10, rows = [];
  for (let i = 0; i <= N; i++) rows.push(vpY + (yF - vpY) / lerp(1 / u0, 1 / u1, i / N));
  const cell = 90, wx0 = Math.floor((cam.x - 1600) / cell) * cell, wx1 = cam.x + 1600;
  const colX = (wx, y) => W / 2 + (wx - cam.x) * z * (y - vpY) / (yF - vpY);
  if (st.cell) for (let r = 0; r < N; r++) for (let wx = wx0; wx < wx1; wx += cell) {
    const col = st.cell(r, Math.round(wx / cell)); if (!col) continue;
    const y1 = rows[r], y2 = rows[r + 1];
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(colX(wx, y1), y1); ctx.lineTo(colX(wx + cell, y1), y1); ctx.lineTo(colX(wx + cell, y2), y2); ctx.lineTo(colX(wx, y2), y2); ctx.fill();
  }
  ctx.strokeStyle = st.line; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let wx = wx0; wx < wx1; wx += cell) { ctx.moveTo(colX(wx, yb), yb); ctx.lineTo(colX(wx, yEnd), yEnd); }
  for (const y of rows) { ctx.moveTo(-300, y); ctx.lineTo(W + 300, y); }
  ctx.stroke();
  if (st.extra) st.extra(colX, rows, z, vpY, yF);
  const g = ctx.createLinearGradient(0, yb, 0, yb + 70); g.addColorStop(0, st.haze); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-300, yb, W + 600, 70);
  ctx.fillStyle = st.edge; ctx.fillRect(-300, yb - 1, W + 600, 2);
}
// a parallax layer k (0 = fixed sky, 1 = the fight floor) has its own width and scrolls/zooms by k
const LWk = k => Math.ceil(W + (WW - W) * k) + 60;
function inLayer(k, fn) {
  const LW = LWk(k), z = 1 + (camZ() - 1) * k, lx = (cam.x - WW / 2) * k;
  // layers sit behind the floor's back edge; farther ones sit higher
  ctx.save(); ctx.translate(W / 2, FS + cam.oy * (0.3 + 0.7 * k) - FLOOR_BACK * camZ() - (1 - k) * 30); ctx.scale(z, z); ctx.translate(-(LW / 2 + lx), -FLOOR);
  fn(LW); ctx.restore();
}
function paintLayer(k, painter) {
  const c = document.createElement('canvas'); c.width = LWk(k); c.height = FLOOR + 80;
  const b = c.getContext('2d'); b.translate(0, 80); painter(b, c.width); return c;
}
const drawLayerCanvas = (k, c) => inLayer(k, () => ctx.drawImage(c, 0, -80));
const beat = () => Math.pow(1 - (frame % BEAT_FRAMES) / BEAT_FRAMES, 3);

// deterministic pseudo-random for painting
function srand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// ===== BP / VERITY CLUB =====
const club = {};
club.back = paintLayer(0.25, (b, LW) => {
  let g = b.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, '#07040d'); g.addColorStop(1, '#1d0c24');
  b.fillStyle = g; b.fillRect(0, -80, LW, FLOOR + 80);
  b.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let y = 90; y < FLOOR; y += 26) for (let x = (y / 26 % 2) * 38; x < LW; x += 76) b.strokeRect(x, y, 76, 26);
  const neon = (x1, y1, x2, y2, c) => { b.save(); b.shadowColor = c; b.shadowBlur = 18; b.strokeStyle = c; b.lineWidth = 4; b.beginPath(); b.moveTo(x1, y1); b.lineTo(x2, y2); b.stroke(); b.restore(); };
  const cx = LW / 2;
  neon(cx - 330, 110, cx - 170, 110, '#b44dff'); neon(cx + 170, 110, cx + 330, 110, '#f5c518');
  neon(60, 140, 60, 330, '#3b8cff'); neon(LW - 60, 140, LW - 60, 330, '#ff2b2b');
  b.save(); b.textAlign = 'center'; b.font = 'italic 900 46px ' + FONT;
  b.shadowColor = '#ff3fa4'; b.shadowBlur = 25; b.fillStyle = '#ffd6ee'; b.fillText('BP / VERITY CLUB', cx, 168);
  b.shadowColor = '#ff2b2b'; b.font = 'bold 14px sans-serif'; b.fillStyle = '#ff9a9a'; b.fillText('4 LEGENDS · 1 CLUB · ENDLESS PROBLEMS', cx, 192);
  b.restore();
  // speaker stacks
  for (const sx of [130, LW - 200]) for (let k = 0; k < 3; k++) {
    b.fillStyle = '#0b0710'; b.fillRect(sx, 250 + k * 70, 70, 66); b.strokeStyle = '#2a1a33'; b.strokeRect(sx, 250 + k * 70, 70, 66);
    b.fillStyle = '#16101c'; b.beginPath(); b.arc(sx + 35, 283 + k * 70, 24, 0, 7); b.fill();
    b.fillStyle = '#05030a'; b.beginPath(); b.arc(sx + 35, 283 + k * 70, 9, 0, 7); b.fill();
  }
});
// crowd: silhouettes plus the featured club regulars
const CROWD = [];
(function makeCrowd() {
  const r = srand(7), LW = LWk(0.5), rims = ['#ff3fa4', '#3b8cff', '#b44dff', '#f5c518', '#2ee6c8'];
  for (let i = 0; i < 20; i++) {
    const x = 40 + i * (LW - 80) / 19 + (r() - 0.5) * 20;
    if (Math.abs(x - LW / 2) < 110) continue; // DJ booth
    CROWD.push({ x, h: 120 + r() * 50, w: 26 + r() * 14, ph: r() * 6, sp: 0.8 + r() * 0.5, rim: rims[i % 5], arms: r() < 0.45 });
  }
  const put = (type, x) => CROWD.push({ x, h: type === 'creature' ? 215 : 160, w: 34, ph: rand() * 6, sp: 0.9, rim: '#ffffff', type, arms: type === 'hoodie' });
  put('model', LW * 0.3); put('hoodie', LW * 0.68); put('creature', LW * 0.87);
  CROWD.sort((a, b) => a.h - b.h);
})();
function drawDancer(d, t) {
  const bob = Math.sin(t * d.sp * 2 * Math.PI * BPM / 60 / 2 + d.ph) * 5, base = FLOOR - 18 + Math.abs(bob);
  if (d.type === 'creature') {
    if (!ready(CROWD_IMG.creature)) return;
    const hh = d.h, ww = hh / 2, sway = Math.sin(t * 0.8 + d.ph) * 0.05;
    ctx.save(); ctx.translate(d.x, base); ctx.rotate(sway);
    ctx.globalAlpha = 0.92; ctx.drawImage(CROWD_IMG.creature, -ww / 2, -hh, ww, hh); ctx.restore();
    return;
  }
  const h = d.h, w = d.w, top = base - h;
  ctx.save();
  ctx.fillStyle = '#1c1224'; ctx.strokeStyle = rgba(d.rim, 0.4); ctx.lineWidth = 2; ctx.lineCap = 'round';
  // legs + body
  ctx.beginPath(); ctx.roundRect(d.x - w / 2, top + h * 0.22, w, h * 0.42, 8); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = '#1c1224';
  ctx.beginPath(); ctx.moveTo(d.x - w * 0.25, top + h * 0.62); ctx.lineTo(d.x - w * 0.3 - bob * 0.3, base); ctx.moveTo(d.x + w * 0.25, top + h * 0.62); ctx.lineTo(d.x + w * 0.3 + bob * 0.3, base); ctx.stroke();
  // arms: waving up or pumping
  const up = d.arms ? -1 : 0.4, swing = Math.sin(t * 4 + d.ph) * 0.5;
  ctx.lineWidth = 7;
  for (const s of [-1, 1]) {
    const sx = d.x + s * w * 0.45, sy = top + h * 0.27;
    const ax = sx + s * (12 + swing * 8), ay = sy + up * h * 0.32 + (d.arms ? swing * 10 : 0);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ax, ay); ctx.stroke();
  }
  // head
  const hr = w * 0.48, hx = d.x + Math.sin(t * 3 + d.ph) * 2, hy = top + h * 0.1;
  const pic = d.type && CROWD_IMG[d.type];
  if (pic && ready(pic)) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy, hr * 1.15, hr * 1.35, 0, 0, 7); ctx.clip();
    ctx.drawImage(pic, hx - hr * 1.2, hy - hr * 1.4, hr * 2.4, hr * 2.8);
    ctx.fillStyle = 'rgba(30,0,40,0.25)'; ctx.fillRect(hx - hr * 2, hy - hr * 2, hr * 4, hr * 4); ctx.restore();
  } else { ctx.fillStyle = '#0c0712'; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill(); ctx.strokeStyle = rgba(d.rim, 0.5); ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}
club.draw = function () {
  const t = frame / 60, bt = beat();
  ctx.fillStyle = '#07040d'; ctx.fillRect(0, 0, W, H);
  drawLayerCanvas(0.25, club.back);
  // disco ball + light specks
  inLayer(0.3, LW => {
    const x = LW / 2, y = 60;
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x, y - 26); ctx.stroke();
    const g = ctx.createRadialGradient(x - 8, y - 8, 2, x, y, 26); g.addColorStop(0, '#fff'); g.addColorStop(1, '#6a6a7a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - 30, y + i * 8); ctx.lineTo(x + 30, y + i * 8); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const xx = x + Math.sin(t * 1.2 + i * 0.8) * 26; ctx.beginPath(); ctx.moveTo(xx, y - 30); ctx.lineTo(xx, y + 30); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4 + t * 0.6, sx = x + Math.cos(a) * (180 + (i * 37) % 260), sy = 120 + ((i * 53) % 260) + Math.sin(a * 0.7) * 20;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * ((i + Math.floor(t * 2)) % 3 === 0)})`; ctx.fillRect(sx, sy, 3, 3);
    }
    ctx.restore();
  });
  // crowd, DJ, bar
  inLayer(0.5, LW => {
    const cx = LW / 2;
    // DJ booth
    ctx.fillStyle = '#120a18'; ctx.fillRect(cx - 90, FLOOR - 95, 180, 80);
    ctx.fillStyle = '#ff3fa4'; ctx.globalAlpha = 0.4 + 0.6 * bt; ctx.fillRect(cx - 90, FLOOR - 97, 180, 4); ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#3b8cff', '#2ee6c8', '#f5c518'][i % 3]; ctx.globalAlpha = (i + Math.floor(t * 4)) % 3 ? 0.25 : 1; ctx.fillRect(cx - 70 + i * 26, FLOOR - 80, 10, 4); }
    ctx.globalAlpha = 1;
    const nod = Math.sin(t * 2 * Math.PI * BPM / 60) * 3;
    ctx.fillStyle = '#0a0610'; ctx.beginPath(); ctx.roundRect(cx - 20, FLOOR - 150, 40, 58, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, FLOOR - 165 + nod, 15, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2ee6c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, FLOOR - 166 + nod, 17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    for (const d of CROWD) drawDancer(d, t);
  });
};
club.floor = function () {
  const g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 120);
  g.addColorStop(0, '#2b1630'); g.addColorStop(1, '#0c060e');
  ctx.fillStyle = g; ctx.fillRect(-300, FLOOR, WW + 600, 200);
  const bt = beat();
  for (let i = 0; i < 24; i++) for (let j = 0; j < 2; j++) {
    const lit = (i + j + Math.floor(frame / BEAT_FRAMES)) % 4 === 0;
    ctx.fillStyle = lit ? rgba(['#ff3fa4', '#3b8cff', '#b44dff', '#2ee6c8'][i % 4], 0.12 + 0.18 * bt) : 'rgba(255,255,255,0.025)';
    ctx.fillRect(i * 64 - 18, FLOOR + 6 + j * 26, 60, 22);
  }
  ctx.fillStyle = 'rgba(255,63,164,0.6)'; ctx.fillRect(-300, FLOOR, WW + 600, 2);
};
club.front = function () {
  const t = frame / 60;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [['#ff3fa4', 180, 0.7], ['#3b8cff', 480, 1.1], ['#b44dff', 780, 0.9]].forEach(([c, x, sp], i) => {
    const tx = x + Math.sin(t * sp + i) * 170, g = ctx.createLinearGradient(0, 0, 0, FS);
    g.addColorStop(0, c + '30'); g.addColorStop(1, c + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(tx + 90, FS); ctx.lineTo(tx - 90, FS); ctx.fill();
  });
  // lasers on the beat
  const bt = beat();
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = Math.sin(t * 0.9 + i) * 0.5 + (i < 2 ? 0.6 : 2.5);
    ctx.strokeStyle = rgba(i % 2 ? '#2ee6c8' : '#ff2b2b', 0.15 + 0.35 * bt);
    const ox = i < 2 ? 0 : W; ctx.beginPath(); ctx.moveTo(ox, 30); ctx.lineTo(ox + Math.cos(a) * 1200, 30 + Math.sin(a) * 1200); ctx.stroke();
  }
  ctx.restore();
  // floor haze
  const g = ctx.createLinearGradient(0, FS - 90, 0, H);
  g.addColorStop(0, 'rgba(180,120,220,0)'); g.addColorStop(1, 'rgba(180,120,220,0.12)');
  ctx.fillStyle = g; ctx.fillRect(0, FS - 90, W, H);
};

// ===== THE GARDEN =====
const garden = {};
garden.hills = paintLayer(0.2, (b, LW) => {
  const r = srand(3);
  for (const [base, amp, col] of [[300, 50, '#8fbf7a'], [360, 40, '#6fa35e']]) {
    b.fillStyle = col; b.beginPath(); b.moveTo(0, FLOOR);
    for (let x = 0; x <= LW; x += 20) b.lineTo(x, base + Math.sin(x / 160 + base) * amp + Math.sin(x / 57) * 8);
    b.lineTo(LW, FLOOR); b.fill();
  }
  for (let i = 0; i < 40; i++) { b.fillStyle = '#4f8a45'; const x = r() * LW, y = 330 + r() * 60; b.beginPath(); b.arc(x, y, 8 + r() * 10, 0, 7); b.fill(); }
});
garden.hedge = paintLayer(0.75, (b, LW) => {
  const r = srand(11);
  // hedge wall with arches
  b.fillStyle = '#2f6b34'; b.beginPath(); b.roundRect(0, FLOOR - 125, LW, 125, 20); b.fill();
  for (let x = 0; x < LW; x += 14) { b.fillStyle = r() < 0.5 ? '#3a7d3f' : '#285c2c'; b.beginPath(); b.arc(x, FLOOR - 122 + r() * 6, 10, 0, 7); b.fill(); }
  for (let x = 160; x < LW; x += 360) {
    b.fillStyle = '#16351a'; b.beginPath(); b.moveTo(x - 40, FLOOR); b.lineTo(x - 40, FLOOR - 70); b.arc(x, FLOOR - 70, 40, Math.PI, 0); b.lineTo(x + 40, FLOOR); b.fill();
  }
  // flower beds
  for (let i = 0; i < 260; i++) {
    const x = r() * LW, y = FLOOR - 4 - r() * 26;
    b.fillStyle = ['#ff6fa8', '#ffd84d', '#ffffff', '#b77cff', '#ff8a4d'][i % 5]; b.beginPath(); b.arc(x, y, 3 + r() * 2, 0, 7); b.fill();
  }
  // lamp posts
  for (let x = 340; x < LW; x += 360) {
    b.fillStyle = '#222'; b.fillRect(x - 3, FLOOR - 150, 6, 150); b.fillRect(x - 12, FLOOR - 158, 24, 10);
    b.fillStyle = '#ffe9a8'; b.beginPath(); b.arc(x, FLOOR - 166, 8, 0, 7); b.fill();
  }
});
const TREES = []; (() => { const r = srand(5), LW = LWk(0.45); for (let x = 30; x < LW; x += 110 + r() * 60) TREES.push({ x, h: 140 + r() * 80, r: 40 + r() * 25, ph: r() * 6 }); })();
const CLOUDS = [0, 1, 2, 3, 4].map(i => ({ x: i * 260, y: 50 + (i * 37) % 90, s: 0.6 + (i % 3) * 0.25 }));
const BUTTERFLIES = [0, 1, 2, 3].map(i => ({ ph: i * 1.7, col: ['#ffd84d', '#7ac7ff', '#ff8ad1', '#ffffff'][i] }));
garden.draw = function () {
  const t = frame / 60;
  const g = ctx.createLinearGradient(0, 0, 0, FS);
  g.addColorStop(0, '#5aa7ff'); g.addColorStop(0.6, '#bfe0ff'); g.addColorStop(1, '#ffe1b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(W * 0.72, 120, 10, W * 0.72, 120, 160); sg.addColorStop(0, 'rgba(255,240,200,0.9)'); sg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, 320); ctx.restore();
  ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(W * 0.72, 120, 34, 0, 7); ctx.fill();
  for (const c of CLOUDS) {
    const x = ((c.x + t * 12 * c.s) % (W + 300)) - 150;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [60, 0, 24], [30, 8, 26]]) { ctx.beginPath(); ctx.arc(x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 7); ctx.fill(); }
  }
  drawLayerCanvas(0.2, garden.hills);
  inLayer(0.45, () => {
    for (const tr of TREES) {
      const sway = Math.sin(t * 1.3 + tr.ph) * 4;
      ctx.fillStyle = '#5a3d26'; ctx.fillRect(tr.x - 7, FLOOR - tr.h, 14, tr.h);
      for (const [dx, dy, k, col] of [[0, 0, 1, '#3f7f3a'], [-tr.r * 0.6, 14, 0.75, '#3a7535'], [tr.r * 0.6, 12, 0.75, '#2f6a2e'], [-tr.r * 0.2, -tr.r * 0.4, 0.6, '#5a9c4e']]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tr.x + dx + sway * k, FLOOR - tr.h + dy, tr.r * k, 0, 7); ctx.fill();
      }
    }
  });
  drawLayerCanvas(0.75, garden.hedge);
  inLayer(0.75, LW => {
    // fountain
    const x = LW / 2, y = FLOOR - 4;
    ctx.fillStyle = '#b9b2a6'; ctx.beginPath(); ctx.ellipse(x, y - 14, 120, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7fc4e8'; ctx.beginPath(); ctx.ellipse(x, y - 18, 104, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#a49c90'; ctx.fillRect(x - 10, y - 110, 20, 96); ctx.beginPath(); ctx.ellipse(x, y - 110, 40, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,235,255,0.85)';
    for (let i = 0; i < 46; i++) {
      const p = ((t * 0.8 + i / 46) % 1), side = i % 2 ? 1 : -1, vx = 60 + (i % 5) * 10;
      ctx.beginPath(); ctx.arc(x + side * vx * p, y - 118 - 120 * p + 200 * p * p, 2.2, 0, 7); ctx.fill();
    }
    // butterflies
    for (const b of BUTTERFLIES) {
      const bx = (LW / 2 + Math.sin(t * 0.4 + b.ph) * LW * 0.4), by = FLOOR - 170 + Math.sin(t * 1.7 + b.ph * 2) * 40, flap = Math.abs(Math.sin(t * 14 + b.ph));
      ctx.fillStyle = b.col;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + s * 5 * flap, by, 6 * flap + 1, 5, 0, 0, 7); ctx.fill(); }
    }
  });
};
garden.floor = function () {
  ctx.fillStyle = '#4c8c3f'; ctx.fillRect(-300, FLOOR, WW + 600, 200);
  ctx.fillStyle = '#a8a294';
  for (let i = -4; i < 40; i++) for (let j = 0; j < 3; j++) {
    const x = i * 48 + (j % 2) * 24;
    ctx.beginPath(); ctx.roundRect(x, FLOOR + 4 + j * 22, 44, 18, 4); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-300, FLOOR, WW + 600, 4);
};
const PETALS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 97) % W, y: (i * 61) % H, s: 0.5 + (i % 4) * 0.25, ph: i }));
garden.front = function () {
  const t = frame / 60;
  for (const p of PETALS) {
    const y = (p.y + t * 30 * p.s) % (H + 20) - 10, x = (p.x + Math.sin(t + p.ph) * 30 + t * 14 * p.s) % (W + 20);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + p.ph); ctx.fillStyle = 'rgba(255,170,205,0.85)';
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,220,160,0.08)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};

// ===== ROOFTOP =====
const roof = {};
const STARS = Array.from({ length: 90 }, (_, i) => ({ x: (i * 173) % W, y: (i * 89) % 300, r: (i % 3) * 0.5 + 0.6, ph: i }));
const skyline = (k, col, seed, minH, maxH, neon) => paintLayer(k, (b, LW) => {
  const r = srand(seed);
  for (let x = 0; x < LW;) {
    const w = 50 + r() * 80, h = minH + r() * (maxH - minH);
    b.fillStyle = col; b.fillRect(x, FLOOR - h, w, h);
    for (let wy = FLOOR - h + 10; wy < FLOOR - 10; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12)
      if (r() < 0.32) { b.fillStyle = r() < 0.8 ? 'rgba(255,214,120,0.75)' : 'rgba(140,200,255,0.7)'; b.fillRect(wx, wy, 5, 7); }
    if (neon && r() < 0.35) { b.save(); const c = ['#ff3fa4', '#2ee6c8', '#b44dff'][Math.floor(r() * 3)]; b.shadowColor = c; b.shadowBlur = 14; b.fillStyle = c; b.fillRect(x + 8, FLOOR - h + 14, w - 16, 6); b.restore(); }
    x += w + r() * 10;
  }
});
roof.far = skyline(0.15, '#121636', 21, 120, 300, false);
roof.near = skyline(0.4, '#0a0c22', 33, 160, 360, true);
roof.props = paintLayer(0.85, (b, LW) => {
  b.strokeStyle = '#3a3a48'; b.lineWidth = 4; b.beginPath(); b.moveTo(0, FLOOR - 60); b.lineTo(LW, FLOOR - 60); b.stroke();
  for (let x = 0; x < LW; x += 40) { b.beginPath(); b.moveTo(x, FLOOR - 60); b.lineTo(x, FLOOR); b.stroke(); }
  for (const x of [200, LW - 380]) { b.fillStyle = '#3c3c4a'; b.fillRect(x, FLOOR - 90, 120, 90); b.fillStyle = '#2a2a36'; b.beginPath(); b.arc(x + 60, FLOOR - 45, 30, 0, 7); b.fill(); }
  const tx = LW * 0.62; b.fillStyle = '#4a3a2c'; b.fillRect(tx, FLOOR - 230, 90, 120); b.fillRect(tx + 5, FLOOR - 110, 8, 110); b.fillRect(tx + 77, FLOOR - 110, 8, 110);
  b.beginPath(); b.moveTo(tx - 6, FLOOR - 230); b.lineTo(tx + 45, FLOOR - 262); b.lineTo(tx + 96, FLOOR - 230); b.fill();
  b.fillStyle = '#555'; b.fillRect(LW * 0.2, FLOOR - 260, 4, 200);
});
roof.draw = function () {
  const t = frame / 60;
  const g = ctx.createLinearGradient(0, 0, 0, FS); g.addColorStop(0, '#02030f'); g.addColorStop(1, '#2a1650');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 2 + s.ph)})`; ctx.fillRect(s.x, s.y, s.r, s.r); }
  ctx.fillStyle = '#f4f1e0'; ctx.beginPath(); ctx.arc(W * 0.2, 90, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a1650'; ctx.beginPath(); ctx.arc(W * 0.2 + 12, 82, 27, 0, 7); ctx.fill();
  drawLayerCanvas(0.15, roof.far);
  inLayer(0.3, LW => {
    // helicopter searchlight
    const hx = (t * 40) % (LW + 400) - 200, hy = 70;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const a = Math.sin(t) * 0.4, g2 = ctx.createLinearGradient(hx, hy, hx, FLOOR);
    g2.addColorStop(0, 'rgba(255,255,220,0.25)'); g2.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.sin(a) * 400 - 70, FLOOR); ctx.lineTo(hx + Math.sin(a) * 400 + 70, FLOOR); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#111'; ctx.fillRect(hx - 18, hy - 6, 36, 12); ctx.fillRect(hx + 14, hy - 3, 26, 4);
    ctx.fillStyle = frame % 40 < 20 ? '#ff2b2b' : '#330000'; ctx.fillRect(hx - 2, hy - 9, 4, 3);
  });
  drawLayerCanvas(0.4, roof.near);
  inLayer(0.4, LW => { for (let i = 0; i < 8; i++) { ctx.fillStyle = (frame + i * 17) % 60 < 30 ? '#ff2b2b' : '#400'; ctx.fillRect(80 + i * LW / 8, FLOOR - 340 + (i * 47) % 140, 4, 4); } });
  drawLayerCanvas(0.85, roof.props);
  inLayer(0.85, LW => { ctx.fillStyle = frame % 50 < 25 ? '#ff2b2b' : '#500'; ctx.beginPath(); ctx.arc(LW * 0.2 + 2, FLOOR - 262, 4, 0, 7); ctx.fill(); });
};
roof.floor = function () {
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(-300, FLOOR, WW + 600, 200);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = -300; x < WW + 300; x += 90) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - 40, FLOOR + 120); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(245,197,24,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(WW / 2, FLOOR + 30, 170, 22, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(245,197,24,0.55)'; ctx.font = `900 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(WW / 2, FLOOR + 30); ctx.scale(1, 0.35); ctx.fillText('H', 0, 0); ctx.restore();
  ctx.fillStyle = 'rgba(120,140,255,0.08)'; for (const x of [300, 900, 1200]) { ctx.beginPath(); ctx.ellipse(x, FLOOR + 50, 70, 8, 0, 0, 7); ctx.fill(); }
};
const RAIN = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137) % W, y: (i * 71) % H, s: 0.8 + (i % 3) * 0.2 }));
roof.front = function () {
  ctx.strokeStyle = 'rgba(170,190,255,0.25)'; ctx.lineWidth = 1;
  for (const r of RAIN) {
    const y = (r.y + frame * 9 * r.s) % (H + 30) - 30, x = (r.x - frame * 2 * r.s) % W;
    ctx.beginPath(); ctx.moveTo((x + W) % W, y); ctx.lineTo((x + W) % W - 3, y + 14); ctx.stroke();
  }
};

club.floorStyle = {
  base: '#1a0d20', line: 'rgba(255,63,164,0.3)', haze: 'rgba(120,40,150,0.7)', edge: 'rgba(255,63,164,0.7)',
  cell: (r, c) => (r + c + Math.floor(frame / BEAT_FRAMES)) % 5 === 0 ? rgba(['#ff3fa4', '#3b8cff', '#b44dff', '#2ee6c8'][((c % 4) + 4) % 4], 0.08 + 0.25 * beat()) : null,
};
garden.floorStyle = {
  base: '#4c8c3f', line: 'rgba(0,0,0,0.1)', haze: 'rgba(255,235,190,0.45)', edge: 'rgba(40,80,30,0.6)',
  cell: (r, c) => r >= 2 && r <= 5 ? ((r + c) % 2 ? '#aaa496' : '#9d968a') : ((r + c) % 2 ? 'rgba(0,0,0,0.06)' : null),
};
roof.floorStyle = {
  base: '#2a2a33', line: 'rgba(255,255,255,0.06)', haze: 'rgba(40,20,90,0.7)', edge: 'rgba(160,160,200,0.4)',
  cell: (r, c) => (((c % 7) + 7) % 7 === 0 && r % 3 === 1) ? 'rgba(120,140,255,0.1)' : null,
  extra(colX, rows, z, vpY, yF) {
    const y = rows[5], sx = colX(WW / 2, y), rx = 170 * z * (y - vpY) / (yF - vpY);
    ctx.strokeStyle = 'rgba(245,197,24,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx, y, rx, rx * 0.16, 0, 0, 7); ctx.stroke();
  },
};

// ===== BP VERSE: the city art with animated fog, lights, rain and lightning =====
const verse = {};
const TWINKLE = Array.from({ length: 70 }, (_, i) => ({ x: (i * 197) % 1000 / 1000, y: 0.45 + ((i * 89) % 100) / 100 * 0.5, ph: i * 1.7, c: i % 4 ? '#ffd27a' : '#ff3355' }));
function drawVerseArt(px, zoom, alpha) {
  const t = frame / 60;
  ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
  if (ready(VERSE_IMG)) {
    const s = zoom * (1.06 + 0.02 * Math.sin(t / 9)), w = W * s, h = H * s;
    const ox = (W - w) / 2 + px + Math.sin(t / 13) * 10, oy = (H - h) / 2 + Math.cos(t / 11) * 6;
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.drawImage(VERSE_IMG, ox, oy, w, h); ctx.globalAlpha = 1;
    // blood moon glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const mx = ox + w * 0.29, my = oy + h * 0.12, pulse = 0.18 + 0.1 * Math.sin(t * 1.3);
    const g = ctx.createRadialGradient(mx, my, 10, mx, my, 200 * s); g.addColorStop(0, `rgba(255,40,40,${pulse})`); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // city lights twinkling
    for (const p of TWINKLE) { const a = 0.15 + 0.6 * Math.max(0, Math.sin(t * 2 + p.ph)); ctx.fillStyle = rgba(p.c, a); ctx.fillRect(ox + p.x * w, oy + p.y * h, 2, 2); }
    // lightning over the purple side every few seconds
    const lt = (frame % 520); if (lt < 10 && lt % 4 < 2) { ctx.fillStyle = 'rgba(170,120,255,0.18)'; ctx.fillRect(W * 0.5, 0, W * 0.5, H * 0.6); }
    ctx.restore();
  }
  // drifting fog banks
  for (let i = 0; i < 6; i++) {
    const sp = 6 + i * 4, x = ((t * sp + i * 260) % (W + 600)) - 300, y = H * (0.42 + (i % 3) * 0.1);
    const g = ctx.createRadialGradient(x, y, 10, x, y, 260); g.addColorStop(0, 'rgba(150,130,170,0.13)'); g.addColorStop(1, 'rgba(150,130,170,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 300, y - 120, 600, 240);
  }
}
verse.draw = function () { drawVerseArt(-(cam.x - WW / 2) * 0.08, 1 + (camZ() - 1) * 0.1, 1); ctx.fillStyle = 'rgba(5,2,10,0.25)'; ctx.fillRect(0, 0, W, H); };
verse.floorStyle = {
  base: '#140a12', line: 'rgba(255,40,60,0.14)', haze: 'rgba(60,10,30,0.8)', edge: 'rgba(255,40,60,0.55)',
  cell: (r, c) => (((c * 7 + r * 3) % 11) === 0) ? 'rgba(255,40,60,0.12)' : ((r + c) % 2 ? 'rgba(255,255,255,0.015)' : null),
};
verse.front = roof.front;

// the newer stages are full 3D sets; in the 2D renderer they get a painted sky, two silhouette layers and a themed floor
function simpleStage(o) {
  const st = {}; let far = null, mid = null;
  const rows = (b, w, col, h0, h1, step, win) => { const r = srand(o.seed || 3); b.fillStyle = col; for (let x = -40; x < w + 40; x += step * (0.6 + r())) { const hh = h0 + r() * (h1 - h0); b.fillRect(x, FLOOR - hh, step * 0.9, hh); if (win) { b.fillStyle = win; for (let y = FLOOR - hh + 10; y < FLOOR - 20; y += 16) for (let xx = x + 6; xx < x + step * 0.8; xx += 12) if (r() < 0.3) b.fillRect(xx, y, 5, 7); b.fillStyle = col; } } };
  st.draw = function () {
    if (!far) { far = paintLayer(0.2, (b, w) => rows(b, w, o.far, 120, 300, 70, o.win)); mid = paintLayer(0.55, (b, w) => rows(b, w, o.mid, 60, 160, 110, null)); }
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.sky[0]); g.addColorStop(1, o.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.sun) { const sg = ctx.createRadialGradient(W * 0.7, H * 0.35, 4, W * 0.7, H * 0.35, 140); sg.addColorStop(0, o.sun); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); }
    drawLayerCanvas(0.2, far); drawLayerCanvas(0.55, mid);
  };
  st.front = function () {};
  st.floorStyle = { base: o.floor, line: 'rgba(255,255,255,0.06)', haze: o.haze || 'rgba(0,0,0,0.5)', edge: o.edge || 'rgba(255,255,255,0.3)', cell: (r, c) => ((r + c) % 2 ? 'rgba(255,255,255,0.025)' : null) };
  return st;
}
const STAGES = [
  { id: 'club', name: 'BP / VERITY CLUB', ...club },
  { id: 'garden', name: 'THE GARDEN', ...garden },
  { id: 'roof', name: 'ROOFTOP', ...roof },
  { id: 'verse', name: 'BP VERSE', ...verse },
  { id: 'hall', name: 'HALL OF LEGENDS', ...simpleStage({ sky: ['#1a1a26', '#3a3646'], far: '#2a2834', mid: '#4a4652', floor: '#cfc9bf', seed: 4 }) },
  { id: 'court', name: 'STREET COURT', ...simpleStage({ sky: ['#3a2a6a', '#ff9a6a'], far: '#2a1a2a', mid: '#5a2a24', floor: '#2f4f6d', sun: 'rgba(255,200,120,0.7)', win: '#ffcf7a', seed: 5 }) },
  { id: 'subway', name: 'METRO LINE 12', ...simpleStage({ sky: ['#0c0e12', '#2a2e36'], far: '#1a1c22', mid: '#3a3e46', floor: '#8c8c90', seed: 6 }) },
  { id: 'alley', name: 'NEON ALLEY', ...simpleStage({ sky: ['#05050c', '#2a1a4a'], far: '#120a20', mid: '#24142e', floor: '#1c1c22', win: '#ff7ab0', seed: 7 }) },
  { id: 'gym', name: 'IRON GYM', ...simpleStage({ sky: ['#3a2416', '#8a6038'], far: '#5a3424', mid: '#7a4a34', floor: '#8a6038', seed: 8 }) },
  { id: 'penthouse', name: 'SKYLINE PENTHOUSE', ...simpleStage({ sky: ['#05061a', '#2a2a5a'], far: '#0a0c18', mid: '#141626', floor: '#1c1c22', win: '#ffd27a', seed: 9 }) },
  { id: 'junkyard', name: 'SCRAP KINGS', ...simpleStage({ sky: ['#3a2a5a', '#ff8a4a'], far: '#2a1a1a', mid: '#4a2a1a', floor: '#5a4c3e', sun: 'rgba(255,170,90,0.6)', seed: 10 }) },
  { id: 'beach', name: 'SUNSET PIER', ...simpleStage({ sky: ['#3a2a7a', '#ffb07a'], far: '#5a3a5a', mid: '#2a4a6a', floor: '#9a7a52', sun: 'rgba(255,210,130,0.8)', seed: 11 }) },
  { id: 'temple', name: 'FROST TEMPLE', ...simpleStage({ sky: ['#7a9ac8', '#eef2fa'], far: '#9aa6b8', mid: '#6a2a2a', floor: '#c8d0dc', seed: 12 }) },
  { id: 'garage', name: 'PARKING LEVEL B2', ...simpleStage({ sky: ['#0a0b0d', '#2a2a2e'], far: '#18181c', mid: '#3a3a3e', floor: '#5a5a5e', seed: 13 }) },
];
let stageId = 0;

function drawWorldStage() {
  const st = STAGES[stageId];
  st.draw();
  perspFloor(st.floorStyle);
}
