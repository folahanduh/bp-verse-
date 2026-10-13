// ---------- KO replays: the knockout again, in slow motion, from TV-style angles ----------
// While a fight is on, the last five seconds are kept (as the same snapshots online play sends). When a fight ends on
// a plain K.O. (not a finisher or time-up), the moments around the knockout play back in slow motion with camera cuts
// (wide and low, tight on the impact, then following them flying), then the winner's outro carries on. Enter skips.
// Online, the host plays it and sends it like the live fight, so both players watch the same replay.
const REC = [], REC_MAX = 300;
let recN = 0, replay = null, koMark = null, replayNext = false, netReplay = null, restoring = false;
function recReset() { REC.length = 0; recN = 0; koMark = null; replay = null; replayNext = false; netReplay = null; }
function recFrame() {
  if (screen !== 'fight' || replay || demo || !P.length || net.role === 'guest' || matchOver) return;
  try { REC.push(JSON.stringify(snapshot())); } catch (e) { return; }
  recN++; if (REC.length > REC_MAX) REC.shift();
}
function koMarkSet(def, att) { if (!demo && mode !== 'training') koMark = { n: recN, ko: def.side, by: att.side }; }
function startReplay() {
  if (!koMark) return false;
  const ki = REC.length - (recN - koMark.n); if (ki < 30) { koMark = null; return false; }
  const from = Math.max(0, ki - 110), to = Math.min(REC.length - 1, ki + 80);
  replay = { buf: REC.slice(from, to + 1), ki: ki - from, t: 0, idx: -1, now: JSON.stringify(snapshot()), parts: parts.slice(), ko: koMark.ko, by: koMark.by, cur: null, next: null };
  koMark = null; sfx('swoosh'); return true;
}
// slow motion, slowest right around the hit
const replaySpeed = R => { const d = Math.abs(R.t - R.ki); return d < 10 ? 0.22 : d < 30 ? 0.32 : 0.5; };
function replayTick() {
  const R = replay; R.t += replaySpeed(R);
  const i = Math.floor(R.t); if (i >= R.buf.length - 1) { endReplay(); return; }
  while (R.idx < i) {
    R.idx++; const d = JSON.parse(R.buf[R.idx]); R.cur = d; applySnap(d); updateParts();
    if (net.role === 'host') { for (const e of d.ev) if (!e.startsWith('v|')) netEvents.push(e); for (const f of d.fx) netFx.push(f); }
  }
  if (!R.next || R.nextI !== i + 1) { R.next = JSON.parse(R.buf[i + 1]); R.nextI = i + 1; }
  // smooth slow motion: ease the fighters (and the arena) toward the next kept frame
  const u = R.t - i, a = R.cur, b = R.next;
  P.forEach((f, j) => { const A = a.P[j], B = b.P[j]; if (!A || !B) return; for (const k of ['x', 'y', 'z', 'walkPh', 'kdT', 'scale']) if (typeof A[k] === 'number' && typeof B[k] === 'number') f[k] = lerp(A[k], B[k], u); if (A.move === B.move && typeof A.mt === 'number') f.mt = lerp(A.mt, B.mt, u); });
  if (a.ma && b.ma) { arena.th = a.ma.th + wrapPi(b.ma.th - a.ma.th) * u; arena.s = lerp(a.ma.s, b.ma.s, u); arena.a = lerp(a.ma.a, b.ma.a, u); }
}
function endReplay() {
  const R = replay; if (!R) return;
  replay = null; restoring = true; try { applySnap(JSON.parse(R.now)); } finally { restoring = false; }
  parts = R.parts; screenFlash = 8; sfx('swoosh');
}
// what the camera and the overlay need: who was knocked out, by whom, how far through
function replayInfo() {
  if (replay) return { ko: replay.ko, by: replay.by, k: replay.t / replay.buf.length, ki: replay.ki / replay.buf.length };
  return net.role === 'guest' ? netReplay : null;
}
// letterbox, the REPLAY tag and the skip prompt
function drawReplayOverlay() {
  const R = replayInfo(); if (!R) return;
  const bar = 44 * clamp(R.k * 12, 0, 1) * clamp((1 - R.k) * 14, 0, 1);
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (bar > 20) {
    ctx.fillStyle = frame % 40 < 24 ? '#ff2b3a' : 'rgba(255,43,58,0.25)'; ctx.beginPath(); ctx.arc(34, 22, 6, 0, 7); ctx.fill();
    chromeText('REPLAY', 48, 23, 20, { weight: 900, track: 4, glow: 'rgba(255,60,80,0.4)' });
    capsText('SLOW MOTION  ·  ' + (P[R.by] ? P[R.by].c.name.toUpperCase() + ' K.O. ' + P[R.ko].c.name.toUpperCase() : ''), 160, 23, 10, 'rgba(232,238,248,0.75)', { weight: 700, track: 3 });
    if (net.role !== 'guest') { const w = keyCap(W - 110, H - 22, 'ENTER'); capsText('SKIP', W - 104 + w, H - 22, 11, '#fff', { weight: 800, track: 3 }); }
  }
  ctx.restore();
}
