// ---------- BON BON BLUE (fictional): support. Moves her team about and keeps them alive; her bon bons burn ----------
// Her look and stats are in core.js; hooks in fighter.js / roles.js / game.js (1v1), squads.js, human.js (the braid)
// and render3d.js (the puddles, the bon bons).
Object.assign(ROLE_OF, { bonbon: 'support' });
Object.assign(ABIL, {
  bonbon: { a1: ['SWEET RELIEF', 'Heals 14% of your health over 3 s (and teammates close by in Squads).'],
    a2: ['CANDY SPLASH', 'Throws a big bon bon. Where it lands it leaves a puddle for 8 s: teammates in it heal, enemies in it burn for a long time. A direct hit on an enemy hurts and sets them alight; on a teammate it heals them.'], a2m: 'candythrow', a2i: 'candy' },
});
Object.assign(RANGED, { bonbon: ['bonboncast', 'BLUE BON BON', 'A blue bon bon that splashes where it lands and sets anyone of theirs close by on fire.'] });
const BURN_PER = 0.075; // health a frame while burning (a little over 4 a second)
// arcing throws: the splash and the puddle happen where they land (or on a direct hit)
Object.assign(PROJ, {
  bonbon: { speed: 10, r: 11, dmg: 6, kb: 4, stun: 14, hs: 5, arc: 1, land: 'splash', burn: 150 },
  candy: { speed: 9, r: 14, dmg: 9, kb: 5, stun: 18, hs: 6, arc: 1, land: 'pool', burn: 330, ally: 1 },
});
Object.assign(MOVES, {
  bonboncast: { dur: 26, start: 10, end: 11, cast: 'proj', proj: 'bonbon',
    wind: { fu: 2.7, fl: 3.2, bu: 0.4, bl: 1.0, lean: -0.15, tw: -0.4 }, hit: { fu: 1.7, fl: 1.8, bu: 0.4, bl: 1.0, lean: 0.25, tw: 0.4, lunge: 0.05 } },
  candythrow: { dur: 32, start: 13, end: 14, cast: 'proj', proj: 'candy',
    wind: { fu: 2.9, fl: 3.3, bu: 2.8, bl: 3.2, lean: -0.3, crouch: 0.1 }, hit: { fu: 1.7, fl: 1.8, bu: 1.6, bl: 1.7, lean: 0.3, lunge: 0.1 } },
  // SUGAR RUSH (skill): a long candy dash; she and her team close by get faster for 5 s and a little health
  sugarrush: { dur: 32, start: 4, end: 22, dash: 16, cast: 'rushbuff', line: 'Wheee!',
    wind: { crouch: 0.2, lean: 0.4, fu: 0.2, fl: 0.6, bu: -0.4, bl: 0.4, ft: 0.6, bt: -0.6 }, hit: { lean: 0.5, crouch: 0.1, fu: -0.6, fl: 0.3, bu: -0.6, bl: 0.3, ft: 1.0, fs: 0.4, bt: -0.9, bs: -0.6, spread: 0.3 } },
  // SUGAR HIGH (super): heals her whole team 35% over 4 s, makes them fast for 6 s, and leaves a big puddle at her feet
  sugarhigh: { dur: 40, start: 18, end: 20, cast: 'sugarhigh', line: 'Sugar high!',
    wind: { crouch: 0.3, fu: 0.6, fl: 1.2, bu: 0.6, bl: 1.2 }, hit: { fu: 2.9, fl: 3.3, bu: 2.9, bl: 3.3, ht: -0.35, spread: 0.7, lean: -0.1 } },
});
Object.assign(INTRO_LINES, { bonbon: ['Sweet!', 'Want a bon bon?', "Don't worry, I've got you.", 'Careful, it burns.'] });
Object.assign(SHOWPOSE, { bonbon: t => mk({ fu: 0.4, fl: 0.8, bu: 1.6, bl: 2.9, lean: -0.05, ht: -0.1 + Math.sin(t / 26) * 0.04, hy: 0.15, spread: 0.2 }) }); // a wave
Object.assign(STYLE, {
  bonbon: { stance: { lean: 0.02, crouch: 0.08, fu: 0.9, fl: 2.2, bu: 0.6, bl: 2.3, spread: 0.15, ft: 0.26, fs: 0.04, bt: -0.2, bs: -0.28, ht: -0.04 },
    idle: (p, t) => { const b = Math.sin(t / 14); p.crouch += Math.abs(b) * 0.03; p.hy += Math.sin(t / 40) * 0.08; p.fl += b * 0.06; },
    walk: { stride: 0.4, bob: 0.02, arms: 0.14, lean: 0.03, sway: 0.08 }, moves: {} },
});

