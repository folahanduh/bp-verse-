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
    fin: { id: 'tide', name: 'TIDAL FINISH', line: 'Wash away.' },
    super: { move: 'flow', name: 'Flow State', desc: 'Faster everything + auto-dodge. Breaks if hit.' } },
  { id: 'ryan', name: 'Tiny D Ryan', title: 'The Infinite Expander', color: '#b44dff', inches: 59, kg: 50,
    str: 40, spd: 75, dur: 60, iq: 100, hax: 99, hair: '#22160f', curls: 1,
    skin: '#dba08c', shirt: '#26232e', pants: '#34343f', shoes: '#e8e8ee', sleeves: true, chain: '#dcdce6', sword: 1,
    build: { shoulder: 0.95, waist: 0.82, arm: 0.95, armW: 0.9, legW: 0.95, mob: 1.15, atk: 1.15, jump: 1.15, hp: 1.3 },
    quote: 'Size was never the limit.',
    lines: { intro: 'Size is just a number.', super: 'Watch me grow!' },
    skill: { move: 'spiral', name: 'Hypno Spiral', desc: 'Slow spiral that hypnotises on hit.' },
    fin: { id: 'flick', name: 'INFINITE FLICK', line: 'Bye bye.' },
    super: { move: 'expand', name: 'Infinite Expansion', desc: 'Grows huge (sword too). Hypno field slows foes nearby.' } },
  { id: 'darren', name: 'Darren', title: 'Presence Disruption', color: '#f5c518', inches: 72, kg: 78,
    str: 95, spd: 80, dur: 100, iq: 70, hax: 100, hair: '#22150c', curls: 1,
    skin: '#c98a6a', shirt: '#24222a', pants: '#30303a', shoes: '#111116', sleeves: true, chain: '#f5c518',
    build: { shoulder: 1.05, waist: 0.88, arm: 1.0, armW: 1.0, legW: 1.05, mob: 1.06, atk: 1.04, jump: 1.0, hp: 1.12 },
    quote: "Don't think too hard about it.",
    lines: { intro: 'You feel that?', super: 'Stop thinking!' },
    skill: { move: 'mind', name: 'Mind Games', desc: 'Vanishes and reappears behind the foe.' },
    fin: { id: 'erase', name: 'MIND ERASE', line: 'Forget me.' },
    super: { move: 'presence', name: 'Presence Disruption', desc: 'Scrambles foe controls and weakens them.' } },
  { id: 'blake', name: 'BBL Blake', title: 'The Transformer', color: '#ff3fa4', inches: 70, kg: 136,
    str: 90, spd: 65, dur: 120, iq: 75, hax: 85, hair: '#c9a46a', longHair: 1,
    skin: '#d29a80', shirt: '#2ec4e6', pants: '#26262e', shoes: '#111116', sleeves: false,
    build: { shoulder: 1.2, waist: 1.25, arm: 0.92, armW: 1.5, legW: 1.75, belly: 1, mob: 0.62, atk: 0.85, jump: 0.75, hp: 1.25, dmg: 1.4 },
    quote: 'Adapt or get flattened.',
    lines: { intro: 'Time to adapt.', super: 'Transform!' },
    skill: { move: 'scratch', name: 'Furry Fury', desc: 'Turns furry and rakes with claws: 3 hits.' },
    fin: { id: 'flop', name: 'BELLY FLOP', line: 'Incoming!' },
    super: { move: 'form', name: 'Form Adaptation', desc: 'Armoured form: no flinching, 60% less damage.' } },
  { id: 'frank', name: 'Frank Black', title: 'The Enforcer', color: '#ff2b2b', inches: 79, kg: 125,
    str: 100, spd: 85, dur: 100, iq: 80, hax: 75, hair: '#0d0907', locs: 1,
    skin: '#6b4030', shirt: '#1e1d22', pants: '#2c2c34', shoes: '#111116', sleeves: false, chain: '#dcdce6',
    build: { shoulder: 1.5, waist: 0.82, arm: 1.15, armW: 1.6, legW: 1.4, muscle: 1, mob: 0.95, atk: 0.95, jump: 0.95 },
    quote: 'Calm. Always calm.',
    lines: { intro: 'Stay calm.', super: 'Black... Force!' },
    skill: { move: 'ball', name: 'Full-Court Shot', desc: 'Throws a basketball in an arc. It bounces.' },
    fin: { id: 'dunk', name: 'ALLEY-OOP SLAM', line: 'Lejohn! Lob it!' },
    super: { move: 'force', name: 'Black Force', desc: 'Unstoppable shockwave punch.' } },
  { id: 'clav', name: 'Clavicular', title: 'The Looksmaxxer', color: '#5ad1ff', inches: 74, kg: 82,
    str: 74, spd: 92, dur: 72, iq: 86, hax: 94, hair: '#120e0c', noPhoto: 1, jaw: 1,
    skin: '#d8a588', shirt: '#17171b', pants: '#30343e', shoes: '#f0f0f0', sleeves: false, tee: 1, shorts: 0.66, socks: '#f2f2f2', chain: '#dcdce6',
    build: { shoulder: 1.1, waist: 0.8, arm: 1.02, armW: 1.05, legW: 1.0, neck: 1.18, mob: 1.08, atk: 1.06, jump: 1.05 },
    quote: 'Mogged.',
    lines: { intro: 'You just got mogged.', super: 'Ascend!' },
    skill: { move: 'stare', name: 'Mog Stare', desc: 'Fires a MOGGED at them that stuns on hit.' },
    fin: { id: 'stone', name: 'MOGGED TO STONE', line: 'Look at me.' },
    super: { move: 'ascend', name: 'Ascension', desc: 'Golden glow-up: faster, and every hit lands harder.' } },
];
// fighters without a photo get a portrait rendered from their 3D model (see render3d)
for (const c of CHARS) c.img = c.noPhoto ? new Image() : img('faces/' + c.id + '.png');
// Lejohn Rames: Frank's alley-oop teammate in the dunk finisher (not a playable fighter)
const MATE = { id: 'mate', name: 'Lejohn Rames', color: '#fdb927', inches: 81, kg: 113, skin: '#7b4a32', hair: '#0e0a08', shirt: '#fdb927', pants: '#552583', shoes: '#f4f4f4', sleeves: false,
  build: { shoulder: 1.35, waist: 0.86, arm: 1.1, armW: 1.35, legW: 1.25, muscle: 1, mob: 1, atk: 1, jump: 1.1 }, lines: {}, str: 90, spd: 90, dur: 90, iq: 90, hax: 90 };

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
  clav: [{ name: 'Classic' }, { name: 'Gold Mog', shirt: '#c9a227', pants: '#24242a', chain: '#ffffff' }],
  frank: [{ name: 'Classic', shirtless: 1, shirt: '#6b4030', sleeves: false },
    { name: 'BP Kings #23', shirt: '#c8102e', pants: '#c8102e', shoes: '#111116', jersey: '23', socks: '#ffffff', headband: '#ffffff', shorts: 0.58, chain: null, shirtless: 1 }],
  mate: [{ name: 'Classic', shirtless: 1, jersey: '23', shirt: '#fdb927', trim: '#552583', num: '#552583', headband: '#ffffff', chain: null, shorts: 0.58, socks: '#ffffff' }],
};
function lookOf(c, skin) { return Object.assign({ shirt: c.shirt, pants: c.pants, shoes: c.shoes, sleeves: c.sleeves, spots: c.spots, chain: c.chain, tee: c.tee, shorts: c.shorts, socks: c.socks }, SKINS[c.id][skin || 0]); }

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
// a long dark reverb shared by the announcer stingers
let REVERB = null;
function reverb() {
  const a = ac(); if (!a) return null;
  if (!REVERB) {
    const len = a.sampleRate * 2.8 | 0, buf = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3); }
    REVERB = a.createConvolver(); REVERB.buffer = buf; const g = a.createGain(); g.gain.value = 0.8; REVERB.connect(g).connect(a.destination);
  }
  return REVERB;
}
// a huge impact: a sub drop and a thunder rumble, partly sent to the reverb
function boom(vol, wet) {
  const a = ac(); if (!a) return; const t = a.currentTime, rv = reverb();
  const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.3);
  g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 1.6);
  const n = a.createBufferSource(), f = a.createBiquadFilter(), g2 = a.createGain(); n.buffer = NOISE; n.loop = true;
  f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(110, t + 1.1);
  g2.gain.setValueAtTime(vol * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 1.2); n.connect(f).connect(g2); g2.connect(a.destination);
  if (rv) { const w = a.createGain(); w.gain.value = wet; g2.connect(w).connect(rv); g.connect(w); }
  n.start(t); n.stop(t + 1.3);
}
// a dark detuned brass / choir chord
function stab(notes, vol, dur) {
  const a = ac(); if (!a) return; const t = a.currentTime, rv = reverb();
  for (const m of notes) for (const det of [-9, 9]) {
    const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(380, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g); g.connect(a.destination); if (rv) g.connect(rv); o.start(t); o.stop(t + dur + 0.05);
  }
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
  // announcer stingers: big sub booms, thunder and a dark brass chord through a long reverb
  ko: () => { boom(1, 1); stab([33, 40, 45, 52], 0.055, 2.6); noise(0.7, 0.45, 260); },
  count: () => { boom(0.55, 0.6); tone(98, 0.45, 'sawtooth', 0.05, 0, 0, 500); },
  finish: () => { boom(0.9, 1); stab([35, 42, 47, 54], 0.05, 2.4); },
  fin: () => { boom(1, 1); stab([31, 38, 43, 50, 55], 0.05, 3.2); noise(0.9, 0.35, 220); },
  // menus: a soft tick to move, a deep hit with a shimmer to confirm, a falling blip to go back, a whoosh between screens
  select: () => { const k = 1 + (rand() - 0.5) * 0.04; tone(1500 * k, 0.035, 'sine', 0.05, 1300 * k); noise(0.012, 0.05, 6500, 0, 'highpass'); },
  confirm: () => { const a = ac(); if (!a) return; const t = a.currentTime;
    tone(150, 0.32, 'sine', 0.32, 55, t); tone(660, 0.22, 'triangle', 0.045, 0, t + 0.01); tone(990, 0.3, 'triangle', 0.03, 0, t + 0.03); tone(1320, 0.4, 'sine', 0.02, 0, t + 0.05);
    noise(0.18, 0.08, 3200, t, 'highpass'); const rv = reverb(); if (rv) { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = 990; g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(rv); o.start(t); o.stop(t + 0.55); } },
  back: () => { tone(620, 0.14, 'sine', 0.06, 300); noise(0.08, 0.04, 1200); },
  toggle: () => { const a = ac(); if (!a) return; const t = a.currentTime; tone(880, 0.045, 'sine', 0.07, 0, t); tone(1320, 0.055, 'sine', 0.06, 0, t + 0.045); },
  swoosh: () => { const a = ac(); if (!a) return; const t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = NOISE;
    f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(3400, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); s.connect(f).connect(g).connect(a.destination); s.start(t, rand()); s.stop(t + 0.32); },
  lock: () => { const a = ac(); if (!a) return; const t = a.currentTime; boom(0.35, 0.5); tone(220, 0.12, 'square', 0.05, 110, t, 1800); noise(0.1, 0.25, 2600, t); tone(1760, 0.25, 'sine', 0.03, 0, t + 0.02); },
  tick: () => { tone(2200, 0.025, 'sine', 0.06); tone(1700, 0.03, 'triangle', 0.03); },
  ready: () => { const a = ac(); if (!a) return; const t = a.currentTime; tone(1320, 0.12, 'sine', 0.045, 0, t); tone(1980, 0.2, 'sine', 0.03, 0, t + 0.06); },
  squareup: () => { boom(0.5, 0.9); stab([28, 35, 40], 0.035, 1.6); },
  fight: () => { boom(0.85, 0.9); stab([38, 45, 50, 57], 0.05, 1.8); },
  dodge: () => tone(900, 0.12, 'sine', 0.08, 1800),
  whistle: () => { const a = ac(); if (!a) return; const t = a.currentTime; tone(2900, 0.18, 'sine', 0.12, 3100, t); tone(2700, 0.32, 'sine', 0.12, 3300, t + 0.2); },
};
let netEvents = [], netFx = [];
// settings persist in this browser
// graphics: quality 0 LOW .. 3 ULTRA, renderer '3d' or '2d', auto = drop quality if the frame rate struggles
const gfx = { quality: 1, renderer: '3d', auto: true, showFps: false };
let voiceChat = 'ptt', dashTap = true; // voice chat: 'off' | 'open' (open mic) | 'ptt' (push to talk)
const EXTRA = { ptt: 'KeyB' };
window.LOAD = { p: 0, msg: 'Loading', done: false };
function saveSettings() {
  try { localStorage.setItem('f1223', JSON.stringify({ difficulty, musicOn, musicPick, voiceOn, gfx, voiceChat, dashTap, keys: { p1: MAP1, p2: MAP2, extra: EXTRA } })); } catch (e) {}
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('f1223') || '{}');
    if (s.difficulty >= 0) difficulty = s.difficulty; if (s.musicOn === false) musicOn = false; if (s.musicPick >= -1 && s.musicPick < 10) musicPick = s.musicPick; if (s.voiceOn === false) voiceOn = false;
    if (s.gfx) Object.assign(gfx, s.gfx);
    if (s.voiceChat) voiceChat = s.voiceChat; if (s.dashTap === false) dashTap = false;
    if (s.keys) { Object.assign(MAP1, s.keys.p1 || {}); Object.assign(MAP2, s.keys.p2 || {}); Object.assign(EXTRA, s.keys.extra || {}); }
  } catch (e) {}
}
const VERSE_IMG = img('bg/verse.jpg');

