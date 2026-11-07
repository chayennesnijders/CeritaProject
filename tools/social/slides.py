"""Carousel slides for CeritaProject: 9:16 (TikTok photo mode, Snapchat Story), 4:5 (Instagram carousel)
and a slideshow video (YouTube Shorts, Snapchat Spotlight). Brand: crème, ink black, logo pink, Riti."""
import os
from PIL import Image, ImageDraw
from make import font, wrap, FPS
from riti_anim import pose, heart
import interact

CREAM, INK, PINK, COCOA, MUTED = (251, 243, 234), (35, 27, 23), (241, 166, 192), (107, 74, 53), (122, 97, 82)
SIZES = {"916": (1080, 1920), "45": (1080, 1350)}


def _text(d, text, x, y, size, weight, color, maxw, lh=1.18, center=False, W=1080):
    f = font(size, weight); lines = wrap(text, f, maxw); step = int(size * lh)
    for i, ln in enumerate(lines):
        xx = (W - f.getlength(ln)) / 2 if center else x
        d.text((xx, y + i * step), ln, font=f, fill=color)
    return y + len(lines) * step


def _fit(text, maxw, maxh, start, weight, minsize=40, lh=1.18):
    """Largest font size (from start down) at which the text fits the box."""
    s = start
    while s > minsize:
        lines = wrap(text, font(s, weight), maxw)
        if len(lines) * s * lh <= maxh: return s
        s -= 4
    return minsize


def _dots(d, W, H, i, n, color):
    gap = 26; x0 = W / 2 - (n - 1) * gap / 2
    for k in range(n):
        r = 8 if k == i else 5
        d.ellipse((x0 + k * gap - r, H - 70 - r, x0 + k * gap + r, H - 70 + r), fill=color if k == i else color[:3] + (90,))


