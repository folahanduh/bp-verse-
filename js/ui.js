// clean UI type: Oswald for headings and the HUD, Inter for text, Cinzel for the title wordmark
const HEAD = '"Oswald", "Arial Narrow", Arial, sans-serif', BODY = '"Inter", "Segoe UI", system-ui, sans-serif', TITLE = '"Cinzel", "Trajan Pro", Georgia, serif';
function tracked(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
// ---------- HUD, screens, menus, main loop ----------
function bigText(t, y, size, col, stroke, x) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${size}px ${DISP}`; tracked(Math.round(size * 0.04));
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = size / 4; ctx.shadowOffsetY = size / 24;
  ctx.lineWidth = Math.max(2, size / 14); ctx.strokeStyle = stroke || 'rgba(2,4,10,0.95)'; ctx.lineJoin = 'round'; ctx.strokeText(t, x || W / 2, y);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = !col || col === '#fff' || col === '#ffffff' ? chromeGrad(y - size * 0.45, y + size * 0.45) : chromeGrad(y - size * 0.45, y + size * 0.45, col); ctx.fillText(t, x || W / 2, y);
  if (col && col !== '#fff' && col !== '#ffffff') { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.55; ctx.fillStyle = col; ctx.fillText(t, x || W / 2, y); }
  ctx.restore(); tracked(0);
}
function quad(pts, R) { ctx.beginPath(); pts.forEach(([x, y], i) => { const X = R ? W - x : x; if (i) ctx.lineTo(X, y); else ctx.moveTo(X, y); }); ctx.closePath(); }
const barPts = (x, y, w, h, sk) => [[x + sk, y], [x + w + sk, y], [x + w, y + h], [x, y + h]];
function vignette(a, col) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ----- Injustice 2 style HUD -----
// Top corners: a chrome hex portrait, a thick framed health bar (gold over red: two lives) tapering toward the
// timer, two life pips and the name in chrome. Bottom corners: the segmented super meter with a hex badge, and the
// hex skill icon that sweeps round as it recharges.
const HB = { x0: 94, x1: W / 2 - 50, t: 24, b: 46, cut: 12 };
function hbPath(q0, q1, R, grow) {
  const g = grow || 0, X = q => lerp(HB.x0, HB.x1, q), cut = q1 >= 0.999 ? HB.cut : 0;
  quad([[X(q0) - g, HB.t - g], [X(q1) + g, HB.t - g], [X(q1) - cut + g, HB.b + g], [X(q0) - g, HB.b + g]], R);
}
function drawSideHUD(f, R) {
  const c = f.c, half = f.maxHp / 2, X = x => R ? W - x : x;
  const seg = clamp(f.bar === 0 ? (f.hp - half) / half : f.hp / half, 0, 1);
  const dseg = clamp(f.bar === 0 ? (f.dispHp - half) / half : Math.min(f.dispHp, half) / half, 0, 1);
  const refill = f.bar === 1 && f.barAnim > 0 ? 1 - f.barAnim / 70 : 1, low = f.bar === 1 && seg < 0.35;
  ctx.save();
  // the frame: a dark backing, a chrome rim and a lit inner edge
  hbPath(0, 1, R, 5); ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fill();
  hbPath(0, 1, R, 3); ctx.fillStyle = chromeGrad(HB.t - 3, HB.b + 3); ctx.fill();
  hbPath(0, 1, R, 1.5); ctx.fillStyle = '#05070c'; ctx.fill();
  hbPath(0, 1, R); const bg = ctx.createLinearGradient(0, HB.t, 0, HB.b); bg.addColorStop(0, '#1a1018'); bg.addColorStop(1, '#0a060c'); ctx.fillStyle = bg; ctx.fill();
  const gold = () => { const g = ctx.createLinearGradient(0, HB.t, 0, HB.b); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.38, '#ffd84a'); g.addColorStop(0.55, '#e6a600'); g.addColorStop(1, '#8a5a00'); return g; };
  const red = a => { const g = ctx.createLinearGradient(0, HB.t, 0, HB.b); g.addColorStop(0, `rgba(255,170,160,${a})`); g.addColorStop(0.38, `rgba(255,58,58,${a})`); g.addColorStop(0.6, `rgba(170,0,18,${a})`); g.addColorStop(1, `rgba(80,0,10,${a})`); return g; };
  if (f.bar === 0) { hbPath(0, 1, R); ctx.fillStyle = red(0.95); ctx.fill(); } // the second life waiting underneath
  if (dseg * refill > seg * refill + 0.002) { hbPath(seg * refill, dseg * refill, R); const cg = ctx.createLinearGradient(0, HB.t, 0, HB.b); cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#ff8a2a'); ctx.fillStyle = cg; ctx.fill(); }
  if (seg * refill > 0.002) {
    hbPath(0, seg * refill, R); ctx.fillStyle = f.bar === 0 ? gold() : red(low ? 0.8 + 0.2 * Math.sin(frame / 4) : 1); ctx.fill();
    ctx.save(); hbPath(0, seg * refill, R); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fillRect(0, HB.t, W, (HB.b - HB.t) * 0.34); // gloss
    const sx = ((frame * 5 + (R ? 300 : 0)) % 1400) - 200; const sg = ctx.createLinearGradient(X(sx), 0, X(sx + 60), 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.5)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(Math.min(X(sx), X(sx + 60)), HB.t, 60, HB.b - HB.t); // a gleam running along it
    ctx.restore();
  }
  if (low) { hbPath(0, 1, R, 2); ctx.strokeStyle = `rgba(255,40,40,${0.4 + 0.4 * Math.sin(frame / 5)})`; ctx.lineWidth = 2; ctx.stroke(); }
  // the portrait, in a chrome hex
  hexPortrait(c, f.skin, X(50), 46, 34, { flip: R, ring: f.bar ? (frame % 30 < 15 ? '#ff3b3b' : c.color) : c.color });
  // two lives: pips under the bar; then the name in chrome
  for (let i = 0; i < 2; i++) { const px = X(HB.x0 + 8 + i * 16), py = HB.b + 12, on = i === 0 ? f.bar === 0 : !f.ko;
    ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 6, py); ctx.closePath();
    ctx.fillStyle = on ? (i === 0 ? '#ffd84a' : '#ff3a3a') : 'rgba(10,12,20,0.9)'; ctx.fill(); ctx.strokeStyle = chromeGrad(py - 6, py + 6); ctx.lineWidth = 1.5; ctx.stroke(); }
  chromeText(c.name.toUpperCase(), X(HB.x0 + 44), HB.b + 13, 16, { align: R ? 'right' : 'left', weight: 800, track: 2, glow: rgba(c.color, 0.5) });
  if (f.bar === 1 && frame % 40 < 28) capsText('CRITICAL', X(HB.x1 - 6), HB.b + 13, 10, '#ff4b4b', { align: R ? 'left' : 'right', weight: 800, track: 4 });
  // bottom: the super meter (four bars) with its badge, and the skill hex
  const online = mode === 'online', human = !f.ai && !demo && (!online || f.side === mySlot()), map = online || f.side === 0 ? MAP1 : MAP2;
  const by = H - 34, full = f.meter >= SUPER_COST, bars = Math.floor(f.meter / 25), mx = 64, mw = 230;
  ctx.save(); if (R) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  uiMeter(mx, by - 7, mw, 14, f.meter / 100, '#1f6fe0', { segs: 4, full, sk: 5 });
  ctx.restore();
  hexPath(X(40), by, 22); ctx.fillStyle = full ? rgba('#3ea6ff', 0.35 + 0.2 * Math.sin(frame / 6)) : 'rgba(5,8,14,0.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = chromeGrad(by - 22, by + 22); ctx.stroke();
  if (full) { hexPath(X(40), by, 26 + Math.sin(frame / 6) * 2); ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 2; ctx.stroke(); }
  chromeText(String(bars), X(40), by + 1, 22, { align: 'center', weight: 900, track: 0, glow: full ? '#3ea6ff' : null });
  capsText(full && human ? 'SUPER  ·  ' + keyName(map.super) : 'SUPER', X(mx + 6), by - 18, 9, full ? UI.blueHi : 'rgba(214,224,240,0.7)', { align: R ? 'right' : 'left', weight: 700, track: 3 });
  const cd = f.skillCd || 0, ready = cd <= 0, kx = X(mx + mw + 30), ky = by - 2;
  hexPath(kx, ky, 17); ctx.fillStyle = ready ? rgba(c.color, 0.9) : 'rgba(5,8,14,0.92)'; ctx.fill();
  if (!ready) { const k = 1 - cd / (f.skillMax || 1); ctx.save(); hexPath(kx, ky, 17); ctx.clip(); ctx.beginPath(); ctx.moveTo(kx, ky); ctx.arc(kx, ky, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2 * (R ? -1 : 1), R); ctx.closePath(); ctx.fillStyle = rgba(c.color, 0.4); ctx.fill(); ctx.restore(); }
  hexPath(kx, ky, 17); ctx.lineWidth = 2.5; ctx.strokeStyle = chromeGrad(ky - 17, ky + 17); ctx.stroke();
  if (ready && frame % 50 < 25) { hexPath(kx, ky, 21); ctx.strokeStyle = rgba(c.color, 0.6); ctx.lineWidth = 2; ctx.stroke(); }
  capsText(ready ? (human ? keyName(map.skill) : '✓') : String(Math.ceil(cd / 60)), kx, ky + 1, ready ? 11 : 13, ready ? '#05070c' : '#fff', { align: 'center', weight: 800, track: 0 });
  capsText('SKILL', kx, ky - 26, 9, 'rgba(214,224,240,0.7)', { align: 'center', weight: 700, track: 3 });
  ctx.restore();
  // combo counter: a slanted plate under the bar with the hit count in chrome
  if (f.combo >= 2 && f.comboT > 0) {
    const pop = 1 + Math.max(0, f.comboT - 72) * 0.04, a = Math.min(1, f.comboT / 12), y = 124;
    ctx.save(); ctx.globalAlpha = a;
    ctx.save(); if (R) { ctx.translate(W, 0); ctx.scale(-1, 1); } slant(18, y - 26, 190, 58, 12); const pg = ctx.createLinearGradient(18, 0, 208, 0); pg.addColorStop(0, 'rgba(4,6,12,0.82)'); pg.addColorStop(1, 'rgba(4,6,12,0)'); ctx.fillStyle = pg; ctx.fill();
    ctx.fillStyle = c.color; ctx.fillRect(30, y - 26, 150, 2); ctx.restore();
    const tx = R ? W - 34 : 34;
    chromeText(String(f.combo), tx, y - 2, 40 * pop, { align: R ? 'right' : 'left', weight: 900, track: 0, glow: rgba(c.color, 0.6) });
    ctx.font = `italic 900 ${40 * pop | 0}px ${DISP}`; const nw = ctx.measureText(String(f.combo)).width;
    capsText('HITS', R ? tx - nw - 10 : tx + nw + 10, y - 8, 15, '#fff', { align: R ? 'right' : 'left', weight: 800, track: 3 });
    capsText(Math.round(f.comboDmg / P[1 - f.side].maxHp * 100) + '% DAMAGE', R ? tx - nw - 10 : tx + nw + 10, y + 10, 11, c.color, { align: R ? 'right' : 'left', weight: 700, track: 2 });
    ctx.restore();
  }
  if (f.comboNameT > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, f.comboNameT / 20);
    const sc = 1 + Math.max(0, f.comboNameT - 90) * 0.06;
    chromeText(f.comboName + '!', R ? W - 30 : 30, 172, Math.round(22 * sc), { align: R ? 'right' : 'left', weight: 900, tint: '#ffe08a', glow: 'rgba(255,200,60,0.6)' });
    ctx.restore();
  }
}
function drawHUD() {
  ctx.save(); ctx.globalAlpha = introLong() ? clamp((152 - introT) / 22, 0, 1) : 1; // fades in as the intro ends
  const tg = ctx.createLinearGradient(0, 0, 0, 90); tg.addColorStop(0, 'rgba(0,0,0,0.45)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 90);
  P.forEach((f, i) => drawSideHUD(f, i === 1));
  // the timer: a chrome hex emblem between the bars
  const tx = W / 2, ty = 38, low = timer < 10 * CLOCK_F && mode !== 'training';
  hexPath(tx, ty, 34, Math.PI / 6); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
  hexPath(tx, ty, 31, Math.PI / 6); ctx.fillStyle = chromeGrad(ty - 31, ty + 31); ctx.fill();
  hexPath(tx, ty, 27, Math.PI / 6); const g = ctx.createLinearGradient(0, ty - 27, 0, ty + 27); g.addColorStop(0, low ? '#3a0a10' : '#132440'); g.addColorStop(1, '#04070e'); ctx.fillStyle = g; ctx.fill();
  hexPath(tx, ty, 24, Math.PI / 6); ctx.strokeStyle = low && frame % 30 < 15 ? 'rgba(255,60,60,0.9)' : 'rgba(110,180,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  chromeText(mode === 'training' ? '∞' : String(Math.ceil(timer / CLOCK_F)), tx, ty + 1, 26, { align: 'center', weight: 900, track: 0, glow: low ? 'rgba(255,40,40,0.8)' : 'rgba(62,166,255,0.6)' });
  ctx.restore();
  drawNowPlaying();
}

// ----- super move cinematics: motion graphics behind the fighters -----
function seeded(i, j) { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); }
function drawCineBack(light) {
  const f = P[cine.side], c = f.c, t = cine.t, k = t / cine.max;
  if (cine.kind === 'fin') { ctx.fillStyle = `rgba(4,0,10,${0.25 * Math.min(1, t / 20)})`; ctx.fillRect(0, 0, W, H); return; }
  const [sx, sy] = cine.kind === 'act' ? worldToScreen(f.x, f.y - f.h * f.scale * 0.55) : worldToScreen(cine.x, cine.y);
  const fade = Math.min(1, t / 8) * (k > 0.88 ? 1 - (k - 0.88) / 0.12 : 1);
  ctx.save();
  ctx.fillStyle = `rgba(4,0,10,${(light ? 0.18 : 0.62) * fade})`; ctx.fillRect(-200, -200, W + 400, H + 400);
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
    const src = light ? R3D.canvas : cv, ks = src.height / H;
    for (let i = 0; i < 9; i++) if (seeded(i, t >> 2) < 0.5) { const y = seeded(i, 7 + (t >> 2)) * H; ctx.drawImage(src, 0, y * ks, src.width, 14 * ks, (seeded(i, 3) - 0.5) * 60, y, W, 14); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(245,197,24,${0.7 * fade})`; ctx.font = `900 46px ${HEAD}`; ctx.textAlign = 'center';
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
function invertFrame() { if (use3D()) { R3D.invert(true); return; } ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function drawCineFront() {
  const f = P[cine.side], c = f.c, t = cine.t, k = t / cine.max, R = cine.side === 1;
  if (cine.kind === 'fin') {
    if (t > 8) { const a = Math.min(1, (t - 8) / 14); ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = `600 12px ${HEAD}`; tracked(6); ctx.fillStyle = '#ff2b2b'; ctx.fillText('FINISHER', 40, 92);
      ctx.font = `700 26px ${HEAD}`; tracked(4); ctx.fillStyle = '#fff'; ctx.fillText(c.fin.name, 40, 118); ctx.restore(); }
  } else if (cine.kind === 'act') {
    if (t > 6 && t < 42) {
      const p = easeOut((t - 6) / 36), x = lerp(-500, W + 300, p);
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = c.color; quad([[x, 0], [x + 160, 0], [x + 20, H], [x - 140, H]], R); ctx.fill();
      ctx.fillStyle = '#fff'; quad([[x + 170, 0], [x + 190, 0], [x + 50, H], [x + 30, H]], R); ctx.fill(); ctx.restore();
    }
    if (t > 16) {
      const s = t < 26 ? 3 - 2 * easeOut((t - 16) / 10) : 1, name = c.super.name.toUpperCase(), drift = (t - 26) * 0.6;
      ctx.save(); ctx.translate(R ? W - 60 + drift : 60 - drift, H - 118); ctx.transform(1, 0, -0.22, 1, 0, 0); ctx.scale(s, s);
      ctx.font = `italic 900 66px ${HEAD}`; ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(0,255,255,0.7)'; ctx.fillText(name, -5, 0); ctx.fillStyle = 'rgba(255,0,200,0.7)'; ctx.fillText(name, 5, 3);
      ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(name, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(name, 0, 0);
      ctx.font = 'bold 16px ' + BODY; ctx.fillStyle = c.color; ctx.fillText('SUPER MOVE  ·  ' + c.name.toUpperCase(), R ? -6 : 6, -52);
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
  if (cine.dlg) drawDialogue(cine.dlg, t);
}
// a cutscene line: the speaker's name on a slanted plate, the words typing out on a dark glass panel
function drawDialogue(D, t) {
  const el = t - D.t, n = Math.min(D.text.length, Math.floor(el * 1.6)), a = clamp(el / 6, 0, 1);
  const bw = Math.min(W - 120, 620), x0 = (W - bw) / 2, y0 = H - 128, bh = 62, col = D.col || '#ffffff';
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - easeOut(a)) * 14);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, 'rgba(14,18,30,0.92)'); g.addColorStop(1, 'rgba(4,6,12,0.92)');
  ctx.fillStyle = g; quad([[x0 + 14, y0], [x0 + bw, y0], [x0 + bw - 14, y0 + bh], [x0, y0 + bh]]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(x0 + 14, y0, bw - 14, 2);
  ctx.font = `700 13px ${HEAD}`; tracked(3); const nw = ctx.measureText(D.who).width + 34;
  ctx.fillStyle = col; quad([[x0 + 22, y0 - 20], [x0 + 22 + nw, y0 - 20], [x0 + 12 + nw, y0], [x0 + 12, y0]]); ctx.fill();
  ctx.fillStyle = '#05070c'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(D.who, x0 + 34, y0 - 10); tracked(0);
  ctx.font = `500 19px ${BODY}`; ctx.fillStyle = '#f2f4f8'; ctx.fillText(D.text.slice(0, n) + (n < D.text.length && frame % 10 < 5 ? '\u2502' : ''), x0 + 30, y0 + bh / 2 + 1);
  ctx.restore();
}

const use3D = () => !!(window.R3D && R3D.ready && gfx.renderer === '3d');
function drawFightScene() {
  const fin = cine && cine.kind === 'fin' && P.length, inv = !!(fin && cine.void);
  if (use3D()) { R3D.invert(inv); R3D.renderFight(); if (fin && cine.dark > 0) { ctx.save(); ctx.globalAlpha = cine.dark * 0.9; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } drawFightOverlay3D(); return; }
  ctx.save(); applyRoll();
  if (arenaOn) drawArena2D(); else if (rizzOn) drawRizz2D(); else drawWorldStage();
  if (cine && P.length) drawCineBack();
  ctx.save(); worldT(); if (!arenaOn && !rizzOn) { drawCraters2D(); drawProps2D(); } if (fin) drawFinBack2D(); if (P.length) drawFighters(); projs.forEach(drawProj); drawParts(); if (fin) drawFinFront2D();
  if (mode === 'training' && training.hitboxes) drawHitboxes(false);
  ctx.restore();
  if (!arenaOn && !rizzOn) STAGES[stageId].front();
  ctx.restore();
  if (inv) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawPropPrompts(false);
  vignette(0.45);
  criticalGlow();
}
// the 3D scene draws the world; the 2D canvas on top adds cinematic graphics, labels and the HUD
function drawFightOverlay3D() {
  if (cine && P.length) drawCineBack(true);
  for (const p of parts) if (p.k === 't') {
    const [sx, sy] = R3D.project(p.x, p.y);
    ctx.save(); ctx.globalAlpha = clamp(p.life / p.max * 1.4, 0, 1); ctx.font = 'italic 700 24px ' + HEAD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(p.s, sx, sy); ctx.fillStyle = p.c; ctx.fillText(p.s, sx, sy); ctx.restore();
  }
  P.forEach(drawStatus);
  drawPropPrompts(true);
  if (mode === 'training' && training.hitboxes) drawHitboxes(true);
  vignette(0.38);
  criticalGlow();
}
// 2D: a dark broken patch with cracks where the floor was smashed
function drawCraters2D() {
  for (const c of craters) {
    const r = 60 * c.s; ctx.save(); ctx.translate(c.x, FLOOR + 6); ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(20,16,18,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + c.id; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); ctx.lineTo(Math.cos(a + 0.2) * r * 1.1, Math.sin(a + 0.2) * r * 1.1); ctx.stroke(); }
    ctx.restore();
  }
}
// a key badge over stage items a human fighter is standing next to
function drawPropPrompts(is3d) {
  if (cine || !P.length) return;
  props.forEach(p => {
    if (p.cd > 0) return;
    const f = P.find(f => !f.ai && Math.abs(f.x - p.x) < 110 && !f.move); if (!f) return;
    const [x, y] = is3d ? R3D.propPoint(p.x) : worldToScreen(p.x, FLOOR - 95);
    const key = keyName(mode === 'local' && f.side === 1 ? MAP2.env : MAP1.env), bob = Math.sin(frame / 8) * 3;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 15, y - 40 + bob, 30, 26); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 40 + bob, 30, 26);
    ctx.font = `700 15px ${HEAD}`; ctx.fillStyle = '#ffd23f'; ctx.fillText(key, x, y - 27 + bob);
    ctx.font = `500 11px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText(PROP_NAMES[p.kind], x + 2, y - 4 + bob);
    ctx.restore();
  });
}
// training: hurtboxes (green) and live attack boxes (red)
function drawHitboxes(proj) {
  const box = (x1, y1, x2, y2, col) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.fillStyle = col.replace('1)', '0.15)');
    if (proj) { const pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map(([x, y]) => R3D.project(x, y)); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
    else { ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); }
    ctx.fill(); ctx.stroke();
  };
  for (const f of P) {
    const b = hurtbox(f); box(b.x1, b.y1, b.x2, b.y2, 'rgba(60,255,120,1)');
    const M = f.move && MOVES[f.move];
    if (M && M.dmg && (M.limb || M.reach) && f.mt >= M.start && f.mt <= M.end + 1) {
      const s = f.scale, front = f.x + f.facing * f.sw * (M.limb ? 0.12 : 0.4) * s, reach = M.limb ? limbLen(f, M.limb) * M.rm + 4 : M.reach * s, cy = f.y - M.hy * f.h * s;
      const hh = (M.hh ? M.hh * f.h : 22) * s;
      box(Math.min(front, front + f.facing * reach), cy - hh, Math.max(front, front + f.facing * reach), cy + hh, 'rgba(255,50,60,1)');
    }
  }
}
function criticalGlow() {
  P.forEach((f, i) => {
    if (f.bar !== 1 || f.ko || demo) return;
    const a = 0.12 + 0.12 * Math.pow(Math.max(0, Math.sin(frame / 9)), 6);
    const g = ctx.createLinearGradient(i ? W : 0, 0, i ? W - 260 : 260, 0);
    g.addColorStop(0, `rgba(255,0,30,${a})`); g.addColorStop(1, 'rgba(255,0,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
}

function drawBanner() {
  if (!banner) return;
  const el = banner.max - banner.t, cx = W / 2, cy = H / 2 - 40;
  ctx.save();
  if (banner.count || banner.slam) {
    // slam in from huge, shockwave rings, a trailing echo, then settle and fade
    const big = banner.count ? 150 : 104, s = el < 7 ? 2.8 - 1.8 * easeOut(el / 7) : 1 + (el - 7) * (banner.count ? 0.006 : 0.0015);
    const a = banner.t < 10 ? banner.t / 10 : 1;
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 2; r++) { const e = el - r * 4; if (e > 0 && e < 24) { ctx.strokeStyle = `rgba(255,${banner.c === '#ffffff' ? 255 : 200},${banner.c === '#ffffff' ? 255 : 80},${(1 - e / 24) * 0.7})`; ctx.lineWidth = 7 * (1 - e / 24) + 1; ctx.beginPath(); ctx.ellipse(cx, cy, 70 + e * 18, (70 + e * 18) * 0.62, 0, 0, 7); ctx.stroke(); } }
    if (el < 12) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 380); g.addColorStop(0, `rgba(255,255,255,${0.35 * (1 - el / 12)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.22; ctx.translate(cx, cy); ctx.scale(s * 1.18, s * 1.18); bigText(banner.txt, 0, big, banner.c, 'rgba(0,0,0,0)', 0.0001);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(s, s);
    bigText(banner.txt, 0, big, banner.c, banner.c === '#ffffff' ? '#8a0012' : '#000', 0.0001);
    if (banner.sub) { ctx.font = `600 18px ${HEAD}`; tracked(10); ctx.textAlign = 'center'; ctx.fillStyle = '#ff2b2b'; ctx.fillText(banner.sub, 5, -big * 0.68); }
  } else if (banner.small) { // a callout near the top that stays out of the way of the action
    const t = 1 - banner.t / banner.max, s = t < 0.12 ? 1.6 - ease(t / 0.12) * 0.6 : 1;
    ctx.globalAlpha = banner.t < 12 ? banner.t / 12 : 1; ctx.translate(cx, 112); ctx.scale(s, s);
    bigText(banner.txt, 0, 40, banner.c, '#000', 0.0001);
  } else {
    const t = 1 - banner.t / banner.max, s = t < 0.15 ? 2.2 - ease(t / 0.15) * 1.2 : 1;
    ctx.globalAlpha = banner.t < 12 ? banner.t / 12 : 1; ctx.translate(cx, cy); ctx.scale(s, s);
    bigText(banner.txt, 0, 88, banner.c, banner.c === '#ffffff' ? '#b3001b' : '#000', 0.0001);
  }
  ctx.restore();
}

// the pre-fight intro: letterbox, where we are, a name slam as each fighter walks in, and subtitles for the lines
function drawIntroOverlay() {
  if (!(introT > 125 && introLong()) || matchOver) return;
  const B = introBeat(), sq = !B || B.kind === 'square', k = B ? clamp((B.from - introT) / (B.from - B.to), 0, 1) : 1;
  const lb = 46 * (introT > 190 ? 1 : clamp((introT - 132) / 58, 0, 1)) * Math.min(1, (INTRO_LEN - introT) / 12);
  if (sq) vignette(0.38 * clamp((introT - 126) / 60, 0, 1) * (0.8 + 0.2 * Math.sin(frame / 6)));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb);
  ctx.save(); ctx.textBaseline = 'middle';
  if (B && B.kind === 'est') {
    const e = INTRO_LEN - introT; ctx.globalAlpha = clamp(e / 14, 0, 1) * clamp((introT - B.to) / 10, 0, 1); ctx.textAlign = 'left';
    ctx.font = `600 11px ${HEAD}`; tracked(6); ctx.fillStyle = '#e01b2b'; ctx.fillText('LOCATION', 48, H - 116);
    ctx.font = `600 34px ${HEAD}`; tracked(5); ctx.fillStyle = '#fff'; ctx.fillText(STAGES[stageId].name, 46, H - 88);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(48, H - 66, 40 + e * 4, 1);
  }
  if (B && B.kind === 'hero') { // the name slams in over a streak of their colour, in slow motion
    const f = P[B.side], R = f.side === 1, c = f.c, a = clamp(k / 0.12, 0, 1) * clamp((1 - k) / 0.12, 0, 1), s = 1 + Math.max(0, 0.18 - k) * 3;
    const x = R ? W - 60 : 60, y = H - 150;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, R ? 0.22 : -0.22, 1, 0, 0);
    const g = ctx.createLinearGradient(R ? 40 : -40, 0, R ? -520 : 520, 0); g.addColorStop(0, rgba(c.color, 0.85)); g.addColorStop(1, rgba(c.color, 0)); ctx.fillStyle = g; ctx.fillRect(R ? -520 : -40, -46, 560, 92);
    ctx.fillStyle = '#fff'; ctx.fillRect(R ? -520 : -40, 44, 560 * Math.min(1, k * 4), 2);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    chromeText(c.name.toUpperCase(), 0, -4, c.name.length > 14 ? 46 : 60, { align: R ? 'right' : 'left', weight: 900, glow: rgba(c.color, 0.6) });
    capsText(c.title.toUpperCase(), R ? -2 : 2, 40, 15, c.color, { align: R ? 'right' : 'left', weight: 700, track: 8 });
    const tag = f.ai ? 'CPU' : mode === 'online' ? (f.side === mySlot() ? 'YOU' : 'OPPONENT') : 'PLAYER ' + (f.side + 1);
    capsText(tag, R ? -2 : 2, -50, 11, 'rgba(255,255,255,0.75)', { align: R ? 'right' : 'left', weight: 700, track: 5 });
    ctx.restore();
  }
  if (B && B.kind === 'line') {
    const f = P[B.side], R = f.side === 1, x = R ? W - 48 : 48, el = B.from - introT; ctx.globalAlpha = clamp(el / 8, 0, 1) * clamp((INTRO_SAY - el) / 8, 0, 1);
    ctx.fillStyle = f.c.color; ctx.fillRect(R ? W - 52 : 48, H - 132, 4, 44);
    chromeText(f.c.name.toUpperCase(), R ? x - 12 : x + 12, H - 118, 28, { align: R ? 'right' : 'left', weight: 900, glow: rgba(f.c.color, 0.5) });
    capsText(f.c.title.toUpperCase(), R ? x - 12 : x + 12, H - 95, 11, f.c.color, { align: R ? 'right' : 'left', weight: 700, track: 4 });
    const line = '“' + introLine(f) + '”'; ctx.textAlign = 'center'; ctx.font = `500 17px ${BODY}`; tracked(0);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(line, W / 2 + 1, H - 22); ctx.fillStyle = '#f4f2f8'; ctx.fillText(line, W / 2, H - 23);
  }
  if (introT > 140) { ctx.globalAlpha = 0.55; ctx.textAlign = 'right'; ctx.font = `500 11px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText('SPACE / ENTER  SKIP', W - 24, 23); }
  ctx.restore(); tracked(0);
}
function drawFight() {
  drawFightScene();
  if (!matchOver && !cine) drawHUD();
  drawIntroOverlay();
  if (finish && !cine && P[finish.side]) drawFinishPrompt();
  if (mode === 'training' && !cine) drawTrainingHUD();
  if (mode === 'online' && (vc.stream || vc.analR)) drawVoiceHUD();
  drawBanner();
  if (cine) drawCineFront();
  if (screenFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${screenFlash / 16})`; ctx.fillRect(0, 0, W, H); }
  if (matchOver) drawResults();
  if (paused) {
    ctx.fillStyle = 'rgba(3,4,9,0.72)'; ctx.fillRect(0, 0, W, H);
    uiBackdrop('#3ea6ff', { grid: 0.02 });
    uiPanel(W / 2 - 190, 150, 380, 220, { accent: UI.blue, accentTop: 1, glow: UI.blue });
    chromeText('PAUSED', W / 2, 196, 40, { align: 'center', weight: 900, track: 10, glow: 'rgba(62,166,255,0.5)' });
    const fA = P[0] && P[0].c, fB = P[1] && P[1].c; if (fA && fB) capsText(fA.name.toUpperCase() + '  VS  ' + fB.name.toUpperCase(), W / 2, 228, 10, 'rgba(225,232,244,0.6)', { align: 'center', weight: 700, track: 4 });
    uiMenuItem(W / 2 - 150, 252, 300, 40, 'RESUME', true, 1, 'ENTER / ESC');
    uiMenuItem(W / 2 - 150, 304, 300, 40, 'QUIT TO MENU', false, 1, 'Q');
    uiPrompts([['ENTER', 'RESUME'], ['ESC', 'RESUME'], ['Q', 'QUIT']]);
  }
}

// FINISH HIM: who can finish, the key to press, and how long is left
function drawFinishPrompt() {
  const w = P[finish.side], left = 1 - finish.t / finish.max;
  const human = !w.ai && (mode !== 'online' || finish.side === mySlot());
  const key = keyName(mode === 'local' && finish.side === 1 ? MAP2.super : MAP1.super), x0 = W / 2 - 200, y0 = H - 112;
  uiPanel(x0, y0, 400, 56, { accent: '#ff2b2b', glow: '#ff2b2b', alpha: 0.85 });
  uiMeter(x0 + 16, y0 + 44, 368, 5, left, '#c8102e', { hi: '#ffb0b0', sk: 3 });
  if (human) { capsText('GET CLOSE AND PRESS', W / 2 - 70, y0 + 22, 14, frame % 40 < 28 ? '#fff' : '#ffb3b3', { align: 'right', weight: 800, track: 3 }); const kw = keyCap(W / 2 - 60, y0 + 22, key); capsText('TO FINISH', W / 2 - 60 + kw + 10, y0 + 22, 14, frame % 40 < 28 ? '#fff' : '#ffb3b3', { weight: 800, track: 3 }); }
  else capsText(w.c.name.toUpperCase() + ' IS GOING FOR THE FINISH', W / 2, y0 + 22, 14, frame % 40 < 28 ? '#fff' : '#ffb3b3', { align: 'center', weight: 800, track: 3 });
}
function drawTrainingHUD() {
  const lines = [['TRAINING', '#ffd23f'], ['1  DUMMY: ' + DUMMY_MODES[training.dummy] + (DUMMY_MODES[training.dummy] === 'CPU' ? ' (' + DIFFS[difficulty].name + ')' : ''), '#fff'],
    ['2  REFILL HEALTH: ' + (training.refill ? 'ON' : 'OFF'), '#fff'], ['3  INFINITE METER + SKILL: ' + (training.meter ? 'ON' : 'OFF'), '#fff'],
    ['4  HITBOXES: ' + (training.hitboxes ? 'ON' : 'OFF'), '#fff'], ['5  INPUT HISTORY: ' + (training.inputs ? 'ON' : 'OFF'), '#fff'], ['0  RESET POSITIONS', '#fff']];
  const L2 = training.cur || training.last;
  if (L2) lines.push(['', ''], [(training.cur ? 'COMBO: ' : 'LAST COMBO: ') + L2.hits + ' HITS · ' + L2.dmg + ' DMG (' + L2.pct + '%)', '#ff8a8a']);
  if (training.max) lines.push(['BEST: ' + training.max + ' HITS', '#ff8a8a']);
  ctx.save(); uiPanel(14, 196, 256, 22 + lines.length * 18, { accent: '#ffd23f', alpha: 0.8 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach(([t, c], i) => { if (!i) { capsText(t, 28, 214, 12, c, { weight: 800, track: 5 }); return; } ctx.font = '12px ' + BODY; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = c; ctx.fillText(t, 28, 206 + i * 18); });
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (training.inputs) {
    uiPanel(W - 124, 196, 110, 22 + 12 * 18, { alpha: 0.75 });
    ctx.font = 'bold 13px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('INPUTS', W - 110, 206);
    training.log.forEach((t, i) => { ctx.globalAlpha = 1 - i / 13; ctx.fillStyle = '#fff'; ctx.font = '13px ' + BODY; ctx.fillText(t, W - 110, 224 + i * 17); });
  }
  ctx.restore();
}
function drawVoiceHUD() {
  const bar = (x, label, lvl, on, col) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, H - 64, 120, 22);
    ctx.fillStyle = on ? col : '#555'; ctx.fillRect(x + 50, H - 57, 64 * clamp(lvl * 3, 0.05, 1), 8);
    ctx.font = 'bold 11px ' + BODY; ctx.fillStyle = on ? '#fff' : '#888'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 6, H - 53);
  };
  bar(W / 2 - 126, '🎤 YOU', vc.level, vc.talking, '#3ddc5a');
  bar(W / 2 + 6, '🔊 FRIEND', vc.remote, vc.remote > 0.02, '#3b8cff');
  if (voiceChat === 'ptt' && !vc.talking) { ctx.font = '11px ' + BODY; ctx.fillStyle = '#bbb'; ctx.textAlign = 'center'; ctx.fillText('hold ' + keyName(EXTRA.ptt) + ' to talk', W / 2, H - 74); }
}

