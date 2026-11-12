"""Countdown slideshows: "Nog 48 dagen tot oud & nieuw", one question a day (TikTok photo mode, 3:4).

Usage: python3 tools/social/countdown.py OUTDIR FROM [TO]
  FROM/TO are YYYY-MM-DD; for every day a folder OUTDIR/<day>/ with 1.png .. 4.png and caption.txt.
The questions come from src/lib/countdown.ts (the same ones wait in the app's diary).
Slides: 1 the countdown, 2 "DAG 3", 3 the question, 4 the call to action with Riti.
"""
import datetime as dt
import json
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


def base():
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    ImageDraw.Draw(glow).ellipse((W * 0.1, H * 0.25, W * 0.9, H * 0.75), fill=(58, 30, 40))
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(160)), 1.0)


def centered(d, lines, f, color, y_mid, lh):
    step = int(f.size * lh)
    y = y_mid - step * len(lines) / 2
    cx = (W - RIGHT) / 2 + RIGHT / 4
    for ln in lines:
        d.text((cx - f.getlength(ln) / 2, y), ln, font=f, fill=color)
        y += step
    return y


def watermark(d):
    f = font(30, b"SemiBold")
    t = "CeritaProject"
    d.text(((W - f.getlength(t)) / 2, H - 90), t, font=f, fill=(150, 110, 122))


def slide_cover(c):
    im = base(); d = ImageDraw.Draw(im)
    m = re.match(r"Nog (\d+) (dagen|dag) tot (.+)", c["headline"])
    if m:
        n, unit, to = m.groups()
        fn = font(260); y = H * 0.36
        d.text(((W - RIGHT / 2 - fn.getlength(n)) / 2, y - 150), n, font=fn, fill=PINK)
        f2 = font(fit(f"{unit} tot {to}".upper(), W - RIGHT - 160, 300, 110, b"ExtraBold"))
        end = centered(d, wrap(f"{unit} tot {to}".upper(), f2, W - RIGHT - 160), f2, PINK, H * 0.56, 1.1)
    else:
        f2 = font(fit(c["headline"].upper(), W - RIGHT - 160, 420, 120, b"ExtraBold"))
        end = centered(d, wrap(c["headline"].upper(), f2, W - RIGHT - 160), f2, PINK, H * 0.47, 1.1)
    fs = font(46, b"SemiBold")
    sub = "elke dag één vraag voor jezelf"
    d.text(((W - RIGHT / 2 - fs.getlength(sub)) / 2, end + 40), sub, font=fs, fill=CREAM)
    watermark(d)
    return im


def slide_day(c):
    im = base(); d = ImageDraw.Draw(im)
    f = font(150)
    centered(d, [f"DAG {c['day']}"], f, PINK, H / 2, 1.0)
    fs = font(44, b"SemiBold")
    t = f"van de {c['total']}"
    d.text(((W - RIGHT / 2 - fs.getlength(t)) / 2, H / 2 + 110), t, font=fs, fill=MUTED)
    watermark(d)
    return im


def slide_question(c):
    im = base(); d = ImageDraw.Draw(im)
    maxw = W - RIGHT - 170
    size = fit(c["question"], maxw, 620, 84, b"Bold", lh=1.22)
    f = font(size, b"Bold")
    centered(d, wrap(c["question"], f, maxw), f, PINK, H / 2, 1.22)
    fs = font(38, b"SemiBold")
    t = "Schrijf je antwoord in de reacties"
    d.text(((W - RIGHT / 2 - fs.getlength(t)) / 2, H - 230), t, font=fs, fill=MUTED)
    watermark(d)
    return im


def slide_cta(c):
    im = base(); d = ImageDraw.Draw(im)
    riti = Image.open(os.path.join(ROOT, "public", "riti", "blij.webp")).convert("RGBA")
    riti = riti.crop(riti.getbbox())
    rw = 380; riti = riti.resize((rw, int(rw * riti.height / riti.width)), Image.LANCZOS)
    im.paste(riti, (int((W - RIGHT / 2 - rw) / 2), 230), riti)
    f = font(66)
    lines = wrap("Elke dag een nieuwe vraag, en een plek voor jouw antwoord", f, W - RIGHT - 160)
    y = centered(d, lines, f, CREAM, 870, 1.15)
    fs = font(44, b"SemiBold")
    for i, t in enumerate(["in het dagboek van de CeritaProject-app", "Zet je op de wachtlijst: link in bio"]):
        d.text(((W - RIGHT / 2 - fs.getlength(t)) / 2, y + 40 + i * 64), t, font=fs, fill=PINK if i else MUTED)
    watermark(d)
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
