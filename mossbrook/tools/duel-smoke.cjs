// Duel e2e: starts the server locally, two browser players join the same stake and race; a third plays a ghost.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const PORT = 8899, ROOT = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync('/tmp/mbdata-');
const url = 'http://127.0.0.1:' + PORT + '/mossbrook/';
const shot = (p, n) => p.screenshot({ path: path.join(ROOT, 'qa', 'duel-' + n + '.png') });

async function player(b, name) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
  const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(400);
  await p.click('#mOk');
  await p.evaluate(n => { __mb.S().mp.name = n; __mb.save(); }, name);
  return p;
}
async function bot(p, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const st = await p.evaluate(() => {
      const G = __mb.G(); if (!G || G.over) return 'over';
      const pl = __mb.playable(); if (pl.length) { pl.sort((a, b) => b.row - a.row); __mb.tapCard(pl[0]); return 'play'; }
      if (G.stock.length) { __mb.drawCard(false); return 'draw'; }
      return 'stuck';
    });
    if (st === 'over') { await p.waitForTimeout(700); const g = await p.$('#mGive'); if (g) await g.click(); return st; }
    if (st === 'stuck') { await p.waitForTimeout(700); const g = await p.$('#mGive'); if (g) await g.click(); return st; }
    await p.waitForTimeout(250);
  }
}
(async () => {
  const srv = spawn('node', [path.join(ROOT, 'server/main.mjs')], { env: { ...process.env, PORT, DATA_DIR: DATA, WEB_DIR: path.join(ROOT, 'web') }, stdio: 'inherit' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch();
  const A = await player(b, 'Alice'), B = await player(b, 'Bob');
  await A.click('#btnDuel'); await A.waitForTimeout(300); await shot(A, '01-menu');
  await A.click('[data-stake="100"]'); await A.waitForTimeout(600); await shot(A, '02-search');
  await B.click('#btnDuel'); await B.waitForTimeout(300); await B.click('[data-stake="100"]');
  await A.waitForTimeout(1500); await shot(A, '03-found');
  await A.waitForTimeout(3500);
  const inGame = await A.evaluate(() => !!(__mb.G() && __mb.G().duel));
  await Promise.all([bot(A, 60000), (async () => { await B.waitForTimeout(1500); return bot(B, 60000); })()]);
  await A.waitForTimeout(800); await shot(A, '04-mid-or-end');
  for (let i = 0; i < 20 && !(await A.$('#mAgain')); i++) await A.waitForTimeout(1000);
  await shot(A, '05-result-A'); await shot(B, '05-result-B');
  const ra = await A.evaluate(() => ({ coins: __mb.S().coins, tr: __mb.S().mp.trophies }));
  const rb = await B.evaluate(() => ({ coins: __mb.S().coins, tr: __mb.S().mp.trophies }));
  // ghost: lone player gets paired after the wait
  const C = await player(b, 'Cleo');
  await C.click('#btnDuel'); await C.waitForTimeout(300); await C.click('[data-stake="100"]');
  await C.waitForTimeout(12500);
  const ghost = await C.evaluate(() => { const d = __mb.duel(); return d && d.opp ? d.opp.name : null; });
  await C.waitForTimeout(2000); await shot(C, '06-ghost-game');
  await C.evaluate(() => { const d = __mb.duel(); if (d) d.end = Date.now() - 1; });
  for (let i = 0; i < 8 && !(await C.$('#mVil')); i++) await C.waitForTimeout(1000);
  await shot(C, '06b-ghost-result');
  await C.click('#mVil').catch(() => {});
  await C.waitForTimeout(400);
  await C.evaluate(() => document.getElementById('btnDuel').click()); await C.waitForTimeout(300);
  await C.click('#mBoard'); await C.waitForTimeout(800); await shot(C, '07-board');
  console.log(JSON.stringify({ inGame, A: ra, B: rb, ghost, errs: [...A.errs, ...B.errs, ...C.errs] }));
  await b.close(); srv.kill();
})().catch(e => { console.error(e); process.exit(1); });
