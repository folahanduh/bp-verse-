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
  if (S(t, w, l, d, T) || t > 160) endThrow(w, l);
}
function throwEscape(w, l) {
  w.thr = null; w.finPose = null; l.held = 0; l.finPose = null; l.kd = 0; l.y = FLOOR; l.z = 0;
  for (const g of [w, l]) { g.vx = -g.facing * 7; g.stun = g.stunMax = 8; g.hitType = 'high'; }
  fx('ring', (w.x + l.x) / 2, w.y - w.h * 0.6, '#ffffff', 4); fx('text', (w.x + l.x) / 2, w.y - w.h - 34, 'ESCAPE!', '#9cf'); sfx('block'); hitstop = 8;
}
function endThrow(w, l) {
  w.thr = null; w.finPose = null; w.kd = 0; w.y = Math.min(w.y, FLOOR);
  if (l.held) { l.held = 0; l.finPose = null; l.z = 0; if (l.kd === 1 && l.y >= FLOOR - 2) { l.kd = 2; l.kdT = 0; } }
}
// damage from a throw: never the last point of health (the finisher needs a standing, dazed opponent)
function throwDmg(w, l, base, check) {
  let dmg = base * w.power * (w.asc > 0 ? 1.25 : 1) * (w.weak > 0 ? 0.7 : 1);
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
    else if (t <= 26) { const k = swing(kk(t, 10, 26)); l.kd = 1; l.kdT = 30; l.x = lerp(reachX, w.x, k); l.y = lerp(FLOOR, top, k); l.finPose = mk({ lean: -0.2, ht: -0.4, fu: 2.4, fl: 2.8, bu: 2.0, bl: 2.4, ft: 0.4, fs: 0.2, bt: -0.2, bs: -0.3, rot: 1.5 * k });
      w.finPose = lp(mk({ fu: 1.3, fl: 1.7, bu: 1.2, bl: 1.7, lean: 0.25, crouch: 0.22 }), lift, k); }
    else if (t <= 36) { const sh = Math.sin(t * 1.3); l.x = w.x; l.y = top - 6 + sh * 4; w.finPose = Object.assign({}, lift, { crouch: 0.12 + sh * 0.03 }); l.finPose = mk({ lean: -0.2, ht: -0.4 + sh * 0.1, fu: 2.4 + sh * 0.4, fl: 2.8, bu: 2.0 - sh * 0.4, bl: 2.4, ft: 0.4 + sh * 0.3, fs: 0.2, bt: -0.2, bs: -0.3, rot: 1.5 });
      if (t === 28) { shake = 6; sfx('thud'); }
      if (t === 36 && T.wall) { l.x = w.x + d * 30; w.finPose = mk({ fu: 2.0, fl: 2.1, bu: 2.0, bl: 2.1, lean: 0.4, crouch: 0.15, lunge: 0.1 }); throwDmg(w, l, 14); launchOrSlam(w, l, d * 16, -10, 1); sfx('heavy'); shake = 12; } } // hurls them over his head into the wall
    else if (t < 46) { const k = kk(t, 36, 46); l.x = lerp(w.x, w.x - d * w.h * ws * 0.5, k); l.y = lerp(top, FLOOR - 12, k * k); l.finPose = mk({ lean: -0.2, ht: -0.4, fu: 2.6, fl: 2.9, bu: 2.3, bl: 2.6, ft: 0.6, fs: 0.3, bt: 0.2, bs: 0, rot: 1.5 + k * 1.1 });
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
    else if (t < 64) { const k = kk(t, 46, 64); w.kd = 1; w.x = lerp(T.cx, T.lx - d * 90, k);
      if (t === 46 && T.wall) { l.held = 0; l.kd = 1; throwDmg(w, l, 6, false); bgStart(l, w, wallFor(l) || BG_SLAM.club, d); sfx('heavy'); shake = 10; fx('dust', T.cx, FLOOR, 10); } // wall throw: springs off their chest and kicks them into it
      w.y = FLOOR - 26 - Math.sin(k * Math.PI) * 120 + k * 26; w.finPose = mk({ crouch: 0.4, fu: 2.6, fl: 2.8, bu: 2.4, bl: 2.7, ft: 1.4, fs: 0.2, bt: 1.2, bs: 0.1, rot: -k * Math.PI * 2 }); }
    else if (t === 64) { w.kd = 0; w.y = FLOOR; w.finPose = mk({ crouch: 0.35 }); fx('dust', w.x, FLOOR, 8); if (!l.bg) { l.held = 0; l.kdT = 8; healthCheck(w, l, d, true); } }
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
