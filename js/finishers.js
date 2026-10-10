// ---------- finishers: a short film for every fighter ----------
// Each finisher is a script on the cinematic's clock (cn.t). It poses both fighters (finPose), moves them, fires
// effects and sounds, and directs the camera shot by shot through cn.cam (the 3D renderer cuts when cn.shot changes).
// The world can change too: Frank runs through a portal into a basketball arena, Julian floods the stage,
// Darren drags his victim into an inverted void.
const FIN_LEN = { dunk: 440, flop: 322, tide: 240, flick: 240, erase: 230, stone: 250, nail: 230, approach: 730, lights: 240 };
let arenaOn = false; // Frank's finisher ends in another world: the arena stays up until the next match
let rizzOn = false; // Hexumlite's finisher: the Cold Approach dimension
const finP = o => mk(o);
// a camera shot: x, y in game pixels (y up from the floor is FLOOR - n), z depth; yaw, dist (m), fov, lift
function shot(cn, id, o) { cn.shot = id; cn.cam = o; }

function startFinisher(f, foe) {
  finish = null;
  const d = f.facing = foe.x > f.x ? 1 : -1, id = f.c.fin.id;
  if (id === 'dunk') f.x = clamp(f.x, 200 + (d < 0 ? 560 : 0), WW - 200 - (d > 0 ? 560 : 0)); // room to run for the portal
  if (id === 'tide') f.x = clamp(f.x, 140 + (d < 0 ? 330 : 0), WW - 140 - (d > 0 ? 330 : 0));
  if (id === 'approach') f.x = clamp(f.x, 140 + (d < 0 ? 340 : 0), WW - 140 - (d > 0 ? 340 : 0)); // room for the portal
  foe.x = clamp(f.x + d * (id === 'flop' ? 260 : id === 'tide' ? 230 : id === 'flick' ? 160 : 130), 60, WW - 60); foe.facing = -d; foe.vx = 0; f.vx = 0;
  f.move = foe.move = null; f.blocking = false;
  cine = { kind: 'fin', t: 0, max: FIN_LEN[id], side: f.side, x: (f.x + foe.x) / 2, y: FLOOR - 90, fid: id, x0: foe.x };
  banner = null; // FINISH HIM! has done its job: the film starts clean
  sfx('fin'); if (id !== 'dunk') say(f.c.id, f.c.fin.line);
}

