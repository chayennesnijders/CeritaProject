"""Interactive short videos: pause-the-video, pick-a-card, word-by-word with Riti."""
import sys, math, random, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from make import Scene, font, wrap, W, H, FPS, YELLOW, brand
from riti_anim import pose, heart, sparkle, ease_back

CREAM, PINK, BROWN, DARKPINK = (255, 246, 238), (242, 170, 190), (74, 42, 30), (226, 110, 140)

def shadow_text(im, text, y, size=84, color=YELLOW, maxw=W - 160, scale=1.0, alpha=1.0):
    if alpha <= 0: return
    scale = max(scale, 0.05); f = font(max(4, int(size * scale))); lines = wrap(text, f, maxw); lh = int(size * scale * 1.2)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top = y - (len(lines) - 1) * lh // 2
    for i, ln in enumerate(lines):
        x = (W - f.getlength(ln)) / 2; yy = top + i * lh
        ImageDraw.Draw(sh).text((x + 3, yy + 4), ln, font=f, fill=(0, 0, 0, int(230 * alpha)))
        ImageDraw.Draw(lay).text((x, yy), ln, font=f, fill=color + (int(255 * alpha),))
    sh = sh.filter(ImageFilter.GaussianBlur(6)); sh.alpha_composite(lay); im.alpha_composite(sh)

