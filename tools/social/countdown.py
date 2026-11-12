"""Countdown slideshows: "Nog 48 dagen tot oud & nieuw", one question a day (TikTok photo mode, 3:4).

Usage: python3 tools/social/countdown.py OUTDIR FROM [TO]
  FROM/TO are YYYY-MM-DD; for every day a folder OUTDIR/<day>/ with 1.png .. 4.png and caption.txt.
The questions come from src/lib/countdown.ts (the same ones wait in the app's diary).
Style "ECHT.": big Anton capitals, light and dark slides in turn. Slides: 1 the countdown, 2 "DAG 03.",
3 the question, 4 "Deel je antwoord in de reacties" + the app.
"""
import datetime as dt
import json
import math
import os
import re
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONT = os.path.join(os.path.dirname(__file__), "fonts", "Figtree.ttf")
W, H = 1080, 1440
BG = (30, 18, 23)
PINK = (242, 162, 184)
CREAM = (251, 241, 234)
MUTED = (205, 175, 185)
RIGHT = 150  # TikTok's buttons sit on the right


def font(size, weight=b"ExtraBold"):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def wrap(text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if cur and f.getlength(t) > maxw:
            lines.append(cur)
            cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def fit(text, maxw, maxh, start, weight, lh=1.15, minsize=44):
    s = start
    while s > minsize:
        if len(wrap(text, font(s, weight), maxw)) * s * lh <= maxh:
            return s
        s -= 4
    return minsize


LIGHT = (247, 243, 240)
INKC = (17, 12, 14)
ANTON = os.path.join(os.path.dirname(__file__), "fonts", "Anton.woff")
M = 96  # side margin
TEXTW = W - M - RIGHT - 40


def anton(size):
    return ImageFont.truetype(ANTON, size)


def fit_anton(text, maxw, maxh, start, lh=1.02, minsize=70):
    s = start
    while s > minsize:
        lines = wrap(text, anton(s), maxw)
        # Also a single long word ("VALENTIJNSDAG.") must fit the width.
        if len(lines) * s * lh <= maxh and max(anton(s).getlength(ln) for ln in lines) <= maxw:
            return s
        s -= 6
    return minsize


def base(dark):
    if not dark:
        return Image.new("RGB", (W, H), LIGHT)
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    ImageDraw.Draw(glow).ellipse((W * 0.1, H * 0.25, W * 0.9, H * 0.75), fill=(58, 30, 40))
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(160)), 1.0)


def frame(im, dark, k, n=4):
    """ECHT. mark top left and the slide counter bottom left."""
    d = ImageDraw.Draw(im)
    col = CREAM if dark else INKC
    d.text((M, 92), "ECHT.", font=font(54, b"ExtraBold"), fill=col)
    d.text((M, H - 130), f"{k:02d} / {n:02d}", font=font(34, b"SemiBold"), fill=col)
    return d


def block(d, text, size, y, color, lh=1.02):
    f = anton(size)
    for i, ln in enumerate(wrap(text, f, TEXTW)):
        d.text((M, y + i * size * lh), ln, font=f, fill=color)
    return y + len(wrap(text, f, TEXTW)) * size * lh


def stroke(d, x, y, w, color):
    """A quick hand-drawn underline."""
    pts = [(x + i * w / 20, y + 10 * math.sin(i / 20 * math.pi) - i * 0.6) for i in range(21)]
    d.line(pts, fill=color, width=12, joint="curve")


def slide_cover(c):
    im = base(False); d = frame(im, False, 1)
    text = (c["headline"] + ".").upper()
    size = fit_anton(text, TEXTW, 760, 230)
    lines = len(wrap(text, anton(size), TEXTW))
    y = (H - lines * size * 1.02) / 2 - 60
    end = block(d, text, size, y, INKC)
    stroke(d, M, end + 90, 460, INKC)
    sub = font(40, b"Medium")
    for i, ln in enumerate(wrap("Elke dag één vraag. Geen goed of fout antwoord.", sub, TEXTW - 120)):
        d.text((M, end + 165 + i * 54), ln, font=sub, fill=(70, 60, 64))
    return im


def slide_day(c):
    im = base(True); d = frame(im, True, 2)
    label = f"DAG {c['day']:02d}."
    size = 300
    while anton(size).getlength(label) > TEXTW:
        size -= 10
    y = block(d, label, size, H / 2 - size * 0.75, CREAM) + 40
    d.text((M, y + 30), f"van de {c['total']}", font=font(44, b"SemiBold"), fill=PINK)
    d.text((M, y + 100), "Lees de vraag. Neem even de tijd.", font=font(40, b"Medium"), fill=MUTED)
    return im


def slide_question(c):
    im = base(False); d = frame(im, False, 3)
    text = c["question"].upper()
    size = fit_anton(text, TEXTW, 900, 170)
    lines = len(wrap(text, anton(size), TEXTW))
    block(d, text, size, (H - lines * size * 1.02) / 2 - 30, INKC)
    return im


def slide_cta(c):
    im = base(True); d = frame(im, True, 4)
    end = block(d, "DEEL JE ANTWOORD IN DE REACTIES.", 150, 430, CREAM)
    f = font(42, b"SemiBold")
    y = end + 60
    for ln in wrap("Of schrijf het op in je eigen dagboek in de CeritaProject-app. Daar staat elke dag de vraag voor je klaar.", f, TEXTW):
        d.text((M, y), ln, font=f, fill=MUTED); y += 56
    d.text((M, y + 30), "Wachtlijst: link in bio", font=font(44, b"Bold"), fill=PINK)
    d.text((M, H - 200), "een initiatief van CeritaProject", font=font(32, b"Medium"), fill=MUTED)
    return im


def questions_for(days):
    """Ask the app's own module (one source of truth) for each day, in one node call."""
    js = (
        "import('" + os.path.join(ROOT, "src/lib/countdown.ts").replace("\\", "/") + "')"
        ".then(m=>console.log(JSON.stringify(process.argv.slice(1).map(d=>m.countdownFor(d)))))"
    )
    out = subprocess.run(["npx", "--yes", "tsx", "-e", js, *days], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])


def caption(c):
    tag = "#oudennieuw" if c["id"] == "oud-en-nieuw" else "#valentijn"
    return (
        f"{c['emoji']} {c['headline']}. Dag {c['day']}/{c['total']}: {c['question']}\n\n"
        "Schrijf je antwoord in de reacties, of bewaar het voor jezelf in je dagboek in de CeritaProject-app 💛 "
        "Wachtlijst: link in bio\n\n"
        f"#ceritaproject #journaling #dagboek #vragen {tag} #jezelf #mentalegezondheid #fyp #voorjou"
    )


def main():
    out, a = sys.argv[1], sys.argv[2]
    b = sys.argv[3] if len(sys.argv) > 3 else a
    d0, d1 = dt.date.fromisoformat(a), dt.date.fromisoformat(b)
    days = [(d0 + dt.timedelta(days=i)).isoformat() for i in range((d1 - d0).days + 1)]
    for day, c in zip(days, questions_for(days)):
        if not c:
            continue
        folder = os.path.join(out, day)
        os.makedirs(folder, exist_ok=True)
        for i, fn in enumerate([slide_cover, slide_day, slide_question, slide_cta], 1):
            fn(c).save(os.path.join(folder, f"{i}.png"), optimize=True)
        with open(os.path.join(folder, "caption.txt"), "w") as f:
            f.write(caption(c))
        print(day, c["headline"], "|", c["question"])

if __name__ == "__main__":
    main()
