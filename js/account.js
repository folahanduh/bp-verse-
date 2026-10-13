// ---------- accounts, saved progress and the win/loss record ----------
// There is no game server, so an account lives in this browser (localStorage): a username with a 4-digit tag
// (NAME#1234), a favourite fighter, XP and levels, the ranked rating, and the full win/loss record. Every finished
// match is saved the moment it ends. A save code moves an account to another device.
const ACCT_KEY = 'f1223.accounts', CUR_KEY = 'f1223.cur';
let accounts = { cur: null, list: {} }, acct = null, acctRes = null, matchRecorded = false, matchFinBy = -1;
const acctName = a => a ? a.name + '#' + a.tag : 'GUEST';
const NAME_OK = /^[A-Za-z0-9_ ]{3,16}$/;
const freshStats = () => ({ w: 0, l: 0, d: 0, played: 0, streak: 0, best: 0, fins: 0, flawless: 0, modes: {}, fighters: {} });
const xpNeed = lv => 200 + lv * 100; // XP to go from this level to the next
function newAccount(name, fav) {
  const id = 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  return { id, name: name.trim(), tag: String(1000 + Math.floor(Math.random() * 9000)), created: Date.now(), fav: fav || CHARS[0].id,
    level: 1, xp: 0, stats: freshStats(), history: [], rank: { r: 1000, w: 0, l: 0, streak: 0, best: 1000, games: 0, pending: null }, friends: [] };
}
// older saves and imported codes get any fields they're missing
function fixAccount(a) {
  a.stats = Object.assign(freshStats(), a.stats || {}); a.stats.modes = a.stats.modes || {}; a.stats.fighters = a.stats.fighters || {};
  a.history = Array.isArray(a.history) ? a.history.slice(0, 30) : []; a.friends = Array.isArray(a.friends) ? a.friends : [];
  a.level = Math.max(1, a.level | 0); a.xp = Math.max(0, a.xp | 0); if (!CHARS.some(c => c.id === a.fav)) a.fav = CHARS[0].id;
  if (!a.rank || typeof a.rank.r !== 'number') a.rank = { r: 1000, w: 0, l: 0, streak: 0, best: 1000, games: 0, pending: null };
  return a;
}
function loadAccounts() {
  try { const s = JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); if (s && s.list) accounts = s; } catch (e) {}
  for (const id in accounts.list) fixAccount(accounts.list[id]);
  let cur = null; try { cur = sessionStorage.getItem(CUR_KEY); } catch (e) {} // each tab can be signed in to its own account
  signIn(accounts.list[cur] ? cur : accounts.cur, true);
}
// saving writes only this tab's account (and any it made or deleted), so two tabs signed in to different
// accounts never overwrite each other
function saveAccounts() {
  let s = null; try { s = JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); } catch (e) {}
  if (!s || !s.list) s = { cur: null, list: {} };
  const gone = accounts.gone || [];
  for (const id of gone) delete s.list[id];
  for (const id in accounts.list) if (!s.list[id] && !gone.includes(id)) s.list[id] = accounts.list[id];
  if (acct) s.list[acct.id] = acct;
  s.cur = accounts.cur;
  try { localStorage.setItem(ACCT_KEY, JSON.stringify(s)); } catch (e) {}
  for (const id in s.list) if (!acct || id !== acct.id) accounts.list[id] = fixAccount(s.list[id]); // pick up accounts other tabs made
}
// sign in: the ranked rating is part of the account, so the rest of the game keeps using the one `rank` object
function signIn(id, quiet) {
  const a = accounts.list[id]; if (!a) { acct = null; return false; }
  if (typeof socialStop === 'function') socialStop();
  acct = a; accounts.cur = id; try { sessionStorage.setItem(CUR_KEY, id); } catch (e) {}
  rank = acct.rank; saveAccounts();
  if (!quiet) toast = { msg: 'Signed in as ' + acctName(acct), t: 160 };
  if (typeof socialStart === 'function') socialStart();
  return true;
}
function createAccount(name, fav) {
  const first = !Object.keys(accounts.list).length, a = newAccount(name, fav);
  if (first && rank && rank.games) a.rank = JSON.parse(JSON.stringify(rank)); // the ranked rating from before accounts carries over
  accounts.list[a.id] = a; signIn(a.id, true); toast = { msg: 'Welcome, ' + acctName(a) + '! Your progress saves automatically.', t: 260 };
  return a;
}
function deleteAccount(id) {
  delete accounts.list[id]; (accounts.gone = accounts.gone || []).push(id);
  if (acct && acct.id === id) { acct = null; const next = Object.keys(accounts.list)[0]; if (next) signIn(next, true); else { accounts.cur = null; if (typeof socialStop === 'function') socialStop(); } }
  saveAccounts();
}
// a card other players see: in the lobby, the friends list, and the VS screen online
const acctCard = () => acct ? { name: acct.name, tag: acct.tag, lv: acct.level, fav: acct.fav, w: acct.stats.w, l: acct.stats.l, r: Math.round(rank.r), st: presenceStatus() } : null;
function presenceStatus() {
  if (screen === 'fight' || screen === 'vs') return mode === 'online' ? 'IN AN ONLINE MATCH' : 'IN A MATCH';
  if (screen === 'squad3d' || screen === 'sqlobby') return SQ.role === 'solo' ? 'IN SQUADS (VS BOTS)' : 'IN A SQUAD PARTY';
  if (screen === 'select' || screen === 'stage') return 'PICKING A FIGHTER';
  if (screen === 'olobby') return 'IN THE LOBBY';
  if (screen === 'lobby' && net.mm) return net.mm.ranked ? 'SEARCHING RANKED' : 'SEARCHING';
  return 'IN THE MENUS';
}

