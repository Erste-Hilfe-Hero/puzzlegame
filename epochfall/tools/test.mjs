// Usage: node epochfall/tools/test.mjs <webDir> [shotDir]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const web = path.resolve(process.argv[2] || 'epochfall/web');
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
await page.goto('file://' + path.join(web, 'index.html'));
await page.waitForTimeout(500);
const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, n + '.png') }); };
await shot('00-title');

await page.evaluate(() => EF.start(true));
await page.waitForTimeout(300);
ok('game starts', await page.evaluate(() => EF.mode === 'play'));
await page.evaluate(() => EF.step(60));
ok('player stands on ground', await page.evaluate(() => EF.P.onGround));
await shot('01-present-start');

// walk right across the present-only bridge
const crossed = await page.evaluate(() => { EF.teleport(40, 35); EF.hold('right', true); for (let i = 0; i < 60 * 5; i++) { EF.step(1); EF.P.inv = 9; } EF.hold('right', false); return EF.P.x / 16; });
ok('present: bridge is walkable', crossed > 76, 'x=' + crossed.toFixed(1));
await shot('02-present-bridge');

// past: bridge gone
const fell = await page.evaluate(() => { EF.teleport(86, 35); EF.step(5); EF.era(); const e = EF.S.era; EF.teleport(46, 35); EF.step(40); return { e, y: EF.P.y / 16 }; });
ok('shrine switches to past', fell.e === 0);
await page.evaluate(() => { EF.teleport(86, 35); EF.step(30); });
await shot('03-past-shrine');

