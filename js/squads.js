// ---------- SQUADS: third-person 3D team fights, 1v1 up to 5v5 ----------
// Run round a stage behind your fighter (the camera's over your shoulder; the mouse, the arrow keys, the right stick
// or a thumb on the right of a touch screen turns it) with the same fighters, moves and animations as the 1v1 game,
// in two teams. Three modes: ELIMINATION (rounds, no respawns), CONTROL (hold the point) and TEAM KO (first to the
// target). Empty slots are filled with bots, so it plays offline too.
// Online it's one party run by whoever made it: every player moves their own fighter (so it answers instantly), and
// the host decides every hit, knockout and point and sends the world to everyone 20 times a second.
const SQ_PREFIX = PEER_PREFIX + 'sq-', SQM = 0.01, SQ_MAXP = 10;
const SQ_TEAMS = [{ name: 'BLUE', col: '#3ea6ff', hi: '#bfe4ff' }, { name: 'RED', col: '#ff3b5c', hi: '#ffc2cc' }];
const SQ_MODES = [
  { id: 'elim', name: 'ELIMINATION', desc: 'No respawns: knock out the whole other team to take the round. First to 3 rounds.' },
  { id: 'ctrl', name: 'CONTROL', desc: 'Stand on the point in the middle to fill your bar; nobody fills it while both teams are on it. Respawns on. First to 100%.' },
  { id: 'tko', name: 'TEAM KO', desc: 'Respawns on. The first team to the KO target wins.' },
];
const SQ_CHAIN = { jab: 'jab2', jab2: 'hook', hook: 'upper', bodyhook: 'upper', kick: 'round' };
const SQ = { role: null, code: null, peer: null, conns: {}, hostConn: null, L: null, G: null, me: null, free: null, cam: { yaw: 0, pitch: 0.22 }, row: 0, status: '', lockAsk: 0, sendT: 0, from: 'play' };
const sqOn = () => !!SQ.role;
const sqBusy = () => SQ.role && (screen === 'squad3d' || screen === 'sqlobby');
const sqP = id => SQ.G && SQ.G.players.find(p => p.id === id);
const sqMine = p => SQ.role === 'solo' || SQ.role === 'host' ? !p.owner || p.owner === SQ.me || p.bot : p.id === SQ.me; // whose fighter this machine moves
const sqHost = () => SQ.role === 'solo' || SQ.role === 'host';
const fwdOf = yaw => [Math.sin(yaw), -Math.cos(yaw)];
const angTo = (a, b) => Math.atan2(b.x - a.x, -(b.z - a.z)); // the yaw that faces from a toward b
const lerpAng = (a, b, t) => a + wrapPi(b - a) * t;

// ---- the big version of every stage, for 3v3 and up: the stage's set pushed out into a room 68 x 36 m (the renderer
// moves the set back and puts copies of it round the other three sides), each team's walled base at one end, cover
// in between and the stage's own fight floor in the middle. Same layout on every stage, mirrored end to end.
const SQ_BIG = (() => {
  const half = [
    [-25, -15, 0.8, 7.2, 3.2, 'w'], [-25, -4.75, 0.8, 3.5, 3.2, 'w'], [-25, 4.75, 0.8, 3.5, 3.2, 'w'], [-25, 15, 0.8, 7.2, 3.2, 'w'], // the base, gates at z -9, 0, 9
    [-19, -8.5, 2.4, 2.4, 2.4, 'c'], [-19, 8, 1, 4, 1.0, 'l'], [-13, -1.5, 1.2, 1.2, 3.4, 'o'], [-13, 12, 4, 1, 1.0, 'l'], [-8, -11, 2.4, 2.4, 2.4, 'c'], [-7, 5.5, 1.2, 1.2, 3.4, 'o'], [-4, 15, 2.4, 2.4, 2.4, 'c'],
  ];
  return { hx: 34, hz: 18, boxes: half.concat(half.map(([x, z, w, d, h, k]) => [-x, -z, w, d, h, k])), spawnX: 30, base: 25, gen: true };
})();
const sqMapFor = (stage, size) => { const S = STAGES[stage]; return S && S.sqMap ? S.sqMap : S && !S.special && size >= 3 ? (typeof layoutMap === 'function' && layoutMap(S.id)) || SQ_BIG : null; }; // (js/layouts.js: each stage's own)

// ---- the floor: each stage's open floor (measured by the 3D renderer), as a distance from the middle in every direction ----
function sqFreeAt(x, z) { const F = SQ.free; if (!F) return 9; let a = Math.atan2(z, x); if (a < 0) a += Math.PI * 2; const f = a / (Math.PI * 2) * F.length, k = Math.floor(f) % F.length; return Math.min(F[k], F[(k + 1) % F.length], 14); }
// ---- height: a big map's blocks are things you can stand on as well as walk into ----
// A block is [x, z, width, depth, top, kind, ramp, low, base]: ramp ('x+', 'x-', 'z+', 'z-') makes its top slope up that
// way from low to top (stairs, ramps); base lifts its bottom off the floor (a balcony, a desk on a stage), so you can
// walk under it. You walk straight up anything up to SQ_STEP higher than your feet, and onto anything you jump above;
// anything taller is a wall.
const SQ_STEP = 0.62, SQ_TALL = 1.7;
function sqTop(b, x, z) { // the height of a block's top at a point (inside it)
  if (!b[6]) return b[4];
  const lo = b[7] || 0, ax = b[6][0], sg = b[6][1] === '+' ? 1 : -1, half = (ax === 'x' ? b[2] : b[3]) / 2, u = ax === 'x' ? x - b[0] : z - b[1];
  return lo + (b[4] - lo) * clamp((sg * u + half) / (2 * half), 0, 1);
}
// the floor under a point for someone whose feet are at y: the highest top they're on or can step up to
function sqGround(x, z, y) {
  const Mp = SQ.map; if (!Mp) return 0; let g = 0;
  for (const b of Mp.boxes) { if (Math.abs(x - b[0]) > b[2] / 2 || Math.abs(z - b[1]) > b[3] / 2) continue; const t = sqTop(b, x, z); if (t <= y + SQ_STEP && t > g) g = t; }
  return g;
}
// is this block in the way of someone at y (too high to step onto, and not up over their head)?
const sqBlocks = (b, x, z, y) => sqTop(b, x, z) > y + SQ_STEP && y + SQ_TALL > (b[8] || 0);
function sqBound(p) {
  const Mp = SQ.map; if (!Mp) { const r = Math.hypot(p.x, p.z), m = sqFreeAt(p.x, p.z) - 0.6; if (r > m && r > 0.01) { p.x *= m / r; p.z *= m / r; } return; }
  // a big map: its edges, then out of any block you've walked into (unless you can step up onto it, or you're above it)
  const r = p.r || 0.35; p.x = clamp(p.x, -Mp.hx + r, Mp.hx - r); p.z = clamp(p.z, -Mp.hz + r, Mp.hz - r);
  for (const b of Mp.boxes) {
    const hw = b[2] / 2, hd = b[3] / 2, dx = p.x - b[0], dz = p.z - b[1]; if (Math.abs(dx) > hw + r || Math.abs(dz) > hd + r) continue;
    const qx = clamp(dx, -hw, hw), qz = clamp(dz, -hd, hd); if (!sqBlocks(b, b[0] + qx, b[1] + qz, p.y)) continue;
    const ex = dx - qx, ez = dz - qz, d = Math.hypot(ex, ez);
    if (d > 0.0001) { if (d < r) { p.x += ex / d * (r - d); p.z += ez / d * (r - d); } }
    else { const ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz); if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; } }
}
// is there a block (or the map's edge) at this point? (r: how much room you need; y: how high you are; strict: a
// thrown thing, which doesn't step up onto anything)
function sqSolidAt(x, z, r, y, strict) {
  const Mp = SQ.map; if (!Mp) return Math.hypot(x, z) > sqFreeAt(x, z) - (r || 0);
  if (Math.abs(x - 0) > Mp.hx - (r || 0) || Math.abs(z) > Mp.hz - (r || 0)) return true;
  for (const b of Mp.boxes) { if (Math.abs(x - b[0]) >= b[2] / 2 + (r || 0) || Math.abs(z - b[1]) >= b[3] / 2 + (r || 0)) continue;
    const t = sqTop(b, clamp(x, b[0] - b[2] / 2, b[0] + b[2] / 2), clamp(z, b[1] - b[3] / 2, b[1] + b[3] / 2));
    if (strict ? (y || 0) < t && (y || 0) > (b[8] || 0) - 0.05 : sqBlocks(b, clamp(x, b[0] - b[2] / 2, b[0] + b[2] / 2), clamp(z, b[1] - b[3] / 2, b[1] + b[3] / 2), y || 0)) return b; }
  return null;
}
const sqOnGround = p => p.y <= (p.gy || 0) + 0.001;
function sqSpawnAt(team, i, n) {
  if (SQ.map) { const Mp = SQ.map; return { x: team ? Mp.spawnX : -Mp.spawnX, z: (i - (n - 1) / 2) * 2.4, yaw: team ? -Math.PI / 2 : Math.PI / 2 }; } // in your team's base
  const ex = team ? Math.min(9, sqFreeAt(1, 0) - 1.6) : -Math.min(9, sqFreeAt(-1, 0) - 1.6), zs = Math.min(1.5, (sqFreeAt(0, 1) - 1) * 2 / Math.max(1, n));
  return { x: ex, z: (i - (n - 1) / 2) * zs, yaw: team ? -Math.PI / 2 : Math.PI / 2 };
}

