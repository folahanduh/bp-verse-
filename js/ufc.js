// ---------- BP FIGHT NIGHT: the octagon (a SPECIAL stage) ----------
// Fights here run like a real fight night. Each fighter walks out from the tunnel, down the walkway and into the
// cage while the crowd goes up; the referee brings them to the middle and starts it. Then three timed rounds, with
// a bell, a minute's breather (a little health back, stamina full) and the referee stepping in between them. Health
// is bigger here (hits do the same damage), so rounds go the distance more often. A knockout ends it at once;
// otherwise the three judges score every round 10-9 (10-8 for a beating) and read out the decision.
// The referee keeps his distance in the fight, off to the side of the action, and rushes in for a knockout.
// Positions in here are on the floor of the arena in game pixels (1 px = 1 cm), centred on the cage: X across,
// Z toward the camera, Y up. During the walkouts the fight line sits square (arenaReset), so the fight line's
// coordinates and the floor's are the same thing; after that the referee is placed through arenaFromWorld.
const OCT_M = { R: 495, PH: 120, DA: Math.PI * 0.75, TUN: 1900 }; // as js3d/stages3d.js OCT (in cm): post radius, platform, walkway angle, tunnel
const UFC_ROUNDS = 3, UFC_ROUND_T = 75 * CLOCK_F, UFC_HP = 1.7, UFC_BREAK = 210;
const UFC = { on: false, round: 1, walk: null, brk: null, dec: null, ref: null, rd: [], hp0: [0, 0], hype: 0.4, hpSeen: [0, 0] };
const ufcStage = () => !!(STAGES[stageId] && STAGES[stageId].special === 'ufc');
const REF = { id: 'ref', name: 'Referee', color: '#d8d8d8', inches: 71, kg: 86, skin: '#d9a07a', hair: '#2a1d16', shirt: '#121214', pants: '#16161a', shoes: '#0a0a0b', sleeves: false, tee: 1,
  build: { shoulder: 1.02, waist: 0.92, arm: 1, armW: 0.95, legW: 1, neck: 1, mob: 1, atk: 1, jump: 1 }, lines: {}, str: 50, spd: 50, dur: 50, iq: 50, hax: 50 };
const octAt = (a, r) => [Math.cos(a) * r, -Math.sin(a) * r]; // a direction on the floor (0 = +X, counter-clockwise seen from above)
const ufcCorner = side => octAt(Math.PI / 8 + (side ? 0 : 4) * Math.PI / 4, 380); // red corner (left) for P1, blue (right) for P2
const ufcStart = side => [(side ? 230 : -230), 0]; // where round one starts: the usual marks

// a new match on this stage (both host and guest run this; the host's state wins through the snapshot)
function ufcBegin(isDemo) {
  Object.assign(UFC, { on: ufcStage() && mode !== 'training', round: 1, walk: null, brk: null, dec: null, rd: [], hype: 0.4 });
  if (!UFC.on) { UFC.ref = null; return; }
  P.forEach(f => { f.maxHp = Math.round(f.maxHp * UFC_HP); f.hp = f.dispHp = f.maxHp; });
  timer = UFC_ROUND_T; UFC.hp0 = P.map(f => f.hp); UFC.hpSeen = P.map(f => f.hp);
  UFC.ref = { x: 0, z: 60, yaw: -Math.PI / 2, ph: 0, sp: 0, side: -1, act: 'stand' }; // side -1: the far side of the fight (away from the side-on camera)
  // the walkouts need the 3D arena; the 2D stage goes straight to the countdown
  if (!isDemo && use3D()) { UFC.walk = { t: 0 }; introT = 0; ufcWalkApply(); }
  else { introT = 130; banner = { txt: 'ROUND 1', t: 60, max: 60, c: '#ffd23f', slam: 1 }; }
}

