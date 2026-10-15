// ---------- ability icons: a drawn picture for every skill, super, ranged attack and role ability ----------
// Vector glyphs drawn straight onto the HUD canvas (so they're sharp at any size): white with a dark edge, picked out
// in the ability's colour. drawIcon(id, x, y, size, colour); iconOf(champion, slot) gives the id for a slot.
const ICON_OF_MOVE = { boltcast: 'bolt', batthrow: 'batthrow', passcast: 'pass', lasercast: 'laser', cookieshot: 'cookie' };
function iconOf(f, slot) {
  const c = f.c || f, r = typeof roleOf === 'function' ? roleOf(c) : 'attack';
  if (slot === 'skill') return c.skill.move;
  if (slot === 'super') return c.super.move;
  const A = typeof abilOf === 'function' ? abilOf(c) : {};
  if (slot === 'abil') return A.a1i || { frontline: 'shield', support: 'heal', flank: 'blink', attack: 'blast' }[r];
  if (slot === 'abil2') return A.a2i || 'trip';
  if (slot === 'range') { const m = rangedOf(c)[0]; return ICON_OF_MOVE[m] || 'bolt'; }
  if (slot === 'throw') return 'grab';
  if (slot === 'fin') return 'fin';
  return 'star';
}
function drawIcon(id, x, y, s, col) {
  const G = ICONS[id] || ICONS.star; col = col || '#ffffff';
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10); // glyphs are drawn in a 20 x 20 box round 0,0
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // a dark edge first (the same drawing, thicker and dark), then the glyph itself
  for (const pass of [0, 1]) { ctx.save(); const dark = pass === 0; ctx.strokeStyle = dark ? 'rgba(4,6,12,0.85)' : '#ffffff'; ctx.fillStyle = dark ? 'rgba(4,6,12,0.85)' : '#ffffff'; ctx.lineWidth = dark ? 4.2 : 2;
    G(ctx, dark, col); ctx.restore(); }
  ctx.restore();
}
const iconPath = (g, pts, close) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); if (close) g.closePath(); };
const ICONS = {
  // ---- skills ----
  wave(g, d, c) { g.beginPath(); g.moveTo(-8, 5); g.bezierCurveTo(-6, -4, 0, -8, 5, -5); g.bezierCurveTo(8, -3, 7, 1, 3, 0); g.bezierCurveTo(0, -1, 0, 3, 3, 4); g.stroke();
    g.beginPath(); g.moveTo(-8, 8); g.quadraticCurveTo(0, 5, 8, 8); g.stroke(); if (!d) { g.fillStyle = c; g.beginPath(); g.arc(5, -5, 1.4, 0, 7); g.fill(); } },
  spiral(g, d, c) { g.beginPath(); for (let a = 0; a < Math.PI * 5.2; a += 0.15) { const r = 0.6 + a * 0.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); if (!d) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, 1.4, 0, 7); g.fill(); } },
  mind(g, d, c) { g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill(); for (const r of [5, 8]) { g.beginPath(); g.arc(0, 0, r, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(0, 0, r, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); } if (!d) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, 1.2, 0, 7); g.fill(); } },
  scratch(g) { for (const o of [-4.5, 0, 4.5]) { g.beginPath(); g.moveTo(o - 3, -8); g.quadraticCurveTo(o + 1, -1, o + 3, 8); g.stroke(); } },
  ball(g, d, c) { g.beginPath(); g.arc(0, 0, 7.5, 0, 7); if (!d) { g.fillStyle = c; g.fill(); } g.stroke(); g.beginPath(); g.moveTo(-7.5, 0); g.lineTo(7.5, 0); g.moveTo(0, -7.5); g.lineTo(0, 7.5); g.stroke();
    g.beginPath(); g.arc(-9, 0, 6, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(9, 0, 6, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); },
  stare(g, d, c) { g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(0, -8, 9, 0); g.quadraticCurveTo(0, 8, -9, 0); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, 3.2, 0, 7); if (!d) g.fillStyle = c; g.fill();
    if (!d) { g.fillStyle = '#fff'; g.beginPath(); g.arc(1, -1, 1, 0, 7); g.fill(); } },
  tungs(g, d, c) { g.save(); g.rotate(-0.7); g.beginPath(); g.moveTo(-1.2, 8); g.lineTo(-1.2, -1); g.lineTo(-2.6, -8); g.quadraticCurveTo(0, -10, 2.6, -8); g.lineTo(1.2, -1); g.lineTo(1.2, 8); g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.restore();
    for (const [a, b] of [[5, -6], [7, -2], [6, 3]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(a + 2.5, b - 1); g.stroke(); } },
  rizz(g, d, c) { g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-10, 0, -6, -9, 0, -3.5); g.bezierCurveTo(6, -9, 10, 0, 0, 7); g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke(); },
  bite(g, d, c) { g.beginPath(); g.moveTo(-8, -3); g.quadraticCurveTo(0, -10, 8, -3); g.stroke(); g.beginPath(); g.moveTo(-8, 3); g.quadraticCurveTo(0, 10, 8, 3); g.stroke();
    iconPath(g, [[-6, -4.5], [-4, -1], [-2, -5.5], [0, -1.5], [2, -5.5], [4, -1], [6, -4.5]]); g.stroke(); iconPath(g, [[-6, 4.5], [-4, 1], [-2, 5.5], [0, 1.5], [2, 5.5], [4, 1], [6, 4.5]]); g.stroke(); },
  // ---- supers ----
  flow(g, d, c) { g.beginPath(); g.moveTo(2, -8); g.bezierCurveTo(8, 0, 6, 7, 1, 7); g.bezierCurveTo(-4, 7, -4, 1, 2, -8); g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke();
    for (const y of [-3, 1, 5]) { g.beginPath(); g.moveTo(-9, y); g.lineTo(-5, y); g.stroke(); } },
  expand(g) { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(a * 2, b * 2); g.lineTo(a * 8, b * 8); g.moveTo(a * 8, b * 4); g.lineTo(a * 8, b * 8); g.lineTo(a * 4, b * 8); g.stroke(); } },
  presence(g, d, c) { g.beginPath(); g.arc(0, 0, 2, 0, 7); g.fill(); for (const r of [4.5, 7, 9.5]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); } if (!d) { g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.stroke(); } },
  form(g, d, c) { g.beginPath(); g.ellipse(0, 3, 5, 4, 0, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); for (const [a, b] of [[-6, -3], [-2, -7], [2.5, -7], [6.5, -3]]) { g.beginPath(); g.ellipse(a, b, 1.8, 2.3, 0, 0, 7); g.fill(); } },
  force(g, d, c) { g.beginPath(); g.moveTo(-5, 7); g.lineTo(-5, -2); g.quadraticCurveTo(-5, -6, -1, -6); g.lineTo(5, -6); g.quadraticCurveTo(7, -6, 7, -3); g.lineTo(7, 2); g.quadraticCurveTo(7, 7, 2, 7); g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke();
    for (const x of [-2, 1.2, 4.4]) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x, -2); g.stroke(); } for (const a of [-2.4, -1.9, -1.4]) { g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9 + 1); g.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5 + 1); g.stroke(); } },
  ascend(g, d, c) { iconPath(g, [[-8, 5], [-8, -4], [-4, 0], [0, -7], [4, 0], [8, -4], [8, 5]], true); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.moveTo(-8, 8); g.lineTo(8, 8); g.stroke(); },
  homerun(g, d, c) { g.save(); g.rotate(0.8); iconPath(g, [[-1, 9], [-1, 0], [-2.4, -7], [2.4, -7], [1, 0], [1, 9]], true); g.fill(); g.stroke(); g.restore(); g.beginPath(); g.arc(-5, -5, 3, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke();
    for (const [a, b] of [[-9, -1], [-8.5, -8.5]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(a - 1.5, b + 1.5); g.stroke(); } },
  mayne(g, d, c) { g.beginPath(); g.moveTo(-8, -6); g.lineTo(8, -6); g.quadraticCurveTo(9, -6, 9, -4); g.lineTo(9, 2); g.quadraticCurveTo(9, 4, 7, 4); g.lineTo(-2, 4); g.lineTo(-6, 8); g.lineTo(-5, 4); g.lineTo(-7, 4); g.quadraticCurveTo(-9, 4, -9, 2); g.lineTo(-9, -4); g.quadraticCurveTo(-9, -6, -8, -6); g.closePath();
    if (!d) g.fillStyle = c; g.fill(); g.stroke(); if (!d) { g.fillStyle = '#fff'; for (const x of [-4, 0, 4]) { g.beginPath(); g.arc(x, -1, 1.2, 0, 7); g.fill(); } } },
  shadow(g, d, c) { g.beginPath(); g.moveTo(-6, 9); g.lineTo(-6, -1); g.lineTo(-7.5, -6); g.moveTo(-6, -1); g.lineTo(-3, -9); g.moveTo(-4.5, -1); g.lineTo(0, -9.5); g.moveTo(-3, 0); g.lineTo(3, -8); g.moveTo(-2, 1.5); g.lineTo(6, -4); g.stroke();
    if (!d) { g.strokeStyle = c; g.lineWidth = 1.2; g.beginPath(); g.arc(4, 5, 3, 0, 7); g.stroke(); } },
  // ---- MIKE MIKE ----
  headbutt(g, d, c) { g.beginPath(); g.arc(-2, 0, 7, 0, 7); g.stroke(); if (!d) { g.fillStyle = c; g.fill(); g.stroke(); }
    g.beginPath(); g.moveTo(6, -6); g.lineTo(9, -8); g.moveTo(7, 0); g.lineTo(10, 0); g.moveTo(6, 6); g.lineTo(9, 8); g.stroke(); g.beginPath(); g.arc(-4, -1, 1.2, 0, 7); g.arc(1, -1, 1.2, 0, 7); g.fill(); },
  telekin(g, d, c) { g.beginPath(); g.ellipse(0, 4, 8, 4.5, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 4, 2.4, 0, 7); if (!d) g.fillStyle = c; g.fill();
    for (const x of [-6, 0, 6]) { g.beginPath(); g.moveTo(x, -2); g.lineTo(x, -8); g.stroke(); iconPath(g, [[x - 2, -6], [x, -9], [x + 2, -6]]); g.stroke(); } },
  laser(g, d, c) { g.beginPath(); g.ellipse(-4, 0, 5, 3, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(-4, 0, 1.6, 0, 7); g.fill();
    g.beginPath(); g.moveTo(1, -2); g.lineTo(9, -2); g.stroke(); if (!d) { g.strokeStyle = c; } g.beginPath(); g.moveTo(1, 2); g.lineTo(9, 2); g.stroke(); },
  headport(g, d, c) { g.beginPath(); g.arc(-4, 2, 5, 0, 7); g.stroke(); if (!d) { g.fillStyle = c; g.fill(); g.stroke(); }
    g.setLineDash ? g.setLineDash([2, 2]) : 0; g.beginPath(); g.moveTo(1, -2); g.quadraticCurveTo(5, -9, 9, -4); g.stroke(); g.setLineDash ? g.setLineDash([]) : 0; g.beginPath(); g.arc(8, 4, 2.4, 0, 7); g.stroke(); },
  // ---- COOKIE KING ----
  cookiebomb(g, d, c) { g.beginPath(); g.arc(0, 2, 7, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.moveTo(3, -4); g.quadraticCurveTo(5, -8, 8, -8); g.stroke();
    if (!d) { g.fillStyle = '#3a2010'; for (const [x, y] of [[-3, 0], [2, 3], [-1, 5], [3, -1]]) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); } g.fillStyle = '#ffd08a'; g.beginPath(); g.arc(8.5, -8.5, 1.8, 0, 7); g.fill(); } },
  cookie(g, d, c) { g.beginPath(); g.arc(3, 0, 6, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.moveTo(-9, -3); g.lineTo(-4, -3); g.moveTo(-9, 2); g.lineTo(-5, 2); g.stroke();
    if (!d) { g.fillStyle = '#3a2010'; for (const [x, y] of [[1, -2], [5, 2], [3, 3]]) { g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); } } },
  cookierapid(g, d, c) { for (const [x, y, r] of [[-6, 5, 3], [0, 0, 3.4], [6, -5, 3.8]]) { g.beginPath(); g.arc(x, y, r, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); }
    g.setLineDash ? g.setLineDash([1.6, 2]) : 0; g.beginPath(); g.moveTo(-9, 9); g.quadraticCurveTo(-2, -6, 9, -9); g.stroke(); g.setLineDash ? g.setLineDash([]) : 0; },
  lastbatch(g, d, c) { iconPath(g, [[-8, -2], [-8, -8], [-4, -5], [0, -9], [4, -5], [8, -8], [8, -2]], true); if (!d) g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 4, 5, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.moveTo(-9, 9); g.lineTo(9, 9); g.stroke(); },
  charge(g, d, c) { g.beginPath(); g.arc(2, 1, 7, -Math.PI / 2, Math.PI / 2); g.stroke(); if (!d) { g.fillStyle = c; g.beginPath(); g.arc(2, 1, 6, -Math.PI / 2, Math.PI / 2); g.fill(); }
    g.beginPath(); g.moveTo(-9, -4); g.lineTo(-2, -4); g.moveTo(-9, 1); g.lineTo(-3, 1); g.moveTo(-9, 6); g.lineTo(-2, 6); g.stroke(); },
  // ---- role abilities ----
  shield(g, d, c) { g.beginPath(); g.moveTo(0, -9); g.lineTo(8, -6); g.quadraticCurveTo(8, 4, 0, 9); g.quadraticCurveTo(-8, 4, -8, -6); g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 5); g.moveTo(-4, -1); g.lineTo(4, -1); g.stroke(); },
  heal(g, d, c) { iconPath(g, [[-2.8, -8], [2.8, -8], [2.8, -2.8], [8, -2.8], [8, 2.8], [2.8, 2.8], [2.8, 8], [-2.8, 8], [-2.8, 2.8], [-8, 2.8], [-8, -2.8], [-2.8, -2.8]], true); if (!d) g.fillStyle = c; g.fill(); g.stroke(); },
  blink(g, d, c) { g.setLineDash ? g.setLineDash([2.4, 2.4]) : 0; g.beginPath(); g.moveTo(-9, 4); g.quadraticCurveTo(-2, -8, 5, -2); g.stroke(); g.setLineDash ? g.setLineDash([]) : 0; iconPath(g, [[2, -6], [7, -1], [1, 1]]); g.stroke();
    g.beginPath(); g.arc(-7, 6, 2.2, 0, 7); g.fill(); if (!d) { g.fillStyle = c; g.beginPath(); g.arc(6, 6, 2.6, 0, 7); g.fill(); } },
  trip(g, d, c) { g.beginPath(); g.moveTo(-8, -2); g.lineTo(0, -2); g.lineTo(3, 3); g.lineTo(8, 3); g.stroke(); g.beginPath(); g.moveTo(-8, 7); g.lineTo(8, 7); g.stroke(); iconPath(g, [[5, 0], [8, 3], [5, 6]]); g.stroke(); if (!d) { g.fillStyle = c; g.beginPath(); g.arc(-6, -6, 2, 0, 7); g.fill(); } },
  blast(g, d, c) { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 4 : 9.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke(); },
  // ---- ranged ----
  bolt(g, d, c) { iconPath(g, [[2, -9], [-5, 1], [0, 1], [-2, 9], [6, -2], [1, -2]], true); if (!d) g.fillStyle = c; g.fill(); g.stroke(); },
  batthrow(g, d, c) { g.save(); g.rotate(-0.5); iconPath(g, [[-1, 6], [-1, -1], [-2.2, -6], [2.2, -6], [1, -1], [1, 6]], true); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.restore(); g.beginPath(); g.arc(0, 0, 8.5, 0.4, 2.4); g.stroke(); iconPath(g, [[-6.5, 7.5], [-6.5, 4], [-3.5, 6]]); g.stroke(); },
  pass(g, d, c) { g.beginPath(); g.arc(3, 0, 5.5, 0, 7); if (!d) { g.fillStyle = c; g.fill(); } g.stroke(); g.beginPath(); g.moveTo(-2.5, 0); g.lineTo(8.5, 0); g.moveTo(3, -5.5); g.lineTo(3, 5.5); g.stroke(); for (const y of [-4, 0, 4]) { g.beginPath(); g.moveTo(-9, y); g.lineTo(-5, y); g.stroke(); } },
  // ---- the rest ----
  grab(g, d, c) { g.beginPath(); g.moveTo(-6, 6); g.lineTo(-6, -3); for (const x of [-6, -2, 2]) { g.moveTo(x, -3); g.lineTo(x, -8); } g.moveTo(5, -1); g.lineTo(8, -5); g.moveTo(-6, -3); g.lineTo(6, -3); g.lineTo(6, 3); g.quadraticCurveTo(6, 7, 1, 7); g.lineTo(-6, 6); g.stroke(); },
  fin(g, d, c) { g.beginPath(); g.arc(0, -1.5, 7, 0, 7); if (!d) g.fillStyle = c; g.fill(); g.stroke(); g.beginPath(); g.rect(-3.5, 5, 7, 3.5); g.fill(); g.stroke();
    if (!d) { g.fillStyle = '#05070c'; g.beginPath(); g.arc(-2.6, -2, 1.8, 0, 7); g.arc(2.6, -2, 1.8, 0, 7); g.fill(); } },
  star(g, d, c) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.8 : 9; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); if (!d) g.fillStyle = c; g.fill(); g.stroke(); },
};

