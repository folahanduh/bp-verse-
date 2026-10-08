// ---------- music: ten tense fight tracks and a menu theme, all synthesised live ----------
// Each track is a little score: tempo, key, a chord progression, drum patterns, a bass line, an ostinato and a
// lead that comes in on the second half. A 16-bar loop builds: bars 0-3 are sparse, 4-7 bring the full drums,
// 8-15 add the lead, with a riser into bar 8 and bar 0. Low health makes the drums busier; finishers drop the
// beat to a drone and taiko hits; the pre-fight intro plays a heartbeat and a rising string cluster in the
// fight track's key, so FIGHT! lands on its first downbeat.
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
const TRACKS = [
  { name: 'CONCRETE JUNGLE', gain: 1.35, bpm: 140, root: 50, scale: 'minor', prog: [0, 5, 3, 4],
    k: 'x.....x...x.....', s: '........x.......', h: 'x.x.x.x.x.xxx.x.', bass: { pat: 'x.....x...x.....', kind: '808', len: 3 },
    arp: { pat: 'x..x..x...x..x..', seq: [0, 4, 7, 4, 9, 7], inst: 'pluck', oct: 1 }, pad: 'pad', lead: { inst: 'bell', m: [[0, 7, 4], [4, 6, 4], [8, 4, 6], [14, 2, 2]] } },
  { name: 'IRON WILL', gain: 1.08, bpm: 128, root: 52, scale: 'phryg', prog: [0, 1, 0, 6],
    k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', t: '...............X', bass: { pat: 'x.x.x.x.x.x.x.x.', kind: 'saw', len: 1 },
    arp: { pat: 'xxxxxxxxxxxxxxxx', seq: [0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 4, 3, 1, 0], inst: 'strings', oct: 0 }, pad: 'choir', lead: { inst: 'brass', m: [[0, 4, 6], [6, 5, 2], [8, 1, 8]] } },
  { name: 'BLOOD MOON', gain: 1.0, bpm: 92, root: 49, scale: 'harm', prog: [0, 5, 4, 4],
    k: 'x.......x.......', s: '............x...', h: '....x.......x...', t: 'X.....x.x...X.x.', bass: { pat: 'x.......x.......', kind: 'sub', len: 8 },
    arp: { pat: 'x...x...x...x...', seq: [0, 2, 4, 6], inst: 'bell', oct: 1 }, pad: 'choir', lead: { inst: 'brass', m: [[0, 7, 8], [8, 6, 4], [12, 4, 4]] } },
  { name: 'LAST STAND', gain: 0.75, bpm: 150, root: 45, scale: 'minor', prog: [0, 5, 2, 6],
    k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', t: '............xxXX', bass: { pat: 'x.x.x.x.x.x.x.x.', kind: 'saw', len: 1 },
    arp: { pat: 'xxxxxxxxxxxxxxxx', seq: [0, 2, 4, 2, 0, 2, 4, 7, 0, 2, 4, 2, 0, 2, 4, 6], inst: 'strings', oct: 0 }, pad: 'pad', lead: { inst: 'brass', m: [[0, 4, 3], [3, 5, 1], [4, 7, 4], [8, 6, 4], [12, 4, 4]] } },
  { name: 'NEON PRESSURE', gain: 1.05, bpm: 124, root: 53, scale: 'minor', prog: [0, 5, 6, 4],
    k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', bass: { pat: 'x.x.x.x.x.x.x.x.', kind: 'oct', len: 1 },
    arp: { pat: 'xxxxxxxxxxxxxxxx', seq: [0, 2, 4, 7, 4, 2, 0, 4, 2, 4, 7, 9, 7, 4, 2, 4], inst: 'pluck', oct: 1 }, pad: 'pad', lead: { inst: 'saw', m: [[0, 4, 2], [2, 3, 2], [4, 2, 4], [8, 4, 2], [10, 5, 2], [12, 4, 4]] } },
  { name: 'COLD STEEL', gain: 1.12, bpm: 108, root: 47, scale: 'minor', prog: [0, 0, 6, 5],
    k: 'x..x..x...x..x..', s: '....X.......X...', h: '.x.x.x.x.x.x.x.x', bass: { pat: 'x.xx..x.x.xx..x.', kind: 'grit', len: 1 },
    arp: { pat: 'x.......x...x...', seq: [7, 6, 4], inst: 'bell', oct: 1 }, pad: 'pad', metal: 1, lead: { inst: 'saw', m: [[0, 0, 3], [4, 1, 3], [8, -1, 6]] } },
  { name: 'SHOWDOWN', gain: 0.82, bpm: 136, root: 55, scale: 'minor', prog: [0, 5, 3, 4],
    k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', t: '............x.xX', bass: { pat: 'xxxxxxxxxxxxxxxx', kind: 'pulse', len: 1 },
    arp: { pat: 'x.x.x.x.x.x.x.x.', seq: [0, 4, 2, 4, 0, 4, 3, 4], inst: 'strings', oct: 0 }, pad: 'choir', lead: { inst: 'brass', m: [[0, 4, 4], [4, 3, 4], [8, 2, 4], [12, 1, 4]] } },
  { name: 'NO MERCY', gain: 1.03, bpm: 172, root: 51, scale: 'minor', prog: [0, 0, 5, 6],
    k: 'x.........x.....', s: '....x..x.x..x...', h: 'x.x.x.x.x.x.x.x.', bass: { pat: 'x...............', kind: 'reese', len: 14 },
    arp: { pat: '..x...x...x...x.', seq: [4, 2, 4, 7], inst: 'pluck', oct: 1 }, pad: 'pad', lead: { inst: 'saw', m: [[0, 7, 6], [6, 6, 2], [8, 4, 8]] } },
  { name: 'FINAL ROUND', gain: 1.08, bpm: 118, root: 52, scale: 'minor', prog: [0, 5, 3, 6],
    k: 'x..x............', s: '............x...', h: '....x.......x...', t: '........x.....xX', bass: { pat: 'x.......x.......', kind: 'sub', len: 7 },
    arp: { pat: 'xxxxxxxxxxxxxxxx', seq: [4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 4, 4, 4, 4], inst: 'strings', oct: 0, trem: 1 }, pad: 'choir', lead: { inst: 'brass', m: [[0, 2, 8], [8, 1, 8]] } },
  { name: 'GRAVITY', gain: 1.05, bpm: 132, root: 48, scale: 'minor', prog: [0, 6, 5, 4],
    k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: { pat: '..x...x...x...x.', kind: 'saw', len: 2 },
    arp: { pat: 'x..x..x..x..x.x.', seq: [0, 4, 7, 9, 7, 4], inst: 'bell', oct: 1 }, pad: 'pump', lead: { inst: 'saw', m: [[0, 4, 3], [3, 5, 3], [6, 7, 2], [8, 6, 6], [14, 4, 2]] } },
];
const MENU_TRACK = { name: 'VERSE THEME', bpm: 76, root: 45, scale: 'minor', prog: [0, 5, 3, 4], k: 'x...............', s: '', h: '........x.......', bass: { pat: 'x...............', kind: 'sub', len: 14 },
  arp: { pat: 'x.....x...x.....', seq: [7, 4, 9, 6, 4, 2], inst: 'bell', oct: 1 }, pad: 'pad', lead: null };
