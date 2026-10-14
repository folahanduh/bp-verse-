// ---------- CHAMPIONS: the roster, one champion at a time ----------
// The roster down the left, the champion in the middle (in 3D, turning on the showroom pad), and a profile on the
// right in three tabs: OVERVIEW (stats, build), MOVES (skill, super, abilities, throw, finisher, each with its key)
// and ROLE (the counter ring and what the role does). A / D or a tap on the rail changes champion, W / S the skin,
// Q / E (or TAB, or a tap on a tab) the tab.
const GAL = { tab: 0, tabT: 0 };
const GAL_TABS = ['OVERVIEW', 'MOVES', 'ROLE'];
const GAL_STATS = [['STRENGTH', 'str'], ['SPEED', 'spd'], ['DURABILITY', 'dur'], ['FIGHT IQ', 'iq'], ['HAX', 'hax']];
const GAL_THROW = {
  frank: ['POWER SLAM', 'Lifts them over his head and slams them down behind him.'],
  blake: ['BEAR HUG', 'A bear hug, a squeeze and a belly bump that bounces them away.'],
  julian: ['WHIRLPOOL', 'Catches a wrist, spins them round him, then lets the tide throw them.'],
  ryan: ['ANKLE TAP', 'Tips them over by the ankles, two stomps, then a backflip off.'],
  darren: ['MIND LOCK', 'Hands on their temples, a freeze, then one push: they fall like a plank.'],
  clav: ['STONE STARE', 'Pulls them in for a stare that half turns them to stone, then a shove.'],
  tung: ['THREE BONKS', 'Three bonks on the head, then a home-run swing.'],
  hexum: ['HIP TOSS', 'A collar grab, two knees, then over his hip onto their back.'],
  verity: ['GRIN LIFT', 'Lifts them up to his grin, holds the stare, then drives them down.'],
};
const ROLE_PERKS = {
  frontline: ['Takes 12% less damage from everything.', 'Ability: a shield worth 14% of your health for 6 s. In Squads, teammates within 6 m get one too.'],
  support: ['Heals a little in the middle of a fight.', 'Ability: heals 14% of your health over 3 s. In Squads, teammates close by heal too.'],
  flank: ['12% quicker on their feet; hits a little lighter.', 'Two abilities: a blink behind them (C) and a low trip that slows them for 3 s (X).'],
  attack: ['10% more damage, 15% on skills.', 'Ability: a heavy blast that hits hard.'],
};
const ROLE_RING = ['flank', 'support', 'attack', 'frontline']; // each beats the next
const galGrade = v => v >= 95 ? 'S' : v >= 88 ? 'A' : v >= 78 ? 'B' : v >= 65 ? 'C' : 'D';
const galRoleBy = r => Object.keys(ROLES).find(k => ROLES[k].beats === r);
// fit a line of chrome lettering into a width
function galFit(t, x, y, size, maxW, o) { ctx.save(); ctx.font = `italic ${(o && o.weight) || 800} ${size}px ${DISP}`; tracked(Math.round(size * 0.04)); const w = ctx.measureText(t).width; ctx.restore(); tracked(0); chromeText(t, x, y, w > maxW ? size * maxW / w : size, o); }
function galWrap(t, x, y, mw, lh, maxLines) { const out = []; let line = ''; for (const w of t.split(' ')) { const tst = line + w + ' '; if (ctx.measureText(tst).width > mw && line) { out.push(line); line = w + ' '; } else line = tst; } out.push(line);
  out.slice(0, maxLines || 9).forEach((l, i) => ctx.fillText(l.trim(), x, y + i * lh)); return Math.min(out.length, maxLines || 9); }
