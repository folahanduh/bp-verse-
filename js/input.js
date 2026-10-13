// ---------- mouse, touch (iPad / phones) and on-screen controls ----------
// Menus: every list row, card, tile and prompt registers where it is on screen as it's drawn (hit()), with the key
// presses that pick it. A click or tap replays those keys, so everything works exactly as with the keyboard; the
// mouse hovering over a row moves the highlight there. In a fight the mouse attacks (left punch, right kick, middle
// skill). On a touch screen a stick (left thumb, anywhere on the left) and a pad of buttons (right thumb) appear
// in the fight, and a small d-pad with OK / BACK in the menus. Typing (names, codes) brings up the phone keyboard.
let HITS = [];
function hit(x, y, w, h, keys, hover) { HITS.push({ x, y, w, h, keys, hover }); }
const findHit = (x, y) => { for (let i = HITS.length - 1; i >= 0; i--) { const r = HITS[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r; } return null; };
const pressKeys = keys => { for (const k of keys || []) onPress(k, k === 'Space' ? ' ' : ''); };
// the key presses that move a list's highlight from one row to another
const stepKeys = (from, to, dn, up) => { const k = []; for (let i = from; i < to; i++) k.push(dn); for (let i = to; i < from; i++) k.push(up); return k; };
// a key cap's label -> the key it stands for
function capCode(t) {
  t = String(t).toUpperCase();
  const M = { ENTER: 'Enter', ESC: 'Escape', SPACE: 'Space', TAB: 'Tab', '←': 'ArrowLeft', '→': 'ArrowRight', '↑': 'ArrowUp', '↓': 'ArrowDown', DEL: 'Delete', BKSP: 'Backspace' };
  if (M[t]) return M[t];
  if (/^[A-Z]$/.test(t)) return 'Key' + t; if (/^[0-9]$/.test(t)) return 'Digit' + t;
  return null;
}
const sqLive = () => screen === 'squad3d' && SQ.G && SQ.G.ph !== 'end' && !SQ.menu;
const fightLive = () => (screen === 'fight' && !matchOver && !paused && !(typeof replayInfo === 'function' && replayInfo()) && P.length === 2) || sqLive();

// ---- the on-screen fight pad (canvas pixels) ----
const TPAD = [
  { id: 'env', x: 712, y: 326, r: 23, label: 'ITEM' }, { id: 'skill', x: 798, y: 326, r: 30, label: 'SKILL' }, { id: 'super', x: 884, y: 326, r: 30, label: 'SUPER' },
  { id: 'grab', x: 712, y: 404, r: 29, label: 'GRAB' }, { id: 'punch', x: 798, y: 404, r: 37, label: 'PUNCH' }, { id: 'kick', x: 884, y: 404, r: 37, label: 'KICK' },
  { id: 'block', x: 712, y: 482, r: 29, label: 'BLOCK', hold: 1 }, { id: 'jump', x: 798, y: 484, r: 32, label: 'JUMP', hold: 1 }, { id: 'dash', x: 884, y: 484, r: 29, label: 'DASH' },
  { id: 'pause', x: W / 2, y: 76, r: 16, label: 'II' },
];
// the menu pad: a d-pad and OK / BACK, bottom left
const MPAD = [
  { id: 'ArrowUp', x: 58, y: 446, r: 17, label: '▲' }, { id: 'ArrowDown', x: 58, y: 512, r: 17, label: '▼' }, { id: 'ArrowLeft', x: 25, y: 479, r: 17, label: '◀' }, { id: 'ArrowRight', x: 91, y: 479, r: 17, label: '▶' },
  { id: 'Enter', x: 142, y: 500, r: 20, label: 'OK' }, { id: 'Escape', x: 142, y: 456, r: 16, label: 'BACK' },
];
const padAt = (list, x, y, give = 8) => list.find(b => Math.hypot(x - b.x, y - b.y) <= b.r + give);
const STICK_R = 62;
// the stick as a direction for readLocal (x right, y up), or null when it isn't held
function touchMove(slot, both) {
  const s = touch.stick; if (!touch.on || !s || !(both || slot === 0)) return null;
  const dx = (s.x - s.bx) / STICK_R, dy = -(s.y - s.by) / STICK_R, m = Math.hypot(dx, dy);
  if (m < 0.18) return [0, 0];
  return m > 1 ? [dx / m, dy / m] : [dx, dy];
}

// ---- pointer handling ----
const canvasXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
const ptrs = {};
let wantFull = true;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  const [x, y] = canvasXY(e), isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
  try { ac(); } catch (er) {}
  if (isTouch) {
    if (!touch.on) { touch.on = true; document.body.classList.add('touch'); }
    if (wantFull && document.documentElement.requestFullscreen && !document.fullscreenElement) { wantFull = false; document.documentElement.requestFullscreen().catch(() => {}); }
    e.preventDefault();
  }
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  const p = ptrs[e.pointerId] = { x0: x, y0: y, x, y, touch: isTouch, kind: 'tap' };
  if (fightLive()) {
    if (isTouch) {
      const b = padAt(TPAD, x, y);
      if (b) { p.kind = 'btn'; p.btn = b.id; touchButton(b.id, true); return; }
      if (x < W * 0.5 && y > H * 0.28) { p.kind = 'stick'; touch.stick = { id: e.pointerId, bx: x, by: y, x, y }; return; }
      if (sqLive() && x >= W * 0.5) { p.kind = 'cam'; return; } // SQUADS: drag on the right to turn the camera
      p.kind = 'none'; return;
    }
    // the mouse in a fight: left punch, right kick, middle skill (Shift blocks, Space jumps)
    const b = ['punch', 'skill', 'kick'][e.button]; if (b) latch[0][b] = 1;
    p.kind = 'none'; return;
  }
  if (isTouch) { const b = padAt(MPAD, x, y, 2); if (b && !textEntryOn() && screen !== 'loading') { p.kind = 'mbtn'; onPress(b.id, ''); return; } }
});
cv.addEventListener('pointermove', e => {
  const [x, y] = canvasXY(e), p = ptrs[e.pointerId];
  if (p) { if (p.kind === 'cam') { SQ.cam.yaw += (x - p.x) * 0.009; SQ.cam.pitch = clamp(SQ.cam.pitch + (y - p.y) * 0.006, -0.25, 0.75); } p.x = x; p.y = y; if (p.kind === 'stick' && touch.stick && touch.stick.id === e.pointerId) { const s = touch.stick; s.x = x; s.y = y;
    const d = Math.hypot(x - s.bx, y - s.by); if (d > STICK_R * 1.4) { s.bx = x - (x - s.bx) / d * STICK_R * 1.4; s.by = y - (y - s.by) / d * STICK_R * 1.4; } } // the base follows a thumb that runs off it
    return; }
  // hovering with the mouse moves a menu's highlight
  if (e.pointerType === 'mouse' && !fightLive()) { const r = findHit(x, y); if (r && r.hover && r.hover.length && r !== IN_HOVER.last) { IN_HOVER.last = r; pressKeys(r.hover); } else if (!r) IN_HOVER.last = null; }
});
const IN_HOVER = { last: null };
function ptrEnd(e) {
  const p = ptrs[e.pointerId]; delete ptrs[e.pointerId]; if (!p) return;
  if (p.kind === 'stick' && touch.stick && touch.stick.id === e.pointerId) touch.stick = null;
  if (p.kind === 'btn') touchButton(p.btn, false);
  if (p.kind === 'tap' && e.type === 'pointerup' && Math.hypot(p.x - p.x0, p.y - p.y0) < 16) {
    if (textEntryOn() && p.touch) showKeyboard();
    const r = findHit(p.x, p.y); if (r) { IN_HOVER.last = r; pressKeys(r.keys); }
    else if (screen === 'title' || screen === 'vs') onPress('Enter', '');
  }
}
cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
function touchButton(id, down) {
  if (id === 'pause') { if (down) onPress('Escape', ''); return; }
  if (id === 'block' || id === 'jump') { touch.btn[id] = down; return; }
  if (!down) return;
  if (id === 'dash') latch[0].dash = 2; else latch[0][id] = 1;
  touch.btn['_' + id] = frame; // a flash on the button
}
// a held stick / buttons also drive the classic (side-on) fight: jump, block and walking
function touchClassic(i) {
  if (!touch.on) return;
  const m = touchMove(0, true); if (m) { if (m[0] < -0.4) i.left = 1; if (m[0] > 0.4) i.right = 1; if (m[1] > 0.6) i.up = 1; if (m[1] < -0.6) i.down = 1; }
  if (touch.btn.jump) i.up = 1; if (touch.btn.block) i.down = 1;
}

