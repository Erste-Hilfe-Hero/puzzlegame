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
  await page.addInitScript(() => { if (!localStorage.getItem('amy-tasty-prefs')) localStorage.setItem('amy-tasty-prefs', JSON.stringify({ lang: 'de' })); });
  const t0 = Date.now();
  await page.goto('file://' + path.join(ROOT, 'web/index.html'));
  await page.waitForSelector('#board .cell');
  console.log('board ready ms', Date.now() - t0); // F42
  await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + '/core-intro.png' }); // F13
  await page.click('#intro-skip');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/core-0-welcome.png' });
  await page.click('#btn-go');
  const toasts = [];
  const toast = async () => { const t = await page.$eval('#toast', e => (e.hidden ? '' : e.textContent)); if (t) toasts.push(t); };
  const tut = () => page.evaluate(() => window.__game.state.tut);
  // tut0: tap bakery
  const gen = await page.evaluate(() => window.__game.state.board.findIndex(c => c && c.gen === 'bakery'));
  await page.click(`#board .cell[data-i="${gen}"]`);
  await toast();
  console.log('after spawn tut', await tut(), await page.evaluate(() => JSON.stringify(window.__game.state.board.map((c, i) => (c && c.c ? i + c.c[0] + c.l : null)).filter(Boolean))));
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
  if (await tut() === 1) { // drag did not merge (known on the baseline too): use tap-tap merge (I35)
    console.log('drag merge failed, tap-tap merge');
    await page.click(`#board .cell[data-i="${w[0]}"]`); await page.waitForTimeout(400);
    await page.click(`#board .cell[data-i="${w[1]}"]`); await page.waitForTimeout(200);
  }
  console.log('after merge tut', await tut());
  await page.screenshot({ path: OUT + '/core-2-deliver-step.png' });
  const db = await (await page.$('button.hl[data-deliver]')).boundingBox();
  console.log('deliver btn', JSON.stringify(db), await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.outerHTML.slice(0, 90) : ''; }, [db.x + db.width / 2, db.y + db.height / 2]));
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
  await page.screenshot({ path: OUT + '/core-4-task-done.png' }); // F15 before/after
  const reno = await page.evaluate(() => !!document.querySelector('#modal-body .reno-pics'));
  console.log('renovation picture', reno);
  await page.click('#modal-close');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/core-5-board.png' });
  const shopOpened = await page.evaluate(() => /class="amyh"/.test(document.getElementById('modal-body').innerHTML) && !document.getElementById('modal').hidden);
  await browser.close();
  const bad = toasts.filter(t => /not enough|fehlen|need .* more|failed|error/i.test(t));
  console.log('toasts:', JSON.stringify(toasts));
  if (errors.length || bad.length || st.tut !== 5 || !st.done.includes(0) || shopOpened || !reno) { console.log('SMOKE FAIL', errors, bad); process.exit(1); }
  console.log('SMOKE OK');
})();
