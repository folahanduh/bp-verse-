// ---------- PRINCE OF PARIS (fictional): frontline. Money that poisons, a wall of money, a rain of money ----------
// His look and stats are in core.js; the hooks live in fighter.js / roles.js / game.js (1v1), squads.js (Squads),
// human.js (the slick-back and the suit) and render3d.js (the wall, the rain, the notes).
Object.assign(ROLE_OF, { prince: 'frontline' });
Object.assign(ABIL, {
  prince: { a1: ['GILDED GUARD', 'A thin shield (8% of your health) for 6 s: less than other frontlines, he\'d rather keep swinging.'], shieldMul: 0.55,
    a2: ['WALL OF MONEY', 'Hold to place it (you see its outline), let go to drop it: a huge wall of notes. Nobody gets through it and no shot goes through it until it\'s broken down. One every 30 s; a new one breaks the old one.'], a2m: 'moneywall', a2i: 'moneywall', cd2Mul: 5 }, // (6 s x 5: one wall every 30 s)
});
Object.assign(RANGED, { prince: ['moneycast', 'DIRTY MONEY', 'A fistful of notes thrown hard: it poisons whoever it hits for 3 s.'] });
PROJ.money = { speed: 16, r: 12, dmg: 6, kb: 3, stun: 14, hs: 5, poison: 180 };
const POISON_PER = 0.07; // health a frame while poisoned (about 4 a second)

Object.assign(MOVES, {
  // ROYAL FLURRY: seven hits in two seconds, the last one knocks them flat
  royalflurry: { dur: 74, start: 6, end: 56, hits: [[6, 9], [12, 15], [18, 21], [24, 27], [31, 34], [38, 41], [48, 56]], lastKd: 1, lastFx: 'ROYAL!', dmg: 5, limb: 'arm', rm: 1.15, hy: 0.72, kb: 3, stun: 20, hs: 5, launch: -11, dash: 3.6,
    wind: { fu: 0.8, fl: 2.2, bu: 0.5, bl: 2.4, lean: 0.15, crouch: 0.06 }, hit: { fu: 1.55, fl: 1.57, bu: 0.3, bl: 2.4, lean: 0.35, tw: 0.4, lunge: 0.08 },
    combo: [ // jab, cross, hook, backfist, body shot, elbow, then the spinning finish
      [{ fu: 0.8, fl: 2.3, bu: 0.5, bl: 2.6, lean: 0.12 }, { fu: 1.6, fl: 1.62, bu: 0.5, bl: 2.6, lean: 0.28, tw: 0.35, lunge: 0.06 }],
      [{ fu: 0.9, fl: 2.4, bu: 0.6, bl: 2.4, tw: 0.3 }, { fu: 0.7, fl: 2.4, bu: 1.58, bl: 1.6, lean: 0.36, tw: -0.6, lunge: 0.09 }],
      [{ fu: 0.5, fl: 1.4, tw: -0.5, hz: 0.7 }, { fu: 1.5, fl: 1.65, lean: 0.36, tw: 0.75, hz: 1, lunge: 0.07 }],
      [{ fu: 0.4, fl: 2.9, hz: 0.9, tw: -1.1 }, { fu: 1.62, fl: 1.72, hz: -0.15, tw: 0.95, lean: 0.25, lunge: 0.06 }],
      [{ fu: 0.2, fl: 1.2, tw: -0.6, crouch: 0.25 }, { fu: 1.15, fl: 1.75, hz: 0.9, crouch: 0.3, lean: 0.4, tw: 0.7 }],
      [{ fu: 2.4, fl: 0.6, tw: -0.5, lean: 0.1 }, { fu: 1.7, fl: 0.4, tw: 0.8, lean: 0.4, lunge: 0.1 }],
      [{ crouch: 0.3, fu: 0.6, fl: 2.6, bu: 0.6, bl: 2.4, tw: -1.4 }, { fu: 1.6, fl: 1.6, bu: 1.5, bl: 1.6, tw: 1.6, lean: 0.3, lunge: 0.12 }]] },
  moneycast: { dur: 24, start: 9, end: 10, cast: 'proj', proj: 'money',
    wind: { fu: 2.6, fl: 3.2, bu: 0.4, bl: 1.0, lean: -0.15, tw: -0.5 }, hit: { fu: 1.6, fl: 1.4, bu: 0.4, bl: 1.0, lean: 0.25, tw: 0.5, lunge: 0.05 } },
  // MAKE IT RAIN: a 20-second cloud of money over them; anyone under it keeps getting stunned and poisoned
  moneyrain: { dur: 44, start: 20, end: 22, cast: 'rain', superHit: 1, line: "Qu'il pleuve !",
    wind: { fu: 1.0, fl: 2.4, bu: 1.0, bl: 2.4, ht: -0.1, crouch: 0.1 }, hit: { fu: 2.9, fl: 3.3, bu: 2.9, bl: 3.3, ht: -0.35, lean: -0.1, spread: 0.6 } },
});
Object.assign(INTRO_LINES, { prince: ['Bonjour.', 'Paris est à moi.', "L'argent parle.", "Tu n'as pas les moyens.", 'Au revoir, mon ami.'] }); // all in French
Object.assign(SHOWPOSE, { prince: t => mk({ fu: 1.2, fl: 2.6, bu: 0.3, bl: 0.5, lean: -0.04, ht: -0.12 + Math.sin(t / 30) * 0.02, hz: 0.4 }) }); // straightening a cuff
Object.assign(STYLE, {
  // tall and slick: upright, light on his feet, hands up and quick
  prince: { stance: { lean: 0.04, crouch: 0.06, fu: 0.7, fl: 2.4, bu: 0.3, bl: 2.6, ft: 0.3, fs: 0.04, bt: -0.24, bs: -0.3, ht: -0.06 },
    idle: (p, t) => { const b = Math.sin(t / 16); p.fu += b * 0.06; p.crouch += Math.abs(b) * 0.02; p.tw += Math.sin(t / 32) * 0.05; },
    walk: { stride: 0.46, bob: 0.014, arms: 0.1, lean: 0.04 }, moves: {} },
});

