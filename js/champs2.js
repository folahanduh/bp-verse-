// ---------- MIKE MIKE and COOKIE KING: their roles, abilities, moves, shots, lines and finishers ----------
// (their looks and stats are with everyone else's in core.js; the hooks that make the new casts work live in
// fighter.js (1v1), squads.js (Squads), human.js (the big head, the cookies, the crown, the green suit) and render3d.js)
Object.assign(ROLE_OF, { mike: 'flank', cookie: 'attack' });
// a1m / a2m: the move an ability plays (instead of the role's usual one); a1i / a2i: its icon (icons.js)
Object.assign(ABIL, {
  mike: { a1: ['STARE STEP', 'Blinks out and reappears right behind them.'], a2: ['HEAD WARP', 'Hold to aim, let go to warp: his head swells up and he\'s instantly there.'], a2m: 'headport', a2i: 'headport' },
  cookie: { a1: ['BELLY CHARGE', 'Charges in belly and arms first and flattens whoever he runs through.'], a1m: 'bellycharge', a1i: 'charge',
    a2: ['COOKIE BARRAGE', 'Lobs five cookie bombs one after another: each one blows up where it lands.'], a2m: 'cookierapid', a2i: 'cookierapid' },
});
Object.assign(RANGED, {
  mike: ['lasercast', 'EYE LASERS', 'A white beam and a black beam fire straight out of his eyes.'],
  cookie: ['cookieshot', 'COOKIE SHOT', 'A cookie fired fast and flat from range.'],
});
// who gets a second ability: every flank, and anyone whose kit has one
const hasAbil2 = f => roleOf(f) === 'flank' || !!abilOf(f).a2m;

// ---- the shots ----
Object.assign(PROJ, {
  laser: { speed: 22, r: 9, dmg: 7, kb: 3, stun: 18, hs: 5, eye: 1 },
  cookie: { speed: 14, r: 12, dmg: 8, kb: 5, stun: 18, hs: 6, crumbs: 1 },
  cbomb: { speed: 8, r: 12, dmg: 10, kb: 9, stun: 22, hs: 7, arc: 1, boom: 1, crumbs: 1 }, // blows up when it lands
});
// the telekinetic slam at the end of THE STARE; the belly-slam's shockwave in THE LAST BATCH
const TK_SLAM = { dmg: 30, kb: 4, stun: 44, hs: 14, heavy: 1, superHit: 1, kd: 1, hy: 0.5, limb: 'arm', hitText: 'SLAM!' };
const BATCH_HIT = { dmg: 22, kb: 16, stun: 34, hs: 12, heavy: 1, superHit: 1, kd: 1, launch: -9, hy: 0.4, limb: 'arm', hitText: 'BAKED!' };

