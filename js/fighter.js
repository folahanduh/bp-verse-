// ---------- moves, fighters, physics, CPU, poses, drawing ----------
// frames at 60fps; limb moves reach as far as the fighter's arm/leg; wind/hit are key poses; kd = knockdown
const MOVES = {
  jab:  { dur: 16, start: 5, end: 8, dmg: 6, limb: 'arm', rm: 1.0, hy: 0.74, kb: 3, stun: 15, hs: 4, chain: 'jab2', step: 2.2,
          wind: { fu: 0.75, fl: 2.0, lean: 0.02, tw: -0.12, lunge: -0.01 }, hit: { fu: 1.55, fl: 1.57, lean: 0.2, bu: 0.4, bl: 2.6, tw: 0.38, lunge: 0.06, ht: 0.06 } },
  jab2: { dur: 17, start: 4, end: 7, dmg: 6, limb: 'arm', rm: 1.0, hy: 0.74, kb: 3, stun: 15, hs: 4, chain: 'hook', step: 2.4,
          wind: { bu: 0.6, bl: 2.0, lean: 0.08, tw: 0.18 }, hit: { bu: 1.55, bl: 1.57, lean: 0.32, fu: 0.3, fl: 2.4, tw: -0.6, hzb: 0.25, lunge: 0.08, ht: 0.08 } },
  hook: { dur: 28, start: 8, end: 12, dmg: 10, limb: 'arm', rm: 1.05, hy: 0.76, kb: 6, stun: 26, hs: 8, heavy: 1, chain: 'upper', step: 2.6,
          wind: { fu: 0.5, fl: 1.4, lean: -0.12, crouch: 0.14, tw: -0.5, hz: 0.7, lunge: -0.02 }, hit: { fu: 1.5, fl: 1.65, lean: 0.36, tw: 0.75, hz: 1, lunge: 0.07, crouch: 0.06 } },
  // finisher of the 4-hit punch string, also down + punch: launches
  upper: { dur: 30, start: 9, end: 14, dmg: 11, limb: 'arm', rm: 0.98, hy: 0.68, hh: 0.27, kb: 4, stun: 30, hs: 9, launch: -13, heavy: 1, kd: 1, step: 3,
          wind: { crouch: 0.4, fu: 0.15, fl: 0.9, lean: 0.12, bu: 0.3, bl: 2.4, tw: -0.35, lunge: -0.02 }, hit: { fu: 2.5, fl: 2.95, crouch: -0.04, lean: -0.14, ht: -0.18, bu: 0.1, bl: 1.2, tw: 0.4, lunge: 0.05 } },
  // forward + punch: hook to the body
  bodyhook: { dur: 24, start: 7, end: 11, dmg: 9, limb: 'arm', rm: 0.9, hy: 0.52, kb: 5, stun: 24, hs: 7, chain: 'upper', step: 2.6,
          wind: { fu: 0.2, fl: 1.2, lean: -0.08, crouch: 0.18, tw: -0.5, hz: 0.55 }, hit: { fu: 1.15, fl: 1.75, lean: 0.4, crouch: 0.26, tw: 0.65, hz: 0.85, lunge: 0.07 } },
  // Ryan's forward + punch: hip-first lunge with the sword
  thrust: { dur: 30, start: 9, end: 15, dmg: 12, limb: 'sword', rm: 1.0, hy: 0.4, kb: 8, stun: 26, hs: 8, dash: 6,
          wind: { lean: -0.2, crouch: 0.25, fu: 0.6, fl: 2.2, bu: -0.4, bl: 0.4 }, hit: { lean: -0.4, crouch: 0.08, ft: 0.85, fs: 0.3, bt: -0.6, bs: -0.95, fu: -0.5, fl: 0.2, bu: -0.8, bl: -0.2 } },
  // down + kick: low sweep, knocks down
  sweep: { dur: 32, start: 10, end: 15, dmg: 8, limb: 'leg', rm: 1.0, hy: 0.06, kb: 3, stun: 20, hs: 7, launch: -4, kd: 1,
          wind: { crouch: 0.45, lean: 0.25, ft: 0.6, fs: 0.2, tw: -0.35 }, hit: { crouch: 0.55, lean: 0.35, ft: 1.35, fs: 1.55, bt: -0.25, bs: -1.4, fu: 0.9, fl: 0.4, bu: -0.3, bl: 0.2, tw: 0.5 } },
  // forward + kick: heavy roundhouse to the head
  round: { dur: 36, start: 14, end: 18, dmg: 12, limb: 'leg', rm: 1.05, hy: 0.72, kb: 10, stun: 26, hs: 9, launch: -6, heavy: 1, kd: 1, step: 1.6,
          wind: { ft: 1.3, fs: 0.1, lean: -0.25, crouch: 0.1, fu: 0.9, fl: 2.6, tw: -0.6 }, hit: { ft: 2.05, fs: 2.15, lean: -0.55, bt: -0.1, bs: -0.1, fu: 0.5, fl: 1.4, bu: -0.7, bl: -0.3, tw: 0.95, lunge: 0.03 } },
  kick: { dur: 28, start: 10, end: 14, dmg: 10, limb: 'leg', rm: 1.0, hy: 0.46, kb: 7, stun: 20, hs: 6, step: 1.3,
          wind: { ft: 1.7, fs: 0.15, lean: -0.12, bt: -0.05, bs: -0.05, tw: -0.25, fu: 0.7, fl: 2.4 },
          hit: { ft: 1.5, fs: 1.55, lean: -0.35, bt: -0.08, bs: -0.08, fu: 0.4, fl: 1.2, bu: -0.5, bl: -0.1, tw: 0.35, lunge: 0.04 } },
  akick: { dur: 26, start: 5, end: 16, dmg: 9, limb: 'leg', rm: 0.85, hy: 0.3, kb: 6, stun: 18, hs: 6, air: 1,
          wind: { ft: 1.2, fs: 0.0, bt: 0.3, bs: -1.0 }, hit: { ft: 0.95, fs: 0.95, bt: -0.1, bs: -1.3, lean: -0.2, fu: 1.0, fl: 2.4 } },
  // Frank's skill: arcing basketball
  ball:   { dur: 30, start: 12, end: 14, cast: 'proj', proj: 'ball',
            wind: { fu: 2.7, fl: 3.3, bu: 0.3, bl: 1.2, lean: -0.18, crouch: 0.15, tw: -0.5 }, hit: { fu: 1.9, fl: 1.9, lean: 0.25, bu: -0.3, bl: 0.3, tw: 0.55, lunge: 0.04 } },
  // Blake's skill: goes furry and rakes three times
  scratch: { dur: 44, start: 8, end: 28, hits: [[8, 11], [16, 19], [24, 28]], dmg: 7, limb: 'arm', rm: 1.2, hy: 0.62, kb: 3, stun: 18, hs: 5, claw: 1, dash: 2.5,
            wind: { fu: 2.4, fl: 2.9, bu: 2.0, bl: 2.7, crouch: 0.2, lean: 0.1 }, hit: { fu: 1.1, fl: 0.8, bu: 0.9, bl: 0.5, lean: 0.45, crouch: 0.12 } },
  wave:   { dur: 32, start: 12, end: 14, cast: 'proj', proj: 'wave',
            wind: { fu: -0.4, fl: 0.6, bu: -0.5, bl: 0.5, lean: -0.15, crouch: 0.16, tw: -0.4, lunge: -0.03 }, hit: { fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.28, tw: 0.3, lunge: 0.07 } },
  spiral: { dur: 32, start: 12, end: 14, cast: 'proj', proj: 'spiral',
            wind: { fu: 2.5, fl: 2.9, bu: 2.3, bl: 2.8, lean: -0.12, crouch: 0.08 }, hit: { fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.28, lunge: 0.06 } },
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
  // Clavicular: a stunning stare, and a golden glow-up
  stare:  { dur: 30, start: 12, end: 14, cast: 'proj', proj: 'stare',
            wind: { ht: 0.28, lean: -0.06, fu: 0.3, fl: 2.7, bu: 0.15, bl: 2.6, tw: -0.25 }, hit: { ht: -0.18, lean: 0.14, fu: 0.45, fl: 2.4, tw: 0.2, lunge: 0.03 } },
  ascend: { dur: 34, start: 14, end: 16, cast: 'buff', buff: 'asc', time: 420,
            wind: { crouch: 0.3, fu: 0.3, fl: 1.0, bu: 0.3, bl: 1.0 }, hit: { fu: 2.6, fl: 3.1, bu: 2.4, bl: 2.9, lean: -0.2, ht: -0.3 } },
  // stage items: smash it over the opponent up close, or throw it
  envsmash: { dur: 34, start: 13, end: 17, dmg: 15, limb: 'arm', rm: 1.3, hy: 0.72, hh: 0.32, kb: 12, stun: 30, hs: 12, heavy: 1, kd: 1, launch: -8, wall: 1, step: 2.4, prop: 1,
            wind: { fu: 2.8, fl: 3.3, bu: 2.6, bl: 3.2, lean: -0.25, tw: -0.4, crouch: 0.05 }, hit: { fu: 1.25, fl: 1.0, bu: 1.15, bl: 0.9, lean: 0.5, tw: 0.4, lunge: 0.08, crouch: 0.15 } },
  envthrow: { dur: 30, start: 12, end: 14, cast: 'proj', proj: 'prop', prop: 1,
            wind: { fu: 2.8, fl: 3.3, bu: 0.4, bl: 1.2, lean: -0.22, tw: -0.55, crouch: 0.1 }, hit: { fu: 1.6, fl: 1.6, bu: -0.2, bl: 0.4, lean: 0.3, tw: 0.55, lunge: 0.06 } },
  rush:   { dur: 32, start: 6, end: 22, dmg: 12, reach: 26, hy: 0.65, kb: 13, stun: 26, hs: 8, heavy: 1, dash: 11, kd: 1, wall: 1, launch: -5,
            wind: { crouch: 0.28, lean: 0.3, tw: -0.3 }, hit: { lean: 0.58, fu: 0.3, fl: 2.7, bu: -0.4, bl: 0.3, tw: 0.4, lunge: 0.08 } },
  force:  { dur: 52, start: 26, end: 32, dmg: 26, reach: 125, hy: 0.75, kb: 22, stun: 40, hs: 14, launch: -10, heavy: 1, armor: 1, superHit: 1, kd: 1, wall: 1,
            wind: { fu: -0.7, fl: 0.3, lean: -0.3, crouch: 0.24, bu: 0.8, bl: 2.4, tw: -0.75, lunge: -0.04 }, hit: { fu: 1.57, fl: 1.57, lean: 0.48, crouch: 0.12, tw: 0.8, lunge: 0.11 } },
};
const PROJ = {
  wave:   { speed: 9, r: 20, dmg: 9, kb: 6, stun: 18, hs: 6 },
  spiral: { speed: 6, r: 17, dmg: 6, kb: 2, stun: 70, hs: 6, hypno: 1 },
  ball:   { speed: 8.5, r: 13, dmg: 11, kb: 7, stun: 22, hs: 7, arc: 1 },
  prop:   { speed: 11, r: 15, dmg: 12, kb: 9, stun: 26, hs: 9, arc: 1, heavy: 1 },
  stare:  { speed: 15, r: 11, dmg: 7, kb: 2, stun: 56, hs: 6, eye: 1 },
};
// ---------- stage items: press the ENV button (V) next to one ----------
const PROPS = { club: [[250, 'speaker'], [1250, 'bottle']], garden: [[290, 'brick'], [1210, 'brick']], roof: [[270, 'pipe'], [1230, 'vent']], verse: [[300, 'can'], [1180, 'hoopball']],
  hall: [[270, 'vase'], [1230, 'extinguisher']], court: [[300, 'hoopball'], [1200, 'can']], subway: [[260, 'extinguisher'], [1240, 'can']], alley: [[280, 'bottle'], [1220, 'pipe']],
  gym: [[260, 'dumbbell'], [1240, 'stool']], penthouse: [[280, 'vase'], [1220, 'bottle']], junkyard: [[270, 'tire'], [1230, 'pipe']], beach: [[300, 'cooler'], [1200, 'can']],
  temple: [[280, 'lantern'], [1220, 'brick']], garage: [[260, 'cone'], [1240, 'tire']] };
const PROP_NAMES = { speaker: 'SPEAKER', bottle: 'BOTTLE', brick: 'BRICK', pipe: 'PIPE', vent: 'VENT COVER', can: 'TRASH CAN', hoopball: 'BASKETBALL', vase: 'VASE', extinguisher: 'EXTINGUISHER',
  dumbbell: 'DUMBBELL', stool: 'STOOL', tire: 'TYRE', cooler: 'COOLER', lantern: 'LANTERN', cone: 'TRAFFIC CONE' };
