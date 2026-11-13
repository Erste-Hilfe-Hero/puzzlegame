// App Store screenshots 2796x1290 (6.7"/6.9" landscape) of menu and games mid-play. Usage: node shots.mjs <web dir> <out dir>
import { createRequire } from 'module';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2]), out = process.argv[3];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1398, height: 645 }, deviceScaleFactor: 2 });
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(400);
await pg.evaluate(() => { window.tt.fast = true; Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
await pg.screenshot({ path: `${out}/1-menu.png` });
async function play(id, n, name) {
  await pg.evaluate(id => window.tt.open(id), id);
  for (let i = 0; i < n; i++) {
    await pg.evaluate(id => { const g = window.tt.game(); if (window.tt.result() || (g.busy && g.busy())) return; const l = g.legal(); if (!l.length) return; const m = l[Math.floor(Math.random() * l.length)]; if (id === 'four') g.play(m); else if (id === 'dots') g.take(m[0], m[1], m[2]); else g.playMove(m); }, id);
    await pg.waitForTimeout(id === 'four' ? 150 : 20);
  }
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${out}/${name}.png` });
}
await play('chess', 14, '3-chess');
await play('backgammon', 9, '4-backgammon');
await play('four', 11, '5-four');
await play('checkers', 10, '6-checkers');
await play('dots', 30, '7-dots');
await pg.evaluate(() => window.tt.open('hockey')); await pg.waitForTimeout(900);
await pg.mouse.move(150, 322); await pg.mouse.down(); await pg.mouse.move(330, 300, { steps: 3 }); await pg.mouse.up();
await pg.waitForTimeout(250);
await pg.screenshot({ path: `${out}/2-hockey.png` });
await b.close();
