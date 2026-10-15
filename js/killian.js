// ---------- KILLIAN MGAPPE (fictional): frontline. A built 6'1" ninja turtle in a (made-up) French kit, two bamboo sticks ----------
// His look and stats are in core.js; hooks in fighter.js / roles.js (1v1), squads.js (Squads), human.js (the shell, the
// mask, the sticks, the forcefield) and render3d.js (the thrown sticks, the spin).
Object.assign(ROLE_OF, { killian: 'frontline' });
Object.assign(ABIL, {
  killian: { a1: ['FORCEFIELD', 'A forcefield round him: he takes NO damage for 10 s, and teammates close by get 30% health back and a 30% shield. (Only a super breaks it.)'], a1m: 'forcefield', a1i: 'forcefield', cdMul: 2.5,
    a2: ['SHELL SPIN', 'Sits on his shell and spins like mad: steer it wherever you like; everyone it touches gets blasted away.'], a2m: 'shellspin', a2i: 'shellspin', cd2Mul: 1.6 },
});
Object.assign(RANGED, { killian: ['bamboothrow', 'BAMBOO THROW', 'Throws both bamboo sticks, spinning: it hits hard.'] });
PROJ.bamboo = { speed: 15, r: 16, dmg: 15, kb: 10, stun: 24, hs: 9, heavy: 1 };
const FF_T = 600; // the forcefield: 10 s

Object.assign(MOVES, {
  // SHELL UP (skill): crouches behind his shell: can't be staggered for 2.5 s and a 20% shield
  shellup: { dur: 26, start: 8, end: 10, cast: 'shellup',
    wind: { crouch: 0.35, lean: 0.25, fu: 2.4, fl: 0.5, bu: 2.3, bl: 0.5, ht: 0.2 }, hit: { crouch: 0.4, lean: 0.35, fu: 2.6, fl: 0.4, bu: 2.5, bl: 0.4, ht: 0.25, spread: -0.1 } },
  forcefield: { dur: 30, start: 10, end: 12, cast: 'forcefield', line: 'Bouclier !',
    wind: { crouch: 0.3, fu: 1.4, fl: 1.4, bu: 1.4, bl: 1.4, spread: 0.3 }, hit: { fu: 2.8, fl: 3.1, bu: 2.8, bl: 3.1, spread: 0.7, ht: -0.25 } },
  bamboothrow: { dur: 28, start: 11, end: 12, cast: 'proj', proj: 'bamboo',
    wind: { fu: 2.8, fl: 3.2, bu: 2.7, bl: 3.1, lean: -0.25, tw: -0.4 }, hit: { fu: 1.6, fl: 1.4, bu: 1.5, bl: 1.3, lean: 0.35, tw: 0.4, lunge: 0.08 } },
  // SHELL SPIN (ability 2): 2.3 s on his shell, spinning, steered by you; blasts away everyone it touches (all round him)
  shellspin: { dur: 140, start: 8, end: 132, hits: [[10, 13], [24, 27], [38, 41], [52, 55], [66, 69], [80, 83], [94, 97], [108, 111], [122, 125]], dmg: 4, reach: 46, hy: 0.3, kb: 42, stun: 18, hs: 4, kd: 1, launch: -9,
    armor: 1, around: 1, steer: 1, dash: 7.5, spin: 1, hitText: '',
    wind: { crouch: 0.7, lean: -0.35, fu: 1.5, fl: 0.3, bu: 1.5, bl: 0.3, spread: 0.9, ft: 1.5, fs: 0.2, bt: 1.4, bs: 0.2 }, hit: { crouch: 0.75, lean: -0.4, fu: 1.6, fl: 0.2, bu: 1.6, bl: 0.2, spread: 1.0, ft: 1.6, fs: 0.1, bt: 1.5, bs: 0.1 } },
  // BAMBOO STORM (super): nine bamboo strikes in a whirl, the last one sends them flying
  bamboostorm: { dur: 78, start: 6, end: 60, hits: [[6, 9], [12, 15], [18, 21], [24, 27], [30, 33], [36, 39], [42, 45], [48, 51], [55, 60]], lastKd: 1, lastFx: 'BAMBOO STORM!', dmg: 6, limb: 'bat', rm: 1.0, hy: 0.7, hh: 0.34, kb: 4, stun: 22, hs: 6, launch: -13, superHit: 1, armor: 1, dash: 3.2, line: 'Allez !',
    wind: { fu: 2.6, fl: 3.0, bu: 2.4, bl: 2.9, crouch: 0.3, lean: 0.1 }, hit: { fu: 1.4, fl: 1.2, bu: 1.3, bl: 1.1, lean: 0.35, crouch: 0.2, tw: 0.6, lunge: 0.08 },
    combo: [[{ tw: -0.8 }, { tw: 0.8, fu: 1.5, fl: 1.3 }], [{ tw: 0.8 }, { tw: -0.8, bu: 1.5, bl: 1.3 }], [{ fu: 2.9, fl: 3.1 }, { fu: 1.2, fl: 1.0, lean: 0.4 }], [{ tw: -1.0 }, { tw: 1.0 }], [{ crouch: 0.5 }, { crouch: 0.5, fu: 1.0, fl: 0.8, tw: 0.7 }],
      [{ tw: 0.9 }, { tw: -0.9 }], [{ fu: 2.9, bu: 2.9 }, { fu: 1.3, bu: 1.3, lean: 0.4 }], [{ tw: -1.2 }, { tw: 1.2, lunge: 0.1 }], [{ crouch: 0.45, fu: 2.9, fl: 3.2, bu: 2.8, bl: 3.1 }, { fu: 1.7, fl: 1.6, bu: 1.6, bl: 1.5, lean: 0.4, crouch: 0.1, lunge: 0.12 }]] },
});
Object.assign(INTRO_LINES, { killian: ['Allez les Bleus !', 'On y va.', 'Coup de bambou !', 'La tortue est là.'] }); // he speaks French
Object.assign(SHOWPOSE, { killian: t => mk({ crouch: 0.32, lean: 0.25, fu: 1.6, fl: 1.4, bu: 1.4, bl: 1.6, spread: 0.35, ft: 0.6, fs: 0.3, bt: -0.5, bs: -0.6, ht: -0.12 + Math.sin(t / 30) * 0.02 }) });
Object.assign(STYLE, {
  // low and ready: knees bent wide, both sticks up and out in front
  killian: { stance: { crouch: 0.26, lean: 0.2, fu: 1.45, fl: 1.5, bu: 1.3, bl: 1.7, spread: 0.3, ft: 0.55, fs: 0.25, bt: -0.48, bs: -0.55, ht: -0.1 },
    idle: (p, t) => { const b = Math.sin(t / 12); p.fu += b * 0.08; p.bu -= b * 0.08; p.crouch += Math.abs(Math.sin(t / 24)) * 0.03; p.tw += Math.sin(t / 30) * 0.08; },
    walk: { stride: 0.38, bob: 0.02, arms: 0.06, lean: 0.06 }, moves: {} },
});
// what he does with a cast (both modes call these)
function killianCast1v1(f, M) {
  const s = f.scale;
  if (M.cast === 'shellup') { f.armor = Math.max(f.armor || 0, 150); f.shield = Math.max(f.shield || 0, f.maxHp * 0.2); f.shieldT = 240; fx('ring', f.x, f.y - f.h * s * 0.5, '#4fa0ff', 4); fx('text', f.x, f.y - f.h * s - 30, 'SHELL UP', '#4fa0ff'); sfx('block'); }
  else if (M.cast === 'forcefield') { f.ffT = FF_T; fx('ring', f.x, f.y - f.h * s * 0.5, '#7ad8ff', 7); fx('text', f.x, f.y - f.h * s - 40, 'FORCEFIELD', '#7ad8ff'); sfx('skill'); shake = 6; }
}
// 1v1 SHELL SPIN: steer it left / right
function spinSteer(f, inp) { const d = (inp && ((inp.right ? 1 : 0) - (inp.left ? 1 : 0))) || 0; if (d) f.facing = d; f.vx = f.facing * MOVES.shellspin.dash; if (frame % 2 === 0) fx('dust', f.x, FLOOR, 2); }

