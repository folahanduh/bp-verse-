// ---------- every fighter moves their own way ----------
// Each fighter has a stance (what every attack starts from and settles back into), an idle motion, a walk, a
// "bored" idle they drift into when the opponent is far away, and three versions of every punch, kick and grab.
// A random version is picked each time a move starts. Hit timing and reach never change: this is all looks.
// Poses are partial: anything a version doesn't set comes from the move, then from the fighter's stance.

// ---- the building blocks: shapes many fighters share ----
const SHAPES = {
  // punches
  straight: { hit: { fu: 1.55, fl: 1.57, lean: 0.22, tw: 0.4, lunge: 0.06 } },
  palm: { wind: { fu: 0.8, fl: 2.1 }, hit: { fu: 1.58, fl: 1.46, lean: 0.24, ht: 0.02, tw: 0.35, lunge: 0.06 } },
  spear: { wind: { fu: 0.6, fl: 1.5, lean: 0 }, hit: { fu: 1.55, fl: 1.55, lean: 0.34, lunge: 0.1, ht: 0.08, tw: 0.25 } },
  backfist: { wind: { fu: 0.4, fl: 2.9, hz: 0.9, tw: -0.5 }, hit: { fu: 1.62, fl: 1.72, hz: -0.15, tw: 0.3, lean: 0.18, lunge: 0.04 } },
  flick: { wind: { fu: 0.9, fl: 2.3 }, hit: { fu: 1.6, fl: 1.62, lean: 0.12, tw: 0.25, lunge: 0.03 } },
  poke: { wind: { fu: 1.0, fl: 2.2, ht: 0.05 }, hit: { fu: 1.62, fl: 1.64, lean: 0.2, ht: 0.12, tw: 0.3, lunge: 0.05 } },
  slap: { wind: { fu: 1.0, fl: 2.2, hz: -0.4, tw: -0.45, spread: 0.3 }, hit: { fu: 1.45, fl: 1.35, hz: 0.9, tw: 0.6, lean: 0.2 } },
  hammer: { wind: { fu: 2.9, fl: 3.25, lean: -0.1, crouch: 0.02 }, hit: { fu: 1.35, fl: 0.95, lean: 0.42, crouch: 0.14, tw: 0.3, lunge: 0.06 } },
  overhand: { wind: { fu: 2.75, fl: 3.4, lean: -0.12, tw: -0.55, ht: 0.1 }, hit: { fu: 1.25, fl: 0.95, lean: 0.52, tw: 0.65, lunge: 0.08, ht: 0.3 } },
  wild: { wind: { fu: 0.2, fl: 0.8, tw: -0.8, spread: 0.5 }, hit: { fu: 1.5, fl: 1.6, hz: 1.1, tw: 0.9, lean: 0.4, lunge: 0.06 } },
  bellybump: { wind: { lean: -0.35, fu: -0.3, fl: 0.3, bu: -0.3, bl: 0.3, crouch: 0.08 }, hit: { lean: 0.5, fu: -0.5, fl: 0.2, bu: -0.5, bl: 0.2, lunge: 0.14, spread: 0.6 } },
  power: { wind: { fu: 0.4, fl: 2.0, lean: -0.08, tw: -0.6, crouch: 0.12 }, hit: { fu: 1.55, fl: 1.56, lean: 0.38, tw: 0.75, lunge: 0.1, crouch: 0.08 } },
  doubletap: { wind: { fu: 1.2, fl: 1.9 }, hit: { fu: 1.62, fl: 1.6, lean: 0.16, tw: 0.2, ht: 0.05 } },
  hopjab: { wind: { crouch: 0.32, fu: 0.7, fl: 2.4 }, hit: { crouch: -0.04, fu: 1.7, fl: 1.75, lean: 0.12, ht: -0.05, lunge: 0.08 } },
  // rear hand
  cross: { hit: { bu: 1.55, bl: 1.57, fu: 0.3, fl: 2.4, tw: -0.65, lean: 0.32, lunge: 0.08 } },
  rearpalm: { hit: { bu: 1.58, bl: 1.48, fu: 0.4, fl: 1.8, tw: -0.5, lean: 0.28, lunge: 0.07 } },
  elbow: { wind: { bu: 0.4, bl: 2.4, tw: 0.3 }, hit: { bu: 1.7, bl: 3.1, tw: -0.8, lunge: 0.08, lean: 0.25 } },
  doublepalm: { wind: { fu: 0.6, fl: 1.6, bu: 0.6, bl: 1.6, crouch: 0.12 }, hit: { fu: 1.55, fl: 1.5, bu: 1.5, bl: 1.45, lean: 0.32, lunge: 0.09 } },
  rearoverhand: { wind: { bu: 2.75, bl: 3.4, lean: -0.12, tw: 0.55 }, hit: { bu: 1.25, bl: 0.95, lean: 0.52, tw: -0.65, lunge: 0.08, ht: 0.3 } },
  doubleaxe: { wind: { fu: 2.85, fl: 3.3, bu: 2.85, bl: 3.3, lean: -0.15 }, hit: { fu: 1.4, fl: 1.0, bu: 1.4, bl: 1.0, lean: 0.5, crouch: 0.12, lunge: 0.06 } },
  rearslap: { wind: { bu: 1.0, bl: 2.2, tw: 0.45 }, hit: { bu: 1.45, bl: 1.35, hzb: 0.9, tw: -0.6, lean: 0.2 } },
  // hooks
  whiphook: { hit: { fu: 1.55, fl: 1.75, hz: 1.1, tw: 0.85, lean: 0.34 } },
  spinfist: { wind: { tw: -1.0, fu: 0.3, fl: 2.6, hz: 0.9, lean: -0.05 }, hit: { tw: 0.95, fu: 1.6, fl: 1.7, hz: 0.4, lean: 0.2 } },
  ridge: { wind: { fu: 0.2, fl: 0.4, tw: -0.6 }, hit: { fu: 1.5, fl: 1.5, hz: 0.9, tw: 0.9, lean: 0.3 } },
  haymaker: { wind: { fu: 0.1, fl: 0.6, tw: -0.95, lean: -0.15, crouch: 0.16, spread: 0.4 }, hit: { fu: 1.5, fl: 1.65, hz: 1.2, tw: 1.0, lean: 0.48, lunge: 0.1 } },
  clothesline: { wind: { fu: 1.2, fl: 1.2, spread: 0.8, tw: -0.6 }, hit: { fu: 1.55, fl: 1.55, spread: 0.8, tw: 1.05, lean: 0.3, lunge: 0.12 } },
  forearm: { wind: { fu: 1.4, fl: 2.9, tw: -0.6 }, hit: { fu: 1.5, fl: 2.4, hz: 0.6, tw: 0.8, lean: 0.4, lunge: 0.1 } },
  shorthook: { wind: { fu: 0.7, fl: 1.9, tw: -0.35 }, hit: { fu: 1.45, fl: 1.95, hz: 0.9, tw: 0.6, lean: 0.24 } },
  // uppercuts
  risepalm: { hit: { fu: 2.55, fl: 2.75, ht: -0.25 } },
  waveupper: { wind: { crouch: 0.5, fu: -0.2, fl: 0.6 }, hit: { fu: 2.7, fl: 3.0, crouch: -0.06, lean: -0.2, ht: -0.25 } },
  crane: { hit: { fu: 2.3, fl: 3.3, bu: -0.6, bl: 0.3, ft: 0.9, fs: 0.1, lean: -0.15 } },
  jumpupper: { wind: { crouch: 0.55, fu: 0.1, fl: 0.9, lean: 0.2 }, hit: { crouch: -0.12, fu: 2.85, fl: 3.05, lean: -0.28, ht: -0.3, ft: 0.6, fs: 0.2 } },
  corkscrew: { wind: { crouch: 0.35, tw: -0.8 }, hit: { fu: 2.4, fl: 2.8, tw: 0.9, ht: -0.15 } },
  risingknee: { wind: { crouch: 0.3 }, hit: { ft: 2.0, fs: 0.2, fu: 0.9, fl: 2.4, bu: 0.5, bl: 2.2, lean: -0.05 } },
  chincheck: { wind: { fu: 0.3, fl: 1.2, crouch: 0.15 }, hit: { fu: 2.2, fl: 2.5, lean: 0.05, ht: -0.25, tw: 0.4 } },
  shovel: { wind: { fu: -0.4, fl: 0.4, crouch: 0.3, lean: 0.2 }, hit: { fu: 2.1, fl: 2.4, lean: 0.25, crouch: 0.1, tw: 0.5 } },
  headbutt: { wind: { lean: -0.3, ht: -0.4 }, hit: { lean: 0.62, ht: 0.55, fu: 0.6, fl: 1.4, bu: 0.6, bl: 1.4, lunge: 0.12 } },
  doubleupper: { wind: { crouch: 0.42, fu: 0.0, fl: 0.6, bu: 0.0, bl: 0.6 }, hit: { fu: 2.6, fl: 2.9, bu: 2.5, bl: 2.85, ht: -0.2, lean: -0.1 } },
  risingelbow: { hit: { fu: 2.5, fl: 3.5, tw: 0.6, ht: -0.2 } },
  // to the body
  gutpalm: { hit: { fu: 1.2, fl: 1.4, crouch: 0.3, lean: 0.42 } },
  liver: { wind: { fu: 0.1, fl: 1.0, tw: -0.6, crouch: 0.22 }, hit: { fu: 1.1, fl: 1.7, hz: 0.9, crouch: 0.3, tw: 0.7, lean: 0.38 } },
  knee: { wind: { ft: 0.8, fs: 0.1 }, hit: { ft: 1.9, fs: 0.2, fu: 1.0, fl: 1.8, bu: 0.9, bl: 1.8, lean: 0.15, lunge: 0.06 } },
  shoulder: { wind: { lean: 0.1, crouch: 0.25, tw: -0.4 }, hit: { lean: 0.62, crouch: 0.2, fu: 0.6, fl: 1.8, tw: 0.3, lunge: 0.15 } },
  gutpunch: { hit: { fu: 1.15, fl: 1.65, crouch: 0.26, lean: 0.44, tw: 0.55 } },
  // kicks
  snap: {},
  crescent: { wind: { ft: 1.9, fs: 1.0, spread: 0.3 }, hit: { ft: 1.6, fs: 1.7, tw: 0.5, spread: 0.1, lean: -0.3 } },
  push: { wind: { ft: 1.85, fs: 0.3 }, hit: { ft: 1.45, fs: 1.42, lean: -0.32, lunge: 0.06 } },
  side: { wind: { ft: 1.8, fs: 0.25, tw: 0.4 }, hit: { ft: 1.55, fs: 1.6, tw: 0.75, lean: -0.5, lunge: 0.05 } },
  stomp: { wind: { ft: 1.4, fs: 0.2, lean: 0.05 }, hit: { ft: 0.8, fs: 0.5, lean: 0.3, crouch: 0.12 } },
  bigboot: { wind: { ft: 1.9, fs: 0.4, lean: -0.15 }, hit: { ft: 1.65, fs: 1.72, lean: -0.42, lunge: 0.07 } },
  toepoke: { wind: { ft: 1.3, fs: 0.3 }, hit: { ft: 1.2, fs: 1.3, lean: -0.15, lunge: 0.05 } },
  jumpknee: { wind: { crouch: 0.3, ft: 0.9 }, hit: { ft: 2.1, fs: 0.3, crouch: -0.08, fu: 1.6, fl: 2.4, bu: 1.4, bl: 2.4, lean: 0.1, lunge: 0.08 } },
  lowkick: { hit: { ft: 0.95, fs: 1.05, lean: -0.15, tw: 0.4 } },
  // round kicks
  headkick: {},
  axe: { wind: { ft: 2.7, fs: 2.7, lean: -0.4, fu: 0.9, fl: 2.4 }, hit: { ft: 1.6, fs: 1.6, lean: 0.1, fu: 0.5, fl: 1.6 } },
  spinhook: { wind: { tw: -1.0, ft: 0.8, fs: 0.3, lean: -0.2 }, hit: { tw: 1.0, ft: 2.0, fs: 2.1, lean: -0.55, fu: 0.6, fl: 1.3 } },
  tornado: { wind: { crouch: 0.35, tw: -1.0 }, hit: { tw: 1.1, ft: 2.1, fs: 2.2, lean: -0.5, crouch: -0.05, bt: 0.4, bs: -0.4 } },
  spinback: { wind: { tw: -1.1, lean: 0.1 }, hit: { tw: -0.4, ft: 1.6, fs: 1.65, lean: -0.6, fu: 0.4, fl: 1.6 } },
  sloppy: { wind: { ft: 1.1, fs: 0.2, lean: -0.15 }, hit: { ft: 1.7, fs: 1.8, lean: -0.3, tw: 0.8, spread: 0.3 } },
  heel: { wind: { tw: -1.05, ft: 1.0 }, hit: { tw: 1.0, ft: 1.95, fs: 2.0, lean: -0.45, ht: -0.15 } },
  // sweeps
  lowspin: {},
  capoeira: { wind: { crouch: 0.6, lean: 0.5, fu: 1.0, fl: 0.4, bu: 0.9, bl: 0.4 }, hit: { crouch: 0.62, lean: 0.55, ft: 1.45, fs: 1.6, fu: 1.6, fl: 0.8, bu: 1.5, bl: 0.7, tw: 0.7 } },
  slide: { wind: { crouch: 0.4, lean: -0.2 }, hit: { crouch: 0.45, lean: -0.6, ft: 1.1, fs: 1.2, bt: -0.2, bs: -1.2, fu: 0.9, fl: 1.4, lunge: 0.12 } },
  trip: { wind: { crouch: 0.25 }, hit: { crouch: 0.3, ft: 1.0, fs: 1.2, lean: 0.1, tw: 0.4 } },
  lowside: { wind: { crouch: 0.35, ft: 1.2, fs: 0.2 }, hit: { crouch: 0.4, ft: 1.25, fs: 1.3, lean: -0.3, tw: 0.6 } },
  buttdrop: { wind: { crouch: 0.2, lean: -0.1 }, hit: { crouch: 0.65, lean: -0.25, ft: 1.2, fs: 1.3, fu: 0.8, fl: 1.2, bu: 0.8, bl: 1.2 } },
  // in the air
  flyside: { hit: { ft: 1.4, fs: 1.45, bt: -0.3, bs: -1.0, lean: -0.35, tw: 0.6 } },
  flyknee: { hit: { ft: 2.1, fs: 0.2, bt: -0.2, bs: -0.8, fu: 1.4, fl: 2.4, bu: 1.4, bl: 2.4 } },
  dropkick: { hit: { ft: 1.5, fs: 1.5, bt: 1.3, bs: 1.4, lean: -0.45, fu: 2.4, fl: 2.8, bu: 2.2, bl: 2.6 } },
  scissor: { hit: { ft: 1.6, fs: 1.6, bt: 1.2, bs: 1.3, lean: -0.3, tw: 0.4 } },
  airstomp: { hit: { ft: 0.6, fs: 0.4, bt: 0.3, bs: -0.5, lean: 0.2, fu: 2.3, fl: 2.8 } },
  // grabs
  twohand: {},
  wrist: { hit: { fu: 1.5, fl: 1.55, bu: 0.3, bl: 0.8, tw: 0.35 } },
  collar: { wind: { fu: 1.3, fl: 2.2 }, hit: { fu: 1.75, fl: 1.95, bu: 0.2, bl: 0.6, lean: 0.25 } },
  dive: { wind: { crouch: 0.45, lean: 0.4 }, hit: { crouch: 0.55, lean: 0.6, fu: 1.1, fl: 1.0, bu: 1.0, bl: 0.9, lunge: 0.12 } },
  neck: { hit: { fu: 1.9, fl: 1.95, bu: 1.7, bl: 1.9, lean: 0.3 } },
  bearhug: { hit: { fu: 1.4, fl: 2.2, bu: 1.4, bl: 2.2, spread: 0.55, lean: 0.35 } },
};
// a pose made of building blocks plus a few tweaks of its own
const VAR = (base, wind, hit) => ({ wind: Object.assign({}, (SHAPES[base] || {}).wind, wind), hit: Object.assign({}, (SHAPES[base] || {}).hit, hit) });

