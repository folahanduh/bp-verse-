// ---------- grabs, throws, parries and background slams ----------
// GRAB (Q / U / RB) beats blocking. Each fighter throws in their own way; press GRAB right after being grabbed to
// break free. A block started just before a punch or kick lands PARRIES it: no damage and the attacker reels.
// One throw in ten, on stages with buildings or walls behind the fight, sends the victim into the background:
// they smash into the wall (cracks, or a broken window), slide down, get up and jump back into the fight.
const PARRY_WIN = 10, THROW_TECH = 10;
let BG_CHANCE = 0.1; // one throw in ten (on stages with a wall behind)
// the wall behind each stage that has one (metres back from the fight, what it is made of); open stages have none
const BG_SLAM = { club: [7.5, 'concrete'], hall: [7.8, 'marble'], court: [10.6, 'concrete'], subway: [6.0, 'tile'], alley: [7.0, 'glass'], gym: [8.8, 'brick'], penthouse: [7.0, 'glass'],
  junkyard: [6.5, 'metal'], temple: [8.9, 'stone'], garage: [11.6, 'concrete'] };
// the stage's wall, if it has one and the victim can be thrown into it
const wallFor = l => { const bg = BG_SLAM[STAGES[stageId] && STAGES[stageId].id]; return bg && !l.ko && !l.dazed ? bg : null; };
// exactly one throw in every ten (1 / BG_CHANCE) on a stage with a wall, at a random point in each run of ten
const bgBag = { n: 0, pick: -1 };
function rollWall() {
  if (BG_CHANCE >= 1) return true; if (BG_CHANCE <= 0) return false;
  const size = Math.round(1 / BG_CHANCE); if (bgBag.pick < 0) bgBag.pick = Math.floor(rand() * size);
  const hit = bgBag.n === bgBag.pick; if (++bgBag.n >= size) { bgBag.n = 0; bgBag.pick = -1; }
  return hit;
}
let bgMarks = [], bgMarkId = 0;
const kk = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

function tryGrab(f, foe) {
  if (!hittable(foe) || foe.held || foe.thr || foe.bg || foe.dazed || foe.kd || foe.y < FLOOR - 2 || f.y < FLOOR - 2) return;
  const reach = (f.bw * f.scale + foe.bw * foe.scale) * 0.5 + limbLen(f, 'arm') * 0.8 + 16, dx = foe.x - f.x; // about jab range: a grab at fighting distance connects
  if (Math.abs(dx) > reach || (Math.sign(dx) || f.facing) !== f.facing) return;
  f.hitDone = true;
  if (foe.move === 'grab' && foe.mt <= MOVES.grab.end + 1) { // both grabbed at once: they shove each other off
    for (const g of [f, foe]) { g.move = null; g.vx = -g.facing * 8; g.stun = g.stunMax = 10; g.hitType = 'high'; }
    fx('ring', (f.x + foe.x) / 2, f.y - f.h * 0.6, '#ffffff', 3); fx('text', (f.x + foe.x) / 2, f.y - f.h - 30, 'CLASH', '#fff'); sfx('block'); hitstop = 6; return;
  }
  f.move = null; f.dashT = 0; f.vx = 0; f.thr = { t: 0, d: f.facing, wall: wallFor(foe) && rollWall() ? 1 : 0 }; // this throw ends in the wall?
  foe.held = 1; foe.move = null; foe.stun = 0; foe.dashT = 0; foe.blocking = false; foe.vx = foe.vy = 0; foe.facing = -f.facing; foe.buf.grab = 0;
  if (foe.prop) { shatter(foe.prop, foe.x, foe.y - foe.h * 0.6); foe.prop = null; }
  sfx('grab'); hitstop = 5; cam.kick = Math.max(cam.kick, 0.03); cam.hx = foe.x; cam.hy = foe.y - foe.h * 0.6;
}
function throwTick(w, l) {
  const T = w.thr, t = ++T.t, d = T.d, S = THROWS[w.c.id] || THROWS.frank;
  if (t <= THROW_TECH && l.buf.grab > 0) { l.buf.grab = 0; throwEscape(w, l); return; }
  if (S(t, w, l, d, T) || t > 160) { endThrow(w, l); return; }
  if (w.thr && !l.bg) gripTick(w, l, t, T); // the thrower's hands go where they're holding the victim
}