Object.assign(MOVES, {
  // MIKE MIKE: his head swells up and he drives it into you
  headbutt: { dur: 42, start: 15, end: 20, dmg: 19, limb: 'bite', rm: 1.1, hy: 0.88, hh: 0.3, kb: 12, stun: 34, hs: 14, heavy: 1, bighead: 1.3, hitText: 'BONK!', dash: 7,
    wind: { lean: -0.35, ht: -0.4, crouch: 0.2, fu: 0.6, fl: 1.6, bu: 0.5, bl: 1.5, ft: 0.4, bt: -0.3 }, hit: { lean: 0.8, ht: 0.55, crouch: 0.22, fu: 0.3, fl: 0.6, bu: 0.2, bl: 0.5, lunge: 0.14, ft: 0.7, bt: -0.6, bs: -0.8 } },
  // THE STARE: head huge, eyes huge, both hands up: everyone round him goes up into the air, then down into the floor
  telekin: { dur: 84, start: 16, end: 18, cast: 'tk', superHit: 1, armor: 1, bighead: 1.1,
    wind: { crouch: 0.2, lean: -0.15, ht: -0.3, fu: 1.4, fl: 2.4, bu: 1.4, bl: 2.4, spread: 0.6 }, hit: { lean: 0.05, ht: -0.35, fu: 2.6, fl: 3.0, bu: 2.5, bl: 2.9, spread: 0.8 } },
  lasercast: { dur: 22, start: 8, end: 9, cast: 'proj', proj: 'laser',
    wind: { ht: 0.25, lean: -0.08, fu: 0.4, fl: 1.2, bu: 0.4, bl: 1.2 }, hit: { ht: -0.15, lean: 0.12, fu: 0.4, fl: 1.2, bu: 0.4, bl: 1.2, lunge: 0.03 } },
  // COOKIE KING: a cookie bomb smacked into your face, a cookie fired from range, a belly charge, a barrage, the last batch
  cookiebomb: { dur: 40, start: 14, end: 18, dmg: 17, limb: 'arm', rm: 1.15, hy: 0.72, kb: 13, stun: 30, hs: 12, heavy: 1, kd: 1, launch: -8, hitText: 'BOOM!', boom: 1, step: 3,
    wind: { fu: 2.7, fl: 3.2, bu: 0.5, bl: 1.2, lean: -0.25, tw: -0.6, crouch: 0.1 }, hit: { fu: 1.55, fl: 1.55, bu: 0.4, bl: 1.0, lean: 0.4, tw: 0.6, lunge: 0.1 } },
  cookieshot: { dur: 24, start: 9, end: 10, cast: 'proj', proj: 'cookie',
    wind: { fu: 1.0, fl: 2.8, bu: 0.4, bl: 1.2, lean: -0.1, tw: -0.4 }, hit: { fu: 1.6, fl: 1.6, bu: 0.4, bl: 1.0, lean: 0.22, tw: 0.4, point: 1 } },
  bellycharge: { dur: 36, start: 6, end: 26, dmg: 13, reach: 30, hy: 0.5, kb: 15, stun: 28, hs: 9, heavy: 1, dash: 12, kd: 1, wall: 1, launch: -5, hitText: 'BELLY!',
    wind: { crouch: 0.25, lean: -0.3, fu: 0.8, fl: 1.4, bu: 0.8, bl: 1.4, spread: 0.5 }, hit: { lean: -0.4, crouch: 0.1, fu: 1.4, fl: 1.5, bu: 1.4, bl: 1.5, spread: 0.7, lunge: 0.12 } },
  cookierapid: { dur: 48, start: 8, end: 9, cast: 'proj', proj: 'cbomb', multi: [16, 24, 32, 40], spread: 0.6,
    wind: { fu: 2.6, fl: 3.1, bu: 0.6, bl: 1.4, lean: -0.2, tw: -0.5 }, hit: { fu: 1.7, fl: 1.8, bu: 2.4, bl: 3.0, lean: 0.25, tw: 0.5 } },
  lastbatch: { dur: 62, start: 26, end: 28, cast: 'batch', superHit: 1, armor: 1, line: 'THE LAST BATCH!',
    wind: { crouch: 0.45, lean: -0.3, fu: 2.9, fl: 3.2, bu: 2.8, bl: 3.1, ht: -0.25 }, hit: { crouch: 0.55, lean: 0.55, fu: 1.2, fl: 1.4, bu: 1.2, bl: 1.4, spread: 0.6 } },
});

Object.assign(INTRO_LINES, {
  mike: ['……'], // he doesn't talk
  cookie: ['Fresh out the oven.', 'Bow to the batch.', 'The jawline is the crown.', 'Crumbs. That\'s all you\'ll be.'],
});
Object.assign(SHOWPOSE, {
  mike: t => mk({ fu: 0.3, fl: 0.5, bu: 0.25, bl: 0.45, lean: 0.12, ht: 0.18 + Math.sin(t / 30) * 0.03, crouch: 0.04 }), // leaning in, staring right at you
  cookie: t => mk({ fu: 0.6, fl: 2.2, bu: 0.6, bl: 2.2, spread: 0.5, lean: -0.12, ht: -0.15 + Math.sin(t / 26) * 0.03, hy: 0.2 }), // hands on his hips, chin up
});

