"""Countdown slideshows: "Nog 48 dagen tot oud & nieuw", one question a day (TikTok photo mode, 3:4).

Usage: python3 tools/social/countdown.py OUTDIR FROM [TO]
       python3 tools/social/countdown.py post spec.json OUTDIR   (a "DENK EENS NA." or "ECHT." post)
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
SIZES = {"tiktok": (1440, 150), "instagram": (1350, 40)}  # height, clear space on the right


def set_size(kind):
    """TikTok photo mode is 3:4 (1080x1440, buttons on the right); an Instagram carousel shows 4:5 whole."""
    global H, RIGHT, TEXTW
    H, RIGHT = SIZES[kind]
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


# Whose account the slides are for: "cerita" (CeritaProject, the default) or "echt" (the ECHT. account).
BRAND = os.environ.get("BRAND", "cerita")


def frame(im, dark, k, n=4):
    """Brand mark top left and the slide counter bottom left."""
    d = ImageDraw.Draw(im)
    col = CREAM if dark else INKC
    if BRAND != "echt":
        d.text((M, 96), "CeritaProject", font=font(46, b"Black"), fill=col)
        d.text((M, H - 130), f"{k:02d} / {n:02d}", font=font(34, b"SemiBold"), fill=col)
        return d
    f = font(54, b"Black")
    d.text((M, 92), "ECHT", font=f, fill=col)
    # The logo's dot, pink like on the profile picture.
    bb = d.textbbox((M, 92), "ECHT", font=f)
    r = 6.5
    x = bb[2] + 4 + r
    d.ellipse((x - r, bb[3] - 2 * r, x + r, bb[3]), fill=PINK if dark else (178, 58, 98))
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


def pal(dark):
    """Colours per slide: the brown-purple slides and the light ones."""
    if dark:
        return {"text": CREAM, "sub": MUTED, "accent": PINK}
    return {"text": INKC, "sub": (70, 60, 64), "accent": (178, 58, 98)}


# The first slide is always the brown-purple one, then light and dark take turns.
dark_at = lambda k: k % 2 == 1


def slide_cover(c):
    dark = dark_at(1); col = pal(dark)
    im = base(dark); d = frame(im, dark, 1)
    text = (c["headline"] + ".").upper()
    size = fit_anton(text, TEXTW, 700 * H / 1440, 230)
    lines = len(wrap(text, anton(size), TEXTW))
    y = (H - lines * size * 1.02) / 2 - 110
    end = block(d, text, size, y, col["text"])
    stroke(d, M, end + 90, 460, col["accent"])
    sub = font(40, b"Medium")
    for i, ln in enumerate(wrap("Elke dag één vraag. Geen goed of fout antwoord.", sub, TEXTW - 120)):
        d.text((M, end + 165 + i * 54), ln, font=sub, fill=col["sub"])
    return im


def slide_day(c):
    dark = dark_at(2); col = pal(dark)
    im = base(dark); d = frame(im, dark, 2)
    label = f"DAG {c['day']:02d}."
    size = 300
    while anton(size).getlength(label) > TEXTW:
        size -= 10
    y = block(d, label, size, H / 2 - size * 0.75, col["text"]) + 40
    d.text((M, y + 30), f"van de {c['total']}", font=font(44, b"SemiBold"), fill=col["accent"])
    d.text((M, y + 100), "Lees de vraag. Neem even de tijd.", font=font(40, b"Medium"), fill=col["sub"])
    return im


def slide_question(c):
    return slide_big(c["question"], 3)


CTA = {
    "countdown": ("DEEL JE ANTWOORD IN DE REACTIES.", "Of schrijf het op in je eigen dagboek in de CeritaProject-app. Daar staat elke dag de vraag voor je klaar."),
    "denk": ("DEEL JE ANTWOORD IN DE REACTIES.", "Of schrijf het op in je eigen dagboek in de CeritaProject-app, waar niemand meeleest."),
    # Personal questions: never invite public confessions in the comments.
    "verhaal": ("STUUR JE VERHAAL.", "Anoniem, als je dat wilt."),
    "echt": ("SCHRIJF HET OP. VOOR JEZELF.", "In je eigen dagboek in de CeritaProject-app, waar niemand meeleest. Zit je ergens mee? Praat met iemand die je vertrouwt."),
}


def slide_cta(c):
    dark = dark_at(4); col = pal(dark)
    im = base(dark); d = frame(im, dark, 4)
    # A post can bring its own ending: "cta": [head, body, highlighted line].
    head, body, line = c["cta"] if c.get("cta") else (*CTA[c.get("format", "countdown")], "Wachtlijst: link in bio")
    fb, fl, fi = font(42, b"SemiBold"), font(42, b"Bold"), font(32, b"Medium")
    body_l, line_l = wrap(body, fb, TEXTW), wrap(line, fl, TEXTW)
    # Everything under the heading, so the heading gets whatever room is left above "04 / 04".
    below = 60 + len(body_l) * 56 + 34 + len(line_l) * 56 + 70
    top, bottom = 300, H - 200
    size = fit_anton(head, TEXTW, bottom - top - below, 150, minsize=80)
    y = block(d, head, size, top, col["text"]) + 60
    for ln in body_l:
        d.text((M, y), ln, font=fb, fill=col["sub"]); y += 56
    y += 34
    for ln in line_l:
        d.text((M, y), ln, font=fl, fill=col["accent"]); y += 56
    foot = c.get("footer") or ("een initiatief van CeritaProject" if BRAND == "echt" else "Elke ochtend een nieuwe vraag · @ceritaproject")
    d.text((M, y + 24), foot, font=fi, fill=col["sub"])
    return im


def slide_big(text, k, label=None):
    """One big question in capitals; optional small label under the ECHT. mark."""
    dark = dark_at(k); col = pal(dark)
    im = base(dark); d = frame(im, dark, k)
    text = text.upper()
    size = fit_anton(text, TEXTW, 860 * H / 1440, 170)
    lines = len(wrap(text, anton(size), TEXTW))
    y = (H - lines * size * 1.02) / 2 - 30
    if label:
        d.text((M, 170), label, font=font(40, b"Bold"), fill=col["accent"])
        y = max(y, 280)
    block(d, text, size, y, col["text"])
    return im


def slide_nuance(title, body, k):
    """A short sentence in bold and a calmer line under it (like "stel je voor: …")."""
    dark = dark_at(k); col = pal(dark)
    im = base(dark); d = frame(im, dark, k)
    ft, fb = font(84, b"ExtraBold"), font(56, b"Medium")
    t_lines, b_lines = wrap(title, ft, TEXTW), wrap(body, fb, TEXTW)
    total = len(t_lines) * 98 + 50 + len(b_lines) * 70
    y = (H - total) / 2
    for ln in t_lines:
        d.text((M, y), ln, font=ft, fill=col["text"]); y += 98
    y += 50
    for ln in b_lines:
        d.text((M, y), ln, font=fb, fill=col["sub"]); y += 70
    return im


# Labels under the ECHT. mark on the first slide.
LABELS = {"denk": "DENK EENS NA.", "echt": "ECHTE VRAAG.", "verhaal": "VERHALEN GEZOCHT."}


def post_slides(spec):
    """'DENK EENS NA.' and 'ECHT.' posts: question, nuance, follow-up question, call to action."""
    fmt = "echt" if spec["format"] == "eerlijk" else spec["format"]
    spec = {**spec, "format": fmt}
    return [
        slide_big(spec["question"], 1, label=LABELS[fmt]),
        slide_nuance(spec["nuance_title"], spec["nuance_body"], 2),
        slide_big(spec["followup"], 3),
        slide_cta(spec),
    ]


def slide_list_cover(spec):
    """Evening list post: the title big on the brown-purple slide."""
    dark = dark_at(1); col = pal(dark)
    im = base(dark); d = frame(im, dark, 1)
    text = spec["title"].upper()
    size = fit_anton(text, TEXTW, 760 * H / 1440, 200)
    lines = len(wrap(text, anton(size), TEXTW))
    y = (H - lines * size * 1.02) / 2 - 90
    end = block(d, text, size, y, col["text"])
    stroke(d, M, end + 80, 420, col["accent"])
    sub = font(40, b"Medium")
    for i, ln in enumerate(wrap(spec.get("sub", "Hoeveel herken jij er? Swipe →"), sub, TEXTW - 80)):
        d.text((M, end + 150 + i * 54), ln, font=sub, fill=col["sub"])
    return im


def slide_items(items, start, k):
    """Two or three list items: a big number, a bold line and a calmer line under it."""
    dark = dark_at(k); col = pal(dark)
    im = base(dark); d = frame(im, dark, k)
    fn, ft, fb = anton(150), font(60, b"ExtraBold"), font(42, b"Medium")
    numw = 150
    tw = TEXTW - numw
    blocks = []
    for it in items:
        head, body = (it if isinstance(it, list) else [it, ""])
        tl, bl = wrap(head, ft, tw), wrap(body, fb, tw) if body else []
        blocks.append((tl, bl, len(tl) * 72 + (14 + len(bl) * 54 if bl else 0)))
    gap = 90
    total = sum(b[2] for b in blocks) + gap * (len(blocks) - 1)
    y = max(230, (H - total) / 2)
    for i, (tl, bl, h) in enumerate(blocks):
        d.text((M, y - 28), str(start + i), font=fn, fill=col["accent"])
        yy = y
        for ln in tl:
            d.text((M + numw, yy), ln, font=ft, fill=col["text"]); yy += 72
        if bl:
            yy += 14
            for ln in bl:
                d.text((M + numw, yy), ln, font=fb, fill=col["sub"]); yy += 54
        y += max(h, 150) + gap
    return im


def list_slides(spec):
    """Evening list: title, items 1-3, the rest, and a closing slide (always 4 slides)."""
    items = spec["items"]
    return [
        slide_list_cover(spec),
        slide_items(items[:3], 1, 2),
        slide_items(items[3:], 4, 3),
        slide_cta({**spec, "footer": "Elke avond een nieuw lijstje · @ceritaproject"}),
    ]


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
        + (f"#echt #vragen #jezelf {tag} #journaling #fyp" if BRAND == "echt" else f"#ceritaproject #vragen #jezelf {tag} #dagboek #nietalleen #fyp")
    )


def caption_ig(c):
    """Instagram: no #fyp, and ask people to save or send the post (that is what Instagram rewards)."""
    return caption(c).replace(" #fyp", "").replace("Wachtlijst: link in bio", "Sla deze post op of stuur hem naar iemand. Wachtlijst: link in bio")