// ---- the phone keyboard for typing names and codes ----
const kbIn = document.createElement('input');
Object.assign(kbIn, { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
kbIn.setAttribute('autocorrect', 'off'); kbIn.setAttribute('aria-hidden', 'true');
Object.assign(kbIn.style, { position: 'fixed', left: '-1000px', top: '0', opacity: '0', width: '10px', height: '10px' });
document.body.appendChild(kbIn);
function showKeyboard() { kbIn.value = ' '; try { kbIn.focus({ preventScroll: true }); kbIn.setSelectionRange(1, 1); } catch (e) {} }
kbIn.addEventListener('input', e => {
  if (e.inputType === 'deleteContentBackward') onPress('Backspace', 'Backspace');
  else for (const ch of (e.data || kbIn.value.slice(1))) { const up = ch.toUpperCase(); onPress(/[A-Z]/.test(up) ? 'Key' + up : /[0-9]/.test(ch) ? 'Digit' + ch : ch === ' ' ? 'Space' : ch === '-' ? 'Minus' : '', ch); }
  kbIn.value = ' '; try { kbIn.setSelectionRange(1, 1); } catch (er) {}
});
kbIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onPress('Enter', 'Enter'); if (!textEntryOn()) kbIn.blur(); } else if (e.key === 'Backspace' && kbIn.value.length <= 1) { e.preventDefault(); e.stopPropagation(); onPress('Backspace', 'Backspace'); } else e.stopPropagation(); });
kbIn.addEventListener('keyup', e => e.stopPropagation());

