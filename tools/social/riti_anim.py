"""Animated Riti videos: shots with backgrounds, Riti poses and motion, particles and yellow captions."""
import sys, math, random, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from make import Scene, W, H, FPS, font, wrap, YELLOW, blob, gradient, RITI

random.seed(3)

class Sky(Scene):
    def __init__(self):
        self.kind = "lucht"
        self.bg = Image.fromarray(gradient((140, 196, 240), (255, 214, 226)))
        self.clouds = [(random.random() * W, random.uniform(150, 900), blob(random.randint(90, 160), (255, 255, 255), 230), random.uniform(10, 30)) for _ in range(7)]
        self.sunglow = blob(220, (255, 236, 170), 200)
    def frame(self, t):
        im = self.bg.copy().convert("RGBA")
        im.alpha_composite(self.sunglow, (W - 800, -250))
        ImageDraw.Draw(im).ellipse((W - 470, 110, W - 270, 310), fill=(255, 240, 180, 255))
        for x, y, c, sp in self.clouds:
            xx = (x + t * sp) % (W + 600) - 300
            for dx, dy in ((0, 0), (-110, 30), (110, 30), (0, 50)):
                im.alpha_composite(c, (int(xx + dx - c.width / 2), int(y + dy - c.height / 2)))
        ImageDraw.Draw(im).rectangle((0, H - 420, W, H), fill=(170, 214, 150, 255))
        ImageDraw.Draw(im).ellipse((-300, H - 520, W + 300, H - 300), fill=(170, 214, 150, 255))
        return im

def scene(kind):
    return Sky() if kind == "lucht" else Scene(kind, 2)

_pose_cache = {}
def pose(name, h):
    k = (name, h)
    if k not in _pose_cache:
        im = Image.open(RITI + name + ".webp").convert("RGBA")
        _pose_cache[k] = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    return _pose_cache[k]

def ease_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

def heart(d, cx, cy, s, color):
    pts = []
    for i in range(40):
        a = i / 40 * 2 * math.pi
        x = 16 * math.sin(a) ** 3
        y = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
        pts.append((cx + x * s, cy + y * s))
    d.polygon(pts, fill=color)

def sparkle(d, cx, cy, r, color):
    q = r * 0.28
    d.polygon([(cx, cy - r), (cx + q, cy - q), (cx + r, cy), (cx + q, cy + q), (cx, cy + r), (cx - q, cy + q), (cx - r, cy), (cx - q, cy - q)], fill=color)

def caption(im, text, a, y=330, size=78):
    if a <= 0: return
    f = font(size); lines = wrap(text, f, W - 180); lh = int(size * 1.22)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i, ln in enumerate(lines):
        x = (W - f.getlength(ln)) / 2; yy = y + i * lh + int(18 * (1 - a))
        ImageDraw.Draw(sh).text((x + 3, yy + 4), ln, font=f, fill=(0, 0, 0, int(230 * a)))
        ImageDraw.Draw(lay).text((x, yy), ln, font=f, fill=YELLOW + (int(255 * a),))
    sh = sh.filter(ImageFilter.GaussianBlur(6)); sh.alpha_composite(lay); im.alpha_composite(sh)

