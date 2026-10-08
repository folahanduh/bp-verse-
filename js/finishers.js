// ---------- finishers: a short film for every fighter ----------
// Each finisher is a script on the cinematic's clock (cn.t). It poses both fighters (finPose), moves them, fires
// effects and sounds, and directs the camera shot by shot through cn.cam (the 3D renderer cuts when cn.shot changes).
// The world can change too: Frank runs through a portal into a basketball arena, Julian floods the stage,
// Darren drags his victim into an inverted void.
const FIN_LEN = { dunk: 440, flop: 322, tide: 240, flick: 240, erase: 230, stone: 250 };
let arenaOn = false; // Frank's finisher ends in another world: the arena stays up until the next match
const finP = o => mk(o);
// a camera shot: x, y in game pixels (y up from the floor is FLOOR - n), z depth; yaw, dist (m), fov, lift
function shot(cn, id, o) { cn.shot = id; cn.cam = o; }

function startFinisher(f, foe) {
  finish = null;
  const d = f.facing = foe.x > f.x ? 1 : -1, id = f.c.fin.id;
  if (id === 'dunk') f.x = clamp(f.x, 200 + (d < 0 ? 560 : 0), WW - 200 - (d > 0 ? 560 : 0)); // room to run for the portal
  if (id === 'tide') f.x = clamp(f.x, 140 + (d < 0 ? 330 : 0), WW - 140 - (d > 0 ? 330 : 0));
  foe.x = clamp(f.x + d * (id === 'flop' ? 260 : id === 'tide' ? 230 : id === 'flick' ? 160 : 130), 60, WW - 60); foe.facing = -d; foe.vx = 0; f.vx = 0;
  f.move = foe.move = null; f.blocking = false;
  cine = { kind: 'fin', t: 0, max: FIN_LEN[id], side: f.side, x: (f.x + foe.x) / 2, y: FLOOR - 90, fid: id, x0: foe.x };
  banner = null; // FINISH HIM! has done its job: the film starts clean
  sfx('fin'); if (id !== 'dunk') say(f.c.id, f.c.fin.line);
}

function finTick(cn) {
  const w = P[cn.side], l = P[1 - cn.side], t = cn.t, d = w.facing, k = (a, b) => clamp((t - a) / (b - a), 0, 1);
  const launch = (vx, vy, spin) => { l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.bounced = false; l.vx = vx; l.vy = vy; l.spin = spin ? 1 : 0; l.finPose = null; l.wallHit = false; };
  if (l.dazed) l.finPose = null;
  const S = FIN_SCRIPTS[cn.fid]; if (S) S(cn, w, l, t, d, k, launch);
}

