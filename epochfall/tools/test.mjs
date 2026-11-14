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

// fresh device: hell mode is locked; a save from before the class choice loads as an Eskrimador; daily gift once per day
const pre = await page.evaluate(() => {
  const hb = document.getElementById('btn-hell');
  const locked = hb.disabled && !EF.hellUnlocked();
  localStorage.setItem('epochfall.save.v1', JSON.stringify({ v: 1, lvl: 3, xp: 0, sp: 2, nodes: ['arnis', 'bolt'], mats: {}, era: 1, shrine: 0, time: 50 }));
  EF.start(false);
  const r = { locked, cls: EF.S.cls, nodes: EF.S.nodes.join(','), look: EF.S.look, boltInTree: EF.tree().some(n => n.id === 'bolt'), tala: EF.acc.tala, again: EF.dailyGift() };
  EF.toTitle();
  r.stillLocked = document.getElementById('btn-hell').disabled;
  return r;
});
ok('hell mode is locked on a fresh device', pre.locked && pre.stillLocked, JSON.stringify(pre));
ok('old saves without a class load as Eskrimador', pre.cls === 'esk' && pre.boltInTree && pre.nodes === 'arnis,bolt' && pre.look && pre.look.skin === 2);
ok('daily gift gives Tala once per day', pre.tala === 100 && pre.again === false, 'tala=' + pre.tala);

await page.evaluate(() => EF.start(true));
await page.waitForTimeout(300);
ok('game starts', await page.evaluate(() => EF.mode === 'play'));
// the map grew upward by EF.OY rows; every original coordinate below is shifted by Y
const Y = await page.evaluate(() => EF.OY);
await page.evaluate(() => {
  // shared helpers for real-input movement (installed on window so every evaluate can use them)
  window.T = {
    run(dir, frames, jump) { if (dir) EF.hold(dir, true); if (jump) EF.hold('jump', true); for (let i = 0; i < frames; i++) { EF.step(1); EF.P.inv = 9; } if (dir) EF.hold(dir, false); if (jump) EF.hold('jump', false); for (let i = 0; i < 25; i++) { EF.step(1); EF.P.inv = 9; } },
    goto(tx) { for (let i = 0; i < 1500 && Math.abs(EF.P.x + 6 - tx * 16) > 3; i++) { const d = tx * 16 - (EF.P.x + 6) > 0 ? 'right' : 'left'; EF.hold(d, true); EF.step(1); EF.hold(d, false); EF.P.vx *= 0.3; EF.P.inv = 9; } for (let i = 0; i < 20; i++) { EF.step(1); EF.P.inv = 9; } },
    climb(seq) { const log = []; for (const [tx, d] of seq) { T.run(d, 26, true); T.goto(tx); log.push(+((EF.P.y + EF.P.h) / 16).toFixed(2)); } return log; },
    feet() { return (EF.P.y + EF.P.h) / 16; },
    toEra(e) { if (EF.S.era !== e) EF.era(); },
    meleeKill(e, maxFrames = 600) { for (let i = 0; i < maxFrames && !e.dead; i++) { EF.P.x = e.x - 14; EF.P.y = e.y + e.h - EF.P.h; EF.P.vy = 0; EF.P.face = 1; EF.P.inv = 9; if (i % 12 === 0) EF.tap('attack'); else EF.step(1); } return e.dead; },
    findSpawn(pred, spots, n = 400) { for (let i = 0; i < n && !EF.enemies.some(pred); i++) { const [x, y] = spots[i % spots.length]; EF.teleport(x, y); EF.step(2); } return EF.enemies.filter(pred).map(e => e.sp); }
  };
});
await page.evaluate(() => EF.step(60));
ok('player stands on ground', await page.evaluate(() => EF.P.onGround));
await shot('01-present-start');

// starter spirit: the Diwata Wisp follows from the start and heals slowly
const wisp = await page.evaluate(() => { EF.clearEnemies(); const s = EF.S.spirit; EF.P.hp = 50; for (let i = 0; i < 120; i++) { EF.step(1); EF.P.inv = 9; } return { s, hp: EF.P.hp }; });
ok('starter Diwata Wisp is active and heals', wisp.s === 'diwata' && wisp.hp > 51.5, JSON.stringify(wisp));

// walk right across the present-only bridge
const crossed = await page.evaluate(Y => { EF.teleport(40, Y + 35); EF.hold('right', true); for (let i = 0; i < 60 * 5; i++) { EF.step(1); EF.P.inv = 9; } EF.hold('right', false); return EF.P.x / 16; }, Y);
ok('present: bridge is walkable', crossed > 76, 'x=' + crossed.toFixed(1));
await shot('02-present-bridge');

// past: bridge gone
const fell = await page.evaluate(Y => { EF.teleport(86, Y + 35); EF.step(5); EF.era(); const e = EF.S.era; const w = EF.wipe; EF.teleport(46, Y + 35); EF.step(40); return { e, w, y: EF.P.y / 16 }; }, Y);
ok('shrine switches to past', fell.e === 0);
ok('era switch plays the screen wipe', fell.w > 0, 'wipe=' + fell.w.toFixed(2));
await page.evaluate(Y => { EF.teleport(86, Y + 35); EF.step(30); }, Y);
await shot('03-past-shrine');

