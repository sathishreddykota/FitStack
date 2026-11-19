"""Usage: python scripts/make-icons.py <path to fitstack folder>  (needs Pillow)

Draw the FitStack mark (the Ring: Night ring + lime dot on Ember) and write every app/web icon size."""
import sys, os
from PIL import Image, ImageDraw
root = sys.argv[1]
EMBER_TOP, EMBER_BOT, NIGHT = (255, 138, 87), (232, 85, 26), (10, 10, 15)

def gradient(n):
    g = Image.new("RGB", (n, n))
    d = ImageDraw.Draw(g)
    for y in range(n):
        t = y / (n - 1)
        d.line([(0, y), (n, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(EMBER_TOP, EMBER_BOT)))
    return g

LIME = (200, 245, 96)

def mark(draw, n, box, width_frac):
    """The Ring (100-unit box): r=29, stroke 12, 76% from 12 o'clock clockwise; lime dot r=7 at (35.5, 24.9)."""
    x0, y0, s = box
    u = s / 100
    w = 12 * u
    cx, cy, r = x0 + 50 * u, y0 + 50 * u, 29 * u
    start, end = -90, -90 + 0.76 * 360
    draw.arc([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], start, end, fill=NIGHT, width=round(w))
    import math
    for a in (start, end):  # round caps
        px, py = cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))
        draw.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=NIGHT)
    dx, dy, dr = x0 + 35.5 * u, y0 + 24.9 * u, 7 * u
    draw.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=LIME)

def tile(n, radius_frac=0.28, mark_frac=0.78, full_bleed=False):
    S = n * 4  # supersample
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bg = gradient(S).convert("RGBA")
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=0 if full_bleed else round(S * radius_frac), fill=255)
    img.paste(bg, (0, 0), mask)
    ms = S * mark_frac
    mark(ImageDraw.Draw(img), S, ((S - ms) / 2, (S - ms) / 2, ms), 3.1 / 24 * mark_frac)
    return img.resize((n, n), Image.LANCZOS)

def round_icon(n):
    S = n * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).ellipse([0, 0, S - 1, S - 1], fill=255)
    img.paste(gradient(S).convert("RGBA"), (0, 0), mask)
    ms = S * 0.74
    mark(ImageDraw.Draw(img), S, ((S - ms) / 2, (S - ms) / 2, ms), 3.1 / 24 * 0.52)
    return img.resize((n, n), Image.LANCZOS)

def foreground(n):
    """Adaptive-icon foreground: transparent, mark inside the 66/108 safe zone."""
    S = n * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ms = S * 0.64
    mark(ImageDraw.Draw(img), S, ((S - ms) / 2, (S - ms) / 2, ms), 3.1 / 24 * 0.40)
    return img.resize((n, n), Image.LANCZOS)

web = os.path.join(root, "public", "icons")
tile(192).save(os.path.join(web, "icon-192.png"))
tile(512).save(os.path.join(web, "icon-512.png"))
tile(512, mark_frac=0.62, full_bleed=True).save(os.path.join(web, "icon-maskable-512.png"))  # maskable: full bleed, mark in safe zone
tile(180, mark_frac=0.72, full_bleed=True).convert("RGB").save(os.path.join(web, "apple-touch-icon.png"))  # iOS rounds it itself
tile(64).save(os.path.join(root, "src", "app", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

res = os.path.join(root, "android", "app", "src", "main", "res")
for d, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    folder = os.path.join(res, f"mipmap-{d}")
    tile(px).save(os.path.join(folder, "ic_launcher.png"))
    round_icon(px).save(os.path.join(folder, "ic_launcher_round.png"))
    foreground(round(px * 108 / 48)).save(os.path.join(folder, "ic_launcher_foreground.png"))
print("icons written")