// ---- the walkouts ----
// the challenger (blue, P2) first, then P1 (red); each walks tunnel -> walkway -> up the steps -> through the door -> their corner
const WALK_SPEED = 3.6, WALK_GAP = 300; // cm per frame; when the second walk starts
function walkPath(side) {
  const D = OCT_M.DA, c = ufcCorner(side), door = octAt(D, OCT_M.R - 60);
  return [[...octAt(D, OCT_M.TUN - 120), -OCT_M.PH], [...octAt(D, OCT_M.R + 225), -OCT_M.PH], [...octAt(D, OCT_M.R + 65), 0], [...door, 0], [c[0], c[1], 0]];
}
const pathLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
function along(pts, d) { // the point d cm along the path, and the way it's heading
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= L || i === pts.length - 1) { const k = clamp(d / (L || 1), 0, 1); return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), dx: (b[0] - a[0]) / (L || 1), dz: (b[1] - a[1]) / (L || 1), done: d >= L && i === pts.length - 1 }; } d -= L; }
}
const walkDur = side => Math.ceil(pathLen(walkPath(side)) / WALK_SPEED);
const walkStart = side => side === 1 ? 0 : WALK_GAP;
const walkEnd = () => Math.max(walkStart(1) + walkDur(1), walkStart(0) + walkDur(0));
const REF_LEN = 200; // the referee's instructions, then round one
function walkPhase() { const t = UFC.walk.t, e = walkEnd(); return t < e ? 'walk' : t < e + REF_LEN ? 'ref' : 'go'; }
// who the camera's on: the one walking out (the later walker once they've started)
function ufcWalker() { if (!UFC.walk) return -1; const t = UFC.walk.t; return t >= walkStart(0) ? 0 : 1; }
// set the fighters from the walkout clock (a pure function of it, so the guest's picture matches)
function ufcWalkApply() {
  const t = UFC.walk.t, e = walkEnd();
  P.forEach(f => {
    const s = f.side; let x, z, y = 0, yaw, mv = 0;
    if (t < e) {
      const lt = t - walkStart(s);
      if (lt < 0) { const p0 = walkPath(s)[0]; x = p0[0]; z = p0[1]; y = p0[2]; f.gone = true; } // still in the tunnel
      else { const a = along(walkPath(s), lt * WALK_SPEED); x = a.x; z = a.z; y = a.y; f.gone = false;
        if (a.done) yaw = Math.atan2(z, -x); else { yaw = Math.atan2(-a.dz, a.dx); mv = WALK_SPEED; } }
    } else { // the referee's call: from the corners to the marks, facing up
      const k = clamp((t - e) / 90, 0, 1), c = ufcCorner(s), m = ufcStart(s); f.gone = false;
      x = lerp(c[0], m[0], swing(k)); z = lerp(c[1], m[1], swing(k)); mv = k < 1 ? WALK_SPEED * 0.6 : 0;
      yaw = k < 1 ? Math.atan2(-(m[1] - c[1]), m[0] - c[0]) : s ? Math.PI : 0;
    }
    const prevX = f.x;
    f.x = WW / 2 + x; f.z = z; f.y = FLOOR - y; f.vy = 0; f.yawW = yaw; f.facing = 1; f.vx = mv; f.lv = 0; f.run = 0; f.intro = false; f.move = null; f.stun = 0; f.blocking = false;
    if (mv) f.walkPh += mv * 0.055 * 136 / f.h; else if (Math.abs(prevX - f.x) < 0.01) f.vx = 0;
  });
  // the referee waits in the middle, then calls them in
  const R = UFC.ref; if (R) { const ph = walkPhase(); R.act = ph === 'ref' ? 'talk' : 'stand'; R.x = 0; R.z = 70; R.sp = 0;
    const w = P[Math.max(0, ufcWalker())]; R.yaw = ph === 'walk' && w ? Math.atan2(-(w.z - R.z), (w.x - WW / 2) - R.x) : -Math.PI / 2; }
}
function ufcWalkTick() {
  const W = UFC.walk, t0 = W.t; W.t++;
  const e = walkEnd(), cross = v => t0 < v && W.t >= v;
  for (const s of [1, 0]) if (cross(walkStart(s) + 1)) { const f = P[s]; say('announcer', (s ? 'In the blue corner' : 'And in the red corner') + '... ' + f.c.name + '!'); sfx('crowd'); UFC.hype = 1; }
  if (cross(e + 30)) { say('announcer', 'Protect yourselves at all times. Let\'s get it on!'); }
  if (cross(e + 120)) { sfx('bell'); UFC.hype = 0.9; }
  UFC.hype = Math.max(0.55, UFC.hype * 0.998);
  ufcWalkApply();
  if (walkPhase() === 'go') ufcWalkEnd();
}
function ufcWalkEnd() {
  UFC.walk = null;
  P.forEach(f => { const m = ufcStart(f.side); f.x = WW / 2 + m[0]; f.z = 0; f.y = FLOOR; f.yawW = undefined; f.vx = 0; f.gone = false; f.facing = f.side ? -1 : 1; });
  UFC.ref.act = 'stand'; arenaReset(); updateCamera(true);
  introT = 130; banner = { txt: 'ROUND 1', t: 60, max: 60, c: '#ffd23f', slam: 1 };
}
// skip: straight to the referee's call (or past it)
function ufcSkip() {
  if (!UFC.walk) return; const e = walkEnd();
  if (UFC.walk.t < e) { UFC.walk.t = e; if ('speechSynthesis' in window) speechSynthesis.cancel(); } else ufcWalkEnd();
}

