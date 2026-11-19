// Plain text slides (TikTok photo mode, 1080x1920) in three colours: cream, pink and dark brown.
//   node tools/social/tekst/render.cjs WEEK.json OUT_DIR
// WEEK.json: { posts: [{ id, slides: [{ kind: "hook"|"body"|"cta"|"app", text }] }] }
// In a text, *word* becomes a pink keyword button; a blank line starts a new paragraph.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const FONTS = path.join(__dirname, '..', 'fonts');
const C = { cream: '#F7EDE1', pink: '#F2A6BF', ink: '#1E1615' };
const THEME = { hook: ['pink', 'ink'], body0: ['cream', 'ink'], body1: ['ink', 'cream'], cta: ['pink', 'ink'], app: ['ink', 'cream'] };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rich = (s) => s.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\*([^*]+)\*/g, '<span class="kw">$1</span>').replace(/\n/g, '<br>')}</p>`).join('');

function page(slide, i, n, body) {
  const [bg, fg] = THEME[slide.kind === 'body' ? `body${body % 2}` : slide.kind];
  const hook = slide.kind === 'hook';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:U;font-weight:800;src:url('file://${FONTS}/unbounded-latin-800-normal.woff2')}
@font-face{font-family:F;font-weight:800;src:url('file://${FONTS}/figtree-latin-800-normal.woff2')}
@font-face{font-family:F;font-weight:600;src:url('file://${FONTS}/figtree-latin-600-normal.woff2')}
html,body{margin:0;width:1080px;height:1920px;background:${C[bg]};color:${C[fg]};overflow:hidden}
.wrap{position:absolute;left:96px;right:96px;top:300px;bottom:420px;display:flex;flex-direction:column;justify-content:center}
#t{font-family:${hook ? 'U' : 'F'};font-weight:800;line-height:1.18;letter-spacing:${hook ? '-0.02em' : '0'}}
#t p{margin:0 0 .55em}#t p:last-child{margin:0}
.kw{display:inline-block;background:${C.pink};color:${C.ink};border:6px solid ${C.ink};border-radius:999px;padding:.02em .45em;box-shadow:8px 8px 0 ${C.ink};font-family:U;letter-spacing:.02em}
${bg === 'pink' ? `.kw{background:${C.cream}}` : ''}
.top{position:absolute;top:150px;left:96px;right:96px;display:flex;justify-content:space-between;font-family:F;font-weight:800;font-size:40px;opacity:.8}
.swipe{position:absolute;bottom:330px;left:96px;font-family:F;font-weight:800;font-size:38px;opacity:.8}
</style></head><body>
<div class="top"><span>CeritaProject</span><span>${i + 1}/${n}</span></div>
<div class="wrap"><div id="t">${rich(slide.text)}</div></div>
${i === 0 ? '<div class="swipe">Swipe →</div>' : ''}
</body></html>`;
}

(async () => {
  const [file, outDir] = process.argv.slice(2);
  const week = JSON.parse(fs.readFileSync(file, 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const post of week.posts) {
    const dir = path.join(outDir, post.id);
    fs.mkdirSync(dir, { recursive: true });
    let body = 0;
    for (let i = 0; i < post.slides.length; i++) {
      const s = post.slides[i];
      // load from a file so the local fonts are allowed
      const tmp = path.join(dir, '.slide.html');
      fs.writeFileSync(tmp, page(s, i, post.slides.length, body));
      await p.goto('file://' + path.resolve(tmp));
      if (s.kind === 'body') body++;
      await p.evaluate(() => document.fonts.ready);
      // biggest font size that fits the text area
      await p.evaluate((hook) => {
        const t = document.getElementById('t'), w = t.parentElement;
        let size = hook ? 124 : 96;
        t.style.fontSize = size + 'px';
        while ((t.scrollHeight > w.clientHeight || t.scrollWidth > w.clientWidth) && size > 40) { size -= 2; t.style.fontSize = size + 'px'; }
      }, s.kind === 'hook');
      await p.screenshot({ path: path.join(dir, `${i + 1}.png`) });
      fs.rmSync(tmp);
    }
    console.log('ok', post.id, post.slides.length);
  }
  await b.close();
})();
