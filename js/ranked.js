// ---------- ranked + matchmaking ----------
// No game server: players meet through the same free PeerJS broker as room codes. A search first tries to join
// someone already waiting in one of a few numbered queue slots, and if nobody is, waits in a slot itself.
// Ranked has its own slots split into three rating bands (it widens to the other bands after a while).
// Ratings are Elo, kept in each player's own browser: each side updates its own rating when the fight ends.
const TIERS = [['BRONZE', 0, '#c07a45'], ['SILVER', 900, '#c4ccd8'], ['GOLD', 1100, '#f5c518'], ['PLATINUM', 1300, '#5fe0cc'], ['DIAMOND', 1500, '#7ab8ff'], ['BP LEGEND', 1700, '#ff3fa4']];
const tierOf = r => { let t = TIERS[0]; for (const T of TIERS) if (r >= T[1]) t = T; return t; };
const tierIdx = r => TIERS.indexOf(tierOf(r));
const rankLabel = r => tierOf(r)[0] + ' ' + Math.round(r);
const MM_SLOTS = 6, MM_WIDEN = 25000;
const mmPool = ranked => ranked ? 'r' + Math.min(2, tierIdx(rank.r) >> 1) : 'q';
const mmId = (pool, k) => PEER_PREFIX + 'mm-' + pool + '-' + k;
const mmHello = () => ({ t: 'hello', mm: 1, ranked: !!(net.mm && net.mm.ranked), rating: rank.r, ver: BUILD.id });

// the rating change for a result (1 win, 0 loss, 0.5 draw) against an opponent rated `opp`
function rankDelta(score, opp) {
  const K = rank.games < 10 ? 40 : 28, E = 1 / (1 + Math.pow(10, (opp - rank.r) / 400));
  let d = Math.round(K * (score - E));
  if (score === 1) d = Math.max(4, d + Math.min(6, Math.max(0, rank.streak - 1) * 2)); // win streaks pay a little extra
  if (score === 0) d = Math.min(-4, d);
  return d;
}
function applyRank(score, opp) {
  const before = rank.r, tb = tierIdx(before), d = rankDelta(score, opp);
  rank.r = Math.max(0, rank.r + d); rank.games++; rank.best = Math.max(rank.best, rank.r); rank.pending = null;
  if (score === 1) { rank.w++; rank.streak = Math.max(0, rank.streak) + 1; } else if (score === 0) { rank.l++; rank.streak = Math.min(0, rank.streak) - 1; }
  saveSettings();
  const ta = tierIdx(rank.r);
  return { d, before, after: rank.r, up: ta > tb, down: ta < tb };
}
// a ranked fight you walked out of (closed the tab, lost connection) counts as a loss the next time you play
function settleAbandoned() {
  if (!rank.pending) return;
  const res = applyRank(0, rank.pending.opp);
  toast = { msg: 'Your last ranked fight was left unfinished: counted as a loss (' + res.d + ' RP)', t: 360 };
}