// ---- 1v1: Mike's HEAD WARP (no aiming on a fight line: in close he warps out, from range he warps right in) ----
function headport1v1(f, foe) {
  const E = arenaEdges(), d = Math.sign(foe.x - f.x) || 1, far = Math.abs(foe.x - f.x) > 300;
  const tx = far ? foe.x - d * (foe.bw * foe.scale * 0.5 + f.bw * f.scale * 0.5 + 30) : f.x - d * 320;
  fx('ring', f.x, f.y - f.h * f.scale * 0.9, f.c.color, 4); fx('sparks', f.x, f.y - f.h * f.scale * 0.9, '#ffffff', 10);
  f.x = clamp(tx, E[0] + 40, E[1] - 40); f.vx = 0; f.facing = foe.x > f.x ? 1 : -1; f.vanish = 8; f.bhT = 26; sfx('dodge');
  fx('ring', f.x, f.y - f.h * f.scale * 0.9, f.c.color, 4); fx('sparks', f.x, f.y - f.h * f.scale * 0.9, '#ffffff', 10);
}
// ---- 1v1: THE STARE holds them in the air, then drives them down ----
function tkTick(f) {
  const v = f.tkFoe; if (!v) return; f.tkT++;
  if (v.ko || f.move !== 'telekin') { v.held = 0; v.tkBy = null; f.tkFoe = null; return; }
  const t = f.tkT;
  if (t < 56) { v.y = lerp(v.y, FLOOR - 250, 0.07); v.x += Math.sin(t * 1.7) * 1.2; v.stun = 40; v.vx = v.vy = 0; if (t % 6 === 0) fx('sparks', v.x, v.y - v.h * 0.5, '#e6e6f0', 3); shake = Math.max(shake, 3); }
  else { v.held = 0; v.tkBy = null; f.tkFoe = null; applyHit(f, v, TK_SLAM, f.facing, v.x, v.y - v.h * 0.5); v.vy = 26; v.vx = 0; shake = 16; sfx('heavy'); fx('text', v.x, v.y - v.h - 30, 'SLAM!', '#ffffff'); }
}
// ---- 1v1: a cookie bomb going off (where it lands, or in their face) ----
function cookieBoom(x, y, owner) {
  fx('impact', x, y, '#ffb347', 1.6); fx('ring', x, y, '#ffd08a', 4); fx('sparks', x, y, '#a8682a', 12); fx('sparks', x, y, '#3a2010', 8); sfx('heavy'); shake = Math.max(shake, 6);
  const foe = P[1 - owner];
  if (foe && hittable(foe) && Math.abs(foe.x - x) < 90 && Math.abs(foe.y - foe.h * 0.4 - y) < 140) applyHit(P[owner], foe, Object.assign({ proj: 1 }, PROJ.cbomb), Math.sign(foe.x - x) || 1, foe.x, y);
}
const crumbs = (x, y) => { fx('sparks', x, y, '#b5742c', 9); fx('sparks', x, y, '#3a2010', 5); };