// climb vine steps in the past with real inputs
const climb = await page.evaluate(Y => {
  EF.teleport(103, Y + 35); EF.step(30);
  const log = T.climb([[106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [112, 'right']]);
  return { y: T.feet(), x: EF.P.x / 16, log };
}, Y);
ok('past: vine steps lead up to the ledge', climb.y <= Y + 18.1 && climb.x > 109, JSON.stringify(climb));
await shot('04-past-ledge');

// feather + double jump onto the upper platform and over the wall
const over = await page.evaluate(Y => {
  EF.teleport(140, Y + 18); EF.step(20);
  const dj = EF.S.dj;
  EF.teleport(144, Y + 18); EF.step(20);
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
}, Y);
ok('feather gives double jump', over.dj);
ok('double jump reaches upper platform', over.onPlat <= Y + 13.1, 'feet=' + over.onPlat);
ok('upper route crosses the wall', over.x > 156, 'x=' + over.x.toFixed(1));

// ---- new routes, all with real inputs ----
// past: the hidden Punso den behind the vine curtain (one extra vine step, then a jump left through the curtain)
const den = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies();
  EF.teleport(103, Y + 35); EF.step(30);
  const log = T.climb([[106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left'], [106.5, 'right'], [101.5, 'left']]);
  T.run('left', 26, true); T.goto(90);
  const inside = { feet: T.feet(), x: EF.P.x / 16 };
  T.goto(84.5);
  return { log, inside, chest: EF.S.chests.includes('cave'), mats: EF.S.mats.scavP || 0 };
}, Y);
ok('past: hidden den is reachable through the vine curtain', den.inside.feet <= 56.05 && den.inside.feet > 55.5 && den.inside.x < 97, JSON.stringify(den.inside) + ' ' + JSON.stringify(den.log));
ok('past: den secret chest opens', den.chest && den.mats >= 3, 'scavP=' + den.mats);
await page.evaluate(() => { for (let i = 0; i < 30; i++) EF.step(1); });
await page.waitForTimeout(400);
await shot('10-past-den');
const seal = await page.evaluate(() => { const past = EF.solid(98, 54); T.toEra(1); const pres = EF.solid(98, 54); T.toEra(0); return { past, pres }; });
ok('den entrance is open in the past, sealed in the present', !seal.past && seal.pres, JSON.stringify(seal));

// both eras: balete canopy climb from the ledge
const canopy = await page.evaluate(Y => {
  EF.clearEnemies();
  EF.teleport(116, Y + 18); EF.step(30);
  const log = T.climb([[119.5, 'right'], [114.5, 'left'], [119.5, 'right'], [114.5, 'left'], [119.5, 'right'], [126, 'right']]);
  return { feet: T.feet(), log };
}, Y);
ok('canopy steps lead up to the balete deck', canopy.feet <= 40.05, JSON.stringify(canopy));
await page.waitForTimeout(300);
await shot('11-past-canopy');

// present: rooftop route (present-only rooftops) up to the secret chest
const roof = await page.evaluate(Y => {
  T.toEra(1); EF.clearEnemies();
  EF.teleport(39, Y + 35); EF.step(30);
  const a = T.climb([[42.5, 'right'], [37.5, 'left'], [42.5, 'right'], [37.5, 'left'], [42.5, 'right'], [37.5, 'left'], [42.5, 'right']]);
  T.run('right', 26, true); T.goto(58.5);
  const deck = T.feet();
  const b = T.climb([[63.5, 'right'], [68.5, 'right'], [63.5, 'left'], [68.5, 'right']]);
  T.run('left', 26, true);
  const top = T.feet();
  T.goto(54.5);
  return { a, deck, b, top, chest: EF.S.chests.includes('roof'), mats: EF.S.mats.scavX || 0 };
}, Y);
ok('present: rooftop route climbs to the top deck', roof.deck <= 52.05 && roof.top <= 37.05, JSON.stringify(roof));
ok('present: rooftop secret chest opens', roof.chest && roof.mats >= 2, 'scavX=' + roof.mats);
await page.waitForTimeout(300);
await shot('12-present-rooftop');
const gone = await page.evaluate(Y => { T.toEra(0); EF.teleport(42, 72); for (let i = 0; i < 90; i++) { EF.step(1); EF.P.inv = 9; } return T.feet(); }, Y);
ok('past: the rooftops do not exist', gone >= Y + 36 - 0.05, 'feet=' + gone.toFixed(2));

// ---- new niches: giant + scavenger ----
const sp = await page.evaluate(Y => {
  T.toEra(0);
  const pg = T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]);
  const ps = T.findSpawn(e => e.d.niche === 'scav', [[100, Y + 35], [60, Y + 35]]);
  T.toEra(1);
  const xg = T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]);
  const xs = T.findSpawn(e => e.d.niche === 'scav', [[100, Y + 35], [30, Y + 35]]);
  return { pg, ps, xg, xs };
}, Y);
ok('past: Kapre spawns in the giant niche', sp.pg.length && sp.pg.every(s => s === 'kapre'), sp.pg.join(','));
ok('past: Taga-Punso spawns in the scavenger niche', sp.ps.length && sp.ps.every(s => s === 'punso'), sp.ps.join(','));
ok('present: Kapre Mech descends from the Kapre', sp.xg.length && sp.xg.every(s => s === 'kapremech'), sp.xg.join(','));
ok('present: Rustlings descend from the Taga-Punso', sp.xs.length && sp.xs.every(s => s === 'rustling'), sp.xs.join(','));

const pound = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies();
  EF.teleport(30, Y + 35); EF.step(10);
  const k = EF.spawnAt('kapre', 33, Y + 36), seen = new Set(); let wave = false;
  for (let i = 0; i < 240 && !wave; i++) { EF.step(1); EF.P.inv = 9; seen.add(k.st); if (EF.projs.some(p => p.from === 'enemy' && p.type === 'wave')) wave = true; }
  return { wave, seen: [...seen] };
}, Y);
ok('Kapre winds up and ground-pounds shockwaves', pound.wave && pound.seen.includes('wind'), JSON.stringify(pound));
await page.evaluate(() => { const k = EF.enemies.find(e => e.sp === 'kapre'); if (k) { k.st = 'wind'; k.t = 0.3; } EF.spawnAt('punso', EF.P.x / 16 - 4, EF.P.y / 16 + 2); });
await page.waitForTimeout(150);
await shot('13-past-kapre-punso');