const FIN_SCRIPTS = {
  // ---- FRANK: "LEJOHN!!!", a choke lift, a sprint through a portal into a packed arena, and the alley-oop ----
  dunk(cn, w, l, t, d, k, launch) {
    const ws = w.scale, head = w.y - w.h * ws * 0.92;
    if (t < 42) { // the scream
      w.finPose = finP({ fu: 1.4, fl: 2.1, bu: 1.4, bl: 2.1, spread: 1.0, ht: -0.42, lean: -0.16, crouch: 0.16 });
      if (t === 4) { say('frank', 'LEJOHN!!!'); sfx('roar'); }
      if (t > 8 && t < 34) shake = Math.max(shake, 7);
      shot(cn, 1, { x: w.x + d * 8, y: head + 6, yaw: d * 0.55, dist: 1.55, fov: 24, lift: -0.4 });
      l.finPose = null;
    } else if (t < 62) { // grabs them by the neck and lifts them off their feet
      const kk2 = k(42, 52); w.x += d * (kk2 < 1 ? 5 : 0);
      w.finPose = lp(finP({ fu: 1.4, fl: 2.1, bu: 1.4, bl: 2.1, spread: 1.0, ht: -0.4, lean: -0.15 }), finP({ fu: 1.95, fl: 2.05, bu: 0.4, bl: 2.2, lean: 0.12, ht: -0.1 }), swing(kk2));
      if (t >= 52) { l.dazed = false; l.ko = true; l.kd = 0; l.vx = l.vy = 0; l.x = w.x + d * (w.bw * ws * 0.5 + l.bw * l.scale * 0.2 + 10); l.y = FLOOR - 46 * swing(k(52, 58));
        l.finPose = finP({ lean: -0.1, ht: -0.5, fu: 1.7, fl: 2.7, bu: 1.6, bl: 2.6, ft: 0.35 + Math.sin(t / 3) * 0.2, fs: 0.05, bt: -0.25 - Math.sin(t / 3) * 0.2, bs: -0.45, crouch: 0 }); }
      if (t === 52) { sfx('grab'); shake = 10; }
      shot(cn, 2, { x: (w.x + l.x) / 2, y: FLOOR - 140, yaw: d * 0.38, dist: 3.4, fov: 30 });
    } else if (t < 108) { // sprints for the portal with them dangling
      if (!cn.portal) { cn.portal = { x: clamp(w.x + d * 560, 120, WW - 120), open: 0 }; sfx('portal'); }
      cn.portal.open = Math.min(1, cn.portal.open + 0.06);
      const ph = t * 0.6; w.x += d * 9; w.x = d > 0 ? Math.min(w.x, cn.portal.x) : Math.max(w.x, cn.portal.x);
      w.finPose = finP({ ft: 0.15 + 0.9 * Math.sin(ph), bt: 0.15 - 0.9 * Math.sin(ph), fs: -0.3 - 0.9 * Math.max(0, Math.cos(ph)), bs: -0.3 - 0.9 * Math.max(0, -Math.cos(ph)), fu: 1.95, fl: 2.05, bu: 0.9 * Math.sin(ph), bl: 1.4, lean: 0.35 });
      l.x = w.x + d * (w.bw * ws * 0.5 + l.bw * l.scale * 0.2 + 10); l.y = FLOOR - 46 + Math.abs(Math.sin(ph)) * 6;
      l.finPose = finP({ lean: -0.2, ht: -0.5, fu: 1.7, fl: 2.7, bu: 1.6, bl: 2.6, ft: 0.6, fs: 0.3, bt: -0.6, bs: -0.8 });
      if (t % 4 === 0) fx('dust', w.x - d * 20, FLOOR, 3);
      if (Math.abs(w.x - cn.portal.x) < 30 && !cn.into) { cn.into = t; sfx('whoosh'); }
      if (cn.into && t > cn.into + 4) { w.gone = l.gone = true; }
      shot(cn, 3, { x: w.x + d * 120, y: FLOOR - 130, yaw: -d * 0.28, dist: 5.2, fov: 34 });
    } else if (t === 108) { // through to the other side
      screenFlash = 14; sfx('heroslam'); sfx('crowd');
      arenaOn = true; cn.portal = null; w.gone = l.gone = false;
      w.x = d > 0 ? 420 : WW - 420; l.x = w.x + d * (w.bw * ws * 0.5 + l.bw * l.scale * 0.2 + 10); l.y = FLOOR;
      cn.hoop = { x: w.x + d * 270, rise: 1 }; cn.mate = { x: w.x - d * 760, y: FLOOR, facing: d, pose: null };
    } else {
      const D = t - 108 + 16; // the alley-oop, on its own clock, starting from the call
      if (t < 140) shot(cn, 4, { x: w.x + d * 200, y: FLOOR - 230, yaw: d * 0.42, dist: 10.5, fov: 40, lift: 0.5 }); // the arena, the crowd, the hoop
      else { cn.cam = null; cn.shot = 5; }
      if (D === 18) say('frank', 'Lejohn! Lob it!');
      finDunk(cn, w, l, D, d, (a, b) => clamp((D - a) / (b - a), 0, 1));
      if (cn.boom && !cn.cheer) { cn.cheer = 1; sfx('crowd'); }
    }
  },
  // ---- BLAKE: a finger snap, a puff of glitter, the furry. They can't believe it. He pounces. ----
  flop(cn, w, l, t, d, k, launch) {
    const head = w.y - w.h * w.scale * 0.92;
    if (t < 34) {
      w.finPose = lp(GUARD, finP({ fu: 1.75, fl: 2.95, bu: 0.3, bl: 1.0, lean: -0.05, ht: -0.15 }), swing(k(0, 14)));
      if (t === 24) { sfx('snap'); fx('sparks', w.x + d * 24, head - 10, '#ffd1ec', 14); }
      shot(cn, 1, { x: w.x + d * 10, y: w.y - w.h * 0.86, yaw: d * 0.75, dist: 2.5, fov: 27 });
    } else if (t < 60) {
      if (t === 34) { w.furT = 100000; sfx('poof'); fx('dust', w.x, FLOOR - 40, 30); fx('sparks', w.x, w.y - w.h * 0.6, '#ff8fc7', 46); fx('ring', w.x, w.y - w.h * 0.5, '#ffb3dd', 6); shake = 10; }
      if (t === 42) say('blake', 'Nyaa!');
      w.finPose = finP({ fu: 2.3, fl: 2.9, bu: 2.2, bl: 2.8, crouch: 0.16, ht: -0.12, lean: 0.05 });
      if (t % 4 === 0) fx('sparks', w.x + (rand() - 0.5) * 60, w.y - w.h * (0.4 + rand() * 0.6), '#ffc4e6', 2);
      shot(cn, 2, { x: w.x, y: head + 24, yaw: d * 0.8, dist: 2.6, fov: 26 }); // the reveal: ears, whiskers, fur
    } else if (t < 96) { // they look around, scratch their head: what just happened?
      l.dazed = false; l.ko = true; const s = Math.sin(t / 6);
      l.finPose = finP({ tw: s * 0.6, ht: -0.15 + Math.sin(t / 4) * 0.08, fu: 1.4, fl: 3.2, bu: 0.1, bl: 0.4, lean: -0.08 + s * 0.04, crouch: 0.04 });
      if (t % 9 === 0) fx('text', l.x + (rand() - 0.5) * 60, l.y - l.h * (0.95 + rand() * 0.2), '?', '#ffffff');
      w.finPose = finP({ fu: 2.3, fl: 2.9, bu: 2.2, bl: 2.8, crouch: 0.16, ht: -0.05, lean: 0.12 });
      shot(cn, 3, { x: lerp(w.x, l.x, 0.65), y: FLOOR - l.h * 0.8, yaw: -d * 0.36, dist: 3.1, fov: 26 });
    } else if (t < 120) { // crouches like a cat, wiggles, and...
      w.finPose = finP({ crouch: 0.62, lean: 0.62, fu: 1.1, fl: 1.0, bu: 1.0, bl: 0.9, tw: Math.sin(t * 0.9) * 0.25, ht: -0.2 });
      l.finPose = finP({ tw: 0.4, ht: -0.1, fu: 0.3, fl: 0.6, bu: 0.1, bl: 0.4, lean: -0.15 });
      shot(cn, 4, { x: (w.x + l.x) / 2, y: FLOOR - 70, yaw: d * 0.5, dist: 4.4, fov: 30, lift: -0.6 });
    } else if (!cn.pinned) {
      if (t === 120) { w.vy = -17; w.vx = (l.x - d * 26 - w.x) / 26; sfx('jump'); slowmo = 40; }
      w.finPose = finP({ fu: 2.1, fl: 2.3, bu: 2.0, bl: 2.2, ft: 1.0, fs: 0.4, bt: -0.6, bs: -0.9, lean: 0.62, ht: -0.25 });
      if (t > 124 && w.y >= FLOOR) { cn.pinned = t; w.vx = 0; l.kd = 2; l.kdT = 0; l.finPose = null; l.y = FLOOR; shake = 14; sfx('heavy'); fx('dust', l.x, FLOOR, 14); }
      shot(cn, 5, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.3, dist: 4.8, fov: 32, lift: -0.3 });
    } else if (t < cn.pinned + 48) { // the scratch frenzy
      const e = t - cn.pinned, sw = Math.floor(e / 7) % 2; w.x = l.x - d * 20; w.y = FLOOR - 26;
      w.finPose = finP({ crouch: 0.5, lean: 0.75, fu: sw ? 2.4 : 1.0, fl: sw ? 2.8 : 0.6, bu: sw ? 1.0 : 2.4, bl: sw ? 0.6 : 2.8, ht: 0.2 });
      if (e % 7 === 3) { fx('sparks', l.x + (rand() - 0.5) * 40, FLOOR - 30, '#ffffff', 10); fx('text', l.x + (rand() - 0.5) * 70, FLOOR - 70, 'SCRATCH', '#ff8fc7'); sfx('hit'); shake = 6; l.flash = 4; }
      shot(cn, 6, { x: l.x - d * 10, y: FLOOR - 60, yaw: d * 0.55, dist: 4.0, fov: 32, lift: 0.3 });
    } else if (!cn.hit) { // one huge jump, and the belly flop
      if (!cn.up) { cn.up = 1; w.vy = -19; w.vx = 0; w.y = FLOOR - 30; sfx('jump'); }
      w.finPose = finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, ft: 0.6, fs: 0.2, bt: 0.3, bs: -0.3, lean: 0, rot: -1.5 * swing(k(cn.pinned + 52, cn.pinned + 80)), spread: 0.8 });
      if (w.vy > 0 && w.y >= FLOOR - 4) { cn.hit = t; w.vy = 0; w.y = FLOOR; l.squash = 1; shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 40;
        fx('flat', l.x, FLOOR, w.c.color); fx('crater', l.x, 1.7); fx('sparks', l.x, FLOOR - 30, '#ff8fc7', 40); sfx('heavy'); sfx('thud'); sfx('brk'); }
      shot(cn, 7, { x: l.x, y: Math.min(FLOOR - 120, (w.y + FLOOR) / 2 - 50), yaw: d * 0.42, dist: 5.8, fov: 36, lift: -0.2 });
    } else { // licks his paw
      w.finPose = lp(finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, rot: -1.5 }), finP({ fu: 1.35, fl: 3.4, bu: 0.3, bl: 1.0, ht: 0.25, lean: 0.1, crouch: 0.1 }), swing(clamp((t - cn.hit - 12) / 24, 0, 1)));
      if (t % 6 === 0) fx('sparks', w.x + (rand() - 0.5) * 60, w.y - w.h * rand(), '#ffc4e6', 2);
      shot(cn, 8, { x: w.x, y: w.y - w.h * 0.75, yaw: d * 0.7, dist: 2.2, fov: 26 });
    }
  },
  // ---- JULIAN: the sea answers. A wave taller than a house, a flooded stage, a whirlpool, then nothing ----
  tide(cn, w, l, t, d, k, launch) {
    let wv = projs.find(p => p.fin);
    if (t < 46) { // calls it up
      w.finPose = lp(GUARD, finP({ fu: 2.8, fl: 3.1, bu: 2.6, bl: 3.0, lean: -0.18, ht: -0.25, crouch: 0.05 }), swing(k(0, 36)));
      cn.flood = 0.12 * k(10, 46); if (t % 3 === 0) fx('sparks', w.x + (rand() - 0.5) * 90, FLOOR - rand() * 20, '#6fc0ff', 2); if (t === 6) sfx('surge'); shake = Math.max(shake, 3 * k(10, 46));
      shot(cn, 1, { x: w.x, y: w.y - w.h * 0.6, yaw: d * 0.82, dist: 2.7, fov: 28, lift: -0.7 });
    } else if (t < 86) { // the wave rises behind them; they turn and look up
      if (!wv) projs.push(wv = { owner: w.side, kind: 'wave', x: l.x + d * 150, y: FLOOR - 60, vx: 0, vy: 0, r: 40, life: 400, t: 0, fin: 1 });
      wv.t++; wv.r = lerp(40, 250, swing(k(46, 84))); wv.y = FLOOR - wv.r * 0.9; wv.vx = -d * 0.01; wv.x = l.x + d * 150;
      if (t % 2 === 0) fx('sparks', wv.x - d * wv.r * 0.4, FLOOR - wv.r * 1.6, '#e6f4ff', 3);
      l.dazed = false; l.ko = true; l.facing = d; l.finPose = finP({ lean: -0.35, ht: -0.65, fu: 1.3, fl: 2.9, bu: 1.2, bl: 2.8, crouch: 0.12 }); // facing the wave, terrified
      w.finPose = finP({ fu: 2.9, fl: 3.2, bu: 2.7, bl: 3.1, lean: -0.2, ht: -0.3 });
      if (t === 50) sfx('surge');
      shot(cn, 2, { x: l.x + d * 60, y: FLOOR - 240, yaw: -d * 0.2, dist: 7.6, fov: 36, lift: -0.4 });
    } else if (t < 106) { // it breaks over them
      if (wv) { wv.r = Math.max(0, wv.r - 13); wv.x -= d * 7; wv.y = FLOOR - wv.r * 0.9; }
      if (t === 92) { launch(0, -6, 1); fx('sparks', l.x, FLOOR - 120, '#e6f4ff', 80); fx('ring', l.x, FLOOR - 60, '#bfe4ff', 10); screenFlash = 8; shake = 24; sfx('heavy'); sfx('splash'); }
      cn.flood = lerp(0.12, 1, k(90, 106));
      w.finPose = finP({ fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.3, tw: 0.3 });
      shot(cn, 3, { x: l.x, y: FLOOR - 80, yaw: d * 0.25, dist: 3.6, fov: 34, lift: -0.9 });
    } else if (t < 168) { // a whirlpool spins them round and round
      if (wv) projs = projs.filter(p => !p.fin);
      const a = (t - 106) * 0.21, R = 70; l.kd = 1; l.kdT = 30; l.vx = l.vy = 0; l.x = cn.x0 + Math.cos(a) * R; l.z = Math.sin(a) * R; l.y = FLOOR - 30 - Math.sin((t - 106) / 62 * Math.PI) * 50;
      l.finPose = finP({ lean: -0.1, ht: -0.4, fu: 2.4, fl: 2.9, bu: 1.9, bl: 2.5, ft: 0.9, fs: 0.5, bt: 0.6, bs: 0.2, rot: 1.2 + Math.sin(a) * 0.4, spread: 0.6 });
      if (t % 3 === 0) fx('sparks', l.x + (rand() - 0.5) * 120, FLOOR - 10, '#9fd4ff', 3);
      w.finPose = finP({ fu: 1.3, fl: 2.6, bu: 1.3, bl: 2.6, hz: 0.6, hzb: 0.6, ht: 0.05 }); // hands together, calm
      if (t === 110) sfx('surge');
      shot(cn, 4, { x: cn.x0, y: FLOOR - 70, yaw: d * 0.2 + (t - 106) * 0.028, dist: 4.6, fov: 34, lift: 0.85 });
    } else if (t < 196) { // the water drains and drops them
      cn.flood = 1 - k(168, 192); l.z = lerp(l.z || 0, 0, 0.2);
      if (t === 168) { launch(0, 3, 0); l.y = FLOOR - 50; l.x = cn.x0; }
      if (!cn.landed && l.y >= FLOOR - 2 && t > 170) { cn.landed = 1; l.z = 0; fx('crater', l.x, 1.0); fx('sparks', l.x, FLOOR - 10, '#bfe4ff', 30); shake = 16; sfx('splash'); sfx('thud'); }
      shot(cn, 5, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 110, yaw: d * 0.4, dist: 5.2, fov: 32 });
    } else { cn.flood = 0; l.z = 0; w.finPose = lp(w.finPose, SHOWPOSE.julian(frame), 0.08); shot(cn, 6, { x: w.x, y: w.y - w.h * 0.72, yaw: d * 0.7, dist: 2.4, fov: 28 }); }
  },
  // ---- RYAN: grows to the size of a building, flicks them into orbit, and they come back down ----
  flick(cn, w, l, t, d, k, launch) {
    const grow = t < 150 ? swing(k(0, 56)) : 1 - swing(k(150, 178));
    w.big = 40; w.scale = 1 + 1.6 * grow;
    if (t < 60) { w.finPose = finP({ fu: 2.7, fl: 3.0, bu: 2.5, bl: 3.0, lean: -0.12, crouch: 0.05 * Math.sin(t / 5) }); if (t % 10 === 0) { shake = 6; sfx('thud'); }
      shot(cn, 1, { x: w.x + d * 30, y: FLOOR - 30, yaw: d * 0.7, dist: 2.3, fov: 42, lift: -1.25 }); }
    else if (t < 92) { w.finPose = finP({ fu: 0.6, fl: 2.2, bu: 0.3, bl: 2.4, lean: 0.25, ht: 0.45, crouch: 0.15 }); l.finPose = finP({ lean: -0.4, ht: -0.65, fu: 1.4, fl: 2.9, bu: 1.3, bl: 2.8 }); l.dazed = false; l.ko = true;
      shot(cn, 2, { x: (w.x + l.x) / 2, y: FLOOR - 230, yaw: d * 0.3, dist: 7.2, fov: 34, lift: -0.85 }); }
    else if (t < 100) { w.finPose = lp(finP({ fu: 0.2, fl: 0.3, lean: 0.5, crouch: 0.3, point: 1 }), finP({ fu: 1.5, fl: 2.6, lean: 0.4, crouch: 0.25, point: 1 }), overshoot(k(94, 98)));
      if (t === 96) { launch(d * 4, -30, 1); sfx('flick'); sfx('heavy'); shake = 22; fx('impact', l.x, l.y - l.h * 0.4, '#b44dff', 2.4); }
      shot(cn, 3, { x: l.x, y: FLOOR - 60, yaw: d * 0.35, dist: 4.2, fov: 32 }); }
    else if (t < 150) { // up, up, up
      if (!l.gone && !cn.back && l.y < FLOOR - 430) { l.gone = true; cn.gx = l.x; cn.gt = t; fx('impact', l.x, FLOOR - 470, '#ffffff', 1.4); sfx('dodge'); }
      if (cn.gt && t === cn.gt + 16) { fx('ring', cn.gx, FLOOR - 470, '#fff6c0', 3); fx('sparks', cn.gx, FLOOR - 470, '#fff6c0', 16); sfx('select'); } // *ting*
      w.finPose = lp(w.finPose, finP({ fu: 2.7, fl: 3.0, bu: -2.6, bl: -2.9, ht: -0.4 }), 0.1);
      shot(cn, 4, { x: cn.gx || l.x, y: Math.max(FLOOR - 470, l.y), yaw: d * 0.1, dist: 5.5, fov: 40, lift: -1.4 }); }
    else if (t < 176) { w.finPose = finP({ fu: 1.3, fl: 2.6, bu: 1.3, bl: 2.6, hz: 0.6, hzb: 0.6, crouch: 0.1 }); shot(cn, 5, { x: w.x, y: FLOOR - 110, yaw: d * 0.6, dist: 3.6, fov: 32 }); } // dusts his hands as he shrinks
    else {
      if (t === 176) { cn.back = 1; l.gone = false; l.x = clamp(cn.gx || l.x, 80, WW - 80); l.y = FLOOR - 560; l.vx = 0; l.vy = 26; l.spin = 1; l.bounced = false; l.ko = true; l.kd = 1; l.kdT = 0; sfx('whoosh'); }
      if (cn.back === 1 && l.y >= FLOOR - 2) { cn.back = 2; fx('crater', l.x, 1.4); shake = 28; cam.kick = 0.12; cam.hx = l.x; cam.hy = FLOOR - 50; sfx('heavy'); sfx('brk'); }
      w.finPose = lp(w.finPose, SHOWPOSE.ryan(frame), 0.1);
      shot(cn, 6, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.35, dist: 5.4, fov: 34 });
    }
  },
  // ---- DARREN: a glint off the shades, the world turns inside out, a void full of questions, then they're gone ----
  erase(cn, w, l, t, d, k, launch) {
    if (t < 36) { w.finPose = lp(GUARD, finP({ fu: 1.05, fl: 3.25, bu: 0.2, bl: 0.5, ht: 0.06, tw: -0.15, point: 1 }), swing(k(0, 14)));
      if (t === 16) { fx('sparks', w.x + d * 12, w.y - w.h * 0.93, '#ffffff', 10); sfx('glint'); }
      shot(cn, 1, { x: w.x + d * 6, y: w.y - w.h * 0.93, yaw: d * 0.7, dist: 1.2, fov: 18, lift: -0.15 }); }
    else if (t < 140) {
      if (t === 36) { cn.void = 1; sfx('void'); screenFlash = 8; }
      const lv = swing(k(40, 90)); l.y = FLOOR - 90 * lv; l.vy = 0; l.dazed = true;
      l.finPose = finP({ lean: -0.2, ht: -0.5 + Math.sin(t / 4) * 0.2, fu: 1.8 + Math.sin(t / 3) * 0.4, fl: 2.4, bu: 1.6 - Math.sin(t / 3) * 0.4, bl: 2.2, ft: 0.4, fs: -0.2, bt: -0.2, bs: -0.6, rot: Math.sin(t / 9) * 0.3 });
      if (t > 90) { l.vanish = t % 6 < 3 ? 2 : 0; for (let q = 0; q < 2; q++) parts.push({ k: 's', x: l.x + (rand() - 0.5) * 50, y: l.y - rand() * l.h, vx: (rand() - 0.5) * 1.5, vy: -1 - rand() * 2.5, life: 30 + rand() * 20, max: 50, c: rand() < 0.5 ? w.c.color : '#ffffff' }); }
      if (t % 5 === 0) fx('text', l.x + (rand() - 0.5) * 140, l.y - l.h * (0.2 + rand() * 0.9), '?', w.c.color);
      if (t % 7 === 0) shake = Math.max(shake, 4);
      w.finPose = finP({ fu: 1.05, fl: 3.25, bu: 0.2, bl: 0.5, ht: 0.1, tw: -0.15, point: 1 });
      shot(cn, 2, { x: l.x, y: l.y - l.h * 0.5, yaw: d * (0.3 + (t - 36) * 0.02), dist: 3.5, fov: 30 });
    } else if (t < 172) {
      if (t === 140) { w.finPose = finP({ fu: 1.7, fl: 2.95, bu: 0.2, bl: 0.5, lean: -0.05 }); sfx('snap'); }
      if (t === 146) { l.gone = true; l.vanish = 0; l.finPose = null; fx('sparks', l.x, l.y - l.h * 0.5, w.c.color, 40); fx('ring', l.x, l.y - l.h * 0.5, w.c.color, 6); sfx('brk'); shake = 16; }
      if (t === 150) { cn.void = 0; screenFlash = 6; }
      if (t > 150) w.finPose = lp(w.finPose, finP({ fu: 1.1, fl: 3.3, bu: 0.2, bl: 0.5, ht: 0.05 }), 0.15); // fixes his shades
      shot(cn, 3, { x: w.x, y: w.y - w.h * 0.82, yaw: d * 0.62, dist: 1.9, fov: 24 });
    } else {
      if (t === 172) { l.gone = false; launch(0, 22, 0); l.y = FLOOR - 420; sfx('whoosh'); cn.drop = 1; }
      if (cn.drop === 1 && l.y >= FLOOR - 2) { cn.drop = 2; fx('crater', l.x, 1.2); shake = 22; cam.kick = 0.1; cam.hx = l.x; cam.hy = FLOOR - 50; sfx('heavy'); sfx('brk'); }
      w.finPose = lp(w.finPose, finP({ fu: 0.4, fl: 2.2, bu: -0.1, bl: 0.5, ht: -0.08 }), 0.06);
      shot(cn, 4, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.4, dist: 5.0, fov: 32 });
    }
  },
  // ---- CLAVICULAR: the jawline in close-up, the stare, stone; he walks over and flicks the statue's forehead ----
  stone(cn, w, l, t, d, k, launch) {
    if (t < 56) { w.finPose = gesturePose(w, Math.min(52, t)); if (t === 6) say('clav', 'Look at me.');
      shot(cn, 1, { x: w.x + d * 4, y: w.y - w.h * 0.9, yaw: d * lerp(0.1, 0.22, k(0, 56)), dist: 0.95, fov: 19, lift: -0.35 }); }
    else if (t < 132) { // the stare: they freeze and grey over
      w.finPose = lp(w.finPose, finP({ fu: 0.2, fl: 0.4, bu: 0.15, bl: 0.35, lean: -0.12, ht: 0.12, crouch: 0.02 }), 0.12);
      if (t % 4 === 0) fx('sparks', w.x + d * 14, w.y - w.h * 0.86, '#bfefff', 2);
      l.dazed = true; l.vx = 0; const q = k(62, 124); l.stone = q;
      if (!cn.pose) cn.pose = Object.assign({}, dazedPose(l), { lean: -0.25, ht: -0.35, fu: 1.6, fl: 2.8, bu: 1.2, bl: 2.4 });
      l.finPose = Object.assign({}, cn.pose, { rot: q < 1 ? Math.sin(t * 2.3) * 0.02 * (1 - q) : 0 });
      if (t > 112 && t % 6 === 0) { fx('sparks', l.x + (rand() - 0.5) * 50, l.y - rand() * l.h, '#d8d4cc', 3); sfx('block'); }
      if (t === 64) sfx('skill');
      shot(cn, 2, { x: lerp(w.x, l.x, 0.75), y: FLOOR - l.h * 0.72, yaw: -d * 0.32, dist: 3.1, fov: 26 });
    } else if (t < 166) { // walks over to the statue and flicks it
      const tx = l.x - d * (w.bw * w.scale * 0.5 + l.bw * l.scale * 0.5 + 6);
      if (t < 152) { w.x = lerp(w.x, tx, 0.12); const ph = t * 0.35; w.finPose = finP({ ft: 0.1 + 0.4 * Math.sin(ph), bt: 0.1 - 0.4 * Math.sin(ph), fs: -0.2 - 0.5 * Math.max(0, Math.cos(ph)), bs: -0.2 - 0.5 * Math.max(0, -Math.cos(ph)), fu: 0.2, fl: 0.4, bu: 0.15, bl: 0.35, lean: -0.08, ht: -0.12 }); }
      else w.finPose = lp(finP({ fu: 1.6, fl: 2.5, bu: 0.1, bl: 0.4, lean: -0.05, ht: -0.15, point: 1 }), finP({ fu: 2.0, fl: 2.4, bu: 0.1, bl: 0.4, lean: 0.05, ht: -0.15, point: 1 }), overshoot(k(158, 162)));
      if (t === 160) { sfx('block'); fx('sparks', l.x, l.y - l.h * 0.92, '#ffffff', 8); shake = 5; }
      shot(cn, 3, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 150, yaw: d * 0.42, dist: 3.4, fov: 28 });
    } else {
      if (t === 166) { l.gone = true; l.keepGone = true; l.finPose = null; fx('crumble', l.x, 1.2); fx('dust', l.x, FLOOR, 26); sfx('brk'); sfx('heavy'); shake = 22; cam.kick = 0.1; cam.hx = l.x; cam.hy = FLOOR - 60; }
      if (t > 182) w.finPose = lp(w.finPose, finP({ fu: 2.6, fl: 3.6, bu: 0.1, bl: 0.4, lean: -0.1, ht: -0.15 }), 0.08); // fixes his hair
      shot(cn, t < 196 ? 4 : 5, t < 196 ? { x: lerp(w.x, l.x, 0.6), y: FLOOR - 110, yaw: d * 0.5, dist: 3.8, fov: 30 } : { x: w.x, y: w.y - w.h * 0.88, yaw: d * 0.25, dist: 1.3, fov: 22 });
    }
  },
};