// ---- 1v1: the wall (one each) and the rain ----
let pwalls = [], prain = [];
const WALL_HP = 260, WALL_T = 1800, RAIN_T = 1200;
function wallsReset() { pwalls = []; prain = []; }
// things put down on the floor (the WALL OF MONEY, the rain of money, Bonnie's puddles) stay exactly where they were put:
// in the 3D arena the fight line turns and slides with the fighters, so each is pinned to the world when it's made
// and its place on the line worked out again every frame (it never follows anyone)
function pinWorld(o) { if (typeof arenaToWorld === 'function') { const [X, Z] = arenaToWorld(o.x, o.l || 0); o.X = X; o.Z = Z; o.th = arena.th; } return o; }
function pinsRefresh() { for (const o of pwalls.concat(prain, typeof bpools !== 'undefined' ? bpools : [])) unpinWorld(o); } // (where they are on the line now: again after the line moves)
function unpinWorld(o) { if (o.X !== undefined) { const [x, l] = arenaFromWorld(o.X, o.Z); o.x = x; o.l = l; } }
function placeWall1v1(f, foe) {
  for (const old of pwalls.filter(w => w.side === f.side)) breakWall(old); // one at a time: a new one breaks the old one
  const d = f.facing, gap = Math.abs(foe.x - f.x), E = arenaEdges();
  const x = clamp(f.x + d * Math.min(140, Math.max(60, gap * 0.5)), E[0] + 30, E[1] - 30);
  const w = pinWorld({ side: f.side, x, l: f.lat || 0, hp: WALL_HP, max: WALL_HP, t: WALL_T, born: frame }); w.dir = aDir(w.th); w.nrm = aNrm(w.th); // (it stands across the fight line as it was)
  w.ls = [0, 1].map(s => { const g = P[s], n = g ? wallLocal(w, g.x, g.lat || 0)[0] : 0; return Math.sign(n) || (s === f.side ? -d : d); }); // the side each of them is on
  pwalls.push(w);
  fx('dust', x, FLOOR, 14); fx('text', x, FLOOR - 230, 'WALL OF MONEY', '#3fbf5a'); shake = Math.max(shake, 8); sfx('heavy');
}
// 1v1 WALL OF MONEY: a real wall where it stands (3 m wide, across the fight line as it was when he put it down),
// worked out in the world: n through it, l along it. Nothing goes through its face; round the ends is the way past
const WALL_HW = 150, WALL_HD = 28;
function wallLocal(w, x, lat) { const [X, Z] = arenaToWorld(x, lat || 0), dX = X - w.X, dZ = Z - w.Z; return [dX * w.dir[0] + dZ * w.dir[1], dX * w.nrm[0] + dZ * w.nrm[1]]; }
function wallBetween(side, x0, x1, l0, l1) { // a wall between two points (anyone's: nothing goes through it)
  for (const w of pwalls) { const [n0, a0] = wallLocal(w, x0, l0 || 0), [n1, a1] = wallLocal(w, x1, l1 || 0);
    if ((n0 > WALL_HD && n1 > WALL_HD) || (n0 < -WALL_HD && n1 < -WALL_HD)) continue;
    const t = Math.abs(n1 - n0) < 1e-6 ? 0 : clamp(n0 / (n0 - n1), 0, 1), a = a0 + (a1 - a0) * t; if (Math.abs(a) < WALL_HW + 10) return w; }
  return null;
}
function hitWall(w, dmg, side) { if (side === w.side) { fx('sparks', w.x, FLOOR - 120, '#3fbf5a', 4); return; } w.hp -= dmg; /* (his own side's hits just stop at it) */ fx('sparks', w.x, FLOOR - 120, '#3fbf5a', 8); sfx('block'); if (w.hp <= 0) breakWall(w); }
function breakWall(w) { pwalls = pwalls.filter(o => o !== w); for (let i = 0; i < 30; i++) parts.push({ k: 's', x: w.x + (rand() - 0.5) * 30, y: FLOOR - rand() * 220, vx: (rand() - 0.5) * 6, vy: -rand() * 5, life: 50, max: 50, c: rand() < 0.5 ? '#3fbf5a' : '#c9e8b0' }); fx('dust', w.x, FLOOR, 18); sfx('brk'); }
function poisonOn(f, t) { if (!(f.poisonT > 0)) fx('text', f.x, f.y - f.h * f.scale - 40, 'POISONED', '#7dff6a'); f.poisonT = Math.max(f.poisonT || 0, t); }
// once a frame (game.js)
function princeTick() {
  pinsRefresh();
  for (const w of pwalls.slice()) { if (--w.t <= 0) { breakWall(w); continue; }
    for (const g of P) { if (!g || g.gone || g.held || g.thr) continue; // nobody gets through its face (walking, dashing, knocked back or warping): you stay on your side
      const r = g.bw * g.scale * 0.5 + 6, [n, a] = wallLocal(w, g.x, g.lat || 0);
      if (Math.abs(a) >= WALL_HW + r) { if (Math.abs(n) > 2) w.ls[g.side] = Math.sign(n); continue; } // off the end: free to come round it
      const s = w.ls[g.side] || (w.ls[g.side] = Math.sign(n) || 1); if (s * n >= WALL_HD + r) continue;
      const k = s * (WALL_HD + r) - n, [X, Z] = arenaToWorld(g.x, g.lat || 0), [x2, l2] = arenaFromWorld(X + w.dir[0] * k, Z + w.dir[1] * k); g.x = x2; g.lat = l2; // back out on their own side
      const D = aDir(arena.th), N = aNrm(arena.th), vX = D[0] * g.vx + N[0] * (g.lv || 0), vZ = D[1] * g.vx + N[1] * (g.lv || 0), vn = vX * w.dir[0] + vZ * w.dir[1];
      if (vn * s < 0) { const wx2 = vX - w.dir[0] * vn, wz2 = vZ - w.dir[1] * vn; g.vx = wx2 * D[0] + wz2 * D[1]; g.lv = wx2 * N[0] + wz2 * N[1]; } } }
  for (const z of prain.slice()) { if (--z.t <= 0) { prain = prain.filter(o => o !== z); continue; }
    const foe = P[1 - z.side]; if (frame % 2 === 0) parts.push({ k: 's', x: z.x + (rand() - 0.5) * z.r * 2, y: FLOOR - 420 - rand() * 60, vx: (rand() - 0.5) * 0.6, vy: 2.6 + rand(), life: 150, max: 150, c: rand() < 0.6 ? '#3fbf5a' : '#e8f4d8' });
    if (foe && hittable(foe) && !superOn(foe) && !(foe.ffT > 0) && Math.hypot(foe.x - z.x, (foe.lat || 0) - (z.l || 0)) < z.r && z.t % 75 === 0) { foe.stun = Math.max(foe.stun, 26); foe.stunMax = 26; foe.move = null; foe.blocking = false; poisonOn(foe, 150); fx('text', foe.x, foe.y - foe.h * foe.scale - 20, 'STUNNED', '#3fbf5a'); }
  }
}
function moneyRain1v1(f, foe) { prain = prain.filter(z => z.side !== f.side); prain.push(pinWorld({ side: f.side, x: hittable(foe) ? foe.x : f.x + f.facing * 200, l: hittable(foe) ? foe.lat || 0 : f.lat || 0, r: 230, t: RAIN_T })); fx('text', f.x, f.y - f.h * f.scale - 40, 'MAKE IT RAIN', '#3fbf5a'); sfx('skill'); }

