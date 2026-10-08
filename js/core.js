// ---------- core: constants, roster, audio/music, input ----------
const cv = document.getElementById('c');
let ctx = cv.getContext('2d');
const W = 960, H = 540, WW = 1500, FLOOR = 470, FS = 484, GRAV = 0.75;
const rand = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const FONT = 'Impact, "Arial Black", sans-serif';
const img = src => { const i = new Image(); i.src = src; return i; };
const ready = i => i && i.complete && i.naturalWidth > 0;

// stats from the BP / Verity Club cards
const CHARS = [
  { id: 'julian', name: 'Julian', title: 'Master of the Flow', color: '#3b8cff', inches: 73, kg: 72,
    str: 85, spd: 90, dur: 80, iq: 88, hax: 95, hair: '#24170f', curls: 1,
    skin: '#d9a58e', shirt: '#e9e9ef', pants: '#2b2b36', shoes: '#111116', sleeves: true, spots: true,
    build: { shoulder: 1.0, waist: 0.8, arm: 1.02, armW: 0.95, legW: 1.0, mob: 1.04, atk: 1.04, jump: 1.05 },
    quote: 'Stay in the flow.',
    skill: { move: 'wave', name: 'Tidal Wave', desc: 'Throws a rolling wave of water.' },
    super: { move: 'flow', name: 'Flow State', desc: 'Faster everything + auto-dodge. Breaks if hit.' } },
  { id: 'ryan', name: 'Tiny D Ryan', title: 'The Infinite Expander', color: '#b44dff', inches: 59, kg: 50,
    str: 40, spd: 75, dur: 60, iq: 100, hax: 99, hair: '#22160f', curls: 1,
    skin: '#dba08c', shirt: '#26232e', pants: '#34343f', shoes: '#e8e8ee', sleeves: true, chain: '#dcdce6',
    build: { shoulder: 0.95, waist: 0.82, arm: 0.95, armW: 0.9, legW: 0.95, mob: 1.15, atk: 1.15, jump: 1.15, hp: 1.3 },
    quote: 'Size was never the limit.',
    skill: { move: 'spiral', name: 'Hypno Spiral', desc: 'Slow spiral that hypnotises on hit.' },
    super: { move: 'expand', name: 'Infinite Expansion', desc: 'Grows huge. Hypno field slows foes nearby.' } },
  { id: 'darren', name: 'Darren', title: 'Presence Disruption', color: '#f5c518', inches: 72, kg: 78,
    str: 95, spd: 80, dur: 100, iq: 70, hax: 100, hair: '#22150c', curls: 1,
    skin: '#c98a6a', shirt: '#24222a', pants: '#30303a', shoes: '#111116', sleeves: true, chain: '#f5c518',
    build: { shoulder: 1.05, waist: 0.88, arm: 1.0, armW: 1.0, legW: 1.05, mob: 1.06, atk: 1.04, jump: 1.0, hp: 1.12 },
    quote: "Don't think too hard about it.",
    skill: { move: 'mind', name: 'Mind Games', desc: 'Vanishes and reappears behind the foe.' },
    super: { move: 'presence', name: 'Presence Disruption', desc: 'Scrambles foe controls and weakens them.' } },
  { id: 'blake', name: 'BBL Blake', title: 'The Transformer', color: '#ff3fa4', inches: 70, kg: 136,
    str: 90, spd: 65, dur: 120, iq: 75, hax: 85, hair: '#c9a46a', longHair: 1,
    skin: '#d29a80', shirt: '#2ec4e6', pants: '#26262e', shoes: '#111116', sleeves: false,
    build: { shoulder: 1.2, waist: 1.25, arm: 0.92, armW: 1.5, legW: 1.75, belly: 1, mob: 0.62, atk: 0.85, jump: 0.75, hp: 1.25 },
    quote: 'Adapt or get flattened.',
    skill: { move: 'slam', name: 'Body Slam', desc: 'Leaps in and lands with a shockwave.' },
    super: { move: 'form', name: 'Form Adaptation', desc: 'Armoured form: no flinching, 60% less damage.' } },
  { id: 'frank', name: 'Frank Black', title: 'The Enforcer', color: '#ff2b2b', inches: 79, kg: 125,
    str: 100, spd: 85, dur: 100, iq: 80, hax: 75, hair: '#0d0907', locs: 1,
    skin: '#6b4030', shirt: '#1e1d22', pants: '#2c2c34', shoes: '#111116', sleeves: false, chain: '#dcdce6',
    build: { shoulder: 1.5, waist: 0.82, arm: 1.15, armW: 1.6, legW: 1.4, muscle: 1, mob: 0.95, atk: 0.95, jump: 0.95 },
    quote: 'Calm. Always calm.',
    skill: { move: 'rush', name: 'Enforcer Rush', desc: 'Charging shoulder barge.' },
    super: { move: 'force', name: 'Black Force', desc: 'Unstoppable shockwave punch.' } },
];
for (const c of CHARS) c.img = img('faces/' + c.id + '.png');
const CROWD_IMG = { model: img('crowd/model.png'), hoodie: img('crowd/hoodie.png'), creature: img('crowd/creature.png') };

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(v * k), 0, 255);
  return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }

// ---------- sound (synthesised, no files) ----------
let AC = null, NOISE = null, demo = false;
function ac() {
  if (AC === null) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const n = AC.sampleRate; NOISE = AC.createBuffer(1, n, AC.sampleRate);
      const d = NOISE.getChannelData(0); for (let i = 0; i < n; i++) d[i] = rand() * 2 - 1;
    } catch (e) { AC = false; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f0, dur, type, vol, f1, at, filt) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = at || a.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let node = o;
  if (filt) { const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filt; o.connect(lp); node = lp; }
  node.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, at, type) {
  const a = ac(); if (!a) return;
  const s = a.createBufferSource(), g = a.createGain(), fl = a.createBiquadFilter(), t = at || a.currentTime;
  s.buffer = NOISE; fl.type = type || 'bandpass'; fl.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(a.destination); s.start(t, rand() * 0.5); s.stop(t + dur + 0.02);
}
const SOUNDS = {
  hit: () => { noise(0.09, 0.5, 900); tone(160, 0.08, 'square', 0.1, 70); },
  heavy: () => { noise(0.22, 0.7, 450); tone(110, 0.22, 'square', 0.16, 40); },
  thud: () => { noise(0.15, 0.5, 200); tone(80, 0.15, 'sine', 0.3, 40); },
  block: () => { tone(1100, 0.05, 'triangle', 0.1); noise(0.04, 0.2, 3000); },
  whoosh: () => noise(0.08, 0.1, 2400),
  jump: () => tone(260, 0.1, 'triangle', 0.05, 420),
  skill: () => tone(320, 0.25, 'sawtooth', 0.06, 700),
  super: () => { tone(160, 0.7, 'sawtooth', 0.08, 900); tone(240, 0.7, 'square', 0.04, 1300); },
  brk: () => { tone(300, 0.6, 'sawtooth', 0.12, 60); noise(0.4, 0.6, 600); },
  ko: () => { tone(220, 0.9, 'square', 0.14, 40); noise(0.5, 0.5, 300); },
  select: () => tone(700, 0.05, 'square', 0.04),
  confirm: () => tone(520, 0.12, 'square', 0.06, 1040),
  fight: () => { tone(330, 0.15, 'square', 0.07); setTimeout(() => tone(660, 0.3, 'square', 0.07), 140); },
  dodge: () => tone(900, 0.12, 'sine', 0.08, 1800),
};
let netEvents = [], netFx = [];
function sfx(n) { if (demo) return; SOUNDS[n](); if (net.role === 'host') netEvents.push(n); }

// background music: a little synth loop, different per stage (M toggles)
let musicOn = true, nextNote = 0, noteIdx = 0;
const BPM = 118, BEAT_FRAMES = 3600 / BPM;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function musicTick() {
  if (!AC || !musicOn || AC.state !== 'running') return;
  const spb = 60 / BPM / 4;
  if (nextNote < AC.currentTime) nextNote = AC.currentTime + 0.05;
  while (nextNote < AC.currentTime + 0.12) { playStep(noteIdx, nextNote); nextNote += spb; noteIdx++; }
}
function playStep(n, t) {
  const i = n % 16, bar = (n >> 4) % 4, st = STAGES[stageId].id, v = screen === 'fight' && !paused ? 1 : 0.55;
  const roots = [41, 41, 44, 39];
  if (st === 'garden') {
    if (i % 8 === 0) tone(110, 0.25, 'sine', 0.22 * v, 45, t);
    if (i % 2 === 0) tone(mtof(roots[bar] + 24 + [0, 4, 7, 12, 7, 4, 0, 7][(i / 2) % 8]), 0.3, 'triangle', 0.04 * v, 0, t);
    if (i % 4 === 2) noise(0.03, 0.04 * v, 8000, t, 'highpass');
    return;
  }
  if (i % 4 === 0) tone(150, 0.16, 'sine', 0.5 * v, 40, t);
  if (i % 4 === 2) noise(0.04, 0.07 * v, 8000, t, 'highpass');
  if (st === 'club' && (i === 4 || i === 12)) noise(0.12, 0.14 * v, 1500, t);
  if (i % 4 === 2 || (st === 'roof' && i % 8 === 7)) tone(mtof(roots[bar]), 0.2, 'sawtooth', 0.09 * v, 0, t, 420);
  if (st === 'club' && i % 8 === 6) tone(mtof(roots[bar] + 31), 0.12, 'square', 0.025 * v, 0, t, 2000);
}