function finTick(cn) {
  const w = P[cn.side], l = P[1 - cn.side], t = cn.t, k = (a, b) => clamp((t - a) / (b - a), 0, 1);
  if (cn.d == null) cn.d = w.facing;
  const d = w.facing = cn.d; // the shot is blocked out one way: nobody turns round mid-scene
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
      if (t === 120) { w.vy = -17; w.vx = (l.x + d * 40 - w.x) / 45; sfx('jump'); slowmo = 40; } // lands on their chest
      w.finPose = finP({ fu: 2.1, fl: 2.3, bu: 2.0, bl: 2.2, ft: 1.0, fs: 0.4, bt: -0.6, bs: -0.9, lean: 0.62, ht: -0.25 });
      if (t > 124 && w.y >= FLOOR) { cn.pinned = t; w.vx = 0; w.x = l.x + d * 50; l.kd = 2; l.kdT = 0; l.finPose = null; l.y = FLOOR; shake = 14; sfx('heavy'); fx('dust', l.x, FLOOR, 14); }
      shot(cn, 5, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.3, dist: 4.8, fov: 32, lift: -0.3 });
    } else if (t < cn.pinned + 48) { // the scratch frenzy
      const e = t - cn.pinned, sw = Math.floor(e / 7) % 2; w.x = l.x + d * 50; w.y = FLOOR; w.vy = 0;
      w.finPose = finP({ crouch: 0.75, lean: 0.85, fu: sw ? 2.4 : 1.0, fl: sw ? 2.8 : 0.6, bu: sw ? 1.0 : 2.4, bl: sw ? 0.6 : 2.8, ht: 0.2 });
      if (e % 7 === 3) { fx('sparks', w.x + (rand() - 0.5) * 40, FLOOR - 30, '#ffffff', 10); fx('text', w.x + (rand() - 0.5) * 70, FLOOR - 90, 'SCRATCH', '#ff8fc7'); sfx('hit'); shake = 6; l.flash = 4; }
      shot(cn, 6, { x: w.x, y: FLOOR - 70, yaw: d * 0.55, dist: 4.0, fov: 32, lift: 0.3 });
    } else if (!cn.hit) { // one huge jump, and the belly flop
      if (!cn.up) { cn.up = t; w.vy = -19; w.vx = 0; w.y = FLOOR - 30; sfx('jump'); }
      w.finPose = finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, ft: 0.6, fs: 0.2, bt: 0.3, bs: -0.3, lean: 0, rot: -1.5 * swing(k(cn.pinned + 52, cn.pinned + 80)), spread: 0.8 });
      if (t > cn.up + 10 && w.vy >= 0 && w.y >= FLOOR - 4) { cn.hit = t; w.vy = 0; w.y = FLOOR; l.squash = 1; shake = 30; cam.kick = 0.14; cam.hx = w.x; cam.hy = FLOOR - 40;
        fx('flat', w.x, FLOOR, w.c.color); fx('crater', w.x, 1.7); fx('sparks', w.x, FLOOR - 30, '#ff8fc7', 40); sfx('heavy'); sfx('thud'); sfx('brk'); }
      shot(cn, 7, { x: w.x, y: Math.min(FLOOR - 120, (w.y + FLOOR) / 2 - 50), yaw: d * 0.42, dist: 5.8, fov: 36, lift: -0.2 });
    } else { // licks his paw
      w.finPose = lp(finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, rot: -1.5 }), finP({ fu: 1.35, fl: 3.4, bu: 0.3, bl: 1.0, ht: 0.25, lean: 0.1, crouch: 0.1 }), swing(clamp((t - cn.hit - 12) / 24, 0, 1)));
      if (t % 6 === 0) fx('sparks', w.x + (rand() - 0.5) * 60, w.y - w.h * rand(), '#ffc4e6', 2);
      if (t < cn.hit + 24) shot(cn, 7, { x: w.x, y: FLOOR - 120, yaw: d * 0.42, dist: 5.8, fov: 36, lift: -0.2 }); // hold on the impact
      else shot(cn, 8, { x: w.x, y: w.y - w.h * 0.84, yaw: d * 0.7, dist: 2.6, fov: 26 });
    }
  },
  // ---- JULIAN: the sea answers. A wave taller than a house, a flooded stage, a whirlpool, then nothing ----
  tide(cn, w, l, t, d, k, launch) {
    let wv = projs.find(p => p.fin);
    if (t < 46) { // calls it up
      w.finPose = lp(GUARD, finP({ fu: 2.8, fl: 3.1, bu: 2.6, bl: 3.0, lean: -0.18, ht: -0.25, crouch: 0.05 }), swing(k(0, 36)));
      cn.flood = 0.12 * k(10, 46); if (t % 3 === 0) fx('sparks', w.x + (rand() - 0.5) * 90, FLOOR - rand() * 20, '#6fc0ff', 2); if (t === 6) sfx('surge'); shake = Math.max(shake, 3 * k(10, 46));
      shot(cn, 1, { x: w.x, y: w.y - w.h * 0.8, yaw: d * 0.82, dist: 3.3, fov: 28, lift: -0.4 });
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
    } else { cn.flood = 0; l.z = 0; w.finPose = lp(w.finPose, SHOWPOSE.julian(frame), 0.08); shot(cn, 6, { x: w.x, y: w.y - w.h * 0.84, yaw: d * 0.7, dist: 2.9, fov: 28 }); }
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
      if (t === 172) { l.gone = false; launch(0, 22, 0); l.x = clamp(w.x + d * 190, 80, WW - 80); l.y = FLOOR - 420; sfx('whoosh'); cn.drop = 1; }
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
      if (t > 182) w.finPose = lp(w.finPose, finP({ bu: 2.6, bl: 3.6, fu: 0.1, fl: 0.4, lean: -0.1, ht: -0.15 }), 0.08); // fixes his hair with the far hand, face to camera
      shot(cn, t < 196 ? 4 : 5, t < 196 ? { x: lerp(w.x, l.x, 0.6), y: FLOOR - 110, yaw: d * 0.5, dist: 3.8, fov: 30 } : { x: w.x, y: w.y - w.h * 0.88, yaw: d * 0.25, dist: 1.3, fov: 22 });
    }
  },
};

