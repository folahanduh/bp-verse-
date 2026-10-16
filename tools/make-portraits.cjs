// Renders the portrait of every fighter without a photo (from their 3D model, the same shot the game would take) and
// saves it as faces/<id>.png, so the select screens show their faces straight away instead of rendering them while
// you wait. Run it again whenever one of those fighters' looks changes.
//   python3 -m http.server 8765 &   (from the repo root)
//   node tools/make-portraits.cjs [http://127.0.0.1:8765/index.html]
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8765/index.html';
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const b = await pw.chromium.launch(Object.assign({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe));
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await pg.goto(url);
  await pg.waitForFunction(() => window.LOAD && LOAD.done && screen === 'title', null, { timeout: 600000 });
  const ids = await pg.evaluate(() => { R3D.setQuality(3); return CHARS.filter(c => c.noPhoto).map(c => c.id); });
  for (const id of ids) {
    const data = await pg.evaluate(async id => { const ci = CHARS.findIndex(c => c.id === id); const p = R3D.portrait(ci);
      for (let i = 0; i < 400; i++) { R3D.tickJobs(true); const r = await Promise.race([p, new Promise(res => setTimeout(() => res(null), 50))]); if (r) return r; }
      return null; }, id);
    if (!data) { console.log('no portrait for', id); continue; }
    fs.writeFileSync(path.join(__dirname, '..', 'faces', id + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved faces/' + id + '.png');
  }
  await b.close();
})();