// ---- where a fighter's body parts are, in game pixels (the same joint maths both renderers use) ----
function jointsOf(f, pose) {
  const p = Object.assign({}, pose || getPose(f)), s = f.scale, h = f.h * s, dir = f.facing, B = f.b;
  const legL = h * 0.46, th = legL * 0.52, sh = legL * 0.5, torso = h * 0.29, ua = h * 0.17 * B.arm, la = h * 0.16 * B.arm;
  const r = (14 + f.h * 0.05) * s, lw = f.lw * s, sw = f.sw * s, shoW = sw * B.shoulder, lg2 = lw * 0.88 * B.legW;
  p.ft += p.crouch; p.fs -= p.crouch; p.bt += p.crouch * 0.6; p.bs -= p.crouch * 1.2;
  const depth = (a, b) => th * Math.cos(a) + sh * Math.cos(b), onGround = f.y >= FLOOR - 0.5;
  const hipY = (onGround ? -Math.max(depth(p.ft, p.fs), depth(p.bt, p.bs)) : -legL * 0.95) - lg2 * 0.3;
  const X = (a, l2) => dir * Math.sin(a) * l2, Y = (a, l2) => Math.cos(a) * l2, gx = f.x + dir * (p.lunge || 0) * h * 0.9, gy = f.y;
  const rot = p.rot || 0, cr = Math.cos(-dir * rot), sr = Math.sin(-dir * rot), dy0 = -lw * 0.45 * rot / 1.5;
  const at = (x, y) => { y += dy0; return { x: gx + x * cr - y * sr, y: gy + x * sr + y * cr }; }; // body space -> world (with the body roll)
  const ux = dir * Math.sin(p.lean), uy = -Math.cos(p.lean), hip = { x: 0, y: hipY }, sho = { x: ux * torso, y: hipY + uy * torso };
  const head = { x: sho.x + ux * r * 0.95 + dir * r * 0.12, y: sho.y + uy * r * 0.95 };
  const fS = { x: sho.x + dir * shoW * 0.3, y: sho.y + 4 * s }, bS = { x: sho.x - dir * shoW * 0.3, y: sho.y + 4 * s };
  const hand = (S0, a1, a2) => ({ x: S0.x + X(a1, ua) + X(a2, la), y: S0.y + Y(a1, ua) + Y(a2, la) });
  const foot = (a1, a2) => ({ x: X(a1, th) + X(a2, sh), y: hipY + Y(a1, th) + Y(a2, sh) });
  const mix = (A, B2, k) => ({ x: A.x + (B2.x - A.x) * k, y: A.y + (B2.y - A.y) * k });
  const J = { hip, sho, head, neck: mix(sho, head, 0.4), chest: mix(hip, sho, 0.72), waist: mix(hip, sho, 0.18), fS, bS,
    fHand: hand(fS, p.fu, p.fl), bHand: hand(bS, p.bu, p.bl), fAnkle: foot(p.ft, p.fs), bAnkle: foot(p.bt, p.bs) };
  for (const k in J) J[k] = at(J[k].x, J[k].y);
  J.ua = ua; J.la = la; J.dir = dir; J.at = at; J.gx = gx; J.gy = gy;
  return J;
}
// two-joint arm IK in the pose's angle convention (0 = down, PI/2 = forward, PI = up): shoulder S -> target T
function solveArm(S, T, ua, la, dir) {
  const dx = (T.x - S.x) * dir, dy = T.y - S.y, d = clamp(Math.hypot(dx, dy), Math.abs(ua - la) + 1, ua + la - 0.5);
  const aD = Math.atan2(dx, dy), al = Math.acos(clamp((ua * ua + d * d - la * la) / (2 * ua * d), -1, 1));
  const a1 = aD - al, ex = Math.sin(a1) * ua, ey = Math.cos(a1) * ua; // the elbow bends down and out
  return [a1, Math.atan2(dx - ex, dy - ey)];
}
// each throw's hold: which part of the victim each hand is on, frame by frame (f = front hand, b = back hand)
const GRIPS = {
  frank: (t, T) => t <= 10 ? { f: 'waist', b: 'waist' } : t <= (T.wall ? 36 : 46) ? { f: 'chest', b: 'waist' } : null,
  blake: t => t < 44 ? { f: 'waist', b: 'waist' } : null,
  julian: t => t < 38 ? { f: 'fHand', b: t < 8 ? 'fHand' : 'chest' } : null,
  ryan: t => t <= 14 ? { f: 'fAnkle', b: 'bAnkle' } : null,
  darren: t => t < 38 ? { f: 'head', b: 'head' } : t < 46 ? { f: 'chest' } : null,
  clav: t => t < 38 ? { f: 'neck' } : null,
  tung: t => t < 46 ? { b: 'neck' } : null,
  hexum: t => t < 30 ? { f: 'neck', b: t < 12 ? 'neck' : 'chest' } : t < 40 ? { f: 'chest', b: 'waist' } : null,
  verity: t => t < 40 ? { f: 'head', b: 'head' } : null,
};
function gripTick(w, l, t, T) {
  const G = GRIPS[w.c.id] && GRIPS[w.c.id](t, T); if (!G || !w.finPose) return;
  const blend = clamp(t / 5, 0, 1); // reach in over the first few frames
  const pose = w.finPose = Object.assign({}, w.finPose), Jw = jointsOf(w, pose), Jl = jointsOf(l, l.finPose || getPose(l));
  for (const hnd of ['f', 'b']) {
    const part = G[hnd]; if (!part || !Jl[part]) continue;
    const S = hnd === 'f' ? Jw.fS : Jw.bS, tgt = Jl[part], side = hnd === 'f' ? 1 : -1;
    const T2 = part === 'head' ? { x: tgt.x - Jw.dir * 6, y: tgt.y + side * 6 } : part === 'waist' || part === 'chest' ? { x: tgt.x - Jw.dir * (l.bw * l.scale * 0.32), y: tgt.y + side * 5 } : tgt; // hands on the near side of the body
    const [a1, a2] = solveArm(S, T2, Jw.ua, Jw.la, Jw.dir);
    pose[hnd + 'u'] = lerp(pose[hnd + 'u'], a1, blend); pose[hnd + 'l'] = lerp(pose[hnd + 'l'], a2, blend);
  }
}
function throwEscape(w, l) {
  w.thr = null; w.finPose = null; l.held = 0; l.finPose = null; l.kd = 0; l.y = FLOOR; l.z = 0;
  for (const g of [w, l]) { g.vx = -g.facing * 7; g.stun = g.stunMax = 8; g.hitType = 'high'; }
  fx('ring', (w.x + l.x) / 2, w.y - w.h * 0.6, '#ffffff', 4); fx('text', (w.x + l.x) / 2, w.y - w.h - 34, 'ESCAPE!', '#9cf'); sfx('block'); hitstop = 8;
}
function endThrow(w, l) {
  w.thr = null; w.finPose = null; w.kd = 0; w.y = Math.min(w.y, FLOOR); w.z = 0;
  if (l.held) { l.held = 0; l.finPose = null; l.z = 0; if (l.kd === 1 && l.y >= FLOOR - 2) { l.kd = 2; l.kdT = 0; } }
}
// damage from a throw: never the last point of health (the finisher needs a standing, dazed opponent)
function throwDmg(w, l, base, check) {
  let dmg = base * 1.3 * w.power * (w.asc > 0 ? 1.25 : 1) * (w.weak > 0 ? 0.7 : 1); // throws stay a big reward against the bigger health pool
  if (w.ai && !demo) dmg *= DIFFS[difficulty].dmg;
  dmg = Math.min(dmg, Math.max(0, l.hp - 1));
  l.hp -= dmg; w.meter = Math.min(100, w.meter + dmg * 0.6 * w.meterMul); l.meter = Math.min(100, l.meter + dmg * 0.4 * l.meterMul);
  w.combo = 1; w.comboDmg = dmg; w.comboT = 80; l.flash = 6;
  if (check !== false) healthCheck(w, l, Math.sign(l.x - w.x) || w.facing, true);
}
// lay the victim flat on their back where they are
function lay(l) { l.held = 0; l.finPose = null; l.kd = 2; l.kdT = 0; l.y = FLOOR; l.vx = l.vy = 0; l.z = 0; l.bounced = true; }
// send the victim flying, or (sometimes) into the wall behind the stage
function launchOrSlam(w, l, vx, vy, spin) {
  const bg = wallFor(l);
  l.held = 0; l.finPose = null; l.z = 0;
  if (bg && w.thr && w.thr.wall) { bgStart(l, w, bg, Math.sign(vx) || w.facing); return; }
  if (l.kd === 1 && l.barAnim > 60) return; // the health-bar break already launched them
  l.kd = 1; l.kdT = 0; l.bounced = false; l.vx = vx * l.kbMul; l.vy = vy; l.spin = spin ? 1 : 0; l.wallHit = true; l.juggle = 0;
}
const holdPose = o => mk(o);
// ---- each fighter's throw: (t, thrower, victim, facing, state) -> true when done ----
const THROWS = {
  // FRANK: lifts them over his head and slams them down behind him
  frank(t, w, l, d, T) {
    if (T.wall && t > 36) { w.finPose = lp(mk({ fu: 2.0, fl: 2.1, bu: 2.0, bl: 2.1, lean: 0.4, crouch: 0.15, lunge: 0.1 }), GUARD, swing(kk(t, 42, 60))); return t >= 60; } // followed through
    const ws = w.scale, reachX = w.x + d * (w.bw * ws * 0.5 + l.bw * l.scale * 0.2), top = w.y - w.h * ws * 1.02;
    const lift = holdPose({ fu: 2.95, fl: 3.15, bu: 2.95, bl: 3.15, lean: -0.06, crouch: 0.1, ht: -0.25, spread: 0.2 });
    if (t <= 10) { w.finPose = lp(GUARD, mk({ fu: 1.3, fl: 1.7, bu: 1.2, bl: 1.7, lean: 0.25, crouch: 0.22 }), ease(t / 10)); l.x = lerp(l.x, reachX, 0.35); l.finPose = POSES.mid; }
    else if (t <= 26) { const k = swing(kk(t, 10, 26)); l.kd = 1; l.kdT = 30; l.x = lerp(reachX, w.x, k); l.y = lerp(FLOOR, top, k); l.z = Math.sin(k * Math.PI * 0.5) * 34; // up and toward the camera l.finPose = mk({ lean: -0.2, ht: -0.4, fu: 2.4, fl: 2.8, bu: 2.0, bl: 2.4, ft: 0.4, fs: 0.2, bt: -0.2, bs: -0.3, rot: 1.5 * k });
      w.finPose = lp(mk({ fu: 1.3, fl: 1.7, bu: 1.2, bl: 1.7, lean: 0.25, crouch: 0.22 }), lift, k); }
    else if (t <= 36) { const sh = Math.sin(t * 1.3); l.x = w.x; l.y = top - 6 + sh * 4; w.finPose = Object.assign({}, lift, { crouch: 0.12 + sh * 0.03 }); l.finPose = mk({ lean: -0.2, ht: -0.4 + sh * 0.1, fu: 2.4 + sh * 0.4, fl: 2.8, bu: 2.0 - sh * 0.4, bl: 2.4, ft: 0.4 + sh * 0.3, fs: 0.2, bt: -0.2, bs: -0.3, rot: 1.5 });
      if (t === 28) { shake = 6; sfx('thud'); }
      if (t === 36 && T.wall) { l.x = w.x + d * 30; w.finPose = mk({ fu: 2.0, fl: 2.1, bu: 2.0, bl: 2.1, lean: 0.4, crouch: 0.15, lunge: 0.1 }); throwDmg(w, l, 14); launchOrSlam(w, l, d * 16, -10, 1); sfx('heavy'); shake = 12; } } // hurls them over his head into the wall
    else if (t < 46) { const k = kk(t, 36, 46); l.x = lerp(w.x, w.x - d * w.h * ws * 0.5, k); l.y = lerp(top, FLOOR - 12, k * k); l.z = 34 * (1 - k) + Math.sin(k * Math.PI) * 46; // swung over and down l.finPose = mk({ lean: -0.2, ht: -0.4, fu: 2.6, fl: 2.9, bu: 2.3, bl: 2.6, ft: 0.6, fs: 0.3, bt: 0.2, bs: 0, rot: 1.5 + k * 1.1 });
      w.finPose = lp(lift, mk({ fu: 2.3, fl: 2.0, bu: 2.3, bl: 2.0, lean: -0.55, ht: -0.5, crouch: 0.18 }), k); }
    else if (t === 46) { l.x = w.x - d * w.h * ws * 0.55; lay(l); l.facing = d; throwDmg(w, l, 16); fx('crater', l.x, 1.05); shake = 26; cam.kick = 0.12; cam.hx = l.x; cam.hy = FLOOR - 40; sfx('heavy'); sfx('brk'); }
    else w.finPose = lp(mk({ fu: 2.3, fl: 2.0, bu: 2.3, bl: 2.0, lean: -0.55, ht: -0.5, crouch: 0.18 }), GUARD, swing(kk(t, 48, 66)));
    return t >= 66;
  },
  // BLAKE: a bear hug, a squeeze and a belly bump that bounces them away
  blake(t, w, l, d) {
    const hug = w.x + d * (w.bw * w.scale * 0.42 + l.bw * l.scale * 0.3), wrap = mk({ fu: 1.45, fl: 2.5, bu: 1.45, bl: 2.5, hz: 0.75, hzb: 0.75, lean: 0.12, spread: 0.3, crouch: 0.08 });
    if (t <= 8) { w.finPose = lp(mk({ fu: 1.2, fl: 1.7, bu: 1.2, bl: 1.7, lean: 0.25, spread: 0.6 }), wrap, ease(t / 8)); l.x = lerp(l.x, hug, 0.35); l.finPose = POSES.mid; }
    else if (t < 38) { const sh = Math.sin(t * 0.9); w.finPose = Object.assign({}, wrap, { lean: -0.12 + sh * 0.07, ht: -0.15, crouch: 0.12 }); l.x = hug; l.y = FLOOR - 14 - Math.abs(sh) * 9;
      l.finPose = mk({ lean: -0.3, ht: -0.4 + sh * 0.1, fu: 2.2 + sh * 0.5, fl: 2.6, bu: 2.0 - sh * 0.5, bl: 2.4, ft: 0.5 + sh * 0.3, fs: 0.3, bt: -0.4 - sh * 0.3, bs: -0.5, crouch: 0 });
      if (t % 8 === 0) { sfx('hit'); shake = 4; l.flash = 3; } }
    else if (t < 44) { w.finPose = mk({ lean: -0.38, fu: 0.4, fl: 1.0, bu: 0.4, bl: 1.0, spread: 0.55, crouch: 0.06 }); l.x = hug; l.y = FLOOR - 8; }
    else if (t === 44) { w.finPose = mk({ lean: 0.45, fu: -0.4, fl: 0.3, bu: -0.4, bl: 0.3, spread: 0.6, lunge: 0.12 }); throwDmg(w, l, 13); launchOrSlam(w, l, d * 15, -9, 0); sfx('heavy'); sfx('boing'); fx('ring', l.x, l.y - l.h * 0.5, w.c.color, 4); shake = 14; }
    else w.finPose = lp(mk({ lean: 0.45, fu: -0.4, fl: 0.3, bu: -0.4, bl: 0.3, spread: 0.6, lunge: 0.12 }), GUARD, swing(kk(t, 46, 60)));
    return t >= 60;
  },
  // JULIAN: catches a wrist, spins them round him in a whirlpool, then lets the tide throw them
  julian(t, w, l, d) {
    const R = (w.bw * w.scale + l.bw * l.scale) * 0.5 + 34;
    if (t <= 8) { w.finPose = lp(GUARD, mk({ fu: 1.5, fl: 1.6, lean: 0.2, tw: 0.3 }), ease(t / 8)); l.finPose = POSES.high; l.x = lerp(l.x, w.x + d * R, 0.3); }
    else if (t < 38) {
      const a = (t - 8) / 30 * Math.PI * 2.5; l.kd = 1; l.kdT = 30; l.x = w.x + d * Math.cos(a) * R; l.z = -Math.sin(a) * R; l.y = FLOOR - 30 - Math.min(1, (t - 8) / 10) * 34;
      l.finPose = mk({ lean: -0.1, ht: -0.4, fu: 2.4, fl: 2.9, bu: 1.9, bl: 2.5, ft: 0.9, fs: 0.5, bt: 0.6, bs: 0.2, rot: 1.15, spread: 0.5 });
      w.finPose = mk({ fu: 1.55, fl: 1.6, bu: 0.9, bl: 1.6, lean: -0.15, tw: Math.sin(a) * 0.9, crouch: 0.16, spread: 0.2 });
      if (t % 3 === 0) fx('sparks', l.x, l.y - 30, '#9fd4ff', 2); if (t % 10 === 0) sfx('whoosh');
    }
    else if (t === 38) { l.z = 0; l.x = w.x + d * R; throwDmg(w, l, 13); launchOrSlam(w, l, d * 13, -11, 1); fx('sparks', l.x, l.y - 40, '#bfe4ff', 30); fx('ring', l.x, l.y - 40, '#9fd4ff', 4); sfx('skill'); shake = 10; }
    else w.finPose = lp(mk({ fu: 1.6, fl: 1.6, bu: 1.2, bl: 1.4, lean: 0.25, tw: 0.4 }), GUARD, swing(kk(t, 40, 58)));
    return t >= 58;
  },
  // RYAN: dives at the ankles and tips them over, hops on their chest for two stomps, then backflips off
  ryan(t, w, l, d, T) {
    if (t <= 8) { w.finPose = mk({ crouch: 0.55, lean: 0.55, fu: 1.0, fl: 0.9, bu: 0.8, bl: 0.8 }); w.x = lerp(w.x, l.x - d * (w.bw * w.scale * 0.3 + l.bw * l.scale * 0.3), 0.3); l.finPose = POSES.high; }
    else if (t < 20) { const k = kk(t, 8, 20); l.finPose = mk({ lean: -0.3, ht: -0.4, fu: 1.6 * k, fl: 2.0 * k, bu: 1.2 * k, bl: 1.8 * k, ft: 0.7 * k, fs: 0.4 * k, rot: 1.52 * swing(k) }); w.finPose = mk({ crouch: 0.45, lean: 0.3, fu: 1.6, fl: 1.4, bu: 1.4, bl: 1.3 }); }
    else if (t === 20) { lay(l); l.held = 1; T.cx = l.x + d * l.h * l.scale * 0.5; T.sx = w.x; T.lx = l.x; sfx('thud'); fx('dust', l.x + d * 40, FLOOR, 12); throwDmg(w, l, 4, false); }
    else if (t < 30) { const k = kk(t, 20, 30); w.kd = 1; w.x = lerp(T.sx, T.cx, k); w.y = FLOOR - 26 - Math.sin(k * Math.PI) * 90 * (1 - k * 0.3); w.finPose = POSES.jump; }
    else if (t < 46) { w.kd = 0; w.x = T.cx; const st = (t - 30) % 8, up = st < 4 ? st / 4 : 1 - (st - 4) / 4; w.y = FLOOR - 26 - up * 22; w.finPose = mk({ crouch: 0.2 + 0.2 * (1 - up), fu: 2.5, fl: 3.0, bu: 2.3, bl: 2.9, ft: 0.3 + up * 0.4, fs: 0.1, bt: -0.4, bs: -0.6 });
      if (st === 7) { throwDmg(w, l, 4, false); sfx('hit'); fx('dust', T.cx, FLOOR, 6); shake = 6; l.flash = 4; } }
    else if (t < 64) { const k = kk(t, 46, 64); w.kd = 1; w.x = lerp(T.cx, T.lx - d * 90, k); w.z = Math.sin(k * Math.PI) * 40;
      if (t === 46 && T.wall) { l.held = 0; l.kd = 1; throwDmg(w, l, 6, false); bgStart(l, w, wallFor(l) || BG_SLAM.club, d); sfx('heavy'); shake = 10; fx('dust', T.cx, FLOOR, 10); } // wall throw: springs off their chest and kicks them into it
      w.y = FLOOR - 26 - Math.sin(k * Math.PI) * 120 + k * 26; w.finPose = mk({ crouch: 0.4, fu: 2.6, fl: 2.8, bu: 2.4, bl: 2.7, ft: 1.4, fs: 0.2, bt: 1.2, bs: 0.1, rot: -k * Math.PI * 2 }); }
    else if (t === 64) { w.kd = 0; w.y = FLOOR; w.z = 0; w.finPose = mk({ crouch: 0.35 }); fx('dust', w.x, FLOOR, 8); if (!l.bg) { l.held = 0; l.kdT = 8; healthCheck(w, l, d, true); } }
    return t >= 70;
  },
  // DARREN: hands on their temples, a mind lock that freezes them, then a two-finger push: they fall like a plank
  darren(t, w, l, d, T) {
    if (T.wall && t > 44) { w.finPose = lp(w.finPose || GUARD, GUARD, 0.1); return t >= 62; }
    const close = w.x + d * (w.bw * w.scale * 0.5 + l.bw * l.scale * 0.35), lock = mk({ fu: 1.55, fl: 2.6, bu: 1.5, bl: 2.65, hz: 0.5, hzb: 0.5, lean: 0.18, ht: -0.08 });
    if (t <= 8) { w.finPose = lp(GUARD, lock, ease(t / 8)); l.x = lerp(l.x, close, 0.35); l.finPose = POSES.high; }
    else if (t < 38) { l.x = close + (rand() - 0.5) * 3; l.finPose = mk({ lean: -0.1, ht: -0.25 + Math.sin(t) * 0.05, fu: 0.2, fl: 0.4, bu: 0.1, bl: 0.3, crouch: 0.02 }); l.vanish = t % 9 === 0 ? 2 : 0; w.finPose = lock;
      if (t % 6 === 0) fx('text', l.x + (rand() - 0.5) * 60, l.y - l.h * (0.7 + rand() * 0.4), '?', w.c.color); if (t === 10) sfx('skill'); }
    else if (t < 46) { l.vanish = 0; w.finPose = lp(lock, mk({ fu: 1.55, fl: 1.57, bu: 0.3, bl: 0.6, lean: 0.25, lunge: 0.05 }), kk(t, 38, 42)); if (t === 43) { sfx('dodge'); fx('ring', l.x, l.y - l.h * 0.85, w.c.color, 2); }
      if (t === 44 && T.wall) { l.vanish = 0; throwDmg(w, l, 13); launchOrSlam(w, l, d * 14, -8, 0); shake = 10; } } // the push sends them flying into the wall
    else if (t < 60) { const k = kk(t, 46, 60); l.finPose = mk({ lean: 0, ht: -0.1, fu: 0.1, fl: 0.2, bu: 0.1, bl: 0.2, rot: 1.52 * k * k, crouch: 0, ft: 0.05, fs: 0, bt: -0.05, bs: 0 }); w.finPose = lp(w.finPose, GUARD, 0.08); }
    else if (t === 60) { lay(l); throwDmg(w, l, 13); sfx('thud'); fx('dust', l.x + d * l.h * 0.4, FLOOR, 14); shake = 10; }
    return t >= 64;
  },
  // CLAVICULAR: grabs the collar, pulls them in for a stare that half turns them to stone, then shoves them away
  clav(t, w, l, d) {
    const close = w.x + d * (w.bw * w.scale * 0.45 + l.bw * l.scale * 0.3), pull = mk({ fu: 1.2, fl: 2.0, lean: -0.1, ht: -0.25, bu: 0.1, bl: 0.4, tw: -0.1 });
    if (t <= 8) { w.finPose = lp(GUARD, mk({ fu: 1.6, fl: 1.9, lean: 0.15, bu: 0.1, bl: 0.4 }), ease(t / 8)); l.x = lerp(l.x, close + d * 30, 0.3); l.finPose = POSES.high; }
    else if (t < 20) { l.x = lerp(l.x, close, 0.25); w.finPose = lp(w.finPose, pull, 0.25); }
    else if (t < 38) { w.finPose = pull; l.finPose = mk({ lean: -0.35, ht: 0.2, fu: 1.4, fl: 2.9, bu: 1.3, bl: 2.8, crouch: 0.15 }); l.stone = 0.2 * Math.abs(Math.sin(t * 0.5));
      if (t % 5 === 0) fx('sparks', w.x + d * 14, w.y - w.h * w.scale * 0.86, '#bfefff', 2); if (t === 22) sfx('skill'); }
    else if (t === 38) { l.stone = 0; w.finPose = mk({ fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.4, lunge: 0.1 }); throwDmg(w, l, 12); launchOrSlam(w, l, d * 10, -6, 0); sfx('heavy'); shake = 10; }
    else if (t > 42) w.finPose = mk({ fu: 1.1, fl: 2.9, hz: 0.9, bu: 0.1, bl: 0.4, lean: -0.08, ht: -0.15 }); // dusts off his shoulder
    return t >= 58;
  },
  // TUNG TUNG TUNG SAHUR: holds them by the collar, bonks them on the head three times, then a home-run swing
  tung(t, w, l, d) {
    const close = w.x + d * (w.bw * w.scale * 0.45 + l.bw * l.scale * 0.35), up = mk({ fu: 2.9, fl: 3.15, bu: 1.4, bl: 1.7, lean: -0.05, ht: -0.1 }), down = mk({ fu: 1.6, fl: 1.2, bu: 1.4, bl: 1.7, lean: 0.2, crouch: 0.08 });
    if (t <= 8) { w.finPose = lp(GUARD, up, ease(t / 8)); l.x = lerp(l.x, close, 0.35); l.finPose = POSES.high; }
    else if (t < 38) { const e = (t - 8) % 10; w.finPose = e < 6 ? lp(down, up, swing(e / 6)) : lp(up, down, overshoot((e - 6) / 4)); l.x = close;
      l.finPose = mk({ lean: -0.2, ht: e >= 9 || e < 2 ? 0.35 : 0.05, fu: 0.4, fl: 0.8, bu: 0.3, bl: 0.6, crouch: e >= 9 || e < 2 ? 0.18 : 0.06 });
      if (e === 9) { throwDmg(w, l, 3, false); sfx('block'); shake = 6; l.flash = 4; fx('text', l.x, l.y - l.h * l.scale - 34, t > 30 ? 'TUNG!!' : 'TUNG!', '#ffd08a'); fx('sparks', l.x, l.y - l.h * l.scale * 0.95, '#ffd08a', 6); } }
    else if (t < 48) w.finPose = lp(down, mk({ fu: 2.25, fl: 2.85, bu: 2.05, bl: 2.65, tw: -0.95, lean: -0.22, crouch: 0.22 }), swing(kk(t, 38, 46))); // winds up
    else if (t === 48) { w.finPose = mk({ fu: 1.6, fl: 1.55, bu: 1.5, bl: 1.5, tw: 1.05, lean: 0.32, lunge: 0.1 }); throwDmg(w, l, 8); launchOrSlam(w, l, d * 16, -12, 1); sfx('heavy'); sfx('brk'); fx('impact', l.x, l.y - l.h * 0.6, '#ffd08a', 2); shake = 16; cam.kick = 0.08; }
    else w.finPose = lp(mk({ fu: 1.6, fl: 1.55, bu: 1.5, bl: 1.5, tw: 1.05, lean: 0.32, lunge: 0.1 }), GUARD, swing(kk(t, 52, 66)));
    return t >= 66;
  },
  // HEXUMLITE: a collar grab, two knees, then he flips them over his hip onto their back
  hexum(t, w, l, d, T) {
    const close = w.x + d * (w.bw * w.scale * 0.45 + l.bw * l.scale * 0.3), hold = mk({ fu: 1.5, fl: 2.0, bu: 1.4, bl: 2.2, lean: 0.12, crouch: 0.06 });
    if (t <= 8) { w.finPose = lp(GUARD, hold, ease(t / 8)); l.x = lerp(l.x, close, 0.35); l.finPose = POSES.mid; }
    else if (t < 30) { const e = (t - 8) % 11; w.finPose = Object.assign({}, hold, e > 4 && e < 9 ? { ft: 2.0, fs: 0.2, lean: 0.2 } : {}); l.x = close; l.finPose = mk({ lean: 0.4, ht: 0.3, fu: 0.9, fl: 1.3, bu: 0.7, bl: 1.2, crouch: 0.2 });
      if (e === 7) { throwDmg(w, l, 3, false); sfx('hit'); shake = 5; l.flash = 4; } }
    else if (t === 30 && T.wall) { throwDmg(w, l, 8); launchOrSlam(w, l, d * 15, -9, 0); sfx('heavy'); shake = 12; }
    else if (t < 44 && !T.wall) { const k = swing(kk(t, 30, 44)); l.kd = 1; l.kdT = 30; l.x = lerp(close, w.x + d * (w.bw * w.scale * 0.5 + l.h * l.scale * 0.5), k); l.y = FLOOR - Math.sin(k * Math.PI) * w.h * w.scale * 0.75; l.z = Math.sin(k * Math.PI) * 30;
      l.finPose = mk({ lean: -0.2, ht: -0.4, fu: 2.4, fl: 2.8, bu: 2.0, bl: 2.4, ft: 0.5, fs: 0.2, bt: 0.2, bs: -0.2, rot: 1.6 * k });
      w.finPose = lp(hold, mk({ fu: 2.2, fl: 2.4, bu: 2.0, bl: 2.3, lean: 0.35, tw: 0.7, crouch: 0.25 }), k); }
    else if (t === 44 && !T.wall) { lay(l); l.x = w.x + d * (w.bw * w.scale * 0.5 + l.h * l.scale * 0.5); throwDmg(w, l, 8); sfx('heavy'); sfx('thud'); fx('dust', l.x, FLOOR, 14); shake = 16; }
    else w.finPose = lp(w.finPose || GUARD, mk({ fu: 1.1, fl: 2.9, hz: 0.5, bu: 0.2, bl: 0.5, ht: -0.14 }), 0.1); // fingers on the chain
    return t >= 64;
  },
  // VERITY: both long hands on their head, lifts them up to her grin, holds the stare, then drives them into the floor
  verity(t, w, l, d, T) {
    const close = w.x + d * (w.bw * w.scale * 0.5 + l.bw * l.scale * 0.4), lift = mk({ fu: 2.1, fl: 2.4, bu: 2.0, bl: 2.3, lean: -0.05, ht: -0.1, spread: 0.2 });
    if (t <= 8) { w.finPose = lp(GUARD, mk({ fu: 1.6, fl: 1.8, bu: 1.5, bl: 1.7, lean: 0.3, spread: 0.3 }), ease(t / 8)); l.x = lerp(l.x, close, 0.35); l.finPose = POSES.high; }
    else if (t < 40) { const k = swing(kk(t, 8, 20)), sh = t > 22 ? Math.sin(t * 1.4) * 3 : 0; l.kd = 1; l.kdT = 30; l.x = close + sh; l.y = FLOOR - k * l.h * l.scale * 0.32;
      w.finPose = lp(mk({ fu: 1.6, fl: 1.8, bu: 1.5, bl: 1.7, lean: 0.3, spread: 0.3 }), lift, k); w.finPose.ht = 0.1; w.finPose.hy = 0.25 * Math.sin(t / 6);
      l.finPose = mk({ lean: -0.1, ht: -0.3, fu: 1.4 + Math.sin(t / 3) * 0.3, fl: 2.5, bu: 1.3 - Math.sin(t / 3) * 0.3, bl: 2.4, ft: 0.3 + Math.sin(t / 2) * 0.3, fs: 0.1, bt: -0.3 - Math.sin(t / 2) * 0.3, bs: -0.3 });
      if (t === 24) { sfx('void'); fx('text', l.x, l.y - l.h * l.scale - 40, '...', w.c.color); } if (t === 30 || t === 36) { throwDmg(w, l, 2, false); l.flash = 3; } }
    else if (t === 40 && T.wall) { throwDmg(w, l, 9); launchOrSlam(w, l, d * 14, -8, 1); sfx('heavy'); shake = 12; }
    else if (t < 46 && !T.wall) { const k = kk(t, 40, 46); l.y = lerp(FLOOR - l.h * l.scale * 0.32, FLOOR, k * k); w.finPose = lp(lift, mk({ fu: 1.3, fl: 1.0, bu: 1.2, bl: 0.9, lean: 0.55, crouch: 0.3 }), k); }
    else if (t === 46 && !T.wall) { lay(l); throwDmg(w, l, 9); fx('crater', l.x, 0.9); sfx('heavy'); sfx('brk'); shake = 18; }
    else w.finPose = lp(w.finPose || GUARD, GUARD, 0.08);
    return t >= 66;
  },
};