// ---- a fighter in the match ----
function sqNewPlayer(o) {
  const f = makeFighter(o.ci, o.team, o.skin || 0), c = f.c;
  const p = Object.assign({ x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0, kbx: 0, kbz: 0, yaw: 0, alive: true, resT: 0, prot: 0,
    mv: null, mt: 0, mvN: 0, hs: {}, q: null, stun: 0, stunMax: 0, kd: 0, kdT: 0, block: false, dashT: 0, dx: 0, dz: 0, meter: 0, skillCd: 0,
    flow: 0, big: 0, armor: 0, asc: 0, confused: 0, weak: 0, hypno: 0, vanish: 0, flash: 0, shadowT: 0, dodgeCd: 0, furT: 0,
    held: 0, hold: null, kos: 0, deaths: 0, cbt: -9999, sta: 100, staT: 0, rangeCd: 0, ccImm: 0, atkBy: {}, outT: -999, abilCd: 0, abil2Cd: 0, shield: 0, shieldT: 0, healT: 0, healPer: 0, slowT: 0, dmg: 0, hPrev: 0, ai: null, f, r: Math.max(0.32, f.bw * 0.0062), spd: f.speed * 0.016, pow: f.power }, o);
  p.maxHp = Math.round((70 + c.dur * 0.7) * (c.build.hp || 1) * 1.15); p.hp = p.maxHp; p.skillMax = f.skillMax;
  return p;
}
function sqPlace(p, i, n) { const s = sqSpawnAt(p.team, i, n); Object.assign(p, { x: s.x, z: s.z, yaw: s.yaw, y: 0, vy: 0, vx: 0, vz: 0, kbx: 0, kbz: 0, mv: null, stun: 0, kd: 0, kdT: 0, held: 0, hold: null, dashT: 0, block: false, shield: 0, shieldT: 0, healT: 0, slowT: 0, cbt: -9999, sta: 100, ccImm: 0, atkBy: {} }); }
function sqResetAll(full) {
  const G = SQ.G; for (const t of [0, 1]) { const T2 = G.players.filter(p => p.team === t); T2.forEach((p, i) => { sqPlace(p, i, T2.length); p.alive = true; p.hp = p.maxHp; p.resT = 0; p.prot = 90; if (full) { p.meter = 0; p.skillCd = 0; } }); }
  G.projs = [];
}

// ---- starting a match (every machine builds the same one from the same list) ----
function sqBuildMatch(init) {
  const S = window.R3D && R3D.stageFree ? R3D.stageFree(init.stage) : null;
  SQ.free = S || null; SQ.map = sqMapFor(init.stage, init.size);
  const G = SQ.G = { mode: init.mode, stage: init.stage, size: init.size, t: 0, ph: 'intro', pt: 0, rd: 1, sc: [0, 0], cap: [0, 0], kos: [0, 0], target: 5 + init.size * 3, rt: 0, win: -1,
    players: init.players.map(o => sqNewPlayer(o)), projs: [], feed: [], pid: 0, ev: [], fly: 0, banner: null, recorded: false };
  stageId = init.stage; sqResetAll(true);
  const me = sqP(SQ.me); SQ.cam.yaw = me ? me.yaw : 0; SQ.cam.pitch = 0.16; SQ.camSnap = true;
  G.banner = { txt: SQ_MODES[G.mode].name, sub: G.mode === 0 ? 'ROUND 1' : G.mode === 1 ? 'TAKE THE POINT' : 'FIRST TO ' + G.target, t: 0 };
  setScreen('squad3d'); sfx('fight');
}
// the full roster for a match: the lobby's people, plus bots to fill each team up to the size (if bots are on)
function sqRoster(L) {
  const out = L.players.map(p => ({ id: p.id, name: p.name, tag: p.tag, team: p.team, ci: p.ci, owner: p.id, bot: false }));
  if (L.bots) for (const t of [0, 1]) { let n = out.filter(p => p.team === t).length; while (n < L.size) { const ci = rand() * CHARS.length | 0; out.push({ id: 'bot' + t + n, name: CHARS[ci].short || CHARS[ci].name.split(' ')[0], tag: 'BOT', team: t, ci, owner: null, bot: true }); n++; } }
  return out;
}

// ---- moving your own fighter (and the host's bots) ----
function sqStartMove(p, id, aim) {
  const M = MOVES[id]; if (!M) return;
  p.mv = id; p.mt = 0; p.mvN++; p.hs = {}; p.q = null; p.hPrev = 0; if (aim != null) p.yaw = aim;
  p.f.av = pickVariant(p.f, id); p.f.hitDone = false; p.f.slamDone = false; p.f.hitN = -1;
  if (id === 'scratch') p.furT = 110;
  if (M.dmg || M.cast || M.hits) p.cbt = SQ.G.t; // swinging puts you in the fight (no healing up)
  if (M.dmg || M.hits) { p.sta = Math.max(0, p.sta - (M.superHit ? 0 : M.heavy ? 11 : id === 'jab' || id === 'jab2' ? 5 : 8)); p.staT = 0; } // stamina: spam and you run dry
  sqSound(p, M.dmg || M.grab ? 'whoosh' : null);
}
// a gentle lock-on: attacks turn you toward the nearest enemy roughly in front of you
function sqAim(p, yaw, range) {
  let best = null, bs = 1e9;
  for (const e of SQ.G.players) { if (e.team === p.team || !e.alive) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d > (range || 5)) continue;
    const da = Math.abs(wrapPi(angTo(p, e) - yaw)), close = d < 2.8; if (da > (close ? Math.PI : 1.0)) continue; // someone right beside or behind you counts too: you turn to them
    const sc = d * (1 + da * (close ? 0.6 : 1.5)); if (sc < bs) { bs = sc; best = e; } }
  return best ? angTo(p, best) : yaw;
}
// what a fighter wants this frame: I = { mx, mz (a world direction, up to 1), aim (yaw), jump, block, dash, punch, kick, skill, super }
function sqControl(p, I) {
  const G = SQ.G, ground = sqOnGround(p);
  if (!p.alive || p.held) { p.vx = p.vz = 0; return; }
  if (G.ph !== 'fight' || p.kd || p.stun > 0) { p.vx *= 0.8; p.vz *= 0.8; p.block = false; p.mv = p.kd || p.stun > 0 ? null : p.mv; if (p.mv) sqMoveOwn(p, I); return; }
  if (p.hold) { p.vx = p.vz = 0; return; } // strangling someone
  if (p.mv) { sqMoveOwn(p, I); return; }
  const conf = p.confused > 0 ? -1 : 1, mx = I.mx * conf, mz = I.mz * conf, mag = Math.min(1, Math.hypot(mx, mz));
  // slowed by a giant (Ryan's expansion) close by
  const slow = G.players.some(e => e.team !== p.team && e.big > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 3.5) ? 0.6 : 1;
  const sp = p.spd * (p.flow > 0 ? 1.4 : 1) * (p.asc > 0 ? 1.22 : 1) * slow * roleSpeed(p.f) * (p.slowT > 0 ? 0.6 : 1) * (p.sta < 15 ? 0.85 : 1); // (worn out: a bit slower)
  p.block = !!I.block && ground;
  if (I.dash && ground && p.dashT <= 0 && p.sta >= 10) { p.sta -= 14; p.staT = 0; const a = mag > 0.2 ? Math.atan2(mx, -mz) : p.yaw; p.dashT = 13; p.dx = Math.sin(a); p.dz = -Math.cos(a); sqSound(p, 'whoosh'); }
  if (p.dashT > 0) { p.dashT--; const k = sp * 3.1 * (0.35 + p.dashT / 13 * 0.65); p.vx = p.dx * k; p.vz = p.dz * k; if (p.dashT === 0) p.dashEnd = G.t; }
  else if (p.block) { p.vx = mx * sp * 0.35; p.vz = mz * sp * 0.35; p.yaw = lerpAng(p.yaw, I.aim, 0.3); }
  else { p.vx = mx * sp; p.vz = mz * sp; if (I.fp) p.yaw = lerpAng(p.yaw, I.aim, 0.35); else if (mag > 0.15) p.yaw = lerpAng(p.yaw, Math.atan2(mx, -mz), 0.22); } // (first person: you face where you look)
  if (I.jump && ground && !p.block) { p.sta = Math.max(0, p.sta - 6); p.staT = 0; p.vy = 0.152 * p.f.b.jump; sqSound(p, 'jump'); }
  // attacks: the dash into a dash attack, in the air a flying kick, else punches and kicks (which chain into strings)
  const dashing = p.dashT > 0 || G.t - (p.dashEnd || -99) < 7;
  if (I.super && p.meter >= 99.5) { p.meter = 0; sqStartMove(p, p.f.c.super.move, sqAim(p, I.aim, 12)); sqSay(p, p.f.c.lines.super); }
  else if (I.skill && p.skillCd <= 0) { p.skillCd = p.skillMax; sqStartMove(p, p.f.c.skill.move, sqAim(p, I.aim, 14)); }
  else if ((I.abil || I.abil2) && ground && sqAbility(p, I.abil2 ? 2 : 1, I.aim)) {}
  else if (I.range && ground && p.rangeCd <= 0) { p.rangeCd = RANGE_CD; sqStartMove(p, rangedOf(p.f)[0], sqAim(p, I.aim, 18)); } // the long-range poke
  else if (I.punch || I.kick) {
    const b = I.punch ? 'punch' : 'kick', id = !ground ? 'akick' : dashing ? (b === 'punch' ? 'dashpunch' : 'dashkick') : p.block ? (b === 'punch' ? 'upper' : 'sweep') : b === 'punch' ? 'jab' : 'kick';
    p.block = false; sqStartMove(p, id, sqAim(p, I.aim));
  }
}
// a move playing out (on its owner's machine): the step into it, dashes, teleports, buffs, and the next hit of a string
function sqMoveOwn(p, I) {
  const G = SQ.G, M = MOVES[p.mv], pm = p.mt; p.mt += sqSpd(p); if (!M) { p.mv = null; return; }
  if (p.hold && p.mt > M.end) p.mt = M.end; // holding someone: frozen in the grip
  const [fx2, fz2] = fwdOf(p.yaw), near = G.players.some(e => e.team !== p.team && e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 0.85 + e.r && Math.abs(wrapPi(angTo(p, e) - p.yaw)) < 0.8);
  let v = 0;
  if (M.rush && p.mt <= M.end) v = M.rush * SQM * 1.2 * Math.max(0.3, 1 - p.mt / (M.end + 10));
  else if (M.dash && p.mt >= M.start && p.mt <= M.end) v = M.dash * SQM * 1.15;
  else if (M.step && p.mt >= M.start - 4 && p.mt <= M.start + 2) v = M.step * SQM * 1.7;
  if (near && !M.dash) v = 0;
  if (M.air) { p.vx *= 0.99; p.vz *= 0.99; } else if (v) { p.vx = fx2 * v; p.vz = fz2 * v; } else { p.vx *= 0.7; p.vz *= 0.7; }
  if (pm < M.start && p.mt >= M.start) { // casts the mover does itself
    if (M.cast === 'teleport') sqBlink(p, 14); else if (M.cast === 'shadow') { sqBlink(p, 12); p.shadowT = 40; } else if (M.cast === 'buff') p[M.buff] = M.time;
  }
  if (I && (I.punch || I.kick) && p.mt >= 3 && !p.q) { const ch = I.punch ? (M.chain || SQ_CHAIN[p.mv]) : SQ_CHAIN[p.mv] === 'round' || p.mv === 'kick' ? 'round' : null; if (ch && MOVES[ch]) p.q = ch; }
  if (p.q && p.mt >= Math.max(M.end + 1, M.start + 3) && !p.hold) { const q = p.q; sqStartMove(p, q, sqAim(p, I ? I.aim : p.yaw)); return; }
  if ((p.mt >= M.dur && !p.hold) || (M.air && sqOnGround(p) && p.mt > 4)) p.mv = null;
}
// how fast a fighter's moves play out: their reach and size (fighter.js atkSpeedOf), the flow, and running out of breath
const sqSpd = p => p.f.atkSpd * (p.flow > 0 ? 1.4 : 1) * (p.sta < 20 ? 0.88 : 1);
// vanish and step out behind the nearest enemy you're facing (Darren's mind games, Verity's shadow)
function sqBlink(p, range) {
  let best = null, bs = 1e9;
  for (const e of SQ.G.players) { if (e.team === p.team || !e.alive) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d > range) continue; const s = d * (1 + Math.abs(wrapPi(angTo(p, e) - p.yaw)) * 1.2); if (s < bs) { bs = s; best = e; } }
  sqFx('smoke', p.x, 1, p.z, p.f.c.color);
  if (best) { const [bx, bz] = fwdOf(best.yaw); p.x = best.x - bx * 1.0; p.z = best.z - bz * 1.0; p.yaw = angTo(p, best); }
  else { const [fx2, fz2] = fwdOf(p.yaw); p.x += fx2 * 4; p.z += fz2 * 4; }
  sqBound(p); p.vanish = 10; sqFx('smoke', p.x, 1, p.z, p.f.c.color); sqSound(p, 'void');
}
// the role ability (roles.js): frontlines shield themselves and the team close by, supports heal it, flanks blink
// behind someone (and trip them), attackers fire a heavy blast. Shields and heals are cast by the host (castmoves).
function sqAbility(p, which, aim) {
  const r = roleOf(p.f), A = abilOf(p.f), say = (t2, c) => sqNum(p.x, p.y + 2.3, p.z, t2, c, true);
  if (which === 2) { if (r !== 'flank' || p.abil2Cd > 0) return false; p.abil2Cd = ABIL2_CD; say(A.a2 ? A.a2[0] : 'TRIP', ROLES.flank.col); sqStartMove(p, 'trip', sqAim(p, aim, 4)); return true; }
  if (p.abilCd > 0) return false; p.abilCd = ABIL_CD[r]; say(A.a1[0], ROLES[r].col); sfx('skill');
  if (r === 'frontline') sqStartMove(p, 'shieldcast');
  else if (r === 'support') sqStartMove(p, 'healcast');
  else if (r === 'flank') { p.cbt = SQ.G.t; sqBlink(p, 10); if (p.f.c.id === 'verity') p.shadowT = 40; }
  else sqStartMove(p, 'blastcast', sqAim(p, aim, 14));
  return true;
}
// physics for a fighter this machine moves: velocity, knockback, gravity, landing, the floor's edge, pushing apart
function sqPhys(p) {
  const G = SQ.G;
  if (p.held) { const h = sqP(p.held); if (h) { const [hx, hz] = fwdOf(h.yaw); p.x = h.x + hx * 0.7; p.z = h.z + hz * 0.7; p.y = h.y + 0.45 + Math.sin(G.t / 5) * 0.05; p.yaw = h.yaw + Math.PI; } return; }
  p.x += p.vx + p.kbx; p.z += p.vz + p.kbz; p.kbx *= 0.86; p.kbz *= 0.86;
  // the floor under you: step up onto what's low enough, stay on stairs going down, fall off edges
  const gy = sqGround(p.x, p.z, p.y), was = p.gy || 0; p.gy = gy;
  if (p.y < gy) { p.y = gy; if (p.vy < 0) p.vy = 0; }
  else if (p.vy <= 0 && p.y <= was + 0.001 && p.y - gy < 0.16) p.y = gy; // walking down steps
  if (p.y > gy || p.vy > 0) { p.vy -= 0.0075; p.y += p.vy; if (p.y <= gy) { p.y = gy; if (p.kd === 1 && p.kdT > 3) { p.kd = 2; p.kdT = 0; sqFx('dust', p.x, 0.05, p.z); sqSound(p, 'thud'); } p.vy = 0; } }
  for (const e of G.players) { if (e === p || !e.alive || e.held) continue; const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz), m = p.r + e.r; if (d < m && d > 0.001) { const k = (m - d) * 0.5; p.x += dx / d * k; p.z += dz / d * k; } }
  sqBound(p);
}
// timers and the knockdown cycle (fall, lie, get up); run by the owner, and by the host for everyone
function sqTimers(p) {
  for (const k of ['flow', 'big', 'armor', 'asc', 'confused', 'weak', 'hypno', 'vanish', 'flash', 'shadowT', 'dodgeCd', 'furT', 'prot']) if (p[k] > 0) p[k]--;
  if (p.stun > 0) p.stun--;
  if (p.skillCd > 0) p.skillCd--;
  for (const k of ['abilCd', 'abil2Cd', 'slowT', 'rangeCd', 'ccImm']) if (p[k] > 0) p[k]--;
  if (++p.staT > 24 && !p.mv) p.sta = Math.min(100, p.sta + (p.block ? 0.2 : 0.55)); // breath back once you stop swinging
  if (p.shieldT > 0 && --p.shieldT === 0) p.shield = 0;
  if (p.alive) p.meter = Math.min(100, p.meter + 0.03 * p.f.meterMul);
  if (p.kd) { p.kdT++; if (p.kd === 1 && sqOnGround(p) && p.vy <= 0 && p.kdT > 6) { p.kd = 2; p.kdT = 0; } else if (p.kd === 2 && p.alive && p.kdT > 44) { p.kd = 3; p.kdT = 0; } else if (p.kd === 3 && p.kdT >= 26) { p.kd = 0; p.kdT = 0; p.ccImm = 75; } } // back up: a moment where you can't be knocked straight down again
}