def render(story, out):
    shots = story["shots"]; total = sum(s["dur"] for s in shots)
    scenes = {s["bg"]: scene(s["bg"]) for s in shots}
    particles = []
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    start = 0; prev = None
    for si, s in enumerate(shots):
        for n in range(int(s["dur"] * FPS)):
            lt = n / FPS; t = start + lt
            im = scenes[s["bg"]].frame(t)
            # background crossfade from the previous shot
            if prev and prev["bg"] != s["bg"] and lt < 0.6:
                im = Image.blend(scenes[prev["bg"]].frame(t), im, lt / 0.6)
            d = ImageDraw.Draw(im)
            # Riti: pop in on a pose change, then idle motion per mood
            mood = s.get("move", "bob"); h = s.get("size", 640)
            changed = not prev or prev["pose"] != s["pose"]
            k = ease_back(min(1, lt / 0.45)) if changed else 1
            if mood == "sway":
                ang = 4 * math.sin(t * 1.6); sy = 1 - 0.02 * math.sin(t * 1.6); dy = 0
            elif mood == "jump":
                ph = (t * 1.8) % 1; dy = -abs(math.sin(ph * math.pi)) * 110; ang = 0
                sy = 0.9 if ph < 0.07 or ph > 0.93 else 1.03
            elif mood == "wave":
                ang = 9 * math.sin(t * 7); dy = 0; sy = 1
            else:
                dy = -18 * abs(math.sin(t * 2.4)); ang = 0; sy = 1 + 0.025 * math.sin(t * 4.8)
            r = pose(s["pose"], h)
            rw, rh = max(1, int(r.width * k * (2 - sy))), max(1, int(r.height * k * sy))
            rr = r.resize((rw, rh), Image.BILINEAR)
            if ang: rr = rr.rotate(ang, resample=Image.BICUBIC, expand=True)
            cx, base = W // 2, s.get("base", 1560)
            # soft shadow
            shw = int(r.width * 0.7 * (1 + dy / 600))
            if "shadow" not in _pose_cache:
                sh = Image.new("RGBA", (700, 140), (0, 0, 0, 0))
                ImageDraw.Draw(sh).ellipse((70, 40, 630, 100), fill=(40, 20, 30, 70))
                _pose_cache["shadow"] = sh.filter(ImageFilter.GaussianBlur(14))
            sh = _pose_cache["shadow"].resize((max(1, int(700 * shw / 560)), 140))
            im.alpha_composite(sh, (int(cx - sh.width / 2), base - 70))
            im.alpha_composite(rr, (int(cx - rr.width / 2), int(base - rr.height + 10 + dy)))
            # particles
            fx = s.get("fx")
            if fx and n % 5 == 0:
                particles.append({"kind": fx, "x": cx + random.uniform(-330, 330), "y": base - random.uniform(200, 600), "t0": t, "s": random.uniform(1.6, 3.2), "dx": random.uniform(-40, 40)})
            if changed and lt < 1 / FPS:
                for a in range(14):
                    ang2 = a / 14 * 2 * math.pi
                    particles.append({"kind": "puf", "x": cx, "y": base - h / 2, "t0": t, "s": random.uniform(16, 30), "dx": math.cos(ang2), "dy": math.sin(ang2)})
            d = ImageDraw.Draw(im)
            alive = []
            for q in particles:
                age = t - q["t0"]
                if q["kind"] == "puf":
                    if age > 0.5: continue
                    rad = 160 + age * 700; al = int(255 * (1 - age / 0.5))
                    x, y = q["x"] + q["dx"] * rad, q["y"] + q["dy"] * rad
                    d.ellipse((x - q["s"], y - q["s"], x + q["s"], y + q["s"]), fill=(255, 255, 255, al))
                elif q["kind"] == "hartjes":
                    if age > 2.2: continue
                    al = int(255 * min(1, (2.2 - age) / 0.6))
                    heart(d, q["x"] + q["dx"] * math.sin(age * 3), q["y"] - age * 260, q["s"], (240, 120, 160, al))
                elif q["kind"] == "sterretjes":
                    if age > 1.4: continue
                    al = int(255 * math.sin(age / 1.4 * math.pi))
                    sparkle(d, q["x"], q["y"] - age * 60, q["s"] * 14, (255, 236, 140, al))
                alive.append(q)
            particles = alive
            # caption
            if s.get("text"):
                a = min(1, max(0, (lt - 0.3) / 0.5))
                if si == len(shots) - 1 or True:
                    fade_out = min(1, max(0, (s["dur"] - lt) / 0.35)) if si < len(shots) - 1 else 1
                    caption(im, s["text"], a * fade_out, s.get("ty", 330))
            if s.get("end"):
                a = min(1, max(0, (lt - 0.6) / 0.5))
                f = font(46, 650); txt = "zet je op de wachtlijst · link in bio"
                bw = f.getlength(txt) + 80
                ImageDraw.Draw(im).rounded_rectangle(((W - bw) / 2, 1660, (W + bw) / 2, 1760), 50, fill=(20, 16, 14, int(235 * a)))
                ImageDraw.Draw(im).text(((W - f.getlength(txt)) / 2, 1684), txt, font=f, fill=(242, 170, 200, int(255 * a)))
            p.stdin.write(im.convert("RGB").tobytes())
        start += s["dur"]; prev = s
    p.stdin.close(); p.wait()
