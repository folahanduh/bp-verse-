// ---------- match flow, particles, online ----------
let screen = 'loading', mode = 'cpu', menuIdx = 0, subIdx = 0, sel = [0, 4], selSkin = [0, 0], selDone = [false, false], selCursor = 0, stageCursor = 0;
let P = [], projs = [], parts = [], timer = 0, introT = 0, endT = 0, winner = -1, matchOver = false, overT = 0;
let hitstop = 0, shake = 0, slowmo = 0, frame = 0, cine = null, vsT = 0, joinCode = '', toast = null;
let banner = null, screenFlash = 0, paused = false, screenT = 0, wipe = 0, finish = null;
const newAI = () => ({ t: 0, hold: {}, press: null, mash: 0, mashT: 0 });

let wipeMax = 16;
const WIPES = { title: 80, fight: 36, vs: 28, select: 20, stage: 20 };
function setScreen(s) { if (screen !== s) { screen = s; screenT = 0; wipe = wipeMax = WIPES[s] || 16; } }
function goSelect() { setScreen('select'); selDone = [false, false]; selCursor = 0; }

function beginMatch(chars, isDemo, skins) {
  demo = isDemo; skins = skins || [0, 0];
  P = [makeFighter(chars[0], 0, skins[0]), makeFighter(chars[1], 1, skins[1])];
  P.forEach(f => { f.hp = f.dispHp = f.maxHp; });
  if (isDemo) P[0].ai = newAI();
  if (isDemo || mode === 'cpu' || mode === 'training') P[1].ai = newAI();
  if (mode === 'training') Object.assign(training, { cur: null, last: null, max: 0, log: [] });
  projs = []; parts = []; timer = 99 * 60; introT = isDemo ? 130 : mode === 'training' ? 70 : 230; endT = 0; winner = -1; matchOver = false; overT = 0;
  hitstop = 0; slowmo = 0; cine = null; banner = null; screenFlash = 0; paused = false; latch = [{}, {}]; finish = null; resetProps();
  updateCamera(true);
}
function startMatch() {
  beginMatch(sel, false, selSkin); setScreen('vs'); vsT = 130; sfx('confirm');
  if (net.role === 'host') send({ t: 'start', sel, skins: selSkin, stage: stageId });
}
function startDemo() {
  const a = rand() * 5 | 0; let b = rand() * 5 | 0; if (b === a) b = (a + 2) % 5;
  stageId = rand() * STAGES.length | 0;
  beginMatch([a, b], true, [rand() * 2 | 0, rand() * 2 | 0]);
}

function getInput(f, foe, i) {
  let inp;
  if (f.ai) inp = aiInput(f, foe);
  else if (mode === 'online' && i === 1) {
    inp = Object.assign({}, net.remoteHeld);
    for (const b of BTN) inp[b] = net.remotePress[b] ? 1 : 0;
    inp.dash = net.remotePress.dash || 0;
    net.remotePress = {};
  } else inp = readLocal(mode === 'local' ? i : 0, mode !== 'local');
  if (f.confused > 0) { [inp.left, inp.right] = [inp.right, inp.left]; [inp.up, inp.down] = [inp.down, inp.up]; inp.dash = -(inp.dash || 0); }
  for (const b of BTN) if (inp[b]) f.buf[b] = 8;
  return inp;
}

