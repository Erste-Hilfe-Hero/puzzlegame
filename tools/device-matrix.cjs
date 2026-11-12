// I31: screenshots of every screen on four phone sizes (emulated viewports, not real devices) and a check that a
// 9-row board ("Bigger Board") is not cut off. Screenshots: production/qa/evidence/devices/<device>-<screen>.png
// Run: node tools/device-matrix.cjs [de|en]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'production/qa/evidence/devices');
const LANG = process.argv[2] || 'de';
const DEVICES = [
  { name: 'android-small-5in', width: 360, height: 640, dpr: 3, mobile: true },
  { name: 'android-large', width: 412, height: 915, dpr: 2.625, mobile: true },
  { name: 'iphone-se', width: 375, height: 667, dpr: 2, mobile: true },
  { name: 'iphone-pro-max', width: 430, height: 932, dpr: 3, mobile: true }
];
const SCREENS = ['openIsland', 'openPlace', 'openDaily', 'openShop', 'openStore', 'openAlbum', 'openSettings'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  for (const d of DEVICES) {
    const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.dpr, isMobile: d.mobile, hasTouch: true, locale: LANG });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push(`${d.name} pageerror: ${e.message}`));
    await page.goto('file://' + path.join(ROOT, 'web/index.html'));
    await page.waitForTimeout(500);
    const shot = n => page.screenshot({ path: `${OUT}/${d.name}-${n}.png` });
    await shot('0-welcome');
    await page.click('#btn-go');
    await page.waitForTimeout(300);
    await page.evaluate(() => { S.tut = 5; S.level = Math.max(S.level, 8); S.coins += 5000; S.gems += 500; commit(); });
    await page.waitForTimeout(300);
    await shot('1-board');
    let k = 2;
    for (const fn of SCREENS) {
      await page.evaluate(f => window[f](), fn);
      await page.waitForTimeout(450);
      await shot(`${k++}-${fn.replace('open', '').toLowerCase()}`);
      const sheet = await page.evaluate(() => { const r = document.querySelector('#modal .sheet').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
      if (sheet.l < -1 || sheet.r > sheet.w + 1) problems.push(`${d.name} ${fn}: window wider than screen`);
      await page.evaluate(() => closeModal());
    }
    // Bigger Board: 9 rows must fit between the order bar and the bottom bar.
    await page.evaluate(() => { S.perm.bigBoard = true; while (S.rows < 9) { S.rows++; S.board.push(...new Array(DATA.cols).fill(null)); } commit(); });
    await page.waitForTimeout(400);
    await shot(`${k}-board-9rows`);
    const fit = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('#board .cell')].map(c => c.getBoundingClientRect());
      const nav = document.getElementById('nav').getBoundingClientRect(), ord = document.getElementById('orders').getBoundingClientRect();
      const last = cells[cells.length - 1], first = cells[0];
      return { n: cells.length, rows: S.rows, bottom: last.bottom, navTop: nav.top, top: first.top, ordBottom: ord.bottom, right: Math.max(...cells.map(c => c.right)), w: innerWidth, h: innerHeight, minH: Math.min(...cells.map(c => c.height)), scroll: document.documentElement.scrollHeight };
    });
    if (fit.rows !== 9) problems.push(`${d.name}: board has ${fit.rows} rows`);
    if (fit.bottom > fit.navTop + 1 || fit.bottom > fit.h) problems.push(`${d.name}: 9-row board cut off at the bottom (${fit.bottom} > ${fit.navTop})`);
    if (fit.top < fit.ordBottom - 1) problems.push(`${d.name}: 9-row board under the order bar`);
    if (fit.right > fit.w + 1) problems.push(`${d.name}: board wider than screen`);
    if (fit.minH < 28) problems.push(`${d.name}: cells only ${fit.minH.toFixed(0)} px high`);
    if (fit.scroll > fit.h + 1) problems.push(`${d.name}: page scrolls (${fit.scroll} > ${fit.h})`);
    console.log(`${d.name} ${d.width}x${d.height}: 9 rows, cell ${fit.minH.toFixed(0)} px, board bottom ${fit.bottom.toFixed(0)} / nav ${fit.navTop.toFixed(0)}`);
    await ctx.close();
  }
  await browser.close();
  if (problems.length) { console.log('DEVICES FAIL\n' + problems.join('\n')); process.exit(1); }
  console.log(`DEVICES OK (${DEVICES.length} devices, screenshots in ${path.relative(ROOT, OUT)})`);
})();
