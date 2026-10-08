// ---------- moves, fighters, physics, CPU, poses, drawing ----------
// frames at 60fps; limb moves reach as far as the fighter's arm/leg; wind/hit are key poses; kd = knockdown
const MOVES = {
  jab:  { dur: 16, start: 5, end: 8, dmg: 6, limb: 'arm', rm: 1.0, hy: 0.74, kb: 3, stun: 15, hs: 4, chain: 'jab2',
          wind: { fu: 0.75, fl: 2.0, lean: 0.04 }, hit: { fu: 1.55, fl: 1.57, lean: 0.2, bu: 0.4, bl: 2.6 } },
  jab2: { dur: 17, start: 4, end: 7, dmg: 6, limb: 'arm', rm: 1.0, hy: 0.74, kb: 3, stun: 15, hs: 4, chain: 'hook',
          wind: { bu: 0.6, bl: 2.0, lean: 0.1 }, hit: { bu: 1.55, bl: 1.57, lean: 0.3, fu: 0.3, fl: 2.4 } },
  hook: { dur: 28, start: 8, end: 12, dmg: 10, limb: 'arm', rm: 1.05, hy: 0.76, kb: 6, stun: 26, hs: 8, heavy: 1, chain: 'upper',
          wind: { fu: 0.1, fl: 1.0, lean: -0.15, crouch: 0.12 }, hit: { fu: 1.8, fl: 2.1, lean: 0.38 } },
  // finisher of the 4-hit punch string, also down + punch: launches
  upper: { dur: 30, start: 9, end: 13, dmg: 11, limb: 'arm', rm: 0.8, hy: 0.86, kb: 4, stun: 30, hs: 9, launch: -13, heavy: 1, kd: 1,
          wind: { crouch: 0.38, fu: 0.15, fl: 0.9, lean: 0.08, bu: 0.3, bl: 2.4 }, hit: { fu: 2.5, fl: 2.95, crouch: 0, lean: -0.12, ht: -0.15, bu: 0.1, bl: 1.2 } },
  // forward + punch: hook to the body
  bodyhook: { dur: 24, start: 7, end: 11, dmg: 9, limb: 'arm', rm: 0.9, hy: 0.52, kb: 5, stun: 24, hs: 7, chain: 'upper',
          wind: { fu: -0.1, fl: 1.1, lean: -0.1, crouch: 0.15 }, hit: { fu: 1.2, fl: 1.85, lean: 0.38, crouch: 0.22 } },
  // Ryan's forward + punch: hip-first lunge with the sword
  thrust: { dur: 30, start: 9, end: 15, dmg: 12, limb: 'sword', rm: 1.0, hy: 0.4, kb: 8, stun: 26, hs: 8, dash: 6,
          wind: { lean: -0.2, crouch: 0.25, fu: 0.6, fl: 2.2, bu: -0.4, bl: 0.4 }, hit: { lean: -0.4, crouch: 0.08, ft: 0.85, fs: 0.3, bt: -0.6, bs: -0.95, fu: -0.5, fl: 0.2, bu: -0.8, bl: -0.2 } },
  // down + kick: low sweep, knocks down
  sweep: { dur: 32, start: 10, end: 15, dmg: 8, limb: 'leg', rm: 1.0, hy: 0.06, kb: 3, stun: 20, hs: 7, launch: -4, kd: 1,
          wind: { crouch: 0.45, lean: 0.25, ft: 0.6, fs: 0.2 }, hit: { crouch: 0.55, lean: 0.35, ft: 1.35, fs: 1.55, bt: -0.25, bs: -1.4, fu: 0.9, fl: 0.4, bu: -0.3, bl: 0.2 } },
  // forward + kick: heavy roundhouse to the head
  round: { dur: 36, start: 14, end: 18, dmg: 12, limb: 'leg', rm: 1.05, hy: 0.72, kb: 10, stun: 26, hs: 9, launch: -6, heavy: 1, kd: 1,
          wind: { ft: 1.2, fs: 0.3, lean: -0.25, crouch: 0.1, fu: 0.9, fl: 2.6 }, hit: { ft: 2.05, fs: 2.15, lean: -0.55, bt: -0.1, bs: -0.1, fu: 0.5, fl: 1.4, bu: -0.7, bl: -0.3 } },
  kick: { dur: 28, start: 10, end: 14, dmg: 10, limb: 'leg', rm: 1.0, hy: 0.46, kb: 7, stun: 20, hs: 6,
          wind: { ft: 1.6, fs: 0.25, lean: -0.12, bt: -0.05, bs: -0.05 },
          hit: { ft: 1.5, fs: 1.55, lean: -0.35, bt: -0.08, bs: -0.08, fu: 0.4, fl: 1.2, bu: -0.5, bl: -0.1 } },
  akick: { dur: 26, start: 5, end: 16, dmg: 9, limb: 'leg', rm: 0.85, hy: 0.3, kb: 6, stun: 18, hs: 6, air: 1,
          wind: { ft: 1.2, fs: 0.0, bt: 0.3, bs: -1.0 }, hit: { ft: 0.95, fs: 0.95, bt: -0.1, bs: -1.3, lean: -0.2, fu: 1.0, fl: 2.4 } },
  wave:   { dur: 32, start: 12, end: 14, cast: 'proj', proj: 'wave',
            wind: { fu: -0.4, fl: 0.6, bu: -0.5, bl: 0.5, lean: -0.15, crouch: 0.1 }, hit: { fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.25 } },
  spiral: { dur: 32, start: 12, end: 14, cast: 'proj', proj: 'spiral',
            wind: { fu: 2.5, fl: 2.9, bu: 2.3, bl: 2.8, lean: -0.1 }, hit: { fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.25 } },
  flow:   { dur: 30, start: 12, end: 14, cast: 'buff', buff: 'flow', time: 360,
            wind: { crouch: 0.25, fu: 0.3, fl: 1.0, bu: 0.3, bl: 1.0 }, hit: { fu: 2.7, fl: 3.0, bu: 2.5, bl: 3.0, lean: -0.1 } },
  expand: { dur: 34, start: 14, end: 16, cast: 'buff', buff: 'big', time: 420,
            wind: { crouch: 0.3, fu: 0.3, fl: 1.0, bu: 0.3, bl: 1.0 }, hit: { fu: 2.7, fl: 3.0, bu: 2.5, bl: 3.0, lean: -0.15, ft: 0.5, bt: -0.5 } },
  mind:   { dur: 30, start: 10, end: 12, cast: 'teleport',
            wind: { fu: 0.9, fl: 2.9, bu: 0.9, bl: 2.8, ht: 0.2 }, hit: { fu: 0.9, fl: 2.9, bu: 0.9, bl: 2.8, ht: -0.1, lean: 0.1 } },
  presence: { dur: 36, start: 14, end: 16, cast: 'presence',
            wind: { lean: -0.1, ht: -0.2 }, hit: { fu: 1.5, fl: 1.6, ht: 0.15, lean: 0.1 } },
  slam:   { dur: 70, start: 4, end: 4, cast: 'slam',
            wind: { crouch: 0.35 }, hit: { fu: 2.6, fl: 3.0, bu: 2.5, bl: 3.0, ft: 0.9, fs: 0.2, bt: 0.6, bs: -0.4 } },
  form:   { dur: 30, start: 14, end: 16, cast: 'buff', buff: 'armor', time: 420,
            wind: { crouch: 0.3, fu: 0.3, fl: 1.0, bu: 0.3, bl: 1.0 }, hit: { fu: 1.0, fl: 2.8, bu: 0.8, bl: 2.8, lean: -0.1, ft: 0.45, bt: -0.45 } },
  rush:   { dur: 32, start: 6, end: 22, dmg: 12, reach: 26, hy: 0.65, kb: 13, stun: 26, hs: 8, heavy: 1, dash: 11, kd: 1, wall: 1, launch: -5,
            wind: { crouch: 0.25, lean: 0.3 }, hit: { lean: 0.55, fu: 0.3, fl: 2.7, bu: -0.4, bl: 0.3 } },
  force:  { dur: 52, start: 26, end: 32, dmg: 26, reach: 125, hy: 0.75, kb: 22, stun: 40, hs: 14, launch: -10, heavy: 1, armor: 1, superHit: 1, kd: 1, wall: 1,
            wind: { fu: -0.7, fl: 0.3, lean: -0.3, crouch: 0.2, bu: 0.8, bl: 2.4 }, hit: { fu: 1.57, fl: 1.57, lean: 0.45, crouch: 0.1 } },
};
const PROJ = {
  wave:   { speed: 9, r: 20, dmg: 9, kb: 6, stun: 18, hs: 6 },
  spiral: { speed: 6, r: 17, dmg: 6, kb: 2, stun: 70, hs: 6, hypno: 1 },
};
const SLAM = { dmg: 13, kb: 9, stun: 28, hs: 9, launch: -8, heavy: 1, kd: 1 };
const SKILL_COST = 25, SUPER_COST = 100; // meter is 4 bars of 25

