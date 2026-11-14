# Bundle epochfall/web into one self-contained HTML page (for the playable artifact).
# Usage: python3 epochfall/tools/bundle.py epochfall/web out.html
import re, sys, pathlib
web = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
html = (web / 'index.html').read_text()
css = (web / 'style.css').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
for js in ('i18n.js', 'game.js', 'shop.js'):
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + (web / js).read_text() + '\n</script>')
html = re.sub(r'<!doctype html>\s*', '', html, flags=re.I)
html = re.sub(r'</?html[^>]*>|</?head>|</?body>|<meta charset[^>]*>|<meta name="viewport"[^>]*>', '', html)
out.write_text(html.strip() + '\n')
print(out, len(html))
