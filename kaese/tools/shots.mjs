// App Store screenshots 1290x2796 (iPhone 6.7"): caption on cheese background + live app in a phone frame.
// Usage: node kaese/tools/shots.mjs <outdir> [de|en]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2], lang = process.argv[3] || 'de';
fs.mkdirSync(out, { recursive: true });
const app = 'file://' + path.resolve('kaese/web/index.html');
const C = {
  de: [['Nie mehr sprachlos', 'Über 160 Anmachsprüche in 11 Kategorien'], ['Wischen, kopieren, abschicken', 'Ein Tipp und der Spruch ist im Chat'],
    ['Dein eigener Spruch-Generator', 'Für wen, wie und wo: fertig ist der Käse'], ['Als Bild teilen', 'Für Story, Status und Gruppenchat'], ['Lieblingssprüche merken', 'Alles offline, ohne Konto']],
  en: [['Never lost for words', '160+ pickup lines in 11 categories'], ['Swipe, copy, send', 'One tap and the line is in your chat'],
    ['Your own line generator', 'Pick who, how and where: done'], ['Share as an image', 'For stories, status and group chats'], ['Save your favorites', 'Fully offline, no account']]
}[lang];
const steps = [
  async f => {},
  async f => { await f.evaluate(() => window.kl.open(1, 3)); },
  async f => { await f.evaluate(() => { window.kl.tab('gen'); window.kl.generate(); }); },
  async f => f.evaluate(l => window.kl.renderCard(l === 'de' ? 'Du bist der Käse auf meiner Pizza.' : 'You are the cheese on my pizza.'), lang),
  async f => { await f.evaluate(() => { const s = window.kl.state(); s.fav = window.KL_LINES[s.lang][2].lines.slice(0, 4); window.kl.tab('favs'); }); }
];
const b = await chromium.launch();
const loc = lang === 'de' ? 'de-DE' : 'en-US';
const appPg = await (await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, locale: loc })).newPage();
await appPg.goto(app); await appPg.evaluate(l => localStorage.setItem('kl', JSON.stringify({ lang: l })), lang);
const pg = await (await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 })).newPage();
for (let i = 0; i < C.length; i++) {
  await appPg.reload(); await appPg.waitForTimeout(300);
  let img = await steps[i](appPg); const fit = img ? 'contain;background:#f5a623' : 'cover;background:#fff6dc';
  await appPg.waitForTimeout(300);
  if (!img) img = 'data:image/png;base64,' + (await appPg.screenshot()).toString('base64');
  await pg.setContent(`<html><body style="margin:0;width:430px;height:932px;overflow:hidden;background:linear-gradient(160deg,#ffd45c,#f5a623);font-family:ui-rounded,-apple-system,system-ui,sans-serif;color:#2b2118">
  <div style="padding:58px 28px 0;text-align:center"><div style="font-size:36px;font-weight:800;line-height:1.1;letter-spacing:-.5px">${C[i][0]}</div>
  <div style="font-size:18px;font-weight:600;margin-top:10px;opacity:.8">${C[i][1]}</div></div>
  <div style="position:absolute;left:38px;top:230px;width:354px;height:766px;border-radius:52px;background:#2b2118;padding:10px;box-sizing:border-box;box-shadow:0 20px 50px rgba(80,40,0,.35)">
  <img src="${img}" style="width:100%;height:100%;border-radius:43px;object-fit:${fit};object-position:center top;display:block"></div></body></html>`);
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: `${out}/${i + 1}.png` });
}
await b.close();
