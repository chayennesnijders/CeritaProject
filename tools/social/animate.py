"""2D animations with little people in CeritaProject style, on top of the owner's own voice-over.

Usage:  python3 tools/social/animate.py script.json

script.json: {"voice": "<audio or video file>", "out": "<file.mp4>",
              "lines": [{"text": "Heb je soms het gevoel dat niemand je begrijpt?", "scene": "alone"}, ...],
              "pink": ["CERITAPROJECT", "ALLEEN", "ENIGE"]}
Each line gets a scene from SCENES; the timing comes from the voice itself (speech vs. silence), so
the owner reads the script out loud and the captions follow her. An end card (wachtlijst) is added.
Optional: "at" on every line (seconds) uses those times instead of listening for pauses (handy when the
recording has background sound), "cut" stops the voice early, "end_line" changes the text on the end card.
Scenes: alone, head, crossroads, phone, spotlight, school, night, home, friend, breathe,
        cerita, meeting, ikook, talk, hands, crowd, idea, message, ab, a, b, both, texts, warm,
        house, house_living, house_bed, house_kitchen, house_attic, house_door.
A line may carry "badge": "1" to show a big number (for lists).
"""
import json, math, os, random, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from make import font
from riti_anim import pose, ease_back, heart

W, H, FPS, SS = 1080, 1920, 24, 2
END_CARD = 2.8
INK, PINK, CREAM, COCOA = (35, 27, 23), (241, 166, 192), (251, 243, 234), (107, 74, 53)

def s(v): return int(v * SS)
def box(x0, y0, x1, y1): return (s(x0), s(y0), s(x1), s(y1))
def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def grad(top, bot):
    t = np.linspace(0, 1, H * SS)[:, None, None]
    g = np.array(top)[None, None] * (1 - t) + np.array(bot)[None, None] * t
    return Image.fromarray(np.repeat(g, W * SS, axis=1).astype(np.uint8)).convert("RGBA")

BG = {"grey": grad((222, 212, 204), (176, 162, 154)), "night": grad((48, 36, 32), (22, 16, 13)),
      "warm": grad((252, 236, 228), (246, 212, 222)), "pink": grad((248, 190, 210), (236, 140, 172)), "ink": grad((35, 27, 23), (20, 15, 12)),
      "dusk": grad((92, 78, 96), (40, 32, 40))}

SKINS = [(246, 214, 190), (222, 176, 140), (184, 132, 96), (128, 86, 60), (238, 196, 164)]
HAIRS = [(74, 48, 36), (40, 28, 24), (150, 96, 58), (214, 168, 104), (110, 62, 48)]
SHIRTS = [(241, 166, 192), (250, 228, 200), (196, 150, 120), (247, 214, 120), (176, 204, 170), (170, 196, 226), (226, 132, 160)]
STYLES = ["long", "short", "bun", "curly", "long", "short"]
OL = INK  # outline colour, like the project's black outlines and shadows