// ---- 1v1: puddles, burning, the rush ----
let bpools = [];
function burnOn(f, t) { if (!(f.burnT > 0)) fx('text', f.x, f.y - f.h * f.scale - 40, 'BURNING', '#ff8a3a'); f.burnT = Math.max(f.burnT || 0, t); }
function bonbonLand1v1(p) {
  const P2 = PROJ[p.kind], owner = P[p.owner], foe = P[1 - p.owner], x = p.x;
  fx('ring', x, FLOOR - 10, '#4f8fe8', 5); fx('sparks', x, FLOOR - 20, '#7ab8ff', 12); fx('sparks', x, FLOOR - 20, '#ff8a3a', 6); sfx('heavy');
  if (P2.land === 'splash') { if (foe && hittable(foe) && Math.abs(foe.x - x) < 100) { applyHit(owner, foe, Object.assign({ proj: 1 }, P2), Math.sign(foe.x - x) || 1, foe.x, FLOOR - 60); burnOn(foe, P2.burn); } }
  else bpools.push({ side: p.owner, x, r: 120, t: 480 });
}
function bonbonHit1v1(p, foe) { const P2 = PROJ[p.kind]; if (!foe.blocking) burnOn(foe, P2.burn); fx('sparks', p.x, p.y, '#7ab8ff', 10); if (P2.land === 'pool') bpools.push({ side: p.owner, x: foe.x, r: 120, t: 480 }); }
function bonbonTick() {
  for (const z of bpools.slice()) { if (--z.t <= 0) { bpools = bpools.filter(o => o !== z); continue; }
    const me = P[z.side], foe = P[1 - z.side];
    if (frame % 3 === 0) parts.push({ k: 's', x: z.x + (rand() - 0.5) * z.r * 2, y: FLOOR - 4, vx: 0, vy: -1 - rand(), life: 30, max: 30, c: rand() < 0.5 ? '#4f8fe8' : '#ff8fc8' });
    if (z.t % 30 === 0) { if (me && !me.ko && Math.abs(me.x - z.x) < z.r) me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.012); if (foe && hittable(foe) && Math.abs(foe.x - z.x) < z.r) burnOn(foe, 240); } }
}
function sugarCast1v1(f, M) {
  if (M.cast === 'rushbuff') { f.rushT = 300; f.healT = 90; f.healPer = f.maxHp * 0.06 / 90; fx('ring', f.x, f.y - f.h * f.scale * 0.5, '#7ab8ff', 4); }
  else { f.healT = 240; f.healPer = f.maxHp * 0.35 / 240; f.rushT = 360; bpools.push({ side: f.side, x: f.x, r: 200, t: 600 }); fx('ring', f.x, f.y - f.h * f.scale * 0.5, '#ff8fc8', 7); shake = 8; }
}