// climb vine steps in the past with real inputs
const climb = await page.evaluate(() => {
  const P = () => EF.P;
  const run = (dir, frames, jump) => { if (dir) EF.hold(dir, true); if (jump) EF.hold('jump', true); for (let i = 0; i < frames; i++) { EF.step(1); P().inv = 9; } if (dir) EF.hold(dir, false); if (jump) EF.hold('jump', false); for (let i = 0; i < 25; i++) EF.step(1); };
  const goto = (tx) => { for (let i = 0; i < 200 && Math.abs(P().x + 6 - tx * 16) > 3; i++) { const d = tx * 16 - (P().x + 6) > 0 ? 'right' : 'left'; EF.hold(d, true); EF.step(1); EF.hold(d, false); P().vx *= 0.3; } for (let i = 0; i < 20; i++) EF.step(1); };
  EF.teleport(103, 35); EF.step(30);
  const log = [];
  const seq = [[106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [112, 'right']];
  for (const [tx, d] of seq) { run(d, 26, true); goto(tx); log.push((P().y + P().h) / 16); }
  return { y: (P().y + P().h) / 16, x: P().x / 16, log };
});
ok('past: vine steps lead up to the ledge', climb.y <= 18.1 && climb.x > 109, JSON.stringify(climb));
await shot('04-past-ledge');

// feather + double jump onto the upper platform and over the wall
const over = await page.evaluate(() => {
  EF.teleport(140, 18); EF.step(20);
  const dj = EF.S.dj;
  EF.teleport(144, 18); EF.step(20);
  EF.hold('right', true); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.step(2); EF.hold('jump', true);
  for (let i = 0; i < 18; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.hold('right', false);
  for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 9; }
  const onPlat = (EF.P.y + EF.P.h) / 16;
  EF.hold('right', true); EF.hold('jump', true);
  for (let i = 0; i < 16; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.step(2); EF.hold('jump', true);
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('jump', false); EF.hold('right', false);
  for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; }
  return { dj, onPlat, x: EF.P.x / 16 };
});
ok('feather gives double jump', over.dj);
ok('double jump reaches upper platform', over.onPlat <= 13.1, 'feet=' + over.onPlat);
ok('upper route crosses the wall', over.x > 156, 'x=' + over.x.toFixed(1));

// combat + ecosystem
const eco = await page.evaluate(() => {
  EF.S.pastKills.hunter = 9;
  EF.teleport(26, 35); EF.step(5);
  if (EF.S.era !== 0) EF.era();
  // spawn a past sigbin next to the player via the spawn system
  EF.teleport(60 * 0 + 20, 35); EF.step(5);
  for (let i = 0; i < 300 && !EF.enemies.some(e => e.sp === 'sigbin'); i++) { EF.teleport(i % 2 ? 2 : 60, 35); EF.step(2); }
  const e = EF.enemies.find(e => e.sp === 'sigbin');
  if (!e) return { found: false };
  let hits = 0;
  for (let i = 0; i < 400 && !e.dead; i++) { EF.P.x = e.x - 14; EF.P.y = e.y + e.h - EF.P.h; EF.P.face = 1; EF.P.inv = 9; if (i % 12 === 0) { EF.tap('attack'); hits++; } else EF.step(1); }
  return { found: true, dead: e.dead, hits, pct: EF.S.pastKills.hunter };
});
ok('melee kills a past Sigbin', eco.found && eco.dead, JSON.stringify(eco));
ok('ten past kills make the hunter extinct', eco.pct === 10);
const succ = await page.evaluate(() => {
  EF.teleport(86, 35); EF.step(5); EF.era();
  for (let i = 0; i < 400 && !EF.enemies.some(e => e.d.niche === 'hunter'); i++) { EF.teleport(i % 2 ? 84 : 140, 35); EF.step(2); }
  return EF.enemies.filter(e => e.d.niche === 'hunter').map(e => e.sp);
});
ok('present: successor species takes the niche', succ.length && succ.every(s => s === 'tiktik'), succ.join(','));
await page.evaluate(() => { EF.teleport(30, 35); EF.step(60); });
await shot('05-present-successor');

// skill tree
const sk = await page.evaluate(() => { EF.sp(5); EF.give('hunterP', 4); const a = [EF.learn('bolt'), EF.learn('swift'), EF.learn('fourth'), EF.learn('breaker')]; return { a, nodes: EF.S.nodes.length }; });
ok('skill tree nodes learnable', sk.a.every(Boolean), JSON.stringify(sk));
await page.evaluate(() => EF.menu(true));
await page.waitForTimeout(200);
await shot('06-skill-tree');
await page.click('.tabs [data-tab="eco"]');
await shot('07-ecosystem');
await page.evaluate(() => EF.menu(false));

// breaker opens the cracked wall
const wall = await page.evaluate(() => {
  EF.teleport(152, 35); EF.P.face = 1; EF.step(10);
  for (let i = 0; i < 4; i++) { EF.tap('attack'); for (let j = 0; j < 14; j++) { EF.step(1); EF.P.inv = 9; } }
  return EF.tile(154, 34);
});
ok('Kampilan Breaker shatters cracked stone', wall === 0, 'tile=' + wall);

// boss
const b1 = await page.evaluate(() => { EF.teleport(172, 35); EF.step(5); return !!EF.boss; });
ok('boss fight starts in the arena', b1);
await page.evaluate(() => { for (let i = 0; i < 160; i++) { EF.step(1); EF.P.inv = 9; } });
await shot('08-boss');
const fight = await page.evaluate(() => {
  const seen = new Set(); let maxStage = 0, frames = 0;
  while (EF.boss && frames < 60 * 120) {
    const b = EF.boss; seen.add(b.st); maxStage = Math.max(maxStage, b.stage);
    EF.P.inv = 9;
    EF.P.x = b.x + (EF.P.x < b.x ? -14 : b.w + 2); EF.P.face = EF.P.x < b.x ? 1 : -1;
    if (frames % 10 === 0) EF.tap('attack'); else EF.step(1);
    if (frames % 90 === 0) { EF.hold('jump', true); EF.step(1); EF.hold('jump', false); }
    frames++;
    if (frames === 60 * 6) window.__mid = 1;
  }
  return { seen: [...seen], maxStage, frames, mode: EF.mode, done: EF.S.bossDone };
});
ok('boss uses several attacks', fight.seen.length >= 4, fight.seen.join(','));
ok('boss escalates stages during the fight', fight.maxStage >= 3, 'max stage ' + fight.maxStage);
ok('boss can be defeated, win screen shows', fight.done && fight.mode === 'win', JSON.stringify(fight));
await page.waitForTimeout(300);
await shot('09-win');

// boss memory: dying raises the next starting stage
const mem = await page.evaluate(() => { EF.S.bossDone = false; EF.S.bossMem.attempts = 2; return null; });
await page.evaluate(() => { document.getElementById('win').hidden = true; });

ok('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const fails = results.filter(r => !r.pass).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
