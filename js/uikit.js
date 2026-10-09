// ---------- UI kit: the look of every menu and the HUD (Injustice 2 style) ----------
// Dark gunmetal glass with chamfered corners, chrome lettering, hex frames, glowing blue selection plates,
// key-cap button prompts and a slowly moving backdrop of light shafts, hex grids and dust.
const DISP = '"Exo 2", "Oswald", "Arial Narrow", Arial, sans-serif';
const UI = { blue: '#3ea6ff', blueHi: '#bfe4ff', gold: '#e9b949', red: '#ff3a44', p1: '#2f8cff', p2: '#ff3340', text: '#eef3fa', dim: 'rgba(214,224,240,0.62)', edge: 'rgba(150,172,205,0.38)' };

// a box with two corners cut off (top right and bottom left)
function chamfer(x, y, w, h, c) {
  c = Math.min(c == null ? 12 : c, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.closePath();
}
// a slanted plate (parallelogram); sk > 0 leans right
function slant(x, y, w, h, sk) { ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + w + sk, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
function hexPath(cx, cy, r, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (rot || 0) + Math.PI / 6 + i * Math.PI / 3; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); }

// a tiling hex grid, used faintly inside panels and across the backdrop
const UIK = {};
function hexPattern() {
  if (UIK.hex) return UIK.hex;
  const r = 14, w = r * Math.sqrt(3), h = r * 3, c = document.createElement('canvas'); c.width = Math.round(w); c.height = h;
  const g = c.getContext('2d'); g.strokeStyle = '#ffffff'; g.lineWidth = 1;
  const hx = (cx, cy) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.stroke(); };
  hx(w / 2, r); hx(0, r * 2.5); hx(w, r * 2.5); hx(w / 2, r * 4); hx(w / 2, -r * 0.5);
  return (UIK.hex = ctx.createPattern(c, 'repeat'));
}
// chrome: a polished metal gradient (white top, a dark horizon line, bright again at the bottom)
function chromeGrad(y0, y1, tint) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, tint || '#d6e0ee'); g.addColorStop(0.5, '#6d7a90'); g.addColorStop(0.62, '#aebbd0'); g.addColorStop(1, '#f4f8ff');
  return g;
}
// dark glass panel: drop shadow, a gradient, the faint hex grid, a lit top edge and a coloured accent
function uiPanel(x, y, w, h, o) {
  o = o || {}; const c = o.cut == null ? 12 : o.cut, a = o.alpha == null ? 0.86 : o.alpha;
  ctx.save();
  chamfer(x, y, w, h, c); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(24,32,50,${a})`); g.addColorStop(1, `rgba(5,8,14,${a})`); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); chamfer(x, y, w, h, c); ctx.clip();
  ctx.globalAlpha = 0.05; ctx.fillStyle = hexPattern(); ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  const hl = ctx.createLinearGradient(x, 0, x + w, 0); hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.3, 'rgba(255,255,255,0.32)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; ctx.fillRect(x, y, w, 1);
  if (o.accent) { ctx.fillStyle = o.accent; if (o.accentTop) ctx.fillRect(x, y, w, 3); else ctx.fillRect(x, y, 3, h); }
  if (o.glow) { const gg = ctx.createLinearGradient(0, y, 0, y + h * 0.6); gg.addColorStop(0, rgba(o.glow, 0.18)); gg.addColorStop(1, rgba(o.glow, 0)); ctx.fillStyle = gg; ctx.fillRect(x, y, w, h); }
  ctx.restore();
  chamfer(x, y, w, h, c); ctx.strokeStyle = o.edge || UI.edge; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
// big chrome lettering (italic, heavy), optionally glowing in a colour
function chromeText(t, x, y, size, o) {
  o = o || {}; ctx.save(); ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
  ctx.font = `italic ${o.weight || 800} ${size}px ${DISP}`; tracked(o.track == null ? Math.round(size * 0.04) : o.track);
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * 0.45; }
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size / 11); ctx.strokeStyle = o.stroke || 'rgba(4,6,12,0.92)'; ctx.strokeText(t, x, y);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = o.fill || chromeGrad(y - size * 0.45, y + size * 0.45, o.tint); ctx.fillText(t, x, y);
  ctx.restore(); tracked(0);
}
// small tracked caps label
function capsText(t, x, y, size, col, o) {
  o = o || {}; ctx.save(); ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle'; ctx.font = `${o.weight || 600} ${size}px ${o.font || DISP}`; tracked(o.track == null ? 3 : o.track);
  ctx.fillStyle = col || UI.text; ctx.fillText(t, x, y); const w = ctx.measureText(t).width; ctx.restore(); tracked(0); return w;
}
// a keyboard key cap for button prompts; returns its width
function keyCap(x, y, label, o) {
  o = o || {}; ctx.save(); ctx.font = `700 11px ${DISP}`; tracked(1);
  const w = Math.max(22, ctx.measureText(label).width + 12), h = 20, X = o.right ? x - w : x;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X, y - h / 2, w, h, 4) : ctx.rect(X, y - h / 2, w, h);
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, '#f4f7fc'); g.addColorStop(1, '#a9b5c8'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#0a0f18'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, X + w / 2, y + 0.5);
  ctx.restore(); tracked(0); return w;
}
// the bottom prompt bar: key caps and what they do, right-aligned like a console game
function uiPrompts(items, o) {
  o = o || {}; const y = H - 22;
  ctx.save();
  const g = ctx.createLinearGradient(0, H - 52, 0, H); g.addColorStop(0, 'rgba(2,3,6,0)'); g.addColorStop(1, 'rgba(2,3,6,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, H - 52, W, 52);
  const ln = ctx.createLinearGradient(0, 0, W, 0); ln.addColorStop(0, 'rgba(120,170,255,0)'); ln.addColorStop(0.5, 'rgba(160,200,255,0.4)'); ln.addColorStop(1, 'rgba(120,170,255,0)'); ctx.fillStyle = ln; ctx.fillRect(0, H - 42, W, 1);
  let x = W - 28;
  for (let i = items.length - 1; i >= 0; i--) {
    const [k, label] = items[i];
    const lw = capsText(label, x, y, 11, 'rgba(232,238,248,0.88)', { align: 'right', track: 2 }); x -= lw + 8;
    String(k).split(' ').reverse().forEach(kk => { x -= keyCap(x, y, kk, { right: true }) + 3; });
    x -= 22;
  }
  if (o.left) capsText(o.left, 28, y, 10, 'rgba(214,224,240,0.45)', { track: 2, font: BODY, weight: 500 });
  ctx.restore();
}
// a menu row: dark glass when idle; lit, glowing and gleaming when selected
function uiMenuItem(x, y, w, h, label, on, k, value, o) {
  o = o || {}; const sk = 9, a = clamp(k == null ? 1 : k, 0, 1), xx = x - (1 - easeOut(a)) * 40, acc = o.accent || UI.blue;
  ctx.save(); ctx.globalAlpha = a;
  if (on) {
    ctx.save(); slant(xx, y, w, h, sk); ctx.shadowColor = rgba(acc, 0.85); ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(xx, 0, xx + w, 0); g.addColorStop(0, '#f2f9ff'); g.addColorStop(0.55, rgba(o.light || '#9fd2ff', 0.95)); g.addColorStop(1, rgba(acc, 0.15)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); slant(xx, y, w, h, sk); ctx.clip(); // the gleam sweeping across
    const sx = xx - 80 + ((frame * 4) % (w + 260)); const sg = ctx.createLinearGradient(sx, 0, sx + 70, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx, y, 70, h); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(xx, y, w + sk, 1); ctx.restore();
    ctx.fillStyle = acc; slant(xx - 12, y, 5, h, sk); ctx.fill(); // the marker
  } else {
    slant(xx, y, w, h, sk); ctx.fillStyle = o.idle || 'rgba(8,12,20,0.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,172,205,0.16)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const fs = o.size || Math.round(h * 0.5);
  ctx.font = `italic ${on ? 800 : 600} ${fs}px ${DISP}`; tracked(2); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = on ? '#06101c' : o.disabled ? 'rgba(214,224,240,0.32)' : 'rgba(226,234,246,0.78)'; ctx.fillText(label, xx + 18 + sk * 0.5, y + h / 2 + 1);
  if (value) { ctx.font = `${on ? 700 : 600} ${Math.round(fs * 0.72)}px ${DISP}`; tracked(1); ctx.textAlign = 'right'; ctx.fillStyle = on ? '#0a1a2c' : 'rgba(214,224,240,0.55)'; ctx.fillText(value, xx + w - 14, y + h / 2 + 1); }
  ctx.restore(); tracked(0);
}
// the screen header: a hex emblem, the title in chrome and a coloured kicker
function uiHeader(title, kicker, o) {
  o = o || {}; const k = easeOut(clamp(screenT / 22, 0, 1)), x = 44 - (1 - k) * 30;
  ctx.save(); ctx.globalAlpha = k;
  const g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(2,3,6,0.85)'); g.addColorStop(1, 'rgba(2,3,6,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
  hexPath(x + 16, 50, 17); ctx.fillStyle = 'rgba(8,12,20,0.9)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = chromeGrad(33, 67); ctx.stroke();
  capsText('BP', x + 16, 51, 12, o.accent || UI.blue, { align: 'center', weight: 800, track: 1 });
  if (kicker) capsText(kicker, x + 44, 36, 11, o.accent || UI.blue, { track: 5, weight: 700 });
  chromeText(title, x + 42, 60, 30, { glow: rgba(o.accent || UI.blue, 0.35) });
  const lw = 260; const ln = ctx.createLinearGradient(x + 44, 0, x + 44 + lw, 0); ln.addColorStop(0, o.accent || UI.blue); ln.addColorStop(1, 'rgba(62,166,255,0)'); ctx.fillStyle = ln; ctx.fillRect(x + 44, 82, lw, 2);
  ctx.restore();
  if (o.profile !== false) uiProfile();
}
// top right: the player card (rank, rating, record)
function uiProfile() {
  const T = tierOf(rank.r), x = W - 250, y = 22, k = easeOut(clamp(screenT / 26, 0, 1));
  ctx.save(); ctx.globalAlpha = k;
  uiPanel(x, y, 222, 50, { cut: 10, alpha: 0.78, accent: T[2] });
  hexPath(x + 30, y + 25, 16); ctx.fillStyle = rgba(T[2], 0.25); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = T[2]; ctx.stroke();
  capsText(T[0].slice(0, 1), x + 30, y + 26, 14, '#fff', { align: 'center', weight: 800, track: 0 });
  capsText('PLAYER 1', x + 56, y + 17, 12, '#fff', { weight: 700, track: 2 });
  capsText(rankLabel(rank.r).toUpperCase() + '  ·  ' + rank.w + 'W ' + rank.l + 'L', x + 56, y + 34, 10, T[2], { track: 2 });
  ctx.restore();
}
// a hexagon portrait frame: chrome ring, coloured glow, the face inside
function hexPortrait(c, skin, cx, cy, r, o) {
  o = o || {}; ctx.save();
  hexPath(cx, cy, r + 4); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
  ctx.save(); hexPath(cx, cy, r); ctx.clip();
  const bg = ctx.createRadialGradient(cx, cy - r * 0.3, 2, cx, cy, r * 1.2); bg.addColorStop(0, rgba(c.color, 0.85)); bg.addColorStop(1, '#05070c'); ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  drawFace(c, skin || 0, cx, cy + r * 0.18, r * 0.92, !!o.flip);
  const sh = ctx.createLinearGradient(0, cy - r, 0, cy + r); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  hexPath(cx, cy, r); ctx.lineWidth = 3.5; ctx.strokeStyle = chromeGrad(cy - r, cy + r); ctx.stroke();
  hexPath(cx, cy, r - 3); ctx.lineWidth = 1.2; ctx.strokeStyle = o.ring || rgba(c.color, 0.9); ctx.stroke();
  ctx.restore();
}
// the moving backdrop behind every menu: light shafts, a drifting hex grid with a pulse running through it, dust
function uiBackdrop(col, o) {
  o = o || {}; const t = frame;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { // slow light shafts from the top
    const x = W * (0.25 + i * 0.3) + Math.sin(t / (260 + i * 70) + i) * 120, a = 0.05 + 0.03 * Math.sin(t / 90 + i * 2);
    const g = ctx.createLinearGradient(x, 0, x + 160, H); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 40, -10); ctx.lineTo(x + 60, -10); ctx.lineTo(x + 300, H); ctx.lineTo(x + 80, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the hex grid, faint, with a bright wave travelling across it
  ctx.save(); const off = (t * 0.25) % 48;
  const wave = (t * 3) % (W + 600) - 300;
  ctx.translate(-off, -off); ctx.globalAlpha = o.grid == null ? 0.035 : o.grid; ctx.fillStyle = hexPattern(); ctx.fillRect(0, 0, W + 96, H + 96); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(-off, -off);
  for (const [hw, al] of [[220, 0.03], [130, 0.04], [60, 0.05]]) { ctx.save(); ctx.beginPath(); ctx.rect(wave - hw + off, 0, hw * 2, H + 96); ctx.clip(); ctx.globalAlpha = al; ctx.fillStyle = hexPattern(); ctx.fillRect(0, 0, W + 96, H + 96); ctx.restore(); }
  ctx.restore();
  // dust motes drifting through the light
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) { const sp = 0.15 + seeded(i, 11) * 0.4, x = (seeded(i, 12) * W + t * sp * 0.6) % W, y = (seeded(i, 13) * H + Math.sin(t / 80 + i) * 20 - t * sp * 0.3 + H * 10) % H;
    ctx.globalAlpha = 0.15 + 0.35 * Math.abs(Math.sin(t / 40 + i)); ctx.fillStyle = i % 4 ? '#dfe9ff' : col; ctx.fillRect(x, y, 1.6, 1.6); }
  ctx.restore();
  // a scan line rolling down, very faint
  const sy = (t * 1.2) % (H + 80) - 40; ctx.save(); const sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30); sg.addColorStop(0, 'rgba(160,200,255,0)'); sg.addColorStop(0.5, 'rgba(160,200,255,0.05)'); sg.addColorStop(1, 'rgba(160,200,255,0)'); ctx.fillStyle = sg; ctx.fillRect(0, sy - 30, W, 60); ctx.restore();
}
// a horizontal meter: chamfered frame, segments, gloss
function uiMeter(x, y, w, h, k, col, o) {
  o = o || {}; const segs = o.segs || 1, gap = 3, sw = (w - gap * (segs - 1)) / segs;
  ctx.save();
  for (let i = 0; i < segs; i++) {
    const sx = x + i * (sw + gap), q = clamp(k * segs - i, 0, 1);
    slant(sx, y, sw, h, o.sk == null ? 4 : o.sk); ctx.fillStyle = 'rgba(4,6,12,0.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,180,210,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    if (q > 0) { ctx.save(); slant(sx, y, sw, h, o.sk == null ? 4 : o.sk); ctx.clip();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, o.hi || UI.blueHi); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fillRect(sx, y, (sw + 6) * q, h);
      if (q >= 1 && o.full) { const sx2 = sx - 40 + ((frame * 3 + i * 40) % (sw + 80)); const sg = ctx.createLinearGradient(sx2, 0, sx2 + 30, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.8)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(sx2, y, 30, h); }
      ctx.restore(); }
  }
  ctx.restore();
}