// ---- the host: every hit, knockout, projectile and point ----
function sqReach(p, M) { return (M.reach ? M.reach * SQM * 1.25 : limbLen(p.f, M.limb || 'arm') * SQM * (M.rm || 1) * 1.2) + 0.32; }
const sqHittable = e => e.alive && e.kd < 2 && !e.held && e.vanish <= 0 && e.prot <= 0;
function sqHostMoves() {
  const G = SQ.G;
  // Verity's strangle (whether or not his move is still playing: a hit can cut that short): a few chokes, then he slams them down
  for (const p of G.players) if (p.hold) { const v = sqP(p.hold.id); p.hold.t++;
    if (!v || !v.alive) { p.hold = null; continue; }
    if (!p.alive || p.kd || p.stun > 0) { p.hold = null; v.held = 0; sqEvent(['rel', v.id]); continue; } // hit him and he lets go: a teammate can save you
    if (p.hold.t % 14 === 0 && p.hold.t < 70) { sqDamage(v, 4 * p.pow, p); sqEvent(['h', v.id, v.x, 1.4, v.z, 4, 0, 0, '']); }
    if (p.hold.t >= 82) { const vid = v.id; p.hold = null; v.held = 0; sqEvent(['rel', vid]); sqDamage(v, 38 * p.pow, p); sqEvent(['kb', vid, 0, 0, -0.04, 30, 1]); sqEvent(['h', vid, v.x, 0.4, v.z, Math.round(38 * p.pow), 0, 1, 'SLAM!']); sqEvent(['fx', 'crater', v.x, 0, v.z, '#000']); p.mv = null; p.shadowT = 30; }
  }
  for (const p of G.players) if (p.held) { const h = sqP(p.held); if (!h || !h.alive || !h.hold || h.hold.id !== p.id) { p.held = 0; sqEvent(['rel', p.id]); } } // nobody's actually holding them: free them
  for (const p of G.players) {
    if (!p.mv || !p.alive) { p.hPrev = 0; continue; }
    const M = MOVES[p.mv]; if (!M) continue; const a = p.hPrev, b = p.mt; p.hPrev = b;
    if (a < M.start && b >= M.start) sqHostCast(p, M);
    const wins = M.hits || (M.dmg ? [[M.start, M.end]] : []);
    wins.forEach(([s, e], i) => { if (b < s || a > e + 1) return;
      for (const t of G.players) { if (t.team === p.team || !sqHittable(t)) continue; const key = i + ':' + t.id; if (p.hs[key]) continue;
        const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz); if (d > sqReach(p, M) * (p.big > 0 ? 1.5 : 1) + t.r || Math.abs(t.y - p.y) > 1.1) continue;
        const [fx2, fz2] = fwdOf(p.yaw), cos = (dx * fx2 + dz * fz2) / (d || 1); if (d > 0.45 && cos < (M.superHit || M.armor ? 0 : 0.38)) continue;
        p.hs[key] = 1; sqHit(p, t, M, i === wins.length - 1, wins.length > 1); } });

  }
}
function sqHostCast(p, M) {
  const G = SQ.G;
  if (M.line) sqSay(p, M.line);
  if (M.cast === 'proj') {
    const P2 = PROJ[M.proj], [fx2, fz2] = fwdOf(p.yaw), sp = P2.speed * SQM * 1.7;
    G.projs.push({ id: ++G.pid, kind: M.proj, team: p.team, by: p.id, x: p.x + fx2 * 0.6, z: p.z + fz2 * 0.6, y: p.y + (P2.arc ? 1.4 : 1.15), vx: fx2 * sp, vz: fz2 * sp, vy: P2.arc ? 0.07 : 0, t: 0, life: P2.arc ? 150 : P2.boomer ? 110 : 80, col: p.f.c.color, r: Math.max(0.25, P2.r * SQM * 1.8), b: 0 });
  } else if (M.cast === 'buff') { p[M.buff] = M.time; sqEvent(['fx', 'ring', p.x, 1, p.z, p.f.c.color]); }
  else if (M.cast === 'shield' || M.cast === 'heal') { // you get the most; teammates within 6 m get a little
    for (const a of G.players) { if (a.team !== p.team || !a.alive || Math.hypot(a.x - p.x, a.z - p.z) > 6) continue; const k = a === p ? 0.14 : 0.08;
      if (M.cast === 'shield') { a.shield = Math.max(a.shield, a.maxHp * k); a.shieldT = 360; } else { a.healT = 180; a.healPer = a.maxHp * k / 180; }
      sqEvent(['h', a.id, a.x, a.y + 2, a.z, 0, 0, 0, M.cast === 'shield' ? '+SHIELD' : '+HEAL']); }
    sqEvent(['fx', 'ring', p.x, 1, p.z, ROLES[roleOf(p.f)].col]); }
  else if (M.cast === 'presence') { for (const e of G.players) if (e.team !== p.team && e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 8) { e.confused = 240; e.weak = 360; sqEvent(['h', e.id, e.x, 2, e.z, 0, 0, 0, '???']); } sqEvent(['fx', 'ring', p.x, 1, p.z, p.f.c.color]); }
  else if (M.cast === 'shadow') { // strangle whoever he came out behind
    const t = G.players.filter(e => e.team !== p.team && sqHittable(e) && Math.hypot(e.x - p.x, e.z - p.z) < 2).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (t) { p.hold = { id: t.id, t: 0 }; t.held = p.id; t.mv = null; t.stun = 0; sqEvent(['held', t.id, p.id]); sqSound(p, 'grab'); }
  }
}
function sqHit(p, t, M, last, multi) {
  const G = SQ.G, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
  if (t.flow > 0 && t.dodgeCd <= 0 && !M.superHit) { t.dodgeCd = 90; sqEvent(['dodge', t.id, -nz * 1.2, nx * 1.2]); return; } // the flow: it slips the hit
  const [tfx, tfz] = fwdOf(t.yaw), front = -(nx * tfx + nz * tfz) > 0.2, blocked = t.block && front && !M.grab;
  let dmg = (M.dmg || 0) * p.pow * 1.2 * (p.asc > 0 ? 1.3 : 1) * (p.weak > 0 ? 0.7 : 1) * (t.armor > 0 ? 0.4 : 1) * roleDmg(p.f) * roleVs(p.f, t.f) * roleTaken(t.f) * sqTired(p);
  if (blocked) dmg *= M.superHit ? 0.5 : 0.2;
  dmg = sqDamage(t, dmg, p);
  const heavy = M.heavy || M.superHit;
  sqEvent(['h', t.id, t.x, t.y + 1.2, t.z, Math.round(dmg), blocked ? 1 : 0, heavy ? 1 : 0, M.hitText || (M.claw ? '' : '')]);
  if (!t.alive) return;
  if (blocked) { sqEvent(['kb', t.id, nx * (M.kb || 3) * 0.004, nz * (M.kb || 3) * 0.004, 0, 0, 0]); return; }
  if (M.slow) sqEvent(['slow', t.id, M.slow]);
  if (t.armor > 0) return; // armoured: no flinch
  const cc = t.ccImm > 0 && !M.superHit; // just got up: no knocking them straight back down (supers still do)
  const kd = !cc && (!!(M.kd && (!multi || last)) || !!(M.lastKd && last)), kb = (M.kb || 3) * 0.011 * t.f.kbMul * (cc ? 0.5 : 1), up = !cc && M.launch && (!M.hits || last || !M.same) ? -M.launch * 0.0105 : 0;
  sqEvent(['kb', t.id, nx * kb, nz * kb, up, cc ? Math.min(8, M.stun || 14) : M.stun || 14, kd ? 1 : 0]);
}
// OUTNUMBERED: the more different enemies hitting you at once, the less each of them does (and the faster your super
// fills), so three on one doesn't simply melt someone: it buys their team time to turn round and punish it
const SQ_OUTN = [1, 1, 0.8, 0.65, 0.55, 0.5];
function sqOutnumbered(t) { const G = SQ.G; let n = 0; for (const id in t.atkBy) { const q = sqP(id); if (q && q.alive && G.t - t.atkBy[id] < 150) n++; } return n; }
const sqTired = p => p.sta < 25 ? 0.55 + 0.45 * p.sta / 25 : 1; // out of stamina: your hits go soft
function sqDamage(t, dmg, by) {
  if (!t.alive || dmg <= 0) return 0;
  const G = SQ.G; t.cbt = G.t; if (by) by.cbt = G.t;
  if (by && by.team !== t.team) { t.atkBy[by.id] = G.t; const n = sqOutnumbered(t); if (n >= 2) { dmg *= SQ_OUTN[Math.min(n, 5)]; t.outT = G.t; t.meter = Math.min(100, t.meter + dmg * 0.3); } }
  if (t.shield > 0) { const s2 = Math.min(t.shield, dmg); t.shield -= s2; dmg -= s2; if (t.shield <= 0) { t.shield = 0; t.shieldT = 0; } if (dmg <= 0) { t.flash = 4; return 0; } } // a shield soaks it first
  t.hp = Math.max(0, t.hp - dmg); t.flash = 4;
  if (by) { by.dmg += dmg; by.meter = Math.min(100, by.meter + dmg * 0.9 * by.f.meterMul); t.lastBy = by.id; }
  t.meter = Math.min(100, t.meter + dmg * 0.45);
  if (t.hp <= 0) sqKO(t, by || sqP(t.lastBy));
  return dmg;
}
function sqKO(t, by) {
  const G = SQ.G; t.alive = false; t.deaths++; if (t.hold) { const v = sqP(t.hold.id); if (v && v.held === t.id) { v.held = 0; sqEvent(['rel', v.id]); } } t.hold = null; t.mv = null; // knocked out mid-strangle: let them go if (t.held) { const h = sqP(t.held); if (h) h.hold = null; t.held = 0; }
  t.resT = SQ_MODES[G.mode].id === 'elim' ? -1 : 300;
  if (by && by.team !== t.team) { by.kos++; G.kos[by.team]++; }
  sqEvent(['ko', by ? by.id : '', t.id]); sqEvent(['kb', t.id, 0, 0, 0.09, 0, 1]);
}
function sqHostProjs() {
  const G = SQ.G;
  for (const r of G.projs) {
    r.x += r.vx; r.z += r.vz; r.t++; r.life--;
    if (PROJ[r.kind].boomer && r.t > 34) { const o = sqP(r.by); if (o) { const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz) || 1, sp = PROJ[r.kind].speed * SQM * 1.7; r.vx = dx / d * sp; r.vz = dz / d * sp; r.vy = (o.y + 1.15 - r.y) * 0.1; if (d < 0.8) r.life = 0; } else r.life = 0; } // the bat flies back to him
    if (PROJ[r.kind].arc) { r.vy -= 0.004; r.y += r.vy; if (r.y < r.r) { r.y = r.r; r.vy = Math.abs(r.vy) * 0.6; if (++r.b > 3) r.life = 0; } } else r.y += r.vy;
    if (SQ.map ? sqSolidAt(r.x, r.z, 0, r.y, true) : Math.hypot(r.x, r.z) > sqFreeAt(r.x, r.z) + 0.5) { if (PROJ[r.kind].boomer && r.t <= 34) r.t = 35; else r.life = 0; }
    for (const t of G.players) { if (t.team === r.team || !sqHittable(t)) continue;
      if (Math.hypot(t.x - r.x, t.z - r.z) < r.r + t.r + 0.1 && r.y > t.y - 0.1 && r.y < t.y + 2.0) {
        const P2 = PROJ[r.kind], by = sqP(r.by); r.life = 0;
        const [tfx, tfz] = fwdOf(t.yaw), d = Math.hypot(r.vx, r.vz) || 1, front = -(r.vx / d * tfx + r.vz / d * tfz) > 0.2, blocked = t.block && front;
        const dmg = sqDamage(t, P2.dmg * (by ? by.pow * roleDmg(by.f) * roleVs(by.f, t.f) * sqTired(by) : 1) * roleTaken(t.f) * 1.35 * (blocked ? 0.2 : 1) * (t.armor > 0 ? 0.4 : 1), by); sqEvent(['h', t.id, r.x, r.y, r.z, Math.round(dmg), blocked ? 1 : 0, 0, P2.eye && r.kind === 'stare' ? 'MOGGED' : r.kind === 'rizz' ? 'AY MAYNE' : '']);
        if (t.alive && !blocked && !(t.armor > 0)) { if (P2.hypno) t.hypno = P2.stun; if (P2.confuse) t.confused = P2.confuse; sqEvent(['kb', t.id, r.vx / d * P2.kb * 0.011, r.vz / d * P2.kb * 0.011, 0, P2.stun, 0]); }
        break; }
    }
  }
  G.projs = G.projs.filter(r => r.life > 0);
}
// rounds, points and the clock
function sqHostRules() {
  const G = SQ.G, md = SQ_MODES[G.mode].id;
  G.pt++;
  if (G.ph === 'intro') { if (G.pt >= (G.rd === 1 && G.t < 400 ? 200 : 140)) { G.ph = 'fight'; G.pt = 0; G.rt = md === 'elim' ? (SQ.map ? 180 : 120) * 60 : md === 'ctrl' ? 0 : 6 * 60 * 60; sqEvent(['ph', 'fight', G.rd, -1]); } return; }
  if (G.ph === 'round') { if (G.pt >= 200) { if (G.sc[0] >= 3 || G.sc[1] >= 3) sqEnd(G.sc[0] > G.sc[1] ? 0 : 1); else { G.rd++; sqResetAll(false); G.ph = 'intro'; G.pt = 0; sqEvent(['ph', 'intro', G.rd, -1]); for (const p of G.players) sqEvent(['tp', p.id, p.x, p.z, p.yaw, 1]); sqSync(true); } } return; } // everyone back to their corner
  if (G.ph === 'end') return;
  // respawns
  for (const p of G.players) if (!p.alive && p.resT > 0 && --p.resT === 0) {
    const T2 = G.players.filter(q => q.team === p.team), s = sqSpawnAt(p.team, T2.indexOf(p), T2.length);
    Object.assign(p, { alive: true, hp: p.maxHp, kd: 0, kdT: 0, stun: 0, prot: 120, mv: null, x: s.x, z: s.z, yaw: s.yaw, y: 0, shield: 0, shieldT: 0, healT: 0, slowT: 0, cbt: -9999, sta: 100, ccImm: 0, atkBy: {} }); sqEvent(['tp', p.id, s.x, s.z, s.yaw, 1]);
  }
  // healing: heals over time, supports patching up mid-fight, and everyone very slowly out of the fight (6 s clear)
  for (const p of G.players) { if (!p.alive) continue; const top = p.maxHp, heal = n => { p.hp = Math.min(top, p.hp + n); };
    if (p.healT > 0) { p.healT--; heal(p.healPer); }
    if (roleOf(p.f) === 'support' && G.t - p.cbt < 300 && G.t % 30 === 0) heal(p.maxHp * 0.003);
    if (G.t - p.cbt > 360) heal(p.maxHp * 0.005 / 60); } // 0.5% a second
  const alive = t => G.players.some(p => p.team === t && p.alive);
  if (md === 'elim') {
    if (G.rt > 0) G.rt--;
    const a0 = alive(0), a1 = alive(1);
    if (!a0 || !a1 || G.rt <= 0) {
      let w = !a0 && !a1 ? -1 : !a0 ? 1 : !a1 ? 0 : -1;
      if (w < 0 && G.rt <= 0) { const hp = t => G.players.filter(p => p.team === t && p.alive).reduce((s, p) => s + p.hp / p.maxHp, 0); w = hp(0) > hp(1) ? 0 : hp(1) > hp(0) ? 1 : -1; }
      if (w >= 0) G.sc[w]++;
      G.ph = 'round'; G.pt = 0; sqEvent(['ph', 'round', G.rd, w]);
    }
  } else if (md === 'ctrl') {
    const on = [0, 1].map(t => G.players.some(p => p.team === t && p.alive && Math.hypot(p.x, p.z) < 2.6 && p.y - (p.gy || 0) < 1));
    if (on[0] !== on[1]) { const t = on[0] ? 0 : 1; G.cap[t] = Math.min(100, G.cap[t] + 100 / (38 * 60)); G.owner = t; }
    G.contest = on[0] && on[1];
    if (G.cap[0] >= 100 || G.cap[1] >= 100) sqEnd(G.cap[0] >= 100 ? 0 : 1);
  } else {
    if (G.rt > 0) G.rt--;
    if (G.kos[0] >= G.target || G.kos[1] >= G.target || G.rt <= 0) sqEnd(G.kos[0] > G.kos[1] ? 0 : G.kos[1] > G.kos[0] ? 1 : -1);
  }
}
function sqEnd(w) { const G = SQ.G; G.ph = 'end'; G.pt = 0; G.win = w; sqEvent(['ph', 'end', G.rd, w]); }