function makeFighter(ci, side) {
  const c = CHARS[ci];
  return {
    ci, c, side, x: WW / 2 + (side ? 230 : -230), y: FLOOR, vx: 0, vy: 0, facing: side ? -1 : 1,
    // height drives size and reach; weight drives width, knockback and power
    h: (c.inches - 40) * 3.2 + 30, sw: 22 + c.kg * 0.17, lw: 9 + c.kg * 0.05, b: c.build,
    bw: (22 + c.kg * 0.17) * Math.max(c.build.shoulder, c.build.waist * (c.build.belly ? 1.45 : 1)),
    maxHp: Math.round((70 + c.dur * 0.7) * (c.build.hp || 1) * 1.5), hp: 0, dispHp: 0, bar: 0, barAnim: 0,
    speed: (2.3 + c.spd / 30) * c.build.mob, power: (0.6 + c.str / 250) * Math.pow(c.kg / 80, 0.15) * (c.build.dmg || 1),
    kbMul: Math.sqrt(80 / c.kg), atkSpd: c.build.atk, meterMul: c.hax / 85 * 0.8, // HAX = how fast abilities charge
    move: null, mt: 0, hitDone: false, slamDone: false, stun: 0, hitType: 'high', blocking: false, buf: {}, prevInp: {},
    meter: 0, flow: 0, big: 0, armor: 0, confused: 0, weak: 0, hypno: 0, dodgeCd: 0, vanish: 0, flash: 0,
    kd: 0, kdT: 0, bounced: false, juggle: 0, wallHit: false, dashT: 0, dashDir: 0,
    scale: 1, combo: 0, comboT: 0, comboDmg: 0, ko: false, victory: false, intro: false, walkPh: 0, trail: [], ai: null,
  };
}
const TIMERS = ['flow', 'big', 'armor', 'confused', 'weak', 'hypno', 'dodgeCd', 'vanish', 'flash', 'barAnim'];

function hurtbox(f) {
  const s = f.scale, top = (f.h * 0.85 + 28) * s; // legs + torso + head
  return { x1: f.x - f.bw * 0.5 * s, x2: f.x + f.bw * 0.5 * s, y1: f.y - top, y2: f.y };
}
const hittable = f => !f.ko && f.vanish <= 0 && f.kd < 2 && !(f.kd === 1 && f.juggle >= 3);
// how far a punch/kick reaches from the body centre: taller fighters and longer arms hit from further
const limbLen = (f, limb) => (limb === 'arm' ? 0.33 * f.h * f.b.arm : limb === 'sword' ? 0.5 * f.h : 0.46 * f.h) * f.scale;

function startMove(f, id) {
  f.move = id; f.mt = 0; f.hitDone = false; f.slamDone = false; f.dashT = 0;
  if (MOVES[id].dmg) sfx('whoosh');
}

function updateFighter(f, foe, inp, canAct) {
  for (const k of TIMERS) if (f[k] > 0) f[k]--;
  for (const b of BTN) if (f.buf[b] > 0) f.buf[b]--;
  if (f.comboT > 0 && --f.comboT === 0) { f.combo = 0; f.comboDmg = 0; }
  f.scale = lerp(f.scale, f.big > 0 ? 1.6 : 1, 0.12);
  if (f.flow > 0 && frame % 3 === 0) { f.trail.push({ x: f.x, y: f.y }); if (f.trail.length > 4) f.trail.shift(); }
  else if (f.flow <= 0 && f.trail.length) f.trail.shift();
  const ground = f.y >= FLOOR;
  f.blocking = false;
  if (f.kd) {
    f.kdT++;
    if (f.kd === 2) { f.vx *= 0.8; if (!f.ko && f.kdT > 42) { f.kd = 3; f.kdT = 0; } }
    else if (f.kd === 3) { f.vx = 0; if (f.kdT >= 26) { f.kd = 0; f.juggle = 0; f.facing = foe.x > f.x ? 1 : -1; } }
  }
  else if (f.victory || !canAct) { if (ground) f.vx *= 0.8; if (f.move) stepMove(f, foe); else if (ground) f.facing = foe.x > f.x ? 1 : -1; }
  else if (f.stun > 0) { f.stun--; if (ground) f.vx *= 0.88; }
  else if (f.move) stepMove(f, foe);
  else {
    if (ground) f.facing = foe.x > f.x ? 1 : -1;
    const sp = f.speed * (f.flow > 0 ? 1.45 : 1) * (foe.big > 0 && Math.abs(foe.x - f.x) < 230 ? 0.6 : 1);
    const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inp.dash && ground && !f.dashT) { f.dashT = 14; f.dashDir = inp.dash; sfx('whoosh'); fx('dust', f.x, FLOOR, 6); }
    if (f.dashT > 0) {
      f.dashT--; f.vx = f.dashDir * sp * (f.dashDir === f.facing ? 2.6 : 2.1) * (0.4 + f.dashT / 14 * 0.6);
    } else if (ground) {
      if (inp.down) { f.blocking = true; f.vx *= 0.6; }
      else {
        f.vx = mv * sp * (mv === -f.facing ? 0.78 : 1);
        if (inp.up) { f.vy = -15.5 * f.b.jump; f.vx = mv * sp * 1.1; sfx('jump'); fx('dust', f.x, FLOOR, 5); }
      }
    }
    const use = b => { if (f.buf[b] > 0) { f.buf[b] = 0; return true; } return false; };
    if (f.buf.super > 0 && f.meter >= SUPER_COST) {
      use('super'); f.meter -= SUPER_COST; startMove(f, f.c.super.move); sfx('super');
      startCine(f);
    } else if (f.buf.skill > 0 && f.meter >= SKILL_COST) { use('skill'); f.meter -= SKILL_COST; startMove(f, f.c.skill.move); sfx('skill'); }
    else if (use('punch')) startMove(f, !ground ? 'akick' : inp.down ? 'upper' : mv === f.facing ? (f.c.sword ? 'thrust' : 'bodyhook') : 'jab');
    else if (use('kick')) startMove(f, !ground ? 'akick' : inp.down ? 'sweep' : mv === f.facing ? 'round' : 'kick');
  }
  if (ground && !f.move && Math.abs(f.vx) > 0.5) f.walkPh += Math.abs(f.vx) * 0.055 * 136 / f.h;
  // physics
  f.vy += GRAV; f.x += f.vx; f.y += f.vy;
  if (f.y >= FLOOR) {
    if (f.kd === 1 && f.kdT > 2) {
      if (!f.bounced && f.vy > 4) { f.vy = -f.vy * 0.38; f.vx *= 0.6; f.bounced = true; fx('dust', f.x, FLOOR, 12); shake = Math.max(shake, 6); sfx('thud'); }
      else { f.vy = 0; f.kd = 2; f.kdT = 0; fx('dust', f.x, FLOOR, 8); }
      f.y = FLOOR;
    } else {
      if (!ground && f.vy > 5) fx('dust', f.x, FLOOR, 6);
      f.y = FLOOR; f.vy = 0;
      if (f.move && MOVES[f.move].air) f.move = null;
    }
  }
  const half = f.bw * 0.55 * f.scale, x0 = f.x;
  f.x = clamp(f.x, half + 20, WW - half - 20);
  if (f.x !== x0 && f.kd === 1 && f.wallHit && Math.abs(f.vx) > 5) wallBounce(f);
  if (!f.ko) f.meter = Math.min(100, f.meter + 0.025 * f.meterMul);
  f.dispHp = f.dispHp > f.hp ? Math.max(f.hp, f.dispHp - 0.6) : f.hp;
}

