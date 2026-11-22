"""Draws the sample illustrations, logo, favicons and social image used by the template.

Everything is drawn from scratch with Pillow, so the images are original to this project
(see LICENSE). Re-run it only if you want to regenerate the samples:

    pip install pillow
    python3 tools/make_sample_images.py

It overwrites images/menu/*.jpg, images/gallery/*.jpg and images/brand/*.
"""
import math
import os
import random

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 2  # supersampling factor for smooth edges
W, H = 1000 * S, 750 * S

BG = (233, 235, 217)
BREAD, BREAD_D, CRUST = (232, 190, 120), (205, 150, 80), (190, 130, 62)
GREEN, GREEN_D = (104, 160, 72), (74, 125, 52)
RED, RED_D = (214, 66, 52), (170, 44, 36)
CHEESE = (250, 205, 70)
HAM, HAM_D = (236, 150, 150), (206, 112, 120)
SAUSAGE, SAUSAGE_D = (186, 84, 60), (146, 56, 40)
MUSH, MUSH_D = (226, 206, 178), (170, 140, 104)
SHADOW = (205, 208, 188)
COFFEE, COFFEE_D = (96, 60, 38), (66, 40, 24)
WHITE = (250, 248, 242)


def canvas():
    im = Image.new("RGB", (W, H), BG)
    return im, ImageDraw.Draw(im)


def px(*v):
    return [int(x * S) for x in v]


def pts(points):
    return [(int(a * S), int(b * S)) for a, b in points]


def shadow(d, cx, cy, rx, ry):
    d.ellipse(px(cx - rx, cy - ry, cx + rx, cy + ry), fill=SHADOW)