// ---- Squads: puddles (host-run, synced with the world) ----
function sqBonbonLand(r) {
  const G = SQ.G, P2 = PROJ[r.kind], by = sqP(r.by), gy = SQ.map ? sqGround(r.x, r.z, r.y) : 0;
  sqEvent(['fx', 'ring', r.x, gy + 0.1, r.z, '#4f8fe8']); sqEvent(['fx', 'heavy', r.x, gy + 0.3, r.z, '#7ab8ff']);
  if (P2.land === 'splash') { for (const t of G.players) { if (t.team === r.team || !sqHittable(t) || Math.hypot(t.x - r.x, t.z - r.z) > 2.2) continue;
      const dmg = sqDamage(t, P2.dmg * (by ? by.pow : 1) * 1.2, by); sqEvent(['h', t.id, t.x, t.y + 1.2, t.z, Math.round(dmg), 0, 0, 'BURN']); sqBurn(t, P2.burn, r.by); } }
  else sqPool(r.team, r.by, r.x, r.z, 3, 480);
}
function sqBurn(t, n, by) { if (!(t.burnT > 0)) sqEvent(['h', t.id, t.x, t.y + 2.2, t.z, 0, 0, 0, 'BURNING']); t.burnT = Math.max(t.burnT || 0, n); t.burnBy = by; }
function sqPool(team, by, x, z, r, t) { const G = SQ.G; G.pools = (G.pools || []).filter(o => !(o.by === by && o.big === (r > 4))); G.pools.push({ id: ++G.pid, team, by, x, z, r, t, big: r > 4 }); }
// a direct hit with the big bon bon on someone of her own: heals them
function sqCandyAlly(r, a) { a.healT = 120; a.healPer = a.maxHp * 0.16 / 120; sqEvent(['h', a.id, a.x, a.y + 2, a.z, 0, 0, 0, '+HEAL']); sqEvent(['buff', a.id, r.by, 'heal']); sqPool(r.team, r.by, a.x, a.z, 3, 480); }
function sqBonbonHost() {
  const G = SQ.G;
  for (const z of (G.pools || []).slice()) { if (--z.t <= 0) { G.pools = G.pools.filter(o => o !== z); continue; } if (z.t % 30) continue;
    for (const p of G.players) { if (!p.alive || Math.hypot(p.x - z.x, p.z - z.z) > z.r) continue;
      if (p.team === z.team) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.012); else if (sqHittable(p)) sqBurn(p, 240, z.by); } }
}
function sqSugarCast(p, M) {
  const G = SQ.G;
  if (M.cast === 'rushbuff') { for (const a of G.players) { if (a.team !== p.team || !a.alive || Math.hypot(a.x - p.x, a.z - p.z) > 6) continue; sqEvent(['rush', a.id, 300]); a.healT = 90; a.healPer = a.maxHp * 0.06 / 90; } sqEvent(['fx', 'ring', p.x, 0.3, p.z, '#7ab8ff']); }
  else { for (const a of G.players) { if (a.team !== p.team || !a.alive) continue; a.healT = 240; a.healPer = a.maxHp * 0.35 / 240; sqEvent(['rush', a.id, 360]); sqEvent(['h', a.id, a.x, a.y + 2.2, a.z, 0, 0, 0, 'SUGAR HIGH']); sqEvent(['buff', a.id, p.id, 'heal']); }
    sqPool(p.team, p.id, p.x, p.z, 5, 600); sqEvent(['fx', 'ring', p.x, 0.3, p.z, '#ff8fc8']); }
}

// ---- finisher: SWEET DREAMS. A giant bon bon, a blue blaze, lights out ----
Object.assign(FIN_LEN, { sweet: 210 });
FIN_SCRIPTS.sweet = function (cn, w, l, t, d, k, launch) {
  if (t === 4) say('bonbon', 'Sweet dreams!');
  if (t < 46) { w.finPose = SHOWPOSE.bonbon(frame); shot(cn, 1, { x: w.x + d * 4, y: w.y - w.h * 0.86, yaw: d * 0.3, dist: 1.4, fov: 22, lift: -0.3 }); }
  else if (t < 70) { w.finPose = lp(w.finPose, finP({ fu: 2.9, fl: 3.3, bu: 2.8, bl: 3.2, lean: -0.3, crouch: 0.1 }), 0.25); shot(cn, 2, { x: lerp(w.x, l.x, 0.5), y: FLOOR - 120, yaw: d * 0.4, dist: 4.2, fov: 30 }); }
  else if (t < 160) { w.finPose = lp(w.finPose, finP({ fu: 1.7, fl: 1.8, bu: 1.6, bl: 1.7, lean: 0.3, lunge: 0.1 }), 0.2);
    l.dazed = true; l.vx = 0; if (t === 72) { fx('impact', l.x, l.y - l.h * 0.6, '#7ab8ff', 2.4); fx('ring', l.x, l.y - l.h * 0.6, '#4f8fe8', 7); sfx('heavy'); shake = 16; }
    for (let i = 0; i < 3; i++) parts.push({ k: 's', x: l.x + (rand() - 0.5) * 60, y: l.y - rand() * l.h, vx: (rand() - 0.5) * 1.5, vy: -1.5 - rand() * 2, life: 30, max: 30, c: rand() < 0.5 ? '#4f8fe8' : '#9fd0ff' });
    l.finPose = finP({ crouch: 0.15 + k(72, 150) * 0.3, lean: -0.2, ht: -0.4, fu: 2.6, fl: 2.4, bu: 2.5, bl: 2.3, spread: 0.6, rot: Math.sin(t / 5) * 0.05 });
    shot(cn, 3, { x: l.x, y: FLOOR - 110, yaw: -d * 0.35, dist: 3.6, fov: 30 }); }
  else { if (t === 160) launch(d * 3, -4, 0); w.finPose = lp(w.finPose, SHOWPOSE.bonbon(frame), 0.08); shot(cn, 4, { x: w.x, y: w.y - w.h * 0.86, yaw: d * 0.3, dist: 1.5, fov: 22 }); }
};