const thief = await page.evaluate(Y => {
  EF.clearEnemies();
  EF.teleport(10, Y + 35); EF.step(10);
  const it = EF.drop(30, Y + 36, 'giantP'); for (let i = 0; i < 40; i++) EF.step(1);
  const e = EF.spawnAt('punso', 36, Y + 36);
  for (let i = 0; i < 240 && !(e.loot && e.loot.length); i++) { EF.step(1); EF.P.inv = 9; }
  const stole = { got: it.got, loot: (e.loot || []).slice(), st: e.st };
  const before = EF.S.mats.giantP || 0;
  const dead = T.meleeKill(e);
  const dropped = EF.items.some(i => i.mat === 'giantP');
  for (let i = 0; i < 120; i++) { EF.step(1); EF.P.inv = 9; }
  return { stole, dead, dropped, regained: (EF.S.mats.giantP || 0) > before };
}, Y);
ok('scavenger steals a dropped material and flees', thief.stole.got && thief.stole.loot[0] === 'giantP' && thief.stole.st === 'flee', JSON.stringify(thief.stole));
ok('killing the thief drops the stolen material', thief.dead && thief.dropped && thief.regained, JSON.stringify(thief));

// giant extinction: successor + spirit at the next shrine, captured by walking into it
const ext = await page.evaluate(Y => {
  T.toEra(0); EF.clearEnemies(); EF.S.pastKills.giant = 9;
  EF.teleport(120, Y + 35); EF.step(5);
  const k = EF.spawnAt('kapre', 122, Y + 36);
  const dead = T.meleeKill(k, 1500);
  return { dead, kills: EF.S.pastKills.giant, at: EF.S.spiritAt.kapre, succ: EF.speciesFor('giant') };
}, Y);
ok('ten past kills drive the Kapre extinct', ext.dead && ext.kills === 10, JSON.stringify(ext));
ok('Kapre spirit appears at the next Anito shrine', ext.at === 2, 'shrine=' + ext.at);
const succG = await page.evaluate(Y => { T.toEra(1); return T.findSpawn(e => e.d.niche === 'giant', [[126, Y + 35], [100, Y + 35]]); }, Y);
ok('present: Ugat Colossus takes the giant niche', succG.length && succG.every(s => s === 'ugat'), succG.join(','));
await page.evaluate(() => { const u = EF.enemies.find(e => e.sp === 'ugat'); if (u) { EF.teleport(u.x / 16 - 6, u.y / 16 + u.h / 16); EF.step(2); } });
await page.waitForTimeout(250);
await shot('14-present-ugat');
const dep = await page.evaluate(() => { const alive = EF.succOf('scav'); const k = EF.S.pastKills.swarm; EF.S.pastKills.swarm = 10; const dead = EF.succOf('scav'); EF.S.pastKills.swarm = k; return { alive, dead }; });
ok('scavenger successor depends on the swarm niche', dep.alive === 'mirrormole' && dep.dead === 'cindershrew', JSON.stringify(dep));

const cap = await page.evaluate(Y => {
  EF.clearEnemies();
  const hp0 = EF.stats().maxhp;
  EF.teleport(158, Y + 35); EF.step(10);
  EF.hold('right', true);
  for (let i = 0; i < 120 && !EF.S.spirits.includes('kapre'); i++) { EF.step(1); EF.P.inv = 9; }
  EF.hold('right', false);
  return { got: EF.S.spirits.includes('kapre'), active: EF.S.spirit, pending: EF.S.spiritAt.kapre, hp0, hp1: EF.stats().maxhp };
}, Y);
ok('walking into the spirit captures it', cap.got && cap.active === 'kapre' && cap.pending === undefined, JSON.stringify(cap));
ok('Kapre spirit raises max HP', Math.round(cap.hp1 - cap.hp0) >= 30, cap.hp0 + ' -> ' + cap.hp1);
await page.evaluate(() => { for (let i = 0; i < 20; i++) EF.step(1); });
await page.waitForTimeout(200);
await shot('15-spirit-follows');

const fx = await page.evaluate(Y => {
  EF.clearEnemies(); EF.S.spirits.push('salagubang', 'wakwak', 'sigbin', 'punso');
  // Salagubang: blocks one hit, the next one lands
  EF.equip('salagubang'); EF.teleport(30, Y + 35); EF.step(5);
  EF.P.hp = EF.P.maxhp; EF.P.inv = 0;
  const s = EF.spawnAt('sigbin', EF.P.x / 16, Y + 36); EF.step(1);
  const blocked = EF.P.hp === EF.P.maxhp, cd = EF.P.shieldCd;
  EF.P.inv = 0; s.x = EF.P.x; s.y = EF.P.y + EF.P.h - s.h; EF.step(1);
  const second = EF.P.hp < EF.P.maxhp;
  // Wakwak: auto-attacks a nearby flyer
  EF.clearEnemies(); EF.equip('wakwak');
  const f = EF.spawnAt('wakwak', EF.P.x / 16 + 4, Y + 32); let dart = false;
  for (let i = 0; i < 150; i++) { EF.step(1); EF.P.inv = 9; if (EF.projs.some(p => p.type === 'dart')) dart = true; }
  const flyerHit = f.dead || f.hp < f.max;
  EF.equip('sigbin'); const crit = EF.stats().crit;
  EF.equip('punso'); const magnet = EF.stats().magnet;
  EF.equip('kapre');
  return { blocked, cd: +cd.toFixed(1), second, dart, flyerHit, crit, magnet };
}, Y);
ok('Salagubang spirit shield blocks one hit every 12 s', fx.blocked && fx.cd >= 11.9 && fx.second, JSON.stringify(fx));
ok('Wakwak spirit shoots nearby flyers', fx.dart && fx.flyerHit);
ok('Sigbin and Taga-Punso spirits change stats', fx.crit > 0.15 && fx.magnet > 150);
await page.evaluate(() => { EF.menu(true); EF.tab('spirits'); });
await page.waitForTimeout(200);
await shot('16-spirits-tab');

