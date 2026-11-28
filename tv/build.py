#!/usr/bin/env python3
# Builds an unsigned Samsung TV (Tizen) web app folder + .wgt from a game's web folder.
# Usage: python3 tv/build.py rollhaven   -> tv/dist/rollhaven/ and tv/dist/rollhaven-unsigned.wgt
import json, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
game = sys.argv[1]
cfg = json.load(open(os.path.join(ROOT, 'tv/apps', game + '.json')))
out = os.path.join(ROOT, 'tv/dist', game)
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(os.path.join(ROOT, cfg['src']), out)
shutil.copy(os.path.join(ROOT, 'tv/tv-nav.js'), out)
shutil.copy(os.path.join(ROOT, 'tv/tv.css'), out)

for name in os.listdir(out):
    if not name.endswith('.js') or name == 'tv-nav.js':
        continue
    p = os.path.join(out, name)
    s = open(p, encoding='utf-8').read()
    for a, b in cfg.get('replace', []):
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

idx = os.path.join(out, 'index.html')
h = open(idx, encoding='utf-8').read()
hide = ''.join('%s{display:none!important}' % sel for sel in cfg.get('hide', []))
head = '<link rel="stylesheet" href="tv.css"><style>:root{--tv-zoom:%s}%s</style>' % (cfg.get('zoom', 1.3), hide)
hint = cfg.get('hint') or {}
pre = '<script>window.TV=1;window.TV_DEFAULT=%s;var _h=%s;window.TV_HINT=_h[(navigator.language||"en").slice(0,2)]||_h.en;</script>' % (json.dumps(cfg.get('default')), json.dumps(hint, ensure_ascii=False))
h = h.replace('</head>', head + '</head>', 1)
h = h.replace('<script', pre + '<script src="tv-nav.js"></script><script', 1)
open(idx, 'w', encoding='utf-8').write(h)

src = Image.open(os.path.join(ROOT, cfg['icon'])).convert('RGBA')
bg = cfg.get('bg', '#000000')
icon = Image.new('RGBA', (512, 423), bg)
s = src.resize((380, 380), Image.LANCZOS)
icon.paste(s, ((512 - 380) // 2, (423 - 380) // 2), s)
icon.save(os.path.join(out, 'icon.png'))

pkg = cfg['package']
assert len(pkg) == 10 and pkg.isalnum(), 'package id must be 10 letters/digits'
xml = '''<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="http://nyrathen.com/tv/{game}" version="{ver}" viewmodes="maximized">
  <tizen:application id="{pkg}.{app}" package="{pkg}" required_version="{req}"/>
  <content src="index.html"/>
  <feature name="http://tizen.org/feature/screen.size.normal.1080.1920"/>
  <icon src="icon.png"/>
  <name>{name}</name>
  <author href="https://nyrathen.com" email="lords.azz6@gmail.com">German Dream Games</author>
  <tizen:profile name="tv-samsung"/>
  <tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
  <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" install-location="auto" hwkey-event="enable"/>
</widget>
'''.format(game=game, ver=cfg['version'], pkg=pkg, app=cfg['name'].replace(' ', ''), req=cfg.get('required_version', '5.5'), name=cfg['name'])
open(os.path.join(out, 'config.xml'), 'w', encoding='utf-8').write(xml)

wgt = os.path.join(ROOT, 'tv/dist', game + '-unsigned.wgt')
if os.path.exists(wgt):
    os.remove(wgt)
subprocess.check_call(['zip', '-qr', wgt, '.'], cwd=out)
print(out)
print(wgt)
