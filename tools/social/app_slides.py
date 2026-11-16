"""
CeritaProject slideshows in the app's own look (creme, black, logo-pink, Unbounded + Figtree, cards with a
hard shadow, Riti). Used for the 3 daily posts: herkenning + verbinding, an oproep, and a real story.

  python3 tools/social/app_slides.py SPECS_DIR OUT_DIR

Each spec (JSON) has `kind` (herkenning | oproep | verhaal) and `slides`: a list of
["cover", text, sub] · ["big", text, "1."] · ["note", title, body] · ["list", heading, [[line, explanation], ...]]
· ["join", ask, KEYWORD, note] · ["cta", head, body, line] (always last: "Zet je op de wachtlijst" + Link in bio).
Writes OUT_DIR/<spec name>/1.png… (TikTok 3:4) and ig-1.png… (Instagram 4:5) through Playwright.
"""
import json, glob, os, html, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = HERE + "/fonts"
RITI_DIR = HERE + "/riti"
APP_RITI = os.path.abspath(HERE + "/../../public/riti")
RITI = {
    "blij": f"{RITI_DIR}/blij.webp", "zwaai": f"{RITI_DIR}/zwaai.webp", "vraag": f"{RITI_DIR}/vraag.webp", "hart": f"{RITI_DIR}/hart.webp",
    "denkend": f"{APP_RITI}/denkend.webp", "troost": f"{APP_RITI}/troostend.webp", "verdrietig": f"{APP_RITI}/verdrietig.webp",
}
COVER = {"herkenning": "denkend", "verbinding": "troost", "verhaal": "verdrietig", "oproep": "blij"}
LABEL = {"herkenning": "Herken je dit?", "verbinding": "Voor jou", "verhaal": "Echt verhaal", "oproep": "Gezocht"}
CREAM, CARD, INK, PINK, COCOA = "#F7EDE1", "#FDF8F2", "#1E1615", "#F2A6BF", "#6B4A35"


def face(fam, f, w):
    return "@font-face{font-family:'%s';font-weight:%d;src:url('file://%s') format('woff2')}" % (fam, w, f)


CSS = "".join(
    [face("Unbounded", f"{FONTS}/unbounded-latin-{w}-normal.woff2", w) for w in (500, 700, 800)]
    + [face("Figtree", f"{FONTS}/figtree-latin-{w}-normal.woff2", w) for w in (500, 600, 700, 800, 900)]
) + """
*{box-sizing:border-box;margin:0} body{margin:0}
.s{width:1080px;height:var(--h);position:relative;overflow:hidden;font-family:Figtree;color:INK;padding:96px 88px 130px;display:flex;flex-direction:column}
.cream{background:CREAM} .pink{background:PINK} .ink{background:INK;color:CREAM}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{font-family:Unbounded;font-weight:800;font-size:34px;letter-spacing:-.02em}
.chip{font-weight:800;font-size:26px;text-transform:uppercase;letter-spacing:.08em;padding:10px 22px;border-radius:999px;border:3px solid INK;background:CARD}
.ink .chip{background:transparent;border-color:PINK;color:PINK}
.count{position:absolute;left:88px;bottom:66px;font-weight:700;font-size:28px;opacity:.7}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:44px}
h1{font-family:Unbounded;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.hl{background:PINK;padding:0 .12em;border-radius:.2em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.card{background:CARD;border:4px solid INK;border-radius:44px;box-shadow:14px 14px 0 INK;padding:64px 60px}
.num{display:inline-grid;place-items:center;width:108px;height:108px;border-radius:999px;background:INK;color:PINK;font-family:Unbounded;font-weight:800;font-size:52px}
.big{font-family:Unbounded;font-weight:700;letter-spacing:-.02em;line-height:1.2}
.body{font-size:42px;line-height:1.4;font-weight:600}
.sub{font-size:38px;line-height:1.4;font-weight:600;color:COCOA}
.riti{position:absolute;right:36px;bottom:24px;width:380px;height:380px;object-fit:contain}
.swipe{align-self:flex-start;background:INK;color:PINK;font-weight:800;font-size:34px;padding:18px 34px;border-radius:999px}
.btn{align-self:flex-start;background:PINK;color:INK;font-family:Unbounded;font-weight:800;font-size:54px;padding:30px 56px;border-radius:999px;box-shadow:10px 10px 0 CREAM}
""".replace("PINK", PINK).replace("INK", INK).replace("CREAM", CREAM).replace("CARD", CARD).replace("COCOA", COCOA)


def esc(t):
    return html.escape(t)


def fit(text, base, short, long):
    n = len(text)
    return int(base * (1 if n <= short else max(0.6, 1 - (n - short) / (long - short) * 0.4)))


