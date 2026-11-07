"""Quote video: animated background + yellow Dutch text + small Riti. 1080x1920, 30 fps."""
import sys, math, random, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
import os as _os
FONT = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "fonts/Figtree.ttf")
RITI = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "..", "public", "riti") + _os.sep
YELLOW = (247, 228, 99)

def font(size, weight=750):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_axes([weight])
    except Exception: pass
    return f

def gradient(top, bottom):
    t = np.linspace(0, 1, H)[:, None, None]
    g = (np.array(top)[None, None, :] * (1 - t) + np.array(bottom)[None, None, :] * t)
    return np.repeat(g, W, axis=1).astype(np.uint8)

def blob(r, color, alpha):
    s = r * 4
    im = Image.new("RGBA", (s, s), color + (0,))
    ImageDraw.Draw(im).ellipse((r, r, 3 * r, 3 * r), fill=color + (alpha,))
    return im.filter(ImageFilter.GaussianBlur(r * 0.6))

class Scene:
    def __init__(self, kind, seed=1):
        random.seed(seed); self.kind = kind
        if kind == "nacht":
            self.bg = Image.fromarray(gradient((12, 14, 38), (46, 28, 60)))
            self.stars = [(random.random() * W, random.random() * H * 0.85, random.uniform(1.5, 4), random.uniform(0, 6.28), random.uniform(0.8, 2.2)) for _ in range(170)]
            self.glow = blob(260, (255, 214, 230), 70)
            self.petals = [(random.random() * W, random.random() * H, random.uniform(10, 22), random.uniform(20, 45), random.uniform(0, 6.28)) for _ in range(14)]
        elif kind == "zonsondergang":
            self.bg = Image.fromarray(gradient((92, 64, 120), (232, 120, 120)))
            sea = gradient((120, 110, 160), (40, 40, 80))
            self.sea = Image.fromarray(sea[: H // 2]).resize((W, int(H * 0.42)))
            self.sunglow = blob(300, (255, 190, 140), 150)
        elif kind == "regen":
            self.bg = Image.fromarray(gradient((40, 48, 66), (18, 20, 30)))
            cols = [(255, 190, 210), (255, 220, 160), (170, 200, 255)]
            self.bokeh = [(random.random() * W, random.random() * H, blob(random.randint(40, 110), random.choice(cols), random.randint(40, 90)), random.uniform(0, 6.28)) for _ in range(16)]
            self.drops = [(random.random() * W, random.random() * H, random.uniform(40, 110), random.uniform(1100, 1800)) for _ in range(140)]

    def frame(self, t):
        im = self.bg.copy().convert("RGBA")
        d = ImageDraw.Draw(im)
        if self.kind == "nacht":
            im.alpha_composite(self.glow, (W - 700, 60))
            d.ellipse((W - 420, 300, W - 260, 460), fill=(255, 236, 244, 255))
            for x, y, r, ph, sp in self.stars:
                a = int(120 + 135 * (0.5 + 0.5 * math.sin(t * sp + ph)))
                d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a))
            for x, y, r, sp, ph in self.petals:
                yy = (y + t * sp * 3) % (H + 100) - 50; xx = x + 30 * math.sin(t + ph)
                d.ellipse((xx - r, yy - r * 0.6, xx + r, yy + r * 0.6), fill=(245, 160, 190, 200))
        elif self.kind == "zonsondergang":
            hy = int(H * 0.66); sy = int(hy - 90 + t * 8)
            im.alpha_composite(self.sunglow, (W // 2 - 600, sy - 600))
            ImageDraw.Draw(im).ellipse((W // 2 - 130, sy - 130, W // 2 + 130, sy + 130), fill=(255, 226, 170, 255))
            im.paste(self.sea, (0, hy))
            ref = Image.new("RGBA", (W, H), (255, 214, 170, 0)); rd = ImageDraw.Draw(ref)
            for k in range(22):
                y = hy + 12 + k * 28; w = 300 - k * 9 + 40 * math.sin(t * 1.6 + k * 0.9)
                rd.rectangle((W // 2 - w / 2, y, W // 2 + w / 2, y + 7), fill=(255, 214, 170, max(0, 220 - k * 9)))
            im.alpha_composite(ref.filter(ImageFilter.GaussianBlur(2)))
        elif self.kind == "regen":
            for x, y, b, ph in self.bokeh:
                im.alpha_composite(b, (int(x + 25 * math.sin(t * 0.5 + ph)) - b.width // 2, int(y + 20 * math.cos(t * 0.4 + ph)) - b.height // 2))
            d = ImageDraw.Draw(im)
            for x, y, l, sp in self.drops:
                yy = (y + t * sp) % (H + 200) - 100
                d.line((x, yy, x - l * 0.12, yy + l), fill=(200, 215, 240, 110), width=3)
        return im

def wrap(text, f, maxw):
    lines = []
    for para in text.split("\n"):
        words, cur = para.split(), ""
        for w in words:
            test = (cur + " " + w).strip()
            if f.getlength(test) <= maxw: cur = test
            else: lines.append(cur); cur = w
        lines.append(cur)
    return lines

def text_layer(text, size=82):
    f = font(size)
    lines = wrap(text, f, W - 200)
    lh = int(size * 1.25)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top = H // 2 - len(lines) * lh // 2 - 60
    for i, ln in enumerate(lines):
        x = (W - f.getlength(ln)) / 2; y = top + i * lh
        ImageDraw.Draw(shadow).text((x + 3, y + 4), ln, font=f, fill=(0, 0, 0, 230))
        ImageDraw.Draw(layer).text((x, y), ln, font=f, fill=YELLOW + (255,))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    shadow.alpha_composite(layer)
    return shadow

def brand():
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    r = Image.open(RITI + "riti.webp").convert("RGBA"); r.thumbnail((150, 150))
    layer.alpha_composite(r, (W - r.width - 50, H - r.height - 230))
    f = font(34, 600)
    ImageDraw.Draw(layer).text((W - 50 - f.getlength("CeritaProject"), H - 220), "CeritaProject", font=f, fill=(255, 255, 255, 210))
    return layer

def make(out, kind, text, secs=9, seed=1):
    sc = Scene(kind, seed); tl = text_layer(text); br = brand()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(secs * FPS):
        t = n / FPS
        im = sc.frame(t)
        a = min(1, max(0, (t - 0.4) / 0.6))
        if a > 0:
            l = tl if a >= 1 else Image.fromarray((np.array(tl) * np.array([1, 1, 1, a])).astype(np.uint8))
            im.alpha_composite(l, (0, int(20 * (1 - a))))
        im.alpha_composite(br)
        p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close(); p.wait()
