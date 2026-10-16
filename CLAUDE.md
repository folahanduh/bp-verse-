# Fighter 1223 / BP VERSE: project rules

## Design rules (from the owner, always apply)
- **Weapons and items are real.** Every character who throws or uses a thing in a special, ability, ranged poke or
  super must visibly HAVE that thing on them (in the hand, on the back...) during the move, and must throw or use
  that actual item. Nothing appears out of a bare fist. When adding a character or a move:
  - give it a held mesh (js3d/human.js `HELD_OF` + `buildHeld`, or a permanent prop like Tung's bat, Killian's
    bamboo, Cookie King's cookies), shown from the move's start until its release frame and hidden while it's in
    the air;
  - give the projectile a matching 3D mesh (js3d/render3d.js `projMesh`), not a generic glowing bolt.
  Energy, magic, stares and eye lasers are not items and need no prop.
- Characters inspired by real people are fictional or stylised: no real logos, no Diddy / "Biddy" baby-oil or
  dungeon content.

## Before every push (no exceptions)
Play the game, not just the change: run full matches and compare with the previous build when behaviour changes.
- 1v1: CPU vs CPU over every champion (no errors, matches finish, finishers fire), AND a player-controlled fighter
  against the CPU (you can deal damage, the CPU attacks back).
- Squads: bots vs bots and a player against bots (damage both ways, abilities fire).
- Whatever the change touched (aiming, walls, select screens...) with its own targeted test.

## Working conventions
- Every pushed change bumps `version.json` (`{"build": "<Europe/London timestamp>"}`) and adds a patch-notes entry at
  the top of `PATCHES` in js/patch.js.
- js/*.js are classic scripts sharing globals; js3d/*.js are ES modules. Check modules with
  `cp file x.mjs && node --check x.mjs`.
- Never put a `//` comment in the middle of a one-line code chain: it swallows the rest of the line. Use `/* */`.
- Fighters without a photo have a portrait rendered from their 3D model saved as `faces/<id>.png`. Regenerate them
  (`python3 -m http.server 8765` then `node tools/make-portraits.cjs`) whenever one of those fighters' looks change.
- Things placed on the 1v1 floor (walls, zones, puddles) must be pinned to the world (`pinWorld` in js/prince.js):
  the 3D arena's fight line turns and slides, so plain line coordinates drift with the fighters.
- Shaders: never add or remove lights at runtime (the light count is part of every shader's key, so it recompiles
  everything); reuse the rig / select-scene lights. Don't dispose fighter materials (that deletes shaders the next
  fighter needs). New fighter models go through `warmHuman` so their shaders compile in the background.
