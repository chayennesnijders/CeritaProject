// Render CeritaProject animations to MP4 (1080x1920, 30 fps, no audio).
//   node tools/social/anim/render.cjs SPECS.js OUT_DIR [id,id,...] [--stills t1,t2,...]
// SPECS.js sets window.ALL = { id: spec, ... }; each spec has dur, actors, props, captions (see engine.html).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const si = args.indexOf('--stills');
  const stills = si >= 0 ? args.splice(si, 2)[1].split(',').map(Number) : null;
  const [specFile, outDir, only] = args;
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.addInitScript({ path: path.resolve(specFile) });
  await p.goto('file://' + path.join(__dirname, 'engine.html'));
  await p.evaluate(() => document.fonts.ready);
  const ids = only ? only.split(',') : await p.evaluate(() => Object.keys(window.ALL));
  for (const id of ids) {
    const dur = await p.evaluate((x) => { window.SPEC = window.ALL[x]; return window.SPEC.dur; }, id);
    if (stills) {
      for (const t of stills) {
        await p.evaluate((x) => window.render(x), t);
        await p.screenshot({ path: path.join(outDir, `${id}-${t}.png`) });
      }
      continue;
    }
    const dir = path.join(outDir, `${id}.frames`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    const n = Math.round(dur * 30);
    for (let i = 0; i < n; i++) {
      await p.evaluate((x) => window.render(x), i / 30);
      await p.screenshot({ path: `${dir}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    }
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', `${dir}/f%05d.jpg`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', path.join(outDir, `${id}.mp4`)]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('ok', id, n, 'frames');
  }
  await b.close();
})();