// ---- the search ----
function findMatch(ranked) {
  netReset(); settleAbandoned();
  net.mm = { ranked, t0: Date.now(), pool: mmPool(ranked), k: 0, phase: 'probe', retry: null, timer: null };
  net.ranked = ranked; setScreen('lobby'); net.status = 'Searching for an opponent';
  if (TEST_BC) { bcMatch(ranked); return; }
  loadPeer(() => {
    if (!net.mm) return;
    const peer = net.peer = new Peer();
    peer.on('open', () => mmProbe(peer, net.mm.pool, 0));
    peer.on('error', e => mmError(peer, e));
    peer.on('connection', c => c.close()); // not hosting yet
  });
}
// try to join whoever is waiting in slot k of a pool
function mmProbe(peer, pool, k, after) {
  const M = net.mm; if (!M || net.peer !== peer || net.connected) return;
  if (k >= MM_SLOTS) { if (after) after(); else mmHost(0); return; }
  M.phase = 'probe'; M.probe = { pool, k, after };
  const c = peer.connect(mmId(pool, k), { reliable: true, serialization: 'json' }); M.c = c;
  clearTimeout(M.timer); M.timer = setTimeout(() => { if (net.mm === M && M.c === c && !net.connected) { try { c.close(); } catch (e) {} mmProbe(peer, pool, k + 1, after); } }, 2600);
  c.on('open', () => {
    if (net.mm !== M || M.c !== c || net.connected) { try { c.close(); } catch (e) {} return; }
    clearTimeout(M.timer); clearInterval(M.retry);
    net.role = 'guest'; net.code = mmId(pool, k).slice(PEER_PREFIX.length); net.status = 'Opponent found: connecting';
    bindConn(c); net.connected = true; send(mmHello());
  });
}
function mmError(peer, e) {
  const M = net.mm; if (!M || net.peer !== peer) return;
  if (e.type === 'peer-unavailable' && M.phase === 'probe' && M.probe) { clearTimeout(M.timer); const P2 = M.probe; mmProbe(peer, P2.pool, P2.k + 1, P2.after); } // nobody in that slot
  else if (e.type === 'unavailable-id' && M.phase === 'host') mmHost(M.k + 1); // someone took this slot first
  else if (!net.connected && ['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(e.type)) netFail('Matchmaking is unavailable right now (' + e.type + ')');
}
// nobody waiting: wait in the first free slot
function mmHost(k) {
  const M = net.mm; if (!M) return;
  if (k >= MM_SLOTS) { net.status = 'The queue is busy, retrying'; setTimeout(() => { if (net.mm === M) { M.phase = 'probe'; mmProbe(net.peer, M.pool, 0); } }, 3000); return; }
  const old = net.peer, peer = new Peer(mmId(M.pool, k));
  net.peer = peer; M.phase = 'host'; M.k = k; try { old && old.destroy(); } catch (e) {}
  net.role = 'host'; net.code = mmId(M.pool, k).slice(PEER_PREFIX.length);
  peer.on('open', () => { if (net.mm === M) net.status = 'Waiting for an opponent'; });
  peer.on('connection', c => { if (net.conn) { c.close(); return; } clearInterval(M.retry); bindConn(c); });
  peer.on('call', onIncomingCall);
  peer.on('error', e => mmError(peer, e));
  // two players can both end up waiting: whoever waits in the higher slot keeps checking the lower ones (and, for
  // ranked, the other rating bands once the wait gets long)
  clearInterval(M.retry);
  M.retry = setInterval(() => {
    if (net.mm !== M || net.connected || net.peer !== peer) { clearInterval(M.retry); return; }
    const pools = [M.pool]; if (M.ranked && Date.now() - M.t0 > MM_WIDEN) for (const p of ['r0', 'r1', 'r2']) if (p !== M.pool) pools.push(p);
    const next = i => { if (i >= pools.length || net.connected || net.mm !== M) { M.phase = 'host'; return; } mmProbe(peer, pools[i], pools[i] === M.pool ? 0 : 0, () => next(i + 1)); };
    if (M.k > 0 || pools.length > 1) next(0);
  }, 7000);
}
// local two-tab test (?net=bc): the first tab to see the other becomes the host
function bcMatch(ranked) {
  const me = Math.random(), bc = new BroadcastChannel('fighter1223-mm'), M = net.mm;
  const ping = setInterval(() => bc.postMessage({ seek: me, ranked }), 300);
  const go = other => { // both tabs decide the same way: the lower number hosts
    M.paired = 1; clearInterval(ping); setTimeout(() => bc.close(), 800);
    if (me < other) { net.role = 'host'; bindConn(bcTransport('host')); return; }
    net.role = 'guest'; bindConn(bcTransport('guest'));
    let n = 0; const hello = setInterval(() => { if (mode === 'online' || ++n > 15 || net.role !== 'guest') { clearInterval(hello); return; } send(mmHello()); }, 300);
  };
  bc.onmessage = e => {
    const m = e.data; if (!m || m.ranked !== ranked || net.mm !== M || M.paired || net.connected) return;
    if (m.seek !== undefined) { bc.postMessage({ pair: me, ranked }); go(m.seek); } else if (m.pair !== undefined) go(m.pair);
  };
  M.retry = ping;
}
function mmStop() { const M = net.mm; if (!M) return; clearInterval(M.retry); clearTimeout(M.timer); net.mm = null; }

// ---- fight start / end hooks ----
function rankedStart() { if (mode === 'online' && net.ranked && net.oppRating != null) { rank.pending = { opp: net.oppRating, at: Date.now() }; saveSettings(); net.rankRes = null; } }
function rankedEnd() {
  if (!(mode === 'online' && net.ranked && net.oppRating != null) || net.rankRes) return;
  const me = mySlot(), score = winner < 0 ? 0.5 : winner === me ? 1 : 0;
  net.rankRes = applyRank(score, net.oppRating);
}
// the opponent left in the middle of a ranked fight: it counts as your win
function rankedOppLeft() {
  if (mode === 'online' && net.ranked && net.oppRating != null && screen === 'fight' && !matchOver && !net.rankRes) { const r = applyRank(1, net.oppRating); return ' Counted as a win (+' + r.d + ' RP).'; }
  return '';
}
