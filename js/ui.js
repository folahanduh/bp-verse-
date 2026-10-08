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
  drawHead(c, px, 60, 32, R, 0);
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

function drawSuperFlash() {
  if (!superFlash) return;
  const f = P[superFlash.side], t = 1 - superFlash.t / 50, R = superFlash.side === 1;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.5 * Math.sin(Math.PI * Math.min(1, t * 1.1))})`; ctx.fillRect(0, 0, W, H);
  const slide = ease(t * 3) - ease((t - 0.8) * 5);
  ctx.globalAlpha = clamp(slide, 0, 1);
  ctx.fillStyle = f.c.color; ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(W, 180); ctx.lineTo(W, 300); ctx.lineTo(0, 340); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 12; i++) ctx.fillRect((frame * 30 + i * 90) % W, 180 + i * 13, 120, 2);
  drawPortrait(f.c, R ? W - 160 * slide : 160 * slide, 260, 90, R);
  ctx.textAlign = R ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.font = `italic 900 48px ${FONT}`;
  ctx.lineWidth = 7; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
  const tx = R ? W - 290 : 290, name = f.c.super.name.toUpperCase();
  ctx.strokeText(name, tx, 262); ctx.fillText(name, tx, 262);
  ctx.restore();
}

function drawFightScene() {
  drawWorldStage();
  ctx.save(); worldT(); if (P.length) drawFighters(); projs.forEach(drawProj); drawParts(); ctx.restore();
  STAGES[stageId].front();
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
  if (!matchOver) drawHUD();
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
  drawSuperFlash();
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

// ----- menus -----
const MENU = [
  ['VS CPU', 'Fight the computer.'],
  ['2 PLAYERS', 'Same keyboard, or plug in two controllers.'],
  ['ONLINE · HOST', 'Make a room and send the code to a friend.'],
  ['ONLINE · JOIN', "Type a friend's room code."],
  ['CONTROLS', 'Keys, controllers, combos and tips.'],
];
function embers() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const sp = 0.5 + (i % 5) * 0.25, y = H - ((frame * sp + i * 53) % (H + 40)), x = (i * 97 + Math.sin(frame / 50 + i) * 30) % W;
    ctx.fillStyle = `rgba(255,${120 + (i % 4) * 30},60,${0.25 + 0.4 * ((i * 7) % 10) / 10})`;
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
  }
  ctx.restore();
}
function drawLogo(cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `italic 900 104px ${FONT}`;
  const g = ctx.createLinearGradient(0, -50, 0, 50);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d6d6e6'); g.addColorStop(0.5, '#7a7a96'); g.addColorStop(1, '#f2f2ff');
  ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText('FIGHTER', -60, 0);
  ctx.fillStyle = g; ctx.fillText('FIGHTER', -60, 0);
  // shine sweep: a second pass with a moving bright band only lights the letters
  const sx = ((frame * 6) % 1400) - 700;
  const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillText('FIGHTER', -60, 0);
  ctx.font = `italic 900 92px ${FONT}`; ctx.shadowColor = '#ff2b2b'; ctx.shadowBlur = 24 + 10 * beat();
  ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText('1223', 285, 8); ctx.fillStyle = '#ff2b2b'; ctx.fillText('1223', 285, 8);
  ctx.restore();
}
function drawTitle() {
  drawFightScene();
  ctx.fillStyle = 'rgba(5,2,10,0.5)'; ctx.fillRect(0, 0, W, H); vignette(0.8); embers();
  drawLogo(W / 2, 170 - (1 - easeOut(screenT / 40)) * 120, 1);
  bigText('BP / VERITY CLUB', 248, 26, '#ffd6ee', '#3a0020');
  if (frame % 60 < 42) bigText('PRESS ENTER', 440, 32, '#ffd23f');
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#8a8094'; ctx.textAlign = 'right'; ctx.fillText('M: music ' + (musicOn ? 'on' : 'off'), W - 14, H - 12);
}
function drawMenu() {
  drawFightScene();
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(5,2,10,0.92)'); g.addColorStop(0.6, 'rgba(5,2,10,0.55)'); g.addColorStop(1, 'rgba(5,2,10,0.2)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); embers();
  drawLogo(230, 70, 0.5);
  MENU.forEach(([m], i) => {
    const k = easeOut((screenT - i * 4) / 18), on = i === menuIdx, y = 160 + i * 62, x = -380 + 400 * k + (on ? 18 : 0);
    quad([[x, y - 24], [x + 380, y - 24], [x + 360, y + 24], [x - 20, y + 24]]);
    ctx.fillStyle = on ? 'rgba(255,63,164,0.9)' : 'rgba(255,255,255,0.06)'; ctx.fill();
    if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.font = `italic 900 28px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? '#fff' : '#9a90a4'; ctx.fillText(m, x + 26, y + 1);
  });
  ctx.font = 'italic 18px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.fillText(MENU[menuIdx][1], 40, 480);
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#8a8094';
  ctx.fillText('W/S or ↑/↓ · Enter to choose · M: music ' + (musicOn ? 'on' : 'off'), 40, 515);
}
function drawControls() {
  drawFightScene(); ctx.fillStyle = 'rgba(5,3,8,0.85)'; ctx.fillRect(0, 0, W, H);
  bigText('CONTROLS', 50, 44);
  const rows = [['', 'PLAYER 1', 'PLAYER 2', 'CONTROLLER'], ['Move', 'A / D', '← / →', 'D-pad / stick'], ['Dash', 'tap A A / D D', 'tap ← ← / → →', 'tap twice'], ['Jump', 'W', '↑', 'Up'],
    ['Block', 'S (hold)', '↓ (hold)', 'Down'], ['Punch', 'F', 'K', 'X / □'], ['Kick', 'G', 'L', 'A / ✕'], ['Skill (1 bar)', 'H', 'J', 'Y / △'], ['Super (4 bars)', 'T', 'I', 'B / ○ or RB']];
  rows.forEach((r, i) => {
    ctx.font = (i ? '' : 'bold ') + '17px sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#aaa'; ctx.fillText(r[0], 120, 100 + i * 33);
    ctx.textAlign = 'center';
    ctx.fillStyle = i ? '#fff' : '#3b8cff'; ctx.fillText(r[1], 420, 100 + i * 33);
    ctx.fillStyle = i ? '#fff' : '#ff2b2b'; ctx.fillText(r[2], 600, 100 + i * 33);
    ctx.fillStyle = i ? '#fff' : '#ffd23f'; ctx.fillText(r[3], 790, 100 + i * 33);
  });
  ctx.textAlign = 'center'; ctx.font = '14px sans-serif'; ctx.fillStyle = '#ffd23f';
  ctx.fillText('Punch ×4: jab, cross, hook, uppercut · Down+Punch uppercut · Forward+Punch body hook · Down+Kick sweep · Forward+Kick roundhouse', W / 2, 410);
  ctx.fillText('Tiny D Ryan: Forward+Punch = sword thrust. Two health bars: lose the gold one and you fight on in red CRITICAL. Meter fills as you fight.', W / 2, 434);
  ctx.fillText('Tall fighters reach further; their punches go over short fighters, who must be kicked.', W / 2, 458);
  ctx.fillStyle = '#8a8094'; ctx.fillText('Esc to go back · Esc in a fight to pause', W / 2, 505);
}