// ---- the bots (the host plays them) ----
function sqBot(p) {
  const G = SQ.G, D = DIFFS[SQ.L ? SQ.L.diff : 1], a = p.ai || (p.ai = { t: 0, tgt: null, str: rand() < 0.5 ? 1 : -1, stuck: 0, lx: p.x, lz: p.z, atk: 0, blk: 0 });
  const I = { mx: 0, mz: 0, aim: p.yaw, jump: 0, block: 0, dash: 0, punch: 0, kick: 0, skill: 0, super: 0 };
  if (!p.alive || G.ph !== 'fight') return I;
  if (--a.t <= 0) { // pick a target: the nearest enemy (in CONTROL, the point when nobody's near)
    a.t = 12 + (rand() * 16 | 0);
    let best = null, bd = 1e9; for (const e of G.players) { if (e.team === p.team || !e.alive) continue; const d = Math.hypot(e.x - p.x, e.z - p.z) + (e.kd >= 2 ? 6 : 0); if (d < bd) { bd = d; best = e; } }
    a.tgt = best ? best.id : null; a.pt = SQ_MODES[G.mode].id === 'ctrl' && (!best || bd > 7) && Math.hypot(p.x, p.z) > 1.6;
    if (rand() < 0.15) a.str = -a.str;
    a.stuck = Math.hypot(p.x - a.lx, p.z - a.lz) < 0.05 ? a.stuck + 1 : 0; a.lx = p.x; a.lz = p.z;
  }
  const t = sqP(a.tgt), sk = p.f.c.skill.move, su = p.f.c.super.move, SK = MOVES[sk];
  let gx = 0, gz = 0, d = 99;
  if (a.pt || !t) { gx = -p.x; gz = -p.z; d = Math.hypot(gx, gz); }
  else { gx = t.x - p.x; gz = t.z - p.z; d = Math.hypot(gx, gz); I.aim = angTo(p, t); }
  const reach = sqReach(p, MOVES.jab) + (t ? t.r : 0), wp = t && !a.pt ? sqClimb(p, t) : null;
  if (SQ.map && (d > reach * 0.85 || wp)) { const wx = wp ? wp[0] - p.x : gx, wz = wp ? wp[1] - p.z : gz, wd = Math.hypot(wx, wz) || 1; const [sx, sz, jp] = sqSteer(p, wx / wd, wz / wd, a); I.mx = sx; I.mz = sz; if (jp) I.jump = 1; if (t && d < 6) I.aim = angTo(p, t); } // round the buildings
  else if (d > reach * 0.85) { I.mx = gx / (d || 1); I.mz = gz / (d || 1); if (d < 5) { I.mx += -gz / (d || 1) * 0.35 * a.str; I.mz += gx / (d || 1) * 0.35 * a.str; } if (a.stuck > 2 && rand() < 0.1) I.jump = 1; if (d > 4 && d < 9 && rand() < 0.012 * (1 + D.combo)) I.dash = 1; }
  else if (t) { I.mx = -gz / d * 0.25 * a.str; I.mz = gx / d * 0.25 * a.str; }
  if (!t) return I;
  // block what's coming (by difficulty), otherwise fight
  const threat = t.mv && MOVES[t.mv] && MOVES[t.mv].dmg && t.mt < MOVES[t.mv].start && d < 2.4;
  if (threat && (a.blk > 0 || rand() < D.block * 0.35)) { a.blk = a.blk > 0 ? a.blk - 1 : 14; I.block = 1; return I; }
  a.blk = 0;
  // the role ability
  { const r = roleOf(p.f); if (p.abilCd <= 0 && rand() < 0.02 * D.special && (r === 'support' ? p.hp < p.maxHp * 0.7 || G.players.some(q => q.team === p.team && q !== p && q.alive && q.hp < q.maxHp * 0.6 && Math.hypot(q.x - p.x, q.z - p.z) < 6) : r === 'frontline' ? d < 3.5 : r === 'flank' ? d > 3 && d < 9 : d > 3 && d < 12)) { I.abil = 1; return I; }
    if (r === 'flank' && p.abil2Cd <= 0 && d < 1.8 && rand() < 0.03 * D.special) { I.abil2 = 1; return I; } }
  if (p.rangeCd <= 0 && d > 3.5 && d < 15 && rand() < 0.03 * D.special) { I.range = 1; return I; } // the long-range poke
  if (p.meter >= 99.5 && (su === 'force' || su === 'homerun' || su === 'mayne' ? d < 2.4 : su === 'shadow' ? d < 11 : d < 7) && rand() < 0.04 * D.special) I.super = 1;
  else if (p.skillCd <= 0 && SK && (SK.cast === 'proj' ? d > 3 && d < 13 : SK.cast === 'teleport' ? d > 4 && d < 13 : d < 2.6) && rand() < 0.03 * D.special) I.skill = 1;
  else if (d < reach * 1.05 && (--a.atk <= 0 || p.mv)) { if (!p.mv) a.atk = D.react[0] / 2 + rand() * D.react[1] / 2; if (rand() < 0.45 + D.combo * 0.3) I[rand() < 0.7 ? 'punch' : 'kick'] = 1; }
  return I;
}