function wallBounce(f) {
  f.vx = -f.vx * 0.45; f.vy = Math.min(f.vy, -7); f.wallHit = false;
  shake = Math.max(shake, 12); cam.kick = 0.06; sfx('heavy');
  fx('sparks', f.x, f.y - f.h * 0.5, '#fff', 14); fx('debris', f.x, f.y - f.h * 0.5, 8);
}

function stepMove(f, foe) {
  const M = MOVES[f.move], prev = f.mt;
  f.mt += (f.flow > 0 ? 1.45 : 1) * f.atkSpd;
  const ground = f.y >= FLOOR;
  if (M.dash && f.mt >= M.start && f.mt <= M.end) { f.vx = f.facing * M.dash; if (frame % 3 === 0) fx('dust', f.x - f.facing * 10, FLOOR, 2); }
  else if (ground && !M.air && M.cast !== 'slam') f.vx *= 0.72;
  if (M.dmg && !f.hitDone && f.mt >= M.start && f.mt <= M.end + 1) tryHit(f, foe, M);
  if (M.cast && prev < M.start && f.mt >= M.start) doCast(f, foe, M);
  if (M.cast === 'slam') {
    if (!f.slamDone && f.mt > M.start + 3 && ground) { f.slamDone = true; slamLand(f, foe); f.mt = M.dur - 14; }
    else if (!f.slamDone && f.mt >= M.dur - 15) f.mt = M.dur - 15; // hang until landing
  }
  if (M.chain && f.hitDone && f.mt >= M.start + 3) {
    if (f.buf.punch > 0) { f.buf.punch = 0; startMove(f, M.chain); return; }
    if (f.buf.kick > 0) { f.buf.kick = 0; startMove(f, 'kick'); return; }
  }
  if (f.mt >= M.dur) f.move = null;
}

function tryHit(f, foe, M) {
  if (!hittable(foe)) return;
  const s = f.scale, front = f.x + f.facing * f.sw * (M.limb ? 0.12 : 0.4) * s;
  const reach = M.limb ? limbLen(f, M.limb) * M.rm + 4 : M.reach * s;
  const hx1 = Math.min(front, front + f.facing * reach), hx2 = Math.max(front, front + f.facing * reach);
  const cy = f.y - M.hy * f.h * s, b = hurtbox(foe);
  if (M.limb) b.y1 += (14 + foe.h * 0.05) * foe.scale * 0.6; // grazing the top of the head doesn't count: tall fighters' punches go over small ones
  if (hx2 > b.x1 && hx1 < b.x2 && cy + 22 * s > b.y1 && cy - 22 * s < b.y2) {
    f.hitDone = true;
    applyHit(f, foe, M, f.facing, clamp(front + f.facing * reach * 0.8, b.x1, b.x2), cy);
  }
}

function applyHit(att, def, M, dir, hx, hy) {
  if (def.flow > 0 && def.dodgeCd <= 0 && !M.superHit) {
    def.dodgeCd = 140; def.x = clamp(def.x + dir * 50, 40, WW - 40); def.vanish = 6;
    fx('text', def.x, def.y - def.h * def.scale - 30, 'DODGE', def.c.color); sfx('dodge'); return;
  }
  const blocked = def.blocking && def.facing === -dir && def.kd === 0;
  const armored = def.armor > 0 || (def.move && MOVES[def.move].armor);
  let dmg = M.dmg * att.power * att.scale * (att.flow > 0 ? 1.15 : 1) * (att.weak > 0 ? 0.7 : 1);
  if (def.kd === 1) dmg *= 0.7; // juggles do less
  if (blocked) dmg *= 0.15;
  if (def.armor > 0) dmg *= 0.4;
  const before = def.hp;
  def.hp = Math.max(0, def.hp - dmg);
  att.meter = Math.min(100, att.meter + dmg * 0.6 * att.meterMul);
  def.meter = Math.min(100, def.meter + dmg * 0.4 * def.meterMul);
  if (blocked) {
    def.vx = dir * M.kb * 0.6 * def.kbMul; hitstop = 3; sfx('block');
    fx('sparks', hx, hy, '#9cf', 6); fx('text', hx, hy - 24, 'BLOCK', '#9cf');
  } else {
    if (def.flow > 0) { def.flow = 0; fx('text', def.x, def.y - def.h - 40, 'FLOW BROKEN', def.c.color); }
    const comboing = def.stun > 0 || def.kd === 1 || def.y < FLOOR - 2;
    att.combo = comboing ? att.combo + 1 : 1; att.comboDmg = (comboing ? att.comboDmg : 0) + (before - def.hp); att.comboT = 80;
    const shrug = def.c.kg >= 130 && !M.heavy && M.dmg <= 6 && def.kd === 0; // heavyweight: jabs don't stagger him
    if (shrug && !armored) { def.vx = dir * M.kb * 0.3; def.flash = 3; }
    else if (!armored) {
      def.move = null; def.dashT = 0; def.flash = 5; def.hitType = M.hy > 0.6 || M.proj ? 'high' : 'mid';
      def.vx = dir * M.kb * def.kbMul;
      if (M.kd || def.y < FLOOR - 4 || def.kd === 1) {
        def.kd = 1; def.kdT = 0; def.bounced = false; def.stun = 0; def.juggle++; def.wallHit = def.wallHit || !!M.wall;
        def.vy = (M.launch || -6) * Math.sqrt(def.kbMul);
      } else { def.stun = M.stun; if (M.hypno) def.hypno = M.stun; }
    } else { def.vx = dir * M.kb * 0.15; def.flash = 3; }
    hitstop = M.hs || 5; shake = Math.max(shake, (M.hs || 5) * 0.9);
    if (M.heavy) { cam.kick = Math.max(cam.kick, 0.04); cam.roll += (rand() - 0.5) * 0.07; }
    if (M.superHit) { cine = { kind: 'impact', t: 0, max: 96, side: att.side, x: hx, y: hy }; sfx('brk'); }
    sfx(M.heavy ? 'heavy' : 'hit'); fx('impact', hx, hy, att.c.color, M.heavy ? 1.6 : 1);
    if (M.heavy) fx('ring', hx, hy, att.c.color, 3);
  }
  // Injustice-style health: two bars. Emptying the first knocks you down and you fight on in critical.
  const half = def.maxHp / 2;
  if (def.bar === 0 && def.hp <= half) { def.hp = half; def.bar = 1; barBreak(def, dir); }
  else if (def.hp <= 0 && !def.ko) {
    def.ko = true; def.move = null; def.stun = 0; def.kd = 1; def.kdT = 0; def.bounced = false; def.vy = -10; def.vx = dir * 7 * def.kbMul; def.wallHit = true;
    slowmo = 100; hitstop = 22; shake = 18; cam.kick = 0.14; screenFlash = 14; sfx('ko');
    banner = { txt: 'K.O.', t: 140, max: 140, c: '#ffffff' }; say('announcer', 'K.O.');
    winner = att.side; endT = 170;
  }
}