function drawResults() {
  // the slow-motion part first: letterbox and a hush; the result card slides in after it
  const slow = clamp(1 - (overT - OUT_SLOW + 30) / 30, 0, 1), lb = 40 * slow;
  if (lb > 0.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb); }
  const k = easeOut(clamp((overT - OUT_SLOW + 20) / 40, 0, 1)); if (k <= 0) return;
  if (winner < 0) { bigText('DRAW', H / 2, 90); return; }
  const f = P[winner], R = winner === 1;
  ctx.save(); ctx.globalAlpha = k;
  const pg = ctx.createLinearGradient(R ? W : 0, 0, R ? W - 660 : 660, 0); pg.addColorStop(0, 'rgba(2,3,6,0.88)'); pg.addColorStop(1, 'rgba(2,3,6,0)'); ctx.fillStyle = pg; quad([[0, 360], [660, 360], [620, 492], [0, 492]], R); ctx.fill();
  const ag = ctx.createLinearGradient(R ? W : 0, 0, R ? W - 640 : 640, 0); ag.addColorStop(0, f.c.color); ag.addColorStop(1, rgba(f.c.color, 0)); ctx.fillStyle = ag; quad([[0, 356], [640, 356], [637, 360], [0, 360]], R); ctx.fill();
  ctx.restore();
  const tx = R ? W - 40 : 40, off = (1 - k) * 200 * (R ? 1 : -1);
  ctx.save(); ctx.globalAlpha = k;
  capsText(f.ai ? 'CPU' : mode === 'online' ? (f.side === mySlot() ? 'YOU WIN' : 'YOU LOSE') : 'PLAYER ' + (f.side + 1), tx + off, 380, 12, f.c.color, { align: R ? 'right' : 'left', weight: 800, track: 6 });
  chromeText(f.c.name.toUpperCase(), tx + off, 418, f.c.name.length > 14 ? 44 : 56, { align: R ? 'right' : 'left', weight: 900, glow: rgba(f.c.color, 0.6) });
  ctx.font = `italic 900 ${f.c.name.length > 14 ? 44 : 56}px ${DISP}`; tracked(2); const nw = ctx.measureText(f.c.name.toUpperCase()).width; tracked(0);
  slant(R ? tx + off - nw - 108 : tx + off + nw + 14, 400, 92, 36, 8); ctx.fillStyle = f.c.color; ctx.fill();
  capsText('WINS', R ? tx + off - nw - 62 : tx + off + nw + 62, 419, 20, '#05070c', { align: 'center', weight: 900, track: 4 });
  ctx.font = 'italic 17px ' + BODY; ctx.fillStyle = 'rgba(240,244,250,0.92)'; ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.fillText('“' + (f.vicLine || f.c.quote) + '”', tx + off, 462);
  if (f.hp >= f.maxHp - 0.5) capsText('FLAWLESS', tx + off, 484, 12, '#ffd23f', { align: R ? 'right' : 'left', weight: 900, track: 8 });
  ctx.restore();
  bigText('VICTORY', 70, 56, '#ffd23f');
  if (net.rankRes) { const R2 = net.rankRes, T = tierOf(R2.after);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 22px ${HEAD}`; tracked(3);
    ctx.fillStyle = R2.d >= 0 ? '#7dff9a' : '#ff6b6b'; ctx.fillText((R2.d >= 0 ? '+' : '') + R2.d + ' RP', W / 2, 112);
    ctx.font = `600 14px ${HEAD}`; ctx.fillStyle = T[2]; ctx.fillText((R2.up ? 'PROMOTED: ' : R2.down ? 'DEMOTED: ' : '') + rankLabel(R2.after), W / 2, 138); ctx.restore(); tracked(0); }
  uiPrompts(mode === 'online' && net.ranked ? [['ENTER', 'NEXT RANKED MATCH'], ['ESC', 'MENU']] : net.role === 'guest' ? [['ENTER', 'ASK FOR A REMATCH'], ['ESC', 'LEAVE']] : [['ENTER', 'REMATCH'], ['C', 'CHANGE FIGHTERS'], ['ESC', 'MENU']]);
}

// ----- menus (BP VERSE) -----
const LOGO_FONT = TITLE, MENU_FONT = HEAD;
const MAIN_MENU = ['PLAY', 'SETTINGS', 'CHARACTERS', 'CREDITS', 'EXIT'];
const PLAY_MENU = [['STORY MODE', 'The story of the BP VERSE. Coming soon.'], ['VS CPU', 'Fight the computer. ←/→ changes difficulty.'],
  ['RANKED', 'Online: matched with someone near your rank. Wins raise your rating, losses lower it; leaving a ranked fight counts as a loss.'],
  ['QUICK MATCH', 'Online: fight whoever is searching right now. No rating on the line.'],
  ['TRAINING', 'Practise on a dummy: combos, hitboxes, damage, input history.'], ['2 PLAYERS', 'Same keyboard, or two controllers.'],
  ['ONLINE · HOST', 'Make a private room and send the code to a friend.'], ['ONLINE · JOIN', "Type a friend's room code."], ['BACK', '']];
const PLAY = Object.fromEntries(PLAY_MENU.map((m, i) => [m[0], i]));
const SETTINGS_MENU = ['DIFFICULTY', 'GRAPHICS', 'RENDERER', 'MUSIC', 'SOUNDTRACK', 'VOICES', 'VOICE CHAT', 'KEY BINDINGS', 'CONTROLS & COMBOS', 'SHOW FPS', 'BACK'];
const QNAMES = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], VC_NAMES = { off: 'OFF', open: 'OPEN MIC', ptt: 'PUSH TO TALK' };
const SETTINGS_HELP = [
  () => { const d = DIFFS[difficulty]; return `CPU reacts ${['slowly', 'normally', 'fast', 'instantly'][difficulty]}, blocks ${Math.round(d.block * 100)}% of the time and hits ${Math.round(d.dmg * 100)}% as hard.`; },
  () => '←/→ quality (shadows, glow, resolution) · Enter: auto-lower if the game runs slow (' + (gfx.auto ? 'on' : 'off') + ')',
  () => gfx.renderer === '3d' ? (use3D() ? '3D: three.js renderer with lighting, shadows and glow.' : '3D is starting or not supported here.') : '2D: the classic flat renderer (fastest).',
  () => 'Background music (M toggles it anywhere).', () => '←/→ pick the fight music: a random track every match, or always the same one.', () => 'Character and announcer voice lines.',
  () => 'Online matches: talk with your opponent. Push to talk uses ' + keyName(EXTRA.ptt) + ' (change it in Key Bindings).',
  () => 'Rebind every key for player 1 and player 2.', () => 'Every control, move and combo.', () => 'Show the frame rate in the corner.', () => '',
];
const menuBlake = makeFighter(3, 0, 0); menuBlake.facing = -1; menuBlake.gaze = true;
// ---------- menu vibes: the menus change mood every few seconds, each one starring a different fighter ----------
// rig: the 3D lights; back: tint of the painted city; fx: the particles; pose: what the fighter does on the ledge
const VIBE_LEN = 600;
const bored = id => t => mk(Object.assign({ crouch: 0.02 }, STYLE[id].bored.pose(t)));
const VIBES = [
  { id: 'blake', name: 'MIDNIGHT ROOFTOP', col: '#ff3fa4', wash: '#2a3552', fx: 'rain', pcol: '#a8b4d8', back: 0x9a96a4, rot: 1.78, gaze: 1,
    rig: { sky: '#2a3552', ground: '#040408', hemi: 0.16, keyCol: '#9fb4ff', key: 0.22, rimCol: '#c8d6ff', rim: 1.7, fog: [0x07070f, 12, 120], bg: 0x020308, env: 0.06, bloomT: 1.2, points: [['#ff2040', 0.6, -0.6, -4.6, 3], ['#4a5cff', -3.5, 2.4, -1.2, 4]] } },
  { id: 'frank', name: 'SLAM CITY SUNSET', col: '#ff6a1a', wash: '#ff7a3a', fx: 'rise', pcol: '#ff9a3a', back: 0xffa070, rot: -1.62, pose: bored('frank'),
    rig: { sky: '#ffa070', ground: '#1a0a06', hemi: 0.5, keyCol: '#ffb57a', key: 1.7, rimCol: '#ff5a2a', rim: 2.4, fog: [0x3a1408, 20, 140], bg: 0x2a0c06, env: 0.16, bloomT: 1.0, points: [['#ff6a1a', 1.5, 1.0, -2.0, 6], ['#ffd27a', -3, 2.5, -1.5, 3]] } },
  { id: 'julian', name: 'HIGH TIDE', col: '#3b8cff', wash: '#2a7acc', fx: 'bubbles', pcol: '#9ae6ff', back: 0x6ab8ff, rot: -1.5, pose: t => SHOWPOSE.julian(t),
    rig: { sky: '#4a9ad8', ground: '#020a14', hemi: 0.4, keyCol: '#a8dcff', key: 1.3, rimCol: '#3b8cff', rim: 2.6, fog: [0x06223a, 14, 110], bg: 0x041626, env: 0.14, bloomT: 1.05, points: [['#3bc8ff', 1, 1, -2, 5], ['#2a5cff', -3, 2.4, -1.5, 4]] } },
  { id: 'darren', name: 'GOLDEN HOUR', col: '#f5c518', wash: '#ffcf5a', fx: 'drift', pcol: '#ffd34a', back: 0xffd890, rot: -1.72, pose: bored('darren'),
    rig: { sky: '#ffd890', ground: '#1a1204', hemi: 0.45, keyCol: '#ffe6a8', key: 1.6, rimCol: '#f5c518', rim: 2.3, fog: [0x2a1e06, 18, 130], bg: 0x1a1204, env: 0.16, bloomT: 1.0, points: [['#f5c518', 1, 1, -2, 5], ['#ff9a2a', -3, 2.4, -1.5, 3]] } },
  { id: 'clav', name: 'ICE COLD', col: '#5ad1ff', wash: '#9fdcff', fx: 'fall', pcol: '#e8f8ff', back: 0xa8dcff, rot: -1.78, pose: bored('clav'),
    rig: { sky: '#c4e8ff', ground: '#04080c', hemi: 0.5, keyCol: '#eef8ff', key: 1.8, rimCol: '#5ad1ff', rim: 2.6, fog: [0x0a1a24, 16, 120], bg: 0x06121a, env: 0.18, bloomT: 1.0, points: [['#5ad1ff', 1, 1, -2, 5], ['#ffffff', -3, 2.4, -1.5, 3]] } },
  { id: 'tung', name: 'SAHUR NIGHT', col: '#ff9a3a', wash: '#ff8a3a', fx: 'rise', pcol: '#ffb060', back: 0xffa060, rot: -1.6, pose: bored('tung'),
    rig: { sky: '#ff9a50', ground: '#140a04', hemi: 0.42, keyCol: '#ffc890', key: 1.5, rimCol: '#ff7a1a', rim: 2.4, fog: [0x2a1206, 16, 120], bg: 0x1a0a04, env: 0.14, bloomT: 1.0, points: [['#ff8a2a', 1, 1, -2, 6], ['#ffd27a', -3, 2.4, -1.5, 3]] } },
  { id: 'hexum', name: 'COLD APPROACH', col: '#3ddc84', wash: '#ff5fa2', fx: 'drift', pcol: '#ff9fd0', back: 0xff9fd0, rot: -1.62, pose: bored('hexum'),
    rig: { sky: '#ff9fd0', ground: '#0a0410', hemi: 0.42, keyCol: '#ffe0f0', key: 1.4, rimCol: '#3ddc84', rim: 2.8, fog: [0x1c0824, 14, 110], bg: 0x12051c, env: 0.16, bloomT: 1.0, points: [['#ff5fa2', 1, 1, -2, 6], ['#3ddc84', -3, 2.4, -1.5, 4]] } },
  { id: 'verity', name: 'LIGHTS OUT', col: '#d8c84a', wash: '#3a3a20', fx: 'fall', pcol: '#d8d4a0', back: 0x8a8670, rot: -1.7, pose: bored('verity'),
    rig: { sky: '#6a6650', ground: '#020202', hemi: 0.14, keyCol: '#e8e0a0', key: 0.9, rimCol: '#d8c84a', rim: 2.2, fog: [0x050504, 8, 70], bg: 0x030302, env: 0.05, bloomT: 1.2, points: [['#d8c84a', 0.6, 1.2, -2.2, 3], ['#4a4a30', -3, 2.4, -1.5, 2]] } },
  { id: 'ryan', name: 'ULTRAVIOLET', col: '#b44dff', wash: '#8a4aff', fx: 'drift', pcol: '#e0a8ff', back: 0xc89aff, rot: -1.5, pose: t => SHOWPOSE.ryan(t),
    rig: { sky: '#9a5aff', ground: '#0a0414', hemi: 0.4, keyCol: '#d8baff', key: 1.4, rimCol: '#b44dff', rim: 2.8, fog: [0x1a0a2a, 14, 110], bg: 0x0c0418, env: 0.14, bloomT: 1.0, points: [['#b44dff', 1, 1, -2, 6], ['#ff4ad8', -3, 2.4, -1.5, 4]] } },
];
let menuT = Math.floor(Math.random() * VIBES.length) * VIBE_LEN + 1;
const vibeIdx = () => Math.floor(menuT / VIBE_LEN) % VIBES.length;
const menuVibe = () => VIBES[vibeIdx()];
const vibeFade = () => { const k = menuT % VIBE_LEN; return clamp(Math.min(k, VIBE_LEN - k) / 24, 0, 1); }; // dips to black between vibes
const VIBE_F = {};
function vibeFighter(v) { // the fighter on the ledge, posed for the vibe
  let f = VIBE_F[v.id];
  if (!f) { f = VIBE_F[v.id] = makeFighter(CHARS.findIndex(c => c.id === v.id), 0, 0); f.hp = f.maxHp; f.gaze = !!v.gaze; if (v.pose) f.menuPose = v.pose; }
  return f;
}
function vibeParticles(v, a) { // 2D: the vibe's particles over the scene
  if (v.fx === 'rain') return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = v.pcol;
  for (let i = 0; i < 60; i++) {
    const s0 = seeded(i, 1), s1 = seeded(i, 2), sp = 0.4 + seeded(i, 3) * 0.8, t = frame;
    let x = s0 * W, y = s1 * H, r = 1.2 + seeded(i, 4) * 2.4;
    if (v.fx === 'rise') { y = H - ((s1 * H + t * sp) % (H + 20)); x += Math.sin(t / 50 + i) * 20; }
    else if (v.fx === 'bubbles') { y = H - ((s1 * H + t * sp * 0.6) % (H + 20)); x += Math.sin(t / 22 + i) * 8; r += 1.5; }
    else if (v.fx === 'fall') { y = (s1 * H + t * sp * 0.7) % (H + 20) - 10; x += Math.sin(t / 40 + i) * 16; }
    else { x += Math.sin(t / 90 + i) * 40; y += Math.sin(t / 70 + i * 1.3) * 26; }
    ctx.globalAlpha = a * (0.25 + 0.5 * seeded(i, 5)) * (v.fx === 'drift' ? 0.5 + 0.5 * Math.sin(t / 12 + i) : 1);
    if (v.fx === 'bubbles') { ctx.strokeStyle = v.pcol; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
// the vibe's name in the corner, and its colour washing up from the floor
function vibeOverlay(v, a, isTitle) {
  const c = CHARS.find(c => c.id === v.id);
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, H, 0, H * 0.45); g.addColorStop(0, rgba(v.wash, 0.22)); g.addColorStop(1, rgba(v.wash, 0)); ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
  const x = isTitle ? W - 30 : W - 30, y = H - 68, al = 'right';
  ctx.fillStyle = v.col; ctx.fillRect(x + 2, y - 13, 3, 26);
  capsText(isTitle ? '◀ ▶  ' + v.name : v.name, x - 8, y - 6, 10, 'rgba(225,232,244,0.6)', { align: al, track: 4 });
  chromeText(c.name.toUpperCase(), x - 8, y + 9, 15, { align: al, weight: 800, track: 2, glow: rgba(v.col, 0.5) });
  ctx.restore(); tracked(0);
}
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
const MENU_SCREENS = ['title', 'mode', 'play', 'settings', 'credits', 'controls', 'keys', 'lobby', 'join'];
function drawMenuBg() {
  menuT++;
  const v = menuVibe(), a = vibeFade(), isTitle = screen === 'title';
  if (use3D() && R3D.renderTitle && R3D.renderTitle(isTitle, v)) {
    vibeParticles(v, a * 0.6);
    if (!isTitle) { const g = ctx.createLinearGradient(0, 0, W * 0.62, 0); g.addColorStop(0, 'rgba(3,4,9,0.88)'); g.addColorStop(0.6, 'rgba(3,4,9,0.5)'); g.addColorStop(1, 'rgba(3,4,9,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.62, H); }
    uiBackdrop(v.col); vignette(0.7);
  } else {
    drawVerseArt(Math.sin(frame / 300) * 20, 1, 1);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(v.wash, 0.55); ctx.fillRect(0, 0, W, H); ctx.restore(); // the vibe's colour grade
    if (v.fx === 'rain') roof.front();
    const lx = W * 0.5, ly = H - 70;
    const lg = ctx.createRadialGradient(W * 0.66, ly - 90, 10, W * 0.66, ly - 90, 220); lg.addColorStop(0, rgba(v.col, 0.3)); lg.addColorStop(1, rgba(v.col, 0));
    ctx.fillStyle = lg; ctx.fillRect(lx, ly - 320, W - lx, 320);
    ctx.fillStyle = '#0c090f'; ctx.beginPath(); ctx.moveTo(lx + 30, ly); ctx.lineTo(W + 10, ly - 6); ctx.lineTo(W + 10, H + 10); ctx.lineTo(lx, H + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(v.col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + 30, ly); ctx.lineTo(W + 10, ly - 6); ctx.stroke();
    ctx.fillStyle = '#16111a'; for (let i = 0; i < 6; i++) ctx.fillRect(lx + 60 + i * 70, ly + 14 + (i % 2) * 8, 40, 6);
    const f = vibeFighter(v); f.facing = -1; drawFighterAt(f, W * 0.67, ly, 1.05);
    vibeParticles(v, a);
    const g = ctx.createLinearGradient(0, 0, W * 0.55, 0); g.addColorStop(0, 'rgba(5,2,10,0.85)'); g.addColorStop(1, 'rgba(5,2,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.55, H);
    uiBackdrop(v.col); vignette(0.7); if (v.fx === 'rain') embers();
  }
  if (a < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - a) * 0.92})`; ctx.fillRect(0, 0, W, H); }
  vibeOverlay(v, a, isTitle);
}
function drawMenuList(items, idx, x, y, gap, values, fs, o) {
  fs = fs || 1; o = o || {};
  const h = Math.round(gap * 0.8), w = o.w || Math.round(330 * Math.max(0.85, fs));
  items.forEach((m, i) => uiMenuItem(x - 18, y + i * gap - h / 2, w, h, m, i === idx, (screenT - i * 3) / 16, values && values[i], { size: Math.round(Math.min(22, h * 0.52) * (fs < 0.8 ? 0.95 : 1)), disabled: o.disabled && o.disabled[i] }));
}
// bottom key-hint bar
function footer(t) {
  // the old free-text hints become key-cap prompts: "KEY  Label      KEY  Label"
  const items = t.split(/\s{4,}/).map(p => p.trim()).filter(Boolean).map(p => { const m = p.match(/^(\S+(?: \S)?(?: \S)?)\s{2}(.+)$/); return m ? [m[1], m[2].toUpperCase()] : null; }).filter(Boolean);
  if (items.length) uiPrompts(items, { left: t.includes('M: music') ? audioHint() : '' }); else uiPrompts([], { left: t });
}
// the BP VERSE wordmark (Arkham-style: small tracked "BP" over a big tracked serif "VERSE")
function wordmark(x, y, sc, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = a == null ? 1 : a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 22px ${TITLE}`; tracked(22); ctx.fillStyle = '#d8d4dc'; ctx.fillText('B P', 11, -96);
  const g = ctx.createLinearGradient(0, -80, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#c9c6cf'); g.addColorStop(1, '#6d6874');
  ctx.font = `700 92px ${TITLE}`; tracked(18); ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 30; ctx.fillStyle = g; ctx.fillText('VERSE', 9, 0);
  ctx.shadowBlur = 0; ctx.fillStyle = '#c3121f'; ctx.fillRect(-120, 20, 240, 2);
  ctx.font = `500 13px ${HEAD}`; tracked(8); ctx.fillStyle = '#b8b2bf'; ctx.fillText('FIGHTER 1223', 4, 46);
  ctx.restore();
}
const audioHint = () => 'M: music ' + (musicOn ? 'on' : 'off') + ' · V: voices ' + (voiceOn ? 'on' : 'off');
function drawTitle() {
  drawMenuBg();
  const tg = ctx.createLinearGradient(0, 0, 0, 300); tg.addColorStop(0, 'rgba(2,2,6,0.75)'); tg.addColorStop(1, 'rgba(2,2,6,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 300);
  const k = easeOut((screenT - 20) / 90);
  wordmark(W / 2, 200, 1, clamp(k, 0, 1));
  const wk = clamp((screenT - 40) / 50, 0, 1);
  ctx.save(); ctx.globalAlpha = wk; capsText('WELCOME TO BP BRADAR', W / 2 + 5, 272, 13, menuVibe().col, { align: 'center', track: 10, weight: 700 }); ctx.restore();
  // PRESS ENTER: a glowing plate that breathes
  const a = clamp((screenT - 60) / 40, 0, 1), br = 0.5 + 0.5 * Math.sin(frame / 22);
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; const pw = 280, px = W / 2 - pw / 2, py = H - 96;
    slant(px, py, pw, 36, 10); const g = ctx.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, 'rgba(62,166,255,0)'); g.addColorStop(0.5, `rgba(62,166,255,${0.18 + br * 0.2})`); g.addColorStop(1, 'rgba(62,166,255,0)'); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = `rgba(160,210,255,${0.4 + br * 0.4})`; ctx.fillRect(px + 30, py, pw - 60, 1); ctx.fillRect(px + 30, py + 35, pw - 60, 1);
    const kw = keyCap(W / 2 - 62, py + 18, 'ENTER'); chromeText('PRESS START', W / 2 - 62 + kw + 10, py + 19, 17, { weight: 800, track: 4, glow: `rgba(62,166,255,${0.3 + br * 0.4})` });
    ctx.restore(); }
  uiPrompts([['M', 'MUSIC ' + (musicOn ? 'ON' : 'OFF')], ['V', 'VOICES ' + (voiceOn ? 'ON' : 'OFF')]]);
}
function menuHeader(t, kicker) { uiHeader(t, kicker || 'BP VERSE'); }
const MAIN_DESC = { PLAY: 'Story, VS CPU, ranked, quick match, training, two players and online rooms.', SETTINGS: 'Difficulty, graphics, music, voices and key bindings.',
  CHARACTERS: 'Meet the roster: stats, skills, supers and finishers.', CREDITS: 'Who made BP VERSE.', EXIT: 'Leave the game.' };
function drawMenu() {
  drawMenuBg();
  uiHeader('MAIN MENU', 'WELCOME TO BP BRADAR', { accent: menuVibe().col });
  drawMenuList(MAIN_MENU, menuIdx, 74, 150, 52, null, 1, { w: 320 });
  const k = easeOut(clamp((screenT - 10) / 20, 0, 1));
  ctx.save(); ctx.globalAlpha = k; uiPanel(56, 418, 360, 52, { accent: menuVibe().col, alpha: 0.72 });
  capsText(MAIN_MENU[menuIdx], 72, 434, 11, menuVibe().col, { weight: 800, track: 4 });
  ctx.font = '13px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.88)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(MAIN_DESC[MAIN_MENU[menuIdx]] || '', 72, 454); ctx.restore();
  uiPrompts([['↑ ↓', 'NAVIGATE'], ['ENTER', 'SELECT'], ['M', 'MUSIC'], ['V', 'VOICES']]);
}
function drawPlayMenu() {
  drawMenuBg(); uiHeader('PLAY', 'CHOOSE A MODE');
  const vals = []; vals[PLAY['STORY MODE']] = 'COMING SOON'; vals[PLAY['VS CPU']] = '◀ ' + DIFFS[difficulty].name + ' ▶'; vals[PLAY['RANKED']] = rankLabel(rank.r).toUpperCase();
  const dis = []; dis[PLAY['STORY MODE']] = 1;
  drawMenuList(PLAY_MENU.map(m => m[0]), subIdx, 74, 122, 39, vals, 0.86, { w: 330, disabled: dis });
  // the mode card: what this is, and your rank
  const x0 = W - 330, y0 = 112, k = easeOut(clamp((screenT - 6) / 20, 0, 1)), name = PLAY_MENU[subIdx][0];
  ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 30, 0);
  uiPanel(x0, y0, 300, 128, { accent: UI.blue, glow: UI.blue });
  capsText('MODE', x0 + 18, y0 + 20, 10, UI.blue, { weight: 800, track: 5 });
  chromeText(name, x0 + 16, y0 + 46, 24, { weight: 900, track: 2, glow: 'rgba(62,166,255,0.35)' });
  ctx.font = '12.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(PLAY_MENU[subIdx][1] || 'Back to the main menu.', x0 + 18, y0 + 76, 266, 16);
  const T = tierOf(rank.r), nx = TIERS[TIERS.indexOf(T) + 1], y1 = y0 + 144;
  uiPanel(x0, y1, 300, 120, { accent: T[2], glow: T[2] });
  capsText('YOUR RANK', x0 + 18, y1 + 18, 10, 'rgba(225,232,244,0.6)', { weight: 800, track: 5 });
  hexPath(x0 + 46, y1 + 62, 26); ctx.fillStyle = rgba(T[2], 0.22); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = chromeGrad(y1 + 36, y1 + 88); ctx.stroke();
  hexPath(x0 + 46, y1 + 62, 20); ctx.lineWidth = 1.5; ctx.strokeStyle = T[2]; ctx.stroke();
  chromeText(T[0].slice(0, 1), x0 + 46, y1 + 63, 22, { align: 'center', weight: 900, track: 0, glow: T[2] });
  chromeText(T[0], x0 + 86, y1 + 50, 24, { weight: 900, tint: T[2], glow: rgba(T[2], 0.5) });
  capsText(Math.round(rank.r) + ' RP  ·  ' + rank.w + 'W ' + rank.l + 'L' + (rank.streak > 1 ? '  ·  ' + rank.streak + ' STREAK' : ''), x0 + 88, y1 + 76, 11, '#fff', { track: 2 });
  if (nx) { const q = clamp((rank.r - T[1]) / (nx[1] - T[1]), 0, 1); uiMeter(x0 + 88, y1 + 92, 190, 7, q, T[2], { hi: '#ffffff', sk: 3 });
    capsText(Math.ceil(nx[1] - rank.r) + ' RP TO ' + nx[0], x0 + 88, y1 + 108, 9, 'rgba(225,232,244,0.55)', { track: 2 }); }
  ctx.restore();
  uiPrompts([['↑ ↓', 'NAVIGATE'], ['← →', 'DIFFICULTY'], ['ENTER', 'SELECT'], ['ESC', 'BACK']]);
}
function drawSettings() {
  drawMenuBg(); uiHeader('SETTINGS', 'OPTIONS');
  drawMenuList(SETTINGS_MENU, subIdx, 74, 116, 33, ['◀ ' + DIFFS[difficulty].name + ' ▶', '◀ ' + QNAMES[gfx.quality] + (gfx.auto ? ' · AUTO' : '') + ' ▶', gfx.renderer.toUpperCase(),
    musicOn ? 'ON' : 'OFF', '◀ ' + (musicPick < 0 ? 'RANDOM' : TRACKS[musicPick].name.toUpperCase()) + ' ▶', voiceOn ? 'ON' : 'OFF', VC_NAMES[voiceChat], '', '', gfx.showFps ? 'ON' : 'OFF', ''], 0.74, { w: 420 });
  const help = SETTINGS_HELP[subIdx](); if (help) { const k = easeOut(clamp((screenT - 8) / 20, 0, 1)); ctx.save(); ctx.globalAlpha = k;
    uiPanel(W - 360, 116, 320, 96, { accent: UI.blue, glow: UI.blue }); capsText(SETTINGS_MENU[subIdx], W - 342, 136, 11, UI.blue, { weight: 800, track: 4 });
    ctx.font = '12.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.88)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(help, W - 342, 160, 286, 16); ctx.restore(); }
  uiPrompts([['↑ ↓', 'NAVIGATE'], ['← →', 'CHANGE'], ['ENTER', 'TOGGLE'], ['ESC', 'BACK']]);
}
// ----- key bindings -----
const KEY_ROWS = [['MOVE LEFT', 'left'], ['MOVE RIGHT', 'right'], ['JUMP', 'up'], ['BLOCK', 'down'], ['PUNCH', 'punch'], ['KICK', 'kick'], ['SKILL', 'skill'], ['SUPER / FINISHER', 'super'], ['STAGE ITEM', 'env'], ['GRAB / THROW', 'grab'], ['DASH', 'dashkey'],
  ['PUSH TO TALK', 'ptt'], ['DOUBLE-TAP DASH', 'dash'], ['RESET TO DEFAULTS', 'reset'], ['BACK', 'back']];
let keysRow = 0, keysCol = 0, keysListen = false;
function captureKey(code) {
  if (!keysListen || screen !== 'keys') return false;
  keysListen = false;
  if (code === 'Escape') return true;
  const act = KEY_ROWS[keysRow][1], map = act === 'ptt' ? EXTRA : keysCol ? MAP2 : MAP1;
  const old = map[act];
  for (const k in map) if (map[k] === code && k !== act) map[k] = old; // swap if already used
  map[act] = code; saveSettings(); sfx('confirm');
  return true;
}
function drawKeys() {
  drawMenuBg(); ctx.fillStyle = 'rgba(3,4,9,0.55)'; ctx.fillRect(0, 0, W, H);
  uiHeader('KEY BINDINGS', 'SETTINGS', { profile: false });
  const used = {}; for (const m of [MAP1, MAP2]) for (const k in m) used[m[k]] = (used[m[k]] || 0) + 1;
  uiPanel(150, 92, 660, 412, { alpha: 0.8 });
  capsText('PLAYER 1', 520, 110, 12, UI.p1, { align: 'center', weight: 800, track: 4 }); capsText('PLAYER 2', 720, 110, 12, UI.p2, { align: 'center', weight: 800, track: 4 });
  KEY_ROWS.forEach(([label, act], i) => {
    const y = 132 + i * 24.5, on = i === keysRow;
    if (on) { slant(164, y - 11, 632, 22, 6); const g = ctx.createLinearGradient(164, 0, 796, 0); g.addColorStop(0, 'rgba(62,166,255,0.35)'); g.addColorStop(1, 'rgba(62,166,255,0.05)'); ctx.fillStyle = g; ctx.fill(); ctx.fillStyle = UI.blue; ctx.fillRect(164, y - 11, 3, 22); }
    capsText(label, 182, y, 13, on ? '#fff' : 'rgba(214,224,240,0.7)', { weight: on ? 800 : 600, track: 2 });
    const cell = (x, code, col) => {
      const sel = on && keysCol === col && act !== 'dash' && act !== 'reset' && act !== 'back', listening = sel && keysListen;
      if (sel) { chamfer(x - 70, y - 11, 140, 22, 6); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.stroke(); }
      capsText(listening ? 'PRESS A KEY…' : keyName(code), x, y, 13, listening ? (frame % 30 < 15 ? '#ffd23f' : '#fff') : used[code] > 1 && act !== 'ptt' ? '#ff6b6b' : '#fff', { align: 'center', weight: 700, track: 1 });
    };
    if (MAP1[act] !== undefined) { cell(520, MAP1[act], 0); cell(720, MAP2[act], 1); }
    else if (act === 'ptt') cell(520, EXTRA.ptt, 0);
    else if (act === 'dash') capsText(dashTap ? 'ON' : 'OFF', 520, y, 13, '#fff', { align: 'center', weight: 700 });
  });
  uiPrompts([['↑ ↓', 'CHOOSE'], ['← →', 'PLAYER'], ['ENTER', 'REBIND'], ['ESC', 'BACK']], { left: 'Red = a key used twice' });
}
function drawCredits() {
  drawMenuBg(); uiHeader('CREDITS', 'BP VERSE');
  uiPanel(56, 120, 520, 250, { accent: UI.blue, glow: UI.blue });
  chromeText('BP VERSE · FIGHTER 1223', 76, 152, 24, { weight: 900, glow: 'rgba(62,166,255,0.4)' });
  const lines = ['Created by folahanduh and the BP crew', 'Fighters: ' + CHARS.map(c => c.short || c.name).join(' · '), 'Built with Claude Code', 'Music, sound and voices made live in your browser'];
  ctx.font = '14px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let y = 196; lines.forEach(t => { ctx.save(); wrap(t, 78, y, 480, 18); ctx.restore(); y += t.length > 60 ? 50 : 32; });
  uiPrompts([['ENTER', 'BACK'], ['ESC', 'BACK']]);
}
function drawControls() {
  drawMenuBg(); ctx.fillStyle = 'rgba(3,4,9,0.6)'; ctx.fillRect(0, 0, W, H);
  uiHeader('CONTROLS & COMBOS', 'SETTINGS', { profile: false });
  uiPanel(26, 92, 470, 412, { alpha: 0.82 }); uiPanel(506, 92, 428, 412, { alpha: 0.82, accent: '#ffd23f' });
  const k1 = a => keyName(MAP1[a]), k2 = a => keyName(MAP2[a]);
  const rows = [['', 'P1', 'P2', 'PAD'], ['Move', k1('left') + ' / ' + k1('right'), k2('left') + ' / ' + k2('right'), 'D-pad'], ['Dash', 'tap twice or ' + k1('dashkey'), 'tap twice or ' + k2('dashkey'), 'tap twice or LT'], ['Jump', k1('up'), k2('up'), 'Up'],
    ['Block', k1('down') + ' (hold)', k2('down') + ' (hold)', 'Down'], ['Punch', k1('punch'), k2('punch'), 'X / □'], ['Kick', k1('kick'), k2('kick'), 'A / ✕'], ['Skill (cooldown)', k1('skill'), k2('skill'), 'Y / △'], ['Super (full meter)', k1('super'), k2('super'), 'B / ○'], ['Stage item', k1('env'), k2('env'), 'LB / L1'], ['Grab / throw', k1('grab'), k2('grab'), 'RB / R1'], ['Parry', 'block on time', 'block on time', 'block on time']];
  rows.forEach((r, i) => {
    ctx.font = (i ? '' : 'bold ') + '14px ' + BODY; ctx.textBaseline = 'middle';
    const ry = 112 + i * 21.5; ctx.textAlign = 'left'; ctx.fillStyle = '#aaa'; ctx.fillText(r[0], 40, ry);
    ctx.textAlign = 'center';
    ctx.fillStyle = i ? '#fff' : '#3b8cff'; ctx.fillText(r[1], 220, ry);
    ctx.fillStyle = i ? '#fff' : '#ff2b2b'; ctx.fillText(r[2], 320, ry);
    ctx.fillStyle = i ? '#fff' : '#ffd23f'; ctx.fillText(r[3], 420, ry);
  });
  ctx.textAlign = 'left'; ctx.font = 'bold 14px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('MOVES (P1 keys)', 40, 384);
  ctx.font = '13px ' + BODY; ctx.fillStyle = '#ddd';
  ['↓+F uppercut · →+F body hook · ↓+G sweep · →+G roundhouse', 'Tiny D Ryan: →+F sword thrust', 'Two health bars: lose the gold one and you fight on in CRITICAL',
    'Stage item (' + k1('env') + '): next to a brick, bottle, speaker… smash it or throw it', 'FINISH HIM: at 0 health, get close and press ' + k1('super'), 'Grab (' + k1('grab') + ') beats blocking · press it right after being grabbed to escape', 'Parry: start blocking just before a punch or kick lands'].forEach((t, i) => ctx.fillText(t, 40, 402 + i * 15.5));
  ctx.font = 'bold 14px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('COMBOS (land each hit, then press the next)', 524, 112);
  const keyOf = m => { const [b, d] = COMBO_INPUT[m]; return (d === 'down' ? '↓' : d === 'fwd' ? '→' : '') + (b === 'punch' ? 'F' : 'G'); };
  COMBOS.forEach(([name, seq], i) => {
    ctx.font = 'bold 13px ' + BODY; ctx.fillStyle = '#fff'; ctx.fillText(name, 524, 140 + i * 26);
    ctx.font = '13px ' + BODY; ctx.fillStyle = '#ff8a8a'; ctx.fillText(seq.map(keyOf).join('  '), 770, 140 + i * 26);
  });
  uiPrompts([['ENTER', 'BACK'], ['ESC', 'BACK']]);
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
  if (use3D()) R3D.renderSelect(); else drawSelectBg();
  const gal = mode === 'gallery', slots = gal ? [0] : [0, 1];
  const label = s => mode === 'training' && s === 1 ? 'DUMMY' : mode === 'cpu' && s === 1 ? 'CPU' : gal ? 'VIEWING' : mode === 'online' ? (s === mySlot() ? 'YOU' : 'OPPONENT') : 'P' + (s + 1);
  const pcol = s => s ? UI.p2 : UI.p1, active = s => mode === 'online' || gal || s <= selCursor || selDone[s];
  uiBackdrop('#3ea6ff', { grid: 0.02 });
  let g = ctx.createLinearGradient(0, H - 250, 0, H); g.addColorStop(0, 'rgba(2,3,6,0)'); g.addColorStop(1, 'rgba(2,3,6,0.94)'); ctx.fillStyle = g; ctx.fillRect(0, H - 250, W, 250);
  const sub = { cpu: 'VS CPU · ' + DIFFS[difficulty].name, training: 'TRAINING', local: '2 PLAYERS', online: 'ONLINE MATCH', gallery: 'MEET THE ROSTER' }[mode] || '';
  uiHeader(gal ? 'CHARACTERS' : 'SELECT YOUR FIGHTER', sub, { profile: false });
  const ht = c => `${Math.floor(c.inches / 12)}'${c.inches % 12}"`, reachOf = c => { const r = (c.bat ? 0.42 : 0.33 * c.build.arm) * ((c.inches - 40) * 3.2 + 30); return r > 50 ? 'LONG' : r > 38 ? 'MID' : 'SHORT'; };
  // name plates: the player tag, the name in chrome, the title, the skin
  slots.forEach(s => {
    const c = CHARS[sel[s]], R = s === 1 && !gal, x = R ? W - 40 : 40, al = R ? 'right' : 'left', d = dummyFor(s), k = easeOut(clamp(((frame - (d.selT || 0)) / 14), 0, 1));
    if (d.selCi !== sel[s]) { d.selCi = sel[s]; d.selT = frame; }
    ctx.save(); ctx.globalAlpha = active(s) ? 1 : 0.4; ctx.translate((1 - k) * (R ? 30 : -30), 0);
    ctx.font = `800 11px ${DISP}`; tracked(4); const tw = ctx.measureText(label(s)).width + 26;
    slant(R ? x - tw : x, 254, tw, 20, 6); ctx.fillStyle = pcol(s); ctx.fill(); capsText(label(s), R ? x - 12 : x + 12, 264, 11, '#fff', { align: al, weight: 800, track: 4 });
    const sz = c.name.length > 16 ? 30 : c.name.length > 9 ? 38 : 46;
    chromeText(c.name.toUpperCase(), x, 298, sz, { align: al, weight: 900, glow: rgba(c.color, 0.45) });
    capsText(c.title.toUpperCase(), x + (R ? -2 : 2), 330, 12, c.color, { align: al, weight: 700, track: 6 });
    const sk = SKINS[c.id], skin = sk[selSkin[s]].name.toUpperCase();
    ctx.font = `700 12px ${DISP}`; tracked(3); const skw = ctx.measureText('◀  ' + skin + '  ▶').width + 26;
    chamfer(R ? x - skw : x, 344, skw, 24, 7); ctx.fillStyle = 'rgba(8,12,20,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,210,63,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    capsText('◀  ' + skin + '  ▶', R ? x - 13 : x + 13, 356, 12, '#ffd23f', { align: al, weight: 700, track: 3 });
    sk.forEach((_, q) => { const px = (R ? x - skw - 12 : x + skw + 10) + q * 9 * (R ? -1 : 1); hexPath(px, 356, 3.5); ctx.fillStyle = q === selSkin[s] ? '#ffd23f' : 'rgba(255,255,255,0.25)'; ctx.fill(); });
    if (selDone[s] && !gal) { // lock-in stamp
      const q = easeOut(Math.min(1, (frame - (d.lockT || 0)) / 12));
      ctx.save(); ctx.translate(R ? x - 120 : x + 120, 222); ctx.rotate(-0.06); ctx.scale(2 - q, 2 - q); ctx.globalAlpha = q;
      slant(-86, -17, 172, 34, 8); ctx.fillStyle = rgba(c.color, 0.25); ctx.fill(); ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.stroke();
      chromeText('LOCKED IN', 4, 1, 20, { align: 'center', weight: 900, track: 6, glow: c.color }); ctx.restore();
    }
    ctx.restore();
  });
  if (!gal) {
    // head-to-head: both fighters' numbers against each other
    const a = CHARS[sel[0]], b = CHARS[sel[1]], cx = W / 2, top = 96, dimR = !active(1);
    uiPanel(cx - 150, top, 300, 268, { alpha: 0.8 });
    ctx.fillStyle = pcol(0); ctx.fillRect(cx - 150, top + 12, 3, 244); ctx.fillStyle = active(1) ? pcol(1) : 'rgba(255,255,255,0.2)'; ctx.fillRect(cx + 147, top, 3, 256);
    const row = (y, l, r, mid) => { capsText(l, cx - 134, y, 11, '#fff', { weight: 700, track: 1 }); ctx.save(); ctx.globalAlpha = dimR ? 0.4 : 1; capsText(r, cx + 134, y, 11, '#fff', { align: 'right', weight: 700, track: 1 }); ctx.restore();
      capsText(mid, cx + 1, y, 9, 'rgba(214,224,240,0.55)', { align: 'center', weight: 700, track: 4 }); };
    row(top + 20, ht(a) + ' · ' + a.kg + 'KG', ht(b) + ' · ' + b.kg + 'KG', 'BUILD');
    row(top + 40, reachOf(a), reachOf(b), 'REACH');
    [['STR', 'str'], ['SPD', 'spd'], ['DUR', 'dur'], ['IQ', 'iq'], ['HAX', 'hax']].forEach(([lb, k2], i) => {
      const y = top + 66 + i * 22, va = a[k2], vb = b[k2];
      ctx.save(); ctx.translate(cx - 18, 0); ctx.scale(-1, 1); uiMeter(0, y - 4, 100, 8, Math.min(1, va / 120), a.color, { hi: '#ffffff', sk: 3 }); ctx.restore();
      ctx.save(); ctx.globalAlpha = dimR ? 0.35 : 1; uiMeter(cx + 20, y - 4, 100, 8, Math.min(1, vb / 120), b.color, { hi: '#ffffff', sk: 3 }); ctx.restore();
      capsText(lb, cx + 1, y, 9, 'rgba(230,236,246,0.85)', { align: 'center', weight: 800, track: 2 });
      capsText(String(va), cx - 124, y, 11, va >= vb ? '#fff' : 'rgba(255,255,255,0.5)', { align: 'right', weight: 800, track: 0 });
      ctx.save(); ctx.globalAlpha = dimR ? 0.4 : 1; capsText(String(vb), cx + 126, y, 11, vb >= va ? '#fff' : 'rgba(255,255,255,0.5)', { weight: 800, track: 0 }); ctx.restore();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx - 134, top + 180, 268, 1);
    const ab = (y, mid, la, lb2) => { capsText(mid, cx + 1, y - 9, 9, UI.blue, { align: 'center', weight: 800, track: 4 });
      ctx.font = '11px ' + BODY; tracked(0); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(la, cx - 134, y + 6); ctx.textAlign = 'right'; ctx.globalAlpha = dimR ? 0.4 : 1; ctx.fillText(lb2, cx + 134, y + 6); ctx.globalAlpha = 1; };
    ab(top + 202, 'SKILL', a.skill.name, b.skill.name); ab(top + 230, 'SUPER', a.super.name, b.super.name); ab(top + 256, 'FINISHER', a.fin.name, b.fin.name);
  } else {
    // gallery: one fighter and a full profile
    const c = CHARS[sel[0]], px = 520, py = 92, pw = 400;
    uiPanel(px, py, pw, 288, { accent: c.color, glow: c.color });
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'italic 13px ' + BODY; ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.fillText('“' + c.quote + '”', px + 20, py + 24);
    [['STR', c.str], ['SPD', c.spd], ['DUR', c.dur], ['IQ', c.iq], ['HAX', c.hax]].forEach(([k2, v], i) => { const y = py + 52 + i * 20;
      capsText(k2, px + 20, y, 10, 'rgba(230,225,236,0.75)', { weight: 800 }); uiMeter(px + 60, y - 4, 210, 8, Math.min(1, v / 120), c.color, { hi: '#ffffff', sk: 3 }); capsText(String(v), px + 284, y, 11, '#fff', { weight: 800, track: 0 }); });
    const abl = [['SKILL', c.skill], ['SUPER', c.super], ['FINISHER', { name: c.fin.name, desc: 'At 0 health they\'re dazed: get close and press SUPER.' }]];
    abl.forEach(([k2, a2], i) => { const y = py + 156 + i * 44; capsText(k2, px + 20, y, 9, UI.blue, { weight: 800, track: 4 });
      chromeText(a2.name.toUpperCase(), px + 18, y + 17, 15, { weight: 800, track: 2 }); ctx.font = '11px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(230,225,236,0.75)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(a2.desc, px + 20, y + 33, pw - 40, 12); });
    ctx.restore();
  }
  // the roster: slanted portrait tiles with chrome edges; the picks glow in their player's colour
  const n = CHARS.length, tw = 80, th = 84, gp = 8, sk = 10, x0 = W / 2 - (n * tw + (n - 1) * gp + sk) / 2, y0 = H - 140;
  CHARS.forEach((c, i) => {
    const x = x0 + i * (tw + gp), on = [0, 1].filter(s => slots.includes(s) && sel[s] === i && active(s)), lift = on.length ? 4 + Math.sin(frame / 8) * 2 : 0, y = y0 - lift;
    ctx.save();
    if (on.length) { slant(x, y, tw, th, sk); ctx.shadowColor = on.length > 1 ? '#ffd23f' : pcol(on[0]); ctx.shadowBlur = 18; ctx.fillStyle = '#05070c'; ctx.fill(); ctx.shadowColor = 'transparent'; }
    slant(x, y, tw, th, sk); ctx.save(); ctx.clip();
    const tg = ctx.createLinearGradient(0, y, 0, y + th); tg.addColorStop(0, rgba(c.color, on.length ? 0.7 : 0.25)); tg.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = tg; ctx.fillRect(x, y, tw + sk, th);
    drawFace(c, on.length ? selSkin[on[0]] : 0, x + tw / 2 + sk / 2, y + 38, 34, false);
    const ng = ctx.createLinearGradient(0, y + th - 30, 0, y + th); ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(1, 'rgba(0,0,0,0.95)'); ctx.fillStyle = ng; ctx.fillRect(x, y + th - 30, tw + sk, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x, y, tw + sk, th * 0.3);
    if (!on.length) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, tw + sk, th); }
    ctx.restore();
    capsText((c.short || c.name).toUpperCase(), x + tw / 2 + 1, y + th - 11, 9, '#fff', { align: 'center', weight: 800, track: 1 });
    slant(x, y, tw, th, sk); ctx.lineWidth = on.length ? 2.5 : 1.2; ctx.strokeStyle = on.length ? (on.length > 1 ? '#ffd23f' : pcol(on[0])) : chromeGrad(y, y + th); ctx.globalAlpha = on.length ? 1 : 0.45; ctx.stroke(); ctx.globalAlpha = 1;
    on.forEach((s2, q) => { const hw = on.length > 1 ? tw / 2 : tw; slant(x + q * (tw / 2) + sk * 0.8, y - 17, hw, 14, 4); ctx.fillStyle = pcol(s2); ctx.fill();
      capsText(label(s2), x + q * (tw / 2) + sk * 0.8 + hw / 2 + 2, y - 10, 9, '#fff', { align: 'center', weight: 800, track: 2 }); });
    ctx.restore();
  });
  const pr = gal ? [['A D', 'FIGHTER'], ['W S', 'SKIN'], ['ESC', 'BACK']] : mode === 'online' ? (selDone[mySlot()] ? [] : [['← →', 'FIGHTER'], ['↑ ↓', 'SKIN'], ['ENTER', 'LOCK IN']])
    : selCursor === 0 ? [['A D', 'FIGHTER'], ['W S', 'SKIN'], ['ENTER', 'LOCK IN'], ['ESC', 'BACK']] : mode === 'local' ? [['← →', 'FIGHTER'], ['↑ ↓', 'SKIN'], ['ENTER', 'LOCK IN'], ['ESC', 'BACK']] : [['A D', 'FIGHTER'], ['W S', 'SKIN'], ['ENTER', 'LOCK IN'], ['ESC', 'BACK']];
  const left = mode === 'online' && selDone[mySlot()] ? 'Waiting for your opponent to pick…' : !gal && selCursor === 1 && mode === 'cpu' ? 'Now pick the CPU fighter' : !gal && selCursor === 1 && mode === 'training' ? 'Now pick the training dummy' : !gal && selCursor === 1 && mode === 'local' ? 'Player 2, pick your fighter' : '';
  uiPrompts(pr, { left });
}
function wrap(t, x, y, mw, lh) {
  let line = '';
  for (const w of t.split(' ')) { const tst = line + w + ' '; if (ctx.measureText(tst).width > mw && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = tst; }
  ctx.fillText(line, x, y);
}

// stage select: a grid of every stage plus RANDOM, with a big preview of the highlighted one
const STAGE_DESC = { club: 'Neon dance floor under the BP / Verity sign.', garden: 'Fountains, hedges and loose bricks in the wall.', roof: 'Rain, a helicopter searchlight and a long drop.',
  verse: 'The BP VERSE skyline under a blood moon.', hall: 'Marble, columns and the great emblem of champions.', court: 'Sunset hoops, graffiti and the block watching.',
  subway: 'Platform 12. Mind the train.', alley: 'Neon, rain and steam between the towers.', gym: 'Heavy bags, iron and an old ring.', penthouse: 'Glass walls, gold and the whole city below.',
  junkyard: 'Car stacks, fire barrels and a crane magnet.', beach: 'The pier at sunset, ferris wheel on the horizon.', temple: 'Snow, red gates and lanterns high in the mountains.', garage: 'Concrete, flickering tubes and parked cars.' };
const previews = STAGES.map(() => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; return c; });
let stageRoll = null;
function renderPreviews() {
  // a couple of previews per frame (3D) so entering the screen never stalls; 2D ones are cheap
  if (use3D()) { let n = 0; STAGES.forEach((s, i) => { if (!previews[i].done && n < 2) { R3D.stagePreview(i, previews[i]); previews[i].done = true; n++; } }); return; }
  const saved = ctx, sc = { ...cam }, sid = stageId;
  cam.x = WW / 2; cam.z = 1; cam.kick = 0;
  STAGES.forEach((s, i) => { ctx = previews[i].getContext('2d'); ctx.save(); ctx.scale(previews[i].width / W, previews[i].height / H); stageId = i; drawWorldStage(); s.front(); ctx.restore(); previews[i].done = true; });
  ctx = saved; stageId = sid; Object.assign(cam, sc);
}
function drawStageSelect() {
  if (use3D() || screenT % 30 === 1) renderPreviews();
  if (stageRoll) { // RANDOM: the highlight hops around, slowing down, then lands
    stageRoll.t++; const gapF = 2 + Math.floor(stageRoll.t / 8);
    if (stageRoll.t % gapF === 0 && stageRoll.t < 56) { stageCursor = (stageCursor + 1 + (rand() * 4 | 0)) % STAGES.length; sfx('tick'); }
    if (stageRoll.t === 56) { stageCursor = stageRoll.pick; sfx('confirm'); }
    if (stageRoll.t >= 74) { stageId = stageRoll.pick; stageRoll = null; startMatch(); return; }
  }
  const n = STAGES.length, cur = Math.min(stageCursor, n), hero = cur < n ? previews[cur] : null;
  ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, W, H);
  if (hero && hero.done) { const z = 1.04 + 0.02 * Math.sin(frame / 120); ctx.save(); ctx.globalAlpha = 0.6; ctx.drawImage(hero, -W * (z - 1) / 2 - 20, -H * (z - 1) / 2 - 10, W * z + 40, H * z + 20); ctx.restore(); }
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(3,4,9,0.6)'); g.addColorStop(0.35, 'rgba(3,4,9,0.3)'); g.addColorStop(1, 'rgba(3,4,9,0.94)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  uiBackdrop('#3ea6ff', { grid: 0.02 });
  uiHeader(cur < n ? STAGES[cur].name : 'RANDOM', 'CHOOSE THE STAGE', { profile: false });
  ctx.save(); ctx.font = '14px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(235,240,248,0.88)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(cur < n ? STAGE_DESC[STAGES[cur].id] || '' : 'Let fate pick the battlefield.', 88, 106); ctx.restore();
  // the grid
  const cols = 5, tw = 150, th = 84, gp = 10, x0 = W / 2 - (cols * tw + (cols - 1) * gp) / 2, y0 = 168;
  for (let i = 0; i <= n; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (tw + gp), y = y0 + r * (th + gp + 14), on = i === cur;
    ctx.save();
    if (on) { chamfer(x, y, tw, th, 10); ctx.shadowColor = UI.blue; ctx.shadowBlur = 20; ctx.fillStyle = '#05070c'; ctx.fill(); ctx.shadowColor = 'transparent'; }
    chamfer(x, y, tw, th, 10); ctx.save(); ctx.clip();
    if (i < n) { ctx.fillStyle = '#0c0910'; ctx.fillRect(x, y, tw, th); if (previews[i].done) ctx.drawImage(previews[i], x, y, tw, th); if (!on) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y, tw, th); } }
    else { const rg = ctx.createLinearGradient(x, y, x + tw, y + th); rg.addColorStop(0, '#0e2440'); rg.addColorStop(1, '#05070c'); ctx.fillStyle = rg; ctx.fillRect(x, y, tw, th); chromeText('?', x + tw / 2, y + th / 2 + 2, 44, { align: 'center', weight: 900, glow: on ? UI.blue : null }); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, tw, th * 0.25); ctx.restore();
    chamfer(x, y, tw, th, 10); ctx.strokeStyle = on ? UI.blueHi : chromeGrad(y, y + th); ctx.globalAlpha = on ? 1 : 0.4; ctx.lineWidth = on ? 2.5 : 1.2; ctx.stroke(); ctx.globalAlpha = 1;
    capsText(i < n ? STAGES[i].name : 'RANDOM', x + 4, y + th + 9, 10, on ? UI.blueHi : 'rgba(225,232,244,0.65)', { weight: 800, track: 2 });
    ctx.restore();
  }
  uiPrompts(net.role === 'guest' || stageRoll ? [] : [['← → ↑ ↓', 'CHOOSE'], ['ENTER', 'FIGHT'], ['ESC', 'BACK']], { left: net.role === 'guest' ? 'Your opponent is choosing the stage…' : stageRoll ? 'Rolling…' : '' });
}

