// Smoke test: content checks, every category, generator limit, favorites, paywall, share card, language switch.
// Usage: node kaese/tools/test.mjs [webdir] [screenshotdir]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2] || 'kaese/web'), shots = process.argv[3];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: shots ? 3 : 1, locale: 'de-DE' });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(300);
const shot = n => shots && pg.screenshot({ path: `${shots}/${n}.png` });
const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
for (const lang of ['de', 'en']) {
  const L = await pg.evaluate(l => window.KL_LINES[l].map(c => [c.id, c.lines.length, c.pro]), lang);
  const total = L.reduce((a, c) => a + c[1], 0);
  console.log(lang, 'categories', L.length, 'lines', total);
  if (L.length !== 11 || total < 150) fail('content ' + lang);
  const all = await pg.evaluate(l => window.KL_LINES[l].flatMap(c => c.lines), lang);
  if (new Set(all).size !== all.length) fail('duplicate lines ' + lang);
}
if ((await pg.evaluate(() => window.kl.state().lang)) !== 'de') fail('default lang');
await shot('01-home');
await pg.click('.cat[data-cat="0"]'); await pg.waitForSelector('#card');
await shot('02-deck');
await pg.click('[data-step="1"]'); const n = await pg.textContent('.num'); if (!n.startsWith('2 /')) fail('step ' + n);
await pg.click('[data-fav="1"]'); await pg.click('[data-close="1"]');
await pg.click('.cat[data-cat="4"]'); if (await pg.isHidden('#sheet')) fail('paywall not shown');
await shot('05-paywall');
await pg.click('[data-sheetclose="1"]');
await pg.evaluate(() => window.kl.setPro(true));
for (let i = 0; i < 11; i++) { await pg.evaluate(i => window.kl.open(i), i); if (!(await pg.$('#card'))) fail('cat ' + i); await pg.click('[data-close="1"]'); }
await pg.evaluate(() => window.kl.setPro(false));
await pg.click('[data-tab="gen"]');
for (let i = 0; i < 5; i++) await pg.click('[data-gen="1"]');
await shot('03-generator');
const out = await pg.textContent('.genout p'); if (/[{}]/.test(out)) fail('template slot left: ' + out);
await pg.click('[data-gen="1"]'); if (await pg.isHidden('#sheet')) fail('gen limit paywall');
await pg.click('[data-sheetclose="1"]');
const bad = await pg.evaluate(() => { const r = []; for (const l of ['de', 'en']) for (const k in window.KL_GEN[l].t) window.KL_GEN[l].t[k].forEach(s => { if (/\{(?!thing\}|because\}|plan\}|place\})/.test(s)) r.push(s); }); return r; });
if (bad.length) fail('bad template ' + bad);
await pg.click('[data-tab="favs"]'); if ((await pg.$$('.fav')).length !== 1) fail('favs');
await shot('04-favs');
const png = await pg.evaluate(() => window.kl.renderCard('Bist du WLAN? Ich spüre nämlich eine Verbindung.'));
if (!png.startsWith('data:image/png') || png.length < 20000) fail('card image');
if (shots) fs.writeFileSync(`${shots}/06-card.png`, Buffer.from(png.split(',')[1], 'base64'));
await pg.click('[data-tab="more"]'); await pg.click('[data-lang="1"]'); await pg.click('[data-tab="discover"]');
if (!(await pg.textContent('.hero small')).includes('Line of the day')) fail('lang switch');
await shot('07-home-en');
if (errs.length) fail('errors ' + errs.join(' | '));
console.log(process.exitCode ? 'FAILED' : 'OK');
await b.close();
