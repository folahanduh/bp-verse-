// ---------- tournaments: open and closed party cups ----------
// Peer-to-peer like everything online here: whoever creates the cup hosts it. Everyone in the party connects to
// the host, and the host's game runs the bracket (single elimination, byes when the numbers don't fit). Each
// bracket match is a normal online fight in its own room; both players report the result and the host moves the
// winner on. OPEN cups show up in the browser for anyone to join; CLOSED cups need the code or an invite.
const TRN_PREFIX = PEER_PREFIX + 'trn-', TLIST_SLOTS = 10, tListId = k => PEER_PREFIX + 'trnlist-' + k;
const T = { role: null, st: null, peer: null, lpeer: null, hostConn: null, conns: {}, playing: null, tries: 0, browse: null, status: '', pick: null, leave: 0, done: 0 };
const ekey = a => a ? fkey(a) : null; // entrants are keyed by name#tag
const myKey = () => ekey(acct);
const tEnt = k => T.st && T.st.ents.find(e => e.key === k);
const tName = k => { const e = tEnt(k); return e ? acctName(e) : k === null ? 'BYE' : '?'; };
const ROUND_NAMES = n => n === 1 ? 'FINAL' : n === 2 ? 'SEMI-FINALS' : n === 4 ? 'QUARTER-FINALS' : 'ROUND OF ' + n * 2;
function tCard() { const c = acctCard(); return { key: myKey(), name: c.name, tag: c.tag, fav: c.fav, lv: c.lv, w: c.w, l: c.l, r: c.r }; }