// forge with a deterministic roll: 100% up to +5, then a forced failure and a forced success at 90%
const forge = await page.evaluate(() => {
  for (const m of ['hunterP', 'swarmP', 'flyerP', 'scavP', 'giantP', 'hunterX', 'swarmX', 'flyerX', 'giantX', 'scavX', 'hunterS', 'swarmS', 'flyerS', 'giantS']) EF.give(m, 20);
  const base = EF.stats().dmg / (1 + 0.06 * EF.S.forge);
  EF.rng(() => 0.99);
  const ups = []; for (let i = 0; i < 5; i++) ups.push(EF.forge());
  const at5 = EF.S.forge, dmg5 = EF.stats().dmg / base;
  const hS = EF.S.mats.hunterS, sP = EF.S.mats.swarmP;
  EF.rng(() => 0.95); const fail = EF.forge();
  const afterFail = { lv: EF.S.forge, hunterS: EF.S.mats.hunterS, swarmP: EF.S.mats.swarmP };
  EF.tab('forge');
  const failText = document.getElementById('m-body').textContent;
  EF.rng(() => 0.0); const win = EF.forge();
  EF.rng(null);
  EF.tab('forge');
  const text = document.getElementById('m-body').textContent;
  return { ups, at5, dmg5: +dmg5.toFixed(3), fail, afterFail, hS, sP, win, lv: EF.S.forge, dmg6: +(EF.stats().dmg / base).toFixed(3), shows90: failText.includes('90%'), shows80: text.includes('80%') };
});
ok('forge +1..+5 always succeeds, +6% melee each', forge.ups.every(v => v === true) && forge.at5 === 5 && Math.abs(forge.dmg5 - 1.3) < 0.001, JSON.stringify(forge));
ok('failed forge consumes materials and keeps the level', forge.fail === false && forge.afterFail.lv === 5 && forge.afterFail.hunterS === forge.hS - 2 && forge.afterFail.swarmP === forge.sP - 3);
ok('successful forge raises the level to +6', forge.win === true && forge.lv === 6 && Math.abs(forge.dmg6 - 1.36) < 0.001);
ok('forge shows the success odds', forge.shows90 && forge.shows80);
await shot('17-forge-tab');

// map tab + saved explored tiles + HUD mini-map
const mp = await page.evaluate(() => {
  EF.tab('map');
  const pct = EF.explored();
  document.getElementById('mm-toggle').click();
  const saved = JSON.parse(localStorage.getItem('epochfall.save.v1') || '{}');
  return { pct, mm: EF.S.minimap, savedEx: (saved.ex || '').includes('1') };
});
ok('explored tiles are tracked and saved', mp.pct > 5 && mp.savedEx, JSON.stringify(mp));
await shot('18-map-tab');
await page.evaluate(() => EF.menu(false));
ok('mini-map toggle turns on the HUD map', mp.mm);

// combat + ecosystem
const eco = await page.evaluate(Y => {
  EF.S.pastKills.hunter = 9;
  EF.teleport(26, Y + 35); EF.step(5);
  if (EF.S.era !== 0) EF.era();
  // spawn a past sigbin next to the player via the spawn system
  EF.teleport(20, Y + 35); EF.step(5);
  for (let i = 0; i < 300 && !EF.enemies.some(e => e.sp === 'sigbin'); i++) { EF.teleport(i % 2 ? 2 : 60, Y + 35); EF.step(2); }
  const e = EF.enemies.find(e => e.sp === 'sigbin');
  if (!e) return { found: false };
  let hits = 0;
  for (let i = 0; i < 400 && !e.dead; i++) { EF.P.x = e.x - 14; EF.P.y = e.y + e.h - EF.P.h; EF.P.face = 1; EF.P.inv = 9; if (i % 12 === 0) { EF.tap('attack'); hits++; } else EF.step(1); }
  return { found: true, dead: e.dead, hits, pct: EF.S.pastKills.hunter };
}, Y);
ok('melee kills a past Sigbin', eco.found && eco.dead, JSON.stringify(eco));
ok('ten past kills make the hunter extinct', eco.pct === 10);
const succ = await page.evaluate(Y => {
  EF.teleport(86, Y + 35); EF.step(5); EF.era();
  for (let i = 0; i < 400 && !EF.enemies.some(e => e.d.niche === 'hunter'); i++) { EF.teleport(i % 2 ? 84 : 140, Y + 35); EF.step(2); }
  return EF.enemies.filter(e => e.d.niche === 'hunter').map(e => e.sp);
}, Y);
ok('present: successor species takes the niche', succ.length && succ.every(s => s === 'tiktik'), succ.join(','));
await page.evaluate(Y => { EF.teleport(30, Y + 35); EF.step(60); }, Y);
await shot('05-present-successor');

// skill tree
const sk = await page.evaluate(() => { EF.sp(5); EF.give('hunterP', 4); const a = [EF.learn('bolt'), EF.learn('swift'), EF.learn('fourth'), EF.learn('breaker')]; return { a, nodes: EF.S.nodes.length }; });
ok('skill tree nodes learnable', sk.a.every(Boolean), JSON.stringify(sk));
await page.evaluate(() => EF.menu(true));
await page.waitForTimeout(200);
await page.click('.tabs [data-tab="skills"]');
await shot('06-skill-tree');
await page.click('.tabs [data-tab="eco"]');
await shot('07-ecosystem');
await page.evaluate(() => EF.menu(false));

// breaker opens the cracked wall
const wall = await page.evaluate(Y => {
  EF.teleport(152, Y + 35); EF.P.face = 1; EF.step(10);
  for (let i = 0; i < 4; i++) { EF.tap('attack'); for (let j = 0; j < 14; j++) { EF.step(1); EF.P.inv = 9; } }
  return EF.tile(154, Y + 34);
}, Y);
ok('Kampilan Breaker shatters cracked stone', wall === 0, 'tile=' + wall);

