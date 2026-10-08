// ---------- HUD, screens, menus, main loop ----------
function bigText(t, y, size, col, stroke, x) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${size}px ${FONT}`;
  ctx.lineWidth = size / 7; ctx.strokeStyle = stroke || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(t, x || W / 2, y);
  ctx.fillStyle = col || '#fff'; ctx.fillText(t, x || W / 2, y);
  ctx.restore();
}
function quad(pts, R) { ctx.beginPath(); pts.forEach(([x, y], i) => { const X = R ? W - x : x; if (i) ctx.lineTo(X, y); else ctx.moveTo(X, y); }); ctx.closePath(); }
const barPts = (x, y, w, h, sk) => [[x + sk, y], [x + w + sk, y], [x + w, y + h], [x, y + h]];
function vignette(a, col) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ----- Injustice-style health: gold first bar, red critical second bar -----
function drawSideHUD(f, R) {
  const c = f.c, half = f.maxHp / 2;
  const frameP = [[18, 10], [100, 10], [88, 92], [6, 92]];
  quad(frameP, R); ctx.fillStyle = '#0c0812'; ctx.fill();
  ctx.save(); quad(frameP, R); ctx.clip();
  const px = R ? W - 52 : 52, g = ctx.createRadialGradient(px, 40, 4, px, 50, 60);
  g.addColorStop(0, rgba(c.color, 0.7)); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(px - 60, 0, 120, 100);
  drawFace(c, f.skin, px, 60, 32, R);
  ctx.restore();
  quad(frameP, R); ctx.strokeStyle = f.bar ? (frame % 30 < 15 ? '#ff3b3b' : c.color) : c.color; ctx.lineWidth = 3; ctx.stroke();

  const bx = 104, by = 20, bw = 356, bh = 24, sk = 12;
  quad(barPts(bx - 4, by - 4, bw + 8, bh + 8, sk), R); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
  quad(barPts(bx, by, bw, bh, sk), R); ctx.fillStyle = '#1a0609'; ctx.fill();
  const seg = clamp(f.bar === 0 ? (f.hp - half) / half : f.hp / half, 0, 1);
  const dseg = clamp(f.bar === 0 ? (f.dispHp - half) / half : Math.min(f.dispHp, half) / half, 0, 1);
  const refill = f.bar === 1 && f.barAnim > 0 ? 1 - f.barAnim / 70 : 1;
  const span = q => { const w = (bw + sk) * q; return R ? [W - bx - w, w] : [bx, w]; };
  ctx.save(); quad(barPts(bx, by, bw, bh, sk), R); ctx.clip();
  let [x, w] = span(dseg * refill); ctx.fillStyle = '#fff7e0'; ctx.fillRect(x, by, w, bh);
  [x, w] = span(seg * refill);
  const lg = ctx.createLinearGradient(0, by, 0, by + bh);
  if (f.bar === 0) { lg.addColorStop(0, '#fff3a0'); lg.addColorStop(0.45, '#ffcc22'); lg.addColorStop(1, '#c87800'); }
  else { const p = 0.75 + 0.25 * Math.sin(frame / 5); lg.addColorStop(0, `rgba(255,${120 * p | 0},${120 * p | 0},1)`); lg.addColorStop(0.5, '#e01b2b'); lg.addColorStop(1, '#7a0010'); }
  ctx.fillStyle = lg; ctx.fillRect(x, by, w, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(R ? W - bx - bw - sk : bx, by + 2, bw + sk, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const tx = bx + bw * i / 10 + sk * 0.5; ctx.beginPath(); ctx.moveTo(R ? W - tx - sk / 2 : tx + sk / 2, by); ctx.lineTo(R ? W - tx + sk / 2 : tx - sk / 2, by + bh); ctx.stroke(); }
  ctx.restore();
  quad(barPts(bx, by, bw, bh, sk), R); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();

  // reserve (second) bar
  const rx = 112, ry = by + bh + 7, rw = bw - 46, rh = 8;
  quad(barPts(rx, ry, rw, rh, 4), R); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
  if (f.bar === 0) { quad(barPts(rx + 1, ry + 1, rw - 2, rh - 2, 4), R); ctx.fillStyle = '#d0172b'; ctx.fill(); }
  quad(barPts(rx, ry, rw, rh, 4), R); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = `italic 900 19px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = R ? 'right' : 'left';
  ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.fillStyle = c.color;
  const nx = R ? W - 112 : 112, nm = c.name.toUpperCase();
  ctx.strokeText(nm, nx, ry + 12); ctx.fillText(nm, nx, ry + 12);
  if (f.bar === 1 && frame % 40 < 28) {
    ctx.textAlign = R ? 'left' : 'right'; ctx.fillStyle = '#ff3b3b'; ctx.font = `italic 900 16px ${FONT}`;
    const cx = R ? W - bx - bw + 40 : bx + bw - 40; ctx.strokeText('CRITICAL', cx, ry + 12); ctx.fillText('CRITICAL', cx, ry + 12);
  }

  // super meter: 4 segments
  const my = H - 32;
  for (let i = 0; i < 4; i++) {
    const sx = 22 + i * 54, q = clamp((f.meter - i * 25) / 25, 0, 1);
    quad(barPts(sx, my, 48, 13, 6), R); ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
    if (q > 0) {
      ctx.save(); quad(barPts(sx, my, 48, 13, 6), R); ctx.clip();
      ctx.fillStyle = q >= 1 ? c.color : rgba(c.color, 0.45);
      const ww = 54 * q; ctx.fillRect(R ? W - sx - ww : sx, my, ww, 13);
      if (q >= 1) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.2 * Math.sin(frame / 6 + i)) + ')'; ctx.fillRect(R ? W - sx - 54 : sx, my, 54, 4); }
      ctx.restore();
    }
    quad(barPts(sx, my, 48, 13, 6), R); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const full = Math.floor(f.meter / 25), nxm = R ? W - 252 : 252;
  ctx.beginPath(); ctx.arc(nxm, my + 6, 15, 0, 7); ctx.fillStyle = full ? c.color : '#1a1220'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(full, nxm, my + 7);
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = R ? 'right' : 'left'; ctx.fillStyle = '#ccc';
  ctx.fillText(full >= 4 ? 'SUPER READY' : full >= 1 ? 'SKILL READY' : '', R ? W - 272 : 272, my + 7);

  if (f.combo >= 2 && f.comboT > 0) {
    ctx.save(); ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
    const tx = R ? W - 24 : 24, pop = 1 + Math.max(0, f.comboT - 72) * 0.04;
    ctx.font = `italic 900 ${34 * pop | 0}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = c.color;
    ctx.strokeText(f.combo + ' HITS', tx, 150); ctx.fillText(f.combo + ' HITS', tx, 150);
    const pct = Math.round(f.comboDmg / P[1 - f.side].maxHp * 100) + '%';
    ctx.font = `italic 900 18px ${FONT}`; ctx.fillStyle = '#fff'; ctx.strokeText(pct + ' DAMAGE', tx, 178); ctx.fillText(pct + ' DAMAGE', tx, 178);
    ctx.restore();
  }
  if (f.comboNameT > 0) {
    ctx.save(); ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = Math.min(1, f.comboNameT / 20);
    const tx = R ? W - 24 : 24, sc = 1 + Math.max(0, f.comboNameT - 90) * 0.06;
    ctx.font = `${Math.round(26 * sc)}px ${MENU_FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = '#ffd23f';
    ctx.strokeText(f.comboName + '!', tx, 210); ctx.fillText(f.comboName + '!', tx, 210); ctx.restore();
  }
}
function drawHUD() {
  P.forEach((f, i) => drawSideHUD(f, i === 1));
  // timer
  const tx = W / 2, ty = 40;
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(tx + Math.cos(a) * 34, ty + Math.sin(a) * 30); } ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 32px ${FONT}`; ctx.fillStyle = timer < 600 && frame % 30 < 15 ? '#ff5a5a' : '#fff';
  ctx.fillText(Math.ceil(timer / 60), tx, ty + 1);
}

// ----- super move cinematics: motion graphics behind the fighters -----
function seeded(i, j) { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); }
function drawCineBack() {
  const f = P[cine.side], c = f.c, t = cine.t, k = t / cine.max;
  const [sx, sy] = cine.kind === 'act' ? worldToScreen(f.x, f.y - f.h * f.scale * 0.55) : worldToScreen(cine.x, cine.y);
  const fade = Math.min(1, t / 8) * (k > 0.88 ? 1 - (k - 0.88) / 0.12 : 1);
  ctx.save();
  ctx.fillStyle = `rgba(4,0,10,${0.62 * fade})`; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 440); g.addColorStop(0, rgba(c.color, 0.6 * fade)); g.addColorStop(1, rgba(c.color, 0));
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.lineWidth = 2;
  for (let i = 0; i < 64; i++) {
    const a = i * 2.39996 + (i % 2 ? t * 0.012 : -t * 0.012), r0 = 80 + ((t * 24 + i * 47) % 460), len = 50 + (i % 5) * 34;
    ctx.strokeStyle = rgba(i % 3 ? '#ffffff' : c.color, 0.32 * fade);
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * (r0 + len), sy + Math.sin(a) * (r0 + len)); ctx.stroke();
  }
  if (cine.kind === 'impact') {
    for (let i = 0; i < 4; i++) { const r = ((t * 9 + i * 70) % 300); ctx.strokeStyle = rgba(i % 2 ? '#ffffff' : c.color, (1 - r / 300) * 0.8); ctx.lineWidth = 8 * (1 - r / 300) + 1; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); }
    ctx.restore(); return;
  }
  ctx.lineWidth = 3;
  if (c.id === 'julian') {
    for (let i = 0; i < 6; i++) { const r = (t * 6 + i * 60) % 360; ctx.strokeStyle = `rgba(120,190,255,${(1 - r / 360) * 0.7 * fade})`; ctx.beginPath(); ctx.ellipse(sx, sy + 60, r, r * 0.3, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(190,225,255,${0.5 * fade})`; ctx.beginPath(); ctx.arc(sx, sy, 110 + i * 26, t * 0.08 + i, t * 0.08 + i + 2.2); ctx.stroke(); }
  } else if (c.id === 'ryan') {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.09); ctx.strokeStyle = `rgba(200,120,255,${0.55 * fade})`; ctx.lineWidth = 6;
    for (let arm = 0; arm < 3; arm++) { ctx.beginPath(); for (let a = 0; a < 14; a += 0.2) ctx.lineTo(Math.cos(a + arm * 2.09) * a * 32, Math.sin(a + arm * 2.09) * a * 32); ctx.stroke(); }
    ctx.restore();
  } else if (c.id === 'darren') {
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 9; i++) if (seeded(i, t >> 2) < 0.5) { const y = seeded(i, 7 + (t >> 2)) * H; ctx.drawImage(cv, 0, y, W, 14, (seeded(i, 3) - 0.5) * 60, y, W, 14); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(245,197,24,${0.7 * fade})`; ctx.font = `900 46px ${FONT}`; ctx.textAlign = 'center';
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + t * 0.03, r = 150 + (i % 3) * 70; ctx.fillText('?', sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.6); }
  } else if (c.id === 'blake') {
    for (let i = 0; i < 16; i++) {
      const p = (t * 0.022 + i / 16) % 1, a = i * 2.4, r = 420 * (1 - p), hx = sx + Math.cos(a) * r, hy = sy + Math.sin(a) * r * 0.7;
      ctx.strokeStyle = `rgba(255,120,200,${p * 0.9 * fade})`; ctx.beginPath();
      for (let j = 0; j < 6; j++) ctx.lineTo(hx + Math.cos(j * 1.047 + t * 0.05) * 22, hy + Math.sin(j * 1.047 + t * 0.05) * 22);
      ctx.closePath(); ctx.stroke();
    }
  } else if (c.id === 'frank') {
    ctx.strokeStyle = `rgba(255,60,40,${0.85 * fade})`; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      let x = sx, y = sy, a = i * 0.9 + seeded(i, t >> 2) * 0.6; ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) { a += (seeded(i * 9 + j, t >> 2) - 0.5) * 1.2; x += Math.cos(a) * 45; y += Math.sin(a) * 45; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,40,20,${0.25 * fade})`; ctx.beginPath(); ctx.ellipse(sx, worldToScreen(0, FLOOR)[1], 260, 30, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// ...and in front: letterbox, sweeping bands, chromatic name slam, impact frames
function invertFrame() { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function drawCineFront() {
  const f = P[cine.side], c = f.c, t = cine.t, k = t / cine.max, R = cine.side === 1;
  if (cine.kind === 'act') {
    if (t > 6 && t < 42) {
      const p = easeOut((t - 6) / 36), x = lerp(-500, W + 300, p);
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = c.color; quad([[x, 0], [x + 160, 0], [x + 20, H], [x - 140, H]], R); ctx.fill();
      ctx.fillStyle = '#fff'; quad([[x + 170, 0], [x + 190, 0], [x + 50, H], [x + 30, H]], R); ctx.fill(); ctx.restore();
    }
    if (t > 16) {
      const s = t < 26 ? 3 - 2 * easeOut((t - 16) / 10) : 1, name = c.super.name.toUpperCase(), drift = (t - 26) * 0.6;
      ctx.save(); ctx.translate(R ? W - 60 + drift : 60 - drift, H - 118); ctx.transform(1, 0, -0.22, 1, 0, 0); ctx.scale(s, s);
      ctx.font = `italic 900 66px ${FONT}`; ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(0,255,255,0.7)'; ctx.fillText(name, -5, 0); ctx.fillStyle = 'rgba(255,0,200,0.7)'; ctx.fillText(name, 5, 3);
      ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(name, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(name, 0, 0);
      ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = c.color; ctx.fillText('SUPER MOVE  ·  ' + c.name.toUpperCase(), R ? -6 : 6, -52);
      ctx.restore();
    }
    if (t < 3) invertFrame();
  } else {
    if ([2, 3, 30, 31, 58, 59].includes(t)) invertFrame();
    if (t > 8) bigText(c.super.name.toUpperCase() + '!', 90 + Math.sin(t / 4) * 3, 58 + Math.max(0, 20 - t) * 3, '#fff', c.color);
  }
  const lb = 64 * easeOut(Math.min(1, t / 10)) * (k > 0.9 ? 1 - (k - 0.9) / 0.1 : 1);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb);
  ctx.fillStyle = c.color; ctx.fillRect(0, lb - 2, W, 2); ctx.fillRect(0, H - lb, W, 2);
}

function drawFightScene() {
  ctx.save(); applyRoll();
  drawWorldStage();
  if (cine && P.length) drawCineBack();
  ctx.save(); worldT(); if (P.length) drawFighters(); projs.forEach(drawProj); drawParts(); ctx.restore();
  STAGES[stageId].front();
  ctx.restore();
  vignette(0.45);
  // critical heartbeat
  P.forEach((f, i) => {
    if (f.bar !== 1 || f.ko || demo) return;
    const a = 0.12 + 0.12 * Math.pow(Math.max(0, Math.sin(frame / 9)), 6);
    const g = ctx.createLinearGradient(i ? W : 0, 0, i ? W - 260 : 260, 0);
    g.addColorStop(0, `rgba(255,0,30,${a})`); g.addColorStop(1, 'rgba(255,0,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
}

function drawBanner() {
  if (!banner) return;
  const t = 1 - banner.t / banner.max, s = t < 0.15 ? 2.2 - ease(t / 0.15) * 1.2 : 1;
  ctx.save(); ctx.globalAlpha = banner.t < 12 ? banner.t / 12 : 1;
  ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s);
  bigText(banner.txt, 0, 88, banner.c, banner.c === '#ffffff' ? '#b3001b' : '#000', 0.0001);
  ctx.restore();
}

function drawFight() {
  drawFightScene();
  if (!matchOver && !cine) drawHUD();
  if (introT > 125 && !matchOver) {
    // fighter name cards slide in during intros
    P.forEach((f, i) => {
      const k = easeOut((230 - introT) / 30), R = i === 1, x = R ? W - 30 - 260 * k : 30 - 260 + 260 * k;
      ctx.fillStyle = rgba(f.c.color, 0.85); quad([[0, 390], [300, 390], [280, 450], [0, 450]], R); ctx.globalAlpha = k; ctx.fill(); ctx.globalAlpha = 1;
      bigText(f.c.name.toUpperCase(), 408, 30, '#fff', '#000', R ? W - 150 : 150);
      ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(f.c.title.toUpperCase(), R ? W - 150 : 150, 436);
      void x;
    });
  }
  drawBanner();
  if (cine) drawCineFront();
  if (screenFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${screenFlash / 16})`; ctx.fillRect(0, 0, W, H); }
  if (matchOver) drawResults();
  if (paused) {
    ctx.fillStyle = 'rgba(5,3,8,0.75)'; ctx.fillRect(0, 0, W, H);
    bigText('PAUSED', 220, 70);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center';
    ctx.fillText('Enter / Esc: resume   ·   Q: quit to menu', W / 2, 300);
  }
}

function drawResults() {
  const k = easeOut(overT / 40);
  if (winner < 0) { bigText('DRAW', H / 2, 90); return; }
  const f = P[winner], R = winner === 1;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; quad([[0, 380], [620, 380], [580, 500], [0, 500]], R); ctx.fill();
  ctx.fillStyle = f.c.color; quad([[0, 376], [640, 376], [636, 382], [0, 382]], R); ctx.fill();
  ctx.restore();
  const tx = R ? W - 40 : 40;
  ctx.save(); ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${64}px ${FONT}`; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.fillStyle = f.c.color;
  const off = (1 - k) * 200 * (R ? 1 : -1);
  ctx.strokeText(f.c.name.toUpperCase() + ' WINS', tx + off, 420); ctx.fillText(f.c.name.toUpperCase() + ' WINS', tx + off, 420);
  ctx.font = 'italic 20px Georgia, serif'; ctx.fillStyle = '#fff'; ctx.fillText('“' + f.c.quote + '”', tx + off, 462);
  ctx.restore();
  bigText('VICTORY', 70, 54, '#ffd23f', '#000');
  const hint = net.role === 'guest' ? 'Enter: ask for a rematch   ·   Esc: leave'
    : 'Enter: rematch   ·   C: change fighters   ·   Esc: menu';
  ctx.font = '15px sans-serif'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; ctx.fillText(hint, W / 2, 525);
}

// ----- menus (BP VERSE) -----
const LOGO_FONT = '"Rubik Wet Paint", Impact, sans-serif', MENU_FONT = '"Permanent Marker", Impact, sans-serif';
const MAIN_MENU = ['PLAY', 'SETTINGS', 'CHARACTERS', 'CREDITS', 'EXIT'];
const PLAY_MENU = [['VS CPU', 'Fight the computer. ←/→ changes difficulty.'], ['2 PLAYERS', 'Same keyboard, or two controllers.'], ['ONLINE · HOST', 'Make a room and send the code to a friend.'], ['ONLINE · JOIN', "Type a friend's room code."], ['BACK', '']];
const SETTINGS_MENU = ['DIFFICULTY', 'MUSIC', 'VOICES', 'CONTROLS & COMBOS', 'BACK'];
const menuBlake = makeFighter(3, 0, 0); menuBlake.facing = -1; menuBlake.gaze = true;
function embers() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const sp = 0.5 + (i % 5) * 0.25, y = H - ((frame * sp + i * 53) % (H + 40)), x = (i * 97 + Math.sin(frame / 50 + i) * 30) % W;
    ctx.fillStyle = `rgba(255,${60 + (i % 4) * 30},50,${0.2 + 0.35 * ((i * 7) % 10) / 10})`;
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
  }
  ctx.restore();
}
function drawVerseLogo(x, y, sc) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-0.06);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `150px ${LOGO_FONT}`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('BP', 8, 8);
  ctx.shadowColor = 'rgba(255,40,40,0.6)'; ctx.shadowBlur = 18 + 8 * Math.sin(frame / 20);
  const g = ctx.createLinearGradient(0, -120, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9c2cc');
  ctx.fillStyle = g; ctx.fillText('BP', 0, 0);
  ctx.shadowBlur = 0; ctx.fillStyle = '#d10f1f';
  for (let i = 0; i < 16; i++) { ell(seeded(i, 1) * 250 - 10, -seeded(i, 2) * 140, 1.5 + seeded(i, 3) * 4, 1.5 + seeded(i, 3) * 4); ctx.fill(); }
  ctx.font = `84px ${LOGO_FONT}`; ctx.fillStyle = '#e0142a'; ctx.shadowColor = '#ff0022'; ctx.shadowBlur = 20; ctx.fillText('VERSE', 74, 76);
  ctx.restore();
}
// animated BP VERSE city with Blake on the ledge, looking down at it
function drawMenuBg() {
  drawVerseArt(Math.sin(frame / 300) * 20, 1, 1);
  roof.front();
  const lx = W * 0.5, ly = H - 70;
  const lg = ctx.createRadialGradient(W * 0.66, ly - 90, 10, W * 0.66, ly - 90, 220); lg.addColorStop(0, 'rgba(255,40,60,0.25)'); lg.addColorStop(1, 'rgba(255,40,60,0)');
  ctx.fillStyle = lg; ctx.fillRect(lx, ly - 320, W - lx, 320);
  ctx.fillStyle = '#0c090f'; ctx.beginPath(); ctx.moveTo(lx + 30, ly); ctx.lineTo(W + 10, ly - 6); ctx.lineTo(W + 10, H + 10); ctx.lineTo(lx, H + 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,60,80,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + 30, ly); ctx.lineTo(W + 10, ly - 6); ctx.stroke();
  ctx.fillStyle = '#16111a'; for (let i = 0; i < 6; i++) ctx.fillRect(lx + 60 + i * 70, ly + 14 + (i % 2) * 8, 40, 6);
  drawFighterAt(menuBlake, W * 0.67, ly, 1.05);
  const g = ctx.createLinearGradient(0, 0, W * 0.55, 0); g.addColorStop(0, 'rgba(5,2,10,0.85)'); g.addColorStop(1, 'rgba(5,2,10,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.55, H);
  vignette(0.7); embers();
}
function drawMenuList(items, idx, x, y, gap, values) {
  items.forEach((m, i) => {
    const k = easeOut((screenT - i * 4) / 16), on = i === idx, xx = x - (1 - k) * 60, yy = y + i * gap;
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    ctx.font = `${on ? 34 : 27}px ${MENU_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const label = values && values[i] ? m + '   ' + values[i] : m;
    if (on) {
      const w = ctx.measureText(label).width;
      ctx.strokeStyle = '#d10f1f'; ctx.lineCap = 'round'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(xx - 26, yy + 20); ctx.quadraticCurveTo(xx + w * 0.5, yy + 12 + Math.sin(frame / 10) * 2, xx + w + 16, yy + 16); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xx - 30, yy + 26); ctx.lineTo(xx + w * 0.6, yy + 24); ctx.stroke();
      ctx.shadowColor = '#ff2b2b'; ctx.shadowBlur = 14;
    }
    ctx.fillStyle = on ? '#ffffff' : '#c9c2cc'; ctx.fillText(label, xx + (on ? 6 : 0), yy);
    ctx.restore();
  });
}
function footer(t) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#8a8094'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, 40, H - 18); }
const audioHint = () => 'M: music ' + (musicOn ? 'on' : 'off') + ' · V: voices ' + (voiceOn ? 'on' : 'off');
function drawTitle() {
  drawMenuBg();
  drawVerseLogo(50, 250 - (1 - easeOut(screenT / 40)) * 60, 1.15);
  ctx.font = `14px ${MENU_FONT}`; ctx.fillStyle = '#c9c2cc'; ctx.textAlign = 'left'; ctx.fillText('FIGHTER 1223', 64, 330);
  if (frame % 60 < 42) { ctx.font = `30px ${MENU_FONT}`; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff2b2b'; ctx.shadowBlur = 12; ctx.fillText('PRESS ENTER', 64, 420); ctx.shadowBlur = 0; }
  footer(audioHint());
}
function drawMenu() {
  drawMenuBg(); drawVerseLogo(40, 150, 0.8);
  drawMenuList(MAIN_MENU, menuIdx, 70, 258, 48);
  footer('W/S or ↑/↓ · Enter · ' + audioHint());
}
function drawPlayMenu() {
  drawMenuBg(); drawVerseLogo(40, 150, 0.8);
  drawMenuList(PLAY_MENU.map(m => m[0]), subIdx, 70, 240, 46, ['◀ ' + DIFFS[difficulty].name + ' ▶']);
  ctx.font = 'italic 16px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(PLAY_MENU[subIdx][1], 70, 480);
  footer('Esc: back · ' + audioHint());
}
function drawSettings() {
  drawMenuBg(); drawVerseLogo(40, 150, 0.8);
  drawMenuList(SETTINGS_MENU, subIdx, 70, 240, 46, ['◀ ' + DIFFS[difficulty].name + ' ▶', musicOn ? 'ON' : 'OFF', voiceOn ? 'ON' : 'OFF', '', '']);
  const d = DIFFS[difficulty];
  ctx.font = 'italic 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.fillText(subIdx === 0 ? `CPU reacts ${['slowly', 'normally', 'fast', 'instantly'][difficulty]}, blocks ${Math.round(d.block * 100)}% of the time and hits ${Math.round(d.dmg * 100)}% as hard.` : '←/→ or Enter to change', 70, 480);
  footer('Esc: back');
}
function drawCredits() {
  drawMenuBg(); drawVerseLogo(40, 150, 0.8);
  const lines = [['BP VERSE · FIGHTER 1223', '#fff'], ['', ''], ['Created by folahanduh and the BP crew', '#c9c2cc'], ['Fighters: Julian · Tiny D Ryan · Darren · BBL Blake · Frank Black', '#c9c2cc'],
    ['Built with Claude Code', '#c9c2cc'], ['Music, sound and voices made live in your browser', '#c9c2cc'], ['', ''], ['Enter / Esc to go back', '#8a8094']];
  lines.forEach(([t, c], i) => { ctx.font = (i ? '17px sans-serif' : `26px ${MENU_FONT}`); ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(t, 70, 250 + i * 30); });
}
function drawControls() {
  drawMenuBg(); ctx.fillStyle = 'rgba(5,3,8,0.82)'; ctx.fillRect(0, 0, W, H);
  bigText('CONTROLS & COMBOS', 40, 36);
  const rows = [['', 'P1', 'P2', 'PAD'], ['Move', 'A / D', '← / →', 'D-pad'], ['Dash', 'tap twice', 'tap twice', 'tap twice'], ['Jump', 'W', '↑', 'Up'],
    ['Block', 'S (hold)', '↓ (hold)', 'Down'], ['Punch', 'F', 'K', 'X / □'], ['Kick', 'G', 'L', 'A / ✕'], ['Skill (1 bar)', 'H', 'J', 'Y / △'], ['Super (4 bars)', 'T', 'I', 'B / ○']];
  rows.forEach((r, i) => {
    ctx.font = (i ? '' : 'bold ') + '15px sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#aaa'; ctx.fillText(r[0], 40, 90 + i * 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = i ? '#fff' : '#3b8cff'; ctx.fillText(r[1], 220, 90 + i * 30);
    ctx.fillStyle = i ? '#fff' : '#ff2b2b'; ctx.fillText(r[2], 320, 90 + i * 30);
    ctx.fillStyle = i ? '#fff' : '#ffd23f'; ctx.fillText(r[3], 420, 90 + i * 30);
  });
  ctx.textAlign = 'left'; ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffd23f'; ctx.fillText('MOVES (P1 keys)', 40, 375);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#ddd';
  ['↓+F uppercut · →+F body hook · ↓+G sweep · →+G roundhouse', 'Tiny D Ryan: →+F sword thrust', 'Two health bars: lose the gold one and you fight on in CRITICAL'].forEach((t, i) => ctx.fillText(t, 40, 400 + i * 22));
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffd23f'; ctx.fillText('COMBOS (land each hit, then press the next)', 520, 90);
  const keyOf = m => { const [b, d] = COMBO_INPUT[m]; return (d === 'down' ? '↓' : d === 'fwd' ? '→' : '') + (b === 'punch' ? 'F' : 'G'); };
  COMBOS.forEach(([name, seq], i) => {
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(name, 520, 118 + i * 28);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#ff8a8a'; ctx.fillText(seq.map(keyOf).join('  '), 760, 118 + i * 28);
  });
  footer('Enter / Esc: back');
}

// character select: full-body fighters on spotlights
const selDummy = [null, null];
function dummyFor(slot) {
  let d = selDummy[slot];
  if (!d || d.ci !== sel[slot] || d.skin !== selSkin[slot]) { d = selDummy[slot] = makeFighter(sel[slot], slot, selSkin[slot]); d.flash = 6; }
  d.facing = slot ? -1 : 1; d.victory = selDone[slot];
  return d;
}
function drawFighterAt(f, sx, sy, sc) {
  ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc); ctx.translate(-f.x, -FLOOR);
  if (f.flash > 0) f.flash--;
  drawFighter(f, f.x, FLOOR, 0); ctx.restore();
}
function drawSelectBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0612'); g.addColorStop(1, '#22102c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.35; ctx.drawImage(club.back, (club.back.width - W) / 2, 80, W, H - 40, 0, 0, W, H - 40); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, c] of [[160, CHARS[sel[0]].color], [800, CHARS[sel[1]].color]]) {
    const sg = ctx.createLinearGradient(0, 0, 0, 380); sg.addColorStop(0, rgba(c, 0.3)); sg.addColorStop(1, rgba(c, 0.05));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x + 120, 375); ctx.lineTo(x - 120, 375); ctx.fill();
    ctx.fillStyle = rgba(c, 0.3); ctx.beginPath(); ctx.ellipse(x, 372, 120, 16, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawSelect() {
  drawSelectBg();
  bigText(mode === 'gallery' ? 'CHARACTERS' : 'CHOOSE YOUR FIGHTER', 32, 34);
  const label = s => mode === 'cpu' && s === 1 ? 'CPU · ' + DIFFS[difficulty].name : mode === 'gallery' ? 'VIEWING' : mode === 'online' ? (s === mySlot() ? 'YOU' : 'THEM') : 'P' + (s + 1);
  (mode === 'gallery' ? [0] : [0, 1]).forEach(s => {
    const active = mode === 'online' || mode === 'gallery' || s <= selCursor || selDone[s], c = CHARS[sel[s]];
    ctx.globalAlpha = active ? 1 : 0.35;
    const d = dummyFor(s);
    drawFighterAt(d, s ? 820 : 140, 372, 1.18 * Math.pow(136 / d.h, 0.35));
    const skins = SKINS[c.id];
    ctx.font = `15px ${MENU_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
    const sk = '◀ ' + skins[selSkin[s]].name.toUpperCase() + ' ▶'; ctx.fillStyle = '#ffd23f';
    ctx.strokeText(sk, s ? 820 : 140, 388); ctx.fillText(sk, s ? 820 : 140, 388);
    // info panel
    const px = s ? 492 : 268, py = 70, pw = 200;
    quad([[px + 10, py], [px + pw + 10, py], [px + pw, py + 296], [px, py + 296]]); ctx.fillStyle = 'rgba(12,8,18,0.85)'; ctx.fill();
    ctx.strokeStyle = s ? '#ff2b2b' : '#3b8cff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = s ? '#ff2b2b' : '#3b8cff'; ctx.fillText(label(s) + (selDone[s] ? '  ✓ LOCKED' : ''), px + 16, py + 10);
    ctx.font = `italic 900 23px ${FONT}`; ctx.fillStyle = c.color; ctx.fillText(c.name.toUpperCase(), px + 14, py + 26);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#bbb'; ctx.fillText(c.title, px + 14, py + 54);
    const ft = `${Math.floor(c.inches / 12)}'${c.inches % 12}"`, reach = 0.33 * ((c.inches - 40) * 3.2 + 30) * c.build.arm;
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${ft} · ${c.kg}KG · REACH ${reach > 50 ? 'LONG' : reach > 38 ? 'MID' : 'SHORT'}`, px + 14, py + 72);
    [['STR', c.str], ['SPD', c.spd], ['DUR', c.dur], ['IQ', c.iq], ['HAX', c.hax]].forEach(([k, v], j) => {
      const yy = py + 94 + j * 16;
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#999'; ctx.fillText(k, px + 14, yy);
      ctx.fillStyle = '#2c2236'; ctx.fillRect(px + 46, yy + 2, 110, 8);
      ctx.fillStyle = c.color; ctx.fillRect(px + 46, yy + 2, 110 * Math.min(1, v / 120), 8);
      ctx.fillStyle = '#ddd'; ctx.fillText(v, px + 162, yy);
    });
    const ab = (lbl, a, yy) => {
      ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd23f'; ctx.fillText(lbl + ': ' + a.name, px + 14, yy);
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#ccc'; wrap(a.desc, px + 14, yy + 16, pw - 28, 14);
    };
    ab('SKILL', c.skill, py + 182); ab('SUPER', c.super, py + 234);
    ctx.globalAlpha = 1;
  });
  if (mode === 'gallery') {
    const px = 492, py = 70, pw = 420, c = CHARS[sel[0]];
    quad([[px + 10, py], [px + pw + 10, py], [px + pw, py + 296], [px, py + 296]]); ctx.fillStyle = 'rgba(12,8,18,0.85)'; ctx.fill();
    ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `20px ${MENU_FONT}`; ctx.fillStyle = '#ffd23f'; ctx.fillText('MOVE LIST', px + 20, py + 12);
    const mv = [['Jab · cross · hook · uppercut', 'F F F F'], ['Uppercut', '↓ + F'], [c.sword ? 'Sword thrust' : 'Body hook', '→ + F'], ['Kick', 'G'], ['Sweep', '↓ + G'], ['Roundhouse', '→ + G'],
      ['Air kick', 'jump, then F or G'], ['Skill: ' + c.skill.name, 'H (1 bar)'], ['Super: ' + c.super.name, 'T (4 bars)']];
    mv.forEach(([a, k], i) => { ctx.font = '13px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(a, px + 20, py + 46 + i * 26); ctx.fillStyle = '#ff8a8a'; ctx.textAlign = 'right'; ctx.fillText(k, px + pw - 20, py + 46 + i * 26); ctx.textAlign = 'left'; });
  }
  // portrait row
  const n = CHARS.length, tw = 104, x0 = W / 2 - (n * tw + (n - 1) * 10) / 2;
  CHARS.forEach((c, i) => {
    const x = x0 + i * (tw + 10), y = 400, on = [0, 1].filter(s => sel[s] === i && (mode === 'online' || s <= selCursor || selDone[s]));
    const pts = [[x + 12, y], [x + tw + 12, y], [x + tw, y + 96], [x, y + 96]];
    quad(pts); ctx.fillStyle = '#140c1a'; ctx.fill();
    ctx.save(); quad(pts); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + 96); g.addColorStop(0, rgba(c.color, on.length ? 0.6 : 0.2)); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(x, y, tw + 12, 96);
    drawFace(c, on.length ? selSkin[on[0]] : 0, x + tw / 2 + 6, y + 52 + (on.length ? Math.sin(frame / 8) * 2 : 0), 38, false);
    ctx.restore();
    quad(pts); ctx.strokeStyle = on.length ? '#fff' : c.color; ctx.lineWidth = on.length ? 3 : 1.5; ctx.stroke();
    on.forEach((s, k) => {
      const tx = x + 6 + k * 54; ctx.fillStyle = s === 0 ? '#3b8cff' : '#ff2b2b'; ctx.fillRect(tx + 8, y - 16, 46, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label(s), tx + 31, y - 8);
    });
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '13px sans-serif'; ctx.fillStyle = '#8a8094';
  const hint = mode === 'gallery' ? 'A/D: fighter · W/S: skin · Esc: back' : mode === 'online' ? (selDone[mySlot()] ? 'Waiting for your opponent to pick...' : '←/→: fighter · ↑/↓: skin · Enter to lock in')
    : (selCursor === 0 ? 'P1: A/D fighter · W/S skin · Enter to lock in' : (mode === 'cpu' ? 'Now pick the CPU fighter (A/D, W/S skin)' : 'P2: ←/→ fighter · ↑/↓ skin · Enter to lock in'));
  ctx.fillText(hint, W / 2, 527);
}
function wrap(t, x, y, mw, lh) {
  let line = '';
  for (const w of t.split(' ')) { const tst = line + w + ' '; if (ctx.measureText(tst).width > mw && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = tst; }
  ctx.fillText(line, x, y);
}

// stage select with live previews
const previews = STAGES.map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
function renderPreviews() {
  const saved = ctx, sc = { ...cam }, sid = stageId;
  cam.x = WW / 2; cam.z = 1; cam.kick = 0;
  STAGES.forEach((s, i) => { ctx = previews[i].getContext('2d'); stageId = i; drawWorldStage(); s.front(); });
  ctx = saved; stageId = sid; Object.assign(cam, sc);
}
function drawStageSelect() {
  if (screenT % 6 === 1) renderPreviews();
  drawSelectBg(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  bigText('CHOOSE THE STAGE', 50, 40);
  STAGES.forEach((s, i) => {
    const on = i === stageCursor, w = on ? 300 : 260, h = w * 9 / 16, x = W / 2 + (i - 1) * 300 - w / 2, y = 250 - h / 2;
    ctx.save(); ctx.globalAlpha = on ? 1 : 0.6;
    ctx.drawImage(previews[i], x, y, w, h);
    ctx.strokeStyle = on ? '#ffd23f' : '#444'; ctx.lineWidth = on ? 4 : 2; ctx.strokeRect(x, y, w, h);
    ctx.restore();
    bigText(s.name, y + h + 26, on ? 24 : 18, on ? '#fff' : '#999', '#000', x + w / 2);
  });
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#8a8094'; ctx.textAlign = 'center';
  ctx.fillText(net.role === 'guest' ? 'Your opponent is choosing the stage...' : '←/→ to choose · Enter to fight', W / 2, 500);
}

function drawVs() {
  const t = 1 - vsT / 130, [a, b] = P;
  ctx.fillStyle = a.c.color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 60, 0); ctx.lineTo(W / 2 - 60, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = b.c.color; ctx.beginPath(); ctx.moveTo(W / 2 + 60, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W / 2 - 60, H); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 14; i++) ctx.fillRect((frame * 18 + i * 120) % (W + 200) - 100, i * 40, 160, 3);
  const s = easeOut(t * 3);
  drawPortrait(a.c, lerp(-150, 230, s), 230, 135, false, a.skin);
  drawPortrait(b.c, lerp(W + 150, W - 230, s), 230, 135, true, b.skin);
  ctx.save(); ctx.globalAlpha = s;
  bigText(a.c.name.toUpperCase(), 410, 36, '#fff', '#000', 230); bigText(b.c.name.toUpperCase(), 410, 36, '#fff', '#000', W - 230);
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center';
  ctx.fillText(a.c.title.toUpperCase(), 230, 440); ctx.fillText(b.c.title.toUpperCase(), W - 230, 440);
  ctx.fillText('STAGE: ' + STAGES[stageId].name, W / 2, 505);
  ctx.restore();
  bigText('VS', H / 2 - 20, 60 + 80 * (1 - easeOut((t - 0.2) * 4)), '#ffd23f', '#b3001b');
}

function drawLobby() {
  drawSelectBg(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  bigText(screen === 'join' ? 'JOIN A ROOM' : 'ONLINE', 90, 50);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (screen === 'join') {
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#ccc'; ctx.fillText('Type the 4-character room code your friend sent you', W / 2, 170);
    for (let i = 0; i < 4; i++) {
      const x = W / 2 - 150 + i * 80; ctx.fillStyle = '#1b1422'; ctx.fillRect(x, 210, 60, 80);
      ctx.strokeStyle = i === joinCode.length ? '#ff3fa4' : '#3a2c44'; ctx.lineWidth = 3; ctx.strokeRect(x, 210, 60, 80);
      ctx.fillStyle = '#fff'; ctx.font = `900 48px ${FONT}`; ctx.fillText(joinCode[i] || '', x + 30, 252);
    }
    ctx.font = '15px sans-serif'; ctx.fillStyle = '#8a8094'; ctx.fillText('Enter to join · Backspace to delete · Esc to go back', W / 2, 340);
  } else {
    if (net.role === 'host') {
      ctx.font = '18px sans-serif'; ctx.fillStyle = '#ccc'; ctx.fillText('Send this room code to your friend:', W / 2, 170);
      bigText(net.code, 240, 90, '#ffd23f', '#b3001b');
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#8a8094';
      ctx.fillText('They open the game, choose ONLINE · JOIN and type the code.', W / 2, 300);
    }
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(net.status + '.'.repeat(frame / 20 % 4 | 0), W / 2, 360);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#8a8094'; ctx.fillText('Esc to cancel', W / 2, 420);
  }
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
  if (screen === 'title') drawTitle();
  else if (screen === 'mode') drawMenu();
  else if (screen === 'play') drawPlayMenu();
  else if (screen === 'settings') drawSettings();
  else if (screen === 'credits') drawCredits();
  else if (screen === 'controls') drawControls();
  else if (screen === 'select') drawSelect();
  else if (screen === 'stage') drawStageSelect();
  else if (screen === 'lobby' || screen === 'join') drawLobby();
  else if (screen === 'vs' && P.length) drawVs();
  else if (screen === 'fight' && P.length) drawFight();
  ctx.restore();
  if (wipe > 0) {
    const k = wipe / 14; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * k * 1.3, 0); ctx.lineTo(W * k * 1.3 - 200, H); ctx.lineTo(0, H); ctx.fill();
  }
  if (toast) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(W / 2 - 270, H - 76, 540, 40);
    ctx.fillStyle = '#ffd23f'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(toast.msg, W / 2, H - 56);
  }
}

// ----- key presses -----
const isLeft = c => c === 'KeyA' || c === 'ArrowLeft', isRight = c => c === 'KeyD' || c === 'ArrowRight';
const isUp = c => c === 'KeyW' || c === 'ArrowUp', isDown = c => c === 'KeyS' || c === 'ArrowDown';
const isOk = c => c === 'Enter' || c === 'Space' || c === 'NumpadEnter';
function toMenu() { if (net.role) { send({ t: 'bye' }); netReset(); } demo = false; paused = false; setScreen('mode'); }

function onPress(code, key) {
  const live = screen === 'fight' && !matchOver && !paused;
  if (screen !== 'join' && !live) {
    if (code === 'KeyM') { musicOn = !musicOn; saveSettings(); return; }
    if (code === 'KeyV') { voiceOn = !voiceOn; if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel(); saveSettings(); return; }
  }
  if (screen === 'fight' && !matchOver && !net.role) {
    if (code === 'Escape' || (paused && isOk(code))) { paused = !paused; return; }
    if (paused && code === 'KeyQ') { toMenu(); return; }
    return;
  }
  if (code === 'Escape') {
    if (screen === 'title') return;
    if (screen === 'controls') { setScreen('settings'); return; }
    if (['play', 'settings', 'credits'].includes(screen) || (screen === 'select' && mode === 'gallery')) { if (mode === 'gallery') mode = 'cpu'; setScreen('mode'); return; }
    toMenu(); return;
  }
  const nav = (len, cur) => isUp(code) ? (cur + len - 1) % len : isDown(code) ? (cur + 1) % len : cur;
  if (screen === 'title') { if (isOk(code)) { setScreen('mode'); sfx('confirm'); } }
  else if (screen === 'mode') {
    const n = nav(MAIN_MENU.length, menuIdx); if (n !== menuIdx) { menuIdx = n; sfx('select'); }
    if (isOk(code)) {
      sfx('confirm'); subIdx = 0;
      if (menuIdx === 0) setScreen('play'); else if (menuIdx === 1) setScreen('settings');
      else if (menuIdx === 2) { mode = 'gallery'; goSelect(); } else if (menuIdx === 3) setScreen('credits'); else setScreen('title');
    }
  }
  else if (screen === 'play') {
    const n = nav(PLAY_MENU.length, subIdx); if (n !== subIdx) { subIdx = n; sfx('select'); }
    if (subIdx === 0 && (isLeft(code) || isRight(code))) { difficulty = (difficulty + (isRight(code) ? 1 : 3)) % 4; saveSettings(); sfx('select'); }
    if (isOk(code)) {
      sfx('confirm');
      if (subIdx === 0) { mode = 'cpu'; goSelect(); } else if (subIdx === 1) { mode = 'local'; goSelect(); }
      else if (subIdx === 2) hostRoom(); else if (subIdx === 3) { setScreen('join'); joinCode = ''; } else setScreen('mode');
    }
  }
  else if (screen === 'settings') {
    const n = nav(SETTINGS_MENU.length, subIdx); if (n !== subIdx) { subIdx = n; sfx('select'); }
    const lr = isLeft(code) ? -1 : isRight(code) ? 1 : 0, ok = isOk(code);
    if (subIdx === 0 && (lr || ok)) difficulty = (difficulty + (lr || 1) + 4) % 4;
    if (subIdx === 1 && (lr || ok)) musicOn = !musicOn;
    if (subIdx === 2 && (lr || ok)) { voiceOn = !voiceOn; if (voiceOn) speak('announcer', 'Voices on'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    if (subIdx === 3 && ok) setScreen('controls');
    if (subIdx === 4 && ok) setScreen('mode');
    if (lr || ok) { saveSettings(); sfx('select'); }
  }
  else if (screen === 'credits' || screen === 'controls') { if (isOk(code)) setScreen(screen === 'controls' ? 'settings' : 'mode'); }
  else if (screen === 'join') {
    if (code === 'Backspace') joinCode = joinCode.slice(0, -1);
    else if (isOk(code) && joinCode.length === 4) joinRoom(joinCode);
    else if (key && key.length === 1 && /[a-z0-9]/i.test(key) && joinCode.length < 4) joinCode += key.toUpperCase();
  }
  else if (screen === 'select') {
    const slot = mode === 'online' ? mySlot() : mode === 'gallery' ? 0 : selCursor;
    if (selDone[slot]) return;
    const local = mode === 'local';
    const keysOk = !local || (slot === 0 ? !code.startsWith('Arrow') : !['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code));
    const skinKey = keysOk && (isUp(code) || isDown(code));
    const tell = done => { if (mode === 'online') send({ t: 'cur', ci: sel[slot], skin: selSkin[slot], done }); };
    if (skinKey) { selSkin[slot] = (selSkin[slot] + 1) % SKINS[CHARS[sel[slot]].id].length; sfx('select'); tell(false); }
    if (keysOk && isLeft(code)) { sel[slot] = (sel[slot] + 4) % 5; selSkin[slot] = 0; sfx('select'); tell(false); }
    if (keysOk && isRight(code)) { sel[slot] = (sel[slot] + 1) % 5; selSkin[slot] = 0; sfx('select'); tell(false); }
    if (mode === 'gallery') return;
    if (isOk(code) || (slot === 0 && code === 'KeyF') || (slot === 1 && code === 'KeyK')) {
      selDone[slot] = true; sfx('confirm');
      if (mode === 'online') {
        tell(true);
        if (net.role === 'host' && selDone[0] && selDone[1]) { setScreen('stage'); send({ t: 'stage' }); }
        return;
      }
      if (slot === 0) selCursor = 1; else { stageCursor = stageId; setScreen('stage'); }
    }
  }
  else if (screen === 'stage') {
    if (net.role === 'guest') return;
    if (isLeft(code)) { stageCursor = (stageCursor + STAGES.length - 1) % STAGES.length; sfx('select'); }
    if (isRight(code)) { stageCursor = (stageCursor + 1) % STAGES.length; sfx('select'); }
    if (net.role === 'host' && (isLeft(code) || isRight(code))) send({ t: 'stagecur', i: stageCursor });
    if (isOk(code)) { stageId = stageCursor; startMatch(); }
  }
  else if (screen === 'fight' && matchOver) {
    if (net.role === 'guest') { if (isOk(code)) { send({ t: 'rematch' }); toast = { msg: 'Rematch requested...', t: 120 }; } }
    else if (isOk(code)) startMatch();
    else if (code === 'KeyC') { goSelect(); if (net.role === 'host') send({ t: 'select' }); }
  }
}

loadSettings();
// ---------- main loop ----------
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