// ---- hosting ----
function tCreate(name, size, open) {
  if (!acct) return; tLeave(true);
  const code = genCode();
  T.role = 'host'; T.status = 'Opening the tournament';
  T.st = { name: (name || acct.name + "'s Cup").slice(0, 24), code, size, open: !!open, host: myKey(), ents: [tCard()], rounds: [], r: 0, st: 'lobby', champ: null, v: 1 };
  setScreen('tourney');
  socialLoad(() => {
    if (T.role !== 'host' || !T.st || T.st.code !== code) return;
    const p = T.peer = mkPeer(TRN_PREFIX + code);
    p.on('open', () => { T.status = open ? 'Open: anyone can join from the tournament browser' : 'Closed: share the code or invite friends'; if (open) tList(0); });
    p.on('connection', c => { c.on('data', d => tHostData(d, c)); c.on('close', () => tDropConn(c)); c.on('error', () => {}); });
    p.on('error', e => { if (e.type === 'unavailable-id' && T.role === 'host') { T.st.code = genCode(); try { p.destroy(); } catch (e2) {} tCreate(T.st.name, size, open); } else if (e.type !== 'peer-unavailable') T.status = 'Connection problem (' + e.type + ')'; });
  });
}
// open cups take a numbered listing slot so the browser can find them
function tList(k) {
  if (T.role !== 'host' || !T.st || !T.st.open || k >= TLIST_SLOTS) return;
  const p = mkPeer(tListId(k)); T.lpeer = p;
  p.on('connection', c => { c.on('data', d => { if (d && d.t === 'tinfo?' && T.st) { const S = T.st; try { c.send({ t: 'tinfo', name: S.name, code: S.code, size: S.size, n: S.ents.length, st: S.st, host: tEnt(S.host) }); } catch (e) {} } }); c.on('error', () => {}); });
  p.on('error', e => { if (e.type === 'unavailable-id') { try { p.destroy(); } catch (e2) {} if (T.lpeer === p) tList(k + 1); } });
}
const tBroadcast = () => { const S = T.st; S.v++; for (const k in T.conns) { try { T.conns[k].send({ t: 'tstate', s: S }); } catch (e) {} } tCheckMatch(); };
function tHostData(d, c) {
  const S = T.st; if (!S || !d || !d.t) return;
  if (d.t === 'tjoin' && d.user && d.user.key) {
    const u = d.user, have = tEnt(u.key);
    if (!have && S.st !== 'lobby') { c.send({ t: 'tno', why: 'That tournament has already started' }); return; }
    if (!have && S.ents.length >= S.size) { c.send({ t: 'tno', why: 'That tournament is full' }); return; }
    if (!have) { S.ents.push({ key: u.key, name: u.name, tag: u.tag, fav: u.fav, lv: u.lv, w: u.w, l: u.l, r: u.r }); toast = { msg: acctName(u) + ' joined the tournament', t: 160 }; sfx('lock'); }
    T.conns[u.key] = c; c._key = u.key; tBroadcast();
    if (S.st === 'lobby' && S.ents.length >= S.size) setTimeout(() => { if (T.st === S && S.st === 'lobby') tStart(); }, 2500); // full: it starts by itself
  }
  else if (d.t === 'tready') { const m = tMatch(d.code); if (m && !m.w) { m.room = d.room; tBroadcast(); } }
  else if (d.t === 'tres') tResult(d.code, d.w);
  else if (d.t === 'tleave' && c._key) tDrop(c._key);
}
function tDropConn(c) { if (c._key && T.conns[c._key] === c) { delete T.conns[c._key]; tDrop(c._key); } }
// someone left: gone from the lobby, or they forfeit their match
function tDrop(k) {
  const S = T.st; if (!S || k === S.host) return;
  if (S.st === 'lobby') { S.ents = S.ents.filter(e => e.key !== k); tBroadcast(); return; }
  if (S.st === 'run') { const m = S.rounds[S.r].find(m2 => !m2.w && (m2.a === k || m2.b === k)); if (m) { toast = { msg: tName(k) + ' left: their opponent goes through', t: 200 }; tResult(m.code, m.a === k ? m.b : m.a); } }
}
const tMatch = code => T.st && T.st.rounds[T.st.r] && T.st.rounds[T.st.r].find(m => m.code === code);
function tStart() {
  const S = T.st; if (!S || T.role !== 'host' || S.st !== 'lobby') return;
  if (S.ents.length < 2) { toast = { msg: 'You need at least 2 players to start', t: 160 }; return; }
  const n = S.ents.length, size = n <= 2 ? 2 : n <= 4 ? 4 : 8, seeds = S.ents.map(e => e.key);
  for (let i = seeds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seeds[i], seeds[j]] = [seeds[j], seeds[i]]; }
  while (seeds.length < size) seeds.push(null); // byes at the end of the draw: the top seeds get them
  const slots = []; for (let i = 0; i < size / 2; i++) slots.push(seeds[i], seeds[size - 1 - i]); // seed 1 meets the last seed: byes spread across the bracket
  S.rounds = [[]]; for (let i = 0; i < size; i += 2) S.rounds[0].push({ a: slots[i], b: slots[i + 1], w: null, code: genCode(), room: null });
  S.st = 'run'; S.r = 0; sfx('confirm'); toast = { msg: S.name + ' has started!', t: 200 };
  tSettleByes(); tBroadcast();
}
function tSettleByes() { for (const m of T.st.rounds[T.st.r]) if (!m.w && (!m.a || !m.b)) m.w = m.a || m.b || null; tNextRound(); }
function tResult(code, w) {
  const S = T.st, m = tMatch(code); if (!S || T.role !== 'host' || !m || m.w || (w !== m.a && w !== m.b)) return;
  m.w = w; toast = { msg: tName(w) + ' wins their match', t: 160 }; tNextRound(); tBroadcast();
}
// every match in the round has a winner: on to the next round, or crown the champion
function tNextRound() {
  const S = T.st, R = S.rounds[S.r]; if (!R.every(m => m.w !== null || (!m.a && !m.b))) return;
  const ws = R.map(m => m.w);
  if (ws.length === 1) { S.st = 'done'; S.champ = ws[0]; return; }
  const next = []; for (let i = 0; i < ws.length; i += 2) next.push({ a: ws[i], b: ws[i + 1], w: null, code: genCode(), room: null });
  S.rounds.push(next); S.r++;
  for (const m of next) if (!m.a || !m.b) m.w = m.a || m.b || null;
  if (next.every(m => m.w !== null)) tNextRound();
}