// boss
const b1 = await page.evaluate(Y => { EF.teleport(172, Y + 35); EF.step(5); return !!EF.boss; }, Y);
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
  }
  return { seen: [...seen], maxStage, frames, mode: EF.mode, done: EF.S.bossDone };
});
ok('boss uses several attacks', fight.seen.length >= 4, fight.seen.join(','));
ok('boss escalates stages during the fight', fight.maxStage >= 3, 'max stage ' + fight.maxStage);
ok('boss can be defeated, win screen shows', fight.done && fight.mode === 'win', JSON.stringify(fight));
await page.waitForTimeout(300);
await shot('09-win');
await page.evaluate(() => { document.getElementById('w-again').click(); });

// HUD at 844x390 in the longest language with the mini-map on
await page.evaluate(() => { document.querySelector('.langs [data-lang="fil"]').click(); EF.teleport(118, 58); EF.step(30); });
await page.waitForTimeout(400);
await shot('19-hud-fil-minimap');
await page.evaluate(() => { document.querySelector('.langs [data-lang="de"]').click(); EF.menu(true); EF.tab('eco'); });
await page.waitForTimeout(200);
await shot('20-eco-de');
await page.evaluate(() => { EF.tab('forge'); });
await shot('21-forge-de');
await page.evaluate(() => { document.querySelector('.langs [data-lang="fil"]').click(); EF.tab('spirits'); });
await shot('22-spirits-fil');
await page.evaluate(() => { EF.menu(false); document.querySelector('.langs [data-lang="en"]').click(); });


// ================= round 3: classes, customization, ascension, summon, hell mode =================
const setLang = l => page.evaluate(l => document.querySelector(`.langs [data-lang="${l}"]`).click(), l);
const earned = await page.evaluate(() => EF.acc.tala);
ok('Tala is earned from kills, chests and the boss', earned >= 100 + 120 + 60 + 5, 'tala=' + earned);

// hell mode unlocks once the normal save has beaten the Tikbalang
const unl = await page.evaluate(() => { EF.toTitle(); const b = document.getElementById('btn-hell'); return { dis: b.disabled, txt: b.textContent, title: !document.getElementById('title').hidden }; });
ok('hell mode unlocks after the Tikbalang is beaten', !unl.dis && unl.title, JSON.stringify(unl));
await page.waitForTimeout(150);
await shot('23-title-hell-unlocked');

// class pick screen: both classes, previews, customization; fits 844x390 in every language
await page.click('#btn-new');
await page.waitForTimeout(150);
const fits = {};
for (const l of ['en', 'fil', 'de']) {
  await setLang(l);
  await page.waitForTimeout(120);
  fits[l] = await page.evaluate(() => { const b = document.querySelector('.pick-box'); const cards = [...document.querySelectorAll('.cls-card')].map(c => c.getBoundingClientRect()); const side = document.querySelector('.pick-side').getBoundingClientRect(); return { scroll: b.scrollHeight - b.clientHeight, sep: cards[0].right <= cards[1].left && cards[1].right <= side.left, bottom: Math.round(b.getBoundingClientRect().bottom) }; });
  await shot('24-pick-' + l);
}
await setLang('en');
const pk = await page.evaluate(() => ({ vis: !document.getElementById('pick').hidden, cards: [...document.querySelectorAll('.cls-card .nm')].map(e => e.textContent) }));
ok('new game opens the class pick with both classes', pk.vis && pk.cards.join() === 'Eskrimador,Babaylan', JSON.stringify(pk));
ok('class pick fits 844x390 without overlap in en, fil, de', Object.values(fits).every(f => f.scroll <= 0 && f.sep && f.bottom <= 390), JSON.stringify(fits));
await page.click('.cls-card[data-cls="bab"]');
for (const [c, v] of [['skin', 4], ['hair', 2], ['hairCol', 4], ['acc', 5]]) await page.click(`#pk-cust [data-c="${c}"][data-v="${v}"]`);
await page.fill('#pk-name', 'Mayumi');
await page.waitForTimeout(100);
await shot('25-pick-babaylan-custom');
await page.click('#pk-go');
await page.waitForTimeout(200);
const cust = await page.evaluate(() => {
  const sv = JSON.parse(localStorage.getItem('epochfall.save.v1'));
  const cols = EF.heroColors(), L = EF.look;
  return { cls: EF.S.cls, name: EF.S.name, look: EF.S.look, saved: { cls: sv.cls, look: sv.look, name: sv.name }, nodes: EF.S.nodes, sumBtn: !document.getElementById('b-sum').hidden,
    drawn: { skin: cols.includes(L.SKINS[4]), hair: cols.includes(L.HAIR_COLS[4]), acc: cols.includes(L.ACCENTS[5]), oldSkin: cols.includes(L.SKINS[2]) } };
});
ok('Babaylan chosen from the pick screen', cust.cls === 'bab' && cust.name === 'Mayumi' && cust.nodes.join() === 'tawag' && cust.sumBtn, JSON.stringify(cust));
ok('customization is stored in the save', cust.saved.cls === 'bab' && cust.saved.name === 'Mayumi' && JSON.stringify(cust.saved.look) === JSON.stringify({ skin: 4, hair: 2, hairCol: 4, acc: 5 }), JSON.stringify(cust.saved));
ok('customization is drawn on the player sprite', cust.drawn.skin && cust.drawn.hair && cust.drawn.acc && !cust.drawn.oldSkin, JSON.stringify(cust.drawn));