const BOUNCY = { hoopball: 1, can: 1, tire: 1, cone: 1, cooler: 1 };
let props = [];
function resetProps() { props = (PROPS[STAGES[stageId] && STAGES[stageId].id] || []).map(([x, kind]) => ({ x, kind, cd: 0 })); }
const nearProp = f => props.find(p => p.cd <= 0 && Math.abs(p.x - f.x) < 110);
function shatter(kind, x, y) { fx('debris', x, y, 14); fx('sparks', x, y, kind === 'bottle' ? '#9fe3b0' : '#ffffff', 10); fx('dust', x, Math.min(FLOOR, y + 20), 8); sfx('brk'); }
const SLAM = { dmg: 13, kb: 9, stun: 28, hs: 9, launch: -8, heavy: 1, kd: 1 };
const SKILL_COST = 25, SUPER_COST = 100; // meter is 4 bars of 25

function makeFighter(ci, side, skin) {
  const c = CHARS[ci];
  return {
    ci, c, side, skin: skin || 0, seq: [], comboName: '', comboNameT: 0, furT: 0, hitN: -1, x: WW / 2 + (side ? 230 : -230), y: FLOOR, vx: 0, vy: 0, facing: side ? -1 : 1,
    // height drives size and reach; weight drives width, knockback and power
    h: (c.inches - 40) * 3.2 + 30, sw: 22 + c.kg * 0.17, lw: 9 + c.kg * 0.05, b: c.build,
    bw: (22 + c.kg * 0.17) * Math.max(c.build.shoulder, c.build.waist * (c.build.belly ? 1.45 : 1)),
    maxHp: Math.round((70 + c.dur * 0.7) * (c.build.hp || 1) * 1.5), hp: 0, dispHp: 0, bar: 0, barAnim: 0,
    speed: (2.3 + c.spd / 30) * c.build.mob, power: (0.6 + c.str / 250) * Math.pow(c.kg / 80, 0.15) * (c.build.dmg || 1),
    kbMul: Math.sqrt(80 / c.kg), atkSpd: c.build.atk, meterMul: c.hax / 85 * 0.8, // HAX = how fast abilities charge
    move: null, mt: 0, hitDone: false, slamDone: false, stun: 0, hitType: 'high', blocking: false, buf: {}, prevInp: {},
    meter: 0, flow: 0, big: 0, armor: 0, confused: 0, weak: 0, hypno: 0, dodgeCd: 0, vanish: 0, flash: 0,
    kd: 0, kdT: 0, bounced: false, bt0: 0, spin: 0, juggle: 0, wallHit: false, dashT: 0, dashDir: 0,
    scale: 1, combo: 0, comboT: 0, comboDmg: 0, ko: false, victory: false, intro: false, walkPh: 0, trail: [], ai: null,
  };
}
const TIMERS = ['flow', 'big', 'armor', 'confused', 'weak', 'hypno', 'dodgeCd', 'vanish', 'flash', 'barAnim', 'comboNameT', 'furT', 'asc'];

function hurtbox(f) {
  const s = f.scale, top = (f.h * 0.85 + 28) * s; // legs + torso + head
  return { x1: f.x - f.bw * 0.5 * s, x2: f.x + f.bw * 0.5 * s, y1: f.y - top, y2: f.y };
}
const hittable = f => !f.ko && !f.gone && f.vanish <= 0 && f.kd < 2 && !(f.kd === 1 && f.juggle >= 3) && !(f.dazed && finish && finish.t < 45);
// how far a punch/kick reaches from the body centre: taller fighters and longer arms hit from further
const limbLen = (f, limb) => (limb === 'arm' ? 0.33 * f.h * f.b.arm : limb === 'sword' ? 0.5 * f.h : 0.46 * f.h) * f.scale;

