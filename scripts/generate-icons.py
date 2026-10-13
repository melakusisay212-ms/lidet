"""Generates Lidet launcher icons (adaptive foreground, legacy square/round, monochrome) and a 1024px master.
Run: python3 scripts/generate-icons.py   (needs Pillow). Output is committed, so CI does not need Python."""
import os
from PIL import Image, ImageDraw

PLUM, IRIS, CHAMPAGNE, PAPER = (38, 24, 50), (121, 85, 201), (225, 193, 139), (248, 243, 235)
OUT = os.path.join(os.path.dirname(__file__), "..", "resources", "android", "res")
SS = 4  # supersampling for smooth edges

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        import math
        ang = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)

def glyph(size, mono=False):
    """Calendar page + spark, drawn inside the 66% adaptive-icon safe zone, on a transparent canvas."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = h = s * 0.50
    x0, y0 = (s - w) / 2, (s - h) / 2 + s * 0.015
    page = (255, 255, 255, 255) if mono else PAPER + (255,)
    band = (255, 255, 255, 255) if mono else IRIS + (255,)
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=s * 0.07, fill=page)
    if not mono:
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h * 0.26), radius=s * 0.07, fill=band)
        d.rectangle((x0, y0 + h * 0.13, x0 + w, y0 + h * 0.26), fill=band)
        for fx in (0.28, 0.72):  # binder rings
            d.rounded_rectangle((x0 + w * fx - s * 0.012, y0 - s * 0.03, x0 + w * fx + s * 0.012, y0 + h * 0.10), radius=s * 0.012, fill=CHAMPAGNE + (255,))
        star(d, x0 + w / 2, y0 + h * 0.63, w * 0.27, IRIS + (255,))
        star(d, x0 + w * 0.80, y0 + h * 0.44, w * 0.075, CHAMPAGNE + (255,))
    else:
        star(d, x0 + w / 2, y0 + h * 0.63, w * 0.27, (0, 0, 0, 0))  # cut-out star for the themed icon
    return img.resize((size, size), Image.LANCZOS)

def save(img, folder, name):
    p = os.path.join(OUT, folder); os.makedirs(p, exist_ok=True); img.save(os.path.join(p, name), optimize=True)

def legacy(size, round_):
    bg = Image.new("RGBA", (size, size), PLUM + (255,))
    bg.alpha_composite(glyph(size).resize((size, size)))
    # glyph sits in the safe zone of a 108dp canvas; scale up for legacy 48dp icon so it fills the shape properly
    scale = 1.45
    g = glyph(size).resize((int(size * scale), int(size * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), PLUM + (255,))
    canvas.alpha_composite(g, ((size - g.width) // 2, (size - g.height) // 2))
    mask = Image.new("L", (size * SS, size * SS), 0)
    md = ImageDraw.Draw(mask)
    if round_: md.ellipse((0, 0, size * SS - 1, size * SS - 1), fill=255)
    else: md.rounded_rectangle((0, 0, size * SS - 1, size * SS - 1), radius=size * SS * 0.22, fill=255)
    canvas.putalpha(mask.resize((size, size), Image.LANCZOS))
    return canvas

DENS = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
for d, (leg, fg) in DENS.items():
    save(legacy(leg, False), f"mipmap-{d}", "ic_launcher.png")
    save(legacy(leg, True), f"mipmap-{d}", "ic_launcher_round.png")
    save(glyph(fg), f"mipmap-{d}", "ic_launcher_foreground.png")
    save(glyph(fg, mono=True), f"mipmap-{d}", "ic_launcher_monochrome.png")

master = Image.new("RGBA", (1024, 1024), PLUM + (255,)); master.alpha_composite(glyph(1024).resize((1024, 1024)))
master.convert("RGB").save(os.path.join(OUT, "..", "..", "icon-1024.png"))
print("icons generated")