// ---- joining ----
function tJoin(code) {
  if (!acct) return; tLeave(true);
  T.role = 'ent'; T.status = 'Joining tournament ' + code; T.st = null; T.code = code; setScreen('tourney');
  socialLoad(() => {
    if (T.role !== 'ent' || T.code !== code) return;
    const p = T.peer = mkPeer();
    p.on('open', () => {
      const c = T.hostConn = p.connect(TRN_PREFIX + code, { reliable: true, serialization: 'json' });
      c.on('open', () => c.send({ t: 'tjoin', user: tCard() }));
      c.on('data', d => tEntData(d));
      c.on('close', () => { if (T.hostConn === c && T.st && T.st.st !== 'done') { tLeave(true); setScreen('play'); toast = { msg: 'The tournament host left: the tournament is over', t: 260 }; } });
      c.on('error', () => {});
    });
    p.on('error', e => { if (e.type === 'peer-unavailable' && T.role === 'ent' && !T.st) { tLeave(true); setScreen('play'); toast = { msg: 'Tournament ' + code + ' not found', t: 220 }; } });
  });
  setTimeout(() => { if (T.role === 'ent' && T.code === code && !T.st) { tLeave(true); setScreen('play'); toast = { msg: 'Could not reach tournament ' + code, t: 220 }; } }, 15000);
}
function tEntData(d) {
  if (!d || !d.t) return;
  if (d.t === 'tstate') { const was = T.st && T.st.st; T.st = d.s; T.status = ''; if (was === 'lobby' && d.s.st === 'run') { toast = { msg: d.s.name + ' has started!', t: 200 }; sfx('confirm'); } tCheckMatch(); }
  else if (d.t === 'tno') { tLeave(true); setScreen('play'); toast = { msg: d.why, t: 220 }; }
  else if (d.t === 'tend') { if (T.st && T.st.st === 'done') { T.hostConn = null; return; } tLeave(true); setScreen('play'); toast = { msg: 'The host closed the tournament', t: 220 }; }
}
const tSend = o => { if (T.role === 'host') tHostData(o, { send() {}, _key: myKey() }); else if (T.hostConn) try { T.hostConn.send(o); } catch (e) {} };

// ---- playing your bracket match ----
const tMyMatch = () => { const S = T.st; if (!S || S.st !== 'run') return null; return S.rounds[S.r].find(m => !m.w && m.a && m.b && (m.a === myKey() || m.b === myKey())); };
// the first player of the pair opens the room, tells the host it's ready; the other joins once it is
function tCheckMatch() {
  const m = tMyMatch(); if (!m || T.playing) return; // already busy with a match (or its result screen)
  const me = myKey(), first = m.a === me;
  if (first && T.playing !== m.code && !net.role) {
    T.playing = m.code; T.tries = 0;
    setTimeout(() => { if (T.playing !== m.code || net.role) return; hostRoom(null, () => tSend({ t: 'tready', code: m.code, room: net.code })); net.status = 'Tournament match: waiting for ' + tName(m.b); }, 600);
  } else if (!first && m.room && T.playing !== m.code && !net.role) { T.playing = m.code; T.tries = 0; setTimeout(() => { if (T.playing === m.code && !net.role) joinRoom(m.room); }, 900); }
}
// the result screen of a tournament match: both report it, and Enter takes you back to the bracket
function tReportResult() {
  if (!T.playing || !P.length) return;
  const me = mySlot(), opp = net.oppUser ? ekey(net.oppUser) : null, mine = winner >= 0 ? winner === me : P[me].hp >= P[1 - me].hp;
  const m = T.st && T.st.rounds[T.st.r] && T.st.rounds[T.st.r].find(x => x.code === T.playing), w = mine ? myKey() : opp || (m && (m.a === myKey() ? m.b : m.a));
  if (w) tSend({ t: 'tres', code: T.playing, w });
}
function tBackToBracket() { const code = T.playing; T.playing = null; netReset(); setScreen('tourney'); T.lastPlayed = code; setTimeout(tCheckMatch, 400); }
// online trouble during a bracket match: retry the join a few times; an opponent who walks out forfeits
function tNetFail(msg) {
  if (!T.st || !T.playing) return false;
  const code = T.playing, fight = screen === 'fight' || screen === 'select' || screen === 'stage' || screen === 'vs';
  if (/disconnected|left the game/.test(msg) && fight) { tSend({ t: 'tres', code, w: myKey() }); toast = { msg: 'Your opponent left: you go through', t: 240 }; T.playing = null; setScreen('tourney'); return true; }
  if (/not found|Could not connect/.test(msg) && ++T.tries < 5) { setScreen('tourney'); T.status = 'Connecting to your match… (try ' + (T.tries + 1) + ')'; setTimeout(() => { const m = tMatch(code); if (m && m.room && !net.role) joinRoom(m.room); }, 2500); return true; }
  T.playing = null; setScreen('tourney'); toast = { msg, t: 240 }; return true;
}
function tLeave(quiet) {
  if (T.role === 'host') { for (const k in T.conns) { try { T.conns[k].send({ t: 'tend' }); } catch (e) {} } }
  else if (T.hostConn) { try { T.hostConn.send({ t: 'tleave' }); } catch (e) {} }
  const p = T.peer, lp = T.lpeer; setTimeout(() => { try { p && p.destroy(); } catch (e) {} try { lp && lp.destroy(); } catch (e) {} }, 300);
  Object.assign(T, { role: null, st: null, peer: null, lpeer: null, hostConn: null, conns: {}, playing: null, tries: 0, status: '', pick: null, leave: 0, done: 0, code: null });
  if (!quiet) toast = { msg: 'You left the tournament', t: 160 };
}
// when the cup ends: it goes on your record
function tFinishCheck() {
  const S = T.st; if (!S || S.st !== 'done' || T.done || !acct) return;
  T.done = 1; const won = S.champ === myKey(), A = acct.stats; A.tourn = (A.tourn || 0) + 1; if (won) A.tw = (A.tw || 0) + 1;
  const xp = won ? 400 : 100; acct.xp += xp; let ups = 0; while (acct.xp >= xpNeed(acct.level)) { acct.xp -= xpNeed(acct.level); acct.level++; ups++; }
  saveAccounts(); toast = { msg: won ? 'CHAMPION! +' + xp + ' XP' : S.name + ' is over. ' + tName(S.champ) + ' is the champion. +' + xp + ' XP', t: 320 }; sfx(won ? 'heroslam' : 'ready');
}