// someone's up on a stage / a balcony / the ring: the way up (the foot of the nearest stairs, then the top of them)
function sqClimb(p, t) {
  const Mp = SQ.map; if (!Mp || !Mp.ramps || t.y - p.y < 0.7) return null;
  let best = null, bs = 1e9; for (const R of Mp.ramps) { if (R.top < t.y - 0.4) continue; const s = Math.hypot(R.lo[0] - p.x, R.lo[1] - p.z) + Math.hypot(R.hi[0] - t.x, R.hi[1] - t.z); if (s < bs) { bs = s; best = R; } }
  if (!best) return null;
  const onIt = Math.abs(p.x - best.b[0]) < best.b[2] / 2 + 0.2 && Math.abs(p.z - best.b[1]) < best.b[3] / 2 + 0.2;
  return onIt || Math.hypot(best.lo[0] - p.x, best.lo[1] - p.z) < 0.7 ? best.hi : best.lo;
}
// a bot finding its way on a big map: the way it wants to go if that's clear, else the nearest clear way round
// (it keeps going round the same side until it's past, and swaps sides when it gets stuck); low walls get jumped
function sqSteer(p, dx, dz, a) {
  if (a.stuck > 2) { a.side = -(a.side || 1); a.stuck = 0; a.det = 40; }
  const side = a.side || (a.side = rand() < 0.5 ? 1 : -1), base = Math.atan2(dz, dx), r = p.r + 0.12;
  const clear = ang => { const cx = Math.cos(ang), cz = Math.sin(ang); let jump = false; // 0 blocked, 1 clear, 2 clear with a jump
    for (const k of [0.7, 1.6, 2.6]) { const b = sqSolidAt(p.x + cx * k, p.z + cz * k, r, p.y); if (!b) continue; if (b !== true && !b[8] && sqTop(b, p.x + cx * k, p.z + cz * k) - p.y < 1.25) { if (k < 1.7) jump = true; continue; } return 0; } // (low enough: jump up on it)
    return jump ? 2 : 1; };
  const offs = a.det > 0 ? [side * 1.2, side * 0.6, side * 1.8, 0, -side * 0.6, side * 2.5] : [0, side * 0.45, -side * 0.45, side * 0.9, -side * 0.9, side * 1.4, -side * 1.4, side * 2.0, -side * 2.0, side * 2.7];
  if (a.det > 0) a.det--;
  for (const o of offs) { const c = clear(base + o); if (c) return [Math.cos(base + o), Math.sin(base + o), c === 2 || (a.stuck > 1 && rand() < 0.2)]; }
  return [Math.cos(base + side * Math.PI / 2), Math.sin(base + side * Math.PI / 2), 1];
}

