// ---------- SQUADS: every stage's big version, laid out for that place ----------
// Each stage (2v2 and up) gets its own layout in a room 68 x 36 m: what's in it is what belongs there (a nightclub has
// a DJ stage up a flight of stairs, a VIP balcony, booths, a bar, velvet ropes; a boxing gym has a ring in the middle,
// bags, racks, an office balcony...), with high ground to fight over. Each team starts in its own room at one end
// (the stage names them). Layouts are mirrored left to right, so both sides get the same ground; pieces on the
// middle line (c: 1) are shared.
// A piece: { t: type, x, z, ry (0 / 90 / 180 / 270), ...its size }. PIECES turns one into the blocks you collide with
// and stand on ([x, z, width, depth, top, kind, ramp, low, base], in the piece's own frame); js3d/stages3d.js builds
// how it looks.
const one = (w, d, h, k, base) => [[0, 0, w, d, h, k || 'o', null, 0, base || 0]];
const PIECES = {
  plat: p => one(p.w, p.d, p.h, 'pl', p.base),
  mezz: p => one(p.w, p.d, p.h, 'pl'),
  stairs: p => [[0, 0, p.w, p.len, p.h, 'st', 'z+', p.low || 0, 0]], // rises toward the piece's +z
  dance: () => [], mat: () => [], courtlines: () => [], decal: () => [],
  booth: p => one(2.6, 1.6, (p.base || 0) + 0.95, 'o', p.base),
  sofa: p => one(2.4, 1.0, (p.base || 0) + 0.85, 'o', p.base),
  bar: p => one(p.len, 1.2, 1.15),
  rope: p => one(p.len, 0.25, 0.95),
  speaker: p => one(1.2, 1.0, (p.base || 0) + 2.6, 'o', p.base),
  pillar: p => one(p.s || 1.2, p.s || 1.2, 4.6),
  column: () => one(1.3, 1.3, 5),
  htable: () => one(0.9, 0.9, 1.05),
  djdesk: p => one(p.w || 4.2, 1.4, (p.base || 0) + 1.1, 'o', p.base),
  bag: () => one(0.6, 0.6, 2.1, 'o', 0.35),
  rack: p => one(p.len, 0.9, 1.2),
  wbench: () => one(0.6, 1.8, 0.5),
  squat: () => one(2.1, 2.1, 2.4),
  tread: () => one(0.9, 2.0, 1.3),
  ring: p => { const s = p.s, h = p.h, e = s / 2, g = 0.9, rb = (x, z, w, d) => [x, z, w, d, h + 1.15, 'o', null, 0, h + 0.15];
    return [[0, 0, s, s, h, 'pl'], rb(0, -e + 0.1, s, 0.2), rb(0, e - 0.1, s, 0.2), // ropes along z ends; the x sides open in the middle for the steps
      rb(-e + 0.1, -(e + g) / 2, 0.2, e - g), rb(-e + 0.1, (e + g) / 2, 0.2, e - g), rb(e - 0.1, -(e + g) / 2, 0.2, e - g), rb(e - 0.1, (e + g) / 2, 0.2, e - g),
      [-e - 0.9, 0, 1.8, 1.6, h, 'st', 'x+', 0, 0], [e + 0.9, 0, 1.8, 1.6, h, 'st', 'x-', 0, 0]]; },
  hoop: () => one(0.45, 0.45, 3.4),
  bleacher: p => { const n = p.tiers || 3, out = []; for (let k = 0; k < n; k++) out.push([0, (k - (n - 1) / 2) * 0.9, p.len, 0.9, 0.5 * (k + 1), 'pl']); return out; }, // steps up toward +z
  bench: p => one(p.len || 2.4, 0.55, 0.5),
  dumpster: () => one(1.9, 1.15, 1.4),
  can: () => one(0.6, 0.6, 1.0),
  car: () => one(1.9, 4.2, 1.45),
  container: p => one(p.len || 6, 2.4, 2.6),
  hedge: p => one(p.len, 0.9, 1.3),
  fountain: () => [[0, 0, 5.2, 5.2, 0.45, 'pl'], [0, 0, 1.0, 1.0, 2.4, 'o']],
  gazebo: () => { const out = [[0, 0, 6, 6, 0.45, 'pl']]; for (const [a, b] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) out.push([a, b, 0.35, 0.35, 3.2, 'o', null, 0, 0.45]); return out; },
  statue: () => one(1.4, 1.4, 1.3),
  tree: () => one(0.9, 0.9, 1.1),
  ac: () => one(2.4, 1.6, 1.5),
  vent: () => one(1.0, 1.0, 1.0),
  skylight: p => one(p.w || 3, p.d || 2, 0.6),
  dish: () => one(1.2, 1.2, 1.6),
  stairhouse: () => one(3.6, 3.0, 3.1),
  helipad: p => one(p.s, p.s, 0.35, 'pl'),
  tower: () => { const out = [[0, 0, 3.6, 3.6, 3.0, 'pl', null, 0, 2.7]]; for (const [a, b] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) out.push([a, b, 0.3, 0.3, 2.7, 'o']); return out; },
  holo: () => one(1.0, 1.0, 4.2),
  neonwall: p => one(p.len, 0.4, 1.1),
  cube: () => one(1.6, 1.6, 1.6),
  throne: p => one(1.4, 1.2, (p.base || 0) + 1.9, 'o', p.base),
  case: () => one(1.6, 0.8, 1.7),
  train: p => one(p.len || 12, 3, 3.4),
  kiosk: () => one(2.2, 1.6, 2.4),
  vend: () => one(1.1, 0.9, 2.0),
  turnstile: p => one(p.len, 0.6, 1.0),
  truck: () => one(6, 2.6, 2.9),
  balcony: p => one(p.w, p.d, p.h, 'pl', p.h - 0.25),
  crate: () => one(1.3, 1.3, 1.3),
  stall: () => one(2.6, 1.6, 2.4),
  barrel: () => one(0.8, 0.8, 1.0),
  island: p => one(p.len, 1.1, 1.0),
  piano: () => one(1.6, 1.9, 1.05),
  hottub: () => one(2.6, 2.6, 0.7),
  plant: () => one(0.8, 0.8, 1.2),
  carstack: () => one(4.3, 2.0, 2.6),
  tyres: () => one(1.5, 1.5, 1.2),
  shack: () => one(4, 3, 3.1),
  craneb: () => one(3, 3, 2.2),
  boat: () => one(1.8, 4.2, 1.1),
  hut: () => one(2.8, 2.8, 2.9),
  lounger: () => one(0.8, 2.0, 0.5),
  palm: () => one(0.6, 0.6, 4),
  lifeguard: () => { const out = [[0, 0, 3, 3, 2.3, 'pl', null, 0, 2.0]]; for (const [a, b] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) out.push([a, b, 0.25, 0.25, 2.0, 'o']); return out; },
  shrine: () => [[0, 0, 10, 6, 1.4, 'pl'], [0, -0.8, 6, 3.4, 6.0, 'o', null, 0, 1.4]],
  torii: () => [[-2.3, 0, 0.6, 0.6, 4.4, 'o'], [2.3, 0, 0.6, 0.6, 4.4, 'o']],
  lantern: () => one(0.7, 0.7, 1.7),
  rock: p => one(p.w || 2, p.d || 1.6, p.h || 1.4),
  snowbank: p => one(p.len, 1.0, 0.8),
  jersey: p => one(p.len, 0.6, 0.85),
};
// the layouts: the left half (x < 0) and the shared middle (c: 1); names: the two teams' rooms
const LAYOUTS = {
  club: { names: ['VIP LOUNGE', 'BACKSTAGE'], pieces: [
    { t: 'dance', x: 0, z: 0, w: 14, d: 11, c: 1 },
    { t: 'plat', x: 0, z: -13.5, w: 12, d: 7, h: 1.2, look: 'stage', c: 1 }, { t: 'djdesk', x: 0, z: -14.6, w: 4.2, base: 1.2, c: 1 },
    { t: 'bar', x: 0, z: 15.8, len: 14, ry: 180, c: 1 },
    { t: 'stairs', x: -4.6, z: -8.4, w: 2.4, len: 3.2, h: 1.2, ry: 180 }, { t: 'speaker', x: -5.0, z: -16, base: 1.2 }, { t: 'speaker', x: -7.4, z: -11.5 },
    { t: 'mezz', x: -17, z: -13, w: 9, d: 6, h: 2.2, look: 'vip' }, { t: 'stairs', x: -11.3, z: -13, w: 2, len: 3.6, h: 2.2, ry: 270 },
    { t: 'booth', x: -19.2, z: -14.6, base: 2.2 }, { t: 'booth', x: -15.2, z: -14.6, base: 2.2 },
    { t: 'booth', x: -14.5, z: 3.6, ry: 90 }, { t: 'booth', x: -14.5, z: 8.6, ry: 90 }, { t: 'booth', x: -19.5, z: 13.4 },
    { t: 'rope', x: -8.4, z: 6, len: 5, ry: 90 }, { t: 'rope', x: -8.4, z: -5.4, len: 3, ry: 90 },
    { t: 'htable', x: -10.2, z: -2.4 }, { t: 'htable', x: -10.6, z: 11.5 }, { t: 'pillar', x: -11.5, z: -6.6 }, { t: 'pillar', x: -20.5, z: 3 },
    { t: 'sofa', x: -29.5, z: 12, ry: 90 }, { t: 'sofa', x: -29.5, z: -12, ry: 90 },
  ] },
  gym: { names: ['BLUE CORNER', 'RED CORNER'], pieces: [
    { t: 'ring', x: 0, z: 0, s: 7.4, h: 0.9, c: 1 },
    { t: 'mezz', x: 0, z: 15.3, w: 14, d: 4.4, h: 2.6, look: 'office', c: 1 }, { t: 'stairs', x: -9, z: 15.3, w: 2, len: 4, h: 2.6, ry: 90 },
    { t: 'bag', x: -8.5, z: -12 }, { t: 'bag', x: -11.5, z: -12 }, { t: 'bag', x: -14.5, z: -12 },
    { t: 'rack', x: -19, z: -16, len: 6 }, { t: 'rack', x: -7.5, z: -16.6, len: 3.5 }, { t: 'wbench', x: -17.5, z: -10.6 }, { t: 'wbench', x: -20.5, z: -10.6 },
    { t: 'squat', x: -19.5, z: 6.5 }, { t: 'tread', x: -15.4, z: 9.8 }, { t: 'tread', x: -13.8, z: 9.8 }, { t: 'tread', x: -12.2, z: 9.8 },
    { t: 'mat', x: -9, z: 6, w: 5, d: 4 }, { t: 'wbench', x: -9, z: 6, ry: 90 },
    { t: 'pillar', x: -12, z: -3.5 },
  ] },
  court: { names: ['HOME', 'AWAY'], pieces: [
    { t: 'courtlines', x: 0, z: 0, c: 1 },
    { t: 'bleacher', x: 0, z: -14.6, len: 16, tiers: 4, ry: 180, c: 1 },
    { t: 'plat', x: 0, z: 15.5, w: 8, d: 4, h: 1.0, look: 'stage', c: 1 }, { t: 'stairs', x: -5.1, z: 15.5, w: 2.4, len: 2.2, h: 1.0, ry: 90 },
    { t: 'hoop', x: -13.4, z: 0 }, { t: 'bench', x: -6.5, z: -10.4, len: 3 }, { t: 'bench', x: -6.5, z: 10.4, len: 3 },
    { t: 'container', x: -17.5, z: -6, len: 6, ry: 90 }, { t: 'stairs', x: -17.5, z: -0.8, w: 2.2, len: 4.4, h: 2.6, ry: 180 },
    { t: 'dumpster', x: -21, z: -14.6 }, { t: 'can', x: -18.6, z: -15.4 }, { t: 'car', x: -20, z: 13, ry: 90 }, { t: 'can', x: -10, z: 15.6 },
  ] },
  garden: { names: ['NORTH GATE', 'SOUTH GATE'], pieces: [
    { t: 'fountain', x: 0, z: 0, c: 1 }, { t: 'gazebo', x: 0, z: -13, c: 1 },
    { t: 'plat', x: 0, z: 15.3, w: 16, d: 5, h: 1.2, look: 'terrace', c: 1 }, { t: 'stairs', x: -5, z: 11.2, w: 2.6, len: 3.2, h: 1.2 },
    { t: 'hedge', x: -10, z: -6, len: 6, ry: 90 }, { t: 'hedge', x: -10, z: 6, len: 6, ry: 90 }, { t: 'hedge', x: -17.5, z: -11.5, len: 5 }, { t: 'hedge', x: -17.5, z: 11.5, len: 5 },
    { t: 'statue', x: -14.5, z: 0 }, { t: 'bench', x: -6, z: -9.5, len: 2.4 }, { t: 'bench', x: -6, z: 9.5, len: 2.4 },
    { t: 'tree', x: -20.5, z: -4.5 }, { t: 'tree', x: -20.5, z: 5 }, { t: 'tree', x: -13, z: -15.5 }, { t: 'tree', x: -14, z: 15.6 },
  ] },
  roof: { names: ['EAST ROOF', 'WEST ROOF'], pieces: [
    { t: 'helipad', x: 0, z: 0, s: 9, c: 1 }, { t: 'tower', x: 0, z: -14, c: 1 }, { t: 'stairs', x: -4, z: -14, w: 1.6, len: 4.4, h: 3.0, ry: 90 },
    { t: 'stairhouse', x: 0, z: 15.2, c: 1 },
    { t: 'ac', x: -9, z: -6.5 }, { t: 'ac', x: -9, z: 8 }, { t: 'ac', x: -18.5, z: -12, ry: 90 }, { t: 'vent', x: -14.5, z: 3 }, { t: 'vent', x: -6, z: 13.5 },
    { t: 'skylight', x: -17, z: 7, w: 3, d: 2 }, { t: 'dish', x: -20.5, z: 15 }, { t: 'vent', x: -21, z: -3 },
  ] },
  verse: { names: ['ALPHA', 'OMEGA'], pieces: [
    { t: 'decal', x: 0, z: 0, c: 1 },
    { t: 'plat', x: 0, z: -13.5, w: 10, d: 6, h: 1.6, look: 'neon', c: 1 }, { t: 'stairs', x: -6.6, z: -13.5, w: 2.4, len: 3.2, h: 1.6, ry: 90 },
    { t: 'plat', x: 0, z: 13.5, w: 10, d: 6, h: 1.6, look: 'neon', c: 1 }, { t: 'stairs', x: -6.6, z: 13.5, w: 2.4, len: 3.2, h: 1.6, ry: 90 },
    { t: 'holo', x: -10, z: -4.5 }, { t: 'holo', x: -10, z: 4.5 }, { t: 'neonwall', x: -16, z: -8, len: 4, ry: 90 }, { t: 'neonwall', x: -16, z: 8, len: 4, ry: 90 },
    { t: 'cube', x: -19.5, z: 0 }, { t: 'cube', x: -13, z: 13 }, { t: 'cube', x: -13, z: -13 },
  ] },
  hall: { names: ['HALL OF FAME', 'HALL OF RIVALS'], pieces: [
    { t: 'decal', x: 0, z: 0, c: 1 },
    { t: 'plat', x: 0, z: -13.5, w: 12, d: 6, h: 1.0, look: 'dais', c: 1 }, { t: 'throne', x: 0, z: -15, base: 1.0, c: 1 }, { t: 'stairs', x: 0, z: -9.1, w: 6, len: 2.8, h: 1.0, ry: 180, c: 1 },
    { t: 'mezz', x: 0, z: 15.2, w: 20, d: 4.6, h: 2.4, look: 'gallery', c: 1 }, { t: 'stairs', x: -11.6, z: 15.2, w: 2, len: 3.4, h: 2.4, ry: 90 },
    { t: 'column', x: -8, z: -6.5 }, { t: 'column', x: -8, z: 6.5 }, { t: 'column', x: -16, z: -6.5 }, { t: 'column', x: -16, z: 6.5 },
    { t: 'statue', x: -12, z: 0 }, { t: 'case', x: -20.5, z: -12 }, { t: 'case', x: -20.5, z: 11.5 },
  ] },
  subway: { names: ['UPTOWN', 'DOWNTOWN'], pieces: [
    { t: 'train', x: -6.2, z: -14.6, len: 12, c: 1 }, { t: 'train', x: 6.2, z: -14.6, len: 12, c: 1 },
    { t: 'mezz', x: 0, z: 15.3, w: 16, d: 4.6, h: 2.6, look: 'concrete', c: 1 }, { t: 'stairs', x: -9.6, z: 15.3, w: 2.2, len: 3.4, h: 2.6, ry: 90 },
    { t: 'turnstile', x: 0, z: -7.5, len: 4, ry: 90, c: 1 }, { t: 'turnstile', x: 0, z: 7.5, len: 4, ry: 90, c: 1 },
    { t: 'pillar', x: -8, z: -4 }, { t: 'pillar', x: -8, z: 4 }, { t: 'pillar', x: -16, z: -4 }, { t: 'pillar', x: -16, z: 4 },
    { t: 'bench', x: -12, z: -9.5, len: 3 }, { t: 'bench', x: -12, z: 9.5, len: 3 }, { t: 'kiosk', x: -19.5, z: 10.5 }, { t: 'vend', x: -20.5, z: -9.5 },
  ] },
  alley: { names: ['BACK DOOR', 'SIDE STREET'], pieces: [
    { t: 'truck', x: 0, z: -13.5, c: 1 },
    { t: 'balcony', x: 0, z: 16.4, w: 12, d: 2.4, h: 2.6, c: 1 }, { t: 'stairs', x: -8.2, z: 16.4, w: 1.6, len: 4.4, h: 2.6, ry: 90 },
    { t: 'dumpster', x: -10, z: -8 }, { t: 'dumpster', x: -16, z: 12, ry: 90 }, { t: 'crate', x: -13.4, z: -14.6 }, { t: 'crate', x: -18.4, z: -5 }, { t: 'crate', x: -17.4, z: -5.6 },
    { t: 'stall', x: -12, z: 5.6 }, { t: 'barrel', x: -7.4, z: 9 }, { t: 'barrel', x: -20.5, z: 3.5 }, { t: 'can', x: -6.5, z: -3.5 },
  ] },
  penthouse: { names: ['MASTER SUITE', 'GUEST WING'], pieces: [
    { t: 'island', x: 0, z: -13.5, len: 6, c: 1 }, { t: 'piano', x: 0, z: 13.6, c: 1 },
    { t: 'plat', x: -14, z: -12.5, w: 8, d: 6, h: 0.9, look: 'lounge' }, { t: 'stairs', x: -14, z: -8.6, w: 3, len: 1.8, h: 0.9, ry: 180 },
    { t: 'sofa', x: -15.6, z: -14, base: 0.9 }, { t: 'sofa', x: -12, z: -14, base: 0.9 },
    { t: 'sofa', x: -10.5, z: 6, ry: 90 }, { t: 'hottub', x: -17.5, z: 10.5 }, { t: 'plant', x: -8, z: -4 }, { t: 'plant', x: -8, z: 4 }, { t: 'plant', x: -21, z: -3 },
    { t: 'htable', x: -13, z: 2 },
  ] },
  junkyard: { names: ['THE PIT', 'THE GATE'], pieces: [
    { t: 'craneb', x: 0, z: -14.2, c: 1 },
    { t: 'container', x: 0, z: 14.8, len: 6, c: 1 }, { t: 'stairs', x: -5.4, z: 14.8, w: 2.2, len: 4.8, h: 2.6, ry: 90 },
    { t: 'carstack', x: -9, z: -6 }, { t: 'stairs', x: -9, z: -3.4, w: 2, len: 3.2, h: 2.6, ry: 180 }, { t: 'carstack', x: -15, z: 7, ry: 90 },
    { t: 'tyres', x: -12.5, z: -12 }, { t: 'tyres', x: -7, z: 9 }, { t: 'shack', x: -19.5, z: -12.5 }, { t: 'barrel', x: -20.5, z: 3 },
  ] },
  beach: { names: ['NORTH PIER', 'SOUTH PIER'], pieces: [
    { t: 'lifeguard', x: 0, z: -13, c: 1 }, { t: 'stairs', x: 0, z: -9.3, w: 1.6, len: 4.4, h: 2.3, ry: 180, c: 1 }, { t: 'kiosk', x: 0, z: 14.6, c: 1 },
    { t: 'boat', x: -12, z: -8, ry: 90 }, { t: 'hut', x: -18.5, z: 12.5 }, { t: 'hut', x: -18.5, z: -13 }, { t: 'lounger', x: -8, z: 8 }, { t: 'lounger', x: -6.6, z: 8 },
    { t: 'palm', x: -14, z: 3 }, { t: 'palm', x: -21, z: -5 }, { t: 'boat', x: -11, z: 13.5, ry: 90 },
  ] },
  temple: { names: ['EAST GATE', 'WEST GATE'], pieces: [
    { t: 'shrine', x: 0, z: -13.5, c: 1 }, { t: 'stairs', x: 0, z: -8.7, w: 4, len: 3.6, h: 1.4, ry: 180, c: 1 }, { t: 'torii', x: 0, z: 10, c: 1 },
    { t: 'lantern', x: -8, z: -5 }, { t: 'lantern', x: -8, z: 5 }, { t: 'lantern', x: -14, z: -5 }, { t: 'lantern', x: -14, z: 5 },
    { t: 'rock', x: -18.5, z: -10, w: 2.4, d: 1.8, h: 1.4 }, { t: 'rock', x: -12, z: 12.5, w: 2, d: 1.6, h: 1.1 }, { t: 'snowbank', x: -20.5, z: 2, len: 5, ry: 90 }, { t: 'tree', x: -10, z: -13 },
  ] },
  garage: { names: ['LEVEL B1', 'LEVEL B3'], pieces: [
    { t: 'mezz', x: 0, z: -14.8, w: 22, d: 6, h: 2.0, look: 'concrete', c: 1 }, { t: 'stairs', x: -9, z: -8.8, w: 3, len: 6, h: 2.0, ry: 180, look: 'ramp' },
    { t: 'kiosk', x: 0, z: 13, c: 1 },
    { t: 'car', x: -6.5, z: 3.5 }, { t: 'car', x: -10.5, z: 3.5 }, { t: 'car', x: -17, z: -2 }, { t: 'pillar', x: -6, z: 10 }, { t: 'pillar', x: -14, z: 10 }, { t: 'pillar', x: -14, z: -5 },
    { t: 'jersey', x: -19.5, z: 10.5, len: 4, ry: 90 }, { t: 'jersey', x: -5, z: -3, len: 3 },
  ] },
};
// turn a layout into a map: its pieces placed (and mirrored), their blocks, the bases, the stairs bots can climb
const rotXZ = (x, z, ry) => { const a = ry * Math.PI / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)); return [x * c + z * s, -x * s + z * c]; };
function layoutMap(id) {
  const L = LAYOUTS[id]; if (!L) return null; if (L.map) return L.map;
  const placed = [];
  for (const p of L.pieces) { placed.push(Object.assign({}, p, { ry: p.ry || 0 })); if (!p.c) placed.push(Object.assign({}, p, { x: -p.x, ry: (360 - (p.ry || 0)) % 360, mir: 1 })); }
  const boxes = SQ_BIG.boxes.filter(b => b[5] === 'w').map(b => b.slice()), ramps = [];
  for (const p of placed) { const f = PIECES[p.t]; if (!f) continue;
    for (const b of f(p)) { const [cx, cz] = rotXZ(b[0], b[1], p.ry), q = p.ry % 180 !== 0, w = q ? b[3] : b[2], d = q ? b[2] : b[3];
      let rd = b[6]; if (rd) { const v = rd[0] === 'x' ? [rd[1] === '+' ? 1 : -1, 0] : [0, rd[1] === '+' ? 1 : -1], [vx, vz] = rotXZ(v[0], v[1], p.ry); rd = vx ? (vx > 0 ? 'x+' : 'x-') : (vz > 0 ? 'z+' : 'z-'); }
      const B = [p.x + cx, p.z + cz, w, d, b[4], b[5], rd, b[7] || 0, b[8] || 0]; boxes.push(B);
      if (rd) { const ax = rd[0] === 'x', sg = rd[1] === '+' ? 1 : -1, half = (ax ? w : d) / 2 + 0.7, lo = ax ? [B[0] - sg * half, B[1]] : [B[0], B[1] - sg * half], hi = ax ? [B[0] + sg * half, B[1]] : [B[0], B[1] + sg * half]; ramps.push({ b: B, lo, hi, top: B[4] }); } } }
  return (L.map = { hx: SQ_BIG.hx, hz: SQ_BIG.hz, boxes, ramps, pieces: placed, names: L.names, spawnX: SQ_BIG.spawnX, base: SQ_BIG.base, gen: true, layout: id });
}