// character select: full-body fighters on spotlights
const selDummy = [null, null];
function dummyFor(slot) {
  let d = selDummy[slot];
  if (!d || d.ci !== sel[slot]) { d = selDummy[slot] = makeFighter(sel[slot], slot); d.flash = 6; }
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
  bigText('CHOOSE YOUR FIGHTER', 32, 34);
  const label = s => mode === 'cpu' && s === 1 ? 'CPU' : mode === 'online' ? (s === mySlot() ? 'YOU' : 'THEM') : 'P' + (s + 1);
  [0, 1].forEach(s => {
    const active = mode === 'online' || s <= selCursor || selDone[s], c = CHARS[sel[s]];
    ctx.globalAlpha = active ? 1 : 0.35;
    const d = dummyFor(s);
    drawFighterAt(d, s ? 820 : 140, 372, 1.18 * Math.pow(136 / d.h, 0.35));
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
  // portrait row
  const n = CHARS.length, tw = 104, x0 = W / 2 - (n * tw + (n - 1) * 10) / 2;
  CHARS.forEach((c, i) => {
    const x = x0 + i * (tw + 10), y = 400, on = [0, 1].filter(s => sel[s] === i && (mode === 'online' || s <= selCursor || selDone[s]));
    const pts = [[x + 12, y], [x + tw + 12, y], [x + tw, y + 96], [x, y + 96]];
    quad(pts); ctx.fillStyle = '#140c1a'; ctx.fill();
    ctx.save(); quad(pts); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + 96); g.addColorStop(0, rgba(c.color, on.length ? 0.6 : 0.2)); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(x, y, tw + 12, 96);
    drawHead(c, x + tw / 2 + 6, y + 52 + (on.length ? Math.sin(frame / 8) * 2 : 0), 38, false, 0);
    ctx.restore();
    quad(pts); ctx.strokeStyle = on.length ? '#fff' : c.color; ctx.lineWidth = on.length ? 3 : 1.5; ctx.stroke();
    on.forEach((s, k) => {
      const tx = x + 6 + k * 54; ctx.fillStyle = s === 0 ? '#3b8cff' : '#ff2b2b'; ctx.fillRect(tx + 8, y - 16, 46, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label(s), tx + 31, y - 8);
    });
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '13px sans-serif'; ctx.fillStyle = '#8a8094';
  const hint = mode === 'online' ? (selDone[mySlot()] ? 'Waiting for your opponent to pick...' : '←/→ or A/D to choose · Enter to lock in')
    : (selCursor === 0 ? 'P1: A/D to choose · Enter to lock in' : (mode === 'cpu' ? 'Now pick the CPU fighter' : 'P2: ←/→ to choose · Enter to lock in'));
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
  drawPortrait(a.c, lerp(-150, 230, s), 230, 135, false);
  drawPortrait(b.c, lerp(W + 150, W - 230, s), 230, 135, true);
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
  if (code === 'KeyM' && screen !== 'join' && !(screen === 'fight' && !matchOver && !paused)) { musicOn = !musicOn; return; }
  if (screen === 'fight' && !matchOver && !net.role) {
    if (code === 'Escape' || (paused && isOk(code))) { paused = !paused; return; }
    if (paused && code === 'KeyQ') { toMenu(); return; }
    return;
  }
  if (code === 'Escape') { if (screen !== 'title') toMenu(); return; }
  if (screen === 'title') { if (isOk(code)) { setScreen('mode'); sfx('confirm'); } }
  else if (screen === 'mode') {
    if (isUp(code)) { menuIdx = (menuIdx + MENU.length - 1) % MENU.length; sfx('select'); }
    if (isDown(code)) { menuIdx = (menuIdx + 1) % MENU.length; sfx('select'); }
    if (isOk(code)) {
      sfx('confirm');
      if (menuIdx === 0) { mode = 'cpu'; goSelect(); }
      else if (menuIdx === 1) { mode = 'local'; goSelect(); }
      else if (menuIdx === 2) hostRoom();
      else if (menuIdx === 3) { setScreen('join'); joinCode = ''; }
      else setScreen('controls');
    }
  }
  else if (screen === 'join') {
    if (code === 'Backspace') joinCode = joinCode.slice(0, -1);
    else if (isOk(code) && joinCode.length === 4) joinRoom(joinCode);
    else if (key && key.length === 1 && /[a-z0-9]/i.test(key) && joinCode.length < 4) joinCode += key.toUpperCase();
  }
  else if (screen === 'select') {
    const slot = mode === 'online' ? mySlot() : selCursor;
    if (selDone[slot]) return;
    const keysOk = mode !== 'local' || (slot === 0 ? !code.startsWith('Arrow') : !['KeyA', 'KeyD'].includes(code));
    if (keysOk && isLeft(code)) { sel[slot] = (sel[slot] + 4) % 5; sfx('select'); }
    if (keysOk && isRight(code)) { sel[slot] = (sel[slot] + 1) % 5; sfx('select'); }
    if (isOk(code) || (slot === 0 && code === 'KeyF') || (slot === 1 && code === 'KeyK')) {
      selDone[slot] = true; sfx('confirm');
      if (mode === 'online') {
        send({ t: 'cur', ci: sel[slot], done: true });
        if (net.role === 'host' && selDone[0] && selDone[1]) { setScreen('stage'); send({ t: 'stage' }); }
        return;
      }
      if (slot === 0) selCursor = 1; else { stageCursor = stageId; setScreen('stage'); }
    }
    if (mode === 'online' && (isLeft(code) || isRight(code))) send({ t: 'cur', ci: sel[slot], done: false });
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

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
