// ---------- champion roles: frontline, support, flank, attack (like Paladins) ----------
// Every champion has a role. Roles counter each other in a ring: flanks overpower supports, supports overpower
// attackers, attackers overpower frontlines, frontlines overpower flanks (+15% damage against the role you counter,
// -10% against the one that counters you). Each role plays differently:
//   FRONTLINE  tougher (takes 12% less damage); ability: a shield on yourself (and teammates close by in Squads)
//   SUPPORT    heals a little in the middle of a fight; ability: a heal over time (teammates close by too)
//   FLANK      12% quicker on their feet, hits a little lighter; two abilities: a blink behind them, and a low
//              trip that slows them down (they disrupt supports and frontlines)
//   ATTACK     10% more damage (skills 15%); ability: a heavy blast that hits hard
// Abilities: C (and X for a flank's second) on the keyboard, R3 on a controller, ABIL buttons on a touch screen.
const ROLES = {
  frontline: { name: 'FRONTLINE', col: '#ffb347', beats: 'flank', icon: '⛨' },
  support: { name: 'SUPPORT', col: '#3ddc84', beats: 'attack', icon: '✚' },
  flank: { name: 'FLANK', col: '#2ee6c8', beats: 'support', icon: '➶' },
  attack: { name: 'ATTACK', col: '#ff4a5a', beats: 'frontline', icon: '✦' },
};
const ROLE_OF = { frank: 'frontline', tung: 'frontline', blake: 'support', julian: 'support', darren: 'flank', verity: 'flank', ryan: 'attack', clav: 'attack', hexum: 'attack' };
// each champion's take on their role's ability (the flank's second ability is a2)
const ABIL = {
  frank: { a1: ['ENFORCER WALL', 'A shield worth 14% of your health for 6 s.'] },
  tung: { a1: ['BARK SKIN', 'Hardens like old wood: a shield worth 14% of your health for 6 s.'] },
  blake: { a1: ['ADAPT & RECOVER', 'Heals 14% of your health over 3 s.'] },
  julian: { a1: ['HEALING TIDE', 'Cool water: heals 14% of your health over 3 s.'] },
  darren: { a1: ['BLINK', 'Vanish and reappear right behind them.'], a2: ['MIND TRIP', 'A quick low strike that slows them for 3 s.'] },
  verity: { a1: ['SHADOW STEP', 'Turns black and steps out of their shadow, behind them.'], a2: ['CREEPING GRIN', 'A low swipe that slows them for 3 s.'] },
  ryan: { a1: ['SWORD BEAM', 'A beam off the blade that hits hard.'] },
  clav: { a1: ['JAW BREAKER', 'A heavy blast of pure jawline.'] },
  hexum: { a1: ['COLD SHOULDER', 'A heavy blast of cold approach.'] },
};
const ABIL_CD = { frontline: 12 * 60, support: 12 * 60, flank: 7 * 60, attack: 8 * 60 }, ABIL2_CD = 6 * 60;
const roleOf = f => ROLE_OF[(f.c || f).id] || 'attack';
const abilOf = f => ABIL[(f.c || f).id] || { a1: ['POWER STRIKE', 'A heavy blast.'] };
// how much harder att hits def, from their roles
function roleVs(att, def) { if (!att || !def || !att.c || !def.c) return 1; const a = roleOf(att), d = roleOf(def); return ROLES[a].beats === d ? 1.15 : ROLES[d].beats === a ? 0.9 : 1; }
const roleDmg = f => ({ attack: 1.1, flank: 0.92 })[roleOf(f)] || 1;
const roleTaken = f => roleOf(f) === 'frontline' ? 0.88 : 1;
const roleSpeed = f => roleOf(f) === 'flank' ? 1.12 : 1;
const inCombat = f => frame - (f.combatT || -9999) < 300; // hit or been hit in the last 5 s