function barBreak(def, dir) {
  def.move = null; def.stun = 0; def.kd = 1; def.kdT = 0; def.bounced = false; def.vy = -10; def.vx = dir * 8 * def.kbMul; def.wallHit = true;
  def.barAnim = 70; def.dispHp = def.hp; def.meter = Math.min(100, def.meter + 25);
  hitstop = 26; shake = 18; cam.kick = 0.12; screenFlash = 10; sfx('brk');
  banner = { txt: 'CRITICAL!', t: 90, max: 90, c: '#ff3b3b' };
  fx('impact', def.x, def.y - def.h * 0.6, '#ff3b3b', 2.2); fx('ring', def.x, def.y - def.h * 0.6, '#ff3b3b', 6);
}

function doCast(f, foe, M) {
  const s = f.scale, dir = f.facing;
  if (M.cast === 'proj') {
    const p = PROJ[M.proj];
    projs.push({ owner: f.side, kind: M.proj, x: f.x + dir * (f.sw * 0.6 + 22) * s, y: f.y - 0.74 * f.h * s, vx: dir * p.speed, r: p.r * s, life: 140, t: 0 });
  } else if (M.cast === 'buff') {
    f[M.buff] = M.time; fx('ring', f.x, f.y - f.h * s / 2, f.c.color, 4); shake = 6;
  } else if (M.cast === 'teleport') {
    fx('sparks', f.x, f.y - f.h / 2, f.c.color, 14);
    f.x = clamp(foe.x - foe.facing * (foe.bw * 0.55 * foe.scale + f.bw * 0.5 + 20), 40, WW - 40);
    f.facing = foe.x > f.x ? 1 : -1; f.vanish = 10;
    foe.confused = Math.max(foe.confused, 60);
    fx('sparks', f.x, f.y - f.h / 2, f.c.color, 14);
  } else if (M.cast === 'presence') {
    foe.confused = 300; foe.weak = 300; shake = 10;
    fx('ring', f.x, f.y - f.h / 2, f.c.color, 6);
    fx('text', foe.x, foe.y - foe.h * foe.scale - 40, '???', f.c.color);
  } else if (M.cast === 'slam') {
    f.vy = -13; f.vx = dir * clamp(Math.abs(foe.x - f.x) / 34, 2, 7);
  }
}

function slamLand(f, foe) {
  shake = 14; cam.kick = 0.06; fx('flat', f.x, FLOOR, f.c.color); fx('dust', f.x, FLOOR, 16); fx('debris', f.x, FLOOR - 4, 12); sfx('heavy');
  if (hittable(foe) && foe.y >= FLOOR - 30 && Math.abs(foe.x - f.x) < 140 * f.scale) applyHit(f, foe, SLAM, foe.x > f.x ? 1 : -1, foe.x, FLOOR - 30);
}

function updateProjs() {
  for (const p of projs) {
    p.x += p.vx; p.t++; p.life--;
    const foe = P[1 - p.owner], b = hurtbox(foe);
    if (hittable(foe) && p.x + p.r > b.x1 && p.x - p.r < b.x2 && p.y + p.r > b.y1 && p.y - p.r < b.y2) {
      applyHit(P[p.owner], foe, Object.assign({ proj: 1 }, PROJ[p.kind]), Math.sign(p.vx), p.x, p.y); p.life = 0;
    }
    if (p.x < -60 || p.x > WW + 60) p.life = 0;
  }
  for (const a of projs) for (const b of projs)
    if (a.owner < b.owner && a.life > 0 && b.life > 0 && Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r) {
      a.life = b.life = 0; fx('impact', (a.x + b.x) / 2, a.y, '#fff', 1.4); sfx('block');
    }
  projs = projs.filter(p => p.life > 0);
}

function pushApart() {
  const [a, b] = P, min = (a.bw * a.scale + b.bw * b.scale) * 0.5, d = b.x - a.x;
  if (Math.abs(d) < min && Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.6 && !a.ko && !b.ko && a.kd < 2 && b.kd < 2) {
    const push = (min - Math.abs(d)) * (Math.sign(d) || 1), wa = a.c.kg * a.scale, wb = b.c.kg * b.scale;
    a.x -= push * wb / (wa + wb); b.x += push * wa / (wa + wb);
  }
  // fighters can't walk further apart than the screen
  const maxSep = W - 150, d2 = b.x - a.x;
  if (Math.abs(d2) > maxSep) { const ex = (Math.abs(d2) - maxSep) / 2 * Math.sign(d2); a.x += ex; b.x -= ex; }
}

