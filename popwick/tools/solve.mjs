// Plays every level with a scripted hinge schedule (angle by Wick x) and checks it reaches the flag.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path';
const dir = path.resolve(process.argv[2] || 'popwick/web');
const shots = process.argv[3];
const plans = [
  [[0, 120]], [[0, 140]], [[0, 160]], [[0, 90], [600, 170]], [[0, 115], [585, 165]],
  [[0, 175], [520, 95]], [[0, 100], [715, 180]], [[0, 80], [500, 120], [840, 160]],
  [[0, 100], [440, 150], [810, 100]], [[0, 160], [830, 100], [920, 170]]
];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1420, height: 1000 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto('file://' + dir + '/index.html');
await pg.waitForTimeout(300);
if (shots) await pg.screenshot({ path: shots + '/00-cover.png' });
await pg.mouse.click(700, 500); await pg.waitForTimeout(300);
if (shots) await pg.screenshot({ path: shots + '/01-select.png' });
let ok = 0;
for (let i = 0; i < plans.length; i++) {
  await pg.evaluate(i => window.popwick.start(i), i);
  let res, shot = false;
  for (let f = 0; f < 400; f++) {
    res = await pg.evaluate(() => window.popwick.state());
    let a = plans[i][0][1];
    for (const [x, ang] of plans[i]) if (res.x >= x) a = ang;
    await pg.evaluate(a => window.popwick.setAngle(a), a);
    if (shots && !shot && res.x > 500) { await pg.screenshot({ path: `${shots}/level-${String(i + 1).padStart(2, '0')}.png` }); shot = true; }
    if (res.state !== 'play') break;
    await pg.waitForTimeout(50);
  }
  const pass = res.state === 'win' && res.tries === 0 || res.state === 'win';
  console.log(`level ${i + 1}: ${res.state} x=${Math.round(res.x)} y=${Math.round(res.y)} stars=${res.stars} tries=${res.tries}`);
  if (res.state === 'win') ok++;
  await pg.evaluate(() => window.popwick.start(0));
}
console.log(`solved ${ok}/${plans.length}; page errors: ${errs.length}`, errs.slice(0, 3));
await b.close();
process.exit(ok === plans.length && !errs.length ? 0 : 1);
