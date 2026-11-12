// Playwright smoke: plays the tutorial to the first island task at 360x640, fails on page errors or error toasts.
// Run: node tools/smoke-core.cjs
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'production/qa/evidence');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(ROOT, 'web/index.html'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/core-0-welcome.png' });
  await page.click('#btn-go');
  const toasts = [];
  const toast = async () => { const t = await page.$eval('#toast', e => (e.hidden ? '' : e.textContent)); if (t) toasts.push(t); };
  const tut = () => page.evaluate(() => window.__game.state.tut);
  // tut0: tap bakery
  const gen = await page.evaluate(() => window.__game.state.board.findIndex(c => c && c.gen === 'bakery'));
  await page.click(`#board .cell[data-i="${gen}"]`);
  await toast();
  console.log('after spawn tut', await tut());
  await page.screenshot({ path: OUT + '/core-1-merge-step.png' });
  // tut1: drag wheat onto wheat
  const w = await page.evaluate(() => window.__game.state.board.map((c, i) => (c && c.c === 'bakery' && c.l === 0 ? i : -1)).filter(i => i >= 0));
  const a = await page.$(`#board .cell[data-i="${w[0]}"]`), b = await page.$(`#board .cell[data-i="${w[1]}"]`);
  const ba = await a.boundingBox(), bb = await b.boundingBox();
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2);
  await page.mouse.down();
  await page.mouse.move(ba.x + ba.width / 2 + 15, ba.y + ba.height / 2, { steps: 3 });
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 });
  await page.mouse.up();
  await toast();
  console.log('after merge tut', await tut());
  await page.screenshot({ path: OUT + '/core-2-deliver-step.png' });
  await page.click('button.hl[data-deliver]', { force: true });
  await toast();
  console.log('after deliver tut', await tut(), 'coins', await page.evaluate(() => window.__game.state.coins));
  await page.waitForTimeout(400);
  await page.click('#btn-island', { force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/core-3-place.png' });
  await page.click('[data-task="0"]', { force: true });
  await page.waitForTimeout(150);
  await toast();
  const st = await page.evaluate(() => ({ tut: window.__game.state.tut, done: window.__game.state.tasksDone, coins: window.__game.state.coins }));
  console.log('after task', JSON.stringify(st));
  await page.screenshot({ path: OUT + '/core-4-task-done.png' });
  await page.click('#modal-close');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/core-5-board.png' });
  const shopOpened = await page.evaluate(() => /class="amyh"/.test(document.getElementById('modal-body').innerHTML) && !document.getElementById('modal').hidden);
  await browser.close();
  const bad = toasts.filter(t => /not enough|fehlen|need .* more|failed|error/i.test(t));
  console.log('toasts:', JSON.stringify(toasts));
  if (errors.length || bad.length || st.tut !== 5 || !st.done.includes(0) || shopOpened) { console.log('SMOKE FAIL', errors, bad); process.exit(1); }
  console.log('SMOKE OK');
})();