class Person:
    """A cute little person in CeritaProject style: big head, big shiny eyes, rosy cheeks, ink outline."""
    def __init__(self, seed, x, y, sc=1.0, main=False):
        r = random.Random(seed)
        self.x, self.y, self.sc = x, y, sc
        self.skin = (238, 196, 164) if main else r.choice(SKINS)
        self.hair = (74, 48, 36) if main else r.choice(HAIRS)
        self.shirt = (241, 166, 192) if main else r.choice(SHIRTS)
        self.style = "long" if main else r.choice(STYLES)
        self.ph = r.random() * 6.28

    def draw(self, d, t, mood="neutral", walk=0.0, grey=0.0, arms="down", look=0.0, bob=True, alpha=255, sit=False):
        def col(c):
            if grey: g = sum(c) / 3; c = tuple(int(lerp(v, g * 0.85 + 25, grey)) for v in c)
            return c + (alpha,)
        ol = col(OL); sc, x = self.sc, self.x
        lw = max(1, s(4.5 * sc))
        y = self.y - (abs(math.sin(t * 2.2 + self.ph)) * 6 * sc if bob and not walk else 0) - (abs(math.sin(walk * 6)) * 8 * sc if walk else 0)
        sw = math.sin(walk * 6) * 14 * sc if walk else 0
        pants = col((92, 70, 60))
        # legs (short and round)
        if sit:
            d.rounded_rectangle(box(x - 30 * sc, y - 8 * sc, x + 62 * sc, y + 16 * sc), s(12 * sc), fill=pants, outline=ol, width=lw)
            d.rounded_rectangle(box(x + 40 * sc, y - 2 * sc, x + 64 * sc, y + 64 * sc), s(12 * sc), fill=pants, outline=ol, width=lw)
        else:
            for k, dx in ((0, -16), (1, 16)):
                off = sw if k == 0 else -sw
                d.rounded_rectangle(box(x + dx * sc - 12 * sc + off, y - 10 * sc, x + dx * sc + 12 * sc + off, y + 66 * sc), s(12 * sc), fill=pants, outline=ol, width=lw)
                d.ellipse(box(x + dx * sc - 16 * sc + off, y + 54 * sc, x + dx * sc + 16 * sc + off, y + 74 * sc), fill=col((60, 44, 38)), outline=ol, width=lw)
        # arms (behind body, outlined)
        hands = []
        for side in (-1, 1):
            sx, sy = x + side * 38 * sc, y - 104 * sc
            if arms == "wave" and side == 1: ex, ey = sx + 44 * sc, sy - 70 * sc + math.sin(t * 9) * 10 * sc
            elif arms == "out": ex, ey = sx + side * 70 * sc, sy + 34 * sc
            elif arms == "phone": ex, ey = x + side * 30 * sc, y - 56 * sc
            elif arms == "hug": ex, ey = x - side * 16 * sc, y - 46 * sc
            else: ex, ey = sx + side * 12 * sc, sy + 88 * sc + (sw * side * 0.5 if walk else 0)
            d.line((s(sx), s(sy), s(ex), s(ey)), fill=ol, width=s(24 * sc) + 2 * lw)
            d.line((s(sx), s(sy), s(ex), s(ey)), fill=col(self.shirt), width=s(24 * sc))
            hands.append((ex, ey))
        # body (round tummy)
        d.rounded_rectangle(box(x - 44 * sc, y - 124 * sc, x + 44 * sc, y + 8 * sc), s(40 * sc), fill=col(self.shirt), outline=ol, width=lw)
        heart(d, s(x), s(y - 62 * sc), 0.9 * SS * sc, col((255, 255, 255)))
        if arms == "phone":  # phone held low in both hands, screen glowing towards the face
            d.rounded_rectangle(box(x - 27 * sc, y - 92 * sc, x + 27 * sc, y - 28 * sc), s(9 * sc), fill=ol)
            d.rounded_rectangle(box(x - 22 * sc, y - 87 * sc, x + 22 * sc, y - 33 * sc), s(6 * sc), fill=col((255, 236, 244)))
            heart(d, s(x), s(y - 62 * sc), 0.55 * SS * sc, col((236, 110, 150)))
        for ex, ey in hands:
            d.ellipse(box(ex - 13 * sc, ey - 13 * sc, ex + 13 * sc, ey + 13 * sc), fill=col(self.skin), outline=ol, width=lw)
        # head (big, chibi)
        hy, R = y - 200 * sc, 78
        hair = col(self.hair)
        if self.style == "long":  # side locks down to the shoulders, face stays free
            for side in (-1, 1):
                d.rounded_rectangle(box(x + side * 52 * sc - 30 * sc, hy - 30 * sc, x + side * 52 * sc + 30 * sc, hy + 96 * sc), s(28 * sc), fill=hair, outline=ol, width=lw)
        if self.style == "bun":
            d.ellipse(box(x - 34 * sc, hy - R * sc - 50 * sc, x + 34 * sc, hy - R * sc + 14 * sc), fill=hair, outline=ol, width=lw)
        d.ellipse(box(x - R * sc, hy - R * sc, x + R * sc, hy + R * sc), fill=col(self.skin), outline=ol, width=lw)
        # hair cap with a fringe
        if self.style == "curly":
            for k in range(7):
                a = math.pi + k / 6 * math.pi
                cx, cy = x + math.cos(a) * 66 * sc, hy + math.sin(a) * 60 * sc - 6 * sc
                d.ellipse(box(cx - 26 * sc, cy - 26 * sc, cx + 26 * sc, cy + 26 * sc), fill=hair, outline=ol, width=lw)
        else:
            d.chord(box(x - R * sc - 2, hy - R * sc - 4, x + R * sc + 2, hy + 40 * sc), 180, 360, fill=hair, outline=ol, width=lw)
        # face: big shiny eyes, blush, mouth
        blink = (t + self.ph) % 3.4 < 0.12
        lx = look * 12 * sc
        for side in (-1, 1):
            cx, cy = x + side * 28 * sc + lx, hy + 16 * sc + (7 * sc if arms == "phone" else 0)
            if blink: d.arc(box(cx - 11 * sc, cy - 6 * sc, cx + 11 * sc, cy + 8 * sc), 20, 160, fill=ol, width=lw)
            else:
                d.ellipse(box(cx - 11 * sc, cy - 14 * sc, cx + 11 * sc, cy + 14 * sc), fill=col((44, 30, 24)))
                d.ellipse(box(cx - 6 * sc, cy - 10 * sc, cx + 1 * sc, cy - 3 * sc), fill=col((255, 255, 255)))
                d.ellipse(box(cx + 3 * sc, cy + 3 * sc, cx + 7 * sc, cy + 7 * sc), fill=col((255, 255, 255)))
            d.ellipse(box(x + side * 50 * sc - 14 * sc + lx, hy + 34 * sc, x + side * 50 * sc + 14 * sc + lx, hy + 48 * sc), fill=col((246, 160, 176)))
        mx, my = x + lx, hy + 46 * sc
        if mood == "happy": d.chord(box(mx - 16 * sc, my - 10 * sc, mx + 16 * sc, my + 16 * sc), 0, 180, fill=col((150, 60, 70)), outline=ol, width=lw)
        elif mood == "sad": d.arc(box(mx - 14 * sc, my, mx + 14 * sc, my + 18 * sc), 200, 340, fill=ol, width=lw)
        else: d.arc(box(mx - 10 * sc, my - 6 * sc, mx + 10 * sc, my + 6 * sc), 20, 160, fill=ol, width=lw)

def cloud(d, cx, cy, sc, colr):
    for dx, dy, r in ((-60, 10, 50), (0, -20, 65), (60, 10, 50), (0, 25, 55)):
        d.ellipse(box(cx + dx * sc - r * sc, cy + dy * sc - r * sc, cx + dx * sc + r * sc, cy + dy * sc + r * sc), fill=colr)

def bubble(d, cx, cy, w, h, text=None, icon=None, a=1.0):
    if a <= 0: return
    w, h = w * a, h * a
    d.rounded_rectangle(box(cx - w / 2 + 6 * a, cy - h / 2 + 6 * a, cx + w / 2 + 6 * a, cy + h / 2 + 6 * a), s(30 * a), fill=INK + (255,))
    d.rounded_rectangle(box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), s(30 * a), fill=(255, 250, 244, 255), outline=INK, width=s(4 * a))
    d.polygon([(s(cx - 14 * a), s(cy + h / 2 - 2)), (s(cx + 14 * a), s(cy + h / 2 - 2)), (s(cx - 8 * a), s(cy + h / 2 + 26 * a))], fill=(255, 255, 255, 245))
    if text and a > 0.6:
        f = font(int(44 * SS * a), 800); tw = f.getlength(text)
        d.text((s(cx) - tw / 2, s(cy) - s(26 * a)), text, font=f, fill=INK)
    if icon == "heart": heart(d, s(cx), s(cy + 6 * a), 1.6 * SS * a, (236, 110, 150, 255))
    if icon == "smile":
        d.ellipse(box(cx - 26 * a, cy - 26 * a, cx + 26 * a, cy + 26 * a), fill=(250, 205, 110, 255))
        d.arc(box(cx - 14 * a, cy - 8 * a, cx + 14 * a, cy + 14 * a), 20, 160, fill=INK, width=s(4 * a))

