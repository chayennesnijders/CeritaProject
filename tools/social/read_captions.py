"""Read the burned-in captions of an existing video (white or pink text) with their start times.

Usage:  python3 tools/social/read_captions.py video.mp4 [y0 y1] [--white]
Prints JSON [[start_seconds, "text"], ...]. Needs ffmpeg and tesseract (apt-get install tesseract-ocr tesseract-ocr-nld).
Used to turn the owner's older talking videos into animations: the lines give both the words and the timing.
"""
import json, re, subprocess, sys
import numpy as np
from PIL import Image

FPS = 10
WORD = re.compile(r"[A-Za-zÀ-ÿ0-9]+[A-Za-zÀ-ÿ0-9'’-]*[,.?!:]?")


WHITE_ONLY = False  # set with --white when the background itself is pink (a pink shirt)


def mask(fr):
    white = fr.min(axis=3) > 232
    if WHITE_ONLY: return white
    pink = (fr[..., 0] > 200) & (fr[..., 1] < 170) & (fr[..., 2] > 150)
    return white | pink


def tidy(m):
    w = m.shape[1]; c = m[:, int(w * 0.12):int(w * 0.88)]
    full = np.zeros_like(m); full[:, int(w * 0.12):int(w * 0.88)] = c
    return full


def ocr(m):
    im = Image.fromarray(np.where(m, 0, 255).astype(np.uint8)).resize((m.shape[1] * 3, m.shape[0] * 3), Image.LANCZOS)
    out = subprocess.run(["tesseract", "-", "-", "-l", "nld", "--psm", "6"], input=_png(im), capture_output=True).stdout.decode()
    words = [w.strip("‘’'\"|_—-“”„") for w in out.split()]
    keep = [w for w in words if WORD.fullmatch(w) and (sum(c.isalpha() for c in w) >= 2 or w.upper() in ("A", "B", "IK") or w.strip(",.?!").isdigit())]
    return " ".join(keep)


def _png(im):
    import io
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def read(video, y0=None, y1=None):
    w, h = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", video]).decode().split(",")[:2])
    y0 = int(h * 0.62) if y0 is None else y0; y1 = int(h * 0.92) if y1 is None else y1
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vf", f"fps={FPS},crop={w}:{y1 - y0}:0:{y0}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, y1 - y0, w, 3)
    m = np.stack([tidy(x) for x in mask(fr)]); segs, start = [], 0
    for i in range(1, len(m)):
        a, b = m[i - 1], m[i]; u = (a | b).sum()
        if u > 30 and (a ^ b).sum() / u > 0.4: segs.append((start, i)); start = i
    segs.append((start, len(m)))
    out = []
    for a, b in segs:
        k = m[(a + b) // 2]
        if k.sum() < 30: continue
        txt = ocr(k)
        if txt and (not out or out[-1][1] != txt): out.append([round(a / FPS, 2), txt])
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--white"]
    WHITE_ONLY = "--white" in sys.argv
    print(json.dumps(read(args[0], *(int(x) for x in args[1:3])), ensure_ascii=False))