function simulate() {
  const inps = P.map((f, i) => getInput(f, P[1 - i], i));
  if (paused) return;
  if (screenFlash > 0) screenFlash--;
  if (banner && --banner.t <= 0) banner = null;
  updateCamera(false);
  if (cine && cine.kind === 'fin') {
    // finisher: both fighters keep their physics, the script drives poses and effects
    cine.t++; updateParts(); updateFighter(P[0], P[1], {}, false); updateFighter(P[1], P[0], {}, false); finTick(cine);
    if (cine.t >= cine.max) { const c0 = cine; cine = null; finEnd(c0); }
    return;
  }
  if (cine) {
    cine.t++; updateParts();
    if (cine.kind === 'act' && cine.t === 12) shake = 8;
    if (cine.kind === 'impact' && cine.t % 28 === 2) { shake = 18; sfx('heavy'); }
    if (cine.t >= cine.max) { cine = null; screenFlash = 10; }
    return;
  }
  if (hitstop > 0) { hitstop--; return; }
  if (slowmo > 0) { slowmo--; if (frame % 2) return; }
  updateParts();
  if (matchOver) { overT++; P.forEach((f, i) => updateFighter(f, P[1 - i], {}, false)); return; }
  if (introT > 0) {
    introT--;
    P.forEach(f => { f.intro = introT > 125; });
    if (introT === 228) say(P[0].c.id, P[0].c.lines.intro);
    if (introT === 172) say(P[1].c.id, P[1].c.lines.intro);
    // 3.. 2.. 1.. FIGHT!
    const cd = { 122: '3', 100: '2', 78: '1' }[introT];
    if (cd) { banner = { txt: cd, t: 22, max: 22, c: '#ffffff', count: 1 }; sfx('count'); say('announcer', ['Three', 'Two', 'One'][3 - cd]); shake = Math.max(shake, 5); }
    if (introT === 56) { banner = { txt: 'FIGHT!', t: 64, max: 64, c: '#ffd23f', slam: 1 }; sfx('fight'); say('announcer', 'Fight!'); shake = Math.max(shake, 9); }
  }
  const canAct = introT <= 56 && endT === 0;
  updateFighter(P[0], P[1], inps[0], canAct); updateFighter(P[1], P[0], inps[1], canAct);
  if (finish && !cine && ++finish.t >= finish.max) finishCollapse();
  pushApart(); updateProjs(); for (const p of props) if (p.cd > 0) p.cd--;
  if (mode === 'training') { trainingTick(inps[0]); return; }
  if (canAct && timer > 0 && !finish && !cine && --timer === 0) timeUp();
  if (endT > 0 && --endT === 0) { matchOver = true; overT = 0; if (winner >= 0) { P[winner].victory = true; say(P[winner].c.id, P[winner].c.quote); } sfx('confirm'); }
}
function startCine(f) { cine = { kind: 'act', t: 0, max: 96, side: f.side }; say(f.c.id, f.c.lines.super); }
// ---------- training mode ----------
const DUMMY_MODES = ['STAND', 'BLOCK', 'JUMP', 'WALK', 'CPU'];
const training = { dummy: 0, refill: true, meter: true, hitboxes: false, inputs: true, cur: null, last: null, max: 0, log: [] };
function dummyInput(f, foe) {
  const m = DUMMY_MODES[training.dummy], i = { left: 0, right: 0, up: 0, down: 0, punch: 0, kick: 0, skill: 0, super: 0, dash: 0 };
  const tw = foe.x > f.x ? 'right' : 'left';
  if (m === 'BLOCK') i.down = 1;
  else if (m === 'JUMP') i.up = frame % 70 < 2 ? 1 : 0;
  else if (m === 'WALK') i[frame % 240 < 120 ? tw : (tw === 'right' ? 'left' : 'right')] = 1;
  else if (m === 'CPU') return null;
  return i;
}
function trainingTick(inp) {
  const [me, dummy] = P;
  if (me.combo > 0) training.cur = { hits: me.combo, dmg: Math.round(me.comboDmg), pct: Math.round(me.comboDmg / dummy.maxHp * 100), name: me.comboName };
  else if (training.cur) { training.last = training.cur; training.max = Math.max(training.max, training.cur.hits); training.cur = null; }
  for (const f of P) if (training.refill && f.comboT === 0 && f.stun === 0 && f.kd === 0 && (f.hp < f.maxHp || f.bar)) { f.hp = f.dispHp = f.maxHp; f.bar = 0; }
  if (training.meter) me.meter = 100;
  // input history (newest first)
  const dir = (inp.up ? '↑' : inp.down ? '↓' : '') + (inp.left ? '←' : inp.right ? '→' : '');
  const btn = (inp.punch ? 'P' : '') + (inp.kick ? 'K' : '') + (inp.skill ? 'S' : '') + (inp.super ? 'X' : '') + (inp.env ? 'E' : '');
  if (btn) { training.log.unshift((dir ? dir + '+' : '') + btn); training.log.length = Math.min(training.log.length, 12); }
}
function trainingReset() {
  P.forEach((f, i) => Object.assign(f, { x: WW / 2 + (i ? 230 : -230), y: FLOOR, vx: 0, vy: 0, hp: f.maxHp, dispHp: f.maxHp, bar: 0, kd: 0, stun: 0, move: null, ko: false }));
  projs = []; updateCamera(true);
}