def star(d, sx, sy, r, fill):
    d.polygon([(s(sx), s(sy - r * 2)), (s(sx + r * 0.6), s(sy - r * 0.6)), (s(sx + r * 2), s(sy)), (s(sx + r * 0.6), s(sy + r * 0.6)),
               (s(sx), s(sy + r * 2)), (s(sx - r * 0.6), s(sy + r * 0.6)), (s(sx - r * 2), s(sy)), (s(sx - r * 0.6), s(sy - r * 0.6))], fill=fill)

def card(d, cx, cy, w, h, a=1.0):
    w, h = w * a, h * a
    d.rounded_rectangle(box(cx - w / 2 + 8 * a, cy - h / 2 + 8 * a, cx + w / 2 + 8 * a, cy + h / 2 + 8 * a), s(26 * a), fill=INK + (255,))
    d.rounded_rectangle(box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), s(26 * a), fill=(255, 250, 244, 255), outline=INK, width=s(5))

MAIN = Person(1, 540, 1150, 1.6, main=True)
PASSERS = [Person(10 + i, 0, 0, 0.95 + i * 0.05) for i in range(3)]
CREW = [Person(20 + i, 0, 0, 1.15) for i in range(5)]
CROWD = [Person(40 + i, 0, 0, 0.5) for i in range(30)]
ADULTS = [Person(80 + i, 0, 0, 1.25) for i in range(2)]
_r = random.Random(7)
SCRIBBLES = [[(_r.uniform(-1, 1), _r.uniform(-1, 1)) for _ in range(9)] for _ in range(5)]
RITI = pose("blij", s(560))

# ---------- scenes: each draws one moment; lt = seconds into the scene, t = global time ----------
def sc_alone(lt, dur, t):
    im = BG["grey"].copy(); d = ImageDraw.Draw(im)
    d.rectangle(box(0, 1250, W, H), fill=(160, 146, 138, 255))
    d.rounded_rectangle(box(300, 1100, 820, 1135), s(10), fill=(140, 100, 70, 255)); d.rectangle(box(330, 1135, 350, 1250), fill=(120, 85, 60, 255)); d.rectangle(box(770, 1135, 790, 1250), fill=(120, 85, 60, 255))
    for i, p in enumerate(PASSERS):
        p.x = -150 + ((t * 260 + i * 420) % 1400); p.y = 1240 - i * 10
        p.draw(d, t, walk=t + i, grey=0.85, alpha=210)
    MAIN.x, MAIN.y, MAIN.sc = 520, 1110, 1.25
    MAIN.draw(d, t, mood="sad", sit=True, bob=False)
    cloud(d, 520, 640 + math.sin(t * 2) * 8, 1.0, (150, 140, 136, 255))
    for k in range(6):
        ry = 720 + ((t * 300 + k * 50) % 160)
        d.line((s(470 + k * 22), s(ry), s(462 + k * 22), s(ry + 26)), fill=(140, 150, 170, 255), width=s(5))
    return im

def sc_head(lt, dur, t):
    im = BG["grey"].copy(); d = ImageDraw.Draw(im)
    MAIN.x, MAIN.y, MAIN.sc = 540, 1700, 3.0
    MAIN.draw(d, t, mood="sad", bob=False)
    cloud(d, 540, 520, 2.2, (255, 255, 255, 235))
    for i, pts in enumerate(SCRIBBLES):
        rot = lt * (1.5 + i * 0.3)
        path = [(s(540 + 170 * (px * math.cos(rot) - py * math.sin(rot))), s(520 + 110 * (px * math.sin(rot) + py * math.cos(rot)))) for px, py in pts]
        d.line(path, fill=(60, 60, 80, 255), width=s(6), joint="curve")
    return im

def sc_crossroads(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    d.polygon([(s(380), s(H)), (s(700), s(H)), (s(560), s(1000)), (s(520), s(1000))], fill=(190, 185, 180, 255))
    d.rectangle(box(0, 1180, W, 1300), fill=(190, 185, 180, 255))
    d.rectangle(box(800, 760, 818, 1200), fill=(140, 100, 70, 255))
    for k, (dy, dirn) in enumerate(((800, 1), (900, -1), (1000, 1))):
        a = ease_back(clamp((lt - k * 0.25) / 0.4))
        if a <= 0: continue
        x0 = 809; x1 = x0 + dirn * 170 * a
        d.polygon([(s(x0), s(dy - 30)), (s(x1), s(dy - 30)), (s(x1 + dirn * 30 * a), s(dy)), (s(x1), s(dy + 30)), (s(x0), s(dy + 30))], fill=(241, 166, 192, 255), outline=INK)
        f = font(max(1, int(48 * SS * a)), 850); d.text((s((x0 + x1) / 2) - f.getlength("?") / 2, s(dy - 30)), "?", font=f, fill=INK)
    MAIN.x, MAIN.y, MAIN.sc = 400, 1320, 1.3
    MAIN.draw(d, t, mood="neutral", look=math.sin(lt * 4))
    for k in range(4):
        ph = (lt * 120 + k * 60) % 240
        d.text((s(300 + k * 60), s(820 - ph)), "?", font=font(s(60), 850), fill=(107, 74, 53, int(255 * (1 - ph / 240))))
    return im

def sc_phone(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    MAIN.x, MAIN.y, MAIN.sc = 540, 1380, 1.5
    MAIN.draw(d, t, mood="sad", arms="phone")
    for k, (cx, cy) in enumerate(((230, 620), (540, 470), (850, 620))):
        a = ease_back(clamp((lt - k * 0.3) / 0.4))
        if a <= 0: continue
        card(d, cx, cy, 230, 380, a)
        p = Person(60 + k, cx, cy + 120 * a, 0.55 * a); p.draw(d, t, mood="happy", arms="wave")
        for j in range(3): heart(d, s(cx - 60 * a + j * 60 * a), s(cy - 140 * a), 0.9 * SS * a, (236, 110, 150, 255))
    return im

def sc_spotlight(lt, dur, t):
    im = BG["night"].copy(); d = ImageDraw.Draw(im)
    z = 1 - 0.25 * clamp(lt / max(1, dur))
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.polygon([(s(480), 0), (s(600), 0), (s(540 + 330 * z), s(1300)), (s(540 - 330 * z), s(1300))], fill=(255, 240, 200, 60))
    gd.ellipse(box(540 - 340 * z, 1250, 540 + 340 * z, 1340), fill=(255, 240, 200, 90))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(20))))
    for k in range(40):
        sx, sy = (k * 137) % W, (k * 251) % 900
        d.ellipse(box(sx, sy, sx + 4, sy + 4), fill=(255, 255, 255, int(120 + 100 * math.sin(t * 2 + k))))
    MAIN.x, MAIN.y, MAIN.sc = 540, 1290, 1.4 * z
    MAIN.draw(d, t, mood="sad", arms="hug", bob=False)
    return im

