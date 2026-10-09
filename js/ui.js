// clean UI type: Oswald for headings and the HUD, Inter for text, Cinzel for the title wordmark
const HEAD = '"Oswald", "Arial Narrow", Arial, sans-serif', BODY = '"Inter", "Segoe UI", system-ui, sans-serif', TITLE = '"Cinzel", "Trajan Pro", Georgia, serif';
function tracked(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
// ---------- HUD, screens, menus, main loop ----------
function bigText(t, y, size, col, stroke, x) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px ${HEAD}`; tracked(Math.round(size * 0.05));
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = size / 4; ctx.shadowOffsetY = size / 24;
  ctx.lineWidth = Math.max(2, size / 18); ctx.strokeStyle = stroke || 'rgba(0,0,0,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(t, x || W / 2, y);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = col || '#fff'; ctx.fillText(t, x || W / 2, y);
  ctx.restore();
}
function quad(pts, R) { ctx.beginPath(); pts.forEach(([x, y], i) => { const X = R ? W - x : x; if (i) ctx.lineTo(X, y); else ctx.moveTo(X, y); }); ctx.closePath(); }
const barPts = (x, y, w, h, sk) => [[x + sk, y], [x + w + sk, y], [x + w, y + h], [x, y + h]];
function vignette(a, col) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ----- Injustice-style HUD -----
// health: a long thin bar that tapers toward the timer. Two lives: silver over red, then the red one alone.
// Damage leaves a yellow chunk that drains away. Bottom corners: portrait, the super circle (the meter, in four
// quarters) and the small skill circle (its cooldown, with the seconds left).
const HB = { x0: 26, x1: W / 2 - 46, t0: 16, b0: 31, t1: 26, b1: 35 };
function hbPath(q0, q1, R, grow) {
  const g = grow || 0, X = q => lerp(HB.x0, HB.x1, q), T = q => lerp(HB.t0, HB.t1, q) - g, B = q => lerp(HB.b0, HB.b1, q) + g, cut = q1 >= 0.999 ? 7 : 0;
  quad([[X(q0) - g, T(q0)], [X(q1) + g, T(q1)], [X(q1) - cut + g, B(q1)], [X(q0) - g, B(q0)]], R);
}
function drawSideHUD(f, R) {
  const c = f.c, half = f.maxHp / 2;
  const seg = clamp(f.bar === 0 ? (f.hp - half) / half : f.hp / half, 0, 1);
  const dseg = clamp(f.bar === 0 ? (f.dispHp - half) / half : Math.min(f.dispHp, half) / half, 0, 1);
  const refill = f.bar === 1 && f.barAnim > 0 ? 1 - f.barAnim / 70 : 1;
  ctx.save();
  hbPath(0, 1, R, 3); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
  hbPath(0, 1, R); ctx.fillStyle = 'rgba(20,10,16,0.92)'; ctx.fill();
  const red = (a) => { const g = ctx.createLinearGradient(0, HB.t0, 0, HB.b1); g.addColorStop(0, `rgba(255,96,96,${a})`); g.addColorStop(0.5, `rgba(214,20,40,${a})`); g.addColorStop(1, `rgba(120,0,16,${a})`); return g; };
  if (f.bar === 0) { hbPath(0, 1, R); ctx.fillStyle = red(1); ctx.fill(); } // the second life waiting underneath
  if (dseg * refill > seg * refill + 0.002) { hbPath(seg * refill, dseg * refill, R); ctx.fillStyle = '#ffd21f'; ctx.fill(); }
  if (seg * refill > 0.002) {
    hbPath(0, seg * refill, R);
    if (f.bar === 0) { const g = ctx.createLinearGradient(0, HB.t0, 0, HB.b1); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#d9dde6'); g.addColorStop(1, '#8e95a6'); ctx.fillStyle = g; }
    else { const pu = 0.75 + 0.25 * Math.sin(frame / 5); ctx.fillStyle = red(pu); }
    ctx.fill();
    ctx.save(); hbPath(0, seg * refill, R); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, W, HB.t0 + 4); ctx.restore();
  }
  hbPath(0, 1, R); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  // name over the inner end, in clean caps; CRITICAL under it on the last life
  ctx.textBaseline = 'middle'; ctx.textAlign = R ? 'left' : 'right'; ctx.font = `500 14px ${HEAD}`; tracked(2);
  const nx = R ? W - HB.x1 + 4 : HB.x1 - 4; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(c.name.toUpperCase(), nx + 1, 12); ctx.fillStyle = '#f2f0f6'; ctx.fillText(c.name.toUpperCase(), nx, 11);
  const nw = ctx.measureText(c.name.toUpperCase()).width; ctx.fillStyle = c.color; ctx.fillRect(R ? nx + nw + 6 : nx - nw - 9, 7, 3, 9);
  if (f.bar === 1 && frame % 40 < 28) { ctx.font = `600 11px ${HEAD}`; tracked(3); ctx.fillStyle = '#ff4b4b'; ctx.fillText('CRITICAL', nx, HB.b1 + 10); }
  tracked(0);
  // bottom corner: portrait, super circle, skill circle
  const by = H - 38, px = 38, sx = 94, kx = 142, X = x => R ? W - x : x, online = mode === 'online', human = !f.ai && !demo && (!online || f.side === mySlot()), map = online || f.side === 0 ? MAP1 : MAP2;
  ctx.save(); ctx.beginPath(); ctx.arc(X(px), by, 22, 0, 7); ctx.fillStyle = '#0c0812'; ctx.fill(); ctx.clip();
  const pg = ctx.createRadialGradient(X(px), by - 8, 2, X(px), by, 26); pg.addColorStop(0, rgba(c.color, 0.7)); pg.addColorStop(1, '#000'); ctx.fillStyle = pg; ctx.fillRect(X(px) - 26, by - 26, 52, 52);
  drawFace(c, f.skin, X(px), by + 4, 19, R); ctx.restore();
  ctx.beginPath(); ctx.arc(X(px), by, 22, 0, 7); ctx.strokeStyle = f.bar ? (frame % 30 < 15 ? '#ff3b3b' : c.color) : c.color; ctx.lineWidth = 2; ctx.stroke();
  // super: four quarter arcs around a dark disc
  const full = f.meter >= SUPER_COST, glow = full ? 0.5 + 0.5 * Math.sin(frame / 6) : 0;
  ctx.beginPath(); ctx.arc(X(sx), by, 24, 0, 7); ctx.fillStyle = full ? rgba(c.color, 0.25 + glow * 0.2) : 'rgba(8,6,12,0.82)'; ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a0 = -Math.PI / 2 + i * Math.PI / 2 + 0.07, a1 = a0 + Math.PI / 2 - 0.14, q = clamp((f.meter - i * 25) / 25, 0, 1), dirA = R ? -1 : 1;
    const arc = (from, to) => { ctx.beginPath(); if (R) ctx.arc(X(sx), by, 20, Math.PI - from, Math.PI - to, true); else ctx.arc(X(sx), by, 20, from, to); };
    arc(a0, a1); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 5; ctx.stroke();
    if (q > 0) { arc(a0, a0 + (a1 - a0) * q); ctx.strokeStyle = q >= 1 ? c.color : rgba(c.color, 0.55); ctx.lineWidth = 5; ctx.stroke(); }
    void dirA;
  }
  if (full) { ctx.beginPath(); ctx.arc(X(sx), by, 25 + glow * 3, 0, 7); ctx.strokeStyle = rgba(c.color, 0.5 * glow); ctx.lineWidth = 3; ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  if (full) { ctx.font = `600 11px ${HEAD}`; tracked(1); ctx.fillText('SUPER', X(sx), by - 1); tracked(0); }
  else { ctx.font = `600 13px ${HEAD}`; ctx.fillText(Math.floor(f.meter) + '%', X(sx), by); }
  // skill: a small disc that sweeps round as it recharges, with the seconds left
  const cd = f.skillCd || 0, ready = cd <= 0, ky = by + 6;
  ctx.beginPath(); ctx.arc(X(kx), ky, 15, 0, 7); ctx.fillStyle = ready ? c.color : 'rgba(8,6,12,0.85)'; ctx.fill();
  if (!ready) { const k = 1 - cd / (f.skillMax || 1); ctx.beginPath(); ctx.moveTo(X(kx), ky); ctx.arc(X(kx), ky, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2 * (R ? -1 : 1), R); ctx.closePath(); ctx.fillStyle = rgba(c.color, 0.35); ctx.fill(); }
  ctx.beginPath(); ctx.arc(X(kx), ky, 15, 0, 7); ctx.strokeStyle = ready ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (ready && frame % 50 < 25) { ctx.beginPath(); ctx.arc(X(kx), ky, 18, 0, 7); ctx.strokeStyle = rgba(c.color, 0.6); ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = ready ? '#000' : '#fff'; ctx.font = `700 ${ready ? 11 : 13}px ${HEAD}`;
  ctx.fillText(ready ? (human ? keyName(map.skill) : '✓') : Math.ceil(cd / 60), X(kx), ky + 0.5);
  // labels
  ctx.font = `500 9px ${HEAD}`; tracked(2); ctx.fillStyle = 'rgba(235,232,242,0.75)';
  ctx.fillText(full && human ? 'SUPER · ' + keyName(map.super) : 'SUPER', X(sx), by - 33); ctx.fillText('SKILL', X(kx), ky - 24);
  tracked(0);
  ctx.restore();

  if (f.combo >= 2 && f.comboT > 0) {
    ctx.save(); ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
    const tx = R ? W - 24 : 24, pop = 1 + Math.max(0, f.comboT - 72) * 0.04;
    ctx.font = `italic 700 ${34 * pop | 0}px ${HEAD}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.fillStyle = c.color;
    ctx.strokeText(f.combo + ' HITS', tx, 150); ctx.fillText(f.combo + ' HITS', tx, 150);
    const pct = Math.round(f.comboDmg / P[1 - f.side].maxHp * 100) + '%';
    ctx.font = `italic 900 18px ${HEAD}`; ctx.fillStyle = '#fff'; ctx.strokeText(pct + ' DAMAGE', tx, 178); ctx.fillText(pct + ' DAMAGE', tx, 178);
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
  ctx.save(); ctx.globalAlpha = introLong() ? clamp((152 - introT) / 22, 0, 1) : 1; // fades in as the intro ends
  P.forEach((f, i) => drawSideHUD(f, i === 1));
  // timer: a small plate between the two bars
  const tx = W / 2;
  ctx.beginPath(); ctx.moveTo(tx - 42, 10); ctx.lineTo(tx + 42, 10); ctx.lineTo(tx + 29, 50); ctx.lineTo(tx - 29, 50); ctx.closePath();
  const g = ctx.createLinearGradient(0, 10, 0, 50); g.addColorStop(0, '#2b4372'); g.addColorStop(1, '#0d1630'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(190,210,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 26px ${HEAD}`; ctx.fillStyle = timer < 10 * CLOCK_F && frame % 30 < 15 && mode !== 'training' ? '#ff5a5a' : '#fff';
  ctx.fillText(mode === 'training' ? '∞' : Math.ceil(timer / CLOCK_F), tx, 31);
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
}

const use3D = () => !!(window.R3D && R3D.ready && gfx.renderer === '3d');
function drawFightScene() {
  const fin = cine && cine.kind === 'fin' && P.length, inv = !!(fin && cine.void);
  if (use3D()) { R3D.invert(inv); R3D.renderFight(); if (fin && cine.dark > 0) { ctx.save(); ctx.globalAlpha = cine.dark * 0.9; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); } drawFightOverlay3D(); return; }
  ctx.save(); applyRoll();
  if (arenaOn) drawArena2D(); else drawWorldStage();
  if (cine && P.length) drawCineBack();
  ctx.save(); worldT(); if (!arenaOn) { drawCraters2D(); drawProps2D(); } if (fin) drawFinBack2D(); if (P.length) drawFighters(); projs.forEach(drawProj); drawParts(); if (fin) drawFinFront2D();
  if (mode === 'training' && training.hitboxes) drawHitboxes(false);
  ctx.restore();
  if (!arenaOn) STAGES[stageId].front();
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
    ctx.textAlign = R ? 'right' : 'left'; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.font = `700 64px ${HEAD}`; tracked(6); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(c.name.toUpperCase(), 0, -4); ctx.fillStyle = '#fff'; ctx.fillText(c.name.toUpperCase(), 0, -4);
    ctx.font = `600 15px ${HEAD}`; tracked(8); ctx.fillStyle = c.color; ctx.fillText(c.title.toUpperCase(), 2, 40);
    const tag = f.ai ? 'CPU' : mode === 'online' ? (f.side === mySlot() ? 'YOU' : 'OPPONENT') : 'PLAYER ' + (f.side + 1);
    ctx.font = `500 11px ${HEAD}`; tracked(5); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(tag, 2, -50);
    ctx.restore();
  }
  if (B && B.kind === 'line') {
    const f = P[B.side], R = f.side === 1, x = R ? W - 48 : 48, el = B.from - introT; ctx.globalAlpha = clamp(el / 8, 0, 1) * clamp((INTRO_SAY - el) / 8, 0, 1);
    ctx.fillStyle = f.c.color; ctx.fillRect(R ? W - 52 : 48, H - 132, 4, 44);
    ctx.textAlign = R ? 'right' : 'left'; ctx.font = `600 30px ${HEAD}`; tracked(4); ctx.fillStyle = '#fff'; ctx.fillText(f.c.name.toUpperCase(), R ? x - 12 : x + 12, H - 118);
    ctx.font = `500 12px ${HEAD}`; tracked(4); ctx.fillStyle = f.c.color; ctx.fillText(f.c.title.toUpperCase(), R ? x - 12 : x + 12, H - 95);
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
    ctx.fillStyle = 'rgba(4,3,8,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 40px ${HEAD}`; tracked(12); ctx.fillStyle = '#fff'; ctx.fillText('PAUSED', W / 2 + 6, 210);
    ctx.fillStyle = '#e01b2b'; ctx.fillRect(W / 2 - 60, 240, 120, 2);
    ctx.font = `500 15px ${HEAD}`; tracked(4); ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.fillText('ENTER / ESC  RESUME        Q  QUIT TO MENU', W / 2, 286); ctx.restore();
  }
}

// FINISH HIM: who can finish, the key to press, and how long is left
function drawFinishPrompt() {
  const w = P[finish.side], left = 1 - finish.t / finish.max;
  const human = !w.ai && (mode !== 'online' || finish.side === mySlot());
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W / 2 - 170, H - 104, 340, 52);
  ctx.fillStyle = '#ff2b2b'; ctx.fillRect(W / 2 - 170, H - 56, 340 * left, 4);
  const key = keyName(mode === 'local' && finish.side === 1 ? MAP2.super : MAP1.super);
  ctx.font = `600 18px ${HEAD}`; tracked(4); ctx.fillStyle = frame % 40 < 28 ? '#fff' : '#ffb3b3';
  ctx.fillText(human ? 'GET CLOSE AND PRESS  ' + key + '  TO FINISH' : w.c.name.toUpperCase() + ' IS GOING FOR THE FINISH', W / 2, H - 78);
  ctx.restore();
}
function drawTrainingHUD() {
  const lines = [['TRAINING', '#ffd23f'], ['1  DUMMY: ' + DUMMY_MODES[training.dummy] + (DUMMY_MODES[training.dummy] === 'CPU' ? ' (' + DIFFS[difficulty].name + ')' : ''), '#fff'],
    ['2  REFILL HEALTH: ' + (training.refill ? 'ON' : 'OFF'), '#fff'], ['3  INFINITE METER + SKILL: ' + (training.meter ? 'ON' : 'OFF'), '#fff'],
    ['4  HITBOXES: ' + (training.hitboxes ? 'ON' : 'OFF'), '#fff'], ['5  INPUT HISTORY: ' + (training.inputs ? 'ON' : 'OFF'), '#fff'], ['0  RESET POSITIONS', '#fff']];
  const L2 = training.cur || training.last;
  if (L2) lines.push(['', ''], [(training.cur ? 'COMBO: ' : 'LAST COMBO: ') + L2.hits + ' HITS · ' + L2.dmg + ' DMG (' + L2.pct + '%)', '#ff8a8a']);
  if (training.max) lines.push(['BEST: ' + training.max + ' HITS', '#ff8a8a']);
  ctx.save(); ctx.fillStyle = 'rgba(8,4,14,0.72)'; ctx.fillRect(14, 112, 250, 18 + lines.length * 18);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach(([t, c], i) => { ctx.font = (i ? '12px ' : '600 13px ') + BODY; ctx.fillStyle = c; ctx.fillText(t, 24, 120 + i * 18); });
  if (training.inputs) {
    ctx.fillStyle = 'rgba(8,4,14,0.6)'; ctx.fillRect(W - 120, 112, 106, 18 + 12 * 18);
    ctx.font = 'bold 13px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('INPUTS', W - 110, 120);
    training.log.forEach((t, i) => { ctx.globalAlpha = 1 - i / 13; ctx.fillStyle = '#fff'; ctx.font = '13px ' + BODY; ctx.fillText(t, W - 110, 138 + i * 17); });
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
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; quad([[0, 380], [620, 380], [580, 500], [0, 500]], R); ctx.fill();
  ctx.fillStyle = f.c.color; quad([[0, 376], [640, 376], [636, 382], [0, 382]], R); ctx.fill();
  ctx.restore();
  const tx = R ? W - 40 : 40;
  ctx.save(); ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle';
  ctx.font = `italic 700 ${64}px ${HEAD}`; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.fillStyle = f.c.color;
  const off = (1 - k) * 200 * (R ? 1 : -1);
  ctx.strokeText(f.c.name.toUpperCase() + ' WINS', tx + off, 420); ctx.fillText(f.c.name.toUpperCase() + ' WINS', tx + off, 420);
  ctx.font = 'italic 18px ' + BODY; ctx.fillStyle = '#fff'; ctx.fillText('“' + (f.vicLine || f.c.quote) + '”', tx + off, 462);
  ctx.restore();
  bigText('VICTORY', 70, 54, '#ffd23f', '#000');
  if (net.rankRes) { const R2 = net.rankRes, T = tierOf(R2.after);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 22px ${HEAD}`; tracked(3);
    ctx.fillStyle = R2.d >= 0 ? '#7dff9a' : '#ff6b6b'; ctx.fillText((R2.d >= 0 ? '+' : '') + R2.d + ' RP', W / 2, 112);
    ctx.font = `600 14px ${HEAD}`; ctx.fillStyle = T[2]; ctx.fillText((R2.up ? 'PROMOTED: ' : R2.down ? 'DEMOTED: ' : '') + rankLabel(R2.after), W / 2, 138); ctx.restore(); tracked(0); }
  const hint = mode === 'online' && net.ranked ? 'Enter: find another ranked match   ·   Esc: menu'
    : net.role === 'guest' ? 'Enter: ask for a rematch   ·   Esc: leave'
    : 'Enter: rematch   ·   C: change fighters   ·   Esc: menu';
  ctx.font = '15px ' + BODY; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; ctx.fillText(hint, W / 2, 525);
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
  const x = W - 28, y = isTitle ? H - 44 : 34;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = v.col; ctx.fillRect(x - 2, y - 13, 2, 26);
  ctx.font = `600 11px ${HEAD}`; tracked(4); ctx.fillStyle = 'rgba(235,230,240,0.6)'; ctx.fillText(isTitle ? '◀ ▶  ' + v.name : v.name, x - 10, y - 6);
  ctx.font = `600 15px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText(c.name.toUpperCase(), x - 10, y + 8);
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
    if (!isTitle) { const g = ctx.createLinearGradient(0, 0, W * 0.62, 0); g.addColorStop(0, 'rgba(3,3,7,0.9)'); g.addColorStop(0.6, 'rgba(3,3,7,0.55)'); g.addColorStop(1, 'rgba(3,3,7,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.62, H); }
    vignette(0.7);
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
    vignette(0.7); if (v.fx === 'rain') embers();
  }
  if (a < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - a) * 0.92})`; ctx.fillRect(0, 0, W, H); }
  vibeOverlay(v, a, isTitle);
}
function drawMenuList(items, idx, x, y, gap, values, fs) {
  fs = fs || 1;
  const size = Math.round(24 * fs), rowW = 360 * Math.max(0.85, fs);
  items.forEach((m, i) => {
    const k = easeOut((screenT - i * 3) / 18), on = i === idx, xx = x - (1 - k) * 30, yy = y + i * gap;
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    if (on) {
      const g = ctx.createLinearGradient(xx - 22, 0, xx + rowW, 0); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(xx - 22, yy - gap * 0.44, rowW, gap * 0.88);
      ctx.fillStyle = '#e01b2b'; ctx.fillRect(xx - 22, yy - gap * 0.44, 3, gap * 0.88);
    }
    ctx.font = `${on ? 600 : 400} ${size}px ${HEAD}`; tracked(on ? 4 : 3); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? '#ffffff' : 'rgba(225,220,232,0.62)'; ctx.fillText(m, xx, yy);
    if (values && values[i]) {
      ctx.font = `500 ${Math.round(size * 0.78)}px ${HEAD}`; tracked(2); ctx.textAlign = 'right';
      ctx.fillStyle = on ? '#ffffff' : 'rgba(225,220,232,0.5)'; ctx.fillText(values[i], xx + rowW - 40, yy);
    }
    ctx.restore();
  });
}
// bottom key-hint bar
function footer(t) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(40, H - 38, W - 80, 1);
  ctx.font = '12px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(220,214,228,0.7)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(t, 40, H - 20); ctx.restore();
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
  const a = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frame / 22))) * clamp((screenT - 60) / 40, 0, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.font = `500 16px ${HEAD}`; tracked(7); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText('PRESS ENTER', W / 2 + 3, H - 74); ctx.restore();
  const wk = clamp((screenT - 40) / 50, 0, 1);
  ctx.save(); ctx.globalAlpha = wk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 13px ${HEAD}`; tracked(10); ctx.fillStyle = menuVibe().col; ctx.fillText('WELCOME TO BP BRADAR', W / 2 + 5, 272); ctx.restore(); tracked(0);
  ctx.save(); ctx.font = '11px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(220,214,228,0.45)'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(audioHint(), W - 24, H - 18); ctx.restore();
}
function menuHeader(t) {
  ctx.save(); ctx.font = `600 13px ${HEAD}`; tracked(6); ctx.fillStyle = '#e01b2b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('BP VERSE', 52, 60); ctx.font = `600 34px ${HEAD}`; tracked(5); ctx.fillStyle = '#fff'; ctx.fillText(t, 50, 94);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(52, 122, 300, 1); ctx.restore();
}
function drawMenu() {
  drawMenuBg();
  // WELCOME TO BP BRADAR: the main menu's greeting, in the colour of whoever is on the ledge
  const k = easeOut(clamp(screenT / 26, 0, 1)), v = menuVibe();
  ctx.save(); ctx.globalAlpha = k; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `600 14px ${HEAD}`; tracked(9); ctx.fillStyle = v.col; ctx.fillText('WELCOME TO', 52 - (1 - k) * 20, 58);
  const tg = ctx.createLinearGradient(0, 70, 0, 118); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#c9c6cf');
  ctx.font = `700 52px ${TITLE}`; tracked(7); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 18; ctx.fillStyle = tg; ctx.fillText('BP BRADAR', 48 - (1 - k) * 34, 98);
  ctx.shadowBlur = 0; ctx.fillStyle = v.col; ctx.fillRect(52, 134, 46, 3); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(98, 135, 254, 1);
  ctx.font = `600 11px ${HEAD}`; tracked(5); ctx.fillStyle = 'rgba(230,225,236,0.55)'; ctx.fillText('MAIN MENU', 52, 152);
  ctx.restore(); tracked(0);
  drawMenuList(MAIN_MENU, menuIdx, 74, 210, 48);
  footer('↑ ↓  Navigate      ENTER  Select      ' + audioHint());
}
function drawPlayMenu() {
  drawMenuBg(); menuHeader('PLAY');
  const vals = []; vals[PLAY['STORY MODE']] = 'COMING SOON'; vals[PLAY['VS CPU']] = '◀ ' + DIFFS[difficulty].name + ' ▶'; vals[PLAY['RANKED']] = rankLabel(rank.r);
  drawMenuList(PLAY_MENU.map(m => m[0]), subIdx, 74, 150, 36, vals, 0.86);
  // your rank: tier badge, rating, record and streak
  const T = tierOf(rank.r), nx = TIERS[TIERS.indexOf(T) + 1], x0 = W - 300, y0 = 150;
  ctx.save(); ctx.fillStyle = 'rgba(8,6,12,0.72)'; ctx.fillRect(x0, y0, 250, 118); ctx.fillStyle = T[2]; ctx.fillRect(x0, y0, 4, 118);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `600 11px ${HEAD}`; tracked(5); ctx.fillStyle = 'rgba(235,230,240,0.6)'; ctx.fillText('YOUR RANK', x0 + 18, y0 + 18);
  ctx.font = `700 28px ${HEAD}`; tracked(3); ctx.fillStyle = T[2]; ctx.fillText(T[0], x0 + 18, y0 + 46);
  ctx.font = `500 13px ${HEAD}`; tracked(2); ctx.fillStyle = '#fff'; ctx.fillText(Math.round(rank.r) + ' RP   ·   ' + rank.w + 'W ' + rank.l + 'L' + (rank.streak > 1 ? '   ·   ' + rank.streak + ' WIN STREAK' : ''), x0 + 18, y0 + 74);
  if (nx) { const k = clamp((rank.r - T[1]) / (nx[1] - T[1]), 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 18, y0 + 94, 214, 4); ctx.fillStyle = T[2]; ctx.fillRect(x0 + 18, y0 + 94, 214 * k, 4);
    ctx.font = '10px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(235,230,240,0.55)'; ctx.fillText(Math.ceil(nx[1] - rank.r) + ' RP TO ' + nx[0], x0 + 18, y0 + 108); }
  ctx.restore(); tracked(0);
  ctx.font = '14px ' + BODY; ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.textAlign = 'left'; ctx.fillText(PLAY_MENU[subIdx][1], 52, 478);
  footer('↑ ↓  Navigate      ← →  Difficulty      ENTER  Select      ESC  Back');
}
function drawSettings() {
  drawMenuBg(); menuHeader('SETTINGS');
  drawMenuList(SETTINGS_MENU, subIdx, 74, 152, 29, ['◀ ' + DIFFS[difficulty].name + ' ▶', '◀ ' + QNAMES[gfx.quality] + (gfx.auto ? ' · AUTO' : '') + ' ▶', gfx.renderer.toUpperCase(),
    musicOn ? 'ON' : 'OFF', '◀ ' + (musicPick < 0 ? 'RANDOM' : TRACKS[musicPick].name) + ' ▶', voiceOn ? 'ON' : 'OFF', VC_NAMES[voiceChat], '', '', gfx.showFps ? 'ON' : 'OFF', ''], 0.72);
  ctx.font = '13px ' + BODY; ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.textAlign = 'left';
  ctx.fillText(SETTINGS_HELP[subIdx](), 52, 482);
  footer('↑ ↓  Navigate      ← →  Change      ENTER  Toggle      ESC  Back');
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
  drawMenuBg(); ctx.fillStyle = 'rgba(5,3,8,0.86)'; ctx.fillRect(0, 0, W, H);
  bigText('KEY BINDINGS', 40, 36);
  const used = {}; for (const m of [MAP1, MAP2]) for (const k in m) used[m[k]] = (used[m[k]] || 0) + 1;
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px ' + BODY; ctx.textAlign = 'center'; ctx.fillStyle = '#3b8cff'; ctx.fillText('PLAYER 1', 520, 82); ctx.fillStyle = '#ff2b2b'; ctx.fillText('PLAYER 2', 720, 82);
  KEY_ROWS.forEach(([label, act], i) => {
    const y = 104 + i * 27, on = i === keysRow;
    if (on) { ctx.fillStyle = 'rgba(209,15,31,0.25)'; ctx.fillRect(170, y - 13, 640, 26); }
    ctx.font = `${on ? 18 : 16}px ${MENU_FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = on ? '#fff' : '#c9c2cc'; ctx.fillText(label, 190, y);
    ctx.font = 'bold 15px ' + BODY; ctx.textAlign = 'center';
    const cell = (x, code, col) => {
      const sel = on && keysCol === col && act !== 'dash' && act !== 'reset' && act !== 'back', listening = sel && keysListen;
      if (sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(x - 70, y - 12, 140, 24); }
      ctx.fillStyle = listening ? (frame % 30 < 15 ? '#ffd23f' : '#fff') : used[code] > 1 && act !== 'ptt' ? '#ff6b6b' : '#fff';
      ctx.fillText(listening ? 'PRESS A KEY…' : keyName(code), x, y);
    };
    if (MAP1[act] !== undefined) { cell(520, MAP1[act], 0); cell(720, MAP2[act], 1); }
    else if (act === 'ptt') cell(520, EXTRA.ptt, 0);
    else if (act === 'dash') { ctx.fillStyle = '#fff'; ctx.fillText(dashTap ? 'ON' : 'OFF', 520, y); }
  });
  ctx.font = '13px ' + BODY; ctx.fillStyle = '#8a8094'; ctx.textAlign = 'center';
  ctx.fillText('↑/↓ choose · ←/→ player · Enter: rebind (then press the new key, Esc cancels) · red = key used twice', W / 2, 512);
}
function drawCredits() {
  drawMenuBg(); menuHeader('CREDITS');
  const lines = [['BP VERSE · FIGHTER 1223', '#fff'], ['', ''], ['Created by folahanduh and the BP crew', '#c9c2cc'], ['Fighters: Julian · Tiny D Ryan · Darren · BBL Blake · Frank Black', '#c9c2cc'],
    ['Built with Claude Code', '#c9c2cc'], ['Music, sound and voices made live in your browser', '#c9c2cc'], ['', ''], ['Enter / Esc to go back', '#8a8094']];
  lines.forEach(([t, c], i) => { ctx.font = (i ? '16px ' + BODY : `600 24px ${MENU_FONT}`); ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(t, 52, 180 + i * 30); });
}
function drawControls() {
  drawMenuBg(); ctx.fillStyle = 'rgba(5,3,8,0.82)'; ctx.fillRect(0, 0, W, H);
  bigText('CONTROLS & COMBOS', 40, 36);
  const k1 = a => keyName(MAP1[a]), k2 = a => keyName(MAP2[a]);
  const rows = [['', 'P1', 'P2', 'PAD'], ['Move', k1('left') + ' / ' + k1('right'), k2('left') + ' / ' + k2('right'), 'D-pad'], ['Dash', 'tap twice or ' + k1('dashkey'), 'tap twice or ' + k2('dashkey'), 'tap twice or LT'], ['Jump', k1('up'), k2('up'), 'Up'],
    ['Block', k1('down') + ' (hold)', k2('down') + ' (hold)', 'Down'], ['Punch', k1('punch'), k2('punch'), 'X / □'], ['Kick', k1('kick'), k2('kick'), 'A / ✕'], ['Skill (cooldown)', k1('skill'), k2('skill'), 'Y / △'], ['Super (full meter)', k1('super'), k2('super'), 'B / ○'], ['Stage item', k1('env'), k2('env'), 'LB / L1'], ['Grab / throw', k1('grab'), k2('grab'), 'RB / R1'], ['Parry', 'block on time', 'block on time', 'block on time']];
  rows.forEach((r, i) => {
    ctx.font = (i ? '' : 'bold ') + '15px ' + BODY; ctx.textBaseline = 'middle';
    const ry = 84 + i * 23; ctx.textAlign = 'left'; ctx.fillStyle = '#aaa'; ctx.fillText(r[0], 40, ry);
    ctx.textAlign = 'center';
    ctx.fillStyle = i ? '#fff' : '#3b8cff'; ctx.fillText(r[1], 220, ry);
    ctx.fillStyle = i ? '#fff' : '#ff2b2b'; ctx.fillText(r[2], 320, ry);
    ctx.fillStyle = i ? '#fff' : '#ffd23f'; ctx.fillText(r[3], 420, ry);
  });
  ctx.textAlign = 'left'; ctx.font = 'bold 15px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('MOVES (P1 keys)', 40, 380);
  ctx.font = '13px ' + BODY; ctx.fillStyle = '#ddd';
  ['↓+F uppercut · →+F body hook · ↓+G sweep · →+G roundhouse', 'Tiny D Ryan: →+F sword thrust', 'Two health bars: lose the gold one and you fight on in CRITICAL',
    'Stage item (' + k1('env') + '): next to a brick, bottle, speaker… smash it or throw it', 'FINISH HIM: at 0 health, get close and press ' + k1('super'), 'Grab (' + k1('grab') + ') beats blocking · press it right after being grabbed to escape', 'Parry: start blocking just before a punch or kick lands'].forEach((t, i) => ctx.fillText(t, 40, 402 + i * 18));
  ctx.font = 'bold 15px ' + BODY; ctx.fillStyle = '#ffd23f'; ctx.fillText('COMBOS (land each hit, then press the next)', 520, 90);
  const keyOf = m => { const [b, d] = COMBO_INPUT[m]; return (d === 'down' ? '↓' : d === 'fwd' ? '→' : '') + (b === 'punch' ? 'F' : 'G'); };
  COMBOS.forEach(([name, seq], i) => {
    ctx.font = 'bold 13px ' + BODY; ctx.fillStyle = '#fff'; ctx.fillText(name, 520, 118 + i * 28);
    ctx.font = '13px ' + BODY; ctx.fillStyle = '#ff8a8a'; ctx.fillText(seq.map(keyOf).join('  '), 760, 118 + i * 28);
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
  if (use3D()) R3D.renderSelect(); else drawSelectBg();
  const gal = mode === 'gallery', slots = gal ? [0] : [0, 1];
  const label = s => mode === 'training' && s === 1 ? 'DUMMY' : mode === 'cpu' && s === 1 ? 'CPU' : gal ? 'VIEWING' : mode === 'online' ? (s === mySlot() ? 'YOU' : 'OPPONENT') : 'P' + (s + 1);
  const pcol = s => s ? '#ff3b3b' : '#3b8cff', active = s => mode === 'online' || gal || s <= selCursor || selDone[s];
  // legibility gradients
  let g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(3,2,6,0.85)'); g.addColorStop(1, 'rgba(3,2,6,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
  g = ctx.createLinearGradient(0, H - 230, 0, H); g.addColorStop(0, 'rgba(3,2,6,0)'); g.addColorStop(1, 'rgba(3,2,6,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, H - 230, W, 230);
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `600 26px ${HEAD}`; tracked(6); ctx.fillStyle = '#fff'; ctx.fillText(gal ? 'CHARACTERS' : 'SELECT YOUR FIGHTER', 40, 42);
  const sub = { cpu: 'VS CPU · ' + DIFFS[difficulty].name, training: 'TRAINING', local: '2 PLAYERS', online: 'ONLINE MATCH', gallery: 'MEET THE ROSTER' }[mode] || '';
  ctx.font = `600 12px ${HEAD}`; tracked(5); ctx.fillStyle = '#e01b2b'; ctx.fillText(sub, 42, 68); ctx.restore();
  const ht = c => `${Math.floor(c.inches / 12)}'${c.inches % 12}"`, reachOf = c => { const r = 0.33 * ((c.inches - 40) * 3.2 + 30) * c.build.arm; return r > 50 ? 'LONG' : r > 38 ? 'MID' : 'SHORT'; };
  // name plates on each side
  slots.forEach(s => {
    const c = CHARS[sel[s]], R = s === 1 && !gal, x = R ? W - 44 : 44, al = R ? 'right' : 'left', d = dummyFor(s);
    ctx.save(); ctx.globalAlpha = active(s) ? 1 : 0.4; ctx.textAlign = al; ctx.textBaseline = 'middle';
    ctx.fillStyle = pcol(s);
    ctx.font = `600 12px ${HEAD}`; tracked(4); const tw = ctx.measureText(label(s)).width + 18; ctx.fillRect(R ? x - tw : x, 318, tw, 20);
    ctx.fillStyle = '#fff'; ctx.fillText(label(s), R ? x - 9 : x + 9, 329);
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
    ctx.font = `700 ${c.name.length > 9 ? 42 : 50}px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.fillText(c.name.toUpperCase(), x, 370);
    ctx.shadowBlur = 0; ctx.font = `500 13px ${HEAD}`; tracked(6); ctx.fillStyle = c.color; ctx.fillText(c.title.toUpperCase(), x, 400);
    const sk = SKINS[c.id], skin = sk[selSkin[s]].name.toUpperCase();
    ctx.font = `500 13px ${HEAD}`; tracked(3); const skw = ctx.measureText('◀  ' + skin + '  ▶').width + 20;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(R ? x - skw : x, 414, skw, 24); ctx.fillStyle = '#ffd23f'; ctx.fillText('◀  ' + skin + '  ▶', R ? x - 10 : x + 10, 427);
    sk.forEach((_, k) => { ctx.fillStyle = k === selSkin[s] ? '#ffd23f' : 'rgba(255,255,255,0.25)'; ctx.fillRect((R ? x - skw - 14 : x + skw + 8) + k * 8 * (R ? -1 : 1), 424, 5, 5); });
    if (selDone[s] && !gal) { // lock-in stamp
      const k = easeOut(Math.min(1, (frame - (d.lockT || 0)) / 12));
      ctx.save(); ctx.translate(R ? x - 110 : x + 110, 282); ctx.rotate(-0.08); ctx.scale(2 - k, 2 - k); ctx.globalAlpha = k;
      ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.strokeRect(-82, -18, 164, 36); ctx.textAlign = 'center'; ctx.font = `700 20px ${HEAD}`; tracked(8); ctx.fillStyle = '#fff'; ctx.fillText('LOCKED IN', 4, 1); ctx.restore();
    }
    ctx.restore();
  });
  if (!gal) {
    // head-to-head: both fighters' numbers against each other
    const a = CHARS[sel[0]], b = CHARS[sel[1]], cx = W / 2, top = 74;
    ctx.save(); ctx.fillStyle = 'rgba(6,5,10,0.72)'; ctx.fillRect(cx - 150, top, 300, 290); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx - 150, top, 300, 1);
    ctx.fillStyle = pcol(0); ctx.fillRect(cx - 150, top, 3, 290); ctx.fillStyle = active(1) ? pcol(1) : 'rgba(255,255,255,0.2)'; ctx.fillRect(cx + 147, top, 3, 290);
    ctx.textBaseline = 'middle';
    const row = (y, l, r, mid, dimR) => { ctx.font = `500 12px ${HEAD}`; tracked(2); ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(l, cx - 136, y);
      ctx.textAlign = 'right'; ctx.globalAlpha = dimR ? 0.4 : 1; ctx.fillText(r, cx + 136, y); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.font = `600 10px ${HEAD}`; tracked(4); ctx.fillStyle = 'rgba(220,214,228,0.6)'; ctx.fillText(mid, cx + 2, y); };
    const dimR = !active(1);
    row(top + 18, ht(a) + ' · ' + a.kg + 'KG', ht(b) + ' · ' + b.kg + 'KG', 'BUILD', dimR);
    row(top + 38, reachOf(a), reachOf(b), 'REACH', dimR);
    [['STR', 'str'], ['SPD', 'spd'], ['DUR', 'dur'], ['IQ', 'iq'], ['HAX', 'hax']].forEach(([lb, k], i) => {
      const y = top + 66 + i * 24, va = a[k], vb = b[k];
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(cx - 120, y - 4, 102, 8); ctx.fillRect(cx + 20, y - 4, 102, 8);
      ctx.fillStyle = a.color; ctx.fillRect(cx - 18 - 102 * Math.min(1, va / 120), y - 4, 102 * Math.min(1, va / 120), 8);
      ctx.globalAlpha = dimR ? 0.35 : 1; ctx.fillStyle = b.color; ctx.fillRect(cx + 20, y - 4, 102 * Math.min(1, vb / 120), 8); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.font = `600 10px ${HEAD}`; tracked(2); ctx.fillStyle = 'rgba(230,225,236,0.8)'; ctx.fillText(lb, cx + 1, y);
      ctx.font = `600 11px ${HEAD}`; tracked(1); ctx.textAlign = 'right'; ctx.fillStyle = va >= vb ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.fillText(va, cx - 124, y);
      ctx.textAlign = 'left'; ctx.globalAlpha = dimR ? 0.4 : 1; ctx.fillStyle = vb >= va ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.fillText(vb, cx + 126, y); ctx.globalAlpha = 1;
    });
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx - 136, top + 190, 272, 1);
    const ab = (y, mid, la, lb2) => { ctx.textAlign = 'center'; ctx.font = `600 9px ${HEAD}`; tracked(4); ctx.fillStyle = '#e01b2b'; ctx.fillText(mid, cx + 2, y - 9);
      ctx.font = '11px ' + BODY; tracked(0); ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(la, cx - 136, y + 5); ctx.textAlign = 'right'; ctx.globalAlpha = dimR ? 0.4 : 1; ctx.fillText(lb2, cx + 136, y + 5); ctx.globalAlpha = 1; };
    ab(top + 214, 'SKILL', a.skill.name, b.skill.name); ab(top + 246, 'SUPER', a.super.name, b.super.name); ab(top + 276, 'FINISHER', a.fin.name, b.fin.name);
    ctx.restore();
  } else {
    // gallery: one fighter and a full profile
    const c = CHARS[sel[0]], px = 520, py = 96, pw = 400;
    ctx.save(); ctx.fillStyle = 'rgba(6,5,10,0.78)'; ctx.fillRect(px, py, pw, 330); ctx.fillStyle = c.color; ctx.fillRect(px, py, 3, 330);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'italic 13px ' + BODY; ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.fillText('“' + c.quote + '”', px + 20, py + 22);
    [['STR', c.str], ['SPD', c.spd], ['DUR', c.dur], ['IQ', c.iq], ['HAX', c.hax]].forEach(([k, v], i) => { const y = py + 50 + i * 20;
      ctx.font = `600 11px ${HEAD}`; tracked(3); ctx.fillStyle = 'rgba(230,225,236,0.7)'; ctx.fillText(k, px + 20, y); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px + 60, y - 4, 200, 8);
      ctx.fillStyle = c.color; ctx.fillRect(px + 60, y - 4, 200 * Math.min(1, v / 120), 8); ctx.fillStyle = '#fff'; ctx.fillText(v, px + 270, y); });
    const abl = [['SKILL', c.skill], ['SUPER', c.super], ['FINISHER', { name: c.fin.name, desc: 'At 0 health they\'re dazed: get close and press SUPER.' }]];
    abl.forEach(([k, a2], i) => { const y = py + 160 + i * 48; ctx.font = `600 10px ${HEAD}`; tracked(4); ctx.fillStyle = '#e01b2b'; ctx.fillText(k, px + 20, y);
      ctx.font = `600 14px ${HEAD}`; tracked(2); ctx.fillStyle = '#fff'; ctx.fillText(a2.name.toUpperCase(), px + 20, y + 16); ctx.font = '11px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(230,225,236,0.75)'; wrap(a2.desc, px + 20, y + 33, pw - 40, 13); });
    ctx.restore();
  }
  // roster tiles
  const n = CHARS.length, tw = 84, th = 92, gp = 10, x0 = W / 2 - (n * tw + (n - 1) * gp) / 2, y0 = H - 112;
  CHARS.forEach((c, i) => {
    const x = x0 + i * (tw + gp), on = [0, 1].filter(s => slots.includes(s) && sel[s] === i && active(s)), pulse = on.length ? Math.sin(frame / 8) * 2 : 0;
    ctx.save(); ctx.fillStyle = '#0c0910'; ctx.fillRect(x, y0 - pulse, tw, th);
    ctx.beginPath(); ctx.rect(x, y0 - pulse, tw, th); ctx.clip();
    const tg = ctx.createLinearGradient(0, y0, 0, y0 + th); tg.addColorStop(0, rgba(c.color, on.length ? 0.65 : 0.22)); tg.addColorStop(1, 'rgba(0,0,0,0.9)'); ctx.fillStyle = tg; ctx.fillRect(x, y0 - pulse, tw, th);
    drawFace(c, on.length ? selSkin[on[0]] : 0, x + tw / 2, y0 + 40 - pulse, 34, false);
    const ng = ctx.createLinearGradient(0, y0 + th - 30, 0, y0 + th); ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(1, 'rgba(0,0,0,0.9)'); ctx.fillStyle = ng; ctx.fillRect(x, y0 + th - 30 - pulse, tw, 30);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 10px ${HEAD}`; tracked(2); ctx.fillStyle = '#fff'; ctx.fillText(c.name.toUpperCase(), x + tw / 2 + 1, y0 + th - 11 - pulse);
    ctx.restore();
    ctx.strokeStyle = on.length ? (on.length > 1 ? '#ffd23f' : pcol(on[0])) : 'rgba(255,255,255,0.12)'; ctx.lineWidth = on.length ? 3 : 1; ctx.strokeRect(x + 0.5, y0 - pulse + 0.5, tw - 1, th - 1);
    on.forEach((s, k) => { ctx.fillStyle = pcol(s); ctx.fillRect(x + k * (tw / 2), y0 - pulse - 16, on.length > 1 ? tw / 2 : tw, 14);
      ctx.font = `600 10px ${HEAD}`; tracked(3); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label(s), x + k * (tw / 2) + (on.length > 1 ? tw / 4 : tw / 2) + 1, y0 - pulse - 9); });
  });
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(220,214,228,0.65)';
  const hint = gal ? 'A / D  Fighter      W / S  Skin      ESC  Back' : mode === 'online' ? (selDone[mySlot()] ? 'Waiting for your opponent to pick…' : '← →  Fighter      ↑ ↓  Skin      ENTER  Lock in')
    : (selCursor === 0 ? 'P1:  A / D  Fighter      W / S  Skin      ENTER  Lock in' : (mode === 'cpu' ? 'Now pick the CPU fighter  (A / D, W / S skin)' : mode === 'training' ? 'Now pick the training dummy  (A / D, W / S skin)' : 'P2:  ← →  Fighter      ↑ ↓  Skin      ENTER  Lock in'));
  ctx.fillText(hint, W / 2, H - 9); ctx.restore();
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
  if (hero && hero.done) { ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(hero, -20, -10, W + 40, H + 20); ctx.restore(); }
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,3,8,0.55)'); g.addColorStop(0.35, 'rgba(4,3,8,0.35)'); g.addColorStop(1, 'rgba(4,3,8,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `600 13px ${HEAD}`; tracked(6); ctx.fillStyle = '#e01b2b'; ctx.fillText('CHOOSE THE STAGE', 42, 40);
  ctx.font = `700 46px ${HEAD}`; tracked(4); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 18;
  ctx.fillText(cur < n ? STAGES[cur].name : 'RANDOM', 40, 82); ctx.shadowBlur = 0;
  ctx.font = '15px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(235,230,240,0.85)'; ctx.fillText(cur < n ? STAGE_DESC[STAGES[cur].id] || '' : 'Let fate pick the battlefield.', 42, 118);
  ctx.restore();
  // the grid
  const cols = 5, tw = 150, th = 84, gp = 10, x0 = W / 2 - (cols * tw + (cols - 1) * gp) / 2, y0 = 168;
  for (let i = 0; i <= n; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (tw + gp), y = y0 + r * (th + gp + 14), on = i === cur;
    ctx.save();
    if (i < n) { ctx.fillStyle = '#0c0910'; ctx.fillRect(x, y, tw, th); if (previews[i].done) ctx.drawImage(previews[i], x, y, tw, th); if (!on) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y, tw, th); } }
    else { const rg = ctx.createLinearGradient(x, y, x + tw, y + th); rg.addColorStop(0, '#2a0a12'); rg.addColorStop(1, '#0c0910'); ctx.fillStyle = rg; ctx.fillRect(x, y, tw, th);
      ctx.font = `700 44px ${HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.6)'; ctx.fillText('?', x + tw / 2, y + th / 2 + 2); }
    ctx.strokeStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = on ? 3 : 1; ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
    ctx.font = `600 11px ${HEAD}`; tracked(3); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = on ? '#ffd23f' : 'rgba(230,225,236,0.7)';
    ctx.fillText(i < n ? STAGES[i].name : 'RANDOM', x + 2, y + th + 9);
    ctx.restore();
  }
  ctx.save(); ctx.font = '12px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(220,214,228,0.65)'; ctx.textAlign = 'center';
  ctx.fillText(net.role === 'guest' ? 'Your opponent is choosing the stage…' : stageRoll ? 'Rolling…' : '← → ↑ ↓  Choose      ENTER  Fight      ESC  Back', W / 2, H - 14); ctx.restore();
}

function drawVs() {
  const t = 1 - vsT / 130, [a, b] = P;
  if (use3D()) R3D.renderSelect(true);
  else { ctx.fillStyle = '#050308'; ctx.fillRect(0, 0, W, H); drawPortrait(a.c, 230, 230, 120, false, a.skin); drawPortrait(b.c, W - 230, 230, 120, true, b.skin); }
  const g = ctx.createLinearGradient(0, H * 0.5, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
  vignette(0.75);
  const s = easeOut(t * 2.5);
  ctx.save(); ctx.globalAlpha = s; ctx.textBaseline = 'middle';
  [[a, 60, 'left'], [b, W - 60, 'right']].forEach(([f, x, al], i) => {
    const off = (1 - s) * 40 * (i ? 1 : -1);
    ctx.textAlign = al; ctx.font = `600 13px ${HEAD}`; tracked(6); ctx.fillStyle = f.c.color; ctx.fillText(f.c.title.toUpperCase(), x + off, 410);
    ctx.font = `700 40px ${HEAD}`; tracked(4); ctx.fillStyle = '#fff'; ctx.fillText(f.c.name.toUpperCase(), x + off, 446);
    ctx.fillStyle = f.c.color; ctx.fillRect(i ? x - 120 + off : x + off, 474, 120, 2);
  });
  ctx.textAlign = 'center'; ctx.font = `700 46px ${TITLE}`; tracked(6); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 24; ctx.fillText('VS', W / 2 + 3, 440);
  ctx.shadowBlur = 0; ctx.font = `500 12px ${HEAD}`; tracked(6); ctx.fillStyle = 'rgba(230,225,236,0.7)'; ctx.fillText(STAGES[stageId].name.toUpperCase(), W / 2 + 3, 482);
  ctx.restore();
  loadingEmblem(W - 64, 52, 'LOADING');
  if (vsT < 26) { ctx.fillStyle = `rgba(0,0,0,${1 - vsT / 26})`; ctx.fillRect(0, 0, W, H); }
}

function drawLobby() {
  drawSelectBg(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  bigText(screen === 'join' ? 'JOIN A ROOM' : net.mm ? 'MATCHMAKING' : 'ONLINE', 90, 50);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (screen === 'join') {
    ctx.font = '18px ' + BODY; ctx.fillStyle = '#ccc'; ctx.fillText('Type the 4-character room code your friend sent you', W / 2, 170);
    for (let i = 0; i < 4; i++) {
      const x = W / 2 - 150 + i * 80; ctx.fillStyle = '#1b1422'; ctx.fillRect(x, 210, 60, 80);
      ctx.strokeStyle = i === joinCode.length ? '#ff3fa4' : '#3a2c44'; ctx.lineWidth = 3; ctx.strokeRect(x, 210, 60, 80);
      ctx.fillStyle = '#fff'; ctx.font = `900 48px ${HEAD}`; ctx.fillText(joinCode[i] || '', x + 30, 252);
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
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.stroke();
  const a = frame / 9; ctx.strokeStyle = '#d4162a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 18, a, a + 1.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 12, -a * 0.7, -a * 0.7 + 0.9); ctx.stroke();
  ctx.font = `700 10px ${TITLE}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BP', 0, 1);
  ctx.font = `500 12px ${HEAD}`; tracked(5); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(230,225,236,0.85)'; ctx.fillText(label, -32, p == null ? 0 : -6);
  if (p != null) { ctx.font = '10px ' + BODY; tracked(1); ctx.fillStyle = 'rgba(230,225,236,0.5)'; ctx.fillText(Math.round(p * 100) + '%', -32, 9); }
  ctx.restore();
}
function tipText(i) {
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `600 11px ${HEAD}`; tracked(5); ctx.fillStyle = '#d4162a'; ctx.fillText('TIP', 48, H - 68);
  ctx.font = '14px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(232,228,238,0.85)'; ctx.fillText(TIPS[i % TIPS.length], 48, H - 46);
  ctx.restore();
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
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, H - 3, W, 3); ctx.fillStyle = '#c3121f'; ctx.fillRect(0, H - 3, W * LOAD.shown, 3);
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
  ctx.save(); ctx.fillStyle = 'rgba(10,8,16,0.92)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(224,27,43,${0.75 + 0.25 * pulse})`; ctx.fillRect(x, y, 4, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
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
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(W / 2 - 270, H - 76, 540, 40);
    ctx.fillStyle = '#ffd23f'; ctx.font = '16px ' + BODY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(toast.msg, W / 2, H - 56);
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