def main():
    if sys.argv[1] == "lijst":
        # python3 countdown.py lijst spec.json OUTDIR  (spec: title, items [[line, explanation]], cta)
        spec = json.load(open(sys.argv[2]))
        os.makedirs(sys.argv[3], exist_ok=True)
        for kind, prefix in (("tiktok", ""), ("instagram", "ig-")):
            set_size(kind)
            for i, im in enumerate(list_slides(spec), 1):
                im.save(os.path.join(sys.argv[3], f"{prefix}{i}.png"), optimize=True)
        return
    if sys.argv[1] == "post":
        # python3 countdown.py post spec.json OUTDIR  (spec: format denk|echt, question, nuance_title,
        # nuance_body, followup); writes OUTDIR/1.png .. 4.png
        spec = json.load(open(sys.argv[2]))
        os.makedirs(sys.argv[3], exist_ok=True)
        # 1.png .. 4.png for TikTok (3:4) and ig-1.png .. ig-4.png for Instagram (4:5)
        for kind, prefix in (("tiktok", ""), ("instagram", "ig-")):
            set_size(kind)
            for i, im in enumerate(post_slides(spec), 1):
                im.save(os.path.join(sys.argv[3], f"{prefix}{i}.png"), optimize=True)
        return
    out, a = sys.argv[1], sys.argv[2]
    b = sys.argv[3] if len(sys.argv) > 3 else a
    d0, d1 = dt.date.fromisoformat(a), dt.date.fromisoformat(b)
    days = [(d0 + dt.timedelta(days=i)).isoformat() for i in range((d1 - d0).days + 1)]
    for day, c in zip(days, questions_for(days)):
        if not c:
            continue
        folder = os.path.join(out, day)
        os.makedirs(folder, exist_ok=True)
        for kind, prefix in (("tiktok", ""), ("instagram", "ig-")):
            set_size(kind)
            for i, fn in enumerate([slide_cover, slide_day, slide_question, slide_cta], 1):
                fn(c).save(os.path.join(folder, f"{prefix}{i}.png"), optimize=True)
        with open(os.path.join(folder, "caption.txt"), "w") as f:
            f.write(caption(c))
        with open(os.path.join(folder, "caption-ig.txt"), "w") as f:
            f.write(caption_ig(c))
        print(day, c["headline"], "|", c["question"])

if __name__ == "__main__":
    main()