// ---- the rounds ----
// the clock ran out: the bell, the scores for the round, then the break (or the judges after the last)
function ufcRoundEnd() {
  if (finish || cine || P.some(f => f.ko || f.dazed)) { timer = 1; return; } // someone's going down: that comes first, the bell waits
  UFC.rd.push([UFC.hp0[1] - P[1].hp, UFC.hp0[0] - P[0].hp]); // damage each one did this round
  sfx('bell');
  if (UFC.round >= UFC_ROUNDS) { ufcDecision(); return; }
  UFC.brk = { t: 0 }; banner = { txt: 'END OF ROUND ' + UFC.round, t: 110, max: 110, c: '#ffffff', slam: 1 }; say('announcer', 'That\'s the end of round ' + UFC.round + '!');
}
function ufcBreakTick() {
  const B = UFC.brk; if (matchOver || P.some(f => f.ko)) { UFC.brk = null; return; } B.t++;
  if (B.t === 150) { banner = { txt: 'ROUND ' + (UFC.round + 1), t: 70, max: 70, c: '#ffd23f', slam: 1 }; say('announcer', UFC.round + 1 === UFC_ROUNDS ? 'Final round!' : 'Round ' + (UFC.round + 1) + '!'); }
  if (B.t >= UFC_BREAK) { // back to the marks: a little health back (not past a broken bar), stamina full
    UFC.brk = null; UFC.round++;
    P.forEach(f => { const m = ufcStart(f.side), cap = f.bar ? f.maxHp / 2 : f.maxHp;
      Object.assign(f, { x: WW / 2 + m[0], y: FLOOR, z: 0, vx: 0, vy: 0, lv: 0, move: null, stun: 0, dashT: 0, sideT: 0, blocking: false, facing: f.side ? -1 : 1, sta: 100, staT: 0 });
      if (!f.ko && f.kd) { f.kd = 0; f.kdT = 0; } f.hp = f.dispHp = Math.min(cap, f.hp + f.maxHp * 0.06); });
    projs = []; arenaReset(); arenaProps(); updateCamera(true);
    UFC.hp0 = P.map(f => f.hp); timer = UFC_ROUND_T; introT = 130; sfx('bell');
  }
}
// the judges: each scores every round to whoever did more (10-9; 10-8 for a beating; 10-10 if it was even)
function ufcDecision() {
  const mh = (P[0].maxHp + P[1].maxHp) / 2, cards = [0, 1, 2].map(() => {
    let a = 30, b = 30; for (const [d0, d1] of UFC.rd) { const diff = d0 - d1 + (rand() - 0.5) * 0.25 * (d0 + d1), big = Math.abs(diff) > 0.2 * mh; // judges see it a little differently (more so in a busy round)
      if (Math.abs(diff) < 0.012 * mh) continue; if (diff > 0) b -= big ? 2 : 1; else a -= big ? 2 : 1; }
    return [a, b]; });
  const v = cards.map(([a, b]) => a > b ? 0 : b > a ? 1 : -1), n0 = v.filter(x => x === 0).length, n1 = v.filter(x => x === 1).length;
  const w = n0 >= 2 ? 0 : n1 >= 2 ? 1 : -1, kind = w < 0 ? 'DRAW' : (w ? n1 : n0) === 3 ? 'UNANIMOUS DECISION' : v.includes(-1) ? 'MAJORITY DECISION' : 'SPLIT DECISION';
  UFC.dec = { t: 0, cards, w, kind }; banner = { txt: 'TIME!', t: 90, max: 90, c: '#ffffff', slam: 1 }; say('announcer', 'We go to the judges\' scorecards.');
}
function ufcDecisionTick() {
  const D = UFC.dec; D.t++;
  if (D.t === 150) { const w = D.w; say('announcer', w < 0 ? 'This fight is a draw!' : 'Winner, by ' + D.kind.toLowerCase() + '... ' + P[w].c.name + '!'); sfx('crowd'); UFC.hype = 1; }
  if (D.t === 330) { winner = D.w; endT = 1; } // on to the usual ending
}
// once a frame in the fight (host): the breaks, the judges, the referee and the crowd
function ufcTick() {
  if (!UFC.on) return;
  if (UFC.brk) ufcBreakTick();
  if (UFC.dec && !matchOver) ufcDecisionTick();
  // the crowd reacts to big hits and knockdowns
  P.forEach((f, i) => { const d = UFC.hpSeen[i] - f.hp; if (d > 0) UFC.hype = Math.min(1, UFC.hype + d / f.maxHp * 4); UFC.hpSeen[i] = f.hp; });
  if (P.some(f => f.ko || f.dazed)) UFC.hype = 1;
  UFC.hype = Math.max(0.4, UFC.hype * 0.995);
  ufcRefTick();
}
const ufcFrozen = () => UFC.on && !!(UFC.brk || UFC.dec || UFC.walk);

