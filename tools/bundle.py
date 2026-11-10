# Bundles web/ into one self-contained HTML (images as data URIs). Usage: python3 tools/bundle.py OUT.html
import sys, os, base64, json
w = os.path.join(os.path.dirname(__file__), '..', 'web')
r = lambda f: open(os.path.join(w, f), encoding='utf-8').read()
html, css = r('index.html'), r('style.css')
css = ":root { color-scheme: light; }\n" + css.replace("padding: env(safe-area-inset-top) 10px env(safe-area-inset-bottom);", "padding: 0 max(10px, env(safe-area-inset-left, 0px)) 0 max(10px, env(safe-area-inset-right, 0px));")
import re
css = re.sub(r"url\('?fonts/([^')]+)'?\)", lambda m: "url(data:font/woff2;base64," + base64.b64encode(open(os.path.join(w, 'fonts', m.group(1)), 'rb').read()).decode() + ")", css)
imgs = {f[:-4]: 'data:image/png;base64,' + base64.b64encode(open(os.path.join(w, 'img', f), 'rb').read()).decode() for f in sorted(os.listdir(os.path.join(w, 'img'))) if f.endswith('.png')}
js = f"<script>\nwindow.IMG = {json.dumps(imgs)};\n</script>\n" + ''.join(f"<script>\n{r(f)}\n</script>\n" for f in ['data.js', 'i18n.js', 'game.js'])
body = html[html.index('<div id="scene"'):html.index('<script src="data.js">')]
open(sys.argv[1], 'w', encoding='utf-8').write(f'<title>Amy\'s Tasty Island</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n{css}\n</style>\n{body}{js}')
