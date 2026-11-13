// Plays every game to the end (random legal moves; air hockey by striking with the red mallet) and saves screenshots.
import { createRequire } from 'module';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2] || 'twotable/web'), shots = process.argv[3];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1420, height: 1000 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(300);
await pg.evaluate(() => { window.tt.fast = true; });
const shot = n => shots && pg.screenshot({ path: `${shots}/${n}.png` });
await shot('00-menu');
let ok = 0;
for (const id of ['four', 'checkers', 'dots', 'chess', 'backgammon']) {
  await pg.evaluate(id => window.tt.open(id), id);
  let n = 0;
  for (; n < (id === 'backgammon' ? 4000 : id === 'chess' ? 1500 : 400); n++) {
    const done = await pg.evaluate(id => {
      const g = window.tt.game(); if (window.tt.result()) return true;
      if (g.busy && g.busy()) return false;
      const l = g.legal(); if (!l.length) return true;
      const m = l[Math.floor(Math.random() * l.length)];
      if (id === 'four') g.play(m); else if (id === 'dots') g.take(m[0], m[1], m[2]); else g.playMove(m);
      return false;
    }, id);
    if (n === 12) await shot('mid-' + id);
    if (done) break;
    await pg.waitForTimeout(id === 'four' ? 120 : id === 'backgammon' ? 5 : 10);
  }
  await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => window.tt.result());
  console.log(id, 'moves', n, 'result', JSON.stringify(r && r.winner));
  if (r) ok++;
  await shot('end-' + id);
}
// air hockey: drag red mallet into the puck repeatedly
await pg.evaluate(() => window.tt.open('hockey')); await pg.waitForTimeout(1000);
await pg.mouse.move(1220, 500); await pg.mouse.down(); await pg.mouse.move(1300, 160, { steps: 5 }); await pg.mouse.up();
for (let k = 0; k < 40; k++) {
  const s = await pg.evaluate(() => window.tt.game().state());
  if (k === 3) await shot('mid-hockey');
  const [px, py] = s.puck;
  if (px > 700) { await pg.waitForTimeout(400); continue; }
  const dir = 1, gy = 500;
  const sx = px - dir * 160, sy = py - (gy - py) * 0.4;
  await pg.mouse.move(sx, sy); await pg.mouse.down();
  await pg.mouse.move(px + dir * 40, py + (gy - py) * 0.1, { steps: 4 }); await pg.mouse.up();
  await pg.waitForTimeout(700);
}
const hs = await pg.evaluate(() => window.tt.game().state());
console.log('hockey score', hs.score);
if (hs.score[0] + hs.score[1] > 0) ok++;
console.log(`games ok ${ok}/6; page errors ${errs.length}`, errs.slice(0, 3));
await b.close();
process.exit(ok === 6 && !errs.length ? 0 : 1);