// ---- the referee ----
// in the fight he circles to stay off to the side of the two of them (about 2.4 m out), never in the way, inside
// the cage; between rounds he steps in between them; on a knockout he runs in, waving it off
function ufcRefTick() {
  const R = UFC.ref; if (!R || UFC.walk) return;
  const w = P.map(f => arenaToWorld(f.x, 0)), mx = (w[0][0] + w[1][0]) / 2, mz = (w[0][1] + w[1][1]) / 2;
  let tx, tz, act = 'stand';
  const down = P.find(f => f.ko || f.dazed);
  if (down) { const dw = arenaToWorld(down.x, 0), n = aNrm(arena.th); tx = dw[0] + n[0] * 90 * R.side; tz = dw[1] + n[1] * 90 * R.side; act = 'wave'; }
  else if (UFC.brk || UFC.dec || matchOver) { const n = aNrm(arena.th); tx = mx + n[0] * 40; tz = mz + n[1] * 40; act = UFC.brk && UFC.brk.t < 120 ? 'apart' : 'stand'; }
  else {
    const n = aNrm(arena.th), want = s => { let x = mx + n[0] * 240 * s, z = mz + n[1] * 240 * s; const r = Math.hypot(x, z), lim = 360; if (r > lim) { x *= lim / r; z *= lim / r; } return [x, z]; };
    const room = s => { const [x, z] = want(s); return Math.min(...w.map(p => Math.hypot(p[0] - x, p[1] - z))); };
    const pref = stormOn() ? R.side : -1; // side-on, he keeps to the far side; in the 3D arena he takes whichever side has room
    if (room(-R.side) > room(R.side) + 90 || (R.side !== pref && room(pref) > 150)) R.side = -R.side; // the other side has more room: cross over
    [tx, tz] = want(R.side);
  }
  // walk there (a little quicker when it's urgent), keeping clear of the fighters
  const dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz), top = down ? 6 : 3.2;
  R.sp = d > 6 ? Math.min(top, R.sp + 0.25, d * 0.12) : Math.max(0, R.sp - 0.4);
  if (d > 0.01) { R.x += dx / d * R.sp; R.z += dz / d * R.sp; }
  for (const p of w) { const ex = R.x - p[0], ez = R.z - p[1], e = Math.hypot(ex, ez); if (e < 80 && e > 0.01 && !down) { R.x += ex / e * (80 - e) * 0.3; R.z += ez / e * (80 - e) * 0.3; } }
  const r = Math.hypot(R.x, R.z); if (r > 390) { R.x *= 390 / r; R.z *= 390 / r; }
  R.ph += R.sp * 0.055 * 136 / 130;
  // face where he's going, or the action
  const fx2 = R.sp > 1 ? dx : (down ? arenaToWorld(down.x, 0)[0] : mx) - R.x, fz2 = R.sp > 1 ? dz : (down ? arenaToWorld(down.x, 0)[1] : mz) - R.z;
  const yw = Math.atan2(-fz2, fx2); R.yaw += wrapPi(yw - R.yaw) * 0.15; R.act = act;
}
// his pose: relaxed, hands up a little; walking legs; waving it off; arms out between them; talking
function refPose(R) {
  const s = Math.sin(R.ph), c = Math.cos(R.ph), mv = clamp(R.sp / 3, 0, 1), t = frame / 9;
  const p = mk({ lean: 0.04, crouch: 0.05, fu: 0.3, fl: 1.4, bu: 0.25, bl: 1.3, ft: 0.08, fs: 0.02, bt: -0.06, bs: -0.04, spread: 0.05 });
  if (mv > 0.05) { const st = 0.5 * mv; p.ft = 0.05 + st * s; p.bt = 0.05 - st * s; p.fs = p.ft - 0.6 * Math.max(0, c) * mv; p.bs = p.bt - 0.6 * Math.max(0, -c) * mv; p.fu = 0.3 - 0.3 * s * mv; p.bu = 0.25 + 0.3 * s * mv; p.lean = 0.06 + 0.1 * mv; }
  if (R.act === 'wave') { p.fu = 2.3 + Math.sin(t * 2.6) * 0.5; p.fl = 2.6; p.bu = 2.3 - Math.sin(t * 2.6) * 0.5; p.bl = 2.6; p.spread = 0.5 + Math.sin(t * 2.6) * 0.3; }
  else if (R.act === 'apart') { p.fu = 1.5; p.fl = 1.55; p.bu = 1.5; p.bl = 1.55; p.spread = 0.85; }
  else if (R.act === 'talk') { p.fu = 1.1 + Math.sin(t) * 0.25; p.fl = 2.0; p.bu = 0.4; p.bl = 1.6; p.ht = Math.sin(t * 0.7) * 0.08; }
  return p;
}
// what the renderer draws for him: on the fight line's coordinates
function ufcRefNpc() {
  const R = UFC.on && UFC.ref; if (!R || !use3D()) return null;
  const [x, l] = arenaFromWorld(R.x, R.z);
  return { c: REF, x, y: FLOOR, z: l, facing: 1, yaw: R.yaw - arena.th, pose: refPose(R) };
}