def save(im, folder, name):
    im = im.resize((W // S, H // S), Image.LANCZOS)
    path = os.path.join(ROOT, "images", folder, name + ".jpg")
    im.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    return im


# ---------------------------------------------------------------- food
def coffee(kind):
    im, d = canvas()
    cx, cy = 500, 390
    shadow(d, cx, cy + 250, 300, 28)
    d.ellipse(px(cx - 330, cy - 280, cx + 330, cy + 280), fill=(238, 236, 230), outline=(214, 210, 200), width=4 * S)
    d.rounded_rectangle(px(cx + 200, cy - 40, cx + 400, cy + 40), radius=40 * S, fill=WHITE, outline=(214, 210, 200), width=4 * S)
    r = 215 if kind != "espresso" else 160
    d.ellipse(px(cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14), fill=WHITE, outline=(214, 210, 200), width=4 * S)
    d.ellipse(px(cx - r, cy - r, cx + r, cy + r), fill=COFFEE)
    if kind == "espresso":
        d.ellipse(px(cx - r + 12, cy - r + 12, cx + r - 12, cy + r - 12), fill=(176, 110, 56))
        d.ellipse(px(cx - r + 34, cy - r + 34, cx + r - 34, cy + r - 34), fill=COFFEE_D)
    else:
        d.ellipse(px(cx - r + 16, cy - r + 16, cx + r - 16, cy + r - 16), fill=(226, 190, 140))
        for k in range(4):  # latte-art leaf
            w = 120 - k * 24
            d.ellipse(px(cx - w, cy - 120 + k * 30, cx + w, cy + 150 - k * 22), outline=COFFEE if kind == "latte" else WHITE, width=10 * S)
        if kind == "latte":
            d.line(px(cx, cy - 140, cx, cy + 150), fill=WHITE, width=10 * S)
            d.ellipse(px(cx - 100, cy - 120, cx + 100, cy + 140), fill=WHITE)
            for k in range(5):
                d.ellipse(px(cx - 90 + k * 8, cy - 100 + k * 36, cx + 90 - k * 8, cy - 60 + k * 36), outline=(226, 190, 140), width=8 * S)
            d.line(px(cx, cy - 110, cx, cy + 130), fill=(226, 190, 140), width=8 * S)
        else:  # cappuccino: foam with cocoa dusting
            d.ellipse(px(cx - 170, cy - 170, cx + 170, cy + 170), fill=(246, 236, 220))
            rng = random.Random(3)
            for _ in range(160):
                a, rr = rng.uniform(0, 6.28), rng.uniform(0, 150)
                x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
                d.ellipse(px(x - 4, y - 4, x + 4, y + 4), fill=(150, 98, 60))
    return save(im, "menu", {"espresso": "espresso", "cappuccino": "cappuccino", "latte": "latte"}[kind])


def iced_tea():
    im, d = canvas()
    shadow(d, 500, 690, 200, 22)
    d.polygon(pts([(330, 160), (670, 160), (630, 680), (370, 680)]), fill=(236, 244, 246), outline=(200, 214, 218))
    d.polygon(pts([(340, 230), (660, 230), (624, 672), (376, 672)]), fill=(214, 128, 40))
    for x, y in [(400, 280), (520, 300), (460, 400), (570, 420), (410, 520), (530, 540)]:
        d.rounded_rectangle(px(x - 50, y - 50, x + 50, y + 50), radius=14 * S, fill=(244, 232, 210), outline=(226, 208, 176), width=3 * S)
    d.ellipse(px(610, 130, 780, 300), fill=(250, 220, 60), outline=(226, 190, 30), width=6 * S)
    for a in range(0, 360, 45):
        d.line(px(695, 215, 695 + math.cos(math.radians(a)) * 74, 215 + math.sin(math.radians(a)) * 74), fill=(255, 244, 170), width=4 * S)
    d.line(px(520, 60, 470, 420), fill=(214, 60, 60), width=14 * S)
    return save(im, "menu", "iced-tea")


def pizza(kind):
    im, d = canvas()
    cx, cy, r = 500, 380, 310
    shadow(d, cx, cy + 300, 300, 20)
    d.ellipse(px(cx - r - 20, cy - r - 20, cx + r + 20, cy + r + 20), fill=(212, 160, 96))
    d.ellipse(px(cx - r, cy - r, cx + r, cy + r), fill=RED_D)
    d.ellipse(px(cx - r + 24, cy - r + 24, cx + r - 24, cy + r - 24), fill=(246, 214, 120))
    rng = random.Random(11 + len(kind))

    def spot(rad_max):
        while True:
            x, y = rng.uniform(-1, 1), rng.uniform(-1, 1)
            if x * x + y * y < 0.86:
                return cx + x * rad_max, cy + y * rad_max

    for _ in range(14 if kind == "margherita" else 6):
        x, y = spot(r - 60)
        d.ellipse(px(x - 40, y - 40, x + 40, y + 40), fill=(252, 250, 244) if kind == "margherita" else (250, 226, 150))
    if kind == "margherita":
        for _ in range(9):
            x, y = spot(r - 70)
            d.ellipse(px(x - 30, y - 18, x + 30, y + 18), fill=GREEN_D)
    elif kind == "pepperoni":
        for _ in range(16):
            x, y = spot(r - 60)
            d.ellipse(px(x - 38, y - 38, x + 38, y + 38), fill=(184, 52, 44), outline=(140, 34, 30), width=3 * S)
    else:
        for _ in range(9):
            x, y = spot(r - 60)
            d.ellipse(px(x - 34, y - 34, x + 34, y + 34), outline=GREEN, width=9 * S)
        for _ in range(10):
            x, y = spot(r - 60)
            d.ellipse(px(x - 18, y - 18, x + 18, y + 18), fill=(40, 34, 36))
        for _ in range(7):
            x, y = spot(r - 60)
            d.ellipse(px(x - 26, y - 26, x + 26, y + 26), fill=(226, 72, 56))
    for a in range(0, 180, 45):
        d.line(px(cx - math.cos(math.radians(a)) * r, cy - math.sin(math.radians(a)) * r, cx + math.cos(math.radians(a)) * r, cy + math.sin(math.radians(a)) * r), fill=(212, 160, 96), width=4 * S)
    return save(im, "menu", {"margherita": "margherita-pizza", "pepperoni": "pepperoni-pizza", "veggie": "veggie-pizza"}[kind])


def burger(cheese):
    im, d = canvas()
    shadow(d, 500, 640, 290, 26)
    d.rounded_rectangle(px(220, 560, 780, 640), radius=40 * S, fill=BREAD_D)
    d.rounded_rectangle(px(226, 560, 774, 628), radius=36 * S, fill=BREAD)
    d.rounded_rectangle(px(210, 478, 790, 566), radius=44 * S, fill=(110, 62, 40), outline=(80, 44, 28), width=4 * S)
    if cheese:
        d.polygon(pts([(220, 470), (780, 470), (740, 540), (690, 490), (640, 556), (580, 490), (520, 540), (460, 488), (400, 552), (340, 490), (290, 540)]), fill=CHEESE)
    lettuce_y = 440
    d.polygon(pts([(x, lettuce_y + (18 if i % 2 else -6)) for i, x in enumerate(range(200, 810, 30))] + [(800, 500), (200, 500)]), fill=GREEN)
    for cx in (320, 500, 680):
        d.rounded_rectangle(px(cx - 70, 424, cx + 70, 462), radius=18 * S, fill=RED)
    d.pieslice(px(210, 190, 790, 520), 180, 360, fill=CRUST)
    d.pieslice(px(220, 200, 780, 520), 180, 360, fill=BREAD)
    rng = random.Random(8)
    for _ in range(26):
        x, y = rng.uniform(300, 700), rng.uniform(250, 330)
        d.ellipse(px(x - 9, y - 5, x + 9, y + 5), fill=(250, 236, 200))
    return save(im, "menu", "cheeseburger" if cheese else "classic-burger")


def bowl_salad():
    im, d = canvas()
    cx, cy = 500, 380
    shadow(d, cx, cy + 300, 300, 22)
    d.ellipse(px(cx - 330, cy - 300, cx + 330, cy + 300), fill=(230, 232, 226), outline=(205, 208, 198), width=5 * S)
    d.ellipse(px(cx - 300, cy - 270, cx + 300, cy + 270), fill=WHITE)
    rng = random.Random(5)
    for _ in range(70):
        a, rr = rng.uniform(0, 6.28), rng.uniform(0, 230)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        w = rng.uniform(40, 70)
        d.ellipse(px(x - w, y - w * .6, x + w, y + w * .6), fill=rng.choice([GREEN, GREEN_D, (136, 186, 92)]))
    for _ in range(9):
        a, rr = rng.uniform(0, 6.28), rng.uniform(40, 220)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        d.ellipse(px(x - 32, y - 32, x + 32, y + 32), fill=RED, outline=RED_D, width=3 * S)
    for _ in range(8):
        a, rr = rng.uniform(0, 6.28), rng.uniform(40, 220)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        d.ellipse(px(x - 28, y - 28, x + 28, y + 28), fill=(196, 226, 150), outline=GREEN_D, width=4 * S)
    for _ in range(8):
        a, rr = rng.uniform(0, 6.28), rng.uniform(40, 220)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        d.ellipse(px(x - 14, y - 14, x + 14, y + 14), fill=(40, 34, 36))
    return save(im, "menu", "garden-salad")


def pasta():
    im, d = canvas()
    cx, cy = 500, 380
    shadow(d, cx, cy + 300, 300, 22)
    d.ellipse(px(cx - 330, cy - 300, cx + 330, cy + 300), fill=(236, 236, 230), outline=(208, 208, 198), width=5 * S)
    d.ellipse(px(cx - 270, cy - 240, cx + 270, cy + 240), fill=(244, 228, 190))
    rng = random.Random(2)
    for _ in range(46):
        a, rr = rng.uniform(0, 6.28), rng.uniform(0, 190)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        ang = rng.uniform(0, 3.14)
        dx, dy = math.cos(ang) * 60, math.sin(ang) * 60
        d.line(px(x - dx, y - dy, x + dx, y + dy), fill=(232, 196, 110), width=26 * S)
        d.line(px(x - dx, y - dy, x + dx, y + dy), fill=(246, 222, 150), width=10 * S)
    for _ in range(26):
        a, rr = rng.uniform(0, 6.28), rng.uniform(0, 200)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        d.ellipse(px(x - 18, y - 12, x + 18, y + 12), fill=GREEN_D)
    for _ in range(5):
        a, rr = rng.uniform(0, 6.28), rng.uniform(40, 180)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        d.ellipse(px(x - 24, y - 24, x + 24, y + 24), fill=RED)
    return save(im, "menu", "creamy-pasta")


def cake():
    im, d = canvas()
    shadow(d, 500, 650, 330, 26)
    d.ellipse(px(130, 540, 870, 690), fill=(240, 238, 232), outline=(214, 210, 200), width=4 * S)
    d.polygon(pts([(260, 330), (700, 330), (780, 470), (340, 470)]), fill=(90, 52, 34))
    d.polygon(pts([(340, 470), (780, 470), (780, 590), (340, 590)]), fill=(112, 68, 44))
    d.rectangle(px(340, 500, 780, 524), fill=(244, 226, 196))
    d.rectangle(px(340, 545, 780, 566), fill=(244, 226, 196))
    d.polygon(pts([(260, 330), (340, 470), (340, 590), (260, 450)]), fill=(70, 40, 26))
    d.polygon(pts([(260, 330), (700, 330), (780, 470), (340, 470)]), fill=(66, 38, 26))
    for x in (330, 420, 520, 620):
        d.ellipse(px(x - 26, 340, x + 26, 400), fill=(66, 38, 26))
    d.ellipse(px(480, 262, 560, 342), fill=RED, outline=RED_D, width=4 * S)
    d.line(px(520, 268, 550, 214), fill=GREEN_D, width=6 * S)
    return save(im, "menu", "chocolate-cake")


# ---------------------------------------------------------------- sandwiches and sides
def lettuce(d, x0, x1, y, amp=16, thick=34):
    points = [(x0 + (x1 - x0) * i / 40, y + math.sin(i * 1.4) * amp) for i in range(41)]
    d.polygon(pts(points + [(x, yy + thick) for x, yy in reversed(points)]), fill=GREEN)
    d.line(pts(points), fill=GREEN_D, width=4 * S)


def baguette():
    im, d = canvas()
    shadow(d, 500, 620, 400, 34)
    x0, x1, y = 100, 900, 500
    d.rounded_rectangle(px(x0, y, x1, 610), radius=55 * S, fill=BREAD_D)
    d.rounded_rectangle(px(x0 + 6, y, x1 - 6, 598), radius=50 * S, fill=BREAD)
    lettuce(d, x0 + 20, x1 - 20, y - 30)
    y -= 38
    for i in range(7):
        cx = x0 + 90 + i * 100
        d.ellipse(px(cx - 42, y - 44, cx + 42, y - 4), fill=RED)
        d.ellipse(px(cx - 28, y - 38, cx + 28, y - 12), fill=(232, 98, 82))
    y -= 38
    for i in range(9):
        cx = x0 + 60 + i * 85
        d.rounded_rectangle(px(cx - 55, y - 62, cx + 55, y - 18), radius=20 * S, fill=HAM, outline=HAM_D, width=3 * S)
    y -= 38
    d.polygon(pts([(x0 + 30, y - 30)] + [p for i in range(10) for p in ((x0 + 30 + i * 82, y - 30), (x0 + 70 + i * 82, y + 12))] + [(x1 - 30, y - 30)]), fill=CHEESE)
    d.rectangle(px(x0 + 30, y - 50, x1 - 30, y - 28), fill=CHEESE)
    y -= 38
    t = y - 100
    d.rounded_rectangle(px(x0, t, x1, t + 120), radius=60 * S, fill=CRUST)
    d.rounded_rectangle(px(x0 + 8, t, x1 - 8, t + 106), radius=56 * S, fill=BREAD)
    d.arc(px(x0 + 70, t + 14, x1 - 70, t + 130), 200, 340, fill=(246, 214, 150), width=10 * S)
    return save(im, "menu", "ham-cheese-baguette")


def hotdog():
    im, d = canvas()
    shadow(d, 500, 520, 390, 30)
    d.rounded_rectangle(px(110, 400, 890, 520), radius=60 * S, fill=BREAD_D)
    d.rounded_rectangle(px(150, 250, 850, 360), radius=55 * S, fill=BREAD_D)
    d.rounded_rectangle(px(90, 300, 910, 430), radius=62 * S, fill=SAUSAGE, outline=SAUSAGE_D, width=4 * S)
    d.line(pts([(180 + i * 33, 345 + (16 if i % 2 else -16)) for i in range(21)]), fill=RED, width=11 * S)
    d.line(pts([(190 + i * 33, 372 + (14 if i % 2 else -14)) for i in range(20)]), fill=(236, 190, 40), width=9 * S)
    return save(im, "menu", "hot-dog")


def fries():
    im, d = canvas()
    shadow(d, 500, 600, 330, 30)
    rng = random.Random(4)
    for i in range(46):
        x = 230 + i * 12 + rng.randint(-8, 8)
        top = 170 + rng.randint(0, 120)
        x2 = x + math.tan(rng.uniform(-0.25, 0.25)) * 300
        d.polygon(px(x - 14, top, x + 14, top, x2 + 14, 470, x2 - 14, 470), fill=(244, 196, 64), outline=(222, 160, 36))
    d.rounded_rectangle(px(230, 440, 770, 620), radius=24 * S, fill=(222, 70, 60))
    d.rectangle(px(230, 470, 770, 520), fill=(250, 250, 244))
    return save(im, "menu", "french-fries")


def garlic_bread():
    im, d = canvas()
    shadow(d, 500, 590, 360, 34)
    d.ellipse(px(150, 200, 850, 580), fill=BREAD_D)
    d.ellipse(px(170, 200, 830, 560), fill=BREAD)
    d.ellipse(px(210, 238, 790, 522), fill=(244, 214, 150))
    rng = random.Random(9)
    for _ in range(90):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(0, 270)
        x, y = 500 + math.cos(a) * r, 380 + math.sin(a) * r * 0.48
        d.ellipse(px(x - 5, y - 4, x + 5, y + 4), fill=GREEN_D if rng.random() < .7 else (252, 246, 220))
    for k in range(4):
        a = k * math.pi / 4
        d.line(px(500 - math.cos(a) * 330, 380 - math.sin(a) * 160, 500 + math.cos(a) * 330, 380 + math.sin(a) * 160), fill=CRUST, width=4 * S)
    return save(im, "menu", "garlic-bread")


def bottle():
    im, d = canvas()
    cx, top, bottom, wb = 500, 70, 690, 150
    shadow(d, cx, bottom + 6, 150, 20)
    d.rounded_rectangle(px(cx - 28, top + 40, cx + 28, top + 150), radius=18 * S, fill=(236, 240, 238))
    d.rounded_rectangle(px(cx - 26, top, cx + 26, top + 56), radius=10 * S, fill=(30, 70, 160))
    d.rounded_rectangle(px(cx - wb, top + 130, cx + wb, bottom), radius=70 * S, fill=(236, 240, 238))
    d.rounded_rectangle(px(cx - wb + 10, top + 200, cx + wb - 10, bottom - 8), radius=60 * S, fill=(54, 36, 30))
    mid = (top + 130 + bottom) / 2
    d.rectangle(px(cx - wb + 10, mid - 60, cx + wb - 10, mid + 70), fill=(30, 70, 160))
    d.rectangle(px(cx - wb + 10, mid - 8, cx + wb - 10, mid + 22), fill=(220, 40, 50))
    d.ellipse(px(cx - 46, mid - 52, cx + 46, mid + 40), fill=WHITE)
    d.ellipse(px(cx - 30, mid - 36, cx + 30, mid + 24), fill=(220, 40, 50))
    d.rounded_rectangle(px(cx - wb + 28, top + 210, cx - wb + 48, bottom - 50), radius=10 * S, fill=(104, 86, 80))
    return save(im, "menu", "cola-bottle")


# ---------------------------------------------------------------- brand
def brand():
    out = os.path.join(ROOT, "images", "brand")
    size = 1024
    im = Image.new("RGB", (size, size), (95, 107, 58))
    d = ImageDraw.Draw(im)
    d.ellipse((130, 130, 894, 894), fill=(247, 241, 230))
    d.rounded_rectangle((320, 400, 640, 690), radius=70, fill=(95, 107, 58))
    d.ellipse((600, 450, 780, 620), outline=(95, 107, 58), width=44)
    d.rectangle((300, 380, 660, 440), fill=(247, 241, 230))
    d.rounded_rectangle((330, 412, 630, 440), radius=14, fill=(95, 107, 58))
    for x in (400, 480, 560):  # steam
        d.arc((x - 30, 230, x + 30, 340), 270, 90, fill=(95, 107, 58), width=22)
    d.rounded_rectangle((290, 700, 700, 740), radius=20, fill=(95, 107, 58))
    for px_size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (256, "logo.png")):
        im.resize((px_size, px_size), Image.LANCZOS).save(os.path.join(out, name), optimize=True)
    im.resize((48, 48), Image.LANCZOS).save(os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    og = Image.new("RGB", (1200, 630), (95, 107, 58))
    og.paste(im.resize((520, 520), Image.LANCZOS), (340, 55))
    og.save(os.path.join(out, "og-image.jpg"), quality=88)


# ---------------------------------------------------------------- gallery
def gallery():
    names = ["margherita-pizza", "classic-burger", "latte", "garden-salad", "chocolate-cake", "creamy-pasta", "pepperoni-pizza", "french-fries"]
    for index, name in enumerate(names, start=1):
        src = Image.open(os.path.join(ROOT, "images", "menu", name + ".jpg")).convert("RGB")
        full = src.resize((1200, 900), Image.LANCZOS)
        full.save(os.path.join(ROOT, "images", "gallery", f"photo-{index}.jpg"), quality=84, optimize=True, progressive=True)
        src.resize((480, 360), Image.LANCZOS).save(os.path.join(ROOT, "images", "gallery", f"photo-{index}-thumb.jpg"), quality=80, optimize=True, progressive=True)
    return len(names)


if __name__ == "__main__":
    for job in (lambda: coffee("espresso"), lambda: coffee("cappuccino"), lambda: coffee("latte"), iced_tea,
                lambda: pizza("margherita"), lambda: pizza("pepperoni"), lambda: pizza("veggie"),
                lambda: burger(False), lambda: burger(True), bowl_salad, pasta, cake,
                baguette, hotdog, fries, garlic_bread, bottle):
        job()
    brand()
    print("gallery images:", gallery())
