// ---------- patch notes: what changed, shown once after an update ----------
// The newest patch is first. When someone loads the game for the first time since it changed, a WHAT'S NEW panel
// opens over the title screen with the rundown (Enter, Esc or a tap closes it; the menus can open it again).
const PATCHES = [
  { id: '2.0.1', title: 'CHAMPIONS UPDATE', notes: [
    ['ROLES & COUNTERS', 'Every champion is a Frontline, Support, Flank or Attack. Flank beats Support, Support beats Attack, Attack beats Frontline, Frontline beats Flank. Each role has its own ability (C), and flanks get two (X).'],
    ['NO MORE MASHING', 'Spamming one move goes stale and costs more and more stamina. Run your stamina down and your hits get weaker and your vision blurs. Mix punches and kicks: new combos, and a combo\'s last hit lands harder.'],
    ['GUARD & DODGES', 'Blocking drains a guard bar. Break it and they can\'t block until it refills. Dash or sidestep at the right moment to slip any hit, supers included.'],
    ['SUPERS', 'The super meter fills slower. Frank\'s Black Force hits much harder. BBEL Flake\'s Form Adaptation takes 85% less damage. Timed supers show a countdown bar.'],
    ['HOMING SHOTS', 'Hypno Spiral, Mog Stare and Ay Mayne chase their target, faster but only for about a second and a half. Block them or dodge late.'],
    ['RANKED BANS', 'In ranked, each player bans a champion before picking.'],
    ['ONE ACCOUNT, EVERY DEVICE', 'Profile > LINK A DEVICE shows a code. Type it on your phone or school computer and your account comes with you. Linked devices keep each other up to date.'],
    ['MAPS', 'The Skyline Penthouse opens onto a terrace over the city. New Squads map BP DISTRICT: a whole city block, each team starting in its own base at opposite ends, a plaza in the middle and a minimap.'],
    ['SQUADS', 'Out of the fight you run at travel speed (Verity turns to shadow, Darren blinks ahead) and heal very slowly. Role abilities and counters work in Squads: shields and heals reach teammates close by.'],
    ['ALSO', 'Item stands are solid. Players online and friend requests show in the top right. Champions instead of characters. Built by Han.'],
  ] },
  { id: '1.9', title: 'FIGHT NIGHT', notes: [
    ['BP FIGHT NIGHT', 'A special octagon map: walkouts, a referee, three rounds, the judges\' scorecards and more health.'],
    ['STAMINA', 'Attacks, dashes and jumps use stamina. Run out and you slow down.'],
  ] },
];
const PATCHN = { open: false, k: 0 };
function patchCheck() { let seen = null; try { seen = localStorage.getItem('f1223.patch'); } catch (e) {} if (seen !== PATCHES[0].id) { PATCHN.open = true; PATCHN.k = 0; } }
function patchClose() { PATCHN.open = false; try { localStorage.setItem('f1223.patch', PATCHES[0].id); } catch (e) {} sfx('confirm'); }
function patchPress(code) { if (!PATCHN.open || !['title', 'mode', 'play'].includes(screen)) return false; if (isOk(code) || code === 'Escape' || code === '__patch') patchClose(); return true; }
function drawPatch() {
  if (!PATCHN.open || !['title', 'mode', 'play'].includes(screen)) return;
  PATCHN.k = Math.min(1, PATCHN.k + 0.06); const k = easeOut(PATCHN.k), P0 = PATCHES[0], x = W / 2 - 330, y = 40 + (1 - k) * 30, w = 660, h = 460;
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(2,4,8,0.72)'; ctx.fillRect(0, 0, W, H);
  uiPanel(x, y, w, h, { accent: '#ffd23f', accentTop: 1, alpha: 0.96, glow: '#ffd23f' });
  capsText('WHAT\'S NEW  ·  PATCH ' + P0.id, x + 26, y + 26, 11, '#ffd23f', { weight: 900, track: 5 }); chromeText(P0.title, x + 24, y + 56, 30, { weight: 900, glow: 'rgba(255,210,60,0.5)' });
  // two columns of notes
  const cw = (w - 70) / 2, col = [y + 92, y + 92]; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  P0.notes.forEach(([hd, tx], n) => { ctx.font = '10.5px ' + BODY; tracked(0); const lines = []; let line = ''; for (const wd of tx.split(' ')) { const t2 = line + wd + ' '; if (ctx.measureText(t2).width > cw && line) { lines.push(line); line = wd + ' '; } else line = t2; } lines.push(line);
    const c = col[0] <= col[1] ? 0 : 1, cx = x + 26 + c * (cw + 18), yy = col[c];
    capsText(hd, cx, yy, 9, UI.blueHi, { weight: 900, track: 3 }); ctx.font = '10.5px ' + BODY; tracked(0); ctx.fillStyle = 'rgba(232,238,248,0.88)'; ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, cx, yy + 14 + i * 13)); col[c] += 22 + lines.length * 13; });
  hit(0, 0, W, H, ['__patch']);
  capsText('ENTER / TAP TO CONTINUE', x + w / 2, y + h - 18, 10, 'rgba(255,255,255,0.7)', { align: 'center', weight: 800, track: 4 });
  ctx.restore();
}
addEventListener('load', patchCheck);