// Babaylan: staff combo, channelled spirit orb, spirit summon
const bab = await page.evaluate(Y => {
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(10);
  const s = EF.spawnAt('sigbin', 33, Y + 36);
  const staffDmg = EF.stats().dmg;
  const melee = T.meleeKill(s);
  // orb: hold the skill button to channel, release to cast
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(10); EF.P.face = 1; EF.P.en = EF.P.maxen;
  const k = EF.spawnAt('kapre', 38, Y + 36); k.st = 'rest';
  EF.hold('skill', true); for (let i = 0; i < 60; i++) { EF.step(1); EF.P.inv = 9; k.x = 38 * 16; }
  const chan = EF.P.chan, en = EF.P.en;
  EF.hold('skill', false); EF.step(1);
  const orb = EF.projs.find(p => p.type === 'orb');
  const orbInfo = orb ? { charge: +orb.charge.toFixed(2), dmg: Math.round(orb.dmg), w: orb.w } : null;
  for (let i = 0; i < 60 && k.hp >= k.max; i++) { EF.step(1); EF.P.inv = 9; }
  const orbHit = k.max - k.hp;
  // summon: needs Anito Call, the active spirit strikes the nearest foe
  const noCall = EF.summonStrike();
  EF.sp(1); const learned = EF.learn('call');
  EF.clearEnemies(); EF.P.en = EF.P.maxen;
  const f = EF.spawnAt('wakwak', EF.P.x / 16 + 6, Y + 32);
  EF.tap('summon');
  const spiritProj = EF.projs.some(p => p.type === 'spirit');
  let sumHit = 0; for (let i = 0; i < 90 && !sumHit; i++) { EF.step(1); EF.P.inv = 9; if (f.dead || f.hp < f.max) sumHit = f.max - Math.max(0, f.hp); }
  return { melee, staffDmg, chan: +chan.toFixed(2), en: Math.round(en), orbInfo, orbHit: Math.round(orbHit), noCall, learned, spiritProj, sumHit: Math.round(sumHit), sumCd: EF.P.sumCd > 0 };
}, Y);
ok('Babaylan staff combo kills a Sigbin (weaker than the blades)', bab.melee && bab.staffDmg < 12, JSON.stringify(bab));
ok('Babaylan channelled spirit orb grows and hits', bab.chan >= 0.99 && bab.orbInfo && bab.orbInfo.charge >= 0.99 && bab.orbInfo.w >= 15 && bab.orbHit >= 30);
ok('Babaylan summon: the active spirit strikes a foe', !bab.noCall && bab.learned && bab.spiritProj && bab.sumHit >= 20 && bab.sumCd);
await page.evaluate(Y => { EF.clearEnemies(); EF.teleport(28, Y + 35); EF.step(20); EF.spawnAt('kapre', 36, Y + 36).st = 'rest'; EF.P.face = 1; EF.P.en = EF.P.maxen; EF.hold('skill', true); for (let i = 0; i < 40; i++) { EF.step(1); EF.P.inv = 0; } }, Y);
await page.waitForTimeout(120);
await shot('26-babaylan-orb');
await page.evaluate(() => { EF.hold('skill', false); EF.step(1); });

// own 14-node tree, Legion strikes up to 3 foes
const tr = await page.evaluate(Y => {
  const t = EF.tree();
  EF.sp(40); EF.give('flyerP', 3); EF.give('swarmP', 4); EF.give('hunterP', 4);
  const res = {}; for (const n of t) if (n.id !== 'asc' && !EF.S.nodes.includes(n.id)) res[n.id] = EF.learn(n.id);
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5); EF.P.en = EF.P.maxen; EF.P.sumCd = 0;
  for (let i = 0; i < 4; i++) EF.spawnAt('sigbin', 33 + i * 2, Y + 36).st = 'wind';
  EF.tap('summon');
  return { n: t.length, br: [...new Set(t.map(n => n.br))].join(','), res, nodes: EF.S.nodes.length, spirits: EF.projs.filter(p => p.type === 'spirit').length };
}, Y);
ok('Babaylan has its own 14-node tree (Anito, Diwata, Rites, Ascension)', tr.n === 14 && tr.br === 'anito,diwata,rites,asc' && Object.values(tr.res).every(Boolean) && tr.nodes === 13, JSON.stringify(tr));
ok('Ancestor Legion: the summon strikes 3 foes', tr.spirits === 3, 'spirit strikes=' + tr.spirits);
await page.evaluate(() => { EF.menu(true); EF.tab('skills'); });
await page.waitForTimeout(150);
await shot('27-bab-tree');
await page.evaluate(() => EF.menu(false));

// ascension: permanent markings + cut-in
const asc = await page.evaluate(() => {
  EF.clearEnemies(); const before = EF.heroColors().includes('#7dfff0');
  EF.lvl(5); EF.sp(2); const ok = EF.learn('asc');
  EF.step(30);
  return { before, ok, cut: EF.cut, after: EF.heroColors().includes('#7dfff0') };
});
await page.waitForTimeout(60);
await shot('28-ascension-cutin');
const asc2 = await page.evaluate(() => { EF.step(200); return { cut: EF.cut, mode: EF.mode }; });
ok('Ascension I plays a cut-in', asc.ok && asc.cut > 1 && asc2.cut <= 0 && asc2.mode === 'play', JSON.stringify([asc, asc2]));
ok('Ascension I adds glowing markings to the hero', !asc.before && asc.after);
await page.waitForTimeout(200);
await shot('29-ascended-ingame');