function startMove(f, id) {
  f.move = id; f.mt = 0; f.hitDone = false; f.slamDone = false; f.dashT = 0; f.hitN = -1;
  if (id === 'scratch') f.furT = 110;
  if (MOVES[id].dmg) sfx('whoosh');
}
// which attack a button makes, from the direction held
function pickAttack(f, b, inp, ground) {
  const fwd = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) === f.facing;
  if (!ground) return 'akick';
  if (b === 'punch') return inp.down ? 'upper' : fwd ? (f.c.sword ? 'thrust' : 'bodyhook') : 'jab';
  return inp.down ? 'sweep' : fwd ? 'round' : 'kick';
}
function checkCombo(f) {
  let best = null;
  for (const [name, seq] of COMBOS) {
    if (seq.length > f.seq.length || (best && seq.length <= best[1].length)) continue;
    if (seq.every((m, i) => f.seq[f.seq.length - seq.length + i] === m)) best = [name, seq];
  }
  if (best) { f.comboName = best[0]; f.comboNameT = 100; f.meter = Math.min(100, f.meter + 4); }
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
  else if (f.dazed) { if (ground) f.vx = f.vx * 0.85 + Math.sin(frame / 30 + f.side * 2) * 0.12; }
  else if (f.victory || !canAct) { if (ground) f.vx *= 0.8; if (f.move) stepMove(f, foe, {}); else if (ground) f.facing = foe.x > f.x ? 1 : -1; }
  else if (f.stun > 0) { f.stun--; if (ground) f.vx *= 0.88; }
  else if (f.move) stepMove(f, foe, inp);
  else {
    if (ground) f.facing = foe.x > f.x ? 1 : -1;
    const sp = f.speed * (f.flow > 0 ? 1.45 : 1) * (f.asc > 0 ? 1.25 : 1) * (foe.big > 0 && Math.abs(foe.x - f.x) < 230 ? 0.6 : 1);
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
    if (f.buf.super > 0 && canFinish(f, foe)) { use('super'); startFinisher(f, foe); }
    else if (f.buf.super > 0 && f.meter >= SUPER_COST && !(finish && finish.side === f.side)) {
      use('super'); f.meter -= SUPER_COST; startMove(f, f.c.super.move); sfx('super');
      startCine(f);
    } else if (f.buf.skill > 0 && f.meter >= SKILL_COST) { use('skill'); f.meter -= SKILL_COST; startMove(f, f.c.skill.move); sfx('skill'); }
    else if (use('env')) { const pr = ground && nearProp(f); if (pr) { pr.cd = 600; f.prop = pr.kind; startMove(f, Math.abs(foe.x - f.x) < 200 ? 'envsmash' : 'envthrow'); sfx('whoosh'); } }
    else if (use('punch')) { const m = pickAttack(f, 'punch', inp, ground); f.seq = [m]; startMove(f, m); }
    else if (use('kick')) { const m = pickAttack(f, 'kick', inp, ground); f.seq = [m]; startMove(f, m); }
  }
  if (ground && !f.move && Math.abs(f.vx) > 0.5) f.walkPh += Math.abs(f.vx) * 0.055 * 136 / f.h;
  // physics
  f.vy += GRAV; f.x += f.vx; f.y += f.vy;
  if (f.y >= FLOOR) {
    if (f.kd === 1 && f.kdT > 2) {
      if (!f.bounced && f.vy > 4) { f.vy = -f.vy * 0.38; f.vx *= 0.6; f.bounced = true; f.bt0 = f.kdT; fx('dust', f.x, FLOOR, 12); shake = Math.max(shake, 6); sfx('thud'); if (f.spin && f.vy < -5) fx('crater', f.x - f.facing * f.h * 0.4, 0.75); }
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

function stepMove(f, foe, inp) {
  const M = MOVES[f.move], prev = f.mt;
  f.mt += (f.flow > 0 ? 1.45 : 1) * (f.asc > 0 ? 1.15 : 1) * f.atkSpd;
  const ground = f.y >= FLOOR;
  if (M.dash && f.mt >= M.start && f.mt <= M.end) { f.vx = f.facing * M.dash; if (frame % 3 === 0) fx('dust', f.x - f.facing * 10, FLOOR, 2); }
  else if (M.step && ground && f.mt >= M.start - 4 && f.mt <= M.start + 2 && Math.abs(foe.x - f.x) > (f.bw + foe.bw) * 0.45) f.vx = f.facing * M.step * Math.max(0.95, f.b.mob); // step into the attack
  else if (ground && !M.air && M.cast !== 'slam') f.vx *= 0.72;
  if (M.hits) { M.hits.forEach(([a, b], i) => { if (f.hitN < i && f.mt >= a && f.mt <= b + 1 && hittable(foe)) { f.hitDone = false; tryHit(f, foe, M); if (f.hitDone) f.hitN = i; } }); }
  else if (M.dmg && !f.hitDone && f.mt >= M.start && f.mt <= M.end + 1) tryHit(f, foe, M);
  if (M.cast && prev < M.start && f.mt >= M.start) doCast(f, foe, M);
  if (M.cast === 'slam') {
    if (!f.slamDone && f.mt > M.start + 3 && ground) { f.slamDone = true; slamLand(f, foe); f.mt = M.dur - 14; }
    else if (!f.slamDone && f.mt >= M.dur - 15) f.mt = M.dur - 15; // hang until landing
  }
  // combos: after a normal attack lands, the next press cancels into the next move
  if (M.limb && !M.hits && f.hitDone && f.mt >= M.start + 3 && f.seq.length < 5) {
    for (const b of ['punch', 'kick']) if (f.buf[b] > 0) {
      const plain = !inp.down && ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) !== f.facing;
      const next = b === 'punch' && plain && M.chain ? M.chain : pickAttack(f, b, inp, ground);
      f.buf[b] = 0; f.seq.push(next); startMove(f, next); checkCombo(f); return;
    }
  }
  if (M.prop && f.prop && f.hitDone && !M.cast) { shatter(f.prop, f.x + f.facing * 60, f.y - f.h * 0.6); f.prop = null; } // broke it over them
  if (f.mt >= M.dur) { f.move = null; if (f.prop) { shatter(f.prop, f.x + f.facing * 40, FLOOR - 10); f.prop = null; } }
}

function tryHit(f, foe, M) {
  if (!hittable(foe)) return;
  const s = f.scale, front = f.x + f.facing * f.sw * (M.limb ? 0.12 : 0.4) * s;
  const reach = M.limb ? limbLen(f, M.limb) * M.rm + 4 : M.reach * s;
  const hx1 = Math.min(front, front + f.facing * reach), hx2 = Math.max(front, front + f.facing * reach);
  const cy = f.y - M.hy * f.h * s, b = hurtbox(foe), hh = (M.hh ? M.hh * f.h : 22) * s; // hh: half the height the strike sweeps through
  if (M.limb) b.y1 += (14 + foe.h * 0.05) * foe.scale * 0.6; // grazing the top of the head doesn't count: tall fighters' punches go over small ones
  if (hx2 > b.x1 && hx1 < b.x2 && cy + hh > b.y1 && cy - hh < b.y2) {
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
  let dmg = M.dmg * att.power * att.scale * (att.flow > 0 ? 1.15 : 1) * (att.asc > 0 ? 1.25 : 1) * (att.weak > 0 ? 0.7 : 1);
  if (def.kd === 1) dmg *= 0.7; // juggles do less
  if (att.ai && !demo) dmg *= DIFFS[difficulty].dmg;
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
    if (def.prop && !armored) { shatter(def.prop, def.x, def.y - def.h * 0.6); def.prop = null; }
    const comboing = def.stun > 0 || def.kd === 1 || def.y < FLOOR - 2;
    att.combo = comboing ? att.combo + 1 : 1; att.comboDmg = (comboing ? att.comboDmg : 0) + (before - def.hp); att.comboT = 80;
    const shrug = def.c.kg >= 130 && !M.heavy && M.dmg <= 6 && def.kd === 0; // heavyweight: jabs don't stagger him
    if (shrug && !armored) { def.vx = dir * M.kb * 0.3; def.flash = 3; }
    else if (!armored) {
      def.move = null; def.dashT = 0; def.flash = 5; def.hitType = M.hy > 0.6 || M.proj ? 'high' : 'mid';
      def.vx = dir * M.kb * def.kbMul;
      if (M.kd || def.y < FLOOR - 4 || def.kd === 1) {
        def.kd = 1; def.kdT = 0; def.bounced = false; def.stun = 0; def.juggle++; def.wallHit = def.wallHit || !!M.wall; def.spin = M.superHit ? 1 : 0;
        def.vy = (M.launch || -6) * Math.sqrt(def.kbMul);
      } else { def.stun = def.stunMax = M.stun; def.hitVar = ((def.hitVar || 0) + 1) % 3; if (M.hypno) def.hypno = M.stun; }
    } else { def.vx = dir * M.kb * 0.15; def.flash = 3; }
    hitstop = M.hs || 5; shake = Math.max(shake, (M.hs || 5) * 0.9);
    cam.kick = Math.max(cam.kick, M.heavy ? 0.045 : 0.012); cam.hx = hx; cam.hy = hy;
    if (M.heavy) cam.roll += (rand() - 0.5) * 0.07;
    if (M.superHit) { cine = { kind: 'impact', t: 0, max: 96, side: att.side, x: hx, y: hy }; sfx('brk'); }
    sfx(M.heavy ? 'heavy' : 'hit'); fx('impact', hx, hy, att.c.color, M.heavy ? 1.6 : 1);
    if (M.heavy) fx('ring', hx, hy, att.c.color, 3);
  }
  // Injustice-style health: two bars. Emptying the first knocks you down and you fight on in critical.
  const half = def.maxHp / 2;
  if (mode === 'training' && def.hp <= 0) def.hp = 1; // nobody dies in training
  if (def.bar === 0 && def.hp <= half) { def.hp = half; def.bar = 1; barBreak(def, dir); }
  else if (def.hp <= 0 && !def.ko) {
    // empty: the first time they're left dazed for a finisher; hit them again (or wait) and it's a plain K.O.
    if (!def.dazed && !finish && !(cine && cine.kind === 'fin')) { startFinish(att, def, dir); return; }
    finish = null; def.dazed = false;
    def.ko = true; def.move = null; def.stun = 0; def.kd = 1; def.kdT = 0; def.bounced = false; def.spin = M.heavy ? 1 : 0; def.vy = -10; def.vx = dir * 7 * def.kbMul; def.wallHit = true;
    slowmo = 100; hitstop = 22; shake = 18; cam.kick = 0.14; cam.hx = def.x; cam.hy = def.y - def.h * 0.5; screenFlash = 14; sfx('ko');
    banner = { txt: 'K.O.', t: 150, max: 150, c: '#ffffff', slam: 1 }; say('announcer', 'K. O.');
    winner = att.side; endT = 170;
  }
}

// ---------- finishers ----------
function startFinish(att, def, dir) {
  def.dazed = true; def.hp = 0; def.move = null; def.stun = 0; def.blocking = false;
  att.confused = 0; att.hypno = 0; att.stun = 0; // the winner gets full control for the finish
  if (def.kd === 0) def.vx = dir * 5;
  finish = { side: att.side, t: 0, max: 330 };
  slowmo = 40; hitstop = 16; shake = 14; cam.kick = 0.1; cam.hx = def.x; cam.hy = def.y - def.h * 0.5; screenFlash = 8;
  banner = { txt: 'FINISH HIM!', t: 120, max: 120, c: '#ff2b2b', slam: 1 }; sfx('finish'); say('announcer', 'Finish him!');
}
// the dazed fighter collapses (time ran out) -> plain K.O.
function finishCollapse() {
  const w = P[finish.side], l = P[1 - finish.side]; finish = null;
  l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.bounced = false; l.vy = -4; l.vx = (l.x > w.x ? 1 : -1) * 2;
  banner = { txt: 'K.O.', t: 150, max: 150, c: '#ffffff', slam: 1 }; sfx('ko'); say('announcer', 'K. O.'); winner = w.side; endT = 150;
}
const canFinish = (f, foe) => finish && finish.side === f.side && foe.dazed && foe.kd === 0 && !f.move && f.y >= FLOOR && Math.abs(foe.x - f.x) < 340;
const FIN_LEN = { tide: 200, flick: 220, erase: 210, flop: 200, dunk: 320, stone: 230 };
function startFinisher(f, foe) {
  finish = null;
  const d = f.facing = foe.x > f.x ? 1 : -1;
  if (f.c.fin.id === 'dunk') f.x = clamp(f.x, 160 + (d < 0 ? 300 : 0), WW - 160 - (d > 0 ? 300 : 0)); // room for the hoop
  if (f.c.fin.id === 'tide') f.x = clamp(f.x, 120 + (d < 0 ? 470 : 0), WW - 120 - (d > 0 ? 470 : 0)); // room for the wave to roll
  foe.x = clamp(f.x + d * (f.c.fin.id === 'flop' ? 230 : f.c.fin.id === 'tide' ? 210 : 120), 60, WW - 60); foe.facing = -d; foe.vx = 0; f.vx = 0;
  f.move = foe.move = null; f.blocking = false;
  cine = { kind: 'fin', t: 0, max: FIN_LEN[f.c.fin.id], side: f.side, x: (f.x + foe.x) / 2, y: FLOOR - 90, fid: f.c.fin.id };
  if (cine.fid === 'dunk') { cine.hoop = { x: foe.x + d * 150, rise: 0 }; cine.mate = { x: f.x - d * 760, y: FLOOR, facing: d, pose: null }; }
  sfx('fin'); say(f.c.id, f.c.fin.line);
}
const finP = o => mk(o);
// each finisher is scripted on the cinematic's clock; fighters keep their physics (updateFighter runs with no input)
function finTick(cn) {
  const w = P[cn.side], l = P[1 - cn.side], t = cn.t, d = w.facing, k = (a, b) => clamp((t - a) / (b - a), 0, 1);
  const launch = (vx, vy, spin) => { l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.bounced = false; l.vx = vx; l.vy = vy; l.spin = spin ? 1 : 0; l.finPose = null; l.wallHit = false; };
  if (l.dazed) l.finPose = null;
  if (cn.fid === 'tide') {
    // TIDAL FINISH: Julian raises a wave that rolls in, picks them up on its crest and crashes them into the floor
    w.finPose = lp(GUARD, finP({ fu: 2.8, fl: 3.1, bu: 2.6, bl: 3.0, lean: -0.18, ht: -0.2, crouch: 0.05 }), swing(k(0, 40)));
    if (t > 56) w.finPose = lp(w.finPose, finP({ fu: 1.5, fl: 1.55, bu: 1.4, bl: 1.5, lean: 0.25, tw: 0.3 }), swing(k(56, 72))); // pushes it forward
    if (t < 60 && t % 3 === 0) fx('sparks', w.x + (rand() - 0.5) * 80, FLOOR - rand() * 40, '#6fc0ff', 2);
    if (t === 60) { projs.push({ owner: w.side, kind: 'wave', x: w.x + d * 40, y: FLOOR - 60, vx: d * 6, vy: 0, r: 40, life: 300, t: 0, fin: 1 }); sfx('skill'); fx('ring', w.x, FLOOR - 10, '#6fc0ff', 7); fx('sparks', w.x + d * 40, FLOOR - 20, '#bfe4ff', 24); shake = 10; }
    const wv = projs.find(p => p.fin);
    if (wv) {
      wv.x += wv.vx; wv.t++; wv.r = cn.crash ? Math.max(0, wv.r - 5) : Math.min(cn.carry ? 125 : 95, wv.r + 1.4); wv.y = FLOOR - wv.r * 0.9;
      if (!cn.crash && frame % 2 === 0) fx('sparks', wv.x, FLOOR - rand() * wv.r, '#bfe4ff', 2);
      if (!cn.crash && wv.t % 3 === 0) fx('sparks', wv.x - d * wv.r * 0.4, FLOOR - wv.r * 1.6, '#e6f4ff', 3); // spray off the crest
      if (!cn.carry && l.dazed && Math.abs(wv.x - l.x) < 50) { // swallowed
        cn.carry = t; l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.vx = 0; l.vy = 0; l.bounced = false; l.spin = 0;
        sfx('heavy'); shake = 16; fx('impact', l.x, l.y - l.h * 0.5, '#6fc0ff', 2); fx('sparks', l.x, l.y - l.h * 0.6, '#bfe4ff', 40); fx('ring', l.x, l.y - l.h * 0.5, '#bfe4ff', 5);
      }
      if (cn.carry && !cn.crash) { // riding the crest, flailing
        l.x = clamp(wv.x - d * 12, 60, WW - 60); l.y = FLOOR - wv.r * 1.2; l.vx = 0; l.vy = 0;
        l.finPose = finP({ lean: -0.45, ht: -0.4, fu: 2.6 + Math.sin(t / 3) * 0.5, fl: 2.9, bu: 2.3 - Math.sin(t / 3) * 0.5, bl: 2.6, ft: 0.9, fs: -0.5, bt: -0.4, bs: -0.9, rot: -0.5 + Math.sin(t / 7) * 0.15 });
        if (t - cn.carry > 40 || l.x <= 70 || l.x >= WW - 70) { // the wave breaks
          cn.crash = t; launch(d * 3, 17, 1); wv.vx = d * 2; sfx('whoosh');
          fx('sparks', wv.x, FLOOR - wv.r, '#e6f4ff', 46); fx('ring', wv.x, FLOOR - wv.r * 0.8, '#bfe4ff', 8);
        }
      }
      if (cn.crash && wv.r < 6) projs = projs.filter(p => !p.fin);
    }
    if (cn.crash && !cn.landed && l.y >= FLOOR - 2) { cn.landed = 1; fx('crater', l.x, 1.2); fx('sparks', l.x, FLOOR - 10, '#bfe4ff', 30); shake = 26; cam.kick = 0.12; cam.hx = l.x; cam.hy = FLOOR - 50; sfx('heavy'); sfx('brk'); }
    if (t > 120) w.finPose = lp(w.finPose, SHOWPOSE.julian(frame), 0.06);
    if (t > 185) projs = projs.filter(p => !p.fin);
  } else if (cn.fid === 'flick') {
    w.big = 40; w.scale = lerp(1, 2.5, swing(k(0, 55))) * (t > 160 ? lerp(1, 0.4, swing(k(160, 200))) : 1);
    if (t < 70) w.finPose = finP({ fu: 2.7, fl: 3.0, bu: 2.5, bl: 3.0, lean: -0.12, crouch: 0.05 * Math.sin(t / 5) });
    else if (t < 92) w.finPose = lp(GUARD, mk(MOVES.kick.wind), swing(k(70, 92)));
    else if (t < 130) w.finPose = lp(mk(MOVES.kick.wind), mk(MOVES.kick.hit), overshoot(k(92, 96)));
    else w.finPose = lp(mk(MOVES.kick.hit), SHOWPOSE.ryan(frame), swing(k(130, 160)));
    if (t === 94) { launch(d * 8, -27, 1); sfx('heavy'); shake = 22; fx('impact', l.x, l.y - l.h * 0.4, '#b44dff', 2.2); }
    if (!l.dazed && !l.gone && !cn.back && l.y < FLOOR - 430) { l.gone = true; cn.gx = l.x; cn.gt = t; fx('impact', l.x, FLOOR - 470, '#ffffff', 1.4); sfx('dodge'); }
    if (cn.gt && t === cn.gt + 16) { fx('ring', cn.gx, FLOOR - 470, '#fff6c0', 3); fx('sparks', cn.gx, FLOOR - 470, '#fff6c0', 16); sfx('select'); } // *ting*
    if (cn.gt && t === 176) { cn.back = 1; l.gone = false; l.x = clamp(cn.gx, 80, WW - 80); l.y = FLOOR - 560; l.vx = 0; l.vy = 26; l.spin = 1; l.bounced = false; l.ko = true; l.kd = 1; l.kdT = 0; sfx('whoosh'); }
    if (cn.back === 1 && l.y >= FLOOR - 2) { cn.back = 2; fx('crater', l.x, 1.3); shake = 26; cam.kick = 0.12; cam.hx = l.x; cam.hy = FLOOR - 50; sfx('heavy'); sfx('brk'); }
  } else if (cn.fid === 'erase') {
    w.finPose = lp(GUARD, finP({ fu: 1.55, fl: 1.6, bu: 2.7, bl: 3.4, lean: -0.05, ht: 0.1 }), swing(k(0, 30)));
    if (t >= 40 && t < 150) {
      const lv = swing(k(40, 90)); l.y = FLOOR - 70 * lv; l.vy = 0; l.dazed = true;
      l.finPose = finP({ lean: -0.2, ht: -0.5 + Math.sin(t / 4) * 0.2, fu: 1.8 + Math.sin(t / 3) * 0.4, fl: 2.4, bu: 1.6 - Math.sin(t / 3) * 0.4, bl: 2.2, ft: 0.4, fs: -0.2, bt: -0.2, bs: -0.6, rot: Math.sin(t / 9) * 0.3 });
      if (t > 90) { l.vanish = t % 6 < 3 ? 2 : 0; for (let q = 0; q < 2; q++) parts.push({ k: 's', x: l.x + (rand() - 0.5) * 50, y: l.y - rand() * l.h, vx: (rand() - 0.5) * 1.5, vy: -1 - rand() * 2.5, life: 30 + rand() * 20, max: 50, c: rand() < 0.5 ? w.c.color : '#ffffff' }); }
      if (t % 5 === 0) fx('text', l.x + (rand() - 0.5) * 120, l.y - l.h * (0.4 + rand() * 0.6), '?', w.c.color);
      if (t % 7 === 0) shake = Math.max(shake, 4);
    }
    if (t === 150) { l.gone = true; l.vanish = 0; l.finPose = null; fx('sparks', l.x, l.y - l.h * 0.5, w.c.color, 40); fx('ring', l.x, l.y - l.h * 0.5, w.c.color, 6); sfx('brk'); shake = 16; }
    if (t === 172) { l.gone = false; launch(0, 22, 0); l.y = FLOOR - 420; sfx('whoosh'); cn.drop = 1; }
    if (cn.drop === 1 && l.y >= FLOOR - 2) { cn.drop = 2; fx('crater', l.x, 1.1); shake = 22; cam.kick = 0.1; cam.hx = l.x; cam.hy = FLOOR - 50; sfx('heavy'); sfx('brk'); }
  } else if (cn.fid === 'flop') {
    if (t < 30) w.finPose = lp(GUARD, finP({ crouch: 0.5, lean: 0.3, fu: -0.6, fl: 0.2, bu: -0.7, bl: 0.1 }), swing(k(0, 25)));
    if (t === 30) { w.vy = -21; w.vx = (l.x - w.x) / 56; sfx('jump'); fx('dust', w.x, FLOOR, 12); }
    if (t > 30 && t < 150) w.finPose = finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, ft: 0.6, fs: 0.2, bt: 0.3, bs: -0.3, lean: 0, rot: -1.5 * swing(k(40, 70)), spread: 0.8 });
    if (t > 34 && w.y >= FLOOR && !cn.hit) { cn.hit = 1; w.vx = 0; l.dazed = false; l.ko = true; l.kd = 2; l.kdT = 0; l.squash = 1; l.finPose = null; shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 40;
      fx('flat', l.x, FLOOR, w.c.color); fx('crater', l.x, 1.6); sfx('heavy'); sfx('thud'); sfx('brk'); }
    if (t >= 150) w.finPose = lp(finP({ fu: 2.2, fl: 2.6, bu: 2.1, bl: 2.5, rot: -1.5 }), SHOWPOSE.blake(frame), swing(k(150, 185)));
  } else if (cn.fid === 'stone') {
    // MOGGED TO STONE: he squares up and stares; they freeze, grey over, crack and crumble
    if (t < 40) w.finPose = lp(GUARD, finP({ fu: 1.2, fl: 3.3, bu: 0.1, bl: 0.4, lean: -0.08, ht: -0.12, tw: -0.2 }), swing(k(0, 25))); // hand to the jaw
    else w.finPose = lp(w.finPose, finP({ fu: 0.2, fl: 0.4, bu: 0.15, bl: 0.35, lean: -0.12, ht: 0.12, crouch: 0.02 }), 0.12); // arms down, chin up, staring
    if (t > 30 && t < 120 && t % 4 === 0) fx('sparks', w.x + d * 14, w.y - w.h * 0.86, '#bfefff', 2);
    if (t >= 40 && t < 150) { l.dazed = true; l.vx = 0; const q = k(40, 120); l.stone = q;
      if (!cn.pose) cn.pose = Object.assign({}, dazedPose(l), { lean: -0.25, ht: -0.35, fu: 1.6, fl: 2.8, bu: 1.2, bl: 2.4 });
      l.finPose = Object.assign({}, cn.pose, { rot: q < 1 ? Math.sin(t * 2.3) * 0.02 * (1 - q) : 0 });
      if (t > 110 && t % 6 === 0) { fx('sparks', l.x + (rand() - 0.5) * 50, l.y - rand() * l.h, '#d8d4cc', 3); sfx('block'); } }
    if (t === 150) { l.gone = true; l.keepGone = true; l.finPose = null; fx('crumble', l.x, 1.2); fx('dust', l.x, FLOOR, 26); sfx('brk'); sfx('heavy'); shake = 22; cam.kick = 0.1; cam.hx = l.x; cam.hy = FLOOR - 60; }
    if (t > 170) w.finPose = lp(w.finPose, finP({ fu: 2.6, fl: 3.6, bu: 0.1, bl: 0.4, lean: -0.1, ht: -0.15 }), 0.08); // fixes his hair
  } else if (cn.fid === 'dunk') {
    // ALLEY-OOP SLAM: Frank calls Lejohn, a hoop rises, Lejohn lobs it, Frank carries the opponent up and slams them through the hoop
    const hp = cn.hoop, mt = cn.mate, rimX = hp.x - d * 38, rimY = FLOOR - 245;
    hp.rise = swing(k(8, 48));
    if (t === 8) { fx('dust', hp.x, FLOOR, 14); sfx('thud'); shake = 8; }
    if (t < 30) w.finPose = finP({ fu: 2.7, fl: 3.7, bu: 2.9, bl: 3.1, lean: -0.1, ht: -0.3 }); // whistle + call
    if (t === 4) { sfx('whistle'); say('frank', 'Lejohn! Lob it!'); }
    // Lejohn sprints in, winds up, throws the lob
    if (t >= 18 && t < 76) { mt.x += d * 10; const ph = t * 0.55; mt.pose = finP({ ft: 0.15 + 0.85 * Math.sin(ph), bt: 0.15 - 0.85 * Math.sin(ph), fs: -0.3 - 0.9 * Math.max(0, Math.cos(ph)), bs: -0.3 - 0.9 * Math.max(0, -Math.cos(ph)), fu: -0.9 * Math.sin(ph), fl: 1.4, bu: 0.9 * Math.sin(ph), bl: 1.4, lean: 0.3 }); }
    if (t >= 76 && t < 92) mt.pose = lp(mt.pose || GUARD, finP({ fu: 2.8, fl: 3.3, bu: 2.7, bl: 3.2, lean: -0.15, crouch: 0.2 }), swing(k(76, 90)));
    if (t >= 92 && t < 110) mt.pose = lp(finP({ fu: 2.8, fl: 3.3, bu: 2.7, bl: 3.2, lean: -0.15, crouch: 0.2 }), finP({ fu: 1.9, fl: 2.1, bu: 1.8, bl: 2.0, lean: 0.25 }), overshoot(k(92, 96)));
    if (t >= 150) { mt.pose = finP({ fu: 2.9, fl: 3.3, bu: 2.8, bl: 3.2, lean: -0.1, crouch: 0.1 * Math.abs(Math.sin(t / 5)) }); mt.y = FLOOR - Math.abs(Math.sin(t / 6)) * 30; }
    // the lob: a high arc from Lejohn's hands to the top of Frank's jump
    let ball = projs.find(p => p.fin);
    if (t === 92) projs.push(ball = { owner: w.side, kind: 'ball', x: mt.x, y: FLOOR - 210, vx: d * 4, vy: 0, r: 13, life: 400, t: 0, fin: 1, x0: mt.x, y0: FLOOR - 210 });
    if (ball && t >= 92 && t <= 124) { const q = (t - 92) / 32, tx = rimX - d * 10, ty = rimY - 150; ball.x = lerp(ball.x0, tx, q); ball.y = lerp(ball.y0, ty, q) - Math.sin(q * Math.PI) * 190; ball.t = t; }
    // Frank grabs the opponent and lifts them overhead
    if (t >= 30 && t < 84) w.finPose = lp(GUARD, finP({ fu: 1.5, fl: 1.4, bu: 1.4, bl: 1.3, lean: 0.25, crouch: 0.15 }), swing(k(30, 50)));
    const carried = t >= 84 && !cn.slam;
    if (carried) {
      w.finPose = finP({ fu: 2.95, fl: 3.15, bu: 2.85, bl: 3.05, lean: -0.08, crouch: t < 104 ? 0.3 * swing(k(96, 104)) : 0 });
      const lt = (l.h * 0.85 + 28) * l.scale; // hold them by the middle, overhead
      l.dazed = false; l.ko = true; l.kd = 1; l.kdT = 0; l.vx = l.vy = 0; l.x = w.x + d * 12; l.y = w.y - w.h * w.scale * 1.05 + lt * 0.5;
      l.finPose = finP({ rot: 1.55, lean: 0.05, ht: -0.2, fu: 2.2 + Math.sin(t / 3) * 0.5, fl: 2.6, bu: 1.8 - Math.sin(t / 3) * 0.5, bl: 2.3, ft: 0.4 + Math.sin(t / 4) * 0.3, fs: 0.1, bt: 0.1 - Math.sin(t / 4) * 0.3, bs: -0.3 });
    }
    if (t === 104) { w.vy = -15.5; w.vx = (rimX - d * 26 - w.x) / 21; sfx('jump'); fx('dust', w.x, FLOOR, 14); }
    if (ball && t > 124 && !cn.slam) { ball.x = l.x + d * 8; ball.y = l.y - 40; } // caught: the ball rides with the slam
    // at the top: through the hoop and into the floor
    if (!cn.slam && t > 112 && w.vy >= -1) { cn.slam = t; l.finPose = finP({ rot: 2.6, lean: 0, ht: 0.3, fu: 2.6, fl: 2.9, bu: 2.5, bl: 2.8, ft: 0.2, fs: 0, bt: 0.1, bs: 0 }); l.x = rimX; l.vy = 21; l.vx = 0; l.bounced = true; l.spin = 0; sfx('whoosh'); }
    if (cn.slam) {
      if (t < cn.slam + 50) { w.y = rimY + w.h * w.scale * 1.0; w.vy = 0; w.vx = 0; w.x = rimX - d * 30; w.finPose = finP({ fu: 3.0, fl: 3.1, bu: 2.95, bl: 3.05, ft: 0.35 + Math.sin(t / 6) * 0.15, fs: 0.1, bt: -0.15, bs: -0.4, lean: 0.05, ht: 0.3 }); } // hangs on the rim
      if (!cn.boom && l.y >= FLOOR - 2) { cn.boom = 1; l.y = FLOOR; l.vy = 0; l.kd = 2; l.kdT = 0; l.sink = 0.12; l.finPose = null; l.squash = 0.35;
        fx('crater', l.x, 1.7); fx('impact', l.x, FLOOR - 30, '#ff7a1a', 2.6); fx('ring', l.x, FLOOR - 10, '#ffffff', 7); fx('text', rimX, rimY - 60, 'SLAM!', '#ff7a1a');
        sfx('heavy'); sfx('brk'); sfx('thud'); shake = 34; slowmo = 26; cam.kick = 0.15; cam.hx = l.x; cam.hy = FLOOR - 40; screenFlash = 6;
        if (ball) { ball.vy = -7; ball.vx = -d * 3; } }
      if (cn.boom && ball) { ball.vy += 0.5; ball.x += ball.vx; ball.y += ball.vy; if (ball.y > FLOOR - 13) { ball.y = FLOOR - 13; ball.vy = -Math.abs(ball.vy) * 0.6; ball.vx *= 0.8; } }
      if (t > cn.slam + 70) w.finPose = lp(w.finPose || GUARD, SHOWPOSE.frank(frame), 0.1);
    }
    if (t > 300) projs = projs.filter(p => !p.fin);
  }
}
let mateFighter = null;
function mateFrom(m) {
  if (!mateFighter) { mateFighter = makeFighter(4, 0, 0); mateFighter.c = MATE; mateFighter.ci = -1; mateFighter.h = (MATE.inches - 40) * 3.2 + 30; mateFighter.hp = 1; }
  Object.assign(mateFighter, { x: m.x, y: m.y, facing: m.facing, finPose: m.pose || null, intro: false, victory: false });
  return mateFighter;
}
function finEnd(cn) {
  const w = P[cn.side], l = P[1 - cn.side];
  projs = projs.filter(p => !p.fin);
  w.finPose = null; w.scale = 1; w.big = 0; l.gone = !!l.keepGone; l.vanish = 0; l.dazed = false; l.ko = true;
  if (l.kd === 0 && !l.sink && !l.keepGone) { l.kd = 2; l.kdT = 0; l.y = FLOOR; }
  winner = w.side; endT = 110;
  banner = { txt: w.c.fin.name, t: 170, max: 170, c: w.c.color, slam: 1, sub: 'FINISHER' }; sfx('ko'); say('announcer', w.c.fin.name.toLowerCase());
}
// swaying on their feet, waiting to be finished
function dazedPose(f) {
  const t = frame / 14 + f.side * 2, p = mk({ lean: -0.1 + Math.sin(t) * 0.1, ht: 0.35 + Math.sin(t * 1.3) * 0.25, fu: 0.12 + Math.sin(t) * 0.1, fl: 0.4, bu: -0.1, bl: 0.3, crouch: 0.14 + Math.sin(t * 2) * 0.04, tw: Math.sin(t * 0.8) * 0.4 });
  p.ft += Math.sin(t) * 0.12; p.bt -= Math.sin(t) * 0.12; return p;
}