function drawVs() {
  const t = 1 - vsT / 130, [a, b] = P;
  if (use3D()) R3D.renderSelect(true);
  else { ctx.fillStyle = '#050308'; ctx.fillRect(0, 0, W, H); drawPortrait(a.c, 230, 230, 120, false, a.skin); drawPortrait(b.c, W - 230, 230, 120, true, b.skin); }
  // two streaks of colour slicing in from either side, meeting at the emblem
  const s = easeOut(clamp(t * 2.5, 0, 1));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [[a, -1], [b, 1]].forEach(([f, sd]) => { const x0 = W / 2 + sd * (W / 2 + 40) * (1 - s);
    const g = ctx.createLinearGradient(W / 2, 0, W / 2 + sd * W * 0.6, 0); g.addColorStop(0, rgba(f.c.color, 0.0)); g.addColorStop(0.15, rgba(f.c.color, 0.35)); g.addColorStop(1, rgba(f.c.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + sd * 10, 360); ctx.lineTo(x0 + sd * W, 330); ctx.lineTo(x0 + sd * W, 400); ctx.lineTo(x0 - sd * 30, 430); ctx.closePath(); ctx.fill(); });
  ctx.restore();
  uiBackdrop('#3ea6ff', { grid: 0.02 });
  const g = ctx.createLinearGradient(0, H * 0.5, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
  vignette(0.7);
  ctx.save(); ctx.globalAlpha = s;
  [[a, 52, 'left'], [b, W - 52, 'right']].forEach(([f, x, al], i) => {
    const off = (1 - s) * 60 * (i ? 1 : -1), tag = f.ai ? 'CPU' : mode === 'online' ? (f.side === mySlot() ? 'YOU' : 'OPPONENT') : 'PLAYER ' + (f.side + 1);
    ctx.font = `800 11px ${DISP}`; tracked(4); const tw = ctx.measureText(tag).width + 26;
    slant(i ? x - tw + off : x + off, 384, tw, 20, 6); ctx.fillStyle = i ? UI.p2 : UI.p1; ctx.fill(); capsText(tag, (i ? x - 12 : x + 12) + off, 394, 11, '#fff', { align: al, weight: 800, track: 4 });
    chromeText(f.c.name.toUpperCase(), x + off, 432, f.c.name.length > 14 ? 32 : 42, { align: al, weight: 900, glow: rgba(f.c.color, 0.5) });
    capsText(f.c.title.toUpperCase(), x + off + (i ? -2 : 2), 464, 12, f.c.color, { align: al, weight: 700, track: 6 });
  });
  // the VS emblem: a chrome hex, electric blue
  const es = t < 0.25 ? 2.4 - 1.4 * easeOut(t / 0.25) : 1, ey = 418;
  ctx.save(); ctx.translate(W / 2, ey); ctx.scale(es, es);
  hexPath(0, 0, 46); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
  hexPath(0, 0, 42); ctx.fillStyle = chromeGrad(-42, 42); ctx.fill();
  hexPath(0, 0, 37); const eg = ctx.createRadialGradient(0, -10, 4, 0, 0, 40); eg.addColorStop(0, '#1d4f8a'); eg.addColorStop(1, '#04070e'); ctx.fillStyle = eg; ctx.fill();
  for (let k = 0; k < 3; k++) { const an = frame * 0.05 + k * 2.1; ctx.strokeStyle = `rgba(120,200,255,${0.5 + 0.5 * Math.sin(frame / 3 + k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); let px = Math.cos(an) * 38, py = Math.sin(an) * 38; ctx.moveTo(px, py); for (let q = 0; q < 5; q++) { px *= 0.72; py *= 0.72; ctx.lineTo(px + (rand() - 0.5) * 10, py + (rand() - 0.5) * 10); } ctx.stroke(); } // sparks of electricity
  chromeText('VS', 0, 2, 38, { align: 'center', weight: 900, track: 0, glow: '#3ea6ff' });
  ctx.restore();
  ctx.save(); ctx.font = `700 11px ${DISP}`; tracked(5); const sw = ctx.measureText(STAGES[stageId].name.toUpperCase()).width + 40; ctx.restore(); tracked(0);
  uiPanel(W / 2 - sw / 2, 478, sw, 26, { cut: 8, alpha: 0.8 }); capsText(STAGES[stageId].name.toUpperCase(), W / 2 + 2, 491, 11, 'rgba(225,232,244,0.85)', { align: 'center', weight: 700, track: 5 });
  ctx.restore();
  loadingEmblem(W - 64, 52, 'LOADING');
  if (vsT < 26) { ctx.fillStyle = `rgba(0,0,0,${1 - vsT / 26})`; ctx.fillRect(0, 0, W, H); }
}

function drawLobby() {
  drawMenuBg(); ctx.fillStyle = 'rgba(3,4,9,0.55)'; ctx.fillRect(0, 0, W, H);
  uiHeader(screen === 'join' ? 'JOIN A ROOM' : net.mm ? 'MATCHMAKING' : 'ONLINE', 'ONLINE', { profile: !!net.mm });
  uiPanel(W / 2 - 300, 120, 600, 330, { accent: UI.blue, accentTop: 1, alpha: 0.82, glow: UI.blue });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (screen === 'join') {
    ctx.font = '18px ' + BODY; ctx.fillStyle = '#ccc'; ctx.fillText('Type the 4-character room code your friend sent you', W / 2, 170);
    for (let i = 0; i < 4; i++) {
      const x = W / 2 - 150 + i * 80; chamfer(x, 210, 60, 80, 10); ctx.fillStyle = 'rgba(5,8,14,0.9)'; ctx.fill();
      chamfer(x, 210, 60, 80, 10); ctx.strokeStyle = i === joinCode.length ? (frame % 40 < 24 ? UI.blueHi : UI.blue) : chromeGrad(210, 290); ctx.lineWidth = i === joinCode.length ? 3 : 1.5; ctx.stroke();
      if (joinCode[i]) chromeText(joinCode[i], x + 30, 252, 46, { align: 'center', weight: 900, track: 0, glow: 'rgba(62,166,255,0.5)' });
    }
    ctx.font = '15px ' + BODY; ctx.fillStyle = '#8a8094'; ctx.fillText('Enter to join · Backspace to delete · Esc to go back', W / 2, 340);
  } else if (net.mm) {
    const M = net.mm, ranked = M ? M.ranked : net.ranked, sec = M ? Math.floor((Date.now() - M.t0) / 1000) : 0, T = tierOf(rank.r);
    ctx.font = `700 34px ${HEAD}`; tracked(6); ctx.fillStyle = ranked ? T[2] : '#ffffff'; ctx.fillText(ranked ? 'RANKED' : 'QUICK MATCH', W / 2, 150); tracked(0);
    if (ranked) { ctx.font = `600 15px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText(rankLabel(rank.r) + ' RP   ·   ' + rank.w + 'W ' + rank.l + 'L', W / 2, 186); tracked(0); }
    const a0 = frame / 12; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, 270, 34, 0, 7); ctx.stroke();
    ctx.strokeStyle = ranked ? T[2] : '#e01b2b'; ctx.beginPath(); ctx.arc(W / 2, 270, 34, a0, a0 + 1.7); ctx.stroke();
    ctx.font = `600 16px ${HEAD}`; tracked(2); ctx.fillStyle = '#fff'; ctx.fillText(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), W / 2, 271); tracked(0);
    ctx.font = '18px ' + BODY; ctx.fillStyle = '#fff'; ctx.fillText(net.status + '.'.repeat(frame / 20 % 4 | 0), W / 2, 348);
    ctx.font = '13px ' + BODY; ctx.fillStyle = '#8a8094';
    ctx.fillText(sec > 40 ? 'Not many players searching right now. Keep waiting, or send a friend a room code (ONLINE · HOST).' : ranked && sec > 25 ? 'Widening the search to every rank.' : 'You will be matched with whoever else is searching.', W / 2, 384);
    ctx.fillText('Esc to cancel', W / 2, 420);
  } else {
    if (net.role === 'host') {
      ctx.font = '18px ' + BODY; ctx.fillStyle = '#ccc'; ctx.fillText('Send this room code to your friend:', W / 2, 170);
      bigText(net.code, 240, 90, '#ffd23f', '#b3001b');
      ctx.font = '14px ' + BODY; ctx.fillStyle = '#8a8094';
      ctx.fillText('They open the game, choose ONLINE · JOIN and type the code.', W / 2, 300);
    }
    ctx.font = '18px ' + BODY; ctx.fillStyle = '#fff'; ctx.fillText(net.status + '.'.repeat(frame / 20 % 4 | 0), W / 2, 360);
    ctx.font = '14px ' + BODY; ctx.fillStyle = '#8a8094'; ctx.fillText('Esc to cancel', W / 2, 420);
  }
}