// ---- finishers ----
Object.assign(FIN_LEN, { mindslam: 236, crumble: 220 });
Object.assign(FIN_SCRIPTS, {
  // ---- MIKE MIKE: MIND SLAM. The stare, the head swells, they float up off the floor... and come down through it ----
  mindslam(cn, w, l, t, d, k, launch) {
    w.bhT = t < 200 ? 30 : 0;
    if (t < 60) { w.finPose = finP({ fu: 0.3, fl: 0.5, bu: 0.25, bl: 0.45, lean: 0.15, ht: 0.22, crouch: 0.05 });
      shot(cn, 1, { x: w.x + d * 6, y: w.y - w.h * 0.9, yaw: d * lerp(0.15, 0.3, k(0, 60)), dist: 1.1, fov: 20, lift: -0.3 }); }
    else if (t < 150) { // up they go
      w.finPose = lp(w.finPose, finP({ fu: 2.6, fl: 3.0, bu: 2.5, bl: 2.9, spread: 0.8, lean: -0.05, ht: -0.3 }), 0.1);
      l.dazed = true; l.vx = 0; l.y = lerp(l.y, FLOOR - 320, 0.035); l.x += Math.sin(t * 1.3) * 0.8;
      l.finPose = finP({ fu: 0.4, fl: 0.6, bu: 0.4, bl: 0.6, lean: -0.2, ht: -0.3, crouch: -0.05, spread: 0.4, rot: Math.sin(t / 9) * 0.15 });
      if (t % 5 === 0) fx('sparks', l.x + (rand() - 0.5) * 40, l.y - rand() * l.h, '#e6e6f0', 2); if (t === 64) sfx('void'); shake = Math.max(shake, 2);
      shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 200, yaw: -d * 0.35, dist: 4.6, fov: 34, lift: 0.4 }); }
    else if (t < 158) { w.finPose = lp(w.finPose, finP({ fu: 1.4, fl: 1.4, bu: 1.3, bl: 1.3, lean: 0.55, crouch: 0.3, ht: 0.3 }), 0.4); shot(cn, 3, { x: w.x, y: w.y - w.h * 0.9, yaw: d * 0.2, dist: 0.9, fov: 18 }); }
    else {
      if (t === 158) { launch(0, 34, 1); }
      if (l.y >= FLOOR - 4 && !cn.slammed) { cn.slammed = 1; l.sink = 0.35; fx('crater', l.x, 1.8); fx('impact', l.x, FLOOR - 20, '#ffffff', 2.4); fx('ring', l.x, FLOOR - 10, '#ffffff', 7); sfx('heavy'); sfx('brk'); shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 30; screenFlash = 6; slowmo = 18; }
      if (t > 190) w.finPose = lp(w.finPose, SHOWPOSE.mike(frame), 0.08);
      shot(cn, 4, t < 196 ? { x: l.x, y: FLOOR - 90, yaw: d * 0.3, dist: 4.4, fov: 32 } : { x: w.x, y: w.y - w.h * 0.88, yaw: d * 0.3, dist: 1.2, fov: 22 });
    }
  },
  // ---- COOKIE KING: ROYAL CRUMBLE. Three cookie bombs in the face, then he jumps and lands belly-first on them ----
  crumble(cn, w, l, t, d, k, launch) {
    if (t === 4) say('cookie', 'Kneel.');
    const up = finP({ fu: 2.7, fl: 3.2, bu: 0.5, bl: 1.2, lean: -0.25, tw: -0.6 }), out = finP({ fu: 1.55, fl: 1.55, bu: 0.4, bl: 1.0, lean: 0.4, tw: 0.6 });
    if (t < 36) { w.finPose = SHOWPOSE.cookie(frame); shot(cn, 1, { x: w.x + d * 4, y: w.y - w.h * 0.85, yaw: d * 0.35, dist: 1.6, fov: 22, lift: -0.4 }); }
    else if (t < 108) { const e = (t - 36) % 24; w.finPose = e < 14 ? lp(out, up, e / 14) : lp(up, out, overshoot((e - 14) / 6));
      l.dazed = true; l.vx = 0;
      if (e === 18) { const hx = l.x - d * 10, hy = l.y - l.h * l.scale * 0.8; fx('impact', hx, hy, '#ffb347', 1.8); fx('ring', hx, hy, '#ffd08a', 4); crumbs(hx, hy); fx('text', hx, hy - 30, 'BOOM!', '#ffd08a'); sfx('heavy'); shake = 10; l.flash = 4; l.x += d * 6; }
      shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 110, yaw: d * 0.45, dist: 3.8, fov: 30 }); }
    else if (t < 150) { const q = k(108, 146); // the leap
      if (t === 108) cn.jx = w.x; w.x = lerp(cn.jx, l.x - d * 10, q); w.y = FLOOR - Math.sin(q * Math.PI) * 260; w.finPose = finP({ fu: 2.9, fl: 3.2, bu: 2.8, bl: 3.1, crouch: 0.3, lean: 0.5, spread: 0.6 });
      shot(cn, 3, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 170, yaw: -d * 0.3, dist: 5, fov: 34, lift: 0.3 }); }
    else {
      if (t === 150) { w.y = FLOOR; l.dazed = false; l.ko = true; l.kd = 2; l.squash = 1; l.finPose = null; fx('crater', l.x, 2); fx('flat', l.x, FLOOR, '#d08a3a'); crumbs(l.x, FLOOR - 30); crumbs(l.x - 30, FLOOR - 40); crumbs(l.x + 30, FLOOR - 40); sfx('heavy'); sfx('thud'); shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 30; screenFlash = 5; slowmo = 16; }
      w.finPose = t < 178 ? finP({ crouch: 0.55, lean: 0.55, fu: 1.2, fl: 1.4, bu: 1.2, bl: 1.4, spread: 0.6 }) : lp(w.finPose, SHOWPOSE.cookie(frame), 0.08);
      shot(cn, 4, t < 184 ? { x: l.x, y: FLOOR - 80, yaw: d * 0.35, dist: 4, fov: 32 } : { x: w.x, y: w.y - w.h * 0.85, yaw: d * 0.3, dist: 1.5, fov: 22 });
    }
  },
});