// ---- the record: every finished match, the moment it ends ----
function modeKey() { return mode === 'online' ? (T.playing ? 'tourney' : net.ranked ? 'ranked' : 'online') : mode; }
const MODE_NAMES = { cpu: 'VS CPU', local: '2 PLAYERS', online: 'ONLINE', ranked: 'RANKED', tourney: 'TOURNAMENT', squads: 'SQUADS' };
function accountRecord() {
  if (!acct || demo || matchRecorded || !P.length || !['cpu', 'local', 'online'].includes(mode)) return;
  matchRecorded = true;
  const me = mode === 'online' ? mySlot() : 0, my = P[me], op = P[1 - me], res = winner < 0 ? 'D' : winner === me ? 'W' : 'L', S = acct.stats, mk2 = modeKey();
  const fin = res === 'W' && matchFinBy === me, flaw = res === 'W' && my.hp >= my.maxHp - 0.5;
  const oppName = mode === 'online' ? (net.oppUser ? net.oppUser.name + '#' + net.oppUser.tag : 'Online player') : mode === 'cpu' ? 'CPU · ' + DIFFS[difficulty].name : 'Player 2';
  const bump = (o, k) => { o[k] = o[k] || { w: 0, l: 0, d: 0 }; o[k][res === 'W' ? 'w' : res === 'L' ? 'l' : 'd']++; };
  S.played++; if (res === 'W') S.w++; else if (res === 'L') S.l++; else S.d++;
  S.streak = res === 'W' ? Math.max(0, S.streak) + 1 : res === 'L' ? Math.min(0, S.streak) - 1 : 0; S.best = Math.max(S.best, S.streak);
  if (fin) S.fins++; if (flaw) S.flawless++;
  bump(S.modes, mk2); bump(S.fighters, my.c.id);
  acct.history.unshift({ t: Date.now(), m: mk2, me: my.c.id, op: op.c.id, on: oppName, r: res, fin: fin ? 1 : 0, fl: flaw ? 1 : 0 }); acct.history.length = Math.min(acct.history.length, 30);
  // XP: more for winning, finishing and flawless; more online; a little more against harder CPUs
  let xp = res === 'W' ? 120 : res === 'D' ? 60 : 45; if (fin) xp += 40; if (flaw) xp += 40;
  xp = Math.round(xp * (mk2 === 'ranked' ? 1.6 : mk2 === 'online' ? 1.4 : mk2 === 'cpu' ? 0.8 + difficulty * 0.2 : 0.7));
  const from = { level: acct.level, xp: acct.xp }; let ups = 0;
  acct.xp += xp; while (acct.xp >= xpNeed(acct.level)) { acct.xp -= xpNeed(acct.level); acct.level++; ups++; }
  acctRes = { xp, ups, from, res, t: frame };
  saveAccounts();
  if (ups) { toast = { msg: 'LEVEL UP! You are now level ' + acct.level, t: 240 }; sfx('ready'); }
}
// save codes: the whole account as text, to paste into the game on another device
function exportSave() {
  if (!acct) return;
  const code = 'BPV1:' + btoa(unescape(encodeURIComponent(JSON.stringify(acct))));
  const done = () => { toast = { msg: 'Save code copied. Paste it with IMPORT SAVE on your other device.', t: 260 }; };
  try { navigator.clipboard.writeText(code).then(done, () => window.prompt('Copy your save code:', code)); } catch (e) { window.prompt('Copy your save code:', code); }
}
function importSave(code) {
  try {
    code = (code || '').trim(); if (!code.startsWith('BPV1:')) throw 0;
    const a = fixAccount(JSON.parse(decodeURIComponent(escape(atob(code.slice(5)))))); if (!a.id || !NAME_OK.test(a.name) || !/^\d{4}$/.test(a.tag)) throw 0;
    accounts.list[a.id] = a; if (accounts.gone) accounts.gone = accounts.gone.filter(x => x !== a.id); signIn(a.id, true); toast = { msg: 'Save imported: signed in as ' + acctName(a), t: 220 }; return true;
  } catch (e) { toast = { msg: 'That save code is not valid', t: 200 }; return false; }
}

