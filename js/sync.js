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
