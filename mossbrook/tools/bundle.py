import base64, re, pathlib, sys
w = pathlib.Path(__file__).resolve().parent.parent / 'web'
css = (w / 'style.css').read_text()
css = re.sub(r"url\((fonts/[^)]+)\)", lambda m: "url(data:font/woff2;base64," + base64.b64encode((w / m.group(1)).read_bytes()).decode() + ")", css)
html = (w / 'index.html').read_text()
body = html[html.index('<div id="app">'):html.index('<script src="game.js">')]
js = (w / 'game.js').read_text() + '\n' + (w / 'duel.js').read_text()
out = ('<title>Mossbrook Solitaire</title>\n<style>' + css +
       '\nhtml{color-scheme:dark}</style>\n' + body + '<script>' + js + '</script>\n')
pathlib.Path(sys.argv[1]).write_text(out)
print(len(out))
