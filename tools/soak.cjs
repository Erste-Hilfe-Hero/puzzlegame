// I32: long run with Auto-Merge and Double Spawn active. Taps generators, delivers and clears the board in a loop and
// samples DOM nodes (spark, ring, fly, conf and other effect nodes) and JS heap after a forced GC.
// Fails when effect nodes pile up or nodes / heap keep growing. Run: SOAK_MIN=120 node tools/soak.cjs  (default 3 min)
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIN = +(process.env.SOAK_MIN || 3);
const SAMPLE_MS = Math.max(10000, Math.min(60000, MIN * 60000 / 12));
const FX = '.spark, .ring, .fly, .conf, .xfly, .order-leave, .chest-open, .popped, #lvlup, #tut-hand';

(async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'web/index.html'));
  await page.waitForTimeout(500);
  await page.click('#btn-go');
  await page.evaluate(() => {
    P.music = false; P.musicVol = 0; S.tut = 5; S.level = Math.max(S.level, 6); commit();
    window.__soak = { spawns: 0, delivers: 0, clears: 0 };
    setInterval(() => {
      const until = now() + 10 * 36e5;
      S.boosts.autoMerge = until; S.boosts.double = until; S.energy = 999;
      if (!$('modal').hidden) closeModal();
      const gens = S.board.map((c, i) => (c && c.gen ? i : -1)).filter(i => i >= 0);
      if (gens.length) { spawn(gens[__soak.spawns % gens.length]); __soak.spawns++; }
      S.orders.forEach((o, k) => { if (findItems(o)) { deliver(k); __soak.delivers++; } });
      if (S.board.filter(c => !c).length < 3) { S.board = S.board.map(c => (c && (c.gen || c.drift) ? c : null)); commit(); __soak.clears++; }
    }, 120);
  });
  const cdp = await page.context().newCDPSession(page);
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < MIN * 60000) {
    await page.waitForTimeout(SAMPLE_MS);
    await cdp.send('HeapProfiler.collectGarbage');
    const s = await page.evaluate(fx => ({
      nodes: document.getElementsByTagName('*').length, fx: document.querySelectorAll(fx).length,
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : 0, ...window.__soak
    }), FX);
    s.min = ((Date.now() - t0) / 60000).toFixed(1);
    samples.push(s);
    console.log(JSON.stringify(s));
  }
  await browser.close();
  const first = samples.slice(0, Math.max(1, Math.floor(samples.length / 3)));
  const last = samples.slice(-Math.max(1, Math.floor(samples.length / 3)));
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const nodes0 = med(first.map(s => s.nodes)), nodes1 = med(last.map(s => s.nodes));
  const heap0 = med(first.map(s => s.heap)), heap1 = med(last.map(s => s.heap));
  const fxMax = Math.max(...samples.map(s => s.fx));
  const problems = [...errors.map(e => 'pageerror: ' + e)];
  if (fxMax > 40) problems.push(`effect nodes pile up (max ${fxMax})`);
  if (nodes1 > nodes0 * 1.15 + 20) problems.push(`DOM nodes grow ${nodes0} -> ${nodes1}`);
  if (heap0 && heap1 > heap0 * 1.5 + 2048) problems.push(`heap grows ${heap0} KB -> ${heap1} KB`);
  if (!samples.length || samples[samples.length - 1].spawns < 10) problems.push('loop did not run');
  console.log(`soak ${MIN} min: nodes ${nodes0} -> ${nodes1}, heap ${heap0} -> ${heap1} KB, fx max ${fxMax}`);
  if (problems.length) { console.log('SOAK FAIL\n' + problems.join('\n')); process.exit(1); }
  console.log('SOAK OK');
})();