// ---- browsing open cups ----
function tBrowseStart() {
  tBrowseStop(); const B = T.browse = { list: {}, peer: null, timer: null };
  socialLoad(() => {
    if (T.browse !== B) return;
    const p = B.peer = mkPeer();
    p.on('open', () => { tScan(); setTimeout(tScan, 1500); setTimeout(tScan, 3500); B.timer = setInterval(tScan, 6000); }); // quick rescans first: a cup that opened a moment ago shows up fast
    p.on('error', e => { if (e.type === 'peer-unavailable') { const id = peerOf(e), k = id && +id.slice(tListId('').length); if (k >= 0) delete B.list[k]; } });
  });
}
function tScan() {
  const B = T.browse; if (!B || !B.peer) return;
  for (let k = 0; k < TLIST_SLOTS; k++) {
    const c = B.peer.connect(tListId(k), { reliable: true, serialization: 'json' });
    c.on('open', () => c.send({ t: 'tinfo?' }));
    c.on('data', d => { if (d && d.t === 'tinfo') B.list[k] = Object.assign({ seen: Date.now() }, d); setTimeout(() => { try { c.close(); } catch (e) {} }, 300); });
    c.on('error', () => {});
  }
  for (const k in B.list) if (Date.now() - B.list[k].seen > 20000) delete B.list[k];
}
function tBrowseStop() { const B = T.browse; if (!B) return; clearInterval(B.timer); try { B.peer && B.peer.destroy(); } catch (e) {} T.browse = null; }
const tBrowseList = () => T.browse ? Object.values(T.browse.list).sort((a, b) => (a.st === 'lobby' ? 0 : 1) - (b.st === 'lobby' ? 0 : 1)) : [];