def marked(t):
    """Mark the last words in pink, like the highlight marker in the app."""
    w = t.split(" ")
    if len(w) < 4:
        return esc(t)
    k = max(2, len(w) // 3)
    return esc(" ".join(w[:-k])) + ' <span class="hl">' + esc(" ".join(w[-k:])) + "</span>"


def slide(kind, i, n, bg, inner, riti=None):
    r = f'<img class="riti" src="file://{RITI[riti]}">' if riti else ""
    return (
        f'<section class="s {bg}"><div class="top"><span class="brand">CeritaProject</span>'
        f'<span class="chip">{LABEL[kind]}</span></div><div class="main">{inner}</div>{r}'
        f'<span class="count">{i:02d} / {n:02d}</span></section>'
    )


def render(spec):
    k, sl = spec["kind"], spec["slides"]
    n = len(sl)
    out = []
    for i, (t, *a) in enumerate(sl, 1):
        bg = "cream" if i % 2 else "pink"
        if t == "cover":
            inner = (
                f'<h1 style="font-size:{fit(a[0], 100, 30, 75)}px;max-width:900px">{marked(a[0])}</h1>'
                f'<p class="sub" style="max-width:560px">{esc(a[1].replace(" Swipe →", ""))}</p><span class="swipe">Swipe →</span>'
            )
            out.append(slide(k, i, n, "cream", inner, COVER[k]))
        elif t == "list":
            rows = "".join(
                f'<div style="display:flex;gap:28px;align-items:flex-start;margin-top:34px"><span class="num" style="flex:none;width:84px;height:84px;font-size:40px">{j}</span>'
                f'<div><p class="big" style="font-size:44px">{esc(h)}</p><p class="sub" style="font-size:34px;margin-top:8px">{esc(b)}</p></div></div>'
                for j, (h, b) in enumerate(a[1], 1))
            inner = f'<div class="card"><span class="chip" style="background:{PINK}">{esc(a[0])}</span>{rows}</div>'
            out.append(slide(k, i, n, bg, inner))
        elif t == "join":
            inner = (f'<div class="card"><p class="big" style="font-size:58px">{esc(a[0])}</p>'
                     f'<p style="margin-top:36px;display:inline-block;background:{INK};color:{PINK};font-family:Unbounded;font-weight:800;font-size:64px;padding:22px 44px;border-radius:999px">{esc(a[1])}</p>'
                     f'<p class="sub" style="margin-top:32px">{esc(a[2])}</p></div><div style="height:240px"></div>')
            out.append(slide(k, i, n, bg, inner, "zwaai"))
        elif t == "big":
            inner = (
                f'<div class="card"><span class="num">{esc(a[1].rstrip("."))}</span>'
                f'<p class="big" style="margin-top:40px;font-size:{fit(a[0], 74, 30, 70)}px">{esc(a[0])}</p></div>'
            )
            out.append(slide(k, i, n, bg, inner))
        elif t == "note":
            ask = i == n - 1
            body = f'<p class="sub" style="margin-top:28px">{esc(a[1])}</p>' if len(a) > 1 and a[1] else ""
            inner = f'<div class="card"><p class="big" style="font-size:{fit(a[0], 66, 40, 120)}px">{esc(a[0])}</p>{body}</div>'
            if ask:
                inner += '<div style="height:260px"></div>'
            out.append(slide(k, i, n, bg, inner, ("hart" if k == "verbinding" else "vraag") if ask else None))
        else:
            inner = (
                f'<h1 style="font-size:88px;color:{PINK}">Zet je op de wachtlijst.</h1>'
                f'<span class="btn">Link in bio →</span>'
                f'<p class="body" style="color:#F3E6DA">{esc(a[1])}</p>'
                f'<p style="font-size:32px;font-weight:700;color:{PINK}">Volg @ceritaproject voor elke dag nieuwe posts</p>'
            )
            out.append(slide(k, i, n, "ink", inner))
    return out


def main():
    specs, out = sys.argv[1], os.path.abspath(sys.argv[2])
    os.makedirs(out + "/html", exist_ok=True)
    for f in sorted(glob.glob(specs + "/*.json")):
        spec = json.load(open(f))
        name = os.path.basename(f)[:-5]
        for kind, h in (("tiktok", 1440), ("instagram", 1350)):
            page = ('<!doctype html><html><head><meta charset="utf-8"><style>' + CSS + ".s{--h:%dpx}" % h
                    + "</style></head><body>" + "".join(render(spec)) + "</body></html>")
            open(f"{out}/html/{name}-{kind}.html", "w").write(page)
    subprocess.run(["node", HERE + "/app_slides_shoot.cjs", out], check=True)


if __name__ == "__main__":
    main()
