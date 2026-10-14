// ---------- the 3D arena: fight all over the floor, not just along one line ----------
// The fight logic stays on a line, as in every 2.5D fighter: x along it, y up. In the 3D arena that line turns
// and slides across the floor. Step sideways and you circle your opponent (the line turns about them), so the
// two of you can fight anywhere on the floor while every move, combo, throw and finisher works as before.
// Things that fly (waves, balls, thrown items) carry on in a straight line through the world, so you can step
// round them. Stage items stay where they are on the floor. Everything here is in game pixels (1 px = 1 cm).
const arena = { th: 0, s: 0, a: 0, goal: null, side: 1 }; // th: the line's turn; s: how far it sits off the centre sideways; a: along itself
let ARENA_RX = 750, ARENA_RZ = 470, ARENA_CZ = 0; // (CZ: how far the floor's middle sits off the stage's, toward the camera) // the floor you fight on: an ellipse (up to 15 m wide, 9.4 m deep) sized to each stage's open floor
const stormMode = () => gfx.camera !== 'classic' && gfx.renderer === '3d'; // the 3D arena (circle, sidestep, camera all round); off: the classic side-on fight
const stormOn = () => stormMode() && use3D() && P.length === 2;
const aDir = th => [Math.cos(th), -Math.sin(th)], aNrm = th => [Math.sin(th), Math.cos(th)]; // the line's direction and its sideways normal, on the floor (x, z)
const wrapPi = a => { a = (a + Math.PI) % (Math.PI * 2); return (a < 0 ? a + Math.PI * 2 : a) - Math.PI; };
// line coordinates (x along the line, l sideways off it) <-> the floor (X, Z), centred on the stage
function arenaToWorld(x, l, A) {
  A = A || arena; const d = aDir(A.th), n = aNrm(A.th), t = x - WW / 2 + A.a, u = A.s + (l || 0);
  return [d[0] * t + n[0] * u, d[1] * t + n[1] * u];
}
function arenaFromWorld(X, Z, A) {
  A = A || arena; const d = aDir(A.th), n = aNrm(A.th);
  return [WW / 2 + (X * d[0] + Z * d[1]) - A.a, (X * n[0] + Z * n[1]) - A.s];
}
// turn the line by dth about the point at x on it (that point stays put on the floor)
function arenaTurn(dth, x) {
  const [X, Z] = arenaToWorld(x, 0); arena.th = wrapPi(arena.th + dth);
  const d = aDir(arena.th), n = aNrm(arena.th);
  arena.s = X * n[0] + Z * n[1]; arena.a = X * d[0] + Z * d[1] - (x - WW / 2);
}
// slide the line sideways (everyone on it moves together)
function arenaSlide(dl) { arena.s += dl; }
// where the floor ends along the line: the ellipse's chord (the classic stage when the line sits in the middle)
function arenaEdges() {
  if (!stormOn()) return [0, WW];
  const d = aDir(arena.th), n = aNrm(arena.th), rx2 = ARENA_RX * ARENA_RX, rz2 = ARENA_RZ * ARENA_RZ, s = arena.s, ox = n[0] * s, oz = n[1] * s - ARENA_CZ;
  const A = d[0] * d[0] / rx2 + d[1] * d[1] / rz2, B = 2 * (ox * d[0] / rx2 + oz * d[1] / rz2), C = ox * ox / rx2 + oz * oz / rz2 - 1;
  const disc = B * B - 4 * A * C; if (disc <= 0) return [WW / 2 - 200 - arena.a, WW / 2 + 200 - arena.a];
  const r = Math.sqrt(disc), t1 = (-B - r) / (2 * A), t2 = (-B + r) / (2 * A);
  return [WW / 2 + t1 - arena.a, WW / 2 + t2 - arena.a];
}
function arenaReset() {
  Object.assign(arena, { th: 0, s: 0, a: 0, goal: null, side: 1 });
  const S = window.R3D && R3D.ready && R3D.arenaSize ? R3D.arenaSize(stageId) : null; ARENA_RX = S ? S.rx : 750; ARENA_RZ = S ? S.rz : 470; ARENA_CZ = S && S.cz ? S.cz : 0;
}
// once a frame, after both fighters moved: sidesteps turn the line, flying things keep their course, items stay put
function arenaTick() {
  if (!stormOn()) { if (arena.th || arena.s || arena.a) arenaReset(); for (const f of P) f.lv = 0; return; }
  // what flies keeps its place and heading in the world while the line turns under it
  const fly = projs.map(p => { const [X, Z] = arenaToWorld(p.x, p.lat || 0), d = aDir(arena.th), n = aNrm(arena.th), vl = p.vl || 0; return [X, Z, d[0] * p.vx + n[0] * vl, d[1] * p.vx + n[1] * vl]; });
  for (const f of P) {
    const o = P[1 - f.side]; if (!f.lv || f.thr || f.held || f.bg || o.thr || o.held || o.bg) continue;
    const D = Math.max(150, Math.abs(o.x - f.x)); arenaTurn(f.lv / D * (Math.sign(o.x - f.x) || 1), o.x); // circle round them (right up close the turn is capped; the camera smooths it)
  }
  // cinematics, finishers and wall slams want the classic angle (their shots are framed for it): swing round to it
  if (arena.goal != null || cine || finish || P.some(f => f.bg)) {
    const want = arena.goal != null ? arena.goal : Math.abs(wrapPi(arena.th)) < Math.PI / 2 ? 0 : Math.PI, dth = wrapPi(want - arena.th);
    const mid = (P[0].x + P[1].x) / 2;
    if (Math.abs(dth) > 0.002) arenaTurn(clamp(dth * 0.2, -0.09, 0.09), mid); else arena.goal = null;
    if (cine || finish || P.some(f => f.bg)) { if (Math.abs(arena.s) > 2) arenaSlide(-arena.s * 0.12); if ((finish || (cine && cine.kind === 'fin')) && Math.abs(arena.a) > 2) arena.a -= arena.a * 0.12; } // back to the middle of the stage, where those shots were made
  }
  projs.forEach((p, i) => { const [X, Z, VX, VZ] = fly[i], [x, l] = arenaFromWorld(X, Z), d = aDir(arena.th), n = aNrm(arena.th); p.x = x; p.lat = l; p.vx = VX * d[0] + VZ * d[1]; p.vl = VX * n[0] + VZ * n[1]; });
  arenaProps(); propBlock();
}
// stage items sit at fixed places on the floor: where they are on the line now, and how far off it
function arenaProps() {
  for (const p of props) {
    if (p.wx === undefined) { p.wx = p.x - WW / 2; p.wz = -85; }
    if (stormOn()) { const [x, l] = arenaFromWorld(p.wx, p.wz); p.x = x; p.lat = l; } else { p.x = p.wx + WW / 2; p.lat = p.wz; }
  }
}
// the item stands are solid: you walk into them, not through them (pushed back along the fight line; step round them)
function propBlock() {
  for (const f of P) { if (f.thr || f.held || f.bg || (f.kd === 1 && !f.bounced)) continue;
    for (const p of props) { const R = 42 + f.bw * f.scale * 0.32, l = Math.abs(p.lat || 0); if (l >= R) continue;
      const need = Math.sqrt(R * R - l * l), d = f.x - p.x; if (Math.abs(d) < need) { f.x = p.x + (d >= 0 ? 1 : -1) * need; if (Math.sign(f.vx) === -Math.sign(d || 1)) f.vx = 0; } } }
}
// whose shoulder the camera sits behind: yours (vs the CPU, training, online); nobody's with two on one screen
const stormMe = () => demo ? -1 : mode === 'online' ? mySlot() : mode === 'local' ? -1 : 0;
