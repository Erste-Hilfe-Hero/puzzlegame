# Prints "content <name> ..." or "BLANK <name> ..." for a screenshot: blank = one colour covers >= 97 % of the pixels.
import sys
from PIL import Image
p = sys.argv[1]
im = Image.open(p).convert("RGB")
im.thumbnail((200, 200))
px = list(im.getdata())
q = [(r >> 4, g >> 4, b >> 4) for r, g, b in px]
top = max(q.count(c) for c in set(q)) / len(q)
print(("BLANK" if top >= 0.97 else "content"), p.split("/")[-1], "colours=%d top=%.1f%%" % (len(set(q)), top * 100))
