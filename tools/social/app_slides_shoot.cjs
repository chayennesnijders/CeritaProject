// Screenshots the HTML pages app_slides.py wrote (one PNG per slide). Usage: node app_slides_shoot.cjs OUT_DIR [prefix]
const fs = require('fs');
const { chromium } = require('playwright');
const D = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const only = process.argv[3];
  const files = fs.readdirSync(D + '/html').filter((f) => f.endsWith('.html') && (!only || f.startsWith(only)));
  for (const f of files) {
    const kind = f.includes('-tiktok') ? 'tiktok' : 'instagram';
    const name = f.replace(/-(tiktok|instagram)\.html$/, '');
    const p = await b.newPage({ viewport: { width: 1080, height: kind === 'tiktok' ? 1440 : 1350 } });
    await p.goto('file://' + D + '/html/' + f);
    await p.evaluate(() => document.fonts.ready);
    const out = `${D}/${name}`;
    fs.mkdirSync(out, { recursive: true });
    const els = await p.$$('section.s');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${out}/${kind === 'tiktok' ? '' : 'ig-'}${i + 1}.png` });
    await p.close();
  }
  await b.close();
  console.log('shot', files.length);
})();
