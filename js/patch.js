// ---------- patch notes: what changed, shown once after an update ----------
// The newest patch is first. When someone loads the game for the first time since it changed, a WHAT'S NEW panel
// opens over the title screen with the rundown (Enter, Esc or a tap closes it; the menus can open it again).
const PATCHES = [
  { id: '2.8.5', title: 'SQUADS LOADS PROPERLY', notes: [
    ['SQUADS NO LONGER FREEZES ON LOADING', 'The loading screen could crash on the team cards and freeze the game there. Fixed, and the game now carries on past any single bad frame instead of locking up.'],
    ['FASTER START', 'The loading screen now gets the match ready while it shows (every fighter, the map and its graphics), so the match starts at once instead of freezing for several seconds on its first frame. It lasts 4 s, a little longer only if the match still needs a moment.'],
  ] },
  { id: '2.8.4', title: 'FIGHTS FIXED · A REAL WALL', notes: [
    ['THE CPU FIGHTS BACK', 'Under pressure the CPU used to hold block forever, so fights went nowhere. Now it blocks a couple of times, then hits back or grabs you.'],
    ['YOUR HITS LAND', 'Spamming one attack while tired used to cut its damage to almost nothing (down to a fifth). It still pays to mix it up and keep your stamina, but a hit now always does at least half its damage.'],
    ['THE WALL IS A REAL WALL (1V1)', 'The Wall of Money now stands exactly where it was put, at its real size: nothing gets through its face (walking, dashing, knockbacks, grabs, shots or hits), and you can walk round its ends. Circling no longer slips you through it.'],
  ] },
  { id: '2.8.3', title: 'ROOM TO BREATHE', notes: [
    ['NO MORE STICKING TOGETHER', 'In 1v1 the game used to pull both fighters back together whenever you got more than about 4.7 m apart, so you could never make room. Now you can get up to 10 m apart (the camera pulls out to keep you both in shot), and nobody is ever pulled toward the other.'],
    ['BACKING OFF', 'Walking backwards up close is as quick as walking forwards (it was a lot slower, so whoever chased always caught you).'],
    ['DASH OUT OF ATTACKS', 'A dash now cancels the end of an attack (once its hit is over, or its shot is out) in 1v1 and Squads, so you can always dash away: back, to the side or on the back diagonal. Supers and armoured moves still play out.'],
  ] },
  { id: '2.8.2', title: 'WALL OF MONEY RULES', notes: [
    ['ONE EVERY 30 SECONDS', 'The Prince can only put a Wall of Money down once every 30 s.'],
    ['NOTHING GETS THROUGH', 'Nobody walks, dashes, gets knocked or warps through it, and no shot or hit goes through it, from either side, until it\'s broken down (only the other team\'s hits damage it). In Squads you can still go round the ends.'],
    ['A NEW WALL BREAKS THE OLD ONE', 'Placing a new wall smashes the one that was up.'],
  ] },
  { id: '2.8.1', title: 'FACES · MIKE MIKE · WALL OF MONEY', notes: [
    ['FACES LOAD INSTANTLY', 'Every champion\'s face is on the select screens from the start (the ones without a photo used to be drawn one at a time while you waited).'],
    ['RANGED COOLDOWN FIXED (1V1)', 'The ranged attack\'s cooldown never ran down in 1v1, so it stayed stuck on 4 s after one use. It now recharges in 3.5 s, for everyone.'],
    ['MIKE MIKE BUFFS', 'Headbutt hits harder (19 → 25) and reaches much further (he steps in for it). Stare Step and Head Warp come back much sooner, and Head Warp goes further (up to 20 m in Squads). And his head is bigger.'],
    ['WALL OF MONEY STAYS PUT', 'In 1v1 the wall (and the rain of money, and Bonnie\'s puddles) slid round with the fight. Now it stays exactly where it was put.'],
  ] },
  { id: '2.8', title: 'AIM IT · NEW CHAMPION SELECT', notes: [
    ['AIM YOUR SHOTS (SQUADS)', 'Ranged attacks now go exactly where your crosshair points (up, down, anywhere), instead of snapping to the nearest enemy.'],
    ['AIM YOUR LOBS', 'Candy Splash, bon bons, cookie bombs and the rest: HOLD the key and a ring on the floor shows where it will land, with its arc; aim it anywhere, let go to throw. A quick tap throws it at the crosshair. A lob that hits a wall bursts against it.'],
    ['1V1 LOBS', 'Hold the button: the ring starts on your opponent. Push toward them to send it further, away to bring it nearer, and let go to throw.'],
    ['CHAMPION SELECT, REBUILT', 'Every champion on one screen: a full grid to pick from (arrows, or click), then your champion big in 3D with both sides of the fight, where you choose the skin and lock in. Esc takes you back to the grid. Same in Squads: the grid with your team, then your champion with both teams and LOCK IN.'],
  ] },
  { id: '2.7.2', title: 'SMOOTHER LOADING · REAL THROWS', notes: [
    ['NO MORE LOADING STUTTER', 'Going into the PLAY menu, the select screen and a match no longer freezes: fighters\' shaders are built in the background (and kept, so they\'re never built twice), the PLAY cards no longer force everything to rebuild, and outfits are made several times faster.'],
    ['THEY HOLD WHAT THEY THROW', 'Nothing comes out of a bare fist any more. Frank holds the basketball before he passes it, Bonnie has the bon bon in her hand, the Prince a wad of notes, Cookie King a cookie in each fist (the one he throws leaves his hand), and Triple T and Killian\'s bat and bamboo stay out of their hands until they come back.'],
    ['POCKET ROCKET', 'Tiny D Ryan\'s ranged poke is now a real little rocket, flame and all, launched from his hand.'],
    ['BONNIE', 'New line: "Name is self explanatory."'],
  ] },
  { id: '2.7.1', title: 'FIXES: COOKIE, KILLIAN, NO MORE PHASING', notes: [
    ['COOKIE KING UP CLOSE', 'His cookie punches now land when you\'re right on top of someone (they used to fly straight through). Cookie Bomb steps in and reaches further, so it actually connects.'],
    ['BAMBOO STORM, REMADE', 'Killian vanishes: he\'s striking too fast to see. Tiny cuts whip round the target from every side, then he reappears for the final blow that sends them flying.'],
    ['KILLIAN\'S SHELL', 'His shell is solid from every angle now (it was see-through to the person facing him).'],
    ['NO MORE PHASING', 'Every map: fighters can\'t walk or get knocked through props, benches, pillars and scenery any more. Fast knockbacks are checked step by step so they stop at walls, and a knocked-down body slides out of a wall instead of lying half inside it.'],
  ] },
  { id: '2.7', title: 'KILLIAN MGAPPE', notes: [
    ['KILLIAN MGAPPE · FRONTLINE', 'A built 6\'1" ninja turtle: shell on his back, blue mask, a (made-up) French kit with the number 10, two bamboo sticks, and he only speaks French. Mid damage, a LOT of durability. Second skin: AWAY KIT.'],
    ['FORCEFIELD (ABILITY)', 'He takes NO damage for 10 s, and teammates close by get 30% health back and a 30% shield. Only a super breaks it.'],
    ['SHELL UP (SKILL)', 'Crouches behind his shell: can\'t be staggered for 2.5 s and a 20% shield.'],
    ['BAMBOO THROW (Z)', 'Throws both bamboo sticks, spinning: it hits hard.'],
    ['SHELL SPIN (ABILITY 2)', 'Sits on his shell and spins like mad for over 2 s: you steer it, and everyone it touches gets blasted away.'],
    ['BAMBOO STORM (SUPER)', 'Nine bamboo strikes in a whirl; the last one sends them flying. Finisher: TURTLE POWER.'],
    ['SUPERS, FOR EVERYONE', 'A super can now only be stopped by a PERFECT block (block right as it lands). Block late, or rely on a guard, a shield or a forcefield, and it breaks it and lands anyway. And someone in the middle of their super can\'t be interrupted: only knocked out.'],
  ] },
  { id: '2.6', title: 'BONNIE', notes: [
    ['BONNIE · SUPPORT', '5\'6", blue all over, with a golden Rapunzel braid down to her ankles, in a pink top and a denim skirt. She moves her team about and keeps them alive. Second skin: SUNDRESS.'],
    ['BLUE BON BON (Z)', 'Lobbed: it splashes where it lands and sets anyone of theirs close by on fire.'],
    ['SUGAR RUSH (SKILL)', 'A long candy dash: she and her team close by get faster for 5 s and a little health back.'],
    ['CANDY SPLASH (ABILITY 2)', 'A big bon bon. Where it lands it leaves a puddle for 8 s: your team heals standing in it, theirs burns for a long time. A direct hit on an enemy hurts and sets them alight; on a teammate it heals them.'],
    ['SUGAR HIGH (SUPER)', 'Heals her whole team 35% over 4 s, makes them fast for 6 s, and leaves a big healing puddle at her feet that burns enemies. Finisher: SWEET DREAMS.'],
  ] },
  { id: '2.5', title: 'PRINCE OF PARIS', notes: [
    ['PRINCE OF PARIS · FRONTLINE', '6\'7", slim, blonde hair slicked back, always in a sharp red and black suit. A fast frontline built on combos: tough, but with a thinner shield than the other frontlines (GILDED GUARD). Second skin: NOIR.'],
    ['ROYAL FLURRY (SKILL)', 'Seven hits in two seconds, the last one knocks them flat.'],
    ['DIRTY MONEY (Z)', 'Throws a fistful of notes: it poisons whoever it hits for 3 s.'],
    ['WALL OF MONEY (ABILITY 2)', 'Hold it to see the outline and push it out, let go to drop it: a huge wall of notes that stops their shots and blocks their way until they break it down. It falls apart by itself after 30 s.'],
    ['MAKE IT RAIN (SUPER)', 'A cloud of money over them for 20 s: anyone under it keeps getting stunned and poisoned.'],
    ['FINISHER', 'CHECKMATE IN PARIS.'],
  ] },
  { id: '2.4', title: 'TWO NEW CHAMPIONS', notes: [
    ['MIKE MIKE · FLANK', 'Skinny, fast, silent (he never says a word: ……), and that stare. EYE LASERS (Z): a white beam and a black beam. BIG HEAD (skill): his head swells up huge and he headbutts you. HEAD WARP (ability 2): hold to aim, let go and he\'s instantly there. Cracks shields and guards much faster than anyone. Super, THE STARE: head huge, eyes huge, he lifts up to 5 enemies round him into the air with his mind and slams them all into the floor. Second skin: GREEN SCREEN suit.'],
    ['COOKIE KING · ATTACK', 'Tall, big, and his fists are cookies (every hit throws crumbs). COOKIE SHOT (Z) from range, COOKIE BOMB (skill) blows up in your face and knocks you flat, BELLY CHARGE (ability) runs you over belly-first, COOKIE BARRAGE (ability 2) lobs five cookie bombs that go off where they land. Super, THE LAST BATCH: a belly-slam that knocks down everyone close while a ring of cookie bombs bursts out round him. Second skin: THE KING, with a crown, a robe and an ermine collar.'],
    ['FINISHERS', 'Mike Mike: MIND SLAM. Cookie King: ROYAL CRUMBLE.'],
    ['COOKIE KING: THROWS AND FAT', 'His punches are short cookie throws: they fly a few metres and crumble if they don\'t reach you. Every ability he uses (and every 5-hit combo) makes him fatter; at 5 stacks he can\'t be knocked down, until the next hit puts him back to base fat.'],
  ] },
  { id: '2.3', title: 'BUILT FOR THE PLACE', notes: [
    ['EVERY SQUADS MAP, ITS OWN', 'In 2v2 and up each stage is laid out for what it is: the club has a DJ stage up a flight of stairs, a VIP balcony with booths, a bar and velvet ropes; the gym has a ring in the middle (that\'s the point), bags, racks, treadmills and an office balcony; the court has bleachers; the roof a water tower you can climb... Each team starts in its own named room.'],
    ['HIGH GROUND', 'Stairs, platforms, balconies and bleachers you can climb, stand on, jump onto, fall off and fight from.'],
    ['1V1 STAGES', 'Every 1v1 stage is dressed with its own things round the fight: booths, speakers and velvet ropes in the club, bags and racks in the gym, loungers and palms on the pier...'],
    ['EVEN COMBAT', 'Attack speed comes from reach and size: long reach swings slower, short reach swings faster. Substitution is gone.'],
    ['NEW HUD', 'Every skill, ranged attack, ability and super has its own icon. In 1v1 your meters sit bottom left and your skills bottom right.'],
    ['LOCKED CAMERA', 'In Squads the camera stays locked over your shoulder and you face where it looks. W/S walk forward and back, A/D step sideways (or steer, with no mouse). Turn with the mouse, right stick, arrows or a touch drag; it only tilts a little up or down and settles back on its own (look right up or down in first person, U). Hit someone beside or behind you and it swings round to them.'],
    ['CHAMPION SELECT', 'Squads has its own champion select: START in the lobby opens it for everyone. Your champion stands in the middle, your team down the left, theirs down the right (their picks show once they lock in), 30 seconds on the clock. READY locks you in; once everyone is ready it drops to 3 seconds, and at 0 it starts anyway. T switches team. In the lobby, press R to tell the host you\'re ready.'],
    ['LOADING SCREEN', 'Before every Squads match: both teams\' champion cards, the mode and the map, over a view of the map you\'re about to play.'],
    ['PASSWORDS', 'Set a password in PROFILE → SET PASSWORD. Then on any other computer: TAB on the create-account screen (SIGN IN WITH PASSWORD), type your friend code (NAME#1234) and your password, and your account comes straight across. It needs BP VERSE open on a device you\'re signed in on (your phone counts). Link codes still work too.'],
    ['A REAL CROWD', 'BP Fight Night\'s crowd is two thousand proper fans: bodies, arms, hands, hair and caps, sat down or on their feet. They clap, pump their fists and throw both arms up as the fight heats up, the front rows hold up signs, and when it goes quiet a Mexican wave runs round the arena.'],
    ['NO SPAWN CAMPING', 'In 2v2 and up, after your first KO you come back at a random spot on the map, well away from the other team (never in their base). BP Fight Night keeps its two corners.'],
    ['BUFF ICONS', 'When you\'re shielded or healing, a badge by your health bar shows it, how long it has left and who gave it to you. Your team\'s portraits up top show theirs too.'],
    ['FIRST-PERSON ARMS', 'In first person you can see your own fists (and Triple T\'s bat, Hexumlite\'s sword): up in a guard, out to the sides above the HUD, punching, blocking and bobbing as you move.'],
  ] },
  { id: '2.2', title: 'SKILL OVER SPAM', notes: [
    ['LONG RANGE', 'Every champion has a ranged attack on Z (RANGE on a touch screen): Triple T throws his bat and it comes back to him, Frank throws a chest pass, the rest fire a bolt. 3.5 s cooldown.'],
    ['OUTNUMBERED', 'In Squads, the more enemies hitting you at once, the less damage each of them does, and your super fills faster. Once you get back up you can\'t be knocked straight down again for a moment.'],
    ['STAMINA IN SQUADS', 'Attacks, dashes and jumps use stamina. Spam and your hits go soft.'],
    ['TINY D RYAN', 'Everyone can hit him now: taller champions lean over and aim down at him.'],
    ['NEW SQUADS HUD', 'Health, stamina and super bottom left; every skill as a big button with its key bottom right. Voice chat shows a speaker icon on whoever\'s talking.'],
  ] },
  { id: '2.1', title: 'BIGGER SQUADS', notes: [
    ['EVERY MAP, BIGGER', 'In Squads 3v3 and up, every stage is a big version of itself: the set pushed out into a room four times the size, each team starting in its own walled base at one end, cover in between and the stage\'s fight floor in the middle.'],
    ['FIRST PERSON', 'Press U (or the CAM button on a touch screen) to see the fight from your champion\'s eyes, in Squads and in 1v1. Press it again to go back.'],
    ['CHAMPIONS SCREEN', 'Rebuilt: the roster down the side, and OVERVIEW, MOVES and ROLE tabs with every skill, super, ability, throw and finisher and the key for each. Q / E changes tab.'],
  ] },
  { id: '2.0.1', title: 'CHAMPIONS UPDATE', notes: [
    ['ROLES & COUNTERS', 'Every champion is a Frontline, Support, Flank or Attack. Flank beats Support, Support beats Attack, Attack beats Frontline, Frontline beats Flank. Each role has its own ability (C), and flanks get two (X).'],
    ['NO MORE MASHING', 'Spamming one move goes stale and costs more and more stamina. Run your stamina down and your hits get weaker and your vision blurs. Mix punches and kicks: new combos, and a combo\'s last hit lands harder.'],
    ['GUARD & DODGES', 'Blocking drains a guard bar. Break it and they can\'t block until it refills. Dash or sidestep at the right moment to slip any hit, supers included.'],
    ['SUPERS', 'The super meter fills slower. Frank\'s Black Force hits much harder. BBEL Flake\'s Form Adaptation takes 85% less damage. Timed supers show a countdown bar.'],
    ['HOMING SHOTS', 'Hypno Spiral, Mog Stare and Ay Mayne chase their target, faster but only for about a second and a half. Block them or dodge late.'],
    ['RANKED BANS', 'In ranked, each player bans a champion before picking.'],
    ['ONE ACCOUNT, EVERY DEVICE', 'Profile > LINK A DEVICE shows a code. Type it on your phone or school computer and your account comes with you. Linked devices keep each other up to date.'],
    ['MAPS', 'The Skyline Penthouse opens onto a terrace over the city. New Squads map BP DISTRICT: a whole city block, each team starting in its own base at opposite ends, a plaza in the middle and a minimap.'],
    ['SQUADS', 'Out of the fight you heal very slowly. Role abilities and counters work in Squads: shields and heals reach teammates close by.'],
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