const STYLE = {
  // the flow: loose and low, open front hand, everything rolls into the next thing
  julian: {
    stance: { lean: 0.02, crouch: 0.12, fu: 0.8, fl: 1.9, bu: 0.25, bl: 2.35, spread: 0.12, ft: 0.34, fs: 0.06, bt: -0.28, bs: -0.34, ht: -0.04 },
    idle: (p, t) => { p.tw += Math.sin(t / 26) * 0.14; p.fu += Math.sin(t / 26) * 0.1; p.fl += Math.sin(t / 13) * 0.1; p.crouch += Math.sin(t / 18) * 0.02; },
    walk: { stride: 0.36, bob: 0.015, arms: 0.15, lean: 0.02 },
    bored: { after: 170, pose: t => ({ fu: 1.0 + Math.sin(t / 30) * 0.3, fl: 1.5 + Math.sin(t / 30) * 0.3, bu: 0.9 - Math.sin(t / 30) * 0.3, bl: 1.4, spread: 0.45, crouch: 0.18, lean: -0.02, ht: -0.08 }) }, // tai chi
    moves: {
      jab: [VAR('palm'), VAR('backfist'), VAR('spear')], jab2: [VAR('rearpalm'), VAR('elbow'), VAR('doublepalm')], hook: [VAR('spinfist'), VAR('whiphook'), VAR('ridge')],
      upper: [VAR('risepalm'), VAR('waveupper'), VAR('crane')], bodyhook: [VAR('gutpalm'), VAR('liver'), VAR('knee')], kick: [VAR('snap'), VAR('crescent'), VAR('push')],
      round: [VAR('headkick'), VAR('axe'), VAR('spinhook')], sweep: [VAR('lowspin'), VAR('capoeira'), VAR('trip')], akick: [VAR('flyside'), VAR('scissor'), VAR('flyknee')], grab: [VAR('wrist'), VAR('twohand'), VAR('collar')],
    },
  },
  // tiny and hyper: bouncing on his toes, hands high, everything is a jump
  ryan: {
    stance: { lean: 0.12, crouch: 0.16, fu: 0.55, fl: 2.75, bu: 0.35, bl: 2.85, ht: 0.06, ft: 0.36, bt: -0.3, spread: 0.05 },
    idle: (p, t) => { const h = Math.abs(Math.sin(t / 7)); p.crouch += h * 0.08 - 0.04; p.fl += Math.sin(t / 7) * 0.1; p.bl -= Math.sin(t / 7) * 0.1; },
    walk: { stride: 0.5, bob: 0.04, arms: 0.25, lean: 0.06 },
    bored: { after: 140, pose: t => { const s = Math.sin(t / 3.2); return { fu: 1.25 + s * 0.35, fl: 1.75 + s * 0.3, bu: 1.2 - s * 0.35, bl: 1.7 - s * 0.3, lean: 0.15, crouch: 0.15 + Math.abs(s) * 0.05, tw: s * 0.3 }; } }, // shadowboxing
    moves: {
      jab: [VAR('flick'), VAR('hopjab'), VAR('doubletap')], jab2: [VAR('cross'), VAR('rearoverhand', {}, { ht: 0.1 }), VAR('cross', { crouch: 0.3 }, { crouch: -0.05, lunge: 0.12 })],
      hook: [VAR('whiphook', {}, { lunge: 0.12 }), VAR('spinfist'), VAR('wild')], upper: [VAR('jumpupper'), VAR('corkscrew'), VAR('risingknee')],
      thrust: [VAR('snap'), VAR('snap', { tw: -0.4 }, { tw: 0.5, lean: -0.5 }), VAR('snap', { crouch: 0.4 }, { crouch: 0.15, lean: -0.3, lunge: 0.06 })],
      bodyhook: [VAR('gutpunch'), VAR('liver'), VAR('knee')], kick: [VAR('snap'), VAR('jumpknee'), VAR('toepoke')], round: [VAR('tornado'), VAR('headkick'), VAR('spinhook')],
      sweep: [VAR('slide'), VAR('lowspin'), VAR('lowkick')], akick: [VAR('flyside'), VAR('dropkick'), VAR('flyknee')], grab: [VAR('dive'), VAR('twohand'), VAR('wrist')],
    },
  },
  // the mind: calm and upright, back hand hanging low, precise and economical
  darren: {
    stance: { lean: -0.02, crouch: 0.04, fu: 0.4, fl: 2.2, bu: -0.1, bl: 0.5, ht: -0.08, spread: 0.08, ft: 0.24, bt: -0.18 },
    idle: (p, t) => { p.ht += Math.sin(t / 40) * 0.05; p.fl += Math.sin(t / 34) * 0.05; },
    walk: { stride: 0.34, bob: 0.012, arms: 0.1, lean: -0.02 },
    bored: { after: 150, pose: t => (Math.floor(t / 90) % 2 ? { fu: 1.05, fl: 3.25, bu: -0.1, bl: 0.5, ht: 0.04, lean: -0.02 } : { fu: 0.3, fl: 0.5, bu: -0.1, bl: 0.5, ht: -0.15, lean: -0.05, hz: 0.3 }) }, // adjusts his shades / waits, hands down
    moves: {
      jab: [VAR('flick'), VAR('poke'), VAR('slap')], jab2: [VAR('rearslap'), VAR('cross'), VAR('rearpalm')], hook: [VAR('shorthook'), VAR('slap', {}, { tw: 0.75 }), VAR('elbow')],
      upper: [VAR('chincheck'), VAR('risepalm'), VAR('risingelbow')], bodyhook: [VAR('liver'), VAR('gutpalm'), VAR('knee')], kick: [VAR('side'), VAR('stomp'), VAR('snap')],
      round: [VAR('spinhook'), VAR('headkick'), VAR('spinback')], sweep: [VAR('lowside'), VAR('lowspin'), VAR('trip')], akick: [VAR('flyside'), VAR('flyknee'), VAR('scissor')], grab: [VAR('neck'), VAR('collar'), VAR('wrist')],
    },
  },
  // the slouch: hunched over, arms hanging wide, big sloppy swings with all his weight behind them
  blake: {
    stance: { lean: 0.34, crouch: 0.14, ht: 0.25, fu: 0.35, fl: 1.1, bu: 0.3, bl: 1.0, spread: 0.38, ft: 0.25, fs: 0.05, bt: -0.2, bs: -0.25 },
    idle: (p, t) => { const b = Math.sin(t / 30); p.lean += b * 0.03; p.spread += b * 0.04; p.fl += b * 0.06; p.ht += b * 0.03; },
    walk: { stride: 0.3, bob: 0.03, arms: 0.22, lean: 0.06, sway: 0.15 },
    bored: { after: 130, pose: t => ({ fu: 0.75, fl: 2.0 + Math.sin(t / 6) * 0.15, hz: 0.6, bu: 0.3, bl: 1.0, lean: 0.25, ht: 0.3, spread: 0.3 }) }, // scratches his belly
    moves: {
      jab: [VAR('overhand'), VAR('wild'), VAR('bellybump')], jab2: [VAR('rearoverhand'), VAR('doubleaxe'), VAR('rearslap')], hook: [VAR('haymaker'), VAR('clothesline'), VAR('wild', {}, { tw: 1.1 })],
      upper: [VAR('shovel'), VAR('doubleupper'), VAR('headbutt')], bodyhook: [VAR('bellybump'), VAR('gutpunch'), VAR('shoulder')], kick: [VAR('stomp'), VAR('bigboot'), VAR('toepoke')],
      round: [VAR('sloppy'), VAR('bigboot', {}, { ft: 1.85, fs: 1.9 }), VAR('sloppy', { tw: -1.0 }, { tw: 1.1 })], sweep: [VAR('stomp', {}, { crouch: 0.3 }), VAR('buttdrop'), VAR('trip')],
      akick: [VAR('airstomp'), VAR('dropkick'), VAR('airstomp', {}, { lean: 0.4 })], grab: [VAR('bearhug'), VAR('twohand'), VAR('collar')],
    },
  },
  // the enforcer: tall and square, wide shoulders, short heavy shots; hands on his hips when he's waiting
  frank: {
    stance: { lean: 0.03, crouch: 0.05, fu: 0.62, fl: 2.25, bu: 0.38, bl: 2.35, spread: 0.28, ht: -0.08, ft: 0.3, fs: 0.02, bt: -0.25, bs: -0.28 },
    idle: (p, t) => { const b = Math.sin(t / 34); p.spread += b * 0.04; p.lean += b * 0.015; p.ht += b * 0.02; },
    walk: { stride: 0.3, bob: 0.035, arms: 0.12, lean: 0.03 },
    bored: { after: 120, pose: t => ({ fu: -0.15, fl: 0.95, bu: -0.15, bl: 0.95, spread: 0.95, hz: 0.6, hzb: 0.6, lean: -0.05, ht: -0.12 + Math.sin(t / 40) * 0.04, crouch: 0.02 }) }, // hands on his hips
    moves: {
      jab: [VAR('straight'), VAR('hammer'), VAR('power')], jab2: [VAR('cross'), VAR('rearoverhand'), VAR('elbow')], hook: [VAR('haymaker'), VAR('backfist'), VAR('forearm')],
      upper: [VAR('shovel'), VAR('doubleupper'), VAR('jumpupper')], bodyhook: [VAR('gutpunch'), VAR('shoulder'), VAR('knee')], kick: [VAR('bigboot'), VAR('push'), VAR('stomp')],
      round: [VAR('headkick'), VAR('axe'), VAR('spinback')], sweep: [VAR('stomp', {}, { crouch: 0.28 }), VAR('lowspin'), VAR('trip')], akick: [VAR('flyknee'), VAR('airstomp'), VAR('dropkick')], grab: [VAR('twohand'), VAR('neck'), VAR('bearhug')],
    },
  },
  // the looksmaxxer: chin up, front hand by the jaw, lazy and arrogant, he barely tries
  clav: {
    stance: { lean: -0.06, crouch: 0.03, fu: 0.5, fl: 2.6, bu: -0.05, bl: 0.35, ht: -0.12, spread: 0.06, ft: 0.22, bt: -0.18 },
    idle: (p, t) => { p.ht += Math.sin(t / 50) * 0.04; p.tw += Math.sin(t / 44) * 0.05; },
    walk: { stride: 0.4, bob: 0.015, arms: 0.18, lean: -0.04, sway: 0.1 },
    bored: { after: 140, pose: t => ({ fu: 1.2 - Math.min(1, (t % 120) / 60) * 0.35, fl: 3.3, bu: -0.05, bl: 0.35, lean: -0.1, ht: -0.22, hy: 0.25, tw: -0.15 }) }, // strokes his jaw
    moves: {
      jab: [VAR('flick', {}, { ht: -0.15 }), VAR('slap'), VAR('poke', {}, { ht: -0.2 })], jab2: [VAR('cross'), VAR('rearslap'), VAR('rearpalm')], hook: [VAR('slap', {}, { tw: 0.8 }), VAR('backfist'), VAR('elbow')],
      upper: [VAR('chincheck'), VAR('risepalm'), VAR('corkscrew')], bodyhook: [VAR('gutpunch'), VAR('knee'), VAR('gutpalm')], kick: [VAR('snap', {}, { lean: -0.45 }), VAR('side'), VAR('push')],
      round: [VAR('heel'), VAR('headkick'), VAR('crescent')], sweep: [VAR('trip', {}, { fu: 0.3, fl: 0.4, bu: -0.1, bl: 0.3 }), VAR('lowkick'), VAR('lowspin')], akick: [VAR('flyside'), VAR('flyknee'), VAR('scissor')], grab: [VAR('collar'), VAR('neck'), VAR('wrist')],
    },
  },
  // the wood master: stiff as a plank, bat cocked on his shoulder, every shot is a swing of the bat
  tung: {
    stance: { lean: 0.04, crouch: 0.1, fu: 1.05, fl: 2.75, bu: 0.85, bl: 2.6, spread: 0.06, tw: -0.18, ft: 0.32, fs: 0.02, bt: -0.3, bs: -0.3, ht: 0.02 },
    idle: (p, t) => { const k = Math.abs(Math.sin(t / 14)); p.crouch += k * 0.04; p.fl += Math.sin(t / 14) * 0.08; p.tw += Math.sin(t / 28) * 0.05; },
    walk: { stride: 0.3, bob: 0.05, arms: 0.06, lean: 0.02, sway: 0.18 },
    bored: { after: 140, pose: t => { const k = (t % 48) < 24 ? (t % 24) / 24 : 0; return { fu: 1.4 + Math.sin(k * Math.PI) * 1.1, fl: 2.0 + Math.sin(k * Math.PI) * 0.9, bu: 0.3, bl: 0.6, lean: 0.06, ht: 0.05, tw: -0.1 }; } }, // tung... tung... taps the bat on the floor
    moves: {
      jab: [VAR('spear', {}, { fl: 1.62, bu: 1.4, bl: 1.6 }), VAR('poke', {}, { bu: 1.45, bl: 1.6 }), VAR('hammer')], jab2: [VAR('doubleaxe'), VAR('rearoverhand'), VAR('cross', {}, { fu: 1.5, fl: 1.6 })],
      hook: [VAR('haymaker', {}, { bu: 1.45, bl: 1.6 }), VAR('clothesline'), VAR('wild', {}, { bu: 1.4, bl: 1.6 })], upper: [VAR('doubleupper'), VAR('shovel'), VAR('risingelbow')],
      bodyhook: [VAR('gutpunch'), VAR('doublepalm'), VAR('knee')], kick: [VAR('stomp'), VAR('push'), VAR('toepoke')], round: [VAR('sloppy'), VAR('axe'), VAR('bigboot')],
      sweep: [VAR('lowspin'), VAR('trip'), VAR('stomp', {}, { crouch: 0.3 })], akick: [VAR('airstomp'), VAR('dropkick'), VAR('flyknee')], grab: [VAR('twohand'), VAR('neck'), VAR('bearhug')],
    },
  },
  // the cold approach: tall and loose, hands low and relaxed like he's already won, sharp boxing when it counts
  hexum: {
    stance: { lean: 0.04, crouch: 0.07, fu: 0.7, fl: 2.35, bu: 0.45, bl: 2.7, spread: 0.12, ht: -0.06, ft: 0.3, fs: 0.04, bt: -0.26, bs: -0.3, tw: 0.06 },
    idle: (p, t) => { const b = Math.sin(t / 22); p.tw += b * 0.08; p.lean += b * 0.02; p.fu += Math.sin(t / 11) * 0.06; p.crouch += Math.abs(Math.sin(t / 11)) * 0.02; },
    walk: { stride: 0.42, bob: 0.02, arms: 0.2, lean: 0.03, sway: 0.12 },
    bored: { after: 140, pose: t => ({ fu: 2.6 + Math.sin(t / 18) * 0.12, fl: 3.5, hz: 0.3, bu: 0.15, bl: 0.5, lean: -0.08, ht: -0.12, hy: 0.2, tw: -0.1 }) }, // runs a hand through his curls
    moves: {
      jab: [VAR('straight'), VAR('flick'), VAR('doubletap')], jab2: [VAR('cross'), VAR('rearpalm'), VAR('rearoverhand')], hook: [VAR('whiphook'), VAR('shorthook'), VAR('power')],
      upper: [VAR('corkscrew'), VAR('jumpupper'), VAR('chincheck')], bodyhook: [VAR('liver'), VAR('gutpunch'), VAR('knee')], kick: [VAR('snap'), VAR('push'), VAR('side')],
      round: [VAR('headkick'), VAR('spinhook'), VAR('heel')], sweep: [VAR('lowkick'), VAR('trip'), VAR('lowspin')], akick: [VAR('flyknee'), VAR('flyside'), VAR('scissor')], grab: [VAR('collar'), VAR('neck'), VAR('twohand')],
    },
  },
  // the grin: hunched, head cocked, long arms hanging in front of her, twitching; every attack is a rake of long fingers
  verity: {
    stance: { lean: 0.32, crouch: 0.16, ht: 0.12, hy: 0.14, fu: 0.85, fl: 1.25, bu: 0.75, bl: 1.15, spread: 0.3, ft: 0.38, fs: 0.12, bt: -0.32, bs: -0.4 },
    idle: (p, t) => { const tw = Math.sin(t * 1.7) * (Math.sin(t / 23) > 0.85 ? 0.12 : 0); p.ht += tw; p.hy += Math.sin(t / 40) * 0.12; p.fl += Math.sin(t / 17) * 0.1; p.bl += Math.sin(t / 19) * 0.1; p.lean += Math.sin(t / 30) * 0.03; },
    walk: { stride: 0.46, bob: 0.03, arms: 0.08, lean: 0.06, sway: 0.2 },
    bored: { after: 120, pose: t => ({ fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.4, crouch: 0.2, ht: 0.25 + Math.sin(t / 50) * 0.1, hy: 0.6 * Math.sin(t / 70), spread: 0.2 }) }, // tilts her head all the way over, slowly
    moves: {
      jab: [VAR('flick', {}, { fl: 1.5 }), VAR('poke', {}, { fl: 1.5 }), VAR('spear')], jab2: [VAR('rearslap'), VAR('rearpalm'), VAR('rearoverhand')], hook: [VAR('slap', {}, { tw: 0.8 }), VAR('ridge'), VAR('wild')],
      upper: [VAR('risepalm'), VAR('crane'), VAR('doubleupper')], bodyhook: [VAR('gutpalm'), VAR('liver'), VAR('knee')], kick: [VAR('snap'), VAR('push'), VAR('crescent')],
      round: [VAR('axe'), VAR('crescent'), VAR('spinhook')], sweep: [VAR('capoeira'), VAR('lowside'), VAR('slide')], akick: [VAR('scissor'), VAR('flyside'), VAR('dropkick')], grab: [VAR('neck'), VAR('collar'), VAR('dive')],
    },
  },
};