// ---- for the stage (js3d/stages3d.js): the crowd's mood, the jumbotron, the walkout spotlight ----
function OCT_HYPE() { return UFC.on ? UFC.hype : 0.45; }
function OCT_INFO() {
  if (!UFC.on || screen !== 'fight' || P.length < 2) return null;
  const s = Math.ceil(timer / CLOCK_F), clock = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  return [P[0].c.name.toUpperCase(), P[1].c.name.toUpperCase(), UFC.walk ? 'FIGHT NIGHT' : UFC.dec ? 'DECISION' : 'ROUND ' + UFC.round, UFC.walk ? 'MAIN EVENT' : clock];
}
function OCT_SPOT() { const i = ufcWalker(); if (i < 0 || walkPhase() !== 'walk') return null; const f = P[i]; return [(f.x - WW / 2) * 0.01, f.z * 0.01, (FLOOR - f.y) * 0.01 + 1]; }

// ---- online: the host sends the fight night's state with each snapshot ----
const ufcSnap = () => UFC.on ? { on: 1, round: UFC.round, walk: UFC.walk, brk: UFC.brk, dec: UFC.dec, ref: UFC.ref, hype: UFC.hype, rd: UFC.rd } : null;
function ufcApply(d) {
  if (!d) { UFC.on = false; return; }
  Object.assign(UFC, { on: true, round: d.round, walk: d.walk, brk: d.brk, dec: d.dec, ref: d.ref, hype: d.hype, rd: d.rd || [] });
}
// the clock as a fight clock (M:SS)
const ufcClock = () => { const s = Math.ceil(timer / CLOCK_F); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
