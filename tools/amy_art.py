# Builds Amy game images, app icons and the Play feature graphic from assets/raw/amy_face.png + amy_full.png.
from PIL import Image, ImageDraw, ImageFont
def cut(src, dst, scale=1):
    im = Image.open(src).convert('RGBA')
    if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    w, h = im.size; px = im.load(); seen = set()
    st = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h): continue
        r, g, b, a = px[x, y]
        if r < 235 or g < 235 or b < 235: continue
        seen.add((x, y)); px[x, y] = (255, 255, 255, 0); st += [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
    im = im.crop(im.getbbox()); im.save(dst); return im
face = cut('assets/raw/amy_face.png', 'web/img/amy_face.png')
full = cut('assets/raw/amy_full.png', 'web/img/amy_full.png', 2)
S = 1024; bg = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(bg)
for y in range(S):
    t = y / S; d.line([(0, y), (S, y)], fill=(int(255-30*t), int(196-60*t), int(110+40*t), 255))
d.ellipse((-200, 700, 1224, 1400), fill=(246, 215, 150, 255))
f = face.resize((int(face.width*4.6), int(face.height*4.6)), Image.LANCZOS)
bg.alpha_composite(f, (max((S-f.width)//2, 0), max(S-f.height+10, 0)))
for k, (ix, iy, sz) in {'bakery_2': (40, 60, 230), 'fruit_3': (760, 80, 220)}.items():
    bg.alpha_composite(Image.open(f'web/img/{k}.png').convert('RGBA').resize((sz, sz), Image.LANCZOS), (ix, iy))
ic = bg.convert('RGB')
ic.save('ios/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png'); ic.resize((512, 512), Image.LANCZOS).save('store/icon_512.png')
for dd, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    ic.resize((s, s), Image.LANCZOS).save(f'android/app/src/main/res/mipmap-{dd}/ic_launcher.png')
W, H = 1024, 500; im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
for y in range(H):
    t = y / H; d.line([(0, y), (W, y)], fill=(int(255-60*t), int(190-40*t), int(120+90*t), 255))
d.ellipse((560, 360, 1200, 720), fill=(246, 215, 150, 255))
for k, (x, y, s) in {'bakery_7': (560, 250, 150), 'fruit_7': (880, 280, 150), 'fruit_5': (900, 60, 120)}.items():
    im.alpha_composite(Image.open(f'web/img/{k}.png').convert('RGBA').resize((s, s), Image.LANCZOS), (x, y))
a = full.resize((int(full.width*470/full.height), 470), Image.LANCZOS); im.alpha_composite(a, (735-a.width//2, H-a.height-5))
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 74); G = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 38)
def txt(xy, s, font):
    for dx in (-4, 4, 0):
        for dy in (-4, 4, 0): d.text((xy[0]+dx, xy[1]+dy), s, font=font, fill=(120, 50, 20))
    d.text(xy, s, font=font, fill=(255, 255, 255))
txt((40, 110), "Amy's", F); txt((40, 200), "Tasty Island", F); txt((44, 320), "Merge, cook & restore!", G)
im.convert('RGB').save('store/feature_graphic.png')
print('ok')