// ---------- CPU ----------
function aiInput(f, foe) {
  const a = f.ai, i = { left: 0, right: 0, up: 0, down: 0, punch: 0, kick: 0, skill: 0, super: 0, dash: 0 };
  const d = Math.abs(foe.x - f.x), tw = foe.x > f.x ? 'right' : 'left', aw = tw === 'right' ? 'left' : 'right';
  if (a.mash > 0) { if (--a.mashT <= 0) { i.punch = 1; a.mash--; a.mashT = 7; } return i; }
  if (--a.t <= 0) {
    a.hold = {}; a.t = 6 + rand() * 12 | 0;
    const r = rand(), sk = f.c.skill.move, su = f.c.super.move;
    const incoming = projs.some(p => p.owner !== f.side && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 220);
    const threat = foe.move && MOVES[foe.move].dmg && d < 150;
    const superOk = su === 'force' ? d < 150 : su === 'presence' ? d < 320 : true;
    const skillOk = sk === 'wave' || sk === 'spiral' ? d > 160 : sk === 'mind' ? d > 130 : d < 280 && d > 60;
    const range = f.sw * 0.12 * f.scale + limbLen(f, 'arm') + foe.bw * 0.5 * foe.scale;
    if (foe.kd >= 2) { a.hold = r < 0.5 ? {} : { [aw]: 1 }; a.t = 20; }
    else if (incoming && r < 0.6) a.hold = r < 0.3 ? { up: 1, [tw]: 1 } : { down: 1 };
    else if (threat && r < 0.45) { a.hold = { down: 1 }; a.t = 14; }
    else if (f.meter >= SUPER_COST && superOk && r < 0.35) a.press = 'super';
    else if (f.meter >= SKILL_COST && skillOk && r < 0.2) a.press = 'skill';
    else if (d > 380 && r < 0.12) { i.dash = tw === 'right' ? 1 : -1; }
    else if (d > range) { a.hold = { [tw]: 1 }; if (r < 0.05) a.hold.up = 1; }
    else {
      const q = rand();
      const punchHigh = f.y - MOVES.jab.hy * f.h * f.scale + 22 * f.scale < foe.y - (foe.h * 0.85 + 28) * foe.scale + (14 + foe.h * 0.05) * foe.scale * 0.6;
      if (q < 0.28 && !punchHigh) { a.mash = 4; a.mashT = 0; }
      else if (q < 0.34) { a.press = 'punch'; a.hold = { down: 1 }; a.t = 4; }
      else if (q < 0.4) { a.press = 'punch'; a.hold = { [tw]: 1 }; a.t = 4; }
      else if (q < 0.46) { a.press = 'kick'; a.hold = { down: 1 }; a.t = 4; }
      else if (q < 0.52) { a.press = 'kick'; a.hold = { [tw]: 1 }; a.t = 4; }
      else if (q < 0.6) a.press = 'kick';
      else if (q < 0.7) { a.hold = { [aw]: 1 }; if (q < 0.64) i.dash = aw === 'right' ? 1 : -1; }
      else if (q < 0.84) a.hold = { down: 1 };
      else { a.hold = { up: 1, [tw]: 1 }; a.airKick = 1; }
    }
  }
  Object.assign(i, a.hold);
  if (a.press) { i[a.press] = 1; a.press = null; }
  if (a.airKick && f.y < FLOOR - 40 && f.vy > -4) { i.kick = 1; a.airKick = 0; }
  if (f.confused > 0 && rand() < 0.08) i[rand() < 0.5 ? 'punch' : 'kick'] = 1;
  return i;
}

// ---------- poses ----------
// angles: 0 = limb hanging straight down, positive = swung toward the way the fighter faces
const GUARD = { lean: 0.08, crouch: 0.06, fu: 0.45, fl: 2.45, bu: 0.2, bl: 2.65, ft: 0.28, fs: 0.02, bt: -0.22, bs: -0.3, ht: 0, rot: 0 };
const PK = Object.keys(GUARD);
const mk = o => Object.assign({}, GUARD, o);
function lp(a, b, t) { const o = {}; for (const k of PK) o[k] = lerp(a[k], b[k], t); return o; }
const POSES = {
  jump: mk({ ft: 1.2, fs: 0.15, bt: 0.35, bs: -0.7, fu: 0.9, fl: 2.3, bu: -0.3, bl: 0.7, lean: 0.02, crouch: 0 }),
  fall: mk({ ft: 0.5, fs: 0.1, bt: 0.0, bs: -0.4, fu: 1.2, fl: 2.0, bu: -0.6, bl: 0.2, lean: 0, crouch: 0 }),
  block: mk({ fu: 1.05, fl: 2.95, bu: 0.85, bl: 2.9, lean: -0.08, crouch: 0.18, ft: 0.4, fs: 0.1, bt: -0.4, bs: -0.35, ht: 0.15 }),
  high: mk({ lean: -0.45, ht: -0.45, fu: 0.0, fl: 0.6, bu: -0.5, bl: -0.1, crouch: 0.08, ft: 0.4, fs: 0.3, bt: -0.1, bs: -0.2 }),
  mid: mk({ lean: 0.5, ht: 0.35, fu: 0.9, fl: 1.3, bu: 0.7, bl: 1.2, crouch: 0.22 }),
  tumble: mk({ lean: -0.3, ht: -0.4, fu: 2.2, fl: 2.6, bu: 1.8, bl: 2.2, ft: 0.9, fs: 0.2, bt: 0.4, bs: 0.1, crouch: 0, rot: 0.9 }),
  lie: mk({ lean: 0, ht: -0.2, fu: 2.6, fl: 2.9, bu: 2.2, bl: 2.4, ft: 0.15, fs: 0.1, bt: -0.1, bs: -0.1, crouch: 0, rot: 1.5 }),
  rise: mk({ crouch: 0.45, lean: 0.35, fu: 0.9, fl: 1.4, bu: 0.4, bl: 0.6 }),
  hypno: mk({ lean: -0.15, ht: 0.3, fu: 0.1, fl: 0.2, bu: -0.1, bl: 0.1, crouch: 0.1 }),
  dashF: mk({ lean: 0.35, ft: 0.9, fs: 0.3, bt: -0.6, bs: -0.9, fu: 0.7, fl: 2.2, bu: -0.4, bl: 0.4 }),
  dashB: mk({ lean: -0.25, ft: 0.6, fs: 0.2, bt: -0.3, bs: -0.6, fu: 0.9, fl: 2.6, bu: 0.6, bl: 2.6 }),
};
// intro + victory poses, one per fighter
const SHOWPOSE = {
  julian: t => mk({ fu: 2.3, fl: 3.5 + Math.sin(t / 10) * 0.12, bu: 0.15, bl: 0.5, lean: -0.08, ht: -0.18, crouch: 0 }),
  ryan: t => { const hop = Math.abs(Math.sin(t / 8)); return mk({ fu: 2.8, fl: 3.0, bu: -2.6, bl: -2.9, crouch: 0.22 - hop * 0.22, ht: Math.sin(t / 8) * 0.2, lean: 0 }); },
  darren: t => mk({ fu: 0.55, fl: -1.3, bu: 0.35, bl: 1.6, lean: -0.06, ht: 0.12 + Math.sin(t / 20) * 0.1, crouch: 0 }),
  blake: t => mk({ fu: 0.45 + Math.sin(t / 5) * 0.2, fl: 1.15, bu: 0.3 - Math.sin(t / 5) * 0.15, bl: 1.0, lean: -0.18, ht: -0.12, crouch: 0.05 }),
  frank: t => { const fl = Math.sin(t / 12) * 0.18; return mk({ fu: 1.6, fl: 3.0 + fl, bu: -1.6, bl: -3.0 - fl, lean: 0, ht: -0.1, crouch: 0.1 }); },
};

function movePose(f) {
  const M = MOVES[f.move], wind = mk(M.wind), hit = mk(M.hit), t = f.mt;
  if (M.cast === 'slam') {
    if (!f.slamDone) return f.vy < 0 ? lp(wind, hit, ease(t / 8)) : mk(Object.assign({}, M.hit, { fu: 1.2, fl: 1.4, bu: 1.0, bl: 1.2 }));
    return lp(mk({ crouch: 0.45, lean: 0.25 }), GUARD, ease((t - (M.dur - 14)) / 14));
  }
  let p;
  if (t < M.start) p = lp(GUARD, wind, ease(t / M.start));
  else if (t <= M.end + 3) p = lp(wind, hit, ease((t - M.start + 1) / 2));
  else p = lp(hit, GUARD, ease((t - M.end - 3) / Math.max(1, M.dur - M.end - 3)));
  if (M.dash && t >= M.start && t <= M.end) {
    const s = Math.sin(t * 0.9);
    p.ft = 0.6 + 0.5 * s; p.bt = -0.3 - 0.5 * s; p.fs = p.ft - 0.5; p.bs = p.bt - 0.6;
  }
  return p;
}