Object.assign(FIN_SCRIPTS, {
  // ---- TUNG TUNG TUNG SAHUR: tung... tung... tung... three bat slams drive them into the floor like a nail. SAHUR! ----
  nail(cn, w, l, t, d, k) {
    const up = finP({ fu: 2.95, fl: 3.15, bu: 2.85, bl: 3.1, lean: -0.12, ht: -0.15 }), down = finP({ fu: 1.5, fl: 1.1, bu: 1.4, bl: 1.05, lean: 0.35, crouch: 0.16 });
    if (t < 44) { const e = t % 14; w.finPose = e < 8 ? lp(down, up, swing(e / 8)) : lp(up, down, overshoot((e - 8) / 6)); if (e === 13) { sfx('block'); fx('dust', w.x + d * 40, FLOOR, 4); }
      shot(cn, 1, { x: w.x + d * 10, y: w.y - w.h * 0.8, yaw: d * 0.6, dist: 2.2, fov: 26 }); }
    else if (t < 64) { const tx = l.x - d * (w.bw * w.scale * 0.5 + l.bw * l.scale * 0.5 + 34); w.x = lerp(w.x, tx, 0.14); const ph = t * 0.5;
      w.finPose = finP({ ft: 0.1 + 0.4 * Math.sin(ph), bt: 0.1 - 0.4 * Math.sin(ph), fs: -0.2 - 0.5 * Math.max(0, Math.cos(ph)), bs: -0.2 - 0.5 * Math.max(0, -Math.cos(ph)), fu: 1.05, fl: 2.75, bu: 0.85, bl: 2.6 });
      shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.45, dist: 4.2, fov: 30 }); }
    else if (t < 140) { const e = (t - 64) % 22; w.finPose = e < 12 ? lp(down, up, swing(e / 12)) : lp(up, down, overshoot((e - 12) / 5));
      l.dazed = false; l.ko = true; l.vx = 0; l.finPose = finP({ lean: 0, ht: 0.25, fu: 0.1, fl: 0.2, bu: 0.1, bl: 0.2, crouch: 0 });
      if (e === 17) { l.sink = Math.min(0.6, (l.sink || 0) + 0.2); fx('crater', l.x, 0.7); fx('text', l.x, l.y - l.h * l.scale * (1 - l.sink * 0.5) - 40, 'TUNG!', '#ffd08a'); fx('sparks', l.x, l.y - l.h * l.scale * (1 - l.sink * 0.5), '#ffd08a', 10); sfx('heavy'); sfx('block'); shake = 14; l.flash = 4; }
      shot(cn, 3, { x: lerp(w.x, l.x, 0.6), y: FLOOR - 110, yaw: -d * 0.35, dist: 3.6, fov: 30 }); }
    else if (t < 160) { w.finPose = lp(w.finPose, finP({ fu: 3.0, fl: 3.3, bu: 2.9, bl: 3.2, lean: -0.25, ht: -0.25, crouch: 0.05 }), 0.2); if (t === 146) say('tung', 'SAHUR!');
      shot(cn, 4, { x: w.x, y: w.y - w.h * 0.9, yaw: d * 0.3, dist: 2.4, fov: 30, lift: -0.6 }); }
    else if (t < 176) { w.finPose = lp(finP({ fu: 3.0, fl: 3.3, bu: 2.9, bl: 3.2, lean: -0.25 }), finP({ fu: 1.4, fl: 0.95, bu: 1.3, bl: 0.9, lean: 0.5, crouch: 0.25 }), overshoot(k(160, 165)));
      if (t === 164) { l.sink = 0.85; fx('crater', l.x, 1.6); fx('impact', l.x, FLOOR - 20, '#ffd08a', 2.4); fx('ring', l.x, FLOOR - 10, '#ffffff', 6); sfx('heavy'); sfx('brk'); sfx('thud'); shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 30; screenFlash = 6; slowmo = 20; }
      shot(cn, 5, { x: l.x, y: FLOOR - 70, yaw: d * 0.3, dist: 4.4, fov: 32 }); }
    else { w.finPose = lp(w.finPose, SHOWPOSE.tung(frame), 0.08); shot(cn, 6, { x: w.x, y: w.y - w.h * 0.82, yaw: d * 0.65, dist: 2.6, fov: 26 }); }
  },
  // ---- HEXUMLITE: W COLD APPROACH. A wink, a portal, a tackle into another world: a neon rooftop, a table for two
  // and a baddie. They try their luck. It does not go well. ----
  approach(cn, w, l, t, d, k) {
    const gap = (w.bw * w.scale + l.bw * l.scale) * 0.5 + 6, head = f => f.y - (f.h * 0.85 + 28) * f.scale * 0.93, bh = (BADDIE_H() * 0.85 + 28) * 1.04; // eye level on the 3D models
    const talk = (who, text, col, voice) => { cn.dlg = { who, text, col, t }; if (voice) say(voice, text); };
    const walk = (ph, o) => finP(Object.assign({ ft: 0.1 + 0.42 * Math.sin(ph), bt: 0.1 - 0.42 * Math.sin(ph), fs: -0.2 - 0.55 * Math.max(0, Math.cos(ph)), bs: -0.2 - 0.55 * Math.max(0, -Math.cos(ph)), fu: 0.15 - 0.2 * Math.sin(ph), fl: 0.4, bu: -0.1 + 0.2 * Math.sin(ph), bl: 0.3 }, o));
    const chain = finP({ fu: 1.1, fl: 2.9, hz: 0.5, bu: 0.2, bl: 0.5, ht: -0.14, lean: -0.06, tw: -0.15 }), folded = finP({ fu: 1.2, fl: 2.6, hz: 0.7, bu: 1.2, bl: 2.6, hzb: 0.7, lean: -0.1, ht: -0.12, crouch: 0.02 });
    const vName = (l.c.short || l.c.name).toUpperCase(), mt = cn.mate;
    if (t < 70) { // "Ay mayne... watch this." Hand through the curls, fingers on the chain
      w.finPose = t < 34 ? lp(GUARD, finP({ fu: 2.65, fl: 3.5, hz: 0.3, bu: 0.25, bl: 0.7, lean: -0.12, ht: -0.18, hy: 0.15 }), swing(k(0, 16))) : lp(w.finPose, chain, 0.12);
      if (t === 8) talk('HEXUMLITE', 'Ay mayne... watch this.', w.c.color);
      shot(cn, 1, { x: w.x + d * 6, y: head(w), yaw: d * (0.25 + 0.4 * swing(k(0, 70))), dist: lerp(1.7, 1.15, swing(k(0, 70))), fov: 22, lift: -0.2, lock: 1 });
    } else if (t < 100) { // the wink and a finger-gun, right down the lens
      w.finPose = lp(chain, finP({ fu: 1.62, fl: 1.62, bu: 0.2, bl: 0.5, lean: 0.06, ht: -0.1, hy: -0.12, point: 1 }), overshoot(k(72, 80)));
      if (t === 80) { sfx('glint'); fx('sparks', w.x + d * 10, head(w) - 4, '#ffffff', 10); cn.dlg = null; }
      shot(cn, 2, { x: w.x + d * 8, y: head(w) - 2, yaw: d * lerp(0.05, 0.18, k(70, 100)), dist: lerp(1.0, 0.85, k(70, 100)), fov: 18, lift: -0.1, lock: 1 });
    } else if (t < 132) { // a portal tears open behind them
      if (!cn.portal) { cn.portal = { x: clamp(l.x + d * 170, 120, WW - 120), open: 0 }; sfx('portal'); }
      cn.portal.open = Math.min(1, cn.portal.open + 0.05); l.dazed = true;
      w.finPose = finP({ crouch: 0.35, lean: 0.5, fu: 0.6, fl: 1.4, bu: 0.4, bl: 1.2, ft: 0.6, bt: -0.5, bs: -0.6, ht: 0.1 });
      shot(cn, 3, { x: lerp(w.x, cn.portal.x, 0.5), y: FLOOR - 120, yaw: d * lerp(-0.45, 0.35, swing(k(100, 132))), dist: 6.2, fov: 34, lift: -0.4, lock: 1 }); // swings round behind them
    } else if (t < 176) { // the charge: a shoulder into the gut, and through
      const pr = cn.portal, ph = t * 0.6; pr.open = Math.min(1, pr.open + 0.05);
      if (!cn.hit) { w.x += d * 13; if (Math.abs(l.x - w.x) <= gap + 8) { cn.hit = t; l.dazed = false; l.ko = true; sfx('heavy'); shake = 14; slowmo = 14; fx('impact', l.x, l.y - l.h * 0.6, w.c.color, 1.8); fx('ring', l.x, l.y - l.h * 0.6, '#ff7ab8', 4); } }
      else { w.x += d * 9; l.x = w.x + d * gap; l.finPose = finP({ lean: 0.55, ht: 0.4, fu: 1.6, fl: 2.2, bu: 1.4, bl: 2.0, crouch: 0.15, ft: 0.6, bt: 0.4 }); }
      w.finPose = finP({ ft: 0.15 + 0.9 * Math.sin(ph), bt: 0.15 - 0.9 * Math.sin(ph), fs: -0.3 - 0.9 * Math.max(0, Math.cos(ph)), bs: -0.3 - 0.9 * Math.max(0, -Math.cos(ph)), fu: 0.6, fl: 1.4, bu: 0.5, bl: 1.3, lean: 0.6, crouch: 0.12 });
      if (t % 3 === 0) fx('dust', w.x - d * 20, FLOOR, 3);
      if (cn.hit && Math.abs(l.x - pr.x) < 26 && !cn.into) { cn.into = t; sfx('whoosh'); }
      if (cn.into) { l.gone = true; if (Math.abs(w.x - pr.x) < 30) w.gone = true; }
      shot(cn, 4, { x: w.x + d * 60, y: FLOOR - 110, yaw: d * 0.95, dist: 4.4, fov: 32, lift: -0.25 }); // tracking alongside
    } else if (t === 176) { // ...into the Cold Approach dimension
      screenFlash = 14; sfx('portal'); sfx('heroslam'); rizzOn = true; w.gone = true; l.gone = false; cn.dlg = null;
      cn.exitX = clamp(WW / 2 - d * 330, 160, WW - 160); cn.portal = { x: cn.exitX, open: 1 };
      cn.mate = { c: BADDIE, x: clamp(WW / 2 + d * 260, 120, WW - 120), y: FLOOR, facing: -d, pose: finP({ fu: -0.15, fl: 0.95, hz: 0.6, bu: 0.2, bl: 0.5, lean: -0.04, ht: -0.1, spread: 0.3 }), gone: true };
      cn.rz = { tx: cn.mate.x + d * 70 };
      l.x = cn.exitX; l.y = FLOOR - 120; l.kd = 1; l.kdT = 30; l.vx = l.vy = 0;
    } else if (t < 250) { // a crane shot down out of the sky: the moon, the skyline, the rooftop. They tumble out of the portal
      const q = k(176, 196);
      if (t < 196) { l.x = cn.exitX + d * 150 * q; l.y = FLOOR - 120 * (1 - q * q) - Math.sin(q * Math.PI) * 50; l.finPose = finP({ lean: -0.3, ht: -0.4, fu: 2.2, fl: 2.6, bu: 1.8, bl: 2.2, ft: 0.9, fs: 0.2, bt: 0.4, bs: 0.1, rot: 0.6 + q * 1.0 }); }
      if (t === 196) { l.finPose = null; l.kd = 2; l.kdT = 0; l.y = FLOOR; fx('dust', l.x, FLOOR, 14); sfx('thud'); shake = 8; }
      if (t > 196 && t < 232) { l.kd = 2; l.kdT = Math.min(30, l.kdT + 1); }
      if (t === 232) { l.kd = 0; l.finPose = POSES.rise; }
      if (t > 232) l.finPose = lp(POSES.rise, finP({ tw: Math.sin(t / 4) * 0.5, ht: -0.15, fu: 0.3, fl: 0.6, bu: 0.2, bl: 0.5 }), k(232, 246));
      if (t === 214) { w.gone = false; w.x = cn.exitX; w.y = FLOOR; w.finPose = chain; fx('sparks', w.x, FLOOR - 100, w.c.color, 20); sfx('dodge'); }
      if (t > 214) { const tx = cn.exitX - d * 90; w.x = d > 0 ? Math.max(tx, w.x - 2.5) : Math.min(tx, w.x + 2.5); w.finPose = Math.abs(w.x - tx) > 3 ? walk(t * 0.35) : lp(w.finPose, folded, 0.1); w.facing = d; }
      if (cn.portal && t > 220) cn.portal.open = Math.max(0, cn.portal.open - 0.04); if (t === 248) cn.portal = null;
      const cq = swing(k(176, 244));
      shot(cn, 5, { x: lerp(WW / 2 + d * 120, l.x, cq), y: lerp(FLOOR - 640, FLOOR - 110, cq), yaw: d * lerp(-0.15, 0.35, cq), dist: lerp(13, 5.2, cq), fov: lerp(46, 34, cq), lift: lerp(-1.1, -0.2, cq), lock: 1 });
    } else if (t < 296) { // she appears at the table: a shower of petals, a hair flip
      if (t === 250) { mt.gone = false; fx('sparks', mt.x, FLOOR - 110, '#ff9fd0', 40); fx('ring', mt.x, FLOOR - 90, '#ff5fa2', 5); sfx('select'); sfx('glint'); }
      mt.pose = lp(finP({ fu: -0.15, fl: 0.95, hz: 0.6, bu: 0.2, bl: 0.5, lean: -0.04, ht: -0.1, spread: 0.3 }), finP({ fu: -0.15, fl: 0.95, hz: 0.6, bu: 2.5, bl: 3.5, hzb: 0.2, lean: -0.08, ht: -0.22, hy: 0.25, spread: 0.3 }), Math.sin(Math.PI * k(262, 286)));
      l.finPose = finP({ ht: -0.05, fu: 0.25, fl: 0.5, bu: 0.2, bl: 0.45, lean: 0.02 }); l.facing = d;
      if (t % 10 === 0) parts.push({ k: 'lv', x: mt.x + (rand() - 0.5) * 60, y: FLOOR - bh * (0.4 + rand() * 0.6), vx: (rand() - 0.5) * 0.6, vy: -0.8, life: 40, max: 40, c: '#ff9fd0' });
      shot(cn, 6, { x: mt.x, y: FLOOR - bh * 0.86, yaw: -d * lerp(1.0, 0.35, swing(k(250, 296))), dist: lerp(2.6, 1.5, swing(k(250, 296))), fov: 24, lift: -0.15, lock: 1 }); // a slow arc round her
    } else if (t < 326) { // their face: smitten
      l.finPose = finP({ ht: -0.18, fu: 0.25, fl: 0.5, bu: 0.2, bl: 0.45, lean: -0.04 });
      if (t === 300) { talk(vName, '...whoa.', l.c.color); for (let i = 0; i < 6; i++) parts.push({ k: 'lv', x: l.x + (rand() - 0.5) * 40, y: head(l) - 20, vx: (rand() - 0.5) * 1.2, vy: -1 - rand(), life: 46, max: 46, c: rand() < 0.5 ? '#ff5fa2' : '#ff9fd0' }); }
      shot(cn, 7, { x: l.x + d * 4, y: head(l), yaw: d * 0.32, dist: lerp(1.35, 1.1, k(296, 326)), fov: 20, lift: -0.1, lock: 1 });
    } else if (t < 392) { // they fix their hair and walk over; he leans back on the rope and watches
      const tx = mt.x - d * 95, ph = t * 0.32;
      if (t < 344) { l.finPose = finP({ fu: 2.5, fl: 3.4, hz: 0.3, bu: 2.3, bl: 3.3, hzb: 0.3, ht: -0.1 }); if (t === 330) cn.dlg = null; }
      else { l.x = d > 0 ? Math.min(tx, l.x + 3.2) : Math.max(tx, l.x - 3.2); l.finPose = Math.abs(l.x - tx) > 4 ? walk(ph, { lean: -0.04, ht: -0.12 }) : finP({ fu: 0.3, fl: 0.6, bu: 0.2, bl: 0.5, ht: -0.1 }); }
      if (t < 372) shot(cn, 8, { x: l.x + d * 70, y: FLOOR - 120, yaw: d * 0.85, dist: 4.6, fov: 30, lift: -0.3 }); // tracking with them
      else { if (t === 372) talk('HEXUMLITE', 'Go on, mayne. Shoot your shot.', w.c.color, 'hexum'); w.finPose = folded; w.facing = d;
        shot(cn, 9, { x: w.x + d * 4, y: head(w), yaw: -d * 0.45, dist: 1.4, fov: 22, lift: -0.15, lock: 1 }); } // cut: his smirk
    } else if (t < 470) { // the approach
      const s2 = Math.sin(t / 4); l.x = mt.x - d * 95; l.facing = d;
      l.finPose = finP({ fu: 1.2 + s2 * 0.25, fl: 2.0 + s2 * 0.3, bu: 0.9 - s2 * 0.2, bl: 1.8, lean: 0.12, ht: -0.05, tw: s2 * 0.1 });
      if (t === 392) talk(vName, 'Hey... uh... you come here often?', l.c.color, l.c.id);
      if (t === 446) talk(vName, 'I, uh... I like your... face?', l.c.color, l.c.id);
      if (t >= 420 && t < 446) { mt.pose = lp(mt.pose, finP({ fu: 1.2, fl: 2.6, hz: 0.7, bu: 1.2, bl: 2.6, hzb: 0.7, lean: -0.08, ht: -0.05, hy: -0.1 }), 0.12); if (t === 420) talk('BADDIE', '...', '#ff5fa2'); }
      if (t < 420) shot(cn, 10, { x: lerp(l.x, mt.x, 0.62), y: FLOOR - bh * 0.84, yaw: Math.atan2(-d * 1.3, 0.55), dist: 1.7, fov: 24, lift: -0.1, lock: 1 }); // over their shoulder, onto her
      else if (t < 446) shot(cn, 11, { x: mt.x, y: FLOOR - bh * 0.88, yaw: -d * 0.3, dist: lerp(1.25, 1.05, k(420, 446)), fov: 20, lift: -0.1, lock: 1 }); // she looks them up and down
      else shot(cn, 12, { x: lerp(l.x, mt.x, 0.5), y: FLOOR - 125, yaw: d * lerp(0.55, 0.2, k(446, 470)), dist: 3.0, fov: 28, lift: -0.2, lock: 1 }); // the two-shot
    } else if (t < 530) { // "Ew. No. Kill it."
      mt.pose = finP({ fu: 1.65, fl: 2.9, bu: 1.55, bl: 2.8, spread: 0.45, lean: -0.32, ht: -0.25, tw: 0.3, hy: 0.2 }); mt.x += t < 486 ? -d * 1.2 : 0;
      l.finPose = finP({ fu: 1.2, fl: 2.0, bu: 0.9, bl: 1.8, lean: 0.12, ht: -0.05 }); // frozen mid-sentence
      if (t === 470) { talk('BADDIE', 'Ew. No.', '#ff5fa2', 'baddie'); sfx('boing'); }
      if (t === 488) { talk('BADDIE', 'Kill it.', '#ff5fa2', 'baddie'); shake = 6; }
      if (t === 506) { talk('BADDIE', 'Eww, ew, ew!', '#ff5fa2', 'baddie'); shake = 10; }
      if (t === 506 || t === 514 || t === 522) fx('text', mt.x + (rand() - 0.5) * 60, FLOOR - bh - 20 - rand() * 30, 'EW', '#ff5fa2');
      const zm = t < 488 ? 0 : t < 506 ? 1 : 2; // three snap zooms, closer each time
      shot(cn, 13 + zm, { x: mt.x, y: FLOOR - bh * 0.88, yaw: -d * (0.2 + zm * 0.08), dist: [1.6, 1.15, 0.85][zm], fov: [24, 21, 18][zm], lift: -0.1, lock: 1 });
    } else if (t < 610) { // they freeze solid: ice, sweat, a long silence. Then they tip over like a plank
      mt.pose = lp(mt.pose, finP({ fu: 1.2, fl: 2.6, hz: 0.7, bu: 1.2, bl: 2.6, hzb: 0.7, lean: -0.15, ht: -0.15 }), 0.08);
      l.ice = Math.min(1, k(530, 566));
      if (!cn.frz) cn.frz = Object.assign({}, l.finPose || POSES.mid);
      if (t < 586) { l.finPose = Object.assign({}, cn.frz, { rot: 0 }); if (t === 532) talk(vName, '...', l.c.color);
        if (t % 4 === 0) parts.push({ k: 's', x: l.x + (rand() - 0.5) * 40, y: l.y - rand() * l.h, vx: 0, vy: -0.3, life: 20, max: 20, c: '#cfeaff' });
        if (t % 7 === 0) parts.push({ k: 'd', x: l.x + d * 10 + (rand() - 0.5) * 20, y: head(l), vx: (rand() - 0.5) * 0.6, vy: 1.6, life: 22, max: 22, c: '#9fd4ff' }); // sweat
        if (t === 566) { sfx('glass'); shake = 4; } }
      else { const q = k(586, 600); l.finPose = Object.assign({}, cn.frz, { rot: 1.52 * q * q }); cn.dlg = null;
        if (t === 600) { l.kd = 2; l.kdT = 30; l.y = FLOOR; sfx('thud'); sfx('brk'); shake = 12; fx('dust', l.x + d * l.h * 0.4, FLOOR, 14); fx('sparks', l.x + d * l.h * 0.4, FLOOR - 20, '#cfeaff', 30); } }
      if (t < 566) shot(cn, 16, { x: l.x + d * 4, y: head(l), yaw: d * 0.3, dist: lerp(1.5, 0.95, k(530, 566)), fov: 20, lift: -0.1, lock: 1 }); // a slow push in on the embarrassment
      else shot(cn, 17, { x: lerp(l.x, mt.x, 0.4), y: FLOOR - 110, yaw: d * lerp(0.6, 0.35, k(566, 610)), dist: 4.2, fov: 30, lift: -0.3, lock: 1 });
    } else if (t < 660) { // she flips her hair and leaves
      const ph = t * 0.3; mt.facing = d; mt.x += d * 2.2; mt.pose = walk(ph, { bu: 2.5, bl: 3.5, hzb: 0.2, lean: -0.08, ht: -0.15 });
      if (t === 640) { mt.gone = true; fx('sparks', mt.x, FLOOR - 100, '#ff9fd0', 26); sfx('dodge'); }
      shot(cn, 18, { x: lerp(l.x, mt.x, 0.5), y: FLOOR - 120, yaw: -d * 0.3, dist: 5.4, fov: 32, lift: -0.2 });
    } else { // he walks up, looks down at them, fixes the chain: "Say mayne."
      const tx = l.x - d * 70; w.facing = d;
      if (Math.abs(w.x - tx) > 4) { w.x += Math.sign(tx - w.x) * 4; w.finPose = walk(t * 0.4); } else w.finPose = lp(w.finPose, t < 700 ? chain : finP({ fu: 1.62, fl: 1.62, bu: 0.2, bl: 0.5, lean: 0.04, ht: -0.08, hy: -0.12, point: 1 }), 0.12);
      if (t === 676) talk('HEXUMLITE', 'Say mayne. That’s a W.', w.c.color, 'hexum');
      if (t === 704) { sfx('glint'); fx('sparks', w.x + d * 10, head(w) - 4, '#ffffff', 10); }
      shot(cn, 19, { x: w.x + d * 6, y: head(w), yaw: d * lerp(0.75, 0.3, swing(k(660, 720))), dist: lerp(2.2, 1.35, swing(k(660, 720))), fov: 22, lift: -0.2, lock: 1 }); // one last slow arc
    }
  },
  // ---- VERITY: LIGHTS OUT. The lights flicker; every time they come back he's closer. Then they don't come back. ----
  lights(cn, w, l, t, d, k) {
    if (t < 40) { w.finPose = finP({ fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.36, crouch: 0.18, ht: 0.22, hy: 0.45 * Math.sin(t / 14), spread: 0.2 });
      shot(cn, 1, { x: w.x + d * 6, y: w.y - w.h * w.scale * 0.88, yaw: d * 0.35, dist: 1.25, fov: 20 }); }
    else if (t < 120) { const e = (t - 40) % 20; cn.dark = e < 6 ? 0.96 : 0; // the flicker
      if (e === 0) { sfx('void'); const gp = Math.max(w.bw * w.scale * 0.5 + l.bw * l.scale * 0.5 + 14, Math.abs(l.x - w.x) - 70); w.x = l.x - d * gp; }
      l.dazed = false; l.ko = true; l.finPose = finP({ tw: Math.sin(t / 3) * 0.5, lean: -0.25, ht: -0.2, fu: 1.3, fl: 2.8, bu: 1.2, bl: 2.7, crouch: 0.12 });
      w.finPose = finP({ fu: 1.7 + Math.sin(t) * 0.05, fl: 2.2, bu: 1.6, bl: 2.1, spread: 0.45, lean: 0.3, crouch: 0.2, ht: 0.1, hy: 0.3 });
      shot(cn, 2, { x: lerp(w.x, l.x, 0.6), y: FLOOR - l.h * 0.75, yaw: -d * 0.4, dist: 3.4, fov: 28 }); }
    else if (t < 170) { cn.dark = 0.985; // darkness: only the sounds
      if (t === 122) say(l.c.id, 'No no no no!'); if (t === 136 || t === 148 || t === 158) { sfx('hit'); sfx('heavy'); shake = 12; l.flash = 4; fx('sparks', l.x, l.y - l.h * 0.6, '#ffffff', 8); }
      w.finPose = finP({ fu: 2.4, fl: 2.9, bu: 2.2, bl: 2.8, lean: 0.5, crouch: 0.25 });
      shot(cn, 3, { x: l.x, y: FLOOR - 100, yaw: d * 0.3, dist: 4.0, fov: 30 }); }
    else { if (t === 170) { cn.dark = 0; l.finPose = null; l.kd = 2; l.kdT = 30; l.y = FLOOR; screenFlash = 4; sfx('thud'); w.x = l.x - d * 20; }
      if (t === 186) say('verity', "Hey. It's me.");
      w.finPose = finP({ fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.55, crouch: 0.3, ht: 0.35, hy: 0.5, spread: 0.2 }); // standing over them, head cocked
      shot(cn, t < 200 ? 4 : 5, t < 200 ? { x: lerp(w.x, l.x, 0.5), y: FLOOR - 90, yaw: d * 0.5, dist: 3.4, fov: 30 } : { x: w.x + d * 10, y: w.y - w.h * w.scale * 0.8, yaw: d * 0.3, dist: 1.3, fov: 20 }); }
  },
});
const BADDIE_H = () => ((BADDIE.inches - 40) * 3.2 + 30);

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
  cn.dark = 0; cn.mate = null; cn.dlg = null; w.finPose = null; w.scale = 1; w.big = 0; w.gone = false; l.gone = !!l.keepGone; l.vanish = 0; l.dazed = false; l.ko = true; l.z = 0;
  if (l.kd === 0 && !l.sink && !l.keepGone) { l.kd = 2; l.kdT = 0; l.y = FLOOR; }
  winner = w.side; endT = 110;
  banner = null; sfx('ko'); say('announcer', w.c.fin.name.toLowerCase()); // no name splashed over the ending: the film speaks for itself
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
// 2D: the Cold Approach dimension: a dusk sky, the moon, a skyline, neon signs, string lights, a marble rooftop
const RIZZ_FLOOR = {
  base: '#140c18', line: 'rgba(255,122,184,0.18)', haze: 'rgba(255,120,180,0.25)', edge: 'rgba(255,122,184,0.8)',
  cell: (r, c) => (r + c) % 2 ? '#1c1222' : null,
  extra: (colX, rows) => { ctx.fillStyle = 'rgba(138,15,36,0.85)'; const y0 = rows[3], y1 = rows[6]; ctx.beginPath(); ctx.moveTo(colX(-400, y0), y0); ctx.lineTo(colX(WW + 400, y0), y0); ctx.lineTo(colX(WW + 400, y1), y1); ctx.lineTo(colX(-400, y1), y1); ctx.fill(); }, // the red carpet
};
function drawRizz2D() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07041a'); g.addColorStop(0.45, '#2a0c4a'); g.addColorStop(0.75, '#a02a6a'); g.addColorStop(1, '#ff7a9a');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.3 + seeded(i, 3) * 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(seeded(i, 1) * W, seeded(i, 2) * H * 0.5, 1.5, 1.5); } ctx.globalAlpha = 1;
  inLayer(0.05, LW => { const x = LW * 0.72, y = FLOOR - 400, mg = ctx.createRadialGradient(x, y, 20, x, y, 200); mg.addColorStop(0, 'rgba(255,200,230,0.5)'); mg.addColorStop(1, 'rgba(255,120,180,0)'); ctx.fillStyle = mg; ctx.fillRect(x - 220, y - 220, 440, 440);
    ctx.fillStyle = '#ffe8f2'; ctx.beginPath(); ctx.arc(x, y, 78, 0, 7); ctx.fill(); });
  inLayer(0.2, LW => { for (let i = 0; i < 40; i++) { const bw = 40 + seeded(i, 5) * 60, bh = 50 + seeded(i, 6) * 170, x = i * (LW / 38) - 20, y = FLOOR - 60 - bh;
    ctx.fillStyle = '#0c0814'; ctx.fillRect(x, y, bw, bh + 80);
    for (let wy = y + 8; wy < FLOOR - 70; wy += 14) for (let wx2 = x + 6; wx2 < x + bw - 6; wx2 += 11) if (seeded(wx2 | 0, wy | 0) < 0.3) { ctx.fillStyle = ['#ffd9a0', '#ff9fd0', '#b48cff'][(seeded(wy | 0, wx2 | 0) * 3) | 0]; ctx.globalAlpha = 0.6; ctx.fillRect(wx2, wy, 5, 7); }
    ctx.globalAlpha = 1; } });
  inLayer(0.45, LW => { const fl = Math.sin(frame * 0.4) > 0.9 ? 0.35 : 1; ctx.save(); ctx.font = `italic 900 120px ${HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#3ddc84'; ctx.shadowBlur = 30; ctx.globalAlpha = fl; ctx.strokeStyle = '#3ddc84'; ctx.lineWidth = 6; ctx.strokeText('W', LW * 0.3, FLOOR - 300); ctx.fillStyle = '#eafff2'; ctx.fillText('W', LW * 0.3, FLOOR - 300);
    ctx.globalAlpha = 1; ctx.font = `italic 900 46px ${HEAD}`; ctx.shadowColor = '#ff5fa2'; ctx.strokeStyle = '#ff5fa2'; ctx.strokeText('COLD APPROACH', LW * 0.68, FLOOR - 250); ctx.fillStyle = '#fff0f6'; ctx.fillText('COLD APPROACH', LW * 0.68, FLOOR - 250); ctx.restore();
    for (let r = 0; r < 2; r++) { ctx.strokeStyle = '#2a2024'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 0; x <= LW; x += 20) { const y = FLOOR - 230 + r * 30 + Math.sin(x / LW * Math.PI) * 50; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      for (let x = 10; x <= LW; x += 34) { const y = FLOOR - 228 + r * 30 + Math.sin(x / LW * Math.PI) * 50; ctx.fillStyle = '#ffe2b0'; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(frame / 8 + x); ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; } });
  perspFloor(RIZZ_FLOOR);
  for (let i = 0; i < 18; i++) { const x = (seeded(i, 8) * W + frame * 0.2 * (0.5 + seeded(i, 9))) % W, y = H - ((frame * (0.4 + seeded(i, 7) * 0.5) + seeded(i, 4) * H) % H), r = 4 + seeded(i, 6) * 5; // hearts in the air
    ctx.globalAlpha = 0.55; ctx.fillStyle = i % 2 ? '#ff5fa2' : '#ff9fd0'; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 2, y - r * 0.4, x - r * 0.9, y - r * 1.8, x, y - r * 0.6); ctx.bezierCurveTo(x + r * 0.9, y - r * 1.8, x + r * 2, y - r * 0.4, x, y + r); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// in world space, behind the fighters: the portal (and the table for two)
function drawFinBack2D() {
  if (cine.rz && rizzOn) { const x = cine.rz.tx, y = FLOOR - 4; ctx.fillStyle = '#f4f0ea'; ctx.beginPath(); ctx.ellipse(x, y - 76, 46, 9, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 46, y - 76, 92, 30); ctx.fillStyle = '#c9a24a'; ctx.fillRect(x - 3, y - 46, 6, 46);
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(x - 14, y - 98, 5, 18); const fl = ctx.createRadialGradient(x - 11, y - 102, 1, x - 11, y - 102, 16); fl.addColorStop(0, 'rgba(255,200,120,0.9)'); fl.addColorStop(1, 'rgba(255,160,80,0)'); ctx.fillStyle = fl; ctx.fillRect(x - 30, y - 120, 40, 40);
    ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.arc(x + 14, y - 96, 6, 0, 7); ctx.fill(); }
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
  if (cine.dark > 0) { ctx.save(); ctx.globalAlpha = cine.dark; ctx.fillStyle = '#000'; ctx.fillRect(-400, -400, WW + 800, H + 800); ctx.restore(); }
  const f = cine.flood || 0; if (f <= 0) return;
  const top = FLOOR + 8 - f * 230;
  ctx.save(); ctx.fillStyle = 'rgba(30,110,200,0.5)'; ctx.beginPath(); ctx.moveTo(-200, FLOOR + 400);
  for (let x = -200; x <= WW + 200; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.02 + frame * 0.15) * 10 * f);
  ctx.lineTo(WW + 200, FLOOR + 400); ctx.fill();
  ctx.strokeStyle = 'rgba(220,245,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = -200; x <= WW + 200; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.02 + frame * 0.15) * 10 * f);
  ctx.stroke(); ctx.restore();
}