// gacha: rates, soft + hard pity, duplicates, spirits, odds table (deterministic through EF.rng)
const g = await page.evaluate(() => {
  const A = EF.acc;
  // mulberry32: small seeded PRNG, same sequence every run
  let seed = 12345; EF.rng(() => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; });
  const cnt = { R: 0, SR: 0, SSR: 0, UR: 0 }, N = 200000;
  for (let i = 0; i < N; i++) cnt[EF.rollRarity(1)]++;
  const pct = {}; for (const k in cnt) pct[k] = +(cnt[k] / N * 100).toFixed(2);
  const soft = [1, 73, 74, 75, 80, 89, 90].map(n => +EF.ssrChance(n).toFixed(3));
  A.tala = 5000; A.pity = 0; A.cos = {}; A.spirits = []; A.dust = 0;
  // R every time: pity climbs, a duplicate turns into Stardust
  EF.rng(() => 0.5);
  const r1 = EF.summon(1)[0], r2 = EF.summon(1)[0];
  const dup = { first: r1, second: r2, dust: A.dust };
  // 10x costs 1000 and gives 10 results
  const t0 = A.tala; const ten = EF.summon(10); const cost10 = t0 - A.tala;
  const pityAfter = A.pity;
  // an RNG that never rolls an SSR on its own: soft pity, then the guarantee by pull 90
  A.pity = 0; A.tala = 100000; EF.rng(() => 0.9999);
  let first = 0, got = null; for (let i = 1; i <= 90 && !first; i++) { const r = EF.summon(1)[0]; if (r.r === 'SSR' || r.r === 'UR') { first = i; got = r; } }
  const before69 = first > 69;
  // UR roll: Bakunawa Hatchling
  EF.rng(() => 0.001); const ur = EF.summon(1)[0];
  EF.rng(null);
  const noMoney = (() => { const keep = A.tala; A.tala = 50; const r = EF.summon(1); A.tala = keep; return r; })();
  return { pct, soft, dup, ten: ten.length, cost10, pityAfter, first, got, before69, ur, pityNow: A.pity, spirits: A.spirits.slice(), noMoney };
});
ok('summon base rates match R 79.4 / SR 18 / SSR 2.4 / UR 0.2', Math.abs(g.pct.R - 79.4) < 0.4 && Math.abs(g.pct.SR - 18) < 0.4 && Math.abs(g.pct.SSR - 2.4) < 0.15 && Math.abs(g.pct.UR - 0.2) < 0.05, JSON.stringify(g.pct));
ok('soft pity from pull 74 (+6% per pull), guaranteed by 90', g.soft[0] === 0.026 && g.soft[1] === 0.026 && g.soft[2] === 0.086 && g.soft[3] === 0.146 && g.soft[5] < 1 && g.soft[6] === 1 && g.before69 && g.first <= 90 && g.got.r === 'SSR', JSON.stringify({ soft: g.soft, first: g.first, got: g.got }));
ok('1x costs 100, 10x costs 1000 Tala; no Tala, no summon', g.ten === 10 && g.cost10 === 1000 && g.pityAfter === 12 && g.noMoney === null, JSON.stringify({ ten: g.ten, cost10: g.cost10, pity: g.pityAfter }));
ok('duplicates turn into Stardust', !g.dup.first.dup && g.dup.second.dup && g.dup.second.id === g.dup.first.id && g.dup.dust === 5, JSON.stringify(g.dup));
ok('summon-only spirits: Minokawa (SSR) and Bakunawa (UR) join the account', g.got.id === 'minokawa' && g.ur.r === 'UR' && g.ur.id === 'bakunawa' && g.spirits.includes('minokawa') && g.spirits.includes('bakunawa'), JSON.stringify([g.got, g.ur]));
const spfx = await page.evaluate(Y => {
  const d0 = EF.stats().dmg; const eq = EF.equip('bakunawa'); const d1 = EF.stats().dmg;
  EF.equip('minokawa'); EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5); EF.P.featherCd = 0;
  const e = EF.spawnAt('kapre', 34, Y + 36); e.st = 'rest'; let feather = false;
  for (let i = 0; i < 90; i++) { EF.step(1); EF.P.inv = 9; e.st = 'rest'; if (EF.projs.some(p => p.type === 'feather')) feather = true; }
  return { eq, ratio: +(d1 / d0).toFixed(3), feather, hit: e.hp < e.max };
}, Y);
ok('summoned spirits have real effects (Bakunawa +15% damage, Minokawa feathers)', spfx.eq && spfx.ratio === 1.15 && spfx.feather && spfx.hit, JSON.stringify(spfx));
for (const l of ['en', 'fil', 'de']) {
  await setLang(l);
  await page.evaluate(() => { EF.menu(true); EF.tab('summon'); });
  await page.waitForTimeout(120);
  await shot('30-summon-' + l);
}
await setLang('en');
await page.evaluate(() => EF.tab('summon'));
await page.click('[data-odds]');
const odds = await page.evaluate(() => {
  const el = document.getElementById('odds'), txt = el ? el.textContent : '', I = window.EF_I18N.en;
  const names = EF.gacha.map(g => g.type === 'spirit' ? I['sp_' + g.id] : I['g_' + g.id]);
  const body = document.getElementById('m-body').textContent;
  return { vis: !!el && el.offsetHeight > 0, rows: el ? el.querySelectorAll('tbody tr').length : 0, allNames: names.every(n => txt.includes(n)), pcts: ['79.4%', '18%', '2.4%', '0.2%', '15.88%', '4.5%', '0.8%', '0.1%'].every(p => txt.includes(p)),
    pity: /\d+ \/ 90/.test(body), neutral: !/casino|jackpot|gambl|\bbet\b|\bwin\b|lucky|spin/i.test(body) };
});
ok('Odds button opens the full rate table (every item and rarity)', odds.vis && odds.rows === 18 && odds.allNames && odds.pcts, JSON.stringify(odds));
ok('pity counter shown, neutral wording', odds.pity && odds.neutral);
await shot('31-odds-en');
await page.evaluate(() => { document.getElementById('m-body').scrollTop = 9999; });
await shot('31-odds-en-bottom');
await setLang('de'); await page.evaluate(() => EF.tab('summon'));
await shot('31-odds-de');
await setLang('fil'); await page.evaluate(() => EF.tab('summon'));
await shot('31-odds-fil');

