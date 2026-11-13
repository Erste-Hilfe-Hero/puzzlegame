// App Store screenshots 1290x2796 (6.7"/6.9"): node tools/store-shots.cjs <outdir> [locale]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(process.argv[2] || 'qa/store'), LOC = process.argv[3] || 'en-US', P = LOC.slice(0, 2);
const PORT = 8898, ROOT = path.resolve(__dirname, '..'), url = 'http://127.0.0.1:' + PORT + '/mossbrook/';
fs.mkdirSync(OUT, { recursive: true });
const ctxOpt = { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: LOC };
async function player(b, lvl) {
  const p = await (await b.newContext(ctxOpt)).newPage();
  await p.goto(url); await p.waitForTimeout(500);
  await p.click('#mOk').catch(() => {});
  await p.evaluate(l => { const S = __mb.S(); S.level = l; S.coins = 4250; S.stars = 9; S.done = S.done || {}; __mb.save(); }, lvl);
  await p.reload(); await p.waitForTimeout(500);
  return p;
}
const play = async (p, n) => { for (let i = 0; i < n; i++) await p.evaluate(() => { const G = __mb.G(); if (!G || G.over) return; const pl = __mb.playable(); if (pl.length) { pl.sort((a, b) => b.row - a.row); __mb.tapCard(pl[0]); } else if (G.stock.length) __mb.drawCard(false); }), await p.waitForTimeout(260); };
(async () => {
  const srv = spawn('node', [path.join(ROOT, 'server/main.mjs')], { env: { ...process.env, PORT, DATA_DIR: fs.mkdtempSync('/tmp/mbshots-'), WEB_DIR: path.join(ROOT, 'web') }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch();
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, P + '-' + n + '.png') });
  const A = await player(b, 7);
  await A.click('#btnPlay'); await A.waitForTimeout(900); await play(A, 6); await A.waitForTimeout(400);
  await shot(A, '1-board');
  await play(A, 60); await A.waitForTimeout(2500);
  await shot(A, '2-result');
  const V = await player(b, 14); await shot(V, '3-village');
  const D1 = await player(b, 5), D2 = await player(b, 5);
  await D1.click('#btnDuel'); await D1.waitForTimeout(300); await D1.click('[data-stake="500"]');
  await D2.click('#btnDuel'); await D2.waitForTimeout(300); await D2.click('[data-stake="500"]');
  await D1.waitForTimeout(5500);
  await Promise.all([play(D1, 9), play(D2, 5)]); await D1.waitForTimeout(1200);
  await shot(D1, '4-duel');
  const S = await player(b, 3); await S.click('#btnShopTop'); await S.waitForTimeout(500); await shot(S, '5-shop');
  await b.close(); srv.kill();
  console.log(fs.readdirSync(OUT).join(' '));
})().catch(e => { console.error(e); process.exit(1); });
