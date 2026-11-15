// Plays every game to the end (random legal moves; halma greedy; air hockey and paddle ball by steering) and saves screenshots.
// Also checks: no control in the fold band, undo, a match restored after a reload, the pages (settings, statistics, rules, guide).
import { createRequire } from 'module';
import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.resolve(process.argv[2] || 'twotable/web'), shots = process.argv[3];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1420, height: 1000 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
await pg.goto('file://' + dir + '/index.html'); await pg.waitForTimeout(300);
const shot = n => shots && pg.screenshot({ path: `${shots}/${n}.png` });
await shot('00-intro');
await pg.evaluate(() => { window.tt.fast = true; window.tt.intro(false); });
await pg.waitForTimeout(200);
await shot('00-menu');

// no control may sit in the 20 px band around the fold (x 700..720)
const band = async where => {
  const bad = await pg.evaluate(() => window.tt.controls().filter(r => r.x < 720 && r.x + r.w > 700).map(r => r.k));
  check(!bad.length, `no controls in the fold band (${where}) ${bad.join(',')}`);
};
await band('menu');

const TURN = ['four', 'checkers', 'dots', 'chess', 'backgammon', 'mill', 'reversi', 'uttt', 'sea', 'halma', 'mancala', 'pairs'];
const LIMIT = { backgammon: 4000, chess: 1500, halma: 1200, mill: 800, pairs: 4000 };
let ok = 0;
for (const id of TURN) {
  await pg.evaluate(id => window.tt.open(id), id);
  if (id === 'four') await band('game');
  let n = 0;
  for (; n < (LIMIT[id] || 400); n++) {
    const done = await pg.evaluate(id => {
      const g = window.tt.game(); if (window.tt.result()) return true;
      if (g.busy && g.busy()) return false;
      const l = g.legal(); if (!l.length) return true;
      const m = id === 'halma' && Math.random() < 0.9 ? g.auto() : l[Math.floor(Math.random() * l.length)];
      g.playMove(m);
      return false;
    }, id);
    if (n === 14) await shot('mid-' + id);
    if (done) break;
    await pg.waitForTimeout(id === 'four' ? 60 : id === 'backgammon' ? 5 : 8);
  }
  await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => window.tt.result());
  check(!!r, `${id} finished after ${n} moves, winner ${r && r.winner}${r && r.note ? ' (' + r.note + ')' : ''}`);
  if (r) ok++;
  await shot('end-' + id);
}

// undo: both players tap the arrow, the last move is taken back
await pg.evaluate(() => window.tt.open('reversi'));
for (let i = 0; i < 3; i++) await pg.evaluate(() => { const g = window.tt.game(); g.playMove(g.legal()[0]); });
const before = await pg.evaluate(() => window.tt.log().length);
await pg.evaluate(() => window.tt.undo());
const after = await pg.evaluate(() => window.tt.log().length);
check(before === 3 && after === 2, `undo takes back one move (${before} -> ${after})`);

// restore: a chess match survives a reload
await pg.evaluate(() => window.tt.open('chess'));
for (let i = 0; i < 6; i++) await pg.evaluate(i => { const g = window.tt.game(); const l = g.legal(); g.playMove(l[i % l.length]); }, i);
await pg.reload(); await pg.waitForTimeout(400);
const rest = await pg.evaluate(() => window.tt.log() ? window.tt.log().length : 0);
check(rest === 6, `chess match restored after reload (${rest} moves)`);
await pg.evaluate(() => { window.tt.fast = true; window.tt.intro(false); });
await shot('restored-chess');
await pg.evaluate(() => window.tt.menu());

// live games
await pg.evaluate(() => window.tt.open('hockey')); await pg.waitForTimeout(1000);
await pg.mouse.move(1220, 500); await pg.mouse.down(); await pg.mouse.move(1300, 160, { steps: 5 }); await pg.mouse.up();
for (let k = 0; k < 40; k++) {
  const s = await pg.evaluate(() => window.tt.game().state());
  if (k === 3) await shot('mid-hockey');
  const [px, py] = s.puck;
  if (px > 700) { await pg.waitForTimeout(400); continue; }
  const sx = px - 160, sy = py - (500 - py) * 0.4;
  await pg.mouse.move(sx, sy); await pg.mouse.down();
  await pg.mouse.move(px + 40, py + (500 - py) * 0.1, { steps: 4 }); await pg.mouse.up();
  await pg.waitForTimeout(700);
}
const hs = await pg.evaluate(() => window.tt.game().state());
check(hs.score[0] + hs.score[1] > 0, `hockey score ${hs.score}`);
if (hs.score[0] + hs.score[1] > 0) ok++;
await pg.evaluate(() => window.tt.open('paddles'));
for (let k = 0; k < 60; k++) {
  await pg.evaluate(() => { const g = window.tt.game(), s = g.state(); g.steer(0, s.ball[1]); g.steer(1, s.ball[1] > 500 ? 150 : 850); });
  if (k === 10) await shot('mid-paddles');
  await pg.waitForTimeout(100);
}
const ps = await pg.evaluate(() => window.tt.game().state());
check(ps.score[0] > 0, `paddle ball score ${ps.score}`);
if (ps.score[0] > 0) ok++;

// pages
await pg.evaluate(() => window.tt.menu());
await pg.evaluate(() => window.tt.page('settings', 0)); await pg.waitForTimeout(150); await shot('page-settings');
await pg.evaluate(() => window.tt.page('stats', 1)); await pg.waitForTimeout(150); await shot('page-stats');
await pg.evaluate(() => window.tt.page('rules', 0, 'backgammon')); await pg.waitForTimeout(150); await shot('page-rules');
await pg.evaluate(() => window.tt.page(null));
for (const th of ['wood', 'night', 'beach', 'contrast']) { await pg.evaluate(th => window.tt.set('theme', th), th); await pg.waitForTimeout(100); await shot('theme-' + th); }
await pg.evaluate(() => { window.tt.set('theme', 'felt'); window.tt.hinge(100, 'partial'); }); await pg.waitForTimeout(100); await shot('hinge-bent');
await pg.evaluate(() => window.tt.hinge(180, 'open'));

console.log(`games ok ${ok}/14; checks failed ${fails.length}; page errors ${errs.length}`, errs.slice(0, 3));
await b.close();
process.exit(ok === 14 && !fails.length && !errs.length ? 0 : 1);