def cover(size, hook, sub, riti="blij", n=1):
    W, H = SIZES[size]; im = Image.new("RGBA", (W, H), PINK + (255,)); d = ImageDraw.Draw(im)
    for k in range(9):  # soft hearts pattern
        heart(d, 110 + (k % 3) * 430, int(H * 0.55) + (k // 3) * int(H * 0.13), 2.6, (255, 255, 255, 55))
    d.text((70, 70), "CeritaProject", font=font(38, 700), fill=INK)
    rh = int(H * (0.30 if size == "916" else 0.28)); r = pose(riti, rh)
    box_top, box_h = (300 if size == "916" else 190), int(H * 0.42)
    s = _fit(hook, W - 160, box_h, 104 if size == "916" else 92, 820)
    _text(d, hook, 80, box_top, s, 820, INK, W - 160)
    im.alpha_composite(r, ((W - r.width) // 2, H - rh - 150))
    pill = sub or "Swipe →"; f = font(40, 700); bw = f.getlength(pill) + 70
    d.rounded_rectangle(((W - bw) / 2, H - 130, (W + bw) / 2, H - 52), 40, fill=INK)
    d.text(((W - f.getlength(pill)) / 2, H - 116), pill, font=f, fill=PINK)
    return im


def content(size, i, n, title, body, riti=None):
    W, H = SIZES[size]; im = Image.new("RGBA", (W, H), CREAM + (255,)); d = ImageDraw.Draw(im)
    tall = size == "916"
    d.ellipse((W - 520, H - 620, W + 180, H + 80), fill=(246, 214, 224, 255))  # soft pink shape behind Riti
    ts = _fit(title, W - 160, int(H * 0.22), 100 if tall else 84, 820)
    bs = _fit(body, W - 160, int(H * 0.26), 66 if tall else 56, 560, minsize=40, lh=1.3)
    th = len(wrap(title, font(ts, 820), W - 160)) * int(ts * 1.18)
    bh = len(wrap(body, font(bs, 560), W - 160)) * int(bs * 1.3)
    block = 150 + th + 40 + bh
    top = max(110, int(H * (0.40 if tall else 0.42)) - block // 2)
    d.ellipse((80, top, 200, top + 120), fill=PINK); f = font(60, 820); t = str(i)
    d.text((140 - f.getlength(t) / 2, top + 22), t, font=f, fill=INK)
    y = _text(d, title, 80, top + 150, ts, 820, INK, W - 160)
    _text(d, body, 80, y + 40, bs, 560, COCOA, W - 160, lh=1.3)
    r = pose(riti or "blij", 400 if tall else 300)
    im.alpha_composite(r, (W - r.width - 40, H - r.height - 110))
    d.text((80, H - 92), "CeritaProject", font=font(32, 700), fill=MUTED)
    _dots(d, W, H, i, n, INK + (255,))
    return im


def end(size, cta, help_line):
    W, H = SIZES[size]; im = Image.new("RGBA", (W, H), INK + (255,)); d = ImageDraw.Draw(im)
    r = pose("blij", int(H * 0.26)); im.alpha_composite(r, ((W - r.width) // 2, int(H * 0.12)))
    y = int(H * 0.12) + r.height + 50
    y = _text(d, cta, 80, y, 76 if size == "916" else 68, 820, PINK, W - 160, center=True)
    f = font(46, 700); t = "link in bio"; bw = f.getlength(t) + 80
    d.rounded_rectangle(((W - bw) / 2, y + 40, (W + bw) / 2, y + 130), 45, fill=PINK)
    d.text(((W - f.getlength(t)) / 2, y + 58), t, font=f, fill=INK)
    if help_line:
        _text(d, help_line, 80, H - 260, 36, 520, CREAM, W - 160, lh=1.3, center=True)
    return im


def build(cov, slides, end_cfg):
    """Return {size: [PIL images]} for one carousel."""
    n = len(slides) + 2; out = {}
    for size in SIZES:
        imgs = [cover(size, cov["hook"], cov.get("sub"), cov.get("pose", "blij"))]
        imgs += [content(size, i + 1, n, s["title"], s["body"], s.get("pose")) for i, s in enumerate(slides)]
        imgs.append(end(size, end_cfg.get("cta", "Meer van dit? Zet je op de wachtlijst"), end_cfg.get("help_line") if end_cfg.get("help") else None))
        out[size] = imgs
    return out


def render(outdir, pid, cov, slides, end_cfg, per=2.8, fade=0.4):
    """Writes <pid>-916-<k>.png, <pid>-45-<k>.png and the slideshow <pid>.mp4; returns the paths."""
    if end_cfg.get("help") and not end_cfg.get("help_line"):
        end_cfg = {**end_cfg, "help_line": "Blijft het zwaar? Praat met iemand die je vertrouwt of bel 113 (0800-0113). Jonger dan 18? Kindertelefoon 0800-0432."}
    sets = build(cov, slides, end_cfg); paths = {"916": [], "45": []}
    for size, imgs in sets.items():
        for k, im in enumerate(imgs, 1):
            p = os.path.join(outdir, f"{pid}-{size}-{k}.png"); im.convert("RGB").save(p, optimize=True); paths[size].append(p)
    frames = [im.convert("RGB") for im in sets["916"]]; W, H = SIZES["916"]
    secs = per * len(frames); w = interact.writer(os.path.join(outdir, pid + ".mp4"), int(secs + 0.999))
    total = int(secs * FPS)
    for n in range(total):
        t = n / FPS; k = min(len(frames) - 1, int(t / per)); lt = t - k * per
        z = 1 + 0.03 * (lt / per)  # slow zoom
        def zoomed(img, zz):
            cw, ch = int(W / zz), int(H / zz); x, y = (W - cw) // 2, (H - ch) // 2
            return img.crop((x, y, x + cw, y + ch)).resize((W, H), Image.BILINEAR)
        cur = zoomed(frames[k], z)
        if lt > per - fade and k + 1 < len(frames):
            cur = Image.blend(cur, zoomed(frames[k + 1], 1.0), (lt - (per - fade)) / fade)
        w.stdin.write(cur.tobytes())
    w.stdin.close(); w.wait()
    paths["video"] = os.path.join(outdir, pid + ".mp4")
    return paths