// ---------- friends, presence and the live lobby (peer-to-peer, over the PeerJS broker) ----------
// Signed in, the game listens on a peer ID made from your name and tag, so friends can see you're online, send a
// request, or invite you to a fight. The lobby is a set of numbered slots: whoever is in the lobby takes one, and
// everyone looks round the other slots to see who's there.
const PRES_PREFIX = PEER_PREFIX + 'u-', LOBBY_SLOTS = 12, lobbySlotId = k => PEER_PREFIX + 'lobby-' + k;
const presId = a => PRES_PREFIX + (a.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player') + '-' + a.tag;
const fkey = a => a.name.toLowerCase() + '#' + a.tag;
const social = { peer: null, ready: false, err: '', info: {}, pend: {}, timer: null, inv: null, lobby: null };
// the test transport (?net=bc) runs the same code across browser tabs over a BroadcastChannel
class BCPeer {
  constructor(id) {
    this.id = id || 'anon-' + Math.random().toString(36).slice(2, 10); this.h = {}; this.conns = {}; this.dead = false; this.nonce = Math.random();
    this.bc = new BroadcastChannel('f1223-peers'); this.bc.onmessage = e => this._msg(e.data);
    this.bc.postMessage({ k: 'claim', id: this.id, nonce: this.nonce });
    this._t = setTimeout(() => { if (!this.taken && !this.dead) { this.isOpen = true; this._emit('open', this.id); } }, 250);
  }
  on(ev, fn) { this.h[ev] = fn; return this; }
  _emit(ev, a) { if (this.h[ev]) this.h[ev](a); }
  _msg(m) {
    if (this.dead || !m) return;
    if (m.k === 'claim' && m.id === this.id && m.nonce !== this.nonce && !this.taken && (this.isOpen || this.nonce < m.nonce)) this.bc.postMessage({ k: 'taken', id: this.id, nonce: m.nonce }); // two claims at once: the lower one keeps it
    else if (m.k === 'taken' && m.id === this.id && m.nonce === this.nonce) { this.taken = true; clearTimeout(this._t); this._emit('error', { type: 'unavailable-id', message: 'ID "' + this.id + '" is taken' }); }
    else if (m.k === 'conn' && m.to === this.id && this.isOpen) { const c = new BCConn(this, m.from, m.cid); this.conns[m.cid] = c; this.bc.postMessage({ k: 'acc', cid: m.cid, to: m.from }); this._emit('connection', c); setTimeout(() => c._open(), 0); }
    else if (m.k === 'acc' && m.to === this.id && this.conns[m.cid]) { clearTimeout(this.conns[m.cid]._t); this.conns[m.cid]._open(); }
    else if (m.k === 'msg' && m.to === this.id && this.conns[m.cid]) this.conns[m.cid]._data(m.d);
    else if (m.k === 'close' && m.to === this.id && this.conns[m.cid]) this.conns[m.cid]._closed();
  }
  connect(to) {
    const cid = Math.random().toString(36).slice(2), c = new BCConn(this, to, cid); this.conns[cid] = c;
    this.bc.postMessage({ k: 'conn', from: this.id, to, cid });
    c._t = setTimeout(() => { if (c.isOpen) return; delete this.conns[cid]; this._emit('error', { type: 'peer-unavailable', message: 'Could not connect to peer ' + to }); }, 900);
    return c;
  }
  destroy() { this.dead = true; Object.values(this.conns).forEach(c => c.close()); try { this.bc.close(); } catch (e) {} }
  reconnect() {}
}
class BCConn {
  constructor(p, peer, cid) { this.p = p; this.peer = peer; this.cid = cid; this.h = {}; this.isOpen = false; }
  on(ev, fn) { this.h[ev] = fn; return this; }
  _open() { if (this.isOpen || this.closed) return; this.isOpen = true; if (this.h.open) this.h.open(); }
  _data(d) { if (this.h.data) this.h.data(d); }
  _closed() { if (this.closed) return; this.closed = true; delete this.p.conns[this.cid]; if (this.h.close) this.h.close(); }
  send(d) { if (!this.p.dead && !this.closed) this.p.bc.postMessage({ k: 'msg', cid: this.cid, to: this.peer, d: JSON.parse(JSON.stringify(d)) }); }
  close() { if (this.closed) return; try { this.p.bc.postMessage({ k: 'close', cid: this.cid, to: this.peer }); } catch (e) {} this._closed(); }
}
const mkPeer = id => TEST_BC ? new BCPeer(id) : new Peer(id, { debug: 0 });
const peerOf = e => ((e && e.message || '').match(/peer (\S+)$/) || [])[1]; // which peer a 'peer-unavailable' error is about
function socialLoad(cb) { // like loadPeer, but quiet: presence never interrupts the game if it can't get online
  if (TEST_BC || window.Peer) return cb();
  const srcs = ['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  const tryLoad = i => { if (i >= srcs.length) { social.err = 'offline'; return; } const s = document.createElement('script'); s.src = srcs[i]; s.onload = cb; s.onerror = () => tryLoad(i + 1); document.head.appendChild(s); };
  tryLoad(0);
}
function socialStart() {
  if (!acct || social.peer) return;
  const me = acct; social.err = ''; social.ready = false;
  socialLoad(() => {
    if (acct !== me || social.peer) return;
    let p; try { p = social.peer = mkPeer(presId(me)); } catch (e) { social.err = 'offline'; return; }
    p.on('open', () => { if (social.peer !== p) return; social.ready = true; social.err = ''; socialPoll(); });
    p.on('connection', c => { c.on('data', d => socialData(d, c)); c.on('error', () => {}); });
    p.on('disconnected', () => { try { if (social.peer === p && !p.destroyed) p.reconnect(); } catch (e) {} });
    p.on('error', e => {
      if (social.peer !== p) return;
      if (e.type === 'peer-unavailable') { const id = peerOf(e), P2 = id && social.pend[id]; if (P2) { clearTimeout(P2.timer); delete social.pend[id]; P2.fail && P2.fail(); } }
      else if (e.type === 'unavailable-id') { social.err = 'This account is already signed in somewhere else'; }
      else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) social.err = 'offline';
    });
    clearInterval(social.timer); social.timer = setInterval(socialPoll, 20000);
  });
}
function socialStop() {
  clearInterval(social.timer); lobbyLeave();
  Object.values(social.pend).forEach(P2 => clearTimeout(P2.timer));
  try { social.peer && social.peer.destroy(); } catch (e) {}
  Object.assign(social, { peer: null, ready: false, info: {}, pend: {}, timer: null, inv: null });
}
// open a short connection to someone's presence ID, send one message, read one reply
function socialSend(card, msg, onReply, onFail) {
  const p = social.peer; if (!p || !social.ready) { if (onFail) onFail(); return; }
  const id = presId(card); if (social.pend[id]) { social.pend[id].queue.push([msg, onReply]); return; }
  const c = p.connect(id, { reliable: true, serialization: 'json' }), P2 = social.pend[id] = { c, queue: [[msg, onReply]], fail: onFail };
  const done = () => { clearTimeout(P2.timer); if (social.pend[id] === P2) delete social.pend[id]; setTimeout(() => { try { c.close(); } catch (e) {} }, 400); };
  P2.timer = setTimeout(() => { done(); if (onFail) onFail(); }, 8000);
  c.on('open', () => { for (const [m] of P2.queue) c.send(Object.assign({ from: acctCard() }, m)); });
  c.on('data', d => { const q = P2.queue.shift(); if (q && q[1]) q[1](d); if (!P2.queue.length) done(); });
  c.on('error', () => {});
}
const findFriend = card => acct && acct.friends.find(f => fkey(f) === fkey(card));
// what someone sent us
function socialData(d, c) {
  if (!d || !d.t || !acct) return;
  const from = d.from, reply = o => { try { c.send(Object.assign({ from: acctCard() }, o)); } catch (e) {} };
  if (from && from.name) { const k = fkey(from); social.info[k] = { on: true, card: from, seen: Date.now() }; }
  const fr = from && findFriend(from);
  if (d.t === 'ping') {
    if (d.req && from && !fr) { acct.friends.push({ name: from.name, tag: from.tag, st: 'in', t: Date.now() }); saveAccounts(); toast = { msg: acctName(from) + ' sent you a friend request (ONLINE → FRIENDS)', t: 260 }; sfx('ready'); }
    else if (d.req && fr && fr.st === 'sent') { fr.st = 'friend'; saveAccounts(); toast = { msg: 'You and ' + acctName(from) + ' are now friends', t: 220 }; } // both asked: friends
    reply({ t: 'pong', friend: fr ? fr.st === 'friend' : false });
  }
  else if (d.t === 'facc') { if (fr) { fr.st = 'friend'; saveAccounts(); toast = { msg: acctName(from) + ' accepted your friend request', t: 220 }; sfx('ready'); } reply({ t: 'ok' }); }
  else if (d.t === 'unf') { if (fr) { acct.friends = acct.friends.filter(f => f !== fr); saveAccounts(); } reply({ t: 'ok' }); }
  else if (d.t === 'inv') {
    if ((screen === 'fight' && !matchOver) || net.role || social.inv || sqBusy()) { reply({ t: 'inv-busy' }); return; }
    social.inv = { from, code: d.code, t: frame }; sfx('ready'); reply({ t: 'ok' });
  }
  else if (d.t === 'sqinv') { // a squad party invite
    if ((screen === 'fight' && !matchOver) || net.role || social.inv || T.st || sqBusy()) { reply({ t: 'inv-busy' }); return; }
    social.inv = { from, code: d.code, kind: 'sq', t: frame }; sfx('ready'); reply({ t: 'ok' });
  }
  else if (d.t === 'tinv') {
    if ((screen === 'fight' && !matchOver) || net.role || social.inv || T.st || sqBusy()) { reply({ t: 'inv-busy' }); return; }
    social.inv = { from, code: d.code, kind: 'trn', name: d.name, t: frame }; sfx('ready'); reply({ t: 'ok' });
  }
  else if (d.t === 'inv-no') { if (net.role === 'host' && !net.connected) { net.status = acctName(from) + ' declined'; toast = { msg: acctName(from) + ' declined your invite', t: 200 }; } reply({ t: 'ok' }); }
  else if (d.t === 'who') { if (d.slot != null && social.lobby && from) social.lobby.mem[d.slot] = { card: from, seen: Date.now() }; reply({ t: 'me', slot: social.lobby ? social.lobby.k : null }); }
}
// check every friend: online or not, and what they're doing; resend requests that haven't been seen
function socialPoll() {
  if (!acct || !social.ready) return;
  for (const f of acct.friends) {
    const k = fkey(f);
    socialSend(f, { t: 'ping', req: f.st === 'sent' ? 1 : 0 }, d => {
      social.info[k] = { on: true, card: d.from || social.info[k] && social.info[k].card, seen: Date.now() };
      if (f.st === 'sent' && d.friend) { f.st = 'friend'; saveAccounts(); }
    }, () => { social.info[k] = Object.assign(social.info[k] || {}, { on: false, seen: Date.now() }); });
  }
}
function addFriend(code) {
  const m = (code || '').trim().match(/^(.{3,16})#(\d{4})$/); if (!m || !NAME_OK.test(m[1])) { toast = { msg: 'Friend codes look like NAME#1234', t: 200 }; return false; }
  const card = { name: m[1], tag: m[2] };
  if (acct && fkey(card) === fkey(acct)) { toast = { msg: "That's your own friend code", t: 160 }; return false; }
  const ex = findFriend(card); if (ex) { if (ex.st === 'in') acceptFriend(ex); else toast = { msg: acctName(card) + ' is already on your list', t: 160 }; return false; }
  acct.friends.push({ name: card.name, tag: card.tag, st: 'sent', t: Date.now() }); saveAccounts();
  toast = { msg: 'Friend request sent to ' + acctName(card), t: 200 }; socialPoll(); return true;
}
function acceptFriend(f) { f.st = 'friend'; saveAccounts(); socialSend(f, { t: 'facc' }); toast = { msg: 'You and ' + acctName(f) + ' are now friends', t: 200 }; }
function removeFriend(f) { acct.friends = acct.friends.filter(x => x !== f); saveAccounts(); socialSend(f, { t: 'unf' }); }
// invite someone to a private room: open one, then tell them its code
function inviteTo(card) {
  if (!social.ready) { toast = { msg: 'You are offline', t: 160 }; return; }
  hostRoom(); net.invitee = card; net.status = 'Invited ' + acctName(card) + ': waiting for them';
  socialSend(card, { t: 'inv', code: net.code }, d => { if (d.t === 'inv-busy') { net.status = acctName(card) + ' is busy right now'; toast = { msg: acctName(card) + ' is busy right now', t: 200 }; } },
    () => { net.status = acctName(card) + " couldn't be reached"; });
  sfx('confirm');
}
function answerInvite(yes) {
  const I = social.inv; if (!I) return; social.inv = null;
  if (I.kind === 'trn') { if (yes) { sfx('confirm'); tJoin(I.code); } else sfx('back'); return; }
  if (I.kind === 'sq') { if (yes) { sfx('confirm'); sqJoin(I.code); } else sfx('back'); return; }
  if (yes) { sfx('confirm'); joinRoom(I.code); } else { sfx('back'); socialSend(I.from, { t: 'inv-no' }); }
}
// ---- the live lobby ----
function lobbyJoin() {
  if (social.lobby || !acct) return;
  const L = social.lobby = { k: -1, mem: {}, peer: null, timer: null, t0: Date.now() };
  const claim = k => {
    if (social.lobby !== L) return;
    if (k >= LOBBY_SLOTS) { L.full = 1; return; }
    let p; try { p = mkPeer(lobbySlotId(k)); } catch (e) { return; }
    L.peer = p;
    p.on('open', () => { if (social.lobby !== L) { p.destroy(); return; } L.k = k; lobbyScan(); clearInterval(L.timer); L.timer = setInterval(lobbyScan, 9000); });
    p.on('connection', c => { c.on('data', d => { if (d && d.t === 'who') { if (d.from) L.mem[d.slot] = { card: d.from, seen: Date.now() }; try { c.send({ t: 'me', from: acctCard(), slot: L.k }); } catch (e) {} } }); c.on('error', () => {}); });
    p.on('error', e => { if (social.lobby !== L || L.peer !== p) return;
      if (e.type === 'unavailable-id') { try { p.destroy(); } catch (e2) {} claim(k + 1); }
      else if (e.type === 'peer-unavailable') { const id = peerOf(e), j = id && +id.slice(lobbySlotId('').length); if (j >= 0) delete L.mem[j]; } });
  };
  socialLoad(() => claim(0));
}
// look round every other slot: who's there?
function lobbyScan() {
  const L = social.lobby; if (!L || !L.peer || L.k < 0) return;
  for (let j = 0; j < LOBBY_SLOTS; j++) {
    if (j === L.k) continue;
    const c = L.peer.connect(lobbySlotId(j), { reliable: true, serialization: 'json' });
    const t = setTimeout(() => { try { c.close(); } catch (e) {} }, 7000);
    c.on('open', () => c.send({ t: 'who', from: acctCard(), slot: L.k }));
    c.on('data', d => { if (d && d.t === 'me' && d.from) L.mem[j] = { card: d.from, seen: Date.now() }; clearTimeout(t); setTimeout(() => { try { c.close(); } catch (e) {} }, 300); });
    c.on('error', () => {});
  }
  for (const j in L.mem) if (Date.now() - L.mem[j].seen > 30000) delete L.mem[j]; // gone quiet: they left
}
function lobbyLeave() { const L = social.lobby; if (!L) return; clearInterval(L.timer); try { L.peer && L.peer.destroy(); } catch (e) {} social.lobby = null; }
const lobbyList = () => social.lobby ? Object.keys(social.lobby.mem).map(j => Object.assign({ slot: +j }, social.lobby.mem[j])).filter(m => m.card && (!acct || fkey(m.card) !== fkey(acct))) : [];

// ---------- the screens: create account, profile, accounts, online hub, friends, lobby ----------
const ACCT_SCREENS = ['account', 'profile', 'accounts', 'online', 'friends', 'olobby'];
const ui2 = { name: '', fav: 0, idx: 0, input: null, del: -1, after: 'mode' };
const ONLINE_MENU = [['LOBBY', 'See who is online right now and challenge them.'], ['FRIENDS', 'Add friends by their code, see who is on, invite them to a fight.'],
  ['RANKED', 'Matched with someone near your rank. Wins raise your rating.'], ['QUICK MATCH', 'Fight whoever is searching right now.'],
  ['HOST A ROOM', 'Make a private room and send the code to a friend.'], ['JOIN A ROOM', "Type a friend's room code."], ['BACK', '']];
const PROFILE_MENU = ['FAVOURITE FIGHTER', 'CHANGE NAME', 'SWITCH ACCOUNT', 'EXPORT SAVE', 'IMPORT SAVE', 'BACK'];
const textEntryOn = () => screen === 'account' || !!ui2.input || screen === 'tcode' || screen === 'sqcode' || (screen === 'tcreate' && tui.row === 0);
function openAccountCreate(after) { ui2.name = ''; ui2.fav = Math.max(0, CHARS.findIndex(c => c.id === (acct ? acct.fav : 'julian'))); ui2.after = after || 'mode'; ui2.rename = false; setScreen('account'); }
const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
const pct = (w, l) => w + l ? Math.round(w / (w + l) * 100) + '%' : '—';
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];
function textBox(x, y, w, label, val, on, hint) {
  capsText(label, x, y - 14, 10, UI.blue, { weight: 800, track: 4 });
  chamfer(x, y, w, 40, 10); ctx.fillStyle = 'rgba(4,7,12,0.92)'; ctx.fill(); ctx.strokeStyle = on ? (frame % 40 < 24 ? UI.blueHi : UI.blue) : UI.edge; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
  ctx.save(); ctx.font = `700 19px ${DISP}`; tracked(1); ctx.fillStyle = val ? '#fff' : 'rgba(214,224,240,0.35)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText((val || hint || '') + (on && frame % 40 < 24 ? '|' : ''), x + 14, y + 21); ctx.restore(); tracked(0);
}
function drawAccountCreate() {
  drawMenuBg(); uiHeader(ui2.rename ? 'CHANGE NAME' : 'CREATE YOUR ACCOUNT', ui2.rename ? 'PROFILE' : 'WELCOME TO BP VERSE', { profile: false });
  const c = CHARS[ui2.fav], ok = NAME_OK.test(ui2.name.trim()), x0 = 70;
  uiPanel(x0 - 16, 112, 420, 300, { accent: UI.blue, glow: UI.blue });
  textBox(x0, 150, 388, 'USERNAME', ui2.name, true, 'Type a name');
  capsText(ok ? 'YOUR FRIEND CODE WILL BE  ' + ui2.name.trim().toUpperCase() + '#' + (acct && ui2.rename ? acct.tag : '????') : '3 to 16 letters, numbers, spaces or _', x0, 206, 10, ok ? UI.blueHi : 'rgba(214,224,240,0.55)', { weight: 700, track: 2 });
  if (!ui2.rename) { capsText('FAVOURITE FIGHTER', x0, 238, 10, UI.blue, { weight: 800, track: 4 }); hexPortrait(c, 0, x0 + 36, 290, 34);
    chromeText(c.name.toUpperCase(), x0 + 82, 280, 22, { weight: 900, glow: rgba(c.color, 0.5) }); capsText('◀ ▶  TO CHANGE', x0 + 84, 306, 10, '#ffd23f', { weight: 700, track: 3 }); }
  ctx.save(); ctx.font = '12.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  wrap('Your account, level, ranked rating and win/loss record are saved in this browser automatically. Friends add you with your friend code.', x0, 352, 388, 16); ctx.restore();
  uiPrompts([['ENTER', ok ? (ui2.rename ? 'SAVE' : 'CREATE') : 'TYPE A NAME'], ['← →', 'FIGHTER'], ['ESC', 'BACK']]);
}
function statRow(x, y, label, val, col) { capsText(label, x, y, 10, 'rgba(214,224,240,0.6)', { weight: 700, track: 3 }); capsText(String(val), x + 150, y, 13, col || '#fff', { align: 'right', weight: 800, track: 1 }); }
function drawProfile() {
  drawMenuBg(); uiHeader('PROFILE', 'YOUR ACCOUNT', { profile: false });
  if (!acct) return;
  const S = acct.stats, c = charOf(acct.fav), T = tierOf(rank.r), k = easeOut(clamp(screenT / 20, 0, 1));
  ctx.save(); ctx.globalAlpha = k;
  // the player card
  uiPanel(40, 100, 420, 150, { accent: c.color, glow: c.color });
  hexPortrait(c, 0, 100, 166, 44);
  chromeText(acct.name.toUpperCase(), 160, 140, acct.name.length > 11 ? 24 : 30, { weight: 900, glow: rgba(c.color, 0.5) });
  capsText('#' + acct.tag + '   ·   FRIEND CODE', 162, 166, 10, 'rgba(214,224,240,0.6)', { weight: 700, track: 3 });
  hexPath(178, 202, 16); ctx.fillStyle = 'rgba(62,166,255,0.25)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = chromeGrad(186, 218); ctx.stroke();
  capsText(String(acct.level), 178, 203, 13, '#fff', { align: 'center', weight: 900, track: 0 });
  capsText('LEVEL ' + acct.level, 202, 194, 11, '#fff', { weight: 800, track: 3 }); uiMeter(202, 204, 220, 8, acct.xp / xpNeed(acct.level), '#1f6fe0', { sk: 3 });
  capsText(acct.xp + ' / ' + xpNeed(acct.level) + ' XP', 424, 222, 9, 'rgba(214,224,240,0.6)', { align: 'right', track: 2 });
  capsText(T[0] + '  ' + Math.round(rank.r) + ' RP', 202, 232, 10, T[2], { weight: 800, track: 3 });
  // the record
  uiPanel(40, 262, 200, 214, { accent: '#ffd23f' });
  capsText('RECORD', 56, 280, 10, '#ffd23f', { weight: 800, track: 5 });
  chromeText(S.w + 'W  ' + S.l + 'L', 56, 308, 26, { weight: 900, track: 1 });
  statRow(56, 338, 'WIN RATE', pct(S.w, S.l)); statRow(56, 358, 'DRAWS', S.d); statRow(56, 378, 'STREAK', S.streak > 0 ? S.streak + ' W' : S.streak < 0 ? -S.streak + ' L' : '—', S.streak > 0 ? '#7dff9a' : S.streak < 0 ? '#ff6b6b' : '#fff');
  statRow(56, 398, 'BEST STREAK', S.best); statRow(56, 418, 'FINISHERS', S.fins); statRow(56, 438, 'FLAWLESS', S.flawless); statRow(56, 458, 'MATCHES', S.played);
  // by mode and by fighter
  uiPanel(250, 262, 210, 214, { accent: UI.blue });
  capsText('BY MODE', 266, 280, 10, UI.blue, { weight: 800, track: 5 });
  ['cpu', 'local', 'online', 'ranked', 'tourney'].forEach((m, i) => { const r = S.modes[m] || { w: 0, l: 0 }; statRow(266, 300 + i * 18, MODE_NAMES[m], r.w + '-' + r.l); });
  statRow(266, 392, 'CUPS WON', (S.tw || 0) + ' / ' + (S.tourn || 0), '#ffd23f');
  capsText('TOP FIGHTERS', 266, 414, 10, UI.blue, { weight: 800, track: 5 });
  Object.entries(S.fighters).sort((a, b) => (b[1].w + b[1].l) - (a[1].w + a[1].l)).slice(0, 2).forEach(([id, r], i) => statRow(266, 434 + i * 18, charOf(id).name.toUpperCase().slice(0, 14), r.w + '-' + r.l));
  if (!Object.keys(S.fighters).length) capsText('PLAY A MATCH', 266, 434, 10, 'rgba(214,224,240,0.45)', { track: 3 });
  // recent matches
  uiPanel(472, 100, 448, 230, { accent: UI.blue });
  capsText('RECENT MATCHES', 488, 118, 10, UI.blue, { weight: 800, track: 5 });
  if (!acct.history.length) { ctx.font = '13px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.6)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('No matches yet. Your results show up here.', 488, 148); }
  acct.history.slice(0, 8).forEach((h, i) => { const y = 142 + i * 23, col = h.r === 'W' ? '#7dff9a' : h.r === 'L' ? '#ff6b6b' : '#ffd23f';
    slant(486, y - 9, 22, 18, 4); ctx.fillStyle = rgba(col, 0.25); ctx.fill(); capsText(h.r, 498, y, 11, col, { align: 'center', weight: 900, track: 0 });
    capsText(charOf(h.me).name.toUpperCase().slice(0, 12) + '  VS  ' + charOf(h.op).name.toUpperCase().slice(0, 12), 518, y - 4, 10, '#fff', { weight: 700, track: 1 });
    ctx.save(); ctx.font = '10px ' + BODY; ctx.fillStyle = 'rgba(214,224,240,0.6)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText((MODE_NAMES[h.m] || h.m) + ' · ' + h.on + (h.fin ? ' · finisher' : '') + (h.fl ? ' · flawless' : ''), 518, y + 7); ctx.restore();
    capsText(ago(h.t), 904, y, 9, 'rgba(214,224,240,0.5)', { align: 'right', track: 1 }); });
  ctx.restore();
  // options
  const vals = [charOf(acct.fav).name.toUpperCase(), '', Object.keys(accounts.list).length + ' ON THIS DEVICE', '', '', ''];
  PROFILE_MENU.forEach((m, i) => uiMenuItem(486, 344 + i * 26, 420, 22, m, i === ui2.idx, (screenT - i * 3) / 16, vals[i], { size: 12 }));
  uiPrompts([['↑ ↓', 'CHOOSE'], ['← →', 'CHANGE'], ['ENTER', 'SELECT'], ['ESC', 'BACK']]);
}
function drawAccounts() {
  drawMenuBg(); uiHeader('SWITCH ACCOUNT', 'ACCOUNTS ON THIS DEVICE', { profile: false });
  const L = Object.values(accounts.list).sort((a, b) => a.created - b.created), rows = L.concat([{ add: 1 }]);
  rows.forEach((a, i) => { const y = 112 + i * 54, on = i === ui2.idx;
    if (a.add) { uiMenuItem(56, y, 470, 44, '+  NEW ACCOUNT', on, (screenT - i * 3) / 16, '', { size: 16 }); return; }
    uiMenuItem(56, y, 470, 44, '', on, (screenT - i * 3) / 16);
    hexPortrait(charOf(a.fav), 0, 96, y + 22, 18);
    capsText(acctName(a).toUpperCase(), 124, y + 15, 15, on ? '#06101c' : '#fff', { weight: 800, track: 2 });
    capsText('LEVEL ' + a.level + '  ·  ' + a.stats.w + 'W ' + a.stats.l + 'L  ·  ' + tierOf(a.rank.r)[0], 124, y + 32, 10, on ? '#0a1a2c' : 'rgba(214,224,240,0.6)', { weight: 700, track: 2 });
    if (acct && a.id === acct.id) capsText('SIGNED IN', 512, y + 22, 10, on ? '#0a1a2c' : UI.blueHi, { align: 'right', weight: 800, track: 3 });
    if (ui2.del === i) capsText('PRESS X AGAIN TO REMOVE IT', 512, y + 36, 9, '#ff3a44', { align: 'right', weight: 800, track: 2 }); });
  uiPrompts([['↑ ↓', 'CHOOSE'], ['ENTER', 'SIGN IN'], ['X', 'DELETE'], ['ESC', 'BACK']]);
}
function presenceLine() { return !acct ? 'NOT SIGNED IN' : social.ready ? 'ONLINE AS ' + acctName(acct).toUpperCase() : social.err === 'offline' ? 'OFFLINE · NO CONNECTION' : social.err ? social.err.toUpperCase() : 'CONNECTING…'; }
function drawOnlineHub() {
  drawMenuBg(); uiHeader('ONLINE', 'LOBBY · FRIENDS · MATCHMAKING');
  drawMenuList(ONLINE_MENU.map(m => m[0]), ui2.idx, 74, 130, 42, [null, friendsOnline() + ' ONLINE', rankLabel(rank.r).toUpperCase()], 0.86, { w: 330 });
  const x0 = W - 330, y0 = 112;
  uiPanel(x0, y0, 300, 120, { accent: social.ready ? '#7dff9a' : '#ff6b6b', glow: social.ready ? '#3ddc84' : null });
  capsText('YOU', x0 + 18, y0 + 20, 10, UI.blue, { weight: 800, track: 5 });
  ctx.beginPath(); ctx.arc(x0 + 24, y0 + 46, 5, 0, 7); ctx.fillStyle = social.ready ? '#3ddc84' : social.err ? '#ff3a44' : '#ffd23f'; ctx.fill();
  capsText(presenceLine(), x0 + 36, y0 + 46, 11, '#fff', { weight: 800, track: 2 });
  ctx.save(); ctx.font = '12px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(ONLINE_MENU[ui2.idx][1] || 'Back to the main menu.', x0 + 18, y0 + 74, 266, 15); ctx.restore();
  uiPanel(x0, y0 + 134, 300, 70, { accent: UI.blue });
  capsText('YOUR FRIEND CODE', x0 + 18, y0 + 152, 10, UI.blue, { weight: 800, track: 4 });
  chromeText(acctName(acct).toUpperCase(), x0 + 16, y0 + 180, 20, { weight: 900 });
  uiPrompts([['↑ ↓', 'NAVIGATE'], ['ENTER', 'SELECT'], ['ESC', 'BACK']]);
}
const friendsOnline = () => acct ? acct.friends.filter(f => f.st === 'friend' && social.info[fkey(f)] && social.info[fkey(f)].on).length : 0;
function friendRows() {
  if (!acct) return [];
  const st = f => { const I = social.info[fkey(f)]; return I && I.on ? 0 : 1; };
  const ins = acct.friends.filter(f => f.st === 'in'), fr = acct.friends.filter(f => f.st === 'friend').sort((a, b) => st(a) - st(b)), sent = acct.friends.filter(f => f.st === 'sent');
  return ins.concat(fr, sent);
}
function drawFriends() {
  drawMenuBg(); uiHeader('FRIENDS', 'ONLINE');
  const rows = friendRows(), x0 = 56, k = easeOut(clamp(screenT / 20, 0, 1));
  ctx.save(); ctx.globalAlpha = k;
  uiPanel(W - 330, 112, 300, 96, { accent: UI.blue });
  capsText('YOUR FRIEND CODE', W - 312, 130, 10, UI.blue, { weight: 800, track: 4 }); chromeText(acctName(acct).toUpperCase(), W - 314, 158, 20, { weight: 900 });
  capsText(presenceLine(), W - 312, 188, 9, social.ready ? '#7dff9a' : '#ffd23f', { weight: 700, track: 2 });
  if (!rows.length) { uiPanel(x0, 112, 470, 90, { alpha: 0.7 }); ctx.font = '13.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('No friends yet. Press A and type a friend code', x0 + 18, 142); ctx.fillText('(like NAME#1234) to send a request.', x0 + 18, 164); }
  rows.slice(0, 8).forEach((f, i) => { const y = 112 + i * 50, on = i === ui2.idx, I = social.info[fkey(f)] || {}, card = I.card || f, online = !!I.on;
    uiMenuItem(x0, y, 470, 42, '', on, (screenT - i * 3) / 16);
    hexPortrait(charOf(card.fav), 0, x0 + 38, y + 21, 16);
    capsText(acctName(f).toUpperCase(), x0 + 64, y + 14, 14, on ? '#06101c' : '#fff', { weight: 800, track: 2 });
    const sub = f.st === 'in' ? 'WANTS TO BE FRIENDS  ·  ENTER ACCEPT  ·  X DECLINE' : f.st === 'sent' ? 'REQUEST SENT  ·  WAITING' : online ? (card.st || 'ONLINE') + (card.lv ? '  ·  LV ' + card.lv : '') + (card.w != null ? '  ·  ' + card.w + 'W ' + card.l + 'L' : '') : 'OFFLINE' + (I.seen ? '' : '…');
    capsText(sub, x0 + 64, y + 30, 9, on ? '#0a1a2c' : f.st === 'in' ? '#ffd23f' : online ? '#7dff9a' : 'rgba(214,224,240,0.5)', { weight: 700, track: 2 });
    if (f.st === 'friend') { ctx.beginPath(); ctx.arc(x0 + 452, y + 21, 5, 0, 7); ctx.fillStyle = online ? '#3ddc84' : '#555b66'; ctx.fill(); } });
  ctx.restore();
  if (ui2.input) { uiPanel(W / 2 - 230, 200, 460, 120, { accent: UI.blue, accentTop: 1, alpha: 0.96, glow: UI.blue }); textBox(W / 2 - 200, 248, 400, 'ADD A FRIEND: TYPE THEIR FRIEND CODE', ui2.input.buf, true, 'NAME#1234'); }
  const sel = rows[ui2.idx], I = sel && social.info[fkey(sel)];
  uiPrompts(ui2.input ? [['ENTER', 'SEND REQUEST'], ['ESC', 'CANCEL']] : [['A', 'ADD FRIEND'], ['ENTER', sel && sel.st === 'in' ? 'ACCEPT' : sel && I && I.on && sel.st === 'friend' ? 'INVITE TO FIGHT' : 'REFRESH'], ['X', 'REMOVE'], ['ESC', 'BACK']]);
}
function drawOLobby() {
  drawMenuBg(); const L = social.lobby, list = lobbyList();
  uiHeader('LOBBY', 'LIVE · ' + (list.length + 1) + ' IN THE LOBBY');
  const x0 = 56;
  uiPanel(W - 330, 112, 300, 110, { accent: '#3ddc84', glow: '#3ddc84' });
  capsText('YOU ARE IN THE LOBBY AS', W - 312, 130, 10, '#3ddc84', { weight: 800, track: 3 }); chromeText(acctName(acct).toUpperCase(), W - 314, 158, 20, { weight: 900 });
  ctx.save(); ctx.font = '12px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  wrap(!L || L.k < 0 ? (L && L.full ? 'The lobby is full right now. Try again soon.' : 'Joining the lobby…') : 'Everyone here can see you. Pick someone and press Enter to challenge them.', W - 312, 186, 270, 15); ctx.restore();
  if (!list.length) { uiPanel(x0, 112, 470, 96, { alpha: 0.7 }); ctx.font = '13.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(L && L.k >= 0 ? 'Nobody else is in the lobby right now.' : 'Looking for players…', x0 + 18, 142); ctx.fillText('Players who open the lobby show up here live.', x0 + 18, 164);
    const a0 = frame / 12; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x0 + 440, 160, 16, 0, 7); ctx.stroke(); ctx.strokeStyle = UI.blue; ctx.beginPath(); ctx.arc(x0 + 440, 160, 16, a0, a0 + 1.6); ctx.stroke(); }
  list.slice(0, 8).forEach((m, i) => { const y = 112 + i * 50, on = i === ui2.idx, c = m.card, fr = findFriend(c);
    uiMenuItem(x0, y, 470, 42, '', on, (screenT - i * 3) / 16);
    hexPortrait(charOf(c.fav), 0, x0 + 38, y + 21, 16);
    capsText(acctName(c).toUpperCase(), x0 + 64, y + 14, 14, on ? '#06101c' : '#fff', { weight: 800, track: 2 });
    capsText('LV ' + (c.lv || 1) + '  ·  ' + (c.w || 0) + 'W ' + (c.l || 0) + 'L  ·  ' + tierOf(c.r || 1000)[0] + (fr && fr.st === 'friend' ? '  ·  FRIEND' : ''), x0 + 64, y + 30, 9, on ? '#0a1a2c' : 'rgba(214,224,240,0.6)', { weight: 700, track: 2 });
    capsText(c.st || '', x0 + 452, y + 21, 9, on ? '#0a1a2c' : '#7dff9a', { align: 'right', weight: 800, track: 2 }); });
  uiPrompts([['↑ ↓', 'CHOOSE'], ['ENTER', 'CHALLENGE'], ['F', 'ADD FRIEND'], ['ESC', 'BACK']]);
}
// an invite pops up over any menu
function drawSocialOverlay() {
  const I = social.inv; if (!I) return;
  if (frame - I.t > 60 * 30) { answerInvite(false); return; } // ignored for 30 seconds: declined
  if (screen === 'fight' && !matchOver) return;
  const x0 = W / 2 - 250, y0 = 70, k = easeOut(clamp((frame - I.t) / 14, 0, 1));
  ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * -20);
  uiPanel(x0, y0, 500, 92, { accent: '#ffd23f', accentTop: 1, alpha: 0.97, glow: '#ffd23f' });
  hexPortrait(charOf(I.from.fav), 0, x0 + 46, y0 + 46, 28);
  capsText(I.kind === 'trn' ? 'TOURNAMENT INVITE' : I.kind === 'sq' ? 'SQUAD INVITE' : 'CHALLENGE', x0 + 88, y0 + 22, 10, '#ffd23f', { weight: 800, track: 5 });
  chromeText(acctName(I.from).toUpperCase(), x0 + 86, y0 + 46, 20, { weight: 900 });
  capsText(I.kind === 'sq' ? 'INVITES YOU TO THEIR SQUAD PARTY' : I.kind === 'trn' ? 'INVITES YOU TO ' + String(I.name || 'A TOURNAMENT').toUpperCase().slice(0, 26) : 'WANTS TO FIGHT YOU' + (I.from.lv ? '  ·  LV ' + I.from.lv : ''), x0 + 88, y0 + 70, 10, '#fff', { weight: 700, track: 3 });
  const kw = keyCap(x0 + 360, y0 + 34, 'Y'); capsText('ACCEPT', x0 + 366 + kw, y0 + 34, 11, '#7dff9a', { weight: 800, track: 2 });
  const kw2 = keyCap(x0 + 360, y0 + 62, 'N'); capsText('DECLINE', x0 + 366 + kw2, y0 + 62, 11, '#ff6b6b', { weight: 800, track: 2 });
  ctx.restore();
}
function drawAcctScreen() {
  if (screen === 'account') drawAccountCreate(); else if (screen === 'profile') drawProfile(); else if (screen === 'accounts') drawAccounts();
  else if (screen === 'online') drawOnlineHub(); else if (screen === 'friends') drawFriends(); else if (screen === 'olobby') drawOLobby();
}
// the results screen: XP earned, the level bar and the record
function drawResultsAccount() {
  if (!acct || !acctRes) return;
  const k = easeOut(clamp((frame - acctRes.t - 40) / 30, 0, 1)); if (k <= 0) return;
  const x0 = winner === 1 ? 40 : W - 330, y0 = 92, S = acct.stats, fillK = clamp((frame - acctRes.t - 60) / 50, 0, 1);
  ctx.save(); ctx.globalAlpha = k;
  uiPanel(x0, y0, 290, 96, { accent: UI.blue, glow: UI.blue });
  capsText(acctName(acct).toUpperCase(), x0 + 16, y0 + 18, 11, '#fff', { weight: 800, track: 2 });
  capsText('+' + Math.round(acctRes.xp * fillK) + ' XP', x0 + 274, y0 + 18, 13, '#7dff9a', { align: 'right', weight: 900, track: 1 });
  const lvShow = acctRes.ups && fillK > 0.6 ? acct.level : acctRes.from.level, q = acctRes.ups ? (fillK < 0.6 ? lerp(acctRes.from.xp / xpNeed(acctRes.from.level), 1, fillK / 0.6) : acct.xp / xpNeed(acct.level) * (fillK - 0.6) / 0.4) : lerp(acctRes.from.xp, acct.xp, fillK) / xpNeed(acct.level);
  capsText('LEVEL ' + lvShow, x0 + 16, y0 + 42, 10, acctRes.ups && fillK > 0.6 ? '#ffd23f' : 'rgba(214,224,240,0.7)', { weight: 800, track: 3 });
  uiMeter(x0 + 86, y0 + 37, 188, 9, q, '#1f6fe0', { sk: 3, full: acctRes.ups && fillK > 0.6 });
  capsText('RECORD  ' + S.w + 'W  ' + S.l + 'L' + (S.d ? '  ' + S.d + 'D' : '') + '   ·   ' + pct(S.w, S.l) + ' WINS', x0 + 16, y0 + 66, 10, '#fff', { weight: 700, track: 2 });
  capsText(S.streak > 1 ? S.streak + ' WIN STREAK' : acctRes.ups ? 'LEVEL UP!' : 'PROGRESS SAVED', x0 + 16, y0 + 84, 9, S.streak > 1 || acctRes.ups ? '#ffd23f' : 'rgba(214,224,240,0.5)', { weight: 800, track: 3 });
  ctx.restore();
}

// ---------- keys on these screens ----------
// returns true when it handled the key (invite answers work on any menu)
function socialKeys(code) {
  if (social.inv && !(screen === 'fight' && !matchOver) && !textEntryOn()) { if (code === 'KeyY') { answerInvite(true); return true; } if (code === 'KeyN') { answerInvite(false); return true; } }
  return false;
}
function acctPress(code, key) {
  const nav = (len, cur) => isUp(code) ? (cur + len - 1) % len : isDown(code) ? (cur + 1) % len : cur;
  if (screen === 'account') {
    if (code === 'Escape') { sfx('back'); if (acct) setScreen(ui2.rename ? 'profile' : 'accounts'); else setScreen('title'); return; }
    if (code === 'Backspace') { ui2.name = ui2.name.slice(0, -1); return; }
    if (!ui2.rename && (code === 'ArrowLeft' || code === 'ArrowRight')) { ui2.fav = (ui2.fav + (code === 'ArrowRight' ? 1 : CHARS.length - 1)) % CHARS.length; sfx('select'); return; }
    if (isOk(code) && code !== 'Space') { const nm = ui2.name.trim(); if (!NAME_OK.test(nm)) { sfx('back'); toast = { msg: 'Names are 3 to 16 letters, numbers, spaces or _', t: 180 }; return; }
      sfx('confirm');
      if (ui2.rename) { socialStop(); acct.name = nm; saveAccounts(); socialStart(); toast = { msg: 'Your name is now ' + acctName(acct), t: 200 }; setScreen('profile'); }
      else { createAccount(nm, CHARS[ui2.fav].id); setScreen(ui2.after || 'mode'); } return; }
    if (key && key.length === 1 && /[A-Za-z0-9_ ]/.test(key) && ui2.name.length < 16) ui2.name += key;
    return;
  }
  if (code === 'Escape') { sfx('back'); if (ui2.input) { ui2.input = null; return; } if (screen === 'olobby') lobbyLeave(); ui2.idx = 0; setScreen(screen === 'accounts' ? 'profile' : screen === 'friends' || screen === 'olobby' ? 'online' : 'mode'); return; }
  if (screen === 'profile') {
    const n = nav(PROFILE_MENU.length, ui2.idx); if (n !== ui2.idx) { ui2.idx = n; sfx('select'); }
    const it = PROFILE_MENU[ui2.idx];
    if (it === 'FAVOURITE FIGHTER' && (isLeft(code) || isRight(code) || isOk(code))) { const i = CHARS.findIndex(c => c.id === acct.fav); acct.fav = CHARS[(i + (isLeft(code) ? CHARS.length - 1 : 1)) % CHARS.length].id; saveAccounts(); sfx('toggle'); return; }
    if (!isOk(code)) return;
    sfx('confirm');
    if (it === 'CHANGE NAME') { openAccountCreate('profile'); ui2.rename = true; ui2.name = acct.name; }
    else if (it === 'SWITCH ACCOUNT') { ui2.idx = Object.values(accounts.list).sort((a, b) => a.created - b.created).findIndex(a => a.id === acct.id); ui2.del = -1; setScreen('accounts'); }
    else if (it === 'EXPORT SAVE') exportSave();
    else if (it === 'IMPORT SAVE') { const s = window.prompt('Paste your BP VERSE save code:'); if (s) importSave(s); }
    else { ui2.idx = 0; setScreen('mode'); }
    return;
  }
  if (screen === 'accounts') {
    const L = Object.values(accounts.list).sort((a, b) => a.created - b.created), n = nav(L.length + 1, ui2.idx);
    if (n !== ui2.idx) { ui2.idx = n; ui2.del = -1; sfx('select'); }
    if (code === 'Delete' || code === 'KeyX') { if (ui2.idx >= L.length) return; if (ui2.del === ui2.idx) { deleteAccount(L[ui2.idx].id); ui2.del = -1; ui2.idx = 0; sfx('back'); toast = { msg: 'Account removed', t: 140 }; if (!acct) openAccountCreate('mode'); } else { ui2.del = ui2.idx; sfx('tick'); } return; }
    if (isOk(code)) { sfx('confirm'); if (ui2.idx >= L.length) openAccountCreate('profile'); else { signIn(L[ui2.idx].id); ui2.idx = 0; setScreen('profile'); } }
    return;
  }
  if (screen === 'online') {
    const n = nav(ONLINE_MENU.length, ui2.idx); if (n !== ui2.idx) { ui2.idx = n; sfx('select'); }
    if (!isOk(code)) return;
    const it = ONLINE_MENU[ui2.idx][0]; sfx('confirm');
    if (it === 'LOBBY') { ui2.idx = 0; setScreen('olobby'); lobbyJoin(); } else if (it === 'FRIENDS') { ui2.idx = 0; setScreen('friends'); socialPoll(); }
    else if (it === 'RANKED') findMatch(true); else if (it === 'QUICK MATCH') findMatch(false); else if (it === 'HOST A ROOM') hostRoom();
    else if (it === 'JOIN A ROOM') { setScreen('join'); joinCode = ''; } else { ui2.idx = 0; setScreen('mode'); }
    return;
  }
  if (screen === 'friends') {
    if (ui2.input) {
      if (code === 'Backspace') ui2.input.buf = ui2.input.buf.slice(0, -1);
      else if (isOk(code) && code !== 'Space') { if (addFriend(ui2.input.buf)) ui2.input = null; }
      else if (key && key.length === 1 && /[A-Za-z0-9_ #]/.test(key) && ui2.input.buf.length < 21) ui2.input.buf += key;
      return;
    }
    const rows = friendRows(), n = rows.length ? nav(rows.length, ui2.idx) : 0; if (n !== ui2.idx) { ui2.idx = n; sfx('select'); }
    const f = rows[ui2.idx];
    if (code === 'KeyA') { ui2.input = { buf: '' }; sfx('confirm'); return; }
    if ((code === 'Delete' || code === 'KeyX') && f) { removeFriend(f); ui2.idx = Math.max(0, ui2.idx - 1); sfx('back'); return; }
    if (isOk(code)) { if (!f) { socialPoll(); return; } if (f.st === 'in') { acceptFriend(f); sfx('lock'); } else if (f.st === 'friend' && social.info[fkey(f)] && social.info[fkey(f)].on) inviteTo(social.info[fkey(f)].card || f); else { socialPoll(); sfx('tick'); toast = { msg: 'Checking who is online…', t: 90 }; } }
    return;
  }
  if (screen === 'olobby') {
    const list = lobbyList(), n = list.length ? nav(list.length, ui2.idx) : 0; if (n !== ui2.idx) { ui2.idx = n; sfx('select'); }
    const m = list[ui2.idx]; if (!m) return;
    if (code === 'KeyF') { addFriend(acctName(m.card)); sfx('confirm'); }
    else if (isOk(code)) { lobbyLeave(); inviteTo(m.card); }
  }
}