const MX = { bus: null, verb: null, mode: '', track: MENU_TRACK, step: 0, t: 0, last: -1, vol: 0, label: null };

function mxInit() {
  const a = ac(); if (!a || MX.bus) return !!MX.bus;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; const pres = a.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2400; pres.gain.value = 4; pres.Q.value = 0.8;
  MX.bus = a.createGain(); MX.bus.gain.value = 0; MX.bus.connect(hp).connect(pres).connect(comp).connect(a.destination);
  const len = a.sampleRate * 2.3 | 0, buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  MX.verb = a.createGain(); const cv = a.createConvolver(); cv.buffer = buf; const wet = a.createGain(); wet.gain.value = 0.55; MX.verb.connect(cv).connect(wet).connect(MX.bus);
  return true;
}
const deg2m = (tr, d, oct) => { const sc = SCALES[tr.scale], n = sc.length, i = ((d % n) + n) % n; return tr.root + 12 * (oct || 0) + sc[i] + 12 * Math.floor(d / n); };
// ----- instruments: each schedules its own nodes at time t into the music bus (and the reverb) -----
function mxOut(node, v, wet) { node.connect(MX.bus); if (wet) { const g = AC.createGain(); g.gain.value = wet; node.connect(g).connect(MX.verb); } }
function mxEnv(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function mxOsc(type, f, t, end, det) { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.start(t); o.stop(end); return o; }
function mxNoise(t, end) { const s = AC.createBufferSource(); s.buffer = NOISE; s.loop = true; s.start(t, rand() * 0.5); s.stop(end); return s; }
const INST = {
  kick(t, v) { const o = mxOsc('sine', 160, t, t + 0.45), g = AC.createGain(); o.frequency.exponentialRampToValueAtTime(46, t + 0.12); mxEnv(g, t, 0.003, v * 0.6, 0.32); o.connect(g); mxOut(g);
    const kn = mxOsc('triangle', 240, t, t + 0.1), gk = AC.createGain(); kn.frequency.exponentialRampToValueAtTime(110, t + 0.05); mxEnv(gk, t, 0.001, v * 0.35, 0.06); kn.connect(gk); mxOut(gk);
    const n = mxNoise(t, t + 0.03), f = AC.createBiquadFilter(), g2 = AC.createGain(); f.type = 'highpass'; f.frequency.value = 2500; mxEnv(g2, t, 0.001, v * 0.25, 0.02); n.connect(f).connect(g2); mxOut(g2); },
  snare(t, v, metal) { const n = mxNoise(t, t + 0.3), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.frequency.value = metal ? 3400 : 2100; f.Q.value = metal ? 3 : 0.6; mxEnv(g, t, 0.002, v * 1.3, 0.2); n.connect(f).connect(g); mxOut(g, 0, 0.35);
    const o = mxOsc(metal ? 'square' : 'triangle', metal ? 540 : 210, t, t + 0.15), g2 = AC.createGain(); o.frequency.exponentialRampToValueAtTime(metal ? 380 : 150, t + 0.1); mxEnv(g2, t, 0.002, v * 0.35, 0.1); o.connect(g2); mxOut(g2, 0, 0.2); },
  hat(t, v, open) { const n = mxNoise(t, t + 0.3), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'highpass'; f.frequency.value = 6800; mxEnv(g, t, 0.001, v * 0.8, open ? 0.2 : 0.045); n.connect(f).connect(g); mxOut(g); },
  taiko(t, v, f0) { const f = f0 || 72, o = mxOsc('sine', f * 1.7, t, t + 0.9), g = AC.createGain(); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); mxEnv(g, t, 0.004, v, 0.75); o.connect(g); mxOut(g, 0, 0.5);
    const n = mxNoise(t, t + 0.2), lp = AC.createBiquadFilter(), g2 = AC.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1100; mxEnv(g2, t, 0.002, v * 0.7, 0.16); n.connect(lp).connect(g2); mxOut(g2, 0, 0.4); },
  bass(t, m, dur, v, kind) {
    const f = mtof(m), end = t + dur + 0.1, g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass';
    if (kind === 'sub' || kind === '808') { const o = mxOsc('sine', kind === '808' ? f * 1.5 : f, t, end); if (kind === '808') o.frequency.exponentialRampToValueAtTime(f, t + 0.06); lp.frequency.value = 400; o.connect(lp);
      if (kind === '808') { const o2 = mxOsc('triangle', f * 2, t, end), g3 = AC.createGain(); g3.gain.value = 0.25; o2.connect(g3).connect(lp); } }
    else if (kind === 'reese') { for (const d of [-16, 16]) mxOsc('sawtooth', f, t, end, d).connect(lp); lp.frequency.setValueAtTime(260, t); lp.frequency.linearRampToValueAtTime(900, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(300, t + dur); }
    else if (kind === 'grit') { mxOsc('square', f, t, end).connect(lp); mxOsc('sawtooth', f * 0.5, t, end, 5).connect(lp); lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + dur); lp.Q.value = 6; }
    else if (kind === 'oct') { mxOsc('sawtooth', f, t, end).connect(lp); mxOsc('sawtooth', f * 2, t, end, 7).connect(lp); lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur); }
    else { for (const d of [-6, 6]) mxOsc(kind === 'pulse' ? 'square' : 'sawtooth', f, t, end, d).connect(lp); lp.frequency.setValueAtTime(kind === 'pulse' ? 1400 : 2400, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur); }
    if (kind === 'sub' || kind === '808') { const o3 = mxOsc('sawtooth', f * 2, t, end), lp3 = AC.createBiquadFilter(), g3 = AC.createGain(); lp3.type = 'lowpass'; lp3.frequency.value = 900; g3.gain.value = 0.3; o3.connect(lp3).connect(g3).connect(g); }
    mxEnv(g, t, 0.005, v * 0.75, dur + 0.05); lp.connect(g); mxOut(g);
  },
  pluck(t, m, v) { const f = mtof(m), g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    mxOsc('sawtooth', f, t, t + 0.4, -5).connect(lp); mxOsc('triangle', f * 2, t, t + 0.4).connect(lp); mxEnv(g, t, 0.003, v, 0.3); lp.connect(g); mxOut(g, 0, 0.35); },
  bell(t, m, v) { const f = mtof(m), g = AC.createGain(), g2 = AC.createGain(); mxOsc('sine', f, t, t + 1.8).connect(g); mxOsc('sine', f * 2.76, t, t + 0.8).connect(g2); g2.gain.value = 0.3; g2.connect(g);
    const out = AC.createGain(); mxEnv(out, t, 0.004, v, 1.6); g.connect(out); mxOut(out, 0, 0.55); },
  strings(t, m, dur, v) { const f = mtof(m), g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    for (const d of [-11, 0, 11]) mxOsc('sawtooth', f, t, t + dur + 0.2, d).connect(lp); mxEnv(g, t, 0.012, v, dur); lp.connect(g); mxOut(g, 0, 0.3); },
  pad(t, ms, dur, v, kind) { // pad / choir / pump (a pad that ducks on every beat)
    const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = kind === 'choir' ? 'bandpass' : 'lowpass'; lp.frequency.value = kind === 'choir' ? 900 : 1700; lp.Q.value = kind === 'choir' ? 1.2 : 0.5;
    for (const m of ms) for (const d of [-8, 8]) mxOsc(kind === 'choir' ? 'sawtooth' : 'sawtooth', mtof(m), t, t + dur + 1.2, d).connect(lp);
    if (kind === 'pump') { const b = 60 / MX.track.bpm; g.gain.setValueAtTime(0.0001, t); for (let q = 0; q < dur / b; q++) { g.gain.setValueAtTime(0.0001, t + q * b); g.gain.linearRampToValueAtTime(v, t + q * b + b * 0.6); } g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2); }
    else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.7, dur * 0.3)); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.0); }
    lp.connect(g); mxOut(g, 0, 0.6);
  },
  brass(t, ms, dur, v) { const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.12); lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    for (const m of [].concat(ms)) for (const d of [-7, 7]) mxOsc('sawtooth', mtof(m), t, t + dur + 0.4, d).connect(lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.09); g.gain.setValueAtTime(v * 0.8, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35); lp.connect(g); mxOut(g, 0, 0.45); },
  saw(t, m, dur, v) { const f = mtof(m), g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 2;
    for (const d of [-9, 9]) mxOsc('sawtooth', f, t, t + dur + 0.3, d).connect(lp); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v * 0.85, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25); lp.connect(g); mxOut(g, 0, 0.4); },
  riser(t, dur, v) { const n = mxNoise(t, t + dur + 0.05), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04); n.connect(f).connect(g); mxOut(g, 0, 0.5); },
  impact(t, v) { const o = mxOsc('sine', 100, t, t + 1.6), g = AC.createGain(); o.frequency.exponentialRampToValueAtTime(32, t + 1.2); mxEnv(g, t, 0.003, v, 1.4); o.connect(g); mxOut(g, 0, 0.6);
    const n = mxNoise(t, t + 1.2), lp = AC.createBiquadFilter(), g2 = AC.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2000, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1); mxEnv(g2, t, 0.002, v * 0.6, 1.1); n.connect(lp).connect(g2); mxOut(g2, 0, 0.7); },
  heart(t, v) { for (const [dt, k] of [[0, 1], [0.2, 0.7]]) { const o = mxOsc('sine', 62, t + dt, t + dt + 0.3), g = AC.createGain(); o.frequency.exponentialRampToValueAtTime(40, t + dt + 0.12); mxEnv(g, t + dt, 0.004, v * k, 0.2); o.connect(g); mxOut(g, 0, 0.2); } },
  drone(t, m, dur, v) { const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    for (const [mm, d] of [[m, -6], [m, 6], [m + 7, 0], [m - 12, 0]]) mxOsc('sawtooth', mtof(mm), t, t + dur + 0.6, d).connect(lp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.4); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5); lp.connect(g); mxOut(g, 0, 0.5); },
};
const hitAt = (pat, i) => pat && pat.length ? pat[i % pat.length] : '.';