// ---------- screens: create, browse, join by code, and the cup itself ----------
const TRN_SCREENS = ['tcreate', 'tbrowse', 'tcode', 'tourney'];
const tui = { name: '', size: 8, open: true, row: 0, code: '', idx: 0 };
function openTCreate(open) { tui.name = acct ? acct.name + "'s Cup" : 'BP Cup'; tui.size = 8; tui.open = open; tui.row = 0; setScreen('tcreate'); }
function drawTCreate() {
  drawMenuBg(); uiHeader('CREATE A TOURNAMENT', tui.open ? 'OPEN · ANYONE CAN JOIN' : 'CLOSED · CODE OR INVITE ONLY', { profile: false });
  const x0 = 70; uiPanel(x0 - 16, 112, 470, 300, { accent: '#ffd23f', glow: '#ffd23f' });
  textBox(x0, 150, 438, 'TOURNAMENT NAME', tui.name, tui.row === 0, 'Name your cup');
  const opt = (y, label, val, on) => { capsText(label, x0, y, 10, UI.blue, { weight: 800, track: 4 }); uiMenuItem(x0 - 4, y + 10, 440, 34, val, on, 1, on ? '◀ ▶' : '', { size: 15 }); };
  opt(222, 'PLAYERS', tui.size + ' PLAYERS', tui.row === 1);
  opt(282, 'TYPE', tui.open ? 'OPEN: LISTED FOR EVERYONE' : 'CLOSED: CODE OR INVITE ONLY', tui.row === 2);
  uiMenuItem(x0 - 4, 350, 440, 38, 'CREATE TOURNAMENT', tui.row === 3, 1, '', { size: 16, accent: '#ffd23f', light: '#ffe9a0' });
  const x1 = W - 340; uiPanel(x1, 112, 300, 210, { accent: UI.blue });
  capsText('HOW IT WORKS', x1 + 18, 132, 10, UI.blue, { weight: 800, track: 4 });
  ctx.save(); ctx.font = '12.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  wrap('You host the cup and you play in it too. When it fills up (or you press S), the bracket is drawn at random: single elimination, with byes if the numbers are uneven. Every match is a normal online fight; the winner moves on until one champion is left.', x1 + 18, 156, 266, 16); ctx.restore();
  uiPrompts([['↑ ↓', 'CHOOSE'], ['← →', 'CHANGE'], ['ENTER', tui.row === 3 ? 'CREATE' : 'NEXT'], ['ESC', 'BACK']]);
}
function drawTBrowse() {
  drawMenuBg(); const L = tBrowseList();
  uiHeader('OPEN TOURNAMENTS', 'LIVE · ' + L.length + ' FOUND');
  const x0 = 56;
  if (!L.length) { uiPanel(x0, 112, 520, 100, { alpha: 0.75 }); ctx.font = '13.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('No open tournaments right now.', x0 + 18, 144); ctx.fillText('Create one and others will see it here.', x0 + 18, 166);
    const a0 = frame / 12; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x0 + 490, 160, 16, 0, 7); ctx.stroke(); ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x0 + 490, 160, 16, a0, a0 + 1.6); ctx.stroke(); }
  L.slice(0, 7).forEach((t, i) => { const y = 112 + i * 52, on = i === tui.idx, full = t.n >= t.size, lob = t.st === 'lobby';
    uiMenuItem(x0, y, 520, 44, '', on, (screenT - i * 3) / 16, '', { accent: '#ffd23f', light: '#ffe9a0' });
    trophy(x0 + 36, y + 22, 13, on ? '#06101c' : '#ffd23f');
    capsText(t.name.toUpperCase(), x0 + 62, y + 15, 15, on ? '#06101c' : '#fff', { weight: 800, track: 2 });
    capsText('HOSTED BY ' + (t.host ? acctName(t.host).toUpperCase() : '?') + '  ·  ' + t.n + ' / ' + t.size + ' PLAYERS', x0 + 62, y + 32, 9, on ? '#0a1a2c' : 'rgba(214,224,240,0.6)', { weight: 700, track: 2 });
    capsText(lob ? (full ? 'FULL' : 'JOIN') : 'IN PROGRESS', x0 + 504, y + 22, 11, on ? '#06101c' : lob && !full ? '#7dff9a' : 'rgba(214,224,240,0.45)', { align: 'right', weight: 900, track: 3 }); });
  uiPrompts([['↑ ↓', 'CHOOSE'], ['ENTER', 'JOIN'], ['C', 'ENTER A CODE'], ['ESC', 'BACK']]);
}
function drawTCode() {
  drawMenuBg(); uiHeader('JOIN A CLOSED TOURNAMENT', 'ENTER THE CODE', { profile: false });
  uiPanel(W / 2 - 260, 130, 520, 230, { accent: '#ffd23f', accentTop: 1, glow: '#ffd23f' });
  ctx.save(); ctx.font = '15px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Type the 4-character tournament code the host shared', W / 2, 168); ctx.restore();
  for (let i = 0; i < 4; i++) { const x = W / 2 - 150 + i * 80; chamfer(x, 200, 60, 80, 10); ctx.fillStyle = 'rgba(5,8,14,0.9)'; ctx.fill(); chamfer(x, 200, 60, 80, 10); ctx.strokeStyle = i === tui.code.length ? (frame % 40 < 24 ? '#ffe9a0' : '#ffd23f') : chromeGrad(200, 280); ctx.lineWidth = i === tui.code.length ? 3 : 1.5; ctx.stroke();
    if (tui.code[i]) chromeText(tui.code[i], x + 30, 242, 46, { align: 'center', weight: 900, track: 0, glow: 'rgba(255,210,63,0.5)' }); }
  uiPrompts([['ENTER', 'JOIN'], ['BACKSPACE', 'DELETE'], ['ESC', 'BACK']]);
}
// a little chrome cup
function trophy(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col || chromeGrad(-s, s, '#ffe08a'); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.9); ctx.lineTo(s * 0.7, -s * 0.9); ctx.quadraticCurveTo(s * 0.68, s * 0.1, 0, s * 0.3); ctx.quadraticCurveTo(-s * 0.68, s * 0.1, -s * 0.7, -s * 0.9); ctx.fill(); ctx.stroke();
  ctx.fillRect(-s * 0.12, s * 0.28, s * 0.24, s * 0.4); ctx.fillRect(-s * 0.45, s * 0.66, s * 0.9, s * 0.22);
  ctx.lineWidth = s * 0.14; ctx.strokeStyle = col || '#d8b04a'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * s * 0.72, -s * 0.45, s * 0.32, sx > 0 ? -Math.PI / 2 : Math.PI / 2, sx > 0 ? Math.PI / 2 : Math.PI * 1.5, false); ctx.stroke(); }
  ctx.restore();
}
function drawTourney() {
  drawMenuBg(); const S = T.st, me = myKey();
  if (!S) { uiHeader('TOURNAMENT', 'CONNECTING', { profile: false }); uiPanel(W / 2 - 220, 200, 440, 90, { accent: '#ffd23f' }); capsText((T.status || 'Connecting…').toUpperCase(), W / 2, 245, 12, '#fff', { align: 'center', weight: 800, track: 3 }); uiPrompts([['ESC', 'LEAVE']]); return; }
  tFinishCheck();
  uiHeader(S.name.toUpperCase(), (S.open ? 'OPEN' : 'CLOSED') + ' TOURNAMENT  ·  ' + S.ents.length + ' / ' + S.size + ' PLAYERS', { profile: false, accent: '#ffd23f' });
  // the cup card
  const x0 = 40, y0 = 100; uiPanel(x0, y0, 250, S.st === 'lobby' ? 170 : 120, { accent: '#ffd23f', glow: '#ffd23f' });
  trophy(x0 + 44, y0 + 46, 26);
  const hd = S.st === 'lobby' ? 'WAITING FOR PLAYERS' : S.st === 'run' ? ROUND_NAMES(S.rounds[S.r].length) : 'FINISHED';
  capsText(hd, x0 + 84, y0 + 30, fitText(hd, 11, 140, `800 SZpx ${DISP}`, 3), '#ffd23f', { weight: 800, track: 3 });
  capsText('HOST  ' + tName(S.host).toUpperCase(), x0 + 84, y0 + 50, 9, 'rgba(214,224,240,0.7)', { weight: 700, track: 2 });
  capsText((S.open ? 'OPEN' : 'CLOSED') + '  ·  CODE', x0 + 84, y0 + 68, 9, 'rgba(214,224,240,0.7)', { weight: 700, track: 2 });
  chromeText(S.code, x0 + 84, y0 + 94, 26, { weight: 900, track: 6, glow: 'rgba(255,210,63,0.4)' });
  if (S.st === 'lobby') { ctx.save(); ctx.font = '11.5px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.75)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(T.status || (S.open ? 'Listed in the open tournament browser.' : 'Share the code, or press I to invite a friend.'), x0 + 16, y0 + 128, 222, 14); ctx.restore(); }
  if (S.st === 'lobby') { // the party: everyone who's joined, and the open slots
    for (let i = 0; i < S.size; i++) { const e = S.ents[i], col = i % 2, row = i >> 1, x = 310 + col * 310, y = 104 + row * 66;
      uiPanel(x, y, 296, 56, { alpha: e ? 0.82 : 0.45, accent: e ? (e.key === me ? UI.blue : '#ffd23f') : null, cut: 10 });
      if (e) { hexPortrait(charOf(e.fav), 0, x + 32, y + 28, 20); capsText(acctName(e).toUpperCase(), x + 62, y + 21, 13, '#fff', { weight: 800, track: 2 });
        capsText('LV ' + (e.lv || 1) + '  ·  ' + (e.w || 0) + 'W ' + (e.l || 0) + 'L' + (e.key === S.host ? '  ·  HOST' : '') + (e.key === me ? '  ·  YOU' : ''), x + 62, y + 38, 9, 'rgba(214,224,240,0.6)', { weight: 700, track: 2 }); }
      else capsText('OPEN SLOT', x + 148, y + 28, 11, 'rgba(214,224,240,0.35)', { align: 'center', weight: 800, track: 5 }); }
  } else drawBracket(S, me);
  // what's next for you
  const m = tMyMatch(), out = S.st === 'run' && !S.rounds[S.r].some(x => x.a === me || x.b === me) && S.rounds[0].some(x => x.a === me || x.b === me);
  let line = '', col = '#fff';
  if (S.st === 'done') { line = S.champ === me ? 'YOU ARE THE CHAMPION!' : tName(S.champ).toUpperCase() + ' IS THE CHAMPION'; col = '#ffd23f'; }
  else if (m) { line = 'YOUR MATCH:  VS ' + tName(m.a === me ? m.b : m.a).toUpperCase() + (m.room || m.a === me ? '  ·  STARTING…' : '  ·  WAITING FOR THE ROOM'); col = '#7dff9a'; }
  else if (out) { line = 'YOU WERE KNOCKED OUT · WATCHING THE BRACKET'; col = '#ff6b6b'; }
  else if (S.st === 'run') { line = 'WAITING FOR THE OTHER MATCHES'; col = 'rgba(232,238,248,0.8)'; }
  if (line) { uiPanel(x0, y0 + (S.st === 'lobby' ? 182 : 132), 250, 50, { accent: col.startsWith('#') ? col : UI.blue, alpha: 0.85 }); ctx.save(); ctx.font = `800 11px ${DISP}`; tracked(2); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; wrap(line, x0 + 16, y0 + (S.st === 'lobby' ? 200 : 150), 222, 14); ctx.restore(); tracked(0); }
  if (S.st === 'done') { const k = 0.6 + 0.4 * Math.sin(frame / 10); trophy(x0 + 125, 330, 34 + k * 3); chromeText(tName(S.champ).toUpperCase(), x0 + 125, 384, fitText(tName(S.champ).toUpperCase(), 18, 240, `italic 900 SZpx ${DISP}`, 1), { align: 'center', weight: 900, glow: 'rgba(255,210,63,0.6)' }); }
  if (T.pick) drawTPick();
  const pr = []; if (T.role === 'host' && S.st === 'lobby') { pr.push(['S', 'START NOW'], ['I', 'INVITE A FRIEND']); }
  pr.push(['ESC', T.leave ? 'PRESS AGAIN TO LEAVE' : S.st === 'done' ? 'DONE' : 'LEAVE']);
  uiPrompts(T.pick ? [['↑ ↓', 'CHOOSE'], ['ENTER', 'INVITE'], ['ESC', 'CANCEL']] : pr);
}
// the bracket: a column per round, joined by lines; winners lit, losers dimmed, you in blue
function drawBracket(S, me) {
  const total = Math.max(1, Math.round(Math.log2(S.rounds[0].length * 2))), x0 = 310, w = W - x0 - 30, cw = Math.min(200, (w - 22 * (total - 1)) / total), top = 104, hgt = 360;
  for (let r = 0; r < total; r++) {
    const R = S.rounds[r] || Array.from({ length: S.rounds[0].length >> r }, () => ({ a: undefined, b: undefined, w: null })), n = R.length, x = x0 + r * (cw + 22);
    capsText(ROUND_NAMES(n), x + 2, top - 2, 9, r === S.r && S.st === 'run' ? '#ffd23f' : 'rgba(214,224,240,0.6)', { weight: 800, track: 3 });
    R.forEach((m, i) => { const slot = hgt / n, y = top + 10 + slot * i + slot / 2 - 26, live = r === S.r && S.st === 'run' && !m.w && m.a && m.b;
      uiPanel(x, y, cw, 52, { alpha: 0.85, cut: 8, accent: live ? '#ffd23f' : null, glow: live && frame % 60 < 30 ? '#ffd23f' : null });
      [m.a, m.b].forEach((k, j) => { const yy = y + 15 + j * 22, won = m.w && m.w === k, lost = m.w && k && m.w !== k, mine = k === me;
        if (k === undefined) { capsText('—', x + 12, yy, 10, 'rgba(214,224,240,0.3)', { weight: 700 }); return; }
        if (k) { const e = tEnt(k); if (e) { hexPath(x + 16, yy, 7); ctx.fillStyle = rgba(charOf(e.fav).color, lost ? 0.25 : 0.8); ctx.fill(); } }
        capsText(k ? tName(k).toUpperCase().slice(0, 16) : 'BYE', x + 28, yy, 10, mine ? UI.blueHi : won ? '#fff' : lost ? 'rgba(214,224,240,0.35)' : k ? 'rgba(232,238,248,0.85)' : 'rgba(214,224,240,0.35)', { weight: won || mine ? 800 : 600, track: 1 });
        if (won) capsText('✓', x + cw - 12, yy, 11, '#7dff9a', { align: 'right', weight: 900, track: 0 }); });
      if (r < total - 1) { const ny = top + 10 + (hgt / (n / 2)) * Math.floor(i / 2) + hgt / n, my = y + 26; ctx.strokeStyle = 'rgba(150,172,205,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + cw, my); ctx.lineTo(x + cw + 11, my); ctx.lineTo(x + cw + 11, ny); ctx.lineTo(x + cw + 22, ny); ctx.stroke(); }
    });
  }
}
// host: pick an online friend to invite
function drawTPick() {
  const L = T.pick.list; uiPanel(W / 2 - 220, 150, 440, 60 + Math.max(1, L.length) * 40, { accent: '#ffd23f', accentTop: 1, alpha: 0.97, glow: '#ffd23f' });
  capsText('INVITE AN ONLINE FRIEND', W / 2 - 200, 172, 11, '#ffd23f', { weight: 800, track: 4 });
  if (!L.length) { ctx.font = '13px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('None of your friends are online right now.', W / 2 - 200, 200); }
  L.forEach((f, i) => uiMenuItem(W / 2 - 200, 186 + i * 40, 400, 34, acctName(f).toUpperCase(), i === T.pick.i, 1, '', { size: 14, accent: '#ffd23f', light: '#ffe9a0' }));
}
function drawTrnScreen() { if (screen === 'tcreate') drawTCreate(); else if (screen === 'tbrowse') drawTBrowse(); else if (screen === 'tcode') drawTCode(); else if (screen === 'tourney') drawTourney(); }

function trnPress(code, key) {
  const nav = (len, cur) => isUp(code) ? (cur + len - 1) % len : isDown(code) ? (cur + 1) % len : cur;
  if (screen === 'tcreate') {
    if (code === 'Escape') { sfx('back'); setScreen('play'); return; }
    const n = nav(4, tui.row); if (n !== tui.row) { tui.row = n; sfx('select'); return; }
    if (tui.row === 0) { if (code === 'Backspace') { tui.name = tui.name.slice(0, -1); return; } if (key && key.length === 1 && /[A-Za-z0-9_ '!-]/.test(key) && tui.name.length < 24 && code !== 'Enter') { tui.name += key; return; } }
    if (tui.row === 1 && (isLeft(code) || isRight(code))) { tui.size = tui.size === 4 ? 8 : 4; sfx('toggle'); return; }
    if (tui.row === 2 && (isLeft(code) || isRight(code))) { tui.open = !tui.open; sfx('toggle'); return; }
    if (isOk(code) && code !== 'Space') { if (tui.row < 3) { tui.row++; sfx('select'); } else { sfx('confirm'); tCreate(tui.name.trim() || acct.name + "'s Cup", tui.size, tui.open); } }
    return;
  }
  if (screen === 'tbrowse') {
    const L = tBrowseList();
    if (code === 'Escape') { sfx('back'); tBrowseStop(); setScreen('play'); return; }
    if (code === 'KeyC') { tBrowseStop(); tui.code = ''; setScreen('tcode'); return; }
    const n = L.length ? nav(L.length, tui.idx) : 0; if (n !== tui.idx) { tui.idx = n; sfx('select'); }
    const t = L[tui.idx];
    if (isOk(code) && t) { if (t.st !== 'lobby' || t.n >= t.size) { sfx('back'); toast = { msg: t.st !== 'lobby' ? 'That tournament has already started' : 'That tournament is full', t: 160 }; return; } sfx('confirm'); tBrowseStop(); tJoin(t.code); }
    return;
  }
  if (screen === 'tcode') {
    if (code === 'Escape') { sfx('back'); setScreen('play'); return; }
    if (code === 'Backspace') tui.code = tui.code.slice(0, -1);
    else if (isOk(code) && tui.code.length === 4) { sfx('confirm'); tJoin(tui.code); }
    else if (key && key.length === 1 && /[a-z0-9]/i.test(key) && tui.code.length < 4) tui.code += key.toUpperCase();
    return;
  }
  if (screen === 'tourney') {
    const S = T.st;
    if (T.pick) { const L = T.pick.list; if (code === 'Escape') { T.pick = null; return; } const n = L.length ? nav(L.length, T.pick.i) : 0; T.pick.i = n;
      if (isOk(code) && L[n]) { socialSend(L[n], { t: 'tinv', code: S.code, name: S.name }); toast = { msg: 'Invited ' + acctName(L[n]) + ' to ' + S.name, t: 180 }; T.pick = null; sfx('confirm'); } return; }
    if (code === 'Escape') { if (S && S.st === 'done') { tLeave(true); setScreen('play'); return; } if (T.leave) { tLeave(); setScreen('play'); sfx('back'); } else { T.leave = 1; sfx('tick'); setTimeout(() => { T.leave = 0; }, 2500); } return; }
    if (!S || T.role !== 'host' || S.st !== 'lobby') return;
    if (code === 'KeyS') tStart();
    if (code === 'KeyI') { T.pick = { i: 0, list: acct.friends.filter(f => f.st === 'friend' && social.info[fkey(f)] && social.info[fkey(f)].on) }; sfx('confirm'); }
  }
}