def sc_school(lt, dur, t):
    im = BG["grey"].copy(); d = ImageDraw.Draw(im)
    d.rectangle(box(0, 1260, W, H), fill=(160, 146, 138, 255))
    # clock with racing hands
    d.ellipse(box(760, 280, 960, 480), fill=(255, 250, 244, 255), outline=INK, width=s(6))
    for spd, ln in ((6, 80), (1, 55)):
        a = t * spd
        d.line((s(860), s(380), s(860 + ln * math.sin(a)), s(380 - ln * math.cos(a))), fill=INK, width=s(6))
    # desk and a growing stack of books
    d.rounded_rectangle(box(220, 1140, 860, 1180), s(10), fill=(140, 100, 70, 255), outline=INK, width=s(4))
    cols = [(241, 166, 192), (170, 196, 226), (247, 214, 120), (176, 204, 170), (196, 150, 120), (226, 132, 160)]
    n = min(len(cols), 1 + int(lt * 3))
    for k in range(n):
        y = 1140 - (k + 1) * 46
        d.rounded_rectangle(box(600 + (k % 2) * 10, y, 820 + (k % 2) * 10, y + 42), s(8), fill=cols[k] + (255,), outline=INK, width=s(4))
    MAIN.x, MAIN.y, MAIN.sc = 380, 1250, 1.3
    MAIN.draw(d, t, mood="sad", bob=False)
    for k in range(3):  # flying papers
        ph = (lt * 0.8 + k * 0.33) % 1
        px, py = 200 + k * 300 + math.sin(t + k) * 40, 300 + ph * 600
        d.polygon([(s(px), s(py)), (s(px + 60), s(py + 10)), (s(px + 50), s(py + 80)), (s(px - 10), s(py + 70))], fill=(255, 250, 244, int(255 * (1 - ph))), outline=INK)
    return im

def sc_night(lt, dur, t):
    im = BG["dusk"].copy(); d = ImageDraw.Draw(im)
    d.rounded_rectangle(box(640, 260, 960, 620), s(20), fill=(30, 26, 50, 255), outline=INK, width=s(8))
    d.ellipse(box(780, 320, 880, 420), fill=(255, 240, 200, 255)); d.ellipse(box(810, 310, 900, 400), fill=(30, 26, 50, 255))
    for k in range(8):
        star(d, 670 + (k * 37) % 270, 300 + (k * 53) % 290, 3 + 2 * math.sin(t * 3 + k), (255, 245, 220, 255))
    d.rounded_rectangle(box(120, 1180, 960, 1300), s(30), fill=(250, 228, 200, 255), outline=INK, width=s(6))
    d.rounded_rectangle(box(140, 1120, 330, 1190), s(30), fill=(255, 250, 244, 255), outline=INK, width=s(5))
    MAIN.x, MAIN.y, MAIN.sc = 520, 1190, 1.15
    MAIN.draw(d, t, mood="sad", sit=True, bob=False, arms="hug")
    # worries popping up one after another
    for k, txt in enumerate(("?", "...", "!?")):
        ph = (lt - k * 0.5) % 2.2
        if lt > k * 0.5: bubble(d, 300 + k * 220, 700 - k * 40, 130, 100, text=txt, a=ease_back(clamp(ph / 0.3)) if ph < 1.8 else 0)
    return im

def sc_home(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    d.rounded_rectangle(box(160, 1180, 760, 1230), s(12), fill=(140, 100, 70, 255), outline=INK, width=s(5))
    for k, (x, sc) in enumerate(((280, 1.25), (640, 1.25))):
        p = ADULTS[k]; p.x, p.y, p.sc = x, 1260, sc
        p.draw(d, t, mood="neutral", look=(1 if k == 0 else -1))
        if (int(lt * 1.5) + k) % 2 == 0: bubble(d, x + (60 if k == 0 else -60), 760, 150, 90, text="bla", a=1)
    MAIN.x, MAIN.y, MAIN.sc = 900, 1360, 0.95
    MAIN.draw(d, t, mood="sad", bob=False)
    bubble(d, 900, 880, 110, 80, text="...", a=0.8 + 0.2 * math.sin(t * 3))
    return im

def sc_friend(lt, dur, t):
    im = BG["grey"].copy(); d = ImageDraw.Draw(im)
    d.rectangle(box(0, 1300, W, H), fill=(160, 146, 138, 255))
    f = CREW[1]
    go = clamp((lt - 0.6) / max(0.5, dur - 0.6))
    f.x, f.y, f.sc = 640 + go * 700, 1290, 1.2
    f.draw(d, t, mood="neutral", walk=t if go > 0 else 0, grey=0.4 * go)
    MAIN.x, MAIN.y, MAIN.sc = 400, 1300, 1.2
    MAIN.draw(d, t, mood="sad" if go > 0.2 else "neutral", arms="wave" if go > 0.1 else "down")
    if go > 0.1:  # a small broken heart
        a = clamp((go - 0.1) / 0.2); cx, cy = 400, 760
        heart(d, s(cx), s(cy), 3.2 * SS * a, (236, 110, 150, 255))
        d.line((s(cx), s(cy - 50 * a), s(cx - 14 * a), s(cy - 10 * a), s(cx + 10 * a), s(cy + 20 * a), s(cx), s(cy + 50 * a)), fill=(246, 236, 228, 255), width=s(8))
    return im

def sc_breathe(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    r = 300 + 90 * math.sin(lt * 1.6)
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse(box(540 - r, 1000 - r, 540 + r, 1000 + r), fill=(241, 166, 192, 110))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(30))))
    MAIN.x, MAIN.y, MAIN.sc = 540, 1300, 1.5
    MAIN.draw(d, t, mood="happy", bob=False)
    return im

