// ---------- SQUADS: the party lobby, joining by code, and the match's HUD ----------
const SQ_SCREENS = ['sqlobby', 'sqcode'];
const sqCode = { s: '' };
const SQ_ROWS = ['CHAMPION', 'TEAM', 'TEAM SIZE', 'MODE', 'STAGE', 'BOTS', 'BOT LEVEL', 'START'];
const sqIsHost = () => SQ.role === 'solo' || SQ.role === 'host';
function sqMeL() { return SQ.L && SQ.L.players.find(p => p.id === SQ.me); }
function drawSqLobby() {
  drawMenuBg(); const L = SQ.L, host = sqIsHost();
  uiHeader('SQUADS', SQ.role === 'solo' ? '3D TEAM FIGHT · VS BOTS' : SQ.role === 'host' ? 'YOUR PARTY · CODE ' + SQ.code : 'PARTY ' + (SQ.code || ''), { accent: '#3ddc84' });
  if (!L) { uiPanel(56, 120, 520, 90, { alpha: 0.8 }); capsText(SQ.status || 'Joining…', 76, 165, 13, '#fff', { weight: 700, track: 2 }); uiPrompts([['ESC', 'LEAVE']]); return; }
  // settings on the left
  const me = sqMeL(), x0 = 52, vals = [me ? CHARS[me.ci].name.toUpperCase() : '—', me ? SQ_TEAMS[me.team].name : '—', L.size + ' V ' + L.size, SQ_MODES[L.mode].name, STAGES[L.stage] ? STAGES[L.stage].name + (sqMapFor(L.stage, L.size) === SQ_BIG ? '  ·  BIG' : '') : '', L.bots ? 'ON' : 'OFF', DIFFS[L.diff].name, ''];
  SQ_ROWS.forEach((r, i) => { const can = i < 2 || host, y = 104 + i * 38, on = SQ.row === i;
    const nv = stepKeys(SQ.row, i, 'ArrowDown', 'ArrowUp'); hit(x0, y, 300, 32, nv.concat(i === 7 || i >= 5 ? ['Enter'] : ['ArrowRight']), nv);
    uiMenuItem(x0, y, 300, 32, r === 'START' ? (host ? 'START MATCH' : 'WAITING FOR THE HOST') : r, on, (screenT - i * 3) / 16, i === 7 ? '' : (on && can ? '◀ ' + vals[i] + ' ▶' : vals[i]), { size: 14, disabled: !can, accent: i === 7 ? '#3ddc84' : undefined, light: i === 7 ? '#c9ffe0' : undefined }); });
  ctx.save(); ctx.font = '12px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(SQ_MODES[L.mode].desc, x0 + 6, 418, 300, 15); ctx.restore();
  if (SQ.status) capsText(SQ.status.toUpperCase(), x0 + 6, 462, 9, '#3ddc84', { weight: 800, track: 2 });
  capsText(touch.on ? 'LEFT THUMB MOVES · DRAG ON THE RIGHT TO LOOK' : keyName(MAP1.up) + keyName(MAP1.left) + keyName(MAP1.down) + keyName(MAP1.right) + ' MOVE · MOUSE / ARROWS LOOK · ' + keyName(MAP1.jump) + ' JUMP · ' + keyName(MAP1.block) + ' BLOCK · TAB SCORES', x0 + 6, 480, 8, 'rgba(214,224,240,0.55)', { weight: 700, track: 1 });
  // the two teams
  const roster = SQ.role === 'guest' ? L.players.map(p => Object.assign({ bot: false }, p)) : sqRoster(L);
  [0, 1].forEach(t => {
    const tx = 380 + t * 292, list = roster.filter(p => p.team === t), T2 = SQ_TEAMS[t];
    uiPanel(tx, 100, 280, 52 + Math.max(L.size, list.length) * 54, { accent: T2.col, accentTop: 1, alpha: 0.8 });
    chromeText(T2.name + ' TEAM', tx + 16, 122, 18, { weight: 900, track: 3, glow: rgba(T2.col, 0.5) });
    capsText(list.filter(p => !p.bot).length + ' PLAYER' + (list.filter(p => !p.bot).length === 1 ? '' : 'S'), tx + 264, 122, 9, T2.col, { align: 'right', weight: 800, track: 3 });
    for (let i = 0; i < Math.max(L.size, list.length); i++) {
      const p = list[i], y = 142 + i * 54;
      if (!p) { capsText(L.bots ? 'BOT' : 'EMPTY SLOT', tx + 140, y + 24, 10, 'rgba(214,224,240,0.35)', { align: 'center', weight: 800, track: 5 }); continue; }
      const c = CHARS[p.ci]; hexPortrait(c, 0, tx + 34, y + 24, 20);
      capsText((p.bot ? 'BOT · ' : '') + (p.bot ? c.short || c.name : acctName(p)).toUpperCase(), tx + 64, y + 15, 12, p.id === SQ.me ? '#ffd23f' : '#fff', { weight: 800, track: 1 });
      capsText(c.name.toUpperCase() + (p.lv ? '  ·  LV ' + p.lv : ''), tx + 64, y + 33, 9, 'rgba(214,224,240,0.6)', { weight: 700, track: 2 });
    }
  });
  const pr = [['↑ ↓', 'CHOOSE'], ['← →', 'CHANGE']]; if (host) pr.push(['ENTER', SQ.row === 7 ? 'START' : 'NEXT']); if (SQ.role === 'host') pr.push(['I', 'INVITE']); pr.push(['ESC', SQ.role === 'solo' ? 'BACK' : 'LEAVE']);
  uiPrompts(pr);
  if (SQ.pick) drawSqPick();
}
// invite an online friend to your party
function drawSqPick() {
  const L = (acct ? acct.friends : []).filter(f => f.st === 'friend' && social.info[fkey(f)] && social.info[fkey(f)].on);
  ctx.save(); ctx.fillStyle = 'rgba(3,4,9,0.7)'; ctx.fillRect(0, 0, W, H);
  uiPanel(W / 2 - 200, 130, 400, 70 + Math.max(1, L.length) * 34, { accent: '#3ddc84', accentTop: 1 });
  chromeText('INVITE A FRIEND', W / 2, 156, 18, { align: 'center', weight: 900, track: 3 });
  if (!L.length) capsText('NO FRIENDS ONLINE RIGHT NOW', W / 2, 196, 11, 'rgba(214,224,240,0.6)', { align: 'center', weight: 700, track: 3 });
  L.forEach((f, i) => uiMenuItem(W / 2 - 180, 180 + i * 34, 360, 30, acctName(f).toUpperCase(), SQ.pick.i === i, 1, '', { size: 14 }));
  ctx.restore();
}
function drawSqCode() {
  drawMenuBg(); uiHeader('JOIN A PARTY', 'SQUADS', { accent: '#3ddc84' });
  uiPanel(W / 2 - 220, 150, 440, 150, { accent: '#3ddc84', glow: '#3ddc84' });
  capsText('TYPE THE 4-LETTER PARTY CODE', W / 2, 180, 11, '#3ddc84', { align: 'center', weight: 800, track: 4 });
  chromeText((sqCode.s + '____').slice(0, 4).split('').join(' '), W / 2, 238, 48, { align: 'center', weight: 900, track: 6 });
  uiPrompts([['ENTER', 'JOIN'], ['ESC', 'BACK']]);
}
function sqPress(code, key) {
  if (screen === 'sqcode') {
    if (code === 'Escape') { setScreen('play'); return true; }
    if (code === 'Backspace') { sqCode.s = sqCode.s.slice(0, -1); return true; }
    if (isOk(code) && code !== 'Space') { if (sqCode.s.length === 4) sqJoin(sqCode.s); else sfx('back'); return true; }
    if (key && key.length === 1 && /[a-z0-9]/i.test(key) && sqCode.s.length < 4) { sqCode.s += key.toUpperCase(); sfx('tick'); }
    return true;
  }
  if (screen === 'sqlobby') {
    const L = SQ.L, host = sqIsHost();
    if (SQ.pick) { const F = (acct ? acct.friends : []).filter(f => f.st === 'friend' && social.info[fkey(f)] && social.info[fkey(f)].on);
      if (code === 'Escape') SQ.pick = null; else if (isUp(code)) SQ.pick.i = Math.max(0, SQ.pick.i - 1); else if (isDown(code)) SQ.pick.i = Math.min(F.length - 1, SQ.pick.i + 1);
      else if (isOk(code) && F[SQ.pick.i]) { socialSend(F[SQ.pick.i], { t: 'sqinv', code: SQ.code }); toast = { msg: 'Invited ' + acctName(F[SQ.pick.i]), t: 160 }; SQ.pick = null; sfx('confirm'); } return true; }
    if (code === 'Escape') { if (SQ.role === 'solo') { sqLeave(true); setScreen('play'); } else if (SQ.leave) { sqLeave(); setScreen('play'); } else { SQ.leave = 1; toast = { msg: 'Press Esc again to leave the party', t: 120 }; setTimeout(() => { SQ.leave = 0; }, 2000); } return true; }
    if (code === 'KeyI' && SQ.role === 'host') { SQ.pick = { i: 0 }; socialPoll(); return true; }
    if (!L) return true;
    const n = SQ_ROWS.length; if (isUp(code)) { SQ.row = (SQ.row + n - 1) % n; sfx('select'); return true; } if (isDown(code)) { SQ.row = (SQ.row + 1) % n; sfx('select'); return true; }
    const lr = isLeft(code) ? -1 : isRight(code) ? 1 : 0, me = sqMeL(), r = SQ_ROWS[SQ.row];
    if (r === 'CHAMPION' && (lr || isOk(code)) && me) { me.ci = (me.ci + (lr || 1) + CHARS.length) % CHARS.length; sfx('select'); if (SQ.role === 'guest') SQ.hostConn && SQ.hostConn.send({ t: 'sqpick', ci: me.ci }); else sqLobbySend(); return true; }
    if (r === 'TEAM' && (lr || isOk(code)) && me) { if (SQ.role === 'guest') SQ.hostConn && SQ.hostConn.send({ t: 'sqteam' }); else { me.team = 1 - me.team; sqLobbySend(); } sfx('toggle'); return true; }
    if (!host) return true;
    if (r === 'TEAM SIZE' && lr) { const need = Math.max(...[0, 1].map(t => L.players.filter(p => p.team === t).length), 1); L.size = clamp(L.size + lr, need, 5); }
    else if (r === 'MODE' && lr) L.mode = (L.mode + lr + SQ_MODES.length) % SQ_MODES.length;
    else if (r === 'STAGE' && lr) L.stage = (L.stage + lr + STAGES.length) % STAGES.length;
    else if (r === 'BOTS' && (lr || isOk(code))) L.bots = !L.bots;
    else if (r === 'BOT LEVEL' && (lr || isOk(code))) L.diff = (L.diff + (lr || 1) + 4) % 4;
    else if (r === 'START' && isOk(code)) { sqStart(); return true; }
    else if (isOk(code)) { SQ.row = Math.min(n - 1, SQ.row + 1); sfx('select'); return true; }
    else return true;
    sfx('toggle'); sqLobbySend(); return true;
  }
  if (screen === 'squad3d') {
    const G = SQ.G;
    if (G && G.ph === 'end' && G.pt > 90 && (isOk(code) || code === 'Escape')) { if (sqIsHost()) sqBackToLobby(); else if (code === 'Escape') { sqLeave(); setScreen('play'); } return true; }
    if (code === 'Escape') { if (SQ.menu) SQ.menu = 0; else SQ.menu = 1; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} return true; }
    if (SQ.menu && code === 'KeyQ') { SQ.menu = 0; if (SQ.role === 'solo') { sqLeave(true); setScreen('play'); } else if (SQ.role === 'host') sqBackToLobby(); else { sqLeave(); setScreen('play'); } return true; }
    if (SQ.menu && isOk(code)) { SQ.menu = 0; return true; }
    return true;
  }
  return false;
}