// ---- your input ----
function sqReadInput() {
  const held = k => KEYS[MAP1[k]], pad = padHeld[0] || {};
  let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), iy = (held('up') ? 1 : 0) - (held('down') ? 1 : 0);
  const tm = touchMove(0, true); if (tm) { ix = tm[0]; iy = tm[1]; } else if (!ix && !iy && (pad.ax || pad.ay)) { ix = pad.ax; iy = -pad.ay; }
  // the camera: arrow keys, the right stick (and the mouse / a thumb, in their handlers)
  if (KEYS.ArrowLeft) SQ.cam.yaw -= 0.045; if (KEYS.ArrowRight) SQ.cam.yaw += 0.045; if (KEYS.ArrowUp) SQ.cam.pitch -= 0.02; if (KEYS.ArrowDown) SQ.cam.pitch += 0.02;
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean)[0] : null;
  if (gp) { const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0; if (Math.abs(rx) > 0.15) SQ.cam.yaw += rx * 0.055; if (Math.abs(ry) > 0.15) SQ.cam.pitch += ry * 0.03; }
  SQ.cam.pitch = clamp(SQ.cam.pitch, -0.25, 0.75);
  const L = readLocal(0, true), cy = SQ.cam.yaw, fx2 = Math.sin(cy), fz2 = -Math.cos(cy), rx2 = Math.cos(cy), rz2 = Math.sin(cy), n = Math.max(1, Math.hypot(ix, iy));
  return { mx: (rx2 * ix + fx2 * iy) / n, mz: (rz2 * ix + fz2 * iy) / n, aim: cy, jump: KEYS[MAP1.jump] || pad.jump || touch.btn.jump ? 1 : 0, block: KEYS[MAP1.block] || pad.block || touch.btn.block || mouseHeld.block ? 1 : 0,
    dash: L.dash ? 1 : 0, punch: L.punch, kick: L.kick, skill: L.skill, super: L.super, abil: L.abil, abil2: L.abil2, range: L.range, fp: CAMFP.on ? 1 : 0 };
}
// the mouse turns the camera (click the game in a squad match and it locks on)
document.addEventListener('mousemove', e => { if (sqLive() && (document.pointerLockElement === cv || e.target === cv)) { SQ.cam.yaw += clamp(e.movementX || 0, -150, 150) * 0.0028; SQ.cam.pitch = clamp(SQ.cam.pitch + clamp(e.movementY || 0, -150, 150) * 0.0022, -0.25, 0.75); } });
cv.addEventListener('mousedown', e => { if (screen === 'squad3d' && SQ.G && SQ.G.ph !== 'end' && !SQ.menu) grabPointer(); });

// ---- one frame of the match ----
function sqStep() {
  const G = SQ.G; if (!G) return;
  G.t++; if (G.banner) G.banner.t++;
  const me = sqP(SQ.me), I = sqReadInput();
  for (const p of G.players) {
    if (!sqMine(p)) { sqLerpRemote(p); continue; }
    sqTimers(p);
    sqControl(p, p.bot ? sqBot(p) : p.id === SQ.me ? I : { mx: 0, mz: 0, aim: p.yaw });
    sqPhys(p);
  }
  if (sqHost()) {
    for (const p of G.players) if (!sqMine(p)) { sqTimers(p); if (p.mv) { p.mt += sqSpd(p); const M = MOVES[p.mv]; if (M && p.hold && p.mt > M.end) p.mt = M.end; } }
    sqHostMoves(); sqHostProjs(); sqHostRules();
  } else for (const r of G.projs) { r.x += r.vx; r.z += r.vz; r.y += r.vy; r.t = (r.t || 0) + 1; if (PROJ[r.kind] && PROJ[r.kind].arc) r.vy -= 0.004; }
  for (const p of G.players) sqAnim(p);
  sqParts();
  // the network: the host sends the world (and what happened); a guest sends its own fighter
  if (SQ.role === 'host') { if (G.ev.length) sqBroadcast({ t: 'sqe', l: G.ev }); if (G.t % 3 === 0) sqBroadcast({ t: 'sqw', d: sqWorld() }); }
  else if (SQ.role === 'guest' && me && SQ.hostConn && G.t % 2 === 0) { try { SQ.hostConn.send({ t: 'sqs', d: [r3(me.x), r3(me.z), r3(me.y), r3(me.yaw), r3(me.vy), me.mv, me.mt, me.mvN, me.block ? 1 : 0, me.dashT, r3(me.vx), r3(me.vz), Math.round(me.sta)] }); } catch (e) {} }
  G.ev = [];
  if (G.ph === 'end' && G.pt === 1) sqRecord();
  // the camera follows you (or a teammate while you're down in ELIMINATION)
  const view = me && (me.alive || SQ_MODES[G.mode].id !== 'elim') ? me : G.players.find(p => p.team === (me ? me.team : 0) && p.alive) || me || G.players[0];
  if (view) { SQ.view = view.id; if (!me || !me.alive) { /* no auto-turn while spectating */ } else if (I.mx || I.mz) { /* the camera's yours */ } }
}
const r3 = v => Math.round(v * 1000) / 1000;
// the pose and look of each fighter come from the 1v1 fighter object (same animations)
function sqAnim(p) {
  const f = p.f, sp = Math.hypot(p.vx, p.vz);
  if (!sqMine(p) || p.gy === undefined) p.gy = sqGround(p.x, p.z, p.y + 0.05); // (stood on a stage, a ring, a step...)
  f.x = WW / 2; f.y = FLOOR - Math.max(0, p.y - p.gy) / SQM; f.vy = -p.vy / SQM; f.facing = 1; f.lv = 0;
  f.move = p.mv; f.mt = p.mt; f.stun = p.stun; f.stunMax = p.stunMax || 14; f.kd = p.alive ? p.kd : (p.kd || 2); f.kdT = p.kdT; f.blocking = p.block;
  f.dashT = p.dashT; f.dashDir = 1; f.ko = !p.alive; f.hypno = p.hypno; f.flow = p.flow; f.big = p.big; f.armor = p.armor; f.asc = p.asc; f.vanish = p.vanish; f.flash = p.flash; f.furT = p.furT;
  f.scale = lerp(f.scale, p.big > 0 ? 1.6 : 1, 0.12);
  f.gape = (f.move && MOVES[f.move] && MOVES[f.move].gape) || p.hold ? 1 : 0;
  f.shadow = p.mv === 'shadow' || p.hold ? 1 : p.shadowT > 0 ? clamp(p.shadowT / 24, 0, 1) : 0;
  f.vx = p.block || p.mv ? 0 : sp / SQM * 0.55; if (sp > 0.004 && !p.mv) f.walkPh += sp / SQM * 0.055 * 136 / f.h;
  f.shield = p.shield; f.healT = p.healT;
  { let tgt = null, bd = 2.2; for (const e of SQ.G.players) { if (e.team === p.team || !e.alive) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd && Math.abs(wrapPi(angTo(p, e) - p.yaw)) < 1) { bd = d; tgt = e; } }
    f.dip = lerp(f.dip || 0, tgt ? dipFor(f, tgt.f) : 0, 0.15); } // lean over someone much shorter
  f.victory = SQ.G.ph === 'end' && SQ.G.win === p.team && p.alive; f.intro = false; f.held = 0; f.dazed = false;
  if (p.held) { f.stun = 20; f.stunMax = 20; f.hitType = 'high'; }
}
// someone else's fighter (on a guest: everyone else; on the host: the guests): glide toward where they were last seen
function sqLerpRemote(p) {
  if (p.tx === undefined) return;
  const k = Math.hypot(p.tx - p.x, p.tz - p.z) > 3 ? 1 : 0.35;
  p.x = lerp(p.x, p.tx, k); p.z = lerp(p.z, p.tz, k); p.y = lerp(p.y, p.ty, 0.5); p.yaw = lerpAng(p.yaw, p.tyaw, 0.4);
  if (p.mv && sqHost()) {} else if (p.mv) p.mt += sqSpd(p);
}