function barBreak(def, dir) {
  def.move = null; def.stun = 0; def.kd = 1; def.kdT = 0; def.bounced = false; def.spin = 0; def.vy = -10; def.vx = dir * 8 * def.kbMul; def.wallHit = true;
  def.barAnim = 70; def.dispHp = def.hp; def.meter = Math.min(100, def.meter + 25);
  hitstop = 26; shake = 18; cam.kick = 0.12; cam.hx = def.x; cam.hy = def.y - def.h * 0.5; screenFlash = 10; sfx('brk');
  banner = { txt: 'CRITICAL!', t: 90, max: 90, c: '#ff3b3b' };
  fx('impact', def.x, def.y - def.h * 0.6, '#ff3b3b', 2.2); fx('ring', def.x, def.y - def.h * 0.6, '#ff3b3b', 6);
}

function doCast(f, foe, M) {
  const s = f.scale, dir = f.facing;
  if (M.cast === 'proj') {
    const p = PROJ[M.proj];
    projs.push({ owner: f.side, kind: M.proj, x: f.x + dir * (f.sw * 0.6 + 22) * s, y: f.y - (p.arc ? 0.95 : p.eye ? 0.9 : 0.74) * f.h * s, vx: dir * p.speed, vy: p.arc ? (M.proj === 'prop' ? -6 : -8) : 0, r: p.r * s, life: 160, t: 0, bounces: 0, obj: M.proj === 'prop' ? f.prop : undefined });
    if (M.proj === 'prop') f.prop = null;
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
  shake = 14; cam.kick = 0.06; fx('flat', f.x, FLOOR, f.c.color); fx('crater', f.x, 0.8); sfx('heavy');
  if (hittable(foe) && foe.y >= FLOOR - 30 && Math.abs(foe.x - f.x) < 140 * f.scale) applyHit(f, foe, SLAM, foe.x > f.x ? 1 : -1, foe.x, FLOOR - 30);
}

function updateProjs() {
  for (const p of projs) {
    p.x += p.vx; p.t++; p.life--;
    if (PROJ[p.kind].arc) {
      p.vy += 0.4; p.y += p.vy;
      if (p.y > FLOOR - p.r) { p.y = FLOOR - p.r; p.vy = -Math.abs(p.vy) * 0.62; p.vx *= 0.85; fx('dust', p.x, FLOOR, 3); if (++p.bounces > 3 || (p.kind === 'prop' && !BOUNCY[p.obj])) { p.life = 0; if (p.kind === 'prop') shatter(p.obj, p.x, p.y); } }
    }
    const foe = P[1 - p.owner], b = hurtbox(foe);
    if (hittable(foe) && p.x + p.r > b.x1 && p.x - p.r < b.x2 && p.y + p.r > b.y1 && p.y - p.r < b.y2) {
      applyHit(P[p.owner], foe, Object.assign({ proj: 1 }, PROJ[p.kind]), Math.sign(p.vx), p.x, p.y); p.life = 0;
      if (p.kind === 'prop') shatter(p.obj, p.x, p.y);
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
  const maxSep = window.R3D && R3D.ready && gfx.renderer === '3d' ? 470 : W - 150, d2 = b.x - a.x; // the 3D camera frames closer
  if (Math.abs(d2) > maxSep) { const ex = (Math.abs(d2) - maxSep) / 2 * Math.sign(d2); a.x += ex; b.x -= ex; }
}

// ---------- CPU ----------
function aiInput(f, foe) {
  const a = f.ai, i = { left: 0, right: 0, up: 0, down: 0, punch: 0, kick: 0, skill: 0, super: 0, dash: 0 };
  const d = Math.abs(foe.x - f.x), tw = foe.x > f.x ? 'right' : 'left', aw = tw === 'right' ? 'left' : 'right';
  if (mode === 'training' && f.side === 1) { const di = dummyInput(f, foe); if (di) return di; }
  if (finish && finish.side === f.side) { if (d > 220) i[tw] = 1; else if (finish.t > 50 && !f.move) i.super = 1; return i; }
  if (f.dazed) return i;
  const D = DIFFS[demo ? 1 : difficulty];
  if (!f.move && f.y >= FLOOR && nearProp(f) && rand() < 0.012 * D.special) { i.env = 1; return i; }
  if (a.queue && a.queue.length) {
    // feed a combo one input at a time, only while it keeps landing
    if (--a.mashT <= 0) {
      if (a.queue.length < a.qlen && !f.hitDone && !f.move) { a.queue = null; }
      else { const [b, dir] = a.queue.shift(); i[b] = 1; if (dir === 'down') i.down = 1; if (dir === 'fwd') i[tw] = 1; a.mashT = D.gap; }
    }
    return i;
  }
  if (--a.t <= 0) {
    a.hold = {}; a.t = D.react[0] + rand() * (D.react[1] - D.react[0]) | 0;
    const r = rand(), sk = f.c.skill.move, su = f.c.super.move;
    const incoming = projs.some(p => p.owner !== f.side && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 220);
    const threat = foe.move && MOVES[foe.move].dmg && d < 150;
    const superOk = su === 'force' ? d < 150 : su === 'presence' ? d < 320 : true;
    const skillOk = sk === 'wave' || sk === 'spiral' || sk === 'ball' ? d > 160 : sk === 'mind' ? d > 130 : sk === 'scratch' ? d < 140 : d < 280 && d > 60;
    const range = f.sw * 0.12 * f.scale + limbLen(f, 'arm') + foe.bw * 0.5 * foe.scale;
    if (foe.kd >= 2) { a.hold = r < 0.5 ? {} : { [aw]: 1 }; a.t = 20; }
    else if (incoming && r < 0.6) a.hold = r < 0.3 ? { up: 1, [tw]: 1 } : { down: 1 };
    else if (threat && r < D.block) { a.hold = { down: 1 }; a.t = 14; }
    else if (f.meter >= SUPER_COST && superOk && r < 0.35 * D.special) a.press = 'super';
    else if (f.meter >= SKILL_COST && skillOk && r < 0.2 * D.special) a.press = 'skill';
    else if (d > 380 && r < 0.12) { i.dash = tw === 'right' ? 1 : -1; }
    else if (d > range) { a.hold = { [tw]: 1 }; if (r < 0.05) a.hold.up = 1; }
    else {
      const q = rand();
      const punchHigh = f.y - MOVES.jab.hy * f.h * f.scale + 22 * f.scale < foe.y - (foe.h * 0.85 + 28) * foe.scale + (14 + foe.h * 0.05) * foe.scale * 0.6;
      if (q < D.combo && !punchHigh) {
        const pick = COMBOS[rand() * COMBOS.length | 0][1];
        a.queue = pick.map(m => COMBO_INPUT[m]); a.qlen = a.queue.length; a.mashT = 0;
      }
      else if (q < 0.28 && !punchHigh) { a.press = 'punch'; }
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
const GUARD = { lean: 0.08, crouch: 0.06, fu: 0.45, fl: 2.45, bu: 0.2, bl: 2.65, ft: 0.28, fs: 0.02, bt: -0.22, bs: -0.3, ht: 0, rot: 0, spread: 0, tw: 0, hz: 0, hzb: 0, lunge: 0 };
// timing curves for attacks: an eased swing, and a snap that overshoots then settles (gives punches weight)
const swing = t => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const overshoot = t => { t = clamp(t, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
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
  clav: t => mk({ fu: 1.2, fl: 3.3 + Math.sin(t / 14) * 0.08, bu: 0.15, bl: 0.35, lean: -0.1, ht: -0.12 + Math.sin(t / 30) * 0.05, tw: -0.2, crouch: 0 }), // hand on the jaw, chin up
};

function movePose(f) {
  const M = MOVES[f.move], wind = mk(M.wind), hit = mk(M.hit), t = f.mt;
  if (M.cast === 'slam') {
    if (!f.slamDone) return f.vy < 0 ? lp(wind, hit, ease(t / 8)) : mk(Object.assign({}, M.hit, { fu: 1.2, fl: 1.4, bu: 1.0, bl: 1.2 }));
    return lp(mk({ crouch: 0.45, lean: 0.25 }), GUARD, ease((t - (M.dur - 14)) / 14));
  }
  let p;
  const s0 = M.start, e0 = M.end, snap = Math.max(2, Math.min(3.5, s0 * 0.4)), s1 = s0 - snap;
  if (M.hits) { // multi-hit (claw rake): alternate hands, wind and snap for each swipe
    let i = M.hits.findIndex(([a, b]) => t <= b + 2); if (i < 0) i = M.hits.length - 1;
    const [a, b] = M.hits[i], pre = i ? M.hits[i - 1][1] + 2 : 0, hh = mk(M.hit), ww = mk(M.wind);
    if (i % 2) { [hh.fu, hh.bu, hh.fl, hh.bl] = [hh.bu, hh.fu, hh.bl, hh.fl]; [ww.fu, ww.bu, ww.fl, ww.bl] = [ww.bu, ww.fu, ww.bl, ww.fl]; }
    hh.tw = i % 2 ? -0.5 : 0.5; ww.tw = -hh.tw * 0.6; hh.lunge = 0.06;
    p = t < a - 2 ? lp(i ? mk(M.hit) : GUARD, ww, swing((t - pre) / Math.max(1, a - 2 - pre))) : lp(ww, hh, overshoot((t - a + 2) / 3));
    if (t > M.hits[M.hits.length - 1][1] + 2) p = lp(hh, GUARD, swing((t - M.hits[M.hits.length - 1][1] - 2) / Math.max(1, M.dur - M.hits[M.hits.length - 1][1] - 2)));
  }
  else if (t < s1) p = lp(GUARD, wind, swing(t / s1));                              // anticipation: coil and load
  else if (t <= e0 + 2) {                                                           // strike: snap through with overshoot, keep driving
    p = lp(wind, hit, overshoot((t - s1) / (snap + 1)));
    const k = clamp((t - s0) / Math.max(1, e0 + 2 - s0), 0, 1); p.lean += 0.05 * k; p.lunge += 0.015 * k;
  } else {                                                                          // recovery: pull back to guard and settle
    const k = (t - e0 - 2) / Math.max(1, M.dur - e0 - 2);
    p = lp(hit, GUARD, swing(k)); p.crouch += Math.sin(clamp(k, 0, 1) * Math.PI) * 0.05;
  }
  // weight shift: the front foot steps out and the back leg drives when the body lunges
  p.ft += p.lunge * 2.6; p.bt -= p.lunge * 2.2; p.bs -= p.lunge * 1.6;
  if (M.dash && t >= M.start && t <= M.end) {
    const s = Math.sin(t * 0.9);
    p.ft = 0.6 + 0.5 * s; p.bt = -0.3 - 0.5 * s; p.fs = p.ft - 0.5; p.bs = p.bt - 0.6;
  }
  return p;
}

// knockdowns: a flailing tumble (a full flip from supers and heavy KOs), a floor bounce, a settle, then a
// three-stage get-up. Limb angles are in the body's frame, which turns by rot (rot 1.5 = flat on the back).
const LIE = mk({ lean: 0, ht: -0.15, fu: 2.7, fl: 2.95, bu: 0.5, bl: 0.7, ft: 0.25, fs: -0.15, bt: 0.05, bs: 0, crouch: 0, rot: 1.52, spread: 0.7 });
const SIT = mk({ lean: 1.2, ht: 0.25, fu: -2.1, fl: -2.0, bu: -2.0, bl: -1.9, ft: 0.77, fs: -0.63, bt: 0.07, bs: 0.07, crouch: 0, rot: 1.5, spread: 0.3 });
const KNEEL = mk({ lean: 0.35, ht: 0.1, fu: 0.9, fl: 0.5, bu: 0.2, bl: 0.3, ft: 1.5, fs: 0, bt: -0.15, bs: -1.5, crouch: 0, rot: 0 });
const FLING = mk({ lean: -0.1, ht: -0.4, fu: 2.4, fl: 2.9, bu: 1.9, bl: 2.5, ft: 0.9, fs: 0.5, bt: 0.6, bs: 0.2, crouch: 0, rot: 1.45, spread: 0.6 });
function fallPose(f) {
  const t = f.kdT, a = Math.sin(t * 0.45), b = Math.cos(t * 0.38);
  if (!f.bounced) {
    const spin = f.spin ? Math.PI * 2 * ease(t / 24) : 0;
    return mk({ lean: -0.25, ht: -0.45, fu: 2.0 + 0.6 * a, fl: 2.6 + 0.5 * b, bu: 1.5 - 0.5 * b, bl: 2.2 + 0.4 * a, ft: 0.8 + 0.4 * b, fs: 0.2 - 0.3 * a,
      bt: 0.3 - 0.35 * a, bs: -0.1 - 0.2 * b, crouch: 0, rot: lerp(0.25, 1.35, ease(t / 26)) + (spin > 6.27 ? 0 : spin), spread: 0.35 });
  }
  return lp(FLING, LIE, ease((t - (f.bt0 || 0)) / 14));
}
function lyingPose(f) {
  const t = f.kdT, w = Math.sin(t * 0.9) * Math.exp(-t / 7) * 0.3, br = Math.sin(frame / 22) * 0.025, p = Object.assign({}, LIE);
  p.fu += w; p.bu -= w * 0.7; p.ft += w * 0.6; p.lean += br; p.ht += br;
  if (f.ko) { p.ht -= 0.1; p.fu = 2.9; }
  return p;
}
function risePose(f) {
  const k = clamp(f.kdT / 26, 0, 1);
  if (k < 0.3) return lp(LIE, SIT, ease(k / 0.3));
  if (k < 0.65) return lp(SIT, KNEEL, ease((k - 0.3) / 0.35));
  return lp(KNEEL, GUARD, ease((k - 0.65) / 0.35));
}

function getPose(f) {
  if (f.finPose) return f.finPose;
  if (f.gaze) { const b = Math.sin(frame / 40); return mk({ lean: 0.1 + b * 0.02, ht: 0.38 + b * 0.04, fu: 0.08, fl: 0.25, bu: -0.08, bl: 0.15, crouch: 0.02, ft: 0.12, fs: 0.05, bt: -0.12, bs: -0.1 }); }
  if (f.kd === 1) return fallPose(f);
  if (f.kd === 2) return lyingPose(f);
  if (f.kd === 3) return risePose(f);
  if (f.dazed) return dazedPose(f);
  if (cine && cine.kind === 'act' && cine.side === f.side && f.move) { const p = lp(GUARD, mk(MOVES[f.move].wind), ease(cine.t / 18)); p.ht += Math.sin(frame / 3) * 0.04; return p; }
  if (f.victory || f.intro) return (SHOWPOSE[f.c.id] || SHOWPOSE.julian)(frame);
  if (f.stun > 0) {
    if (f.hypno > 0) { const p = mk(POSES.hypno); p.lean += Math.sin(frame / 10) * 0.15; p.ht = Math.sin(frame / 8) * 0.3; return p; }
    // snap into the hit, wobble, then recover through the stun; alternate the head turn so repeated hits look different
    const el = Math.max(0, (f.stunMax || f.stun) - f.stun), dur = Math.max(4, f.stunMax || 12);
    const k = el < 3 ? overshoot(el / 3) : 1 - swing((el - 3) / (dur - 3));
    const p = lp(GUARD, POSES[f.hitType] || POSES.high, k), dec = Math.exp(-el / 7);
    p.ht += Math.sin(el * 0.9) * dec * 0.22; p.tw = ((f.hitVar || 0) - 1) * 0.4 * dec; p.lunge = -0.05 * dec;
    return p;
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
  else { // no photo (and no 3D portrait yet): a simple drawn face
    ctx.save(); ctx.scale(fr, 1);
    ctx.fillStyle = c.hair; ctx.beginPath(); ctx.ellipse(-rx * 0.1, -ry * 0.95, rx * 1.05, ry * 0.42, -0.15, 0, 7); ctx.fill(); // fringe
    for (const sx of [-1, 1]) {
      const ex = sx * rx * 0.36 + rx * 0.08, ey = -ry * 0.1;
      ctx.fillStyle = 'rgba(40,24,20,0.85)'; ctx.beginPath(); ctx.ellipse(ex, ey - ry * 0.17, rx * 0.2, ry * 0.045, sx * -0.08, 0, 7); ctx.fill(); // brow
      ctx.fillStyle = '#f4efe9'; ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.15, ry * 0.07, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d6f8f'; ctx.beginPath(); ctx.arc(ex + rx * 0.03, ey, ry * 0.06, 0, 7); ctx.fill();
      ctx.fillStyle = '#0c0a0a'; ctx.beginPath(); ctx.arc(ex + rx * 0.03, ey, ry * 0.028, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(90,50,40,0.55)'; ctx.lineWidth = Math.max(1, r / 14); ctx.beginPath(); ctx.moveTo(rx * 0.12, -ry * 0.02); ctx.lineTo(rx * 0.2, ry * 0.26); ctx.lineTo(rx * 0.06, ry * 0.3); ctx.stroke(); // nose
    ctx.strokeStyle = 'rgba(120,50,50,0.85)'; ctx.lineWidth = Math.max(1, r / 12); ctx.beginPath(); ctx.moveTo(-rx * 0.18, ry * 0.5); ctx.quadraticCurveTo(rx * 0.08, ry * 0.55, rx * 0.3, ry * 0.48); ctx.stroke(); // mouth
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(0, ry * 0.85, rx * 0.75, ry * 0.25, 0, 0, Math.PI); ctx.fill(); // jaw shadow
    ctx.restore();
  }
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
// head for HUD/menus: the photo head, or the animal head for Fox/Furry skins
function drawFace(c, skin, x, y, r, flip) {
  const L = lookOf(c, skin);
  if (L.head) drawAnimalHead(L.head, x, y + r * 0.15, r * 0.82, flip ? -1 : 1, 0, L, false);
  else drawHead(c, x, y, r, flip, 0);
}
// a framed portrait for menus and the HUD
function drawPortrait(c, x, y, r, flip, skin) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#140c1a'; ctx.fill(); ctx.clip();
  const g = ctx.createRadialGradient(x, y - r * 0.3, 2, x, y, r); g.addColorStop(0, rgba(c.color, 0.6)); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  drawFace(c, skin, x, y + r * 0.08, r * 0.82, flip);
  ctx.restore();
  ctx.strokeStyle = c.color; ctx.lineWidth = Math.max(2, r / 10); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
}

// ---------- bodies: one solid silhouette (outline pass), then fills, then detail ----------
const INK = '#0b0610', EDGE = 'rgba(0,0,0,0.38)';
const ell = (x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, 7); };
// draw a shape either as part of the dark silhouette (ink) or filled with its colour
function shapeIn(ink, col, path, pad) {
  path(ink ? (pad == null ? 2.5 : pad) : 0);
  if (ink) { ctx.fillStyle = INK; ctx.fill(); } else { ctx.fillStyle = col; ctx.fill(); }
}

// cartoon animal heads for the Fox and Furry skins
function drawAnimalHead(kind, x, y, r, dir, tilt, L, ink) {
  ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt); ctx.scale(dir, 1);
  const fur = L.fur, lite = L.furLight;
  if (kind === 'fox') {
    for (const ex of [-0.55, 0.2]) {
      shapeIn(ink, fur, d => { ctx.beginPath(); ctx.moveTo(ex * r - d, -0.45 * r); ctx.lineTo(ex * r + 0.12 * r, -1.5 * r - d * 1.5); ctx.lineTo(ex * r + 0.55 * r + d, -0.5 * r); ctx.closePath(); });
      if (!ink) { ctx.fillStyle = '#3a1a0a'; ctx.beginPath(); ctx.moveTo(ex * r + 0.1 * r, -0.55 * r); ctx.lineTo(ex * r + 0.15 * r, -1.25 * r); ctx.lineTo(ex * r + 0.4 * r, -0.6 * r); ctx.fill(); }
    }
    shapeIn(ink, fur, d => ell(0, 0, r * 0.92 + d, r * 0.84 + d));
    shapeIn(ink, lite, d => ell(r * 0.78, r * 0.22, r * 0.5 + d, r * 0.3 + d, 0.1));
    if (!ink) {
      ctx.fillStyle = lite; ell(r * 0.3, r * 0.35, r * 0.5, r * 0.38); ctx.fill();
      ctx.fillStyle = '#120806'; ell(r * 1.22, r * 0.12, r * 0.13, r * 0.1); ctx.fill();
      ctx.fillStyle = '#1a0f08'; ell(r * 0.42, -r * 0.14, r * 0.15, r * 0.11, -0.2); ctx.fill();
      ctx.fillStyle = '#ffcf5a'; ell(r * 0.44, -r * 0.14, r * 0.08, r * 0.07); ctx.fill();
      ctx.fillStyle = '#000'; ell(r * 0.46, -r * 0.14, r * 0.035, r * 0.065); ctx.fill();
      ctx.fillStyle = '#fff'; ell(r * 0.4, -r * 0.18, r * 0.025, r * 0.025); ctx.fill();
      ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * 0.95, r * 0.35); ctx.quadraticCurveTo(r * 0.8, r * 0.45, r * 0.65, r * 0.38); ctx.stroke();
      const g = ctx.createRadialGradient(r * 0.3, -r * 0.4, 1, 0, 0, r * 1.1); g.addColorStop(0, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = g; ell(0, 0, r * 0.92, r * 0.84); ctx.fill();
    }
  } else {
    // fursuit: big round head, huge eyes, open smile
    for (const ex of [-0.75, 0.05]) {
      shapeIn(ink, fur, d => { ctx.beginPath(); ctx.moveTo(ex * r - d, -0.5 * r); ctx.quadraticCurveTo(ex * r + 0.1 * r, -1.75 * r - d, ex * r + 0.7 * r + d, -0.6 * r); ctx.closePath(); });
      if (!ink) { ctx.fillStyle = lite; ctx.beginPath(); ctx.moveTo(ex * r + 0.12 * r, -0.6 * r); ctx.quadraticCurveTo(ex * r + 0.2 * r, -1.45 * r, ex * r + 0.55 * r, -0.65 * r); ctx.fill(); }
    }
    shapeIn(ink, fur, d => ell(0, -r * 0.02, r * 1.02 + d, r * 0.96 + d));
    shapeIn(ink, lite, d => ell(r * 0.55, r * 0.36, r * 0.55 + d, r * 0.38 + d));
    if (!ink) {
      ctx.fillStyle = '#ff8ad1'; for (const [hx, hy] of [[-0.2, -0.9], [0.05, -0.95], [0.3, -0.88]]) { ell(hx * r, hy * r, r * 0.18, r * 0.14); ctx.fill(); }
      ctx.fillStyle = '#ff5fa8'; ctx.beginPath(); ctx.moveTo(r * 0.98, r * 0.18); ctx.arc(r * 0.93, r * 0.16, r * 0.08, 0, 7); ctx.arc(r * 1.06, r * 0.16, r * 0.08, 0, 7); ctx.fill();
      for (const [ex, sz] of [[0.32, 1], [-0.12, 0.75]]) {
        ctx.fillStyle = '#fff'; ell(ex * r, -r * 0.14, r * 0.2 * sz, r * 0.27 * sz); ctx.fill();
        ctx.fillStyle = '#3a7bd5'; ell(ex * r + r * 0.04, -r * 0.1, r * 0.13 * sz, r * 0.19 * sz); ctx.fill();
        ctx.fillStyle = '#0a0a1a'; ell(ex * r + r * 0.05, -r * 0.09, r * 0.07 * sz, r * 0.11 * sz); ctx.fill();
        ctx.fillStyle = '#fff'; ell(ex * r + r * 0.0, -r * 0.2, r * 0.05 * sz, r * 0.05 * sz); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,90,160,0.45)'; ell(r * 0.48, r * 0.12, r * 0.14, r * 0.08); ctx.fill();
      ctx.fillStyle = '#4a0a24'; ctx.beginPath(); ctx.arc(r * 0.68, r * 0.42, r * 0.2, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ff6fae'; ell(r * 0.7, r * 0.55, r * 0.1, r * 0.07); ctx.fill();
      const g = ctx.createRadialGradient(r * 0.3, -r * 0.4, 1, 0, 0, r * 1.2); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,40,0.3)');
      ctx.fillStyle = g; ell(0, -r * 0.02, r * 1.02, r * 0.96); ctx.fill();
    }
  }
  ctx.restore();
}

function drawFighter(f, gx, gy, ghost) {
  const c = f.c, B = f.b, s = f.scale, h = f.h * s, dir = f.facing, p = Object.assign({}, getPose(f));
  gx += dir * (p.lunge || 0) * h * 0.9;
  let L = lookOf(c, f.skin);
  if (f.furT > 0 && c.id === 'blake' && !L.furBody) L = lookOf(c, 1); // Furry Fury transformation
  const legL = h * 0.46, th = legL * 0.52, sh = legL * 0.5, torso = h * 0.29, ua = h * 0.17 * B.arm, la = h * 0.16 * B.arm;
  const r = (14 + f.h * 0.05) * s, lw = f.lw * s, sw = f.sw * s;
  const shoW = sw * B.shoulder, waistW = sw * B.waist;
  const aw1 = lw * 0.95 * B.armW, aw2 = lw * 0.8 * B.armW, lg1 = lw * 1.1 * B.legW, lg2 = lw * 0.88 * B.legW;
  const moving = Math.abs(f.vx) > 0.5 || f.stun > 0 || f.kd === 1;
  const jig = B.belly ? Math.sin(frame / 3.2) * (moving ? 3.5 : 0.8) * s : 0;
  if (f.victory && c.id === 'ryan') gy -= Math.abs(Math.sin(frame / 8)) * 14;
  p.ft += p.crouch; p.fs -= p.crouch; p.bt += p.crouch * 0.6; p.bs -= p.crouch * 1.2;
  const depth = (a, b) => th * Math.cos(a) + sh * Math.cos(b);
  const onGround = gy >= FLOOR - 0.5;
  const hipY = (onGround ? -Math.max(depth(p.ft, p.fs), depth(p.bt, p.bs)) : -legL * 0.95) - lg2 * 0.3;
  const X = (a, len) => dir * Math.sin(a) * len, Y = (a, len) => Math.cos(a) * len;
  const fur = !!L.furBody, bodyCol = L.bare ? c.skin : fur ? L.fur : L.shirt;
  const armCol = fur ? L.fur : L.sleeves ? L.shirt : c.skin, handCol = fur ? L.fur : c.skin;
  const legTop = fur ? L.fur : L.bare ? c.skin : L.pants, legLow = fur ? L.fur : (L.bare || L.shorts) ? c.skin : L.pants;

  ctx.save();
  ctx.translate(gx, gy);
  if (p.rot) { ctx.rotate(-dir * p.rot); ctx.translate(0, -lw * 0.45 * p.rot / 1.5); }
  ctx.globalAlpha = ghost || (f.vanish > 0 ? 0.3 : 1);
  if (!ghost && f.flash > 0) ctx.filter = 'brightness(2.4)';
  else if (!ghost && f.armor > 0) ctx.filter = 'saturate(0.35) brightness(1.25)';
  if (!ghost && f.flow > 0) { ctx.shadowColor = c.color; ctx.shadowBlur = 16; }
  ctx.lineCap = ctx.lineJoin = 'round';

  const parts = []; // [silhouette pass, fill pass]
  const line = (x1, y1, x2, y2, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const upPerp = (dx, dy) => { const l = Math.hypot(dx, dy) || 1, a = [dy / l, -dx / l], b = [-dy / l, dx / l]; return a[1] < b[1] || (Math.abs(a[1] - b[1]) < 0.1 && a[0] * dir > 0) ? a : b; };
  // two-segment limb, thicker at the top; b1/b2 = muscle or fat lumps; edge = thin inner line where it crosses the body
  const limb = (x0, y0, a1, l1, a2, l2, w1, w2, c1, c2, b1, b2, edge, sock) => {
    const x1 = x0 + X(a1, l1), y1 = y0 + Y(a1, l1), x2 = x1 + X(a2, l2), y2 = y1 + Y(a2, l2);
    const r1 = Math.atan2(y1 - y0, x1 - x0), r2 = Math.atan2(y2 - y1, x2 - x1);
    const lumps = (pad, k1, k2) => {
      if (b1) { ctx.fillStyle = k1; ell(lerp(x0, x1, 0.48), lerp(y0, y1, 0.48), l1 * 0.34 + pad, w1 * b1 + pad, r1); ctx.fill(); }
      if (b2) { ctx.fillStyle = k2; ell(lerp(x1, x2, 0.3), lerp(y1, y2, 0.3), l2 * 0.28 + pad, w2 * b2 + pad, r2); ctx.fill(); }
    };
    parts.push([
      () => { line(x0, y0, x1, y1, w1 + 5, INK); line(x1, y1, x2, y2, w2 + 5, INK); lumps(2.5, INK, INK); },
      () => {
        if (edge) { line(x0, y0, x1, y1, w1 + 1.6, EDGE); line(x1, y1, x2, y2, w2 + 1.6, EDGE); lumps(0.8, EDGE, EDGE); }
        line(x0, y0, x1, y1, w1, c1); line(x1, y1, x2, y2, w2, c2); lumps(0, c1, c2);
        if (sock) line(lerp(x1, x2, 0.55), lerp(y1, y2, 0.55), x2, y2, w2 + 0.5, sock);
        for (const [ax, ay, bx, by, w] of [[x0, y0, x1, y1, w1], [x1, y1, x2, y2, w2]]) {
          const [px, py] = upPerp(bx - ax, by - ay);
          ctx.globalAlpha *= 0.16; line(ax + px * w * 0.22, ay + py * w * 0.22, bx + px * w * 0.22, by + py * w * 0.22, w * 0.3, '#ffffff'); ctx.globalAlpha /= 0.16;
          ctx.globalAlpha *= 0.2; line(ax - px * w * 0.26, ay - py * w * 0.26, bx - px * w * 0.26, by - py * w * 0.26, w * 0.28, '#000000'); ctx.globalAlpha /= 0.2;
        }
      }]);
    return { x: x2, y: y2, a: r2 };
  };
  const hand = (e, col, claws) => parts.push([
    () => { ell(e.x, e.y, aw2 * 0.62 + 2.5, aw2 * 0.62 + 2.5); ctx.fillStyle = INK; ctx.fill(); },
    () => {
      ctx.fillStyle = col; ell(e.x, e.y, aw2 * 0.62, aw2 * 0.62); ctx.fill();
      ctx.fillStyle = shade(col.startsWith('#') ? col : '#888888', 0.85); ell(e.x + dir * aw2 * 0.25, e.y - aw2 * 0.3, aw2 * 0.25, aw2 * 0.18, 0.4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x, e.y, aw2 * 0.4, -0.6 + (dir < 0 ? Math.PI : 0), 0.6 + (dir < 0 ? Math.PI : 0)); ctx.stroke();
      if (claws) { ctx.fillStyle = '#fff'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); const cx = e.x + dir * aw2 * 0.55, cy = e.y + k * aw2 * 0.3; ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + dir * aw2 * 0.6, cy); ctx.lineTo(cx, cy + 2); ctx.fill(); } }
    }]);
  const foot = (e, col) => parts.push([
    () => { ell(e.x + dir * lg2 * 0.35, e.y + lg2 * 0.12, lg2 * 0.82 + 2.5, lg2 * 0.44 + 2.5); ctx.fillStyle = INK; ctx.fill(); },
    () => {
      ctx.fillStyle = col; ell(e.x + dir * lg2 * 0.35, e.y + lg2 * 0.12, lg2 * 0.82, lg2 * 0.44); ctx.fill();
      if (fur) { ctx.fillStyle = L.furLight; for (let k = 0; k < 3; k++) { ell(e.x + dir * lg2 * (0.75 + k * 0.12), e.y + lg2 * 0.3, lg2 * 0.12, lg2 * 0.09); ctx.fill(); } }
      else { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.min(e.x - dir * lg2 * 0.45, e.x + dir * lg2 * 1.15), e.y + lg2 * 0.38, lg2 * 1.6, lg2 * 0.14); }
    }]);
  const armB = B.muscle ? 0.64 : B.belly ? 0.58 : 0, foreB = B.muscle ? 0.58 : 0, legB = B.muscle ? 0.58 : B.belly ? 0.6 : 0;

  const hip = { x: 0, y: hipY };
  const ux = dir * Math.sin(p.lean), uy = -Math.cos(p.lean);
  const sho = { x: hip.x + ux * torso, y: hip.y + uy * torso };
  const n = { x: -uy, y: ux };
  const along = (t, o, w) => ({ x: hip.x + ux * torso * t + n.x * w * o, y: hip.y + uy * torso * t + n.y * w * o });
  const legOff = waistW * (B.belly ? 0.26 : 0.16);
  const scratching = f.move === 'scratch' && MOVES.scratch.hits.some(([a, b]) => f.mt >= a - 2 && f.mt <= b + 3);

  // cape (behind everything)
  if (L.cape) {
    const wave = Math.sin(frame / 5) * 6 * s, trail = clamp(Math.abs(f.vx) * 4, 0, 30) * s;
    const bx = hip.x - dir * (h * 0.16 + trail), by = hip.y + legL * 0.72;
    const pts = [[sho.x + dir * shoW * 0.3, sho.y - 2], [sho.x - dir * shoW * 0.45, sho.y + 2], [bx - dir * 16 * s, by + wave], [bx + dir * 26 * s, by - 6 * s - wave * 0.5]];
    const path = () => { ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.quadraticCurveTo(pts[1][0] - dir * 10, (pts[1][1] + pts[2][1]) / 2, ...pts[2]); ctx.lineTo(...pts[3]); ctx.closePath(); };
    parts.push([() => { path(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke(); },
      () => { path(); const g = ctx.createLinearGradient(sho.x, sho.y, bx, by); g.addColorStop(0, L.cape); g.addColorStop(1, shade(L.cape, 0.55)); ctx.fillStyle = g; ctx.fill(); }]);
  }
  // tail
  if (L.tail) {
    const base = { x: hip.x - dir * waistW * 0.45, y: hip.y - 4 * s }, sway = Math.sin(frame / 9) * 0.25;
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = -0.5 - t * 1.4 + sway * t; pts.push([base.x - dir * Math.cos(a) * h * 0.36 * t, base.y + Math.sin(a) * h * 0.3 * t]); }
    const rad = t => lw * (L.tail === 'fox' ? 0.9 + Math.sin(t * Math.PI) * 0.9 : 1.3 + Math.sin(t * Math.PI) * 1.0);
    parts.push([() => { pts.forEach(([x, y], i) => { ell(x, y, rad(i / 10) + 2.5, rad(i / 10) + 2.5); ctx.fillStyle = INK; ctx.fill(); }); },
      () => { pts.forEach(([x, y], i) => { ell(x, y, rad(i / 10), rad(i / 10)); ctx.fillStyle = i >= 8 ? L.furLight : L.fur; ctx.fill(); }); }]);
  }
  // back arm + back leg (in shadow)
  const bA = limb(sho.x - dir * shoW * 0.3, sho.y + 4 * s, p.bu, ua, p.bl, la, aw1, aw2, shade(armCol, 0.7), shade(armCol, 0.7), armB, foreB);
  hand(bA, shade(handCol, 0.78), scratching);
  const bL = limb(hip.x - dir * legOff, hip.y, p.bt, th, p.bs, sh, lg1, lg2, shade(legTop, 0.72), shade(legLow, 0.72), legB, 0, false, L.socks && shade(L.socks, 0.8));
  foot(bL, shade(fur ? L.shoes : L.shoes, 0.78));
  if (B.belly) { const bt = along(0.08, 0, 0); parts.push([() => { ell(bt.x - dir * waistW * 0.34, bt.y + 2, waistW * 0.42 + 2.5, torso * 0.36 + 2.5); ctx.fillStyle = INK; ctx.fill(); }, () => { ell(bt.x - dir * waistW * 0.34, bt.y + 2, waistW * 0.42, torso * 0.36); ctx.fillStyle = legTop; ctx.fill(); }]); }
  const hoodie = (c.id === 'ryan' || c.id === 'darren') && !L.bare;
  if (hoodie) parts.push([() => { ell(sho.x - dir * r * 0.55, sho.y - r * 0.15, r * 0.95 + 2.5, r * 0.7 + 2.5); ctx.fillStyle = INK; ctx.fill(); }, () => { ell(sho.x - dir * r * 0.55, sho.y - r * 0.15, r * 0.95, r * 0.7); ctx.fillStyle = shade(L.shirt, 0.8); ctx.fill(); }]);

  // torso
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(hip.x + n.x * waistW / 2, hip.y + n.y * waistW / 2);
    ctx.lineTo(sho.x + n.x * shoW / 2, sho.y + n.y * shoW / 2);
    ctx.lineTo(sho.x - n.x * shoW / 2, sho.y - n.y * shoW / 2);
    ctx.lineTo(hip.x - n.x * waistW / 2, hip.y - n.y * waistW / 2);
    ctx.closePath();
  };
  const bellyGeo = () => { const bc = along(0.3, 0, 0); return { x: bc.x + dir * waistW * 0.4, y: bc.y + jig, rx: waistW * 0.72, ry: torso * 0.64 }; };
  parts.push([
    () => { torsoPath(); ctx.strokeStyle = INK; ctx.lineWidth = 8 * s + 5; ctx.stroke(); if (B.belly) { const g = bellyGeo(); ell(g.x, g.y, g.rx + 2.5, g.ry + 2.5); ctx.fillStyle = INK; ctx.fill(); } },
    () => {
      torsoPath(); ctx.fillStyle = bodyCol; ctx.strokeStyle = bodyCol; ctx.lineWidth = 8 * s; ctx.fill(); ctx.stroke();
      const tg = ctx.createLinearGradient(sho.x + n.x * shoW * 0.4, sho.y, hip.x - n.x * waistW * 0.4, hip.y);
      tg.addColorStop(0, 'rgba(255,255,255,0.16)'); tg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = tg; torsoPath(); ctx.fill();
      // clothing / body detail
      if (L.spots) { ctx.fillStyle = '#16161c'; [[0.25, 0.2], [0.55, -0.25], [0.8, 0.15], [0.45, 0.3], [0.15, -0.3]].forEach(([t, o]) => { const q = along(t, o, lerp(waistW, shoW, t)); ell(q.x, q.y, sw * 0.1, sw * 0.09); ctx.fill(); }); }
      if (hoodie) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        for (const o of [-0.12, 0.12]) { const a = along(0.95, o, shoW), b2 = along(0.62, o, shoW); line(a.x, a.y, b2.x, b2.y, 1.5, 'rgba(255,255,255,0.7)'); }
        const pk1 = along(0.3, 0.38, waistW), pk2 = along(0.3, -0.38, waistW); line(pk1.x, pk1.y, pk2.x, pk2.y, 1.5, 'rgba(0,0,0,0.35)');
      }
      if (L.bare) {
        ctx.strokeStyle = shade(c.skin, 0.7); ctx.lineWidth = 1.5;
        const pc = along(0.68, 0, 0); for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(pc.x + n.x * shoW * 0.18 * k, pc.y + n.y * shoW * 0.18 * k, shoW * 0.17, 0.3, Math.PI - 0.3); ctx.stroke(); }
        const bb = along(0.3, 0, 0); ctx.fillStyle = shade(c.skin, 0.6); ell(bb.x + dir * 2, bb.y, 1.6, 2.2); ctx.fill();
      }
      if (fur && !B.belly) { const pt = along(0.45, 0, 0); ctx.fillStyle = L.furLight; ell(pt.x + dir * waistW * 0.18, pt.y, waistW * 0.28, torso * 0.36); ctx.fill(); }
      if (L.jersey) {
        line(sho.x + n.x * shoW * 0.42, sho.y + n.y * shoW * 0.42, along(0.75, 0.48, shoW).x, along(0.75, 0.48, shoW).y, 3, '#fff');
        line(sho.x - n.x * shoW * 0.42, sho.y - n.y * shoW * 0.42, along(0.75, -0.48, shoW).x, along(0.75, -0.48, shoW).y, 3, '#fff');
        const v = along(0.78, 0, 0); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sho.x + n.x * shoW * 0.18, sho.y + n.y * shoW * 0.18); ctx.lineTo(v.x, v.y); ctx.lineTo(sho.x - n.x * shoW * 0.18, sho.y - n.y * shoW * 0.18); ctx.stroke();
        const nc = along(0.48, 0, 0); ctx.save(); ctx.translate(nc.x + dir * shoW * 0.08, nc.y); ctx.rotate(p.lean * dir);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.round(torso * 0.36)}px ${FONT}`; ctx.strokeText(L.jersey, 0, 0); ctx.fillText(L.jersey, 0, 0);
        ctx.font = `900 ${Math.round(torso * 0.15)}px ${FONT}`; ctx.fillText('BP KINGS', 0, -torso * 0.27); ctx.restore();
        const wb = along(0.02, 0, 0); line(wb.x - n.x * waistW * 0.5, wb.y - n.y * waistW * 0.5, wb.x + n.x * waistW * 0.5, wb.y + n.y * waistW * 0.5, 4, '#fff');
      }
      if (B.muscle && !L.jersey) {
        const top = along(0.92, 0, 0); ctx.fillStyle = c.skin; ell(top.x + dir * shoW * 0.08, top.y + 3 * s, shoW * 0.2, torso * 0.12); ctx.fill();
        ctx.strokeStyle = shade(bodyCol, 1.9); ctx.lineWidth = 2 * s;
        const pc = along(0.66, 0, 0); for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(pc.x + n.x * shoW * 0.2 * k, pc.y + n.y * shoW * 0.2 * k, shoW * 0.2, 0.25, Math.PI - 0.25); ctx.stroke(); }
      }
      if (B.muscle) {
        line(sho.x - n.x * shoW * 0.35, sho.y - n.y * shoW * 0.35 + 2, sho.x + ux * r * 0.6, sho.y + uy * r * 0.6, lw * 0.9, c.skin);
        line(sho.x + n.x * shoW * 0.35, sho.y + n.y * shoW * 0.35 + 2, sho.x + ux * r * 0.6, sho.y + uy * r * 0.6, lw * 0.9, c.skin);
      }
      if (B.belly) {
        const g = bellyGeo(); ctx.fillStyle = bodyCol; ell(g.x, g.y, g.rx, g.ry); ctx.fill();
        const bg2 = ctx.createRadialGradient(g.x + dir * g.rx * 0.3, g.y - g.ry * 0.4, 2, g.x, g.y, g.rx);
        bg2.addColorStop(0, 'rgba(255,255,255,0.25)'); bg2.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = bg2; ell(g.x, g.y, g.rx, g.ry); ctx.fill();
        if (fur) { ctx.fillStyle = L.furLight; ell(g.x + dir * g.rx * 0.15, g.y + g.ry * 0.1, g.rx * 0.65, g.ry * 0.7); ctx.fill(); }
        else if (!L.bare) { ctx.fillStyle = c.skin; ell(g.x + dir * g.rx * 0.08, g.y + g.ry * 0.78, g.rx * 0.72, g.ry * 0.3); ctx.fill(); }
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(g.x + dir * g.rx * 0.3, g.y + g.ry * (fur || L.bare ? 0.25 : 0.78), 2 * s, 2.5 * s); ctx.fill();
      }
      if (L.briefs) {
        const a1 = along(0.14, 0.52, waistW), a2 = along(0.14, -0.52, waistW), cr = { x: hip.x + dir * 3 * s, y: hip.y + legL * 0.14 };
        ctx.fillStyle = L.briefs; ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(hip.x - dir * waistW * 0.4, hip.y + 4 * s); ctx.lineTo(cr.x, cr.y); ctx.lineTo(hip.x + dir * waistW * 0.45, hip.y + 4 * s); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); line(a1.x, a1.y + 2, a2.x, a2.y + 2, 2, '#d8d8e0');
      }
      if (L.chain) {
        ctx.strokeStyle = L.chain; ctx.lineWidth = 2.5 * s; ctx.beginPath();
        ctx.moveTo(sho.x + n.x * shoW * 0.2, sho.y + n.y * shoW * 0.2); ctx.lineTo(sho.x - ux * torso * 0.38 + dir * 3, sho.y - uy * torso * 0.38); ctx.lineTo(sho.x - n.x * shoW * 0.2, sho.y - n.y * shoW * 0.2); ctx.stroke();
      }
      if (!B.belly && !L.bare && !fur && !L.jersey) line(hip.x + n.x * waistW / 2, hip.y + n.y * waistW / 2 - 2, hip.x - n.x * waistW / 2, hip.y - n.y * waistW / 2 - 2, 5 * s, shade(L.pants, 0.55));
    }]);

  const fL = limb(hip.x + dir * legOff, hip.y, p.ft, th, p.fs, sh, lg1, lg2, legTop, legLow, legB, 0, true, L.socks);
  foot(fL, L.shoes);
  if (c.sword) parts.push([() => {}, () => drawSword(f, { x: hip.x + dir * waistW * 0.35, y: hip.y + 2 * s }, Math.PI / 2 + 0.25 + Math.sin(frame / 7) * 0.05, h, dir, s)]);

  // neck + head
  const hc = { x: sho.x + ux * r * 0.95 + dir * r * 0.12, y: sho.y + uy * r * 0.95 };
  const neckW = lw * (B.muscle ? 1.3 : B.belly ? 1.2 : 0.7), neckCol = fur ? L.fur : c.skin;
  parts.push([() => line(sho.x, sho.y, hc.x, hc.y, neckW + 5, INK), () => line(sho.x, sho.y, hc.x, hc.y, neckW, neckCol)]);
  if (L.head) parts.push([() => drawAnimalHead(L.head, hc.x, hc.y, r, dir, p.ht * dir, L, true), () => drawAnimalHead(L.head, hc.x, hc.y, r, dir, p.ht * dir, L, false)]);
  else parts.push([
    () => { ell(hc.x - dir * r * 0.08, hc.y - r * 0.06, r * 0.95 + 2.5, r * 1.12 + 2.5); ctx.fillStyle = INK; ctx.fill(); },
    () => {
      ctx.save(); ctx.filter = 'none'; ctx.shadowBlur = 0; drawHead(c, hc.x, hc.y, r, dir < 0, p.ht * dir); ctx.restore();
      if (L.headband) { ctx.strokeStyle = L.headband; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.ellipse(hc.x, hc.y - r * 0.52, r * 0.9, r * 0.3, p.ht * dir, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
    }]);

  // front arm
  const fS = { x: sho.x + dir * shoW * 0.3, y: sho.y + 4 * s }, big = f.move === 'force' ? 1.2 : 1;
  const fA = limb(fS.x, fS.y, p.fu, ua, p.fl, la, aw1 * big, aw2 * big, armCol, armCol, armB, foreB, true);
  if (B.muscle || B.belly) parts.push([() => { ell(fS.x, fS.y, aw1 * 0.72 + 2.5, aw1 * 0.66 + 2.5); ctx.fillStyle = INK; ctx.fill(); }, () => { ctx.fillStyle = armCol; ell(fS.x, fS.y, aw1 * 0.72, aw1 * 0.66); ctx.fill(); }]);
  hand(fA, handCol, scratching);
  if (scratching) parts.push([() => {}, () => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,220,0.9)'; ctx.lineWidth = 3; ctx.shadowColor = '#ff3fa4'; ctx.shadowBlur = 12;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(fA.x - dir * 8, fA.y + k * 9 - 10, 34 * s, dir > 0 ? -0.9 : Math.PI - 0.4, dir > 0 ? 0.4 : Math.PI + 0.9); ctx.stroke(); }
    ctx.restore();
  }]);

  for (const [o] of parts) o();
  for (const [, fl] of parts) fl();
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
  } else if (p.kind === 'ball') {
    ctx.rotate(p.t * 0.2 * d); const r = p.r;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); g.addColorStop(0, '#ffab5e'); g.addColorStop(1, '#c4520f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a1206'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.9, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  } else if (p.kind === 'stare') {
    ctx.scale(d, 1); ctx.shadowColor = '#5ad1ff'; ctx.shadowBlur = 16; ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, -3); ctx.lineTo(10, -3); ctx.moveTo(-40, 3); ctx.lineTo(10, 3); ctx.stroke();
  } else if (p.kind === 'prop') {
    ctx.rotate(p.t * 0.3 * d); drawPropShape(p.obj);
  } else {
    ctx.rotate(p.t * 0.25); ctx.shadowColor = '#b44dff'; ctx.shadowBlur = 16; ctx.strokeStyle = '#e0b3ff'; ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.25) ctx.lineTo(Math.cos(a + k * Math.PI) * a * p.r / 9, Math.sin(a + k * Math.PI) * a * p.r / 9); ctx.stroke(); }
    ctx.strokeStyle = '#b44dff'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// simple 2D shapes for the stage items (the 3D renderer builds proper models)
function drawPropShape(kind) {
  const R = (w, h, c) => { ctx.fillStyle = c; ctx.fillRect(-w / 2, -h / 2, w, h); };
  if (kind === 'brick') R(24, 10, '#9a3f2c'); else if (kind === 'bottle') { R(8, 22, '#2f8f4e'); R(4, 8, '#2f8f4e'); }
  else if (kind === 'speaker') { R(30, 38, '#15151a'); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 4, 9, 0, 7); ctx.fill(); }
  else if (kind === 'pipe') R(60, 6, '#8a8f99'); else if (kind === 'vent') R(40, 6, '#9aa0aa');
  else if (kind === 'can') R(26, 36, '#6c7480'); else if (kind === 'vase') R(18, 26, '#e8e8f0'); else if (kind === 'extinguisher') R(10, 30, '#c8102e');
  else if (kind === 'dumbbell') { R(30, 4, '#333'); R(6, 14, '#111'); } else if (kind === 'stool') R(22, 26, '#6a4a2a'); else if (kind === 'cooler') R(30, 20, '#2a6ac8');
  else if (kind === 'lantern') R(16, 20, '#ffcc7a'); else if (kind === 'cone') R(16, 26, '#ff5a10');
  else if (kind === 'tire') { ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.stroke(); }
  else { ctx.fillStyle = '#d4601a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); }
}
function drawProps2D() {
  for (const p of props) {
    if (p.cd > 0) continue;
    ctx.save(); ctx.translate(p.x, FLOOR - 50); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-30, 30, 60, 20); drawPropShape(p.kind); ctx.restore();
  }
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
  if (cine && cine.hoop) { // 2D hoop
    const hx = cine.hoop.x, d = P[cine.side].facing, up = (1 - cine.hoop.rise) * 300;
    ctx.save(); ctx.translate(0, up); ctx.strokeStyle = '#555'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hx + d * 50, FLOOR); ctx.lineTo(hx + d * 50, FLOOR - 285); ctx.lineTo(hx, FLOOR - 285); ctx.stroke();
    ctx.fillStyle = '#eee'; ctx.fillRect(hx - 4, FLOOR - 320, 8, 80); ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, FLOOR - 245); ctx.lineTo(hx - d * 46, FLOOR - 245); ctx.stroke(); ctx.restore();
  }
  if (cine && cine.mate) { const m = mateFrom(cine.mate); drawFighter(m, m.x, m.y, 0); }
  for (const f of order) {
    if (f.gone) continue;
    if (f.squash || f.sink) { ctx.save(); ctx.translate(f.x, FLOOR); ctx.scale(1 + (f.squash || 0) * 0.3, 1 - (f.squash || 0) * 0.62); ctx.translate(-f.x, -FLOOR + (f.sink || 0) * f.h * 0.5); drawFighter(f, f.x, f.y, 0); ctx.restore(); }
    else drawFighter(f, f.x, f.y, 0);
  }
  for (const f of P) drawStatus(f);
}