// ---------- input ----------
const KEYS = {};
const MAP1 = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyF', kick: 'KeyG', skill: 'KeyH', super: 'KeyT' };
const MAP2 = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', punch: 'KeyK', kick: 'KeyL', skill: 'KeyJ', super: 'KeyI' };
const BTN = ['punch', 'kick', 'skill', 'super'];
let latch = [{}, {}];
const lastTap = [{}, {}];
// double-tap left/right = dash
function tapDir(slot, d) {
  const t = frame;
  if (lastTap[slot][d] && t - lastTap[slot][d] < 14) { latch[slot].dash = d === 'left' ? -1 : 1; lastTap[slot][d] = 0; }
  else lastTap[slot][d] = t;
}
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
  KEYS[e.code] = true;
  if (e.repeat) return;
  ac();
  for (const b of BTN) { if (e.code === MAP1[b]) latch[0][b] = 1; if (e.code === MAP2[b]) latch[1][b] = 1; }
  if (e.code === MAP1.left) tapDir(0, 'left'); if (e.code === MAP1.right) tapDir(0, 'right');
  if (e.code === MAP2.left) tapDir(1, 'left'); if (e.code === MAP2.right) tapDir(1, 'right');
  onPress(e.code, e.key);
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });

// game controllers: pad 1 = P1, pad 2 = P2
// X/Square punch · A/Cross kick · Y/Triangle skill · B/Circle or RB super · d-pad/stick move · Start = Enter · Back = Esc
const PAD_BTN = { 2: 'punch', 0: 'kick', 3: 'skill', 1: 'super', 5: 'super' };
const padHeld = [{}, {}], padPrev = [{}, {}];
addEventListener('gamepadconnected', e => { toast = { msg: 'Controller ' + (e.gamepad.index + 1) + ' connected', t: 150 }; });
function pollPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  for (let slot = 0; slot < 2; slot++) {
    const g = pads[slot], held = padHeld[slot] = {};
    if (!g) continue;
    const b = i => g.buttons[i] && g.buttons[i].pressed, ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    held.left = b(14) || ax < -0.5; held.right = b(15) || ax > 0.5; held.up = b(12) || ay < -0.6; held.down = b(13) || ay > 0.6;
    const prev = padPrev[slot], now = { ...held };
    for (const k in PAD_BTN) now['b' + k] = b(+k);
    now.start = b(9); now.back = b(8);
    const edge = k => now[k] && !prev[k];
    for (const k in PAD_BTN) if (edge('b' + k)) latch[slot][PAD_BTN[k]] = 1;
    if (edge('left')) tapDir(slot, 'left'); if (edge('right')) tapDir(slot, 'right');
    if (screen !== 'fight' || matchOver || paused) {
      const dirs = slot ? ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] : ['KeyA', 'KeyD', 'KeyW', 'KeyS'];
      ['left', 'right', 'up', 'down'].forEach((d, i) => { if (edge(d)) onPress(dirs[i], ''); });
      if (edge('b0') || edge('start')) onPress('Enter', '');
    } else if (edge('start')) onPress('Escape', '');
    if (edge('back')) onPress('Escape', '');
    padPrev[slot] = now;
  }
}

// slot: which keyset; both: merge both keysets (single-player and online)
function readLocal(slot, both) {
  const maps = both ? [MAP1, MAP2] : [slot ? MAP2 : MAP1], pads = both ? padHeld : [padHeld[slot]], i = {};
  for (const k of ['left', 'right', 'up', 'down']) i[k] = maps.some(m => KEYS[m[k]]) || pads.some(p => p[k]) ? 1 : 0;
  const L = both ? Object.assign({}, latch[0], latch[1]) : latch[slot];
  for (const b of BTN) i[b] = L[b] ? 1 : 0;
  i.dash = L.dash || 0;
  if (both) latch = [{}, {}]; else latch[slot] = {};
  return i;
}