def card_face(text, w=760, h=1000, n=None):
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 60, fill=CREAM + (255,), outline=PINK + (255,), width=14)
    r = pose("blij", 230); c.alpha_composite(r, ((w - r.width) // 2, 70))
    f = font(66, 750); lines = wrap(text, f, w - 130); lh = 82
    top = 380 + (h - 380 - 120 - len(lines) * lh) // 2
    for i, ln in enumerate(lines): d.text(((w - f.getlength(ln)) / 2, top + i * lh), ln, font=f, fill=BROWN)
    for x in (w // 2 - 60, w // 2, w // 2 + 60): heart(d, x, h - 90, 1.3, DARKPINK + (255,))
    if n: f2 = font(44, 700); d.text((50, 40), str(n), font=f2, fill=DARKPINK)
    return c

def card_back(n, w=300, h=420):
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 34, fill=(236, 140, 165, 255), outline=CREAM + (255,), width=10)
    for yy in range(40, h, 70):
        for xx in range(35 + (yy // 70 % 2) * 35, w, 70): heart(d, xx, yy, 0.9, (250, 200, 214, 255))
    f = font(150, 800); t = str(n)
    d.ellipse((w / 2 - 95, h / 2 - 95, w / 2 + 95, h / 2 + 95), fill=CREAM + (255,))
    d.text(((w - f.getlength(t)) / 2, h / 2 - 98), t, font=f, fill=DARKPINK)
    return c

def small_face(text, w=300, h=420):
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 34, fill=CREAM + (255,), outline=PINK + (255,), width=10)
    r = pose("blij", 110); c.alpha_composite(r, ((w - r.width) // 2, 22))
    f = font(36, 750); lines = wrap(text, f, w - 44); lh = 44
    top = 150 + (h - 150 - len(lines) * lh) // 2 - 10
    for i, ln in enumerate(lines): d.text(((w - f.getlength(ln)) / 2, top + i * lh), ln, font=f, fill=BROWN)
    return c

def paste_scaled(im, sprite, cx, cy, sx=1.0, sy=1.0, rot=0):
    w, h = max(1, int(sprite.width * sx)), max(1, int(sprite.height * sy))
    s = sprite.resize((w, h), Image.BILINEAR)
    if rot: s = s.rotate(rot, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(s, (int(cx - s.width / 2), int(cy - s.height / 2)))

def writer(out, secs):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", out]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)

def pill(im, text, y=1640, a=1.0):
    if a <= 0: return
    f = font(44, 650); bw = f.getlength(text) + 80; d = ImageDraw.Draw(im)
    d.rounded_rectangle(((W - bw) / 2, y, (W + bw) / 2, y + 96), 48, fill=(20, 16, 14, int(230 * a)))
    d.text(((W - f.getlength(text)) / 2, y + 22), text, font=f, fill=(242, 170, 200, int(255 * a)))

# ---------- A: pause the video ----------
def pause_game(out, msgs, bg="zonsondergang", secs=11, title="Pauzeer de video voor jouw boodschap van vandaag", cta="Welke kreeg jij? Comment!"):
    sc = Scene(bg, 4); faces = [card_face(m) for m in msgs]; br = brand(); p = writer(out, secs)
    for n in range(secs * FPS):
        t = n / FPS; im = sc.frame(t)
        shadow_text(im, title, 250, 74, alpha=min(1, t / 0.4))
        # cards flick fast; a little bounce on each swap
        k = int(t / 0.14) % len(faces); ph = (t % 0.14) / 0.14
        s = 1 + 0.04 * (1 - ph)
        paste_scaled(im, faces[k], W / 2, 1010, s, s)
        pill(im, cta, 1560, min(1, max(0, (t - 1.5) / 0.4)))
        im.alpha_composite(br); p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close(); p.wait()

# ---------- B: pick a card 1-2-3 ----------
def pick_card(out, msgs, bg="regen", secs=15, cta="Zet je nummer in de comments"):
    sc = Scene(bg, 7); backs = [card_back(i + 1) for i in range(3)]; fronts = [small_face(m) for m in msgs]; big = [card_face(m, n=i + 1) for i, m in enumerate(msgs)]
    br = brand(); p = writer(out, secs); xs = [W / 2 - 330, W / 2, W / 2 + 330]
    for n in range(secs * FPS):
        t = n / FPS; im = sc.frame(t); d = ImageDraw.Draw(im)
        if t < 4.2:
            shadow_text(im, "Kies 1, 2 of 3", 300, 104, scale=ease_back(min(1, t / 0.5)))
            shadow_text(im, "Onthoud je nummer!", 440, 60, color=(255, 255, 255), alpha=min(1, max(0, (t - 0.6) / 0.4)))
        for i in range(3):
            appear = ease_back(min(1, max(0, (t - 0.3 - i * 0.15) / 0.5)))
            bob = 12 * math.sin(t * 3 + i)
            flip_t = 6.0 + i * 2.6  # each card flips in turn
            if t < flip_t:
                spr, sx = backs[i], appear
                if 2.0 < t < 4.2:  # countdown wiggle
                    rot = 5 * math.sin(t * 14 + i)
                else: rot = 0
            elif t < flip_t + 0.35:
                q = (t - flip_t) / 0.35; sx = abs(math.cos(q * math.pi)); spr = backs[i] if q < 0.5 else fronts[i]; rot = 0
            else: spr, sx, rot = fronts[i], 1, 0
            hl = flip_t <= t < flip_t + 2.4
            paste_scaled(im, spr, xs[i], 1080 + bob - (30 if hl else 0), sx * (1.08 if hl else 1), appear * (1.08 if hl else 1), rot)
        if 2.0 <= t < 5.4:  # countdown 3-2-1
            k = 3 - int((t - 2.0) / 1.1)
            if k >= 1:
                ph = ((t - 2.0) % 1.1) / 1.1
                shadow_text(im, str(k), 560, 220, color=(255, 255, 255), scale=1.4 - 0.4 * ease_back(min(1, ph * 3)), alpha=1 - max(0, ph - 0.8) * 5)
        for i in range(3):  # big reveal of the flipped card's message
            f0 = 6.0 + i * 2.6
            if f0 + 0.35 <= t < f0 + 2.4:
                a = min(1, (t - f0 - 0.35) / 0.3) * min(1, (f0 + 2.4 - t) / 0.3)
                shadow_text(im, f"{i + 1}: {msgs[i]}", 520, 72, alpha=a)
        if t > 13.6:
            shadow_text(im, "Welk nummer had jij?", 520, 84, alpha=min(1, (t - 13.6) / 0.4))
        pill(im, cta, 1560, min(1, max(0, (t - 13.6) / 0.4)))
        im.alpha_composite(br); p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close(); p.wait()

# ---------- C: hook + word by word + Riti + double tap ----------
def word_reveal(out, hook, text, bg="nacht", riti_pose="troostend", secs=11, cta="Tik 2x als je dit nodig had"):
    sc = Scene(bg, 3); words = text.split(); p = writer(out, secs); br = brand()
    t_words = 2.0; per = 0.32; parts = []
    for n in range(secs * FPS):
        t = n / FPS; im = sc.frame(t)
        if t < 2.0:
            s = ease_back(min(1, t / 0.45)); shadow_text(im, hook, 820, 92, color=(255, 255, 255), scale=s, alpha=min(1, (2.0 - t) / 0.25))
        else:
            k = min(len(words), int((t - t_words) / per) + 1)
            shadow_text(im, " ".join(words[:k]), 640, 84)
            # Riti pops in once the text is complete
            done = t_words + len(words) * per
            if t > done:
                a = ease_back(min(1, (t - done) / 0.45)); r = pose(riti_pose, 520)
                paste_scaled(im, r, W / 2, 1290 - 14 * abs(math.sin(t * 2.4)), a, a)
            if t > done + 1.2:
                b = min(1, (t - done - 1.2) / 0.4)
                pill(im, cta, 1580, b)
                # double-tap heart burst
                tb = (t - done - 1.2) % 1.6
                if tb < 0.6:
                    d = ImageDraw.Draw(im); sz = 2.2 + tb * 2.5; al = int(255 * (1 - tb / 0.6))
                    heart(d, W / 2 + 270, 1120 - tb * 160, sz, (255, 120, 160, al)); heart(d, W / 2 - 280, 1180 - tb * 140, sz * 0.8, (255, 150, 180, al))
        im.alpha_composite(br); p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close(); p.wait()