// the alley-oop itself (Frank's finisher, in the arena): Lejohn sprints in and lobs it, Frank carries the opponent
// up, jumps, slams them through the hoop and hangs on the rim while the floor breaks
function finDunk(cn, w, l, t, d, k) {
  const hp = cn.hoop, mt = cn.mate, rimX = hp.x - d * 38, rimY = FLOOR - 245;
  hp.rise = arenaOn ? 1 : swing(k(8, 48));
  if (t < 30) w.finPose = finP({ fu: 2.7, fl: 3.7, bu: 2.9, bl: 3.1, lean: -0.1, ht: -0.3 }); // whistle + call
  if (t === 18) sfx('whistle');
  if (t >= 18 && t < 76) { mt.x += d * 10; const ph = t * 0.55; mt.pose = finP({ ft: 0.15 + 0.85 * Math.sin(ph), bt: 0.15 - 0.85 * Math.sin(ph), fs: -0.3 - 0.9 * Math.max(0, Math.cos(ph)), bs: -0.3 - 0.9 * Math.max(0, -Math.cos(ph)), fu: -0.9 * Math.sin(ph), fl: 1.4, bu: 0.9 * Math.sin(ph), bl: 1.4, lean: 0.3 }); }
  if (t >= 76 && t < 92) mt.pose = lp(mt.pose || GUARD, finP({ fu: 2.8, fl: 3.3, bu: 2.7, bl: 3.2, lean: -0.15, crouch: 0.2 }), swing(k(76, 90)));
  if (t >= 92 && t < 110) mt.pose = lp(finP({ fu: 2.8, fl: 3.3, bu: 2.7, bl: 3.2, lean: -0.15, crouch: 0.2 }), finP({ fu: 1.9, fl: 2.1, bu: 1.8, bl: 2.0, lean: 0.25 }), overshoot(k(92, 96)));
  if (t >= 150) { mt.pose = finP({ fu: 2.9, fl: 3.3, bu: 2.8, bl: 3.2, lean: -0.1, crouch: 0.1 * Math.abs(Math.sin(t / 5)) }); mt.y = FLOOR - Math.abs(Math.sin(t / 6)) * 30; }
  let ball = projs.find(p => p.fin);
  if (t === 92) projs.push(ball = { owner: w.side, kind: 'ball', x: mt.x, y: FLOOR - 210, vx: d * 4, vy: 0, r: 13, life: 400, t: 0, fin: 1, x0: mt.x, y0: FLOOR - 210 });
  if (ball && t >= 92 && t <= 124) { const q = (t - 92) / 32, tx = rimX - d * 10, ty = rimY - 150; ball.x = lerp(ball.x0, tx, q); ball.y = lerp(ball.y0, ty, q) - Math.sin(q * Math.PI) * 190; ball.t = t; }
  if (t >= 30 && t < 84) w.finPose = lp(GUARD, finP({ fu: 1.5, fl: 1.4, bu: 1.4, bl: 1.3, lean: 0.25, crouch: 0.15 }), swing(k(30, 50)));
  const carried = t >= 84 && !cn.slam;
  if (t < 84 && arenaOn) { l.dazed = false; l.ko = true; l.kd = 0; l.x = w.x + d * (w.bw * w.scale * 0.5 + l.bw * l.scale * 0.2 + 10); l.y = FLOOR; l.finPose = finP({ lean: -0.25, ht: -0.4, fu: 1.6, fl: 2.7, bu: 1.5, bl: 2.6, crouch: 0.1 }); }
  if (carried) {
    w.finPose = finP({ fu: 2.95, fl: 3.15, bu: 2.85, bl: 3.05, lean: -0.08, crouch: t < 104 ? 0.3 * swing(k(96, 104)) : 0 });
    const lt = (l.h * 0.85 + 28) * l.scale;
    l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.vx = l.vy = 0; l.x = w.x + d * 12; l.y = w.y - w.h * w.scale * 1.05 + lt * 0.5;
    l.finPose = finP({ rot: 1.55, lean: 0.05, ht: -0.2, fu: 2.2 + Math.sin(t / 3) * 0.5, fl: 2.6, bu: 1.8 - Math.sin(t / 3) * 0.5, bl: 2.3, ft: 0.4 + Math.sin(t / 4) * 0.3, fs: 0.1, bt: 0.1 - Math.sin(t / 4) * 0.3, bs: -0.3 });
  }
  if (t === 104) { w.vy = -15.5; w.vx = (rimX - d * 26 - w.x) / 21; sfx('jump'); fx('dust', w.x, FLOOR, 14); }
  if (ball && t > 124 && !cn.slam) { ball.x = l.x + d * 8; ball.y = l.y - 40; }
  if (!cn.slam && t > 112 && w.vy >= -1) { cn.slam = t; l.finPose = finP({ rot: 2.6, lean: 0, ht: 0.3, fu: 2.6, fl: 2.9, bu: 2.5, bl: 2.8, ft: 0.2, fs: 0, bt: 0.1, bs: 0 }); l.x = rimX; l.vy = 21; l.vx = 0; l.bounced = true; l.spin = 0; sfx('whoosh'); }
  if (cn.slam) {
    if (t < cn.slam + 50) { w.y = rimY + w.h * w.scale * 1.0; w.vy = 0; w.vx = 0; w.x = rimX - d * 30; w.finPose = finP({ fu: 3.0, fl: 3.1, bu: 2.95, bl: 3.05, ft: 0.35 + Math.sin(t / 6) * 0.15, fs: 0.1, bt: -0.15, bs: -0.4, lean: 0.05, ht: 0.3 }); }
    if (!cn.boom && l.y >= FLOOR - 2) { cn.boom = 1; l.y = FLOOR; l.vy = 0; l.kd = 2; l.kdT = 0; l.sink = 0.12; l.finPose = null; l.squash = 0.35;
      fx('crater', l.x, 1.7); fx('impact', l.x, FLOOR - 30, '#ff7a1a', 2.6); fx('ring', l.x, FLOOR - 10, '#ffffff', 7); fx('text', rimX, rimY - 60, 'SLAM!', '#ff7a1a');
      sfx('heavy'); sfx('brk'); sfx('thud'); shake = 34; slowmo = 26; cam.kick = 0.15; cam.hx = l.x; cam.hy = FLOOR - 40; screenFlash = 6;
      if (ball) { ball.vy = -7; ball.vx = -d * 3; } }
    if (cn.boom && ball) { ball.vy += 0.5; ball.x += ball.vx; ball.y += ball.vy; if (ball.y > FLOOR - 13) { ball.y = FLOOR - 13; ball.vy = -Math.abs(ball.vy) * 0.6; ball.vx *= 0.8; } }
    if (t > cn.slam + 70) w.finPose = lp(w.finPose || GUARD, SHOWPOSE.frank(frame), 0.1);
  }
}

