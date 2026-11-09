# Cut a 2x2 Canva sheet into 4 transparent item PNGs: slice_sheet.py sheet.png out_prefix start_index
import sys
from collections import deque
from PIL import Image

src, prefix, start = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGBA')
w, h = im.size
for q in range(4):
    x0, y0 = (q % 2) * w // 2, (q // 2) * h // 2
    t = im.crop((x0, y0, x0 + w // 2, y0 + h // 2))
    px = t.load(); tw, th = t.size
    seen = set(); dq = deque((x, y) for x in range(tw) for y in (0, th - 1))
    dq.extend((x, y) for y in range(th) for x in (0, tw - 1))
    while dq:
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < tw and 0 <= y < th): continue
        seen.add((x, y)); r, g, b, a = px[x, y]
        if min(r, g, b) < 225: continue
        px[x, y] = (r, g, b, 0)
        dq.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    bb = t.getbbox(); t = t.crop(bb); s = max(t.size)
    c = Image.new('RGBA', (s, s)); c.paste(t, ((s - t.size[0]) // 2, (s - t.size[1]) // 2))
    c.resize((92, 92), Image.LANCZOS).save(f'{prefix}_{start + q}.png')