// ---- drawing the on-screen controls ----
function drawTouch() {
  if (!touch.on) return;
  ctx.save();
  if (fightLive()) {
    const s = touch.stick, bx = s ? s.bx : 120, by = s ? s.by : 420, m = touchMove(0, true) || [0, 0];
    ctx.globalAlpha = s ? 0.55 : 0.28; ctx.beginPath(); ctx.arc(bx, by, STICK_R, 0, 7); ctx.fillStyle = 'rgba(10,16,28,0.6)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,200,255,0.7)'; ctx.stroke();
    ctx.globalAlpha = s ? 0.85 : 0.4; ctx.beginPath(); ctx.arc(bx + m[0] * STICK_R * 0.7, by - m[1] * STICK_R * 0.7, 26, 0, 7); ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.fill();
    const me = sqLive() ? Object.assign({ skillMax: 1 }, sqP(SQ.me) || {}) : P[stormMe() >= 0 ? stormMe() : 0];
    for (const b of TPAD) {
      const held = touch.btn[b.id] || frame - (touch.btn['_' + b.id] || -99) < 8, ready = b.id === 'super' ? me.meter >= SUPER_COST : b.id === 'skill' ? me.skillCd <= 0 : true;
      ctx.globalAlpha = held ? 0.85 : 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = held ? 'rgba(120,180,255,0.75)' : 'rgba(10,16,28,0.62)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = b.id === 'super' && ready ? '#ffd23f' : b.id === 'punch' || b.id === 'kick' ? 'rgba(255,255,255,0.75)' : 'rgba(160,200,255,0.6)'; ctx.stroke();
      if (b.id === 'skill' && me.skillCd > 0) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - me.skillCd / me.skillMax)); ctx.strokeStyle = '#3ea6ff'; ctx.lineWidth = 3; ctx.stroke(); }
      if (b.id === 'super') { ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, me.meter / SUPER_COST)); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.globalAlpha = held ? 1 : 0.85; capsText(b.label, b.x + 1, b.y + 1, b.r > 30 ? 11 : 9, '#fff', { align: 'center', weight: 800, track: 1 });
    }
  } else if (!textEntryOn() && screen !== 'loading') {
    for (const b of MPAD) { ctx.globalAlpha = 0.42; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = 'rgba(10,16,28,0.7)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(160,200,255,0.7)'; ctx.stroke();
      ctx.globalAlpha = 0.9; capsText(b.label, b.x + 1, b.y + 1, b.label.length > 2 ? 9 : 12, '#fff', { align: 'center', weight: 800, track: 1 }); }
  }
  ctx.restore();
}
// phones held upright: ask for landscape
function drawRotateHint() {
  if (!touch.on || innerWidth >= innerHeight) return;
  ctx.save(); ctx.fillStyle = 'rgba(3,4,9,0.9)'; ctx.fillRect(0, 0, W, H);
  chromeText('TURN YOUR PHONE SIDEWAYS', W / 2, H / 2 - 10, 30, { align: 'center', weight: 900, track: 3 });
  capsText('BP VERSE PLAYS IN LANDSCAPE', W / 2, H / 2 + 28, 12, 'rgba(214,224,240,0.7)', { align: 'center', weight: 700, track: 4 });
  ctx.restore();
}