const stanceOf = f => { const S = STYLE[f.c.id]; return S ? mk(S.stance) : GUARD; };

// ---- blocking: everyone covers up their own way, and keeps moving while they hold it ----
const BLOCKS = {
  julian: t => ({ fu: 1.3, fl: 2.7, bu: 1.0, bl: 2.95, lean: -0.05, crouch: 0.14, tw: Math.sin(t / 18) * 0.1, ht: 0.1, hz: 0.25 }),          // crossed forearms, swaying with the flow
  ryan: t => { const b = Math.abs(Math.sin(t / 7)); return { fu: 1.15, fl: 3.0, bu: 1.05, bl: 3.0, lean: 0.22, crouch: 0.32 + b * 0.08, ht: 0.28, tw: Math.sin(t / 7) * 0.12 }; }, // peek-a-boo, bouncing
  darren: t => ({ fu: 1.45, fl: 2.45, bu: 0.85, bl: 3.1, hzb: 0.2, lean: -0.12, crouch: 0.06, ht: -0.04 + Math.sin(t / 40) * 0.03 }),       // one forearm up, cool and upright
  blake: t => ({ fu: 0.95, fl: 3.1, bu: 0.9, bl: 3.1, lean: 0.2, crouch: 0.26 + Math.sin(t / 10) * 0.03, ht: 0.32, spread: 0.1 }),           // turtles up behind his arms, belly wobbling
  frank: t => ({ fu: 1.22, fl: 2.85, bu: 1.12, bl: 2.9, spread: 0.08, lean: 0.12 + Math.sin(t / 30) * 0.02, crouch: 0.1, ht: 0.22 }),     // a wall of forearms, chin tucked, breathing slow
  clav: t => ({ fu: 1.35, fl: 2.6, bu: -0.05, bl: 0.35, lean: -0.14, crouch: 0.02, ht: -0.12 + Math.sin(t / 36) * 0.03, tw: -0.22 }),       // one lazy arm up, chin still high
  tung: t => ({ fu: 1.55, fl: 2.35, bu: 1.45, bl: 2.4, spread: 0.02, lean: 0.06, crouch: 0.16 + Math.abs(Math.sin(t / 12)) * 0.02, ht: 0.12, tw: 0.1 }), // the bat held across him like a barricade
  hexum: t => ({ fu: 1.2, fl: 2.95, bu: 1.1, bl: 3.0, lean: 0.14, crouch: 0.14, ht: 0.18, tw: Math.sin(t / 12) * 0.14 }),                      // a high shell, rolling his shoulders
  verity: t => ({ fu: 1.7, fl: 2.3, bu: 1.6, bl: 2.2, spread: 0.45, lean: 0.24, crouch: 0.22, ht: 0.05, hy: 0.25 + Math.sin(t / 9) * 0.06 }),  // long fingers splayed out in front of her face
};
// the block pose: snaps up over the first few frames, then holds with the fighter's own motion
function blockPose(f) {
  const B = BLOCKS[f.c.id]; if (!B) return POSES.block;
  const t = frame + f.side * 23, p = Object.assign(stanceOf(f), { tw: 0, hz: 0, hzb: 0, lunge: 0 }, B(t));
  const k = clamp((frame - (f.blockStart || -99)) / 5, 0, 1);
  return k < 1 ? lp(idlePose(f), p, easeOut(k)) : p;
}

