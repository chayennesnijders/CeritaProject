"""The ECHT. logo in the Cerita colours: brown-purple with cream letters and a pink dot (and a light version).

Usage: python3 tools/social/echt_logo.py OUTDIR  -> echt-logo-donker.png, echt-logo-licht.png (1080x1080,
safe for TikTok's round profile picture) and echt-logo-banner.png (1500x500).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(__file__)
FIG = os.path.join(HERE, "fonts", "Figtree.ttf")
BG, GLOW = (30, 18, 23), (58, 30, 40)
CREAM, PINK, INK, LIGHT = (251, 241, 234), (242, 162, 184), (17, 12, 14), (247, 243, 240)


def font(size):
    f = ImageFont.truetype(FIG, size)
    f.set_variation_by_name(b"Black")
    return f


def logo(w, h, dark=True, size=None):
    if dark:
        im = Image.new("RGB", (w, h), BG)
        glow = Image.new("RGB", (w, h), BG)
        ImageDraw.Draw(glow).ellipse((w * 0.15, h * 0.15, w * 0.85, h * 0.85), fill=GLOW)
        im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(min(w, h) / 6)), 1.0)
    else:
        im = Image.new("RGB", (w, h), LIGHT)
    d = ImageDraw.Draw(im)
    f = font(size or int(min(w, h) * 0.24))
    word = "ECHT"
    tw = f.getlength(word)
    r = f.size * 0.11  # the dot
    gap = f.size * 0.05
    total = tw + gap + 2 * r
    x = (w - total) / 2
    bbox = d.textbbox((0, 0), word, font=f)
    y = (h - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((x, y), word, font=f, fill=CREAM if dark else INK)
    base = y + bbox[3]
    cx = x + tw + gap + r
    d.ellipse((cx - r, base - 2 * r, cx + r, base), fill=PINK if dark else (178, 58, 98))
    return im


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    logo(1080, 1080, True).save(os.path.join(out, "echt-logo-donker.png"))
    logo(1080, 1080, False).save(os.path.join(out, "echt-logo-licht.png"))
    logo(1500, 500, True, size=170).save(os.path.join(out, "echt-logo-banner.png"))


if __name__ == "__main__":
    main()
