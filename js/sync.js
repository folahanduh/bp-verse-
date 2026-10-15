// ---------- one account on every device ----------
// No server, so devices hand the account to each other directly (over the same PeerJS broker as everything else):
//  - LINK A DEVICE (Profile) shows a 6-character code on the device you're signed in on. On the new phone, school
//    computer or browser, choose SIGN IN FROM ANOTHER DEVICE (or press TAB on the create-account screen) and type it:
//    the account, its level, rank, record and friends come straight across.
//  - After that the copies keep each other up to date: whenever two devices are online with the same account, the
//    newer progress wins on both (each save is stamped with the time).
const LNK = { mode: '', code: '', st: '', peer: null, buf: '', t0: 0, timer: null };
const linkChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const linkId = code => PEER_PREFIX + 'link-' + code;
function linkStop() { clearTimeout(LNK.timer); try { LNK.peer && LNK.peer.destroy(); } catch (e) {} LNK.peer = null; }
// on the signed-in device: wait (5 minutes) for the new one to ask for the account
function linkGive() {
  if (!acct) return; linkStop();
  LNK.mode = 'give'; LNK.code = Array.from({ length: 6 }, () => linkChars[Math.random() * linkChars.length | 0]).join(''); LNK.st = 'Connecting…'; LNK.t0 = Date.now(); setScreen('link');
  socialLoad(() => {
    let p; try { p = LNK.peer = mkPeer(linkId(LNK.code)); } catch (e) { LNK.st = 'Could not get online'; return; }
    p.on('open', () => { LNK.st = 'On your other device, choose SIGN IN FROM ANOTHER DEVICE and type this code'; });
    p.on('connection', c => { c.on('data', d => { if (d && d.t === 'want' && acct) { saveAccounts(); c.send({ t: 'acct', a: acct }); LNK.st = 'Sent! ' + acctName(acct) + ' is now on your other device too'; sfx('ready'); } }); c.on('error', () => {}); });
    p.on('error', e => { if (e.type === 'unavailable-id') linkGive(); else LNK.st = 'Could not get online (' + e.type + ')'; });
    LNK.timer = setTimeout(() => { if (LNK.mode === 'give') { linkStop(); LNK.st = 'The code has expired: open this again for a new one'; LNK.code = ''; } }, 5 * 60000);
  });
}
// on the new device: type the code
function linkTakeOpen() { linkStop(); LNK.mode = 'take'; LNK.buf = ''; LNK.st = 'Type the 6-character code shown on your other device'; setScreen('link'); }
function linkTake(code) {
  linkStop(); LNK.st = 'Connecting…';
  socialLoad(() => {
    let p; try { p = LNK.peer = TEST_BC ? new BCPeer() : new Peer({ debug: 0 }); } catch (e) { LNK.st = 'Could not get online'; return; }
    p.on('open', () => { const c = p.connect(linkId(code), { reliable: true, serialization: 'json' });
      c.on('open', () => c.send({ t: 'want' }));
      c.on('data', d => { if (!d || d.t !== 'acct' || !d.a || !d.a.id) return; const a = fixAccount(d.a); accounts.list[a.id] = a; if (accounts.gone) accounts.gone = accounts.gone.filter(x => x !== a.id);
        signIn(a.id, true); linkStop(); LNK.st = ''; LNK.mode = ''; toast = { msg: 'Signed in as ' + acctName(a) + ': your account is linked to this device', t: 300 }; sfx('ready'); setScreen('mode'); });
      c.on('error', () => {}); });
    p.on('error', e => { LNK.st = e.type === 'peer-unavailable' ? 'No device is showing that code: check it, or open LINK A DEVICE again' : 'Could not get online (' + e.type + ')'; });
    LNK.timer = setTimeout(() => { if (LNK.mode === 'take' && LNK.st === 'Connecting…') LNK.st = 'Timed out: check the code and that both devices are online'; }, 20000);
  });
}
function drawLink() {
  drawMenuBg(); uiHeader(LNK.mode === 'give' ? 'LINK A DEVICE' : 'SIGN IN FROM ANOTHER DEVICE', 'ONE ACCOUNT, EVERY DEVICE', { profile: false });
  uiPanel(W / 2 - 300, 130, 600, 280, { accent: UI.blue, accentTop: 1, alpha: 0.86, glow: UI.blue });
  const word = LNK.mode === 'give' ? LNK.code : LNK.buf;
  for (let i = 0; i < 6; i++) { const x = W / 2 - 210 + i * 72; chamfer(x, 190, 56, 76, 10); ctx.fillStyle = 'rgba(5,8,14,0.9)'; ctx.fill();
    chamfer(x, 190, 56, 76, 10); ctx.strokeStyle = LNK.mode === 'take' && i === LNK.buf.length ? (frame % 40 < 24 ? UI.blueHi : UI.blue) : chromeGrad(190, 266); ctx.lineWidth = 2; ctx.stroke();
    if (word[i]) chromeText(word[i], x + 28, 230, 40, { align: 'center', weight: 900, track: 0, glow: 'rgba(62,166,255,0.5)' }); }
  ctx.save(); ctx.font = '14px ' + BODY; ctx.fillStyle = 'rgba(232,238,248,0.88)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; wrap(LNK.st || '', W / 2, 300, 520, 18); ctx.restore();
  if (LNK.mode === 'give' && LNK.code) capsText('EXPIRES IN ' + Math.max(0, Math.ceil((5 * 60000 - (Date.now() - LNK.t0)) / 60000)) + ' MIN', W / 2, 380, 10, 'rgba(214,224,240,0.6)', { align: 'center', weight: 700, track: 3 });
  uiPrompts(LNK.mode === 'take' ? [['ENTER', 'LINK'], ['ESC', 'BACK']] : [['ESC', 'DONE']]);
}
function linkPress(code, key) {
  if (screen !== 'link') return false;
  if (code === 'Escape') { linkStop(); sfx('back'); LNK.mode = ''; ui2.idx = 0; setScreen(acct ? 'profile' : 'account'); return true; }
  if (LNK.mode === 'take') {
    if (code === 'Backspace') LNK.buf = LNK.buf.slice(0, -1);
    else if (isOk(code) && LNK.buf.length === 6) { sfx('confirm'); linkTake(LNK.buf); }
    else if (key && key.length === 1 && /[a-z0-9]/i.test(key) && LNK.buf.length < 6) LNK.buf += key.toUpperCase();
  }
  return true;
}
// ---- the copies keep each other up to date ----
// two devices online with the same account: the second can't take the account's presence ID (the first has it), so
// it calls the first and they swap: whoever has the newer save gives it to the other
function twinSync() {
  if (!acct || TWIN.busy) return; TWIN.busy = true;
  let p; try { p = TEST_BC ? new BCPeer() : new Peer({ debug: 0 }); } catch (e) { TWIN.busy = false; return; }
  const end = () => { TWIN.busy = false; setTimeout(() => { try { p.destroy(); } catch (e) {} }, 500); };
  p.on('open', () => { const c = p.connect(presId(acct), { reliable: true, serialization: 'json' });
    c.on('open', () => c.send({ t: 'sync', from: acctCard(), acct }));
    c.on('data', d => { if (d && d.t === 'sync' && d.acct) twinTake(d.acct); end(); }); c.on('error', end); });
  p.on('error', end); setTimeout(end, 15000);
}
const TWIN = { busy: false, timer: null };
// someone sent us their copy: keep the newer one
function twinTake(a) {
  if (!acct || !a || a.id !== acct.id || !((a.upd || 0) > (acct.upd || 0))) return false;
  const fresh = fixAccount(JSON.parse(JSON.stringify(a))); Object.assign(acct, fresh); rank = acct.rank; accounts.list[acct.id] = acct;
  TWIN.quiet = true; const { upd, ...rest } = acct; ACCT_HASH[acct.id] = JSON.stringify(rest); saveAccounts(); TWIN.quiet = false; toast = { msg: 'Synced your progress from your other device', t: 200 }; return true;
}
// ---- a password: sign in on a new computer with just your friend code and password ----
// Set one in PROFILE → SET PASSWORD. On the new computer: SIGN IN WITH PASSWORD (TAB on the create-account screen),
// type NAME#1234 and the password. Still no server, so the account comes from a device you're signed in on that has
// BP VERSE open (any screen, any device: your phone counts): it answers on your presence ID. The password never
// travels: the account keeps only a salted hash, and the new device proves it knows the password against a one-time
// challenge. Five wrong tries locks it for a minute.
const PW = { code: '', pw: '', row: 0, st: '', peer: null, busy: false, timer: null, fails: 0, lockT: 0 };
const enc8 = s => new TextEncoder().encode(s), hexOf = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pwHash(pw, salt) { const k = await crypto.subtle.importKey('raw', enc8(pw), 'PBKDF2', false, ['deriveBits']); return hexOf(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc8(salt), iterations: 150000, hash: 'SHA-256' }, k, 256)); }
const sha256 = async s => hexOf(await crypto.subtle.digest('SHA-256', enc8(s)));
const rndHex = n => hexOf(crypto.getRandomValues(new Uint8Array(n)));
const PW_OK = s => s.length >= 4 && s.length <= 32;
async function setPassword(pw) { if (!acct) return; const s = rndHex(16), h = await pwHash(pw, s); acct.pw = { s, h }; saveAccounts(); toast = { msg: 'Password set: sign in on any computer with ' + acctName(acct) + ' and your password', t: 320 }; sfx('ready'); }
// on a signed-in device: someone wants the account
function pwAnswer(d, c, reply) {
  if (d.t === 'pwreq') {
    if (!acct.pw) { reply({ t: 'pwnone' }); return; }
    if (Date.now() < PW.lockT) { reply({ t: 'pwwait' }); return; }
    c._pwN = rndHex(16); reply({ t: 'pwsalt', s: acct.pw.s, n: c._pwN });
  } else if (d.t === 'pwproof' && c._pwN && acct.pw) {
    const n = c._pwN; c._pwN = null;
    sha256(acct.pw.h + n).then(want => {
      if (d.p === want) { PW.fails = 0; saveAccounts(); reply({ t: 'acct', a: acct }); toast = { msg: acctName(acct) + ' just signed in on another device with your password', t: 260 }; }
      else { if (++PW.fails >= 5) { PW.fails = 0; PW.lockT = Date.now() + 60000; } reply({ t: 'pwbad' }); } });
  }
}
// on the new device
function pwOpen() { pwStop(); Object.assign(PW, { code: '', pw: '', row: 0, st: '', busy: false }); setScreen('pwlogin'); }
function pwStop() { clearTimeout(PW.timer); try { PW.peer && PW.peer.destroy(); } catch (e) {} PW.peer = null; PW.busy = false; }
function pwLogin() {
  const m = PW.code.trim().match(/^(.{3,16})#(\d{4})$/);
  if (!m) { PW.st = 'Type your friend code with its number, like ' + (acct ? acctName(acct) : 'NAME#1234'); sfx('back'); return; }
  if (!PW_OK(PW.pw)) { PW.st = 'Type your password'; PW.row = 1; sfx('back'); return; }
  if (!window.crypto || !crypto.subtle) { PW.st = 'This browser can\'t check passwords here (it needs https)'; return; }
  pwStop(); PW.busy = true; PW.st = 'Looking for your account…'; sfx('confirm');
  const fail = msg => { pwStop(); PW.st = msg; };
  socialLoad(() => {
    let p; try { p = PW.peer = TEST_BC ? new BCPeer() : new Peer({ debug: 0 }); } catch (e) { fail('Could not get online'); return; }
    p.on('open', () => { const c = p.connect(presId({ name: m[1], tag: m[2] }), { reliable: true, serialization: 'json' });
      c.on('open', () => c.send({ t: 'pwreq' }));
      c.on('data', d => { if (!d || PW.peer !== p) return;
        if (d.t === 'pwsalt') { PW.st = 'Checking your password…'; pwHash(PW.pw, d.s).then(h => sha256(h + d.n)).then(pr => c.send({ t: 'pwproof', p: pr })); }
        else if (d.t === 'acct' && d.a && d.a.id) { const a = fixAccount(d.a); accounts.list[a.id] = a; if (accounts.gone) accounts.gone = accounts.gone.filter(x => x !== a.id);
          pwStop(); signIn(a.id, true); PW.st = ''; PW.pw = ''; toast = { msg: 'Signed in as ' + acctName(a) + '. Your progress is on this computer now', t: 300 }; sfx('ready'); setScreen('mode'); }
        else if (d.t === 'pwbad') { fail('Wrong password'); PW.pw = ''; PW.row = 1; sfx('back'); }
        else if (d.t === 'pwnone') fail('That account has no password yet. On a device you\'re signed in on: PROFILE → SET PASSWORD');
        else if (d.t === 'pwwait') fail('Too many wrong tries: wait a minute and try again'); });
      c.on('error', () => {}); });
    p.on('error', e => fail(e.type === 'peer-unavailable' ? 'Your account isn\'t open anywhere right now. Open BP VERSE on a device you\'re signed in on (your phone works), then try again' : 'Could not get online (' + e.type + ')'));
    PW.timer = setTimeout(() => { if (PW.busy) fail('Timed out: check your friend code, and that BP VERSE is open on a device you\'re signed in on'); }, 25000);
  });
}
function drawPwLogin() {
  drawMenuBg(); uiHeader('SIGN IN WITH PASSWORD', 'ONE ACCOUNT, EVERY COMPUTER', { profile: false });
  uiPanel(W / 2 - 260, 120, 520, 320, { accent: UI.blue, accentTop: 1, alpha: 0.88, glow: UI.blue });
  const x0 = W / 2 - 220;
  textBox(x0, 168, 440, 'FRIEND CODE', PW.code, PW.row === 0 && !PW.busy, 'NAME#1234');
  textBox(x0, 246, 440, 'PASSWORD', '•'.repeat(PW.pw.length), PW.row === 1 && !PW.busy, 'Your password');
  ctx.save(); ctx.font = '13px ' + BODY; ctx.fillStyle = PW.st.startsWith('Wrong') || PW.st.startsWith('Too') ? '#ff8a7a' : 'rgba(232,238,248,0.88)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  wrap(PW.st || 'Your friend code is on your profile (and top right of the menus) on the device you play on. No password yet? Set one there in PROFILE → SET PASSWORD.', W / 2, 330, 460, 17); ctx.restore();
  if (PW.busy) { ctx.save(); ctx.translate(W / 2, 395); ctx.rotate(frame * 0.12); ctx.strokeStyle = UI.blueHi; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 4.4); ctx.stroke(); ctx.restore(); }
  uiPrompts([['ENTER', PW.row === 0 ? 'NEXT' : 'SIGN IN'], ['↑ ↓', 'FIELD'], ['TAB', 'USE A LINK CODE INSTEAD'], ['ESC', 'BACK']]);
}
function pwPress(code, key) {
  if (screen !== 'pwlogin') return false;
  if (code === 'Escape') { pwStop(); sfx('back'); setScreen(acct ? 'profile' : 'account'); return true; }
  if (PW.busy) return true;
  if (code === 'Tab') { sfx('confirm'); linkTakeOpen(); return true; }
  if (code === 'ArrowUp' || code === 'ArrowDown') { PW.row ^= 1; sfx('select'); return true; }
  const f = PW.row ? 'pw' : 'code';
  if (code === 'Backspace') { PW[f] = PW[f].slice(0, -1); return true; }
  if (isOk(code) && code !== 'Space') { if (PW.row === 0) { PW.row = 1; sfx('select'); } else pwLogin(); return true; }
  if (key && key.length === 1 && (PW.row ? key >= ' ' && PW.pw.length < 32 : /[A-Za-z0-9_ #]/.test(key) && PW.code.length < 21)) PW[f] += key;
  return true;
}
