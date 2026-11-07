"""Put yellow captions (and an end pill) on an existing video. Keeps its sound. Usage: overlay.py job.json"""
import os, sys, json, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter
from make import font, wrap, YELLOW

W, H = 1080, 1920
def cap_layer(text, y, size, box):
    f = font(size); lines = wrap(text, f, W - 200); lh = int(size * 1.22)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if box:
        wmax = max(f.getlength(l) for l in lines)
        ImageDraw.Draw(lay).rounded_rectangle(((W - wmax) / 2 - 40, y - 24, (W + wmax) / 2 + 40, y + len(lines) * lh + 14), 36, fill=(30, 18, 14, 150))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); tx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for i, ln in enumerate(lines):
        x = (W - f.getlength(ln)) / 2; yy = y + i * lh
        ImageDraw.Draw(sh).text((x + 3, yy + 4), ln, font=f, fill=(0, 0, 0, 230))
        ImageDraw.Draw(tx).text((x, yy), ln, font=f, fill=YELLOW + (255,))
    sh = sh.filter(ImageFilter.GaussianBlur(6)); lay.alpha_composite(sh); lay.alpha_composite(tx); return lay

def pill_layer(text, y):
    f = font(46, 650); bw = f.getlength(text) + 80
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rounded_rectangle(((W - bw) / 2, y, (W + bw) / 2, y + 100), 50, fill=(20, 16, 14, 235))
    d.text(((W - f.getlength(text)) / 2, y + 24), text, font=f, fill=(242, 170, 200, 255)); return lay

def run(job):
    src, out = job["src"], job["out"]
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]))
    inputs, filters, last = ["-i", src], [f"[0:v]scale={W}:{H}:flags=lanczos,setsar=1[v0]"], "v0"
    items = [(c, cap_layer(c["text"], c["y"], c.get("size", 80), c.get("box", False))) for c in job["captions"]]
    if job.get("pill"): items.append((job["pill"], pill_layer(job["pill"]["text"], job["pill"].get("y", 1560))))
    for i, (c, lay) in enumerate(items):
        p = os.path.join(tempfile.gettempdir(), f"cerita_lay_{os.getpid()}_{i}.png"); lay.save(p)
        inputs += ["-loop", "1", "-i", p]
        a, b = c["start"], min(c.get("end", dur), dur)
        fo = "" if c.get("end") is None else f",fade=t=out:st={b - 0.3}:d=0.3:alpha=1"
        filters.append(f"[{i+1}:v]format=rgba,fade=t=in:st={a}:d=0.45:alpha=1{fo}[l{i}]")
        filters.append(f"[{last}][l{i}]overlay=0:0:enable='between(t,{a},{b})':shortest=1[v{i+1}]"); last = f"v{i+1}"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters), "-map", f"[{last}]", "-map", "0:a?",
           "-t", str(dur), "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True); print("klaar", out)