// ---- Squads: walls and rain zones (kept by the host, sent to everyone with the world) ----
const SQ_WALL_W = 4.2, SQ_WALL_HP = 320;
// a wall's frame: (lx along it, lz through it)
const sqWallLocal = (w, x, z) => { const dx = x - w.x, dz = z - w.z, c = Math.cos(w.yaw), s = Math.sin(w.yaw); return [dx * c + dz * s, -dx * s + dz * c]; };
// does the line from a to b cross a wall of the other team?
function sqWallCross(team, ax, az, bx, bz) { // (team null: anyone's wall)
  for (const w of SQ.G.walls || []) { if (team != null && w.team === team) continue; const [l0, n0] = sqWallLocal(w, ax, az), [l1, n1] = sqWallLocal(w, bx, bz);
    if ((n0 > 0.32 && n1 > 0.32) || (n0 < -0.32 && n1 < -0.32)) continue; const t = Math.abs(n1 - n0) < 1e-6 ? 0 : clamp(n0 / (n0 - n1), 0, 1), l = l0 + (l1 - l0) * t; if (Math.abs(l) < SQ_WALL_W / 2 + 0.1) return w; }
  return null;
}
// nobody gets through it, either team: each fighter is kept on the side they were on (so a dash, a knockback or a warp
// can't carry them through); round the ends is the way past (sqBound, every sub-step)
function sqWallPush(p) {
  for (const w of SQ.G && SQ.G.walls || []) { const [l, n] = sqWallLocal(w, p.x, p.z), r = p.r || 0.35, hw = SQ_WALL_W / 2 + r, hd = 0.3 + r, key = 'ws' + w.id;
    if (p.y > 2.4) continue;
    if (Math.abs(l) >= hw) { if (Math.abs(n) > 0.05) p[key] = Math.sign(n); continue; } // off the end: free to come round
    const s = p[key] || (p[key] = Math.sign(n) || 1);
    if (s * n < hd) { const k = s * hd - n, c = Math.cos(w.yaw), sn = Math.sin(w.yaw); p.x += -sn * k; p.z += c * k; } } // back out on their own side
}
function sqPlaceWall(p, aim, d) {
  const G = SQ.G, yaw = aim != null ? aim : p.yaw, [x, z] = sqTpTarget(p, yaw, clamp(d || 3, 1.6, 10));
  for (const old of (G.walls || []).filter(w => w.by === p.id)) sqWallBreak(old); // one at a time: a new one breaks the old one
  G.walls.push({ id: ++G.pid, team: p.team, by: p.id, x, z, yaw, hp: SQ_WALL_HP, max: SQ_WALL_HP, t: WALL_T });
  sqFx('dust', x, 0.1, z); sqFx('ring', x, 0.2, z, '#3fbf5a'); sqSound(p, 'heavy');
}
function sqWallHit(w, dmg) { w.hp -= dmg; sqEvent(['fx', 'hit', w.x, 1.2, w.z, '#3fbf5a']); if (w.hp <= 0) sqWallBreak(w); }
function sqWallBreak(w) { const G = SQ.G; G.walls = G.walls.filter(o => o !== w); sqEvent(['fx', 'heavy', w.x, 1.2, w.z, '#3fbf5a']); sqEvent(['fx', 'dust', w.x, 0.2, w.z, '#3fbf5a']); }
// the host, once a frame: walls wear out, the rain stuns and poisons whoever's under it
function sqPrinceHost() {
  const G = SQ.G;
  for (const w of (G.walls || []).slice()) if (--w.t <= 0) sqWallBreak(w);
  for (const z of (G.zones || []).slice()) { if (--z.t <= 0) { G.zones = G.zones.filter(o => o !== z); continue; }
    if (z.t % 75) continue;
    for (const e of G.players) { if (e.team === z.team || !sqHittable(e) || sqSuperOn(e) || e.ffT > 0 || Math.hypot(e.x - z.x, e.z - z.z) > z.r) continue;
      e.poisonT = Math.max(e.poisonT || 0, 150); e.poisonBy = z.by; sqEvent(['kb', e.id, 0, 0, 0, 26, 0]); sqEvent(['h', e.id, e.x, e.y + 2, e.z, 0, 0, 0, 'STUNNED']); } }
}