// Hero tab: customization + summoned cosmetics equip
const hero = await page.evaluate(() => {
  EF.acc.cos.wpn_neon = 1; EF.acc.cos.aura_moon = 1; EF.acc.cos.ttl_tide = 1; EF.acc.cos.pat_banig = 1;
  EF.tab('hero');
  const q = s => document.querySelector(s);
  q('[data-eq="wpn"][data-id="wpn_neon"]').click(); q('[data-eq="aura"][data-id="aura_moon"]').click(); q('[data-eq="ttl"][data-id="ttl_tide"]').click(); q('[data-eq="pat"][data-id="pat_banig"]').click();
  q('#m-body [data-c="acc"][data-v="1"]').click();
  const sv = JSON.parse(localStorage.getItem('epochfall.save.v1')), ac = JSON.parse(localStorage.getItem('epochfall.account.v1'));
  return { acc: sv.look.acc, equip: ac.equip, cols: EF.heroColors().includes('#ff3d8b') };
});
ok('Hero tab: change look and equip summoned cosmetics', hero.acc === 1 && hero.equip.wpn === 'wpn_neon' && hero.equip.aura === 'aura_moon' && hero.equip.ttl === 'ttl_tide' && hero.cols, JSON.stringify(hero));
for (const l of ['en', 'fil', 'de']) { await setLang(l); await page.evaluate(() => EF.tab('hero')); await page.waitForTimeout(100); await shot('32-hero-' + l); }
await setLang('en');
await page.evaluate(() => EF.menu(false));
await page.waitForTimeout(250);
await shot('33-cosmetics-ingame');

// hell mode: own slot + character, +60% enemies, boss from stage 3, one life
const shared0 = await page.evaluate(() => ({ tala: EF.acc.tala, cos: Object.keys(EF.acc.cos).sort().join(), spirits: EF.acc.spirits.slice().sort().join(), dust: EF.acc.dust }));
await page.evaluate(() => { EF.menu(true); EF.tab('hero'); });
await page.click('#to-title');
const back = await page.evaluate(() => ({ title: !document.getElementById('title').hidden, mode: EF.mode, menu: document.getElementById('menu').hidden }));
ok('Hero tab leads back to the title screen', back.title && back.mode === 'title' && back.menu, JSON.stringify(back));
await page.click('#btn-hell');
await page.waitForTimeout(120);
const hp = await page.evaluate(() => ({ pick: !document.getElementById('pick').hidden, tag: !document.getElementById('pk-hell').hidden }));
await shot('34-pick-hell');
await page.click('.cls-card[data-cls="esk"]');
await page.fill('#pk-name', 'Bagani');
await page.click('#pk-go');
const hell = await page.evaluate(Y => {
  const normal = JSON.parse(localStorage.getItem('epochfall.save.v1')), hs = JSON.parse(localStorage.getItem('epochfall.hell.v1'));
  EF.clearEnemies(); EF.teleport(30, Y + 35); EF.step(5);
  const e = EF.spawnAt('sigbin', 40, Y + 36);
  EF.P.inv = 0; const h0 = EF.P.hp; EF.hurt(10); const took = h0 - EF.P.hp;
  const eq = EF.equip('bakunawa');
  return { hell: EF.S.hell, cls: EF.S.cls, name: EF.S.name, hs: !!hs && hs.hell, normalCls: normal.cls, normalName: normal.name, ehp: e.max, took, base: EF.bossBase(), eq };
}, Y);
ok('hell mode uses its own slot and a new character', hp.pick && hp.tag && hell.hell && hell.hs && hell.name === 'Bagani' && hell.normalCls === 'bab' && hell.normalName === 'Mayumi', JSON.stringify(hell));
ok('hell mode: enemies +60% HP and damage, boss starts at stage 3', Math.abs(hell.ehp - 48) < 0.01 && hell.took === 16 && hell.base === 3);
ok('hell character can use account spirits', hell.eq);
await page.waitForTimeout(150);
await shot('35-hell-ingame');
const dead = await page.evaluate(() => {
  EF.lvl(4);
  EF.P.inv = 0; EF.P.hp = 1; EF.hurt(50); EF.step(2);
  const fl = document.getElementById('fallen');
  return { mode: EF.mode, hellSave: localStorage.getItem('epochfall.hell.v1'), normal: !!localStorage.getItem('epochfall.save.v1'), fallen: EF.acc.fallen[0], list: fl.hidden ? '' : fl.textContent,
    title: !document.getElementById('title').hidden, hellBtn: document.getElementById('btn-hell').textContent,
    tala: EF.acc.tala, cos: Object.keys(EF.acc.cos).sort().join(), spirits: EF.acc.spirits.slice().sort().join(), dust: EF.acc.dust };
});
ok('hell death deletes the hell character', dead.mode === 'title' && dead.hellSave === null && dead.normal && dead.title, JSON.stringify(dead));
ok('hell death writes name, level and time to the Fallen list', dead.fallen && dead.fallen.name === 'Bagani' && dead.fallen.lvl === 4 && typeof dead.fallen.time === 'number' && dead.list.includes('Bagani') && dead.list.includes('Lv 4'));
ok('account items survive permadeath (Tala, cosmetics, spirits, Stardust)', dead.tala === shared0.tala && dead.cos === shared0.cos && dead.spirits === shared0.spirits && dead.dust === shared0.dust && dead.spirits.includes('bakunawa'), JSON.stringify(shared0));
for (const l of ['en', 'fil', 'de']) { await setLang(l); await page.waitForTimeout(120); await shot('36-title-fallen-' + l); }
await setLang('en');
const cont = await page.evaluate(() => { document.getElementById('btn-continue').click(); return { cls: EF.S.cls, name: EF.S.name, hell: EF.S.hell }; });
ok('continue still loads the normal character after a hell death', cont.cls === 'bab' && cont.name === 'Mayumi' && !cont.hell, JSON.stringify(cont));

ok('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const fails = results.filter(r => !r.pass).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
