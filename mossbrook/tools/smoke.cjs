// Browser smoke: welcome, play levels by bot, win, restore a task. Screenshots to qa/.
const { chromium, devices } = require('playwright');
const path = require('path');
const LOC = process.env.LOC || 'en-US';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: LOC });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(500);
  const out = n => p.screenshot({ path: path.resolve(__dirname, '../qa/' + LOC + '-' + n + '.png') });
  await out('01-welcome');
  await p.click('#mOk');
  await out('02-village');
  let wins = 0;
  for (let lv = 0; lv < 3; lv++) {
    await p.click('#btnPlay');
    await p.waitForTimeout(700);
    if (lv === 0) await out('03-level1-start');
    for (let step = 0; step < 200; step++) {
      const st = await p.evaluate(() => {
        const G = __mb.G(); if (!G || G.over) return 'over';
        const pl = __mb.playable();
        if (pl.length) { pl.sort((a, b) => b.row - a.row); __mb.tapCard(pl[0]); return 'play'; }
        if (G.stock.length) { __mb.drawCard(false); return 'draw'; }
        return 'stuck';
      });
      await p.waitForTimeout(60);
      if (lv === 0 && step === 8) { await p.waitForTimeout(400); await out('04-level1-mid'); }
      if (st === 'over' || st === 'stuck') break;
    }
    await p.waitForTimeout(900);
    await out('05-end-' + (lv + 1));
    if (await p.$('#mNext')) { wins++; await p.click('#mVil'); }
    else { const g = await p.$('#mGive'); if (g) { await g.click(); await p.waitForTimeout(300); } await p.click('#mVil'); }
    await p.waitForTimeout(400);
  }
  const btns = await p.$$('#tasks .task button:not([disabled])');
  if (btns.length) { await btns[0].click(); await p.waitForTimeout(900); }
  await out('06-village-built');
  await p.click('#btnShopTop'); await p.waitForTimeout(300); await out('07-shop');
  const st = await p.evaluate(() => { const s = __mb.S(); return { level: s.level, coins: s.coins, stars: s.stars, done: s.done, lives: s.lives }; });
  console.log(JSON.stringify({ wins, st, errs }));
  await b.close();
})();