let fps2d = 60, fpsT2 = 0, fpsN2 = 0;
// Arkham-style loading: a dark, slow-moving backdrop, a tip, and a small spinning emblem in the corner
const TIPS = ['Land a hit, then press the next button to chain a named combo.', 'F, then ↓G is the CROSS SWEEP.', 'Tall fighters reach further, but their punches can sail over short ones.',
  'Lose your gold bar and you go down. Get up and fight on in CRITICAL.', 'Training mode shows hitboxes, damage and your input history.', 'Rebind every key in Settings → Key Bindings.', 'Double-tap a direction, or press E (P for player 2), to dash. Punch or kick out of a dash for a dash attack.',
  'Your skill recharges on a timer: watch the small circle. A full super circle unleashes your super move.', 'Heavyweights shrug off jabs. Open them up with heavy hits.'];
function loadingEmblem(x, y, label, p) {
  ctx.save(); ctx.translate(x, y);
  hexPath(0, 0, 18); ctx.fillStyle = 'rgba(5,8,14,0.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = chromeGrad(-18, 18); ctx.stroke();
  const a = frame / 9; ctx.strokeStyle = UI.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 23, a, a + 1.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 23, -a * 0.7 + 3, -a * 0.7 + 3.9); ctx.stroke();
  capsText('BP', 0, 1, 10, '#fff', { align: 'center', weight: 800, track: 0 });
  capsText(label, -36, p == null ? 0 : -6, 11, 'rgba(230,236,246,0.88)', { align: 'right', weight: 700, track: 4 });
  if (p != null) capsText(Math.round(p * 100) + '%', -36, 9, 10, 'rgba(230,236,246,0.5)', { align: 'right', weight: 600, track: 1 });
  ctx.restore();
}
function tipText(i) {
  uiPanel(36, H - 104, 520, 56, { accent: UI.blue, alpha: 0.78 });
  capsText('TIP', 54, H - 86, 10, UI.blue, { weight: 800, track: 5 });
  ctx.save(); ctx.font = '13.5px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(232,238,248,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(TIPS[i % TIPS.length], 54, H - 66); ctx.restore();
}
// loading: a character card that changes with the tip: a duotone portrait in the fighter's colour, their name and a line
const CARD = { cv: null };
function loadCard(v, i, a) {
  const c = CHARS.find(c => c.id === v.id), f = vibeFighter(v), x0 = W * 0.52;
  if (!CARD.cv) { CARD.cv = document.createElement('canvas'); CARD.cv.width = 460; CARD.cv.height = H; }
  if (CARD.id !== v.id || (!CARD.photo && ready(c.img))) { // drawn once per fighter (with its glow), not every frame
    CARD.id = v.id; CARD.photo = ready(c.img);
    const t = document.createElement('canvas'); t.width = 420; t.height = H;
    const b = t.getContext('2d'), keep = ctx;
    const sc = 3.4 * 175 / Math.max(120, f.h * f.scale); // every fighter fills the card, cropped at the waist
    ctx = b; f.facing = -1; drawFighterAt(f, 240, H + f.h * f.scale * sc * 0.42, sc);
    b.globalCompositeOperation = 'source-atop';
    const tg = b.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, rgba(v.col, 0.55)); tg.addColorStop(1, 'rgba(0,0,0,0.7)'); b.fillStyle = tg; b.fillRect(0, 0, 420, H);
    ctx = keep;
    const o = CARD.cv.getContext('2d'); o.clearRect(0, 0, 460, H); o.shadowColor = v.col; o.shadowBlur = 30; o.drawImage(t, 20, 0); o.shadowBlur = 0;
  }
  ctx.save(); ctx.globalAlpha = a;
  const pg = ctx.createLinearGradient(x0, 0, W, 0); pg.addColorStop(0, rgba(v.col, 0)); pg.addColorStop(1, rgba(v.col, 0.22)); ctx.fillStyle = pg; ctx.fillRect(x0, 0, W - x0, H);
  ctx.strokeStyle = rgba(v.col, 0.12); ctx.lineWidth = 18; for (let k = 0; k < 7; k++) { const sx = x0 + 60 + k * 70 + (screenT * 0.3) % 70; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx - 180, H); ctx.stroke(); }
  ctx.drawImage(CARD.cv, W - 440 + (1 - a) * 30, 0);
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 12px ${HEAD}`; tracked(7); ctx.fillStyle = v.col; ctx.fillText(c.title.toUpperCase(), W - 44, 92);
  ctx.font = `700 40px ${TITLE}`; tracked(4); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16; ctx.fillText(c.name.toUpperCase(), W - 40, 134);
  const L = INTRO_LINES[v.id] || [c.lines.intro];
  ctx.font = 'italic 16px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(240,236,244,0.9)'; ctx.fillText('“' + L[i % L.length] + '”', W - 44, 162);
  ctx.restore(); tracked(0);
}
function drawLoading() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fin = clamp(screenT / 50, 0, 1);
  if (ready(VERSE_IMG)) {
    if (!CARD.back) { // the greyed backdrop is filtered once, not every frame
      const cb = CARD.back = document.createElement('canvas'); cb.width = W; cb.height = H; const g = cb.getContext('2d');
      if ('filter' in g) g.filter = 'grayscale(0.6) brightness(0.8)'; g.drawImage(VERSE_IMG, 0, 0, W, H);
    }
    const z = 1.08 + screenT * 0.00025, w = W * z, h = H * z;
    ctx.save(); ctx.globalAlpha = 0.3 * fin; ctx.drawImage(CARD.back, W / 2 - w / 2 - screenT * 0.03, H / 2 - h / 2, w, h); ctx.restore();
  }
  vignette(0.96);
  const ci = Math.floor(screenT / 260), ck = screenT % 260, v = VIBES[(ci + vibeIdx()) % VIBES.length];
  loadCard(v, ci, fin * clamp(Math.min(ck, 260 - ck) / 22, 0, 1));
  wordmark(W * 0.3, 260, 0.62, fin * 0.9);
  LOAD.shown = lerp(LOAD.shown || 0, LOAD.p || 0, 0.12);
  tipText(ci);
  loadingEmblem(W - 64, H - 56, (LOAD.msg || 'LOADING').toUpperCase(), LOAD.shown);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, H - 3, W, 3); const lg = ctx.createLinearGradient(0, 0, W * LOAD.shown, 0); lg.addColorStop(0, '#1f6fe0'); lg.addColorStop(1, '#bfe4ff'); ctx.fillStyle = lg; ctx.fillRect(0, H - 3, W * LOAD.shown, 3);
  uiBackdrop('#3ea6ff', { grid: 0.02 });
  if (!LOAD.started && screenT > 600) { LOAD.done = true; LOAD.error = 'no module'; }
}
// ---------- updates: a newer build was published while this one was open ----------
const BUILD = { id: null, ready: null, box: null };
function checkUpdate() {
  if (location.protocol === 'file:') return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
    if (!v || !v.build) return;
    if (BUILD.id === null) BUILD.id = v.build; else if (v.build !== BUILD.id && !BUILD.ready) { BUILD.ready = v; sfx('ready'); }
  }).catch(() => {});
}
checkUpdate(); setInterval(checkUpdate, 45000);
const updateTabOn = () => BUILD.ready && screen !== 'loading' && !(screen === 'fight' && !matchOver && !paused);
function drawUpdateTab() {
  if (!updateTabOn()) { BUILD.box = null; return; }
  const w = 252, h = 46, x = W - w - 14, y = 14, pulse = 0.5 + 0.5 * Math.sin(frame / 14);
  ctx.save(); uiPanel(x, y, w, h, { accent: `rgba(62,166,255,${0.75 + 0.25 * pulse})`, alpha: 0.95, glow: UI.blue });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `600 13px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText('UPDATE READY', x + 16, y + 15);
  ctx.font = `500 11px ${HEAD}`; tracked(2); ctx.fillStyle = 'rgba(235,230,242,0.8)'; ctx.fillText('PRESS R OR CLICK TO RESTART', x + 16, y + 32);
  ctx.restore(); tracked(0); BUILD.box = [x, y, w, h];
}
function restartForUpdate() { try { saveSettings(); } catch (e) {} location.reload(); }
cv.addEventListener('pointerdown', e => {
  if (!BUILD.box) return; const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height, [x, y, w, h] = BUILD.box;
  if (mx >= x && mx <= x + w && my >= y && my <= y + h) restartForUpdate();
});
function draw() {
  if (window.R3D && R3D.tickJobs && (MENU_SCREENS.includes(screen) || screen === 'select')) R3D.tickJobs(); // background prep, never mid-fight
  if (window.R3D && R3D.ready && !(use3D() && (screen === 'fight' || screen === 'select' || screen === 'vs' || MENU_SCREENS.includes(screen)))) R3D.show(false);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (screen === 'loading') drawLoading();
  if (shake > 0) ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
  if (screen === 'title') drawTitle();
  else if (screen === 'mode') drawMenu();
  else if (screen === 'play') drawPlayMenu();
  else if (screen === 'settings') drawSettings();
  else if (screen === 'credits') drawCredits();
  else if (screen === 'controls') drawControls();
  else if (screen === 'keys') drawKeys();
  else if (screen === 'select') drawSelect();
  else if (screen === 'stage') drawStageSelect();
  else if (screen === 'lobby' || screen === 'join') drawLobby();
  else if (screen === 'vs' && P.length) drawVs();
  else if (screen === 'fight' && P.length) drawFight();
  ctx.restore();
  // fade in from black after every screen change (slower into the title and the fight)
  if (wipe > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.pow(wipe / wipeMax, 1.4)})`; ctx.fillRect(0, 0, W, H); }
  if (screen === 'loading' && LOAD.outT) { ctx.fillStyle = `rgba(0,0,0,${clamp(LOAD.outT / 18, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  fpsN2++; if (performance.now() - fpsT2 > 1000) { fps2d = fpsN2; fpsN2 = 0; fpsT2 = performance.now(); }
  if (gfx.showFps) { ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#3ddc5a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('FPS ' + fps2d + (use3D() ? ' · 3D ' + R3D.qualityName() : ' · 2D'), 6, 4); }
  drawUpdateTab();
  if (toast) {
    uiPanel(W / 2 - 270, H - 98, 540, 40, { accent: '#ffd23f', alpha: 0.92 });
    ctx.fillStyle = '#ffe9a0'; ctx.font = '600 15px ' + BODY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(toast.msg, W / 2, H - 78);
  }
}

// ----- key presses -----
const isLeft = c => c === 'KeyA' || c === 'ArrowLeft', isRight = c => c === 'KeyD' || c === 'ArrowRight';
const isUp = c => c === 'KeyW' || c === 'ArrowUp', isDown = c => c === 'KeyS' || c === 'ArrowDown';
const isOk = c => c === 'Enter' || c === 'Space' || c === 'NumpadEnter';
function toMenu() { if (net.role || net.mm) { send({ t: 'bye' }); netReset(); } demo = false; paused = false; setScreen('mode'); }

function onPress(code, key) {
  if (code === 'KeyR' && updateTabOn()) { restartForUpdate(); return; }
  const live = screen === 'fight' && !matchOver && !paused;
  if (screen !== 'join' && !live) {
    if (code === 'KeyM') { musicOn = !musicOn; saveSettings(); return; }
    if (code === 'KeyV') { voiceOn = !voiceOn; if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel(); saveSettings(); return; }
  }
  if (screen === 'fight' && !matchOver && net.role && isOk(code) && introT > 127 && introLong()) { if (net.role === 'host') skipIntro(); else send({ t: 'skip' }); return; }
  if (screen === 'fight' && !matchOver && !net.role) {
    if (mode === 'training' && !paused) {
      if (code === 'Digit1') training.dummy = (training.dummy + 1) % DUMMY_MODES.length;
      if (code === 'Digit2') training.refill = !training.refill;
      if (code === 'Digit3') training.meter = !training.meter;
      if (code === 'Digit4') training.hitboxes = !training.hitboxes;
      if (code === 'Digit5') training.inputs = !training.inputs;
      if (code === 'Digit0') trainingReset();
      if (code === 'Digit1' && P[1]) P[1].ai = newAI();
    }
    if (!paused && isOk(code) && introT > 127 && introLong()) { skipIntro(); return; } // SPACE / ENTER: either player skips the intro
    if (code === 'Escape' || (paused && isOk(code))) { paused = !paused; return; }
    if (paused && code === 'KeyQ') { toMenu(); return; }
    return;
  }
  if (code === 'Escape') {
    if (screen === 'title') return;
    sfx('back');
    if (screen === 'controls' || screen === 'keys') { setScreen('settings'); return; }
    if (['play', 'settings', 'credits'].includes(screen) || (screen === 'select' && mode === 'gallery')) { if (mode === 'gallery') mode = 'cpu'; setScreen('mode'); return; }
    toMenu(); return;
  }
  const nav = (len, cur) => isUp(code) ? (cur + len - 1) % len : isDown(code) ? (cur + 1) % len : cur;
  if (screen === 'title') { if (isOk(code)) { setScreen('mode'); sfx('confirm'); }
    else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') { // flick through the vibes
      const n = VIBES.length, i = (vibeIdx() + (code === 'ArrowLeft' || code === 'KeyA' ? n - 1 : 1)) % n; menuT = (Math.floor(menuT / (VIBE_LEN * n)) * n + i) * VIBE_LEN + 25; sfx('tick'); } }
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
    if (subIdx === PLAY['VS CPU'] && (isLeft(code) || isRight(code))) { difficulty = (difficulty + (isRight(code) ? 1 : 3)) % 4; saveSettings(); sfx('toggle'); }
    if (isOk(code)) {
      const it = PLAY_MENU[subIdx][0];
      if (it === 'STORY MODE') { sfx('back'); toast = { msg: 'STORY MODE is coming soon', t: 200 }; return; }
      sfx('confirm');
      if (it === 'VS CPU') { mode = 'cpu'; goSelect(); } else if (it === 'TRAINING') { mode = 'training'; goSelect(); } else if (it === '2 PLAYERS') { mode = 'local'; goSelect(); }
      else if (it === 'RANKED') findMatch(true); else if (it === 'QUICK MATCH') findMatch(false);
      else if (it === 'ONLINE · HOST') hostRoom(); else if (it === 'ONLINE · JOIN') { setScreen('join'); joinCode = ''; } else setScreen('mode');
    }
  }
  else if (screen === 'settings') {
    const n = nav(SETTINGS_MENU.length, subIdx); if (n !== subIdx) { subIdx = n; sfx('select'); }
    const lr = isLeft(code) ? -1 : isRight(code) ? 1 : 0, ok = isOk(code);
    const item = SETTINGS_MENU[subIdx];
    if (item === 'DIFFICULTY' && (lr || ok)) difficulty = (difficulty + (lr || 1) + 4) % 4;
    if (item === 'GRAPHICS') { if (lr) { gfx.quality = clamp(gfx.quality + lr, 0, 3); if (window.R3D) R3D.setQuality(gfx.quality); } else if (ok) gfx.auto = !gfx.auto; }
    if (item === 'RENDERER' && (lr || ok)) {
      gfx.renderer = gfx.renderer === '3d' ? '2d' : '3d';
      if (gfx.renderer === '3d' && !(window.R3D && R3D.ready)) toast = { msg: 'Reload the page to start the 3D renderer', t: 240 };
    }
    if (item === 'MUSIC' && (lr || ok)) musicOn = !musicOn;
    if (item === 'SOUNDTRACK' && (lr || ok)) musicPick = ((musicPick + 1 + (lr || 1) + 11) % 11) - 1;
    if (item === 'VOICES' && (lr || ok)) { voiceOn = !voiceOn; if (voiceOn) speak('announcer', 'Voices on'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    if (item === 'VOICE CHAT' && (lr || ok)) { const o = ['off', 'ptt', 'open']; voiceChat = o[(o.indexOf(voiceChat) + (lr || 1) + 3) % 3]; }
    if (item === 'KEY BINDINGS' && ok) { setScreen('keys'); keysRow = 0; keysCol = 0; keysListen = false; }
    if (item === 'CONTROLS & COMBOS' && ok) setScreen('controls');
    if (item === 'SHOW FPS' && (lr || ok)) gfx.showFps = !gfx.showFps;
    if (item === 'BACK' && ok) setScreen('mode');
    if (lr || ok) { saveSettings(); sfx(ok && ['KEY BINDINGS', 'CONTROLS & COMBOS', 'BACK'].includes(item) ? 'confirm' : 'toggle'); }
  }
  else if (screen === 'keys') {
    const n = nav(KEY_ROWS.length, keysRow); if (n !== keysRow) { keysRow = n; sfx('select'); }
    if (isLeft(code) || isRight(code)) { keysCol = isRight(code) ? 1 : 0; sfx('select'); }
    if (isOk(code)) {
      const act = KEY_ROWS[keysRow][1];
      if (act === 'back') setScreen('settings');
      else if (act === 'reset') { Object.assign(MAP1, DEFAULT_KEYS.p1); Object.assign(MAP2, DEFAULT_KEYS.p2); Object.assign(EXTRA, DEFAULT_KEYS.extra); dashTap = true; saveSettings(); toast = { msg: 'Keys reset to defaults', t: 120 }; }
      else if (act === 'dash') { dashTap = !dashTap; saveSettings(); }
      else { if (act === 'ptt') keysCol = 0; keysListen = true; }
      sfx('confirm');
    }
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
    if (keysOk && isLeft(code)) { sel[slot] = (sel[slot] + CHARS.length - 1) % CHARS.length; selSkin[slot] = 0; sfx('select'); tell(false); }
    if (keysOk && isRight(code)) { sel[slot] = (sel[slot] + 1) % CHARS.length; selSkin[slot] = 0; sfx('select'); tell(false); }
    if (mode === 'gallery') return;
    if (isOk(code) || (slot === 0 && code === 'KeyF') || (slot === 1 && code === 'KeyK')) {
      selDone[slot] = true; sfx('lock'); const dd = dummyFor(slot); dd.lockT = frame; dd.flash = 8; say(CHARS[sel[slot]].id, CHARS[sel[slot]].lines.intro);
      if (mode === 'online') {
        tell(true);
        if (net.role === 'host' && selDone[0] && selDone[1]) { setScreen('stage'); send({ t: 'stage' }); }
        return;
      }
      if (slot === 0) selCursor = 1; else { stageCursor = stageId; setScreen('stage'); }
    }
  }
  else if (screen === 'stage') {
    if (net.role === 'guest' || stageRoll) return;
    const N = STAGES.length + 1; // the last slot is RANDOM
    const mv = isLeft(code) ? -1 : isRight(code) ? 1 : isUp(code) ? -5 : isDown(code) ? 5 : 0;
    if (mv) { stageCursor = clamp(stageCursor + mv, 0, N - 1); sfx('select'); if (net.role === 'host') send({ t: 'stagecur', i: stageCursor }); }
    if (isOk(code)) { sfx('lock'); if (stageCursor >= STAGES.length) stageRoll = { t: 0, pick: rand() * STAGES.length | 0 }; else { stageId = stageCursor; startMatch(); } }
  }
  else if (screen === 'fight' && matchOver) {
    if (mode === 'online' && net.ranked) { if (isOk(code)) findMatch(true); } // ranked: no rematches, back into the queue
    else if (net.role === 'guest') { if (isOk(code)) { send({ t: 'rematch' }); toast = { msg: 'Rematch requested...', t: 120 }; } }
    else if (isOk(code)) startMatch();
    else if (code === 'KeyC') { goSelect(); if (net.role === 'host') send({ t: 'select' }); }
  }
}

loadSettings(); settleAbandoned(); // a ranked fight left unfinished last time counts as a loss
// ---------- main loop ----------
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