// ---- dash attacks: each fighter's own punch and kick out of a forward dash ----
const DASHES = {
  julian: { dashpunch: [VAR('', { tw: -0.9, fu: 0.3, fl: 1.2 }, { tw: 1.1, fu: 1.6, fl: 2.9, lean: 0.3, lunge: 0.1 })],                          // spinning backfist
            dashkick: [VAR('', { crouch: 0.4 }, { crouch: 0.45, lean: 0.35, ft: 1.35, fs: 1.5, bt: -0.3, bs: -1.3, fu: 0.9, fl: 0.6 })] },        // flowing slide kick
  ryan: { dashpunch: [VAR('', { crouch: 0.4 }, { fu: 1.65, fl: 1.6, bu: -0.6, bl: -0.3, lean: 0.75, ft: 0.4, fs: 0.2, bt: -1.1, bs: -0.4 })],          // superman punch
          dashkick: [VAR('', { crouch: 0.45 }, { rot: -0.9, ft: 1.55, fs: 1.55, bt: 1.35, bs: 1.4, fu: 2.4, fl: 2.6, bu: 2.2, bl: 2.5 })] },     // sliding dropkick, both feet
  darren: { dashpunch: [VAR('', { fu: 0.8, fl: 2.4 }, { fu: 1.55, fl: 1.62, bu: 0.9, bl: 2.9, hzb: 0.2, lean: 0.25, lunge: 0.12 })],                    // open-palm strike
            dashkick: [VAR('', {}, { ft: 1.55, fs: 1.6, lean: -0.32, fu: 0.6, fl: 2.2, bu: 0.3, bl: 2.5 })] },                                        // gliding front teep
  blake: { dashpunch: [VAR('', { lean: -0.2, spread: 0.6 }, { lean: 0.4, fu: -0.4, fl: 0.3, bu: -0.4, bl: 0.3, spread: 0.6, lunge: 0.16, ht: -0.1 })], // belly charge
           dashkick: [VAR('', { crouch: 0.35 }, { ft: 1.1, fs: 0.4, bt: 0.3, bs: -0.4, lean: -0.15, fu: 2.4, fl: 2.8, bu: 2.3, bl: 2.7 })] },     // hop and stomp
  frank: { dashpunch: [VAR('', { lean: 0.5, crouch: 0.3 }, { lean: 0.7, crouch: 0.22, fu: 0.2, fl: 1.0, bu: 0.3, bl: 1.2, tw: 0.5, lunge: 0.18, ht: 0.2 })], // shoulder tackle
           dashkick: [VAR('', {}, { ft: 1.6, fs: 1.62, lean: -0.38, fu: 0.9, fl: 2.6, bu: -0.4, bl: 0.4 })] },                                     // running big boot
  clav: { dashpunch: [VAR('', { tw: -0.6, fu: 1.0, fl: 2.2 }, { tw: 0.8, fu: 1.4, fl: 2.8, lean: 0.1, ht: -0.15 })],                                   // a backhand slap: disrespect
          dashkick: [VAR('', { crouch: 0.3 }, { ft: 1.9, fs: 0.4, bt: -0.5, bs: -0.8, fu: 2.2, fl: 2.4, bu: 2.0, bl: 2.3, lean: 0.1 })] },        // flying knee
  tung: { dashpunch: [VAR('', { fu: 2.2, fl: 2.8, bu: 2.0, bl: 2.7, tw: -0.8 }, { fu: 1.55, fl: 1.55, bu: 1.45, bl: 1.5, tw: 0.9, lean: 0.3, lunge: 0.12 })],      // a running swing of the bat
          dashkick: [VAR('', { crouch: 0.3 }, { ft: 1.5, fs: 1.5, bt: 1.3, bs: 1.4, lean: -0.5, rot: -0.5, fu: 2.4, fl: 2.8, bu: 2.3, bl: 2.7 })] }, // a stiff flying log dropkick
  hexum: { dashpunch: [VAR('', { crouch: 0.3, fu: 0.5, fl: 2.4 }, { fu: 1.6, fl: 1.6, bu: 0.4, bl: 2.7, lean: 0.5, lunge: 0.14, ht: 0.05 })],           // a long leaping lead
           dashkick: [VAR('', { crouch: 0.35 }, { ft: 2.0, fs: 0.3, bt: -0.6, bs: -0.9, fu: 1.2, fl: 2.5, bu: 0.8, bl: 2.4, lean: 0.15 })] },     // flying knee
  verity: { dashpunch: [VAR('', { fu: 2.5, fl: 3.0, bu: 2.3, bl: 2.9, lean: 0.4 }, { fu: 1.3, fl: 1.1, bu: 1.2, bl: 1.0, lean: 0.62, crouch: 0.2, spread: 0.3, lunge: 0.16 })], // lunges with both hands raking
            dashkick: [VAR('', { crouch: 0.45 }, { crouch: 0.5, lean: -0.55, ft: 1.2, fs: 1.3, bt: -0.2, bs: -1.2, fu: 0.9, fl: 1.4, lunge: 0.14 })] }, // a long low slide
};
for (const id in DASHES) if (STYLE[id]) Object.assign(STYLE[id].moves, DASHES[id]);
// which version of a move to play: random, but never the same one twice in a row
function pickVariant(f, id) {
  const S = STYLE[f.c.id], vs = S && S.moves[id]; if (!vs) return 0;
  let i = rand() * vs.length | 0; if (vs.length > 1 && i === f.avLast && f.avMove === id) i = (i + 1) % vs.length;
  f.avLast = i; f.avMove = id; return i;
}
// the move's two key poses for this fighter and this version
function moveKeys(f, M) {
  const S = stanceOf(f), st = STYLE[f.c.id], v = st && st.moves[f.move] && st.moves[f.move][f.av || 0];
  const base = Object.assign({}, S, { lunge: 0, tw: 0, hz: 0, hzb: 0 });
  return { S, wind: Object.assign({}, base, M.wind, v && v.wind), hit: Object.assign({}, base, M.hit, v && v.hit) };
}
// standing around: the fighter's stance breathing in their own rhythm, walking their own way, and getting bored
function idlePose(f) {
  const st = STYLE[f.c.id], t = frame + f.side * 37, p = stanceOf(f);
  const bob = Math.sin(frame / 9 + f.side * 2); p.crouch += bob * 0.025; p.fl += bob * 0.04; p.bl += bob * 0.04;
  if (st && st.idle) st.idle(p, t);
  if (Math.abs(f.vx) > 0.5) {
    const W = (st && st.walk) || { stride: 0.5, bob: 0.02, arms: 0.1, lean: 0.08 };
    const s = Math.sin(f.walkPh), c = Math.cos(f.walkPh), fwd = Math.sign(f.vx) === f.facing ? 1 : -1;
    p.ft = 0.05 + W.stride * s; p.bt = 0.05 - W.stride * s;
    p.fs = p.ft - 0.6 * Math.max(0, c); p.bs = p.bt - 0.6 * Math.max(0, -c);
    p.lean += W.lean * fwd; p.fu += W.arms * s; p.bu -= W.arms * s; p.crouch = (st ? st.stance.crouch : 0.06) * 0.5 + 0.03 + Math.abs(c) * W.bob * 2;
    if (W.sway) p.tw += Math.sin(f.walkPh) * W.sway;
  } else if (st && st.bored && (f.idleT || 0) > st.bored.after) {
    const k = clamp(((f.idleT || 0) - st.bored.after) / 18, 0, 1);
    return lp(p, Object.assign({}, p, st.bored.pose(t)), swing(k));
  }
  return p;
}
// for the credits: how many distinct animations the fighters have
function countAnims() {
  let n = 0;
  for (const id in STYLE) { const S = STYLE[id]; n += 3; if (S.bored) n++; if (BLOCKS[id]) n++; for (const m in S.moves) n += S.moves[m].length; if (THROWS[id]) n++; if (GESTURES[id]) n++; n += (VICTORY[id] || []).length; }
  return n;
}