// ---- the match: the 3D world, then the HUD over it ----
function drawSquad3D() {
  const G = SQ.G; if (!G) return;
  const heads = window.R3D && R3D.renderSquad ? R3D.renderSquad(G) : null;
  const me = sqP(SQ.me), T0 = me ? me.team : 0;
  // name tags with health over everyone (enemies red, team blue, you none)
  if (heads) for (const p of G.players) {
    const h = heads[p.id]; if (!h || !h.vis || p.id === SQ.me || !p.alive) continue;
    const ally = p.team === T0, col = SQ_TEAMS[p.team].col, w = 56, k = clamp(p.hp / p.maxHp, 0, 1), a = clamp(1.6 - h.d / 16, 0.35, 1);
    ctx.save(); ctx.globalAlpha = a;
    capsText((p.bot ? '' : '') + p.name.toUpperCase(), h.x, h.y - 18, 9, ally ? '#cfe6ff' : '#ffd0d6', { align: 'center', weight: 800, track: 1 });
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(h.x - w / 2 - 1, h.y - 10, w + 2, 6); ctx.fillStyle = col; ctx.fillRect(h.x - w / 2, h.y - 9, w * k, 4);
    if (!ally) { ctx.beginPath(); ctx.moveTo(h.x - 5, h.y - 1); ctx.lineTo(h.x + 5, h.y - 1); ctx.lineTo(h.x, h.y + 6); ctx.fillStyle = col; ctx.fill(); }
    ctx.restore();
  }
  // damage numbers
  if (heads && heads.nums) for (const n of heads.nums) { ctx.save(); ctx.globalAlpha = clamp(1.6 - n.t / 32, 0, 1); ctx.font = `italic 900 ${n.big ? 22 : 15}px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(n.s, n.x, n.y - n.t * 0.6); ctx.fillStyle = n.c; ctx.fillText(n.s, n.x, n.y - n.t * 0.6); ctx.restore(); }
  // the crosshair
  if (me && me.alive && G.ph !== 'end') { const cy = heads && heads.fp ? H / 2 : H * 0.45; ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W / 2, cy, 5, 0, 7); ctx.stroke(); ctx.restore(); }
  sqHudTop(G, T0); sqHudMe(G, me); sqHudFeed(G); sqMiniMap(G, me);
  // banners
  const B = G.banner; if (B && B.t < 150) { const k = easeOut(clamp(B.t / 10, 0, 1)), out = clamp((150 - B.t) / 20, 0, 1); ctx.save(); ctx.globalAlpha = Math.min(k, out);
    chromeText(B.txt, W / 2, H * 0.36, 46 * (1.25 - 0.25 * k), { align: 'center', weight: 900, track: 6, glow: rgba(B.col || '#3ea6ff', 0.5) }); if (B.sub) capsText(B.sub, W / 2, H * 0.36 + 40, 12, '#fff', { align: 'center', weight: 800, track: 5 }); ctx.restore(); }
  if (me && !me.alive && G.ph === 'fight') { const t = SQ_MODES[G.mode].id === 'elim' ? 'KNOCKED OUT · SPECTATING YOUR TEAM' : 'BACK IN ' + Math.ceil(me.resT / 60); uiPanel(W / 2 - 160, H - 150, 320, 34, { accent: '#ff3b5c', alpha: 0.85 }); capsText(t, W / 2, H - 133, 11, '#fff', { align: 'center', weight: 800, track: 3 }); }
  if (G.ph === 'intro' && G.pt < 200) { const left = Math.ceil(((G.rd === 1 && G.t < 400 ? 200 : 140) - G.pt) / 60); if (left <= 3 && left > 0) chromeText(String(left), W / 2, H * 0.52, 56, { align: 'center', weight: 900 }); }
  if (KEYS.Tab || G.ph === 'end') sqScoreboard(G, T0);
  if (G.ph === 'end') sqEndCard(G, me);
  if (SQ.menu) { ctx.save(); ctx.fillStyle = 'rgba(3,4,9,0.7)'; ctx.fillRect(0, 0, W, H); uiPanel(W / 2 - 170, 170, 340, 150, { accent: UI.blue, accentTop: 1 }); chromeText('PAUSED', W / 2, 206, 30, { align: 'center', weight: 900, track: 8 });
    capsText(SQ.role === 'solo' ? 'THE MATCH CARRIES ON' : 'THE MATCH CARRIES ON ONLINE', W / 2, 236, 9, 'rgba(214,224,240,0.6)', { align: 'center', weight: 700, track: 3 }); ctx.restore(); uiPrompts([['ENTER', 'RESUME'], ['Q', SQ.role === 'host' ? 'END MATCH' : 'LEAVE'], ['ESC', 'RESUME']]); }
  else if (G.ph !== 'end') uiPrompts([['U', CAMFP.on ? '3RD PERSON' : '1ST PERSON'], ['TAB', 'SCORES'], ['ESC', 'MENU']], { left: document.pointerLockElement === cv ? '' : touch.on ? 'Drag on the right to turn the camera' : 'Click the game to aim with the mouse · arrows turn the camera' });
}
function sqHudTop(G, T0) {
  const md = SQ_MODES[G.mode].id, cx = W / 2;
  uiPanel(cx - 150, 10, 300, 44, { alpha: 0.82, cut: 10 });
  for (const t of [0, 1]) { const x = t ? cx + 70 : cx - 70, col = SQ_TEAMS[t].col;
    const val = md === 'elim' ? G.sc[t] : md === 'ctrl' ? Math.floor(G.cap[t]) + '%' : G.kos[t];
    chromeText(String(val), x, 32, 22, { align: 'center', weight: 900, glow: rgba(col, 0.5) }); capsText(SQ_TEAMS[t].name, x + (t ? 40 : -40), 32, 9, col, { align: 'center', weight: 800, track: 2 }); }
  const sub = md === 'elim' ? (G.ph === 'fight' ? Math.floor(G.rt / 3600) + ':' + String(Math.floor(G.rt / 60) % 60).padStart(2, '0') : 'ROUND ' + G.rd) : md === 'ctrl' ? (G.contest ? 'CONTESTED' : G.owner != null ? SQ_TEAMS[G.owner].name + ' HOLDS' : 'TAKE THE POINT') : 'FIRST TO ' + G.target;
  capsText(sub, cx, 32, 10, G.contest ? '#ffd23f' : '#fff', { align: 'center', weight: 800, track: 2 });
  if (md === 'ctrl') for (const t of [0, 1]) { const y = 58 + t * 7, k = G.cap[t] / 100; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - 150, y, 300, 5); ctx.fillStyle = SQ_TEAMS[t].col; ctx.fillRect(cx - 150, y, 300 * k, 5); }
  // the teams down the sides: a face each, health, out = dim
  for (const t of [0, 1]) { const list = G.players.filter(p => p.team === t);
    list.forEach((p, i) => { const x = t ? W - 40 - i * 46 : 40 + i * 46, y = 34, k = clamp(p.hp / p.maxHp, 0, 1);
      ctx.save(); ctx.globalAlpha = p.alive ? 1 : 0.35; hexPortrait(p.f.c, 0, x, y, 17, { ring: p.id === SQ.me ? '#ffd23f' : SQ_TEAMS[t].col });
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 17, y + 22, 34, 4); ctx.fillStyle = SQ_TEAMS[t].col; ctx.fillRect(x - 17, y + 22, 34 * k, 4); ctx.restore();
      if (!p.alive && p.resT > 0) capsText(String(Math.ceil(p.resT / 60)), x, y + 1, 12, '#fff', { align: 'center', weight: 900, track: 0 }); }); }
}
// your own HUD: who you are, health, stamina and super down the bottom left; every button you can press
// (skill, ranged, abilities, super) big along the bottom right, each with its key and its cooldown
function sqHudMe(G, me) {
  if (!me) return;
  const c = me.f.c, r = roleOf(me.f), R = ROLES[r], A = abilOf(me.f), k = clamp(me.hp / me.maxHp, 0, 1), x = 92, y = touch.on ? 84 : H - 124; // (a touch screen: up top, clear of the stick)
  hexPortrait(c, 0, 52, y + 40, 28, { ring: SQ_TEAMS[me.team].col });
  const nw = capsText(c.name.toUpperCase(), x, y + 6, 12, '#fff', { weight: 800, track: 2 }); capsText(R.icon + ' ' + R.name, x + nw + 12, y + 6, 9, R.col, { weight: 900, track: 2 });
  // health (and a shield over it)
  slant(x, y + 16, 260, 16, 6); ctx.fillStyle = 'rgba(4,6,12,0.85)'; ctx.fill(); ctx.save(); slant(x, y + 16, 260, 16, 6); ctx.clip();
  const g = ctx.createLinearGradient(0, y + 16, 0, y + 32); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#ffd23f'); g.addColorStop(1, '#b8860b'); ctx.fillStyle = k > 0.3 ? g : '#ff3b3b'; ctx.fillRect(x, y + 16, 266 * k, 16);
  if (me.shield > 0) { ctx.fillStyle = rgba(ROLES.frontline.col, 0.85); ctx.fillRect(x, y + 16, Math.min(266, 266 * me.shield / me.maxHp), 5); } ctx.restore();
  capsText(Math.ceil(me.hp) + ' / ' + me.maxHp, x + 274, y + 24, 10, '#fff', { weight: 900, track: 1 });
  // stamina, super
  const st = clamp(me.sta / 100, 0, 1); slant(x, y + 37, 200, 7, 4); ctx.fillStyle = 'rgba(4,6,12,0.85)'; ctx.fill(); ctx.save(); slant(x, y + 37, 200, 7, 4); ctx.clip(); ctx.fillStyle = st < 0.25 ? (frame % 20 < 10 ? '#ff5a3a' : '#a83a20') : '#3ddc84'; ctx.fillRect(x, y + 37, 204 * st, 7); ctx.restore();
  capsText(st < 0.25 ? 'WORN OUT' : 'STAMINA', x + 208, y + 41, 8, st < 0.25 ? '#ff7a5a' : 'rgba(214,224,240,0.6)', { weight: 800, track: 2 });
  uiMeter(x, y + 50, 200, 8, me.meter / 100, '#3ea6ff', { segs: 4, full: me.meter >= 99.5 }); capsText('SUPER', x + 208, y + 54, 8, me.meter >= 99.5 ? '#ffd23f' : 'rgba(214,224,240,0.6)', { weight: 800, track: 2 });
  // what's happening to you
  const out = me.outnum || G.t - me.outT < 60, warn = out ? ['OUTNUMBERED  ·  TAKING LESS DAMAGE', '#ffd23f'] : me.slowT > 0 ? ['SLOWED', '#2ee6c8'] : me.ccImm > 0 ? ['STEADY  ·  CAN\'T BE KNOCKED DOWN', '#9fc4ff'] : null;
  if (warn) capsText(warn[0], x, touch.on ? y + 84 : y - 10, 9, warn[1], { weight: 900, track: 2 });
  // the buttons, bottom right (a touch screen has its own, so leave them off there)
  if (touch.on) return;
  const btns = [['skill', MAP1.skill, 'SKILL', me.skillCd, me.skillMax, c.color, c.skill.name], ['range', MAP1.range, 'RANGED', me.rangeCd, RANGE_CD, '#9fc4ff', rangedOf(me.f)[1]], ['abil', MAP1.abil, 'ABILITY', me.abilCd, ABIL_CD[r], R.col, A.a1[0]]];
  if (r === 'flank') btns.push(['abil2', MAP1.abil2, 'ABILITY 2', me.abil2Cd, ABIL2_CD, R.col, A.a2 ? A.a2[0] : 'TRIP']);
  btns.push(['super', MAP1.super, 'SUPER', me.meter >= 99.5 ? 0 : 100 - me.meter, 100, '#ffd23f', c.super.name]);
  btns.forEach(([id, key, label, cd, max, col, name], i) => { const bx = W - 52 - (btns.length - 1 - i) * 70, by = H - 104, ok = cd <= 0, big = id === 'super';
    const rad = big ? 27 : 24; hexPath(bx, by, rad + 4); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
    hexPath(bx, by, rad); ctx.fillStyle = ok ? rgba(col, 0.9) : 'rgba(5,8,14,0.9)'; ctx.fill();
    if (!ok) { ctx.save(); hexPath(bx, by, rad); ctx.clip(); ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, rad + 6, -Math.PI / 2, -Math.PI / 2 + (1 - cd / (max || 1)) * Math.PI * 2); ctx.closePath(); ctx.fillStyle = rgba(col, 0.38); ctx.fill(); ctx.restore(); }
    hexPath(bx, by, rad); ctx.lineWidth = 2.5; ctx.strokeStyle = ok ? '#fff' : chromeGrad(by - rad, by + rad); ctx.stroke();
    if (ok && frame % 50 < 25) { hexPath(bx, by, rad + 5); ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 2; ctx.stroke(); }
    if (ok) capsText(label, bx, by + 1, label.length > 7 ? 8 : 9, '#05070c', { align: 'center', weight: 900, track: 1 });
    else capsText(big ? Math.floor(me.meter) + '%' : String(Math.ceil(cd / 60)), bx, by + 1, big ? 12 : 15, '#fff', { align: 'center', weight: 900, track: 0 });
    keyCap(bx, by - rad - 10, keyName(key), { center: 1 });
    capsText(name.toUpperCase(), bx, by + rad + 11, 7, ok ? '#fff' : 'rgba(214,224,240,0.55)', { align: 'center', weight: 800, track: 1 }); });
}
// the big map's minimap (top right, under the team): the blocks, your team, the point, and enemies your team can see
function sqMiniMap(G, me) {
  const Mp = SQ.map; if (!Mp || !me) return;
  const w = 168, h = w * Mp.hz / Mp.hx, x0 = W - w - 14, y0 = 74, sx = w / (Mp.hx * 2), sz = h / (Mp.hz * 2), X = x => x0 + (x + Mp.hx) * sx, Z = z => y0 + (z + Mp.hz) * sz;
  ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(4,6,12,0.72)'; ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6); ctx.strokeStyle = 'rgba(160,190,230,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 3, y0 - 3, w + 6, h + 6);
  for (const b of Mp.boxes) { ctx.fillStyle = b[5] === 'b' ? 'rgba(150,160,185,0.55)' : b[5] === 'w' ? 'rgba(120,150,200,0.6)' : 'rgba(110,120,140,0.45)'; ctx.fillRect(X(b[0] - b[2] / 2), Z(b[1] - b[3] / 2), Math.max(1, b[2] * sx), Math.max(1, b[3] * sz)); }
  for (const t of [0, 1]) { ctx.fillStyle = rgba(SQ_TEAMS[t].col, 0.18); const bx = t ? X(Mp.base) : X(-Mp.hx); ctx.fillRect(bx, y0, (Mp.hx - Mp.base) * sx, h); }
  if (SQ_MODES[G.mode].id === 'ctrl') { ctx.beginPath(); ctx.arc(X(0), Z(0), 2.6 * sx, 0, 7); ctx.strokeStyle = G.owner != null ? SQ_TEAMS[G.owner].col : '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  const mates = G.players.filter(q => q.team === me.team && q.alive), seen = e => mates.some(q => Math.hypot(q.x - e.x, q.z - e.z) < 12) || G.t - e.cbt < 120;
  for (const p of G.players) { if (!p.alive || (p.team !== me.team && !seen(p))) continue; const px = X(p.x), pz = Z(p.z);
    if (p === me) { const [fx2, fz2] = fwdOf(SQ.cam.yaw); ctx.beginPath(); ctx.moveTo(px + fx2 * 6, pz + fz2 * 6); ctx.lineTo(px - fz2 * 3.5 - fx2 * 3, pz + fx2 * 3.5 - fz2 * 3); ctx.lineTo(px + fz2 * 3.5 - fx2 * 3, pz - fx2 * 3.5 - fz2 * 3); ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(px, pz, 2.6, 0, 7); ctx.fillStyle = SQ_TEAMS[p.team].col; ctx.fill(); } }
  ctx.restore();
}
function sqHudFeed(G) {
  G.feed.forEach((e, i) => { const a = clamp((360 - (G.t - e.t)) / 60, 0, 1); if (a <= 0) return; const y = (SQ.map ? 196 : 76) + i * 20; ctx.save(); ctx.globalAlpha = a;
    const w = capsText(e.v.toUpperCase(), W - 20, y, 10, SQ_TEAMS[e.vt].col, { align: 'right', weight: 800, track: 1 }), w2 = capsText(' K.O. ', W - 24 - w, y, 9, '#fff', { align: 'right', weight: 700, track: 1 });
    capsText(e.k.toUpperCase(), W - 28 - w - w2, y, 10, e.kt >= 0 ? SQ_TEAMS[e.kt].col : '#fff', { align: 'right', weight: 800, track: 1 }); ctx.restore(); });
}
function sqScoreboard(G, T0) {
  const x = W / 2 - 300, y = 96; uiPanel(x, y, 600, 40 + G.players.length * 24, { alpha: 0.88, accent: UI.blue, accentTop: 1 });
  capsText('PLAYER', x + 20, y + 18, 9, 'rgba(214,224,240,0.6)', { weight: 800, track: 3 }); ['K.O.S', 'DOWNS', 'DAMAGE'].forEach((h, i) => capsText(h, x + 380 + i * 80, y + 18, 9, 'rgba(214,224,240,0.6)', { align: 'center', weight: 800, track: 3 }));
  [0, 1].flatMap(t => G.players.filter(p => p.team === t).sort((a, b) => b.kos - a.kos)).forEach((p, i) => { const yy = y + 40 + i * 24;
    ctx.fillStyle = rgba(SQ_TEAMS[p.team].col, p.id === SQ.me ? 0.3 : 0.12); ctx.fillRect(x + 10, yy - 10, 580, 20);
    capsText((p.bot ? 'BOT · ' : '') + p.name.toUpperCase() + '  ·  ' + (p.f.c.short || p.f.c.name).toUpperCase(), x + 20, yy, 10, p.id === SQ.me ? '#ffd23f' : '#fff', { weight: 700, track: 1 });
    [p.kos, p.deaths, Math.round(p.dmg)].forEach((v, j) => capsText(String(v), x + 380 + j * 80, yy, 11, '#fff', { align: 'center', weight: 800, track: 0 })); });
}
function sqEndCard(G, me) {
  const won = me && G.win === me.team, k = easeOut(clamp(G.pt / 30, 0, 1));
  ctx.save(); ctx.globalAlpha = k; chromeText(G.win < 0 ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT', W / 2, 62, 44, { align: 'center', weight: 900, track: 10, glow: rgba(G.win < 0 ? '#ffffff' : SQ_TEAMS[G.win].col, 0.6) });
  if (G.win >= 0) capsText(SQ_TEAMS[G.win].name + ' TEAM WINS' + (G.xp ? '  ·  +' + G.xp + ' XP' : ''), W / 2, 84, 11, '#fff', { align: 'center', weight: 800, track: 4 }); ctx.restore();
  if (G.pt > 90) uiPrompts(sqIsHost() ? [['ENTER', 'BACK TO THE PARTY']] : [['ESC', 'LEAVE']], { left: sqIsHost() ? '' : 'Waiting for the host…' });
}