function getPose(f) {
  if (f.kd === 1) return lp(POSES.tumble, POSES.lie, clamp(f.kdT / 30, 0, 1) * (f.bounced ? 1 : 0.6));
  if (f.kd === 2) return POSES.lie;
  if (f.kd === 3) { const k = ease(f.kdT / 26); return k < 0.5 ? lp(POSES.lie, POSES.rise, k * 2) : lp(POSES.rise, GUARD, k * 2 - 1); }
  if (cine && cine.kind === 'act' && cine.side === f.side && f.move) { const p = lp(GUARD, mk(MOVES[f.move].wind), ease(cine.t / 18)); p.ht += Math.sin(frame / 3) * 0.04; return p; }
  if (f.victory || f.intro) return SHOWPOSE[f.c.id](frame);
  if (f.stun > 0) {
    if (f.hypno > 0) { const p = mk(POSES.hypno); p.lean += Math.sin(frame / 10) * 0.15; p.ht = Math.sin(frame / 8) * 0.3; return p; }
    return lp(GUARD, POSES[f.hitType] || POSES.high, Math.min(1, f.stun / 6));
  }
  if (f.move) return movePose(f);
  if (f.dashT > 0) return f.dashDir === f.facing ? POSES.dashF : POSES.dashB;
  if (f.y < FLOOR) return lp(POSES.jump, POSES.fall, clamp((f.vy + 6) / 14, 0, 1));
  if (f.blocking) return POSES.block;
  const p = mk({}), bob = Math.sin(frame / 9 + f.side * 2);
  p.crouch += bob * 0.03; p.fl += bob * 0.05; p.bl += bob * 0.05; p.lean += bob * 0.015;
  if (Math.abs(f.vx) > 0.5) {
    const s = Math.sin(f.walkPh), c = Math.cos(f.walkPh), fwd = Math.sign(f.vx) === f.facing ? 1 : -1;
    p.ft = 0.05 + 0.5 * s; p.bt = 0.05 - 0.5 * s;
    p.fs = p.ft - 0.6 * Math.max(0, c); p.bs = p.bt - 0.6 * Math.max(0, -c);
    p.lean += 0.08 * fwd; p.fu += 0.1 * s; p.crouch = 0.04;
  }
  return p;
}

// ---------- heads: photo face mapped onto a shaded 3D head ----------
function drawHead(c, x, y, r, flip, tilt) {
  const rx = r * 0.86, ry = r * 1.04, fr = flip ? -1 : 1;
  ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
  // hair mass behind the head
  ctx.fillStyle = c.hair;
  if (c.longHair) { ctx.beginPath(); ctx.roundRect(-fr * rx * 0.95 - rx * 0.5, -ry * 0.4, rx * 1.3, ry * 1.85, rx * 0.5); ctx.fill(); }
  if (c.locs) for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.roundRect(-fr * rx * (0.2 + i * 0.12) - 3, -ry * 0.6, 6, ry * 1.4, 3); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(-fr * rx * 0.1, -ry * 0.08, rx * 1.06, ry * 1.03, 0, 0, 7); ctx.fill();
  if (c.curls) for (let i = 0; i < 8; i++) { const a = -Math.PI * 0.95 + i * 0.36; ctx.beginPath(); ctx.arc(Math.cos(a) * rx * 0.98 - fr * rx * 0.08, Math.sin(a) * ry * 0.98 - ry * 0.05, r * 0.24, 0, 7); ctx.fill(); }
  // face
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.clip();
  ctx.fillStyle = c.skin; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  if (ready(c.img)) { ctx.save(); ctx.scale(fr, 1); ctx.drawImage(c.img, -rx * 1.12, -ry * 1.1, rx * 2.24, ry * 2.2); ctx.restore(); }
  // spherical shading: light from above, in front
  const g = ctx.createRadialGradient(fr * rx * 0.35, -ry * 0.45, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, 'rgba(255,240,225,0.18)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,0,20,0.55)');
  ctx.fillStyle = g; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  ctx.restore();
  // rim light on the back of the head
  ctx.strokeStyle = rgba(c.color, 0.85); ctx.lineWidth = Math.max(1.5, r / 10);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, flip ? -0.9 : Math.PI - 0.9, flip ? 0.9 : Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}
// a framed portrait for menus and the HUD
function drawPortrait(c, x, y, r, flip) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#140c1a'; ctx.fill(); ctx.clip();
  const g = ctx.createRadialGradient(x, y - r * 0.3, 2, x, y, r); g.addColorStop(0, rgba(c.color, 0.6)); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  drawHead(c, x, y + r * 0.08, r * 0.82, flip, 0);
  ctx.restore();
  ctx.strokeStyle = c.color; ctx.lineWidth = Math.max(2, r / 10); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
}

