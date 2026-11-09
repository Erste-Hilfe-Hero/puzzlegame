# Remove small detached specks from transparent item PNGs, then re-center: despeckle.py files...
import sys
from PIL import Image
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGBA'); px = im.load(); w, h = im.size
    lab = {}; comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 40 or (x, y) in lab: continue
            st = [(x, y)]; lab[(x, y)] = len(comps); cur = []
            while st:
                p = st.pop(); cur.append(p)
                for q in ((p[0]+1, p[1]), (p[0]-1, p[1]), (p[0], p[1]+1), (p[0], p[1]-1)):
                    if 0 <= q[0] < w and 0 <= q[1] < h and q not in lab and px[q][3] >= 40:
                        lab[q] = len(comps); st.append(q)
            comps.append(cur)
    if len(comps) < 2: continue
    big = max(len(c) for c in comps)
    for c in comps:
        if len(c) < big * 0.03:
            for p in c: px[p] = (0, 0, 0, 0)
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and px[x, y][3] < 40:
                if not any((xx, yy) in lab and px[xx, yy][3] for xx, yy in ((x+1, y), (x-1, y), (x, y+1), (x, y-1))): px[x, y] = (0, 0, 0, 0)
    bb = im.getbbox(); t = im.crop(bb); s = max(t.size)
    c = Image.new('RGBA', (s, s)); c.paste(t, ((s - t.size[0]) // 2, (s - t.size[1]) // 2))
    c.resize((w, h), Image.LANCZOS).save(f)