// ---- what happened: hits, knockouts, knockback (applied by whoever moves that fighter), effects ----
function sqEvent(e) { const G = SQ.G; if (!G) return; if (SQ.role === 'host') G.ev.push(e); sqOnEvent(e); }
function sqOnEvent(e) {
  const G = SQ.G, p = sqP(e[1]);
  if (e[0] === 'h') { const [, , x, y, z, dmg, blk, heavy, txt] = e; sqFx(blk ? 'block' : heavy ? 'heavy' : 'hit', x, y, z, p ? p.f.c.color : '#fff'); if (dmg > 0 || txt) G.feedN = (G.feedN || 0); sqNum(x, y + 0.4, z, txt || (dmg > 0 ? String(dmg) : ''), blk ? '#9fc4ff' : heavy ? '#ffd23f' : '#fff', heavy);
    if (p) { p.flash = 4; if (dmg > 0 || blk) p.cbt = G.t; if (sqNear(x, z)) sfx(blk ? 'block' : heavy ? 'heavy' : 'hit'); if (heavy && p.id === SQ.me) SQ.shake = 10; } }
  else if (e[0] === 'kb' && p) { if (sqMine(p) || sqHost()) { p.kbx = e[2]; p.kbz = e[3]; if (e[4]) { p.vy = e[4]; p.y = Math.max(p.y, (p.gy || 0) + 0.01); } if (e[5]) { p.stun = Math.max(p.stun, e[5]); p.stunMax = e[5]; } if (e[6]) { p.kd = 1; p.kdT = 0; if (!e[4] && sqOnGround(p)) { p.vy = 0.06; p.y += 0.01; } } if (e[5] || e[6]) { p.mv = null; p.block = false; p.dashT = 0; p.f.hitVar = rand() * 3 | 0; } } }
  else if (e[0] === 'ko') { const k = sqP(e[1]), v = sqP(e[2]); G.feed.unshift({ k: k ? k.name : '', kt: k ? k.team : -1, v: v ? v.name : '', vt: v ? v.team : 0, t: G.t }); G.feed.length = Math.min(G.feed.length, 5);
    if (v) { v.alive = false; if (sqNear(v.x, v.z)) sfx('ko'); } if (k && k.id === SQ.me) { SQ.flashKO = 60; say('announcer', 'K. O.'); } }
  else if (e[0] === 'tp' && p) { if (sqMine(p)) { p.x = e[2]; p.z = e[3]; p.yaw = e[4]; p.vx = p.vz = p.kbx = p.kbz = 0; } p.tx = e[2]; p.tz = e[3]; if (e[5]) { p.alive = true; p.hp = p.maxHp; p.kd = 0; p.stun = 0; p.mv = null; p.y = 0; } if (p.id === SQ.me) { SQ.cam.yaw = e[4]; SQ.camSnap = true; } }
  else if (e[0] === 'held' && p) { p.held = e[2]; p.mv = null; }
  else if (e[0] === 'slow' && p) p.slowT = Math.max(p.slowT, e[2]);
  else if (e[0] === 'rel' && p) { p.held = 0; }
  else if (e[0] === 'dodge' && p) { if (sqMine(p)) { p.x += e[2]; p.z += e[3]; sqBound(p); } p.vanish = 6; sqFx('smoke', p.x, 1, p.z, p.f.c.color); }
  else if (e[0] === 'fx') sqFx(e[1], e[2], e[3], e[4], e[5]);
  else if (e[0] === 'say') { if (voiceOn) speak(e[1], e[2]); }
  else if (e[0] === 'ph') { const [, ph, rd, w] = e;
    if (ph === 'fight') { G.banner = { txt: 'FIGHT!', sub: '', t: 0 }; sfx('fight'); say('announcer', 'Fight!'); }
    else if (ph === 'intro') G.banner = { txt: 'ROUND ' + rd, sub: SQ_TEAMS[0].name + ' ' + G.sc[0] + '  ·  ' + G.sc[1] + ' ' + SQ_TEAMS[1].name, t: 0 };
    else if (ph === 'round') { const me = sqP(SQ.me); G.banner = { txt: w < 0 ? 'DRAW' : me && me.team === w ? 'ROUND WON' : 'ROUND LOST', sub: w < 0 ? '' : SQ_TEAMS[w].name + ' TAKES ROUND ' + rd, t: 0, col: w < 0 ? '#fff' : SQ_TEAMS[w].col }; sfx('heroslam'); }
    else if (ph === 'end') { const me = sqP(SQ.me); G.banner = null; G.win = w; sfx(me && me.team === w ? 'heroslam' : 'ko'); } }
}
const sqNear = (x, z) => { const v = sqP(SQ.view || SQ.me); return !v || Math.hypot(v.x - x, v.z - z) < 14; };
function sqSound(p, n) { if (n && sqNear(p.x, p.z)) sfx(n); }
function sqSay(p, line) { if (!line) return; if (sqHost()) sqEvent(['say', p.f.c.id, line]); }
// little bursts and numbers in the world (each machine makes its own)
function sqFx(kind, x, y, z, col) {
  const G = SQ.G; if (!G) return; G.parts = G.parts || [];
  const n = kind === 'heavy' ? 18 : kind === 'hit' ? 10 : kind === 'block' ? 6 : kind === 'smoke' ? 16 : kind === 'dust' ? 8 : kind === 'crater' ? 30 : kind === 'ring' ? 1 : 6;
  if (kind === 'ring') { G.parts.push({ k: 'r', x, y, z, life: 30, max: 30, c: col }); return; }
  for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2, s = kind === 'smoke' ? 0.02 : 0.04 + rand() * 0.07;
    G.parts.push({ k: kind === 'smoke' ? 'sm' : kind === 'dust' || kind === 'crater' ? 'd' : 's', x, y, z, vx: Math.cos(a) * s, vy: kind === 'smoke' ? 0.01 + rand() * 0.02 : rand() * 0.07, vz: Math.sin(a) * s, life: 18 + rand() * 14, max: 32, c: kind === 'block' ? '#9fc4ff' : kind === 'smoke' ? '#060408' : col || '#fff' }); }
  if (kind === 'heavy' || kind === 'hit') G.parts.push({ k: 'i', x, y, z, life: 11, max: 11, c: col || '#fff', s: kind === 'heavy' ? 1.4 : 0.9 });
}
function sqNum(x, y, z, s, c, big) { if (!s) return; const G = SQ.G; G.nums = G.nums || []; G.nums.push({ x, y, z, s, c, big, t: 0 }); if (G.nums.length > 24) G.nums.shift(); }
function sqParts() { const G = SQ.G; if (!G.parts) return; for (const p of G.parts) { if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy; p.z += p.vz; if (p.k === 's' || p.k === 'd') p.vy -= 0.005; if (p.y < 0.02) { p.y = 0.02; p.vy = 0; } } p.life--; } G.parts = G.parts.filter(p => p.life > 0); if (G.nums) { for (const n of G.nums) n.t++; G.nums = G.nums.filter(n => n.t < 50); } }