// ---------- bodies ----------
function drawFighter(f, gx, gy, ghost) {
  const c = f.c, B = f.b, s = f.scale, h = f.h * s, dir = f.facing, p = Object.assign({}, getPose(f));
  const legL = h * 0.46, th = legL * 0.52, sh = legL * 0.5, torso = h * 0.29, ua = h * 0.17 * B.arm, la = h * 0.16 * B.arm;
  const r = (14 + f.h * 0.05) * s, lw = f.lw * s, sw = f.sw * s, OUT = shade(c.color, 0.6);
  const shoW = sw * B.shoulder, waistW = sw * B.waist;
  const aw1 = lw * 0.95 * B.armW, aw2 = lw * 0.8 * B.armW, lg1 = lw * 1.1 * B.legW, lg2 = lw * 0.88 * B.legW;
  const moving = Math.abs(f.vx) > 0.5 || f.stun > 0 || f.kd === 1;
  const jig = B.belly ? Math.sin(frame / 3.2) * (moving ? 3.5 : 0.8) * s : 0;
  if (f.victory && f.c.id === 'ryan') { /* small hop */ gy -= Math.abs(Math.sin(frame / 8)) * 14; }
  p.ft += p.crouch; p.fs -= p.crouch; p.bt += p.crouch * 0.6; p.bs -= p.crouch * 1.2;
  const depth = (a, b) => th * Math.cos(a) + sh * Math.cos(b);
  const onGround = gy >= FLOOR - 0.5;
  const hipY = (onGround ? -Math.max(depth(p.ft, p.fs), depth(p.bt, p.bs)) : -legL * 0.95) - lg2 * 0.3;
  const X = (a, len) => dir * Math.sin(a) * len, Y = (a, len) => Math.cos(a) * len;

  ctx.save();
  ctx.translate(gx, gy);
  // knockdowns rotate the body around the hips so it falls flat
  if (p.rot) { ctx.rotate(-dir * p.rot); ctx.translate(0, -lw * 0.45 * p.rot / 1.5); }
  ctx.globalAlpha = ghost || (f.vanish > 0 ? 0.3 : 1);
  if (!ghost && f.flash > 0) ctx.filter = 'brightness(2.4)';
  else if (!ghost && f.armor > 0) ctx.filter = 'saturate(0.35) brightness(1.25)';
  if (!ghost && f.flow > 0) { ctx.shadowColor = c.color; ctx.shadowBlur = 16; }
  ctx.lineCap = ctx.lineJoin = 'round';

  const line = (x1, y1, x2, y2, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const blob = (x, y, rx, ry, col, rot) => {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), rot || 0, 0, 7); ctx.fill(); ctx.stroke();
  };
  const limb = (x0, y0, a1, l1, a2, l2, w1, w2, col, bulge, bulge2) => {
    const x1 = x0 + X(a1, l1), y1 = y0 + Y(a1, l1), x2 = x1 + X(a2, l2), y2 = y1 + Y(a2, l2);
    const r1 = Math.atan2(y1 - y0, x1 - x0), r2 = Math.atan2(y2 - y1, x2 - x1);
    const lumps = (pad, fill) => {
      ctx.fillStyle = fill; ctx.beginPath();
      if (bulge) ctx.ellipse(lerp(x0, x1, 0.48), lerp(y0, y1, 0.48), l1 * 0.34 + pad, w1 * bulge + pad, r1, 0, 7);
      ctx.fill(); ctx.beginPath();
      if (bulge2) ctx.ellipse(lerp(x1, x2, 0.3), lerp(y1, y2, 0.3), l2 * 0.28 + pad, w2 * bulge2 + pad, r2, 0, 7);
      ctx.fill();
    };
    line(x0, y0, x1, y1, w1 + 4, OUT); line(x1, y1, x2, y2, w2 + 4, OUT); lumps(2, OUT);
    line(x0, y0, x1, y1, w1, col); line(x1, y1, x2, y2, w2, col); lumps(0, col);
    // highlight along the top edge of the limb
    ctx.globalAlpha *= 0.12; line(x0 - 1, y0 - w1 * 0.2, x1 - 1, y1 - w1 * 0.2, w1 * 0.25, '#ffffff'); ctx.globalAlpha /= 0.12;
    return { x: x2, y: y2 };
  };
  const fist = (e, col) => blob(e.x, e.y, aw2 * 0.62, aw2 * 0.62, col);
  const shoe = (e, col) => blob(e.x + dir * lg2 * 0.35, e.y + lg2 * 0.15, lg2 * 0.8, lg2 * 0.42, col);
  const armB = B.muscle ? 0.64 : B.belly ? 0.58 : 0, foreB = B.muscle ? 0.58 : 0, legB = B.muscle ? 0.58 : B.belly ? 0.6 : 0;

  const hip = { x: 0, y: hipY };
  const ux = dir * Math.sin(p.lean), uy = -Math.cos(p.lean);
  const sho = { x: hip.x + ux * torso, y: hip.y + uy * torso };
  const n = { x: -uy, y: ux };
  const along = (t, o, w) => ({ x: hip.x + ux * torso * t + n.x * w * o, y: hip.y + uy * torso * t + n.y * w * o });
  const armCol = c.sleeves ? c.shirt : c.skin;
  const legOff = waistW * (B.belly ? 0.26 : 0.16);

  const bA = limb(sho.x - dir * shoW * 0.3, sho.y + 4 * s, p.bu, ua, p.bl, la, aw1, aw2, shade(armCol, 0.72), armB, foreB);
  fist(bA, shade(c.skin, 0.8));
  const bL = limb(hip.x - dir * legOff, hip.y, p.bt, th, p.bs, sh, lg1, lg2, shade(c.pants, 0.75), legB);
  shoe(bL, shade(c.shoes, 0.8));
  if (B.belly) { const bt = along(0.08, 0, 0); blob(bt.x - dir * waistW * 0.34, bt.y + 2, waistW * 0.42, torso * 0.36, c.pants); }

  // torso
  ctx.beginPath();
  ctx.moveTo(hip.x + n.x * waistW / 2, hip.y + n.y * waistW / 2);
  ctx.lineTo(sho.x + n.x * shoW / 2, sho.y + n.y * shoW / 2);
  ctx.lineTo(sho.x - n.x * shoW / 2, sho.y - n.y * shoW / 2);
  ctx.lineTo(hip.x - n.x * waistW / 2, hip.y - n.y * waistW / 2);
  ctx.closePath();
  ctx.strokeStyle = OUT; ctx.lineWidth = 12 * s; ctx.stroke();
  ctx.fillStyle = c.shirt; ctx.strokeStyle = c.shirt; ctx.lineWidth = 8 * s; ctx.fill(); ctx.stroke();
  // torso lighting
  const tg = ctx.createLinearGradient(sho.x, sho.y, hip.x, hip.y);
  tg.addColorStop(0, 'rgba(255,255,255,0.14)'); tg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = tg; ctx.fill();

  if (B.belly) {
    const bc = along(0.3, 0, 0), bx = bc.x + dir * waistW * 0.4, by = bc.y + jig;
    const rx = waistW * 0.72, ry = torso * 0.64;
    blob(bx, by, rx, ry, c.shirt);
    const bg2 = ctx.createRadialGradient(bx + dir * rx * 0.3, by - ry * 0.4, 2, bx, by, rx);
    bg2.addColorStop(0, 'rgba(255,255,255,0.25)'); bg2.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, 7); ctx.fill();
    blob(bx + dir * rx * 0.08, by + ry * 0.78, rx * 0.72, ry * 0.3, c.skin);
    ctx.fillStyle = shade(c.skin, 0.6); ctx.beginPath(); ctx.arc(bx + dir * rx * 0.3, by + ry * 0.78, 2 * s, 0, 7); ctx.fill();
    const ch = along(0.82, 0, 0);
    ctx.strokeStyle = shade(c.shirt, 0.7); ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(ch.x + dir * shoW * 0.12, ch.y + 4 * s, shoW * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  if (B.muscle) {
    const top = along(0.92, 0, 0);
    blob(top.x + dir * shoW * 0.08, top.y + 3 * s, shoW * 0.2, torso * 0.12, c.skin);
    ctx.strokeStyle = shade(c.shirt, 1.9); ctx.lineWidth = 2 * s;
    const pc = along(0.66, 0, 0);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(pc.x + n.x * shoW * 0.2 * k, pc.y + n.y * shoW * 0.2 * k, shoW * 0.2, 0.25, Math.PI - 0.25); ctx.stroke(); }
    const a5 = along(0.5, 0, 0), a1 = along(0.15, 0, 0);
    ctx.beginPath(); ctx.moveTo(a5.x, a5.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
    line(sho.x - n.x * shoW * 0.35, sho.y - n.y * shoW * 0.35 + 2, sho.x + ux * r * 0.6, sho.y + uy * r * 0.6, lw * 0.9, c.skin);
    line(sho.x + n.x * shoW * 0.35, sho.y + n.y * shoW * 0.35 + 2, sho.x + ux * r * 0.6, sho.y + uy * r * 0.6, lw * 0.9, c.skin);
  }
  if (c.spots) {
    ctx.fillStyle = '#16161c';
    [[0.25, 0.2], [0.55, -0.25], [0.8, 0.15], [0.45, 0.3], [0.15, -0.3]].forEach(([t, o]) =>
      { const q = along(t, o, lerp(waistW, shoW, t)); ctx.beginPath(); ctx.arc(q.x, q.y, sw * 0.1, 0, 7); ctx.fill(); });
  }
  if (!B.belly) {
    ctx.strokeStyle = shade(c.pants, 0.6); ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(hip.x + n.x * waistW / 2, hip.y + n.y * waistW / 2 - 2); ctx.lineTo(hip.x - n.x * waistW / 2, hip.y - n.y * waistW / 2 - 2); ctx.stroke();
  }
  if (c.chain) {
    ctx.strokeStyle = c.chain; ctx.lineWidth = 2.5 * s; ctx.beginPath();
    ctx.moveTo(sho.x + n.x * shoW * 0.2, sho.y + n.y * shoW * 0.2);
    ctx.lineTo(sho.x - ux * torso * 0.38 + dir * 3, sho.y - uy * torso * 0.38);
    ctx.lineTo(sho.x - n.x * shoW * 0.2, sho.y - n.y * shoW * 0.2); ctx.stroke();
  }

  const fL = limb(hip.x + dir * legOff, hip.y, p.ft, th, p.fs, sh, lg1, lg2, c.pants, legB);
  shoe(fL, c.shoes);
  if (c.sword) drawSword(f, { x: hip.x + dir * waistW * 0.35, y: hip.y + 2 * s }, Math.PI / 2 + 0.25 + Math.sin(frame / 7) * 0.05, h, dir, s);

  const hc = { x: sho.x + ux * r * 0.95 + dir * r * 0.12, y: sho.y + uy * r * 0.95 };
  const neckW = lw * (B.muscle ? 1.3 : B.belly ? 1.2 : 0.7);
  line(sho.x, sho.y, hc.x, hc.y, neckW + 4, OUT); line(sho.x, sho.y, hc.x, hc.y, neckW, c.skin);
  ctx.save(); ctx.filter = 'none'; ctx.shadowBlur = 0;
  drawHead(c, hc.x, hc.y, r, dir < 0, p.ht * dir);
  ctx.restore();

  const fS = { x: sho.x + dir * shoW * 0.3, y: sho.y + 4 * s };
  const big = f.move === 'force' ? 1.2 : 1;
  const fA = limb(fS.x, fS.y, p.fu, ua, p.fl, la, aw1 * big, aw2 * big, armCol, armB, foreB);
  if (B.muscle || B.belly) blob(fS.x, fS.y, aw1 * 0.72, aw1 * 0.66, armCol);
  fist(fA, c.skin);
  ctx.restore();
  if (!ghost) f._head = { x: gx + hc.x, y: gy + hc.y, r };
}