def sc_cerita(lt, dur, t):
    im = BG["pink"].copy(); d = ImageDraw.Draw(im)
    for k in range(16):
        a = k / 16 * 6.283 + lt * 0.4
        d.polygon([(s(540), s(800)), (s(540 + 1400 * math.cos(a)), s(800 + 1400 * math.sin(a))), (s(540 + 1400 * math.cos(a + 0.18)), s(800 + 1400 * math.sin(a + 0.18)))], fill=(255, 255, 255, 50))
    a = ease_back(clamp(lt / 0.5))
    if a > 0.01:
        r = RITI.resize((max(1, int(RITI.width * a)), max(1, int(RITI.height * a))), Image.BILINEAR)
        im.alpha_composite(r, (s(540) - r.width // 2, s(860) - r.height // 2))
    b = clamp((lt - 0.6) / 0.4)
    if b > 0:
        f = font(s(96), 850); d.text((s(540) - f.getlength("CeritaProject") / 2, s(330)), "CeritaProject", font=f, fill=INK + (int(255 * b),))
    for k in range(10):
        heart(d, s(120 + k * 95), s(1300 - ((lt * 260 + k * 90) % 900)), 1.4 * SS, (255, 255, 255, 200))
    return im

SPOTS = [(180, 1250), (380, 1180), (700, 1180), (900, 1250)]
def sc_meeting(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    for k, (x, y) in enumerate(SPOTS):
        a = clamp((lt - k * 0.35) / 0.3)
        if a <= 0: continue
        p = CREW[k]; p.x, p.y, p.sc = x, y + (1 - ease_back(a)) * 60, 1.0
        p.draw(d, t, mood="happy" if lt > 1.5 else "neutral", arms="wave" if (k + int(lt * 1.2)) % 3 == 0 else "down")
    MAIN.x, MAIN.y, MAIN.sc = 540, 1360, 1.2
    MAIN.draw(d, t, mood="happy" if lt > 2 else "neutral")
    for k, (x, y) in enumerate(SPOTS):
        ph = (lt - 0.8 - k * 0.45) % 1.8
        if lt > 0.8 + k * 0.45: bubble(d, x, y - 360, 150, 110, icon="heart" if k % 2 else "smile", a=ease_back(clamp(ph / 0.3)) if ph < 1.4 else 0)
    return im

def sc_ikook(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    for k, (x, y) in enumerate(SPOTS):
        p = CREW[k]; p.x, p.y, p.sc = x, y, 1.0; p.draw(d, t, mood="happy")
        if lt > 0.3 + k * 0.35: bubble(d, x, y - 370, 210, 100, text="ik ook!", a=ease_back(clamp((lt - 0.3 - k * 0.35) / 0.3)))
    MAIN.x, MAIN.y, MAIN.sc = 540, 1360, 1.2
    MAIN.draw(d, t, mood="happy", arms="wave")
    for k in range(12):
        sx, sy = 540 + 330 * math.cos(k), 1130 + 120 * math.sin(k * 1.7)
        star(d, sx, sy, 10 + 6 * math.sin(((lt * 2 + k) % 3) * 3), (250, 205, 110, 230))
    return im

def sc_talk(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    f = CREW[2]; f.x, f.y, f.sc = 720, 1320, 1.35
    f.draw(d, t, mood="happy", look=-0.6)
    MAIN.x, MAIN.y, MAIN.sc = 360, 1320, 1.35
    MAIN.draw(d, t, mood="happy" if lt > 1 else "neutral", look=0.6)
    turn = int(lt * 1.3) % 2
    bubble(d, 360 if turn == 0 else 720, 820, 150, 110, icon="heart" if turn else "smile", a=1)
    return im

def sc_hands(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    hop = abs(math.sin(lt * 3)) * 20
    for p, x in zip([CREW[0], CREW[1], MAIN, CREW[2], CREW[3]], [140, 340, 540, 740, 940]):
        p.x, p.y, p.sc = x, 1300 - hop, 0.95
        p.draw(d, t, mood="happy", arms="out", bob=False)
    heart(d, s(540), s(700 - hop), 5 * SS * ease_back(clamp(lt / 0.5)), (236, 110, 150, 255))
    return im

def sc_crowd(lt, dur, t):
    im = BG["pink"].copy(); d = ImageDraw.Draw(im)
    for i, p in enumerate(CROWD):
        r, c = divmod(i, 6)
        a = ease_back(clamp((lt - (r * 0.08 + c * 0.03)) / 0.3))
        if a <= 0: continue
        p.x, p.y, p.sc = 120 + c * 168, 620 + r * 210, 0.48 * a
        p.draw(d, t, mood="happy", arms="wave" if i % 3 == 0 else "down")
    for k in range(10):
        heart(d, s(80 + k * 100), s(1400 - ((lt * 300 + k * 110) % 1100)), 1.3 * SS, (255, 255, 255, 220))
    return im

def badge(d, letter, x=110, y=170):
    d.ellipse(box(x - 70, y - 70, x + 70, y + 70), fill=PINK + (255,), outline=INK, width=s(6))
    f = font(s(90), 850); d.text((s(x) - f.getlength(letter) / 2, s(y - 58)), letter, font=f, fill=INK)

def _ab(lt, t, pick):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    for k, (cx, L) in enumerate(((290, "A"), (790, "B"))):
        on = pick in (L, "both"); a = ease_back(clamp((lt - k * 0.2) / 0.4))
        if a <= 0: continue
        sc = a * ((1.0 if pick == "both" else 1.12) + 0.03 * math.sin(t * 5) if on else (0.85 if pick else 1.0))
        w, h = 340 * sc, 480 * sc; cy = 820
        d.rounded_rectangle(box(cx - w / 2 + 10, cy - h / 2 + 10, cx + w / 2 + 10, cy + h / 2 + 10), s(40), fill=INK + (255,))
        d.rounded_rectangle(box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), s(40), fill=(PINK if on else (255, 250, 244)) + (255,), outline=INK, width=s(6))
        f = font(max(1, int(s(260) * sc)), 850); d.text((s(cx) - f.getlength(L) / 2, s(cy) - s(170) * sc), L, font=f, fill=INK)
    if not pick:
        f = font(s(80), 850); d.text((s(540) - f.getlength("of") / 2, s(780)), "of", font=f, fill=COCOA)
    for k in range(5):
        ph = (lt * 0.7 + k * 0.2) % 1
        d.text((s(120 + k * 210), s(1350 - ph * 300)), "?", font=font(s(64), 850), fill=COCOA + (int(255 * (1 - ph)),))
    return im
def sc_ab(lt, dur, t): return _ab(lt, t, None)
def sc_a(lt, dur, t): return _ab(lt, t, "A")
def sc_b(lt, dur, t): return _ab(lt, t, "B")
def sc_both(lt, dur, t): return _ab(lt, t, "both")

def sc_texts(lt, dur, t):
    """Option A: lots of messages, little real attention."""
    im = BG["grey"].copy(); d = ImageDraw.Draw(im)
    MAIN.x, MAIN.y, MAIN.sc = 540, 1380, 1.5
    MAIN.draw(d, t, mood="neutral", arms="phone")
    n = min(8, 1 + int(lt * 4))
    for k in range(n):
        x, y = 160 + (k % 2) * 520 + (k * 37) % 90, 300 + (k // 2) * 150
        d.rounded_rectangle(box(x, y, x + 300, y + 100), s(40), fill=(255, 255, 255, 235), outline=INK, width=s(4))
        f = font(s(44), 750); txt = ("hey", "wyd", "haha", "?", "hey", "ok", "lol", "hey")[k]
        d.text((s(x + 30), s(y + 22)), txt, font=f, fill=(120, 110, 105))
    badge(d, "A")
    return im

def sc_warm(lt, dur, t):
    """Option B: a real conversation that feels good."""
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    f = CREW[2]; f.x, f.y, f.sc = 720, 1320, 1.35; f.draw(d, t, mood="happy", look=-0.6)
    MAIN.x, MAIN.y, MAIN.sc = 360, 1320, 1.35; MAIN.draw(d, t, mood="happy", look=0.6)
    for k in range(6):
        ph = (lt * 0.6 + k / 6) % 1
        heart(d, s(540 + 60 * math.sin(t * 2 + k)), s(1000 - ph * 600), (1.2 + ph) * SS, (236, 110, 150, int(255 * (1 - ph))))
    badge(d, "B")
    return im

def sc_message(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    f = CREW[1]; f.x, f.y, f.sc = 820, 1340, 1.1
    got = lt > 1.2
    f.draw(d, t, mood="happy" if got else "neutral", arms="wave" if got else "down")
    MAIN.x, MAIN.y, MAIN.sc = 300, 1340, 1.3; MAIN.draw(d, t, mood="happy", arms="phone")
    ph = clamp((lt - 0.2) / 1.0)
    if ph < 1:
        x, y = lerp(330, 790, ph), 820 - math.sin(ph * math.pi) * 260
        bubble(d, x, y, 150, 100, icon="heart", a=1)
    else:
        bubble(d, 820, 820, 150, 100, icon="smile", a=ease_back(clamp((lt - 1.2) / 0.3)))
    return im

def sc_idea(lt, dur, t):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    MAIN.x, MAIN.y, MAIN.sc = 540, 1380, 1.5
    MAIN.draw(d, t, mood="happy", arms="wave")
    a = ease_back(clamp(lt / 0.5)); cx, cy = 540, 560
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    r = (170 + 20 * math.sin(t * 4)) * a; gd.ellipse(box(cx - r, cy - r, cx + r, cy + r), fill=(250, 214, 120, 120))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(25)))); d = ImageDraw.Draw(im)
    if a > 0.02:
        d.ellipse(box(cx - 80 * a, cy - 90 * a, cx + 80 * a, cy + 60 * a), fill=(252, 226, 140, 255), outline=INK, width=s(6))
        d.rounded_rectangle(box(cx - 40 * a, cy + 50 * a, cx + 40 * a, cy + 110 * a), s(10), fill=(190, 180, 175, 255), outline=INK, width=s(5))
        for k in range(8):
            ang = k / 8 * 6.283; r0, r1 = 120 * a, (150 + 15 * math.sin(t * 6 + k)) * a
            d.line((s(cx + r0 * math.cos(ang)), s(cy - 15 + r0 * math.sin(ang)), s(cx + r1 * math.cos(ang)), s(cy - 15 + r1 * math.sin(ang))), fill=INK, width=s(6))
    return im

ROOMS = {"attic": (400, 360, 680, 540), "bed": (180, 560, 540, 900), "room": (540, 560, 900, 900),
         "living": (180, 920, 620, 1290), "kitchen": (620, 920, 900, 1290)}
HOUSE_FOLK = [Person(90 + i, 0, 0, 0.42) for i in range(3)]

def _house(lt, t, focus):
    im = BG["warm"].copy(); d = ImageDraw.Draw(im)
    d.polygon([(s(110), s(560)), (s(540), s(230)), (s(970), s(560))], fill=(226, 132, 160, 255), outline=INK, width=s(8))
    d.rectangle(box(160, 540, 920, 1300), fill=(255, 246, 236, 255), outline=INK, width=s(8))
    d.line((s(160), s(910), s(920), s(910)), fill=INK, width=s(8)); d.line((s(540), s(540), s(540), s(910)), fill=INK, width=s(6)); d.line((s(620), s(910), s(620), s(1300)), fill=INK, width=s(6))
    ax0, ay0, ax1, ay1 = ROOMS["attic"]
    d.rounded_rectangle(box(ax0, ay0, ax1, ay1), s(12), fill=(120, 96, 90, 255), outline=INK, width=s(6))
    # attic door (opens on focus "door")
    op = clamp(lt / 0.8) if focus == "door" else 0
    dx0, dx1 = 490, 590
    if op > 0:
        glow = Image.new("RGBA", im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
        gd.polygon([(s(dx0), s(380)), (s(dx1), s(380)), (s(dx1 + 260 * op), s(900)), (s(dx0 - 260 * op), s(900))], fill=(255, 236, 170, int(140 * op)))
        im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s(18)))); d = ImageDraw.Draw(im)
        d.rectangle(box(dx0, 380, dx1, 540), fill=(255, 236, 170, 255))
        d.polygon([(s(dx0), s(380)), (s(dx0 + 100 * (1 - op)), s(390)), (s(dx0 + 100 * (1 - op)), s(530)), (s(dx0), s(540))], fill=(160, 110, 80, 255), outline=INK)
        for k in range(5): heart(d, s(540 + 120 * math.sin(k * 1.7 + t)), s(470 - ((t * 120 + k * 60) % 200)), 1.0 * SS, (255, 255, 255, 220))
    else:
        d.rectangle(box(dx0, 380, dx1, 540), fill=(160, 110, 80, 255), outline=INK, width=s(5)); d.ellipse(box(570, 455, 582, 467), fill=INK)
        if focus == "attic":
            for k in range(3):
                ph = (lt * 0.8 + k * 0.33) % 1
                d.text((s(430 + k * 90), s(330 - ph * 120)), "?", font=font(s(56), 850), fill=COCOA + (int(255 * (1 - ph)),))
    # bedroom: bed
    d.rounded_rectangle(box(210, 800, 470, 860), s(16), fill=(170, 196, 226, 255), outline=INK, width=s(5)); d.rounded_rectangle(box(215, 770, 300, 810), s(14), fill=(255, 255, 255, 255), outline=INK, width=s(4))
    # kitchen: stove + pan
    d.rectangle(box(760, 1150, 890, 1290), fill=(230, 222, 214, 255), outline=INK, width=s(5)); d.ellipse(box(780, 1120, 870, 1160), fill=(90, 90, 100, 255), outline=INK, width=s(4))
    # living: sofa
    d.rounded_rectangle(box(200, 1200, 560, 1280), s(24), fill=(241, 166, 192, 255), outline=INK, width=s(5))
    # people
    if focus in ("living", "house", "door", "attic", "room"):
        for i, p in enumerate(HOUSE_FOLK):
            p.x, p.y, p.sc = 240 + i * 100, 1240, 0.42; p.draw(d, t, mood="happy", arms="wave" if (i + int(t * 1.5)) % 3 == 0 else "down")
    pos = {"bed": (380, 880), "kitchen": (700, 1290), "living": (575, 1290), "house": (575, 1290), "door": (720, 900), "attic": (720, 900), "room": (720, 900)}[focus]
    MAIN.x, MAIN.y, MAIN.sc = pos[0], pos[1], 0.6
    MAIN.draw(d, t, mood="happy" if focus in ("kitchen", "bed", "door") else "neutral", look=-0.5 if focus in ("door", "attic") else 0)
    if focus == "kitchen":
        for k in range(3):
            ph = (lt * 0.7 + k * 0.33) % 1
            heart(d, s(825 + 20 * math.sin(t * 3 + k)), s(1100 - ph * 140), 0.9 * SS, (236, 110, 150, int(255 * (1 - ph))))
    # dim the other rooms
    key = {"door": "attic"}.get(focus, focus)
    if key in ROOMS:
        dim = Image.new("RGBA", im.size, (0, 0, 0, 0)); dd = ImageDraw.Draw(dim)
        for name, (x0, y0, x1, y1) in ROOMS.items():
            if name != key: dd.rectangle(box(x0 + 4, y0 + 4, x1 - 4, y1 - 4), fill=(60, 40, 40, 90))
        im.alpha_composite(dim); d = ImageDraw.Draw(im)
        x0, y0, x1, y1 = ROOMS[key]; d.rounded_rectangle(box(x0 - 6, y0 - 6, x1 + 6, y1 + 6), s(14), outline=PINK + (255,), width=s(10))
    return im
def sc_house(lt, dur, t): return _house(lt, t, "house")
def sc_house_living(lt, dur, t): return _house(lt, t, "living")
def sc_house_bed(lt, dur, t): return _house(lt, t, "bed")
def sc_house_kitchen(lt, dur, t): return _house(lt, t, "kitchen")
def sc_house_attic(lt, dur, t): return _house(lt, t, "attic")
def sc_house_door(lt, dur, t): return _house(lt, t, "door")

def end_card(lt, line="Je bent niet de enige."):
    im = BG["ink"].copy(); d = ImageDraw.Draw(im)
    a = ease_back(clamp(lt / 0.5))
    if a > 0.01:
        r = RITI.resize((max(1, int(RITI.width * 0.8 * a)), max(1, int(RITI.height * 0.8 * a))), Image.BILINEAR)
        im.alpha_composite(r, (s(540) - r.width // 2, s(560) - r.height // 2))
    b = clamp((lt - 0.4) / 0.4)
    f = font(s(100), 850); d.text((s(540) - f.getlength("CeritaProject") / 2, s(900)), "CeritaProject", font=f, fill=PINK + (int(255 * b),))
    t2 = line; f2 = font(s(54 if len(t2) < 34 else 44), 750); d.text((s(540) - f2.getlength(t2) / 2, s(1040)), t2, font=f2, fill=CREAM + (int(255 * b),))
    c = clamp((lt - 0.9) / 0.4)
    if c > 0:
        f3 = font(s(48), 750); t3 = "zet je op de wachtlijst · link in bio"; bw = f3.getlength(t3) + s(90)
        d.rounded_rectangle((s(540) - bw / 2, s(1180), s(540) + bw / 2, s(1290)), s(55), fill=PINK + (int(255 * c),))
        d.text((s(540) - f3.getlength(t3) / 2, s(1205)), t3, font=f3, fill=INK + (int(255 * c),))
    return im

SCENES = {"alone": sc_alone, "head": sc_head, "crossroads": sc_crossroads, "phone": sc_phone, "spotlight": sc_spotlight,
          "school": sc_school, "night": sc_night, "home": sc_home, "friend": sc_friend, "breathe": sc_breathe,
          "cerita": sc_cerita, "ab": sc_ab, "a": sc_a, "b": sc_b, "both": sc_both, "texts": sc_texts, "warm": sc_warm,
          "message": sc_message, "idea": sc_idea, "house": sc_house, "house_living": sc_house_living, "house_bed": sc_house_bed,
          "house_kitchen": sc_house_kitchen, "house_attic": sc_house_attic, "house_door": sc_house_door, "meeting": sc_meeting, "ikook": sc_ikook, "talk": sc_talk, "hands": sc_hands, "crowd": sc_crowd}

# ---------- timing from the voice ----------
def speech_segments(wav, total):
    out = subprocess.run(["ffmpeg", "-i", wav, "-af", "silencedetect=noise=-38dB:d=0.22", "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    sil = list(zip(starts, ends + [total] * (len(starts) - len(ends))))
    segs, cur = [], 0.0
    for a, b in sil:
        if a > cur + 0.05: segs.append((cur, a))
        cur = b
    if cur < total - 0.05: segs.append((cur, total))
    return segs or [(0.0, total)]

def at_speech(segs, p):
    """Absolute time at which a fraction p (0..1) of all speaking time has passed."""
    tot = sum(b - a for a, b in segs); want = p * tot
    for a, b in segs:
        if want <= b - a: return a + want
        want -= b - a
    return segs[-1][1]

def chunks(text, n=3):
    words, out, cur = text.upper().split(), [], []
    for w in words:
        cur.append(w)
        if len(cur) >= n or w[-1] in ".,?!:": out.append(" ".join(cur)); cur = []
    if cur: out.append(" ".join(cur))
    return out

def plan(lines, segs):
    weights = [max(1, len(l["text"])) for l in lines]; tot = sum(weights); acc = 0
    shots, caps = [], []
    for l, w in zip(lines, weights):
        p0, p1 = acc / tot, (acc + w) / tot
        a, b = at_speech(segs, p0), at_speech(segs, p1)
        if shots and shots[-1][2] == l["scene"]: shots[-1][1] = b
        else: shots.append([a, b, l["scene"]])
        cs = chunks(l["text"]); cw = [len(c) for c in cs]; ct = sum(cw); cacc = 0
        for c, x in zip(cs, cw):
            caps.append((at_speech(segs, p0 + (p1 - p0) * cacc / ct), c)); cacc += x
        acc += w
    if all("at" in l for l in lines):  # times taken from the video's own captions
        shots, caps = [], []
        for i, l in enumerate(lines):
            a = l["at"]; b = lines[i + 1]["at"] if i + 1 < len(lines) else segs[-1][1]
            if shots and shots[-1][2] == l["scene"] and shots[-1][3] == l.get("badge"): shots[-1][1] = b
            else: shots.append([a, b, l["scene"], l.get("badge")])
            cs = chunks(l["text"]); cw = [len(c) for c in cs]; ct = sum(cw); cacc = 0
            for c, x in zip(cs, cw): caps.append((a + (b - a) * cacc / ct, c)); cacc += x
    for i in range(len(shots) - 1): shots[i][1] = shots[i + 1][0]
    shots[0][0] = 0.0
    return shots, caps

def caption(im, t, caps, end, pink):
    txt, age = "", 0
    for i, (a, c) in enumerate(caps):
        nxt = caps[i + 1][0] if i + 1 < len(caps) else end
        if a <= t < nxt: txt, age = c, t - a
    if not txt: return
    size = 78
    while True:
        f = font(int(size * SS), 850); words = txt.split(); space = f.getlength(" ")
        tw = sum(f.getlength(w) for w in words) + space * (len(words) - 1)
        if tw <= s(W - 110) or size <= 50: break
        size -= 4
    pop = 1 + 0.12 * max(0, 1 - age / 0.12)
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    x, y = (im.width - tw) / 2, s(1470)
    for w in words:
        c = PINK if w.strip(".,?!") in pink else (255, 255, 255)
        d.text((x, y), w, font=f, fill=c + (255,), stroke_width=s(7), stroke_fill=(20, 15, 12, 255))
        x += f.getlength(w) + space
    if pop > 1.001:
        lay = lay.resize((int(lay.width * pop), int(lay.height * pop)), Image.BILINEAR)
        off = int(s(1510) * pop - s(1510)); lx = (lay.width - im.width) // 2
        lay = lay.crop((lx, off, lx + im.width, off + im.height))
    im.alpha_composite(lay)

def render(script, preview=None):
    voice = script["voice"]; out = script.get("out", "animatie.mp4")
    pink = {p.upper() for p in script.get("pink", ["CERITAPROJECT", "ALLEEN", "ENIGE"])}
    for l in script["lines"]:
        if l["scene"] not in SCENES: raise ValueError(f"unknown scene {l['scene']}")
    tmp = os.path.join(tempfile.gettempdir(), f"vo_{os.getpid()}.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", voice, "-vn", "-ac", "1", "-ar", "16000", tmp], check=True)
    total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp]))
    if script.get("cut"): total = min(total, float(script["cut"]))  # stop the voice here (e.g. drop an off-app call to action)
    segs = speech_segments(tmp, total) if not all("at" in l for l in script["lines"]) else [(0.0, total)]
    vo_end = min(total, segs[-1][1] + 0.4)
    shots, caps = plan(script["lines"], segs)
    TOTAL = vo_end + END_CARD
    def frame(t):
        if t >= vo_end: return end_card(t - vo_end, script.get("end_line", "Je bent niet de enige."))
        for sh in shots:
            a, b, name = sh[:3]
            if a <= t < b or (sh is shots[-1] and t >= a):
                im = SCENES[name](t - a, b - a, t)
                if len(sh) > 3 and sh[3]: badge(ImageDraw.Draw(im), str(sh[3]), 540, 230)
                break
        caption(im, t, caps, vo_end, pink)
        return im
    if preview:
        for t in preview:
            frame(t).resize((W, H), Image.LANCZOS).convert("RGB").save(f"{os.path.splitext(out)[0]}_{t:05.2f}.png")
        return shots, caps
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", voice, "-map", "0:v", "-map", "1:a", "-af", f"atrim=0:{vo_end},afade=t=out:st={max(0, vo_end - 0.3)}:d=0.3,apad=whole_dur={TOTAL}", "-t", str(TOTAL),
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(int(TOTAL * FPS)):
        p.stdin.write(frame(n / FPS).resize((W, H), Image.LANCZOS).convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    return shots, caps

if __name__ == "__main__":
    sc = json.load(open(sys.argv[1]))
    prev = [float(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else None
    shots, caps = render(sc, prev)
    print(json.dumps({"shots": [[round(sh[0], 2), round(sh[1], 2), sh[2]] for sh in shots]}, ensure_ascii=False))