// ---- the network: one party, run by its host ----
function sqWorld() {
  const G = SQ.G;
  return { ph: G.ph, pt: G.pt, rd: G.rd, rt: G.rt, sc: G.sc, cap: G.cap.map(r3), kos: G.kos, win: G.win, own: G.owner, con: G.contest ? 1 : 0,
    P: G.players.map(p => [p.id, r3(p.x), r3(p.z), r3(p.y), r3(p.yaw), Math.round(p.hp * 10) / 10, p.mv, p.mt, p.stun, p.kd, p.kdT,
      (p.alive ? 1 : 0) | (p.block ? 2 : 0) | (p.flow > 0 ? 8 : 0) | (p.big > 0 ? 16 : 0) | (p.armor > 0 ? 32 : 0) | (p.asc > 0 ? 64 : 0) | (p.confused > 0 ? 128 : 0) | (p.weak > 0 ? 256 : 0) | (p.hypno > 0 ? 512 : 0) | (p.vanish > 0 ? 1024 : 0) | (p.prot > 0 ? 2048 : 0) | (p.furT > 0 ? 4096 : 0) | (p.healT > 0 ? 8192 : 0) | (p.slowT > 0 ? 16384 : 0) | (SQ.G.t - p.outT < 60 ? 32768 : 0),
      Math.round(p.meter), p.skillCd, p.resT, p.hold ? p.hold.id : 0, p.held || 0, p.shadowT, p.kos, p.deaths, Math.round(p.dmg), p.bot ? 1 : 0, Math.round(p.shield)]),
    R: G.projs.map(r => [r.id, r.kind, r3(r.x), r3(r.y), r3(r.z), r3(r.vx), r3(r.vy), r3(r.vz), r.team, r.by]) };
}
function sqApplyWorld(d) {
  const G = SQ.G; if (!G) return;
  Object.assign(G, { ph: d.ph, pt: d.pt, rd: d.rd, rt: d.rt, sc: d.sc, cap: d.cap, kos: d.kos, win: d.win, owner: d.own, contest: !!d.con });
  for (const a of d.P) {
    const p = sqP(a[0]); if (!p) continue; const fl = a[11], mine = p.id === SQ.me;
    p.hp = a[5]; p.alive = !!(fl & 1); p.meter = a[12]; p.skillCd = a[13]; p.resT = a[14]; p.hold = a[15] ? { id: a[15], t: p.hold ? p.hold.t : 0 } : null; p.held = a[16]; p.kos = a[18]; p.deaths = a[19]; p.dmg = a[20]; p.bot = !!a[21]; p.shield = a[22] || 0; p.outnum = !!(fl & 32768); p.healT = fl & 8192 ? Math.max(p.healT, 3) : 0; if (!mine) p.slowT = fl & 16384 ? 3 : 0;
    for (const [bit, k] of [[8, 'flow'], [16, 'big'], [32, 'armor'], [64, 'asc'], [128, 'confused'], [256, 'weak'], [512, 'hypno'], [1024, 'vanish'], [2048, 'prot'], [4096, 'furT']]) p[k] = fl & bit ? Math.max(p[k], 3) : 0;
    if (!mine) { p.shadowT = a[17]; p.tx = a[1]; p.tz = a[2]; p.ty = a[3]; p.tyaw = a[4]; if (p.mv !== a[6]) { p.mv = a[6]; if (a[6]) p.f.av = pickVariant(p.f, a[6]); } p.mt = a[7]; p.stun = a[8]; p.kd = a[9]; p.kdT = a[10]; p.block = !!(fl & 2); }
  }
  G.projs = d.R.map(r => { const o = sqP(r[9]); return { id: r[0], kind: r[1], x: r[2], y: r[3], z: r[4], vx: r[5], vy: r[6], vz: r[7], team: r[8], by: r[9], col: o ? o.f.c.color : '#fff', r: 0.3, t: 0 }; });
}
function sqBroadcast(o) { for (const k in SQ.conns) { try { SQ.conns[k].send(o); } catch (e) {} } }
// the host gets a guest's own fighter
function sqFromOwner(p, d) {
  p.tx = d[0]; p.tz = d[1]; p.ty = d[2]; p.tyaw = d[3]; p.vy = d[4]; p.vx = d[10]; p.vz = d[11];
  if (d[7] !== p.mvN) { p.mvN = d[7];
    if (d[5] && MOVES[d[5]] && p.alive && !p.kd && !(p.stun > 0) && !p.held) { const id = d[5], M = MOVES[id], sup = id === p.f.c.super.move, sk = id === p.f.c.skill.move;
      if (sup && p.meter < 95) {} else if (sk && p.skillCd > 40) {} else { if (sup) p.meter = 0; if (sk) p.skillCd = p.skillMax; if (M.dmg || M.cast || M.hits) p.cbt = SQ.G.t; p.mv = id; p.mt = d[6]; p.hPrev = Math.max(0, d[6] - 1); p.hs = {}; p.f.av = pickVariant(p.f, id); if (M.cast === 'buff' && d[6] >= M.start) p[M.buff] = M.time; if (id === 'scratch') p.furT = 110; } } }
  else if (!d[5]) { if (!p.hold) p.mv = null; }
  p.block = !!d[8]; p.dashT = d[9]; if (d[12] != null) p.sta = d[12];
}
// the lobby (people, teams, settings), kept by the host and sent to everyone
function sqLobbyNew(host) { return { size: 3, mode: 0, stage: Math.max(0, STAGES.findIndex(s => s.sqMap)), bots: true, diff: 1, players: host ? [host] : [], v: 0 }; }
function sqMeCard(id) { const c = acctCard() || { name: 'Player', tag: '0000', lv: 1 }; return { id, name: c.name, tag: c.tag, lv: c.lv, team: 0, ci: acct && acct.fav != null ? Math.max(0, CHARS.findIndex(x => x.id === acct.fav)) : rand() * CHARS.length | 0 }; }
function sqLobbySend() { const L = SQ.L; L.v++; if (SQ.role === 'host') sqBroadcast({ t: 'sqlob', L }); }
function sqSolo() { sqLeave(true); SQ.role = 'solo'; SQ.me = 'me'; SQ.L = sqLobbyNew(sqMeCard('me')); SQ.L.size = 3; SQ.row = 0; setScreen('sqlobby'); }
function sqHostParty() {
  if (!acct) { openAccountCreate('play'); return; }
  sqLeave(true); const code = genCode(); SQ.role = 'host'; SQ.code = code; SQ.me = 'h-' + acct.tag; SQ.L = sqLobbyNew(sqMeCard(SQ.me)); SQ.row = 0; SQ.status = 'Opening the party…'; setScreen('sqlobby');
  socialLoad(() => {
    if (SQ.role !== 'host' || SQ.code !== code) return;
    const p = SQ.peer = mkPeer(SQ_PREFIX + code);
    p.on('open', () => { SQ.status = 'Party code ' + code + ': friends join from SQUADS → JOIN A PARTY'; });
    p.on('connection', c => { c.on('data', d => sqHostData(d, c)); c.on('close', () => sqDropConn(c)); c.on('error', () => {}); });
    p.on('error', e => { if (e.type === 'unavailable-id' && SQ.role === 'host') { try { p.destroy(); } catch (e2) {} sqHostParty(); } else if (e.type !== 'peer-unavailable') SQ.status = 'Connection problem (' + e.type + ')'; });
  });
}
function sqHostData(d, c) {
  const L = SQ.L; if (!L || !d || !d.t) return;
  if (d.t === 'sqjoin' && d.user) {
    if (SQ.G && screen === 'squad3d') { c.send({ t: 'sqno', why: 'That party is in a match: try again when it ends' }); return; }
    if (L.players.length >= SQ_MAXP) { c.send({ t: 'sqno', why: 'That party is full' }); return; }
    const id = 'g-' + d.user.name + '#' + d.user.tag; let pl = L.players.find(p => p.id === id);
    if (!pl) { const n0 = L.players.filter(p => p.team === 0).length, n1 = L.players.length - n0; pl = { id, name: d.user.name, tag: d.user.tag, lv: d.user.lv, team: n0 <= n1 ? 0 : 1, ci: d.ci != null ? d.ci : rand() * CHARS.length | 0 }; L.players.push(pl);
      L.size = Math.max(L.size, Math.ceil(L.players.length / 2)); toast = { msg: acctName(d.user) + ' joined the party', t: 160 }; sfx('lock'); }
    SQ.conns[id] = c; c._id = id; c.send({ t: 'sqwel', id }); sqLobbySend();
  }
  else if (d.t === 'sqpick' && c._id) { const pl = L.players.find(p => p.id === c._id); if (pl && CHARS[d.ci]) { pl.ci = d.ci; sqLobbySend(); } }
  else if (d.t === 'sqteam' && c._id) { const pl = L.players.find(p => p.id === c._id); if (pl && L.players.filter(p => p.team === 1 - pl.team).length < Math.max(L.size, 5)) { pl.team = 1 - pl.team; sqLobbySend(); } }
  else if (d.t === 'sqleave' && c._id) sqDrop(c._id);
  else if (d.t === 'sqs' && c._id && SQ.G) { const p = sqP(c._id); if (p && !p.bot) sqFromOwner(p, d.d); }
}
function sqDropConn(c) { if (c._id && SQ.conns[c._id] === c) { delete SQ.conns[c._id]; sqDrop(c._id); } }
function sqDrop(id) {
  const L = SQ.L; if (!L) return; delete SQ.conns[id];
  L.players = L.players.filter(p => p.id !== id); sqLobbySend();
  const p = SQ.G && sqP(id); if (p) { p.bot = true; p.owner = null; p.name += ' (BOT)'; toast = { msg: p.name.replace(' (BOT)', '') + ' left: a bot takes over', t: 180 }; } // mid-match: a bot plays them out
}
function sqJoin(code) {
  if (!acct) { openAccountCreate('play'); return; }
  sqLeave(true); SQ.role = 'guest'; SQ.code = code; SQ.L = null; SQ.status = 'Joining party ' + code + '…'; setScreen('sqlobby');
  socialLoad(() => {
    if (SQ.role !== 'guest' || SQ.code !== code) return;
    const p = SQ.peer = mkPeer();
    p.on('open', () => {
      const c = SQ.hostConn = p.connect(SQ_PREFIX + code, { reliable: true, serialization: 'json' });
      c.on('open', () => c.send({ t: 'sqjoin', user: acctCard(), ci: acct && acct.fav != null ? Math.max(0, CHARS.findIndex(x => x.id === acct.fav)) : null }));
      c.on('data', d => sqGuestData(d));
      c.on('close', () => { if (SQ.hostConn === c) { sqLeave(true); setScreen('play'); toast = { msg: 'The party host left', t: 240 }; } });
      c.on('error', () => {});
    });
    p.on('error', e => { if (e.type === 'peer-unavailable' && SQ.role === 'guest' && !SQ.L) { sqLeave(true); setScreen('play'); toast = { msg: 'Party ' + code + ' not found', t: 220 }; } });
  });
  setTimeout(() => { if (SQ.role === 'guest' && SQ.code === code && !SQ.L) { sqLeave(true); setScreen('play'); toast = { msg: 'Could not reach party ' + code, t: 220 }; } }, 15000);
}
function sqGuestData(d) {
  if (!d || !d.t) return;
  if (d.t === 'sqwel') SQ.me = d.id;
  else if (d.t === 'sqlob') { SQ.L = d.L; SQ.status = ''; }
  else if (d.t === 'sqno') { sqLeave(true); setScreen('play'); toast = { msg: d.why, t: 220 }; }
  else if (d.t === 'sqgo') sqBuildMatch(d.init);
  else if (d.t === 'sqw') sqApplyWorld(d.d);
  else if (d.t === 'sqe') for (const e of d.l) sqOnEvent(e);
  else if (d.t === 'sqback') { SQ.G = null; setScreen('sqlobby'); }
  else if (d.t === 'sqend') { sqLeave(true); setScreen('play'); toast = { msg: 'The host closed the party', t: 220 }; }
}
function sqStart() {
  const L = SQ.L; if (!L || !sqHost()) return;
  const roster = sqRoster(L);
  if (!roster.some(p => p.team === 0) || !roster.some(p => p.team === 1)) { toast = { msg: 'Both teams need someone: turn bots on or move someone over', t: 200 }; sfx('back'); return; }
  const init = { mode: L.mode, stage: L.stage, size: L.size, players: roster };
  if (SQ.role === 'host') sqBroadcast({ t: 'sqgo', init });
  sqBuildMatch(init); sfx('confirm');
}
function sqSync(full) { if (SQ.role === 'host') sqBroadcast({ t: 'sqw', d: sqWorld() }); }
function sqBackToLobby() {
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
  SQ.G = null; if (SQ.role === 'host') sqBroadcast({ t: 'sqback' });
  if (SQ.role === 'guest') { setScreen('sqlobby'); return; }
  setScreen('sqlobby');
}
function sqLeave(quiet) {
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
  if (SQ.role === 'host') sqBroadcast({ t: 'sqend' }); else if (SQ.hostConn) { try { SQ.hostConn.send({ t: 'sqleave' }); } catch (e) {} }
  const p = SQ.peer; setTimeout(() => { try { p && p.destroy(); } catch (e) {} }, 300);
  Object.assign(SQ, { role: null, code: null, peer: null, conns: {}, hostConn: null, L: null, G: null, me: null, status: '' });
  if (window.R3D && R3D.hideSquad) R3D.hideSquad();
  if (!quiet) toast = { msg: 'You left the party', t: 140 };
}
// the result goes on your record
function sqRecord() {
  const G = SQ.G, me = sqP(SQ.me); if (!acct || !me || G.recorded) return; G.recorded = true;
  const res = G.win < 0 ? 'D' : G.win === me.team ? 'W' : 'L', S = acct.stats, k = 'squads';
  S.played++; if (res === 'W') S.w++; else if (res === 'L') S.l++; else S.d++;
  S.modes[k] = S.modes[k] || { w: 0, l: 0, d: 0 }; S.modes[k][res === 'W' ? 'w' : res === 'L' ? 'l' : 'd']++;
  S.fighters[me.f.c.id] = S.fighters[me.f.c.id] || { w: 0, l: 0, d: 0 }; S.fighters[me.f.c.id][res === 'W' ? 'w' : res === 'L' ? 'l' : 'd']++;
  const op = G.players.find(p => p.team !== me.team);
  acct.history.unshift({ t: Date.now(), m: k, me: me.f.c.id, op: op ? op.f.c.id : me.f.c.id, on: SQ_MODES[G.mode].name + ' ' + G.size + 'V' + G.size, r: res, fin: 0, fl: 0 }); acct.history.length = Math.min(acct.history.length, 30);
  const xp = Math.round((res === 'W' ? 150 : 60) + me.kos * 15 + me.dmg * 0.1); acct.xp += xp; let ups = 0; while (acct.xp >= xpNeed(acct.level)) { acct.xp -= xpNeed(acct.level); acct.level++; ups++; }
  G.xp = xp; saveAccounts(); if (ups) { toast = { msg: 'LEVEL UP! You are now level ' + acct.level, t: 240 }; sfx('ready'); }
}