// ---- finisher: CHECKMATE IN PARIS. He straightens his cuffs, throws the money in the air; it comes down on them ----
Object.assign(FIN_LEN, { paris: 220 });
FIN_SCRIPTS.paris = function (cn, w, l, t, d, k, launch) {
  if (t === 4) say('prince', 'Échec et mat.');
  if (t < 50) { w.finPose = SHOWPOSE.prince(frame); shot(cn, 1, { x: w.x + d * 4, y: w.y - w.h * 0.88, yaw: d * 0.3, dist: 1.4, fov: 22, lift: -0.3 }); }
  else if (t < 80) { w.finPose = lp(w.finPose, finP({ fu: 2.9, fl: 3.3, bu: 2.9, bl: 3.3, ht: -0.35, lean: -0.1, spread: 0.6 }), 0.2);
    if (t === 62) { say('prince', "Qu'il pleuve !"); sfx('skill'); } shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 160, yaw: d * 0.4, dist: 4.6, fov: 32, lift: 0.3 }); }
  else if (t < 170) { // it pours down on them; they sink to their knees
    l.dazed = true; l.vx = 0; const q = k(80, 160);
    for (let i = 0; i < 3; i++) parts.push({ k: 's', x: l.x + (rand() - 0.5) * 160, y: FLOOR - 420 - rand() * 60, vx: (rand() - 0.5) * 0.6, vy: 3 + rand(), life: 140, max: 140, c: rand() < 0.6 ? '#3fbf5a' : '#e8f4d8' });
    l.finPose = finP({ crouch: 0.2 + q * 0.4, lean: 0.3 + q * 0.4, ht: 0.4, fu: 2.2, fl: 2.8, bu: 2.1, bl: 2.7, spread: 0.3 });
    w.finPose = lp(w.finPose, finP({ fu: 0.3, fl: 0.4, bu: 0.3, bl: 0.4, lean: -0.05, ht: -0.15 }), 0.08);
    if (t % 10 === 0) fx('sparks', l.x, l.y - l.h * 0.5, '#7dff6a', 3);
    shot(cn, 3, { x: l.x, y: FLOOR - 110, yaw: -d * 0.35, dist: 3.8, fov: 30 }); }
  else { if (t === 170) launch(-d * 2, -3, 0); w.finPose = lp(w.finPose, SHOWPOSE.prince(frame), 0.08); shot(cn, 4, { x: w.x, y: w.y - w.h * 0.88, yaw: d * 0.35, dist: 1.6, fov: 22 }); }
};