// ---- parry ----
function parryHit(att, def, dir, hx, hy) {
  att.move = null; att.dashT = 0; att.stun = att.stunMax = 40; att.hitType = 'parried'; att.vx = -dir * 5 * att.kbMul; att.flash = 6; att.seq = [];
  def.meter = Math.min(100, def.meter + 8); def.vx = 0; def.parryT = 30;
  hitstop = 14; slowmo = Math.max(slowmo, 24); shake = Math.max(shake, 8); cam.kick = Math.max(cam.kick, 0.05); cam.hx = hx; cam.hy = hy;
  fx('ring', hx, hy, '#ffffff', 4); fx('sparks', hx, hy, '#ffd23f', 18); fx('text', hx, hy - 30, 'PARRY!', '#ffd23f'); sfx('parry');
}
const canParry = (def, M) => def.blocking && (M.limb === 'arm' || M.limb === 'leg') && !M.superHit && !M.prop && !M.proj &&
  frame - (def.blockStart || -999) <= PARRY_WIN && (!def.ai || (def.ai.parryUntil || 0) > frame);

// ---- background slam ----
function bgStart(l, w, bg, dir) {
  dir = dir || Math.sign(l.x - w.x) || w.facing;
  l.bg = { t: 0, zw: -bg[0] * 100 + 40, kind: bg[1], x0: l.x, xw: clamp(l.x + dir * 130, 140, WW - 140), back: clamp(l.x + dir * 40, 160, WW - 160), d: dir };
  l.kd = 1; l.kdT = 30; l.vx = l.vy = 0; l.z = 0; l.held = 0;
  slowmo = Math.max(slowmo, 26); shake = Math.max(shake, 8); sfx('whoosh');
  banner = { txt: 'WALL SLAM!', t: 60, max: 60, c: '#ffd23f', small: 1 };
}
function bgTick(f, foe) {
  const B = f.bg, t = ++B.t;
  if (t <= 26) { const k = kk(t, 0, 26); f.z = lerp(0, B.zw, ease(k)); f.x = lerp(B.x0, B.xw, k); f.y = FLOOR - 40 - Math.sin(k * Math.PI * 0.8) * 120 - k * 40; f.kd = 1; f.kdT = 30;
    f.finPose = mk({ lean: -0.1, ht: -0.4, fu: 2.4, fl: 2.9, bu: 1.9, bl: 2.5, ft: 0.9, fs: 0.5, bt: 0.6, bs: 0.2, rot: 1.2 + k * 0.3, spread: 0.6 }); }
  else if (t === 27) { f.z = B.zw; f.y = FLOOR - 150; bgMarks.push({ x: f.x, y: f.y - 40, z: B.zw - 40, kind: B.kind, id: bgMarkId++, f: frame }); if (bgMarks.length > 6) bgMarks.shift();
    shake = 22; cam.kick = 0.1; sfx('heavy'); sfx(B.kind === 'glass' ? 'glass' : 'brk'); fx('debris', f.x, f.y - 40, 10);
    throwDmg(foe, f, 5, false); f.finPose = mk({ lean: 0, ht: 0.1, fu: 2.6, fl: 2.9, bu: 2.5, bl: 2.8, ft: 0.25, fs: 0.1, bt: -0.25, bs: -0.1, spread: 1.0, rot: 0 }); }
  else if (t < 44) { const k = kk(t, 27, 44); f.y = lerp(FLOOR - 150, FLOOR, k * k); f.finPose = lp(mk({ lean: 0, ht: 0.1, fu: 2.6, fl: 2.9, bu: 2.5, bl: 2.8, ft: 0.25, fs: 0.1, bt: -0.25, bs: -0.1, spread: 1.0 }), SIT, k); }
  else if (t < 76) { f.y = FLOOR; f.kd = 2; f.kdT = Math.min(f.kdT + 1, 30); f.finPose = null; if (t === 44) { fx('dust', f.x, FLOOR, 10); sfx('thud'); } }
  else if (t < 98) { f.kd = 3; f.kdT = t - 76; f.finPose = null; }
  else if (t < 132) { const k = kk(t, 98, 132); f.kd = 0; f.facing = foe.x > f.x ? 1 : -1; f.z = lerp(B.zw, 0, ease(k)); f.x = lerp(B.xw, B.back, k); f.y = FLOOR - Math.sin(k * Math.PI) * 110; f.finPose = k < 0.9 ? POSES.jump : null; if (t === 98) sfx('jump'); }
  else { f.bg = null; f.z = 0; f.y = FLOOR; f.kd = 0; f.kdT = 0; f.finPose = null; f.juggle = 0; fx('dust', f.x, FLOOR, 10); sfx('thud'); healthCheck(foe, f, -B.d, true); }
}