function timeUp() {
  const r0 = P[0].hp / P[0].maxHp, r1 = P[1].hp / P[1].maxHp;
  winner = r0 > r1 ? 0 : r1 > r0 ? 1 : -1;
  banner = { txt: 'TIME!', t: 120, max: 120, c: '#ffffff' }; endT = 120;
}

function step() {
  frame++; screenT++; if (wipe > 0) wipe--;
  pollPads(); musicTick(); if (vc.stream || vc.analR) micTick();
  if (screen === 'loading') { if (LOAD.done && screenT > 40 && (LOAD.outT = (LOAD.outT || 0) + 1) > 30) { setScreen('title'); if (!LOAD.mode3d && LOAD.error && gfx.renderer !== '2d') toast = { msg: '3D unavailable here, using the 2D renderer', t: 260 }; } return; }
  if (shake > 0) { shake *= 0.88; if (shake < 0.3) shake = 0; }
  if (toast && --toast.t <= 0) toast = null;
  if (net.role === 'guest') {
    updateParts(); updateCamera(false);
    if (net.connected && (screen === 'vs' || screen === 'fight')) send({ t: 'in', i: readLocal(0, true) });
    return;
  }
  if (screen === 'vs') { if (--vsT <= 0) setScreen('fight'); }
  else if (screen === 'fight') simulate();
  if (net.role === 'host' && net.connected && (screen === 'vs' || screen === 'fight')) send({ t: 's', d: snapshot() });
  netEvents = []; netFx = [];
}

// ---------- particles (with gravity + floor bounce) ----------
const FX = {
  sparks(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rand() * 6.28, s = 2 + rand() * 7; parts.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 16 + rand() * 12, max: 28, c }); } },
  impact(x, y, c, k) { parts.push({ k: 'i', x, y, c, life: 11, max: 11, s: k, a: rand() * 6 }); FX.sparks(x, y, c, Math.round(9 * k)); },
  ring(x, y, c, w) { parts.push({ k: 'r', x, y, life: 26, max: 26, c, w }); },
  flat(x, y, c) { parts.push({ k: 'f', x, y, life: 30, max: 30, c }); },
  dust(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'd', x: x + (rand() - 0.5) * 30, y, vx: (rand() - 0.5) * 3, vy: -rand() * 1.5, life: 20 + rand() * 10, max: 30, c: '#b8a8c0' }); },
  debris(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'b', x, y, vx: (rand() - 0.5) * 9, vy: -3 - rand() * 7, life: 60 + rand() * 30, max: 90, c: rand() < 0.5 ? '#6b5f70' : '#8d8296', r: rand() * 6, w: 3 + rand() * 5 }); },
  text(x, y, s, c) { parts.push({ k: 't', x, y, s, c, life: 50, max: 50 }); },
};
function fx(name, ...a) { FX[name](...a); if (net.role === 'host') netFx.push([name, a]); }
function updateParts() {
  for (const p of parts) {
    p.life--;
    if (p.k === 's' || p.k === 'b') {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.vx *= 0.97;
      if (p.y > FLOOR) { p.y = FLOOR; p.vy *= -0.4; p.vx *= 0.7; }
      if (p.k === 'b') p.r += p.vx * 0.05;
    } else if (p.k === 'd') { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; }
    else if (p.k === 't') p.y -= 0.7;
  }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 300) parts.splice(0, parts.length - 300);
}
function drawParts() {
  ctx.save(); ctx.lineCap = 'round';
  for (const p of parts) {
    const a = p.life / p.max; ctx.globalAlpha = clamp(a * 1.4, 0, 1);
    if (p.k === 's') { ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke(); }
    else if (p.k === 'i') {
      const r = (1 - a) * 46 * p.s + 12 * p.s;
      ctx.fillStyle = '#fff'; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const ang = p.a + i * Math.PI / 8, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr); }
      ctx.fill(); ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.stroke();
    }
    else if (p.k === 'r') { ctx.strokeStyle = p.c; ctx.lineWidth = p.w * a * 2; ctx.beginPath(); ctx.arc(p.x, p.y, (1 - a) * 90 + 10, 0, 7); ctx.stroke(); }
    else if (p.k === 'f') { ctx.strokeStyle = p.c; ctx.lineWidth = 5 * a; ctx.beginPath(); ctx.ellipse(p.x, p.y, (1 - a) * 170 + 10, (1 - a) * 22 + 3, 0, 0, 7); ctx.stroke(); }
    else if (p.k === 'd') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (1 - a) * 6, 0, 7); ctx.globalAlpha = a * 0.5; ctx.fill(); }
    else if (p.k === 'b') { ctx.save(); ctx.translate(p.x, p.y - p.w / 2); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.w / 2, p.w, p.w); ctx.restore(); }
    else if (p.k === 't') { ctx.font = 'italic 900 22px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(p.s, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, p.y); }
  }
  ctx.restore();
}

