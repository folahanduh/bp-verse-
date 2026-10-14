// ---------- how many people are on the site right now (top right of the menus) ----------
// No game server, so the players count themselves. Everyone tries to claim one well-known PeerJS ID, the hub; the
// first to get it counts everyone who connects to it and sends the total back to them all. The rest connect to the
// hub. If the hub leaves (closes the tab), everyone's link drops and they race to take over, after a random wait so
// they don't all collide. Works with or without an account; it never gets in the way if it can't get online.
const HUB_ID = PEER_PREFIX + 'hub-v1';
const HUB = { peer: null, conn: null, isHub: false, members: {}, count: 0, live: false, tries: 0, timer: null };
function hubStart() { if (HUB.peer || HUB.started) return; HUB.started = true; socialLoad(() => setTimeout(hubClaim, 300 + Math.random() * 1200)); }
function hubReset(again) {
  clearTimeout(HUB.timer); clearInterval(HUB.beat);
  try { HUB.peer && HUB.peer.destroy(); } catch (e) {}
  Object.assign(HUB, { peer: null, conn: null, isHub: false, members: {}, live: false });
  if (again) HUB.timer = setTimeout(hubClaim, Math.min(30000, 1500 + Math.random() * 4000 * (1 + HUB.tries++)));
}
// try to become the hub; if someone already is, join them
function hubClaim() {
  if (HUB.peer || !(TEST_BC || window.Peer)) return;
  let p; try { p = HUB.peer = mkPeer(HUB_ID); } catch (e) { hubReset(true); return; }
  p.on('open', () => { if (HUB.peer !== p) return; HUB.isHub = true; HUB.live = true; HUB.tries = 0; hubSend(); clearInterval(HUB.beat); HUB.beat = setInterval(hubSend, 15000); });
  p.on('connection', c => {
    c.on('open', () => { HUB.members[c.peer] = c; c.seen = Date.now(); hubSend(); });
    c.on('data', () => { c.seen = Date.now(); });
    const gone = () => { if (HUB.members[c.peer] === c) { delete HUB.members[c.peer]; hubSend(); } };
    c.on('close', gone); c.on('error', gone);
  });
  p.on('disconnected', () => { try { if (HUB.peer === p && !p.destroyed) p.reconnect(); } catch (e) {} });
  p.on('error', e => { if (HUB.peer !== p) return; if (e.type === 'unavailable-id') { try { p.destroy(); } catch (er) {} HUB.peer = null; hubJoin(); } else if (!HUB.isHub || ['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) hubReset(true); });
}
// the hub tells everyone the total (itself included)
function hubSend() { const now = Date.now(); for (const [id, c] of Object.entries(HUB.members)) if (now - (c.seen || now) > 45000) { delete HUB.members[id]; try { c.close(); } catch (e) {} } // gone quiet: gone
  HUB.count = 1 + Object.keys(HUB.members).length; for (const c of Object.values(HUB.members)) try { c.send({ t: 'n', n: HUB.count }); } catch (e) {} }
function hubJoin() {
  let p; try { p = HUB.peer = TEST_BC ? new BCPeer('hubc-' + Math.random().toString(36).slice(2, 9)) : new Peer({ debug: 0 }); } catch (e) { hubReset(true); return; }
  p.on('open', () => {
    if (HUB.peer !== p) return;
    const c = HUB.conn = p.connect(HUB_ID, { reliable: true, serialization: 'json' });
    HUB.timer = setTimeout(() => { if (HUB.conn === c && !HUB.live) hubReset(true); }, 20000); // slow networks: give it time
    c.on('open', () => { HUB.live = true; HUB.tries = 0; HUB.heard = Date.now(); clearInterval(HUB.beat); HUB.beat = setInterval(() => { try { c.send({ t: 'hi' }); } catch (e) {} if (Date.now() - HUB.heard > 40000 && HUB.conn === c) hubReset(true); }, 15000); }); // a heartbeat both ways: a hub that's gone quiet has gone
    c.on('data', d => { HUB.heard = Date.now(); if (d && d.t === 'n') HUB.count = d.n; });
    c.on('close', () => { if (HUB.conn === c) hubReset(true); }); // the hub left: race to take over
    c.on('error', () => {});
  });
  p.on('error', e => { if (HUB.peer === p) hubReset(true); }); // (the hub vanished between the claim and the join)
}
// the pill in the top right of the menus: players online, and any friend requests waiting
function drawPresence() {
  if (['loading', 'fight', 'vs', 'squad3d'].includes(screen)) return;
  const reqs = acct ? acct.friends.filter(f => f.st === 'in').length : 0, y = 78, k = easeOut(clamp(screenT / 26, 0, 1));
  ctx.save(); ctx.globalAlpha = k;
  const txt = HUB.live ? HUB.count + (HUB.count === 1 ? ' PLAYER ONLINE' : ' PLAYERS ONLINE') : 'CONNECTING…';
  ctx.font = `800 10px ${HEAD}`; tracked(2); const w = ctx.measureText(txt).width + 34; tracked(0);
  let x = W - 28 - w; uiPanel(x, y, w, 22, { cut: 6, alpha: 0.78 });
  ctx.beginPath(); ctx.arc(x + 13, y + 11, 4, 0, 7); ctx.fillStyle = HUB.live ? (frame % 60 < 40 ? '#3ddc84' : '#2a9a5a') : '#ffd23f'; ctx.fill();
  capsText(txt, x + 23, y + 12, 10, HUB.live ? '#dfffe8' : '#ffe9a0', { weight: 800, track: 2 });
  if (reqs) { // friend requests: tap to see them
    const t2 = reqs + (reqs === 1 ? ' FRIEND REQUEST' : ' FRIEND REQUESTS'); ctx.font = `800 10px ${HEAD}`; tracked(2); const w2 = ctx.measureText(t2).width + 30; tracked(0);
    const x2 = W - 28 - w2, y2 = y + 26, on = frame % 50 < 34;
    uiPanel(x2, y2, w2, 22, { cut: 6, alpha: 0.9, accent: '#ffd23f', glow: on ? '#ffd23f' : null }); capsText(t2, x2 + 15, y2 + 12, 10, '#ffd23f', { weight: 900, track: 2 });
    if (screen !== 'friends' && !textEntryOn()) hit(x2, y2, w2, 22, ['__friends']);
  }
  ctx.restore();
}
addEventListener('load', () => setTimeout(hubStart, 2500));