// ---------- the row of ability buttons (bottom right): an icon in a hex each, its key above, its name below ----------
// btns: [{ key, label, cd, max, col, name, icon, pct }] — cd counts down to 0 (ready); pct (0..100) for the super
function drawAbilityButtons(btns, o) {
  o = o || {}; const n = btns.length, gap = o.gap || 70, by = o.y || H - 104;
  btns.forEach((b, i) => { const bx = (o.x || W - 52) - (n - 1 - i) * gap, ok = b.cd <= 0, big = !!b.big, rad = big ? 27 : 24;
    hexPath(bx, by, rad + 4); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
    hexPath(bx, by, rad); const g = ctx.createRadialGradient(bx, by - rad * 0.4, 2, bx, by, rad * 1.2); g.addColorStop(0, ok ? rgba(b.col, 0.95) : 'rgba(30,38,56,0.95)'); g.addColorStop(1, ok ? rgba(b.col, 0.55) : 'rgba(5,8,14,0.95)'); ctx.fillStyle = g; ctx.fill();
    if (!ok) { ctx.save(); hexPath(bx, by, rad); ctx.clip(); ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, rad + 6, -Math.PI / 2, -Math.PI / 2 + (1 - b.cd / (b.max || 1)) * Math.PI * 2); ctx.closePath(); ctx.fillStyle = rgba(b.col, 0.35); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = ok ? 1 : 0.45; drawIcon(b.icon, bx, by - (ok ? 0 : 1), rad * 0.62, ok ? '#0a0f18' : b.col); ctx.restore();
    if (!ok) capsText(b.pct != null ? Math.floor(b.pct) + '%' : String(Math.ceil(b.cd / 60)), bx, by + rad * 0.55, big ? 10 : 11, '#fff', { align: 'center', weight: 900, track: 0 });
    hexPath(bx, by, rad); ctx.lineWidth = 2.5; ctx.strokeStyle = ok ? '#fff' : chromeGrad(by - rad, by + rad); ctx.stroke();
    if (ok && frame % 50 < 25) { hexPath(bx, by, rad + 5); ctx.strokeStyle = rgba(b.col, 0.6); ctx.lineWidth = 2; ctx.stroke(); }
    if (b.key) keyCap(bx, by - rad - 10, b.key, { center: 1 });
    capsText(b.label, bx, by + rad + 9, 7, ok ? b.col : 'rgba(214,224,240,0.5)', { align: 'center', weight: 900, track: 2 });
    capsText(b.name.toUpperCase(), bx, by + rad + 19, 7, ok ? '#fff' : 'rgba(214,224,240,0.5)', { align: 'center', weight: 800, track: 1 }); });
}
// one fighter's buttons (1v1 fighter or a Squads player: same fields)
function abilityButtons(f, map, opt) {
  const c = (f.f || f).c, r = roleOf(c), R = ROLES[r], A = abilOf(c), meter = f.meter || 0, superCost = opt && opt.superCost || 100, k = id => map && map[id] ? keyName(map[id]) : '';
  const list = [{ key: k('skill'), label: 'SKILL', cd: f.skillCd || 0, max: f.skillMax || 1, col: c.color, name: c.skill.name, icon: iconOf(c, 'skill') },
    { key: k('range'), label: 'RANGED', cd: f.rangeCd || 0, max: RANGE_CD, col: '#9fc4ff', name: rangedOf(c)[1], icon: iconOf(c, 'range') },
    { key: k('abil'), label: R.name, cd: f.abilCd || 0, max: ABIL_CD[r], col: R.col, name: A.a1[0], icon: iconOf(c, 'abil') }];
  if (hasAbil2(c)) list.push({ key: k('abil2'), label: r === 'flank' ? 'FLANK 2' : 'ABILITY 2', cd: f.abil2Cd || 0, max: ABIL2_CD, col: R.col, name: A.a2 ? A.a2[0] : 'TRIP', icon: iconOf(c, 'abil2') });
  list.push({ key: k('super'), label: 'SUPER', cd: meter >= superCost - 0.5 ? 0 : superCost - meter, max: superCost, pct: meter / superCost * 100, col: '#ffd23f', name: c.super.name, icon: iconOf(c, 'super'), big: 1 });
  return list;
}