// what should be playing right now (worked out from the game state, so it is right on an online guest too)
function mxWanted() {
  if (screen !== 'fight' || demo || !P.length) return 'menu';
  if (matchOver || endT > 0) return 'outro';
  if (introT > 56 && mode !== 'training') return 'intro';
  if (cine && cine.kind === 'fin') return 'fin';
  return 'fight';
}
function pickTrack() {
  if (musicPick >= 0) return TRACKS[musicPick % TRACKS.length];
  let i; do { i = rand() * TRACKS.length | 0; } while (TRACKS.length > 1 && i === MX.last);
  MX.last = i; return TRACKS[i];
}
function musicTick() {
  if (!AC || AC.state !== 'running' || !mxInit()) return;
  const now = AC.currentTime, want = musicOn ? mxWanted() : 'off';
  if (want !== MX.mode) {
    const was = MX.mode; MX.mode = want;
    if (want === 'menu') { MX.track = MENU_TRACK; MX.step = 0; MX.t = now + 0.05; }
    if (want === 'intro' || (want === 'fight' && was !== 'fin' && was !== 'intro')) { if (was === 'menu' || was === 'off' || was === 'outro' || was === '') { MX.track = pickTrack(); } }
    if (want === 'intro') { MX.step = 0; MX.t = now + 0.05; MX.introStart = now; MX.introEnd = now + Math.max(1, introRealLeft()) / 60; MX.rose = false; }
    if (want === 'fight' && was !== 'fin') { MX.step = 0; MX.t = now + 0.03; INST.impact(MX.t, 0.5); MX.label = { name: MX.track.name, t: 210 }; }
    if (want === 'fight' && was === 'fin') { MX.t = Math.max(MX.t, now + 0.03); }
    if (want === 'outro') { MX.step = 0; MX.t = now + 0.05; }
    BPM = MX.track.bpm; BEAT_FRAMES = 3600 / BPM;
  }
  // master level: quieter in menus, ducked while paused, gone when switched off
  const target = (want === 'off' ? 0 : paused ? 0.12 : want === 'menu' ? 0.32 : want === 'outro' ? 0.3 : 0.42) * (want === 'menu' ? 1 : MX.track.gain || 1); // tracks are level-matched
  if (Math.abs(target - MX.vol) > 0.001) { MX.vol = target; MX.bus.gain.setTargetAtTime(target, now, 0.25); }
  if (want === 'off') return;
  const spb = 60 / MX.track.bpm / 4;
  if (MX.t < now) MX.t = now + 0.03;
  while (MX.t < now + 0.14) { mxStep(MX.track, MX.step, MX.t, spb, want); MX.t += spb; MX.step++; }
}
function mxStep(tr, n, t, spb, mode2) {
  const i = n % 16, bar = Math.floor(n / 16), b16 = bar % 16, chordDeg = tr.prog[bar % tr.prog.length], barLen = spb * 16;
  const chord = [0, 2, 4].map(o => deg2m(tr, chordDeg + o, 0));
  if (mode2 === 'intro') { // heartbeat speeding up, a drone in the track's key, strings rising, a riser into FIGHT!
    const el = t - MX.introStart, beatEvery = Math.max(4, 10 - Math.floor(el / 0.9));
    if (n % beatEvery === 0) INST.heart(t, 0.55);
    if (n % 32 === 0) INST.drone(t, tr.root - 12, barLen * 2, 0.07);
    if (n % 2 === 0 && el > 1.2) INST.strings(t, deg2m(tr, (n >> 3) % 2 ? 1 : 0, 1), spb * 1.6, Math.min(0.11, 0.015 + el * 0.02));
    if (!MX.rose && t > MX.introEnd - 2.2) { MX.rose = true; INST.riser(t, Math.max(0.5, MX.introEnd - t), 0.13); } // lands on FIGHT!
    return;
  }
  if (mode2 === 'fin') { // the beat drops out: a drone and slow taiko hits
    if (n % 32 === 0) INST.drone(t, tr.root - 12, barLen * 2, 0.08);
    if (i === 0 || i === 10) INST.taiko(t, 0.5, 60);
    return;
  }
  if (mode2 === 'outro') { if (n === 0) { INST.pad(t, chord.map(m => m - 12), barLen * 3, 0.05, 'pad'); INST.bell(t + spb * 4, deg2m(tr, 7, 1), 0.08); } return; }
  const menu = tr === MENU_TRACK, full = menu || b16 >= 4, B = !menu && b16 >= 8;
  const hot = !menu && P.some(f => f.hp > 0 && f.hp < f.maxHp * 0.3) ? 1 : 0; // someone is nearly out: busier drums
  // drums
  const k = hitAt(tr.k, i); if (k !== '.' && (full || i === 0)) INST.kick(t, (k === 'X' ? 0.95 : 0.8) * (menu ? 0.5 : 1));
  const s = hitAt(tr.s, i); if (s !== '.' && full) INST.snare(t, s === 'X' ? 0.55 : 0.42, tr.metal);
  const h = hitAt(tr.h, i); if ((h !== '.' && (full || i % 4 === 2)) || (hot && i % 2 === 1)) INST.hat(t, (h === '.' ? 0.18 : 0.26) * (menu ? 0.6 : 1), h === 'o');
  const tk = hitAt(tr.t, i); if (tk !== '.' && (B || bar % 4 === 3 || hot)) INST.taiko(t, tk === 'X' ? 0.75 : 0.5, tk === 'X' ? 66 : 84);
  if (hot && i === 14 && bar % 2 === 1) INST.taiko(t, 0.55, 90);
  // bass
  const bs = tr.bass, bh = hitAt(bs.pat, i);
  if (bh !== '.') INST.bass(t, deg2m(tr, chordDeg, -2) + (bs.kind === 'oct' && i % 4 === 2 ? 12 : 0), spb * (bs.len || 1) * 0.95, menu ? 0.16 : 0.22, bs.kind);
  // ostinato / arpeggio
  const ar = tr.arp, ah = hitAt(ar.pat, i);
  if (ah !== '.' && (full || b16 >= 2)) {
    const d = ar.seq[i % ar.seq.length] + chordDeg, m = deg2m(tr, d, ar.oct);
    if (ar.inst === 'strings') INST.strings(t, m, spb * (ar.trem ? 0.9 : 0.7), 0.1);
    else INST[ar.inst](t, m, ar.inst === 'bell' ? 0.13 : 0.13);
  }
  // pads: a chord per bar (two bars for the menu)
  if (i === 0 && (!menu || bar % 2 === 0)) INST.pad(t, chord, barLen * (menu ? 2 : 1) * 0.95, menu ? 0.07 : 0.06, tr.pad === 'pump' ? 'pump' : tr.pad);
  // lead on the second half of the loop
  if (B && tr.lead && bar % 2 === 0) for (const [st, d, len] of tr.lead.m) if (st === i) { // a phrase every other bar
    const m = deg2m(tr, d, 1);
    if (tr.lead.inst === 'brass') INST.brass(t, [m, m - 12], spb * len, 0.09); else if (tr.lead.inst === 'bell') INST.bell(t, m + 12, 0.14); else INST.saw(t, m, spb * len, 0.075);
  }
  // risers into bar 8 and back to the top; an impact on the downbeats they lead into
  if (!menu && (b16 === 7 || b16 === 15) && i === 0) INST.riser(t, barLen, 0.16);
  if (!menu && (b16 === 8 || (b16 === 0 && bar > 0)) && i === 0) INST.impact(t, 0.35);
}
// the "now playing" card in the corner when a fight track starts
function drawNowPlaying() {
  const L = MX.label; if (!L || L.t <= 0 || !musicOn) return; L.t--;
  const a = Math.min(1, (210 - L.t) / 20, L.t / 30);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `500 11px ${HEAD}`; tracked(4); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('NOW PLAYING', W / 2, H - 58);
  ctx.font = `600 15px ${HEAD}`; tracked(5); ctx.fillStyle = '#fff'; ctx.fillText('♪  ' + L.name, W / 2, H - 40); ctx.restore();
}