// ---------- online (PeerJS, peer-to-peer; host runs the fight, guest sends inputs) ----------
const net = { role: null, conn: null, peer: null, connected: false, remoteHeld: {}, remotePress: {}, code: '', status: '' };
const PEER_PREFIX = 'fighter1223-room-';
const TEST_BC = /net=bc/.test(location.search); // local two-tab test transport
const mySlot = () => net.role === 'guest' ? 1 : 0;
function send(o) { if (net.conn && net.connected) try { net.conn.send(o); } catch (e) {} }
function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[rand() * A.length | 0]; return s; }

function loadPeer(cb) {
  if (window.Peer) return cb();
  const srcs = ['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  const tryLoad = i => {
    if (i >= srcs.length) return netFail('Could not load online play. Check your internet connection.');
    const s = document.createElement('script'); s.src = srcs[i]; s.onload = cb; s.onerror = () => tryLoad(i + 1);
    document.head.appendChild(s);
  };
  tryLoad(0);
}
function bcTransport(role) {
  const bc = new BroadcastChannel('fighter1223'), h = {};
  bc.onmessage = e => { if (e.data.from !== role && h.data) h.data(e.data.o); };
  setTimeout(() => h.open && h.open(), 50);
  return { send: o => bc.postMessage({ from: role, o: JSON.parse(JSON.stringify(o)) }), on: (ev, fn) => { h[ev] = fn; }, close: () => bc.close() };
}
function bindConn(c) {
  net.conn = c;
  c.on('open', () => { if (net.conn !== c) return; net.connected = true; if (net.role === 'guest') send({ t: 'hello' }); });
  c.on('data', d => { if (net.conn === c) onNetData(d); });
  c.on('close', () => { if (net.conn === c && net.role) netFail('Your opponent disconnected'); });
  c.on('error', () => {});
}
function hostRoom() {
  netReset(); net.role = 'host'; net.code = genCode(); setScreen('lobby'); net.status = 'Opening room';
  if (TEST_BC) { bindConn(bcTransport('host')); net.status = 'Waiting for your friend to join'; return; }
  loadPeer(() => {
    if (net.role !== 'host') return;
    const peer = net.peer = new Peer(PEER_PREFIX + net.code);
    peer.on('open', () => { net.status = 'Waiting for your friend to join'; });
    peer.on('connection', c => { if (net.conn) { c.close(); return; } bindConn(c); });
    peer.on('call', onIncomingCall);
    peer.on('error', e => { if (net.peer !== peer) return; if (e.type === 'unavailable-id') hostRoom(); else if (!net.connected) netFail('Online error: ' + e.type); });
  });
}
function joinRoom(code) {
  netReset(); net.role = 'guest'; net.code = code; setScreen('lobby'); net.status = 'Connecting to room ' + code;
  if (TEST_BC) { bindConn(bcTransport('guest')); return; }
  loadPeer(() => {
    if (net.role !== 'guest') return;
    const peer = net.peer = new Peer();
    peer.on('open', () => bindConn(peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' })));
    peer.on('error', e => { if (net.peer === peer) netFail(e.type === 'peer-unavailable' ? 'Room ' + code + ' not found' : 'Online error: ' + e.type); });
  });
  setTimeout(() => { if (net.role === 'guest' && net.code === code && screen === 'lobby') netFail('Could not connect to room ' + code); }, 20000);
}
function netReset() {
  const c = net.conn, p = net.peer;
  stopVoice();
  Object.assign(net, { role: null, conn: null, peer: null, connected: false, remoteHeld: {}, remotePress: {} });
  try { c && c.close(); } catch (e) {}
  try { p && p.destroy(); } catch (e) {}
  if (mode === 'online') mode = 'cpu';
}
// ---------- voice chat (WebRTC audio over the same PeerJS link) ----------
const vc = { stream: null, call: null, audio: null, analL: null, analR: null, level: 0, remote: 0, starting: false };
function analyser(stream) {
  const a = ac(); if (!a) return null;
  try { const src = a.createMediaStreamSource(stream), an = a.createAnalyser(); an.fftSize = 256; src.connect(an); return { an, buf: new Uint8Array(an.fftSize) }; } catch (e) { return null; }
}
function levelOf(A) { if (!A) return 0; A.an.getByteTimeDomainData(A.buf); let s = 0; for (const v of A.buf) s += (v - 128) * (v - 128); return Math.sqrt(s / A.buf.length) / 64; }
async function startVoice() {
  if (voiceChat === 'off' || TEST_BC || !net.peer || vc.stream || vc.starting) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast = { msg: 'This browser has no microphone access', t: 200 }; return; }
  vc.starting = true;
  try { vc.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { vc.starting = false; toast = { msg: 'Microphone blocked: voice chat is off', t: 240 }; return; }
  vc.starting = false; vc.analL = analyser(vc.stream); micTick();
  if (net.role === 'guest' && net.peer) bindCall(net.peer.call(PEER_PREFIX + net.code, vc.stream));
}
function bindCall(call) {
  if (!call) return;
  vc.call = call;
  call.on('stream', rs => { vc.audio = vc.audio || new Audio(); vc.audio.autoplay = true; vc.audio.srcObject = rs; vc.audio.play().catch(() => {}); vc.analR = analyser(rs); });
  call.on('close', () => { if (vc.call === call) vc.call = null; });
  call.on('error', () => {});
}
function onIncomingCall(call) {
  if (voiceChat === 'off') { call.close(); return; }
  const answer = () => { call.answer(vc.stream || undefined); bindCall(call); };
  if (vc.stream) answer(); else startVoice().then(answer);
}
// open mic, or push-to-talk while the key is held
function micTick() {
  const talking = voiceChat === 'open' || (voiceChat === 'ptt' && KEYS[EXTRA.ptt]);
  if (vc.stream) vc.stream.getAudioTracks().forEach(t => { t.enabled = !!talking; });
  vc.level = talking ? levelOf(vc.analL) : 0; vc.remote = levelOf(vc.analR); vc.talking = !!talking;
}
function stopVoice() {
  try { vc.call && vc.call.close(); } catch (e) {}
  if (vc.stream) vc.stream.getTracks().forEach(t => t.stop());
  if (vc.audio) vc.audio.srcObject = null;
  Object.assign(vc, { stream: null, call: null, analL: null, analR: null, level: 0, remote: 0 });
}

function netFail(msg) { netReset(); demo = false; setScreen('mode'); toast = { msg, t: 300 }; }

const SNAP_FIELDS = ['ci', 'skin', 'comboName', 'comboNameT', 'furT', 'hitN', 'x', 'y', 'vx', 'vy', 'facing', 'hp', 'dispHp', 'bar', 'barAnim', 'meter', 'move', 'mt', 'slamDone', 'stun', 'hitType', 'blocking',
  'flow', 'big', 'armor', 'confused', 'weak', 'hypno', 'vanish', 'flash', 'scale', 'combo', 'comboT', 'comboDmg', 'kd', 'kdT', 'bounced', 'bt0', 'spin', 'stunMax', 'hitVar', 'dazed', 'finPose', 'squash', 'sink', 'gone', 'prop',
  'dashT', 'dashDir', 'ko', 'victory', 'intro', 'walkPh', 'trail'];
function snapshot() {
  return {
    sc: screen, tm: timer, it: introT, et: endT, mo: matchOver, ot: overT, w: winner, sh: shake, cn: cine, vs: vsT, fr: frame,
    bn: banner, fl: screenFlash, st: stageId, pr: projs, ev: netEvents, fx: netFx, fi: finish, pp: props,
    P: P.map(f => { const o = {}; for (const k of SNAP_FIELDS) o[k] = f[k]; return o; }),
  };
}
function applySnap(d) {
  if (screen !== d.sc) setScreen(d.sc);
  timer = d.tm; introT = d.it; endT = d.et; matchOver = d.mo; overT = d.ot; winner = d.w; stageId = d.st;
  shake = Math.max(shake, d.sh); cine = d.cn; finish = d.fi || null; props = d.pp || props; vsT = d.vs; frame = d.fr; projs = d.pr; banner = d.bn; screenFlash = d.fl;
  if (!P.length || P[0].ci !== d.P[0].ci || P[1].ci !== d.P[1].ci) P = [makeFighter(d.P[0].ci, 0, d.P[0].skin), makeFighter(d.P[1].ci, 1, d.P[1].skin)];
  d.P.forEach((s, i) => Object.assign(P[i], s));
  for (const e of d.ev) { if (e.startsWith('v|')) { const [, w, tx] = e.split('|'); speak(w, tx); } else if (SOUNDS[e]) SOUNDS[e](); }
  for (const [n, a] of d.fx) FX[n] && FX[n](...a);
}
function onNetData(d) {
  if (!d || !d.t) return;
  if (d.t === 'hello' && net.role === 'host') { send({ t: 'welcome' }); mode = 'online'; demo = false; goSelect(); startVoice(); }
  else if (d.t === 'welcome' && net.role === 'guest') { mode = 'online'; demo = false; goSelect(); startVoice(); }
  else if (d.t === 'cur') {
    const o = 1 - mySlot(); sel[o] = d.ci; selSkin[o] = d.skin || 0; selDone[o] = d.done;
    if (net.role === 'host' && screen === 'select' && selDone[0] && selDone[1]) { setScreen('stage'); send({ t: 'stage' }); }
  }
  else if (d.t === 'stage' && net.role === 'guest') setScreen('stage');
  else if (d.t === 'stagecur' && net.role === 'guest') stageCursor = d.i;
  else if (d.t === 'start' && net.role === 'guest') {
    sel = d.sel; selSkin = d.skins || [0, 0]; stageId = d.stage; demo = false; P = [makeFighter(sel[0], 0, selSkin[0]), makeFighter(sel[1], 1, selSkin[1])];
    P.forEach(f => { f.hp = f.dispHp = f.maxHp; }); matchOver = false; setScreen('vs'); vsT = 130; updateCamera(true);
  }
  else if (d.t === 'in' && net.role === 'host') { net.remoteHeld = d.i; for (const b of BTN) if (d.i[b]) net.remotePress[b] = 1; if (d.i.dash) net.remotePress.dash = d.i.dash; }
  else if (d.t === 's' && net.role === 'guest') applySnap(d.d);
  else if (d.t === 'select' && net.role === 'guest') goSelect();
  else if (d.t === 'rematch' && net.role === 'host' && screen === 'fight' && matchOver) startMatch();
  else if (d.t === 'bye') netFail('Your opponent left the game');
}