// Ryan's sword: sticks out forward from his hips
function drawSword(f, hand, ang, h, dir, s) {
  const len = 0.42 * f.h * s, dx = dir * Math.sin(ang), dy = Math.cos(ang), nx = -dy, ny = dx;
  const tip = { x: hand.x + dx * len, y: hand.y + dy * len };
  const M = f.move && MOVES[f.move];
  if (M && M.limb === 'sword' && f.mt >= M.start - 1 && f.mt <= M.end + 4) {
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.strokeStyle = '#d9a6ff'; ctx.lineWidth = 10 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hand.x, hand.y, len * 0.9, Math.atan2(dy, dx) - dir * 0.9, Math.atan2(dy, dx), dir < 0); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.lineCap = 'round';
  ctx.shadowColor = '#b44dff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#e8ecf5'; ctx.strokeStyle = '#5a5a70'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hand.x + nx * 3.5 * s, hand.y + ny * 3.5 * s); ctx.lineTo(tip.x, tip.y); ctx.lineTo(hand.x - nx * 3.5 * s, hand.y - ny * 3.5 * s);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(lerp(hand.x, tip.x, 0.9), lerp(hand.y, tip.y, 0.9)); ctx.stroke();
  ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo(hand.x + nx * 9 * s, hand.y + ny * 9 * s); ctx.lineTo(hand.x - nx * 9 * s, hand.y - ny * 9 * s); ctx.stroke();
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x - dx * 10 * s, hand.y - dy * 10 * s); ctx.stroke();
  ctx.restore();
}

function drawStatus(f) {
  if (!f._head || f.ko || f.kd >= 1) return;
  const { x, y, r } = f._head, t = frame;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (f.confused > 0) {
    ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#f5c518';
    for (let i = 0; i < 3; i++) { const a = t / 12 + i * 2.1; ctx.fillText('?', x + Math.cos(a) * r * 1.3, y - r * 1.3 + Math.sin(a) * 6); }
  }
  if (f.hypno > 0) {
    ctx.strokeStyle = '#b44dff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a < 12; a += 0.3) ctx.lineTo(x + Math.cos(a + t / 5) * a * 1.4, y - r * 1.6 + Math.sin(a + t / 5) * a * 0.6);
    ctx.stroke();
  } else if (f.stun > 14) {
    ctx.fillStyle = '#ffe14d'; ctx.font = '14px sans-serif';
    for (let i = 0; i < 3; i++) { const a = t / 8 + i * 2.1; ctx.fillText('★', x + Math.cos(a) * r * 1.2, y - r * 1.2 + Math.sin(a) * 5); }
  }
  if (!demo && !matchOver) {
    const tag = f.ai ? 'CPU' : mode === 'online' ? (f.side === mySlot() ? 'YOU' : 'P' + (f.side + 1)) : 'P' + (f.side + 1);
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = f.c.color;
    ctx.fillText(tag, x, y - r - 26);
    ctx.beginPath(); ctx.moveTo(x - 5, y - r - 18); ctx.lineTo(x + 5, y - r - 18); ctx.lineTo(x, y - r - 12); ctx.fill();
  }
  ctx.restore();
}

function drawProj(p) {
  ctx.save(); ctx.translate(p.x, p.y); const d = Math.sign(p.vx);
  if (p.kind === 'wave') {
    ctx.scale(d, 1); ctx.shadowColor = '#3b8cff'; ctx.shadowBlur = 18;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#bfe0ff', '#3b8cff', '#1a4fb0'][i]; ctx.lineWidth = 6 - i;
      ctx.beginPath(); ctx.arc(-i * 9, 0, p.r - i * 2, -1.3, 1.3); ctx.stroke();
    }
    ctx.fillStyle = '#e6f3ff';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-12 - rand() * 20, (rand() - 0.5) * p.r * 1.6, 2, 0, 7); ctx.fill(); }
  } else {
    ctx.rotate(p.t * 0.25); ctx.shadowColor = '#b44dff'; ctx.shadowBlur = 16; ctx.strokeStyle = '#e0b3ff'; ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.25) ctx.lineTo(Math.cos(a + k * Math.PI) * a * p.r / 9, Math.sin(a + k * Math.PI) * a * p.r / 9); ctx.stroke(); }
    ctx.strokeStyle = '#b44dff'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

function drawFighters() {
  for (const f of P) {
    if (f.big > 0) {
      ctx.save(); ctx.strokeStyle = '#b44dff'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(frame / 8); ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 4, 230, 26, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    const lift = clamp((FLOOR - f.y) / 200, 0, 0.7), lying = f.kd === 2 || f.kd === 3 || (f.kd === 1 && f.bounced);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(f.x - (lying ? f.facing * f.h * 0.4 : 0), FLOOR + 4, (lying ? f.h * 0.55 : f.bw * 0.75) * f.scale * (1 - lift * 0.5), 6, 0, 0, 7); ctx.fill();
  }
  for (const f of P) f.trail.forEach((t, i) => drawFighter(f, t.x, t.y, 0.1 + i * 0.05));
  const order = P[0].move && !P[1].move ? [P[1], P[0]] : [P[0], P[1]];
  for (const f of order) drawFighter(f, f.x, f.y, 0);
  for (const f of P) drawStatus(f);
}