function finEnd(cn) {
  const w = P[cn.side], l = P[1 - cn.side];
  projs = projs.filter(p => !p.fin);
  w.finPose = null; w.scale = 1; w.big = 0; w.gone = false; l.gone = !!l.keepGone; l.vanish = 0; l.dazed = false; l.ko = true; l.z = 0;
  if (l.kd === 0 && !l.sink && !l.keepGone) { l.kd = 2; l.kdT = 0; l.y = FLOOR; }
  winner = w.side; endT = 110;
  banner = { txt: w.c.fin.name, t: 170, max: 170, c: w.c.color, slam: 1, sub: 'FINISHER' }; sfx('ko'); say('announcer', w.c.fin.name.toLowerCase());
}

// ---------- 2D renderer: the arena, the portal, the flood ----------
const ARENA_FLOOR = {
  base: '#c48a52', line: 'rgba(90,50,20,0.28)', haze: 'rgba(255,230,180,0.35)', edge: 'rgba(255,255,255,0.7)',
  cell: (r, c) => ((c % 3) + 3) % 3 === 0 ? '#b97f48' : r % 2 ? '#cf9660' : null,
  extra: (colX, rows) => { // the paint: centre circle and the key
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; const y = rows[4];
    ctx.beginPath(); ctx.moveTo(colX(WW / 2, rows[0]), rows[0]); ctx.lineTo(colX(WW / 2, rows[9]), rows[9]); ctx.stroke();
    ctx.fillStyle = 'rgba(214,40,40,0.35)'; for (const x of [140, WW - 400]) { ctx.beginPath(); ctx.moveTo(colX(x, rows[1]), rows[1]); ctx.lineTo(colX(x + 260, rows[1]), rows[1]); ctx.lineTo(colX(x + 260, y), y); ctx.lineTo(colX(x, y), y); ctx.fill(); }
  },
};
function drawArena2D() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060c'); g.addColorStop(0.6, '#141a2a'); g.addColorStop(1, '#2a2030');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  const cheer = cine && cine.boom ? 1 : 0.35;
  for (let tier = 0; tier < 4; tier++) inLayer(0.25 + tier * 0.17, LW => { // stands packed with the crowd
    const y0 = FLOOR - 250 + tier * 52, n = Math.floor(LW / 14);
    ctx.fillStyle = shade('#1c2236', 0.7 + tier * 0.12); ctx.fillRect(0, y0, LW, 70);
    for (let i = 0; i < n; i++) {
      const bob = Math.max(0, Math.sin(frame * 0.25 * (0.8 + seeded(i, tier) * 0.6) + i)) * 7 * cheer;
      ctx.fillStyle = ['#d61f2c', '#f2f2f2', '#2a3a8a', '#f5c518', '#3a2a24', '#7a4a2a'][Math.floor(seeded(i, tier + 9) * 6)];
      ctx.fillRect(i * 14 + 2, y0 + 20 - bob, 9, 26); ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(i * 14 + 6.5, y0 + 15 - bob, 5, 0, 7); ctx.fill();
      if (seeded(i, tier + 3) < 0.04 && frame % 12 < 2) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(i * 14 + 4, y0 + 6 - bob, 4, 4); } // camera flashes
    }
  });
  inLayer(0.2, LW => { // the jumbotron
    const x = LW / 2 - 120; ctx.fillStyle = '#0a0a10'; ctx.fillRect(x, FLOOR - 470, 240, 110);
    ctx.fillStyle = frame % 30 < 15 ? '#ff6a1a' : '#f5c518'; ctx.font = `900 34px ${HEAD}`; ctx.textAlign = 'center'; ctx.fillText('SLAM CITY', LW / 2, FLOOR - 402);
  });
  perspFloor(ARENA_FLOOR);
}
// in world space, behind the fighters: the portal
function drawFinBack2D() {
  const pr = cine.portal; if (!pr) return;
  const o = easeOut(pr.open), cx = pr.x, cy = FLOOR - 150;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = ['#ff6a1a', '#ffd34a', '#b44dff'][i % 3]; ctx.globalAlpha = 0.6 * o; ctx.lineWidth = 6 - i * 0.7;
    ctx.beginPath(); ctx.ellipse(cx, cy, (70 - i * 8) * o, (160 - i * 14) * o, 0, frame * 0.15 + i, frame * 0.15 + i + 5); ctx.stroke(); }
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150 * o + 1); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(0.5, 'rgba(255,120,40,0.35)'); g.addColorStop(1, 'rgba(120,40,200,0)');
  ctx.globalAlpha = o; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 64 * o, 150 * o, 0, 0, 7); ctx.fill(); ctx.restore();
}
// in front of the fighters: the flood
function drawFinFront2D() {
  const f = cine.flood || 0; if (f <= 0) return;
  const top = FLOOR + 8 - f * 230;
  ctx.save(); ctx.fillStyle = 'rgba(30,110,200,0.5)'; ctx.beginPath(); ctx.moveTo(-200, FLOOR + 400);
  for (let x = -200; x <= WW + 200; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.02 + frame * 0.15) * 10 * f);
  ctx.lineTo(WW + 200, FLOOR + 400); ctx.fill();
  ctx.strokeStyle = 'rgba(220,245,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = -200; x <= WW + 200; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.02 + frame * 0.15) * 10 * f);
  ctx.stroke(); ctx.restore();
}