function galPress(code) {
  if (mode !== 'gallery') return false;
  const n = GAL_TABS.length, set = t => { if (t !== GAL.tab) { GAL.tab = t; GAL.tabT = frame; sfx('select'); } };
  if (code === 'KeyE' || code === 'Tab') { set((GAL.tab + 1) % n); return true; }
  if (code === 'KeyQ') { set((GAL.tab + n - 1) % n); return true; }
  if (/^Digit[1-3]$/.test(code)) { set(+code.slice(5) - 1); return true; }
  if (code.startsWith('__gtab')) { set(+code.slice(6)); return true; }
  return false;
}
function drawGallery() {
  const c = CHARS[sel[0]], ci = sel[0], r = roleOf(c), R = ROLES[r], A = abilOf(c), sk = SKINS[c.id];
  uiBackdrop(c.color, { grid: 0.02 });
  let g = ctx.createLinearGradient(0, H - 170, 0, H); g.addColorStop(0, 'rgba(2,3,6,0)'); g.addColorStop(1, 'rgba(2,3,6,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, H - 170, W, 170);
  uiHeader('CHAMPIONS', 'MEET THE ROSTER  ·  ' + (ci + 1) + ' / ' + CHARS.length, { profile: false });
  // ---- the roster rail ----
  CHARS.forEach((ch, i) => { const y = 92 + i * 39, on = i === ci, rr = ROLES[roleOf(ch)], nv = stepKeys(ci, i, 'KeyD', 'KeyA');
    hit(16, y, 182, 35, nv, nv);
    ctx.save(); slant(16, y, 176, 34, 7); ctx.fillStyle = on ? rgba(ch.color, 0.38) : 'rgba(8,12,20,0.62)'; ctx.fill(); ctx.strokeStyle = on ? ch.color : 'rgba(160,180,210,0.18)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    if (on) { ctx.fillStyle = ch.color; ctx.fillRect(16, y, 3, 34); }
    hexPortrait(ch, on ? selSkin[0] : 0, 42, y + 17, 13, { ring: on ? '#fff' : rgba(ch.color, 0.8) });
    capsText((ch.short || ch.name).toUpperCase(), 64, y + 12, 10, on ? '#fff' : 'rgba(225,232,244,0.8)', { weight: 800, track: 1 });
    capsText(rr.icon + ' ' + rr.name, 64, y + 25, 8, rgba(rr.col, on ? 1 : 0.75), { weight: 800, track: 2 });
    if (on) capsText('▶', 184, y + 17, 9, '#fff', { align: 'right', weight: 900, track: 0 });
    ctx.restore(); });
  // ---- the name plate, under the champion ----
  { const cx = 335, d = dummyFor(0), k = easeOut(clamp((frame - (d.selT || 0)) / 14, 0, 1)); if (d.selCi !== ci) { d.selCi = ci; d.selT = frame; }
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 12);
    galFit(c.name.toUpperCase(), cx, 410, 36, 250, { align: 'center', weight: 900, glow: rgba(c.color, 0.5) });
    capsText(c.title.toUpperCase(), cx, 438, 11, c.color, { align: 'center', weight: 800, track: 5 });
    const skin = sk[selSkin[0]].name.toUpperCase(); ctx.font = `700 11px ${DISP}`; tracked(3); const sw = ctx.measureText('◀  ' + skin + '  ▶').width + 26; tracked(0);
    chamfer(cx - sw / 2, 450, sw, 22, 7); ctx.fillStyle = 'rgba(8,12,20,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,210,63,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    capsText('◀  ' + skin + '  ▶', cx, 461, 11, '#ffd23f', { align: 'center', weight: 700, track: 3 }); hit(cx - sw / 2, 450, sw, 22, ['KeyS'], ['KeyS']);
    sk.forEach((_, q) => { hexPath(cx - (sk.length - 1) * 5 + q * 10, 480, 3.2); ctx.fillStyle = q === selSkin[0] ? '#ffd23f' : 'rgba(255,255,255,0.25)'; ctx.fill(); });
    ctx.restore(); }
  // ---- the profile ----
  const px = 470, py = 92, pw = 464, ph = 378;
  uiPanel(px, py, pw, ph, { accent: c.color, accentTop: 1, glow: c.color, alpha: 0.9 });
  // its header: the role badge and what it counters
  hexPath(px + 32, py + 32, 19); ctx.fillStyle = rgba(R.col, 0.85); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  capsText(R.icon, px + 32, py + 33, 17, '#0a0f18', { align: 'center', weight: 900, track: 0 });
  capsText(R.name, px + 60, py + 24, 14, R.col, { weight: 900, track: 4 });
  capsText('COUNTERS ' + ROLES[R.beats].name + '   ·   COUNTERED BY ' + ROLES[galRoleBy(r)].name, px + 60, py + 42, 9, 'rgba(225,232,244,0.75)', { weight: 800, track: 2 });
  // the tabs
  GAL_TABS.forEach((t, i) => { const tx = px + 18 + i * 146, ty = py + 64, on = i === GAL.tab;
    slant(tx, ty, 134, 26, 8); ctx.fillStyle = on ? rgba(c.color, 0.85) : 'rgba(8,12,20,0.7)'; ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(160,180,210,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    capsText(t, tx + 71, ty + 13, 11, on ? '#fff' : 'rgba(214,224,240,0.7)', { align: 'center', weight: 900, track: 4 }); hit(tx, ty, 140, 26, ['__gtab' + i]); });
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px + 18, py + 98, pw - 36, 1);
  const k = easeOut(clamp((frame - GAL.tabT) / 12, 0, 1)), top = py + 108;
  ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 16, 0);
  if (GAL.tab === 0) galOverview(c, px, top, pw); else if (GAL.tab === 1) galMoves(c, r, A, px, top, pw); else galRole(c, r, px, top, pw);
  ctx.restore();
  uiPrompts([['A D', 'CHAMPION'], ['W S', 'SKIN'], ['Q E', 'TAB'], ['ESC', 'BACK']]);
}
function galOverview(c, px, top, pw) {
  ctx.save(); ctx.font = 'italic 15px ' + BODY; ctx.fillStyle = 'rgba(240,236,246,0.92)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('“' + c.quote + '”', px + 22, top + 12); ctx.restore();
  GAL_STATS.forEach(([lb, key], i) => { const y = top + 46 + i * 34, v = c[key], gr = galGrade(v);
    capsText(lb, px + 22, y, 10, 'rgba(230,236,246,0.85)', { weight: 800, track: 3 });
    uiMeter(px + 132, y - 5, 220, 10, Math.min(1, v / 120), c.color, { hi: '#ffffff', sk: 4 });
    chromeText(String(v), px + 392, y, 17, { align: 'right', weight: 900, track: 0 });
    hexPath(px + 424, y, 12); ctx.fillStyle = gr === 'S' ? '#ffd23f' : gr === 'A' ? rgba(c.color, 0.85) : 'rgba(20,28,44,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    capsText(gr, px + 424, y + 1, 11, gr === 'S' ? '#0a0f18' : '#fff', { align: 'center', weight: 900, track: 0 }); });
  // build chips
  const reach = (c.bat ? 0.42 : 0.33 * c.build.arm) * ((c.inches - 40) * 3.2 + 30), chips = [['HEIGHT', `${Math.floor(c.inches / 12)}'${c.inches % 12}"`], ['WEIGHT', c.kg + ' KG'], ['REACH', reach > 50 ? 'LONG' : reach > 38 ? 'MID' : 'SHORT']];
  chips.forEach(([l, v], i) => { const x = px + 22 + i * 142, y = top + 222; chamfer(x, y, 130, 40, 8); ctx.fillStyle = 'rgba(8,12,20,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,180,210,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    capsText(l, x + 14, y + 13, 8, 'rgba(214,224,240,0.6)', { weight: 800, track: 3 }); capsText(v, x + 14, y + 28, 14, '#fff', { weight: 900, track: 1 }); });
}
function galMoves(c, r, A, px, top, pw) {
  const fl = r === 'flank', th = GAL_THROW[c.id] || ['THROW', 'Grab them and throw them.'], R = ROLES[r];
  const cards = [[MAP1.skill, 'SKILL', c.skill.name, c.skill.desc, c.color], [MAP1.super, 'SUPER · FULL METER', c.super.name, c.super.desc, '#ffd23f'],
    [MAP1.abil, 'ROLE ABILITY · ' + Math.round(ABIL_CD[r] / 60) + ' S', A.a1[0], A.a1[1], R.col]];
  if (fl) cards.push([MAP1.abil2, 'ABILITY 2 · ' + Math.round(ABIL2_CD / 60) + ' S', A.a2 ? A.a2[0] : 'TRIP', A.a2 ? A.a2[1] : 'A low strike that slows them.', R.col]);
  const rg = rangedOf(c); cards.push([MAP1.range, 'RANGED · ' + (RANGE_CD / 60).toFixed(1) + ' S', rg[1], rg[2], '#9fc4ff']);
  if (!fl) cards.push([MAP1.grab, 'THROW', th[0], th[1], '#c8d4e8']);
  cards.push([MAP1.super, 'FINISHER', c.fin.name, 'At 0 health they\'re dazed: get close and press SUPER.', '#ff4a5a']);
  const cw = (pw - 52) / 2, chh = 80;
  cards.slice(0, 6).forEach(([key, type, name, desc, col], i) => { const x = px + 18 + (i % 2) * (cw + 16), y = top + Math.floor(i / 2) * (chh + 8);
    chamfer(x, y, cw, chh, 8); ctx.fillStyle = 'rgba(8,12,20,0.78)'; ctx.fill(); ctx.strokeStyle = rgba(col, 0.4); ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(x, y + 8, 3, chh - 16);
    hexPath(x + 24, y + 24, 14); ctx.fillStyle = rgba(col, 0.9); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    capsText(key ? keyName(key) : R.icon, x + 24, y + 25, key && keyName(key).length > 1 ? 8 : 12, '#0a0f18', { align: 'center', weight: 900, track: 0 });
    capsText(type, x + 46, y + 15, 8, col, { weight: 800, track: 2 });
    galFit(name.toUpperCase(), x + 45, y + 32, 14, cw - 56, { weight: 800, track: 1 });
    ctx.save(); ctx.font = '10.5px ' + BODY; ctx.fillStyle = 'rgba(225,230,240,0.82)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; galWrap(desc, x + 14, y + 52, cw - 26, 12, 3); ctx.restore(); });
}
function galRole(c, r, px, top, pw) {
  // the ring: each role beats the next one round it
  const cx = px + 118, cy = top + 132, rad = 82, pos = ROLE_RING.map((k2, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
  ctx.save();
  ROLE_RING.forEach((k2, i) => { const [x1, y1] = pos[i], [x2, y2] = pos[(i + 1) % 4], dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, sx = x1 + ux * 30, sy = y1 + uy * 30, ex = x2 - ux * 32, ey = y2 - uy * 32, lit = k2 === r || ROLE_RING[(i + 1) % 4] === r;
    ctx.strokeStyle = rgba(ROLES[k2].col, lit ? 0.95 : 0.3); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = lit ? 3 : 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + ux * 8, ey + uy * 8); ctx.lineTo(ex - uy * 6, ey + ux * 6); ctx.lineTo(ex + uy * 6, ey - ux * 6); ctx.closePath(); ctx.fill(); });
  ROLE_RING.forEach((k2, i) => { const [x, y] = pos[i], on = k2 === r, RR = ROLES[k2];
    hexPath(x, y, on ? 27 : 22); ctx.fillStyle = on ? RR.col : rgba(RR.col, 0.22); ctx.fill(); ctx.strokeStyle = on ? '#fff' : rgba(RR.col, 0.7); ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
    capsText(RR.icon, x, y - 2, on ? 18 : 15, on ? '#0a0f18' : RR.col, { align: 'center', weight: 900, track: 0 });
    capsText(RR.name, x, y + (i === 0 ? -38 : 38), 9, on ? '#fff' : rgba(RR.col, 0.85), { align: 'center', weight: 900, track: 2 }); });
  capsText('ARROW = BEATS', cx, cy - 6, 8, 'rgba(214,224,240,0.55)', { align: 'center', weight: 800, track: 1 }); capsText('+15% DAMAGE', cx, cy + 7, 8, 'rgba(214,224,240,0.55)', { align: 'center', weight: 800, track: 1 });
  ctx.restore();
  // what the role does, and who else plays it
  const x = px + 252, w = pw - 272;
  capsText('PLAYING ' + ROLES[r].name, x, top + 10, 11, ROLES[r].col, { weight: 900, track: 3 });
  ctx.save(); ctx.font = '11.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.9)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let y = top + 34; for (const t of ROLE_PERKS[r].concat(['Strong against ' + ROLES[ROLES[r].beats].name.toLowerCase() + 's, weak against ' + ROLES[galRoleBy(r)].name.toLowerCase() + 's.'])) { ctx.fillStyle = ROLES[r].col; ctx.fillRect(x, y - 2, 4, 4); ctx.fillStyle = 'rgba(232,238,248,0.9)'; y += galWrap(t, x + 12, y, w - 12, 14, 4) * 14 + 8; }
  ctx.restore();
  const mates = CHARS.filter(ch => roleOf(ch) === r && ch.id !== c.id);
  capsText(mates.length ? 'ALSO ' + ROLES[r].name : 'THE ONLY ' + ROLES[r].name, x, top + 200, 9, 'rgba(214,224,240,0.6)', { weight: 800, track: 3 });
  mates.forEach((ch, i) => { const mx = x + 20 + i * 64; hexPortrait(ch, 0, mx, top + 232, 17, {}); capsText((ch.short || ch.name.split(' ')[0]).toUpperCase(), mx, top + 260, 7, '#fff', { align: 'center', weight: 800, track: 1 });
    const nv = stepKeys(sel[0], CHARS.indexOf(ch), 'KeyD', 'KeyA'); hit(mx - 20, top + 212, 40, 54, nv, nv); });
}