// ---- finisher: TURTLE POWER. He leaps, lands shell-first on them, and spins on top of them ----
Object.assign(FIN_LEN, { turtle: 230 });
FIN_SCRIPTS.turtle = function (cn, w, l, t, d, k, launch) {
  if (t === 4) say('killian', 'Coup de grâce.');
  if (t < 44) { w.finPose = SHOWPOSE.killian(frame); shot(cn, 1, { x: w.x + d * 4, y: w.y - w.h * 0.8, yaw: d * 0.35, dist: 1.6, fov: 24, lift: -0.3 }); }
  else if (t < 86) { const q = k(44, 82); if (t === 44) cn.jx = w.x; w.x = lerp(cn.jx, l.x, q); w.y = FLOOR - Math.sin(q * Math.PI) * 280; l.dazed = true; l.vx = 0;
    w.finPose = finP({ crouch: 0.75, lean: -0.4, fu: 1.6, fl: 0.2, bu: 1.6, bl: 0.2, spread: 1.0, ft: 1.6, fs: 0.1, bt: 1.5, bs: 0.1, rot: q * 3.1 });
    shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 180, yaw: -d * 0.3, dist: 5, fov: 34, lift: 0.3 }); }
  else if (t < 170) {
    if (t === 86) { w.y = FLOOR - 40; l.dazed = false; l.ko = true; l.kd = 2; l.squash = 1; l.finPose = null; fx('crater', l.x, 2); fx('impact', l.x, FLOOR - 20, '#4fa0ff', 2.4); sfx('heavy'); sfx('brk'); shake = 30; cam.kick = 0.14; cam.hx = l.x; cam.hy = FLOOR - 30; screenFlash = 5; slowmo = 16; }
    w.x = l.x; w.y = FLOOR - 40; w.yawW = (t * 0.6) % (Math.PI * 2); w.finPose = finP({ crouch: 0.75, lean: -0.4, fu: 1.6, fl: 0.2, bu: 1.6, bl: 0.2, spread: 1.0, ft: 1.6, fs: 0.1, bt: 1.5, bs: 0.1 });
    if (t % 4 === 0) fx('sparks', l.x, FLOOR - 20, '#ffffff', 3);
    shot(cn, 3, { x: l.x, y: FLOOR - 90, yaw: d * 0.3, dist: 4.2, fov: 32 }); }
  else { if (t === 170) { w.yawW = null; w.y = FLOOR; w.x = l.x - d * 90; } w.finPose = lp(w.finPose, SHOWPOSE.killian(frame), 0.08); shot(cn, 4, { x: w.x, y: w.y - w.h * 0.8, yaw: d * 0.3, dist: 1.8, fov: 24 }); }
};

// ---------- SUPERS (everyone): only a perfect block stops one; a late block, a guard or a shield gets broken and it lands anyway;
// and a fighter in the middle of their super can't be interrupted (only knocked out) ----------
const superOn = f => !!(f && f.move && f.c && f.move === f.c.super.move);
const sqSuperOn = p => !!(p && p.mv && p.mv === p.f.c.super.move);
const SUPER_PERFECT = 12; // frames after you start blocking that still count as perfect against a super