// voices: the browser's built-in text-to-speech, a different pitch/speed per character (V toggles)
let voiceOn = true, VOICES = [];
const VOICE_CFG = { julian: [1.05, 1.05, 0], ryan: [1.7, 1.18, 1], darren: [0.75, 0.92, 2], blake: [0.5, 0.85, 3], frank: [0.3, 0.8, 4], clav: [0.9, 1.02, 6], announcer: [0.1, 0.62, 5] };
let ANN_VOICE = null; // a deep male voice for the announcer when the system has one
function loadVoices() { try { VOICES = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); ANN_VOICE = VOICES.find(v => /\b(male|daniel|david|fred|alex|george|mark|arthur|ralph|james)\b/i.test(v.name) && !/female/i.test(v.name)) || null; } catch (e) {} }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(who, text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    const [p, r, v] = VOICE_CFG[who] || [1, 1, 0], u = new SpeechSynthesisUtterance(text);
    if (who === 'announcer' && ANN_VOICE) u.voice = ANN_VOICE; else if (VOICES.length) u.voice = VOICES[v % VOICES.length];
    u.pitch = p; u.rate = r; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
function say(who, text) { if (demo) return; speak(who, text); if (net.role === 'host') netEvents.push('v|' + who + '|' + text); }
function sfx(n) { if (demo) return; SOUNDS[n](); if (net.role === 'host') netEvents.push(n); }

// background music lives in music.js; the stages pulse to its tempo
let musicOn = true, musicPick = -1, BPM = 118, BEAT_FRAMES = 3600 / BPM; // musicPick: -1 = a random track every match
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------- input ----------
const KEYS = {};
const MAP1 = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyF', kick: 'KeyG', skill: 'KeyH', super: 'KeyT', env: 'KeyV' };
const MAP2 = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', punch: 'KeyK', kick: 'KeyL', skill: 'KeyJ', super: 'KeyI', env: 'KeyO' };
const DEFAULT_KEYS = { p1: { ...MAP1 }, p2: { ...MAP2 }, extra: { ...EXTRA } };
// readable key names for menus
function keyName(code) {
  if (!code) return '—';
  const m = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Tab: 'TAB', CapsLock: 'CAPS' };
  if (m[code]) return m[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}
const BTN = ['punch', 'kick', 'skill', 'super', 'env'];
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
// X/Square punch · A/Cross kick · Y/Triangle skill · B/Circle or RB super · LB stage item · d-pad/stick move · Start = Enter · Back = Esc
const PAD_BTN = { 2: 'punch', 0: 'kick', 3: 'skill', 1: 'super', 5: 'super', 4: 'env' };
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