// once a frame: cooldowns, heals over time, shields running out, slows wearing off; supports patch themselves up mid-fight
function roleTick(f) {
  if (f.abilCd > 0) f.abilCd--; if (f.abil2Cd > 0) f.abil2Cd--; if (f.slowT > 0) f.slowT--;
  if (f.shieldT > 0 && --f.shieldT === 0) f.shield = 0;
  const top = f.bar ? f.maxHp / 2 : f.maxHp, heal = n => { if (!f.ko && !f.dazed && f.hp > 0) f.hp = Math.min(top, f.hp + n); };
  if (f.healT > 0) { f.healT--; heal(f.healPer || 0); }
  if (roleOf(f) === 'support' && inCombat(f) && frame % 30 === 0) heal(f.maxHp * 0.003); // ~0.6% a second while fighting
}
// a shield soaks damage before health does; returns what gets through
function shieldSoak(def, dmg) { if (!(def.shield > 0)) return dmg; const s = Math.min(def.shield, dmg); def.shield -= s; if (def.shield <= 0) { def.shield = 0; def.shieldT = 0; fx('text', def.x, def.y - def.h * def.scale - 30, 'SHIELD DOWN', '#ffb347'); } return dmg - s; }

// use your ability (which: 1, or 2 for a flank's second)
function roleAbility(f, foe, which) {
  const r = roleOf(f), A = abilOf(f), s = f.scale, top = f.y - f.h * s;
  if (which === 2) { if (r !== 'flank' || f.abil2Cd > 0) return false; f.abil2Cd = ABIL2_CD; fx('text', f.x, top - 30, A.a2 ? A.a2[0] : 'TRIP', ROLES.flank.col); startMove(f, 'trip'); return true; }
  if (f.abilCd > 0) return false; f.abilCd = ABIL_CD[r];
  fx('text', f.x, top - 30, A.a1[0], ROLES[r].col); sfx('skill');
  if (r === 'frontline') { f.shield = f.maxHp * 0.14; f.shieldT = 360; fx('ring', f.x, f.y - f.h * s / 2, ROLES.frontline.col, 5); shake = Math.max(shake, 5); }
  else if (r === 'support') { f.healT = 180; f.healPer = f.maxHp * 0.14 / 180; fx('ring', f.x, f.y - f.h * s / 2, ROLES.support.col, 5); }
  else if (r === 'flank') { // blink: out of sight, then right behind them
    const behind = foe.x + (foe.facing || 1) * -1 * (foe.bw * foe.scale * 0.5 + f.bw * s * 0.5 + 24), E = arenaEdges();
    fx('dust', f.x, FLOOR, 8); f.vanish = 10; f.x = clamp(behind, E[0] + 40, E[1] - 40); f.facing = foe.x > f.x ? 1 : -1; f.vx = 0; fx('ring', f.x, f.y - f.h * s / 2, f.c.id === 'verity' ? '#050307' : ROLES.flank.col, 4);
    if (f.c.id === 'verity') f.shadowT = Math.max(f.shadowT || 0, 40); sfx('dodge');
  } else startMove(f, 'blastcast'); // attack: the heavy blast
  return true;
}
// the moves behind them: the flank's trip and the attacker's blast
Object.assign(MOVES, {
  trip: { dur: 26, start: 7, end: 11, dmg: 5, limb: 'leg', rm: 1.1, hy: 0.1, kb: 2, stun: 18, hs: 5, slow: 180, dash: 3,
    wind: { crouch: 0.4, lean: 0.2, ft: 0.5, fs: 0.2 }, hit: { crouch: 0.5, lean: 0.3, ft: 1.4, fs: 1.5, bt: -0.25, bs: -1.4, fu: 0.9, fl: 0.4 } },
  blastcast: { dur: 34, start: 14, end: 16, cast: 'proj', proj: 'blast',
    wind: { fu: 2.6, fl: 2.9, bu: 2.4, bl: 2.8, lean: -0.18, crouch: 0.18 }, hit: { fu: 1.55, fl: 1.55, bu: 1.5, bl: 1.5, lean: 0.3, lunge: 0.08 } },
});
PROJ.blast = { speed: 13, r: 17, dmg: 15, kb: 10, stun: 26, hs: 9 };