// ---- winning: the first couple of seconds play in slow motion, then a victory animation loops ----
const OUT_SLOW = 150, OUT_RATE = 0.35;
const outroClock = () => overT < OUT_SLOW ? overT * OUT_RATE : OUT_SLOW * OUT_RATE + (overT - OUT_SLOW);
const VICTORY_LINES = {
  julian: ['Flow wins. It always does.', 'You fought the current.', 'Stay hydrated.'],
  ryan: ['Told you. Size is just a number.', 'Too fast, too small, too good.', 'Next!'],
  darren: ['I saw that coming.', 'Mind over matter.', 'Think about that one for a while.'],
  blake: ['Adapted. Overcame.', 'Was it good for you?', 'Nobody does it like BBL Blake.'],
  frank: ['Stay down.', 'Lejohn would be proud.', 'That was calm.'],
  clav: ['Mogged.', 'Not even close.', 'The jawline never loses.'],
  tung: ['Tung tung tung... sahur.', 'Wake up. It is time.', 'Knock knock.'],
  hexum: ['Ay mayne, say mayne.', 'Cold approach. Warm finish.', "That's a W, mayne."],
  verity: ["It's me. It's Verity.", 'Keep smiling.', "I'll be right behind you."],
};
// two victory animations each: keyframes [frame, pose] over a loop, played on the outro clock
const VICTORY = {
  julian: [[[0, { fu: 2.3, fl: 3.5, bu: 0.15, bl: 0.5, lean: -0.08, ht: -0.18 }], [40, { fu: 2.5, fl: 3.3, bu: 0.3, bl: 0.6, lean: -0.1, ht: -0.22 }], [80, { fu: 2.3, fl: 3.5, bu: 0.15, bl: 0.5, lean: -0.08, ht: -0.18 }]],
           [[0, { fu: 1.3, fl: 2.6, bu: 1.3, bl: 2.6, hz: 0.6, hzb: 0.6, lean: 0.2, ht: 0.25 }], [60, { fu: 1.3, fl: 2.6, bu: 1.3, bl: 2.6, hz: 0.6, hzb: 0.6, lean: 0.25, ht: 0.3 }], [120, { fu: 1.3, fl: 2.6, bu: 1.3, bl: 2.6, hz: 0.6, hzb: 0.6, lean: 0.2, ht: 0.25 }]]], // flow hand to the sky / a calm bow
  ryan: [[[0, { fu: 2.8, fl: 3.0, bu: -2.6, bl: -2.9, crouch: 0.22, ht: 0.1 }], [10, { fu: 2.8, fl: 3.0, bu: -2.6, bl: -2.9, crouch: 0, ht: -0.2 }], [20, { fu: 2.8, fl: 3.0, bu: -2.6, bl: -2.9, crouch: 0.22, ht: 0.1 }]],
         [[0, { fu: 2.9, fl: 3.1, bu: 0.3, bl: 0.6, ht: -0.2, point: 1 }], [50, { fu: 2.95, fl: 3.15, bu: 0.3, bl: 0.6, ht: -0.25, point: 1 }], [100, { fu: 2.9, fl: 3.1, bu: 0.3, bl: 0.6, ht: -0.2, point: 1 }]]], // hops / sword to the sky
  darren: [[[0, { fu: 0.55, fl: -1.3, bu: 0.35, bl: 1.6, lean: -0.06, ht: 0.12 }], [60, { fu: 1.1, fl: 3.3, bu: 0.35, bl: 1.6, ht: 0.05 }], [120, { fu: 0.55, fl: -1.3, bu: 0.35, bl: 1.6, lean: -0.06, ht: 0.12 }]],
           [[0, { fu: 1.0, fl: 3.25, bu: 0.2, bl: 0.5, ht: 0.1, tw: -0.15, point: 1 }], [60, { fu: 1.0, fl: 3.28, bu: 0.2, bl: 0.5, ht: 0.14, tw: -0.15, point: 1 }], [120, { fu: 1.0, fl: 3.25, bu: 0.2, bl: 0.5, ht: 0.1, tw: -0.15, point: 1 }]]], // shades / taps his temple
  blake: [[[0, { fu: 1.55, fl: 3.05, bu: 1.55, bl: 3.05, spread: 0.8, ht: -0.2, lean: -0.12 }], [30, { fu: 1.6, fl: 3.2, bu: 1.6, bl: 3.2, spread: 0.85, ht: -0.25, lean: -0.14 }], [60, { fu: 1.55, fl: 3.05, bu: 1.55, bl: 3.05, spread: 0.8, ht: -0.2, lean: -0.12 }]],
          [[0, { fu: 0.45, fl: 1.15, bu: 0.3, bl: 1.0, lean: -0.18, ht: -0.12, crouch: 0.05, tw: -0.3 }], [16, { fu: 0.65, fl: 1.15, bu: 0.15, bl: 1.0, lean: -0.18, ht: -0.12, crouch: 0.12, tw: 0.3 }], [32, { fu: 0.45, fl: 1.15, bu: 0.3, bl: 1.0, lean: -0.18, ht: -0.12, crouch: 0.05, tw: -0.3 }]]], // flexes / a little dance
  frank: [[[0, { fu: 1.4, fl: 2.1, bu: 1.4, bl: 2.1, spread: 1.0, ht: -0.35, lean: -0.15, crouch: 0.15 }], [8, { fu: 0.9, fl: 2.7, hz: 0.6, bu: 0.9, bl: 2.7, hzb: 0.6 }], [16, { fu: 1.4, fl: 2.1, bu: 1.4, bl: 2.1, spread: 1.0, ht: -0.35, lean: -0.15, crouch: 0.15 }], [40, { fu: 1.4, fl: 2.1, bu: 1.4, bl: 2.1, spread: 1.0, ht: -0.35, lean: -0.15, crouch: 0.15 }]],
          [[0, { fu: -0.15, fl: 0.95, bu: -0.15, bl: 0.95, spread: 0.95, hz: 0.6, hzb: 0.6, lean: -0.05, ht: -0.12 }], [60, { fu: -0.15, fl: 0.95, bu: -0.15, bl: 0.95, spread: 0.95, hz: 0.6, hzb: 0.6, lean: -0.05, ht: 0.05 }], [120, { fu: -0.15, fl: 0.95, bu: -0.15, bl: 0.95, spread: 0.95, hz: 0.6, hzb: 0.6, lean: -0.05, ht: -0.12 }]]], // pounds his chest and roars / hands on hips
  clav: [[[0, { fu: 1.0, fl: 3.3, hz: 0.25, bu: 0.1, bl: 0.4, ht: -0.24, hy: -0.28, lean: -0.08, point: 1 }], [40, { fu: 0.72, fl: 3.5, hz: 0.42, bu: 0.1, bl: 0.4, ht: -0.3, hy: -0.34, lean: -0.08, point: 1 }], [80, { fu: 1.0, fl: 3.3, hz: 0.25, bu: 0.1, bl: 0.4, ht: -0.24, hy: -0.28, lean: -0.08, point: 1 }]],
         [[0, { fu: 2.6, fl: 3.6, bu: 0.1, bl: 0.4, lean: -0.1, ht: -0.15 }], [50, { fu: 2.7, fl: 3.7, bu: 0.1, bl: 0.4, lean: -0.12, ht: -0.2 }], [100, { fu: 2.6, fl: 3.6, bu: 0.1, bl: 0.4, lean: -0.1, ht: -0.15 }]]], // the jawline / fixes his hair
  tung: [[[0, { fu: 2.9, fl: 3.15, bu: 0.2, bl: 0.5, ht: -0.15 }], [10, { fu: 1.2, fl: 1.5, bu: 0.2, bl: 0.5, ht: 0.1, lean: 0.1 }], [20, { fu: 2.9, fl: 3.15, bu: 0.2, bl: 0.5, ht: -0.15 }], [30, { fu: 1.2, fl: 1.5, bu: 0.2, bl: 0.5, ht: 0.1, lean: 0.1 }], [40, { fu: 2.9, fl: 3.15, bu: 0.2, bl: 0.5, ht: -0.15 }], [70, { fu: 2.9, fl: 3.15, bu: 0.2, bl: 0.5, ht: -0.15 }]],
         [[0, { fu: 1.05, fl: 2.75, bu: 0.85, bl: 2.6, tw: -0.4, lean: -0.08, ht: -0.12 }], [60, { fu: 1.1, fl: 2.8, bu: 0.9, bl: 2.65, tw: -0.5, lean: -0.1, ht: -0.16 }], [120, { fu: 1.05, fl: 2.75, bu: 0.85, bl: 2.6, tw: -0.4, lean: -0.08, ht: -0.12 }]]], // tung tung tung with the bat / bat on the shoulder, staring
  hexum: [[[0, { fu: 1.1, fl: 2.9, hz: 0.5, bu: 0.2, bl: 0.5, ht: -0.15, lean: -0.08, tw: -0.15 }], [50, { fu: 1.15, fl: 3.0, hz: 0.6, bu: 0.2, bl: 0.5, ht: -0.18, lean: -0.1, tw: -0.2 }], [100, { fu: 1.1, fl: 2.9, hz: 0.5, bu: 0.2, bl: 0.5, ht: -0.15, lean: -0.08, tw: -0.15 }]],
          [[0, { fu: 2.6, fl: 3.5, bu: 0.2, bl: 0.5, ht: -0.12, lean: -0.08 }], [40, { fu: 2.75, fl: 3.6, bu: 0.2, bl: 0.5, ht: -0.18, lean: -0.1 }], [80, { fu: 2.6, fl: 3.5, bu: 0.2, bl: 0.5, ht: -0.12, lean: -0.08 }]]], // fingers on the chain / hand through the curls
  verity: [[[0, { fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.38, crouch: 0.2, ht: 0.2, hy: 0.5 }], [60, { fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.42, crouch: 0.22, ht: 0.3, hy: -0.5 }], [120, { fu: 0.6, fl: 0.9, bu: 0.55, bl: 0.85, lean: 0.38, crouch: 0.2, ht: 0.2, hy: 0.5 }]],
           [[0, { fu: 1.8, fl: 2.0, bu: 1.7, bl: 1.9, spread: 0.7, lean: 0.1, ht: -0.1 }], [6, { fu: 1.85, fl: 2.4, bu: 1.75, bl: 2.3, spread: 0.72, lean: 0.12, ht: -0.12 }], [12, { fu: 1.8, fl: 2.0, bu: 1.7, bl: 1.9, spread: 0.7, lean: 0.1, ht: -0.1 }], [60, { fu: 1.8, fl: 2.0, bu: 1.7, bl: 1.9, spread: 0.7, lean: 0.1, ht: -0.1 }]]], // the slow head tilt / fingers splayed, twitching
};
function victoryPose(f) {
  const set = VICTORY[f.c.id]; if (!set) return (SHOWPOSE[f.c.id] || SHOWPOSE.julian)(frame);
  const K = set[(f.vicI || 0) % set.length], len = K[K.length - 1][0], t = outroClock() % len;
  let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++;
  const [t0, a] = K[i], [t1, b] = K[i + 1], S = stanceOf(f);
  return lp(Object.assign({}, S, a), Object.assign({}, S, b), swing(clamp((t - t0) / Math.max(1, t1 - t0), 0, 1)));
}
