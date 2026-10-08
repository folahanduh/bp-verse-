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
    lines: { intro: "Let's flow.", super: 'Enter the flow!' },
    skill: { move: 'wave', name: 'Tidal Wave', desc: 'Throws a rolling wave of water.' },
    super: { move: 'flow', name: 'Flow State', desc: 'Faster everything + auto-dodge. Breaks if hit.' } },
  { id: 'ryan', name: 'Tiny D Ryan', title: 'The Infinite Expander', color: '#b44dff', inches: 59, kg: 50,
    str: 40, spd: 75, dur: 60, iq: 100, hax: 99, hair: '#22160f', curls: 1,
    skin: '#dba08c', shirt: '#26232e', pants: '#34343f', shoes: '#e8e8ee', sleeves: true, chain: '#dcdce6', sword: 1,
    build: { shoulder: 0.95, waist: 0.82, arm: 0.95, armW: 0.9, legW: 0.95, mob: 1.15, atk: 1.15, jump: 1.15, hp: 1.3 },
    quote: 'Size was never the limit.',
    lines: { intro: 'Size is just a number.', super: 'Watch me grow!' },
    skill: { move: 'spiral', name: 'Hypno Spiral', desc: 'Slow spiral that hypnotises on hit.' },
    super: { move: 'expand', name: 'Infinite Expansion', desc: 'Grows huge (sword too). Hypno field slows foes nearby.' } },
  { id: 'darren', name: 'Darren', title: 'Presence Disruption', color: '#f5c518', inches: 72, kg: 78,
    str: 95, spd: 80, dur: 100, iq: 70, hax: 100, hair: '#22150c', curls: 1,
    skin: '#c98a6a', shirt: '#24222a', pants: '#30303a', shoes: '#111116', sleeves: true, chain: '#f5c518',
    build: { shoulder: 1.05, waist: 0.88, arm: 1.0, armW: 1.0, legW: 1.05, mob: 1.06, atk: 1.04, jump: 1.0, hp: 1.12 },
    quote: "Don't think too hard about it.",
    lines: { intro: 'You feel that?', super: 'Stop thinking!' },
    skill: { move: 'mind', name: 'Mind Games', desc: 'Vanishes and reappears behind the foe.' },
    super: { move: 'presence', name: 'Presence Disruption', desc: 'Scrambles foe controls and weakens them.' } },
  { id: 'blake', name: 'BBL Blake', title: 'The Transformer', color: '#ff3fa4', inches: 70, kg: 136,
    str: 90, spd: 65, dur: 120, iq: 75, hax: 85, hair: '#c9a46a', longHair: 1,
    skin: '#d29a80', shirt: '#2ec4e6', pants: '#26262e', shoes: '#111116', sleeves: false,
    build: { shoulder: 1.2, waist: 1.25, arm: 0.92, armW: 1.5, legW: 1.75, belly: 1, mob: 0.62, atk: 0.85, jump: 0.75, hp: 1.25, dmg: 1.4 },
    quote: 'Adapt or get flattened.',
    lines: { intro: 'Time to adapt.', super: 'Transform!' },
    skill: { move: 'scratch', name: 'Furry Fury', desc: 'Turns furry and rakes with claws: 3 hits.' },
    super: { move: 'form', name: 'Form Adaptation', desc: 'Armoured form: no flinching, 60% less damage.' } },
  { id: 'frank', name: 'Frank Black', title: 'The Enforcer', color: '#ff2b2b', inches: 79, kg: 125,
    str: 100, spd: 85, dur: 100, iq: 80, hax: 75, hair: '#0d0907', locs: 1,
    skin: '#6b4030', shirt: '#1e1d22', pants: '#2c2c34', shoes: '#111116', sleeves: false, chain: '#dcdce6',
    build: { shoulder: 1.5, waist: 0.82, arm: 1.15, armW: 1.6, legW: 1.4, muscle: 1, mob: 0.95, atk: 0.95, jump: 0.95 },
    quote: 'Calm. Always calm.',
    lines: { intro: 'Stay calm.', super: 'Black... Force!' },
    skill: { move: 'ball', name: 'Full-Court Shot', desc: 'Throws a basketball in an arc. It bounces.' },
    super: { move: 'force', name: 'Black Force', desc: 'Unstoppable shockwave punch.' } },
];
for (const c of CHARS) c.img = img('faces/' + c.id + '.png');

// skins: index 0 is the default look; the rest override colours and add costume parts
const SKINS = {
  julian: [{ name: 'Classic' },
    { name: 'Fox', head: 'fox', fur: '#e8762b', furLight: '#fff1df', shirt: '#e8762b', pants: '#e8762b', shoes: '#2a1a12', sleeves: true, spots: false, tail: 'fox', furBody: 1 }],
  ryan: [{ name: 'Classic' },
    { name: 'Captain Undies', shirt: '#dba08c', pants: '#dba08c', shoes: '#e8e8ee', sleeves: false, chain: null, briefs: '#ffffff', cape: '#d61f2c', bare: 1 }],
  darren: [{ name: 'Classic' },
    { name: 'All Gold', shirt: '#c9a227', pants: '#8a6d12', shoes: '#f5c518', chain: '#ffffff' }],
  blake: [{ name: 'Classic' },
    { name: 'Furry', head: 'furry', fur: '#7ec8ff', furLight: '#ffd1ec', shirt: '#7ec8ff', pants: '#7ec8ff', shoes: '#ff8ad1', sleeves: true, tail: 'fluffy', furBody: 1 }],
  frank: [{ name: 'Classic' },
    { name: 'BP Kings #23', shirt: '#c8102e', pants: '#c8102e', shoes: '#111116', jersey: '23', socks: '#ffffff', headband: '#ffffff', shorts: 1, chain: null }],
};
function lookOf(c, skin) { return Object.assign({ shirt: c.shirt, pants: c.pants, shoes: c.shoes, sleeves: c.sleeves, spots: c.spots, chain: c.chain }, SKINS[c.id][skin || 0]); }

