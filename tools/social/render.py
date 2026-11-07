"""Render a week of CeritaProject social videos from a plan file.

Usage:  python3 tools/social/render.py plan.json [outdir]

plan.json: {"posts": [ {"id": "dag1", "format": "...", ...}, ... ]}
Formats and their fields:
  quote    bg, text                      yellow quote on an animated background
  pause    bg, messages[6-10], title?, cta?   "pause the video" game
  cards    bg, messages[3], cta?         "pick 1, 2 or 3" cards
  words    bg, hook, text, pose?, cta?   hook, then word by word, Riti pops in
  overlay  src, captions[], pill?        yellow captions on an existing video (keeps its sound)
  slides   cover{hook, sub?, pose?}, slides[3-8]{title, body, pose?}, end{cta?, help?}
           carousel: <id>-916-<k>.png (TikTok photo mode, Snapchat Story), <id>-45-<k>.png
           (Instagram carousel) and <id>.mp4 slideshow (YouTube Shorts, Snapchat Spotlight)
bg: nacht | regen | zonsondergang | lucht.  pose: blij, troostend, trots, denkend, verdrietig, riti.
Every video is 1080x1920, silent unless overlay (add trending sound in the app), no copyrighted material.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make import Scene, text_layer, brand, font, W, H, FPS  # noqa: E402
from riti_anim import Sky  # noqa: E402
import interact  # noqa: E402
import overlay  # noqa: E402
import slides  # noqa: E402

BGS = {"nacht", "regen", "zonsondergang", "lucht"}
POSES = {"blij", "troostend", "trots", "denkend", "verdrietig", "riti", "boos"}


def _pill():
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f = font(44, 650); t = "CeritaProject · link in bio"
    bw = f.getlength(t) + 80; d = ImageDraw.Draw(lay)
    d.rounded_rectangle(((W - bw) / 2, 1500, (W + bw) / 2, 1596), 48, fill=(20, 16, 14, 230))
    d.text(((W - f.getlength(t)) / 2, 1522), t, font=f, fill=(242, 170, 200, 255)); return lay


def _fade(layer, a):
    return layer if a >= 1 else Image.fromarray((np.array(layer) * np.array([1, 1, 1, a])).astype(np.uint8))


def quote(out, bg, text, secs=10, seed=1):
    # Light sky makes yellow text unreadable: quotes never use it.
    sc = Scene("nacht" if bg == "lucht" else bg, seed)
    tl, br, pl = text_layer(text), brand(), _pill()
    p = interact.writer(out, secs)
    for n in range(secs * FPS):
        t = n / FPS; im = sc.frame(t)
        a = min(1, max(0, (t - 0.4) / 0.6))
        if a > 0: im.alpha_composite(_fade(tl, a), (0, int(20 * (1 - a))))
        im.alpha_composite(br)
        b = min(1, max(0, (t - (secs - 2.8)) / 0.4))
        if b > 0: im.alpha_composite(_fade(pl, b))
        p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close(); p.wait()


def check(post):
    f = post.get("format"); bg = post.get("bg", "nacht")
    if f != "overlay" and bg not in BGS: raise ValueError(f"{post.get('id')}: unknown bg {bg}")
    if f == "pause" and not (6 <= len(post.get("messages", [])) <= 10): raise ValueError(f"{post['id']}: pause needs 6-10 messages")
    if f == "cards" and len(post.get("messages", [])) != 3: raise ValueError(f"{post['id']}: cards needs exactly 3 messages")
    if f == "words" and post.get("pose", "troostend") not in POSES: raise ValueError(f"{post['id']}: unknown pose")
    if f == "slides" and not (3 <= len(post.get("slides", [])) <= 8 and post.get("cover", {}).get("hook")): raise ValueError(f"{post['id']}: slides needs a cover hook and 3-8 slides")
    if f not in {"quote", "pause", "cards", "words", "overlay", "slides"}: raise ValueError(f"{post.get('id')}: unknown format {f}")


def render(post, outdir):
    check(post)
    out = os.path.join(outdir, post["id"] + ".mp4"); f = post["format"]; bg = post.get("bg", "nacht")
    if f == "quote": quote(out, bg, post["text"], post.get("secs", 10), post.get("seed", 1))
    elif f == "pause": interact.pause_game(out, post["messages"], bg, post.get("secs", 11), post.get("title", "Pauzeer de video voor jouw boodschap van vandaag"), post.get("cta", "Welke kreeg jij? Comment!"))
    elif f == "cards": interact.pick_card(out, post["messages"], bg, 15, post.get("cta", "Zet je nummer in de comments"))
    elif f == "words": interact.word_reveal(out, post["hook"], post["text"], bg, post.get("pose", "troostend"), post.get("secs", 11), post.get("cta", "Tik 2x als je dit nodig had"))
    elif f == "overlay": overlay.run({"src": post["src"], "out": out, "captions": post["captions"], "pill": post.get("pill")})
    elif f == "slides": slides.render(outdir, post["id"], post["cover"], post["slides"], post.get("end", {}))
    size = os.path.getsize(out)
    if size > 15 * 1024 * 1024:  # the dashboard stores videos up to 15 MB: re-encode smaller
        tmp = out + ".tmp.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-c:v", "libx264", "-crf", "28", "-c:a", "copy", tmp], check=True)
        os.replace(tmp, out)
    return out


if __name__ == "__main__":
    plan = json.load(open(sys.argv[1]))
    outdir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "videos")
    os.makedirs(outdir, exist_ok=True)
    for post in plan["posts"]: check(post)  # fail fast before rendering anything
    for post in plan["posts"]:
        print("klaar", render(post, outdir), flush=True)