// CPU difficulty
const DIFFS = [
  { name: 'EASY', react: [20, 36], block: 0.12, combo: 0.15, special: 0.5, gap: 12, dmg: 0.8 },
  { name: 'NORMAL', react: [6, 18], block: 0.45, combo: 0.35, special: 1, gap: 8, dmg: 1 },
  { name: 'HARD', react: [3, 9], block: 0.7, combo: 0.6, special: 1.3, gap: 6, dmg: 1.1 },
  { name: 'HARDCORE', react: [1, 4], block: 0.9, combo: 0.85, special: 1.6, gap: 5, dmg: 1.25 },
];
let difficulty = 1;
// named combos: chains of moves that land in a row
const COMBOS = [
  ['ONE-TWO', 'jab jab2'], ['TRIPLE THREAT', 'jab jab2 hook'], ['FOUR PIECE', 'jab jab2 hook upper'],
  ['CROSS SWEEP', 'jab sweep'], ['DOUBLE JAB SWEEP', 'jab jab2 sweep'], ['JAB KICK', 'jab kick'],
  ['ONE-TWO ROUNDHOUSE', 'jab jab2 round'], ['SKY RISE', 'jab upper'], ['GUT CHECK', 'bodyhook upper'],
  ['BODY BREAKER', 'jab bodyhook upper'], ['HIGH-LOW', 'kick sweep'], ['HOOK & SWEEP', 'jab jab2 hook sweep'],
].map(([n, s]) => [n, s.split(' ')]);
const COMBO_INPUT = { jab: ['punch', ''], jab2: ['punch', ''], hook: ['punch', ''], upper: ['punch', 'down'], bodyhook: ['punch', 'fwd'], sweep: ['kick', 'down'], round: ['kick', 'fwd'], kick: ['kick', ''] };
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
// settings persist in this browser
// graphics: quality 0 LOW .. 3 ULTRA, renderer '3d' or '2d', auto = drop quality if the frame rate struggles
const gfx = { quality: 1, renderer: '3d', auto: true, showFps: false };
let voiceChat = 'ptt', dashTap = true; // voice chat: 'off' | 'open' (open mic) | 'ptt' (push to talk)
const EXTRA = { ptt: 'KeyB' };
window.LOAD = { p: 0, msg: 'Loading', done: false };
function saveSettings() {
  try { localStorage.setItem('f1223', JSON.stringify({ difficulty, musicOn, voiceOn, gfx, voiceChat, dashTap, keys: { p1: MAP1, p2: MAP2, extra: EXTRA } })); } catch (e) {}
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('f1223') || '{}');
    if (s.difficulty >= 0) difficulty = s.difficulty; if (s.musicOn === false) musicOn = false; if (s.voiceOn === false) voiceOn = false;
    if (s.gfx) Object.assign(gfx, s.gfx);
    if (s.voiceChat) voiceChat = s.voiceChat; if (s.dashTap === false) dashTap = false;
    if (s.keys) { Object.assign(MAP1, s.keys.p1 || {}); Object.assign(MAP2, s.keys.p2 || {}); Object.assign(EXTRA, s.keys.extra || {}); }
  } catch (e) {}
}
const VERSE_IMG = img('bg/verse.jpg');

// voices: the browser's built-in text-to-speech, a different pitch/speed per character (V toggles)
let voiceOn = true, VOICES = [];
const VOICE_CFG = { julian: [1.05, 1.05, 0], ryan: [1.7, 1.18, 1], darren: [0.75, 0.92, 2], blake: [0.5, 0.85, 3], frank: [0.3, 0.8, 4], announcer: [0.2, 0.72, 5] };
function loadVoices() { try { VOICES = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); } catch (e) {} }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(who, text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    const [p, r, v] = VOICE_CFG[who] || [1, 1, 0], u = new SpeechSynthesisUtterance(text);
    if (VOICES.length) u.voice = VOICES[v % VOICES.length];
    u.pitch = p; u.rate = r; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
function say(who, text) { if (demo) return; speak(who, text); if (net.role === 'host') netEvents.push('v|' + who + '|' + text); }
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
const DEFAULT_KEYS = { p1: { ...MAP1 }, p2: { ...MAP2 }, extra: { ...EXTRA } };
// readable key names for menus
function keyName(code) {
  if (!code) return '—';
  const m = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Tab: 'TAB', CapsLock: 'CAPS' };
  if (m[code]) return m[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}
const BTN = ['punch', 'kick', 'skill', 'super'];
let latch = [{}, {}];
const lastTap = [{}, {}];
// double-tap left/right = dash
function tapDir(slot, d) {
  if (!dashTap) return;
  const t = frame;
  if (lastTap[slot][d] && t - lastTap[slot][d] < 14) { latch[slot].dash = d === 'left' ? -1 : 1; lastTap[slot][d] = 0; }
  else lastTap[slot][d] = t;
}
addEventListener('keydown', e => {
  if (window.captureKey && !e.repeat && captureKey(e.code)) { e.preventDefault(); return; }
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
